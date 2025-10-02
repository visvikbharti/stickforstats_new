"""
Type definitions for statistical analysis services.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Union


class TestType(Enum):
    """Enumeration of available statistical test types."""
    ONE_WAY_ANOVA = "One-way ANOVA"
    TWO_WAY_ANOVA = "Two-way ANOVA"
    REPEATED_MEASURES = "Repeated Measures ANOVA"
    MIXED_ANOVA = "Mixed ANOVA"
    MANOVA = "MANOVA"
    KRUSKAL_WALLIS = "Kruskal-Wallis"
    FRIEDMAN = "Friedman"
    MIXED_EFFECTS = "Mixed Effects Model"


@dataclass
class ReplicateConfig:
    """Configuration for handling replicates in the analysis."""
    has_replicates: bool
    replicate_type: str  # 'technical' or 'biological'
    num_replicates: int
    pooled_analysis: bool
    include_outlier_analysis: bool


@dataclass
class VariableSelection:
    """Selected variables for the analysis."""
    dependent_variables: List[str]
    independent_variables: List[str]
    subject_id: Optional[str] = None
    covariates: Optional[List[str]] = None
    within_factors: Optional[List[str]] = None
    between_factors: Optional[List[str]] = None


@dataclass
class AnalysisOptions:
    """Options for statistical analysis."""
    alpha: float = 0.05
    post_hoc: bool = True
    assumption_checks: bool = True
    equal_var_assumed: bool = True
    correction_method: str = "bonferroni"
    replicate_config: Optional[ReplicateConfig] = None
    include_descriptive: bool = True
    include_plots: bool = True
    export_format: str = "json"