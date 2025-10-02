"""
Automatic Statistical Test Selection System
===========================================
Intelligently selects appropriate statistical tests based on data characteristics,
assumptions testing, and research questions.

Author: StickForStats Development Team
Date: September 2025
Version: 1.0.0
"""

from typing import Dict, List, Tuple, Optional, Union, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
from scipy import stats
import logging

logger = logging.getLogger(__name__)


class ResearchQuestion(Enum):
    """Types of research questions"""
    CORRELATION = "correlation"  # Relationship between variables
    DIFFERENCE = "difference"  # Difference between groups
    PREDICTION = "prediction"  # Predict outcome from predictors
    ASSOCIATION = "association"  # Association between categorical variables
    TREND = "trend"  # Change over time
    NORMALITY = "normality"  # Test for distribution


class DataType(Enum):
    """Data types for variables"""
    CONTINUOUS = "continuous"
    ORDINAL = "ordinal"
    NOMINAL = "nominal"
    BINARY = "binary"
    COUNT = "count"
    TIME_SERIES = "time_series"


class TestCategory(Enum):
    """Categories of statistical tests"""
    PARAMETRIC = "parametric"
    NON_PARAMETRIC = "non_parametric"
    ROBUST = "robust"


@dataclass
class TestRecommendation:
    """Comprehensive test recommendation"""
    primary_test: str
    test_category: TestCategory
    confidence_score: float  # 0-1 score of how appropriate the test is

    # Alternative tests
    alternatives: List[str]

    # Reasoning
    reasoning: List[str]
    assumptions_met: Dict[str, bool]
    assumptions_violated: List[str]

    # Warnings and guidance
    warnings: List[str]
    prerequisites: List[str]
    interpretation_notes: List[str]

    # Educational content
    when_to_use: str
    when_not_to_use: str
    example_interpretation: str


@dataclass
class DataProfile:
    """Complete profile of dataset characteristics"""
    # Basic properties
    sample_size: int
    num_variables: int
    variable_types: Dict[str, DataType]

    # Distribution properties
    normality: Dict[str, bool]
    outliers: Dict[str, bool]
    homogeneity_of_variance: Optional[bool]

    # Relationships
    linearity: Optional[float]
    monotonicity: Optional[float]
    independence: Optional[bool]

    # Group structure
    num_groups: Optional[int]
    group_sizes: Optional[List[int]]
    balanced_groups: Optional[bool]

    # Special characteristics
    paired_data: bool
    repeated_measures: bool
    missing_data: Dict[str, float]  # Percentage missing per variable


class AutomaticTestSelector:
    """
    Intelligent system for automatic statistical test selection.
    Analyzes data characteristics and research questions to recommend
    the most appropriate statistical test.
    """

    def __init__(self):
        """Initialize the test selector with test database"""
        self.test_database = self._build_test_database()
        self.assumption_checkers = self._build_assumption_checkers()

    def _build_test_database(self) -> Dict[str, Dict]:
        """Build comprehensive database of statistical tests and their requirements"""
        return {
            # T-tests
            "one_sample_t": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "normality": True,
                    "continuous_data": True,
                    "min_sample_size": 20
                },
                "alternative": "wilcoxon_signed_rank",
                "description": "Compare sample mean to known population mean"
            },
            "independent_t": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "normality": True,
                    "homogeneity": True,
                    "continuous_data": True,
                    "independent_groups": True,
                    "num_groups": 2
                },
                "alternative": "mann_whitney_u",
                "description": "Compare means of two independent groups"
            },
            "paired_t": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "normality": True,
                    "continuous_data": True,
                    "paired_data": True,
                    "num_groups": 2
                },
                "alternative": "wilcoxon_signed_rank",
                "description": "Compare paired measurements"
            },
            "welch_t": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "normality": True,
                    "continuous_data": True,
                    "independent_groups": True,
                    "num_groups": 2
                },
                "alternative": "mann_whitney_u",
                "description": "Compare means when variances are unequal"
            },

            # ANOVA tests
            "one_way_anova": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "normality": True,
                    "homogeneity": True,
                    "continuous_data": True,
                    "independent_groups": True,
                    "min_groups": 3
                },
                "alternative": "kruskal_wallis",
                "description": "Compare means of three or more groups"
            },
            "two_way_anova": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "normality": True,
                    "homogeneity": True,
                    "continuous_data": True,
                    "two_factors": True
                },
                "alternative": "aligned_rank_transform",
                "description": "Analyze effects of two factors"
            },
            "repeated_measures_anova": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "normality": True,
                    "sphericity": True,
                    "repeated_measures": True,
                    "min_timepoints": 3
                },
                "alternative": "friedman",
                "description": "Compare repeated measurements"
            },
            "manova": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "multivariate_normality": True,
                    "homogeneity_covariance": True,
                    "multiple_dvs": True
                },
                "alternative": "permutation_manova",
                "description": "Analyze multiple dependent variables"
            },

            # Non-parametric tests
            "mann_whitney_u": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "independent_groups": True,
                    "ordinal_or_continuous": True,
                    "num_groups": 2
                },
                "alternative": None,
                "description": "Non-parametric alternative to independent t-test"
            },
            "wilcoxon_signed_rank": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "paired_data": True,
                    "ordinal_or_continuous": True
                },
                "alternative": None,
                "description": "Non-parametric alternative to paired t-test"
            },
            "kruskal_wallis": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "independent_groups": True,
                    "ordinal_or_continuous": True,
                    "min_groups": 3
                },
                "alternative": None,
                "description": "Non-parametric alternative to one-way ANOVA"
            },
            "friedman": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "repeated_measures": True,
                    "ordinal_or_continuous": True,
                    "min_timepoints": 3
                },
                "alternative": None,
                "description": "Non-parametric alternative to repeated measures ANOVA"
            },

            # Correlation tests
            "pearson": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.CORRELATION,
                "requirements": {
                    "bivariate_normality": True,
                    "continuous_data": True,
                    "linear_relationship": True
                },
                "alternative": "spearman",
                "description": "Linear correlation between continuous variables"
            },
            "spearman": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.CORRELATION,
                "requirements": {
                    "ordinal_or_continuous": True,
                    "monotonic_relationship": True
                },
                "alternative": "kendall",
                "description": "Monotonic correlation, robust to outliers"
            },
            "kendall": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.CORRELATION,
                "requirements": {
                    "ordinal_or_continuous": True,
                    "small_sample": True
                },
                "alternative": None,
                "description": "Rank correlation for small samples"
            },

            # Categorical tests
            "chi_square_independence": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.ASSOCIATION,
                "requirements": {
                    "categorical_data": True,
                    "expected_freq_5": True,
                    "independent_observations": True
                },
                "alternative": "fisher_exact",
                "description": "Test association between categorical variables"
            },
            "fisher_exact": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.ASSOCIATION,
                "requirements": {
                    "categorical_data": True,
                    "two_by_two_table": True
                },
                "alternative": None,
                "description": "Exact test for 2x2 contingency tables"
            },
            "mcnemar": {
                "category": TestCategory.NON_PARAMETRIC,
                "question": ResearchQuestion.DIFFERENCE,
                "requirements": {
                    "paired_binary": True,
                    "two_by_two_table": True
                },
                "alternative": None,
                "description": "Test for paired binary data"
            },

            # Regression tests
            "linear_regression": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.PREDICTION,
                "requirements": {
                    "normality_residuals": True,
                    "homoscedasticity": True,
                    "linear_relationship": True,
                    "continuous_outcome": True
                },
                "alternative": "robust_regression",
                "description": "Predict continuous outcome from predictors"
            },
            "logistic_regression": {
                "category": TestCategory.PARAMETRIC,
                "question": ResearchQuestion.PREDICTION,
                "requirements": {
                    "binary_outcome": True,
                    "independence": True,
                    "large_sample": True
                },
                "alternative": "probit_regression",
                "description": "Predict binary outcome from predictors"
            }
        }

    def _build_assumption_checkers(self) -> Dict[str, callable]:
        """Build assumption checking functions"""
        return {
            "normality": self._check_normality,
            "homogeneity": self._check_homogeneity,
            "independence": self._check_independence,
            "linearity": self._check_linearity,
            "monotonicity": self._check_monotonicity,
            "sphericity": self._check_sphericity
        }

    def analyze_data(self, data: Union[np.ndarray, List[np.ndarray]],
                     variable_names: Optional[List[str]] = None) -> DataProfile:
        """
        Comprehensive analysis of data characteristics.

        Args:
            data: Single array or list of arrays
            variable_names: Optional names for variables

        Returns:
            DataProfile with complete data characteristics
        """
        # Handle single array vs multiple arrays
        if isinstance(data, np.ndarray):
            data_list = [data]
        else:
            data_list = [np.array(d) for d in data]

        profile = DataProfile(
            sample_size=len(data_list[0]),
            num_variables=len(data_list),
            variable_types={},
            normality={},
            outliers={},
            homogeneity_of_variance=None,
            linearity=None,
            monotonicity=None,
            independence=None,
            num_groups=None,
            group_sizes=None,
            balanced_groups=None,
            paired_data=False,
            repeated_measures=False,
            missing_data={}
        )

        # Analyze each variable
        for i, arr in enumerate(data_list):
            var_name = variable_names[i] if variable_names else f"var_{i}"

            # Determine variable type
            profile.variable_types[var_name] = self._infer_variable_type(arr)

            # Check normality
            profile.normality[var_name] = self._check_normality(arr)

            # Check outliers
            profile.outliers[var_name] = self._check_outliers(arr)

            # Check missing data
            if hasattr(arr, 'mask'):  # Masked array
                profile.missing_data[var_name] = np.sum(arr.mask) / len(arr) * 100
            else:
                profile.missing_data[var_name] = np.sum(np.isnan(arr)) / len(arr) * 100

        # Check relationships if multiple variables
        if len(data_list) == 2:
            profile.linearity = self._check_linearity(data_list[0], data_list[1])
            profile.monotonicity = self._check_monotonicity(data_list[0], data_list[1])

        # Check homogeneity if multiple groups
        if len(data_list) > 1:
            profile.homogeneity_of_variance = self._check_homogeneity(*data_list)

        return profile

    def recommend_test(self, data_profile: DataProfile,
                       research_question: ResearchQuestion,
                       additional_context: Optional[Dict] = None) -> TestRecommendation:
        """
        Recommend the most appropriate statistical test.

        Args:
            data_profile: Profile of data characteristics
            research_question: Type of research question
            additional_context: Additional information (e.g., paired data, repeated measures)

        Returns:
            TestRecommendation with detailed guidance
        """
        context = additional_context or {}

        # Filter tests by research question
        candidate_tests = {
            name: info for name, info in self.test_database.items()
            if info["question"] == research_question
        }

        # Score each candidate test
        test_scores = {}
        test_reasoning = {}
        test_violations = {}

        for test_name, test_info in candidate_tests.items():
            score, reasoning, violations = self._score_test(
                test_info, data_profile, context
            )
            test_scores[test_name] = score
            test_reasoning[test_name] = reasoning
            test_violations[test_name] = violations

        # Select best test
        if not test_scores:
            return self._create_fallback_recommendation(research_question)

        best_test = max(test_scores, key=test_scores.get)
        best_score = test_scores[best_test]

        # Get alternatives
        alternatives = sorted(
            [t for t in test_scores if t != best_test],
            key=test_scores.get,
            reverse=True
        )[:3]

        # Create recommendation
        recommendation = self._create_recommendation(
            best_test,
            best_score,
            test_reasoning[best_test],
            test_violations[best_test],
            alternatives,
            data_profile
        )

        return recommendation

    def _score_test(self, test_info: Dict, data_profile: DataProfile,
                   context: Dict) -> Tuple[float, List[str], List[str]]:
        """Score how appropriate a test is for the data"""
        score = 1.0
        reasoning = []
        violations = []

        requirements = test_info.get("requirements", {})

        # Check each requirement
        if "normality" in requirements and requirements["normality"]:
            if not all(data_profile.normality.values()):
                score *= 0.3
                violations.append("Normality assumption violated")
            else:
                reasoning.append("Data is normally distributed")

        if "homogeneity" in requirements and requirements["homogeneity"]:
            if data_profile.homogeneity_of_variance is False:
                score *= 0.5
                violations.append("Homogeneity of variance violated")
            else:
                reasoning.append("Variances are homogeneous")

        if "continuous_data" in requirements:
            continuous_vars = sum(1 for t in data_profile.variable_types.values()
                                if t == DataType.CONTINUOUS)
            if continuous_vars == 0:
                score *= 0.1
                violations.append("Requires continuous data")
            else:
                reasoning.append("Data is continuous")

        # Check sample size
        if "min_sample_size" in requirements:
            if data_profile.sample_size < requirements["min_sample_size"]:
                score *= 0.7
                violations.append(f"Sample size too small (n={data_profile.sample_size})")

        # Bonus for robustness
        if test_info["category"] == TestCategory.NON_PARAMETRIC:
            if any(data_profile.outliers.values()):
                score *= 1.2
                reasoning.append("Non-parametric test robust to outliers")

        return score, reasoning, violations

    def _create_recommendation(self, test_name: str, confidence: float,
                              reasoning: List[str], violations: List[str],
                              alternatives: List[str],
                              data_profile: DataProfile) -> TestRecommendation:
        """Create detailed test recommendation"""
        test_info = self.test_database[test_name]

        # Generate interpretation example
        example = self._generate_example_interpretation(test_name)

        # Generate warnings
        warnings = self._generate_warnings(test_name, data_profile, violations)

        # Prerequisites
        prerequisites = self._generate_prerequisites(test_name)

        # Interpretation notes
        interpretation_notes = self._generate_interpretation_notes(test_name)

        return TestRecommendation(
            primary_test=test_name,
            test_category=test_info["category"],
            confidence_score=confidence,
            alternatives=alternatives,
            reasoning=reasoning,
            assumptions_met={},
            assumptions_violated=violations,
            warnings=warnings,
            prerequisites=prerequisites,
            interpretation_notes=interpretation_notes,
            when_to_use=test_info["description"],
            when_not_to_use=self._generate_when_not_to_use(test_name),
            example_interpretation=example
        )

    def _check_normality(self, data: np.ndarray) -> bool:
        """Check if data is normally distributed"""
        if len(data) < 3:
            return False

        # Shapiro-Wilk test
        if len(data) <= 5000:
            _, p_value = stats.shapiro(data)
            return p_value > 0.05

        # Kolmogorov-Smirnov for larger samples
        _, p_value = stats.kstest(data, 'norm', args=(np.mean(data), np.std(data)))
        return p_value > 0.05

    def _check_homogeneity(self, *groups) -> bool:
        """Check homogeneity of variances across groups"""
        if len(groups) < 2:
            return True

        # Levene's test
        _, p_value = stats.levene(*groups)
        return p_value > 0.05

    def _check_independence(self, data1: np.ndarray, data2: np.ndarray) -> bool:
        """Check if observations are independent"""
        # This is often a design consideration, but we can check for autocorrelation
        # For now, return True as default
        return True

    def _check_linearity(self, x: np.ndarray, y: np.ndarray) -> float:
        """Check linearity of relationship (returns R-squared)"""
        if len(x) != len(y):
            return 0.0

        # Calculate correlation coefficient
        r, _ = stats.pearsonr(x, y)
        return r ** 2

    def _check_monotonicity(self, x: np.ndarray, y: np.ndarray) -> float:
        """Check monotonicity of relationship"""
        if len(x) != len(y):
            return 0.0

        # Use Spearman correlation as measure of monotonicity
        rho, _ = stats.spearmanr(x, y)
        return abs(rho)

    def _check_sphericity(self, data: np.ndarray) -> bool:
        """Check sphericity assumption for repeated measures"""
        # Mauchly's test would go here
        # For now, return True
        return True

    def _check_outliers(self, data: np.ndarray) -> bool:
        """Check for presence of outliers"""
        Q1 = np.percentile(data, 25)
        Q3 = np.percentile(data, 75)
        IQR = Q3 - Q1

        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR

        outliers = np.sum((data < lower_bound) | (data > upper_bound))
        return outliers > 0

    def _infer_variable_type(self, data: np.ndarray) -> DataType:
        """Infer the type of variable from data"""
        unique_values = len(np.unique(data))
        n = len(data)

        # Binary
        if unique_values == 2:
            return DataType.BINARY

        # Likely ordinal (few unique values)
        if unique_values < 10 and unique_values < n / 3:
            return DataType.ORDINAL

        # Likely continuous
        if unique_values > n / 2:
            return DataType.CONTINUOUS

        # Count data (all non-negative integers)
        if np.all(data >= 0) and np.all(data == data.astype(int)):
            return DataType.COUNT

        return DataType.ORDINAL  # Default

    def _generate_example_interpretation(self, test_name: str) -> str:
        """Generate example interpretation for test"""
        examples = {
            "independent_t": "If p < 0.05: 'There is a statistically significant difference between the two groups (t = 2.45, p = 0.023)'",
            "pearson": "If r = 0.65, p < 0.01: 'There is a strong positive correlation between the variables (r = 0.65, p < 0.01)'",
            "chi_square_independence": "If p < 0.05: 'There is a significant association between the categorical variables (χ² = 8.34, p = 0.015)'",
            "one_way_anova": "If p < 0.05: 'There are significant differences among the groups (F = 4.23, p = 0.018)'"
        }
        return examples.get(test_name, "Interpret based on p-value and effect size")

    def _generate_warnings(self, test_name: str, data_profile: DataProfile,
                          violations: List[str]) -> List[str]:
        """Generate appropriate warnings"""
        warnings = []

        # Add violation warnings
        if violations:
            warnings.append(f"Assumptions violated: {', '.join(violations)}")

        # Sample size warnings
        if data_profile.sample_size < 30:
            warnings.append("Small sample size may affect test power")

        # Outlier warnings
        if any(data_profile.outliers.values()):
            warnings.append("Outliers present - consider robust alternatives")

        # Missing data warnings
        if any(v > 5 for v in data_profile.missing_data.values()):
            warnings.append("Missing data detected - consider imputation")

        return warnings

    def _generate_prerequisites(self, test_name: str) -> List[str]:
        """Generate list of prerequisites for test"""
        prerequisites_map = {
            "independent_t": ["Independent groups", "Continuous outcome variable", "Random sampling"],
            "paired_t": ["Paired observations", "Continuous outcome variable"],
            "one_way_anova": ["Three or more independent groups", "Continuous outcome", "Random assignment"],
            "pearson": ["Continuous variables", "Linear relationship", "No extreme outliers"],
            "chi_square_independence": ["Categorical variables", "Independent observations", "Expected frequencies ≥ 5"]
        }
        return prerequisites_map.get(test_name, ["Check test assumptions"])

    def _generate_interpretation_notes(self, test_name: str) -> List[str]:
        """Generate interpretation notes for test"""
        notes_map = {
            "independent_t": [
                "Report means and standard deviations for each group",
                "Include effect size (Cohen's d)",
                "Consider confidence interval for mean difference"
            ],
            "pearson": [
                "Report correlation coefficient and p-value",
                "Include confidence interval for correlation",
                "Consider coefficient of determination (r²)"
            ],
            "one_way_anova": [
                "If significant, perform post-hoc tests",
                "Report effect size (eta-squared)",
                "Consider multiple comparison corrections"
            ]
        }
        return notes_map.get(test_name, ["Report test statistic and p-value"])

    def _generate_when_not_to_use(self, test_name: str) -> str:
        """Generate description of when NOT to use the test"""
        when_not_map = {
            "independent_t": "When groups are paired or data is not continuous",
            "pearson": "When relationship is non-linear or data has outliers",
            "chi_square_independence": "When expected frequencies are < 5 or data is paired",
            "one_way_anova": "When data is not continuous or groups are not independent"
        }
        return when_not_map.get(test_name, "When assumptions are severely violated")

    def _create_fallback_recommendation(self, research_question: ResearchQuestion) -> TestRecommendation:
        """Create fallback recommendation when no suitable test found"""
        return TestRecommendation(
            primary_test="consult_statistician",
            test_category=TestCategory.NON_PARAMETRIC,
            confidence_score=0.0,
            alternatives=[],
            reasoning=["No suitable test found for your data"],
            assumptions_met={},
            assumptions_violated=["Multiple assumption violations"],
            warnings=["Consider consulting a statistician"],
            prerequisites=[],
            interpretation_notes=[],
            when_to_use="When standard tests don't apply",
            when_not_to_use="N/A",
            example_interpretation="Requires specialized analysis"
        )


def generate_user_guidance(recommendation: TestRecommendation) -> str:
    """Generate comprehensive user guidance based on test recommendation"""
    guidance = f"""
╔════════════════════════════════════════════════════════════════╗
║           STATISTICAL TEST RECOMMENDATION GUIDE               ║
╚════════════════════════════════════════════════════════════════╝

📊 RECOMMENDED TEST: {recommendation.primary_test.upper()}
   Category: {recommendation.test_category.value}
   Confidence: {recommendation.confidence_score:.1%}

📋 WHEN TO USE:
   {recommendation.when_to_use}

⚠️ WHEN NOT TO USE:
   {recommendation.when_not_to_use}

✅ REASONING:
"""
    for reason in recommendation.reasoning:
        guidance += f"   • {reason}\n"

    if recommendation.assumptions_violated:
        guidance += "\n❌ ASSUMPTIONS VIOLATED:\n"
        for violation in recommendation.assumptions_violated:
            guidance += f"   • {violation}\n"

    if recommendation.warnings:
        guidance += "\n⚠️ WARNINGS:\n"
        for warning in recommendation.warnings:
            guidance += f"   • {warning}\n"

    if recommendation.alternatives:
        guidance += f"\n🔄 ALTERNATIVE TESTS:\n"
        for alt in recommendation.alternatives:
            guidance += f"   • {alt}\n"

    guidance += f"\n📝 PREREQUISITES:\n"
    for prereq in recommendation.prerequisites:
        guidance += f"   • {prereq}\n"

    guidance += f"\n💡 INTERPRETATION NOTES:\n"
    for note in recommendation.interpretation_notes:
        guidance += f"   • {note}\n"

    guidance += f"\n📖 EXAMPLE INTERPRETATION:\n   {recommendation.example_interpretation}\n"

    guidance += """
═══════════════════════════════════════════════════════════════════
Remember: Statistical significance ≠ Practical significance
Always consider effect sizes and confidence intervals!
═══════════════════════════════════════════════════════════════════
"""

    return guidance