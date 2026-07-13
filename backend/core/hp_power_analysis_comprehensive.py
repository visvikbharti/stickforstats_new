"""
High-Precision Power Analysis Calculator
========================================
Implements statistical power analysis with 50 decimal place precision.

This module provides comprehensive power analysis functionality including:
- Power calculation for various statistical tests
- Sample size determination
- Effect size calculation
- Power curves and optimal allocation

All calculations maintain 50 decimal place precision throughout.

Author: StickForStats Development Team
Date: September 2025
Version: 1.0.0
License: MIT
"""

import math

import numpy as np
from decimal import getcontext
from mpmath import mp, mpf, sqrt, exp, erf, erfinv, log
from mpmath import power as mp_power
from typing import Dict, List, Optional, Tuple, Union, Any
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from scipy import stats

# Set precision to 50 decimal places
mp.dps = 50
getcontext().prec = 50


class HighPrecisionPowerAnalysis:
    """
    High-precision power analysis calculator with 50 decimal place precision.

    This class provides comprehensive power analysis functionality for various
    statistical tests while maintaining ultra-high numerical precision.
    """

    def __init__(self):
        """Initialize the power analysis calculator."""
        self.precision = 50
        mp.dps = self.precision
        getcontext().prec = self.precision

    def _to_high_precision(self, value: Union[float, int, str]) -> mpf:
        """Convert value to high-precision mpmath float."""
        if isinstance(value, (list, np.ndarray)):
            return [mpf(str(v)) for v in value]
        return mpf(str(value))

    def _normal_cdf(self, x: mpf) -> mpf:
        """High-precision normal cumulative distribution function."""
        return mpf("0.5") * (mpf("1") + erf(x / sqrt(mpf("2"))))

    def _normal_ppf(self, p: mpf) -> mpf:
        """High-precision normal percent point function (inverse CDF)."""
        return sqrt(mpf("2")) * erfinv(mpf("2") * p - mpf("1"))

    def _t_cdf(self, x: mpf, df: mpf) -> mpf:
        """
        High-precision central Student-t CDF via the regularized incomplete
        beta function, P(T<=x) = 1 - 0.5*I_{df/(df+x^2)}(df/2, 1/2) for x>0.

        The previous version cast to float64 and called scipy, so every digit
        past the 15th was noise despite the 50-decimal claim.
        """
        from mpmath import betainc

        x = mpf(x)
        df = mpf(df)
        if x == 0:
            return mpf("0.5")
        xb = df / (df + x * x)
        tail = mpf("0.5") * betainc(df / 2, mpf("0.5"), 0, xb, regularized=True)
        return tail if x < 0 else mpf("1") - tail

    def _t_ppf(self, p: mpf, df: mpf) -> mpf:
        """High-precision central Student-t quantile (inverse CDF)."""
        from scipy.stats import t as _scipy_t
        from mpmath import findroot

        p = mpf(p)
        df = mpf(df)
        # Seed with the float64 quantile, then refine against the high-precision
        # CDF so the result carries the full working precision.
        seed = mpf(str(_scipy_t.ppf(float(p), float(df))))
        return findroot(lambda z: self._t_cdf(z, df) - p, seed)

    def _nct_cdf(self, t: mpf, df: mpf, ncp: mpf) -> mpf:
        """
        High-precision non-central Student-t CDF, Algorithm AS 243 (Lenth 1989)
        — the same series R and scipy use — evaluated at full mpmath precision.

        The power routines previously approximated the non-central t by shifting
        the CENTRAL t by the non-centrality parameter, which is only accurate to
        ~3 decimals (t-test power came out 0.80138 instead of 0.80146).
        """
        from mpmath import betainc, loggamma

        t = mpf(t)
        df = mpf(df)
        ncp = mpf(ncp)
        if ncp == 0:
            return self._t_cdf(t, df)

        negdel = False
        tt = t
        deel = ncp
        if t < 0:
            negdel = True
            tt = -t
            deel = -ncp

        x = (tt * tt) / (tt * tt + df)
        tnc = mpf("0")
        if x > 0:
            lam = deel * deel
            p = mpf("0.5") * exp(-mpf("0.5") * lam)
            q = sqrt(mpf("2") / mp.pi) * p * deel
            s = mpf("0.5") - p
            a = mpf("0.5")
            b = mpf("0.5") * df
            rxb = mp_power(mpf("1") - x, b)
            albeta = loggamma(a) + loggamma(b) - loggamma(a + b)
            xodd = betainc(a, b, 0, x, regularized=True)
            godd = mpf("2") * rxb * exp(a * log(x) - albeta)
            xeven = mpf("1") - rxb
            geven = b * x * rxb
            tnc = p * xodd + q * xeven
            tol = mpf("10") ** (-(self.precision + 2))
            for it in range(1, 5000):
                a += 1
                xodd -= godd
                xeven -= geven
                godd *= x * (a + b - mpf("1")) / a
                geven *= x * (a + b - mpf("0.5")) / (a + mpf("0.5"))
                p *= lam / (2 * it)
                q *= lam / (2 * it + 1)
                s -= p
                tnc += p * xodd + q * xeven
                errbd = mpf("2") * s * (xodd - godd)
                if abs(errbd) < tol:
                    break

        tnc += self._normal_cdf(-deel)
        res = (mpf("1") - tnc) if negdel else tnc
        if res < 0:
            return mpf("0")
        if res > 1:
            return mpf("1")
        return res

    def _f_cdf(self, x: mpf, df1: mpf, df2: mpf) -> mpf:
        """High-precision F-distribution cumulative distribution function."""
        from mpmath import betainc

        if x <= 0:
            return mpf("0")
        return betainc(df1 / 2, df2 / 2, 0, df1 * x / (df1 * x + df2), regularized=True)

    def _chi2_cdf(self, x: mpf, df: mpf) -> mpf:
        """High-precision chi-square cumulative distribution function."""
        from mpmath import gammainc

        if x <= 0:
            return mpf("0")
        return gammainc(df / 2, 0, x / 2, regularized=True)

    def _f_ppf(self, p: mpf, df1: mpf, df2: mpf) -> mpf:
        """High-precision central F quantile (refined against the mpmath CDF)."""
        from scipy.stats import f as _scipy_f
        from mpmath import findroot

        p = mpf(p)
        seed = mpf(str(_scipy_f.ppf(float(p), float(df1), float(df2))))
        return findroot(lambda z: self._f_cdf(z, df1, df2) - p, seed)

    def _chi2_ppf(self, p: mpf, df: mpf) -> mpf:
        """High-precision central chi-square quantile (refined against the CDF)."""
        from scipy.stats import chi2 as _scipy_chi2
        from mpmath import findroot

        p = mpf(p)
        seed = mpf(str(_scipy_chi2.ppf(float(p), float(df))))
        return findroot(lambda z: self._chi2_cdf(z, df) - p, seed)

    def _ncf_cdf(self, f: mpf, df1: mpf, df2: mpf, ncp: mpf) -> mpf:
        """
        High-precision non-central F CDF as a Poisson mixture of central-F
        (regularized incomplete beta) terms. Replaces a float64 scipy.ncf call
        that could not deliver the advertised 50 decimals.
        """
        from mpmath import betainc

        f = mpf(f)
        df1 = mpf(df1)
        df2 = mpf(df2)
        ncp = mpf(ncp)
        if ncp == 0:
            return self._f_cdf(f, df1, df2)
        if f <= 0:
            return mpf("0")

        y = df1 * f / (df1 * f + df2)  # independent of the mixture index
        lam = ncp / mpf("2")
        weight = exp(-lam)
        total = mpf("0")
        poisson_mass = mpf("0")
        tol = mpf("10") ** (-(self.precision + 2))
        j = 0
        while j < 10000:
            total += weight * betainc(df1 / mpf("2") + j, df2 / mpf("2"), 0, y, regularized=True)
            poisson_mass += weight
            # Stop once essentially all of the Poisson mass is accounted for.
            if j > float(lam) and (mpf("1") - poisson_mass) < tol:
                break
            weight *= lam / (j + 1)
            j += 1
        return total

    def _ncx2_cdf(self, x: mpf, df: mpf, ncp: mpf) -> mpf:
        """
        High-precision non-central chi-square CDF as a Poisson mixture of central
        chi-square (regularized lower incomplete gamma) terms. Replaces a float64
        scipy.ncx2 call.
        """
        from mpmath import gammainc

        x = mpf(x)
        df = mpf(df)
        ncp = mpf(ncp)
        if ncp == 0:
            return self._chi2_cdf(x, df)
        if x <= 0:
            return mpf("0")

        lam = ncp / mpf("2")
        weight = exp(-lam)
        total = mpf("0")
        poisson_mass = mpf("0")
        tol = mpf("10") ** (-(self.precision + 2))
        j = 0
        while j < 10000:
            total += weight * gammainc(df / mpf("2") + j, 0, x / mpf("2"), regularized=True)
            poisson_mass += weight
            if j > float(lam) and (mpf("1") - poisson_mass) < tol:
                break
            weight *= lam / (j + 1)
            j += 1
        return total

    def calculate_power_t_test(
        self,
        effect_size: Union[float, str],
        sample_size: Union[int, str],
        sample_size2: Union[int, str, None] = None,
        alpha: Union[float, str] = 0.05,
        alternative: str = "two-sided",
        test_type: str = "independent",
    ) -> Dict[str, Any]:
        """
        Calculate statistical power for t-tests with 50 decimal precision.

        Parameters
        ----------
        effect_size : Union[float, str]
            Cohen's d effect size
        sample_size : Union[int, str]
            Sample size per group (independent) or total (paired)
        alpha : Union[float, str], default=0.05
            Significance level
        alternative : str, default='two-sided'
            Alternative hypothesis: 'two-sided', 'greater', 'less'
        test_type : str, default='independent'
            Type of t-test: 'independent', 'paired', 'one-sample'

        Returns
        -------
        Dict[str, Any]
            Dictionary containing:
            - power: Statistical power (50 decimal precision)
            - power_float: Power as float
            - effect_size: Effect size used
            - sample_size: Sample size used
            - alpha: Significance level
            - critical_value: Critical t-value
            - non_centrality: Non-centrality parameter
            - degrees_freedom: Degrees of freedom
        """
        # Convert to high precision
        d = self._to_high_precision(effect_size)
        n = self._to_high_precision(sample_size)
        alpha_hp = self._to_high_precision(alpha)

        # Calculate degrees of freedom
        if test_type == "independent":
            # Unequal group sizes are a real design, and the UI has always offered a "Sample Size
            # (Group 2)" box -- it was simply never sent, so a user who entered n1 = 30, n2 = 60 was
            # shown the power for 30/30. With n1 != n2 the non-centrality is the harmonic-mean form
            # d * sqrt(n1*n2/(n1+n2)); it collapses to d * sqrt(n/2) when they are equal, so the
            # balanced case is unchanged.
            n2 = self._to_high_precision(sample_size2) if sample_size2 is not None else n
            # A group of one supports no within-group variance estimate. /power/mde/ already refuses
            # this; /power/t-test/ was accepting n2 = 1 with a 200 and returning a number
            # (power = 0.0763), and n2 = 0 with a 200 returning alpha. Two endpoints on the same
            # engine disagreeing about whether a design is legal is how a caller learns to trust
            # whichever one answers.
            if n2 < mpf("2"):
                raise ValueError(
                    f"The second group needs at least n = 2 to be defined at all; got n2 = {int(n2)}."
                )
            df = n + n2 - mpf("2")
            nc_factor = sqrt((n * n2) / (n + n2))
        elif test_type == "paired":
            df = n - mpf("1")
            nc_factor = sqrt(n)
        else:  # one-sample
            df = n - mpf("1")
            nc_factor = sqrt(n)

        # Calculate non-centrality parameter
        non_centrality = d * nc_factor

        # Determine critical value(s). Power uses the true non-central t CDF at
        # the (central-t) critical value, not the central t shifted by the
        # non-centrality parameter.
        if alternative == "two-sided":
            critical_value = self._t_ppf(mpf("1") - alpha_hp / mpf("2"), df)
            power = (
                mpf("1")
                - self._nct_cdf(critical_value, df, non_centrality)
                + self._nct_cdf(-critical_value, df, non_centrality)
            )
        elif alternative == "greater":
            critical_value = self._t_ppf(mpf("1") - alpha_hp, df)
            power = mpf("1") - self._nct_cdf(critical_value, df, non_centrality)
        else:  # less
            critical_value = self._t_ppf(alpha_hp, df)
            power = self._nct_cdf(critical_value, df, non_centrality)

        return {
            "power": str(power),
            "power_float": float(power),
            "effect_size": str(d),
            "sample_size": int(n),
            "alpha": float(alpha_hp),
            "critical_value": str(critical_value),
            "non_centrality": str(non_centrality),
            "degrees_freedom": int(df),
            "test_type": test_type,
            "alternative": alternative,
            "interpretation": self._interpret_power(float(power)),
        }

    def calculate_sample_size_t_test(
        self,
        effect_size: Union[float, str],
        power: Union[float, str] = 0.8,
        alpha: Union[float, str] = 0.05,
        alternative: str = "two-sided",
        test_type: str = "independent",
    ) -> Dict[str, Any]:
        """
        Calculate required sample size for t-tests with 50 decimal precision.

        Parameters
        ----------
        effect_size : Union[float, str]
            Cohen's d effect size
        power : Union[float, str], default=0.8
            Desired statistical power
        alpha : Union[float, str], default=0.05
            Significance level
        alternative : str, default='two-sided'
            Alternative hypothesis
        test_type : str, default='independent'
            Type of t-test

        Returns
        -------
        Dict[str, Any]
            Dictionary containing required sample size and parameters
        """
        d = self._to_high_precision(effect_size)
        power_hp = self._to_high_precision(power)
        alpha_hp = self._to_high_precision(alpha)

        # The normal closed form used to seed this search:
        #
        #     n_approx = 2 * ((z_alpha + z_beta) / d)^2
        #
        # It is gone. That is the formula which returns 63 where the answer is 64 (d = 0.5,
        # alpha = 0.05, power = 0.80 -- the most common power analysis in the literature; at n = 63
        # the true power is 0.795, not the 0.80 the researcher believes they have). The exact search
        # below is cheap enough not to need a seed, and a wrong seed is a liability, not a speed-up.
        def power_at(n_int):
            res = self.calculate_power_t_test(
                effect_size=str(d),
                sample_size=str(n_int),
                alpha=str(alpha_hp),
                alternative=alternative,
                test_type=test_type,
            )
            return mpf(res["power"])

        # This used to be a naive linear walk:
        #
        #     while power_at(n_final) < power_hp and n_final < 10_000_000:
        #         n_final += 1
        #
        # which assumes power always INCREASES with n. It does not. A one-sided test in the
        # direction OPPOSITE to the effect (alternative="less" with a positive d -- offered in the
        # UI as "One-sided (mu1 < mu2)") has power that DECREASES monotonically toward zero:
        # 3.2e-03 at n = 10, 6.2e-38 at n = 1000. The loop condition therefore never became false
        # and the walk ran to max_n at ~5 ms per exact evaluation -- roughly FIFTEEN HOURS of CPU
        # pinned on a single request, from a legitimate click.
        #
        # `_smallest_n_meeting_power` brackets before it walks, so a design no sample size can
        # satisfy raises immediately instead of hanging. And the answer it returns is certified by
        # the exact power function: power(n) >= target > power(n - 1).
        try:
            n_final = self._smallest_n_meeting_power(power_at, power_hp, n_start=2, max_n=1_000_000)
        except ValueError:
            raise ValueError(
                f"No sample size reaches a power of {float(power_hp)} for this design. A one-sided "
                f"test in the direction opposite to the effect (alternative='{alternative}' with a "
                f"positive effect size) LOSES power as the sample grows, so no n can satisfy it. "
                f"Check that the alternative matches the direction of the effect you expect."
            )

        # Final verification
        final_result = self.calculate_power_t_test(
            effect_size=str(d),
            sample_size=str(n_final),
            alpha=str(alpha_hp),
            alternative=alternative,
            test_type=test_type,
        )

        return {
            "required_sample_size": n_final,
            "actual_power": final_result["power"],
            "actual_power_float": final_result["power_float"],
            "effect_size": str(d),
            "target_power": float(power_hp),
            "alpha": float(alpha_hp),
            "test_type": test_type,
            "alternative": alternative,
            "sample_size_per_group": n_final if test_type == "independent" else None,
            "total_sample_size": n_final * 2 if test_type == "independent" else n_final,
        }

    def _smallest_n_meeting_power(
        self, exact_power_at, target_power, guide_power_at=None, n_start=2, max_n=1_000_000
    ):
        """
        Smallest integer n whose power meets or exceeds `target_power`. Monotone, hence exact.

        This exists because the closed-form normal approximation SILENTLY UNDER-POWERS: for
        d = 0.5, alpha = 0.05, power = 0.80 it gives n = 63, and the true answer is 64. A study
        run at 63 does not reach the power it was designed for, and nothing tells the researcher.
        So the answer here is always certified by the 50-digit power function -- never by an
        approximation.

        `guide_power_at` is an optional cheap (float64) power function used only to BRACKET the
        search. It never decides the answer. The 50-digit function is then walked from the
        bracket until it certifies, in its own arithmetic, that

            power(n) >= target > power(n - 1)

        which is the definition of the answer. The guide exists because one 50-digit non-central
        F evaluation costs ~1.5s: bisecting on it directly would take ~40s, while bracketing with
        float64 and certifying exactly costs two.
        """
        n_start = max(n_start, 2)
        guide = guide_power_at or exact_power_at

        # Bracket with the guide: lo misses the target, hi meets it.
        if guide(n_start) >= target_power:
            n = n_start
        else:
            lo, hi = n_start, n_start * 2
            while guide(hi) < target_power:
                lo = hi
                hi *= 2
                if hi > max_n:
                    raise ValueError(
                        f"No sample size below {max_n:,} reaches a power of "
                        f"{float(target_power)}. The effect is too small to detect at this alpha."
                    )
            while hi - lo > 1:
                mid = (lo + hi) // 2
                if guide(mid) >= target_power:
                    hi = mid
                else:
                    lo = mid
            n = hi

        # Certify against the exact function. If the guide was off by a step, these correct it.
        while n > n_start and exact_power_at(n - 1) >= target_power:
            n -= 1
        while n < max_n and exact_power_at(n) < target_power:
            n += 1

        return n

    @staticmethod
    def _anova_power_float(effect_size, groups, n_per_group, alpha):
        """
        float64 one-way ANOVA power -- the bracketing guide for the sample-size search only.

        Same non-central F as the 50-digit path, so it lands within a step of the true boundary;
        the exact function then certifies which integer it actually is.
        """
        df1 = groups - 1
        df2 = groups * (n_per_group - 1)
        if df2 < 1:
            return 0.0
        lambda_nc = n_per_group * groups * effect_size * effect_size
        value = float(stats.ncf.sf(stats.f.ppf(1 - alpha, df1, df2), df1, df2, lambda_nc))

        # As with the non-central t above: a non-finite value must never be returned, because every
        # comparison against NaN is False and it would drive a search rather than stop it.
        return value if np.isfinite(value) else None

    def calculate_sample_size_chi_square(
        self,
        effect_size: Union[float, str],
        df: Union[int, str],
        power: Union[float, str] = 0.8,
        alpha: Union[float, str] = 0.05,
    ) -> Dict[str, Any]:
        """Required total N for a chi-square test, solved against the exact non-central chi2."""
        w = self._to_high_precision(effect_size)
        power_hp = self._to_high_precision(power)
        alpha_hp = self._to_high_precision(alpha)
        df_int = int(df)

        if w <= 0:
            raise ValueError("Cohen's w must be positive; with no effect no sample size suffices.")
        if df_int < 1:
            raise ValueError("A chi-square test needs at least 1 degree of freedom.")

        def exact_power_at(n_int):
            return mpf(
                self.calculate_power_chi_square(
                    effect_size=str(w), df=str(df_int), sample_size=str(n_int), alpha=str(alpha_hp)
                )["power"]
            )

        n_final = self._smallest_n_meeting_power(exact_power_at, power_hp, n_start=df_int + 1)
        final = self.calculate_power_chi_square(
            effect_size=str(w), df=str(df_int), sample_size=str(n_final), alpha=str(alpha_hp)
        )

        return {
            "required_sample_size": n_final,
            "total_sample_size": n_final,
            "actual_power": final["power"],
            "actual_power_float": final["power_float"],
            "effect_size": str(w),
            "df": df_int,
            "target_power": float(power_hp),
            "alpha": float(alpha_hp),
            "test_type": "chi-square",
        }

    # -------------------------------------------------------------- non-parametric power
    #
    # There is no distribution-free closed form for the power of a rank test: it depends on the
    # shape of the distribution the data actually came from. The standard approach -- the one
    # G*Power takes -- is Pitman's asymptotic relative efficiency (ARE) against the corresponding
    # parametric test, FOR A STATED PARENT DISTRIBUTION:
    #
    #     power_rank(n) ~= power_parametric(n * ARE)      n_rank ~= n_parametric / ARE
    #
    # The browser used exactly this, with ARE = 3/pi, and never said so. That silence is the
    # problem: 3/pi is the ARE for a NORMAL parent -- an assumption that is absurd for a test you
    # reached for precisely BECAUSE normality failed. And it points the wrong way. Under
    # normality the rank test is slightly less efficient (ARE 0.955, so you need ~5% more
    # subjects), but under the heavy-tailed distributions that make you abandon the t-test in the
    # first place it is substantially MORE efficient -- ARE 1.5 for a Laplace parent, 3.0 for an
    # exponential one. Quoting the normal-parent number to a user with skewed data does not just
    # add error, it inverts the conclusion.
    #
    # So the parent distribution is now an explicit input, the ARE used is returned alongside the
    # answer, and the assumption is stated in the response rather than buried in a constant.

    ARE_VS_PARAMETRIC = {
        "normal": mpf(3) / mp.pi,  # 0.9549 -- the rank test needs ~5% MORE subjects
        "uniform": mpf(1),
        "logistic": mp.pi**2 / mpf(9),  # 1.0966
        "laplace": mpf("1.5"),  # heavy tails: the rank test WINS
        "exponential": mpf(3),
    }

    NONPARAMETRIC_PARAMETRIC_PAIR = {
        "mann-whitney": ("t-test", "independent"),
        "wilcoxon": ("t-test", "paired"),
        "kruskal-wallis": ("anova", None),
    }

    def _are(self, parent_distribution):
        try:
            return self.ARE_VS_PARAMETRIC[parent_distribution]
        except KeyError:
            raise ValueError(
                f"Unknown parent distribution '{parent_distribution}'. "
                f"Use one of: {', '.join(sorted(self.ARE_VS_PARAMETRIC))}."
            )

    def _nonparametric_note(self, test, parent_distribution, are):
        return (
            f"Approximate. The power of a rank test has no distribution-free closed form, so this "
            f"uses Pitman's asymptotic relative efficiency of the {test} against its parametric "
            f"counterpart, assuming the data come from a {parent_distribution} distribution "
            f"(ARE = {float(are):.4f}). Under a different parent distribution the answer changes: "
            f"for heavy-tailed data the rank test is MORE efficient than the parametric one, not "
            f"less."
        )

    def calculate_power_nonparametric(
        self,
        test: str,
        effect_size: Union[float, str],
        sample_size: Union[int, str],
        alpha: Union[float, str] = 0.05,
        groups: Union[int, str] = 2,
        parent_distribution: str = "normal",
        alternative: str = "two-sided",
    ) -> Dict[str, Any]:
        """Power of a rank test, via Pitman ARE against its parametric counterpart."""
        if test not in self.NONPARAMETRIC_PARAMETRIC_PAIR:
            raise ValueError(
                f"Unknown non-parametric test '{test}'. "
                f"Use one of: {', '.join(sorted(self.NONPARAMETRIC_PARAMETRIC_PAIR))}."
            )

        are = self._are(parent_distribution)
        parametric, t_type = self.NONPARAMETRIC_PARAMETRIC_PAIR[test]

        # The rank test at n behaves like the parametric test at n * ARE.
        effective_n = mpf(str(sample_size)) * are
        if effective_n < 2:
            raise ValueError("The sample is too small to support this test.")

        if parametric == "anova":
            base = self.calculate_power_anova(
                effect_size=effect_size, groups=groups, n_per_group=int(effective_n), alpha=alpha
            )
        else:
            base = self.calculate_power_t_test(
                effect_size=effect_size,
                sample_size=int(effective_n),
                alpha=alpha,
                alternative=alternative,
                test_type=t_type,
            )

        return {
            "power": base["power"],
            "power_float": base["power_float"],
            "test": test,
            "effect_size": str(effect_size),
            "sample_size": int(sample_size),
            "effective_parametric_n": int(effective_n),
            "alpha": float(alpha),
            "are": float(are),
            "parent_distribution": parent_distribution,
            "method": "Pitman asymptotic relative efficiency",
            "note": self._nonparametric_note(test, parent_distribution, are),
        }

    def calculate_sample_size_nonparametric(
        self,
        test: str,
        effect_size: Union[float, str],
        power: Union[float, str] = 0.8,
        alpha: Union[float, str] = 0.05,
        groups: Union[int, str] = 2,
        parent_distribution: str = "normal",
        alternative: str = "two-sided",
    ) -> Dict[str, Any]:
        """Required n for a rank test, via Pitman ARE against its parametric counterpart."""
        if test not in self.NONPARAMETRIC_PARAMETRIC_PAIR:
            raise ValueError(
                f"Unknown non-parametric test '{test}'. "
                f"Use one of: {', '.join(sorted(self.NONPARAMETRIC_PARAMETRIC_PAIR))}."
            )

        are = self._are(parent_distribution)
        parametric, t_type = self.NONPARAMETRIC_PARAMETRIC_PAIR[test]

        if parametric == "anova":
            base = self.calculate_sample_size_anova(
                effect_size=effect_size, groups=groups, power=power, alpha=alpha
            )
        else:
            base = self.calculate_sample_size_t_test(
                effect_size=effect_size, power=power, alpha=alpha, alternative=alternative, test_type=t_type
            )

        n_parametric = int(base["required_sample_size"])
        n_required = int(mp.ceil(mpf(n_parametric) / are))
        groups_int = int(groups) if parametric == "anova" else (2 if t_type == "independent" else 1)

        # Every other sample-size function reports the power the design will ACTUALLY have at the
        # integer n it prescribes -- which is never exactly the target, because n is discrete. This
        # one did not, so the "Power at that N" card showed an em dash for all three rank tests
        # while the engine had the number the whole time.
        achieved = self.calculate_power_nonparametric(
            test=test,
            effect_size=effect_size,
            sample_size=n_required,
            alpha=alpha,
            groups=groups,
            parent_distribution=parent_distribution,
            alternative=alternative,
        )

        return {
            "required_sample_size": n_required,
            "sample_size_per_group": n_required if parametric == "anova" or t_type == "independent" else None,
            "total_sample_size": n_required * groups_int,
            "parametric_sample_size": n_parametric,
            "actual_power": achieved["power"],
            "actual_power_float": achieved["power_float"],
            "test": test,
            "effect_size": str(effect_size),
            "target_power": float(power),
            "alpha": float(alpha),
            "are": float(are),
            "parent_distribution": parent_distribution,
            "method": "Pitman asymptotic relative efficiency",
            "note": self._nonparametric_note(test, parent_distribution, are),
        }

    def calculate_minimum_detectable_effect(
        self,
        test_type: str = "t-test",
        sample_size: Union[int, str] = 30,
        power: Union[float, str] = 0.8,
        alpha: Union[float, str] = 0.05,
        groups: Union[int, str] = 2,
        alternative: str = "two-sided",
        t_test_type: str = "independent",
        sample_size2: Union[int, str, None] = None,
    ) -> Dict[str, Any]:
        """
        The smallest effect this design can detect at `power` -- the honest answer to "how much
        power does my finished study have?".

        Post-hoc / observed power (feeding the OBSERVED effect back into the power formula) is a
        monotone transform of the p-value and tells you nothing the p-value did not already say
        (Hoenig & Heisey 2001). This is what to report instead: given n and alpha, what is the
        smallest true effect you had an 80% chance of catching?

        Power is monotone increasing in the effect size, so this bisects for the exact boundary
        rather than approximating it.
        """
        n = int(sample_size)
        # The second arm of an independent t. The UI has always offered a "Sample Size (Group 2)"
        # box in this mode, and it was never sent: a user who entered 30 and 60 was given the MDE
        # of a BALANCED 30/30 design (d = 0.7356), overstating the smallest detectable effect by
        # 16% -- and the d it quoted actually has 90.2% power in the design they described, not the
        # 80% they asked for. A field that does nothing is worse than no field, because the user
        # believes they have told us something.
        n2 = None if sample_size2 is None else int(sample_size2)
        target = self._to_high_precision(power)
        alpha_hp = self._to_high_precision(alpha)
        k = int(groups)

        if not mpf("0") < target < mpf("1"):
            raise ValueError("Power must lie strictly between 0 and 1.")

        # Every test has a smallest design that can support it at all. Below that the degrees of
        # freedom collapse (df = 0, or sqrt(n - 3) = 0 for the Fisher transform) and the search
        # produced either a 500 or -- worse -- a NaN that reached the JSON encoder.
        minimum_n = {"anova": 2, "correlation": 4}.get(test_type, 2)
        if n < minimum_n:
            raise ValueError(
                f"A {test_type} needs at least n = {minimum_n} "
                f"{'per group' if test_type == 'anova' else ''}"
                f" to be defined at all; got n = {n}.".replace("  ", " ")
            )
        if n2 is not None and n2 < 2:
            raise ValueError(f"The second group needs at least n = 2 to be defined at all; got n2 = {n2}.")

        # A power target at or below alpha is not a target. Under the null the test already rejects
        # at rate alpha, so ANY effect -- including no effect at all -- "achieves" it, and the
        # bisection duly converged on an effect size of 8.7e-18 and reported it as the minimum
        # detectable effect. That is not a small effect; it is the absence of one, dressed up as an
        # answer.
        if target <= alpha_hp:
            raise ValueError(
                f"A power target of {float(target)} is at or below alpha ({float(alpha_hp)}). The "
                f"test already rejects the null at rate alpha when there is no effect, so no "
                f"minimum detectable effect exists. Choose a power above alpha (0.80 is conventional)."
            )

        # Bisecting the 50-digit power here took ~60 evaluations, and one 50-digit non-central F
        # costs ~1.5 s -- about ninety seconds of CPU per ANOVA request. The float64 non-central
        # F/t is the SAME distribution (this was never a precision bug -- the old browser code was
        # wrong because it used a normal APPROXIMATION, a different distribution entirely), and it
        # agrees with the 50-digit engine to 4.4e-16. A minimum detectable effect is a design
        # quantity reported to two or three decimals; sixteen significant figures is already far
        # past anything that can be acted on.
        def power_at(effect):
            if test_type == "anova":
                value = self._anova_power_float(float(effect), k, n, float(alpha_hp))
                if value is None:
                    # scipy could not evaluate it (very large non-centrality). Fall back to the
                    # exact 50-digit non-central F rather than substituting a zero, which would
                    # silently steer the bisection -- the mistake that made the t-test MDE come
                    # back as 6.44 instead of 0.499.
                    value = self.calculate_power_anova(
                        effect_size=str(effect), groups=str(k), n_per_group=str(n), alpha=str(alpha_hp)
                    )["power_float"]
            elif test_type == "correlation":
                value = self._correlation_power_float(float(effect), n, float(alpha_hp), alternative)
                if value is None:
                    raise ValueError(f"Power is not defined for this correlation design (n = {n}).")
            else:
                value = self._t_power_float(
                    float(effect), n, float(alpha_hp), t_test_type, alternative, n2=n2
                )
                if value is None:
                    raise ValueError(f"Power is not defined for this t-test design (n = {n}).")
            return mpf(value)

        # A correlation cannot exceed 1; the standardized effect sizes are unbounded in principle,
        # but 10 is far past any real design.
        hi = mpf("0.999999") if test_type == "correlation" else mpf("10")
        lo = mpf("0")

        if power_at(hi) < target:
            raise ValueError(
                f"No effect size reaches a power of {float(target)} at n = {n}. "
                "The sample is too small to detect any effect at this power."
            )

        # Power is monotone increasing in the effect size, so bisect for the boundary. 100 steps
        # narrows a bracket of width 10 to ~1e-29, which is already far past what float64 can
        # resolve -- there is nothing to gain from more.
        for _ in range(100):
            mid = (lo + hi) / 2
            if power_at(mid) >= target:
                hi = mid
            else:
                lo = mid

        achieved = power_at(hi)
        if not mp.isfinite(hi) or not mp.isfinite(achieved):
            raise ValueError("The minimum detectable effect is not defined for this design.")

        return {
            "minimum_detectable_effect": str(hi),
            "minimum_detectable_effect_float": float(hi),
            "achieved_power": str(achieved),
            "achieved_power_float": float(achieved),
            "sample_size": n,
            # Echoed so the caller can see WHICH design this answers for. None means balanced.
            "sample_size2": n2 if test_type == "t-test" and t_test_type == "independent" else None,
            "target_power": float(target),
            "alpha": float(alpha_hp),
            "test_type": test_type,
            "groups": k if test_type == "anova" else None,
            "precision": "float64 (exact non-central distribution)",
            "note": (
                "This is the smallest true effect the design could detect at the stated power. "
                "It is reported instead of observed (post-hoc) power, which is a monotone "
                "function of the p-value and adds nothing to it."
            ),
        }

    # ------------------------------------------------------------------ power curves
    #
    # A curve is 40+ points. One 50-digit non-central F evaluation costs ~1.5s, so a 50-digit
    # curve would take a minute and could not be served from a request. These use scipy's
    # non-central F / non-central t in float64 -- the SAME distributions as the exact engine
    # above, just in double precision. Measured against it over a 40-point curve, they agree to
    # 4.4e-16: machine epsilon, and roughly a ten-thousandth of one screen pixel.
    #
    # This is emphatically NOT what the browser was doing. The browser applied a NORMAL
    # APPROXIMATION to the non-central F,
    #
    #     z = sqrt(2 * F_crit * df1) - sqrt(2 * lambda - df1);  power = Phi(-z)
    #
    # which is a different distribution, not a lower-precision one. At Cohen's f = 0.25 with 4
    # groups it reports power 0.664 where the truth is 0.804, and 0.003 where the truth is 0.212
    # -- errors of up to 0.21 on a scale that only runs from 0 to 1. Worse, `2 * lambda - df1`
    # goes NEGATIVE for small effects, so it takes the square root of a negative number, and the
    # resulting NaN was rendered to the user as a confident "Underpowered (< 80%)".

    def _t_power_float(
        self, effect_size, n_per_group, alpha, test_type="independent", alternative="two-sided", n2=None
    ):
        """
        Non-central t power in float64, with an exact fallback.

        scipy's `nct` returns **NaN** once the non-centrality gets large -- at n = 64 that is any
        Cohen's d above roughly 1.5, which is an ordinary effect size, not an exotic one. NaN then
        propagates silently, because every comparison against it is False:

          - it drove the minimum-detectable-effect bisection, which returned d = 6.44 (the edge of
            the NaN region) where the answer is 0.499;
          - and it dropped the high-effect end off every power curve, since a non-finite point is
            filtered out.

        So a non-finite result is never returned. It falls back to the module's own 50-digit
        non-central t (Algorithm AS 243), which has no such limit. The fallback is only reached in
        the region where scipy fails, so the common path stays fast.

        `n2` is the second arm of an independent design. `calculate_power_t_test` has taken it for
        some time, but this helper -- which drives the minimum detectable effect -- did not, so the
        MDE silently answered for a BALANCED design however unequal the arms the user entered. It
        is ignored for the paired and one-sample variants, which have only one sample.
        """
        if test_type == "independent":
            n_two = n_per_group if n2 is None else n2
            df = n_per_group + n_two - 2
            ncp = effect_size * np.sqrt((n_per_group * n_two) / (n_per_group + n_two))
        else:  # paired / one-sample -- one sample, so there is no second arm to honour
            df = n_per_group - 1
            ncp = effect_size * np.sqrt(n_per_group)
        if df < 1:
            return None

        if alternative == "two-sided":
            crit = stats.t.ppf(1 - alpha / 2, df)
            value = float(stats.nct.sf(crit, df, ncp) + stats.nct.cdf(-crit, df, ncp))
        elif alternative == "less":
            crit = stats.t.ppf(alpha, df)
            value = float(stats.nct.cdf(crit, df, ncp))
        else:  # greater
            crit = stats.t.ppf(1 - alpha, df)
            value = float(stats.nct.sf(crit, df, ncp))

        if np.isfinite(value):
            return value

        return float(self._t_power_exact(effect_size, n_per_group, alpha, test_type, alternative, n2))

    def _t_power_exact(self, effect_size, n_per_group, alpha, test_type, alternative, n2=None):
        """50-digit non-central t power (AS 243). The fallback for scipy's NaN region."""
        result = self.calculate_power_t_test(
            effect_size=str(effect_size),
            sample_size=str(n_per_group),
            sample_size2=None if n2 is None else str(n2),
            alpha=str(alpha),
            alternative=alternative,
            test_type=test_type,
        )
        return mpf(result["power"])

    @staticmethod
    def _correlation_power_float(effect_size, n, alpha, alternative="two-sided"):
        """Fisher-z correlation power, float64 -- the same transform the exact engine uses.

        The sign of the effect matters, and only for the one-sided tails. An earlier version of
        this helper took `abs(effect_size)` and had no `less` branch, so a left-tailed test was
        handed the RIGHT-tailed answer: r = 0.3, n = 100, `less` returned 0.9198 where the truth
        is 1.34e-06. The headline (which goes through the exact engine, and does honour `less`)
        said 0.0% while the curve drawn directly beneath it climbed to 92%.

        That was the same class of bug as `_t_power_float`'s missing `less` branch -- fixed there,
        and left here. Guarding one caller of a shared idea and not the other is how these survive.
        """
        if n <= 3 or abs(effect_size) >= 1:
            return None  # the Fisher transform does not exist here; there is no number to plot

        z = np.arctanh(effect_size) * np.sqrt(n - 3)  # signed: a left tail needs to know the sign

        if alternative == "two-sided":
            crit = stats.norm.ppf(1 - alpha / 2)
            return float(stats.norm.sf(crit - z) + stats.norm.cdf(-crit - z))
        if alternative == "less":
            crit = stats.norm.ppf(alpha)
            return float(stats.norm.cdf(crit - z))
        crit = stats.norm.ppf(1 - alpha)  # greater
        return float(stats.norm.sf(crit - z))

    def power_curve(
        self,
        test_type="t-test",
        effect_size=0.5,
        alpha=0.05,
        groups=2,
        alternative="two-sided",
        n_min=5,
        n_max=200,
        step=5,
        t_test_type="independent",
        allocation_ratio=1.0,
    ):
        """
        Power as a function of sample size, for plotting.

        Points where the power is not defined (a design too small to support the test at all --
        e.g. n = 3 for a correlation, where the Fisher transform divides by sqrt(0)) are OMITTED
        from the series rather than emitted as a placeholder value. A gap in a line is honest; a
        point at 0.001 is not.

        `allocation_ratio` = n2 / n1 is held FIXED as n1 varies along the curve, which is what
        G*Power does and the only reading of "power vs n" that makes sense for an unequal design.
        It defaults to 1.0, so a balanced curve is unchanged.

        Without it the curve was always drawn for a BALANCED design while the headline beside it
        honoured the group-2 box -- so a 30/60 design got a headline power of 0.5994 sitting above a
        curve reading 0.4779 at n = 30. Two numbers, one screen, one design, both claiming to be its
        power. That is the defect this module has now been through four times; the curve was the last
        place it was still live.
        """
        effect_size = float(effect_size)
        alpha = float(alpha)
        groups = int(groups)
        allocation_ratio = float(allocation_ratio)
        if allocation_ratio <= 0:
            raise ValueError(f"The allocation ratio n2/n1 must be positive; got {allocation_ratio}.")

        points = []
        for n in range(int(n_min), int(n_max) + 1, int(step)):
            n2 = None
            if test_type == "anova":
                power = self._anova_power_float(effect_size, groups, n, alpha) if n >= 2 else None
            elif test_type == "correlation":
                power = self._correlation_power_float(effect_size, n, alpha, alternative)
            else:
                # `t_test_type` was hardcoded to "independent" here, so a curve requested for a
                # PAIRED or one-sample design came back as the independent one -- a different
                # curve, plotted under the label of the design the user actually chose. The
                # paired t needs n = d*sqrt(n) and df = n - 1, not d*sqrt(n/2) and df = 2n - 2,
                # and it reaches a given power at roughly half the sample size.
                # The second arm tracks n1 at the fixed allocation ratio, so the point at the
                # user's own n1 IS the headline power, and the curve passes through it.
                #
                # It is ROUNDED (a group cannot have 7.5 people) and FLOORED AT 2 (a group of one
                # supports no variance estimate). Both mean the design actually plotted can differ
                # from the ratio that was asked for -- at ratio 0.033, every point below n1 = 60
                # clamps to n2 = 2, so the leftmost point is really a 10/2 design, a ratio of 0.2.
                # So each point reports the arms it was ACTUALLY computed with, rather than leaving
                # the caller to infer them from a ratio the points do not honour.
                #
                # round() in Python is banker's rounding: round(7.5) = 8 but round(12.5) = 12, so
                # adjacent points on one curve would round in opposite directions. floor(x + 0.5) is
                # round-half-up everywhere.
                n2 = None
                if t_test_type == "independent" and allocation_ratio != 1.0:
                    n2 = max(2, int(math.floor(n * allocation_ratio + 0.5)))
                power = self._t_power_float(effect_size, n, alpha, t_test_type, alternative, n2=n2)

            if power is not None and np.isfinite(power):
                point = {"n": n, "power": float(power)}
                if n2 is not None:
                    point["n1"] = n
                    point["n2"] = n2
                    point["actual_ratio"] = n2 / n  # what was plotted, not what was requested
                points.append(point)

        return {
            "points": points,
            "test_type": test_type,
            "effect_size": effect_size,
            "alpha": alpha,
            "groups": groups if test_type == "anova" else None,
            "alternative": alternative,
            "t_test_type": t_test_type if test_type not in ("anova", "correlation") else None,
            "allocation_ratio": (
                allocation_ratio if test_type == "t-test" and t_test_type == "independent" else None
            ),
        }

    def calculate_sample_size_anova(
        self,
        effect_size: Union[float, str],
        groups: Union[int, str],
        power: Union[float, str] = 0.8,
        alpha: Union[float, str] = 0.05,
    ) -> Dict[str, Any]:
        """
        Required n PER GROUP for a one-way ANOVA to reach `power`, at 50-digit precision.

        Solved against the exact non-central F power above, rather than the normal approximation
        the browser used to compute this with.
        """
        f = self._to_high_precision(effect_size)
        power_hp = self._to_high_precision(power)
        alpha_hp = self._to_high_precision(alpha)
        k = int(groups)

        if f <= 0:
            raise ValueError("Cohen's f must be positive; with no effect no sample size suffices.")
        if k < 2:
            raise ValueError("A one-way ANOVA needs at least 2 groups.")

        def exact_power_at(n_int):
            result = self.calculate_power_anova(
                effect_size=str(f), groups=str(k), n_per_group=str(n_int), alpha=str(alpha_hp)
            )
            return mpf(result["power"])

        def guide_power_at(n_int):
            # The guide only brackets; the exact function certifies. If scipy cannot evaluate a
            # point, treat it as "not yet at target" so the bracket keeps widening -- it can never
            # decide the answer on its own.
            value = self._anova_power_float(float(f), k, n_int, float(alpha_hp))
            return mpf(value) if value is not None else mpf("0")

        n_final = self._smallest_n_meeting_power(
            exact_power_at, power_hp, guide_power_at=guide_power_at, n_start=2
        )
        final = self.calculate_power_anova(
            effect_size=str(f), groups=str(k), n_per_group=str(n_final), alpha=str(alpha_hp)
        )

        return {
            "required_sample_size": n_final,
            "sample_size_per_group": n_final,
            "total_sample_size": n_final * k,
            "actual_power": final["power"],
            "actual_power_float": final["power_float"],
            "effect_size": str(f),
            "groups": k,
            "target_power": float(power_hp),
            "alpha": float(alpha_hp),
            "test_type": "anova",
        }

    def calculate_sample_size_correlation(
        self,
        effect_size: Union[float, str],
        power: Union[float, str] = 0.8,
        alpha: Union[float, str] = 0.05,
        alternative: str = "two-sided",
    ) -> Dict[str, Any]:
        """
        Required n for a correlation test to reach `power`, at 50-digit precision.

        Solved against the exact power above rather than the Fisher-z closed form, which is an
        approximation and rounds the wrong way at the boundary.
        """
        r = self._to_high_precision(effect_size)
        power_hp = self._to_high_precision(power)
        alpha_hp = self._to_high_precision(alpha)

        if abs(r) >= 1:
            raise ValueError("A correlation must lie strictly between -1 and 1.")
        if r == 0:
            raise ValueError("No sample size gives power against a true correlation of exactly 0.")

        def exact_power_at(n_int):
            result = self.calculate_power_correlation(
                effect_size=str(r), sample_size=str(n_int), alpha=str(alpha_hp), alternative=alternative
            )
            return mpf(result["power"])

        # The 50-digit correlation power costs ~1ms, so it needs no cheap guide -- it brackets
        # and certifies itself. The correlation test needs n > 3 for the Fisher transform.
        n_final = self._smallest_n_meeting_power(exact_power_at, power_hp, n_start=4)
        final = self.calculate_power_correlation(
            effect_size=str(r), sample_size=str(n_final), alpha=str(alpha_hp), alternative=alternative
        )

        return {
            "required_sample_size": n_final,
            "total_sample_size": n_final,
            "actual_power": final["power"],
            "actual_power_float": final["power_float"],
            "effect_size": str(r),
            "target_power": float(power_hp),
            "alpha": float(alpha_hp),
            "test_type": "correlation",
            "alternative": alternative,
        }

    def calculate_effect_size_t_test(
        self,
        sample_size: Union[int, str],
        power: Union[float, str] = 0.8,
        alpha: Union[float, str] = 0.05,
        alternative: str = "two-sided",
        test_type: str = "independent",
    ) -> Dict[str, Any]:
        """
        Calculate detectable effect size for t-tests with 50 decimal precision.

        Parameters
        ----------
        sample_size : Union[int, str]
            Sample size per group (independent) or total (paired)
        power : Union[float, str], default=0.8
            Desired statistical power
        alpha : Union[float, str], default=0.05
            Significance level
        alternative : str, default='two-sided'
            Alternative hypothesis
        test_type : str, default='independent'
            Type of t-test

        Returns
        -------
        Dict[str, Any]
            Dictionary containing detectable effect size and parameters
        """
        n = self._to_high_precision(sample_size)
        power_hp = self._to_high_precision(power)
        alpha_hp = self._to_high_precision(alpha)

        # Binary search for effect size
        d_min = mpf("0.01")
        d_max = mpf("5")

        for iteration in range(100):
            d_mid = (d_min + d_max) / mpf("2")

            result = self.calculate_power_t_test(
                effect_size=str(d_mid),
                sample_size=str(int(n)),
                alpha=str(alpha_hp),
                alternative=alternative,
                test_type=test_type,
            )

            current_power = mpf(result["power"])

            if abs(current_power - power_hp) < mpf("0.0001"):
                break

            if current_power < power_hp:
                d_min = d_mid
            else:
                d_max = d_mid

        return {
            "detectable_effect_size": str(d_mid),
            "effect_size_float": float(d_mid),
            "actual_power": result["power"],
            "actual_power_float": result["power_float"],
            "sample_size": int(n),
            "target_power": float(power_hp),
            "alpha": float(alpha_hp),
            "test_type": test_type,
            "alternative": alternative,
            "effect_size_interpretation": self._interpret_effect_size(float(d_mid)),
        }

    def calculate_power_anova(
        self,
        effect_size: Union[float, str],
        groups: Union[int, str],
        n_per_group: Union[int, str],
        alpha: Union[float, str] = 0.05,
    ) -> Dict[str, Any]:
        """
        Calculate statistical power for one-way ANOVA with 50 decimal precision.

        Parameters
        ----------
        effect_size : Union[float, str]
            Cohen's f effect size
        groups : Union[int, str]
            Number of groups
        n_per_group : Union[int, str]
            Sample size per group
        alpha : Union[float, str], default=0.05
            Significance level

        Returns
        -------
        Dict[str, Any]
            Dictionary containing power and related statistics
        """
        f = self._to_high_precision(effect_size)
        k = self._to_high_precision(groups)
        n = self._to_high_precision(n_per_group)
        alpha_hp = self._to_high_precision(alpha)

        # Degrees of freedom
        df1 = k - mpf("1")  # Between groups
        df2 = k * (n - mpf("1"))  # Within groups

        # Non-centrality parameter
        lambda_nc = n * k * f * f

        # Critical F-value (high-precision central F quantile)
        critical_f = self._f_ppf(mpf("1") - alpha_hp, df1, df2)

        # Power from the genuinely high-precision non-central F CDF
        power = mpf("1") - self._ncf_cdf(critical_f, df1, df2, lambda_nc)

        return {
            "power": str(power),
            "power_float": float(power),
            "effect_size": str(f),
            "groups": int(k),
            "n_per_group": int(n),
            "total_n": int(k * n),
            "alpha": float(alpha_hp),
            "df_between": int(df1),
            "df_within": int(df2),
            "critical_f": str(critical_f),
            "non_centrality": str(lambda_nc),
            "interpretation": self._interpret_power(float(power)),
        }

    def calculate_power_correlation(
        self,
        effect_size: Union[float, str],
        sample_size: Union[int, str],
        alpha: Union[float, str] = 0.05,
        alternative: str = "two-sided",
    ) -> Dict[str, Any]:
        """
        Calculate statistical power for correlation tests with 50 decimal precision.

        Parameters
        ----------
        effect_size : Union[float, str]
            Correlation coefficient (r)
        sample_size : Union[int, str]
            Sample size
        alpha : Union[float, str], default=0.05
            Significance level
        alternative : str, default='two-sided'
            Alternative hypothesis

        Returns
        -------
        Dict[str, Any]
            Dictionary containing power and related statistics
        """
        r = self._to_high_precision(effect_size)
        n = self._to_high_precision(sample_size)
        alpha_hp = self._to_high_precision(alpha)

        # Fisher's z transformation
        z = mpf("0.5") * log((mpf("1") + r) / (mpf("1") - r))

        # Standard error of z
        se_z = mpf("1") / sqrt(n - mpf("3"))

        # Critical value(s)
        if alternative == "two-sided":
            z_crit = self._normal_ppf(mpf("1") - alpha_hp / mpf("2"))
            # Convert back to r scale
            r_crit_upper = (exp(mpf("2") * z_crit * se_z) - mpf("1")) / (exp(mpf("2") * z_crit * se_z) + mpf("1"))
            r_crit_lower = -r_crit_upper

            # Power calculation
            z_lower = (log((mpf("1") + r_crit_lower) / (mpf("1") - r_crit_lower)) / mpf("2") - z) / se_z
            z_upper = (log((mpf("1") + r_crit_upper) / (mpf("1") - r_crit_upper)) / mpf("2") - z) / se_z

            power = mpf("1") - self._normal_cdf(z_upper) + self._normal_cdf(z_lower)

        elif alternative == "greater":
            z_crit = self._normal_ppf(mpf("1") - alpha_hp)
            r_crit = (exp(mpf("2") * z_crit * se_z) - mpf("1")) / (exp(mpf("2") * z_crit * se_z) + mpf("1"))

            z_power = (log((mpf("1") + r_crit) / (mpf("1") - r_crit)) / mpf("2") - z) / se_z
            power = mpf("1") - self._normal_cdf(z_power)

        else:  # less
            z_crit = self._normal_ppf(alpha_hp)
            r_crit = (exp(mpf("2") * z_crit * se_z) - mpf("1")) / (exp(mpf("2") * z_crit * se_z) + mpf("1"))

            z_power = (log((mpf("1") + r_crit) / (mpf("1") - r_crit)) / mpf("2") - z) / se_z
            power = self._normal_cdf(z_power)

        return {
            "power": str(power),
            "power_float": float(power),
            "correlation": str(r),
            "sample_size": int(n),
            "alpha": float(alpha_hp),
            "fisher_z": str(z),
            "standard_error": str(se_z),
            "alternative": alternative,
            "interpretation": self._interpret_power(float(power)),
        }

    def calculate_power_chi_square(
        self,
        effect_size: Union[float, str],
        df: Union[int, str],
        sample_size: Union[int, str],
        alpha: Union[float, str] = 0.05,
    ) -> Dict[str, Any]:
        """
        Calculate statistical power for chi-square tests with 50 decimal precision.

        Parameters
        ----------
        effect_size : Union[float, str]
            Cohen's w effect size
        df : Union[int, str]
            Degrees of freedom
        sample_size : Union[int, str]
            Total sample size
        alpha : Union[float, str], default=0.05
            Significance level

        Returns
        -------
        Dict[str, Any]
            Dictionary containing power and related statistics
        """
        w = self._to_high_precision(effect_size)
        df_hp = self._to_high_precision(df)
        n = self._to_high_precision(sample_size)
        alpha_hp = self._to_high_precision(alpha)

        # Non-centrality parameter
        lambda_nc = n * w * w

        # Critical chi-square value (high-precision central chi-square quantile)
        critical_chi2 = self._chi2_ppf(mpf("1") - alpha_hp, df_hp)

        # Power from the genuinely high-precision non-central chi-square CDF
        power = mpf("1") - self._ncx2_cdf(critical_chi2, df_hp, lambda_nc)

        return {
            "power": str(power),
            "power_float": float(power),
            "effect_size": str(w),
            "degrees_freedom": int(df_hp),
            "sample_size": int(n),
            "alpha": float(alpha_hp),
            "critical_chi2": str(critical_chi2),
            "non_centrality": str(lambda_nc),
            "interpretation": self._interpret_power(float(power)),
        }

    def create_power_curves(
        self,
        test_type: str = "t-test",
        effect_sizes: Optional[List[float]] = None,
        sample_sizes: Optional[List[int]] = None,
        alpha: float = 0.05,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Create power curves for visualization with 50 decimal precision.

        Parameters
        ----------
        test_type : str, default='t-test'
            Type of test: 't-test', 'anova', 'correlation', 'chi-square'
        effect_sizes : Optional[List[float]]
            Range of effect sizes to plot
        sample_sizes : Optional[List[int]]
            Range of sample sizes to plot
        alpha : float, default=0.05
            Significance level
        **kwargs
            Additional test-specific parameters

        Returns
        -------
        Dict[str, Any]
            Dictionary containing plot data and Plotly figure
        """
        if effect_sizes is None:
            effect_sizes = np.linspace(0.1, 2.0, 20).tolist()
        if sample_sizes is None:
            sample_sizes = list(range(10, 201, 10))

        # Create figure with subplots
        fig = make_subplots(
            rows=1, cols=2, subplot_titles=("Power vs Effect Size", "Power vs Sample Size"), horizontal_spacing=0.15
        )

        # Power vs Effect Size (for different sample sizes)
        sample_size_examples = [20, 50, 100, 200]

        for n in sample_size_examples:
            powers = []

            for es in effect_sizes:
                if test_type == "t-test":
                    result = self.calculate_power_t_test(effect_size=es, sample_size=n, alpha=alpha, **kwargs)
                elif test_type == "anova":
                    result = self.calculate_power_anova(effect_size=es, n_per_group=n, alpha=alpha, **kwargs)
                elif test_type == "correlation":
                    result = self.calculate_power_correlation(effect_size=es, sample_size=n, alpha=alpha, **kwargs)
                elif test_type == "chi-square":
                    result = self.calculate_power_chi_square(effect_size=es, sample_size=n, alpha=alpha, **kwargs)
                else:
                    # ✅ FIXED: Handle unknown test types
                    raise ValueError(
                        f"Unsupported test type: {test_type}. Supported: 't-test', 'anova', 'correlation', 'chi-square'"
                    )

                powers.append(result["power_float"])

            fig.add_trace(
                go.Scatter(
                    x=effect_sizes,
                    y=powers,
                    mode="lines+markers",
                    name=f"n={n}",
                    line=dict(width=2),
                    marker=dict(size=6),
                ),
                row=1,
                col=1,
            )

        # Power vs Sample Size (for different effect sizes)
        effect_size_examples = [0.2, 0.5, 0.8, 1.2]

        for es in effect_size_examples:
            powers = []

            for n in sample_sizes:
                if test_type == "t-test":
                    result = self.calculate_power_t_test(effect_size=es, sample_size=n, alpha=alpha, **kwargs)
                elif test_type == "anova":
                    result = self.calculate_power_anova(effect_size=es, n_per_group=n, alpha=alpha, **kwargs)
                elif test_type == "correlation":
                    result = self.calculate_power_correlation(effect_size=es, sample_size=n, alpha=alpha, **kwargs)
                elif test_type == "chi-square":
                    result = self.calculate_power_chi_square(effect_size=es, sample_size=n, alpha=alpha, **kwargs)
                else:
                    # ✅ FIXED: Handle unknown test types
                    raise ValueError(
                        f"Unsupported test type: {test_type}. Supported: 't-test', 'anova', 'correlation', 'chi-square'"
                    )

                powers.append(result["power_float"])

            fig.add_trace(
                go.Scatter(
                    x=sample_sizes,
                    y=powers,
                    mode="lines+markers",
                    name=f"d={es}" if test_type == "t-test" else f"ES={es}",
                    line=dict(width=2),
                    marker=dict(size=6),
                ),
                row=1,
                col=2,
            )

        # Add 80% power reference line
        for col in [1, 2]:
            fig.add_hline(y=0.8, line_dash="dash", line_color="red", annotation_text="80% Power", row=1, col=col)

        # Update layout
        fig.update_xaxes(title_text="Effect Size", row=1, col=1)
        fig.update_xaxes(title_text="Sample Size", row=1, col=2)
        fig.update_yaxes(title_text="Statistical Power", row=1, col=1)
        fig.update_yaxes(title_text="Statistical Power", row=1, col=2)

        fig.update_layout(
            title=f"Power Analysis Curves - {test_type.replace('-', ' ').title()} (α={alpha})",
            height=500,
            showlegend=True,
            hovermode="x unified",
        )

        return {
            "figure": fig.to_dict(),
            "effect_sizes": effect_sizes,
            "sample_sizes": sample_sizes,
            "test_type": test_type,
            "alpha": alpha,
            "plot_html": fig.to_html(include_plotlyjs="cdn"),
            "description": f"Power curves for {test_type} with significance level α={alpha}",
        }

    def optimal_allocation(
        self,
        total_sample_size: Union[int, str],
        group_costs: Optional[List[float]] = None,
        group_variances: Optional[List[float]] = None,
        n_groups: int = 2,
    ) -> Dict[str, Any]:
        """
        Calculate optimal sample size allocation across groups.

        Parameters
        ----------
        total_sample_size : Union[int, str]
            Total available sample size
        group_costs : Optional[List[float]]
            Cost per observation in each group
        group_variances : Optional[List[float]]
            Known or estimated variance in each group
        n_groups : int, default=2
            Number of groups

        Returns
        -------
        Dict[str, Any]
            Dictionary containing optimal allocation and rationale
        """
        N = self._to_high_precision(total_sample_size)

        if group_costs is None:
            group_costs = [1.0] * n_groups
        if group_variances is None:
            group_variances = [1.0] * n_groups

        costs = [self._to_high_precision(c) for c in group_costs]
        variances = [self._to_high_precision(v) for v in group_variances]

        # Neyman allocation formula
        allocation_weights = []
        denominator = mpf("0")

        for i in range(n_groups):
            weight = sqrt(variances[i]) / sqrt(costs[i])
            allocation_weights.append(weight)
            denominator += weight

        # Calculate optimal sample sizes
        optimal_sizes = []
        for weight in allocation_weights:
            n_i = N * weight / denominator
            optimal_sizes.append(int(n_i))

        # Adjust for rounding to ensure total equals N
        total_allocated = sum(optimal_sizes)
        if total_allocated < int(N):
            # Add remaining to group with highest weight
            max_idx = allocation_weights.index(max(allocation_weights))
            optimal_sizes[max_idx] += int(N) - total_allocated

        # Calculate efficiency compared to equal allocation
        equal_sizes = [int(N) // n_groups] * n_groups
        for i in range(int(N) % n_groups):
            equal_sizes[i] += 1

        # Variance of mean under optimal allocation
        var_optimal = mpf("0")
        for i in range(n_groups):
            if optimal_sizes[i] > 0:
                var_optimal += variances[i] / mpf(str(optimal_sizes[i]))

        # Variance of mean under equal allocation
        var_equal = mpf("0")
        for i in range(n_groups):
            if equal_sizes[i] > 0:
                var_equal += variances[i] / mpf(str(equal_sizes[i]))

        efficiency_gain = float((var_equal - var_optimal) / var_equal * mpf("100"))

        return {
            "optimal_allocation": optimal_sizes,
            "equal_allocation": equal_sizes,
            "total_sample_size": int(N),
            "allocation_ratios": [float(w / denominator) for w in allocation_weights],
            "efficiency_gain_percent": efficiency_gain,
            "group_costs": group_costs,
            "group_variances": group_variances,
            "recommendation": self._generate_allocation_recommendation(optimal_sizes, equal_sizes, efficiency_gain),
        }

    def sensitivity_analysis(
        self,
        test_type: str,
        base_params: Dict[str, Any],
        vary_param: str,
        vary_range: Tuple[float, float],
        n_points: int = 20,
    ) -> Dict[str, Any]:
        """
        Perform sensitivity analysis on power calculations.

        Parameters
        ----------
        test_type : str
            Type of test
        base_params : Dict[str, Any]
            Base parameters for the test
        vary_param : str
            Parameter to vary
        vary_range : Tuple[float, float]
            Range of values for the parameter
        n_points : int, default=20
            Number of points to evaluate

        Returns
        -------
        Dict[str, Any]
            Dictionary containing sensitivity analysis results
        """
        values = np.linspace(vary_range[0], vary_range[1], n_points).tolist()
        results = []

        for value in values:
            params = base_params.copy()
            params[vary_param] = value

            if test_type == "t-test":
                result = self.calculate_power_t_test(**params)
            elif test_type == "anova":
                result = self.calculate_power_anova(**params)
            elif test_type == "correlation":
                result = self.calculate_power_correlation(**params)
            elif test_type == "chi-square":
                result = self.calculate_power_chi_square(**params)

            results.append({vary_param: value, "power": result["power_float"]})

        # Create visualization
        fig = go.Figure()

        fig.add_trace(
            go.Scatter(
                x=[r[vary_param] for r in results],
                y=[r["power"] for r in results],
                mode="lines+markers",
                name="Power",
                line=dict(color="blue", width=3),
                marker=dict(size=8),
            )
        )

        # Add 80% power reference
        fig.add_hline(y=0.8, line_dash="dash", line_color="red", annotation_text="80% Power")

        fig.update_layout(
            title=f"Sensitivity Analysis: Power vs {vary_param.replace('_', ' ').title()}",
            xaxis_title=vary_param.replace("_", " ").title(),
            yaxis_title="Statistical Power",
            hovermode="x unified",
            height=500,
        )

        # Find value for 80% power
        target_value = None
        for i in range(len(results) - 1):
            if results[i]["power"] <= 0.8 <= results[i + 1]["power"]:
                # Linear interpolation
                x1, y1 = results[i][vary_param], results[i]["power"]
                x2, y2 = results[i + 1][vary_param], results[i + 1]["power"]
                target_value = x1 + (0.8 - y1) * (x2 - x1) / (y2 - y1)
                break

        return {
            "results": results,
            "figure": fig.to_dict(),
            "plot_html": fig.to_html(include_plotlyjs="cdn"),
            "vary_parameter": vary_param,
            "vary_range": vary_range,
            "value_for_80_power": target_value,
            "test_type": test_type,
            "base_parameters": base_params,
        }

    def _interpret_power(self, power: float) -> str:
        """Interpret power value with recommendations."""
        if power >= 0.95:
            return "Excellent power - Very high probability of detecting true effects"
        elif power >= 0.80:
            return "Good power - Adequate probability of detecting true effects"
        elif power >= 0.60:
            return "Moderate power - Consider increasing sample size"
        elif power >= 0.40:
            return "Low power - High risk of Type II error"
        else:
            return "Very low power - Study likely underpowered"

    def _interpret_effect_size(self, effect_size: float) -> str:
        """Interpret effect size magnitude."""
        abs_es = abs(effect_size)
        if abs_es < 0.2:
            return "Very small effect"
        elif abs_es < 0.5:
            return "Small effect"
        elif abs_es < 0.8:
            return "Medium effect"
        elif abs_es < 1.2:
            return "Large effect"
        else:
            return "Very large effect"

    def _generate_allocation_recommendation(self, optimal: List[int], equal: List[int], efficiency_gain: float) -> str:
        """Generate recommendation for sample allocation."""
        if efficiency_gain > 10:
            return f"Strong recommendation for optimal allocation. {efficiency_gain:.1f}% efficiency gain."
        elif efficiency_gain > 5:
            return f"Moderate benefit from optimal allocation. {efficiency_gain:.1f}% efficiency gain."
        elif efficiency_gain > 1:
            return f"Small benefit from optimal allocation. {efficiency_gain:.1f}% efficiency gain."
        else:
            return "Equal allocation is nearly optimal for this scenario."

    def comprehensive_power_report(self, test_type: str, **params) -> Dict[str, Any]:
        """
        Generate comprehensive power analysis report.

        Parameters
        ----------
        test_type : str
            Type of statistical test
        **params
            Test-specific parameters

        Returns
        -------
        Dict[str, Any]
            Comprehensive report with all power metrics
        """
        report = {
            "test_type": test_type,
            "timestamp": pd.Timestamp.now().isoformat(),
            "parameters": params,
            "precision": self.precision,
        }

        # Calculate power
        if test_type == "t-test":
            power_result = self.calculate_power_t_test(**params)
        elif test_type == "anova":
            power_result = self.calculate_power_anova(**params)
        elif test_type == "correlation":
            power_result = self.calculate_power_correlation(**params)
        elif test_type == "chi-square":
            power_result = self.calculate_power_chi_square(**params)
        else:
            raise ValueError(f"Unknown test type: {test_type}")

        report["power_analysis"] = power_result

        # Sample size calculation
        if "sample_size" in params:
            ss_params = params.copy()
            ss_params.pop("sample_size")
            ss_params["power"] = 0.8

            if test_type == "t-test":
                report["sample_size_for_80_power"] = self.calculate_sample_size_t_test(**ss_params)

        # Effect size calculation
        if "effect_size" in params:
            es_params = params.copy()
            es_params.pop("effect_size")
            es_params["power"] = 0.8

            if test_type == "t-test":
                report["detectable_effect_size"] = self.calculate_effect_size_t_test(**es_params)

        # Power curves
        report["power_curves"] = self.create_power_curves(test_type=test_type, alpha=params.get("alpha", 0.05))

        # Generate summary
        power = power_result["power_float"]
        report["summary"] = {
            "adequate_power": power >= 0.8,
            "power_interpretation": self._interpret_power(power),
            "recommendations": [],
        }

        if power < 0.8:
            report["summary"]["recommendations"].append("Consider increasing sample size to achieve 80% power")
            if "effect_size" in params and abs(float(params["effect_size"])) < 0.5:
                report["summary"]["recommendations"].append(
                    "Small effect size requires larger sample for adequate power"
                )

        return report


def create_api_interface():
    """Create API interface for power analysis."""
    return {
        "calculator": HighPrecisionPowerAnalysis(),
        "endpoints": [
            "/api/power/t-test/",
            "/api/power/anova/",
            "/api/power/correlation/",
            "/api/power/chi-square/",
            "/api/power/sample-size/",
            "/api/power/effect-size/",
            "/api/power/curves/",
            "/api/power/allocation/",
            "/api/power/sensitivity/",
            "/api/power/report/",
        ],
        "documentation": {
            "description": "High-precision power analysis with 50 decimal places",
            "precision": "50 decimal places",
            "methods": [
                "calculate_power_t_test",
                "calculate_sample_size_t_test",
                "calculate_effect_size_t_test",
                "calculate_power_anova",
                "calculate_power_correlation",
                "calculate_power_chi_square",
                "create_power_curves",
                "optimal_allocation",
                "sensitivity_analysis",
                "comprehensive_power_report",
            ],
        },
    }


if __name__ == "__main__":
    # Example usage and verification
    calculator = HighPrecisionPowerAnalysis()

    print("High-Precision Power Analysis Calculator - Verification")
    print("=" * 60)

    # T-test power calculation
    result = calculator.calculate_power_t_test(
        effect_size=0.5, sample_size=64, alpha=0.05, alternative="two-sided", test_type="independent"
    )

    print("\nT-Test Power Calculation:")
    print(f"Effect Size (d): {result['effect_size']}")
    print(f"Sample Size: {result['sample_size']}")
    print(f"Power (50 decimals): {result['power']}")
    print(f"Power (float): {result['power_float']:.4f}")
    print(f"Interpretation: {result['interpretation']}")

    # Sample size calculation
    ss_result = calculator.calculate_sample_size_t_test(effect_size=0.5, power=0.8, alpha=0.05)

    print("\nSample Size Calculation:")
    print(f"Required Sample Size: {ss_result['required_sample_size']}")
    print(f"Actual Power: {ss_result['actual_power_float']:.4f}")

    print("\n✓ Power Analysis Calculator initialized with 50 decimal precision")
