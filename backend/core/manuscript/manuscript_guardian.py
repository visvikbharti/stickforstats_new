"""
ManuscriptGuardian — Orchestrator for Statistical Manuscript Review
====================================================================

Combines ManuscriptParser, StatisticalClaimExtractor, ConsistencyValidator,
and the existing SQS scoring engine into a single pipeline that produces
a comprehensive review of a manuscript's statistical quality.

This is the core of StickForStats Pillar 2: Journal Integration Platform.

Usage::

    from core.manuscript.manuscript_guardian import ManuscriptGuardian

    guardian = ManuscriptGuardian(field='psychology')
    report = guardian.review(uploaded_pdf)

Created: February 2026
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .parser import ManuscriptParser, ParsedManuscript
from .claim_extractor import (
    StatisticalClaimExtractor,
    StatisticalClaim,
    ExtractionSummary,
)
from .consistency_validator import (
    ConsistencyValidator,
    ValidationSummary,
)
from .advanced_validators import (
    run_all_validators,
    ValidatorFinding,
)
from .discipline_profiles import (
    get_profile,
    evaluate_checklist,
    apply_discipline_weights,
    checklist_summary,
    DisciplineProfile,
    ChecklistResult,
)

try:
    from core.sqs_scoring import SQSScorer

    SQS_AVAILABLE = True
except ImportError:
    SQS_AVAILABLE = False

logger = logging.getLogger(__name__)


# Map advanced-validator class names to short category keys used in
# ReviewFinding.category. Anything not in this table falls back to
# "methodology".
_VALIDATOR_CATEGORY: Dict[str, str] = {
    "StatisticalConsistencyValidator": "consistency",
    "MultipleTestingValidator": "multiple_testing",
    "EffectSizeCompletenessValidator": "effect_size",
    "PowerReportingValidator": "power",
    "ReproducibilityValidator": "reproducibility",
    "MethodologicalAppropriatenessValidator": "methodology",
    "ReportingCompletenessValidator": "reporting",
}


# =====================================================================
# Data classes for the review output
# =====================================================================


@dataclass
class ReviewFinding:
    """A single finding in the manuscript review."""

    severity: str  # 'blocking', 'major', 'moderate', 'minor', 'positive'
    category: str  # 'consistency', 'reporting', 'methodology', 'sqs'
    title: str
    description: str
    evidence: str = ""
    recommendation: str = ""
    claim_id: Optional[str] = None  # Reference to StatisticalClaim if applicable


@dataclass
class ManuscriptReviewReport:
    """
    Complete manuscript review output from ManuscriptGuardian.

    Contains all analysis results plus structured findings for
    editor, reviewer, and author report tiers.
    """

    # Manuscript identification
    title: str
    authors: List[str]
    word_count: int
    sections_found: List[str]

    # Pipeline results
    parsed: ParsedManuscript
    extraction_summary: ExtractionSummary
    consistency_summary: ValidationSummary
    sqs_report: Optional[Any] = None  # SQSReport if available

    # Aggregated scores
    sqs_score: Optional[float] = None
    sqs_grade: Optional[str] = None
    consistency_rate: Optional[float] = None
    claims_found: int = 0
    claims_consistent: int = 0
    claims_inconsistent: int = 0
    decision_errors: int = 0
    gross_errors: int = 0

    # Structured findings
    findings: List[ReviewFinding] = field(default_factory=list)
    positive_findings: List[ReviewFinding] = field(default_factory=list)

    # Advanced validator output (per-validator, retained for transparency).
    # Findings from these validators are also folded into `findings` /
    # `positive_findings` via ReviewFinding conversion.
    advanced_findings: List[ValidatorFinding] = field(default_factory=list)

    # Discipline profile evaluation
    discipline_profile: Optional[str] = None  # e.g. "medicine"
    discipline_guideline: Optional[str] = None  # e.g. "CONSORT"
    checklist_results: List[ChecklistResult] = field(default_factory=list)
    checklist_completion_pct: Optional[float] = None
    checklist_missing_required: List[str] = field(default_factory=list)

    # Overall assessment
    overall_assessment: str = "pass"  # pass, minor_issues, major_issues, critical

    # Processing metadata
    processing_time_ms: int = 0
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to a JSON-compatible dictionary."""
        return {
            "title": self.title,
            "authors": self.authors,
            "word_count": self.word_count,
            "sections_found": self.sections_found,
            "sqs_score": self.sqs_score,
            "sqs_grade": self.sqs_grade,
            "consistency_rate": self.consistency_rate,
            "claims_found": self.claims_found,
            "claims_consistent": self.claims_consistent,
            "claims_inconsistent": self.claims_inconsistent,
            "decision_errors": self.decision_errors,
            "gross_errors": self.gross_errors,
            "overall_assessment": self.overall_assessment,
            "findings": [
                {
                    "severity": f.severity,
                    "category": f.category,
                    "title": f.title,
                    "description": f.description,
                    "evidence": f.evidence,
                    "recommendation": f.recommendation,
                    "claim_id": f.claim_id,
                }
                for f in self.findings
            ],
            "positive_findings": [
                {
                    "severity": f.severity,
                    "category": f.category,
                    "title": f.title,
                    "description": f.description,
                }
                for f in self.positive_findings
            ],
            "extraction_summary": {
                "total_claims": self.extraction_summary.total_claims,
                "claims_by_type": self.extraction_summary.claims_by_type,
                "claims_with_p_values": self.extraction_summary.claims_with_p_values,
                "claims_with_effect_sizes": self.extraction_summary.claims_with_effect_sizes,
                "claims_with_ci": self.extraction_summary.claims_with_ci,
                "claims_with_df": self.extraction_summary.claims_with_df,
                "unique_test_types": self.extraction_summary.unique_test_types,
            },
            "consistency_results": [
                {
                    "claim_id": r.claim_id,
                    "claim_type": r.claim_type,
                    "reported_statistic": r.reported_statistic,
                    "reported_p": r.reported_p,
                    "computed_p": r.computed_p,
                    "is_consistent": r.is_consistent,
                    "is_decision_consistent": r.is_decision_consistent,
                    "discrepancy": r.discrepancy,
                    "severity": r.severity,
                    "note": r.note,
                }
                for r in self.consistency_summary.results
            ],
            "advanced_findings": [
                {
                    "validator": vf.validator,
                    "severity": vf.severity,
                    "confidence": vf.confidence,
                    "title": vf.title,
                    "description": vf.description,
                    "evidence": vf.evidence,
                    "recommendation": vf.recommendation,
                    "section": vf.section,
                }
                for vf in self.advanced_findings
            ],
            "discipline_profile": self.discipline_profile,
            "discipline_guideline": self.discipline_guideline,
            "checklist_completion_pct": self.checklist_completion_pct,
            "checklist_missing_required": self.checklist_missing_required,
            "checklist_results": [
                {
                    "item_id": cr.item.id,
                    "item_name": cr.item.name,
                    "category": cr.item.category,
                    "required": cr.item.required,
                    "found": cr.found,
                    "severity": cr.severity,
                    "section_searched": cr.section_searched,
                    "matched_text": cr.matched_text,
                }
                for cr in self.checklist_results
            ],
            "processing_time_ms": self.processing_time_ms,
            "warnings": self.warnings,
            "parse_quality": self.parsed.parse_quality,
        }

    def generate_editor_summary(self) -> str:
        """Generate a concise summary for journal editors."""
        lines = [
            f"STATISTICAL QUALITY REVIEW — {self.title or 'Untitled'}",
            "=" * 60,
            "",
        ]

        if self.sqs_score is not None:
            lines.append(f"Statistical Quality Score: {self.sqs_score:.1f}/100 " f"(Grade: {self.sqs_grade})")

        lines.append(f"Statistical Claims Found: {self.claims_found}")

        if self.claims_found > 0:
            lines.append(
                f"Consistency Rate: {(self.consistency_rate or 0) * 100:.1f}% "
                f"({self.claims_consistent}/{self.claims_found} consistent)"
            )
            if self.decision_errors > 0:
                lines.append(
                    f"** DECISION ERRORS: {self.decision_errors} claim(s) "
                    f"where significance conclusion may be incorrect **"
                )
            if self.gross_errors > 0:
                lines.append(f"** GROSS ERRORS: {self.gross_errors} claim(s) with " f"large p-value discrepancies **")

        lines.append("")
        lines.append(f"Overall Assessment: {self.overall_assessment.upper()}")
        lines.append("")

        # Major findings
        blocking = [f for f in self.findings if f.severity == "blocking"]
        major = [f for f in self.findings if f.severity == "major"]

        if blocking:
            lines.append("BLOCKING ISSUES:")
            for f in blocking:
                lines.append(f"  - {f.title}: {f.description}")
        if major:
            lines.append("MAJOR ISSUES:")
            for f in major:
                lines.append(f"  - {f.title}: {f.description}")

        if not blocking and not major:
            lines.append("No blocking or major issues identified.")

        return "\n".join(lines)

    def generate_author_report(self) -> str:
        """Generate a constructive report for manuscript authors."""
        lines = [
            f"Statistical Review Feedback — {self.title or 'Untitled'}",
            "-" * 60,
            "",
        ]

        # Positives first
        if self.positive_findings:
            lines.append("What you did well:")
            for pf in self.positive_findings:
                lines.append(f"  + {pf.title}: {pf.description}")
            lines.append("")

        # Issues grouped by severity
        for severity_label, severity_key in [
            ("Issues to address", "major"),
            ("Suggestions for improvement", "moderate"),
            ("Minor notes", "minor"),
        ]:
            items = [f for f in self.findings if f.severity == severity_key]
            if items:
                lines.append(f"{severity_label}:")
                for item in items:
                    lines.append(f"  - {item.title}")
                    lines.append(f"    {item.description}")
                    if item.recommendation:
                        lines.append(f"    Recommendation: {item.recommendation}")
                lines.append("")

        return "\n".join(lines)


# =====================================================================
# Main orchestrator
# =====================================================================


class ManuscriptGuardian:
    """
    Orchestrates the full manuscript statistical review pipeline.

    Pipeline stages:
        1. Parse manuscript → structured sections
        2. Extract statistical claims from text
        3. Validate claim consistency (STATCHECK-style)
        4. Run SQS scoring on full text
        5. Generate findings and overall assessment
    """

    def __init__(
        self,
        field: str = "general",
        alpha: float = 0.05,
        consistency_tolerance: float = 0.005,
    ) -> None:
        self.field = field
        self.alpha = alpha
        self.consistency_tolerance = consistency_tolerance

        # Initialize pipeline components
        self._parser = ManuscriptParser()
        self._extractor = StatisticalClaimExtractor()
        self._validator = ConsistencyValidator(
            alpha=alpha,
            tolerance=consistency_tolerance,
        )
        self._sqs_scorer = SQSScorer(field=field) if SQS_AVAILABLE else None

    def review(
        self,
        file: Any,
        file_type: str = "auto",
    ) -> ManuscriptReviewReport:
        """
        Run the full review pipeline on a manuscript file.

        Args:
            file: File-like object (PDF, LaTeX, or DOCX).
            file_type: 'auto', 'pdf', 'latex', or 'docx'.

        Returns:
            ManuscriptReviewReport with all analysis results.
        """
        start_time = time.time()
        warnings: List[str] = []

        # ---- Stage 1: Parse ----
        try:
            parsed = self._parser.parse(file, file_type=file_type)
            warnings.extend(parsed.warnings)
        except Exception as exc:
            logger.error("ManuscriptGuardian parse failed: %s", exc)
            raise ValueError(f"Failed to parse manuscript: {exc}") from exc

        # ---- Stage 2: Extract claims ----
        claims: List[StatisticalClaim] = []
        try:
            claims = self._extractor.extract_from_sections(parsed.sections)
            if not claims and parsed.results_text:
                # Fallback: try extracting from raw results text
                claims = self._extractor.extract(parsed.results_text, section="results")
            if not claims and parsed.full_text:
                # Last resort: extract from full text
                claims = self._extractor.extract(parsed.full_text, section="full_text")
        except Exception as exc:
            logger.warning("Claim extraction failed: %s", exc)
            warnings.append(f"Claim extraction issue: {exc}")

        extraction_summary = self._extractor.summarize(claims)

        # ---- Stage 3: Consistency validation ----
        checkable_claims = [
            c for c in claims if c.claim_type and c.statistic_value is not None and c.p_value is not None
        ]

        try:
            consistency_summary = self._validator.validate(checkable_claims)
        except Exception as exc:
            logger.warning("Consistency validation failed: %s", exc)
            warnings.append(f"Consistency validation issue: {exc}")
            consistency_summary = ValidationSummary(
                total_checked=0,
                consistent=0,
                inconsistent=0,
                decision_errors=0,
                gross_errors=0,
                could_not_check=len(checkable_claims),
                results=[],
                overall_consistency_rate=0.0,
                severity_counts={
                    "none": 0,
                    "minor": 0,
                    "major": 0,
                    "gross_error": 0,
                },
                warnings=[str(exc)],
            )

        # ---- Stage 4: SQS scoring ----
        sqs_report = None
        sqs_score = None
        sqs_grade = None
        if self._sqs_scorer and parsed.full_text:
            try:
                sqs_report = self._sqs_scorer.analyze(
                    parsed.full_text,
                    title=parsed.metadata.title,
                )
                sqs_score = sqs_report.percentage
                sqs_grade = sqs_report.grade
            except Exception as exc:
                logger.warning("SQS scoring failed: %s", exc)
                warnings.append(f"SQS scoring issue: {exc}")

        # ---- Stage 5: Advanced validators (7 manuscript-level validators) ----
        advanced_findings: List[ValidatorFinding] = []
        try:
            sections_dict = {sec.section_type: sec.content for sec in parsed.sections}
            advanced_findings = run_all_validators(
                parsed.full_text or "",
                claims,
                sections_dict,
            )
        except Exception as exc:
            logger.warning("Advanced validators failed: %s", exc)
            warnings.append(f"Advanced validator issue: {exc}")

        # ---- Stage 6: Discipline profile + checklist ----
        profile: Optional[DisciplineProfile] = None
        checklist_results: List[ChecklistResult] = []
        try:
            profile = get_profile(self.field)
        except ValueError:
            # Unknown or generic field — profile-agnostic review
            profile = None

        if profile is not None:
            try:
                checklist_results = evaluate_checklist(profile, parsed)
            except Exception as exc:
                logger.warning("Checklist evaluation failed: %s", exc)
                warnings.append(f"Checklist evaluation issue: {exc}")

        # ---- Stage 7: Generate findings (incl. advanced + checklist) ----
        findings, positive_findings = self._generate_findings(
            parsed=parsed,
            claims=claims,
            extraction_summary=extraction_summary,
            consistency_summary=consistency_summary,
            sqs_report=sqs_report,
            advanced_findings=advanced_findings,
            checklist_results=checklist_results,
        )

        # ---- Stage 8: Apply discipline severity weights ----
        if profile is not None:
            findings = apply_discipline_weights(profile, findings)

        # ---- Determine overall assessment ----
        overall = self._determine_assessment(
            findings=findings,
            consistency_summary=consistency_summary,
            sqs_score=sqs_score,
        )

        # Checklist summary metrics
        checklist_completion_pct: Optional[float] = None
        missing_required: List[str] = []
        if checklist_results:
            summary = checklist_summary(checklist_results)
            checklist_completion_pct = summary["completion_pct"]
            missing_required = [r.item.name for r in checklist_results if not r.found and r.item.required]

        processing_time_ms = int((time.time() - start_time) * 1000)

        return ManuscriptReviewReport(
            title=parsed.metadata.title or "",
            authors=parsed.metadata.authors,
            word_count=parsed.metadata.word_count,
            sections_found=parsed.metadata.sections_found,
            parsed=parsed,
            extraction_summary=extraction_summary,
            consistency_summary=consistency_summary,
            sqs_report=sqs_report,
            sqs_score=sqs_score,
            sqs_grade=sqs_grade,
            consistency_rate=consistency_summary.overall_consistency_rate,
            claims_found=extraction_summary.total_claims,
            claims_consistent=consistency_summary.consistent,
            claims_inconsistent=consistency_summary.inconsistent,
            decision_errors=consistency_summary.decision_errors,
            gross_errors=consistency_summary.gross_errors,
            findings=findings,
            positive_findings=positive_findings,
            advanced_findings=advanced_findings,
            discipline_profile=profile.field if profile is not None else None,
            discipline_guideline=profile.guideline if profile is not None else None,
            checklist_results=checklist_results,
            checklist_completion_pct=checklist_completion_pct,
            checklist_missing_required=missing_required,
            overall_assessment=overall,
            processing_time_ms=processing_time_ms,
            warnings=warnings,
        )

    def review_text(
        self,
        text: str,
        title: Optional[str] = None,
    ) -> ManuscriptReviewReport:
        """
        Review raw manuscript text (no file parsing needed).

        Useful when text has already been extracted elsewhere.
        """
        import io

        # Wrap text in a file-like object for the parser
        f = io.StringIO(text)
        f.name = "manuscript.txt"
        return self.review(f, file_type="latex")

    # -----------------------------------------------------------------
    # Finding generation
    # -----------------------------------------------------------------

    def _generate_findings(
        self,
        parsed: ParsedManuscript,
        claims: List[StatisticalClaim],
        extraction_summary: ExtractionSummary,
        consistency_summary: ValidationSummary,
        sqs_report: Optional[Any],
        advanced_findings: Optional[List[ValidatorFinding]] = None,
        checklist_results: Optional[List[ChecklistResult]] = None,
    ) -> tuple:
        """Generate structured findings and positive findings."""
        findings: List[ReviewFinding] = []
        positives: List[ReviewFinding] = []

        # --- Consistency findings ---
        for result in consistency_summary.results:
            if result.severity == "gross_error":
                computed_str = f"{result.computed_p:.6f}" if result.computed_p is not None else "N/A"
                findings.append(
                    ReviewFinding(
                        severity="blocking",
                        category="consistency",
                        title=f"Gross statistical error in claim {result.claim_id}",
                        description=(
                            f'Reported p {result.reported_p_comparison or "="} {result.reported_p}, '
                            f"but recomputed p = {computed_str}. "
                            f"This leads to a different significance conclusion."
                        ),
                        evidence=result.raw_text,
                        recommendation=(
                            "Verify the reported test statistic, degrees of freedom, "
                            "and p-value. Rerun the analysis and correct the reported values."
                        ),
                        claim_id=result.claim_id,
                    )
                )
            elif result.severity == "major":
                computed_str = f"{result.computed_p:.6f}" if result.computed_p is not None else "N/A"
                discrepancy_str = f"{result.discrepancy:.4f}" if result.discrepancy is not None else "N/A"
                findings.append(
                    ReviewFinding(
                        severity="major",
                        category="consistency",
                        title=f"Significant discrepancy in claim {result.claim_id}",
                        description=(
                            f'Reported p {result.reported_p_comparison or "="} {result.reported_p}, '
                            f"recomputed p = {computed_str} "
                            f"(discrepancy: {discrepancy_str})."
                        ),
                        evidence=result.raw_text,
                        recommendation="Check and correct the reported values.",
                        claim_id=result.claim_id,
                    )
                )
            elif result.severity == "minor":
                findings.append(
                    ReviewFinding(
                        severity="minor",
                        category="consistency",
                        title=f"Minor rounding discrepancy in claim {result.claim_id}",
                        description=result.note,
                        evidence=result.raw_text,
                        claim_id=result.claim_id,
                    )
                )

        # --- Reporting quality findings ---
        if extraction_summary.total_claims > 0:
            # Check effect size reporting
            es_rate = extraction_summary.claims_with_effect_sizes / extraction_summary.total_claims
            if es_rate == 0:
                findings.append(
                    ReviewFinding(
                        severity="major",
                        category="reporting",
                        title="No effect sizes reported",
                        description=(
                            f"{extraction_summary.total_claims} statistical tests "
                            f"found but none include effect size measures."
                        ),
                        recommendation=(
                            "Report effect sizes (e.g., Cohen's d, η², R²) for "
                            "all statistical tests per APA 7th edition guidelines."
                        ),
                    )
                )
            elif es_rate < 0.5:
                findings.append(
                    ReviewFinding(
                        severity="moderate",
                        category="reporting",
                        title="Incomplete effect size reporting",
                        description=(
                            f"Only {extraction_summary.claims_with_effect_sizes} of "
                            f"{extraction_summary.total_claims} tests include effect sizes."
                        ),
                        recommendation="Report effect sizes for all statistical tests.",
                    )
                )
            else:
                positives.append(
                    ReviewFinding(
                        severity="positive",
                        category="reporting",
                        title="Effect sizes reported",
                        description=(
                            f"{extraction_summary.claims_with_effect_sizes} of "
                            f"{extraction_summary.total_claims} tests include "
                            f"effect size measures."
                        ),
                    )
                )

            # Check confidence interval reporting
            ci_rate = extraction_summary.claims_with_ci / extraction_summary.total_claims
            if ci_rate == 0:
                findings.append(
                    ReviewFinding(
                        severity="moderate",
                        category="reporting",
                        title="No confidence intervals reported",
                        description="Consider reporting confidence intervals for key estimates.",
                        recommendation=("Include 95% confidence intervals alongside point estimates."),
                    )
                )
            elif ci_rate >= 0.5:
                positives.append(
                    ReviewFinding(
                        severity="positive",
                        category="reporting",
                        title="Confidence intervals reported",
                        description=(
                            f"{extraction_summary.claims_with_ci} of "
                            f"{extraction_summary.total_claims} tests include CIs."
                        ),
                    )
                )

        else:
            findings.append(
                ReviewFinding(
                    severity="moderate",
                    category="reporting",
                    title="No statistical claims detected",
                    description=(
                        "Could not identify standard statistical reporting patterns "
                        "(e.g., t(df) = value, p = value). This may indicate "
                        "non-standard formatting or a non-quantitative paper."
                    ),
                    recommendation=(
                        "Use standard APA-format reporting: " "test_statistic(df) = value, p = value, effect_size."
                    ),
                )
            )

        # --- Section structure findings ---
        sections_found = set(parsed.metadata.sections_found)
        if "methods" not in sections_found:
            findings.append(
                ReviewFinding(
                    severity="moderate",
                    category="methodology",
                    title="Methods section not detected",
                    description=(
                        "Could not identify a clearly labeled Methods section. "
                        "This may affect the quality of the review."
                    ),
                    recommendation="Ensure the Methods section is clearly labeled.",
                )
            )
        if "results" not in sections_found:
            findings.append(
                ReviewFinding(
                    severity="moderate",
                    category="methodology",
                    title="Results section not detected",
                    description=("Could not identify a clearly labeled Results section."),
                    recommendation="Ensure the Results section is clearly labeled.",
                )
            )

        # --- SQS findings ---
        if sqs_report and SQS_AVAILABLE:
            sqs_dict = sqs_report.to_dict()
            for cat_key, cat_data in sqs_dict.get("category_scores", {}).items():
                pct = cat_data.get("percentage", 0)
                name = cat_data.get("name", cat_key)
                if pct < 40:
                    findings.append(
                        ReviewFinding(
                            severity="major",
                            category="sqs",
                            title=f"Poor {name} score ({pct:.0f}%)",
                            description=(
                                f"The manuscript scores {pct:.0f}% in the " f'"{name}" category of statistical quality.'
                            ),
                            recommendation=f"Improve {name.lower()} reporting.",
                        )
                    )
                elif pct >= 80:
                    positives.append(
                        ReviewFinding(
                            severity="positive",
                            category="sqs",
                            title=f"Strong {name} ({pct:.0f}%)",
                            description=(f'Excellent score in the "{name}" category.'),
                        )
                    )

        # --- Consistency positives ---
        if consistency_summary.consistent > 0 and consistency_summary.inconsistent == 0:
            positives.append(
                ReviewFinding(
                    severity="positive",
                    category="consistency",
                    title="All statistical values are internally consistent",
                    description=(
                        f"All {consistency_summary.consistent} checkable claims "
                        f"have consistent test statistics and p-values."
                    ),
                )
            )

        # --- Advanced validator findings (7 manuscript-level validators) ---
        if advanced_findings:
            for vf in advanced_findings:
                category = _VALIDATOR_CATEGORY.get(vf.validator, "methodology")
                rf = ReviewFinding(
                    severity=vf.severity,
                    category=category,
                    title=vf.title,
                    description=vf.description,
                    evidence=vf.evidence,
                    recommendation=vf.recommendation,
                )
                if vf.severity == "positive":
                    positives.append(rf)
                else:
                    findings.append(rf)

        # --- Discipline checklist results ---
        if checklist_results:
            for cr in checklist_results:
                if cr.found:
                    positives.append(
                        ReviewFinding(
                            severity="positive",
                            category="checklist",
                            title=f"Reports: {cr.item.name}",
                            description=cr.item.description,
                        )
                    )
                else:
                    findings.append(
                        ReviewFinding(
                            severity=cr.severity,
                            category="checklist",
                            title=f"Missing: {cr.item.name}",
                            description=cr.item.description,
                            recommendation=(f"Include information about: {cr.item.name}."),
                        )
                    )

        return findings, positives

    # -----------------------------------------------------------------
    # Assessment determination
    # -----------------------------------------------------------------

    def _determine_assessment(
        self,
        findings: List[ReviewFinding],
        consistency_summary: ValidationSummary,
        sqs_score: Optional[float],
    ) -> str:
        """
        Determine overall assessment from findings.

        Returns one of:
            'pass', 'minor_issues', 'major_issues', 'critical'
        """
        blocking_count = sum(1 for f in findings if f.severity == "blocking")
        major_count = sum(1 for f in findings if f.severity == "major")
        moderate_count = sum(1 for f in findings if f.severity == "moderate")

        # Critical: any blocking issues or gross errors
        if blocking_count > 0 or consistency_summary.gross_errors > 0:
            return "critical"

        # Major: multiple decision errors or many major findings
        if consistency_summary.decision_errors >= 2 or major_count >= 3:
            return "major_issues"

        # Major: single decision error or some major findings
        if consistency_summary.decision_errors >= 1 or major_count >= 1:
            return "major_issues"

        # Minor: some moderate findings or low SQS
        if moderate_count >= 2 or (sqs_score is not None and sqs_score < 50):
            return "minor_issues"

        return "pass"
