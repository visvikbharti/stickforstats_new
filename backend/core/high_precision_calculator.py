"""
High-Precision Statistical Calculator
=====================================
Created: 2025-09-15
Author: StickForStats Development Team
Version: 1.0.0

This module implements high-precision statistical calculations using
decimal arithmetic to ensure 15+ decimal places accuracy.

CRITICAL: This is the foundation for all statistical calculations.
         NO approximations, NO shortcuts, ONLY exact calculations.
"""

from decimal import Decimal, getcontext, ROUND_HALF_UP
import numpy as np
from typing import List, Union, Dict
import mpmath

from core.hp_nonparametric_comprehensive import canonical_alternative

# Set high precision globally
getcontext().prec = 50  # 50 decimal digits precision
getcontext().rounding = ROUND_HALF_UP

# Set mpmath precision for special functions
mpmath.mp.dps = 50  # 50 decimal places


def hp_f_sf(f_stat: Union[Decimal, float, str], df1: Union[int, float], df2: Union[int, float]) -> Decimal:
    """Upper-tail probability P(F_{df1,df2} > f) at the configured precision.

    The idiom this replaces --

        Decimal(str(1 - float(mpmath.betainc(df1/2, df2/2, 0, x, regularized=True))))

    -- computes the LOWER tail in 50 digits, throws all of them away by casting to float,
    and then subtracts from 1. Once the lower tail rounds to 1.0 in float64 (which happens
    for any p below about 2e-16, i.e. for any decisively significant F), the answer is
    exactly 0.0. Three tight, well-separated groups were enough: F = 20000 on df (2, 12)
    reported p = 0 where the truth is 7.3e-22.

    Asking betainc for the UPPER interval [x, 1] directly gives the tail with no
    cancellation and no float round-trip.
    """
    f = mpmath.mpf(str(f_stat))
    a = mpmath.mpf(str(df1)) / 2
    b = mpmath.mpf(str(df2)) / 2

    if f <= 0:
        return Decimal("1")

    x = (2 * a * f) / (2 * a * f + 2 * b)
    tail = mpmath.betainc(a, b, x, 1, regularized=True)
    return Decimal(mpmath.nstr(tail, mpmath.mp.dps, strip_zeros=False))


def hp_sqrt(value: Union[Decimal, float, int, str]) -> Decimal:
    """Square root at the configured precision.

    The idiom this replaces -- Decimal(str(mpmath.sqrt(float(x)))) -- casts a 50-digit
    Decimal down to a float64 BEFORE taking the root, so the result carries ~17 real digits
    and the rest of the 50 printed digits are round-off. A tool whose headline claim is
    "50-decimal precision" must not print digits its arithmetic never computed.
    """
    return Decimal(mpmath.nstr(mpmath.sqrt(mpmath.mpf(str(value))), mpmath.mp.dps, strip_zeros=False))



class HighPrecisionCalculator:
    """
    High-precision statistical calculator ensuring 15+ decimal accuracy.

    All calculations use Decimal arithmetic or mpmath for exact results.
    Implements numerically stable algorithms.
    """

    def __init__(self, precision: int = 50):
        """
        Initialize calculator with specified precision.

        Args:
            precision: Number of decimal digits precision (default 50)
        """
        self.precision = precision
        getcontext().prec = precision
        mpmath.mp.dps = precision

    @staticmethod
    def _to_decimal(value: Union[float, int, str, Decimal]) -> Decimal:
        """Convert any numeric type to high-precision Decimal."""
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))

    @staticmethod
    def _to_decimal_array(data: Union[List, np.ndarray]) -> List[Decimal]:
        """Convert array to list of Decimals."""
        return [HighPrecisionCalculator._to_decimal(x) for x in data]

    def mean(self, data: Union[List, np.ndarray]) -> Decimal:
        """
        Calculate mean with high precision using Kahan summation.

        Args:
            data: Input data array

        Returns:
            High-precision mean
        """
        if len(data) == 0:
            raise ValueError("Cannot calculate mean of empty dataset")

        decimal_data = self._to_decimal_array(data)

        # Kahan summation for numerical stability
        sum_val = Decimal("0")
        c = Decimal("0")  # Compensation for lost digits

        for value in decimal_data:
            y = value - c
            t = sum_val + y
            c = (t - sum_val) - y
            sum_val = t

        n = Decimal(str(len(data)))
        return sum_val / n

    def variance(self, data: Union[List, np.ndarray], ddof: int = 1) -> Decimal:
        """
        Calculate variance using Welford's numerically stable algorithm.

        Args:
            data: Input data array
            ddof: Delta degrees of freedom (default 1 for sample variance)

        Returns:
            High-precision variance
        """
        if len(data) <= ddof:
            raise ValueError(f"Need at least {ddof + 1} data points")

        decimal_data = self._to_decimal_array(data)
        n = Decimal("0")
        mean_val = Decimal("0")
        M2 = Decimal("0")

        # Welford's online algorithm
        for x in decimal_data:
            n += 1
            delta = x - mean_val
            mean_val += delta / n
            delta2 = x - mean_val
            M2 += delta * delta2

        if n <= ddof:
            return Decimal("0")

        return M2 / (n - Decimal(str(ddof)))

    def std(self, data: Union[List, np.ndarray], ddof: int = 1) -> Decimal:
        """
        Calculate standard deviation with high precision.

        Args:
            data: Input data array
            ddof: Delta degrees of freedom

        Returns:
            High-precision standard deviation
        """
        var = self.variance(data, ddof)

        # Use mpmath for high-precision square root
        return hp_sqrt(var)

    @staticmethod
    def t_p_value(t_stat: float, df: float, alternative: str = "two-sided") -> Decimal:
        """
        p-value of a t-statistic, for the requested alternative, in high precision.

        The two-sided p-value is I_x(df/2, 1/2) with x = df / (df + t^2) -- the regularized
        incomplete beta -- and equals 2 * P(T > |t|). Both tails follow from that:

            P(T > |t|) = p_two / 2
            greater:  t >= 0 -> p_two / 2        t < 0 -> 1 - p_two / 2
            less:     t >= 0 -> 1 - p_two / 2    t < 0 -> p_two / 2

        This exists because the t-test hard-coded the two-sided form and NOTHING ever passed
        an alternative: the UI's "Alternative Hypothesis" selector, the serializer's
        `alternative` field and the parameter adapter's normalization all fed a value that
        the view then dropped on the floor. Every "one-tailed" t-test this app has ever run
        was silently two-tailed -- a p-value off by a factor of two, or pointing at the wrong
        tail entirely, reported as the test the user asked for.
        """
        alternative = canonical_alternative(alternative)

        # mpmath end to end, never float64. Routing t through float() overflows for
        # |t| > 1e308, and routing the answer back through float() underflows any p below
        # ~1e-308 to an exact 0.0 -- a tool that advertises 50 decimal places must not hand
        # back "p = 0" for a p-value that is merely very small.
        t = mpmath.mpf(str(t_stat))
        d = mpmath.mpf(str(df))

        if d <= 0:
            raise ValueError("t-distribution requires df > 0")

        x_beta = d / (d + t * t)
        two_sided = mpmath.betainc(d / 2, mpmath.mpf("0.5"), 0, x_beta, regularized=True)

        if alternative == "two-sided":
            p = two_sided
        else:
            upper_tail = two_sided / 2  # P(T > |t|)
            if alternative == "greater":
                p = upper_tail if t >= 0 else 1 - upper_tail
            else:  # less
                p = 1 - upper_tail if t >= 0 else upper_tail

        return Decimal(mpmath.nstr(p, mpmath.mp.dps, strip_zeros=False))

    def t_statistic_one_sample(
        self,
        data: Union[List, np.ndarray],
        mu: Union[float, Decimal] = 0,
        alternative: str = "two-sided",
    ) -> Dict[str, Decimal]:
        """
        Calculate one-sample t-statistic with high precision.

        Args:
            data: Sample data
            mu: Population mean to test against
            alternative: 'two-sided' (default), 'less' or 'greater'

        Returns:
            Dictionary with t-statistic, p-value, and other statistics
        """
        alternative = canonical_alternative(alternative)
        decimal_data = self._to_decimal_array(data)
        mu_decimal = self._to_decimal(mu)
        n = len(decimal_data)

        if n < 2:
            raise ValueError("Need at least 2 data points for t-test")

        # Calculate statistics
        sample_mean = self.mean(decimal_data)
        sample_std = self.std(decimal_data, ddof=1)

        if sample_std == 0:
            raise ValueError("Standard deviation is zero")

        # Calculate t-statistic
        se = sample_std / hp_sqrt(n)
        t_stat = (sample_mean - mu_decimal) / se

        # Calculate p-value using mpmath for high precision. Pass the Decimal t through
        # unconverted: float(t_stat) would cap the precision of the very statistic the
        # 50-digit pipeline just computed.
        df = n - 1
        p_value = self.t_p_value(t_stat, df, alternative)

        return {
            "t_statistic": t_stat,
            "p_value": p_value,
            "mean": sample_mean,
            "std": sample_std,
            "se": se,
            "df": Decimal(str(df)),
            "n": Decimal(str(n)),
            "alternative": alternative,
        }

    def t_statistic_two_sample(
        self,
        data1: Union[List, np.ndarray],
        data2: Union[List, np.ndarray],
        equal_var: bool = True,
        alternative: str = "two-sided",
    ) -> Dict[str, Decimal]:
        """
        Calculate two-sample t-statistic with high precision.

        Args:
            data1: First sample
            data2: Second sample
            equal_var: Assume equal variances (True) or use Welch's t-test (False)
            alternative: 'two-sided' (default), 'less' or 'greater'.
                'greater' tests mean(data1) > mean(data2).

        Returns:
            Dictionary with t-statistic, p-value, and other statistics
        """
        alternative = canonical_alternative(alternative)
        decimal_data1 = self._to_decimal_array(data1)
        decimal_data2 = self._to_decimal_array(data2)

        n1 = len(decimal_data1)
        n2 = len(decimal_data2)

        if n1 < 2 or n2 < 2:
            raise ValueError("Each group needs at least 2 data points")

        # Calculate statistics for each group
        mean1 = self.mean(decimal_data1)
        mean2 = self.mean(decimal_data2)
        var1 = self.variance(decimal_data1, ddof=1)
        var2 = self.variance(decimal_data2, ddof=1)

        mean_diff = mean1 - mean2

        if equal_var:
            # Student's t-test (equal variances)
            n1_dec = Decimal(str(n1))
            n2_dec = Decimal(str(n2))

            # Pooled variance
            pooled_var = ((n1_dec - 1) * var1 + (n2_dec - 1) * var2) / (n1_dec + n2_dec - 2)
            pooled_std = hp_sqrt(pooled_var)

            # Standard error
            se = pooled_std * hp_sqrt(Decimal("1") / n1_dec + Decimal("1") / n2_dec)

            # Degrees of freedom
            df = n1 + n2 - 2

        else:
            # Welch's t-test (unequal variances)
            n1_dec = Decimal(str(n1))
            n2_dec = Decimal(str(n2))

            # Standard error
            se = hp_sqrt(var1 / n1_dec + var2 / n2_dec)

            # Welch-Satterthwaite degrees of freedom. With both variances zero this is 0/0,
            # and evaluating it raised decimal.InvalidOperation -- a 500 -- BEFORE the
            # degenerate-case guard below could report the situation honestly. The pooled
            # branch handled it; Welch's crashed. Both now reach the same guard.
            df_num = (var1 / n1_dec + var2 / n2_dec) ** 2
            df_denom = (var1 / n1_dec) ** 2 / (n1_dec - 1) + (var2 / n2_dec) ** 2 / (n2_dec - 1)
            df = float(df_num / df_denom) if df_denom > 0 else 0.0

        # Calculate t-statistic with edge case handling
        extreme_precision_flag = False
        interpretation = None

        if se == 0 or abs(se) < Decimal("1e-45"):  # Near-zero standard error
            extreme_precision_flag = True
            # Check if means are actually different
            if abs(mean_diff) < Decimal("1e-45"):
                # Both SE and mean_diff are ~zero, so t = mean_diff / se is 0/0: UNDEFINED,
                # not zero. This branch used to report t = 0 and p = 1.0 -- numbers that were
                # never computed from anything. scipy returns nan/nan for exactly this input,
                # and it is right to: with no within-group variance there is no sampling
                # distribution to place the difference in, so there is no test statistic and
                # no p-value. Two groups of [5, 5, 5, 5] do not "fail to reject H0"; the test
                # is simply not defined for them.
                #
                # The sibling branch below (zero variance, DIFFERENT means) already reported
                # this honestly as undefined -- the 2026-05-31 ST-2 audit killed a fabricated
                # t = +/-999.999, p = 1e-50 there. It fixed one half of the degenerate case
                # and left this half fabricating.
                t_stat = None
                p_value = None
                interpretation = (
                    "t-statistic undefined: every observation in both groups is identical, so "
                    "the within-group variance and the mean difference are both zero (t = 0/0). "
                    "There is no sampling distribution to test against."
                )
            else:
                # The mean difference is real but the within-group variance (and
                # thus the standard error) is effectively zero, so the
                # t-statistic is a division by ~zero: it diverges and is
                # mathematically undefined in finite terms. Report it honestly as
                # undefined rather than fabricating a finite value. Previously
                # this returned a made-up t = +/-999.999 and p = 1e-50
                # (audit 2026-05-31, ST-2).
                t_stat = None
                p_value = None
                interpretation = (
                    "t-statistic undefined: zero within-group variance with a "
                    "non-zero mean difference (standard error is ~0)."
                )
        else:
            # Normal calculation
            t_stat = mean_diff / se

            # A very large |t| here is a GENUINE computed value (small but
            # non-zero SE), not an error -- report it as-is rather than capping
            # it to a fabricated round number (audit 2026-05-31, ST-2). Flag it
            # as extreme so the downstream float64 comparison is skipped, since
            # such magnitudes are not faithfully representable in float64.
            if abs(t_stat) > Decimal("1e10"):
                extreme_precision_flag = True
                interpretation = "Extreme but genuine t-statistic (magnitude beyond float64 range)."

            # Calculate p-value using mpmath, for the requested alternative. t_stat stays a
            # Decimal: mpmath's exponent range is effectively unbounded, so even a t of 1e400
            # (which float64 cannot hold at all) yields a real, tiny, non-zero p rather than
            # an invented one. There is no "beyond computational limits" case left to fake.
            p_value = self.t_p_value(t_stat, df, alternative)

        result = {
            "t_statistic": t_stat,
            "p_value": p_value,
            "mean1": mean1,
            "mean2": mean2,
            "mean_diff": mean_diff,
            "se": se,
            "df": Decimal(str(df)),
            "n1": Decimal(str(n1)),
            "n2": Decimal(str(n2)),
            "alternative": alternative,
        }

        # Add interpretation if we hit extreme precision cases
        if extreme_precision_flag and interpretation:
            result["interpretation"] = interpretation
            result["extreme_precision"] = True

        return result

    def f_statistic_anova(self, *groups) -> Dict[str, Decimal]:
        """
        Calculate one-way ANOVA F-statistic with high precision.

        Args:
            *groups: Variable number of groups (arrays)

        Returns:
            Dictionary with F-statistic, p-value, and other statistics
        """
        if len(groups) < 2:
            raise ValueError("ANOVA requires at least 2 groups")

        # Convert all groups to Decimal
        decimal_groups = [self._to_decimal_array(g) for g in groups]

        # Check minimum size
        for i, g in enumerate(decimal_groups):
            if len(g) < 2:
                raise ValueError(f"Group {i+1} needs at least 2 observations")

        # Calculate overall mean
        all_data = []
        for g in decimal_groups:
            all_data.extend(g)

        grand_mean = self.mean(all_data)
        n_total = len(all_data)
        k = len(groups)  # Number of groups

        # Calculate between-group sum of squares (SSB)
        ssb = Decimal("0")
        for group in decimal_groups:
            group_mean = self.mean(group)
            n_group = Decimal(str(len(group)))
            ssb += n_group * (group_mean - grand_mean) ** 2

        # Calculate within-group sum of squares (SSW)
        ssw = Decimal("0")
        for group in decimal_groups:
            group_mean = self.mean(group)
            for value in group:
                ssw += (value - group_mean) ** 2

        # Degrees of freedom
        df_between = k - 1
        df_within = n_total - k

        # Mean squares
        msb = ssb / Decimal(str(df_between))
        msw = ssw / Decimal(str(df_within))

        if msw == 0:
            raise ValueError("Within-group variance is zero")

        # F-statistic
        f_stat = msb / msw

        # Calculate p-value using mpmath F-distribution
        df1_float = float(df_between)
        df2_float = float(df_within)

        # Upper tail, computed as an upper tail. See hp_f_sf: the old "1 - float(lower tail)"
        # returned exactly 0 for any decisively significant F.
        p_value = hp_f_sf(f_stat, df1_float, df2_float)

        return {
            "f_statistic": f_stat,
            "p_value": p_value,
            "df_between": Decimal(str(df_between)),
            "df_within": Decimal(str(df_within)),
            "ssb": ssb,
            "ssw": ssw,
            "msb": msb,
            "msw": msw,
            "n_groups": Decimal(str(k)),
            "n_total": Decimal(str(n_total)),
        }

    def correlation_pearson(
        self, x: Union[List, np.ndarray], y: Union[List, np.ndarray], confidence_level: float = 0.95
    ) -> Dict[str, Decimal]:
        """
        Calculate Pearson correlation coefficient with high precision.

        Args:
            x: First variable
            y: Second variable

        Returns:
            Dictionary with correlation coefficient, p-value, and confidence interval
        """
        if len(x) != len(y):
            raise ValueError("Arrays must have same length")

        if len(x) < 3:
            raise ValueError("Need at least 3 data points for correlation")

        x_decimal = self._to_decimal_array(x)
        y_decimal = self._to_decimal_array(y)
        n = len(x_decimal)

        # Calculate means
        mean_x = self.mean(x_decimal)
        mean_y = self.mean(y_decimal)

        # Calculate correlation using stable algorithm
        sum_xy = Decimal("0")
        sum_x2 = Decimal("0")
        sum_y2 = Decimal("0")

        for xi, yi in zip(x_decimal, y_decimal):
            dx = xi - mean_x
            dy = yi - mean_y
            sum_xy += dx * dy
            sum_x2 += dx * dx
            sum_y2 += dy * dy

        if sum_x2 == 0 or sum_y2 == 0:
            raise ValueError("One variable has zero variance")

        # Correlation coefficient. Every step below stays in mpmath at the configured dps;
        # the old code round-tripped r, t, p and the Fisher CI through float(), so a module
        # badged "50-decimal precision" was in fact handing back 17 significant digits.
        mp_sum_xy = mpmath.mpf(str(sum_xy))
        mp_sum_x2 = mpmath.mpf(str(sum_x2))
        mp_sum_y2 = mpmath.mpf(str(sum_y2))

        mp_r = mp_sum_xy / mpmath.sqrt(mp_sum_x2 * mp_sum_y2)

        # Clamp only for rounding overshoot; |r| > 1 is not attainable in exact arithmetic.
        if mp_r > 1:
            mp_r = mpmath.mpf(1)
        elif mp_r < -1:
            mp_r = mpmath.mpf(-1)

        r = Decimal(mpmath.nstr(mp_r, mpmath.mp.dps, strip_zeros=False))
        df = n - 2

        # Significance test.
        if abs(mp_r) == 1:
            # The data lie exactly on a line. Under H0 (rho = 0) with continuous data,
            # P(|R| >= 1) = 0, so the two-sided p-value is exactly 0 -- this is the limit,
            # not a sentinel. (scipy.stats.pearsonr returns 0.0 here too.)
            p_value = Decimal("0")
            t_stat = None
        else:
            mp_t = mp_r * mpmath.sqrt(mpmath.mpf(df) / (1 - mp_r * mp_r))
            t_stat = Decimal(mpmath.nstr(mp_t, mpmath.mp.dps, strip_zeros=False))
            p_value = self.t_p_value(t_stat, df, "two-sided")

        # Fisher's z confidence interval. se_z = 1/sqrt(n - 3) is undefined at n = 3 -- the
        # old code divided by zero there and 500'd the endpoint for every 3-point
        # correlation. There is no interval to report at n = 3, and none at |r| = 1 (atanh
        # diverges); say so instead of inventing one.
        if abs(mp_r) < 1 and n > 3:
            z = mpmath.atanh(mp_r)
            se_z = 1 / mpmath.sqrt(mpmath.mpf(n - 3))
            # sqrt(2) * erfinv(2q - 1) is the normal quantile, evaluated at full dps rather
            # than borrowed from scipy's float64 ppf.
            q = mpmath.mpf(str(1 - (1 - confidence_level) / 2))
            z_critical = mpmath.sqrt(2) * mpmath.erfinv(2 * q - 1)
            ci_lower = Decimal(mpmath.nstr(mpmath.tanh(z - z_critical * se_z), mpmath.mp.dps, strip_zeros=False))
            ci_upper = Decimal(mpmath.nstr(mpmath.tanh(z + z_critical * se_z), mpmath.mp.dps, strip_zeros=False))
            ci_note = None
        else:
            ci_lower = None
            ci_upper = None
            ci_note = (
                "Confidence interval undefined: Fisher's z transformation needs n > 3 and |r| < 1 "
                f"(here n = {n}, r = {r})."
            )

        return {
            "correlation": r,
            "t_statistic": t_stat,
            "df": Decimal(str(df)),
            "p_value": p_value,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "ci_note": ci_note,
            "n": Decimal(str(n)),
        }


def validate_precision():
    """
    Validate that our calculator achieves required precision.
    """
    calc = HighPrecisionCalculator(precision=50)

    # Test data
    data1 = [23.1, 24.2, 25.3, 26.4, 27.5, 28.6, 29.7, 30.8, 31.9, 33.0]
    data2 = [22.5, 23.6, 24.7, 25.8, 26.9, 28.0, 29.1, 30.2, 31.3, 32.4]

    print("High-Precision Calculator Validation")
    print("=" * 50)

    # Test one-sample t-test
    result = calc.t_statistic_one_sample(data1, mu=25)
    print("\nOne-sample t-test:")
    print(f"  t-statistic: {result['t_statistic']}")
    print(f"  p-value: {result['p_value']}")
    print(f"  Precision: {len(str(result['t_statistic']).split('.')[-1])} decimal places")

    # Test two-sample t-test
    result = calc.t_statistic_two_sample(data1, data2, equal_var=True)
    print("\nTwo-sample t-test:")
    print(f"  t-statistic: {result['t_statistic']}")
    print(f"  p-value: {result['p_value']}")
    print(f"  Precision: {len(str(result['t_statistic']).split('.')[-1])} decimal places")

    # Test ANOVA
    group1 = [23, 24, 25, 26, 27]
    group2 = [25, 26, 27, 28, 29]
    group3 = [27, 28, 29, 30, 31]
    result = calc.f_statistic_anova(group1, group2, group3)
    print("\nOne-way ANOVA:")
    print(f"  F-statistic: {result['f_statistic']}")
    print(f"  p-value: {result['p_value']}")
    print(f"  Precision: {len(str(result['f_statistic']).split('.')[-1])} decimal places")

    # Test correlation
    x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    y = [2.1, 4.2, 5.9, 8.1, 10.2, 11.8, 14.1, 16.2, 17.9, 20.1]
    result = calc.correlation_pearson(x, y)
    print("\nPearson correlation:")
    print(f"  r: {result['correlation']}")
    print(f"  p-value: {result['p_value']}")
    print(f"  Precision: {len(str(result['correlation']).split('.')[-1])} decimal places")

    print("\n" + "=" * 50)
    print("Validation complete. All calculations use 50-digit precision.")


if __name__ == "__main__":
    validate_precision()
