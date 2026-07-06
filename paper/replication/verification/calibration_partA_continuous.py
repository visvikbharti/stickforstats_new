#!/usr/bin/env python3
"""
Calibration benchmark, Part A — continuous log-expression data
==============================================================

Answers the question raised by the external (BGPT) review and now flagged in the
manuscript Limitations: does the Guardian assumption-driven cascade *improve*
inferential calibration (Type I error / FDR control), or does it only *change*
decisions?

Design: simulate gene-expression-like CONTINUOUS data (the scale the Guardian
genomics module actually operates on) with a KNOWN ground truth (which genes are
truly differentially expressed). For each of several assumption-violation
scenarios, run four pipelines and measure empirical Type I error, FDR, and power:

  1. naive_student  -- Student's t-test (equal_var=True), always  [the paper's naive baseline]
  2. welch          -- Welch's t-test, always                     [reference]
  3. mannwhitney    -- Mann-Whitney U, always                     [reference]
  4. guardian       -- the REAL production DifferentialExpressionService
                       (Shapiro-Wilk + Levene -> t / Welch / Mann-Whitney cascade)

Scenarios (2 groups, DE genes get a mean shift in group 2):
  S1 normal_equalvar     -- assumptions hold (control)
  S2 normal_unequalvar   -- heteroscedastic (Welch should help)
  S3 heavy_tailed_t3     -- non-normal symmetric heavy tails (MWU should help)
  S4 lognormal_skewed    -- non-normal skewed (realistic expression)
  S5 outlier_contam      -- 5% gross outliers (MWU/robustness should help)
  S6 unequalvar_heavy    -- combined stress (where MWU can INHERIT a variance problem)

Metrics per (scenario, sample size, pipeline), averaged over R datasets:
  * type_I : P(raw p < 0.05 | gene is truly null)      -- want ~= 0.05
  * fdr    : E[ false-discovery proportion at BH q<0.05 ] -- want <= 0.05
  * power  : P(BH q < 0.05 | gene is truly DE)          -- higher is better

Reproducible (fixed seed). Writes calibration_partA_results.json.
Run: .venv-django/bin/python paper/replication/verification/calibration_partA_continuous.py
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests

REPO = Path(__file__).resolve().parents[3]
GENOMICS_FILE = REPO / "backend" / "core" / "services" / "genomics" / "differential_expression.py"

SEED = 20260706
G = 1000           # genes per simulated dataset
PI_DE = 0.10       # fraction truly differentially expressed
R = 100            # simulated datasets per (scenario, sample size)
ALPHA = 0.05       # test level / BH level
MU0 = 5.0          # baseline mean (log-CPM-ish)
SIGMA0 = 1.0       # baseline SD
DELTA = 1.5        # DE mean shift (in SIGMA0 units) -> moderate power, distinguishes pipelines
SAMPLE_SIZES = [(20, 20), (55, 36)]  # small balanced; and GSE271517-like unbalanced


def load_service():
    spec = importlib.util.spec_from_file_location("cal_genomics", GENOMICS_FILE)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m.DifferentialExpressionService


# --------------------------------------------------------------------------
# Data generators. Each returns a (G, n1+n2) matrix; DE genes (is_de True) get
# a +DELTA*SIGMA0 mean shift applied to the group-2 columns.
# --------------------------------------------------------------------------
def _apply_de(mat, is_de, n1, shift):
    mat = mat.copy()
    mat[is_de, n1:] += shift
    return mat


def gen_normal_equalvar(rng, n1, n2, is_de):
    x = rng.normal(MU0, SIGMA0, size=(G, n1 + n2))
    return _apply_de(x, is_de, n1, DELTA * SIGMA0)


def gen_normal_unequalvar(rng, n1, n2, is_de):
    x = np.empty((G, n1 + n2))
    x[:, :n1] = rng.normal(MU0, SIGMA0, size=(G, n1))
    x[:, n1:] = rng.normal(MU0, 3.0 * SIGMA0, size=(G, n2))   # group2 3x SD
    return _apply_de(x, is_de, n1, DELTA * SIGMA0)


def gen_heavy_tailed_t3(rng, n1, n2, is_de):
    # Student-t df=3 scaled to unit variance (var of t3 = 3).
    t = rng.standard_t(df=3, size=(G, n1 + n2)) / np.sqrt(3.0)
    x = MU0 + SIGMA0 * t
    return _apply_de(x, is_de, n1, DELTA * SIGMA0)


def gen_lognormal_skewed(rng, n1, n2, is_de):
    # Lognormal centered/scaled to mean ~MU0, SD ~SIGMA0 (right-skewed).
    s = 0.6
    ln = rng.lognormal(mean=0.0, sigma=s, size=(G, n1 + n2))
    ln = (ln - np.exp(s**2 / 2)) / np.sqrt((np.exp(s**2) - 1) * np.exp(s**2))  # standardize
    x = MU0 + SIGMA0 * ln
    return _apply_de(x, is_de, n1, DELTA * SIGMA0)


def gen_outlier_contam(rng, n1, n2, is_de):
    x = rng.normal(MU0, SIGMA0, size=(G, n1 + n2))
    mask = rng.random(size=x.shape) < 0.05          # 5% gross outliers
    x[mask] = rng.normal(MU0, 5.0 * SIGMA0, size=mask.sum())
    return _apply_de(x, is_de, n1, DELTA * SIGMA0)


def gen_unequalvar_heavy(rng, n1, n2, is_de):
    t1 = rng.standard_t(df=3, size=(G, n1)) / np.sqrt(3.0)
    t2 = rng.standard_t(df=3, size=(G, n2)) / np.sqrt(3.0)
    x = np.empty((G, n1 + n2))
    x[:, :n1] = MU0 + SIGMA0 * t1
    x[:, n1:] = MU0 + 3.0 * SIGMA0 * t2              # heavy-tailed AND heteroscedastic
    return _apply_de(x, is_de, n1, DELTA * SIGMA0)


SCENARIOS = {
    "S1_normal_equalvar": gen_normal_equalvar,
    "S2_normal_unequalvar": gen_normal_unequalvar,
    "S3_heavy_tailed_t3": gen_heavy_tailed_t3,
    "S4_lognormal_skewed": gen_lognormal_skewed,
    "S5_outlier_contam": gen_outlier_contam,
    "S6_unequalvar_heavy": gen_unequalvar_heavy,
}


# --------------------------------------------------------------------------
# Pipelines. Each returns (raw_p[G], adj_p[G]).
# --------------------------------------------------------------------------
def _bh(p):
    p = np.asarray(p, float)
    ok = np.isfinite(p)
    adj = np.ones_like(p)
    if ok.sum() == 0:
        return adj
    adj[ok] = multipletests(p[ok], alpha=ALPHA, method="fdr_bh")[1]
    return adj


def pipe_ttest(mat, n1, equal_var):
    g1, g2 = mat[:, :n1], mat[:, n1:]
    _, p = stats.ttest_ind(g1, g2, axis=1, equal_var=equal_var)
    p = np.where(np.isfinite(p), p, 1.0)
    return p, _bh(p)


def pipe_mwu(mat, n1):
    g1, g2 = mat[:, :n1], mat[:, n1:]
    _, p = stats.mannwhitneyu(g1, g2, axis=1, alternative="two-sided")
    p = np.where(np.isfinite(p), p, 1.0)
    return p, _bh(p)


def pipe_guardian(service, mat, labels, n1):
    res = service.analyze(
        expression_matrix=mat,
        gene_names=[f"g{i}" for i in range(mat.shape[0])],
        group_labels=labels, group1_name="A", group2_name="B",
    )
    raw = np.array([g.raw_p_value for g in res.gene_results], float)
    adj = np.array([g.adjusted_p_value for g in res.gene_results], float)
    raw = np.where(np.isfinite(raw), raw, 1.0)
    adj = np.where(np.isfinite(adj), adj, 1.0)
    tests = [g.test_used for g in res.gene_results]
    return raw, adj, tests


# --------------------------------------------------------------------------
def metrics(raw_p, adj_p, is_de):
    null = ~is_de
    type_I = float(np.mean(raw_p[null] < ALPHA)) if null.any() else float("nan")
    disc = adj_p < ALPHA
    n_disc = int(disc.sum())
    fdp = float(np.mean(null[disc])) if n_disc > 0 else 0.0   # false-discovery proportion
    power = float(np.mean(disc[is_de])) if is_de.any() else float("nan")
    return type_I, fdp, power


def main():
    Service = load_service()
    service = Service(alpha=ALPHA, normality_alpha=ALPHA)
    rng = np.random.RandomState(SEED)
    n_de = int(round(G * PI_DE))
    is_de_template = np.zeros(G, bool)
    is_de_template[:n_de] = True

    results = {}
    for sname, gen in SCENARIOS.items():
        results[sname] = {}
        for (n1, n2) in SAMPLE_SIZES:
            labels = ["A"] * n1 + ["B"] * n2
            acc = {p: {"type_I": [], "fdr": [], "power": []}
                   for p in ["naive_student", "welch", "mannwhitney", "guardian"]}
            cascade_mix = {"t_test": 0, "welch_t_test": 0, "mann_whitney": 0, "other": 0}
            for r in range(R):
                # fresh DE assignment each rep (shuffle which genes are DE)
                perm = rng.permutation(G)
                is_de = is_de_template[perm]
                mat = gen(rng, n1, n2, is_de)

                for pname, (rp, ap) in {
                    "naive_student": pipe_ttest(mat, n1, True),
                    "welch": pipe_ttest(mat, n1, False),
                    "mannwhitney": pipe_mwu(mat, n1),
                }.items():
                    tI, fdp, pw = metrics(rp, ap, is_de)
                    acc[pname]["type_I"].append(tI)
                    acc[pname]["fdr"].append(fdp)
                    acc[pname]["power"].append(pw)

                grp, gap, gtests = pipe_guardian(service, mat, labels, n1)
                tI, fdp, pw = metrics(grp, gap, is_de)
                acc["guardian"]["type_I"].append(tI)
                acc["guardian"]["fdr"].append(fdp)
                acc["guardian"]["power"].append(pw)
                for t in gtests:
                    cascade_mix[t if t in cascade_mix else "other"] += 1

            szkey = f"n{n1}v{n2}"
            results[sname][szkey] = {
                p: {k: round(float(np.mean(v)), 4) for k, v in d.items()}
                for p, d in acc.items()
            }
            tot = sum(cascade_mix.values()) or 1
            results[sname][szkey]["guardian_cascade_mix_pct"] = {
                k: round(100 * v / tot, 1) for k, v in cascade_mix.items()
            }
            g = results[sname][szkey]
            print(f"[{sname} {szkey}] "
                  f"TypeI naive={g['naive_student']['type_I']:.3f} guardian={g['guardian']['type_I']:.3f} "
                  f"| FDR naive={g['naive_student']['fdr']:.3f} guardian={g['guardian']['fdr']:.3f} "
                  f"| Power naive={g['naive_student']['power']:.3f} guardian={g['guardian']['power']:.3f} "
                  f"| mix={results[sname][szkey]['guardian_cascade_mix_pct']}")

    meta = {"seed": SEED, "G": G, "pi_de": PI_DE, "R": R, "alpha": ALPHA,
            "delta_sd": DELTA, "sample_sizes": SAMPLE_SIZES}
    out = {"meta": meta, "results": results}
    outpath = Path(__file__).with_name("calibration_partA_results.json")
    outpath.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {outpath.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
