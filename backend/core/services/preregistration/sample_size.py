"""
Sample Size Justification Module
================================

Provides structured sample size justification for pre-registrations,
integrating with power analysis capabilities.

References:
    Lakens, D. (2022). Sample Size Justification.
    Collabra: Psychology, 8(1), 33267.

Created: December 26, 2025
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np


class JustificationStrategy(Enum):
    """Strategies for justifying sample size."""

    POWER_ANALYSIS = "power_analysis"
    PRECISION = "precision"
    RESOURCE_CONSTRAINTS = "resource_constraints"
    SEQUENTIAL = "sequential"
    RULE_OF_THUMB = "rule_of_thumb"
    REPLICATION = "replication"
    BAYESIAN_UPDATING = "bayesian_updating"


# Export for API
JUSTIFICATION_STRATEGIES = {e.name: e.value for e in JustificationStrategy}


@dataclass
class PowerAnalysisSpec:
    """Specification for power analysis."""

    effect_size: float
    effect_size_type: str  # cohen_d, r, f, eta_squared, etc.
    alpha: float = 0.05
    power: float = 0.80
    test_type: str = "t-test"
    alternative: str = "two-sided"  # one-sided, two-sided
    n_groups: int = 2
    effect_size_rationale: str = ""


@dataclass
class SampleSizeJustification:
    """Complete sample size justification."""

    target_n: int
    strategy: JustificationStrategy
    rationale: str
    power_analysis: Optional[PowerAnalysisSpec] = None
    sensitivity_analysis: Optional[Dict[str, Any]] = None
    constraints: Optional[Dict[str, Any]] = None
    stopping_rule: str = ""
    minimum_n: Optional[int] = None
    maximum_n: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result["strategy"] = self.strategy.value
        return result

    def generate_text(self) -> str:
        """Generate formatted justification text for pre-registration."""
        text = f"Target Sample Size: N = {self.target_n}\n\n"
        text += f"Justification Strategy: {self.strategy.value.replace('_', ' ').title()}\n\n"

        if self.strategy == JustificationStrategy.POWER_ANALYSIS and self.power_analysis:
            pa = self.power_analysis
            text += f"""Power Analysis Details:
- Test Type: {pa.test_type}
- Effect Size ({pa.effect_size_type}): {pa.effect_size}
- Alpha: {pa.alpha}
- Power (1-β): {pa.power}
- Alternative: {pa.alternative}
"""
            if pa.effect_size_rationale:
                text += f"\nEffect Size Rationale: {pa.effect_size_rationale}\n"

        elif self.strategy == JustificationStrategy.PRECISION:
            text += "Sample size was determined to achieve desired precision in estimation.\n"

        elif self.strategy == JustificationStrategy.RESOURCE_CONSTRAINTS:
            if self.constraints:
                text += f"Resource constraints: {self.constraints}\n"

        elif self.strategy == JustificationStrategy.SEQUENTIAL:
            text += "Sequential analysis will be employed with the following stopping rules:\n"

        text += f"\nRationale: {self.rationale}\n"

        if self.stopping_rule:
            text += f"\nStopping Rule: {self.stopping_rule}\n"

        if self.sensitivity_analysis:
            text += "\nSensitivity Analysis:\n"
            for key, value in self.sensitivity_analysis.items():
                text += f"- {key}: {value}\n"

        if self.minimum_n and self.maximum_n:
            text += f"\nSample size range: {self.minimum_n} - {self.maximum_n}\n"

        return text


def create_sample_size_justification(
    target_n: int,
    strategy: str,
    rationale: str,
    effect_size: float = None,
    effect_size_type: str = None,
    alpha: float = 0.05,
    power: float = 0.80,
    test_type: str = "t-test",
    alternative: str = "two-sided",
    n_groups: int = 2,
    effect_size_rationale: str = "",
    constraints: Dict[str, Any] = None,
    stopping_rule: str = "",
    minimum_n: int = None,
    maximum_n: int = None,
) -> SampleSizeJustification:
    """
    Create a sample size justification.

    Args:
        target_n: Target sample size
        strategy: Justification strategy (from JUSTIFICATION_STRATEGIES)
        rationale: Text rationale for sample size choice
        effect_size: Expected effect size (for power analysis)
        effect_size_type: Type of effect size
        alpha: Significance level
        power: Desired statistical power
        test_type: Type of statistical test
        alternative: Alternative hypothesis type
        n_groups: Number of groups (for group comparisons)
        effect_size_rationale: Why this effect size was chosen
        constraints: Resource constraints dictionary
        stopping_rule: Rule for stopping data collection
        minimum_n: Minimum acceptable sample size
        maximum_n: Maximum sample size

    Returns:
        SampleSizeJustification object
    """
    strat = JustificationStrategy[strategy.upper()]

    power_analysis = None
    if strat == JustificationStrategy.POWER_ANALYSIS and effect_size is not None:
        power_analysis = PowerAnalysisSpec(
            effect_size=effect_size,
            effect_size_type=effect_size_type or "cohen_d",
            alpha=alpha,
            power=power,
            test_type=test_type,
            alternative=alternative,
            n_groups=n_groups,
            effect_size_rationale=effect_size_rationale,
        )

    return SampleSizeJustification(
        target_n=target_n,
        strategy=strat,
        rationale=rationale,
        power_analysis=power_analysis,
        constraints=constraints,
        stopping_rule=stopping_rule,
        minimum_n=minimum_n,
        maximum_n=maximum_n,
    )


def compute_required_sample_size(
    effect_size: float,
    effect_size_type: str = "cohen_d",
    alpha: float = 0.05,
    power: float = 0.80,
    test_type: str = "t-test",
    alternative: str = "two-sided",
    n_groups: int = 2,
    allocation_ratio: float = 1.0,
) -> Dict[str, Any]:
    """
    Compute required sample size using power analysis.

    This is a simplified implementation. For production, consider using
    statsmodels or dedicated power analysis libraries.

    Args:
        effect_size: Expected effect size
        effect_size_type: Type of effect size
        alpha: Significance level
        power: Desired power
        test_type: Type of statistical test
        alternative: Alternative hypothesis
        n_groups: Number of groups
        allocation_ratio: Ratio of n1/n2 for two groups

    Returns:
        Dictionary with sample size requirements
    """
    from scipy import stats

    # Simple power calculation for t-test
    if test_type.lower() in ["t-test", "independent_t", "two_sample_t"]:
        # Two-sample t-test
        # n per group ≈ 2 * ((z_alpha + z_beta) / d)^2
        if alternative == "two-sided":
            z_alpha = stats.norm.ppf(1 - alpha / 2)
        else:
            z_alpha = stats.norm.ppf(1 - alpha)

        z_beta = stats.norm.ppf(power)

        n_per_group = 2 * ((z_alpha + z_beta) / effect_size) ** 2
        n_per_group = int(np.ceil(n_per_group))

        total_n = n_per_group * 2

        return {
            "n_per_group": n_per_group,
            "total_n": total_n,
            "effect_size": effect_size,
            "alpha": alpha,
            "power": power,
            "test_type": test_type,
        }

    elif test_type.lower() in ["paired_t", "one_sample_t"]:
        if alternative == "two-sided":
            z_alpha = stats.norm.ppf(1 - alpha / 2)
        else:
            z_alpha = stats.norm.ppf(1 - alpha)

        z_beta = stats.norm.ppf(power)

        n = ((z_alpha + z_beta) / effect_size) ** 2
        n = int(np.ceil(n))

        return {
            "n": n,
            "total_n": n,
            "effect_size": effect_size,
            "alpha": alpha,
            "power": power,
            "test_type": test_type,
        }

    elif test_type.lower() in ["anova", "one_way_anova"]:
        # Simplified ANOVA power calculation
        if alternative == "two-sided":
            z_alpha = stats.norm.ppf(1 - alpha / 2)
        else:
            z_alpha = stats.norm.ppf(1 - alpha)

        z_beta = stats.norm.ppf(power)

        # Effect size f = sqrt(eta_squared / (1 - eta_squared))
        if effect_size_type == "eta_squared":
            f = np.sqrt(effect_size / (1 - effect_size))
        else:
            f = effect_size

        n_per_group = ((z_alpha + z_beta) / f) ** 2 / n_groups
        n_per_group = int(np.ceil(n_per_group))
        total_n = n_per_group * n_groups

        return {
            "n_per_group": n_per_group,
            "total_n": total_n,
            "n_groups": n_groups,
            "effect_size_f": f,
            "alpha": alpha,
            "power": power,
            "test_type": test_type,
        }

    elif test_type.lower() in ["correlation", "pearson"]:
        # Sample size for correlation
        if alternative == "two-sided":
            z_alpha = stats.norm.ppf(1 - alpha / 2)
        else:
            z_alpha = stats.norm.ppf(1 - alpha)

        z_beta = stats.norm.ppf(power)

        # Fisher's z transformation
        z_r = 0.5 * np.log((1 + effect_size) / (1 - effect_size))
        n = ((z_alpha + z_beta) / z_r) ** 2 + 3
        n = int(np.ceil(n))

        return {
            "n": n,
            "total_n": n,
            "effect_size_r": effect_size,
            "alpha": alpha,
            "power": power,
            "test_type": test_type,
        }

    else:
        return {
            "error": f"Power calculation not implemented for {test_type}",
            "suggestion": "Use specialized power analysis software",
        }


def sensitivity_analysis(
    n_range: List[int], effect_size: float, alpha: float = 0.05, test_type: str = "t-test"
) -> List[Dict[str, Any]]:
    """
    Perform sensitivity analysis across sample sizes.

    Args:
        n_range: List of sample sizes to evaluate
        effect_size: Effect size to use
        alpha: Significance level
        test_type: Type of test

    Returns:
        List of dictionaries with power for each n
    """
    from scipy import stats

    results = []

    for n in n_range:
        if test_type.lower() in ["t-test", "independent_t"]:
            # Calculate power for two-sample t-test
            df = 2 * n - 2
            ncp = effect_size * np.sqrt(n / 2)  # non-centrality parameter
            critical_t = stats.t.ppf(1 - alpha / 2, df)

            # Power = P(reject H0 | H1 is true)
            power = stats.nct.sf(critical_t, df, ncp) + stats.nct.cdf(-critical_t, df, ncp)

            results.append({"n_per_group": n, "total_n": 2 * n, "power": round(power, 3)})

    return results
