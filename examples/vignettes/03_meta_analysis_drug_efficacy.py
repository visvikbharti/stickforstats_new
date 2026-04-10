#!/usr/bin/env python3
"""
Vignette 3: Meta-Analysis of Drug Efficacy with Publication Bias Detection
===========================================================================

Demonstrates StickForStats' meta-analysis capabilities with Guardian
checking for publication bias and heterogeneity.

Data: 12 RCTs of a hypothetical intervention, with realistic publication bias
(smaller studies with larger effects are overrepresented).

Guardian checks:
- Publication bias (Egger's test)
- Heterogeneity assessment (I-squared, Q statistic)
- Effect size consistency

Usage:
    python examples/vignettes/03_meta_analysis_drug_efficacy.py
"""

import numpy as np
from scipy import stats

np.random.seed(561)  # For reproducibility

print("=" * 70)
print("Vignette 3: Meta-Analysis of Drug Efficacy")
print("Data: 12 RCTs with simulated publication bias")
print("=" * 70)

# Simulate 12 studies with publication bias
# Larger studies publish regardless; smaller studies only publish with larger effects
effect_sizes = [0.23, 0.15, 0.25, 0.35, 0.28, 0.28,
                0.32, 0.42, 0.33, 0.28, 0.37, 0.31]
standard_errors = [0.08, 0.04, 0.07, 0.06, 0.07, 0.08,
                   0.13, 0.14, 0.12, 0.13, 0.12, 0.14]
study_names = [f"Study_{i+1}" for i in range(12)]

print(f"\n{'Study':<12} {'Effect (d)':>10} {'SE':>8} {'Weight':>8} {'95% CI'}")
print("-" * 55)
weights = [1 / se**2 for se in standard_errors]
total_weight = sum(weights)
for name, es, se, w in zip(study_names, effect_sizes, standard_errors, weights):
    ci_lo = es - 1.96 * se
    ci_hi = es + 1.96 * se
    print(f"{name:<12} {es:>10.3f} {se:>8.3f} {w/total_weight*100:>7.1f}% [{ci_lo:.3f}, {ci_hi:.3f}]")

# ── Fixed-Effects Model ──
print("\n" + "=" * 70)
print("FIXED-EFFECTS MODEL (Inverse Variance)")
print("=" * 70)

w = np.array(weights)
es = np.array(effect_sizes)
pooled_fe = np.sum(w * es) / np.sum(w)
se_fe = np.sqrt(1 / np.sum(w))
ci_lo_fe = pooled_fe - 1.96 * se_fe
ci_hi_fe = pooled_fe + 1.96 * se_fe
z_fe = pooled_fe / se_fe
p_fe = 2 * (1 - stats.norm.cdf(abs(z_fe)))

print(f"\n  Pooled effect: {pooled_fe:.4f}")
print(f"  95% CI: [{ci_lo_fe:.4f}, {ci_hi_fe:.4f}]")
print(f"  Z = {z_fe:.4f}, p = {p_fe:.2e}")

# ── Heterogeneity ──
print("\n" + "=" * 70)
print("HETEROGENEITY ASSESSMENT")
print("=" * 70)

Q = np.sum(w * (es - pooled_fe)**2)
df = len(es) - 1
p_Q = 1 - stats.chi2.cdf(Q, df)
I_sq = max(0, (Q - df) / Q * 100) if Q > 0 else 0
tau_sq = max(0, (Q - df) / (np.sum(w) - np.sum(w**2) / np.sum(w)))

print(f"\n  Q statistic: {Q:.2f} (df={df})")
print(f"  p-value: {p_Q:.4f}")
print(f"  I-squared: {I_sq:.1f}%")
print(f"  Tau-squared: {tau_sq:.4f}")
print(f"  Interpretation: {'Low' if I_sq < 25 else 'Moderate' if I_sq < 50 else 'Substantial' if I_sq < 75 else 'Considerable'} heterogeneity")

# ── Random-Effects Model (DerSimonian-Laird) ──
print("\n" + "=" * 70)
print("RANDOM-EFFECTS MODEL (DerSimonian-Laird)")
print("=" * 70)

w_re = 1 / (np.array(standard_errors)**2 + tau_sq)
pooled_re = np.sum(w_re * es) / np.sum(w_re)
se_re = np.sqrt(1 / np.sum(w_re))
ci_lo_re = pooled_re - 1.96 * se_re
ci_hi_re = pooled_re + 1.96 * se_re
z_re = pooled_re / se_re
p_re = 2 * (1 - stats.norm.cdf(abs(z_re)))

print(f"\n  Pooled effect: {pooled_re:.4f}")
print(f"  95% CI: [{ci_lo_re:.4f}, {ci_hi_re:.4f}]")
print(f"  Z = {z_re:.4f}, p = {p_re:.2e}")

# ── Guardian Validation ──
print("\n" + "=" * 70)
print("GUARDIAN ASSUMPTION VALIDATION")
print("=" * 70)

violations = []
penalty = 0.0

# Publication bias (Egger's test)
print("\n--- Publication Bias (Egger's Regression Test) ---")
precision = 1 / np.array(standard_errors)
std_effects = np.array(effect_sizes) / np.array(standard_errors)
slope, intercept, r_value, p_egger, std_err = stats.linregress(precision, std_effects)
print(f"  Intercept: {intercept:.4f}")
print(f"  p-value: {p_egger:.4f}")
if p_egger < 0.10:
    status = "CRITICAL" if p_egger < 0.05 else "WARNING"
    violations.append(f"Publication bias detected (Egger's p={p_egger:.4f})")
    penalty += 3.0 if status == "CRITICAL" else 2.0
    print(f"  [{status}] Funnel plot asymmetry suggests publication bias")
else:
    print(f"  [PASS] No significant funnel plot asymmetry")

# Heterogeneity check
print("\n--- Heterogeneity Check ---")
if I_sq > 75:
    violations.append(f"Considerable heterogeneity (I²={I_sq:.1f}%)")
    penalty += 3.0
    print(f"  [CRITICAL] I²={I_sq:.1f}% — consider subgroup analysis")
elif I_sq > 50:
    violations.append(f"Substantial heterogeneity (I²={I_sq:.1f}%)")
    penalty += 2.0
    print(f"  [WARNING] I²={I_sq:.1f}% — random-effects model appropriate")
else:
    print(f"  [PASS] I²={I_sq:.1f}%")

# Minimum studies
print("\n--- Study Count ---")
k = len(effect_sizes)
if k < 5:
    violations.append(f"Too few studies (k={k})")
    penalty += 3.0
    print(f"  [CRITICAL] Only {k} studies — meta-analysis unreliable")
elif k < 10:
    violations.append(f"Small number of studies (k={k})")
    penalty += 1.0
    print(f"  [MINOR] {k} studies — Egger's test may lack power")
else:
    print(f"  [PASS] {k} studies")

max_pen = 3 * 3.0
confidence = max(0, 1 - penalty / (max_pen * 1.2))

print("\n" + "=" * 70)
print("GUARDIAN REPORT")
print("=" * 70)
print(f"\n  Confidence Score: {confidence:.2f}")
print(f"  Status: {'HIGH CONFIDENCE' if confidence >= 0.8 else 'CAUTION' if confidence >= 0.6 else 'LOW CONFIDENCE'}")
if violations:
    print(f"\n  Violations ({len(violations)}):")
    for v in violations:
        print(f"    - {v}")

# ── Sensitivity Analysis ──
print("\n" + "=" * 70)
print("GUARDIAN-RECOMMENDED: LEAVE-ONE-OUT SENSITIVITY ANALYSIS")
print("=" * 70)

print(f"\n  {'Excluded':<12} {'Pooled':>8} {'95% CI':<20} {'Change':>8}")
print("  " + "-" * 52)
for i in range(len(effect_sizes)):
    es_loo = np.delete(es, i)
    se_loo = np.delete(np.array(standard_errors), i)
    w_loo = 1 / (se_loo**2 + tau_sq)
    pooled_loo = np.sum(w_loo * es_loo) / np.sum(w_loo)
    se_pooled_loo = np.sqrt(1 / np.sum(w_loo))
    ci_lo_loo = pooled_loo - 1.96 * se_pooled_loo
    ci_hi_loo = pooled_loo + 1.96 * se_pooled_loo
    change = pooled_loo - pooled_re
    flag = " <--" if abs(change) > 0.02 else ""
    print(f"  {study_names[i]:<12} {pooled_loo:>8.4f} [{ci_lo_loo:.4f}, {ci_hi_loo:.4f}] {change:>+8.4f}{flag}")

# ── Summary ──
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"""
  Random-effects pooled effect: {pooled_re:.4f} (95% CI [{ci_lo_re:.4f}, {ci_hi_re:.4f}])
  Heterogeneity: I²={I_sq:.1f}%, Q={Q:.2f} (p={p_Q:.4f})
  Publication bias: Egger's p={p_egger:.4f}
  Guardian Confidence: {confidence:.2f}

  Guardian detected {'publication bias' if p_egger < 0.10 else 'no publication bias'}
  and recommends {'interpreting the pooled effect with caution' if p_egger < 0.10
  else 'the pooled effect can be interpreted with confidence'}.

  The sensitivity analysis shows the result is {'robust' if all(
      abs(np.sum((1/(np.delete(np.array(standard_errors), i)**2 + tau_sq)) *
          np.delete(es, i)) / np.sum(1/(np.delete(np.array(standard_errors), i)**2 + tau_sq))
          - pooled_re) < 0.03 for i in range(len(es)))
  else 'sensitive to individual study removal'} to individual study removal.
""")
