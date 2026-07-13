"""
Guardian checks for categorical (chi-square) tests.

Before this path existed, the frontend's categorical payload
({observed: [[a, b], [c, d]], categories1: [...strings], categories2: [...strings]})
was fed straight into the numeric pipeline: _prepare_data built one 2-D array plus
two string arrays, and _summarize_data then died with

    TypeError: only 0-dimensional arrays can be converted to Python scalars

-> HTTP 500 on every single chi-square, so the Guardian silently reported
"validation unavailable" and never checked the one assumption that actually governs
a chi-square test. Worse, "expected_frequencies" was declared in the requirements
map but no validator implemented it, so even without the 500 it was a no-op.
"""

import numpy as np
from django.test import SimpleTestCase

from core.guardian.guardian_core import GuardianCore


FRONTEND_PAYLOAD = {
    "observed": [[26, 24], [23, 27]],
    "categories1": ["Treatment", "Control"],
    "categories2": ["Improved", "NotImproved"],
}


class ContingencyGuardianTests(SimpleTestCase):
    def setUp(self):
        self.guardian = GuardianCore()

    def test_frontend_categorical_payload_does_not_500(self):
        """The exact payload CategoricalTests.jsx sends must produce a report."""
        report = self.guardian.check(FRONTEND_PAYLOAD, "chi_square", alpha=0.05)

        self.assertEqual(report.test_type, "chi_square")
        self.assertTrue(report.can_proceed)
        self.assertEqual(report.violations, [])
        self.assertEqual(report.data_summary["table_shape"], [2, 2])
        self.assertEqual(report.data_summary["n"], 100)
        # every expected count here is 24.5-25.5, comfortably above 5
        self.assertGreater(report.data_summary["min_expected_frequency"], 5)
        self.assertEqual(report.data_summary["cells_below_5"], 0)

    def test_expected_frequencies_is_actually_checked_not_skipped(self):
        """It must appear in the audit trail as a real test, not 'skipped'."""
        report = self.guardian.check(FRONTEND_PAYLOAD, "chi_square", alpha=0.05)
        entries = {e.assumption: e for e in report.audit_trail}

        self.assertIn("expected_frequencies", entries)
        self.assertEqual(entries["expected_frequencies"].result, "pass")
        self.assertIn("Cochran", entries["expected_frequencies"].test_performed)
        self.assertIn("Cochran", entries["expected_frequencies"].citation)

    def test_independence_is_reported_not_applicable_not_satisfied(self):
        """Independence cannot be tested from a collapsed table; don't certify it."""
        report = self.guardian.check(FRONTEND_PAYLOAD, "chi_square", alpha=0.05)
        entries = {e.assumption: e for e in report.audit_trail}

        self.assertEqual(entries["independence"].result, "not_applicable")

    def test_sparse_2x2_blocks_and_recommends_fisher(self):
        """A 2x2 with an expected count under 5 is a critical violation (Cochran)."""
        sparse = {"observed": [[10, 2], [3, 1]]}  # min expected = 1.14
        report = self.guardian.check(sparse, "chi_square", alpha=0.05)

        self.assertFalse(report.can_proceed)
        self.assertEqual(len(report.violations), 1)
        v = report.violations[0]
        self.assertEqual(v.assumption, "expected_frequencies")
        self.assertEqual(v.severity, "critical")
        self.assertIn("Fisher", v.recommendation)
        self.assertEqual(report.alternative_tests, ["fisher_exact"])

    def test_expected_frequencies_match_scipy(self):
        """Our expected counts must equal scipy's."""
        from scipy.stats import chi2_contingency

        observed = np.array([[26, 24], [23, 27]])
        _, _, _, expected = chi2_contingency(observed, correction=False)

        report = self.guardian.check({"observed": observed.tolist()}, "chi_square")
        self.assertAlmostEqual(
            report.data_summary["min_expected_frequency"], float(expected.min()), places=4
        )

    def test_larger_table_uses_the_20_percent_rule(self):
        """>20% of cells below 5 is a warning, not a hard block (Cochran)."""
        # 2x3, one sparse column -> 2 of 6 cells (33%) below 5, none below 1
        report = self.guardian.check({"observed": [[20, 20, 3], [20, 20, 4]]}, "chi_square")

        self.assertEqual(len(report.violations), 1)
        self.assertEqual(report.violations[0].severity, "warning")
        self.assertTrue(report.can_proceed)  # warning must not block

    def test_summarize_data_never_500s_on_string_arrays(self):
        """The old crash: string labels must degrade gracefully, not raise."""
        summary = self.guardian._summarize_data(
            [np.array(["Improved", "NotImproved"]), np.array([[1.0, 2.0], [3.0, 4.0]])]
        )
        self.assertIn("note", summary["group_1"])       # strings -> not summarisable
        self.assertEqual(summary["group_2"]["n"], 4)    # 2-D numeric -> flattened
        self.assertAlmostEqual(summary["group_2"]["mean"], 2.5)
