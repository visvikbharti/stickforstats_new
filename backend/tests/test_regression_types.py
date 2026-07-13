"""
Every regression type the API advertises must actually run that regression.

`regression_views` branched on robust / quantile / stepwise, and
`HighPrecisionRegression` implemented all three -- but RegressionRequestSerializer's
ChoiceField never listed them, so those branches were unreachable dead code and the
frontend's "Robust Regression" option silently fitted an ordinary least-squares line and
labelled the result robust. A dropdown that changes nothing is worse than a missing one.
"""

import numpy as np
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

URL = "/api/v1/regression/"

# A clean linear relationship y ~= 2x, plus one gross outlier that OLS chases and a
# robust fit should largely ignore -- that difference is how we prove the type took effect.
X_1D = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
Y_CLEAN = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1, 18.0, 20.2, 22.1, 23.9]
Y_OUTLIER = Y_CLEAN[:-1] + [80.0]
X_2D = [[v, v * v] for v in X_1D]


@override_settings(SECURE_SSL_REDIRECT=False)
class RegressionTypeContractTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _post(self, payload):
        return self.client.post(URL, payload, format="json")

    def _slope(self, response):
        body = response.json()
        coefficients = body.get("coefficients") or {}
        # Single-predictor fits key the coefficient "X1".
        for key in ("X1", "x1", "0"):
            if key in coefficients:
                return float(coefficients[key])
        self.fail(f"No coefficient in response: {body}")

    def test_every_advertised_type_returns_200(self):
        cases = [
            ("simple_linear", {"X": X_1D, "y": Y_CLEAN}),
            ("multiple_linear", {"X": X_2D, "y": Y_CLEAN}),
            ("polynomial", {"X": X_1D, "y": Y_CLEAN, "parameters": {"degree": 2}}),
            ("ridge", {"X": X_1D, "y": Y_CLEAN}),
            ("lasso", {"X": X_1D, "y": Y_CLEAN}),
            ("robust", {"X": X_1D, "y": Y_CLEAN}),
            ("quantile", {"X": X_1D, "y": Y_CLEAN, "parameters": {"quantile": 0.5}}),
            ("stepwise", {"X": X_2D, "y": Y_CLEAN}),
        ]
        for regression_type, payload in cases:
            with self.subTest(type=regression_type):
                response = self._post({"type": regression_type, **payload})
                self.assertEqual(
                    response.status_code, 200, f"{regression_type}: {response.content[:300]}"
                )

    def test_robust_regression_actually_resists_an_outlier(self):
        """
        THE regression test for the dead dropdown. With one gross outlier, OLS is dragged
        badly off the true slope of ~2 while a Huber fit stays near it. If `robust` were
        silently falling through to linear -- which is what the ChoiceField omission caused
        -- these two slopes would be identical.
        """
        ols = self._post({"type": "simple_linear", "X": X_1D, "y": Y_OUTLIER})
        robust = self._post({"type": "robust", "X": X_1D, "y": Y_OUTLIER})
        self.assertEqual(ols.status_code, 200, ols.content[:300])
        self.assertEqual(robust.status_code, 200, robust.content[:300])

        ols_slope = self._slope(ols)
        robust_slope = self._slope(robust)

        self.assertGreater(abs(ols_slope - 2.0), abs(robust_slope - 2.0))
        self.assertNotAlmostEqual(ols_slope, robust_slope, places=3)

    def test_polynomial_degree_is_honoured(self):
        quadratic_y = [float(3 + 2 * x + 0.5 * x * x) for x in X_1D]
        response = self._post(
            {"type": "polynomial", "X": X_1D, "y": quadratic_y, "parameters": {"degree": 2}}
        )
        self.assertEqual(response.status_code, 200, response.content[:300])
        r_squared = float(response.json()["metrics"]["r_squared"])
        self.assertGreater(r_squared, 0.999, "a degree-2 fit must recover a quadratic exactly")

    def test_a_single_predictor_may_be_sent_as_a_flat_list_for_any_type(self):
        """ridge/lasso/robust with one predictor arrive as a 1-D X; that must not 400."""
        for regression_type in ("ridge", "lasso", "robust", "quantile"):
            with self.subTest(type=regression_type):
                response = self._post({"type": regression_type, "X": X_1D, "y": Y_CLEAN})
                self.assertEqual(response.status_code, 200, response.content[:200])

    def test_mismatched_lengths_are_rejected(self):
        response = self._post({"type": "simple_linear", "X": [1, 2, 3], "y": [1, 2]})
        self.assertEqual(response.status_code, 400)

    def test_ragged_design_matrix_is_rejected(self):
        response = self._post({"type": "multiple_linear", "X": [[1, 2], [3], [4, 5]], "y": [1, 2, 3]})
        self.assertEqual(response.status_code, 400)

    def test_an_unknown_type_is_rejected_rather_than_silently_fitting_a_line(self):
        response = self._post({"type": "definitely_not_a_regression", "X": X_1D, "y": Y_CLEAN})
        self.assertEqual(response.status_code, 400)

    def test_slope_matches_numpy_for_ordinary_least_squares(self):
        response = self._post({"type": "simple_linear", "X": X_1D, "y": Y_CLEAN})
        self.assertEqual(response.status_code, 200, response.content[:300])
        expected = np.polyfit(np.array(X_1D, dtype=float), np.array(Y_CLEAN), 1)[0]
        self.assertAlmostEqual(self._slope(response), float(expected), places=6)
