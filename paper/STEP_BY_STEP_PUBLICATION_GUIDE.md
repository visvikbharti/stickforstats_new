# Step-by-Step Publication Guide for StickForStats

**Created:** December 16, 2025
**Purpose:** Detailed instructions for each step toward publication

---

## STEP 1: Make the Publication Decision

### Your Three Options

#### Option A: JOSS (Journal of Open Source Software) - FASTEST
**What it is:** A peer-reviewed journal for research software
**Time to submit:** 1-2 days
**Review time:** ~2-4 weeks
**Requirements:**
- Short paper (250-1000 words) - we already exceed this
- Functional, documented software ✅
- Open source with license ✅
- Statement of need ✅

**Pros:**
- Can submit THIS WEEK
- Get a citable DOI quickly
- Establishes publication priority
- Less demanding review process

**Cons:**
- Lower prestige than JSS
- Less detailed methodology publication

---

#### Option B: JSS (Journal of Statistical Software) - HIGHEST PRESTIGE
**What it is:** The premier journal for statistical software papers
**Time to submit:** 4-6 weeks additional work
**Review time:** 3-6 months
**Requirements:**
- 25-40 page paper (currently have 11)
- Real data case studies
- Comprehensive validation
- Detailed code examples

**Pros:**
- Highest prestige in the field
- Thorough peer review improves paper
- More citations typically

**Cons:**
- Significant additional work needed
- Longer timeline

---

#### Option C: Split Strategy - RECOMMENDED
**Submit JOSS now, JSS later**

**Timeline:**
1. Week 1: Submit to JOSS (establish priority)
2. Weeks 2-6: Expand paper for JSS
3. Week 6+: Submit to JSS

**Pros:**
- Get DOI quickly
- Take time to strengthen JSS submission
- No rush, better quality

---

### Decision Matrix

| If your priority is... | Choose |
|------------------------|--------|
| Fast publication for CV/thesis | JOSS |
| Maximum prestige | JSS (wait and expand) |
| Both speed AND prestige | Split Strategy |
| Need to cite in upcoming work | JOSS first |

---

## STEP 2: If Choosing JOSS (or Split Strategy - JOSS First)

### 2.1 Prepare JOSS Paper

JOSS requires a `paper.md` file in your repository. Here's what you need:

```markdown
---
title: 'StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation'
tags:
  - Python
  - statistics
  - assumption testing
  - reproducibility
  - Guardian system
authors:
  - name: Vishal Bharti
    orcid: [YOUR-ORCID-HERE]
    affiliation: "1, 2"
  - name: Debojyoti Chakraborty
    orcid: [PI-ORCID-HERE]
    corresponding: true
    affiliation: "1, 2"
affiliations:
  - name: Division of Chemical and Systems Biology, CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India
    index: 1
  - name: Academy of Scientific and Innovative Research (AcSIR), Ghaziabad 201002, India
    index: 2
date: December 2025
bibliography: paper.bib
---

# Summary

StickForStats is a web-based statistical analysis platform that addresses
a critical gap in statistical software: the automatic validation of
statistical assumptions before analysis execution.

# Statement of Need

Statistical assumption violations are a significant contributor to the
reproducibility crisis in science. While assumption tests exist in all
major statistical packages, users must explicitly request them, and many
do not. StickForStats introduces the Guardian system, which automatically
validates assumptions and integrates results directly into analysis output.

# The Guardian System

Guardian implements eight validators that run automatically:
- Normality (Shapiro-Wilk, Anderson-Darling)
- Variance homogeneity (Levene, Bartlett)
- Independence (Durbin-Watson, runs test)
- Outlier detection (IQR, Z-score, Grubbs)
- Sample size adequacy
- Modality (unimodal vs multimodal)
- Linearity (for regression)
- Homoscedasticity (Breusch-Pagan)

# Key Features

- Automatic assumption validation integrated into every analysis
- High-precision computing (50 decimal places via mpmath)
- 58 interactive educational lessons
- Python code export for reproducibility
- Validation against SciPy to 14+ decimal places

# References
```

### 2.2 JOSS Submission Checklist

- [ ] Get ORCID iDs for both authors (https://orcid.org)
- [ ] Create `paper.md` in repository root
- [ ] Create `paper.bib` with references
- [ ] Ensure README has installation instructions
- [ ] Ensure CONTRIBUTING.md exists
- [ ] Ensure LICENSE file exists
- [ ] Submit at https://joss.theoj.org/papers/new

### 2.3 Required Files for JOSS

```
repository/
├── paper.md          # JOSS paper (create this)
├── paper.bib         # References (create this)
├── README.md         # ✅ Already exists
├── CONTRIBUTING.md   # ✅ Already exists
├── LICENSE           # ✅ Already exists
└── ...
```

---

## STEP 3: If Choosing JSS (or Split Strategy - JSS Later)

### 3.1 Content That Must Be Added

| Section | Pages Needed | What to Write |
|---------|--------------|---------------|
| Real Data Case Study | 3-4 | Analysis of published dataset |
| Expanded Code Examples | 3-4 | Complete API tutorial |
| Algorithm Pseudocode | 2 | Guardian pipeline details |
| Software Comparison | 1-2 | Feature matrix vs SPSS, R, jamovi |
| Expanded Limitations | 1-2 | Honest boundary discussion |
| **TOTAL** | **10-14** | |

### 3.2 Real Data Case Study Options

**Option 1: Fisher's Iris Dataset**
- Classic, well-understood
- Known to have assumption issues (species groups differ)
- Available in scipy/sklearn

**Option 2: UCI Machine Learning Repository**
- Many datasets with documented issues
- Citable source
- Examples: Wine Quality, Heart Disease

**Option 3: Published Paper Replication**
- Find a paper with questionable statistics
- Show Guardian catching issues
- Most impactful but sensitive

### 3.3 Golden Ratio Issue Resolution

**The Problem:** No empirical justification for φ-based weights

**Solutions (choose one):**

**A. Simplify to intuitive weights:**
```python
# Instead of golden ratio
penalties = {
    'critical': 3.0,  # 3x penalty for critical issues
    'warning': 2.0,   # 2x penalty for warnings
    'minor': 1.0      # 1x for minor issues
}
```
Justification: "Weights reflect severity hierarchy where critical violations are weighted 3x and warnings 2x relative to minor issues."

**B. Make configurable:**
```python
# User can adjust
DEFAULT_WEIGHTS = {'critical': 3.0, 'warning': 2.0, 'minor': 1.0}
# Document that defaults can be changed
```
Justification: "Default weights can be adjusted based on domain requirements."

**C. Keep golden ratio but justify:**
Add sensitivity analysis showing results are robust across weight choices.

---

## STEP 4: Address the Golden Ratio (Required for Either Path)

### Current Code Location
`backend/core/guardian/guardian_core.py`, lines 24, 256-261

### Recommended Fix (Option A - Simplify)

Change from:
```python
PHI = Decimal(1 + 5**0.5) / 2
penalties = {
    'critical': float(PHI ** 2),  # ~2.618
    'warning': float(PHI),         # ~1.618
    'minor': 1.0
}
```

To:
```python
# Severity-based weights (critical issues penalized 3x, warnings 2x)
SEVERITY_WEIGHTS = {
    'critical': 3.0,
    'warning': 2.0,
    'minor': 1.0
}
```

### Paper Language Update

Change: "golden ratio-based confidence scoring"
To: "severity-weighted confidence scoring where critical violations receive 3x penalty and warnings receive 2x penalty relative to minor issues"

---

## STEP 5: Create Real Data Case Study

### Recommended: Fisher's Iris Analysis

**Why Iris?**
- Universally known
- Has actual assumption issues (multimodality, heteroscedasticity across species)
- Perfect for demonstrating Guardian value

**What to Show:**
1. Load Iris data
2. Attempt one-way ANOVA (sepal length ~ species)
3. Guardian catches: normality issues in some groups, variance heterogeneity
4. Compare: What would SPSS/R show without explicit assumption tests?

### Code for Case Study

```python
from sklearn.datasets import load_iris
import pandas as pd
from scipy import stats

# Load data
iris = load_iris()
df = pd.DataFrame(iris.data, columns=iris.feature_names)
df['species'] = iris.target

# Traditional approach: Just run ANOVA
groups = [df[df['species']==i]['sepal length (cm)'] for i in range(3)]
f_stat, p_val = stats.f_oneway(*groups)
print(f"ANOVA: F={f_stat:.4f}, p={p_val:.4f}")

# Guardian approach: Check assumptions FIRST
# Normality per group
for i, name in enumerate(['setosa', 'versicolor', 'virginica']):
    stat, p = stats.shapiro(groups[i])
    print(f"{name} normality: W={stat:.4f}, p={p:.4f}")

# Variance homogeneity
stat, p = stats.levene(*groups)
print(f"Levene's test: W={stat:.4f}, p={p:.4f}")
```

---

## STEP 6: Submission Preparation

### For JOSS
1. Go to https://joss.theoj.org/papers/new
2. Enter repository URL
3. System auto-checks requirements
4. Submit and wait for editor assignment

### For JSS
1. Compile final PDF using Docker
2. Prepare supplementary materials ZIP
3. Go to https://www.jstatsoft.org/author
4. Create account and submit
5. Write cover letter highlighting Guardian novelty

---

## Quick Decision Guide

**Answer these questions:**

1. Do you need a publication within the next month?
   - Yes → JOSS or Split Strategy
   - No → Can consider JSS directly

2. Is this for a thesis/defense deadline?
   - Yes → JOSS first (faster DOI)
   - No → Flexibility in choice

3. How much time can you dedicate in the next 4-6 weeks?
   - Limited → JOSS
   - Significant → JSS
   - Some → Split Strategy

4. What does Dr. Chakraborty prefer?
   - Discuss with him using this document

---

## Immediate Next Steps (Today)

1. [ ] Share this document and CRITICAL_ASSESSMENT with Dr. Chakraborty
2. [ ] Decide: JOSS / JSS / Split Strategy
3. [ ] Get ORCID iDs if you don't have them
4. [ ] If JOSS: I can help create paper.md now
5. [ ] If JSS: I can help expand the paper sections

---

*Document created to guide publication decisions*
*Share with Dr. Chakraborty for discussion*
