"""Tests for 'x 10^n' scientific-notation normalization in extraction.

Guards the fix for p-values written as e.g. 'p = 1.96 x 10^-11', which the
numeric patterns previously read as an impossible 'p = 1.96'.
"""

from django.test import TestCase

from core.manuscript.claim_extractor import StatisticalClaimExtractor, normalize_scientific_notation


class ScientificNotationNormalizeTests(TestCase):
    def test_canonical_forms(self):
        cases = {
            "p = 1.96 x 10^-11": "p = 1.96e-11",
            "p = 1.96 × 10⁻¹¹": "p = 1.96e-11",       # unicode times + superscript
            "p = 1.96 × 10−11": "p = 1.96e-11",        # unicode minus
            "p = 1.96 × 10 − 11": "p = 1.96e-11",      # spaced
            "F = 3.2 x 10^5": "F = 3.2e5",
            "1.96 · 10⁻¹¹": "1.96e-11",                # middle dot
            "21.96 × 10⁻³": "21.96e-3",                # multi-digit mantissa preserved
        }
        for src, expected in cases.items():
            self.assertEqual(normalize_scientific_notation(src), expected, src)

    def test_non_matches_unchanged(self):
        for s in ("5 x 10 participants", "10 items per group", "n = 10", "p = 0.03"):
            self.assertEqual(normalize_scientific_notation(s), s)

    def test_idempotent(self):
        self.assertEqual(normalize_scientific_notation("p = 1.96e-11"), "p = 1.96e-11")

    def test_extraction_recovers_tiny_p(self):
        ex = StatisticalClaimExtractor()
        claims = ex.extract("Removal efficiency, F(4,10) = 130.88, p = 1.96 × 10⁻¹¹.", "results")
        fclaims = [c for c in claims if c.claim_type == "f_statistic"]
        self.assertEqual(len(fclaims), 1)
        self.assertAlmostEqual(fclaims[0].p_value, 1.96e-11, places=13)
        self.assertLessEqual(fclaims[0].p_value, 1.0)  # never an impossible p
