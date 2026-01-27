# Replication Materials for StickForStats JSS Paper

## Overview

This directory contains all scripts needed to reproduce the numerical results presented in the paper "StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation."

## Requirements

```
Python >= 3.8
NumPy >= 1.24
SciPy >= 1.11
scikit-learn >= 1.3 (optional, for Iris dataset loading)
```

Install requirements:
```bash
pip install numpy scipy scikit-learn
```

## Files

| File | Description |
|------|-------------|
| `replicate_all.py` | **Main replication script** - reproduces ALL paper results |
| `run_all_validations.py` | SciPy validation (14+ decimal agreement) |
| `verify_real_data_analysis.py` | Iris, Wine, Meta-analysis case studies |
| `additional_real_data_analysis.py` | mtcars, ToothGrowth, PlantGrowth datasets |

## Quick Start

To reproduce all results with a single command:

```bash
python replicate_all.py
```

Expected runtime: < 30 seconds

## What Gets Verified

1. **SciPy Agreement**: Computational accuracy to 14+ decimal places
2. **Fisher's Iris**: ANOVA F=119.26, Levene's p=0.0023, variance ratio=3.25
3. **Wine-like Correlation**: Ordinal data violation, Spearman recommendation
4. **Meta-analysis**: Pooled effect=0.271, Egger's p=0.024 (publication bias)
5. **Additional Datasets**: mtcars, ToothGrowth, PlantGrowth analyses

## Reproducibility Notes

- All random seeds are fixed (np.random.seed(42) and np.random.seed(123))
- Results are deterministic across runs
- Tested on Python 3.9, 3.10, and 3.11

## Contact

Vishal Bharti (Corresponding Author)
CSIR-Institute of Genomics and Integrative Biology (IGIB)
Email: vishalvikashbharti@gmail.com

Debojyoti Chakraborty (Corresponding Author)
Email: debojyoti.chakraborty@igib.in

## License

Open source - see main repository for details.
