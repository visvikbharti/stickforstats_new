"""
Reading a small reported p: scientific notation, and inequalities at their stated precision.

TWO defects, both LIVE IN THE RELEASED v1.2.0 (`consistency_core.py` is byte-identical between
the tag and this branch), both reproduced by execution before being fixed. Both are FALSE CLEAN
BILLS -- the most damaging output class for a tool whose purpose is catching wrong statistics.

1. SCIENTIFIC NOTATION was read as "precision unknown", which sent the caller to a flat +/-0.005
   window. For a tiny p that is not a tolerance, it is an amnesty. A paper reporting
   p = 2.83e-91 where the statistic implies p = .004 -- wrong by 88 orders of magnitude -- was
   reported CONSISTENT, while the SAME magnitude written "0.0000000001" was correctly flagged
   'major'. Only the notation differed, and e-notation is how the omics literature writes small
   p by default.

2. THE INEQUALITY BRANCH used a flat +/-0.005 regardless of the stated precision, so
   "p < .0001" against a true p of .004 -- a 40x overclaim, the classic starred-significance
   error -- was CONSISTENT, because .004 <= .0001 + .005.

(2) is the exact defect this module's own exact-branch comment warns about (audit 2026-06-04,
F-06: "the previous flat additive +/-tolerance swamped tiny p-intervals ... hiding genuine
small-p reporting errors"), surviving one branch to the left. And `verdict_decision.p_matches`
had ALREADY been fixed for the identical trap in c8ab999 -- its docstring even cites this
module's F-06 note -- while leaving the neighbour broken. A lesson recorded in one module does
not protect the module next door, so the precision rule now lives in ONE function that both
import, and the duplicate is gone.

Every test names the mutation that must break it.
"""

from django.test import SimpleTestCase

from core.manuscript.consistency_core import classify, decimals_from_token
from core.manuscript.verdict_decision import _decimals, p_matches

# t(18) = 3.30 implies p = 0.003981...  Every case below is scored against that.
TRUE_P = 0.00398130697722601


def _classify(raw, value, comparison="equals", statistic=3.30):
    return classify(claim_type="t_statistic", statistic=statistic, statistic_raw=f"{statistic:.2f}",
                    p_value=value, p_value_raw=raw, p_comparison=comparison, df=(18,))


class DecimalsFromScientificNotationTests(SimpleTestCase):

    def test_significant_digits_shifted_by_the_exponent(self):
        """"2.83e-91" states 3 significant digits -> interval half-width 0.5e-93 -> 93 decimals.

        MUTATION: restore `if "e" in s or "E" in s: return None` -> fails.
        """
        self.assertEqual(decimals_from_token("2.83e-91", True), 93)
        self.assertEqual(decimals_from_token("2.83E-91", True), 93)   # capital E
        self.assertEqual(decimals_from_token("1e-5", True), 5)        # no decimal point
        self.assertEqual(decimals_from_token("1.5e-3", True), 4)

    def test_a_positive_exponent_gives_a_negative_result_and_that_is_correct(self):
        """"2.83e5" is 283000 known to 3 significant figures: half-width 500, i.e. -3 decimals.

        MUTATION: clamp the result at 0 (`max(0, ...)`) -> a statistic reported as 2.83e5 gets a
        +/-0.5 window instead of +/-500 and this fails.
        """
        self.assertEqual(decimals_from_token("2.83e5", False), -3)

    def test_unreadable_exponents_yield_no_opinion_rather_than_a_crash(self):
        """`10.0 ** 400` raises OverflowError; a garbage exponent has no precision to read.
        Both must degrade to None (the caller's existing fallback), never to an exception.

        MUTATION: drop the `abs(exp) > 300` guard -> the first assertion returns -400, and the
        caller's `10.0 ** 400` raises OverflowError.
        """
        self.assertIsNone(decimals_from_token("2.83e400", True))
        self.assertIsNone(decimals_from_token("abce-x", True))
        # And the CALLERS must survive it -- that is the whole point of the guard, since the
        # crash would be in their `10.0 ** (-dec)`, not here. Assert they return a verdict
        # rather than raising. (The first draft of this line wrote `p_matches(...) and None`,
        # which is `False`, not `None`, and failed honestly.)
        self.assertIn(p_matches(1.0, TRUE_P, "2.83e400", "equals"), (True, False))
        self.assertTrue(_classify("2.83e400", 1.0).checkable)

    def test_ordinary_decimals_are_completely_unchanged(self):
        """The guard rail. This change must not move a single non-exponent reading.

        MUTATION: any edit to the decimal branch -> fails.
        """
        for token, is_p, expected in [(".05", True, 2), ("0.049", True, 3), ("1", True, 0),
                                      ("0", True, 1), ("3.30", False, 2), ("12", False, 0),
                                      ("0.0000000001", True, 10)]:
            self.assertEqual(decimals_from_token(token, is_p), expected, token)


class OneRuleOnePlaceTests(SimpleTestCase):

    def test_verdict_decision_delegates_to_the_single_precision_rule(self):
        """The two modules each had a copy; one was fixed and the other was not, which is how
        the same paper got two answers. There must now be one implementation.

        MUTATION: reinstate a local body in verdict_decision._decimals -> the e-notation
        assertion below fails (a local copy returns None).
        """
        for token, is_p in [("2.83e-91", True), (".05", True), ("0", True), ("3.30", False)]:
            self.assertEqual(_decimals(token, is_p), decimals_from_token(token, is_p), token)
        self.assertEqual(_decimals("2.83e-91", is_p=True), 93)


class ScientificNotationIsNoLongerAnAmnestyTests(SimpleTestCase):

    def test_the_headline_false_clean_bill(self):
        """p = 2.83e-91 against a true p of .004 was CONSISTENT. It is an error of 88 orders of
        magnitude and the tool certified it.

        MUTATION: restore the `return None` for e-notation -> back to consistent, fails.
        """
        for raw, value in [("2.83e-91", 2.83e-91), ("2.83E-91", 2.83e-91)]:
            verdict = _classify(raw, value)
            self.assertTrue(verdict.checkable, raw)
            self.assertIs(verdict.is_consistent, False, raw)
            self.assertEqual(verdict.severity, "major", raw)

    def test_notation_no_longer_changes_the_answer(self):
        """THE INVARIANT. The same magnitude written two ways must get the same verdict; it was
        the disagreement between them that exposed the bug.

        MUTATION: restore the e-notation `return None` -> the two disagree and this fails.
        """
        as_exponent = _classify("1e-10", 1e-10)
        as_decimal = _classify("0.0000000001", 1e-10)
        self.assertEqual((as_exponent.is_consistent, as_exponent.severity),
                         (as_decimal.is_consistent, as_decimal.severity))

    def test_a_correct_scientific_notation_p_is_still_consistent(self):
        """THE POSITIVE CONTROL, and the one that stops this being a blanket denial of
        e-notation.

        The fixture is chosen so the reported value is rescued ONLY by its own rounding
        interval: t(18) = 3.25 gives p = .004445, whose interval is [.004397, .004495], and the
        paper reports "4e-3". At one significant figure that is correct reporting -- but .004
        lies OUTSIDE the recomputed interval, so the claim survives only because "4e-3" carries
        a half-width of .0005. The first version of this test used t = 3.30 (p = .00398), where
        .004 sits INSIDE the recomputed interval and the verdict is the same however wide the
        reported interval is; that version passed under the mutation below and proved nothing.

        MUTATION: make the e-notation branch return an arbitrarily large decimal count
        (`return 300`) -> the reported interval collapses to a point, this correct paper is
        accused, and this fails.
        """
        verdict = _classify("4e-3", 4e-3, statistic=3.25)
        self.assertIs(verdict.is_consistent, True)
        self.assertEqual(verdict.severity, "none")


class InequalitiesAreJudgedAtTheirStatedPrecisionTests(SimpleTestCase):

    def test_a_bound_the_data_do_not_meet_is_inconsistent(self):
        """"p < .0001" with a true p of .004 is a 40x overclaim. The flat +/-0.005 made it
        consistent (.004 <= .0001 + .005).

        MUTATION: restore `p_lo <= p_value + tolerance` (the flat constant) -> fails.
        """
        for raw, value in [(".001", 0.001), (".0001", 0.0001), ("1e-5", 1e-5)]:
            verdict = _classify(raw, value, "less_than")
            self.assertIs(verdict.is_consistent, False, f"p < {raw}")
            self.assertEqual(verdict.severity, "major", f"p < {raw}")

    def test_a_bound_the_data_do_meet_is_still_consistent(self):
        """THE POSITIVE CONTROL. Without this the fix is a blanket accusation that would flag
        most of the literature: "p < .05" with a true p of .004 is CORRECT reporting.

        MUTATION: judge inequalities by equality, or set the slack to 0 with a strict `<` ->
        fails.
        """
        for raw, value in [(".05", 0.05), (".01", 0.01)]:
            verdict = _classify(raw, value, "less_than")
            self.assertIs(verdict.is_consistent, True, f"p < {raw}")

    def test_the_boundary_is_the_bound_s_own_rounding_half_width(self):
        """At ".001" the half-width is .0005, so the bound is satisfied below .0015 and not
        above -- the same rule verdict_decision.p_matches uses, now shared.

        MUTATION: use a flat tolerance, or half the wrong quantity -> one of these fails.
        """
        self.assertIs(p_matches(0.001, 0.0015, ".001", "less_than"), True)
        self.assertIs(p_matches(0.001, 0.0016, ".001", "less_than"), False)

    def test_greater_than_is_fixed_in_the_same_direction(self):
        """The `greater_than` leg shared the flat constant and must move with it.

        Finding a fixture that discriminates took a search, and the obvious ones do not: at a
        bound of ".05" the true rounding half-width IS .005, identical to the flat tolerance,
        so the two rules agree by coincidence and any test built there is vacuous (the first
        version of this test was, and survived the mutation). The bound must be one whose
        half-width is SMALLER than .005. Here: t(18) = 4.60 gives p = .000222, and the paper
        claims "p > .001" -- a non-significance claim contradicted by its own statistic. The
        flat constant lowers the bar to .001 - .005 = -.004, which every p on earth clears.

        MUTATION: leave `p_hi >= p_value - tolerance` on the greater_than branch -> the first
        assertion flips to consistent and fails.
        """
        self.assertIs(_classify(".001", 0.001, "greater_than", statistic=4.60).is_consistent,
                      False)
        # positive control: the same bound with a p that genuinely IS above it
        self.assertIs(_classify(".001", 0.001, "greater_than", statistic=3.30).is_consistent,
                      True)


class ExactBranchIsUnchangedTests(SimpleTestCase):
    """The exact branch already read the precision correctly; this change must not disturb it."""

    def test_rounding_still_absorbs_legitimate_imprecision(self):
        """MUTATION: remove the shared `p_half` from the exact branch -> fails."""
        self.assertIs(_classify(".004", 0.004).is_consistent, True)
        self.assertIs(_classify("0.00398", 0.00398).is_consistent, True)

    def test_a_genuinely_wrong_exact_p_is_still_caught(self):
        """MUTATION: widen p_half back to the flat tolerance for exact values -> fails."""
        self.assertIs(_classify("0.0000000001", 1e-10).is_consistent, False)


class ReanalysisNoiseFloorTests(SimpleTestCase):
    """The half of this change that stops it being a net loss.

    Reading e-notation at its true precision makes the reported-p interval astronomically
    narrow, and `p_matches` compares against a p recomputed by RE-RUNNING DEPOSITED DATA --
    which is rounded, typically to 2 decimal places. Without a relative floor the fix turns
    82.5% of entirely correct papers into DISCREPANT (measured; see REANALYSIS_P_REL_FLOOR).

    That is worse than the defect it closes, and no positive control in the first draft of this
    file could have caught it: every one of them fed `p_matches` the exact recomputed value, so
    re-analysis noise was zero by construction and the rounding rule could never be seen
    over-firing. An adversarial review supplied the missing control; it is now the first test
    below.
    """

    def test_an_honest_paper_with_rounded_deposited_data_is_not_accused(self):
        """THE CONTROL THAT WAS MISSING. This paper is entirely correct: the authors analysed
        full-precision data and reported the p they got. They deposited their tables rounded to
        2 dp, as supplementary data universally are, so our re-run lands 1.7% away -- the same
        conclusion, the same order of magnitude, a different number in the 9th decimal place.

        MUTATION: remove the `max(half, REANALYSIS_P_REL_FLOOR * claimed_p)` floor -> this
        correct paper is called DISCREPANT and the test fails.
        """
        self.assertIs(p_matches(2.82e-07, 2.867763e-07, "2.82e-07", "equals"), True)

    def test_the_floor_does_not_pardon_a_real_error(self):
        """The floor must not become the new amnesty. Real reporting errors are 47x to 10^88x,
        nowhere near 10%.

        MUTATION: raise REANALYSIS_P_REL_FLOOR to 1.0 (or drop the `max(...)` to always take
        the floor) -> the .0047-vs-.001 case is pardoned and this fails.
        """
        self.assertIs(p_matches(2.83e-91, 0.004, "2.83e-91", "equals"), False)
        self.assertIs(p_matches(1e-4, 0.0047, "1e-4", "equals"), False)
        self.assertIs(p_matches(0.001, 0.0047, ".001", "less_than"), False)

    def test_the_float_guard_is_relative_so_the_fix_works_at_omics_scale(self):
        """A FLAT 1e-12 epsilon makes every pair of p-values below it compare equal, which left
        the whole comparison inert in exactly the literature that writes p in e-notation.
        Executed before the fix: a claimed 1e-50 against a recomputed 1e-20 -- wrong by 10^30 --
        returned True.

        MUTATION: restore the three flat `1e-12` terms -> all three assertions flip to True.
        """
        self.assertIs(p_matches(1e-50, 1e-20, "1e-50", "equals"), False)
        self.assertIs(p_matches(1.00e-20, 9.9e-13, "1.00e-20", "equals"), False)
        self.assertIs(p_matches(2.83e-91, 9.99e-91, "2.83e-91", "equals"), False)

    def test_omics_scale_papers_that_are_correct_still_match(self):
        """The positive control for the previous test: 1% re-analysis noise at any scale is
        still a match, because the floor is RELATIVE and therefore scale-invariant.

        MUTATION: make the floor absolute (e.g. `max(half, 1e-12)`) -> the deep-scale rows are
        accused and this fails.
        """
        for scale in (1e-8, 1e-20, 1e-50, 1e-91, 1e-200):
            raw = f"{scale:.2e}"
            claimed = float(raw)
            self.assertIs(p_matches(claimed, claimed * 1.01, raw, "equals"), True, raw)
            self.assertIs(p_matches(claimed, claimed * 0.99, raw, "equals"), True, raw)

    def test_the_floor_is_not_applied_to_the_statcheck_path(self):
        """`classify` recomputes p from the paper's OWN statistic, so there is no independent
        re-analysis and no deposited-data noise -- measured at 0/400 honest papers falsely
        flagged without any floor. Applying a 10% floor there would blunt a check that has real
        evidence behind it.

        The fixture had to be chosen so the floor would actually BIND. On ".0001" the reported
        value's own rounding half-width (5e-5) is already larger than 10% of it (1e-5), so a
        10% floor changes nothing and a test built there is vacuous -- the first version was,
        and the mutation survived. The floor binds only when the paper states MANY significant
        digits: "0.0043210" has a half-width of 5e-8 against a floor of 4.3e-4, four orders of
        magnitude wider. t(18) = 3.30 implies p = .0039813, so a paper reporting p = 0.0043210
        is wrong at the precision it chose to claim, and must stay flagged.

        MUTATION: add `max(..., 0.10 * p_value)` to classify's `p_half` -> this paper is
        pardoned and the first assertion fails.
        """
        self.assertIs(_classify("0.0043210", 0.0043210).is_consistent, False)
        self.assertIs(_classify(".0001", 0.0001, "less_than").is_consistent, False)
        self.assertIs(_classify("2.83e-91", 2.83e-91).is_consistent, False)
