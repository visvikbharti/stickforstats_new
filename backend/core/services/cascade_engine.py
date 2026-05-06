"""
Autonomous Cascade Engine — Guardian-Powered Test Execution
============================================================
Executes statistical tests with automatic Guardian validation.
If assumptions fail, cascades to the best alternative test.

Author: StickForStats Development Team
Created: February 2026
Version: 2.0.0
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import logging

from ..guardian.guardian_core import GuardianCore, GuardianReport

logger = logging.getLogger(__name__)


@dataclass
class TestResult:
    """Result from executing a single statistical test."""

    test_name: str
    statistic: float
    p_value: float
    effect_size: Optional[float] = None
    effect_size_name: Optional[str] = None
    confidence_interval: Optional[Tuple[float, float]] = None
    degrees_of_freedom: Optional[float] = None
    additional: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CascadeStep:
    """Record of one step in the cascade process."""

    test_attempted: str
    guardian_passed: bool
    violations: List[str]
    alternatives_suggested: List[str]


@dataclass
class CascadeResult:
    """Complete result from cascade execution."""

    original_test: str
    final_test: str
    cascade_path: List[CascadeStep]
    n_cascades: int
    assumptions_satisfied: bool
    guardian_report: Optional[Dict[str, Any]]
    result: Optional[TestResult]
    confidence_score: float


class AutonomousCascadeEngine:
    """
    Executes statistical tests with automatic Guardian cascade.

    Flow:
    1. User requests test X
    2. Guardian checks assumptions for X
    3. If assumptions fail → get alternatives → try next best → repeat
    4. Execute the final test and return results with cascade path
    """

    # Map test names to Guardian test_type keys
    GUARDIAN_TEST_MAP = {
        "independent_t": "t_test",
        "welch_t": "t_test",
        "paired_t": "t_test",
        "one_sample_t": "t_test",
        "one_way_anova": "anova",
        "two_way_anova": "anova",
        "pearson": "pearson",
        "spearman": "pearson",  # Still check linearity etc.
        "kendall": "pearson",
        "linear_regression": "regression",
        "chi_square_independence": "chi_square",
        "fisher_exact": "chi_square",
        "mann_whitney_u": "mann_whitney",
        "kruskal_wallis": "kruskal_wallis",
        "wilcoxon_signed_rank": "mann_whitney",
    }

    # Alternative cascade chains
    CASCADE_ALTERNATIVES = {
        "independent_t": ["welch_t", "mann_whitney_u", "permutation_test"],
        "welch_t": ["mann_whitney_u", "permutation_test"],
        "paired_t": ["wilcoxon_signed_rank"],
        "one_sample_t": ["wilcoxon_signed_rank"],
        "one_way_anova": ["kruskal_wallis"],
        "pearson": ["spearman", "kendall"],
        "spearman": ["kendall"],
        "linear_regression": ["spearman", "kendall"],
        "chi_square_independence": ["fisher_exact"],
        "mann_whitney_u": [],  # Already non-parametric
        "kruskal_wallis": [],
        "wilcoxon_signed_rank": [],
        "fisher_exact": [],
    }

    def __init__(self):
        self.guardian = GuardianCore()

    def execute_with_cascade(
        self,
        data: Any,
        intended_test: str,
        alpha: float = 0.05,
        max_cascades: int = 3,
    ) -> CascadeResult:
        """
        Execute a test with automatic Guardian cascade.

        Args:
            data: dict of arrays, list of arrays, or single array
            intended_test: Name of the intended statistical test
            alpha: Significance level
            max_cascades: Maximum number of cascade attempts

        Returns:
            CascadeResult with final test, cascade path, and results
        """
        cascade_path = []
        current_test = intended_test
        tests_tried = set()

        for attempt in range(max_cascades + 1):
            if current_test in tests_tried:
                break
            tests_tried.add(current_test)

            # Run Guardian check
            guardian_type = self.GUARDIAN_TEST_MAP.get(current_test, current_test)
            try:
                guardian_report = self.guardian.check(data, guardian_type, alpha)
            except Exception as e:
                logger.warning(f"Guardian check failed for {current_test}: {e}")
                # If Guardian itself fails, try to execute anyway
                guardian_report = None

            violations = []
            alternatives = []
            passed = True

            if guardian_report:
                violations = [v.message for v in guardian_report.violations]
                alternatives = guardian_report.alternative_tests
                passed = guardian_report.can_proceed

            step = CascadeStep(
                test_attempted=current_test,
                guardian_passed=passed,
                violations=violations,
                alternatives_suggested=alternatives,
            )
            cascade_path.append(step)

            if passed or attempt == max_cascades:
                # Execute the test
                result = self._execute_test(data, current_test, alpha)
                confidence = guardian_report.confidence_score if guardian_report else 0.5

                return CascadeResult(
                    original_test=intended_test,
                    final_test=current_test,
                    cascade_path=cascade_path,
                    n_cascades=attempt,
                    assumptions_satisfied=passed,
                    guardian_report=self._report_to_dict(guardian_report) if guardian_report else None,
                    result=result,
                    confidence_score=confidence,
                )

            # Cascade to alternative
            alt_chain = self.CASCADE_ALTERNATIVES.get(current_test, [])
            # Also consider Guardian's suggestions
            all_alternatives = alt_chain + [a for a in alternatives if a not in alt_chain]

            next_test = None
            for alt in all_alternatives:
                if alt not in tests_tried:
                    next_test = alt
                    break

            if not next_test:
                # No more alternatives, execute current anyway
                result = self._execute_test(data, current_test, alpha)
                return CascadeResult(
                    original_test=intended_test,
                    final_test=current_test,
                    cascade_path=cascade_path,
                    n_cascades=attempt,
                    assumptions_satisfied=False,
                    guardian_report=self._report_to_dict(guardian_report) if guardian_report else None,
                    result=result,
                    confidence_score=guardian_report.confidence_score if guardian_report else 0.3,
                )

            current_test = next_test

        # Fallback: execute original test
        result = self._execute_test(data, intended_test, alpha)
        return CascadeResult(
            original_test=intended_test,
            final_test=intended_test,
            cascade_path=cascade_path,
            n_cascades=0,
            assumptions_satisfied=False,
            guardian_report=None,
            result=result,
            confidence_score=0.3,
        )

    def _execute_test(self, data: Any, test_name: str, alpha: float) -> Optional[TestResult]:
        """Execute the actual statistical test using scipy/statsmodels."""
        data_arrays = self._prepare_data(data)

        try:
            executor = self._get_executor(test_name)
            if executor:
                return executor(data_arrays, alpha)
        except Exception as e:
            logger.error(f"Failed to execute {test_name}: {e}")
            return None

        return None

    def _prepare_data(self, data: Any) -> List[np.ndarray]:
        """Convert various data formats to list of numpy arrays."""
        if isinstance(data, dict):
            return [np.array(v, dtype=float) for v in data.values()]
        elif isinstance(data, list):
            if all(isinstance(x, (list, np.ndarray)) for x in data):
                return [np.array(x, dtype=float) for x in data]
            return [np.array(data, dtype=float)]
        elif isinstance(data, np.ndarray):
            return [data]
        elif isinstance(data, pd.DataFrame):
            return [col.dropna().values for _, col in data.items()]
        return [np.array(data, dtype=float)]

    def _get_executor(self, test_name: str):
        """Get the execution function for a test name."""
        executors = {
            "independent_t": self._exec_independent_t,
            "welch_t": self._exec_welch_t,
            "paired_t": self._exec_paired_t,
            "one_sample_t": self._exec_one_sample_t,
            "mann_whitney_u": self._exec_mann_whitney,
            "wilcoxon_signed_rank": self._exec_wilcoxon,
            "one_way_anova": self._exec_anova,
            "kruskal_wallis": self._exec_kruskal_wallis,
            "pearson": self._exec_pearson,
            "spearman": self._exec_spearman,
            "kendall": self._exec_kendall,
            "chi_square_independence": self._exec_chi_square,
            "fisher_exact": self._exec_fisher_exact,
            "linear_regression": self._exec_linear_regression,
        }
        return executors.get(test_name)

    # --- Test Executors ---

    def _exec_independent_t(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        stat, p = stats.ttest_ind(arrays[0], arrays[1], equal_var=True)
        n1, n2 = len(arrays[0]), len(arrays[1])
        pooled_std = np.sqrt(
            ((n1 - 1) * np.var(arrays[0], ddof=1) + (n2 - 1) * np.var(arrays[1], ddof=1)) / (n1 + n2 - 2)
        )
        cohens_d = (np.mean(arrays[0]) - np.mean(arrays[1])) / pooled_std if pooled_std > 0 else 0
        return TestResult(
            test_name="Independent Samples t-test",
            statistic=float(stat),
            p_value=float(p),
            effect_size=float(cohens_d),
            effect_size_name="Cohen's d",
            degrees_of_freedom=float(n1 + n2 - 2),
            additional={
                "mean_group1": float(np.mean(arrays[0])),
                "mean_group2": float(np.mean(arrays[1])),
                "std_group1": float(np.std(arrays[0], ddof=1)),
                "std_group2": float(np.std(arrays[1], ddof=1)),
                "n_group1": n1,
                "n_group2": n2,
            },
        )

    def _exec_welch_t(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        stat, p = stats.ttest_ind(arrays[0], arrays[1], equal_var=False)
        n1, n2 = len(arrays[0]), len(arrays[1])
        pooled_std = np.sqrt((np.var(arrays[0], ddof=1) + np.var(arrays[1], ddof=1)) / 2)
        cohens_d = (np.mean(arrays[0]) - np.mean(arrays[1])) / pooled_std if pooled_std > 0 else 0
        return TestResult(
            test_name="Welch's t-test",
            statistic=float(stat),
            p_value=float(p),
            effect_size=float(cohens_d),
            effect_size_name="Cohen's d",
            additional={
                "mean_group1": float(np.mean(arrays[0])),
                "mean_group2": float(np.mean(arrays[1])),
                "n_group1": n1,
                "n_group2": n2,
            },
        )

    def _exec_paired_t(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        stat, p = stats.ttest_rel(arrays[0], arrays[1])
        diff = arrays[0] - arrays[1]
        cohens_d = float(np.mean(diff) / np.std(diff, ddof=1)) if np.std(diff, ddof=1) > 0 else 0
        return TestResult(
            test_name="Paired Samples t-test",
            statistic=float(stat),
            p_value=float(p),
            effect_size=cohens_d,
            effect_size_name="Cohen's d (paired)",
            degrees_of_freedom=float(len(arrays[0]) - 1),
        )

    def _exec_one_sample_t(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        stat, p = stats.ttest_1samp(arrays[0], 0)
        d = float(np.mean(arrays[0]) / np.std(arrays[0], ddof=1)) if np.std(arrays[0], ddof=1) > 0 else 0
        return TestResult(
            test_name="One-Sample t-test",
            statistic=float(stat),
            p_value=float(p),
            effect_size=d,
            effect_size_name="Cohen's d",
            degrees_of_freedom=float(len(arrays[0]) - 1),
        )

    def _exec_mann_whitney(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        stat, p = stats.mannwhitneyu(arrays[0], arrays[1], alternative="two-sided")
        n1, n2 = len(arrays[0]), len(arrays[1])
        r = 1 - (2 * stat) / (n1 * n2)  # rank-biserial correlation
        return TestResult(
            test_name="Mann-Whitney U test",
            statistic=float(stat),
            p_value=float(p),
            effect_size=float(r),
            effect_size_name="Rank-biserial correlation",
            additional={"n_group1": n1, "n_group2": n2},
        )

    def _exec_wilcoxon(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        stat, p = stats.wilcoxon(arrays[0], arrays[1])
        n = len(arrays[0])
        # Effect size r = |Z| / sqrt(N) (Rosenthal 1991; Fritz, Morris &
        # Richler 2012 J Exp Psychol). Z is recovered from the
        # Wilcoxon test statistic W via the normal approximation:
        #   mu_W    = n(n+1) / 4
        #   sigma_W = sqrt(n(n+1)(2n+1) / 24)
        #   Z       = (W - mu_W) / sigma_W
        # Bug history: prior code computed W / max(W) = W / (n(n+1)/2)
        # and labelled it "r (effect size)". That formula is not on the
        # Cohen r scale and was misleading when displayed alongside
        # Pearson r elsewhere in the pipeline. See
        # docs/CRITICAL_REVIEW_2026-05-06.md §P1-8.
        if n > 0:
            mu_w = n * (n + 1) / 4.0
            sigma_w = float(np.sqrt(n * (n + 1) * (2 * n + 1) / 24.0))
            z = (float(stat) - mu_w) / sigma_w if sigma_w > 0 else 0.0
            r = abs(z) / float(np.sqrt(n)) if n > 0 else 0.0
        else:
            z = 0.0
            r = 0.0
        return TestResult(
            test_name="Wilcoxon Signed-Rank test",
            statistic=float(stat),
            p_value=float(p),
            effect_size=float(r),
            effect_size_name="r (|Z|/sqrt(N), Rosenthal 1991)",
            additional={"z_approx": float(z), "n_pairs": int(n)},
        )

    def _exec_anova(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        stat, p = stats.f_oneway(*arrays)
        # Eta-squared
        grand_mean = np.mean(np.concatenate(arrays))
        ss_between = sum(len(a) * (np.mean(a) - grand_mean) ** 2 for a in arrays)
        ss_total = sum(np.sum((a - grand_mean) ** 2) for a in arrays)
        eta_sq = float(ss_between / ss_total) if ss_total > 0 else 0
        k = len(arrays)
        n_total = sum(len(a) for a in arrays)
        return TestResult(
            test_name="One-Way ANOVA",
            statistic=float(stat),
            p_value=float(p),
            effect_size=eta_sq,
            effect_size_name="Eta-squared",
            degrees_of_freedom=float(k - 1),
            additional={
                "df_between": k - 1,
                "df_within": n_total - k,
                "n_groups": k,
                "group_means": [float(np.mean(a)) for a in arrays],
            },
        )

    def _exec_kruskal_wallis(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        stat, p = stats.kruskal(*arrays)
        n_total = sum(len(a) for a in arrays)
        k = len(arrays)
        # Two effect sizes are commonly reported for Kruskal-Wallis
        # (Tomczak & Tomczak 2014; Mangiafico, rcompanion). The default
        # `effect_size` field uses the unbiased eta-squared form:
        #   eta_squared_H = (H - k + 1) / (n - k)     (range [0, 1])
        # The simpler epsilon-squared is also reported alongside:
        #   epsilon_squared = H / (n - 1)             (range [0, 1])
        # Bug history: prior code labelled the unbiased eta-squared
        # formula as "Epsilon-squared" --- numerically defensible (some
        # sources use that name for this expression) but inconsistent
        # with the Tomczak & Tomczak nomenclature now standard in JASP
        # and rcompanion. See docs/CRITICAL_REVIEW_2026-05-06.md §P1-8.
        eta_sq_h = (
            float((stat - k + 1) / (n_total - k)) if (n_total - k) > 0 else 0.0
        )
        epsilon_sq = float(stat / (n_total - 1)) if n_total > 1 else 0.0
        return TestResult(
            test_name="Kruskal-Wallis H test",
            statistic=float(stat),
            p_value=float(p),
            effect_size=eta_sq_h,
            effect_size_name="eta-squared H (unbiased; Tomczak & Tomczak 2014)",
            degrees_of_freedom=float(k - 1),
            additional={"epsilon_squared": epsilon_sq, "n_total": int(n_total)},
        )

    def _exec_pearson(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        r, p = stats.pearsonr(arrays[0], arrays[1])
        n = len(arrays[0])
        return TestResult(
            test_name="Pearson Correlation",
            statistic=float(r),
            p_value=float(p),
            effect_size=float(r**2),
            effect_size_name="R-squared",
            degrees_of_freedom=float(n - 2),
            additional={"r": float(r), "r_squared": float(r**2)},
        )

    def _exec_spearman(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        rho, p = stats.spearmanr(arrays[0], arrays[1])
        return TestResult(
            test_name="Spearman Rank Correlation",
            statistic=float(rho),
            p_value=float(p),
            effect_size=float(rho**2),
            effect_size_name="rho-squared",
            additional={"rho": float(rho)},
        )

    def _exec_kendall(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        tau, p = stats.kendalltau(arrays[0], arrays[1])
        return TestResult(
            test_name="Kendall's Tau",
            statistic=float(tau),
            p_value=float(p),
            effect_size=float(abs(tau)),
            effect_size_name="|tau|",
        )

    def _exec_chi_square(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        # Expects a contingency table or two categorical arrays
        if len(arrays) == 2:
            contingency = pd.crosstab(pd.Series(arrays[0].astype(int)), pd.Series(arrays[1].astype(int)))
            chi2, p, dof, expected = stats.chi2_contingency(contingency.values)
        else:
            chi2, p, dof, expected = stats.chi2_contingency(
                arrays[0].reshape(-1, 2) if arrays[0].ndim == 1 else arrays[0]
            )

        n = float(np.sum(contingency.values)) if len(arrays) == 2 else float(np.sum(arrays[0]))
        cramers_v = float(np.sqrt(chi2 / (n * (min(contingency.shape) - 1)))) if n > 0 and len(arrays) == 2 else 0

        return TestResult(
            test_name="Chi-Square Test of Independence",
            statistic=float(chi2),
            p_value=float(p),
            effect_size=cramers_v,
            effect_size_name="Cramer's V",
            degrees_of_freedom=float(dof),
        )

    def _exec_fisher_exact(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        if len(arrays) == 2:
            contingency = pd.crosstab(pd.Series(arrays[0].astype(int)), pd.Series(arrays[1].astype(int)))
            table = contingency.values
        else:
            table = arrays[0]

        if table.shape == (2, 2):
            odds_ratio, p = stats.fisher_exact(table)
        else:
            # Fisher exact only works for 2x2; fall back to chi-square for larger
            chi2, p, dof, expected = stats.chi2_contingency(table)
            odds_ratio = chi2  # Not a true OR, but best we can do

        return TestResult(
            test_name="Fisher's Exact Test",
            statistic=float(odds_ratio),
            p_value=float(p),
            effect_size=float(odds_ratio),
            effect_size_name="Odds Ratio",
        )

    def _exec_linear_regression(self, arrays: List[np.ndarray], alpha: float) -> TestResult:
        x, y = arrays[0], arrays[1]
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        return TestResult(
            test_name="Simple Linear Regression",
            statistic=float(slope / std_err) if std_err > 0 else 0,
            p_value=float(p_value),
            effect_size=float(r_value**2),
            effect_size_name="R-squared",
            additional={
                "slope": float(slope),
                "intercept": float(intercept),
                "r_value": float(r_value),
                "std_err": float(std_err),
            },
        )

    def _report_to_dict(self, report: GuardianReport) -> Dict[str, Any]:
        """Convert GuardianReport to serializable dict."""
        return {
            "test_type": report.test_type,
            "can_proceed": report.can_proceed,
            "confidence_score": report.confidence_score,
            "assumptions_checked": report.assumptions_checked,
            "violations": [
                {
                    "assumption": v.assumption,
                    "severity": v.severity,
                    "message": v.message,
                    "recommendation": v.recommendation,
                    "p_value": v.p_value,
                }
                for v in report.violations
            ],
            "alternative_tests": report.alternative_tests,
        }
