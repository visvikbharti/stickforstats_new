"""
The small-N power finding is now attributable to ONE analysis, via its own degrees of freedom.

`PowerReportingValidator` swept the whole manuscript for `N = <int>` and took the MINIMUM.
That number belonged to nothing. Executed against HEAD before the fix, a 512-participant
randomised trial that happens to mention a pilot on "n = 12 volunteers" and assays run in
"n = 3 technical replicates":

    severity=major  confidence=0.85  evidence="N = 3"
    "The smallest sample size detected is N = 3 (below the threshold of 30) ... The study may
     be underpowered."

Delete those two incidental sentences and the identical manuscript drops to `moderate`, so the
accusation was entirely the aside's doing -- and `evidence` was a synthesised string, not a
quotation, so an author could not trace it to any sentence.

The obvious repair (use the claim's own `sample_size`, as MethodologicalAppropriatenessValidator
did) is unavailable here: `appropriateness.py` retired DF_CONTRADICTS_REPORTED_N because that
field is "as likely to be an attrition count, a subgroup, an imaging subset or 'n = 3
replicates' as the analysis N".

The DEGREES OF FREEDOM are different in kind: the authors report them as part of the statistic,
they belong to one specific analysis, and for t / F / r they pin its size arithmetically. So the
rule now reads `sum(df) + 1` -- a guaranteed LOWER bound on the observations behind that claim.

This keeps the true positive that simple retirement would have lost: a genuinely underpowered
n = 4-per-arm trial still emits `major`, so `_determine_assessment` still returns
'major_issues' rather than the green "Pass -- statistical quality meets reviewer expectations"
banner.

Every test names the mutation that must break it.
"""

from django.test import SimpleTestCase

from core.manuscript.advanced_validators import PowerReportingValidator
from core.manuscript.claim_extractor import StatisticalClaimExtractor

BIG_TRIAL = ("Methods. We randomised 512 participants to treatment or control.\n\n"
             "Results. The treatment group improved more, t(510) = 3.42, p = .001.")

# The SAME trial, with two entirely ordinary asides that used to reverse the verdict.
BIG_TRIAL_WITH_ASIDES = (
    "Methods. We randomised 512 participants to treatment or control. A pilot check was run "
    "on n = 12 volunteers. Each assay was performed in n = 3 technical replicates.\n\n"
    "Results. The treatment group improved more, t(510) = 3.42, p = .001.")

UNDERPOWERED = ("Methods. Four participants per arm (N = 8) were randomised.\n\n"
                "Results. The groups differed, t(6) = 2.60, p = .041.")


def _findings(text):
    claims = StatisticalClaimExtractor().extract(text, section="Results")
    return PowerReportingValidator().validate(text, claims)


def _severities(text):
    return sorted(f.severity for f in _findings(text))


class IncidentalSampleSizesNoLongerAccuseTests(SimpleTestCase):

    def test_an_aside_cannot_change_the_verdict_on_a_large_trial(self):
        """THE HEADLINE, framed as a differential so it cannot pass for an unrelated reason:
        adding two incidental sentences to a manuscript must not change what we say about it.

        MUTATION: restore the document-wide `N = <int>` minimum -> the second call returns
        'major' while the first returns 'moderate', and this fails.
        """
        self.assertEqual(_severities(BIG_TRIAL), _severities(BIG_TRIAL_WITH_ASIDES))
        self.assertEqual(_severities(BIG_TRIAL_WITH_ASIDES), ["moderate"])

    def test_the_large_trial_is_not_called_underpowered(self):
        """MUTATION: as above -> a 512-participant trial is called underpowered and this fails."""
        [finding] = _findings(BIG_TRIAL_WITH_ASIDES)
        self.assertEqual(finding.severity, "moderate")
        self.assertNotIn("N = 3", finding.description)
        self.assertNotIn("underpowered", finding.description.lower())


class GenuinelySmallAnalysesAreStillCaughtTests(SimpleTestCase):
    """The true positive that simple retirement would have thrown away."""

    def test_an_underpowered_trial_still_raises_major(self):
        """MUTATION: delete the small-analysis branch (retire the check) -> 'moderate' and
        this fails. That was the proposed alternative fix; this test is why it was rejected.
        """
        [finding] = _findings(UNDERPOWERED)
        self.assertEqual(finding.severity, "major")
        self.assertEqual(finding.title, "Small analysis with no power justification")

    def test_the_evidence_quotes_the_claim_rather_than_synthesising_a_number(self):
        """An author must be able to find the sentence we are talking about. The old evidence
        was the string "N = 3", which appears nowhere in that form and named no analysis.

        MUTATION: `evidence=f"N = {smallest_n}"` -> fails.
        """
        [finding] = _findings(UNDERPOWERED)
        self.assertIn("t(6)", finding.evidence)
        self.assertIn(finding.evidence.split(",")[0], UNDERPOWERED)

    def test_a_small_sub_analysis_of_a_large_study_is_still_flagged(self):
        """And correctly so: the claim is about THIS analysis. 15 paired biopsies inside a
        500-person study is a small analysis, whatever the enrolment figure says.

        The manuscript deliberately contains a LARGE analysis as well, so the assertion
        discriminates min from max. Without the second claim, "smallest" and "largest" pick the
        same one and a min/max mutation survives -- which is exactly what happened to the first
        version of this test.

        MUTATION: key the rule on the largest df instead of the smallest -> the 512-subject
        primary analysis is selected, nothing is below threshold, and this fails.
        """
        text = ("Methods. Of the 500 enrolled, 15 provided paired biopsies.\n\n"
                "Results. The primary outcome differed, t(510) = 3.42, p = .001. "
                "In the biopsy subset, expression rose, t(14) = 2.9, p = .011.")
        findings = _findings(text)
        self.assertEqual([f.severity for f in findings], ["major"])
        # ...and it must name the SMALL analysis, not the large one
        self.assertIn("t(14)", findings[0].evidence)
        self.assertIn("15 observations", findings[0].description)   # df 14 -> N >= 15


class TheBoundIsSoundTests(SimpleTestCase):

    def setUp(self):
        self.validator = PowerReportingValidator()

    def _claim(self, claim_type, df):
        return type("C", (), {"claim_type": claim_type, "df": df, "raw_text": "x"})()

    def test_df_plus_one_is_a_lower_bound_for_the_tests_that_qualify(self):
        """independent t: N = df+2; paired t: N = df+1; ANOVA: N = df1+df2+1; r: N = df+2.
        df+1 is <= all of them, which is the only direction the rule needs.

        MUTATION: `int(total) + 2` -> a paired t(19) (N = 20) reads as 21 and the boundary
        assertions below fail.
        """
        self.assertEqual(self.validator._smallest_analysis_n(
            [self._claim("t_statistic", (18,))])[0], 19)
        self.assertEqual(self.validator._smallest_analysis_n(
            [self._claim("f_statistic", (2, 45))])[0], 48)
        self.assertEqual(self.validator._smallest_analysis_n(
            [self._claim("r_value", (48,))])[0], 49)

    def test_a_chi_square_df_says_nothing_about_n_and_is_ignored(self):
        """chi-square df is (r-1)(c-1) -- a property of the TABLE SHAPE. A 2x2 on 10,000
        subjects has df = 1, which would read as "an analysis of 2 observations".

        MUTATION: add "chi_square" to _DF_DETERMINES_N -> a huge contingency study is accused
        of being tiny and this fails.
        """
        self.assertEqual(
            self.validator._smallest_analysis_n([self._claim("chi_square", (1,))]),
            (None, None))

    def test_no_usable_df_means_no_opinion(self):
        """Silence, not a guess. MUTATION: fall back to a document-wide `N =` sweep -> fails."""
        self.assertEqual(self.validator._smallest_analysis_n([]), (None, None))
        self.assertEqual(
            self.validator._smallest_analysis_n([self._claim("t_statistic", None)]),
            (None, None))
        # a garbled df must not crash the validator
        self.assertEqual(
            self.validator._smallest_analysis_n([self._claim("t_statistic", ("abc",))]),
            (None, None))

    def test_a_reported_power_analysis_still_short_circuits_everything(self):
        """The early return must survive: a paper that DID justify its sample size is not
        accused however small the analysis is.

        MUTATION: remove the `return findings` after the positive finding -> a second,
        contradictory 'major' finding appears and this fails.
        """
        text = ("Methods. An a-priori power analysis (G*Power) indicated 90% power.\n\n"
                "Results. The groups differed, t(6) = 2.60, p = .041.")
        findings = _findings(text)
        self.assertEqual([f.severity for f in findings], ["positive"])
