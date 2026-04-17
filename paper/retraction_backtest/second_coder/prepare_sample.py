#!/usr/bin/env python3
"""
Generate the stratified blinded sample for the second-coder label audit.

This script reuses the primary coder's §9.1 codebook — encoded as
``_label_statistical_reason`` in ``../code/harvest.py`` — to assign a
primary label to every retraction-notice row that passes the
PROTOCOL §7.2 date and identifier filters, then draws an equal-N
stratified random sample across the three labels (``stat``,
``nonstat``, ``ambiguous``) and writes:

    labeling_sheet.csv    — blinded, in shuffle order (seed 20260417)
    primary_labels.csv    — record_id → primary_label (kept out of the
                            coder's packet; used only for κ at review)
    _sample_manifest.json — seed, timestamps, source commit SHA, strata

The PRNG seed (``20260417``) matches the study-wide seed in PROTOCOL
§5 / §7.5. Re-running this script with the same seed against the same
Retraction Watch CSV commit produces the same sample byte-for-byte.

Usage::

    cd paper/retraction_backtest/second_coder
    python prepare_sample.py --n-per-class 50

By default the script reads the Retraction Watch CSV from
``../data/retraction-watch-data/retraction_watch.csv`` which is
populated by ``harvest.py``'s Step 1. It does not make any network
requests; if the CSV is missing, run ``harvest.py`` first (or
``ensure_retraction_watch_csv`` directly).
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import logging
import os
import random
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

# Add ../code/ to sys.path so we can reuse the frozen codebook from harvest.py.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str((HERE.parent / "code").resolve()))

import harvest  # noqa: E402


DEFAULT_SEED = 20260417
DEFAULT_N_PER_CLASS = 50
LABEL_ORDER = ("stat", "nonstat", "ambiguous")


@dataclass
class LabeledRow:
    record_id: str
    reason_raw: str
    journal: str
    retraction_doi: str
    original_doi: str
    primary_label: str


def _file_sha1(path: Path) -> str:
    """Return the SHA-1 of a file's bytes. Cheap integrity anchor for the CSV."""
    h = hashlib.sha1()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _git_commit_sha() -> Optional[str]:
    """Return the short git SHA of the repo head, or None if git is unavailable."""
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=HERE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return out.strip() or None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def label_all_candidates(csv_path: Path, logger: logging.Logger) -> List[LabeledRow]:
    """Apply PROTOCOL §7.2 filters + §9.1 codebook to every row.

    Mirrors ``harvest.load_candidate_cases`` but retains the Retraction Watch
    Record ID and notice-DOI columns that the second coder may want for
    disambiguation. Does not deduplicate by OriginalPaperDOI — for κ we
    want the sampled row set to reflect the same universe the coders are
    labeling from, and deduplication at labeling time can bias the strata.
    """
    rows: List[LabeledRow] = []
    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rdate = harvest._parse_rw_date(row.get("RetractionDate") or "")
            odate = harvest._parse_rw_date(row.get("OriginalPaperDate") or "")
            if rdate is None or odate is None:
                continue
            if not (2010 <= odate.year <= 2023 and 2010 <= rdate.year <= 2023):
                continue
            # Mirror harvest.py's filter exactly so the sample population
            # matches the population labeled in the primary pipeline.
            # Retraction Watch uses the literal string "unavailable" to
            # mean "no DOI / PMID on file"; both must be real values.
            doi = (row.get("OriginalPaperDOI") or "").strip().lower()
            if not doi or doi == "unavailable":
                continue
            pmid = (row.get("OriginalPaperPubMedID") or "").strip()
            if not pmid or pmid in {"0", "unavailable"}:
                continue
            reason_raw = row.get("Reason") or ""
            label = harvest._label_statistical_reason(reason_raw)
            rows.append(
                LabeledRow(
                    record_id=(row.get("Record ID") or "").strip(),
                    reason_raw=reason_raw.strip(),
                    journal=(row.get("Journal") or "").strip(),
                    retraction_doi=(row.get("RetractionDOI") or "").strip(),
                    original_doi=doi,
                    primary_label=label,
                )
            )
    logger.info(
        "labeled %d rows: stat=%d, nonstat=%d, ambiguous=%d",
        len(rows),
        sum(1 for r in rows if r.primary_label == "stat"),
        sum(1 for r in rows if r.primary_label == "nonstat"),
        sum(1 for r in rows if r.primary_label == "ambiguous"),
    )
    return rows


def stratified_sample(
    rows: List[LabeledRow], n_per_class: int, seed: int, logger: logging.Logger
) -> List[LabeledRow]:
    """Deterministic stratified random sample with equal allocation per class.

    Sorting each stratum by record_id before sampling makes the output
    dependent only on (csv_contents, seed, n_per_class) — not on Python's
    dict/set iteration order or any harvest.py side effect.
    """
    rng = random.Random(seed)
    selected: List[LabeledRow] = []
    for label in LABEL_ORDER:
        stratum = sorted(
            (r for r in rows if r.primary_label == label),
            key=lambda r: r.record_id,
        )
        if len(stratum) < n_per_class:
            logger.warning(
                "stratum %s has only %d rows (< %d requested); taking all.",
                label, len(stratum), n_per_class,
            )
            picked = stratum
        else:
            picked = rng.sample(stratum, n_per_class)
        logger.info("stratum %s: %d sampled", label, len(picked))
        selected.extend(picked)

    # Shuffle the combined sample so the second coder cannot infer strata
    # from row order. Use a separate RNG derived from the same seed so the
    # sample membership is independent of the shuffle order in principle.
    rng_shuffle = random.Random(seed + 1)
    rng_shuffle.shuffle(selected)
    return selected


def write_labeling_sheet(rows: List[LabeledRow], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "record_id",
                "reason_raw",
                "journal",
                "retraction_doi",
                "original_doi",
                "your_label",
                "notes",
            ],
        )
        writer.writeheader()
        for r in rows:
            writer.writerow(
                {
                    "record_id": r.record_id,
                    "reason_raw": r.reason_raw,
                    "journal": r.journal,
                    "retraction_doi": r.retraction_doi,
                    "original_doi": r.original_doi,
                    "your_label": "",
                    "notes": "",
                }
            )
    tmp.replace(out_path)


def write_primary_labels(rows: List[LabeledRow], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh, fieldnames=["record_id", "primary_label"]
        )
        writer.writeheader()
        for r in rows:
            writer.writerow(
                {"record_id": r.record_id, "primary_label": r.primary_label}
            )
    tmp.replace(out_path)


def write_manifest(
    rows: List[LabeledRow],
    csv_path: Path,
    seed: int,
    n_per_class: int,
    total_candidates: int,
    out_path: Path,
) -> None:
    manifest = {
        "prng_seed": seed,
        "n_per_class_requested": n_per_class,
        "n_sampled": len(rows),
        "n_total_candidates": total_candidates,
        "stratum_sizes_in_sample": {
            label: sum(1 for r in rows if r.primary_label == label)
            for label in LABEL_ORDER
        },
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "retraction_watch_csv_path": str(csv_path.relative_to(HERE.parent.parent.parent)),
        "retraction_watch_csv_sha1": _file_sha1(csv_path),
        "retraction_watch_csv_size_bytes": csv_path.stat().st_size,
        "git_commit_sha": _git_commit_sha(),
        "codebook_source": "paper/retraction_backtest/code/harvest.py::_label_statistical_reason",
        "protocol_ref": "paper/retraction_backtest/PROTOCOL.md §9.1 (commit 3da1c65 or later)",
    }
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")
    tmp.replace(out_path)


def build_argparser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=__doc__.splitlines()[1] if __doc__ else None,
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument(
        "--csv",
        type=Path,
        default=HERE.parent / "data" / "retraction-watch-data" / "retraction_watch.csv",
        help="Path to the Retraction Watch CSV.",
    )
    p.add_argument(
        "--n-per-class", type=int, default=DEFAULT_N_PER_CLASS,
        help="Rows per primary-label stratum (stat / nonstat / ambiguous).",
    )
    p.add_argument(
        "--seed", type=int, default=DEFAULT_SEED,
        help="PRNG seed (study-wide default is 20260417).",
    )
    p.add_argument("--verbose", action="store_true", help="DEBUG logging.")
    return p


def main(argv: Optional[List[str]] = None) -> int:
    args = build_argparser().parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)sZ %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    logger = logging.getLogger("prepare_sample")

    csv_path: Path = args.csv
    if not csv_path.exists():
        logger.error("Retraction Watch CSV not found at %s.", csv_path)
        logger.error("Run `python ../code/harvest.py --dry-run --limit 1` first "
                     "to populate the cache, or pass --csv <path>.")
        return 1

    logger.info("reading %s (%d bytes)", csv_path, csv_path.stat().st_size)
    rows = label_all_candidates(csv_path, logger)
    sample = stratified_sample(rows, args.n_per_class, args.seed, logger)

    write_labeling_sheet(sample, HERE / "labeling_sheet.csv")
    write_primary_labels(sample, HERE / "primary_labels.csv")
    write_manifest(sample, csv_path, args.seed, args.n_per_class, len(rows),
                   HERE / "_sample_manifest.json")

    logger.info(
        "wrote labeling_sheet.csv (%d rows), primary_labels.csv, "
        "_sample_manifest.json",
        len(sample),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
