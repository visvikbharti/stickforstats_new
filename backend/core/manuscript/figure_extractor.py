"""
figure_extractor.py — pluggable extraction of statistics printed in figures.
============================================================================

Statistics often live INSIDE figure images (a p-value annotated on a plot, a
panel label). This module extracts them with a two-tier, pluggable strategy
(decision D7; workplan Phase 5):

  1. OCR baseline — always on, NO external egress (Tesseract via image_ocr).
  2. Vision tier — OPT-IN and pluggable, for stats OCR cannot read (tiny/rotated/
     overlapping text). OFF by default; runs only a caller-injected ``vision_fn``,
     so the default never sends a confidential manuscript figure anywhere. A
     self-hosted model is the recommended provider.

Extracted figure text is, by nature, lower-fidelity than a document text layer,
so figure-sourced claims are tagged with their ``extraction_method`` (ocr/vision)
and should be treated as lower-confidence by downstream consumers.

Privacy invariant: with the default constructor (no vision_fn / vision disabled)
this module makes NO network call — it is OCR-only.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable, Optional, Tuple

from . import image_ocr

# a cheap "does this text contain a statistic?" hint — used to decide whether OCR succeeded or
# whether to fall back to the vision tier.
_STAT_HINT = re.compile(r"[=<>]\s*\.?\d|\bp\s*[=<>]|\bt\s*\(|\bF\s*\(|\br\s*=|χ|chi", re.I)


def has_stat_hint(text: str) -> bool:
    return bool(text) and bool(_STAT_HINT.search(text))


def _to_bytes(image: Any) -> bytes:
    if isinstance(image, (bytes, bytearray)):
        return bytes(image)
    try:
        image.seek(0)
    except Exception:
        pass
    raw = image.read()
    return raw.encode("utf-8", "replace") if isinstance(raw, str) else raw


@dataclass
class FigureExtraction:
    text: str
    method: str            # "ocr" | "vision" | "none"
    confidence: float      # rough confidence of the extraction (not the re-analysis)
    warnings: Tuple[str, ...] = ()


class FigureStatExtractor:
    """OCR baseline + an optional, injected vision tier.

    Args:
        vision_fn: ``callable(image_bytes: bytes) -> str`` returning extracted text. The provider
            (self-hosted or otherwise) is the caller's to supply; this module never imports one.
        enable_vision: must be True AND a vision_fn supplied for the vision tier to run (double-gated
            so vision can never fire by accident — privacy).
    """

    def __init__(self, vision_fn: Optional[Callable[[bytes], str]] = None, enable_vision: bool = False):
        self._vision_fn = vision_fn
        self.vision_enabled = bool(enable_vision and vision_fn is not None)

    def extract(self, image: Any) -> FigureExtraction:
        warnings = []
        raw = _to_bytes(image)
        # 1. OCR baseline (no egress). If it already yields stat-bearing text, use it.
        ocr_text, ocr_warns = image_ocr.ocr_image(raw)
        warnings.extend(ocr_warns)
        if has_stat_hint(ocr_text):
            return FigureExtraction(text=ocr_text, method="ocr", confidence=0.5, warnings=tuple(warnings))

        # 2. vision tier (opt-in) — only for figures OCR could not read a statistic from.
        if self.vision_enabled:
            try:
                vtext = self._vision_fn(raw) or ""
            except Exception as exc:  # a failing provider must not sink ingestion
                warnings.append(f"vision extraction failed: {exc}")
                vtext = ""
            if vtext.strip():
                return FigureExtraction(text=vtext, method="vision", confidence=0.4, warnings=tuple(warnings))

        # OCR found *something* (just no clear statistic) -> still return it as ocr, else nothing.
        if ocr_text.strip():
            return FigureExtraction(text=ocr_text, method="ocr", confidence=0.3, warnings=tuple(warnings))
        return FigureExtraction(text="", method="none", confidence=0.0, warnings=tuple(warnings))


# the default: OCR-only, no egress. Callers that want the vision tier construct their own.
DEFAULT_FIGURE_EXTRACTOR = FigureStatExtractor()
