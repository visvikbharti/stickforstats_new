"""API endpoints for signed reproducibility receipts.

Flow:
  1. A client analyses a manuscript (POST /manuscript/analyze/) and gets
     back ``submission_id`` + ``report_token``.
  2. POST /receipt/issue/ with those → a signed receipt + a one-time
     download token.
  3. Anyone can GET /receipt/verify/<id>/ to check the receipt is genuine
     and unmodified (no token, no trust in us needed — the signature is
     RS256 and the public key is at /receipt/jwks/).
  4. The holder can GET /receipt/<id>/download/?token=… to fetch the
     self-contained signed artifact (body + signature + public key PEM).
"""

from __future__ import annotations

import logging

from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

try:
    from core.crypto import receipt_signing
    from core.models import ManuscriptSubmission, ReproducibilityReceipt
    from core.services import receipt_service, receipt_bundle

    RECEIPT_AVAILABLE = True
except Exception as exc:  # noqa: BLE001 - degrade gracefully if models/crypto missing
    logger.warning("Receipt subsystem unavailable: %s", exc)
    RECEIPT_AVAILABLE = False


def _unavailable():
    return Response(
        {"error": "Receipt subsystem not available"},
        status=status.HTTP_501_NOT_IMPLEMENTED,
    )


def _supplied_token(request, header="HTTP_X_RECEIPT_TOKEN"):
    body_token = request.data.get("token") if hasattr(request, "data") else None
    return body_token or request.query_params.get("token") or request.META.get(header, "")


class ReceiptIssueView(APIView):
    """POST /api/v1/receipt/issue/

    Body (JSON or form):
        - submission_id: UUID of a completed ManuscriptSubmission
        - token: the submission's report_token (proves the caller ran it)
        - minimal: optional bool — omit per-category SQS detail from the receipt

    Returns the receipt id + a one-time download token + URLs.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        if not RECEIPT_AVAILABLE:
            return _unavailable()

        submission_id = request.data.get("submission_id")
        if not submission_id:
            return Response({"error": "submission_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            submission = ManuscriptSubmission.objects.get(id=submission_id)
        except (ManuscriptSubmission.DoesNotExist, ValueError, Exception):
            # 404 (not 403) so we don't confirm the id exists. (IDOR, audit SEC-3)
            return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)

        # Proof of ownership: the submission's report token, if it has one.
        if submission.report_token_hash:
            supplied = _supplied_token(request, header="HTTP_X_REPORT_TOKEN")
            if not submission.verify_report_token(supplied):
                return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)

        minimal = str(request.data.get("minimal", "")).lower() in ("1", "true", "yes")
        user = request.user if getattr(request, "user", None) and request.user.is_authenticated else None

        try:
            receipt, raw_token = receipt_service.issue_manuscript_receipt(
                submission, user=user, minimal=minimal
            )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Receipt issuance failed")
            return Response(
                {"error": "Receipt issuance failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        rid = str(receipt.receipt_id)
        return Response(
            {
                "receipt_id": rid,
                "download_token": raw_token,  # returned ONCE; required to download
                "subject_hash": receipt.subject_hash,
                "sig_alg": receipt.sig_alg,
                "key_id": receipt.key_id,
                "issued_at": receipt.receipt_json.get("issued_at"),
                "verify_url": f"/api/v1/receipt/verify/{rid}/",
                "download_url": f"/api/v1/receipt/{rid}/download/?token={raw_token}",
                "jwks_url": "/api/v1/receipt/jwks/",
            },
            status=status.HTTP_201_CREATED,
        )


class ReceiptVerifyView(APIView):
    """GET /api/v1/receipt/verify/<receipt_id>/?token=…

    Public. Returns a structured verdict: whether the body still hashes to
    the signed value, whether the RS256 signature verifies, whether the
    optional token matches, and whether the receipt is revoked.
    """

    permission_classes = [AllowAny]

    def get(self, request, receipt_id):
        if not RECEIPT_AVAILABLE:
            return _unavailable()
        token = request.query_params.get("token")
        verdict = receipt_service.verify_receipt(receipt_id, token=token)
        return Response(verdict, status=status.HTTP_200_OK)


class ReceiptDownloadView(APIView):
    """GET /api/v1/receipt/<receipt_id>/download/?token=…&format=json

    Token-gated. Returns the self-contained signed artifact: the canonical
    body, the detached signature, and the public key PEM so a third party
    can verify it fully offline.
    """

    permission_classes = [AllowAny]

    def get(self, request, receipt_id):
        if not RECEIPT_AVAILABLE:
            return _unavailable()

        # NB: use 'fmt', NOT 'format' — 'format' is a reserved DRF content-
        # negotiation query param and ?format=zip would 404 before this view runs.
        fmt = (request.query_params.get("fmt") or "json").lower()
        if fmt not in ("json", "zip"):
            return Response(
                {"error": "Supported formats: json, zip (use ?fmt=zip)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            receipt = ReproducibilityReceipt.objects.get(receipt_id=receipt_id)
        except (ReproducibilityReceipt.DoesNotExist, ValueError, Exception):
            return Response({"error": "Receipt not found"}, status=status.HTTP_404_NOT_FOUND)

        if not receipt.verify_token(_supplied_token(request)):
            return Response({"error": "Receipt not found"}, status=status.HTTP_404_NOT_FOUND)

        rid = str(receipt.receipt_id)

        try:
            if fmt == "zip":
                # A self-contained, offline-verifiable bundle (signed receipt +
                # public key + a stdlib verify_receipt.py + README).
                data = receipt_bundle.build_zip(receipt)
                response = HttpResponse(data, content_type="application/zip")
                response["Content-Disposition"] = f'attachment; filename="receipt-{rid}.zip"'
                return response

            artifact = receipt_bundle.build_artifact(receipt)
        except receipt_bundle.SigningKeyMismatch as exc:
            # Hand back an honest error rather than a bundle that would fail its
            # own verify instructions and read as a forgery.
            logger.error("Receipt %s cannot be bundled: %s", rid, exc)
            return Response(
                {
                    "error": "Receipt cannot be exported: its signing key is not available.",
                    "detail": str(exc),
                    "receipt_id": rid,
                },
                status=status.HTTP_409_CONFLICT,
            )

        response = Response(artifact, status=status.HTTP_200_OK)
        response["Content-Disposition"] = f'attachment; filename="receipt-{rid}.json"'
        return response


class ReceiptJWKSView(APIView):
    """GET /api/v1/receipt/jwks/ — every receipt public key in the ring (JWKS).

    Publishes the active signing key AND any retired verify-only keys, so a third
    party can verify a receipt signed under a since-rotated key by matching its
    ``kid``. The active key is listed first.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        if not RECEIPT_AVAILABLE:
            return _unavailable()
        return Response(receipt_signing.get_public_jwks(), status=status.HTTP_200_OK)
