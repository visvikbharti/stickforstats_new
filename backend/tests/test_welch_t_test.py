"""
Welch's t-test on the demo file, end to end.
============================================

Guardian recommends "welch_t_test" when an independent t-test's groups have unequal
variances, and until now nothing on the hub could run it. The hub runs it as the
two-sample t-test with ``equal_variance: false`` and asks Guardian to check it as
``welch_t_test``: normality within each group and outliers as before, with the
variance check reported as information, never as a violation.

The numbers are those of ``fixtures/guardian_demo_long.csv`` (Treatment n = 10,
Control n = 40), in the order the page sends the groups: Treatment minus Control.
The independent-samples t-test on the same file must be unchanged, and still blocked.
"""

import csv
from pathlib import Path

from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from scipy import stats

FIXTURE = Path(__file__).parent / "fixtures" / "guardian_demo_long.csv"
TTEST_URL = "/api/v1/stats/ttest/"
GUARDIAN_URL = "/api/guardian/check/"


def demo_groups():
    """{group: values} in first-appearance order, as ParametricTests builds it."""
    groups = {}
    with FIXTURE.open(newline="") as f:
        for row in csv.DictReader(f):
            groups.setdefault(row["group"], []).append(float(row["measurement"]))
    return groups


@override_settings(SECURE_SSL_REDIRECT=False)
class WelchOnTheDemoFileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.groups = demo_groups()
        self.treatment = self.groups["Treatment"]
        self.control = self.groups["Control"]

    def _ttest(self, **extra):
        body = {
            "test_type": "two_sample",
            "data1": self.treatment,
            "data2": self.control,
            "alternative": "two-sided",
            "parameters": {"mu": 0},
            **extra,
        }
        r = self.client.post(TTEST_URL, body, format="json")
        self.assertEqual(r.status_code, 200, r.content[:400])
        return r.json()["high_precision_result"]

    def _guardian(self, test_type):
        body = {"data": self.groups, "test_type": test_type, "alpha": 0.05, "design": "independent"}
        r = self.client.post(GUARDIAN_URL, body, format="json")
        self.assertEqual(r.status_code, 200, r.content[:400])
        return r.json()

    def test_the_fixture_is_the_demo_file(self):
        self.assertEqual(list(self.groups), ["Treatment", "Control"])
        self.assertEqual((len(self.treatment), len(self.control)), (10, 40))

    def test_welch_numbers(self):
        hp = self._ttest(equal_variance=False)
        self.assertAlmostEqual(float(hp["mean1"]), 91.6300, places=4)
        self.assertAlmostEqual(float(hp["mean2"]), 98.9725, places=4)
        self.assertAlmostEqual(float(hp["mean_diff"]), -7.3425, places=4)
        self.assertAlmostEqual(float(hp["se"]), 5.4594, places=4)
        self.assertAlmostEqual(float(hp["t_statistic"]), -1.3449, places=4)
        self.assertAlmostEqual(float(hp["p_value"]), 0.2097, places=4)
        self.assertAlmostEqual(float(hp["ci_lower"]), -19.585, places=3)
        self.assertAlmostEqual(float(hp["ci_upper"]), 4.900, places=3)
        self.assertEqual(hp["ci_level"], 0.95)

    def test_welch_df_is_fractional(self):
        df = float(self._ttest(equal_variance=False)["df"])
        self.assertAlmostEqual(df, 9.5521, places=4)
        self.assertNotEqual(df, round(df))

    def test_welch_matches_scipy(self):
        hp = self._ttest(equal_variance=False)
        reference = stats.ttest_ind(self.treatment, self.control, equal_var=False)
        self.assertAlmostEqual(float(hp["t_statistic"]), reference.statistic, places=10)
        self.assertAlmostEqual(float(hp["p_value"]), reference.pvalue, places=10)

    def test_the_independent_t_test_is_unchanged(self):
        hp = self._ttest()
        self.assertAlmostEqual(float(hp["t_statistic"]), -2.2830, places=4)
        self.assertEqual(float(hp["df"]), 48)
        self.assertAlmostEqual(float(hp["p_value"]), 0.0269, places=4)

    def test_guardian_does_not_block_welch(self):
        report = self._guardian("welch_t_test")
        self.assertTrue(report["can_proceed"], report["violations"])
        self.assertEqual(report["violations"], [])
        self.assertIn("normality", report["assumptions_checked"])
        self.assertIn("outliers", report["assumptions_checked"])
        self.assertNotIn("variance_homogeneity", report["assumptions_checked"])
        self.assertNotIn("welch_t_test", report["alternative_tests"])
        # Each group is comfortably normal, so normality is not what decides it.
        self.assertAlmostEqual(stats.shapiro(self.treatment).pvalue, 0.9989, places=4)
        self.assertAlmostEqual(stats.shapiro(self.control).pvalue, 0.3132, places=4)

    def test_guardian_reports_welchs_variance_check_as_information(self):
        [info] = self._guardian("welch_t_test")["information"]
        self.assertEqual(info["assumption"], "variance_homogeneity")
        self.assertEqual(info["message"], "Welch's test does not assume equal variances")
        # Guardian's Levene is median-centred (Brown-Forsythe): p = 5.5e-5 here. The
        # mean-centred Levene gives 4.7e-5. Either way the variances differ.
        self.assertAlmostEqual(info["p_value"], 5.524e-05, delta=0.001e-05)
        self.assertAlmostEqual(
            stats.levene(self.treatment, self.control, center="mean").pvalue, 4.67e-05, delta=0.01e-05
        )

    def test_guardian_still_blocks_the_independent_t_test(self):
        report = self._guardian("t_test")
        self.assertFalse(report["can_proceed"])
        [variance] = [v for v in report["violations"] if v["assumption"] == "variance_homogeneity"]
        self.assertEqual(variance["severity"], "critical")
        self.assertAlmostEqual(variance["p_value"], 5.524e-05, delta=0.001e-05)
        self.assertIn("welch_t_test", report["alternative_tests"])
        self.assertEqual(report["information"], [])
