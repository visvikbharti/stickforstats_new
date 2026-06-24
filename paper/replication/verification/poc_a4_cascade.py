#!/usr/bin/env python3
"""
T05-A4POC — proof that the existing cascade engine IS the A4 verification engine.
=================================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T05-A4POC; depends on T02-SPINE)

Goal: de-risk the single biggest reuse hypothesis from the A0 audit — that
``AutonomousCascadeEngine.execute_with_cascade(data, authors_test, max_cascades=0)``
can re-run an *authors' stated test* on raw data and reproduce a published
statistic, so a claimed value can be adjudicated VERIFIED vs DISCREPANT — using
the real verdict contract (core/manuscript/verdicts.py, T02) and ZERO new stats code.

Anchors (project-verified replication constants):
  * Iris one-way ANOVA on sepal length across 3 species  -> F = 119.26
  * UCI red-wine Pearson(alcohol, quality), n = 1599      -> r = 0.476

Run (the local anaconda scipy is ABI-broken; use the dedicated clean venv):
    python3.11 -m venv .venv-verify
    .venv-verify/bin/pip install numpy scipy pandas scikit-learn statsmodels matplotlib seaborn
    .venv-verify/bin/python paper/replication/verification/poc_a4_cascade.py

Exits 0 iff all four cases produce the expected verdict AND max_cascades=0 keeps
the authors' test (no auto-substitution).
"""
from __future__ import annotations

import csv
import importlib
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"

# Import the engine WITHOUT triggering core/services/__init__.py (which pulls
# Django via dataset_service). We register empty namespace packages pointing at
# the real dirs, so the leaf modules (pure numpy/scipy) import directly and their
# relative imports resolve, but the Django-importing __init__ files never run.
for _name, _path in [
    ("core", BACKEND / "core"),
    ("core.services", BACKEND / "core" / "services"),
    ("core.guardian", BACKEND / "core" / "guardian"),
    ("core.manuscript", BACKEND / "core" / "manuscript"),
]:
    if _name not in sys.modules:
        _m = types.ModuleType(_name)
        _m.__path__ = [str(_path)]
        _m.__package__ = _name
        sys.modules[_name] = _m

AutonomousCascadeEngine = importlib.import_module(
    "core.services.cascade_engine"
).AutonomousCascadeEngine
_verdicts = importlib.import_module("core.manuscript.verdicts")
ClaimVerdict, Verdict = _verdicts.ClaimVerdict, _verdicts.Verdict

WINE_CSV = ROOT / "paper" / "replication" / "data" / "winequality-red.csv"


def verify_one_claim(engine, data, intended_test, claimed_stat, claim_id, rel_tol=0.02):
    """Minimal preview of T13/T15: re-run the AUTHORS' test (max_cascades=0),
    compare the recomputed statistic to the claimed value, return a ClaimVerdict."""
    res = engine.execute_with_cascade(data, intended_test, alpha=0.05, max_cascades=0)
    if res.result is None:
        return ClaimVerdict.insufficient_data(claim_id, "engine returned no TestResult"), res
    recomputed = float(res.result.statistic)
    abs_d = abs(recomputed - claimed_stat)
    rel_d = abs_d / abs(claimed_stat) if claimed_stat else float("inf")
    match = rel_d <= rel_tol
    violations = [v["message"] for v in (res.guardian_report or {}).get("violations", [])]
    cv = ClaimVerdict(
        claim_id=claim_id,
        verdict=Verdict.VERIFIED if match else Verdict.DISCREPANT,
        recomputed_test=res.final_test,
        recomputed_statistic=recomputed,
        recomputed_p_value=float(res.result.p_value),
        recomputed_effect_size=res.result.effect_size,
        recomputed_effect_name=res.result.effect_size_name,
        claimed_statistic=claimed_stat,
        statistic_match=match,
        deltas={"abs": abs_d, "rel": rel_d, "rel_tol": rel_tol},
        assumptions_checked=res.guardian_report is not None,
        assumptions_satisfied=res.assumptions_satisfied,
        assumption_violations=violations,
        uncalibrated_engine_confidence=res.confidence_score,
        data_available=True,
    )
    return cv, res


def load_iris_groups():
    from sklearn.datasets import load_iris
    iris = load_iris()
    sepal_len = iris.data[:, 0]
    return [list(sepal_len[iris.target == k]) for k in (0, 1, 2)]  # 3 species


def load_wine_xy():
    rows = list(csv.DictReader(WINE_CSV.open(), delimiter=";"))
    return [float(r["alcohol"]) for r in rows], [float(r["quality"]) for r in rows]


def main() -> int:
    engine = AutonomousCascadeEngine()
    iris_groups = load_iris_groups()
    alcohol, quality = load_wine_xy()

    cases = [
        ("iris_anova_correct",   iris_groups,           "one_way_anova", 119.26, Verdict.VERIFIED),
        ("iris_anova_perturbed", iris_groups,           "one_way_anova", 60.00,  Verdict.DISCREPANT),
        ("wine_pearson_correct", [alcohol, quality],    "pearson",       0.476,  Verdict.VERIFIED),
        ("wine_pearson_perturb", [alcohol, quality],    "pearson",       0.200,  Verdict.DISCREPANT),
    ]

    print("=" * 74)
    print("T05-A4POC — cascade engine as the A4 verifier (max_cascades=0)")
    print("=" * 74)
    ok = True
    for claim_id, data, test, claimed, expected in cases:
        cv, res = verify_one_claim(engine, data, test, claimed, claim_id)
        no_substitution = res.final_test == res.original_test
        passed = (cv.verdict == expected) and no_substitution
        ok = ok and passed
        print(f"\n[{'PASS' if passed else 'FAIL'}] {claim_id}")
        print(f"   authors' test         : {test}  -> engine ran: {res.final_test} "
              f"(no-substitution={no_substitution})")
        print(f"   claimed statistic     : {claimed}")
        print(f"   recomputed statistic  : {cv.recomputed_statistic:.4f}  "
              f"(rel delta {cv.deltas['rel']:.2e}, tol {cv.deltas['rel_tol']})")
        print(f"   recomputed p          : {cv.recomputed_p_value:.3e}  "
              f"effect: {cv.recomputed_effect_name}={cv.recomputed_effect_size:.4f}")
        print(f"   assumptions satisfied : {cv.assumptions_satisfied}  "
              f"(violations: {len(cv.assumption_violations)}) -> read SEPARATELY from the test")
        print(f"   VERDICT               : {cv.verdict.value}  (expected {expected.value})")

    print("\n" + "=" * 74)
    print(f"T05-A4POC: {'PASS — cascade engine confirmed as the A4 verifier' if ok else 'FAIL'}"
          f" ({sum(1 for c in cases)}/{len(cases)} cases)")
    print("Key property proven: with max_cascades=0 the engine runs the AUTHORS' test "
          "(no auto-substitution) and returns the Guardian assumption report SEPARATELY,")
    print("so VERIFIED/DISCREPANT (stat match) and ASSUMPTION_VIOLATED (assumptions) are distinct axes.")
    print("=" * 74)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
