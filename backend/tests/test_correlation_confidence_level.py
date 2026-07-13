"""
The confidence level the user picks must be the confidence level they get.

CorrelationRequestSerializer declared x, y, method, parameters and options -- but not
`confidence_level`. The frontend sent it as a TOP-LEVEL key, DRF silently discards fields it
does not declare, and correlation_views reads it from `parameters`. So the backend always
used the 0.95 default, while the UI rendered its heading from local state: selecting 99%
displayed a 95% interval under a heading that said "99% Confidence Interval".

That is not a dead control. It is a wrong number under a confident label -- the same failure
mode as the dropped `equal_variance` flag, which made the app announce Welch's t-test while
computing Student's.
"""

import numpy as np
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from api.v1.serializers import CorrelationRequestSerializer

X = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
Y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1, 18.0, 20.2, 21.7, 24.4]


class SerializerAcceptsAFlatConfidenceLevel(TestCase):
    def test_flat_confidence_level_is_folded_into_parameters(self):
        serializer = CorrelationRequestSerializer(
            data={"x": X, "y": Y, "method": "pearson", "confidence_level": 0.99}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["parameters"]["confidence_level"], 0.99)

    def test_an_explicitly_nested_value_still_wins(self):
        serializer = CorrelationRequestSerializer(
            data={
                "x": X,
                "y": Y,
                "confidence_level": 0.90,
                "parameters": {"confidence_level": 0.99},
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["parameters"]["confidence_level"], 0.99)

    def test_omitting_it_leaves_parameters_alone(self):
        serializer = CorrelationRequestSerializer(data={"x": X, "y": Y})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("confidence_level", serializer.validated_data.get("parameters", {}))

    def test_a_nonsensical_level_is_rejected_rather_than_ignored(self):
        serializer = CorrelationRequestSerializer(
            data={"x": X, "y": Y, "confidence_level": 1.5}
        )
        self.assertFalse(serializer.is_valid())


@override_settings(SECURE_SSL_REDIRECT=False)
class ConfidenceLevelReachesTheInterval(TestCase):
    URL = "/api/v1/stats/correlation/"

    def setUp(self):
        self.client = APIClient()

    def _interval(self, payload):
        response = self.client.post(self.URL, payload, format="json")
        self.assertEqual(response.status_code, 200, response.content[:300])
        hp = response.json()["high_precision_result"]
        return (
            float(hp["confidence_interval_lower"]),
            float(hp["confidence_interval_upper"]),
        )

    def test_a_higher_confidence_level_gives_a_wider_interval(self):
        """
        The property that makes the bug visible: if `confidence_level` were still being
        dropped, all three of these intervals would be byte-identical.
        """
        widths = {}
        for level in (0.90, 0.95, 0.99):
            lower, upper = self._interval(
                {"x": X, "y": Y, "method": "pearson", "confidence_level": level}
            )
            widths[level] = upper - lower

        self.assertLess(widths[0.90], widths[0.95])
        self.assertLess(widths[0.95], widths[0.99])

    def test_the_flat_and_nested_forms_agree(self):
        flat = self._interval({"x": X, "y": Y, "confidence_level": 0.99})
        nested = self._interval({"x": X, "y": Y, "parameters": {"confidence_level": 0.99}})
        np.testing.assert_allclose(flat, nested, atol=1e-12)

    def test_the_default_is_still_ninety_five_percent(self):
        default = self._interval({"x": X, "y": Y})
        explicit = self._interval({"x": X, "y": Y, "confidence_level": 0.95})
        np.testing.assert_allclose(default, explicit, atol=1e-12)
