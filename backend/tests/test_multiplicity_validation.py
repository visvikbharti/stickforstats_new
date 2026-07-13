"""
Every multiple-comparison correction, cross-checked against statsmodels.

The frontend's MultiplicityCorrectionPanel reimplemented these in JavaScript and got Holm,
Benjamini-Hochberg and Hommel wrong -- Holm by omitting the step-down stopping rule and the
running maximum, BH by omitting the step-up running minimum. On p = [0.030, 0.031] the JS
Holm declared the SECOND hypothesis significant while failing to reject the first, which has
a smaller p-value: a direct FWER violation. The fix is to delete that second implementation
and call this one, so there is exactly one correction engine and it is the tested one.

Benjamini-Yekutieli, meanwhile, was wrong HERE: it ran BH against a deflated alpha, which
gives the right rejections but leaves the reported adjusted p-values as BH's, unscaled by
c(n). It reported BH q-values under a BY label.
"""

import numpy as np
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient
from statsmodels.stats.multitest import multipletests

from core.multiplicity import CorrectionMethod, MultiplicityCorrector

# Everything MultiplicityCorrectionRequestSerializer offers. Every one must actually run.
ADVERTISED_METHODS = [
    "bonferroni",
    "holm",
    "hochberg",
    "hommel",
    "sidak",
    "holm-sidak",
    "fdr_bh",
    "fdr_by",
    "fdr_tst",
    "qvalue",
    "none",
]

# Our method -> statsmodels' name for the same procedure.
EQUIVALENT = {
    "bonferroni": "bonferroni",
    "holm": "holm",
    "hochberg": "simes-hochberg",
    "sidak": "sidak",
    "holm-sidak": "holm-sidak",
    "fdr_bh": "fdr_bh",
    "fdr_by": "fdr_by",
    "hommel": "hommel",
}

CASES = {
    # The counterexample that exposes a missing step-down/step-up pass.
    "adjacent p-values": [0.030, 0.031],
    "typical spread": [0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205, 0.212, 0.216],
    "nothing significant": [0.4, 0.5, 0.6, 0.7],
    "ties": [0.01, 0.01, 0.04, 0.04],
    "single test": [0.02],
    "everything significant": [0.0001, 0.0002, 0.0003],
    "one tiny, rest null": [1e-9, 0.5, 0.6, 0.7, 0.8],
}


class MultiplicityAgreesWithStatsmodels(SimpleTestCase):
    def setUp(self):
        self.corrector = MultiplicityCorrector(alpha=0.05)

    def test_adjusted_pvalues_and_rejections_match_statsmodels(self):
        for case, p_values in CASES.items():
            for ours, theirs in EQUIVALENT.items():
                with self.subTest(case=case, method=ours):
                    result = self.corrector.correct(
                        np.array(p_values), method=CorrectionMethod(ours)
                    )
                    rejected, adjusted, _, _ = multipletests(p_values, alpha=0.05, method=theirs)

                    np.testing.assert_allclose(
                        np.asarray(result.adjusted_pvalues, dtype=float), adjusted, atol=1e-9
                    )
                    np.testing.assert_array_equal(
                        np.asarray(result.rejected, dtype=bool), rejected
                    )


class MultiplicityInvariants(SimpleTestCase):
    """Properties that must hold whatever the method, and that the JS version broke."""

    def setUp(self):
        self.corrector = MultiplicityCorrector(alpha=0.05)

    def test_adjusted_pvalues_are_monotone_in_the_raw_pvalues(self):
        """
        A hypothesis with a LARGER raw p-value can never end up with a SMALLER adjusted one.
        The JS Holm violated exactly this, which is how it rejected p=0.031 while failing to
        reject p=0.030.
        """
        for case, p_values in CASES.items():
            for method in EQUIVALENT:
                with self.subTest(case=case, method=method):
                    result = self.corrector.correct(
                        np.array(p_values), method=CorrectionMethod(method)
                    )
                    order = np.argsort(p_values)
                    adjusted = np.asarray(result.adjusted_pvalues, dtype=float)[order]
                    self.assertTrue(
                        np.all(np.diff(adjusted) >= -1e-12),
                        f"{method} produced non-monotone adjusted p-values: {adjusted}",
                    )

    def test_rejections_are_a_prefix_of_the_sorted_pvalues(self):
        """You cannot reject a larger p-value while failing to reject a smaller one."""
        for case, p_values in CASES.items():
            for method in EQUIVALENT:
                with self.subTest(case=case, method=method):
                    result = self.corrector.correct(
                        np.array(p_values), method=CorrectionMethod(method)
                    )
                    order = np.argsort(p_values)
                    rejected = np.asarray(result.rejected, dtype=bool)[order]
                    # Once False, must stay False.
                    seen_false = False
                    for flag in rejected:
                        if not flag:
                            seen_false = True
                        elif seen_false:
                            self.fail(f"{method} rejected a larger p after sparing a smaller one")

    def test_holm_does_not_reject_either_of_two_adjacent_pvalues(self):
        """The bug in one assertion: neither of p=[0.030, 0.031] survives Holm at alpha=0.05."""
        result = self.corrector.correct(np.array([0.030, 0.031]), method=CorrectionMethod("holm"))
        np.testing.assert_allclose(
            np.asarray(result.adjusted_pvalues, dtype=float), [0.06, 0.06], atol=1e-12
        )
        self.assertFalse(np.any(np.asarray(result.rejected, dtype=bool)))

    def test_bh_rejects_both_of_two_adjacent_pvalues(self):
        """And BH rejects BOTH -- the JS version rejected only the second."""
        result = self.corrector.correct(
            np.array([0.030, 0.031]), method=CorrectionMethod("fdr_bh")
        )
        np.testing.assert_allclose(
            np.asarray(result.adjusted_pvalues, dtype=float), [0.031, 0.031], atol=1e-12
        )
        self.assertTrue(np.all(np.asarray(result.rejected, dtype=bool)))

    def test_by_is_strictly_more_conservative_than_bh(self):
        """
        BY exists to control FDR under ARBITRARY dependence, at the price of a c(n) penalty.
        If its adjusted p-values come back equal to BH's, the penalty was never applied and
        the label is a lie -- which is exactly what it used to do.
        """
        p_values = np.array(CASES["typical spread"])
        bh = self.corrector.correct(p_values, method=CorrectionMethod("fdr_bh"))
        by = self.corrector.correct(p_values, method=CorrectionMethod("fdr_by"))

        bh_adjusted = np.asarray(bh.adjusted_pvalues, dtype=float)
        by_adjusted = np.asarray(by.adjusted_pvalues, dtype=float)

        self.assertTrue(np.all(by_adjusted >= bh_adjusted - 1e-12))
        self.assertTrue(
            np.any(by_adjusted > bh_adjusted + 1e-9),
            "BY returned BH's adjusted p-values -- the c(n) penalty was not applied",
        )

    def test_bonferroni_is_the_most_conservative_fwer_method(self):
        p_values = np.array(CASES["typical spread"])
        bonferroni = np.asarray(
            self.corrector.correct(p_values, method=CorrectionMethod("bonferroni")).adjusted_pvalues,
            dtype=float,
        )
        holm = np.asarray(
            self.corrector.correct(p_values, method=CorrectionMethod("holm")).adjusted_pvalues,
            dtype=float,
        )
        self.assertTrue(np.all(holm <= bonferroni + 1e-12))


@override_settings(SECURE_SSL_REDIRECT=False)
class MultiplicityEndpointTests(TestCase):
    """
    POST /api/multiplicity/correct/ had NEVER worked: the view called result.get(...) on a
    CorrectionResult dataclass, which has no .get(), so every request raised AttributeError
    and came back as a 500. That is almost certainly why the frontend grew its own JavaScript
    reimplementation -- and why that reimplementation's Holm and BH bugs went unnoticed.

    The serializer separately advertised fdr_tsbh / fdr_tsbky / simes-hochberg, none of which
    exist in CorrectionMethod, so requesting one 500'd too.
    """

    URL = "/api/multiplicity/correct/"

    def setUp(self):
        self.client = APIClient()

    def test_every_advertised_method_returns_200(self):
        p_values = [0.001, 0.008, 0.039, 0.041, 0.2]
        for method in ADVERTISED_METHODS:
            with self.subTest(method=method):
                response = self.client.post(
                    self.URL, {"p_values": p_values, "method": method, "alpha": 0.05}, format="json"
                )
                self.assertEqual(
                    response.status_code, 200, f"{method}: {response.content[:250]}"
                )
                body = response.json()
                self.assertEqual(len(body["p_values_adjusted"]), len(p_values))
                self.assertEqual(len(body["rejected"]), len(p_values))

    def test_endpoint_agrees_with_statsmodels(self):
        p_values = [0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205]
        for ours, theirs in EQUIVALENT.items():
            with self.subTest(method=ours):
                response = self.client.post(
                    self.URL, {"p_values": p_values, "method": ours, "alpha": 0.05}, format="json"
                )
                self.assertEqual(response.status_code, 200, response.content[:250])
                _, expected, _, _ = multipletests(p_values, alpha=0.05, method=theirs)
                np.testing.assert_allclose(
                    response.json()["p_values_adjusted"], expected, atol=1e-9
                )

    def test_holm_does_not_reject_the_larger_of_two_adjacent_pvalues(self):
        """The frontend's JS did. This is the end-to-end guard against that ever shipping again."""
        response = self.client.post(
            self.URL, {"p_values": [0.030, 0.031], "method": "holm", "alpha": 0.05}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.content[:250])
        body = response.json()
        self.assertEqual(body["rejected"], [False, False])
        self.assertEqual(body["n_significant"], 0)

    def test_a_method_that_does_not_exist_is_a_400_not_a_500(self):
        response = self.client.post(
            self.URL, {"p_values": [0.01, 0.02], "method": "simes-hochberg"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
