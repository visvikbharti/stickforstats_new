"""
Phase C — Reproduce a DESeq2 differential-expression analysis on
GSE271517 (synovial sarcoma, Chen Y et al. 2024 Adv Sci).

Contrast: Primary tumor vs Metastasis (sample-level, n=55 vs n=36).

Per the Phase C plan revision (PLAN amendment 2), the reproducibility
check is biological-sanity rather than top-100-overlap, since the paper
does not publish a Primary-vs-Metastasis DEG list (their primary
analysis is NMF-derived 3 subtypes). This script:

  1. Loads raw integer counts from `data/GSE271517_Sample_Counts.csv.gz`
  2. Builds Primary-vs-Metastasis metadata from
     `data/GSE271517_sample_assignment.csv`
  3. Filters low-count genes (drop genes with < 10 counts in < 3 samples)
  4. Runs pyDESeq2 with `~tumor_type` design
  5. Saves top-100 hits (sorted by adjusted p-value) to outputs/
  6. Reports the behavior of 14 canonical marker genes
     (5 SS markers + 8 metastasis-associated + OVOL1)
  7. Computes basic QC stats (per-sample read totals, gene-count
     distribution)

All numerical claims that end up in the manuscript must trace to one of
this script's CSV outputs or its stdout (per Anti-Fabrication Charter
rule 3).
"""

from __future__ import annotations

import csv
import gzip
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

CASE_DIR = Path(__file__).parent.parent
DATA_DIR = CASE_DIR / "data"
OUT_DIR = CASE_DIR / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_counts() -> pd.DataFrame:
    """Load Sample_Counts.csv.gz → DataFrame (genes × samples).

    Returns the raw integer count matrix indexed by Ensembl gene ID,
    with columns being the per-tumor sample titles (T1, T3, T5, …).
    """
    path = DATA_DIR / "GSE271517_Sample_Counts.csv.gz"
    print(f"Loading {path.name} …")
    with gzip.open(path, "rt") as f:
        df = pd.read_csv(f, index_col=0)
    df.index.name = "ensembl_gene_id"
    print(f"  Loaded {df.shape[0]:,} genes × {df.shape[1]} samples")
    return df


def load_metadata() -> pd.DataFrame:
    """Load sample assignment CSV → DataFrame indexed by sample_title."""
    path = DATA_DIR / "GSE271517_sample_assignment.csv"
    df = pd.read_csv(path)
    df = df.set_index("sample_title")
    return df


def build_design(counts: pd.DataFrame, meta: pd.DataFrame) -> pd.DataFrame:
    """Align counts columns ↔ metadata rows; build minimal design table.

    Returns a DataFrame whose index = sample titles in the count matrix
    (same order) and whose columns include `tumor_type` and `patient_id`
    (the two we need for the design + sensitivity analysis).
    """
    sample_titles = list(counts.columns)
    missing = [s for s in sample_titles if s not in meta.index]
    if missing:
        sys.exit(f"FATAL: count-file columns missing from metadata: {missing}")
    design = meta.loc[sample_titles, ["tumor_type", "patient_id", "fusion_gene", "histology"]].copy()
    print(f"  Design table built ({len(design)} samples)")
    print(f"    Tumor type:   {design['tumor_type'].value_counts().to_dict()}")
    print(f"    Fusion gene:  {design['fusion_gene'].value_counts().to_dict()}")
    print(f"    Histology:    {design['histology'].value_counts().to_dict()}")
    return design


def filter_low_count_genes(counts: pd.DataFrame, min_count: int = 10, min_samples: int = 3) -> pd.DataFrame:
    """Keep genes with ≥ min_count reads in ≥ min_samples samples.

    Mirrors the standard pre-DESeq2 filter (e.g. edgeR::filterByExpr at
    a comparable threshold). The paper's TPM>1 filter retained 18,934
    genes; our count-based filter aims at a similar order of magnitude.
    """
    n_passing = (counts >= min_count).sum(axis=1)
    keep = n_passing >= min_samples
    filtered = counts.loc[keep]
    print(f"  Filtered: {keep.sum():,} of {len(counts):,} genes pass (≥{min_count} counts in ≥{min_samples} samples)")
    return filtered


def run_deseq2(counts: pd.DataFrame, design: pd.DataFrame) -> pd.DataFrame:
    """Run pyDESeq2 with the `~tumor-type` design (pyDESeq2 0.4.x rewrites
    underscores in factor names and levels to hyphens — we pre-rename to
    avoid the warning and the contrast-name surprise).

    Reference level: Primary-tumor (so positive log2FC means UP in
    metastasis relative to primary).

    Returns the per-gene DESeq2 results DataFrame with `baseMean`,
    `log2FoldChange`, `lfcSE`, `stat`, `pvalue`, `padj`.
    """
    from pydeseq2.dds import DeseqDataSet
    from pydeseq2.default_inference import DefaultInference
    from pydeseq2.ds import DeseqStats

    print("\n=== Running pyDESeq2 ===")
    counts_t = counts.T  # pyDESeq2 wants samples × genes
    metadata = design.copy()
    # Pre-rename to avoid pyDESeq2 0.4.x's underscore-to-hyphen rewrite warning
    metadata = metadata.rename(columns={"tumor_type": "tumortype"})
    metadata["tumortype"] = metadata["tumortype"].replace({
        "Primary_tumor": "PrimaryTumor",
        "Metastasis": "Metastasis",
    })

    inference = DefaultInference(n_cpus=1)
    dds = DeseqDataSet(
        counts=counts_t,
        metadata=metadata,
        design_factors="tumortype",
        refit_cooks=True,
        inference=inference,
        quiet=True,
    )
    dds.deseq2()
    print(f"  DESeq2 fit complete; {dds.varm['LFC'].shape[0]:,} genes")

    # Contrast: Metastasis vs PrimaryTumor
    # Setting PrimaryTumor as the reference means log2FC > 0 ⇒ UP in metastasis
    stats = DeseqStats(
        dds,
        contrast=["tumortype", "Metastasis", "PrimaryTumor"],
        inference=inference,
        quiet=True,
    )
    stats.summary()
    res = stats.results_df.copy()
    res.index.name = "ensembl_gene_id"
    n_sig = ((res["padj"] < 0.05).sum())
    print(f"  Significant at padj < 0.05: {n_sig:,} genes")
    return res


def annotate_markers(res: pd.DataFrame) -> pd.DataFrame:
    """Add gene-symbol + role columns for the 14 canonical marker genes."""
    markers = pd.read_csv(DATA_DIR / "marker_gene_ensembl_ids.csv").set_index("ensembl_id")
    res = res.copy()
    res["symbol"] = markers["symbol"].reindex(res.index)
    res["marker_role"] = markers["role"].reindex(res.index)
    return res


def canonical_marker_check(res_annotated: pd.DataFrame, counts: pd.DataFrame) -> dict[str, Any]:
    """Per-marker report: expression level + DESeq2 result.

    Returns a dict that's also written to `outputs/canonical_marker_check.md`
    for the C1 checkpoint verdict.
    """
    markers = pd.read_csv(DATA_DIR / "marker_gene_ensembl_ids.csv")
    rows: list[dict[str, Any]] = []
    for _, m in markers.iterrows():
        ens = m["ensembl_id"]
        if ens not in counts.index:
            mean_count = float("nan")
        else:
            mean_count = float(counts.loc[ens].mean())
        if ens in res_annotated.index:
            log2fc = res_annotated.at[ens, "log2FoldChange"]
            padj   = res_annotated.at[ens, "padj"]
            base   = res_annotated.at[ens, "baseMean"]
        else:
            # Filtered out by low-count filter
            log2fc, padj, base = float("nan"), float("nan"), float("nan")
        rows.append({
            "symbol": m["symbol"],
            "ensembl_id": ens,
            "role": m["role"],
            "raw_mean_count": round(mean_count, 1) if not np.isnan(mean_count) else None,
            "deseq_baseMean": round(base, 1) if not np.isnan(base) else None,
            "log2FC_meta_vs_primary": round(log2fc, 3) if not np.isnan(log2fc) else None,
            "padj": float(f"{padj:.3g}") if not np.isnan(padj) else None,
            "passes_lowcount_filter": ens in res_annotated.index,
        })
    return {"marker_table": rows}


def write_marker_report(check: dict[str, Any], path: Path) -> None:
    """Render the C1 marker-check verdict file."""
    rows = check["marker_table"]
    expressed = sum(1 for r in rows if r["raw_mean_count"] is not None and r["raw_mean_count"] >= 5)
    canonical_dir_ok = 0
    direction_table = []
    for r in rows:
        sym = r["symbol"]
        role = r["role"]
        log2fc = r["log2FC_meta_vs_primary"]
        padj = r["padj"]
        if log2fc is None:
            direction = "n/a (filtered out)"
        else:
            sign = "↑" if log2fc > 0 else "↓"
            sig = "**SIG**" if (padj is not None and padj < 0.05) else "ns"
            direction = f"{sign} log2FC={log2fc:+.2f} ({sig}, padj={padj})"

        # Canonical-direction expectation
        if role == "metastasis_prolif":
            expected = "↑ in metastasis"
            canonical_ok = log2fc is not None and log2fc > 0
        elif role == "metastasis_EMT":
            expected = "↑ in metastasis"
            canonical_ok = log2fc is not None and log2fc > 0
        elif role == "metastasis_epithelial":
            expected = "↓ in metastasis"
            canonical_ok = log2fc is not None and log2fc < 0
        else:
            expected = "(SS marker — expression check only)"
            canonical_ok = None

        if canonical_ok:
            canonical_dir_ok += 1

        direction_table.append({
            "symbol": sym,
            "role": role,
            "raw_mean_count": r["raw_mean_count"],
            "log2FC": log2fc,
            "padj": padj,
            "expected": expected,
            "direction_match": canonical_ok,
        })

    n_metastasis_genes = sum(1 for r in rows if r["role"].startswith("metastasis_"))
    n_ss_markers = sum(1 for r in rows if r["role"] == "SS_marker")
    ss_expressed = sum(1 for r in rows if r["role"] == "SS_marker" and r["raw_mean_count"] is not None and r["raw_mean_count"] >= 5)

    md = []
    md.append("# Canonical marker check — C1 evidence\n")
    md.append(f"\nGenerated by `code/phase_c_deseq2_analysis.py`. Contrast: Metastasis vs Primary_tumor (positive log2FC = UP in metastasis).\n")
    md.append("\n## Marker behaviour table\n\n")
    md.append("| Symbol | Role | Mean raw count | log2FC (meta vs primary) | padj | Expected direction | Direction OK? |\n")
    md.append("|---|---|---|---|---|---|---|\n")
    for d in direction_table:
        ok = "✓" if d["direction_match"] is True else ("✗" if d["direction_match"] is False else "—")
        l2fc = f"{d['log2FC']:+.2f}" if d['log2FC'] is not None else "—"
        padj = f"{d['padj']:.2e}" if d['padj'] is not None else "—"
        rmc = d['raw_mean_count'] if d['raw_mean_count'] is not None else "—"
        md.append(f"| {d['symbol']} | {d['role']} | {rmc} | {l2fc} | {padj} | {d['expected']} | {ok} |\n")

    md.append("\n## C1 checkpoint criteria (from PLAN amendment 2)\n")
    md.append(f"\n- **SS markers expressed** (mean raw count ≥ 5 in any sample): **{ss_expressed} / {n_ss_markers}** required ≥ 5/5\n")
    md.append(f"- **Metastasis genes show canonical direction**: **{canonical_dir_ok} / {n_metastasis_genes}** required ≥ 4/8\n")

    overall_pass = (ss_expressed >= 5) and (canonical_dir_ok >= 4)
    md.append(f"\n## C1 verdict: **{'PASS' if overall_pass else 'NEEDS-REVIEW'}**\n")

    path.write_text("".join(md))
    print(f"\n  Wrote {path}")
    print(f"  C1 verdict: {'PASS' if overall_pass else 'NEEDS-REVIEW'} (SS markers expressed: {ss_expressed}/{n_ss_markers}; metastasis genes correct direction: {canonical_dir_ok}/{n_metastasis_genes})")
    return overall_pass


def write_top_hits(res: pd.DataFrame, path: Path, n: int = 100) -> None:
    """Save top-N DEGs sorted by padj."""
    top = res.sort_values("padj").head(n).copy()
    top.to_csv(path)
    n_sig = (top["padj"] < 0.05).sum()
    print(f"  Wrote {path} (top {n}; {n_sig} with padj < 0.05)")


def write_qc_stats(counts: pd.DataFrame, design: pd.DataFrame, path: Path) -> None:
    """Per-sample QC: total reads, n nonzero genes."""
    qc = pd.DataFrame({
        "total_reads": counts.sum(axis=0),
        "nonzero_genes": (counts > 0).sum(axis=0),
        "tumor_type": design["tumor_type"],
    })
    qc.to_csv(path)
    print(f"\n  Wrote {path}")
    print(f"    Total reads per sample: median {qc['total_reads'].median():,.0f}, "
          f"min {qc['total_reads'].min():,}, max {qc['total_reads'].max():,}")
    print(f"    Nonzero-gene count: median {qc['nonzero_genes'].median():,.0f}")


def main() -> int:
    print("=" * 70)
    print("Phase C — DESeq2 reproduction (Primary vs Metastasis)")
    print("Dataset: GSE271517 (Chen Y et al. 2024, Adv Sci 11(41):e2404510)")
    print("=" * 70)

    counts = load_counts()
    metadata = load_metadata()
    design = build_design(counts, metadata)

    # QC pre-filter
    write_qc_stats(counts, design, OUT_DIR / "C_qc_per_sample.csv")

    # Filter low-count genes
    print("\n=== Low-count filter ===")
    counts_filtered = filter_low_count_genes(counts, min_count=10, min_samples=3)

    # Run DESeq2
    res = run_deseq2(counts_filtered, design)
    res_annotated = annotate_markers(res)

    # Save top hits
    print("\n=== Outputs ===")
    write_top_hits(res, OUT_DIR / "C_top100_DEGs.csv")
    res.to_csv(OUT_DIR / "C_full_deseq2_results.csv")

    # C1 marker check
    check = canonical_marker_check(res_annotated, counts_filtered)
    overall_pass = write_marker_report(check, OUT_DIR / "canonical_marker_check.md")

    # Save annotated result for the markers
    marker_only = res_annotated[res_annotated["symbol"].notna()]
    marker_only.to_csv(OUT_DIR / "C_marker_results.csv")
    print(f"  Wrote {OUT_DIR / 'C_marker_results.csv'} (14 marker rows)")

    print("\n" + "=" * 70)
    print(f"Phase C complete. C1 checkpoint: {'PASS' if overall_pass else 'NEEDS-REVIEW'}")
    print("=" * 70)
    return 0 if overall_pass else 1


if __name__ == "__main__":
    sys.exit(main())
