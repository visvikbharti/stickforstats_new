"""
P-Curve Analysis Module
=======================

Implementation of p-curve analysis for detecting publication bias
and assessing evidential value of research findings.

P-curve is the distribution of statistically significant p-values.
If studies have evidential value, the p-curve should be right-skewed
(more low p-values than high ones).

References:
    Simonsohn, U., Nelson, L. D., & Simmons, J. P. (2014).
    P-curve: A key to the file-drawer.
    Journal of Experimental Psychology: General, 143(2), 534.

    Simonsohn, U., Nelson, L. D., & Simmons, J. P. (2015).
    Better P-curves: Making P-curve analysis more robust.
    Journal of Experimental Psychology: General, 144(6), 1146.

Created: December 26, 2025
Author: StickForStats Team
"""

from .core import (
    PCurveResult,
    compute_pcurve,
    compute_pp_values,
    stouffer_test,
    binomial_test_33,
    binomial_test_half,
    get_pcurve_interpretation,
)

from .input_parser import parse_test_statistic, convert_to_pvalue, PCurveInput, parse_multiple_studies

from .visualization import generate_pcurve_plot_data, generate_comparison_data

__all__ = [
    # Core
    "PCurveResult",
    "compute_pcurve",
    "compute_pp_values",
    "stouffer_test",
    "binomial_test_33",
    "binomial_test_half",
    "get_pcurve_interpretation",
    # Input
    "parse_test_statistic",
    "convert_to_pvalue",
    "PCurveInput",
    "parse_multiple_studies",
    # Visualization
    "generate_pcurve_plot_data",
    "generate_comparison_data",
]

__version__ = "1.0.0"
