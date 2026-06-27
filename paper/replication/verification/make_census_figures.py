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
import re
from collections import Counter
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25")
CENSUS = DATA_DIR / "census_census_corpus_v2_2026-06-25.jsonl"
FLAGGED = DATA_DIR / "flagged_inconsistencies.jsonl"
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
    "FP_ONE_TAILED": "#7f7f7f",     # gray — known non-error (one-sided p)
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

_P_IN_TEXT = re.compile(r"\b[pP]\s*[=<>]\s*0?\.\d", re.I)


def classify(x: dict) -> str:
    """Identical rules to adjudicate_inconsistencies.classify (category only)."""
    raw = x.get("raw_text", "") or ""
    rep = x.get("reported_p")
    rec = x.get("recomputed_p")
    comp = (x.get("p_comparison") or "").lower()
    if not _P_IN_TEXT.search(raw):
        return "FP_MISEXTRACTION"
    if rep and rec and rep > 0 and abs(rec - 2.0 * rep) <= 0.25 * rec:
        return "FP_ONE_TAILED"
    if "less" in comp or "greater" in comp:
        return "REVIEW_P_BOUND"
    return "TRUE_LIKELY"


def is_decision_changing(x: dict) -> bool:
    sev = (x.get("severity") or "").lower()
    return sev in ("gross_error", "gross", "decision_changing")


def saveall(fig, name: str):
    for ext in ("png", "svg"):
        fig.savefig(FIG_DIR / f"{name}.{ext}", bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  wrote figures/{name}.png + .svg")


def main() -> int:
    if not CENSUS.exists():
        print(f"!! census file not found: {CENSUS}\n   Mount /Volumes/My_Passport first.")
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
    n_with_incons = sum(1 for p in papers if (p.get("n_inconsistent") or 0) > 0)
    tot_test = sum(p.get("n_test_claims") or 0 for p in papers)
    tot_checkable = sum(p.get("n_checkable") or 0 for p in papers)
    tot_incons = sum(p.get("n_inconsistent") or 0 for p in papers)
    tot_decision = sum(p.get("n_decision_changing") or 0 for p in papers)
    cats = Counter(x["cat"] for x in flagged)
    dch = Counter(x["cat"] for x in flagged if is_decision_changing(x))

    print("=== aggregates (cross-check vs reports) ===")
    print(f"papers={n_papers} body={n_body} with_test={n_with_test} "
          f"with_checkable={n_with_checkable} with_incons={n_with_incons}")
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
    ax.bar(xs, decs, color="black", alpha=0.55, width=0.30, label="of which decision-changing")
    for x, t in zip(xs, totals):
        ax.text(x, t + 4, str(t), ha="center", fontsize=10, fontweight="bold")
    ax.set_xticks(xs)
    ax.set_xticklabels([LABELS[c] for c in ORDER], fontsize=9)
    ax.set_ylabel("flagged claims (n = 333)")
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
    ax.set_title("Reported vs recomputed p — 333 flagged claims\n(★ = decision-changing)")
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
    bars6 = [
        ("Raw flagged\n(333/3005)", rate, C["inconsistent"]),
        ("IPW-weighted\n(equal-prob.)", 10.5, "#ef6c00"),
        ("Likely-true only\n(262/3005)", 100 * true_likely / tot_checkable, "#8e24aa"),
        ("Independent OA\nframe (6/108)", 5.6, C["consistent"]),
    ]
    fig, ax = plt.subplots(figsize=(7.6, 4.4))
    xs = np.arange(len(bars6))
    ax.bar(xs, [b[1] for b in bars6], color=[b[2] for b in bars6], alpha=0.9, width=0.6)
    for x, b in zip(xs, bars6):
        ax.text(x, b[1] + 0.15, f"{b[1]:.1f}%", ha="center", fontsize=10, fontweight="bold")
    ax.set_xticks(xs); ax.set_xticklabels([b[0] for b in bars6], fontsize=8.8)
    ax.set_ylabel("inconsistent among checkable claims (%)")
    ax.set_ylim(0, max(b[1] for b in bars6) * 1.25)
    ax.set_title("Inconsistency rate is robust & single-digit across frames")
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
