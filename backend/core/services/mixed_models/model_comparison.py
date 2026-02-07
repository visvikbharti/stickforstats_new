"""
Model Comparison Module for Mixed Effects Models
=================================================

Provides tools for comparing nested and non-nested mixed models:
- Likelihood Ratio Test (LRT) for nested models
- AIC/BIC comparison for non-nested models
- Deviance-based comparisons

Important Notes:
- LRT requires models to be nested (one is a special case of another)
- REML estimates cannot be compared when fixed effects differ
- Use ML estimation for comparing models with different fixed effects

References:
    Pinheiro, J. C., & Bates, D. M. (2000). Mixed-Effects Models in S and S-PLUS.
    Burnham, K. P., & Anderson, D. R. (2002). Model Selection and Multimodel Inference.

Created: December 26, 2025
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from scipy import stats


@dataclass
class ModelComparisonResult:
    """Result of model comparison."""
    models: List[str]
    comparison_type: str

    # Fit statistics
    log_likelihoods: List[float]
    aics: List[float]
    bics: List[float]
    deviances: List[float]

    # For LRT
    lrt_statistic: Optional[float]
    lrt_df: Optional[int]
    lrt_p_value: Optional[float]

    # Model parameters
    n_parameters: List[int]
    n_observations: int

    # Winner
    preferred_model: str
    preference_criterion: str

    # Interpretation
    interpretation: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        model_stats = {}
        for i, name in enumerate(self.models):
            model_stats[name] = {
                'log_likelihood': round(self.log_likelihoods[i], 4),
                'aic': round(self.aics[i], 4),
                'bic': round(self.bics[i], 4),
                'deviance': round(self.deviances[i], 4),
                'n_parameters': self.n_parameters[i]
            }

        result = {
            'model_statistics': model_stats,
            'n_observations': self.n_observations,
            'comparison_type': self.comparison_type,
            'preferred_model': self.preferred_model,
            'preference_criterion': self.preference_criterion,
            'interpretation': self.interpretation
        }

        if self.lrt_statistic is not None:
            result['likelihood_ratio_test'] = {
                'statistic': round(self.lrt_statistic, 4),
                'df': self.lrt_df,
                'p_value': round(self.lrt_p_value, 6),
                'significant': self.lrt_p_value < 0.05
            }

        return result


def compare_models(
    model1,
    model2,
    model1_name: str = 'Model 1',
    model2_name: str = 'Model 2',
    nested: bool = True
) -> ModelComparisonResult:
    """
    Compare two mixed models.

    Args:
        model1: First LMMResult (simpler/null model for LRT)
        model2: Second LMMResult (more complex/alternative for LRT)
        model1_name: Name for first model
        model2_name: Name for second model
        nested: If True, performs LRT (requires nested models)

    Returns:
        ModelComparisonResult with comparison statistics
    """
    # Extract statistics
    ll1 = model1.log_likelihood
    ll2 = model2.log_likelihood
    aic1 = model1.aic
    aic2 = model2.aic
    bic1 = model1.bic
    bic2 = model2.bic
    dev1 = model1.deviance
    dev2 = model2.deviance

    # Count parameters
    n_fixed1 = len(model1.fixed_effects)
    n_random1 = len(model1.random_effects_variance)
    n_params1 = n_fixed1 + n_random1 + 1  # +1 for residual variance

    n_fixed2 = len(model2.fixed_effects)
    n_random2 = len(model2.random_effects_variance)
    n_params2 = n_fixed2 + n_random2 + 1

    n_obs = model1.n_obs

    # Likelihood ratio test (if nested)
    lrt_stat = None
    lrt_df = None
    lrt_p = None

    if nested:
        # Ensure model1 is the simpler model
        if ll1 > ll2:
            # Swap if needed
            ll1, ll2 = ll2, ll1
            n_params1, n_params2 = n_params2, n_params1
            model1_name, model2_name = model2_name, model1_name

        lrt_stat = 2 * (ll2 - ll1)
        lrt_df = abs(n_params2 - n_params1)

        if lrt_df > 0:
            lrt_p = 1 - stats.chi2.cdf(lrt_stat, lrt_df)
        else:
            lrt_p = 1.0

    # Determine preferred model
    if nested and lrt_p is not None and lrt_p < 0.05:
        preferred = model2_name
        criterion = 'LRT (p < 0.05)'
    elif aic1 < aic2:
        preferred = model1_name
        criterion = f'Lower AIC (Δ = {round(aic2 - aic1, 2)})'
    else:
        preferred = model2_name
        criterion = f'Lower AIC (Δ = {round(aic1 - aic2, 2)})'

    # Generate interpretation
    interpretation = _generate_comparison_interpretation(
        model1_name, model2_name,
        aic1, aic2, bic1, bic2,
        lrt_stat, lrt_df, lrt_p,
        n_params1, n_params2
    )

    return ModelComparisonResult(
        models=[model1_name, model2_name],
        comparison_type='nested (LRT)' if nested else 'non-nested (AIC/BIC)',
        log_likelihoods=[ll1, ll2],
        aics=[aic1, aic2],
        bics=[bic1, bic2],
        deviances=[dev1, dev2],
        lrt_statistic=lrt_stat,
        lrt_df=lrt_df,
        lrt_p_value=lrt_p,
        n_parameters=[n_params1, n_params2],
        n_observations=n_obs,
        preferred_model=preferred,
        preference_criterion=criterion,
        interpretation=interpretation
    )


def likelihood_ratio_test(
    model_null,
    model_alt,
    boundary_correction: bool = True
) -> Dict[str, Any]:
    """
    Perform Likelihood Ratio Test for nested models.

    The LRT tests whether the more complex model provides a
    significantly better fit than the simpler model.

    H0: Simpler model is adequate
    H1: More complex model is needed

    Args:
        model_null: Simpler (null) model result
        model_alt: More complex (alternative) model result
        boundary_correction: Apply correction for variance at boundary

    Returns:
        Dictionary with LRT results

    Note:
        When testing random effects variances, the null hypothesis
        places the parameter on the boundary of the parameter space
        (variance >= 0). A mixture chi-square distribution is more
        appropriate than the standard chi-square.
    """
    ll_null = model_null.log_likelihood
    ll_alt = model_alt.log_likelihood

    # Calculate test statistic
    lrt = 2 * (ll_alt - ll_null)

    # Degrees of freedom
    n_params_null = len(model_null.fixed_effects) + len(model_null.random_effects_variance) + 1
    n_params_alt = len(model_alt.fixed_effects) + len(model_alt.random_effects_variance) + 1
    df = n_params_alt - n_params_null

    if df <= 0:
        return {
            'error': 'Alternative model must have more parameters than null model',
            'n_params_null': n_params_null,
            'n_params_alt': n_params_alt
        }

    # P-value
    if boundary_correction and df == 1:
        # 50:50 mixture of chi2(0) and chi2(1) for variance at boundary
        p_value = 0.5 * (1 - stats.chi2.cdf(lrt, 0)) + 0.5 * (1 - stats.chi2.cdf(lrt, 1))
    else:
        p_value = 1 - stats.chi2.cdf(lrt, df)

    # Interpretation
    if p_value < 0.001:
        sig_level = 'highly significant (p < 0.001)'
        conclusion = 'Strong evidence for the more complex model'
    elif p_value < 0.01:
        sig_level = 'very significant (p < 0.01)'
        conclusion = 'Evidence for the more complex model'
    elif p_value < 0.05:
        sig_level = 'significant (p < 0.05)'
        conclusion = 'Some evidence for the more complex model'
    else:
        sig_level = 'not significant (p >= 0.05)'
        conclusion = 'No significant improvement from the more complex model'

    return {
        'test': 'Likelihood Ratio Test',
        'statistic': round(lrt, 4),
        'df': df,
        'p_value': round(p_value, 6),
        'significance': sig_level,
        'conclusion': conclusion,
        'null_model': {
            'log_likelihood': round(ll_null, 4),
            'n_parameters': n_params_null
        },
        'alternative_model': {
            'log_likelihood': round(ll_alt, 4),
            'n_parameters': n_params_alt
        },
        'boundary_correction': boundary_correction,
        'prefer_complex': p_value < 0.05
    }


def aic_comparison(models: List, model_names: List[str] = None) -> Dict[str, Any]:
    """
    Compare models using Akaike Information Criterion.

    AIC = -2*log_likelihood + 2*k (k = number of parameters)

    Lower AIC indicates better model (balancing fit and complexity).

    Delta AIC interpretation (Burnham & Anderson, 2002):
    - Δ < 2: Substantial support
    - 2 < Δ < 4: Some support
    - 4 < Δ < 7: Little support
    - Δ > 10: No support

    Args:
        models: List of LMMResult objects
        model_names: Names for models

    Returns:
        Dictionary with AIC comparison
    """
    if model_names is None:
        model_names = [f'Model {i+1}' for i in range(len(models))]

    aics = [m.aic for m in models]
    min_aic = min(aics)

    results = []
    for i, (name, model) in enumerate(zip(model_names, models)):
        delta_aic = aics[i] - min_aic
        # Akaike weights
        weight = np.exp(-0.5 * delta_aic)

        results.append({
            'model': name,
            'aic': round(aics[i], 4),
            'delta_aic': round(delta_aic, 4),
            'weight_numerator': round(weight, 6),
            'n_parameters': len(model.fixed_effects) + len(model.random_effects_variance) + 1,
            'support': _aic_support(delta_aic)
        })

    # Normalize weights
    total_weight = sum(r['weight_numerator'] for r in results)
    for r in results:
        r['akaike_weight'] = round(r['weight_numerator'] / total_weight, 4)
        del r['weight_numerator']

    # Sort by AIC
    results.sort(key=lambda x: x['aic'])

    return {
        'criterion': 'AIC (Akaike Information Criterion)',
        'models': results,
        'best_model': results[0]['model'],
        'interpretation': (
            f"Best model: {results[0]['model']} (AIC = {results[0]['aic']}). "
            f"Second best differs by Δ = {results[1]['delta_aic'] if len(results) > 1 else 0}"
        )
    }


def bic_comparison(models: List, model_names: List[str] = None) -> Dict[str, Any]:
    """
    Compare models using Bayesian Information Criterion.

    BIC = -2*log_likelihood + k*log(n)

    BIC penalizes complexity more heavily than AIC for n > 8.
    Generally more conservative in selecting complex models.

    Args:
        models: List of LMMResult objects
        model_names: Names for models

    Returns:
        Dictionary with BIC comparison
    """
    if model_names is None:
        model_names = [f'Model {i+1}' for i in range(len(models))]

    bics = [m.bic for m in models]
    min_bic = min(bics)

    results = []
    for i, (name, model) in enumerate(zip(model_names, models)):
        delta_bic = bics[i] - min_bic

        results.append({
            'model': name,
            'bic': round(bics[i], 4),
            'delta_bic': round(delta_bic, 4),
            'n_parameters': len(model.fixed_effects) + len(model.random_effects_variance) + 1,
            'support': _bic_support(delta_bic)
        })

    # Sort by BIC
    results.sort(key=lambda x: x['bic'])

    return {
        'criterion': 'BIC (Bayesian Information Criterion)',
        'models': results,
        'best_model': results[0]['model'],
        'interpretation': (
            f"Best model: {results[0]['model']} (BIC = {results[0]['bic']}). "
            f"BIC penalizes complexity more than AIC."
        )
    }


def _aic_support(delta: float) -> str:
    """Interpret delta AIC value."""
    if delta < 2:
        return 'Substantial support'
    elif delta < 4:
        return 'Some support'
    elif delta < 7:
        return 'Little support'
    elif delta < 10:
        return 'Very little support'
    else:
        return 'No support'


def _bic_support(delta: float) -> str:
    """Interpret delta BIC value (Raftery, 1995)."""
    if delta < 2:
        return 'Weak evidence against'
    elif delta < 6:
        return 'Positive evidence against'
    elif delta < 10:
        return 'Strong evidence against'
    else:
        return 'Very strong evidence against'


def _generate_comparison_interpretation(
    model1_name: str,
    model2_name: str,
    aic1: float,
    aic2: float,
    bic1: float,
    bic2: float,
    lrt_stat: Optional[float],
    lrt_df: Optional[int],
    lrt_p: Optional[float],
    n_params1: int,
    n_params2: int
) -> str:
    """Generate human-readable comparison interpretation."""
    parts = []

    # LRT result
    if lrt_p is not None:
        if lrt_p < 0.05:
            parts.append(
                f"The likelihood ratio test is significant (χ² = {lrt_stat:.2f}, "
                f"df = {lrt_df}, p = {lrt_p:.4f}), suggesting {model2_name} "
                "provides a significantly better fit."
            )
        else:
            parts.append(
                f"The likelihood ratio test is not significant (χ² = {lrt_stat:.2f}, "
                f"df = {lrt_df}, p = {lrt_p:.4f}), suggesting the simpler model "
                f"({model1_name}) is adequate."
            )

    # AIC comparison
    delta_aic = abs(aic1 - aic2)
    better_aic = model1_name if aic1 < aic2 else model2_name
    parts.append(
        f"By AIC, {better_aic} is preferred (Δ = {delta_aic:.2f})."
    )

    # BIC comparison
    delta_bic = abs(bic1 - bic2)
    better_bic = model1_name if bic1 < bic2 else model2_name
    parts.append(
        f"By BIC, {better_bic} is preferred (Δ = {delta_bic:.2f})."
    )

    # Complexity note
    if n_params1 != n_params2:
        simpler = model1_name if n_params1 < n_params2 else model2_name
        parts.append(
            f"{simpler} is more parsimonious ({min(n_params1, n_params2)} vs "
            f"{max(n_params1, n_params2)} parameters)."
        )

    return ' '.join(parts)


def build_model_hierarchy(
    base_result,
    random_intercept_result,
    random_slope_result=None,
    base_name: str = 'No random effects',
    ri_name: str = 'Random intercept',
    rs_name: str = 'Random slope'
) -> Dict[str, Any]:
    """
    Compare a hierarchy of increasingly complex models.

    Common in multilevel modeling to justify model complexity:
    1. Simple OLS (no random effects)
    2. Random intercept only
    3. Random intercept + random slope

    Args:
        base_result: Model without random effects
        random_intercept_result: Random intercept model
        random_slope_result: Random slope model (optional)
        base_name, ri_name, rs_name: Model names

    Returns:
        Dictionary with hierarchical comparison
    """
    comparisons = []

    # Compare base to random intercept
    comp1 = likelihood_ratio_test(base_result, random_intercept_result)
    comparisons.append({
        'comparison': f'{base_name} vs {ri_name}',
        'test': comp1,
        'conclusion': 'Random intercept justified' if comp1['p_value'] < 0.05 else 'Random intercept not needed'
    })

    # Compare random intercept to random slope (if provided)
    if random_slope_result is not None:
        comp2 = likelihood_ratio_test(random_intercept_result, random_slope_result)
        comparisons.append({
            'comparison': f'{ri_name} vs {rs_name}',
            'test': comp2,
            'conclusion': 'Random slope justified' if comp2['p_value'] < 0.05 else 'Random slope not needed'
        })

    # Determine final recommendation
    if len(comparisons) == 1:
        if comparisons[0]['test']['p_value'] < 0.05:
            recommended = ri_name
        else:
            recommended = base_name
    else:
        if comparisons[1]['test']['p_value'] < 0.05:
            recommended = rs_name
        elif comparisons[0]['test']['p_value'] < 0.05:
            recommended = ri_name
        else:
            recommended = base_name

    return {
        'hierarchy': [base_name, ri_name] + ([rs_name] if random_slope_result else []),
        'comparisons': comparisons,
        'recommended_model': recommended,
        'interpretation': (
            f"Based on the model hierarchy, {recommended} is recommended. "
            "More complex random effects should only be included if justified by LRT."
        )
    }
