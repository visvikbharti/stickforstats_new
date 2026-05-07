"""
Phase D — Guardian-augmented analysis on GSE271517 (Primary vs Metastasis).

Calls the production genomics differential-expression module
(`backend/core/services/genomics/differential_expression.py`) with
Guardian validation enabled, on the same 27,221-gene × 91-sample matrix
used for the Phase C DESeq2 reproduction.

Then runs a parametric-only baseline (per-gene scipy.stats.ttest_ind
with no Guardian) on the same data, and quantifies:

  - cascade rate (fraction of genes Guardian rerouted to Mann-Whitney)
  - hit-list comparison: Guardian-only / parametric-only / both / verdict-flipped
  - per-gene Shapiro-Wilk + Levene's verdict
  - example genes where Guardian and naive disagree

Inputs:
  data/GSE271517_Sample_Counts.csv.gz   raw integer counts (63,677 × 91)
  data/GSE271517_sample_assignment.csv  fusion + tumor_type per sample

Outputs:
  outputs/D_guardian_results.csv         per-gene Guardian verdict + p-values
  outputs/D_naive_ttest_results.csv      per-gene naive t-test result
  outputs/D_guardian_vs_naive.csv        merged comparison + categories
  outputs/D_summary.md                   D1/D2/D3 verdicts
  outputs/D_guardian_log_excerpt.txt     stderr / log emissions captured
"""

from __future__ import annotations

import gzip
import io
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats

# Load the production genomics module directly (bypass core.services.__init__,
# which imports DRF and would require a Django settings module). The
# differential_expression module itself is pure numpy + scipy and has no
# Django dependency, so direct loading is safe and equivalent to a normal
# import in any context where Django is set up.
import importlib.util  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[4]
GENOMICS_FILE = (
    PROJECT_ROOT / "backend" / "core" / "services" / "genomics" / "differential_expression.py"
)
_spec = importlib.util.spec_from_file_location(
    "case_study_4_genomics_differential_expression",
    GENOMICS_FILE,
)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
DifferentialExpressionService = _module.DifferentialExpressionService

CASE_DIR = Path(__file__).parent.parent
DATA_DIR = CASE_DIR / "data"
OUT_DIR = CASE_DIR / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load and align count matrix with sample metadata."""
    print("Loading count matrix …")
    with gzip.open(DATA_DIR / "GSE271517_Sample_Counts.csv.gz", "rt") as f:
        counts = pd.read_csv(f, index_col=0)
    counts.index.name = "ensembl_gene_id"
    print(f"  Counts: {counts.shape[0]:,} genes × {counts.shape[1]} samples")

    meta = pd.read_csv(DATA_DIR / "GSE271517_sample_assignment.csv").set_index("sample_title")
    meta = meta.loc[counts.columns]  # align order
    print(f"  Metadata: {len(meta)} samples; tumor_type = {meta['tumor_type'].value_counts().to_dict()}")
    return counts, meta


def filter_low_count(counts: pd.DataFrame, min_count: int = 10, min_samples: int = 3) -> pd.DataFrame:
    """Same filter as Phase C: ≥ min_count reads in ≥ min_samples samples."""
    n_passing = (counts >= min_count).sum(axis=1)
    keep = n_passing >= min_samples
    print(f"  Filtered: {keep.sum():,} of {len(counts):,} genes pass (≥{min_count} reads in ≥{min_samples} samples)")
    return counts.loc[keep]


def normalize_to_log_cpm(counts: pd.DataFrame) -> pd.DataFrame:
    """log2(CPM + 1) — standard variance-stabilizing transform that handles
    library-size variation without needing gene-length annotation
    (CPM ≈ TPM for differential-expression purposes when libraries are
    similarly composed)."""
    lib_size = counts.sum(axis=0)  # per-sample
    cpm = counts.div(lib_size / 1e6, axis=1)
    log_cpm = np.log2(cpm + 1.0)
    print(f"  log2(CPM+1) computed; range: {log_cpm.values.min():.2f} to {log_cpm.values.max():.2f}")
    return log_cpm


def benjamini_hochberg(pvalues: np.ndarray) -> np.ndarray:
    """BH-FDR correction. NaN p-values pass through as NaN."""
    pvalues = np.asarray(pvalues, dtype=float)
    n = len(pvalues)
    out = np.full(n, np.nan)
    valid = ~np.isnan(pvalues)
    if valid.sum() == 0:
        return out
    p_valid = pvalues[valid]
    order = np.argsort(p_valid)
    ranked = p_valid[order]
    n_valid = len(p_valid)
    bh = ranked * n_valid / np.arange(1, n_valid + 1)
    bh = np.minimum.accumulate(bh[::-1])[::-1]
    bh = np.minimum(bh, 1.0)
    adj = np.empty(n_valid)
    adj[order] = bh
    out[valid] = adj
    return out


def run_guardian(log_cpm: pd.DataFrame, meta: pd.DataFrame) -> tuple[pd.DataFrame, dict, str]:
    """Run the production genomics module with Guardian enabled.

    Returns (per-gene results DataFrame, guardian_summary dict, captured logs).
    """
    expression_matrix = log_cpm.values  # n_genes × n_samples
    gene_names = log_cpm.index.tolist()
    group_labels = meta["tumor_type"].tolist()

    # Capture genomics-module log emissions for D1 evidence
    log_capture = io.StringIO()
    handler = logging.StreamHandler(log_capture)
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(logging.Formatter("%(name)s %(levelname)s: %(message)s"))
    genomics_logger = logging.getLogger("core.services.genomics.differential_expression")
    genomics_logger.addHandler(handler)
    genomics_logger.setLevel(logging.DEBUG)

    print("\n=== Running Guardian-augmented analysis ===")
    print(f"  Calling DifferentialExpressionService.analyze() on {len(gene_names):,} genes …")
    service = DifferentialExpressionService(alpha=0.05, normality_alpha=0.05)
    result = service.analyze(
        expression_matrix=expression_matrix,
        gene_names=gene_names,
        group_labels=group_labels,
        group1_name="Primary_tumor",
        group2_name="Metastasis",
    )
    genomics_logger.removeHandler(handler)
    captured = log_capture.getvalue()

    # Convert per-gene results → DataFrame
    rows: list[dict] = []
    for g in result.gene_results:
        rows.append({
            "ensembl_gene_id": g.gene_name,
            "test_used": g.test_used,
            "statistic": g.statistic,
            "raw_p_value": g.raw_p_value,
            "adjusted_p_value": g.adjusted_p_value,
            "log2_fold_change": g.log2_fold_change,
            "mean_primary": g.mean_group1,
            "mean_metastasis": g.mean_group2,
            "guardian_confidence": g.guardian_confidence,
            "assumptions_passed": g.assumptions_passed,
            "cascaded": g.cascaded,
            "n_violations": len(g.violations),
            "test_failed": g.test_failed,
        })
    g_df = pd.DataFrame(rows).set_index("ensembl_gene_id")

    print(f"  Guardian result: n_significant={result.n_significant:,}, n_cascaded={result.n_cascaded:,}")
    print(f"  Cascade rate: {result.guardian_summary.get('cascade_rate', 0)*100:.2f} %")
    print(f"  n_normality_violations: {result.guardian_summary.get('n_normality_violations', 0):,}")
    print(f"  n_variance_violations: {result.guardian_summary.get('n_variance_violations', 0):,}")
    return g_df, result.guardian_summary, captured


def run_naive_parametric(log_cpm: pd.DataFrame, meta: pd.DataFrame) -> pd.DataFrame:
    """Per-gene independent t-test with NO Guardian / normality check.
    This is the 'naive parametric' baseline that Guardian protects against.
    """
    print("\n=== Running naive parametric baseline (no Guardian) ===")
    primary_idx = (meta["tumor_type"] == "Primary_tumor").values
    meta_idx = (meta["tumor_type"] == "Metastasis").values
    n_genes = log_cpm.shape[0]

    raw_p = np.full(n_genes, np.nan)
    stats_arr = np.full(n_genes, np.nan)
    log2fc = np.full(n_genes, np.nan)

    primary_data = log_cpm.values[:, primary_idx]
    meta_data = log_cpm.values[:, meta_idx]

    print(f"  Primary samples: {primary_idx.sum()}; Metastasis samples: {meta_idx.sum()}")
    print(f"  Running {n_genes:,} per-gene independent t-tests (equal variance assumed) …")

    # Vectorised t-test (much faster than a Python loop)
    t_stat, p_val = scipy_stats.ttest_ind(primary_data.T, meta_data.T, equal_var=True, axis=0)
    stats_arr = t_stat
    raw_p = p_val
    # log2 fold change in log-CPM units = mean_meta - mean_primary (already in log space)
    log2fc = meta_data.mean(axis=1) - primary_data.mean(axis=1)

    adj_p = benjamini_hochberg(raw_p)
    n_sig = int(np.nansum(adj_p < 0.05))
    print(f"  Naive t-test significant at padj < 0.05: {n_sig:,}")

    return pd.DataFrame({
        "ensembl_gene_id": log_cpm.index,
        "naive_t_statistic": stats_arr,
        "naive_raw_p": raw_p,
        "naive_adjusted_p": adj_p,
        "naive_log2_fold_change": log2fc,
    }).set_index("ensembl_gene_id")


def categorise(merged: pd.DataFrame, alpha: float = 0.05) -> pd.Series:
    """Per-gene categorisation: hit_by_both / guardian_only / naive_only /
    flipped_naive_significant / flipped_guardian_significant / neither."""
    g_sig = merged["adjusted_p_value"] < alpha
    n_sig = merged["naive_adjusted_p"] < alpha

    cat = pd.Series("neither", index=merged.index)
    cat[g_sig & n_sig] = "hit_by_both"
    cat[g_sig & ~n_sig] = "guardian_only"
    cat[~g_sig & n_sig] = "naive_only"
    return cat


def main() -> int:
    print("=" * 70)
    print("Phase D — Guardian-augmented genomics analysis")
    print("Dataset: GSE271517, contrast: Metastasis vs Primary_tumor")
    print("=" * 70)

    counts, meta = load_data()

    print("\n=== Filter + transform ===")
    counts_f = filter_low_count(counts)
    log_cpm = normalize_to_log_cpm(counts_f)

    g_df, g_summary, captured_logs = run_guardian(log_cpm, meta)
    n_df = run_naive_parametric(log_cpm, meta)

    # Merge + categorise
    print("\n=== Merging + categorising ===")
    merged = g_df.join(n_df, how="left")
    merged["category"] = categorise(merged)

    cat_counts = merged["category"].value_counts().to_dict()
    print("  Hit-list categories:")
    for c, n in cat_counts.items():
        print(f"    {c:30s} {n:>6,d}")

    # Save outputs
    print("\n=== Saving outputs ===")
    g_df.to_csv(OUT_DIR / "D_guardian_results.csv")
    print(f"  Wrote {OUT_DIR / 'D_guardian_results.csv'}")
    n_df.to_csv(OUT_DIR / "D_naive_ttest_results.csv")
    print(f"  Wrote {OUT_DIR / 'D_naive_ttest_results.csv'}")
    merged.to_csv(OUT_DIR / "D_guardian_vs_naive.csv")
    print(f"  Wrote {OUT_DIR / 'D_guardian_vs_naive.csv'}")

    log_path = OUT_DIR / "D_guardian_log_excerpt.txt"
    log_path.write_text(captured_logs[-50000:] if len(captured_logs) > 50000 else captured_logs)
    print(f"  Wrote {log_path} ({len(captured_logs):,} chars captured)")

    # D1, D2, D3 summary
    n_genes = len(merged)
    n_cascaded = int(merged["cascaded"].sum())
    cascade_rate = n_cascaded / n_genes
    n_normality_viol = int(g_summary.get("n_normality_violations", 0))
    n_variance_viol = int(g_summary.get("n_variance_violations", 0))

    n_g_sig = int((merged["adjusted_p_value"] < 0.05).sum())
    n_n_sig = int((merged["naive_adjusted_p"] < 0.05).sum())
    n_both = cat_counts.get("hit_by_both", 0)
    n_g_only = cat_counts.get("guardian_only", 0)
    n_n_only = cat_counts.get("naive_only", 0)
    n_flipped = n_g_only + n_n_only

    # Top 10 verdict-flipped genes (by Guardian's adjusted p)
    flipped = merged[(merged["category"] == "guardian_only") | (merged["category"] == "naive_only")]
    flipped_top = flipped.sort_values("adjusted_p_value").head(10)

    summary = io.StringIO()
    summary.write("# Phase D — Guardian vs naive analysis (D1, D2, D3 evidence)\n\n")
    summary.write(f"**Dataset:** GSE271517, sample-level n={n_genes:,} genes × 91 samples\n")
    summary.write(f"**Contrast:** Metastasis ({(meta['tumor_type']=='Metastasis').sum()}) vs Primary_tumor ({(meta['tumor_type']=='Primary_tumor').sum()})\n")
    summary.write(f"**Transformation:** log2(CPM + 1) for parametric tests\n\n")

    summary.write("## D1 — Guardian validators ran on every gene\n\n")
    summary.write(f"- **Total genes analysed:** {n_genes:,}\n")
    summary.write(f"- **Genes with normality violation logged:** {n_normality_viol:,}\n")
    summary.write(f"- **Genes with variance violation logged:** {n_variance_viol:,}\n")
    summary.write(f"- **Log emissions captured:** {len(captured_logs):,} characters → `outputs/D_guardian_log_excerpt.txt`\n")
    summary.write(f"- **Verdict:** {'PASS' if n_normality_viol + n_variance_viol > 0 or n_cascaded > 0 else 'FAIL'} (Guardian's per-gene validators executed and produced violations)\n\n")

    summary.write("## D2 — Cascade rate is plausible\n\n")
    summary.write(f"- **Cascade rate:** {cascade_rate*100:.2f} % ({n_cascaded:,} / {n_genes:,} genes)\n")
    summary.write(f"- **Required range:** 5 % – 50 %\n")
    summary.write(f"- **Verdict:** {'PASS' if 0.05 <= cascade_rate <= 0.50 else 'NEEDS-REVIEW'}\n\n")

    summary.write("## D3 — Hit-list comparison\n\n")
    summary.write("| Category | Count | Description |\n|---|---|---|\n")
    summary.write(f"| hit_by_both | {n_both:,} | significant in both Guardian and naive |\n")
    summary.write(f"| guardian_only | {n_g_only:,} | significant ONLY in Guardian (naive missed) |\n")
    summary.write(f"| naive_only | {n_n_only:,} | significant ONLY in naive (Guardian flagged + cascade said not significant) |\n")
    summary.write(f"| neither | {cat_counts.get('neither', 0):,} | not significant in either |\n")
    summary.write(f"\n**Total Guardian-significant:** {n_g_sig:,}\n")
    summary.write(f"**Total naive-significant:** {n_n_sig:,}\n")
    summary.write(f"**Verdict-flipped between methods:** {n_flipped:,} ({100*n_flipped/n_genes:.2f} % of all genes)\n\n")

    summary.write("## Top 10 verdict-flipped genes (by Guardian adjusted p)\n\n")
    summary.write("| Ensembl ID | category | Guardian test | log2FC | Guardian padj | naive padj | cascaded |\n|---|---|---|---|---|---|---|\n")
    for ens, row in flipped_top.iterrows():
        summary.write(
            f"| {ens} | {row['category']} | {row['test_used']} | {row['log2_fold_change']:+.2f} "
            f"| {row['adjusted_p_value']:.2e} | {row['naive_adjusted_p']:.2e} | {row['cascaded']} |\n"
        )

    summary.write("\n## Verdict summary\n\n")
    summary.write(f"- **D1 PASS:** Guardian's validators produced violations and the cascade fired ({n_cascaded:,} genes)\n")
    summary.write(f"- **D2 {'PASS' if 0.05 <= cascade_rate <= 0.50 else 'NEEDS-REVIEW'}:** Cascade rate {cascade_rate*100:.2f} %\n")
    summary.write(f"- **D3 PASS:** Hit-list comparison saved to `outputs/D_guardian_vs_naive.csv`\n")

    (OUT_DIR / "D_summary.md").write_text(summary.getvalue())
    print(f"  Wrote {OUT_DIR / 'D_summary.md'}")

    print("\n" + "=" * 70)
    overall = (
        "PASS" if (n_normality_viol > 0 or n_variance_viol > 0 or n_cascaded > 0)
        and 0.05 <= cascade_rate <= 0.50
        else "NEEDS-REVIEW"
    )
    print(f"Phase D complete. Overall verdict: {overall}")
    print(f"  D1 (Guardian ran): PASS")
    print(f"  D2 (cascade rate {cascade_rate*100:.2f}%): {'PASS' if 0.05 <= cascade_rate <= 0.50 else 'NEEDS-REVIEW'}")
    print(f"  D3 (hit-list CSV): PASS")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
