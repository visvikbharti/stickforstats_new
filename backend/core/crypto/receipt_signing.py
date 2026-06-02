"""RS256 (asymmetric) signing for reproducibility receipts.

Receipts are signed so a third party — e.g. a journal editor — can verify
a receipt is genuine and unmodified *without trusting StickForStats*: they
verify the RS256 signature against the public key we publish at the receipt
JWKS endpoint (or the PEM bundled inside a downloaded receipt). This is the
whole point of the "reproducibility receipt" — independent verifiability —
so we use asymmetric signing rather than the symmetric HMAC the
certification service uses (HMAC would require trusting our verify endpoint).

Key source, in priority order:

1. ``RECEIPT_RSA_PRIVATE_KEY`` env var (PEM) + optional ``RECEIPT_RSA_KEY_ID``.
2. An ephemeral 2048-bit keypair generated on first use, with a loud
   warning. Dev only: receipts signed with an ephemeral key will NOT
   verify after a process restart.

Generate a production key with::

    python manage.py generate_receipt_keypair --output receipt_private.pem
    export RECEIPT_RSA_PRIVATE_KEY="$(cat receipt_private.pem)"

This mirrors ``core/services/lti_keys.py`` (the LTI tool's JWKS keypair),
deliberately kept as a *separate* key so receipt trust and LTI trust are
independent and can be rotated independently.
"""

from __future__ import annotations

import base64
import logging
import os
import threading
from typing import Any, Dict, Optional, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey

logger = logging.getLogger(__name__)

_LOCK = threading.Lock()
_CACHED: Optional[Tuple[RSAPrivateKey, RSAPublicKey, str]] = None


def _int_to_b64url(value: int) -> str:
    """Base64url-encode a positive integer for JWK n/e fields (no padding)."""
    n_bytes = (value.bit_length() + 7) // 8
    raw = value.to_bytes(n_bytes, byteorder="big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _load_from_env() -> Optional[Tuple[RSAPrivateKey, RSAPublicKey, str]]:
    pem = os.environ.get("RECEIPT_RSA_PRIVATE_KEY", "").strip()
    if not pem:
        return None
    try:
        private_key = serialization.load_pem_private_key(pem.encode("utf-8"), password=None)
    except Exception as exc:  # noqa: BLE001 - re-raised with actionable context
        raise RuntimeError(
            f"RECEIPT_RSA_PRIVATE_KEY is set but could not be parsed as a "
            f"PEM-encoded RSA private key: {exc}"
        ) from exc
    if not isinstance(private_key, RSAPrivateKey):
        raise RuntimeError(
            "RECEIPT_RSA_PRIVATE_KEY must be an RSA private key; got "
            f"{type(private_key).__name__}"
        )
    kid = os.environ.get("RECEIPT_RSA_KEY_ID", "stickforstats-receipt-key-1")
    return private_key, private_key.public_key(), kid


def _generate_ephemeral() -> Tuple[RSAPrivateKey, RSAPublicKey, str]:
    logger.warning(
        "RECEIPT_RSA_PRIVATE_KEY env var not set; generating an EPHEMERAL "
        "RSA keypair for reproducibility-receipt signing. Receipts signed "
        "now will NOT verify after a process restart. Run "
        "`python manage.py generate_receipt_keypair` and set "
        "RECEIPT_RSA_PRIVATE_KEY for production."
    )
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key(), "stickforstats-receipt-ephemeral"


def get_keypair() -> Tuple[RSAPrivateKey, RSAPublicKey, str]:
    """Return ``(private_key, public_key, kid)`` for receipt signing.

    Loads from ``RECEIPT_RSA_PRIVATE_KEY`` if set, otherwise generates an
    ephemeral keypair and warns. Cached after the first call.
    """
    global _CACHED
    with _LOCK:
        if _CACHED is None:
            loaded = _load_from_env()
            _CACHED = loaded if loaded is not None else _generate_ephemeral()
        return _CACHED


def reset_cache() -> None:
    """Drop the cached keypair (used in tests)."""
    global _CACHED
    with _LOCK:
        _CACHED = None


def active_key_id() -> str:
    return get_keypair()[2]


def sign(data: bytes) -> Dict[str, str]:
    """RS256-sign ``data``; return a detached-signature dict.

    Returns ``{"alg": "RS256", "key_id": kid, "value": base64-signature}``.
    """
    private_key, _, kid = get_keypair()
    signature = private_key.sign(data, padding.PKCS1v15(), hashes.SHA256())
    return {"alg": "RS256", "key_id": kid, "value": base64.b64encode(signature).decode("ascii")}


def verify(data: bytes, signature_b64: str, key_id: Optional[str] = None) -> bool:
    """Verify an RS256 signature over ``data`` against the active public key.

    ``key_id`` is checked when supplied (forward-compatibility for key
    rotation): in v1 only the active key is held, so a signature made under
    a different ``key_id`` cannot be verified here and returns ``False``.
    """
    _, public_key, kid = get_keypair()
    if key_id and key_id != kid:
        return False
    try:
        public_key.verify(
            base64.b64decode(signature_b64),
            data,
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False


def public_pem() -> str:
    """Return the active public key as a PEM string (bundled into downloads)."""
    _, public_key, _ = get_keypair()
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")


def get_public_jwks() -> Dict[str, Any]:
    """Return the receipt public JWKS document for the receipt JWKS endpoint."""
    _, public_key, kid = get_keypair()
    public_numbers = public_key.public_numbers()
    return {
        "keys": [
            {
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "kid": kid,
                "n": _int_to_b64url(public_numbers.n),
                "e": _int_to_b64url(public_numbers.e),
            }
        ]
    }
