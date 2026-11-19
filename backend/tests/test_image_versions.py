"""
The image is built with the library versions of the image that is live, or the build fails.

requirements.txt gives ranges ("scipy>=1.10.1"). The Dockerfile installed it by itself, so each new
image took whatever versions pip resolved on the day of the build: an update of the application's
code also changed the libraries under every page, unseen. backend/image/constraints-live.txt now
holds the versions of the live image, taken from `pip freeze` in the running container; the
Dockerfile installs under it, and a check fails the build when what was installed is not what the
file says.

`pip freeze` does not print pip, setuptools and wheel, so that file cannot hold them, and the build
took the versions of its day for the three. backend/image/build-tools.txt gives them; the build
installs them from it, and the same check compares them.
"""

import importlib.util
import io
import re
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.test import SimpleTestCase
from packaging.requirements import Requirement

BACKEND = Path(settings.BASE_DIR)
CONSTRAINTS = BACKEND / "image" / "constraints-live.txt"
TOOLS = BACKEND / "image" / "build-tools.txt"
SCRIPT = BACKEND / "image" / "check_installed_versions.py"

_spec = importlib.util.spec_from_file_location("check_installed_versions", SCRIPT)
check = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check)


def pins():
    return check.read_pins(CONSTRAINTS.read_text(encoding="utf-8").split("\n"))


class TheConstraintsFileTest(SimpleTestCase):
    def test_it_gives_one_exact_version_for_each_of_its_packages(self):
        lines = [line for line in CONSTRAINTS.read_text(encoding="utf-8").split("\n") if line and not line.startswith("#")]
        self.assertEqual(len(lines), 140)
        for line in lines:
            self.assertRegex(line, r"^[A-Za-z0-9_.\-]+==[A-Za-z0-9_.+!\-]+$")
        self.assertEqual(len(pins()), 140)        # no package twice

    def test_the_versions_of_the_numerical_libraries_are_those_of_the_live_image(self):
        found = pins()
        self.assertEqual((found["scipy"], found["numpy"], found["pandas"], found["statsmodels"], found["pingouin"]),
                         ("1.17.1", "2.4.6", "2.3.3", "0.15.0", "0.5.5"))

    def test_every_requirement_has_a_version_and_the_version_is_in_its_range(self):
        # A requirement without a line in the constraints file would be installed in the version of the day.
        found = pins()
        requirements = [line.split("#", 1)[0].strip() for line in (BACKEND / "requirements.txt").read_text(encoding="utf-8").split("\n")]
        requirements = [Requirement(line) for line in requirements if line]
        self.assertGreater(len(requirements), 50)
        for requirement in requirements:
            name = check.canonical(requirement.name)
            self.assertIn(name, found, f"{requirement.name} has no version in the constraints file")
            self.assertTrue(requirement.specifier.contains(found[name], prereleases=True),
                            f"{requirement.name}: {found[name]} is outside {requirement.specifier}")


class TheFileOfTheBuildToolsTest(SimpleTestCase):
    def test_it_gives_one_exact_version_for_pip_setuptools_and_wheel_and_for_nothing_else(self):
        lines = [line for line in TOOLS.read_text(encoding="utf-8").split("\n") if line and not line.startswith("#")]
        self.assertEqual(lines, ["pip==26.3", "setuptools==84.2.1", "wheel==0.48.0"])
        self.assertEqual(check.read_tools(lines), {"pip": "26.3", "setuptools": "84.2.1", "wheel": "0.48.0"})

    def test_the_two_files_share_no_package(self):
        self.assertFalse(set(pins()) & check.NOT_LISTED_BY_PIP_FREEZE)
        self.assertNotIn("versions of its day", CONSTRAINTS.read_text(encoding="utf-8"))

    def test_a_file_of_tools_that_names_another_package_or_leaves_one_out_is_refused(self):
        for lines in (["pip==26.3", "setuptools==84.2.1"], ["pip==26.3", "setuptools==84.2.1", "wheel==0.48.0", "scipy==1.17.1"], []):
            with self.assertRaises(ValueError):
                check.read_tools(lines)
        with self.assertRaises(ValueError):
            check.read_tools(["pip>=26.3", "setuptools==84.2.1", "wheel==0.48.0"])


class TheBuildTest(SimpleTestCase):
    def setUp(self):
        self.dockerfile = (BACKEND / "Dockerfile").read_text(encoding="utf-8")

    def test_the_requirements_are_installed_under_the_constraints_and_then_compared_with_them(self):
        self.assertIn("COPY requirements.txt .\nCOPY image/ image/\n", self.dockerfile)
        self.assertIn("RUN pip install --upgrade -r image/build-tools.txt && \\\n"
                      "    pip install -r requirements.txt -c image/constraints-live.txt -c image/build-tools.txt"
                      " --build-constraint image/build-tools.txt && \\\n"
                      "    python image/check_installed_versions.py image/constraints-live.txt --tools image/build-tools.txt\n",
                      self.dockerfile)
        # and nowhere without them: every `pip install` of the file names a file of versions
        installs = re.findall(r"pip install [^\n]*", self.dockerfile)
        self.assertEqual(installs, ["pip install --upgrade -r image/build-tools.txt && \\",
                                    "pip install -r requirements.txt -c image/constraints-live.txt -c image/build-tools.txt"
                                    " --build-constraint image/build-tools.txt && \\"])

    def test_the_tests_of_the_pipeline_run_under_the_same_versions(self):
        workflow = (BACKEND.parent / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
        job = re.search(r"^  backend-test:\n(.*?)(?=^  [a-z0-9-]+:\n)", workflow, re.S | re.M).group(1)
        self.assertIn("working-directory: backend\n", job)
        installs = re.findall(r"pip install [^\n]*", job)
        self.assertEqual(installs, ["pip install --upgrade -r image/build-tools.txt",
                                    "pip install -r requirements.txt -c image/constraints-live.txt -c image/build-tools.txt"
                                    " --build-constraint image/build-tools.txt"])
        self.assertIn("            backend/image/constraints-live.txt\n            backend/image/build-tools.txt\n", job)

    def test_the_build_context_holds_the_two_files(self):
        ignored = [line.strip() for line in (BACKEND / ".dockerignore").read_text(encoding="utf-8").split("\n") if line.strip()]
        for pattern in ignored:
            self.assertFalse(pattern.rstrip("/*") in ("image", "image/constraints-live.txt", "image/build-tools.txt", "*.txt", "*.py"), pattern)
        self.assertTrue(CONSTRAINTS.is_file() and TOOLS.is_file() and SCRIPT.is_file())


class TheCheckTest(SimpleTestCase):
    PINS = {"scipy": "1.17.1", "numpy": "2.4.6", "python-dateutil": "2.9.0"}

    def test_names_are_compared_as_pip_compares_them(self):
        self.assertEqual(check.canonical("Python_DateUtil"), "python-dateutil")
        self.assertEqual(check.canonical("ruamel.yaml"), "ruamel-yaml")
        self.assertEqual(check.read_pins(["Django==4.2.30  # a comment", "", "# another", "pandas-flavor==0.8.1"]),
                         {"django": "4.2.30", "pandas-flavor": "0.8.1"})

    def test_a_line_that_gives_no_exact_version_is_refused(self):
        for line in ("scipy>=1.10.1", "scipy", "scipy==1.17.1 extra", "-r other.txt"):
            with self.assertRaises(ValueError):
                check.read_pins([line])
        with self.assertRaises(ValueError):
            check.read_pins(["scipy==1.17.1", "SciPy==1.11.3"])

    def test_the_three_kinds_of_difference(self):
        self.assertEqual(check.differences(self.PINS, dict(self.PINS)), [])
        self.assertEqual(check.differences(self.PINS, {**self.PINS, "scipy": "1.18.1"}),
                         ["scipy: 1.18.1 is installed; the constraints file gives 1.17.1"])
        self.assertEqual(check.differences(self.PINS, {**self.PINS, "newcomer": "0.1"}),
                         ["newcomer: 0.1 is installed; the constraints file does not name it"])
        without = {name: version for name, version in self.PINS.items() if name != "numpy"}
        self.assertEqual(check.differences(self.PINS, without), ["numpy: the constraints file gives 2.4.6; it is not installed"])

    def _run(self, freeze_lines, tools_lines=None, constraints_lines=None):
        with tempfile.TemporaryDirectory() as folder:
            constraints = Path(folder) / "constraints.txt"
            if constraints_lines is None:
                constraints_lines = [f"{name}=={version}" for name, version in self.PINS.items()]
            constraints.write_text("\n".join(constraints_lines) + "\n", encoding="utf-8")
            freeze = Path(folder) / "freeze.txt"
            freeze.write_text("\n".join(freeze_lines) + "\n", encoding="utf-8")
            arguments = [str(constraints), "--freeze", str(freeze)]
            if tools_lines is not None:
                tools = Path(folder) / "tools.txt"
                tools.write_text("\n".join(tools_lines) + "\n", encoding="utf-8")
                arguments = [str(constraints), "--tools", str(tools), "--freeze", str(freeze)]
            said = io.StringIO()
            with redirect_stdout(said):
                code = check.main(arguments)
        return code, said.getvalue()

    def test_the_exit_status_is_what_fails_the_build(self):
        same = ["scipy==1.17.1", "numpy==2.4.6", "python_dateutil==2.9.0"]
        code, said = self._run(same)
        self.assertEqual(code, 0, said)
        self.assertIn("are the 3 packages", said)
        # without a file for them, the three packages `pip freeze` never lists do not count, in either direction
        self.assertEqual(self._run(same + ["pip==99.0", "setuptools==1.0", "wheel==0.1"])[0], 0)
        for changed in (["scipy==1.18.1", "numpy==2.4.6", "python-dateutil==2.9.0"], same + ["newcomer==0.1"], same[:2]):
            code, said = self._run(changed)
            self.assertEqual(code, 1, said)
            self.assertIn("1 difference(s)", said)

    TOOLS_LINES = ["pip==26.3", "setuptools==84.2.1", "wheel==0.48.0"]

    def test_with_their_file_the_three_build_tools_are_compared_too(self):
        same = ["scipy==1.17.1", "numpy==2.4.6", "python_dateutil==2.9.0"]
        code, said = self._run(same + self.TOOLS_LINES, self.TOOLS_LINES)
        self.assertEqual(code, 0, said)
        self.assertIn("are the 3 packages", said)
        self.assertIn("pip, setuptools and wheel are in the versions of", said)
        code, said = self._run(same + ["pip==26.4", "setuptools==84.2.1", "wheel==0.48.0"], self.TOOLS_LINES)
        self.assertEqual(code, 1, said)
        self.assertIn("1 difference(s)", said)
        self.assertIn("pip: 26.4 is installed; the file of the build tools gives 26.3", said)
        code, said = self._run(same + ["pip==26.3", "setuptools==84.2.1"], self.TOOLS_LINES)
        self.assertEqual(code, 1, said)
        self.assertIn("wheel: the file of the build tools gives 0.48.0; it is not installed", said)
        # a list made with `pip freeze`, which leaves the three out, does not pass for one that holds them
        code, said = self._run(same, self.TOOLS_LINES)
        self.assertEqual(code, 1, said)
        self.assertIn("3 difference(s)", said)
        # and a library in another version still fails when the three are right
        code, said = self._run(["scipy==1.18.1", "numpy==2.4.6", "python-dateutil==2.9.0"] + self.TOOLS_LINES, self.TOOLS_LINES)
        self.assertEqual(code, 1, said)
        self.assertIn("scipy: 1.18.1 is installed; the constraints file gives 1.17.1", said)

    def test_in_the_build_the_installed_tools_are_compared_as_well(self):
        # the build runs the check without a list: it reads what is installed, the three included
        libraries = dict(self.PINS)
        three = {"pip": "26.3", "setuptools": "84.2.1", "wheel": "0.48.0"}

        def installed(with_the_tools=False):
            return {**libraries, **three} if with_the_tools else dict(libraries)

        with tempfile.TemporaryDirectory() as folder:
            constraints = Path(folder) / "constraints.txt"
            constraints.write_text("\n".join(f"{name}=={version}" for name, version in self.PINS.items()) + "\n", encoding="utf-8")
            tools = Path(folder) / "tools.txt"
            tools.write_text("\n".join(self.TOOLS_LINES) + "\n", encoding="utf-8")
            with mock.patch.object(check, "installed_versions", side_effect=installed):
                said = io.StringIO()
                with redirect_stdout(said):
                    code = check.main([str(constraints), "--tools", str(tools)])
                self.assertEqual(code, 0, said.getvalue())
                three["setuptools"] = "85.0.0"
                said = io.StringIO()
                with redirect_stdout(said):
                    code = check.main([str(constraints), "--tools", str(tools)])
                self.assertEqual(code, 1, said.getvalue())
                self.assertIn("setuptools: 85.0.0 is installed; the file of the build tools gives 84.2.1", said.getvalue())

    def test_the_constraints_file_may_not_name_one_of_the_three(self):
        lines = [f"{name}=={version}" for name, version in self.PINS.items()] + ["pip==26.3"]
        with self.assertRaises(ValueError):
            self._run(lines, None, lines)

    def test_a_command_line_that_is_not_understood_is_answered_with_2(self):
        for arguments in ([], ["a.txt", "b.txt"], ["a.txt", "--tools"], ["a.txt", "--freeze"], ["--tools", "a.txt"],
                          ["a.txt", "--tools", "b.txt", "c.txt"]):
            self.assertEqual(check.main(arguments), 2, arguments)

    def test_the_two_files_of_the_image_compared_with_a_list_that_holds_them_would_pass(self):
        # the comparison the deploy note asks for on the host, with a list from `pip list --format=freeze`
        with tempfile.TemporaryDirectory() as folder:
            both = Path(folder) / "both.txt"
            both.write_text(CONSTRAINTS.read_text(encoding="utf-8") + TOOLS.read_text(encoding="utf-8"), encoding="utf-8")
            said = io.StringIO()
            with redirect_stdout(said):
                code = check.main([str(CONSTRAINTS), "--tools", str(TOOLS), "--freeze", str(both)])
        self.assertEqual(code, 0, said.getvalue())
        self.assertIn("are the 140 packages", said.getvalue())

    def test_the_live_list_from_which_the_file_was_made_would_pass(self):
        # the file compared with itself, as a list: the comparison the deploy note asks for on the host
        said = io.StringIO()
        with redirect_stdout(said):
            code = check.main([str(CONSTRAINTS), "--freeze", str(CONSTRAINTS)])
        self.assertEqual(code, 0, said.getvalue())
        self.assertIn("are the 140 packages", said.getvalue())

    def test_the_installed_packages_are_read_without_the_three_that_pip_freeze_leaves_out(self):
        found = check.installed_versions()
        self.assertIn("django", found)
        self.assertFalse(set(found) & {"pip", "setuptools", "wheel"})
        with_them = check.installed_versions(with_the_tools=True)
        self.assertIn("pip", with_them)
        self.assertEqual({name: version for name, version in with_them.items() if name not in check.NOT_LISTED_BY_PIP_FREEZE}, found)
