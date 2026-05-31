"""
Manuscript Review API Views — Journal Integration (Pillar 2)
=============================================================

REST API endpoints for the automated manuscript statistical quality review
pipeline. Supports PDF, LaTeX, and DOCX uploads.

Endpoints:
- POST /api/v1/manuscript/analyze/     — Full manuscript review
- POST /api/v1/manuscript/parse/       — Parse manuscript only
- POST /api/v1/manuscript/claims/      — Extract statistical claims
- POST /api/v1/manuscript/consistency/ — Validate claim consistency
- POST /api/v1/manuscript/report/{id}/ — Retrieve a stored report
- POST /api/v1/manuscript/journal/submit/ — Journal submission endpoint

Created: February 2026
"""

import hashlib
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from core.manuscript.parser import ManuscriptParser
from core.manuscript.claim_extractor import StatisticalClaimExtractor
from core.manuscript.consistency_validator import ConsistencyValidator
from core.manuscript.manuscript_guardian import ManuscriptGuardian

try:
    from core.models import ManuscriptSubmission, ReviewReport

    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False

logger = logging.getLogger(__name__)


def _get_file_and_type(request):
    """Extract uploaded file and determine type from request."""
    if "file" not in request.FILES:
        return None, None, "No file uploaded. Send a PDF, LaTeX, or DOCX file."

    uploaded = request.FILES["file"]
    name = uploaded.name.lower()

    if name.endswith(".pdf"):
        file_type = "pdf"
    elif name.endswith((".tex", ".latex")):
        file_type = "latex"
    elif name.endswith(".docx"):
        file_type = "docx"
    elif name.endswith(".txt"):
        file_type = "latex"
    else:
        return None, None, (f"Unsupported file type: {name}. " "Accepted: .pdf, .tex, .docx, .txt")

    return uploaded, file_type, None


class ManuscriptAnalyzeView(APIView):
    """
    POST /api/v1/manuscript/analyze/

    Full manuscript review pipeline: parse → extract claims → validate
    consistency → SQS scoring → generate findings.

    Body (multipart/form-data):
        - file: PDF, LaTeX, or DOCX manuscript
        - field: Research field (optional, default 'general')
        - alpha: Significance level (optional, default 0.05)

    Returns: Complete ManuscriptReviewReport as JSON.
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded, file_type, error = _get_file_and_type(request)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        field = request.data.get("field", "general")
        alpha = float(request.data.get("alpha", 0.05))

        try:
            guardian = ManuscriptGuardian(
                field=field,
                alpha=alpha,
            )
            report = guardian.review(uploaded, file_type=file_type)

            # Store in database if models available
            submission_id = None
            if MODELS_AVAILABLE:
                try:
                    uploaded.seek(0)
                    file_hash = hashlib.sha256(uploaded.read()).hexdigest()
                    uploaded.seek(0)

                    submission = ManuscriptSubmission.objects.create(
                        title=report.title,
                        authors=report.authors,
                        file_name=uploaded.name,
                        file_type=file_type,
                        file_size_bytes=uploaded.size,
                        file_hash=file_hash,
                        word_count=report.word_count,
                        status="completed",
                        sqs_score=report.sqs_score,
                        sqs_grade=report.sqs_grade or "",
                        claims_found=report.claims_found,
                        claims_consistent=report.claims_consistent,
                        claims_inconsistent=report.claims_inconsistent,
                        consistency_rate=report.consistency_rate,
                        decision_errors=report.decision_errors,
                        gross_errors=report.gross_errors,
                        claim_data=report.extraction_summary.__dict__
                        if hasattr(report.extraction_summary, "__dict__")
                        else {},
                        consistency_data={
                            "consistent": report.claims_consistent,
                            "inconsistent": report.claims_inconsistent,
                            "decision_errors": report.decision_errors,
                            "rate": report.consistency_rate,
                        },
                        processing_time_ms=report.processing_time_ms,
                    )
                    report_token = submission.set_report_token()
                    submission.save(update_fields=["report_token_hash"])
                    submission_id = str(submission.id)
                except Exception as exc:
                    logger.warning("Failed to store submission: %s", exc)

            result = report.to_dict()
            if submission_id:
                result["submission_id"] = submission_id
                # Raw share token is returned exactly once; required to fetch the report.
                result["report_token"] = report_token
                result["report_url"] = f"/api/v1/manuscript/report/{submission_id}/?token={report_token}"

            return Response(result, status=status.HTTP_200_OK)

        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Manuscript analysis failed")
            return Response(
                {"error": f"Analysis failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ManuscriptParseView(APIView):
    """
    POST /api/v1/manuscript/parse/

    Parse manuscript into structured sections without full analysis.

    Body (multipart/form-data):
        - file: PDF, LaTeX, or DOCX manuscript

    Returns: Parsed sections, metadata, and parse quality.
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded, file_type, error = _get_file_and_type(request)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parser = ManuscriptParser()
            result = parser.parse(uploaded, file_type=file_type)

            return Response(
                {
                    "metadata": {
                        "title": result.metadata.title,
                        "authors": result.metadata.authors,
                        "abstract": result.metadata.abstract,
                        "keywords": result.metadata.keywords,
                        "word_count": result.metadata.word_count,
                        "page_count": result.metadata.page_count,
                        "sections_found": result.metadata.sections_found,
                        "statistical_tests_mentioned": result.metadata.statistical_tests_mentioned,
                        "journal_format": result.metadata.journal_format,
                    },
                    "sections": [
                        {
                            "section_type": s.section_type,
                            "title": s.title,
                            "content_length": len(s.content),
                            "content_preview": s.content[:500],
                            "tables_count": len(s.tables),
                            "figures_mentioned": s.figures_mentioned,
                        }
                        for s in result.sections
                    ],
                    "parse_quality": result.parse_quality,
                    "methods_text_length": len(result.methods_text),
                    "results_text_length": len(result.results_text),
                    "warnings": result.warnings,
                },
                status=status.HTTP_200_OK,
            )

        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Manuscript parsing failed")
            return Response(
                {"error": f"Parse failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ClaimExtractionView(APIView):
    """
    POST /api/v1/manuscript/claims/

    Extract statistical claims from a manuscript.

    Body (multipart/form-data):
        - file: PDF, LaTeX, or DOCX manuscript

    Returns: List of extracted claims with extraction summary.
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded, file_type, error = _get_file_and_type(request)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parser = ManuscriptParser()
            parsed = parser.parse(uploaded, file_type=file_type)

            extractor = StatisticalClaimExtractor()
            claims = extractor.extract_from_sections(parsed.sections)
            summary = extractor.summarize(claims)

            return Response(
                {
                    "claims": [
                        {
                            "claim_id": c.claim_id,
                            "claim_type": c.claim_type,
                            "test_name": c.test_name,
                            "statistic_value": c.statistic_value,
                            "p_value": c.p_value,
                            "p_comparison": c.p_comparison,
                            "df": c.df,
                            "confidence_interval": c.confidence_interval,
                            "effect_size_type": c.effect_size_type,
                            "effect_size_value": c.effect_size_value,
                            "sample_size": c.sample_size,
                            "location": c.location,
                            "raw_text": c.raw_text,
                            "confidence": c.confidence,
                        }
                        for c in claims
                    ],
                    "summary": {
                        "total_claims": summary.total_claims,
                        "claims_by_type": summary.claims_by_type,
                        "claims_with_p_values": summary.claims_with_p_values,
                        "claims_with_effect_sizes": summary.claims_with_effect_sizes,
                        "claims_with_ci": summary.claims_with_ci,
                        "claims_with_df": summary.claims_with_df,
                        "unique_test_types": summary.unique_test_types,
                        "extraction_warnings": summary.extraction_warnings,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as exc:
            logger.exception("Claim extraction failed")
            return Response(
                {"error": f"Extraction failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConsistencyCheckView(APIView):
    """
    POST /api/v1/manuscript/consistency/

    Extract claims and validate their statistical consistency.

    Body (multipart/form-data):
        - file: PDF, LaTeX, or DOCX manuscript
        - alpha: Significance level (optional, default 0.05)

    Returns: Consistency validation results.
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded, file_type, error = _get_file_and_type(request)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        alpha = float(request.data.get("alpha", 0.05))

        try:
            parser = ManuscriptParser()
            parsed = parser.parse(uploaded, file_type=file_type)

            extractor = StatisticalClaimExtractor()
            claims = extractor.extract_from_sections(parsed.sections)

            # Filter to checkable claims
            checkable = [c for c in claims if c.claim_type and c.statistic_value is not None and c.p_value is not None]

            validator = ConsistencyValidator(alpha=alpha)
            summary = validator.validate(checkable)

            return Response(
                {
                    "total_claims_extracted": len(claims),
                    "checkable_claims": len(checkable),
                    "results": [
                        {
                            "claim_id": r.claim_id,
                            "claim_type": r.claim_type,
                            "reported_statistic": r.reported_statistic,
                            "reported_p": r.reported_p,
                            "reported_p_comparison": r.reported_p_comparison,
                            "computed_p": r.computed_p,
                            "is_consistent": r.is_consistent,
                            "is_decision_consistent": r.is_decision_consistent,
                            "discrepancy": r.discrepancy,
                            "severity": r.severity,
                            "decision_at_05": r.decision_at_05,
                            "reported_decision_at_05": r.reported_decision_at_05,
                            "raw_text": r.raw_text,
                            "note": r.note,
                        }
                        for r in summary.results
                    ],
                    "summary": {
                        "total_checked": summary.total_checked,
                        "consistent": summary.consistent,
                        "inconsistent": summary.inconsistent,
                        "decision_errors": summary.decision_errors,
                        "gross_errors": summary.gross_errors,
                        "could_not_check": summary.could_not_check,
                        "overall_consistency_rate": summary.overall_consistency_rate,
                        "severity_counts": summary.severity_counts,
                    },
                    "warnings": summary.warnings,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as exc:
            logger.exception("Consistency check failed")
            return Response(
                {"error": f"Consistency check failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SubmissionReportView(APIView):
    """
    GET /api/v1/manuscript/report/<submission_id>/

    Retrieve a previously generated review report.

    URL params:
        - submission_id: UUID of the ManuscriptSubmission

    Query params:
        - tier: 'editor', 'reviewer', or 'author' (default 'reviewer')
    """

    permission_classes = [AllowAny]

    def get(self, request, submission_id):
        if not MODELS_AVAILABLE:
            return Response(
                {"error": "Database models not available"},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        try:
            submission = ManuscriptSubmission.objects.get(id=submission_id)
        except ManuscriptSubmission.DoesNotExist:
            return Response(
                {"error": "Submission not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "submission_id": str(submission.id),
                "title": submission.title,
                "status": submission.status,
                "file_name": submission.file_name,
                "sqs_score": float(submission.sqs_score) if submission.sqs_score else None,
                "sqs_grade": submission.sqs_grade,
                "claims_found": submission.claims_found,
                "claims_consistent": submission.claims_consistent,
                "claims_inconsistent": submission.claims_inconsistent,
                "consistency_rate": float(submission.consistency_rate) if submission.consistency_rate else None,
                "decision_errors": submission.decision_errors,
                "gross_errors": submission.gross_errors,
                "claim_data": submission.claim_data,
                "consistency_data": submission.consistency_data,
                "sqs_data": submission.sqs_data,
                "processing_time_ms": submission.processing_time_ms,
                "submitted_at": submission.submitted_at.isoformat(),
                "completed_at": submission.completed_at.isoformat() if submission.completed_at else None,
                "warnings": submission.warnings,
            },
            status=status.HTTP_200_OK,
        )


class JournalSubmitView(APIView):
    """
    POST /api/v1/manuscript/journal/submit/

    Journal-authenticated manuscript submission endpoint.
    Journals submit manuscripts for automated review using their API key.

    Headers:
        - X-API-Key: Journal API key

    Body (multipart/form-data):
        - file: PDF, LaTeX, or DOCX manuscript
        - manuscript_id: Journal's internal manuscript ID (optional)
        - title: Manuscript title (optional)
        - authors: JSON array of author names (optional)

    Returns: Submission ID and preliminary results.
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not MODELS_AVAILABLE:
            return Response(
                {"error": "Database models not available"},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        # Authenticate via API key
        api_key = request.META.get("HTTP_X_API_KEY", "")
        journal = self._authenticate_journal(api_key)
        if journal is None:
            return Response(
                {"error": "Invalid or missing API key"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        uploaded, file_type, error = _get_file_and_type(request)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        manuscript_id = request.data.get("manuscript_id", "")
        title = request.data.get("title", "")

        try:
            # Create submission record
            uploaded.seek(0)
            file_hash = hashlib.sha256(uploaded.read()).hexdigest()
            uploaded.seek(0)

            submission = ManuscriptSubmission.objects.create(
                journal=journal,
                manuscript_id=manuscript_id,
                title=title,
                file_name=uploaded.name,
                file_type=file_type,
                file_size_bytes=uploaded.size,
                file_hash=file_hash,
                status="analyzing",
            )

            # Run analysis
            guardian = ManuscriptGuardian(field=journal.field)
            report = guardian.review(uploaded, file_type=file_type)

            # Update submission with results
            from django.utils import timezone

            submission.title = report.title or title
            submission.authors = report.authors
            submission.word_count = report.word_count
            submission.status = "completed"
            submission.sqs_score = report.sqs_score
            submission.sqs_grade = report.sqs_grade or ""
            submission.claims_found = report.claims_found
            submission.claims_consistent = report.claims_consistent
            submission.claims_inconsistent = report.claims_inconsistent
            submission.consistency_rate = report.consistency_rate
            submission.decision_errors = report.decision_errors
            submission.gross_errors = report.gross_errors
            submission.processing_time_ms = report.processing_time_ms
            submission.completed_at = timezone.now()
            report_token = submission.set_report_token()
            submission.save()

            # Trigger webhook delivery if journal has a webhook URL configured
            webhook_delivered = False
            if journal.webhook_url:
                try:
                    # Create a ReviewReport record for webhook delivery
                    review_report = ReviewReport.objects.create(
                        submission=submission,
                        report_type="editor",
                        summary=f"Automated statistical review of {submission.title or submission.file_name}",
                        overall_assessment=report.overall_assessment or "minor_issues",
                        findings=report.findings if hasattr(report, "findings") else [],
                        positive_findings=report.positive_findings if hasattr(report, "positive_findings") else [],
                        sqs_score=report.sqs_score,
                        consistency_score=report.consistency_rate,
                    )

                    from core.services.webhook_service import WebhookDeliveryService

                    webhook_delivered = WebhookDeliveryService.deliver_report(
                        journal,
                        submission,
                        review_report,
                    )
                except Exception as webhook_exc:
                    logger.warning(
                        "Webhook delivery failed for submission %s: %s",
                        submission.id,
                        webhook_exc,
                    )

            return Response(
                {
                    "submission_id": str(submission.id),
                    "status": "completed",
                    "overall_assessment": report.overall_assessment,
                    "sqs_score": report.sqs_score,
                    "sqs_grade": report.sqs_grade,
                    "claims_found": report.claims_found,
                    "consistency_rate": report.consistency_rate,
                    "decision_errors": report.decision_errors,
                    "gross_errors": report.gross_errors,
                    "findings_count": len(report.findings),
                    "processing_time_ms": report.processing_time_ms,
                    "report_url": f"/api/v1/manuscript/report/{submission.id}/",
                    "webhook_delivered": webhook_delivered,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as exc:
            logger.exception("Journal submission failed")
            if "submission" in locals():
                submission.status = "failed"
                submission.error_message = str(exc)
                submission.save()
            return Response(
                {"error": f"Submission failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _authenticate_journal(self, raw_key: str):
        """Authenticate a journal via API key."""
        if not raw_key:
            return None

        try:
            from core.models import JournalAPIKey

            prefix = raw_key[:8]
            candidates = JournalAPIKey.objects.filter(
                key_prefix=prefix,
                is_active=True,
            ).select_related("journal")

            for key_obj in candidates:
                if key_obj.verify_key(raw_key):
                    if key_obj.journal.is_active:
                        # Update last used timestamp
                        from django.utils import timezone

                        key_obj.last_used_at = timezone.now()
                        key_obj.save(update_fields=["last_used_at"])
                        return key_obj.journal
            return None
        except Exception:
            return None
