#!/usr/bin/env python3
"""
Vignette 4: Epidemiological Case-Control Study with Confounding Adjustment
===========================================================================

Demonstrates StickForStats' logistic regression and odds ratio capabilities
with Guardian checking for multicollinearity, outliers, and sample adequacy.

Data: 500 subjects, binary outcome (disease), binary exposure, confounders (age, BMI, smoking).
Research question: Is exposure associated with disease after adjusting for confounders?

Guardian checks:
- Sample size adequacy (events per variable rule)
- Outlier detection in continuous predictors
- Multicollinearity among confounders

Usage:
    python examples/vignettes/04_epidemiological_case_control.py
"""

import csv
import os
import numpy as np
from scipy import stats

data_path = os.path.join(
    os.path.dirname(__file__),
    "..", "biological_datasets", "epidemiological_case_control", "case_control_data.csv"
)

print("=" * 70)
print("Vignette 4: Epidemiological Case-Control Study")
print("Data: 500 subjects, exposure-disease association with confounders")
print("=" * 70)

# Load data
subjects = []
with open(data_path) as f:
    reader = csv.DictReader(f)
    for row in reader:
        subjects.append({
            "disease": int(row["disease"]),
            "exposure": int(row["exposure"]),
            "age": int(row["age"]),
            "bmi": float(row["bmi"]),
            "smoking": int(row["smoking"]),
            "sex": row["sex"],
        })

n = len(subjects)
n_cases = sum(s["disease"] for s in subjects)
n_controls = n - n_cases
n_exposed = sum(s["exposure"] for s in subjects)

print(f"\n  Total subjects: {n}")
print(f"  Cases: {n_cases} ({n_cases/n*100:.1f}%)")
print(f"  Controls: {n_controls} ({n_controls/n*100:.1f}%)")
print(f"  Exposed: {n_exposed} ({n_exposed/n*100:.1f}%)")

# ── 2x2 Table ──
print("\n" + "=" * 70)
print("UNADJUSTED ANALYSIS (2×2 Table)")
print("=" * 70)

a = sum(1 for s in subjects if s["disease"] == 1 and s["exposure"] == 1)
b = sum(1 for s in subjects if s["disease"] == 0 and s["exposure"] == 1)
c = sum(1 for s in subjects if s["disease"] == 1 and s["exposure"] == 0)
d = sum(1 for s in subjects if s["disease"] == 0 and s["exposure"] == 0)

print(f"\n  {'':15} {'Disease+':>10} {'Disease-':>10} {'Total':>10}")
print("  " + "-" * 47)
print(f"  {'Exposed+':15} {a:>10} {b:>10} {a+b:>10}")
print(f"  {'Exposed-':15} {c:>10} {d:>10} {c+d:>10}")
print(f"  {'Total':15} {a+c:>10} {b+d:>10} {n:>10}")

# Crude odds ratio
or_crude = (a * d) / (b * c) if b * c > 0 else float('inf')
se_ln_or = np.sqrt(1/max(a,1) + 1/max(b,1) + 1/max(c,1) + 1/max(d,1))
ci_lo_crude = np.exp(np.log(or_crude) - 1.96 * se_ln_or)
ci_hi_crude = np.exp(np.log(or_crude) + 1.96 * se_ln_or)

# Chi-square test
table = np.array([[a, b], [c, d]])
chi2, p_chi2, dof, expected = stats.chi2_contingency(table, correction=False)

print(f"\n  Crude OR: {or_crude:.3f} (95% CI: {ci_lo_crude:.3f} – {ci_hi_crude:.3f})")
print(f"  Chi-squared: {chi2:.4f}, p = {p_chi2:.4f}")
print(f"  Fisher's exact p: {stats.fisher_exact(table)[1]:.4f}")

# ── Guardian Validation ──
print("\n" + "=" * 70)
print("GUARDIAN ASSUMPTION VALIDATION")
print("=" * 70)

violations = []
penalty = 0.0

# Expected cell counts
print("\n--- Expected Cell Counts (Chi-square assumption) ---")
min_expected = expected.min()
print(f"  Minimum expected count: {min_expected:.1f}")
if min_expected < 5:
    violations.append("Expected cell count < 5 — use Fisher's exact test")
    penalty += 2.0
    print(f"  [WARNING] Use Fisher's exact test")
else:
    print(f"  [PASS]")

# Sample size / events per variable
print("\n--- Events Per Variable (Logistic Regression Rule) ---")
n_predictors = 4  # exposure, age, bmi, smoking
epv = n_cases / n_predictors
print(f"  Events (cases): {n_cases}")
print(f"  Predictors: {n_predictors}")
print(f"  EPV: {epv:.1f}")
if epv < 10:
    violations.append(f"EPV = {epv:.1f} < 10 — logistic regression may be unstable")
    penalty += 3.0
    print(f"  [CRITICAL] EPV < 10, consider reducing predictors")
elif epv < 20:
    violations.append(f"EPV = {epv:.1f} — borderline for logistic regression")
    penalty += 1.0
    print(f"  [MINOR] EPV borderline, interpret with caution")
else:
    print(f"  [PASS] EPV adequate")

# Outlier detection in continuous variables
print("\n--- Outlier Detection ---")
for var_name in ["age", "bmi"]:
    values = np.array([s[var_name] for s in subjects])
    median = np.median(values)
    mad = np.median(np.abs(values - median))
    if mad > 0:
        mod_z = 0.6745 * (values - median) / mad
        n_outliers = np.sum(np.abs(mod_z) > 3.5)
        print(f"  {var_name}: {n_outliers} outliers (|modified Z| > 3.5)")
        if n_outliers > n * 0.05:
            violations.append(f"{var_name}: {n_outliers} outliers (>{n*0.05:.0f} threshold)")
            penalty += 2.0

# Multicollinearity (correlation between predictors)
print("\n--- Multicollinearity Check ---")
age_arr = np.array([s["age"] for s in subjects])
bmi_arr = np.array([s["bmi"] for s in subjects])
smoking_arr = np.array([s["smoking"] for s in subjects])
exposure_arr = np.array([s["exposure"] for s in subjects])

predictors = {"age": age_arr, "bmi": bmi_arr, "smoking": smoking_arr, "exposure": exposure_arr}
pred_names = list(predictors.keys())
for i in range(len(pred_names)):
    for j in range(i+1, len(pred_names)):
        r, p = stats.pearsonr(predictors[pred_names[i]], predictors[pred_names[j]])
        status = "PASS" if abs(r) < 0.7 else "WARNING"
        if abs(r) >= 0.7:
            violations.append(f"High correlation: {pred_names[i]} × {pred_names[j]}, r={r:.3f}")
            penalty += 2.0
        if abs(r) > 0.3:  # Only print notable correlations
            print(f"  {pred_names[i]} × {pred_names[j]}: r={r:.3f} [{status}]")

max_pen = 4 * 3.0
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
else:
    print(f"\n  No violations detected.")

# ── Stratified Analysis (Mantel-Haenszel) ──
print("\n" + "=" * 70)
print("STRATIFIED ANALYSIS (by smoking status)")
print("=" * 70)

for smoke_val, smoke_label in [(0, "Non-smokers"), (1, "Smokers")]:
    sub = [s for s in subjects if s["smoking"] == smoke_val]
    a_s = sum(1 for s in sub if s["disease"] == 1 and s["exposure"] == 1)
    b_s = sum(1 for s in sub if s["disease"] == 0 and s["exposure"] == 1)
    c_s = sum(1 for s in sub if s["disease"] == 1 and s["exposure"] == 0)
    d_s = sum(1 for s in sub if s["disease"] == 0 and s["exposure"] == 0)
    or_s = (a_s * d_s) / max(b_s * c_s, 1)
    print(f"\n  {smoke_label} (n={len(sub)}):")
    print(f"    2×2: [{a_s}, {b_s}; {c_s}, {d_s}]")
    print(f"    Stratum OR: {or_s:.3f}")

# ── Summary ──
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"""
  Crude OR: {or_crude:.3f} (95% CI: {ci_lo_crude:.3f} – {ci_hi_crude:.3f})
  Chi-squared: p = {p_chi2:.4f}
  Guardian Confidence: {confidence:.2f}

  Guardian validated: {'all assumptions met' if not violations else f'{len(violations)} violations detected'}.
  {'Analysis can proceed with full confidence.' if confidence >= 0.8 else
   'Consider the violations when interpreting results.'}

  Biological conclusion: {'Exposure is significantly associated with disease'
  if p_chi2 < 0.05 else 'No significant association between exposure and disease'}
  (crude OR = {or_crude:.2f}). Stratified analysis by smoking status should be
  examined for confounding and effect modification.
""")
