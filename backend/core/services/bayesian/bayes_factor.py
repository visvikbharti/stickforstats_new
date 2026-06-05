"""
Bayes Factor Calculation and Interpretation
============================================

Provides utilities for interpreting Bayes Factors using
established scales (Jeffreys, Kass & Raftery).

References:
    Jeffreys, H. (1961). Theory of Probability (3rd ed.). Oxford University Press.
    Kass, R. E., & Raftery, A. E. (1995). Bayes factors. JASA, 90(430), 773-795.
    Lee, M. D., & Wagenmakers, E. J. (2014). Bayesian cognitive modeling.

Created: December 26, 2025
"""

from typing import Dict
from dataclasses import dataclass
import numpy as np


# Jeffreys' Scale for Bayes Factor Interpretation
JEFFREYS_SCALE = {
    "extreme_h1": {"min": 100, "max": float("inf"), "label": "Extreme evidence for H₁"},
    "very_strong_h1": {"min": 30, "max": 100, "label": "Very strong evidence for H₁"},
    "strong_h1": {"min": 10, "max": 30, "label": "Strong evidence for H₁"},
    "moderate_h1": {"min": 3, "max": 10, "label": "Moderate evidence for H₁"},
    "anecdotal_h1": {"min": 1, "max": 3, "label": "Anecdotal evidence for H₁"},
    "no_evidence": {"min": 1, "max": 1, "label": "No evidence (data equally likely under both hypotheses)"},
    "anecdotal_h0": {"min": 1 / 3, "max": 1, "label": "Anecdotal evidence for H₀"},
    "moderate_h0": {"min": 1 / 10, "max": 1 / 3, "label": "Moderate evidence for H₀"},
    "strong_h0": {"min": 1 / 30, "max": 1 / 10, "label": "Strong evidence for H₀"},
    "very_strong_h0": {"min": 1 / 100, "max": 1 / 30, "label": "Very strong evidence for H₀"},
    "extreme_h0": {"min": 0, "max": 1 / 100, "label": "Extreme evidence for H₀"},
}


@dataclass
class BayesFactorInterpretation:
    """Interpretation of a Bayes Factor."""

    bf10: float
    bf01: float
    level: str
    label: str
    favors: str  # 'H1', 'H0', or 'neither'
    strength: str  # 'extreme', 'very_strong', 'strong', 'moderate', 'anecdotal', 'none'
    color: str  # For visualization


def interpret_bayes_factor(bf10: float) -> BayesFactorInterpretation:
    """
    Interpret a Bayes Factor using Jeffreys' scale.

    Args:
        bf10: Bayes Factor in favor of H1 (alternative hypothesis)

    Returns:
        BayesFactorInterpretation with level, label, and visualization info

    Examples:
        >>> interpret_bayes_factor(15.5)
        BayesFactorInterpretation(bf10=15.5, level='strong_h1', ...)

        >>> interpret_bayes_factor(0.1)
        BayesFactorInterpretation(bf10=0.1, level='strong_h0', ...)
    """
    bf01 = 1 / bf10 if bf10 > 0 else float("inf")

    # Determine level
    if bf10 >= 100:
        level = "extreme_h1"
        label = "Extreme evidence for H₁"
        favors = "H1"
        strength = "extreme"
        color = "#1b5e20"  # Dark green
    elif bf10 >= 30:
        level = "very_strong_h1"
        label = "Very strong evidence for H₁"
        favors = "H1"
        strength = "very_strong"
        color = "#2e7d32"  # Green
    elif bf10 >= 10:
        level = "strong_h1"
        label = "Strong evidence for H₁"
        favors = "H1"
        strength = "strong"
        color = "#43a047"  # Light green
    elif bf10 >= 3:
        level = "moderate_h1"
        label = "Moderate evidence for H₁"
        favors = "H1"
        strength = "moderate"
        color = "#66bb6a"  # Lighter green
    elif bf10 > 1:
        level = "anecdotal_h1"
        label = "Anecdotal evidence for H₁"
        favors = "H1"
        strength = "anecdotal"
        color = "#a5d6a7"  # Very light green
    elif bf10 == 1:
        level = "no_evidence"
        label = "No evidence either way"
        favors = "neither"
        strength = "none"
        color = "#9e9e9e"  # Gray
    elif bf10 >= 1 / 3:
        level = "anecdotal_h0"
        label = "Anecdotal evidence for H₀"
        favors = "H0"
        strength = "anecdotal"
        color = "#ef9a9a"  # Very light red
    elif bf10 >= 1 / 10:
        level = "moderate_h0"
        label = "Moderate evidence for H₀"
        favors = "H0"
        strength = "moderate"
        color = "#e57373"  # Light red
    elif bf10 >= 1 / 30:
        level = "strong_h0"
        label = "Strong evidence for H₀"
        favors = "H0"
        strength = "strong"
        color = "#f44336"  # Red
    elif bf10 >= 1 / 100:
        level = "very_strong_h0"
        label = "Very strong evidence for H₀"
        favors = "H0"
        strength = "very_strong"
        color = "#d32f2f"  # Dark red
    else:
        level = "extreme_h0"
        label = "Extreme evidence for H₀"
        favors = "H0"
        strength = "extreme"
        color = "#b71c1c"  # Very dark red

    return BayesFactorInterpretation(
        bf10=bf10, bf01=bf01, level=level, label=label, favors=favors, strength=strength, color=color
    )


def bayes_factor_to_probability(bf10: float) -> Dict[str, float]:
    """
    Convert Bayes Factor to posterior probability assuming equal priors.

    Under equal prior odds (P(H1) = P(H0) = 0.5):
    P(H1|data) = BF10 / (1 + BF10)
    P(H0|data) = 1 / (1 + BF10)

    Args:
        bf10: Bayes Factor in favor of H1

    Returns:
        Dictionary with posterior probabilities for H1 and H0
    """
    if bf10 <= 0:
        return {"p_h1": 0.0, "p_h0": 1.0}

    if np.isinf(bf10):
        return {"p_h1": 1.0, "p_h0": 0.0}

    p_h1 = bf10 / (1 + bf10)
    p_h0 = 1 / (1 + bf10)

    return {"p_h1": p_h1, "p_h0": p_h0, "odds_h1": bf10, "odds_h0": 1 / bf10 if bf10 > 0 else float("inf")}


def format_bayes_factor(bf: float, precision: int = 3) -> str:
    """
    Format Bayes Factor for display.

    Args:
        bf: Bayes Factor value
        precision: Number of decimal places

    Returns:
        Formatted string (e.g., "15.234" or "1/3.456")
    """
    if bf >= 1:
        if bf >= 1000:
            return f"{bf:.2e}"
        return f"{bf:.{precision}f}"
    else:
        bf01 = 1 / bf
        if bf01 >= 1000:
            return f"1/{bf01:.2e}"
        return f"1/{bf01:.{precision}f}"


def log_bayes_factor(bf10: float) -> float:
    """
    Calculate natural log of Bayes Factor.

    Useful for:
    - Combining evidence across studies
    - Numerical stability with very large/small BFs

    Args:
        bf10: Bayes Factor

    Returns:
        log(BF10)
    """
    if bf10 <= 0:
        return float("-inf")
    return np.log(bf10)


def combine_bayes_factors(bf_list: list) -> float:
    """
    Combine Bayes Factors from independent studies.

    Under independence, BFs multiply:
    BF_combined = BF_1 × BF_2 × ... × BF_n

    For numerical stability, we use logs:
    log(BF_combined) = log(BF_1) + log(BF_2) + ... + log(BF_n)

    Args:
        bf_list: List of Bayes Factors

    Returns:
        Combined Bayes Factor
    """
    log_bfs = [log_bayes_factor(bf) for bf in bf_list]
    log_combined = sum(log_bfs)
    return np.exp(log_combined)


def sequential_bayes_factor(prior_bf: float, likelihood_ratio: float) -> float:
    """
    Update Bayes Factor with new data (sequential analysis).

    BF_posterior = BF_prior × Likelihood_Ratio

    Args:
        prior_bf: Current Bayes Factor before new data
        likelihood_ratio: Likelihood ratio from new data

    Returns:
        Updated Bayes Factor
    """
    return prior_bf * likelihood_ratio


def generate_bf_interpretation_text(bf10: float, test_name: str = "test") -> str:
    """
    Generate human-readable interpretation of Bayes Factor.

    Args:
        bf10: Bayes Factor in favor of H1
        test_name: Name of the statistical test

    Returns:
        Interpretation paragraph
    """
    interp = interpret_bayes_factor(bf10)
    probs = bayes_factor_to_probability(bf10)

    if interp.favors == "H1":
        bf_str = f"BF₁₀ = {format_bayes_factor(bf10)}"
    elif interp.favors == "H0":
        bf_str = f"BF₀₁ = {format_bayes_factor(1/bf10)}"
    else:
        bf_str = f"BF₁₀ = {format_bayes_factor(bf10)}"

    text = (
        f"The Bayesian {test_name} yielded {bf_str}, indicating "
        f"{interp.label.lower()}. This means the data are approximately "
        f"{abs(bf10) if bf10 >= 1 else abs(1/bf10):.1f} times more likely "
        f"under {'H₁' if bf10 >= 1 else 'H₀'} than under {'H₀' if bf10 >= 1 else 'H₁'}. "
        f"Assuming equal prior probabilities, the posterior probability of H₁ is "
        f"{probs['p_h1']*100:.1f}%."
    )

    return text


def json_safe(value):
    """
    Recursively coerce a result structure into JSON-serializable form for
    Django REST Framework's ``JSONRenderer`` (which rejects inf/-inf/nan).

    - non-finite floats (inf, -inf, nan) -> ``None``
    - numpy scalars -> native Python ``int``/``float`` (then non-finite -> ``None``)
    - numpy arrays / tuples -> lists
    - dicts / lists recursed element-wise

    This lets a degenerate analysis that legitimately yields a non-finite
    statistic (e.g. F = inf under perfect separation, or BF10 = inf) serialize
    as ``null`` instead of 500-ing the endpoint -- without ever substituting a
    fabricated finite value for the real result.
    """
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value]
    if isinstance(value, np.ndarray):
        return [json_safe(v) for v in value.tolist()]
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        value = float(value)
    if isinstance(value, float):
        return value if np.isfinite(value) else None
    return value
