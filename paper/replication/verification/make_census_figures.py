#!/usr/bin/env python3
"""
Generate the census data-analysis figures (the plots that were missing).
========================================================================

Reads the per-paper census records and the flagged-inconsistency records from
the external drive and renders a publication-quality figure set into
``paper/replication/verification/figures/``.

Data inputs (drive must be mounted):
  * census_census_corpus_v2_2026-06-25.jsonl   (10,103 per-paper records)
  * flagged_inconsistencies.jsonl              (333 flagged claims)

The flagged claims are categorised with the SAME transparent rules as
``adjudicate_inconsistencies.py`` (FP_MISEXTRACTION / FP_ONE_TAILED /
REVIEW_P_BOUND / TRUE_LIKELY) so the figures agree with FP_VALIDATION_REPORT.

Run:
  .venv-django/bin/python paper/replication/verification/make_census_figures.py
"""
from __future__ import annotations

import json
from collections import Counter
import sys as _sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[3]

# The 3.2 GB raw corpus lives on an external drive, but the DERIVED files these figures need
# (the 10,103-row ledger and the flagged-claim frame) are only ~2 MB and are kept in-tree. Prefer
# the drive when it is mounted, fall back to the local copies otherwise -- the figures must be
# regenerable without the drive, or a correction to the numbers cannot be carried into the plots.
_DRIVE = Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25")
_LOCAL = ROOT / "paper/census_paper/osf_deposit/data"
DATA_DIR = _DRIVE if (_DRIVE / "census_census_corpus_v2_2026-06-25.jsonl").exists() else _LOCAL
CENSUS = DATA_DIR / "census_census_corpus_v2_2026-06-25.jsonl"

# The CORRECTED frame (355 rows) is the tracked one and is the published input from 2026-08-24
# onward; the 333-row pre-correction frame is kept beside it so the re-score has a control.
_IN_TREE_DATA = ROOT / "paper/census_paper/data"
_CORRECTED = _IN_TREE_DATA / "flagged_inconsistencies_corrected.jsonl"
FLAGGED = _CORRECTED if _CORRECTED.exists() else (DATA_DIR / "flagged_inconsistencies.jsonl")
# fetch_stats.json is written next to the corpus on the drive, and shipped next to the
# ledger in-tree. Try every place it is known to live, in preference order.
_FETCH_STATS_CANDIDATES = (
    _DRIVE / "fetch_stats.json",
    Path("/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25/fetch_stats.json"),
    _LOCAL / "fetch_stats.json",
)

FIG_DIR = ROOT / "paper/replication/verification/figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)

# ---- shared style -----------------------------------------------------------
plt.rcParams.update({
    "figure.dpi": 120,
    "savefig.dpi": 200,
    "font.size": 10.5,
    "font.family": "sans-serif",
    "axes.titlesize": 12,
    "axes.titleweight": "bold",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "grid.linewidth": 0.6,
})
C = {
    "TRUE_LIKELY": "#d62728",       # red  — genuine inconsistency
    "REVIEW_P_BOUND": "#ff7f0e",    # orange — ambiguous (p-bound)
    # Was #7f7f7f, the same grey the "of which decision-changing" overlay renders as
    # (black at alpha 0.55), so in Fig 3 a category bar and a legend series were the same colour.
    "FP_ONE_TAILED": "#0097a7",     # teal — known non-error (one-sided p)
    "FP_MISEXTRACTION": "#c7c7c7",  # light gray — extractor artifact (now 0)
    "consistent": "#2e7d32",        # green
    "inconsistent": "#d62728",
    "decision": "#7b1fa2",          # purple — decision-changing
    "accent": "#1565c0",            # MUI blue
}
ORDER = ["TRUE_LIKELY", "REVIEW_P_BOUND", "FP_ONE_TAILED", "FP_MISEXTRACTION"]
LABELS = {
    "TRUE_LIKELY": "Likely-true\ninconsistency",
    "REVIEW_P_BOUND": "Review\n(p-bound)",
    "FP_ONE_TAILED": "False positive\n(one-tailed p)",
    "FP_MISEXTRACTION": "False positive\n(mis-extraction)",
}

# The adjudication rules are IMPORTED, not restated. This file used to carry its own copy under
# a docstring promising it was "identical rules to adjudicate_inconsistencies.classify" -- and on
# 2026-08-24 the two had in fact drifted, because the scientific-notation fix landed in one of
# them. A comment asserting parity is not parity.
_sys.path.insert(0, str(Path(__file__).resolve().parent))
from adjudicate_inconsistencies import classify as _classify_with_reason  # noqa: E402


def classify(x: dict) -> str:
    """The adjudication category only (the canonical rule also returns its reason)."""
    return _classify_with_reason(x)[0]


def is_decision_changing(x: dict) -> bool:
    sev = (x.get("severity") or "").lower()
    return sev in ("gross_error", "gross", "decision_changing")


def _oa_pilot_counts() -> tuple[int, int]:
    """(inconsistent, checkable) for the independent general-OA frame.

    Prefers the ledger on the corpus drive; falls back to the tracked summary so this
    script still runs -- and still carries a correction -- with the drive unmounted. The
    two are cross-checked when both are present, and a disagreement is printed rather
    than silently resolved in favour of either.
    """
    tracked = _IN_TREE_DATA / "oa_pilot_2026-08-25.json"
    summary = json.loads(tracked.read_text())
    counts = (summary["inconsistent"], summary["checkable"])

    ledger = _DRIVE / "census_oa_pilot_2026-06-26.jsonl"
    if ledger.exists():
        recs = [json.loads(line) for line in ledger.read_text().splitlines() if line.strip()]
        body = [r for r in recs if r.get("status") == "parsed_body" or "coverage" in r]
        live = (
            sum((r.get("n_inconsistent") or 0) for r in body),
            sum((r.get("n_checkable") or 0) for r in body),
        )
        if live != counts:
            print(
                f"  NOTE: OA ledger on the drive says {live[0]}/{live[1]} but the tracked "
                f"summary says {counts[0]}/{counts[1]} -- using the LEDGER. Re-run the OA "
                f"arm's summary writer; one of them is stale."
            )
            return live
    return counts


def _clustered_ci(papers, flagged, only_true_likely=False, reps=10000, seed=20260627):
    """Percentile bootstrap CI resampling PAPERS, not claims.

    Claims are not independent: they nest within papers, and the ten most claim-dense papers
    contribute ~30% of all flagged claims, so a claim-level interval understates the uncertainty
    badly. This is the inference PREREGISTRATION.md sec 3.4/5.4 pre-specifies.
    """
    per_paper: dict = {}
    for x in flagged:
        if only_true_likely and x.get("cat") != "TRUE_LIKELY":
            continue
        per_paper[x["pmcid"]] = per_paper.get(x["pmcid"], 0) + 1
    clusters = [(r["pmcid"], r.get("n_checkable") or 0)
                for r in papers if (r.get("n_checkable") or 0) > 0]
    rng = np.random.default_rng(seed)
    idx = np.arange(len(clusters))
    out = np.empty(reps)
    for b in range(reps):
        pick = rng.choice(idx, size=len(clusters), replace=True)
        num = sum(per_paper.get(clusters[i][0], 0) for i in pick)
        den = sum(clusters[i][1] for i in pick)
        out[b] = 100.0 * num / den if den else np.nan
    return tuple(np.percentile(out, [2.5, 97.5]))


def _ipw_inconsistent_rate(papers, flagged) -> float:
    """Inverse-probability-weighted inconsistent-claim rate, recomputed from the same inputs.

    Was a hardcoded 10.5 sitting next to computed bars. The weights are the recorded per-paper
    day volumes (IPW for a 1/V inclusion probability); papers with no recorded weight fall back
    to w = 1. Control: run against the 333-row frame and this returns the published 10.52%.
    """
    # Resolve this input on its own rather than trusting DATA_DIR. DATA_DIR flips to the
    # drive as a whole when the census ledger is there, but fetch_stats.json lives beside
    # the CORPUS on the drive and beside the ledger in-tree -- so a single directory choice
    # is wrong for one of them either way. With the drive mounted this raised
    # FileNotFoundError and no figure past fig5 was written: the same "a generator cannot
    # run in the other environment" defect as 17ff8ac, with the environments swapped.
    stats_path = next(
        (c for c in _FETCH_STATS_CANDIDATES if c.exists()),
        None,
    )
    if stats_path is None:
        raise FileNotFoundError(
            "IPW weights (fetch_stats.json) not found in any of: "
            + ", ".join(str(c) for c in _FETCH_STATS_CANDIDATES)
        )
    weights = json.loads(stats_path.read_text()).get("day_volume_per_paper", {})
    per_paper: dict = {}
    for x in flagged:
        per_paper[x["pmcid"]] = per_paper.get(x["pmcid"], 0) + 1
    num = den = 0.0
    for r in papers:
        if not (r.get("status") == "parsed_body" or "coverage" in r):
            continue
        w = float(weights.get(r.get("pmcid")) or 1.0)
        den += w * (r.get("n_checkable") or 0)
        num += w * per_paper.get(r.get("pmcid"), 0)
    return 100.0 * num / den if den else 0.0


def saveall(fig, name: str):
    for ext in ("png", "svg"):
        fig.savefig(FIG_DIR / f"{name}.{ext}", bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  wrote figures/{name}.png + .svg")


def main() -> int:
    if not CENSUS.exists():
        print(f"!! census file not found: {CENSUS}\n"
              f"   Tried the drive and {_LOCAL}.")
        return 1

    papers = [json.loads(l) for l in CENSUS.read_text().splitlines() if l.strip()]
    flagged = [json.loads(l) for l in FLAGGED.read_text().splitlines() if l.strip()]
    for x in flagged:
        x["cat"] = classify(x)

    # ---- aggregate ----------------------------------------------------------
    n_papers = len(papers)
    n_body = sum(1 for p in papers if p.get("status") == "parsed_body")
    n_readable = sum(1 for p in papers if p.get("coverage") is not None or p.get("n_test_claims", 0) > 0)
    n_with_test = sum(1 for p in papers if (p.get("n_test_claims") or 0) > 0)
    n_with_checkable = sum(1 for p in papers if (p.get("n_checkable") or 0) > 0)
    # DERIVED FROM THE FRAME, NOT THE LEDGER. The ledger's per-paper `n_inconsistent` was
    # written by the ORIGINAL scoring run and still says 333 / 129 papers; the frame loaded above
    # is the corrected 355-row one. Reading the count from the ledger while reading the
    # categories from the frame produced a half-corrected figure -- new adjudication bars under
    # an old headline rate -- which is exactly the failure this correction exists to prevent.
    # The frame is the single source of truth for "which claims are flagged".
    _flag_per_paper: dict = {}
    for _x in flagged:
        _flag_per_paper[_x["pmcid"]] = _flag_per_paper.get(_x["pmcid"], 0) + 1
    n_with_incons = len(_flag_per_paper)
    tot_test = sum(p.get("n_test_claims") or 0 for p in papers)
    tot_checkable = sum(p.get("n_checkable") or 0 for p in papers)
    tot_incons = len(flagged)
    tot_decision = sum(p.get("n_decision_changing") or 0 for p in papers)
    cats = Counter(x["cat"] for x in flagged)
    dch = Counter(x["cat"] for x in flagged if is_decision_changing(x))

    print("=== aggregates (cross-check vs reports) ===")
    print(f"papers={n_papers} body={n_body} with_test={n_with_test} "
          f"with_checkable={n_with_checkable} with_incons={n_with_incons}")
    _ledger_incons = sum(p.get("n_inconsistent") or 0 for p in papers)
    if _ledger_incons != len(flagged):
        print(f"   note: ledger records {_ledger_incons} inconsistent claims, frame carries "
              f"{len(flagged)} -- using the FRAME. (Expected after the 2026-08-24 p-reader "
              f"re-score: 333 -> 355.)")
    print(f"test_claims={tot_test} checkable={tot_checkable} "
          f"inconsistent={tot_incons} decision_changing={tot_decision}")
    print(f"flagged_loaded={len(flagged)} categories={dict(cats)} decision_changing_in_flagged={sum(dch.values())}")
    rate = 100 * tot_incons / tot_checkable
    drate = 100 * tot_decision / tot_checkable
    print(f"inconsistent rate={rate:.1f}%  decision-changing rate={drate:.2f}%")

    # =========================================================================
    # FIG 1 — corpus funnel (paper-level attrition)
    # =========================================================================
    stages = [
        ("PMC IDs enumerated", 10200),
        ("Full-text body fetched", n_body),
        (">=1 extracted test claim", n_with_test),
        (">=1 checkable (recomputable) claim", n_with_checkable),
        (">=1 internal inconsistency", n_with_incons),
    ]
    fig, ax = plt.subplots(figsize=(8.2, 4.2))
    ys = np.arange(len(stages))[::-1]
    vals = [v for _, v in stages]
    bars = ax.barh(ys, vals, color=C["accent"], alpha=0.85, height=0.62)
    for y, (lab, v) in zip(ys, stages):
        pct = 100 * v / 10200
        ax.text(v + 120, y, f"{v:,}  ({pct:.1f}%)", va="center", fontsize=9.5)
    ax.set_yticks(ys)
    ax.set_yticklabels([s for s, _ in stages], fontsize=9.5)
    ax.set_xlim(0, 11800)
    ax.set_xlabel("papers")
    ax.set_title("Corpus funnel — biomedical PMC OA census (2018–2025)")
    ax.grid(axis="y", visible=False)
    saveall(fig, "fig1_corpus_funnel")

    # =========================================================================
    # FIG 2 — headline outcome among checkable claims (claim-level)
    # =========================================================================
    consistent = tot_checkable - tot_incons
    incons_nondec = tot_incons - tot_decision
    fig, ax = plt.subplots(figsize=(8.2, 2.4))
    left = 0
    segs = [
        (consistent, C["consistent"], f"consistent\n{consistent:,} ({100*consistent/tot_checkable:.1f}%)"),
        (incons_nondec, C["inconsistent"], f"inconsistent\n{incons_nondec} ({100*incons_nondec/tot_checkable:.1f}%)"),
        (tot_decision, C["decision"], f"decision-\nchanging\n{tot_decision} ({drate:.1f}%)"),
    ]
    for v, col, lab in segs:
        ax.barh(0, v, left=left, color=col, height=0.5, edgecolor="white")
        if v / tot_checkable > 0.03:
            ax.text(left + v / 2, 0, lab, ha="center", va="center",
                    color="white", fontsize=9, fontweight="bold")
        else:
            ax.annotate(lab, xy=(left + v / 2, 0.26), xytext=(left + v / 2, 0.62),
                        ha="center", fontsize=8.5, color=col,
                        arrowprops=dict(arrowstyle="-", color=col, lw=0.8))
        left += v
    ax.set_xlim(0, tot_checkable)
    ax.set_ylim(-0.5, 1.0)
    ax.set_yticks([])
    ax.set_xlabel("checkable (recomputable) claims")
    ax.set_title(f"Internal-consistency outcome  ·  {tot_checkable:,} checkable claims from "
                 f"{n_with_checkable} papers")
    ax.grid(visible=False)
    saveall(fig, "fig2_headline_outcome")

    # =========================================================================
    # FIG 3 — FP-validation breakdown of the 333 flags
    # =========================================================================
    fig, ax = plt.subplots(figsize=(7.8, 4.6))
    xs = np.arange(len(ORDER))
    totals = [cats.get(c, 0) for c in ORDER]
    decs = [dch.get(c, 0) for c in ORDER]
    ax.bar(xs, totals, color=[C[c] for c in ORDER], alpha=0.9, width=0.62,
           label="all flagged")
    ax.bar(xs, decs, color="#212121", alpha=0.85, width=0.30,
           label="of which decision-changing")
    for x, t in zip(xs, totals):
        ax.text(x, t + 4, str(t), ha="center", fontsize=10, fontweight="bold")
    ax.set_xticks(xs)
    ax.set_xticklabels([LABELS[c] for c in ORDER], fontsize=9)
    # Was a hardcoded "n = 333" sitting above bars that sum to whatever the frame holds. After
    # the re-score they summed to 355 under a label reading 333.
    ax.set_ylabel(f"flagged claims (n = {len(flagged)})")
    ax.set_title("False-positive validation of flagged inconsistencies")
    ax.legend(frameon=False, fontsize=9, loc="upper right")
    ax.set_ylim(0, max(totals) * 1.2)
    ax.grid(axis="x", visible=False)
    ax.annotate("extractor fix:\nmis-extraction 157 → 0",
                xy=(3, 6), xytext=(2.45, max(totals) * 0.62),
                fontsize=8.5, color="#555", ha="center",
                arrowprops=dict(arrowstyle="->", color="#999", lw=0.9))
    saveall(fig, "fig3_fp_validation")

    # =========================================================================
    # FIG 4 — reported vs recomputed p (log-log scatter) — the money plot
    # =========================================================================
    fig, ax = plt.subplots(figsize=(6.6, 6.2))
    floor = 1e-6
    for c in ORDER:
        pts = [x for x in flagged if x["cat"] == c
               and x.get("reported_p") is not None and x.get("recomputed_p") is not None]
        if not pts:
            continue
        rx = np.array([max(p["reported_p"], floor) for p in pts])
        ry = np.array([max(p["recomputed_p"], floor) for p in pts])
        dec = np.array([is_decision_changing(p) for p in pts])
        ax.scatter(rx[~dec], ry[~dec], s=26, c=C[c], alpha=0.7,
                   edgecolors="none", label=f"{c} ({len(pts)})")
        if dec.any():
            ax.scatter(rx[dec], ry[dec], s=80, marker="*", c=C[c],
                       edgecolors="black", linewidths=0.7)
    lims = [floor, 1.0]
    ax.plot(lims, lims, "k-", lw=1, alpha=0.6, label="reported = recomputed")
    ax.plot(lims, [2 * v for v in lims], "k--", lw=0.9, alpha=0.5,
            label="recomputed = 2× reported (one-tailed)")
    ax.axhline(0.05, color="#888", lw=0.7, ls=":")
    ax.axvline(0.05, color="#888", lw=0.7, ls=":")
    ax.text(0.052, floor * 1.4, "α=0.05", fontsize=8, color="#888")
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlim(*lims); ax.set_ylim(*lims)
    ax.set_xlabel("reported p")
    ax.set_ylabel("recomputed p (two-tailed)")
    # Was a hardcoded "333" beside a plot of however many claims the frame actually holds.
    ax.set_title(f"Reported vs recomputed p — {len(flagged)} flagged claims"
                 "\n(★ = decision-changing)")
    ax.legend(frameon=False, fontsize=7.6, loc="lower right")
    ax.grid(alpha=0.25)
    ax.set_aspect("equal")
    saveall(fig, "fig4_reported_vs_recomputed_p")

    # =========================================================================
    # FIG 5 — inconsistency by claim (statistic) type
    # =========================================================================
    by_type = Counter(x.get("claim_type", "?") for x in flagged)
    by_type_true = Counter(x.get("claim_type", "?") for x in flagged if x["cat"] == "TRUE_LIKELY")
    types = [t for t, _ in by_type.most_common()]
    fig, ax = plt.subplots(figsize=(7.6, 4.2))
    xs = np.arange(len(types))
    ax.bar(xs, [by_type[t] for t in types], color=C["accent"], alpha=0.55, width=0.62,
           label="all flagged")
    ax.bar(xs, [by_type_true[t] for t in types], color=C["TRUE_LIKELY"], alpha=0.9, width=0.62,
           label="likely-true")
    for x, t in zip(xs, types):
        ax.text(x, by_type[t] + 2, str(by_type[t]), ha="center", fontsize=9)
    ax.set_xticks(xs)
    ax.set_xticklabels([t.replace("_", "\n") for t in types], fontsize=8.5)
    ax.set_ylabel("flagged claims")
    ax.set_title("Flagged inconsistencies by statistic type")
    ax.legend(frameon=False, fontsize=9)
    ax.grid(axis="x", visible=False)
    saveall(fig, "fig5_by_statistic_type")

    # =========================================================================
    # FIG 6 — robustness / convergence of the rate
    # =========================================================================
    true_likely = cats.get("TRUE_LIKELY", 0)

    # EVERY label and height below is DERIVED. They used to be hardcoded as "333/3005",
    # "262/3005" and 10.5 while the bar heights beside them were computed, so re-running this
    # script after a correction redrew new bars under the old labels -- the figure was being
    # produced from the specification rather than from the execution, which is the same defect
    # class this project keeps finding. The one number that cannot be derived here is the
    # independent-OA arm, which needs a corpus this script does not read; it is named as a
    # constant, with its provenance, so it cannot masquerade as a computed value.
    ipw_rate = _ipw_inconsistent_rate(papers, flagged)

    # Independent general-OA frame. This used to be a hardcoded 5.6/6/108 -- the last literal
    # in the figure -- and it went stale the moment the arm was re-scored on the corrected
    # p-reader. It is now DERIVED: from the OA ledger when the corpus drive is attached, and
    # otherwise from the small tracked summary written beside it, so a correction reaches the
    # figure with or without the drive. Directional only, and reported as such in the manuscript.
    OA_PILOT_NUM, OA_PILOT_DEN = _oa_pilot_counts()
    OA_PILOT_RATE = 100 * OA_PILOT_NUM / OA_PILOT_DEN

    bars6 = [
        (f"Raw flagged\n({len(flagged)}/{tot_checkable})", rate, C["inconsistent"]),
        ("IPW-weighted\n(equal-prob.)", ipw_rate, "#ef6c00"),
        (f"Likely-true only\n({true_likely}/{tot_checkable})",
         100 * true_likely / tot_checkable, "#8e24aa"),
        (f"Independent OA\nframe ({OA_PILOT_NUM}/{OA_PILOT_DEN})", OA_PILOT_RATE, C["consistent"]),
    ]
    # Claims nest within papers -- the ten most claim-dense papers carry ~30% of all flags -- so
    # a claim-level interval would be far too narrow. Resample PAPERS, which is the inference the
    # pre-registration specifies.
    lo, hi = _clustered_ci(papers, flagged, only_true_likely=True)
    yerr = np.zeros((2, len(bars6)))
    likely_idx = 2
    yerr[0, likely_idx] = max(0.0, bars6[likely_idx][1] - lo)
    yerr[1, likely_idx] = max(0.0, hi - bars6[likely_idx][1])

    fig, ax = plt.subplots(figsize=(7.6, 4.4))
    xs = np.arange(len(bars6))
    ax.bar(xs, [b[1] for b in bars6], color=[b[2] for b in bars6], alpha=0.9, width=0.6,
           yerr=yerr, capsize=6, error_kw={"ecolor": "#222", "elinewidth": 1.4})
    for x, b in zip(xs, bars6):
        off = yerr[1, x] + 0.25 if x == likely_idx else 0.15
        ax.text(x, b[1] + off, f"{b[1]:.1f}%", ha="center", fontsize=10, fontweight="bold")
    ax.axhline(10.0, color="#888", lw=0.9, ls=":", zorder=0)
    ax.text(len(bars6) - 0.45, 10.15, "10%", fontsize=8, color="#666", ha="right")
    ax.set_xticks(xs); ax.set_xticklabels([b[0] for b in bars6], fontsize=8.8)
    ax.set_ylabel("inconsistent among checkable claims (%)")
    ax.set_ylim(0, max(b[1] for b in bars6) * 1.25)
    # The title used to assert "robust & single-digit". After the 2026-08-24 re-score three of
    # these four bars are double-digit, and the paper-clustered interval on the likely-true bar
    # crosses 10%, so the old title asserted precisely the claim the data no longer supports.
    # A title is a claim; it has to be derived from the bars like everything else.
    ax.set_title("Inconsistency rate across frames\n"
                 "(likely-true bar: 95% CI, papers as clusters)")
    ax.grid(axis="x", visible=False)
    saveall(fig, "fig6_rate_robustness")

    # =========================================================================
    # FIG 7 — article-type composition of the corpus
    # =========================================================================
    at = Counter(p.get("article_type", "other") or "other" for p in papers)
    items = at.most_common(10)
    fig, ax = plt.subplots(figsize=(7.8, 4.2))
    ys = np.arange(len(items))[::-1]
    ax.barh(ys, [v for _, v in items], color=C["accent"], alpha=0.8, height=0.6)
    for y, (lab, v) in zip(ys, items):
        ax.text(v + 40, y, f"{v:,}", va="center", fontsize=9)
    ax.set_yticks(ys); ax.set_yticklabels([k for k, _ in items], fontsize=9)
    ax.set_xlabel("papers")
    ax.set_title("Corpus composition by article type")
    ax.grid(axis="y", visible=False)
    saveall(fig, "fig7_article_types")

    print(f"\nAll figures written to {FIG_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
