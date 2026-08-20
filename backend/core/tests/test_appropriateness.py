"""
Claim-level appropriateness engine (Phase 2, increment 1).

The validator this replaces emitted TWO contradictory "major" findings, at a hardcoded
confidence of 0.80, on a textbook-correct two-experiment paper. Every test here names the
mutation that must break it.
"""

import unittest

from django.test import SimpleTestCase

from core.manuscript.appropriateness import (
    RULES,
    EvidenceGrade,
    Fires,
    Rule,
    Silent,
    evaluate_claim,
    evaluate_claims,
    plausible_df_readings,
)
from core.manuscript.claim_extractor import StatisticalClaimExtractor


def _findings(text):
    claims = StatisticalClaimExtractor().extract(text, section="Results")
    return claims, evaluate_claims(claims, manuscript_text=text, methods_text=text)


class StructuralInvariantTests(SimpleTestCase):

    def test_a_rule_cannot_carry_a_confidence(self):
        """The hardcoded 0.80 must be UNREPRESENTABLE, not merely discouraged.

        MUTATION: add a `confidence: float` field to Rule or Fires -> the import-time invariant
        raises and this fails.
        """
        for cls in (Rule, Fires):
            self.assertNotIn("confidence", {f.name for f in cls.__dataclass_fields__.values()})

    def test_every_rule_cites_a_source(self):
        """A rule that cannot cite why the practice is wrong should not tell an author it is.

        MUTATION: blank any rule's citation -> import raises, fails.
        """
        for rule in RULES:
            self.assertTrue(rule.citation.strip(), rule.rule_id)
            self.assertIn(rule.severity, ("blocking", "major", "moderate", "minor"))

    def test_rule_ids_are_unique(self):
        """They are the join key for the future calibration table."""
        ids = [r.rule_id for r in RULES]
        self.assertEqual(len(ids), len(set(ids)))


class RuleBehaviourTests(SimpleTestCase):

    TWO_CORRECT_EXPERIMENTS = (
        "Experiment 1 used a repeated-measures design: the same 24 participants were tested at "
        "pre-test and post-test, analysed with a paired-samples t-test, t(23) = 3.10, p = .005. "
        "Experiment 2 used a between-subjects design with two independent groups of 30 "
        "participants each; an independent-samples t-test gave t(58) = 2.40, p = .020."
    )

    def test_the_headline_false_positive_is_gone(self):
        """Two correct experiments, zero findings.

        MUTATION: restore the document-level `has_rm and has_indep_t` -> fails.
        """
        claims, findings = _findings(self.TWO_CORRECT_EXPERIMENTS)
        self.assertEqual(len(claims), 2)
        self.assertEqual(findings, [])

    def test_each_claim_keeps_its_own_design(self):
        """The root cause was cue bleed between analyses; assert the attribution directly.

        MUTATION: revert _design_from_context to first-match-over-a-window -> Experiment 1's
        paired t-test picks up "independent" from Experiment 2 and this fails.
        """
        claims, _ = _findings(self.TWO_CORRECT_EXPERIMENTS)
        self.assertEqual(claims[0].test_name, "paired t-test")
        self.assertEqual(claims[1].test_name, "independent t-test")

    def test_two_competing_design_cues_in_one_sentence_resolve_to_unstated(self):
        """Proximity does not license picking one of two cues.

        The two-experiment fixture above does NOT discriminate this: its cues sit in different
        sentences, so the sentence split alone fixes it and a first-match-in-window
        implementation still passes (verified -- that mutation survived until this test existed).
        Here both cues are inside the SAME sentence, so only the "exactly one distinct design or
        nothing" rule gives the right answer.

        MUTATION: revert _named to first-match-over-the-patterns -> "independent" wins, the
        design resolves non-ambiguously, and this fails.
        """
        text = ("We compared the groups with an independent-samples t-test rather than a "
                "paired t-test, t(48) = 2.10, p = .041.")
        claims = StatisticalClaimExtractor().extract(text, section="Results")
        self.assertEqual(claims[0].test_name, "",
                         "two competing cues in one sentence must resolve to 'not stated'")

    def test_small_n_without_a_normality_check_fires(self):
        """MUTATION: raise SMALL_N_THRESHOLD above the fixture's n -> fails."""
        _, findings = _findings(
            "Participants (N = 18) completed the task. An independent-samples t-test, "
            "t(16) = 2.10, p = .041.")
        self.assertEqual([f.rule_id for f in findings], ["SMALL_N_PARAMETRIC_UNDISCLOSED"])
        self.assertEqual(findings[0].grade, EvidenceGrade.ARITHMETIC)

    def test_small_n_with_a_reported_normality_check_is_silent(self):
        """MUTATION: ignore the assumption_reporting input in rule 1 -> fails."""
        _, findings = _findings(
            "Normality was assessed with the Shapiro-Wilk test. Participants (N = 18) completed "
            "it. An independent-samples t-test, t(16) = 2.10, p = .041.")
        self.assertEqual(findings, [])

    def test_large_n_is_silent(self):
        """The CLT defence is real above the threshold.

        MUTATION: drop the `n >= SMALL_N_THRESHOLD` guard -> every parametric claim fires, fails.
        """
        _, findings = _findings(
            "Participants (N = 200) completed the task. An independent-samples t-test, "
            "t(198) = 2.10, p = .041.")
        self.assertEqual(findings, [])

    def test_df_that_contradicts_n_under_every_reading_fires(self):
        """MUTATION: `return Silent(...)` unconditionally from rule 2 -> fails."""
        _, findings = _findings(
            "Normality was checked with Shapiro-Wilk. With N = 18, an independent-samples "
            "t-test gave t(48) = 2.10, p = .041.")
        self.assertIn("DF_CONTRADICTS_REPORTED_N", [f.rule_id for f in findings])

    def test_df_consistent_under_the_per_group_reading_is_silent(self):
        """"n = 25 per group" with t(48) is correct: 2*25-2 = 48.

        MUTATION: enumerate only the total-N reading in plausible_df_readings -> a correct paper
        is accused, and this fails. This is the rule's whole safety argument.
        """
        _, findings = _findings(
            "Normality was checked with Shapiro-Wilk. With n = 25 per group, an "
            "independent-samples t-test, t(48) = 2.10, p = .041.")
        self.assertEqual(findings, [])

    def test_plausible_readings_cover_both_interpretations(self):
        self.assertEqual(sorted(plausible_df_readings("independent_t", 25, (48,))), [23, 48])
        self.assertIn(23, plausible_df_readings("paired_t", 24, (23,)))
        # a one-way F offers between-subjects (total / per-group) AND repeated-measures readings
        self.assertIn(57, plausible_df_readings("one_way_anova", 60, (2, 57)))
        self.assertIn(38, plausible_df_readings("one_way_anova", 20, (2, 38)))

    def test_ordinal_cue_must_be_in_the_claims_own_sentence(self):
        """MUTATION: search the whole text for the ordinal cue -> the negative case fires, fails."""
        _, fires = _findings("Satisfaction was rated on a 5-point Likert scale and correlated "
                             "with age, r(48) = .31, p = .03.")
        self.assertIn("PEARSON_ON_ORDINAL", [f.rule_id for f in fires])

        _, silent = _findings(
            "Unlike Pearson correlation, Spearman rho does not assume interval measurement, so "
            "we used Spearman throughout, r(48) = .31, p = .03.")
        self.assertEqual(silent, [])


class EvaluatorTests(SimpleTestCase):

    class _Claim:
        claim_id = "C001"
        claim_type = "t_statistic"
        test_name = "independent t-test"
        position = 0
        df = (48,)
        sample_size = 50
        confidence = 0.9
        location = "Results"

    def test_a_rule_that_raises_fails_closed_and_loudly(self):
        """A crashing rule must never look like a clean pass.

        `run_all_validators` downgrades a crashing validator to severity="minor" prose; the new
        evaluator must surface the error as its own finding instead.

        MUTATION: `except Exception: continue` in evaluate_claim -> the error vanishes, fails.
        """
        import core.manuscript.appropriateness as ap

        def boom(claim, ctx):
            raise RuntimeError("rule exploded")

        broken = Rule(rule_id="BOOM", applies_to=frozenset(), requires=frozenset(),
                      predicate=boom, severity="major", title="t", recommendation="r",
                      citation="c")
        original = ap.RULES
        ap.RULES = (broken,)
        try:
            findings = evaluate_claim(self._Claim(), "independent_t")
        finally:
            ap.RULES = original

        self.assertEqual(len(findings), 1)
        self.assertIn("could not be evaluated", findings[0].title)
        self.assertIn("RuntimeError", findings[0].description)

    def test_a_rule_is_skipped_when_its_required_fields_are_absent(self):
        """The `requires` gate is the structural contract for FUTURE rules.

        Every rule shipped today also guards its own inputs, so removing the gate changes
        nothing observable through them -- that mutation survived against a fixture built from
        the real rules. The gate exists so a rule that forgets to self-guard cannot run on a
        missing field, so it must be tested with exactly such a rule.

        MUTATION: drop the `requires` check in evaluate_claim -> this unguarded rule fires on a
        claim with sample_size=None, and this fails.
        """
        import core.manuscript.appropriateness as ap

        def fires_unconditionally(claim, ctx):
            return Fires(evidence="e", detail="d", grade=EvidenceGrade.ARITHMETIC)

        needs_n = Rule(rule_id="NEEDS_N", applies_to=frozenset(),
                       requires=frozenset({"sample_size"}), predicate=fires_unconditionally,
                       severity="major", title="t", recommendation="r", citation="c")

        class NoN(self._Claim):
            sample_size = None

        original = ap.RULES
        ap.RULES = (needs_n,)
        try:
            self.assertEqual(evaluate_claim(NoN(), "independent_t"), [],
                             "a rule requiring sample_size must not run when it is None")
            # control: with the field present, the same rule DOES fire
            self.assertEqual(len(evaluate_claim(self._Claim(), "independent_t")), 1)
        finally:
            ap.RULES = original

    def test_applies_to_gates_by_test(self):
        """MUTATION: ignore applies_to -> the Pearson rule runs on a t-test claim, fails."""
        findings = evaluate_claim(self._Claim(), "independent_t",
                                  sentence="rated on a 5-point Likert scale")
        self.assertNotIn("PEARSON_ON_ORDINAL", [f.rule_id for f in findings])

    def test_silent_outcomes_produce_nothing(self):
        self.assertIsInstance(Silent("because"), Silent)
        self.assertEqual(Silent("because").reason, "because")


if __name__ == "__main__":
    unittest.main()
