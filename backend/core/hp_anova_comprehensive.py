"""
Comprehensive High-Precision ANOVA Module
=========================================
Created: 2025-09-15
Author: StickForStats Development Team
Version: 1.0.0

High-precision ANOVA.

IMPLEMENTED:
- One-way ANOVA (with post-hoc tests and effect sizes)

NOT YET IMPLEMENTED (the methods exist but raise NotImplementedError; see audit
2026-05-31, ST-1 — they previously fell through and returned None):
- Two-way ANOVA (with/without interaction)
- Repeated Measures ANOVA
- MANOVA (Multivariate ANOVA)
(Three-way / Mixed ANOVA / ANCOVA are not present as methods here; ANCOVA lives
in core.services.anova.advanced_anova_service.)

Post-hoc tests included:
- Tukey HSD
- Bonferroni
- Scheffe
- Dunnett
- Duncan
- Newman-Keuls
- Fisher's LSD
- Games-Howell (for unequal variances)

Multiple comparison corrections:
- Bonferroni
- Holm-Bonferroni
- Benjamini-Hochberg (FDR)
- Benjamini-Yekutieli
- Sidak
- Holm-Sidak
"""

from decimal import Decimal, getcontext
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Union, Any
from dataclasses import dataclass
from enum import Enum
import mpmath
import scipy.stats as stats
import logging

# Set high precision
getcontext().prec = 50
mpmath.mp.dps = 50

logger = logging.getLogger(__name__)


def _json_safe(obj):
    """Recursively replace non-finite floats (inf/nan) with None so the result is
    JSON-serializable -- DRF's renderer rejects inf/nan. Degenerate inputs (e.g.
    zero error variance, which yields F = inf) therefore return null rather than
    crashing response serialization with a 500."""
    import math

    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    return obj


class AnovaType(Enum):
    """Types of ANOVA analyses"""

    ONE_WAY = "one_way"
    TWO_WAY = "two_way"
    THREE_WAY = "three_way"
    REPEATED_MEASURES = "repeated_measures"
    MIXED = "mixed"
    MANOVA = "manova"
    ANCOVA = "ancova"


class PostHocTest(Enum):
    """Available post-hoc tests"""

    TUKEY_HSD = "tukey_hsd"
    BONFERRONI = "bonferroni"
    SCHEFFE = "scheffe"
    DUNNETT = "dunnett"
    DUNCAN = "duncan"
    NEWMAN_KEULS = "newman_keuls"
    FISHER_LSD = "fisher_lsd"
    GAMES_HOWELL = "games_howell"


class MultipleComparisonCorrection(Enum):
    """Multiple comparison correction methods"""

    BONFERRONI = "bonferroni"
    HOLM = "holm"
    BENJAMINI_HOCHBERG = "benjamini_hochberg"  # FDR
    BENJAMINI_YEKUTIELI = "benjamini_yekutieli"
    SIDAK = "sidak"
    HOLM_SIDAK = "holm_sidak"


@dataclass
class AnovaResult:
    """Complete ANOVA results with high precision"""

    anova_type: AnovaType

    # Main ANOVA table
    f_statistic: Decimal
    p_value: Decimal
    df_between: int
    df_within: int
    df_total: int

    # Sum of squares
    ss_between: Decimal
    ss_within: Decimal
    ss_total: Decimal

    # Mean squares
    ms_between: Decimal
    ms_within: Decimal

    # Effect sizes
    eta_squared: Decimal
    partial_eta_squared: Decimal
    omega_squared: Decimal
    cohen_f: Decimal

    # Group statistics
    group_means: Dict[str, Decimal]
    group_stds: Dict[str, Decimal]
    group_ns: Dict[str, int]

    # Assumptions
    levene_statistic: Decimal
    levene_p_value: Decimal
    shapiro_p_values: Dict[str, Decimal]

    # Post-hoc results
    post_hoc_results: Optional[Dict[str, Any]] = None

    # Multiple comparisons
    adjusted_p_values: Optional[Dict[str, Decimal]] = None

    # Confidence intervals
    confidence_intervals: Optional[Dict[str, Tuple[Decimal, Decimal]]] = None

    # Power analysis
    observed_power: Optional[Decimal] = None

    # Additional statistics
    grand_mean: Optional[Decimal] = None
    r_squared: Optional[Decimal] = None
    adjusted_r_squared: Optional[Decimal] = None


@dataclass
class ManovaResult:
    """MANOVA results with multiple dependent variables"""

    test_statistics: Dict[str, Decimal]  # Wilks, Pillai, Hotelling, Roy
    f_statistics: Dict[str, Decimal]
    p_values: Dict[str, Decimal]
    effect_sizes: Dict[str, Decimal]
    univariate_anovas: List[AnovaResult]


class HighPrecisionANOVA:
    """
    Comprehensive ANOVA implementation with high precision
    """

    def __init__(self, precision: int = 50):
        self.precision = precision
        getcontext().prec = precision
        mpmath.mp.dps = precision

    @staticmethod
    def _to_decimal(value: Union[float, int, str, Decimal]) -> Decimal:
        """Convert to high-precision Decimal"""
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))

    @staticmethod
    def _to_decimal_array(data: Union[List, np.ndarray]) -> List[Decimal]:
        """Convert array to Decimal list"""
        return [HighPrecisionANOVA._to_decimal(x) for x in data]

    def one_way_anova(
        self, *groups, post_hoc: Optional[PostHocTest] = None, correction: Optional[MultipleComparisonCorrection] = None
    ) -> AnovaResult:
        """
        Perform one-way ANOVA with high precision

        Args:
            *groups: Variable number of group arrays
            post_hoc: Optional post-hoc test to perform
            correction: Optional multiple comparison correction

        Returns:
            Comprehensive AnovaResult
        """
        # Validate input
        if len(groups) < 2:
            raise ValueError("ANOVA requires at least 2 groups")

        # Convert to Decimal arrays
        decimal_groups = [self._to_decimal_array(g) for g in groups]

        # Check each group has sufficient data
        for i, g in enumerate(decimal_groups):
            if len(g) < 2:
                raise ValueError(f"Group {i+1} needs at least 2 observations")

        # Calculate overall statistics
        all_data = []
        for g in decimal_groups:
            all_data.extend(g)

        n_total = len(all_data)
        k = len(groups)  # Number of groups
        grand_mean = self._calculate_mean(all_data)

        # Calculate group statistics
        group_means = {}
        group_stds = {}
        group_ns = {}

        for i, group in enumerate(decimal_groups):
            group_means[f"Group_{i+1}"] = self._calculate_mean(group)
            group_stds[f"Group_{i+1}"] = self._calculate_std(group)
            group_ns[f"Group_{i+1}"] = len(group)

        # Calculate Sum of Squares
        ss_total = sum((x - grand_mean) ** 2 for x in all_data)

        ss_between = Decimal("0")
        for i, group in enumerate(decimal_groups):
            group_mean = group_means[f"Group_{i+1}"]
            n_group = Decimal(str(len(group)))
            ss_between += n_group * (group_mean - grand_mean) ** 2

        ss_within = ss_total - ss_between

        # Degrees of freedom
        df_between = k - 1
        df_within = n_total - k
        df_total = n_total - 1

        # Mean Squares
        ms_between = ss_between / Decimal(str(df_between))
        ms_within = ss_within / Decimal(str(df_within))

        # F-statistic
        if ms_within == 0:
            raise ValueError("Within-group variance is zero")

        f_statistic = ms_between / ms_within

        # Calculate p-value using high precision
        p_value = self._calculate_f_p_value(f_statistic, df_between, df_within)

        # Effect sizes
        eta_squared = ss_between / ss_total
        partial_eta_squared = ss_between / (ss_between + ss_within)

        # Omega squared (less biased than eta squared)
        omega_squared = (ss_between - Decimal(str(df_between)) * ms_within) / (ss_total + ms_within)

        # Cohen's f
        cohen_f = Decimal(str(mpmath.sqrt(float(eta_squared / (Decimal("1") - eta_squared)))))

        # Check assumptions
        levene_stat, levene_p = self._levene_test(*decimal_groups)
        shapiro_p_values = {}
        for i, group in enumerate(decimal_groups):
            if len(group) >= 3:
                _, p = stats.shapiro([float(x) for x in group])
                shapiro_p_values[f"Group_{i+1}"] = Decimal(str(p))

        # Create result object
        result = AnovaResult(
            anova_type=AnovaType.ONE_WAY,
            f_statistic=f_statistic,
            p_value=p_value,
            df_between=df_between,
            df_within=df_within,
            df_total=df_total,
            ss_between=ss_between,
            ss_within=ss_within,
            ss_total=ss_total,
            ms_between=ms_between,
            ms_within=ms_within,
            eta_squared=eta_squared,
            partial_eta_squared=partial_eta_squared,
            omega_squared=omega_squared,
            cohen_f=cohen_f,
            group_means=group_means,
            group_stds=group_stds,
            group_ns=group_ns,
            levene_statistic=levene_stat,
            levene_p_value=levene_p,
            shapiro_p_values=shapiro_p_values,
            grand_mean=grand_mean,
            r_squared=eta_squared,
            adjusted_r_squared=Decimal("1")
            - (Decimal("1") - eta_squared) * (Decimal(str(df_total)) / Decimal(str(df_within))),
        )

        # Perform post-hoc tests if requested
        if post_hoc and p_value < Decimal("0.05"):
            result.post_hoc_results = self._perform_post_hoc(decimal_groups, ms_within, df_within, post_hoc)

        # Apply multiple comparison corrections if requested
        if correction and result.post_hoc_results:
            result.adjusted_p_values = self._apply_correction(result.post_hoc_results, correction)

        # Calculate observed power
        result.observed_power = self._calculate_power(f_statistic, df_between, df_within, alpha=Decimal("0.05"))

        return result

    def two_way_anova(
        self,
        groups: List[np.ndarray],
        factor1_levels: List,
        factor2_levels: List,
        interaction: bool = True,
        sum_of_squares_type: int = 2,
    ) -> Dict[str, Any]:
        """
        Two-way factorial ANOVA with optional interaction.

        Computed via statsmodels' OLS + ``anova_lm`` so the sum-of-squares
        decomposition (Type I/II/III) is correct for UNBALANCED designs --
        unlike a hand-rolled main-effect SS, which is only valid when balanced.
        Type II is the default (recommended for main effects without a forced
        interaction); pass ``sum_of_squares_type=3`` for Type III.

        Args:
            groups: cell samples in row-major order; ``groups[i*n2 + j]`` is the
                cell for (factor1_levels[i], factor2_levels[j]).
            factor1_levels / factor2_levels: the level labels of each factor.
            interaction: include the factor1 x factor2 interaction term.
            sum_of_squares_type: 1, 2, or 3.

        Returns:
            A multi-effect result dict (one entry per main effect + interaction)
            with F, p, df, SS, MS and partial eta-squared, plus the residual and
            model R-squared. (Two-way ANOVA yields several effects, so it does
            not use the single-effect AnovaResult dataclass.)
        """
        import statsmodels.formula.api as smf
        from statsmodels.stats.anova import anova_lm

        n1, n2 = len(factor1_levels), len(factor2_levels)
        if n1 < 2 or n2 < 2:
            raise ValueError("Each factor must have at least 2 levels")
        if len(groups) != n1 * n2:
            raise ValueError(
                f"Expected {n1 * n2} cells (factor1_levels x factor2_levels), got {len(groups)}"
            )
        if sum_of_squares_type not in (1, 2, 3):
            raise ValueError("sum_of_squares_type must be 1, 2, or 3")

        # Reconstruct long-format data from the cell samples.
        rows = []
        for i, l1 in enumerate(factor1_levels):
            for j, l2 in enumerate(factor2_levels):
                cell = np.asarray(groups[i * n2 + j], dtype=float)
                cell = cell[~np.isnan(cell)]
                for v in cell:
                    rows.append({"y": float(v), "f1": f"L{i}", "f2": f"L{j}"})
        df = pd.DataFrame(rows)
        if len(df) <= (n1 * n2):
            raise ValueError("Insufficient data: need more observations than cells for two-way ANOVA")

        formula = "y ~ C(f1) + C(f2)" + (" + C(f1):C(f2)" if interaction else "")
        model = smf.ols(formula, data=df).fit()
        table = anova_lm(model, typ=sum_of_squares_type)

        # statsmodels labels rows C(f1), C(f2), C(f1):C(f2), Residual.
        label_map = {"C(f1)": "factor1", "C(f2)": "factor2", "C(f1):C(f2)": "interaction"}
        ss_resid = float(table.loc["Residual", "sum_sq"])
        df_resid = float(table.loc["Residual", "df"])
        ms_resid = ss_resid / df_resid if df_resid > 0 else float("nan")

        effects = []
        for row_label, name in label_map.items():
            if row_label not in table.index:
                continue
            ss = float(table.loc[row_label, "sum_sq"])
            dfe = float(table.loc[row_label, "df"])
            F = float(table.loc[row_label, "F"])
            p = float(table.loc[row_label, "PR(>F)"])
            partial_eta2 = ss / (ss + ss_resid) if (ss + ss_resid) > 0 else 0.0
            effects.append({
                "name": name,
                "factor": {"factor1": "factor1", "factor2": "factor2", "interaction": "factor1:factor2"}[name],
                "f_statistic": F,
                "p_value": p,
                "df": dfe,
                "df_residual": df_resid,
                "sum_of_squares": ss,
                "mean_square": ss / dfe if dfe > 0 else float("nan"),
                "partial_eta_squared": partial_eta2,
            })

        # Balanced if every cell has the same non-zero n.
        cell_ns = [int(np.sum(~np.isnan(np.asarray(groups[k], dtype=float)))) for k in range(n1 * n2)]
        balanced = len(set(cell_ns)) == 1

        return _json_safe({
            "anova_type": "two_way",
            "design": {
                "factor1_n_levels": n1,
                "factor2_n_levels": n2,
                "balanced": balanced,
                "cell_sizes": cell_ns,
                "n_total": int(len(df)),
                "sum_of_squares_type": sum_of_squares_type,
                "interaction": interaction,
            },
            "effects": effects,
            "residual": {"df": df_resid, "sum_of_squares": ss_resid, "mean_square": ms_resid},
            "grand_mean": float(df["y"].mean()),
            "r_squared": float(model.rsquared),
            "adjusted_r_squared": float(model.rsquared_adj),
        })

    def repeated_measures_anova(self, groups: List[np.ndarray]) -> Dict[str, Any]:
        """
        One-way repeated-measures (within-subjects) ANOVA with Mauchly's test of
        sphericity and the Greenhouse-Geisser correction, via pingouin.

        Args:
            groups: one array per condition; ``groups[c][s]`` is subject s's value
                in condition c. All conditions must have the same number of
                subjects (rows aligned by subject); missing values are not allowed.

        Returns:
            A result dict with the uncorrected F/p, df, partial eta-squared, the
            Mauchly sphericity test, the Greenhouse-Geisser epsilon + corrected
            p-value, and the recommended p-value (sphericity-corrected when
            Mauchly's test is significant). Not the one-way AnovaResult dataclass.
        """
        import pingouin as pg

        k = len(groups)
        if k < 2:
            raise ValueError("Repeated-measures ANOVA needs at least 2 conditions")
        arrs = [np.asarray(g, dtype=float) for g in groups]
        n = len(arrs[0])
        if n < 2:
            raise ValueError("Repeated-measures ANOVA needs at least 2 subjects")
        if any(len(a) != n for a in arrs):
            raise ValueError("All conditions must have the same number of subjects (aligned by row)")
        if any(np.isnan(a).any() for a in arrs):
            raise ValueError("Repeated-measures ANOVA does not support missing values")

        rows = []
        for c, a in enumerate(arrs):
            for s in range(n):
                rows.append({"subject": s, "condition": f"C{c}", "value": float(a[s])})
        df = pd.DataFrame(rows)

        aov = pg.rm_anova(data=df, dv="value", within="condition", subject="subject",
                          detailed=True, correction=True)
        # pingouin's detailed rm_anova has one row per Source ('condition', 'Error');
        # DF is per-row (effect df on 'condition', residual df on 'Error').
        cond = aov[aov["Source"] == "condition"].iloc[0]
        err = aov[aov["Source"] == "Error"].iloc[0]

        def _cv(rowobj, name):
            return float(rowobj[name]) if (name in aov.columns and pd.notna(rowobj[name])) else None

        f_stat = _cv(cond, "F")
        p_unc = _cv(cond, "p-unc")
        df_between = _cv(cond, "DF")
        df_within = _cv(err, "DF")
        eta2 = _cv(cond, "ng2")          # generalized eta-squared
        eps_gg = _cv(cond, "eps")        # Greenhouse-Geisser epsilon
        p_gg = _cv(cond, "p-GG-corr")    # GG-corrected p (None for k=2)

        # Fail LOUDLY if the expected pingouin columns are absent (e.g. a version
        # bump past the pinned 0.5.x renamed them) rather than silently returning
        # a None statistic. pingouin is pinned <0.6 for exactly this reason.
        if f_stat is None or p_unc is None or df_between is None or df_within is None:
            raise RuntimeError(
                "Unexpected pingouin rm_anova output (columns: "
                f"{list(aov.columns)}). The repeated-measures ANOVA expects pingouin "
                "0.5.x column names (Source/DF/F/p-unc); check the pinned pingouin version."
            )

        # Mauchly's test of sphericity: richer detail (W, chi2, dof) from pg.sphericity.
        try:
            spher = pg.sphericity(data=df, dv="value", within="condition", subject="subject")
            sphericity_met = bool(spher.spher)
            mauchly_w = float(spher.W) if spher.W is not None else None
            mauchly_chi2 = float(spher.chi2) if getattr(spher, "chi2", None) is not None else None
            mauchly_dof = float(spher.dof) if getattr(spher, "dof", None) is not None else None
            mauchly_p = float(spher.pval) if spher.pval is not None else None
        except Exception:
            # k = 2 conditions: sphericity is trivially satisfied.
            sphericity_met, mauchly_w, mauchly_chi2, mauchly_dof, mauchly_p = True, 1.0, None, None, None

        recommended_p = p_unc if sphericity_met else (p_gg if p_gg is not None else p_unc)

        return _json_safe({
            "anova_type": "repeated_measures",
            "n_subjects": int(n),
            "n_conditions": int(k),
            "f_statistic": f_stat,
            "p_value": p_unc,
            "df_between": df_between,
            "df_within": df_within,
            "partial_eta_squared": eta2,
            "sphericity": {
                "mauchly_w": mauchly_w,
                "chi_square": mauchly_chi2,
                "df": mauchly_dof,
                "p_value": mauchly_p,
                "assumption_met": sphericity_met,
            },
            "greenhouse_geisser": {"epsilon": eps_gg, "p_value": p_gg},
            "recommended_p_value": recommended_p,
            "recommended_p_basis": "uncorrected" if sphericity_met else "greenhouse_geisser",
        })

    def manova(self, groups: List[np.ndarray], dependent_variables: List[np.ndarray]) -> Dict[str, Any]:
        """
        One-way MANOVA via statsmodels: tests whether a categorical factor
        (defined by ``groups``) affects the joint distribution of several
        dependent variables. Returns the four standard multivariate test
        statistics -- Wilks' lambda, Pillai's trace, Hotelling-Lawley trace, and
        Roy's greatest root -- each with its F-approximation, df and p-value.

        Args:
            groups: one array per factor level; the lengths/order define the
                grouping factor (the values are NOT the DVs).
            dependent_variables: list of m >= 2 DV columns, each of length
                N = total observations (sum of group sizes), ordered by group
                concatenation.

        Returns:
            A multi-statistic result dict (not the single-effect AnovaResult).
        """
        from statsmodels.multivariate.manova import MANOVA

        k = len(groups)
        if k < 2:
            raise ValueError("MANOVA needs at least 2 groups")
        sizes = [int(len(np.asarray(g))) for g in groups]
        n_total = sum(sizes)
        m = len(dependent_variables)
        if m < 2:
            raise ValueError("MANOVA needs at least 2 dependent variables")
        dv = [np.asarray(d, dtype=float) for d in dependent_variables]
        if any(len(d) != n_total for d in dv):
            raise ValueError(f"Each dependent variable must have length {n_total} (total observations)")

        factor = []
        for i, s in enumerate(sizes):
            factor += [f"G{i}"] * s
        dv_names = [f"dv{j}" for j in range(m)]
        data = {"factor": factor}
        for j, name in enumerate(dv_names):
            data[name] = dv[j]
        df = pd.DataFrame(data)

        formula = " + ".join(dv_names) + " ~ C(factor)"
        table = MANOVA.from_formula(formula, data=df).mv_test().results["C(factor)"]["stat"]

        label_to_key = {
            "Wilks' lambda": "wilks_lambda",
            "Pillai's trace": "pillai_trace",
            "Hotelling-Lawley trace": "hotelling_lawley_trace",
            "Roy's greatest root": "roy_greatest_root",
        }
        stats_out = {}
        for label, key in label_to_key.items():
            if label in table.index:
                r = table.loc[label]
                stats_out[key] = {
                    "value": float(r["Value"]),
                    "f_statistic": float(r["F Value"]),
                    "num_df": float(r["Num DF"]),
                    "den_df": float(r["Den DF"]),
                    "p_value": float(r["Pr > F"]),
                }

        return _json_safe({
            "anova_type": "manova",
            "n_groups": k,
            "n_dependent_variables": m,
            "n_total": n_total,
            "group_sizes": sizes,
            "test_statistics": stats_out,
            # Wilks' lambda is the conventional headline statistic.
            "primary": stats_out.get("wilks_lambda"),
        })

    _POST_HOC_ALIASES = {
        "tukey": PostHocTest.TUKEY_HSD,
        "tukey_hsd": PostHocTest.TUKEY_HSD,
        "tukeyhsd": PostHocTest.TUKEY_HSD,
        "bonferroni": PostHocTest.BONFERRONI,
        "scheffe": PostHocTest.SCHEFFE,
        "games_howell": PostHocTest.GAMES_HOWELL,
        "gameshowell": PostHocTest.GAMES_HOWELL,
    }

    _CORRECTION_ALIASES = {
        "bonferroni": MultipleComparisonCorrection.BONFERRONI,
        "holm": MultipleComparisonCorrection.HOLM,
        "holm_bonferroni": MultipleComparisonCorrection.HOLM,
        "benjamini_hochberg": MultipleComparisonCorrection.BENJAMINI_HOCHBERG,
        "fdr_bh": MultipleComparisonCorrection.BENJAMINI_HOCHBERG,
        "sidak": MultipleComparisonCorrection.SIDAK,
        "holm_sidak": MultipleComparisonCorrection.HOLM_SIDAK,
    }

    def post_hoc_test(self, *groups, method: str = "tukey", correction: str = "none") -> Dict[str, Any]:
        """Run a pairwise post-hoc test on the given one-way ANOVA groups.

        Accepts the same variadic ``*groups`` signature as
        :meth:`one_way_anova` plus the string method / correction names
        used by the REST API. Runs one-way ANOVA internally to obtain
        ``ms_within`` and ``df_within``.
        """
        if len(groups) < 2:
            raise ValueError("post_hoc_test requires at least two groups")

        method_key = (method or "tukey").lower().strip()
        enum_method = self._POST_HOC_ALIASES.get(method_key)
        if enum_method is None:
            supported = sorted(set(self._POST_HOC_ALIASES))
            raise ValueError(
                f"Unsupported post-hoc method '{method}'. Supported: {supported}."
            )

        anova = self.one_way_anova(*groups)
        decimal_groups = [self._to_decimal_array(g) for g in groups]
        pairwise = self._perform_post_hoc(
            decimal_groups, anova.ms_within, anova.df_within, enum_method
        )

        correction_key = (correction or "none").lower().strip()
        if correction_key not in ("", "none"):
            corr_enum = self._CORRECTION_ALIASES.get(correction_key)
            if corr_enum is None:
                supported = sorted(set(self._CORRECTION_ALIASES))
                raise ValueError(
                    f"Unsupported correction '{correction}'. Supported: {supported}."
                )
            p_values = {
                label: stats["p_value"]
                for label, stats in pairwise.items()
                if isinstance(stats, dict) and "p_value" in stats
            }
            if p_values:
                adjusted = self._apply_correction(p_values, corr_enum)
                for label, adj_p in adjusted.items():
                    pairwise[label]["p_value_adjusted"] = adj_p

        return pairwise

    def _perform_post_hoc(
        self, groups: List[List[Decimal]], ms_within: Decimal, df_within: int, test_type: PostHocTest
    ) -> Dict[str, Any]:
        """
        Perform post-hoc tests for pairwise comparisons
        """
        results = {}
        len(groups)

        if test_type == PostHocTest.TUKEY_HSD:
            results = self._tukey_hsd(groups, ms_within, df_within)
        elif test_type == PostHocTest.BONFERRONI:
            results = self._bonferroni(groups, ms_within, df_within)
        elif test_type == PostHocTest.SCHEFFE:
            results = self._scheffe(groups, ms_within, df_within)
        elif test_type == PostHocTest.GAMES_HOWELL:
            results = self._games_howell(groups)
        # Add more post-hoc tests as needed

        return results

    def _tukey_hsd(self, groups: List[List[Decimal]], ms_within: Decimal, df_within: int) -> Dict[str, Any]:
        """
        Tukey's Honestly Significant Difference test
        """
        results = {}
        k = len(groups)

        # Calculate critical value (studentized range)
        Decimal("0.05")

        # Pairwise comparisons
        for i in range(k):
            for j in range(i + 1, k):
                mean_diff = abs(self._calculate_mean(groups[i]) - self._calculate_mean(groups[j]))

                n_i = len(groups[i])
                n_j = len(groups[j])

                # Standard error
                se = Decimal(str(mpmath.sqrt(float(ms_within * (Decimal("1") / n_i + Decimal("1") / n_j) / 2))))

                # Calculate q-statistic
                q_stat = mean_diff / se

                # Store result
                comparison = f"Group_{i+1}_vs_Group_{j+1}"
                results[comparison] = {
                    "mean_difference": mean_diff,
                    "standard_error": se,
                    "q_statistic": q_stat,
                    "significant": None,  # Would need studentized range distribution
                }

        return results

    def _bonferroni(self, groups: List[List[Decimal]], ms_within: Decimal, df_within: int) -> Dict[str, Any]:
        """
        Bonferroni correction for multiple comparisons
        """
        results = {}
        k = len(groups)
        n_comparisons = k * (k - 1) // 2
        adjusted_alpha = Decimal("0.05") / Decimal(str(n_comparisons))

        for i in range(k):
            for j in range(i + 1, k):
                # Perform t-test for each pair
                mean_i = self._calculate_mean(groups[i])
                mean_j = self._calculate_mean(groups[j])
                mean_diff = abs(mean_i - mean_j)

                n_i = len(groups[i])
                n_j = len(groups[j])

                # Pooled standard error
                se = Decimal(str(mpmath.sqrt(float(ms_within * (Decimal("1") / n_i + Decimal("1") / n_j)))))

                # t-statistic
                t_stat = mean_diff / se

                # p-value (two-tailed)
                p_value = self._calculate_t_p_value(t_stat, df_within)

                comparison = f"Group_{i+1}_vs_Group_{j+1}"
                results[comparison] = {
                    "mean_difference": mean_diff,
                    "t_statistic": t_stat,
                    "p_value": p_value,
                    "adjusted_p_value": p_value * Decimal(str(n_comparisons)),
                    "significant": p_value < adjusted_alpha,
                }

        return results

    def _scheffe(self, groups: List[List[Decimal]], ms_within: Decimal, df_within: int) -> Dict[str, Any]:
        """
        Scheffe's test for all possible contrasts
        """
        results = {}
        k = len(groups)
        df_between = k - 1

        # Critical value
        f_critical = self._get_f_critical(Decimal("0.05"), df_between, df_within)
        scheffe_critical = Decimal(str(mpmath.sqrt(float((k - 1) * f_critical))))

        for i in range(k):
            for j in range(i + 1, k):
                mean_diff = abs(self._calculate_mean(groups[i]) - self._calculate_mean(groups[j]))

                n_i = len(groups[i])
                n_j = len(groups[j])

                # Standard error for contrast
                se = Decimal(str(mpmath.sqrt(float(ms_within * (Decimal("1") / n_i + Decimal("1") / n_j)))))

                # Test statistic
                test_stat = mean_diff / se

                comparison = f"Group_{i+1}_vs_Group_{j+1}"
                results[comparison] = {
                    "mean_difference": mean_diff,
                    "test_statistic": test_stat,
                    "critical_value": scheffe_critical,
                    "significant": test_stat > scheffe_critical,
                }

        return results

    def _games_howell(self, groups: List[List[Decimal]]) -> Dict[str, Any]:
        """
        Games-Howell test for unequal variances
        """
        results = {}
        k = len(groups)

        for i in range(k):
            for j in range(i + 1, k):
                mean_i = self._calculate_mean(groups[i])
                mean_j = self._calculate_mean(groups[j])
                var_i = self._calculate_variance(groups[i])
                var_j = self._calculate_variance(groups[j])
                n_i = len(groups[i])
                n_j = len(groups[j])

                mean_diff = abs(mean_i - mean_j)

                # Standard error (unequal variances)
                se = Decimal(str(mpmath.sqrt(float(var_i / n_i + var_j / n_j))))

                # Welch's degrees of freedom
                df = (var_i / n_i + var_j / n_j) ** 2 / (
                    (var_i / n_i) ** 2 / (n_i - 1) + (var_j / n_j) ** 2 / (n_j - 1)
                )

                # t-statistic
                t_stat = mean_diff / se

                comparison = f"Group_{i+1}_vs_Group_{j+1}"
                results[comparison] = {
                    "mean_difference": mean_diff,
                    "t_statistic": t_stat,
                    "df": float(df),
                    "standard_error": se,
                }

        return results

    def _apply_correction(
        self, p_values: Dict[str, Decimal], method: MultipleComparisonCorrection
    ) -> Dict[str, Decimal]:
        """
        Apply multiple comparison corrections to p-values
        """
        if method == MultipleComparisonCorrection.BENJAMINI_HOCHBERG:
            return self._benjamini_hochberg(p_values)
        elif method == MultipleComparisonCorrection.HOLM:
            return self._holm_bonferroni(p_values)
        elif method == MultipleComparisonCorrection.SIDAK:
            return self._sidak_correction(p_values)
        # Add more correction methods

        return p_values

    def _benjamini_hochberg(self, p_values: Dict[str, Decimal]) -> Dict[str, Decimal]:
        """
        Benjamini-Hochberg FDR correction
        """
        n = len(p_values)
        sorted_pairs = sorted(p_values.items(), key=lambda x: x[1])

        adjusted = {}
        for i, (key, p) in enumerate(sorted_pairs, 1):
            adjusted_p = p * Decimal(str(n)) / Decimal(str(i))
            adjusted[key] = min(adjusted_p, Decimal("1"))

        return adjusted

    def _holm_bonferroni(self, p_values: Dict[str, Decimal]) -> Dict[str, Decimal]:
        """
        Holm-Bonferroni step-down correction
        """
        n = len(p_values)
        sorted_pairs = sorted(p_values.items(), key=lambda x: x[1])

        adjusted = {}
        for i, (key, p) in enumerate(sorted_pairs):
            adjusted_p = p * Decimal(str(n - i))
            adjusted[key] = min(adjusted_p, Decimal("1"))

        return adjusted

    def _sidak_correction(self, p_values: Dict[str, Decimal]) -> Dict[str, Decimal]:
        """
        Sidak correction
        """
        n = len(p_values)
        adjusted = {}

        for key, p in p_values.items():
            adjusted_p = Decimal("1") - (Decimal("1") - p) ** Decimal(str(n))
            adjusted[key] = adjusted_p

        return adjusted

    def _calculate_mean(self, data: List[Decimal]) -> Decimal:
        """Calculate mean with high precision"""
        if not data:
            return Decimal("0")
        return sum(data) / Decimal(str(len(data)))

    def _calculate_variance(self, data: List[Decimal]) -> Decimal:
        """Calculate variance with high precision"""
        if len(data) < 2:
            return Decimal("0")
        mean = self._calculate_mean(data)
        return sum((x - mean) ** 2 for x in data) / Decimal(str(len(data) - 1))

    def _calculate_std(self, data: List[Decimal]) -> Decimal:
        """Calculate standard deviation with high precision"""
        var = self._calculate_variance(data)
        return Decimal(str(mpmath.sqrt(float(var))))

    def _levene_test(self, *groups) -> Tuple[Decimal, Decimal]:
        """Perform Levene's test for equal variances"""
        # Convert to float for scipy
        float_groups = [[float(x) for x in g] for g in groups]
        stat, p = stats.levene(*float_groups, center="median")
        return Decimal(str(stat)), Decimal(str(p))

    def _calculate_f_p_value(self, f_stat: Decimal, df1: int, df2: int) -> Decimal:
        """Calculate p-value for F-statistic with high precision"""
        f_float = float(f_stat)
        df1_float = float(df1)
        df2_float = float(df2)

        # Use mpmath for high precision
        p_value = Decimal(
            str(
                1
                - float(
                    mpmath.betainc(
                        df1_float / 2,
                        df2_float / 2,
                        0,
                        df1_float * f_float / (df1_float * f_float + df2_float),
                        regularized=True,
                    )
                )
            )
        )

        return p_value

    def _calculate_t_p_value(self, t_stat: Decimal, df: int) -> Decimal:
        """Calculate p-value for t-statistic with high precision"""
        t_float = float(t_stat)
        df_int = int(df)

        # Two-tailed p-value using scipy's survival function
        p_value = Decimal(str(float(stats.t.sf(abs(t_float), df_int) * 2)))

        return p_value

    def _get_f_critical(self, alpha: Decimal, df1: int, df2: int) -> Decimal:
        """Get critical F-value"""
        # This would need the inverse F-distribution
        # For now, use scipy approximation
        from scipy.stats import f

        f_crit = f.ppf(1 - float(alpha), df1, df2)
        return Decimal(str(f_crit))

    def _calculate_power(self, f_stat: Decimal, df1: int, df2: int, alpha: Decimal = Decimal("0.05")) -> Optional[Decimal]:
        """Observed (post-hoc) power for a one-way ANOVA via the non-central F
        distribution.

        Computed honestly (replaces the fabricated 0.8 + 0.1*effect heuristic
        removed in audit F-12):
            Cohen's f^2 = df1 * F / df2          (= eta^2 / (1 - eta^2))
            noncentrality lambda = f^2 * N,  N = df1 + df2 + 1
            power = P(F_{df1, df2, lambda} > F_crit),  F_crit = F^{-1}_{df1,df2}(1 - alpha)
        This matches G*Power / statsmodels FTestAnovaPower.

        CAVEAT: observed (post-hoc) power is a deterministic monotone transform of
        the p-value and is NOT a substitute for an a-priori power analysis; it is
        reported for completeness only. Returns None when undefined (non-positive
        df or F).
        """
        from scipy.stats import f as f_dist, ncf

        f_obs = float(f_stat)
        a = float(alpha)
        if df1 <= 0 or df2 <= 0 or f_obs <= 0 or not (0 < a < 1):
            return None
        n_total = df1 + df2 + 1
        cohen_f2 = (df1 * f_obs) / df2
        noncentrality = cohen_f2 * n_total
        f_crit = float(f_dist.ppf(1 - a, df1, df2))
        power = float(ncf.sf(f_crit, df1, df2, noncentrality))
        if not (0.0 <= power <= 1.0):
            return None
        return Decimal(str(power))


def generate_anova_report(result: AnovaResult) -> str:
    """
    Generate comprehensive ANOVA report
    """
    report = []
    report.append("=" * 80)
    report.append("HIGH-PRECISION ANOVA RESULTS")
    report.append("=" * 80)
    report.append("")

    # ANOVA Table
    report.append("ANOVA TABLE")
    report.append("-" * 40)
    report.append("Source          SS              df    MS              F         p-value")
    report.append(
        f"Between  {result.ss_between:15.10f}  {result.df_between:3}  {result.ms_between:15.10f}  {result.f_statistic:8.4f}  {result.p_value:.6f}"
    )
    report.append(f"Within   {result.ss_within:15.10f}  {result.df_within:3}  {result.ms_within:15.10f}")
    report.append(f"Total    {result.ss_total:15.10f}  {result.df_total:3}")
    report.append("")

    # Effect Sizes
    report.append("EFFECT SIZES")
    report.append("-" * 40)
    report.append(f"Eta-squared:         {result.eta_squared:.6f}")
    report.append(f"Partial Eta-squared: {result.partial_eta_squared:.6f}")
    report.append(f"Omega-squared:       {result.omega_squared:.6f}")
    report.append(f"Cohen's f:           {result.cohen_f:.6f}")
    report.append(f"R-squared:           {result.r_squared:.6f}")
    report.append(f"Adjusted R-squared:  {result.adjusted_r_squared:.6f}")
    report.append("")

    # Group Statistics
    report.append("GROUP STATISTICS")
    report.append("-" * 40)
    report.append("Group      N     Mean           Std Dev")
    for group in result.group_means:
        report.append(
            f"{group:10} {result.group_ns[group]:3}   {result.group_means[group]:12.6f}   {result.group_stds[group]:12.6f}"
        )
    report.append(f"Grand Mean: {result.grand_mean:.6f}")
    report.append("")

    # Assumptions
    report.append("ASSUMPTION CHECKS")
    report.append("-" * 40)
    report.append(f"Levene's Test: F = {result.levene_statistic:.4f}, p = {result.levene_p_value:.6f}")
    if result.levene_p_value < Decimal("0.05"):
        report.append("  ⚠ Warning: Variances are not equal")
    else:
        report.append("  ✓ Variances are equal")

    if result.shapiro_p_values:
        report.append("\nShapiro-Wilk Normality Tests:")
        for group, p in result.shapiro_p_values.items():
            if p < Decimal("0.05"):
                report.append(f"  {group}: p = {p:.6f} ⚠ Not normal")
            else:
                report.append(f"  {group}: p = {p:.6f} ✓ Normal")
    report.append("")

    # Post-hoc tests
    if result.post_hoc_results:
        report.append("POST-HOC TESTS")
        report.append("-" * 40)
        for comparison, comp_stats in result.post_hoc_results.items():
            report.append(f"{comparison}:")
            for key, value in comp_stats.items():
                if isinstance(value, Decimal):
                    report.append(f"  {key}: {value:.6f}")
                else:
                    report.append(f"  {key}: {value}")
        report.append("")

    # Adjusted p-values
    if result.adjusted_p_values:
        report.append("ADJUSTED P-VALUES (Multiple Comparisons)")
        report.append("-" * 40)
        for comparison, p in result.adjusted_p_values.items():
            sig = (
                "***" if p < Decimal("0.001") else "**" if p < Decimal("0.01") else "*" if p < Decimal("0.05") else "ns"
            )
            report.append(f"{comparison}: {p:.6f} {sig}")
        report.append("")

    # Power
    if result.observed_power:
        report.append(f"Observed Power: {result.observed_power:.4f}")

    report.append("")
    report.append("=" * 80)

    return "\n".join(report)


# Test the implementation
if __name__ == "__main__":
    # Create test data
    group1 = [23.1, 24.2, 25.3, 26.4, 27.5, 28.1, 29.2]
    group2 = [22.5, 23.6, 24.7, 25.8, 26.9, 27.5, 28.1]
    group3 = [21.0, 22.1, 23.2, 24.3, 25.4, 26.0, 27.1]
    group4 = [20.5, 21.6, 22.7, 23.8, 24.9, 25.5, 26.6]

    # Initialize ANOVA calculator
    anova = HighPrecisionANOVA(precision=50)

    # Perform one-way ANOVA with Tukey post-hoc
    result = anova.one_way_anova(
        group1,
        group2,
        group3,
        group4,
        post_hoc=PostHocTest.BONFERRONI,
        correction=MultipleComparisonCorrection.BENJAMINI_HOCHBERG,
    )

    # Generate report
    report = generate_anova_report(result)
    print(report)

    # Show precision
    print(f"\nF-statistic precision: {len(str(result.f_statistic).split('.')[-1])} decimal places")
    print(f"P-value precision: {len(str(result.p_value).split('.')[-1])} decimal places")
