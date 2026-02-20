"""
Statistical Consistency Validator (STATCHECK-style)
====================================================
Recomputes p-values from reported test statistics and degrees of freedom
to detect inconsistencies in manuscripts. Part of the journal integration
manuscript review feature.

References:
    - Nuijten et al. (2016). "The prevalence of statistical reporting errors
      in psychology (1985-2013)." Behavior Research Methods, 48(4), 1205-1226.
    - Epskamp & Nuijten (2018). "statcheck: Extract Statistics from Articles
      and Recompute p-Values." R package version 1.3.0.

This module takes StatisticalClaim objects (extracted from manuscripts by
claim_extractor.py) and validates whether reported p-values are consistent
with the test statistics and degrees of freedom provided.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

try:
    from scipy import stats as scipy_stats
    SCIPY_AVAILABLE = True
except ImportError:
    scipy_stats = None
    SCIPY_AVAILABLE = False

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ConsistencyResult:
    """Result of checking a single statistical claim for p-value consistency."""

    claim_id: str
    claim_type: str
    reported_statistic: float
    reported_p: float
    reported_p_comparison: str          # 'equals', 'less_than', 'greater_than'
    computed_p: Optional[float]
    is_consistent: bool
    is_decision_consistent: bool
    discrepancy: Optional[float]
    severity: str                       # 'none', 'minor', 'major', 'gross_error'
    decision_at_05: str                 # 'significant' or 'non_significant'
    reported_decision_at_05: str        # 'significant' or 'non_significant'
    raw_text: str
    note: str


@dataclass
class ValidationSummary:
    """Aggregate summary of consistency checking across all claims."""

    total_checked: int
    consistent: int
    inconsistent: int
    decision_errors: int
    gross_errors: int
    could_not_check: int
    results: List[ConsistencyResult]
    overall_consistency_rate: float      # 0-1
    severity_counts: Dict[str, int]
    warnings: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Main validator
# ---------------------------------------------------------------------------

class ConsistencyValidator:
    """
    STATCHECK-style p-value consistency validator.

    Given a list of ``StatisticalClaim`` objects (produced by
    ``claim_extractor.ClaimExtractor``), this validator recomputes the
    expected p-value from the reported test statistic and degrees of freedom,
    then compares it to the reported p-value to detect discrepancies.

    Parameters
    ----------
    alpha : float
        Significance threshold used for decision-consistency checks
        (default 0.05).
    tolerance : float
        Maximum absolute difference between reported and computed p-values
        that is still considered consistent (default 0.005, following the
        convention in Nuijten et al., 2016).
    """

    # Claim types that this validator can recompute
    SUPPORTED_TYPES = {'t', 'F', 'chi2', 'z', 'r'}

    # Map extractor-style type names to validator-style type names
    _CLAIM_TYPE_MAP = {
        't_statistic': 't',
        'f_statistic': 'F',
        'chi_square': 'chi2',
        'z_statistic': 'z',
        'r_value': 'r',
    }

    def __init__(self, alpha: float = 0.05, tolerance: float = 0.005) -> None:
        self.alpha = alpha
        self.tolerance = tolerance

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(self, claims: list) -> ValidationSummary:
        """
        Validate a list of StatisticalClaim objects for p-value consistency.

        Parameters
        ----------
        claims : List[StatisticalClaim]
            Claims extracted from a manuscript by ``ClaimExtractor``.

        Returns
        -------
        ValidationSummary
            Aggregate results including per-claim details.
        """
        warnings_list: List[str] = []

        if not SCIPY_AVAILABLE:
            logger.warning(
                "scipy is not available; cannot recompute p-values."
            )
            warnings_list.append(
                "scipy is not installed. All claims marked as could_not_check."
            )
            results = [
                self._skip_result(
                    claim,
                    note="Cannot recompute: scipy is not available",
                )
                for claim in claims
            ]
            return self._build_summary(results, warnings_list)

        results: List[ConsistencyResult] = []
        for claim in claims:
            result = self.validate_claim(claim)
            results.append(result)

        return self._build_summary(results, warnings_list)

    def validate_claim(self, claim) -> ConsistencyResult:
        """
        Validate a single StatisticalClaim for p-value consistency.

        Parameters
        ----------
        claim : StatisticalClaim
            A single claim with at minimum ``claim_id``, ``claim_type``,
            ``statistic``, ``p_value``, ``p_comparison``, ``df``, and
            ``raw_text`` attributes.

        Returns
        -------
        ConsistencyResult
        """
        claim_id: str = getattr(claim, 'claim_id', str(id(claim)))
        claim_type: str = getattr(claim, 'claim_type', '')
        # Normalize extractor-style type names to validator-style
        claim_type = self._CLAIM_TYPE_MAP.get(claim_type, claim_type)
        raw_text: str = getattr(claim, 'raw_text', '')
        reported_stat: Optional[float] = (
            getattr(claim, 'statistic', None)
            or getattr(claim, 'statistic_value', None)
        )
        reported_p: Optional[float] = getattr(claim, 'p_value', None)
        p_comparison: str = getattr(claim, 'p_comparison', 'equals')
        df = getattr(claim, 'df', None)
        n: Optional[int] = getattr(claim, 'n', None)

        # ----- Pre-flight checks -----

        # Missing test statistic
        if reported_stat is None:
            return self._skip_result(
                claim,
                note="Cannot recompute: test statistic not reported",
            )

        # Missing reported p-value
        if reported_p is None:
            return self._skip_result(
                claim,
                note="Cannot recompute: p-value not reported",
            )

        # Reported p-value out of range
        if reported_p < 0 or reported_p > 1:
            return ConsistencyResult(
                claim_id=claim_id,
                claim_type=claim_type,
                reported_statistic=reported_stat,
                reported_p=reported_p,
                reported_p_comparison=p_comparison,
                computed_p=None,
                is_consistent=False,
                is_decision_consistent=False,
                discrepancy=None,
                severity='gross_error',
                decision_at_05='non_significant',
                reported_decision_at_05='non_significant',
                raw_text=raw_text,
                note=f"Reported p-value ({reported_p}) is outside [0, 1]",
            )

        # Unsupported claim type
        if claim_type not in self.SUPPORTED_TYPES:
            return self._skip_result(
                claim,
                note=(
                    f"Unsupported claim type '{claim_type}'; "
                    f"supported: {', '.join(sorted(self.SUPPORTED_TYPES))}"
                ),
            )

        # ----- Recompute p-value -----
        computed_p: Optional[float] = None
        note_parts: List[str] = []

        try:
            computed_p = self._recompute(
                claim_type, reported_stat, df, n, note_parts
            )
        except Exception as exc:
            logger.error(
                "Error recomputing p-value for claim %s: %s",
                claim_id, exc,
            )
            return self._skip_result(
                claim,
                note=f"Recomputation error: {exc}",
            )

        if computed_p is None:
            # _recompute appended explanation to note_parts
            return self._skip_result(
                claim,
                note="; ".join(note_parts) if note_parts
                else "Cannot recompute: insufficient information",
            )

        # ----- Compare p-values -----
        is_consistent, discrepancy, severity = self._compare_p_values(
            reported_p, p_comparison, computed_p
        )

        # Decision consistency
        reported_decision = (
            'significant' if reported_p < self.alpha else 'non_significant'
        )
        # For inequality comparisons, infer decision from the bound
        if p_comparison == 'less_than':
            reported_decision = (
                'significant' if reported_p <= self.alpha
                else 'non_significant'
            )
        elif p_comparison == 'greater_than':
            reported_decision = (
                'non_significant' if reported_p >= self.alpha
                else 'significant'
            )

        computed_decision = (
            'significant' if computed_p < self.alpha else 'non_significant'
        )

        is_decision_consistent = (reported_decision == computed_decision)

        # Possibly escalate severity if decision changed
        if not is_decision_consistent:
            severity = self._determine_severity(
                discrepancy, decision_changed=True
            )

        # Build human-readable note
        if is_consistent:
            note_parts.append(
                f"Consistent (computed p = {computed_p:.6f})"
            )
        else:
            note_parts.append(
                f"Inconsistent: reported p {p_comparison} {reported_p}, "
                f"computed p = {computed_p:.6f}, "
                f"discrepancy = {discrepancy:.6f}"
            )
            if not is_decision_consistent:
                note_parts.append(
                    f"DECISION ERROR: reported {reported_decision}, "
                    f"computed {computed_decision} at alpha={self.alpha}"
                )

        return ConsistencyResult(
            claim_id=claim_id,
            claim_type=claim_type,
            reported_statistic=reported_stat,
            reported_p=reported_p,
            reported_p_comparison=p_comparison,
            computed_p=computed_p,
            is_consistent=is_consistent,
            is_decision_consistent=is_decision_consistent,
            discrepancy=discrepancy,
            severity=severity,
            decision_at_05=computed_decision,
            reported_decision_at_05=reported_decision,
            raw_text=raw_text,
            note="; ".join(note_parts),
        )

    # ------------------------------------------------------------------
    # Recomputation dispatch
    # ------------------------------------------------------------------

    def _recompute(
        self,
        claim_type: str,
        statistic: float,
        df,
        n: Optional[int],
        notes: List[str],
    ) -> Optional[float]:
        """Dispatch to the appropriate recomputation method."""

        if claim_type == 't':
            return self._recompute_t_test(statistic, df, notes)
        elif claim_type == 'F':
            return self._recompute_f_test(statistic, df, notes)
        elif claim_type == 'chi2':
            return self._recompute_chi_square(statistic, df, notes)
        elif claim_type == 'z':
            return self._recompute_z_test(statistic, notes)
        elif claim_type == 'r':
            return self._recompute_correlation(statistic, n, df, notes)
        return None

    # ------------------------------------------------------------------
    # Recomputation methods
    # ------------------------------------------------------------------

    def _recompute_t_test(
        self,
        statistic: float,
        df,
        notes: List[str],
    ) -> Optional[float]:
        """
        Recompute two-tailed p-value for a t-test.

        p = 2 * P(T > |t|)  where T ~ t(df)
        """
        resolved_df = self._resolve_single_df(df, notes)
        if resolved_df is None:
            return None
        if resolved_df <= 0:
            notes.append(
                f"Cannot recompute: degrees of freedom ({resolved_df}) must "
                f"be positive"
            )
            return None

        try:
            p = scipy_stats.t.sf(abs(statistic), resolved_df) * 2
            return float(p)
        except (OverflowError, ValueError) as exc:
            notes.append(f"Numerical error in t recomputation: {exc}")
            return None

    def _recompute_f_test(
        self,
        statistic: float,
        df,
        notes: List[str],
    ) -> Optional[float]:
        """
        Recompute p-value for an F-test (one-tailed upper).

        p = P(F > f)  where F ~ F(df1, df2)
        """
        if statistic < 0:
            notes.append(
                f"F statistic ({statistic}) is negative; "
                f"F statistics must be non-negative"
            )
            return None

        df1, df2 = self._resolve_two_df(df, notes)
        if df1 is None or df2 is None:
            return None
        if df1 <= 0 or df2 <= 0:
            notes.append(
                f"Cannot recompute: degrees of freedom ({df1}, {df2}) must "
                f"both be positive"
            )
            return None

        try:
            p = scipy_stats.f.sf(statistic, df1, df2)
            return float(p)
        except (OverflowError, ValueError) as exc:
            notes.append(f"Numerical error in F recomputation: {exc}")
            return None

    def _recompute_chi_square(
        self,
        statistic: float,
        df,
        notes: List[str],
    ) -> Optional[float]:
        """
        Recompute p-value for a chi-square test.

        p = P(X2 > chi2)  where X2 ~ chi2(df)
        """
        if statistic < 0:
            notes.append(
                f"Chi-square statistic ({statistic}) is negative; "
                f"chi-square statistics must be non-negative"
            )
            return None

        resolved_df = self._resolve_single_df(df, notes)
        if resolved_df is None:
            return None
        if resolved_df <= 0:
            notes.append(
                f"Cannot recompute: degrees of freedom ({resolved_df}) must "
                f"be positive"
            )
            return None

        try:
            p = scipy_stats.chi2.sf(statistic, resolved_df)
            return float(p)
        except (OverflowError, ValueError) as exc:
            notes.append(f"Numerical error in chi-square recomputation: {exc}")
            return None

    def _recompute_z_test(
        self,
        statistic: float,
        notes: List[str],
    ) -> Optional[float]:
        """
        Recompute two-tailed p-value for a z-test.

        p = 2 * P(Z > |z|)  where Z ~ N(0, 1)
        """
        try:
            p = scipy_stats.norm.sf(abs(statistic)) * 2
            return float(p)
        except (OverflowError, ValueError) as exc:
            notes.append(f"Numerical error in z recomputation: {exc}")
            return None

    def _recompute_correlation(
        self,
        r: float,
        n: Optional[int],
        df,
        notes: List[str],
    ) -> Optional[float]:
        """
        Recompute two-tailed p-value for a Pearson correlation.

        Convert r to t: t = r * sqrt((n-2) / (1-r^2))
        Then use t-distribution with df = n - 2.
        """
        if abs(r) > 1:
            notes.append(
                f"Correlation r ({r}) is outside [-1, 1]; cannot recompute"
            )
            return None

        # Determine effective df (prefer explicit n, fall back to df)
        effective_df: Optional[float] = None
        if n is not None and n > 2:
            effective_df = n - 2
        else:
            effective_df = self._resolve_single_df(df, [])
            if effective_df is None and n is not None:
                notes.append(
                    f"Cannot recompute: sample size n ({n}) must be > 2 "
                    f"for correlation"
                )
                return None
            elif effective_df is None:
                notes.append(
                    "Cannot recompute: neither n nor df reported for "
                    "correlation"
                )
                return None

        if effective_df <= 0:
            notes.append(
                f"Cannot recompute: effective df ({effective_df}) must be "
                f"positive"
            )
            return None

        # Handle perfect correlations
        if abs(r) == 1.0:
            return 0.0

        # Convert r to t
        try:
            denominator = 1.0 - r * r
            if denominator <= 0:
                # Floating point edge case for |r| very close to 1
                return 0.0
            t_stat = r * math.sqrt(effective_df / denominator)
            p = scipy_stats.t.sf(abs(t_stat), effective_df) * 2
            return float(p)
        except (OverflowError, ValueError, ZeroDivisionError) as exc:
            notes.append(f"Numerical error in correlation recomputation: {exc}")
            return None

    # ------------------------------------------------------------------
    # P-value comparison logic
    # ------------------------------------------------------------------

    def _compare_p_values(
        self,
        reported_p: float,
        reported_comparison: str,
        computed_p: float,
    ) -> Tuple[bool, float, str]:
        """
        Compare a reported p-value to its computed counterpart.

        Parameters
        ----------
        reported_p : float
            The p-value reported in the manuscript.
        reported_comparison : str
            One of 'equals', 'less_than', 'greater_than'.
        computed_p : float
            The recomputed p-value.

        Returns
        -------
        tuple of (is_consistent, discrepancy, severity)
        """
        if reported_comparison == 'less_than':
            # "p < X" means the reported p is an upper bound.
            # Consistent if computed_p < reported_p (the bound).
            is_consistent = computed_p < reported_p
            discrepancy = max(0.0, computed_p - reported_p)
            severity = self._determine_severity(
                discrepancy,
                decision_changed=not self._same_decision(reported_p, computed_p,
                                                          reported_comparison),
            )
            return is_consistent, discrepancy, severity

        elif reported_comparison == 'greater_than':
            # "p > X" means the reported p is a lower bound.
            # Consistent if computed_p > reported_p (the bound).
            is_consistent = computed_p > reported_p
            discrepancy = max(0.0, reported_p - computed_p)
            severity = self._determine_severity(
                discrepancy,
                decision_changed=not self._same_decision(reported_p, computed_p,
                                                          reported_comparison),
            )
            return is_consistent, discrepancy, severity

        else:
            # 'equals' — exact comparison with tolerance
            discrepancy = abs(reported_p - computed_p)
            is_consistent = discrepancy < self.tolerance
            decision_changed = not self._same_decision(
                reported_p, computed_p, reported_comparison
            )
            severity = self._determine_severity(discrepancy, decision_changed)
            return is_consistent, discrepancy, severity

    def _same_decision(
        self,
        reported_p: float,
        computed_p: float,
        comparison: str,
    ) -> bool:
        """Check whether reported and computed p lead to the same decision."""
        if comparison == 'less_than':
            rep_sig = reported_p <= self.alpha
        elif comparison == 'greater_than':
            rep_sig = reported_p < self.alpha  # conservative
        else:
            rep_sig = reported_p < self.alpha

        comp_sig = computed_p < self.alpha
        return rep_sig == comp_sig

    def _determine_severity(
        self,
        discrepancy: float,
        decision_changed: bool,
    ) -> str:
        """
        Classify discrepancy severity.

        Severity levels:
            - 'none':        discrepancy < 0.005
            - 'minor':       0.005 <= discrepancy < 0.02
            - 'major':       0.02 <= discrepancy < 0.05, OR decision changes
            - 'gross_error': discrepancy >= 0.05 AND decision changes
        """
        if discrepancy >= 0.05 and decision_changed:
            return 'gross_error'
        if decision_changed or 0.02 <= discrepancy < 0.05:
            return 'major'
        if 0.005 <= discrepancy < 0.02:
            return 'minor'
        return 'none'

    def _p_from_comparison(
        self,
        p_value: float,
        comparison: str,
    ) -> float:
        """
        Return a numeric p-value from a potentially inequality-based report.

        For "p < .001", the reported p is used as the upper bound (0.001).
        For "p > .05", the reported p is used as the lower bound (0.05).
        For "p = .03", the value is taken as-is (0.03).
        """
        # In all cases, the numeric value from the claim is already extracted
        # by claim_extractor, so we simply return it. The comparison operator
        # determines how _compare_p_values interprets it.
        return p_value

    # ------------------------------------------------------------------
    # Degree-of-freedom helpers
    # ------------------------------------------------------------------

    def _resolve_single_df(
        self,
        df,
        notes: List[str],
    ) -> Optional[float]:
        """
        Extract a single df value from various representations.

        ``df`` may be an int, float, a tuple/list with one element, or a
        tuple/list with two elements (in which case we take the first for
        single-df tests, or return None with an explanatory note).
        """
        if df is None:
            notes.append(
                "Cannot recompute: degrees of freedom not reported"
            )
            return None

        if isinstance(df, (int, float)):
            if df == 0:
                notes.append(
                    "Cannot recompute: degrees of freedom is zero"
                )
                return None
            return float(df)

        if isinstance(df, (list, tuple)):
            if len(df) == 1:
                val = df[0]
                if val == 0:
                    notes.append(
                        "Cannot recompute: degrees of freedom is zero"
                    )
                    return None
                return float(val)
            if len(df) >= 2:
                # For tests needing a single df, use the first element.
                # This handles the common case where df is reported as (df,)
                # but stored as a list.
                val = df[0]
                if val == 0:
                    notes.append(
                        "Cannot recompute: degrees of freedom is zero"
                    )
                    return None
                return float(val)
            # Empty sequence
            notes.append(
                "Cannot recompute: degrees of freedom not reported"
            )
            return None

        notes.append(
            f"Cannot recompute: unrecognized df format ({type(df).__name__})"
        )
        return None

    def _resolve_two_df(
        self,
        df,
        notes: List[str],
    ) -> Tuple[Optional[float], Optional[float]]:
        """
        Extract two df values (df1, df2) for F-tests.

        ``df`` should be a tuple/list of length 2, e.g. (3, 56).
        """
        if df is None:
            notes.append(
                "Cannot recompute: degrees of freedom not reported"
            )
            return None, None

        if isinstance(df, (list, tuple)) and len(df) >= 2:
            df1, df2 = float(df[0]), float(df[1])
            if df1 == 0 or df2 == 0:
                notes.append(
                    "Cannot recompute: degrees of freedom contains zero"
                )
                return None, None
            return df1, df2

        notes.append(
            "Cannot recompute F-test: need two df values (df1, df2), "
            f"got {df!r}"
        )
        return None, None

    # ------------------------------------------------------------------
    # Summary builder
    # ------------------------------------------------------------------

    def _build_summary(
        self,
        results: List[ConsistencyResult],
        warnings_list: List[str],
    ) -> ValidationSummary:
        """Aggregate individual results into a ValidationSummary."""

        total = len(results)
        could_not_check = sum(
            1 for r in results if r.computed_p is None
        )
        checked = total - could_not_check
        consistent = sum(
            1 for r in results if r.computed_p is not None and r.is_consistent
        )
        inconsistent = checked - consistent
        decision_errors = sum(
            1 for r in results
            if r.computed_p is not None and not r.is_decision_consistent
        )
        gross_errors = sum(
            1 for r in results if r.severity == 'gross_error'
        )

        severity_counts: Dict[str, int] = {
            'none': 0,
            'minor': 0,
            'major': 0,
            'gross_error': 0,
        }
        for r in results:
            if r.severity in severity_counts:
                severity_counts[r.severity] += 1

        consistency_rate = consistent / checked if checked > 0 else 0.0

        return ValidationSummary(
            total_checked=total,
            consistent=consistent,
            inconsistent=inconsistent,
            decision_errors=decision_errors,
            gross_errors=gross_errors,
            could_not_check=could_not_check,
            results=results,
            overall_consistency_rate=consistency_rate,
            severity_counts=severity_counts,
            warnings=warnings_list,
        )

    # ------------------------------------------------------------------
    # Skip-result helper
    # ------------------------------------------------------------------

    def _skip_result(self, claim, *, note: str) -> ConsistencyResult:
        """
        Build a ConsistencyResult for a claim that cannot be checked.

        All comparison fields are set to safe defaults.
        """
        claim_id = getattr(claim, 'claim_id', str(id(claim)))
        claim_type = getattr(claim, 'claim_type', '')
        claim_type = self._CLAIM_TYPE_MAP.get(claim_type, claim_type)
        reported_stat = (
            getattr(claim, 'statistic', None)
            or getattr(claim, 'statistic_value', None)
            or 0.0
        )
        reported_p = getattr(claim, 'p_value', 0.0) or 0.0
        p_comparison = getattr(claim, 'p_comparison', 'equals')
        raw_text = getattr(claim, 'raw_text', '')

        return ConsistencyResult(
            claim_id=claim_id,
            claim_type=claim_type,
            reported_statistic=float(reported_stat),
            reported_p=float(reported_p),
            reported_p_comparison=p_comparison,
            computed_p=None,
            is_consistent=False,
            is_decision_consistent=False,
            discrepancy=None,
            severity='none',
            decision_at_05='non_significant',
            reported_decision_at_05='non_significant',
            raw_text=raw_text,
            note=note,
        )
