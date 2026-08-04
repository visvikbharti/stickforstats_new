"""
A log2 fold change must actually be a log2 fold change.

The genomics service used to compute ``log2(mean2 / mean1)`` unconditionally. That is the
fold change only when the matrix is on a LINEAR scale. Fed an already-log2-transformed
matrix -- which is what every RNA-seq workflow in this repository feeds it, including
Case Study 4 -- it returned ``log2`` of a ratio of log-scale means: a quantity with no
fold-change interpretation, reported to users, exported to CSV, and plotted as the x-axis
of the volcano plot.

On a log scale the fold change is the DIFFERENCE of the group means, because
log2(A/B) = log2(A) - log2(B). The size of the error is not cosmetic: on the real
GSE271517 matrix the marker gene MKI67 read +0.23 under the ratio form and +0.97 under
the correct difference.

The bug survived because the scale was an unstated assumption. The fix makes it a
required constructor argument with no default, so a caller that has not decided cannot
silently get the wrong convention.
"""

import numpy as np
from django.test import TestCase

from core.services.genomics.differential_expression import DifferentialExpressionService


def _two_group_labels(n_per_group=6):
    return ["control"] * n_per_group + ["treatment"] * n_per_group


class FoldChangeOnALogScaleIsADifference(TestCase):
    def test_log2_scale_fold_change_is_the_difference_of_group_means(self):
        # Hand-built so the answer is checkable by eye rather than by re-running the code
        # under test: group 1 is all 2.0, group 2 is all 5.0, on a log2 scale.
        # True log2FC = 5.0 - 2.0 = 3.0  (group 2 is 2^3 = 8x higher on the linear scale).
        # The old ratio form would have given log2(5/2) = 1.3219 -- a plausible-looking
        # number that is not a fold change.
        matrix = np.array([[2.0] * 6 + [5.0] * 6])
        service = DifferentialExpressionService(input_scale="log2")

        result = service.analyze(
            expression_matrix=matrix,
            gene_names=["G1"],
            group_labels=_two_group_labels(),
            group1_name="control",
            group2_name="treatment",
        )

        gene = result.gene_results[0]
        self.assertAlmostEqual(gene.log2_fold_change, 3.0, places=10)
        # Guard the specific wrong answer, so reverting the fix fails here loudly.
        self.assertNotAlmostEqual(gene.log2_fold_change, np.log2(5.0 / 2.0), places=3)

    def test_log2_scale_recovers_a_known_fold_change_end_to_end(self):
        # Start on the linear scale with an exact 8-fold difference, apply the same
        # log2(CPM+1)-style transform the genomics pipeline uses, and confirm the service
        # recovers the fold change of the TRANSFORMED values (5.0 - 2.0 = 3.0).
        linear_g1 = np.array([3.0] * 6)       # log2(3+1) = 2.0
        linear_g2 = np.array([31.0] * 6)      # log2(31+1) = 5.0
        matrix = np.log2(np.concatenate([linear_g1, linear_g2]) + 1.0).reshape(1, -1)

        service = DifferentialExpressionService(input_scale="log2")
        result = service.analyze(
            expression_matrix=matrix,
            gene_names=["G1"],
            group_labels=_two_group_labels(),
            group1_name="control",
            group2_name="treatment",
        )
        self.assertAlmostEqual(result.gene_results[0].log2_fold_change, 3.0, places=10)

    def test_log2_scale_fold_change_is_defined_when_a_group_mean_is_zero(self):
        # On a log2 scale a group mean of 0 is ordinary (log2(0+1) = 0 for an unexpressed
        # gene) and the difference is perfectly well defined. The linear-scale guard that
        # returns None for a zero mean must not fire here, or every unexpressed-in-one-arm
        # gene silently loses its fold change and drops off the volcano plot.
        matrix = np.array([[0.0] * 6 + [4.0] * 6])
        service = DifferentialExpressionService(input_scale="log2")

        result = service.analyze(
            expression_matrix=matrix,
            gene_names=["G1"],
            group_labels=_two_group_labels(),
            group1_name="control",
            group2_name="treatment",
        )
        gene = result.gene_results[0]
        self.assertIsNotNone(gene.log2_fold_change)
        self.assertAlmostEqual(gene.log2_fold_change, 4.0, places=10)
        self.assertIn("G1", {p["gene"] for p in result.volcano_data})

    def test_log2_scale_sign_means_higher_in_group_two(self):
        # Direction matters for every "up in metastasis" claim downstream.
        matrix = np.array([
            [7.0] * 6 + [2.0] * 6,   # down in group 2
            [2.0] * 6 + [7.0] * 6,   # up in group 2
        ])
        service = DifferentialExpressionService(input_scale="log2")
        result = service.analyze(
            expression_matrix=matrix,
            gene_names=["DOWN", "UP"],
            group_labels=_two_group_labels(),
            group1_name="control",
            group2_name="treatment",
        )
        by_name = {g.gene_name: g for g in result.gene_results}
        self.assertAlmostEqual(by_name["DOWN"].log2_fold_change, -5.0, places=10)
        self.assertAlmostEqual(by_name["UP"].log2_fold_change, +5.0, places=10)


class FoldChangeOnALinearScaleIsStillARatio(TestCase):
    def test_linear_scale_fold_change_is_log2_of_the_ratio_of_means(self):
        # The fix must not change linear-scale behaviour, which is the API's default and
        # what every existing caller uploading counts relies on.
        # log2(40 / 10) = 2.0
        matrix = np.array([[10.0] * 6 + [40.0] * 6])
        service = DifferentialExpressionService(input_scale="linear")

        result = service.analyze(
            expression_matrix=matrix,
            gene_names=["G1"],
            group_labels=_two_group_labels(),
            group1_name="control",
            group2_name="treatment",
        )
        gene = result.gene_results[0]
        self.assertAlmostEqual(gene.log2_fold_change, 2.0, places=10)
        # And it is NOT the difference, which would be 30.
        self.assertNotAlmostEqual(gene.log2_fold_change, 30.0, places=3)

    def test_linear_scale_still_returns_none_for_a_zero_group_mean(self):
        # Preserved from test_undefined_is_not_zero_part2: log2(x/0) does not exist, and
        # clamping at an epsilon invents a fabricated effect whose magnitude comes from the
        # epsilon rather than the data.
        matrix = np.array([[10.0] * 6 + [0.0] * 6])
        service = DifferentialExpressionService(input_scale="linear")

        result = service.analyze(
            expression_matrix=matrix,
            gene_names=["G1"],
            group_labels=_two_group_labels(),
            group1_name="control",
            group2_name="treatment",
        )
        self.assertIsNone(result.gene_results[0].log2_fold_change)
        self.assertNotIn("G1", {p["gene"] for p in result.volcano_data})


class TheInputScaleCannotBeLeftUnstated(TestCase):
    def test_constructing_without_an_input_scale_is_a_TypeError(self):
        # No default. A caller that has not decided which scale its matrix is on cannot be
        # given a plausible wrong answer -- this is the whole point of the fix.
        with self.assertRaises(TypeError):
            DifferentialExpressionService()  # noqa: PLE1120 - intentional

    def test_an_unrecognised_input_scale_raises_rather_than_falling_back(self):
        # "log" / "ln" / "log10" are all plausible typos. None of them may quietly behave
        # like one of the two supported scales.
        for bad in ("log", "ln", "log10", "LINEAR", "", None):
            with self.subTest(input_scale=bad):
                with self.assertRaises(ValueError):
                    DifferentialExpressionService(input_scale=bad)

    def test_the_declared_scale_is_echoed_in_the_result(self):
        # A reader of the output must be able to tell which convention produced the numbers.
        matrix = np.array([[2.0] * 6 + [5.0] * 6])
        for scale in ("linear", "log2"):
            with self.subTest(input_scale=scale):
                result = DifferentialExpressionService(input_scale=scale).analyze(
                    expression_matrix=matrix,
                    gene_names=["G1"],
                    group_labels=_two_group_labels(),
                    group1_name="control",
                    group2_name="treatment",
                )
                self.assertEqual(result.input_scale, scale)
                self.assertEqual(result.to_dict()["summary"]["input_scale"], scale)

    def test_the_two_scales_disagree_on_the_same_matrix(self):
        # The two conventions are not interchangeable; if this ever passes trivially, the
        # scale parameter has stopped doing anything.
        matrix = np.array([[2.0] * 6 + [5.0] * 6])
        kwargs = dict(
            expression_matrix=matrix,
            gene_names=["G1"],
            group_labels=_two_group_labels(),
            group1_name="control",
            group2_name="treatment",
        )
        linear = DifferentialExpressionService(input_scale="linear").analyze(**kwargs)
        log2 = DifferentialExpressionService(input_scale="log2").analyze(**kwargs)

        self.assertAlmostEqual(linear.gene_results[0].log2_fold_change, np.log2(2.5), places=10)
        self.assertAlmostEqual(log2.gene_results[0].log2_fold_change, 3.0, places=10)
        self.assertNotAlmostEqual(
            linear.gene_results[0].log2_fold_change,
            log2.gene_results[0].log2_fold_change,
            places=3,
        )


class MultiGroupMustNotReportAZeroFoldChangeTests(TestCase):
    """A quantity that does not apply must read as missing, not as zero.

    ``log2_fold_change``, ``mean_group1`` and ``mean_group2`` describe a
    TWO-group contrast, and ``analyze()`` assigns them only on that path. Their
    dataclass defaults were 0.0, so every gene in a three-or-more-group analysis
    reported:

        log2_fold_change = 0.0, mean_group1 = 0.0, mean_group2 = 0.0

    on data whose group means were about 8 on the log2 scale. "0.0" is not the
    absence of a value, it is the claim that the means are zero and that there
    is no change between groups -- both false, and both indistinguishable in the
    output from a real two-group result that happened to be flat.
    """

    def _three_group_result(self):
        rng = np.random.default_rng(5)
        matrix = rng.normal(8, 1, (5, 15))
        matrix[:2, 10:] += 3.0
        return DifferentialExpressionService(input_scale="log2").analyze(
            expression_matrix=matrix,
            group_labels=["A"] * 5 + ["B"] * 5 + ["C"] * 5,
            gene_names=[f"g{i}" for i in range(5)],
        )

    def test_three_groups_report_no_fold_change_rather_than_zero(self):
        result = self._three_group_result()
        self.assertTrue(result.gene_results, "premise: genes were analysed")
        for gene in result.gene_results:
            with self.subTest(gene=gene.gene_name):
                self.assertIsNone(
                    gene.log2_fold_change,
                    f"{gene.gene_name} reported a fold change of "
                    f"{gene.log2_fold_change} for a {gene.test_used} across "
                    f"three groups, where no single contrast exists",
                )
                self.assertIsNone(gene.mean_group1)
                self.assertIsNone(gene.mean_group2)

    def test_the_serialised_form_is_null_too(self):
        for gene in self._three_group_result().gene_results:
            d = gene.to_dict()
            with self.subTest(gene=gene.gene_name):
                self.assertIsNone(d["log2_fold_change"])
                self.assertIsNone(d["mean_group1"])
                self.assertIsNone(d["mean_group2"])

    def test_three_groups_still_use_a_multi_group_test(self):
        """Premise check: these genes must genuinely be on the multi-group path,
        or the test above proves nothing."""
        for gene in self._three_group_result().gene_results:
            self.assertIn(gene.test_used, ("anova", "kruskal_wallis"))

    def test_two_groups_still_report_real_means_and_a_real_fold_change(self):
        """Guard against 'fixing' the above by nulling the two-group path too."""
        rng = np.random.default_rng(5)
        matrix = rng.normal(8, 1, (5, 15))
        matrix[:2, 10:] += 3.0
        result = DifferentialExpressionService(input_scale="log2").analyze(
            expression_matrix=matrix[:, :10],
            group_labels=["A"] * 5 + ["B"] * 5,
            gene_names=[f"g{i}" for i in range(5)],
        )
        for gene in result.gene_results:
            with self.subTest(gene=gene.gene_name):
                self.assertIsNotNone(gene.log2_fold_change)
                self.assertIsNotNone(gene.mean_group1)
                # Real log2-scale expression means, not zeros.
                self.assertGreater(gene.mean_group1, 1.0)
                self.assertGreater(gene.mean_group2, 1.0)
