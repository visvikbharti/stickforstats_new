"""Single source of truth for the package version.

The version is read from the installed package metadata (i.e. from
``pyproject.toml`` at build time), so it can never drift from what pip reports.
When running from an unbuilt source tree it falls back to a sentinel.
"""

from __future__ import annotations

try:
    from importlib.metadata import PackageNotFoundError
    from importlib.metadata import version as _pkg_version

    try:
        __version__ = _pkg_version("stickforstats")
    except PackageNotFoundError:  # running from a source tree without an install
        __version__ = "0.0.0+local"
except Exception:  # pragma: no cover - importlib.metadata is always present on py3.10+
    __version__ = "0.0.0+local"

__all__ = ["__version__"]
