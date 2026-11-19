"""
A Mann-Whitney test against a very large group is answered, not counted for minutes.

Two calls of scipy.stats.mannwhitneyu that a request can reach left the method to SciPy: the
engine's (the question page, POST /api/v1/autonomous/cascade/, the manuscript check) and the one
the genomics analysis makes for a gene it sends to the rank test. SciPy then counts the exact
distribution whenever one group has at most 8 values and no value occurs twice, whatever the size
of the other group. With 8 values against 100,000 the bare call ran for more than half a minute,
longer than the web server waits for an answer.

Both calls now ask for the normal approximation by name when the larger group has more than
1,000 values. Up to 1,000 the method is left to SciPy, as before.

WHICH RESULT CHANGES: a test of at most 8 values against more than 1,000, with no value twice. It
was the exact p-value and is the normal approximation. In every other case SciPy's own choice was
the normal approximation already, or the call is unchanged.
"""

import time
from unittest import mock

import numpy as np
from django.test import SimpleTestCase
from scipy import stats

from core.services import cascade_engine
from core.services.cascade_engine import AutonomousCascadeEngine
from core.services.genomics import differential_expression
from core.services.genomics.differential_expression import DifferentialExpressionService
from core.utils.mann_whitney_method import LARGEST_GROUP_LEFT_TO_SCIPY, mann_whitney_method


def methods_asked_for(module, call):
    """The `method` of every call of scipy.stats.mannwhitneyu that `call` makes through `module`."""
    with mock.patch.object(module.stats, "mannwhitneyu", wraps=stats.mannwhitneyu) as spy:
        result = call()
    return [used.kwargs.get("method", "auto") for used in spy.call_args_list], result


class TheRuleTest(SimpleTestCase):
    def test_the_size_above_which_the_approximation_is_named(self):
        self.assertEqual(LARGEST_GROUP_LEFT_TO_SCIPY, 1000)
        for sizes, method in (((8, 1000), "auto"), ((1000, 8), "auto"), ((1000, 1000), "auto"), ((3, 3), "auto"),
                              ((8, 1001), "asymptotic"), ((1001, 8), "asymptotic"), ((5000, 5000), "asymptotic"),
                              ((8, 100000), "asymptotic")):
            self.assertEqual(mann_whitney_method(*sizes), method, sizes)


class TheEngineTest(SimpleTestCase):
    def setUp(self):
        self.rng = np.random.default_rng(1911)
        self.small = self.rng.normal(0.3, 1.0, 8)

    def test_eight_untied_values_against_100000_are_answered_within_a_second(self):
        large = self.rng.normal(0.0, 1.0, 100000)
        self.assertEqual(len(set(self.small.tolist()) | set(large.tolist())), 100008)       # no value twice
        started = time.perf_counter()
        result = AutonomousCascadeEngine()._exec_mann_whitney([self.small, large], 0.05)
        seconds = time.perf_counter() - started
        # the call that counted for more than half a minute
        self.assertLess(seconds, 1.0)
        expected = stats.mannwhitneyu(self.small, large, alternative="two-sided", method="asymptotic")
        self.assertEqual((result.statistic, result.p_value), (float(expected.statistic), float(expected.pvalue)))

    def test_the_whole_answer_of_the_engine_for_such_a_request(self):
        # The engine also checks the assumptions of the test on the 100,008 values, which takes most of
        # the time of the answer. The bound is far below what the exact count alone took.
        large = self.rng.normal(0.0, 1.0, 100000)
        started = time.perf_counter()
        methods, answer = methods_asked_for(cascade_engine, lambda: AutonomousCascadeEngine().execute_with_cascade(
            {"a": self.small.tolist(), "b": large.tolist()}, "mann_whitney_u"))
        seconds = time.perf_counter() - started
        self.assertLess(seconds, 10.0)
        self.assertEqual(methods, ["asymptotic"])
        self.assertEqual(answer.final_test, "mann_whitney_u")
        self.assertEqual(answer.result.p_value,
                         float(stats.mannwhitneyu(self.small, large, alternative="two-sided", method="asymptotic").pvalue))

    def test_up_to_1000_values_the_method_is_left_to_scipy_as_before(self):
        for n in (10, 500, 1000):
            large = self.rng.normal(0.0, 1.0, n)
            methods, _result = methods_asked_for(cascade_engine, lambda: AutonomousCascadeEngine()._exec_mann_whitney([self.small, large], 0.05))
            self.assertEqual(methods, ["auto"], n)
        methods, _result = methods_asked_for(cascade_engine, lambda: AutonomousCascadeEngine()._exec_mann_whitney(
            [self.rng.normal(0, 1, 1000), self.rng.normal(0, 1, 1000)], 0.05))
        self.assertEqual(methods, ["auto"])

    def test_above_1000_the_only_result_that_changes_is_the_one_scipy_counted_exactly(self):
        # SciPy's own choice is the exact count only for a group of at most 8 values without a tie. With nine
        # values, or with a tie, it was the normal approximation already: the named method gives the same p-value.
        large = self.rng.normal(0.0, 1.0, 1500)
        nine = self.rng.normal(0.3, 1.0, 9)
        tied = np.r_[self.small[:7], large[0]]
        for first in (nine, tied):
            left_to_scipy = stats.mannwhitneyu(first, large, alternative="two-sided")
            methods, result = methods_asked_for(cascade_engine, lambda: AutonomousCascadeEngine()._exec_mann_whitney([first, large], 0.05))
            self.assertEqual(methods, ["asymptotic"])
            self.assertEqual(result.p_value, float(left_to_scipy.pvalue))
        # and the one that changes: eight values, no tie, 1,001 in the other group
        large = self.rng.normal(0.0, 1.0, 1001)
        methods, result = methods_asked_for(cascade_engine, lambda: AutonomousCascadeEngine()._exec_mann_whitney([self.small, large], 0.05))
        self.assertEqual(methods, ["asymptotic"])
        self.assertEqual(result.p_value, float(stats.mannwhitneyu(self.small, large, alternative="two-sided", method="asymptotic").pvalue))


class TheGenomicsAnalysisTest(SimpleTestCase):
    def setUp(self):
        self.rng = np.random.default_rng(271517)
        self.service = DifferentialExpressionService(input_scale="linear")

    def _gene(self, n_large):
        # skewed values: the analysis sends such a gene to the rank test
        return self.rng.lognormal(1.0, 1.0, 8), self.rng.lognormal(1.2, 1.0, n_large)

    def test_a_gene_sent_to_the_rank_test_with_more_than_1000_samples_in_a_group(self):
        first, second = self._gene(1001)
        started = time.perf_counter()
        methods, gene = methods_asked_for(differential_expression, lambda: self.service._test_two_groups("g", first, second))
        seconds = time.perf_counter() - started
        self.assertEqual(gene.test_used, "mann_whitney")
        self.assertEqual(methods, ["asymptotic"])
        self.assertEqual(gene.raw_p_value, float(stats.mannwhitneyu(first, second, alternative="two-sided", method="asymptotic").pvalue))
        self.assertLess(seconds, 1.0)

    def test_up_to_1000_samples_the_method_is_left_to_scipy_as_before(self):
        for n in (30, 1000):
            first, second = self._gene(n)
            methods, gene = methods_asked_for(differential_expression, lambda: self.service._test_two_groups("g", first, second))
            self.assertEqual((gene.test_used, methods), ("mann_whitney", ["auto"]), n)
