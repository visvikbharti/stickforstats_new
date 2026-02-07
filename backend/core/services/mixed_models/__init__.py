"""
Mixed Effects Models Module
===========================

Provides Linear Mixed Models (LMM) and related functionality for
analyzing hierarchical/nested data structures.

Features:
- Linear Mixed Models with random intercepts and slopes
- Intraclass Correlation Coefficient (ICC)
- Model comparison (AIC, BIC, likelihood ratio tests)
- Random effects visualization
- Guardian integration for multilevel assumptions

Common Use Cases:
- Students nested within classrooms within schools
- Repeated measures within subjects
- Patients within clinics within hospitals
- Employees within teams within companies

References:
    Snijders, T. A., & Bosker, R. J. (2011). Multilevel Analysis: An
    Introduction to Basic and Advanced Multilevel Modeling (2nd ed.).

    Raudenbush, S. W., & Bryk, A. S. (2002). Hierarchical Linear Models:
    Applications and Data Analysis Methods (2nd ed.).

    Bates, D., Mächler, M., Bolker, B., & Walker, S. (2015). Fitting
    Linear Mixed-Effects Models Using lme4. Journal of Statistical
    Software, 67(1), 1-48.

Created: December 26, 2025
Author: StickForStats Team
"""

from .icc import (
    calculate_icc,
    icc_one_way_random,
    icc_two_way_random,
    icc_two_way_mixed,
    ICCResult,
    ICC_TYPES
)

from .lmm import (
    fit_linear_mixed_model,
    LMMResult,
    LMMSpecification,
    RandomEffect,
    COVARIANCE_STRUCTURES
)

from .model_comparison import (
    compare_models,
    likelihood_ratio_test,
    aic_comparison,
    bic_comparison,
    ModelComparisonResult
)

from .random_effects import (
    extract_random_effects,
    random_effects_variance,
    caterpillar_plot_data,
    RandomEffectsResult
)

from .diagnostics import (
    check_convergence,
    residual_diagnostics,
    influence_diagnostics,
    full_diagnostics,
    LMMDiagnostics
)

__all__ = [
    # ICC
    'calculate_icc',
    'icc_one_way_random',
    'icc_two_way_random',
    'icc_two_way_mixed',
    'ICCResult',
    'ICC_TYPES',

    # LMM
    'fit_linear_mixed_model',
    'LMMResult',
    'LMMSpecification',
    'RandomEffect',
    'COVARIANCE_STRUCTURES',

    # Model Comparison
    'compare_models',
    'likelihood_ratio_test',
    'aic_comparison',
    'bic_comparison',
    'ModelComparisonResult',

    # Random Effects
    'extract_random_effects',
    'random_effects_variance',
    'caterpillar_plot_data',
    'RandomEffectsResult',

    # Diagnostics
    'check_convergence',
    'residual_diagnostics',
    'influence_diagnostics',
    'full_diagnostics',
    'LMMDiagnostics'
]

__version__ = '1.0.0'
