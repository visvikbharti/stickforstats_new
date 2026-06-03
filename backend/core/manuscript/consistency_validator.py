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

This validator produces the aggregate ``ValidationSummary`` shown in the
report's "Consistency" tab. The actual recompute + rounding/inequality-aware
classification lives in :mod:`core.manuscript.consistency_core`, which is the
single source of truth shared with the "Issues" findings validator
(``advanced_validators.StatisticalConsistencyValidator``) so the two surfaces
can never disagree.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from . import consistency_core

SCIPY_AVAILABLE = consistency_core.SCIPY_AVAILABLE

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
    reported_p_comparison: str  # 'equals', 'less_than', 'greater_than'
    computed_p: Optional[float]
    is_consistent: bool
    is_decision_consistent: bool
    discrepancy: Optional[float]
    severity: str  # 'none', 'minor', 'major', 'gross_error'
    decision_at_05: str  # 'significant' or 'non_significant'
    reported_decision_at_05: str  # 'significant' or 'non_significant'
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
    overall_consistency_rate: float  # 0-1
    severity_counts: Dict[str, int]
    warnings: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Main validator
# ---------------------------------------------------------------------------


class ConsistencyValidator:
    """STATCHECK-style p-value consistency validator (aggregate summary).

    Recomputes the expected p-value from the reported statistic + df via the
    shared :mod:`consistency_core`, which is rounding- and inequality-aware
    (the method statcheck uses), then aggregates per-claim verdicts into a
    :class:`ValidationSummary`.

    Parameters
    ----------
    alpha : float
        Significance threshold for decision-consistency checks (default 0.05).
    tolerance : float
        Numerical tolerance used by the core when comparing p-values
        (default 0.005, following Nuijten et al., 2016).
    """

    # Claim types the core can recompute (extractor-style names).
    SUPPORTED_TYPES = set(consistency_core.RECOMPUTABLE_TYPES)

    def __init__(self, alpha: float = 0.05, tolerance: float = 0.005) -> None:
        self.alpha = alpha
        self.tolerance = tolerance

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(self, claims: list) -> ValidationSummary:
        """Validate a list of StatisticalClaim objects for p-value consistency."""
        warnings_list: List[str] = []

        if not SCIPY_AVAILABLE:
            logger.warning("scipy is not available; cannot recompute p-values.")
            warnings_list.append("scipy is not installed. All claims marked as could_not_check.")
            results = [self._skip_result(claim, note="Cannot recompute: scipy is not available") for claim in claims]
            return self._build_summary(results, warnings_list)

        results = [self.validate_claim(claim) for claim in claims]
        return self._build_summary(results, warnings_list)

    def validate_claim(self, claim) -> ConsistencyResult:
        """Validate a single StatisticalClaim via the shared consistency core."""
        claim_id = getattr(claim, "claim_id", str(id(claim)))
        claim_type_raw = getattr(claim, "claim_type", "")
        raw_text = getattr(claim, "raw_text", "")
        reported_stat = getattr(claim, "statistic", None)
        if reported_stat is None:
            reported_stat = getattr(claim, "statistic_value", None)
        reported_p = getattr(claim, "p_value", None)
        p_comparison = getattr(claim, "p_comparison", "equals")
        df = getattr(claim, "df", None)
        n = getattr(claim, "n", None)
        if n is None:
            n = getattr(claim, "sample_size", None)
        stat_raw = getattr(claim, "statistic_raw", None)
        p_raw = getattr(claim, "p_value_raw", None)

        verdict = consistency_core.classify(
            claim_type_raw,
            reported_stat,
            stat_raw,
            reported_p,
            p_raw,
            p_comparison,
            df,
            n,
            alpha=self.alpha,
            tolerance=self.tolerance,
        )

        if not verdict.checkable:
            return self._skip_result(claim, note=verdict.reason)

        if p_comparison == "less_than":
            rep_sig = reported_p <= self.alpha
        elif p_comparison == "greater_than":
            rep_sig = reported_p < self.alpha
        else:
            rep_sig = reported_p < self.alpha
        reported_decision = "significant" if rep_sig else "non_significant"
        computed_decision = "significant" if verdict.computed_p < self.alpha else "non_significant"

        return ConsistencyResult(
            claim_id=claim_id,
            claim_type=consistency_core.normalize_type(claim_type_raw),
            reported_statistic=float(reported_stat),
            reported_p=float(reported_p),
            reported_p_comparison=p_comparison,
            computed_p=verdict.computed_p,
            is_consistent=verdict.is_consistent,
            is_decision_consistent=verdict.is_decision_consistent,
            discrepancy=verdict.discrepancy,
            severity=verdict.severity,
            decision_at_05=computed_decision,
            reported_decision_at_05=reported_decision,
            raw_text=raw_text,
            note=verdict.reason,
        )

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
        could_not_check = sum(1 for r in results if r.computed_p is None)
        checked = total - could_not_check
        consistent = sum(1 for r in results if r.computed_p is not None and r.is_consistent)
        inconsistent = checked - consistent
        decision_errors = sum(1 for r in results if r.computed_p is not None and not r.is_decision_consistent)
        gross_errors = sum(1 for r in results if r.severity == "gross_error")

        severity_counts: Dict[str, int] = {"none": 0, "minor": 0, "major": 0, "gross_error": 0}
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
        """Build a ConsistencyResult for a claim that cannot be checked."""
        claim_id = getattr(claim, "claim_id", str(id(claim)))
        claim_type = consistency_core.normalize_type(getattr(claim, "claim_type", ""))
        reported_stat = getattr(claim, "statistic", None) or getattr(claim, "statistic_value", None) or 0.0
        reported_p = getattr(claim, "p_value", 0.0) or 0.0
        p_comparison = getattr(claim, "p_comparison", "equals")
        raw_text = getattr(claim, "raw_text", "")

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
            severity="none",
            decision_at_05="non_significant",
            reported_decision_at_05="non_significant",
            raw_text=raw_text,
            note=note,
        )
