"""
Regression: HomoscedasticityValidator crashed the whole Guardian request with a TypeError.

`guardian_core` sets `var_ratio = None` when one half of the fitted range has exactly zero
residual variance, and the `severity = "warning"` branch exists precisely FOR that case -- so
None is an intended path, not an edge case. The message then formatted it as `{var_ratio:.2f}`
unguarded, raising TypeError out of `validate()`. The validator loop has no try/except, so it
escaped `check()` and surfaced as HTTP 500.

Reachable for every test whose requirements include homoscedasticity: regression, mixed_model,
lmm, hlm, multilevel, mediation.

Note the failure mode was a crash, NOT a silent wrong answer -- Guardian never reported the data
as homoscedastic. So this was an availability bug, not an integrity one.
"""

import numpy as np
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.guardian.guardian_core import GuardianCore


def _zero_variance_lower_half():
    """x, y whose OLS residuals are EXACTLY zero over the lower half of the fitted values.

    The perturbation is applied only to the upper half and uses a [+1,-1,-1,+1] block, which is
    orthogonal to BOTH the constant and x within each block. That leaves the OLS coefficients
    untouched, so the lower-half residuals stay exactly 0 and `np.var(first_half, ddof=1)` is 0.

    This matters: a perturbation that is merely mean-zero is NOT enough. An earlier attempt used
    an alternating [+1,-1] pattern whose sum(x*p) was -300, which shifted the fitted line, left
    non-zero residuals everywhere, and did NOT reproduce the bug. A regression test built on that
    construction would have passed against the unfixed code and proved nothing.
    """
    x = np.arange(40, dtype=float)
    p = np.zeros(40)
    p[20:] = 30.0 * np.array([1, -1, -1, 1] * 5, dtype=float)
    assert p.sum() == 0.0 and (x * p).sum() == 0.0, "perturbation must be orthogonal to 1 and x"
    return x, 2.0 * x + 1.0 + p


class HomoscedasticityNoneRatioTests(APITestCase):

    def test_core_does_not_raise(self):
        """MUTATION: restore the unguarded f"...{var_ratio:.2f}" -> TypeError, this fails."""
        x, y = _zero_variance_lower_half()
        report = GuardianCore().check({"x": x.tolist(), "y": y.tolist()}, "regression")
        homo = [v for v in report.violations if v.assumption == "homoscedasticity"]
        self.assertTrue(homo, "the Breusch-Pagan violation is real and must still be reported")

    def test_severity_is_not_graded_when_the_ratio_is_incomputable(self):
        """The ungraded case must be 'warning', never manufactured as 'critical'.

        MUTATION: reinstate the old `+ 1e-10` guard (ratio ~1e10 -> 'critical') -> this fails.
        That epsilon did not round, it invented a verdict.
        """
        x, y = _zero_variance_lower_half()
        report = GuardianCore().check({"x": x.tolist(), "y": y.tolist()}, "regression")
        homo = [v for v in report.violations if v.assumption == "homoscedasticity"][0]
        self.assertEqual(homo.severity, "warning")
        self.assertIn("not computable", homo.message)
        self.assertNotIn("None", homo.message)

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_endpoint_returns_200_not_500(self):
        """The user-visible symptom. MUTATION: restore the unguarded format -> HTTP 500."""
        x, y = _zero_variance_lower_half()
        resp = self.client.post(
            "/api/guardian/check/",
            {"data": {"x": x.tolist(), "y": y.tolist()},
             "test_type": "regression", "alpha": 0.05},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)

    def test_the_normal_graded_path_still_reports_a_ratio(self):
        """Guard against 'fixing' this by dropping the ratio from every message.

        MUTATION: always emit the not-computable text -> this fails.
        """
        rng = np.random.default_rng(20260820)
        x = np.arange(80, dtype=float)
        y = 2.0 * x + 1.0 + rng.normal(0, 1, 80) * (1.0 + x)   # variance grows with x
        report = GuardianCore().check({"x": x.tolist(), "y": y.tolist()}, "regression")
        homo = [v for v in report.violations if v.assumption == "homoscedasticity"]
        self.assertTrue(homo, "precondition: this data must violate homoscedasticity")
        self.assertIn("variance ratio=", homo[0].message)
        self.assertNotIn("not computable", homo[0].message)
