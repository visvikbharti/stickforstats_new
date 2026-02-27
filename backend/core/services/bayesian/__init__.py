"""
Bayesian Statistics Module
==========================

This module provides Bayesian alternatives to frequentist statistical tests,
with integration into the StickForStats Guardian system.

Implemented Tests:
- Bayesian One-Sample T-Test
- Bayesian Independent Samples T-Test
- Bayesian Paired Samples T-Test
- Bayesian One-Way ANOVA
- Bayesian Correlation

Key Features:
- JZS (Jeffreys-Zellner-Siow) priors for effect sizes
- Bayes Factor calculation with interpretation
- Posterior distribution visualization
- ROPE (Region of Practical Equivalence) analysis
- Credible intervals (HDI)
- Side-by-side frequentist comparison

References:
    Rouder, J. N., Speckman, P. L., Sun, D., Morey, R. D., & Iverson, G. (2009).
    Bayesian t tests for accepting and rejecting the null hypothesis.
    Psychonomic Bulletin & Review, 16(2), 225-237.

    Morey, R. D., & Rouder, J. N. (2011).
    Bayes factor approaches for testing interval null hypotheses.
    Psychological Methods, 16(4), 406.

    Kruschke, J. K. (2018).
    Rejecting or accepting parameter values in Bayesian estimation.
    Advances in Methods and Practices in Psychological Science, 1(2), 270-280.

Created: December 26, 2025
Author: StickForStats Team
"""

from .bayesian_ttest import (
    bayesian_one_sample_ttest,
    bayesian_two_sample_ttest,
    bayesian_paired_ttest,
    BayesianTTestResult,
)

from .bayesian_anova import bayesian_one_way_anova, BayesianAnovaResult

from .bayesian_correlation import bayesian_correlation, BayesianCorrelationResult

from .bayes_factor import interpret_bayes_factor, bayes_factor_to_probability, JEFFREYS_SCALE

from .posterior import compute_posterior_ttest, compute_hdi, rope_analysis

from .priors import PRIOR_SCALES, get_prior_description

__all__ = [
    # T-Tests
    "bayesian_one_sample_ttest",
    "bayesian_two_sample_ttest",
    "bayesian_paired_ttest",
    "BayesianTTestResult",
    # ANOVA
    "bayesian_one_way_anova",
    "BayesianAnovaResult",
    # Correlation
    "bayesian_correlation",
    "BayesianCorrelationResult",
    # Bayes Factor
    "interpret_bayes_factor",
    "bayes_factor_to_probability",
    "JEFFREYS_SCALE",
    # Posterior
    "compute_posterior_ttest",
    "compute_hdi",
    "rope_analysis",
    # Priors
    "PRIOR_SCALES",
    "get_prior_description",
]

__version__ = "1.0.0"
