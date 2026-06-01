"""
Batch Manuscript Submission Views — Journal Integration (Pillar 2)
==================================================================

REST API endpoints for batch manuscript analysis. Allows journals and
researchers to submit multiple manuscripts (up to 10) in a single request
and track progress via a shared batch ID.

Endpoints:
- POST /api/v1/manuscript/batch-submit/           — Submit batch of files
- GET  /api/v1/manuscript/batch-status/<batch_id>/ — Check batch progress

Created: February 2026
"""

import hashlib
import logging
import secrets
import time
import uuid

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from core.manuscript.manuscript_guardian import ManuscriptGuardian

try:
    from core.models import ManuscriptSubmission

    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Limits
MAX_BATCH_SIZE = 10
ALLOWED_EXTENSIONS = (".pdf", ".tex", ".latex", ".docx", ".txt")


def _detect_file_type(name):
    """Determine file type from filename extension."""
    name_lower = name.lower()
    if name_lower.endswith(".pdf"):
        return "pdf"
    elif name_lower.endswith((".tex", ".latex")):
        return "latex"
    elif name_lower.endswith(".docx"):
        return "docx"
    elif name_lower.endswith(".txt"):
        return "auto"
    return None


class BatchSubmitView(APIView):
    """
    POST /api/v1/manuscript/batch-submit/

    Submit multiple manuscripts (up to 10) for automated statistical review.
    Files are sent as multipart form fields named file_0, file_1, ..., file_9.

    Headers (optional):
        - X-API-Key: Journal API key for authenticated batch submission

    Body (multipart/form-data):
        - file_0 through file_9: PDF, LaTeX, DOCX, or TXT manuscripts
        - field: Research field for discipline-aware scoring (optional, default 'general')
        - alpha: Significance level (optional, default 0.05)

    Returns:
        - batch_id: UUID for tracking all submissions in this batch
        - submissions: List of {submission_id, file_name, status}
        - total: Number of files accepted
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not MODELS_AVAILABLE:
            return Response(
                {"error": "Database models not available"},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        # Optional journal authentication
        journal = self._authenticate_journal(request)

        # Collect uploaded files (file_0 through file_9)
        files = []
        for i in range(MAX_BATCH_SIZE):
            key = f"file_{i}"
            if key in request.FILES:
                files.append(request.FILES[key])

        if not files:
            return Response(
                {
                    "error": (
                        "No files uploaded. Send files as file_0, file_1, ..., "
                        f"file_{MAX_BATCH_SIZE - 1} (max {MAX_BATCH_SIZE})."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(files) > MAX_BATCH_SIZE:
            return Response(
                {"error": f"Maximum {MAX_BATCH_SIZE} files per batch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        field = request.data.get("field", "general")
        alpha = float(request.data.get("alpha", 0.05))
        batch_id = str(uuid.uuid4())

        # One share token guards the whole batch: its hash is stored on every
        # submission in the batch, so the same raw token retrieves the batch
        # status and each individual report (audit 2026-05-31, SEC-3 / IDOR).
        # The raw token is returned once in the response below.
        batch_token = secrets.token_urlsafe(32)
        batch_token_hash = ManuscriptSubmission.hash_report_token(batch_token)

        submissions = []
        errors = []

        max_bytes = getattr(settings, "MAX_FILE_UPLOAD_BYTES", 25 * 1024 * 1024)

        for idx, uploaded in enumerate(files):
            file_type = _detect_file_type(uploaded.name)
            if file_type is None:
                errors.append(
                    {
                        "file_index": idx,
                        "file_name": uploaded.name,
                        "error": (f"Unsupported file type: {uploaded.name}. " "Accepted: .pdf, .tex, .docx, .txt"),
                    }
                )
                continue

            # Enforce the per-file upload size cap (DoS protection — beta §3).
            if (getattr(uploaded, "size", 0) or 0) > max_bytes:
                errors.append(
                    {
                        "file_index": idx,
                        "file_name": uploaded.name,
                        "error": (
                            f"File too large ({uploaded.size / (1024 * 1024):.1f} MB). "
                            f"Maximum allowed is {max_bytes / (1024 * 1024):.0f} MB."
                        ),
                    }
                )
                continue

            try:
                # Compute file hash
                uploaded.seek(0)
                file_hash = hashlib.sha256(uploaded.read()).hexdigest()
                uploaded.seek(0)

                # Create submission record
                submission = ManuscriptSubmission.objects.create(
                    journal=journal,
                    file_name=uploaded.name,
                    file_type=file_type,
                    file_size_bytes=uploaded.size,
                    file_hash=file_hash,
                    status="analyzing",
                    report_token_hash=batch_token_hash,
                    parse_result={
                        "batch_id": batch_id,
                        "batch_index": idx,
                        "batch_total": len(files),
                    },
                )

                # Run analysis
                start_time = time.time()
                use_field = journal.field if journal else field
                guardian = ManuscriptGuardian(field=use_field, alpha=alpha)
                report = guardian.review(uploaded, file_type=file_type)
                elapsed_ms = int((time.time() - start_time) * 1000)

                # Update submission with results
                from django.utils import timezone

                submission.title = report.title or ""
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
                submission.processing_time_ms = elapsed_ms
                submission.completed_at = timezone.now()
                submission.claim_data = (
                    report.extraction_summary.__dict__ if hasattr(report.extraction_summary, "__dict__") else {}
                )
                submission.consistency_data = {
                    "consistent": report.claims_consistent,
                    "inconsistent": report.claims_inconsistent,
                    "decision_errors": report.decision_errors,
                    "rate": report.consistency_rate,
                }
                submission.save()

                submissions.append(
                    {
                        "submission_id": str(submission.id),
                        "file_name": uploaded.name,
                        "file_index": idx,
                        "status": "completed",
                        "sqs_score": report.sqs_score,
                        "sqs_grade": report.sqs_grade,
                        "claims_found": report.claims_found,
                        "consistency_rate": report.consistency_rate,
                        "processing_time_ms": elapsed_ms,
                        "report_url": f"/api/v1/manuscript/report/{submission.id}/?token={batch_token}",
                    }
                )

            except Exception as exc:
                logger.exception(
                    "Batch submission failed for file %d (%s)",
                    idx,
                    uploaded.name,
                )
                # Mark failed if submission was already created
                if "submission" in locals() and submission.status == "analyzing":
                    submission.status = "failed"
                    submission.error_message = str(exc)
                    submission.save()

                errors.append(
                    {
                        "file_index": idx,
                        "file_name": uploaded.name,
                        "error": str(exc),
                        "submission_id": (str(submission.id) if "submission" in locals() else None),
                    }
                )

        return Response(
            {
                "batch_id": batch_id,
                "batch_token": batch_token,
                "status_url": f"/api/v1/manuscript/batch-status/{batch_id}/?token={batch_token}",
                "total_submitted": len(files),
                "completed": len(submissions),
                "failed": len(errors),
                "submissions": submissions,
                "errors": errors,
            },
            status=status.HTTP_201_CREATED,
        )

    def _authenticate_journal(self, request):
        """
        Optionally authenticate a journal via API key.
        Returns Journal instance or None.
        """
        api_key = request.META.get("HTTP_X_API_KEY", "")
        if not api_key:
            return None

        try:
            from core.models import JournalAPIKey

            prefix = api_key[:8]
            candidates = JournalAPIKey.objects.filter(
                key_prefix=prefix,
                is_active=True,
            ).select_related("journal")

            for key_obj in candidates:
                if key_obj.verify_key(api_key):
                    if key_obj.journal.is_active and key_obj.can_batch_submit:
                        from django.utils import timezone

                        key_obj.last_used_at = timezone.now()
                        key_obj.save(update_fields=["last_used_at"])
                        return key_obj.journal
            return None
        except Exception:
            return None


class BatchStatusView(APIView):
    """
    GET /api/v1/manuscript/batch-status/<batch_id>/

    Returns the status of all submissions in a batch.

    URL params:
        - batch_id: UUID returned from batch-submit

    Returns:
        - batch_id: The batch identifier
        - total: Total submissions in batch
        - completed / analyzing / failed counts
        - submissions: List of submission details with current status
    """

    permission_classes = [AllowAny]

    def get(self, request, batch_id):
        if not MODELS_AVAILABLE:
            return Response(
                {"error": "Database models not available"},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        # Find all submissions belonging to this batch
        # batch_id is stored in parse_result.batch_id
        all_submissions = ManuscriptSubmission.objects.filter(
            parse_result__batch_id=batch_id,
        ).order_by("parse_result__batch_index")

        if not all_submissions.exists():
            return Response(
                {"error": f"No submissions found for batch {batch_id}"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Batch share-token check (IDOR protection): every submission in a batch
        # shares one token hash. If the batch is tokened, the caller must present
        # the matching raw token (?token= or X-Report-Token); a mismatch is 404
        # so the endpoint does not confirm the batch exists. Legacy batches with
        # no token hash remain readable for backward compatibility.
        first = all_submissions.first()
        supplied = request.query_params.get("token") or request.META.get("HTTP_X_REPORT_TOKEN", "")
        if first.report_token_hash:
            if not first.verify_report_token(supplied):
                return Response(
                    {"error": f"No submissions found for batch {batch_id}"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        token_qs = f"?token={supplied}" if supplied else ""

        submissions_data = []
        status_counts = {
            "pending": 0,
            "parsing": 0,
            "analyzing": 0,
            "completed": 0,
            "failed": 0,
        }

        for sub in all_submissions:
            status_counts[sub.status] = status_counts.get(sub.status, 0) + 1
            submissions_data.append(
                {
                    "submission_id": str(sub.id),
                    "file_name": sub.file_name,
                    "batch_index": sub.parse_result.get("batch_index"),
                    "status": sub.status,
                    "title": sub.title,
                    "sqs_score": float(sub.sqs_score) if sub.sqs_score is not None else None,
                    "sqs_grade": sub.sqs_grade,
                    "claims_found": sub.claims_found,
                    "consistency_rate": (float(sub.consistency_rate) if sub.consistency_rate is not None else None),
                    "decision_errors": sub.decision_errors,
                    "processing_time_ms": sub.processing_time_ms,
                    "error_message": sub.error_message or None,
                    "submitted_at": sub.submitted_at.isoformat(),
                    "completed_at": (sub.completed_at.isoformat() if sub.completed_at else None),
                    "report_url": (f"/api/v1/manuscript/report/{sub.id}/{token_qs}" if sub.status == "completed" else None),
                }
            )

        total = all_submissions.count()
        all_done = status_counts["completed"] + status_counts["failed"] == total

        return Response(
            {
                "batch_id": batch_id,
                "total": total,
                "batch_status": "completed" if all_done else "in_progress",
                "status_counts": status_counts,
                "submissions": submissions_data,
            },
            status=status.HTTP_200_OK,
        )
