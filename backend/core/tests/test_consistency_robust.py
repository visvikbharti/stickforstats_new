"""Independent tests for the rounding- and inequality-aware consistency check.

These cases are constructed from first principles (scipy-true p-values), NOT
from any particular paper, so they validate the *algorithm* rather than fitting
the examples that motivated it. They cover: exact agreement, inequality
satisfied (the common reporting form that must NOT be flagged), inequality
violated (a real decision error), an exact discrepancy with no decision change,
and an exact decision error.
"""

from django.test import TestCase

from core.manuscript.advanced_validators import StatisticalConsistencyValidator
from core.manuscript.claim_extractor import StatisticalClaim


def _claim(ctype, stat, stat_raw, p, p_raw, comp, df):
    return StatisticalClaim(
        claim_type=ctype,
        statistic_value=stat,
        statistic_raw=stat_raw,
        p_value=p,
        p_value_raw=p_raw,
        p_comparison=comp,
        df=df,
        raw_text=f"{ctype} {stat}, p {comp} {p}",
    )


class ConsistencyRobustTests(TestCase):
    def _severity(self, claim):
        f = StatisticalConsistencyValidator(alpha=0.05)._check_claim(claim, None)
        return None if f is None else f.severity

    def test_exact_agreement_is_consistent(self):
        # t(30)=2.042 -> two-tailed p = .05 exactly.
        self.assertEqual(
            self._severity(_claim("t_statistic", 2.042, "2.042", 0.05, "05", "equals", (30,))),
            "positive",
        )

    def test_inequality_satisfied_is_consistent(self):
        # F(2,100)=8.0 -> p ~ .0006, which SATISFIES "p < .05". Must NOT flag.
        self.assertEqual(
            self._severity(_claim("f_statistic", 8.0, "8.0", 0.05, "05", "less_than", (2, 100))),
            "positive",
        )

    def test_inequality_satisfied_strict_is_consistent(self):
        # t(50)=2.5 -> p ~ .0157, satisfies "p < .05".
        self.assertEqual(
            self._severity(_claim("t_statistic", 2.5, "2.5", 0.05, "05", "less_than", (50,))),
            "positive",
        )

    def test_inequality_violated_is_gross(self):
        # t(50)=1.0 -> p ~ .32, which does NOT satisfy "p < .05": a decision error.
        self.assertEqual(
            self._severity(_claim("t_statistic", 1.0, "1.0", 0.05, "05", "less_than", (50,))),
            "blocking",
        )

    def test_exact_discrepancy_without_decision_change_is_major(self):
        # F(2,100)=3.5 -> p ~ .034, but reported p = .001 (both significant).
        self.assertEqual(
            self._severity(_claim("f_statistic", 3.5, "3.5", 0.001, "001", "equals", (2, 100))),
            "major",
        )

    def test_exact_decision_error_is_gross(self):
        # t(20)=1.5 -> p ~ .149 (not significant) but reported p = .001 (significant).
        self.assertEqual(
            self._severity(_claim("t_statistic", 1.5, "1.5", 0.001, "001", "equals", (20,))),
            "blocking",
        )

    def test_rounding_edge_is_consistent(self):
        # t(166)=0.38 -> p ~ .7044; reported .71 is consistent once the
        # statistic's rounding (0.38 -> [0.375,0.385)) is accounted for.
        self.assertEqual(
            self._severity(_claim("t_statistic", 0.38, "0.38", 0.71, "71", "equals", (166,))),
            "positive",
        )
