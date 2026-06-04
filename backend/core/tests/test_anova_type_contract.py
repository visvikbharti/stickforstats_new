"""
Contract test for the high-precision ANOVA endpoint (robustness audit 2026-06-04, F-04).

The serializer whitelists anova_type in {one_way, two_way, repeated_measures,
manova} and dedicated routes are registered, but two_way/repeated_measures/manova
were unimplemented -- they raised NotImplementedError (or, via a mis-shaped call,
TypeError) that the generic handler turned into an opaque HTTP 500 'Internal
server error', so the platform looked broken rather than honestly scoped.

This contract test pins: every fully-specified anova_type the serializer accepts
must return either a valid result or an honest non-500 response (501 for the
unimplemented variants). It also guards the related cache fix -- error responses
must not be cached and re-served as a misleading HTTP 200.
"""

from __future__ import annotations

from django.test import override_settings
from rest_framework.test import APITestCase

ANOVA_URL = "/api/v1/stats/anova/"

# Three groups of 6 for one-way / repeated-measures / manova.
GROUPS_3 = [
    [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
    [2.0, 3.0, 4.0, 5.0, 6.0, 7.0],
    [5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
]
# A 2x2 design needs exactly 4 groups for the serializer's two-way validation.
GROUPS_4 = [
    [1.0, 2.0, 3.0, 4.0],
    [2.0, 3.0, 4.0, 5.0],
    [3.0, 4.0, 5.0, 6.0],
    [4.0, 5.0, 6.0, 7.0],
]
# Repeated-measures: 3 conditions x 6 subjects, NON-parallel (real within-subject
# variation) so the error variance is non-zero (parallel data -> F=inf).
GROUPS_RM = [
    [12.0, 9.0, 14.0, 11.0, 13.0, 10.0],
    [14.0, 10.0, 13.0, 12.0, 16.0, 11.0],
    [18.0, 13.0, 17.0, 15.0, 20.0, 14.0],
]

# Fully-specified, serializer-valid payloads for each accepted type.
PAYLOADS = {
    "one_way": {"anova_type": "one_way", "groups": GROUPS_3},
    "two_way": {
        "anova_type": "two_way",
        "groups": GROUPS_4,
        "factor1_levels": ["a", "b"],
        "factor2_levels": ["x", "y"],
    },
    "repeated_measures": {"anova_type": "repeated_measures", "groups": GROUPS_RM},
    "manova": {
        "anova_type": "manova",
        "groups": GROUPS_3,  # 3 groups x 6 = 18 observations define the factor
        # MANOVA needs >= 2 dependent variables, each of length = total obs (18).
        "dependent_variables": [
            [12.0, 9.0, 14.0, 11.0, 13.0, 10.0, 15.0, 12.0, 16.0, 13.0, 17.0, 14.0, 18.0, 15.0, 19.0, 16.0, 20.0, 17.0],
            [5.0, 7.0, 6.0, 8.0, 5.0, 9.0, 7.0, 6.0, 9.0, 8.0, 7.0, 10.0, 8.0, 11.0, 9.0, 12.0, 10.0, 13.0],
        ],
    },
}
# Every ANOVA type the serializer accepts is now implemented.
IMPLEMENTED_TYPES = ["one_way", "two_way", "repeated_measures", "manova"]


@override_settings(
    SECURE_SSL_REDIRECT=False,
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "anova-contract-test",
        }
    },
)
class TestAnovaTypeContract(APITestCase):
    def _post(self, anova_type):
        return self.client.post(ANOVA_URL, PAYLOADS[anova_type], format="json")

    def test_one_way_returns_200(self):
        resp = self._post("one_way")
        self.assertEqual(resp.status_code, 200, msg=resp.content[:300])

    def test_implemented_types_return_200(self):
        # one-way, two-way, repeated-measures, and MANOVA are all implemented.
        for t in IMPLEMENTED_TYPES:
            resp = self._post(t)
            self.assertEqual(
                resp.status_code, 200,
                msg=f"{t}: expected 200, got {resp.status_code}: {resp.content[:200]}",
            )
            self.assertIn("high_precision_result", resp.data)

    def test_no_accepted_type_produces_a_500(self):
        # The core contract: no serializer-accepted type may yield a 500.
        for t in PAYLOADS:
            resp = self._post(t)
            self.assertNotEqual(
                resp.status_code, 500,
                msg=f"anova_type '{t}' produced an opaque 500: {resp.content[:200]}",
            )

    def test_error_responses_are_not_cached_as_200(self):
        # An error response must not be cached and re-served as a misleading 200
        # (F-04 cache fix). MANOVA with only ONE dependent variable raises a
        # ValueError -> HTTP 422; it must stay 422 on a repeat request.
        bad = {
            "anova_type": "manova",
            "groups": GROUPS_3,
            "dependent_variables": [[float(i) for i in range(18)]],  # 1 DV -> 422
        }
        first = self.client.post(ANOVA_URL, bad, format="json")
        second = self.client.post(ANOVA_URL, bad, format="json")
        self.assertEqual(first.status_code, 422, msg=first.content[:200])
        self.assertEqual(second.status_code, 422)

        # A successful 200 may be cached, and the cache path preserves the 200.
        ok1 = self._post("one_way")
        ok2 = self._post("one_way")
        self.assertEqual(ok1.status_code, 200)
        self.assertEqual(ok2.status_code, 200)
        self.assertTrue(ok2.data.get("_cache_hit", False))
