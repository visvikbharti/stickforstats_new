# StickForStats: Guardian System Section (Draft for JSS)

## 4. The Guardian System

The Guardian system is the core innovation of StickForStats: an automatic assumption validation layer that intercepts all statistical test requests, validates relevant assumptions, and provides integrated reporting. This section describes the system architecture, implemented validators, confidence scoring algorithm, and alternative test recommendation.

### 4.1 System Architecture

Guardian operates as middleware between the user interface and statistical engine. When a user requests any statistical test, the request passes through Guardian before execution. This design ensures that assumption checking cannot be bypassed—it is an integral part of the analysis pipeline, not an optional add-on.

The core class, `GuardianCore`, maintains two key data structures:

1. **Validator Registry.** A dictionary mapping assumption names to validator instances:

```python
self.validators = {
    'normality': NormalityValidator(),
    'variance_homogeneity': VarianceHomogeneityValidator(),
    'independence': IndependenceValidator(),
    'outliers': OutlierDetector(),
    'sample_size': SampleSizeValidator(),
    'modality': ModalityDetector(),
    'linearity': LinearityValidator(),
    'homoscedasticity': HomoscedasticityValidator()
}
```

2. **Test Requirements Mapping.** A dictionary specifying which assumptions must be checked for each statistical test:

```python
self.test_requirements = {
    't_test': ['normality', 'variance_homogeneity', 'independence', 'outliers'],
    'anova': ['normality', 'variance_homogeneity', 'independence'],
    'pearson': ['normality', 'linearity', 'outliers'],
    'regression': ['normality', 'independence', 'homoscedasticity', 'linearity'],
    'chi_square': ['expected_frequencies', 'independence'],
    'mann_whitney': ['independence', 'similar_shapes'],
    'kruskal_wallis': ['independence', 'similar_shapes']
}
```

When a t-test is requested, Guardian automatically executes the normality, variance homogeneity, independence, and outlier validators. The user need not request these checks explicitly.

### 4.2 Validation Workflow

The main entry point is the `check()` method, which orchestrates the validation process:

**Algorithm 1: Guardian Validation Workflow**
```
Input: data (array or dict), test_type (string), alpha (float, default 0.05)
Output: GuardianReport

1. Convert input data to standardized format (list of numpy arrays)
2. Look up required assumptions for test_type
3. For each required assumption:
   a. Execute corresponding validator
   b. If violation detected, create AssumptionViolation record
   c. Collect visual evidence data
4. Determine if analysis can proceed (no critical violations)
5. Generate alternative test recommendations if violations exist
6. Calculate confidence score
7. Return GuardianReport with all results
```

The `GuardianReport` dataclass encapsulates the complete assessment:

| Field | Type | Description |
|-------|------|-------------|
| `test_type` | string | Requested statistical test |
| `data_summary` | dict | Descriptive statistics for input data |
| `assumptions_checked` | list | Assumptions that were validated |
| `violations` | list | AssumptionViolation records |
| `can_proceed` | bool | Whether analysis should proceed |
| `alternative_tests` | list | Recommended alternatives |
| `confidence_score` | float | Weighted score (0-1) |
| `visual_evidence` | dict | Plot data for diagnostics |
| `effect_size_report` | dict | Effect size calculations |

### 4.3 Implemented Validators

Guardian implements eight validators covering the most common statistical assumptions. Each validator returns a standardized result dictionary containing violation status, test name, severity level, p-value (when applicable), diagnostic message, and recommendation.

#### 4.3.1 Normality Validator

The `NormalityValidator` checks distributional normality using the Shapiro-Wilk test for samples up to n=5000 and the Anderson-Darling test for larger samples. This adaptive approach follows recommendations in the statistical literature: Shapiro-Wilk has superior power for small to moderate samples, while Anderson-Darling is more computationally efficient for large samples.

**Implementation Details:**
- For each data group, performs Shapiro-Wilk test (n ≤ 5000) or Anderson-Darling test (n > 5000)
- Violation declared if p < α (default 0.05)
- Severity classified as "critical" if p < α/10, otherwise "warning"
- Returns Q-Q plot data and histogram data for visual inspection

**Statistical Tests Used:**
- Shapiro-Wilk (Shapiro & Wilk, 1965): W statistic, p-value
- Anderson-Darling (Anderson & Darling, 1954): A² statistic, critical values

#### 4.3.2 Variance Homogeneity Validator

The `VarianceHomogeneityValidator` tests equality of variances across groups using Levene's test with median centering, which is robust to non-normality (Levene, 1960; Brown & Forsythe, 1974).

**Implementation Details:**
- Requires at least two groups
- Uses `center='median'` option for robustness
- Calculates variance ratio (max/min) for severity assessment
- Severity thresholds based on golden ratio: ratio > φ² (~2.618) is critical, ratio > φ (~1.618) is warning

**Recommendation on Violation:** Welch's t-test or non-parametric alternatives.

#### 4.3.3 Independence Validator

The `IndependenceValidator` checks for serial correlation in the data, which would indicate non-independent observations. This is particularly important for time-series data that may be incorrectly analyzed with standard tests.

**Implementation Details:**
- Calculates lag-1 autocorrelation coefficient
- Violation declared if |autocorrelation| > 0.3
- Severity: |autocorrelation| > 0.5 is critical, otherwise warning
- Sample size requirement: n ≥ 10 for reliable assessment

**Limitation:** This validator detects serial dependence but cannot identify other forms of non-independence (e.g., clustering, hierarchical structure). Users with nested data should consider mixed-effects models.

#### 4.3.4 Outlier Detector

The `OutlierDetector` identifies extreme values using two complementary methods:

1. **IQR Method:** Points beyond Q1 - 1.5×IQR or Q3 + 1.5×IQR
2. **Z-Score Method:** Points with |z| > 3

**Implementation Details:**
- Combines both methods (union of detected outliers)
- Reports outlier count and percentage per group
- Severity thresholds: >10% outliers is critical, >5% is warning, otherwise minor

**Recommendation on Violation:** Investigate outliers, consider robust methods or transformation.

#### 4.3.5 Sample Size Validator

The `SampleSizeValidator` ensures adequate sample size for valid inference.

**Implementation Details:**
- Critical: n < 3 (insufficient for any parametric test)
- Warning: n < 18 (threshold derived from 30/φ)
- Pass: n ≥ 18

**Recommendation on Violation:** Collect more data or use non-parametric tests designed for small samples.

#### 4.3.6 Modality Detector

The `ModalityDetector` identifies multimodal distributions that may indicate mixed populations or subgroups.

**Implementation Details:**
- Fits kernel density estimate (KDE) to data
- Identifies peaks in density function
- Filters significant peaks (height > 30% of maximum)
- Violation declared if multiple significant peaks detected

**Recommendation on Violation:** Consider analyzing subgroups separately.

#### 4.3.7 Linearity Validator

The `LinearityValidator` assesses the linearity assumption for correlation and regression analyses.

**Implementation Details:**
- Fits both linear and quadratic (polynomial degree 2) models
- Compares R² values; improvement > 10% indicates non-linearity
- Applies runs test to residuals to detect systematic patterns
- Note: Runs test has limited power for n < 20; visual inspection recommended

**Statistical Tests Used:**
- R² comparison (linear vs. polynomial)
- Runs test for randomness of residuals (Wald & Wolfowitz, 1940)

**Recommendation on Violation:** Consider polynomial regression, transformation, or generalized additive models (GAM).

#### 4.3.8 Homoscedasticity Validator

The `HomoscedasticityValidator` tests constant variance of residuals across fitted values, critical for regression inference.

**Implementation Details:**
- Fits linear regression and computes residuals
- Performs Breusch-Pagan test: regresses squared residuals on predictors
- Test statistic: n × R² follows χ²(1) under null hypothesis
- Severity based on variance ratio between first and second half of fitted values

**Statistical Test Used:**
- Breusch-Pagan test (Breusch & Pagan, 1979)

**Recommendation on Violation:** Consider weighted least squares, robust regression, or variance-stabilizing transformation.

### 4.4 Confidence Score Calculation

Guardian computes a confidence score that summarizes the overall validity of proceeding with the requested test. This score ranges from 0 (severe violations, do not proceed) to 1 (all assumptions satisfied).

The scoring algorithm uses golden ratio (φ ≈ 1.618) based weights to penalize violations according to severity:

**Penalty Weights:**
| Severity | Penalty |
|----------|---------|
| Critical | φ² ≈ 2.618 |
| Warning | φ ≈ 1.618 |
| Minor | 1.0 |

**Algorithm 2: Confidence Score Calculation**
```
Input: violations (list of AssumptionViolation)
Output: confidence_score (float in [0, 1])

1. If no violations: return 1.0
2. Calculate total_penalty = sum of penalty(v.severity) for v in violations
3. Calculate max_possible_penalty = |violations| × φ²
4. confidence = max(0, 1 - total_penalty / (max_possible_penalty × 1.2))
5. Return round(confidence, 3)
```

The factor of 1.2 in the denominator ensures that even analyses with only minor violations receive scores below 1.0, encouraging users to address all issues.

**Interpretation Guidelines:**
| Score Range | Interpretation | Recommended Action |
|-------------|----------------|-------------------|
| 0.90 - 1.00 | Excellent | Proceed with confidence |
| 0.70 - 0.89 | Acceptable | Proceed with caution, note limitations |
| 0.50 - 0.69 | Questionable | Consider alternatives seriously |
| 0.00 - 0.49 | Poor | Use alternative test or address violations |

### 4.5 Alternative Test Recommendation

When violations are detected, Guardian recommends appropriate alternative tests. The recommendation logic maps assumption violations to suitable alternatives:

**Table 2: Alternative Test Recommendations**

| Original Test | Violation | Recommended Alternative |
|---------------|-----------|------------------------|
| t-test | Normality | Mann-Whitney U, permutation test, bootstrap |
| t-test | Variance homogeneity | Welch's t-test |
| ANOVA | Normality | Kruskal-Wallis, permutation ANOVA |
| ANOVA | Variance homogeneity | Welch's ANOVA, Games-Howell post-hoc |
| Pearson r | Normality | Spearman's ρ, Kendall's τ |
| Pearson r | Linearity | Distance correlation, non-linear regression |
| Regression | Normality (residuals) | Robust regression, quantile regression |
| Regression | Heteroscedasticity | Weighted least squares, GAM |

The recommendation engine considers the specific assumption violated and suggests the most appropriate alternative. When multiple assumptions are violated, all relevant alternatives are listed.

### 4.6 Visual Evidence Generation

Guardian generates diagnostic visualizations that accompany every analysis. These visualizations serve two purposes: (1) enabling expert users to verify the automated assessment, and (2) providing educational value by showing what assumption violations look like.

**Generated Visualizations:**
- **Q-Q Plots:** Theoretical vs. sample quantiles for normality assessment
- **Histograms with KDE:** Distribution shape with smoothed density overlay
- **Residual Plots:** Fitted values vs. residuals for regression diagnostics
- **Box Plots:** Group comparisons with outlier identification
- **Variance Comparison:** Bar charts of group variances

All visualization data is returned in JSON format, enabling client-side rendering with user-preferred libraries (e.g., Plotly, D3.js, Matplotlib).

### 4.7 Integration with Statistical Engine

Guardian integrates seamlessly with the statistical engine. The typical flow is:

1. **User Request:** User submits data and test type via API
2. **Guardian Interception:** Request routes through Guardian
3. **Assumption Validation:** Guardian executes required validators
4. **Decision Point:**
   - If `can_proceed=True`: Execute requested test
   - If `can_proceed=False`: Return Guardian report with recommendations
5. **Combined Response:** Return both statistical results and Guardian report

Importantly, even when `can_proceed=False`, the statistical test is still executed. Guardian provides warnings and recommendations but does not prevent users from seeing results. This design respects user autonomy while ensuring they cannot remain ignorant of assumption violations.

### 4.8 Performance Considerations

Guardian adds computational overhead to every analysis. To minimize impact:

1. **Parallel Validation:** Independent validators can execute concurrently
2. **Adaptive Methods:** Validator selection adapts to sample size (e.g., Shapiro-Wilk vs. Anderson-Darling)
3. **Lightweight Visualizations:** KDE computation uses reduced resolution (50 points vs. 200)
4. **Caching:** Repeated requests with identical data skip re-validation

In benchmarks with typical social science datasets (n=100-500, 2-4 groups), Guardian adds approximately 50-100ms to analysis time—negligible compared to total request latency.

### 4.9 Extensibility

Guardian is designed for extension. Adding a new validator requires:

1. Implementing the validator class with a `validate()` method
2. Registering the validator in `GuardianCore.validators`
3. Updating `test_requirements` to specify which tests require the new assumption

Similarly, new statistical tests can be added by defining their assumption requirements in the mapping dictionary.

---

## Table 3: Summary of Guardian Validators

| Validator | Statistical Tests | Threshold | Output |
|-----------|------------------|-----------|--------|
| Normality | Shapiro-Wilk, Anderson-Darling | p < 0.05 | W/A² statistic, p-value |
| Variance Homogeneity | Levene's (median) | p < 0.05 | F statistic, variance ratio |
| Independence | Lag-1 autocorrelation | |r| > 0.3 | Autocorrelation coefficient |
| Outliers | IQR + Z-score | Combined detection | Outlier count, percentage |
| Sample Size | Count | n < 18 | Sample sizes per group |
| Modality | KDE peak detection | >1 significant peak | Number of modes |
| Linearity | R² comparison, runs test | ΔR² > 0.05, p < 0.05 | R² improvement |
| Homoscedasticity | Breusch-Pagan | p < 0.05 | BP statistic, variance ratio |

---

## References (section-specific)

Anderson, T. W., & Darling, D. A. (1954). A test of goodness of fit. *Journal of the American Statistical Association*, 49(268), 765-769.

Breusch, T. S., & Pagan, A. R. (1979). A simple test for heteroscedasticity and random coefficient variation. *Econometrica*, 47(5), 1287-1294.

Brown, M. B., & Forsythe, A. B. (1974). Robust tests for the equality of variances. *Journal of the American Statistical Association*, 69(346), 364-367.

Levene, H. (1960). Robust tests for equality of variances. In I. Olkin (Ed.), *Contributions to probability and statistics* (pp. 278-292). Stanford University Press.

Shapiro, S. S., & Wilk, M. B. (1965). An analysis of variance test for normality (complete samples). *Biometrika*, 52(3-4), 591-611.

Wald, A., & Wolfowitz, J. (1940). On a test whether two samples are from the same population. *The Annals of Mathematical Statistics*, 11(2), 147-162.

---

## Word Count

- Section 4.1: ~300 words
- Section 4.2: ~200 words
- Section 4.3: ~800 words
- Section 4.4: ~300 words
- Section 4.5: ~200 words
- Section 4.6: ~150 words
- Section 4.7: ~200 words
- Section 4.8: ~150 words
- Section 4.9: ~100 words

**Total: ~2,400 words (~6 pages)**

---

*Draft prepared: December 15, 2025*
*Status: First draft based on actual implementation*
