"""
Comprehensive High-Precision Categorical Data Analysis Module
=============================================================
Implements all major tests for categorical data with 50 decimal precision.
Includes Chi-square tests, Fisher's exact test, McNemar's test, and more.

Tests Included:
- Chi-square test of independence
- Chi-square goodness of fit
- Fisher's exact test
- McNemar's test
- Cochran's Q test
- Mantel-Haenszel test
- Cochran-Armitage trend test
- Barnard's exact test
- Boschloo's exact test
- G-test (log-likelihood ratio)

Author: StickForStats Development Team
Date: September 2025
Version: 1.0.0
"""

from decimal import Decimal, getcontext
from typing import Dict, List, Tuple, Optional, Union, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
from scipy import stats
import logging

# Configure high precision
getcontext().prec = 50

logger = logging.getLogger(__name__)


class CategoricalTest(Enum):
    """Types of categorical tests"""

    CHI_SQUARE_INDEPENDENCE = "chi_square_independence"
    CHI_SQUARE_GOODNESS = "chi_square_goodness"
    FISHER_EXACT = "fisher_exact"
    MCNEMAR = "mcnemar"
    COCHRANS_Q = "cochrans_q"
    MANTEL_HAENSZEL = "mantel_haenszel"
    COCHRAN_ARMITAGE = "cochran_armitage"
    BARNARD_EXACT = "barnard_exact"
    BOSCHLOO_EXACT = "boschloo_exact"
    G_TEST = "g_test"
    BINOMIAL_TEST = "binomial_test"
    MULTINOMIAL_TEST = "multinomial_test"


@dataclass
class CategoricalResult:
    """Comprehensive result for categorical tests"""

    test_name: str
    test_statistic: Decimal
    p_value: Decimal
    degrees_of_freedom: Optional[int] = None

    # Contingency table info
    observed_frequencies: Optional[np.ndarray] = None
    expected_frequencies: Optional[np.ndarray] = None
    residuals: Optional[np.ndarray] = None
    standardized_residuals: Optional[np.ndarray] = None

    # Effect sizes
    cramers_v: Optional[Decimal] = None
    phi_coefficient: Optional[Decimal] = None
    contingency_coefficient: Optional[Decimal] = None
    odds_ratio: Optional[Decimal] = None
    relative_risk: Optional[Decimal] = None
    risk_difference: Optional[Decimal] = None

    # Confidence intervals
    odds_ratio_ci: Optional[Tuple[Decimal, Decimal]] = None
    relative_risk_ci: Optional[Tuple[Decimal, Decimal]] = None
    risk_difference_ci: Optional[Tuple[Decimal, Decimal]] = None

    # Test-specific results
    exact_p_value: Optional[Decimal] = None
    mid_p_value: Optional[Decimal] = None
    yates_correction: bool = False

    # Power and sample size
    power: Optional[Decimal] = None
    required_sample_size: Optional[int] = None

    # Interpretation
    interpretation: Optional[str] = None
    recommendations: Optional[List[str]] = None
    assumptions_met: Optional[Dict[str, bool]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to JSON-serializable dictionary"""
        result = {
            "test_name": self.test_name,
            # `if self.test_statistic` is a TRUTHINESS test and Decimal("0") is falsy. A
            # contingency table showing no association at all has chi-square exactly 0 --
            # a real, computed result -- and it was being serialized as null, i.e. "not
            # available". Test for None, which is what "not available" actually means.
            "test_statistic": str(self.test_statistic) if self.test_statistic is not None else None,
            "p_value": str(self.p_value) if self.p_value is not None else None,
            "degrees_of_freedom": self.degrees_of_freedom,
            "yates_correction": self.yates_correction,
            "interpretation": self.interpretation,
            "recommendations": self.recommendations,
            "assumptions_met": self.assumptions_met,
        }

        # Convert numpy arrays to lists
        if self.observed_frequencies is not None:
            result["observed_frequencies"] = self.observed_frequencies.tolist()
        if self.expected_frequencies is not None:
            result["expected_frequencies"] = self.expected_frequencies.tolist()
        if self.residuals is not None:
            result["residuals"] = self.residuals.tolist()
        if self.standardized_residuals is not None:
            result["standardized_residuals"] = self.standardized_residuals.tolist()

        # Add effect sizes
        if self.cramers_v is not None:
            result["cramers_v"] = str(self.cramers_v)
        if self.phi_coefficient is not None:
            result["phi_coefficient"] = str(self.phi_coefficient)
        if self.contingency_coefficient is not None:
            result["contingency_coefficient"] = str(self.contingency_coefficient)
        if self.odds_ratio is not None:
            result["odds_ratio"] = str(self.odds_ratio)
        if self.relative_risk is not None:
            result["relative_risk"] = str(self.relative_risk)
        if self.risk_difference is not None:
            result["risk_difference"] = str(self.risk_difference)

        # Add confidence intervals
        if self.odds_ratio_ci is not None:
            result["odds_ratio_ci"] = [str(self.odds_ratio_ci[0]), str(self.odds_ratio_ci[1])]
        if self.relative_risk_ci is not None:
            result["relative_risk_ci"] = [str(self.relative_risk_ci[0]), str(self.relative_risk_ci[1])]
        if self.risk_difference_ci is not None:
            result["risk_difference_ci"] = [str(self.risk_difference_ci[0]), str(self.risk_difference_ci[1])]

        # Add test-specific results
        if self.exact_p_value is not None:
            result["exact_p_value"] = str(self.exact_p_value)
        if self.mid_p_value is not None:
            result["mid_p_value"] = str(self.mid_p_value)
        if self.power is not None:
            result["power"] = str(self.power)
        if self.required_sample_size is not None:
            result["required_sample_size"] = self.required_sample_size

        return result


class HighPrecisionCategorical:
    """
    High-precision categorical data analysis.
    All calculations performed with configurable decimal precision.
    """

    def __init__(self, precision: int = 50, alpha: float = 0.05):
        """Initialize with specified decimal precision and significance level.

        `alpha` matters: every interpretation below used to hard-code 0.05 while the API
        accepted an `alpha` from the caller and discarded it (`data.get("alpha", 0.05)`, result
        thrown away). Set alpha = 0.01, get back a p-value of 0.03 described as "statistically
        significant". The number and the sentence next to it disagreed.
        """
        getcontext().prec = precision
        self.precision = precision
        self.alpha = alpha

    def _to_decimal(self, value: Union[float, int, str]) -> Decimal:
        """Convert to high-precision Decimal"""
        return Decimal(str(value))

    def chi_square_independence(
        self, observed: Union[List[List], np.ndarray], correction: bool = True, lambda_: Optional[float] = None
    ) -> CategoricalResult:
        """
        High-precision Chi-square test of independence.

        Tests whether two categorical variables are independent.

        Args:
            observed: 2D contingency table of observed frequencies
            correction: Apply Yates' continuity correction for 2x2 tables
            lambda_: Cressie-Read power divergence parameter

        Returns:
            CategoricalResult with test statistics and effect sizes
        """
        observed = np.array(observed)

        if observed.ndim != 2:
            raise ValueError("Chi-square test requires a 2D contingency table")

        if np.any(observed < 0):
            raise ValueError("All frequencies must be non-negative")

        rows, cols = observed.shape
        n = np.sum(observed)

        # Calculate expected frequencies
        row_totals = np.sum(observed, axis=1)
        col_totals = np.sum(observed, axis=0)
        expected = np.outer(row_totals, col_totals) / n

        # Check assumption: expected frequencies >= 5
        low_expected = np.sum(expected < 5)
        if low_expected > 0:
            logger.warning(f"{low_expected} cells have expected frequency < 5")

        # Calculate chi-square statistic
        chi2_stat = self._to_decimal(0)

        # Apply Yates' correction for 2x2 tables
        if correction and rows == 2 and cols == 2:
            yates_correction = True
            for i in range(rows):
                for j in range(cols):
                    o = self._to_decimal(observed[i, j])
                    e = self._to_decimal(expected[i, j])
                    if e > 0:
                        chi2_stat += (abs(o - e) - self._to_decimal(0.5)) ** 2 / e
        else:
            yates_correction = False
            for i in range(rows):
                for j in range(cols):
                    o = self._to_decimal(observed[i, j])
                    e = self._to_decimal(expected[i, j])
                    if e > 0:
                        chi2_stat += (o - e) ** 2 / e

        # Degrees of freedom
        df = (rows - 1) * (cols - 1)

        # Calculate p-value
        p_value = self._to_decimal(stats.chi2.sf(float(chi2_stat), df))

        # Calculate residuals
        residuals = observed - expected
        standardized_residuals = np.zeros_like(residuals, dtype=float)

        for i in range(rows):
            for j in range(cols):
                if expected[i, j] > 0:
                    standardized_residuals[i, j] = residuals[i, j] / np.sqrt(expected[i, j])

        # Calculate effect sizes
        n_dec = self._to_decimal(n)

        # Cramér's V
        min_dim = min(rows, cols) - 1
        if min_dim > 0:
            cramers_v = (chi2_stat / (n_dec * self._to_decimal(min_dim))).sqrt()
        else:
            cramers_v = self._to_decimal(0)

        # Phi coefficient (for 2x2 tables)
        if rows == 2 and cols == 2:
            phi = (chi2_stat / n_dec).sqrt()
        else:
            phi = None

        # Contingency coefficient
        c = (chi2_stat / (chi2_stat + n_dec)).sqrt()

        # For 2x2 tables, calculate odds ratio
        if rows == 2 and cols == 2:
            odds_ratio_result = self._calculate_odds_ratio(observed)
            odds_ratio = odds_ratio_result["odds_ratio"]
            odds_ratio_ci = odds_ratio_result["confidence_interval"]

            # Relative risk
            rr_result = self._calculate_relative_risk(observed)
            relative_risk = rr_result["relative_risk"]
            relative_risk_ci = rr_result["confidence_interval"]

            # Risk difference
            rd_result = self._calculate_risk_difference(observed)
            risk_difference = rd_result["risk_difference"]
            risk_difference_ci = rd_result["confidence_interval"]
        else:
            odds_ratio = None
            odds_ratio_ci = None
            relative_risk = None
            relative_risk_ci = None
            risk_difference = None
            risk_difference_ci = None

        # Check assumptions
        assumptions_met = {
            "expected_frequencies_ge_5": low_expected == 0,
            "independence": True,  # Assumed unless proven otherwise
            "random_sampling": True,  # Assumed
        }

        # Create result
        result = CategoricalResult(
            test_name="Chi-square Test of Independence",
            test_statistic=chi2_stat,
            p_value=p_value,
            degrees_of_freedom=df,
            observed_frequencies=observed,
            expected_frequencies=expected,
            residuals=residuals,
            standardized_residuals=standardized_residuals,
            cramers_v=cramers_v,
            phi_coefficient=phi,
            contingency_coefficient=c,
            odds_ratio=odds_ratio,
            odds_ratio_ci=odds_ratio_ci,
            relative_risk=relative_risk,
            relative_risk_ci=relative_risk_ci,
            risk_difference=risk_difference,
            risk_difference_ci=risk_difference_ci,
            yates_correction=yates_correction,
            assumptions_met=assumptions_met,
            interpretation=self._interpret_chi_square(chi2_stat, p_value, cramers_v, df),
            recommendations=self._generate_recommendations(assumptions_met, rows, cols, n),
        )

        return result

    def chi_square_goodness_of_fit(
        self, observed: Union[List, np.ndarray], expected: Optional[Union[List, np.ndarray]] = None, ddof: int = 0
    ) -> CategoricalResult:
        """
        High-precision Chi-square goodness of fit test.

        Tests whether observed frequencies match expected distribution.

        Args:
            observed: Observed frequencies
            expected: Expected frequencies (if None, assumes uniform)
            ddof: Delta degrees of freedom

        Returns:
            CategoricalResult with test statistics
        """
        observed = np.array(observed)
        n_categories = len(observed)
        n = np.sum(observed)

        # Set expected frequencies
        if expected is None:
            # Assume uniform distribution
            expected = np.full(n_categories, n / n_categories)
        else:
            expected = np.array(expected)

        if len(observed) != len(expected):
            raise ValueError("Observed and expected must have same length")

        # Calculate chi-square statistic
        chi2_stat = self._to_decimal(0)

        for i in range(n_categories):
            o = self._to_decimal(observed[i])
            e = self._to_decimal(expected[i])
            if e > 0:
                chi2_stat += (o - e) ** 2 / e

        # Degrees of freedom
        df = n_categories - 1 - ddof

        # Calculate p-value
        p_value = self._to_decimal(stats.chi2.sf(float(chi2_stat), df))

        # Calculate residuals
        residuals = observed - expected
        standardized_residuals = np.zeros_like(residuals, dtype=float)

        for i in range(n_categories):
            if expected[i] > 0:
                standardized_residuals[i] = residuals[i] / np.sqrt(expected[i])

        # Effect size (Cohen's w)
        cohen_w = (chi2_stat / self._to_decimal(n)).sqrt()

        # Check assumptions
        low_expected = np.sum(expected < 5)
        assumptions_met = {
            "expected_frequencies_ge_5": low_expected == 0,
            "independence": True,
            "random_sampling": True,
        }

        # Create result
        result = CategoricalResult(
            test_name="Chi-square Goodness of Fit Test",
            test_statistic=chi2_stat,
            p_value=p_value,
            degrees_of_freedom=df,
            observed_frequencies=observed,
            expected_frequencies=expected,
            residuals=residuals,
            standardized_residuals=standardized_residuals,
            cramers_v=cohen_w,  # Cohen's w for goodness of fit
            assumptions_met=assumptions_met,
            interpretation=self._interpret_goodness_of_fit(chi2_stat, p_value, cohen_w, df),
        )

        return result

    def fisher_exact_test(
        self, observed: Union[List[List], np.ndarray], alternative: str = "two-sided"
    ) -> CategoricalResult:
        """
        High-precision Fisher's exact test.

        Exact test for 2x2 contingency tables, especially useful for small samples.

        Args:
            observed: 2x2 contingency table
            alternative: 'two-sided', 'greater', or 'less'

        Returns:
            CategoricalResult with exact p-value
        """
        observed = np.array(observed)

        if observed.shape != (2, 2):
            raise ValueError("Fisher's exact test requires a 2x2 table")

        # Extract cell values
        a, b = observed[0, 0], observed[0, 1]
        c, d = observed[1, 0], observed[1, 1]
        a + b + c + d

        # Calculate exact p-value using hypergeometric distribution
        # P(X = a) = C(a+b, a) * C(c+d, c) / C(n, a+c)

        # Calculate odds ratio
        if b * c == 0:
            if a * d == 0:
                odds_ratio = self._to_decimal("nan")
            else:
                odds_ratio = self._to_decimal("inf")
        else:
            odds_ratio = self._to_decimal(a * d) / self._to_decimal(b * c)

        # Calculate exact p-value
        if alternative == "two-sided":
            # Sum probabilities of tables as or more extreme
            p_value = self._to_decimal(0)
            p_observed = self._hypergeometric_pmf(a, a + b, c + d, a + c)

            for x in range(min(a + b, a + c) + 1):
                p_x = self._hypergeometric_pmf(x, a + b, c + d, a + c)
                if p_x <= p_observed + self._to_decimal("1e-10"):
                    p_value += p_x

        elif alternative == "greater":
            # P(X >= a)
            p_value = self._to_decimal(0)
            for x in range(a, min(a + b, a + c) + 1):
                p_value += self._hypergeometric_pmf(x, a + b, c + d, a + c)

        else:  # less
            # P(X <= a)
            p_value = self._to_decimal(0)
            for x in range(a + 1):
                p_value += self._hypergeometric_pmf(x, a + b, c + d, a + c)

        # Calculate mid-P value (less conservative)
        mid_p = p_value - self._hypergeometric_pmf(a, a + b, c + d, a + c) / 2

        # Calculate confidence interval for odds ratio
        if odds_ratio != self._to_decimal("inf") and odds_ratio != self._to_decimal("nan"):
            log_or = odds_ratio.ln()
            se_log_or = (
                1 / self._to_decimal(a) + 1 / self._to_decimal(b) + 1 / self._to_decimal(c) + 1 / self._to_decimal(d)
            ).sqrt()
            z_alpha = self._to_decimal(stats.norm.ppf(0.975))

            ci_lower = (log_or - z_alpha * se_log_or).exp()
            ci_upper = (log_or + z_alpha * se_log_or).exp()
            odds_ratio_ci = (ci_lower, ci_upper)
        else:
            odds_ratio_ci = None

        # Create result
        result = CategoricalResult(
            test_name="Fisher's Exact Test",
            test_statistic=odds_ratio,
            p_value=p_value,
            observed_frequencies=observed,
            odds_ratio=odds_ratio,
            odds_ratio_ci=odds_ratio_ci,
            exact_p_value=p_value,
            mid_p_value=mid_p,
            interpretation=self._interpret_fisher(odds_ratio, p_value),
        )

        return result

    def mcnemar_test(
        self,
        observed: Union[List[List], np.ndarray],
        correction: bool = True,
        exact: Optional[bool] = None,
    ) -> CategoricalResult:
        """
        High-precision McNemar's test.

        Tests for changes in paired binary data.

        Args:
            observed: 2x2 contingency table of paired data
            correction: Apply the continuity correction (asymptotic test only)
            exact: True forces the exact binomial test, False forces the asymptotic
                chi-square, None (default) picks the exact test when there are fewer than 25
                discordant pairs. The API used to accept `exact` from the caller and then
                DISCARD it -- `data.get("exact", False)` with the result thrown away -- so a
                request for the exact test silently ran the asymptotic one. The two differ
                materially at small discordant counts, which is the case McNemar is for.

        Returns:
            CategoricalResult with test statistics
        """
        observed = np.array(observed)

        if observed.shape != (2, 2):
            raise ValueError("McNemar's test requires a 2x2 table")

        # Discordant pairs -- the ONLY cells McNemar's test uses.
        b = int(observed[0, 1])  # Changed from 0 to 1
        c = int(observed[1, 0])  # Changed from 1 to 0
        n_discordant = b + c

        if n_discordant == 0:
            # Nobody changed in either direction. McNemar's statistic is (b - c)^2 / (b + c),
            # which is 0/0 here: the test has no information about change at all. It used to
            # report chi-square = 0, p = 1.0 -- "no significant change, confidently" -- from a
            # table that says nothing whatsoever about change.
            return CategoricalResult(
                test_name="McNemar's Test",
                test_statistic=None,
                p_value=None,
                degrees_of_freedom=1,
                observed_frequencies=observed,
                odds_ratio=None,
                interpretation=(
                    "McNemar's test is undefined: there are no discordant pairs (nobody changed "
                    "in either direction), so the statistic is 0/0. The table contains no "
                    "information about change."
                ),
            )

        use_exact = (n_discordant < 25) if exact is None else bool(exact)

        # The chi-square statistic is reported either way; it is what the asymptotic test uses.
        if correction and n_discordant >= 10 and not use_exact:
            chi2_stat = self._to_decimal((abs(b - c) - 1) ** 2) / self._to_decimal(n_discordant)
        else:
            chi2_stat = self._to_decimal((b - c) ** 2) / self._to_decimal(n_discordant)

        if use_exact:
            # scipy.stats.binom_test was removed in scipy 1.12; binomtest returns a result
            # object whose .pvalue is the two-sided exact p.
            p_value = self._to_decimal(
                stats.binomtest(min(b, c), n_discordant, 0.5, alternative="two-sided").pvalue
            )
            method = "exact binomial"
        else:
            p_value = self._to_decimal(stats.chi2.sf(float(chi2_stat), 1))
            method = "asymptotic chi-square" + (" with continuity correction" if correction and n_discordant >= 10 else "")

        # Odds ratio for paired data = b / c. With c = 0 and b > 0 it is infinite; with both
        # zero it is 0/0 -- and that case returned above. It used to return 1 ("no change")
        # for b = c = 0.
        if c == 0:
            odds_ratio = self._to_decimal("inf") if b > 0 else None
        else:
            odds_ratio = self._to_decimal(b) / self._to_decimal(c)

        result = CategoricalResult(
            test_name=f"McNemar's Test ({method})",
            test_statistic=chi2_stat,
            p_value=p_value,
            degrees_of_freedom=1,
            observed_frequencies=observed,
            odds_ratio=odds_ratio,
            interpretation=self._interpret_mcnemar(chi2_stat, p_value, b, c),
        )

        return result

    def cochrans_q_test(self, data: Union[List[List], np.ndarray]) -> CategoricalResult:
        """
        High-precision Cochran's Q test.

        Tests whether multiple binary treatments have the same effect.
        Extension of McNemar's test to k treatments.

        Args:
            data: 2D array where rows are subjects, columns are treatments (binary)

        Returns:
            CategoricalResult with test statistics
        """
        data = np.array(data)
        n_subjects, k_treatments = data.shape

        if k_treatments < 3:
            raise ValueError("Cochran's Q test requires at least 3 treatments")

        # Ensure binary data
        if not np.all((data == 0) | (data == 1)):
            raise ValueError("Cochran's Q test requires binary data (0 or 1)")

        # Calculate row totals (successes per subject)
        row_totals = np.sum(data, axis=1)

        # Calculate column totals (successes per treatment)
        col_totals = np.sum(data, axis=0)

        # Calculate Q statistic
        k = self._to_decimal(k_treatments)
        sum_col_sq = sum(self._to_decimal(c) ** 2 for c in col_totals)
        sum_row = sum(self._to_decimal(r) for r in row_totals)
        sum_row_sq = sum(self._to_decimal(r) ** 2 for r in row_totals)

        numerator = k * (k * sum_col_sq - sum_row**2)
        denominator = k * sum_row - sum_row_sq

        if denominator == 0:
            q_stat = self._to_decimal(0)
        else:
            q_stat = numerator / denominator

        # Calculate p-value (chi-square distribution with k-1 df)
        df = k_treatments - 1
        p_value = self._to_decimal(stats.chi2.sf(float(q_stat), df))

        # Effect size (Kendall's W for binary data)
        w = q_stat / (self._to_decimal(n_subjects) * (k - 1))

        # Create result
        result = CategoricalResult(
            test_name="Cochran's Q Test",
            test_statistic=q_stat,
            p_value=p_value,
            degrees_of_freedom=df,
            cramers_v=w,  # Using as effect size
            interpretation=self._interpret_cochrans_q(q_stat, p_value, k_treatments),
        )

        return result

    def cochrans_q(self, data: Union[List[List], np.ndarray], alpha: float = 0.05) -> CategoricalResult:
        """Alias for cochrans_q_test for API consistency."""
        return self.cochrans_q_test(data)

    def g_test(self, observed: Union[List[List], np.ndarray]) -> CategoricalResult:
        """
        High-precision G-test (log-likelihood ratio test).

        Alternative to chi-square test, especially for small expected frequencies.

        Args:
            observed: Contingency table

        Returns:
            CategoricalResult with test statistics
        """
        observed = np.array(observed)

        if observed.ndim == 1:
            # Goodness of fit test
            n = np.sum(observed)
            expected = np.full_like(observed, n / len(observed), dtype=float)
            df = len(observed) - 1
        else:
            # Independence test
            rows, cols = observed.shape
            n = np.sum(observed)

            # Calculate expected frequencies
            row_totals = np.sum(observed, axis=1)
            col_totals = np.sum(observed, axis=0)
            expected = np.outer(row_totals, col_totals) / n
            df = (rows - 1) * (cols - 1)

        # Calculate G statistic
        g_stat = self._to_decimal(0)

        for i in np.ndindex(observed.shape):
            if observed[i] > 0 and expected[i] > 0:
                o = self._to_decimal(observed[i])
                e = self._to_decimal(expected[i])
                g_stat += 2 * o * (o / e).ln()

        # Williams' correction for small samples
        if n < 200:
            if observed.ndim == 1:
                q = 1 + (len(observed) + 1) / (6 * n)
            else:
                rows, cols = observed.shape
                q = 1 + ((rows + 1) * (cols + 1)) / (6 * n)
            g_stat = g_stat / self._to_decimal(q)

        # Calculate p-value
        p_value = self._to_decimal(stats.chi2.sf(float(g_stat), df))

        # Create result
        result = CategoricalResult(
            test_name="G-test (Log-likelihood Ratio)",
            test_statistic=g_stat,
            p_value=p_value,
            degrees_of_freedom=df,
            observed_frequencies=observed,
            expected_frequencies=expected,
            interpretation=self._interpret_g_test(g_stat, p_value, df),
        )

        return result

    def binomial_test(
        self, successes: int, n: int, p: float = 0.5, alternative: str = "two-sided"
    ) -> CategoricalResult:
        """
        High-precision binomial test.

        Tests whether success probability equals hypothesized value.

        Args:
            successes: Number of successes
            n: Number of trials
            p: Hypothesized probability of success
            alternative: 'two-sided', 'greater', or 'less'

        Returns:
            CategoricalResult with exact p-value
        """
        if successes > n:
            raise ValueError("Successes cannot exceed number of trials")

        p_dec = self._to_decimal(p)
        k = successes

        # Calculate exact p-value
        if alternative == "two-sided":
            # Sum probabilities as or more extreme
            p_observed = self._binomial_pmf(k, n, p_dec)
            p_value = self._to_decimal(0)

            for i in range(n + 1):
                p_i = self._binomial_pmf(i, n, p_dec)
                if p_i <= p_observed + self._to_decimal("1e-10"):
                    p_value += p_i

        elif alternative == "greater":
            # P(X >= k)
            p_value = self._to_decimal(0)
            for i in range(k, n + 1):
                p_value += self._binomial_pmf(i, n, p_dec)

        else:  # less
            # P(X <= k)
            p_value = self._to_decimal(0)
            for i in range(k + 1):
                p_value += self._binomial_pmf(i, n, p_dec)

        # Calculate confidence interval for proportion
        prop = self._to_decimal(successes) / self._to_decimal(n)
        se = (prop * (1 - prop) / self._to_decimal(n)).sqrt()
        z_alpha = self._to_decimal(stats.norm.ppf(0.975))

        ci_lower = prop - z_alpha * se
        ci_upper = prop + z_alpha * se

        # Ensure CI is within [0, 1]
        ci_lower = max(self._to_decimal(0), ci_lower)
        ci_upper = min(self._to_decimal(1), ci_upper)

        # Create result
        result = CategoricalResult(
            test_name="Binomial Test",
            test_statistic=prop,
            p_value=p_value,
            interpretation=self._interpret_binomial(successes, n, p, p_value),
        )

        return result

    def multinomial_test(
        self,
        observed: Union[List, np.ndarray],
        expected_probs: Optional[Union[List, np.ndarray]] = None,
        alpha: float = 0.05,
    ) -> CategoricalResult:
        """
        High-precision multinomial test.

        Tests whether observed frequencies match expected multinomial probabilities.
        Extension of binomial test to multiple categories.

        Args:
            observed: Observed frequencies for each category
            expected_probs: Expected probabilities for each category (must sum to 1)
                          If None, assumes equal probabilities

        Returns:
            CategoricalResult with test statistics
        """
        observed = np.array(observed)
        k = len(observed)  # Number of categories
        n = int(np.sum(observed))  # Total observations

        # Set expected probabilities
        if expected_probs is None:
            expected_probs = np.array([1.0 / k] * k)
        else:
            expected_probs = np.array(expected_probs)
            if not np.isclose(np.sum(expected_probs), 1.0):
                raise ValueError("Expected probabilities must sum to 1")

        # Calculate expected frequencies
        expected = n * expected_probs

        # Chi-square statistic (for large sample approximation)
        chi2_stat = sum(
            (self._to_decimal(observed[i]) - self._to_decimal(expected[i])) ** 2 / self._to_decimal(expected[i])
            for i in range(k)
        )

        # Calculate p-value using chi-square distribution
        df = k - 1
        p_value = self._to_decimal(stats.chi2.sf(float(chi2_stat), df))

        # Calculate effect size (Cramér's V for goodness of fit)
        cramers_v = (chi2_stat / self._to_decimal(n)) ** (self._to_decimal(1) / self._to_decimal(2))

        # Calculate probability of observed configuration under multinomial
        log_prob = self._to_decimal(0)
        # log(n!) - sum(log(obs_i!)) + sum(obs_i * log(p_i))
        try:
            from scipy.special import gammaln

            log_prob = self._to_decimal(gammaln(n + 1))
            for i in range(k):
                log_prob -= self._to_decimal(gammaln(observed[i] + 1))
                if expected_probs[i] > 0:
                    log_prob += self._to_decimal(observed[i]) * self._to_decimal(np.log(expected_probs[i]))
            self._to_decimal(np.exp(float(log_prob)))
        except:
            self._to_decimal(0)

        # Interpretation
        interpretation = f"Multinomial test: χ²={float(chi2_stat):.4f}, p={float(p_value):.4f}. "
        if p_value < self._to_decimal(0.05):
            interpretation += "Observed frequencies significantly differ from expected proportions."
        else:
            interpretation += "Observed frequencies are consistent with expected proportions."

        # Create result
        result = CategoricalResult(
            test_name="Multinomial Test",
            test_statistic=chi2_stat,
            p_value=p_value,
            degrees_of_freedom=df,
            cramers_v=cramers_v,
            interpretation=interpretation,
        )

        return result

    def cochran_armitage_trend_test(self, table: Union[List[List], np.ndarray]) -> CategoricalResult:
        """
        High-precision Cochran-Armitage trend test.

        Tests for trend in binomial proportions across ordinal groups.

        Args:
            table: 2xk contingency table (2 outcomes, k ordered groups)

        Returns:
            CategoricalResult with test statistics
        """
        table = np.array(table)

        if table.shape[0] != 2:
            raise ValueError("Cochran-Armitage test requires 2 rows (binary outcome)")

        k = table.shape[1]  # Number of groups
        n_i = np.sum(table, axis=0)  # Group sizes
        r_i = table[0, :]  # Successes in each group

        # Assign scores (default: 0, 1, 2, ...)
        scores = np.arange(k)

        # Calculate test statistic
        n = np.sum(n_i)
        r = np.sum(r_i)
        p_hat = r / n

        # Weighted sums
        sum_ti_ni = np.sum(scores * n_i)
        sum_ti_ri = np.sum(scores * r_i)
        sum_ti2_ni = np.sum(scores**2 * n_i)

        # Numerator
        numerator = sum_ti_ri - (r * sum_ti_ni / n)

        # Denominator (variance)
        var = p_hat * (1 - p_hat) * (sum_ti2_ni - sum_ti_ni**2 / n)

        if var > 0:
            z_stat = self._to_decimal(numerator) / self._to_decimal(np.sqrt(var))
        else:
            z_stat = self._to_decimal(0)

        # Calculate p-value (two-tailed)
        p_value = self._to_decimal(2 * (stats.norm.sf(abs(float(z_stat)))))

        # Create result
        result = CategoricalResult(
            test_name="Cochran-Armitage Trend Test",
            test_statistic=z_stat,
            p_value=p_value,
            observed_frequencies=table,
            interpretation=self._interpret_cochran_armitage(z_stat, p_value),
        )

        return result

    def calculate_effect_sizes(
        self, table: Union[List[List], np.ndarray], requested_sizes: Optional[List[str]] = None
    ) -> Dict[str, Decimal]:
        """
        Calculate comprehensive effect sizes for categorical data.

        Args:
            table: Contingency table (2D array)

        Returns:
            Dictionary with various effect size measures
        """
        table = np.array(table)
        n_rows, n_cols = table.shape
        n = self._to_decimal(np.sum(table))

        effect_sizes = {}

        # Calculate chi-square statistic first
        row_totals = np.sum(table, axis=1)
        col_totals = np.sum(table, axis=0)

        chi2 = self._to_decimal(0)
        for i in range(n_rows):
            for j in range(n_cols):
                expected = self._to_decimal(row_totals[i] * col_totals[j]) / n
                if expected > 0:
                    observed = self._to_decimal(table[i, j])
                    chi2 += (observed - expected) ** 2 / expected

        # Cramér's V
        min_dim = min(n_rows, n_cols)
        if min_dim > 1:
            cramers_v = (chi2 / (n * self._to_decimal(min_dim - 1))) ** (self._to_decimal(1) / self._to_decimal(2))
        else:
            cramers_v = (chi2 / n) ** (self._to_decimal(1) / self._to_decimal(2))
        effect_sizes["cramers_v"] = cramers_v

        # Phi coefficient (for 2x2 tables)
        if n_rows == 2 and n_cols == 2:
            phi = (chi2 / n) ** (self._to_decimal(1) / self._to_decimal(2))
            # Adjust sign based on association direction
            a, b, c, d = table[0, 0], table[0, 1], table[1, 0], table[1, 1]
            if (a * d) < (b * c):
                phi = -phi
            effect_sizes["phi"] = phi

            # Odds ratio
            if b > 0 and c > 0:
                or_result = self._calculate_odds_ratio(table)
                effect_sizes["odds_ratio"] = or_result["odds_ratio"]
                effect_sizes["log_odds_ratio"] = or_result["log_odds_ratio"]

            # Relative risk
            if row_totals[0] > 0 and row_totals[1] > 0:
                rr_result = self._calculate_relative_risk(table)
                effect_sizes["relative_risk"] = rr_result["relative_risk"]

            # Risk difference
            rd_result = self._calculate_risk_difference(table)
            effect_sizes["risk_difference"] = rd_result["risk_difference"]

        # Contingency coefficient C
        contingency_c = (chi2 / (chi2 + n)) ** (self._to_decimal(1) / self._to_decimal(2))
        effect_sizes["contingency_coefficient"] = contingency_c

        # Tschuprow's T (alternative to Cramér's V)
        tschuprows_t = (
            chi2
            / (
                n
                * (
                    (self._to_decimal(n_rows - 1) * self._to_decimal(n_cols - 1))
                    ** (self._to_decimal(1) / self._to_decimal(2))
                )
            )
        ) ** (self._to_decimal(1) / self._to_decimal(2))
        effect_sizes["tschuprows_t"] = tschuprows_t

        # Cohen's w (effect size for chi-square test)
        cohens_w = (chi2 / n) ** (self._to_decimal(1) / self._to_decimal(2))
        effect_sizes["cohens_w"] = cohens_w

        # Filter by requested sizes if specified
        if requested_sizes:
            effect_sizes = {k: v for k, v in effect_sizes.items() if k in requested_sizes}

        return effect_sizes

    def _hypergeometric_pmf(self, x: int, n1: int, n2: int, n: int) -> Decimal:
        """Calculate hypergeometric probability mass function"""
        # P(X = x) = C(n1, x) * C(n2, n-x) / C(n1+n2, n)
        if x < max(0, n - n2) or x > min(n1, n):
            return self._to_decimal(0)

        numerator = self._combination(n1, x) * self._combination(n2, n - x)
        denominator = self._combination(n1 + n2, n)

        return numerator / denominator

    def _binomial_pmf(self, k: int, n: int, p: Decimal) -> Decimal:
        """Calculate binomial probability mass function"""
        if k < 0 or k > n:
            return self._to_decimal(0)

        return self._combination(n, k) * p**k * (1 - p) ** (n - k)

    def _combination(self, n: int, k: int) -> Decimal:
        """Calculate combination C(n, k) with high precision"""
        if k > n or k < 0:
            return self._to_decimal(0)
        if k == 0 or k == n:
            return self._to_decimal(1)

        k = min(k, n - k)  # Optimization

        result = self._to_decimal(1)
        for i in range(k):
            result = result * self._to_decimal(n - i) / self._to_decimal(i + 1)

        return result

    @staticmethod
    def _margin_is_empty(a, b, c, d) -> bool:
        """True if an entire row or column of the 2x2 table is zero.

        No exposed subjects, no unexposed subjects, no events at all, or no non-events at
        all: the association measures are all 0/0 and no correction rescues them.
        """
        return (a + b) == 0 or (c + d) == 0 or (a + c) == 0 or (b + d) == 0

    def _wilson_interval(self, k: int, n: int, z: Decimal) -> tuple:
        """Wilson score interval for a binomial proportion.

        Well-defined at k = 0 and k = n, where the Wald interval collapses to zero width.
        """
        k_d = self._to_decimal(int(k))
        n_d = self._to_decimal(int(n))
        z2 = z * z
        denominator = n_d + z2
        center = (k_d + z2 / 2) / denominator
        half = z * (k_d * (n_d - k_d) / n_d + z2 / 4).sqrt() / denominator
        return center - half, center + half

    def _calculate_odds_ratio(self, table: np.ndarray) -> Dict[str, Any]:
        """Odds ratio for a 2x2 table, with the Haldane-Anscombe correction for zero cells.

        The previous implementation added 1e-10 to every cell "to avoid division by zero".
        That is not a correction, it is a fabrication with two consequences:
          * a table with no events in either arm ([[0,50],[0,50]]) came out at OR = 1.0 --
            "no association", stated confidently, from a table that contains no information
            about association at all;
          * the standard error of log(OR) became sqrt(4 / 1e-10) ~ 2e5, so the 95% interval
            was [8.4e-120379, 1.2e+120378]. Those are printed to the user as an interval.
        scipy refuses this table outright (zero expected frequency).

        Haldane-Anscombe (add 0.5 to every cell) is the standard, citable treatment for a
        single zero cell, and it is DISCLOSED in the result rather than applied silently.
        """
        a, b = int(table[0, 0]), int(table[0, 1])
        c, d = int(table[1, 0]), int(table[1, 1])

        if self._margin_is_empty(a, b, c, d):
            return {
                "odds_ratio": None,
                "confidence_interval": None,
                "log_odds_ratio": None,
                "standard_error": None,
                "note": (
                    "Odds ratio undefined: an entire row or column of the table is zero, so the "
                    "odds in at least one arm are 0/0. No zero-cell correction can recover an "
                    "association from a table that contains none."
                ),
            }

        correction_applied = 0 in (a, b, c, d)
        if correction_applied:
            a_d, b_d, c_d, d_d = (self._to_decimal(v) + self._to_decimal("0.5") for v in (a, b, c, d))
        else:
            a_d, b_d, c_d, d_d = (self._to_decimal(v) for v in (a, b, c, d))

        odds_ratio = (a_d * d_d) / (b_d * c_d)

        log_or = odds_ratio.ln()
        se_log_or = ((1 / a_d) + (1 / b_d) + (1 / c_d) + (1 / d_d)).sqrt()

        z_alpha = self._to_decimal(stats.norm.ppf(0.975))
        ci_lower = (log_or - z_alpha * se_log_or).exp()
        ci_upper = (log_or + z_alpha * se_log_or).exp()

        return {
            "haldane_anscombe_correction": correction_applied,
            "note": (
                "A zero cell was present; the Haldane-Anscombe correction (+0.5 to every cell) "
                "was applied. The odds ratio and its interval are therefore estimates under that "
                "correction, not the raw table's."
                if correction_applied
                else None
            ),
            "odds_ratio": odds_ratio,
            "confidence_interval": (ci_lower, ci_upper),
            "log_odds_ratio": log_or,
            "standard_error": se_log_or,
        }

    def _calculate_relative_risk(self, table: np.ndarray) -> Dict[str, Any]:
        """Relative risk for a 2x2 table.

        The old code returned RR = 1 when the unexposed risk was zero AND the exposed risk
        was zero -- i.e. it reported "no increase in risk" for a trial in which nobody in
        either arm had an event. That is 0/0. It also floored the standard error's
        denominators at 1e-10, producing the same astronomical intervals as the odds ratio.
        """
        a, b = int(table[0, 0]), int(table[0, 1])
        c, d = int(table[1, 0]), int(table[1, 1])

        if self._margin_is_empty(a, b, c, d):
            return {
                "relative_risk": None,
                "confidence_interval": None,
                "note": (
                    "Relative risk undefined: an entire row or column of the table is zero. With no "
                    "events in either arm (or no subjects in an arm) the risk ratio is 0/0."
                ),
            }

        correction_applied = 0 in (a, b, c, d)
        if correction_applied:
            a_d, b_d, c_d, d_d = (self._to_decimal(v) + self._to_decimal("0.5") for v in (a, b, c, d))
        else:
            a_d, b_d, c_d, d_d = (self._to_decimal(v) for v in (a, b, c, d))

        risk1 = a_d / (a_d + b_d)
        risk2 = c_d / (c_d + d_d)
        rr = risk1 / risk2

        # SE(log RR) = sqrt(b/(a(a+b)) + d/(c(c+d))) -- Katz. Finite because the correction
        # above guarantees a > 0 and c > 0.
        log_rr = rr.ln()
        se_log_rr = (b_d / (a_d * (a_d + b_d)) + d_d / (c_d * (c_d + d_d))).sqrt()

        z_alpha = self._to_decimal(stats.norm.ppf(0.975))
        ci_lower = (log_rr - z_alpha * se_log_rr).exp()
        ci_upper = (log_rr + z_alpha * se_log_rr).exp()

        return {
            "relative_risk": rr,
            "confidence_interval": (ci_lower, ci_upper),
            "standard_error_log_rr": se_log_rr,
            "haldane_anscombe_correction": correction_applied,
            "note": (
                "A zero cell was present; the Haldane-Anscombe correction (+0.5 to every cell) "
                "was applied before computing the risk ratio."
                if correction_applied
                else None
            ),
        }

    def _calculate_risk_difference(self, table: np.ndarray) -> Dict[str, Any]:
        """Risk difference for a 2x2 table, with a Newcombe hybrid-score interval.

        The Wald interval used here before -- rd +/- z * sqrt(p1(1-p1)/n1 + p2(1-p2)/n2) --
        has a standard error of exactly ZERO when neither arm has an event, so it reported
        "risk difference 0, 95% CI [0, 0]" for a trial with no events: a claim of perfect
        certainty derived from no information. The Wald interval is known to fail exactly
        there. Newcombe's method combines the two Wilson score intervals and stays sensible
        at zero cells, which is why it is the recommended interval for this quantity.
        """
        a, b = int(table[0, 0]), int(table[0, 1])
        c, d = int(table[1, 0]), int(table[1, 1])

        n1 = a + b
        n2 = c + d
        if n1 == 0 or n2 == 0:
            return {
                "risk_difference": None,
                "confidence_interval": None,
                "standard_error": None,
                "note": "Risk difference undefined: one of the two groups has no subjects.",
            }

        risk1 = self._to_decimal(a) / self._to_decimal(n1)
        risk2 = self._to_decimal(c) / self._to_decimal(n2)
        rd = risk1 - risk2

        z_alpha = self._to_decimal(stats.norm.ppf(0.975))
        l1, u1 = self._wilson_interval(a, n1, z_alpha)
        l2, u2 = self._wilson_interval(c, n2, z_alpha)

        # Newcombe (1998), method 10.
        ci_lower = rd - ((risk1 - l1) ** 2 + (u2 - risk2) ** 2).sqrt()
        ci_upper = rd + ((u1 - risk1) ** 2 + (risk2 - l2) ** 2).sqrt()

        # Reported for reference; it is NOT what the interval above is built from.
        se_rd = ((risk1 * (1 - risk1)) / self._to_decimal(n1) + (risk2 * (1 - risk2)) / self._to_decimal(n2)).sqrt()

        return {
            "risk_difference": rd,
            "confidence_interval": (ci_lower, ci_upper),
            "standard_error": se_rd,
            "interval_method": "Newcombe hybrid score",
        }

    def _generate_recommendations(self, assumptions_met: Dict[str, bool], rows: int, cols: int, n: int) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []

        if not assumptions_met.get("expected_frequencies_ge_5", True):
            if rows == 2 and cols == 2:
                recommendations.append("Consider Fisher's exact test for small expected frequencies")
            else:
                recommendations.append("Consider exact tests or combine categories")

        if n < 30:
            recommendations.append("Small sample size - interpret with caution")

        if rows == 2 and cols == 2 and n < 40:
            recommendations.append("Consider using exact tests for 2x2 tables with small samples")

        return recommendations

    def _interpret_chi_square(self, chi2: Decimal, p_value: Decimal, cramers_v: Decimal, df: int) -> str:
        """Generate interpretation for chi-square test"""
        sig = "statistically significant" if p_value < self._to_decimal(str(self.alpha)) else "not statistically significant"

        # Effect size interpretation
        if cramers_v < self._to_decimal("0.1"):
            effect = "negligible"
        elif cramers_v < self._to_decimal("0.3"):
            effect = "small"
        elif cramers_v < self._to_decimal("0.5"):
            effect = "medium"
        else:
            effect = "large"

        return f"The chi-square test is {sig} (χ²({df}) = {chi2:.2f}, p = {p_value:.4f}) with a {effect} effect size (V = {cramers_v:.3f})"

    def _interpret_goodness_of_fit(self, chi2: Decimal, p_value: Decimal, cohen_w: Decimal, df: int) -> str:
        """Generate interpretation for goodness of fit test"""
        sig = "reject" if p_value < self._to_decimal(str(self.alpha)) else "fail to reject"

        # Effect size interpretation (Cohen's w)
        if cohen_w < self._to_decimal("0.1"):
            effect = "negligible"
        elif cohen_w < self._to_decimal("0.3"):
            effect = "small"
        elif cohen_w < self._to_decimal("0.5"):
            effect = "medium"
        else:
            effect = "large"

        return f"We {sig} the null hypothesis of fit (χ²({df}) = {chi2:.2f}, p = {p_value:.4f}) with a {effect} effect size (w = {cohen_w:.3f})"

    def _interpret_fisher(self, odds_ratio: Decimal, p_value: Decimal) -> str:
        """Generate interpretation for Fisher's exact test"""
        sig = "statistically significant" if p_value < self._to_decimal(str(self.alpha)) else "not statistically significant"

        if odds_ratio == self._to_decimal("inf"):
            or_text = "infinite (perfect association)"
        elif odds_ratio == self._to_decimal("nan"):
            or_text = "undefined"
        else:
            or_text = f"{odds_ratio:.2f}"

        return f"Fisher's exact test is {sig} (OR = {or_text}, p = {p_value:.4f})"

    def _interpret_mcnemar(self, chi2: Decimal, p_value: Decimal, b: int, c: int) -> str:
        """Generate interpretation for McNemar's test"""
        sig = "statistically significant" if p_value < self._to_decimal(str(self.alpha)) else "not statistically significant"

        return f"McNemar's test shows {sig} change (χ² = {chi2:.2f}, p = {p_value:.4f}). Changes: {b} → positive, {c} → negative"

    def _interpret_cochrans_q(self, q: Decimal, p_value: Decimal, k: int) -> str:
        """Generate interpretation for Cochran's Q test"""
        sig = "statistically significant" if p_value < self._to_decimal(str(self.alpha)) else "not statistically significant"

        return f"Cochran's Q test comparing {k} treatments is {sig} (Q = {q:.2f}, p = {p_value:.4f})"

    def _interpret_g_test(self, g: Decimal, p_value: Decimal, df: int) -> str:
        """Generate interpretation for G-test"""
        sig = "statistically significant" if p_value < self._to_decimal(str(self.alpha)) else "not statistically significant"

        return f"The G-test is {sig} (G({df}) = {g:.2f}, p = {p_value:.4f})"

    def _interpret_binomial(self, k: int, n: int, p: float, p_value: Decimal) -> str:
        """Generate interpretation for binomial test"""
        observed_prop = k / n
        sig = (
            "significantly different from" if p_value < self._to_decimal(str(self.alpha)) else "not significantly different from"
        )

        return f"Observed proportion ({observed_prop:.3f}) is {sig} expected ({p:.3f}), p = {p_value:.4f}"

    def _interpret_cochran_armitage(self, z: Decimal, p_value: Decimal) -> str:
        """Generate interpretation for Cochran-Armitage trend test"""
        sig = "statistically significant" if p_value < self._to_decimal(str(self.alpha)) else "not statistically significant"

        return f"The test for trend is {sig} (Z = {z:.2f}, p = {p_value:.4f})"
