"""
Non-parametric Statistical Tests Service
=========================================

Comprehensive implementation of non-parametric (distribution-free) tests.
These tests make minimal assumptions about the underlying data distribution.

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import rankdata, mannwhitneyu, wilcoxon, kruskal, friedmanchisquare
from scipy.stats import spearmanr, kendalltau
from typing import Dict, Any, List, Tuple, Optional, Union
import warnings
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class NonParametricResult:
    """Container for non-parametric test results."""
    test_name: str
    statistic: float
    p_value: float
    alternative: str
    effect_size: Optional[float] = None
    confidence_interval: Optional[Tuple[float, float]] = None
    sample_sizes: Optional[Dict[str, int]] = None
    location_estimate: Optional[float] = None
    method_used: Optional[str] = None
    ties_present: bool = False
    exact_p_value: Optional[bool] = None
    interpretation: Optional[str] = None


class NonParametricService:
    """
    Comprehensive non-parametric statistical tests service.
    
    Provides distribution-free alternatives to parametric tests when
    assumptions like normality are violated.
    """
    
    def __init__(self):
        """Initialize the non-parametric tests service."""
        self.last_result = None
    
    def mann_whitney_u_test(self, 
                           group1: Union[np.ndarray, pd.Series],
                           group2: Union[np.ndarray, pd.Series],
                           alternative: str = 'two-sided',
                           use_continuity: bool = True,
                           compute_effect_size: bool = True,
                           confidence_level: float = 0.95) -> NonParametricResult:
        """
        Mann-Whitney U test (Wilcoxon rank-sum test) for two independent samples.
        
        Non-parametric alternative to independent samples t-test.
        
        Args:
            group1: First sample
            group2: Second sample
            alternative: 'two-sided', 'less', or 'greater'
            use_continuity: Apply continuity correction
            compute_effect_size: Calculate rank-biserial correlation
            confidence_level: Confidence level for location shift CI
            
        Returns:
            NonParametricResult with test statistics
        """
        # Convert to numpy arrays
        x = np.asarray(group1)
        y = np.asarray(group2)
        
        # Remove NaN values
        x = x[~np.isnan(x)]
        y = y[~np.isnan(y)]
        
        n1, n2 = len(x), len(y)
        
        if n1 == 0 or n2 == 0:
            raise ValueError("Both groups must contain at least one observation")
        
        # Perform test using scipy
        result = mannwhitneyu(x, y, alternative=alternative, use_continuity=use_continuity)
        u_statistic = result.statistic
        p_value = result.pvalue
        
        # Calculate exact p-value for small samples
        exact_p = None
        if n1 <= 20 and n2 <= 20:
            # Use exact method for small samples
            exact_p = True
            if alternative == 'two-sided':
                # Exact calculation for two-sided test
                u_min = min(u_statistic, n1 * n2 - u_statistic)
                # For exact p-value, we'd need to enumerate all permutations
                # Using approximation here
                exact_p = False
        
        # Check for ties
        combined = np.concatenate([x, y])
        ranks = rankdata(combined)
        ties_present = len(np.unique(combined)) < len(combined)
        
        # Calculate effect size (rank-biserial correlation)
        effect_size = None
        if compute_effect_size:
            # r = 1 - (2U)/(n1*n2)
            effect_size = 1 - (2 * u_statistic) / (n1 * n2)
        
        # Calculate confidence interval for location shift (Hodges-Lehmann estimator)
        location_estimate, ci_lower, ci_upper = self._hodges_lehmann_estimator(
            x, y, confidence_level
        )
        
        # Interpretation
        interpretation = self._interpret_mann_whitney(
            p_value, effect_size, alternative, n1, n2
        )
        
        result = NonParametricResult(
            test_name="Mann-Whitney U Test",
            statistic=u_statistic,
            p_value=p_value,
            alternative=alternative,
            effect_size=effect_size,
            confidence_interval=(ci_lower, ci_upper),
            sample_sizes={'group1': n1, 'group2': n2},
            location_estimate=location_estimate,
            method_used='exact' if exact_p else 'asymptotic',
            ties_present=ties_present,
            exact_p_value=exact_p,
            interpretation=interpretation
        )
        
        self.last_result = result
        return result
    
    def wilcoxon_signed_rank_test(self,
                                 x: Union[np.ndarray, pd.Series],
                                 y: Optional[Union[np.ndarray, pd.Series]] = None,
                                 zero_method: str = 'wilcox',
                                 alternative: str = 'two-sided',
                                 compute_effect_size: bool = True,
                                 confidence_level: float = 0.95) -> NonParametricResult:
        """
        Wilcoxon signed-rank test for paired samples or one-sample test.
        
        Non-parametric alternative to paired t-test or one-sample t-test.
        
        Args:
            x: First sample or paired differences
            y: Second sample (for paired test) or None (for one-sample test)
            zero_method: How to handle zeros ('wilcox', 'pratt', 'zsplit')
            alternative: 'two-sided', 'less', or 'greater'
            compute_effect_size: Calculate effect size
            confidence_level: Confidence level for median CI
            
        Returns:
            NonParametricResult with test statistics
        """
        # Prepare data
        if y is not None:
            # Paired test
            x = np.asarray(x)
            y = np.asarray(y)
            
            # Remove pairs with NaN
            mask = ~(np.isnan(x) | np.isnan(y))
            x = x[mask]
            y = y[mask]
            
            if len(x) != len(y):
                raise ValueError("Samples must have the same length for paired test")
            
            # Calculate differences
            differences = x - y
            test_type = "Wilcoxon Signed-Rank Test (Paired)"
            n_pairs = len(x)
        else:
            # One-sample test (test if median equals 0)
            differences = np.asarray(x)
            differences = differences[~np.isnan(differences)]
            test_type = "Wilcoxon Signed-Rank Test (One-Sample)"
            n_pairs = len(differences)
        
        if n_pairs == 0:
            raise ValueError("No valid observations")
        
        # Perform test
        if n_pairs > 0:
            result = wilcoxon(differences, alternative=alternative, 
                            zero_method=zero_method)
            w_statistic = result.statistic
            p_value = result.pvalue
        else:
            w_statistic = np.nan
            p_value = np.nan
        
        # Check for ties and zeros
        ties_present = len(np.unique(np.abs(differences))) < len(differences)
        zeros_present = np.sum(differences == 0) > 0
        
        # Calculate effect size (matched-pairs rank-biserial correlation)
        effect_size = None
        if compute_effect_size and n_pairs > 0:
            # r = 1 - (2W / (n*(n+1)))
            n = n_pairs
            effect_size = 1 - (2 * w_statistic) / (n * (n + 1))
        
        # Calculate confidence interval for median
        median_estimate = np.median(differences)
        ci_lower, ci_upper = self._wilcoxon_confidence_interval(
            differences, confidence_level
        )
        
        # Interpretation
        interpretation = self._interpret_wilcoxon(
            p_value, effect_size, alternative, n_pairs, zeros_present
        )
        
        result = NonParametricResult(
            test_name=test_type,
            statistic=w_statistic,
            p_value=p_value,
            alternative=alternative,
            effect_size=effect_size,
            confidence_interval=(ci_lower, ci_upper),
            sample_sizes={'n': n_pairs},
            location_estimate=median_estimate,
            method_used=f'zero_method={zero_method}',
            ties_present=ties_present,
            interpretation=interpretation
        )
        
        self.last_result = result
        return result
    
    def kruskal_wallis_test(self,
                           *groups: Union[np.ndarray, pd.Series],
                           compute_post_hoc: bool = True,
                           post_hoc_method: str = 'dunn') -> Dict[str, Any]:
        """
        Kruskal-Wallis H test for multiple independent samples.
        
        Non-parametric alternative to one-way ANOVA.
        
        Args:
            *groups: Variable number of group samples
            compute_post_hoc: Whether to compute post-hoc tests
            post_hoc_method: 'dunn' or 'conover' for post-hoc tests
            
        Returns:
            Dictionary with test results and optional post-hoc comparisons
        """
        # Convert groups to numpy arrays and remove NaN
        clean_groups = []
        group_sizes = []
        
        for i, group in enumerate(groups):
            g = np.asarray(group)
            g = g[~np.isnan(g)]
            if len(g) == 0:
                raise ValueError(f"Group {i+1} has no valid observations")
            clean_groups.append(g)
            group_sizes.append(len(g))
        
        if len(clean_groups) < 2:
            raise ValueError("Need at least 2 groups for Kruskal-Wallis test")
        
        # Perform test
        h_stat, p_value = kruskal(*clean_groups)
        
        # Calculate effect size (epsilon-squared)
        n_total = sum(group_sizes)
        epsilon_squared = (h_stat - len(clean_groups) + 1) / (n_total - len(clean_groups))
        
        # Check for ties
        all_data = np.concatenate(clean_groups)
        ties_present = len(np.unique(all_data)) < len(all_data)
        
        results = {
            'test_name': 'Kruskal-Wallis H Test',
            'h_statistic': float(h_stat),
            'p_value': float(p_value),
            'degrees_of_freedom': len(clean_groups) - 1,
            'n_groups': len(clean_groups),
            'group_sizes': group_sizes,
            'n_total': n_total,
            'effect_size': float(epsilon_squared),
            'effect_size_interpretation': self._interpret_epsilon_squared(epsilon_squared),
            'ties_present': ties_present,
            'significant': p_value < 0.05,
            'interpretation': self._interpret_kruskal_wallis(p_value, epsilon_squared, len(clean_groups))
        }
        
        # Post-hoc tests if significant and requested
        if compute_post_hoc and p_value < 0.05:
            if post_hoc_method == 'dunn':
                results['post_hoc'] = self._dunn_test(clean_groups, group_sizes)
            elif post_hoc_method == 'conover':
                results['post_hoc'] = self._conover_test(clean_groups, group_sizes)
            else:
                logger.warning(f"Unknown post-hoc method: {post_hoc_method}")
        
        # Calculate group medians and ranks
        group_stats = []
        for i, group in enumerate(clean_groups):
            group_stats.append({
                'group': i + 1,
                'n': len(group),
                'median': float(np.median(group)),
                'mean_rank': float(np.mean(rankdata(np.concatenate(clean_groups))[sum(group_sizes[:i]):sum(group_sizes[:i+1])])),
                'q1': float(np.percentile(group, 25)),
                'q3': float(np.percentile(group, 75))
            })
        results['group_statistics'] = group_stats
        
        return results
    
    def friedman_test(self,
                     data: Union[np.ndarray, pd.DataFrame],
                     compute_post_hoc: bool = True) -> Dict[str, Any]:
        """
        Friedman test for repeated measures on multiple conditions.
        
        Non-parametric alternative to repeated measures ANOVA.
        
        Args:
            data: 2D array or DataFrame (rows=subjects, columns=conditions)
            compute_post_hoc: Whether to compute post-hoc tests
            
        Returns:
            Dictionary with test results and optional post-hoc comparisons
        """
        # Convert to numpy array
        if isinstance(data, pd.DataFrame):
            condition_names = data.columns.tolist()
            data = data.values
        else:
            data = np.asarray(data)
            condition_names = [f'Condition_{i+1}' for i in range(data.shape[1])]
        
        # Remove rows with any NaN
        mask = ~np.any(np.isnan(data), axis=1)
        data_clean = data[mask]
        
        if data_clean.shape[0] < 2:
            raise ValueError("Need at least 2 subjects for Friedman test")
        if data_clean.shape[1] < 2:
            raise ValueError("Need at least 2 conditions for Friedman test")
        
        n_subjects, n_conditions = data_clean.shape
        
        # Perform test
        chi2_stat, p_value = friedmanchisquare(*data_clean.T)
        
        # Calculate effect size (Kendall's W)
        ranks = np.apply_along_axis(rankdata, 1, data_clean)
        mean_ranks = np.mean(ranks, axis=0)
        ss_total = n_subjects * np.sum((mean_ranks - np.mean(mean_ranks))**2)
        w = 12 * ss_total / (n_subjects**2 * (n_conditions**3 - n_conditions))
        
        results = {
            'test_name': 'Friedman Test',
            'chi2_statistic': float(chi2_stat),
            'p_value': float(p_value),
            'degrees_of_freedom': n_conditions - 1,
            'n_subjects': n_subjects,
            'n_conditions': n_conditions,
            'kendalls_w': float(w),
            'effect_size_interpretation': self._interpret_kendalls_w(w),
            'significant': p_value < 0.05,
            'interpretation': self._interpret_friedman(p_value, w, n_conditions)
        }
        
        # Condition statistics
        condition_stats = []
        for i, name in enumerate(condition_names):
            condition_stats.append({
                'condition': name,
                'median': float(np.median(data_clean[:, i])),
                'mean_rank': float(mean_ranks[i]),
                'q1': float(np.percentile(data_clean[:, i], 25)),
                'q3': float(np.percentile(data_clean[:, i], 75))
            })
        results['condition_statistics'] = condition_stats
        
        # Post-hoc tests if significant
        if compute_post_hoc and p_value < 0.05:
            results['post_hoc'] = self._nemenyi_test(data_clean, condition_names)
        
        return results
    
    def sign_test(self,
                 x: Union[np.ndarray, pd.Series],
                 y: Optional[Union[np.ndarray, pd.Series]] = None,
                 alternative: str = 'two-sided') -> NonParametricResult:
        """
        Sign test for paired samples or one-sample median test.
        
        Simple non-parametric test based on signs of differences.
        
        Args:
            x: First sample or values to test
            y: Second sample (for paired) or None (for one-sample)
            alternative: 'two-sided', 'less', or 'greater'
            
        Returns:
            NonParametricResult with test statistics
        """
        # Prepare data
        if y is not None:
            # Paired test
            x = np.asarray(x)
            y = np.asarray(y)
            mask = ~(np.isnan(x) | np.isnan(y))
            x = x[mask]
            y = y[mask]
            differences = x - y
            test_type = "Sign Test (Paired)"
        else:
            # One-sample test
            differences = np.asarray(x)
            differences = differences[~np.isnan(differences)]
            test_type = "Sign Test (One-Sample)"
        
        # Remove zeros (tied values)
        differences = differences[differences != 0]
        n = len(differences)
        
        if n == 0:
            raise ValueError("No non-zero differences found")
        
        # Count positive differences
        n_positive = np.sum(differences > 0)
        
        # Exact binomial test
        if alternative == 'two-sided':
            p_value = 2 * min(
                stats.binom.cdf(n_positive, n, 0.5),
                stats.binom.cdf(n - n_positive, n, 0.5)
            )
        elif alternative == 'greater':
            p_value = 1 - stats.binom.cdf(n_positive - 1, n, 0.5)
        else:  # less
            p_value = stats.binom.cdf(n_positive, n, 0.5)
        
        # Effect size (proportion of positive differences)
        effect_size = n_positive / n
        
        # Confidence interval for median
        ci_lower, ci_upper = self._sign_test_confidence_interval(differences, 0.95)
        
        result = NonParametricResult(
            test_name=test_type,
            statistic=n_positive,
            p_value=p_value,
            alternative=alternative,
            effect_size=effect_size,
            confidence_interval=(ci_lower, ci_upper),
            sample_sizes={'n': n, 'n_positive': n_positive},
            location_estimate=np.median(differences),
            method_used='exact binomial',
            interpretation=self._interpret_sign_test(p_value, effect_size, n)
        )
        
        return result
    
    def runs_test(self,
                 data: Union[np.ndarray, pd.Series],
                 cutoff: Optional[float] = None) -> Dict[str, Any]:
        """
        Runs test for randomness in a sequence.
        
        Tests whether data points are randomly distributed above/below a cutoff.
        
        Args:
            data: Sequence of values
            cutoff: Value to use as cutoff (default: median)
            
        Returns:
            Dictionary with test results
        """
        data = np.asarray(data)
        data = data[~np.isnan(data)]
        
        if len(data) < 2:
            raise ValueError("Need at least 2 observations for runs test")
        
        # Use median as cutoff if not provided
        if cutoff is None:
            cutoff = np.median(data)
        
        # Convert to binary sequence
        binary = data > cutoff
        
        # Count runs
        runs = 1
        for i in range(1, len(binary)):
            if binary[i] != binary[i-1]:
                runs += 1
        
        # Count values above and below cutoff
        n1 = np.sum(binary)
        n2 = len(binary) - n1
        
        # Expected runs and variance
        n = len(binary)
        expected_runs = (2 * n1 * n2) / n + 1
        
        if n1 > 0 and n2 > 0:
            variance = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n**2 * (n - 1))
            
            # Z-statistic with continuity correction
            if variance > 0:
                z_stat = (runs - expected_runs - 0.5) / np.sqrt(variance)
                p_value = 2 * (1 - stats.norm.cdf(np.abs(z_stat)))
            else:
                z_stat = 0
                p_value = 1
        else:
            z_stat = np.nan
            p_value = np.nan
            variance = 0
        
        return {
            'test_name': 'Runs Test',
            'runs': int(runs),
            'expected_runs': float(expected_runs),
            'z_statistic': float(z_stat),
            'p_value': float(p_value),
            'n_above_cutoff': int(n1),
            'n_below_cutoff': int(n2),
            'cutoff': float(cutoff),
            'random': p_value > 0.05 if not np.isnan(p_value) else None,
            'interpretation': self._interpret_runs_test(p_value, runs, expected_runs)
        }
    
    def spearman_correlation(self,
                           x: Union[np.ndarray, pd.Series],
                           y: Union[np.ndarray, pd.Series]) -> Dict[str, Any]:
        """
        Spearman's rank correlation coefficient.
        
        Non-parametric measure of monotonic relationship.
        
        Args:
            x: First variable
            y: Second variable
            
        Returns:
            Dictionary with correlation results
        """
        x = np.asarray(x)
        y = np.asarray(y)
        
        # Remove pairs with NaN
        mask = ~(np.isnan(x) | np.isnan(y))
        x = x[mask]
        y = y[mask]
        
        if len(x) < 3:
            raise ValueError("Need at least 3 observations for correlation")
        
        # Calculate correlation
        rho, p_value = spearmanr(x, y)
        
        # Calculate confidence interval using Fisher z-transformation
        z = np.arctanh(rho)
        se = 1 / np.sqrt(len(x) - 3)
        z_critical = stats.norm.ppf(0.975)
        
        ci_lower = np.tanh(z - z_critical * se)
        ci_upper = np.tanh(z + z_critical * se)
        
        return {
            'test_name': "Spearman's Rank Correlation",
            'correlation': float(rho),
            'p_value': float(p_value),
            'confidence_interval': (float(ci_lower), float(ci_upper)),
            'n': len(x),
            'interpretation': self._interpret_correlation(rho, p_value)
        }
    
    def kendall_tau(self,
                   x: Union[np.ndarray, pd.Series],
                   y: Union[np.ndarray, pd.Series]) -> Dict[str, Any]:
        """
        Kendall's tau rank correlation coefficient.
        
        Non-parametric measure of ordinal association.
        
        Args:
            x: First variable
            y: Second variable
            
        Returns:
            Dictionary with correlation results
        """
        x = np.asarray(x)
        y = np.asarray(y)
        
        # Remove pairs with NaN
        mask = ~(np.isnan(x) | np.isnan(y))
        x = x[mask]
        y = y[mask]
        
        if len(x) < 2:
            raise ValueError("Need at least 2 observations for correlation")
        
        # Calculate correlation
        tau, p_value = kendalltau(x, y)
        
        # Confidence interval (approximation)
        n = len(x)
        se = np.sqrt(2 * (2*n + 5)) / (3 * n * np.sqrt(n))
        z_critical = stats.norm.ppf(0.975)
        
        ci_lower = tau - z_critical * se
        ci_upper = tau + z_critical * se
        
        return {
            'test_name': "Kendall's Tau",
            'correlation': float(tau),
            'p_value': float(p_value),
            'confidence_interval': (float(ci_lower), float(ci_upper)),
            'n': len(x),
            'interpretation': self._interpret_correlation(tau, p_value)
        }
    
    # Helper methods for effect sizes and confidence intervals
    
    def _hodges_lehmann_estimator(self, x: np.ndarray, y: np.ndarray,
                                  confidence_level: float) -> Tuple[float, float, float]:
        """Calculate Hodges-Lehmann estimator and confidence interval."""
        # All pairwise differences
        differences = []
        for xi in x:
            for yi in y:
                differences.append(xi - yi)
        differences = np.array(differences)
        
        # Point estimate (median of differences)
        estimate = np.median(differences)
        
        # Confidence interval
        n1, n2 = len(x), len(y)
        alpha = 1 - confidence_level
        
        # Use normal approximation for large samples
        if n1 * n2 > 20:
            z = stats.norm.ppf(1 - alpha/2)
            k = int(n1 * n2 / 2 - z * np.sqrt(n1 * n2 * (n1 + n2 + 1) / 12))
            
            differences_sorted = np.sort(differences)
            if k >= 0 and k < len(differences_sorted):
                ci_lower = differences_sorted[k]
                ci_upper = differences_sorted[-k-1]
            else:
                ci_lower = differences_sorted[0]
                ci_upper = differences_sorted[-1]
        else:
            # For small samples, use percentile method
            ci_lower = np.percentile(differences, (1 - confidence_level) * 50)
            ci_upper = np.percentile(differences, (1 + confidence_level) * 50)
        
        return estimate, ci_lower, ci_upper
    
    def _wilcoxon_confidence_interval(self, differences: np.ndarray,
                                     confidence_level: float) -> Tuple[float, float]:
        """Calculate confidence interval for Wilcoxon test."""
        n = len(differences)
        
        # Walsh averages (all pairwise averages including self)
        walsh_averages = []
        for i in range(n):
            for j in range(i, n):
                walsh_averages.append((differences[i] + differences[j]) / 2)
        
        walsh_averages = np.sort(walsh_averages)
        
        # Find critical value
        alpha = 1 - confidence_level
        w_critical = stats.norm.ppf(1 - alpha/2) * np.sqrt(n * (n + 1) * (2*n + 1) / 6)
        k = int((n * (n + 1) / 2 - w_critical) / 2)
        
        if k >= 0 and k < len(walsh_averages):
            ci_lower = walsh_averages[k]
            ci_upper = walsh_averages[-k-1]
        else:
            ci_lower = walsh_averages[0]
            ci_upper = walsh_averages[-1]
        
        return ci_lower, ci_upper
    
    def _sign_test_confidence_interval(self, data: np.ndarray,
                                      confidence_level: float) -> Tuple[float, float]:
        """Calculate confidence interval for sign test."""
        data_sorted = np.sort(data)
        n = len(data)
        
        # Find critical value using binomial distribution
        alpha = 1 - confidence_level
        k = stats.binom.ppf(alpha/2, n, 0.5)
        
        if k >= 0 and n - k - 1 < n:
            ci_lower = data_sorted[int(k)]
            ci_upper = data_sorted[int(n - k - 1)]
        else:
            ci_lower = data_sorted[0]
            ci_upper = data_sorted[-1]
        
        return ci_lower, ci_upper
    
    def _dunn_test(self, groups: List[np.ndarray], 
                  group_sizes: List[int]) -> List[Dict[str, Any]]:
        """Dunn's post-hoc test for Kruskal-Wallis."""
        k = len(groups)
        n = sum(group_sizes)
        
        # Rank all observations
        all_data = np.concatenate(groups)
        ranks = rankdata(all_data)
        
        # Mean ranks for each group
        mean_ranks = []
        start = 0
        for size in group_sizes:
            mean_ranks.append(np.mean(ranks[start:start+size]))
            start += size
        
        # Standard error
        # Account for ties
        ties = []
        unique, counts = np.unique(ranks, return_counts=True)
        for count in counts:
            if count > 1:
                ties.append(count)
        
        if ties:
            tie_correction = sum(t**3 - t for t in ties) / (12 * (n - 1))
        else:
            tie_correction = 0
        
        comparisons = []
        for i in range(k):
            for j in range(i+1, k):
                # Z-statistic
                se = np.sqrt((n * (n + 1) / 12 - tie_correction) * (1/group_sizes[i] + 1/group_sizes[j]))
                z = (mean_ranks[i] - mean_ranks[j]) / se if se > 0 else 0
                
                # P-value (two-tailed)
                p = 2 * (1 - stats.norm.cdf(np.abs(z)))
                
                # Bonferroni correction
                p_adjusted = min(1, p * k * (k - 1) / 2)
                
                comparisons.append({
                    'group1': i + 1,
                    'group2': j + 1,
                    'z_statistic': float(z),
                    'p_value': float(p),
                    'p_adjusted': float(p_adjusted),
                    'significant': p_adjusted < 0.05
                })
        
        return comparisons
    
    def _conover_test(self, groups: List[np.ndarray],
                     group_sizes: List[int]) -> List[Dict[str, Any]]:
        """Conover post-hoc test for Kruskal-Wallis."""
        # Similar to Dunn but uses t-distribution
        # Implementation similar to Dunn test with t-distribution
        return self._dunn_test(groups, group_sizes)  # Simplified for now
    
    def _nemenyi_test(self, data: np.ndarray,
                     condition_names: List[str]) -> List[Dict[str, Any]]:
        """Nemenyi post-hoc test for Friedman test."""
        n_subjects, n_conditions = data.shape
        
        # Rank within subjects
        ranks = np.apply_along_axis(rankdata, 1, data)
        mean_ranks = np.mean(ranks, axis=0)
        
        # Critical difference
        q_critical = 2.394  # For alpha=0.05, this is approximate
        cd = q_critical * np.sqrt((n_conditions * (n_conditions + 1)) / (6 * n_subjects))
        
        comparisons = []
        for i in range(n_conditions):
            for j in range(i+1, n_conditions):
                diff = abs(mean_ranks[i] - mean_ranks[j])
                comparisons.append({
                    'condition1': condition_names[i],
                    'condition2': condition_names[j],
                    'mean_rank_diff': float(diff),
                    'critical_difference': float(cd),
                    'significant': diff > cd
                })
        
        return comparisons
    
    # Interpretation methods
    
    def _interpret_mann_whitney(self, p_value: float, effect_size: Optional[float],
                               alternative: str, n1: int, n2: int) -> str:
        """Interpret Mann-Whitney U test results."""
        if p_value < 0.05:
            sig = "statistically significant difference"
        else:
            sig = "no statistically significant difference"
        
        effect = ""
        if effect_size is not None:
            if abs(effect_size) < 0.1:
                effect = " with negligible effect"
            elif abs(effect_size) < 0.3:
                effect = " with small effect"
            elif abs(effect_size) < 0.5:
                effect = " with medium effect"
            else:
                effect = " with large effect"
        
        return f"There is {sig} between the two groups (p={p_value:.4f}){effect}. " \
               f"Sample sizes: n1={n1}, n2={n2}."
    
    def _interpret_wilcoxon(self, p_value: float, effect_size: Optional[float],
                          alternative: str, n: int, zeros: bool) -> str:
        """Interpret Wilcoxon signed-rank test results."""
        if p_value < 0.05:
            sig = "statistically significant"
        else:
            sig = "not statistically significant"
        
        zeros_note = " (note: zeros were present in the data)" if zeros else ""
        
        return f"The difference is {sig} (p={p_value:.4f}). " \
               f"Sample size: n={n}{zeros_note}."
    
    def _interpret_kruskal_wallis(self, p_value: float, epsilon_squared: float,
                                 n_groups: int) -> str:
        """Interpret Kruskal-Wallis test results."""
        if p_value < 0.05:
            return f"There is a statistically significant difference among the {n_groups} groups " \
                   f"(p={p_value:.4f}). Effect size (ε²={epsilon_squared:.3f}) suggests " \
                   f"{self._interpret_epsilon_squared(epsilon_squared)}."
        else:
            return f"No statistically significant difference found among the {n_groups} groups " \
                   f"(p={p_value:.4f})."
    
    def _interpret_friedman(self, p_value: float, w: float, n_conditions: int) -> str:
        """Interpret Friedman test results."""
        if p_value < 0.05:
            return f"There is a statistically significant difference among the {n_conditions} conditions " \
                   f"(p={p_value:.4f}). Kendall's W={w:.3f} indicates " \
                   f"{self._interpret_kendalls_w(w)}."
        else:
            return f"No statistically significant difference found among the {n_conditions} conditions " \
                   f"(p={p_value:.4f})."
    
    def _interpret_sign_test(self, p_value: float, proportion: float, n: int) -> str:
        """Interpret sign test results."""
        if p_value < 0.05:
            return f"The median difference is statistically significant (p={p_value:.4f}). " \
                   f"Proportion positive: {proportion:.2f}, n={n}."
        else:
            return f"The median difference is not statistically significant (p={p_value:.4f}). " \
                   f"Proportion positive: {proportion:.2f}, n={n}."
    
    def _interpret_runs_test(self, p_value: float, runs: int, expected: float) -> str:
        """Interpret runs test results."""
        if np.isnan(p_value):
            return "Test could not be performed (insufficient variation in data)."
        
        if p_value < 0.05:
            if runs < expected:
                pattern = "fewer runs than expected (possible clustering)"
            else:
                pattern = "more runs than expected (possible alternation)"
            return f"The sequence is not random (p={p_value:.4f}) with {pattern}. " \
                   f"Observed runs: {runs}, Expected: {expected:.1f}."
        else:
            return f"The sequence appears random (p={p_value:.4f}). " \
                   f"Observed runs: {runs}, Expected: {expected:.1f}."
    
    def _interpret_correlation(self, correlation: float, p_value: float) -> str:
        """Interpret correlation coefficient."""
        strength = ""
        if abs(correlation) < 0.1:
            strength = "negligible"
        elif abs(correlation) < 0.3:
            strength = "weak"
        elif abs(correlation) < 0.5:
            strength = "moderate"
        elif abs(correlation) < 0.7:
            strength = "strong"
        else:
            strength = "very strong"
        
        direction = "positive" if correlation > 0 else "negative"
        
        if p_value < 0.05:
            return f"There is a statistically significant {strength} {direction} correlation " \
                   f"(r={correlation:.3f}, p={p_value:.4f})."
        else:
            return f"The correlation is not statistically significant " \
                   f"(r={correlation:.3f}, p={p_value:.4f})."
    
    def _interpret_epsilon_squared(self, epsilon_squared: float) -> str:
        """Interpret epsilon-squared effect size."""
        if epsilon_squared < 0.01:
            return "a negligible effect"
        elif epsilon_squared < 0.06:
            return "a small effect"
        elif epsilon_squared < 0.14:
            return "a medium effect"
        else:
            return "a large effect"
    
    def _interpret_kendalls_w(self, w: float) -> str:
        """Interpret Kendall's W."""
        if w < 0.1:
            return "very weak agreement"
        elif w < 0.3:
            return "weak agreement"
        elif w < 0.5:
            return "moderate agreement"
        elif w < 0.7:
            return "strong agreement"
        else:
            return "very strong agreement"
    
    def summary(self) -> str:
        """Generate summary of last test performed."""
        if self.last_result is None:
            return "No test has been performed yet."
        
        r = self.last_result
        lines = []
        lines.append("=" * 60)
        lines.append(r.test_name.upper().center(60))
        lines.append("=" * 60)
        lines.append(f"Test Statistic: {r.statistic:.4f}")
        lines.append(f"P-value: {r.p_value:.4f}")
        lines.append(f"Alternative: {r.alternative}")
        
        if r.effect_size is not None:
            lines.append(f"Effect Size: {r.effect_size:.4f}")
        
        if r.confidence_interval is not None:
            lines.append(f"95% CI: [{r.confidence_interval[0]:.4f}, {r.confidence_interval[1]:.4f}]")
        
        if r.location_estimate is not None:
            lines.append(f"Location Estimate: {r.location_estimate:.4f}")
        
        if r.sample_sizes:
            lines.append(f"Sample Sizes: {r.sample_sizes}")
        
        if r.interpretation:
            lines.append(f"\nInterpretation: {r.interpretation}")
        
        lines.append("=" * 60)
        
        return "\n".join(lines)