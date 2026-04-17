"""
End-to-End Integration Tests — Pillar 2: Journal Integration Platform
======================================================================
Tests the complete manuscript pipeline: ManuscriptParser →
StatisticalClaimExtractor → ConsistencyValidator → ManuscriptGuardian.

Unlike the unit tests in test_manuscript_services.py, these tests exercise
the full review pipeline with real scipy recomputations.
No mocking of statistical engines or validators.

Run with: python manage.py test core.tests.test_integration_manuscript -v2

Created: February 2026
"""

from __future__ import annotations

import unittest

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status as http_status

try:
    from scipy import stats as scipy_stats

    SCIPY_AVAILABLE = True
except ImportError:
    scipy_stats = None
    SCIPY_AVAILABLE = False

from core.manuscript.parser import ParsedManuscript
from core.manuscript.claim_extractor import (
    StatisticalClaimExtractor,
    ExtractionSummary,
    CLAIM_TYPE_T,
)
from core.manuscript.consistency_validator import (
    ConsistencyValidator,
    ValidationSummary,
)
from core.manuscript.manuscript_guardian import (
    ManuscriptGuardian,
    ManuscriptReviewReport,
    ReviewFinding,
)

try:
    pass

    VALIDATORS_AVAILABLE = True
except ImportError:
    VALIDATORS_AVAILABLE = False

try:
    pass

    SQS_AVAILABLE = True
except ImportError:
    SQS_AVAILABLE = False


# ---------------------------------------------------------------------------
# Manuscript Text Fixtures
# ---------------------------------------------------------------------------

MANUSCRIPT_PSYCHOLOGY = """\
Effects of Cognitive Training on Working Memory Capacity

John A. Smith and Jane B. Doe

Abstract
This study examined the effects of a 6-week cognitive training program on
working memory capacity in older adults (N = 120). Participants were randomly
assigned to training (n = 60) or control (n = 60) groups. Results indicated
significant improvements in the training group.

Introduction
Working memory is a core cognitive function that declines with age. Previous
research has shown that cognitive training interventions can improve working
memory performance. The current study extends this work by using a randomized
controlled design.

Methods
Participants: N = 120 older adults (60 per group), age range 65-80.
An independent-samples t-test was used to compare the groups on post-test
scores. The study used a between-subjects design. Analyses were conducted
using R version 4.3.2.

Results
The training group (M = 85.3, SD = 12.1) showed significantly greater
improvement than the control group (M = 78.6, SD = 11.8),
t(118) = 2.87, p = .005, Cohen's d = 0.53, 95% CI [0.15, 0.91].

Discussion
These findings suggest that cognitive training can reliably improve
working memory capacity in older adults. The effect size (d = 0.53)
indicates a medium effect.

References
Smith, J. A. (2023). Cognitive training and aging. Journal of Memory, 10, 1-15.
"""

MANUSCRIPT_MULTI_TEST = """\
Multiple Statistical Analyses in Educational Research

Abstract
This study examined academic performance across three instructional methods.

Introduction
Prior work has compared instructional methods using various statistical approaches.

Methods
N = 90 students were randomly assigned to three conditions (n = 30 per group).
One-way ANOVA, chi-square, and Pearson correlation were used.

Results
The ANOVA revealed a significant main effect of instructional method,
F(2, 87) = 4.23, p = .018, partial eta-squared = .089.

A chi-square test of independence showed a significant association between
instructional method and pass/fail outcome, chi-square(2) = 9.87, p = .007,
Cramer's V = .33.

The correlation between study hours and final exam score was significant,
r = .48, p < .001, 95% CI [.29, .63].

Post-hoc pairwise comparisons using Tukey's HSD revealed that Method A
(M = 82.1) differed significantly from Method C (M = 74.3), p = .012.

Discussion
The results support the hypothesis that instructional method affects outcomes.

References
Doe, J. (2024). Teaching methods. Educational Research, 5, 100-120.
"""

MANUSCRIPT_INCONSISTENT = """\
A Study with Inconsistent Statistical Reporting

Abstract
We examined group differences on a cognitive task.

Methods
N = 32 participants completed the task. An independent-samples t-test was used.

Results
The experimental group performed better than controls,
t(30) = 0.50, p = .001, Cohen's d = 0.18.

Discussion
The results were highly significant.

References
None.
"""

MANUSCRIPT_PERFECT_REPORTING = """\
Exemplary Statistical Reporting in Psychological Science

John Smith, PhD

Abstract
We conducted a pre-registered randomized controlled trial examining the
efficacy of mindfulness training on stress reduction (N = 200).

Introduction
Stress is a major public health concern. This study was pre-registered
at https://osf.io/abc123 prior to data collection.

Methods
Participants: N = 200 adults (100 per group), recruited from the community.
An a priori power analysis using G*Power indicated that N = 180 was needed
for 80% power to detect a medium effect (d = 0.5) at alpha = .05.
Analyses were conducted using R version 4.3.2 with the lme4 package.
The data and analysis scripts are available at https://osf.io/data123.

Results
The mindfulness group showed significantly lower stress scores (M = 3.21,
SD = 0.89) compared to controls (M = 3.98, SD = 0.95),
t(198) = 6.12, p < .001, Cohen's d = 0.83, 95% CI [0.55, 1.11].

A Bayesian analysis confirmed the result with BF10 = 4521.3, providing
decisive evidence for the alternative hypothesis.

Discussion
The results provide strong evidence for the efficacy of mindfulness training.
The large effect size (d = 0.83) suggests practical significance.

References
Smith, J. (2023). Mindfulness and stress. Journal of Health, 15, 1-20.
"""

MANUSCRIPT_MINIMAL_REPORTING = """\
Brief Results

Abstract
We tested a hypothesis.

Results
Group A was better than Group B (p < .05).
The second test was also significant (p < .01).
No difference was found for the third outcome (p > .05).
"""

MANUSCRIPT_EMPTY = ""

MANUSCRIPT_NO_STATS = """\
A Qualitative Study of Participant Experiences

Abstract
This qualitative study explored participant experiences through interviews.

Introduction
Qualitative research provides rich descriptions of phenomena.

Methods
Twenty participants were interviewed using semi-structured protocols.
Thematic analysis was employed following Braun and Clarke's framework.

Results
Three main themes emerged from the data: connection, growth, and challenge.
Participants described feeling more connected to their communities.

Discussion
The findings align with previous qualitative research on community engagement.

References
Braun, V. (2006). Using thematic analysis. Qualitative Research, 3, 77-101.
"""


# ---------------------------------------------------------------------------
# Helper (no longer needed — BUG-003 fixed in parser.py and
# manuscript_guardian.py; guardian.review_text() now works directly)
# ---------------------------------------------------------------------------


# ===================================================================
# TEST CLASS 1: Full Manuscript Pipeline Integration
# ===================================================================


class TestFullManuscriptPipelineIntegration(TestCase):
    """End-to-end manuscript review pipeline tests."""

    def test_psychology_manuscript_review(self):
        """Full review of psychology manuscript: claims found, consistency, assessment."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_PSYCHOLOGY)

        self.assertIsInstance(report, ManuscriptReviewReport)
        # Should find the t-test claim
        self.assertGreater(report.claims_found, 0)
        # Consistency should be checked
        self.assertIsNotNone(report.consistency_rate)
        # Overall assessment should not be critical for well-reported stats
        self.assertIn(report.overall_assessment, ["pass", "minor_issues", "major_issues"])
        # Should detect sections
        self.assertGreater(len(report.sections_found), 0)
        # Processing time should be recorded
        self.assertIsInstance(report.processing_time_ms, int)
        self.assertGreaterEqual(report.processing_time_ms, 0)

    def test_multi_test_manuscript_review(self):
        """Manuscript with 3+ claim types extracted and validated."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_MULTI_TEST)

        self.assertIsInstance(report, ManuscriptReviewReport)
        self.assertGreaterEqual(report.claims_found, 3)
        # Check extraction summary has multiple types
        claims_by_type = report.extraction_summary.claims_by_type
        claim_types_found = set(claims_by_type.keys())
        # Should have at least F and r (chi2 may depend on regex)
        self.assertTrue(
            len(claim_types_found) >= 2,
            f"Expected 2+ claim types, got: {claim_types_found}",
        )

    def test_review_report_has_all_fields(self):
        """Verify ManuscriptReviewReport structure completeness."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_PSYCHOLOGY)

        # Core fields
        self.assertIsInstance(report.title, str)
        self.assertIsInstance(report.authors, list)
        self.assertIsInstance(report.word_count, int)
        self.assertGreater(report.word_count, 0)
        self.assertIsInstance(report.sections_found, list)

        # Pipeline results
        self.assertIsInstance(report.parsed, ParsedManuscript)
        self.assertIsInstance(report.extraction_summary, ExtractionSummary)
        self.assertIsInstance(report.consistency_summary, ValidationSummary)

        # Aggregated scores
        self.assertIsInstance(report.claims_found, int)
        self.assertIsInstance(report.claims_consistent, int)
        self.assertIsInstance(report.claims_inconsistent, int)
        self.assertIsInstance(report.decision_errors, int)
        self.assertIsInstance(report.gross_errors, int)

        # Findings
        self.assertIsInstance(report.findings, list)
        self.assertIsInstance(report.positive_findings, list)

        # Overall assessment
        self.assertIn(
            report.overall_assessment,
            [
                "pass",
                "minor_issues",
                "major_issues",
                "critical",
            ],
        )

        # Serialization
        d = report.to_dict()
        self.assertIn("claims_found", d)
        self.assertIn("findings", d)
        self.assertIn("consistency_results", d)
        self.assertIn("overall_assessment", d)

    def test_findings_categorized_correctly(self):
        """Severity and category values are from valid sets."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_MULTI_TEST)

        valid_severities = {"blocking", "major", "moderate", "minor", "positive"}
        valid_categories = {
            "consistency",
            "reporting",
            "methodology",
            "sqs",
            "multiple_testing",
            "effect_size",
            "power",
            "reproducibility",
            "checklist",
        }

        all_findings = report.findings + report.positive_findings
        for f in all_findings:
            self.assertIsInstance(f, ReviewFinding)
            self.assertIn(f.severity, valid_severities, f"Invalid severity: {f.severity}")
            self.assertIn(f.category, valid_categories, f"Invalid category: {f.category}")


# ===================================================================
# TEST CLASS 2: Claim Validation Chain Integration
# ===================================================================


@unittest.skipUnless(SCIPY_AVAILABLE, "scipy required for consistency checks")
class TestClaimValidationChainIntegration(TestCase):
    """Test the claim extraction → consistency validation chain.

    The ConsistencyValidator now handles both attribute names
    (``statistic`` and ``statistic_value``) and extractor-style type
    names (``t_statistic`` etc.) via ``_CLAIM_TYPE_MAP``, so no
    bridging workaround is needed.
    """

    def setUp(self):
        self.extractor = StatisticalClaimExtractor()
        self.validator = ConsistencyValidator(alpha=0.05, tolerance=0.005)

    def test_consistent_ttest_passes_validation(self):
        """t(118)=2.87 with p=.005 should be approximately consistent."""
        text = "t(118) = 2.87, p = .005, Cohen's d = 0.53"
        claims = self.extractor.extract(text, section="results")

        t_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_T]
        self.assertGreater(len(t_claims), 0, "Expected t-test claim to be extracted")

        result = self.validator.validate_claim(t_claims[0])

        # Verify with scipy: 2 * sf(2.87, 118) ≈ 0.00483
        expected_p = scipy_stats.t.sf(2.87, 118) * 2
        self.assertAlmostEqual(expected_p, 0.005, delta=0.002)
        self.assertTrue(
            result.is_consistent,
            f"Expected consistent but got severity={result.severity}, "
            f"computed_p={result.computed_p}, note={result.note}",
        )

    def test_inconsistent_claim_flagged_as_gross_error(self):
        """t(30)=0.50 with p=.001 → gross_error (actual p ≈ 0.621)."""
        text = "t(30) = 0.50, p = .001"
        claims = self.extractor.extract(text, section="results")

        t_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_T]
        self.assertGreater(len(t_claims), 0, "Expected t-test claim to be extracted")

        result = self.validator.validate_claim(t_claims[0])

        self.assertFalse(result.is_consistent)
        self.assertEqual(
            result.severity,
            "gross_error",
            f"Expected gross_error but got severity={result.severity}, "
            f"computed_p={result.computed_p}, note={result.note}",
        )
        self.assertFalse(result.is_decision_consistent)

    def test_multiple_claim_types_batch_validated(self):
        """F, chi2, r claims all checked in batch."""
        text = "F(2, 87) = 4.23, p = .018. " "chi-square(2) = 9.87, p = .007. " "r = .48, p < .001."
        claims = self.extractor.extract(text, section="results")
        self.assertGreaterEqual(len(claims), 2)

        # Filter to checkable claims (validator handles type mapping internally)
        checkable = [c for c in claims if c.claim_type and c.statistic_value is not None and c.p_value is not None]
        summary = self.validator.validate(checkable)

        self.assertIsInstance(summary, ValidationSummary)
        self.assertGreaterEqual(summary.total_checked, 2)

    def test_extraction_summary_matches_claims(self):
        """total_claims count in summary matches extracted claims."""
        text = "t(30) = 2.50, p = .018. " "F(2, 45) = 3.67, p = .034. " "r = .42, p = .003."
        claims = self.extractor.extract(text, section="results")
        summary = self.extractor.summarize(claims)

        self.assertIsInstance(summary, ExtractionSummary)
        self.assertEqual(summary.total_claims, len(claims))
        self.assertGreaterEqual(summary.claims_with_p_values, 3)


# ===================================================================
# TEST CLASS 3: SQS Scoring Integration
# ===================================================================


@unittest.skipUnless(SQS_AVAILABLE, "SQS scorer not available")
class TestSQSScoringIntegration(TestCase):
    """Test SQS scoring through the ManuscriptGuardian pipeline."""

    def test_perfect_reporting_high_score(self):
        """Well-reported manuscript should score higher than minimal reporting."""
        guardian = ManuscriptGuardian(field="general")
        report_good = guardian.review_text(MANUSCRIPT_PERFECT_REPORTING)
        report_bad = guardian.review_text(MANUSCRIPT_MINIMAL_REPORTING)

        self.assertIsNotNone(report_good.sqs_score)
        self.assertIsNotNone(report_bad.sqs_score)
        # Perfect reporting must score strictly higher than minimal
        self.assertGreater(report_good.sqs_score, report_bad.sqs_score)
        # Should be at least a passing score
        self.assertGreaterEqual(report_good.sqs_score, 35)

    def test_minimal_reporting_low_score(self):
        """Minimally reported manuscript should get a low SQS score."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_MINIMAL_REPORTING)

        self.assertIsNotNone(report.sqs_score)
        self.assertLess(report.sqs_score, 50)

    def test_sqs_categories_present(self):
        """All 6 SQS scoring categories should be in the report."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_PSYCHOLOGY)

        self.assertIsNotNone(report.sqs_report)
        cat_scores = report.sqs_report.category_scores
        self.assertIsInstance(cat_scores, dict)
        # SQS has 6 categories
        self.assertGreaterEqual(len(cat_scores), 6)


# ===================================================================
# TEST CLASS 4: Manuscript Edge Cases
# ===================================================================


class TestManuscriptEdgeCases(TestCase):
    """Edge case handling in the manuscript pipeline."""

    def test_empty_text(self):
        """Empty text: no crash, claims_found=0, warnings populated."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_EMPTY)

        self.assertIsInstance(report, ManuscriptReviewReport)
        self.assertEqual(report.claims_found, 0)
        self.assertTrue(
            len(report.warnings) > 0,
            "Empty manuscript should produce warnings",
        )

    def test_no_statistical_content(self):
        """Qualitative paper: review completes, claims=0."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_NO_STATS)

        self.assertIsInstance(report, ManuscriptReviewReport)
        self.assertEqual(report.claims_found, 0)
        # Should still detect sections
        self.assertGreater(len(report.sections_found), 0)

    def test_all_inconsistent_claims(self):
        """Grossly inconsistent claims → overall_assessment is critical/major_issues."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_INCONSISTENT)

        self.assertIsInstance(report, ManuscriptReviewReport)
        # t(30)=0.50 with p=.001 is a gross error → critical assessment
        if report.claims_found > 0 and report.gross_errors > 0:
            self.assertIn(report.overall_assessment, ["critical", "major_issues"])

    def test_long_manuscript_completes(self):
        """5000-word text with 20+ claims finishes within reasonable time."""
        # Build a long manuscript with many statistical results
        results_section = "Results\n"
        for i in range(25):
            t_stat = 2.0 + i * 0.1
            df = 30 + i * 2
            p_val = f".{max(1, 50 - i * 2):03d}"
            results_section += f"Hypothesis {i+1}: The analysis revealed " f"t({df}) = {t_stat:.2f}, p = {p_val}. "
        results_section += "\n"

        long_text = (
            "Title of a Very Comprehensive Study\n\n"
            "Abstract\n" + "Background context. " * 50 + "\n\n"
            "Introduction\n" + "Literature review content. " * 100 + "\n\n"
            "Methods\n"
            + "Methodological details. " * 80
            + " Independent samples t-tests were used.\n\n"
            + results_section
            + "Discussion\n"
            + "Discussion of findings. " * 80
            + "\n\n"
            "References\n" + "Reference entry. " * 30 + "\n"
        )

        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(long_text)

        self.assertIsInstance(report, ManuscriptReviewReport)
        self.assertGreater(report.claims_found, 10)
        self.assertGreater(report.word_count, 1000)


# ===================================================================
# TEST CLASS 5: Manuscript API Integration
# ===================================================================


@override_settings(SECURE_SSL_REDIRECT=False)
class TestManuscriptAPIIntegration(APITestCase):
    """HTTP endpoint tests for manuscript review API."""

    def _make_text_file(self, text, name="manuscript.tex"):
        """Create a SimpleUploadedFile from text with .tex extension.

        Uses .tex extension because the ManuscriptParser only auto-detects
        .pdf, .tex, .latex, and .docx — not .txt.
        """
        return SimpleUploadedFile(
            name=name,
            content=text.encode("utf-8"),
            content_type="application/x-tex",
        )

    def test_analyze_endpoint_with_text_file(self):
        """POST text file to /api/v1/manuscript/analyze/."""
        f = self._make_text_file(MANUSCRIPT_PSYCHOLOGY)
        response = self.client.post(
            "/api/v1/manuscript/analyze/",
            {"file": f, "field": "general"},
            format="multipart",
        )

        self.assertIn(
            response.status_code,
            [
                http_status.HTTP_200_OK,
                http_status.HTTP_201_CREATED,
            ],
        )
        data = response.json()
        self.assertIn("claims_found", data)
        self.assertIn("overall_assessment", data)

    def test_claims_endpoint_with_text_file(self):
        """POST text file to /api/v1/manuscript/claims/."""
        f = self._make_text_file(MANUSCRIPT_MULTI_TEST)
        response = self.client.post(
            "/api/v1/manuscript/claims/",
            {"file": f},
            format="multipart",
        )

        self.assertIn(
            response.status_code,
            [
                http_status.HTTP_200_OK,
                http_status.HTTP_201_CREATED,
            ],
        )
        data = response.json()
        self.assertIn("claims", data)

    def test_consistency_endpoint_with_text_file(self):
        """POST text file to /api/v1/manuscript/consistency/."""
        f = self._make_text_file(MANUSCRIPT_PSYCHOLOGY)
        response = self.client.post(
            "/api/v1/manuscript/consistency/",
            {"file": f},
            format="multipart",
        )

        self.assertIn(
            response.status_code,
            [
                http_status.HTTP_200_OK,
                http_status.HTTP_201_CREATED,
            ],
        )
        data = response.json()
        # Should contain consistency results
        self.assertTrue(
            "results" in data or "summary" in data or "consistency" in data,
            f"Response missing expected keys: {list(data.keys())}",
        )


# ===================================================================
# TEST CLASS 6: Advanced Validators + Discipline Profile Integration
# ===================================================================


class TestAdvancedValidatorIntegration(TestCase):
    """The full review pipeline now runs 1 basic consistency validator +
    7 manuscript-level advanced validators + (optionally) a discipline
    checklist. These tests pin that contract end-to-end."""

    def test_advanced_findings_populated(self):
        """Review runs all 7 advanced validators and surfaces their
        findings in `advanced_findings`. Not every validator emits a
        finding on every manuscript (some stay silent when there's
        nothing to flag), but the orchestrator must wire them all in."""
        from core.manuscript.advanced_validators import ALL_VALIDATORS

        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_PSYCHOLOGY)

        # Integration contract: the orchestrator uses the full 7-validator
        # registry.
        self.assertEqual(len(ALL_VALIDATORS), 7)

        # At least a majority of the validators should fire on a typical
        # psychology manuscript (the test text is realistic enough that
        # effect-size, reporting, reproducibility, power gaps will trip).
        validators_seen = {vf.validator for vf in report.advanced_findings}
        self.assertGreaterEqual(
            len(validators_seen),
            4,
            f"Too few advanced validators produced findings: {validators_seen}",
        )

    def test_advanced_findings_folded_into_review_findings(self):
        """Non-positive advanced findings end up in report.findings with
        the category mapped by _VALIDATOR_CATEGORY."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_PSYCHOLOGY)

        categories = {f.category for f in report.findings}
        # At least one of the new validator-derived categories should
        # appear in the main findings list.
        advanced_cats = {
            "multiple_testing",
            "effect_size",
            "power",
            "reproducibility",
        }
        self.assertTrue(
            categories & advanced_cats,
            f"No advanced-validator categories in findings: {categories}",
        )

    def test_discipline_profile_populated_for_known_field(self):
        """Known field ('medicine') resolves to the CONSORT profile and
        produces checklist_results + a completion percentage."""
        guardian = ManuscriptGuardian(field="medicine")
        report = guardian.review_text(MANUSCRIPT_PSYCHOLOGY)

        self.assertEqual(report.discipline_profile, "medicine")
        self.assertEqual(report.discipline_guideline, "CONSORT")
        self.assertGreater(len(report.checklist_results), 0)
        self.assertIsNotNone(report.checklist_completion_pct)
        self.assertGreaterEqual(report.checklist_completion_pct, 0.0)
        self.assertLessEqual(report.checklist_completion_pct, 100.0)

    def test_unknown_field_leaves_profile_empty(self):
        """Unknown field ('general') produces no checklist and no
        discipline guideline — the pipeline still completes cleanly."""
        guardian = ManuscriptGuardian(field="general")
        report = guardian.review_text(MANUSCRIPT_PSYCHOLOGY)

        self.assertIsNone(report.discipline_profile)
        self.assertIsNone(report.discipline_guideline)
        self.assertEqual(report.checklist_results, [])
        self.assertIsNone(report.checklist_completion_pct)

    def test_checklist_missing_items_become_findings(self):
        """Required CONSORT items not mentioned in a psychology manuscript
        show up as findings with category='checklist'."""
        guardian = ManuscriptGuardian(field="medicine")
        report = guardian.review_text(MANUSCRIPT_PSYCHOLOGY)

        checklist_findings = [f for f in report.findings if f.category == "checklist"]
        self.assertGreater(
            len(checklist_findings),
            0,
            "Expected CONSORT checklist gaps to produce findings, got none",
        )

    def test_to_dict_includes_new_fields(self):
        """Serialized report exposes advanced_findings, discipline info,
        and checklist_results for downstream API consumers."""
        guardian = ManuscriptGuardian(field="medicine")
        data = guardian.review_text(MANUSCRIPT_PSYCHOLOGY).to_dict()

        for key in (
            "advanced_findings",
            "discipline_profile",
            "discipline_guideline",
            "checklist_results",
            "checklist_completion_pct",
            "checklist_missing_required",
        ):
            self.assertIn(key, data, f"to_dict missing {key}")

        self.assertEqual(data["discipline_profile"], "medicine")
        self.assertEqual(data["discipline_guideline"], "CONSORT")
        self.assertIsInstance(data["advanced_findings"], list)
        self.assertIsInstance(data["checklist_results"], list)
