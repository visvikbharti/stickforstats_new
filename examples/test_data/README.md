# Test Data Files - StickForStats Platform

## Overview
This directory contains 14 fabricated CSV datasets designed for comprehensive testing of the StickForStats Statistical Analysis Platform. Each file tests specific functionality and edge cases.

---

## File Descriptions

### 1. `test_small_continuous.csv` (50 rows × 5 columns)
**Purpose:** Quick testing and basic functionality validation
**Variables:**
- Height_cm (continuous, normal distribution, μ=170, σ=10)
- Weight_kg (continuous, normal distribution, μ=70, σ=12)
- Age_years (discrete, range 20-65)
- BloodPressure_mmHg (continuous, normal distribution, μ=120, σ=15)
- Cholesterol_mgdL (continuous, normal distribution, μ=200, σ=40)

**Use Cases:**
- Data profiling module
- Basic statistical calculations
- Quick visualization tests
- Normality testing

---

### 2. `test_medium_mixed.csv` (200 rows × 8 columns)
**Purpose:** Test mixed data types (categorical + continuous)
**Variables:**
- CustomerID (identifier, C0001-C0200)
- Gender (categorical: Male, Female)
- Age (discrete, range 18-75)
- Income (continuous, normal distribution, μ=60000, σ=20000)
- Education (ordinal categorical: High School, Bachelor, Master, PhD)
- Purchases (discrete, range 0-50)
- Satisfaction (ordinal, range 1-10)
- Region (nominal categorical: North, South, East, West)

**Use Cases:**
- Categorical encoding (one-hot, label)
- Chi-square tests
- Mixed-type visualizations
- Customer analytics scenarios

---

### 3. `test_large_stress.csv` (2000 rows × 10 columns)
**Purpose:** Performance and stress testing
**Variables:**
- ID (identifier, ID00001-ID02000)
- Var1-Var9 (all continuous, normal distribution, μ=100, σ=15)

**Use Cases:**
- Performance benchmarking
- Large dataset handling
- Memory usage testing
- Visualization rendering speed

---

### 4. `test_missing_values.csv` (100 rows × 6 columns)
**Purpose:** Test missing data handling (~20% missing per column)
**Variables:**
- Temperature (continuous, μ=20, σ=5, 20% missing)
- Humidity (continuous, μ=60, σ=15, 20% missing)
- Pressure (continuous, μ=1013, σ=10, 20% missing)
- WindSpeed (continuous, μ=15, σ=5, 20% missing)
- Rainfall (continuous, μ=5, σ=2, 20% missing)
- Visibility (continuous, μ=10, σ=3, 20% missing)

**Use Cases:**
- Missing value imputation (mean, median, mode, forward/backward fill)
- Missing data visualization
- Data quality assessment
- Preprocessing module validation

---

### 5. `test_outliers.csv` (150 rows × 5 columns)
**Purpose:** Test outlier detection algorithms (~5% outliers)
**Variables:**
- ProcessTime (continuous, normal μ=50, σ=5, with 5% extreme outliers 100-200)
- Temperature (continuous, normal μ=100, σ=5, with 5% extreme outliers 150-200)
- Yield (continuous, normal μ=85, σ=5, with 5% extreme outliers 20-40)
- Defects (discrete, normal 0-10, with 5% extreme outliers 50-100)
- Cost (continuous, normal μ=1000, σ=200, with 5% extreme outliers 5000-10000)

**Use Cases:**
- IQR-based outlier detection
- Z-score outlier detection
- Box plot visualization
- Outlier removal/capping
- Robust preprocessing

---

### 6. `test_regression.csv` (200 rows × 4 columns)
**Purpose:** Linear regression and predictive modeling
**Variables:**
- StudyHours (continuous, range 0-10)
- AttendanceRate (continuous, range 50-100%)
- PreviousGrade (continuous, range 60-95)
- ExamScore (target, continuous, range 0-100)

**Relationship:** ExamScore = 30 + 3×StudyHours + 0.2×Attendance + 0.3×PreviousGrade + ε
**R² Expected:** ~0.80-0.85

**Use Cases:**
- Linear regression training
- Feature importance analysis
- R² and RMSE calculation
- Scatter plots with trend lines
- Residual analysis

---

### 7. `test_classification.csv` (300 rows × 6 columns)
**Purpose:** Binary classification and logistic regression
**Variables:**
- CreditScore (discrete, range 300-850)
- Income (continuous, normal μ=60000, σ=25000)
- DebtRatio (continuous, range 0-0.8)
- EmploymentYears (discrete, range 0-30)
- Age (discrete, range 22-70)
- DefaultStatus (binary target: 0=No Default, 1=Default)

**Relationship:** Logistic function based on credit score, income, debt ratio, employment
**Class Balance:** ~70% No Default, 30% Default

**Use Cases:**
- Logistic regression
- Confusion matrix
- ROC curve and AUC
- Precision, Recall, F1-score
- Decision boundary visualization

---

### 8. `test_ttest.csv` (80 rows × 3 columns)
**Purpose:** Independent t-test comparison
**Variables:**
- Group (categorical: Control, Treatment, 40 rows each)
- Score (continuous, Control: μ=75, σ=10; Treatment: μ=82, σ=10)
- ReactionTime (continuous, Control: μ=500ms, σ=50; Treatment: μ=450ms, σ=50)

**Expected Results:**
- Significant difference in Score (p < 0.01)
- Significant difference in ReactionTime (p < 0.01)
- Effect size (Cohen's d) ~ 0.7 (medium-large)

**Use Cases:**
- Independent samples t-test
- Paired t-test (if pairing imposed)
- Box plot comparisons
- Effect size calculation

---

### 9. `test_anova.csv` (120 rows × 4 columns)
**Purpose:** One-way ANOVA with multiple groups
**Variables:**
- Diet (categorical: Low-Carb, Low-Fat, Mediterranean, Paleo, 30 rows each)
- WeightLoss (continuous, means: 8, 6, 7, 9 kg respectively)
- Cholesterol (continuous, means: 180, 190, 175, 170 mg/dL)
- BloodPressure (continuous, means: 115, 120, 110, 108 mmHg)

**Expected Results:**
- Significant main effect of Diet on all outcomes (p < 0.05)
- Paleo > Low-Carb > Mediterranean > Low-Fat (for weight loss)
- Post-hoc: Paleo vs. Low-Fat significantly different

**Use Cases:**
- One-way ANOVA
- Post-hoc tests (Tukey HSD, Bonferroni)
- Group comparisons visualization
- Effect size (η²)

---

### 10. `test_factorial.csv` (100 rows × 4 columns)
**Purpose:** Two-way ANOVA (2×3 factorial design)
**Variables:**
- Temperature (categorical: Low, High)
- Catalyst (categorical: A, B, C)
- Yield (continuous, interaction: High temp + Catalyst C gives best yield ~90%)
- Purity (continuous, normal μ=95, σ=3)

**Design:**
- 2 Temperature levels × 3 Catalyst types = 6 combinations
- ~16-17 replicates per combination

**Expected Results:**
- Main effect of Temperature (p < 0.05)
- Main effect of Catalyst (p < 0.05)
- Interaction Temperature × Catalyst (p < 0.05)
- Interaction plot shows non-parallel lines

**Use Cases:**
- Two-way ANOVA
- Interaction plots
- Main effects vs. interaction effects
- Factorial design analysis

---

### 11. `test_correlation.csv` (150 rows × 6 columns)
**Purpose:** Correlation analysis and multicollinearity
**Variables:**
- Variable1 (continuous, normal μ=50, σ=10)
- Variable2 (continuous, r=0.7 with Var1) - Strong positive correlation
- Variable3 (continuous, r=-0.5 with Var1) - Moderate negative correlation
- Variable4 (continuous, independent) - No correlation
- Variable5 (continuous, r=0.4 with Var2) - Moderate positive correlation
- Variable6 (continuous, independent) - No correlation

**Expected Correlations:**
- Var1 ↔ Var2: r ≈ 0.70 (strong positive)
- Var1 ↔ Var3: r ≈ -0.50 (moderate negative)
- Var2 ↔ Var5: r ≈ 0.40 (moderate positive)
- Others: r ≈ 0.00 (no correlation)

**Use Cases:**
- Correlation matrix heatmap
- Pearson vs. Spearman correlation
- Scatter plot matrix (pair plots)
- Multicollinearity detection

---

### 12. `test_categorical.csv` (200 rows × 5 columns)
**Purpose:** Categorical data analysis and chi-square tests
**Variables:**
- Gender (categorical: Male, Female)
- Smoker (categorical: Yes, No)
- Exercise (ordinal: Low, Medium, High)
- Diet (ordinal: Poor, Average, Good)
- HealthOutcome (ordinal: Poor, Fair, Good, Excellent)

**Relationship:** HealthOutcome depends on Smoker, Exercise, Diet
- Non-smokers, high exercise, good diet → Excellent health
- Smokers, low exercise, poor diet → Poor health

**Use Cases:**
- Chi-square test of independence
- Contingency tables
- Categorical data visualization (bar charts, mosaic plots)
- Encoding categorical variables

---

### 13. `test_timeseries.csv` (365 rows × 4 columns)
**Purpose:** Time series analysis and temporal patterns
**Variables:**
- Date (temporal, daily from 2024-01-01 to 2024-12-30)
- Sales (continuous, seasonal pattern + trend + noise)
- Temperature (continuous, seasonal sine wave)
- CustomerCount (continuous, correlated with Sales)

**Patterns:**
- Seasonality: Annual cycle (peak in summer, trough in winter)
- Trend: Positive linear trend (~0.1 per day)
- Noise: Random variation

**Expected Analysis:**
- Seasonal decomposition (trend, seasonal, residual)
- Autocorrelation (significant lags)
- Moving averages smooth noise

**Use Cases:**
- Time series line plots
- Seasonal decomposition
- Moving averages
- Forecasting models
- Date parsing and handling

---

### 14. `test_clustering.csv` (200 rows × 3 columns)
**Purpose:** Unsupervised learning and cluster analysis
**Variables:**
- Feature1 (continuous, 3 distinct cluster centers)
- Feature2 (continuous, 3 distinct cluster centers)
- Feature3 (continuous, 3 distinct cluster centers)

**True Clusters:**
- Cluster 1: Center at (10, 10, 10), ~67 points
- Cluster 2: Center at (30, 10, 25), ~67 points
- Cluster 3: Center at (10, 30, 40), ~66 points

**Expected Results:**
- K-means with k=3 should recover true clusters
- Silhouette score > 0.6 (well-separated)
- Elbow method shows optimal k=3

**Use Cases:**
- K-means clustering
- Hierarchical clustering
- Elbow method
- Silhouette analysis
- 3D scatter plots

---

## Usage Instructions

### Quick Start
1. Navigate to http://localhost:3000/statistical-analysis-tools
2. Select "Data Profiling" module
3. Click "Upload CSV" button
4. Select `test_small_continuous.csv` from `test_data/` directory
5. Verify dataset info, column analysis, and visualizations appear

### Module-Specific Testing

**Data Profiling:**
- Start with `test_small_continuous.csv` (quick)
- Then `test_medium_mixed.csv` (mixed types)
- Stress test with `test_large_stress.csv`

**Data Preprocessing:**
- Test missing values: `test_missing_values.csv`
- Test outliers: `test_outliers.csv`
- Test encoding: `test_categorical.csv`

**Visualization Suite:**
- Scatter plots: `test_regression.csv`
- Box plots: `test_anova.csv`
- Time series: `test_timeseries.csv`

**Statistical Tests:**
- t-tests: `test_ttest.csv`
- ANOVA: `test_anova.csv`
- Correlation: `test_correlation.csv`
- Chi-square: `test_categorical.csv`

**Advanced Statistics:**
- Two-way ANOVA: `test_factorial.csv`
- Post-hoc tests: `test_anova.csv`

**Machine Learning:**
- Regression: `test_regression.csv`
- Classification: `test_classification.csv`
- Clustering: `test_clustering.csv`

---

## Validation Against Ground Truth

All statistical calculations should be verified against established statistical software:

**R Verification:**
```r
# Example: Verify t-test
data <- read.csv("test_ttest.csv")
t.test(Score ~ Group, data = data)
```

**Python Verification:**
```python
import pandas as pd
from scipy import stats

# Example: Verify ANOVA
data = pd.read_csv("test_anova.csv")
groups = [data[data['Diet'] == diet]['WeightLoss'] for diet in data['Diet'].unique()]
f_stat, p_value = stats.f_oneway(*groups)
```

**Expected Precision:**
- p-values: Match to 3 decimal places
- Test statistics: Match to 2 decimal places
- Confidence intervals: Match to 2 decimal places

---

## Data Integrity

All datasets are:
- ✅ Reproducible (seed = 42)
- ✅ Realistic distributions
- ✅ Known ground truth
- ✅ Well-documented relationships
- ✅ Edge cases included
- ✅ CSV format compliant

---

## Troubleshooting

**File Not Found:**
- Ensure you're uploading from `test_data/` directory
- Check file permissions (readable)

**Upload Fails:**
- Verify CSV format (commas, headers, no special characters)
- Check file size (<10MB)
- Ensure no corrupted data

**Unexpected Results:**
- Compare with ground truth documented above
- Check for data loading errors (inspect first few rows)
- Verify variable names match (case-sensitive)

---

**Created:** October 14, 2025
**Version:** 1.0
**Status:** Ready for comprehensive testing
