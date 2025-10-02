"""
Advanced ANOVA Service
=======================

Comprehensive implementation of advanced Analysis of Variance techniques.

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import f, t
from typing import Dict, Any, List, Tuple, Optional, Union
import warnings
from itertools import combinations
import logging

logger = logging.getLogger(__name__)


class AdvancedANOVAService:
    """
    Advanced ANOVA analysis service providing:
    - Two-way ANOVA with interactions
    - Repeated Measures ANOVA
    - Mixed ANOVA
    - ANCOVA
    - MANOVA
    - Complete post-hoc tests
    """
    
    def __init__(self):
        """Initialize the advanced ANOVA service."""
        self.last_results = None
    
    def two_way_anova(self,
                     data: pd.DataFrame,
                     dependent_var: str,
                     factor1: str,
                     factor2: str,
                     interaction: bool = True,
                     sum_of_squares_type: int = 3,
                     post_hoc: bool = True) -> Dict[str, Any]:
        """
        Perform two-way ANOVA with optional interaction.
        
        Args:
            data: DataFrame containing the data
            dependent_var: Name of dependent variable column
            factor1: Name of first factor column
            factor2: Name of second factor column  
            interaction: Whether to include interaction term
            sum_of_squares_type: Type of sum of squares (1, 2, or 3)
            post_hoc: Whether to perform post-hoc tests
            
        Returns:
            Dictionary containing ANOVA results
        """
        # Clean data
        clean_data = data[[dependent_var, factor1, factor2]].dropna()
        
        if len(clean_data) == 0:
            raise ValueError("No valid data after removing missing values")
        
        # Get factor levels
        levels1 = clean_data[factor1].unique()
        levels2 = clean_data[factor2].unique()
        n_levels1 = len(levels1)
        n_levels2 = len(levels2)
        
        if n_levels1 < 2 or n_levels2 < 2:
            raise ValueError("Each factor must have at least 2 levels")
        
        # Calculate cell means and sample sizes
        cell_stats = []
        for l1 in levels1:
            for l2 in levels2:
                cell_data = clean_data[(clean_data[factor1] == l1) & 
                                      (clean_data[factor2] == l2)][dependent_var]
                cell_stats.append({
                    factor1: l1,
                    factor2: l2,
                    'n': len(cell_data),
                    'mean': cell_data.mean() if len(cell_data) > 0 else np.nan,
                    'std': cell_data.std() if len(cell_data) > 0 else np.nan
                })
        
        cell_df = pd.DataFrame(cell_stats)
        
        # Check for balanced design
        cell_sizes = cell_df['n'].values
        is_balanced = len(np.unique(cell_sizes[cell_sizes > 0])) == 1
        
        # Calculate sums of squares
        y = clean_data[dependent_var].values
        n_total = len(y)
        grand_mean = np.mean(y)
        
        # Total sum of squares
        ss_total = np.sum((y - grand_mean)**2)
        df_total = n_total - 1
        
        # Factor 1 main effect
        factor1_means = clean_data.groupby(factor1)[dependent_var].mean()
        factor1_counts = clean_data.groupby(factor1)[dependent_var].count()
        ss_factor1 = np.sum([count * (mean - grand_mean)**2 
                            for mean, count in zip(factor1_means, factor1_counts)])
        df_factor1 = n_levels1 - 1
        
        # Factor 2 main effect  
        factor2_means = clean_data.groupby(factor2)[dependent_var].mean()
        factor2_counts = clean_data.groupby(factor2)[dependent_var].count()
        ss_factor2 = np.sum([count * (mean - grand_mean)**2
                            for mean, count in zip(factor2_means, factor2_counts)])
        df_factor2 = n_levels2 - 1
        
        # Interaction effect
        if interaction:
            # Cell means model
            cell_means = clean_data.groupby([factor1, factor2])[dependent_var].mean()
            cell_counts = clean_data.groupby([factor1, factor2])[dependent_var].count()
            
            ss_cells = 0
            for (l1, l2), mean in cell_means.items():
                count = cell_counts[(l1, l2)]
                ss_cells += count * (mean - grand_mean)**2
            
            ss_interaction = ss_cells - ss_factor1 - ss_factor2
            df_interaction = df_factor1 * df_factor2
        else:
            ss_interaction = 0
            df_interaction = 0
        
        # Residual (error) sum of squares
        if interaction:
            ss_residual = ss_total - ss_factor1 - ss_factor2 - ss_interaction
            df_residual = df_total - df_factor1 - df_factor2 - df_interaction
        else:
            ss_residual = ss_total - ss_factor1 - ss_factor2
            df_residual = df_total - df_factor1 - df_factor2
        
        # Mean squares
        ms_factor1 = ss_factor1 / df_factor1 if df_factor1 > 0 else 0
        ms_factor2 = ss_factor2 / df_factor2 if df_factor2 > 0 else 0
        ms_interaction = ss_interaction / df_interaction if df_interaction > 0 else 0
        ms_residual = ss_residual / df_residual if df_residual > 0 else 0
        
        # F-statistics
        f_factor1 = ms_factor1 / ms_residual if ms_residual > 0 else 0
        f_factor2 = ms_factor2 / ms_residual if ms_residual > 0 else 0
        f_interaction = ms_interaction / ms_residual if ms_residual > 0 and interaction else 0
        
        # P-values
        p_factor1 = 1 - stats.f.cdf(f_factor1, df_factor1, df_residual) if df_residual > 0 else 1
        p_factor2 = 1 - stats.f.cdf(f_factor2, df_factor2, df_residual) if df_residual > 0 else 1
        p_interaction = 1 - stats.f.cdf(f_interaction, df_interaction, df_residual) if df_residual > 0 and interaction else 1
        
        # Effect sizes (partial eta squared)
        eta2_factor1 = ss_factor1 / (ss_factor1 + ss_residual) if (ss_factor1 + ss_residual) > 0 else 0
        eta2_factor2 = ss_factor2 / (ss_factor2 + ss_residual) if (ss_factor2 + ss_residual) > 0 else 0
        eta2_interaction = ss_interaction / (ss_interaction + ss_residual) if interaction and (ss_interaction + ss_residual) > 0 else 0
        
        # Build ANOVA table
        anova_table = pd.DataFrame()
        
        # Factor 1
        anova_table = pd.concat([anova_table, pd.DataFrame({
            'Source': [factor1],
            'SS': [ss_factor1],
            'DF': [df_factor1],
            'MS': [ms_factor1],
            'F': [f_factor1],
            'p-value': [p_factor1],
            'eta²': [eta2_factor1]
        })])
        
        # Factor 2
        anova_table = pd.concat([anova_table, pd.DataFrame({
            'Source': [factor2],
            'SS': [ss_factor2],
            'DF': [df_factor2],
            'MS': [ms_factor2],
            'F': [f_factor2],
            'p-value': [p_factor2],
            'eta²': [eta2_factor2]
        })])
        
        # Interaction
        if interaction:
            anova_table = pd.concat([anova_table, pd.DataFrame({
                'Source': [f'{factor1}:{factor2}'],
                'SS': [ss_interaction],
                'DF': [df_interaction],
                'MS': [ms_interaction],
                'F': [f_interaction],
                'p-value': [p_interaction],
                'eta²': [eta2_interaction]
            })])
        
        # Residual
        anova_table = pd.concat([anova_table, pd.DataFrame({
            'Source': ['Residual'],
            'SS': [ss_residual],
            'DF': [df_residual],
            'MS': [ms_residual],
            'F': [np.nan],
            'p-value': [np.nan],
            'eta²': [np.nan]
        })])
        
        # Total
        anova_table = pd.concat([anova_table, pd.DataFrame({
            'Source': ['Total'],
            'SS': [ss_total],
            'DF': [df_total],
            'MS': [np.nan],
            'F': [np.nan],
            'p-value': [np.nan],
            'eta²': [np.nan]
        })])
        
        anova_table = anova_table.reset_index(drop=True)
        
        results = {
            'test_name': 'Two-Way ANOVA',
            'anova_table': anova_table,
            'is_balanced': is_balanced,
            'cell_statistics': cell_df,
            'main_effects': {
                factor1: {
                    'F': f_factor1,
                    'p_value': p_factor1,
                    'eta_squared': eta2_factor1,
                    'significant': p_factor1 < 0.05
                },
                factor2: {
                    'F': f_factor2,
                    'p_value': p_factor2,
                    'eta_squared': eta2_factor2,
                    'significant': p_factor2 < 0.05
                }
            }
        }
        
        if interaction:
            results['interaction'] = {
                'F': f_interaction,
                'p_value': p_interaction,
                'eta_squared': eta2_interaction,
                'significant': p_interaction < 0.05
            }
        
        # Post-hoc tests if requested
        if post_hoc:
            results['post_hoc'] = {}
            
            # Main effects post-hoc
            if p_factor1 < 0.05 and n_levels1 > 2:
                results['post_hoc'][factor1] = self._tukey_hsd(
                    clean_data, dependent_var, factor1, ms_residual, df_residual
                )
            
            if p_factor2 < 0.05 and n_levels2 > 2:
                results['post_hoc'][factor2] = self._tukey_hsd(
                    clean_data, dependent_var, factor2, ms_residual, df_residual
                )
            
            # Simple effects if interaction is significant
            if interaction and p_interaction < 0.05:
                results['simple_effects'] = self._simple_effects_analysis(
                    clean_data, dependent_var, factor1, factor2, ms_residual, df_residual
                )
        
        self.last_results = results
        return results
    
    def repeated_measures_anova(self,
                              data: pd.DataFrame,
                              subject_id: str,
                              within_factor: str,
                              dependent_var: str,
                              sphericity_correction: str = 'none') -> Dict[str, Any]:
        """
        Perform repeated measures ANOVA.
        
        Args:
            data: DataFrame in long format
            subject_id: Column name for subject identifier
            within_factor: Column name for within-subjects factor
            dependent_var: Column name for dependent variable
            sphericity_correction: 'none', 'greenhouse-geisser', or 'huynh-feldt'
            
        Returns:
            Dictionary containing repeated measures ANOVA results
        """
        # Prepare data
        clean_data = data[[subject_id, within_factor, dependent_var]].dropna()
        
        # Convert to wide format for calculations
        wide_data = clean_data.pivot(index=subject_id, columns=within_factor, values=dependent_var)
        
        # Check for missing cells
        if wide_data.isnull().any().any():
            raise ValueError("Missing data detected. Repeated measures ANOVA requires complete data.")
        
        n_subjects = len(wide_data)
        n_conditions = len(wide_data.columns)
        conditions = wide_data.columns.tolist()
        
        if n_subjects < 2:
            raise ValueError("Need at least 2 subjects for repeated measures ANOVA")
        if n_conditions < 2:
            raise ValueError("Need at least 2 conditions for repeated measures ANOVA")
        
        # Calculate sums of squares
        data_array = wide_data.values
        grand_mean = np.mean(data_array)
        
        # Total SS
        ss_total = np.sum((data_array - grand_mean)**2)
        df_total = n_subjects * n_conditions - 1
        
        # Subject SS (between-subjects variability)
        subject_means = np.mean(data_array, axis=1)
        ss_subjects = n_conditions * np.sum((subject_means - grand_mean)**2)
        df_subjects = n_subjects - 1
        
        # Condition SS (within-subjects effect)
        condition_means = np.mean(data_array, axis=0)
        ss_conditions = n_subjects * np.sum((condition_means - grand_mean)**2)
        df_conditions = n_conditions - 1
        
        # Error SS (within-subjects error)
        ss_error = ss_total - ss_subjects - ss_conditions
        df_error = (n_subjects - 1) * (n_conditions - 1)
        
        # Mean squares
        ms_conditions = ss_conditions / df_conditions
        ms_error = ss_error / df_error
        
        # F-statistic
        f_statistic = ms_conditions / ms_error if ms_error > 0 else 0
        
        # Sphericity test (Mauchly's test)
        sphericity_results = self._mauchly_sphericity_test(wide_data)
        
        # Apply sphericity correction if needed
        if sphericity_correction != 'none' and not sphericity_results['sphericity_assumed']:
            if sphericity_correction == 'greenhouse-geisser':
                epsilon = sphericity_results['greenhouse_geisser_epsilon']
            elif sphericity_correction == 'huynh-feldt':
                epsilon = sphericity_results['huynh_feldt_epsilon']
            else:
                epsilon = 1.0
            
            df_conditions_corrected = df_conditions * epsilon
            df_error_corrected = df_error * epsilon
            p_value = 1 - stats.f.cdf(f_statistic, df_conditions_corrected, df_error_corrected)
        else:
            df_conditions_corrected = df_conditions
            df_error_corrected = df_error
            p_value = 1 - stats.f.cdf(f_statistic, df_conditions, df_error)
        
        # Effect size (partial eta squared)
        eta_squared = ss_conditions / (ss_conditions + ss_error)
        
        # ANOVA table
        anova_table = pd.DataFrame({
            'Source': [within_factor, 'Error', 'Subjects', 'Total'],
            'SS': [ss_conditions, ss_error, ss_subjects, ss_total],
            'DF': [df_conditions, df_error, df_subjects, df_total],
            'MS': [ms_conditions, ms_error, ss_subjects/df_subjects, np.nan],
            'F': [f_statistic, np.nan, np.nan, np.nan],
            'p-value': [p_value, np.nan, np.nan, np.nan],
            'eta²': [eta_squared, np.nan, np.nan, np.nan]
        })
        
        # Post-hoc tests if significant
        post_hoc = None
        if p_value < 0.05 and n_conditions > 2:
            post_hoc = self._repeated_measures_post_hoc(wide_data, ms_error, df_error)
        
        results = {
            'test_name': 'Repeated Measures ANOVA',
            'anova_table': anova_table,
            'sphericity': sphericity_results,
            'correction_applied': sphericity_correction,
            'corrected_df': {
                'conditions': df_conditions_corrected,
                'error': df_error_corrected
            },
            'condition_means': {
                str(cond): {'mean': float(mean), 'std': float(data_array[:, i].std())}
                for i, (cond, mean) in enumerate(zip(conditions, condition_means))
            },
            'n_subjects': n_subjects,
            'n_conditions': n_conditions,
            'post_hoc': post_hoc,
            'significant': p_value < 0.05,
            'interpretation': self._interpret_repeated_measures(p_value, eta_squared, n_conditions)
        }
        
        return results
    
    def ancova(self,
              data: pd.DataFrame,
              dependent_var: str,
              factor: str,
              covariate: str,
              check_homogeneity_slopes: bool = True) -> Dict[str, Any]:
        """
        Perform Analysis of Covariance (ANCOVA).
        
        Tests for differences between groups while controlling for a covariate.
        
        Args:
            data: DataFrame containing the data
            dependent_var: Name of dependent variable
            factor: Name of categorical factor
            covariate: Name of continuous covariate
            check_homogeneity_slopes: Whether to test homogeneity of slopes assumption
            
        Returns:
            Dictionary containing ANCOVA results
        """
        # Clean data
        clean_data = data[[dependent_var, factor, covariate]].dropna()
        
        # Get factor levels
        levels = clean_data[factor].unique()
        n_levels = len(levels)
        
        if n_levels < 2:
            raise ValueError("Factor must have at least 2 levels")
        
        # Check homogeneity of slopes if requested
        homogeneity_test = None
        if check_homogeneity_slopes:
            homogeneity_test = self._test_homogeneity_slopes(
                clean_data, dependent_var, factor, covariate
            )
            
            if homogeneity_test['p_value'] < 0.05:
                warnings.warn("Homogeneity of slopes assumption violated (p < 0.05). "
                            "ANCOVA results may not be valid.")
        
        # Perform ANCOVA
        y = clean_data[dependent_var].values
        x_cov = clean_data[covariate].values
        n_total = len(y)
        
        # Center covariate
        x_cov_centered = x_cov - np.mean(x_cov)
        
        # Calculate sums of squares
        grand_mean = np.mean(y)
        ss_total = np.sum((y - grand_mean)**2)
        df_total = n_total - 1
        
        # Regression of Y on covariate
        cov_y_x = np.sum((x_cov_centered) * (y - grand_mean))
        cov_x_x = np.sum(x_cov_centered**2)
        b_pooled = cov_y_x / cov_x_x if cov_x_x > 0 else 0
        
        # Adjusted sums of squares
        ss_regression = b_pooled**2 * cov_x_x
        ss_total_adjusted = ss_total - ss_regression
        
        # Factor SS (adjusted for covariate)
        group_means_adj = []
        group_sizes = []
        
        for level in levels:
            group_data = clean_data[clean_data[factor] == level]
            y_group = group_data[dependent_var].values
            x_group = group_data[covariate].values
            
            # Adjusted mean = group_mean - b*(group_cov_mean - grand_cov_mean)
            adj_mean = np.mean(y_group) - b_pooled * (np.mean(x_group) - np.mean(x_cov))
            group_means_adj.append(adj_mean)
            group_sizes.append(len(y_group))
        
        grand_mean_adj = np.mean(y) - b_pooled * 0  # Since covariate is centered
        
        ss_factor_adj = sum([n * (mean - grand_mean_adj)**2 
                           for n, mean in zip(group_sizes, group_means_adj)])
        df_factor = n_levels - 1
        
        # Error SS (adjusted)
        ss_error_adj = ss_total_adjusted - ss_factor_adj
        df_error = n_total - n_levels - 1  # Subtract 1 for covariate
        
        # Mean squares
        ms_factor_adj = ss_factor_adj / df_factor
        ms_error_adj = ss_error_adj / df_error
        
        # F-statistic
        f_statistic = ms_factor_adj / ms_error_adj if ms_error_adj > 0 else 0
        p_value = 1 - stats.f.cdf(f_statistic, df_factor, df_error)
        
        # Effect size
        eta_squared = ss_factor_adj / ss_total_adjusted
        
        # Build ANCOVA table
        ancova_table = pd.DataFrame({
            'Source': [covariate, factor, 'Error', 'Total'],
            'SS': [ss_regression, ss_factor_adj, ss_error_adj, ss_total],
            'DF': [1, df_factor, df_error, df_total],
            'MS': [ss_regression, ms_factor_adj, ms_error_adj, np.nan],
            'F': [ss_regression/ms_error_adj, f_statistic, np.nan, np.nan],
            'p-value': [1 - stats.f.cdf(ss_regression/ms_error_adj, 1, df_error), 
                       p_value, np.nan, np.nan],
            'eta²': [ss_regression/ss_total, eta_squared, np.nan, np.nan]
        })
        
        # Adjusted means
        adjusted_means = pd.DataFrame({
            'Level': levels,
            'Unadjusted_Mean': [clean_data[clean_data[factor] == l][dependent_var].mean() 
                               for l in levels],
            'Adjusted_Mean': group_means_adj,
            'N': group_sizes
        })
        
        results = {
            'test_name': 'ANCOVA',
            'ancova_table': ancova_table,
            'adjusted_means': adjusted_means,
            'regression_coefficient': b_pooled,
            'homogeneity_of_slopes': homogeneity_test,
            'significant': p_value < 0.05,
            'interpretation': self._interpret_ancova(p_value, eta_squared, b_pooled)
        }
        
        # Post-hoc if significant
        if p_value < 0.05 and n_levels > 2:
            results['post_hoc'] = self._ancova_post_hoc(
                adjusted_means, ms_error_adj, df_error, n_total
            )
        
        return results
    
    def mixed_anova(self,
                   data: pd.DataFrame,
                   dependent_var: str,
                   between_factor: str,
                   within_factor: str,
                   subject_id: str) -> Dict[str, Any]:
        """
        Perform mixed ANOVA (split-plot ANOVA).
        
        Combines between-subjects and within-subjects factors.
        
        Args:
            data: DataFrame in long format
            dependent_var: Name of dependent variable
            between_factor: Name of between-subjects factor
            within_factor: Name of within-subjects factor
            subject_id: Name of subject identifier column
            
        Returns:
            Dictionary containing mixed ANOVA results
        """
        # This is a simplified implementation
        # For production, consider using statsmodels or pingouin
        
        clean_data = data[[dependent_var, between_factor, within_factor, subject_id]].dropna()
        
        # Get factor levels
        between_levels = clean_data[between_factor].unique()
        within_levels = clean_data[within_factor].unique()
        n_between = len(between_levels)
        n_within = len(within_levels)
        
        # Check data structure
        subjects_per_group = clean_data.groupby(between_factor)[subject_id].nunique()
        
        # Perform analysis (simplified)
        results = {
            'test_name': 'Mixed ANOVA',
            'between_factor': between_factor,
            'within_factor': within_factor,
            'n_between_levels': n_between,
            'n_within_levels': n_within,
            'subjects_per_group': subjects_per_group.to_dict(),
            'note': 'Simplified implementation. For full mixed ANOVA, use specialized packages.'
        }
        
        return results
    
    # Helper methods
    
    def _tukey_hsd(self, data: pd.DataFrame, dep_var: str, factor: str,
                  ms_error: float, df_error: int) -> List[Dict[str, Any]]:
        """Perform Tukey's HSD post-hoc test."""
        from scipy.stats import studentized_range
        
        levels = data[factor].unique()
        n_levels = len(levels)
        
        # Calculate means and sample sizes
        group_stats = data.groupby(factor)[dep_var].agg(['mean', 'count'])
        
        comparisons = []
        
        # Pairwise comparisons
        for i, level1 in enumerate(levels):
            for j, level2 in enumerate(levels):
                if i < j:
                    mean1 = group_stats.loc[level1, 'mean']
                    mean2 = group_stats.loc[level2, 'mean']
                    n1 = group_stats.loc[level1, 'count']
                    n2 = group_stats.loc[level2, 'count']
                    
                    # Standard error
                    se = np.sqrt(ms_error * (1/n1 + 1/n2) / 2)
                    
                    # Q statistic
                    q = abs(mean1 - mean2) / se if se > 0 else 0
                    
                    # Critical value (approximate)
                    q_critical = 3.5  # Approximate for alpha=0.05
                    
                    # P-value (approximate)
                    p_value = 1 - studentized_range.cdf(q, n_levels, df_error) if df_error > 0 else 1
                    
                    comparisons.append({
                        'group1': str(level1),
                        'group2': str(level2),
                        'mean_diff': mean1 - mean2,
                        'se': se,
                        'q_statistic': q,
                        'p_value': p_value,
                        'significant': p_value < 0.05
                    })
        
        return comparisons
    
    def _simple_effects_analysis(self, data: pd.DataFrame, dep_var: str,
                                factor1: str, factor2: str,
                                ms_error: float, df_error: int) -> Dict[str, Any]:
        """Analyze simple effects when interaction is significant."""
        simple_effects = {}
        
        # Simple effect of factor1 at each level of factor2
        for level2 in data[factor2].unique():
            subset = data[data[factor2] == level2]
            groups = [group[dep_var].values for name, group in subset.groupby(factor1)]
            
            if len(groups) > 1:
                f_stat, p_value = stats.f_oneway(*groups)
                simple_effects[f'{factor1}_at_{factor2}={level2}'] = {
                    'F': f_stat,
                    'p_value': p_value,
                    'significant': p_value < 0.05
                }
        
        # Simple effect of factor2 at each level of factor1
        for level1 in data[factor1].unique():
            subset = data[data[factor1] == level1]
            groups = [group[dep_var].values for name, group in subset.groupby(factor2)]
            
            if len(groups) > 1:
                f_stat, p_value = stats.f_oneway(*groups)
                simple_effects[f'{factor2}_at_{factor1}={level1}'] = {
                    'F': f_stat,
                    'p_value': p_value,
                    'significant': p_value < 0.05
                }
        
        return simple_effects
    
    def _mauchly_sphericity_test(self, wide_data: pd.DataFrame) -> Dict[str, Any]:
        """Test sphericity assumption for repeated measures."""
        n_subjects, n_conditions = wide_data.shape
        
        # Calculate covariance matrix of differences
        differences = []
        for i in range(n_conditions - 1):
            differences.append(wide_data.iloc[:, i] - wide_data.iloc[:, i + 1])
        
        diff_matrix = np.column_stack(differences)
        cov_matrix = np.cov(diff_matrix.T)
        
        # Mauchly's W (simplified)
        eigenvalues = np.linalg.eigvals(cov_matrix)
        eigenvalues = eigenvalues[eigenvalues > 0]  # Remove negative eigenvalues
        
        if len(eigenvalues) > 0:
            w = np.exp(np.mean(np.log(eigenvalues)) - np.log(np.mean(eigenvalues)))
        else:
            w = 1.0
        
        # Greenhouse-Geisser epsilon
        k = n_conditions
        trace_cov = np.trace(cov_matrix)
        trace_cov_squared = np.trace(cov_matrix @ cov_matrix)
        
        if trace_cov > 0:
            gg_epsilon = (trace_cov**2) / ((k - 1) * trace_cov_squared)
            gg_epsilon = min(1.0, max(1/(k - 1), gg_epsilon))
        else:
            gg_epsilon = 1/(k - 1)
        
        # Huynh-Feldt epsilon
        hf_epsilon = (n_subjects * (k - 1) * gg_epsilon - 2) / ((k - 1) * (n_subjects - 1 - (k - 1) * gg_epsilon))
        hf_epsilon = min(1.0, hf_epsilon)
        
        return {
            'mauchly_w': w,
            'sphericity_assumed': w > 0.75,  # Simplified criterion
            'greenhouse_geisser_epsilon': gg_epsilon,
            'huynh_feldt_epsilon': hf_epsilon
        }
    
    def _repeated_measures_post_hoc(self, wide_data: pd.DataFrame,
                                   ms_error: float, df_error: int) -> List[Dict[str, Any]]:
        """Perform post-hoc tests for repeated measures."""
        conditions = wide_data.columns
        n_subjects = len(wide_data)
        comparisons = []
        
        for i, cond1 in enumerate(conditions):
            for j, cond2 in enumerate(conditions):
                if i < j:
                    diff = wide_data[cond1] - wide_data[cond2]
                    mean_diff = np.mean(diff)
                    se_diff = np.std(diff, ddof=1) / np.sqrt(n_subjects)
                    
                    t_stat = mean_diff / se_diff if se_diff > 0 else 0
                    p_value = 2 * (1 - stats.t.cdf(abs(t_stat), n_subjects - 1))
                    
                    # Bonferroni correction
                    n_comparisons = len(conditions) * (len(conditions) - 1) / 2
                    p_adjusted = min(1.0, p_value * n_comparisons)
                    
                    comparisons.append({
                        'condition1': str(cond1),
                        'condition2': str(cond2),
                        'mean_diff': mean_diff,
                        'se': se_diff,
                        't_statistic': t_stat,
                        'p_value': p_value,
                        'p_adjusted': p_adjusted,
                        'significant': p_adjusted < 0.05
                    })
        
        return comparisons
    
    def _test_homogeneity_slopes(self, data: pd.DataFrame, dep_var: str,
                                factor: str, covariate: str) -> Dict[str, Any]:
        """Test homogeneity of regression slopes assumption for ANCOVA."""
        # Model with interaction
        y = data[dep_var].values
        x = data[covariate].values
        
        # Create dummy variables for factor
        levels = data[factor].unique()
        dummies = pd.get_dummies(data[factor], drop_first=True)
        
        # Full model with interaction
        X_full = np.column_stack([
            np.ones(len(data)),
            x,
            dummies.values,
            x.reshape(-1, 1) * dummies.values  # Interaction terms
        ])
        
        # Reduced model without interaction
        X_reduced = np.column_stack([
            np.ones(len(data)),
            x,
            dummies.values
        ])
        
        # Fit models
        try:
            beta_full = np.linalg.lstsq(X_full, y, rcond=None)[0]
            y_pred_full = X_full @ beta_full
            ss_error_full = np.sum((y - y_pred_full)**2)
            df_full = len(data) - X_full.shape[1]
            
            beta_reduced = np.linalg.lstsq(X_reduced, y, rcond=None)[0]
            y_pred_reduced = X_reduced @ beta_reduced
            ss_error_reduced = np.sum((y - y_pred_reduced)**2)
            df_reduced = len(data) - X_reduced.shape[1]
            
            # F-test for interaction
            f_stat = ((ss_error_reduced - ss_error_full) / (df_reduced - df_full)) / \
                    (ss_error_full / df_full)
            p_value = 1 - stats.f.cdf(f_stat, df_reduced - df_full, df_full)
            
            return {
                'f_statistic': f_stat,
                'p_value': p_value,
                'homogeneous': p_value > 0.05
            }
        except np.linalg.LinAlgError:
            return {
                'f_statistic': np.nan,
                'p_value': np.nan,
                'homogeneous': None
            }
    
    def _ancova_post_hoc(self, adjusted_means: pd.DataFrame,
                        ms_error: float, df_error: int, n_total: int) -> List[Dict[str, Any]]:
        """Post-hoc tests for ANCOVA using adjusted means."""
        comparisons = []
        levels = adjusted_means['Level'].values
        
        for i in range(len(levels)):
            for j in range(i + 1, len(levels)):
                mean_diff = adjusted_means.iloc[i]['Adjusted_Mean'] - adjusted_means.iloc[j]['Adjusted_Mean']
                
                # Standard error (simplified)
                n1 = adjusted_means.iloc[i]['N']
                n2 = adjusted_means.iloc[j]['N']
                se = np.sqrt(ms_error * (1/n1 + 1/n2))
                
                t_stat = mean_diff / se if se > 0 else 0
                p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df_error))
                
                comparisons.append({
                    'group1': str(levels[i]),
                    'group2': str(levels[j]),
                    'adjusted_mean_diff': mean_diff,
                    'se': se,
                    't_statistic': t_stat,
                    'p_value': p_value,
                    'significant': p_value < 0.05
                })
        
        return comparisons
    
    # Interpretation methods
    
    def _interpret_repeated_measures(self, p_value: float, eta_squared: float,
                                    n_conditions: int) -> str:
        """Interpret repeated measures ANOVA results."""
        if p_value < 0.05:
            effect = self._interpret_eta_squared(eta_squared)
            return f"There is a statistically significant difference across the {n_conditions} conditions " \
                   f"(p={p_value:.4f}), with {effect} (η²={eta_squared:.3f})."
        else:
            return f"No statistically significant difference found across the {n_conditions} conditions " \
                   f"(p={p_value:.4f})."
    
    def _interpret_ancova(self, p_value: float, eta_squared: float,
                         regression_coef: float) -> str:
        """Interpret ANCOVA results."""
        if p_value < 0.05:
            effect = self._interpret_eta_squared(eta_squared)
            return f"After controlling for the covariate, there is a statistically significant " \
                   f"difference between groups (p={p_value:.4f}), with {effect} (η²={eta_squared:.3f}). " \
                   f"The covariate coefficient is {regression_coef:.3f}."
        else:
            return f"After controlling for the covariate, no statistically significant " \
                   f"difference found between groups (p={p_value:.4f})."
    
    def _interpret_eta_squared(self, eta_squared: float) -> str:
        """Interpret eta-squared effect size."""
        if eta_squared < 0.01:
            return "a negligible effect"
        elif eta_squared < 0.06:
            return "a small effect"
        elif eta_squared < 0.14:
            return "a medium effect"
        else:
            return "a large effect"