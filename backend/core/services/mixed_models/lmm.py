"""
Linear Mixed Models (LMM) Module
================================

Provides functionality for fitting Linear Mixed Models using statsmodels,
with additional features for interpretation and Guardian integration.

Model Specification:
    y = Xβ + Zb + ε

Where:
    - y: Outcome variable
    - X: Fixed effects design matrix
    - β: Fixed effects coefficients
    - Z: Random effects design matrix
    - b: Random effects (b ~ N(0, G))
    - ε: Residual error (ε ~ N(0, R))

Covariance Structures:
    - Independence: Diagonal variance matrix
    - Compound Symmetry: Uniform correlation
    - Unstructured: Full covariance matrix
    - AR(1): First-order autoregressive

References:
    Bates, D., et al. (2015). Fitting Linear Mixed-Effects Models Using lme4.
    Pinheiro, J. C., & Bates, D. M. (2000). Mixed-Effects Models in S and S-PLUS.

Created: December 26, 2025
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Union, Tuple
import numpy as np
import pandas as pd
from scipy import stats
import warnings

try:
    from statsmodels.regression.mixed_linear_model import MixedLM
    from statsmodels.regression.mixed_linear_model import MixedLMResults
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False
    warnings.warn("statsmodels not available. Mixed models functionality limited.")


# Covariance structure options
COVARIANCE_STRUCTURES = {
    'independence': {
        'name': 'Independence',
        'description': 'Observations within groups are independent',
        'parameters': 1
    },
    'exchangeable': {
        'name': 'Exchangeable (Compound Symmetry)',
        'description': 'Uniform correlation within groups',
        'parameters': 2
    },
    'ar1': {
        'name': 'AR(1)',
        'description': 'First-order autoregressive',
        'parameters': 2
    },
    'unstructured': {
        'name': 'Unstructured',
        'description': 'Free covariance matrix',
        'parameters': 'varies'
    }
}


@dataclass
class RandomEffect:
    """Specification for a random effect."""
    grouping_var: str
    type: str = 'intercept'  # 'intercept', 'slope', or 'both'
    slope_var: Optional[str] = None  # Variable for random slope
    correlated: bool = True  # Correlate random intercept and slope

    def to_dict(self) -> Dict[str, Any]:
        return {
            'grouping_var': self.grouping_var,
            'type': self.type,
            'slope_var': self.slope_var,
            'correlated': self.correlated
        }


@dataclass
class LMMSpecification:
    """Full specification for a Linear Mixed Model."""
    outcome_var: str
    fixed_effects: List[str]
    random_effects: List[RandomEffect]
    data: pd.DataFrame = None

    # Optional specifications
    weights: Optional[str] = None
    subset: Optional[str] = None

    def validate(self) -> List[str]:
        """Validate the specification."""
        errors = []

        if self.data is None:
            errors.append("Data not provided")
            return errors

        if self.outcome_var not in self.data.columns:
            errors.append(f"Outcome variable '{self.outcome_var}' not in data")

        for var in self.fixed_effects:
            if var not in self.data.columns:
                errors.append(f"Fixed effect '{var}' not in data")

        for re in self.random_effects:
            if re.grouping_var not in self.data.columns:
                errors.append(f"Grouping variable '{re.grouping_var}' not in data")
            if re.slope_var and re.slope_var not in self.data.columns:
                errors.append(f"Slope variable '{re.slope_var}' not in data")

        return errors


@dataclass
class LMMResult:
    """Result of fitting a Linear Mixed Model."""
    # Model fit
    converged: bool
    log_likelihood: float
    aic: float
    bic: float
    n_obs: int
    n_groups: int

    # Fixed effects
    fixed_effects: Dict[str, Dict[str, float]]

    # Random effects
    random_effects_variance: Dict[str, float]
    random_effects_correlation: Optional[Dict[str, float]]
    random_effects_blups: Optional[Dict[str, Dict[str, float]]]

    # Residual
    residual_variance: float
    residual_std: float

    # ICC
    icc: float

    # Model comparison metrics
    deviance: float
    df_model: int
    df_residual: int

    # Diagnostics
    warnings: List[str] = field(default_factory=list)

    # Raw model (for advanced use)
    _model_result: Any = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            'convergence': {
                'converged': self.converged,
                'warnings': self.warnings
            },
            'fit_statistics': {
                'log_likelihood': round(self.log_likelihood, 4),
                'aic': round(self.aic, 4),
                'bic': round(self.bic, 4),
                'deviance': round(self.deviance, 4)
            },
            'sample_info': {
                'n_observations': self.n_obs,
                'n_groups': self.n_groups,
                'df_model': self.df_model,
                'df_residual': self.df_residual
            },
            'fixed_effects': self.fixed_effects,
            'random_effects': {
                'variance_components': self.random_effects_variance,
                'correlations': self.random_effects_correlation,
                'blups': self.random_effects_blups
            },
            'residual': {
                'variance': round(self.residual_variance, 6),
                'std': round(self.residual_std, 6)
            },
            'icc': round(self.icc, 4),
            'interpretation': self._generate_interpretation()
        }

    def _generate_interpretation(self) -> Dict[str, str]:
        """Generate human-readable interpretation."""
        interp = {}

        # ICC interpretation
        if self.icc < 0.05:
            interp['icc'] = f"Low ICC ({self.icc:.3f}) suggests minimal clustering"
        elif self.icc < 0.15:
            interp['icc'] = f"Moderate ICC ({self.icc:.3f}) indicates meaningful group-level variance"
        else:
            interp['icc'] = f"High ICC ({self.icc:.3f}) shows substantial between-group variance"

        # Significant fixed effects
        sig_effects = []
        for name, stats in self.fixed_effects.items():
            if stats.get('p_value', 1) < 0.05:
                sig_effects.append(name)

        if sig_effects:
            interp['fixed_effects'] = f"Significant predictors: {', '.join(sig_effects)}"
        else:
            interp['fixed_effects'] = "No significant fixed effects at α = 0.05"

        return interp


def fit_linear_mixed_model(
    data: pd.DataFrame,
    outcome: str,
    fixed_effects: List[str],
    random_intercept_groups: Union[str, List[str]],
    random_slopes: Optional[Dict[str, str]] = None,
    method: str = 'powell',  # Changed from 'lbfgs' - more robust in Django env
    maxiter: int = 200,
    compute_blups: bool = True
) -> LMMResult:
    """
    Fit a Linear Mixed Model.

    Args:
        data: DataFrame with all variables
        outcome: Name of the outcome (dependent) variable
        fixed_effects: List of fixed effect predictor names
        random_intercept_groups: Grouping variable(s) for random intercepts
        random_slopes: Dict mapping grouping variable to slope variable
                      e.g., {'school': 'time'} for random slopes of time within schools
        method: Optimization method ('lbfgs', 'cg', 'bfgs', 'nm', 'powell')
        maxiter: Maximum iterations for optimization
        compute_blups: Whether to compute BLUPs for random effects

    Returns:
        LMMResult with model fit and statistics

    Example:
        >>> result = fit_linear_mixed_model(
        ...     data=df,
        ...     outcome='score',
        ...     fixed_effects=['age', 'treatment'],
        ...     random_intercept_groups='classroom',
        ...     random_slopes={'classroom': 'time'}
        ... )
    """
    if not STATSMODELS_AVAILABLE:
        raise ImportError("statsmodels required for mixed models")

    # Prepare data
    data = data.copy()

    # Handle grouping variable
    if isinstance(random_intercept_groups, str):
        group_var = random_intercept_groups
    else:
        # Multiple grouping variables - use first for now
        group_var = random_intercept_groups[0]

    # Convert grouping variable to category (required for proper estimation)
    if data[group_var].dtype != 'category':
        data[group_var] = data[group_var].astype('category')

    # Build formula string
    if fixed_effects:
        fixed_formula = ' + '.join(fixed_effects)
        formula = f'{outcome} ~ {fixed_formula}'
    else:
        formula = f'{outcome} ~ 1'

    # Random effects structure
    re_formula = None
    if random_slopes and group_var in random_slopes:
        slope_var = random_slopes[group_var]
        re_formula = f'~{slope_var}'

    # Fit model using formula API (more reliable)
    warnings_list = []

    try:
        import statsmodels.formula.api as smf

        if re_formula:
            model = smf.mixedlm(formula, data, groups=data[group_var], re_formula=re_formula)
        else:
            model = smf.mixedlm(formula, data, groups=data[group_var])

        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            result = model.fit(method=method, maxiter=maxiter)

            for warning in w:
                warnings_list.append(str(warning.message))

        converged = result.converged

    except Exception as e:
        # Return failed result
        return LMMResult(
            converged=False,
            log_likelihood=float('nan'),
            aic=float('nan'),
            bic=float('nan'),
            n_obs=len(data),
            n_groups=data[group_var].nunique(),
            fixed_effects={},
            random_effects_variance={},
            random_effects_correlation=None,
            random_effects_blups=None,
            residual_variance=float('nan'),
            residual_std=float('nan'),
            icc=float('nan'),
            deviance=float('nan'),
            df_model=0,
            df_residual=0,
            warnings=[f"Model fitting failed: {str(e)}"]
        )

    # Extract results
    n_obs = result.nobs
    n_groups = data[group_var].nunique()

    # Fixed effects
    fixed_effects_results = {}
    param_names = result.fe_params.index.tolist()

    for i, name in enumerate(param_names):
        fixed_effects_results[name] = {
            'estimate': float(result.fe_params[name]),
            'std_error': float(result.bse_fe[name]),
            'z_value': float(result.tvalues[name]),
            'p_value': float(result.pvalues[name]),
            'ci_lower': float(result.conf_int().loc[name, 0]),
            'ci_upper': float(result.conf_int().loc[name, 1])
        }

    # Random effects variance components
    re_variance = {}
    cov_re = result.cov_re

    # Handle different types of cov_re (can be ndarray, DataFrame, scalar, or dict)
    if isinstance(cov_re, pd.DataFrame):
        cov_re = cov_re.values
    elif isinstance(cov_re, dict):
        # Extract from dict if present
        if 'Group Var' in cov_re:
            cov_re = np.array([[cov_re['Group Var']]])
        else:
            cov_re = np.array([[list(cov_re.values())[0] if cov_re else 0.0]])

    if isinstance(cov_re, np.ndarray):
        if cov_re.ndim == 0:
            re_variance['Intercept'] = float(cov_re)
        elif cov_re.ndim == 1:
            re_variance['Intercept'] = float(cov_re[0])
        else:
            re_variance['Intercept'] = float(cov_re[0, 0])
            if cov_re.shape[0] > 1:
                re_variance['Slope'] = float(cov_re[1, 1])
    elif cov_re is not None:
        try:
            re_variance['Intercept'] = float(cov_re)
        except (TypeError, ValueError):
            re_variance['Intercept'] = 0.0
    else:
        re_variance['Intercept'] = 0.0

    # Random effects correlation (if random slope)
    re_correlation = None
    if isinstance(cov_re, np.ndarray) and cov_re.ndim == 2 and cov_re.shape[0] > 1:
        var1 = cov_re[0, 0]
        var2 = cov_re[1, 1]
        cov12 = cov_re[0, 1]
        if var1 > 0 and var2 > 0:
            re_correlation = {'intercept_slope': float(cov12 / np.sqrt(var1 * var2))}

    # Residual variance
    residual_var = float(result.scale)
    residual_std = float(np.sqrt(residual_var))

    # Calculate ICC
    total_var = re_variance.get('Intercept', 0) + residual_var
    icc = re_variance.get('Intercept', 0) / total_var if total_var > 0 else 0

    # BLUPs (Best Linear Unbiased Predictors)
    blups = None
    if compute_blups:
        try:
            random_effects = result.random_effects
            blups = {}
            for group, effects in random_effects.items():
                blups[str(group)] = {
                    col: float(val) for col, val in effects.items()
                }
        except Exception:
            pass

    # Model fit statistics
    log_lik = float(result.llf)
    aic = float(result.aic)
    bic = float(result.bic)
    deviance = -2 * log_lik

    # Degrees of freedom
    df_model = len(fixed_effects_results)
    df_residual = n_obs - df_model - len(re_variance)

    return LMMResult(
        converged=converged,
        log_likelihood=log_lik,
        aic=aic,
        bic=bic,
        n_obs=n_obs,
        n_groups=n_groups,
        fixed_effects=fixed_effects_results,
        random_effects_variance=re_variance,
        random_effects_correlation=re_correlation,
        random_effects_blups=blups,
        residual_variance=residual_var,
        residual_std=residual_std,
        icc=icc,
        deviance=deviance,
        df_model=df_model,
        df_residual=df_residual,
        warnings=warnings_list,
        _model_result=result
    )


def fit_random_intercept_model(
    data: pd.DataFrame,
    outcome: str,
    fixed_effects: List[str],
    grouping_var: str
) -> LMMResult:
    """
    Convenience function for fitting a random intercept model.

    This is the most common multilevel model specification:
    y_ij = β₀ + β₁x_ij + u_j + ε_ij

    Args:
        data: DataFrame
        outcome: Outcome variable name
        fixed_effects: List of fixed effect predictors
        grouping_var: Grouping variable for random intercepts

    Returns:
        LMMResult
    """
    return fit_linear_mixed_model(
        data=data,
        outcome=outcome,
        fixed_effects=fixed_effects,
        random_intercept_groups=grouping_var,
        random_slopes=None
    )


def fit_random_slope_model(
    data: pd.DataFrame,
    outcome: str,
    fixed_effects: List[str],
    grouping_var: str,
    slope_var: str,
    correlated: bool = True
) -> LMMResult:
    """
    Convenience function for fitting a random slope model.

    y_ij = β₀ + β₁x_ij + u₀j + u₁j*x_ij + ε_ij

    Args:
        data: DataFrame
        outcome: Outcome variable name
        fixed_effects: List of fixed effect predictors
        grouping_var: Grouping variable for random effects
        slope_var: Variable with random slope
        correlated: Whether intercept and slope are correlated

    Returns:
        LMMResult
    """
    return fit_linear_mixed_model(
        data=data,
        outcome=outcome,
        fixed_effects=fixed_effects,
        random_intercept_groups=grouping_var,
        random_slopes={grouping_var: slope_var}
    )


def calculate_variance_partition(result: LMMResult) -> Dict[str, Any]:
    """
    Calculate variance partition coefficient (VPC) from LMM results.

    VPC shows the proportion of total variance at each level.

    Args:
        result: Fitted LMMResult

    Returns:
        Dictionary with variance partition information
    """
    re_var = result.random_effects_variance.get('Intercept', 0)
    resid_var = result.residual_variance
    total_var = re_var + resid_var

    if total_var == 0:
        return {
            'level_2_variance': 0,
            'level_1_variance': 0,
            'vpc_level_2': 0,
            'vpc_level_1': 0,
            'interpretation': 'No variance to partition'
        }

    vpc_level2 = re_var / total_var
    vpc_level1 = resid_var / total_var

    if vpc_level2 < 0.05:
        interp = "Most variance at level 1 (individual level)"
    elif vpc_level2 < 0.20:
        interp = "Moderate variance at level 2 (group level)"
    else:
        interp = "Substantial variance at level 2 (group level)"

    return {
        'level_2_variance': round(re_var, 6),
        'level_1_variance': round(resid_var, 6),
        'total_variance': round(total_var, 6),
        'vpc_level_2': round(vpc_level2, 4),
        'vpc_level_1': round(vpc_level1, 4),
        'icc': round(vpc_level2, 4),
        'interpretation': interp
    }


def generate_model_equation(
    outcome: str,
    fixed_effects: List[str],
    grouping_var: str,
    random_slope: Optional[str] = None
) -> Dict[str, str]:
    """
    Generate the mathematical notation for the model.

    Args:
        outcome: Outcome variable
        fixed_effects: Fixed effect variables
        grouping_var: Grouping variable
        random_slope: Variable with random slope

    Returns:
        Dictionary with various equation representations
    """
    # Level 1 equation
    fixed_terms = ' + '.join([f'β_{i+1}·{var}' for i, var in enumerate(fixed_effects)])
    if fixed_terms:
        level1 = f"{outcome}_ij = β_0 + {fixed_terms} + ε_ij"
    else:
        level1 = f"{outcome}_ij = β_0 + ε_ij"

    # Level 2 equations
    level2_intercept = f"β_0j = γ_00 + u_0j"

    # Combined/composite form
    if random_slope:
        level2_slope = f"β_1j = γ_10 + u_1j"
        composite = f"{outcome}_ij = γ_00 + {fixed_terms.replace('β_1', 'γ_10')} + u_0j + u_1j·{random_slope} + ε_ij"
        random_part = "u_0j ~ N(0, τ²_00), u_1j ~ N(0, τ²_11), Cov(u_0j, u_1j) = τ_01"
    else:
        level2_slope = None
        composite = f"{outcome}_ij = γ_00 + {fixed_terms.replace('β_', 'γ_')} + u_0j + ε_ij"
        random_part = "u_0j ~ N(0, τ²_00)"

    return {
        'level_1': level1,
        'level_2_intercept': level2_intercept,
        'level_2_slope': level2_slope,
        'composite': composite,
        'random_effects': random_part,
        'residual': 'ε_ij ~ N(0, σ²)',
        'subscripts': f"i = observation, j = {grouping_var}"
    }
