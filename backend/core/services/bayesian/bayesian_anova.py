"""
Bayesian One-Way ANOVA
======================

Implementation of Bayesian alternative to one-way ANOVA using
the JZS approach for comparing multiple group means.

References:
    Rouder, J. N., Morey, R. D., Speckman, P. L., & Province, J. M. (2012).
    Default Bayes factors for ANOVA designs. Journal of Mathematical Psychology, 56(5), 356-374.

    Wetzels, R., Grasman, R. P., & Wagenmakers, E. J. (2012).
    A default Bayesian hypothesis test for ANOVA designs.
    The American Statistician, 66(2), 104-111.

Created: December 26, 2025
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
import numpy as np
from scipy import stats, integrate

from .bayes_factor import interpret_bayes_factor, bayes_factor_to_probability, json_safe
from .priors import get_prior_scale_value, PRIOR_SCALES


@dataclass
class BayesianAnovaResult:
    """Complete result from Bayesian one-way ANOVA."""

    # Bayes Factor
    bf10: float
    bf01: float
    log_bf10: float

    # Interpretation
    interpretation: Dict[str, Any]
    posterior_probability_h1: float
    posterior_probability_h0: float

    # Effect size
    eta_squared: float  # Explained variance
    omega_squared: float  # Bias-corrected

    # Prior
    prior_scale: float

    # Group statistics
    group_means: List[float]
    group_sds: List[float]
    group_ns: List[int]
    grand_mean: float

    # Frequentist comparison
    frequentist_f: float
    frequentist_df_between: int
    frequentist_df_within: int
    frequentist_p: float

    # Sample info
    n_groups: int
    n_total: int

    # Post-hoc (pairwise comparisons)
    pairwise_bf: Optional[Dict[str, float]]

    # Robustness
    robustness_check: Optional[Dict[str, float]]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return json_safe(asdict(self))


def _compute_anova_bf(groups: List[np.ndarray], r: float = 0.707) -> float:
    """
    Compute Bayes Factor for one-way ANOVA using JZS approach.

    Uses the BIC approximation method for computational efficiency.

    Args:
        groups: List of data arrays for each group
        r: Prior scale parameter

    Returns:
        BF10 (Bayes Factor in favor of group differences)
    """
    k = len(groups)  # Number of groups
    ns = [len(g) for g in groups]
    n_total = sum(ns)

    # Compute ANOVA statistics
    all_data = np.concatenate(groups)
    grand_mean = np.mean(all_data)

    # SS Between
    ss_between = sum(n * (np.mean(g) - grand_mean) ** 2 for n, g in zip(ns, groups))

    # SS Within
    ss_within = sum(np.sum((g - np.mean(g)) ** 2) for g in groups)

    # Degrees of freedom
    df_between = k - 1
    df_within = n_total - k

    # Mean squares
    ms_between = ss_between / df_between
    ms_within = ss_within / df_within

    # Perfect separation (zero within-group variance): F -> inf and the
    # evidence for H1 is unbounded. Report it honestly as inf (sanitized to
    # null on the wire by to_dict) rather than the misleading BF10 = 1.0 the
    # generic NaN-integration fallback used to return. If the group means are
    # also identical (no between-group variance), the data are constant and
    # there is genuinely no evidence either way (BF10 = 1).
    if ms_within <= 0:
        return float("inf") if ms_between > 0 else 1.0

    # F statistic
    f_stat = ms_between / ms_within

    # BF approximation using BIC method (Masson, 2011)
    # log(BF10) ≈ (df_between/2) * log(1 + f * df_between/df_within) - (df_between/2) * log(n_total)
    # With prior adjustment

    # More accurate numerical integration approach
    def integrand(g):
        """
        g: standardized effect size (sqrt of non-centrality / n)
        Prior: Cauchy(0, r) on g
        """
        # Non-centrality parameter
        lambda_val = n_total * g**2

        # Non-central F likelihood
        try:
            likelihood = stats.ncf.pdf(f_stat, df_between, df_within, lambda_val)
        except:
            likelihood = 0

        # Prior
        prior = stats.cauchy.pdf(g, loc=0, scale=r)

        return likelihood * prior

    # Integrate over effect sizes
    try:
        marginal_h1, _ = integrate.quad(integrand, 0, np.inf, limit=100)
        marginal_h1 *= 2  # Account for both positive and negative effects
    except:
        marginal_h1 = 0

    # Likelihood under H0 (central F)
    likelihood_h0 = stats.f.pdf(f_stat, df_between, df_within)

    # Bayes Factor
    if likelihood_h0 > 0 and marginal_h1 > 0:
        bf10 = marginal_h1 / likelihood_h0
    else:
        # BIC approximation fallback
        # Simpler approximation when integration fails
        if f_stat > 1:
            log_bf10 = (df_between / 2) * np.log(f_stat) - np.log(n_total) / 2
            bf10 = np.exp(np.clip(log_bf10, -100, 100))
        else:
            bf10 = 1.0

    return bf10


def _compute_pairwise_bf(groups: List[np.ndarray], group_names: List[str], r: float = 0.707) -> Dict[str, float]:
    """
    Compute pairwise Bayes Factors between groups.

    Args:
        groups: List of data arrays
        group_names: Names of groups
        r: Prior scale

    Returns:
        Dictionary mapping pair names to BF10 values
    """
    from .bayesian_ttest import _compute_jzs_bf_two_sample

    pairwise = {}
    k = len(groups)

    for i in range(k):
        for j in range(i + 1, k):
            g1, g2 = groups[i], groups[j]
            n1, n2 = len(g1), len(g2)

            # Compute two-sample t-statistic
            sp = np.sqrt(((n1 - 1) * np.var(g1, ddof=1) + (n2 - 1) * np.var(g2, ddof=1)) / (n1 + n2 - 2))
            se = sp * np.sqrt(1 / n1 + 1 / n2)
            t_stat = (np.mean(g1) - np.mean(g2)) / se if se > 0 else 0

            bf = _compute_jzs_bf_two_sample(t_stat, n1, n2, r)
            pair_name = f"{group_names[i]} vs {group_names[j]}"
            pairwise[pair_name] = bf

    return pairwise


def bayesian_one_way_anova(
    *groups: np.ndarray,
    group_names: List[str] = None,
    prior_scale: float = 0.707,
    compute_pairwise: bool = True,
    robustness_check: bool = True,
) -> BayesianAnovaResult:
    """
    Perform Bayesian one-way ANOVA.

    Tests H0: all group means equal vs H1: at least one differs.

    Args:
        *groups: Variable number of group data arrays
        group_names: Optional names for groups
        prior_scale: Prior scale for effect size (default 0.707)
        compute_pairwise: Whether to compute pairwise comparisons
        robustness_check: Whether to check across different priors

    Returns:
        BayesianAnovaResult with full analysis

    Example:
        >>> g1 = np.array([4.2, 3.8, 4.1, 3.9, 4.0])
        >>> g2 = np.array([3.5, 3.2, 3.4, 3.3, 3.6])
        >>> g3 = np.array([4.8, 4.5, 4.7, 4.6, 4.9])
        >>> result = bayesian_one_way_anova(g1, g2, g3)
    """
    # Convert to arrays
    groups = [np.asarray(g).flatten() for g in groups]
    k = len(groups)

    if k < 2:
        raise ValueError("ANOVA requires at least 2 groups")

    # Default group names
    if group_names is None:
        group_names = [f"Group {i+1}" for i in range(k)]

    # Sample sizes
    ns = [len(g) for g in groups]
    n_total = sum(ns)

    # Group statistics
    means = [np.mean(g) for g in groups]
    sds = [np.std(g, ddof=1) for g in groups]

    all_data = np.concatenate(groups)
    grand_mean = np.mean(all_data)

    # Frequentist ANOVA
    f_stat, p_value = stats.f_oneway(*groups)
    df_between = k - 1
    df_within = n_total - k

    # Effect sizes
    ss_between = sum(n * (m - grand_mean) ** 2 for n, m in zip(ns, means))
    ss_within = sum(np.sum((g - np.mean(g)) ** 2) for g in groups)
    ss_total = ss_between + ss_within

    eta_squared = ss_between / ss_total if ss_total > 0 else 0

    # Omega squared (bias-corrected)
    ms_within = ss_within / df_within
    omega_squared = (ss_between - df_between * ms_within) / (ss_total + ms_within)
    omega_squared = max(0, omega_squared)  # Can't be negative

    # Get prior scale
    r = get_prior_scale_value(prior_scale) if isinstance(prior_scale, str) else prior_scale

    # Compute Bayes Factor
    bf10 = _compute_anova_bf(groups, r)
    bf01 = 1 / bf10 if bf10 > 0 else float("inf")
    log_bf10 = np.log(bf10) if bf10 > 0 else float("-inf")

    # Interpretation
    interpretation = interpret_bayes_factor(bf10)
    probs = bayes_factor_to_probability(bf10)

    # Pairwise comparisons
    pairwise = None
    if compute_pairwise and k > 2:
        pairwise = _compute_pairwise_bf(groups, group_names, r)

    # Robustness check
    robustness = None
    if robustness_check:
        robustness = {}
        for scale_name, scale_info in PRIOR_SCALES.items():
            bf_r = _compute_anova_bf(groups, scale_info["r"])
            robustness[scale_name] = bf_r

    return BayesianAnovaResult(
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
        eta_squared=float(eta_squared),
        omega_squared=float(omega_squared),
        prior_scale=float(r),
        group_means=means,
        group_sds=sds,
        group_ns=ns,
        grand_mean=float(grand_mean),
        frequentist_f=float(f_stat),
        frequentist_df_between=df_between,
        frequentist_df_within=df_within,
        frequentist_p=float(p_value),
        n_groups=k,
        n_total=n_total,
        pairwise_bf=pairwise,
        robustness_check=robustness,
    )


def generate_anova_interpretation(result: BayesianAnovaResult, group_names: List[str] = None) -> str:
    """
    Generate human-readable interpretation of Bayesian ANOVA results.

    Args:
        result: BayesianAnovaResult object
        group_names: Optional group names

    Returns:
        Formatted interpretation text
    """
    if group_names is None:
        group_names = [f"Group {i+1}" for i in range(result.n_groups)]

    # Main finding
    if result.bf10 >= 1:
        bf_str = f"BF10 = {result.bf10:.3f}"
        times = result.bf10
        direction = "differences between groups"
    else:
        bf_str = f"BF01 = {result.bf01:.3f}"
        times = result.bf01
        direction = "no differences between groups"

    interp = result.interpretation

    text = f"""Bayesian One-Way ANOVA Results ({result.n_groups} groups, N = {result.n_total}):

Evidence: The {bf_str} indicates {interp['label'].lower()}.
The data are approximately {times:.1f} times more likely under the hypothesis of {direction}.

Effect Size:
  - Eta-squared (eta2) = {result.eta_squared:.3f} ({result.eta_squared*100:.1f}% variance explained)
  - Omega-squared (omega2) = {result.omega_squared:.3f} (bias-corrected)

Group Statistics:
"""

    for i, (name, m, sd, n) in enumerate(zip(group_names, result.group_means, result.group_sds, result.group_ns)):
        text += f"  - {name}: M = {m:.3f}, SD = {sd:.3f}, n = {n}\n"

    text += f"\nGrand Mean: {result.grand_mean:.3f}\n"

    # Pairwise
    if result.pairwise_bf:
        text += "\nPairwise Comparisons (BF10):\n"
        for pair, bf in result.pairwise_bf.items():
            interp_pair = interpret_bayes_factor(bf)
            text += f"  - {pair}: BF10 = {bf:.3f} ({interp_pair.label})\n"

    # Frequentist comparison
    text += f"""
Frequentist Comparison:
  F({result.frequentist_df_between}, {result.frequentist_df_within}) = {result.frequentist_f:.3f}, p = {result.frequentist_p:.4f}
"""

    # Robustness
    if result.robustness_check:
        text += "\nRobustness Check (BF10 across prior scales):\n"
        for scale, bf in result.robustness_check.items():
            text += f"  - {scale}: {bf:.3f}\n"

    return text
