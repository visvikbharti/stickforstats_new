# Sprint 4: Robust Estimation & Effect Sizes Implementation Plan
**Feature ID**: T0.5  
**Priority**: CRITICAL (Tier 0)  
**Sprint Duration**: 2025-01-10 → 2025-01-11  
**Scientific Rigor**: MAXIMUM  

## 🎯 Sprint Objectives

Move beyond p-values by implementing comprehensive effect size calculations with:
1. All major effect size metrics with confidence intervals
2. Robust estimation methods for real-world data
3. Small sample bias corrections
4. Bootstrap methods for non-parametric confidence intervals
5. Integration with existing modules (test_recommender, power_analysis)

## 📋 Scientific Requirements

### Effect Size Families to Implement

#### 1. **Mean Difference Family**
- **Cohen's d**: Standardized mean difference
  - Pooled SD version
  - Glass's delta (control group SD)
  - Confidence intervals (Noncentrality method)
  - Bias correction (Hedges' correction)
- **Hedges' g**: Small sample corrected Cohen's d
  - Exact correction factor
  - CI using noncentral t distribution
- **Glass's Δ**: For unequal variances
  - Uses control group SD only
  - Appropriate for pre-post designs

#### 2. **ANOVA Family**
- **Eta-squared (η²)**: Proportion of variance explained
  - Regular and partial versions
  - CI using noncentral F
- **Omega-squared (ω²)**: Less biased than η²
  - Regular and partial versions
  - Generalized omega-squared
- **Epsilon-squared (ε²)**: Unbiased estimate
  - Kelley's epsilon-squared

#### 3. **Correlation Family**
- **Pearson r**: Linear correlation
  - Fisher's z transformation for CI
  - Point-biserial for dichotomous
- **Spearman ρ**: Rank correlation
  - Bootstrap CI
- **Kendall's τ**: Concordance measure
  - Asymptotic CI

#### 4. **Categorical Family**
- **Cramér's V**: Chi-square based
  - Bias corrected version
  - CI via bootstrap
- **Phi coefficient (φ)**: 2x2 tables
  - Exact CI
- **Cohen's w**: Chi-square effect size
  - For goodness-of-fit and independence

#### 5. **Regression Family**
- **Cohen's f²**: Multiple regression
  - For overall model and increments
  - CI via noncentral F
- **R²**: Proportion of variance
  - Adjusted R²
  - CI using Fisher's z

### Robust Estimation Methods

#### 1. **Trimmed Means**
- 20% trimmed mean (default)
- Winsorized variance
- Yuen's test for comparing trimmed means

#### 2. **M-Estimators**
- Huber M-estimator
- Tukey's biweight
- Hampel estimator

#### 3. **Median-Based**
- Hodges-Lehmann estimator
- Median absolute deviation (MAD)
- Harrell-Davis quantile estimator

### Confidence Interval Methods

#### 1. **Parametric**
- Noncentrality-based (exact when possible)
- Delta method (asymptotic)
- Profile likelihood

#### 2. **Bootstrap**
- BCa (bias-corrected and accelerated)
- Percentile method
- Basic bootstrap
- Studentized bootstrap

#### 3. **Bayesian**
- Credible intervals using conjugate priors
- Optional: MCMC for complex models

## 🏗️ Technical Architecture

### Module Structure
```
backend/core/
├── effect_sizes.py           # Main effect size calculator
├── robust_estimators.py      # Robust estimation methods
├── confidence_intervals.py   # CI calculation methods
└── tests/
    ├── test_effect_sizes.py
    ├── test_robust_estimators.py
    └── test_effect_sizes_validation.py  # R/JASP validation
```

### Core Classes

```python
class EffectSizeCalculator:
    """Calculate effect sizes with confidence intervals"""
    
    def cohens_d(data1, data2, correction='hedges', ci_method='nct')
    def eta_squared(anova_results, partial=False, ci=True)
    def cramers_v(contingency_table, bias_corrected=True)
    def cohens_f2(r_squared, predictors, ci=True)
    
class RobustEstimator:
    """Robust statistical estimators"""
    
    def trimmed_mean(data, trim_proportion=0.2)
    def huber_m_estimator(data, c=1.345)
    def hodges_lehmann(data1, data2)
    
class ConfidenceInterval:
    """Confidence interval calculations"""
    
    def bootstrap_ci(data, statistic, method='bca', n_boot=10000)
    def noncentral_ci(effect_size, df, distribution='t')
    def fisher_ci(correlation, n, confidence=0.95)
```

## 📊 Validation Requirements

### Against R packages:
- `effectsize` package (primary reference)
- `MBESS` for confidence intervals
- `robustbase` for robust methods
- `WRS2` for Wilcox robust statistics

### Against other software:
- JASP effect size calculations
- G*Power effect size conversions
- SPSS effect size outputs

### Accuracy standards:
- Effect sizes: 4+ decimal places
- Confidence intervals: 3+ decimal places
- Bootstrap: 10,000+ iterations minimum

## 🔄 Integration Points

### 1. Test Recommender Integration
```python
# Auto-calculate effect sizes after tests
result = test_recommender.recommend_and_run(data)
result.effect_size = EffectSizeCalculator.auto_calculate(result)
```

### 2. Power Analysis Integration
```python
# Use calculated effect sizes for post-hoc power
observed_d = EffectSizeCalculator.cohens_d(group1, group2)
post_hoc_power = PowerAnalyzer.calculate_power(
    test_type=TestType.TWO_SAMPLE_T,
    effect_size=observed_d.value,
    sample_size=n
)
```

### 3. Hypothesis Registry Integration
```python
# Store effect sizes with test results
registry.register_test(
    test_name="independent_t_test",
    p_value=0.03,
    effect_size=observed_d.value,
    effect_size_ci=(0.2, 0.8),
    effect_size_interpretation="medium"
)
```

## 📝 Implementation Checklist

### Phase 1: Core Effect Sizes (Day 1 Morning)
- [ ] Create effect_sizes.py module structure
- [ ] Implement Cohen's d with all variants
- [ ] Implement Hedges' g with exact correction
- [ ] Implement Glass's delta
- [ ] Add confidence interval calculations
- [ ] Create unit tests for mean differences

### Phase 2: ANOVA & Correlation (Day 1 Afternoon)
- [ ] Implement eta-squared (regular & partial)
- [ ] Implement omega-squared
- [ ] Implement correlation-based effect sizes
- [ ] Add Fisher's z transformation
- [ ] Create validation tests

### Phase 3: Categorical & Regression (Day 1 Evening)
- [ ] Implement Cramér's V with bias correction
- [ ] Implement phi coefficient
- [ ] Implement Cohen's f² for regression
- [ ] Add chi-square based effect sizes
- [ ] Complete integration tests

### Phase 4: Robust Methods (Day 2 Morning)
- [ ] Implement trimmed mean estimators
- [ ] Implement Huber M-estimator
- [ ] Implement Hodges-Lehmann estimator
- [ ] Add MAD and Winsorized variance
- [ ] Create robust comparison tests

### Phase 5: Bootstrap & Integration (Day 2 Afternoon)
- [ ] Implement BCa bootstrap
- [ ] Add percentile and basic bootstrap
- [ ] Integrate with test_recommender
- [ ] Integrate with power_analysis
- [ ] Update hypothesis_registry

### Phase 6: Validation & Documentation (Day 2 Evening)
- [ ] Validate against R effectsize package
- [ ] Compare with JASP outputs
- [ ] Update FRONTEND_REQUIREMENTS.md
- [ ] Update IMPLEMENTATION_TRACKER.md
- [ ] Create comprehensive examples

## 🎨 Frontend Components Needed

### 1. EffectSizePanel.jsx
- Display effect sizes with interpretations
- Show confidence intervals graphically
- Provide context-specific benchmarks

### 2. EffectSizeCalculatorWidget.jsx
- Standalone calculator for effect sizes
- Convert between different metrics
- Upload data or input summary statistics

### 3. RobustEstimationPanel.jsx
- Compare robust vs classical estimates
- Show influence of outliers
- Recommend appropriate methods

### 4. EffectSizeForestPlot.jsx
- Visualize multiple effect sizes
- Meta-analysis style display
- Export publication-ready plots

## 🔬 Scientific Integrity Commitments

1. **No Placeholder Values**: Every calculation uses real statistical formulas
2. **Validated Algorithms**: All methods validated against established R packages
3. **Proper Citations**: Every method includes scientific references
4. **Transparent Limitations**: Clear documentation of assumptions and limitations
5. **Reproducible Results**: Seed management for all random processes

## 📚 Key References

1. Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences (2nd ed.)
2. Hedges, L. V., & Olkin, I. (1985). Statistical Methods for Meta-Analysis
3. Wilcox, R. R. (2017). Introduction to Robust Estimation and Hypothesis Testing (4th ed.)
4. Kelley, K., & Preacher, K. J. (2012). On effect size. Psychological Methods, 17(2), 137-152
5. Cumming, G. (2014). The New Statistics: Why and How. Psychological Science, 25(1), 7-29

## ⚠️ Critical Considerations

1. **Small Sample Warnings**: Alert when n < 20 per group
2. **Assumption Violations**: Recommend robust methods when appropriate
3. **Multiple Testing**: Consider effect size adjustments for multiple comparisons
4. **Practical Significance**: Always interpret alongside statistical significance
5. **Confidence Interval Coverage**: Verify actual coverage matches nominal level

## 🚀 Success Criteria

- [ ] All effect sizes match R effectsize package within 0.0001
- [ ] Confidence intervals have correct coverage (verified via simulation)
- [ ] Robust estimators handle 30% contamination
- [ ] Bootstrap CIs stable with 10,000 iterations
- [ ] Integration seamless with existing modules
- [ ] Documentation complete with examples
- [ ] Frontend requirements fully specified

---

*Sprint Start: 2025-01-10*  
*Target Completion: 2025-01-11*  
*Quality Standard: Production-Ready with Scientific Validation*