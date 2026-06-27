"""
image_ocr.py — OCR for figure images and scanned (image-only) PDFs.
====================================================================

The text-layer parser (``parser.py``) handles born-digital PDF/DOCX/LaTeX/JATS.
This module recovers statistics that live in **rasterised** content an editor
or publisher might upload:

  - figure / panel images: PNG, JPEG, TIFF, BMP, GIF, WEBP
  - scanned / image-only PDFs (no extractable text layer)

It is **gracefully optional**: it imports cleanly even when the OCR stack is
absent, and every entry point degrades to ``("", [warning])`` rather than
raising, so the surrounding ingestion pipeline never breaks because OCR isn't
installed.

OCR text is, by nature, lower-fidelity than a text layer — superscripts,
Greek letters and small fonts mis-read — so callers should treat OCR-derived
claims as **lower-confidence** and (per the verification design) gate them
behind the extraction-coverage / ``UNVERIFIABLE_EXTRACTION`` honesty check
rather than asserting a hard verdict on them.

System dependencies (Python libs alone are not enough):
  - ``tesseract`` binary  (Debian: ``tesseract-ocr``; macOS: ``brew install tesseract``)
  - ``poppler``           (Debian: ``poppler-utils``; macOS: ``brew install poppler``)
                          — only needed for scanned-PDF rasterisation.

See ``docs/INGESTION_ARCHITECTURE.md``.
"""

from __future__ import annotations

import io
import logging
from typing import Any, List, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Graceful optional-dependency imports
# ---------------------------------------------------------------------------
try:
    import pytesseract

    _PYTESSERACT = True
except Exception:  # pragma: no cover - import guard
    _PYTESSERACT = False

try:
    from PIL import Image

    _PIL = True
except Exception:  # pragma: no cover
    _PIL = False

try:
    from pdf2image import convert_from_bytes

    _PDF2IMAGE = True
except Exception:  # pragma: no cover
    _PDF2IMAGE = False

# Bounds so a malicious/huge upload cannot pin a worker.
_MAX_SCANNED_PDF_PAGES = 40
_OCR_DPI = 300
_MIN_USEFUL_CHARS = 8  # OCR output shorter than this is treated as "nothing found"


def tesseract_available() -> bool:
    """True iff pytesseract + PIL are importable AND the tesseract binary runs."""
    if not (_PYTESSERACT and _PIL):
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def ocr_capabilities() -> dict:
    """Report what OCR can do in this environment (for /health and ingestion reports)."""
    return {
        "pytesseract": _PYTESSERACT,
        "pillow": _PIL,
        "tesseract_binary": tesseract_available(),
        "pdf2image": _PDF2IMAGE,
        "scanned_pdf_ocr": _PDF2IMAGE and tesseract_available(),
    }


def _read_bytes(file: Any) -> bytes:
    if isinstance(file, (bytes, bytearray)):
        return bytes(file)
    try:
        file.seek(0)
    except Exception:
        pass
    raw = file.read()
    return raw.encode("utf-8", "replace") if isinstance(raw, str) else raw


def ocr_image(file: Any, lang: str = "eng") -> Tuple[str, List[str]]:
    """OCR a single image (file-like or raw bytes).

    Returns ``(text, warnings)``. Never raises: a missing binary, an
    unreadable image, or an empty result all yield ``("", [warning])``.
    """
    warnings: List[str] = []
    if not tesseract_available():
        return "", ["OCR unavailable: the tesseract binary / pytesseract is not installed."]
    try:
        raw = _read_bytes(file)
        img = Image.open(io.BytesIO(raw))
        # Normalise mode so palette/CMYK/16-bit images don't trip tesseract.
        if img.mode not in ("L", "RGB"):
            img = img.convert("RGB")
        text = pytesseract.image_to_string(img, lang=lang) or ""
    except Exception as exc:
        logger.warning("image OCR failed: %s", exc)
        return "", [f"Image OCR failed: {exc}"]

    if len(text.strip()) < _MIN_USEFUL_CHARS:
        warnings.append("OCR produced little or no text from the image.")
    return text, warnings


def ocr_scanned_pdf(file: Any, max_pages: int = _MAX_SCANNED_PDF_PAGES, lang: str = "eng") -> Tuple[str, List[str]]:
    """OCR an image-only / scanned PDF by rasterising pages then running tesseract.

    Returns ``(text, warnings)``. Requires poppler (pdf2image) AND tesseract;
    degrades to ``("", [warning])`` if either is missing.
    """
    if not _PDF2IMAGE:
        return "", ["Scanned-PDF OCR unavailable: pdf2image/poppler is not installed."]
    if not tesseract_available():
        return "", ["Scanned-PDF OCR unavailable: the tesseract binary is not installed."]
    try:
        raw = _read_bytes(file)
        pages = convert_from_bytes(raw, dpi=_OCR_DPI, fmt="png")
    except Exception as exc:
        logger.warning("scanned-PDF rasterisation failed: %s", exc)
        return "", [f"Scanned-PDF OCR failed during rasterisation: {exc}"]

    warnings: List[str] = []
    n = len(pages)
    if n > max_pages:
        warnings.append(f"Scanned PDF has {n} pages; OCR limited to the first {max_pages}.")
        pages = pages[:max_pages]

    chunks: List[str] = []
    for i, page in enumerate(pages):
        try:
            chunks.append(pytesseract.image_to_string(page, lang=lang) or "")
        except Exception as exc:  # one bad page shouldn't kill the rest
            warnings.append(f"OCR failed on page {i + 1}: {exc}")
    text = "\n".join(c for c in chunks if c.strip())
    if len(text.strip()) < _MIN_USEFUL_CHARS:
        warnings.append("OCR produced little or no text from the scanned PDF.")
    return text, warnings


def maybe_ocr_pdf_if_empty(file: Any, extracted_text: str) -> Tuple[str, List[str]]:
    """Fallback: if a PDF's text layer was empty (image-only scan), OCR it.

    Intended to be called by the PDF path after ``ManuscriptParser`` returns
    little/no text. Returns ``(ocr_text, warnings)`` (empty text if the layer
    was fine or OCR is unavailable).
    """
    if extracted_text and len(extracted_text.strip()) >= 50:
        return "", []  # text layer is fine; no OCR needed
    return ocr_scanned_pdf(file)
