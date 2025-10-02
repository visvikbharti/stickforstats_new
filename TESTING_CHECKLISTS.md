# ✅ STICKFORSTATS - CALCULATOR TESTING CHECKLISTS
## Comprehensive Test Cases for Each Statistical Calculator
### Version 1.0 | September 17, 2025

---

## 🎯 TESTING METHODOLOGY

### For Each Calculator, Verify:
1. ✅ Basic functionality works
2. ✅ 50 decimal precision maintained
3. ✅ Example data loads correctly
4. ✅ Manual data entry works
5. ✅ Error handling is proper
6. ✅ Results are accurate
7. ✅ Visualization displays correctly
8. ✅ Export functions work
9. ✅ Mobile responsiveness
10. ✅ Performance is acceptable

---

## 📊 1. T-TEST CALCULATOR CHECKLIST

### Test Cases

#### 1.1 One-Sample T-Test
- [ ] Load example data: "Drug Trial - Blood Pressure"
- [ ] Verify hypothesized mean = 120
- [ ] Check t-statistic precision (50 decimals)
- [ ] Verify p-value < 0.05 (significant)
- [ ] Confirm confidence interval excludes 120
- [ ] Test effect size (Cohen's d) calculation
- [ ] Export results to CSV
- [ ] Verify visualization shows distribution

#### 1.2 Two-Sample T-Test (Independent)
- [ ] Load example data: "Teaching Methods Study"
- [ ] Enter Group A data manually: "85, 88, 90, 92, 87"
- [ ] Enter Group B data manually: "78, 82, 79, 81, 80"
- [ ] Toggle equal variances assumption
- [ ] Verify Welch's correction when unequal
- [ ] Check degrees of freedom calculation
- [ ] Confirm p-value interpretation
- [ ] Test alternative hypotheses (two-sided, less, greater)

#### 1.3 Paired T-Test
- [ ] Load example data: "Sleep Study - Before/After"
- [ ] Verify paired differences calculated
- [ ] Check mean difference precision
- [ ] Test confidence level changes (90%, 95%, 99%)
- [ ] Verify effect size for paired data
- [ ] Export to JSON format
- [ ] Check mobile layout

#### 1.4 Edge Cases
- [ ] Single value in group (should show error)
- [ ] Identical values (variance = 0)
- [ ] Missing values handling
- [ ] Very large datasets (1000+ values)
- [ ] Extreme values (outliers)
- [ ] Negative values
- [ ] Decimal inputs with high precision

#### 1.5 Precision Tests
```
Test Data:
Group 1: "1.12345678901234567890123456789012345678901234567890"
Group 2: "2.98765432109876543210987654321098765432109876543210"
Expected: Full 50-decimal precision in results
```

---

## 📊 2. ANOVA CALCULATOR CHECKLIST

### Test Cases

#### 2.1 One-Way ANOVA
- [ ] Load example data: "Fertilizer Effectiveness"
- [ ] Verify 3 groups loaded correctly
- [ ] Check F-statistic calculation
- [ ] Verify between/within group SS
- [ ] Test post-hoc: Tukey HSD
- [ ] Test post-hoc: Bonferroni
- [ ] Check effect size (eta-squared)
- [ ] Verify assumption tests (Levene's)
- [ ] Export ANOVA table

#### 2.2 Two-Way ANOVA
- [ ] Load example data: "Drug Dosage × Gender"
- [ ] Verify main effects
- [ ] Check interaction effect
- [ ] Test marginal means
- [ ] Verify partial eta-squared
- [ ] Check assumption violations
- [ ] Test unbalanced design

#### 2.3 ANCOVA (NEW)
- [ ] Load example data: "Education with Pretest Control"
- [ ] Add covariate: Age
- [ ] Add covariate: Baseline Score
- [ ] Verify adjusted means calculation
- [ ] Check homogeneity of regression slopes
- [ ] Test slope homogeneity p-value
- [ ] Verify covariate significance
- [ ] Export adjusted results
- [ ] Compare with/without covariate

#### 2.4 Repeated Measures ANOVA
- [ ] Load example data: "Time Series Measurements"
- [ ] Verify sphericity assumption
- [ ] Check Greenhouse-Geisser correction
- [ ] Test within-subject effects
- [ ] Verify error term calculation

#### 2.5 Edge Cases
- [ ] Unequal group sizes
- [ ] Single observation per cell
- [ ] Missing cells (unbalanced)
- [ ] Perfect separation
- [ ] Zero variance groups

---

## 📊 3. REGRESSION CALCULATOR CHECKLIST

### Test Cases

#### 3.1 Simple Linear Regression
- [ ] Load example data: "Sales vs Advertising"
- [ ] Verify slope coefficient
- [ ] Check intercept
- [ ] Validate R-squared
- [ ] Test residual plots
- [ ] Check prediction with new X
- [ ] Verify confidence bands
- [ ] Export regression equation

#### 3.2 Multiple Linear Regression
- [ ] Load example data: "House Prices"
- [ ] Add 3+ predictors
- [ ] Check VIF for multicollinearity
- [ ] Verify adjusted R-squared
- [ ] Test partial correlations
- [ ] Check standardized coefficients
- [ ] Validate ANOVA table

#### 3.3 Polynomial Regression
- [ ] Load example data: "Temperature vs Sales"
- [ ] Test degree 2 polynomial
- [ ] Test degree 3 polynomial
- [ ] Verify overfitting warnings
- [ ] Check AIC/BIC values
- [ ] Visualize fitted curve

#### 3.4 Logistic Regression
- [ ] Load example data: "Customer Churn"
- [ ] Verify odds ratios
- [ ] Check classification accuracy
- [ ] Test ROC curve
- [ ] Verify confusion matrix
- [ ] Check Hosmer-Lemeshow test

#### 3.5 Regularization
- [ ] Test Ridge regression (alpha = 0.1)
- [ ] Test Lasso regression (alpha = 0.1)
- [ ] Test Elastic Net (alpha = 0.1, l1_ratio = 0.5)
- [ ] Compare coefficients across methods
- [ ] Verify cross-validation scores

---

## 📊 4. CHI-SQUARE TEST CHECKLIST

### Test Cases

#### 4.1 Test of Independence
- [ ] Load example data: "Treatment × Outcome"
- [ ] Verify 2×2 contingency table
- [ ] Check expected frequencies
- [ ] Validate chi-square statistic
- [ ] Test Fisher's exact (small samples)
- [ ] Verify Cramér's V effect size
- [ ] Check standardized residuals

#### 4.2 Goodness of Fit
- [ ] Load example data: "Distribution Test"
- [ ] Specify expected proportions
- [ ] Verify observed vs expected
- [ ] Check degrees of freedom
- [ ] Test multiple categories

#### 4.3 Larger Tables
- [ ] Test 3×3 table
- [ ] Test 4×5 table
- [ ] Verify post-hoc tests
- [ ] Check adjusted residuals
- [ ] Test sparse tables warning

---

## 📊 5. CORRELATION CALCULATOR CHECKLIST

### Test Cases

#### 5.1 Pearson Correlation
- [ ] Load example data: "Height vs Weight"
- [ ] Verify correlation coefficient
- [ ] Check significance test
- [ ] Validate confidence interval
- [ ] Test scatter plot
- [ ] Add regression line
- [ ] Check assumptions

#### 5.2 Spearman Rank Correlation
- [ ] Load example data: "Ordinal Rankings"
- [ ] Verify rank transformation
- [ ] Check tied ranks handling
- [ ] Compare with Pearson
- [ ] Test monotonic relationship

#### 5.3 Correlation Matrix
- [ ] Load multivariate data
- [ ] Generate correlation matrix
- [ ] Check symmetry
- [ ] Verify diagonal = 1
- [ ] Test heatmap visualization
- [ ] Export matrix

#### 5.4 Partial Correlation
- [ ] Load 3+ variables
- [ ] Control for 1 variable
- [ ] Control for 2 variables
- [ ] Compare partial vs zero-order
- [ ] Verify significance tests

---

## 📊 6. NON-PARAMETRIC TESTS CHECKLIST

### Test Cases

#### 6.1 Mann-Whitney U Test
- [ ] Load example data: "Pain Scores"
- [ ] Verify U statistic
- [ ] Check exact vs asymptotic p-value
- [ ] Test effect size (rank biserial)
- [ ] Compare with t-test

#### 6.2 Wilcoxon Signed-Rank Test
- [ ] Load paired data
- [ ] Verify signed ranks
- [ ] Check zero differences handling
- [ ] Test exact p-value (small n)
- [ ] Verify confidence interval

#### 6.3 Kruskal-Wallis Test
- [ ] Load 3+ groups
- [ ] Verify H statistic
- [ ] Check tie correction
- [ ] Test post-hoc (Dunn's)
- [ ] Compare with ANOVA

#### 6.4 Friedman Test
- [ ] Load repeated measures
- [ ] Verify ranking within blocks
- [ ] Check chi-square approximation
- [ ] Test post-hoc comparisons

---

## 📊 7. DISTRIBUTION CALCULATOR CHECKLIST

### Test Cases

#### 7.1 Normal Distribution
- [ ] Calculate PDF at x = 0, μ = 0, σ = 1
- [ ] Calculate CDF at x = 1.96
- [ ] Find quantile for p = 0.975
- [ ] Verify visualization
- [ ] Test extreme values

#### 7.2 T-Distribution
- [ ] Test with df = 10
- [ ] Compare with normal (large df)
- [ ] Verify critical values
- [ ] Check two-tailed areas

#### 7.3 Other Distributions
- [ ] Chi-square (df = 5)
- [ ] F-distribution (df1 = 3, df2 = 20)
- [ ] Binomial (n = 10, p = 0.5)
- [ ] Poisson (λ = 5)

---

## 📊 8. DESCRIPTIVE STATISTICS CHECKLIST

### Test Cases

#### 8.1 Central Tendency
- [ ] Load example data
- [ ] Verify mean calculation
- [ ] Check median (odd/even n)
- [ ] Test mode (unimodal/multimodal)
- [ ] Calculate geometric mean
- [ ] Calculate harmonic mean

#### 8.2 Dispersion
- [ ] Verify standard deviation
- [ ] Check variance
- [ ] Calculate range
- [ ] Test IQR
- [ ] Check MAD

#### 8.3 Shape
- [ ] Calculate skewness
- [ ] Calculate kurtosis
- [ ] Test normality interpretation
- [ ] Verify z-scores

#### 8.4 Percentiles
- [ ] Calculate quartiles
- [ ] Test custom percentiles
- [ ] Verify box plot
- [ ] Check outlier detection

---

## 📊 9. CONFIDENCE INTERVALS CHECKLIST

### Test Cases

#### 9.1 Mean CI
- [ ] Single sample CI
- [ ] Known variance CI
- [ ] Unknown variance CI
- [ ] Test different confidence levels

#### 9.2 Proportion CI
- [ ] Wilson score interval
- [ ] Exact binomial CI
- [ ] Large sample approximation
- [ ] Continuity correction

#### 9.3 Difference CIs
- [ ] Difference of means
- [ ] Difference of proportions
- [ ] Ratio of variances

---

## 📊 10. SAMPLE SIZE CALCULATOR CHECKLIST

### Test Cases

#### 10.1 For Means
- [ ] One-sample test
- [ ] Two-sample test
- [ ] Specify power (0.8, 0.9)
- [ ] Vary effect size
- [ ] Test different alphas

#### 10.2 For Proportions
- [ ] Single proportion
- [ ] Two proportions
- [ ] Vary baseline rate
- [ ] Test continuity correction

#### 10.3 For ANOVA
- [ ] Specify number of groups
- [ ] Set effect size f
- [ ] Verify total N
- [ ] Check allocation ratio

---

## 📊 11. NORMALITY TESTS CHECKLIST

### Test Cases

#### 11.1 Shapiro-Wilk Test
- [ ] Load normal data
- [ ] Load skewed data
- [ ] Verify W statistic
- [ ] Check p-value interpretation
- [ ] Test sample size limits

#### 11.2 Visual Tests
- [ ] Q-Q plot alignment
- [ ] P-P plot alignment
- [ ] Histogram overlay
- [ ] Kernel density plot

#### 11.3 Other Tests
- [ ] Anderson-Darling
- [ ] Kolmogorov-Smirnov
- [ ] Jarque-Bera
- [ ] D'Agostino-Pearson

---

## 📊 12. OUTLIER DETECTION CHECKLIST

### Test Cases

#### 12.1 Statistical Methods
- [ ] IQR method (1.5 × IQR)
- [ ] Z-score (threshold = 3)
- [ ] Modified Z-score (MAD)
- [ ] Grubbs' test
- [ ] Dixon's Q test

#### 12.2 Machine Learning Methods
- [ ] Isolation Forest
- [ ] Local Outlier Factor
- [ ] DBSCAN clustering

#### 12.3 Visualization
- [ ] Box plot outliers
- [ ] Scatter plot highlighting
- [ ] Distribution overlay

---

## 📊 13. EFFECT SIZE CALCULATOR CHECKLIST

### Test Cases

#### 13.1 Mean Differences
- [ ] Cohen's d
- [ ] Hedges' g
- [ ] Glass's delta
- [ ] Verify interpretations

#### 13.2 ANOVA Effect Sizes
- [ ] Eta-squared
- [ ] Partial eta-squared
- [ ] Omega-squared
- [ ] Cohen's f

#### 13.3 Correlation Effect Sizes
- [ ] r to d conversion
- [ ] Point-biserial correlation
- [ ] Verify confidence intervals

---

## 🎯 EXAMPLE DATA LOADER TESTING

### For Each Calculator:
- [ ] Open example data dialog
- [ ] Preview each available dataset
- [ ] Verify description accuracy
- [ ] Check expected outcome
- [ ] Load data successfully
- [ ] Confirm data populates correctly
- [ ] Test "Cancel" functionality
- [ ] Verify icons match context
- [ ] Check mobile responsiveness

### Cross-Calculator Tests:
- [ ] Load same data in different calculators
- [ ] Verify consistency across tests
- [ ] Check precision preservation
- [ ] Test with all 60+ datasets

---

## 🔧 PRECISION VALIDATION TESTS

### Test Protocol:
1. **Input**: Enter value with 50 decimals
2. **Process**: Run calculation
3. **Verify**: Check result maintains precision
4. **Export**: Confirm exported value has full precision
5. **Reload**: Import exported data and re-verify

### Test Values:
```
π to 50 decimals: 3.14159265358979323846264338327950288419716939937510
e to 50 decimals: 2.71828182845904523536028747135266249775724709369995
√2 to 50 decimals: 1.41421356237309504880168872420969807856967187537694
```

---

## 🚀 PERFORMANCE BENCHMARKS

### Acceptable Thresholds:
- Page Load: < 2 seconds
- Calculation: < 500ms for n < 1000
- Data Import: < 1 second for 10,000 points
- Export: < 2 seconds
- Visualization: < 1 second to render

### Stress Tests:
- [ ] 10,000 data points
- [ ] 50 groups (ANOVA)
- [ ] 20 predictors (Regression)
- [ ] 100×100 contingency table
- [ ] Simultaneous calculations

---

## 📱 RESPONSIVE DESIGN TESTS

### Breakpoints to Test:
- [ ] Mobile (320px - iPhone SE)
- [ ] Mobile (375px - iPhone 12)
- [ ] Tablet (768px - iPad)
- [ ] Desktop (1024px)
- [ ] Wide (1920px)

### Elements to Check:
- [ ] Navigation drawer
- [ ] Data input fields
- [ ] Results tables
- [ ] Charts/visualizations
- [ ] Export buttons
- [ ] Example data dialog

---

## 🐛 ERROR HANDLING TESTS

### Invalid Inputs:
- [ ] Empty data
- [ ] Non-numeric values
- [ ] Special characters
- [ ] Infinity/NaN
- [ ] Mismatched group sizes
- [ ] Singular matrices

### Expected Behaviors:
- [ ] Clear error messages
- [ ] No application crash
- [ ] Graceful degradation
- [ ] Recovery options
- [ ] Helpful suggestions

---

## ✅ ACCEPTANCE CRITERIA

### Calculator is Ready When:
1. ✅ All basic test cases pass
2. ✅ 50 decimal precision verified
3. ✅ Example data works correctly
4. ✅ Exports function properly
5. ✅ Mobile responsive
6. ✅ Performance acceptable
7. ✅ Error handling robust
8. ✅ Documentation complete

---

## 📝 TEST EXECUTION LOG

### Template:
```
Date: ___________
Tester: ___________
Calculator: ___________
Version: ___________

Test Cases Passed: ___/___
Precision Verified: Yes/No
Performance Met: Yes/No
Bugs Found: ___________

Notes:
_____________________
_____________________
```

---

## 🎯 PRIORITY TESTING ORDER

1. **Critical Path** (Do First):
   - T-Test Calculator (most used)
   - ANOVA Calculator (complex)
   - Regression Calculator (foundational)
   - Example Data Loader (new feature)

2. **Secondary** (Do Next):
   - Chi-Square Test
   - Correlation
   - Descriptive Statistics
   - Confidence Intervals

3. **Tertiary** (Do Last):
   - Distribution Calculator
   - Sample Size Calculator
   - Normality Tests
   - Outlier Detection
   - Effect Size Calculator

---

## 🏁 SIGN-OFF CHECKLIST

### Before Release:
- [ ] All calculators tested
- [ ] Precision validated
- [ ] Example data verified
- [ ] Performance acceptable
- [ ] Mobile tested
- [ ] Documentation complete
- [ ] Known issues documented
- [ ] Rollback plan ready

### Release Approval:
- [ ] Development Team
- [ ] QA Team
- [ ] Product Owner
- [ ] Statistical Advisor

---

**Document Version**: 1.0
**Created**: September 17, 2025
**Next Review**: Weekly during testing phase

---

# END OF TESTING CHECKLISTS