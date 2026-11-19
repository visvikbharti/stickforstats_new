"""
The image is built with the library versions of the image that is live, or the build fails.

requirements.txt gives ranges ("scipy>=1.10.1"). The Dockerfile installed it by itself, so each new
image took whatever versions pip resolved on the day of the build: an update of the application's
code also changed the libraries under every page, unseen. backend/image/constraints-live.txt now
holds the versions of the live image, taken from `pip freeze` in the running container; the
Dockerfile installs under it, and a check fails the build when what was installed is not what the
file says.
"""

import importlib.util
import io
import re
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase
from packaging.requirements import Requirement

BACKEND = Path(settings.BASE_DIR)
CONSTRAINTS = BACKEND / "image" / "constraints-live.txt"
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


class TheBuildTest(SimpleTestCase):
    def setUp(self):
        self.dockerfile = (BACKEND / "Dockerfile").read_text(encoding="utf-8")

    def test_the_requirements_are_installed_under_the_constraints_and_then_compared_with_them(self):
        self.assertIn("COPY requirements.txt .\nCOPY image/ image/\n", self.dockerfile)
        self.assertIn("    pip install -r requirements.txt -c image/constraints-live.txt && \\\n"
                      "    python image/check_installed_versions.py image/constraints-live.txt\n", self.dockerfile)
        # and nowhere without them
        installs = re.findall(r"pip install -r requirements\.txt[^\n]*", self.dockerfile)
        self.assertEqual(installs, ["pip install -r requirements.txt -c image/constraints-live.txt && \\"])

    def test_the_tests_of_the_pipeline_run_under_the_same_versions(self):
        workflow = (BACKEND.parent / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
        job = re.search(r"^  backend-test:\n(.*?)(?=^  [a-z0-9-]+:\n)", workflow, re.S | re.M).group(1)
        self.assertIn("working-directory: backend\n", job)
        installs = re.findall(r"pip install -r [^\n]*", job)
        self.assertEqual(installs, ["pip install -r requirements.txt -c image/constraints-live.txt"])

    def test_the_build_context_holds_the_two_files(self):
        ignored = [line.strip() for line in (BACKEND / ".dockerignore").read_text(encoding="utf-8").split("\n") if line.strip()]
        for pattern in ignored:
            self.assertFalse(pattern.rstrip("/*") in ("image", "image/constraints-live.txt", "*.txt", "*.py"), pattern)
        self.assertTrue(CONSTRAINTS.is_file() and SCRIPT.is_file())


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

    def _run(self, freeze_lines):
        with tempfile.TemporaryDirectory() as folder:
            constraints = Path(folder) / "constraints.txt"
            constraints.write_text("\n".join(f"{name}=={version}" for name, version in self.PINS.items()) + "\n", encoding="utf-8")
            freeze = Path(folder) / "freeze.txt"
            freeze.write_text("\n".join(freeze_lines) + "\n", encoding="utf-8")
            said = io.StringIO()
            with redirect_stdout(said):
                code = check.main([str(constraints), "--freeze", str(freeze)])
        return code, said.getvalue()

    def test_the_exit_status_is_what_fails_the_build(self):
        same = ["scipy==1.17.1", "numpy==2.4.6", "python_dateutil==2.9.0"]
        code, said = self._run(same)
        self.assertEqual(code, 0, said)
        self.assertIn("are the 3 packages", said)
        # the three packages `pip freeze` never lists do not count, in either direction
        self.assertEqual(self._run(same + ["pip==99.0", "setuptools==1.0", "wheel==0.1"])[0], 0)
        for changed in (["scipy==1.18.1", "numpy==2.4.6", "python-dateutil==2.9.0"], same + ["newcomer==0.1"], same[:2]):
            code, said = self._run(changed)
            self.assertEqual(code, 1, said)
            self.assertIn("1 difference(s)", said)

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
