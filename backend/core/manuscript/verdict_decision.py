"""
T15 (tolerance) + T19 (verdict assignment) — recomputed-vs-claimed comparison and the
per-claim verdict decision function.
=====================================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (§2 precedence; §5)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T15-TOLERANCE, T19-DECISION)

Pure module (verdicts + math). DISCREPANT tolerance is rounding-aware (the ±0.5-last-digit
interval implied by the reported value's precision) with a relative-tolerance fallback; the
exact threshold is to be FIXED in the B1 OSF pre-registration before the census.
"""

from __future__ import annotations

from typing import Optional

from .verdicts import Verdict

DEFAULT_REL_TOL = 0.02  # provisional; pre-register in B1


def _decimals(token) -> Optional[int]:
    """Decimal places implied by a reported numeric token (for the rounding interval)."""
    if token is None:
        return None
    s = str(token).strip().lstrip("<>=").replace("−", "-")
    if not s or "e" in s.lower():
        return None
    return len(s.split(".", 1)[1]) if "." in s else 0


def statistic_matches(claimed: Optional[float], recomputed: Optional[float],
                      claimed_raw=None, rel_tol: float = DEFAULT_REL_TOL,
                      symmetric: bool = False) -> Optional[bool]:
    """Rounding-aware match of a recomputed statistic to the claimed value.

    Returns None when either value is missing. Match iff the recomputed value falls within
    the ±0.5-last-digit interval implied by the claimed value's reported precision, OR within
    a relative tolerance (covers cases where the reported precision is unknown).

    ``symmetric=True`` compares magnitudes — for statistics whose SIGN depends on an arbitrary
    group ordering (t, Mann-Whitney U), a paper reporting |t| should match either sign."""
    if claimed is None or recomputed is None:
        return None
    c = abs(claimed) if symmetric else claimed
    r = abs(recomputed) if symmetric else recomputed
    dec = _decimals(claimed_raw)
    if dec is not None:
        half = 0.5 * (10.0 ** (-dec))
        if abs(r - c) <= half + 1e-12:
            return True
    return abs(r - c) <= rel_tol * max(abs(c), 1e-9)


def assign_verdict(*, extraction_reliable: bool, test_resolved: bool, data_available: bool,
                   executed_ok: bool, assumptions_ok: Optional[bool],
                   statistic_match: Optional[bool],
                   assumptions_reported: Optional[bool] = None) -> Verdict:
    """The §2 verdict-assignment precedence.

    Order matters:
      1. extraction not reliable            -> UNVERIFIABLE_EXTRACTION
      2. no resolvable test                 -> INSUFFICIENT_DATA
      3. no data, assumptions undisclosed   -> ASSUMPTION_UNREPORTED  (T17; needs NO raw data)
      4. no data otherwise                  -> INSUFFICIENT_DATA      (still dominates)
      5. test couldn't execute on the data  -> INSUFFICIENT_DATA
      6. assumptions of the used test fail  -> ASSUMPTION_VIOLATED (independent of p/stat match)
      7. numbers reproduce                  -> VERIFIED  else DISCREPANT

    ``assumptions_reported`` is a THREE-state signal from
    ``assumption_reporting.detect_assumption_reporting``:
      * ``False`` -- the test requires an assumption whose check the paper never reports.
      * ``True``  -- every required assumption's check is reported.
      * ``None``  -- no opinion (test/design not stated, nothing conventionally required, or the
        audit could not run). ``None`` must NEVER produce a finding; that is the interlock that
        keeps a guess from becoming an accusation.

    Why step 3 sits *above* INSUFFICIENT_DATA but *below* the with-data verdicts: when raw data
    exist, ``ASSUMPTION_VIOLATED`` is a stronger, evidence-based statement about the same
    concern, so it keeps precedence. When they do not, disclosure is the only thing decidable —
    and it is precisely the case that used to collapse into INSUFFICIENT_DATA for ~96% of papers.
    """
    if not extraction_reliable:
        return Verdict.UNVERIFIABLE_EXTRACTION
    if not test_resolved:
        return Verdict.INSUFFICIENT_DATA
    if not data_available:
        if assumptions_reported is False:
            return Verdict.ASSUMPTION_UNREPORTED
        return Verdict.INSUFFICIENT_DATA
    if not executed_ok:
        return Verdict.INSUFFICIENT_DATA
    if assumptions_ok is False:
        return Verdict.ASSUMPTION_VIOLATED
    return Verdict.VERIFIED if statistic_match else Verdict.DISCREPANT
