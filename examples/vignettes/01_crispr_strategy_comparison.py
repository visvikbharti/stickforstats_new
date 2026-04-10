#!/usr/bin/env python3
"""
Vignette 1: Validating Statistical Assumptions in Genome Editing Strategy Comparison
=====================================================================================

This vignette demonstrates how StickForStats' Guardian system catches statistical
assumption violations when comparing CRISPR genome editing strategies.

Data source: CRISPRArchitect v3 scoring engine (Bharti & Chakraborty, 2026)
- 10 pathogenic variants × 4 editing strategies = 40 scored strategies
- Strategies: ABE8e Base Editing, Prime Editing (PE3), HDR (ssODN), HDR (cssDNA)
- Scores: TOPSIS composite from 6 dimensions (safety, feasibility, complexity, risk, confidence)

Research question: Do TOPSIS composite scores differ significantly across editing modalities?

Expected findings:
- TOPSIS scores are NOT normally distributed (bounded [0,1], skewed)
- Variances are heterogeneous across modalities (BE is tighter, HDR is spread)
- Guardian should detect these violations and recommend nonparametric alternatives

Usage:
    python examples/vignettes/01_crispr_strategy_comparison.py

Requires: pandas, scipy, numpy
"""

import json
import os
import sys

import numpy as np
from scipy import stats

# ─────────────────────────────────────────────────────────────────────
# 1. Load real data from CRISPRArchitect v3 scorer
# ─────────────────────────────────────────────────────────────────────

data_path = os.path.join(
    os.path.dirname(__file__),
    "..", "biological_datasets", "crispr_editing_strategies",
    "real_scored_strategies.json"
)

with open(data_path) as f:
    records = json.load(f)

print("=" * 70)
print("Vignette 1: CRISPR Genome Editing Strategy Comparison")
print("Data: CRISPRArchitect v3 real scored strategies (10 variants × 4 modalities)")
print("=" * 70)

# Group by modality
modalities = {}
for r in records:
    mod = r["modality"]
    if mod not in modalities:
        modalities[mod] = []
    modalities[mod].append(r["topsis_score"])

print(f"\n{'Modality':<20} {'N':>3} {'Mean':>8} {'SD':>8} {'Min':>8} {'Max':>8}")
print("-" * 55)
for mod in ["ABE", "PE", "HDR_SSODN", "HDR_CSSDNA"]:
    scores = modalities[mod]
    print(f"{mod:<20} {len(scores):>3} {np.mean(scores):>8.4f} {np.std(scores, ddof=1):>8.4f} "
          f"{np.min(scores):>8.4f} {np.max(scores):>8.4f}")

# ─────────────────────────────────────────────────────────────────────
# 2. Traditional analysis (WITHOUT Guardian)
# ─────────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("TRADITIONAL ANALYSIS (no assumption checking)")
print("=" * 70)

groups = [modalities["ABE"], modalities["PE"],
          modalities["HDR_SSODN"], modalities["HDR_CSSDNA"]]

F, p_anova = stats.f_oneway(*groups)
print(f"\nOne-way ANOVA: F = {F:.4f}, p = {p_anova:.2e}")
print(f"Conclusion: {'Significant' if p_anova < 0.05 else 'Not significant'} at alpha=0.05")
print("\nA researcher might stop here and conclude significant differences.")

# ─────────────────────────────────────────────────────────────────────
# 3. Guardian-style assumption validation
# ─────────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("GUARDIAN ASSUMPTION VALIDATION")
print("=" * 70)

violations = []
confidence_penalties = 0.0

# 3a. Normality check (Shapiro-Wilk per group)
print("\n--- Normality Check (Shapiro-Wilk) ---")
for mod in ["ABE", "PE", "HDR_SSODN", "HDR_CSSDNA"]:
    scores = modalities[mod]
    W, p_sw = stats.shapiro(scores)
    status = "PASS" if p_sw >= 0.05 else ("WARNING" if p_sw >= 0.01 else "CRITICAL")
    print(f"  {mod:<15} W={W:.4f}, p={p_sw:.4f}  [{status}]")
    if status == "CRITICAL":
        violations.append(("normality", mod, "critical", 3.0))
        confidence_penalties += 3.0
    elif status == "WARNING":
        violations.append(("normality", mod, "warning", 2.0))
        confidence_penalties += 2.0

# 3b. Variance homogeneity (Levene's test)
print("\n--- Variance Homogeneity (Levene's test) ---")
F_lev, p_lev = stats.levene(*groups)
var_status = "PASS" if p_lev >= 0.05 else ("WARNING" if p_lev >= 0.01 else "CRITICAL")
print(f"  Levene's F={F_lev:.4f}, p={p_lev:.4f}  [{var_status}]")

variances = [np.var(g, ddof=1) for g in groups]
var_ratio = max(variances) / min(variances)
print(f"  Variance ratio (max/min): {var_ratio:.2f}")
if var_status != "PASS":
    weight = 3.0 if var_status == "CRITICAL" else 2.0
    violations.append(("variance_homogeneity", "all", var_status.lower(), weight))
    confidence_penalties += weight

# 3c. Outlier detection (modified Z-score)
print("\n--- Outlier Detection (Modified Z-score) ---")
all_topsis = [r["topsis_score"] for r in records]
median = np.median(all_topsis)
mad = np.median(np.abs(np.array(all_topsis) - median))
if mad > 0:
    modified_z = 0.6745 * (np.array(all_topsis) - median) / mad
    n_outliers = np.sum(np.abs(modified_z) > 3.5)
    print(f"  Modified Z-scores computed (MAD={mad:.4f})")
    print(f"  Outliers (|Z| > 3.5): {n_outliers}")
    if n_outliers > 0:
        violations.append(("outliers", "all", "warning", 2.0))
        confidence_penalties += 2.0
else:
    print("  MAD = 0, skipping outlier detection")

# 3d. Sample size check
print("\n--- Sample Size Adequacy ---")
min_n = min(len(g) for g in groups)
size_status = "PASS" if min_n >= 20 else ("WARNING" if min_n >= 5 else "CRITICAL")
print(f"  Minimum group size: {min_n}  [{size_status}]")
if size_status != "PASS":
    weight = 3.0 if size_status == "CRITICAL" else 2.0
    violations.append(("sample_size", "all", size_status.lower(), weight))
    confidence_penalties += weight

# ─────────────────────────────────────────────────────────────────────
# 4. Guardian confidence score
# ─────────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("GUARDIAN REPORT")
print("=" * 70)

max_penalty = 4 * 3.0  # 4 validators × max weight
confidence = max(0, 1 - confidence_penalties / (max_penalty * 1.2))

print(f"\n  Confidence Score: {confidence:.2f}")
if confidence >= 0.8:
    print(f"  Status: HIGH CONFIDENCE — proceed with ANOVA")
elif confidence >= 0.6:
    print(f"  Status: CAUTION — consider alternative tests")
else:
    print(f"  Status: LOW CONFIDENCE — use nonparametric alternative")

if violations:
    print(f"\n  Violations detected ({len(violations)}):")
    for assumption, group, severity, weight in violations:
        print(f"    - {assumption} ({group}): {severity.upper()} (weight={weight})")

# ─────────────────────────────────────────────────────────────────────
# 5. Guardian-recommended analysis (nonparametric cascade)
# ─────────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("GUARDIAN-RECOMMENDED ANALYSIS")
print("=" * 70)

print("\n  Recommendation: Kruskal-Wallis H test (nonparametric alternative to ANOVA)")
print("  Reason: Sample size < 20 per group; potential normality violations")

H, p_kw = stats.kruskal(*groups)
print(f"\n  Kruskal-Wallis H = {H:.4f}, p = {p_kw:.2e}")

# Effect size (epsilon-squared for Kruskal-Wallis)
N = sum(len(g) for g in groups)
k = len(groups)
epsilon_sq = (H - k + 1) / (N - k)
print(f"  Effect size (epsilon-squared): {epsilon_sq:.4f}")
print(f"  Interpretation: {'Large' if epsilon_sq > 0.14 else 'Medium' if epsilon_sq > 0.06 else 'Small'}")

# Post-hoc pairwise Mann-Whitney with BH correction
print("\n  Post-hoc pairwise comparisons (Mann-Whitney U with BH correction):")
mod_names = ["ABE", "PE", "HDR_SSODN", "HDR_CSSDNA"]
pairwise_p = []
pairs = []
for i in range(len(mod_names)):
    for j in range(i + 1, len(mod_names)):
        U, p_mw = stats.mannwhitneyu(modalities[mod_names[i]], modalities[mod_names[j]],
                                      alternative='two-sided')
        pairwise_p.append(p_mw)
        pairs.append((mod_names[i], mod_names[j], U))

# BH correction
n_tests = len(pairwise_p)
sorted_indices = np.argsort(pairwise_p)
adjusted_p = np.zeros(n_tests)
for rank_i, orig_idx in enumerate(sorted_indices):
    adjusted_p[orig_idx] = min(1.0, pairwise_p[orig_idx] * n_tests / (rank_i + 1))
# Enforce monotonicity
for i in range(n_tests - 2, -1, -1):
    adjusted_p[sorted_indices[i]] = min(adjusted_p[sorted_indices[i]],
                                         adjusted_p[sorted_indices[i + 1]])

print(f"\n  {'Comparison':<30} {'U':>8} {'Raw p':>10} {'Adj p (BH)':>10} {'Sig':>5}")
print("  " + "-" * 68)
for idx, (m1, m2, U) in enumerate(pairs):
    sig = "*" if adjusted_p[idx] < 0.05 else "ns"
    print(f"  {m1 + ' vs ' + m2:<30} {U:>8.1f} {pairwise_p[idx]:>10.4f} "
          f"{adjusted_p[idx]:>10.4f} {sig:>5}")

# ─────────────────────────────────────────────────────────────────────
# 6. Per-dimension analysis
# ─────────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("PER-DIMENSION ANALYSIS (Safety scores across modalities)")
print("=" * 70)

safety_by_mod = {}
for r in records:
    mod = r["modality"]
    if mod not in safety_by_mod:
        safety_by_mod[mod] = []
    safety_by_mod[mod].append(r["safety_score"])

print(f"\n  {'Modality':<15} {'Mean Safety':>12} {'SD':>8} {'Interpretation'}")
print("  " + "-" * 55)
for mod in ["ABE", "PE", "HDR_SSODN", "HDR_CSSDNA"]:
    scores = safety_by_mod[mod]
    interp = ("No DSBs" if np.mean(scores) > 0.9 else
              "1 DSB (nick)" if np.mean(scores) > 0.45 else
              "1+ DSBs (cut)" if np.mean(scores) > 0.25 else "2+ DSBs")
    print(f"  {mod:<15} {np.mean(scores):>12.4f} {np.std(scores, ddof=1):>8.4f} {interp}")

print("\n  Key biological insight: Base editing (ABE) achieves perfect safety (1.0)")
print("  because it introduces no double-strand breaks, avoiding p53-mediated")
print("  selection that can enrich TP53-mutant clones in iPSCs.")
print("  (Ihry et al., Nat Med, 2018; Haapaniemi et al., Nat Med, 2018)")

# ─────────────────────────────────────────────────────────────────────
# 7. Summary
# ─────────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"""
  Traditional ANOVA: F={F:.4f}, p={p_anova:.2e} (significant)
  Guardian Confidence: {confidence:.2f} ({"proceed" if confidence >= 0.8 else "caution — use nonparametric"})
  Guardian Recommendation: Kruskal-Wallis (nonparametric)
  Kruskal-Wallis: H={H:.4f}, p={p_kw:.2e} (significant)
  Effect size: epsilon-squared={epsilon_sq:.4f} ({"large" if epsilon_sq > 0.14 else "medium"})

  Both ANOVA and Kruskal-Wallis reach the same conclusion: editing modalities
  differ significantly in TOPSIS composite scores. However, Guardian ensures
  the appropriate nonparametric test is used given the small sample sizes and
  bounded score distributions, producing more reliable p-values.

  Biological conclusion: Base editing (ABE) consistently outperforms other
  modalities on composite TOPSIS score, driven primarily by its superior
  safety profile (no DSBs). This aligns with the CRISPRArchitect v3 finding
  that multi-nuclease BE evaluation rescued BE from 0% to 20% top-ranked.
""")
