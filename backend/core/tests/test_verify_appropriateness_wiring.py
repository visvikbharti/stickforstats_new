"""
The verifier pipeline reaches the appropriateness engine — and the HTTP surface carries it.

Commit 3efa98d said "both pipelines now read one implementation". It was not true.
``appropriateness.evaluate_claims`` had exactly one caller in the repo -- the LEGACY
``advanced_validators.MethodologicalAppropriatenessValidator`` -- so ``/api/v1/verify/analyze/``
and ``/api/v1/verify/bundle/``, the flagship surface and the only one the React app talks to,
gained nothing at all from Phase 2. Proven by execution before the fix: the same manuscript
produced one finding through the engine, one through the legacy validator, and an HTTP 200 whose
entire payload contained no ``rule_id``, no ``appropriateness`` key and no rule name.

These tests exist so that gap cannot reopen silently. Every test names the mutation that must
break it, and each mutation was applied and confirmed to fail before this file was committed.

The controls matter as much as the positives. This project's repeated failure mode is a fix that
ships MORE false-accusation surface than it removes, so the silence tests below are not padding:
they are the reason the wiring is safe to ship.
"""

import numpy as np
from django.test import SimpleTestCase, TestCase, override_settings
from scipy import stats

from core.manuscript.claim_extractor import StatisticalClaimExtractor
from core.manuscript.reanalysis_engine import verify_claim
from core.manuscript.verify_pipeline import verify_manuscript, verify_segments
from core.manuscript.verdicts import ClaimDataSpec, ClaimVerificationRequest, Verdict

# A small-n parametric claim whose normality check is nowhere reported. The rule that must fire
# is SMALL_N_PARAMETRIC_UNDISCLOSED; the test is named explicitly so the resolver is not ambiguous
# (an ambiguous resolution silences every rule, which would make these tests pass for the wrong
# reason -- silence-vs-silence discriminates nothing).
SMALL_N_PAPER = (
    "Methods. Twelve participants (N = 12) were randomly assigned to two groups and compared "
    "with an independent-samples t-test.\n\n"
    "Results. The treatment group scored higher, t(10) = 2.45, p = .034."
)

# The same study done right: an adequate n AND the assumption checks stated.
CORRECT_PAPER = (
    "Methods. Sixty participants (N = 60) were randomly assigned to two groups and compared "
    "with an independent-samples t-test. Normality was assessed with the Shapiro-Wilk test and "
    "homogeneity of variance with Levene's test; both assumptions were satisfied.\n\n"
    "Results. The treatment group scored higher, t(58) = 2.45, p = .017."
)

# Small n AND the checks disclosed. This fixture exists because CORRECT_PAPER does not
# discriminate: at n = 60 the rule stops at "n is not small" and the disclosure guard is never
# reached, so a mutation that breaks the disclosure guard leaves CORRECT_PAPER silent and the
# test passes for the wrong reason. Verified by executing the predicate and reading back its
# Silent reason: "n=60 is not small" vs "a normality check is reported".
SMALL_N_BUT_DISCLOSED_PAPER = (
    "Methods. Twelve participants (N = 12) were randomly assigned to two groups and compared "
    "with an independent-samples t-test. Normality was assessed with the Shapiro-Wilk test and "
    "homogeneity of variance with Levene's test; both assumptions were satisfied.\n\n"
    "Results. The treatment group scored higher, t(10) = 2.45, p = .034."
)

# Small n, but a RANK test: normality is not a requirement of a Mann-Whitney, so demanding its
# disclosure would be accusing a paper for making the MORE conservative choice.
RANK_TEST_PAPER = (
    "Methods. Twelve participants (N = 12) were compared with a Mann-Whitney U test because the "
    "outcome was not normally distributed.\n\n"
    "Results. The groups differed, U = 21.0, p = .034."
)

# A sentence-local rule (PEARSON_ON_ORDINAL): the ordinal cue and the claim share one sentence.
ORDINAL_PEARSON_PAPER = (
    "Results. A Pearson correlation between the ordinal severity rating and dose was "
    "significant, r(48) = .36, p = .011."
)


def _rules(profile):
    """Every rule_id the profile emitted, flattened."""
    return [f["rule_id"] for v in profile.claim_verdicts for f in v.appropriateness_findings]


class PipelineReachesTheEngineTests(SimpleTestCase):
    """The core gap: verify_manuscript -> verify_claim -> appropriateness."""

    def test_the_verifier_pipeline_emits_appropriateness_findings(self):
        """THE HEADLINE. Before the fix this returned [] for every manuscript ever submitted.

        MUTATION: delete the `evaluate_claim(...)` block in reanalysis_engine.verify_claim (or
        the `base["appropriateness_findings"] = ...` assignment) -> fails.
        """
        profile = verify_manuscript(SMALL_N_PAPER)
        self.assertEqual(_rules(profile), ["SMALL_N_PARAMETRIC_UNDISCLOSED"])

    def test_a_finding_carries_its_receipt(self):
        """A finding that cannot say WHY, or cite a source, is an accusation without evidence.

        MUTATION: emit `f.rule_id` alone instead of `f.to_dict()` -> fails.
        """
        [finding] = verify_manuscript(SMALL_N_PAPER).claim_verdicts[0].appropriateness_findings
        self.assertEqual(finding["rule_id"], "SMALL_N_PARAMETRIC_UNDISCLOSED")
        self.assertEqual(finding["severity"], "moderate")
        self.assertEqual(finding["grade"], "arithmetic")
        self.assertIn("12", finding["evidence"])
        self.assertTrue(finding["citation"].strip())
        self.assertTrue(finding["recommendation"].strip())
        # NOT a confidence. The validator this replaced emitted a hardcoded 0.80 on every
        # finding; the grade says how the finding was ESTABLISHED, which is a fact about us.
        self.assertNotIn("confidence", finding)

    def test_a_sentence_local_rule_reaches_the_pipeline(self):
        """The `sentence` plumbing is load-bearing, not decoration.

        PEARSON_ON_ORDINAL reads ONLY the claim's own sentence -- the interlock that stops it
        firing on a Discussion sentence explaining why Spearman was the right choice. The
        pipeline must hand that sentence over; it cannot be recovered downstream, because
        `claim.position` is relative to the claim's home FILE while the audit text is the whole
        submission, so indexing one with the other reads an unrelated sentence.

        MUTATION: pass `sentence=""` instead of `sentence=request.sentence` in
        reanalysis_engine, or drop `sentence=sentence` in verify_pipeline -> the rule goes
        silent and this fails.
        """
        self.assertEqual(_rules(verify_manuscript(ORDINAL_PEARSON_PAPER)), ["PEARSON_ON_ORDINAL"])

    def test_the_profile_counts_the_findings(self):
        """MUTATION: hardcode `n_appropriateness_findings=0` -> fails."""
        self.assertEqual(verify_manuscript(SMALL_N_PAPER).n_appropriateness_findings, 1)
        self.assertEqual(verify_manuscript(ORDINAL_PEARSON_PAPER).n_appropriateness_findings, 1)
        self.assertEqual(verify_manuscript(CORRECT_PAPER).n_appropriateness_findings, 0)

    def test_the_findings_survive_serialisation(self):
        """to_dict() is what the API returns and what the DB stores in `detail`.

        MUTATION: remove `"appropriateness": ...` from ClaimVerdict.to_dict -> fails.
        """
        payload = verify_manuscript(SMALL_N_PAPER).to_dict()
        self.assertEqual(payload["n_appropriateness_findings"], 1)
        self.assertEqual(payload["claims"][0]["appropriateness"][0]["rule_id"],
                         "SMALL_N_PARAMETRIC_UNDISCLOSED")


class SilenceOnCorrectPapersTests(SimpleTestCase):
    """Each of these has a mutation that makes it FIRE. A silence test with no such mutation
    proves nothing, because the engine is silent by default on everything."""

    def test_a_correct_paper_is_not_accused(self):
        """An adequately powered study that states its checks must hear nothing.

        This silence is OVER-DETERMINED and no single mutation breaks it -- established by
        running them: raising SMALL_N_THRESHOLD to 200 alone SURVIVES (the disclosure guard
        still returns Silent), and only threshold + disclosure guard together make it fire.
        So this is a contract test for the user-visible property, not a discriminating one.
        The guards are discriminated individually by the next test (disclosure, at small n) and
        by test_both_gates_that_protect_rank_tests_are_in_place.

        MUTATION (both required): `SMALL_N_THRESHOLD = 200` AND drop the
        `if "normality" not in reporting.unreported` guard -> fails.
        """
        self.assertEqual(_rules(verify_manuscript(CORRECT_PAPER)), [])

    def test_a_small_study_that_states_its_checks_is_not_accused(self):
        """The discriminating case for the disclosure guard: n = 12 AND Shapiro-Wilk + Levene
        reported. The rule reaches its final guard and must still decline.

        MUTATION: in appropriateness._small_n_parametric_undisclosed, drop the
        `if "normality" not in reporting.unreported: return Silent(...)` guard -> this paper,
        which did everything right, is accused of not reporting the check it reports, and this
        fails.
        """
        self.assertEqual(_rules(verify_manuscript(SMALL_N_BUT_DISCLOSED_PAPER)), [])

    def test_a_rank_test_is_never_asked_for_normality(self):
        """Small n, but Mann-Whitney assumes no normality. Flagging it would punish the more
        conservative choice.

        This silence is defence in DEPTH -- THREE independent gates, counted by executing the
        mutations rather than by reading the code. Admitting mann_whitney_u to PARAMETRIC_TESTS
        alone SURVIVES; admitting it AND bypassing the `required` guard also SURVIVES; only when
        the `unreported` guard goes as well does it fire. Claiming a single mutation breaks this
        would misdescribe the code.

        MUTATION (all three required): add "mann_whitney_u" to PARAMETRIC_TESTS, bypass the
        `required` guard, and bypass the `unreported` guard -> fails. The individual gates are
        discriminated by test_both_gates_that_protect_rank_tests_are_in_place and by
        test_a_small_study_that_states_its_checks_is_not_accused.
        """
        self.assertEqual(_rules(verify_manuscript(RANK_TEST_PAPER)), [])

    def test_both_gates_that_protect_rank_tests_are_in_place(self):
        """Each gate, asserted on its own, so each has a single mutation that breaks it.

        MUTATION (a): add "mann_whitney_u" to PARAMETRIC_TESTS -> first assertion fails.
        MUTATION (b): give mann_whitney_u a normality requirement in REPORTING_REQUIREMENTS ->
        second assertion fails (and assumption_reporting's own subset-of-Guardian invariant
        would also have to be defeated).
        """
        from core.manuscript.appropriateness import PARAMETRIC_TESTS
        from core.manuscript.assumption_reporting import REPORTING_REQUIREMENTS

        self.assertNotIn("mann_whitney_u", PARAMETRIC_TESTS)
        self.assertNotIn("normality", REPORTING_REQUIREMENTS.get("mann_whitney_u", ()))

    def test_an_unstated_correlation_is_not_accused_of_being_pearson(self):
        """`pearson` is the resolver's DEFAULT for a bare `r`, so without the ambiguity interlock
        every unlabelled correlation beside an ordinal measure is accused.

        MUTATION: delete the `if ctx.get("test_ambiguous")` guard in _pearson_on_ordinal ->
        fails.
        """
        unstated = ("Results. The ordinal severity rating correlated with dose, "
                    "r(48) = .36, p = .011.")
        claim = StatisticalClaimExtractor().extract(unstated, section="Results")[0]
        # Guard the guard: if the extractor ever starts naming this claim, the test would pass
        # vacuously because a resolved `pearson` is not what is being tested here.
        self.assertFalse((claim.test_name or "").strip(),
                         "fixture no longer exercises the ambiguity interlock")
        self.assertEqual(_rules(verify_manuscript(unstated)), [])

    def test_an_unreliable_extraction_produces_no_findings(self):
        """We have just declared we do not trust what we parsed. An accusation built on it would
        be built on nothing, so the extraction gate returns BEFORE the rules run.

        MUTATION: move the `evaluate_claim` block above the `is_claim_extraction_reliable` gate
        -> a garbage claim starts producing findings and this fails.
        """
        claim = StatisticalClaimExtractor().extract(SMALL_N_PAPER, section="Results")[0]
        # The gate reads `confidence` (extraction completeness). Assert the fixture really trips
        # it: the first draft of this test set a misspelled attribute, nothing read it, and the
        # test failed honestly rather than passing while proving nothing.
        claim.confidence = 0.0
        from core.manuscript.extraction_quality import is_claim_extraction_reliable
        self.assertFalse(is_claim_extraction_reliable(claim))
        verdict = verify_claim(ClaimVerificationRequest(
            claim=claim, manuscript_text=SMALL_N_PAPER, sentence=SMALL_N_PAPER))
        self.assertEqual(verdict.verdict, Verdict.UNVERIFIABLE_EXTRACTION)
        self.assertEqual(verdict.appropriateness_findings, [])


class BundleDisclosureScopeTests(SimpleTestCase):
    """The disclosure audit reads the WHOLE submission, not the claim's own file."""

    MAIN = ("Main text. Methods. All analyses used an independent-samples t-test. Normality was "
            "assessed with the Shapiro-Wilk test and homogeneity of variance with Levene's "
            "test; neither was violated in any comparison.\n\n"
            "Results. The primary outcome differed between groups, t(58) = 3.01, p = .004.")
    SUPPLEMENT = ("Supplementary Results. The secondary outcome also differed between groups in "
                  "the subsample of twelve (N = 12), independent-samples t-test, "
                  "t(10) = 2.45, p = .034.")

    def test_a_supplement_claim_sees_the_main_text_disclosure(self):
        """Per-file scope told a supplement's claim that the manuscript never reported a check
        the main text reports two files away, and then accused it of small-n non-disclosure.
        A supplement is part of the same submission; the authors said it once.

        MUTATION: pass `manuscript_text=seg_text` instead of `disclosure_text` in
        verify_segments -> the supplement claim's `reported_in_text` flips to False AND
        SMALL_N_PARAMETRIC_UNDISCLOSED fires, so both assertions below fail.
        """
        profile = verify_segments([("main.tex", self.MAIN), ("supp.tex", self.SUPPLEMENT)])
        by_file = {v.source_file: v for v in profile.claim_verdicts}
        self.assertEqual(set(by_file), {"main.tex", "supp.tex"})
        self.assertIs(by_file["supp.tex"].assumptions_reported_in_text, True)
        self.assertEqual(_rules(profile), [])

    def test_a_genuine_omission_is_still_caught_across_the_bundle(self):
        """The positive control. Widening the scope must not be a blanket amnesty: if NOTHING in
        the submission reports a normality check, the finding must still be raised.

        MUTATION: return early with no findings from evaluate_claim -> fails.
        """
        silent_main = self.MAIN.replace(
            "Normality was assessed with the Shapiro-Wilk test and homogeneity of variance "
            "with Levene's test; neither was violated in any comparison.", "")
        profile = verify_segments([("main.tex", silent_main), ("supp.tex", self.SUPPLEMENT)])
        self.assertEqual(_rules(profile), ["SMALL_N_PARAMETRIC_UNDISCLOSED"])

    def _captured_requests(self, segments):
        """The ClaimVerificationRequest objects the pipeline actually builds."""
        import core.manuscript.verify_pipeline as pipeline

        seen = []
        original = pipeline.verify_claim

        def spy(request):
            seen.append(request)
            return original(request)

        pipeline.verify_claim = spy
        try:
            verify_segments(segments)
        finally:
            pipeline.verify_claim = original
        return seen

    def test_the_two_scopes_are_wide_and_narrow_and_do_not_leak_into_each_other(self):
        """The invariant that makes widening safe, asserted directly on what the pipeline builds.

        Two texts travel with every claim and they must NOT be the same text:
          - `manuscript_text` is the WHOLE submission, so a check reported in the main text
            counts for a supplement's claim;
          - `sentence` is the claim's OWN sentence from its OWN file, because that is the
            evidence a sentence-local rule QUOTES back to the author. If the wide text leaked
            into it, one file's prose could be quoted as evidence about another's claim.

        An earlier draft of this test compared verify_manuscript(x) against
        verify_segments([("", x)]) -- which cannot fail, because the former is implemented as a
        call to the latter. It passed under every mutation and proved nothing.

        MUTATION (a): `manuscript_text=seg_text` -> the wide-scope assertions fail.
        MUTATION (b): `sentence=disclosure_text` (or dropping `sentence=sentence`) -> the
        narrow-scope assertions fail.
        """
        single = self._captured_requests([("", SMALL_N_PAPER)])
        self.assertEqual(len(single), 1)
        # single document: the wide scope is exactly that document -- nothing added, nothing lost
        self.assertEqual(single[0].manuscript_text, SMALL_N_PAPER)

        both = self._captured_requests([("main.tex", self.MAIN), ("supp.tex", self.SUPPLEMENT)])
        self.assertEqual(len(both), 2)
        for request in both:
            self.assertIn("Shapiro-Wilk", request.manuscript_text)     # from main.tex
            self.assertIn("subsample of twelve", request.manuscript_text)  # from supp.tex

        supplement = [r for r in both if r.claim.source_file == "supp.tex"][0]
        self.assertIn("secondary outcome", supplement.sentence)
        self.assertNotIn("Shapiro-Wilk", supplement.sentence)
        self.assertNotIn("primary outcome", supplement.sentence)


@override_settings(SECURE_SSL_REDIRECT=False)
class WithLinkedDataTests(SimpleTestCase):
    """The re-analysis path: findings are ADVISORY and must never move a verdict."""

    def _verify(self, paper, *, n=25):
        rng = np.random.default_rng(7)
        a, b = list(rng.normal(0, 1, n)), list(rng.normal(0.6, 1, n))
        claim = StatisticalClaimExtractor().extract(paper, section="Results")[0]
        spec = ClaimDataSpec(intended_test="independent_t", design_type="two_group",
                             groups=[a, b])
        return verify_claim(ClaimVerificationRequest(
            claim=claim, data_spec=spec, manuscript_text=paper, methods_text=paper,
            sentence=paper))

    def test_a_finding_does_not_change_a_verified_verdict(self):
        """THE SAFETY PROPERTY. A verdict answers "do these numbers reproduce"; a finding
        answers "was this the right test". Letting a methodological heuristic overturn an
        arithmetic result is how a correct paper gets called wrong.

        MUTATION: make assign_verdict (or verify_claim) downgrade when
        appropriateness_findings is non-empty -> fails.
        """
        rng = np.random.default_rng(7)
        t, p = stats.ttest_ind(list(rng.normal(0, 1, 25)), list(rng.normal(0.6, 1, 25)))
        paper = (f"Methods. An independent-samples t-test was used (N = 12).\n\n"
                 f"Results. t(48) = {abs(t):.2f}, p = {p:.4f}.")
        v = self._verify(paper)
        self.assertEqual(v.verdict, Verdict.VERIFIED)
        self.assertEqual([f["rule_id"] for f in v.appropriateness_findings],
                         ["SMALL_N_PARAMETRIC_UNDISCLOSED"])

    def test_the_re_analysed_path_records_whether_disclosure_happened(self):
        """`assumptions_reported_in_text` was left None on every claim we actually re-ran,
        because the disclosure audit sat inside the no-data branch. Declared, persisted,
        rendered -- and never assigned on the path that matters most. That is the shape this
        project keeps shipping (ASSUMPTION_UNREPORTED, p_match, similar_shapes, group_sizes).

        MUTATION: remove `assumptions_reported_in_text=assumptions_reported` from the with-data
        ClaimVerdict construction -> reverts to None and fails.
        """
        rng = np.random.default_rng(7)
        t, p = stats.ttest_ind(list(rng.normal(0, 1, 25)), list(rng.normal(0.6, 1, 25)))
        undisclosed = self._verify(
            f"Methods. An independent-samples t-test was used (N = 60).\n\n"
            f"Results. t(48) = {abs(t):.2f}, p = {p:.4f}.")
        disclosed = self._verify(
            f"Methods. An independent-samples t-test was used (N = 60). Normality was assessed "
            f"with the Shapiro-Wilk test and variance homogeneity with Levene's test.\n\n"
            f"Results. t(48) = {abs(t):.2f}, p = {p:.4f}.")
        self.assertIs(undisclosed.assumptions_reported_in_text, False)
        self.assertIs(disclosed.assumptions_reported_in_text, True)

    def test_a_crashing_disclosure_audit_does_not_become_a_finding(self):
        """FAIL CLOSED, and fail QUIET about the paper. A tool error is not evidence of anything
        the authors did, so it must not surface as an accusation -- but it must not read as a
        clean bill either.

        MUTATION: in evaluate_claims/verify_claim let the exception propagate, or pass a
        truthy sentinel as `assumption_reporting` -> the rule fires on a tool error, or the
        call raises, and this fails.
        """
        import core.manuscript.reanalysis_engine as engine

        original = engine.detect_assumption_reporting
        engine.detect_assumption_reporting = lambda *a, **k: (_ for _ in ()).throw(
            RuntimeError("boom"))
        try:
            v = self._verify(SMALL_N_PAPER)
        finally:
            engine.detect_assumption_reporting = original
        self.assertEqual(v.appropriateness_findings, [])
        self.assertIsNone(v.assumptions_reported_in_text)
        self.assertTrue(any("assumption-disclosure audit failed" in n for n in v.notes),
                        f"the failure must be stated, not swallowed; got {v.notes}")

    def test_a_crashing_rule_engine_does_not_500_the_endpoint(self):
        """Wiring the engine in put it on the request path of the flagship endpoint, where an
        escaping exception is an HTTP 500 -- the HomoscedasticityValidator shape exactly. It
        must degrade to NO findings (we decline to accuse) and say so out loud.

        MUTATION: remove the try/except around the evaluate_claim call in reanalysis_engine ->
        this raises instead of returning and the test errors.
        """
        import core.manuscript.reanalysis_engine as engine
        import core.manuscript.appropriateness as appropriateness

        original = appropriateness.evaluate_claim
        appropriateness.evaluate_claim = lambda *a, **k: (_ for _ in ()).throw(
            RuntimeError("evaluator exploded"))
        try:
            verdict = engine.verify_claim(ClaimVerificationRequest(
                claim=StatisticalClaimExtractor().extract(SMALL_N_PAPER, section="Results")[0],
                manuscript_text=SMALL_N_PAPER, sentence=SMALL_N_PAPER))
        finally:
            appropriateness.evaluate_claim = original
        self.assertEqual(verdict.appropriateness_findings, [])
        self.assertTrue(any("appropriateness checks could not be run" in n
                            for n in verdict.notes),
                        f"a broken engine must not read as a clean paper; got {verdict.notes}")

    def test_every_evidence_grade_can_be_ordered(self):
        """The evaluator's `_GRADE_ORDER[outcome.grade]` lookup is OUTSIDE its per-rule
        try/except, so a grade added to the enum without a rank raises KeyError all the way out
        to the endpoint. Made impossible at import instead of guarded at the call site, because
        widening the try there would silently DROP the rule.

        MUTATION: add a member to EvidenceGrade without adding it to _GRADE_ORDER -> the
        import-time invariant raises and this (and the whole module) fails loudly.
        """
        from core.manuscript.appropriateness import EvidenceGrade, _GRADE_ORDER

        self.assertEqual(set(EvidenceGrade), set(_GRADE_ORDER))


@override_settings(SECURE_SSL_REDIRECT=False)
class HttpSurfaceTests(TestCase):
    """Through the REAL endpoint. The unit layer already worked before the fix; the endpoint is
    the thing that did not, and it is the only surface the React app talks to."""

    def test_analyze_endpoint_returns_appropriateness_findings(self):
        """MUTATION: any break in the chain (verify_pipeline, reanalysis_engine, to_dict) ->
        fails. This is the assertion that would have caught 3efa98d's false commit message.
        """
        resp = self.client.post("/api/v1/verify/analyze/",
                                data={"text": SMALL_N_PAPER, "title": "wiring"})
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertEqual(payload["n_appropriateness_findings"], 1)
        [finding] = payload["claims"][0]["appropriateness"]
        self.assertEqual(finding["rule_id"], "SMALL_N_PARAMETRIC_UNDISCLOSED")
        self.assertTrue(finding["citation"].strip())

    def test_analyze_endpoint_is_silent_on_a_correct_paper(self):
        """MUTATION: as in SilenceOnCorrectPapersTests -> the endpoint accuses and this fails."""
        resp = self.client.post("/api/v1/verify/analyze/",
                                data={"text": CORRECT_PAPER, "title": "correct"})
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertEqual(payload["n_appropriateness_findings"], 0)
        self.assertEqual(payload["claims"][0]["appropriateness"], [])

    def test_findings_are_persisted_and_survive_a_report_refetch(self):
        """The report endpoint serves `profile_data` written at analysis time, so a finding that
        exists only in the live response is lost the moment the user reloads.

        MUTATION: strip `appropriateness` before persisting (or from to_dict) -> fails.
        """
        resp = self.client.post("/api/v1/verify/analyze/",
                                data={"text": SMALL_N_PAPER, "title": "wiring"})
        payload = resp.json()
        run_id, token = payload["run_id"], payload["report_token"]

        refetch = self.client.get(f"/api/v1/verify/report/{run_id}/?token={token}")
        self.assertEqual(refetch.status_code, 200)
        self.assertEqual(refetch.json()["claims"][0]["appropriateness"][0]["rule_id"],
                         "SMALL_N_PARAMETRIC_UNDISCLOSED")

        from core.models import ClaimVerdictRecord
        record = ClaimVerdictRecord.objects.get(run_id=run_id, claim_id="C001")
        self.assertEqual(record.detail["appropriateness"][0]["rule_id"],
                         "SMALL_N_PARAMETRIC_UNDISCLOSED")
