"""
P-Curve Visualization Module
============================

Generates data for p-curve visualizations.

Created: December 26, 2025
"""

from typing import Dict, Any, List
import numpy as np
from .core import PCurveResult


def generate_pcurve_plot_data(result: PCurveResult) -> Dict[str, Any]:
    """
    Generate data for p-curve histogram visualization.

    Args:
        result: PCurveResult from compute_pcurve

    Returns:
        Dictionary with plot data for frontend visualization
    """
    # Bin edges and centers
    bin_edges = [0, 0.01, 0.02, 0.03, 0.04, 0.05]
    bin_centers = [0.005, 0.015, 0.025, 0.035, 0.045]

    # Observed counts
    observed_counts = result.histogram_counts
    n_total = sum(observed_counts)

    # Normalize to proportions
    observed_props = [c / n_total if n_total > 0 else 0 for c in observed_counts]

    # Expected under null (uniform)
    expected_null_props = [0.2] * 5  # 20% in each bin

    # Expected under 33% power (slightly right-skewed)
    # Approximate distribution
    expected_33_props = [0.356, 0.161, 0.161, 0.161, 0.161]

    # Expected under 80% power (highly right-skewed)
    expected_80_props = [0.73, 0.10, 0.07, 0.05, 0.05]

    return {
        "title": "P-Curve Analysis",
        "subtitle": f"Distribution of {n_total} significant p-values",
        "bins": {
            "edges": bin_edges,
            "centers": bin_centers,
            "labels": ["p < .01", ".01-.02", ".02-.03", ".03-.04", ".04-.05"],
        },
        "observed": {
            "counts": observed_counts,
            "proportions": observed_props,
            "label": "Observed",
            "color": "#2196F3",  # Blue
        },
        "expected_null": {
            "proportions": expected_null_props,
            "label": "Expected if null (no effect)",
            "color": "#9E9E9E",  # Gray
            "style": "dashed",
        },
        "expected_33": {
            "proportions": expected_33_props,
            "label": "Expected if 33% power",
            "color": "#FF9800",  # Orange
            "style": "dashed",
        },
        "expected_80": {
            "proportions": expected_80_props,
            "label": "Expected if 80% power",
            "color": "#4CAF50",  # Green
            "style": "dashed",
        },
        "annotations": {
            "has_evidential_value": result.has_evidential_value,
            "inadequate_evidence": result.inadequate_evidence,
            "interpretation_color": "#4CAF50"
            if result.has_evidential_value
            else ("#F44336" if result.inadequate_evidence else "#FF9800"),
        },
        "summary_stats": {
            "n_studies": result.n_studies,
            "n_significant": result.n_significant,
            "prop_below_025": sum(observed_counts[:2]) / n_total if n_total > 0 else 0,
            "estimated_power": result.estimated_power,
        },
    }


def generate_pp_values_plot(result: PCurveResult) -> Dict[str, Any]:
    """
    Generate data for PP-values distribution plot.

    Args:
        result: PCurveResult from compute_pcurve

    Returns:
        Dictionary with PP-values plot data
    """
    pp_values = result.pp_values_full

    if not pp_values:
        return {"error": "No PP-values available", "pp_values": []}

    # Create cumulative distribution
    sorted_pp = np.sort(pp_values)
    n = len(sorted_pp)
    cumulative = np.arange(1, n + 1) / n

    # Expected uniform CDF
    uniform_x = [0, 1]
    uniform_y = [0, 1]

    return {
        "title": "PP-Values Distribution",
        "subtitle": "Cumulative distribution of PP-values",
        "observed": {
            "x": sorted_pp.tolist(),
            "y": cumulative.tolist(),
            "label": "Observed PP-values",
            "color": "#2196F3",
        },
        "expected_uniform": {
            "x": uniform_x,
            "y": uniform_y,
            "label": "Expected if null (uniform)",
            "color": "#9E9E9E",
            "style": "dashed",
        },
        "ks_test": {
            "statistic": float(np.max(np.abs(cumulative - sorted_pp))),
            "note": "Kolmogorov-Smirnov statistic vs uniform",
        },
    }


def generate_comparison_data(result: PCurveResult, include_power_curves: bool = True) -> Dict[str, Any]:
    """
    Generate comprehensive comparison data for visualization.

    Args:
        result: PCurveResult from compute_pcurve
        include_power_curves: Whether to include expected curves at various power levels

    Returns:
        Dictionary with all visualization data
    """
    plot_data = generate_pcurve_plot_data(result)
    pp_plot = generate_pp_values_plot(result)

    # Power estimation curve
    power_estimate_data = None
    if result.estimated_power:
        power_estimate_data = {
            "estimate": result.estimated_power,
            "ci": list(result.power_ci) if result.power_ci else None,
            "interpretation": _get_power_interpretation(result.estimated_power),
        }

    # Test results summary
    test_summary = {
        "right_skew": {
            "test_name": "Right-skew test",
            "z": result.right_skew_test.get("z", 0),
            "p": result.right_skew_test.get("p", 1),
            "significant": result.right_skew_test.get("significant", False),
            "conclusion": "Evidence of right-skew"
            if result.right_skew_test.get("significant")
            else "No significant right-skew",
        },
        "half_test": {
            "test_name": "Binomial test",
            "n_below_025": result.half_test.get("n_below", 0),
            "n_total": result.half_test.get("n_total", 0),
            "proportion": result.half_test.get("prop", 0),
            "p": result.half_test.get("p", 1),
            "significant": result.half_test.get("significant", False),
        },
        "flat_test": {
            "test_name": "33% power test",
            "p": result.flat_test.get("p", 1),
            "conclusion": "Consistent with 33% power"
            if result.flat_test.get("p", 1) > 0.05
            else "Differs from 33% power",
        },
    }

    return {
        "histogram": plot_data,
        "pp_values": pp_plot,
        "power_estimate": power_estimate_data,
        "test_summary": test_summary,
        "overall_conclusion": {
            "has_evidential_value": result.has_evidential_value,
            "inadequate_evidence": result.inadequate_evidence,
            "interpretation": result.interpretation,
        },
    }


def _get_power_interpretation(power: float) -> str:
    """Get interpretation string for power estimate."""
    if power >= 0.8:
        return "High power - studies appear well-powered"
    elif power >= 0.5:
        return "Moderate power - may have missed some true effects"
    elif power >= 0.33:
        return "Low power - studies likely underpowered"
    else:
        return "Very low power - serious power concerns"


def generate_sensitivity_plot_data(p_values: List[float]) -> Dict[str, Any]:
    """
    Generate sensitivity analysis data showing how conclusions
    change with different subsets of studies.

    Args:
        p_values: List of p-values

    Returns:
        Dictionary with sensitivity analysis data
    """
    from .core import compute_pcurve

    n_studies = len(p_values)
    sensitivity_results = []

    # Leave-one-out analysis
    for i in range(min(n_studies, 20)):  # Limit for performance
        subset = p_values[:i] + p_values[i + 1 :]
        if len(subset) >= 3:
            result = compute_pcurve(subset)
            sensitivity_results.append(
                {
                    "excluded_study": i + 1,
                    "has_evidential_value": result.has_evidential_value,
                    "estimated_power": result.estimated_power,
                }
            )

    # Cumulative analysis (first k studies)
    cumulative_results = []
    for k in range(3, n_studies + 1):
        subset = p_values[:k]
        result = compute_pcurve(subset)
        cumulative_results.append(
            {
                "n_studies": k,
                "has_evidential_value": result.has_evidential_value,
                "estimated_power": result.estimated_power,
                "prop_below_025": sum(1 for p in subset if p < 0.025) / len(subset),
            }
        )

    return {
        "leave_one_out": sensitivity_results,
        "cumulative": cumulative_results,
        "stability_assessment": _assess_stability(sensitivity_results),
    }


def _assess_stability(leave_one_out_results: List[Dict]) -> str:
    """Assess stability of conclusions across subsets."""
    if not leave_one_out_results:
        return "Insufficient data for stability assessment"

    evidential_count = sum(1 for r in leave_one_out_results if r["has_evidential_value"])
    total = len(leave_one_out_results)

    if evidential_count == total:
        return "Highly stable - conclusion robust to excluding any single study"
    elif evidential_count >= total * 0.8:
        return "Mostly stable - conclusion holds for most subsets"
    elif evidential_count >= total * 0.5:
        return "Moderately stable - conclusion depends on specific studies"
    else:
        return "Unstable - conclusion sensitive to study selection"
