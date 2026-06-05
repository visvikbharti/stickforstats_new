"""
Bayesian T-Tests
================

Implementation of Bayesian alternatives to frequentist t-tests using
the JZS (Jeffreys-Zellner-Siow) approach.

Tests implemented:
- One-sample t-test
- Independent samples (two-sample) t-test
- Paired samples t-test

References:
    Rouder, J. N., Speckman, P. L., Sun, D., Morey, R. D., & Iverson, G. (2009).
    Bayesian t tests for accepting and rejecting the null hypothesis.
    Psychonomic Bulletin & Review, 16(2), 225-237.

    Morey, R. D., & Rouder, J. N. (2011).
    Bayes factor approaches for testing interval null hypotheses.
    Psychological Methods, 16(4), 406.

Created: December 26, 2025
"""

from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass, asdict
import numpy as np
from scipy import stats, integrate

from .bayes_factor import interpret_bayes_factor, bayes_factor_to_probability, json_safe
from .priors import get_prior_scale_value, CauchyPrior, PRIOR_SCALES
from .posterior import (
    compute_posterior_ttest,
    compute_posterior_two_sample,
    compute_hdi,
    rope_analysis,
    posterior_summary,
)


@dataclass
class BayesianTTestResult:
    """Complete result from a Bayesian t-test."""

    # Test identification
    test_type: str  # 'one_sample', 'two_sample', 'paired'

    # Bayes Factor
    bf10: float  # BF in favor of H1
    bf01: float  # BF in favor of H0
    log_bf10: float

    # Interpretation
    interpretation: Dict[str, Any]
    posterior_probability_h1: float
    posterior_probability_h0: float

    # Effect size
    effect_size: float  # Cohen's d
    effect_size_hdi: Tuple[float, float]

    # Prior
    prior_scale: float
    prior_description: str

    # Posterior
    posterior_median: float
    posterior_mean: float
    posterior_mode: float
    posterior_sd: float

    # ROPE (if applicable)
    rope_analysis: Optional[Dict[str, Any]]

    # Frequentist comparison
    frequentist_t: float
    frequentist_df: float
    frequentist_p: float

    # Sample info
    n: int
    n1: Optional[int]  # For two-sample
    n2: Optional[int]  # For two-sample

    # Visualization data
    posterior_x: List[float]
    posterior_y: List[float]
    prior_x: List[float]
    prior_y: List[float]

    # Robustness
    robustness_check: Optional[Dict[str, float]]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return json_safe(asdict(self))


def _jzs_bf10_from_t(t: float, n_eff: float, df: int, r: float = 0.707) -> float:
    """
    JZS Bayes factor (BF10) from a t-statistic via the Rouder et al. (2009)
    closed-form g-integral.

    BF10 = integral_0^inf f(g) dg / (1 + t^2/df)^(-(df+1)/2), with

        f(g) = (1 + n_eff*g*r^2)^(-1/2)
               * (1 + t^2 / ((1 + n_eff*g*r^2) * df))^(-(df+1)/2)
               * (2*pi)^(-1/2) * g^(-3/2) * exp(-1/(2*g))

    The integration is over the prior-variance parameter g on (0, inf) and
    never evaluates the noncentral-t density, so it is numerically stable.
    (The previous implementation integrated nct.pdf over (-inf, +inf); scipy's
    nct.pdf returns NaN at the Cauchy prior's extreme-noncentrality tails, the
    integral came back NaN, the ``marginal_h1 > 0`` guard was False, and EVERY
    t-test silently returned the fabricated fallback BF10 = 1.0.)

    Verified against ``pingouin.bayesfactor_ttest`` to machine precision.

    Args:
        t: observed t-statistic
        n_eff: effective sample size (N for one-sample/paired;
            n1*n2/(n1+n2) for two-sample)
        df: degrees of freedom
        r: Cauchy prior scale on the standardized effect size

    Returns:
        BF10 (evidence for H1 over H0)
    """
    if np.isinf(t):
        # Zero within-sample variance with a non-null mean: infinite
        # separation from H0 => unbounded evidence for H1.
        return float("inf")
    if np.isnan(t) or df <= 0:
        raise ValueError(
            f"JZS Bayes factor is undefined for t={t}, df={df} "
            "(degenerate input: zero variance or insufficient sample size)."
        )

    def integrand(g):
        return (
            (1.0 + n_eff * g * r ** 2) ** (-0.5)
            * (1.0 + t ** 2 / ((1.0 + n_eff * g * r ** 2) * df)) ** (-(df + 1) / 2.0)
            * (2.0 * np.pi) ** (-0.5)
            * g ** (-1.5)
            * np.exp(-1.0 / (2.0 * g))
        )

    numerator, _ = integrate.quad(integrand, 0, np.inf, limit=100)
    denominator = (1.0 + t ** 2 / df) ** (-(df + 1) / 2.0)
    bf10 = numerator / denominator

    if not np.isfinite(bf10) or bf10 <= 0:
        # Should be unreachable for finite t and df >= 1; never silently
        # downgrade a failed integral to the misleading BF10 = 1.0.
        raise ValueError(
            f"JZS Bayes factor integration produced a non-finite value "
            f"(t={t}, n_eff={n_eff}, df={df}, r={r})."
        )
    return float(bf10)


def _compute_jzs_bf_one_sample(t: float, n: int, r: float = 0.707) -> float:
    """
    Compute the JZS Bayes Factor (BF10) for a one-sample (or paired) t-test.

    Args:
        t: Observed t-statistic
        n: Sample size (number of observations / pairs)
        r: Cauchy prior scale

    Returns:
        BF10 (Bayes Factor in favor of H1)
    """
    return _jzs_bf10_from_t(t, n_eff=n, df=n - 1, r=r)


def _compute_jzs_bf_two_sample(t: float, n1: int, n2: int, r: float = 0.707) -> float:
    """
    Compute the JZS Bayes Factor (BF10) for a two-sample t-test.

    Args:
        t: Observed t-statistic
        n1: Sample size of group 1
        n2: Sample size of group 2
        r: Cauchy prior scale

    Returns:
        BF10 (Bayes Factor in favor of H1)
    """
    n_eff = (n1 * n2) / (n1 + n2)
    return _jzs_bf10_from_t(t, n_eff=n_eff, df=n1 + n2 - 2, r=r)


def bayesian_one_sample_ttest(
    data: np.ndarray,
    mu: float = 0,
    prior_scale: float = 0.707,
    rope_low: float = -0.1,
    rope_high: float = 0.1,
    credible_mass: float = 0.95,
    robustness_check: bool = True,
) -> BayesianTTestResult:
    """
    Perform Bayesian one-sample t-test.

    Tests H0: mean = mu vs H1: mean != mu using the JZS approach.

    Args:
        data: Sample data (1D array)
        mu: Null hypothesis value (default 0)
        prior_scale: Cauchy prior scale (default 0.707 = medium)
        rope_low: Lower bound of ROPE for effect size
        rope_high: Upper bound of ROPE for effect size
        credible_mass: Mass for credible interval (default 0.95)
        robustness_check: Whether to compute BF across different priors

    Returns:
        BayesianTTestResult with full analysis

    Example:
        >>> data = np.array([1.2, 1.5, 1.8, 2.1, 1.9, 2.3, 1.7, 2.0])
        >>> result = bayesian_one_sample_ttest(data, mu=0)
        >>> print(f"BF10 = {result.bf10:.2f}")
    """
    data = np.asarray(data).flatten()
    n = len(data)

    # Descriptive statistics
    x_mean = np.mean(data)
    x_sd = np.std(data, ddof=1)
    x_se = x_sd / np.sqrt(n)

    # Frequentist t-test
    t_stat = (x_mean - mu) / x_se
    df = n - 1
    p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df))

    # Effect size (Cohen's d)
    effect_size = (x_mean - mu) / x_sd

    # Get prior scale value
    r = get_prior_scale_value(prior_scale) if isinstance(prior_scale, str) else prior_scale

    # Compute Bayes Factor
    bf10 = _compute_jzs_bf_one_sample(t_stat, n, r)
    bf01 = 1 / bf10 if bf10 > 0 else float("inf")
    log_bf10 = np.log(bf10) if bf10 > 0 else float("-inf")

    # Interpretation
    interpretation = interpret_bayes_factor(bf10)
    probs = bayes_factor_to_probability(bf10)

    # Compute posterior distribution
    delta_range, posterior = compute_posterior_ttest(data, mu, r)

    # Posterior summary
    post_summary = posterior_summary(posterior_density=(delta_range, posterior), credible_mass=credible_mass)

    # Effect size HDI
    hdi_low, hdi_high = compute_hdi(posterior_density=(delta_range, posterior), credible_mass=credible_mass)

    # ROPE analysis
    rope_result = rope_analysis(posterior_density=(delta_range, posterior), rope_low=rope_low, rope_high=rope_high)

    # Prior visualization
    prior = CauchyPrior(location=0, scale=r)
    prior_x = np.linspace(-3, 3, 200)
    prior_y = prior.pdf(prior_x)

    # Robustness check across different priors
    robustness = None
    if robustness_check:
        robustness = {}
        for scale_name, scale_info in PRIOR_SCALES.items():
            bf_r = _compute_jzs_bf_one_sample(t_stat, n, scale_info["r"])
            robustness[scale_name] = bf_r

    # Get prior description
    if isinstance(prior_scale, str) and prior_scale.lower() in PRIOR_SCALES:
        prior_desc = PRIOR_SCALES[prior_scale.lower()]["description"]
    else:
        prior_desc = f"Custom Cauchy(0, {r})"

    return BayesianTTestResult(
        test_type="one_sample",
        bf10=float(bf10),
        bf01=float(bf01),
        log_bf10=float(log_bf10),
        interpretation=asdict(interpretation)
        if hasattr(interpretation, "__dict__")
        else {
            "level": interpretation.level,
            "label": interpretation.label,
            "favors": interpretation.favors,
            "strength": interpretation.strength,
            "color": interpretation.color,
        },
        posterior_probability_h1=probs["p_h1"],
        posterior_probability_h0=probs["p_h0"],
        effect_size=float(effect_size),
        effect_size_hdi=(float(hdi_low), float(hdi_high)),
        prior_scale=float(r),
        prior_description=prior_desc,
        posterior_median=post_summary.median,
        posterior_mean=post_summary.mean,
        posterior_mode=post_summary.mode,
        posterior_sd=post_summary.sd,
        rope_analysis={
            "rope_low": rope_result.rope_low,
            "rope_high": rope_result.rope_high,
            "percentage_in_rope": rope_result.percentage_in_rope,
            "percentage_below_rope": rope_result.percentage_below_rope,
            "percentage_above_rope": rope_result.percentage_above_rope,
            "decision": rope_result.decision,
            "decision_confidence": rope_result.decision_confidence,
        },
        frequentist_t=float(t_stat),
        frequentist_df=float(df),
        frequentist_p=float(p_value),
        n=n,
        n1=None,
        n2=None,
        posterior_x=delta_range.tolist(),
        posterior_y=posterior.tolist(),
        prior_x=prior_x.tolist(),
        prior_y=prior_y.tolist(),
        robustness_check=robustness,
    )


def bayesian_two_sample_ttest(
    group1: np.ndarray,
    group2: np.ndarray,
    prior_scale: float = 0.707,
    rope_low: float = -0.1,
    rope_high: float = 0.1,
    credible_mass: float = 0.95,
    robustness_check: bool = True,
) -> BayesianTTestResult:
    """
    Perform Bayesian independent samples t-test.

    Tests H0: mu1 = mu2 vs H1: mu1 != mu2 using the JZS approach.

    Args:
        group1: Data from group 1
        group2: Data from group 2
        prior_scale: Cauchy prior scale (default 0.707)
        rope_low: Lower bound of ROPE
        rope_high: Upper bound of ROPE
        credible_mass: Mass for credible interval
        robustness_check: Whether to check BF across priors

    Returns:
        BayesianTTestResult with full analysis

    Example:
        >>> group1 = np.array([2.1, 2.5, 2.8, 3.1, 2.9])
        >>> group2 = np.array([1.5, 1.8, 1.6, 1.9, 1.7])
        >>> result = bayesian_two_sample_ttest(group1, group2)
    """
    group1 = np.asarray(group1).flatten()
    group2 = np.asarray(group2).flatten()

    n1, n2 = len(group1), len(group2)
    n_total = n1 + n2

    # Descriptive statistics
    mean1, mean2 = np.mean(group1), np.mean(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)

    # Pooled standard deviation
    sp = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n_total - 2))

    # Standard error
    se = sp * np.sqrt(1 / n1 + 1 / n2)

    # Frequentist t-test
    t_stat = (mean1 - mean2) / se
    df = n_total - 2
    p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df))

    # Effect size (Cohen's d)
    effect_size = (mean1 - mean2) / sp

    # Get prior scale
    r = get_prior_scale_value(prior_scale) if isinstance(prior_scale, str) else prior_scale

    # Compute Bayes Factor
    bf10 = _compute_jzs_bf_two_sample(t_stat, n1, n2, r)
    bf01 = 1 / bf10 if bf10 > 0 else float("inf")
    log_bf10 = np.log(bf10) if bf10 > 0 else float("-inf")

    # Interpretation
    interpretation = interpret_bayes_factor(bf10)
    probs = bayes_factor_to_probability(bf10)

    # Compute posterior
    delta_range, posterior = compute_posterior_two_sample(group1, group2, r)

    # Posterior summary
    post_summary = posterior_summary(posterior_density=(delta_range, posterior), credible_mass=credible_mass)

    # HDI
    hdi_low, hdi_high = compute_hdi(posterior_density=(delta_range, posterior), credible_mass=credible_mass)

    # ROPE
    rope_result = rope_analysis(posterior_density=(delta_range, posterior), rope_low=rope_low, rope_high=rope_high)

    # Prior visualization
    prior = CauchyPrior(location=0, scale=r)
    prior_x = np.linspace(-3, 3, 200)
    prior_y = prior.pdf(prior_x)

    # Robustness
    robustness = None
    if robustness_check:
        robustness = {}
        for scale_name, scale_info in PRIOR_SCALES.items():
            bf_r = _compute_jzs_bf_two_sample(t_stat, n1, n2, scale_info["r"])
            robustness[scale_name] = bf_r

    # Prior description
    if isinstance(prior_scale, str) and prior_scale.lower() in PRIOR_SCALES:
        prior_desc = PRIOR_SCALES[prior_scale.lower()]["description"]
    else:
        prior_desc = f"Custom Cauchy(0, {r})"

    return BayesianTTestResult(
        test_type="two_sample",
        bf10=float(bf10),
        bf01=float(bf01),
        log_bf10=float(log_bf10),
        interpretation={
            "level": interpretation.level,
            "label": interpretation.label,
            "favors": interpretation.favors,
            "strength": interpretation.strength,
            "color": interpretation.color,
        },
        posterior_probability_h1=probs["p_h1"],
        posterior_probability_h0=probs["p_h0"],
        effect_size=float(effect_size),
        effect_size_hdi=(float(hdi_low), float(hdi_high)),
        prior_scale=float(r),
        prior_description=prior_desc,
        posterior_median=post_summary.median,
        posterior_mean=post_summary.mean,
        posterior_mode=post_summary.mode,
        posterior_sd=post_summary.sd,
        rope_analysis={
            "rope_low": rope_result.rope_low,
            "rope_high": rope_result.rope_high,
            "percentage_in_rope": rope_result.percentage_in_rope,
            "percentage_below_rope": rope_result.percentage_below_rope,
            "percentage_above_rope": rope_result.percentage_above_rope,
            "decision": rope_result.decision,
            "decision_confidence": rope_result.decision_confidence,
        },
        frequentist_t=float(t_stat),
        frequentist_df=float(df),
        frequentist_p=float(p_value),
        n=n_total,
        n1=n1,
        n2=n2,
        posterior_x=delta_range.tolist(),
        posterior_y=posterior.tolist(),
        prior_x=prior_x.tolist(),
        prior_y=prior_y.tolist(),
        robustness_check=robustness,
    )


def bayesian_paired_ttest(
    data1: np.ndarray,
    data2: np.ndarray,
    prior_scale: float = 0.707,
    rope_low: float = -0.1,
    rope_high: float = 0.1,
    credible_mass: float = 0.95,
    robustness_check: bool = True,
) -> BayesianTTestResult:
    """
    Perform Bayesian paired samples t-test.

    Tests H0: mean_diff = 0 vs H1: mean_diff != 0 using JZS.

    Reduces to a one-sample test on the differences.

    Args:
        data1: First measurement (pre-test, condition A, etc.)
        data2: Second measurement (post-test, condition B, etc.)
        prior_scale: Cauchy prior scale (default 0.707)
        rope_low: Lower bound of ROPE
        rope_high: Upper bound of ROPE
        credible_mass: Mass for credible interval
        robustness_check: Whether to check across priors

    Returns:
        BayesianTTestResult with full analysis

    Example:
        >>> pre = np.array([10, 12, 14, 11, 13])
        >>> post = np.array([12, 14, 15, 13, 16])
        >>> result = bayesian_paired_ttest(pre, post)
    """
    data1 = np.asarray(data1).flatten()
    data2 = np.asarray(data2).flatten()

    if len(data1) != len(data2):
        raise ValueError("Paired samples must have equal length")

    # Compute differences
    differences = data1 - data2

    # Perform one-sample test on differences
    result = bayesian_one_sample_ttest(
        data=differences,
        mu=0,
        prior_scale=prior_scale,
        rope_low=rope_low,
        rope_high=rope_high,
        credible_mass=credible_mass,
        robustness_check=robustness_check,
    )

    # Update test type
    return BayesianTTestResult(
        test_type="paired",
        bf10=result.bf10,
        bf01=result.bf01,
        log_bf10=result.log_bf10,
        interpretation=result.interpretation,
        posterior_probability_h1=result.posterior_probability_h1,
        posterior_probability_h0=result.posterior_probability_h0,
        effect_size=result.effect_size,
        effect_size_hdi=result.effect_size_hdi,
        prior_scale=result.prior_scale,
        prior_description=result.prior_description,
        posterior_median=result.posterior_median,
        posterior_mean=result.posterior_mean,
        posterior_mode=result.posterior_mode,
        posterior_sd=result.posterior_sd,
        rope_analysis=result.rope_analysis,
        frequentist_t=result.frequentist_t,
        frequentist_df=result.frequentist_df,
        frequentist_p=result.frequentist_p,
        n=len(differences),
        n1=len(data1),
        n2=len(data2),
        posterior_x=result.posterior_x,
        posterior_y=result.posterior_y,
        prior_x=result.prior_x,
        prior_y=result.prior_y,
        robustness_check=result.robustness_check,
    )


def generate_interpretation_text(result: BayesianTTestResult) -> str:
    """
    Generate human-readable interpretation of Bayesian t-test results.

    Args:
        result: BayesianTTestResult object

    Returns:
        Formatted interpretation text
    """
    test_names = {"one_sample": "one-sample", "two_sample": "independent samples", "paired": "paired samples"}
    test_name = test_names.get(result.test_type, result.test_type)

    # Main finding
    if result.bf10 >= 1:
        bf_str = f"BF10 = {result.bf10:.3f}"
        direction = "alternative hypothesis (H1)"
        times = result.bf10
    else:
        bf_str = f"BF01 = {result.bf01:.3f}"
        direction = "null hypothesis (H0)"
        times = result.bf01

    interp = result.interpretation

    text = f"""Bayesian {test_name} t-test Results:

Evidence: The {bf_str} indicates {interp['label'].lower()}. The data are approximately {times:.1f} times more likely under the {direction}.

Effect Size: Cohen's d = {result.effect_size:.3f}, {result.credible_mass*100:.0f}% HDI [{result.effect_size_hdi[0]:.3f}, {result.effect_size_hdi[1]:.3f}]

Posterior: median = {result.posterior_median:.3f}, mean = {result.posterior_mean:.3f}

Posterior Probability of H1: {result.posterior_probability_h1*100:.1f}%
"""

    # ROPE analysis
    if result.rope_analysis:
        rope = result.rope_analysis
        text += f"""
ROPE Analysis [{rope['rope_low']}, {rope['rope_high']}]:
  - In ROPE: {rope['percentage_in_rope']:.1f}%
  - Below ROPE: {rope['percentage_below_rope']:.1f}%
  - Above ROPE: {rope['percentage_above_rope']:.1f}%
  - Decision: {rope['decision'].replace('_', ' ').title()} ({rope['decision_confidence']} confidence)
"""

    # Frequentist comparison
    text += f"""
Frequentist Comparison:
  t({result.frequentist_df:.0f}) = {result.frequentist_t:.3f}, p = {result.frequentist_p:.4f}
"""

    # Robustness
    if result.robustness_check:
        text += "\nRobustness Check (BF10 across prior scales):\n"
        for scale, bf in result.robustness_check.items():
            text += f"  - {scale}: {bf:.3f}\n"

    return text
