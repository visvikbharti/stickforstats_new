"""
Test Recommender Scenario Library
==================================
Created: 2025-01-10
Author: StickForStats Development Team
Version: 1.1.0

This module contains 25+ canonical test scenarios for validating the test
recommender engine. Each scenario represents a real-world statistical
analysis situation with known correct test recommendations.

Scenarios cover:
- Simple comparisons (t-tests, ANOVA)
- Violated assumptions requiring alternatives
- Correlation and regression
- Categorical data analysis
- Multivariate analyses
- Edge cases and special situations
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


@dataclass
class TestScenario:
    """Represents a canonical test scenario"""
    scenario_id: str
    name: str
    description: str
    category: str
    
    # Data characteristics
    data_generator: callable  # Function to generate sample data
    sample_size: int
    n_variables: int
    variable_types: Dict[str, str]
    
    # Research context
    research_question: str
    dependent_variable: Optional[str]
    independent_variables: Optional[List[str]]
    
    # Expected outcomes
    expected_primary_test: str
    expected_alternatives: List[str]
    assumptions_violated: List[str]
    
    # Validation criteria
    should_auto_switch: bool
    rationale: str
    citations: List[str] = field(default_factory=list)


class ScenarioLibrary:
    """Library of canonical test scenarios"""
    
    def __init__(self):
        """Initialize the scenario library"""
        self.scenarios = self._build_scenario_library()
        logger.info(f"Scenario library initialized with {len(self.scenarios)} scenarios")
    
    def _build_scenario_library(self) -> Dict[str, TestScenario]:
        """Build the comprehensive scenario library"""
        scenarios = {}
        
        # Scenario 1: Classic two-sample t-test
        scenarios["S001"] = TestScenario(
            scenario_id="S001",
            name="Classic Independent T-Test",
            description="Compare means of two normally distributed groups with equal variances",
            category="comparison",
            data_generator=lambda: self._generate_normal_two_groups(n1=30, n2=30, mean1=100, mean2=105, sd=15),
            sample_size=60,
            n_variables=2,
            variable_types={"group": "nominal", "value": "continuous"},
            research_question="Is there a difference in means between two groups?",
            dependent_variable="value",
            independent_variables=["group"],
            expected_primary_test="independent_t_test",
            expected_alternatives=["mann_whitney_u", "welch_t_test"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="All assumptions met for parametric t-test",
            citations=["Student (1908)", "Box (1987)"]
        )
        
        # Scenario 2: Unequal variances requiring Welch's test
        scenarios["S002"] = TestScenario(
            scenario_id="S002",
            name="Heteroscedastic Two-Sample Comparison",
            description="Two groups with unequal variances (variance ratio > 3)",
            category="comparison",
            data_generator=lambda: self._generate_normal_two_groups(n1=25, n2=35, mean1=50, mean2=55, sd1=5, sd2=15),
            sample_size=60,
            n_variables=2,
            variable_types={"group": "nominal", "value": "continuous"},
            research_question="Compare means with unequal variances",
            dependent_variable="value",
            independent_variables=["group"],
            expected_primary_test="welch_t_test",
            expected_alternatives=["mann_whitney_u"],
            assumptions_violated=["homogeneity_of_variance"],
            should_auto_switch=True,
            rationale="Levene's test will detect unequal variances, recommend Welch's t-test",
            citations=["Welch (1947)", "Ruxton (2006)"]
        )
        
        # Scenario 3: Non-normal data requiring Mann-Whitney U
        scenarios["S003"] = TestScenario(
            scenario_id="S003",
            name="Skewed Distribution Comparison",
            description="Highly skewed data violating normality assumption",
            category="comparison",
            data_generator=lambda: self._generate_skewed_two_groups(n1=30, n2=30),
            sample_size=60,
            n_variables=2,
            variable_types={"group": "nominal", "value": "continuous"},
            research_question="Compare distributions of skewed data",
            dependent_variable="value",
            independent_variables=["group"],
            expected_primary_test="mann_whitney_u",
            expected_alternatives=["wilcoxon_rank_sum"],
            assumptions_violated=["normality"],
            should_auto_switch=True,
            rationale="Shapiro-Wilk will reject normality, recommend non-parametric test",
            citations=["Mann & Whitney (1947)", "Nachar (2008)"]
        )
        
        # Scenario 4: Paired samples t-test
        scenarios["S004"] = TestScenario(
            scenario_id="S004",
            name="Paired Samples Comparison",
            description="Before-after measurements on same subjects",
            category="comparison",
            data_generator=lambda: self._generate_paired_data(n=25, correlation=0.7),
            sample_size=25,
            n_variables=2,
            variable_types={"before": "continuous", "after": "continuous"},
            research_question="Is there a change from before to after?",
            dependent_variable="after",
            independent_variables=["before"],
            expected_primary_test="paired_t_test",
            expected_alternatives=["wilcoxon_signed_rank"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Paired data with normal differences",
            citations=["Zimmerman (1997)"]
        )
        
        # Scenario 5: One-way ANOVA
        scenarios["S005"] = TestScenario(
            scenario_id="S005",
            name="Multi-Group Comparison",
            description="Compare means across 4 groups",
            category="comparison",
            data_generator=lambda: self._generate_anova_data(groups=4, n_per_group=20),
            sample_size=80,
            n_variables=2,
            variable_types={"group": "nominal", "value": "continuous"},
            research_question="Do any group means differ?",
            dependent_variable="value",
            independent_variables=["group"],
            expected_primary_test="one_way_anova",
            expected_alternatives=["kruskal_wallis", "welch_anova"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Multiple groups with normal distributions and equal variances",
            citations=["Fisher (1925)", "Tukey (1949)"]
        )
        
        # Scenario 6: Kruskal-Wallis for non-normal groups
        scenarios["S006"] = TestScenario(
            scenario_id="S006",
            name="Non-Parametric Multi-Group",
            description="Multiple groups with non-normal distributions",
            category="comparison",
            data_generator=lambda: self._generate_non_normal_anova(groups=3, n_per_group=15),
            sample_size=45,
            n_variables=2,
            variable_types={"group": "nominal", "value": "continuous"},
            research_question="Compare distributions across groups",
            dependent_variable="value",
            independent_variables=["group"],
            expected_primary_test="kruskal_wallis",
            expected_alternatives=["friedman_test"],
            assumptions_violated=["normality"],
            should_auto_switch=True,
            rationale="Non-normal data requires non-parametric ANOVA alternative",
            citations=["Kruskal & Wallis (1952)"]
        )
        
        # Scenario 7: Pearson correlation
        scenarios["S007"] = TestScenario(
            scenario_id="S007",
            name="Linear Correlation",
            description="Two continuous variables with linear relationship",
            category="relationship",
            data_generator=lambda: self._generate_correlated_data(n=50, correlation=0.6),
            sample_size=50,
            n_variables=2,
            variable_types={"x": "continuous", "y": "continuous"},
            research_question="Is there a linear relationship?",
            dependent_variable="y",
            independent_variables=["x"],
            expected_primary_test="pearson_correlation",
            expected_alternatives=["spearman_correlation", "kendall_tau"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Linear relationship with normal distributions",
            citations=["Pearson (1895)", "Cohen (1988)"]
        )
        
        # Scenario 8: Spearman correlation for non-linear monotonic
        scenarios["S008"] = TestScenario(
            scenario_id="S008",
            name="Monotonic Non-Linear Relationship",
            description="Monotonic but non-linear relationship",
            category="relationship",
            data_generator=lambda: self._generate_monotonic_nonlinear(n=40),
            sample_size=40,
            n_variables=2,
            variable_types={"x": "continuous", "y": "continuous"},
            research_question="Is there a monotonic relationship?",
            dependent_variable="y",
            independent_variables=["x"],
            expected_primary_test="spearman_correlation",
            expected_alternatives=["kendall_tau"],
            assumptions_violated=["linearity"],
            should_auto_switch=True,
            rationale="Non-linear but monotonic relationship suits rank correlation",
            citations=["Spearman (1904)", "Hauke & Kossowski (2011)"]
        )
        
        # Scenario 9: Chi-square test of independence
        scenarios["S009"] = TestScenario(
            scenario_id="S009",
            name="Categorical Association",
            description="Test association between two categorical variables",
            category="categorical",
            data_generator=lambda: self._generate_contingency_table(rows=3, cols=4, n=200),
            sample_size=200,
            n_variables=2,
            variable_types={"var1": "nominal", "var2": "nominal"},
            research_question="Are the categorical variables associated?",
            dependent_variable="var2",
            independent_variables=["var1"],
            expected_primary_test="chi_square_independence",
            expected_alternatives=["fisher_exact", "g_test"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Adequate expected frequencies for chi-square test",
            citations=["Pearson (1900)", "Agresti (2002)"]
        )
        
        # Scenario 10: Fisher's exact test for small samples
        scenarios["S010"] = TestScenario(
            scenario_id="S010",
            name="Small Sample Categorical",
            description="2x2 table with small expected frequencies",
            category="categorical",
            data_generator=lambda: self._generate_small_contingency(n=20),
            sample_size=20,
            n_variables=2,
            variable_types={"treatment": "binary", "outcome": "binary"},
            research_question="Test association with small sample",
            dependent_variable="outcome",
            independent_variables=["treatment"],
            expected_primary_test="fisher_exact",
            expected_alternatives=["chi_square_independence"],
            assumptions_violated=["expected_frequencies"],
            should_auto_switch=True,
            rationale="Expected frequencies < 5 require exact test",
            citations=["Fisher (1922)", "Lydersen et al. (2009)"]
        )
        
        # Scenario 11: Simple linear regression
        scenarios["S011"] = TestScenario(
            scenario_id="S011",
            name="Simple Linear Regression",
            description="Predict continuous outcome from single predictor",
            category="prediction",
            data_generator=lambda: self._generate_regression_data(n=100, n_predictors=1),
            sample_size=100,
            n_variables=2,
            variable_types={"x": "continuous", "y": "continuous"},
            research_question="Predict y from x",
            dependent_variable="y",
            independent_variables=["x"],
            expected_primary_test="linear_regression",
            expected_alternatives=["robust_regression", "quantile_regression"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Linear relationship with homoscedastic errors",
            citations=["Galton (1886)", "Draper & Smith (1998)"]
        )
        
        # Scenario 12: Multiple regression
        scenarios["S012"] = TestScenario(
            scenario_id="S012",
            name="Multiple Linear Regression",
            description="Multiple predictors for continuous outcome",
            category="prediction",
            data_generator=lambda: self._generate_regression_data(n=150, n_predictors=4),
            sample_size=150,
            n_variables=5,
            variable_types={"x1": "continuous", "x2": "continuous", "x3": "continuous", "x4": "continuous", "y": "continuous"},
            research_question="Predict y from multiple x variables",
            dependent_variable="y",
            independent_variables=["x1", "x2", "x3", "x4"],
            expected_primary_test="multiple_regression",
            expected_alternatives=["ridge_regression", "lasso_regression"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Multiple predictors with no multicollinearity",
            citations=["Cohen et al. (2003)"]
        )
        
        # Scenario 13: Regression with multicollinearity
        scenarios["S013"] = TestScenario(
            scenario_id="S013",
            name="Multicollinear Regression",
            description="Predictors with high correlation (VIF > 10)",
            category="prediction",
            data_generator=lambda: self._generate_multicollinear_data(n=100),
            sample_size=100,
            n_variables=4,
            variable_types={"x1": "continuous", "x2": "continuous", "x3": "continuous", "y": "continuous"},
            research_question="Predict with correlated predictors",
            dependent_variable="y",
            independent_variables=["x1", "x2", "x3"],
            expected_primary_test="ridge_regression",
            expected_alternatives=["lasso_regression", "elastic_net"],
            assumptions_violated=["no_multicollinearity"],
            should_auto_switch=True,
            rationale="High VIF indicates need for regularized regression",
            citations=["Hoerl & Kennard (1970)", "Tibshirani (1996)"]
        )
        
        # Scenario 14: Logistic regression
        scenarios["S014"] = TestScenario(
            scenario_id="S014",
            name="Binary Logistic Regression",
            description="Predict binary outcome",
            category="classification",
            data_generator=lambda: self._generate_logistic_data(n=200),
            sample_size=200,
            n_variables=3,
            variable_types={"x1": "continuous", "x2": "continuous", "outcome": "binary"},
            research_question="Predict binary outcome",
            dependent_variable="outcome",
            independent_variables=["x1", "x2"],
            expected_primary_test="logistic_regression",
            expected_alternatives=["probit_regression", "discriminant_analysis"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Binary outcome with logit-linear relationship",
            citations=["Cox (1958)", "Hosmer & Lemeshow (2000)"]
        )
        
        # Scenario 15: Small sample requiring exact methods
        scenarios["S015"] = TestScenario(
            scenario_id="S015",
            name="Very Small Sample",
            description="Sample size too small for asymptotic tests",
            category="comparison",
            data_generator=lambda: self._generate_small_sample(n1=5, n2=5),
            sample_size=10,
            n_variables=2,
            variable_types={"group": "nominal", "value": "continuous"},
            research_question="Compare with very small samples",
            dependent_variable="value",
            independent_variables=["group"],
            expected_primary_test="mann_whitney_u",
            expected_alternatives=["permutation_test", "bootstrap_test"],
            assumptions_violated=["adequate_sample_size"],
            should_auto_switch=True,
            rationale="Sample size requires exact or resampling methods",
            citations=["Efron (1979)", "Good (2005)"]
        )
        
        # Scenario 16: Time series independence violation
        scenarios["S016"] = TestScenario(
            scenario_id="S016",
            name="Autocorrelated Data",
            description="Time series with significant autocorrelation",
            category="time_series",
            data_generator=lambda: self._generate_autocorrelated_data(n=100),
            sample_size=100,
            n_variables=1,
            variable_types={"value": "continuous"},
            research_question="Analyze data with temporal dependence",
            dependent_variable="value",
            independent_variables=None,
            expected_primary_test="time_series_analysis",
            expected_alternatives=["arima", "state_space_model"],
            assumptions_violated=["independence"],
            should_auto_switch=True,
            rationale="Durbin-Watson detects autocorrelation",
            citations=["Box & Jenkins (1976)", "Durbin & Watson (1950)"]
        )
        
        # Scenario 17: Heavy-tailed distribution with outliers
        scenarios["S017"] = TestScenario(
            scenario_id="S017",
            name="Heavy-Tailed with Outliers",
            description="Data with extreme outliers (>5% outliers)",
            category="comparison",
            data_generator=lambda: self._generate_heavy_tailed(n=50),
            sample_size=50,
            n_variables=2,
            variable_types={"group": "nominal", "value": "continuous"},
            research_question="Compare groups with outliers present",
            dependent_variable="value",
            independent_variables=["group"],
            expected_primary_test="mann_whitney_u",
            expected_alternatives=["trimmed_mean_test", "m_estimator"],
            assumptions_violated=["no_outliers", "normality"],
            should_auto_switch=True,
            rationale="Outliers require robust methods",
            citations=["Huber (1981)", "Wilcox (2012)"]
        )
        
        # Scenario 18: Perfect separation in logistic regression
        scenarios["S018"] = TestScenario(
            scenario_id="S018",
            name="Perfect Separation",
            description="Logistic regression with complete separation",
            category="classification",
            data_generator=lambda: self._generate_perfect_separation(n=50),
            sample_size=50,
            n_variables=2,
            variable_types={"x": "continuous", "outcome": "binary"},
            research_question="Handle perfect prediction scenario",
            dependent_variable="outcome",
            independent_variables=["x"],
            expected_primary_test="penalized_logistic",
            expected_alternatives=["exact_logistic", "bayesian_logistic"],
            assumptions_violated=["finite_mle"],
            should_auto_switch=True,
            rationale="Perfect separation requires penalization",
            citations=["Firth (1993)", "Heinze & Schemper (2002)"]
        )
        
        # Scenario 19: Zero-inflated count data
        scenarios["S019"] = TestScenario(
            scenario_id="S019",
            name="Zero-Inflated Counts",
            description="Count data with excess zeros",
            category="regression",
            data_generator=lambda: self._generate_zero_inflated(n=150),
            sample_size=150,
            n_variables=2,
            variable_types={"predictor": "continuous", "counts": "count"},
            research_question="Model count data with many zeros",
            dependent_variable="counts",
            independent_variables=["predictor"],
            expected_primary_test="zero_inflated_poisson",
            expected_alternatives=["negative_binomial", "hurdle_model"],
            assumptions_violated=["poisson_distribution"],
            should_auto_switch=True,
            rationale="Excess zeros violate Poisson assumptions",
            citations=["Lambert (1992)", "Zuur et al. (2009)"]
        )
        
        # Scenario 20: Factorial ANOVA with interaction
        scenarios["S020"] = TestScenario(
            scenario_id="S020",
            name="Factorial Design",
            description="Two-way ANOVA with interaction effect",
            category="comparison",
            data_generator=lambda: self._generate_factorial_data(n=120),
            sample_size=120,
            n_variables=3,
            variable_types={"factor1": "nominal", "factor2": "nominal", "response": "continuous"},
            research_question="Test main effects and interaction",
            dependent_variable="response",
            independent_variables=["factor1", "factor2"],
            expected_primary_test="two_way_anova",
            expected_alternatives=["aligned_rank_transform", "permutation_anova"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Factorial design with normal errors",
            citations=["Fisher (1935)", "Montgomery (2012)"]
        )
        
        # Scenario 21: Repeated measures
        scenarios["S021"] = TestScenario(
            scenario_id="S021",
            name="Repeated Measures",
            description="Within-subjects design with 4 time points",
            category="longitudinal",
            data_generator=lambda: self._generate_repeated_measures(n_subjects=30, n_times=4),
            sample_size=120,
            n_variables=3,
            variable_types={"subject": "id", "time": "ordinal", "measurement": "continuous"},
            research_question="Test change over time",
            dependent_variable="measurement",
            independent_variables=["time"],
            expected_primary_test="repeated_measures_anova",
            expected_alternatives=["friedman_test", "mixed_model"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Repeated measurements require special handling",
            citations=["Greenhouse & Geisser (1959)", "Maxwell & Delaney (2004)"]
        )
        
        # Scenario 22: Principal Component Analysis
        scenarios["S022"] = TestScenario(
            scenario_id="S022",
            name="Dimensionality Reduction",
            description="Many correlated variables needing reduction",
            category="multivariate",
            data_generator=lambda: self._generate_multivariate_normal(n=200, p=10),
            sample_size=200,
            n_variables=10,
            variable_types={f"var{i}": "continuous" for i in range(10)},
            research_question="Reduce dimensionality of correlated variables",
            dependent_variable=None,
            independent_variables=None,
            expected_primary_test="pca",
            expected_alternatives=["factor_analysis", "ica"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="High correlation structure suitable for PCA",
            citations=["Hotelling (1933)", "Jolliffe (2002)"]
        )
        
        # Scenario 23: Survival analysis
        scenarios["S023"] = TestScenario(
            scenario_id="S023",
            name="Time-to-Event Analysis",
            description="Censored survival data",
            category="survival",
            data_generator=lambda: self._generate_survival_data(n=100),
            sample_size=100,
            n_variables=3,
            variable_types={"time": "continuous", "event": "binary", "group": "nominal"},
            research_question="Compare survival between groups",
            dependent_variable="time",
            independent_variables=["group"],
            expected_primary_test="log_rank_test",
            expected_alternatives=["cox_regression", "parametric_survival"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Right-censored data requires survival methods",
            citations=["Kaplan & Meier (1958)", "Cox (1972)"]
        )
        
        # Scenario 24: Mixed effects model
        scenarios["S024"] = TestScenario(
            scenario_id="S024",
            name="Hierarchical/Nested Data",
            description="Students nested within schools",
            category="multilevel",
            data_generator=lambda: self._generate_hierarchical_data(n_groups=20, n_per_group=15),
            sample_size=300,
            n_variables=4,
            variable_types={"school": "nominal", "student": "id", "predictor": "continuous", "outcome": "continuous"},
            research_question="Account for clustering in schools",
            dependent_variable="outcome",
            independent_variables=["predictor"],
            expected_primary_test="mixed_effects_model",
            expected_alternatives=["gee", "cluster_robust_regression"],
            assumptions_violated=["independence"],
            should_auto_switch=True,
            rationale="Clustered data violates independence",
            citations=["Laird & Ware (1982)", "Raudenbush & Bryk (2002)"]
        )
        
        # Scenario 25: Bayesian t-test scenario
        scenarios["S025"] = TestScenario(
            scenario_id="S025",
            name="Strong Prior Information",
            description="Comparison with informative prior knowledge",
            category="bayesian",
            data_generator=lambda: self._generate_normal_two_groups(n1=15, n2=15, mean1=100, mean2=102, sd=10),
            sample_size=30,
            n_variables=2,
            variable_types={"group": "nominal", "value": "continuous"},
            research_question="Compare with prior information",
            dependent_variable="value",
            independent_variables=["group"],
            expected_primary_test="bayesian_t_test",
            expected_alternatives=["bayes_factor", "posterior_estimation"],
            assumptions_violated=[],
            should_auto_switch=False,
            rationale="Small sample benefits from Bayesian approach",
            citations=["Kruschke (2013)", "Wagenmakers et al. (2018)"]
        )
        
        return scenarios
    
    # Data generation methods
    def _generate_normal_two_groups(self, n1=30, n2=30, mean1=0, mean2=0, sd=1, sd1=None, sd2=None):
        """Generate two groups with normal distributions"""
        if sd1 is None:
            sd1 = sd
        if sd2 is None:
            sd2 = sd
            
        group1 = np.random.normal(mean1, sd1, n1)
        group2 = np.random.normal(mean2, sd2, n2)
        
        df = pd.DataFrame({
            'group': ['A'] * n1 + ['B'] * n2,
            'value': np.concatenate([group1, group2])
        })
        return df
    
    def _generate_skewed_two_groups(self, n1=30, n2=30):
        """Generate two groups with skewed distributions"""
        from scipy import stats
        
        # Generate skewed data using chi-square distribution
        group1 = stats.chi2.rvs(df=2, size=n1)
        group2 = stats.chi2.rvs(df=2, size=n2) + 2  # Shift second group
        
        df = pd.DataFrame({
            'group': ['A'] * n1 + ['B'] * n2,
            'value': np.concatenate([group1, group2])
        })
        return df
    
    def _generate_paired_data(self, n=25, correlation=0.7):
        """Generate paired/matched data"""
        mean = [0, 1]  # Slight increase from before to after
        cov = [[1, correlation], [correlation, 1]]
        
        data = np.random.multivariate_normal(mean, cov, n)
        
        df = pd.DataFrame({
            'before': data[:, 0],
            'after': data[:, 1]
        })
        return df
    
    def _generate_anova_data(self, groups=4, n_per_group=20):
        """Generate data for one-way ANOVA"""
        data = []
        group_labels = []
        
        for i in range(groups):
            # Each group has slightly different mean
            group_data = np.random.normal(100 + i * 5, 15, n_per_group)
            data.extend(group_data)
            group_labels.extend([f'Group_{i+1}'] * n_per_group)
        
        df = pd.DataFrame({
            'group': group_labels,
            'value': data
        })
        return df
    
    def _generate_non_normal_anova(self, groups=3, n_per_group=15):
        """Generate non-normal data for Kruskal-Wallis"""
        from scipy import stats
        
        data = []
        group_labels = []
        
        for i in range(groups):
            # Use exponential distribution (non-normal)
            group_data = stats.expon.rvs(scale=1 + i * 0.5, size=n_per_group)
            data.extend(group_data)
            group_labels.extend([f'Group_{i+1}'] * n_per_group)
        
        df = pd.DataFrame({
            'group': group_labels,
            'value': data
        })
        return df
    
    def _generate_correlated_data(self, n=50, correlation=0.6):
        """Generate linearly correlated data"""
        mean = [0, 0]
        cov = [[1, correlation], [correlation, 1]]
        
        data = np.random.multivariate_normal(mean, cov, n)
        
        df = pd.DataFrame({
            'x': data[:, 0],
            'y': data[:, 1]
        })
        return df
    
    def _generate_monotonic_nonlinear(self, n=40):
        """Generate monotonic but non-linear relationship"""
        x = np.random.uniform(0, 10, n)
        # Exponential relationship with noise
        y = np.exp(x / 3) + np.random.normal(0, 2, n)
        
        df = pd.DataFrame({'x': x, 'y': y})
        return df
    
    def _generate_contingency_table(self, rows=3, cols=4, n=200):
        """Generate categorical data for chi-square test"""
        # Generate with some association
        var1 = np.random.choice(range(rows), n, p=[0.3, 0.4, 0.3] if rows == 3 else None)
        
        # var2 depends somewhat on var1
        var2 = []
        for v1 in var1:
            if v1 == 0:
                probs = [0.4, 0.3, 0.2, 0.1] if cols == 4 else None
            elif v1 == 1:
                probs = [0.1, 0.4, 0.3, 0.2] if cols == 4 else None
            else:
                probs = [0.2, 0.2, 0.3, 0.3] if cols == 4 else None
            var2.append(np.random.choice(range(cols), p=probs))
        
        df = pd.DataFrame({
            'var1': var1,
            'var2': var2
        })
        return df
    
    def _generate_small_contingency(self, n=20):
        """Generate small 2x2 contingency table"""
        # Small sample with some association
        treatment = np.random.choice([0, 1], n)
        # Outcome depends on treatment
        outcome = []
        for t in treatment:
            if t == 0:
                outcome.append(np.random.choice([0, 1], p=[0.7, 0.3]))
            else:
                outcome.append(np.random.choice([0, 1], p=[0.3, 0.7]))
        
        df = pd.DataFrame({
            'treatment': treatment,
            'outcome': outcome
        })
        return df
    
    def _generate_regression_data(self, n=100, n_predictors=1):
        """Generate data for linear regression"""
        X = np.random.normal(0, 1, (n, n_predictors))
        
        # True coefficients
        true_beta = np.random.uniform(-2, 2, n_predictors)
        
        # Generate y with linear relationship plus noise
        y = X @ true_beta + np.random.normal(0, 1, n)
        
        df = pd.DataFrame(X, columns=[f'x{i+1}' for i in range(n_predictors)])
        df['y'] = y
        
        return df
    
    def _generate_multicollinear_data(self, n=100):
        """Generate data with multicollinearity"""
        x1 = np.random.normal(0, 1, n)
        x2 = x1 + np.random.normal(0, 0.1, n)  # Highly correlated with x1
        x3 = 2 * x1 - x2 + np.random.normal(0, 0.1, n)  # Linear combination
        
        y = x1 + 0.5 * x2 - 0.3 * x3 + np.random.normal(0, 1, n)
        
        df = pd.DataFrame({
            'x1': x1,
            'x2': x2,
            'x3': x3,
            'y': y
        })
        return df
    
    def _generate_logistic_data(self, n=200):
        """Generate data for logistic regression"""
        x1 = np.random.normal(0, 1, n)
        x2 = np.random.normal(0, 1, n)
        
        # Logit transformation
        logit = -1 + 1.5 * x1 + 0.8 * x2
        prob = 1 / (1 + np.exp(-logit))
        
        outcome = np.random.binomial(1, prob)
        
        df = pd.DataFrame({
            'x1': x1,
            'x2': x2,
            'outcome': outcome
        })
        return df
    
    def _generate_small_sample(self, n1=5, n2=5):
        """Generate very small samples"""
        return self._generate_normal_two_groups(n1=n1, n2=n2, mean1=0, mean2=1, sd=1)
    
    def _generate_autocorrelated_data(self, n=100):
        """Generate time series with autocorrelation"""
        # AR(1) process
        phi = 0.7  # Autocorrelation coefficient
        data = [np.random.normal()]
        
        for i in range(1, n):
            data.append(phi * data[-1] + np.random.normal())
        
        df = pd.DataFrame({'value': data})
        return df
    
    def _generate_heavy_tailed(self, n=50):
        """Generate data with outliers"""
        from scipy import stats
        
        # Mix of normal and contaminating distribution
        normal_data = np.random.normal(100, 10, int(n * 0.9))
        outliers = np.random.normal(100, 50, int(n * 0.1))  # 10% outliers
        
        group = np.random.choice(['A', 'B'], n)
        values = np.concatenate([normal_data, outliers])
        np.random.shuffle(values)
        
        df = pd.DataFrame({
            'group': group,
            'value': values[:n]
        })
        return df
    
    def _generate_perfect_separation(self, n=50):
        """Generate data with perfect separation for logistic regression"""
        x = np.random.uniform(-3, 3, n)
        # Perfect separation at x = 0
        outcome = (x > 0).astype(int)
        
        df = pd.DataFrame({
            'x': x,
            'outcome': outcome
        })
        return df
    
    def _generate_zero_inflated(self, n=150):
        """Generate zero-inflated count data"""
        from scipy import stats
        
        # Mixture of zeros and Poisson
        zero_prob = 0.4
        is_zero = np.random.binomial(1, zero_prob, n)
        
        predictor = np.random.normal(0, 1, n)
        lambda_param = np.exp(0.5 + 0.3 * predictor)
        
        counts = []
        for i in range(n):
            if is_zero[i]:
                counts.append(0)
            else:
                counts.append(np.random.poisson(lambda_param[i]))
        
        df = pd.DataFrame({
            'predictor': predictor,
            'counts': counts
        })
        return df
    
    def _generate_factorial_data(self, n=120):
        """Generate data for factorial ANOVA"""
        # 2x3 factorial design
        factor1 = np.repeat(['A', 'B'], n // 2)
        factor2 = np.tile(np.repeat(['Low', 'Med', 'High'], n // 6), 2)
        
        # Main effects and interaction
        response = np.random.normal(100, 10, n)
        response[factor1 == 'B'] += 5
        response[factor2 == 'High'] += 8
        # Interaction: B and High have extra boost
        response[(factor1 == 'B') & (factor2 == 'High')] += 10
        
        df = pd.DataFrame({
            'factor1': factor1,
            'factor2': factor2,
            'response': response
        })
        return df
    
    def _generate_repeated_measures(self, n_subjects=30, n_times=4):
        """Generate repeated measures data"""
        subjects = []
        times = []
        measurements = []
        
        for subj in range(n_subjects):
            baseline = np.random.normal(100, 10)
            for time in range(n_times):
                subjects.append(f'S{subj:03d}')
                times.append(time)
                # Increasing trend with subject-specific intercept
                measurements.append(baseline + time * 3 + np.random.normal(0, 5))
        
        df = pd.DataFrame({
            'subject': subjects,
            'time': times,
            'measurement': measurements
        })
        return df
    
    def _generate_multivariate_normal(self, n=200, p=10):
        """Generate multivariate normal data for PCA"""
        # Create correlation structure
        mean = np.zeros(p)
        
        # Generate random positive definite correlation matrix
        A = np.random.randn(p, p)
        cov = np.dot(A, A.T)
        # Normalize to correlation matrix
        D = np.sqrt(np.diag(np.diag(cov)))
        cov = np.linalg.inv(D) @ cov @ np.linalg.inv(D)
        
        data = np.random.multivariate_normal(mean, cov, n)
        
        df = pd.DataFrame(data, columns=[f'var{i}' for i in range(p)])
        return df
    
    def _generate_survival_data(self, n=100):
        """Generate survival data with censoring"""
        from scipy import stats
        
        # Exponential survival times
        group = np.random.choice(['Control', 'Treatment'], n)
        
        # Different hazard rates for groups
        scale_control = 50
        scale_treatment = 70
        
        times = []
        events = []
        
        for g in group:
            if g == 'Control':
                time = stats.expon.rvs(scale=scale_control)
            else:
                time = stats.expon.rvs(scale=scale_treatment)
            
            # Random censoring at 100
            if time > 100:
                times.append(100)
                events.append(0)  # Censored
            else:
                times.append(time)
                events.append(1)  # Event occurred
        
        df = pd.DataFrame({
            'time': times,
            'event': events,
            'group': group
        })
        return df
    
    def _generate_hierarchical_data(self, n_groups=20, n_per_group=15):
        """Generate hierarchical/clustered data"""
        schools = []
        students = []
        predictors = []
        outcomes = []
        
        student_id = 0
        for school in range(n_groups):
            # School-level random effect
            school_effect = np.random.normal(0, 5)
            
            for _ in range(n_per_group):
                schools.append(f'School_{school:02d}')
                students.append(f'Student_{student_id:04d}')
                student_id += 1
                
                predictor = np.random.normal(0, 1)
                # Outcome depends on predictor and school effect
                outcome = 50 + 3 * predictor + school_effect + np.random.normal(0, 3)
                
                predictors.append(predictor)
                outcomes.append(outcome)
        
        df = pd.DataFrame({
            'school': schools,
            'student': students,
            'predictor': predictors,
            'outcome': outcomes
        })
        return df
    
    def get_scenario(self, scenario_id: str) -> TestScenario:
        """Get a specific scenario by ID"""
        return self.scenarios.get(scenario_id)
    
    def list_scenarios(self) -> List[str]:
        """List all available scenario IDs"""
        return list(self.scenarios.keys())
    
    def get_scenarios_by_category(self, category: str) -> List[TestScenario]:
        """Get all scenarios in a specific category"""
        return [s for s in self.scenarios.values() if s.category == category]
    
    def validate_recommendation(self, 
                               scenario: TestScenario,
                               recommended_test: str,
                               assumption_violations: List[str]) -> Dict[str, Any]:
        """
        Validate if a recommendation matches expected behavior
        
        Args:
            scenario: Test scenario
            recommended_test: The test that was recommended
            assumption_violations: List of violated assumptions
            
        Returns:
            Validation result dictionary
        """
        result = {
            "scenario_id": scenario.scenario_id,
            "scenario_name": scenario.name,
            "passed": False,
            "expected_test": scenario.expected_primary_test,
            "recommended_test": recommended_test,
            "expected_violations": scenario.assumptions_violated,
            "detected_violations": assumption_violations,
            "feedback": []
        }
        
        # Check if primary test matches OR an appropriate alternative was selected
        test_correct = False
        if recommended_test == scenario.expected_primary_test:
            test_correct = True
            result["feedback"].append("✓ Correct primary test recommended")
        elif recommended_test in scenario.expected_alternatives:
            if scenario.should_auto_switch and assumption_violations:
                test_correct = True
                result["feedback"].append("✓ Appropriate alternative test selected due to violations")
            else:
                result["feedback"].append("⚠ Alternative test selected but may not be necessary")
        else:
            result["feedback"].append(f"✗ Unexpected test recommended: {recommended_test}")
        
        # Check assumption violations
        violations_correct = True
        for expected_violation in scenario.assumptions_violated:
            if expected_violation not in assumption_violations:
                violations_correct = False
                result["feedback"].append(f"✗ Failed to detect violation: {expected_violation}")
        
        for detected_violation in assumption_violations:
            if detected_violation not in scenario.assumptions_violated:
                result["feedback"].append(f"⚠ Unexpected violation detected: {detected_violation}")
        
        # Overall pass/fail
        result["passed"] = test_correct and (violations_correct or not scenario.assumptions_violated)
        
        return result
    
    def run_validation_suite(self, test_recommender) -> Dict[str, Any]:
        """
        Run full validation suite against a test recommender
        
        Args:
            test_recommender: TestRecommendationEngine instance
            
        Returns:
            Validation report
        """
        from ..data_profiler import DataProfiler
        
        results = []
        categories_tested = set()
        
        for scenario_id, scenario in self.scenarios.items():
            # Generate test data
            data = scenario.data_generator()
            
            # Profile the data
            profiler = DataProfiler()
            profile = profiler.profile_dataset(data)
            
            # Get recommendations
            recommendations = test_recommender.recommend_tests(
                profile=profile,
                dependent_variable=scenario.dependent_variable,
                independent_variables=scenario.independent_variables,
                data=data,
                auto_switch=True,
                max_recommendations=5
            )
            
            if recommendations:
                top_recommendation = recommendations[0]
                
                # Validate the recommendation
                validation = self.validate_recommendation(
                    scenario=scenario,
                    recommended_test=top_recommendation.test_name,
                    assumption_violations=top_recommendation.assumption_violations
                )
                
                results.append(validation)
                categories_tested.add(scenario.category)
            else:
                results.append({
                    "scenario_id": scenario.scenario_id,
                    "scenario_name": scenario.name,
                    "passed": False,
                    "feedback": ["✗ No recommendations generated"]
                })
        
        # Summarize results
        total_scenarios = len(results)
        passed_scenarios = sum(1 for r in results if r["passed"])
        
        summary = {
            "total_scenarios": total_scenarios,
            "passed_scenarios": passed_scenarios,
            "failed_scenarios": total_scenarios - passed_scenarios,
            "pass_rate": passed_scenarios / total_scenarios if total_scenarios > 0 else 0,
            "categories_tested": list(categories_tested),
            "detailed_results": results
        }
        
        return summary
    
    def generate_validation_report(self, validation_results: Dict[str, Any]) -> str:
        """
        Generate human-readable validation report
        
        Args:
            validation_results: Results from run_validation_suite
            
        Returns:
            Formatted report string
        """
        report = []
        report.append("=" * 80)
        report.append("TEST RECOMMENDER VALIDATION REPORT")
        report.append("=" * 80)
        report.append("")
        
        # Summary statistics
        report.append("SUMMARY")
        report.append("-" * 40)
        report.append(f"Total Scenarios Tested: {validation_results['total_scenarios']}")
        report.append(f"Scenarios Passed: {validation_results['passed_scenarios']}")
        report.append(f"Scenarios Failed: {validation_results['failed_scenarios']}")
        report.append(f"Pass Rate: {validation_results['pass_rate']:.1%}")
        report.append(f"Categories Tested: {', '.join(validation_results['categories_tested'])}")
        report.append("")
        
        # Detailed results by category
        report.append("DETAILED RESULTS BY CATEGORY")
        report.append("-" * 40)
        
        # Group results by pass/fail
        passed = [r for r in validation_results['detailed_results'] if r['passed']]
        failed = [r for r in validation_results['detailed_results'] if not r['passed']]
        
        if passed:
            report.append("")
            report.append("✓ PASSED SCENARIOS:")
            for result in passed:
                report.append(f"  • {result['scenario_id']}: {result['scenario_name']}")
                if result.get('feedback'):
                    for feedback in result['feedback']:
                        if feedback.startswith('✓'):
                            report.append(f"    {feedback}")
        
        if failed:
            report.append("")
            report.append("✗ FAILED SCENARIOS:")
            for result in failed:
                report.append(f"  • {result['scenario_id']}: {result['scenario_name']}")
                report.append(f"    Expected: {result.get('expected_test', 'N/A')}")
                report.append(f"    Recommended: {result.get('recommended_test', 'None')}")
                if result.get('feedback'):
                    for feedback in result['feedback']:
                        if feedback.startswith('✗'):
                            report.append(f"    {feedback}")
        
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)