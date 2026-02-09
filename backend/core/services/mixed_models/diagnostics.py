"""
Diagnostics Module for Mixed Effects Models
============================================

Provides diagnostic tools for assessing model assumptions and fit:
- Convergence checking
- Residual analysis (level 1 and level 2)
- Influence diagnostics
- Assumption verification

Key Assumptions for LMM:
1. Level-1 residuals are normally distributed with constant variance
2. Level-2 random effects are normally distributed
3. Level-1 and level-2 residuals are independent
4. Correct specification of fixed and random effects

References:
    Snijders, T. A., & Bosker, R. J. (2011). Multilevel Analysis.
    Raudenbush, S. W., & Bryk, A. S. (2002). Hierarchical Linear Models.

Created: December 26, 2025
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional
import numpy as np
from scipy import stats


@dataclass
class LMMDiagnostics:
    """Complete diagnostics for a Linear Mixed Model."""
    # Convergence
    converged: bool
    convergence_warnings: List[str]

    # Residual diagnostics
    residual_normality: Dict[str, Any]
    residual_homoscedasticity: Dict[str, Any]

    # Random effects diagnostics
    random_effects_normality: Dict[str, Any]

    # Influence
    influential_groups: List[str]
    influential_observations: List[int]

    # Overall assessment
    overall_assessment: str
    recommendations: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            'convergence': {
                'converged': self.converged,
                'warnings': self.convergence_warnings
            },
            'residuals': {
                'normality': self.residual_normality,
                'homoscedasticity': self.residual_homoscedasticity
            },
            'random_effects': {
                'normality': self.random_effects_normality
            },
            'influence': {
                'influential_groups': self.influential_groups,
                'influential_observations': self.influential_observations
            },
            'overall_assessment': self.overall_assessment,
            'recommendations': self.recommendations
        }


def check_convergence(lmm_result) -> Dict[str, Any]:
    """
    Check if the model converged properly.

    Args:
        lmm_result: LMMResult object

    Returns:
        Dictionary with convergence information
    """
    converged = lmm_result.converged
    warnings = lmm_result.warnings

    # Check for problematic variance estimates
    issues = []

    re_var = lmm_result.random_effects_variance
    for name, var in re_var.items():
        if var < 1e-10:
            issues.append(f"Variance of {name} is near zero - may indicate overfitting or boundary solution")
        if var > 1e6:
            issues.append(f"Variance of {name} is very large - may indicate estimation problems")

    # Check residual variance
    if lmm_result.residual_variance < 1e-10:
        issues.append("Residual variance near zero - model may be overfitting")

    # Overall status
    if converged and not issues:
        status = 'good'
        message = 'Model converged without issues'
    elif converged:
        status = 'warning'
        message = 'Model converged but with potential issues'
    else:
        status = 'failed'
        message = 'Model did not converge'

    return {
        'converged': converged,
        'status': status,
        'message': message,
        'optimization_warnings': warnings,
        'variance_issues': issues,
        'recommendations': _convergence_recommendations(converged, issues)
    }


def _convergence_recommendations(converged: bool, issues: List[str]) -> List[str]:
    """Generate recommendations for convergence issues."""
    recs = []

    if not converged:
        recs.append("Try increasing maximum iterations (maxiter)")
        recs.append("Consider simplifying the random effects structure")
        recs.append("Check for outliers or extreme values in the data")
        recs.append("Try different optimization methods (method='powell' or 'nm')")

    for issue in issues:
        if 'near zero' in issue.lower():
            recs.append("Consider removing this random effect - it may not be needed")
        if 'very large' in issue.lower():
            recs.append("Check for data entry errors or outliers")
            recs.append("Consider scaling the predictor variables")

    return recs if recs else ["No recommendations - model looks good"]


def residual_diagnostics(
    lmm_result,
    data=None,
    outcome_var: str = None
) -> Dict[str, Any]:
    """
    Perform residual diagnostics for level-1 residuals.

    Checks:
    1. Normality of residuals
    2. Homoscedasticity (constant variance)
    3. Independence (if data provided)

    Args:
        lmm_result: LMMResult object
        data: Original data (optional, for additional diagnostics)
        outcome_var: Outcome variable name

    Returns:
        Dictionary with residual diagnostics
    """
    # Access residuals from fitted model
    if hasattr(lmm_result, '_model_result') and lmm_result._model_result is not None:
        try:
            model = lmm_result._model_result
            residuals = model.resid
            fitted = model.fittedvalues
        except Exception:
            return {
                'error': 'Could not extract residuals from model',
                'recommendation': 'Re-fit model with compute_residuals=True'
            }
    else:
        return {
            'error': 'Model result not available',
            'recommendation': 'Ensure model fitting preserved the result object'
        }

    residuals = np.array(residuals)
    fitted = np.array(fitted)
    n = len(residuals)

    # Standardized residuals
    std_residuals = (residuals - np.mean(residuals)) / np.std(residuals, ddof=1)

    # 1. Normality test
    if n >= 20:
        # Shapiro-Wilk for smaller samples
        if n <= 5000:
            shapiro_stat, shapiro_p = stats.shapiro(residuals)
            normality_test = 'Shapiro-Wilk'
        else:
            # Use Anderson-Darling for larger samples
            ad_result = stats.anderson(residuals, dist='norm')
            shapiro_stat = ad_result.statistic
            # Approximate p-value
            shapiro_p = 0.05 if shapiro_stat > ad_result.critical_values[2] else 0.10
            normality_test = 'Anderson-Darling'
    else:
        shapiro_stat, shapiro_p = None, None
        normality_test = 'Sample too small'

    # Skewness and kurtosis
    skewness = float(stats.skew(residuals))
    kurtosis = float(stats.kurtosis(residuals))

    normality_result = {
        'test': normality_test,
        'statistic': round(shapiro_stat, 4) if shapiro_stat else None,
        'p_value': round(shapiro_p, 4) if shapiro_p else None,
        'normal': shapiro_p > 0.05 if shapiro_p else None,
        'skewness': round(skewness, 4),
        'kurtosis': round(kurtosis, 4),
        'interpretation': _interpret_normality(shapiro_p, skewness, kurtosis)
    }

    # 2. Homoscedasticity (Breusch-Pagan-like test)
    # Regress squared residuals on fitted values
    sq_residuals = residuals ** 2
    slope, intercept, r_value, p_value_het, std_err = stats.linregress(fitted, sq_residuals)

    homoscedasticity_result = {
        'test': 'Residuals vs Fitted regression',
        'slope': round(slope, 6),
        'p_value': round(p_value_het, 4),
        'heteroscedastic': p_value_het < 0.05,
        'r_squared': round(r_value ** 2, 4),
        'interpretation': (
            'Evidence of heteroscedasticity - variance not constant' if p_value_het < 0.05
            else 'No strong evidence of heteroscedasticity'
        )
    }

    # 3. Summary statistics
    summary = {
        'n': n,
        'mean': round(float(np.mean(residuals)), 6),
        'std': round(float(np.std(residuals, ddof=1)), 6),
        'min': round(float(np.min(residuals)), 4),
        'max': round(float(np.max(residuals)), 4),
        'outliers': {
            'n_extreme': int(np.sum(np.abs(std_residuals) > 3)),
            'n_moderate': int(np.sum(np.abs(std_residuals) > 2))
        }
    }

    # Q-Q plot data
    theoretical = stats.norm.ppf((np.arange(1, n + 1) - 0.5) / n)
    observed_sorted = np.sort(std_residuals)

    qq_plot = {
        'theoretical': theoretical.tolist(),
        'observed': observed_sorted.tolist()
    }

    return {
        'normality': normality_result,
        'homoscedasticity': homoscedasticity_result,
        'summary': summary,
        'qq_plot': qq_plot,
        'residuals_vs_fitted': {
            'fitted': fitted.tolist(),
            'residuals': residuals.tolist()
        }
    }


def _interpret_normality(p_value: Optional[float], skew: float, kurt: float) -> str:
    """Interpret normality test results."""
    parts = []

    if p_value is not None:
        if p_value < 0.05:
            parts.append("Significant deviation from normality (p < 0.05)")
        else:
            parts.append("No significant deviation from normality")

    if abs(skew) > 1:
        direction = "positively" if skew > 0 else "negatively"
        parts.append(f"Substantially {direction} skewed (skew = {skew:.2f})")
    elif abs(skew) > 0.5:
        direction = "positively" if skew > 0 else "negatively"
        parts.append(f"Moderately {direction} skewed")

    if abs(kurt) > 2:
        shape = "heavy" if kurt > 0 else "light"
        parts.append(f"{shape.capitalize()} tails (kurtosis = {kurt:.2f})")

    return '. '.join(parts) if parts else "Residuals appear approximately normal"


def influence_diagnostics(
    lmm_result,
    data=None,
    grouping_var: str = None
) -> Dict[str, Any]:
    """
    Identify influential groups and observations.

    Uses Cook's distance-like measures for multilevel models.

    Args:
        lmm_result: LMMResult object
        data: Original data
        grouping_var: Name of grouping variable

    Returns:
        Dictionary with influence diagnostics
    """
    influential_groups = []
    influential_obs = []

    # Check random effects for outliers
    blups = lmm_result.random_effects_blups

    if blups:
        # Get BLUPs as array
        intercept_blups = []
        group_names = []

        for group, values in blups.items():
            group_names.append(str(group))
            if 'Intercept' in values:
                intercept_blups.append(values['Intercept'])
            elif 'Group' in values:
                intercept_blups.append(values['Group'])

        if intercept_blups:
            blup_array = np.array(intercept_blups)
            blup_mean = np.mean(blup_array)
            blup_std = np.std(blup_array, ddof=1)

            if blup_std > 0:
                z_scores = (blup_array - blup_mean) / blup_std

                # Flag groups with |z| > 2
                for i, z in enumerate(z_scores):
                    if abs(z) > 2:
                        influential_groups.append({
                            'group': group_names[i],
                            'blup': round(float(intercept_blups[i]), 4),
                            'z_score': round(float(z), 4),
                            'type': 'extreme' if abs(z) > 3 else 'moderate'
                        })

    # Residual-based influence (if available)
    if hasattr(lmm_result, '_model_result') and lmm_result._model_result is not None:
        try:
            residuals = lmm_result._model_result.resid
            std_resid = (residuals - np.mean(residuals)) / np.std(residuals, ddof=1)

            # Flag observations with |standardized residual| > 3
            extreme_idx = np.where(np.abs(std_resid) > 3)[0]
            for idx in extreme_idx:
                influential_obs.append({
                    'index': int(idx),
                    'residual': round(float(residuals[idx]), 4),
                    'standardized': round(float(std_resid[idx]), 4)
                })
        except Exception:
            pass

    return {
        'influential_groups': influential_groups,
        'n_influential_groups': len(influential_groups),
        'influential_observations': influential_obs,
        'n_influential_observations': len(influential_obs),
        'threshold_used': {
            'groups': 'z-score > 2',
            'observations': 'standardized residual > 3'
        },
        'recommendations': _influence_recommendations(influential_groups, influential_obs)
    }


def _influence_recommendations(inf_groups: List, inf_obs: List) -> List[str]:
    """Generate recommendations for influential points."""
    recs = []

    if len(inf_groups) > 0:
        recs.append(f"Found {len(inf_groups)} influential group(s) - consider sensitivity analysis excluding them")

    if len(inf_obs) > 0:
        recs.append(f"Found {len(inf_obs)} influential observation(s) - check for data entry errors")

    if len(inf_groups) == 0 and len(inf_obs) == 0:
        recs.append("No highly influential groups or observations detected")

    return recs


def full_diagnostics(lmm_result, data=None, grouping_var: str = None) -> LMMDiagnostics:
    """
    Perform complete diagnostic assessment of a fitted LMM.

    Args:
        lmm_result: LMMResult object
        data: Original data
        grouping_var: Grouping variable name

    Returns:
        LMMDiagnostics object
    """
    # Convergence
    conv = check_convergence(lmm_result)

    # Residuals
    resid = residual_diagnostics(lmm_result, data)

    # Influence
    inf = influence_diagnostics(lmm_result, data, grouping_var)

    # Random effects normality
    blups = lmm_result.random_effects_blups
    re_normality = {'test': 'Not available', 'normal': None}

    if blups:
        intercept_blups = []
        for values in blups.values():
            if 'Intercept' in values:
                intercept_blups.append(values['Intercept'])
            elif 'Group' in values:
                intercept_blups.append(values['Group'])

        if len(intercept_blups) >= 8:
            _, p = stats.shapiro(intercept_blups)
            re_normality = {
                'test': 'Shapiro-Wilk',
                'p_value': round(p, 4),
                'normal': p > 0.05,
                'n_groups': len(intercept_blups)
            }

    # Overall assessment
    issues = []
    if not conv['converged']:
        issues.append("Model did not converge")
    if resid.get('normality', {}).get('normal') is False:
        issues.append("Residuals not normally distributed")
    if resid.get('homoscedasticity', {}).get('heteroscedastic'):
        issues.append("Evidence of heteroscedasticity")
    if re_normality.get('normal') is False:
        issues.append("Random effects may not be normal")
    if inf['n_influential_groups'] > 0:
        issues.append(f"{inf['n_influential_groups']} influential group(s)")

    if not issues:
        overall = "Model diagnostics look good - assumptions appear satisfied"
    elif len(issues) <= 2:
        overall = f"Minor concerns: {', '.join(issues)}"
    else:
        overall = f"Multiple concerns: {', '.join(issues)}"

    # Compile recommendations
    all_recs = []
    all_recs.extend(conv.get('recommendations', []))
    all_recs.extend(inf.get('recommendations', []))

    if resid.get('normality', {}).get('normal') is False:
        all_recs.append("Consider transforming the outcome variable or using robust estimation")
    if resid.get('homoscedasticity', {}).get('heteroscedastic'):
        all_recs.append("Consider modeling heterogeneous variances or using robust SEs")

    return LMMDiagnostics(
        converged=conv['converged'],
        convergence_warnings=conv.get('optimization_warnings', []),
        residual_normality=resid.get('normality', {}),
        residual_homoscedasticity=resid.get('homoscedasticity', {}),
        random_effects_normality=re_normality,
        influential_groups=[g['group'] for g in inf['influential_groups']],
        influential_observations=[o['index'] for o in inf['influential_observations']],
        overall_assessment=overall,
        recommendations=list(set(all_recs))  # Remove duplicates
    )
