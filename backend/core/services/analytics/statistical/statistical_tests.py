"""
Statistical Tests Service for StickForStats platform.

This module provides statistical testing functionality for basic statistical tests,
including parametric and non-parametric tests of differences and relationships.
"""

import pandas as pd
import numpy as np
from scipy import stats
import pingouin as pg
from typing import Dict, Any, List, Optional, Union, Tuple
import logging
from dataclasses import dataclass

# Configure logging
logger = logging.getLogger(__name__)


class StatisticalTestService:
    """
    Service for performing statistical tests.
    
    This service provides methods for various statistical tests, including:
    - t-tests (one-sample, independent, paired)
    - Correlation tests
    - Chi-square tests
    - Non-parametric tests
    """
    
    def __init__(self):
        """Initialize statistical test service."""
        pass
    
    def run_t_test(
        self,
        data: pd.DataFrame,
        test_type: str,
        variables: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run a t-test.
        
        Args:
            data: DataFrame containing the data
            test_type: Type of t-test ('one_sample', 'independent', 'paired')
            variables: Dictionary of variables to use in the test
            **kwargs: Additional arguments for the test
            
        Returns:
            Dictionary containing test results
        """
        results = {}
        
        if test_type == 'one_sample':
            # One-sample t-test
            if 'variable' not in variables:
                raise ValueError("One-sample t-test requires 'variable' in variables dict")
            
            var = variables['variable']
            mu = kwargs.get('mu', 0)
            
            # Run t-test
            t_stat, p_value = stats.ttest_1samp(data[var].dropna(), mu)
            
            # Calculate effect size (Cohen's d)
            effect_size = (data[var].mean() - mu) / data[var].std()
            
            # Store results
            results = {
                'test_type': 'one_sample_t_test',
                'variable': var,
                'mu': mu,
                't_statistic': t_stat,
                'p_value': p_value,
                'effect_size': effect_size,
                'effect_size_type': "Cohen's d",
                'df': len(data[var].dropna()) - 1,
                'mean': data[var].mean(),
                'std': data[var].std(),
                'n': len(data[var].dropna())
            }
            
        elif test_type == 'independent':
            # Independent samples t-test
            if 'variable' not in variables or 'group' not in variables:
                raise ValueError("Independent t-test requires 'variable' and 'group' in variables dict")
            
            var = variables['variable']
            group = variables['group']
            equal_var = kwargs.get('equal_var', True)
            
            # Split data by group
            unique_groups = data[group].unique()
            if len(unique_groups) != 2:
                raise ValueError(f"Independent t-test requires exactly 2 groups, found {len(unique_groups)}")
            
            group1_data = data[data[group] == unique_groups[0]][var].dropna()
            group2_data = data[data[group] == unique_groups[1]][var].dropna()
            
            # Run t-test
            t_stat, p_value = stats.ttest_ind(group1_data, group2_data, equal_var=equal_var)
            
            # Calculate effect size (Cohen's d)
            n1, n2 = len(group1_data), len(group2_data)
            mean1, mean2 = group1_data.mean(), group2_data.mean()
            var1, var2 = group1_data.var(), group2_data.var()
            
            # Pooled standard deviation
            if equal_var:
                pooled_sd = np.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2))
                effect_size = (mean1 - mean2) / pooled_sd
            else:
                # Unequal variances, use Cohen's d with correction
                effect_size = (mean1 - mean2) / np.sqrt((var1 + var2) / 2)
            
            # Calculate df
            if equal_var:
                df = n1 + n2 - 2
            else:
                # Welch-Satterthwaite df
                df = ((var1/n1 + var2/n2)**2) / ((var1/n1)**2/(n1-1) + (var2/n2)**2/(n2-1))
            
            # Store results
            results = {
                'test_type': 'independent_t_test',
                'variable': var,
                'group': group,
                'group1': str(unique_groups[0]),
                'group2': str(unique_groups[1]),
                't_statistic': t_stat,
                'p_value': p_value,
                'effect_size': effect_size,
                'effect_size_type': "Cohen's d",
                'df': df,
                'equal_var': equal_var,
                'mean1': mean1,
                'mean2': mean2,
                'std1': np.sqrt(var1),
                'std2': np.sqrt(var2),
                'n1': n1,
                'n2': n2
            }
            
        elif test_type == 'paired':
            # Paired samples t-test
            if 'variable1' not in variables or 'variable2' not in variables:
                raise ValueError("Paired t-test requires 'variable1' and 'variable2' in variables dict")
            
            var1 = variables['variable1']
            var2 = variables['variable2']
            
            # Drop rows with missing values in either variable
            mask = ~(data[var1].isna() | data[var2].isna())
            paired_data = data[mask]
            
            if len(paired_data) == 0:
                raise ValueError("No valid pairs found for paired t-test")
            
            # Run t-test
            t_stat, p_value = stats.ttest_rel(paired_data[var1], paired_data[var2])
            
            # Calculate effect size (Cohen's d for paired samples)
            mean_diff = paired_data[var1].mean() - paired_data[var2].mean()
            diff_std = (paired_data[var1] - paired_data[var2]).std()
            effect_size = mean_diff / diff_std
            
            # Store results
            results = {
                'test_type': 'paired_t_test',
                'variable1': var1,
                'variable2': var2,
                't_statistic': t_stat,
                'p_value': p_value,
                'effect_size': effect_size,
                'effect_size_type': "Cohen's d (paired)",
                'df': len(paired_data) - 1,
                'mean1': paired_data[var1].mean(),
                'mean2': paired_data[var2].mean(),
                'mean_difference': mean_diff,
                'std1': paired_data[var1].std(),
                'std2': paired_data[var2].std(),
                'std_difference': diff_std,
                'n_pairs': len(paired_data)
            }
        
        else:
            raise ValueError(f"Unsupported t-test type: {test_type}")
        
        return results
    
    def run_correlation_test(
        self,
        data: pd.DataFrame,
        test_type: str,
        variables: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run a correlation test.
        
        Args:
            data: DataFrame containing the data
            test_type: Type of correlation test ('pearson', 'spearman', 'kendall')
            variables: Dictionary of variables to use in the test
            **kwargs: Additional arguments for the test
            
        Returns:
            Dictionary containing test results
        """
        results = {}
        
        if 'x' not in variables or 'y' not in variables:
            raise ValueError("Correlation test requires 'x' and 'y' in variables dict")
        
        x_var = variables['x']
        y_var = variables['y']
        
        # Drop rows with missing values in either variable
        mask = ~(data[x_var].isna() | data[y_var].isna())
        valid_data = data[mask]
        
        if len(valid_data) == 0:
            raise ValueError("No valid pairs found for correlation test")
        
        if test_type == 'pearson':
            # Pearson correlation
            corr, p_value = stats.pearsonr(valid_data[x_var], valid_data[y_var])
            
            results = {
                'test_type': 'pearson_correlation',
                'x_variable': x_var,
                'y_variable': y_var,
                'correlation': corr,
                'p_value': p_value,
                'n': len(valid_data)
            }
            
        elif test_type == 'spearman':
            # Spearman correlation
            corr, p_value = stats.spearmanr(valid_data[x_var], valid_data[y_var])
            
            results = {
                'test_type': 'spearman_correlation',
                'x_variable': x_var,
                'y_variable': y_var,
                'correlation': corr,
                'p_value': p_value,
                'n': len(valid_data)
            }
            
        elif test_type == 'kendall':
            # Kendall correlation
            corr, p_value = stats.kendalltau(valid_data[x_var], valid_data[y_var])
            
            results = {
                'test_type': 'kendall_correlation',
                'x_variable': x_var,
                'y_variable': y_var,
                'correlation': corr,
                'p_value': p_value,
                'n': len(valid_data)
            }
            
        else:
            raise ValueError(f"Unsupported correlation test type: {test_type}")
        
        return results
    
    def run_chi_square_test(
        self,
        data: pd.DataFrame,
        test_type: str,
        variables: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run a chi-square test.
        
        Args:
            data: DataFrame containing the data
            test_type: Type of chi-square test ('independence', 'goodness_of_fit')
            variables: Dictionary of variables to use in the test
            **kwargs: Additional arguments for the test
            
        Returns:
            Dictionary containing test results
        """
        results = {}
        
        if test_type == 'independence':
            # Chi-square test of independence
            if 'variable1' not in variables or 'variable2' not in variables:
                raise ValueError("Chi-square test of independence requires 'variable1' and 'variable2' in variables dict")
            
            var1 = variables['variable1']
            var2 = variables['variable2']
            
            # Create contingency table
            contingency_table = pd.crosstab(data[var1], data[var2])
            
            # Run chi-square test
            chi2, p_value, dof, expected = stats.chi2_contingency(contingency_table)
            
            # Calculate Cramer's V
            n = contingency_table.sum().sum()
            phi2 = chi2 / n
            r, k = contingency_table.shape
            cramer_v = np.sqrt(phi2 / min(k-1, r-1))
            
            # Store results
            results = {
                'test_type': 'chi_square_independence',
                'variable1': var1,
                'variable2': var2,
                'chi_square': chi2,
                'p_value': p_value,
                'df': dof,
                'cramer_v': cramer_v,
                'n': n,
                'contingency_table': contingency_table.to_dict(),
                'expected_frequencies': pd.DataFrame(
                    expected, 
                    index=contingency_table.index,
                    columns=contingency_table.columns
                ).to_dict()
            }
            
        elif test_type == 'goodness_of_fit':
            # Chi-square goodness of fit test
            if 'variable' not in variables:
                raise ValueError("Chi-square goodness of fit test requires 'variable' in variables dict")
            
            var = variables['variable']
            expected_probs = kwargs.get('expected_probs', None)
            
            # Get observed frequencies
            observed = data[var].value_counts().sort_index()
            
            # Get expected probabilities
            if expected_probs is None:
                # If not provided, assume uniform distribution
                expected_probs = [1/len(observed)] * len(observed)
            
            # Ensure expected_probs is the same length as observed
            if len(expected_probs) != len(observed):
                raise ValueError(f"Length of expected_probs ({len(expected_probs)}) does not match number of categories ({len(observed)})")
            
            # Calculate expected frequencies
            n = len(data[var].dropna())
            expected = np.array(expected_probs) * n
            
            # Run chi-square test
            chi2, p_value = stats.chisquare(observed, expected)
            
            # Store results
            results = {
                'test_type': 'chi_square_goodness_of_fit',
                'variable': var,
                'chi_square': chi2,
                'p_value': p_value,
                'df': len(observed) - 1,
                'n': n,
                'observed_frequencies': observed.to_dict(),
                'expected_frequencies': dict(zip(observed.index, expected))
            }
            
        else:
            raise ValueError(f"Unsupported chi-square test type: {test_type}")
        
        return results
    
    def run_nonparametric_test(
        self,
        data: pd.DataFrame,
        test_type: str,
        variables: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run a non-parametric test.
        
        Args:
            data: DataFrame containing the data
            test_type: Type of non-parametric test ('mann_whitney', 'wilcoxon', 'kruskal')
            variables: Dictionary of variables to use in the test
            **kwargs: Additional arguments for the test
            
        Returns:
            Dictionary containing test results
        """
        results = {}
        
        if test_type == 'mann_whitney':
            # Mann-Whitney U test (independent samples)
            if 'variable' not in variables or 'group' not in variables:
                raise ValueError("Mann-Whitney test requires 'variable' and 'group' in variables dict")
            
            var = variables['variable']
            group = variables['group']
            
            # Split data by group
            unique_groups = data[group].unique()
            if len(unique_groups) != 2:
                raise ValueError(f"Mann-Whitney test requires exactly 2 groups, found {len(unique_groups)}")
            
            group1_data = data[data[group] == unique_groups[0]][var].dropna()
            group2_data = data[data[group] == unique_groups[1]][var].dropna()
            
            # Run Mann-Whitney U test
            u_stat, p_value = stats.mannwhitneyu(group1_data, group2_data, alternative='two-sided')
            
            # Calculate effect size (r = Z / sqrt(N))
            n1, n2 = len(group1_data), len(group2_data)
            z = stats.norm.ppf(1 - p_value/2)  # Convert p-value to Z-score (two-tailed)
            effect_size = z / np.sqrt(n1 + n2)
            
            # Store results
            results = {
                'test_type': 'mann_whitney_u',
                'variable': var,
                'group': group,
                'group1': str(unique_groups[0]),
                'group2': str(unique_groups[1]),
                'u_statistic': u_stat,
                'p_value': p_value,
                'effect_size': effect_size,
                'effect_size_type': "r (Z / sqrt(N))",
                'n1': n1,
                'n2': n2,
                'median1': group1_data.median(),
                'median2': group2_data.median()
            }
            
        elif test_type == 'wilcoxon':
            # Wilcoxon signed-rank test (paired samples)
            if 'variable1' not in variables or 'variable2' not in variables:
                raise ValueError("Wilcoxon test requires 'variable1' and 'variable2' in variables dict")
            
            var1 = variables['variable1']
            var2 = variables['variable2']
            
            # Drop rows with missing values in either variable
            mask = ~(data[var1].isna() | data[var2].isna())
            paired_data = data[mask]
            
            if len(paired_data) == 0:
                raise ValueError("No valid pairs found for Wilcoxon test")
            
            # Run Wilcoxon test
            w_stat, p_value = stats.wilcoxon(paired_data[var1], paired_data[var2])
            
            # Calculate effect size (r = Z / sqrt(N))
            n = len(paired_data)
            z = stats.norm.ppf(1 - p_value/2)  # Convert p-value to Z-score (two-tailed)
            effect_size = z / np.sqrt(n)
            
            # Store results
            results = {
                'test_type': 'wilcoxon_signed_rank',
                'variable1': var1,
                'variable2': var2,
                'w_statistic': w_stat,
                'p_value': p_value,
                'effect_size': effect_size,
                'effect_size_type': "r (Z / sqrt(N))",
                'n_pairs': n,
                'median1': paired_data[var1].median(),
                'median2': paired_data[var2].median(),
                'median_difference': (paired_data[var1] - paired_data[var2]).median()
            }
            
        elif test_type == 'kruskal':
            # Kruskal-Wallis H test (multiple independent samples)
            if 'variable' not in variables or 'group' not in variables:
                raise ValueError("Kruskal-Wallis test requires 'variable' and 'group' in variables dict")
            
            var = variables['variable']
            group = variables['group']
            
            # Split data by group
            groups = []
            group_names = []
            for group_val in data[group].unique():
                group_data = data[data[group] == group_val][var].dropna()
                if len(group_data) > 0:
                    groups.append(group_data)
                    group_names.append(str(group_val))
            
            if len(groups) < 2:
                raise ValueError("Kruskal-Wallis test requires at least 2 groups with data")
            
            # Run Kruskal-Wallis test
            h_stat, p_value = stats.kruskal(*groups)
            
            # Calculate effect size (eta-squared)
            n_total = sum(len(g) for g in groups)
            eta_squared = (h_stat - len(groups) + 1) / (n_total - len(groups))
            
            # Store results
            results = {
                'test_type': 'kruskal_wallis',
                'variable': var,
                'group': group,
                'groups': group_names,
                'h_statistic': h_stat,
                'p_value': p_value,
                'effect_size': eta_squared,
                'effect_size_type': "eta-squared",
                'df': len(groups) - 1,
                'n_total': n_total,
                'group_sizes': {name: len(g) for name, g in zip(group_names, groups)},
                'group_medians': {name: g.median() for name, g in zip(group_names, groups)}
            }
            
        else:
            raise ValueError(f"Unsupported non-parametric test type: {test_type}")
        
        return results