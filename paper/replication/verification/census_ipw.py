#!/usr/bin/env python3
"""
Inverse-probability-weighted (equal-probability) re-estimate of the census rates.
=================================================================================

The descriptive census sampled by DAY CLUSTERS: publication days were drawn uniformly at
random, then up to per_day=18 papers were taken per day. Because day volume varies, a paper's
inclusion probability is ~ proportional to 1/(day volume) -- papers published on low-volume days
are over-represented. This is textbook cluster sampling, and the standard correction is
inverse-probability weighting (IPW): weight each paper by its day volume V (recorded per paper in
fetch_stats.json -> day_volume_per_paper). All sampled days had V >= 86 > per_day=18, so the
within-day pick probability is exactly 18/V and w_i ∝ V_i with no capping edge case.

This re-computes the headline rates UNWEIGHTED vs IPW-WEIGHTED. If they agree, the day-clustering
sampling design did NOT materially bias the rates -- the equal-probability estimand is recovered
from the existing corpus without any new fetch. (An independent equal-probability frame -- the PMC
OA file list -- is run separately as an external replication.)

Run: cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
       ../paper/replication/verification/census_ipw.py
"""
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]

# The 3.2 GB raw corpus lives on an external drive, but the DERIVED inputs this script needs are
# ~2 MB and kept in-tree. Prefer the drive when mounted, fall back to the local copies otherwise.
# A generator that can ONLY run with the drive attached is a generator a correction cannot reach:
# the reports it writes then drift from the manuscript and nothing notices.
_DRIVE = Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25")
_LOCAL = ROOT / "paper/census_paper/osf_deposit/data"
CORPUS = Path("/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25")
if not CORPUS.exists():
    CORPUS = _LOCAL
LEDGER = (_DRIVE / "census_census_corpus_v2_2026-06-25.jsonl")
if not LEDGER.exists():
    LEDGER = _LOCAL / "census_census_corpus_v2_2026-06-25.jsonl"

# The ledger's per-paper `n_inconsistent` was written by the ORIGINAL scoring run and still
# says 333. The FRAME is the source of truth for which claims are flagged -- reading the count
# from the ledger while the rest of the paper uses the frame is what produced a half-corrected
# figure set on 2026-08-24.
_CORRECTED_FRAME = ROOT / "paper/census_paper/data/flagged_inconsistencies_corrected.jsonl"
WEIGHTS = CORPUS / "fetch_stats.json"
REPORT = Path(__file__).resolve().parent / "CENSUS_IPW_REPORT_2026-08-24.md"


def _ratio(num: float, den: float) -> float:
    return num / den if den else 0.0


def main() -> int:
    if not LEDGER.exists() or not WEIGHTS.exists():
        print(f"missing ledger ({LEDGER.exists()}) or weights ({WEIGHTS.exists()})")
        return 1
    weights = json.loads(WEIGHTS.read_text()).get("day_volume_per_paper", {})
    recs = [json.loads(line) for line in LEDGER.read_text().splitlines() if line.strip()]
    body = [r for r in recs if r.get("status") == "parsed_body" or "coverage" in r]

    # Per-paper arrays; weight = day volume V (IPW for 1/V inclusion). Papers with no recorded
    # weight (older sampler) fall back to w=1 and are reported as a coverage caveat.
    n_no_weight = sum(1 for r in body if r.get("pmcid") not in weights)
    # Per-paper flagged counts come from the FRAME, not from the ledger's stale n_inconsistent.
    frame_counts: dict = {}
    if _CORRECTED_FRAME.exists():
        for line in _CORRECTED_FRAME.read_text().splitlines():
            if line.strip():
                pid = json.loads(line)["pmcid"]
                frame_counts[pid] = frame_counts.get(pid, 0) + 1
        _ledger_total = sum(r.get("n_inconsistent") or 0 for r in body)
        if _ledger_total != sum(frame_counts.values()):
            print(f"note: ledger records {_ledger_total} inconsistent claims, frame carries "
                  f"{sum(frame_counts.values())} -- using the FRAME.")

    rows = []
    for r in body:
        V = weights.get(r.get("pmcid"))
        w = float(V) if V else 1.0
        n_inc = (frame_counts.get(r.get("pmcid"), 0) if frame_counts
                 else (r.get("n_inconsistent") or 0))
        rows.append((
            w,
            1 if (r.get("n_checkable") or 0) > 0 else 0,   # has >=1 checkable claim
            (r.get("n_checkable") or 0),
            n_inc,
            (r.get("n_decision_changing") or 0),
        ))

    n_body = len(rows)
    # Unweighted
    u_papers_check = sum(x[1] for x in rows)
    u_checkable = sum(x[2] for x in rows)
    u_incons = sum(x[3] for x in rows)
    u_gross = sum(x[4] for x in rows)
    # IPW-weighted
    W = sum(x[0] for x in rows)
    w_papers_check = sum(x[0] * x[1] for x in rows)
    w_checkable = sum(x[0] * x[2] for x in rows)
    w_incons = sum(x[0] * x[3] for x in rows)
    w_gross = sum(x[0] * x[4] for x in rows)

    metrics = [
        ("recomputable-in-text paper rate",
         _ratio(u_papers_check, n_body), _ratio(w_papers_check, W)),
        ("inconsistent claims (of checkable)",
         _ratio(u_incons, u_checkable), _ratio(w_incons, w_checkable)),
        ("decision-changing (of checkable)",
         _ratio(u_gross, u_checkable), _ratio(w_gross, w_checkable)),
    ]

    lines = [
        "# Census robustness: inverse-probability-weighted (equal-probability) re-estimate",
        "",
        "_Generated by `census_ipw.py` over the 10,103-paper post-fix corpus "
        "(2026-06-26). Weights = recorded per-paper day volume (IPW for the day-cluster design)._",
        "",
        f"Body papers: **{n_body}** | with an IPW weight: **{n_body - n_no_weight}** "
        f"(missing weight -> w=1: {n_no_weight}).",
        "",
        "| metric | unweighted (day-clustered) | IPW-weighted (equal-probability) | abs. diff |",
        "|---|---|---|---|",
    ]
    for name, u, w in metrics:
        lines.append(f"| {name} | {u:.2%} | {w:.2%} | {abs(u - w) * 100:.2f} pp |")
    lines += [
        "",
        "## Interpretation",
        "The IPW-weighted estimates recover the equal-probability estimand (each OA paper in the "
        "design-query population weighted equally) from the SAME corpus -- no new fetch, no new "
        "population. If the weighted and unweighted rates agree to within a fraction of a point, the "
        "day-cluster sampling design did not materially bias the headline; the over-representation of "
        "low-volume publication days is corrected and the rate is stable. This is the same-population, "
        "design-based answer to the day-clustering caveat; the PMC OA file-list pilot "
        "(`CENSUS_OA_PILOT_REPORT`) is the independent external replication.",
        "",
        "Caveat: IPW corrects the *day-volume* over-representation under the stated inclusion model "
        "(P(include) ∝ 1/V, exact here because every sampled day had volume > per_day=18). It does "
        "not correct any residual day-selection non-uniformity; the file-list frame addresses that.",
    ]
    REPORT.write_text("\n".join(lines))
    print("\n".join(lines))
    print(f"\nwrote {REPORT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
