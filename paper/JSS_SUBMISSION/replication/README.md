# Replication Materials for StickForStats JSS Paper

## Overview

This directory contains all scripts and data needed to independently reproduce
the numerical results presented in the paper:

> **StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation**
> Vishal Bharti and Debojyoti Chakraborty

Every statistical claim in the manuscript can be verified by running these
scripts. Results are validated against reference implementations in SciPy,
NumPy, and (optionally) R.

## Requirements

**Python** (>= 3.9):

```
pip install -r requirements.txt
```

**R** (>= 4.1, optional): Only needed for `validate_against_R.R`.

## Quick Start

To verify all paper results with a single command:

```bash
python MASTER_VERIFICATION.py
```

Expected runtime: under 60 seconds on a modern machine.

## File Descriptions

### Master Scripts

| File | Description |
|------|-------------|
| `MASTER_VERIFICATION.py` | **Entry point.** Orchestrates all verification scripts and prints a consolidated pass/fail summary. Run this first. |
| `run_all_validations.py` | Validates core statistical computations (t-test, ANOVA, correlation, meta-analysis, Guardian normality, Guardian variance) against SciPy reference values to 14+ decimal places. |

### Case Study Verification

| File | Description |
|------|-------------|
| `verify_case_studies_FINAL.py` | **Definitive case study verification** (updated Feb 19, 2026). Reproduces all three paper case studies: (1) Fisher's Iris ANOVA with Guardian variance detection, (2) UCI Wine Quality correlation with Guardian ordinal-data detection, (3) simulated meta-analysis with Egger's publication bias test. |
| `verify_real_data_analysis.py` | Earlier verification of the same three case studies with full Guardian assumption-checking output. |

### Dataset-Specific Validation

| File | Description |
|------|-------------|
| `validate_wine_quality_REAL.py` | Downloads and analyzes the real UCI Wine Quality dataset (Cortez et al., 2009). Computes Pearson and Spearman correlations, Shapiro-Wilk normality tests, and linearity checks for both red and white wines. |
| `additional_real_data_analysis.py` | Validates Guardian assumption checking on three classic R datasets (mtcars, ToothGrowth, PlantGrowth) covering regression, t-test, and ANOVA scenarios. |
| `validate_meta_analysis_paper_data.py` | Verifies the DerSimonian-Laird random-effects meta-analysis and Egger's test using the exact 12-study simulated data from the paper. |

### Meta-Analysis Data Generation

| File | Description |
|------|-------------|
| `create_correct_meta_analysis_data.py` | Generates the simulated meta-analysis data used in Case Study 3. Searches for a seed that produces a pedagogically clear example of publication bias with significant Egger's test and low heterogeneity. |
| `find_optimal_meta_data.py` | Systematic search over 1000 seeds to find meta-analysis data with Egger's p between 0.01 and 0.05. Produces the exact data and LaTeX code used in the paper. |

### Cross-Language Validation

| File | Description |
|------|-------------|
| `validate_against_R.R` | R script that independently validates all statistical results against R's built-in functions. Covers t-test, ANOVA, correlation, Shapiro-Wilk, Levene's test, Fisher's Iris (Case Study 1), and UCI Wine Quality (Case Study 2). Requires R >= 4.1. |

### Data

| Path | Description |
|------|-------------|
| `data/winequality-red.csv` | UCI Wine Quality red wine dataset (1,599 samples, Cortez et al., 2009). |
| `data/winequality-white.csv` | UCI Wine Quality white wine dataset (4,898 samples, Cortez et al., 2009). |

## What Gets Verified

### Case Study 1: Fisher's Iris (ANOVA)
- ANOVA F-statistic (F = 119.26, p < 2.2e-16)
- Levene's test for variance homogeneity (p ~ 0.002)
- Variance ratio across species (3.25)
- Effect size (eta-squared = 0.619)
- Guardian's recommendation of Welch's ANOVA

### Case Study 2: UCI Wine Quality (Correlation)
- Pearson r = 0.476 (red wine, alcohol vs. quality)
- Spearman rho = 0.479
- Guardian's detection of ordinal data violating Pearson assumptions
- Shapiro-Wilk normality tests

### Case Study 3: Simulated Meta-Analysis (Publication Bias)
- DerSimonian-Laird random-effects pooled estimate
- Heterogeneity statistics (I-squared, Q)
- Egger's regression test for funnel plot asymmetry
- All simulation data honestly labeled as such

### Core Statistical Accuracy
- Independent t-test: exact agreement with SciPy (15+ digits)
- One-way ANOVA: exact agreement with SciPy (14+ digits)
- Pearson correlation: exact agreement with SciPy (16+ digits)
- Meta-analysis (DerSimonian-Laird): exact agreement with manual calculation
- Guardian normality detection (Shapiro-Wilk): matches expected W and p
- Guardian variance detection (Levene's): matches expected F and p

## Reproducibility Notes

- All random seeds are fixed (`np.random.seed(42)`, `np.random.seed(123)`,
  `set.seed(42)` in R) for deterministic results.
- The Wine Quality dataset is bundled in `data/`. If missing, scripts will
  attempt to download it from the UCI ML Repository.
- Results have been tested on Python 3.9, 3.10, and 3.11 (macOS and Linux).
- R cross-validation tested on R 4.4.1.

## Data Sources

| Dataset | Source | Type |
|---------|--------|------|
| Fisher's Iris | `sklearn.datasets.load_iris()` | Real (Fisher, 1936) |
| UCI Wine Quality | UCI ML Repository | Real (Cortez et al., 2009) |
| mtcars | R built-in dataset | Real (Motor Trend, 1974) |
| ToothGrowth | R built-in dataset | Real (Crampton, 1947) |
| PlantGrowth | R built-in dataset | Real (Dobson, 1983) |
| Meta-analysis | Simulated (seed-based) | Simulated (honestly labeled) |

## Contact

- Vishal Bharti (Corresponding Author), CSIR-IGIB: vishalvikashbharti@gmail.com
- Debojyoti Chakraborty (Corresponding Author), CSIR-IGIB / AcSIR: debojyoti.chakraborty@igib.in

## License

Open source -- see the main repository for license details.
