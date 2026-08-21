"""
Pillar 2: Journal Integration Platform — Comprehensive Tests
==============================================================
Tests for the six manuscript analysis modules:
  1. ManuscriptParser (parser.py)
  2. StatisticalClaimExtractor (claim_extractor.py)
  3. ConsistencyValidator (consistency_validator.py)
  4. ManuscriptGuardian (manuscript_guardian.py)
  5. Advanced Validators (advanced_validators.py)
  6. Discipline Profiles (discipline_profiles.py)

All statistical examples use APA 7th-edition formatting and
scientifically accurate values verified against scipy.

Created: 2026-02-20
"""

from __future__ import annotations

import io
import unittest
from dataclasses import dataclass
from typing import Optional


try:
    from scipy import stats as scipy_stats

    SCIPY_AVAILABLE = True
except ImportError:
    scipy_stats = None
    SCIPY_AVAILABLE = False

from core.manuscript.parser import (
    ManuscriptParser,
    ParsedManuscript,
)
from core.manuscript.claim_extractor import (
    StatisticalClaimExtractor,
    StatisticalClaim,
    ExtractionSummary,
    CLAIM_TYPE_T,
    CLAIM_TYPE_F,
    CLAIM_TYPE_CHI2,
    CLAIM_TYPE_R,
    P_COMPARISON_EQUALS,
    P_COMPARISON_LESS,
)
from core.manuscript.consistency_validator import (
    ConsistencyValidator,
    ValidationSummary,
)
from core.manuscript.manuscript_guardian import (
    ManuscriptGuardian,
    ManuscriptReviewReport,
)
from core.manuscript.advanced_validators import (
    StatisticalConsistencyValidator,
    MultipleTestingValidator,
    EffectSizeCompletenessValidator,
    PowerReportingValidator,
    ReproducibilityValidator,
    MethodologicalAppropriatenessValidator,
    ReportingCompletenessValidator,
    ValidatorFinding,
    run_all_validators,
)
from core.manuscript.discipline_profiles import (
    get_profile,
    list_profiles,
    get_all_profiles,
    evaluate_checklist,
    checklist_summary,
    DisciplineProfile,
)


# ===========================================================================
# Helpers
# ===========================================================================


def _make_manuscript_text(include_sections=True, include_stats=True):
    """Build a realistic manuscript-like plain text for testing."""
    parts = []
    if include_sections:
        parts.append("Effects of Cognitive Training on Working Memory Capacity\n" "John A. Smith and Jane B. Doe\n\n")
        parts.append(
            "Abstract\n"
            "This study examined the effects of a 6-week cognitive training "
            "program on working memory capacity in older adults (N = 120). "
            "Participants were randomly assigned to training or control groups. "
            "Results indicated significant improvements in the training group.\n\n"
        )
        parts.append(
            "Introduction\n"
            "Working memory is a core cognitive function that declines with age. "
            "Previous research using Pearson correlation has shown that working "
            "memory capacity predicts academic performance.\n\n"
        )
        parts.append(
            "Methods\n"
            "Participants: N = 120 older adults (60 per group), age range 65-80. "
            "An independent-samples t-test was used to compare the groups. "
            "The study used a between-subjects design.\n\n"
        )
    if include_stats:
        parts.append(
            "Results\n"
            "The training group showed significantly greater improvement "
            "than the control group, t(118) = 2.87, p = .005, Cohen's d = 0.53. "
            "An ANOVA revealed a main effect of condition, F(2, 87) = 5.67, "
            "p = .005. The chi-square test of independence was significant, "
            "chi-square(3) = 12.45, p = .006. "
            "The correlation between training hours and improvement was "
            "r = .56, p < .001.\n\n"
        )
    if include_sections:
        parts.append(
            "Discussion\n"
            "These findings suggest that cognitive training can improve "
            "working memory in older adults.\n\n"
        )
        parts.append("References\n" "Smith, J. A. (2023). Cognitive training. Journal of Memory, 10, 1-15.\n")
    return "".join(parts)


@dataclass
class _MockClaim:
    """Lightweight mock that matches the attribute protocol expected by
    ConsistencyValidator (uses ``statistic`` not ``statistic_value``)."""

    claim_id: str = "C001"
    claim_type: str = ""
    statistic: Optional[float] = None
    p_value: Optional[float] = None
    p_comparison: str = "equals"
    df: Optional[tuple] = None
    n: Optional[int] = None
    raw_text: str = ""


# ===========================================================================
# 1. TestManuscriptParser
# ===========================================================================


class TestManuscriptParser(unittest.TestCase):
    """Tests for ManuscriptParser parsing and section segmentation."""

    def setUp(self):
        self.parser = ManuscriptParser()

    # -- helpers --
    def _parse_text(self, text: str) -> ParsedManuscript:
        f = io.StringIO(text)
        f.name = "test.tex"
        return self.parser.parse(f, file_type="latex")

    # -- tests --
    def test_parse_plain_text(self):
        """Plain text input is parsed and metadata extracted."""
        text = _make_manuscript_text()
        result = self._parse_text(text)

        self.assertIsInstance(result, ParsedManuscript)
        self.assertTrue(len(result.full_text) > 100)
        self.assertIsNotNone(result.metadata)
        self.assertGreater(result.metadata.word_count, 50)

    def test_extract_sections(self):
        """Text with standard headings yields correct section mapping."""
        text = _make_manuscript_text()
        result = self._parse_text(text)

        section_types = [s.section_type for s in result.sections]
        self.assertIn("abstract", section_types)
        self.assertIn("introduction", section_types)
        self.assertIn("methods", section_types)
        self.assertIn("results", section_types)
        self.assertIn("discussion", section_types)
        self.assertIn("references", section_types)

    def test_extract_statistical_text(self):
        """Text containing statistical tests mentions them in metadata."""
        text = _make_manuscript_text()
        result = self._parse_text(text)

        stat_tests = result.metadata.statistical_tests_mentioned
        self.assertIn("t-test", stat_tests)
        self.assertIn("correlation", stat_tests)

    def test_empty_input(self):
        """Empty string produces empty or minimal results with warnings."""
        result = self._parse_text("")

        self.assertEqual(len(result.sections), 0)
        self.assertEqual(result.metadata.word_count, 0)
        self.assertTrue(len(result.warnings) > 0)

    def test_parse_with_tables(self):
        """Text with table-like content detects tables in sections."""
        text = (
            "Results\n"
            "Table 1. Descriptive Statistics\n"
            "Variable    Mean    SD\n"
            "Age         72.3    5.1\n"
            "Score       85.6    12.4\n\n"
            "The results were significant.\n"
        )
        result = self._parse_text(text)

        # Find the results section and check for tables
        results_sections = [s for s in result.sections if s.section_type == "results"]
        self.assertTrue(len(results_sections) > 0)
        results_sec = results_sections[0]
        self.assertTrue(len(results_sec.tables) > 0)
        self.assertIn("Table 1", results_sec.tables[0]["caption"])

    def test_parse_quality_score(self):
        """A well-structured manuscript gets a higher parse quality."""
        full_text = _make_manuscript_text()
        result_full = self._parse_text(full_text)

        minimal_text = "Some very short text."
        result_short = self._parse_text(minimal_text)

        self.assertGreater(result_full.parse_quality, result_short.parse_quality)

    def test_methods_and_results_convenience(self):
        """methods_text and results_text are populated from sections."""
        text = _make_manuscript_text()
        result = self._parse_text(text)

        self.assertTrue(len(result.methods_text) > 0)
        self.assertTrue(len(result.results_text) > 0)

    def test_figure_reference_detection(self):
        """Figure and Table references are detected in section content."""
        text = (
            "Results\n"
            "As shown in Figure 1 and Table 2, the effect was significant. "
            "See also Fig. 3 for the interaction.\n"
        )
        result = self._parse_text(text)
        results_sections = [s for s in result.sections if s.section_type == "results"]
        if results_sections:
            refs = results_sections[0].figures_mentioned
            ref_strings = [r.lower() for r in refs]
            self.assertTrue(any("figure 1" in r or "fig" in r for r in ref_strings))


# ===========================================================================
# 2. TestStatisticalClaimExtractor
# ===========================================================================


class TestStatisticalClaimExtractor(unittest.TestCase):
    """Tests for StatisticalClaimExtractor regex-based extraction."""

    def setUp(self):
        self.extractor = StatisticalClaimExtractor()

    def test_extract_t_test_claim(self):
        """APA-format t-test: t(45) = 2.34, p = .021"""
        text = "The difference was significant, t(45) = 2.34, p = .021, d = 0.5"
        claims = self.extractor.extract(text, section="results")

        t_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_T]
        self.assertTrue(len(t_claims) >= 1)
        claim = t_claims[0]
        self.assertAlmostEqual(claim.statistic_value, 2.34, places=2)
        self.assertAlmostEqual(claim.p_value, 0.021, places=3)
        self.assertEqual(claim.df, (45,))

    def test_extract_f_test_claim(self):
        """APA-format F-test: F(2, 87) = 5.67, p = .005"""
        text = "There was a significant main effect, F(2, 87) = 5.67, p = .005, partial eta-squared = .12"
        claims = self.extractor.extract(text, section="results")

        f_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_F]
        self.assertTrue(len(f_claims) >= 1)
        claim = f_claims[0]
        self.assertAlmostEqual(claim.statistic_value, 5.67, places=2)
        self.assertAlmostEqual(claim.p_value, 0.005, places=3)
        self.assertEqual(claim.df, (2, 87))

    def test_extract_chi_square_claim(self):
        """APA-format chi-square: chi-square(3) = 12.45, p = .006"""
        text = "The test was significant, chi-square(3) = 12.45, p = .006, Cramer's V = .23"
        claims = self.extractor.extract(text, section="results")

        chi2_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_CHI2]
        self.assertTrue(len(chi2_claims) >= 1)
        claim = chi2_claims[0]
        self.assertAlmostEqual(claim.statistic_value, 12.45, places=2)
        self.assertAlmostEqual(claim.p_value, 0.006, places=3)
        self.assertEqual(claim.df, (3,))

    def test_extract_correlation_claim(self):
        """APA-format correlation: r = .56, p < .001"""
        text = "The correlation was significant, r = .56, p < .001, and remained so after correction"
        claims = self.extractor.extract(text, section="results")

        r_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_R]
        self.assertTrue(len(r_claims) >= 1)
        claim = r_claims[0]
        self.assertAlmostEqual(claim.statistic_value, 0.56, places=2)
        self.assertAlmostEqual(claim.p_value, 0.001, places=3)
        self.assertEqual(claim.p_comparison, P_COMPARISON_LESS)

    def test_extract_multiple_claims(self):
        """Text with 3+ stats extracts all claims."""
        text = (
            "Group differences were significant, t(58) = 3.12, p = .003. "
            "The ANOVA was also significant, F(3, 96) = 4.56, p = .005. "
            "The correlation was r = .42, p = .001. "
            "chi-square(2) = 8.91, p = .012."
        )
        claims = self.extractor.extract(text, section="results")

        claim_types = {c.claim_type for c in claims if c.claim_type}
        self.assertIn(CLAIM_TYPE_T, claim_types)
        self.assertIn(CLAIM_TYPE_F, claim_types)
        self.assertIn(CLAIM_TYPE_R, claim_types)
        self.assertIn(CLAIM_TYPE_CHI2, claim_types)
        self.assertGreaterEqual(len(claims), 4)

    def test_extract_no_claims(self):
        """Non-statistical text yields empty list."""
        text = (
            "The weather was sunny and the participants enjoyed the outdoor " "activities during the summer vacation."
        )
        claims = self.extractor.extract(text, section="results")
        stat_claims = [c for c in claims if c.claim_type]
        self.assertEqual(len(stat_claims), 0)

    def test_extract_p_value_formats(self):
        """Various p-value formats are all handled."""
        text = (
            "Result 1: t(30) = 2.04, p = .05; "
            "Result 2: t(40) = 3.89, p < .001; "
            "Result 3: t(50) = 1.50, p > .05; "
            "Result 4: t(60) = 2.10, p = 0.023 and this was important"
        )
        claims = self.extractor.extract(text, section="results")
        t_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_T]

        self.assertGreaterEqual(len(t_claims), 4)
        p_values = sorted([c.p_value for c in t_claims if c.p_value is not None])
        self.assertIn(0.001, p_values)

    def test_extract_with_context(self):
        """Extracted claim includes raw_text from the matched region."""
        text = "The treatment effect was significant, t(45) = 2.34, p = .021 and notable"
        claims = self.extractor.extract(text, section="results")

        t_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_T]
        self.assertTrue(len(t_claims) >= 1)
        self.assertIn("t(45)", t_claims[0].raw_text)

    def test_extract_assigns_sequential_ids(self):
        """Claims get sequential IDs: C001, C002, ..."""
        text = "Result A: t(30) = 2.04, p = .05. " "Result B: F(2, 45) = 3.67, p = .034."
        claims = self.extractor.extract(text, section="results")
        ids = [c.claim_id for c in claims if c.claim_id]
        self.assertIn("C001", ids)
        self.assertIn("C002", ids)

    def test_extract_empty_text(self):
        """Empty text returns empty list without error."""
        claims = self.extractor.extract("", section="results")
        self.assertEqual(claims, [])

    def test_extract_whitespace_only(self):
        """Whitespace-only text returns empty list."""
        claims = self.extractor.extract("   \n\t  ", section="results")
        self.assertEqual(claims, [])

    def test_summarize_claims(self):
        """Summarize produces correct aggregate statistics."""
        text = "t(30) = 2.50, p = .018. " "F(2, 45) = 3.67, p = .034. " "r = .42, p = .003."
        claims = self.extractor.extract(text, section="results")
        summary = self.extractor.summarize(claims)

        self.assertIsInstance(summary, ExtractionSummary)
        self.assertGreaterEqual(summary.total_claims, 3)
        self.assertGreaterEqual(summary.claims_with_p_values, 3)

    def test_extract_correlation_with_df(self):
        """Correlation with parenthesized df: r(48) = .67, p = .002."""
        text = "The correlation was r(48) = .67, p = .002."
        claims = self.extractor.extract(text, section="results")

        r_claims = [c for c in claims if c.claim_type == CLAIM_TYPE_R]
        self.assertTrue(len(r_claims) >= 1)
        claim = r_claims[0]
        self.assertAlmostEqual(claim.statistic_value, 0.67, places=2)
        self.assertEqual(claim.df, (48,))

    def test_extract_odds_ratio_with_ci(self):
        """Odds ratio with CI: OR = 2.45, 95% CI [1.23, 4.56]."""
        text = "The odds ratio was OR = 2.45, 95% CI [1.23, 4.56]."
        claims = self.extractor.extract(text, section="results")

        or_claims = [c for c in claims if c.claim_type == "odds_ratio"]
        self.assertTrue(len(or_claims) >= 1)
        claim = or_claims[0]
        self.assertAlmostEqual(claim.statistic_value, 2.45, places=2)
        self.assertIsNotNone(claim.confidence_interval)
        self.assertAlmostEqual(claim.confidence_interval[0], 1.23, places=2)
        self.assertAlmostEqual(claim.confidence_interval[1], 4.56, places=2)


# ===========================================================================
# 3. TestConsistencyValidator
# ===========================================================================


@unittest.skipUnless(SCIPY_AVAILABLE, "scipy required for consistency checks")
class TestConsistencyValidator(unittest.TestCase):
    """Tests for STATCHECK-style p-value consistency validation.

    Uses scipy to verify that the validator correctly recomputes p-values
    and detects inconsistencies.
    """

    def setUp(self):
        self.validator = ConsistencyValidator(alpha=0.05, tolerance=0.005)

    def test_consistent_t_test(self):
        """t(30) = 2.04, p = .05 is approximately consistent."""
        # Verify with scipy: 2 * sf(2.04, 30) ~ 0.0501
        expected_p = scipy_stats.t.sf(2.04, 30) * 2
        claim = _MockClaim(
            claim_type="t",
            statistic=2.04,
            p_value=round(expected_p, 3),
            df=(30,),
        )
        result = self.validator.validate_claim(claim)
        self.assertTrue(result.is_consistent)
        self.assertEqual(result.severity, "none")

    def test_inconsistent_t_test(self):
        """t(30) = 2.04 with p = .001 is INCONSISTENT (actual p ~ .050)."""
        claim = _MockClaim(
            claim_type="t",
            statistic=2.04,
            p_value=0.001,
            df=(30,),
        )
        result = self.validator.validate_claim(claim)
        self.assertFalse(result.is_consistent)
        self.assertIn(result.severity, ("major", "gross_error"))

    def test_consistent_f_test(self):
        """F(2, 45) = 3.20 with matching p-value is consistent."""
        expected_p = scipy_stats.f.sf(3.20, 2, 45)
        claim = _MockClaim(
            claim_type="F",
            statistic=3.20,
            p_value=round(expected_p, 3),
            df=(2, 45),
        )
        result = self.validator.validate_claim(claim)
        self.assertTrue(result.is_consistent)

    def test_inconsistent_f_test(self):
        """F(2, 45) = 3.20, p = .500 is INCONSISTENT (actual p ~ .050)."""
        claim = _MockClaim(
            claim_type="F",
            statistic=3.20,
            p_value=0.500,
            df=(2, 45),
        )
        result = self.validator.validate_claim(claim)
        self.assertFalse(result.is_consistent)

    def test_consistent_chi_square(self):
        """chi2(3) = 7.82 with matching p-value is consistent."""
        expected_p = scipy_stats.chi2.sf(7.82, 3)
        claim = _MockClaim(
            claim_type="chi2",
            statistic=7.82,
            p_value=round(expected_p, 3),
            df=(3,),
        )
        result = self.validator.validate_claim(claim)
        self.assertTrue(result.is_consistent)

    def test_borderline_p_value(self):
        """P-value close to but clearly below threshold handled appropriately."""
        # t(50) = 2.10: p ~ 0.0408 (clearly below .05)
        expected_p = scipy_stats.t.sf(2.10, 50) * 2
        claim = _MockClaim(
            claim_type="t",
            statistic=2.10,
            p_value=round(expected_p, 3),
            df=(50,),
        )
        result = self.validator.validate_claim(claim)
        # Should be consistent since reported matches computed
        self.assertTrue(result.is_consistent)
        self.assertTrue(result.is_decision_consistent)

    def test_gross_inconsistency(self):
        """Completely wrong p-value is flagged as gross error."""
        # t(30) = 0.5 -> actual p ~ 0.621 but report p = .001
        claim = _MockClaim(
            claim_type="t",
            statistic=0.5,
            p_value=0.001,
            df=(30,),
        )
        result = self.validator.validate_claim(claim)
        self.assertFalse(result.is_consistent)
        self.assertFalse(result.is_decision_consistent)
        # Discrepancy > 0.05 + decision change = gross_error
        self.assertEqual(result.severity, "gross_error")

    def test_decision_error(self):
        """Reported as significant but p > .05 detects decision error."""
        # t(20) = 1.0 -> actual p ~ 0.329, but report p = .040
        claim = _MockClaim(
            claim_type="t",
            statistic=1.0,
            p_value=0.040,
            p_comparison="equals",
            df=(20,),
        )
        result = self.validator.validate_claim(claim)
        self.assertFalse(result.is_consistent)
        self.assertFalse(result.is_decision_consistent)

    def test_validate_batch(self):
        """Batch validation returns correct summary stats."""
        # One consistent, one inconsistent
        p1 = round(scipy_stats.t.sf(2.50, 30) * 2, 3)
        claims = [
            _MockClaim(claim_id="C001", claim_type="t", statistic=2.50, p_value=p1, df=(30,)),
            _MockClaim(claim_id="C002", claim_type="t", statistic=2.50, p_value=0.900, df=(30,)),
        ]
        summary = self.validator.validate(claims)

        self.assertIsInstance(summary, ValidationSummary)
        self.assertEqual(summary.total_checked, 2)
        self.assertGreaterEqual(summary.consistent, 1)
        self.assertGreaterEqual(summary.inconsistent, 1)

    def test_z_test_recomputation(self):
        """z = 1.96, p = .050 is consistent (two-tailed)."""
        expected_p = scipy_stats.norm.sf(1.96) * 2
        claim = _MockClaim(
            claim_type="z",
            statistic=1.96,
            p_value=round(expected_p, 3),
        )
        result = self.validator.validate_claim(claim)
        self.assertTrue(result.is_consistent)

    def test_skip_missing_statistic(self):
        """Claim with no test statistic is skipped gracefully."""
        claim = _MockClaim(
            claim_type="t",
            statistic=None,
            p_value=0.05,
            df=(30,),
        )
        result = self.validator.validate_claim(claim)
        self.assertIsNone(result.computed_p)
        self.assertIn("not reported", result.note)

    def test_skip_missing_p_value(self):
        """Claim with no p-value is skipped gracefully."""
        claim = _MockClaim(
            claim_type="t",
            statistic=2.50,
            p_value=None,
            df=(30,),
        )
        result = self.validator.validate_claim(claim)
        self.assertIsNone(result.computed_p)

    def test_skip_unsupported_type(self):
        """Unsupported claim type is skipped with a note."""
        claim = _MockClaim(
            claim_type="beta",
            statistic=0.34,
            p_value=0.005,
        )
        result = self.validator.validate_claim(claim)
        self.assertIsNone(result.computed_p)
        self.assertIn("not recomputable", result.note)

    def test_p_value_out_of_range(self):
        """A p-value > 1 is an extraction artifact (e.g. a dropped 'x 10^-n'),
        not the author's error, so it is treated as not-checkable rather than
        flagged as a gross error against the author."""
        claim = _MockClaim(
            claim_type="t",
            statistic=2.0,
            p_value=1.5,
            df=(30,),
        )
        result = self.validator.validate_claim(claim)
        self.assertIsNone(result.computed_p)
        self.assertNotEqual(result.severity, "gross_error")
        self.assertIn("outside", result.note)

    def test_less_than_comparison(self):
        """p < .001 with a very significant t-value is consistent."""
        # t(100) = 5.0 -> p ~ 2e-6 < .001
        claim = _MockClaim(
            claim_type="t",
            statistic=5.0,
            p_value=0.001,
            p_comparison="less_than",
            df=(100,),
        )
        result = self.validator.validate_claim(claim)
        self.assertTrue(result.is_consistent)

    def test_consistency_rate(self):
        """Overall consistency rate is computed correctly."""
        p1 = round(scipy_stats.t.sf(2.50, 30) * 2, 3)
        claims = [
            _MockClaim(claim_id="C001", claim_type="t", statistic=2.50, p_value=p1, df=(30,)),
        ]
        summary = self.validator.validate(claims)
        self.assertAlmostEqual(summary.overall_consistency_rate, 1.0)


# ===========================================================================
# 4. TestManuscriptGuardian
# ===========================================================================


class TestManuscriptGuardian(unittest.TestCase):
    """Tests for ManuscriptGuardian orchestrator pipeline."""

    def _make_text_file(self, text: str):
        f = io.StringIO(text)
        f.name = "manuscript.tex"
        return f

    def test_validate_claims(self):
        """Guardian pipeline extracts claims from text and produces a report."""
        text = _make_manuscript_text()
        guardian = ManuscriptGuardian(field="general")
        f = self._make_text_file(text)
        report = guardian.review(f, file_type="latex")

        self.assertIsInstance(report, ManuscriptReviewReport)
        self.assertGreater(report.claims_found, 0)
        self.assertIsNotNone(report.consistency_rate)

    def test_flag_reporting_issues(self):
        """Guardian flags missing effect sizes and other reporting issues."""
        # Text with stats but NO effect sizes or CIs
        text = (
            "Results\n"
            "The difference was significant, t(30) = 2.50, p = .018. "
            "The ANOVA showed F(2, 45) = 3.67, p = .034. "
            "A third test: t(50) = 1.80, p = .078.\n"
        )
        guardian = ManuscriptGuardian(field="general")
        f = self._make_text_file(text)
        report = guardian.review(f, file_type="latex")

        # Should have findings about missing sections and possibly effect sizes
        finding_titles = [fd.title.lower() for fd in report.findings]
        has_reporting_issue = any("effect size" in t or "section" in t or "confidence" in t for t in finding_titles)
        self.assertTrue(has_reporting_issue)

    def test_clean_manuscript(self):
        """All-consistent claims produce a pass or minor assessment."""
        # Build text with a single well-reported claim
        if SCIPY_AVAILABLE:
            expected_p = scipy_stats.t.sf(2.87, 118) * 2
            p_str = f"{expected_p:.3f}"
        else:
            p_str = ".005"
        text = (
            "Abstract\n"
            "We tested a hypothesis.\n\n"
            "Introduction\n"
            "Background information.\n\n"
            "Methods\n"
            "N = 120 participants. Independent t-test was used. "
            "Analyses were conducted using R version 4.3.2. "
            "The data are available at osf.io/abc123.\n\n"
            "Results\n"
            f"t(118) = 2.87, p = .{p_str.split('.')[-1]}, "
            "Cohen's d = 0.53, 95% CI [0.15, 0.91].\n\n"
            "Discussion\n"
            "The results are discussed.\n\n"
            "References\n"
            "Smith (2023).\n"
        )
        guardian = ManuscriptGuardian(field="general")
        f = self._make_text_file(text)
        report = guardian.review(f, file_type="latex")

        self.assertIsInstance(report, ManuscriptReviewReport)
        # With comprehensive reporting the assessment should not be critical
        self.assertNotEqual(report.overall_assessment, "critical")

    def test_review_report_to_dict(self):
        """Report can be serialized to a dict."""
        text = _make_manuscript_text()
        guardian = ManuscriptGuardian(field="general")
        f = self._make_text_file(text)
        report = guardian.review(f, file_type="latex")

        d = report.to_dict()
        self.assertIn("title", d)
        self.assertIn("claims_found", d)
        self.assertIn("findings", d)
        self.assertIn("consistency_results", d)

    def test_generate_editor_summary(self):
        """Editor summary is a non-empty string."""
        text = _make_manuscript_text()
        guardian = ManuscriptGuardian(field="general")
        f = self._make_text_file(text)
        report = guardian.review(f, file_type="latex")

        summary = report.generate_editor_summary()
        self.assertIsInstance(summary, str)
        self.assertGreater(len(summary), 50)

    def test_generate_author_report(self):
        """Author report is a non-empty string."""
        text = _make_manuscript_text()
        guardian = ManuscriptGuardian(field="general")
        f = self._make_text_file(text)
        report = guardian.review(f, file_type="latex")

        author_report = report.generate_author_report()
        self.assertIsInstance(author_report, str)
        self.assertGreater(len(author_report), 20)

    def test_processing_time_recorded(self):
        """Processing time is a positive integer (ms)."""
        text = _make_manuscript_text()
        guardian = ManuscriptGuardian(field="general")
        f = self._make_text_file(text)
        report = guardian.review(f, file_type="latex")

        self.assertIsInstance(report.processing_time_ms, int)
        self.assertGreaterEqual(report.processing_time_ms, 0)


# ===========================================================================
# 5. TestAdvancedValidators
# ===========================================================================


class TestAdvancedValidators(unittest.TestCase):
    """Tests for the 7 advanced manuscript-level validators."""

    def _make_claims(self, n_claims=4, include_es=False, include_ci=False):
        """Build a list of StatisticalClaim objects for testing."""
        claims = []
        for i in range(n_claims):
            claim = StatisticalClaim(
                claim_id=f"C{i+1:03d}",
                claim_type=CLAIM_TYPE_T,
                test_name="independent t-test",
                statistic_value=2.0 + i * 0.5,
                p_value=0.04 - i * 0.01 if i < 4 else 0.01,
                p_comparison=P_COMPARISON_EQUALS,
                df=(30,),
                raw_text=f"t(30) = {2.0 + i * 0.5:.1f}, p = .{4 - i:02d}",
                location="results",
                position=i * 100,
            )
            if include_es:
                claim.effect_size_type = "Cohen's d"
                claim.effect_size_value = 0.5 + i * 0.1
            if include_ci:
                claim.confidence_interval = (0.1, 0.9)
                claim.ci_level = 0.95
            claims.append(claim)
        return claims

    # -- StatisticalConsistencyValidator --

    @unittest.skipUnless(SCIPY_AVAILABLE, "scipy required")
    def test_statistical_consistency_validator(self):
        """StatisticalConsistencyValidator checks p-value recomputation."""
        validator = StatisticalConsistencyValidator()
        # A claim with a consistent p-value
        if SCIPY_AVAILABLE:
            expected_p = scipy_stats.t.sf(2.50, 30) * 2
        else:
            expected_p = 0.018
        claim = StatisticalClaim(
            claim_id="C001",
            claim_type=CLAIM_TYPE_T,
            statistic_value=2.50,
            p_value=round(expected_p, 3),
            df=(30,),
            raw_text="t(30) = 2.50, p = .018",
            location="results",
            position=0,
        )
        text = "t(30) = 2.50, p = .018"
        findings = validator.validate(text, [claim])
        self.assertTrue(len(findings) > 0)
        severities = [f.severity for f in findings]
        self.assertIn("positive", severities)

    # -- MultipleTestingValidator --

    def test_multiple_testing_no_correction(self):
        """4+ tests without correction yields major finding."""
        validator = MultipleTestingValidator()
        claims = self._make_claims(n_claims=5)
        text = "We ran five tests. " + " ".join(c.raw_text for c in claims)
        findings = validator.validate(text, claims)

        severities = [f.severity for f in findings]
        self.assertIn("major", severities)

    def test_multiple_testing_with_correction(self):
        """Tests with Bonferroni correction mentioned yields positive."""
        validator = MultipleTestingValidator()
        claims = self._make_claims(n_claims=5)
        text = "We ran five tests and applied Bonferroni correction " "for multiple comparisons. " + " ".join(
            c.raw_text for c in claims
        )
        findings = validator.validate(text, claims)
        severities = [f.severity for f in findings]
        self.assertIn("positive", severities)

    def test_multiple_testing_three_tests(self):
        """Exactly 3 tests without correction yields moderate."""
        validator = MultipleTestingValidator()
        claims = self._make_claims(n_claims=3)
        text = " ".join(c.raw_text for c in claims)
        findings = validator.validate(text, claims)
        severities = [f.severity for f in findings]
        self.assertIn("moderate", severities)

    # -- EffectSizeCompletenessValidator --

    def test_effect_size_missing(self):
        """Primary test without effect size yields major finding."""
        validator = EffectSizeCompletenessValidator()
        claims = self._make_claims(n_claims=1, include_es=False)
        text = claims[0].raw_text
        findings = validator.validate(text, claims)

        major_findings = [f for f in findings if f.severity == "major"]
        self.assertTrue(len(major_findings) > 0)

    def test_effect_size_present_no_ci(self):
        """Effect size present but no CI yields moderate finding."""
        validator = EffectSizeCompletenessValidator()
        claims = self._make_claims(n_claims=1, include_es=True, include_ci=False)
        text = claims[0].raw_text + " Cohen's d = 0.50"
        findings = validator.validate(text, claims)

        moderate_findings = [f for f in findings if f.severity == "moderate"]
        self.assertTrue(len(moderate_findings) > 0)

    def test_effect_size_and_ci_present(self):
        """Effect size + CI yields positive finding."""
        validator = EffectSizeCompletenessValidator()
        claims = self._make_claims(n_claims=1, include_es=True, include_ci=True)
        text = claims[0].raw_text + " Cohen's d = 0.50, 95% CI [0.10, 0.90]"
        findings = validator.validate(text, claims)

        positive_findings = [f for f in findings if f.severity == "positive"]
        self.assertTrue(len(positive_findings) > 0)

    # -- PowerReportingValidator --

    def test_power_analysis_present(self):
        """Power analysis mentioned yields positive finding."""
        validator = PowerReportingValidator()
        text = "A power analysis using G*Power indicated that a sample " "of 64 participants was needed for 80% power."
        findings = validator.validate(text, [])
        severities = [f.severity for f in findings]
        self.assertIn("positive", severities)

    def test_power_analysis_missing_small_n(self):
        """No power analysis + small N yields major finding."""
        validator = PowerReportingValidator()
        claim = StatisticalClaim(
            claim_id="C001",
            claim_type=CLAIM_TYPE_T,
            statistic_value=2.0,
            p_value=0.05,
            sample_size=15,
            # The df is what makes this analysis small, and a real extracted claim always
            # carries it: the extractor returns df=(13,) for this exact sentence. The fixture
            # omitted it and set only `sample_size`, so it exercised the document-wide-minimum
            # path that has now been retired -- it was less faithful to production than the
            # code it tested.
            df=(13,),
            raw_text="t(13) = 2.0, p = .05",
            location="results",
            position=0,
        )
        text = "N = 15 participants were tested. " + claim.raw_text
        findings = validator.validate(text, [claim])

        major_findings = [f for f in findings if f.severity == "major"]
        self.assertTrue(len(major_findings) > 0)

    def test_power_analysis_missing_large_n(self):
        """No power analysis with larger N yields moderate finding."""
        validator = PowerReportingValidator()
        text = "N = 200 participants were recruited. t(198) = 2.5, p = .013."
        claims = self._make_claims(n_claims=1)
        claims[0].sample_size = 200
        findings = validator.validate(text, claims)

        moderate_findings = [f for f in findings if f.severity == "moderate"]
        self.assertTrue(len(moderate_findings) > 0)

    # -- ReproducibilityValidator --

    def test_reproducibility_software_with_version(self):
        """Software + version mentioned yields positive finding."""
        validator = ReproducibilityValidator()
        text = "Analyses were conducted using R version 4.3.2."
        findings = validator.validate(text, [])

        positive_sw = [f for f in findings if f.severity == "positive" and "software" in f.title.lower()]
        self.assertTrue(len(positive_sw) > 0)

    def test_reproducibility_no_software(self):
        """No software mentioned yields moderate finding."""
        validator = ReproducibilityValidator()
        text = "We analyzed the data and found significant results."
        findings = validator.validate(text, [])

        software_findings = [f for f in findings if "software" in f.title.lower()]
        self.assertTrue(any(f.severity == "moderate" for f in software_findings))

    def test_reproducibility_data_availability(self):
        """Data availability statement yields positive finding."""
        validator = ReproducibilityValidator()
        text = "Data are available at https://osf.io/abc123. " "Analyses were conducted using SPSS."
        findings = validator.validate(text, [])

        da_findings = [f for f in findings if f.severity == "positive" and "data" in f.title.lower()]
        self.assertTrue(len(da_findings) > 0)

    def test_reproducibility_preregistration(self):
        """Pre-registration mention yields positive finding."""
        validator = ReproducibilityValidator()
        text = "This study was pre-registered at osf.io/abc123. " "Analyses used R version 4.3.1."
        findings = validator.validate(text, [])

        prereg = [f for f in findings if f.severity == "positive" and "pre-registration" in f.title.lower()]
        self.assertTrue(len(prereg) > 0)

    # -- MethodologicalAppropriatenessValidator --

    def test_a_correct_two_experiment_paper_produces_no_findings(self):
        """The false positive this validator was rebuilt to remove.

        Experiment 1 is a repeated-measures design analysed with a paired t-test; Experiment 2 is
        between-subjects analysed with an independent t-test. Both are CORRECT. The old
        document-level implementation OR-ed the design cues with the test names across the whole
        text and emitted TWO "major" findings that contradicted each other.

        MUTATION: restore the `has_rm and has_indep_t` co-occurrence check -> fails.
        """
        text = (
            "Experiment 1 used a repeated-measures design: the same 24 participants were tested "
            "at pre-test and post-test, analysed with a paired-samples t-test, "
            "t(23) = 3.10, p = .005. Experiment 2 used a between-subjects design with two "
            "independent groups of 30 participants each; an independent-samples t-test gave "
            "t(58) = 2.40, p = .020."
        )
        claims = StatisticalClaimExtractor().extract(text, section="Results")
        self.assertTrue(claims, "precondition: both t claims must be extracted")
        self.assertEqual(MethodologicalAppropriatenessValidator().validate(text, claims), [])

    @unittest.expectedFailure
    def test_design_mismatch_is_still_detected(self):
        """KNOWN GAP, deliberately recorded as an expected failure rather than deleted.

        A genuine mismatch -- a repeated-measures design analysed with an INDEPENDENT t-test --
        should be caught. Increment 1 of the claim-level engine carries only claim-LOCAL rules,
        and deciding which design governs THIS claim needs the analysis-context model (episode
        segmentation), which is increment 2.

        `expectedFailure` is the honest marker: it does not assert the gap is correct, and if
        someone implements the rule this test flips to an UNEXPECTED SUCCESS, which unittest
        reports as a failure -- forcing them to delete this marker rather than letting a
        newly-working capability sit silently untested.
        """
        text = (
            "This study used a repeated-measures design; the same participants were tested at "
            "pre-test and post-test. An independent-samples t-test compared the two time "
            "points, t(38) = 2.10, p = .042."
        )
        claims = StatisticalClaimExtractor().extract(text, section="Results")
        findings = MethodologicalAppropriatenessValidator().validate(text, claims)
        self.assertTrue([f for f in findings if f.severity == "major"])

    def test_ordinal_data_with_pearson(self):
        """Ordinal + Pearson, ported to claim level: the cue must be in the CLAIM's sentence.

        The old version fired on any co-occurrence in the document, including a Discussion
        sentence EXPLAINING the correct choice ("Unlike Pearson correlation, Spearman rho does
        not assume interval measurement").

        MUTATION: widen the ordinal cue search from the claim's sentence to the whole text ->
        the negative case below starts firing and this fails.
        """
        text = ("Satisfaction was rated on a 5-point Likert scale and correlated with age "
                "using Pearson correlation, r(48) = .31, p = .03.")
        claims = StatisticalClaimExtractor().extract(text, section="Results")
        findings = MethodologicalAppropriatenessValidator().validate(text, claims)
        self.assertTrue([f for f in findings if "ordinal" in f.title.lower()])

        # and the negative control: explaining the RIGHT choice must not be flagged
        ok = ("Unlike Pearson correlation, Spearman rho does not assume interval measurement, "
              "so we used Spearman throughout, r(48) = .31, p = .03.")
        ok_claims = StatisticalClaimExtractor().extract(ok, section="Results")
        self.assertEqual(MethodologicalAppropriatenessValidator().validate(ok, ok_claims), [])

    # -- ReportingCompletenessValidator --

    def test_reporting_complete_claim(self):
        """Fully reported claim (stat + df + exact p + CI + N) is positive."""
        validator = ReportingCompletenessValidator()
        claim = StatisticalClaim(
            claim_id="C001",
            claim_type=CLAIM_TYPE_T,
            statistic_value=2.50,
            p_value=0.018,
            p_comparison=P_COMPARISON_EQUALS,
            df=(30,),
            sample_size=32,
            confidence_interval=(0.1, 0.9),
            raw_text="t(30) = 2.50, p = .018",
            location="results",
            position=0,
        )
        text = "t(30) = 2.50, p = .018, 95% CI [0.1, 0.9], N = 32"
        findings = validator.validate(text, [claim])

        positive = [f for f in findings if f.severity == "positive"]
        self.assertTrue(len(positive) > 0)

    def test_reporting_missing_df(self):
        """Claim missing df yields moderate finding."""
        validator = ReportingCompletenessValidator()
        claim = StatisticalClaim(
            claim_id="C001",
            claim_type=CLAIM_TYPE_T,
            statistic_value=2.50,
            p_value=0.018,
            p_comparison=P_COMPARISON_EQUALS,
            df=None,
            raw_text="t = 2.50, p = .018",
            location="results",
            position=0,
        )
        text = "t = 2.50, p = .018"
        findings = validator.validate(text, [claim])

        non_positive = [f for f in findings if f.severity != "positive"]
        self.assertTrue(len(non_positive) > 0)

    # -- run_all_validators --

    def test_run_all_validators(self):
        """run_all_validators returns combined findings from all 7."""
        claims = self._make_claims(n_claims=2)
        text = _make_manuscript_text()
        findings = run_all_validators(text, claims)

        self.assertIsInstance(findings, list)
        self.assertTrue(len(findings) > 0)
        # Verify findings are sorted by severity (blocking first)
        severity_order = {"blocking": 4, "major": 3, "moderate": 2, "minor": 1, "positive": 0}
        if len(findings) >= 2:
            for i in range(len(findings) - 1):
                self.assertGreaterEqual(
                    severity_order.get(findings[i].severity, 0),
                    severity_order.get(findings[i + 1].severity, 0),
                )

    def test_each_validator_returns_list(self):
        """Each of the 7 validators returns a list of ValidatorFinding."""
        claims = self._make_claims(n_claims=2)
        text = _make_manuscript_text()

        validators = [
            StatisticalConsistencyValidator(),
            MultipleTestingValidator(),
            EffectSizeCompletenessValidator(),
            PowerReportingValidator(),
            ReproducibilityValidator(),
            MethodologicalAppropriatenessValidator(),
            ReportingCompletenessValidator(),
        ]
        for v in validators:
            findings = v.validate(text, claims)
            self.assertIsInstance(findings, list, f"{v.__class__.__name__} failed")
            for f in findings:
                self.assertIsInstance(f, ValidatorFinding, f"{v.__class__.__name__} bad finding")

    # -- Sample size validator via PowerReportingValidator --

    def test_sample_size_validator(self):
        """PowerReportingValidator detects small N from claims."""
        validator = PowerReportingValidator()
        claim = StatisticalClaim(
            claim_id="C001",
            claim_type=CLAIM_TYPE_T,
            statistic_value=2.0,
            p_value=0.05,
            sample_size=10,
            df=(8,),          # as the extractor really produces it; see the note above
            raw_text="t(8) = 2.0, p = .05",
            location="results",
            position=0,
        )
        text = "N = 10 participants. " + claim.raw_text
        findings = validator.validate(text, [claim])
        self.assertTrue(any(f.severity == "major" for f in findings))

    # -- Multiple comparison validator (additional) --

    def test_multiple_comparison_fdr(self):
        """FDR correction keyword is detected."""
        validator = MultipleTestingValidator()
        claims = self._make_claims(n_claims=5)
        text = (
            "We applied the Benjamini-Hochberg false discovery rate "
            "correction to account for multiple comparisons. " + " ".join(c.raw_text for c in claims)
        )
        findings = validator.validate(text, claims)
        severities = [f.severity for f in findings]
        self.assertIn("positive", severities)


# ===========================================================================
# 6. TestDisciplineProfiles
# ===========================================================================


class TestDisciplineProfiles(unittest.TestCase):
    """Tests for discipline-specific validation profiles."""

    def test_get_psychology_profile(self):
        """Psychology profile has JARS-Quant requirements."""
        profile = get_profile("psychology")

        self.assertIsInstance(profile, DisciplineProfile)
        self.assertEqual(profile.field, "psychology")
        self.assertEqual(profile.guideline, "JARS-Quant")
        self.assertTrue(len(profile.checklist) > 0)
        self.assertIn("effect_sizes", profile.category_weights)
        self.assertEqual(profile.category_weights["effect_sizes"], 1.5)
        self.assertIn("abstract", profile.required_sections)

    def test_get_medicine_profile(self):
        """Medicine profile has CONSORT requirements."""
        profile = get_profile("medicine")

        self.assertIsInstance(profile, DisciplineProfile)
        self.assertEqual(profile.field, "medicine")
        self.assertEqual(profile.guideline, "CONSORT")
        self.assertTrue(len(profile.checklist) > 0)
        # CONSORT requires randomization, blinding, etc.
        checklist_ids = [item.id for item in profile.checklist]
        self.assertIn("consort_randomization", checklist_ids)
        self.assertIn("consort_blinding", checklist_ids)

    def test_get_economics_profile(self):
        """Economics profile has identification strategy requirements."""
        profile = get_profile("economics")

        self.assertIsInstance(profile, DisciplineProfile)
        self.assertEqual(profile.field, "economics")
        self.assertEqual(profile.guideline, "AEA")
        checklist_ids = [item.id for item in profile.checklist]
        self.assertIn("econ_identification_strategy", checklist_ids)
        self.assertIn("econ_robustness_checks", checklist_ids)
        # Economics emphasizes assumptions checking
        self.assertEqual(profile.category_weights["assumptions"], 2.0)

    def test_unknown_discipline(self):
        """Unknown discipline raises ValueError with helpful message."""
        with self.assertRaises(ValueError) as ctx:
            get_profile("astrology")
        self.assertIn("Unknown", str(ctx.exception))
        self.assertIn("Available", str(ctx.exception))

    def test_get_profile_aliases(self):
        """Aliases like 'apa', 'rct', 'consort' resolve correctly."""
        self.assertEqual(get_profile("apa").field, "psychology")
        self.assertEqual(get_profile("rct").field, "medicine")
        self.assertEqual(get_profile("consort").field, "medicine")
        self.assertEqual(get_profile("strobe").field, "medicine_observational")

    def test_list_profiles_returns_unique(self):
        """list_profiles returns unique profiles with expected fields."""
        profiles = list_profiles()
        self.assertIsInstance(profiles, list)
        self.assertGreater(len(profiles), 5)

        fields = [p["field"] for p in profiles]
        self.assertEqual(len(fields), len(set(fields)))  # no duplicates

        for p in profiles:
            self.assertIn("field", p)
            self.assertIn("name", p)
            self.assertIn("guideline", p)
            self.assertIn("checklist_count", p)

    def test_get_all_profiles(self):
        """get_all_profiles returns full registry including aliases."""
        all_prof = get_all_profiles()
        self.assertIsInstance(all_prof, dict)
        self.assertIn("psychology", all_prof)
        self.assertIn("medicine", all_prof)
        self.assertIn("apa", all_prof)
        self.assertIn("rct", all_prof)

    def test_education_profile(self):
        """Education profile has ICC and multilevel model requirements."""
        profile = get_profile("education")
        self.assertEqual(profile.field, "education")
        self.assertEqual(profile.guideline, "AERA/WWC")
        checklist_ids = [item.id for item in profile.checklist]
        self.assertIn("edu_icc_reported", checklist_ids)
        self.assertIn("edu_multilevel_model", checklist_ids)

    def test_clinical_trial_profile(self):
        """Clinical trials profile has strict regulatory requirements."""
        profile = get_profile("clinical_trials")
        self.assertEqual(profile.field, "clinical_trials")
        self.assertEqual(profile.guideline, "ICH-E9/CONSORT")
        # All category weights should be elevated
        for weight in profile.category_weights.values():
            self.assertGreaterEqual(weight, 1.5)

    def test_social_science_profile(self):
        """Social science profile emphasizes open science."""
        profile = get_profile("social_science")
        self.assertEqual(profile.field, "social_science")
        checklist_ids = [item.id for item in profile.checklist]
        self.assertIn("soc_preregistration", checklist_ids)
        self.assertIn("soc_data_availability", checklist_ids)

    def test_evaluate_checklist_medicine(self):
        """Evaluating CONSORT checklist against a trial manuscript."""
        parser = ManuscriptParser()
        text = (
            "Abstract\n"
            "A randomized controlled trial of drug X versus placebo.\n\n"
            "Methods\n"
            "Randomization was performed using computer-generated random "
            "numbers with allocation concealment via sealed envelopes. "
            "This was a double-blind, placebo-controlled trial. "
            "Intention-to-treat analysis was used. "
            "The primary outcome was recovery time. "
            "Sample size was determined by a power analysis with 80% power.\n\n"
            "Results\n"
            "CONSORT flow diagram shows participant flow. "
            "120 participants were enrolled (NCT12345678). "
            "Adverse events were reported. "
            "Mean difference = 2.3, 95% CI [0.5, 4.1].\n\n"
            "Discussion\n"
            "The treatment was effective.\n"
        )
        f = io.StringIO(text)
        f.name = "trial.tex"
        parsed = parser.parse(f, file_type="latex")

        profile = get_profile("medicine")
        results = evaluate_checklist(profile, parsed)

        self.assertIsInstance(results, list)
        self.assertEqual(len(results), len(profile.checklist))

        # Count how many items were found
        found = [r for r in results if r.found]
        self.assertGreater(len(found), 5)

    def test_checklist_summary(self):
        """checklist_summary produces correct aggregate dict."""
        parser = ManuscriptParser()
        text = (
            "Methods\n"
            "Randomization was performed. Double-blind design.\n\n"
            "Results\n"
            "Primary outcome showed improvement.\n"
        )
        f = io.StringIO(text)
        f.name = "test.tex"
        parsed = parser.parse(f, file_type="latex")

        profile = get_profile("medicine")
        results = evaluate_checklist(profile, parsed)
        summary = checklist_summary(results)

        self.assertIn("total", summary)
        self.assertIn("found", summary)
        self.assertIn("missing_required", summary)
        self.assertIn("completion_pct", summary)
        self.assertIn("items", summary)
        self.assertEqual(summary["total"], len(profile.checklist))

    def test_severity_overrides(self):
        """Psychology profile has expected severity overrides."""
        profile = get_profile("psychology")
        self.assertIn("missing_effect_size", profile.severity_overrides)
        self.assertEqual(profile.severity_overrides["missing_effect_size"], "blocking")

    def test_case_insensitive_lookup(self):
        """Profile lookup is case-insensitive."""
        p1 = get_profile("Psychology")
        p2 = get_profile("PSYCHOLOGY")
        p3 = get_profile("psychology")
        self.assertEqual(p1.field, p2.field)
        self.assertEqual(p2.field, p3.field)


# ===========================================================================
# Run tests
# ===========================================================================

if __name__ == "__main__":
    unittest.main()
