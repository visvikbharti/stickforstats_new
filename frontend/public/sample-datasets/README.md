# Sample Datasets for StickForStats Testing

These datasets are provided for testing various statistical tests in StickForStats. Each dataset is designed to demonstrate specific statistical concepts and test capabilities.

## Available Datasets

### 1. normal_distribution.csv
- **Purpose**: Two-sample t-test, independent samples
- **Structure**: 2 groups (control, treatment) with normally distributed values
- **Sample Size**: 25 per group
- **Use Cases**:
  - Two-sample t-test
  - Mann-Whitney U test
  - Effect size calculation
  - Guardian System normality checking

### 2. regression_data.csv
- **Purpose**: Linear and polynomial regression analysis
- **Structure**: Continuous x, y variables with categorical grouping
- **Sample Size**: 30 observations
- **Use Cases**:
  - Simple linear regression
  - Multiple regression (with category)
  - Correlation analysis (Pearson, Spearman)
  - Scatter plot visualization

### 3. categorical_data.csv
- **Purpose**: Categorical data analysis
- **Structure**: Multiple categorical variables (treatment, outcome, gender, age_group)
- **Sample Size**: 30 observations
- **Use Cases**:
  - Chi-square test of independence
  - Fisher's exact test
  - Contingency table analysis
  - McNemar's test

### 4. paired_data.csv
- **Purpose**: Paired samples analysis
- **Structure**: Before/after measurements for same subjects
- **Sample Size**: 20 paired observations
- **Use Cases**:
  - Paired t-test
  - Wilcoxon signed-rank test
  - Repeated measures analysis
  - Effect size for paired data

### 5. anova_data.csv
- **Purpose**: Analysis of variance (ANOVA)
- **Structure**: 4 groups with measurements and blocking factor
- **Sample Size**: 10 per group (40 total)
- **Use Cases**:
  - One-way ANOVA
  - Two-way ANOVA (with blocks)
  - Kruskal-Wallis test
  - Post-hoc analysis

### 6. data_with_issues.csv
- **Purpose**: Testing data quality handling
- **Features**: Missing values, outliers, impossible values
- **Sample Size**: 20 observations with issues
- **Use Cases**:
  - Guardian System validation
  - Outlier detection
  - Missing data imputation
  - Data cleaning demonstration

## Usage

1. In the DataInput component, use the "Upload CSV" button
2. Navigate to the sample-datasets folder
3. Select the appropriate dataset for your test
4. The Guardian System will automatically validate the data
5. Proceed with your statistical analysis

## Data Characteristics

All datasets are designed with scientific accuracy and include:
- Realistic value ranges
- Appropriate sample sizes for statistical power
- Various data quality scenarios
- Different distribution types

## Note

These datasets are for demonstration and testing purposes. For production analysis, always use your actual research data with appropriate ethical clearances and data management protocols.