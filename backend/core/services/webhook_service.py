"""
Webhook Delivery Service — Journal Integration (Pillar 2)
=========================================================

Delivers review report notifications to journals via webhook callbacks.
Uses HMAC-SHA256 signatures for payload verification.

Features:
- Signed payloads (HMAC-SHA256) for authenticity verification
- Retry with exponential backoff (3 attempts: 1s, 4s, 16s)
- Delivery tracking on ReviewReport model
- Graceful fallback: urllib if requests is unavailable

Created: February 2026
"""

import hashlib
import hmac
import json
import logging
import time
import uuid
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

from django.utils import timezone

logger = logging.getLogger(__name__)

# Try to use requests for nicer HTTP handling; fall back to urllib
try:
    import requests as _requests_lib

    HAS_REQUESTS = True
except ImportError:
    _requests_lib = None
    HAS_REQUESTS = False

# Retry configuration
MAX_RETRIES = 3
BACKOFF_BASE = 1  # seconds
BACKOFF_EXPONENT = 2  # backoff = base * (exponent ^ attempt) → 1s, 4s, 16s
DELIVERY_TIMEOUT = 30  # seconds per attempt


class WebhookDeliveryService:
    """
    Delivers completed review report notifications to journal webhook endpoints.

    Usage:
        from core.services.webhook_service import WebhookDeliveryService
        WebhookDeliveryService.deliver_report(journal, submission, report)
    """

    @staticmethod
    def deliver_report(journal, submission, report):
        """
        Send a report completion notification to a journal's webhook URL.

        Signs the payload with the journal's webhook_secret using HMAC-SHA256,
        POSTs it to journal.webhook_url, and retries up to 3 times with
        exponential backoff on failure.

        Args:
            journal: Journal model instance (must have webhook_url set).
            submission: ManuscriptSubmission model instance.
            report: ReviewReport model instance.

        Returns:
            bool: True if delivery succeeded, False otherwise.
        """
        if not journal.webhook_url:
            logger.debug(
                "Journal %s has no webhook_url configured; skipping delivery.",
                journal.name,
            )
            return False

        payload = WebhookDeliveryService.build_payload(submission, report)
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")

        # Sign the payload
        secret = journal.webhook_secret or ""
        signature = WebhookDeliveryService.sign_payload(payload_bytes, secret)

        headers = {
            "Content-Type": "application/json",
            "X-StickForStats-Signature": signature,
            "X-StickForStats-Event": "report.completed",
            "X-StickForStats-Delivery": str(uuid.uuid4()),
        }

        last_error = None
        for attempt in range(MAX_RETRIES):
            if attempt > 0:
                backoff = BACKOFF_BASE * (BACKOFF_EXPONENT ** (attempt * 2 - 1))
                logger.info(
                    "Webhook retry %d/%d for journal %s in %.1fs",
                    attempt + 1,
                    MAX_RETRIES,
                    journal.name,
                    backoff,
                )
                time.sleep(backoff)

            success, error = WebhookDeliveryService._post(
                url=journal.webhook_url,
                payload_bytes=payload_bytes,
                headers=headers,
            )

            if success:
                # Mark report as delivered
                report.delivered = True
                report.delivered_at = timezone.now()
                report.delivery_method = "webhook"
                report.save(
                    update_fields=[
                        "delivered",
                        "delivered_at",
                        "delivery_method",
                    ]
                )
                logger.info(
                    "Webhook delivered for report %s to journal %s",
                    report.id,
                    journal.name,
                )
                return True

            last_error = error
            logger.warning(
                "Webhook attempt %d/%d failed for journal %s: %s",
                attempt + 1,
                MAX_RETRIES,
                journal.name,
                error,
            )

        logger.error(
            "Webhook delivery failed after %d attempts for journal %s: %s",
            MAX_RETRIES,
            journal.name,
            last_error,
        )
        return False

    @staticmethod
    def build_payload(submission, report):
        """
        Build the webhook notification payload.

        Args:
            submission: ManuscriptSubmission model instance.
            report: ReviewReport model instance.

        Returns:
            dict: Structured payload for the webhook POST body.
        """
        # Build a summary of top findings (max 10)
        findings_summary = []
        findings_list = report.findings if isinstance(report.findings, list) else []
        for finding in findings_list[:10]:
            if isinstance(finding, dict):
                findings_summary.append(
                    {
                        "severity": finding.get("severity", ""),
                        "category": finding.get("category", ""),
                        "title": finding.get("title", ""),
                    }
                )

        return {
            "event_type": "report.completed",
            "timestamp": timezone.now().isoformat(),
            "submission_id": str(submission.id),
            "manuscript_id": submission.manuscript_id or "",
            "title": submission.title or "",
            "report_id": str(report.id),
            "report_type": report.report_type,
            "overall_assessment": report.overall_assessment,
            "sqs_score": float(report.sqs_score) if report.sqs_score is not None else None,
            "claims_found": submission.claims_found,
            "consistency_rate": (
                float(submission.consistency_rate) if submission.consistency_rate is not None else None
            ),
            "decision_errors": submission.decision_errors,
            "gross_errors": submission.gross_errors,
            "findings_count": len(findings_list),
            "findings_summary": findings_summary,
            "report_url": f"/api/v1/manuscript/report/{submission.id}/",
        }

    @staticmethod
    def sign_payload(payload_bytes, secret):
        """
        Compute HMAC-SHA256 signature for webhook payload verification.

        Args:
            payload_bytes (bytes): JSON-encoded payload.
            secret (str): The journal's webhook secret.

        Returns:
            str: Hex-encoded HMAC-SHA256 signature prefixed with 'sha256='.
        """
        key = secret.encode("utf-8") if isinstance(secret, str) else secret
        digest = hmac.new(key, payload_bytes, hashlib.sha256).hexdigest()
        return f"sha256={digest}"

    @staticmethod
    def verify_signature(payload_bytes, signature, secret):
        """
        Verify an incoming webhook signature for authenticity.

        Journals (or any receiver) can use this logic to verify that a
        webhook payload was genuinely sent by StickForStats.

        Args:
            payload_bytes (bytes): Raw request body.
            signature (str): Value of X-StickForStats-Signature header.
            secret (str): Shared webhook secret.

        Returns:
            bool: True if the signature is valid.
        """
        expected = WebhookDeliveryService.sign_payload(payload_bytes, secret)
        return hmac.compare_digest(expected, signature)

    @staticmethod
    def _post(url, payload_bytes, headers):
        """
        POST payload to URL. Uses requests if available, otherwise urllib.

        Args:
            url (str): Target webhook URL.
            payload_bytes (bytes): Encoded JSON body.
            headers (dict): HTTP headers including signature.

        Returns:
            tuple: (success: bool, error: str or None)
        """
        if HAS_REQUESTS:
            return WebhookDeliveryService._post_requests(
                url,
                payload_bytes,
                headers,
            )
        return WebhookDeliveryService._post_urllib(
            url,
            payload_bytes,
            headers,
        )

    @staticmethod
    def _post_requests(url, payload_bytes, headers):
        """POST using the requests library."""
        try:
            resp = _requests_lib.post(
                url,
                data=payload_bytes,
                headers=headers,
                timeout=DELIVERY_TIMEOUT,
            )
            if 200 <= resp.status_code < 300:
                return True, None
            return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
        except _requests_lib.RequestException as exc:
            return False, str(exc)

    @staticmethod
    def _post_urllib(url, payload_bytes, headers):
        """POST using stdlib urllib as fallback."""
        try:
            req = Request(
                url,
                data=payload_bytes,
                headers=headers,
                method="POST",
            )
            with urlopen(req, timeout=DELIVERY_TIMEOUT) as resp:
                if 200 <= resp.status < 300:
                    return True, None
                return False, f"HTTP {resp.status}"
        except HTTPError as exc:
            return False, f"HTTP {exc.code}: {exc.reason}"
        except URLError as exc:
            return False, str(exc.reason)
        except Exception as exc:
            return False, str(exc)
