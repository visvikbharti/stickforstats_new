"""Guardian writes p-values the way the site does: significant figures, never a flat zero.

Its violation messages and PDF report wrote p with four fixed decimals, so a normality p-value of
1e-15 read "p=0.0000". On the site that message sits right above the warning's own p-value line,
which the frontend formats ("p-value: 1.00e-15"), so the two contradicted each other. The
normality message also cited the first violating group's p-value while the p_value field beside it
was the smallest. The PDF report's results table showed "N/A" for a p-value of exactly 0.
"""

import io
from dataclasses import replace

import numpy as np
from django.test import SimpleTestCase
from PyPDF2 import PdfReader

from core.guardian.guardian_core import GuardianCore
from core.guardian.p_values import format_p, p_clause
from core.guardian.report_generator import GuardianReportGenerator


class PValueTextTest(SimpleTestCase):
    def test_format_p(self):
        self.assertEqual(format_p(3.2e-9), "3.20e-9")
        self.assertEqual(format_p(0.000999), "9.99e-4")
        self.assertEqual(format_p(0.0312), "0.0312")
        self.assertEqual(format_p(0), "< 2.2e-16")
        self.assertEqual(format_p(None), "—")
        self.assertEqual(format_p(float("nan")), "—")

    def test_p_clause(self):
        self.assertEqual(p_clause(3.2e-9), "p = 3.20e-9")
        self.assertEqual(p_clause(0), "p < 2.2e-16")


class GuardianMessageTest(SimpleTestCase):
    rng = np.random.default_rng(11)

    def violation(self, report, assumption):
        return next(v for v in report.violations if v.assumption == assumption)

    def test_normality_message_cites_the_reported_p_value_with_significant_figures(self):
        # The mildly non-normal group comes first; the reported p-value is the other group's.
        report = GuardianCore().check(
            {"uniform": self.rng.uniform(0, 1, 200).tolist(), "skewed": self.rng.exponential(1, 200).tolist()},
            "t_test",
        )
        v = self.violation(report, "normality")
        self.assertLess(v.p_value, 0.001)
        # (A large-sample note may follow: "(downgraded: N=200 per group; ...)".)
        self.assertTrue(v.message.startswith(f"Normality assumption violated ({p_clause(v.p_value)})"), v.message)
        self.assertNotIn("0.0000", v.message)

    def test_variance_message_writes_p_with_significant_figures(self):
        report = GuardianCore().check(
            {"narrow": self.rng.normal(0, 1, 200).tolist(), "wide": self.rng.normal(0, 12, 200).tolist()},
            "t_test",
        )
        v = self.violation(report, "variance_homogeneity")
        self.assertLess(v.p_value, 0.001)
        self.assertIn(p_clause(v.p_value), v.message)
        self.assertNotIn("0.0000", v.message)


    def test_homoscedasticity_message_writes_p_with_significant_figures(self):
        x = np.linspace(1, 100, 200)
        y = 2 * x + np.random.default_rng(13).normal(0, 1, 200) * x  # the spread grows with x
        v = self.violation(GuardianCore().check([x.tolist(), y.tolist()], "regression"), "homoscedasticity")
        self.assertLess(v.p_value, 0.001)
        self.assertIn(f"BP test {p_clause(v.p_value)},", v.message)

    def test_independence_message_writes_p_with_significant_figures(self):
        walk = np.cumsum(np.random.default_rng(14).normal(0, 1, 200))
        report = GuardianCore().check(
            {"a": walk.tolist(), "b": (walk + 5).tolist()}, "t_test", observation_order="time"
        )
        v = self.violation(report, "independence")
        self.assertLess(v.p_value, 0.001)
        self.assertIn(f"{p_clause(v.p_value)}).", v.message)


class GuardianPdfTest(SimpleTestCase):
    def pdf_text(self, p_value):
        rng = np.random.default_rng(12)
        report = GuardianCore().check(
            {"a": rng.exponential(1, 200).tolist(), "b": rng.normal(0, 1, 200).tolist()}, "t_test"
        )
        report.violations = [replace(v, p_value=p_value) if v.assumption == "normality" else v for v in report.violations]
        pdf = GuardianReportGenerator().generate_pdf(report)
        self.assertTrue(pdf.startswith(b"%PDF"))
        return "".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf)).pages)

    def test_pdf_writes_p_with_significant_figures(self):
        text = self.pdf_text(3.2e-9)
        self.assertIn("P-value: 3.20e-9", text)
        self.assertNotIn("0.0000", text)

    def test_pdf_writes_an_exact_zero_as_a_bound_in_the_table_and_the_details(self):
        text = self.pdf_text(0.0)
        self.assertIn("P-value: < 2.2e-16", text)
        self.assertGreaterEqual(text.count("< 2.2e-16"), 2)  # results table too, where it said N/A
