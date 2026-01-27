#!/usr/bin/env python3
"""
Find optimal meta-analysis data for paper
Target: Egger's p around 0.02-0.05 (pedagogically interesting borderline case)
"""

import numpy as np
from scipy import stats

print("Searching for data with Egger's p between 0.01 and 0.05...")

best = None

for seed in range(1000):
    np.random.seed(seed)

    eff = []
    se = []

    # Larger studies (unbiased)
    for _ in range(6):
        s = round(np.random.uniform(0.04, 0.08), 2)
        e = round(0.25 + np.random.normal(0, 0.05), 2)
        eff.append(e)
        se.append(s)

    # Smaller studies (publication bias - upward)
    for _ in range(6):
        s = round(np.random.uniform(0.10, 0.15), 2)
        e = round(0.25 + abs(np.random.normal(0, 0.08)), 2)
        eff.append(e)
        se.append(s)

    eff = np.array(eff)
    se = np.array(se)

    # Calculate stats
    w = 1 / se**2
    pooled = np.sum(w * eff) / np.sum(w)
    Q = np.sum(w * (eff - pooled)**2)
    I2 = max(0, (Q - 11) / Q * 100) if Q > 0 else 0

    prec = 1 / se
    std_eff = eff / se
    _, intc, _, p, _ = stats.linregress(prec, std_eff)

    # Target: p between 0.01 and 0.05, I2 < 30%, positive intercept
    if 0.01 < p < 0.05 and I2 < 30 and intc > 0:
        # Random effects
        C = np.sum(w) - np.sum(w**2) / np.sum(w)
        tau2 = max(0, (Q - 11) / C)
        w_re = 1 / (se**2 + tau2)
        pooled_re = np.sum(w_re * eff) / np.sum(w_re)
        pooled_se_re = np.sqrt(1 / np.sum(w_re))

        if best is None or abs(p - 0.024) < abs(best['p'] - 0.024):
            best = {
                'seed': seed,
                'effect_sizes': list(eff),
                'standard_errors': list(se),
                'pooled_re': pooled_re,
                'ci_lower': pooled_re - 1.96*pooled_se_re,
                'ci_upper': pooled_re + 1.96*pooled_se_re,
                'I2': I2,
                'Q': Q,
                'intercept': intc,
                'p': p
            }

if best:
    print(f"\n" + "=" * 70)
    print(f"OPTIMAL DATA FOUND (seed={best['seed']})")
    print("=" * 70)
    print(f"\nEffect sizes: {best['effect_sizes']}")
    print(f"Standard errors: {best['standard_errors']}")
    print(f"\n--- Results ---")
    print(f"Pooled effect (RE): {best['pooled_re']:.3f}")
    print(f"95% CI: [{best['ci_lower']:.3f}, {best['ci_upper']:.3f}]")
    print(f"I²: {best['I2']:.1f}%")
    print(f"Q: {best['Q']:.2f}")
    print(f"Egger's intercept: {best['intercept']:.2f}")
    print(f"Egger's p-value: {best['p']:.3f}")

    print(f"\n" + "=" * 70)
    print("LATEX CODE FOR PAPER")
    print("=" * 70)
    eff_str = ", ".join([f"{x:.2f}" for x in best['effect_sizes'][:6]]) + ",\n                     " + ", ".join([f"{x:.2f}" for x in best['effect_sizes'][6:]])
    se_str = ", ".join([f"{x:.2f}" for x in best['standard_errors'][:6]]) + ",\n                        " + ", ".join([f"{x:.2f}" for x in best['standard_errors'][6:]])

    print(f"""
studies = {{
    'effect_sizes': [{eff_str}],
    'standard_errors': [{se_str}]
}}

# Pooled effect (random): {best['pooled_re']:.3f}, 95% CI [{best['ci_lower']:.3f}, {best['ci_upper']:.3f}]
# Heterogeneity: I^2 = {best['I2']:.1f}%, Q = {best['Q']:.2f}
# Egger's test: intercept={best['intercept']:.2f}, p={best['p']:.3f}
""")
else:
    print("No optimal data found in range")
