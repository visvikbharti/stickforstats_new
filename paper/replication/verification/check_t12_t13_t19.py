#!/usr/bin/env python3
"""
Control suite for T12-RESOLVER + T13-ENGINE + T19-DECISION — the verdict pipeline.
Drives a real claim + real data through verify_claim() and asserts each of the six
verdict types comes out correctly. Run in the venv (.venv-verify) — needs scipy.

Created: 2026-06-24 IST.
"""
from __future__ import annotations

import csv
import importlib
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.services", BACKEND / "core" / "services"),
               ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m

ce = importlib.import_module("core.manuscript.claim_extractor")
vd = importlib.import_module("core.manuscript.verdicts")
eng = importlib.import_module("core.manuscript.reanalysis_engine")
StatisticalClaim = ce.StatisticalClaim
ClaimDataSpec, ClaimVerificationRequest, Verdict = vd.ClaimDataSpec, vd.ClaimVerificationRequest, vd.Verdict

import numpy as np
from scipy import stats


def iris_groups():
    from sklearn.datasets import load_iris
    d = load_iris()
    return [list(d.data[d.target == k, 0]) for k in (0, 1, 2)]


def wine_xy():
    rows = list(csv.DictReader((ROOT / "paper/replication/data/winequality-red.csv").open(), delimiter=";"))
    return [float(r["alcohol"]) for r in rows], [float(r["quality"]) for r in rows]


def request(claim_kwargs, spec_kwargs):
    claim = StatisticalClaim(location="Results", **claim_kwargs)
    spec = ClaimDataSpec(**spec_kwargs) if spec_kwargs is not None else None
    return ClaimVerificationRequest(claim=claim, data_spec=spec)


def main() -> int:
    groups = iris_groups()
    alcohol, quality = wine_xy()

    # clean normal two-group data for a VERIFIED t-test; compute the ground-truth t via scipy
    rng = np.random.default_rng(0)
    g1 = list(rng.normal(10.0, 2.0, 40)); g2 = list(rng.normal(11.4, 2.0, 40))
    t_true, _ = stats.ttest_ind(g1, g2, equal_var=True)
    t_round = round(float(t_true), 2)

    cases = [
        ("VERIFIED (ANOVA, value reproduces, assumptions OK)",
         dict(claim_id="V1", claim_type="f_statistic", statistic_value=119.26, statistic_raw="119.26",
              p_value=0.001, test_name="one-way ANOVA"),
         dict(groups=groups), Verdict.VERIFIED),
        ("DISCREPANT (ANOVA, value does not reproduce)",
         dict(claim_id="D1", claim_type="f_statistic", statistic_value=60.0, statistic_raw="60.00",
              p_value=0.001, test_name="one-way ANOVA"),
         dict(groups=groups), Verdict.DISCREPANT),
        ("ASSUMPTION_VIOLATED (Pearson on non-normal data; value reproduces)",
         dict(claim_id="A1", claim_type="r_value", statistic_value=0.476, statistic_raw="0.476",
              p_value=0.001, sample_size=1599, test_name="Pearson correlation"),
         dict(x=alcohol, y=quality), Verdict.ASSUMPTION_VIOLATED),
        ("INSUFFICIENT_DATA (no linked dataset)",
         dict(claim_id="I1", claim_type="t_statistic", statistic_value=2.10, statistic_raw="2.10",
              p_value=0.04, df=(38,)),
         None, Verdict.INSUFFICIENT_DATA),
        ("INSUFFICIENT_DATA (no executor: hazard ratio)",
         dict(claim_id="I2", claim_type="hazard_ratio", statistic_value=1.5, statistic_raw="1.5",
              p_value=0.02, test_name="Cox proportional hazards"),
         dict(groups=groups), Verdict.INSUFFICIENT_DATA),
        ("UNVERIFIABLE_EXTRACTION (garbled claim, no stat/p)",
         dict(claim_id="U1", claim_type="t_statistic", statistic_value=None, p_value=None, confidence=0.3),
         dict(groups=groups), Verdict.UNVERIFIABLE_EXTRACTION),
        ("VERIFIED (t-test on clean normal data)",
         dict(claim_id="V2", claim_type="t_statistic", statistic_value=t_round, statistic_raw=f"{t_round:.2f}",
              p_value=0.01, test_name="independent samples t-test"),
         dict(groups=[g1, g2]), Verdict.VERIFIED),
    ]

    print("=" * 78)
    print("T12+T13+T19 verdict-pipeline control suite")
    print("=" * 78)
    n_ok = 0
    for name, ck, sk, expected in cases:
        cv = eng.verify_claim(request(ck, sk))
        ok = cv.verdict == expected
        n_ok += ok
        rec = f"{cv.recomputed_statistic:.4g}" if cv.recomputed_statistic is not None else "-"
        print(f"\n[{'PASS' if ok else 'FAIL'}] {name}")
        print(f"     verdict={cv.verdict.value} (expected {expected.value})  "
              f"recomputed={rec} claimed={cv.claimed_statistic} match={cv.statistic_match} "
              f"assumptions_ok={cv.assumptions_satisfied}")
        if cv.notes:
            print(f"     notes: {cv.notes[0][:96]}")

    print("\n" + "=" * 78)
    print(f"CONTROL SUITE: {'PASS' if n_ok == len(cases) else 'FAIL'} ({n_ok}/{len(cases)})")
    print("=" * 78)
    return 0 if n_ok == len(cases) else 1


if __name__ == "__main__":
    raise SystemExit(main())
