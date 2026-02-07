# StickForStats Demo Datasets

These datasets are designed to demonstrate all major features of StickForStats during presentations and testing. Each dataset is carefully crafted to show specific capabilities.

## Directory Structure

```
demo_datasets/
├── 01_ttest/                    # T-Test demonstrations
│   ├── anxiety_treatment.csv    # Clean data - assumptions met
│   ├── blood_pressure.csv       # Clean paired data
│   └── with_outlier.csv         # Shows Guardian catching outliers
│
├── 02_anova/                    # ANOVA demonstrations
│   ├── drug_efficacy.csv        # 3-group comparison
│   └── factorial_design.csv     # 2x2 factorial
│
├── 03_correlation/              # Correlation demonstrations
│   ├── study_hours_grades.csv   # Linear relationship
│   └── nonlinear_example.csv    # Shows Guardian linearity check
│
├── 04_causal/                   # Causal Inference demonstrations
│   ├── treatment_confounded.csv # DAG with confounder
│   └── propensity_example.csv   # Propensity score matching
│
├── 05_mixed_models/             # Mixed Models demonstrations
│   ├── students_classrooms.csv  # Nested data for ICC
│   └── repeated_measures.csv    # Longitudinal data
│
├── 06_meta_analysis/            # Meta-Analysis demonstrations
│   └── published_studies.csv    # Effect sizes from studies
│
├── 07_guardian_demos/           # Specific Guardian violation demos
│   ├── non_normal.csv           # Triggers normality warning
│   ├── unequal_variance.csv     # Triggers Levene's warning
│   ├── extreme_outliers.csv     # Triggers outlier detection
│   └── small_sample.csv         # Triggers sample size warning
│
└── 08_real_world/               # Realistic research scenarios
    ├── clinical_trial.csv       # Full clinical trial data
    └── psychology_study.csv     # Behavioral experiment
```

## Quick Reference: Which Dataset for Which Demo

| Demo Purpose | Use This File | Expected Result |
|--------------|---------------|-----------------|
| Basic t-test (clean) | `01_ttest/anxiety_treatment.csv` | All green, ~94% confidence |
| Show Guardian catching outlier | `01_ttest/with_outlier.csv` | Yellow/red warning |
| ANOVA 3 groups | `02_anova/drug_efficacy.csv` | All green |
| Correlation | `03_correlation/study_hours_grades.csv` | Strong positive r |
| Causal DAG | `04_causal/treatment_confounded.csv` | Identifies confounder |
| Mixed model ICC | `05_mixed_models/students_classrooms.csv` | Shows clustering |
| Guardian normality | `07_guardian_demos/non_normal.csv` | Normality warning |

## Data Sources

All datasets are **simulated based on published research patterns**:
- Psychology anxiety data: Based on CBT vs medication meta-analyses
- Clinical trial data: Based on typical Phase III patterns
- Educational data: Based on educational psychology literature

No real participant data is included. All values are generated to demonstrate statistical properties.
