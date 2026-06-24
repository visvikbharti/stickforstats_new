#!/usr/bin/env python3
"""
Check for T04-CONSADAPT (INCONSISTENT_REPORTING adapter) + T06-COVERAGE
(extraction coverage metric + UNVERIFIABLE_EXTRACTION gate).

Created: 2026-06-24 IST. Run in the dedicated venv (consistency_core needs scipy):
    .venv-verify/bin/python paper/replication/verification/check_t04_t06.py

Exits 0 iff every case produces the expected result.
"""
from __future__ import annotations

import importlib
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m

ce = importlib.import_module("core.manuscript.claim_extractor")
ca = importlib.import_module("core.manuscript.consistency_adapter")
eq = importlib.import_module("core.manuscript.extraction_quality")
V = importlib.import_module("core.manuscript.verdicts").Verdict

StatisticalClaim = ce.StatisticalClaim
Extractor = ce.StatisticalClaimExtractor


def claim(cid, **kw):
    return StatisticalClaim(claim_id=cid, location="Results", **kw)


def main() -> int:
    results = []  # (name, ok, detail)

    # ---------------- T04: consistency adapter -> INCONSISTENT_REPORTING ----------------
    # t(38)=2.10 recomputes to p ~= .042.
    base = dict(claim_type="t_statistic", statistic_value=2.10, statistic_raw="2.10",
                p_comparison="equals", df=(38,))
    t04_cases = [
        ("consistent (p=.042)",        dict(p_value=0.042, p_value_raw="0.042"), None),
        ("major inconsistency (p=.001)", dict(p_value=0.001, p_value_raw="0.001"),
                                          (V.INCONSISTENT_REPORTING, "major")),
        ("gross error (p=.60)",        dict(p_value=0.60, p_value_raw="0.60"),
                                          (V.INCONSISTENT_REPORTING, "gross_error")),
        ("not checkable (stat only)",  dict(p_value=None),  None),
    ]
    print("=" * 74); print("T04-CONSADAPT — statcheck -> INCONSISTENT_REPORTING"); print("=" * 74)
    for name, extra, expected in t04_cases:
        c = claim("C_" + name[:4], **{**base, **extra})
        sig = ca.evaluate_consistency(c)
        verdict = sig.as_verdict()
        if expected is None:
            ok = verdict is None
            detail = f"checkable={sig.checkable} consistent={sig.is_consistent} -> verdict={verdict}"
        else:
            exp_v, exp_sev = expected
            ok = (verdict is not None and verdict.verdict == exp_v
                  and sig.severity == exp_sev)
            detail = (f"verdict={verdict.verdict.value if verdict else None} "
                      f"severity={sig.severity} computed_p={sig.computed_p:.4g}")
        results.append((f"T04 {name}", ok, detail))
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {detail}")

    # ---------------- T06: extraction coverage metric ----------------
    print("\n" + "=" * 74); print("T06-COVERAGE — extraction coverage proxy"); print("=" * 74)
    text = ("We found t(38) = 2.10, p = .042. The effect was strong, p < .01. "
            "Group B differed, p = .03. Controls were null, p > .20. Final test p = .001.")
    n_mentions = ce.count_statistical_mentions(text)
    extractor = Extractor()
    two_p = [claim(f"P{i}", claim_type="t_statistic", statistic_value=2.1,
                   p_value=0.04, p_value_raw="0.04") for i in range(2)]
    five_p = [claim(f"Q{i}", claim_type="t_statistic", statistic_value=2.1,
                    p_value=0.04, p_value_raw="0.04") for i in range(5)]
    s_low = extractor.summarize(two_p, full_text=text)
    s_full = extractor.summarize(five_p, full_text=text)
    s_none = extractor.summarize(two_p)  # no text -> coverage None (backward compatible)

    cov_cases = [
        ("denominator counts p-mentions", n_mentions == 5, f"mentions={n_mentions} (expect 5)"),
        ("low coverage flagged (2/5)", s_low.coverage == 0.4 and s_low.low_coverage,
            f"coverage={s_low.coverage} low={s_low.low_coverage}"),
        ("low-coverage warning emitted", any("Low extraction coverage" in w for w in s_low.extraction_warnings),
            f"warnings={len(s_low.extraction_warnings)}"),
        ("full coverage not flagged (5/5)", s_full.coverage == 1.0 and not s_full.low_coverage,
            f"coverage={s_full.coverage} low={s_full.low_coverage}"),
        ("no text -> coverage None (back-compat)", s_none.coverage is None and not s_none.low_coverage,
            f"coverage={s_none.coverage}"),
    ]
    for name, ok, detail in cov_cases:
        results.append((f"T06cov {name}", ok, detail))
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {detail}")

    # ---------------- T06: per-claim UNVERIFIABLE_EXTRACTION gate ----------------
    print("\n" + "=" * 74); print("T06-COVERAGE — UNVERIFIABLE_EXTRACTION gate"); print("=" * 74)
    good = claim("G", claim_type="t_statistic", statistic_value=2.1, p_value=0.04, confidence=0.95)
    garbled = claim("X", claim_type="t_statistic", statistic_value=None, p_value=None, confidence=0.3)
    low_complete = claim("L", claim_type="t_statistic", statistic_value=2.1, p_value=None, confidence=0.30)
    gate_cases = [
        ("reliable claim -> no gate verdict", eq.extraction_gate_verdict(good) is None, "good"),
        ("garbled claim -> UNVERIFIABLE_EXTRACTION",
            getattr(eq.extraction_gate_verdict(garbled), "verdict", None) == V.UNVERIFIABLE_EXTRACTION, "no stat/p"),
        ("below-completeness -> UNVERIFIABLE_EXTRACTION",
            getattr(eq.extraction_gate_verdict(low_complete), "verdict", None) == V.UNVERIFIABLE_EXTRACTION,
            "completeness 0.30 < 0.40"),
    ]
    for name, ok, detail in gate_cases:
        results.append((f"T06gate {name}", ok, detail))
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {detail}")

    n_pass = sum(1 for _, ok, _ in results if ok)
    print("\n" + "=" * 74)
    print(f"T04 + T06 CHECK: {'PASS' if n_pass == len(results) else 'FAIL'} ({n_pass}/{len(results)})")
    print("=" * 74)
    return 0 if n_pass == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
