"""The package version must be a single source of truth (no drift between
``__version__``, ``pyproject.toml``, and the User-Agent)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

import stickforstats
from stickforstats._version import __version__


def _pyproject_version() -> str | None:
    pyproject = Path(__file__).resolve().parents[1] / "pyproject.toml"
    match = re.search(r'^version\s*=\s*"([^"]+)"', pyproject.read_text(), re.M)
    return match.group(1) if match else None


def test_version_is_nonempty_string():
    assert isinstance(__version__, str) and __version__


def test_package_reexports_same_version():
    assert stickforstats.__version__ == __version__


def test_version_matches_pyproject_when_installed():
    if __version__ == "0.0.0+local":
        pytest.skip("package not installed (running from source tree)")
    assert __version__ == _pyproject_version()
