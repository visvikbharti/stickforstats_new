"""Regression tests for the p-mis-pairing / false-positive extractor fixes (2026-06-26).

These pin the fixes that eliminated the dominant census false-positive category
(FP_MISEXTRACTION, 157 -> 0 at the 10,103-paper corpus; clear-FP rate 45% -> 14%).
Each test is grounded in a real corpus example whose PMCID is cited.

Bugs fixed:
  1. Scoped p-attachment -- a standalone p-value attaches only to the closest
     PRECEDING statistic, within a tight window, with no sentence/paragraph break
     between (was: nearest within 300 chars, either direction).
  2. df-arity guard -- a t-test / chi-square with a 2-element df ("t (1, 644)")
     is an ambiguous mis-extraction -> not recomputable (was: silently used df[0]).
  3. Generic-stat guards -- an effect-size subscript ("d z" = Cohen's d_z) and
     function/variable notation ("Z(Y)") are not test statistics.
  4. p-parse -- "p = 1" is 1.0, not 0.1 (the leading dot is now captured, so a
     bare integer is distinguishable from a stripped fraction).
  5. Strict patterns accept a ";" separator and a fractional F df1 (Greenhouse-
     Geisser), so genuinely-paired results are captured WITH their p (correct
     attribution + recall) instead of falling through to the generic+merge path.
"""

from django.test import TestCase

from core.manuscript.claim_extractor import StatisticalClaimExtractor, _parse_p_value
from core.manuscript import consistency_core as cc
from core.manuscript.consistency_adapter import evaluate_consistency


def _types(claims):
    out = {}
    for c in claims:
        out.setdefault(c.claim_type, []).append(c)
    return out


class ScopedPAttachmentTests(TestCase):
    def setUp(self):
        self.ex = StatisticalClaimExtractor()

    def test_adjacent_p_still_merges(self):
        # The legitimate case must be preserved: "F = 1122.10, p = ..." (CRISPR).
        fs = _types(self.ex.extract("One-way ANOVA F = 1122.10, p = 1.34e-35.", "r")).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertEqual(fs[0].p_value, 1.34e-35)

    def test_p_after_sentence_break_does_not_merge(self):
        # A generic statistic must NOT borrow a p-value from the next sentence.
        claims = self.ex.extract("The effect was large, F = 5.48. A separate test gave p = 0.03.", "r")
        fs = _types(claims).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertIsNone(fs[0].p_value)  # left unattached -> not checkable

    def test_p_before_statistic_does_not_merge(self):
        # Cohen's d_z mis-read as z borrowed the t-test's p that PRECEDED it
        # (PMC5762637: "... p < 0.0001, d z = 1.1"). p before stat must not merge.
        claims = self.ex.extract("significant (p < 0.0001, z = 1.1) overall.", "r")
        zs = _types(claims).get("z_statistic", [])
        self.assertTrue(all(c.p_value is None for c in zs))

    def test_p_attaches_to_closest_preceding_statistic(self):
        # Two generic stats; each must keep its OWN p, not the other's.
        bt = _types(self.ex.extract(
            "Shapiro-Wilk W = 0.793, p = 0.012. Kruskal-Wallis H = 36.59, p = 5.62e-08.", "r"))
        self.assertEqual(bt["shapiro_wilk"][0].p_value, 0.012)
        self.assertEqual(bt["kruskal_wallis"][0].p_value, 5.62e-08)

    def test_far_p_beyond_window_does_not_merge(self):
        # A p-value > 60 chars after the statistic (no break, but distant) is too
        # far to be the same reported result.
        text = "H = 4.2 " + "and the analysis proceeded across several measures " + ", p = 0.51."
        hs = _types(self.ex.extract(text, "r")).get("kruskal_wallis", [])
        self.assertEqual(len(hs), 1)
        self.assertIsNone(hs[0].p_value)

    def test_merged_p_extends_raw_text_for_provenance(self):
        # PMC11888203: semicolon-separated p; after the fix the p is visibly part
        # of the claim's raw_text (so adjudication no longer mislabels it).
        claims = self.ex.extract("difference (F (1,26) = 5.779; p = 0.0150).", "r")
        fs = _types(claims).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertIn("p = 0.0150", fs[0].raw_text)


class DfArityGuardTests(TestCase):
    def test_t_with_two_df_not_checkable(self):
        # PMC6096657 regression table: "t (1, 644) = 9.92" -> ambiguous df.
        # Silently using df[0]=1 gave p=0.064 vs reported .000 -> false flag.
        v = cc.classify("t_statistic", 9.92, "9.92", 0.0, "0", "equals", (1, 644))
        self.assertFalse(v.checkable)

    def test_chi_square_with_df_n_tuple_is_checkable(self):
        # A chi-square reported as "chi2(df, N)" -> df is unambiguously df[0]
        # (unlike a t-test, where a 2-tuple is ambiguous). It must stay checkable
        # and recompute correctly: chi2(2)=8.4 -> p~.015, consistent with .015.
        v = cc.classify("chi_square", 8.4, "8.4", 0.015, "0.015", "equals", (2, 100))
        self.assertTrue(v.checkable)
        self.assertTrue(v.is_consistent)

    def test_t_with_single_df_still_checkable(self):
        v = cc.classify("t_statistic", 2.042, "2.042", 0.05, "05", "equals", (30,))
        self.assertTrue(v.checkable and v.is_consistent)

    def test_f_with_two_df_still_checkable(self):
        # F genuinely carries two df -- the guard must NOT touch it.
        v = cc.classify("f_statistic", 8.0, "8.0", 0.05, "05", "less_than", (2, 100))
        self.assertTrue(v.checkable and v.is_consistent)


class GenericStatGuardTests(TestCase):
    def setUp(self):
        self.ex = StatisticalClaimExtractor()

    def test_cohens_dz_not_a_z_statistic(self):
        # "d z = 1.1" (Cohen's d_z) must not be extracted as a z-test.
        zs = _types(self.ex.extract("a large effect, d z = 1.1, was found.", "r")).get("z_statistic", [])
        self.assertEqual(zs, [])

    def test_cohens_d_underscore_z_not_a_z_statistic(self):
        zs = _types(self.ex.extract("effect size d_z = 1.1 overall.", "r")).get("z_statistic", [])
        self.assertEqual(zs, [])

    def test_word_ending_in_d_is_not_skipped(self):
        # "observed z = 1.96" -- the d is part of a word, not Cohen's d.
        zs = _types(self.ex.extract("the observed z = 1.96 indicated significance.", "r")).get("z_statistic", [])
        self.assertEqual(len(zs), 1)
        self.assertEqual(zs[0].statistic_value, 1.96)

    def test_function_notation_not_a_statistic(self):
        # "Z(Y) = 0" -- a df-group with no number is variable/function notation.
        zs = _types(self.ex.extract("The transform Z(Y) = 0 holds, p < 0.001.", "r")).get("z_statistic", [])
        self.assertEqual(zs, [])


class PValueParseTests(TestCase):
    def setUp(self):
        self.ex = StatisticalClaimExtractor()

    def test_bare_one_is_one(self):
        self.assertEqual(_parse_p_value("1"), 1.0)

    def test_bare_zero_is_zero(self):
        self.assertEqual(_parse_p_value("0"), 0.0)

    def test_dotted_fraction(self):
        self.assertEqual(_parse_p_value(".1"), 0.1)
        self.assertEqual(_parse_p_value("0.05"), 0.05)

    def test_stripped_fraction_legacy(self):
        # Bare multi-digit (or leading-zero) tokens remain fractions.
        self.assertEqual(_parse_p_value("05"), 0.05)
        self.assertEqual(_parse_p_value("001"), 0.001)

    def test_p_equals_one_is_consistent_not_flagged(self):
        # PMC6111889: "F(6,131)=0.036; p=1" recomputes to ~0.9998; p=1 (not 0.1)
        # makes it consistent. Previously "p=1" parsed as 0.1 -> false inconsistency.
        claims = self.ex.extract("not different (ANCOVA F(6,131)=0.036; p=1).", "r")
        fs = _types(claims).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertEqual(fs[0].p_value, 1.0)
        sig = evaluate_consistency(fs[0])
        self.assertTrue(sig.checkable)
        self.assertIsNot(sig.is_consistent, False)


class StrictSeparatorTests(TestCase):
    def setUp(self):
        self.ex = StatisticalClaimExtractor()

    def test_semicolon_separated_t(self):
        claims = self.ex.extract("paired comparison t(30) = 2.5; p = .6 overall.", "r")
        ts = _types(claims).get("t_statistic", [])
        self.assertEqual(len(ts), 1)
        self.assertEqual(ts[0].df, (30,))
        self.assertEqual(ts[0].p_value, 0.6)

    def test_fractional_f_df1_greenhouse_geisser(self):
        # PMC8465154: GG-corrected F with fractional df1.
        claims = self.ex.extract("main effect (F (1.74, 227.94) = 29.876, p = 0.097).", "r")
        fs = _types(claims).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertEqual(fs[0].df, (1.74, 227.94))
        self.assertEqual(fs[0].statistic_value, 29.876)

    def test_semicolon_separated_f_keeps_genuine_inconsistency(self):
        # PMC11888203: a genuine inconsistency must still be caught -- now WITH
        # the p in its own text (correct attribution).
        claims = self.ex.extract("first EXT period (F (1,31) = 5.484; p = 0.217).", "r")
        fs = _types(claims).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertEqual(fs[0].df, (1, 31))
        self.assertEqual(fs[0].p_value, 0.217)
        sig = evaluate_consistency(fs[0])
        self.assertTrue(sig.checkable)
        self.assertIs(sig.is_consistent, False)  # recomputes to ~0.026, not 0.217


class AdversarialReviewFollowupTests(TestCase):
    """Regressions confirmed by the 2026-06-26 adversarial review of the fix (all minor)."""

    def setUp(self):
        self.ex = StatisticalClaimExtractor()

    def test_malformed_two_dot_p_does_not_crash(self):
        # R1: the dot-capturing p-group can match a malformed "p = .03.04";
        # _parse_p_value must degrade to None, not raise ValueError, so the
        # whole extract()/verify call cannot crash on one pathological token.
        self.assertIsNone(_parse_p_value(".03.04"))
        for txt in ("the result was p = .03.04 overall.", "t(20) = 2.1, p = .03.04."):
            claims = self.ex.extract(txt, "r")  # must not raise
            self.assertIsInstance(claims, list)

    def test_line_wrapped_parenthetical_p_still_merges(self):
        # R2: a soft line-wrap between a statistic and its parenthetical p (common
        # in PDF-extracted text) is NOT a sentence break and must not block the merge.
        claims = self.ex.extract("association χ²(1) = 0.20\n(p = .002).", "r")
        cs = _types(claims).get("chi_square", [])
        self.assertEqual(len(cs), 1)
        self.assertEqual(cs[0].p_value, 0.002)
        sig = evaluate_consistency(cs[0])
        self.assertTrue(sig.checkable)
        self.assertIs(sig.is_consistent, False)  # chi2(1)=0.20 -> p~.65, not .002

    def test_sentence_break_still_blocks_merge(self):
        # The R2 fix must NOT weaken the genuine sentence-boundary guard.
        claims = self.ex.extract("The effect was large, F = 5.48. A separate test gave p = 0.03.", "r")
        fs = _types(claims).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertIsNone(fs[0].p_value)

    def test_bare_p_zero_still_flagged(self):
        # R4: "p = 0" must keep a tight (+/-0.05) rounding window so a gross
        # inconsistency is not masked -- only "p = 1" gets the 0-decimal treatment.
        v = cc.classify("t_statistic", 1.0, "1.0", 0.0, "0", "equals", (30,))
        self.assertTrue(v.checkable)
        self.assertFalse(v.is_consistent)  # recomputes to ~0.325, far from 0
        # ...while the legitimate ANCOVA "p = 1" stays consistent.
        v1 = cc.classify("f_statistic", 0.036, "0.036", 1.0, "1", "equals", (6, 131))
        self.assertTrue(v1.checkable)
        self.assertTrue(v1.is_consistent)
