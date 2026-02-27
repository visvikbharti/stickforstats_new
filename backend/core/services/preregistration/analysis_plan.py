"""
Analysis Plan Module
====================

Structured analysis plan specification for pre-registrations.

Features:
- Step-by-step analysis specification
- Data preprocessing documentation
- Assumption checking plans
- Sensitivity/robustness analyses

Created: December 26, 2025
"""

from typing import Dict, Any, List
from dataclasses import dataclass, field, asdict
from enum import Enum


class AnalysisCategory(Enum):
    """Categories of analysis steps."""

    DATA_CLEANING = "data_cleaning"
    DATA_TRANSFORMATION = "data_transformation"
    ASSUMPTION_CHECK = "assumption_check"
    DESCRIPTIVE = "descriptive"
    PRIMARY_ANALYSIS = "primary_analysis"
    SECONDARY_ANALYSIS = "secondary_analysis"
    EXPLORATORY = "exploratory"
    SENSITIVITY = "sensitivity"
    ROBUSTNESS = "robustness"


class AnalysisPriority(Enum):
    """Priority level for analyses."""

    CONFIRMATORY = "confirmatory"  # Pre-registered, primary
    EXPLORATORY = "exploratory"  # Not pre-registered, exploratory


@dataclass
class AnalysisStep:
    """A single step in the analysis plan."""

    id: str
    name: str
    description: str
    category: AnalysisCategory
    priority: AnalysisPriority
    hypothesis_ids: List[str] = field(default_factory=list)  # Links to hypotheses
    statistical_test: str = ""
    software: str = ""
    rationale: str = ""
    decision_rule: str = ""  # What result leads to what conclusion
    contingency: str = ""  # What to do if assumptions violated
    order: int = 0

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result["category"] = self.category.value
        result["priority"] = self.priority.value
        return result

    def generate_text(self) -> str:
        """Generate formatted text for this analysis step."""
        text = f"### {self.id}: {self.name}\n\n"
        text += f"**Category:** {self.category.value.replace('_', ' ').title()}\n"
        text += f"**Priority:** {self.priority.value.title()}\n\n"
        text += f"{self.description}\n\n"

        if self.hypothesis_ids:
            text += f"**Related Hypotheses:** {', '.join(self.hypothesis_ids)}\n\n"

        if self.statistical_test:
            text += f"**Statistical Test:** {self.statistical_test}\n\n"

        if self.decision_rule:
            text += f"**Decision Rule:** {self.decision_rule}\n\n"

        if self.contingency:
            text += f"**Contingency Plan:** {self.contingency}\n\n"

        if self.rationale:
            text += f"**Rationale:** {self.rationale}\n\n"

        return text


@dataclass
class AnalysisPlan:
    """Complete analysis plan for a study."""

    title: str
    description: str
    steps: List[AnalysisStep] = field(default_factory=list)
    software_versions: Dict[str, str] = field(default_factory=dict)
    data_exclusion_criteria: List[str] = field(default_factory=list)
    missing_data_handling: str = ""
    outlier_handling: str = ""
    multiplicity_correction: str = ""
    alpha_level: float = 0.05
    effect_size_reporting: List[str] = field(default_factory=list)
    confidence_interval_level: float = 0.95

    def add_step(self, step: AnalysisStep) -> None:
        """Add an analysis step."""
        if step.order == 0:
            step.order = len(self.steps) + 1
        self.steps.append(step)
        self.steps.sort(key=lambda x: x.order)

    def get_confirmatory_steps(self) -> List[AnalysisStep]:
        """Get all confirmatory analysis steps."""
        return [s for s in self.steps if s.priority == AnalysisPriority.CONFIRMATORY]

    def get_exploratory_steps(self) -> List[AnalysisStep]:
        """Get all exploratory analysis steps."""
        return [s for s in self.steps if s.priority == AnalysisPriority.EXPLORATORY]

    def get_steps_by_category(self, category: AnalysisCategory) -> List[AnalysisStep]:
        """Get steps by category."""
        return [s for s in self.steps if s.category == category]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "description": self.description,
            "steps": [s.to_dict() for s in self.steps],
            "software_versions": self.software_versions,
            "data_exclusion_criteria": self.data_exclusion_criteria,
            "missing_data_handling": self.missing_data_handling,
            "outlier_handling": self.outlier_handling,
            "multiplicity_correction": self.multiplicity_correction,
            "alpha_level": self.alpha_level,
            "effect_size_reporting": self.effect_size_reporting,
            "confidence_interval_level": self.confidence_interval_level,
        }

    def generate_text(self) -> str:
        """Generate complete analysis plan text."""
        text = f"# Analysis Plan: {self.title}\n\n"
        text += f"{self.description}\n\n"

        # General settings
        text += "## General Analysis Settings\n\n"
        text += f"- **Alpha Level:** {self.alpha_level}\n"
        text += f"- **Confidence Interval Level:** {self.confidence_interval_level * 100}%\n"

        if self.multiplicity_correction:
            text += f"- **Multiple Testing Correction:** {self.multiplicity_correction}\n"

        if self.effect_size_reporting:
            text += f"- **Effect Sizes to Report:** {', '.join(self.effect_size_reporting)}\n"

        text += "\n"

        # Software
        if self.software_versions:
            text += "## Software Versions\n\n"
            for software, version in self.software_versions.items():
                text += f"- {software}: {version}\n"
            text += "\n"

        # Data handling
        text += "## Data Handling\n\n"

        if self.data_exclusion_criteria:
            text += "### Data Exclusion Criteria\n\n"
            for i, criterion in enumerate(self.data_exclusion_criteria, 1):
                text += f"{i}. {criterion}\n"
            text += "\n"

        if self.missing_data_handling:
            text += f"### Missing Data\n\n{self.missing_data_handling}\n\n"

        if self.outlier_handling:
            text += f"### Outlier Handling\n\n{self.outlier_handling}\n\n"

        # Analysis steps by category
        categories_order = [
            AnalysisCategory.DATA_CLEANING,
            AnalysisCategory.DATA_TRANSFORMATION,
            AnalysisCategory.ASSUMPTION_CHECK,
            AnalysisCategory.DESCRIPTIVE,
            AnalysisCategory.PRIMARY_ANALYSIS,
            AnalysisCategory.SECONDARY_ANALYSIS,
            AnalysisCategory.SENSITIVITY,
            AnalysisCategory.ROBUSTNESS,
            AnalysisCategory.EXPLORATORY,
        ]

        for category in categories_order:
            category_steps = self.get_steps_by_category(category)
            if category_steps:
                text += f"## {category.value.replace('_', ' ').title()}\n\n"
                for step in category_steps:
                    text += step.generate_text()

        return text

    def validate(self) -> Dict[str, List[str]]:
        """Validate the analysis plan."""
        warnings = {}

        # Check for primary analysis
        primary = self.get_steps_by_category(AnalysisCategory.PRIMARY_ANALYSIS)
        if not primary:
            warnings["primary_analysis"] = ["No primary analysis steps defined"]

        # Check for assumption checks
        assumptions = self.get_steps_by_category(AnalysisCategory.ASSUMPTION_CHECK)
        if not assumptions:
            warnings["assumptions"] = ["No assumption checking steps defined - consider adding"]

        # Check for missing data handling
        if not self.missing_data_handling:
            warnings["missing_data"] = ["Missing data handling not specified"]

        # Check for decision rules
        for step in self.steps:
            if step.priority == AnalysisPriority.CONFIRMATORY and not step.decision_rule:
                if "decision_rules" not in warnings:
                    warnings["decision_rules"] = []
                warnings["decision_rules"].append(f"Step {step.id} ({step.name}) lacks a decision rule")

        return warnings


def create_analysis_plan(
    title: str,
    description: str,
    alpha: float = 0.05,
    ci_level: float = 0.95,
    multiplicity_correction: str = "",
    effect_sizes: List[str] = None,
    software: Dict[str, str] = None,
    exclusion_criteria: List[str] = None,
    missing_data: str = "",
    outliers: str = "",
) -> AnalysisPlan:
    """
    Create a new analysis plan.

    Args:
        title: Plan title
        description: Plan description
        alpha: Alpha level
        ci_level: Confidence interval level
        multiplicity_correction: Method for multiple testing correction
        effect_sizes: Effect sizes to report
        software: Software versions dictionary
        exclusion_criteria: List of exclusion criteria
        missing_data: Missing data handling description
        outliers: Outlier handling description

    Returns:
        AnalysisPlan object
    """
    return AnalysisPlan(
        title=title,
        description=description,
        alpha_level=alpha,
        confidence_interval_level=ci_level,
        multiplicity_correction=multiplicity_correction,
        effect_size_reporting=effect_sizes or ["Cohen's d", "95% CI"],
        software_versions=software or {},
        data_exclusion_criteria=exclusion_criteria or [],
        missing_data_handling=missing_data,
        outlier_handling=outliers,
    )


def create_standard_analysis_steps(hypothesis_count: int = 1) -> List[AnalysisStep]:
    """
    Create standard analysis steps template.

    Args:
        hypothesis_count: Number of hypotheses

    Returns:
        List of standard AnalysisStep objects
    """
    steps = []
    step_id = 0

    # Data cleaning
    step_id += 1
    steps.append(
        AnalysisStep(
            id=f"A{step_id}",
            name="Data Cleaning",
            description="Check for and handle missing values, coding errors, and data entry mistakes.",
            category=AnalysisCategory.DATA_CLEANING,
            priority=AnalysisPriority.CONFIRMATORY,
            order=step_id,
        )
    )

    # Assumption checks
    step_id += 1
    steps.append(
        AnalysisStep(
            id=f"A{step_id}",
            name="Normality Check",
            description="Assess normality of dependent variables using Shapiro-Wilk test and visual inspection (Q-Q plots, histograms).",
            category=AnalysisCategory.ASSUMPTION_CHECK,
            priority=AnalysisPriority.CONFIRMATORY,
            statistical_test="Shapiro-Wilk test",
            decision_rule="If p < .05, consider non-parametric alternatives or data transformation.",
            contingency="Use Mann-Whitney U or Kruskal-Wallis as non-parametric alternatives.",
            order=step_id,
        )
    )

    step_id += 1
    steps.append(
        AnalysisStep(
            id=f"A{step_id}",
            name="Homogeneity of Variance",
            description="Test homogeneity of variance across groups using Levene's test.",
            category=AnalysisCategory.ASSUMPTION_CHECK,
            priority=AnalysisPriority.CONFIRMATORY,
            statistical_test="Levene's test",
            decision_rule="If p < .05, use Welch's correction or robust methods.",
            contingency="Apply Welch's t-test or Welch's ANOVA.",
            order=step_id,
        )
    )

    # Descriptive statistics
    step_id += 1
    steps.append(
        AnalysisStep(
            id=f"A{step_id}",
            name="Descriptive Statistics",
            description="Compute means, standard deviations, and sample sizes for all variables.",
            category=AnalysisCategory.DESCRIPTIVE,
            priority=AnalysisPriority.CONFIRMATORY,
            order=step_id,
        )
    )

    # Primary analyses (one per hypothesis)
    for h in range(1, hypothesis_count + 1):
        step_id += 1
        steps.append(
            AnalysisStep(
                id=f"A{step_id}",
                name=f"Test Hypothesis H{h}",
                description=f"Primary statistical test for hypothesis H{h}.",
                category=AnalysisCategory.PRIMARY_ANALYSIS,
                priority=AnalysisPriority.CONFIRMATORY,
                hypothesis_ids=[f"H{h}"],
                decision_rule="Reject null hypothesis if p < alpha. Report effect size and confidence interval.",
                order=step_id,
            )
        )

    # Sensitivity analysis
    step_id += 1
    steps.append(
        AnalysisStep(
            id=f"A{step_id}",
            name="Sensitivity Analysis",
            description="Assess robustness of findings to analytical choices.",
            category=AnalysisCategory.SENSITIVITY,
            priority=AnalysisPriority.CONFIRMATORY,
            rationale="Ensures findings are not artifacts of specific analytical decisions.",
            order=step_id,
        )
    )

    return steps
