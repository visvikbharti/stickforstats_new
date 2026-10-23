"""
The genomics page defines "confidence" in words that quote the formula's values (issue #31 item 6):
100% when every check passes, 81% for one failure at 0.01 <= p < 0.05 or one check that could not
be computed, 72% for one failure at p < 0.01, and a floor of 17% -- shown as 16.7% where the page
prints one decimal (frontend/src/utils/genomicsConfidence.js).

Those numbers are only true while the service computes them. This file pins them, so a change to
the formula fails here -- and whoever changes it must then update the wording in that file too. The
checks' p-values are set directly, because crafting data that lands Shapiro-Wilk in a given band
would test the data, not the formula.
"""

from unittest import mock

import numpy as np
from django.test import SimpleTestCase

from core.services.genomics import differential_expression as de

PASS, MILD, SEVERE, UNCOMPUTABLE = 0.5, 0.03, 0.001, float("nan")


def confidence(shapiro_group1, shapiro_group2, levene):
    """guardian_confidence for one two-group gene whose three checks return these p-values."""
    shapiro_ps = iter([shapiro_group1, shapiro_group2])
    with mock.patch.object(de.stats, "shapiro", side_effect=lambda _data: (0.9, next(shapiro_ps))), \
            mock.patch.object(de.stats, "levene", return_value=(1.0, levene)):
        gene = de.DifferentialExpressionService(input_scale="log2")._test_two_groups(
            "G", np.arange(6.0), np.arange(6.0) + 1.0
        )
    # What the page receives: GeneResult.to_dict rounds to 4 decimals.
    return gene.to_dict()["guardian_confidence"]


class TheValuesTheConfidenceDefinitionQuotes(SimpleTestCase):
    def test_every_check_passing_is_100_percent(self):
        self.assertEqual(confidence(PASS, PASS, PASS), 1.0)

    def test_one_mild_failure_is_81_percent(self):
        for case in [(MILD, PASS, PASS), (PASS, MILD, PASS), (PASS, PASS, MILD)]:
            with self.subTest(p_values=case):
                self.assertEqual(round(100 * confidence(*case)), 81)

    def test_one_uncomputable_check_is_also_81_percent(self):
        for case in [(UNCOMPUTABLE, PASS, PASS), (PASS, PASS, UNCOMPUTABLE)]:
            with self.subTest(p_values=case):
                self.assertEqual(round(100 * confidence(*case)), 81)

    def test_one_failure_below_001_is_72_percent(self):
        for case in [(SEVERE, PASS, PASS), (PASS, PASS, SEVERE)]:
            with self.subTest(p_values=case):
                self.assertEqual(round(100 * confidence(*case)), 72)

    def test_the_p_value_boundaries_the_wording_states(self):
        # "one failure at 0.01 <= p < 0.05 ... gives 81%": p = 0.05 is a pass, p = 0.01 a mild
        # failure, for the normality checks and for Levene's test alike.
        for case in [(0.05, PASS, PASS), (PASS, PASS, 0.05)]:
            with self.subTest(p_values=case):
                self.assertEqual(confidence(*case), 1.0)
        for case in [(0.01, PASS, PASS), (PASS, PASS, 0.01)]:
            with self.subTest(p_values=case):
                self.assertEqual(round(100 * confidence(*case)), 81)

    def test_the_floor_is_17_percent_or_16_point_7_to_one_decimal(self):
        floor = confidence(SEVERE, SEVERE, SEVERE)
        self.assertEqual(round(100 * floor), 17)
        self.assertEqual(round(100 * floor, 1), 16.7)

    def test_nothing_scores_below_the_floor(self):
        # The definition says 17% is the lowest possible score: an uncomputable check costs
        # less than a failure at p < 0.01, so no combination of outcomes goes lower.
        outcomes = (PASS, MILD, SEVERE, UNCOMPUTABLE)
        lowest = min(confidence(a, b, c) for a in outcomes for b in outcomes for c in outcomes)
        self.assertEqual(lowest, confidence(SEVERE, SEVERE, SEVERE))

    def test_a_gene_with_the_green_check_can_still_have_been_switched(self):
        # The page's check mark means >= 80%; one mild variance failure scores 81% AND sends the
        # gene to Welch's t-test -- which is why the definition does not say "assumptions met".
        shapiro_ps = iter([PASS, PASS])
        with mock.patch.object(de.stats, "shapiro", side_effect=lambda _data: (0.9, next(shapiro_ps))), \
                mock.patch.object(de.stats, "levene", return_value=(1.0, MILD)):
            gene = de.DifferentialExpressionService(input_scale="log2")._test_two_groups(
                "G", np.arange(6.0), np.arange(6.0) + 1.0
            )
        self.assertGreaterEqual(gene.guardian_confidence, 0.8)
        self.assertEqual(gene.test_used, "welch_t_test")
