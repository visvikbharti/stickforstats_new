#!/usr/bin/env python3
"""Score every paper in the retraction-backtest manifest with SQS.

Usage::

    python score.py \\
        --manifest data/manifest_v1.csv \\
        --output data/scores_v1.csv

The driver:

1. Reads the manifest (schema: see PROTOCOL.md section 7).
2. For each row, loads ``full_text_local_path`` (``.nxml.gz`` or ``.nxml``).
3. Converts NXML -> plain text preserving section headings, paragraph
   structure, and table cells (figures and supplementary references are
   dropped).
4. Calls :class:`SQSClient.score` with ONLY the four whitelisted metadata
   keys from ``PROTOCOL.md`` (``pub_year``, ``journal``, ``issn``,
   ``mesh_top5``). Any other key raises ``BlindingViolation``.
5. Writes one row to ``scores_v1.csv`` per paper, echoing ``record_id``
   and adding derived numeric scores + rule-ID lists.

Determinism guarantee: the same input NXML scored at the same git SHA
yields bit-identical output (modulo ``scored_at``). Verified by
``--verify`` mode, which scores the first 10 records twice and diffs
every non-timestamp field. Random seeds are not used; the SQS scorer is
purely deterministic over (text, field).

Exit codes:
    0  -- success (all rows scored or resumed)
    1  -- fatal configuration error
    2  -- verification mode detected non-determinism

This script is Python 3.9 compatible (matches the backend). Stdlib +
``lxml`` + ``pandas`` + ``requests`` only; no ``numpy``.
"""

from __future__ import annotations

import argparse
import csv
import datetime as _dt
import gzip
import io
import json
import logging
import os
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from lxml import etree  # noqa: E402 -- lxml is pinned in requirements.txt

# ---------------------------------------------------------------------------
# Local imports: make ``sqs_client`` importable even when the driver is
# launched from a different cwd.
# ---------------------------------------------------------------------------

_THIS_DIR = Path(__file__).resolve().parent
if str(_THIS_DIR) not in sys.path:
    sys.path.insert(0, str(_THIS_DIR))

from sqs_client import (  # noqa: E402
    ALLOWED_METADATA_KEYS,
    BlindingViolation,
    SQSClient,
    SQSResult,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logger = logging.getLogger("score")

# ---------------------------------------------------------------------------
# Output CSV schema (fixed, see docstring + task brief).
# ---------------------------------------------------------------------------

OUTPUT_FIELDNAMES: List[str] = [
    "record_id",
    "sqs_score",
    "category_scores_json",
    "rules_hit",
    "rules_missed",
    "rules_not_applicable",
    "violations_count",
    "n_claims_extracted",
    "n_consistency_failures",
    "scored_at",
    "analyzer_version",
    "error",
]

# Columns we copy from the manifest to the scorer's ``metadata`` dict.
# Hard-coded to the whitelist so that if a manifest column drifts the
# scorer still sees only the preregistered, blinded slice.
_METADATA_COLUMNS: Tuple[str, ...] = ("pub_year", "journal", "issn", "mesh_top5")

# Columns we MUST NOT pass to the scorer even if present in the manifest.
_FORBIDDEN_SCORER_COLUMNS: Tuple[str, ...] = (
    "class",
    "case_id",
    "retraction_date",
    "retraction_reasons_raw",
    "retraction_is_statistical",
)


# ===========================================================================
# NXML --> plain text
# ===========================================================================

# Elements that contribute their text to the output.
_BODY_TAGS = {
    "p",
    "title",
    "label",
    "caption",
    "abstract",
    "front",
    "body",
    "sec",
    "list",
    "list-item",
    "def",
    "term",
    "disp-quote",
}

# Elements whose entire subtree we drop (figures, supplementary, refs).
_DROP_TAGS = {
    "ref-list",
    "fn-group",
    "back",
    "fig",
    "fig-group",
    "graphic",
    "media",
    "inline-graphic",
    "disp-formula",
    "inline-formula",
    "tex-math",
    "mml:math",
    "math",
    "table-wrap-foot",
    "supplementary-material",
    "object-id",
    "contrib-group",
    "aff",
    "xref",
    "named-content",
    "notes",
}

# Section-heading tags whose text we emit followed by a blank line.
_HEADING_TAGS = {"title", "label"}


def _localname(tag: object) -> str:
    """Return the tag's local name (strip XML namespace prefix)."""
    if isinstance(tag, str):
        s = tag
        if "}" in s:
            return s.split("}", 1)[1]
        return s
    return ""


def _text_of_table(elem: etree._Element) -> str:
    """Render a ``<table>`` subtree into a simple tab-separated string.

    We keep *table cell text* because statistical claims (means, SDs,
    Cohen's d, p-values) frequently live in result tables, and the SQS
    regex rules should see them. We drop table footers.
    """
    rows_out: List[str] = []
    for row in elem.iter():
        name = _localname(row.tag)
        if name != "tr":
            continue
        cells: List[str] = []
        for cell in row:
            if _localname(cell.tag) in {"td", "th"}:
                txt = " ".join(
                    (cell.itertext() if cell is not None else [])
                ).strip()
                if txt:
                    cells.append(txt)
        if cells:
            rows_out.append("\t".join(cells))
    return "\n".join(rows_out)


def _walk(elem: etree._Element, out: List[str], depth: int = 0) -> None:
    """Recursive walk of a JATS/NXML tree producing plain-text segments.

    Strategy:

    * Headings (``title``, ``label`` that sit directly under a
      ``sec``) become their own line, followed by a blank line so the
      SQS section detectors fire.
    * Paragraph text joins adjacent words with single spaces.
    * Tables are rendered cell-by-cell via :func:`_text_of_table`.
    * Figures, formulas, reference lists, supplementary material, and
      front-matter contrib blocks are dropped wholesale.
    """
    name = _localname(elem.tag)

    if name in _DROP_TAGS:
        return

    if name == "table-wrap":
        # Label (e.g. "Table 1"), then caption, then cell grid.
        for child in elem:
            cname = _localname(child.tag)
            if cname == "label":
                lab = " ".join(child.itertext()).strip()
                if lab:
                    out.append(lab)
            elif cname == "caption":
                cap = " ".join(child.itertext()).strip()
                if cap:
                    out.append(cap)
            elif cname == "table":
                txt = _text_of_table(child)
                if txt:
                    out.append(txt)
        return

    if name == "table":
        txt = _text_of_table(elem)
        if txt:
            out.append(txt)
        return

    # Section headings -- only when ``title`` or ``label`` is a direct
    # child of a section/abstract/body; otherwise it might be an
    # element attribute label we do not want on its own line.
    if name in _HEADING_TAGS and elem.getparent() is not None:
        parent_name = _localname(elem.getparent().tag)
        if parent_name in {"sec", "abstract", "body", "front"}:
            heading = " ".join(elem.itertext()).strip()
            if heading:
                out.append("\n" + heading + "\n")
            return

    # Article title at the front-matter level becomes the first line.
    if name == "article-title":
        title_text = " ".join(elem.itertext()).strip()
        if title_text:
            out.append(title_text + "\n")
        return

    # Paragraphs: collapse all descendant text into one blob.
    if name == "p":
        ptext = " ".join(elem.itertext())
        ptext = " ".join(ptext.split())  # normalise whitespace
        if ptext:
            out.append(ptext)
        return

    # Default: recurse so we descend into ``article``, ``body``,
    # ``sec``, ``abstract``, ``front``, ``article-meta`` etc.
    for child in elem:
        _walk(child, out, depth + 1)


def nxml_to_text(raw_bytes: bytes) -> str:
    """Convert NXML (JATS XML) bytes into plain text for SQS scoring.

    Raises :class:`ValueError` if the XML cannot be parsed.
    """
    if not raw_bytes:
        raise ValueError("nxml_to_text received empty bytes")

    # lxml is strict about encoding declarations; ``recover=True``
    # salvages papers with minor malformedness.
    parser = etree.XMLParser(
        recover=True,
        ns_clean=True,
        remove_blank_text=False,
        resolve_entities=False,
        huge_tree=True,
    )
    root = etree.fromstring(raw_bytes, parser=parser)
    if root is None:
        raise ValueError("Could not parse NXML (lxml returned None).")

    segments: List[str] = []
    _walk(root, segments)

    text = "\n\n".join(s.strip() for s in segments if s and s.strip())

    # Normalise unicode whitespace and collapse triple newlines.
    text = text.replace("\u00a0", " ")
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text.strip()


def read_nxml_file(path: Path) -> bytes:
    """Read an NXML file, transparently gunzipping ``.nxml.gz``."""
    if not path.exists():
        raise FileNotFoundError(str(path))
    if str(path).endswith(".gz"):
        with gzip.open(path, "rb") as f:
            return f.read()
    return path.read_bytes()


# ===========================================================================
# Git SHA helper
# ===========================================================================


def current_analyzer_version() -> str:
    """Return the HEAD git SHA, or ``'uncommitted'`` if not in a repo."""
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=str(_THIS_DIR),
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if out:
            return out
    except Exception:  # pragma: no cover
        pass
    return "uncommitted"


# ===========================================================================
# Resume support
# ===========================================================================


def _load_existing_scores(output_path: Path) -> Dict[str, Dict[str, Any]]:
    """Return a dict ``record_id -> row`` of rows already scored.

    Only rows with empty/null ``error`` count as "done"; error rows are
    re-attempted on resume.
    """
    if not output_path.exists():
        return {}
    done: Dict[str, Dict[str, Any]] = {}
    with output_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rid = row.get("record_id")
            if not rid:
                continue
            err = (row.get("error") or "").strip()
            if err and err.lower() != "null":
                continue
            done[rid] = row
    return done


# ===========================================================================
# Manifest I/O
# ===========================================================================


def _parse_mesh_top5(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw if str(x).strip()]
    s = str(raw).strip()
    if not s or s.lower() == "nan":
        return []
    # Manifest contract stores mesh_top5 as ``a|b|c`` pipe-separated.
    if "|" in s:
        return [p.strip() for p in s.split("|") if p.strip()]
    # Fallback: comma
    return [p.strip() for p in s.split(",") if p.strip()]


def _manifest_rows(manifest_path: Path) -> Iterable[Dict[str, Any]]:
    with manifest_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row


def _build_metadata(row: Mapping[str, Any]) -> Dict[str, Any]:
    """Extract the blinded metadata dict for the scorer.

    Validates at call-site that no forbidden columns leak through.
    """
    meta: Dict[str, Any] = {}
    for col in _METADATA_COLUMNS:
        if col in row and row[col] not in (None, ""):
            if col == "pub_year":
                try:
                    meta[col] = int(str(row[col]).strip())
                except (TypeError, ValueError):
                    meta[col] = str(row[col]).strip()
            elif col == "mesh_top5":
                meta[col] = _parse_mesh_top5(row[col])
            else:
                meta[col] = str(row[col]).strip()
    # Defensive: if a forbidden key slipped in via dict-manipulation
    # upstream, abort loudly.
    for forbidden in _FORBIDDEN_SCORER_COLUMNS:
        if forbidden in meta:
            raise BlindingViolation(
                f"Forbidden column {forbidden!r} reached metadata dict"
            )
    return meta


# ===========================================================================
# Scoring loop
# ===========================================================================


def _format_cat_scores(cat_scores: Mapping[str, float]) -> str:
    """Return deterministic JSON -- sorted keys, fixed precision."""
    return json.dumps(
        {k: round(float(v), 4) for k, v in sorted(cat_scores.items())},
        sort_keys=True,
        separators=(",", ":"),
    )


def _empty_row(record_id: str, err: Optional[str], analyzer_version: str) -> Dict[str, Any]:
    return {
        "record_id": record_id,
        "sqs_score": "",
        "category_scores_json": "",
        "rules_hit": "",
        "rules_missed": "",
        "rules_not_applicable": "",
        "violations_count": "",
        "n_claims_extracted": "",
        "n_consistency_failures": "",
        "scored_at": _dt.datetime.now(_dt.timezone.utc).isoformat(
            timespec="seconds"
        ),
        "analyzer_version": analyzer_version,
        "error": err or "",
    }


def _populated_row(
    record_id: str,
    result: SQSResult,
    n_claims: Optional[int],
    n_consist: Optional[int],
    analyzer_version: str,
) -> Dict[str, Any]:
    return {
        "record_id": record_id,
        "sqs_score": f"{result.sqs_score:.4f}",
        "category_scores_json": _format_cat_scores(result.category_scores),
        "rules_hit": "|".join(result.rules_hit),
        "rules_missed": "|".join(result.rules_missed),
        "rules_not_applicable": "|".join(result.rules_not_applicable),
        "violations_count": str(result.violations_count),
        "n_claims_extracted": "" if n_claims is None else str(n_claims),
        "n_consistency_failures": "" if n_consist is None else str(n_consist),
        "scored_at": _dt.datetime.now(_dt.timezone.utc).isoformat(
            timespec="seconds"
        ),
        "analyzer_version": analyzer_version,
        "error": "",
    }


def _score_one(
    row: Mapping[str, Any],
    client: SQSClient,
    analyzer_version: str,
    extractor,
    validator,
) -> Dict[str, Any]:
    """Process a single manifest row. Never raises."""
    record_id = (row.get("record_id") or "").strip()
    if not record_id:
        return _empty_row("", "MissingRecordID: manifest row has no record_id", analyzer_version)

    path_str = (row.get("full_text_local_path") or "").strip()
    if not path_str:
        return _empty_row(
            record_id,
            "MissingPath: manifest row has no full_text_local_path",
            analyzer_version,
        )

    path = Path(path_str)
    if not path.is_absolute():
        # Resolve relative to the manifest location's parent's repo root.
        candidate = _THIS_DIR.parent / path
        if candidate.exists():
            path = candidate

    try:
        raw = read_nxml_file(path)
    except FileNotFoundError:
        return _empty_row(
            record_id,
            f"FileNotFoundError: {path}",
            analyzer_version,
        )
    except Exception as exc:
        return _empty_row(
            record_id,
            f"{type(exc).__name__}: {exc}",
            analyzer_version,
        )

    try:
        text = nxml_to_text(raw)
    except Exception as exc:
        return _empty_row(
            record_id,
            f"NXMLParseError: {type(exc).__name__}: {exc}",
            analyzer_version,
        )

    if len(text.strip()) < 100:
        return _empty_row(
            record_id,
            "ShortText: NXML produced <100 chars of plain text",
            analyzer_version,
        )

    try:
        metadata = _build_metadata(row)
    except BlindingViolation as exc:
        return _empty_row(
            record_id,
            f"BlindingViolation: {exc}",
            analyzer_version,
        )

    try:
        result = client.score(text, metadata=metadata)
    except Exception as exc:
        return _empty_row(
            record_id,
            f"{type(exc).__name__}: {exc}",
            analyzer_version,
        )

    n_claims: Optional[int] = None
    n_consist: Optional[int] = None
    if extractor is not None and validator is not None:
        try:
            claims = extractor.extract(text, section="full_text")
            n_claims = len(claims)
            checkable = [
                c for c in claims
                if getattr(c, "claim_type", None)
                and getattr(c, "statistic_value", None) is not None
                and getattr(c, "p_value", None) is not None
            ]
            summary = validator.validate(checkable)
            n_consist = int(summary.inconsistent + summary.decision_errors)
        except Exception:  # pragma: no cover -- soft failure
            n_claims = None
            n_consist = None

    return _populated_row(record_id, result, n_claims, n_consist, analyzer_version)


def _load_extractor_and_validator():
    """Best-effort import of claim extractor + consistency validator.

    Returns ``(None, None)`` if imports fail; the driver degrades
    gracefully (CSV columns become blank).
    """
    try:
        from core.manuscript.claim_extractor import StatisticalClaimExtractor  # noqa: WPS433
        from core.manuscript.consistency_validator import ConsistencyValidator  # noqa: WPS433
        return StatisticalClaimExtractor(), ConsistencyValidator()
    except Exception as exc:
        logger.warning("Claim extractor / validator unavailable: %s", exc)
        return None, None


# ===========================================================================
# Driver
# ===========================================================================


def run(
    manifest_path: Path,
    output_path: Path,
    *,
    resume: bool = True,
    limit: Optional[int] = None,
    retry: int = 3,
    fail_fast: bool = False,
    backend: str = "in_process",
) -> Dict[str, Any]:
    """Score all rows of the manifest. Returns a summary dict."""
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    analyzer_version = current_analyzer_version()
    client = SQSClient(backend=backend) if backend == "in_process" else SQSClient.from_env()
    extractor, validator = _load_extractor_and_validator()

    existing = _load_existing_scores(output_path) if resume else {}
    logger.info(
        "Starting run: manifest=%s output=%s analyzer_version=%s resume=%d limit=%s",
        manifest_path, output_path, analyzer_version, int(resume), limit,
    )
    logger.info("Existing rows (resume skipped): %d", len(existing))

    # We always re-open the CSV in append mode if there are already rows;
    # otherwise write headers fresh.
    file_exists = output_path.exists() and output_path.stat().st_size > 0

    processed = 0
    errors = 0
    scores: List[float] = []
    class_hints: Dict[str, int] = {}  # for end-of-run sanity print only

    with output_path.open("a", newline="", encoding="utf-8") as out_fh:
        writer = csv.DictWriter(out_fh, fieldnames=OUTPUT_FIELDNAMES)
        if not file_exists:
            writer.writeheader()

        for row in _manifest_rows(manifest_path):
            if limit is not None and processed >= limit:
                break
            record_id = (row.get("record_id") or "").strip()
            if not record_id:
                errors += 1
                writer.writerow(
                    _empty_row("", "MissingRecordID", analyzer_version)
                )
                processed += 1
                continue

            if resume and record_id in existing:
                logger.debug("Resume: skipping %s", record_id)
                # Still count scores for the sanity print.
                try:
                    scores.append(float(existing[record_id]["sqs_score"]))
                    class_hints[(row.get("class") or "?")] = (
                        class_hints.get(row.get("class") or "?", 0) + 1
                    )
                except (ValueError, KeyError, TypeError):
                    pass
                continue

            # Retry wrapper
            attempt = 0
            out_row: Optional[Dict[str, Any]] = None
            while attempt <= retry:
                try:
                    out_row = _score_one(
                        row, client, analyzer_version, extractor, validator
                    )
                except Exception as exc:  # _score_one shouldn't raise
                    out_row = _empty_row(
                        record_id,
                        f"DriverError: {type(exc).__name__}: {exc}",
                        analyzer_version,
                    )
                # Only retry on transient errors (network, temp I/O).
                err = (out_row.get("error") or "").strip()
                if not err:
                    break
                if not _is_transient(err) or attempt >= retry:
                    break
                attempt += 1
                time.sleep(min(2 ** attempt, 30))

            assert out_row is not None
            writer.writerow(out_row)
            out_fh.flush()
            processed += 1
            if out_row.get("error"):
                errors += 1
                if fail_fast:
                    logger.error("fail-fast: aborting on %s", record_id)
                    break
            else:
                try:
                    scores.append(float(out_row["sqs_score"]))
                except (ValueError, TypeError):
                    pass
                class_hints[(row.get("class") or "?")] = (
                    class_hints.get(row.get("class") or "?", 0) + 1
                )

    return {
        "processed": processed,
        "errors": errors,
        "resumed": len(existing),
        "scored": len(scores),
        "mean": (sum(scores) / len(scores)) if scores else None,
        "median": (sorted(scores)[len(scores) // 2]) if scores else None,
        "min": min(scores) if scores else None,
        "max": max(scores) if scores else None,
        "class_counts": class_hints,
    }


def _is_transient(err_msg: str) -> bool:
    """Heuristic: retry on network/IO, not on parse/blinding errors."""
    transient_markers = (
        "Timeout", "ConnectionError", "ReadTimeout", "ConnectTimeout",
        "HTTPError", "TemporaryFailure", "OSError", "TimeoutError",
    )
    return any(m in err_msg for m in transient_markers)


# ===========================================================================
# Verify mode
# ===========================================================================


def verify_determinism(
    manifest_path: Path,
    n: int = 10,
    backend: str = "in_process",
) -> bool:
    """Score *n* papers twice; return True iff all non-timestamp fields match."""
    client = SQSClient(backend=backend)
    extractor, validator = _load_extractor_and_validator()
    av = current_analyzer_version()

    rows_src = list(_manifest_rows(manifest_path))[:n]
    if not rows_src:
        logger.error("Verify: manifest has no rows.")
        return False

    def _score_all() -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for row in rows_src:
            out.append(_score_one(row, client, av, extractor, validator))
        return out

    run_a = _score_all()
    run_b = _score_all()
    ok = True
    for a, b in zip(run_a, run_b):
        for k in OUTPUT_FIELDNAMES:
            if k == "scored_at":
                continue
            if a.get(k) != b.get(k):
                logger.error(
                    "Mismatch on %s field=%s: %r vs %r",
                    a.get("record_id"), k, a.get(k), b.get(k),
                )
                ok = False
    # Additionally prove blinding: snapshot what the client sees.
    seen_metadata = _build_metadata(rows_src[0])
    for forbidden in _FORBIDDEN_SCORER_COLUMNS:
        if forbidden in seen_metadata:
            logger.error("BLINDING BREACH: scorer saw %s", forbidden)
            ok = False
    return ok


# ===========================================================================
# CLI
# ===========================================================================


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="score.py",
        description=(
            "Score every paper in the retraction-backtest manifest with "
            "StickForStats' SQS. See paper/retraction_backtest/PROTOCOL.md "
            "for the preregistered methodology."
        ),
    )
    p.add_argument(
        "--manifest",
        default="data/manifest_v1.csv",
        help="Path to manifest CSV (default: data/manifest_v1.csv).",
    )
    p.add_argument(
        "--output",
        default="data/scores_v1.csv",
        help="Path to write scores CSV (default: data/scores_v1.csv).",
    )
    p.add_argument(
        "--resume",
        dest="resume",
        action="store_true",
        default=True,
        help="Skip records already present in the output CSV (default: on).",
    )
    p.add_argument(
        "--no-resume",
        dest="resume",
        action="store_false",
        help="Ignore any existing output rows and overwrite from scratch.",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Score only the first N records (for smoke tests).",
    )
    p.add_argument(
        "--retry",
        type=int,
        default=3,
        help="Retry count for transient errors (default 3).",
    )
    p.add_argument(
        "--fail-fast",
        action="store_true",
        help="Abort on the first permanent error (default: off).",
    )
    p.add_argument(
        "--backend",
        choices=["in_process", "http"],
        default="in_process",
        help="Scorer backend (default: in_process).",
    )
    p.add_argument(
        "--verify",
        action="store_true",
        help="Score first 10 rows twice and assert bit-identical output.",
    )
    p.add_argument(
        "--emit-header-only",
        action="store_true",
        help=(
            "Write an empty scores_v1.csv with header row only, then exit. "
            "Used to seed the output file before the real manifest lands."
        ),
    )
    p.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity (default INFO).",
    )
    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(message)s",
    )

    manifest_path = Path(args.manifest).resolve()
    output_path = Path(args.output).resolve()

    if args.emit_header_only:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=OUTPUT_FIELDNAMES).writeheader()
        logger.info("Wrote header-only scores file to %s", output_path)
        return 0

    if args.verify:
        if not manifest_path.exists():
            logger.error("Verify: manifest not found at %s", manifest_path)
            return 1
        ok = verify_determinism(manifest_path, n=10, backend=args.backend)
        if ok:
            logger.info("VERIFY OK: bit-identical across two runs.")
            return 0
        logger.error("VERIFY FAILED: non-determinism detected.")
        return 2

    try:
        summary = run(
            manifest_path,
            output_path,
            resume=args.resume,
            limit=args.limit,
            retry=args.retry,
            fail_fast=args.fail_fast,
            backend=args.backend,
        )
    except FileNotFoundError as exc:
        logger.error("%s", exc)
        return 1

    logger.info("Run summary: %s", json.dumps(summary, sort_keys=True))
    # Final one-line sanity print: mean/median/min/max SQS, class counts.
    # We ONLY use class AFTER scoring for reporting -- never inside the
    # scorer itself.
    print("--- SQS run summary ---")
    print(f"processed: {summary['processed']}")
    print(f"errors:    {summary['errors']}")
    if summary.get("mean") is not None:
        print(
            f"SQS mean={summary['mean']:.2f} "
            f"median={summary['median']:.2f} "
            f"min={summary['min']:.2f} "
            f"max={summary['max']:.2f}"
        )
    if summary.get("class_counts"):
        print("class counts (post-hoc only, not used by scorer):")
        for cls, n in sorted(summary["class_counts"].items()):
            print(f"  {cls}: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
