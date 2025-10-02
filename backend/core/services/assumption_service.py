"""
Assumption Checking Service for Statistical Tests
=================================================
Created: 2025-08-06 11:35:00 UTC
Author: StickForStats Development Team
Version: 1.0.0

This service provides comprehensive assumption verification for all statistical tests,
ensuring scientific rigor and providing guidance when assumptions are violated.

Target Audience: Researchers, Scientists, Students
Quality: Publication-grade
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import logging
import warnings

logger = logging.getLogger(__name__)


class AssumptionSeverity(Enum):
    """Severity levels for assumption violations"""
    NONE = "none"  # No violation
    MILD = "mild"  # Minor violation, results likely robust
    MODERATE = "moderate"  # Moderate violation, interpret with caution
    SEVERE = "severe"  # Severe violation, results unreliable


@dataclass
class AssumptionResult:
    """
    Comprehensive result of an assumption check.
    
    This structure provides detailed information about assumption testing,
    including statistical evidence, severity assessment, and recommendations.
    """
    assumption_name: str
    assumption_type: str  # 'normality', 'homogeneity', 'independence', etc.
    is_met: bool
    severity: AssumptionSeverity
    
    # Statistical evidence
    test_statistic: Optional[float] = None
    p_value: Optional[float] = None
    critical_value: Optional[float] = None
    confidence_level: float = 0.95
    
    # Additional metrics
    effect_size: Optional[float] = None
    sample_size: Optional[int] = None
    degrees_of_freedom: Optional[float] = None
    
    # Detailed results
    details: Dict[str, Any] = field(default_factory=dict)
    
    # Recommendations
    recommendation: str = ""
    alternative_tests: List[str] = field(default_factory=list)
    transformations: List[str] = field(default_factory=list)
    
    # Visualization data (for plotting)
    visualization_data: Optional[Dict[str, Any]] = None
    
    # References
    test_reference: str = ""
    interpretation_guide: str = ""


class AssumptionCheckingService:
    """
    Comprehensive service for checking statistical test assumptions.
    
    This service implements rigorous assumption checking following
    best practices from statistical literature, ensuring that users
    are aware of any violations and their implications.
    """
    
    # Significance levels for assumption tests
    ALPHA_STRICT = 0.01
    ALPHA_STANDARD = 0.05
    ALPHA_LENIENT = 0.10
    
    # Sample size thresholds
    SMALL_SAMPLE = 30
    MEDIUM_SAMPLE = 100
    LARGE_SAMPLE = 1000
    
    def __init__(self, significance_level: float = 0.05):
        """
        Initialize the assumption checking service.
        
        Args:
            significance_level: Default significance level for tests
        """
        self.significance_level = significance_level
        logger.info(f"AssumptionCheckingService initialized with α={significance_level}")
        
    def check_all_assumptions(self,
                             test_type: str,
                             data: Union[pd.DataFrame, np.ndarray],
                             groups: Optional[List[str]] = None,
                             dependent_var: Optional[str] = None,
                             independent_vars: Optional[List[str]] = None) -> Dict[str, AssumptionResult]:
        """
        Check all assumptions for a specific statistical test.
        
        Args:
            test_type: Type of test ('t_test', 'anova', 'regression', etc.)
            data: Dataset to check
            groups: Group labels for group comparisons
            dependent_var: Dependent variable name
            independent_vars: Independent variable names
            
        Returns:
            Dictionary of assumption names to AssumptionResult objects
        """
        results = {}
        
        # Define assumptions for each test type
        test_assumptions = {
            't_test': ['normality', 'homogeneity_of_variance', 'independence'],
            'paired_t_test': ['normality_of_differences', 'independence_of_pairs'],
            'anova': ['normality', 'homogeneity_of_variance', 'independence'],
            'regression': ['linearity', 'independence', 'homoscedasticity', 
                          'normality_of_residuals', 'no_multicollinearity'],
            'correlation': ['linearity', 'normality', 'homoscedasticity'],
            'chi_square': ['independence', 'expected_frequencies'],
            'mann_whitney': ['independence', 'similar_shape'],
            'kruskal_wallis': ['independence', 'similar_shape']
        }
        
        assumptions = test_assumptions.get(test_type, [])
        
        for assumption in assumptions:
            if assumption == 'normality':
                results['normality'] = self.check_normality(data, dependent_var)
            elif assumption == 'normality_of_differences':
                results['normality_of_differences'] = self.check_normality_of_differences(data)
            elif assumption == 'normality_of_residuals':
                results['normality_of_residuals'] = self.check_normality_of_residuals(
                    data, dependent_var, independent_vars
                )
            elif assumption == 'homogeneity_of_variance':
                results['homogeneity_of_variance'] = self.check_homogeneity_of_variance(
                    data, groups
                )
            elif assumption == 'homoscedasticity':
                results['homoscedasticity'] = self.check_homoscedasticity(
                    data, dependent_var, independent_vars
                )
            elif assumption == 'independence':
                results['independence'] = self.check_independence(data)
            elif assumption == 'independence_of_pairs':
                results['independence_of_pairs'] = self.check_independence_of_pairs(data)
            elif assumption == 'linearity':
                results['linearity'] = self.check_linearity(
                    data, dependent_var, independent_vars
                )
            elif assumption == 'no_multicollinearity':
                results['no_multicollinearity'] = self.check_multicollinearity(
                    data, independent_vars
                )
            elif assumption == 'expected_frequencies':
                results['expected_frequencies'] = self.check_expected_frequencies(data)
            elif assumption == 'similar_shape':
                results['similar_shape'] = self.check_distribution_shape(data, groups)
                
        return results
        
    def check_normality(self,
                       data: Union[pd.Series, np.ndarray, pd.DataFrame],
                       variable: Optional[str] = None,
                       method: str = 'auto') -> AssumptionResult:
        """
        Check normality assumption using multiple tests.
        
        Args:
            data: Data to check for normality
            variable: Variable name if data is DataFrame
            method: Test method ('shapiro', 'anderson', 'dagostino', 'auto')
            
        Returns:
            AssumptionResult with normality assessment
            
        References:
            Shapiro, S.S., Wilk, M.B. (1965). Biometrika.
            Anderson, T.W., Darling, D.A. (1952). Ann. Math. Statist.
            D'Agostino, R.B. (1971). Biometrika.
        """
        # Extract series if DataFrame
        if isinstance(data, pd.DataFrame):
            if variable:
                series = data[variable].dropna()
            else:
                raise ValueError("Variable name required for DataFrame input")
        else:
            series = pd.Series(data).dropna()
            
        n = len(series)
        
        # Choose appropriate test based on sample size
        if method == 'auto':
            if n < 50:
                method = 'shapiro'
            elif n < 5000:
                method = 'anderson'
            else:
                method = 'dagostino'
                
        # Perform normality test
        if method == 'shapiro':
            stat, p_value = stats.shapiro(series)
            test_name = "Shapiro-Wilk test"
            test_ref = "Shapiro & Wilk (1965)"
            
        elif method == 'anderson':
            result = stats.anderson(series, dist='norm')
            stat = result.statistic
            critical_values = result.critical_values
            significance_levels = result.significance_level
            
            # Find p-value approximation
            for i, cv in enumerate(critical_values):
                if stat < cv:
                    p_value = significance_levels[i] / 100
                    break
            else:
                p_value = 0.001  # Very significant
                
            test_name = "Anderson-Darling test"
            test_ref = "Anderson & Darling (1952)"
            
        elif method == 'dagostino':
            stat, p_value = stats.normaltest(series)
            test_name = "D'Agostino-Pearson test"
            test_ref = "D'Agostino (1971)"
            
        else:
            raise ValueError(f"Unknown method: {method}")
            
        # Assess severity
        is_met = p_value > self.significance_level
        
        if is_met:
            severity = AssumptionSeverity.NONE
            recommendation = "Normality assumption is satisfied."
        else:
            # Calculate skewness and kurtosis for severity assessment
            skew = stats.skew(series)
            kurt = stats.kurtosis(series)
            
            if abs(skew) < 0.5 and abs(kurt) < 1:
                severity = AssumptionSeverity.MILD
                recommendation = "Mild deviation from normality. Results likely robust if n > 30."
            elif abs(skew) < 1 and abs(kurt) < 3:
                severity = AssumptionSeverity.MODERATE
                recommendation = "Moderate deviation from normality. Consider non-parametric alternatives."
            else:
                severity = AssumptionSeverity.SEVERE
                recommendation = "Severe deviation from normality. Use non-parametric tests."
                
        # Suggest transformations if needed
        transformations = []
        if not is_met:
            if skew > 1:
                transformations.extend(['log', 'sqrt', 'reciprocal'])
            elif skew < -1:
                transformations.extend(['square', 'cube', 'exp'])
                
        # Alternative tests
        alternatives = []
        if not is_met:
            alternatives.extend([
                'Mann-Whitney U test (for two groups)',
                'Kruskal-Wallis test (for multiple groups)',
                'Wilcoxon signed-rank test (for paired data)',
                'Bootstrap methods'
            ])
            
        # Prepare visualization data
        viz_data = {
            'values': series.values.tolist(),
            'theoretical_quantiles': stats.norm.ppf(
                np.linspace(0.01, 0.99, len(series))
            ).tolist(),
            'histogram_bins': 30,
            'kde': True
        }
        
        return AssumptionResult(
            assumption_name="Normality",
            assumption_type="normality",
            is_met=is_met,
            severity=severity,
            test_statistic=float(stat),
            p_value=float(p_value),
            confidence_level=1 - self.significance_level,
            sample_size=n,
            details={
                'test_name': test_name,
                'skewness': float(skew),
                'kurtosis': float(kurt),
                'mean': float(series.mean()),
                'std': float(series.std()),
                'median': float(series.median())
            },
            recommendation=recommendation,
            alternative_tests=alternatives,
            transformations=transformations,
            visualization_data=viz_data,
            test_reference=test_ref,
            interpretation_guide=f"p-value > {self.significance_level} indicates normality"
        )
        
    def check_homogeneity_of_variance(self,
                                     data: pd.DataFrame,
                                     groups: Union[str, List[str]],
                                     method: str = 'levene') -> AssumptionResult:
        """
        Check homogeneity of variance assumption.
        
        Args:
            data: DataFrame containing data
            groups: Column name(s) defining groups
            method: Test method ('levene', 'bartlett', 'fligner')
            
        Returns:
            AssumptionResult with homogeneity assessment
            
        References:
            Levene, H. (1960). In Contributions to Probability and Statistics.
            Bartlett, M.S. (1937). Proc. R. Soc. Lond. A.
        """
        # Prepare group data
        if isinstance(groups, str):
            group_col = groups
            group_data = [group_df.dropna().values 
                         for _, group_df in data.groupby(group_col)]
        else:
            # Multiple grouping variables
            group_data = [group_df.dropna().values 
                         for _, group_df in data.groupby(groups)]
            
        # Perform test
        if method == 'levene':
            stat, p_value = stats.levene(*group_data, center='median')
            test_name = "Levene's test"
            test_ref = "Levene (1960)"
            
        elif method == 'bartlett':
            stat, p_value = stats.bartlett(*group_data)
            test_name = "Bartlett's test"
            test_ref = "Bartlett (1937)"
            
        elif method == 'fligner':
            stat, p_value = stats.fligner(*group_data)
            test_name = "Fligner-Killeen test"
            test_ref = "Fligner & Killeen (1976)"
            
        else:
            raise ValueError(f"Unknown method: {method}")
            
        # Assess result
        is_met = p_value > self.significance_level
        
        # Calculate variance ratio for severity
        variances = [np.var(g, ddof=1) for g in group_data]
        var_ratio = max(variances) / min(variances) if min(variances) > 0 else float('inf')
        
        if is_met:
            severity = AssumptionSeverity.NONE
            recommendation = "Homogeneity of variance assumption is satisfied."
        else:
            if var_ratio < 3:
                severity = AssumptionSeverity.MILD
                recommendation = "Mild heterogeneity. ANOVA is robust if groups are equal sized."
            elif var_ratio < 10:
                severity = AssumptionSeverity.MODERATE
                recommendation = "Moderate heterogeneity. Consider Welch's ANOVA."
            else:
                severity = AssumptionSeverity.SEVERE
                recommendation = "Severe heterogeneity. Use Welch's ANOVA or non-parametric tests."
                
        alternatives = []
        if not is_met:
            alternatives.extend([
                "Welch's ANOVA",
                "Brown-Forsythe test",
                "Kruskal-Wallis test",
                "Robust ANOVA methods"
            ])
            
        return AssumptionResult(
            assumption_name="Homogeneity of Variance",
            assumption_type="homogeneity_of_variance",
            is_met=is_met,
            severity=severity,
            test_statistic=float(stat),
            p_value=float(p_value),
            confidence_level=1 - self.significance_level,
            sample_size=sum(len(g) for g in group_data),
            degrees_of_freedom=len(group_data) - 1,
            details={
                'test_name': test_name,
                'group_variances': variances,
                'variance_ratio': float(var_ratio),
                'n_groups': len(group_data),
                'group_sizes': [len(g) for g in group_data]
            },
            recommendation=recommendation,
            alternative_tests=alternatives,
            test_reference=test_ref,
            interpretation_guide=f"p-value > {self.significance_level} indicates equal variances"
        )
        
    def check_independence(self,
                          data: Union[pd.DataFrame, np.ndarray],
                          method: str = 'durbin_watson') -> AssumptionResult:
        """
        Check independence assumption (no autocorrelation).
        
        Args:
            data: Data to check for independence
            method: Test method ('durbin_watson', 'runs_test')
            
        Returns:
            AssumptionResult with independence assessment
            
        References:
            Durbin, J., Watson, G.S. (1951). Biometrika.
        """
        if isinstance(data, pd.DataFrame):
            # Use first numeric column
            numeric_cols = data.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) == 0:
                raise ValueError("No numeric columns found")
            series = data[numeric_cols[0]].dropna()
        else:
            series = pd.Series(data).dropna()
            
        n = len(series)
        
        if method == 'durbin_watson':
            # Calculate Durbin-Watson statistic
            residuals = series - series.mean()
            diff_resid = np.diff(residuals)
            dw_stat = np.sum(diff_resid**2) / np.sum(residuals**2)
            
            # Interpretation (rough guidelines)
            if 1.5 < dw_stat < 2.5:
                is_met = True
                severity = AssumptionSeverity.NONE
                recommendation = "No significant autocorrelation detected."
            elif 1 < dw_stat <= 1.5 or 2.5 <= dw_stat < 3:
                is_met = False
                severity = AssumptionSeverity.MILD
                recommendation = "Mild autocorrelation detected."
            else:
                is_met = False
                severity = AssumptionSeverity.MODERATE
                recommendation = "Significant autocorrelation detected."
                
            test_name = "Durbin-Watson test"
            test_ref = "Durbin & Watson (1951)"
            p_value = None  # DW test doesn't provide p-value directly
            
        else:
            raise ValueError(f"Unknown method: {method}")
            
        alternatives = []
        if not is_met:
            alternatives.extend([
                "Generalized Least Squares (GLS)",
                "Autoregressive models",
                "Time series methods",
                "Robust standard errors"
            ])
            
        return AssumptionResult(
            assumption_name="Independence",
            assumption_type="independence",
            is_met=is_met,
            severity=severity,
            test_statistic=float(dw_stat),
            p_value=p_value,
            sample_size=n,
            details={
                'test_name': test_name,
                'interpretation': '2.0 indicates no autocorrelation'
            },
            recommendation=recommendation,
            alternative_tests=alternatives,
            test_reference=test_ref
        )
        
    def check_linearity(self,
                       data: pd.DataFrame,
                       dependent_var: str,
                       independent_vars: List[str]) -> AssumptionResult:
        """
        Check linearity assumption for regression.
        
        Args:
            data: DataFrame containing variables
            dependent_var: Dependent variable name
            independent_vars: Independent variable names
            
        Returns:
            AssumptionResult with linearity assessment
        """
        # For simplicity, check correlation linearity
        # In production, would use residual plots, RESET test, etc.
        
        linearities = []
        for var in independent_vars:
            # Calculate correlation
            corr, p_value = stats.pearsonr(
                data[var].dropna(),
                data[dependent_var].dropna()
            )
            
            # Calculate Spearman correlation for comparison
            spearman_corr, _ = stats.spearmanr(
                data[var].dropna(),
                data[dependent_var].dropna()
            )
            
            # If Spearman much stronger than Pearson, suggests non-linearity
            linearity_ratio = abs(corr) / abs(spearman_corr) if spearman_corr != 0 else 1
            linearities.append(linearity_ratio)
            
        avg_linearity = np.mean(linearities)
        
        if avg_linearity > 0.9:
            is_met = True
            severity = AssumptionSeverity.NONE
            recommendation = "Linearity assumption appears satisfied."
        elif avg_linearity > 0.7:
            is_met = False
            severity = AssumptionSeverity.MILD
            recommendation = "Mild non-linearity detected. Consider polynomial terms."
        else:
            is_met = False
            severity = AssumptionSeverity.MODERATE
            recommendation = "Significant non-linearity. Consider transformations or non-linear models."
            
        transformations = []
        if not is_met:
            transformations.extend([
                'Polynomial terms',
                'Log transformation',
                'Spline functions',
                'Interaction terms'
            ])
            
        return AssumptionResult(
            assumption_name="Linearity",
            assumption_type="linearity",
            is_met=is_met,
            severity=severity,
            details={
                'average_linearity': float(avg_linearity),
                'linearity_per_var': {
                    var: float(lin) 
                    for var, lin in zip(independent_vars, linearities)
                }
            },
            recommendation=recommendation,
            transformations=transformations
        )
        
    def check_multicollinearity(self,
                               data: pd.DataFrame,
                               independent_vars: List[str]) -> AssumptionResult:
        """
        Check for multicollinearity using VIF.
        
        Args:
            data: DataFrame containing variables
            independent_vars: Independent variable names
            
        Returns:
            AssumptionResult with multicollinearity assessment
        """
        from sklearn.linear_model import LinearRegression
        
        vif_scores = {}
        max_vif = 0
        
        for var in independent_vars:
            # Prepare data
            X = data[independent_vars].drop(columns=[var])
            y = data[var]
            
            # Remove missing values
            valid_idx = X.notna().all(axis=1) & y.notna()
            X = X[valid_idx]
            y = y[valid_idx]
            
            if len(X) < len(X.columns) + 1:
                vif_scores[var] = float('inf')
            else:
                # Calculate R-squared
                model = LinearRegression()
                model.fit(X, y)
                r_squared = model.score(X, y)
                
                # Calculate VIF
                vif = 1 / (1 - r_squared) if r_squared < 1 else float('inf')
                vif_scores[var] = float(vif)
                max_vif = max(max_vif, vif)
                
        # Assess severity
        if max_vif < 5:
            is_met = True
            severity = AssumptionSeverity.NONE
            recommendation = "No multicollinearity detected."
        elif max_vif < 10:
            is_met = False
            severity = AssumptionSeverity.MILD
            recommendation = "Mild multicollinearity. Monitor but likely acceptable."
        elif max_vif < 20:
            is_met = False
            severity = AssumptionSeverity.MODERATE
            recommendation = "Moderate multicollinearity. Consider removing variables."
        else:
            is_met = False
            severity = AssumptionSeverity.SEVERE
            recommendation = "Severe multicollinearity. Remove highly correlated variables."
            
        alternatives = []
        if not is_met:
            alternatives.extend([
                "Ridge regression",
                "Lasso regression",
                "Principal Component Regression",
                "Remove correlated variables"
            ])
            
        return AssumptionResult(
            assumption_name="No Multicollinearity",
            assumption_type="no_multicollinearity",
            is_met=is_met,
            severity=severity,
            details={
                'vif_scores': vif_scores,
                'max_vif': float(max_vif),
                'problematic_vars': [v for v, s in vif_scores.items() if s > 10]
            },
            recommendation=recommendation,
            alternative_tests=alternatives,
            interpretation_guide="VIF < 5 indicates no multicollinearity"
        )
        
    def check_normality_of_differences(self,
                                      data: pd.DataFrame,
                                      var1: str = None,
                                      var2: str = None) -> AssumptionResult:
        """Check normality of paired differences."""
        if var1 and var2:
            differences = data[var1] - data[var2]
        else:
            # Assume first two numeric columns
            numeric_cols = data.select_dtypes(include=[np.number]).columns[:2]
            differences = data[numeric_cols[0]] - data[numeric_cols[1]]
            
        return self.check_normality(differences)
        
    def check_normality_of_residuals(self,
                                    data: pd.DataFrame,
                                    dependent_var: str,
                                    independent_vars: List[str]) -> AssumptionResult:
        """Check normality of regression residuals."""
        from sklearn.linear_model import LinearRegression
        
        # Fit model
        X = data[independent_vars].dropna()
        y = data[dependent_var].dropna()
        
        # Align data
        valid_idx = X.index.intersection(y.index)
        X = X.loc[valid_idx]
        y = y.loc[valid_idx]
        
        model = LinearRegression()
        model.fit(X, y)
        
        # Calculate residuals
        residuals = y - model.predict(X)
        
        # Check normality of residuals
        result = self.check_normality(residuals)
        result.assumption_name = "Normality of Residuals"
        
        return result
        
    def check_homoscedasticity(self,
                              data: pd.DataFrame,
                              dependent_var: str,
                              independent_vars: List[str]) -> AssumptionResult:
        """Check homoscedasticity (constant variance of residuals)."""
        from sklearn.linear_model import LinearRegression
        
        # Fit model and get residuals
        X = data[independent_vars].dropna()
        y = data[dependent_var].dropna()
        
        valid_idx = X.index.intersection(y.index)
        X = X.loc[valid_idx]
        y = y.loc[valid_idx]
        
        model = LinearRegression()
        model.fit(X, y)
        residuals = y - model.predict(X)
        fitted_values = model.predict(X)
        
        # Breusch-Pagan test for heteroscedasticity
        # Regress squared residuals on fitted values
        from scipy.stats import chi2
        
        residuals_squared = residuals ** 2
        X_bp = np.column_stack([np.ones(len(fitted_values)), fitted_values])
        
        # OLS for squared residuals
        beta = np.linalg.lstsq(X_bp, residuals_squared, rcond=None)[0]
        predicted = X_bp @ beta
        
        # Calculate test statistic
        n = len(residuals)
        lm_statistic = n * (1 - np.sum((residuals_squared - predicted)**2) / 
                           np.sum((residuals_squared - residuals_squared.mean())**2))
        
        # p-value from chi-square distribution
        p_value = 1 - chi2.cdf(lm_statistic, df=1)
        
        is_met = p_value > self.significance_level
        
        if is_met:
            severity = AssumptionSeverity.NONE
            recommendation = "Homoscedasticity assumption is satisfied."
        else:
            severity = AssumptionSeverity.MODERATE
            recommendation = "Heteroscedasticity detected. Use robust standard errors."
            
        return AssumptionResult(
            assumption_name="Homoscedasticity",
            assumption_type="homoscedasticity",
            is_met=is_met,
            severity=severity,
            test_statistic=float(lm_statistic),
            p_value=float(p_value),
            recommendation=recommendation,
            alternative_tests=["Weighted Least Squares", "Robust standard errors"],
            test_reference="Breusch & Pagan (1979)"
        )
        
    def check_independence_of_pairs(self, data: pd.DataFrame) -> AssumptionResult:
        """Check independence of paired observations."""
        # This is more of a study design issue
        # We can check for patterns in the differences
        
        numeric_cols = data.select_dtypes(include=[np.number]).columns[:2]
        if len(numeric_cols) < 2:
            raise ValueError("Need at least 2 numeric columns for paired data")
            
        differences = data[numeric_cols[0]] - data[numeric_cols[1]]
        
        # Check for autocorrelation in differences
        return self.check_independence(differences)
        
    def check_expected_frequencies(self,
                                  contingency_table: pd.DataFrame,
                                  min_expected: float = 5.0) -> AssumptionResult:
        """Check expected frequencies for chi-square test."""
        # Calculate expected frequencies
        row_totals = contingency_table.sum(axis=1)
        col_totals = contingency_table.sum(axis=0)
        total = contingency_table.sum().sum()
        
        expected = np.outer(row_totals, col_totals) / total
        
        # Check minimum expected frequency
        min_exp = expected.min()
        cells_below_5 = (expected < min_expected).sum()
        total_cells = expected.size
        pct_below_5 = cells_below_5 / total_cells * 100
        
        if min_exp >= min_expected:
            is_met = True
            severity = AssumptionSeverity.NONE
            recommendation = "Expected frequencies assumption is satisfied."
        elif min_exp >= 1 and pct_below_5 < 20:
            is_met = True
            severity = AssumptionSeverity.MILD
            recommendation = "Assumption marginally satisfied (< 20% cells with expected < 5)."
        else:
            is_met = False
            severity = AssumptionSeverity.SEVERE
            recommendation = "Expected frequencies too low. Use Fisher's exact test."
            
        return AssumptionResult(
            assumption_name="Expected Frequencies",
            assumption_type="expected_frequencies",
            is_met=is_met,
            severity=severity,
            details={
                'min_expected': float(min_exp),
                'cells_below_5': int(cells_below_5),
                'pct_below_5': float(pct_below_5)
            },
            recommendation=recommendation,
            alternative_tests=["Fisher's exact test"] if not is_met else []
        )
        
    def check_distribution_shape(self,
                                data: pd.DataFrame,
                                groups: str) -> AssumptionResult:
        """Check if distributions have similar shape for non-parametric tests."""
        # Compare distribution shapes across groups
        group_data = [group_df.dropna().values 
                     for _, group_df in data.groupby(groups)]
        
        # Use KS test to compare distributions
        p_values = []
        for i in range(len(group_data) - 1):
            _, p = stats.ks_2samp(group_data[i], group_data[i+1])
            p_values.append(p)
            
        min_p = min(p_values) if p_values else 1.0
        
        is_met = min_p > self.significance_level
        
        if is_met:
            severity = AssumptionSeverity.NONE
            recommendation = "Distributions have similar shape."
        else:
            severity = AssumptionSeverity.MODERATE
            recommendation = "Distributions differ in shape. Interpret median differences cautiously."
            
        return AssumptionResult(
            assumption_name="Similar Distribution Shape",
            assumption_type="similar_shape",
            is_met=is_met,
            severity=severity,
            p_value=float(min_p),
            recommendation=recommendation
        )
        
    def generate_assumption_report(self,
                                  results: Dict[str, AssumptionResult]) -> str:
        """
        Generate comprehensive assumption checking report.
        
        Args:
            results: Dictionary of assumption results
            
        Returns:
            Formatted report string
        """
        report = []
        report.append("=" * 80)
        report.append("ASSUMPTION CHECKING REPORT")
        report.append("=" * 80)
        report.append("")
        
        # Summary
        n_checked = len(results)
        n_met = sum(1 for r in results.values() if r.is_met)
        n_violations = n_checked - n_met
        
        report.append(f"Assumptions Checked: {n_checked}")
        report.append(f"Assumptions Met: {n_met}")
        report.append(f"Violations Found: {n_violations}")
        report.append("")
        
        # Severity summary
        severities = [r.severity for r in results.values() if not r.is_met]
        if severities:
            severe_count = sum(1 for s in severities if s == AssumptionSeverity.SEVERE)
            moderate_count = sum(1 for s in severities if s == AssumptionSeverity.MODERATE)
            mild_count = sum(1 for s in severities if s == AssumptionSeverity.MILD)
            
            if severe_count > 0:
                report.append(f"⚠️ SEVERE violations: {severe_count}")
            if moderate_count > 0:
                report.append(f"⚠️ MODERATE violations: {moderate_count}")
            if mild_count > 0:
                report.append(f"ℹ️ MILD violations: {mild_count}")
            report.append("")
            
        # Detailed results
        report.append("DETAILED RESULTS")
        report.append("-" * 40)
        
        for name, result in results.items():
            status = "✓" if result.is_met else "✗"
            report.append(f"\n{status} {result.assumption_name}")
            
            if result.test_statistic is not None:
                report.append(f"   Test Statistic: {result.test_statistic:.4f}")
            if result.p_value is not None:
                report.append(f"   p-value: {result.p_value:.4f}")
                
            if not result.is_met:
                report.append(f"   Severity: {result.severity.value.upper()}")
                report.append(f"   Recommendation: {result.recommendation}")
                
                if result.alternative_tests:
                    report.append("   Alternatives:")
                    for alt in result.alternative_tests:
                        report.append(f"      • {alt}")
                        
                if result.transformations:
                    report.append("   Suggested Transformations:")
                    for trans in result.transformations:
                        report.append(f"      • {trans}")
                        
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)