"""Compare the installed Python packages with a constraints file. Exit 1 on any difference.

Run in the image build after `pip install -r requirements.txt -c image/constraints-live.txt`:

    python image/check_installed_versions.py image/constraints-live.txt --tools image/build-tools.txt

pip honours a constraints file for the packages the file names, and for those only: a dependency
that the file does not name is installed in whatever version is current that day, without a word.
This check closes that gap. It fails when

  * a package is installed in another version than the file gives,
  * a package is installed that the file does not name,
  * the file names a package that is not installed.

With --tools FILE it also compares pip, setuptools and wheel with that file, which must give a
version for each of the three and for nothing else. Without it the three are not looked at.

With --freeze FILE it reads the lines of a saved `pip freeze` in place of the installed packages
("-" reads them from standard input), so that the list of a running container can be compared with
the same file:

    docker compose exec -T backend pip freeze | python image/check_installed_versions.py image/constraints-live.txt --freeze -

`pip freeze` leaves the three out. A list that holds them, for --tools, is printed by
`pip list --format=freeze`.
"""

import re
import sys
from importlib import metadata

# `pip freeze` does not list these, so a constraints file made from it cannot hold them.
# Their versions are in a file of their own, which --tools names.
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


def installed_versions(with_the_tools=False):
    """{canonical name: version} of every installed distribution; pip, setuptools and wheel only when asked for."""
    found = {}
    for distribution in metadata.distributions():
        name = distribution.metadata["Name"]
        if name and (with_the_tools or canonical(name) not in NOT_LISTED_BY_PIP_FREEZE):
            found[canonical(name)] = distribution.version
    return found


def differences(pins, found, the_file="the constraints file"):
    """Sentences, one for each difference between the pins and what was found."""
    said = []
    for name in sorted(set(pins) | set(found)):
        if name not in found:
            said.append(f"{name}: {the_file} gives {pins[name]}; it is not installed")
        elif name not in pins:
            said.append(f"{name}: {found[name]} is installed; {the_file} does not name it")
        elif pins[name] != found[name]:
            said.append(f"{name}: {found[name]} is installed; {the_file} gives {pins[name]}")
    return said


def read_tools(lines):
    """The pins of pip, setuptools and wheel. A file that leaves one out, or names anything else, is refused."""
    tools = read_pins(lines)
    if set(tools) != NOT_LISTED_BY_PIP_FREEZE:
        raise ValueError("the file of the build tools must give a version for pip, setuptools and wheel, and for nothing "
                         f"else; it names {', '.join(sorted(tools)) or 'nothing'}")
    return tools


def _options(arguments):
    """([the constraints file], {option: its value}), or None when the command line is not understood."""
    rest, options = list(arguments), {}
    for option in ("--tools", "--freeze"):
        if option in rest:
            at = rest.index(option)
            if at + 1 >= len(rest):
                return None
            options[option] = rest[at + 1]
            del rest[at:at + 2]
    if len(rest) != 1 or rest[0].startswith("--"):
        return None
    return rest, options


def main(arguments):
    parsed = _options(arguments)
    if parsed is None:
        print("usage: check_installed_versions.py CONSTRAINTS [--tools TOOLS] [--freeze FILE|-]", file=sys.stderr)
        return 2
    (constraints,), options = parsed
    with open(constraints, encoding="utf-8") as handle:
        pins = read_pins(handle)
    named_twice = sorted(set(pins) & NOT_LISTED_BY_PIP_FREEZE)
    if named_twice:
        raise ValueError(f"{constraints} names {', '.join(named_twice)}; pip, setuptools and wheel belong in the file of the build tools")
    tools = None
    if "--tools" in options:
        with open(options["--tools"], encoding="utf-8") as handle:
            tools = read_tools(handle)
    if "--freeze" in options:
        if options["--freeze"] == "-":
            found = read_pins(sys.stdin)
        else:
            with open(options["--freeze"], encoding="utf-8") as handle:
                found = read_pins(handle)
        what = "the list that was given"
    else:
        found = installed_versions(with_the_tools=True)
        what = "the installed packages"
    said = differences(pins, {name: version for name, version in found.items() if name not in NOT_LISTED_BY_PIP_FREEZE})
    if tools is not None:
        said += differences(tools, {name: version for name, version in found.items() if name in NOT_LISTED_BY_PIP_FREEZE},
                            "the file of the build tools")
    if said:
        files = constraints if tools is None else f"{constraints} with {options['--tools']}"
        print(f"{len(said)} difference(s) between {what} and {files}:")
        for sentence in said:
            print("  " + sentence)
        return 1
    print(f"{what} are the {len(pins)} packages of {constraints}, each in the version it gives")
    if tools is not None:
        print(f"pip, setuptools and wheel are in the versions of {options['--tools']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
