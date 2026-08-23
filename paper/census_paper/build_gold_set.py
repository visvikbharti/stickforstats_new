#!/usr/bin/env python3
"""
build_gold_set.py — draw the pre-registered gold set for the two-coder kappa study.
====================================================================================

Reads the census's flagged-inconsistency claims, draws a STRATIFIED random sample (default 150;
PREREGISTRATION.md §6.1), and writes:
  - gold_set_coding_sheet.csv  — BLINDED (no tool verdict): the two human coders fill
    `coder1_category` / `coder2_category` / `notes` using CODEBOOK.md.
  - gold_set_key.csv           — the tool's automated category per claim, held SEPARATELY
    (so coding stays blinded); used later by compute_kappa.py for tool-vs-human accuracy.

Deterministic (fixed seed) so the draw is reproducible and archivable with the pre-registration.

Run:  python paper/census_paper/build_gold_set.py [--n 150] [--all] [--input PATH]
(Needs the flagged file: the drive ledger, or paper/census_paper/osf_deposit/data/, or --input.)
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
# The CORRECTED frame comes first. `flagged_inconsistencies.jsonl` is the pre-2026-08-21
# frame of 333 claims, produced by a p-reader with two holes (scientific notation read as
# "precision unknown", and the inequality branch using a flat +/-0.005 window regardless of
# stated precision -- both fixed in f979b89). Re-scoring the corpus moved the frame to 355.
# Drawing the gold set from the 333-row file gives the 22 corrected-in claims ZERO probability
# of selection, so the older file is kept only as a last-resort fallback.
_CANDIDATES = [
    Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/flagged_inconsistencies_corrected.jsonl"),
    # Tracked, and deliberately NOT under osf_deposit/ -- that tree is rebuilt by
    # prepare_osf_deposit.py, whose first act is to delete it.
    HERE / "data" / "flagged_inconsistencies_corrected.jsonl",
    Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/flagged_inconsistencies.jsonl"),
    HERE / "osf_deposit" / "data" / "flagged_inconsistencies.jsonl",
]
SEED = 20260627  # frozen with the pre-registration

# Tool adjudication. The rule is IMPORTED from the canonical adjudicator rather than restated
# here; this file used to carry its own copy under a comment promising "identical precedence to
# adjudicate_inconsistencies.classify", and on 2026-08-24 they had drifted -- the scientific-
# notation fix landed in one of them. Only the CODEBOOK's category names are local.
sys.path.insert(0, str(HERE.parent / "replication" / "verification"))
from adjudicate_inconsistencies import classify as _classify  # noqa: E402

# CODEBOOK.md names <- the adjudicator's names. Coders never see either; this is the held-back key.
_CATEGORY = {
    "FP_MISEXTRACTION": "mis_extraction",
    "FP_ONE_TAILED": "one_tailed",
    "REVIEW_P_BOUND": "p_bound",
    "TRUE_LIKELY": "genuine",
}


def tool_category(x: dict) -> str:
    return _CATEGORY[_classify(x)[0]]


def _find_input(arg: str | None) -> Path:
    if arg:
        return Path(arg)
    for c in _CANDIDATES:
        if c.exists():
            return c
    raise SystemExit("flagged_inconsistencies.jsonl not found; mount the drive or pass --input PATH "
                     "(or run prepare_osf_deposit.py to stage it under osf_deposit/data/).")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=150, help="gold-set size (default 150)")
    ap.add_argument("--all", action="store_true", help="code ALL flagged claims (overrides --n)")
    ap.add_argument("--input", default=None, help="path to flagged_inconsistencies.jsonl")
    args = ap.parse_args()

    src = _find_input(args.input)
    rows = [json.loads(line) for line in src.read_text().splitlines() if line.strip()]
    for r in rows:
        r["_tool"] = tool_category(r)

    # stratified random sample by (tool category x claim type), proportional, deterministic.
    rng = random.Random(SEED)
    if args.all or args.n >= len(rows):
        sample = rows[:]
        rng.shuffle(sample)
    else:
        strata = defaultdict(list)
        for r in rows:
            strata[(r["_tool"], r.get("claim_type", "?"))].append(r)
        sample = []
        frac = args.n / len(rows)
        for key, group in strata.items():
            rng.shuffle(group)
            take = max(1, round(len(group) * frac))
            sample.extend(group[:take])
        rng.shuffle(sample)
        sample = sample[:args.n]  # trim any rounding overshoot

    # blinded coding sheet (NO tool verdict)
    sheet = HERE / "gold_set_coding_sheet.csv"
    with sheet.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["idx", "claim_id", "pmcid", "raw_text", "statistic", "df",
                    "reported_p", "p_comparison", "recomputed_p",
                    "coder1_category", "coder2_category", "notes"])
        for i, r in enumerate(sample):
            rid = r.get("claim_id") or f"F{i:04d}"
            w.writerow([i, rid, r.get("pmcid", ""), r.get("raw_text", ""),
                        r.get("statistic", ""), r.get("df", ""), r.get("reported_p", ""),
                        r.get("p_comparison", ""),
                        f'{r.get("recomputed_p"):.4g}' if r.get("recomputed_p") is not None else "",
                        "", "", ""])

    # the separate key (tool's category) — do NOT give this to the coders
    key = HERE / "gold_set_key.csv"
    with key.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["idx", "claim_id", "tool_category"])
        for i, r in enumerate(sample):
            w.writerow([i, r.get("claim_id") or f"F{i:04d}", r["_tool"]])

    # Provenance. The frame file itself is a build artifact under the gitignored
    # `osf_deposit/` tree, so the two CSVs above are archivable but their INPUT is not.
    # Recording the frame's digest and row count is what makes the draw checkable later:
    # PREREGISTRATION.md §7 promises the seed is archived, and a seed without the frame it
    # was applied to does not identify a sample.
    from collections import Counter
    dist = Counter(r["_tool"] for r in sample)
    digest = hashlib.sha256(src.read_bytes()).hexdigest()
    prov = HERE / "gold_set_provenance.json"
    prov.write_text(json.dumps({
        "frame_file": src.name,
        "frame_sha256": digest,
        "frame_rows": len(rows),
        "seed": SEED,
        "n_drawn": len(sample),
        "tool_category_distribution": dict(dist),
    }, indent=2, sort_keys=True) + "\n")

    print(f"Drew {len(sample)} of {len(rows)} flagged claims (seed {SEED}, source {src.name}).")
    print(f"  frame sha256: {digest}")
    print("Tool-category distribution in the gold set:", dict(dist))
    print(f"  blinded coding sheet -> {sheet}")
    print(f"  tool key (keep separate) -> {key}")
    print(f"  provenance -> {prov}")
    print("\nNext: give gold_set_coding_sheet.csv to the two coders with CODEBOOK.md; they fill "
          "coder1_category/coder2_category. Then run compute_kappa.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
