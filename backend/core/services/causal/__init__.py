"""
Causal Inference Toolkit
========================

Provides tools for causal reasoning beyond correlation, including:
- DAG (Directed Acyclic Graph) representation and analysis
- D-separation testing
- Confound identification
- Adjustment set calculation
- Propensity score methods (matching, weighting)
- Treatment effect estimation (ATE, ATT)
- Mediation analysis

Key Concepts:
- Confounders: Variables affecting both treatment and outcome
- Colliders: Variables affected by both treatment and outcome
- Mediators: Variables on the causal path from treatment to outcome
- Instrumental Variables: Affect outcome only through treatment

References:
    Pearl, J. (2009). Causality: Models, Reasoning, and Inference (2nd ed.).
    Cambridge University Press.

    Imbens, G. W., & Rubin, D. B. (2015). Causal Inference for Statistics,
    Social, and Biomedical Sciences: An Introduction. Cambridge University Press.

    Rosenbaum, P. R., & Rubin, D. B. (1983). The central role of the propensity
    score in observational studies for causal effects. Biometrika, 70(1), 41-55.

    Imai, K., Keele, L., & Tingley, D. (2010). A general approach to causal
    mediation analysis. Psychological Methods, 15(4), 309.

Created: December 26, 2025
Author: StickForStats Team
"""

from .dag import (
    CausalDAG,
    DAGNode,
    DAGEdge,
    create_dag_from_edges,
    NodeType
)

from .d_separation import (
    is_d_separated,
    find_d_separating_sets,
    identify_conditional_independencies,
    DSeparationResult
)

from .adjustment_sets import (
    find_adjustment_sets,
    minimal_adjustment_set,
    find_backdoor_paths,
    is_valid_adjustment_set,
    identify_confounders,
    AdjustmentSetResult
)

from .propensity import (
    estimate_propensity_scores,
    PropensityScoreResult,
    assess_overlap,
    trim_propensity_scores
)

from .matching import (
    propensity_score_matching,
    nearest_neighbor_matching,
    optimal_matching,
    MatchingResult,
    assess_balance
)

from .effects import (
    estimate_ate,
    estimate_att,
    estimate_effects_ipw,
    doubly_robust_estimator,
    TreatmentEffectResult
)

from .mediation import (
    baron_kenny_mediation,
    causal_mediation_analysis,
    mediation_sensitivity_analysis,
    multiple_mediator_analysis,
    MediationResult,
    CausalMediationResult
)

from .did import (
    difference_in_differences,
    event_study,
    test_parallel_trends_simple,
    staggered_did,
    DiDResult,
    EventStudyResult
)

__all__ = [
    # DAG
    'CausalDAG',
    'DAGNode',
    'DAGEdge',
    'create_dag_from_edges',
    'NodeType',

    # D-Separation
    'is_d_separated',
    'find_d_separating_sets',
    'identify_conditional_independencies',
    'DSeparationResult',

    # Adjustment Sets
    'find_adjustment_sets',
    'minimal_adjustment_set',
    'find_backdoor_paths',
    'is_valid_adjustment_set',
    'identify_confounders',
    'AdjustmentSetResult',

    # Propensity Scores
    'estimate_propensity_scores',
    'PropensityScoreResult',
    'assess_overlap',
    'trim_propensity_scores',

    # Matching
    'propensity_score_matching',
    'nearest_neighbor_matching',
    'optimal_matching',
    'MatchingResult',
    'assess_balance',

    # Treatment Effects
    'estimate_ate',
    'estimate_att',
    'estimate_effects_ipw',
    'doubly_robust_estimator',
    'TreatmentEffectResult',

    # Mediation Analysis
    'baron_kenny_mediation',
    'causal_mediation_analysis',
    'mediation_sensitivity_analysis',
    'multiple_mediator_analysis',
    'MediationResult',
    'CausalMediationResult',

    # Difference-in-Differences
    'difference_in_differences',
    'event_study',
    'test_parallel_trends_simple',
    'staggered_did',
    'DiDResult',
    'EventStudyResult'
]

__version__ = '1.0.0'
