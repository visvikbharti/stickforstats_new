#!/usr/bin/env python3
"""
END-TO-END demo (tabular): manuscript text -> extract claim -> import data -> auto-link
-> re-analyze -> verdict. The full chain on a clean, linkable case.

Created: 2026-06-24 IST. Run in .venv-verify (needs scipy).
"""
from __future__ import annotations

import importlib
import sys
import tempfile
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.services", BACKEND / "core" / "services"),
               ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m

import numpy as np
from scipy import stats

ce = importlib.import_module("core.manuscript.claim_extractor")
linker = importlib.import_module("core.manuscript.claim_data_linker")
engmod = importlib.import_module("core.manuscript.reanalysis_engine")
vd = importlib.import_module("core.manuscript.verdicts")
dis = importlib.import_module("core.services.data_import_service")
import pandas as pd


def build_table(path: Path):
    rng = np.random.default_rng(7)
    n = 40
    treat = rng.normal(58.0, 8.0, n)
    ctrl = rng.normal(50.0, 8.0, n)
    df = pd.DataFrame({
        "group": ["treatment"] * n + ["control"] * n,
        "age": list(rng.normal(60, 8, n)) + list(rng.normal(61, 8, n)),
        "biomarker": list(treat) + list(ctrl),
    })
    df.to_csv(path, index=False)
    t, p = stats.ttest_ind(treat, ctrl, equal_var=True)
    return df, abs(float(t)), float(p)


def run(manuscript_text: str, df, label: str):
    print("\n" + "-" * 78)
    print(f"CASE: {label}")
    print("manuscript:", manuscript_text)
    # 1. extract claim
    claims = ce.StatisticalClaimExtractor().extract(manuscript_text, section="Results")
    if not claims:
        print("  no claim extracted"); return
    claim = claims[0]
    print(f"  extracted: {claim.claim_type} stat={claim.statistic_value} df={claim.df} p={claim.p_value}")
    # 2. link to data (context = the sentence)
    lr = linker.link_claim_to_table(claim, df, context_text=manuscript_text)
    print(f"  link: {lr.status} (conf {lr.confidence}) — {lr.reason}")
    if lr.status != "linked":
        print(f"  candidates: {lr.candidates}"); return
    # 3. verify
    req = vd.ClaimVerificationRequest(claim=claim, data_spec=lr.data_spec)
    cv = engmod.verify_claim(req)
    print(f"  VERDICT: {cv.verdict.value}  | recomputed {cv.recomputed_test} "
          f"stat={cv.recomputed_statistic:.3f} vs claimed {cv.claimed_statistic} "
          f"(match={cv.statistic_match}, assumptions_ok={cv.assumptions_satisfied})")


def main() -> int:
    with tempfile.TemporaryDirectory() as d:
        csv_path = Path(d) / "trial.csv"
        df_built, t_abs, p = build_table(csv_path)
        # import via the real DataImportService (proves the import path)
        with open(csv_path, "rb") as fh:
            imp = dis.DataImportService().import_file(fh)
        df = imp.dataframe
        print("=" * 78)
        print("END-TO-END (tabular): text -> extract -> import -> link -> re-analyze -> verdict")
        print("=" * 78)
        print(f"imported {imp.n_rows} rows x {imp.n_cols} cols: {[c['name'] for c in imp.columns]}")

        run(f"In a randomized trial of 80 patients, serum biomarker concentration was significantly "
            f"higher in the treatment group than in the control group (t(78) = {t_abs:.2f}, p = {p:.3f}).",
            df, "faithful claim (should VERIFY)")

        run("Serum biomarker concentration was higher in the treatment group than the control group "
            "(t(78) = 8.10, p = 0.001).",
            df, "inflated statistic (should be DISCREPANT)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
