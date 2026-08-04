#!/usr/bin/env python3
"""
Independence permutation-sensitivity analysis
=============================================

Written in response to an external technical critique (forwarded to the PI,
2026-07-05) of the StickForStats Guardian "independence" validator:

    "In StickForStats, the independence validator is a lag-1 Pearson
     autocorrelation computed over the observation order. For omics matrices,
     that order can be arbitrary and sometimes correlates with batch or
     subject grouping, which can make 'dependence' partly a function of how
     samples are arranged."   -- BGPT, via Dr. Chakraborty

The critique is CORRECT as a general statement about the lag-1 autocorrelation
validator, and this script demonstrates it empirically (Experiment 2). It then
shows why it does NOT affect the paper's genome-scale result (Case Study 4),
because the production genomics differential-expression module never invokes
the independence validator -- it cascades on normality (Shapiro-Wilk) and
variance homogeneity (Levene), both of which are invariant to sample ordering
(Experiment 1).

Both experiments run on the REAL data used in the manuscript
(GSE271517, synovial-sarcoma RNA-seq, 91 samples) and call the REAL production
code (backend/core/services/genomics/differential_expression.py and
backend/core/guardian/guardian_core.py::IndependenceValidator).

Run:
    .venv-django/bin/python paper/replication/verification/independence_permutation_sensitivity.py

Exit 0 on success; prints a JSON summary and a human-readable report.
"""
from __future__ import annotations

import gzip
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[3]
DATA_DIR = REPO / "paper" / "replication" / "case_study_4" / "data"
COUNTS_FILE = DATA_DIR / "GSE271517_Sample_Counts.csv.gz"
SAMPLE_SHEET = DATA_DIR / "GSE271517_sample_assignment.csv"
GENOMICS_FILE = REPO / "backend" / "core" / "services" / "genomics" / "differential_expression.py"

# Deterministic seed base (no wall-clock randomness -- reproducible).
SEED = 20260706
N_PERM_GENOMICS = 8       # full-pipeline reruns under shuffled sample order.
                          # The per-gene tests (Shapiro/Levene/t-test/Mann-Whitney)
                          # are order-invariant analytically; a handful of reruns
                          # confirms the *decision* (cascade + significant set) is
                          # stable under reordering, up to floating-point epsilon.
N_PERM_INDEP = 2000       # permutations for the independence permutation p-value
ALPHA = 0.05


# --------------------------------------------------------------------------
# Production-code loaders (Django-free)
# --------------------------------------------------------------------------
def load_genomics_service():
    spec = importlib.util.spec_from_file_location("cs4_genomics", GENOMICS_FILE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.DifferentialExpressionService


def load_independence_validator():
    sys.path.insert(0, str(REPO / "backend"))
    from core.guardian.guardian_core import IndependenceValidator  # noqa: E402
    return IndependenceValidator


# --------------------------------------------------------------------------
# Data prep (identical to case_study_4_genomics.py)
# --------------------------------------------------------------------------
def filter_low_count(counts: pd.DataFrame, min_count: int = 10, min_samples: int = 3) -> pd.DataFrame:
    n_passing = (counts >= min_count).sum(axis=1)
    return counts.loc[n_passing >= min_samples]


def normalize_to_log_cpm(counts: pd.DataFrame) -> pd.DataFrame:
    lib_size = counts.sum(axis=0)
    cpm = counts.div(lib_size / 1e6, axis=1)
    return np.log2(cpm + 1.0)


def load_data():
    with gzip.open(COUNTS_FILE, "rt") as f:
        counts = pd.read_csv(f, index_col=0)
    meta = pd.read_csv(SAMPLE_SHEET).set_index("sample_title").loc[counts.columns]
    counts_f = filter_low_count(counts)
    log_cpm = normalize_to_log_cpm(counts_f)
    return log_cpm, meta


# --------------------------------------------------------------------------
# EXPERIMENT 1 -- the genomics case study is invariant to sample ordering
# --------------------------------------------------------------------------
def run_genomics_once(Service, matrix, gene_names, labels):
    """Run the production DE pipeline; return the reported summary + the set
    of significant gene IDs."""
    service = Service(
        # REQUIRED since the fold-change fix: this script feeds log2-CPM
        # values, so the service must not exponentiate them. It does not read
        # log2_fold_change at all (the calibration measures Type I error, FDR
        # and power from p-values), so this argument does not affect any number
        # this script reports -- but it must still describe the data truthfully.
        input_scale="log2",
        alpha=ALPHA,
        normality_alpha=ALPHA,
    )
    result = service.analyze(
        expression_matrix=matrix,
        gene_names=gene_names,
        group_labels=labels,
        group1_name="Primary_tumor",
        group2_name="Metastasis",
    )
    sig_genes = frozenset(
        g.gene_name for g in result.gene_results if g.adjusted_p_value < ALPHA
    )
    return {
        "n_genes": result.n_genes,
        "n_cascaded": result.n_cascaded,
        "cascade_rate_pct": round(100.0 * result.n_cascaded / result.n_genes, 4),
        "n_significant": result.n_significant,
        "sig_genes": sig_genes,
    }


def experiment_1(log_cpm, meta):
    print("\n" + "=" * 74)
    print("EXPERIMENT 1 -- Genomics case study invariance to sample ordering")
    print("=" * 74)
    Service = load_genomics_service()
    gene_names = log_cpm.index.tolist()
    labels = meta["tumor_type"].tolist()
    matrix = log_cpm.values

    print(f"[baseline] running production DE pipeline on {matrix.shape[0]:,} genes "
          f"x {matrix.shape[1]} samples (natural GEO order) ...")
    base = run_genomics_once(Service, matrix, gene_names, labels)
    print(f"  cascade_rate={base['cascade_rate_pct']:.2f}%  "
          f"n_significant={base['n_significant']:,}  n_cascaded={base['n_cascaded']:,}")

    rng = np.random.RandomState(SEED)
    deviations = []
    jaccard_to_base = []
    for b in range(N_PERM_GENOMICS):
        # Permute the SAMPLE COLUMNS, carrying each sample's group label with it.
        # This is exactly the "arrangement" the critique is about: a different
        # ordering of the same samples. Group membership travels with the sample.
        perm = rng.permutation(matrix.shape[1])
        m_perm = matrix[:, perm]
        labels_perm = [labels[i] for i in perm]
        r = run_genomics_once(Service, m_perm, gene_names, labels_perm)
        d_cascade = abs(r["cascade_rate_pct"] - base["cascade_rate_pct"])
        d_sig = abs(r["n_significant"] - base["n_significant"])
        same_set = r["sig_genes"] == base["sig_genes"]
        inter = len(r["sig_genes"] & base["sig_genes"])
        union = len(r["sig_genes"] | base["sig_genes"]) or 1
        jaccard_to_base.append(inter / union)
        deviations.append((d_cascade, d_sig, same_set))
        print(f"  [perm {b+1}/{N_PERM_GENOMICS}] cascade={r['cascade_rate_pct']:.2f}%  "
              f"n_sig={r['n_significant']:,}  "
              f"identical_sig_set={'YES' if same_set else 'NO'}  "
              f"Jaccard={inter/union:.6f}")

    max_dcascade = max(d[0] for d in deviations)
    max_dsig = max(d[1] for d in deviations)
    all_identical = all(d[2] for d in deviations)
    min_jaccard = min(jaccard_to_base)
    print(f"\n  RESULT: max |Δcascade_rate| = {max_dcascade:.4f} pp; "
          f"max |Δn_significant| = {max_dsig}; "
          f"all significant-gene sets identical to baseline = {all_identical}; "
          f"min Jaccard = {min_jaccard:.6f}")
    verdict = (max_dcascade == 0.0 and max_dsig == 0 and all_identical)
    # NOTE: this is *decision-level* invariance -- identical cascade rate and an
    # identical significant-gene set. The underlying Shapiro/Levene/t-test outputs
    # differ at ~1e-15 under reordering (floating-point summation order); only the
    # rank-based cascade is bit-exact. No decision flipped across the permutations.
    print(f"  => Case Study 4 headline numbers are "
          f"{'INVARIANT (decision-level exact)' if verdict else 'NOT invariant (!)'} "
          f"to sample ordering.")
    return {
        "baseline_cascade_rate_pct": base["cascade_rate_pct"],
        "baseline_n_significant": base["n_significant"],
        "baseline_n_cascaded": base["n_cascaded"],
        "n_permutations": N_PERM_GENOMICS,
        "max_abs_delta_cascade_rate_pp": max_dcascade,
        "max_abs_delta_n_significant": int(max_dsig),
        "all_sig_sets_identical": bool(all_identical),
        "min_jaccard_to_baseline": min_jaccard,
        "invariant": bool(verdict),
    }


# --------------------------------------------------------------------------
# EXPERIMENT 2 -- the independence validator IS order-sensitive
# --------------------------------------------------------------------------
def experiment_2(log_cpm, meta):
    print("\n" + "=" * 74)
    print("EXPERIMENT 2 -- IndependenceValidator order-sensitivity (steel-man)")
    print("=" * 74)
    IndependenceValidator = load_independence_validator()
    iv = IndependenceValidator()

    labels = meta["tumor_type"].values
    is_primary = labels == "Primary_tumor"
    is_meta = labels == "Metastasis"

    # Pick the genes most differentially expressed between the two conditions
    # (largest |mean difference|), which is where a group-aligned ordering
    # produces the strongest spurious serial correlation.
    mat = log_cpm.values
    mean_diff = np.abs(mat[:, is_meta].mean(axis=1) - mat[:, is_primary].mean(axis=1))
    top_idx = np.argsort(mean_diff)[::-1][:500]

    rng = np.random.RandomState(SEED + 1)

    # ---- 2a. Single-gene demonstration on the top DE gene -----------------
    gi = int(top_idx[0])
    gene_id = log_cpm.index[gi]
    vec = mat[gi]

    # Ordering A: "grouped" -- all Primary samples, then all Metastasis.
    # This is an extremely common arrangement in GEO deposits (samples sorted
    # by condition). It puts a step change at the group boundary, which the
    # lag-1 autocorrelation reads as serial dependence.
    grouped_order = np.concatenate([np.where(is_primary)[0], np.where(is_meta)[0]])
    vec_grouped = vec[grouped_order]

    out_grouped = iv.validate([vec_grouped])
    r_grouped = out_grouped.get("statistic")
    p_grouped = out_grouped.get("p_value")

    # Permutation null: shuffle the SAME values into random orders and recompute
    # lag-1 autocorrelation. This is the arrangement-invariant reference.
    def lag1_r(x):
        x0, x1 = x[:-1], x[1:]
        # guard against zero variance
        if np.std(x0) == 0 or np.std(x1) == 0:
            return 0.0
        return float(np.corrcoef(x0, x1)[0, 1])

    perm_rs = np.empty(N_PERM_INDEP)
    for k in range(N_PERM_INDEP):
        perm_rs[k] = lag1_r(rng.permutation(vec))
    # Two-sided permutation p-value for the grouped ordering's |r|.
    p_perm = (np.sum(np.abs(perm_rs) >= abs(r_grouped)) + 1) / (N_PERM_INDEP + 1)
    frac_perm_flagged = float(np.mean(np.abs(perm_rs) > 0.3))  # |r|>0.3 warn threshold

    print(f"\n  [2a] Top DE gene {gene_id} (|Δmean|={mean_diff[gi]:.3f} log2CPM):")
    print(f"       Grouped ordering (Primary|Metastasis): lag-1 r = {r_grouped:.3f}, "
          f"parametric p = {p_grouped:.2e}, "
          f"validator verdict = {'VIOLATED' if out_grouped.get('violated') else 'ok'} "
          f"({out_grouped.get('severity','-')})")
    print(f"       Permutation reference (same values, {N_PERM_INDEP} random orders):")
    print(f"         mean lag-1 r = {perm_rs.mean():+.4f}  (theory ≈ -1/(n-1) = "
          f"{-1/(len(vec)-1):+.4f})")
    print(f"         permutation p-value for the grouped |r| = {p_perm:.4f}")
    print(f"         fraction of random orders that would themselves be "
          f"flagged (|r|>0.3) = {frac_perm_flagged:.4f}")

    # ---- 2b. Systematic flag rate: grouped ordering vs random ordering -----
    n_flag_grouped = 0
    n_flag_random = 0
    n_flag_natural = 0
    natural_order = np.arange(mat.shape[1])
    for gi2 in top_idx:
        v = mat[int(gi2)]
        # grouped
        og = iv.validate([v[grouped_order]])
        n_flag_grouped += int(bool(og.get("violated")))
        # natural GEO order
        on = iv.validate([v[natural_order]])
        n_flag_natural += int(bool(on.get("violated")))
        # a single random order
        on_r = iv.validate([rng.permutation(v)])
        n_flag_random += int(bool(on_r.get("violated")))

    n_top = len(top_idx)
    print(f"\n  [2b] Independence-violation flag rate over the top {n_top} DE genes:")
    print(f"       grouped ordering (condition-sorted): {n_flag_grouped}/{n_top} "
          f"= {100*n_flag_grouped/n_top:.1f}%")
    print(f"       natural GEO ordering:                {n_flag_natural}/{n_top} "
          f"= {100*n_flag_natural/n_top:.1f}%")
    print(f"       one random ordering:                 {n_flag_random}/{n_top} "
          f"= {100*n_flag_random/n_top:.1f}%")
    print(f"       => The flag rate is a function of ARRANGEMENT, not of the data. "
          f"Condition-sorted ordering manufactures spurious 'dependence'.")

    return {
        "top_de_gene": str(gene_id),
        "grouped_order_lag1_r": round(float(r_grouped), 4),
        "grouped_order_parametric_p": float(p_grouped),
        "grouped_order_verdict_violated": bool(out_grouped.get("violated")),
        "permutation_mean_lag1_r": round(float(perm_rs.mean()), 5),
        "permutation_p_for_grouped_r": round(float(p_perm), 4),
        "n_top_genes": int(n_top),
        "flag_rate_grouped_pct": round(100 * n_flag_grouped / n_top, 2),
        "flag_rate_natural_pct": round(100 * n_flag_natural / n_top, 2),
        "flag_rate_random_pct": round(100 * n_flag_random / n_top, 2),
    }


def main() -> int:
    if not COUNTS_FILE.exists():
        print(f"FATAL: {COUNTS_FILE} not found. Run case_study_4_genomics.py first "
              f"to fetch the GEO counts.")
        return 2
    print("Loading GSE271517 (real synovial-sarcoma RNA-seq) ...")
    log_cpm, meta = load_data()
    print(f"  {log_cpm.shape[0]:,} genes x {log_cpm.shape[1]} samples after filter; "
          f"groups = {meta['tumor_type'].value_counts().to_dict()}")

    exp1 = experiment_1(log_cpm, meta)
    exp2 = experiment_2(log_cpm, meta)

    summary = {"experiment_1_genomics_invariance": exp1,
               "experiment_2_independence_order_sensitivity": exp2}
    out_path = Path(__file__).with_name("independence_permutation_sensitivity_results.json")
    out_path.write_text(json.dumps(summary, indent=2))
    print("\n" + "=" * 74)
    print("SUMMARY (also written to " + out_path.name + ")")
    print("=" * 74)
    print(json.dumps(summary, indent=2))

    # Overall pass condition: genomics invariant AND independence demonstrably
    # order-sensitive (grouped flag rate strictly greater than random flag rate).
    ok = (exp1["invariant"]
          and exp2["flag_rate_grouped_pct"] > exp2["flag_rate_random_pct"])
    print("\nOVERALL:", "PASS" if ok else "CHECK", "-- genomics invariant =",
          exp1["invariant"], "| independence order-sensitive =",
          exp2["flag_rate_grouped_pct"] > exp2["flag_rate_random_pct"])
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
