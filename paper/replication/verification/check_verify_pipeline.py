#!/usr/bin/env python3
"""
Check the verification-core entry point verify_manuscript() — a whole paper -> a paper-level
verification profile. Run in .venv-verify. Created: 2026-06-24 IST.
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
import pandas as pd
from scipy import stats

vp = importlib.import_module("core.manuscript.verify_pipeline")
dis = importlib.import_module("core.services.data_import_service")


def main() -> int:
    rng = np.random.default_rng(7)
    n = 40
    treat = rng.normal(58.0, 8.0, n); ctrl = rng.normal(50.0, 8.0, n)
    df = pd.DataFrame({"group": ["treatment"] * n + ["control"] * n,
                       "age": list(rng.normal(60, 8, n)) + list(rng.normal(61, 8, n)),
                       "biomarker": list(treat) + list(ctrl)})
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "t.csv"; df.to_csv(p, index=False)
        with open(p, "rb") as fh:
            imp = dis.DataImportService().import_file(fh)
    t_bio = abs(float(stats.ttest_ind(treat, ctrl, equal_var=True)[0]))

    # a 2-claim manuscript: one verifiable against the data, one internally inconsistent +
    # not linkable (no matching column) -> INSUFFICIENT_DATA but flagged INCONSISTENT_REPORTING.
    text = (
        f"Biomarker concentration was higher in the treatment group than in controls "
        f"(t(78) = {t_bio:.2f}, p = 0.005). "
        f"A subsequent subgroup analysis reported a strong association (t(20) = 2.10, p = 0.600)."
    )

    prof = vp.verify_manuscript(text, dataframe=imp.dataframe, full_text=text)

    print("=" * 78)
    print("verify_manuscript() — paper-level verification profile")
    print("=" * 78)
    print(f"claims: {prof.n_claims}  verdicts: {prof.verdict_distribution}")
    print(f"verifiability_rate: {prof.verifiability_rate}  coverage: {prof.coverage}  "
          f"inconsistent_reporting: {prof.n_inconsistent_reporting}")
    for cv in prof.claim_verdicts:
        rec = f"{cv.recomputed_statistic:.3f}" if cv.recomputed_statistic is not None else "-"
        print(f"  {cv.claim_id}: {cv.verdict.value:24s} claimed={cv.claimed_statistic} recomputed={rec}")
        for nte in cv.notes:
            print(f"      - {nte[:92]}")
    print(f"\ncertify note: {prof.certify_note[:120]}...")

    # assertions
    by_id = {cv.claim_id: cv for cv in prof.claim_verdicts}
    verds = [cv.verdict.value for cv in prof.claim_verdicts]
    ok = (
        prof.n_claims == 2
        and "VERIFIED" in verds                 # the biomarker claim
        and "INSUFFICIENT_DATA" in verds        # the unlinkable subgroup claim
        and prof.n_inconsistent_reporting == 1  # the t(20)=2.10,p=.60 internal inconsistency
    )
    print("\n" + "=" * 78)
    print(f"VERIFY-PIPELINE CHECK: {'PASS' if ok else 'FAIL'}")
    print("=" * 78)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
