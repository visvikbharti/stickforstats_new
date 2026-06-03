"""First-principles tests for the unified consistency core.

These validate the shared algorithm (scipy-true values) independently of any
paper, so both validators that call it inherit a correct, tested core.
"""

from django.test import TestCase

from core.manuscript import consistency_core as cc


def _v(ctype, stat, stat_raw, p, p_raw, comp, df, n=None):
    return cc.classify(ctype, stat, stat_raw, p, p_raw, comp, df, sample_size=n, alpha=0.05, tolerance=0.005)


class ConsistencyCoreTests(TestCase):
    def test_exact_agreement_consistent(self):
        v = _v("t_statistic", 2.042, "2.042", 0.05, "05", "equals", (30,))
        self.assertTrue(v.checkable and v.is_consistent)
        self.assertEqual(v.severity, "none")

    def test_inequality_satisfied_consistent(self):
        v = _v("f_statistic", 8.0, "8.0", 0.05, "05", "less_than", (2, 100))
        self.assertTrue(v.is_consistent)

    def test_inequality_violated_gross(self):
        v = _v("t_statistic", 1.0, "1.0", 0.05, "05", "less_than", (50,))
        self.assertFalse(v.is_consistent)
        self.assertEqual(v.severity, "gross_error")

    def test_exact_discrepancy_major(self):
        v = _v("f_statistic", 3.5, "3.5", 0.001, "001", "equals", (2, 100))
        self.assertFalse(v.is_consistent)
        self.assertEqual(v.severity, "major")

    def test_exact_decision_error_gross(self):
        v = _v("t_statistic", 1.5, "1.5", 0.001, "001", "equals", (20,))
        self.assertEqual(v.severity, "gross_error")

    def test_rounding_edge_consistent(self):
        v = _v("t_statistic", 0.38, "0.38", 0.71, "71", "equals", (166,))
        self.assertTrue(v.is_consistent)

    def test_impossible_p_is_not_checkable_not_error(self):
        # p>1 is an extraction artifact (e.g. a dropped "x 10^-n"), not the
        # author's gross error -> not checkable, not flagged.
        v = _v("f_statistic", 130.88, "130.88", 1.96, "1.96", "equals", (4, 10))
        self.assertFalse(v.checkable)
        self.assertEqual(v.severity, "none")

    def test_missing_df_not_checkable(self):
        v = _v("t_statistic", 2.0, "2.0", 0.05, "05", "equals", None)
        self.assertFalse(v.checkable)

    def test_short_type_names_accepted(self):
        v = _v("F", 8.0, "8.0", 0.05, "05", "less_than", (2, 100))
        self.assertTrue(v.is_consistent)
