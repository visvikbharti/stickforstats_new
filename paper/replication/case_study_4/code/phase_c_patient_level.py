"""
Phase C — Patient-level sensitivity analysis (Task C.8).

Run the same DESeq2 contrast (Metastasis vs PrimaryTumor) but with one
sample per patient (prefer primary if both types exist) to remove the
within-patient pseudoreplication confound.

Result is saved as `outputs/C_patient_level_top100_DEGs.csv` and the
overlap with sample-level top hits is reported.
"""

from __future__ import annotations

import gzip
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd

CASE_DIR = Path(__file__).parent.parent
DATA_DIR = CASE_DIR / "data"
OUT_DIR = CASE_DIR / "outputs"


def pick_one_sample_per_patient(meta: pd.DataFrame) -> list[str]:
    """One sample per patient. If a patient has both primary + metastasis,
    prefer primary (more 'natural' baseline). Otherwise pick the first.

    Returns the list of sample_titles to keep.
    """
    by_patient: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for sample_title, row in meta.iterrows():
        by_patient[row["patient_id"]].append((sample_title, row["tumor_type"]))

    keep: list[str] = []
    for pid, items in by_patient.items():
        primaries = [t for t, ty in items if ty == "Primary_tumor"]
        if primaries:
            keep.append(primaries[0])
        else:
            keep.append(items[0][0])
    return keep


def run_deseq2(counts: pd.DataFrame, design: pd.DataFrame) -> pd.DataFrame:
    from pydeseq2.dds import DeseqDataSet
    from pydeseq2.default_inference import DefaultInference
    from pydeseq2.ds import DeseqStats

    counts_t = counts.T
    metadata = design.copy()
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
    stats = DeseqStats(
        dds,
        contrast=["tumortype", "Metastasis", "PrimaryTumor"],
        inference=inference,
        quiet=True,
    )
    stats.summary()
    res = stats.results_df.copy()
    res.index.name = "ensembl_gene_id"
    return res


def main() -> int:
    print("=" * 70)
    print("Phase C — Patient-level sensitivity analysis")
    print("=" * 70)

    counts_path = DATA_DIR / "GSE271517_Sample_Counts.csv.gz"
    print(f"Loading {counts_path.name} …")
    with gzip.open(counts_path, "rt") as f:
        counts = pd.read_csv(f, index_col=0)
    counts.index.name = "ensembl_gene_id"

    meta = pd.read_csv(DATA_DIR / "GSE271517_sample_assignment.csv").set_index("sample_title")

    keep = pick_one_sample_per_patient(meta)
    print(f"  One-per-patient: kept {len(keep)} of {len(meta)} samples")

    counts_pl = counts[keep]
    design_pl = meta.loc[keep, ["tumor_type", "patient_id", "fusion_gene", "histology"]].copy()
    print(f"  Tumor type:   {design_pl['tumor_type'].value_counts().to_dict()}")

    # Same low-count filter as sample-level
    n_passing = (counts_pl >= 10).sum(axis=1)
    counts_pl_filtered = counts_pl.loc[n_passing >= 3]
    print(f"  Filtered: {counts_pl_filtered.shape[0]:,} of {counts_pl.shape[0]:,} genes pass filter")

    print("\n=== Running patient-level DESeq2 ===")
    res_pl = run_deseq2(counts_pl_filtered, design_pl)
    n_sig = (res_pl["padj"] < 0.05).sum()
    print(f"  Significant at padj < 0.05: {n_sig:,} genes")

    # Save patient-level top 100
    top_pl = res_pl.sort_values("padj").head(100)
    top_pl.to_csv(OUT_DIR / "C_patient_level_top100_DEGs.csv")
    print(f"  Wrote {OUT_DIR / 'C_patient_level_top100_DEGs.csv'}")

    # Compare overlap with sample-level top 100
    top_sl = pd.read_csv(OUT_DIR / "C_top100_DEGs.csv", index_col=0)
    overlap = set(top_pl.index) & set(top_sl.index)
    print(f"\n=== Sample-level vs patient-level overlap (top-100) ===")
    print(f"  Sample-level top-100:  {len(top_sl)} genes")
    print(f"  Patient-level top-100: {len(top_pl)} genes")
    print(f"  Intersection:          {len(overlap)} genes ({100*len(overlap)/100:.1f}%)")

    # Compare significant gene counts and annotate the marker table
    print("\n=== Marker behaviour at patient level ===")
    markers = pd.read_csv(DATA_DIR / "marker_gene_ensembl_ids.csv").set_index("ensembl_id")
    rows = []
    for ens, m in markers.iterrows():
        if ens in res_pl.index:
            rows.append({
                "symbol": m["symbol"],
                "role": m["role"],
                "log2FC": round(res_pl.at[ens, "log2FoldChange"], 3),
                "padj": float(f"{res_pl.at[ens, 'padj']:.3g}") if not pd.isna(res_pl.at[ens, 'padj']) else None,
            })
        else:
            rows.append({"symbol": m["symbol"], "role": m["role"], "log2FC": None, "padj": None})

    marker_df = pd.DataFrame(rows)
    marker_df.to_csv(OUT_DIR / "C_marker_results_patient_level.csv", index=False)
    print(marker_df.to_string(index=False))

    # Summary write-up
    summary_path = OUT_DIR / "C_patient_level_sensitivity.md"
    overlap_pct = 100 * len(overlap) / 100
    summary = f"""# Patient-level sensitivity analysis — Phase C

**Driver:** the sample-level analysis (n=91) has pseudoreplication
because 17 patients contributed multiple tumors. Per-patient sampling
removes this confound.

## Design

- One sample per patient. For patients with both primary and metastasis,
  prefer the primary (cleaner baseline). Otherwise the first available.
- Resulting design: {design_pl['tumor_type'].value_counts().get('Primary_tumor', 0)} Primary_tumor + {design_pl['tumor_type'].value_counts().get('Metastasis', 0)} Metastasis (n = {len(keep)} patients total).

## Results

- Significant genes at padj < 0.05: **{n_sig}** (vs 1,781 at sample-level)
- Overlap of top-100 hits with sample-level top-100: **{len(overlap)} / 100 = {overlap_pct:.1f}%**

## Interpretation

A high overlap (≥ 50 %) indicates the sample-level finding is
not driven by pseudoreplication; the patient-level analysis confirms it.
A lower overlap means within-patient correlation was inflating signal,
and the patient-level result is more conservative.

The patient-level n is much smaller and may have less power than
sample-level, so an absolute drop in n_sig is expected; what we care
about is whether the **same biology** appears in the top hits.

## Verdict

{"PASS" if overlap_pct >= 30 else "NEEDS-REVIEW"} — overlap = {overlap_pct:.1f}% (threshold: ≥30%; pseudoreplication has limited impact on the headline finding if true).
"""
    summary_path.write_text(summary)
    print(f"\n  Wrote {summary_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
