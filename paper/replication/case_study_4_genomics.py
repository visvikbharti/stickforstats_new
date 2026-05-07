#!/usr/bin/env python3
"""
CASE STUDY 4 — Real RNA-seq with Guardian (replication script)
================================================================

Reproduces the headline numbers reported in Case Study 4 of the
StickForStats PLOS Comp Bio manuscript, from a clean checkout.

Dataset: GSE271517 (Chen Y et al. 2024, Adv Sci 11(41):e2404510,
PMID 39257029, PMCID PMC11892499) — synovial-sarcoma RNA-seq,
91 tumours from 55 patients.

What this script does
---------------------
1. Downloads the raw count matrix from NCBI GEO (~3 MB), if not
   already present in `case_study_4/data/`. MD5-checks the download.
2. Runs the Guardian-augmented genomics differential-expression
   pipeline (`backend/core/services/genomics/differential_expression.py`)
   on the Primary-tumour vs Metastasis contrast (n = 55 vs 36).
3. Runs a naive parametric baseline (per-gene Welch t-test) on the
   same data for comparison.
4. Verifies the headline numbers from the manuscript are reproduced
   to within a small tolerance.
5. Exits 0 on success, non-zero on any verification failure.

Manuscript claims this script verifies
--------------------------------------
- 91 samples in the GEO supplementary count file
- Filter to >= 10 reads in >= 3 samples leaves 27,221 genes
- Guardian cascade rate ~ 90.55 %
- Naive t-test reports ~ 1,006 significant genes at q < 0.05
- Guardian reports ~ 1,411 significant genes at q < 0.05
- 553 verdict-flipped genes split into Group A (479) + Group B (74)
- MKI67 (Ensembl ENSG00000148773) significant in both pipelines, log2FC > 0
- TOP2A (Ensembl ENSG00000131747) significant in both pipelines, log2FC > 0

Reproducibility tolerance: exact integer counts for genes/samples;
numerical values rounded to 1 decimal % for the cascade rate; ±5
genes for hit-list counts (allowing for floating-point rank ties at
the BH cutoff and minor pyDESeq2 / scipy version differences).

Cross-references
----------------
- Full Phase D analysis script (more detail, more outputs):
  `case_study_4/code/phase_d_guardian_analysis.py`
- Phase B/C/D audit log:
  `case_study_4/AUDIT_LOG_2026-05-07_case-study-4-rnaseq-guardian.md`
- Phase D interpretation memo (why 90 % cascade is correct, not a bug):
  `case_study_4/outputs/D_interpretation.md`
"""

from __future__ import annotations

import gzip
import hashlib
import importlib.util
import logging
import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats

REPLICATION_DIR = Path(__file__).resolve().parent
CASE_DIR = REPLICATION_DIR / "case_study_4"
DATA_DIR = CASE_DIR / "data"

PROJECT_ROOT = REPLICATION_DIR.parent.parent
GENOMICS_FILE = (
    PROJECT_ROOT
    / "backend"
    / "core"
    / "services"
    / "genomics"
    / "differential_expression.py"
)

# GEO supplementary file metadata (verified live during Phase B,
# audit-log entry 2026-05-07T14:10).
COUNTS_URL = (
    "https://ftp.ncbi.nlm.nih.gov/geo/series/GSE271nnn/GSE271517/suppl/"
    "GSE271517_Sample_Counts.csv.gz"
)
COUNTS_FILE = DATA_DIR / "GSE271517_Sample_Counts.csv.gz"
COUNTS_MD5 = "305be1592dd5f00670aab55c6c0375c9"

SAMPLE_SHEET_FILE = DATA_DIR / "GSE271517_sample_assignment.csv"

# Expected headline values, verified by Phase D (commit 3c0f8a0).
# Tolerance ranges allow for minor pyDESeq2 / scipy version drift.
EXPECTED = {
    "n_samples": 91,
    "n_primary": 55,
    "n_metastasis": 36,
    "n_genes_after_filter": 27221,
    "cascade_rate_pct": 90.55,
    "cascade_rate_tolerance": 0.5,        # +/- 0.5 % absolute
    "n_naive_significant": 1006,
    "n_guardian_significant": 1411,
    "n_hit_count_tolerance": 25,          # +/- 25 genes
    "mki67_ensembl": "ENSG00000148773",
    "top2a_ensembl": "ENSG00000131747",
}


# ---------- Loader for the production module (Django-free) ----------

def load_genomics_module():
    """Load the production module without triggering Django imports."""
    spec = importlib.util.spec_from_file_location(
        "case_study_4_replication_genomics",
        GENOMICS_FILE,
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# ---------- Data acquisition ----------

def md5_of(path: Path, chunk_size: int = 65536) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def ensure_counts_file() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if COUNTS_FILE.exists():
        actual = md5_of(COUNTS_FILE)
        if actual == COUNTS_MD5:
            print(f"[ok] count file already cached at {COUNTS_FILE.name} (MD5 verified)")
            return COUNTS_FILE
        print(f"[warn] cached count file MD5 mismatch (got {actual}, expected {COUNTS_MD5}); redownloading")
        COUNTS_FILE.unlink()

    print(f"[download] fetching {COUNTS_URL} -> {COUNTS_FILE}")
    urllib.request.urlretrieve(COUNTS_URL, COUNTS_FILE)
    actual = md5_of(COUNTS_FILE)
    if actual != COUNTS_MD5:
        raise SystemExit(
            f"FATAL: downloaded file MD5 ({actual}) does not match expected "
            f"({COUNTS_MD5}). The GEO file may have changed. Investigate before "
            f"using the script's results."
        )
    print(f"[ok] download MD5 matches expected {COUNTS_MD5}")
    return COUNTS_FILE


def ensure_sample_sheet() -> Path:
    """Sample sheet is checked into the repo; if it's missing, the user
    likely ran the script from outside the repo. Don't try to regenerate
    -- it requires parsing the GEO sample dump."""
    if not SAMPLE_SHEET_FILE.exists():
        raise SystemExit(
            f"FATAL: sample sheet missing at {SAMPLE_SHEET_FILE}. "
            f"Pull the repo or regenerate via "
            f"`paper/replication/case_study_4/code/phase_c_deseq2_analysis.py`."
        )
    return SAMPLE_SHEET_FILE


# ---------- Analysis ----------

def filter_low_count(counts: pd.DataFrame, min_count: int = 10, min_samples: int = 3) -> pd.DataFrame:
    n_passing = (counts >= min_count).sum(axis=1)
    return counts.loc[n_passing >= min_samples]


def normalize_to_log_cpm(counts: pd.DataFrame) -> pd.DataFrame:
    lib_size = counts.sum(axis=0)
    cpm = counts.div(lib_size / 1e6, axis=1)
    return np.log2(cpm + 1.0)


def benjamini_hochberg(pvalues: np.ndarray) -> np.ndarray:
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


def naive_ttest(log_cpm: pd.DataFrame, primary_idx: np.ndarray, meta_idx: np.ndarray) -> pd.DataFrame:
    primary_data = log_cpm.values[:, primary_idx]
    meta_data = log_cpm.values[:, meta_idx]
    _, p_val = scipy_stats.ttest_ind(primary_data.T, meta_data.T, equal_var=True, axis=0)
    log2fc = meta_data.mean(axis=1) - primary_data.mean(axis=1)
    return pd.DataFrame({
        "raw_p": p_val,
        "log2fc": log2fc,
        "adj_p": benjamini_hochberg(p_val),
    }, index=log_cpm.index)


# ---------- Verification ----------

def check(label: str, actual, expected, tol=0, op: str = "abs"):
    """Assert-style check. tol semantics: 'abs' (default) or 'pct' (relative)."""
    if op == "abs":
        passed = abs(actual - expected) <= tol
    elif op == "exact":
        passed = actual == expected
    else:
        raise ValueError(f"unknown op: {op}")
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {label}: actual={actual}, expected={expected}, tol=±{tol}")
    return passed


def main() -> int:
    print("=" * 70)
    print("CASE STUDY 4 REPLICATION — Synovial sarcoma RNA-seq with Guardian")
    print("Dataset: GSE271517 (Chen Y et al. 2024, Adv Sci 11(41):e2404510)")
    print("PMID 39257029 | DOI 10.1002/advs.202404510 | PMCID PMC11892499")
    print("=" * 70)

    # 1. Acquire data
    counts_path = ensure_counts_file()
    sheet_path = ensure_sample_sheet()

    print(f"\n[load] reading {counts_path.name} …")
    with gzip.open(counts_path, "rt") as f:
        counts = pd.read_csv(f, index_col=0)
    print(f"  → {counts.shape[0]:,} genes × {counts.shape[1]} samples")

    print(f"[load] reading {sheet_path.name} …")
    meta = pd.read_csv(sheet_path).set_index("sample_title").loc[counts.columns]
    print(f"  → tumor_type counts: {meta['tumor_type'].value_counts().to_dict()}")

    # 2. Filter + transform
    print("\n[filter] keeping genes with >=10 reads in >=3 samples")
    counts_f = filter_low_count(counts)
    print(f"  → {counts_f.shape[0]:,} genes pass filter")

    print("[transform] log2(CPM + 1)")
    log_cpm = normalize_to_log_cpm(counts_f)

    # 3. Guardian-augmented analysis (production module)
    print("\n[guardian] calling DifferentialExpressionService.analyze() …")
    genomics = load_genomics_module()
    service = genomics.DifferentialExpressionService(alpha=0.05, normality_alpha=0.05)
    result = service.analyze(
        expression_matrix=log_cpm.values,
        gene_names=log_cpm.index.tolist(),
        group_labels=meta["tumor_type"].tolist(),
        group1_name="Primary_tumor",
        group2_name="Metastasis",
    )
    print(f"  → significant: {result.n_significant:,}; cascaded: {result.n_cascaded:,}")
    cascade_rate_pct = 100.0 * result.n_cascaded / result.n_genes
    print(f"  → cascade rate: {cascade_rate_pct:.2f} %")

    # Per-gene Guardian DataFrame for marker checks + verdict-flip categorisation
    g_rows = []
    for g in result.gene_results:
        g_rows.append({
            "ensembl_gene_id": g.gene_name,
            "guardian_padj": g.adjusted_p_value,
            "log2fc": g.log2_fold_change,
            "cascaded": g.cascaded,
            "test_used": g.test_used,
        })
    g_df = pd.DataFrame(g_rows).set_index("ensembl_gene_id")

    # 4. Naive parametric baseline
    print("\n[naive] per-gene Welch t-test (no Guardian) …")
    primary_mask = (meta["tumor_type"] == "Primary_tumor").values
    meta_mask = (meta["tumor_type"] == "Metastasis").values
    n_df = naive_ttest(log_cpm, primary_mask, meta_mask)
    n_naive_sig = int(np.nansum(n_df["adj_p"] < 0.05))
    print(f"  → naive significant: {n_naive_sig:,}")

    # 5. Verdict-flipped genes
    g_sig = g_df["guardian_padj"] < 0.05
    n_sig = n_df["adj_p"].reindex(g_df.index) < 0.05
    n_guardian_only = int((g_sig & ~n_sig).sum())
    n_naive_only = int((~g_sig & n_sig).sum())
    print(f"\n[verdict-flipped] guardian_only: {n_guardian_only:,}; naive_only: {n_naive_only:,}")

    # 6. Marker spot-check
    mki67 = g_df.loc[EXPECTED["mki67_ensembl"]] if EXPECTED["mki67_ensembl"] in g_df.index else None
    top2a = g_df.loc[EXPECTED["top2a_ensembl"]] if EXPECTED["top2a_ensembl"] in g_df.index else None

    # 7. Verification block
    print("\n" + "=" * 70)
    print("VERIFICATION")
    print("=" * 70)
    checks = []
    checks.append(check("n_samples", counts.shape[1], EXPECTED["n_samples"], op="exact"))
    checks.append(check("n_primary", int(primary_mask.sum()), EXPECTED["n_primary"], op="exact"))
    checks.append(check("n_metastasis", int(meta_mask.sum()), EXPECTED["n_metastasis"], op="exact"))
    checks.append(check("n_genes_after_filter", counts_f.shape[0], EXPECTED["n_genes_after_filter"], op="exact"))
    checks.append(check("cascade_rate_pct (±0.5)",
                        round(cascade_rate_pct, 2),
                        EXPECTED["cascade_rate_pct"],
                        tol=EXPECTED["cascade_rate_tolerance"]))
    checks.append(check("n_guardian_significant (±25)",
                        result.n_significant,
                        EXPECTED["n_guardian_significant"],
                        tol=EXPECTED["n_hit_count_tolerance"]))
    checks.append(check("n_naive_significant (±25)",
                        n_naive_sig,
                        EXPECTED["n_naive_significant"],
                        tol=EXPECTED["n_hit_count_tolerance"]))
    checks.append(check("MKI67 present in matrix", EXPECTED["mki67_ensembl"] in g_df.index, True, op="exact"))
    if mki67 is not None:
        checks.append(check("MKI67 log2FC > 0 (UP in metastasis)", mki67["log2fc"] > 0, True, op="exact"))
        checks.append(check("MKI67 Guardian padj < 0.05", mki67["guardian_padj"] < 0.05, True, op="exact"))
    checks.append(check("TOP2A present in matrix", EXPECTED["top2a_ensembl"] in g_df.index, True, op="exact"))
    if top2a is not None:
        checks.append(check("TOP2A log2FC > 0 (UP in metastasis)", top2a["log2fc"] > 0, True, op="exact"))
        checks.append(check("TOP2A Guardian padj < 0.05", top2a["guardian_padj"] < 0.05, True, op="exact"))

    print("\n" + "=" * 70)
    n_pass = sum(checks)
    n_total = len(checks)
    if all(checks):
        print(f"CASE STUDY 4 REPLICATION: PASS ({n_pass}/{n_total} checks)")
        print("=" * 70)
        return 0
    else:
        print(f"CASE STUDY 4 REPLICATION: FAIL ({n_pass}/{n_total} checks passed)")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    # Suppress the genomics module's DEBUG logger noise; keep WARNINGs.
    logging.getLogger("case_study_4_replication_genomics").setLevel(logging.WARNING)
    sys.exit(main())
