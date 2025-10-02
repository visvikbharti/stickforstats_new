"""
Advanced Statistical Analysis Service for StickForStats platform.

This module provides statistical testing functionality for advanced experimental designs,
including various types of ANOVA, non-parametric tests, and multivariate analyses.
"""

import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from statsmodels.stats.multitest import multipletests
from statsmodels.stats.diagnostic import lilliefors
import pingouin as pg
import scikit_posthocs as sp
from typing import Dict, Any, List, Optional, Union, Tuple
import logging
from dataclasses import dataclass
import json
from enum import Enum

from .types import TestType, ReplicateConfig, AnalysisOptions, VariableSelection

# Configure logging
logger = logging.getLogger(__name__)


class AdvancedStatisticalAnalysisService:
    """
    Service for performing advanced statistical analyses.
    
    This service provides methods for various statistical tests, including:
    - One-way ANOVA
    - Two-way ANOVA
    - MANOVA
    - Kruskal-Wallis
    - Friedman
    """
    
    def __init__(self):
        """Initialize statistical analyzer."""
        self.test_descriptions = {
            TestType.ONE_WAY_ANOVA: "Compare means across multiple groups",
            TestType.TWO_WAY_ANOVA: "Analyze effects of two factors and their interaction",
            TestType.REPEATED_MEASURES: "Analyze repeated measurements on same subjects over time",
            TestType.MIXED_ANOVA: "Analyze between and within-subject factors",
            TestType.MANOVA: "Analyze multiple dependent variables",
            TestType.KRUSKAL_WALLIS: "Non-parametric alternative to one-way ANOVA",
            TestType.FRIEDMAN: "Non-parametric test for repeated measures",
            TestType.MIXED_EFFECTS: "Account for random and fixed effects in hierarchical data"
        }
    
    def get_available_tests(self) -> Dict[str, str]:
        """Get available tests with descriptions."""
        return {test.value: desc for test, desc in self.test_descriptions.items()}
    
    def analyze(
        self, 
        data: pd.DataFrame, 
        test_type: TestType,
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Perform statistical analysis based on selected test type.
        
        Args:
            data: DataFrame containing the data
            test_type: Type of statistical test to perform
            variables: Selected variables for analysis
            options: Analysis options and parameters
            
        Returns:
            Dictionary containing analysis results
        """
        logger.info(f"Running {test_type.value} analysis")
        
        # Validate inputs
        self._validate_inputs(data, test_type, variables)
        
        # Run appropriate test based on test_type
        if test_type == TestType.ONE_WAY_ANOVA:
            results = self._run_one_way_anova(data, variables, options)
        elif test_type == TestType.TWO_WAY_ANOVA:
            results = self._run_two_way_anova(data, variables, options)
        elif test_type == TestType.MANOVA:
            results = self._run_manova(data, variables, options)
        elif test_type == TestType.KRUSKAL_WALLIS:
            results = self._run_kruskal_wallis(data, variables, options)
        elif test_type == TestType.FRIEDMAN:
            results = self._run_friedman(data, variables, options)
        elif test_type == TestType.REPEATED_MEASURES:
            results = self._run_repeated_measures_anova(data, variables, options)
        elif test_type == TestType.MIXED_ANOVA:
            results = self._run_mixed_anova(data, variables, options)
        elif test_type == TestType.MIXED_EFFECTS:
            results = self._run_mixed_effects(data, variables, options)
        else:
            raise ValueError(f"Unsupported test type: {test_type}")
        
        # Add test information to results
        results["test_type"] = test_type.value
        results["test_description"] = self.test_descriptions[test_type]
        
        # Add timestamp
        results["timestamp"] = pd.Timestamp.now().isoformat()
        
        return results
    
    def _validate_inputs(
        self, 
        data: pd.DataFrame, 
        test_type: TestType,
        variables: VariableSelection
    ) -> None:
        """
        Validate inputs for statistical analysis.
        
        Args:
            data: DataFrame containing the data
            test_type: Type of statistical test to perform
            variables: Selected variables for analysis
            
        Raises:
            ValueError: If inputs are invalid
        """
        # Check for empty data
        if data is None or data.empty:
            raise ValueError("Data cannot be empty")
        
        # Validate dependent variables (must be numeric)
        for var in variables.dependent_variables:
            if var not in data.columns:
                raise ValueError(f"Dependent variable '{var}' not found in data")
            if not pd.api.types.is_numeric_dtype(data[var]):
                raise ValueError(f"Dependent variable '{var}' must be numeric")
        
        # Validate independent variables
        for var in variables.independent_variables:
            if var not in data.columns:
                raise ValueError(f"Independent variable '{var}' not found in data")
        
        # Test-specific validation
        if test_type == TestType.TWO_WAY_ANOVA:
            if len(variables.independent_variables) != 2:
                raise ValueError("Two-way ANOVA requires exactly two independent variables")
        
        elif test_type == TestType.MANOVA:
            if len(variables.dependent_variables) < 2:
                raise ValueError("MANOVA requires at least two dependent variables")
        
        elif test_type in [TestType.REPEATED_MEASURES, TestType.MIXED_ANOVA, TestType.FRIEDMAN]:
            if not variables.subject_id:
                raise ValueError(f"{test_type.value} requires a subject ID variable")
            
            if variables.subject_id not in data.columns:
                raise ValueError(f"Subject ID variable '{variables.subject_id}' not found in data")
    
    def _run_one_way_anova(
        self, 
        data: pd.DataFrame, 
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Run one-way ANOVA analysis.
        
        Args:
            data: DataFrame containing the data
            variables: Selected variables for analysis
            options: Analysis options
            
        Returns:
            Dictionary containing analysis results
        """
        results = {
            "anova_results": {},
            "descriptive_stats": {},
            "assumption_checks": {},
            "post_hoc": {}
        }
        
        # Get dependent and grouping variables
        dep_var = variables.dependent_variables[0]
        group_var = variables.independent_variables[0]
        
        # Run normality tests if assumption checks are enabled
        if options.assumption_checks:
            # Group-wise normality
            normality_results = {}
            for group in data[group_var].unique():
                group_data = data[data[group_var] == group][dep_var].dropna()
                if len(group_data) > 3:  # Need at least 4 observations for Shapiro-Wilk
                    stat, p = stats.shapiro(group_data)
                    normality_results[str(group)] = {
                        "statistic": stat,
                        "p_value": p,
                        "normal": p > options.alpha
                    }
            
            # Homogeneity of variances (Levene's test)
            groups = [data[data[group_var] == group][dep_var].dropna() for group in data[group_var].unique()]
            levene_stat, levene_p = stats.levene(*groups)
            
            results["assumption_checks"] = {
                "normality": normality_results,
                "homogeneity_of_variances": {
                    "statistic": levene_stat,
                    "p_value": levene_p,
                    "equal_variances": levene_p > options.alpha
                }
            }
        
        # Run ANOVA
        formula = f"{dep_var} ~ C({group_var})"
        anova_results = pg.anova(data=data, dv=dep_var, between=group_var, detailed=True)
        
        # Convert to dictionary
        anova_dict = anova_results.to_dict('records')
        
        # Calculate effect size
        # Use partial eta-squared for effect size
        ss_total = anova_results['SS'].sum()
        for idx, row in enumerate(anova_dict):
            if row['Source'] != 'Residual':
                ss_effect = row['SS']
                ss_error = anova_results.loc[anova_results['Source'] == 'Residual', 'SS'].iloc[0]
                partial_eta_sq = ss_effect / (ss_effect + ss_error)
                anova_dict[idx]['partial_eta_squared'] = partial_eta_sq
        
        results["anova_results"] = anova_dict
        
        # Run post-hoc tests if enabled
        if options.post_hoc:
            # Tukey HSD
            tukey_results = pairwise_tukeyhsd(
                data[dep_var].dropna(), 
                data[group_var].dropna(),
                alpha=options.alpha
            )
            
            # Convert tukey results to dictionary
            tukey_dict = {
                "group1": list(tukey_results.groupsunique[tukey_results.data[:,1].astype(int)]),
                "group2": list(tukey_results.groupsunique[tukey_results.data[:,2].astype(int)]),
                "meandiff": list(tukey_results.meandiffs),
                "p_value": list(tukey_results.pvalues),
                "lower": list(tukey_results.confint[:,0]),
                "upper": list(tukey_results.confint[:,1]),
                "reject": list(tukey_results.reject)
            }
            
            results["post_hoc"] = {
                "tukey_hsd": tukey_dict
            }
        
        # Calculate descriptive statistics
        if options.include_descriptive:
            desc_stats = data.groupby(group_var)[dep_var].agg([
                'count', 'mean', 'std', 'min', 'median', 'max',
                lambda x: x.quantile(0.25),
                lambda x: x.quantile(0.75)
            ]).reset_index()
            
            desc_stats = desc_stats.rename(columns={
                '<lambda_0>': 'q1',
                '<lambda_1>': 'q3'
            })
            
            # Convert to dictionary
            results["descriptive_stats"] = desc_stats.to_dict('records')
        
        return results
    
    def _run_two_way_anova(
        self, 
        data: pd.DataFrame, 
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Run two-way ANOVA analysis.
        
        Args:
            data: DataFrame containing the data
            variables: Selected variables for analysis
            options: Analysis options
            
        Returns:
            Dictionary containing analysis results
        """
        results = {
            "anova_results": {},
            "descriptive_stats": {},
            "assumption_checks": {},
            "interaction_analysis": {}
        }
        
        # Get dependent and grouping variables
        dep_var = variables.dependent_variables[0]
        factor_a = variables.independent_variables[0]
        factor_b = variables.independent_variables[1]
        
        # Run ANOVA
        anova_results = pg.anova(
            data=data, 
            dv=dep_var, 
            between=[factor_a, factor_b],
            detailed=True
        )
        
        # Convert to dictionary
        anova_dict = anova_results.to_dict('records')
        
        # Calculate effect sizes (partial eta-squared)
        for idx, row in enumerate(anova_dict):
            if row['Source'] != 'Residual':
                ss_effect = row['SS']
                ss_error = anova_results.loc[anova_results['Source'] == 'Residual', 'SS'].iloc[0]
                partial_eta_sq = ss_effect / (ss_effect + ss_error)
                anova_dict[idx]['partial_eta_squared'] = partial_eta_sq
        
        results["anova_results"] = anova_dict
        
        # Run assumption checks if enabled
        if options.assumption_checks:
            # Normality test (Shapiro-Wilk) for each group
            normality_results = {}
            for a_level in data[factor_a].unique():
                for b_level in data[factor_b].unique():
                    group_data = data[
                        (data[factor_a] == a_level) & 
                        (data[factor_b] == b_level)
                    ][dep_var].dropna()
                    
                    group_key = f"{a_level}_{b_level}"
                    if len(group_data) > 3:  # Need at least 4 observations for Shapiro-Wilk
                        stat, p = stats.shapiro(group_data)
                        normality_results[group_key] = {
                            "statistic": stat,
                            "p_value": p,
                            "normal": p > options.alpha
                        }
            
            # Homogeneity of variances (Levene's test)
            groups = []
            group_labels = []
            for a_level in data[factor_a].unique():
                for b_level in data[factor_b].unique():
                    group_data = data[
                        (data[factor_a] == a_level) & 
                        (data[factor_b] == b_level)
                    ][dep_var].dropna()
                    
                    if len(group_data) > 0:
                        groups.append(group_data)
                        group_labels.append(f"{a_level}_{b_level}")
            
            levene_stat, levene_p = stats.levene(*groups)
            
            results["assumption_checks"] = {
                "normality": normality_results,
                "homogeneity_of_variances": {
                    "statistic": levene_stat,
                    "p_value": levene_p,
                    "equal_variances": levene_p > options.alpha
                }
            }
        
        # Calculate descriptive statistics
        if options.include_descriptive:
            desc_stats = data.groupby([factor_a, factor_b])[dep_var].agg([
                'count', 'mean', 'std', 'min', 'median', 'max'
            ]).reset_index()
            
            # Convert to dictionary
            results["descriptive_stats"] = desc_stats.to_dict('records')
        
        # Analyze interaction if there is one
        interaction_source = f"C({factor_a}):C({factor_b})"
        interaction_row = anova_results[anova_results['Source'] == interaction_source]
        
        if not interaction_row.empty and interaction_row['p-unc'].iloc[0] < options.alpha:
            # Significant interaction - analyze simple effects
            simple_effects = {}
            
            # Effect of factor A at each level of factor B
            for b_level in data[factor_b].unique():
                subset = data[data[factor_b] == b_level]
                if len(subset) > 0:
                    try:
                        simple_anova = pg.anova(subset, dv=dep_var, between=factor_a)
                        simple_effects[f"{factor_a}_at_{b_level}"] = simple_anova.to_dict('records')
                    except Exception as e:
                        logger.warning(f"Error calculating simple effect for {factor_a} at {b_level}: {e}")
            
            # Effect of factor B at each level of factor A
            for a_level in data[factor_a].unique():
                subset = data[data[factor_a] == a_level]
                if len(subset) > 0:
                    try:
                        simple_anova = pg.anova(subset, dv=dep_var, between=factor_b)
                        simple_effects[f"{factor_b}_at_{a_level}"] = simple_anova.to_dict('records')
                    except Exception as e:
                        logger.warning(f"Error calculating simple effect for {factor_b} at {a_level}: {e}")
                        
            results["interaction_analysis"] = {
                "has_significant_interaction": True,
                "simple_effects": simple_effects
            }
        else:
            results["interaction_analysis"] = {
                "has_significant_interaction": False
            }
            
            # Run post-hoc tests for main effects if they are significant
            if options.post_hoc:
                post_hoc_results = {}
                
                # Check factor A main effect
                factor_a_row = anova_results[anova_results['Source'] == f"C({factor_a})"]
                if not factor_a_row.empty and factor_a_row['p-unc'].iloc[0] < options.alpha:
                    # Run Tukey HSD for factor A
                    try:
                        posthoc = pg.pairwise_tukey(data=data, dv=dep_var, between=factor_a)
                        post_hoc_results[factor_a] = posthoc.to_dict('records')
                    except Exception as e:
                        logger.warning(f"Error in post-hoc test for {factor_a}: {e}")
                
                # Check factor B main effect
                factor_b_row = anova_results[anova_results['Source'] == f"C({factor_b})"]
                if not factor_b_row.empty and factor_b_row['p-unc'].iloc[0] < options.alpha:
                    # Run Tukey HSD for factor B
                    try:
                        posthoc = pg.pairwise_tukey(data=data, dv=dep_var, between=factor_b)
                        post_hoc_results[factor_b] = posthoc.to_dict('records')
                    except Exception as e:
                        logger.warning(f"Error in post-hoc test for {factor_b}: {e}")
                
                results["post_hoc"] = post_hoc_results
        
        return results
    
    def _run_manova(
        self, 
        data: pd.DataFrame, 
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Run MANOVA analysis.
        
        Args:
            data: DataFrame containing the data
            variables: Selected variables for analysis
            options: Analysis options
            
        Returns:
            Dictionary containing analysis results
        """
        results = {
            "manova_results": {},
            "descriptive_stats": {},
            "assumption_checks": {},
            "univariate_tests": {}
        }
        
        # Get dependent and grouping variables
        dep_vars = variables.dependent_variables
        group_var = variables.independent_variables[0]
        
        # Run MANOVA using pingouin
        manova_results = pg.multivariate_tests(
            data=data,
            dv=dep_vars,
            between=group_var
        )
        
        # Convert to dictionary
        results["manova_results"] = manova_results.to_dict('records')
        
        # Run univariate ANOVAs for each dependent variable
        univariate_results = {}
        for dep_var in dep_vars:
            try:
                anova_result = pg.anova(data=data, dv=dep_var, between=group_var)
                univariate_results[dep_var] = anova_result.to_dict('records')
                
                # Run post-hoc if significant and requested
                if options.post_hoc:
                    anova_p = anova_result.loc[0, 'p-unc']
                    if anova_p < options.alpha:
                        posthoc = pg.pairwise_tukey(data=data, dv=dep_var, between=group_var)
                        univariate_results[f"{dep_var}_posthoc"] = posthoc.to_dict('records')
            except Exception as e:
                logger.warning(f"Error in univariate test for {dep_var}: {e}")
                univariate_results[dep_var] = {"error": str(e)}
        
        results["univariate_tests"] = univariate_results
        
        # Run assumption checks if enabled
        if options.assumption_checks:
            # Multivariate normality - approximated by checking univariate normality
            normality_results = {}
            for dep_var in dep_vars:
                var_normality = {}
                for group in data[group_var].unique():
                    group_data = data[data[group_var] == group][dep_var].dropna()
                    if len(group_data) > 3:  # Need at least 4 observations for Shapiro-Wilk
                        stat, p = stats.shapiro(group_data)
                        var_normality[str(group)] = {
                            "statistic": stat,
                            "p_value": p,
                            "normal": p > options.alpha
                        }
                normality_results[dep_var] = var_normality
            
            # Homogeneity of covariance matrices (Box's M test)
            # Unfortunately, this is not available in pingouin or scipy
            # We'll skip this for now
            
            results["assumption_checks"] = {
                "univariate_normality": normality_results,
                "note": "Full multivariate normality and Box's M test not implemented"
            }
        
        # Calculate descriptive statistics
        if options.include_descriptive:
            desc_stats = {}
            for dep_var in dep_vars:
                stats = data.groupby(group_var)[dep_var].agg([
                    'count', 'mean', 'std', 'min', 'median', 'max'
                ]).reset_index()
                desc_stats[dep_var] = stats.to_dict('records')
            
            results["descriptive_stats"] = desc_stats
        
        return results
    
    def _run_kruskal_wallis(
        self, 
        data: pd.DataFrame, 
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Run Kruskal-Wallis test.
        
        Args:
            data: DataFrame containing the data
            variables: Selected variables for analysis
            options: Analysis options
            
        Returns:
            Dictionary containing analysis results
        """
        results = {
            "kruskal_results": {},
            "descriptive_stats": {},
            "post_hoc": {}
        }
        
        # Get dependent and grouping variables
        dep_var = variables.dependent_variables[0]
        group_var = variables.independent_variables[0]
        
        # Run Kruskal-Wallis test
        groups = []
        group_names = []
        for group in data[group_var].unique():
            group_data = data[data[group_var] == group][dep_var].dropna()
            if len(group_data) > 0:
                groups.append(group_data)
                group_names.append(str(group))
        
        if len(groups) < 2:
            raise ValueError("Kruskal-Wallis test requires at least two groups with data")
        
        h_stat, p_value = stats.kruskal(*groups)
        
        results["kruskal_results"] = {
            "h_statistic": h_stat,
            "p_value": p_value,
            "significant": p_value < options.alpha
        }
        
        # Run post-hoc tests if significant and requested
        if p_value < options.alpha and options.post_hoc:
            try:
                # Run Dunn's test
                posthoc_data = data[[group_var, dep_var]].dropna()
                dunn_results = sp.posthoc_dunn(
                    posthoc_data, 
                    val_col=dep_var, 
                    group_col=group_var,
                    p_adjust=options.correction_method
                )
                
                # Format results
                dunn_formatted = []
                for i, group1 in enumerate(dunn_results.index):
                    for j, group2 in enumerate(dunn_results.columns):
                        if i < j:  # Only include each pair once
                            dunn_formatted.append({
                                "group1": group1,
                                "group2": group2,
                                "p_value": dunn_results.iloc[i, j],
                                "significant": dunn_results.iloc[i, j] < options.alpha
                            })
                
                results["post_hoc"]["dunn_test"] = dunn_formatted
            except Exception as e:
                logger.warning(f"Error in Dunn's post-hoc test: {e}")
                results["post_hoc"]["error"] = str(e)
        
        # Calculate descriptive statistics
        if options.include_descriptive:
            desc_stats = data.groupby(group_var)[dep_var].agg([
                'count', 'mean', 'std', 'min',
                lambda x: x.quantile(0.25),
                'median',
                lambda x: x.quantile(0.75),
                'max'
            ]).reset_index()
            
            desc_stats = desc_stats.rename(columns={
                '<lambda_0>': 'q1',
                '<lambda_1>': 'q3'
            })
            
            # Calculate mean ranks
            mean_ranks = []
            for group in data[group_var].unique():
                group_data = data[data[group_var] == group][dep_var].dropna()
                if len(group_data) > 0:
                    # Get the ranks of all data
                    all_data = data[dep_var].dropna()
                    all_ranks = stats.rankdata(all_data)
                    
                    # Find the indices of the group data in the full dataset
                    group_indices = data[data[group_var] == group].index
                    group_ranks = [all_ranks[all_data.index.get_loc(idx)] for idx in group_indices if idx in all_data.index]
                    
                    mean_ranks.append({
                        group_var: group,
                        'mean_rank': np.mean(group_ranks) if group_ranks else np.nan
                    })
            
            # Convert to dictionary
            results["descriptive_stats"] = {
                "summary": desc_stats.to_dict('records'),
                "mean_ranks": mean_ranks
            }
        
        return results
    
    def _run_friedman(
        self, 
        data: pd.DataFrame, 
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Run Friedman test.
        
        Args:
            data: DataFrame containing the data
            variables: Selected variables for analysis
            options: Analysis options
            
        Returns:
            Dictionary containing analysis results
        """
        results = {
            "friedman_results": {},
            "descriptive_stats": {},
            "post_hoc": {}
        }
        
        # Get dependent and grouping variables
        dep_var = variables.dependent_variables[0]
        within_var = variables.independent_variables[0]
        subject_var = variables.subject_id
        
        # Run Friedman test
        try:
            friedman_result = pg.friedman(
                data=data,
                dv=dep_var,
                within=within_var,
                subject=subject_var
            )
            
            # Convert to dictionary
            results["friedman_results"] = friedman_result.to_dict('records')
            
            # Run post-hoc test if significant and requested
            if friedman_result.loc[0, 'p-unc'] < options.alpha and options.post_hoc:
                try:
                    posthoc = pg.pairwise_tests(
                        data=data,
                        dv=dep_var,
                        within=within_var,
                        subject=subject_var,
                        parametric=False
                    )
                    
                    # Convert to dictionary
                    results["post_hoc"] = posthoc.to_dict('records')
                except Exception as e:
                    logger.warning(f"Error in Friedman post-hoc test: {e}")
                    results["post_hoc"]["error"] = str(e)
            
            # Calculate descriptive statistics
            if options.include_descriptive:
                desc_stats = data.groupby(within_var)[dep_var].agg([
                    'count', 'mean', 'std', 'min',
                    lambda x: x.quantile(0.25),
                    'median',
                    lambda x: x.quantile(0.75),
                    'max'
                ]).reset_index()
                
                desc_stats = desc_stats.rename(columns={
                    '<lambda_0>': 'q1',
                    '<lambda_1>': 'q3'
                })
                
                # Calculate mean ranks
                try:
                    # Reshape data to wide format for rank calculation
                    wide_data = data.pivot(index=subject_var, columns=within_var, values=dep_var)
                    
                    # Calculate ranks for each subject
                    ranked_data = wide_data.rank(axis=1)
                    
                    # Calculate mean rank for each condition
                    mean_ranks = ranked_data.mean().reset_index()
                    mean_ranks.columns = [within_var, 'mean_rank']
                    
                    # Convert to dictionary
                    results["descriptive_stats"] = {
                        "summary": desc_stats.to_dict('records'),
                        "mean_ranks": mean_ranks.to_dict('records')
                    }
                except Exception as e:
                    logger.warning(f"Error calculating mean ranks: {e}")
                    results["descriptive_stats"] = {
                        "summary": desc_stats.to_dict('records'),
                        "mean_ranks_error": str(e)
                    }
            
        except Exception as e:
            logger.error(f"Error in Friedman test: {e}")
            results["friedman_results"] = {"error": str(e)}
        
        return results
    
    def _run_repeated_measures_anova(
        self, 
        data: pd.DataFrame, 
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Run repeated measures ANOVA.
        
        Args:
            data: DataFrame containing the data
            variables: Selected variables for analysis
            options: Analysis options
            
        Returns:
            Dictionary containing analysis results
        """
        results = {
            "rm_anova_results": {},
            "sphericity_test": {},
            "descriptive_stats": {},
            "assumption_checks": {},
            "post_hoc": {}
        }
        
        # Get dependent and within-subject variables
        dep_var = variables.dependent_variables[0]
        within_var = variables.independent_variables[0]
        subject_var = variables.subject_id
        
        # Run repeated measures ANOVA
        try:
            # Check if we have multiple within-subject factors
            if len(variables.independent_variables) > 1:
                within_factors = variables.independent_variables
                rm_anova = pg.rm_anova(
                    data=data,
                    dv=dep_var,
                    within=within_factors,
                    subject=subject_var,
                    detailed=True
                )
            else:
                rm_anova = pg.rm_anova(
                    data=data,
                    dv=dep_var,
                    within=within_var,
                    subject=subject_var,
                    detailed=True
                )
            
            # Convert to dictionary
            results["rm_anova_results"] = rm_anova.to_dict('records')
            
            # Sphericity test (Mauchly's)
            if len(variables.independent_variables) == 1:
                sphericity = pg.sphericity(
                    data=data,
                    dv=dep_var,
                    within=within_var,
                    subject=subject_var
                )
                
                results["sphericity_test"] = {
                    "w_statistic": sphericity.W,
                    "chi2_statistic": sphericity.chi2,
                    "df": sphericity.ddof,
                    "p_value": sphericity.pval,
                    "sphericity_violated": sphericity.pval < options.alpha
                }
            
            # Run post-hoc test if significant and requested
            if options.post_hoc:
                try:
                    # Check which effects are significant
                    significant_effects = []
                    for idx, row in rm_anova.iterrows():
                        if row['Source'] != 'Residual' and row['p-unc'] < options.alpha:
                            significant_effects.append(row['Source'])
                    
                    # Run post-hoc for significant effects
                    posthoc_results = {}
                    for effect in significant_effects:
                        # For single within-factor
                        if effect == within_var:
                            posthoc = pg.pairwise_ttests(
                                data=data,
                                dv=dep_var,
                                within=within_var,
                                subject=subject_var,
                                padjust=options.correction_method
                            )
                            posthoc_results[effect] = posthoc.to_dict('records')
                        # For interaction effects
                        elif ':' in effect:
                            factors = effect.split(':')
                            posthoc = pg.pairwise_ttests(
                                data=data,
                                dv=dep_var,
                                within=factors,
                                subject=subject_var,
                                padjust=options.correction_method
                            )
                            posthoc_results[effect] = posthoc.to_dict('records')
                    
                    results["post_hoc"] = posthoc_results
                except Exception as e:
                    logger.warning(f"Error in post-hoc tests: {e}")
                    results["post_hoc"]["error"] = str(e)
            
            # Run assumption checks if enabled
            if options.assumption_checks:
                # Normality of residuals
                try:
                    # Get residuals
                    # This is a simplified approach - in reality, residuals from 
                    # repeated measures ANOVA are more complex
                    wide_data = data.pivot(index=subject_var, columns=within_var, values=dep_var)
                    residuals = wide_data.values - wide_data.mean().values
                    residuals_flat = residuals.flatten()
                    
                    # Test normality of residuals
                    shapiro_stat, shapiro_p = stats.shapiro(residuals_flat)
                    
                    results["assumption_checks"]["normality"] = {
                        "statistic": shapiro_stat,
                        "p_value": shapiro_p,
                        "normal": shapiro_p > options.alpha
                    }
                except Exception as e:
                    logger.warning(f"Error checking normality: {e}")
                    results["assumption_checks"]["normality"] = {"error": str(e)}
            
            # Calculate descriptive statistics
            if options.include_descriptive:
                desc_stats = data.groupby(within_var)[dep_var].agg([
                    'count', 'mean', 'std', 'min', 'median', 'max'
                ]).reset_index()
                
                # Convert to dictionary
                results["descriptive_stats"] = desc_stats.to_dict('records')
        
        except Exception as e:
            logger.error(f"Error in repeated measures ANOVA: {e}")
            results["rm_anova_results"] = {"error": str(e)}
        
        return results
    
    def _run_mixed_anova(
        self, 
        data: pd.DataFrame, 
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Run mixed ANOVA (between and within factors).
        
        Args:
            data: DataFrame containing the data
            variables: Selected variables for analysis
            options: Analysis options
            
        Returns:
            Dictionary containing analysis results
        """
        results = {
            "mixed_anova_results": {},
            "sphericity_test": {},
            "descriptive_stats": {},
            "assumption_checks": {},
            "post_hoc": {}
        }
        
        # Get dependent, between-subject, and within-subject variables
        dep_var = variables.dependent_variables[0]
        between_var = variables.between_factors[0] if variables.between_factors else variables.independent_variables[0]
        within_var = variables.within_factors[0] if variables.within_factors else variables.independent_variables[1]
        subject_var = variables.subject_id
        
        # Run mixed ANOVA
        try:
            mixed_anova = pg.mixed_anova(
                data=data,
                dv=dep_var,
                between=between_var,
                within=within_var,
                subject=subject_var,
                detailed=True
            )
            
            # Convert to dictionary
            results["mixed_anova_results"] = mixed_anova.to_dict('records')
            
            # Sphericity test (Mauchly's) for within factor with more than 2 levels
            within_levels = data[within_var].nunique()
            if within_levels > 2:
                try:
                    sphericity = pg.sphericity(
                        data=data,
                        dv=dep_var,
                        within=within_var,
                        subject=subject_var
                    )
                    
                    results["sphericity_test"] = {
                        "w_statistic": sphericity.W,
                        "chi2_statistic": sphericity.chi2,
                        "df": sphericity.ddof,
                        "p_value": sphericity.pval,
                        "sphericity_violated": sphericity.pval < options.alpha
                    }
                except Exception as e:
                    logger.warning(f"Error in sphericity test: {e}")
                    results["sphericity_test"] = {"error": str(e)}
            
            # Run post-hoc tests if significant and requested
            if options.post_hoc:
                try:
                    posthoc_results = {}
                    
                    # Check if main effects or interaction are significant
                    for idx, row in mixed_anova.iterrows():
                        if row['Source'] not in ['Residual', 'Sphericity Corrections'] and row['p-unc'] < options.alpha:
                            source = row['Source']
                            
                            # Main effect of between-subject factor
                            if source == between_var:
                                posthoc = pg.pairwise_tukey(
                                    data=data,
                                    dv=dep_var,
                                    between=between_var
                                )
                                posthoc_results[source] = posthoc.to_dict('records')
                            
                            # Main effect of within-subject factor
                            elif source == within_var:
                                posthoc = pg.pairwise_ttests(
                                    data=data,
                                    dv=dep_var,
                                    within=within_var,
                                    subject=subject_var,
                                    padjust=options.correction_method
                                )
                                posthoc_results[source] = posthoc.to_dict('records')
                            
                            # Interaction effect
                            elif source == f"{within_var}*{between_var}":
                                # Run simple effects analysis
                                simple_effects = {}
                                
                                # Effect of within factor at each level of between factor
                                for between_level in data[between_var].unique():
                                    subset = data[data[between_var] == between_level]
                                    if len(subset) > 0:
                                        try:
                                            simple_rm = pg.rm_anova(
                                                data=subset,
                                                dv=dep_var,
                                                within=within_var,
                                                subject=subject_var
                                            )
                                            simple_effects[f"{within_var}_at_{between_level}"] = simple_rm.to_dict('records')
                                            
                                            # If significant, run pairwise comparisons
                                            if simple_rm.loc[0, 'p-unc'] < options.alpha:
                                                posthoc = pg.pairwise_ttests(
                                                    data=subset,
                                                    dv=dep_var,
                                                    within=within_var,
                                                    subject=subject_var,
                                                    padjust=options.correction_method
                                                )
                                                simple_effects[f"{within_var}_at_{between_level}_posthoc"] = posthoc.to_dict('records')
                                        except Exception as e:
                                            logger.warning(f"Error in simple effect for {within_var} at {between_level}: {e}")
                                
                                # Effect of between factor at each level of within factor
                                # Reshape data to wide format to get each level of within factor
                                wide_data = data.pivot(index=[subject_var, between_var], columns=within_var, values=dep_var)
                                for within_level in wide_data.columns:
                                    # Create a DataFrame with the between factor and the data for this within level
                                    level_data = wide_data.reset_index()[[subject_var, between_var, within_level]]
                                    level_data = level_data.rename(columns={within_level: dep_var})
                                    
                                    if len(level_data) > 0:
                                        try:
                                            simple_anova = pg.anova(
                                                data=level_data,
                                                dv=dep_var,
                                                between=between_var
                                            )
                                            simple_effects[f"{between_var}_at_{within_level}"] = simple_anova.to_dict('records')
                                            
                                            # If significant, run Tukey HSD
                                            if simple_anova.loc[0, 'p-unc'] < options.alpha:
                                                posthoc = pg.pairwise_tukey(
                                                    data=level_data,
                                                    dv=dep_var,
                                                    between=between_var
                                                )
                                                simple_effects[f"{between_var}_at_{within_level}_posthoc"] = posthoc.to_dict('records')
                                        except Exception as e:
                                            logger.warning(f"Error in simple effect for {between_var} at {within_level}: {e}")
                                
                                posthoc_results["interaction_simple_effects"] = simple_effects
                    
                    results["post_hoc"] = posthoc_results
                except Exception as e:
                    logger.warning(f"Error in post-hoc tests: {e}")
                    results["post_hoc"]["error"] = str(e)
            
            # Calculate descriptive statistics
            if options.include_descriptive:
                desc_stats = data.groupby([between_var, within_var])[dep_var].agg([
                    'count', 'mean', 'std', 'min', 'median', 'max'
                ]).reset_index()
                
                # Convert to dictionary
                results["descriptive_stats"] = desc_stats.to_dict('records')
        
        except Exception as e:
            logger.error(f"Error in mixed ANOVA: {e}")
            results["mixed_anova_results"] = {"error": str(e)}
        
        return results
    
    def _run_mixed_effects(
        self, 
        data: pd.DataFrame, 
        variables: VariableSelection,
        options: AnalysisOptions
    ) -> Dict[str, Any]:
        """
        Run mixed effects model analysis.
        
        Note: This is a placeholder. Full implementation would use statsmodels or another
        package for mixed effects models.
        
        Args:
            data: DataFrame containing the data
            variables: Selected variables for analysis
            options: Analysis options
            
        Returns:
            Dictionary containing analysis results
        """
        results = {
            "status": "not_implemented",
            "message": "Mixed effects models are not yet fully implemented in this service."
        }
        
        return results