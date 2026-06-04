# StickForStats Replication Package

This package contains the materials needed to reproduce the results presented in the StickForStats manuscript (assumption-aware statistical analysis with automatic validation).

## Contents

```
replication/
├── README.md                      # This file
├── MASTER_VERIFICATION.py         # Runs every verification below; exits non-zero if any fail
├── run_all_validations.py         # SciPy reference checks (t-test, ANOVA, correlation, normality, variance)
├── case_study_1_crispr.py         # Case Study 1 — CRISPR TOPSIS (ANOVA → Guardian → Kruskal-Wallis)
├── verify_case_studies_FINAL.py   # Iris (ANOVA) + Wine (correlation), real data
├── validate_wine_quality_REAL.py  # UCI Wine Quality (red + white), Pearson/Spearman
├── verify_meta_analysis_real.py   # IV-magnesium meta-analysis (Egger 1997), cross-validated vs R metafor
├── case_study_4_genomics.py       # Case Study 4 — real RNA-seq (GSE271517) with Guardian
├── additional_real_data_analysis.py
├── validate_against_R.R           # R cross-validation
├── data/                          # Cached datasets (e.g. winequality-red.csv)
├── expected_output/
└── manuscript_validation/         # Retrospective-verification corpus study (the validate_corpus run)
```

## Requirements

```
Python >= 3.10
scipy >= 1.11.0
numpy >= 1.24.0
```

Install dependencies:
```bash
pip install scipy numpy
```

## Running Validations

### Run All Validations
```bash
python MASTER_VERIFICATION.py    # runs every script below; exits non-zero if any fail
```

### Run Individual Verifications
```bash
python run_all_validations.py        # SciPy reference checks (t-test, ANOVA, correlation, normality, variance)
python case_study_1_crispr.py        # Case Study 1 (CRISPR TOPSIS)
python verify_case_studies_FINAL.py  # Iris + Wine (real data)
python verify_meta_analysis_real.py  # IV-magnesium meta-analysis (vs R metafor)
python case_study_4_genomics.py      # Case Study 4 (RNA-seq GSE271517)
```

## Expected Output

Each validation script prints:
1. Test data used
2. SciPy reference result
3. Expected result from paper
4. PASS/FAIL status

Example output:
```
=== T-TEST VALIDATION ===
Data:
  Group 1: [23.5, 25.1, 22.8, 24.3, 26.0, 23.9, 24.7, 25.5, 22.1, 24.8]
  Group 2: [28.2, 29.5, 27.8, 30.1, 28.9, 29.3, 27.5, 30.2, 28.6, 29.8]

SciPy Result:
  t-statistic: -9.681839102936346
  p-value: 1.4654735402139705e-08

Paper Claims:
  t-statistic: -9.681839102936346
  p-value: 1.4655e-08

Status: PASS (exact match to 15 decimal places)
```

## Reproducing Specific Results

### SciPy reference validation

Run `run_all_validations.py` to reproduce the SciPy reference checks (t-test,
ANOVA, correlation, normality, and variance-homogeneity).

### Case Study 1 (CRISPR editing-strategy comparison)

See `case_study_1_crispr.py` for the CRISPRArchitect v3 TOPSIS-score comparison
(Guardian detected non-normality and cascaded ANOVA F = 1122.10 to
Kruskal-Wallis H = 36.59).

### Case Study 2 (Wine Quality correlation)

See `validate_wine_quality_REAL.py` (and the Wine block of
`verify_case_studies_FINAL.py`) for the UCI Wine Quality ordinal-correlation
analysis (Pearson r = 0.476, Spearman ρ = 0.479).

### Case Study 3 (Meta-Analysis)

See `verify_meta_analysis_real.py` for the real Egger 1997 IV-magnesium
data (k = 16 trials, `metafor::dat.egger2001`) and the DerSimonian-Laird
calculation cross-validated against R metafor 4.8.0 to 4+ decimal
places.

### Case Study 4 (Real RNA-seq with Guardian)

See `case_study_4_genomics.py` for the GSE271517 (Chen Y et al. 2024,
*Adv Sci* 11(41):e2404510, PMID 39257029) synovial-sarcoma dataset.
The script:

1. Downloads the raw count matrix (~3 MB) from NCBI GEO if not cached.
2. MD5-checks the download.
3. Runs the production genomics differential-expression module
   (`backend/core/services/genomics/differential_expression.py`) with
   Guardian's per-gene Shapiro-Wilk + Levene's cascade.
4. Runs a naive parametric baseline (per-gene Welch t-test) on the same
   data.
5. Verifies 13 specific manuscript claims (sample counts, gene counts,
   cascade rate ~ 90.55 %, hit-list counts, MKI67 + TOP2A behaviour).
6. Exits 0 on PASS, non-zero on FAIL.

The full Phase A→G working directory (plan, tracker, audit log,
evidence, intermediate scripts, outputs) is at
`paper/replication/case_study_4/`. Read its `PLAN_*.md` and `AUDIT_LOG_*.md`
for the complete provenance.

```bash
python case_study_4_genomics.py
# Expected: "CASE STUDY 4 REPLICATION: PASS (13/13 checks)"
# Runtime ~ 20 s (after first run; first run downloads ~3 MB from GEO)
```

## Data Sources

All test data in this replication package is real, public, and
peer-reviewed:

1. Standard reference datasets (Iris, Wine, mtcars, ToothGrowth,
   PlantGrowth) from sklearn / R.
2. IV Magnesium meta-analysis (Egger 1997 BMJ; Sterne 2001 J Clin Epi) —
   classic published example for funnel-plot asymmetry.
3. Synovial sarcoma RNA-seq (Chen Y et al. 2024 Adv Sci, PMID 39257029,
   GEO GSE271517) — 91 tumours from 55 patients; downloaded by the
   `case_study_4_genomics.py` script.

## Contact

For questions about replication:
- GitHub Issues: https://github.com/visvikbharti/stickforstats_new/issues

## License

MIT License - see repository for details.
