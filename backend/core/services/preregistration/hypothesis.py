"""
Hypothesis Formulation Module
=============================

Guided hypothesis formulation with proper operationalization
and statistical mapping.

Features:
- Structured hypothesis creation
- Variable operationalization
- Automatic test recommendation
- Natural language generation

Created: December 26, 2025
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum


class HypothesisType(Enum):
    """Types of statistical hypotheses."""

    DIRECTIONAL = "directional"  # One-tailed
    NON_DIRECTIONAL = "non_directional"  # Two-tailed
    EQUIVALENCE = "equivalence"  # TOST
    NON_INFERIORITY = "non_inferiority"
    SUPERIORITY = "superiority"


class VariableRole(Enum):
    """Role of variable in hypothesis."""

    INDEPENDENT = "independent"
    DEPENDENT = "dependent"
    COVARIATE = "covariate"
    MEDIATOR = "mediator"
    MODERATOR = "moderator"


class MeasurementLevel(Enum):
    """Measurement level of variables."""

    NOMINAL = "nominal"
    ORDINAL = "ordinal"
    INTERVAL = "interval"
    RATIO = "ratio"


class EffectDirection(Enum):
    """Direction of predicted effect."""

    GREATER = "greater"
    LESS = "less"
    DIFFERENT = "different"
    EQUIVALENT = "equivalent"


# Export enums as dictionaries for API
HYPOTHESIS_TYPES = {e.name: e.value for e in HypothesisType}
VARIABLE_TYPES = {e.name: e.value for e in MeasurementLevel}


@dataclass
class Variable:
    """A variable in a hypothesis."""

    name: str
    role: VariableRole
    measurement_level: MeasurementLevel
    operationalization: str  # How it will be measured
    levels: Optional[List[str]] = None  # For categorical variables
    range_min: Optional[float] = None  # For continuous
    range_max: Optional[float] = None
    unit: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result["role"] = self.role.value
        result["measurement_level"] = self.measurement_level.value
        return result


@dataclass
class Hypothesis:
    """A formal statistical hypothesis."""

    id: str
    description: str  # Plain language description
    hypothesis_type: HypothesisType
    direction: EffectDirection
    independent_var: Variable
    dependent_var: Variable
    covariates: List[Variable] = field(default_factory=list)
    effect_size_expected: Optional[float] = None
    effect_size_type: Optional[str] = None  # cohen_d, r, eta_squared, etc.
    null_hypothesis: str = ""
    alternative_hypothesis: str = ""
    recommended_test: Optional[str] = None
    alpha: float = 0.05
    rationale: str = ""

    def __post_init__(self):
        """Generate formal hypotheses after initialization."""
        if not self.null_hypothesis:
            self.null_hypothesis = self._generate_null()
        if not self.alternative_hypothesis:
            self.alternative_hypothesis = self._generate_alternative()
        if not self.recommended_test:
            self.recommended_test = self._recommend_test()

    def _generate_null(self) -> str:
        """Generate null hypothesis statement."""
        iv_name = self.independent_var.name
        dv_name = self.dependent_var.name

        if self.hypothesis_type == HypothesisType.EQUIVALENCE:
            return f"H0: The effect of {iv_name} on {dv_name} falls outside the equivalence bounds."
        else:
            return f"H0: There is no relationship between {iv_name} and {dv_name}."

    def _generate_alternative(self) -> str:
        """Generate alternative hypothesis statement."""
        iv_name = self.independent_var.name
        dv_name = self.dependent_var.name

        if self.direction == EffectDirection.GREATER:
            return f"H1: Higher levels of {iv_name} are associated with higher {dv_name}."
        elif self.direction == EffectDirection.LESS:
            return f"H1: Higher levels of {iv_name} are associated with lower {dv_name}."
        elif self.direction == EffectDirection.EQUIVALENT:
            return f"H1: The effect of {iv_name} on {dv_name} is practically equivalent to zero."
        else:
            return f"H1: {iv_name} is associated with differences in {dv_name}."

    def _recommend_test(self) -> str:
        """Recommend appropriate statistical test based on variables."""
        iv_level = self.independent_var.measurement_level
        dv_level = self.dependent_var.measurement_level
        iv_levels = self.independent_var.levels

        # Determine number of groups if categorical IV
        n_groups = len(iv_levels) if iv_levels else 2

        # Continuous DV
        if dv_level in [MeasurementLevel.INTERVAL, MeasurementLevel.RATIO]:
            if iv_level in [MeasurementLevel.INTERVAL, MeasurementLevel.RATIO]:
                if self.covariates:
                    return "Multiple regression"
                return "Pearson correlation / Simple regression"
            elif iv_level in [MeasurementLevel.NOMINAL, MeasurementLevel.ORDINAL]:
                if n_groups == 2:
                    return "Independent samples t-test"
                else:
                    return "One-way ANOVA"

        # Ordinal DV
        elif dv_level == MeasurementLevel.ORDINAL:
            if iv_level in [MeasurementLevel.NOMINAL, MeasurementLevel.ORDINAL]:
                if n_groups == 2:
                    return "Mann-Whitney U test"
                else:
                    return "Kruskal-Wallis H test"
            else:
                return "Spearman correlation"

        # Nominal DV
        elif dv_level == MeasurementLevel.NOMINAL:
            return "Chi-square test / Logistic regression"

        return "Consult statistician"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "description": self.description,
            "hypothesis_type": self.hypothesis_type.value,
            "direction": self.direction.value,
            "independent_var": self.independent_var.to_dict(),
            "dependent_var": self.dependent_var.to_dict(),
            "covariates": [c.to_dict() for c in self.covariates],
            "effect_size_expected": self.effect_size_expected,
            "effect_size_type": self.effect_size_type,
            "null_hypothesis": self.null_hypothesis,
            "alternative_hypothesis": self.alternative_hypothesis,
            "recommended_test": self.recommended_test,
            "alpha": self.alpha,
            "rationale": self.rationale,
        }

    def to_formal_statement(self) -> str:
        """Generate formal hypothesis statement for pre-registration."""
        statement = f"""
Hypothesis {self.id}: {self.description}

Variables:
- Independent Variable: {self.independent_var.name}
  - Operationalization: {self.independent_var.operationalization}
  - Measurement Level: {self.independent_var.measurement_level.value}

- Dependent Variable: {self.dependent_var.name}
  - Operationalization: {self.dependent_var.operationalization}
  - Measurement Level: {self.dependent_var.measurement_level.value}
"""
        if self.covariates:
            statement += "\n- Covariates: " + ", ".join([c.name for c in self.covariates])

        statement += f"""

Formal Hypotheses:
- {self.null_hypothesis}
- {self.alternative_hypothesis}

Hypothesis Type: {self.hypothesis_type.value}
Direction: {self.direction.value}
Alpha Level: {self.alpha}
"""
        if self.effect_size_expected:
            statement += f"Expected Effect Size: {self.effect_size_type} = {self.effect_size_expected}\n"

        statement += f"\nRecommended Statistical Test: {self.recommended_test}\n"

        if self.rationale:
            statement += f"\nRationale: {self.rationale}\n"

        return statement


class HypothesisFormulator:
    """
    Guided hypothesis formulation assistant.

    Helps researchers create well-specified, testable hypotheses
    with proper operationalization.
    """

    def __init__(self):
        self.hypotheses: List[Hypothesis] = []
        self._hypothesis_counter = 0

    def create_hypothesis(
        self,
        description: str,
        iv_name: str,
        iv_operationalization: str,
        iv_measurement: str,
        dv_name: str,
        dv_operationalization: str,
        dv_measurement: str,
        direction: str = "different",
        hypothesis_type: str = "non_directional",
        iv_levels: List[str] = None,
        effect_size: float = None,
        effect_size_type: str = None,
        alpha: float = 0.05,
        rationale: str = "",
        covariates: List[Dict[str, Any]] = None,
    ) -> Hypothesis:
        """
        Create a new hypothesis with guided formulation.

        Args:
            description: Plain language description of hypothesis
            iv_name: Name of independent variable
            iv_operationalization: How IV will be measured/manipulated
            iv_measurement: Measurement level ('nominal', 'ordinal', 'interval', 'ratio')
            dv_name: Name of dependent variable
            dv_operationalization: How DV will be measured
            dv_measurement: Measurement level
            direction: Effect direction ('greater', 'less', 'different', 'equivalent')
            hypothesis_type: Type of hypothesis
            iv_levels: Levels/categories for categorical IV
            effect_size: Expected effect size
            effect_size_type: Type of effect size (e.g., 'cohen_d')
            alpha: Significance level
            rationale: Scientific rationale
            covariates: List of covariate specifications

        Returns:
            Hypothesis object
        """
        self._hypothesis_counter += 1
        h_id = f"H{self._hypothesis_counter}"

        # Create independent variable
        iv = Variable(
            name=iv_name,
            role=VariableRole.INDEPENDENT,
            measurement_level=MeasurementLevel[iv_measurement.upper()],
            operationalization=iv_operationalization,
            levels=iv_levels,
        )

        # Create dependent variable
        dv = Variable(
            name=dv_name,
            role=VariableRole.DEPENDENT,
            measurement_level=MeasurementLevel[dv_measurement.upper()],
            operationalization=dv_operationalization,
        )

        # Create covariates
        covariate_list = []
        if covariates:
            for cov in covariates:
                covariate_list.append(
                    Variable(
                        name=cov["name"],
                        role=VariableRole.COVARIATE,
                        measurement_level=MeasurementLevel[cov.get("measurement", "interval").upper()],
                        operationalization=cov.get("operationalization", ""),
                    )
                )

        # Create hypothesis
        hypothesis = Hypothesis(
            id=h_id,
            description=description,
            hypothesis_type=HypothesisType[hypothesis_type.upper()],
            direction=EffectDirection[direction.upper()],
            independent_var=iv,
            dependent_var=dv,
            covariates=covariate_list,
            effect_size_expected=effect_size,
            effect_size_type=effect_size_type,
            alpha=alpha,
            rationale=rationale,
        )

        self.hypotheses.append(hypothesis)
        return hypothesis

    def get_all_hypotheses(self) -> List[Dict[str, Any]]:
        """Get all hypotheses as dictionaries."""
        return [h.to_dict() for h in self.hypotheses]

    def generate_hypotheses_section(self) -> str:
        """Generate formatted hypotheses section for pre-registration."""
        if not self.hypotheses:
            return "No hypotheses specified."

        sections = []
        for h in self.hypotheses:
            sections.append(h.to_formal_statement())

        return "\n---\n".join(sections)

    def validate_hypotheses(self) -> Dict[str, List[str]]:
        """Validate all hypotheses and return warnings."""
        warnings = {}

        for h in self.hypotheses:
            h_warnings = []

            # Check for effect size specification
            if h.effect_size_expected is None:
                h_warnings.append("No expected effect size specified - consider adding for power analysis")

            # Check for rationale
            if not h.rationale:
                h_warnings.append("No scientific rationale provided")

            # Check operationalization completeness
            if len(h.independent_var.operationalization) < 20:
                h_warnings.append("Independent variable operationalization may be underspecified")

            if len(h.dependent_var.operationalization) < 20:
                h_warnings.append("Dependent variable operationalization may be underspecified")

            # Check for directional hypothesis without clear direction
            if h.hypothesis_type == HypothesisType.DIRECTIONAL and h.direction == EffectDirection.DIFFERENT:
                h_warnings.append(
                    "Directional hypothesis specified but direction is 'different' - consider specifying 'greater' or 'less'"
                )

            if h_warnings:
                warnings[h.id] = h_warnings

        return warnings

    def suggest_improvements(self, hypothesis_id: str) -> List[str]:
        """Suggest improvements for a specific hypothesis."""
        h = next((h for h in self.hypotheses if h.id == hypothesis_id), None)
        if not h:
            return ["Hypothesis not found"]

        suggestions = []

        # Effect size suggestions
        if h.effect_size_expected is None:
            suggestions.append(
                f"Consider specifying an expected effect size based on prior research. "
                f"For {h.recommended_test}, typical effect sizes include..."
            )

        # Measurement suggestions
        if h.independent_var.measurement_level == MeasurementLevel.ORDINAL:
            suggestions.append(
                "Consider whether ordinal variable should be treated as continuous " "or categorical in analysis."
            )

        # Power suggestions
        suggestions.append(
            f"With alpha = {h.alpha}, consider conducting a power analysis to determine "
            f"adequate sample size for detecting your expected effect."
        )

        return suggestions
