"""Compare the installed Python packages with a constraints file. Exit 1 on any difference.

Run in the image build after `pip install -r requirements.txt -c image/constraints-live.txt`:

    python image/check_installed_versions.py image/constraints-live.txt

pip honours a constraints file for the packages the file names, and for those only: a dependency
that the file does not name is installed in whatever version is current that day, without a word.
This check closes that gap. It fails when

  * a package is installed in another version than the file gives,
  * a package is installed that the file does not name,
  * the file names a package that is not installed.

With --freeze FILE it reads the lines of a saved `pip freeze` in place of the installed packages
("-" reads them from standard input), so that the list of a running container can be compared with
the same file:

    docker compose exec -T backend pip freeze | python image/check_installed_versions.py image/constraints-live.txt --freeze -
"""

import re
import sys
from importlib import metadata

# `pip freeze` does not list these, so a constraints file made from it cannot hold them.
NOT_LISTED_BY_PIP_FREEZE = {"pip", "setuptools", "wheel"}


def canonical(name):
    """The name of a package as pip compares names: case, '-', '_' and '.' do not matter."""
    return re.sub(r"[-_.]+", "-", name).lower()


def read_pins(lines):
    """{canonical name: version} from lines of the form name==version. Comments and blank lines are skipped."""
    pins = {}
    for number, line in enumerate(lines, 1):
        text = line.split("#", 1)[0].strip()
        if not text:
            continue
        match = re.fullmatch(r"([A-Za-z0-9_.\-]+)==(\S+)", text)
        if not match:
            raise ValueError(f"line {number} is not of the form name==version: {line.strip()!r}")
        name = canonical(match.group(1))
        if name in pins and pins[name] != match.group(2):
            raise ValueError(f"line {number} gives {match.group(1)} a second version")
        pins[name] = match.group(2)
    return pins


def installed_versions():
    """{canonical name: version} of every installed distribution but pip, setuptools and wheel."""
    found = {}
    for distribution in metadata.distributions():
        name = distribution.metadata["Name"]
        if name and canonical(name) not in NOT_LISTED_BY_PIP_FREEZE:
            found[canonical(name)] = distribution.version
    return found


def differences(pins, found):
    """Sentences, one for each difference between the pins and what was found."""
    said = []
    for name in sorted(set(pins) | set(found)):
        if name not in found:
            said.append(f"{name}: the constraints file gives {pins[name]}; it is not installed")
        elif name not in pins:
            said.append(f"{name}: {found[name]} is installed; the constraints file does not name it")
        elif pins[name] != found[name]:
            said.append(f"{name}: {found[name]} is installed; the constraints file gives {pins[name]}")
    return said


def main(arguments):
    if len(arguments) not in (1, 3) or (len(arguments) == 3 and arguments[1] != "--freeze"):
        print("usage: check_installed_versions.py CONSTRAINTS [--freeze FILE|-]", file=sys.stderr)
        return 2
    with open(arguments[0], encoding="utf-8") as handle:
        pins = read_pins(handle)
    if len(arguments) == 3:
        if arguments[2] == "-":
            found = read_pins(sys.stdin)
        else:
            with open(arguments[2], encoding="utf-8") as handle:
                found = read_pins(handle)
        found = {name: version for name, version in found.items() if name not in NOT_LISTED_BY_PIP_FREEZE}
        what = "the list that was given"
    else:
        found = installed_versions()
        what = "the installed packages"
    said = differences(pins, found)
    if said:
        print(f"{len(said)} difference(s) between {what} and {arguments[0]}:")
        for sentence in said:
            print("  " + sentence)
        return 1
    print(f"{what} are the {len(pins)} packages of {arguments[0]}, each in the version it gives")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
