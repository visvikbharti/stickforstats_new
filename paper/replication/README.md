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

See `validate_meta_analysis.py` for DerSimonian-Laird calculations.

## Data Sources

All test data in this replication package was generated specifically for validation purposes. No real participant data is included.

## Contact

For questions about replication:
- GitHub Issues: https://github.com/visvikbharti/stickforstats_new/issues

## License

MIT License - see repository for details.
