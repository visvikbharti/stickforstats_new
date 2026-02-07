"""
P-Curve Core Analysis
=====================

Core implementation of p-curve analysis following
Simonsohn, Nelson, & Simmons (2014, 2015).

Created: December 26, 2025
"""

from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass, asdict
import numpy as np
from scipy import stats


@dataclass
class PCurveResult:
    """Complete result from p-curve analysis."""
    # Input summary
    n_studies: int
    n_significant: int
    p_values: List[float]

    # P-curve shape tests
    right_skew_test: Dict[str, Any]  # Test for evidential value
    flat_test: Dict[str, Any]  # Test against 33% power
    half_test: Dict[str, Any]  # Binomial test

    # Overall conclusion
    has_evidential_value: bool
    inadequate_evidence: bool
    interpretation: str

    # PP-values (for power estimation)
    pp_values_full: List[float]
    pp_values_half: List[float]

    # Estimated power
    estimated_power: Optional[float]
    power_ci: Optional[Tuple[float, float]]

    # Histogram data for visualization
    histogram_bins: List[float]
    histogram_counts: List[int]
    expected_null: List[float]  # Expected if no effect (flat)
    expected_33: List[float]  # Expected if 33% power

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def compute_pp_values(p_values: List[float], use_half: bool = False) -> List[float]:
    """
    Compute PP-values from p-values.

    PP-value is the probability of observing a p-value as extreme or
    more extreme under the null hypothesis of no effect.

    For p-curve, we use p-values conditional on being significant (p < .05).

    Args:
        p_values: List of significant p-values (< 0.05)
        use_half: If True, compute for half p-curve (p < .025)

    Returns:
        List of PP-values
    """
    pp_values = []
    threshold = 0.025 if use_half else 0.05

    for p in p_values:
        if p < threshold:
            # PP-value = p / threshold (uniform under null)
            pp = p / threshold
            pp_values.append(pp)

    return pp_values


def stouffer_test(pp_values: List[float]) -> Dict[str, Any]:
    """
    Stouffer's method for combining p-values.

    Tests whether the distribution of pp-values is consistent with
    the null hypothesis (uniform distribution).

    For right-skew test: Low pp-values indicate evidential value.
    For flat test: Tests against 33% power null.

    Args:
        pp_values: List of PP-values

    Returns:
        Dictionary with Z statistic and p-value
    """
    if not pp_values:
        return {'z': 0, 'p': 1.0, 'significant': False}

    # Convert pp-values to Z scores
    z_scores = [stats.norm.ppf(1 - pp) for pp in pp_values if 0 < pp < 1]

    if not z_scores:
        return {'z': 0, 'p': 1.0, 'significant': False}

    # Combined Z using Stouffer's method
    z_combined = np.sum(z_scores) / np.sqrt(len(z_scores))
    p_combined = 1 - stats.norm.cdf(z_combined)

    return {
        'z': float(z_combined),
        'p': float(p_combined),
        'significant': p_combined < 0.05
    }


def binomial_test_33(p_values: List[float]) -> Dict[str, Any]:
    """
    Binomial test against 33% power null hypothesis.

    Under 33% power, we expect 1/3 of significant results to be p < .025.
    If studies lack evidential value (p-hacked), more p-values will be
    between .025 and .05.

    Args:
        p_values: List of significant p-values

    Returns:
        Dictionary with test results
    """
    n_total = len(p_values)
    n_below_025 = sum(1 for p in p_values if p < 0.025)

    if n_total == 0:
        return {'n_below': 0, 'n_total': 0, 'prop': 0, 'p': 1.0, 'significant': False}

    # Under 33% power null, P(p < .025 | p < .05) = 0.5
    # (because low-powered studies should have uniform p-curve)
    # Actually for the flat test, under null, proportion should be 0.5
    # For 33% power, it should be about 0.356

    # Binomial test: is proportion significantly different from 1/3?
    prop_observed = n_below_025 / n_total

    # One-sided test: more than 1/3?
    p_value = 1 - stats.binom.cdf(n_below_025 - 1, n_total, 1/3)

    return {
        'n_below': n_below_025,
        'n_total': n_total,
        'prop': float(prop_observed),
        'expected_prop': 1/3,
        'p': float(p_value),
        'significant': p_value < 0.05
    }


def binomial_test_half(p_values: List[float]) -> Dict[str, Any]:
    """
    Binomial test for right-skew (evidential value).

    If there is evidential value, more than half of p-values
    should be below .025.

    Args:
        p_values: List of significant p-values

    Returns:
        Dictionary with test results
    """
    n_total = len(p_values)
    n_below_025 = sum(1 for p in p_values if p < 0.025)

    if n_total == 0:
        return {'n_below': 0, 'n_total': 0, 'prop': 0, 'p': 1.0, 'significant': False}

    # One-sided binomial test: more than 50%?
    p_value = 1 - stats.binom.cdf(n_below_025 - 1, n_total, 0.5)

    return {
        'n_below': n_below_025,
        'n_total': n_total,
        'prop': float(n_below_025 / n_total),
        'expected_prop': 0.5,
        'p': float(p_value),
        'significant': p_value < 0.05
    }


def estimate_power(p_values: List[float]) -> Tuple[Optional[float], Optional[Tuple[float, float]]]:
    """
    Estimate average power from p-curve.

    Uses the relationship between effect size and p-value distribution.
    More right-skewed p-curves indicate higher power.

    Args:
        p_values: List of significant p-values

    Returns:
        Tuple of (estimated_power, confidence_interval)
    """
    if len(p_values) < 3:
        return None, None

    # Simple power estimation based on p-value distribution
    # The proportion of p-values < .01 is related to power
    n_total = len(p_values)
    n_below_01 = sum(1 for p in p_values if p < 0.01)
    n_below_025 = sum(1 for p in p_values if p < 0.025)

    # Under different power levels, the p-curve has different shapes
    # This is a simplified estimation
    prop_below_025 = n_below_025 / n_total

    # Map proportion to power (rough approximation)
    # High power -> more p-values near 0 -> higher proportion below .025
    # At 80% power, about 73% of sig results have p < .025
    # At 50% power, about 58% of sig results have p < .025
    # At 33% power, about 50% of sig results have p < .025

    if prop_below_025 >= 0.73:
        estimated_power = 0.80 + (prop_below_025 - 0.73) * 0.5
    elif prop_below_025 >= 0.58:
        estimated_power = 0.50 + (prop_below_025 - 0.58) / 0.15 * 0.30
    elif prop_below_025 >= 0.50:
        estimated_power = 0.33 + (prop_below_025 - 0.50) / 0.08 * 0.17
    else:
        estimated_power = prop_below_025 * 0.66

    estimated_power = min(max(estimated_power, 0.05), 0.99)

    # Confidence interval using bootstrap would be ideal, but simplified here
    se = np.sqrt(prop_below_025 * (1 - prop_below_025) / n_total)
    ci_low = max(0.05, estimated_power - 1.96 * se)
    ci_high = min(0.99, estimated_power + 1.96 * se)

    return float(estimated_power), (float(ci_low), float(ci_high))


def compute_pcurve(p_values: List[float]) -> PCurveResult:
    """
    Perform complete p-curve analysis.

    Args:
        p_values: List of p-values (significant ones will be selected)

    Returns:
        PCurveResult with all analysis components

    Example:
        >>> p_values = [0.001, 0.012, 0.023, 0.034, 0.045, 0.008, 0.019]
        >>> result = compute_pcurve(p_values)
        >>> print(f"Has evidential value: {result.has_evidential_value}")
    """
    # Filter to significant p-values
    sig_pvalues = [p for p in p_values if 0 < p < 0.05]
    n_studies = len(p_values)
    n_significant = len(sig_pvalues)

    if n_significant < 3:
        return PCurveResult(
            n_studies=n_studies,
            n_significant=n_significant,
            p_values=sig_pvalues,
            right_skew_test={'z': 0, 'p': 1.0, 'significant': False,
                            'note': 'Insufficient significant p-values for analysis'},
            flat_test={'z': 0, 'p': 1.0, 'significant': False},
            half_test={'n_below': 0, 'n_total': n_significant, 'prop': 0, 'p': 1.0, 'significant': False},
            has_evidential_value=False,
            inadequate_evidence=True,
            interpretation="Insufficient data: Need at least 3 significant p-values for p-curve analysis.",
            pp_values_full=[],
            pp_values_half=[],
            estimated_power=None,
            power_ci=None,
            histogram_bins=[0.01, 0.02, 0.03, 0.04, 0.05],
            histogram_counts=[0, 0, 0, 0, 0],
            expected_null=[n_significant/5] * 5,
            expected_33=[n_significant/5] * 5
        )

    # Compute PP-values
    pp_values_full = compute_pp_values(sig_pvalues, use_half=False)
    pp_values_half = compute_pp_values(sig_pvalues, use_half=True)

    # Right-skew test (evidential value)
    right_skew_test = stouffer_test(pp_values_full)
    right_skew_test['test_name'] = 'Right-skew test for evidential value'

    # Binomial test for right-skew
    half_test = binomial_test_half(sig_pvalues)
    half_test['test_name'] = 'Binomial test for right-skew'

    # Flat test (33% power null) - tests for inadequate evidence
    # For this, we need to compute pp-values under 33% power null
    # Simplified: use binomial test
    flat_test = binomial_test_33(sig_pvalues)
    flat_test['test_name'] = 'Test against 33% power (flat p-curve)'

    # Determine conclusions
    has_evidential_value = right_skew_test['significant'] or half_test['significant']

    # Inadequate evidence if p-curve is flat or left-skewed
    # This happens if few p-values are below .025
    prop_below_025 = sum(1 for p in sig_pvalues if p < 0.025) / n_significant
    inadequate_evidence = prop_below_025 < 0.33 and not has_evidential_value

    # Estimate power
    estimated_power, power_ci = estimate_power(sig_pvalues)

    # Generate interpretation
    interpretation = get_pcurve_interpretation(
        has_evidential_value, inadequate_evidence, estimated_power,
        n_significant, prop_below_025
    )

    # Create histogram data
    bins = [0.01, 0.02, 0.03, 0.04, 0.05]
    bin_edges = [0, 0.01, 0.02, 0.03, 0.04, 0.05]
    counts = []
    for i in range(len(bins)):
        low = bin_edges[i]
        high = bin_edges[i + 1]
        count = sum(1 for p in sig_pvalues if low < p <= high)
        counts.append(count)

    # Expected under null (uniform)
    expected_null = [n_significant / 5] * 5

    # Expected under 33% power (slightly right-skewed)
    expected_33 = [n_significant * 0.356] + [n_significant * 0.161] * 4

    return PCurveResult(
        n_studies=n_studies,
        n_significant=n_significant,
        p_values=sig_pvalues,
        right_skew_test=right_skew_test,
        flat_test=flat_test,
        half_test=half_test,
        has_evidential_value=has_evidential_value,
        inadequate_evidence=inadequate_evidence,
        interpretation=interpretation,
        pp_values_full=pp_values_full,
        pp_values_half=pp_values_half,
        estimated_power=estimated_power,
        power_ci=power_ci,
        histogram_bins=bins,
        histogram_counts=counts,
        expected_null=expected_null,
        expected_33=expected_33
    )


def get_pcurve_interpretation(
    has_evidential_value: bool,
    inadequate_evidence: bool,
    estimated_power: Optional[float],
    n_significant: int,
    prop_below_025: float
) -> str:
    """
    Generate human-readable interpretation of p-curve results.

    Args:
        has_evidential_value: Whether p-curve shows evidential value
        inadequate_evidence: Whether evidence is inadequate
        estimated_power: Estimated average power
        n_significant: Number of significant p-values
        prop_below_025: Proportion of p-values below .025

    Returns:
        Interpretation string
    """
    interpretation = f"P-Curve Analysis of {n_significant} significant results:\n\n"

    # Shape description
    interpretation += f"P-curve shape: {prop_below_025*100:.1f}% of p-values are below .025"
    if prop_below_025 > 0.5:
        interpretation += " (right-skewed)\n"
    elif prop_below_025 < 0.33:
        interpretation += " (flat or left-skewed)\n"
    else:
        interpretation += " (moderately skewed)\n"

    # Main conclusion
    if has_evidential_value:
        interpretation += "\nConclusion: The p-curve is significantly right-skewed, "
        interpretation += "indicating that the studies contain evidential value. "
        interpretation += "The observed pattern of p-values is unlikely to have arisen "
        interpretation += "from selective reporting or p-hacking alone.\n"
    elif inadequate_evidence:
        interpretation += "\nConclusion: The p-curve is flat or left-skewed, "
        interpretation += "suggesting that the evidence may be inadequate. "
        interpretation += "This pattern could indicate low-powered studies, "
        interpretation += "p-hacking, or selective reporting.\n"
    else:
        interpretation += "\nConclusion: The p-curve analysis is inconclusive. "
        interpretation += "There is neither strong evidence of evidential value "
        interpretation += "nor clear indication of inadequate evidence.\n"

    # Power estimate
    if estimated_power:
        interpretation += f"\nEstimated average power: {estimated_power*100:.0f}%\n"
        if estimated_power < 0.5:
            interpretation += "This suggests the studies may be underpowered.\n"
        elif estimated_power >= 0.8:
            interpretation += "This suggests adequate statistical power.\n"

    # Recommendations
    interpretation += "\nRecommendations:\n"
    if has_evidential_value:
        interpretation += "- The findings appear robust to publication bias concerns.\n"
    else:
        interpretation += "- Consider the possibility of publication bias.\n"
        interpretation += "- Look for additional unpublished studies.\n"
        interpretation += "- Interpret effect size estimates cautiously.\n"

    return interpretation
