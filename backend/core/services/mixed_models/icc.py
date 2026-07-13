"""
Intraclass Correlation Coefficient (ICC) Module
================================================

Calculates ICC for multilevel/hierarchical data to assess
the proportion of variance at different levels.

ICC Types (Shrout & Fleiss, 1979):
- ICC(1,1): One-way random effects, single rater
- ICC(1,k): One-way random effects, average of k raters
- ICC(2,1): Two-way random effects, single rater
- ICC(2,k): Two-way random effects, average of k raters
- ICC(3,1): Two-way mixed effects, single rater
- ICC(3,k): Two-way mixed effects, average of k raters

Interpretation (Cicchetti, 1994):
- < 0.40: Poor
- 0.40 - 0.59: Fair
- 0.60 - 0.74: Good
- 0.75 - 1.00: Excellent

References:
    Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations:
    Uses in assessing rater reliability. Psychological Bulletin, 86(2), 420.

    McGraw, K. O., & Wong, S. P. (1996). Forming inferences about some
    intraclass correlation coefficients. Psychological Methods, 1(1), 30.

    Cicchetti, D. V. (1994). Guidelines, criteria, and rules of thumb for
    evaluating normed and standardized assessment instruments in psychology.
    Psychological Assessment, 6(4), 284.

Created: December 26, 2025
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional, Tuple, Union
import numpy as np
from scipy import stats
import pandas as pd


# ICC type definitions
ICC_TYPES = {
    "ICC(1,1)": {
        "name": "One-way random, single measures",
        "description": "Each subject rated by different random raters",
        "use_case": "Inter-rater reliability with different raters per subject",
    },
    "ICC(1,k)": {
        "name": "One-way random, average measures",
        "description": "Average of k ratings from different random raters",
        "use_case": "Reliability of mean ratings when raters vary",
    },
    "ICC(2,1)": {
        "name": "Two-way random, single measures",
        "description": "Each subject rated by same random raters",
        "use_case": "Absolute agreement, single rater, generalizable",
    },
    "ICC(2,k)": {
        "name": "Two-way random, average measures",
        "description": "Average of ratings from same random raters",
        "use_case": "Absolute agreement, average of k raters, generalizable",
    },
    "ICC(3,1)": {
        "name": "Two-way mixed, single measures",
        "description": "Specific raters, consistency only",
        "use_case": "Consistency of single rater, not generalizable",
    },
    "ICC(3,k)": {
        "name": "Two-way mixed, average measures",
        "description": "Average ratings, specific raters, consistency",
        "use_case": "Consistency of mean ratings, not generalizable",
    },
}

# Interpretation thresholds (Cicchetti, 1994)
ICC_INTERPRETATION = [
    (0.75, "excellent", "Excellent reliability"),
    (0.60, "good", "Good reliability"),
    (0.40, "fair", "Fair reliability"),
    (0.00, "poor", "Poor reliability"),
    (float("-inf"), "negative", "Negative ICC - systematic disagreement"),
]


@dataclass
class ICCResult:
    """Result of ICC calculation."""

    icc_type: str
    icc_value: float
    ci_lower: float
    ci_upper: float
    f_value: float
    df_between: int
    df_within: int
    p_value: float

    # Variance components
    variance_between: float
    variance_within: float
    variance_total: float

    # Interpretation
    interpretation: str
    interpretation_label: str

    # Design effect
    design_effect: Optional[float]
    effective_sample_size: Optional[float]

    # Raw data info
    n_subjects: int
    n_raters: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "icc_type": self.icc_type,
            "icc_value": round(self.icc_value, 4),
            "confidence_interval": {"lower": round(self.ci_lower, 4), "upper": round(self.ci_upper, 4), "level": 0.95},
            "f_test": {
                "f_value": round(self.f_value, 4),
                "df_between": self.df_between,
                "df_within": self.df_within,
                "p_value": round(self.p_value, 6),
            },
            "variance_components": {
                "between_groups": round(self.variance_between, 6),
                "within_groups": round(self.variance_within, 6),
                "total": round(self.variance_total, 6),
                "proportion_between": round(self.icc_value, 4),
            },
            "interpretation": {"label": self.interpretation_label, "description": self.interpretation},
            "design_effect": round(self.design_effect, 4) if self.design_effect else None,
            "effective_sample_size": round(self.effective_sample_size, 2) if self.effective_sample_size else None,
            "sample_info": {"n_subjects": self.n_subjects, "n_raters": self.n_raters},
        }


def calculate_icc(
    data: Union[np.ndarray, pd.DataFrame],
    icc_type: str = "ICC(2,1)",
    confidence_level: float = 0.95,
    subjects_col: str = None,
    raters_col: str = None,
    values_col: str = None,
) -> ICCResult:
    """
    Calculate Intraclass Correlation Coefficient.

    Args:
        data: Either a 2D array (subjects x raters) or DataFrame with
              subjects, raters, and values columns
        icc_type: Type of ICC ('ICC(1,1)', 'ICC(2,1)', 'ICC(3,1)', etc.)
        confidence_level: Confidence level for CI (default: 0.95)
        subjects_col: Column name for subjects (if DataFrame)
        raters_col: Column name for raters (if DataFrame)
        values_col: Column name for values (if DataFrame)

    Returns:
        ICCResult with ICC value and related statistics

    Raises:
        ValueError: If invalid ICC type or data format
    """
    if icc_type not in ICC_TYPES:
        valid_types = ", ".join(ICC_TYPES.keys())
        raise ValueError(f"Invalid ICC type: {icc_type}. Valid types: {valid_types}")

    # Convert data to matrix format
    if isinstance(data, pd.DataFrame):
        if subjects_col and raters_col and values_col:
            # Pivot to matrix format
            matrix = data.pivot(index=subjects_col, columns=raters_col, values=values_col).values
        else:
            matrix = data.values
    else:
        matrix = np.asarray(data)

    # Handle missing values
    if np.any(np.isnan(matrix)):
        # Use pairwise complete observations
        pass  # For now, we'll require complete data

    n, k = matrix.shape  # n subjects, k raters/measurements

    # Calculate mean squares
    grand_mean = np.mean(matrix)
    subject_means = np.mean(matrix, axis=1)
    rater_means = np.mean(matrix, axis=0)

    # Sum of squares
    ss_total = np.sum((matrix - grand_mean) ** 2)
    ss_between = k * np.sum((subject_means - grand_mean) ** 2)
    ss_within = ss_total - ss_between

    # For two-way models, partition within-subject variance
    ss_raters = n * np.sum((rater_means - grand_mean) ** 2)
    ss_residual = ss_within - ss_raters

    # Degrees of freedom
    df_between = n - 1
    df_within = n * (k - 1)
    df_raters = k - 1
    df_residual = (n - 1) * (k - 1)

    # Mean squares
    ms_between = ss_between / df_between
    ms_within = ss_within / df_within
    ms_raters = ss_raters / df_raters if df_raters > 0 else 0
    ms_residual = ss_residual / df_residual if df_residual > 0 else 0

    # Calculate ICC based on type
    if icc_type.startswith("ICC(1"):
        # One-way random effects
        icc, f_value, var_between, var_within = _icc_one_way(ms_between, ms_within, n, k, icc_type.endswith("k)"))
        df1, df2 = df_between, df_within

    elif icc_type.startswith("ICC(2"):
        # Two-way random effects (absolute agreement)
        icc, f_value, var_between, var_within = _icc_two_way_random(
            ms_between, ms_residual, ms_raters, n, k, icc_type.endswith("k)")
        )
        df1, df2 = df_between, df_residual

    else:  # ICC(3,*)
        # Two-way mixed effects (consistency)
        icc, f_value, var_between, var_within = _icc_two_way_mixed(
            ms_between, ms_residual, n, k, icc_type.endswith("k)")
        )
        df1, df2 = df_between, df_residual

    # Calculate p-value
    p_value = stats.f.sf(f_value, df1, df2)

    # Calculate confidence interval
    ci_lower, ci_upper = _calculate_icc_ci(icc, f_value, n, k, df1, df2, confidence_level, icc_type)

    # Interpretation
    interpretation_label, interpretation = _interpret_icc(icc)

    # Design effect (Kish, 1965)
    avg_cluster_size = k
    design_effect = 1 + (avg_cluster_size - 1) * icc if icc > 0 else 1
    effective_n = (n * k) / design_effect if design_effect > 0 else n * k

    return ICCResult(
        icc_type=icc_type,
        icc_value=float(icc),
        ci_lower=float(ci_lower),
        ci_upper=float(ci_upper),
        f_value=float(f_value),
        df_between=int(df1),
        df_within=int(df2),
        p_value=float(p_value),
        variance_between=float(var_between),
        variance_within=float(var_within),
        variance_total=float(var_between + var_within),
        interpretation=interpretation,
        interpretation_label=interpretation_label,
        design_effect=float(design_effect),
        effective_sample_size=float(effective_n),
        n_subjects=int(n),
        n_raters=int(k),
    )


def _icc_one_way(
    ms_between: float, ms_within: float, n: int, k: int, average: bool
) -> Tuple[float, float, float, float]:
    """Calculate one-way random effects ICC."""
    # Variance components
    var_within = ms_within
    var_between = (ms_between - ms_within) / k
    var_between = max(0, var_between)  # Can't be negative

    if average:
        # ICC(1,k)
        icc = var_between / (var_between + var_within / k)
    else:
        # ICC(1,1)
        icc = var_between / (var_between + var_within)

    f_value = ms_between / ms_within

    return icc, f_value, var_between, var_within


def _icc_two_way_random(
    ms_between: float, ms_residual: float, ms_raters: float, n: int, k: int, average: bool
) -> Tuple[float, float, float, float]:
    """Calculate two-way random effects ICC (absolute agreement)."""
    # Variance components
    var_residual = ms_residual
    var_between = (ms_between - ms_residual) / k
    var_between = max(0, var_between)
    var_raters = (ms_raters - ms_residual) / n
    var_raters = max(0, var_raters)

    if average:
        # ICC(2,k)
        icc = var_between / (var_between + (var_raters + var_residual) / k)
    else:
        # ICC(2,1)
        icc = var_between / (var_between + var_raters + var_residual)

    f_value = ms_between / ms_residual

    return icc, f_value, var_between, var_residual


def _icc_two_way_mixed(
    ms_between: float, ms_residual: float, n: int, k: int, average: bool
) -> Tuple[float, float, float, float]:
    """Calculate two-way mixed effects ICC (consistency)."""
    # Variance components
    var_residual = ms_residual
    var_between = (ms_between - ms_residual) / k
    var_between = max(0, var_between)

    if average:
        # ICC(3,k)
        icc = var_between / (var_between + var_residual / k)
    else:
        # ICC(3,1)
        icc = var_between / (var_between + var_residual)

    f_value = ms_between / ms_residual

    return icc, f_value, var_between, var_residual


def _calculate_icc_ci(
    icc: float, f_value: float, n: int, k: int, df1: int, df2: int, confidence_level: float, icc_type: str
) -> Tuple[float, float]:
    """Calculate confidence interval for ICC using F distribution."""
    alpha = 1 - confidence_level

    # Get critical F values
    f_lower = stats.f.ppf(alpha / 2, df1, df2)
    f_upper = stats.f.ppf(1 - alpha / 2, df1, df2)

    # Transform to ICC scale
    # Using the relationship between F and ICC
    if icc_type.endswith("k)"):
        # Average measures
        ci_lower = (f_value / f_upper - 1) / (f_value / f_upper + k - 1)
        ci_upper = (f_value / f_lower - 1) / (f_value / f_lower + k - 1)
    else:
        # Single measures
        ci_lower = (f_value / f_upper - 1) / (f_value / f_upper + k - 1)
        ci_upper = (f_value / f_lower - 1) / (f_value / f_lower + k - 1)

    # Bound the CI
    ci_lower = max(-1, min(1, ci_lower))
    ci_upper = max(-1, min(1, ci_upper))

    return ci_lower, ci_upper


def _interpret_icc(icc: float) -> Tuple[str, str]:
    """Interpret ICC value using Cicchetti (1994) guidelines."""
    for threshold, label, description in ICC_INTERPRETATION:
        if icc >= threshold:
            return label, description
    return "unknown", "Unable to interpret"


def icc_one_way_random(data: np.ndarray, average: bool = False, confidence_level: float = 0.95) -> ICCResult:
    """
    Convenience function for one-way random effects ICC.

    Args:
        data: Matrix of ratings (subjects x raters)
        average: If True, calculate ICC(1,k); otherwise ICC(1,1)
        confidence_level: Confidence level for CI

    Returns:
        ICCResult
    """
    icc_type = "ICC(1,k)" if average else "ICC(1,1)"
    return calculate_icc(data, icc_type=icc_type, confidence_level=confidence_level)


def icc_two_way_random(data: np.ndarray, average: bool = False, confidence_level: float = 0.95) -> ICCResult:
    """
    Convenience function for two-way random effects ICC (absolute agreement).

    Args:
        data: Matrix of ratings (subjects x raters)
        average: If True, calculate ICC(2,k); otherwise ICC(2,1)
        confidence_level: Confidence level for CI

    Returns:
        ICCResult
    """
    icc_type = "ICC(2,k)" if average else "ICC(2,1)"
    return calculate_icc(data, icc_type=icc_type, confidence_level=confidence_level)


def icc_two_way_mixed(data: np.ndarray, average: bool = False, confidence_level: float = 0.95) -> ICCResult:
    """
    Convenience function for two-way mixed effects ICC (consistency).

    Args:
        data: Matrix of ratings (subjects x raters)
        average: If True, calculate ICC(3,k); otherwise ICC(3,1)
        confidence_level: Confidence level for CI

    Returns:
        ICCResult
    """
    icc_type = "ICC(3,k)" if average else "ICC(3,1)"
    return calculate_icc(data, icc_type=icc_type, confidence_level=confidence_level)


def calculate_design_effect(icc: float, cluster_size: float) -> Dict[str, float]:
    """
    Calculate design effect for clustered data.

    The design effect (DEFF) indicates how much larger a sample
    needs to be compared to simple random sampling.

    DEFF = 1 + (n_cluster - 1) * ICC

    Args:
        icc: Intraclass correlation coefficient
        cluster_size: Average cluster size

    Returns:
        Dictionary with design effect and effective sample size info
    """
    if icc < 0:
        icc = 0  # Treat negative ICC as 0 for design effect

    deff = 1 + (cluster_size - 1) * icc

    return {
        "design_effect": round(deff, 4),
        "icc": round(icc, 4),
        "cluster_size": cluster_size,
        "variance_inflation": round(deff, 4),
        "effective_sample_ratio": round(1 / deff, 4),
        "interpretation": _interpret_design_effect(deff),
    }


def _interpret_design_effect(deff: float) -> str:
    """Interpret design effect value."""
    if deff < 1.2:
        return "Minimal clustering effect - standard methods may be appropriate"
    elif deff < 2.0:
        return "Moderate clustering - consider multilevel analysis"
    elif deff < 4.0:
        return "Substantial clustering - multilevel analysis recommended"
    else:
        return "Strong clustering - multilevel analysis essential"


def icc_for_multilevel_decision(data: np.ndarray, grouping: np.ndarray = None) -> Dict[str, Any]:
    """
    Calculate ICC to help decide if multilevel modeling is needed.

    Rule of thumb: ICC > 0.05-0.10 suggests multilevel modeling is appropriate.

    Args:
        data: Outcome variable values
        grouping: Group membership for each observation

    Returns:
        Dictionary with ICC and decision guidance
    """
    if grouping is None:
        raise ValueError("grouping variable required for multilevel ICC")

    # Create matrix format from long data
    unique_groups = np.unique(grouping)
    n_groups = len(unique_groups)

    # Calculate between and within variance
    grand_mean = np.mean(data)

    ss_between = 0
    ss_within = 0
    total_n = 0

    group_sizes = []
    for group in unique_groups:
        group_data = data[grouping == group]
        group_mean = np.mean(group_data)
        group_n = len(group_data)
        group_sizes.append(group_n)

        ss_between += group_n * (group_mean - grand_mean) ** 2
        ss_within += np.sum((group_data - group_mean) ** 2)
        total_n += group_n

    # Mean squares
    ms_between = ss_between / (n_groups - 1)
    ms_within = ss_within / (total_n - n_groups)

    # Harmonic mean of group sizes
    n_harmonic = n_groups / np.sum(1 / np.array(group_sizes))

    # Variance components
    var_within = ms_within
    var_between = (ms_between - ms_within) / n_harmonic
    var_between = max(0, var_between)

    # ICC
    icc = var_between / (var_between + var_within) if (var_between + var_within) > 0 else 0

    # Decision guidance
    if icc < 0.05:
        decision = "Low ICC suggests single-level analysis may be sufficient"
        recommendation = "Consider standard regression, but verify with LRT"
    elif icc < 0.10:
        decision = "Moderate ICC suggests borderline need for multilevel"
        recommendation = "Fit both models and compare with likelihood ratio test"
    elif icc < 0.25:
        decision = "Substantial ICC indicates multilevel modeling appropriate"
        recommendation = "Use multilevel model to account for clustering"
    else:
        decision = "High ICC strongly indicates nested structure"
        recommendation = "Multilevel modeling essential - ignoring clustering would inflate Type I error"

    avg_cluster_size = np.mean(group_sizes)
    design_effect = 1 + (avg_cluster_size - 1) * icc

    return {
        "icc": round(icc, 4),
        "variance_between": round(var_between, 6),
        "variance_within": round(var_within, 6),
        "n_groups": n_groups,
        "n_observations": total_n,
        "avg_group_size": round(avg_cluster_size, 2),
        "design_effect": round(design_effect, 4),
        "decision": decision,
        "recommendation": recommendation,
        "multilevel_needed": icc >= 0.05,
    }
