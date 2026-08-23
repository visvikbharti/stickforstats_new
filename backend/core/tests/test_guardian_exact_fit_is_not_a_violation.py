"""
Guardian accused perfectly linear data of violating the assumptions of linear regression.

Two residual-based diagnostics were being applied to residuals that are floating-point
rounding dust, and both read that dust as scientific structure. Measured on the deployed
v1.2.0 build, over 500 perfect lines ``y = ax + b`` (random a, b, n = 50):

  * **Breusch-Pagan reported heteroscedasticity for 78.2%** of them, mostly at severity
    "critical". ``y = x/3 + 1/7`` came back p = 7.4e-06, variance ratio 8.08, confidence 0.167.
  * **The runs test reported a critical linearity violation for 61.8%** of them, under a message
    reading "Linearity violated (R² improvement with polynomial: 0.000)" -- the message
    contradicting its own verdict, because the R² comparison correctly said 0.000 and it was the
    runs test that fired (p = 6.1e-07 on residuals of size 1e-14).

Both are integrity defects, not availability ones, and both returned HTTP 200.

The previously known symptom -- ``var_ratio = None`` raising TypeError and 500'ing the endpoint
(``test_guardian_homoscedasticity_none_ratio``) -- is the *exactly-zero-residual* corner of the
same condition. Guarding only the message, as that fix did, turned the crash into a confident
false accusation rather than removing one.

Every test names the mutation that must break it.
"""

import numpy as np
from django.test import SimpleTestCase, TestCase, override_settings

from core.guardian.guardian_core import (
    GuardianCore,
    HomoscedasticityValidator,
    LinearityValidator,
    _EXACT_FIT_ULPS,
    _fit_is_exact,
)

N = 50
X = np.arange(N, dtype=float)

#: A perfect line whose residuals are rounding dust rather than exactly zero. This is the
#: dangerous case: it never crashed, so nothing announced it. ``2x + 1`` gives residuals that
#: are exactly 0.0 and is covered by the sibling test module.
PERFECT_LINE_Y = X / 3 + 1 / 7


def _homo(y, x=X):
    return HomoscedasticityValidator().validate([np.asarray(x, float), np.asarray(y, float)], 0.05)


def _lin(y, x=X):
    return LinearityValidator().validate([np.asarray(x, float), np.asarray(y, float)], 0.05)


class PerfectLinesAreNotViolationsTests(SimpleTestCase):

    def test_the_fixture_really_is_dust_and_not_exact_zero(self):
        """Precondition. If this fixture ever produced exactly-zero residuals it would be
        testing the crash corner instead of the silent corner, and the value of the whole
        module would quietly drop."""
        resid = PERFECT_LINE_Y - np.poly1d(np.polyfit(X, PERFECT_LINE_Y, 1))(X)
        peak = float(np.abs(resid).max())
        self.assertGreater(peak, 0.0, "the fixture must have NON-zero rounding dust")
        self.assertLess(peak, 1e-12, "and it must still be dust, not signal")

    def test_homoscedasticity_is_not_violated_by_a_perfect_line(self):
        """THE HEADLINE, half one. 78.2% of perfect lines were flagged.

        MUTATION: delete the `_fit_is_exact` guard in HomoscedasticityValidator -> the
        Breusch-Pagan branch runs on dust, returns p = 7.4e-06, and this fails.
        """
        self.assertFalse(_homo(PERFECT_LINE_Y)["violated"])

    def test_linearity_is_not_violated_by_a_perfect_line(self):
        """THE HEADLINE, half two. 61.8% of perfect lines were flagged CRITICAL.

        MUTATION: delete the `_fit_is_exact` guard in LinearityValidator -> the runs test
        reads the dust's sign pattern (p = 6.1e-07) and this fails.
        """
        self.assertFalse(_lin(PERFECT_LINE_Y)["violated"])

    def test_homoscedasticity_reports_NOT_EVALUATED_rather_than_pass(self):
        """A perfect fit has no residual variance to be constant, so 'pass' would be a vacuous
        certification -- the false clean bill this validator exists to prevent.

        MUTATION: drop `"not_applicable": True` from the guard's return -> the audit trail
        records `pass` and this fails.
        """
        result = _homo(PERFECT_LINE_Y)
        self.assertTrue(result.get("not_applicable"))

    def test_linearity_reports_a_genuine_PASS_not_not_applicable(self):
        """The asymmetry with homoscedasticity is deliberate and load-bearing, so it is pinned:
        an exact fit IS direct positive evidence of linearity (R² = 1), stronger than the runs
        test. Reporting it as not-evaluated would understate what we actually established.

        MUTATION: add `"not_applicable": True` to LinearityValidator's guard -> this fails.
        """
        result = _lin(PERFECT_LINE_Y)
        self.assertFalse(result["violated"])
        self.assertFalse(result.get("not_applicable", False))


class TheGuardMustBindOnlyOnDustTests(SimpleTestCase):
    """The failure mode of a guard like this is being too wide and silencing real findings.
    These make the boundary bind from both sides."""

    def test_the_tightest_realistic_fit_is_still_evaluated(self):
        """Makes the threshold BIND from above. Without this, a guard that always returned True
        would satisfy every test above while destroying both validators.

        The perturbation is deliberately an ABSOLUTE fraction of the data scale (1e-6, the
        tightest fit anyone would call a regression -- instrument precision), NOT a multiple of
        `_EXACT_FIT_ULPS`. The first version of this test derived it from the constant under
        test, so the fixture scaled with the mutation and the test could not fail: raising
        `_EXACT_FIT_ULPS` by nine orders of magnitude SURVIVED the sweep. A test whose fixture
        moves with the thing it is testing measures nothing.

        MUTATION: raise `_EXACT_FIT_ULPS` to 1e12 -> the guard swallows a real fit and this
        fails.
        """
        scale = float(np.max(np.abs(PERFECT_LINE_Y)))
        rng = np.random.default_rng(20260824)
        y = PERFECT_LINE_Y + rng.normal(0, 1e-6 * scale, N)
        resid = y - np.poly1d(np.polyfit(X, y, 1))(X)
        self.assertFalse(
            _fit_is_exact(np.asarray(y), resid),
            "a fit good to 1 part in 1e6 is a real regression, not floating-point dust",
        )
        # ...and the validators must actually evaluate it rather than short-circuit.
        self.assertFalse(_homo(y).get("not_applicable", False))

    def test_the_threshold_cannot_drift_up_into_real_data(self):
        """A blunt ceiling on the constant itself, as a second line of defence: the guard must
        stay at least three orders of magnitude below the tightest realistic residual scale.

        MUTATION: raise `_EXACT_FIT_ULPS` to 1e12 -> this fails.
        """
        self.assertLess(_EXACT_FIT_ULPS * float(np.finfo(float).eps), 1e-9)

    def test_residuals_below_the_threshold_are_recognised_as_an_exact_fit(self):
        """The other side of the same boundary."""
        resid = PERFECT_LINE_Y - np.poly1d(np.polyfit(X, PERFECT_LINE_Y, 1))(X)
        self.assertTrue(_fit_is_exact(PERFECT_LINE_Y, resid))

    def test_genuine_heteroscedasticity_still_fires(self):
        """A control group pinned at a detection floor: group 0 constant, group 1 spread wide.
        This is the case the earlier hotfix was written for, and it must survive the guard.

        MUTATION: make `_fit_is_exact` return True unconditionally -> this fails.
        """
        x = np.array([0.0] * 10 + [1.0] * 10)
        y = np.array([0.0] * 10 + [3.0, 9.0, 1.0, 14.0, 6.0, 22.0, 2.0, 11.0, 30.0, 5.0])
        self.assertTrue(_homo(y, x)["violated"])

    def test_growing_variance_still_fires(self):
        """The textbook fan shape.

        MUTATION: make `_fit_is_exact` return True unconditionally -> this fails.
        """
        rng = np.random.default_rng(20260820)
        x = np.arange(80, dtype=float)
        y = 2.0 * x + 1.0 + rng.normal(0, 1, 80) * (1.0 + x)
        self.assertTrue(_homo(y, x)["violated"])

    def test_genuine_non_linearity_still_fires(self):
        """MUTATION: make `_fit_is_exact` return True unconditionally -> all three fail."""
        for label, y in [("quadratic", X ** 2),
                         ("exponential", np.exp(X / 10)),
                         ("logarithmic", np.log(X + 1))]:
            with self.subTest(shape=label):
                self.assertTrue(_lin(y)["violated"])

    def test_ordinary_linear_data_with_noise_is_untouched(self):
        """The guard must be invisible to real regressions. Both validators pass the great
        majority of genuinely linear, genuinely homoscedastic samples -- as they did before.
        """
        rng = np.random.default_rng(1234)
        homo_ok = lin_ok = 0
        trials = 60
        for _ in range(trials):
            y = 2 * X + 1 + rng.normal(0, 2, N)
            homo_ok += not _homo(y)["violated"]
            lin_ok += not _lin(y)["violated"]
        self.assertGreater(homo_ok, trials * 0.8)
        self.assertGreater(lin_ok, trials * 0.8)


@override_settings(SECURE_SSL_REDIRECT=False)
class TheEndpointNoLongerAccusesAStraightLineTests(TestCase):
    """The user-visible symptom, over the same surface a reviewer would hit."""

    def _check(self, y):
        response = self.client.post(
            "/api/guardian/check/",
            {"data": {"x": X.tolist(), "y": list(y)}, "test_type": "regression", "alpha": 0.05},
            format="json", content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def test_a_perfect_line_is_reported_clean_with_full_confidence(self):
        """Before: confidence 0.167 with a critical linearity violation and a critical
        heteroscedasticity violation, over HTTP 200.

        MUTATION: delete either `_fit_is_exact` guard -> confidence drops and this fails.
        """
        body = self._check(PERFECT_LINE_Y)
        self.assertEqual(body["violations"], [])
        self.assertEqual(body["confidence_score"], 1.0)

    def test_the_report_says_homoscedasticity_was_not_evaluated(self):
        """Clean must not mean silent. The report has to distinguish 'we checked and it was
        fine' from 'we could not check', or this fix just moves the false clean bill.

        MUTATION: drop `"not_applicable": True` from the homoscedasticity guard -> the
        assumption moves into assumptions_checked and this fails.
        """
        body = self._check(PERFECT_LINE_Y)
        self.assertIn("homoscedasticity", body["assumptions_not_evaluated"])
        self.assertNotIn("homoscedasticity", body["assumptions_checked"])
        self.assertIn("linearity", body["assumptions_checked"])
        self.assertLess(body["assumption_coverage"], 1.0)


class TheGuardIsOnePredicateNotTwoTests(SimpleTestCase):
    """Both defects were the same defect in two places, found one at a time. Pinning the shared
    predicate is what stops the third copy."""

    def test_both_validators_read_the_same_predicate(self):
        """MUTATION: give either validator its own inline threshold again -> patching
        `_fit_is_exact` alone stops changing that validator's behaviour and this fails.
        """
        import core.guardian.guardian_core as gc

        original = gc._fit_is_exact
        try:
            gc._fit_is_exact = lambda y, residuals: True
            # With the predicate forced on, BOTH validators must go quiet on data that
            # genuinely violates their assumptions -- which is only possible if both of them
            # actually call it.
            x = np.array([0.0] * 10 + [1.0] * 10)
            y = np.array([0.0] * 10 + [3.0, 9.0, 1.0, 14.0, 6.0, 22.0, 2.0, 11.0, 30.0, 5.0])
            self.assertFalse(_homo(y, x)["violated"], "HomoscedasticityValidator ignores it")
            self.assertFalse(_lin(X ** 2)["violated"], "LinearityValidator ignores it")
        finally:
            gc._fit_is_exact = original

    def test_the_threshold_separates_dust_from_any_real_fit(self):
        """The constant is measured, and the measurement is the justification. Worst observed
        dust was ~22 ULPs; the tightest fit anyone would call a regression sits ~7e9 ULPs out.

        MUTATION: drop `_EXACT_FIT_ULPS` to 1 -> the badly conditioned case is no longer
        recognised as exact and this fails.
        """
        self.assertGreaterEqual(_EXACT_FIT_ULPS, 100)
        rng = np.random.default_rng(20260824)
        for _ in range(50):
            x = rng.lognormal(0, 3, 200)
            a, b = rng.uniform(-1e3, 1e3), rng.uniform(-1e3, 1e3)
            y = a * x + b
            resid = y - np.poly1d(np.polyfit(x, y, 1))(x)
            self.assertTrue(_fit_is_exact(y, resid),
                            "a badly conditioned exact fit must still be recognised")
