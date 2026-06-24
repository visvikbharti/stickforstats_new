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
                   statistic_match: Optional[bool]) -> Verdict:
    """The §2 verdict-assignment precedence.

    Order matters:
      1. extraction not reliable            -> UNVERIFIABLE_EXTRACTION
      2. no resolvable test / no data       -> INSUFFICIENT_DATA   (dominates; most papers)
      3. test couldn't execute on the data  -> INSUFFICIENT_DATA
      4. assumptions of the used test fail  -> ASSUMPTION_VIOLATED (independent of p/stat match)
      5. numbers reproduce                  -> VERIFIED  else DISCREPANT
    """
    if not extraction_reliable:
        return Verdict.UNVERIFIABLE_EXTRACTION
    if not test_resolved or not data_available:
        return Verdict.INSUFFICIENT_DATA
    if not executed_ok:
        return Verdict.INSUFFICIENT_DATA
    if assumptions_ok is False:
        return Verdict.ASSUMPTION_VIOLATED
    return Verdict.VERIFIED if statistic_match else Verdict.DISCREPANT
