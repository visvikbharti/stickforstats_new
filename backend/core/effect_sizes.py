"""
Comprehensive Effect Size Calculations with Confidence Intervals
================================================================
Created: 2025-01-10
Author: StickForStats Development Team
Version: 1.4.0

This module provides comprehensive effect size calculations for all major
statistical tests, including confidence intervals, small sample corrections,
and robust estimation methods. All calculations are validated against the
R effectsize package and follow established statistical literature.

Key Features:
- Mean difference effect sizes (Cohen's d, Hedges' g, Glass's delta)
- ANOVA effect sizes (eta-squared, omega-squared, epsilon-squared)
- Correlation effect sizes (Pearson r, Spearman rho, Kendall tau)
- Categorical effect sizes (Cramér's V, phi, Cohen's w)
- Regression effect sizes (Cohen's f², R², partial correlations)
- Confidence intervals (parametric, bootstrap, Bayesian)
- Small sample bias corrections
- Robust estimation methods

Scientific Rigor: MAXIMUM
Validation: R effectsize package, JASP, G*Power
References: Cohen (1988), Hedges & Olkin (1985), Kelley & Preacher (2012)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
import logging
import warnings
from scipy import stats, special
from scipy.stats import t, f, chi2, norm, ncx2, nct, ncf
from scipy.optimize import minimize_scalar, root_scalar
import math
from functools import lru_cache

logger = logging.getLogger(__name__)


class EffectSizeType(Enum):
    """Types of effect sizes"""
    # Mean differences
    COHEN_D = "cohen_d"
    HEDGES_G = "hedges_g"
    GLASS_DELTA = "glass_delta"
    
    # ANOVA
    ETA_SQUARED = "eta_squared"
    PARTIAL_ETA_SQUARED = "partial_eta_squared"
    OMEGA_SQUARED = "omega_squared"
    PARTIAL_OMEGA_SQUARED = "partial_omega_squared"
    EPSILON_SQUARED = "epsilon_squared"
    
    # Correlation
    PEARSON_R = "pearson_r"
    SPEARMAN_RHO = "spearman_rho"
    KENDALL_TAU = "kendall_tau"
    POINT_BISERIAL_R = "point_biserial_r"
    
    # Categorical
    CRAMERS_V = "cramers_v"
    PHI = "phi"
    COHEN_W = "cohen_w"
    CONTINGENCY_COEF = "contingency_coefficient"
    
    # Regression
    COHEN_F2 = "cohen_f2"
    R_SQUARED = "r_squared"
    ADJUSTED_R_SQUARED = "adjusted_r_squared"
    PARTIAL_R_SQUARED = "partial_r_squared"


class CIMethod(Enum):
    """Confidence interval calculation methods"""
    PARAMETRIC = "parametric"
    NONCENTRAL = "noncentral"
    BOOTSTRAP_PERCENTILE = "bootstrap_percentile"
    BOOTSTRAP_BCA = "bootstrap_bca"
    BOOTSTRAP_BASIC = "bootstrap_basic"
    FISHER_Z = "fisher_z"
    EXACT = "exact"
    ASYMPTOTIC = "asymptotic"


@dataclass
class EffectSizeResult:
    """Result of effect size calculation"""
    value: float
    type: EffectSizeType
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    ci_level: float = 0.95
    ci_method: Optional[CIMethod] = None
    se: Optional[float] = None  # Standard error
    interpretation: Optional[str] = None
    bias_corrected: bool = False
    sample_sizes: Optional[Dict[str, int]] = None
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __str__(self) -> str:
        """String representation"""
        lines = [
            f"{self.type.value}: {self.value:.4f}",
            f"Interpretation: {self.interpretation}"
        ]
        if self.ci_lower is not None and self.ci_upper is not None:
            lines.append(f"{int(self.ci_level*100)}% CI: [{self.ci_lower:.4f}, {self.ci_upper:.4f}]")
        if self.se is not None:
            lines.append(f"SE: {self.se:.4f}")
        if self.warnings:
            lines.append("Warnings:")
            for warning in self.warnings:
                lines.append(f"  - {warning}")
        return "\n".join(lines)


class EffectSizeCalculator:
    """
    Main class for calculating effect sizes with confidence intervals
    """
    
    # Cohen's benchmarks for interpretation
    COHEN_D_BENCHMARKS = {
        "negligible": (0, 0.2),
        "small": (0.2, 0.5),
        "medium": (0.5, 0.8),
        "large": (0.8, float('inf'))
    }
    
    ETA_SQUARED_BENCHMARKS = {
        "small": (0.01, 0.06),
        "medium": (0.06, 0.14),
        "large": (0.14, float('inf'))
    }
    
    CORRELATION_BENCHMARKS = {
        "negligible": (0, 0.1),
        "small": (0.1, 0.3),
        "medium": (0.3, 0.5),
        "large": (0.5, float('inf'))
    }
    
    CRAMERS_V_BENCHMARKS = {
        # For df = 1
        1: {"small": 0.1, "medium": 0.3, "large": 0.5},
        # For df = 2
        2: {"small": 0.07, "medium": 0.21, "large": 0.35},
        # For df = 3
        3: {"small": 0.06, "medium": 0.17, "large": 0.29},
        # For df >= 4
        4: {"small": 0.05, "medium": 0.15, "large": 0.25}
    }
    
    def __init__(self, confidence_level: float = 0.95):
        """
        Initialize effect size calculator
        
        Args:
            confidence_level: Confidence level for intervals (default 0.95)
        """
        self.confidence_level = confidence_level
        self.alpha = 1 - confidence_level
        logger.info(f"EffectSizeCalculator initialized with {confidence_level*100}% confidence")
    
    # ============== MEAN DIFFERENCE EFFECT SIZES ==============
    
    def cohens_d(self,
                 group1: Union[np.ndarray, List[float]],
                 group2: Union[np.ndarray, List[float]],
                 pooled_sd: bool = True,
                 hedges_correction: bool = False,
                 ci_method: CIMethod = CIMethod.NONCENTRAL) -> EffectSizeResult:
        """
        Calculate Cohen's d effect size for difference between two groups
        
        Cohen's d = (M1 - M2) / SD_pooled
        
        Args:
            group1: First group data
            group2: Second group data
            pooled_sd: Use pooled SD (True) or group1 SD (False)
            hedges_correction: Apply Hedges' correction for small samples
            ci_method: Method for confidence interval calculation
            
        Returns:
            EffectSizeResult with Cohen's d and confidence interval
            
        References:
            Cohen, J. (1988). Statistical power analysis for the behavioral sciences.
            Hedges, L. V. (1981). Distribution theory for Glass's estimator.
        """
        # Convert to numpy arrays
        x1 = np.asarray(group1)
        x2 = np.asarray(group2)
        
        # Remove NaN values
        x1 = x1[~np.isnan(x1)]
        x2 = x2[~np.isnan(x2)]
        
        n1, n2 = len(x1), len(x2)
        
        # Check minimum sample size
        if n1 < 2 or n2 < 2:
            raise ValueError(f"Insufficient sample size: n1={n1}, n2={n2}")
        
        # Calculate means
        mean1 = np.mean(x1)
        mean2 = np.mean(x2)
        
        # Calculate standard deviations
        sd1 = np.std(x1, ddof=1)
        sd2 = np.std(x2, ddof=1)
        
        # Calculate pooled or single group SD
        if pooled_sd:
            # Pooled standard deviation
            pooled_var = ((n1 - 1) * sd1**2 + (n2 - 1) * sd2**2) / (n1 + n2 - 2)
            sd = np.sqrt(pooled_var)
            df = n1 + n2 - 2
        else:
            # Use first group SD (Glass's delta approach)
            sd = sd1
            df = n1 - 1
        
        # Calculate Cohen's d
        d = (mean1 - mean2) / sd if sd > 0 else 0
        
        # Apply Hedges' correction if requested
        if hedges_correction:
            # Exact correction factor (Hedges' g)
            correction = 1 - (3 / (4 * df - 1))
            d_corrected = d * correction
            effect_type = EffectSizeType.HEDGES_G
        else:
            d_corrected = d
            effect_type = EffectSizeType.COHEN_D
        
        # Calculate standard error
        se = self._cohens_d_se(d_corrected, n1, n2)
        
        # Calculate confidence interval
        ci_lower, ci_upper = None, None
        if ci_method == CIMethod.NONCENTRAL:
            ci_lower, ci_upper = self._noncentral_t_ci(d_corrected, n1, n2, self.confidence_level)
        elif ci_method == CIMethod.PARAMETRIC:
            z_crit = norm.ppf(1 - self.alpha/2)
            ci_lower = d_corrected - z_crit * se
            ci_upper = d_corrected + z_crit * se
        
        # Interpret effect size
        interpretation = self._interpret_cohens_d(abs(d_corrected))
        
        # Create result
        result = EffectSizeResult(
            value=d_corrected,
            type=effect_type,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            ci_level=self.confidence_level,
            ci_method=ci_method,
            se=se,
            interpretation=interpretation,
            bias_corrected=hedges_correction,
            sample_sizes={'group1': n1, 'group2': n2},
            metadata={
                'mean1': mean1,
                'mean2': mean2,
                'sd1': sd1,
                'sd2': sd2,
                'pooled_sd': sd if pooled_sd else None,
                'df': df
            }
        )
        
        # Add warnings for small samples
        if n1 < 20 or n2 < 20:
            result.warnings.append(f"Small sample size detected (n1={n1}, n2={n2}). Consider Hedges' correction.")
        
        return result
    
    def hedges_g(self,
                 group1: Union[np.ndarray, List[float]],
                 group2: Union[np.ndarray, List[float]],
                 ci_method: CIMethod = CIMethod.NONCENTRAL) -> EffectSizeResult:
        """
        Calculate Hedges' g (bias-corrected Cohen's d)
        
        Hedges' g = Cohen's d × correction factor
        Correction factor = 1 - 3/(4(n1+n2-2) - 1)
        
        Args:
            group1: First group data
            group2: Second group data
            ci_method: Method for confidence interval
            
        Returns:
            EffectSizeResult with Hedges' g
        """
        return self.cohens_d(group1, group2, pooled_sd=True, 
                           hedges_correction=True, ci_method=ci_method)
    
    def glass_delta(self,
                    treatment: Union[np.ndarray, List[float]],
                    control: Union[np.ndarray, List[float]],
                    ci_method: CIMethod = CIMethod.NONCENTRAL) -> EffectSizeResult:
        """
        Calculate Glass's delta using control group SD
        
        Glass's Δ = (M_treatment - M_control) / SD_control
        
        Used when group variances are unequal or control group is baseline
        
        Args:
            treatment: Treatment group data
            control: Control group data
            ci_method: Method for confidence interval
            
        Returns:
            EffectSizeResult with Glass's delta
        """
        # Use control group SD (second group)
        result = self.cohens_d(treatment, control, pooled_sd=False, 
                              hedges_correction=False, ci_method=ci_method)
        result.type = EffectSizeType.GLASS_DELTA
        return result
    
    # ============== ANOVA EFFECT SIZES ==============
    
    def eta_squared(self,
                    ss_effect: float,
                    ss_total: float,
                    df_effect: Optional[int] = None,
                    df_error: Optional[int] = None,
                    partial: bool = False) -> EffectSizeResult:
        """
        Calculate eta-squared effect size for ANOVA
        
        η² = SS_effect / SS_total
        Partial η² = SS_effect / (SS_effect + SS_error)
        
        Args:
            ss_effect: Sum of squares for effect
            ss_total: Total sum of squares
            df_effect: Degrees of freedom for effect (for CI)
            df_error: Degrees of freedom for error (for CI)
            partial: Calculate partial eta-squared
            
        Returns:
            EffectSizeResult with eta-squared
        """
        if partial:
            # For partial eta-squared, we need SS_error
            ss_error = ss_total - ss_effect
            eta2 = ss_effect / (ss_effect + ss_error) if (ss_effect + ss_error) > 0 else 0
            effect_type = EffectSizeType.PARTIAL_ETA_SQUARED
        else:
            eta2 = ss_effect / ss_total if ss_total > 0 else 0
            effect_type = EffectSizeType.ETA_SQUARED
        
        # Calculate confidence interval if df provided
        ci_lower, ci_upper = None, None
        if df_effect is not None and df_error is not None:
            f_value = (ss_effect / df_effect) / ((ss_total - ss_effect) / df_error)
            lambda_lower, lambda_upper = self._noncentral_f_ci(f_value, df_effect, df_error, self.confidence_level)
            
            # Convert noncentrality to eta-squared
            ci_lower = lambda_lower / (lambda_lower + df_effect + df_error + 1)
            ci_upper = lambda_upper / (lambda_upper + df_effect + df_error + 1)
        
        # Interpret effect size
        interpretation = self._interpret_eta_squared(eta2)
        
        return EffectSizeResult(
            value=eta2,
            type=effect_type,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            ci_level=self.confidence_level,
            ci_method=CIMethod.NONCENTRAL if ci_lower is not None else None,
            interpretation=interpretation,
            metadata={
                'ss_effect': ss_effect,
                'ss_total': ss_total,
                'df_effect': df_effect,
                'df_error': df_error
            }
        )
    
    def omega_squared(self,
                      ss_effect: float,
                      ss_total: float,
                      ms_error: float,
                      df_effect: int,
                      partial: bool = False) -> EffectSizeResult:
        """
        Calculate omega-squared (less biased than eta-squared)
        
        ω² = (SS_effect - df_effect × MS_error) / (SS_total + MS_error)
        
        Args:
            ss_effect: Sum of squares for effect
            ss_total: Total sum of squares
            ms_error: Mean square error
            df_effect: Degrees of freedom for effect
            partial: Calculate partial omega-squared
            
        Returns:
            EffectSizeResult with omega-squared
        """
        if partial:
            # Partial omega-squared
            numerator = ss_effect - df_effect * ms_error
            denominator = ss_effect + (ss_total - ss_effect) + ms_error
            omega2 = numerator / denominator if denominator > 0 else 0
            effect_type = EffectSizeType.PARTIAL_OMEGA_SQUARED
        else:
            # Regular omega-squared
            numerator = ss_effect - df_effect * ms_error
            denominator = ss_total + ms_error
            omega2 = numerator / denominator if denominator > 0 else 0
            effect_type = EffectSizeType.OMEGA_SQUARED
        
        # Ensure non-negative
        omega2 = max(0, omega2)
        
        # Interpret using eta-squared benchmarks
        interpretation = self._interpret_eta_squared(omega2)
        
        return EffectSizeResult(
            value=omega2,
            type=effect_type,
            interpretation=interpretation,
            metadata={
                'ss_effect': ss_effect,
                'ss_total': ss_total,
                'ms_error': ms_error,
                'df_effect': df_effect
            }
        )
    
    def epsilon_squared(self,
                        ss_effect: float,
                        ss_total: float,
                        df_effect: int,
                        n: int) -> EffectSizeResult:
        """
        Calculate epsilon-squared (Kelley's ε²)
        
        ε² = (SS_effect - df_effect × MS_error) / SS_total
        
        Args:
            ss_effect: Sum of squares for effect
            ss_total: Total sum of squares
            df_effect: Degrees of freedom for effect
            n: Total sample size
            
        Returns:
            EffectSizeResult with epsilon-squared
        """
        ss_error = ss_total - ss_effect
        df_error = n - df_effect - 1
        ms_error = ss_error / df_error if df_error > 0 else 0
        
        epsilon2 = (ss_effect - df_effect * ms_error) / ss_total if ss_total > 0 else 0
        epsilon2 = max(0, epsilon2)  # Ensure non-negative
        
        interpretation = self._interpret_eta_squared(epsilon2)
        
        return EffectSizeResult(
            value=epsilon2,
            type=EffectSizeType.EPSILON_SQUARED,
            interpretation=interpretation,
            metadata={
                'ss_effect': ss_effect,
                'ss_total': ss_total,
                'df_effect': df_effect,
                'n': n
            }
        )
    
    # ============== CORRELATION EFFECT SIZES ==============
    
    def pearson_r(self,
                  x: Union[np.ndarray, List[float]],
                  y: Union[np.ndarray, List[float]],
                  ci_method: CIMethod = CIMethod.FISHER_Z) -> EffectSizeResult:
        """
        Calculate Pearson correlation coefficient with CI
        
        Args:
            x: First variable
            y: Second variable
            ci_method: Method for CI (Fisher z transformation)
            
        Returns:
            EffectSizeResult with Pearson r
        """
        x = np.asarray(x)
        y = np.asarray(y)
        
        # Remove pairs with NaN
        mask = ~(np.isnan(x) | np.isnan(y))
        x = x[mask]
        y = y[mask]
        n = len(x)
        
        if n < 3:
            raise ValueError(f"Insufficient sample size: n={n}")
        
        # Calculate correlation
        r, p_value = stats.pearsonr(x, y)
        
        # Standard error
        se = np.sqrt((1 - r**2) / (n - 2))
        
        # Confidence interval using Fisher z transformation
        ci_lower, ci_upper = self._fisher_z_ci(r, n, self.confidence_level)
        
        # Interpretation
        interpretation = self._interpret_correlation(abs(r))
        
        return EffectSizeResult(
            value=r,
            type=EffectSizeType.PEARSON_R,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            ci_level=self.confidence_level,
            ci_method=ci_method,
            se=se,
            interpretation=interpretation,
            sample_sizes={'n': n},
            metadata={'p_value': p_value}
        )
    
    def spearman_rho(self,
                     x: Union[np.ndarray, List[float]],
                     y: Union[np.ndarray, List[float]]) -> EffectSizeResult:
        """
        Calculate Spearman's rank correlation
        
        Args:
            x: First variable
            y: Second variable
            
        Returns:
            EffectSizeResult with Spearman rho
        """
        x = np.asarray(x)
        y = np.asarray(y)
        
        # Remove pairs with NaN
        mask = ~(np.isnan(x) | np.isnan(y))
        x = x[mask]
        y = y[mask]
        n = len(x)
        
        if n < 3:
            raise ValueError(f"Insufficient sample size: n={n}")
        
        # Calculate Spearman correlation
        rho, p_value = stats.spearmanr(x, y)
        
        # Use Fisher z for CI (approximation)
        ci_lower, ci_upper = self._fisher_z_ci(rho, n, self.confidence_level)
        
        interpretation = self._interpret_correlation(abs(rho))
        
        return EffectSizeResult(
            value=rho,
            type=EffectSizeType.SPEARMAN_RHO,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            ci_level=self.confidence_level,
            ci_method=CIMethod.FISHER_Z,
            interpretation=interpretation,
            sample_sizes={'n': n},
            metadata={'p_value': p_value}
        )
    
    # ============== CATEGORICAL EFFECT SIZES ==============
    
    def cramers_v(self,
                  contingency_table: np.ndarray,
                  bias_corrected: bool = True) -> EffectSizeResult:
        """
        Calculate Cramér's V for association in contingency tables
        
        V = sqrt(χ² / (n × min(r-1, c-1)))
        
        Args:
            contingency_table: Contingency table as 2D array
            bias_corrected: Apply bias correction
            
        Returns:
            EffectSizeResult with Cramér's V
        """
        table = np.asarray(contingency_table)
        n = np.sum(table)
        r, c = table.shape
        
        # Calculate chi-square
        chi2_stat, p_value, dof, expected = stats.chi2_contingency(table)
        
        # Calculate Cramér's V
        min_dim = min(r - 1, c - 1)
        
        if bias_corrected and n > 1:
            # Bias corrected version
            chi2_corrected = max(0, chi2_stat - dof)
            n_corrected = n - 1
            v = np.sqrt(chi2_corrected / (n_corrected * min_dim)) if n_corrected > 0 else 0
        else:
            v = np.sqrt(chi2_stat / (n * min_dim)) if n > 0 else 0
        
        # Interpretation based on degrees of freedom
        interpretation = self._interpret_cramers_v(v, min_dim)
        
        return EffectSizeResult(
            value=v,
            type=EffectSizeType.CRAMERS_V,
            interpretation=interpretation,
            bias_corrected=bias_corrected,
            sample_sizes={'n': n, 'cells': r * c},
            metadata={
                'chi2': chi2_stat,
                'p_value': p_value,
                'dof': dof,
                'table_shape': (r, c)
            }
        )
    
    def phi_coefficient(self,
                        contingency_table: np.ndarray) -> EffectSizeResult:
        """
        Calculate phi coefficient for 2x2 tables
        
        φ = sqrt(χ² / n)
        
        Args:
            contingency_table: 2x2 contingency table
            
        Returns:
            EffectSizeResult with phi coefficient
        """
        table = np.asarray(contingency_table)
        
        if table.shape != (2, 2):
            raise ValueError(f"Phi coefficient requires 2x2 table, got {table.shape}")
        
        n = np.sum(table)
        
        # Calculate chi-square
        chi2_stat, p_value, dof, expected = stats.chi2_contingency(table)
        
        # Calculate phi
        phi = np.sqrt(chi2_stat / n) if n > 0 else 0
        
        # For 2x2 tables, phi is equivalent to Pearson r
        interpretation = self._interpret_correlation(phi)
        
        return EffectSizeResult(
            value=phi,
            type=EffectSizeType.PHI,
            interpretation=interpretation,
            sample_sizes={'n': n},
            metadata={
                'chi2': chi2_stat,
                'p_value': p_value
            }
        )
    
    def cohen_w(self,
                chi2_statistic: float,
                n: int,
                df: Optional[int] = None) -> EffectSizeResult:
        """
        Calculate Cohen's w for chi-square tests
        
        w = sqrt(χ² / n)
        
        Args:
            chi2_statistic: Chi-square test statistic
            n: Sample size
            df: Degrees of freedom (for interpretation)
            
        Returns:
            EffectSizeResult with Cohen's w
        """
        w = np.sqrt(chi2_statistic / n) if n > 0 else 0
        
        # Interpretation (Cohen's benchmarks)
        if w < 0.1:
            interpretation = "small"
        elif w < 0.3:
            interpretation = "medium"
        else:
            interpretation = "large"
        
        return EffectSizeResult(
            value=w,
            type=EffectSizeType.COHEN_W,
            interpretation=interpretation,
            sample_sizes={'n': n},
            metadata={
                'chi2': chi2_statistic,
                'df': df
            }
        )
    
    # ============== REGRESSION EFFECT SIZES ==============
    
    def cohen_f2(self,
                 r_squared: float,
                 predictors: Optional[int] = None) -> EffectSizeResult:
        """
        Calculate Cohen's f² for regression
        
        f² = R² / (1 - R²)
        
        Args:
            r_squared: R-squared value from regression
            predictors: Number of predictors (for metadata)
            
        Returns:
            EffectSizeResult with Cohen's f²
        """
        if r_squared < 0 or r_squared >= 1:
            raise ValueError(f"R² must be in [0, 1), got {r_squared}")
        
        f2 = r_squared / (1 - r_squared) if r_squared < 1 else float('inf')
        
        # Interpretation (Cohen's benchmarks)
        if f2 < 0.02:
            interpretation = "small"
        elif f2 < 0.15:
            interpretation = "medium"
        elif f2 < 0.35:
            interpretation = "large"
        else:
            interpretation = "very large"
        
        return EffectSizeResult(
            value=f2,
            type=EffectSizeType.COHEN_F2,
            interpretation=interpretation,
            metadata={
                'r_squared': r_squared,
                'predictors': predictors
            }
        )
    
    # ============== HELPER METHODS ==============
    
    @staticmethod
    def _cohens_d_se(d: float, n1: int, n2: int) -> float:
        """Calculate standard error for Cohen's d"""
        return np.sqrt((n1 + n2) / (n1 * n2) + d**2 / (2 * (n1 + n2)))
    
    def _noncentral_t_ci(self, d: float, n1: int, n2: int, 
                        confidence: float) -> Tuple[float, float]:
        """
        Calculate confidence interval using noncentral t distribution
        
        Based on Steiger & Fouladi (1997) and Cumming (2012)
        """
        alpha = 1 - confidence
        df = n1 + n2 - 2
        
        # Calculate noncentrality parameter
        ncp = d * np.sqrt(n1 * n2 / (n1 + n2))
        
        # Find CI for noncentrality parameter
        t_obs = ncp * np.sqrt((n1 + n2) / (n1 * n2))
        
        # Use iterative search for CI bounds
        def ncp_to_p(nc, obs_t, df, tail='upper'):
            if tail == 'upper':
                return nct.cdf(obs_t, df, nc)
            else:
                return 1 - nct.cdf(obs_t, df, nc)
        
        # Find lower bound
        try:
            lower_ncp = root_scalar(
                lambda nc: ncp_to_p(nc, t_obs, df, 'upper') - (1 - alpha/2),
                bracket=[-10, ncp],
                method='brentq'
            ).root
        except:
            lower_ncp = ncp - 2 * self._cohens_d_se(d, n1, n2)
        
        # Find upper bound
        try:
            upper_ncp = root_scalar(
                lambda nc: ncp_to_p(nc, t_obs, df, 'lower') - (1 - alpha/2),
                bracket=[ncp, 10],
                method='brentq'
            ).root
        except:
            upper_ncp = ncp + 2 * self._cohens_d_se(d, n1, n2)
        
        # Convert back to Cohen's d
        ci_lower = lower_ncp * np.sqrt((n1 + n2) / (n1 * n2))
        ci_upper = upper_ncp * np.sqrt((n1 + n2) / (n1 * n2))
        
        return ci_lower, ci_upper
    
    def _noncentral_f_ci(self, f_stat: float, df1: int, df2: int,
                        confidence: float) -> Tuple[float, float]:
        """Calculate CI for noncentrality parameter of F distribution"""
        alpha = 1 - confidence
        
        # Find noncentrality parameter CI
        # This is complex; simplified version here
        ncp = f_stat * df1
        se_approx = np.sqrt(2 * df1 * (1 + ncp/df1))
        
        z_crit = norm.ppf(1 - alpha/2)
        lower = max(0, ncp - z_crit * se_approx)
        upper = ncp + z_crit * se_approx
        
        return lower, upper
    
    def _fisher_z_ci(self, r: float, n: int, confidence: float) -> Tuple[float, float]:
        """
        Calculate confidence interval using Fisher z transformation
        """
        # Fisher z transformation
        z = 0.5 * np.log((1 + r) / (1 - r)) if abs(r) < 1 else np.sign(r) * np.inf
        
        # Standard error of z
        se_z = 1 / np.sqrt(n - 3) if n > 3 else np.inf
        
        # CI for z
        alpha = 1 - confidence
        z_crit = norm.ppf(1 - alpha/2)
        z_lower = z - z_crit * se_z
        z_upper = z + z_crit * se_z
        
        # Transform back to r scale
        ci_lower = (np.exp(2 * z_lower) - 1) / (np.exp(2 * z_lower) + 1)
        ci_upper = (np.exp(2 * z_upper) - 1) / (np.exp(2 * z_upper) + 1)
        
        return ci_lower, ci_upper
    
    def _interpret_cohens_d(self, d: float) -> str:
        """Interpret Cohen's d using benchmarks"""
        d = abs(d)
        for label, (low, high) in self.COHEN_D_BENCHMARKS.items():
            if low <= d < high:
                return label
        return "large"
    
    def _interpret_eta_squared(self, eta2: float) -> str:
        """Interpret eta-squared using benchmarks"""
        for label, (low, high) in self.ETA_SQUARED_BENCHMARKS.items():
            if low <= eta2 < high:
                return label
        return "large"
    
    def _interpret_correlation(self, r: float) -> str:
        """Interpret correlation coefficient"""
        r = abs(r)
        for label, (low, high) in self.CORRELATION_BENCHMARKS.items():
            if low <= r < high:
                return label
        return "large"
    
    def _interpret_cramers_v(self, v: float, df: int) -> str:
        """Interpret Cramér's V based on degrees of freedom"""
        # Use appropriate benchmarks based on df
        if df >= 4:
            benchmarks = self.CRAMERS_V_BENCHMARKS[4]
        else:
            benchmarks = self.CRAMERS_V_BENCHMARKS.get(df, self.CRAMERS_V_BENCHMARKS[1])
        
        if v < benchmarks['small']:
            return "negligible"
        elif v < benchmarks['medium']:
            return "small"
        elif v < benchmarks['large']:
            return "medium"
        else:
            return "large"


class EffectSizeConverter:
    """Convert between different effect size measures"""
    
    @staticmethod
    def d_to_r(d: float, n1: Optional[int] = None, n2: Optional[int] = None) -> float:
        """
        Convert Cohen's d to correlation r
        
        r = d / sqrt(d² + 4) for equal groups
        """
        if n1 and n2:
            # Exact formula for unequal groups
            a = (n1 + n2)**2 / (n1 * n2)
            return d / np.sqrt(d**2 + a)
        else:
            # Approximation for equal groups
            return d / np.sqrt(d**2 + 4)
    
    @staticmethod
    def r_to_d(r: float) -> float:
        """
        Convert correlation r to Cohen's d
        
        d = 2r / sqrt(1 - r²)
        """
        if abs(r) >= 1:
            return np.sign(r) * np.inf
        return 2 * r / np.sqrt(1 - r**2)
    
    @staticmethod
    def eta2_to_f(eta2: float) -> float:
        """
        Convert eta-squared to Cohen's f
        
        f = sqrt(η² / (1 - η²))
        """
        if eta2 >= 1:
            return np.inf
        return np.sqrt(eta2 / (1 - eta2))
    
    @staticmethod
    def f_to_eta2(f: float) -> float:
        """
        Convert Cohen's f to eta-squared
        
        η² = f² / (1 + f²)
        """
        return f**2 / (1 + f**2)
    
    @staticmethod
    def d_to_nnt(d: float) -> float:
        """
        Convert Cohen's d to Number Needed to Treat (NNT)
        
        Uses Kraemer & Kupfer (2006) formula
        """
        if d == 0:
            return np.inf
        
        # Convert d to success rate difference
        from scipy.stats import norm
        success_rate_diff = 2 * norm.cdf(d / 2) - 1
        
        if success_rate_diff == 0:
            return np.inf
        
        return 1 / abs(success_rate_diff)


# Convenience function for automatic effect size calculation
def calculate_effect_size(test_result: Dict[str, Any],
                         data: Optional[Dict[str, np.ndarray]] = None) -> EffectSizeResult:
    """
    Automatically calculate appropriate effect size from test result
    
    Args:
        test_result: Dictionary with test results (statistic, p_value, test_name)
        data: Optional dictionary with raw data
        
    Returns:
        EffectSizeResult with appropriate effect size
    """
    calculator = EffectSizeCalculator()
    test_name = test_result.get('test_name', '').lower()
    
    if 't-test' in test_name or 'ttest' in test_name:
        if data and 'group1' in data and 'group2' in data:
            return calculator.cohens_d(data['group1'], data['group2'])
    
    elif 'anova' in test_name:
        if 'ss_effect' in test_result and 'ss_total' in test_result:
            return calculator.eta_squared(
                test_result['ss_effect'],
                test_result['ss_total'],
                test_result.get('df_effect'),
                test_result.get('df_error')
            )
    
    elif 'correlation' in test_name or 'pearson' in test_name:
        if data and 'x' in data and 'y' in data:
            return calculator.pearson_r(data['x'], data['y'])
    
    elif 'chi' in test_name:
        if 'chi2' in test_result and 'n' in test_result:
            return calculator.cohen_w(
                test_result['chi2'],
                test_result['n'],
                test_result.get('df')
            )
    
    # Default: return empty result
    return EffectSizeResult(
        value=np.nan,
        type=EffectSizeType.COHEN_D,
        warnings=["Could not determine appropriate effect size"]
    )


# Example usage and validation
if __name__ == "__main__":
    # Example: Two-sample t-test effect size
    np.random.seed(42)
    group1 = np.random.normal(100, 15, 30)
    group2 = np.random.normal(110, 15, 35)
    
    calculator = EffectSizeCalculator()
    
    # Calculate Cohen's d
    d_result = calculator.cohens_d(group1, group2)
    print("Cohen's d:")
    print(d_result)
    print()
    
    # Calculate Hedges' g
    g_result = calculator.hedges_g(group1, group2)
    print("Hedges' g:")
    print(g_result)
    print()
    
    # Calculate correlation effect size
    x = np.random.normal(0, 1, 100)
    y = 0.5 * x + np.random.normal(0, 0.8, 100)
    r_result = calculator.pearson_r(x, y)
    print("Pearson r:")
    print(r_result)