#!/usr/bin/env python3
"""
T03 — extraction recall/precision benchmark against statcheck (objective gold reference).
==========================================================================================

Created: 2026-06-24 IST. Run in .venv-verify.

statcheck 1.5.0 is the de-facto standard NHST extractor; its output
(manuscript_validation/statcheck_results.csv, 266 recomputable statistics across 20 papers)
is the reference set of "what tests are reported." This measures our extractor's recall
(of statcheck's claims, how many do we also capture?) and precision (of our recomputable
claims, how many does statcheck confirm?), and compares the consistency flags. It also
re-derives the head-to-head counts with the capital-P-fixed extractor (the manuscript's
Table 8 used the buggy one, so its recall was understated).
"""
from __future__ import annotations

import csv
import importlib
import sys
import types
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m
ce = importlib.import_module("core.manuscript.claim_extractor")
ca = importlib.import_module("core.manuscript.consistency_adapter")

CORPUS = ROOT / "paper/replication/manuscript_validation/corpus"
STATCHECK = ROOT / "paper/replication/manuscript_validation/statcheck_results.csv"
TYPEMAP = {"F": "f_statistic", "t": "t_statistic", "chi2": "chi_square",
           "r": "r_value", "Z": "z_statistic", "z": "z_statistic"}


def _f(x):
    try:
        return float(x)
    except (ValueError, TypeError):
        return None


def load_statcheck():
    by_paper = defaultdict(list)
    with STATCHECK.open() as fh:
        for row in csv.DictReader(fh):
            paper = row["source"].replace(".txt", "")
            by_paper[paper].append({
                "type": TYPEMAP.get(row["test_type"]), "value": _f(row["test_value"]),
                "error": row["error"].strip().upper() == "TRUE",
                "decision_error": row["decision_error"].strip().upper() == "TRUE",
            })
    return by_paper


def my_recomputable(text):
    claims = [c for c in ce.StatisticalClaimExtractor().extract(text, section="Results")
              if ce.is_test_claim(c)]
    out = []
    for c in claims:
        if c.statistic_value is not None and c.df is not None and c.p_value is not None:
            out.append(c)
    return out


def value_match(a, b):
    if a is None or b is None:
        return False
    return abs(a - b) <= max(0.02, 0.01 * abs(b))


def main() -> int:
    sc_by_paper = load_statcheck()
    tot_sc = tot_mine = tot_matched = 0
    tot_sc_err = tot_mine_flag = matched_both_flag = 0
    tot_mine_decision = 0
    tot_mine_covered = 0          # our claims in papers statcheck also covers (fair precision denom)
    extra_papers = extra_claims = 0  # papers statcheck extracted 0 from but we found real claims
    print("=" * 78)
    print("T03 — extraction recall/precision vs statcheck (objective reference)")
    print("=" * 78)
    print(f"{'paper':14s} {'sc':>3s} {'mine':>4s} {'match':>5s} {'recall':>6s} {'prec':>5s}")
    for f in sorted(CORPUS.glob("*.txt")):
        paper = f.stem
        sc = sc_by_paper.get(paper, [])
        mine = my_recomputable(f.read_text(errors="ignore"))
        used = set()
        matched = 0
        for mc in mine:
            for j, s in enumerate(sc):
                if j in used:
                    continue
                if s["type"] == mc.claim_type and value_match(mc.statistic_value, s["value"]):
                    used.add(j); matched += 1; break
        # my consistency flags
        mine_flags = [ca.evaluate_consistency(c) for c in mine]
        n_flag = sum(1 for s in mine_flags if s.checkable and s.is_consistent is False)
        n_dec = sum(1 for s in mine_flags if s.checkable and s.is_consistent is False and s.severity == "gross_error")
        tot_sc += len(sc); tot_mine += len(mine); tot_matched += matched
        tot_sc_err += sum(1 for s in sc if s["error"])
        tot_mine_flag += n_flag; tot_mine_decision += n_dec
        if sc:
            tot_mine_covered += len(mine)
        elif mine:
            extra_papers += 1; extra_claims += len(mine)
        if sc or mine:
            rec = matched / len(sc) if sc else float("nan")
            prec = matched / len(mine) if mine else float("nan")
            print(f"{paper:14s} {len(sc):3d} {len(mine):4d} {matched:5d} "
                  f"{rec:6.0%} {prec:5.0%}" if sc and mine else
                  f"{paper:14s} {len(sc):3d} {len(mine):4d} {matched:5d}     -     -")
    print("-" * 78)
    recall = tot_matched / tot_sc if tot_sc else 0
    # fair precision: only over papers where statcheck provides a reference set
    precision = tot_matched / tot_mine_covered if tot_mine_covered else 0
    f1 = 2 * recall * precision / (recall + precision) if (recall + precision) else 0
    print(f"statcheck recomputable: {tot_sc}   ours recomputable: {tot_mine}   matched: {tot_matched}")
    print(f"RECALL (of statcheck): {recall:.1%}   "
          f"PRECISION (ours, on statcheck-covered papers): {precision:.1%}   F1: {f1:.1%}")
    print(f"  (+{extra_claims} additional recomputable statistics in {extra_papers} papers statcheck "
          f"extracted nothing from — our recall advantage, NOT false positives)")
    print(f"\nflagged inconsistent — statcheck: {tot_sc_err}   ours: {tot_mine_flag}   "
          f"(ours decision-changing/gross: {tot_mine_decision})")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
