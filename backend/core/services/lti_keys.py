"""
RSA keypair management for the LTI 1.3 tool's JWKS endpoint.

LTI 1.3 platforms (Canvas, Blackboard, Moodle) verify our outgoing
LTI service requests (e.g. AGS grade-passback) against the public key
we publish at our JWKS endpoint. The previous implementation served a
hardcoded ``"n": "placeholder_modulus"`` JWKS document, which made
real LTI integration impossible: any platform attempting to verify
our signed payloads would fail.

This module loads an RSA private key from the ``LTI_RSA_PRIVATE_KEY``
environment variable (PEM-encoded) and derives the matching public
JWKS on demand. For dev environments without an env var set, it
generates an ephemeral keypair on first use and warns loudly so an
operator notices.

The companion management command ``generate_lti_keypair`` writes a
fresh PEM file an operator can paste into their environment.

See docs/CRITICAL_REVIEW_2026-05-06.md §P0-2 (auth bypass) and
WORK_PLAN_2026-05-06.md §P2.3 for context.
"""

from __future__ import annotations

import base64
import logging
import os
import threading
from typing import Any, Dict, Optional, Tuple

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey

logger = logging.getLogger(__name__)


_KEYPAIR_LOCK = threading.Lock()
_CACHED_KEYPAIR: Optional[Tuple[RSAPrivateKey, RSAPublicKey, str]] = None


def _int_to_b64url(value: int) -> str:
    """Base64url-encode a positive integer for JWK n/e fields (no padding)."""
    n_bytes = (value.bit_length() + 7) // 8
    raw = value.to_bytes(n_bytes, byteorder="big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _generate_ephemeral() -> Tuple[RSAPrivateKey, RSAPublicKey, str]:
    """Generate a fresh 2048-bit RSA keypair (used only when env-var key
    is missing — emits a loud warning so operators notice in dev)."""
    logger.warning(
        "LTI_RSA_PRIVATE_KEY env var not set; generating an EPHEMERAL "
        "RSA keypair for the LTI JWKS endpoint. The key will not "
        "survive process restart, so LMS platforms cannot rely on key "
        "stability. Run `python manage.py generate_lti_keypair` and "
        "set LTI_RSA_PRIVATE_KEY for production."
    )
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    return private_key, public_key, "stickforstats-lti-ephemeral"


def _load_from_env() -> Optional[Tuple[RSAPrivateKey, RSAPublicKey, str]]:
    pem = os.environ.get("LTI_RSA_PRIVATE_KEY", "").strip()
    if not pem:
        return None
    try:
        private_key = serialization.load_pem_private_key(
            pem.encode("utf-8"), password=None
        )
    except Exception as exc:
        raise RuntimeError(
            f"LTI_RSA_PRIVATE_KEY is set but could not be parsed as a "
            f"PEM-encoded RSA private key: {exc}"
        ) from exc
    if not isinstance(private_key, RSAPrivateKey):
        raise RuntimeError(
            "LTI_RSA_PRIVATE_KEY must be an RSA private key; got "
            f"{type(private_key).__name__}"
        )
    public_key = private_key.public_key()
    kid = os.environ.get("LTI_RSA_KEY_ID", "stickforstats-lti-key-1")
    return private_key, public_key, kid


def get_keypair() -> Tuple[RSAPrivateKey, RSAPublicKey, str]:
    """Return ``(private_key, public_key, kid)`` for the LTI tool.

    Loads from ``LTI_RSA_PRIVATE_KEY`` env var if set, otherwise
    generates an ephemeral keypair and warns. Cached after first call.
    """
    global _CACHED_KEYPAIR
    with _KEYPAIR_LOCK:
        if _CACHED_KEYPAIR is None:
            loaded = _load_from_env()
            _CACHED_KEYPAIR = loaded if loaded is not None else _generate_ephemeral()
        return _CACHED_KEYPAIR


def reset_cache() -> None:
    """Drop the cached keypair (used in tests)."""
    global _CACHED_KEYPAIR
    with _KEYPAIR_LOCK:
        _CACHED_KEYPAIR = None


def get_public_jwks() -> Dict[str, Any]:
    """Return the tool's public JWKS document for the JWKS endpoint."""
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


def get_private_pem() -> bytes:
    """Return the active private key as a PEM-encoded byte string."""
    private_key, _, _ = get_keypair()
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
