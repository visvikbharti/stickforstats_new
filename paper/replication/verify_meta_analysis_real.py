#!/usr/bin/env python3
"""
Verification script: Real meta-analysis case study (Case Study 3, PLOS Comp Bio).

Source dataset
--------------
Intravenous magnesium for prevention of mortality after acute myocardial
infarction. 16 randomized trials originally analyzed in:

    Egger M, Davey Smith G, Schneider M, Minder C. Bias in meta-analysis
    detected by a simple, graphical test. BMJ 1997;315:629-634.
    Sterne JAC, Egger M. Funnel plots for detecting bias in meta-analysis.
    J Clin Epidemiol 2001;54:1046-1055.

This is the canonical pedagogical example for funnel-plot asymmetry /
publication bias detection. The dataset is shipped as `dat.egger2001` in
the R `metafor` package (Viechtbauer 2010).

The narrative:
  - 15 small early trials suggested a large mortality reduction with IV Mg
  - LIMIT-2 (1992, n=2,316) confirmed benefit
  - ISIS-4 (1995, n=58,050) found NO benefit -- the largest trial overrode
    all the smaller ones, and Egger's test reveals the small-study bias

This script reproduces the meta-analytic numbers reported in the PLOS
Comp Bio manuscript Case Study 3, using ONLY the public CSV at
`data/iv_magnesium_meta_analysis.csv` (which was generated from the
metafor package and matches the published Egger 1997 / Sterne 2001 data
to 4+ decimal places).

NO cherry-picking: this is a single fixed published dataset, not a
seed-search output. Cross-validated against R `metafor` 4.8.0 (DerSimonian-
Laird estimator).

Usage
-----
    cd paper/replication
    python3 verify_meta_analysis_real.py
"""

import csv
import os
import sys

import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "data", "iv_magnesium_meta_analysis.csv")

# Reference values from R metafor 4.8.0 (method="DL"), independently
# computed and confirmed against the published Sterne-Egger 2001 paper.
# Tolerance is set so the test catches any meaningful divergence but
# tolerates floating-point noise in tau^2 estimation.
REFERENCE = {
    "k": 16,
    "pooled_log_or": -0.727583,
    "pooled_log_or_se": 0.196316,
    "ci_lb": -1.112355,
    "ci_ub": -0.342811,
    "tau2": 0.223883,
    "I2_percent": 68.13,
    "Q": 47.0593,
    "Q_p": 0.000036,
    "egger_t": -5.7846,
    "egger_p": 0.000047,
}
TOL = {
    "pooled_log_or": 1e-3,
    "pooled_log_or_se": 1e-3,
    "ci_lb": 1e-3,
    "ci_ub": 1e-3,
    "tau2": 1e-3,
    "I2_percent": 0.1,
    "Q": 1e-2,
    "Q_p": 1e-4,
    "egger_t": 1e-2,
    "egger_p": 1e-4,
}


def load_data():
    if not os.path.exists(DATA_PATH):
        sys.exit(f"FAIL: data file not found: {DATA_PATH}")
    rows = list(csv.DictReader(open(DATA_PATH)))
    yi = np.array([float(r["log_or"]) for r in rows])
    vi = np.array([float(r["variance"]) for r in rows])
    return yi, vi


def random_effects_dl(yi, vi):
    """DerSimonian-Laird random-effects pooled estimate."""
    w_fe = 1.0 / vi
    mean_fe = np.sum(w_fe * yi) / np.sum(w_fe)
    Q = np.sum(w_fe * (yi - mean_fe) ** 2)
    df = len(yi) - 1
    Q_p = 1.0 - stats.chi2.cdf(Q, df)
    C = np.sum(w_fe) - np.sum(w_fe ** 2) / np.sum(w_fe)
    tau2 = max(0.0, (Q - df) / C)
    w_re = 1.0 / (vi + tau2)
    pooled = np.sum(w_re * yi) / np.sum(w_re)
    se_pooled = np.sqrt(1.0 / np.sum(w_re))
    ci_lo = pooled - 1.96 * se_pooled
    ci_hi = pooled + 1.96 * se_pooled
    I2 = max(0.0, (Q - df) / Q) * 100.0 if Q > 0 else 0.0
    return {
        "pooled": pooled,
        "se_pooled": se_pooled,
        "ci_lo": ci_lo,
        "ci_hi": ci_hi,
        "tau2": tau2,
        "I2": I2,
        "Q": Q,
        "Q_p": Q_p,
        "df": df,
    }


def egger_test(yi, vi):
    """Egger's regression test for funnel-plot asymmetry (Egger 1997).

    Regress standardized normal deviate (yi/sei) on precision (1/sei).
    A nonzero intercept indicates funnel-plot asymmetry.
    """
    sei = np.sqrt(vi)
    z = yi / sei
    inv_sei = 1.0 / sei
    n = len(z)
    X = np.column_stack([np.ones(n), inv_sei])
    beta, *_ = np.linalg.lstsq(X, z, rcond=None)
    y_hat = X @ beta
    resid = z - y_hat
    sigma2 = float(np.sum(resid ** 2) / (n - 2))
    cov_beta = sigma2 * np.linalg.inv(X.T @ X)
    se_intercept = float(np.sqrt(cov_beta[0, 0]))
    t_stat = float(beta[0] / se_intercept)
    p_val = float(2.0 * (1.0 - stats.t.cdf(abs(t_stat), df=n - 2)))
    return {
        "intercept": float(beta[0]),
        "se_intercept": se_intercept,
        "t": t_stat,
        "p": p_val,
        "df": n - 2,
    }


def check(label, computed, expected, tol):
    diff = abs(computed - expected)
    ok = diff <= tol
    flag = "PASS" if ok else "FAIL"
    print(f"  [{flag}] {label}: computed={computed:.6f}  expected={expected:.6f}  |diff|={diff:.2e}  tol={tol:.2e}")
    return ok


def main():
    print("=" * 72)
    print("VERIFICATION: Real meta-analysis (IV magnesium for acute MI)")
    print("Source: Egger 1997 BMJ; Sterne & Egger 2001 J Clin Epi")
    print("Dataset: metafor::dat.egger2001 (16 RCTs)")
    print("=" * 72)

    yi, vi = load_data()
    k = len(yi)

    print(f"\nLoaded k={k} trials from {os.path.relpath(DATA_PATH, HERE)}")

    print("\n--- Random-effects pooled estimate (DerSimonian-Laird) ---")
    re = random_effects_dl(yi, vi)
    print(f"  Pooled log OR = {re['pooled']:.4f}  (SE = {re['se_pooled']:.4f})")
    print(f"  Pooled OR     = {np.exp(re['pooled']):.4f}, 95% CI [{np.exp(re['ci_lo']):.4f}, {np.exp(re['ci_hi']):.4f}]")
    print(f"  tau^2         = {re['tau2']:.4f}")
    print(f"  I^2           = {re['I2']:.1f}%")
    print(f"  Q             = {re['Q']:.2f}, df = {re['df']}, p = {re['Q_p']:.6f}")

    print("\n--- Egger's regression test for funnel asymmetry ---")
    eg = egger_test(yi, vi)
    print(f"  Intercept = {eg['intercept']:.4f}  (SE = {eg['se_intercept']:.4f})")
    print(f"  t = {eg['t']:.4f}  (df = {eg['df']})")
    print(f"  p = {eg['p']:.6f}")
    print(f"  Interpretation: {'Significant funnel asymmetry (publication bias suggested)' if eg['p'] < 0.05 else 'No detected asymmetry'}")

    print("\n--- Cross-software verification (vs R metafor 4.8.0 DL) ---")
    all_ok = True
    all_ok &= check("k", k, REFERENCE["k"], 0)
    all_ok &= check("pooled_log_or", re["pooled"], REFERENCE["pooled_log_or"], TOL["pooled_log_or"])
    all_ok &= check("pooled_log_or_se", re["se_pooled"], REFERENCE["pooled_log_or_se"], TOL["pooled_log_or_se"])
    all_ok &= check("ci_lb", re["ci_lo"], REFERENCE["ci_lb"], TOL["ci_lb"])
    all_ok &= check("ci_ub", re["ci_hi"], REFERENCE["ci_ub"], TOL["ci_ub"])
    all_ok &= check("tau2", re["tau2"], REFERENCE["tau2"], TOL["tau2"])
    all_ok &= check("I2_percent", re["I2"], REFERENCE["I2_percent"], TOL["I2_percent"])
    all_ok &= check("Q", re["Q"], REFERENCE["Q"], TOL["Q"])
    all_ok &= check("Q_p", re["Q_p"], REFERENCE["Q_p"], TOL["Q_p"])
    all_ok &= check("egger_t", eg["t"], REFERENCE["egger_t"], TOL["egger_t"])
    all_ok &= check("egger_p", eg["p"], REFERENCE["egger_p"], TOL["egger_p"])

    print()
    if all_ok:
        print("VERIFIED: All meta-analysis numbers match R metafor 4.8.0 reference.")
        sys.exit(0)
    else:
        print("FAIL: One or more checks did not match the R metafor reference.")
        sys.exit(1)


if __name__ == "__main__":
    main()
