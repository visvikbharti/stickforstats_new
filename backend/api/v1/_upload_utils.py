"""
Shared upload helpers for the manuscript / verification REST surfaces.
======================================================================

Single source of truth for the upload-size ceiling, the "file too large" message, and the
manuscript extension -> parser file_type mapping, used by both ``manuscript_views`` and
``verify_views`` (previously duplicated in each).
"""

from django.conf import settings

# manuscript upload extension -> ManuscriptParser file_type
MANUSCRIPT_EXT = {".pdf": "pdf", ".tex": "latex", ".latex": "latex", ".docx": "docx", ".txt": "latex"}


def max_upload_bytes() -> int:
    """Shared upload ceiling (bytes). Configurable via the MAX_FILE_UPLOAD_BYTES setting."""
    return getattr(settings, "MAX_FILE_UPLOAD_BYTES", 25 * 1024 * 1024)


def file_too_large_error(uploaded):
    """Return a friendly error string if the upload exceeds the cap, else None."""
    cap = max_upload_bytes()
    size = getattr(uploaded, "size", 0) or 0
    if size > cap:
        return (
            f"File too large ({size / (1024 * 1024):.1f} MB). "
            f"Maximum allowed is {cap / (1024 * 1024):.0f} MB."
        )
    return None


def manuscript_file_type(name: str):
    """Return the ManuscriptParser file_type for a manuscript filename, or None if unsupported."""
    low = (name or "").lower()
    for ext, file_type in MANUSCRIPT_EXT.items():
        if low.endswith(ext):
            return file_type
    return None
