"""
Posterior Distribution Computation
==================================

Utilities for computing and analyzing posterior distributions
from Bayesian statistical tests.

Includes:
- Posterior distribution computation
- Highest Density Interval (HDI) calculation
- ROPE (Region of Practical Equivalence) analysis
- Posterior predictive checks

References:
    Kruschke, J. K. (2014). Doing Bayesian Data Analysis (2nd ed.).
    Kruschke, J. K. (2018). Rejecting or accepting parameter values in Bayesian estimation.

Created: December 26, 2025
"""

from typing import Tuple, Dict, Any
import numpy as np
from scipy import stats
from dataclasses import dataclass


@dataclass
class PosteriorSummary:
    """Summary statistics for a posterior distribution."""

    mean: float
    median: float
    mode: float
    sd: float
    hdi_low: float
    hdi_high: float
    credible_mass: float
    skewness: float
    kurtosis: float


@dataclass
class ROPEResult:
    """Result of ROPE (Region of Practical Equivalence) analysis."""

    rope_low: float
    rope_high: float
    percentage_in_rope: float
    percentage_below_rope: float
    percentage_above_rope: float
    decision: str  # 'accept_null', 'reject_null', 'undecided'
    decision_confidence: str  # 'high', 'moderate', 'low'


def compute_posterior_ttest(
    data: np.ndarray, mu: float = 0, prior_scale: float = 0.707, delta_range: np.ndarray = None, n_points: int = 1000
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute posterior distribution for effect size in one-sample t-test.

    Uses the analytical form based on the non-central t distribution.

    Args:
        data: Sample data
        mu: Null hypothesis value
        prior_scale: Cauchy prior scale (r)
        delta_range: Range of effect sizes to evaluate (optional)
        n_points: Number of points for evaluation

    Returns:
        Tuple of (delta_values, posterior_density)
    """
    data = np.asarray(data)
    n = len(data)

    # Standardize data
    x_centered = data - mu
    x_mean = np.mean(x_centered)
    x_sd = np.std(x_centered, ddof=1)

    # Observed t-statistic
    t_obs = x_mean / (x_sd / np.sqrt(n))
    df = n - 1

    # Create delta range if not provided
    if delta_range is None:
        # Estimate reasonable range from data
        d_obs = x_mean / x_sd
        delta_range = np.linspace(d_obs - 3, d_obs + 3, n_points)

    # Compute prior: Cauchy(0, r)
    prior = stats.cauchy.pdf(delta_range, loc=0, scale=prior_scale)

    # Compute likelihood using non-central t distribution
    # Under H1 with effect size delta, t follows nct(df, ncp=delta*sqrt(n))
    ncp = delta_range * np.sqrt(n)  # Non-centrality parameters

    # Likelihood: probability of observing t_obs given each delta
    likelihood = np.array([stats.nct.pdf(t_obs, df, nc) for nc in ncp])

    # Posterior (unnormalized)
    posterior_unnorm = prior * likelihood

    # Normalize
    normalizing_constant = np.trapz(posterior_unnorm, delta_range)
    if normalizing_constant > 0:
        posterior = posterior_unnorm / normalizing_constant
    else:
        # Fallback if normalization fails
        posterior = posterior_unnorm / np.max(posterior_unnorm)

    return delta_range, posterior


def compute_posterior_two_sample(
    group1: np.ndarray,
    group2: np.ndarray,
    prior_scale: float = 0.707,
    delta_range: np.ndarray = None,
    n_points: int = 1000,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute posterior for effect size in two-sample t-test.

    Args:
        group1: First group data
        group2: Second group data
        prior_scale: Cauchy prior scale
        delta_range: Range of effect sizes to evaluate
        n_points: Number of evaluation points

    Returns:
        Tuple of (delta_values, posterior_density)
    """
    group1 = np.asarray(group1)
    group2 = np.asarray(group2)

    n1, n2 = len(group1), len(group2)
    n = n1 + n2

    # Pooled standard deviation
    var1 = np.var(group1, ddof=1)
    var2 = np.var(group2, ddof=1)
    sp = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n - 2))

    # Observed effect size (Cohen's d)
    d_obs = (np.mean(group1) - np.mean(group2)) / sp

    # Observed t-statistic
    se = sp * np.sqrt(1 / n1 + 1 / n2)
    t_obs = (np.mean(group1) - np.mean(group2)) / se
    df = n - 2

    # Effective sample size for ncp
    n_eff = (n1 * n2) / n

    # Create delta range
    if delta_range is None:
        delta_range = np.linspace(d_obs - 3, d_obs + 3, n_points)

    # Prior
    prior = stats.cauchy.pdf(delta_range, loc=0, scale=prior_scale)

    # Likelihood
    ncp = delta_range * np.sqrt(n_eff)
    likelihood = np.array([stats.nct.pdf(t_obs, df, nc) for nc in ncp])

    # Posterior
    posterior_unnorm = prior * likelihood
    normalizing_constant = np.trapz(posterior_unnorm, delta_range)

    if normalizing_constant > 0:
        posterior = posterior_unnorm / normalizing_constant
    else:
        posterior = posterior_unnorm / np.max(posterior_unnorm)

    return delta_range, posterior


def compute_hdi(
    posterior_samples: np.ndarray = None,
    posterior_density: Tuple[np.ndarray, np.ndarray] = None,
    credible_mass: float = 0.95,
) -> Tuple[float, float]:
    """
    Compute Highest Density Interval (HDI).

    The HDI is the narrowest interval containing the specified credible mass.

    Args:
        posterior_samples: MCMC samples from posterior (optional)
        posterior_density: Tuple of (x_values, density_values) (optional)
        credible_mass: Desired credible mass (default 0.95)

    Returns:
        Tuple of (hdi_low, hdi_high)
    """
    if posterior_samples is not None:
        # From samples
        sorted_samples = np.sort(posterior_samples)
        n = len(sorted_samples)

        # Number of samples to include
        n_include = int(np.ceil(n * credible_mass))

        # Number of intervals to consider
        n_intervals = n - n_include

        # Find narrowest interval
        interval_widths = sorted_samples[n_include:] - sorted_samples[:n_intervals]
        min_idx = np.argmin(interval_widths)

        hdi_low = sorted_samples[min_idx]
        hdi_high = sorted_samples[min_idx + n_include]

    elif posterior_density is not None:
        x, y = posterior_density

        # Sort by density (descending)
        sorted_indices = np.argsort(y)[::-1]

        # Accumulate probability mass until reaching credible_mass
        cumulative_mass = 0
        included_indices = []

        dx = x[1] - x[0] if len(x) > 1 else 1
        total_mass = np.sum(y) * dx

        for idx in sorted_indices:
            cumulative_mass += y[idx] * dx / total_mass
            included_indices.append(idx)
            if cumulative_mass >= credible_mass:
                break

        # HDI is the range of included x values
        included_x = x[included_indices]
        hdi_low = np.min(included_x)
        hdi_high = np.max(included_x)

    else:
        raise ValueError("Must provide either posterior_samples or posterior_density")

    return float(hdi_low), float(hdi_high)


def rope_analysis(
    posterior_samples: np.ndarray = None,
    posterior_density: Tuple[np.ndarray, np.ndarray] = None,
    rope_low: float = -0.1,
    rope_high: float = 0.1,
) -> ROPEResult:
    """
    Perform ROPE (Region of Practical Equivalence) analysis.

    ROPE analysis determines whether an effect is practically equivalent
    to zero (null) based on the posterior distribution.

    Decision rules (Kruschke, 2018):
    - Accept null: >95% of posterior in ROPE
    - Reject null: >95% of posterior outside ROPE
    - Undecided: Otherwise

    Args:
        posterior_samples: MCMC samples from posterior
        posterior_density: Tuple of (x_values, density_values)
        rope_low: Lower bound of ROPE (default -0.1 for small effect)
        rope_high: Upper bound of ROPE (default 0.1)

    Returns:
        ROPEResult with percentages and decision
    """
    if posterior_samples is not None:
        samples = posterior_samples
        in_rope = np.mean((samples >= rope_low) & (samples <= rope_high)) * 100
        below_rope = np.mean(samples < rope_low) * 100
        above_rope = np.mean(samples > rope_high) * 100

    elif posterior_density is not None:
        x, y = posterior_density
        dx = x[1] - x[0] if len(x) > 1 else 1
        total = np.sum(y) * dx

        # In ROPE
        mask_rope = (x >= rope_low) & (x <= rope_high)
        in_rope = np.sum(y[mask_rope]) * dx / total * 100

        # Below ROPE
        mask_below = x < rope_low
        below_rope = np.sum(y[mask_below]) * dx / total * 100

        # Above ROPE
        mask_above = x > rope_high
        above_rope = np.sum(y[mask_above]) * dx / total * 100

    else:
        raise ValueError("Must provide either posterior_samples or posterior_density")

    # Decision
    if in_rope > 95:
        decision = "accept_null"
        decision_confidence = "high"
    elif in_rope > 90:
        decision = "accept_null"
        decision_confidence = "moderate"
    elif in_rope < 5:
        decision = "reject_null"
        decision_confidence = "high"
    elif in_rope < 10:
        decision = "reject_null"
        decision_confidence = "moderate"
    else:
        decision = "undecided"
        if in_rope < 25 or in_rope > 75:
            decision_confidence = "moderate"
        else:
            decision_confidence = "low"

    return ROPEResult(
        rope_low=rope_low,
        rope_high=rope_high,
        percentage_in_rope=in_rope,
        percentage_below_rope=below_rope,
        percentage_above_rope=above_rope,
        decision=decision,
        decision_confidence=decision_confidence,
    )


def posterior_summary(
    posterior_samples: np.ndarray = None,
    posterior_density: Tuple[np.ndarray, np.ndarray] = None,
    credible_mass: float = 0.95,
) -> PosteriorSummary:
    """
    Compute summary statistics for posterior distribution.

    Args:
        posterior_samples: MCMC samples
        posterior_density: Tuple of (x, density)
        credible_mass: Mass for HDI (default 0.95)

    Returns:
        PosteriorSummary with all statistics
    """
    if posterior_samples is not None:
        samples = posterior_samples
        mean = np.mean(samples)
        median = np.median(samples)
        mode = samples[np.argmax(np.histogram(samples, bins=100)[0])]
        sd = np.std(samples, ddof=1)
        skewness = stats.skew(samples)
        kurtosis = stats.kurtosis(samples)
        hdi_low, hdi_high = compute_hdi(posterior_samples=samples, credible_mass=credible_mass)

    elif posterior_density is not None:
        x, y = posterior_density
        dx = x[1] - x[0] if len(x) > 1 else 1
        total = np.sum(y) * dx

        # Normalize
        y_norm = y / total

        # Mean
        mean = np.sum(x * y_norm) * dx

        # Mode
        mode = x[np.argmax(y)]

        # Median (find where CDF = 0.5)
        cdf = np.cumsum(y_norm) * dx
        median_idx = np.searchsorted(cdf, 0.5)
        median = x[median_idx] if median_idx < len(x) else x[-1]

        # Variance and SD
        variance = np.sum((x - mean) ** 2 * y_norm) * dx
        sd = np.sqrt(variance)

        # Skewness and kurtosis (approximations)
        skewness = np.sum(((x - mean) / sd) ** 3 * y_norm) * dx
        kurtosis = np.sum(((x - mean) / sd) ** 4 * y_norm) * dx - 3

        # HDI
        hdi_low, hdi_high = compute_hdi(posterior_density=(x, y), credible_mass=credible_mass)

    else:
        raise ValueError("Must provide either posterior_samples or posterior_density")

    return PosteriorSummary(
        mean=float(mean),
        median=float(median),
        mode=float(mode),
        sd=float(sd),
        hdi_low=float(hdi_low),
        hdi_high=float(hdi_high),
        credible_mass=credible_mass,
        skewness=float(skewness),
        kurtosis=float(kurtosis),
    )


def generate_posterior_samples(posterior_density: Tuple[np.ndarray, np.ndarray], n_samples: int = 10000) -> np.ndarray:
    """
    Generate samples from a posterior distribution using inverse CDF.

    Args:
        posterior_density: Tuple of (x_values, density_values)
        n_samples: Number of samples to generate

    Returns:
        Array of posterior samples
    """
    x, y = posterior_density

    # Normalize to create valid PDF
    dx = x[1] - x[0] if len(x) > 1 else 1
    y_norm = y / (np.sum(y) * dx)

    # Create CDF
    cdf = np.cumsum(y_norm) * dx

    # Generate uniform random values
    u = np.random.uniform(0, 1, n_samples)

    # Inverse CDF sampling
    samples = np.interp(u, cdf, x)

    return samples


def posterior_predictive_check(
    data: np.ndarray, posterior_samples: np.ndarray, n_simulations: int = 1000, test_statistic: callable = None
) -> Dict[str, Any]:
    """
    Perform posterior predictive check.

    Simulates data from the posterior and compares to observed data.

    Args:
        data: Observed data
        posterior_samples: Samples of parameter from posterior
        n_simulations: Number of simulated datasets
        test_statistic: Function to compute test statistic (default: mean)

    Returns:
        Dictionary with p-value and diagnostic information
    """
    if test_statistic is None:
        test_statistic = np.mean

    observed_stat = test_statistic(data)
    n = len(data)

    # Simulate data from posterior
    simulated_stats = []
    for i in range(min(n_simulations, len(posterior_samples))):
        # Sample a parameter value
        delta = posterior_samples[i]

        # Generate data from this parameter
        # Assuming normal distribution with effect size delta
        simulated_data = np.random.normal(delta, 1, n)
        simulated_stats.append(test_statistic(simulated_data))

    simulated_stats = np.array(simulated_stats)

    # Posterior predictive p-value
    ppp = np.mean(simulated_stats >= observed_stat)

    return {
        "observed_statistic": observed_stat,
        "simulated_statistics": simulated_stats.tolist(),
        "posterior_predictive_p": ppp,
        "mean_simulated": np.mean(simulated_stats),
        "sd_simulated": np.std(simulated_stats, ddof=1),
    }
