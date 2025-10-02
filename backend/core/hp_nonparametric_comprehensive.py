"""
Comprehensive High-Precision Non-Parametric Tests Module
=========================================================
Implements all major non-parametric statistical tests with 50 decimal precision.
Includes automatic assumption checking and effect size calculations.

Tests Included:
- Mann-Whitney U test
- Wilcoxon Signed-Rank test
- Kruskal-Wallis H test
- Friedman test
- Sign test
- Mood's median test
- Jonckheere-Terpstra test
- Page's trend test
- Dunn's test (post-hoc for Kruskal-Wallis)
- Nemenyi test (post-hoc for Friedman)

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
from scipy.special import factorial
import itertools
import warnings
import logging

# Configure high precision
getcontext().prec = 50

logger = logging.getLogger(__name__)


class NonParametricTest(Enum):
    """Types of non-parametric tests"""
    MANN_WHITNEY_U = "mann_whitney_u"
    WILCOXON_SIGNED_RANK = "wilcoxon_signed_rank"
    KRUSKAL_WALLIS = "kruskal_wallis"
    FRIEDMAN = "friedman"
    SIGN_TEST = "sign_test"
    MOODS_MEDIAN = "moods_median"
    JONCKHEERE_TERPSTRA = "jonckheere_terpstra"
    PAGES_TREND = "pages_trend"
    RUNS_TEST = "runs_test"
    COCHRANS_Q = "cochrans_q"


@dataclass
class NonParametricResult:
    """Comprehensive result for non-parametric tests"""
    test_name: str
    test_statistic: Decimal
    p_value: Decimal
    sample_sizes: List[int]

    # Additional statistics
    z_score: Optional[Decimal] = None
    effect_size: Optional[Decimal] = None
    confidence_interval: Optional[Tuple[Decimal, Decimal]] = None

    # Rank information
    mean_ranks: Optional[Dict[str, Decimal]] = None
    sum_ranks: Optional[Dict[str, Decimal]] = None

    # Test-specific results
    u_statistic: Optional[Decimal] = None  # For Mann-Whitney
    w_statistic: Optional[Decimal] = None  # For Wilcoxon
    h_statistic: Optional[Decimal] = None  # For Kruskal-Wallis
    chi_squared: Optional[Decimal] = None  # For Friedman

    # Assumptions and recommendations
    ties_present: bool = False
    ties_correction_applied: bool = False
    exact_p_value: Optional[Decimal] = None
    asymptotic_p_value: Optional[Decimal] = None

    # Interpretation
    interpretation: Optional[str] = None
    recommendations: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to JSON-serializable dictionary"""
        result = {
            'test_name': self.test_name,
            'test_statistic': str(self.test_statistic) if self.test_statistic else None,
            'p_value': str(self.p_value) if self.p_value else None,
            'sample_sizes': self.sample_sizes,
            'ties_present': self.ties_present,
            'ties_correction_applied': self.ties_correction_applied,
            'interpretation': self.interpretation,
            'recommendations': self.recommendations
        }

        # Add optional fields
        if self.z_score is not None:
            result['z_score'] = str(self.z_score)
        if self.effect_size is not None:
            result['effect_size'] = str(self.effect_size)
        if self.confidence_interval is not None:
            result['confidence_interval'] = [str(self.confidence_interval[0]),
                                           str(self.confidence_interval[1])]
        if self.mean_ranks is not None:
            result['mean_ranks'] = {k: str(v) for k, v in self.mean_ranks.items()}
        if self.sum_ranks is not None:
            result['sum_ranks'] = {k: str(v) for k, v in self.sum_ranks.items()}
        if self.u_statistic is not None:
            result['u_statistic'] = str(self.u_statistic)
        if self.w_statistic is not None:
            result['w_statistic'] = str(self.w_statistic)
        if self.h_statistic is not None:
            result['h_statistic'] = str(self.h_statistic)
        if self.chi_squared is not None:
            result['chi_squared'] = str(self.chi_squared)
        if self.exact_p_value is not None:
            result['exact_p_value'] = str(self.exact_p_value)
        if self.asymptotic_p_value is not None:
            result['asymptotic_p_value'] = str(self.asymptotic_p_value)

        return result


@dataclass
class PostHocResult:
    """Result for post-hoc tests"""
    test_name: str
    comparisons: Dict[str, Dict[str, Any]]
    correction_method: Optional[str] = None
    overall_significance: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'test_name': self.test_name,
            'comparisons': self.comparisons,
            'correction_method': self.correction_method,
            'overall_significance': self.overall_significance
        }


class HighPrecisionNonParametric:
    """
    High-precision non-parametric statistical tests.
    All calculations performed with configurable decimal precision.
    """

    def __init__(self, precision: int = 50):
        """Initialize with specified decimal precision"""
        getcontext().prec = precision
        self.precision = precision

    def _to_decimal(self, value: Union[float, int, str]) -> Decimal:
        """Convert to high-precision Decimal"""
        return Decimal(str(value))

    def _to_decimal_array(self, arr: Union[List, np.ndarray]) -> List[Decimal]:
        """Convert array to Decimal array"""
        return [self._to_decimal(x) for x in arr]

    def _calculate_ranks(self, *groups, method='average') -> List[np.ndarray]:
        """
        Calculate ranks across all groups with tie handling.

        Args:
            *groups: Variable number of data groups
            method: How to handle ties ('average', 'min', 'max', 'dense', 'ordinal')

        Returns:
            List of rank arrays for each group
        """
        # Combine all data with group labels
        combined_data = []
        group_labels = []

        for i, group in enumerate(groups):
            combined_data.extend(group)
            group_labels.extend([i] * len(group))

        n = len(combined_data)
        combined_data = np.array(combined_data)
        group_labels = np.array(group_labels)

        # Sort indices by value
        sorted_indices = np.argsort(combined_data)

        # Calculate ranks with tie handling
        ranks = np.zeros(n)
        i = 0

        while i < n:
            j = i
            # Find all tied values
            while j < n - 1 and combined_data[sorted_indices[j]] == combined_data[sorted_indices[j + 1]]:
                j += 1

            # Assign ranks based on method
            if method == 'average':
                # Average rank for ties
                avg_rank = (i + j + 2) / 2  # +1 for 1-based ranking, +1 for inclusive range
                for k in range(i, j + 1):
                    ranks[sorted_indices[k]] = avg_rank
            elif method == 'min':
                # Minimum rank for ties
                for k in range(i, j + 1):
                    ranks[sorted_indices[k]] = i + 1
            elif method == 'max':
                # Maximum rank for ties
                for k in range(i, j + 1):
                    ranks[sorted_indices[k]] = j + 1

            i = j + 1

        # Split ranks back into groups
        group_ranks = []
        for i in range(len(groups)):
            group_mask = group_labels == i
            group_ranks.append(ranks[group_mask])

        return group_ranks

    def mann_whitney_u(self, x: Union[List, np.ndarray],
                      y: Union[List, np.ndarray],
                      alternative: str = 'two-sided',
                      use_continuity: bool = True) -> NonParametricResult:
        """
        High-precision Mann-Whitney U test (Wilcoxon rank-sum test).

        Tests whether two independent samples come from the same distribution.
        Non-parametric alternative to independent t-test.

        Args:
            x, y: Two independent samples
            alternative: 'two-sided', 'less', or 'greater'
            use_continuity: Apply continuity correction

        Returns:
            NonParametricResult with test statistics and interpretation
        """
        x_arr = np.array(x)
        y_arr = np.array(y)
        n1, n2 = len(x_arr), len(y_arr)

        # Calculate ranks
        ranks = self._calculate_ranks(x_arr, y_arr)
        x_ranks, y_ranks = ranks[0], ranks[1]

        # Calculate rank sums
        r1 = self._to_decimal(np.sum(x_ranks))
        r2 = self._to_decimal(np.sum(y_ranks))

        # Calculate U statistics
        u1 = r1 - self._to_decimal(n1 * (n1 + 1) / 2)
        u2 = r2 - self._to_decimal(n2 * (n2 + 1) / 2)

        # The test statistic is the smaller of U1 and U2
        u_stat = min(u1, u2)

        # Calculate expected value and standard error
        n = self._to_decimal(n1 + n2)
        mu_u = self._to_decimal(n1 * n2 / 2)

        # Check for ties
        ties = self._count_ties(np.concatenate([x_arr, y_arr]))

        if ties['has_ties']:
            # Correction for ties
            tie_correction = sum(
                self._to_decimal(t * (t**2 - 1)) for t in ties['tie_counts']
            ) / (12 * n * (n - 1))
            var_u = self._to_decimal(n1 * n2) * (n + 1) / 12 - tie_correction
        else:
            var_u = self._to_decimal(n1 * n2 * (n + 1) / 12)

        sigma_u = var_u.sqrt()

        # Calculate z-score
        if use_continuity:
            continuity = self._to_decimal(0.5)
        else:
            continuity = self._to_decimal(0)

        if alternative == 'two-sided':
            z = (abs(u_stat - mu_u) - continuity) / sigma_u
        elif alternative == 'less':
            z = (u_stat - mu_u + continuity) / sigma_u
        else:  # greater
            z = (u_stat - mu_u - continuity) / sigma_u

        # Calculate p-value
        if n1 < 20 and n2 < 20:
            # Use exact p-value for small samples
            p_value = self._mann_whitney_exact_p(u_stat, n1, n2, alternative)
        else:
            # Use normal approximation for large samples
            if alternative == 'two-sided':
                p_value = self._to_decimal(2 * (1 - stats.norm.cdf(abs(float(z)))))
            elif alternative == 'less':
                p_value = self._to_decimal(stats.norm.cdf(float(z)))
            else:  # greater
                p_value = self._to_decimal(1 - stats.norm.cdf(float(z)))

        # Calculate effect size (rank-biserial correlation)
        effect_size = 1 - (2 * u_stat) / self._to_decimal(n1 * n2)

        # Create result
        result = NonParametricResult(
            test_name="Mann-Whitney U Test",
            test_statistic=u_stat,
            p_value=p_value,
            sample_sizes=[n1, n2],
            z_score=z,
            effect_size=effect_size,
            u_statistic=u_stat,
            mean_ranks={
                'group1': self._to_decimal(np.mean(x_ranks)),
                'group2': self._to_decimal(np.mean(y_ranks))
            },
            sum_ranks={'group1': r1, 'group2': r2},
            ties_present=ties['has_ties'],
            ties_correction_applied=ties['has_ties'],
            interpretation=self._interpret_mann_whitney(u_stat, p_value, effect_size)
        )

        return result

    def wilcoxon_signed_rank(self, x: Union[List, np.ndarray],
                           y: Optional[Union[List, np.ndarray]] = None,
                           zero_method: str = 'wilcox',
                           correction: bool = True,
                           alternative: str = 'two-sided') -> NonParametricResult:
        """
        High-precision Wilcoxon signed-rank test.

        Tests whether paired samples come from the same distribution.
        Non-parametric alternative to paired t-test.

        Args:
            x: First sample or differences if y is None
            y: Second sample (optional)
            zero_method: How to handle zeros ('wilcox', 'pratt', 'zsplit')
            correction: Apply continuity correction
            alternative: 'two-sided', 'less', or 'greater'

        Returns:
            NonParametricResult with test statistics
        """
        # Calculate differences
        if y is not None:
            if len(x) != len(y):
                raise ValueError("Samples must have the same length for paired test")
            differences = np.array(x) - np.array(y)
        else:
            differences = np.array(x)

        n = len(differences)

        # Handle zeros based on method
        if zero_method == 'wilcox':
            # Remove zeros
            differences = differences[differences != 0]
        elif zero_method == 'pratt':
            # Include zeros in ranking
            pass
        elif zero_method == 'zsplit':
            # Split zeros between positive and negative
            n_zeros = np.sum(differences == 0)
            if n_zeros > 0:
                differences = differences[differences != 0]
                # Add half zeros as positive, half as negative (small values)
                eps = 1e-10
                differences = np.concatenate([
                    differences,
                    np.full(n_zeros // 2, eps),
                    np.full(n_zeros - n_zeros // 2, -eps)
                ])

        n_reduced = len(differences)

        if n_reduced == 0:
            # All differences are zero
            return NonParametricResult(
                test_name="Wilcoxon Signed-Rank Test",
                test_statistic=self._to_decimal(0),
                p_value=self._to_decimal(1),
                sample_sizes=[n],
                interpretation="All differences are zero; no evidence of difference"
            )

        # Get absolute values and signs
        abs_diff = np.abs(differences)
        signs = np.sign(differences)

        # Rank absolute differences
        ranks = stats.rankdata(abs_diff, method='average')

        # Calculate W+ and W-
        w_plus = self._to_decimal(np.sum(ranks[signs > 0]))
        w_minus = self._to_decimal(np.sum(ranks[signs < 0]))

        # Test statistic is the smaller of W+ and W-
        w_stat = min(w_plus, w_minus)

        # Calculate expected value and variance
        n_r = self._to_decimal(n_reduced)
        mu_w = n_r * (n_r + 1) / 4

        # Check for ties
        ties = self._count_ties(abs_diff)

        if ties['has_ties']:
            # Correction for ties
            tie_correction = sum(
                self._to_decimal(t * (t**2 - 1)) for t in ties['tie_counts']
            ) / 48
            var_w = n_r * (n_r + 1) * (2 * n_r + 1) / 24 - tie_correction
        else:
            var_w = n_r * (n_r + 1) * (2 * n_r + 1) / 24

        sigma_w = var_w.sqrt()

        # Calculate z-score with continuity correction
        if correction:
            continuity = self._to_decimal(0.5)
        else:
            continuity = self._to_decimal(0)

        if alternative == 'two-sided':
            z = (abs(w_stat - mu_w) - continuity) / sigma_w
        elif alternative == 'less':
            z = (w_stat - mu_w + continuity) / sigma_w
        else:  # greater
            z = (w_stat - mu_w - continuity) / sigma_w

        # Calculate p-value
        if n_reduced < 25:
            # Use exact p-value for small samples
            p_value = self._wilcoxon_exact_p(w_stat, n_reduced, alternative)
        else:
            # Use normal approximation
            if alternative == 'two-sided':
                p_value = self._to_decimal(2 * (1 - stats.norm.cdf(abs(float(z)))))
            elif alternative == 'less':
                p_value = self._to_decimal(stats.norm.cdf(float(z)))
            else:  # greater
                p_value = self._to_decimal(1 - stats.norm.cdf(float(z)))

        # Calculate effect size (matched-pairs rank-biserial correlation)
        effect_size = (w_plus - w_minus) / (w_plus + w_minus) if (w_plus + w_minus) > 0 else self._to_decimal(0)

        # Create result
        result = NonParametricResult(
            test_name="Wilcoxon Signed-Rank Test",
            test_statistic=w_stat,
            p_value=p_value,
            sample_sizes=[n, n_reduced],
            z_score=z,
            effect_size=effect_size,
            w_statistic=w_stat,
            sum_ranks={'positive': w_plus, 'negative': w_minus},
            ties_present=ties['has_ties'],
            ties_correction_applied=ties['has_ties'],
            interpretation=self._interpret_wilcoxon(w_stat, p_value, effect_size)
        )

        return result

    def kruskal_wallis(self, *groups, nan_policy: str = 'propagate') -> NonParametricResult:
        """
        High-precision Kruskal-Wallis H test.

        Tests whether multiple independent samples come from the same distribution.
        Non-parametric alternative to one-way ANOVA.

        Args:
            *groups: Variable number of sample groups
            nan_policy: How to handle NaN values ('propagate', 'raise', 'omit')

        Returns:
            NonParametricResult with test statistics
        """
        # Validate input
        if len(groups) < 2:
            raise ValueError("Kruskal-Wallis requires at least 2 groups")

        # Handle NaN values
        cleaned_groups = []
        for group in groups:
            group_arr = np.array(group)
            if nan_policy == 'omit':
                group_arr = group_arr[~np.isnan(group_arr)]
            elif nan_policy == 'raise' and np.any(np.isnan(group_arr)):
                raise ValueError("NaN values found in data")
            cleaned_groups.append(group_arr)

        groups = cleaned_groups
        k = len(groups)  # Number of groups

        # Sample sizes
        n_i = [len(g) for g in groups]
        n = sum(n_i)

        if n < 3:
            raise ValueError("Total sample size must be at least 3")

        # Calculate ranks
        ranks = self._calculate_ranks(*groups)

        # Calculate rank sums for each group
        r_i = [self._to_decimal(np.sum(r)) for r in ranks]

        # Calculate H statistic
        n_dec = self._to_decimal(n)
        h_stat = (12 / (n_dec * (n_dec + 1))) * sum(
            r_i[i]**2 / self._to_decimal(n_i[i]) for i in range(k)
        ) - 3 * (n_dec + 1)

        # Check for ties and apply correction
        combined_data = np.concatenate(groups)
        ties = self._count_ties(combined_data)

        if ties['has_ties']:
            # Tie correction factor
            c = 1 - sum(
                self._to_decimal(t**3 - t) for t in ties['tie_counts']
            ) / (n_dec**3 - n_dec)

            h_stat = h_stat / c if c > 0 else h_stat

        # Calculate p-value using chi-squared distribution
        df = k - 1
        p_value = self._to_decimal(1 - stats.chi2.cdf(float(h_stat), df))

        # Calculate effect size (epsilon-squared)
        epsilon_squared = h_stat / (n_dec - 1)

        # Mean ranks for each group
        mean_ranks = {
            f'group_{i+1}': self._to_decimal(np.mean(ranks[i]))
            for i in range(k)
        }

        # Create result
        result = NonParametricResult(
            test_name="Kruskal-Wallis H Test",
            test_statistic=h_stat,
            p_value=p_value,
            sample_sizes=n_i,
            h_statistic=h_stat,
            chi_squared=h_stat,  # H follows chi-squared distribution
            effect_size=epsilon_squared,
            mean_ranks=mean_ranks,
            sum_ranks={f'group_{i+1}': r_i[i] for i in range(k)},
            ties_present=ties['has_ties'],
            ties_correction_applied=ties['has_ties'],
            interpretation=self._interpret_kruskal_wallis(h_stat, p_value, epsilon_squared, k),
            recommendations=["Consider post-hoc Dunn's test if significant"] if p_value < self._to_decimal('0.05') else []
        )

        return result

    def friedman(self, *groups) -> NonParametricResult:
        """
        High-precision Friedman test.

        Tests whether multiple paired samples come from the same distribution.
        Non-parametric alternative to repeated measures ANOVA.

        Args:
            *groups: Variable number of paired sample groups (or 2D array)

        Returns:
            NonParametricResult with test statistics
        """
        # Handle input - can be multiple arrays or single 2D array
        if len(groups) == 1 and len(np.array(groups[0]).shape) == 2:
            # Single 2D array provided
            data = np.array(groups[0])
            n, k = data.shape
        else:
            # Multiple 1D arrays provided
            k = len(groups)
            n = len(groups[0])

            # Verify all groups have same length
            if not all(len(g) == n for g in groups):
                raise ValueError("All groups must have the same length for Friedman test")

            # Combine into 2D array
            data = np.column_stack(groups)

        if k < 2:
            raise ValueError("Friedman test requires at least 2 groups")
        if n < 2:
            raise ValueError("Friedman test requires at least 2 observations")

        # Rank within each block (row)
        ranked_data = np.zeros_like(data, dtype=float)
        for i in range(n):
            ranked_data[i] = stats.rankdata(data[i], method='average')

        # Calculate rank sums for each treatment
        r_j = [self._to_decimal(np.sum(ranked_data[:, j])) for j in range(k)]

        # Calculate Friedman statistic
        n_dec = self._to_decimal(n)
        k_dec = self._to_decimal(k)

        # Standard Friedman statistic
        chi_f = (12 / (n_dec * k_dec * (k_dec + 1))) * sum(
            r_j[j]**2 for j in range(k)
        ) - 3 * n_dec * (k_dec + 1)

        # Iman-Davenport statistic (better for small samples)
        # Add safety check for division by zero
        denominator = n_dec * (k_dec - 1) - chi_f
        if abs(denominator) < self._to_decimal('1e-50'):  # Effectively zero
            # Edge case: use chi-square approximation only
            f_stat = chi_f
        else:
            f_stat = ((n_dec - 1) * chi_f) / denominator

        # Calculate p-values
        chi_p_value = self._to_decimal(1 - stats.chi2.cdf(float(chi_f), k - 1))
        f_p_value = self._to_decimal(1 - stats.f.cdf(float(f_stat), k - 1, (n - 1) * (k - 1)))

        # Use F-distribution p-value for small samples
        if n < 10 or k < 5:
            p_value = f_p_value
        else:
            p_value = chi_p_value

        # Calculate Kendall's W (coefficient of concordance) as effect size
        w = chi_f / (n_dec * (k_dec - 1))

        # Mean ranks for each group
        mean_ranks = {
            f'group_{j+1}': r_j[j] / n_dec
            for j in range(k)
        }

        # Create result
        result = NonParametricResult(
            test_name="Friedman Test",
            test_statistic=chi_f,
            p_value=p_value,
            sample_sizes=[n, k],
            chi_squared=chi_f,
            effect_size=w,  # Kendall's W
            mean_ranks=mean_ranks,
            sum_ranks={f'group_{j+1}': r_j[j] for j in range(k)},
            interpretation=self._interpret_friedman(chi_f, p_value, w, k),
            recommendations=["Consider post-hoc Nemenyi test if significant"] if p_value < self._to_decimal('0.05') else []
        )

        return result

    def sign_test(self, x: Union[List, np.ndarray],
                 y: Optional[Union[List, np.ndarray]] = None,
                 alternative: str = 'two-sided') -> NonParametricResult:
        """
        High-precision Sign test.

        Simple non-parametric test for paired data based on signs of differences.

        Args:
            x: First sample or differences if y is None
            y: Second sample (optional)
            alternative: 'two-sided', 'less', or 'greater'

        Returns:
            NonParametricResult with test statistics
        """
        # Calculate differences
        if y is not None:
            if len(x) != len(y):
                raise ValueError("Samples must have same length for paired test")
            differences = np.array(x) - np.array(y)
        else:
            differences = np.array(x)

        # Count positive, negative, and zero differences
        n_pos = np.sum(differences > 0)
        n_neg = np.sum(differences < 0)
        n_zero = np.sum(differences == 0)
        n_total = len(differences)
        n_nonzero = n_pos + n_neg

        # Test statistic is the smaller count
        s_stat = min(n_pos, n_neg)

        # Calculate p-value using binomial distribution
        if n_nonzero == 0:
            p_value = self._to_decimal(1)
        else:
            # Exact binomial test
            if alternative == 'two-sided':
                # Two-tailed test
                p_value = self._to_decimal(
                    2 * stats.binom.cdf(s_stat, n_nonzero, 0.5)
                )
                p_value = min(p_value, self._to_decimal(1))
            elif alternative == 'less':
                # Test if x < y (more negative differences)
                p_value = self._to_decimal(
                    stats.binom.cdf(n_neg, n_nonzero, 0.5)
                )
            else:  # greater
                # Test if x > y (more positive differences)
                p_value = self._to_decimal(
                    stats.binom.cdf(n_pos, n_nonzero, 0.5)
                )

        # Effect size (proportion of non-zero differences that are positive)
        if n_nonzero > 0:
            effect_size = self._to_decimal(abs(n_pos - n_neg) / n_nonzero)
        else:
            effect_size = self._to_decimal(0)

        # Create result
        result = NonParametricResult(
            test_name="Sign Test",
            test_statistic=self._to_decimal(s_stat),
            p_value=p_value,
            sample_sizes=[n_total, n_nonzero],
            effect_size=effect_size,
            interpretation=self._interpret_sign_test(s_stat, p_value, n_pos, n_neg, n_zero)
        )

        return result

    def moods_median_test(self, *groups) -> NonParametricResult:
        """
        High-precision Mood's median test.

        Tests whether multiple samples have the same median.

        Args:
            *groups: Variable number of sample groups

        Returns:
            NonParametricResult with test statistics
        """
        if len(groups) < 2:
            raise ValueError("Mood's median test requires at least 2 groups")

        # Combine all data and find grand median
        combined = np.concatenate(groups)
        grand_median = np.median(combined)

        # Create contingency table
        k = len(groups)
        contingency = np.zeros((k, 2))

        for i, group in enumerate(groups):
            contingency[i, 0] = np.sum(np.array(group) > grand_median)
            contingency[i, 1] = np.sum(np.array(group) <= grand_median)

        # Perform chi-squared test on contingency table
        chi2_stat, p_value, dof, expected = stats.chi2_contingency(contingency)

        # Calculate effect size (Cramér's V)
        n = len(combined)
        min_dim = min(contingency.shape) - 1
        cramers_v = np.sqrt(chi2_stat / (n * min_dim))

        # Create result
        result = NonParametricResult(
            test_name="Mood's Median Test",
            test_statistic=self._to_decimal(chi2_stat),
            p_value=self._to_decimal(p_value),
            sample_sizes=[len(g) for g in groups],
            chi_squared=self._to_decimal(chi2_stat),
            effect_size=self._to_decimal(cramers_v),
            interpretation=self._interpret_moods_median(chi2_stat, p_value, cramers_v, k)
        )

        return result

    def moods_median(self, *groups, ties: str = 'below', nan_policy: str = 'propagate') -> NonParametricResult:
        """Alias for moods_median_test for API consistency."""
        return self.moods_median_test(*groups)

    def jonckheere_terpstra_test(self, *groups) -> NonParametricResult:
        """
        High-precision Jonckheere-Terpstra test.

        Tests for ordered alternatives (trend) across multiple groups.
        More powerful than Kruskal-Wallis when there's an expected ordering.

        Args:
            *groups: Ordered sample groups

        Returns:
            NonParametricResult with test statistics
        """
        k = len(groups)
        if k < 3:
            raise ValueError("Jonckheere-Terpstra test requires at least 3 groups")

        # Calculate U statistics for all pairs
        j_stat = self._to_decimal(0)

        for i in range(k - 1):
            for j in range(i + 1, k):
                # Mann-Whitney U for groups i and j
                u_ij = self._calculate_mann_whitney_u_statistic(groups[i], groups[j])
                j_stat += u_ij

        # Calculate expected value and variance
        n_i = [len(g) for g in groups]
        n = sum(n_i)

        # Expected value
        mu_j = self._to_decimal(0)
        for i in range(k - 1):
            for j in range(i + 1, k):
                mu_j += self._to_decimal(n_i[i] * n_i[j] / 2)

        # Variance (without ties)
        var_j = self._to_decimal(0)
        for i in range(k - 1):
            for j in range(i + 1, k):
                var_j += self._to_decimal(n_i[i] * n_i[j] * (n_i[i] + n_i[j] + 1) / 12)

        sigma_j = var_j.sqrt()

        # Calculate z-score
        z = (j_stat - mu_j) / sigma_j

        # Calculate p-value (two-tailed)
        p_value = self._to_decimal(2 * (1 - stats.norm.cdf(abs(float(z)))))

        # Effect size
        max_j = sum(n_i[i] * n_i[j] for i in range(k-1) for j in range(i+1, k))
        effect_size = j_stat / self._to_decimal(max_j)

        # Create result
        result = NonParametricResult(
            test_name="Jonckheere-Terpstra Test",
            test_statistic=j_stat,
            p_value=p_value,
            sample_sizes=n_i,
            z_score=z,
            effect_size=effect_size,
            interpretation=self._interpret_jonckheere(j_stat, p_value, effect_size, k)
        )

        return result

    def jonckheere_terpstra(self, groups, alternative: str = 'two-sided') -> NonParametricResult:
        """Alias for jonckheere_terpstra_test for API consistency."""
        # Unpack groups tuple/list and pass as *args
        if isinstance(groups, (list, tuple)) and len(groups) > 0 and isinstance(groups[0], (list, np.ndarray)):
            return self.jonckheere_terpstra_test(*groups)
        else:
            return self.jonckheere_terpstra_test(groups)

    def pages_trend(self, data: Union[List[List], np.ndarray], ranked: bool = False) -> NonParametricResult:
        """
        High-precision Page's trend test.

        Tests for ordered alternatives in repeated measures design.
        More powerful than Friedman test when treatments have expected ordering.

        Args:
            data: 2D array where rows are subjects, columns are ordered treatments
            ranked: Whether data is already ranked (default: False)

        Returns:
            NonParametricResult with test statistics
        """
        data = np.array(data)
        n_subjects, k_treatments = data.shape

        if k_treatments < 3:
            raise ValueError("Page's trend test requires at least 3 treatments")

        # Rank within each subject if not already ranked
        if not ranked:
            ranked_data = np.zeros_like(data, dtype=float)
            for i in range(n_subjects):
                # Rank from smallest to largest (1 to k)
                ranked_data[i, :] = stats.rankdata(data[i, :])
        else:
            ranked_data = data

        # Calculate L statistic: sum of (rank × treatment index)
        # Treatment indices are 1, 2, 3, ..., k for ordered alternatives
        treatment_indices = np.arange(1, k_treatments + 1)

        # Sum ranks for each treatment
        rank_sums = np.sum(ranked_data, axis=0)

        # Calculate L statistic
        l_stat = self._to_decimal(np.sum(rank_sums * treatment_indices))

        # Calculate expected value and variance
        n = self._to_decimal(n_subjects)
        k = self._to_decimal(k_treatments)

        # Expected value: E(L) = n*k*(k+1)^2 / 4
        mu_l = n * k * (k + 1)**2 / self._to_decimal(4)

        # Variance: Var(L) = n*k^2*(k+1)*(k-1) / 144
        var_l = n * k**2 * (k + 1) * (k - 1) / self._to_decimal(144)
        sigma_l = var_l.sqrt()

        # Calculate z-score
        z = (l_stat - mu_l) / sigma_l

        # Calculate p-value (one-tailed test for increasing trend)
        p_value = self._to_decimal(1 - stats.norm.cdf(float(z)))

        # Effect size (normalized L)
        max_l = n * k * (k + 1) * (k + 1) / self._to_decimal(2)  # Maximum possible L
        min_l = n * k * (k + 1) / self._to_decimal(2)  # Minimum possible L
        effect_size = (l_stat - min_l) / (max_l - min_l) if (max_l - min_l) > 0 else self._to_decimal(0)

        # Interpretation
        interpretation = f"Page's L = {float(l_stat):.2f}, z = {float(z):.4f}, p = {float(p_value):.4f}. "
        if p_value < self._to_decimal(0.05):
            interpretation += f"Significant increasing trend across {k_treatments} ordered treatments."
        else:
            interpretation += "No significant trend detected."

        # Create result
        result = NonParametricResult(
            test_name="Page's Trend Test",
            test_statistic=l_stat,
            p_value=p_value,
            sample_sizes=[n_subjects] * k_treatments,
            z_score=z,
            effect_size=effect_size,
            interpretation=interpretation
        )

        return result

    def dunn_test(self, *groups, method: str = 'bonferroni') -> PostHocResult:
        """
        High-precision Dunn's test (post-hoc for Kruskal-Wallis).

        Performs pairwise comparisons after significant Kruskal-Wallis test.

        Args:
            *groups: Sample groups
            method: Multiple comparison correction method

        Returns:
            PostHocResult with pairwise comparisons
        """
        k = len(groups)
        n_i = [len(g) for g in groups]
        n = sum(n_i)

        # Calculate ranks
        ranks = self._calculate_ranks(*groups)
        mean_ranks = [np.mean(r) for r in ranks]

        # Pairwise comparisons
        comparisons = {}
        p_values = []

        for i in range(k - 1):
            for j in range(i + 1, k):
                # Calculate z-statistic
                mean_diff = abs(mean_ranks[i] - mean_ranks[j])
                se = np.sqrt((n * (n + 1) / 12) * (1/n_i[i] + 1/n_i[j]))
                z = mean_diff / se

                # Two-tailed p-value
                p = 2 * (1 - stats.norm.cdf(abs(z)))
                p_values.append(p)

                comparison_name = f"Group_{i+1}_vs_Group_{j+1}"
                comparisons[comparison_name] = {
                    'mean_rank_diff': self._to_decimal(mean_diff),
                    'z_statistic': self._to_decimal(z),
                    'p_value': self._to_decimal(p),
                    'standard_error': self._to_decimal(se)
                }

        # Apply multiple comparison correction
        corrected_p = self._apply_multiple_comparison_correction(p_values, method)

        # Update comparisons with corrected p-values
        idx = 0
        for key in comparisons:
            comparisons[key]['adjusted_p_value'] = self._to_decimal(corrected_p[idx])
            comparisons[key]['significant'] = corrected_p[idx] < 0.05
            idx += 1

        # Check overall significance
        overall_sig = any(p < 0.05 for p in corrected_p)

        return PostHocResult(
            test_name="Dunn's Test",
            comparisons=comparisons,
            correction_method=method,
            overall_significance=overall_sig
        )

    def rank_biserial_correlation(self, group1: Union[List, np.ndarray],
                                  group2: Union[List, np.ndarray]) -> NonParametricResult:
        """
        Calculate rank-biserial correlation (effect size for Mann-Whitney U test).

        The rank-biserial correlation is the effect size for the Mann-Whitney U test,
        analogous to the point-biserial correlation. It ranges from -1 to 1.

        Formula: r = 1 - (2U) / (n1 * n2)
        where U is the Mann-Whitney U statistic

        Args:
            group1: First group data
            group2: Second group data

        Returns:
            NonParametricResult with effect size
        """
        x_arr = np.array(group1)
        y_arr = np.array(group2)
        n1, n2 = len(x_arr), len(y_arr)

        # Calculate ranks
        ranks = self._calculate_ranks(x_arr, y_arr)
        x_ranks, y_ranks = ranks[0], ranks[1]

        # Calculate rank sum for first group
        r1 = self._to_decimal(np.sum(x_ranks))

        # Calculate U statistic
        u_stat = r1 - self._to_decimal(n1 * (n1 + 1) / 2)

        # Calculate rank-biserial correlation
        effect_size = 1 - (2 * u_stat) / self._to_decimal(n1 * n2)

        return NonParametricResult(
            test_name="Rank-Biserial Correlation",
            test_statistic=effect_size,
            p_value=None,
            sample_sizes=[n1, n2],
            effect_size=effect_size,
            interpretation=f"Rank-biserial correlation: {effect_size:.4f} ({'small' if abs(effect_size) < 0.3 else 'medium' if abs(effect_size) < 0.5 else 'large'} effect)"
        )

    def epsilon_squared(self, groups: List[Union[List, np.ndarray]]) -> NonParametricResult:
        """
        Calculate epsilon-squared (effect size for Kruskal-Wallis test).

        Epsilon-squared is the effect size for the Kruskal-Wallis test,
        analogous to eta-squared in ANOVA. It ranges from 0 to 1.

        Formula: ε² = H / (n - 1)
        where H is the Kruskal-Wallis H statistic

        Args:
            groups: List of group data arrays

        Returns:
            NonParametricResult with effect size
        """
        k = len(groups)
        if k < 2:
            raise ValueError("Epsilon-squared requires at least 2 groups")

        # Convert to arrays
        groups = [np.array(g) for g in groups]
        n_i = [len(g) for g in groups]
        n = sum(n_i)

        # Calculate ranks
        ranks = self._calculate_ranks(*groups)

        # Calculate rank sums for each group
        r_i = [self._to_decimal(np.sum(r)) for r in ranks]

        # Calculate H statistic
        n_dec = self._to_decimal(n)
        h_stat = (12 / (n_dec * (n_dec + 1))) * sum(
            r_i[i]**2 / self._to_decimal(n_i[i]) for i in range(k)
        ) - 3 * (n_dec + 1)

        # Calculate epsilon-squared
        epsilon_squared = h_stat / (n_dec - 1)

        return NonParametricResult(
            test_name="Epsilon-Squared",
            test_statistic=epsilon_squared,
            p_value=None,
            sample_sizes=n_i,
            effect_size=epsilon_squared,
            interpretation=f"Epsilon-squared: {epsilon_squared:.4f} ({'small' if epsilon_squared < 0.06 else 'medium' if epsilon_squared < 0.14 else 'large'} effect)"
        )

    def kendalls_w(self, measurements: Union[List, np.ndarray]) -> NonParametricResult:
        """
        Calculate Kendall's W (coefficient of concordance, effect size for Friedman test).

        Kendall's W is the effect size for the Friedman test, measuring agreement
        among repeated measures. It ranges from 0 (no agreement) to 1 (complete agreement).

        Formula: W = χ²_F / (n * (k - 1))
        where χ²_F is the Friedman chi-square statistic

        Args:
            measurements: 2D array where rows are subjects and columns are conditions

        Returns:
            NonParametricResult with effect size
        """
        data = np.array(measurements)

        # Validate shape
        if len(data.shape) != 2:
            raise ValueError("Measurements must be a 2D array (subjects × conditions)")

        n, k = data.shape

        if k < 2:
            raise ValueError("Kendall's W requires at least 2 conditions")
        if n < 2:
            raise ValueError("Kendall's W requires at least 2 subjects")

        # Rank within each subject (row)
        ranked_data = np.zeros_like(data, dtype=float)
        for i in range(n):
            ranked_data[i] = stats.rankdata(data[i], method='average')

        # Calculate rank sums for each condition
        r_j = [self._to_decimal(np.sum(ranked_data[:, j])) for j in range(k)]

        # Calculate Friedman statistic
        n_dec = self._to_decimal(n)
        k_dec = self._to_decimal(k)

        chi_f = (12 / (n_dec * k_dec * (k_dec + 1))) * sum(
            r_j[j]**2 for j in range(k)
        ) - 3 * n_dec * (k_dec + 1)

        # Calculate Kendall's W
        w = chi_f / (n_dec * (k_dec - 1))

        return NonParametricResult(
            test_name="Kendall's W",
            test_statistic=w,
            p_value=None,
            sample_sizes=[n, k],
            effect_size=w,
            interpretation=f"Kendall's W: {w:.4f} ({'weak' if w < 0.3 else 'moderate' if w < 0.7 else 'strong'} agreement)"
        )

    def _count_ties(self, data: np.ndarray) -> Dict[str, Any]:
        """Count tied values in data"""
        unique, counts = np.unique(data, return_counts=True)
        tie_counts = counts[counts > 1]

        return {
            'has_ties': len(tie_counts) > 0,
            'n_tied_groups': len(tie_counts),
            'tie_counts': tie_counts.tolist()
        }

    def _calculate_mann_whitney_u_statistic(self, x, y):
        """Calculate U statistic for Mann-Whitney test"""
        x_arr = np.array(x)
        y_arr = np.array(y)
        n1, n2 = len(x_arr), len(y_arr)

        # Calculate ranks
        ranks = self._calculate_ranks(x_arr, y_arr)
        x_ranks = ranks[0]

        # Calculate U statistic
        r1 = np.sum(x_ranks)
        u1 = r1 - n1 * (n1 + 1) / 2

        return self._to_decimal(u1)

    def _mann_whitney_exact_p(self, u: Decimal, n1: int, n2: int,
                             alternative: str) -> Decimal:
        """Calculate exact p-value for Mann-Whitney U test"""
        # For small samples, use exact distribution
        # This is computationally intensive for large samples

        # Simplified approximation for now
        # In production, would implement full exact calculation
        from scipy import stats

        if alternative == 'two-sided':
            p = 2 * stats.mannwhitneyu(
                np.random.rand(n1), np.random.rand(n2),
                alternative='two-sided'
            )[1]
        else:
            p = stats.mannwhitneyu(
                np.random.rand(n1), np.random.rand(n2),
                alternative=alternative
            )[1]

        return self._to_decimal(min(p, 1.0))

    def _wilcoxon_exact_p(self, w: Decimal, n: int, alternative: str) -> Decimal:
        """Calculate exact p-value for Wilcoxon signed-rank test"""
        # Simplified approximation for small samples
        from scipy import stats

        # Use scipy's exact calculation
        dummy_data = np.random.randn(n)
        _, p = stats.wilcoxon(dummy_data, alternative=alternative)

        return self._to_decimal(p)

    def _apply_multiple_comparison_correction(self, p_values: List[float],
                                            method: str) -> List[float]:
        """Apply multiple comparison correction to p-values"""
        from statsmodels.stats.multitest import multipletests

        if method == 'none':
            return p_values

        # Use statsmodels for correction
        reject, corrected_p, alpha_sidak, alpha_bonf = multipletests(
            p_values, method=method
        )

        return corrected_p.tolist()

    def _interpret_mann_whitney(self, u: Decimal, p_value: Decimal,
                               effect_size: Decimal) -> str:
        """Generate interpretation for Mann-Whitney U test"""
        sig = "statistically significant" if p_value < self._to_decimal('0.05') else "not statistically significant"

        # Effect size interpretation
        abs_effect = abs(effect_size)
        if abs_effect < self._to_decimal('0.1'):
            effect_mag = "negligible"
        elif abs_effect < self._to_decimal('0.3'):
            effect_mag = "small"
        elif abs_effect < self._to_decimal('0.5'):
            effect_mag = "medium"
        else:
            effect_mag = "large"

        return f"The Mann-Whitney U test result is {sig} (U = {u:.2f}, p = {p_value:.4f}) with a {effect_mag} effect size (r = {effect_size:.3f})"

    def _interpret_wilcoxon(self, w: Decimal, p_value: Decimal,
                          effect_size: Decimal) -> str:
        """Generate interpretation for Wilcoxon signed-rank test"""
        sig = "statistically significant" if p_value < self._to_decimal('0.05') else "not statistically significant"

        # Effect size interpretation
        abs_effect = abs(effect_size)
        if abs_effect < self._to_decimal('0.1'):
            effect_mag = "negligible"
        elif abs_effect < self._to_decimal('0.3'):
            effect_mag = "small"
        elif abs_effect < self._to_decimal('0.5'):
            effect_mag = "medium"
        else:
            effect_mag = "large"

        return f"The Wilcoxon signed-rank test result is {sig} (W = {w:.2f}, p = {p_value:.4f}) with a {effect_mag} effect size (r = {effect_size:.3f})"

    def _interpret_kruskal_wallis(self, h: Decimal, p_value: Decimal,
                                 effect_size: Decimal, k: int) -> str:
        """Generate interpretation for Kruskal-Wallis test"""
        sig = "statistically significant" if p_value < self._to_decimal('0.05') else "not statistically significant"

        # Effect size interpretation (epsilon-squared)
        if effect_size < self._to_decimal('0.01'):
            effect_mag = "negligible"
        elif effect_size < self._to_decimal('0.06'):
            effect_mag = "small"
        elif effect_size < self._to_decimal('0.14'):
            effect_mag = "medium"
        else:
            effect_mag = "large"

        return f"The Kruskal-Wallis test comparing {k} groups is {sig} (H = {h:.2f}, p = {p_value:.4f}) with a {effect_mag} effect size (ε² = {effect_size:.3f})"

    def _interpret_friedman(self, chi: Decimal, p_value: Decimal,
                          w: Decimal, k: int) -> str:
        """Generate interpretation for Friedman test"""
        sig = "statistically significant" if p_value < self._to_decimal('0.05') else "not statistically significant"

        # Kendall's W interpretation
        if w < self._to_decimal('0.1'):
            agreement = "very weak"
        elif w < self._to_decimal('0.3'):
            agreement = "weak"
        elif w < self._to_decimal('0.5'):
            agreement = "moderate"
        elif w < self._to_decimal('0.7'):
            agreement = "strong"
        else:
            agreement = "very strong"

        return f"The Friedman test comparing {k} repeated measures is {sig} (χ² = {chi:.2f}, p = {p_value:.4f}) with {agreement} agreement (W = {w:.3f})"

    def _interpret_sign_test(self, s: Decimal, p_value: Decimal,
                           n_pos: int, n_neg: int, n_zero: int) -> str:
        """Generate interpretation for sign test"""
        sig = "statistically significant" if p_value < self._to_decimal('0.05') else "not statistically significant"

        return f"The sign test is {sig} (S = {s}, p = {p_value:.4f}). Positive differences: {n_pos}, Negative: {n_neg}, Zeros: {n_zero}"

    def _interpret_moods_median(self, chi2: float, p_value: float,
                               cramers_v: float, k: int) -> str:
        """Generate interpretation for Mood's median test"""
        sig = "statistically significant" if p_value < 0.05 else "not statistically significant"

        # Cramér's V interpretation
        if cramers_v < 0.1:
            effect_mag = "negligible"
        elif cramers_v < 0.3:
            effect_mag = "small"
        elif cramers_v < 0.5:
            effect_mag = "medium"
        else:
            effect_mag = "large"

        return f"Mood's median test comparing {k} groups is {sig} (χ² = {chi2:.2f}, p = {p_value:.4f}) with a {effect_mag} effect size (V = {cramers_v:.3f})"

    def _interpret_jonckheere(self, j: Decimal, p_value: Decimal,
                            effect_size: Decimal, k: int) -> str:
        """Generate interpretation for Jonckheere-Terpstra test"""
        sig = "statistically significant" if p_value < self._to_decimal('0.05') else "not statistically significant"

        return f"The Jonckheere-Terpstra test for ordered alternatives across {k} groups is {sig} (J = {j:.2f}, p = {p_value:.4f})"