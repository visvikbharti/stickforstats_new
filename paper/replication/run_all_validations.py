#!/usr/bin/env python3
"""
StickForStats Replication Package - Master Validation Script
============================================================

This script reproduces all validation results from the JSS paper:
"StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation"

Usage:
    python run_all_validations.py

Requirements:
    scipy >= 1.11.0
    numpy >= 1.24.0
"""

import numpy as np
from scipy import stats
import sys

def print_header(title):
    """Print formatted section header."""
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)

def check_match(name, computed, expected, tolerance=1e-10):
    """Check if computed value matches expected within tolerance."""
    if abs(computed - expected) < tolerance:
        print(f"  {name}: PASS (computed={computed}, expected={expected})")
        return True
    else:
        print(f"  {name}: FAIL (computed={computed}, expected={expected})")
        return False

def validate_ttest():
    """Validate independent t-test calculations."""
    print_header("T-TEST VALIDATION (Section 6.2.1)")

    # Test data from paper
    group1 = [23.5, 25.1, 22.8, 24.3, 26.0, 23.9, 24.7, 25.5, 22.1, 24.8]
    group2 = [28.2, 29.5, 27.8, 30.1, 28.9, 29.3, 27.5, 30.2, 28.6, 29.8]

    print("\nTest Data:")
    print(f"  Group 1: {group1}")
    print(f"  Group 2: {group2}")

    # Compute with SciPy
    t_stat, p_value = stats.ttest_ind(group1, group2)

    print("\nSciPy Results:")
    print(f"  t-statistic: {t_stat}")
    print(f"  p-value: {p_value}")

    # Expected values from paper
    expected_t = -9.681839102936346
    expected_p = 1.4654735402139705e-08

    print("\nValidation:")
    t_pass = check_match("t-statistic", t_stat, expected_t)
    p_pass = check_match("p-value", p_value, expected_p)

    return t_pass and p_pass

def validate_anova():
    """Validate one-way ANOVA calculations."""
    print_header("ANOVA VALIDATION (Section 6.2.2)")

    # Test data from paper
    g1 = [4.5, 5.2, 4.8, 5.1, 4.9]
    g2 = [6.2, 5.8, 6.5, 6.1, 5.9]
    g3 = [7.8, 8.2, 7.5, 8.0, 7.9]

    print("\nTest Data:")
    print(f"  Group 1: {g1}")
    print(f"  Group 2: {g2}")
    print(f"  Group 3: {g3}")

    # Compute with SciPy
    f_stat, p_value = stats.f_oneway(g1, g2, g3)

    # Calculate eta-squared
    all_data = np.concatenate([g1, g2, g3])
    grand_mean = np.mean(all_data)
    ss_between = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in [g1, g2, g3])
    ss_total = np.sum((all_data - grand_mean)**2)
    eta_squared = ss_between / ss_total

    print("\nSciPy Results:")
    print(f"  F-statistic: {f_stat}")
    print(f"  p-value: {p_value}")
    print(f"  eta-squared: {eta_squared}")

    # Expected values from paper
    expected_f = 155.4009216589865
    expected_p = 2.6391947516302176e-09
    expected_eta = 0.9628254910918225

    print("\nValidation:")
    f_pass = check_match("F-statistic", f_stat, expected_f)
    p_pass = check_match("p-value", p_value, expected_p)
    eta_pass = check_match("eta-squared", eta_squared, expected_eta)

    return f_pass and p_pass and eta_pass

def validate_correlation():
    """Validate Pearson correlation calculations."""
    print_header("CORRELATION VALIDATION (Section 6.2.3)")

    # Test data from paper
    x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    y = [2.1, 4.2, 5.8, 8.1, 9.9, 12.2, 14.0, 16.1, 17.9, 20.2]

    print("\nTest Data:")
    print(f"  X: {x}")
    print(f"  Y: {y}")

    # Compute with SciPy
    r, p_value = stats.pearsonr(x, y)
    r_squared = r ** 2

    print("\nSciPy Results:")
    print(f"  Pearson r: {r}")
    print(f"  p-value: {p_value}")
    print(f"  R-squared: {r_squared}")

    # Expected values from paper
    expected_r = 0.9997207354169295
    expected_p = 2.6645352591003757e-14
    expected_rsq = 0.9994415488225664

    print("\nValidation:")
    r_pass = check_match("Pearson r", r, expected_r)
    p_pass = check_match("p-value", p_value, expected_p)
    rsq_pass = check_match("R-squared", r_squared, expected_rsq)

    return r_pass and p_pass and rsq_pass

def validate_meta_analysis():
    """Validate meta-analysis calculations (DerSimonian-Laird)."""
    print_header("META-ANALYSIS VALIDATION (Section 6.3)")

    # Test data from paper
    effects = np.array([0.50, 0.60, 0.55])
    se = np.array([0.10, 0.12, 0.11])

    print("\nTest Data:")
    print("  Study A: effect=0.50, SE=0.10")
    print("  Study B: effect=0.60, SE=0.12")
    print("  Study C: effect=0.55, SE=0.11")

    # Manual DerSimonian-Laird calculation
    weights = 1 / se**2

    # Fixed-effect pooled estimate
    pooled_fe = np.sum(weights * effects) / np.sum(weights)

    # Q statistic
    Q = np.sum(weights * (effects - pooled_fe)**2)

    # DerSimonian-Laird tau-squared
    k = len(effects)
    C = np.sum(weights) - np.sum(weights**2) / np.sum(weights)
    tau_sq = max(0, (Q - (k - 1)) / C)

    # Random-effects weights and pooled estimate
    re_weights = 1 / (se**2 + tau_sq)
    pooled_re = np.sum(re_weights * effects) / np.sum(re_weights)
    se_pooled = np.sqrt(1 / np.sum(re_weights))

    # I-squared
    i_squared = max(0, (Q - (k - 1)) / Q * 100) if Q > 0 else 0

    print("\nManual DerSimonian-Laird Results:")
    print(f"  Pooled effect: {pooled_re}")
    print(f"  Pooled SE: {se_pooled}")
    print(f"  Q statistic: {Q}")
    print(f"  I-squared: {i_squared}%")
    print(f"  tau-squared: {tau_sq}")

    # Expected values from paper
    expected_pooled = 0.5439395319187689
    expected_se = 0.06298294876383374
    expected_q = 0.41435206265367436

    print("\nValidation:")
    pooled_pass = check_match("Pooled effect", pooled_re, expected_pooled, tolerance=1e-8)
    se_pass = check_match("Pooled SE", se_pooled, expected_se, tolerance=1e-8)
    q_pass = check_match("Q statistic", Q, expected_q, tolerance=1e-8)

    return pooled_pass and se_pass and q_pass

def validate_guardian_normality():
    """Validate Guardian normality detection."""
    print_header("GUARDIAN NORMALITY DETECTION (Section 6.5.1)")

    # Non-normal test data from paper
    group1 = [1.2, 1.5, 1.8, 2.0, 2.1, 2.3, 2.5, 15.0, 18.0, 25.0]
    group2 = [3.1, 3.5, 3.8, 4.0, 4.2, 4.5, 4.8, 5.0, 5.2, 5.5]

    print("\nTest Data (Group 1 contains outliers):")
    print(f"  Group 1: {group1}")
    print(f"  Group 2: {group2}")

    # Compute Shapiro-Wilk with SciPy
    w1, p1 = stats.shapiro(group1)
    w2, p2 = stats.shapiro(group2)

    print("\nShapiro-Wilk Results:")
    print(f"  Group 1: W={w1:.3f}, p={p1:.5f}")
    print(f"  Group 2: W={w2:.3f}, p={p2:.3f}")

    # Expected values from paper
    expected_w1 = 0.699
    expected_p1 = 0.00086

    print("\nValidation:")
    # Check that Group 1 is detected as non-normal
    detected = p1 < 0.05
    print(f"  Non-normality detected in Group 1: {'PASS' if detected else 'FAIL'}")
    print(f"  Group 2 passes normality test: {'PASS' if p2 > 0.05 else 'FAIL'}")

    w_pass = abs(w1 - expected_w1) < 0.01
    p_pass = abs(p1 - expected_p1) < 0.0001

    print(f"  W statistic match: {'PASS' if w_pass else 'FAIL'}")
    print(f"  p-value match: {'PASS' if p_pass else 'FAIL'}")

    return detected and p2 > 0.05 and w_pass and p_pass

def validate_variance_homogeneity():
    """Validate Guardian variance homogeneity detection."""
    print_header("GUARDIAN VARIANCE DETECTION (Section 6.5.2)")

    # Unequal variance test data
    group1 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    group2 = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

    print("\nTest Data (Unequal variances):")
    print(f"  Group 1: {group1} (SD={np.std(group1, ddof=1):.2f})")
    print(f"  Group 2: {group2} (SD={np.std(group2, ddof=1):.2f})")

    # Compute Levene's test with SciPy
    stat, p_value = stats.levene(group1, group2, center='median')

    # Calculate variance ratio
    var1 = np.var(group1, ddof=1)
    var2 = np.var(group2, ddof=1)
    var_ratio = max(var1, var2) / min(var1, var2)

    print("\nLevene's Test Results:")
    print(f"  F-statistic: {stat:.2f}")
    print(f"  p-value: {p_value:.4f}")
    print(f"  Variance ratio: {var_ratio:.1f}")

    print("\nValidation:")
    # Check that violation is detected
    detected = p_value < 0.05
    print(f"  Variance heterogeneity detected: {'PASS' if detected else 'FAIL'}")
    print(f"  Variance ratio > 2: {'PASS' if var_ratio > 2 else 'FAIL'}")

    return detected and var_ratio > 2

def main():
    """Run all validations and report summary."""
    print("\n" + "=" * 60)
    print(" STICKFORSTATS REPLICATION PACKAGE")
    print(" JSS Paper Validation Suite")
    print("=" * 60)

    results = {}

    # Run all validations
    results['T-Test'] = validate_ttest()
    results['ANOVA'] = validate_anova()
    results['Correlation'] = validate_correlation()
    results['Meta-Analysis'] = validate_meta_analysis()
    results['Guardian Normality'] = validate_guardian_normality()
    results['Guardian Variance'] = validate_variance_homogeneity()

    # Print summary
    print_header("VALIDATION SUMMARY")

    all_passed = True
    for test, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {test}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "-" * 60)
    if all_passed:
        print(" ALL VALIDATIONS PASSED")
        print(" Paper results are reproducible with SciPy reference")
    else:
        print(" SOME VALIDATIONS FAILED")
        print(" Please check the output above for details")
    print("-" * 60 + "\n")

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
