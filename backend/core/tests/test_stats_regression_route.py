"""
Contract test for the headline POST /api/v1/stats/regression/ endpoint.

This endpoint previously routed to SimpleRegressionView — a scipy float64 stub
whose results were wrapped in Decimal() and labeled "50 decimals" (fake
precision, audit 2026-05-31, ST-3). It now routes to HighPrecisionRegressionView.
This test pins that the route resolves to the high-precision view and returns a
genuine high-precision coefficient (far more than float64's ~15 significant
digits), so a regression back to the stub is caught.
"""

from __future__ import annotations

from django.test import TestCase, override_settings
from django.urls import resolve


class TestStatsRegressionRoute(TestCase):
    def test_route_resolves_to_high_precision_view(self):
        match = resolve("/api/v1/stats/regression/")
        self.assertEqual(match.func.view_class.__name__, "HighPrecisionRegressionView")

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_endpoint_returns_genuine_high_precision(self):
        resp = self.client.post(
            "/api/v1/stats/regression/",
            {"type": "simple_linear", "X": [1, 2, 3, 4, 5], "y": [2.1, 4.0, 6.2, 7.9, 10.1]},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn("coefficients", body)
        self.assertIn("intercept", body)
        # The intercept should carry many more significant digits than float64
        # (~15) — proof it is real Decimal high precision, not a float wrapped in
        # Decimal() as the old stub did.
        intercept_str = str(body["intercept"])
        digits = intercept_str.replace("-", "").replace(".", "").rstrip("0")
        self.assertGreater(len(digits), 20, f"intercept not high-precision: {intercept_str}")
