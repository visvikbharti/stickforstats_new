"""
T04-CONSADAPT — adapt the pure statcheck core into the secondary
INCONSISTENT_REPORTING verdict (the no-raw-data fallback signal).
=====================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (§2; "reused as the no-raw-data fallback")
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T04-CONSADAPT; depends on T02-SPINE)

Internal-consistency checking is NOT the product headline (lab/PI steer); it is the
complementary, always-available signal used when raw data are unavailable. This module
wraps the already-pure, already-tested ``consistency_core.classify`` (the single source of
truth, shared with the Consistency tab and advanced_validators) and maps its verdict onto
the new per-claim taxonomy:

  * inconsistent  -> ClaimVerdict(INCONSISTENT_REPORTING)  (sub-severity major | gross_error)
  * consistent    -> no verdict (an internally-consistent note; nothing to flag)
  * not checkable -> no verdict; ``checkable=False`` is surfaced so the coverage layer (T08)
                     can route ``could_not_check`` distinctly from INSUFFICIENT_DATA.

``consistency_core`` imports scipy, so this adapter lives outside the pure ``verdicts.py``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from . import consistency_core
from .verdicts import ClaimVerdict, Verdict


@dataclass
class ConsistencySignal:
    """The statcheck signal for one claim, decoupled from how it is consumed.

    ``checkable`` lets the coverage/scoring layer (T08) count claims whose p could not
    be recomputed *separately* from genuinely-data-absent ones; ``as_verdict`` emits a
    verdict ONLY for an actual inconsistency.
    """

    claim_id: str
    checkable: bool
    is_consistent: Optional[bool]      # None when not checkable
    severity: str                      # 'none' | 'major' | 'gross_error'
    computed_p: Optional[float]
    reported_p: Optional[float]
    p_comparison: str
    discrepancy: Optional[float]
    reason: str
    section: Optional[str] = None
    position: Optional[int] = None

    def as_verdict(self) -> Optional[ClaimVerdict]:
        """A ClaimVerdict only when the claim is internally INCONSISTENT; else None."""
        if not self.checkable or self.is_consistent is not False:
            return None
        return ClaimVerdict(
            claim_id=self.claim_id,
            verdict=Verdict.INCONSISTENT_REPORTING,
            claimed_p_value=self.reported_p,
            recomputed_p_value=self.computed_p,
            p_match=False,
            deltas={"discrepancy": self.discrepancy, "statcheck_severity": self.severity},
            data_available=False,           # secondary signal: needs no raw data
            section=self.section,
            position=self.position,
            notes=[self.reason, f"statcheck severity: {self.severity}"],
        )


def evaluate_consistency(claim: Any, alpha: float = 0.05, tolerance: float = 0.005) -> ConsistencySignal:
    """Run consistency_core.classify on one StatisticalClaim -> ConsistencySignal.

    ``claim`` is duck-typed (the StatisticalClaim fields used by advanced_validators
    ._check_claim: claim_type, statistic_value, statistic_raw, p_value, p_value_raw,
    p_comparison, df, sample_size, location, position).
    """
    v = consistency_core.classify(
        getattr(claim, "claim_type", ""),
        getattr(claim, "statistic_value", None),
        getattr(claim, "statistic_raw", None),
        getattr(claim, "p_value", None),
        getattr(claim, "p_value_raw", None),
        getattr(claim, "p_comparison", "equals"),
        getattr(claim, "df", None),
        getattr(claim, "sample_size", None),
        alpha=alpha,
        tolerance=tolerance,
    )
    return ConsistencySignal(
        claim_id=getattr(claim, "claim_id", ""),
        checkable=v.checkable,
        is_consistent=(v.is_consistent if v.checkable else None),
        severity=v.severity,
        computed_p=v.computed_p,
        reported_p=getattr(claim, "p_value", None),
        p_comparison=getattr(claim, "p_comparison", "equals"),
        discrepancy=v.discrepancy,
        reason=v.reason,
        section=getattr(claim, "location", None),
        position=getattr(claim, "position", None),
    )


def inconsistency_verdict(claim: Any, alpha: float = 0.05) -> Optional[ClaimVerdict]:
    """Convenience: the INCONSISTENT_REPORTING verdict for a claim, or None."""
    return evaluate_consistency(claim, alpha=alpha).as_verdict()
