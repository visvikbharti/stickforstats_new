"""Issue and verify signed reproducibility receipts.

A receipt binds an artifact's hash to the StickForStats verdict about it,
stamps it with a server-issued time + code versions, and RS256-signs a
canonical serialization so a third party can verify it independently.

v1 supports MANUSCRIPT-verification receipts (``issue_manuscript_receipt``).
The analysis-run receipt will reuse ``verify_receipt`` and the model
unchanged — only a second ``issue_*`` builder is needed.
"""

from __future__ import annotations

import hmac
import logging
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.crypto import canonical, receipt_signing
from core.models import ReproducibilityReceipt

logger = logging.getLogger(__name__)

PLATFORM_VERSION = getattr(settings, "PLATFORM_VERSION", "1.0.0")
RECEIPT_GENERATOR_VERSION = "1.0.0"


def _utc_iso(dt) -> str:
    """Format a datetime as a stable UTC ISO-8601 string (seconds precision)."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _num(value) -> Optional[str]:
    """Stringify a numeric value for byte-stable canonicalization.

    Numbers are emitted as strings so platform float-formatting drift can
    never change the signed bytes. ``None`` is preserved as ``None``.
    """
    return None if value is None else str(value)


def issue_manuscript_receipt(
    submission,
    user=None,
    title: Optional[str] = None,
    minimal: bool = False,
) -> Tuple[ReproducibilityReceipt, str]:
    """Issue a signed receipt attesting a manuscript-verification result.

    Returns ``(receipt, raw_token)``. The raw token is returned ONCE and is
    required to download the signed artifact afterwards; public verification
    of the signature needs no token.

    Raises ``ValueError`` if the submission has not completed verification or
    has no ``file_hash`` to bind to.
    """
    if submission.status != "completed":
        raise ValueError("Cannot issue a receipt: submission verification has not completed.")
    if not submission.file_hash:
        raise ValueError("Cannot issue a receipt: submission has no file_hash to bind to.")

    receipt = ReproducibilityReceipt(
        receipt_type="manuscript",
        user=user if (user is not None and getattr(user, "is_authenticated", False)) else None,
        submission=submission,
        title=(title or submission.title or submission.file_name or "")[:500],
        subject_hash=submission.file_hash,
        issued_at=timezone.now(),
        sig_alg="RS256",
    )

    verdict = {
        "sqs_score": _num(submission.sqs_score),
        "sqs_grade": submission.sqs_grade or "",
        "claims_found": submission.claims_found,
        "claims_consistent": submission.claims_consistent,
        "claims_inconsistent": submission.claims_inconsistent,
        "consistency_rate": _num(submission.consistency_rate),
        "decision_errors": submission.decision_errors,
        "gross_errors": submission.gross_errors,
    }

    body: Dict[str, Any] = {
        "receipt_id": str(receipt.receipt_id),
        "schema_version": ReproducibilityReceipt.SCHEMA_VERSION,
        "receipt_type": "manuscript",
        "issued_at": _utc_iso(receipt.issued_at),
        "subject": {
            "kind": "manuscript_file",
            "file_name": submission.file_name,
            "file_type": submission.file_type,
            "file_size_bytes": submission.file_size_bytes,
            "data_fingerprint": {"algorithm": "sha256", "hash": submission.file_hash},
        },
        "verdict": verdict,
        "platform_versions": {
            "platform_version": PLATFORM_VERSION,
            "receipt_generator_version": RECEIPT_GENERATOR_VERSION,
        },
        "verification": {
            "how": (
                "Recompute the SHA-256 of this body's canonical JSON "
                "(sorted keys, separators ',' ':', ensure_ascii, no NaN) and "
                "RS256-verify the detached signature against the receipt public "
                "key (JWKS at /api/v1/receipt/jwks/, or the PEM bundled in a "
                "downloaded receipt)."
            ),
            "jwks_url": "/api/v1/receipt/jwks/",
            "verify_url": f"/api/v1/receipt/verify/{receipt.receipt_id}/",
        },
    }
    if not minimal:
        # The full per-category SQS breakdown (already JSON-safe). Omitted in
        # 'minimal' mode to avoid embedding per-group descriptive statistics
        # for small/sensitive datasets.
        body["sqs_detail"] = submission.sqs_data or {}

    canonical_bytes = canonical.canonical_bytes(body)
    receipt.receipt_json = body
    receipt.canonical_payload_hash = canonical.canonical_hash(body)
    sig = receipt_signing.sign(canonical_bytes)
    receipt.signature = sig["value"]
    receipt.key_id = sig["key_id"]
    raw_token = receipt.set_token()
    receipt.save()

    logger.info(
        "Issued manuscript reproducibility receipt %s for submission %s (key_id=%s)",
        receipt.receipt_id,
        submission.id,
        receipt.key_id,
    )
    return receipt, raw_token


def verify_receipt(receipt_id, token: Optional[str] = None) -> Dict[str, Any]:
    """Verify a receipt's integrity + authenticity. Public; ``token`` optional.

    Checks, in order: (1) the receipt exists, (2) the stored body still
    hashes to ``canonical_payload_hash`` (detects body tampering), (3) the
    detached RS256 signature verifies against the receipt public key
    (authenticity), (4) the receipt is not revoked. Returns a structured
    verdict mirroring ``certification_service.verify_certificate``.
    """
    try:
        receipt = ReproducibilityReceipt.objects.get(receipt_id=receipt_id)
    except (ReproducibilityReceipt.DoesNotExist, ValueError, ValidationError):
        return {"valid": False, "reason": "not_found", "receipt_id": str(receipt_id)}

    body = receipt.receipt_json or {}
    recomputed_hash = canonical.canonical_hash(body)
    payload_hash_ok = hmac.compare_digest(recomputed_hash, receipt.canonical_payload_hash or "")
    canonical_bytes = canonical.canonical_bytes(body)
    signature_ok = receipt_signing.verify(canonical_bytes, receipt.signature, receipt.key_id)

    token_ok = receipt.verify_token(token) if token is not None else None
    valid = bool(payload_hash_ok and signature_ok and not receipt.is_revoked)

    return {
        "valid": valid,
        "receipt_id": str(receipt.receipt_id),
        "receipt_type": receipt.receipt_type,
        "schema_version": receipt.schema_version,
        "issued_at": _utc_iso(receipt.issued_at),
        "subject_hash": receipt.subject_hash,
        "sig_alg": receipt.sig_alg,
        "key_id": receipt.key_id,
        "payload_hash_ok": payload_hash_ok,
        "signature_ok": signature_ok,
        "token_ok": token_ok,
        "is_revoked": receipt.is_revoked,
        "title": receipt.title,
        "verdict": body.get("verdict") if isinstance(body, dict) else None,
    }


def revoke_receipt(receipt_id, reason: str = "") -> bool:
    """Mark a receipt revoked so future verification fails. Idempotent."""
    try:
        receipt = ReproducibilityReceipt.objects.get(receipt_id=receipt_id)
    except (ReproducibilityReceipt.DoesNotExist, ValueError, ValidationError):
        return False
    if not receipt.is_revoked:
        receipt.is_revoked = True
        receipt.revoked_at = timezone.now()
        receipt.revoked_reason = (reason or "")[:255]
        receipt.save(update_fields=["is_revoked", "revoked_at", "revoked_reason"])
    return True
