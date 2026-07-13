"""
Propensity Score Module
=======================

Implements propensity score estimation and analysis.

The propensity score is the probability of treatment assignment
conditional on observed covariates. It is central to:
- Matching
- Weighting (IPW, IPTW)
- Stratification
- Doubly robust estimation

Key Properties (Rosenbaum & Rubin, 1983):
- Balancing property: Treated and control units with same propensity score
  have similar distributions of observed covariates
- Conditional independence: If treatment assignment is ignorable given
  covariates, it is also ignorable given the propensity score

References:
    Rosenbaum, P. R., & Rubin, D. B. (1983). The central role of the
    propensity score in observational studies for causal effects.
    Biometrika, 70(1), 41-55.

    Austin, P. C. (2011). An introduction to propensity score methods
    for reducing the effects of confounding in observational studies.
    Multivariate Behavioral Research, 46(3), 399-424.

Created: December 26, 2025
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


@dataclass
class PropensityScoreResult:
    """Result of propensity score estimation."""

    scores: np.ndarray
    treatment: np.ndarray
    model_coefficients: Dict[str, float]
    model_intercept: float
    # None when a treatment arm is empty: the ROC-AUC does not exist there, and 0.5 is a claim.
    auc: Optional[float]
    overlap: Dict[str, Any]
    balance_before: Dict[str, Any]
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scores": self.scores.tolist(),
            "treatment": self.treatment.tolist(),
            "model": {"coefficients": self.model_coefficients, "intercept": self.model_intercept},
            "diagnostics": {"auc": self.auc, "overlap": self.overlap},
            "balance_before": self.balance_before,
            "warnings": self.warnings,
        }


def estimate_propensity_scores(
    data: pd.DataFrame,
    treatment: str,
    covariates: List[str],
    method: str = "logistic",
    regularization: float = 0.0,
    standardize: bool = True,
) -> PropensityScoreResult:
    """
    Estimate propensity scores using logistic regression.

    The propensity score e(x) = P(T=1|X=x) is the probability of
    receiving treatment given observed covariates.

    Args:
        data: DataFrame with treatment and covariates
        treatment: Name of binary treatment variable (0/1)
        covariates: List of covariate names
        method: Estimation method ('logistic', 'probit')
        regularization: L2 regularization strength (0 = no regularization)
        standardize: Whether to standardize covariates before fitting

    Returns:
        PropensityScoreResult with scores and diagnostics

    Example:
        result = estimate_propensity_scores(
            data=df,
            treatment='treatment',
            covariates=['age', 'gender', 'income']
        )
    """
    warnings = []

    # Validate inputs
    if treatment not in data.columns:
        raise ValueError(f"Treatment variable '{treatment}' not in data")

    missing_covs = [c for c in covariates if c not in data.columns]
    if missing_covs:
        raise ValueError(f"Covariates not in data: {missing_covs}")

    # Extract treatment and covariates
    T = data[treatment].values
    X = data[covariates].values

    # Check treatment is binary
    unique_treatments = np.unique(T[~np.isnan(T)])
    if not np.array_equal(np.sort(unique_treatments), np.array([0, 1])):
        raise ValueError(f"Treatment must be binary (0/1), got: {unique_treatments}")

    # Handle missing values
    valid_idx = ~(np.isnan(T) | np.any(np.isnan(X), axis=1))
    if not np.all(valid_idx):
        n_missing = np.sum(~valid_idx)
        warnings.append(f"Dropped {n_missing} observations with missing values")
        T = T[valid_idx]
        X = X[valid_idx]

    n_treated = np.sum(T == 1)
    n_control = np.sum(T == 0)

    if n_treated < 10 or n_control < 10:
        warnings.append(f"Small sample: {n_treated} treated, {n_control} control")

    # Standardize if requested
    scaler = None
    if standardize:
        scaler = StandardScaler()
        X = scaler.fit_transform(X)

    # Fit propensity score model
    if method == "logistic":
        # Regularization: C = 1/regularization (sklearn convention)
        C = 1.0 / regularization if regularization > 0 else 1e10

        model = LogisticRegression(penalty="l2" if regularization > 0 else None, C=C, max_iter=1000, solver="lbfgs")
        model.fit(X, T)

        # Get propensity scores
        scores = model.predict_proba(X)[:, 1]

        # Extract coefficients
        if scaler:
            # Unstandardize coefficients for interpretability
            coefs = model.coef_[0] / scaler.scale_
        else:
            coefs = model.coef_[0]

        model_coefficients = dict(zip(covariates, coefs))
        model_intercept = float(model.intercept_[0])

    else:
        raise ValueError(f"Unknown method: {method}. Use 'logistic'.")

    # Calculate AUC
    auc = _calculate_auc(T, scores)

    if auc is None:
        # `None > 0.9` raises in Python 3, and 0.5 (what this used to be) would have printed a
        # confident "Low AUC (0.500)" diagnostic about a model that could not be scored at all.
        warnings.append(
            "The propensity model could not be scored (one of the treatment arms is empty), so "
            "its discrimination is unknown."
        )
    elif auc > 0.9:
        warnings.append(f"High AUC ({auc:.3f}) may indicate separation - check for overlap")
    elif auc < 0.6:
        warnings.append(f"Low AUC ({auc:.3f}) - covariates may not predict treatment well")

    # Assess overlap
    overlap = assess_overlap(scores, T)

    if overlap["violation_rate"] > 0.10:
        warnings.append(f"Overlap violation: {overlap['violation_rate']:.1%} of observations")

    # Calculate balance before adjustment
    balance_before = _calculate_balance(data, treatment, covariates)

    return PropensityScoreResult(
        scores=scores,
        treatment=T,
        model_coefficients=model_coefficients,
        model_intercept=model_intercept,
        auc=auc,
        overlap=overlap,
        balance_before=balance_before,
        warnings=warnings,
    )


def _calculate_auc(y_true: np.ndarray, y_score: np.ndarray) -> Optional[float]:
    """
    Area under the ROC curve, or None when it does not exist.

    With no treated units (or no controls) there are no pairs to rank against each other and the
    AUC is undefined. sklearn does not raise there -- it emits an UndefinedMetricWarning and
    returns nan -- so the `except` below never fired and the nan travelled all the way out: into
    the JSON response (where NaN is not valid JSON), and past the `auc > 0.9` / `auc < 0.6`
    diagnostics, both of which are False for nan, so not even a warning was raised about it.
    """
    try:
        from sklearn.metrics import roc_auc_score

        auc = float(roc_auc_score(y_true, y_score))
        return None if not np.isfinite(auc) else auc
    except Exception:
        # Fallback: simple AUC calculation
        n1 = np.sum(y_true == 1)
        n0 = np.sum(y_true == 0)
        if n1 == 0 or n0 == 0:
            # With no treated units, or no controls, there are no pairs to rank against each
            # other and the ROC-AUC does not exist. Returning 0.5 is not a neutral default: it is
            # the specific, meaningful claim that the propensity model discriminates exactly as
            # well as a coin flip. It then fed the `auc < 0.6` check downstream, which duly
            # emitted "Low AUC (0.500) -- covariates may not predict treatment well" -- a
            # diagnostic finding about a model that was never scored.
            return None

        sum_ranks = np.sum(np.argsort(np.argsort(y_score))[y_true == 1])
        return (sum_ranks - n1 * (n1 + 1) / 2) / (n1 * n0)


def assess_overlap(scores: np.ndarray, treatment: np.ndarray, threshold: float = 0.1) -> Dict[str, Any]:
    """
    Assess overlap (positivity) assumption.

    Overlap requires that both treatment groups have positive probability
    of receiving treatment at all covariate values. In practice, we check
    if propensity scores are bounded away from 0 and 1.

    Args:
        scores: Estimated propensity scores
        treatment: Treatment indicators
        threshold: Scores below this or above (1-threshold) indicate violation

    Returns:
        Dictionary with overlap diagnostics
    """
    treated_scores = scores[treatment == 1]
    control_scores = scores[treatment == 0]

    # Check for extreme scores
    too_low = scores < threshold
    too_high = scores > (1 - threshold)
    violations = too_low | too_high

    result = {
        "treated": {
            "n": len(treated_scores),
            "mean": float(np.mean(treated_scores)),
            "std": float(np.std(treated_scores, ddof=1)),
            "min": float(np.min(treated_scores)),
            "max": float(np.max(treated_scores)),
            "median": float(np.median(treated_scores)),
            "iqr": [float(np.percentile(treated_scores, 25)), float(np.percentile(treated_scores, 75))],
        },
        "control": {
            "n": len(control_scores),
            "mean": float(np.mean(control_scores)),
            "std": float(np.std(control_scores, ddof=1)),
            "min": float(np.min(control_scores)),
            "max": float(np.max(control_scores)),
            "median": float(np.median(control_scores)),
            "iqr": [float(np.percentile(control_scores, 25)), float(np.percentile(control_scores, 75))],
        },
        "common_support": {
            "min": float(max(np.min(treated_scores), np.min(control_scores))),
            "max": float(min(np.max(treated_scores), np.max(control_scores))),
        },
        "violations": {
            "n_too_low": int(np.sum(too_low)),
            "n_too_high": int(np.sum(too_high)),
            "n_total": int(np.sum(violations)),
        },
        "violation_rate": float(np.mean(violations)),
        "threshold": threshold,
        "overlap_adequate": np.mean(violations) < 0.1,
    }

    return result


def trim_propensity_scores(
    scores: np.ndarray, treatment: np.ndarray, method: str = "symmetric", threshold: float = 0.1
) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Trim observations with extreme propensity scores.

    Trimming can improve estimation stability by excluding observations
    with very low or very high propensity scores.

    Args:
        scores: Propensity scores
        treatment: Treatment indicators
        method: 'symmetric' (trim both tails) or 'asymmetric' (match min/max)
        threshold: Trimming threshold

    Returns:
        Tuple of (trimmed_scores, trimmed_treatment, info)
    """
    if method == "symmetric":
        keep = (scores >= threshold) & (scores <= 1 - threshold)
    elif method == "asymmetric":
        treated_scores = scores[treatment == 1]
        control_scores = scores[treatment == 0]

        lower = max(np.min(treated_scores), np.min(control_scores))
        upper = min(np.max(treated_scores), np.max(control_scores))

        keep = (scores >= lower) & (scores <= upper)
    else:
        raise ValueError(f"Unknown method: {method}")

    n_dropped = len(scores) - np.sum(keep)

    info = {
        "method": method,
        "threshold": threshold if method == "symmetric" else (lower, upper),
        "n_original": len(scores),
        "n_kept": int(np.sum(keep)),
        "n_dropped": n_dropped,
        "proportion_dropped": float(n_dropped / len(scores)),
    }

    return scores[keep], treatment[keep], info


def _calculate_balance(data: pd.DataFrame, treatment: str, covariates: List[str]) -> Dict[str, Any]:
    """Calculate covariate balance between treatment groups."""
    treated = data[data[treatment] == 1]
    control = data[data[treatment] == 0]

    balance = {}

    for cov in covariates:
        try:
            t_values = treated[cov].dropna().values
            c_values = control[cov].dropna().values

            # Check if categorical
            if data[cov].dtype == "object" or data[cov].nunique() <= 5:
                # Categorical: compare proportions
                t_props = pd.Series(t_values).value_counts(normalize=True)
                c_props = pd.Series(c_values).value_counts(normalize=True)

                balance[cov] = {"type": "categorical", "treated": t_props.to_dict(), "control": c_props.to_dict()}
            else:
                # Continuous: standardized mean difference
                t_mean = np.mean(t_values)
                c_mean = np.mean(c_values)
                pooled_std = np.sqrt((np.var(t_values, ddof=1) + np.var(c_values, ddof=1)) / 2)

                smd = (t_mean - c_mean) / pooled_std if pooled_std > 0 else 0

                balance[cov] = {
                    "type": "continuous",
                    "treated_mean": float(t_mean),
                    "control_mean": float(c_mean),
                    "standardized_mean_diff": float(smd),
                    "balanced": abs(smd) < 0.1,  # Standard threshold
                }
        except Exception as e:
            balance[cov] = {"error": str(e)}

    # Overall balance summary
    imbalanced = []
    for cov, info in balance.items():
        if info.get("type") == "continuous":
            if abs(info.get("standardized_mean_diff", 0)) >= 0.1:
                imbalanced.append(cov)

    balance["_summary"] = {
        "n_covariates": len(covariates),
        "n_imbalanced": len(imbalanced),
        "imbalanced_covariates": imbalanced,
    }

    return balance


def calculate_ipw_weights(
    scores: np.ndarray, treatment: np.ndarray, estimand: str = "ate", stabilized: bool = True, normalize: bool = True
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Calculate Inverse Probability Weights (IPW).

    IPW reweights observations to create a pseudo-population where
    treatment assignment is independent of covariates.

    Args:
        scores: Propensity scores
        treatment: Treatment indicators (0/1)
        estimand: 'ate' (Average Treatment Effect) or 'att' (on Treated)
        stabilized: Use stabilized weights (reduces variance)
        normalize: Normalize weights to sum to sample size

    Returns:
        Tuple of (weights, info)

    Weight Formulas:
        ATE: w_1 = 1/e(x), w_0 = 1/(1-e(x))
        ATT: w_1 = 1, w_0 = e(x)/(1-e(x))
        Stabilized ATE: w_1 = P(T=1)/e(x), w_0 = P(T=0)/(1-e(x))
    """
    scores = np.clip(scores, 0.001, 0.999)  # Avoid division by zero

    if estimand == "ate":
        # ATE weights
        weights_treated = 1.0 / scores
        weights_control = 1.0 / (1 - scores)

        if stabilized:
            p_treated = np.mean(treatment)
            weights_treated *= p_treated
            weights_control *= 1 - p_treated

    elif estimand == "att":
        # ATT weights
        weights_treated = np.ones_like(scores)
        weights_control = scores / (1 - scores)

        if stabilized:
            p_treated = np.mean(treatment)
            weights_control *= p_treated / (1 - p_treated)

    else:
        raise ValueError(f"Unknown estimand: {estimand}. Use 'ate' or 'att'.")

    # Combine weights
    weights = np.where(treatment == 1, weights_treated, weights_control)

    # Normalize
    if normalize:
        weights_treated_sum = np.sum(weights[treatment == 1])
        weights_control_sum = np.sum(weights[treatment == 0])
        n_treated = np.sum(treatment == 1)
        n_control = np.sum(treatment == 0)

        weights = np.where(
            treatment == 1, weights * n_treated / weights_treated_sum, weights * n_control / weights_control_sum
        )

    # Diagnostics
    info = {
        "estimand": estimand,
        "stabilized": stabilized,
        "normalized": normalize,
        "weights_treated": {
            "mean": float(np.mean(weights[treatment == 1])),
            "std": float(np.std(weights[treatment == 1], ddof=1)),
            "min": float(np.min(weights[treatment == 1])),
            "max": float(np.max(weights[treatment == 1])),
        },
        "weights_control": {
            "mean": float(np.mean(weights[treatment == 0])),
            "std": float(np.std(weights[treatment == 0], ddof=1)),
            "min": float(np.min(weights[treatment == 0])),
            "max": float(np.max(weights[treatment == 0])),
        },
        "effective_sample_size": {
            "treated": float(np.sum(weights[treatment == 1]) ** 2 / np.sum(weights[treatment == 1] ** 2)),
            "control": float(np.sum(weights[treatment == 0]) ** 2 / np.sum(weights[treatment == 0] ** 2)),
        },
    }

    return weights, info


def propensity_score_stratification(
    scores: np.ndarray, treatment: np.ndarray, outcome: np.ndarray, n_strata: int = 5
) -> Dict[str, Any]:
    """
    Estimate treatment effects using propensity score stratification.

    Divides observations into strata based on propensity scores and
    estimates treatment effects within each stratum.

    Args:
        scores: Propensity scores
        treatment: Treatment indicators
        outcome: Outcome values
        n_strata: Number of strata (quintiles by default)

    Returns:
        Dictionary with stratum-specific and overall estimates
    """
    # Create strata based on quantiles
    quantiles = np.percentile(scores, np.linspace(0, 100, n_strata + 1))
    strata = np.digitize(scores, quantiles[1:-1])

    stratum_results = []

    for s in range(n_strata):
        mask = strata == s
        n_in_stratum = np.sum(mask)

        if n_in_stratum < 10:
            stratum_results.append({"stratum": s, "n": n_in_stratum, "warning": "Too few observations"})
            continue

        t_mask = mask & (treatment == 1)
        c_mask = mask & (treatment == 0)

        n_treated = np.sum(t_mask)
        n_control = np.sum(c_mask)

        if n_treated < 2 or n_control < 2:
            stratum_results.append(
                {
                    "stratum": s,
                    "n": n_in_stratum,
                    "n_treated": n_treated,
                    "n_control": n_control,
                    "warning": "Insufficient treatment/control",
                }
            )
            continue

        y_treated = outcome[t_mask]
        y_control = outcome[c_mask]

        effect = np.mean(y_treated) - np.mean(y_control)
        se = np.sqrt(np.var(y_treated, ddof=1) / n_treated + np.var(y_control, ddof=1) / n_control)

        stratum_results.append(
            {
                "stratum": s,
                "ps_range": [float(quantiles[s]), float(quantiles[s + 1])],
                "n": n_in_stratum,
                "n_treated": n_treated,
                "n_control": n_control,
                "effect": float(effect),
                "se": float(se),
                "ci_lower": float(effect - stats.norm.ppf(0.975) * se),
                "ci_upper": float(effect + stats.norm.ppf(0.975) * se),
                "mean_treated": float(np.mean(y_treated)),
                "mean_control": float(np.mean(y_control)),
            }
        )

    # Calculate overall effect (weighted average)
    valid_strata = [s for s in stratum_results if "effect" in s]

    if valid_strata:
        total_n = sum(s["n"] for s in valid_strata)
        overall_effect = sum(s["effect"] * s["n"] for s in valid_strata) / total_n

        # SE via delta method (simplified)
        overall_se = np.sqrt(sum((s["se"] * s["n"] / total_n) ** 2 for s in valid_strata))
    else:
        overall_effect = None
        overall_se = None

    z_crit = stats.norm.ppf(0.975)
    return {
        "n_strata": n_strata,
        "strata": stratum_results,
        "overall": {
            "effect": overall_effect,
            "se": overall_se,
            "ci_lower": overall_effect - z_crit * overall_se if overall_effect else None,
            "ci_upper": overall_effect + z_crit * overall_se if overall_effect else None,
        }
        if overall_effect
        else None,
    }
