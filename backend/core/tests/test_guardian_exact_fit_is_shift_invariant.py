"""The exact-fit guard must not change its mind when you add a constant to y.

`_fit_is_exact` compared `max|residual|` to `max|y|` -- the MAGNITUDE of y -- while both
diagnostics it gates ask about the VARIATION in y. Adding a constant to y changes no regression
diagnostic and changes neither R^2 nor any residual; it changes only `max|y|`, and so it silently
raised the bar until genuine findings fell underneath it.

MEASURED on main + e442b84 + 5c87d00, textbook growing variance (n=60, sd 0.002 -> 0.045, a 23.5x
fan), with R^2 identical to ten decimal places at every offset:

    offset 0 .. 1e11  -> confidence 0.306, can_proceed False, homoscedasticity CRITICAL
    offset 1e12, 1e13 -> confidence 0.444, can_proceed TRUE,  homoscedasticity ABSENT

and on genuinely quadratic data (true R^2 = 0.9999996) at offset 1e12 the linearity check returned
a PASS reading "reproduces y exactly ... (R^2 = 1)" -- an affirmative statement about the data that
is false. That is worse than the false accusation it was written to remove.

DESIGN RULE FOR THIS MODULE, learned the hard way twice on this branch:
  * no fixture may be derived from the constant it is testing -- such a fixture scales with the
    mutation and can never fail;
  * assert BEHAVIOUR (the verdict a user receives), not a label.
Every ULP-sized fixture below is built from `np.finfo(float).eps` and the data itself, never from
`_EXACT_FIT_ULPS` or `_RESOLVABLE_VARIATION_RATIO`.
"""

import numpy as np
from django.test import SimpleTestCase, TestCase
from django.test.utils import override_settings

from core.guardian.guardian_core import (
    HomoscedasticityValidator,
    LinearityValidator,
    _EXACT_FIT_ULPS,
    _fit_is_exact,
    _residual_information_floor,
    _variation_is_resolvable,
)

EPS = float(np.finfo(float).eps)

#: The worst dust ratio observed for an EXACTLY linear y, in ULPs of max|y|, over n in
#: 10..20,000 and five x-distributions (arange, uniform, linspace, a badly conditioned
#: lognormal(0, 8), and a single-leverage-point design). This number is a MEASUREMENT recorded
#: as data; it is deliberately not computed from `_EXACT_FIT_ULPS`.
#:
#: The value previously recorded in guardian_core.py was 21.9 ULPs. That was wrong -- the old
#: sweep never reached the ill-conditioned corner -- and the constant it justified (1000) was
#: therefore only 1.4x above true worst-case dust rather than the 46x claimed.
MEASURED_WORST_DUST_ULPS = 696.6


def _growing_variance(offset: float, seed: int = 42):
    """Textbook heteroscedasticity: a clean line with a residual spread that fans out 23.5x."""
    n = 60
    x = np.arange(float(n))
    sd = 0.002 + 0.045 * np.arange(n) / (n - 1)
    e = np.random.default_rng(seed).normal(0, 1, n) * sd
    return x, 20 * x + e + offset


def _quadratic(offset: float):
    """Genuinely non-linear: true R^2 = 0.9999996, curvature amplitude 0.036."""
    x = np.arange(60.0)
    return x, x + 4e-5 * (x - 30) ** 2 + offset


def _homo(x, y):
    return HomoscedasticityValidator().validate([x, y])


def _lin(x, y):
    return LinearityValidator().validate([x, y])


def _is_plain_pass(result: dict) -> bool:
    """A clean bill: we say the assumption holds, and we do NOT say we skipped the check."""
    return not result["violated"] and not result.get("not_applicable", False)


class AnOffsetMustNotBuyACleanBillTests(SimpleTestCase):
    """The headline. A constant added to y must never turn a finding into a clean bill."""

    def test_growing_variance_is_never_given_a_clean_bill_at_any_offset(self):
        """THE REGRESSION. At offset 1e12 this returned violated=False with no not_applicable,
        i.e. an affirmative "variance is constant" on data whose sd fans out 23.5x.

        MUTATION: delete the `_variation_is_resolvable` gate from HomoscedasticityValidator ->
        the 1e12 and 1e13 rows become plain passes and this fails.
        """
        for offset in (0.0, 1e6, 1e9, 1e12, 1e13, 1e15):
            with self.subTest(offset=offset):
                x, y = _growing_variance(offset)
                self.assertFalse(
                    _is_plain_pass(_homo(x, y)),
                    f"offset {offset:g} bought a clean bill on 23.5x growing variance",
                )

    def test_a_genuine_quadratic_is_never_given_a_clean_bill_at_any_offset(self):
        """Same defect in the other validator, and worse there: linearity did not merely abstain,
        it returned a PASS whose message asserted "reproduces y exactly ... (R^2 = 1)" on data
        whose true R^2 is 0.9999996 and which is genuinely curved.

        MUTATION: delete the `_variation_is_resolvable` gate from LinearityValidator -> fails.
        """
        for offset in (0.0, 1e9, 1e12, 1e15):
            with self.subTest(offset=offset):
                x, y = _quadratic(offset)
                self.assertFalse(
                    _is_plain_pass(_lin(x, y)),
                    f"offset {offset:g} certified genuinely quadratic data as linear",
                )

    def test_no_message_claims_an_exact_fit_when_the_fit_is_not_exact(self):
        """The affirmative false statement, pinned directly. Whatever we say about offset data,
        we must not say the line reproduces y exactly -- because it does not.

        MUTATION: restore the old single-condition guard -> the 1e12 message reads "reproduces y
        exactly to within floating-point representation error" and this fails.
        """
        x, y = _quadratic(1e12)
        message = _lin(x, y).get("message", "")
        self.assertNotIn("reproduces y", message)
        self.assertIn("not evaluated", message.lower())

    def test_the_offset_that_hides_the_finding_still_reports_it_as_UNEVALUATED(self):
        """Abstention must be explicit, or this fix just relocates the false clean bill.

        MUTATION: drop `"not_applicable": True` from either precision-exhausted branch -> the
        result becomes a plain pass and `_is_plain_pass` above starts returning True.
        """
        x, y = _growing_variance(1e12)
        for name, result in (("homoscedasticity", _homo(x, y)), ("linearity", _lin(x, y))):
            with self.subTest(assumption=name):
                self.assertTrue(result.get("not_applicable"))
                text = result.get("details") or result.get("message") or ""
                # The user must be told the remedy, not merely that we gave up.
                self.assertIn("centring", text)


class TheGuardMustStillBindOnRealDustTests(SimpleTestCase):
    """The original defect must stay fixed. These are the cases 5c87d00 existed for."""

    def test_a_perfect_line_is_still_not_accused(self):
        """MUTATION: make `_variation_is_resolvable` return False unconditionally -> the perfect
        line stops being a genuine linearity PASS and this fails.
        """
        x = np.arange(1.0, 51.0)
        y = x / 3.0 + 1.0 / 7.0
        self.assertTrue(_is_plain_pass(_lin(x, y)), "perfect line accused of non-linearity")
        homo = _homo(x, y)
        self.assertFalse(homo["violated"])
        self.assertTrue(homo.get("not_applicable"), "homoscedasticity must ABSTAIN, not pass")

    def test_exactly_zero_residuals_do_not_crash_and_are_not_accused(self):
        """The corner e442b84 guarded: sklearn's score() returns 1.0 for the degenerate 0/0."""
        x = np.arange(1.0, 51.0)
        y = 2 * x + 1.0
        # Precondition, measured through the SAME fit routine the validator uses. np.polyfit
        # leaves 4.3e-14 here while sklearn leaves exactly 0.0, and it is sklearn's zero that
        # produces the degenerate 0/0 this corner is about.
        from sklearn.linear_model import LinearRegression

        model = LinearRegression().fit(x.reshape(-1, 1), y)
        self.assertEqual(float(np.max(np.abs(y - model.predict(x.reshape(-1, 1))))), 0.0)
        self.assertTrue(_is_plain_pass(_lin(x, y)))
        self.assertTrue(_homo(x, y).get("not_applicable"))

    def test_ordinary_noisy_regression_is_untouched(self):
        """The guard must be invisible to real data. MUTATION: `_fit_is_exact -> True` -> fails."""
        rng = np.random.default_rng(0)
        x = np.arange(1.0, 51.0)
        clean = 0
        for _ in range(40):
            y = 2 * x + 1 + rng.normal(0, 2, 50)
            clean += _is_plain_pass(_homo(x, y)) and _is_plain_pass(_lin(x, y))
        self.assertGreater(clean, 30, "the guard is interfering with ordinary regressions")

    def test_growing_variance_at_no_offset_still_fires_critically(self):
        """The control that makes every assertion above meaningful: without it, a guard that
        silenced everything would pass this module.
        """
        x, y = _growing_variance(0.0)
        result = _homo(x, y)
        self.assertTrue(result["violated"])
        self.assertEqual(result.get("severity"), "critical")

    def test_a_modest_offset_does_not_cost_us_the_finding(self):
        """Guards against over-correcting. At offset 1e9 the noise is four orders of magnitude
        above float64 spacing, so the finding is fully recoverable and MUST still be reported.

        This is what caught my own first implementation: I applied the resolvability gate BEFORE
        the exactness test, which swallowed this case. The gate belongs inside the branch.
        """
        x, y = _growing_variance(1e9)
        result = _homo(x, y)
        self.assertTrue(result["violated"], "a 1e9 offset must not cost a recoverable finding")
        self.assertEqual(result.get("severity"), "critical")


class TheThresholdIsPinnedFromBothSidesTests(SimpleTestCase):
    """The measured decision boundary had NO fixture within nine orders of magnitude of it, which
    is why a 1000x loosening of the constant survived mutation testing. These bracket it."""

    @staticmethod
    def _residuals_at_ulps(y: np.ndarray, ulps: float) -> np.ndarray:
        """Residuals of exactly `ulps` ULPs of max|y| -- built from eps, NOT from the constant."""
        target = ulps * EPS * float(np.max(np.abs(y)))
        r = np.zeros_like(y)
        r[0] = target
        return r

    def test_dust_at_twice_the_measured_worst_case_is_still_treated_as_exact(self):
        """Lower bracket, WITH THE SAFETY MARGIN AS AN ASSERTION.

        696.6 ULPs is the worst dust *observed*, and an observation is a sample -- a sweep that
        found 21.9 ULPs once already turned out to be 32x low. Asserting only at the observed
        worst case pins nothing: the previous constant (1000) clears 696.6 and would silently
        survive, at a margin of 1.4x. Requiring the constant to clear TWICE the observed worst
        case is the design rule, so it is what the test asserts.

        MUTATION: `_EXACT_FIT_ULPS = 1000` (the old value) or `100` or `0` -> fails.
        """
        y = np.arange(1.0, 51.0) * 3.0 + 1.0
        self.assertTrue(
            _fit_is_exact(y, self._residuals_at_ulps(y, 2 * MEASURED_WORST_DUST_ULPS))
        )

    def test_residuals_far_above_any_observed_dust_are_NOT_treated_as_exact(self):
        """Upper bracket, and the one that matters most: it stops the constant drifting up into
        real data. 20,000 ULPs is 29x the worst dust ever observed.

        MUTATION: `_EXACT_FIT_ULPS = 1e6` -> survived every previous sweep; it fails here.
        """
        y = np.arange(1.0, 51.0) * 3.0 + 1.0
        self.assertFalse(_fit_is_exact(y, self._residuals_at_ulps(y, 20_000.0)))

    def test_the_constant_brackets_the_measurement_it_claims_to_rest_on(self):
        """The constant is presented as measured; this is that claim, as an assertion."""
        self.assertGreaterEqual(_EXACT_FIT_ULPS, 2 * MEASURED_WORST_DUST_ULPS)
        self.assertLess(_EXACT_FIT_ULPS, 20_000)

    def test_the_floor_scales_with_the_LARGEST_y_not_the_average(self):
        """MUTATION: `np.max(np.abs(y))` -> `np.mean(np.abs(y))` in `_residual_information_floor`.
        This survived the previous sweep with zero new failures. A single large value must move
        the floor, because it is that value's exponent that sets the representation spacing.
        """
        flat = np.concatenate([np.ones(50), [1e6]])
        self.assertAlmostEqual(
            _residual_information_floor(flat),
            _EXACT_FIT_ULPS * EPS * 1e6,
            delta=_EXACT_FIT_ULPS * EPS * 1e6 * 1e-9,
        )


class ResolvabilityIsShiftSensitiveByConstructionTests(SimpleTestCase):
    """`_variation_is_resolvable` exists precisely to NOT be shift-invariant. Pin that, or the
    two-condition design silently collapses back to the one-condition one."""

    def test_adding_a_constant_eventually_makes_the_variation_unresolvable(self):
        """MUTATION: use `np.ptp(y)` instead of `max|y|` inside `_residual_information_floor` ->
        the floor becomes shift-invariant too, every offset stays resolvable, and this fails.
        """
        base = np.arange(60.0) * 20.0
        self.assertTrue(_variation_is_resolvable(base))
        self.assertFalse(_variation_is_resolvable(base + 1e15))

    def test_multiplying_y_by_a_constant_changes_nothing(self):
        """The other half: the predicate must remain SCALE-invariant. Rescaling y rescales the
        floor and the spread together, so the answer cannot move.

        MUTATION: introduce an absolute floor such as `max(scale, 1.0)` -> a rescaled dataset
        changes verdict and this fails. That mutation previously survived and was a proven
        integrity regression.
        """
        base = np.arange(60.0) * 20.0 + 5.0
        for factor in (1e-16, 1e-6, 1.0, 1e6, 1e16):
            with self.subTest(factor=factor):
                self.assertTrue(_variation_is_resolvable(base * factor))

    def test_a_constant_column_has_no_resolvable_variation(self):
        """R^2 for a constant y is 0/0, not 1. Claiming an exact fit there is unearned."""
        self.assertFalse(_variation_is_resolvable(np.full(50, 5.0)))
        self.assertFalse(_variation_is_resolvable(np.zeros(50)))


@override_settings(SECURE_SSL_REDIRECT=False)
class TheEndpointDoesNotCrashOnDegenerateColumnsTests(TestCase):
    """Found while verifying the fix above: scipy returns nan for the skew/kurtosis of a constant
    column, nan is not JSON, and DRF's renderer turned the whole check into an HTTP 500."""

    def _post(self, y):
        return self.client.post(
            "/api/guardian/check/",
            {"data": {"x": np.arange(1.0, 51.0).tolist(), "y": list(y)},
             "test_type": "regression", "alpha": 0.05},
            format="json", content_type="application/json",
        )

    def test_a_constant_y_column_returns_200_not_500(self):
        """MUTATION: revert `_finite_or_none` to `float(...)` -> "Out of range float values are
        not JSON compliant" and this returns 500.
        """
        for y in ([5.0] * 50, [0.0] * 50):
            with self.subTest(y=y[0]):
                response = self._post(y)
                self.assertEqual(response.status_code, 200, response.content[:400])

    def test_the_undefined_shape_statistics_are_reported_as_null_not_invented(self):
        """None, not 0.0. The shape of a distribution with no spread is undefined, and saying
        "skewness 0" would be a fabricated number.

        MUTATION: return 0.0 instead of None from `_finite_or_none` -> fails.
        """
        body = self._post([5.0] * 50).json()
        group = body["data_summary"]["group_2"]
        self.assertIsNone(group["skewness"])
        self.assertIsNone(group["kurtosis"])


class AViolationMissingAFieldMustNotBecomeA500Tests(SimpleTestCase):
    """`severity`, `message` and `recommendation` were unguarded dict reads at the violation
    construction site -- the SAME defect class as e442b84, one call site to the left, and still
    live in v1.2.0. An assumption violation the caller never sees is strictly worse than one
    described in slightly less detail."""

    def test_a_validator_that_omits_severity_still_produces_a_report(self):
        """MUTATION: restore `result["severity"]` -> KeyError escapes check() and this fails."""
        import core.guardian.guardian_core as gc

        original = gc.NormalityValidator.validate
        try:
            gc.NormalityValidator.validate = lambda self, arrays, alpha=0.05: {
                "violated": True, "test_name": "stub",  # no severity/message/recommendation
            }
            report = gc.GuardianCore().check(
                data={"x": np.arange(1.0, 51.0).tolist(),
                      "y": (2 * np.arange(1.0, 51.0) + 1).tolist()},
                test_type="regression", alpha=0.05,
            )
        finally:
            gc.NormalityValidator.validate = original
        self.assertTrue(any(v.assumption == "normality" for v in report.violations))
