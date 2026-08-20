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


def expected_degrees_of_freedom(intended_test: Optional[str], spec) -> Optional[tuple]:
    """The df the linked DATA implies for ``intended_test``, or None when not predictable.

    This is the cheap, exact corroboration that the analysis we are about to re-run is the one
    the authors actually reported. A paper reporting ``F(2, 45)`` whose linked data yield
    ``F(2, 57)`` did not run the model we just ran -- most often because the paper reports a
    factorial or repeated-measures ANOVA and ``test_resolver`` can only offer one-way, but a
    mis-linked dataset produces the same signal, and both mean the same thing: we did not
    reproduce THEIR analysis, so we may not call their numbers discrepant.

    Returns None (no opinion) rather than guessing whenever df is not a deterministic function
    of the data shape:
      * Welch's t -- the Satterthwaite df depends on the variances, not just the counts;
      * rank-based tests and correlations reported without df -- no conventional df.
    """
    if not intended_test or spec is None:
        return None

    groups = getattr(spec, "groups", None) or []
    sizes = [len(g) for g in groups if g is not None]

    if intended_test == "independent_t":
        return (sizes[0] + sizes[1] - 2,) if len(sizes) >= 2 else None
    if intended_test in ("paired_t", "one_sample_t"):
        return (sizes[0] - 1,) if sizes else None
    if intended_test == "one_way_anova":
        if len(sizes) < 2:
            return None
        k, n_total = len(sizes), sum(sizes)
        return (k - 1, n_total - k)
    if intended_test == "pearson":
        x = getattr(spec, "x", None)
        return (len(x) - 2,) if x is not None and len(x) > 2 else None
    if intended_test == "chi_square_independence":
        table = getattr(spec, "table", None)
        if table and len(table) > 1 and len(table[0]) > 1:
            return ((len(table) - 1) * (len(table[0]) - 1),)
        return None
    # welch_t (Satterthwaite), mann_whitney_u, kruskal_wallis, spearman, kendall: not predictable
    return None


def df_corroborates_design(claimed_df, expected_df) -> Optional[bool]:
    """Does the paper's reported df agree with the df its linked data implies?

    True/False, or None when either side is unknown -- and None must never produce a finding,
    the same three-state discipline as ``assumptions_reported``.
    """
    if not claimed_df or not expected_df:
        return None
    if len(claimed_df) != len(expected_df):
        return None            # different shapes are not comparable; say nothing
    try:
        return all(int(c) == int(e) for c, e in zip(claimed_df, expected_df))
    except (TypeError, ValueError):
        return None


def assign_verdict(*, extraction_reliable: bool, test_resolved: bool, data_available: bool,
                   executed_ok: bool, assumptions_ok: Optional[bool],
                   statistic_match: Optional[bool],
                   assumptions_reported: Optional[bool] = None,
                   df_matches_design: Optional[bool] = None) -> Verdict:
    """The §2 verdict-assignment precedence.

    Order matters:
      1. extraction not reliable            -> UNVERIFIABLE_EXTRACTION
      2. no resolvable test                 -> INSUFFICIENT_DATA
      3. no data, assumptions undisclosed   -> ASSUMPTION_UNREPORTED  (T17; needs NO raw data)
      4. no data otherwise                  -> INSUFFICIENT_DATA      (still dominates)
      5. test couldn't execute on the data  -> INSUFFICIENT_DATA
      6. reported df contradicts the data    -> INSUFFICIENT_DATA (we ran a DIFFERENT model)
      7. assumptions of the used test fail  -> ASSUMPTION_VIOLATED (independent of p/stat match)
      8. numbers reproduce                  -> VERIFIED  else DISCREPANT

    ``df_matches_design`` is the same three-state shape (see ``df_corroborates_design``).
    ``False`` means the df the authors reported is not the df their linked data implies, so the
    model we just executed is not the model they described -- most often a factorial or
    repeated-measures ANOVA that ``test_resolver`` could only offer as one-way. DISCREPANT
    asserts "we ran YOUR test and got a different number"; when we did not run their test, that
    assertion is false, and a confident false accusation is the most damaging output this engine
    can produce. So it degrades to INSUFFICIENT_DATA, which is the honest answer. It suppresses
    ASSUMPTION_VIOLATED too: an assumption report about the wrong model is equally meaningless.

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
    if df_matches_design is False:
        return Verdict.INSUFFICIENT_DATA
    if assumptions_ok is False:
        return Verdict.ASSUMPTION_VIOLATED
    return Verdict.VERIFIED if statistic_match else Verdict.DISCREPANT
