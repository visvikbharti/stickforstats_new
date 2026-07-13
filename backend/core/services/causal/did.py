"""
Difference-in-Differences (DiD) Module
======================================

Implements Difference-in-Differences estimation for causal inference
from panel/longitudinal data.

DiD compares changes over time between treatment and control groups:
    DiD = (Y_treat_post - Y_treat_pre) - (Y_control_post - Y_control_pre)

Key Assumptions:
1. Parallel Trends: Treatment and control would have evolved similarly
   without treatment
2. No Spillovers: Treatment of some units doesn't affect control units
3. Stable Composition: Same units in each group over time

Methods Implemented:
1. Basic 2x2 DiD (two groups, two periods)
2. Generalized DiD with multiple time periods
3. Staggered adoption (Callaway & Sant'Anna, 2021)
4. Parallel trends testing
5. Event study / dynamic effects

References:
    Angrist, J. D., & Pischke, J. S. (2009). Mostly Harmless Econometrics.

    Callaway, B., & Sant'Anna, P. H. (2021). Difference-in-differences
    with multiple time periods. Journal of Econometrics.

    Roth, J. (2022). Pretest with caution: Event-study estimates after
    testing for parallel trends.

Created: December 27, 2025
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Union
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression


@dataclass
class DiDResult:
    """Result of Difference-in-Differences analysis."""

    # Main estimate
    did_estimate: float
    std_error: float
    t_statistic: float
    p_value: float
    ci_lower: float
    ci_upper: float

    # Components
    treat_pre_mean: float
    treat_post_mean: float
    control_pre_mean: float
    control_post_mean: float

    # Changes
    treat_change: float
    control_change: float

    # Sample sizes
    n_total: int
    n_treat: int
    n_control: int
    n_pre: int
    n_post: int

    # Model info
    method: str
    covariates_used: List[str]
    clustered_se: bool

    # Parallel trends
    parallel_trends_test: Optional[Dict[str, Any]]

    interpretation: str
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "estimate": {
                "did": self.did_estimate,
                "std_error": self.std_error,
                "t_statistic": self.t_statistic,
                "p_value": self.p_value,
                "ci_lower": self.ci_lower,
                "ci_upper": self.ci_upper,
            },
            "group_means": {
                "treatment_pre": self.treat_pre_mean,
                "treatment_post": self.treat_post_mean,
                "control_pre": self.control_pre_mean,
                "control_post": self.control_post_mean,
            },
            "changes": {
                "treatment": self.treat_change,
                "control": self.control_change,
                "difference": self.did_estimate,
            },
            "sample_sizes": {
                "total": self.n_total,
                "treatment": self.n_treat,
                "control": self.n_control,
                "pre_period": self.n_pre,
                "post_period": self.n_post,
            },
            "method": self.method,
            "covariates": self.covariates_used,
            "clustered_se": self.clustered_se,
            "parallel_trends_test": self.parallel_trends_test,
            "interpretation": self.interpretation,
            "warnings": self.warnings,
        }


@dataclass
class EventStudyResult:
    """Result of event study analysis."""

    # Coefficients for each period relative to treatment
    coefficients: Dict[int, float]  # period -> coefficient
    std_errors: Dict[int, float]
    ci_lower: Dict[int, float]
    ci_upper: Dict[int, float]
    p_values: Dict[int, float]

    # Reference period
    reference_period: int

    # Pre-trend test
    pre_trend_test: Dict[str, Any]

    # Sample info
    n: int
    n_periods: int

    interpretation: str
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        periods = sorted(self.coefficients.keys())
        return {
            "coefficients": [
                {
                    "period": p,
                    "estimate": self.coefficients[p],
                    "std_error": self.std_errors[p],
                    "ci_lower": self.ci_lower[p],
                    "ci_upper": self.ci_upper[p],
                    "p_value": self.p_values[p],
                    "significant": self.p_values[p] < 0.05,
                }
                for p in periods
            ],
            "reference_period": self.reference_period,
            "pre_trend_test": self.pre_trend_test,
            "sample_size": self.n,
            "n_periods": self.n_periods,
            "interpretation": self.interpretation,
            "warnings": self.warnings,
        }


def difference_in_differences(
    data: pd.DataFrame,
    outcome: str,
    treatment_group: str,
    post_period: str,
    covariates: Optional[List[str]] = None,
    cluster_var: Optional[str] = None,
    test_parallel_trends: bool = True,
) -> DiDResult:
    """
    Perform basic Difference-in-Differences estimation.

    Model: Y = β₀ + β₁*Treat + β₂*Post + β₃*Treat×Post + ε

    The DiD estimate is β₃.

    Args:
        data: Panel DataFrame
        outcome: Name of outcome variable
        treatment_group: Binary variable (1 = treatment group, 0 = control)
        post_period: Binary variable (1 = post-treatment, 0 = pre-treatment)
        covariates: Optional list of control variables
        cluster_var: Variable to cluster standard errors on (e.g., unit ID)
        test_parallel_trends: Whether to test parallel trends (requires multiple pre-periods)

    Returns:
        DiDResult with DiD estimate and diagnostics
    """
    warnings = []

    if covariates is None:
        covariates = []

    # Extract variables
    Y = data[outcome].values
    D = data[treatment_group].values  # Treatment group indicator
    P = data[post_period].values  # Post period indicator

    n = len(Y)

    # Calculate group means
    treat_pre = Y[(D == 1) & (P == 0)]
    treat_post = Y[(D == 1) & (P == 1)]
    control_pre = Y[(D == 0) & (P == 0)]
    control_post = Y[(D == 0) & (P == 1)]

    treat_pre_mean = np.mean(treat_pre) if len(treat_pre) > 0 else np.nan
    treat_post_mean = np.mean(treat_post) if len(treat_post) > 0 else np.nan
    control_pre_mean = np.mean(control_pre) if len(control_pre) > 0 else np.nan
    control_post_mean = np.mean(control_post) if len(control_post) > 0 else np.nan

    # Calculate DiD manually
    treat_change = treat_post_mean - treat_pre_mean
    control_change = control_post_mean - control_pre_mean
    treat_change - control_change

    # Regression-based DiD
    # Y = β₀ + β₁*D + β₂*P + β₃*D*P + covariates + ε
    interaction = D * P

    X = np.column_stack([np.ones(n), D, P, interaction])
    if covariates:
        X = np.hstack([X, data[covariates].values])

    model = LinearRegression(fit_intercept=False)
    model.fit(X, Y)

    did_estimate = model.coef_[3]  # Coefficient on interaction

    # Standard errors
    residuals = Y - model.predict(X)

    if cluster_var and cluster_var in data.columns:
        # Clustered standard errors
        se = _clustered_se(X, residuals, data[cluster_var].values)[3]
        clustered = True
    else:
        # Robust (HC1) standard errors
        se = _robust_se(X, residuals)[3]
        clustered = False

    # Inference
    t_stat = did_estimate / se
    df = n - X.shape[1]
    p_value = 2 * (stats.t.sf(abs(t_stat), df))
    z_crit = stats.norm.ppf(0.975)
    ci_lower = did_estimate - z_crit * se
    ci_upper = did_estimate + z_crit * se

    # Parallel trends test (if applicable)
    parallel_test = None
    if test_parallel_trends:
        try:
            parallel_test = test_parallel_trends_simple(data, outcome, treatment_group, post_period)
            if parallel_test.get("p_value", 1) < 0.05:
                warnings.append("Parallel trends assumption may be violated (p < 0.05)")
        except Exception:
            parallel_test = {"error": "Could not perform parallel trends test"}

    # Sample sizes
    n_treat = int(np.sum(D == 1))
    n_control = int(np.sum(D == 0))
    n_pre = int(np.sum(P == 0))
    n_post = int(np.sum(P == 1))

    # Interpretation
    interpretation = _interpret_did(did_estimate, p_value, treat_change, control_change)

    return DiDResult(
        did_estimate=float(did_estimate),
        std_error=float(se),
        t_statistic=float(t_stat),
        p_value=float(p_value),
        ci_lower=float(ci_lower),
        ci_upper=float(ci_upper),
        treat_pre_mean=float(treat_pre_mean),
        treat_post_mean=float(treat_post_mean),
        control_pre_mean=float(control_pre_mean),
        control_post_mean=float(control_post_mean),
        treat_change=float(treat_change),
        control_change=float(control_change),
        n_total=n,
        n_treat=n_treat,
        n_control=n_control,
        n_pre=n_pre,
        n_post=n_post,
        method="twfe" if covariates else "basic_2x2",
        covariates_used=covariates,
        clustered_se=clustered,
        parallel_trends_test=parallel_test,
        interpretation=interpretation,
        warnings=warnings,
    )


def event_study(
    data: pd.DataFrame,
    outcome: str,
    treatment_group: str,
    time_var: str,
    treatment_time: Union[str, int],
    unit_var: Optional[str] = None,
    covariates: Optional[List[str]] = None,
    reference_period: int = -1,
    pre_periods: int = 4,
    post_periods: int = 4,
) -> EventStudyResult:
    """
    Perform event study analysis with dynamic treatment effects.

    Estimates effects for each period relative to treatment:
    Y_it = α_i + λ_t + Σ_k β_k * 1{t - t_i = k} * D_i + X_it'γ + ε_it

    Args:
        data: Panel DataFrame
        outcome: Outcome variable
        treatment_group: Binary treatment indicator
        time_var: Time period variable
        treatment_time: When treatment occurred (period or column name)
        unit_var: Unit identifier (for fixed effects)
        covariates: Control variables
        reference_period: Reference period (usually -1, the period before treatment)
        pre_periods: Number of pre-treatment periods to include
        post_periods: Number of post-treatment periods to include

    Returns:
        EventStudyResult with dynamic effects
    """
    warnings = []

    if covariates is None:
        covariates = []

    # Create relative time variable
    if isinstance(treatment_time, str):
        # treatment_time is a column with unit-specific treatment times
        if treatment_time in data.columns:
            data = data.copy()
            data["_rel_time"] = data[time_var] - data[treatment_time]
        else:
            raise ValueError(f"Column {treatment_time} not found")
    else:
        # treatment_time is a single value
        data = data.copy()
        data["_rel_time"] = data[time_var] - treatment_time

    # Filter to relevant periods
    periods = range(-pre_periods, post_periods + 1)
    data_filtered = data[data["_rel_time"].isin(periods)].copy()

    Y = data_filtered[outcome].values
    D = data_filtered[treatment_group].values
    rel_time = data_filtered["_rel_time"].values

    n = len(Y)

    # Create period dummies interacted with treatment
    # Omit reference period
    period_dummies = {}
    for p in periods:
        if p == reference_period:
            continue
        period_dummies[p] = ((rel_time == p) & (D == 1)).astype(float)

    # Build design matrix
    X = np.ones((n, 1))  # Intercept

    # Add time fixed effects
    time_vals = data_filtered[time_var].unique()
    for t in time_vals[1:]:  # Omit first time period
        X = np.column_stack([X, (data_filtered[time_var] == t).astype(float)])

    # Add unit fixed effects if provided
    if unit_var and unit_var in data_filtered.columns:
        unit_vals = data_filtered[unit_var].unique()
        for u in unit_vals[1:]:  # Omit first unit
            X = np.column_stack([X, (data_filtered[unit_var] == u).astype(float)])

    # Add treatment group main effect
    X = np.column_stack([X, D])

    # Add period-specific treatment effects
    period_cols = {}
    for p in sorted(period_dummies.keys()):
        col_idx = X.shape[1]
        X = np.column_stack([X, period_dummies[p]])
        period_cols[p] = col_idx

    # Add covariates
    if covariates:
        X = np.hstack([X, data_filtered[covariates].values])

    # Fit model
    model = LinearRegression(fit_intercept=False)
    model.fit(X, Y)

    residuals = Y - model.predict(X)
    se_all = _robust_se(X, residuals)

    # Extract coefficients for each period
    coefficients = {reference_period: 0.0}  # Reference = 0
    std_errors = {reference_period: 0.0}
    p_values = {reference_period: 1.0}

    for p, col_idx in period_cols.items():
        coefficients[p] = float(model.coef_[col_idx])
        std_errors[p] = float(se_all[col_idx])
        t = coefficients[p] / std_errors[p] if std_errors[p] > 0 else 0
        p_values[p] = float(2 * (stats.norm.sf(abs(t))))

    # Confidence intervals
    z_crit = stats.norm.ppf(0.975)
    ci_lower = {p: coefficients[p] - z_crit * std_errors[p] for p in coefficients}
    ci_upper = {p: coefficients[p] + z_crit * std_errors[p] for p in coefficients}

    # Pre-trend test: joint test that all pre-treatment coefficients = 0
    pre_coefs = [coefficients[p] for p in periods if p < 0 and p != reference_period]
    pre_ses = [std_errors[p] for p in periods if p < 0 and p != reference_period]

    if len(pre_coefs) > 0 and all(se > 0 for se in pre_ses):
        # Wald test
        chi_sq = sum((c / s) ** 2 for c, s in zip(pre_coefs, pre_ses))
        df_pre = len(pre_coefs)
        p_pre = stats.chi2.sf(chi_sq, df_pre)

        pre_trend_test = {
            "test": "joint_wald",
            "chi_square": float(chi_sq),
            "df": df_pre,
            "p_value": float(p_pre),
            "pre_trend_significant": p_pre < 0.05,
        }

        if p_pre < 0.05:
            warnings.append("Pre-trend test significant - parallel trends may be violated")
    else:
        pre_trend_test = {"test": "not_available", "reason": "Insufficient pre-periods"}

    # Interpretation
    interpretation = _interpret_event_study(coefficients, p_values, reference_period)

    return EventStudyResult(
        coefficients=coefficients,
        std_errors=std_errors,
        ci_lower=ci_lower,
        ci_upper=ci_upper,
        p_values=p_values,
        reference_period=reference_period,
        pre_trend_test=pre_trend_test,
        n=n,
        n_periods=len(periods),
        interpretation=interpretation,
        warnings=warnings,
    )


def test_parallel_trends_simple(
    data: pd.DataFrame, outcome: str, treatment_group: str, post_period: str, time_var: Optional[str] = None
) -> Dict[str, Any]:
    """
    Simple test for parallel trends assumption.

    Tests if pre-treatment trends differ between treatment and control groups.

    If time_var is provided, tests for differential trends.
    Otherwise, tests if pre-treatment levels differ.

    Args:
        data: DataFrame
        outcome: Outcome variable
        treatment_group: Treatment indicator
        post_period: Post-treatment indicator
        time_var: Optional time variable for trend test

    Returns:
        Dictionary with test results
    """
    # Get pre-treatment data
    pre_data = data[data[post_period] == 0].copy()

    if len(pre_data) < 10:
        return {"test": "insufficient_data", "message": "Not enough pre-treatment observations"}

    Y = pre_data[outcome].values
    D = pre_data[treatment_group].values

    if time_var and time_var in pre_data.columns:
        # Test for differential pre-trends
        T = pre_data[time_var].values

        # Regression: Y = α + β₁*T + β₂*D + β₃*T*D + ε
        # Test H₀: β₃ = 0 (parallel trends)
        X = np.column_stack([np.ones(len(Y)), T, D, T * D])
        model = LinearRegression(fit_intercept=False)
        model.fit(X, Y)

        interaction_coef = model.coef_[3]
        residuals = Y - model.predict(X)
        se = _robust_se(X, residuals)[3]

        t_stat = interaction_coef / se if se > 0 else 0
        p_value = 2 * (stats.t.sf(abs(t_stat), len(Y) - 4))

        return {
            "test": "differential_trends",
            "interaction_coefficient": float(interaction_coef),
            "std_error": float(se),
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "parallel_trends_supported": p_value >= 0.05,
            "interpretation": (
                "No significant differential pre-trends"
                if p_value >= 0.05
                else "Warning: Significant differential pre-trends detected"
            ),
        }
    else:
        # Simple t-test of pre-treatment levels
        treat_pre = Y[D == 1]
        control_pre = Y[D == 0]

        t_stat, p_value = stats.ttest_ind(treat_pre, control_pre)

        return {
            "test": "pre_treatment_levels",
            "treatment_mean": float(np.mean(treat_pre)),
            "control_mean": float(np.mean(control_pre)),
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "similar_levels": p_value >= 0.05,
            "interpretation": (
                "Pre-treatment levels are similar"
                if p_value >= 0.05
                else "Warning: Pre-treatment levels differ significantly"
            ),
        }


def staggered_did(
    data: pd.DataFrame,
    outcome: str,
    unit_var: str,
    time_var: str,
    treatment_time_var: str,
    covariates: Optional[List[str]] = None,
    control_group: str = "never_treated",
) -> Dict[str, Any]:
    """
    Difference-in-Differences with staggered treatment adoption.

    Implements a simplified version of Callaway & Sant'Anna (2021) approach:
    - Computes group-time ATTs
    - Aggregates to overall ATT

    Args:
        data: Panel DataFrame
        outcome: Outcome variable
        unit_var: Unit identifier
        time_var: Time period variable
        treatment_time_var: Variable indicating when each unit was treated (inf if never)
        covariates: Control variables
        control_group: 'never_treated' or 'not_yet_treated'

    Returns:
        Dictionary with group-time effects and aggregate ATT
    """
    warnings = []

    if covariates is None:
        covariates = []

    data = data.copy()

    # Identify treatment cohorts (groups)
    treatment_times = data.groupby(unit_var)[treatment_time_var].first()
    cohorts = treatment_times[treatment_times < np.inf].unique()

    if len(cohorts) == 0:
        return {"error": "No treated units found"}

    # Identify never-treated units
    never_treated = treatment_times[treatment_times == np.inf].index

    if control_group == "never_treated" and len(never_treated) == 0:
        warnings.append("No never-treated units - using not-yet-treated as control")
        control_group = "not_yet_treated"

    # Compute group-time ATTs
    group_time_effects = []
    time_periods = sorted(data[time_var].unique())

    for g in sorted(cohorts):
        # Units treated at time g
        treated_units = treatment_times[treatment_times == g].index

        for t in time_periods:
            if t < g:
                # Pre-treatment period
                continue

            # Get treated observations at time t
            treat_data = data[(data[unit_var].isin(treated_units)) & (data[time_var] == t)]

            if len(treat_data) == 0:
                continue

            # Get control observations
            if control_group == "never_treated":
                control_data = data[(data[unit_var].isin(never_treated)) & (data[time_var] == t)]
            else:
                # Not yet treated at time t
                not_yet = treatment_times[treatment_times > t].index
                control_data = data[(data[unit_var].isin(not_yet)) & (data[time_var] == t)]

            if len(control_data) < 5:
                continue

            # Get baseline (t = g-1) for both groups
            baseline_t = g - 1
            if baseline_t not in time_periods:
                continue

            treat_baseline = data[(data[unit_var].isin(treated_units)) & (data[time_var] == baseline_t)]
            control_baseline = data[
                (data[unit_var].isin(control_data[unit_var].unique())) & (data[time_var] == baseline_t)
            ]

            if len(treat_baseline) == 0 or len(control_baseline) == 0:
                continue

            # DiD for this (g, t) pair
            treat_change = treat_data[outcome].mean() - treat_baseline[outcome].mean()
            control_change = control_data[outcome].mean() - control_baseline[outcome].mean()

            att_gt = treat_change - control_change

            # Simple SE (could use bootstrap)
            n_treat = len(treat_data)
            n_control = len(control_data)
            se = np.sqrt(treat_data[outcome].var() / n_treat + control_data[outcome].var() / n_control)

            group_time_effects.append(
                {
                    "cohort": int(g),
                    "time": int(t),
                    "att": float(att_gt),
                    "std_error": float(se),
                    "n_treated": n_treat,
                    "n_control": n_control,
                    "periods_since_treatment": int(t - g),
                }
            )

    if len(group_time_effects) == 0:
        return {"error": "Could not compute any group-time effects"}

    # Aggregate to overall ATT (simple average, weighted by n_treated)
    total_weight = sum(e["n_treated"] for e in group_time_effects)
    overall_att = sum(e["att"] * e["n_treated"] for e in group_time_effects) / total_weight

    # SE via delta method (simplified)
    overall_se = np.sqrt(sum((e["std_error"] * e["n_treated"] / total_weight) ** 2 for e in group_time_effects))

    t_stat = overall_att / overall_se if overall_se > 0 else 0
    p_value = 2 * (stats.norm.sf(abs(t_stat)))

    # Aggregate by event time
    event_time_effects = {}
    for e in group_time_effects:
        et = e["periods_since_treatment"]
        if et not in event_time_effects:
            event_time_effects[et] = []
        event_time_effects[et].append(e)

    event_time_summary = []
    for et in sorted(event_time_effects.keys()):
        effects = event_time_effects[et]
        wt = sum(e["n_treated"] for e in effects)
        avg = sum(e["att"] * e["n_treated"] for e in effects) / wt
        event_time_summary.append(
            {"event_time": et, "att": float(avg), "n_cohorts": len(set(e["cohort"] for e in effects))}
        )

    return {
        "overall_att": {
            "estimate": float(overall_att),
            "std_error": float(overall_se),
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "ci_lower": float(overall_att - stats.norm.ppf(0.975) * overall_se),
            "ci_upper": float(overall_att + stats.norm.ppf(0.975) * overall_se),
        },
        "group_time_effects": group_time_effects,
        "event_time_effects": event_time_summary,
        "n_cohorts": len(cohorts),
        "cohorts": sorted([int(c) for c in cohorts]),
        "control_group": control_group,
        "n_group_time_estimates": len(group_time_effects),
        "warnings": warnings,
    }


# ==================== Helper Functions ====================


def _robust_se(X: np.ndarray, residuals: np.ndarray) -> np.ndarray:
    """HC1 robust standard errors."""
    n, k = X.shape
    XtX_inv = np.linalg.inv(X.T @ X)
    scale = n / (n - k)  # HC1 adjustment

    meat = X.T @ np.diag(residuals**2) @ X * scale
    sandwich = XtX_inv @ meat @ XtX_inv

    return np.sqrt(np.diag(sandwich))


def _clustered_se(X: np.ndarray, residuals: np.ndarray, clusters: np.ndarray) -> np.ndarray:
    """Clustered standard errors."""
    n, k = X.shape
    unique_clusters = np.unique(clusters)
    G = len(unique_clusters)

    XtX_inv = np.linalg.inv(X.T @ X)

    # Compute meat: sum of outer products by cluster
    meat = np.zeros((k, k))
    for c in unique_clusters:
        idx = clusters == c
        Xc = X[idx]
        ec = residuals[idx]
        score_c = Xc.T @ ec
        meat += np.outer(score_c, score_c)

    # Finite sample adjustment
    adjustment = (G / (G - 1)) * ((n - 1) / (n - k))
    meat *= adjustment

    sandwich = XtX_inv @ meat @ XtX_inv

    return np.sqrt(np.diag(sandwich))


def _interpret_did(did: float, p_value: float, treat_change: float, control_change: float) -> str:
    """Interpret DiD results."""
    parts = []

    if p_value < 0.05:
        direction = "increased" if did > 0 else "decreased"
        parts.append(f"Significant treatment effect: outcome {direction} by {abs(did):.3f}")
    else:
        parts.append("No statistically significant treatment effect detected")

    parts.append(f"Treatment group changed by {treat_change:+.3f}")
    parts.append(f"Control group changed by {control_change:+.3f}")

    return ". ".join(parts) + "."


def _interpret_event_study(coefs: Dict[int, float], pvals: Dict[int, float], ref: int) -> str:
    """Interpret event study results."""
    parts = []

    # Pre-treatment
    pre_sig = [p for p in coefs.keys() if p < 0 and p != ref and pvals.get(p, 1) < 0.05]
    if pre_sig:
        parts.append(f"Warning: {len(pre_sig)} pre-treatment period(s) show significant effects")
    else:
        parts.append("No significant pre-treatment effects (supports parallel trends)")

    # Post-treatment
    post_sig = [p for p in coefs.keys() if p >= 0 and pvals.get(p, 1) < 0.05]
    if post_sig:
        parts.append(f"Significant effects in {len(post_sig)} post-treatment period(s)")

        # Check if effects grow over time
        post_coefs = [(p, coefs[p]) for p in sorted(post_sig)]
        if len(post_coefs) > 1:
            if all(post_coefs[i][1] <= post_coefs[i + 1][1] for i in range(len(post_coefs) - 1)):
                parts.append("Treatment effects appear to grow over time")
    else:
        parts.append("No significant post-treatment effects")

    return ". ".join(parts) + "."
