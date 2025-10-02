"""
Power Analysis Service
======================

Comprehensive power analysis and sample size calculations for statistical tests.

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

import numpy as np
from scipy import stats
from scipy.stats import norm, t, f, chi2
from scipy.optimize import brentq
from typing import Dict, Any, Optional, Tuple, Union
import warnings
import logging

logger = logging.getLogger(__name__)


class PowerAnalysisService:
    """
    Statistical power analysis and sample size calculation service.
    
    Provides power analysis for:
    - T-tests (one-sample, two-sample, paired)
    - ANOVA (one-way, two-way)
    - Correlation
    - Regression
    - Chi-square tests
    - Proportions
    """
    
    def __init__(self):
        """Initialize the power analysis service."""
        self.last_analysis = None
    
    def t_test_power(self,
                    effect_size: Optional[float] = None,
                    n: Optional[Union[int, Tuple[int, int]]] = None,
                    power: Optional[float] = None,
                    alpha: float = 0.05,
                    test_type: str = 'two-sample',
                    alternative: str = 'two-sided',
                    ratio: float = 1.0) -> Dict[str, Any]:
        """
        Power analysis for t-tests.
        
        Calculates one of: effect_size, sample_size, or power (given the other two).
        
        Args:
            effect_size: Cohen's d effect size
            n: Sample size (total for one-sample, per group for two-sample)
            power: Statistical power (1 - Type II error rate)
            alpha: Significance level (Type I error rate)
            test_type: 'one-sample', 'two-sample', or 'paired'
            alternative: 'two-sided', 'greater', or 'less'
            ratio: Ratio of sample sizes for two-sample test (n2/n1)
            
        Returns:
            Dictionary with power analysis results
        """
        # Validate inputs
        params_provided = sum([x is not None for x in [effect_size, n, power]])
        if params_provided != 2:
            raise ValueError("Exactly two of effect_size, n, and power must be provided")
        
        # Set up alternative hypothesis
        if alternative == 'two-sided':
            alpha_adj = alpha / 2
        else:
            alpha_adj = alpha
        
        if test_type == 'one-sample' or test_type == 'paired':
            # One-sample or paired t-test
            if effect_size is not None and n is not None:
                # Calculate power
                df = n - 1
                nc_param = effect_size * np.sqrt(n)  # Non-centrality parameter
                
                if alternative == 'two-sided':
                    crit_val = t.ppf(1 - alpha_adj, df)
                    power_calc = 1 - (t.cdf(crit_val, df, nc_param) - 
                                     t.cdf(-crit_val, df, nc_param))
                elif alternative == 'greater':
                    crit_val = t.ppf(1 - alpha, df)
                    power_calc = 1 - t.cdf(crit_val, df, nc_param)
                else:  # less
                    crit_val = t.ppf(alpha, df)
                    power_calc = t.cdf(crit_val, df, nc_param)
                
                result = {
                    'test_type': test_type,
                    'effect_size': effect_size,
                    'n': n,
                    'power': power_calc,
                    'alpha': alpha,
                    'alternative': alternative,
                    'degrees_of_freedom': df,
                    'non_centrality': nc_param
                }
                
            elif effect_size is not None and power is not None:
                # Calculate sample size
                def power_func(n_try):
                    df = n_try - 1
                    nc = effect_size * np.sqrt(n_try)
                    
                    if alternative == 'two-sided':
                        crit = t.ppf(1 - alpha_adj, df)
                        pow_calc = 1 - (t.cdf(crit, df, nc) - t.cdf(-crit, df, nc))
                    elif alternative == 'greater':
                        crit = t.ppf(1 - alpha, df)
                        pow_calc = 1 - t.cdf(crit, df, nc)
                    else:
                        crit = t.ppf(alpha, df)
                        pow_calc = t.cdf(crit, df, nc)
                    
                    return pow_calc - power
                
                # Find sample size using root finding
                n_calc = int(np.ceil(brentq(power_func, 2, 10000)))
                
                result = {
                    'test_type': test_type,
                    'effect_size': effect_size,
                    'n': n_calc,
                    'power': power,
                    'alpha': alpha,
                    'alternative': alternative
                }
                
            else:  # n is not None and power is not None
                # Calculate effect size
                def power_func(d_try):
                    df = n - 1
                    nc = d_try * np.sqrt(n)
                    
                    if alternative == 'two-sided':
                        crit = t.ppf(1 - alpha_adj, df)
                        pow_calc = 1 - (t.cdf(crit, df, nc) - t.cdf(-crit, df, nc))
                    elif alternative == 'greater':
                        crit = t.ppf(1 - alpha, df)
                        pow_calc = 1 - t.cdf(crit, df, nc)
                    else:
                        crit = t.ppf(alpha, df)
                        pow_calc = t.cdf(crit, df, nc)
                    
                    return pow_calc - power
                
                effect_size_calc = brentq(power_func, 0.01, 5)
                
                result = {
                    'test_type': test_type,
                    'effect_size': effect_size_calc,
                    'n': n,
                    'power': power,
                    'alpha': alpha,
                    'alternative': alternative
                }
                
        else:  # two-sample t-test
            # Handle sample size ratio
            if isinstance(n, tuple):
                n1, n2 = n
                ratio = n2 / n1
            elif n is not None:
                n1 = n
                n2 = int(n * ratio)
            
            if effect_size is not None and n is not None:
                # Calculate power
                n1 = n if not isinstance(n, tuple) else n[0]
                n2 = int(n1 * ratio) if not isinstance(n, tuple) else n[1]
                
                df = n1 + n2 - 2
                pooled_n = (n1 * n2) / (n1 + n2)
                nc_param = effect_size * np.sqrt(pooled_n)
                
                if alternative == 'two-sided':
                    crit_val = t.ppf(1 - alpha_adj, df)
                    power_calc = 1 - (t.cdf(crit_val, df, nc_param) - 
                                     t.cdf(-crit_val, df, nc_param))
                elif alternative == 'greater':
                    crit_val = t.ppf(1 - alpha, df)
                    power_calc = 1 - t.cdf(crit_val, df, nc_param)
                else:
                    crit_val = t.ppf(alpha, df)
                    power_calc = t.cdf(crit_val, df, nc_param)
                
                result = {
                    'test_type': test_type,
                    'effect_size': effect_size,
                    'n1': n1,
                    'n2': n2,
                    'n_total': n1 + n2,
                    'power': power_calc,
                    'alpha': alpha,
                    'alternative': alternative,
                    'ratio': ratio,
                    'degrees_of_freedom': df,
                    'non_centrality': nc_param
                }
                
            elif effect_size is not None and power is not None:
                # Calculate sample size
                def power_func(n1_try):
                    n2_try = int(n1_try * ratio)
                    df = n1_try + n2_try - 2
                    pooled_n = (n1_try * n2_try) / (n1_try + n2_try)
                    nc = effect_size * np.sqrt(pooled_n)
                    
                    if alternative == 'two-sided':
                        crit = t.ppf(1 - alpha_adj, df)
                        pow_calc = 1 - (t.cdf(crit, df, nc) - t.cdf(-crit, df, nc))
                    elif alternative == 'greater':
                        crit = t.ppf(1 - alpha, df)
                        pow_calc = 1 - t.cdf(crit, df, nc)
                    else:
                        crit = t.ppf(alpha, df)
                        pow_calc = t.cdf(crit, df, nc)
                    
                    return pow_calc - power
                
                n1_calc = int(np.ceil(brentq(power_func, 2, 10000)))
                n2_calc = int(np.ceil(n1_calc * ratio))
                
                result = {
                    'test_type': test_type,
                    'effect_size': effect_size,
                    'n1': n1_calc,
                    'n2': n2_calc,
                    'n_total': n1_calc + n2_calc,
                    'power': power,
                    'alpha': alpha,
                    'alternative': alternative,
                    'ratio': ratio
                }
                
            else:  # n and power provided, calculate effect size
                n1 = n if not isinstance(n, tuple) else n[0]
                n2 = int(n1 * ratio) if not isinstance(n, tuple) else n[1]
                
                def power_func(d_try):
                    df = n1 + n2 - 2
                    pooled_n = (n1 * n2) / (n1 + n2)
                    nc = d_try * np.sqrt(pooled_n)
                    
                    if alternative == 'two-sided':
                        crit = t.ppf(1 - alpha_adj, df)
                        pow_calc = 1 - (t.cdf(crit, df, nc) - t.cdf(-crit, df, nc))
                    elif alternative == 'greater':
                        crit = t.ppf(1 - alpha, df)
                        pow_calc = 1 - t.cdf(crit, df, nc)
                    else:
                        crit = t.ppf(alpha, df)
                        pow_calc = t.cdf(crit, df, nc)
                    
                    return pow_calc - power
                
                effect_size_calc = brentq(power_func, 0.01, 5)
                
                result = {
                    'test_type': test_type,
                    'effect_size': effect_size_calc,
                    'n1': n1,
                    'n2': n2,
                    'n_total': n1 + n2,
                    'power': power,
                    'alpha': alpha,
                    'alternative': alternative,
                    'ratio': ratio
                }
        
        # Add interpretation
        result['interpretation'] = self._interpret_power_analysis(result)
        
        self.last_analysis = result
        return result
    
    def anova_power(self,
                   effect_size: Optional[float] = None,
                   n_groups: int = None,
                   n_per_group: Optional[int] = None,
                   power: Optional[float] = None,
                   alpha: float = 0.05) -> Dict[str, Any]:
        """
        Power analysis for one-way ANOVA.
        
        Args:
            effect_size: Cohen's f effect size
            n_groups: Number of groups
            n_per_group: Sample size per group
            power: Statistical power
            alpha: Significance level
            
        Returns:
            Dictionary with ANOVA power analysis results
        """
        if n_groups is None or n_groups < 2:
            raise ValueError("n_groups must be specified and >= 2")
        
        params_provided = sum([x is not None for x in [effect_size, n_per_group, power]])
        if params_provided != 2:
            raise ValueError("Exactly two of effect_size, n_per_group, and power must be provided")
        
        if effect_size is not None and n_per_group is not None:
            # Calculate power
            n_total = n_groups * n_per_group
            df_between = n_groups - 1
            df_within = n_total - n_groups
            
            # Non-centrality parameter
            lambda_param = effect_size**2 * n_total
            
            # Critical F value
            f_crit = f.ppf(1 - alpha, df_between, df_within)
            
            # Power (using non-central F distribution)
            power_calc = 1 - stats.ncf.cdf(f_crit, df_between, df_within, lambda_param)
            
            result = {
                'test_type': 'One-Way ANOVA',
                'effect_size': effect_size,
                'n_groups': n_groups,
                'n_per_group': n_per_group,
                'n_total': n_total,
                'power': power_calc,
                'alpha': alpha,
                'df_between': df_between,
                'df_within': df_within,
                'non_centrality': lambda_param,
                'critical_f': f_crit
            }
            
        elif effect_size is not None and power is not None:
            # Calculate sample size
            def power_func(n_try):
                n_tot = n_groups * n_try
                df_b = n_groups - 1
                df_w = n_tot - n_groups
                lambda_p = effect_size**2 * n_tot
                f_cr = f.ppf(1 - alpha, df_b, df_w)
                pow_calc = 1 - stats.ncf.cdf(f_cr, df_b, df_w, lambda_p)
                return pow_calc - power
            
            n_per_group_calc = int(np.ceil(brentq(power_func, 2, 1000)))
            
            result = {
                'test_type': 'One-Way ANOVA',
                'effect_size': effect_size,
                'n_groups': n_groups,
                'n_per_group': n_per_group_calc,
                'n_total': n_groups * n_per_group_calc,
                'power': power,
                'alpha': alpha
            }
            
        else:  # n_per_group and power provided
            # Calculate effect size
            def power_func(f_try):
                n_tot = n_groups * n_per_group
                df_b = n_groups - 1
                df_w = n_tot - n_groups
                lambda_p = f_try**2 * n_tot
                f_cr = f.ppf(1 - alpha, df_b, df_w)
                pow_calc = 1 - stats.ncf.cdf(f_cr, df_b, df_w, lambda_p)
                return pow_calc - power
            
            effect_size_calc = brentq(power_func, 0.01, 2)
            
            result = {
                'test_type': 'One-Way ANOVA',
                'effect_size': effect_size_calc,
                'n_groups': n_groups,
                'n_per_group': n_per_group,
                'n_total': n_groups * n_per_group,
                'power': power,
                'alpha': alpha
            }
        
        result['interpretation'] = self._interpret_anova_power(result)
        self.last_analysis = result
        return result
    
    def correlation_power(self,
                         r: Optional[float] = None,
                         n: Optional[int] = None,
                         power: Optional[float] = None,
                         alpha: float = 0.05,
                         alternative: str = 'two-sided') -> Dict[str, Any]:
        """
        Power analysis for correlation tests.
        
        Args:
            r: Correlation coefficient (effect size)
            n: Sample size
            power: Statistical power
            alpha: Significance level
            alternative: 'two-sided', 'greater', or 'less'
            
        Returns:
            Dictionary with correlation power analysis results
        """
        params_provided = sum([x is not None for x in [r, n, power]])
        if params_provided != 2:
            raise ValueError("Exactly two of r, n, and power must be provided")
        
        # Use Fisher's z transformation
        if alternative == 'two-sided':
            alpha_adj = alpha / 2
        else:
            alpha_adj = alpha
        
        if r is not None and n is not None:
            # Calculate power
            z_r = 0.5 * np.log((1 + r) / (1 - r))  # Fisher's z
            se = 1 / np.sqrt(n - 3)
            
            z_crit = norm.ppf(1 - alpha_adj)
            
            if alternative == 'two-sided':
                power_calc = norm.cdf(-z_crit + abs(z_r) / se) + norm.cdf(-z_crit - abs(z_r) / se)
            elif alternative == 'greater':
                power_calc = 1 - norm.cdf(z_crit - z_r / se)
            else:
                power_calc = norm.cdf(-z_crit - z_r / se)
            
            result = {
                'test_type': 'Correlation',
                'correlation': r,
                'n': n,
                'power': power_calc,
                'alpha': alpha,
                'alternative': alternative,
                'fisher_z': z_r,
                'standard_error': se
            }
            
        elif r is not None and power is not None:
            # Calculate sample size
            z_r = 0.5 * np.log((1 + r) / (1 - r))
            z_crit = norm.ppf(1 - alpha_adj)
            z_power = norm.ppf(power)
            
            if alternative == 'two-sided':
                n_calc = int(np.ceil(((z_crit + z_power) / abs(z_r))**2 + 3))
            else:
                n_calc = int(np.ceil(((z_crit + z_power) / z_r)**2 + 3))
            
            result = {
                'test_type': 'Correlation',
                'correlation': r,
                'n': n_calc,
                'power': power,
                'alpha': alpha,
                'alternative': alternative
            }
            
        else:  # n and power provided
            # Calculate correlation
            def power_func(r_try):
                z_r = 0.5 * np.log((1 + r_try) / (1 - r_try))
                se = 1 / np.sqrt(n - 3)
                z_crit = norm.ppf(1 - alpha_adj)
                
                if alternative == 'two-sided':
                    pow_calc = norm.cdf(-z_crit + abs(z_r) / se) + norm.cdf(-z_crit - abs(z_r) / se)
                elif alternative == 'greater':
                    pow_calc = 1 - norm.cdf(z_crit - z_r / se)
                else:
                    pow_calc = norm.cdf(-z_crit - z_r / se)
                
                return pow_calc - power
            
            r_calc = brentq(power_func, 0.01, 0.99)
            
            result = {
                'test_type': 'Correlation',
                'correlation': r_calc,
                'n': n,
                'power': power,
                'alpha': alpha,
                'alternative': alternative
            }
        
        result['interpretation'] = self._interpret_correlation_power(result)
        self.last_analysis = result
        return result
    
    def regression_power(self,
                        r_squared: Optional[float] = None,
                        n_predictors: int = None,
                        n: Optional[int] = None,
                        power: Optional[float] = None,
                        alpha: float = 0.05) -> Dict[str, Any]:
        """
        Power analysis for multiple regression.
        
        Args:
            r_squared: R-squared value (effect size)
            n_predictors: Number of predictors
            n: Total sample size
            power: Statistical power
            alpha: Significance level
            
        Returns:
            Dictionary with regression power analysis results
        """
        if n_predictors is None or n_predictors < 1:
            raise ValueError("n_predictors must be specified and >= 1")
        
        params_provided = sum([x is not None for x in [r_squared, n, power]])
        if params_provided != 2:
            raise ValueError("Exactly two of r_squared, n, and power must be provided")
        
        if r_squared is not None and n is not None:
            # Calculate power
            f2 = r_squared / (1 - r_squared)  # Cohen's f²
            df_model = n_predictors
            df_error = n - n_predictors - 1
            
            lambda_param = f2 * (df_model + df_error + 1)
            f_crit = f.ppf(1 - alpha, df_model, df_error)
            
            power_calc = 1 - stats.ncf.cdf(f_crit, df_model, df_error, lambda_param)
            
            result = {
                'test_type': 'Multiple Regression',
                'r_squared': r_squared,
                'f_squared': f2,
                'n_predictors': n_predictors,
                'n': n,
                'power': power_calc,
                'alpha': alpha,
                'df_model': df_model,
                'df_error': df_error,
                'non_centrality': lambda_param
            }
            
        elif r_squared is not None and power is not None:
            # Calculate sample size
            f2 = r_squared / (1 - r_squared)
            
            def power_func(n_try):
                df_m = n_predictors
                df_e = n_try - n_predictors - 1
                if df_e <= 0:
                    return -1
                lambda_p = f2 * (df_m + df_e + 1)
                f_cr = f.ppf(1 - alpha, df_m, df_e)
                pow_calc = 1 - stats.ncf.cdf(f_cr, df_m, df_e, lambda_p)
                return pow_calc - power
            
            n_calc = int(np.ceil(brentq(power_func, n_predictors + 2, 10000)))
            
            result = {
                'test_type': 'Multiple Regression',
                'r_squared': r_squared,
                'f_squared': f2,
                'n_predictors': n_predictors,
                'n': n_calc,
                'power': power,
                'alpha': alpha
            }
            
        else:  # n and power provided
            # Calculate R-squared
            def power_func(r2_try):
                f2 = r2_try / (1 - r2_try)
                df_m = n_predictors
                df_e = n - n_predictors - 1
                lambda_p = f2 * (df_m + df_e + 1)
                f_cr = f.ppf(1 - alpha, df_m, df_e)
                pow_calc = 1 - stats.ncf.cdf(f_cr, df_m, df_e, lambda_p)
                return pow_calc - power
            
            r_squared_calc = brentq(power_func, 0.01, 0.99)
            
            result = {
                'test_type': 'Multiple Regression',
                'r_squared': r_squared_calc,
                'f_squared': r_squared_calc / (1 - r_squared_calc),
                'n_predictors': n_predictors,
                'n': n,
                'power': power,
                'alpha': alpha
            }
        
        result['interpretation'] = self._interpret_regression_power(result)
        self.last_analysis = result
        return result
    
    def chi_square_power(self,
                        effect_size: Optional[float] = None,
                        df: int = None,
                        n: Optional[int] = None,
                        power: Optional[float] = None,
                        alpha: float = 0.05) -> Dict[str, Any]:
        """
        Power analysis for chi-square tests.
        
        Args:
            effect_size: Cohen's w effect size
            df: Degrees of freedom
            n: Sample size
            power: Statistical power
            alpha: Significance level
            
        Returns:
            Dictionary with chi-square power analysis results
        """
        if df is None or df < 1:
            raise ValueError("df must be specified and >= 1")
        
        params_provided = sum([x is not None for x in [effect_size, n, power]])
        if params_provided != 2:
            raise ValueError("Exactly two of effect_size, n, and power must be provided")
        
        if effect_size is not None and n is not None:
            # Calculate power
            lambda_param = n * effect_size**2
            chi2_crit = chi2.ppf(1 - alpha, df)
            power_calc = 1 - stats.ncx2.cdf(chi2_crit, df, lambda_param)
            
            result = {
                'test_type': 'Chi-Square',
                'effect_size': effect_size,
                'df': df,
                'n': n,
                'power': power_calc,
                'alpha': alpha,
                'non_centrality': lambda_param,
                'critical_value': chi2_crit
            }
            
        elif effect_size is not None and power is not None:
            # Calculate sample size
            def power_func(n_try):
                lambda_p = n_try * effect_size**2
                chi2_cr = chi2.ppf(1 - alpha, df)
                pow_calc = 1 - stats.ncx2.cdf(chi2_cr, df, lambda_p)
                return pow_calc - power
            
            n_calc = int(np.ceil(brentq(power_func, 1, 10000)))
            
            result = {
                'test_type': 'Chi-Square',
                'effect_size': effect_size,
                'df': df,
                'n': n_calc,
                'power': power,
                'alpha': alpha
            }
            
        else:  # n and power provided
            # Calculate effect size
            def power_func(w_try):
                lambda_p = n * w_try**2
                chi2_cr = chi2.ppf(1 - alpha, df)
                pow_calc = 1 - stats.ncx2.cdf(chi2_cr, df, lambda_p)
                return pow_calc - power
            
            effect_size_calc = brentq(power_func, 0.01, 2)
            
            result = {
                'test_type': 'Chi-Square',
                'effect_size': effect_size_calc,
                'df': df,
                'n': n,
                'power': power,
                'alpha': alpha
            }
        
        result['interpretation'] = self._interpret_chi_square_power(result)
        self.last_analysis = result
        return result
    
    def proportion_power(self,
                        p1: Optional[float] = None,
                        p2: Optional[float] = None,
                        n: Optional[Union[int, Tuple[int, int]]] = None,
                        power: Optional[float] = None,
                        alpha: float = 0.05,
                        alternative: str = 'two-sided',
                        ratio: float = 1.0) -> Dict[str, Any]:
        """
        Power analysis for comparing two proportions.
        
        Args:
            p1: Proportion in group 1
            p2: Proportion in group 2
            n: Sample size (per group or tuple of (n1, n2))
            power: Statistical power
            alpha: Significance level
            alternative: 'two-sided', 'greater', or 'less'
            ratio: Ratio of sample sizes (n2/n1)
            
        Returns:
            Dictionary with proportion test power analysis results
        """
        if p1 is None or p2 is None:
            raise ValueError("Both p1 and p2 must be specified")
        
        # Calculate effect size (Cohen's h)
        h = 2 * (np.arcsin(np.sqrt(p1)) - np.arcsin(np.sqrt(p2)))
        
        # Handle sample sizes
        if isinstance(n, tuple):
            n1, n2 = n
        elif n is not None:
            n1 = n
            n2 = int(n * ratio)
        
        if alternative == 'two-sided':
            alpha_adj = alpha / 2
        else:
            alpha_adj = alpha
        
        z_alpha = norm.ppf(1 - alpha_adj)
        
        if n is not None:
            # Calculate power
            n_harmonic = (n1 * n2) / (n1 + n2)
            se = 1 / np.sqrt(n_harmonic)
            
            if alternative == 'two-sided':
                power_calc = norm.cdf(-z_alpha + abs(h) / se) + norm.cdf(-z_alpha - abs(h) / se)
            elif alternative == 'greater':
                power_calc = 1 - norm.cdf(z_alpha - h / se)
            else:
                power_calc = norm.cdf(-z_alpha - h / se)
            
            result = {
                'test_type': 'Two Proportions',
                'p1': p1,
                'p2': p2,
                'effect_size_h': h,
                'n1': n1,
                'n2': n2,
                'n_total': n1 + n2,
                'power': power_calc,
                'alpha': alpha,
                'alternative': alternative,
                'ratio': ratio
            }
            
        else:  # Calculate sample size
            z_beta = norm.ppf(power)
            
            if alternative == 'two-sided':
                n1_calc = int(np.ceil(((z_alpha + z_beta) / abs(h))**2 * (1 + ratio) / ratio))
            else:
                n1_calc = int(np.ceil(((z_alpha + z_beta) / h)**2 * (1 + ratio) / ratio))
            
            n2_calc = int(np.ceil(n1_calc * ratio))
            
            result = {
                'test_type': 'Two Proportions',
                'p1': p1,
                'p2': p2,
                'effect_size_h': h,
                'n1': n1_calc,
                'n2': n2_calc,
                'n_total': n1_calc + n2_calc,
                'power': power,
                'alpha': alpha,
                'alternative': alternative,
                'ratio': ratio
            }
        
        result['interpretation'] = self._interpret_proportion_power(result)
        self.last_analysis = result
        return result
    
    def effect_size_converter(self,
                            effect_size: float,
                            from_type: str,
                            to_type: str,
                            **kwargs) -> float:
        """
        Convert between different effect size measures.
        
        Args:
            effect_size: Original effect size value
            from_type: Original effect size type ('d', 'r', 'f', 'eta2', 'omega2', 'h', 'w')
            to_type: Target effect size type
            **kwargs: Additional parameters (e.g., n_groups for f to eta2)
            
        Returns:
            Converted effect size
        """
        conversions = {
            ('d', 'r'): lambda d: d / np.sqrt(d**2 + 4),
            ('r', 'd'): lambda r: 2 * r / np.sqrt(1 - r**2),
            ('d', 'f'): lambda d: d / 2,
            ('f', 'd'): lambda f: 2 * f,
            ('r', 'f'): lambda r: r / np.sqrt(1 - r**2),
            ('f', 'r'): lambda f: f / np.sqrt(1 + f**2),
            ('eta2', 'f'): lambda eta2: np.sqrt(eta2 / (1 - eta2)),
            ('f', 'eta2'): lambda f: f**2 / (1 + f**2),
            ('w', 'phi'): lambda w: w,  # Same for 2x2 tables
            ('h', 'd'): lambda h: h,  # Approximate
        }
        
        key = (from_type, to_type)
        if key in conversions:
            return conversions[key](effect_size)
        else:
            raise ValueError(f"Conversion from {from_type} to {to_type} not implemented")
    
    # Interpretation methods
    
    def _interpret_power_analysis(self, result: Dict[str, Any]) -> str:
        """Interpret t-test power analysis results."""
        test_type = result['test_type']
        
        if 'power' in result and result['power'] < 0.8:
            return f"Power is {result['power']:.2f}, below the conventional threshold of 0.80. " \
                   f"Consider increasing sample size or effect size."
        elif 'n' in result:
            if test_type == 'two-sample':
                return f"Required sample size: {result.get('n1', result['n'])} per group " \
                       f"(total n={result.get('n_total', result['n'] * 2)}) " \
                       f"to achieve power of {result.get('power', 0.8):.2f}"
            else:
                return f"Required sample size: {result['n']} " \
                       f"to achieve power of {result.get('power', 0.8):.2f}"
        elif 'effect_size' in result:
            effect = self._interpret_cohens_d(result['effect_size'])
            return f"Minimum detectable effect size: {result['effect_size']:.3f} ({effect})"
        else:
            return "Power analysis complete"
    
    def _interpret_anova_power(self, result: Dict[str, Any]) -> str:
        """Interpret ANOVA power analysis results."""
        if 'power' in result and result['power'] < 0.8:
            return f"Power is {result['power']:.2f}, below the conventional threshold. " \
                   f"Consider increasing sample size or effect size."
        elif 'n_per_group' in result:
            return f"Required sample size: {result['n_per_group']} per group " \
                   f"(total n={result.get('n_total', 0)}) for {result['n_groups']} groups"
        elif 'effect_size' in result:
            effect = self._interpret_cohens_f(result['effect_size'])
            return f"Minimum detectable effect size: f={result['effect_size']:.3f} ({effect})"
        else:
            return "ANOVA power analysis complete"
    
    def _interpret_correlation_power(self, result: Dict[str, Any]) -> str:
        """Interpret correlation power analysis results."""
        if 'power' in result and result['power'] < 0.8:
            return f"Power is {result['power']:.2f}, below conventional threshold. " \
                   f"Consider increasing sample size."
        elif 'n' in result:
            return f"Required sample size: {result['n']} to detect r={result['correlation']:.2f}"
        elif 'correlation' in result:
            strength = self._interpret_correlation_strength(result['correlation'])
            return f"Minimum detectable correlation: r={result['correlation']:.3f} ({strength})"
        else:
            return "Correlation power analysis complete"
    
    def _interpret_regression_power(self, result: Dict[str, Any]) -> str:
        """Interpret regression power analysis results."""
        if 'power' in result and result['power'] < 0.8:
            return f"Power is {result['power']:.2f}. Consider increasing sample size."
        elif 'n' in result:
            return f"Required sample size: {result['n']} for {result['n_predictors']} predictors"
        elif 'r_squared' in result:
            return f"Minimum detectable R²: {result['r_squared']:.3f}"
        else:
            return "Regression power analysis complete"
    
    def _interpret_chi_square_power(self, result: Dict[str, Any]) -> str:
        """Interpret chi-square power analysis results."""
        if 'power' in result and result['power'] < 0.8:
            return f"Power is {result['power']:.2f}. Consider increasing sample size."
        elif 'n' in result:
            return f"Required sample size: {result['n']} for df={result['df']}"
        elif 'effect_size' in result:
            effect = self._interpret_cohens_w(result['effect_size'])
            return f"Minimum detectable effect: w={result['effect_size']:.3f} ({effect})"
        else:
            return "Chi-square power analysis complete"
    
    def _interpret_proportion_power(self, result: Dict[str, Any]) -> str:
        """Interpret proportion test power analysis results."""
        diff = abs(result['p1'] - result['p2'])
        if 'power' in result and result['power'] < 0.8:
            return f"Power is {result['power']:.2f} to detect difference of {diff:.2f}"
        elif 'n1' in result:
            return f"Required sample size: {result['n1']} and {result['n2']} " \
                   f"(total n={result['n_total']}) to detect difference of {diff:.2f}"
        else:
            return "Proportion test power analysis complete"
    
    def _interpret_cohens_d(self, d: float) -> str:
        """Interpret Cohen's d effect size."""
        if abs(d) < 0.2:
            return "negligible"
        elif abs(d) < 0.5:
            return "small"
        elif abs(d) < 0.8:
            return "medium"
        else:
            return "large"
    
    def _interpret_cohens_f(self, f: float) -> str:
        """Interpret Cohen's f effect size."""
        if f < 0.1:
            return "small"
        elif f < 0.25:
            return "medium"
        else:
            return "large"
    
    def _interpret_cohens_w(self, w: float) -> str:
        """Interpret Cohen's w effect size."""
        if w < 0.1:
            return "small"
        elif w < 0.3:
            return "medium"
        else:
            return "large"
    
    def _interpret_correlation_strength(self, r: float) -> str:
        """Interpret correlation strength."""
        r_abs = abs(r)
        if r_abs < 0.1:
            return "negligible"
        elif r_abs < 0.3:
            return "weak"
        elif r_abs < 0.5:
            return "moderate"
        elif r_abs < 0.7:
            return "strong"
        else:
            return "very strong"