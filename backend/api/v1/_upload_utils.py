"""
Shared upload helpers for the manuscript / verification REST surfaces.
======================================================================

Single source of truth for the upload-size ceiling, the "file too large" message, and the
manuscript extension -> parser file_type mapping, used by both ``manuscript_views`` and
``verify_views`` (previously duplicated in each).
"""

import os

from django.conf import settings

# manuscript upload extension -> ManuscriptParser file_type
MANUSCRIPT_EXT = {
    ".pdf": "pdf",
    ".tex": "latex",
    ".latex": "latex",
    ".docx": "docx",
    ".txt": "latex",
    ".xml": "jats",
    ".nxml": "jats",
}

# tabular raw-data extensions (the dataset to RE-RUN an analysis against).
# csv/tsv/txt/tab + Excel are read by verify_views._load_dataframe today;
# SPSS/SAS/Stata/JSON are imported by DataImportService (richer importer).
DATA_EXT = {
    ".csv", ".tsv", ".tab", ".dat",
    ".xlsx", ".xls",
    ".sav", ".sas7bdat", ".dta", ".json",
}

# figure / scanned-page image extensions (OCR'd by core.manuscript.image_ocr)
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif", ".webp"}


def _ext(name: str) -> str:
    return os.path.splitext((name or "").lower())[1]


def classify_upload(name: str):
    """Classify an uploaded filename into the ingestion role it plays.

    Returns ``(kind, detail)`` where ``kind`` is one of:
      - ``"manuscript"`` — detail is the ManuscriptParser file_type
      - ``"data"``       — detail is the lowercased extension
      - ``"image"``      — detail is the lowercased extension
      - ``"unknown"``    — detail is None (unsupported type)

    A ``.txt`` is treated as a manuscript (routed to the LaTeX/plain reader),
    not as data, matching the single-file manuscript endpoints.
    """
    ext = _ext(name)
    if ext in MANUSCRIPT_EXT:
        return "manuscript", MANUSCRIPT_EXT[ext]
    if ext in DATA_EXT:
        return "data", ext
    if ext in IMAGE_EXT:
        return "image", ext
    return "unknown", None


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
