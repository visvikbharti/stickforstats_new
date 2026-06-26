"""T20 — verification-engine control suite (the Phase-A exit instrument).

Positive/negative controls that pin every verdict the raw-data verification engine can return,
so a regression in extraction, recompute, assumption-checking, or verdict assignment is caught:

    correct value + assumptions OK        -> VERIFIED
    wrong value                           -> DISCREPANT
    parametric test on non-normal data    -> ASSUMPTION_VIOLATED
    no linked dataset                     -> INSUFFICIENT_DATA
    garbled claim (no statistic/p)        -> UNVERIFIABLE_EXTRACTION

This is the Django-test form of the standalone control suite
``paper/replication/verification/check_t12_t13_t19.py`` (so it runs in CI alongside the rest of the
backend suite). Data are generated in-process (seeded) except the ASSUMPTION_VIOLATED case, which
uses the canonical UCI red-wine replication dataset (the engine's normality heuristic is data-driven;
the wine alcohol-vs-quality correlation is the reproducible non-normal control). VERIFIED/DISCREPANT
recompute their own ground-truth statistic with scipy, so the controls are self-checking.
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
from django.test import SimpleTestCase
from scipy import stats

from core.manuscript.claim_extractor import StatisticalClaim
from core.manuscript.reanalysis_engine import verify_claim
from core.manuscript.verdicts import ClaimDataSpec, ClaimVerificationRequest, Verdict

_WINE = Path(__file__).resolve().parents[3] / "paper/replication/data/winequality-red.csv"


def _verify(claim_kwargs, spec_kwargs):
    claim = StatisticalClaim(location="Results", **claim_kwargs)
    spec = ClaimDataSpec(**spec_kwargs) if spec_kwargs is not None else None
    return verify_claim(ClaimVerificationRequest(claim=claim, data_spec=spec))


class VerificationEngineControlSuite(SimpleTestCase):
    """Every verdict type, pinned by a crafted positive/negative control."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        rng = np.random.default_rng(0)
        # Three clean, equal-variance normal groups -> a well-behaved one-way ANOVA.
        cls.groups = [list(rng.normal(m, 2.0, 40)) for m in (10.0, 11.5, 13.0)]
        cls.F_true = round(float(stats.f_oneway(*cls.groups).statistic), 2)
        # Two clean normal groups -> a well-behaved independent t-test.
        cls.g1 = list(rng.normal(10.0, 2.0, 40))
        cls.g2 = list(rng.normal(11.4, 2.0, 40))
        cls.t_true = round(float(stats.ttest_ind(cls.g1, cls.g2, equal_var=True).statistic), 2)

    def test_correct_value_and_assumptions_ok_is_verified(self):
        cv = _verify(
            dict(claim_id="V1", claim_type="f_statistic", statistic_value=self.F_true,
                 statistic_raw=f"{self.F_true:.2f}", p_value=0.001, test_name="one-way ANOVA"),
            dict(groups=self.groups))
        self.assertEqual(cv.verdict, Verdict.VERIFIED)
        self.assertTrue(cv.statistic_match)

    def test_correct_ttest_value_is_verified(self):
        cv = _verify(
            dict(claim_id="V2", claim_type="t_statistic", statistic_value=self.t_true,
                 statistic_raw=f"{self.t_true:.2f}", p_value=0.01, test_name="independent samples t-test"),
            dict(groups=[self.g1, self.g2]))
        self.assertEqual(cv.verdict, Verdict.VERIFIED)

    def test_wrong_value_is_discrepant(self):
        wrong = round(self.F_true * 0.5, 2)  # half the true F -> will not reproduce
        cv = _verify(
            dict(claim_id="D1", claim_type="f_statistic", statistic_value=wrong,
                 statistic_raw=f"{wrong:.2f}", p_value=0.001, test_name="one-way ANOVA"),
            dict(groups=self.groups))
        self.assertEqual(cv.verdict, Verdict.DISCREPANT)
        self.assertFalse(cv.statistic_match)

    def test_parametric_on_non_normal_data_is_assumption_violated(self):
        if not _WINE.exists():
            self.skipTest("wine replication dataset not present")
        rows = list(csv.DictReader(_WINE.open(), delimiter=";"))
        alcohol = [float(r["alcohol"]) for r in rows]
        quality = [float(r["quality"]) for r in rows]
        # Pearson r reproduces (0.476) but the data are non-normal -> assumption flagged.
        cv = _verify(
            dict(claim_id="A1", claim_type="r_value", statistic_value=0.476, statistic_raw="0.476",
                 p_value=0.001, sample_size=len(alcohol), test_name="Pearson correlation"),
            dict(x=alcohol, y=quality))
        self.assertEqual(cv.verdict, Verdict.ASSUMPTION_VIOLATED)

    def test_no_linked_dataset_is_insufficient_data(self):
        cv = _verify(
            dict(claim_id="I1", claim_type="t_statistic", statistic_value=2.10, statistic_raw="2.10",
                 p_value=0.04, df=(38,)),
            None)
        self.assertEqual(cv.verdict, Verdict.INSUFFICIENT_DATA)

    def test_garbled_claim_is_unverifiable_extraction(self):
        cv = _verify(
            dict(claim_id="U1", claim_type="t_statistic", statistic_value=None, p_value=None,
                 confidence=0.3),
            dict(groups=self.groups))
        self.assertEqual(cv.verdict, Verdict.UNVERIFIABLE_EXTRACTION)
