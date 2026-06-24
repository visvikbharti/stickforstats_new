#!/usr/bin/env python3
"""
verify — command-line manuscript statistics verifier (T24-lite standalone surface).
=====================================================================================

Created: 2026-06-24 IST. The "separate surface" over the shared verification-core
(verify_pipeline.verify_manuscript). Run in .venv-verify.

    verify_cli.py PAPER.txt [--data DATA.csv] [--json]

Given a manuscript text file (and optionally a single data table), it extracts every
statistical claim, re-runs the authors' tests where data are linkable, audits assumptions,
and prints a per-claim verdict + a paper-level verification profile. No raw data -> the
honest INSUFFICIENT_DATA verdict (with the statcheck consistency signal still reported).
"""
from __future__ import annotations

import argparse
import importlib
import json
import sys
import types
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3] / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.services", BACKEND / "core" / "services"),
               ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m

vp = importlib.import_module("core.manuscript.verify_pipeline")


def _load_data(path: str):
    dis = importlib.import_module("core.services.data_import_service")
    with open(path, "rb") as fh:
        imp = dis.DataImportService().import_file(fh)
    if not imp.success:
        raise SystemExit(f"could not import data file: {imp.errors}")
    return imp.dataframe


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify the statistics reported in a manuscript.")
    ap.add_argument("paper", help="manuscript text file (.txt)")
    ap.add_argument("--data", default=None, help="optional single data table (.csv/.tsv/.xlsx/...)")
    ap.add_argument("--json", action="store_true", help="emit the full profile as JSON")
    args = ap.parse_args()

    text = Path(args.paper).read_text(errors="ignore")
    df = _load_data(args.data) if args.data else None
    prof = vp.verify_manuscript(text, dataframe=df, full_text=text)

    if args.json:
        print(json.dumps(prof.to_dict(), indent=2, default=str))
        return 0

    print("=" * 78)
    print(f"VERIFICATION REPORT — {Path(args.paper).name}"
          f"{'  (+data: ' + Path(args.data).name + ')' if args.data else '  (no data supplied)'}")
    print("=" * 78)
    print(f"claims found        : {prof.n_claims}")
    print(f"verdict distribution: {prof.verdict_distribution}")
    print(f"verifiability rate  : {prof.verifiability_rate:.0%}"
          f"   (fraction with data we could actually re-run)")
    cov = "n/a" if prof.coverage is None else f"{prof.coverage:.0%}"
    print(f"extraction coverage : {cov}{'  [LOW — claims may have been missed]' if prof.low_coverage else ''}")
    print(f"internally inconsistent (statcheck) : {prof.n_inconsistent_reporting}")
    print("-" * 78)
    for cv in prof.claim_verdicts:
        rec = f"recomputed={cv.recomputed_statistic:.3f}" if cv.recomputed_statistic is not None else ""
        print(f"  {cv.claim_id} [{cv.verdict.value:24s}] claimed={cv.claimed_statistic} {rec}")
        for nte in cv.notes:
            print(f"        - {nte[:96]}")
    print("-" * 78)
    print("NOTE:", prof.certify_note)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
