"""
The `alternative` parameter contract.
=====================================

Canonical value is scipy's own vocabulary -- {"two-sided", "less", "greater"} -- because
scipy/statsmodels are the ultimate consumers and every module under `core/` speaks it.

The API layer used to canonicalize to "two_sided" (underscore), which scipy rejects with

    ValueError: `alternative` must be one of {'less', 'two-sided', 'greater'}

i.e. it CORRUPTED a perfectly valid incoming value. Two views (wilcoxon, sign) hand-patched
the value back and worked; mann-whitney and jonckheere never got the patch, so Mann-Whitney
returned HTTP 500 on every request that supplied `alternative` -- and Mann-Whitney is exactly
what the Guardian recommends when it blocks an independent t-test. Not one test covered it.

These tests pin the contract end to end: EVERY accepted spelling, on EVERY endpoint that takes
an `alternative`, must produce a 200 and the SAME result as the canonical spelling.
"""

import numpy as np
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.hp_nonparametric_comprehensive import (
    canonical_alternative,
    canonical_ordered_alternative,
)

# Two clearly-separated groups: any sane test returns a small p-value, and the
# directional p-values are unmistakably asymmetric (so a dropped `alternative` shows up).
GROUP_LOW = [10.2, 9.8, 11.1, 8.9, 10.5, 9.4, 10.8, 9.1, 10.0, 9.7]
GROUP_HIGH = [12.5, 14.2, 11.8, 15.3, 13.7, 12.9, 14.8, 13.1, 12.2, 14.0]
GROUP_MID = [11.2, 11.9, 12.0, 11.5, 12.4, 11.1, 11.8, 12.2, 11.6, 12.1]

TWO_SIDED_SPELLINGS = ["two-sided", "two_sided", "two.sided", "twosided", "2-sided", "both", "TWO-SIDED"]
LESS_SPELLINGS = ["less", "less_than", "lt", "<"]
GREATER_SPELLINGS = ["greater", "greater_than", "gt", ">"]


class CanonicalAlternativeTests(TestCase):
    """The normalizer itself."""

    def test_every_two_sided_spelling_maps_to_scipys(self):
        for spelling in TWO_SIDED_SPELLINGS:
            self.assertEqual(canonical_alternative(spelling), "two-sided", spelling)

    def test_directional_spellings(self):
        for spelling in LESS_SPELLINGS:
            self.assertEqual(canonical_alternative(spelling), "less", spelling)
        for spelling in GREATER_SPELLINGS:
            self.assertEqual(canonical_alternative(spelling), "greater", spelling)

    def test_none_defaults_to_two_sided(self):
        self.assertEqual(canonical_alternative(None), "two-sided")

    def test_unknown_value_raises_rather_than_silently_defaulting(self):
        # Silently coercing garbage to "two-sided" would hide a caller's bug and
        # report the wrong test. Fail loudly.
        with self.assertRaises(ValueError):
            canonical_alternative("sideways")

    def test_ordered_vocabulary_is_separate(self):
        # Jonckheere/Page take a DIRECTION OF TREND, not less/greater. Routing them
        # through canonical_alternative() would reject "increasing" outright.
        self.assertEqual(canonical_ordered_alternative("increasing"), "increasing")
        self.assertEqual(canonical_ordered_alternative("decreasing"), "decreasing")
        self.assertEqual(canonical_ordered_alternative("two-sided"), "two-sided")
        # A caller who says "greater"/"less" plainly means the trend direction.
        self.assertEqual(canonical_ordered_alternative("greater"), "increasing")
        self.assertEqual(canonical_ordered_alternative("less"), "decreasing")
        with self.assertRaises(ValueError):
            canonical_ordered_alternative("sideways")

    def test_the_two_vocabularies_do_not_leak_into_each_other(self):
        with self.assertRaises(ValueError):
            canonical_alternative("increasing")


@override_settings(SECURE_SSL_REDIRECT=False)
class AlternativeEndpointContractTests(TestCase):
    """Every endpoint that accepts `alternative`, against every accepted spelling."""

    # Hard-code the public paths rather than reverse() -- these ARE the contract the
    # frontend calls, and a rename that silently breaks them should fail this suite.
    URLS = {
        "mann-whitney": "/api/v1/nonparametric/mann-whitney/",
        "wilcoxon": "/api/v1/nonparametric/wilcoxon/",
        "sign-test": "/api/v1/nonparametric/sign/",
        "jonckheere": "/api/v1/nonparametric/jonckheere/",
    }

    def setUp(self):
        self.client = APIClient()

    def _post(self, name, payload):
        return self.client.post(self.URLS[name], payload, format="json")

    def _p_value(self, response):
        body = response.json()
        results = body.get("results") or body.get("high_precision_result") or {}
        for key in ("p_value", "asymptotic_p_value", "exact_p_value", "pvalue"):
            if results.get(key) is not None:
                return float(results[key])
        self.fail(f"No p-value in response: {body}")

    # ------------------------------------------------------------------ Mann-Whitney
    # This is THE regression test: the endpoint the Guardian hands you when it blocks a
    # t-test, and the one that 500'd on every request carrying an `alternative`.

    def test_mann_whitney_accepts_every_two_sided_spelling_with_identical_results(self):
        p_values = []
        for spelling in TWO_SIDED_SPELLINGS:
            r = self._post(
                "mann-whitney",
                {"group1": GROUP_LOW, "group2": GROUP_HIGH, "alternative": spelling},
            )
            self.assertEqual(r.status_code, 200, f"{spelling!r} -> {r.status_code}: {r.content[:200]}")
            p_values.append(self._p_value(r))
        for p in p_values[1:]:
            self.assertAlmostEqual(p, p_values[0], places=12)

    def test_mann_whitney_omitting_alternative_matches_explicit_two_sided(self):
        implicit = self._post("mann-whitney", {"group1": GROUP_LOW, "group2": GROUP_HIGH})
        explicit = self._post(
            "mann-whitney", {"group1": GROUP_LOW, "group2": GROUP_HIGH, "alternative": "two-sided"}
        )
        self.assertEqual(implicit.status_code, 200)
        self.assertEqual(explicit.status_code, 200)
        self.assertAlmostEqual(self._p_value(implicit), self._p_value(explicit), places=12)

    def test_mann_whitney_directional_alternatives_actually_take_effect(self):
        """group1 < group2, so `less` must be significant and `greater` must not be."""
        less = self._post(
            "mann-whitney", {"group1": GROUP_LOW, "group2": GROUP_HIGH, "alternative": "less"}
        )
        greater = self._post(
            "mann-whitney", {"group1": GROUP_LOW, "group2": GROUP_HIGH, "alternative": "greater"}
        )
        self.assertEqual(less.status_code, 200)
        self.assertEqual(greater.status_code, 200)
        p_less, p_greater = self._p_value(less), self._p_value(greater)
        self.assertLess(p_less, 0.01, "group1 is clearly the lower group")
        self.assertGreater(p_greater, 0.99, "so the opposite tail must be ~1")
        # If `alternative` were being dropped, both would come back as the same two-sided p.
        self.assertNotAlmostEqual(p_less, p_greater, places=6)

    def test_mann_whitney_rejects_garbage_with_400_not_500(self):
        r = self._post(
            "mann-whitney", {"group1": GROUP_LOW, "group2": GROUP_HIGH, "alternative": "sideways"}
        )
        self.assertEqual(r.status_code, 400, r.content[:200])

    # ------------------------------------------------------------------ Wilcoxon
    def test_wilcoxon_accepts_every_two_sided_spelling(self):
        for spelling in TWO_SIDED_SPELLINGS:
            r = self._post("wilcoxon", {"x": GROUP_LOW, "y": GROUP_HIGH, "alternative": spelling})
            self.assertEqual(r.status_code, 200, f"{spelling!r} -> {r.status_code}: {r.content[:200]}")

    def test_wilcoxon_directional_alternatives_take_effect(self):
        less = self._post("wilcoxon", {"x": GROUP_LOW, "y": GROUP_HIGH, "alternative": "less"})
        greater = self._post("wilcoxon", {"x": GROUP_LOW, "y": GROUP_HIGH, "alternative": "greater"})
        self.assertEqual(less.status_code, 200)
        self.assertEqual(greater.status_code, 200)
        self.assertLess(self._p_value(less), self._p_value(greater))

    # ------------------------------------------------------------------ Sign test
    def test_sign_test_accepts_every_two_sided_spelling(self):
        for spelling in TWO_SIDED_SPELLINGS:
            r = self._post("sign-test", {"x": GROUP_LOW, "y": GROUP_HIGH, "alternative": spelling})
            self.assertEqual(r.status_code, 200, f"{spelling!r} -> {r.status_code}: {r.content[:200]}")

    # ------------------------------------------------------------------ Jonckheere
    def test_jonckheere_accepts_its_own_vocabulary(self):
        for spelling in ["increasing", "decreasing", "two-sided", "two_sided"]:
            r = self._post(
                "jonckheere",
                {"groups": [GROUP_LOW, GROUP_MID, GROUP_HIGH], "alternative": spelling},
            )
            self.assertEqual(r.status_code, 200, f"{spelling!r} -> {r.status_code}: {r.content[:200]}")

    def test_jonckheere_alternative_is_not_ignored(self):
        """
        The groups are ordered low < mid < high, so `increasing` must be significant and
        `decreasing` must not be. Before the fix, `jonckheere_terpstra_test` accepted an
        `alternative` argument and then never used it -- it always returned the same p.
        """
        inc = self._post(
            "jonckheere", {"groups": [GROUP_LOW, GROUP_MID, GROUP_HIGH], "alternative": "increasing"}
        )
        dec = self._post(
            "jonckheere", {"groups": [GROUP_LOW, GROUP_MID, GROUP_HIGH], "alternative": "decreasing"}
        )
        self.assertEqual(inc.status_code, 200)
        self.assertEqual(dec.status_code, 200)
        p_inc, p_dec = self._p_value(inc), self._p_value(dec)
        self.assertLess(p_inc, 0.01, "a monotone increasing trend must be detected")
        self.assertGreater(p_dec, 0.99, "and the decreasing alternative must not be")
        self.assertNotAlmostEqual(p_inc, p_dec, places=6)

    def test_jonckheere_rejects_a_directional_spelling_it_cannot_honour(self):
        r = self._post(
            "jonckheere", {"groups": [GROUP_LOW, GROUP_MID, GROUP_HIGH], "alternative": "sideways"}
        )
        self.assertEqual(r.status_code, 400, r.content[:200])


class ParameterAdapterAlternativeTests(TestCase):
    """The universal adapter must never emit a spelling scipy rejects."""

    def test_adapter_emits_scipys_spelling(self):
        from api.v1.parameter_adapter import parameter_adapter

        for spelling in TWO_SIDED_SPELLINGS:
            adapted = parameter_adapter.adapt_parameters("nonparametric", {"alternative": spelling})
            self.assertEqual(adapted["alternative"], "two-sided", spelling)

    def test_adapter_leaves_a_valid_scipy_value_alone(self):
        from api.v1.parameter_adapter import parameter_adapter

        for value in ["two-sided", "less", "greater"]:
            adapted = parameter_adapter.adapt_parameters("ttest", {"alternative": value})
            self.assertEqual(adapted["alternative"], value)


class SerializerAlternativeTests(TestCase):
    """The DRF serializers must accept both spellings and emit scipy's."""

    def test_ttest_serializer_normalizes(self):
        from api.v1.serializers import TTestRequestSerializer

        for spelling in TWO_SIDED_SPELLINGS:
            s = TTestRequestSerializer(
                data={
                    "test_type": "two_sample",
                    "data1": GROUP_LOW,
                    "data2": GROUP_HIGH,
                    "alternative": spelling,
                }
            )
            self.assertTrue(s.is_valid(), f"{spelling!r}: {s.errors}")
            self.assertEqual(s.validated_data["alternative"], "two-sided", spelling)

    def test_nonparametric_serializer_accepts_scipys_own_spelling(self):
        """The old ChoiceField(choices=["two_sided", ...]) 400'd on scipy's own value."""
        from api.v1.serializers import NonParametricRequestSerializer

        s = NonParametricRequestSerializer(
            data={
                "test_type": "mann_whitney",
                "data1": GROUP_LOW,
                "data2": GROUP_HIGH,
                "alternative": "two-sided",
            }
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["alternative"], "two-sided")

    def test_nonparametric_serializer_still_accepts_the_legacy_underscore(self):
        from api.v1.serializers import NonParametricRequestSerializer

        s = NonParametricRequestSerializer(
            data={
                "test_type": "mann_whitney",
                "data1": GROUP_LOW,
                "data2": GROUP_HIGH,
                "alternative": "two_sided",
            }
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["alternative"], "two-sided")

    def test_nonparametric_serializer_uses_the_ordered_vocabulary_for_trend_tests(self):
        from api.v1.serializers import NonParametricRequestSerializer

        s = NonParametricRequestSerializer(
            data={
                "test_type": "jonckheere",
                "groups": [GROUP_LOW, GROUP_MID, GROUP_HIGH],
                "alternative": "increasing",
            }
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["alternative"], "increasing")


class ScipyAgreementTests(TestCase):
    """Whatever spelling comes in, the number that comes out must match scipy."""

    def test_mann_whitney_matches_scipy_for_each_alternative(self):
        from scipy import stats

        from core.hp_nonparametric_comprehensive import HighPrecisionNonParametric

        calc = HighPrecisionNonParametric()
        # No ties in this data, so the calculator uses the exact distribution -- which is
        # what it should do, and what we compare against.
        x, y = np.array(GROUP_LOW), np.array(GROUP_HIGH)

        for wire_value, scipy_value in [
            ("two_sided", "two-sided"),  # the spelling the API used to emit
            ("two-sided", "two-sided"),
            ("TWO-SIDED", "two-sided"),
            ("both", "two-sided"),
            ("less", "less"),
            ("lt", "less"),
            ("greater", "greater"),
            ("gt", "greater"),
        ]:
            result = calc.mann_whitney_u(x, y, alternative=wire_value, use_continuity=True)
            expected = stats.mannwhitneyu(x, y, alternative=scipy_value, method="exact").pvalue
            self.assertAlmostEqual(float(result.p_value), float(expected), places=12, msg=wire_value)
