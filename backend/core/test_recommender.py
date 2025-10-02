"""
Statistical Test Recommendation Engine
=======================================
Created: 2025-08-06 11:00:00 UTC
Author: StickForStats Development Team
Version: 1.0.0

This module implements an intelligent test recommendation system that suggests
appropriate statistical tests based on data characteristics, research questions,
and assumption checking.

Scientific Rigor: MAXIMUM
Decision Logic: Evidence-based statistical best practices
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any, Set, Union
from dataclasses import dataclass, field
from enum import Enum
import logging

from .data_profiler import DatasetProfile, VariableProfile, VariableType
from .assumption_checker import (
    AssumptionChecker, AssumptionType, AssumptionResult,
    ComprehensiveAssumptionCheck, TestSuggestion
)

logger = logging.getLogger(__name__)


class ResearchQuestion(Enum):
    """Types of research questions"""
    COMPARISON = "comparison"  # Compare groups
    RELATIONSHIP = "relationship"  # Examine relationships
    PREDICTION = "prediction"  # Predict outcomes
    REDUCTION = "reduction"  # Reduce dimensions
    CLASSIFICATION = "classification"  # Classify observations
    TIME_SERIES = "time_series"  # Analyze over time
    SURVIVAL = "survival"  # Time to event
    QUALITY_CONTROL = "quality_control"  # Process monitoring


class TestCategory(Enum):
    """Categories of statistical tests"""
    DESCRIPTIVE = "descriptive"
    PARAMETRIC = "parametric"
    NON_PARAMETRIC = "non_parametric"
    CORRELATION = "correlation"
    REGRESSION = "regression"
    CATEGORICAL = "categorical"
    MULTIVARIATE = "multivariate"
    TIME_SERIES = "time_series"
    SURVIVAL = "survival"
    QUALITY = "quality_control"


@dataclass
class TestRecommendation:
    """A single test recommendation with complete information"""
    test_name: str
    test_category: TestCategory
    description: str
    confidence_score: float  # 0-1, how confident we are in this recommendation
    
    # Requirements
    required_variables: List[str]
    variable_types_required: Dict[str, VariableType]
    minimum_sample_size: int
    
    # Assumptions
    assumptions: List[str]
    assumptions_met: Dict[str, bool]
    assumption_violations: List[str]
    
    # Alternatives
    parametric_alternative: Optional[str] = None
    non_parametric_alternative: Optional[str] = None
    robust_alternative: Optional[str] = None
    
    # Implementation
    python_function: str = ""
    r_function: str = ""
    
    # Interpretation guidance
    interpretation_guide: str = ""
    effect_size_measure: str = ""
    
    # Priority
    priority: int = 0  # Higher number = higher priority
    
    # Warnings
    warnings: List[str] = field(default_factory=list)
    
    # Power analysis
    power_analysis_available: bool = False
    recommended_sample_size: Optional[int] = None


class TestRecommendationEngine:
    """
    Intelligent system for recommending statistical tests based on data characteristics
    """
    
    def __init__(self, significance_level: float = 0.05):
        """Initialize the recommendation engine with test knowledge base
        
        Args:
            significance_level: Alpha level for assumption testing
        """
        self.test_database = self._build_test_database()
        self.decision_tree = self._build_decision_tree()
        self.assumption_checker = AssumptionChecker(significance_level)
        self.alpha = significance_level
        logger.info(f"Test Recommendation Engine initialized with alpha={significance_level}")
        
    def recommend_tests(self,
                        profile: DatasetProfile,
                        research_question: Optional[ResearchQuestion] = None,
                        dependent_variable: Optional[str] = None,
                        independent_variables: Optional[List[str]] = None,
                        data: Optional[pd.DataFrame] = None,
                        auto_switch: bool = True,
                        max_recommendations: int = 10) -> List[TestRecommendation]:
        """
        Recommend appropriate statistical tests based on data profile
        
        Args:
            profile: Dataset profile from DataProfiler
            research_question: Type of research question
            dependent_variable: Name of dependent/outcome variable
            independent_variables: Names of independent/predictor variables
            data: Raw data for assumption checking
            auto_switch: Automatically switch to robust alternatives when assumptions violated
            max_recommendations: Maximum number of recommendations
            
        Returns:
            List of test recommendations sorted by priority and confidence
        """
        recommendations = []
        
        # Infer research question if not provided
        if research_question is None:
            research_question = self._infer_research_question(
                profile, dependent_variable, independent_variables
            )
            
        # Get candidate tests based on research question
        candidate_tests = self._get_candidate_tests(research_question)
        
        # Evaluate each candidate test
        for test_name, test_info in candidate_tests.items():
            recommendation = self._evaluate_test(
                test_name, test_info, profile, 
                dependent_variable, independent_variables, data
            )
            
            if recommendation and recommendation.confidence_score > 0.3:
                recommendations.append(recommendation)
                
                # Auto-switch: Also add robust alternative as a separate recommendation
                if auto_switch and recommendation.assumption_violations:
                    # Create recommendation for robust alternative
                    if recommendation.robust_alternative:
                        alt_test_name = recommendation.robust_alternative
                        if alt_test_name in self.test_database:
                            alt_test_info = self.test_database[alt_test_name]
                            alt_recommendation = self._evaluate_test(
                                alt_test_name, alt_test_info, profile,
                                dependent_variable, independent_variables, data
                            )
                            if alt_recommendation:
                                # Boost confidence since it's more appropriate
                                alt_recommendation.confidence_score = min(
                                    1.0, alt_recommendation.confidence_score + 0.2
                                )
                                alt_recommendation.priority += 10
                                alt_recommendation.warnings.append(
                                    f"Recommended as robust alternative to {test_name}"
                                )
                                recommendations.append(alt_recommendation)
                    
                    # Also consider non-parametric alternative
                    elif recommendation.non_parametric_alternative:
                        alt_test_name = recommendation.non_parametric_alternative
                        if alt_test_name in self.test_database:
                            alt_test_info = self.test_database[alt_test_name]
                            alt_recommendation = self._evaluate_test(
                                alt_test_name, alt_test_info, profile,
                                dependent_variable, independent_variables, data
                            )
                            if alt_recommendation:
                                alt_recommendation.confidence_score = min(
                                    1.0, alt_recommendation.confidence_score + 0.15
                                )
                                alt_recommendation.priority += 5
                                alt_recommendation.warnings.append(
                                    f"Recommended as non-parametric alternative to {test_name}"
                                )
                                recommendations.append(alt_recommendation)
                
        # Sort by priority and confidence
        recommendations.sort(
            key=lambda x: (x.priority, x.confidence_score),
            reverse=True
        )
        
        # Return top recommendations
        return recommendations[:max_recommendations]
    
    def _build_test_database(self) -> Dict[str, Dict[str, Any]]:
        """
        Build comprehensive database of statistical tests
        
        Returns:
            Dictionary of test specifications
        """
        return {
            # T-tests
            "one_sample_t_test": {
                "category": TestCategory.PARAMETRIC,
                "description": "Compare sample mean to population mean",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 1,
                    "n_groups": 0,
                    "min_sample_size": 20
                },
                "assumptions": [
                    "normality",
                    "independence",
                    "random_sampling"
                ],
                "python_function": "scipy.stats.ttest_1samp",
                "r_function": "t.test(x, mu=value)",
                "effect_size": "Cohen's d",
                "interpretation": "Tests if sample mean differs from hypothesized value"
            },
            
            "independent_t_test": {
                "category": TestCategory.PARAMETRIC,
                "description": "Compare means of two independent groups",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 1,
                    "n_groups": 2,
                    "min_sample_size": 20
                },
                "assumptions": [
                    "normality",
                    "homogeneity_of_variance",
                    "independence"
                ],
                "python_function": "scipy.stats.ttest_ind",
                "r_function": "t.test(x, y, var.equal=TRUE)",
                "effect_size": "Cohen's d",
                "interpretation": "Tests if two group means are different"
            },
            
            "welch_t_test": {
                "category": TestCategory.PARAMETRIC,
                "description": "Compare means when variances are unequal",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 1,
                    "n_groups": 2,
                    "min_sample_size": 20
                },
                "assumptions": [
                    "normality",
                    "independence"
                ],
                "python_function": "scipy.stats.ttest_ind(equal_var=False)",
                "r_function": "t.test(x, y, var.equal=FALSE)",
                "effect_size": "Cohen's d",
                "interpretation": "Robust t-test for unequal variances"
            },
            
            "paired_t_test": {
                "category": TestCategory.PARAMETRIC,
                "description": "Compare paired/matched observations",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 2,
                    "n_groups": 0,
                    "min_sample_size": 20,
                    "paired_data": True
                },
                "assumptions": [
                    "normality_of_differences",
                    "independence_of_pairs"
                ],
                "python_function": "scipy.stats.ttest_rel",
                "r_function": "t.test(x, y, paired=TRUE)",
                "effect_size": "Cohen's d for paired data",
                "interpretation": "Tests if paired differences differ from zero"
            },
            
            # ANOVA
            "one_way_anova": {
                "category": TestCategory.PARAMETRIC,
                "description": "Compare means across multiple groups",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 1,
                    "n_groups": 3,  # 3 or more
                    "min_sample_size": 30
                },
                "assumptions": [
                    "normality",
                    "homogeneity_of_variance",
                    "independence"
                ],
                "python_function": "scipy.stats.f_oneway",
                "r_function": "aov(y ~ group)",
                "effect_size": "Eta-squared",
                "interpretation": "Tests if any group means differ",
                "post_hoc": "Tukey HSD"
            },
            
            "two_way_anova": {
                "category": TestCategory.PARAMETRIC,
                "description": "Analyze effects of two factors",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 1,
                    "n_categorical": 2,
                    "min_sample_size": 40
                },
                "assumptions": [
                    "normality",
                    "homogeneity_of_variance",
                    "independence"
                ],
                "python_function": "statsmodels.formula.api.ols",
                "r_function": "aov(y ~ factor1 * factor2)",
                "effect_size": "Partial eta-squared",
                "interpretation": "Tests main effects and interactions"
            },
            
            # Non-parametric tests
            "mann_whitney_u": {
                "category": TestCategory.NON_PARAMETRIC,
                "description": "Non-parametric alternative to independent t-test",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 1,
                    "n_groups": 2,
                    "min_sample_size": 10
                },
                "assumptions": [
                    "independence",
                    "ordinal_scale"
                ],
                "python_function": "scipy.stats.mannwhitneyu",
                "r_function": "wilcox.test(x, y)",
                "effect_size": "Rank-biserial correlation",
                "interpretation": "Tests if distributions differ"
            },
            
            "wilcoxon_signed_rank": {
                "category": TestCategory.NON_PARAMETRIC,
                "description": "Non-parametric alternative to paired t-test",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 2,
                    "n_groups": 0,
                    "min_sample_size": 10,
                    "paired_data": True
                },
                "assumptions": [
                    "independence_of_pairs",
                    "symmetry_of_differences"
                ],
                "python_function": "scipy.stats.wilcoxon",
                "r_function": "wilcox.test(x, y, paired=TRUE)",
                "effect_size": "Matched-pairs rank-biserial",
                "interpretation": "Tests if paired differences are symmetric around zero"
            },
            
            "kruskal_wallis": {
                "category": TestCategory.NON_PARAMETRIC,
                "description": "Non-parametric alternative to one-way ANOVA",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 1,
                    "n_groups": 3,
                    "min_sample_size": 15
                },
                "assumptions": [
                    "independence",
                    "ordinal_scale"
                ],
                "python_function": "scipy.stats.kruskal",
                "r_function": "kruskal.test(y ~ group)",
                "effect_size": "Epsilon-squared",
                "interpretation": "Tests if any group distributions differ",
                "post_hoc": "Dunn's test"
            },
            
            # Correlation tests
            "pearson_correlation": {
                "category": TestCategory.CORRELATION,
                "description": "Linear correlation between continuous variables",
                "research_questions": [ResearchQuestion.RELATIONSHIP],
                "requirements": {
                    "n_continuous": 2,
                    "min_sample_size": 30
                },
                "assumptions": [
                    "normality",
                    "linearity",
                    "homoscedasticity"
                ],
                "python_function": "scipy.stats.pearsonr",
                "r_function": "cor.test(x, y, method='pearson')",
                "effect_size": "r (correlation coefficient)",
                "interpretation": "Measures linear relationship strength"
            },
            
            "spearman_correlation": {
                "category": TestCategory.CORRELATION,
                "description": "Monotonic correlation (rank-based)",
                "research_questions": [ResearchQuestion.RELATIONSHIP],
                "requirements": {
                    "n_continuous": 2,
                    "min_sample_size": 10
                },
                "assumptions": [
                    "monotonic_relationship",
                    "ordinal_scale"
                ],
                "python_function": "scipy.stats.spearmanr",
                "r_function": "cor.test(x, y, method='spearman')",
                "effect_size": "rho (rank correlation)",
                "interpretation": "Measures monotonic relationship"
            },
            
            # Regression
            "linear_regression": {
                "category": TestCategory.REGRESSION,
                "description": "Predict continuous outcome from predictors",
                "research_questions": [ResearchQuestion.PREDICTION],
                "requirements": {
                    "n_continuous": 2,
                    "min_sample_size": 50
                },
                "assumptions": [
                    "linearity",
                    "independence",
                    "homoscedasticity",
                    "normality_of_residuals"
                ],
                "python_function": "statsmodels.api.OLS",
                "r_function": "lm(y ~ x)",
                "effect_size": "R-squared",
                "interpretation": "Models linear relationships"
            },
            
            "multiple_regression": {
                "category": TestCategory.REGRESSION,
                "description": "Predict outcome from multiple predictors",
                "research_questions": [ResearchQuestion.PREDICTION],
                "requirements": {
                    "n_continuous": 3,
                    "min_sample_size": 100
                },
                "assumptions": [
                    "linearity",
                    "independence",
                    "homoscedasticity",
                    "normality_of_residuals",
                    "no_multicollinearity"
                ],
                "python_function": "statsmodels.api.OLS",
                "r_function": "lm(y ~ x1 + x2 + ...)",
                "effect_size": "Adjusted R-squared",
                "interpretation": "Models complex relationships"
            },
            
            "logistic_regression": {
                "category": TestCategory.REGRESSION,
                "description": "Predict binary outcome",
                "research_questions": [ResearchQuestion.PREDICTION, ResearchQuestion.CLASSIFICATION],
                "requirements": {
                    "n_binary": 1,
                    "n_predictors": 1,
                    "min_sample_size": 100
                },
                "assumptions": [
                    "independence",
                    "linearity_of_logit",
                    "no_multicollinearity"
                ],
                "python_function": "statsmodels.api.Logit",
                "r_function": "glm(y ~ x, family=binomial)",
                "effect_size": "Odds ratios",
                "interpretation": "Models probability of binary outcome"
            },
            
            # Categorical tests
            "chi_square_independence": {
                "category": TestCategory.CATEGORICAL,
                "description": "Test independence of categorical variables",
                "research_questions": [ResearchQuestion.RELATIONSHIP],
                "requirements": {
                    "n_categorical": 2,
                    "min_sample_size": 20
                },
                "assumptions": [
                    "independence",
                    "expected_frequencies_5+"
                ],
                "python_function": "scipy.stats.chi2_contingency",
                "r_function": "chisq.test(table)",
                "effect_size": "Cramér's V",
                "interpretation": "Tests if variables are associated"
            },
            
            "fisher_exact": {
                "category": TestCategory.CATEGORICAL,
                "description": "Exact test for 2x2 contingency tables",
                "research_questions": [ResearchQuestion.RELATIONSHIP],
                "requirements": {
                    "n_binary": 2,
                    "min_sample_size": 5
                },
                "assumptions": [
                    "independence"
                ],
                "python_function": "scipy.stats.fisher_exact",
                "r_function": "fisher.test(table)",
                "effect_size": "Odds ratio",
                "interpretation": "Exact test for small samples"
            },
            
            # Multivariate tests
            "manova": {
                "category": TestCategory.MULTIVARIATE,
                "description": "Compare multiple outcomes across groups",
                "research_questions": [ResearchQuestion.COMPARISON],
                "requirements": {
                    "n_continuous": 2,
                    "n_groups": 2,
                    "min_sample_size": 50
                },
                "assumptions": [
                    "multivariate_normality",
                    "homogeneity_of_covariance",
                    "independence"
                ],
                "python_function": "statsmodels.multivariate.manova",
                "r_function": "manova(cbind(y1, y2) ~ group)",
                "effect_size": "Wilks' Lambda",
                "interpretation": "Tests multiple outcomes simultaneously"
            },
            
            "pca": {
                "category": TestCategory.MULTIVARIATE,
                "description": "Reduce dimensionality of data",
                "research_questions": [ResearchQuestion.REDUCTION],
                "requirements": {
                    "n_continuous": 3,
                    "min_sample_size": 100
                },
                "assumptions": [
                    "linearity",
                    "adequate_correlations"
                ],
                "python_function": "sklearn.decomposition.PCA",
                "r_function": "prcomp(data)",
                "effect_size": "Variance explained",
                "interpretation": "Identifies principal components"
            }
        }
    
    def _build_decision_tree(self) -> Dict[str, Any]:
        """
        Build decision tree for test selection
        
        Returns:
            Decision tree structure
        """
        return {
            "root": {
                "question": "What is your research question?",
                "branches": {
                    ResearchQuestion.COMPARISON: {
                        "question": "How many groups?",
                        "branches": {
                            0: {
                                "question": "Paired data?",
                                "branches": {
                                    True: ["paired_t_test", "wilcoxon_signed_rank"],
                                    False: ["one_sample_t_test"]
                                }
                            },
                            2: {
                                "question": "Independent groups?",
                                "branches": {
                                    True: {
                                        "question": "Normality met?",
                                        "branches": {
                                            True: ["independent_t_test", "welch_t_test"],
                                            False: ["mann_whitney_u"]
                                        }
                                    },
                                    False: ["paired_t_test", "wilcoxon_signed_rank"]
                                }
                            },
                            "3+": {
                                "question": "Normality met?",
                                "branches": {
                                    True: ["one_way_anova", "two_way_anova"],
                                    False: ["kruskal_wallis"]
                                }
                            }
                        }
                    },
                    ResearchQuestion.RELATIONSHIP: {
                        "question": "Variable types?",
                        "branches": {
                            "continuous": {
                                "question": "Linear relationship?",
                                "branches": {
                                    True: ["pearson_correlation", "linear_regression"],
                                    False: ["spearman_correlation"]
                                }
                            },
                            "categorical": ["chi_square_independence", "fisher_exact"]
                        }
                    },
                    ResearchQuestion.PREDICTION: {
                        "question": "Outcome type?",
                        "branches": {
                            "continuous": ["linear_regression", "multiple_regression"],
                            "binary": ["logistic_regression"],
                            "categorical": ["multinomial_regression"]
                        }
                    },
                    ResearchQuestion.REDUCTION: ["pca", "factor_analysis"]
                }
            }
        }
    
    def _infer_research_question(self,
                                 profile: DatasetProfile,
                                 dependent_variable: Optional[str],
                                 independent_variables: Optional[List[str]]) -> ResearchQuestion:
        """
        Infer research question from data structure
        
        Args:
            profile: Dataset profile
            dependent_variable: Dependent variable name
            independent_variables: Independent variable names
            
        Returns:
            Inferred research question type
        """
        # Count variable types
        continuous_vars = sum(1 for v in profile.variables.values() 
                            if v.type == VariableType.CONTINUOUS)
        categorical_vars = sum(1 for v in profile.variables.values() 
                             if v.type in [VariableType.NOMINAL, VariableType.BINARY])
        
        # Infer based on variable configuration
        if dependent_variable:
            dep_type = profile.variables[dependent_variable].type
            
            if dep_type == VariableType.CONTINUOUS:
                if independent_variables:
                    return ResearchQuestion.PREDICTION
                else:
                    return ResearchQuestion.COMPARISON
            elif dep_type in [VariableType.BINARY, VariableType.NOMINAL]:
                return ResearchQuestion.CLASSIFICATION
                
        # Default inferences
        if continuous_vars >= 3:
            if profile.multicollinearity_detected:
                return ResearchQuestion.REDUCTION
            else:
                return ResearchQuestion.RELATIONSHIP
        elif continuous_vars >= 1 and categorical_vars >= 1:
            return ResearchQuestion.COMPARISON
        elif categorical_vars >= 2:
            return ResearchQuestion.RELATIONSHIP
            
        return ResearchQuestion.COMPARISON  # Default
    
    def _get_candidate_tests(self, 
                            research_question: ResearchQuestion) -> Dict[str, Dict[str, Any]]:
        """
        Get candidate tests for a research question
        
        Args:
            research_question: Type of research question
            
        Returns:
            Dictionary of candidate tests
        """
        candidates = {}
        
        for test_name, test_info in self.test_database.items():
            if research_question in test_info.get("research_questions", []):
                candidates[test_name] = test_info
                
        return candidates
    
    def _evaluate_test(self,
                       test_name: str,
                       test_info: Dict[str, Any],
                       profile: DatasetProfile,
                       dependent_variable: Optional[str],
                       independent_variables: Optional[List[str]],
                       data: Optional[pd.DataFrame] = None) -> Optional[TestRecommendation]:
        """
        Evaluate if a test is appropriate and create recommendation
        
        Args:
            test_name: Name of the test
            test_info: Test specification
            profile: Dataset profile
            dependent_variable: Dependent variable
            independent_variables: Independent variables
            
        Returns:
            TestRecommendation or None if not appropriate
        """
        # Check basic requirements
        requirements = test_info.get("requirements", {})
        
        # Count variable types in dataset
        continuous_vars = [name for name, v in profile.variables.items() 
                          if v.type == VariableType.CONTINUOUS]
        categorical_vars = [name for name, v in profile.variables.items() 
                           if v.type in [VariableType.NOMINAL, VariableType.BINARY]]
        binary_vars = [name for name, v in profile.variables.items() 
                      if v.type == VariableType.BINARY]
        
        # Check variable count requirements
        if "n_continuous" in requirements:
            if len(continuous_vars) < requirements["n_continuous"]:
                return None
                
        if "n_categorical" in requirements:
            if len(categorical_vars) < requirements["n_categorical"]:
                return None
                
        # Check sample size
        if profile.n_rows < requirements.get("min_sample_size", 0):
            return None
            
        # Create recommendation
        recommendation = TestRecommendation(
            test_name=test_name,
            test_category=test_info["category"],
            description=test_info["description"],
            confidence_score=0.5,  # Base confidence
            required_variables=[],
            variable_types_required={},
            minimum_sample_size=requirements.get("min_sample_size", 30),
            assumptions=test_info.get("assumptions", []),
            assumptions_met={},
            assumption_violations=[],
            python_function=test_info.get("python_function", ""),
            r_function=test_info.get("r_function", ""),
            interpretation_guide=test_info.get("interpretation", ""),
            effect_size_measure=test_info.get("effect_size", "")
        )
        
        # Check assumptions with real statistical tests
        confidence_adjustments = []
        assumption_results = []
        
        for assumption in recommendation.assumptions:
            met, assumption_result = self._check_assumption(
                assumption, profile, dependent_variable, 
                independent_variables, data
            )
            recommendation.assumptions_met[assumption] = met
            
            if assumption_result:
                assumption_results.append(assumption_result)
                # Use confidence from actual statistical test
                confidence_adjustment = assumption_result.confidence * 0.2 - 0.1
            else:
                confidence_adjustment = 0.1 if met else -0.1
            
            if not met:
                recommendation.assumption_violations.append(assumption)
                
            confidence_adjustments.append(confidence_adjustment)
                
        # Adjust confidence based on assumptions
        recommendation.confidence_score += sum(confidence_adjustments)
        recommendation.confidence_score = max(0, min(1, recommendation.confidence_score))
        
        # Set alternatives based on assumption violations
        recommendation = self._set_alternatives_based_on_violations(
            recommendation, test_name, assumption_results
        )
        
        # Set priority based on test type and confidence
        recommendation.priority = self._calculate_priority(recommendation)
        
        # Add warnings if needed
        if recommendation.assumption_violations:
            recommendation.warnings.append(
                f"Assumptions violated: {', '.join(recommendation.assumption_violations)}"
            )
            
        return recommendation
    
    def _check_assumption(self,
                         assumption: str,
                         profile: DatasetProfile,
                         dependent_variable: Optional[str],
                         independent_variables: Optional[List[str]] = None,
                         data: Optional[pd.DataFrame] = None) -> Tuple[bool, Optional[AssumptionResult]]:
        """
        Check if a specific assumption is met using real statistical tests
        
        Args:
            assumption: Name of assumption
            profile: Dataset profile
            dependent_variable: Dependent variable
            independent_variables: Independent variables
            data: Raw data if available
            
        Returns:
            Tuple of (is_met, AssumptionResult)
        """
        result = None
        
        # Get raw data if available
        if data is not None and not data.empty:
            # Normality assumptions
            if "normality" in assumption:
                if dependent_variable and dependent_variable in data.columns:
                    # Check normality of dependent variable
                    dep_data = data[dependent_variable].dropna()
                    result = self.assumption_checker.check_normality(dep_data, method="combined")
                elif "differences" in assumption and dependent_variable:
                    # For paired tests, check normality of differences
                    if independent_variables and len(independent_variables) == 1:
                        var1 = data[dependent_variable].dropna()
                        var2 = data[independent_variables[0]].dropna()
                        if len(var1) == len(var2):
                            differences = var1 - var2
                            result = self.assumption_checker.check_normality(differences, method="combined")
                else:
                    # Check all continuous variables
                    continuous_cols = [col for col, var in profile.variables.items()
                                     if var.type == VariableType.CONTINUOUS]
                    if continuous_cols and continuous_cols[0] in data.columns:
                        test_data = data[continuous_cols[0]].dropna()
                        result = self.assumption_checker.check_normality(test_data, method="combined")
                        
            # Homogeneity of variance
            elif "homogeneity" in assumption:
                if independent_variables and len(independent_variables) == 1:
                    # Group data by independent variable
                    grouping_var = independent_variables[0]
                    if grouping_var in data.columns and dependent_variable in data.columns:
                        groups = []
                        for group_val in data[grouping_var].unique():
                            group_data = data[data[grouping_var] == group_val][dependent_variable].dropna()
                            if len(group_data) > 1:
                                groups.append(group_data.values)
                        
                        if len(groups) >= 2:
                            result = self.assumption_checker.check_homoscedasticity(*groups, method="levene")
                            
            # Independence
            elif assumption == "independence":
                if dependent_variable and dependent_variable in data.columns:
                    test_data = data[dependent_variable].dropna()
                    result = self.assumption_checker.check_independence(data=test_data)
                    
            # No multicollinearity
            elif "multicollinearity" in assumption:
                if independent_variables and len(independent_variables) > 1:
                    # Check multicollinearity among independent variables
                    indep_cols = [col for col in independent_variables if col in data.columns]
                    if len(indep_cols) > 1:
                        X = data[indep_cols].dropna()
                        if len(X) > 0:
                            result = self.assumption_checker.check_multicollinearity(
                                X.values, feature_names=indep_cols
                            )
                            
            # Sample size adequacy
            elif "sample_size" in assumption or "adequate" in assumption:
                n = len(data) if data is not None else profile.n_rows
                test_type = "t_test"  # Default, should be passed from context
                result = self.assumption_checker.check_sample_size_adequacy(n, test_type=test_type)
                
            # No outliers
            elif "outlier" in assumption:
                if dependent_variable and dependent_variable in data.columns:
                    test_data = data[dependent_variable].dropna()
                    result = self.assumption_checker.check_outliers(test_data, method="iqr")
        
        # Fallback to profile-based checking if no raw data or result not obtained
        if result is None:
            # Use original logic as fallback
            if "normality" in assumption:
                if dependent_variable and dependent_variable in profile.variables:
                    var = profile.variables[dependent_variable]
                    if var.normality_p_value:
                        is_met = var.normality_p_value > self.alpha
                        return is_met, None
                else:
                    continuous_vars = [v for v in profile.variables.values() 
                                     if v.type == VariableType.CONTINUOUS]
                    if continuous_vars:
                        is_met = all(v.normality_p_value > self.alpha 
                                   for v in continuous_vars 
                                   if v.normality_p_value is not None)
                        return is_met, None
                        
            elif "multicollinearity" in assumption:
                return not profile.multicollinearity_detected, None
                
            # Default to met if we can't check
            return True, None
        
        # Return result from real statistical test
        return result.is_met if result else True, result
    
    def _set_alternatives_based_on_violations(self,
                                             recommendation: TestRecommendation,
                                             test_name: str,
                                             assumption_results: List[AssumptionResult]) -> TestRecommendation:
        """
        Set alternative tests based on specific assumption violations
        
        Args:
            recommendation: Test recommendation
            test_name: Name of the test
            assumption_results: Results from assumption checking
            
        Returns:
            Updated recommendation with intelligent alternatives
        """
        # Check which assumptions were violated
        normality_violated = any(
            r.assumption_type == AssumptionType.NORMALITY and not r.is_met
            for r in assumption_results
        )
        homoscedasticity_violated = any(
            r.assumption_type == AssumptionType.HOMOSCEDASTICITY and not r.is_met
            for r in assumption_results
        )
        independence_violated = any(
            r.assumption_type == AssumptionType.INDEPENDENCE and not r.is_met
            for r in assumption_results
        )
        outliers_present = any(
            r.assumption_type == AssumptionType.NO_OUTLIERS and not r.is_met
            for r in assumption_results
        )
        
        # Intelligent alternative selection based on violations
        if test_name == "independent_t_test":
            if normality_violated:
                recommendation.non_parametric_alternative = "mann_whitney_u"
                recommendation.robust_alternative = "permutation_test"
            elif homoscedasticity_violated:
                recommendation.robust_alternative = "welch_t_test"
                recommendation.non_parametric_alternative = "mann_whitney_u"
            elif outliers_present:
                recommendation.robust_alternative = "trimmed_mean_test"
                recommendation.non_parametric_alternative = "mann_whitney_u"
            else:
                # Default alternatives
                recommendation.non_parametric_alternative = "mann_whitney_u"
                recommendation.robust_alternative = "welch_t_test"
                
        elif test_name == "paired_t_test":
            if normality_violated:
                recommendation.non_parametric_alternative = "wilcoxon_signed_rank"
                recommendation.robust_alternative = "sign_test"
            else:
                recommendation.non_parametric_alternative = "wilcoxon_signed_rank"
                
        elif test_name == "one_way_anova":
            if normality_violated:
                recommendation.non_parametric_alternative = "kruskal_wallis"
                recommendation.robust_alternative = "welch_anova"
            elif homoscedasticity_violated:
                recommendation.robust_alternative = "welch_anova"
                recommendation.non_parametric_alternative = "kruskal_wallis"
            else:
                recommendation.non_parametric_alternative = "kruskal_wallis"
                
        elif test_name == "pearson_correlation":
            if normality_violated or outliers_present:
                recommendation.non_parametric_alternative = "spearman_correlation"
                recommendation.robust_alternative = "kendall_tau"
            else:
                recommendation.non_parametric_alternative = "spearman_correlation"
                
        elif test_name == "linear_regression":
            if normality_violated:
                recommendation.robust_alternative = "robust_regression"
                recommendation.non_parametric_alternative = "quantile_regression"
            elif homoscedasticity_violated:
                recommendation.robust_alternative = "weighted_least_squares"
            elif outliers_present:
                recommendation.robust_alternative = "huber_regression"
                
        elif test_name == "chi_square_independence":
            # Check for expected frequency violations
            expected_freq_violated = any(
                r.assumption_type == AssumptionType.EXPECTED_FREQUENCIES and not r.is_met
                for r in assumption_results
            )
            if expected_freq_violated:
                recommendation.non_parametric_alternative = "fisher_exact"
                recommendation.robust_alternative = "g_test"
        
        # Add auto-switching recommendation
        if recommendation.assumption_violations:
            if recommendation.robust_alternative:
                recommendation.warnings.append(
                    f"Auto-switch recommendation: Use {recommendation.robust_alternative} due to assumption violations"
                )
            elif recommendation.non_parametric_alternative:
                recommendation.warnings.append(
                    f"Auto-switch recommendation: Use {recommendation.non_parametric_alternative} due to assumption violations"
                )
            
        return recommendation
    
    def _set_alternatives(self,
                         recommendation: TestRecommendation,
                         test_name: str) -> TestRecommendation:
        """
        Set alternative tests for a recommendation (legacy method kept for compatibility)
        
        Args:
            recommendation: Test recommendation
            test_name: Name of the test
            
        Returns:
            Updated recommendation with alternatives
        """
        alternatives = {
            "independent_t_test": {
                "non_parametric": "mann_whitney_u",
                "robust": "welch_t_test"
            },
            "paired_t_test": {
                "non_parametric": "wilcoxon_signed_rank"
            },
            "one_way_anova": {
                "non_parametric": "kruskal_wallis"
            },
            "pearson_correlation": {
                "non_parametric": "spearman_correlation"
            }
        }
        
        if test_name in alternatives:
            alts = alternatives[test_name]
            recommendation.non_parametric_alternative = alts.get("non_parametric")
            recommendation.robust_alternative = alts.get("robust")
            
        return recommendation
    
    def _calculate_priority(self, recommendation: TestRecommendation) -> int:
        """
        Calculate priority score for a recommendation
        
        Args:
            recommendation: Test recommendation
            
        Returns:
            Priority score (higher is better)
        """
        priority = 50  # Base priority
        
        # Adjust based on category
        category_priorities = {
            TestCategory.DESCRIPTIVE: 10,
            TestCategory.PARAMETRIC: 30,
            TestCategory.NON_PARAMETRIC: 25,
            TestCategory.CORRELATION: 20,
            TestCategory.REGRESSION: 40,
            TestCategory.MULTIVARIATE: 35
        }
        
        priority += category_priorities.get(recommendation.test_category, 0)
        
        # Adjust based on confidence
        priority += int(recommendation.confidence_score * 20)
        
        # Penalize for violations
        priority -= len(recommendation.assumption_violations) * 5
        
        return max(0, priority)
    
    def generate_recommendation_report(self,
                                      recommendations: List[TestRecommendation]) -> str:
        """
        Generate human-readable report of recommendations
        
        Args:
            recommendations: List of test recommendations
            
        Returns:
            Formatted report string
        """
        report = []
        report.append("=" * 80)
        report.append("STATISTICAL TEST RECOMMENDATIONS")
        report.append("=" * 80)
        report.append("")
        
        for i, rec in enumerate(recommendations, 1):
            report.append(f"{i}. {rec.test_name.upper().replace('_', ' ')}")
            report.append("-" * 40)
            report.append(f"Description: {rec.description}")
            report.append(f"Category: {rec.test_category.value}")
            report.append(f"Confidence: {rec.confidence_score:.1%}")
            report.append(f"Priority: {rec.priority}")
            report.append("")
            
            # Assumptions
            report.append("Assumptions:")
            for assumption, met in rec.assumptions_met.items():
                status = "✓" if met else "✗"
                report.append(f"  {status} {assumption.replace('_', ' ').title()}")
                
            if rec.assumption_violations:
                report.append("")
                report.append("⚠️ Warning: Some assumptions are violated")
                report.append("Consider alternatives:")
                if rec.non_parametric_alternative:
                    report.append(f"  • Non-parametric: {rec.non_parametric_alternative}")
                if rec.robust_alternative:
                    report.append(f"  • Robust: {rec.robust_alternative}")
                    
            # Implementation
            report.append("")
            report.append("Implementation:")
            report.append(f"  Python: {rec.python_function}")
            report.append(f"  R: {rec.r_function}")
            
            # Effect size
            if rec.effect_size_measure:
                report.append(f"  Effect Size: {rec.effect_size_measure}")
                
            # Interpretation
            if rec.interpretation_guide:
                report.append("")
                report.append(f"Interpretation: {rec.interpretation_guide}")
                
            report.append("")
            report.append("")
            
        return "\n".join(report)