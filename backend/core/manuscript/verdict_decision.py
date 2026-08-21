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

#: Relative floor under the p rounding-interval, for the RE-ANALYSIS comparison only.
#:
#: `statistic_matches` has always had a relative-tolerance fallback; `p_matches` had none, and
#: that asymmetry was harmless only while scientific notation was read as "precision unknown"
#: (which sent it to a flat 0.005 window). Reading e-notation properly makes the interval
#: astronomically narrow -- "2.82e-07" implies a half-width of 5e-10 -- and the recomputed p
#: does NOT come from the same numbers the authors used: supplementary tables are deposited
#: ROUNDED, typically to 2 decimal places. Re-running rounded data moves p by around 1%, which
#: is scientifically nothing and arithmetically enormous next to 5e-10.
#:
#: MEASURED, 400 simulated papers that are entirely correct (full-precision analysis reported,
#: data deposited rounded), false DISCREPANT rate by floor and deposit precision:
#:
#:      floor    2 dp     3 dp     4 dp
#:      0.00    82.5%    30.5%     3.8%      <- no floor: the fix accuses most honest papers
#:      0.02    13.2%     0.0%     0.0%
#:      0.05     0.2%     0.0%     0.0%
#:      0.10     0.0%     0.0%     0.0%
#:
#: and at EVERY one of those floors all six real defects are still caught, because their errors
#: are 47x to 10^88x, not 10%. 0.10 is the smallest round value that reaches zero at 2 dp with
#: margin. It is PROVISIONAL, like DEFAULT_REL_TOL, and belongs in the B1 pre-registration.
#:
#: Deliberately NOT applied to `consistency_core.classify`: that recomputes p from the paper's
#: OWN reported statistic, so there is no independent re-analysis and no deposited-data noise.
#: Measured there too -- 0/400 honest papers falsely flagged without any floor -- because the
#: statistic's own rounding interval is wide enough to absorb the narrow p interval.
REANALYSIS_P_REL_FLOOR = 0.10


def _decimals(token, is_p: bool = False) -> Optional[int]:
    """Decimal places implied by a reported numeric token (for the rounding interval).

    Delegates to ``consistency_core.decimals_from_token``. There is ONE rule for how a reported
    number's precision is read, and it must live in one place: this module had its own copy, the
    two drifted, and the copy here silently returned None for scientific notation -- sending
    ``p_matches`` to a flat +/-0.005 window in which ``p = 2.83e-91`` against a recomputed .004
    was a MATCH, i.e. VERIFIED. The neighbouring module had the same hole. Fixing one and not
    the other is how this repo produced two answers to one question; importing removes the
    possibility rather than the instance.

    ``is_p`` selects the p-value reading (a bare "0" keeps a decimal, because no real p is
    exactly zero and a +/-0.5 window would mask a gross error).
    """
    from .consistency_core import decimals_from_token   # local: both are pure, no cycle
    return decimals_from_token(token, is_p)


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
    dec = _decimals(claimed_raw, is_p=False)
    if dec is not None:
        half = 0.5 * (10.0 ** (-dec))
        if abs(r - c) <= half + 1e-12:
            return True
    return abs(r - c) <= rel_tol * max(abs(c), 1e-9)


def p_matches(claimed_p: Optional[float], recomputed_p: Optional[float],
              claimed_p_raw=None, p_comparison: str = "equals",
              tolerance: float = 0.005) -> Optional[bool]:
    """Does the p recomputed FROM THE DATA agree with the p the paper reports?

    The sibling of ``statistic_matches``, and needed for the same reason: the engine was
    computing the correct p, holding it on the verdict, and never comparing it -- so a paper
    reporting p = 0.0001 where the data give p = 0.0047 came back VERIFIED on the strength of a
    matching t alone.

    This is NOT ``consistency_core.classify``, which answers a different question: that recomputes
    p from the paper's own reported STATISTIC (statcheck, no data required). Here the recomputed p
    comes from re-running the test on the linked data. The comparison rules are deliberately the
    same ones, because the way a reported p must be read does not depend on where the comparison
    value came from:

    * An INEQUALITY is judged by SATISFACTION, never by equality. ``p < .05`` with a recomputed
      .0047 is correct reporting, not a discrepancy -- treating it as one would flag most of the
      literature.
    * An EXACT p is judged by overlap of its rounding interval at the reported precision.
      ``p = .005`` with a recomputed .0047 rounds to the same thing and matches.

    Returns None when either side is missing, or when the reported p is outside (0, 1] -- an
    impossible p is an extraction artifact, not the author's error.
    """
    if claimed_p is None or recomputed_p is None:
        return None
    if claimed_p < 0 or claimed_p > 1:
        return None

    # Slack is the ROUNDING interval of the bound as the paper reported it -- NOT a flat
    # constant. A flat 0.005 swamps small p entirely: "p < .001" against a recomputed .0047
    # would be judged satisfied (.0047 <= .001 + .005), certifying a real reporting error. That
    # is the defect consistency_core already records for its exact branch ("the previous flat
    # additive +/-tolerance swamped tiny p-intervals ... hiding genuine small-p reporting
    # errors", audit 2026-06-04 F-06); the same trap applies to inequalities. At ".001" the
    # rounding half-width is .0005, so the bound is satisfied only below .0015.
    dec = _decimals(claimed_p_raw, is_p=True)
    half = 0.5 * (10.0 ** (-dec)) if dec is not None else tolerance

    # ...and never narrower than REANALYSIS_P_REL_FLOOR of the reported p. The recomputed value
    # comes from re-running DEPOSITED data, which is rounded; without this floor, reading
    # e-notation at its true precision turns 82.5% of entirely correct papers into DISCREPANT.
    # See the constant for the measurement. This is the fallback `statistic_matches` always had.
    half = max(half, REANALYSIS_P_REL_FLOOR * claimed_p)

    # Float-noise guard, PROPORTIONAL to the slack rather than a flat 1e-12. A flat absolute
    # epsilon makes every pair of p-values below it compare equal, so at omics scale the whole
    # comparison went inert: executed, a claimed 1e-50 against a recomputed 1e-20 -- wrong by
    # 10^30 -- returned True. That is the regime scientific notation is USED in, so a flat
    # epsilon would have left this fix doing nothing precisely where it was needed.
    eps = half * 1e-9

    if p_comparison == "less_than":
        return recomputed_p <= claimed_p + half + eps
    if p_comparison == "greater_than":
        return recomputed_p >= claimed_p - half - eps
    return abs(recomputed_p - claimed_p) <= half + eps


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
                   df_matches_design: Optional[bool] = None,
                   p_match: Optional[bool] = None) -> Verdict:
    """The §2 verdict-assignment precedence.

    Order matters:
      1. extraction not reliable            -> UNVERIFIABLE_EXTRACTION
      2. no resolvable test                 -> INSUFFICIENT_DATA
      3. no data, assumptions undisclosed   -> ASSUMPTION_UNREPORTED  (T17; needs NO raw data)
      4. no data otherwise                  -> INSUFFICIENT_DATA      (still dominates)
      5. test couldn't execute on the data  -> INSUFFICIENT_DATA
      6. reported df contradicts the data    -> INSUFFICIENT_DATA (we ran a DIFFERENT model)
      7. assumptions of the used test fail  -> ASSUMPTION_VIOLATED (independent of p/stat match)
      8. statistic AND p reproduce          -> VERIFIED  else DISCREPANT

    ``p_match`` closes a hole where a matching statistic alone earned VERIFIED: a paper reporting
    p = 0.0001 on data that give p = 0.0047 was certified correct because its t matched. VERIFIED
    now requires that the p not be known-wrong. It is three-state like the rest -- ``None`` (no p
    reported, or an impossible one) must not block VERIFIED, or every claim without a p would
    become DISCREPANT.

    ``effect_match`` remains unassigned ON PURPOSE. Comparing a claimed effect size to a
    recomputed one needs scale normalisation first (Cohen's d vs Hedges' g, eta-squared vs partial
    eta-squared, r vs r-squared) -- that is TODO item T16-EFFECT, and comparing across incompatible
    scales would manufacture discrepancies rather than find them.

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
    if statistic_match and p_match is not False:
        return Verdict.VERIFIED
    return Verdict.DISCREPANT
