"""
Analysis Plan Generator

Generates structured, step-by-step analysis plans from parsed queries.
Integrates with StickForStats test recommender and assumption services.

Features:
- Automatic test selection based on query intent
- Assumption check sequencing
- Alternative analysis suggestions
- Decision tree traversal
- Complete workflow generation

Author: StickForStats Team
Created: December 27, 2025
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

from .query_parser import (
    ParsedQuery,
    QueryIntent,
    AnalysisType,
    ExtractedVariable,
    QueryStep
)

logger = logging.getLogger(__name__)


class StepStatus(Enum):
    """Status of an analysis step."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    BLOCKED = "blocked"


class AssumptionCheck(Enum):
    """Types of assumption checks."""
    NORMALITY = "normality"
    HOMOGENEITY = "homogeneity_of_variance"
    INDEPENDENCE = "independence"
    LINEARITY = "linearity"
    HOMOSCEDASTICITY = "homoscedasticity"
    MULTICOLLINEARITY = "multicollinearity"
    OUTLIERS = "outliers"
    SAMPLE_SIZE = "sample_size"
    PARALLEL_TRENDS = "parallel_trends"


@dataclass
class AssumptionCheckStep:
    """Represents an assumption check in the plan."""
    check_type: AssumptionCheck
    description: str
    test_name: str
    critical: bool = True
    alternative_if_violated: Optional[str] = None
    threshold: Optional[str] = None


@dataclass
class AnalysisStep:
    """Represents a single step in the analysis plan."""
    step_id: str
    step_number: int
    title: str
    description: str
    analysis_type: str
    method: str
    assumption_checks: List[AssumptionCheckStep] = field(default_factory=list)
    required_variables: List[str] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    expected_output: List[str] = field(default_factory=list)
    alternatives: List[Dict[str, str]] = field(default_factory=list)
    depends_on: List[str] = field(default_factory=list)
    status: StepStatus = StepStatus.PENDING
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "step_id": self.step_id,
            "step_number": self.step_number,
            "title": self.title,
            "description": self.description,
            "analysis_type": self.analysis_type,
            "method": self.method,
            "assumption_checks": [
                {
                    "check_type": ac.check_type.value,
                    "description": ac.description,
                    "test_name": ac.test_name,
                    "critical": ac.critical,
                    "alternative_if_violated": ac.alternative_if_violated,
                    "threshold": ac.threshold
                }
                for ac in self.assumption_checks
            ],
            "required_variables": self.required_variables,
            "parameters": self.parameters,
            "expected_output": self.expected_output,
            "alternatives": self.alternatives,
            "depends_on": self.depends_on,
            "status": self.status.value,
            "notes": self.notes
        }


@dataclass
class AnalysisPlan:
    """Complete analysis plan with all steps."""
    plan_id: str
    created_at: datetime
    original_query: str
    research_question: Optional[str]
    steps: List[AnalysisStep]
    summary: str
    total_estimated_time: str
    data_requirements: List[str]
    warnings: List[str]
    recommendations: List[str]
    confidence_score: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "plan_id": self.plan_id,
            "created_at": self.created_at.isoformat(),
            "original_query": self.original_query,
            "research_question": self.research_question,
            "steps": [s.to_dict() for s in self.steps],
            "summary": self.summary,
            "total_estimated_time": self.total_estimated_time,
            "data_requirements": self.data_requirements,
            "warnings": self.warnings,
            "recommendations": self.recommendations,
            "confidence_score": self.confidence_score,
            "step_count": len(self.steps)
        }


class AnalysisPlanGenerator:
    """
    Generate structured analysis plans from parsed queries.

    Features:
    - Intent-based test selection
    - Assumption check sequencing
    - Alternative suggestions
    - Complete workflow generation
    """

    # Test recommendations by intent and analysis type
    TEST_RECOMMENDATIONS = {
        (QueryIntent.COMPARISON, AnalysisType.T_TEST): {
            "method": "Independent Samples t-test",
            "assumptions": [AssumptionCheck.NORMALITY, AssumptionCheck.HOMOGENEITY, AssumptionCheck.INDEPENDENCE],
            "alternatives": [
                {"condition": "Non-normal data", "method": "Mann-Whitney U Test"},
                {"condition": "Unequal variances", "method": "Welch's t-test"},
            ],
            "output": ["t-statistic", "p-value", "Cohen's d", "95% CI for difference"]
        },
        (QueryIntent.COMPARISON, AnalysisType.ANOVA): {
            "method": "One-Way ANOVA",
            "assumptions": [AssumptionCheck.NORMALITY, AssumptionCheck.HOMOGENEITY, AssumptionCheck.INDEPENDENCE],
            "alternatives": [
                {"condition": "Non-normal data", "method": "Kruskal-Wallis H Test"},
                {"condition": "Unequal variances", "method": "Welch's ANOVA"},
            ],
            "output": ["F-statistic", "p-value", "eta-squared", "Post-hoc comparisons"]
        },
        (QueryIntent.RELATIONSHIP, AnalysisType.CORRELATION): {
            "method": "Pearson Correlation",
            "assumptions": [AssumptionCheck.NORMALITY, AssumptionCheck.LINEARITY, AssumptionCheck.OUTLIERS],
            "alternatives": [
                {"condition": "Non-normal or ordinal data", "method": "Spearman Correlation"},
                {"condition": "Outliers present", "method": "Robust correlation (percentage bend)"},
            ],
            "output": ["r coefficient", "p-value", "95% CI", "R-squared"]
        },
        (QueryIntent.PREDICTION, AnalysisType.REGRESSION): {
            "method": "Multiple Linear Regression",
            "assumptions": [
                AssumptionCheck.LINEARITY, AssumptionCheck.NORMALITY,
                AssumptionCheck.HOMOSCEDASTICITY, AssumptionCheck.MULTICOLLINEARITY
            ],
            "alternatives": [
                {"condition": "Binary outcome", "method": "Logistic Regression"},
                {"condition": "Non-linear relationship", "method": "Polynomial Regression"},
            ],
            "output": ["R-squared", "Adjusted R-squared", "Coefficients", "F-test", "Residual plots"]
        },
        (QueryIntent.COMPARISON, AnalysisType.MIXED_MODEL): {
            "method": "Linear Mixed Model",
            "assumptions": [AssumptionCheck.NORMALITY, AssumptionCheck.INDEPENDENCE],
            "alternatives": [
                {"condition": "Non-normal residuals", "method": "GLMM"},
            ],
            "output": ["Fixed effects", "Random effects", "ICC", "Model comparison"]
        },
        (QueryIntent.COMPARISON, AnalysisType.CAUSAL): {
            "method": "Propensity Score Matching",
            "assumptions": [AssumptionCheck.INDEPENDENCE, AssumptionCheck.SAMPLE_SIZE],
            "alternatives": [
                {"condition": "Small sample", "method": "Exact Matching"},
                {"condition": "Many confounders", "method": "Inverse Probability Weighting"},
            ],
            "output": ["ATE", "ATT", "Balance diagnostics", "Sensitivity analysis"]
        },
        (QueryIntent.RELATIONSHIP, AnalysisType.MEDIATION): {
            "method": "Baron-Kenny Mediation",
            "assumptions": [AssumptionCheck.LINEARITY, AssumptionCheck.NORMALITY],
            "alternatives": [
                {"condition": "Binary mediator/outcome", "method": "Causal Mediation Analysis"},
            ],
            "output": ["Direct effect", "Indirect effect", "Total effect", "Sobel test", "Bootstrap CI"]
        },
        (QueryIntent.COMPARISON, AnalysisType.DID): {
            "method": "Difference-in-Differences",
            "assumptions": [AssumptionCheck.PARALLEL_TRENDS, AssumptionCheck.INDEPENDENCE],
            "alternatives": [
                {"condition": "Staggered treatment", "method": "Staggered DiD (Callaway-Sant'Anna)"},
            ],
            "output": ["DiD estimate", "Standard error", "Parallel trends test", "Event study plot"]
        },
    }

    # Assumption check details
    ASSUMPTION_DETAILS = {
        AssumptionCheck.NORMALITY: {
            "description": "Test if the data follows a normal distribution",
            "test_name": "Shapiro-Wilk test",
            "threshold": "p > 0.05 indicates normality",
            "alternative": "Use non-parametric alternative"
        },
        AssumptionCheck.HOMOGENEITY: {
            "description": "Test if groups have equal variances",
            "test_name": "Levene's test",
            "threshold": "p > 0.05 indicates equal variances",
            "alternative": "Use Welch's correction"
        },
        AssumptionCheck.INDEPENDENCE: {
            "description": "Verify observations are independent",
            "test_name": "Study design review",
            "threshold": "Based on data collection",
            "alternative": "Use mixed models for nested data"
        },
        AssumptionCheck.LINEARITY: {
            "description": "Check for linear relationship between variables",
            "test_name": "Scatter plot / Residual plot",
            "threshold": "Visual inspection",
            "alternative": "Consider non-linear transformation"
        },
        AssumptionCheck.HOMOSCEDASTICITY: {
            "description": "Check for constant variance of residuals",
            "test_name": "Breusch-Pagan test",
            "threshold": "p > 0.05 indicates homoscedasticity",
            "alternative": "Use robust standard errors"
        },
        AssumptionCheck.MULTICOLLINEARITY: {
            "description": "Check for high correlation among predictors",
            "test_name": "VIF (Variance Inflation Factor)",
            "threshold": "VIF < 5 (or < 10)",
            "alternative": "Remove or combine correlated predictors"
        },
        AssumptionCheck.OUTLIERS: {
            "description": "Identify extreme values",
            "test_name": "IQR method / Z-scores",
            "threshold": "> 1.5 IQR or |Z| > 3",
            "alternative": "Use robust methods or remove with justification"
        },
        AssumptionCheck.SAMPLE_SIZE: {
            "description": "Check if sample size is adequate",
            "test_name": "Power analysis",
            "threshold": "n per group >= 20 recommended",
            "alternative": "Consider effect size interpretation"
        },
        AssumptionCheck.PARALLEL_TRENDS: {
            "description": "Verify pre-treatment trends are parallel",
            "test_name": "Pre-trend test / Event study",
            "threshold": "Non-significant pre-treatment effects",
            "alternative": "Consider different control group"
        },
    }

    def __init__(self):
        """Initialize the plan generator."""
        self._plan_counter = 0

    def generate_plan(
        self,
        parsed_query: ParsedQuery,
        data_context: Optional[Dict[str, Any]] = None
    ) -> AnalysisPlan:
        """
        Generate a complete analysis plan from a parsed query.

        Args:
            parsed_query: The parsed query object
            data_context: Optional context about the user's data

        Returns:
            AnalysisPlan with all steps
        """
        self._plan_counter += 1
        plan_id = f"plan_{self._plan_counter:04d}"

        steps = []
        warnings = []
        recommendations = []
        data_requirements = []

        # Step 1: Always start with data description
        steps.append(self._create_descriptive_step(parsed_query, data_context))

        # Step 2: Generate analysis steps based on intent
        if parsed_query.is_multi_step:
            # Handle multi-step queries
            for query_step in parsed_query.steps:
                step = self._create_step_from_query_step(
                    query_step, parsed_query, data_context, len(steps) + 1
                )
                if step:
                    steps.append(step)
        else:
            # Single analysis
            main_step = self._create_main_analysis_step(parsed_query, data_context, 2)
            if main_step:
                steps.append(main_step)

        # Add effect size and reporting steps
        steps.append(self._create_effect_size_step(len(steps) + 1))
        steps.append(self._create_reporting_step(len(steps) + 1))

        # Generate warnings
        warnings = self._generate_warnings(parsed_query, data_context)

        # Generate recommendations
        recommendations = self._generate_recommendations(parsed_query, steps)

        # Collect data requirements
        data_requirements = self._collect_data_requirements(parsed_query, steps)

        # Generate summary
        summary = self._generate_summary(parsed_query, steps)

        return AnalysisPlan(
            plan_id=plan_id,
            created_at=datetime.now(),
            original_query=parsed_query.original_query,
            research_question=parsed_query.research_question,
            steps=steps,
            summary=summary,
            total_estimated_time=self._estimate_time(steps),
            data_requirements=data_requirements,
            warnings=warnings,
            recommendations=recommendations,
            confidence_score=parsed_query.confidence_score
        )

    def _create_descriptive_step(
        self,
        parsed_query: ParsedQuery,
        data_context: Optional[Dict[str, Any]]
    ) -> AnalysisStep:
        """Create the initial descriptive statistics step."""
        variables = [v.name for v in parsed_query.variables]

        return AnalysisStep(
            step_id="step_001",
            step_number=1,
            title="Descriptive Statistics & Data Exploration",
            description="Examine data distributions, check for missing values, and compute summary statistics",
            analysis_type="descriptive",
            method="Summary statistics and visualizations",
            assumption_checks=[
                AssumptionCheckStep(
                    check_type=AssumptionCheck.OUTLIERS,
                    description="Identify potential outliers",
                    test_name="IQR method and box plots",
                    critical=False
                ),
                AssumptionCheckStep(
                    check_type=AssumptionCheck.SAMPLE_SIZE,
                    description="Check adequate sample size",
                    test_name="Count observations",
                    critical=True
                )
            ],
            required_variables=variables if variables else ["All relevant variables"],
            parameters={"include_visualizations": True},
            expected_output=[
                "Mean, SD, median, range for continuous variables",
                "Frequencies and percentages for categorical variables",
                "Missing data summary",
                "Distribution plots (histograms, box plots)"
            ],
            alternatives=[],
            depends_on=[],
            status=StepStatus.PENDING,
            notes="Always start with understanding your data before formal analysis"
        )

    def _create_main_analysis_step(
        self,
        parsed_query: ParsedQuery,
        data_context: Optional[Dict[str, Any]],
        step_number: int
    ) -> Optional[AnalysisStep]:
        """Create the main analysis step based on query intent."""
        intent = parsed_query.primary_intent
        analysis_type = parsed_query.analysis_types[0] if parsed_query.analysis_types else None

        # Find matching recommendation
        recommendation = None
        for (rec_intent, rec_type), rec_details in self.TEST_RECOMMENDATIONS.items():
            if rec_intent == intent and rec_type == analysis_type:
                recommendation = rec_details
                break

        # Fallback to intent-only match
        if not recommendation:
            for (rec_intent, rec_type), rec_details in self.TEST_RECOMMENDATIONS.items():
                if rec_intent == intent:
                    recommendation = rec_details
                    analysis_type = rec_type
                    break

        if not recommendation:
            # Generic step if no match
            return self._create_generic_step(parsed_query, step_number)

        # Build assumption checks
        assumption_checks = []
        for check_type in recommendation.get("assumptions", []):
            details = self.ASSUMPTION_DETAILS.get(check_type, {})
            assumption_checks.append(AssumptionCheckStep(
                check_type=check_type,
                description=details.get("description", str(check_type.value)),
                test_name=details.get("test_name", "Manual check"),
                critical=True,
                alternative_if_violated=details.get("alternative"),
                threshold=details.get("threshold")
            ))

        # Build alternatives
        alternatives = recommendation.get("alternatives", [])

        # Extract variables
        dv = next((v.name for v in parsed_query.variables if v.role == "dependent"), None)
        iv = next((v.name for v in parsed_query.variables if v.role in ["independent", "grouping"]), None)
        required_vars = [v for v in [dv, iv] if v]
        if not required_vars:
            required_vars = [v.name for v in parsed_query.variables]

        return AnalysisStep(
            step_id=f"step_{step_number:03d}",
            step_number=step_number,
            title=f"Main Analysis: {recommendation['method']}",
            description=f"Conduct {recommendation['method']} to address your research question",
            analysis_type=analysis_type.value if analysis_type else "statistical_test",
            method=recommendation["method"],
            assumption_checks=assumption_checks,
            required_variables=required_vars,
            parameters={
                "alpha": parsed_query.alpha_level,
                "groups": parsed_query.comparison_groups
            },
            expected_output=recommendation.get("output", ["Test statistic", "p-value"]),
            alternatives=alternatives,
            depends_on=["step_001"],
            status=StepStatus.PENDING,
            notes=""
        )

    def _create_step_from_query_step(
        self,
        query_step: QueryStep,
        parsed_query: ParsedQuery,
        data_context: Optional[Dict[str, Any]],
        step_number: int
    ) -> Optional[AnalysisStep]:
        """Create an analysis step from a query step."""
        intent = query_step.intent
        analysis_type = query_step.analysis_type

        # Similar logic to main analysis step
        recommendation = None
        for (rec_intent, rec_type), rec_details in self.TEST_RECOMMENDATIONS.items():
            if rec_intent == intent and rec_type == analysis_type:
                recommendation = rec_details
                break

        if not recommendation:
            for (rec_intent, _), rec_details in self.TEST_RECOMMENDATIONS.items():
                if rec_intent == intent:
                    recommendation = rec_details
                    break

        if not recommendation:
            return AnalysisStep(
                step_id=f"step_{step_number:03d}",
                step_number=step_number,
                title=f"Step {query_step.step_number}: {query_step.description[:50]}...",
                description=query_step.description,
                analysis_type=analysis_type.value if analysis_type else "analysis",
                method="To be determined based on data",
                assumption_checks=[],
                required_variables=[v.name for v in query_step.variables],
                parameters={},
                expected_output=["Results"],
                alternatives=[],
                depends_on=[f"step_{d:03d}" for d in query_step.depends_on] if query_step.depends_on else [],
                status=StepStatus.PENDING,
                notes="Requires further specification"
            )

        assumption_checks = []
        for check_type in recommendation.get("assumptions", []):
            details = self.ASSUMPTION_DETAILS.get(check_type, {})
            assumption_checks.append(AssumptionCheckStep(
                check_type=check_type,
                description=details.get("description", str(check_type.value)),
                test_name=details.get("test_name", "Manual check"),
                critical=True,
                alternative_if_violated=details.get("alternative"),
                threshold=details.get("threshold")
            ))

        return AnalysisStep(
            step_id=f"step_{step_number:03d}",
            step_number=step_number,
            title=f"Step {query_step.step_number}: {recommendation['method']}",
            description=query_step.description,
            analysis_type=analysis_type.value if analysis_type else "analysis",
            method=recommendation["method"],
            assumption_checks=assumption_checks,
            required_variables=[v.name for v in query_step.variables],
            parameters={"alpha": parsed_query.alpha_level},
            expected_output=recommendation.get("output", ["Results"]),
            alternatives=recommendation.get("alternatives", []),
            depends_on=[f"step_{d:03d}" for d in query_step.depends_on] if query_step.depends_on else [],
            status=StepStatus.PENDING,
            notes=""
        )

    def _create_generic_step(
        self,
        parsed_query: ParsedQuery,
        step_number: int
    ) -> AnalysisStep:
        """Create a generic analysis step when no specific match found."""
        return AnalysisStep(
            step_id=f"step_{step_number:03d}",
            step_number=step_number,
            title="Statistical Analysis",
            description="Conduct appropriate statistical analysis based on your data",
            analysis_type="to_be_determined",
            method="Requires further specification",
            assumption_checks=[
                AssumptionCheckStep(
                    check_type=AssumptionCheck.NORMALITY,
                    description="Check data distribution",
                    test_name="Shapiro-Wilk test",
                    critical=True
                )
            ],
            required_variables=[v.name for v in parsed_query.variables],
            parameters={"alpha": parsed_query.alpha_level},
            expected_output=["Test results", "Effect size", "Confidence intervals"],
            alternatives=[],
            depends_on=["step_001"],
            status=StepStatus.PENDING,
            notes="Please provide more details about your research question for specific recommendations"
        )

    def _create_effect_size_step(self, step_number: int) -> AnalysisStep:
        """Create effect size calculation step."""
        return AnalysisStep(
            step_id=f"step_{step_number:03d}",
            step_number=step_number,
            title="Effect Size Calculation",
            description="Calculate and interpret effect sizes for practical significance",
            analysis_type="effect_size",
            method="Appropriate effect size measure",
            assumption_checks=[],
            required_variables=["Main analysis results"],
            parameters={},
            expected_output=[
                "Effect size value (Cohen's d, eta-squared, r, etc.)",
                "Confidence interval for effect size",
                "Interpretation (small/medium/large)"
            ],
            alternatives=[],
            depends_on=[f"step_{step_number-1:03d}"],
            status=StepStatus.PENDING,
            notes="Effect sizes are essential for understanding practical significance beyond p-values"
        )

    def _create_reporting_step(self, step_number: int) -> AnalysisStep:
        """Create APA reporting step."""
        return AnalysisStep(
            step_id=f"step_{step_number:03d}",
            step_number=step_number,
            title="Results Reporting (APA Format)",
            description="Generate publication-ready results in APA 7th edition format",
            analysis_type="reporting",
            method="APA 7th edition statistical reporting",
            assumption_checks=[],
            required_variables=["All analysis results"],
            parameters={"format": "APA7"},
            expected_output=[
                "Methods section paragraph",
                "Results section paragraph",
                "Statistical notation (italics, formatting)",
                "Tables and figures with proper formatting"
            ],
            alternatives=[],
            depends_on=[f"step_{step_number-1:03d}"],
            status=StepStatus.PENDING,
            notes="Ensure all statistics include effect sizes and confidence intervals"
        )

    def _generate_warnings(
        self,
        parsed_query: ParsedQuery,
        data_context: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Generate warnings based on query and context."""
        warnings = []

        # Low confidence warning
        if parsed_query.confidence_score < 0.5:
            warnings.append("Query interpretation confidence is low. Consider rephrasing for clarity.")

        # Sample size warning
        if parsed_query.sample_size_mentioned and parsed_query.sample_size_mentioned < 30:
            warnings.append(f"Sample size (n={parsed_query.sample_size_mentioned}) may be too small for reliable inference.")

        # Multi-step complexity warning
        if parsed_query.is_multi_step and len(parsed_query.steps) > 3:
            warnings.append("Complex multi-step analysis detected. Consider breaking into separate sessions.")

        # Missing data context warning
        if not data_context:
            warnings.append("No data context provided. Recommendations are based on query text only.")

        # Clarification needed warning
        if parsed_query.requires_clarification:
            warnings.append("Some aspects of your query need clarification for optimal recommendations.")

        return warnings

    def _generate_recommendations(
        self,
        parsed_query: ParsedQuery,
        steps: List[AnalysisStep]
    ) -> List[str]:
        """Generate general recommendations."""
        recommendations = []

        recommendations.append("Always check assumptions before proceeding with parametric tests.")
        recommendations.append("Report effect sizes alongside p-values for complete interpretation.")
        recommendations.append("Consider pre-registering your analysis plan for confirmatory research.")

        if parsed_query.primary_intent == QueryIntent.COMPARISON:
            recommendations.append("For group comparisons, ensure groups are comparable on key covariates.")

        if any(a == AnalysisType.REGRESSION for a in parsed_query.analysis_types):
            recommendations.append("Check for multicollinearity before interpreting regression coefficients.")

        if any(a == AnalysisType.CAUSAL for a in parsed_query.analysis_types):
            recommendations.append("Causal claims require strong theory and careful consideration of confounders.")

        return recommendations

    def _collect_data_requirements(
        self,
        parsed_query: ParsedQuery,
        steps: List[AnalysisStep]
    ) -> List[str]:
        """Collect all data requirements from the plan."""
        requirements = set()

        for var in parsed_query.variables:
            if var.role == "dependent":
                requirements.add(f"Outcome variable: {var.name}")
            elif var.role in ["independent", "grouping"]:
                requirements.add(f"Predictor/grouping variable: {var.name}")
            else:
                requirements.add(f"Variable: {var.name}")

        # Add implicit requirements
        if parsed_query.primary_intent == QueryIntent.COMPARISON:
            requirements.add("Grouping variable with defined categories")
        if parsed_query.primary_intent == QueryIntent.PREDICTION:
            requirements.add("Continuous outcome variable for linear regression")

        return list(requirements)

    def _generate_summary(
        self,
        parsed_query: ParsedQuery,
        steps: List[AnalysisStep]
    ) -> str:
        """Generate a plan summary."""
        intent_desc = {
            QueryIntent.COMPARISON: "compare groups",
            QueryIntent.RELATIONSHIP: "examine relationships",
            QueryIntent.PREDICTION: "predict outcomes",
            QueryIntent.DIFFERENCE: "test for differences",
            QueryIntent.DISTRIBUTION: "analyze distributions",
            QueryIntent.EFFECT_SIZE: "calculate effect sizes",
            QueryIntent.POWER: "conduct power analysis",
        }.get(parsed_query.primary_intent, "analyze data")

        main_methods = [s.method for s in steps if s.analysis_type not in ["descriptive", "effect_size", "reporting"]]

        summary = f"This analysis plan will {intent_desc}"
        if main_methods:
            summary += f" using {', '.join(main_methods[:2])}"
        summary += f". The plan includes {len(steps)} steps"
        if parsed_query.is_multi_step:
            summary += " addressing multiple research questions"
        summary += "."

        return summary

    def _estimate_time(self, steps: List[AnalysisStep]) -> str:
        """Estimate total time for the analysis."""
        # Simple estimation: 5 min per step, plus 10 min for assumption checks
        base_time = len(steps) * 5
        assumption_time = sum(len(s.assumption_checks) * 2 for s in steps)
        total = base_time + assumption_time

        if total < 60:
            return f"{total} minutes"
        else:
            hours = total // 60
            mins = total % 60
            return f"{hours}h {mins}m"


# Singleton instance
_generator_instance = None


def get_plan_generator() -> AnalysisPlanGenerator:
    """Get the singleton AnalysisPlanGenerator instance."""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = AnalysisPlanGenerator()
    return _generator_instance
