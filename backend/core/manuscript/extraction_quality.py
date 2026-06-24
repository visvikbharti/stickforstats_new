"""
T06-COVERAGE (gate half) — per-claim UNVERIFIABLE_EXTRACTION gate.
===================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (§5 coverage; closes the false-negative trap)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T06-COVERAGE)

Two distinct extraction-quality signals (do NOT conflate them):

  * PAPER-LEVEL coverage  (claim_extractor.ExtractionSummary.coverage / .low_coverage):
      "of the reported p-value mentions, how many did we capture as claims?" A low value
      means we likely MISSED claims (false negatives) — it down-weights the paper-level
      confidence and warns the reader, but does NOT condemn the claims we *did* capture.

  * PER-CLAIM gate (this module): a single claim is itself too garbled to verify (no
      identifiable statistic AND no p-value, or completeness below threshold) -> the claim's
      verdict is UNVERIFIABLE_EXTRACTION, never a silent pass.

Pure module (verdicts + duck-typed claim; no scipy / Django).
"""

from __future__ import annotations

from typing import Any, Optional

from .verdicts import ClaimVerdict

#: minimum extraction COMPLETENESS (claim_extractor._score_confidence) for a claim to be
#: considered verifiable at all. Below this we cannot trust the parse enough to adjudicate.
MIN_CLAIM_COMPLETENESS = 0.4


def is_claim_extraction_reliable(claim: Any, min_completeness: float = MIN_CLAIM_COMPLETENESS) -> bool:
    """A claim is reliable enough to attempt verification iff it carries an identifiable
    result (a statistic or a p-value) AND its completeness is not below the floor."""
    has_substance = (
        getattr(claim, "statistic_value", None) is not None
        or getattr(claim, "p_value", None) is not None
    )
    if not has_substance:
        return False
    return (getattr(claim, "confidence", 0.0) or 0.0) >= min_completeness


def extraction_gate_verdict(claim: Any, min_completeness: float = MIN_CLAIM_COMPLETENESS) -> Optional[ClaimVerdict]:
    """UNVERIFIABLE_EXTRACTION verdict when a claim is too garbled to verify; else None."""
    if is_claim_extraction_reliable(claim, min_completeness):
        return None
    has_substance = (
        getattr(claim, "statistic_value", None) is not None
        or getattr(claim, "p_value", None) is not None
    )
    reason = (
        "no identifiable test statistic or p-value"
        if not has_substance
        else f"extraction completeness {getattr(claim, 'confidence', 0.0)} below floor {min_completeness}"
    )
    return ClaimVerdict.unverifiable_extraction(
        getattr(claim, "claim_id", ""),
        reason=reason,
        section=getattr(claim, "location", None),
        position=getattr(claim, "position", None),
    )
