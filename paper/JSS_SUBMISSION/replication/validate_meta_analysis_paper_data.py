#!/usr/bin/env python3
"""
Meta-Analysis Validation - Using EXACT data from paper
======================================================
This script verifies the meta-analysis numbers using the EXACT data
shown in the paper (Section 10.3).

The paper honestly states this is a SIMULATION, which is acceptable.
We verify the calculations are correct for the stated data.

Author: Vishal Bharti / Claude Code
Date: 2026-01-27
"""

import numpy as np
from scipy import stats

print("=" * 70)
print("META-ANALYSIS VERIFICATION - PAPER DATA")
print("=" * 70)
print("\nUsing EXACT data from paper Section 10.3...")

# EXACT data from paper
effect_sizes = np.array([0.15, 0.22, 0.31, 0.18, 0.45, 0.28,
                         0.52, 0.35, 0.41, 0.25, 0.48, 0.33])
standard_errors = np.array([0.12, 0.15, 0.08, 0.14, 0.06, 0.11,
                            0.05, 0.09, 0.07, 0.13, 0.04, 0.10])

print(f"\nNumber of studies: {len(effect_sizes)}")
print(f"Effect sizes: {effect_sizes}")
print(f"Standard errors: {standard_errors}")

# Fixed-effect meta-analysis
print("\n--- Fixed-Effect Meta-Analysis ---")
weights = 1 / standard_errors**2
pooled_effect_fe = np.sum(weights * effect_sizes) / np.sum(weights)
pooled_se_fe = np.sqrt(1 / np.sum(weights))

print(f"Pooled effect: {pooled_effect_fe:.3f}")
print(f"Pooled SE: {pooled_se_fe:.3f}")
print(f"95% CI: [{pooled_effect_fe - 1.96*pooled_se_fe:.3f}, {pooled_effect_fe + 1.96*pooled_se_fe:.3f}]")

# Random-effects (DerSimonian-Laird)
print("\n--- Random-Effects Meta-Analysis (DerSimonian-Laird) ---")
Q = np.sum(weights * (effect_sizes - pooled_effect_fe)**2)
df = len(effect_sizes) - 1
C = np.sum(weights) - np.sum(weights**2) / np.sum(weights)
tau2 = max(0, (Q - df) / C)

print(f"Q statistic: {Q:.2f}")
print(f"df: {df}")
print(f"tau² (between-study variance): {tau2:.4f}")

weights_re = 1 / (standard_errors**2 + tau2)
pooled_effect_re = np.sum(weights_re * effect_sizes) / np.sum(weights_re)
pooled_se_re = np.sqrt(1 / np.sum(weights_re))

# I-squared
I2 = max(0, (Q - df) / Q * 100) if Q > 0 else 0

print(f"\nPooled effect (RE): {pooled_effect_re:.3f}")
print(f"Pooled SE (RE): {pooled_se_re:.3f}")
print(f"95% CI: [{pooled_effect_re - 1.96*pooled_se_re:.3f}, {pooled_effect_re + 1.96*pooled_se_re:.3f}]")
print(f"Heterogeneity: I² = {I2:.1f}%, Q = {Q:.2f}")

# Egger's test for publication bias
print("\n--- Publication Bias: Egger's Test ---")
precision = 1 / standard_errors
standardized_effect = effect_sizes / standard_errors

slope, intercept, r_value, p_egger, std_err = stats.linregress(precision, standardized_effect)

print(f"Intercept: {intercept:.2f}")
print(f"Slope: {slope:.3f}")
print(f"p-value: {p_egger:.3f}")

if p_egger < 0.05:
    print("STATUS: WARNING - Significant funnel plot asymmetry")
    print("Suggests potential publication bias")
else:
    print("STATUS: No significant asymmetry detected")

# Compare with paper claims
print("\n" + "=" * 70)
print("COMPARISON: Paper vs Calculated")
print("=" * 70)

paper_values = {
    'pooled_effect': 0.271,
    'ci_lower': 0.230,
    'ci_upper': 0.313,
    'I2': 0.0,
    'Q': 12.48,
    'egger_intercept': 1.72,
    'egger_p': 0.024
}

calculated = {
    'pooled_effect': pooled_effect_re,
    'ci_lower': pooled_effect_re - 1.96*pooled_se_re,
    'ci_upper': pooled_effect_re + 1.96*pooled_se_re,
    'I2': I2,
    'Q': Q,
    'egger_intercept': intercept,
    'egger_p': p_egger
}

print(f"\n{'Metric':<20} {'Paper':<12} {'Calculated':<12} {'Match?':<10}")
print("-" * 55)
for key in paper_values:
    pval = paper_values[key]
    cval = calculated[key]
    # Check if within 5% or 0.01 absolute
    match = abs(pval - cval) < max(0.01, abs(pval) * 0.05)
    status = "✓ YES" if match else "✗ NO"
    print(f"{key:<20} {pval:<12.3f} {cval:<12.3f} {status:<10}")

print("\n" + "=" * 70)
print("CONCLUSION")
print("=" * 70)
print("""
The meta-analysis uses SIMULATED data (honestly stated in paper).
The calculations are being verified against the exact data shown.

If numbers match: The simulation and calculations are reproducible.
If numbers don't match: Paper needs correction.
""")
