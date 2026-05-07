# StickForStats Replication Package

This package contains all materials needed to reproduce the results presented in the JSS paper "StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation."

## Contents

```
replication/
├── README.md                    # This file
├── run_all_validations.py       # Master script to run all validations
├── validate_ttest.py            # T-test validation
├── validate_anova.py            # ANOVA validation
├── validate_correlation.py      # Correlation validation
├── validate_meta_analysis.py    # Meta-analysis validation
├── validate_power.py            # Power analysis validation
├── validate_guardian.py         # Guardian assumption detection validation
├── data/
│   └── test_datasets.json       # All test data used in paper
└── expected_output/
    └── expected_results.json    # Expected results for comparison
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
python run_all_validations.py
```

### Run Individual Validations
```bash
python validate_ttest.py
python validate_anova.py
python validate_correlation.py
python validate_meta_analysis.py
python validate_power.py
python validate_guardian.py
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

### Table 4 (Validation Summary)

Run `run_all_validations.py` to reproduce all values in Table 4.

### Case Study 1 (Non-Normal Data)

```python
from scipy.stats import shapiro
data = [1.2, 1.5, 1.8, 2.0, 2.1, 2.3, 2.5, 15.0, 18.0, 25.0]
w, p = shapiro(data)
print(f"Shapiro-Wilk W = {w:.3f}, p = {p:.5f}")
# Expected: W = 0.699, p = 0.00086
```

### Case Study 2 (Linearity)

See `validate_linearity.py` for the polynomial vs. linear R² comparison.

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
