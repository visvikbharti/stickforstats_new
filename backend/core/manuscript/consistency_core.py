"""Single source of truth for statcheck-style p-value consistency checking.

Both ``consistency_validator.ConsistencyValidator`` (the report's "Consistency"
summary + SQS) and ``advanced_validators.StatisticalConsistencyValidator`` (the
"Issues" findings) call into this module, so the two surfaces can never drift
apart again.

The logic recomputes the p-value from the reported test statistic and degrees
of freedom (scipy), then compares **rounding-aware**: the reported statistic
and p-value are each rounded to a finite precision, so their true values lie
within +/-0.5 of their last reported digit. We recompute the p-interval implied
by the rounded statistic and test whether it overlaps the reported-p interval
(the method statcheck uses). Inequalities ("p < .05") are judged by
*satisfaction*, not by treating the bound as an exact value.

References: Nuijten et al. (2016); Epskamp & Nuijten (2018), statcheck.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional

try:
    from scipy import stats as scipy_stats

    SCIPY_AVAILABLE = True
except ImportError:  # pragma: no cover
    scipy_stats = None
    SCIPY_AVAILABLE = False

# Accept both the extractor's names ("t_statistic") and short names ("t").
_TYPE_ALIASES = {
    "t": "t_statistic",
    "F": "f_statistic",
    "chi2": "chi_square",
    "z": "z_statistic",
    "r": "r_value",
}
RECOMPUTABLE_TYPES = {"t_statistic", "f_statistic", "chi_square", "z_statistic", "r_value"}


def normalize_type(claim_type: str) -> str:
    return _TYPE_ALIASES.get(claim_type, claim_type)


@dataclass
class ConsistencyVerdict:
    """Canonical verdict for one claim, mapped by each validator to its output."""

    checkable: bool
    computed_p: Optional[float]
    is_consistent: bool
    is_decision_consistent: bool
    discrepancy: Optional[float]
    severity: str  # 'none' | 'major' | 'gross_error' (consistent => 'none')
    reason: str


def decimals_from_token(token, is_p: bool) -> Optional[int]:
    """Decimal places implied by a reported numeric token.

    For a p-value (``is_p=True``) the extractor may have stripped a leading
    ".", so a token with no "." is a pure fraction (".049" captured as "049"
    -> 3). For a general statistic a token with no "." is an integer (0).
    Scientific notation -> ``None`` (treated as effectively exact).
    """
    if token is None:
        return None
    s = str(token).strip().replace("−", "-").lstrip("<>=").strip()
    if not s:
        return None
    if "e" in s or "E" in s:
        return None
    if "." in s:
        return len(s.split(".", 1)[1])
    return len(s) if is_p else 0


def _resolve_single_df(df) -> Optional[float]:
    if df is None:
        return None
    if isinstance(df, (int, float)):
        return float(df) if df != 0 else None
    if isinstance(df, (list, tuple)) and df:
        val = df[0]
        return float(val) if val != 0 else None
    return None


def _resolve_two_df(df):
    if isinstance(df, (list, tuple)) and len(df) >= 2:
        df1, df2 = float(df[0]), float(df[1])
        if df1 == 0 or df2 == 0:
            return None, None
        return df1, df2
    return None, None


def recompute_p(claim_type: str, statistic: float, df, sample_size: Optional[int] = None) -> Optional[float]:
    """Recompute the p-value from a reported statistic + df (scipy). None if not possible."""
    if not SCIPY_AVAILABLE or statistic is None:
        return None
    ct = normalize_type(claim_type)
    try:
        if ct == "t_statistic":
            d = _resolve_single_df(df)
            return None if d is None or d <= 0 else float(scipy_stats.t.sf(abs(statistic), d) * 2)
        if ct == "f_statistic":
            if statistic < 0:
                return None
            d1, d2 = _resolve_two_df(df)
            return None if d1 is None or d1 <= 0 or d2 <= 0 else float(scipy_stats.f.sf(statistic, d1, d2))
        if ct == "chi_square":
            if statistic < 0:
                return None
            d = _resolve_single_df(df)
            return None if d is None or d <= 0 else float(scipy_stats.chi2.sf(statistic, d))
        if ct == "z_statistic":
            return float(scipy_stats.norm.sf(abs(statistic)) * 2)
        if ct == "r_value":
            if abs(statistic) > 1:
                return None
            n = sample_size
            d = None
            if n is not None and n > 2:
                d = n - 2
            else:
                d = _resolve_single_df(df)
            if d is None or d <= 0:
                return None
            if abs(statistic) == 1.0:
                return 0.0
            denom = 1.0 - statistic * statistic
            if denom <= 0:
                return 0.0
            t_stat = statistic * math.sqrt(d / denom)
            return float(scipy_stats.t.sf(abs(t_stat), d) * 2)
    except (OverflowError, ValueError, ZeroDivisionError):
        return None
    return None


def _p_interval_from_statistic(claim_type, statistic, statistic_raw, df, sample_size, computed_p):
    """Interval of recomputed p-values consistent with the statistic's rounding."""
    stat_dec = decimals_from_token(statistic_raw, is_p=False)
    if stat_dec is None:
        stat_dec = decimals_from_token(repr(statistic), is_p=False)
    if stat_dec is None:
        return computed_p, computed_p
    half = 0.5 * (10.0 ** (-stat_dec))
    cands = [
        computed_p,
        recompute_p(claim_type, statistic - half, df, sample_size),
        recompute_p(claim_type, statistic + half, df, sample_size),
    ]
    cands = [c for c in cands if c is not None]
    return (min(cands), max(cands)) if cands else (computed_p, computed_p)


def classify(
    claim_type: str,
    statistic: Optional[float],
    statistic_raw,
    p_value: Optional[float],
    p_value_raw,
    p_comparison: str,
    df,
    sample_size: Optional[int] = None,
    alpha: float = 0.05,
    tolerance: float = 0.005,
) -> ConsistencyVerdict:
    """Robust, rounding- and inequality-aware consistency verdict for one claim."""

    def not_checkable(reason):
        return ConsistencyVerdict(False, None, False, False, None, "none", reason)

    if statistic is None:
        return not_checkable("test statistic not reported")
    if p_value is None:
        return not_checkable("p-value not reported")
    # An impossible p is an extraction artifact (e.g. a dropped "x 10^-n"),
    # not an author error -- do not flag it as the author's mistake.
    if p_value < 0 or p_value > 1:
        return not_checkable(f"reported p={p_value} outside (0,1]; likely an extraction artifact")
    if normalize_type(claim_type) not in RECOMPUTABLE_TYPES:
        return not_checkable(f"claim type '{claim_type}' not recomputable")

    computed_p = recompute_p(claim_type, statistic, df, sample_size)
    if computed_p is None:
        return not_checkable("insufficient information to recompute (e.g. missing df)")

    p_lo, p_hi = _p_interval_from_statistic(claim_type, statistic, statistic_raw, df, sample_size, computed_p)
    discrepancy = abs(computed_p - p_value)

    # Decision (significant vs not) for reported and recomputed.
    if p_comparison == "less_than":
        reported_sig = p_value <= alpha
    elif p_comparison == "greater_than":
        reported_sig = p_value < alpha
    else:
        reported_sig = p_value < alpha
    computed_sig = computed_p < alpha
    decision_consistent = reported_sig == computed_sig

    # --- Inequality: judged by satisfaction, not exact match ---
    if p_comparison in ("less_than", "greater_than"):
        if p_comparison == "less_than":
            consistent = p_lo <= p_value + tolerance
        else:
            consistent = p_hi >= p_value - tolerance
    else:
        # --- Exact: overlap of reported-p rounding interval with recomputed interval ---
        p_dec = decimals_from_token(p_value_raw, is_p=True)
        # Half-width of the reported p's rounding interval at its stated precision
        # (e.g. p=.002 -> +/-.0005). If precision is unknown, fall back to a small
        # symmetric window.
        p_half = 0.5 * (10.0 ** (-p_dec)) if p_dec is not None else tolerance
        rep_lo, rep_hi = p_value - p_half, p_value + p_half
        # Two intervals are consistent iff they overlap, using ONLY the rounding
        # intervals. The previous flat additive +/-tolerance (0.005) swamped tiny
        # p-intervals -- for small reported p (<= ~0.01) it made almost any
        # recomputed value "consistent", hiding genuine small-p reporting errors
        # (false negatives). The rounding intervals already absorb legitimate
        # rounding, so no extra additive slack is warranted. (audit 2026-06-04, F-06.)
        consistent = (p_hi >= rep_lo) and (p_lo <= rep_hi)

    if consistent:
        return ConsistencyVerdict(
            True, computed_p, True, decision_consistent, discrepancy, "none",
            f"consistent (recomputed p={computed_p:.4g})",
        )
    severity = "gross_error" if not decision_consistent else "major"
    return ConsistencyVerdict(
        True, computed_p, False, decision_consistent, discrepancy, severity,
        f"reported p {p_comparison} {p_value}, recomputed p={computed_p:.4g}",
    )


def supported_type_names() -> List[str]:
    return sorted(RECOMPUTABLE_TYPES)
