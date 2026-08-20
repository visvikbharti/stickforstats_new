"""
T13-ENGINE — verify one claim by re-running the authors' test on linked raw data.
==================================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (A4 the headline capability)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T13-ENGINE; +T14 gate; deps T02,T12)

Turns the T05 proof into the real adapter using the T02 contract. Given a
ClaimVerificationRequest (claim + resolved ClaimDataSpec from A3 linking), it:
  1. gates unreliable extractions  -> UNVERIFIABLE_EXTRACTION
  2. resolves the cascade test (T12); no executor / no data -> INSUFFICIENT_DATA
  3. re-runs the AUTHORS' test via execute_with_cascade(max_cascades=0)  (no substitution)
  4. reads the Guardian assumption report SEPARATELY, with the T14 independence-gate
     (the lag-1 autocorr check false-flags cross-sectional / row-shuffled data, so its
     'independence' violations are ignored unless the data are marked sequential)
  5. compares recomputed vs claimed (T15, rounding-aware) and assigns the §2 verdict (T19)

cascade_engine is imported lazily so the pure decision/resolver paths unit-test without scipy.
"""

from __future__ import annotations

from .extraction_quality import is_claim_extraction_reliable
from .assumption_reporting import (
    describe_assumptions,
    describe_test,
    detect_assumption_reporting,
)
from .test_resolver import resolve_test
from .verdict_decision import assign_verdict, statistic_matches
from .verdicts import ClaimVerdict, ClaimVerificationRequest, Verdict

# statistics whose sign depends on an arbitrary group ordering -> compare magnitude
_SYMMETRIC_TESTS = frozenset({"independent_t", "welch_t", "paired_t", "one_sample_t",
                              "mann_whitney_u", "wilcoxon_signed_rank"})

_ENGINE = None


def _engine():
    global _ENGINE
    if _ENGINE is None:
        from core.services.cascade_engine import AutonomousCascadeEngine  # lazy (scipy)
        _ENGINE = AutonomousCascadeEngine()
    return _ENGINE


def _critical_after_independence_gate(guardian_report, rows_sequential: bool):
    """Critical assumption violations, dropping spurious 'independence' (lag-1 autocorr) on
    non-sequential data (T14). Returns the filtered list of violation dicts."""
    viols = (guardian_report or {}).get("violations", [])
    crit = [v for v in viols if v.get("severity") == "critical"]
    if not rows_sequential:
        crit = [v for v in crit if "independ" not in (v.get("assumption", "").lower())]
    return crit


def verify_claim(request: ClaimVerificationRequest) -> ClaimVerdict:
    claim = request.claim
    cid = getattr(claim, "claim_id", "")
    spec = request.data_spec
    prov = {
        "section": getattr(claim, "location", None),
        "position": getattr(claim, "position", None),
        # cross-reference provenance (Phase 0/1/3): home file + the references the claim cites and
        # which one directed the link. Prefer the artifact-resolved reference (set on the claim);
        # fall back to the reference the data linker used to SELECT the file (set on the spec).
        "source_file": getattr(claim, "source_file", None),
        "cited_references": list(getattr(claim, "cited_references", []) or []),
        "resolved_reference": (getattr(claim, "resolved_reference", "")
                               or (getattr(spec, "resolved_reference", None) if spec else None)
                               or None),
        "resolution_confidence": getattr(claim, "resolution_confidence", None),
        "extraction_method": getattr(claim, "extraction_method", "text") or "text",
    }
    base = {
        "claim_id": cid,
        "claimed_statistic": getattr(claim, "statistic_value", None),
        "claimed_p_value": getattr(claim, "p_value", None),
        "claimed_effect_size": getattr(claim, "effect_size_value", None),
        "data_available": request.data_available(),
        "linked_dataset_id": spec.linked_dataset_id if spec else None,
        "link_method": getattr(spec, "link_method", None) if spec else None,
        **prov,
    }

    # 1. extraction reliability gate
    if not is_claim_extraction_reliable(claim):
        return ClaimVerdict.unverifiable_extraction(cid, "claim not reliably extracted", **prov)

    # 2. resolve test + data availability
    tr = resolve_test(claim)
    if not tr.resolved or not request.data_available():
        # T17: with no raw data we cannot re-run anything, but assumption DISCLOSURE is still
        # decidable from the text. This is the branch that used to collapse to INSUFFICIENT_DATA
        # for the overwhelming majority of claims.
        notes = [tr.reason if not tr.resolved else "no linked dataset for this claim"]
        reporting = None
        if tr.resolved:
            try:
                reporting = detect_assumption_reporting(
                    claim,
                    manuscript_text=request.manuscript_text,
                    methods_text=request.methods_text,
                    test_key=tr.intended_test if not tr.ambiguous else None,
                )
            except Exception as exc:
                # FAIL CLOSED: a crash in the audit must never read as "assumptions fine". Leave
                # `reporting` None (no opinion -> INSUFFICIENT_DATA) and say so out loud. The
                # cascade_engine fail-open incident, where a Guardian crash recorded
                # guardian_passed=True, is the precedent for making this explicit.
                notes.append(f"assumption-disclosure audit failed: {exc}")
                reporting = None

        assumptions_reported = reporting.all_reported if reporting is not None else None
        v = assign_verdict(extraction_reliable=True, test_resolved=tr.resolved,
                           data_available=request.data_available(), executed_ok=False,
                           assumptions_ok=None, statistic_match=None,
                           assumptions_reported=assumptions_reported)
        if reporting is not None and reporting.evaluable and reporting.required:
            if reporting.unreported:
                notes.append(
                    "the manuscript does not report checking "
                    + describe_assumptions(reporting.unreported)
                    + f", required for {describe_test(reporting.test_key)}. This concerns "
                    "DISCLOSURE, not the data: the assumption may still hold.")
            else:
                notes.append("assumption checks reported for: "
                             + describe_assumptions(reporting.reported))
        return ClaimVerdict(verdict=v, recomputed_test=tr.intended_test, notes=notes,
                            assumptions_reported_in_text=assumptions_reported, **base)

    # 3. re-run the AUTHORS' test (no auto-substitution)
    intended = spec.intended_test or tr.intended_test
    try:
        res = _engine().execute_with_cascade(spec.as_engine_data(), intended,
                                             alpha=request.alpha, max_cascades=0)
    except Exception as exc:  # degenerate input must surface, never silently pass
        return ClaimVerdict(verdict=Verdict.INSUFFICIENT_DATA, recomputed_test=intended,
                            test_failed=True, test_failure_reason=f"engine error: {str(exc)[:140]}", **base)
    if res.result is None:
        return ClaimVerdict(verdict=Verdict.INSUFFICIENT_DATA, recomputed_test=intended,
                            test_failed=True, test_failure_reason="engine returned no result", **base)

    tres = res.result
    # 4. assumptions, with the T14 independence-gate
    crit = _critical_after_independence_gate(res.guardian_report, bool(spec.rows_sequential))
    assumptions_ok = (len(crit) == 0)

    # 5. compare recomputed vs claimed (T15); sign-insensitive for order-dependent statistics
    smatch = statistic_matches(getattr(claim, "statistic_value", None), float(tres.statistic),
                               getattr(claim, "statistic_raw", None),
                               symmetric=(intended in _SYMMETRIC_TESTS))

    # 6. assign verdict (T19)
    verdict = assign_verdict(extraction_reliable=True, test_resolved=True, data_available=True,
                             executed_ok=True, assumptions_ok=assumptions_ok, statistic_match=smatch)

    notes = []
    if tr.ambiguous:
        notes.append(f"test design inferred: {tr.reason}")
    if verdict == Verdict.ASSUMPTION_VIOLATED and smatch:
        notes.append("note: the reported value reproduces, but the used test's assumptions fail "
                     "-> ASSUMPTION_VIOLATED takes precedence (an appropriate test should be used)")

    return ClaimVerdict(
        verdict=verdict,
        recomputed_test=res.final_test,
        recomputed_statistic=float(tres.statistic),
        recomputed_p_value=float(tres.p_value),
        recomputed_effect_size=tres.effect_size,
        recomputed_effect_name=tres.effect_size_name,
        statistic_match=smatch,
        deltas={"claimed": getattr(claim, "statistic_value", None), "recomputed": float(tres.statistic)},
        assumptions_checked=res.guardian_report is not None,
        assumptions_satisfied=assumptions_ok,
        assumption_violations=[v.get("message", "") for v in crit],
        uncalibrated_engine_confidence=res.confidence_score,
        notes=notes,
        **base,
    )
