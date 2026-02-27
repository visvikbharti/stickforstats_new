"""
Random Effects Utilities Module
===============================

Utilities for extracting, analyzing, and visualizing random effects
from Linear Mixed Models.

BLUPs (Best Linear Unbiased Predictors):
    Random effects are estimated as BLUPs, which shrink group-specific
    estimates toward the overall mean based on:
    - Group sample size (smaller groups shrink more)
    - Within-group variance
    - Between-group variance

Caterpillar Plots:
    Visualize random effects with confidence intervals, ordered by
    effect size. Named for their appearance when CI bars are plotted.

References:
    Robinson, G. K. (1991). That BLUP is a good thing: The estimation
    of random effects. Statistical Science, 6(1), 15-32.

Created: December 26, 2025
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
from scipy import stats


@dataclass
class RandomEffectsResult:
    """Result of random effects extraction and analysis."""

    # BLUPs
    blups: Dict[str, Dict[str, float]]

    # Variance components
    intercept_variance: float
    slope_variance: Optional[float]
    correlation: Optional[float]
    residual_variance: float

    # Shrinkage
    shrinkage_factors: Dict[str, float]

    # Summary
    n_groups: int
    blup_summary: Dict[str, Dict[str, float]]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "blups": self.blups,
            "variance_components": {
                "intercept": round(self.intercept_variance, 6),
                "slope": round(self.slope_variance, 6) if self.slope_variance else None,
                "correlation": round(self.correlation, 4) if self.correlation else None,
                "residual": round(self.residual_variance, 6),
            },
            "shrinkage": self.shrinkage_factors,
            "summary": self.blup_summary,
            "n_groups": self.n_groups,
        }


def extract_random_effects(lmm_result) -> RandomEffectsResult:
    """
    Extract random effects (BLUPs) from a fitted LMM.

    Args:
        lmm_result: LMMResult object from fit_linear_mixed_model

    Returns:
        RandomEffectsResult with BLUPs and related statistics
    """
    blups = lmm_result.random_effects_blups or {}
    re_var = lmm_result.random_effects_variance

    # Variance components
    intercept_var = re_var.get("Intercept", 0)
    slope_var = re_var.get("Slope", None)

    # Correlation
    re_corr = lmm_result.random_effects_correlation
    correlation = re_corr.get("intercept_slope") if re_corr else None

    # Calculate shrinkage factors
    # Shrinkage = τ² / (τ² + σ²/n_j) for group j
    residual_var = lmm_result.residual_variance
    shrinkage = {}

    # Would need group sizes for proper shrinkage calculation
    # Using approximate equal shrinkage based on average
    if intercept_var > 0:
        avg_shrinkage = intercept_var / (intercept_var + residual_var / 10)  # Approximate
        for group in blups:
            shrinkage[group] = round(avg_shrinkage, 4)

    # BLUP summary statistics
    if blups:
        intercept_blups = [b.get("Intercept", b.get("Group", 0)) for b in blups.values()]
        blup_summary = {
            "intercept": {
                "mean": round(float(np.mean(intercept_blups)), 4),
                "std": round(float(np.std(intercept_blups, ddof=1)), 4),
                "min": round(float(np.min(intercept_blups)), 4),
                "max": round(float(np.max(intercept_blups)), 4),
                "range": round(float(np.max(intercept_blups) - np.min(intercept_blups)), 4),
            }
        }

        if slope_var:
            slope_blups = [b.get("Slope", 0) for b in blups.values() if "Slope" in b]
            if slope_blups:
                blup_summary["slope"] = {
                    "mean": round(float(np.mean(slope_blups)), 4),
                    "std": round(float(np.std(slope_blups, ddof=1)), 4),
                    "min": round(float(np.min(slope_blups)), 4),
                    "max": round(float(np.max(slope_blups)), 4),
                }
    else:
        blup_summary = {}

    return RandomEffectsResult(
        blups=blups,
        intercept_variance=intercept_var,
        slope_variance=slope_var,
        correlation=correlation,
        residual_variance=residual_var,
        shrinkage_factors=shrinkage,
        n_groups=len(blups),
        blup_summary=blup_summary,
    )


def random_effects_variance(lmm_result) -> Dict[str, Any]:
    """
    Extract and summarize random effects variance components.

    Args:
        lmm_result: LMMResult object

    Returns:
        Dictionary with variance component information
    """
    re_var = lmm_result.random_effects_variance
    resid_var = lmm_result.residual_variance

    total_var = sum(re_var.values()) + resid_var
    icc = lmm_result.icc

    # Variance partition
    partition = {}
    for level, var in re_var.items():
        partition[level] = {
            "variance": round(var, 6),
            "proportion": round(var / total_var, 4) if total_var > 0 else 0,
            "std": round(np.sqrt(var), 6),
        }

    partition["residual"] = {
        "variance": round(resid_var, 6),
        "proportion": round(resid_var / total_var, 4) if total_var > 0 else 0,
        "std": round(np.sqrt(resid_var), 6),
    }

    return {
        "components": partition,
        "total_variance": round(total_var, 6),
        "icc": round(icc, 4),
        "design_effect": round(1 + (lmm_result.n_obs / lmm_result.n_groups - 1) * icc, 4),
    }


def caterpillar_plot_data(lmm_result, effect: str = "intercept", confidence_level: float = 0.95) -> Dict[str, Any]:
    """
    Generate data for a caterpillar plot of random effects.

    A caterpillar plot shows random effects ordered by magnitude
    with confidence intervals, useful for identifying groups that
    differ from the average.

    Args:
        lmm_result: LMMResult object
        effect: Which effect to plot ('intercept' or 'slope')
        confidence_level: Confidence level for intervals

    Returns:
        Dictionary with plot data for frontend visualization
    """
    blups = lmm_result.random_effects_blups

    if not blups:
        return {"error": "No random effects available", "groups": [], "effects": [], "ci_lower": [], "ci_upper": []}

    # Extract effect values
    effect_key = "Intercept" if effect == "intercept" else effect.capitalize()

    groups = []
    effects = []

    for group, values in blups.items():
        if effect_key in values or "Group" in values:
            groups.append(str(group))
            effects.append(values.get(effect_key, values.get("Group", 0)))

    if not effects:
        return {
            "error": f"Effect {effect} not found in random effects",
            "groups": [],
            "effects": [],
            "ci_lower": [],
            "ci_upper": [],
        }

    effects = np.array(effects)

    # Get variance for CI calculation
    if effect == "intercept":
        effect_var = lmm_result.random_effects_variance.get("Intercept", 0)
    else:
        effect_var = lmm_result.random_effects_variance.get("Slope", 0)

    effect_se = np.sqrt(effect_var) if effect_var > 0 else 0

    # Calculate confidence intervals
    z = stats.norm.ppf((1 + confidence_level) / 2)
    ci_lower = effects - z * effect_se
    ci_upper = effects + z * effect_se

    # Sort by effect size
    sort_idx = np.argsort(effects)

    return {
        "title": f"Random {effect.capitalize()} Effects",
        "effect_type": effect,
        "confidence_level": confidence_level,
        "groups": [groups[i] for i in sort_idx],
        "effects": [round(float(effects[i]), 4) for i in sort_idx],
        "ci_lower": [round(float(ci_lower[i]), 4) for i in sort_idx],
        "ci_upper": [round(float(ci_upper[i]), 4) for i in sort_idx],
        "reference_line": 0,
        "n_groups": len(groups),
        "summary": {
            "mean": round(float(np.mean(effects)), 4),
            "std": round(float(np.std(effects, ddof=1)), 4),
            "min": round(float(np.min(effects)), 4),
            "max": round(float(np.max(effects)), 4),
        },
    }


def group_specific_predictions(lmm_result, data: pd.DataFrame, grouping_var: str, x_var: str = None) -> Dict[str, Any]:
    """
    Generate group-specific prediction lines for visualization.

    Useful for showing how different groups have different
    intercepts (and slopes if random slope model).

    Args:
        lmm_result: LMMResult object
        data: Original data
        grouping_var: Name of grouping variable
        x_var: Predictor variable for x-axis

    Returns:
        Dictionary with prediction data per group
    """
    blups = lmm_result.random_effects_blups
    fixed = lmm_result.fixed_effects

    if not blups:
        return {"error": "No random effects available"}

    # Get fixed effects coefficients
    intercept = fixed.get("Intercept", {}).get("estimate", 0)
    slope = fixed.get(x_var, {}).get("estimate", 0) if x_var else 0

    # X range for predictions
    if x_var and x_var in data.columns:
        x_min = data[x_var].min()
        x_max = data[x_var].max()
        x_range = np.linspace(x_min, x_max, 50)
    else:
        x_range = np.array([0, 1])

    # Generate predictions per group
    predictions = {}
    for group, re in blups.items():
        group_intercept = intercept + re.get("Intercept", re.get("Group", 0))
        group_slope = slope + re.get("Slope", 0)

        y_pred = group_intercept + group_slope * x_range

        predictions[str(group)] = {
            "x": x_range.tolist(),
            "y": y_pred.tolist(),
            "intercept": round(group_intercept, 4),
            "slope": round(group_slope, 4),
        }

    # Overall mean line
    overall_y = intercept + slope * x_range

    return {
        "groups": predictions,
        "overall": {
            "x": x_range.tolist(),
            "y": overall_y.tolist(),
            "intercept": round(intercept, 4),
            "slope": round(slope, 4),
        },
        "x_variable": x_var,
        "x_range": {"min": float(x_range.min()), "max": float(x_range.max())},
    }


def shrinkage_plot_data(lmm_result, data: pd.DataFrame, grouping_var: str, outcome_var: str) -> Dict[str, Any]:
    """
    Generate data for shrinkage plot comparing OLS estimates to BLUPs.

    Shows how group-specific estimates are shrunk toward the
    grand mean, with more shrinkage for smaller groups.

    Args:
        lmm_result: LMMResult object
        data: Original data
        grouping_var: Grouping variable
        outcome_var: Outcome variable

    Returns:
        Dictionary with shrinkage plot data
    """
    blups = lmm_result.random_effects_blups

    if not blups:
        return {"error": "No random effects available"}

    # Calculate OLS (un-shrunk) group means
    grand_mean = data[outcome_var].mean()
    group_stats = data.groupby(grouping_var)[outcome_var].agg(["mean", "count"])

    # Prepare data
    groups = []
    ols_estimates = []
    blup_estimates = []
    group_sizes = []

    for group, row in group_stats.iterrows():
        group_str = str(group)
        if group_str in blups:
            groups.append(group_str)
            ols_estimates.append(row["mean"] - grand_mean)
            blup_val = blups[group_str].get("Intercept", blups[group_str].get("Group", 0))
            blup_estimates.append(blup_val)
            group_sizes.append(row["count"])

    return {
        "groups": groups,
        "ols_estimates": [round(x, 4) for x in ols_estimates],
        "blup_estimates": [round(x, 4) for x in blup_estimates],
        "group_sizes": [int(x) for x in group_sizes],
        "grand_mean": round(grand_mean, 4),
        "shrinkage_ratio": [
            round(abs(b) / abs(o), 4) if abs(o) > 0.001 else 1.0 for o, b in zip(ols_estimates, blup_estimates)
        ],
        "interpretation": (
            "Points below the diagonal line show shrinkage toward zero. " "Smaller groups experience more shrinkage."
        ),
    }


def random_effects_qq_plot(lmm_result, effect: str = "intercept") -> Dict[str, Any]:
    """
    Generate Q-Q plot data for random effects normality check.

    Random effects are assumed to be normally distributed.
    Q-Q plot helps verify this assumption.

    Args:
        lmm_result: LMMResult object
        effect: Which effect ('intercept' or 'slope')

    Returns:
        Dictionary with Q-Q plot data
    """
    blups = lmm_result.random_effects_blups

    if not blups:
        return {"error": "No random effects available"}

    # Extract values
    effect_key = "Intercept" if effect == "intercept" else effect.capitalize()
    values = []

    for group, re in blups.items():
        if effect_key in re:
            values.append(re[effect_key])
        elif "Group" in re:
            values.append(re["Group"])

    if not values:
        return {"error": f"Effect {effect} not found"}

    values = np.array(values)
    n = len(values)

    # Standardize
    values_std = (values - np.mean(values)) / np.std(values, ddof=1) if np.std(values, ddof=1) > 0 else values

    # Theoretical quantiles
    theoretical = stats.norm.ppf((np.arange(1, n + 1) - 0.5) / n)

    # Sort observed
    observed_sorted = np.sort(values_std)

    # Shapiro-Wilk test
    if n >= 3:
        shapiro_stat, shapiro_p = stats.shapiro(values)
    else:
        shapiro_stat, shapiro_p = None, None

    return {
        "theoretical_quantiles": theoretical.tolist(),
        "observed_quantiles": observed_sorted.tolist(),
        "reference_line": {"slope": 1, "intercept": 0},
        "effect_type": effect,
        "n_groups": n,
        "normality_test": {
            "test": "Shapiro-Wilk",
            "statistic": round(shapiro_stat, 4) if shapiro_stat else None,
            "p_value": round(shapiro_p, 4) if shapiro_p else None,
            "normal": shapiro_p > 0.05 if shapiro_p else None,
        },
    }
