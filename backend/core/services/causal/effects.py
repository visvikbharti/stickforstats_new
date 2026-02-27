"""
Treatment Effect Estimation Module
==================================

Implements methods for estimating causal treatment effects.

Estimands:
- ATE (Average Treatment Effect): E[Y(1) - Y(0)]
- ATT (Average Treatment Effect on Treated): E[Y(1) - Y(0) | T=1]
- ATU (Average Treatment Effect on Untreated): E[Y(1) - Y(0) | T=0]

Methods:
- Difference in means (unadjusted)
- Regression adjustment
- IPW (Inverse Probability Weighting)
- AIPW (Doubly Robust / Augmented IPW)

References:
    Imbens, G. W., & Rubin, D. B. (2015). Causal Inference.
    Bang, H., & Robins, J. M. (2005). Doubly robust estimation
    in missing data and causal inference models.

Created: December 26, 2025
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression, LogisticRegression


@dataclass
class TreatmentEffectResult:
    """Result of treatment effect estimation."""

    estimand: str  # 'ate', 'att', 'atu'
    method: str
    estimate: float
    std_error: float
    ci_lower: float
    ci_upper: float
    p_value: float
    n_treated: int
    n_control: int
    diagnostics: Dict[str, Any]
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "estimand": self.estimand,
            "method": self.method,
            "estimate": self.estimate,
            "std_error": self.std_error,
            "confidence_interval": {"lower": self.ci_lower, "upper": self.ci_upper, "level": 0.95},
            "p_value": self.p_value,
            "sample_sizes": {
                "treated": self.n_treated,
                "control": self.n_control,
                "total": self.n_treated + self.n_control,
            },
            "diagnostics": self.diagnostics,
            "warnings": self.warnings,
        }


def estimate_ate(
    data: pd.DataFrame,
    treatment: str,
    outcome: str,
    covariates: Optional[List[str]] = None,
    method: str = "regression",
    confidence_level: float = 0.95,
) -> TreatmentEffectResult:
    """
    Estimate Average Treatment Effect (ATE).

    ATE = E[Y(1) - Y(0)] = E[Y|T=1] - E[Y|T=0] under ignorability.

    Args:
        data: DataFrame with treatment, outcome, and covariates
        treatment: Name of binary treatment variable
        outcome: Name of outcome variable
        covariates: List of covariates for adjustment
        method: 'unadjusted', 'regression', or 'ipw'

    Returns:
        TreatmentEffectResult with estimate and inference
    """
    warnings = []

    T = data[treatment].values
    Y = data[outcome].values

    n_treated = int(np.sum(T == 1))
    n_control = int(np.sum(T == 0))

    if method == "unadjusted":
        # Simple difference in means
        y1 = Y[T == 1]
        y0 = Y[T == 0]

        ate = np.mean(y1) - np.mean(y0)
        se = np.sqrt(np.var(y1, ddof=1) / n_treated + np.var(y0, ddof=1) / n_control)

        diagnostics = {
            "mean_treated": float(np.mean(y1)),
            "mean_control": float(np.mean(y0)),
            "sd_treated": float(np.std(y1, ddof=1)),
            "sd_control": float(np.std(y0, ddof=1)),
        }

    elif method == "regression":
        # Regression adjustment
        if covariates is None:
            covariates = []

        # Fit regression: Y ~ T + X
        X_cols = [treatment] + covariates
        X = data[X_cols].values

        # Add intercept
        X = np.column_stack([np.ones(len(X)), X])

        # OLS estimation
        model = LinearRegression(fit_intercept=False)
        model.fit(X, Y)

        # ATE is coefficient on treatment
        ate = model.coef_[1]

        # Standard error via sandwich estimator (simplified)
        residuals = Y - model.predict(X)
        n = len(Y)
        X.shape[1]

        # Heteroskedasticity-robust SE
        meat = X.T @ np.diag(residuals**2) @ X / n
        bread = np.linalg.inv(X.T @ X / n)
        sandwich = bread @ meat @ bread / n

        se = np.sqrt(sandwich[1, 1])

        diagnostics = {
            "method": "OLS with covariates",
            "n_covariates": len(covariates),
            "r_squared": float(1 - np.sum(residuals**2) / np.sum((Y - np.mean(Y)) ** 2)),
            "coefficients": {treatment: float(ate)},
        }

        if covariates:
            for i, cov in enumerate(covariates):
                diagnostics["coefficients"][cov] = float(model.coef_[i + 2])

    elif method == "ipw":
        # IPW estimation
        if covariates is None or len(covariates) == 0:
            warnings.append("IPW without covariates reduces to unadjusted estimate")
            return estimate_ate(data, treatment, outcome, None, "unadjusted")

        # Estimate propensity scores
        X_cov = data[covariates].values

        ps_model = LogisticRegression(max_iter=1000)
        ps_model.fit(X_cov, T)
        ps = ps_model.predict_proba(X_cov)[:, 1]
        ps = np.clip(ps, 0.01, 0.99)

        # IPW weights
        weights = np.where(T == 1, 1 / ps, 1 / (1 - ps))

        # Normalize weights
        weights_t = weights[T == 1]
        weights_c = weights[T == 0]
        weights[T == 1] = weights_t / np.sum(weights_t) * n_treated
        weights[T == 0] = weights_c / np.sum(weights_c) * n_control

        # Weighted means
        y1_weighted = np.sum(Y[T == 1] * weights[T == 1]) / np.sum(weights[T == 1])
        y0_weighted = np.sum(Y[T == 0] * weights[T == 0]) / np.sum(weights[T == 0])

        ate = y1_weighted - y0_weighted

        # Standard error via influence functions
        # Simplified sandwich estimator
        mu1 = y1_weighted
        mu0 = y0_weighted

        # Influence function for treated
        psi_1 = (T / ps) * (Y - mu1)
        # Influence function for control
        psi_0 = ((1 - T) / (1 - ps)) * (Y - mu0)

        psi = psi_1 - psi_0
        se = np.sqrt(np.var(psi, ddof=1) / n_treated / n_control * (n_treated + n_control))

        # Effective sample size
        ess_t = np.sum(weights[T == 1]) ** 2 / np.sum(weights[T == 1] ** 2)
        ess_c = np.sum(weights[T == 0]) ** 2 / np.sum(weights[T == 0] ** 2)

        diagnostics = {
            "method": "Inverse Probability Weighting",
            "propensity_score": {"mean": float(np.mean(ps)), "min": float(np.min(ps)), "max": float(np.max(ps))},
            "effective_sample_size": {"treated": float(ess_t), "control": float(ess_c)},
            "weighted_means": {"treated": float(y1_weighted), "control": float(y0_weighted)},
        }

    else:
        raise ValueError(f"Unknown method: {method}")

    # Inference
    z_crit = stats.norm.ppf(1 - (1 - confidence_level) / 2)
    t_stat = ate / se if se > 0 else 0
    p_value = 2 * (1 - stats.norm.cdf(abs(t_stat)))
    ci_lower = ate - z_crit * se
    ci_upper = ate + z_crit * se

    return TreatmentEffectResult(
        estimand="ate",
        method=method,
        estimate=float(ate),
        std_error=float(se),
        ci_lower=float(ci_lower),
        ci_upper=float(ci_upper),
        p_value=float(p_value),
        n_treated=n_treated,
        n_control=n_control,
        diagnostics=diagnostics,
        warnings=warnings,
    )


def estimate_att(
    data: pd.DataFrame,
    treatment: str,
    outcome: str,
    covariates: Optional[List[str]] = None,
    method: str = "regression",
    confidence_level: float = 0.95,
) -> TreatmentEffectResult:
    """
    Estimate Average Treatment Effect on Treated (ATT).

    ATT = E[Y(1) - Y(0) | T=1]

    Args:
        data: DataFrame with treatment, outcome, and covariates
        treatment: Name of binary treatment variable
        outcome: Name of outcome variable
        covariates: List of covariates for adjustment
        method: 'unadjusted', 'regression', or 'ipw'

    Returns:
        TreatmentEffectResult with ATT estimate
    """
    warnings = []

    T = data[treatment].values
    Y = data[outcome].values

    n_treated = int(np.sum(T == 1))
    n_control = int(np.sum(T == 0))

    if method == "unadjusted":
        # For ATT, we need to model E[Y(0)|T=1]
        # Simple approach: use control mean (biased without adjustment)
        y1 = Y[T == 1]
        y0 = Y[T == 0]

        att = np.mean(y1) - np.mean(y0)
        se = np.sqrt(np.var(y1, ddof=1) / n_treated + np.var(y0, ddof=1) / n_control)

        warnings.append("Unadjusted ATT assumes no confounding")

        diagnostics = {"mean_treated": float(np.mean(y1)), "mean_control": float(np.mean(y0))}

    elif method == "regression":
        # Regression adjustment with interaction terms
        if covariates is None:
            covariates = []

        # Predict Y(0) for treated using control group
        X_cov = data[covariates].values if covariates else np.ones((len(Y), 1))

        # Fit model on control group
        control_model = LinearRegression()
        control_model.fit(X_cov[T == 0], Y[T == 0])

        # Predict counterfactual Y(0) for treated
        y0_pred = control_model.predict(X_cov[T == 1])

        # ATT = E[Y(1) | T=1] - E[Y(0) | T=1]
        att = np.mean(Y[T == 1]) - np.mean(y0_pred)

        # Bootstrap SE
        n_bootstrap = 500
        boot_atts = []

        for _ in range(n_bootstrap):
            idx = np.random.choice(len(Y), len(Y), replace=True)
            T_b = T[idx]
            Y_b = Y[idx]
            X_b = X_cov[idx]

            if np.sum(T_b == 0) < 5 or np.sum(T_b == 1) < 5:
                continue

            model_b = LinearRegression()
            model_b.fit(X_b[T_b == 0], Y_b[T_b == 0])
            y0_b = model_b.predict(X_b[T_b == 1])
            boot_atts.append(np.mean(Y_b[T_b == 1]) - np.mean(y0_b))

        se = np.std(boot_atts, ddof=1) if boot_atts else 0

        diagnostics = {
            "method": "regression_imputation",
            "counterfactual_mean": float(np.mean(y0_pred)),
            "observed_mean_treated": float(np.mean(Y[T == 1])),
        }

    elif method == "ipw":
        # IPW for ATT
        if covariates is None or len(covariates) == 0:
            warnings.append("IPW requires covariates")
            return estimate_att(data, treatment, outcome, None, "unadjusted")

        # Estimate propensity scores
        X_cov = data[covariates].values

        ps_model = LogisticRegression(max_iter=1000)
        ps_model.fit(X_cov, T)
        ps = ps_model.predict_proba(X_cov)[:, 1]
        ps = np.clip(ps, 0.01, 0.99)

        # ATT weights: 1 for treated, ps/(1-ps) for control
        weights = np.where(T == 1, 1.0, ps / (1 - ps))

        # Weighted means
        y1_mean = np.mean(Y[T == 1])

        # Reweight controls to look like treated
        w_control = weights[T == 0]
        y0_weighted = np.sum(Y[T == 0] * w_control) / np.sum(w_control)

        att = y1_mean - y0_weighted

        # SE via bootstrap
        n_bootstrap = 500
        boot_atts = []

        for _ in range(n_bootstrap):
            idx = np.random.choice(len(Y), len(Y), replace=True)
            T_b = T[idx]
            Y_b = Y[idx]
            X_b = X_cov[idx]

            if np.sum(T_b == 0) < 5 or np.sum(T_b == 1) < 5:
                continue

            ps_b = LogisticRegression(max_iter=1000).fit(X_b, T_b).predict_proba(X_b)[:, 1]
            ps_b = np.clip(ps_b, 0.01, 0.99)
            w_b = np.where(T_b == 1, 1.0, ps_b / (1 - ps_b))

            y1_b = np.mean(Y_b[T_b == 1])
            y0_b = np.sum(Y_b[T_b == 0] * w_b[T_b == 0]) / np.sum(w_b[T_b == 0])
            boot_atts.append(y1_b - y0_b)

        se = np.std(boot_atts, ddof=1) if boot_atts else 0

        diagnostics = {
            "method": "IPW for ATT",
            "weighted_control_mean": float(y0_weighted),
            "observed_treated_mean": float(y1_mean),
        }

    else:
        raise ValueError(f"Unknown method: {method}")

    # Inference
    z_crit = stats.norm.ppf(1 - (1 - confidence_level) / 2)
    t_stat = att / se if se > 0 else 0
    p_value = 2 * (1 - stats.norm.cdf(abs(t_stat)))
    ci_lower = att - z_crit * se
    ci_upper = att + z_crit * se

    return TreatmentEffectResult(
        estimand="att",
        method=method,
        estimate=float(att),
        std_error=float(se),
        ci_lower=float(ci_lower),
        ci_upper=float(ci_upper),
        p_value=float(p_value),
        n_treated=n_treated,
        n_control=n_control,
        diagnostics=diagnostics,
        warnings=warnings,
    )


def estimate_effects_ipw(
    data: pd.DataFrame,
    treatment: str,
    outcome: str,
    propensity_scores: np.ndarray,
    estimand: str = "ate",
    confidence_level: float = 0.95,
) -> TreatmentEffectResult:
    """
    Estimate treatment effects using pre-computed propensity scores.

    Args:
        data: DataFrame
        treatment: Treatment variable name
        outcome: Outcome variable name
        propensity_scores: Pre-computed propensity scores
        estimand: 'ate' or 'att'

    Returns:
        TreatmentEffectResult
    """
    T = data[treatment].values
    Y = data[outcome].values
    ps = np.clip(propensity_scores, 0.01, 0.99)

    n_treated = int(np.sum(T == 1))
    n_control = int(np.sum(T == 0))

    if estimand == "ate":
        # ATE weights
        w1 = 1 / ps
        w0 = 1 / (1 - ps)

        # Normalize
        w1_norm = w1 / np.sum(w1[T == 1]) * n_treated
        w0_norm = w0 / np.sum(w0[T == 0]) * n_control

        y1_weighted = np.sum(Y[T == 1] * w1_norm[T == 1]) / n_treated
        y0_weighted = np.sum(Y[T == 0] * w0_norm[T == 0]) / n_control

        effect = y1_weighted - y0_weighted

    else:  # att
        w1 = np.ones_like(ps)
        w0 = ps / (1 - ps)

        y1_mean = np.mean(Y[T == 1])
        y0_weighted = np.sum(Y[T == 0] * w0[T == 0]) / np.sum(w0[T == 0])

        effect = y1_mean - y0_weighted

    # Simple SE estimate
    se = np.sqrt(np.var(Y[T == 1], ddof=1) / n_treated + np.var(Y[T == 0], ddof=1) / n_control)

    z_crit = stats.norm.ppf(1 - (1 - confidence_level) / 2)
    t_stat = effect / se if se > 0 else 0
    p_value = 2 * (1 - stats.norm.cdf(abs(t_stat)))

    return TreatmentEffectResult(
        estimand=estimand,
        method="ipw_precomputed",
        estimate=float(effect),
        std_error=float(se),
        ci_lower=float(effect - z_crit * se),
        ci_upper=float(effect + z_crit * se),
        p_value=float(p_value),
        n_treated=n_treated,
        n_control=n_control,
        diagnostics={"propensity_score_range": [float(np.min(ps)), float(np.max(ps))]},
        warnings=[],
    )


def doubly_robust_estimator(
    data: pd.DataFrame,
    treatment: str,
    outcome: str,
    covariates: List[str],
    estimand: str = "ate",
    confidence_level: float = 0.95,
) -> TreatmentEffectResult:
    """
    Doubly Robust (AIPW) estimation.

    Combines propensity score weighting with outcome regression.
    Consistent if EITHER the propensity model OR the outcome
    model is correctly specified.

    Args:
        data: DataFrame
        treatment: Treatment variable name
        outcome: Outcome variable name
        covariates: Covariate names
        estimand: 'ate' or 'att'

    Returns:
        TreatmentEffectResult with doubly robust estimate
    """
    warnings = []

    T = data[treatment].values
    Y = data[outcome].values
    X = data[covariates].values

    n = len(Y)
    n_treated = int(np.sum(T == 1))
    n_control = int(np.sum(T == 0))

    # Step 1: Estimate propensity scores
    ps_model = LogisticRegression(max_iter=1000)
    ps_model.fit(X, T)
    ps = ps_model.predict_proba(X)[:, 1]
    ps = np.clip(ps, 0.01, 0.99)

    # Step 2: Fit outcome models
    # Model for E[Y | T=1, X]
    model_1 = LinearRegression()
    model_1.fit(X[T == 1], Y[T == 1])
    mu1_hat = model_1.predict(X)

    # Model for E[Y | T=0, X]
    model_0 = LinearRegression()
    model_0.fit(X[T == 0], Y[T == 0])
    mu0_hat = model_0.predict(X)

    # Step 3: AIPW estimator
    if estimand == "ate":
        # E[Y(1)]
        term1 = T * (Y - mu1_hat) / ps + mu1_hat
        mu1_aipw = np.mean(term1)

        # E[Y(0)]
        term0 = (1 - T) * (Y - mu0_hat) / (1 - ps) + mu0_hat
        mu0_aipw = np.mean(term0)

        effect = mu1_aipw - mu0_aipw

        # Influence function for variance
        psi = term1 - term0 - effect
        se = np.sqrt(np.var(psi, ddof=1) / n)

    else:  # ATT
        # ATT = E[Y(1) - Y(0) | T=1]
        # = E[Y | T=1] - E[E[Y(0)|X] | T=1]

        # E[Y|T=1]
        mu1_observed = np.mean(Y[T == 1])

        # E[Y(0)|T=1] using AIPW
        # weight controls to look like treated
        w_att = ps / (1 - ps)

        # Augmented term
        aug_term = (1 - T) * w_att * (Y - mu0_hat) / np.mean(T)
        mu0_att = np.mean(mu0_hat[T == 1]) + np.mean(aug_term)

        effect = mu1_observed - mu0_att

        # Simplified SE
        se = np.sqrt(np.var(Y[T == 1], ddof=1) / n_treated + np.var(mu0_hat[T == 1], ddof=1) / n_treated)

    # Inference
    z_crit = stats.norm.ppf(1 - (1 - confidence_level) / 2)
    t_stat = effect / se if se > 0 else 0
    p_value = 2 * (1 - stats.norm.cdf(abs(t_stat)))

    diagnostics = {
        "method": "AIPW (Doubly Robust)",
        "propensity_model": "logistic regression",
        "outcome_model": "linear regression",
        "propensity_score_range": [float(np.min(ps)), float(np.max(ps))],
        "outcome_r2": {
            "treated_model": float(
                1 - np.sum((Y[T == 1] - mu1_hat[T == 1]) ** 2) / np.sum((Y[T == 1] - np.mean(Y[T == 1])) ** 2)
            ),
            "control_model": float(
                1 - np.sum((Y[T == 0] - mu0_hat[T == 0]) ** 2) / np.sum((Y[T == 0] - np.mean(Y[T == 0])) ** 2)
            ),
        },
    }

    return TreatmentEffectResult(
        estimand=estimand,
        method="doubly_robust",
        estimate=float(effect),
        std_error=float(se),
        ci_lower=float(effect - z_crit * se),
        ci_upper=float(effect + z_crit * se),
        p_value=float(p_value),
        n_treated=n_treated,
        n_control=n_control,
        diagnostics=diagnostics,
        warnings=warnings,
    )


def sensitivity_analysis(
    data: pd.DataFrame,
    treatment: str,
    outcome: str,
    covariates: List[str],
    gamma_range: Tuple[float, float] = (1.0, 2.0),
    n_points: int = 10,
) -> Dict[str, Any]:
    """
    Sensitivity analysis for unmeasured confounding.

    Estimates how strong unmeasured confounding would need to be
    to explain away the treatment effect.

    Args:
        data: DataFrame
        treatment: Treatment variable
        outcome: Outcome variable
        covariates: Observed covariates
        gamma_range: Range of sensitivity parameter (odds ratio)
        n_points: Number of points to evaluate

    Returns:
        Dictionary with sensitivity analysis results
    """
    # Get point estimate
    result = doubly_robust_estimator(data, treatment, outcome, covariates, "ate")
    point_estimate = result.estimate

    # Sensitivity analysis using Rosenbaum bounds
    gammas = np.linspace(gamma_range[0], gamma_range[1], n_points)

    bounds = []
    for gamma in gammas:
        # Under confounding, bounds widen
        # Simplified: multiply SE by gamma
        z_crit = stats.norm.ppf(0.975)
        lower = point_estimate - gamma * result.std_error * z_crit
        upper = point_estimate + gamma * result.std_error * z_crit

        bounds.append(
            {"gamma": float(gamma), "lower": float(lower), "upper": float(upper), "includes_zero": lower <= 0 <= upper}
        )

    # Find gamma where effect becomes non-significant
    gamma_critical = None
    for b in bounds:
        if b["includes_zero"]:
            gamma_critical = b["gamma"]
            break

    return {
        "point_estimate": float(point_estimate),
        "std_error": float(result.std_error),
        "sensitivity_bounds": bounds,
        "gamma_critical": gamma_critical,
        "interpretation": _interpret_sensitivity(gamma_critical),
    }


def _interpret_sensitivity(gamma_critical: Optional[float]) -> str:
    """Interpret sensitivity analysis results."""
    if gamma_critical is None:
        return "Effect is robust to unmeasured confounding at all tested levels"
    elif gamma_critical <= 1.2:
        return "Effect is highly sensitive to unmeasured confounding"
    elif gamma_critical <= 1.5:
        return "Effect is moderately sensitive to unmeasured confounding"
    elif gamma_critical <= 2.0:
        return "Effect is somewhat robust to unmeasured confounding"
    else:
        return "Effect is robust to substantial unmeasured confounding"
