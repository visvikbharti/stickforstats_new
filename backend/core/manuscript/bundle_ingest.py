"""
bundle_ingest.py — multi-file submission ingestion (the editor/publisher case).
================================================================================

Editors and publishers don't upload one clean file — they upload a *bundle*:
the manuscript (PDF/DOCX/LaTeX/JATS) **plus** supplementary documents, the raw
data (CSV/Excel/SPSS/…), and figure images (TIFF/PNG/JPEG). This module ingests
that whole bundle in one pass:

  1. each file is routed by kind (already classified by the caller):
       - manuscript -> ManuscriptParser (text layer; tables reconstructed)
       - image      -> image_ocr (figure/scanned-panel OCR)
       - data       -> data_loader (bounded DataFrame)
  2. all manuscript + OCR text is concatenated into ONE manuscript_text
  3. all tabular files are collected as candidate datasets
  4. a multi-table linker lets each extracted claim find its dataset across
     every uploaded table

The result feeds ``run_verification`` unchanged. This module is Django-free
(no settings/ORM import) so it stays unit-testable in isolation; the REST view
does the HTTP/classification boundary.

See ``docs/INGESTION_ARCHITECTURE.md``.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)


@dataclass
class IngestedFile:
    """Per-file ingestion outcome, surfaced to the caller for transparency."""

    name: str
    kind: str                       # manuscript | data | image | unknown
    detail: str = ""                # parser file_type / extension
    ok: bool = False
    role: str = ""                  # what we used it for ("manuscript_text", "dataset", "ocr_text", "skipped")
    chars: int = 0                  # extracted text length (manuscript/image)
    n_rows: int = 0                 # data
    n_cols: int = 0
    ocr_used: bool = False
    warnings: List[str] = field(default_factory=list)
    error: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name, "kind": self.kind, "detail": self.detail, "ok": self.ok,
            "role": self.role, "chars": self.chars, "n_rows": self.n_rows, "n_cols": self.n_cols,
            "ocr_used": self.ocr_used, "warnings": self.warnings, "error": self.error,
        }


@dataclass
class BundleResult:
    """The combined, ready-to-verify view of a whole upload bundle."""

    manuscript_text: str = ""
    segments: List[Tuple[str, str]] = field(default_factory=list)     # (source_file, text) per file
    dataframes: List[Tuple[str, Any]] = field(default_factory=list)   # (name, DataFrame)
    files: List[IngestedFile] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    ocr_used: bool = False

    def report(self) -> Dict[str, Any]:
        return {
            "n_files": len(self.files),
            "n_manuscript_files": sum(1 for f in self.files if f.kind == "manuscript" and f.ok),
            "n_data_files": len(self.dataframes),
            "n_image_files": sum(1 for f in self.files if f.kind == "image" and f.ok),
            "n_unknown": sum(1 for f in self.files if f.kind == "unknown"),
            "manuscript_chars": len(self.manuscript_text),
            "ocr_used": self.ocr_used,
            "files": [f.to_dict() for f in self.files],
            "warnings": self.warnings,
        }


def ingest_bundle(items: List[Dict[str, Any]]) -> BundleResult:
    """Ingest a classified bundle.

    Args:
        items: list of dicts, each ``{"name": str, "kind": str, "detail": str,
               "content": bytes}`` where ``kind`` is manuscript|data|image|unknown
               (the caller classifies — see ``api/v1/_upload_utils.classify_upload``).

    Returns:
        A :class:`BundleResult` with the concatenated manuscript text, the list
        of loaded datasets, and a per-file ingestion report.
    """
    # local imports keep module import cheap and dependency-graceful
    from .parser import ManuscriptParser
    from . import image_ocr
    from .data_loader import load_dataframe

    res = BundleResult()
    manuscript_chunks: List[str] = []
    ocr_chunks: List[str] = []
    parser = ManuscriptParser()

    for item in items:
        name = item.get("name", "") or "unnamed"
        kind = item.get("kind", "unknown")
        detail = item.get("detail", "") or ""
        content = item.get("content", b"") or b""
        rec = IngestedFile(name=name, kind=kind, detail=detail)

        try:
            if kind == "manuscript":
                ref_ctx = None
                if detail == "jats":
                    # JATS: parse structurally so we get the cross-reference graph (artifacts +
                    # xrefs) the resolver needs — the gold path for exact reference resolution.
                    from .jats_parser import parse_jats
                    from .artifact_index import context_from_jats
                    jdoc = parse_jats(content)
                    if jdoc is None or not jdoc.full_text.strip():
                        text = ""
                        rec.warnings.append("XML did not parse as a JATS article, or had no body.")
                    else:
                        text = jdoc.full_text
                        ref_ctx = context_from_jats(jdoc, home_file=name)
                else:
                    parsed = parser.parse(io.BytesIO(content), file_type=detail)
                    text = parsed.full_text or ""
                    rec.warnings.extend(parsed.warnings or [])
                    # scanned/image-only PDF -> OCR fallback
                    if detail == "pdf" and len(text.strip()) < 50:
                        ocr_text, ocr_warns = image_ocr.maybe_ocr_pdf_if_empty(io.BytesIO(content), text)
                        rec.warnings.extend(ocr_warns)
                        if ocr_text.strip():
                            text = ocr_text
                            rec.ocr_used = True
                            res.ocr_used = True
                    # non-JATS reference index: detect Table/Figure captions so claims here can
                    # resolve to labeled artifacts (the label tier; no machine-readable xrefs).
                    if text.strip():
                        from .artifact_index import context_from_text
                        _ctx = context_from_text(text, home_file=name)
                        if _ctx.artifacts:
                            ref_ctx = _ctx
                if text.strip():
                    manuscript_chunks.append(text)
                    res.segments.append((name, text, ref_ctx) if ref_ctx is not None else (name, text))
                    rec.ok = True
                    rec.role = "manuscript_text"
                    rec.chars = len(text)
                else:
                    rec.error = "no text could be extracted"

            elif kind == "image":
                ocr_text, ocr_warns = image_ocr.ocr_image(io.BytesIO(content))
                rec.warnings.extend(ocr_warns)
                if ocr_text.strip():
                    ocr_chunks.append(ocr_text)
                    res.segments.append((name, ocr_text))
                    rec.ok = True
                    rec.ocr_used = True
                    res.ocr_used = True
                    rec.role = "ocr_text"
                    rec.chars = len(ocr_text)
                else:
                    rec.role = "skipped"
                    rec.error = "OCR produced no usable text"

            elif kind == "data":
                df = load_dataframe(name, content)
                res.dataframes.append((name, df))
                rec.ok = True
                rec.role = "dataset"
                rec.n_rows = int(df.shape[0])
                rec.n_cols = int(df.shape[1])

            else:
                rec.kind = "unknown"
                rec.role = "skipped"
                rec.error = "unsupported file type"
                res.warnings.append(f"Skipped unsupported file: {name}")

        except ValueError as exc:  # user-actionable (bad/oversized table, etc.)
            rec.error = str(exc)
            res.warnings.append(f"{name}: {exc}")
        except Exception as exc:  # noqa: BLE001 — one bad file must not sink the bundle
            logger.warning("bundle: failed to ingest %s: %s", name, exc)
            rec.error = f"could not ingest ({exc})"
            res.warnings.append(f"{name}: could not ingest")

        res.files.append(rec)

    # manuscript prose first, then OCR'd figure text (lower fidelity, appended last)
    res.manuscript_text = "\n\n".join(manuscript_chunks + ocr_chunks).strip()
    return res


def make_multitable_linker(dataframes: List[Tuple[str, Any]]):
    """Build a claim->data linker that tries EVERY uploaded table.

    Returns the first confident ("linked") match across the datasets, else the
    first ambiguous/unlinkable result (so the verdict stays honestly
    INSUFFICIENT_DATA). Returns ``None`` if there are no datasets.
    """
    if not dataframes:
        return None
    from .claim_data_linker import link_claim_to_table

    dfs = [df for _, df in dataframes]

    def linker(claim, _ignored_single_df, context_text: str = ""):
        fallback = None
        for df in dfs:
            try:
                lr = link_claim_to_table(claim, df, context_text=context_text)
            except Exception as exc:  # a malformed table shouldn't break linking
                logger.debug("multitable link failed on one table: %s", exc)
                continue
            if getattr(lr, "status", None) == "linked":
                return lr
            fallback = fallback or lr
        return fallback

    return linker
