#!/usr/bin/env python3
"""
Phase E -- three-way (naive / Guardian / count-GLM) divergence analysis.

Adjudicates the Guardian-vs-naive verdict flips on GSE271517 against the
field-standard count-based GLMs (DESeq2, edgeR, limma-voom), answering the
reviewer-critical question the manuscript (L205) currently leaves open:

    Does Guardian's rank-based cascade move the differential-expression
    gene list TOWARD the count-GLM standard, or away from it?

Specifically it tests the two manuscript claims with the gold standard:
  * Group A (479 Guardian rescues)  -> are they DESeq2/edgeR-confirmed DE?
  * Group B (74  Guardian rejects)  -> does the count-GLM agree they are NOT DE?

Pure numpy + pandas (Fisher exact, Spearman, kappa, MCC implemented locally)
so the artifact does not depend on a scipy/sklearn ABI match.

Inputs (all indexed by ensembl_gene_id, all on the same 27,221-gene set):
  outputs/D_guardian_vs_naive.csv        Guardian + naive per-gene + category
  outputs/threeway/deseq2_results.csv    canonical R DESeq2
  outputs/threeway/edger_results.csv     edgeR QL F-test
  outputs/threeway/limmavoom_results.csv limma-voom
  outputs/C_full_deseq2_results.csv      pyDESeq2 (reproducibility cross-check)

Outputs:
  outputs/threeway/E_threeway_summary.md
  outputs/threeway/E_threeway_metrics.json
  outputs/threeway/E_gene_level_merged.csv
  outputs/threeway/fig_threeway.png
"""
from __future__ import annotations

import json
import math
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd

OUT = Path("outputs")
TW = OUT / "threeway"
ALPHA = 0.05


# ---------- local statistics (no scipy/sklearn) ----------
def _logC(n: int, k: int) -> float:
    if k < 0 or k > n:
        return float("-inf")
    return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)


def fisher_greater(a: int, b: int, c: int, d: int) -> tuple[float, float]:
    """One-sided (greater) Fisher exact p for [[a,b],[c,d]] + sample odds ratio."""
    N, K, n = a + b + c + d, a + c, a + b
    if N == 0 or K == 0 or n == 0 or (c + d) == 0:
        return float("nan"), 1.0
    denom = _logC(N, n)
    lo = max(0, n - (N - K))
    hi = min(K, n)
    p = sum(math.exp(_logC(K, k) + _logC(N - K, n - k) - denom) for k in range(max(a, lo), hi + 1))
    orr = (a * d) / (b * c) if (b * c) else float("inf")
    return float(orr), min(1.0, p)


def spearman(x: pd.Series, y: pd.Series) -> float:
    return float(np.corrcoef(pd.Series(x).rank(), pd.Series(y).rank())[0, 1])


def sig(series: pd.Series) -> pd.Series:
    """padj/FDR < ALPHA; NaN (untested / independent-filtered) -> not significant."""
    return (series < ALPHA).fillna(False)


def confusion(pred: pd.Series, ref: pd.Series) -> dict:
    """Treat `ref` as the reference-positive label. Return agreement metrics."""
    pred = pred.astype(bool).values
    ref = ref.astype(bool).values
    tp = int(np.sum(pred & ref)); fp = int(np.sum(pred & ~ref))
    fn = int(np.sum(~pred & ref)); tn = int(np.sum(~pred & ~ref))
    N = tp + fp + fn + tn
    sens = tp / (tp + fn) if (tp + fn) else float("nan")
    spec = tn / (tn + fp) if (tn + fp) else float("nan")
    prec = tp / (tp + fp) if (tp + fp) else float("nan")
    f1 = 2 * prec * sens / (prec + sens) if (prec + sens) else float("nan")
    jac = tp / (tp + fp + fn) if (tp + fp + fn) else float("nan")
    po = (tp + tn) / N
    pe = ((tp + fp) * (tp + fn) + (fn + tn) * (fp + tn)) / N ** 2
    kappa = (po - pe) / (1 - pe) if (1 - pe) else 0.0
    den = math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
    mcc = (tp * tn - fp * fn) / den if den else 0.0
    return {
        "TP": tp, "FP": fp, "FN": fn, "TN": tn,
        "sensitivity_recall": round(sens, 4), "specificity": round(spec, 4),
        "precision": round(prec, 4), "F1": round(f1, 4), "jaccard": round(jac, 4),
        "cohen_kappa": round(kappa, 4), "mcc": round(mcc, 4),
    }


def enrich(group_mask: pd.Series, hit: pd.Series, background_mask: pd.Series, label: str) -> dict:
    """Fisher test: is `hit` enriched inside group vs the background pool?"""
    gm = group_mask.values; hv = hit.values; bg = background_mask.values
    a = int(np.sum(gm & hv)); b = int(np.sum(gm & ~hv))
    c = int(np.sum(bg & hv)); d = int(np.sum(bg & ~hv))
    grp_rate = a / (a + b) if (a + b) else float("nan")
    bg_rate = c / (c + d) if (c + d) else float("nan")
    orr, p = fisher_greater(a, b, c, d)
    return {
        "label": label, "n_group": a + b, "group_hits": a,
        "group_rate": round(grp_rate, 4), "background_rate": round(bg_rate, 4),
        "enrichment_ratio": round(grp_rate / bg_rate, 2) if bg_rate else float("nan"),
        "fisher_odds": round(orr, 2) if np.isfinite(orr) else None,
        "fisher_p": float(f"{p:.3e}"),
    }


def main() -> int:
    print("=" * 72)
    print("PHASE E -- three-way DE divergence (naive / Guardian / count-GLM)")
    print("=" * 72)

    gn = pd.read_csv(OUT / "D_guardian_vs_naive.csv").set_index("ensembl_gene_id")
    deseq = pd.read_csv(TW / "deseq2_results.csv").set_index("ensembl_gene_id")
    edger = pd.read_csv(TW / "edger_results.csv").set_index("ensembl_gene_id")
    voom = pd.read_csv(TW / "limmavoom_results.csv").set_index("ensembl_gene_id")
    pydeseq = pd.read_csv(OUT / "C_full_deseq2_results.csv").set_index("ensembl_gene_id")

    genes = gn.index
    deseq = deseq.reindex(genes); edger = edger.reindex(genes); voom = voom.reindex(genes)
    assert deseq["padj"].notna().any(), "DESeq2 reindex failed"

    df = pd.DataFrame(index=genes)
    df["naive_padj"] = gn["naive_adjusted_p"]
    df["guard_padj"] = gn["adjusted_p_value"]
    df["category"] = gn["category"]
    df["cascaded"] = gn["cascaded"]
    df["naive_l2fc"] = gn["naive_log2_fold_change"]
    df["guard_l2fc"] = gn["log2_fold_change"]
    df["deseq_padj"] = deseq["padj"]; df["deseq_l2fc"] = deseq["log2FoldChange"]
    df["edger_fdr"] = edger["FDR"]; df["edger_l2fc"] = edger["logFC"]
    df["voom_fdr"] = voom["adj.P.Val"]; df["voom_l2fc"] = voom["logFC"]
    df["pydeseq_padj"] = pydeseq["padj"].reindex(genes)

    naive_s = sig(df["naive_padj"]); guard_s = sig(df["guard_padj"])
    deseq_s = sig(df["deseq_padj"]); edger_s = sig(df["edger_fdr"]); voom_s = sig(df["voom_fdr"])
    pydeseq_s = sig(df["pydeseq_padj"])
    n_countglm = deseq_s.astype(int) + edger_s.astype(int) + voom_s.astype(int)
    consensus2 = n_countglm >= 2
    consensus3 = n_countglm == 3
    for nm, s in [("naive_sig", naive_s), ("guard_sig", guard_s), ("deseq_sig", deseq_s),
                  ("edger_sig", edger_s), ("voom_sig", voom_s), ("consensus2", consensus2),
                  ("consensus3", consensus3)]:
        df[nm] = s.values
    df.to_csv(TW / "E_gene_level_merged.csv")

    setsz = {k: int(v.sum()) for k, v in [
        ("naive", naive_s), ("guardian", guard_s), ("DESeq2", deseq_s),
        ("edgeR", edger_s), ("limma_voom", voom_s),
        ("countglm_consensus>=2of3", consensus2), ("countglm_consensus=3of3", consensus3)]}
    print("\n[significant-set sizes]"); [print(f"  {k:28s} {v:>6,}") for k, v in setsz.items()]
    print(f"  (DESeq2 NA-padj / independent-filtered: {int(df['deseq_padj'].isna().sum()):,})")

    pyR = confusion(pydeseq_s, deseq_s)
    print(f"\n[pyDESeq2 vs R DESeq2] jaccard={pyR['jaccard']} kappa={pyR['cohen_kappa']} "
          f"(pyDESeq2 sig={int(pydeseq_s.sum())}, R sig={int(deseq_s.sum())})")

    print("\n[agreement with count-GLM reference] (does Guardian move toward the standard?)")
    agree = {}
    for refname, ref in [("DESeq2", deseq_s), ("edgeR", edger_s),
                         ("consensus>=2of3", consensus2), ("consensus=3of3", consensus3)]:
        an = confusion(naive_s, ref); ag = confusion(guard_s, ref)
        agree[refname] = {"naive": an, "guardian": ag}
        better = "GUARDIAN" if ag["mcc"] > an["mcc"] else "naive"
        print(f"  vs {refname:16s}: naive  MCC={an['mcc']:.3f} F1={an['F1']:.3f} kappa={an['cohen_kappa']:.3f} "
              f"recall={an['sensitivity_recall']:.3f}")
        print(f"  {'':19s} guard  MCC={ag['mcc']:.3f} F1={ag['F1']:.3f} kappa={ag['cohen_kappa']:.3f} "
              f"recall={ag['sensitivity_recall']:.3f}  -> closer: {better}")

    gA = df["category"] == "guardian_only"
    gB = df["category"] == "naive_only"
    both = df["category"] == "hit_by_both"
    neither = df["category"] == "neither"
    naive_ns = ~naive_s
    naive_sig_pool = naive_s
    print(f"\n[category sizes] both={int(both.sum())}, guardian_only(A)={int(gA.sum())}, "
          f"naive_only(B)={int(gB.sum())}, neither={int(neither.sum())}")

    A_enr = {ref_nm: enrich(gA, ref, naive_ns & ~gA, f"GroupA rescues confirmed by {ref_nm}")
             for ref_nm, ref in [("DESeq2", deseq_s), ("edgeR", edger_s), ("consensus2", consensus2)]}
    B_enr = {ref_nm: enrich(gB, ~ref, naive_sig_pool & ~gB, f"GroupB rejects called NOT-DE by {ref_nm}")
             for ref_nm, ref in [("DESeq2", deseq_s), ("edgeR", edger_s), ("consensus2", consensus2)]}

    print("\n[Group A -- Guardian rescues confirmed as DE by the count-GLM standard]")
    for r in A_enr.values():
        print(f"  {r['label']:42s}: {r['group_hits']}/{r['n_group']} = {r['group_rate']*100:.1f}% "
              f"(bg {r['background_rate']*100:.1f}%, enrich {r['enrichment_ratio']}x, p={r['fisher_p']})")
    print("[Group B -- Guardian rejects agreed NOT-DE by the count-GLM standard]")
    for r in B_enr.values():
        print(f"  {r['label']:46s}: {r['group_hits']}/{r['n_group']} = {r['group_rate']*100:.1f}% "
              f"(bg {r['background_rate']*100:.1f}%, enrich {r['enrichment_ratio']}x, p={r['fisher_p']})")

    print("\n[DESeq2 DE-rate by verdict category]")
    catrate = {}
    for nm, mk in [("hit_by_both", both), ("guardian_only(A)", gA), ("naive_only(B)", gB), ("neither", neither)]:
        rate = float(deseq_s[mk].mean()); catrate[nm] = round(rate, 4)
        print(f"  {nm:18s}: DESeq2-DE {rate*100:5.1f}%  (n={int(mk.sum())})")

    valid = df["deseq_l2fc"].notna()
    rho_g = spearman(df.loc[valid, "guard_l2fc"], df.loc[valid, "deseq_l2fc"])
    rho_n = spearman(df.loc[valid, "naive_l2fc"], df.loc[valid, "deseq_l2fc"])
    sign_g = float((np.sign(df.loc[valid, "guard_l2fc"]) == np.sign(df.loc[valid, "deseq_l2fc"])).mean())
    sign_n = float((np.sign(df.loc[valid, "naive_l2fc"]) == np.sign(df.loc[valid, "deseq_l2fc"])).mean())
    print(f"\n[effect-size vs DESeq2 log2FC] Spearman: guardian={rho_g:.3f}, naive={rho_n:.3f} | "
          f"sign-agreement: guardian={sign_g*100:.1f}%, naive={sign_n*100:.1f}%")

    metrics = {
        "set_sizes": setsz, "deseq_NA_padj": int(df["deseq_padj"].isna().sum()),
        "pydeseq2_vs_Rdeseq2": pyR, "agreement_with_countglm": agree,
        "groupA_rescue_confirmation": A_enr, "groupB_reject_agreement": B_enr,
        "deseq_DErate_by_category": catrate,
        "effectsize": {"spearman_guardian_vs_deseq": round(rho_g, 4),
                       "spearman_naive_vs_deseq": round(rho_n, 4),
                       "sign_agree_guardian": round(sign_g, 4),
                       "sign_agree_naive": round(sign_n, 4)},
    }
    (TW / "E_threeway_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"\nWrote {TW/'E_threeway_metrics.json'} and {TW/'E_gene_level_merged.csv'}")

    _write_summary_md(metrics, setsz)
    try:
        _make_figure(df, deseq_s, gA, gB, both, neither, A_enr, B_enr, agree)
    except Exception as e:  # matplotlib may share the numpy-ABI issue; numbers already saved
        print(f"[warn] figure generation skipped: {e}")
    return 0


def _write_summary_md(m, setsz):
    A = m["groupA_rescue_confirmation"]["consensus2"]
    B = m["groupB_reject_agreement"]["consensus2"]
    Ad = m["groupA_rescue_confirmation"]["DESeq2"]; Bd = m["groupB_reject_agreement"]["DESeq2"]
    ag2 = m["agreement_with_countglm"]["consensus>=2of3"]
    lines = [
        "# Phase E -- three-way DE divergence: count-GLM adjudication\n",
        "\n**Question:** does Guardian's rank-based cascade move the gene list TOWARD the "
        "count-based GLM standard (DESeq2 / edgeR / limma-voom), or away from it?\n",
        "\n## Significant-set sizes (padj/FDR < 0.05, 27,221 genes)\n\n| Method | Significant |\n|---|---|\n",
    ]
    for k, v in setsz.items():
        lines.append(f"| {k} | {v:,} |\n")
    lines += [
        "\n## Headline 1 -- agreement with the count-GLM consensus (>=2 of 3)\n\n",
        "| Simple method | MCC | F1 | Cohen kappa | recall of consensus |\n|---|---|---|---|---|\n",
        f"| naive t-test | {ag2['naive']['mcc']} | {ag2['naive']['F1']} | {ag2['naive']['cohen_kappa']} | {ag2['naive']['sensitivity_recall']} |\n",
        f"| **Guardian** | {ag2['guardian']['mcc']} | {ag2['guardian']['F1']} | {ag2['guardian']['cohen_kappa']} | {ag2['guardian']['sensitivity_recall']} |\n",
        f"\nCloser to the count-GLM consensus: "
        f"**{'Guardian' if ag2['guardian']['mcc'] > ag2['naive']['mcc'] else 'naive'}** (higher MCC).\n",
        "\n## Headline 2 -- adjudicating the verdict flips with the gold standard\n\n",
        f"**Group A (479 Guardian rescues; naive-NS, Guardian-sig):** "
        f"{A['group_rate']*100:.1f}% are confirmed DE by the count-GLM consensus "
        f"(DESeq2 alone: {Ad['group_rate']*100:.1f}%) vs a background rate of "
        f"{A['background_rate']*100:.1f}% among all naive-non-significant genes "
        f"-- **{A['enrichment_ratio']}x enrichment**, Fisher p={A['fisher_p']}.\n\n",
        f"**Group B (74 Guardian rejects; naive-sig, Guardian-NS):** "
        f"{B['group_rate']*100:.1f}% are agreed NOT-DE by the count-GLM consensus "
        f"(DESeq2 alone: {Bd['group_rate']*100:.1f}%) vs {B['background_rate']*100:.1f}% "
        f"among all naive-significant genes -- **{B['enrichment_ratio']}x enrichment**, "
        f"Fisher p={B['fisher_p']}.\n",
        "\n## DESeq2 DE-rate by verdict category (monotonicity check)\n\n| Category | DESeq2-DE rate |\n|---|---|\n",
    ]
    for k, v in m["deseq_DErate_by_category"].items():
        lines.append(f"| {k} | {v*100:.1f}% |\n")
    es = m["effectsize"]
    lines += [
        "\n## Effect-size concordance with DESeq2 log2FC\n\n",
        f"- Spearman rho: Guardian {es['spearman_guardian_vs_deseq']}, naive {es['spearman_naive_vs_deseq']}\n",
        f"- Sign agreement: Guardian {es['sign_agree_guardian']*100:.1f}%, naive {es['sign_agree_naive']*100:.1f}%\n",
        "\n## Reproducibility cross-check\n\n",
        f"- pyDESeq2 vs canonical R DESeq2: Jaccard {m['pydeseq2_vs_Rdeseq2']['jaccard']}, "
        f"kappa {m['pydeseq2_vs_Rdeseq2']['cohen_kappa']} (faithful port).\n",
    ]
    (TW / "E_threeway_summary.md").write_text("".join(lines))
    print(f"Wrote {TW/'E_threeway_summary.md'}")


def _make_figure(df, deseq_s, gA, gB, both, neither, A_enr, B_enr, agree):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 3, figsize=(15, 4.6))
    cats = [("Hit by\nboth\n(n=%d)" % both.sum(), both, "#444444"),
            ("Guardian\nonly / A\n(n=%d)" % gA.sum(), gA, "#1565c0"),
            ("Naive\nonly / B\n(n=%d)" % gB.sum(), gB, "#c62828"),
            ("Neither\n(n=%d)" % neither.sum(), neither, "#bdbdbd")]
    rates = [100 * float(deseq_s[mk].mean()) for _, mk, _ in cats]
    ax = axes[0]
    ax.bar([c[0] for c in cats], rates, color=[c[2] for c in cats])
    for i, r in enumerate(rates):
        ax.text(i, r + 1.5, f"{r:.1f}%", ha="center", fontsize=10)
    ax.set_ylabel("% confirmed DE by DESeq2"); ax.set_ylim(0, 105)
    ax.set_title("A  Count-GLM corroboration by verdict category")

    ax = axes[1]
    A = A_enr["consensus2"]; B = B_enr["consensus2"]
    labels = ["Group A\nrescues\nconfirmed DE", "Group B\nrejects\nagreed NOT-DE"]
    grp = [A["group_rate"] * 100, B["group_rate"] * 100]
    bg = [A["background_rate"] * 100, B["background_rate"] * 100]
    x = np.arange(2); w = 0.36
    ax.bar(x - w / 2, grp, w, label="verdict-flip group", color="#2e7d32")
    ax.bar(x + w / 2, bg, w, label="background", color="#bdbdbd")
    for i, (g, b) in enumerate(zip(grp, bg)):
        ax.text(i - w / 2, g + 1.5, f"{g:.0f}%", ha="center", fontsize=9)
        ax.text(i + w / 2, b + 1.5, f"{b:.0f}%", ha="center", fontsize=9)
    ax.set_xticks(x); ax.set_xticklabels(labels); ax.set_ylim(0, 105)
    ax.set_ylabel("% agreeing with count-GLM consensus"); ax.legend(fontsize=8)
    ax.set_title("B  Verdict flips adjudicated by the standard")

    ax = axes[2]
    refs = ["DESeq2", "edgeR", "consensus>=2of3", "consensus=3of3"]
    nm = [agree[r]["naive"]["mcc"] for r in refs]
    gm = [agree[r]["guardian"]["mcc"] for r in refs]
    x = np.arange(len(refs)); w = 0.36
    ax.bar(x - w / 2, nm, w, label="naive", color="#c62828")
    ax.bar(x + w / 2, gm, w, label="Guardian", color="#1565c0")
    ax.set_xticks(x); ax.set_xticklabels(["DESeq2", "edgeR", "≥2/3", "3/3"], fontsize=9)
    ax.set_ylabel("MCC vs count-GLM reference"); ax.legend(fontsize=8)
    ax.set_title("C  Agreement with the standard: naive vs Guardian")

    fig.tight_layout()
    fig.savefig(TW / "fig_threeway.png", dpi=150)
    print(f"Wrote {TW/'fig_threeway.png'}")


if __name__ == "__main__":
    raise SystemExit(main())
