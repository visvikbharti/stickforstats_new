#!/usr/bin/env python3
"""
Phase E addendum -- difficulty-matched Group A enrichment + Group B effect-size
evidence, addressing the adversarial review:

  (1) The "~10x" Group A enrichment uses an un-difficulty-matched background
      (all naive-non-significant genes, median naive padj ~0.57) while Group A
      genes are near-threshold (median ~0.07). Re-test against genes with
      COMPARABLE sub-threshold naive evidence (matched naive-padj bands).
  (2) Quantify Group B count-model effect sizes by category (refutes the
      "outlier-dominated false positive" label) and edgeR confirmation.

Reports BOTH one-sided (over-representation) and two-sided Fisher exact p.
Pure numpy/pandas (scipy unusable in this env).
"""
from __future__ import annotations
import json, math, warnings
from pathlib import Path
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd

TW = Path("outputs/threeway")


def _logC(n, k):
    if k < 0 or k > n:
        return float("-inf")
    return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)


def _hyper_pmf(K, NK, n):
    """vector of (k, logpmf) over support for drawing n from N=K+NK with K successes."""
    N = K + NK
    lo, hi = max(0, n - NK), min(K, n)
    denom = _logC(N, n)
    return [(k, _logC(K, k) + _logC(NK, n - k) - denom) for k in range(lo, hi + 1)]


def fisher(a, b, c, d):
    """Return (odds, p_one_sided_greater, p_two_sided) for [[a,b],[c,d]]."""
    K, NK, n = a + c, b + d, a + b
    if K == 0 or NK == 0 or n == 0 or (c + d) == 0:
        return float("nan"), float("nan"), float("nan")
    pmf = _hyper_pmf(K, NK, n)
    p_obs = next(lp for k, lp in pmf if k == a)
    one = sum(math.exp(lp) for k, lp in pmf if k >= a)
    two = sum(math.exp(lp) for k, lp in pmf if lp <= p_obs + 1e-7)
    orr = (a * d) / (b * c) if (b * c) else float("inf")
    return float(orr), min(1.0, one), min(1.0, two)


def enrich(group, hit, bg):
    a = int((group & hit).sum()); b = int((group & ~hit).sum())
    c = int((bg & hit).sum()); d = int((bg & ~hit).sum())
    orr, p1, p2 = fisher(a, b, c, d)
    gr = a / (a + b) if (a + b) else float("nan")
    br = c / (c + d) if (c + d) else float("nan")
    return dict(group_hits=a, n_group=a + b, group_rate=round(gr, 4),
                bg_hits=c, n_bg=c + d, bg_rate=round(br, 4),
                enrichment=round(gr / br, 2) if br else float("nan"),
                fisher_p_onesided=float(f"{p1:.3e}"), fisher_p_twosided=float(f"{p2:.3e}"))


def main():
    df = pd.read_csv(TW / "E_gene_level_merged.csv").set_index("ensembl_gene_id")
    for col in ["naive_sig", "guard_sig", "deseq_sig", "edger_sig", "voom_sig", "consensus2", "consensus3"]:
        df[col] = df[col].astype(str).isin(["True", "TRUE", "T"])
    cat = df["category"]
    gA = cat == "guardian_only"; gB = cat == "naive_only"
    neither = cat == "neither"; both = cat == "hit_by_both"
    deseq = df["deseq_sig"]; edger = df["edger_sig"]; cons2 = df["consensus2"]

    out = {}
    print("=" * 72); print("DIFFICULTY-MATCHED GROUP A ENRICHMENT (vs naive padj)"); print("=" * 72)
    print(f"Group A median naive padj   : {df.loc[gA,'naive_padj'].median():.3f}")
    print(f"neither median naive padj   : {df.loc[neither,'naive_padj'].median():.3f}")
    print(f"naive-NS universe (neither+A): n={int((neither|gA).sum())}, "
          f"DESeq2-DE rate={float(deseq[neither|gA].mean())*100:.2f}%")

    # cumulative near-threshold bands, Group A vs same-band neither
    print("\n[Group A vs same-band 'neither' genes, DESeq2 confirmation]")
    bands = [(0.05, 0.10), (0.05, 0.20), (0.05, 0.57), (0.05, 1.01)]
    band_rows = []
    for lo, hi in bands:
        inb = (df["naive_padj"] >= lo) & (df["naive_padj"] < hi)
        r = enrich(gA & inb, deseq, neither & inb)
        band_rows.append({"band": f"[{lo},{hi})", **r})
        print(f"  naive padj [{lo},{hi}): A {r['group_hits']}/{r['n_group']}={r['group_rate']*100:.1f}% "
              f"vs neither {r['bg_rate']*100:.1f}%  -> {r['enrichment']}x "
              f"(1-sided p={r['fisher_p_onesided']}, 2-sided p={r['fisher_p_twosided']})")
    out["groupA_difficulty_matched"] = band_rows

    # genome-background reference (the original 10x) for contrast
    r10 = enrich(gA, deseq, neither)
    print(f"\n  [contrast] Group A vs ALL 'neither' (un-matched): {r10['enrichment']}x "
          f"(1-sided p={r10['fisher_p_onesided']}, 2-sided p={r10['fisher_p_twosided']})")
    out["groupA_unmatched_vs_neither"] = r10
    frac_band = float(((df["naive_padj"] >= 0.05) & (df["naive_padj"] < 0.10) & gA).sum()) / int(gA.sum())
    print(f"  fraction of Group A in [0.05,0.10): {frac_band*100:.1f}%")
    out["groupA_frac_in_0.05_0.10"] = round(frac_band, 4)

    print("\n" + "=" * 72); print("GROUP B EFFECT-SIZE EVIDENCE (count model sees real, large effects)"); print("=" * 72)
    # DESeq2 |log2FC| by category + %|LFC|>=1
    es = {}
    for nm, m in [("hit_by_both", both), ("guardian_only(A)", gA), ("naive_only(B)", gB), ("neither", neither)]:
        l2 = df.loc[m, "deseq_l2fc"].abs().dropna()
        es[nm] = {"median_abs_deseq_l2fc": round(float(l2.median()), 3),
                  "pct_abs_l2fc_ge1": round(float((l2 >= 1).mean()) * 100, 1), "n": int(m.sum())}
        print(f"  {nm:18s}: median |DESeq2 log2FC|={es[nm]['median_abs_deseq_l2fc']:.2f}, "
              f"%|log2FC|>=1={es[nm]['pct_abs_l2fc_ge1']}%  (n={es[nm]['n']})")
    out["groupB_effectsize_by_category"] = es

    # Group B confirmation by each count model
    print("\n[Group B (74 'rejects') called DE by each count model]")
    gb_conf = {}
    for nm, s in [("DESeq2", deseq), ("edgeR", edger), ("consensus>=2of3", cons2)]:
        k = int((gB & s).sum()); gb_conf[nm] = {"de": k, "n": int(gB.sum()), "pct": round(100 * k / int(gB.sum()), 1)}
        print(f"  {nm:16s}: {k}/{int(gB.sum())} = {gb_conf[nm]['pct']}% called DE")
    out["groupB_called_DE"] = gb_conf
    # naive-scale vs count-scale |log2FC| for Group B (the Fig 5B mislabel)
    out["groupB_naive_scale_median_abs_l2fc"] = round(float(df.loc[gB, "naive_l2fc"].abs().median()), 3)
    print(f"  Group B naive-scale median |log2FC| (Fig 5B figure) = {out['groupB_naive_scale_median_abs_l2fc']:.2f} "
          f"vs DESeq2-scale {es['naive_only(B)']['median_abs_deseq_l2fc']:.2f}")

    # two-sided recomputation of the headline Group B 'not-DE' enrichment (disclosure)
    print("\n[Group B not-DE enrichment, two-sided disclosure]")
    for nm, s in [("DESeq2", deseq), ("consensus>=2of3", cons2)]:
        r = enrich(gB, ~s, df["naive_sig"] & ~gB)
        print(f"  vs {nm:16s}: {r['enrichment']}x  1-sided p={r['fisher_p_onesided']}, 2-sided p={r['fisher_p_twosided']}")
        out.setdefault("groupB_notDE_enrichment", {})[nm] = r

    (TW / "E_difficulty_matched.json").write_text(json.dumps(out, indent=2))
    print(f"\nWrote {TW/'E_difficulty_matched.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
