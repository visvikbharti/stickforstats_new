"""
The equal-shape assumption of the rank tests must actually be evaluated.

The defect: ``mann_whitney`` and ``kruskal_wallis`` both declared
``similar_shapes`` in ``GuardianCore.test_requirements``, and the string duly
appeared in every report's ``assumptions_checked`` list -- but no validator
implemented it. The dispatch loop reads ``if req in self.validators``, so the
requirement was skipped in silence while still being reported as checked.

Measured before the fix, by calling the real GuardianCore:

    normal(0,1) vs exponential, same median   -> 0 violations, confidence 1.000
    spread differing by 100x                  -> 0 violations, confidence 1.000
    strongly bimodal vs unimodal              -> 0 violations, confidence 1.000
    extreme right skew vs symmetric           -> 0 violations, confidence 1.000

all four with "similar_shapes" listed in assumptions_checked. That is the worst
shape a Guardian report can take: not a missing check, but a missing check
presented as a passed one.

Why the assumption matters. Mann-Whitney U and Kruskal-Wallis are widely taught
as tests of the median. They are tests of stochastic dominance, and only become
tests of location when the groups share a common shape and differ by a shift.
When the shapes differ the test can be significant while the medians are
identical, so the very conclusion users draw from it is the one the unchecked
assumption was guarding.

Every number asserted here is produced by running the real validator in this
process. Data are generated from explicit seeds.
"""

import numpy as np
from django.test import SimpleTestCase
from scipy import stats

from core.guardian.guardian_core import (
    GuardianCore,
    SimilarShapesValidator,
)


class SimilarShapesIsActuallyCheckedTests(SimpleTestCase):
    """The requirement must be wired into the dispatch loop, not just declared."""

    def setUp(self):
        self.guardian = GuardianCore()

    def test_similar_shapes_has_a_registered_validator(self):
        """The direct cause of the defect: declared but not registered.

        This is the cheapest possible regression test and it would have caught
        the original defect on the day the requirement was added.
        """
        self.assertIn("similar_shapes", self.guardian.validators)
        self.assertIsInstance(
            self.guardian.validators["similar_shapes"], SimilarShapesValidator
        )

    def test_no_declared_requirement_is_unimplemented(self):
        """Generalise past the one instance: nothing may be declared-only.

        ``similar_shapes`` was not special. Any requirement string added to
        test_requirements without a validator behind it produces the same
        silent skip, so the invariant is asserted over the whole table rather
        than over the one entry that happened to be wrong.
        """
        declared = {
            req
            for reqs in self.guardian.test_requirements.values()
            for req in reqs
        }
        implemented = set(self.guardian.validators) | {"expected_frequencies"}
        self.assertEqual(
            declared - implemented,
            set(),
            "these assumptions are declared in test_requirements, are reported "
            "in assumptions_checked, and nothing evaluates them",
        )

    def test_rank_tests_still_declare_the_assumption(self):
        """Guard against 'fixing' the report by deleting the requirement.

        Dropping ``similar_shapes`` from test_requirements would also make the
        invariant above pass, while removing a real assumption from the paper's
        claims. Both rank tests must still declare it.
        """
        for test in ("mann_whitney", "kruskal_wallis"):
            with self.subTest(test=test):
                self.assertIn(
                    "similar_shapes", self.guardian.test_requirements[test]
                )


class SimilarShapesDetectionTests(SimpleTestCase):
    """The four cases that returned confidence 1.0 before the fix."""

    def setUp(self):
        self.guardian = GuardianCore()
        self.rng = np.random.default_rng(20260804)

    def _shape_violation(self, data, test_type="mann_whitney"):
        report = self.guardian.check(data, test_type)
        self.assertIn("similar_shapes", report.assumptions_checked)
        found = [v for v in report.violations if v.assumption == "similar_shapes"]
        return report, (found[0] if found else None)

    def test_hundredfold_spread_difference_is_flagged(self):
        data = {
            "g1": self.rng.normal(0, 1, 100).tolist(),
            "g2": self.rng.normal(0, 100, 100).tolist(),
        }
        report, violation = self._shape_violation(data)
        self.assertIsNotNone(violation, "a 100x spread difference was not flagged")
        self.assertEqual(violation.severity, "warning")
        self.assertGreater(violation.statistic, 0.161)
        self.assertLess(report.confidence_score, 1.0)

    def test_bimodal_versus_unimodal_is_flagged(self):
        data = {
            "g1": np.concatenate(
                [self.rng.normal(-6, 0.5, 60), self.rng.normal(6, 0.5, 60)]
            ).tolist(),
            "g2": self.rng.normal(0, 1, 120).tolist(),
        }
        _, violation = self._shape_violation(data)
        self.assertIsNotNone(violation, "strong bimodality was not flagged")
        self.assertEqual(violation.severity, "warning")

    def test_extreme_skew_versus_symmetric_is_flagged(self):
        data = {
            "g1": self.rng.lognormal(0, 1.6, 150).tolist(),
            "g2": self.rng.normal(2, 1, 150).tolist(),
        }
        _, violation = self._shape_violation(data)
        self.assertIsNotNone(violation, "extreme skew was not flagged")

    def test_normal_versus_exponential_is_flagged_at_adequate_n(self):
        """Same median, different shape -- the textbook failure case.

        n = 400 rather than the 120 used above, because this difference has a
        true population D of 0.244 and detection at n = 120 is 93.5% (measured
        over 200 seeds): a single-seed assertion at n = 120 is a test that fails
        6.5% of the time. At n >= 300 detection measured 100%.
        """
        data = {
            "g1": self.rng.normal(0, 1, 400).tolist(),
            "g2": (self.rng.exponential(1, 400) - np.log(2)).tolist(),
        }
        _, violation = self._shape_violation(data)
        self.assertIsNotNone(violation, "normal vs exponential was not flagged")

    def test_kruskal_wallis_flags_the_offending_pair_of_three_groups(self):
        data = {
            "a": self.rng.normal(0, 1, 80).tolist(),
            "b": self.rng.normal(1, 1, 80).tolist(),
            "c": self.rng.normal(2, 12, 80).tolist(),
        }
        _, violation = self._shape_violation(data, test_type="kruskal_wallis")
        self.assertIsNotNone(violation)
        # Groups are reported 1-indexed; c is group 3 and is the odd one out.
        self.assertIn("3", violation.message)


class SimilarShapesMustNotFalsePositiveTests(SimpleTestCase):
    """A check that flags everything is as useless as one that flags nothing.

    The failure mode symmetric to the original defect: a validator tuned to
    fire on any difference would flag the location shift these tests exist to
    detect, and the natural response would be to disable it again.
    """

    def setUp(self):
        self.guardian = GuardianCore()

    def _violations(self, data):
        report = self.guardian.check(data, "mann_whitney")
        return [v for v in report.violations if v.assumption == "similar_shapes"]

    def test_identical_shape_with_a_large_location_shift_passes(self):
        """The shift-only case: the assumption HOLDS and must not be flagged."""
        rng = np.random.default_rng(11)
        data = {
            "g1": rng.normal(0, 1, 300).tolist(),
            "g2": (rng.normal(0, 1, 300) + 3.0).tolist(),
        }
        self.assertEqual(
            self._violations(data),
            [],
            "a pure location shift -- exactly what Mann-Whitney is for -- was "
            "reported as a shape violation",
        )

    def test_identical_distributions_pass_across_many_seeds(self):
        """False-positive rate must be near alpha, not merely zero once.

        A single seed cannot distinguish a correct test from one that never
        fires. Twenty independent draws from the same distribution should
        produce roughly alpha false positives, so a small non-zero count is
        expected and only a large one indicates a mis-tuned check.
        """
        false_positives = 0
        for seed in range(20):
            rng = np.random.default_rng(1000 + seed)
            data = {
                "g1": rng.normal(0, 1, 150).tolist(),
                "g2": rng.normal(0, 1, 150).tolist(),
            }
            if self._violations(data):
                false_positives += 1
        self.assertLessEqual(
            false_positives,
            3,
            f"{false_positives}/20 identical-distribution pairs were flagged; "
            f"the check is firing on sampling noise",
        )

    def test_mildly_unequal_spread_grades_as_minor_not_warning(self):
        """Box (1954) says these tests tolerate mild spread differences.

        An SD ratio of 1.5 measures D = 0.098 at the population level, below
        the D = 0.161 that corresponds to Box's variance-ratio-2 cut, so if it
        is detected at all it must be graded minor.
        """
        rng = np.random.default_rng(5)
        data = {
            "g1": rng.normal(0, 1, 2000).tolist(),
            "g2": rng.normal(0, 1.5, 2000).tolist(),
        }
        for v in self._violations(data):
            self.assertEqual(v.severity, "minor")


class SimilarShapesNeverBlocksTests(SimpleTestCase):
    """This validator must not create a dead end.

    Guardian's normality and variance validators recommend the rank tests as
    the fallback when a parametric assumption fails. If this validator could
    emit a critical violation it would set can_proceed = False on the very
    test just recommended, leaving no test Guardian permits. The severity cap
    is therefore behaviour to be tested, not an implementation detail.
    """

    def setUp(self):
        self.guardian = GuardianCore()

    def test_gross_shape_violation_still_permits_the_test(self):
        rng = np.random.default_rng(3)
        data = {
            "g1": np.concatenate(
                [rng.normal(-20, 0.2, 100), rng.normal(20, 0.2, 100)]
            ).tolist(),
            "g2": rng.normal(0, 1, 200).tolist(),
        }
        report = self.guardian.check(data, "mann_whitney")
        shape = [v for v in report.violations if v.assumption == "similar_shapes"]
        self.assertTrue(shape, "the extreme case should still be flagged")
        self.assertNotEqual(shape[0].severity, "critical")
        self.assertTrue(
            report.can_proceed,
            "a shape difference blocked the rank test, which Guardian itself "
            "recommends as the non-parametric fallback -- a dead end",
        )

    def test_the_parametric_fallback_path_is_not_a_dead_end(self):
        """End-to-end: data that fails a t-test's assumptions must leave a
        recommended non-parametric test that Guardian actually permits."""
        rng = np.random.default_rng(9)
        data = {
            "g1": rng.lognormal(0, 1.4, 60).tolist(),
            "g2": (rng.lognormal(0, 1.4, 60) * 4).tolist(),
        }
        t_report = self.guardian.check(data, "t_test")
        self.assertFalse(
            t_report.can_proceed, "expected the t-test to be blocked on this data"
        )
        mw_report = self.guardian.check(data, "mann_whitney")
        self.assertTrue(
            mw_report.can_proceed,
            "both the parametric test and its recommended alternative were "
            "blocked, leaving the user nowhere to go",
        )


class SimilarShapesUncheckableTests(SimpleTestCase):
    """When the check cannot be computed it must say so, not pass."""

    def setUp(self):
        self.validator = SimilarShapesValidator()

    def test_too_few_observations_reports_unverified_not_satisfied(self):
        result = self.validator.validate(
            [np.array([1.0, 2.0, 3.0]), np.array([4.0, 5.0, 9.0])], 0.05
        )
        self.assertTrue(
            result["violated"],
            "a group too small to compare was reported as satisfying the "
            "assumption",
        )
        self.assertIn("could NOT be checked", result["message"])
        self.assertIs(result["visual_data"]["checked"], False)

    def test_uncheckable_does_not_block(self):
        """Small samples are the main legitimate use of rank tests.

        Fail-closed-as-critical would be the obvious move here and would be
        wrong: it would block Mann-Whitney precisely on the small samples it
        exists to serve. Surfacing it as a warning is the intended behaviour.
        """
        result = self.validator.validate(
            [np.array([1.0, 2.0, 3.0]), np.array([4.0, 5.0, 9.0])], 0.05
        )
        self.assertEqual(result["severity"], "warning")

    def test_nan_values_are_filtered_so_the_check_still_runs(self):
        """The NaN-as-pass trap: ``if p < alpha`` is False for NaN.

        This is the mechanism behind a defect already fixed elsewhere in
        Guardian, where levene and zscore returned NaN at n = 1 and the report
        recorded 'pass'.

        The assertion is that the check is genuinely COMPUTED here, not that it
        merely avoids claiming a pass. Both groups retain 7 finite values, well
        above the minimum, so a real comparison is possible and a real p-value
        must come back. An earlier version of this test only checked that a
        non-finite p was not reported as a pass, which the code satisfies by
        degrading to "could not be checked" -- so the test passed even with the
        NaN filter removed. Mutation testing caught that; asserting on the
        finite p-value is what actually pins the filter down.
        """
        a = np.array([1.0, 2.0, np.nan, 4.0, 5.0, 6.0, 7.0, 8.0])
        b = np.array([2.0, 3.0, 4.0, np.nan, 6.0, 7.0, 8.0, 9.0])
        result = self.validator.validate([a, b], 0.05)
        self.assertIn(
            "p_value",
            result,
            "the check degraded to 'uncomputable' on data with 7 usable values "
            "per group, which means non-finite values reached scipy",
        )
        self.assertTrue(
            np.isfinite(result["p_value"]),
            f"non-finite p_value {result.get('p_value')!r} came back; a NaN here "
            f"would read as a satisfied assumption",
        )
        self.assertTrue(np.isfinite(result["statistic"]))

    def test_single_group_is_not_reported_as_a_violation(self):
        result = self.validator.validate([np.arange(20.0)], 0.05)
        self.assertFalse(result["violated"])


class SimilarShapesMethodTests(SimpleTestCase):
    """The centring step is what makes this a shape check and not a location one."""

    def test_median_centring_is_what_separates_shape_from_location(self):
        """Without centring, KS would flag the shift the rank test is testing.

        Asserted by running the uncentred comparison directly: it fires on a
        pure location shift, which is why the validator centres first.
        """
        from scipy import stats

        rng = np.random.default_rng(77)
        a = rng.normal(0, 1, 300)
        b = rng.normal(0, 1, 300) + 3.0

        uncentred_p = stats.ks_2samp(a, b).pvalue
        self.assertLess(
            uncentred_p,
            0.05,
            "premise of this test: an uncentred KS flags a pure location shift",
        )
        self.assertFalse(
            SimilarShapesValidator().validate([a, b], 0.05)["violated"],
            "the validator inherited the location sensitivity it must remove",
        )

    def test_alpha_is_bonferroni_corrected_across_pairs(self):
        """A deterministic discriminator, not a rate estimate.

        Five identically distributed groups give 10 pairwise comparisons, so
        the corrected alpha is 0.005. At seed 22 the smallest pairwise p-value
        is 0.0158, which sits between the corrected and uncorrected alpha. That
        one value therefore decides the verdict on its own: with the correction
        the groups pass, without it they are flagged as differing in shape when
        they were all drawn from N(0, 1).

        This replaces a false-positive-rate version of the test that could not
        detect the missing correction at all. Median-centring makes the KS
        procedure conservative -- measured family-wise error on identical groups
        is 0.4% at k = 2 rather than the nominal 5% -- so at k = 6 the
        uncorrected rate is only about 4.5% and no plausible threshold on a
        15-trial count separates the two. The correction is nonetheless
        load-bearing at more groups: uncorrected family-wise error measures
        13.8% at k = 10, n = 150 and 18.4% at k = 10, n = 500. Part 6 of
        paper/replication/guardian_validator_evidence.py prints the grid.
        """
        rng = np.random.default_rng(22)
        arrays = [rng.normal(0, 1, 60) for _ in range(5)]

        centred = [a - np.median(a) for a in arrays]
        pairwise = [
            stats.ks_2samp(centred[i], centred[j]).pvalue
            for i in range(5)
            for j in range(i + 1, 5)
        ]
        smallest = min(pairwise)
        n_pairs = len(pairwise)
        self.assertEqual(n_pairs, 10)
        # Premise of the test: without this window the assertion below proves
        # nothing, so it is checked rather than assumed.
        self.assertTrue(
            0.05 / n_pairs < smallest < 0.05,
            f"premise failed: smallest pairwise p={smallest:.5f} is not between "
            f"the corrected alpha {0.05 / n_pairs:.5f} and 0.05",
        )

        result = SimilarShapesValidator().validate(arrays, 0.05)
        self.assertFalse(
            result["violated"],
            f"five groups all drawn from N(0,1) were flagged as differing in "
            f"shape on a pairwise p of {smallest:.5f}, which clears 0.05 but "
            f"not the multiplicity-corrected {0.05 / n_pairs:.5f}",
        )
