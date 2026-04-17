"""
Regression tests for HighPrecisionANOVA.post_hoc_test and the
/api/v1/stats/anova/ endpoint's ``post_hoc`` code path.

Prior to 2026-04-17 the view called a non-existent ``post_hoc_test``
attribute, raising ``AttributeError`` and returning HTTP 500 whenever
clients requested Tukey/Bonferroni/Scheffe/Games-Howell post-hoc tests.
These tests pin the fix so the regression cannot silently return.
"""
from __future__ import annotations

from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from core.hp_anova_comprehensive import HighPrecisionANOVA, PostHocTest


class HighPrecisionANOVAPostHocUnitTests(TestCase):
    """Exercise the public post_hoc_test wrapper directly."""

    def setUp(self) -> None:
        self.calc = HighPrecisionANOVA(precision=50)
        # Three small, well-separated groups so post-hoc is informative.
        self.group_a = [1.5, 2.5, 3.5, 4.5, 5.5]
        self.group_b = [3.6, 4.6, 5.6, 6.6, 7.6]
        self.group_c = [5.7, 6.7, 7.7, 8.7, 9.7]

    def _assert_pairwise_shape(self, result: dict) -> None:
        self.assertEqual(
            sorted(result.keys()),
            ["Group_1_vs_Group_2", "Group_1_vs_Group_3", "Group_2_vs_Group_3"],
        )
        for entry in result.values():
            self.assertIsInstance(entry, dict)
            self.assertIn("mean_difference", entry)

    def test_tukey(self) -> None:
        result = self.calc.post_hoc_test(
            self.group_a, self.group_b, self.group_c, method="tukey"
        )
        self._assert_pairwise_shape(result)
        self.assertIn("q_statistic", result["Group_1_vs_Group_2"])

    def test_tukey_hsd_alias(self) -> None:
        result_a = self.calc.post_hoc_test(
            self.group_a, self.group_b, self.group_c, method="tukey"
        )
        result_b = self.calc.post_hoc_test(
            self.group_a, self.group_b, self.group_c, method="tukey_hsd"
        )
        self.assertEqual(result_a.keys(), result_b.keys())
        self.assertEqual(
            result_a["Group_1_vs_Group_2"]["q_statistic"],
            result_b["Group_1_vs_Group_2"]["q_statistic"],
        )

    def test_bonferroni(self) -> None:
        result = self.calc.post_hoc_test(
            self.group_a, self.group_b, self.group_c, method="bonferroni"
        )
        self._assert_pairwise_shape(result)

    def test_scheffe(self) -> None:
        result = self.calc.post_hoc_test(
            self.group_a, self.group_b, self.group_c, method="scheffe"
        )
        self._assert_pairwise_shape(result)

    def test_games_howell(self) -> None:
        result = self.calc.post_hoc_test(
            self.group_a, self.group_b, self.group_c, method="games_howell"
        )
        self._assert_pairwise_shape(result)

    def test_unknown_method_raises(self) -> None:
        with self.assertRaises(ValueError):
            self.calc.post_hoc_test(
                self.group_a, self.group_b, self.group_c, method="not_a_method"
            )

    def test_too_few_groups_raises(self) -> None:
        with self.assertRaises(ValueError):
            self.calc.post_hoc_test(self.group_a, method="tukey")

    def test_correction_attaches_adjusted_p_values(self) -> None:
        """Pairwise tests that produce p-values get an ``p_value_adjusted`` key."""
        result = self.calc.post_hoc_test(
            self.group_a,
            self.group_b,
            self.group_c,
            method="bonferroni",
            correction="bonferroni",
        )
        has_p = any(
            "p_value" in entry for entry in result.values() if isinstance(entry, dict)
        )
        if has_p:
            adjusted_present = any(
                "p_value_adjusted" in entry
                for entry in result.values()
                if isinstance(entry, dict)
            )
            self.assertTrue(
                adjusted_present,
                "Expected at least one p_value_adjusted entry after correction.",
            )

    def test_post_hoc_test_enum_coverage(self) -> None:
        """Every enum alias we accept maps to a real PostHocTest member."""
        enum_values = {member.value for member in PostHocTest}
        for alias, member in HighPrecisionANOVA._POST_HOC_ALIASES.items():
            self.assertIn(member.value, enum_values, msg=f"alias {alias!r}")


@override_settings(SECURE_SSL_REDIRECT=False)
class ANOVAPostHocAPITests(TestCase):
    """Exercise the /api/v1/stats/anova/ endpoint with a post_hoc payload."""

    def setUp(self) -> None:
        self.client = APIClient()
        self.url = "/api/v1/stats/anova/"
        self.payload = {
            "anova_type": "one_way",
            "groups": [
                [1.5, 2.5, 3.5, 4.5, 5.5],
                [3.6, 4.6, 5.6, 6.6, 7.6],
                [5.7, 6.7, 7.7, 8.7, 9.7],
            ],
            "alpha": 0.05,
            "post_hoc": "tukey",
            "correction": "none",
            "options": {
                "check_assumptions": False,
                "generate_visualizations": False,
                "compare_standard": False,
            },
        }

    def test_tukey_post_hoc_returns_200(self) -> None:
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            msg=response.content.decode("utf-8", errors="replace"),
        )
        body = response.json()
        self.assertIn("post_hoc_results", body)
        self.assertIsNotNone(body["post_hoc_results"])
        self.assertEqual(
            sorted(body["post_hoc_results"].keys()),
            ["Group_1_vs_Group_2", "Group_1_vs_Group_3", "Group_2_vs_Group_3"],
        )

    def test_bonferroni_post_hoc_returns_200(self) -> None:
        payload = {**self.payload, "post_hoc": "bonferroni", "correction": "bonferroni"}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            msg=response.content.decode("utf-8", errors="replace"),
        )
        body = response.json()
        self.assertIsNotNone(body.get("post_hoc_results"))
