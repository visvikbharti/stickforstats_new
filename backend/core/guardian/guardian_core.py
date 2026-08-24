"""
Statistical Guardian Core System
================================
Automatic assumption validation system that helps prevent statistical errors.
Validates assumptions before analysis and provides actionable recommendations.
"""

import math
import numpy as np
from scipy import stats
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from decimal import getcontext
import warnings

# Import visualization and effect size modules
from .visualization_generator import VisualizationGenerator
from .effect_size_calculator import EffectSizeCalculator

# Set precision for high-accuracy calculations
getcontext().prec = 50


class GuardianInputError(ValueError):
    """
    The data handed to the Guardian cannot be validated at all.

    Raised instead of returning a GuardianReport, because a report is a
    *certificate*: it carries ``can_proceed`` and ``confidence_score``, and
    every consumer in this repo reads those two fields without asking whether
    the underlying checks were computable. There is no honest value for either
    field when a group has fewer than two observations -- the sample variance,
    the IQR and the z-score are all undefined or 0/0 -- so the only way to keep
    a caller from acting on a confident-looking report built on unvalidatable
    data is to produce no report at all.

    Subclasses ValueError so existing ``except ValueError`` / ``except
    Exception`` handlers keep working.
    """


class UnknownTestTypeError(ValueError):
    """
    The Guardian was asked to validate a test it does not recognise.

    Previously an unrecognised ``test_type`` produced an empty requirement
    list, which meant zero assumption checks, zero violations and
    ``confidence_score = 1.0`` -- the platform's most damaging possible failure
    mode, since "validation is the default, not an opt-in" is the whole claim.
    A plausible-looking but unmapped string (``"correlation"``,
    ``"pearson_correlation"``) must therefore fail loudly.

    Subclasses ValueError so existing handlers keep working.
    """


# Severity-based penalty weights for confidence scoring
# Critical violations are penalized 3x, warnings 2x, minor issues 1x
# This reflects the relative impact of each violation type on analysis validity
SEVERITY_WEIGHTS = {
    "critical": 3.0,  # Severe violations that invalidate results
    "warning": 2.0,  # Moderate issues requiring attention
    "minor": 1.0,  # Small concerns, usually acceptable
}

# Methodological citations for Guardian assumption checks and recommendations.
# Each entry maps to a seminal paper or textbook that justifies the check.
GUARDIAN_CITATIONS = {
    "normality_robust_large_n": {
        "text": (
            "Lumley, T., Diehr, P., Emerson, S., & Chen, L. (2002). "
            "The importance of the normality assumption in large public "
            "health data sets."
        ),
        "journal": "Annual Review of Public Health, 23, 151-169",
        "key_finding": (
            "For N>30, parametric tests are robust to non-normality "
            "due to CLT"
        ),
    },
    "anova_robust_balanced": {
        "text": (
            "Box, G. E. P. (1954). Some theorems on quadratic forms "
            "applied in the study of analysis of variance problems."
        ),
        "journal": "Annals of Mathematical Statistics, 25(3), 290-302",
        "key_finding": (
            "ANOVA is robust to variance heterogeneity with balanced "
            "group sizes"
        ),
    },
    "welch_vs_student": {
        "text": (
            "Delacre, M., Lakens, D., & Leys, C. (2017). Why "
            "psychologists should by default use Welch's t-test "
            "instead of Student's t-test."
        ),
        "journal": (
            "International Review of Social Psychology, 30(1), 92-101"
        ),
        "key_finding": (
            "Welch's t-test should be the default as it performs "
            "well even with equal variances"
        ),
    },
    "boneau_ttest_robust": {
        "text": (
            "Boneau, C. A. (1960). The effects of violations of "
            "assumptions underlying the t test."
        ),
        "journal": "Psychological Bulletin, 57(1), 49-64",
        "key_finding": (
            "t-test is robust to moderate non-normality, especially "
            "with equal sample sizes"
        ),
    },
    "kruskal_alternative": {
        "text": (
            "Kruskal, W. H., & Wallis, W. A. (1952). Use of ranks "
            "in one-criterion variance analysis."
        ),
        "journal": (
            "Journal of the American Statistical Association, "
            "47(260), 583-621"
        ),
        "key_finding": (
            "Non-parametric alternative when ANOVA assumptions are "
            "severely violated"
        ),
    },
    "shapiro_wilk_test": {
        "text": (
            "Shapiro, S. S., & Wilk, M. B. (1965). An analysis of "
            "variance test for normality."
        ),
        "journal": "Biometrika, 52(3-4), 591-611",
        "key_finding": (
            "Gold standard normality test for small to moderate "
            "samples"
        ),
    },
    "levene_test": {
        "text": (
            "Levene, H. (1960). Robust tests for equality of "
            "variances."
        ),
        "journal": (
            "Contributions to Probability and Statistics, 278-292"
        ),
        "key_finding": "Robust test for variance homogeneity",
    },
    "bootstrap_ci": {
        "text": (
            "Efron, B., & Tibshirani, R. J. (1993). An Introduction "
            "to the Bootstrap."
        ),
        "journal": "Chapman & Hall/CRC",
        "key_finding": (
            "Bootstrap provides valid confidence intervals without "
            "distributional assumptions"
        ),
    },
}


@dataclass
class GuardianAuditEntry:
    """Single audit trail entry for a Guardian check."""

    timestamp: str  # ISO 8601 format
    assumption: str
    test_performed: str
    result: str  # "pass", "violation", "skipped"
    severity: str  # "critical", "warning", "minor", "none"
    p_value: Optional[float] = None
    context_adjustment: Optional[str] = None
    citation: Optional[str] = None


@dataclass
class AssumptionViolation:
    """Represents a violation of statistical assumptions"""

    assumption: str
    test_name: str
    severity: str  # 'critical', 'warning', 'minor'
    p_value: Optional[float]
    statistic: Optional[float]
    message: str
    recommendation: str
    visual_evidence: Optional[Dict[str, Any]] = None


def _violation_to_dict(violation) -> Dict[str, Any]:
    """The canonical wire shape for one violation.

    Three call sites used to build this by hand and had already drifted: the cascade engine
    omitted `statistic` and `test_name`, so a consumer reading a cascade report could not see
    WHICH test produced a violation or what value it found.
    """
    return {
        "assumption": violation.assumption,
        "test_name": violation.test_name,
        "severity": violation.severity,
        "p_value": violation.p_value,
        "statistic": violation.statistic,
        "message": violation.message,
        "recommendation": violation.recommendation,
    }


def _finite_or_none(value) -> Optional[float]:
    """float(value), or None when it is nan/inf.

    Non-finite floats are not representable in JSON; letting one reach the renderer turns an
    otherwise successful assumption check into an HTTP 500. This is the same defect class as
    e442b84 (an unguarded value on a path the maths legitimately takes), and the third instance
    found in this file.
    """
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


@dataclass
class GuardianReport:
    """Complete Guardian assessment report"""

    test_type: str
    data_summary: Dict[str, Any]
    assumptions_checked: List[str]
    violations: List[AssumptionViolation]
    can_proceed: bool
    alternative_tests: List[str]
    confidence_score: float
    visual_evidence: Dict[str, Any]
    effect_size_report: Optional[Dict[str, Any]] = None
    audit_trail: List[GuardianAuditEntry] = field(default_factory=list)
    context_adjustments_applied: bool = False
    #: Assumptions this test REQUIRES that were not actually evaluated on this data --
    #: a validator that declined (independence on non-sequential rows), one with nothing to
    #: compare against, or one with no implementation. Unchecked is NOT satisfied, and the
    #: distinction has to survive into the report or the caller cannot make it.
    assumptions_not_evaluated: List[str] = field(default_factory=list)
    #: False when Guardian recognises this test but has no validators for it. A report with
    #: validated=False asserts NOTHING about the data; it is a refusal, not a pass. Callers that
    #: render an assumption panel must say so rather than showing an empty list of violations,
    #: which is indistinguishable from a clean result.
    validated: bool = True
    unvalidated_reason: str = ""

    @property
    def assumption_coverage(self) -> Optional[float]:
        """Fraction of this test's required assumptions that were actually EVALUATED.

        ``confidence_score`` answers "how bad was what we found"; it is severity-weighted and
        says nothing about how much we looked at. A report can be 1.000 confident having
        examined one assumption out of four -- and, before today, having examined none at all.
        The two numbers answer different questions and a reader was only ever shown one.

        Deliberately a PROPERTY, not a field. This class has now been the site of five separate
        "declared but not performed" defects, every one of which was a value that flowed from
        the specification into the report without passing through the execution. A derived
        read-only property cannot be assigned, so a coverage figure that disagrees with the two
        lists beside it is not a bug someone can write. Same reasoning as ``Rule`` having no
        ``confidence`` field: make the wrong thing unrepresentable rather than discouraged.

        ``None`` when the test declares no requirements at all -- no opinion rather than a
        flattering 1.0. (No test type does today; the branch exists so that adding one cannot
        silently mint perfect coverage.)
        """
        total = len(self.assumptions_checked) + len(self.assumptions_not_evaluated)
        if not total:
            return None
        return round(len(self.assumptions_checked) / total, 3)

    def to_dict(self) -> Dict[str, Any]:
        """The canonical wire shape. Every surface that serialises a report starts here.

        There were THREE hand-written versions of this -- `guardian/views._serialize_report`,
        `cascade_engine._report_to_dict` and `api_views._create_guardian_enriched_response` --
        and keeping them in step was left to whoever remembered. They did not stay in step:
        the cascade dropped `statistic` and `test_name` from every violation, and when
        `assumptions_not_evaluated`, `assumption_coverage` and `validated` were added over the
        last three commits, two of the three were updated and the third was missed. The one
        missed was the one the LIVE analysis endpoints use, so a caller of /causal/did/ saw
        `assumptions_checked: []` with nothing to explain it.

        Callers add their own extras on top (`data_summary`, `visual_evidence`,
        `guardian_status`); what they may no longer do is re-derive the shared core. A field
        added here reaches all three at once, which is the only version of "one rule, one
        place" that survives contact with a deadline.
        """
        return {
            "test_type": self.test_type,
            "assumptions_checked": list(self.assumptions_checked),
            "assumptions_not_evaluated": list(self.assumptions_not_evaluated),
            "assumption_coverage": self.assumption_coverage,
            "validated": self.validated,
            "unvalidated_reason": self.unvalidated_reason,
            "violations": [_violation_to_dict(v) for v in self.violations],
            "can_proceed": self.can_proceed,
            "alternative_tests": list(self.alternative_tests),
            "confidence_score": self.confidence_score,
        }


class ContextualSeverityAdjuster:
    """
    Adjusts Guardian violation severity based on statistical context.

    Key principles from the statistical literature:
    - Large samples (N>30/group) make parametric tests robust to
      non-normality (Central Limit Theorem; Lumley et al., 2002)
    - ANOVA is robust to moderate variance inequality when group
      sizes are equal (Box, 1954; Glass et al., 1972)
    - Slight non-normality (|skewness| < 1) has minimal impact on
      t-test validity (Boneau, 1960)
    """

    # Robustness thresholds from statistical literature
    LARGE_SAMPLE_THRESHOLD = 30  # per group
    MODERATE_SKEWNESS = 1.0
    BALANCED_GROUP_TOLERANCE = 0.2  # max ratio difference from 1.0

    @staticmethod
    def adjust_normality_severity(
        violation, sample_sizes, test_type
    ):
        """
        Downgrade normality violations when CLT applies.

        Reference: Lumley et al. (2002). The importance of the
        normality assumption in large public health data sets.
        Annual Review of Public Health, 23, 151-169.
        """
        min_n = min(sample_sizes) if sample_sizes else 0

        if min_n >= 30 and test_type in (
            "t_test", "anova", "pearson",
        ):
            if violation.severity == "critical":
                return replace(
                    violation,
                    severity="warning",
                    message=(
                        violation.message
                        + f" (downgraded: N={min_n} per group; "
                        "CLT provides robustness "
                        "\u2014 Lumley et al., 2002)"
                    ),
                )
            elif violation.severity == "warning":
                return replace(
                    violation,
                    severity="minor",
                    message=(
                        violation.message
                        + f" (downgraded: N={min_n} per group "
                        "provides CLT robustness)"
                    ),
                )
        return violation

    @staticmethod
    def adjust_variance_severity(
        violation, group_sizes, test_type
    ):
        """
        Downgrade variance homogeneity violations for balanced
        designs.

        Reference: Box, G. E. P. (1954). Some theorems on quadratic
        forms applied in the study of analysis of variance problems.
        """
        if not group_sizes or test_type != "anova":
            return violation

        max_n = max(group_sizes)
        min_n = min(group_sizes)
        if min_n > 0 and (max_n / min_n) <= 1.5:
            if violation.severity == "critical":
                return replace(
                    violation,
                    severity="warning",
                    message=(
                        violation.message
                        + " (downgraded: balanced design provides "
                        "robustness \u2014 Box, 1954)"
                    ),
                )
        return violation

    @staticmethod
    def adjust_for_p_value_magnitude(violation):
        """
        Consider the magnitude of the assumption test p-value.
        p=0.04 (borderline) is less concerning than p=0.001
        (clear violation).
        """
        if violation.p_value is None:
            return violation

        if violation.p_value > 0.01:
            # Borderline violation -- downgrade severity
            if violation.severity == "critical":
                return replace(
                    violation,
                    severity="warning",
                    message=(
                        violation.message
                        + f" (borderline: p={violation.p_value:.4f}"
                        ", close to threshold)"
                    ),
                )
        return violation

    def adjust_all(
        self, violations, sample_sizes, group_sizes, test_type
    ):
        """Apply all contextual adjustments to a list of violations.

        Returns a tuple of (adjusted_violations, adjustment_descriptions)
        where adjustment_descriptions is a list of strings describing
        each adjustment made (empty strings for unmodified violations).
        """
        adjusted = []
        descriptions = []
        for v in violations:
            original_severity = v.severity
            desc_parts = []

            if v.assumption in (
                "normality", "shapiro_wilk", "normalcy",
            ):
                v = self.adjust_normality_severity(
                    v, sample_sizes, test_type
                )
                if v.severity != original_severity:
                    desc_parts.append(
                        f"normality {original_severity}->"
                        f"{v.severity} (CLT, N>="
                        f"{min(sample_sizes) if sample_sizes else 0})"
                    )
                    original_severity = v.severity

            if v.assumption in (
                "variance_homogeneity", "levene",
                "homoscedasticity",
            ):
                before = v.severity
                v = self.adjust_variance_severity(
                    v, group_sizes, test_type
                )
                if v.severity != before:
                    desc_parts.append(
                        f"variance {before}->{v.severity} "
                        "(balanced design)"
                    )

            before = v.severity
            v = self.adjust_for_p_value_magnitude(v)
            if v.severity != before:
                desc_parts.append(
                    f"p-value {before}->{v.severity} "
                    f"(borderline p={v.p_value:.4f})"
                )

            adjusted.append(v)
            descriptions.append("; ".join(desc_parts))

        return adjusted, descriptions


class GuardianCore:
    """
    The Statistical Guardian - Protector of Scientific Integrity

    This is the core engine that validates all statistical assumptions
    before allowing any test to proceed. It implements the universe's
    mathematical principles to ensure statistical validity.
    """

    def __init__(self):
        self.validators = {
            "normality": NormalityValidator(),
            "variance_homogeneity": VarianceHomogeneityValidator(),
            "independence": IndependenceValidator(),
            "outliers": OutlierDetector(),
            "sample_size": SampleSizeValidator(),
            "modality": ModalityDetector(),
            "linearity": LinearityValidator(),
            "homoscedasticity": HomoscedasticityValidator(),
            "similar_shapes": SimilarShapesValidator(),
        }

        # Test requirements mapping
        # Each test type maps to its required assumptions for Guardian validation
        self.test_requirements = {
            # Parametric tests
            "t_test": ["normality", "variance_homogeneity", "independence", "outliers"],
            # ANOVA's F-test is at least as outlier-sensitive as the t-test (a
            # single extreme value inflates a group mean and the between-group
            # sum of squares), so it checks outliers on the same footing.
            "anova": ["normality", "variance_homogeneity", "independence", "outliers"],
            "pearson": ["normality", "linearity", "outliers"],
            "regression": ["normality", "independence", "homoscedasticity", "linearity"],
            # Non-parametric tests
            "chi_square": ["expected_frequencies", "independence"],
            "mann_whitney": ["independence", "similar_shapes"],
            "kruskal_wallis": ["independence", "similar_shapes"],
            # Mixed Models (NEW)
            # Reference: Snijders & Bosker (2012), Hox (2010)
            "mixed_model": ["normality", "independence", "homoscedasticity"],
            "lmm": ["normality", "independence", "homoscedasticity"],  # Linear Mixed Model
            "hlm": ["normality", "independence", "homoscedasticity"],  # Hierarchical Linear Model
            "multilevel": ["normality", "independence", "homoscedasticity"],
            # Causal Inference (NEW)
            # Reference: Angrist & Pischke (2009), Imbens & Rubin (2015)
            #
            # difference_in_differences / did / propensity_score / psm / iv have MOVED to
            # UNVALIDATED_TEST_TYPES. Their entries here read `["independence"]` with the
            # comments "# Parallel trends checked separately" and "# Overlap checked in
            # matching" -- both describing checks that exist nowhere in this repository. The
            # declaration understated what these designs require AND nothing evaluated even the
            # one assumption named.
            "mediation": ["normality", "independence", "linearity"],
            # Bayesian tests
            "bayesian_t_test": ["normality", "independence"],
            "bayesian_anova": ["normality", "independence"],
            # A Bayesian correlation is Pearson's r under a prior: the caller hands Guardian the
            # same [x, y] payload (core/api_views.py:884), so Pearson's validators apply
            # verbatim. It declared ["independence"] alone and therefore examined NOTHING --
            # a MISDECLARATION, not an unvalidatable test. Verified: all three evaluate on its
            # data, 3 of 3, with nothing skipped.
            "bayesian_correlation": ["normality", "linearity", "outliers"],
            # Survival analysis: survival / cox_regression have MOVED to UNVALIDATED_TEST_TYPES.
            # Factor analysis
            "factor_analysis": ["normality", "sample_size"],
            "pca": ["sample_size"],
            # MANOVA is listed with the UNIVARIATE assumptions only, and that
            # limit is deliberate and must be stated wherever the report is
            # shown. Guardian evaluates normality, equality of variance,
            # independence and outliers on the response values it is given. It
            # does NOT evaluate the two assumptions specific to the
            # multivariate case -- multivariate normality of the response
            # vector, and equality of the group covariance matrices (Box's M) --
            # because no validator implements either.
            #
            # This entry exists because the alternative was worse, not because
            # the coverage is complete: before it, 'manova' was absent from this
            # table, so the MANOVA screen received a report with zero checks and
            # confidence 1.0 and rendered a green all-clear having verified
            # nothing whatsoever. A genuine partial check that says what it
            # covered beats a total absence of checking that looks complete.
            "manova": ["normality", "variance_homogeneity", "independence", "outliers"],
        }

        # Initialize visualization and effect size calculators
        self.viz_generator = VisualizationGenerator()
        self.effect_calculator = EffectSizeCalculator()

        # Context-aware severity adjuster (v2)
        self.severity_adjuster = ContextualSeverityAdjuster()

        self._assert_every_requirement_is_implemented()
        self._assert_unvalidated_registry_is_honest()

    # Requirements that are legitimately absent from ``self.validators``
    # because a dedicated code path evaluates them instead of the generic
    # validator loop. ``expected_frequencies`` is computed inside
    # ``_check_contingency``, which builds its own report from the observed
    # table rather than from ``analysis_arrays``.
    _SPECIALLY_DISPATCHED_REQUIREMENTS = frozenset({"expected_frequencies"})

    #: Tests Guardian RECOGNISES but cannot validate, and the honest reason why.
    #:
    #: These are real analyses the platform performs; what is retired is the CLAIM to have
    #: validated them, not the feature. Each entry previously sat in ``test_requirements`` as
    #: ``["independence"]`` -- which was wrong twice over. It understated the design's actual
    #: assumptions (a Cox model's defining requirement is proportional hazards, not
    #: independence), and nothing evaluated even the one assumption it named, because the
    #: lag-1 independence check declines unless the caller declares the rows ordered. Executed
    #: over the live endpoint before this change, ``test_type="cox_regression"`` returned
    #: HTTP 200 with ``assumptions_checked: ["independence"]``, ``confidence_score: 1.0`` and
    #: ``can_proceed: true`` on data nothing had looked at.
    #:
    #: ``requires`` names what the design ACTUALLY assumes, so the report can say what it did
    #: not check rather than implying the list is short. Implementing any of these is what it
    #: would take to move an entry back into ``test_requirements``; until then the honest
    #: output is an explicit refusal, not an empty report that reads like a pass.
    UNVALIDATED_TEST_TYPES: Dict[str, Dict[str, Any]] = {
        "cox_regression": {
            "requires": ["proportional_hazards", "non_informative_censoring", "independence"],
            "key_assumption": "proportional_hazards",
            "citation": "Cox (1972) JRSS-B 34(2):187-220; Grambsch & Therneau (1994) "
                        "Biometrika 81(3):515-26 (the Schoenfeld-residual PH test)",
        },
        "survival": {
            "requires": ["non_informative_censoring", "independence"],
            "key_assumption": "non_informative_censoring",
            "citation": "Kaplan & Meier (1958) JASA 53(282):457-81",
        },
        "difference_in_differences": {
            "requires": ["parallel_trends", "no_anticipation", "stable_composition"],
            "key_assumption": "parallel_trends",
            "citation": "Angrist & Pischke (2009), Mostly Harmless Econometrics, ch. 5",
        },
        "did": {
            "requires": ["parallel_trends", "no_anticipation", "stable_composition"],
            "key_assumption": "parallel_trends",
            "citation": "Angrist & Pischke (2009), Mostly Harmless Econometrics, ch. 5",
        },
        "propensity_score": {
            "requires": ["no_unmeasured_confounding", "common_support", "covariate_balance"],
            "key_assumption": "common_support",
            "citation": "Rosenbaum & Rubin (1983) Biometrika 70(1):41-55; "
                        "Austin (2011) Multivariate Behav Res 46(3):399-424",
        },
        "psm": {
            "requires": ["no_unmeasured_confounding", "common_support", "covariate_balance"],
            "key_assumption": "common_support",
            "citation": "Rosenbaum & Rubin (1983) Biometrika 70(1):41-55; "
                        "Austin (2011) Multivariate Behav Res 46(3):399-424",
        },
        "iv": {
            "requires": ["instrument_relevance", "exclusion_restriction", "independence"],
            "key_assumption": "exclusion_restriction",
            "citation": "Angrist, Imbens & Rubin (1996) JASA 91(434):444-55",
        },
    }

    #: Audit-trail results that mean an assumption was genuinely EXAMINED on this data.
    #: Anything else -- "not_applicable" (the validator declined), "skipped" (no validator),
    #: "not_performed" (the input could not support the check) -- means it was not.
    _EVALUATED_RESULTS = frozenset({"pass", "violation"})

    def _unvalidated_report(self, canonical: str, requested: Any) -> "GuardianReport":
        """An explicit refusal for a test Guardian recognises but cannot validate.

        The shape matters as much as the content. It carries ``validated=False``, an EMPTY
        ``assumptions_checked``, the design's real assumptions in ``assumptions_not_evaluated``,
        and a WARNING violation -- so a caller reading any one of those four fields reaches the
        same conclusion. A report that said only "no violations" would be read as a pass, which
        is exactly what these test types returned before: confidence 1.000, can_proceed true,
        zero violations, on data nothing had examined.

        ``can_proceed`` stays True on purpose. The user is not doing anything forbidden and we
        have no grounds to block them; we simply have no evidence about their assumptions, and
        saying so is different from objecting.
        """
        spec = self.UNVALIDATED_TEST_TYPES[canonical]
        reason = (
            f"Guardian has no assumption validators for '{canonical}'. Its key assumption "
            f"({spec['key_assumption'].replace('_', ' ')}) is not implemented, so this report "
            f"asserts NOTHING about whether the assumptions hold — it is a refusal to check, "
            f"not a clean bill of health. The analysis itself is unaffected."
        )
        now_iso = datetime.now(timezone.utc).isoformat()
        return GuardianReport(
            test_type=str(requested),
            data_summary={},
            assumptions_checked=[],
            assumptions_not_evaluated=list(spec["requires"]),
            violations=[AssumptionViolation(
                assumption="not_validated",
                test_name=f"No validator for {canonical}",
                severity="warning",
                p_value=None,
                statistic=None,
                message=reason,
                recommendation=(
                    f"Assess {spec['key_assumption'].replace('_', ' ')} outside this tool "
                    f"before relying on the result. See {spec['citation']}."
                ),
                visual_evidence=None,
            )],
            can_proceed=True,
            alternative_tests=[],
            confidence_score=self._calculate_confidence([
                AssumptionViolation(assumption="not_validated", test_name="", severity="warning",
                                    p_value=None, statistic=None, message="", recommendation="",
                                    visual_evidence=None)]),
            visual_evidence={},
            effect_size_report=None,
            audit_trail=[GuardianAuditEntry(
                timestamp=now_iso, assumption=a, test_performed="N/A - no validator",
                result="not_performed", severity="warning",
            ) for a in spec["requires"]],
            context_adjustments_applied=False,
            validated=False,
            unvalidated_reason=reason,
        )

    @staticmethod
    def _partition_by_what_actually_ran(requirements, audit_trail):
        """Split declared requirements into (evaluated, not_evaluated) using the AUDIT TRAIL.

        ``assumptions_checked`` used to be the declared ``test_requirements`` list, which is a
        statement about what the test NEEDS, published as though it were a statement about what
        we DID. Executed against this class, 22 of 25 test types listed ``independence`` as
        checked while the trail recorded ``not_applicable`` -- the lag-1 autocorrelation test
        only runs when the caller declares the rows are ordered, which almost no caller does.
        ``_check_contingency`` was blunter still: it appends an audit entry explicitly recording
        independence as not_applicable, with a comment reading "Say so, rather than certifying
        an untested assumption as 'satisfied'", and then listed it in ``assumptions_checked``
        anyway. The function contradicted itself in the space of thirty lines.

        This is the ``similar_shapes`` defect in its general form. That one was a requirement
        with no validator; ``_assert_every_requirement_is_implemented`` now makes THAT
        unrepresentable. But a validator that exists and DECLINES leaves exactly the same
        residue -- a name in ``assumptions_checked``, no violation because nothing ran, and full
        confidence -- and no construction-time check can see it, because whether a validator
        declines depends on the DATA.

        The three existing repairs (``variance_homogeneity`` and ``similar_shapes`` dropped for
        paired designs, ``expected_frequencies`` dropped without a declared table) are each a
        hand-written ``requirements.remove(...)`` for one known case. They stay -- they also
        stop a meaningless validator running -- but the label no longer depends on someone
        remembering to add a fourth. The trail records every requirement the loop touched, so
        reading the answer off it cannot miss a case.
        """
        result_by_assumption = {}
        for entry in audit_trail:
            # A requirement is evaluated if ANY entry for it shows real work. (Nothing emits
            # two entries per assumption today; `or` keeps this correct if something ever does.)
            evaluated = entry.result in GuardianCore._EVALUATED_RESULTS
            result_by_assumption[entry.assumption] = (
                result_by_assumption.get(entry.assumption, False) or evaluated
            )
        checked = [r for r in requirements if result_by_assumption.get(r, False)]
        not_evaluated = [r for r in requirements if not result_by_assumption.get(r, False)]
        return checked, not_evaluated

    def _assert_unvalidated_registry_is_honest(self) -> None:
        """Refuse to construct a Guardian whose two test tables contradict each other.

        Three properties, each of which was violated by the state this replaces:

        1. **Disjoint.** A test type cannot be both validated and unvalidated. Listing one in
           both would let the outcome depend on lookup order.
        2. **Every unvalidated entry is genuinely unvalidatable** -- it must name at least one
           required assumption with NO registered validator. Without this the registry becomes
           a place to hide tests we simply have not wired up, which is how
           ``bayesian_correlation`` sat declaring ``["independence"]`` and examining nothing
           while Pearson's three validators applied to its data verbatim.
        3. **Every entry cites a source and names its key assumption**, and that key assumption
           is one of the ones it requires. A refusal that cannot say what it failed to check,
           or points at something the design does not assume, is not an honest refusal.
        """
        both = set(self.UNVALIDATED_TEST_TYPES) & set(self.test_requirements)
        if both:
            raise RuntimeError(
                f"guardian: test type(s) {sorted(both)} are declared BOTH validated and "
                f"unvalidated; the report would depend on lookup order")

        for name, spec in self.UNVALIDATED_TEST_TYPES.items():
            requires = spec.get("requires") or []
            key = spec.get("key_assumption")
            if not requires or not key or not (spec.get("citation") or "").strip():
                raise RuntimeError(
                    f"guardian: unvalidated entry {name!r} must declare requires, "
                    f"key_assumption and a citation")
            if key not in requires:
                raise RuntimeError(
                    f"guardian: unvalidated entry {name!r} names key_assumption {key!r}, "
                    f"which is not among the assumptions it says the design requires")
            if all(a in self.validators for a in requires):
                raise RuntimeError(
                    f"guardian: unvalidated entry {name!r} requires only assumptions that ARE "
                    f"implemented ({requires}) — it belongs in test_requirements, not here. "
                    f"This is the bayesian_correlation defect: a validatable test parked as "
                    f"unvalidatable examines nothing while its validators sit unused.")

    def _assert_every_requirement_is_implemented(self) -> None:
        """Fail at construction if a declared assumption has no implementation.

        The validator loop in ``check()`` reads ``if req in self.validators``,
        so a requirement with no registered validator is skipped in silence --
        while ``assumptions_checked`` is populated from the *requirements* list
        and therefore still names it. The result is a report that claims an
        assumption was checked, finds no violation because nothing ran, and
        returns full confidence.

        That is not hypothetical. ``similar_shapes`` sat in ``mann_whitney`` and
        ``kruskal_wallis`` with no validator behind it: normal-versus-exponential
        data, a 100x spread difference and strong bimodality all returned zero
        violations and confidence 1.0, with "similar_shapes" listed as checked.
        The check now exists, and this assertion is what stops the next
        requirement added to the table above from repeating the same silence.
        """
        declared = {
            req
            for requirements in self.test_requirements.values()
            for req in requirements
        }
        missing = sorted(
            declared - set(self.validators) - self._SPECIALLY_DISPATCHED_REQUIREMENTS
        )
        if missing:
            raise RuntimeError(
                f"Guardian is misconfigured: test_requirements declares "
                f"{missing}, which no registered validator implements and no "
                f"dedicated code path handles. Guardian would report these as "
                f"checked assumptions while never evaluating them, yielding "
                f"reports with unearned confidence. Either implement a "
                f"validator and register it in self.validators, or remove the "
                f"requirement from test_requirements."
            )

    # Values of ``observation_order`` that mean "rows are in genuine
    # time/sequence order", which is the only situation in which the
    # lag-1 autocorrelation independence check is informative.
    _SEQUENTIAL_ORDER_VALUES = frozenset({
        "sequential", "temporal", "time", "timeseries",
        "time_series", "time-series", "ordered", "serial",
    })

    # ------------------------------------------------------------------
    # test_type canonicalisation
    # ------------------------------------------------------------------
    # Synonyms for the canonical keys of ``test_requirements`` (and of
    # ``_CONTINGENCY_TESTS``). These are pure ROUTING entries: every alias maps
    # to a test whose assumption set is the same one a statistician would apply
    # to the alias. No alias invents a new requirement list.
    #
    # Deliberately absent: strings with no defensible canonical equivalent in
    # ``test_requirements`` (e.g. "variance_test", "logistic_regression"). They
    # raise UnknownTestTypeError rather than being silently routed to a
    # requirement list that does not describe them.
    #
    # "manova" is NOT in that category and must not be listed here: it is a
    # canonical key of ``test_requirements`` in its own right (see the entry and
    # its caveat block above), so it resolves rather than raising. An earlier
    # version of this comment claimed the opposite, which was a false statement
    # about assumption coverage sitting in the archived source. The concern that
    # comment raised is real and is handled at the entry itself: MANOVA's
    # multivariate assumptions -- multivariate normality and Box's M -- are not
    # implemented, so the entry declares only the univariate checks and every
    # surface that renders the report says so explicitly.
    _TEST_TYPE_ALIASES = {
        # --- t-tests (all reduce to the same assumption set; `design`
        #     distinguishes one-sample / paired / independent downstream) ---
        "t": "t_test",
        "ttest": "t_test",
        "t_tests": "t_test",
        "students_t": "t_test",
        "student_t": "t_test",
        "student_t_test": "t_test",
        "students_t_test": "t_test",
        "one_sample": "t_test",
        "one_sample_t": "t_test",
        "one_sample_t_test": "t_test",
        "one_sample_ttest": "t_test",
        "paired": "t_test",
        "paired_t": "t_test",
        "paired_t_test": "t_test",
        "paired_ttest": "t_test",
        "paired_samples_t_test": "t_test",
        "two_sample": "t_test",
        "two_sample_t": "t_test",
        "two_sample_t_test": "t_test",
        "independent": "t_test",
        "independent_t": "t_test",
        "independent_t_test": "t_test",
        "independent_samples_t_test": "t_test",
        # Welch's t-test is a t-test: the frontend and the cascade engine both
        # send "welch_t", and it previously matched nothing at all.
        "welch": "t_test",
        "welch_t": "t_test",
        "welch_t_test": "t_test",
        "welchs_t_test": "t_test",
        # --- ANOVA ---
        "one_way": "anova",
        "one_way_anova": "anova",
        "oneway_anova": "anova",
        "anova_one_way": "anova",
        "two_way": "anova",
        "two_way_anova": "anova",
        "twoway_anova": "anova",
        "factorial_anova": "anova",
        "repeated_measures": "anova",
        "repeated_measures_anova": "anova",
        "rm_anova": "anova",
        # --- correlation ---
        # "pearson" is the canonical key; these are the names callers actually
        # use, including the two the audit found returning confidence 1.0.
        "correlation": "pearson",
        "pearson_r": "pearson",
        "pearson_correlation": "pearson",
        "correlation_pearson": "pearson",
        # Spearman / Kendall are rank correlations: they do not need normality,
        # but they DO need a monotone (Spearman) association and are outlier
        # sensitive through the ranks, so the same checked set is reported and
        # the normality result is what tells a user Spearman is preferable.
        # This mirrors the routing already used by the cascade engine.
        "spearman": "pearson",
        "spearman_correlation": "pearson",
        "spearman_rho": "pearson",
        "kendall": "pearson",
        "kendall_tau": "pearson",
        "kendall_correlation": "pearson",
        # --- regression ---
        "linear_regression": "regression",
        "multiple_regression": "regression",
        "multiple_linear_regression": "regression",
        "ols": "regression",
        "ols_regression": "regression",
        "simple_linear_regression": "regression",
        # --- rank-based group comparisons ---
        "mann_whitney_u": "mann_whitney",
        "mannwhitney": "mann_whitney",
        "mann_whitney_wilcoxon": "mann_whitney",
        "wilcoxon": "mann_whitney",
        "wilcoxon_rank_sum": "mann_whitney",
        "wilcoxon_signed_rank": "mann_whitney",
        "kruskal": "kruskal_wallis",
        "kruskalwallis": "kruskal_wallis",
        "kruskal_wallis_h": "kruskal_wallis",
        # --- contingency-table tests (handled by _check_contingency) ---
        # All of these canonicalise to "chi_square", which IS a member of
        # _CONTINGENCY_TESTS, so a declared table still routes to
        # _check_contingency. Routing them here rather than leaving them as
        # bare _CONTINGENCY_TESTS members also closes a second silent hole: a
        # payload with no declared table (e.g. two raw 0/1 vectors sent as
        # "chi_square_independence") fell through to the numeric path with an
        # EMPTY requirement list and confidence 1.0.
        "chi_squared": "chi_square",
        "chisquare": "chi_square",
        "chi_square_independence": "chi_square",
        "chi_square_goodness_of_fit": "chi_square",
        "chi2": "chi_square",
        "chi2_contingency": "chi_square",
        "fisher_exact": "chi_square",
        "fishers_exact": "chi_square",
        "fisher_exact_test": "chi_square",
    }

    # When an alias names the DESIGN as well as the test (e.g. "paired_t",
    # "repeated_measures"), carry that design through so the collapsed
    # canonical test_type does not lose it. Only used when the caller did not
    # pass `design` explicitly -- an explicit argument always wins.
    _TEST_TYPE_IMPLIED_DESIGN = {
        "one_sample": "one_sample",
        "one_sample_t": "one_sample",
        "one_sample_t_test": "one_sample",
        "one_sample_ttest": "one_sample",
        "paired": "paired",
        "paired_t": "paired",
        "paired_t_test": "paired",
        "paired_ttest": "paired",
        "paired_samples_t_test": "paired",
        "two_sample": "independent",
        "two_sample_t": "independent",
        "two_sample_t_test": "independent",
        "independent": "independent",
        "independent_t": "independent",
        "independent_t_test": "independent",
        "independent_samples_t_test": "independent",
        "welch": "independent",
        "welch_t": "independent",
        "welch_t_test": "independent",
        "welchs_t_test": "independent",
        "one_way": "between",
        "one_way_anova": "between",
        "oneway_anova": "between",
        "anova_one_way": "between",
        "two_way": "between",
        "two_way_anova": "between",
        "twoway_anova": "between",
        "factorial_anova": "between",
        "repeated_measures": "repeated",
        "repeated_measures_anova": "repeated",
        "rm_anova": "repeated",
    }

    def known_test_types(self) -> List[str]:
        """Every test_type string ``check()`` accepts, sorted."""
        return sorted(
            set(self.test_requirements)
            | set(self._CONTINGENCY_TESTS)
            | set(self._TEST_TYPE_ALIASES)
        )

    def _canonical_test_type(self, test_type: Any) -> str:
        """
        Resolve a caller's test_type to a canonical key, or raise.

        An unrecognised test_type must NEVER fall through to an empty
        requirement list: that produced a report with zero checks and
        confidence 1.0, which is indistinguishable from a genuinely clean
        result. See UnknownTestTypeError.
        """
        if test_type is None or not str(test_type).strip():
            raise UnknownTestTypeError(
                "Guardian requires a test_type; none was given. "
                "Valid values: " + ", ".join(self.known_test_types())
            )

        key = (
            str(test_type).strip().lower().replace(" ", "_").replace("-", "_")
        )
        # Aliases are consulted FIRST. Several contingency synonyms
        # ("chi_square_independence", "fisher_exact") are members of
        # _CONTINGENCY_TESTS but have no entry in test_requirements, so an
        # identity-first lookup returned them unchanged and they kept falling
        # through to an EMPTY requirement list. No alias key collides with a
        # test_requirements key (asserted in
        # backend/tests/test_guardian_fails_loudly.py).
        if key in self._TEST_TYPE_ALIASES:
            return self._TEST_TYPE_ALIASES[key]
        if (key in self.test_requirements or key in self._CONTINGENCY_TESTS
                or key in self.UNVALIDATED_TEST_TYPES):
            return key

        raise UnknownTestTypeError(
            f"Guardian does not recognise test_type {test_type!r}, so it "
            "cannot validate any assumption for it. Refusing to return a "
            "report: an unchecked test must not be reported as a passed one. "
            "Valid values: " + ", ".join(self.known_test_types())
        )

    # ------------------------------------------------------------------
    # data checkability
    # ------------------------------------------------------------------
    # Two observations is the smallest sample on which the dispersion
    # statistics every validator depends on are defined at all: ddof=1 variance
    # (Levene), the IQR (outliers) and the z-score (outliers) are undefined or
    # 0/0 at n=1, and np.percentile raises IndexError at n=0. At n=2 they are
    # defined, and the normality check itself reports n=2 as a critical
    # violation, so the platform still fails loudly there without refusing to
    # answer.
    _MIN_OBSERVATIONS = 2

    def _require_checkable_data(
        self, data_arrays: List[np.ndarray], what: str = "data"
    ) -> None:
        """
        Refuse to build a report on data no validator can actually check.

        Raises GuardianInputError for: no groups at all, or any group with
        fewer than ``_MIN_OBSERVATIONS`` finite numeric values.
        """
        if not data_arrays or len(data_arrays) == 0:
            raise GuardianInputError(
                f"Guardian received no {what} to validate (zero groups). "
                "No assumption can be checked, so no report is produced."
            )

        for i, arr in enumerate(data_arrays):
            a = np.asarray(arr)
            try:
                as_float = np.asarray(a, dtype=float).ravel()
                n_usable = int(np.count_nonzero(np.isfinite(as_float)))
                kind = "finite numeric value"
            except (TypeError, ValueError):
                # Non-numeric payload (e.g. string category labels): fall back
                # to the raw element count. _summarize_data already degrades
                # gracefully for these, so only the empty case is refused here.
                n_usable = int(a.size)
                kind = "value"

            if n_usable < self._MIN_OBSERVATIONS:
                label = (
                    f"group_{i + 1}" if len(data_arrays) > 1 else what
                )
                raise GuardianInputError(
                    f"Guardian cannot validate {what}: {label} has "
                    f"{n_usable} {kind}(s), but at least "
                    f"{self._MIN_OBSERVATIONS} are required. With fewer than "
                    f"{self._MIN_OBSERVATIONS} observations the sample "
                    "variance, the IQR and the z-score are all undefined, so "
                    "every assumption check would either raise or record an "
                    "uncomputable result as 'satisfied'. No report is "
                    "produced: refusing to answer is the only honest outcome."
                )

    def check(
        self,
        data: Any,
        test_type: str,
        alpha: float = 0.05,
        observation_order: Optional[str] = None,
        design: Optional[str] = None,
    ) -> GuardianReport:
        """
        Main Guardian check - validates all assumptions for a given test

        Parameters:
        -----------
        data : array-like or dict
            The data to validate
        test_type : str
            The statistical test to be performed
        alpha : float
            Significance level for assumption tests
        observation_order : str, optional
            Declares what the row order of the data means, which gates the
            independence (lag-1 autocorrelation) check. Pass ``"sequential"``
            (or ``"temporal"``/``"time_series"``/etc.) when the rows are a
            genuine time series or repeated-measures sequence so that the
            lag-1 check is run. For any other value -- including the default
            ``None`` -- the order is treated as non-sequential (e.g.
            cross-sectional or omics data) and independence is referred to
            study design rather than tested by lag-1 autocorrelation, since
            that statistic is otherwise an artifact of sample arrangement.

        Returns:
        --------
        GuardianReport : Complete assessment with recommendations
        """

        # Resolve the test_type FIRST. An unrecognised string must never reach
        # the requirement lookup, where `.get(test_type, [])` turned it into a
        # zero-check report with confidence 1.0.
        canonical_test_type = self._canonical_test_type(test_type)

        # Recognised, but we have no validators for it. Refuse explicitly and say what the
        # design actually assumes. Returning early -- before _prepare_data and the requirement
        # loop -- is what makes the refusal unconditional: there is no path from here to an
        # empty-but-confident report.
        if canonical_test_type in self.UNVALIDATED_TEST_TYPES:
            return self._unvalidated_report(canonical_test_type, test_type)

        if design is None:
            key = (
                str(test_type).strip().lower()
                .replace(" ", "_").replace("-", "_")
            )
            design = self._TEST_TYPE_IMPLIED_DESIGN.get(key)

        # A categorical test hands us a contingency TABLE plus string category
        # labels -- not numeric group arrays. Normality, variance homogeneity and
        # skewness are meaningless on that payload, and _prepare_data would build
        # a 2-D array and two string arrays that took _summarize_data down with
        # "only 0-dimensional arrays can be converted to Python scalars" -- a 500
        # that made the Guardian silently unavailable on every chi-square. Route
        # it instead to the assumption that actually governs a chi-square test:
        # the expected cell frequencies (Cochran's rule).
        contingency_without_table = False
        if canonical_test_type in self._CONTINGENCY_TESTS:
            observed = self._extract_contingency(data)
            if observed is not None:
                return self._check_contingency(observed, test_type)
            # No DECLARED table, so Cochran's rule cannot be evaluated. The
            # numeric path below is still the right destination -- the cascade
            # engine legitimately passes two raw 1-D code vectors here, and
            # sniffing them as a table would misread 2x100 observations as a
            # 2x100 contingency table (see _extract_contingency).
            #
            # But `expected_frequencies` must then NOT be reported as checked.
            # It used to be: the dispatch loop skipped it (no registered
            # validator), while assumptions_checked -- built from the
            # requirements list -- still named it. Executed, a table passed as
            # [[[1, 2], [3, 4]]] returned assumptions_checked
            # ['expected_frequencies', 'independence'], zero violations,
            # confidence 1.000 and can_proceed True, with the audit trail
            # recording expected_frequencies as "skipped". The SAME table
            # declared as {"observed": ...} is a critical violation with
            # confidence 0.167. So the more careless the caller, the cleaner the
            # report -- and this is reachable from the manuscript verifier,
            # which certified a grossly Cochran-violating chi-square as
            # assumption-clean.
            contingency_without_table = True

        # Prepare data
        data_arrays = self._prepare_data(data)

        # Refuse to certify data that cannot be validated at all (empty or
        # single-observation groups). Must happen BEFORE any validator runs:
        # np.percentile raised an uncaught IndexError at n=0, and at n=1 Levene
        # and the z-score return NaN, which `if p < alpha` records as a passed
        # assumption -- a confident report on unvalidatable data.
        self._require_checkable_data(data_arrays)

        # Resolve the design (one_sample / paired / independent for t_test;
        # between / repeated for anova) so downstream checks and recommendations
        # are design-correct rather than keyed on the collapsed test_type.
        design = self._normalize_design(canonical_test_type, design, data_arrays)

        # Get requirements for this test
        requirements = list(
            self.test_requirements.get(canonical_test_type, [])
        )

        # A paired or one-sample t-test is a one-sample test (on the paired
        # differences, or on the single column). Homogeneity of variance between
        # two independent groups does not apply, so drop it rather than record a
        # meaningless "Satisfied" for a test that never ran.
        if design in ("one_sample", "paired") and "variance_homogeneity" in requirements:
            requirements.remove("variance_homogeneity")

        # The same reasoning applies to shape similarity, and for the same
        # reason it must be dropped rather than left to no-op. A paired design
        # collapses analysis_arrays to the single array of differences below, so
        # there is no second distribution to compare shapes against -- yet
        # "similar_shapes" would stay in assumptions_checked, telling the user an
        # assumption was examined when the validator had nothing to examine.
        #
        # This is a genuine gap, not a solved problem: the assumption the paired
        # rank test (Wilcoxon signed-rank) actually needs is SYMMETRY of the
        # differences about zero, and no validator implements that. Dropping the
        # requirement makes the report honest about what it checked; it does not
        # make the test's assumptions verified.
        if design in ("one_sample", "paired") and "similar_shapes" in requirements:
            requirements.remove("similar_shapes")

        # See the contingency branch above: without a declared table the
        # expected-frequency rule is unevaluated, so it must leave
        # assumptions_checked rather than sit there looking verified.
        if contingency_without_table and "expected_frequencies" in requirements:
            requirements.remove("expected_frequencies")

        # For a paired design the t-test operates on the differences, so
        # normality and outliers must be assessed on the differences — not on
        # the raw columns. Build the analysis arrays accordingly; independent
        # and one-sample designs analyse the arrays as given.
        analysis_arrays = data_arrays
        if design == "paired" and len(data_arrays) >= 2:
            n = min(len(data_arrays[0]), len(data_arrays[1]))
            analysis_arrays = [np.asarray(data_arrays[0][:n]) - np.asarray(data_arrays[1][:n])]

        # Gate for the independence validator: only run the lag-1
        # autocorrelation test when the caller declares the row order is
        # temporal/sequential; otherwise refer independence to study design.
        sequential_order = (
            observation_order is not None
            and str(observation_order).strip().lower()
            in self._SEQUENTIAL_ORDER_VALUES
        )

        violations = []
        visual_evidence = {}
        audit_trail = []

        # Check each assumption
        now_iso = datetime.now(timezone.utc).isoformat()
        for req in requirements:
            if req in self.validators:
                validator = self.validators[req]
                if req == "independence":
                    result = validator.validate(
                        analysis_arrays, alpha,
                        sequential_order=sequential_order,
                    )
                else:
                    result = validator.validate(analysis_arrays, alpha)

                if result["violated"]:
                    # Every field here was an unguarded dict access. A validator that reports a
                    # violation without one of `severity`, `message` or `recommendation` raised
                    # KeyError straight out of check() and became a non-200 -- the SAME class of
                    # defect as e442b84 (an unguarded read on a path a validator can legitimately
                    # take), one call site to the left, and still live in v1.2.0. Found while
                    # mutation-testing something else. A missing field must degrade the report,
                    # never fail the request: an assumption violation the caller never sees is
                    # strictly worse than one described in slightly less detail.
                    violations.append(
                        AssumptionViolation(
                            assumption=req,
                            test_name=result.get("test_name", req),
                            severity=result.get("severity", "warning"),
                            p_value=result.get("p_value"),
                            statistic=result.get("statistic"),
                            message=result.get(
                                "message", f"{req} assumption violated."
                            ),
                            recommendation=result.get(
                                "recommendation",
                                "Review this assumption before interpreting the result.",
                            ),
                            visual_evidence=result.get("visual_data"),
                        )
                    )
                    # Audit: record violation
                    audit_trail.append(
                        GuardianAuditEntry(
                            timestamp=now_iso,
                            assumption=req,
                            test_performed=result.get("test_name", req),
                            result="violation",
                            severity=result.get("severity", "warning"),
                            p_value=result.get("p_value"),
                            citation=self._get_citation_for_assumption(req),
                        )
                    )
                else:
                    # Audit: record pass, or "not_applicable" when a
                    # validator (e.g. independence on non-sequential data)
                    # declined to test rather than passing.
                    audit_trail.append(
                        GuardianAuditEntry(
                            timestamp=now_iso,
                            assumption=req,
                            test_performed=result.get(
                                "test_name", req
                            ),
                            result=(
                                "not_applicable"
                                if result.get("not_applicable")
                                else "pass"
                            ),
                            severity="none",
                            p_value=result.get("p_value"),
                            citation=self._get_citation_for_assumption(req),
                        )
                    )

                if result.get("visual_data"):
                    visual_evidence[req] = result["visual_data"]
            else:
                # Validator not available for this requirement
                audit_trail.append(
                    GuardianAuditEntry(
                        timestamp=now_iso,
                        assumption=req,
                        test_performed="N/A",
                        result="skipped",
                        severity="none",
                    )
                )

        # Apply context-aware severity adjustments (Guardian v2). Use the
        # analysis arrays (differences for a paired design) so the CLT-based
        # downgrade keys off the effective sample the test actually uses.
        sample_sizes = [len(arr) for arr in analysis_arrays]
        group_sizes = (
            sample_sizes if len(analysis_arrays) > 1 else []
        )
        context_adjusted = False

        if violations:
            adjusted_violations, adj_descriptions = (
                self.severity_adjuster.adjust_all(
                    violations, sample_sizes,
                    group_sizes, canonical_test_type,
                )
            )

            # Update audit trail with context adjustments
            violation_idx = 0
            for entry in audit_trail:
                if entry.result == "violation":
                    if (
                        violation_idx < len(adj_descriptions)
                        and adj_descriptions[violation_idx]
                    ):
                        entry.context_adjustment = (
                            adj_descriptions[violation_idx]
                        )
                        context_adjusted = True
                    # Update severity in audit if it changed
                    if violation_idx < len(adjusted_violations):
                        entry.severity = (
                            adjusted_violations[violation_idx]
                            .severity
                        )
                    violation_idx += 1

            violations = adjusted_violations

        # A chi-square reached here without a declared table, so Cochran's rule
        # was never applied. Dropping it from `requirements` above stops the
        # report claiming it was checked; this says so out loud, because
        # otherwise the response is an empty violation list with confidence
        # 1.000 -- indistinguishable from a table that genuinely passed. Warning,
        # not critical: the caller may legitimately be passing raw code vectors,
        # and blocking them would be wrong. It is added AFTER the contextual
        # severity adjustment so that pass cannot silently downgrade it.
        if contingency_without_table:
            violations.append(
                AssumptionViolation(
                    assumption="expected_frequencies",
                    test_name="Cochran's expected-frequency rule (not performed)",
                    severity="warning",
                    p_value=None,
                    statistic=None,
                    message=(
                        "The expected-frequency rule was NOT evaluated: no "
                        "contingency table was declared in the request, so the "
                        "expected cell counts could not be computed. This is an "
                        "unchecked assumption, not a satisfied one."
                    ),
                    recommendation=(
                        "Send the counts under an explicit key -- "
                        '{"observed": [[a, b], [c, d]]} -- to have Cochran\'s '
                        "rule applied. Without it, a table with small expected "
                        "counts cannot be distinguished from one without."
                    ),
                    visual_evidence=None,
                )
            )
            audit_trail.append(
                GuardianAuditEntry(
                    timestamp=now_iso,
                    assumption="expected_frequencies",
                    test_performed="Cochran's expected-frequency rule (not performed)",
                    result="not_performed",
                    severity="warning",
                    p_value=None,
                    citation=self._get_citation_for_assumption("expected_frequencies"),
                )
            )

        # Determine if we can proceed
        critical_violations = [
            v for v in violations if v.severity == "critical"
        ]
        can_proceed = len(critical_violations) == 0

        # Get alternative tests if needed (design-aware)
        alternatives = self._get_alternatives(
            canonical_test_type, violations, design
        )

        # Calculate confidence score (severity-weighted; see _calculate_confidence)
        confidence = self._calculate_confidence(violations)

        # Generate publication-ready visualizations
        try:
            # Prepare data for visualization (flatten if needed). Uses the
            # analysis arrays so a paired design plots the differences that the
            # normality check actually assessed.
            viz_data = analysis_arrays[0] if len(analysis_arrays) == 1 else analysis_arrays

            # Convert violations to dict format for visualization generator
            violation_dicts = [
                {"assumption": v.assumption, "severity": v.severity, "test_name": v.test_name} for v in violations
            ]

            # Downstream helpers key on the CANONICAL name ("t_test", "anova",
            # "pearson", "regression"); an alias such as "welch_t" used to match
            # none of their branches and silently produced no diagnostics.
            visual_plots = self.viz_generator.generate_all_diagnostics(
                viz_data, violation_dicts, canonical_test_type
            )
            visual_evidence.update(visual_plots)
        except Exception as e:
            warnings.warn(f"Failed to generate visualizations: {str(e)}")
            visual_evidence["error"] = str(e)

        # Calculate effect sizes
        effect_size_report = None
        try:
            effect_size_report = self.effect_calculator.generate_effect_size_report(
                canonical_test_type, data_arrays
            )
        except Exception as e:
            warnings.warn(f"Failed to calculate effect sizes: {str(e)}")

        checked, not_evaluated = self._partition_by_what_actually_ran(
            requirements, audit_trail)

        # NOTHING was evaluated. An empty `assumptions_checked` beside confidence 1.000 and
        # can_proceed True is indistinguishable from a test that passed everything, and it is
        # reachable over the live endpoint: POST /api/guardian/check/ with test_type
        # "cox_regression" (or survival / iv / psm / propensity_score / did /
        # difference_in_differences / bayesian_correlation) returned exactly that.
        #
        # Say it out loud, in the same shape as the expected-frequency case above: a WARNING
        # violation, which lowers the confidence score away from a clean bill without touching
        # can_proceed -- the caller is not doing anything forbidden, we simply have no evidence
        # about them. Deliberately scoped to "nothing ran at all" rather than "something was
        # skipped": firing it whenever independence is unevaluated would re-rate almost every
        # check the product performs, which is a far larger behavioural change than the defect
        # warrants, and the truthful `assumptions_not_evaluated` list already carries that case.
        if requirements and not checked:
            violations.append(
                AssumptionViolation(
                    assumption="none_evaluated",
                    test_name="No assumption check could be performed",
                    severity="warning",
                    p_value=None,
                    statistic=None,
                    message=(
                        f"NONE of the assumptions required for '{test_type}' were evaluated on "
                        f"this data ({', '.join(not_evaluated)}). This report therefore says "
                        f"nothing about whether they hold: it is an absence of evidence, not a "
                        f"clean bill of health."
                    ),
                    recommendation=(
                        "Treat these assumptions as UNVERIFIED. Where a check is available but "
                        "declined, supply what it needs -- e.g. pass observation_order="
                        "'sequential' for independence when the rows are genuinely ordered."
                    ),
                    visual_evidence=None,
                )
            )
            audit_trail.append(
                GuardianAuditEntry(
                    timestamp=now_iso,
                    assumption="none_evaluated",
                    test_performed="No assumption check could be performed",
                    result="not_performed",
                    severity="warning",
                    p_value=None,
                )
            )
            confidence = self._calculate_confidence(violations)

        return GuardianReport(
            test_type=test_type,
            data_summary=self._summarize_data(data_arrays),
            assumptions_checked=checked,
            assumptions_not_evaluated=not_evaluated,
            violations=violations,
            can_proceed=can_proceed,
            alternative_tests=alternatives,
            confidence_score=confidence,
            visual_evidence=visual_evidence,
            effect_size_report=effect_size_report,
            audit_trail=audit_trail,
            context_adjustments_applied=context_adjusted,
        )

    def _prepare_data(self, data) -> List[np.ndarray]:
        """Convert various data formats to numpy arrays"""
        if isinstance(data, dict):
            return [np.array(v) for v in data.values()]
        elif isinstance(data, list) and all(isinstance(x, (list, np.ndarray)) for x in data):
            return [np.array(x) for x in data]
        else:
            return [np.array(data)]

    def _summarize_data(self, data_arrays: List[np.ndarray]) -> Dict[str, Any]:
        """
        Create summary statistics for the data.

        Deliberately defensive: a non-numeric or multi-dimensional array (e.g. the
        string category labels a categorical payload carries alongside its table)
        must never take the whole check down with a 500. Summarise what can be
        summarised and record why the rest could not be.
        """
        summary = {}
        for i, arr in enumerate(data_arrays):
            key = f"group_{i+1}" if len(data_arrays) > 1 else "data"
            try:
                flat = np.asarray(arr, dtype=float).ravel()
                flat = flat[np.isfinite(flat)]
                if flat.size == 0:
                    raise ValueError("no finite numeric values")
                summary[key] = {
                    "n": int(flat.size),
                    "mean": float(np.mean(flat)),
                    "std": float(np.std(flat, ddof=1)) if flat.size > 1 else 0.0,
                    "median": float(np.median(flat)),
                    "min": float(np.min(flat)),
                    "max": float(np.max(flat)),
                    # scipy returns nan for skew/kurtosis of a CONSTANT column (0/0), and nan
                    # is not JSON -- DRF's renderer raises "Out of range float values are not
                    # JSON compliant" and the whole check becomes a 500. A control group with
                    # no variation is ordinary data, not a client error. MEASURED: a constant
                    # y 500'd this endpoint on v1.2.0 and on this branch. None serialises as
                    # null and says the right thing -- the shape of a distribution with no
                    # spread is undefined, not zero.
                    "skewness": _finite_or_none(stats.skew(flat)),
                    "kurtosis": _finite_or_none(stats.kurtosis(flat)),
                }
            except (TypeError, ValueError) as exc:
                summary[key] = {
                    "n": int(np.size(arr)),
                    "note": f"not summarisable as numeric data ({exc})",
                }
        return summary

    # Tests whose payload is a contingency table rather than numeric samples.
    _CONTINGENCY_TESTS = {
        "chi_square",
        "chi_squared",
        "chisquare",
        "chi_square_independence",
        "fisher_exact",
    }

    @staticmethod
    def _extract_contingency(data) -> Optional[np.ndarray]:
        """
        Pull a 2-D numeric contingency table out of a categorical payload.

        The frontend sends {observed: [[a, b], [c, d]], categories1: [...],
        categories2: [...]} where the category arrays are strings.

        The table must be DECLARED under an explicit key. A bare list of arrays is
        deliberately NOT accepted: callers such as the cascade engine legitimately
        pass two raw 1-D sample vectors for "chi_square_independence" (e.g. two
        columns of 0/1 codes), and np.asarray([a, b]) on those is a perfectly valid
        2-D array -- so sniffing shape alone would silently misread 2x100 raw
        observations as a 2x100 contingency table. Returns None when there is no
        declared table, so the caller falls back to the numeric path.
        """
        table = None
        if isinstance(data, dict):
            for key in ("observed", "table", "contingency_table", "counts"):
                if key in data:
                    table = data[key]
                    break

        if table is None:
            return None
        try:
            arr = np.asarray(table, dtype=float)
        except (TypeError, ValueError):
            return None
        if arr.ndim != 2 or arr.size == 0:
            return None
        if not np.all(np.isfinite(arr)) or np.any(arr < 0):
            return None
        return arr

    def _check_contingency(self, observed: np.ndarray, test_type: str) -> GuardianReport:
        """
        Guardian check for a chi-square test of independence.

        The assumption that actually governs the chi-square approximation is the
        expected cell frequency, not normality. Cochran's rule: no expected count
        may fall below 1, and at most 20% of cells may fall below 5 (for a 2x2,
        every cell must reach 5). Violating it is exactly when Fisher's exact test
        should be used instead.

        Reference: Cochran, W.G. (1954). "Some methods for strengthening the
        common chi-square tests." Biometrics 10(4): 417-451.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        citation = "Cochran (1954), Biometrics 10(4):417-451"
        violations: List[AssumptionViolation] = []
        audit_trail: List[GuardianAuditEntry] = []

        n = float(observed.sum())
        if n > 0:
            row_totals = observed.sum(axis=1, keepdims=True)
            col_totals = observed.sum(axis=0, keepdims=True)
            expected = (row_totals @ col_totals) / n
        else:
            expected = np.zeros_like(observed)

        n_cells = int(expected.size)
        min_expected = float(expected.min()) if n_cells else 0.0
        cells_below_5 = int(np.sum(expected < 5))
        pct_below_5 = (cells_below_5 / n_cells) if n_cells else 0.0
        is_2x2 = observed.shape == (2, 2)

        if min_expected < 1 or (is_2x2 and min_expected < 5):
            severity = "critical"
        elif pct_below_5 > 0.20:
            severity = "warning"
        else:
            severity = None

        if severity:
            recommendation = (
                "Use Fisher's exact test instead."
                if is_2x2
                else "Collapse sparse categories, or use an exact / Monte-Carlo chi-square test."
            )
            violations.append(
                AssumptionViolation(
                    assumption="expected_frequencies",
                    test_name="Cochran's expected-frequency rule",
                    severity=severity,
                    p_value=None,
                    statistic=round(min_expected, 4),
                    message=(
                        f"{cells_below_5} of {n_cells} cells have an expected frequency "
                        f"below 5 (smallest expected = {min_expected:.2f}). The chi-square "
                        f"approximation is unreliable for this table."
                    ),
                    recommendation=recommendation,
                )
            )

        audit_trail.append(
            GuardianAuditEntry(
                timestamp=now_iso,
                assumption="expected_frequencies",
                test_performed="Cochran's expected-frequency rule",
                result="violation" if severity else "pass",
                severity=severity or "none",
                citation=citation,
            )
        )

        # Independence of observations cannot be recovered from a collapsed
        # contingency table -- it is a property of how the data were collected.
        # Say so, rather than certifying an untested assumption as "satisfied".
        audit_trail.append(
            GuardianAuditEntry(
                timestamp=now_iso,
                assumption="independence",
                test_performed="N/A - determined by study design",
                result="not_applicable",
                severity="none",
            )
        )

        alternatives: List[str] = []
        if violations:
            alternatives = (
                ["fisher_exact"] if is_2x2 else ["fisher_exact", "monte_carlo_chi_square"]
            )

        return GuardianReport(
            test_type=test_type,
            data_summary={
                "table_shape": [int(d) for d in observed.shape],
                "n": int(n),
                "n_cells": n_cells,
                "min_expected_frequency": round(min_expected, 4),
                "cells_below_5": cells_below_5,
            },
            # Read off the trail, like the main path: this function records independence as
            # not_applicable two dozen lines above and used to list it here regardless.
            **dict(zip(
                ("assumptions_checked", "assumptions_not_evaluated"),
                self._partition_by_what_actually_ran(
                    ["expected_frequencies", "independence"], audit_trail))),
            violations=violations,
            can_proceed=not any(v.severity == "critical" for v in violations),
            alternative_tests=alternatives,
            confidence_score=self._calculate_confidence(violations),
            visual_evidence={},
            effect_size_report=None,
            audit_trail=audit_trail,
            context_adjustments_applied=False,
        )

    def _normalize_design(
        self,
        test_type: str,
        design: Optional[str],
        data_arrays: List[np.ndarray],
    ) -> Optional[str]:
        """
        Resolve the design sub-type for a collapsed test_type.

        Returns one of {one_sample, paired, independent} for t_test and
        {between, repeated} for anova. Honours an explicit `design` (normalizing
        common aliases); when none is given, infers a safe default from the data
        shape (a single array is one-sample; multiple arrays are
        independent/between).
        """
        if design:
            d = str(design).strip().lower().replace("-", "_").replace(" ", "_")
            aliases = {
                "onesample": "one_sample", "single": "one_sample", "one": "one_sample",
                "paired_samples": "paired", "dependent": "paired", "matched": "paired",
                "repeated_measures": "repeated", "within": "repeated",
                "within_subjects": "repeated",
                "independent_samples": "independent", "two_sample": "independent",
                "twosample": "independent", "unpaired": "independent",
                "between_subjects": "between", "one_way": "between",
            }
            d = aliases.get(d, d)
            if test_type == "t_test":
                if d in ("one_sample", "paired", "independent"):
                    return d
                if d == "between":
                    return "independent"
                if d == "repeated":
                    return "paired"
            elif test_type == "anova":
                if d in ("between", "repeated"):
                    return d
                if d == "independent":
                    return "between"
                if d == "paired":
                    return "repeated"

        # Infer a safe default from the data shape.
        if test_type == "t_test":
            return "one_sample" if len(data_arrays) == 1 else "independent"
        if test_type == "anova":
            return "between"
        return None

    def _get_alternatives(
        self,
        test_type: str,
        violations: List[AssumptionViolation],
        design: Optional[str] = None,
    ) -> List[str]:
        """
        Recommend alternative tests based on violations, respecting the DESIGN.

        The frontend collapses one-sample / paired / independent t-tests to
        "t_test" and between- / repeated-measures ANOVA to "anova". Recommending
        by test_type alone therefore offered design-inappropriate tests — e.g.
        Mann-Whitney (a two-independent-sample test) for a paired or one-sample
        design, or Friedman (repeated-measures) for a between-subjects ANOVA.
        When `design` is known we map to the correct non-parametric analogue;
        otherwise we fall back to the design-agnostic list (independent /
        between-subjects), which is the safest default for the collapsed types.
        """
        alternatives: List[str] = []

        # Design-specific maps take priority when the design is declared.
        design_map = {
            ("t_test", "one_sample"): ["wilcoxon_signed_rank", "sign_test", "bootstrap"],
            ("t_test", "paired"): ["wilcoxon_signed_rank", "permutation_test", "bootstrap"],
            ("t_test", "independent"): ["mann_whitney", "permutation_test", "bootstrap"],
            ("anova", "between"): ["kruskal_wallis", "permutation_anova"],
            ("anova", "repeated"): ["friedman", "permutation_anova"],
        }
        # Design-agnostic fallback (assumes the between-subjects / independent
        # design that the collapsed test_type most commonly denotes). Friedman is
        # deliberately absent from the ANOVA fallback because it is only valid
        # for repeated-measures data, which is never the default here.
        default_map = {
            "t_test": ["mann_whitney", "permutation_test", "bootstrap"],
            "anova": ["kruskal_wallis", "permutation_anova"],
            "pearson": ["spearman", "kendall", "distance_correlation"],
            "regression": ["robust_regression", "quantile_regression", "gam"],
        }

        base = design_map.get((test_type, design)) if design else None
        if base is None:
            base = default_map.get(test_type)

        if base is not None:
            violated_assumptions = {v.assumption for v in violations}

            if "normality" in violated_assumptions:
                alternatives.extend(base)

            # Welch's t-test only makes sense for a two-independent-sample
            # comparison with unequal variances.
            if (
                "variance_homogeneity" in violated_assumptions
                and test_type == "t_test"
                and design in (None, "independent")
            ):
                alternatives.append("welch_t_test")

        # De-duplicate while preserving order (list(set()) was nondeterministic).
        seen = set()
        ordered = []
        for a in alternatives:
            if a not in seen:
                seen.add(a)
                ordered.append(a)
        return ordered

    def _calculate_confidence(self, violations: List[AssumptionViolation]) -> float:
        """
        Calculate confidence score using severity-based weighting.

        Higher penalties for more severe violations:
        - Critical violations: penalty = 3.0 (severe impact on validity)
        - Warning violations: penalty = 2.0 (moderate impact)
        - Minor violations: penalty = 1.0 (minimal impact)

        confidence = max(0, 1 - total_penalty / (max_possible_penalty * 1.2))

        Because both total_penalty and max_possible_penalty scale with the
        violation count, this measures the AVERAGE severity, not the total
        number of violations (one critical and five criticals both give 0.167).
        Actual values for uniform-severity violation sets:
        - all critical -> 0.167
        - all warning  -> 0.444
        - all minor    -> 0.722
        (no violations -> 1.0). This is an internal heuristic, not a named
        statistic; calibrate any thresholds against these real values.

        Returns:
            float: Confidence score between 0 and 1
        """
        if not violations:
            return 1.0

        # Calculate total penalty from all violations
        total_penalty = sum(SEVERITY_WEIGHTS.get(v.severity, 1.0) for v in violations)

        # Maximum possible penalty if all were critical
        max_possible_penalty = len(violations) * SEVERITY_WEIGHTS["critical"]

        # Confidence decreases with the AVERAGE violation severity (the count
        # cancels between numerator and denominator). Anchors: all-critical ->
        # 0.167, all-warning -> 0.444, all-minor -> 0.722.
        confidence = max(0, 1 - (total_penalty / (max_possible_penalty * 1.2)))

        return round(confidence, 3)

    @staticmethod
    def _get_citation_for_assumption(assumption):
        """Map an assumption name to its methodological citation key."""
        _assumption_citation_map = {
            "normality": "shapiro_wilk_test",
            "shapiro_wilk": "shapiro_wilk_test",
            "variance_homogeneity": "levene_test",
            "levene": "levene_test",
            "homoscedasticity": "levene_test",
            "independence": "boneau_ttest_robust",
            "outliers": "bootstrap_ci",
            "sample_size": "normality_robust_large_n",
            "linearity": "boneau_ttest_robust",
            "modality": "kruskal_alternative",
        }
        key = _assumption_citation_map.get(assumption)
        if key and key in GUARDIAN_CITATIONS:
            return GUARDIAN_CITATIONS[key]["text"]
        return None


class NormalityValidator:
    """Validates normality assumption using multiple tests"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Check normality using Shapiro-Wilk and Anderson-Darling tests"""
        results = []

        for arr in data_arrays:
            if len(arr) < 3:
                return {
                    "violated": True,
                    "test_name": "Sample Size Check",
                    "severity": "critical",
                    "message": "Sample size too small for normality testing",
                    "recommendation": "Collect more data (n ≥ 30) or use non-parametric tests",
                }

            # Shapiro-Wilk test (best for small samples)
            if len(arr) <= 5000:
                stat, p_value = stats.shapiro(arr)
                test_name = "Shapiro-Wilk"
            else:
                # Anderson-Darling for large samples. scipy.stats.anderson
                # only returns critical values at 5 fixed significance
                # levels; convert to a continuous p-value via the
                # D'Agostino-Stephens 1986 closed-form approximation so
                # downstream severity logic that compares against
                # non-table thresholds (e.g., alpha/10) still works.
                # See backend/core/utils/anderson_darling.py and
                # docs/CRITICAL_REVIEW_2026-05-06.md §P1-8.
                from core.utils.anderson_darling import (
                    anderson_pvalue_continuous,
                )
                ad_result = stats.anderson(arr, dist="norm")
                stat = float(ad_result.statistic)
                p_value = anderson_pvalue_continuous(stat, len(arr))
                test_name = "Anderson-Darling"

            results.append({"p_value": p_value, "statistic": stat, "test_name": test_name})

        # Check if any group violates normality
        violations = [r for r in results if r["p_value"] < alpha]

        if violations:
            # Severity keys off the VIOLATING groups, not every group. Using
            # all()-across-all-groups demoted a single catastrophically
            # non-normal group to a mere 'warning' whenever any co-group was
            # normal, letting can_proceed stay True on grossly non-normal data.
            severity = "critical" if any(r["p_value"] < alpha / 10 for r in violations) else "warning"
            return {
                "violated": True,
                "test_name": violations[0]["test_name"],
                "severity": severity,
                "p_value": min(r["p_value"] for r in violations),
                "statistic": violations[0]["statistic"],
                "message": f'Normality assumption violated (p={violations[0]["p_value"]:.4f})',
                "recommendation": "Consider transformation (log, sqrt) or use non-parametric tests",
                "visual_data": self._generate_visual_data(data_arrays),
            }

        # Return test statistics even when assumption is satisfied
        return {
            "violated": False,
            "test_name": results[0]["test_name"] if results else "Shapiro-Wilk",
            "p_value": max(r["p_value"] for r in results) if results else None,
            "statistic": results[0]["statistic"] if results else None,
        }

    def _generate_visual_data(self, data_arrays: List[np.ndarray]) -> Dict:
        """Generate data for Q-Q plot and histogram (lightweight version)"""
        visual_data = {}

        for i, arr in enumerate(data_arrays):
            # Q-Q plot data
            theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, len(arr)))
            sample_quantiles = np.sort(arr)

            visual_data[f"group_{i+1}"] = {
                "qq_plot": {"theoretical": theoretical_quantiles.tolist(), "sample": sample_quantiles.tolist()},
                "histogram": {"values": arr.tolist(), "bins": 30}
                # KDE removed for performance - can be generated client-side if needed
            }

        return visual_data


class VarianceHomogeneityValidator:
    """Validates homogeneity of variance assumption"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Check variance homogeneity using Levene's test"""

        if len(data_arrays) < 2:
            return {"violated": False}  # Cannot check with single group

        # Levene's test (robust to non-normality)
        stat, p_value = stats.levene(*data_arrays, center="median")

        if p_value < alpha:
            # Calculate variance ratio
            variances = [np.var(arr, ddof=1) for arr in data_arrays]
            ratio = max(variances) / min(variances)

            # Severity based on variance ratio using evidence-based thresholds
            # Reference: Box (1954) suggests ANOVA is robust when variance ratio < 4
            # Commonly used thresholds in statistical software: 4 (critical), 2 (warning)
            if ratio > 4.0:
                severity = "critical"
            elif ratio > 2.0:
                severity = "warning"
            else:
                severity = "minor"

            return {
                "violated": True,
                "test_name": "Levene's Test",
                "severity": severity,
                "p_value": p_value,
                "statistic": stat,
                "message": f"Variance homogeneity violated (ratio={ratio:.2f}, p={p_value:.4f})",
                "recommendation": "Use Welch's t-test or non-parametric alternatives",
                "visual_data": self._generate_visual_data(data_arrays),
            }

        # Return test statistics even when assumption is satisfied
        return {"violated": False, "test_name": "Levene's Test", "p_value": p_value, "statistic": stat}

    def _generate_visual_data(self, data_arrays: List[np.ndarray]) -> Dict:
        """Generate variance comparison visualization data"""
        return {
            "variances": [float(np.var(arr, ddof=1)) for arr in data_arrays],
            "std_devs": [float(np.std(arr, ddof=1)) for arr in data_arrays],
            "group_sizes": [len(arr) for arr in data_arrays],
        }


class SimilarShapesValidator:
    """Validates the equal-shape assumption of the rank-based location tests.

    Mann-Whitney U and Kruskal-Wallis are frequently described, including in
    much of the applied literature, as "non-parametric tests of the median".
    They are not. Both test stochastic dominance -- broadly, P(X < Y) != 1/2 --
    and only become tests *of location* under the additional assumption that
    the groups' distributions share a common shape and differ, if at all, by a
    shift. When the shapes differ (unequal spread, opposite skew, one bimodal
    and one not), a significant result still means "these samples do not come
    from the same distribution", but it no longer licenses the conclusion the
    user almost always wants to draw, which is "the groups differ in location".
    Since the shapes can differ while the medians are identical, the direction
    of the reported effect can be the opposite of the direction of the medians.

    Method
    ------
    The assumption is about shape *net of location*, so each group is first
    centred on its own median -- removing exactly the shift the test is about,
    and doing so robustly, which matters because these are rank tests chosen
    precisely when the data are skewed or heavy-tailed. The centred samples are
    then compared with the two-sample Kolmogorov-Smirnov test, whose statistic
    D = sup|F1 - F2| is the largest discrepancy between the two empirical
    distribution functions. For k > 2 groups every pair is compared and alpha
    is Bonferroni-corrected across the k(k-1)/2 pairs.

    Both D and p are used to grade the result. p alone is not enough in either
    direction: at large n a negligible shape difference attains a tiny p, and
    at small n a gross one attains none.

    Severity is deliberately capped at "warning" and never reaches "critical"
    ---------------------------------------------------------------------------
    Two reasons, and the cap is load-bearing in both.

    1. Statistically, differing shapes do not invalidate these tests. The test
       remains a valid test of stochastic dominance; what fails is the *median*
       interpretation of it. Blocking the analysis would overstate the problem.
    2. Structurally, Guardian's own normality and variance validators recommend
       Mann-Whitney and Kruskal-Wallis as the fallback when a parametric
       assumption fails. If this validator could emit a critical violation it
       would set can_proceed = False on the very test Guardian just recommended,
       leaving the user with no test that Guardian permits -- a dead end of the
       kind this project has shipped before. A warning informs without trapping.
    """

    # Below this many observations in a group the empirical distribution
    # function has too few steps for a shape comparison to carry information.
    MIN_N_FOR_SHAPE = 5

    # Grading threshold on D, calibrated rather than guessed.
    #
    # D has no conventional small/medium/large scale, so it was anchored to the
    # thresholds this codebase already uses for the closely related unequal-
    # spread problem: VarianceHomogeneityValidator grades a variance ratio > 2
    # as a warning and > 4 as critical, after Box (1954). Measuring D between
    # median-centred distributions at n = 10^6 per group gives the equivalent
    # points on the D scale, alongside reference shape differences:
    #
    #     D = 0.002   two identical normals
    #     D = 0.031   normal vs t(5)              (heavier tails)
    #     D = 0.055   SD ratio 1.25
    #     D = 0.057   normal vs uniform
    #     D = 0.097   SD ratio 1.5
    #     D = 0.162   SD ratio 2                  <-- Box's warning cut
    #     D = 0.174   normal vs lognormal(0, 1)
    #     D = 0.244   normal vs exponential
    #     D = 0.291   SD ratio 4                  <-- Box's "not robust" cut
    #     D = 0.500   unimodal vs strongly bimodal
    #
    # These are the figures printed by Part 6 of
    # paper/replication/guardian_validator_evidence.py, which measures them on
    # each run and asserts that the constant below still matches the ratio-2
    # row. They are Monte-Carlo estimates and move in the third decimal from
    # seed to seed, so the assertion allows 0.01 rather than demanding equality.
    #
    # The cut is therefore placed at Box's warning equivalent. Anything the
    # variance validator would call a warning or worse, this one calls a
    # warning too; the milder differences that Box's work says these tests
    # tolerate are graded minor. Note that a violation is only raised at all
    # when the KS p-value clears the Bonferroni-corrected alpha, so a trivial
    # difference detected at very large n still grades as minor rather than
    # being escalated by sample size alone.
    D_SUBSTANTIAL = 0.161

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        test_name = "Kolmogorov-Smirnov (median-centred)"

        if data_arrays is None or len(data_arrays) < 2:
            # One group: there is no second shape to compare against.
            #
            # `not_applicable` is load-bearing, not decoration. Without it the
            # audit trail records this as result="pass" and the report comes
            # back with confidence 1.0 -- which is the very defect this
            # validator was written to remove, reintroduced in its own
            # no-op branch. Reachable two ways: a single-group rank-test
            # payload, and any paired design, where analysis_arrays has
            # already collapsed to the one array of differences before the
            # dispatch loop runs. IndependenceValidator sets the same flag.
            return {
                "violated": False,
                "not_applicable": True,
                "test_name": test_name,
                "details": "Fewer than two groups; no shape comparison applies.",
            }

        # Drop non-finite values rather than letting them propagate. A NaN
        # reaching stats.ks_2samp yields a NaN p-value, and `if p < alpha` is
        # False for NaN -- which would read as "assumption satisfied" on data
        # that was never actually compared.
        cleaned = [np.asarray(a, dtype=float) for a in data_arrays]
        cleaned = [a[np.isfinite(a)] for a in cleaned]
        sizes = [int(a.size) for a in cleaned]

        too_small = [i for i, n in enumerate(sizes) if n < self.MIN_N_FOR_SHAPE]
        if too_small:
            # Fail loud, but as a warning, not a block. Reporting this as a
            # clean pass is what the absent validator used to do; reporting it
            # as critical would block small-sample rank tests, which are the
            # main legitimate use of these tests in the first place.
            return {
                "violated": True,
                "test_name": test_name,
                "severity": "warning",
                "message": (
                    f"Equal-shape assumption could NOT be checked: group sizes "
                    f"{sizes} include a group below n={self.MIN_N_FOR_SHAPE}. "
                    f"This is an unverified assumption, not a satisfied one."
                ),
                "recommendation": (
                    # Deliberately free of '<', '>' and '&'. Violation messages
                    # and recommendations are passed to reportlab's Paragraph
                    # mini-XML parser by the PDF report generator, which treats
                    # a bare '<' as an unclosed tag and made
                    # /api/guardian/export/pdf/ return HTTP 500 for every rank
                    # test with a group below MIN_N_FOR_SHAPE. Prose rather
                    # than an escaped entity, so it stays safe in every
                    # renderer this string reaches.
                    "Interpret the result as a test of stochastic dominance -- "
                    "whether values from one group tend to exceed values from "
                    "the other -- rather than as a comparison of medians, since "
                    "the shift-only assumption that makes it a median test is "
                    "unverified here."
                ),
                "visual_data": {"group_sizes": sizes, "checked": False},
            }

        centred = [a - np.median(a) for a in cleaned]

        pairs = [
            (i, j) for i in range(len(centred)) for j in range(i + 1, len(centred))
        ]
        alpha_adj = alpha / len(pairs)  # Bonferroni across pairwise comparisons

        results = []
        for i, j in pairs:
            stat, p_value = stats.ks_2samp(centred[i], centred[j])
            results.append((float(stat), float(p_value), i, j))

        if any(not np.isfinite(p) for _, p, _, _ in results):
            return {
                "violated": True,
                "test_name": test_name,
                "severity": "warning",
                "message": (
                    "Equal-shape assumption could NOT be checked: the "
                    "Kolmogorov-Smirnov comparison returned a non-finite "
                    "p-value. This is an unverified assumption, not a "
                    "satisfied one."
                ),
                "recommendation": (
                    "Inspect the group distributions directly before "
                    "interpreting this test as a comparison of medians."
                ),
                "visual_data": {"group_sizes": sizes, "checked": False},
            }

        # Report the worst pair, ranked by D. D is the effect size of the shape
        # discrepancy; p only says whether it is distinguishable from sampling
        # noise at these sample sizes.
        d_stat, p_value, gi, gj = max(results, key=lambda r: r[0])
        violating = [r for r in results if r[1] < alpha_adj]

        if violating:
            d_stat, p_value, gi, gj = max(violating, key=lambda r: r[0])
            severity = "warning" if d_stat > self.D_SUBSTANTIAL else "minor"

            iqrs = [float(np.subtract(*np.percentile(a, [75, 25]))) for a in cleaned]
            nonzero = [v for v in iqrs if v > 0]
            spread_ratio = (max(nonzero) / min(nonzero)) if len(nonzero) == len(iqrs) and nonzero else None
            spread_note = (
                f" Interquartile spread differs by {spread_ratio:.2f}x."
                if spread_ratio is not None and spread_ratio > 1.5
                else ""
            )

            return {
                "violated": True,
                "test_name": test_name,
                "severity": severity,
                "p_value": p_value,
                "statistic": d_stat,
                "message": (
                    f"Groups {gi + 1} and {gj + 1} have different distribution "
                    f"shapes after median-centring (D={d_stat:.3f}, "
                    f"p={p_value:.4g}).{spread_note} A rank test on these groups "
                    f"tests whether one group's values tend to exceed the "
                    f"other's, which is not the same as a difference in medians."
                ),
                "recommendation": (
                    "Report the result as stochastic dominance rather than as a "
                    "median difference, and give a Hodges-Lehmann shift estimate "
                    "with its confidence interval, or compare the distributions "
                    "directly (e.g. quantile comparison) instead of summarising "
                    "them by one location number."
                ),
                "visual_data": self._generate_visual_data(cleaned, results),
            }

        return {
            "violated": False,
            "test_name": test_name,
            "p_value": p_value,
            "statistic": d_stat,
        }

    def _generate_visual_data(
        self, cleaned: List[np.ndarray], results: List
    ) -> Dict:
        """Per-group shape descriptors plus every pairwise KS comparison."""
        return {
            "group_sizes": [int(a.size) for a in cleaned],
            "medians": [float(np.median(a)) for a in cleaned],
            "iqrs": [float(np.subtract(*np.percentile(a, [75, 25]))) for a in cleaned],
            "skewness": [float(stats.skew(a)) for a in cleaned],
            "pairwise_ks": [
                {"groups": [i + 1, j + 1], "D": d, "p_value": p}
                for d, p, i, j in results
            ],
            "checked": True,
        }


class IndependenceValidator:
    """Validates independence of observations via lag-1 autocorrelation.

    NOTE: This is **not** the Durbin-Watson test. Durbin-Watson is
    defined on regression residuals (DW = sum((e_i - e_{i-1})^2) / sum(e_i^2),
    range 0-4); it is meaningful only after a model has been fit. The
    pre-test independence check below works on the *raw* observations
    via the lag-1 Pearson autocorrelation r_1 = corr(x[1:], x[:-1])
    and tests H0: rho_1 = 0 against H1: rho_1 != 0 using
    scipy.stats.pearsonr's exact t-distribution p-value.

    IMPORTANT ASSUMPTION: this test only makes sense when the data
    rows represent successive time points or sequential measurements.
    If the rows have been shuffled or come from independent units
    in unspecified order, the lag-1 autocorrelation is meaningless.

    Because the lag-1 statistic is a function of *arrangement*, running
    it on cross-sectional/omics data can report a spurious "violation"
    that is an artifact of how the samples happen to be ordered. The
    validator is therefore gated: the caller declares whether the
    observation order is temporal/sequential (``sequential_order``).
    When the order is not declared sequential, the check returns a
    "not applicable -- independence is a matter of study design" result
    rather than a lag-1 verdict. Called directly with no flag
    (``sequential_order=None``) it preserves the original behaviour so
    that unit tests of the lag-1 mathematics remain valid.
    """

    def validate(
        self,
        data_arrays: List[np.ndarray],
        alpha: float = 0.05,
        sequential_order: Optional[bool] = None,
    ) -> Dict:
        """Test for lag-1 serial autocorrelation in each input array.

        Returns a violation if any group's lag-1 autocorrelation is
        statistically significant at the given alpha AND practically
        meaningful (|r| > 0.3 warning / |r| > 0.5 critical).

        ``sequential_order`` gates the check:
          * ``False`` -- the caller has declared the observation order is
            not temporal/sequential (e.g. a cross-sectional or omics
            matrix), so the lag-1 test is not informative and the
            validator returns a non-violating "not applicable" result
            that refers independence to study design.
          * ``True`` / ``None`` -- run the lag-1 autocorrelation test.
            ``None`` (the default when the validator is called directly,
            i.e. order unspecified) preserves the historical behaviour.
        """
        if sequential_order is False:
            return {
                "violated": False,
                "not_applicable": True,
                "test_name": "Independence (study design)",
                "statistic": None,
                "p_value": None,
                "message": (
                    "Independence was not auto-tested: the lag-1 "
                    "autocorrelation check is only informative for data "
                    "in time/sequence order, and the observation order "
                    "was not declared sequential. Independence here is a "
                    "matter of study design (randomisation, clustering, "
                    "repeated measures)."
                ),
                "recommendation": (
                    "Confirm from the study design that observations are "
                    "independent. If the rows are a genuine time series or "
                    "repeated-measures sequence, re-run declaring the "
                    "observation order as sequential to enable the lag-1 "
                    "autocorrelation check."
                ),
            }

        max_autocorr = 0.0
        max_p = 1.0
        for arr in data_arrays:
            if len(arr) < 10:
                continue

            # Lag-1 Pearson autocorrelation with proper p-value.
            # scipy.stats.pearsonr returns (r, two-sided p-value) using
            # the t-distribution under H0: r = 0.
            try:
                r, p = stats.pearsonr(arr[:-1], arr[1:])
            except Exception:
                continue
            autocorr = float(r)
            p_value = float(p)

            if abs(autocorr) > abs(max_autocorr):
                max_autocorr = autocorr
                max_p = p_value

            # Combine practical-significance threshold with statistical
            # significance: an autocorrelation of |r|=0.3 in n=10000 may
            # be statistically significant but practically negligible,
            # while |r|=0.6 in n=12 may not reach significance but is
            # likely a structural problem. Require BOTH p < alpha and
            # |r| > 0.3 to flag a warning, p < alpha and |r| > 0.5 for
            # critical.
            if p_value < alpha and abs(autocorr) > 0.3:
                severity = "critical" if abs(autocorr) > 0.5 else "warning"
                return {
                    "violated": True,
                    "test_name": "Lag-1 Autocorrelation (Pearson)",
                    "severity": severity,
                    "statistic": autocorr,
                    "p_value": p_value,
                    "message": (
                        f"Independence assumption violated "
                        f"(lag-1 r={autocorr:.3f}, p={p_value:.4f}). "
                        "NOTE: assumes rows are in time/sequence order; "
                        "ignore if data are cross-sectional."
                    ),
                    "recommendation": (
                        "Check for time-series structure or repeated "
                        "measures; if data are cross-sectional, this "
                        "test is not informative — use Expert Mode to "
                        "proceed."
                    ),
                }

        return {
            "violated": False,
            "test_name": "Lag-1 Autocorrelation (Pearson)",
            "statistic": max_autocorr if abs(max_autocorr) > 0 else None,
            "p_value": max_p if abs(max_autocorr) > 0 else None,
            "message": (
                "No significant lag-1 autocorrelation detected. "
                "(Result assumes rows are in time/sequence order.)"
            ),
        }


class OutlierDetector:
    """Detects and reports outliers in the data"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Detect outliers using IQR and Z-score methods"""

        all_outliers = []

        for i, arr in enumerate(data_arrays):
            # IQR method
            Q1, Q3 = np.percentile(arr, [25, 75])
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR

            outliers_iqr = arr[(arr < lower_bound) | (arr > upper_bound)]

            # Z-score method (for normally distributed data)
            z_scores = np.abs(stats.zscore(arr))
            outliers_z = arr[z_scores > 3]

            # Combine both methods
            outliers = np.unique(np.concatenate([outliers_iqr, outliers_z]))

            if len(outliers) > 0:
                all_outliers.append(
                    {
                        "group": i + 1,
                        "count": len(outliers),
                        "percentage": len(outliers) / len(arr) * 100,
                        "values": outliers.tolist(),
                    }
                )

        if all_outliers:
            total_percentage = np.mean([o["percentage"] for o in all_outliers])

            # Severity based on percentage of outliers
            if total_percentage > 10:
                severity = "critical"
            elif total_percentage > 5:
                severity = "warning"
            else:
                severity = "minor"

            return {
                "violated": True,
                "test_name": "Outlier Detection (IQR + Z-score)",
                "severity": severity,
                "message": f"{total_percentage:.1f}% of data are outliers",
                "recommendation": "Investigate outliers, consider robust methods or transformation",
                "visual_data": {"outliers": all_outliers},
            }

        return {"violated": False}


class SampleSizeValidator:
    """Validates adequate sample size for the test"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Check if sample size is adequate for the test"""

        min_size = min(len(arr) for arr in data_arrays)

        # Evidence-based sample size thresholds:
        # - n < 3: Cannot compute variance reliably
        # - n < 20: Small sample; CLT approximations may not hold well
        # - n >= 20: Generally adequate for parametric tests (common threshold in literature)
        # Reference: Central Limit Theorem convergence rates improve significantly around n=20-30

        if min_size < 3:
            return {
                "violated": True,
                "test_name": "Sample Size Check",
                "severity": "critical",
                "message": f"Sample size too small (n={min_size})",
                "recommendation": "Minimum n=3 required, n≥20 recommended for parametric tests",
            }
        elif min_size < 20:
            return {
                "violated": True,
                "test_name": "Sample Size Check",
                "severity": "warning",
                "message": f"Small sample size (n={min_size}) may affect test validity",
                "recommendation": "Consider non-parametric tests or collect more data",
            }

        return {"violated": False}


class ModalityDetector:
    """Detects multimodality in distributions"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Detect multimodality using Hartigan's dip test approximation"""

        for arr in data_arrays:
            # Skip if sample too small
            if len(arr) < 20:
                continue

            # Simple peak detection in KDE (optimized with fewer points)
            kde = stats.gaussian_kde(arr)
            x_range = np.linspace(arr.min(), arr.max(), 50)  # Reduced from 200 to 50
            density = kde(x_range)

            # Find peaks
            peaks = []
            for i in range(1, len(density) - 1):
                if density[i] > density[i - 1] and density[i] > density[i + 1]:
                    peaks.append(i)

            if len(peaks) > 1:
                # Check if peaks are significant
                peak_heights = [density[p] for p in peaks]
                max_height = max(peak_heights)
                significant_peaks = [h for h in peak_heights if h > max_height * 0.3]

                if len(significant_peaks) > 1:
                    return {
                        "violated": True,
                        "test_name": "Modality Detection",
                        "severity": "warning",
                        "message": f"Distribution appears multimodal ({len(significant_peaks)} modes)",
                        "recommendation": "Consider analyzing subgroups separately",
                        "visual_data": {"kde_x": x_range.tolist(), "kde_y": density.tolist(), "peaks": peaks},
                    }

        return {"violated": False}


class LinearityValidator:
    """
    Validates linearity assumption for regression and correlation

    Uses residual analysis to detect non-linear relationships:
    - Fits linear regression and examines residuals
    - Applies runs test to detect patterns in residuals
    - Calculates R-squared for polynomial fit comparison
    """

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """
        Check linearity assumption using residual analysis

        For regression: requires exactly 2 arrays (X and Y)
        For correlation: also requires 2 arrays
        """

        if len(data_arrays) != 2:
            return {"violated": False}  # Not applicable

        x = data_arrays[0]
        y = data_arrays[1]

        if len(x) < 3:
            return {
                "violated": True,
                "test_name": "Linearity Check",
                "severity": "critical",
                "message": "Insufficient data for linearity assessment",
                "recommendation": "Collect more data points (n ≥ 10)",
            }

        # Fit linear regression
        from sklearn.linear_model import LinearRegression
        from sklearn.preprocessing import PolynomialFeatures
        from sklearn.metrics import r2_score

        # Reshape data for sklearn
        X = x.reshape(-1, 1)

        # Fit linear model
        linear_model = LinearRegression()
        linear_model.fit(X, y)
        y_pred_linear = linear_model.predict(X)
        residuals = y - y_pred_linear
        r2_linear = r2_score(y, y_pred_linear)

        # Fit quadratic model to compare
        poly_features = PolynomialFeatures(degree=2)
        X_poly = poly_features.fit_transform(X)
        poly_model = LinearRegression()
        poly_model.fit(X_poly, y)
        y_pred_poly = poly_model.predict(X_poly)
        r2_poly = r2_score(y, y_pred_poly)

        # Calculate improvement in R² with polynomial fit
        r2_improvement = r2_poly - r2_linear

        # An exact fit is direct positive evidence of linearity -- the line reproduces y to
        # the last representable bit -- and it must be read BEFORE the runs test, because the
        # runs test applied to rounding dust is what produced the defect. Measured on the
        # deployed build: 61.8% of perfectly linear datasets came back "Linearity violated"
        # at severity CRITICAL, under a message reading "R^2 improvement with polynomial:
        # 0.000". The R^2 comparison was right and said 0.000; the runs test was reading the
        # sign pattern of 1e-14 residuals (p = 6.1e-07 on y = x/3 + 1/7).
        #
        # Unlike HomoscedasticityValidator, which reports NOT EVALUATED for the same input,
        # this is a genuine pass: R^2 = 1 answers the linearity question outright, and more
        # strongly than the runs test could.
        if _fit_is_exact(y, residuals):
            # The fit LOOKS exact. Whether that is a fact about the data or only about float64
            # spacing is decided here, and ONLY here. NESTING MATTERS: applied before the
            # exactness test this gate also swallowed data with real signal left to evaluate
            # (measured -- the growing-variance case at offset 1e9, whose noise is four orders
            # of magnitude above the spacing, went from correctly CRITICAL to "not evaluated").
            #
            # MEASURED: on genuinely quadratic data (y = x + 4e-5(x-30)^2, true R^2 = 0.9999996)
            # carrying a 1e12 offset, the branch below returned a PASS asserting "reproduces y
            # exactly ... (R^2 = 1)" -- an affirmative claim about the data that is false, which
            # is worse than the false accusation it replaced.
            if not _variation_is_resolvable(y):
                return {
                    "violated": False,
                    "not_applicable": True,
                    "test_name": "Linearity Check (Residual Analysis)",
                    "message": "Linearity was not evaluated. " + _PRECISION_EXHAUSTED_DETAIL,
                }
            return {
                "violated": False,
                "test_name": "Linearity Check (Residual Analysis)",
                "message": (
                    "Linearity assumption satisfied: the linear fit reproduces y to within "
                    "floating-point representation error, so the fitted line accounts for the "
                    "data exactly. The residual runs test is not meaningful on residuals this "
                    "size and was not used."
                ),
            }

        # Runs test on residuals to detect patterns
        runs_test_result = self._runs_test(residuals)

        # Check sample size - runs test requires n ≥ 20 for adequate statistical power
        # For n < 20, we'll still run tests but warn about low power
        n = len(x)
        low_power_warning = None
        if n < 20:
            low_power_warning = (
                f"Small sample size (n={n}) limits statistical power for linearity testing. "
                f"Runs test may fail to detect non-linearity with fewer than 20 observations. "
                f"Visual inspection of residual plots recommended."
            )

        # Determine if linearity is violated
        # Criteria:
        # 1. Polynomial fit improves R² significantly (> 0.05 for warning, > 0.10 for critical)
        # 2. Runs test detects pattern in residuals (primary indicator, but requires n ≥ 20)
        #
        # Statistical Note: Runs test has low power when n < 20
        # - At n=8, even perfect quadratic patterns may not reach significance (p<0.05)
        # - At n=20+, runs test reliably detects non-linear patterns
        # - We do NOT lower thresholds to compensate - that would be statistically unsound

        violated = False
        severity = "minor"

        # Runs test is primary indicator of non-linearity (reliable for n ≥ 20)
        if runs_test_result["pattern_detected"]:
            violated = True
            severity = "critical"  # Pattern in residuals is serious

        # R² improvement provides additional evidence
        # Thresholds based on standard statistical practice:
        # - 10%+ improvement: Strong evidence of non-linearity
        # - 5-10% improvement: Moderate evidence (warning level)
        if r2_improvement > 0.10:  # Polynomial explains 10%+ more variance
            violated = True
            severity = "critical"
        elif r2_improvement > 0.05:  # Polynomial explains 5-10% more variance
            violated = True
            if severity != "critical":  # Don't downgrade if runs test already critical
                severity = "warning"

        if violated:
            # Build message with low power warning if applicable
            base_message = f"Linearity violated (R² improvement with polynomial: {r2_improvement:.3f})"
            if low_power_warning:
                message = f"{base_message}. NOTE: {low_power_warning}"
            else:
                message = base_message

            return {
                "violated": True,
                "test_name": "Linearity Check (Residual Analysis)",
                "severity": severity,
                "p_value": runs_test_result.get("p_value"),
                "statistic": r2_improvement,
                "message": message,
                "recommendation": "Consider polynomial regression, transformation (log, sqrt), or GAM",
                "visual_data": {
                    "x": x.tolist(),
                    "y": y.tolist(),
                    "y_pred_linear": y_pred_linear.tolist(),
                    "y_pred_poly": y_pred_poly.tolist(),
                    "residuals": residuals.tolist(),
                    "r2_linear": float(r2_linear),
                    "r2_poly": float(r2_poly),
                    "r2_improvement": float(r2_improvement),
                    "sample_size": n,
                    "runs_test_p_value": runs_test_result.get("p_value"),
                },
            }

        # No violation detected, but still warn about low power if applicable
        base_message = f"Linearity assumption satisfied (R² linear: {r2_linear:.3f})"
        if low_power_warning:
            message = f"{base_message}. NOTE: {low_power_warning}"
        else:
            message = base_message

        return {
            "violated": False,
            "test_name": "Linearity Check (Residual Analysis)",
            "statistic": r2_improvement,
            "message": message,
            "visual_data": {"sample_size": n, "runs_test_p_value": runs_test_result.get("p_value")},
        }

    def _runs_test(self, residuals: np.ndarray) -> Dict:
        """
        Wald-Wolfowitz runs test to detect non-random patterns in residuals.

        Residuals are dichotomized about their median and the number of runs is compared
        with the number expected if the signs were in random order. Too few runs means the
        residuals cluster -- the signature of a systematic (e.g. curved) departure from the
        fitted model.

        Where the test is undefined it returns p_value = None. It used to return 0.0 and
        1.0 in those two branches, and the caller reads `pattern_detected` to decide whether
        to raise a CRITICAL linearity violation:

          - `n1 == 0` (every residual on one side of the median) returned p = 0.0 and
            pattern_detected = True. A perfectly CONSTANT response gives residuals that are
            all exactly zero, so all of them equal the median, so n1 = 0 -- and Guardian
            declared a flat line "critically non-linear" with a p-value of zero.
          - `variance_runs == 0` returned p = 1.0 and pattern_detected = False: a clean bill
            of health from a test that could not be computed.

        Neither number was a probability of anything.
        """
        residuals = np.asarray(residuals, dtype=float)
        median = np.median(residuals)

        # Ties with the median carry no directional information. The standard median-based
        # runs test discards them rather than silently lumping them in below (which is what
        # `residuals > median` did, and why constant residuals came out as "all below").
        signs = residuals[residuals != median]
        binary = (signs > median).astype(int)

        n1 = int(np.sum(binary == 1))
        n2 = int(np.sum(binary == 0))
        n = n1 + n2

        undefined = {"pattern_detected": None, "p_value": None, "runs": None, "expected_runs": None}

        if n1 == 0 or n2 == 0:
            return {
                **undefined,
                "reason": (
                    "Every residual lies on the same side of its own median (or all residuals "
                    "are identical), so there is no sequence of signs to count runs in."
                ),
            }

        # Count runs in the tie-free sequence
        runs = 1
        for i in range(1, len(binary)):
            if binary[i] != binary[i - 1]:
                runs += 1

        # Expected runs and variance under the null hypothesis of random order
        expected_runs = (2 * n1 * n2) / n + 1
        variance_runs = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n**2 * (n - 1)) if n > 1 else 0.0

        if variance_runs <= 0:
            return {
                **undefined,
                "reason": (
                    f"The null distribution of the number of runs has zero variance at "
                    f"n1={n1}, n2={n2}: every ordering gives the same number of runs, so no "
                    f"ordering is more surprising than any other."
                ),
            }

        # Z-score, with the usual continuity correction (runs is a discrete count).
        deviation = runs - expected_runs
        correction = -0.5 if deviation > 0 else 0.5
        z_score = (deviation + correction) / np.sqrt(variance_runs) if abs(deviation) > 0.5 else 0.0

        # Two-tailed p-value
        p_value = 2 * (stats.norm.sf(abs(z_score)))

        # Pattern detected if the run count is surprising in either direction
        pattern_detected = bool(p_value < 0.05)

        return {
            "pattern_detected": pattern_detected,
            "p_value": float(p_value),
            "runs": runs,
            "expected_runs": float(expected_runs),
            "n_tied_with_median": int(len(residuals) - n),
        }


#: How far an OLS fit's residuals may sit above the floating-point REPRESENTATION floor and
#: still be treated as carrying no information, in units of machine epsilon relative to
#: max|y|. The spacing of float64 near a value v is eps*|v|, so eps*max|y| is the absolute
#: size of the rounding dust an exactly linear y unavoidably carries.
#:
#: MEASURED, and the earlier figure in this file was wrong. Over n in 10..20,000 and five
#: x-distributions (arange, uniform, linspace, a badly conditioned lognormal(0,8), and a
#: single-leverage-point design), the worst observed dust for an exactly linear y is
#: **696.6 ULPs**, not the 21.9 ULPs previously recorded here -- the old sweep never reached
#: the ill-conditioned corner, so the constant it justified (1000) sat 1.4x above true
#: worst-case dust rather than the 46x claimed. 5000 is 7.2x above the measured worst case.
_EXACT_FIT_ULPS = 5000

#: How large the representation floor may be RELATIVE TO THE VARIATION in y before the phrase
#: "the fit is exact" stops meaning anything.
#:
#: This is the shift-invariance condition, and it is the one that was missing. _EXACT_FIT_ULPS
#: alone compares residuals to the MAGNITUDE of y; both diagnostics ask about its VARIATION.
#: Adding a constant to y changes no regression diagnostic but multiplies the first quantity,
#: so a large offset silently raised the bar until genuine findings fell under it. MEASURED on
#: main + e442b84 + 5c87d00, textbook growing variance (n=60, sd 0.002->0.045, 23.5x fan), with
#: R^2 identical to ten decimal places at every offset:
#:
#:     offset 0 .. 1e11  -> confidence 0.306, can_proceed False, homoscedasticity CRITICAL
#:     offset 1e12, 1e13 -> confidence 0.444, can_proceed TRUE,  homoscedasticity ABSENT
#:
#: and on genuinely quadratic data (true R^2 = 0.9999996) at offset 1e12 the linearity check
#: returned a PASS reading "reproduces y exactly ... (R^2 = 1)" -- an affirmative statement
#: about the data that is false.
#:
#: MEASURED separation: legitimate exact fits reach floor/ptp(y) = 6.97e-12 at worst (80
#: samples); the signal cases being wrongly silenced sit at 1.64e-05 (epoch-nanosecond
#: timestamps) and 9.41e-04 (the growing-variance case above). 1e-9 is 143x above the former
#: and 16,000x below the latter.
_RESOLVABLE_VARIATION_RATIO = 1e-9


def _residual_information_floor(y: np.ndarray) -> float:
    """Absolute residual size below which residuals cannot be told from rounding error."""
    scale = float(np.max(np.abs(y))) if y.size else 0.0
    return _EXACT_FIT_ULPS * float(np.finfo(float).eps) * scale


def _variation_is_resolvable(y: np.ndarray) -> bool:
    """True when the representation floor is negligible against the variation in *y*.

    When it is FALSE, y carries a constant offset (or a spread) so large that floating-point
    spacing has eaten a non-trivial fraction of the signal, and neither "the fit is exact" nor
    "the residuals show structure" can be asserted from this data. The honest answer there is
    that we cannot evaluate it -- and that centring y makes it evaluable again.

    Deliberately NOT shift-invariant: np.ptp is unchanged by adding a constant while the floor
    is not, and that asymmetry is exactly what this predicate exists to detect.
    """
    spread = float(np.ptp(y)) if y.size else 0.0
    if spread == 0.0:
        # A constant y has no variation to explain. R^2 is 0/0, not 1.
        return False
    return _residual_information_floor(y) < _RESOLVABLE_VARIATION_RATIO * spread


def _fit_is_exact(y: np.ndarray, residuals: np.ndarray) -> bool:
    """True when an OLS fit reproduces *y* to within floating-point representation error.

    When it does, the residuals are rounding dust rather than measurement error, and every
    residual-based diagnostic downstream is reading that dust as scientific structure.
    Measured on the deployed v1.2.0 build, over 500 perfect lines y = ax + b (random a, b,
    n = 50): Breusch-Pagan reported heteroscedasticity for ~77% of them, mostly "critical",
    and the runs test reported a critical linearity violation for ~62%, under a message
    reading "R^2 improvement with polynomial: 0.000" -- the message contradicting its own
    verdict, because the runs test, not the R^2 comparison, is what fired.

    This is those TESTS being undefined on this input, not a defect in our implementation of
    them: statsmodels' ``het_breuschpagan`` also declares a perfect line heteroscedastic
    (LM = 30.4127, p = 3.49e-08 on y = 1.023602x + 0.384822 over x = arange(50)) and returns
    nan when the residuals are exactly zero. NOTE: an earlier version of this docstring claimed
    statsmodels agreed with our Breusch-Pagan "to every digit". That did NOT reproduce -- the
    two fit routines produce different dust vectors (1.27e-14 vs 7.1e-15) and disagree on the
    p-value. The conclusion is unchanged and stronger: an independent mature implementation
    fails the same way, so the test itself is undefined here.

    ONE predicate, used by both validators. The two defects were the same defect in two places,
    and they were found one at a time.

    This answers ONLY "are the residuals at the representation floor". It deliberately does NOT
    answer "is that floor meaningful" -- see :func:`_variation_is_resolvable`, which callers
    must consult INSIDE this branch. Splitting them is what makes the guard shift-invariant.
    """
    if not y.size:
        return False
    return float(np.max(np.abs(residuals))) <= _residual_information_floor(y)


#: Shared wording for the case where floating-point precision, not the data, decides the answer.
_PRECISION_EXHAUSTED_DETAIL = (
    "The values in y are so large relative to how much they vary that floating-point "
    "precision has consumed a meaningful fraction of the signal, so the residuals cannot be "
    "separated from rounding error. This assumption was NOT evaluated. Subtracting a constant "
    "from y (centring it) does not change any regression result and makes this checkable."
)


class HomoscedasticityValidator:
    """
    Validates homoscedasticity (constant variance) assumption for regression

    Uses Breusch-Pagan test and visual inspection of residuals
    """

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """
        Check homoscedasticity using Breusch-Pagan test

        Tests if variance of residuals is constant across predicted values
        """

        if len(data_arrays) != 2:
            return {"violated": False}  # Not applicable

        x = data_arrays[0]
        y = data_arrays[1]

        if len(x) < 10:
            return {"violated": False}  # Skip for small samples

        # Fit linear regression
        from sklearn.linear_model import LinearRegression

        X = x.reshape(-1, 1)
        model = LinearRegression()
        model.fit(X, y)
        y_pred = model.predict(X)
        residuals = y - y_pred

        # Breusch-Pagan is undefined when the fit is EXACT -- see _fit_is_exact for the
        # measurement. The `var_ratio is None` branch below is a SYMPTOM of this condition,
        # not a separate one, which is why fixing only that branch's message (e442b84)
        # converted a crash into a confident false accusation instead of removing one.
        #
        # NOT EVALUATED rather than "pass", and the asymmetry with LinearityValidator (which
        # does pass here) is deliberate: an exact fit is direct positive evidence that the
        # relationship IS linear, but it is not evidence that variance is constant -- there is
        # no residual variance to be constant. Passing would be a vacuous certification, the
        # false clean bill this validator exists to prevent.
        if _fit_is_exact(y, residuals):
            # See LinearityValidator for why this gate is nested rather than leading. MEASURED
            # on main + e442b84 + 5c87d00: textbook growing variance, 23.5x fan, R^2 identical
            # to ten decimal places at every offset -- the branch below silenced a genuine
            # CRITICAL finding and flipped can_proceed False -> True purely because y carried a
            # 1e12 offset.
            if not _variation_is_resolvable(y):
                return {
                    "violated": False,
                    "not_applicable": True,
                    "test_name": "Breusch-Pagan Test",
                    "details": (
                        "Homoscedasticity was not evaluated. " + _PRECISION_EXHAUSTED_DETAIL
                    ),
                }
            return {
                "violated": False,
                "not_applicable": True,
                "test_name": "Breusch-Pagan Test",
                "details": (
                    "The regression reproduces y to within floating-point representation error, "
                    "so the residuals carry no information and the Breusch-Pagan test is "
                    "undefined. There is no residual variance for the test to find structure in; "
                    "heteroscedasticity was not evaluated."
                ),
            }

        # Breusch-Pagan test
        # Regress squared residuals on X to test for heteroscedasticity
        residuals_squared = residuals**2

        bp_model = LinearRegression()
        bp_model.fit(X, residuals_squared)
        r2_bp = bp_model.score(X, residuals_squared)

        # Test statistic: n * R²
        n = len(residuals)
        bp_statistic = n * r2_bp

        # Under null hypothesis, follows chi-square(1) distribution
        p_value = stats.chi2.sf(bp_statistic, df=1)

        if p_value < alpha:
            # Check variance ratio across fitted values
            sorted_indices = np.argsort(y_pred)
            first_half = residuals[sorted_indices[: n // 2]]
            second_half = residuals[sorted_indices[n // 2 :]]

            # The `+ 1e-10` here was not a rounding guard, it was a verdict generator: when the
            # first half has zero variance the ratio becomes ~1e10, which sails past the > 4.0
            # threshold below and is reported as CRITICAL heteroscedasticity. The severity was
            # manufactured by the epsilon rather than measured from the data.
            var_first = np.var(first_half, ddof=1)
            var_second = np.var(second_half, ddof=1)
            var_ratio = var_second / var_first if var_first > 0 else None

            # Determine severity using evidence-based thresholds
            # Variance ratio > 4 or < 0.25 indicates severe heteroscedasticity
            # Variance ratio > 2 or < 0.5 indicates moderate heteroscedasticity
            # Reference: Consistent with Box (1954) and standard regression diagnostics
            if var_ratio is None:
                # One half of the fitted range has no residual variance at all. The Breusch-Pagan
                # test above already rejected homoscedasticity, so the violation is real -- but
                # the ratio that grades its SEVERITY cannot be computed, so it is not graded.
                severity = "warning"
            elif var_ratio > 4.0 or var_ratio < 0.25:
                severity = "critical"
            elif var_ratio > 2.0 or var_ratio < 0.5:
                severity = "warning"
            else:
                severity = "minor"

            return {
                "violated": True,
                "test_name": "Breusch-Pagan Test",
                "severity": severity,
                "p_value": float(p_value),
                "statistic": float(bp_statistic),
                # var_ratio is None on an intended path (see above) -- formatting it unguarded
                # raised TypeError out of validate(), which the validator loop does not catch, so
                # the whole /api/guardian/check/ request 500'd. Say what is true instead.
                "message": (
                    f"Homoscedasticity violated (BP test p={p_value:.4f}, "
                    f"variance ratio={var_ratio:.2f})"
                    if var_ratio is not None else
                    f"Homoscedasticity violated (BP test p={p_value:.4f}; variance ratio not "
                    f"computable — one half of the fitted range has zero residual variance, so "
                    f"the violation is real but its severity is not graded)"
                ),
                "recommendation": "Consider weighted least squares, robust regression, or transformation",
                "visual_data": {
                    "fitted_values": y_pred.tolist(),
                    "residuals": residuals.tolist(),
                    "variance_ratio": None if var_ratio is None else float(var_ratio),
                },
            }

        return {
            "violated": False,
            "test_name": "Breusch-Pagan Test",
            "p_value": float(p_value),
            "statistic": float(bp_statistic),
        }
