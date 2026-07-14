"""RS256 (asymmetric) signing for reproducibility receipts.

Receipts are signed so a third party — e.g. a journal editor — can verify
a receipt is genuine and unmodified *without trusting StickForStats*: they
verify the RS256 signature against the public key we publish at the receipt
JWKS endpoint (or the PEM bundled inside a downloaded receipt). This is the
whole point of the "reproducibility receipt" — independent verifiability —
so we use asymmetric signing rather than the symmetric HMAC the
certification service uses (HMAC would require trusting our verify endpoint).

Key source, in priority order:

1. ``RECEIPT_RSA_PRIVATE_KEY`` env var (PEM), or ``RECEIPT_RSA_PRIVATE_KEY_B64``
   (the same PEM, base64-encoded — the single-line form a ``.env`` file can
   hold), plus optional ``RECEIPT_RSA_KEY_ID``.
2. An ephemeral 2048-bit keypair generated on first use. **Never in
   production**: see below.

Generate a production key with::

    python manage.py generate_receipt_keypair --output receipt_private.pem
    export RECEIPT_RSA_PRIVATE_KEY="$(cat receipt_private.pem)"

or, for a ``.env`` file::

    python manage.py generate_receipt_keypair --env   # prints RECEIPT_RSA_PRIVATE_KEY_B64=...

Why signing is fail-closed when ``DEBUG=False``
-----------------------------------------------

The backend runs gunicorn with ``--workers 4`` and no ``--preload``, so the
key is loaded *per worker*. With no key configured, every worker would mint
its **own** ephemeral keypair — and they all used to advertise the *same*
``kid``. A receipt signed by worker 1 and verified by worker 3 therefore
passed the key-id check and failed the signature check: a genuine receipt
reported as invalid, at random, roughly 3 times in 4. The receipt is the
one artifact a journal editor is asked to trust, so silently signing with a
throwaway key is worse than not signing at all.

Two changes make that impossible:

* Ephemeral key ids now carry the public key's fingerprint
  (``stickforstats-receipt-ephemeral-<fp>``), so two workers can no longer
  claim the same identity for different keys. A mismatch is now *diagnosable*
  rather than silent.
* :func:`get_keypair` **refuses** to generate an ephemeral key when
  ``settings.DEBUG`` is False (outside the test suite). Set a real key, or
  set ``RECEIPT_ALLOW_EPHEMERAL_KEY=1`` to accept unverifiable receipts
  deliberately.

The guard lives here, at key-load time, and deliberately *not* in
``AppConfig.ready()``: the Docker image runs ``manage.py collectstatic ...
2>/dev/null || true`` at build time with ``DEBUG=False``, so a raise during
app startup would abort collectstatic and be swallowed by that ``|| true``,
shipping an image with no static files.

This mirrors ``core/services/lti_keys.py`` (the LTI tool's JWKS keypair),
deliberately kept as a *separate* key so receipt trust and LTI trust are
independent and can be rotated independently.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os
import threading
from typing import Any, Dict, Optional, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

_LOCK = threading.Lock()
_CACHED: Optional[Tuple[RSAPrivateKey, RSAPublicKey, str]] = None

_TRUTHY = {"1", "true", "yes", "on"}

#: Env vars that can carry the signing key, in the order they are consulted.
KEY_ENV_VARS = ("RECEIPT_RSA_PRIVATE_KEY", "RECEIPT_RSA_PRIVATE_KEY_B64")


def key_is_configured() -> bool:
    """True if a signing key is supplied by the environment."""
    return any(os.environ.get(var, "").strip() for var in KEY_ENV_VARS)


def ephemeral_keys_allowed() -> bool:
    """True if this process may sign receipts with a throwaway key.

    Allowed in development (``DEBUG``) and under the test suite, or when an
    operator opts in explicitly with ``RECEIPT_ALLOW_EPHEMERAL_KEY``.
    """
    if os.environ.get("RECEIPT_ALLOW_EPHEMERAL_KEY", "").strip().lower() in _TRUTHY:
        return True
    return bool(getattr(settings, "DEBUG", False)) or bool(getattr(settings, "TESTING", False))


def _public_fingerprint(public_key: RSAPublicKey) -> str:
    """Short, stable fingerprint of a public key (SHA-256 over its DER SPKI)."""
    der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return hashlib.sha256(der).hexdigest()[:16]


def _int_to_b64url(value: int) -> str:
    """Base64url-encode a positive integer for JWK n/e fields (no padding)."""
    n_bytes = (value.bit_length() + 7) // 8
    raw = value.to_bytes(n_bytes, byteorder="big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _load_from_env() -> Optional[Tuple[RSAPrivateKey, RSAPublicKey, str]]:
    pem = os.environ.get("RECEIPT_RSA_PRIVATE_KEY", "").strip()
    if not pem:
        # A base64-encoded PEM is the friendliest single-line form for a
        # docker-compose .env file (no multiline / no escaping needed).
        b64 = os.environ.get("RECEIPT_RSA_PRIVATE_KEY_B64", "").strip()
        if b64:
            try:
                pem = base64.b64decode(b64).decode("utf-8").strip()
            except Exception as exc:  # noqa: BLE001 - re-raised with context
                raise RuntimeError(
                    f"RECEIPT_RSA_PRIVATE_KEY_B64 is set but is not valid base64: {exc}"
                ) from exc
    if not pem:
        return None
    # A single-line env value (common in .env files) may carry escaped
    # newlines; restore real newlines so the PEM parses. Only do this when
    # the value clearly has no real newlines, so a genuine multiline PEM
    # is left untouched.
    if "\\n" in pem and "\n" not in pem:
        pem = pem.replace("\\n", "\n")
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


EPHEMERAL_KEY_REFUSAL = (
    "No reproducibility-receipt signing key is configured "
    "(RECEIPT_RSA_PRIVATE_KEY_B64 or RECEIPT_RSA_PRIVATE_KEY) and DEBUG is False.\n"
    "\n"
    "Refusing to sign receipts with an ephemeral key. The backend runs 4 gunicorn "
    "workers without --preload, so each worker would mint a DIFFERENT key: a genuine "
    "receipt signed by one worker would fail verification on the others. A receipt "
    "nobody can verify is worse than no receipt at all.\n"
    "\n"
    "Fix — generate a key and put it in the environment:\n"
    "    python manage.py generate_receipt_keypair --env\n"
    "    # copy the printed RECEIPT_RSA_PRIVATE_KEY_B64 line into .env, then redeploy\n"
    "\n"
    "Or, to accept unverifiable receipts deliberately (never in production):\n"
    "    RECEIPT_ALLOW_EPHEMERAL_KEY=1"
)


def _generate_ephemeral() -> Tuple[RSAPrivateKey, RSAPublicKey, str]:
    if not ephemeral_keys_allowed():
        raise ImproperlyConfigured(EPHEMERAL_KEY_REFUSAL)

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    # The fingerprint makes the key id unique to THIS key. Without it every
    # process advertised the same kid, so a signature made under a different
    # ephemeral key failed the crypto check while passing the identity check —
    # a genuine receipt reported invalid, with nothing to diagnose it by.
    kid = f"stickforstats-receipt-ephemeral-{_public_fingerprint(public_key)}"
    logger.warning(
        "No receipt signing key in the environment; generated an EPHEMERAL keypair "
        "(kid=%s). Receipts signed now will NOT verify after a restart, nor across "
        "processes. Run `python manage.py generate_receipt_keypair --env` and set "
        "RECEIPT_RSA_PRIVATE_KEY_B64 for any deployment whose receipts must be trusted.",
        kid,
    )
    return private_key, public_key, kid


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
