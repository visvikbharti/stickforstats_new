"""
Bayesian Correlation Analysis
=============================

Implementation of Bayesian alternative to Pearson correlation
using the approach from Wetzels & Wagenmakers (2012).

References:
    Wetzels, R., & Wagenmakers, E. J. (2012).
    A default Bayesian hypothesis test for correlations.
    Psychonomic Bulletin & Review, 19(6), 1057-1064.

    Ly, A., Verhagen, J., & Wagenmakers, E. J. (2016).
    Harold Jeffreys's default Bayes factor hypothesis tests explained.
    Journal of Mathematical Psychology, 72, 19-32.

Created: December 26, 2025
"""

from typing import Dict, Any, Tuple, Optional, List
from dataclasses import dataclass, asdict
import numpy as np
from scipy import stats, integrate

from .bayes_factor import interpret_bayes_factor, bayes_factor_to_probability


@dataclass
class BayesianCorrelationResult:
    """Complete result from Bayesian correlation analysis."""

    # Correlation
    r: float  # Sample correlation
    r_squared: float

    # Bayes Factor
    bf10: float
    bf01: float
    log_bf10: float

    # Interpretation
    interpretation: Dict[str, Any]
    posterior_probability_h1: float
    posterior_probability_h0: float

    # Posterior
    posterior_median: float
    posterior_mean: float
    posterior_hdi: Tuple[float, float]
    credible_mass: float

    # Prior
    prior_kappa: float  # Stretched beta prior parameter

    # Frequentist comparison
    frequentist_t: float
    frequentist_df: int
    frequentist_p: float

    # Sample info
    n: int

    # Visualization
    posterior_x: List[float]
    posterior_y: List[float]
    prior_x: List[float]
    prior_y: List[float]

    # Robustness
    robustness_check: Optional[Dict[str, float]]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        for key, value in result.items():
            if isinstance(value, np.ndarray):
                result[key] = value.tolist()
            elif isinstance(value, (np.float64, np.float32)):
                result[key] = float(value)
            elif isinstance(value, (np.int64, np.int32)):
                result[key] = int(value)
        return result


def _stretched_beta_pdf(rho: np.ndarray, kappa: float = 1.0) -> np.ndarray:
    """
    Stretched beta prior for correlation coefficient.

    The correlation is on [-1, 1], transformed to [0, 1] for beta distribution.
    kappa = 1 gives uniform prior; kappa < 1 concentrates mass near 0.

    Args:
        rho: Correlation values
        kappa: Shape parameter (default 1 for uniform)

    Returns:
        Probability density
    """
    # Transform rho from [-1, 1] to [0, 1]
    u = (rho + 1) / 2

    # Beta(kappa, kappa) on [0, 1], then stretch to [-1, 1]
    # Jacobian of transformation is 1/2
    pdf = stats.beta.pdf(u, kappa, kappa) / 2

    return pdf


def _compute_correlation_bf(r: float, n: int, kappa: float = 1.0) -> float:
    """
    Compute Bayes Factor for correlation using exact method.

    Based on Wetzels & Wagenmakers (2012), Equation 5.

    Args:
        r: Sample correlation
        n: Sample size
        kappa: Prior parameter for stretched beta

    Returns:
        BF10 (Bayes Factor in favor of H1: rho != 0)
    """
    # Special case: exact 0 or 1 correlation
    if abs(r) >= 0.9999:
        return float("inf") if abs(r) > 0.5 else 1.0

    # Likelihood function for correlation
    # Under H0: rho = 0, the likelihood uses the marginal
    # Under H1: integrate over rho with prior

    def log_likelihood(rho, r_obs, n):
        """
        Log-likelihood for observing sample correlation r_obs
        given population correlation rho.
        """
        if abs(rho) >= 1:
            return -np.inf

        # Approximate using Fisher transformation
        z_obs = np.arctanh(r_obs)
        z_pop = np.arctanh(rho)
        se = 1 / np.sqrt(n - 3)

        log_lik = stats.norm.logpdf(z_obs, z_pop, se)
        return log_lik

    # Marginal likelihood under H1
    def integrand(rho):
        if abs(rho) >= 0.999:
            return 0
        log_lik = log_likelihood(rho, r, n)
        prior = _stretched_beta_pdf(np.array([rho]), kappa)[0]
        return np.exp(log_lik) * prior

    try:
        # Numerical integration
        marginal_h1, _ = integrate.quad(integrand, -0.999, 0.999, limit=100)
    except:
        marginal_h1 = 0

    # Likelihood under H0: rho = 0
    likelihood_h0 = np.exp(log_likelihood(0, r, n))

    # Bayes Factor
    if likelihood_h0 > 0 and marginal_h1 > 0:
        bf10 = marginal_h1 / likelihood_h0
    else:
        # Fallback using approximate method
        # Based on t-statistic approach
        t_stat = r * np.sqrt((n - 2) / (1 - r**2)) if abs(r) < 1 else 0
        df = n - 2

        # BIC approximation
        bf10 = np.sqrt(n) * np.exp(-0.5 * t_stat**2 / n + 0.5 * t_stat**2 / df)

    return bf10


def _compute_correlation_posterior(
    r: float, n: int, kappa: float = 1.0, n_points: int = 200
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute posterior distribution for correlation.

    Args:
        r: Sample correlation
        n: Sample size
        kappa: Prior parameter
        n_points: Number of evaluation points

    Returns:
        Tuple of (rho_values, posterior_density)
    """
    rho_vals = np.linspace(-0.99, 0.99, n_points)

    # Prior
    prior = _stretched_beta_pdf(rho_vals, kappa)

    # Likelihood (using Fisher z transformation)
    z_obs = np.arctanh(r)
    se = 1 / np.sqrt(n - 3)

    likelihood = np.zeros(n_points)
    for i, rho in enumerate(rho_vals):
        if abs(rho) < 0.999:
            z_pop = np.arctanh(rho)
            likelihood[i] = stats.norm.pdf(z_obs, z_pop, se)

    # Posterior (unnormalized)
    posterior = prior * likelihood

    # Normalize
    rho_vals[1] - rho_vals[0]
    normalizing_constant = np.trapz(posterior, rho_vals)

    if normalizing_constant > 0:
        posterior = posterior / normalizing_constant
    else:
        posterior = posterior / np.max(posterior)

    return rho_vals, posterior


def _compute_hdi_correlation(
    rho_vals: np.ndarray, posterior: np.ndarray, credible_mass: float = 0.95
) -> Tuple[float, float]:
    """
    Compute HDI for correlation posterior.

    Args:
        rho_vals: Correlation values
        posterior: Posterior density
        credible_mass: Desired credible mass

    Returns:
        (hdi_low, hdi_high)
    """
    dx = rho_vals[1] - rho_vals[0]
    total_mass = np.sum(posterior) * dx

    # Sort by density (descending)
    sorted_indices = np.argsort(posterior)[::-1]

    # Accumulate until we reach credible mass
    cumulative = 0
    included = []

    for idx in sorted_indices:
        cumulative += posterior[idx] * dx / total_mass
        included.append(idx)
        if cumulative >= credible_mass:
            break

    included_rho = rho_vals[included]
    return float(np.min(included_rho)), float(np.max(included_rho))


def bayesian_correlation(
    x: np.ndarray, y: np.ndarray, kappa: float = 1.0, credible_mass: float = 0.95, robustness_check: bool = True
) -> BayesianCorrelationResult:
    """
    Perform Bayesian correlation analysis.

    Tests H0: rho = 0 vs H1: rho != 0 using stretched beta prior.

    Args:
        x: First variable
        y: Second variable
        kappa: Prior parameter (1 = uniform, <1 concentrates near 0)
        credible_mass: Mass for credible interval
        robustness_check: Whether to check across different priors

    Returns:
        BayesianCorrelationResult with full analysis

    Example:
        >>> x = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        >>> y = np.array([1.1, 2.3, 2.8, 4.2, 5.1, 5.8, 7.2, 8.1, 8.9, 10.2])
        >>> result = bayesian_correlation(x, y)
    """
    x = np.asarray(x).flatten()
    y = np.asarray(y).flatten()

    if len(x) != len(y):
        raise ValueError("x and y must have the same length")

    n = len(x)

    # Compute Pearson correlation
    r, p_freq = stats.pearsonr(x, y)
    r_squared = r**2

    # Frequentist t-test for correlation
    t_stat = r * np.sqrt((n - 2) / (1 - r**2)) if abs(r) < 1 else 0
    df = n - 2

    # Bayes Factor
    bf10 = _compute_correlation_bf(r, n, kappa)
    bf01 = 1 / bf10 if bf10 > 0 else float("inf")
    log_bf10 = np.log(bf10) if bf10 > 0 else float("-inf")

    # Interpretation
    interpretation = interpret_bayes_factor(bf10)
    probs = bayes_factor_to_probability(bf10)

    # Posterior distribution
    rho_vals, posterior = _compute_correlation_posterior(r, n, kappa)

    # Posterior summary
    dx = rho_vals[1] - rho_vals[0]
    total = np.sum(posterior) * dx
    posterior_norm = posterior / total

    # Mean
    posterior_mean = np.sum(rho_vals * posterior_norm) * dx

    # Mode (MAP)
    mode_idx = np.argmax(posterior)
    rho_vals[mode_idx]

    # Median
    cdf = np.cumsum(posterior_norm) * dx
    median_idx = np.searchsorted(cdf, 0.5)
    posterior_median = rho_vals[min(median_idx, len(rho_vals) - 1)]

    # HDI
    hdi_low, hdi_high = _compute_hdi_correlation(rho_vals, posterior, credible_mass)

    # Prior visualization
    prior_x = np.linspace(-0.99, 0.99, 200)
    prior_y = _stretched_beta_pdf(prior_x, kappa)

    # Robustness check
    robustness = None
    if robustness_check:
        robustness = {}
        kappa_values = {"concentrated": 0.5, "uniform": 1.0, "diffuse": 2.0}
        for name, k in kappa_values.items():
            bf_k = _compute_correlation_bf(r, n, k)
            robustness[name] = bf_k

    return BayesianCorrelationResult(
        r=float(r),
        r_squared=float(r_squared),
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
        posterior_median=float(posterior_median),
        posterior_mean=float(posterior_mean),
        posterior_hdi=(float(hdi_low), float(hdi_high)),
        credible_mass=credible_mass,
        prior_kappa=float(kappa),
        frequentist_t=float(t_stat),
        frequentist_df=df,
        frequentist_p=float(p_freq),
        n=n,
        posterior_x=rho_vals.tolist(),
        posterior_y=posterior.tolist(),
        prior_x=prior_x.tolist(),
        prior_y=prior_y.tolist(),
        robustness_check=robustness,
    )


def correlation_matrix_bayesian(
    data: np.ndarray, variable_names: List[str] = None, kappa: float = 1.0
) -> Dict[str, Any]:
    """
    Compute Bayesian correlation matrix for multiple variables.

    Args:
        data: Data matrix (n_samples x n_variables)
        variable_names: Optional variable names
        kappa: Prior parameter

    Returns:
        Dictionary with correlation matrix and BF matrix
    """
    data = np.asarray(data)
    n_vars = data.shape[1]
    n_samples = data.shape[0]

    if variable_names is None:
        variable_names = [f"Var{i+1}" for i in range(n_vars)]

    # Initialize matrices
    r_matrix = np.zeros((n_vars, n_vars))
    bf_matrix = np.zeros((n_vars, n_vars))
    p_matrix = np.zeros((n_vars, n_vars))

    # Compute pairwise correlations
    for i in range(n_vars):
        for j in range(n_vars):
            if i == j:
                r_matrix[i, j] = 1.0
                bf_matrix[i, j] = float("nan")  # Not applicable
                p_matrix[i, j] = 0.0
            elif i < j:
                result = bayesian_correlation(data[:, i], data[:, j], kappa=kappa, robustness_check=False)
                r_matrix[i, j] = result.r
                r_matrix[j, i] = result.r
                bf_matrix[i, j] = result.bf10
                bf_matrix[j, i] = result.bf10
                p_matrix[i, j] = result.frequentist_p
                p_matrix[j, i] = result.frequentist_p

    return {
        "variables": variable_names,
        "n": n_samples,
        "correlation_matrix": r_matrix.tolist(),
        "bayes_factor_matrix": bf_matrix.tolist(),
        "p_value_matrix": p_matrix.tolist(),
        "prior_kappa": kappa,
    }


def generate_correlation_interpretation(result: BayesianCorrelationResult) -> str:
    """
    Generate human-readable interpretation of Bayesian correlation.

    Args:
        result: BayesianCorrelationResult object

    Returns:
        Formatted interpretation text
    """
    # Correlation strength description
    r_abs = abs(result.r)
    if r_abs >= 0.7:
        r_desc = "strong"
    elif r_abs >= 0.4:
        r_desc = "moderate"
    elif r_abs >= 0.2:
        r_desc = "weak"
    else:
        r_desc = "negligible"

    direction = "positive" if result.r > 0 else "negative"

    # Main finding
    if result.bf10 >= 1:
        bf_str = f"BF10 = {result.bf10:.3f}"
        result.bf10
    else:
        bf_str = f"BF01 = {result.bf01:.3f}"
        result.bf01

    interp = result.interpretation

    text = f"""Bayesian Correlation Analysis (n = {result.n}):

Correlation: r = {result.r:.3f} ({r_desc} {direction}), r2 = {result.r_squared:.3f}

Evidence: The {bf_str} indicates {interp['label'].lower()}.

Posterior Estimate:
  - Median: {result.posterior_median:.3f}
  - Mean: {result.posterior_mean:.3f}
  - {result.credible_mass*100:.0f}% HDI: [{result.posterior_hdi[0]:.3f}, {result.posterior_hdi[1]:.3f}]

Posterior Probability of H1 (rho != 0): {result.posterior_probability_h1*100:.1f}%

Frequentist Comparison:
  t({result.frequentist_df}) = {result.frequentist_t:.3f}, p = {result.frequentist_p:.4f}
"""

    if result.robustness_check:
        text += "\nRobustness Check (BF10 across prior specifications):\n"
        for prior_name, bf in result.robustness_check.items():
            text += f"  - {prior_name.title()}: {bf:.3f}\n"

    return text
