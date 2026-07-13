"""
Parameters the API accepted and then ignored.
=============================================

A knob that does nothing is worse than a missing knob: the user sets it, the request
validates, the response comes back looking exactly as it should, and it answers a different
question than the one they asked.

Each test below corresponds to a parameter this API validated and then dropped on the floor.
"""

from __future__ import annotations

import json

import numpy as np
from django.test import TestCase, override_settings
from scipy import stats


@override_settings(SECURE_SSL_REDIRECT=False)
class TTestHonoursMu(TestCase):
    URL = "/api/v1/stats/ttest/"

    def _post(self, body):
        return self.client.post(self.URL, data=json.dumps(body), content_type="application/json")

    def test_top_level_mu_is_used(self):
        # The serializer accepts a top-level `mu` (and canonicalizes `hypothesized_mean` to
        # it). The view read only the NESTED parameters.mu, so every direct-API and SDK caller
        # sending {"mu": 100} was silently tested against mu = 0.
        data = [98, 101, 99, 102, 100]

        response = self._post({"test_type": "one_sample", "data1": data, "mu": 50})
        self.assertEqual(response.status_code, 200)
        t = float(response.json()["high_precision_result"]["t_statistic"])

        self.assertAlmostEqual(t, float(stats.ttest_1samp(data, 50).statistic), places=6)

        # ...and a different mu must give a different t. It used to give the same one.
        other = self._post({"test_type": "one_sample", "data1": data, "mu": 100})
        t_other = float(other.json()["high_precision_result"]["t_statistic"])
        self.assertNotAlmostEqual(t, t_other, places=6)

    def test_nested_mu_still_works(self):
        data = [98, 101, 99, 102, 100]
        response = self._post({"test_type": "one_sample", "data1": data, "parameters": {"mu": 50}})
        t = float(response.json()["high_precision_result"]["t_statistic"])
        self.assertAlmostEqual(t, float(stats.ttest_1samp(data, 50).statistic), places=6)


@override_settings(SECURE_SSL_REDIRECT=False)
class UnrecognizedAlternativeIsRejected(TestCase):
    URL = "/api/v1/stats/ttest/"

    def test_a_typo_is_a_400_not_a_silent_two_sided_test(self):
        # "greatr" used to be silently replaced with "two-sided": the caller asked for a
        # one-tailed test, got a two-tailed one, and was told it was the test they asked for.
        response = self.client.post(
            self.URL,
            data=json.dumps(
                {"test_type": "two_sample", "data1": [1, 2, 3], "data2": [4, 5, 6], "alternative": "greatr"}
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("alternative", json.dumps(response.json()))

    def test_a_real_alternative_still_works(self):
        for alternative in ("two-sided", "less", "greater", "two_sided"):
            with self.subTest(alternative=alternative):
                response = self.client.post(
                    self.URL,
                    data=json.dumps(
                        {
                            "test_type": "two_sample",
                            "data1": [1, 2, 3, 4],
                            "data2": [5, 6, 7, 8],
                            "alternative": alternative,
                        }
                    ),
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, 200)


@override_settings(SECURE_SSL_REDIRECT=False)
class CategoricalHonoursAlphaAndExact(TestCase):
    def _chi_square(self, table, alpha):
        response = self.client.post(
            "/api/v1/categorical/chi-square/independence/",
            data=json.dumps({"contingency_table": table, "alpha": alpha}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        return response.json()["results"]

    def test_alpha_changes_the_verdict(self):
        # p = 0.0346: significant at 0.05, NOT significant at 0.01. The interpretation string
        # hard-coded 0.05 while the view parsed alpha and threw it away, so BOTH used to say
        # "statistically significant".
        table = [[26, 19], [16, 29]]

        at_five = self._chi_square(table, 0.05)
        at_one = self._chi_square(table, 0.01)

        self.assertAlmostEqual(float(at_five["p_value"]), 0.0346, places=3)
        self.assertIn("is statistically significant", at_five["interpretation"])
        self.assertIn("not statistically significant", at_one["interpretation"])

    def _mcnemar(self, table, **extra):
        response = self.client.post(
            "/api/v1/categorical/mcnemar/",
            data=json.dumps({"table": table, **extra}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        return response.json()["results"]

    def test_exact_flag_is_honoured(self):
        # `exact` was read and discarded, so a request for the exact binomial test ran the
        # asymptotic chi-square instead. They give different p-values.
        table = [[30, 12], [5, 25]]

        exact = self._mcnemar(table, exact=True)
        asymptotic = self._mcnemar(table, exact=False)

        self.assertIn("exact", exact["test_name"].lower())
        self.assertIn("asymptotic", asymptotic["test_name"].lower())
        self.assertNotAlmostEqual(float(exact["p_value"]), float(asymptotic["p_value"]), places=4)

        # The exact one is scipy's exact binomial on the discordant pairs.
        reference = stats.binomtest(5, 17, 0.5).pvalue
        self.assertAlmostEqual(float(exact["p_value"]), reference, places=9)

    def test_no_discordant_pairs_is_undefined(self):
        # Nobody changed in either direction: McNemar's statistic is (b - c)^2 / (b + c) = 0/0.
        # It used to report chi-square = 0, p = 1.0 -- "no significant change", stated
        # confidently, from a table containing no information about change at all.
        result = self._mcnemar([[30, 0], [0, 25]])
        self.assertIsNone(result["test_statistic"])
        self.assertIsNone(result["p_value"])
        self.assertIn("undefined", result["interpretation"].lower())


@override_settings(SECURE_SSL_REDIRECT=False)
class AncovaProducesRealNumbers(TestCase):
    URL = "/api/v1/stats/ancova/"

    def test_matches_statsmodels(self):
        # This endpoint has never produced an F-statistic. The view read key names the service
        # does not return, so every `.get(key, "N/A")` fell through and the response carried the
        # literal STRING "N/A" for the F, the p-value, every sum of squares and every degree of
        # freedom -- while reporting "precision": 50 and "Results are reliable."
        #
        # And once the keys were fixed, the numbers were still wrong: the covariate's sum of
        # squares was computed while IGNORING the groups (a Type I SS with the covariate first),
        # so it absorbed between-group variation belonging to the factor. ANCOVA is now the
        # standard model comparison, which is what statsmodels/R/SPSS all report.
        rng = np.random.default_rng(5)
        covariate = [float(v) for v in rng.normal(10, 2, 30)]
        groups = [
            [float(v) for v in rng.normal(20, 2, 10)],
            [float(v) for v in rng.normal(23, 2, 10)],
            [float(v) for v in rng.normal(26, 2, 10)],
        ]

        response = self.client.post(
            self.URL,
            data=json.dumps(
                {
                    "groups": groups,
                    "covariates": [covariate],
                    "covariate_names": ["age"],
                    "options": {"generate_visualizations": False},
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()["ancova_result"]

        # Not the string "N/A".
        for key in ("f_statistic_group", "p_value_group", "f_statistic_covariate", "ss_error"):
            with self.subTest(key=key):
                self.assertIsNotNone(result[key])
                self.assertNotEqual(result[key], "N/A")
                float(result[key])  # parses as a number

        import pandas as pd
        import statsmodels.api as sm
        import statsmodels.formula.api as smf

        frame = pd.DataFrame(
            {
                "y": groups[0] + groups[1] + groups[2],
                "grp": ["A"] * 10 + ["B"] * 10 + ["C"] * 10,
                "age": covariate,
            }
        )
        reference = sm.stats.anova_lm(smf.ols("y ~ C(grp) + age", data=frame).fit(), typ=2)

        self.assertAlmostEqual(
            float(result["f_statistic_group"]), float(reference.loc["C(grp)", "F"]), places=8
        )
        self.assertAlmostEqual(
            float(result["p_value_group"]), float(reference.loc["C(grp)", "PR(>F)"]), places=12
        )
        self.assertAlmostEqual(
            float(result["f_statistic_covariate"]), float(reference.loc["age", "F"]), places=8
        )

    def test_adjusted_means_are_per_group_not_a_dataframe_repr(self):
        rng = np.random.default_rng(11)
        response = self.client.post(
            self.URL,
            data=json.dumps(
                {
                    "groups": [
                        [float(v) for v in rng.normal(20, 2, 8)],
                        [float(v) for v in rng.normal(24, 2, 8)],
                    ],
                    "covariates": [[float(v) for v in rng.normal(10, 2, 16)]],
                    "covariate_names": ["age"],
                    "options": {"generate_visualizations": False},
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        adjusted = response.json()["adjusted_means"]

        # It used to be `{str(k): str(v) for k, v in dataframe.items()}`, which iterates
        # COLUMNS -- so the response contained the stringified repr of a pandas Series
        # ("0    11.478397\n1    13.798941\nName: Adjusted_Mean, dtype: float64").
        self.assertEqual(len(adjusted), 2)
        for group, stats_for_group in adjusted.items():
            with self.subTest(group=group):
                self.assertIsInstance(stats_for_group, dict)
                self.assertIn("adjusted_mean", stats_for_group)
                float(stats_for_group["adjusted_mean"])
                self.assertNotIn("dtype", str(stats_for_group))


class GenomicsUsesOneDefinitionOfSignificance(TestCase):
    def test_alpha_and_fold_change_reach_the_per_gene_table(self):
        from core.services.genomics.differential_expression import DifferentialExpressionService

        rng = np.random.default_rng(3)
        # 20 genes, 10 samples, 5 per group. A handful genuinely differ.
        matrix = rng.normal(5, 1, (20, 10))
        matrix[:4, 5:] += 3.0  # 4 strongly differential genes
        gene_names = [f"G{i}" for i in range(20)]
        labels = ["control"] * 5 + ["treatment"] * 5

        service = DifferentialExpressionService(alpha=0.01)
        result = service.analyze(
            expression_matrix=matrix,
            gene_names=gene_names,
            group_labels=labels,
            group1_name="control",
            group2_name="treatment",
        )

        # `GeneResult.to_dict()` hard-coded `adj_p < 0.05` while the summary and the volcano
        # used self.alpha, so ONE response carried two different alphas -- and the per-gene
        # table, the one a user actually reads, used the wrong one.
        genes = [g.to_dict() for g in result.gene_results]
        for gene in genes:
            with self.subTest(gene=gene["gene_name"]):
                if gene["adjusted_p_value"] is None:
                    self.assertFalse(gene["significant"])
                else:
                    self.assertEqual(gene["significant"], gene["adjusted_p_value"] < 0.01)

        table_count = sum(1 for g in genes if g["significant"])
        self.assertEqual(table_count, result.n_significant)

    def test_fold_change_threshold_is_enforced_not_just_drawn(self):
        from core.services.genomics.differential_expression import DifferentialExpressionService

        rng = np.random.default_rng(7)
        matrix = rng.normal(5, 0.2, (10, 10))
        matrix[0, 5:] += 0.3  # a highly significant but TINY fold change
        matrix[1, 5:] += 4.0  # a large one
        labels = ["control"] * 5 + ["treatment"] * 5
        names = [f"G{i}" for i in range(10)]

        # The volcano plot draws the user's fold-change cutoff as two vertical lines. It was
        # never applied: significance was adjusted-p only, so points well inside the lines were
        # still coloured and counted as significant.
        strict = DifferentialExpressionService(alpha=0.05, log2fc_threshold=1.0)
        result = strict.analyze(
            expression_matrix=matrix,
            gene_names=names,
            group_labels=labels,
            group1_name="control",
            group2_name="treatment",
        )
        by_name = {g.gene_name: g.to_dict() for g in result.gene_results}

        # G0's fold change is far below the 1.0 cutoff the caller set.
        self.assertLess(abs(by_name["G0"]["log2_fold_change"]), 1.0)
        self.assertFalse(by_name["G0"]["significant"])
