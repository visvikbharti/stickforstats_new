"""
Statistical Guardian Core System
================================
Automatic assumption validation system that helps prevent statistical errors.
Validates assumptions before analysis and provides actionable recommendations.
"""

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
            "difference_in_differences": ["independence"],  # Parallel trends checked separately
            "did": ["independence"],  # Alias
            "propensity_score": ["independence"],  # Overlap checked in matching
            "psm": ["independence"],  # Alias for propensity score matching
            "mediation": ["normality", "independence", "linearity"],
            "iv": ["independence"],  # Instrumental variables
            # Bayesian tests
            "bayesian_t_test": ["normality", "independence"],
            "bayesian_anova": ["normality", "independence"],
            "bayesian_correlation": ["independence"],
            # Survival analysis
            "survival": ["independence"],
            "cox_regression": ["independence"],
            # Factor analysis
            "factor_analysis": ["normality", "sample_size"],
            "pca": ["sample_size"],
        }

        # Initialize visualization and effect size calculators
        self.viz_generator = VisualizationGenerator()
        self.effect_calculator = EffectSizeCalculator()

        # Context-aware severity adjuster (v2)
        self.severity_adjuster = ContextualSeverityAdjuster()

    # Values of ``observation_order`` that mean "rows are in genuine
    # time/sequence order", which is the only situation in which the
    # lag-1 autocorrelation independence check is informative.
    _SEQUENTIAL_ORDER_VALUES = frozenset({
        "sequential", "temporal", "time", "timeseries",
        "time_series", "time-series", "ordered", "serial",
    })

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

        # A categorical test hands us a contingency TABLE plus string category
        # labels -- not numeric group arrays. Normality, variance homogeneity and
        # skewness are meaningless on that payload, and _prepare_data would build
        # a 2-D array and two string arrays that took _summarize_data down with
        # "only 0-dimensional arrays can be converted to Python scalars" -- a 500
        # that made the Guardian silently unavailable on every chi-square. Route
        # it instead to the assumption that actually governs a chi-square test:
        # the expected cell frequencies (Cochran's rule).
        if test_type in self._CONTINGENCY_TESTS:
            observed = self._extract_contingency(data)
            if observed is not None:
                return self._check_contingency(observed, test_type)

        # Prepare data
        data_arrays = self._prepare_data(data)

        # Resolve the design (one_sample / paired / independent for t_test;
        # between / repeated for anova) so downstream checks and recommendations
        # are design-correct rather than keyed on the collapsed test_type.
        design = self._normalize_design(test_type, design, data_arrays)

        # Get requirements for this test
        requirements = list(self.test_requirements.get(test_type, []))

        # A paired or one-sample t-test is a one-sample test (on the paired
        # differences, or on the single column). Homogeneity of variance between
        # two independent groups does not apply, so drop it rather than record a
        # meaningless "Satisfied" for a test that never ran.
        if design in ("one_sample", "paired") and "variance_homogeneity" in requirements:
            requirements.remove("variance_homogeneity")

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
                    violations.append(
                        AssumptionViolation(
                            assumption=req,
                            test_name=result["test_name"],
                            severity=result["severity"],
                            p_value=result.get("p_value"),
                            statistic=result.get("statistic"),
                            message=result["message"],
                            recommendation=result["recommendation"],
                            visual_evidence=result.get("visual_data"),
                        )
                    )
                    # Audit: record violation
                    audit_trail.append(
                        GuardianAuditEntry(
                            timestamp=now_iso,
                            assumption=req,
                            test_performed=result["test_name"],
                            result="violation",
                            severity=result["severity"],
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
                    group_sizes, test_type,
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

        # Determine if we can proceed
        critical_violations = [
            v for v in violations if v.severity == "critical"
        ]
        can_proceed = len(critical_violations) == 0

        # Get alternative tests if needed (design-aware)
        alternatives = self._get_alternatives(test_type, violations, design)

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

            visual_plots = self.viz_generator.generate_all_diagnostics(viz_data, violation_dicts, test_type)
            visual_evidence.update(visual_plots)
        except Exception as e:
            warnings.warn(f"Failed to generate visualizations: {str(e)}")
            visual_evidence["error"] = str(e)

        # Calculate effect sizes
        effect_size_report = None
        try:
            effect_size_report = self.effect_calculator.generate_effect_size_report(test_type, data_arrays)
        except Exception as e:
            warnings.warn(f"Failed to calculate effect sizes: {str(e)}")

        return GuardianReport(
            test_type=test_type,
            data_summary=self._summarize_data(data_arrays),
            assumptions_checked=requirements,
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
                    "skewness": float(stats.skew(flat)),
                    "kurtosis": float(stats.kurtosis(flat)),
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
            assumptions_checked=["expected_frequencies", "independence"],
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
        Runs test to detect non-random patterns in residuals

        The runs test checks if residuals above/below zero are randomly distributed.
        Too few runs suggests a pattern (non-linearity).
        """
        # Get median
        median = np.median(residuals)

        # Convert to binary sequence (above/below median)
        binary = (residuals > median).astype(int)

        # Count runs
        runs = 1
        for i in range(1, len(binary)):
            if binary[i] != binary[i - 1]:
                runs += 1

        # Expected runs under null hypothesis (random)
        n1 = np.sum(binary == 1)
        n2 = np.sum(binary == 0)
        n = len(binary)

        if n1 == 0 or n2 == 0:
            return {"pattern_detected": True, "p_value": 0.0}

        expected_runs = (2 * n1 * n2) / n + 1
        variance_runs = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n**2 * (n - 1))

        if variance_runs == 0:
            return {"pattern_detected": False, "p_value": 1.0}

        # Z-score
        z_score = (runs - expected_runs) / np.sqrt(variance_runs)

        # Two-tailed p-value
        p_value = 2 * (stats.norm.sf(abs(z_score)))

        # Pattern detected if too few runs (p < 0.05)
        pattern_detected = p_value < 0.05

        return {
            "pattern_detected": pattern_detected,
            "p_value": float(p_value),
            "runs": runs,
            "expected_runs": float(expected_runs),
        }


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

            var_ratio = np.var(second_half, ddof=1) / (np.var(first_half, ddof=1) + 1e-10)

            # Determine severity using evidence-based thresholds
            # Variance ratio > 4 or < 0.25 indicates severe heteroscedasticity
            # Variance ratio > 2 or < 0.5 indicates moderate heteroscedasticity
            # Reference: Consistent with Box (1954) and standard regression diagnostics
            if var_ratio > 4.0 or var_ratio < 0.25:
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
                "message": f"Homoscedasticity violated (BP test p={p_value:.4f}, variance ratio={var_ratio:.2f})",
                "recommendation": "Consider weighted least squares, robust regression, or transformation",
                "visual_data": {
                    "fitted_values": y_pred.tolist(),
                    "residuals": residuals.tolist(),
                    "variance_ratio": float(var_ratio),
                },
            }

        return {
            "violated": False,
            "test_name": "Breusch-Pagan Test",
            "p_value": float(p_value),
            "statistic": float(bp_statistic),
        }
