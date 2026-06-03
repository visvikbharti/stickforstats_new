"""Tests for ReportingCompletenessValidator's nearby-statistic check.

Regression guard for the false-positive where a statistic written next to a
bare p-value (e.g. "F = 1122.10, p = 1.34e-35", which the df-requiring
extractor patterns don't capture onto the p-value claim) was reported as
"test statistic missing".
"""

from django.test import TestCase

from core.manuscript.advanced_validators import ReportingCompletenessValidator
from core.manuscript.claim_extractor import StatisticalClaimExtractor


def _descriptions(text):
    claims = StatisticalClaimExtractor().extract(text, section="results")
    findings = ReportingCompletenessValidator().validate(text, claims)
    return " || ".join(f.description for f in findings), claims


class ReportingCompletenessNearbyStatTests(TestCase):
    def test_statistic_nearby_not_flagged_missing(self):
        # F / W / H are present in the text right beside the p-values, even
        # though the strict patterns don't attach them to the p claims.
        text = (
            "One-way ANOVA: F = 1122.10, p = 1.34e-35. "
            "Shapiro-Wilk W = 0.793, p = 0.012. "
            "Kruskal-Wallis H = 36.59, p = 5.62e-08."
        )
        descs, claims = _descriptions(text)
        self.assertTrue(claims, "expected the extractor to find the p-value claims")
        self.assertNotIn("test statistic missing", descs)

    def test_truly_missing_statistic_is_flagged(self):
        text = "The group difference was statistically significant (p = 0.03)."
        descs, claims = _descriptions(text)
        self.assertTrue(claims)
        self.assertIn("test statistic missing", descs)

    def test_t_test_with_df_unaffected(self):
        # A fully-specified t-test claim is captured WITH its statistic, so it
        # was never flagged and still isn't.
        text = "An independent t-test, t(58) = 2.01, p = 0.049, indicated a difference."
        descs, _ = _descriptions(text)
        self.assertNotIn("test statistic missing", descs)
