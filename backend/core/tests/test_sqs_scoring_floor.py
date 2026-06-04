"""
Regression tests for SQS score non-negativity (robustness audit 2026-06-04, F-05).

Penalty rules (e.g. PR002, threshold-only p-values, points = -2) subtract from a
category's raw score but contribute 0 to its maximum. With only an upper cap
(`min(weighted_score, weighted_max)`) and no lower floor, a penalty-heavy
manuscript produced a NEGATIVE category percentage (e.g. -13.3%) and could drag
the overall SQS below zero -- a meaningless number on a 0-100 quality scale that
also broke the frontend progress-bar width math. The public
/api/v1/sqs/analyze-text/ endpoint returned this verbatim.

The fix floors every category score at 0. These tests pin that no category or
total score/percentage is ever negative, while a normal manuscript is unaffected.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from core.sqs_scoring import SQSScorer


class TestSqsScoreFloor(SimpleTestCase):
    def setUp(self):
        self.scorer = SQSScorer()

    def _assert_bounds(self, report):
        for cat, cs in report.category_scores.items():
            self.assertGreaterEqual(cs.score, 0.0, msg=f"category '{cat}' score is negative")
            self.assertGreaterEqual(cs.percentage, 0.0, msg=f"category '{cat}' percentage is negative")
            self.assertLessEqual(cs.percentage, 100.0 + 1e-9, msg=f"category '{cat}' percentage exceeds 100")
        self.assertGreaterEqual(report.total_score, 0.0)
        self.assertGreaterEqual(report.percentage, 0.0)
        self.assertLessEqual(report.percentage, 100.0 + 1e-9)
        self.assertIn(report.grade, {"A", "B", "C", "D", "F"})

    def test_penalty_heavy_text_never_scores_negative(self):
        # Threshold-only p-values trigger the PR002 penalty with no offsetting
        # precision points -> previously a negative Statistical Precision category.
        text = (
            "We found a significant difference (p < .05). A second comparison was "
            "also significant (p < .01). A third comparison was not significant "
            "(p > .05). No effect sizes or confidence intervals are reported."
        )
        report = self.scorer.analyze(text)
        self._assert_bounds(report)

    def test_empty_text_is_bounded(self):
        report = self.scorer.analyze("")
        self._assert_bounds(report)

    def test_normal_manuscript_unaffected_and_bounded(self):
        # A reporting-rich text should still score positively and stay within bounds.
        text = (
            "An independent-samples t-test showed a significant effect, "
            "t(98) = 2.34, p = .021, Cohen's d = 0.47, 95% CI [0.05, 0.89]. "
            "The sample size (N = 100) was determined by an a priori power analysis "
            "(power = .80, alpha = .05). Data and analysis code are available on OSF."
        )
        report = self.scorer.analyze(text)
        self._assert_bounds(report)
        self.assertGreater(report.total_score, 0.0)
