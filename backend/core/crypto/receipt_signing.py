"""RS256 (asymmetric) signing for reproducibility receipts.

Receipts are signed so a third party — e.g. a journal editor — can verify
a receipt is genuine and unmodified *without trusting StickForStats*: they
verify the RS256 signature against the public key we publish at the receipt
JWKS endpoint (or the PEM bundled inside a downloaded receipt). This is the
whole point of the "reproducibility receipt" — independent verifiability —
so we use asymmetric signing rather than the symmetric HMAC the
certification service uses (HMAC would require trusting our verify endpoint).

The signing key (one, "active") source, in priority order:

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

The keyring: verify against any known key, sign with the newest
--------------------------------------------------------------

Receipts are long-lived: a journal editor may verify one months after it was
issued. If the signing key is ever rotated and only ONE key is ever held, every
receipt signed under the old key becomes unverifiable and its downloadable
bundle self-inconsistent (it would embed the new public key next to an old
signature) — so a *genuine* receipt reads as a forgery. That defeats the whole
point of the receipt.

So this module holds a **keyring**, not a single key:

* One **active** key (above) — the only key that SIGNS. New receipts use it.
* Zero or more **retired**, verify-only keys, supplied as
  ``RECEIPT_RSA_RETIRED_KEYS_B64`` = base64 of a JSON array
  ``[{"kid": "...", "public_pem": "<PEM>"}, ...]``. These never sign; they exist
  only so old receipts keep verifying and keep exporting a self-consistent
  bundle. Retired entries need only the PUBLIC half — the old *private* key can
  be destroyed at rotation, which is the safer posture.

:func:`verify` looks a signature up by its ``key_id`` and checks it against
*that* key. :func:`get_public_jwks` publishes every key in the ring. The bundle
(:mod:`core.services.receipt_bundle`) embeds the public key that MATCHES the
receipt's ``key_id`` via :func:`public_pem_for`, so it is always self-consistent.

Rotate with::

    python manage.py rotate_receipt_key --env

which prints the new ``RECEIPT_RSA_PRIVATE_KEY_B64`` / ``RECEIPT_RSA_KEY_ID`` and
a ``RECEIPT_RSA_RETIRED_KEYS_B64`` that folds the *current* active public key
into the retired set. Paste the three lines, redeploy: new receipts sign with the
new key, old receipts keep verifying against the retired one.

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
import json
import logging
import os
import threading
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

_LOCK = threading.Lock()
_CACHED: "Optional[_Keyring]" = None

_TRUTHY = {"1", "true", "yes", "on"}

#: Env vars that can carry the active signing key, in the order they are consulted.
KEY_ENV_VARS = ("RECEIPT_RSA_PRIVATE_KEY", "RECEIPT_RSA_PRIVATE_KEY_B64")

#: Env var carrying verify-only (retired) public keys: base64 of a JSON array
#: ``[{"kid": "...", "public_pem": "<PEM>"}, ...]``. These never sign; they let
#: receipts issued under a rotated-out key keep verifying and keep exporting a
#: self-consistent bundle. See the module docstring ("The keyring").
RETIRED_KEYS_ENV_VAR = "RECEIPT_RSA_RETIRED_KEYS_B64"


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


class _Keyring:
    """The set of receipt keys this process trusts.

    ``signing_*`` is the one active key — the only key that SIGNS. ``verify_keys``
    maps every trusted ``kid`` to its public key and ALWAYS includes the active
    key, so :func:`verify` can look a signature up by its ``key_id`` and cover
    both the current key and any retired, verify-only keys. Insertion order is
    active-first, which is also the order JWKS publishes them in.
    """

    __slots__ = ("signing_private", "signing_public", "signing_kid", "verify_keys")

    def __init__(
        self,
        signing_private: RSAPrivateKey,
        signing_public: RSAPublicKey,
        signing_kid: str,
        verify_keys: "OrderedDict[str, RSAPublicKey]",
    ) -> None:
        self.signing_private = signing_private
        self.signing_public = signing_public
        self.signing_kid = signing_kid
        self.verify_keys = verify_keys


def _load_public_key_from_pem(pem: str) -> RSAPublicKey:
    """Parse a PEM holding an RSA public key.

    Retired entries should carry only the PUBLIC half — that is the whole point
    of retiring a key: the private half can be destroyed. But if a private PEM
    is pasted in by mistake, take its public half rather than failing.
    """
    raw = pem.strip()
    if "\\n" in raw and "\n" not in raw:
        raw = raw.replace("\\n", "\n")
    data = raw.encode("utf-8")
    try:
        key: Any = serialization.load_pem_public_key(data)
    except Exception:  # noqa: BLE001 - fall back to a private PEM below
        try:
            key = serialization.load_pem_private_key(data, password=None).public_key()
        except Exception as exc:  # noqa: BLE001 - re-raised with context
            raise RuntimeError(
                f"a retired receipt key could not be parsed as a PEM public "
                f"(or private) RSA key: {exc}"
            ) from exc
    if not isinstance(key, RSAPublicKey):
        raise RuntimeError(
            f"a retired receipt key must be RSA; got {type(key).__name__}"
        )
    return key


def _load_retired_keys() -> "OrderedDict[str, RSAPublicKey]":
    """Parse ``RECEIPT_RSA_RETIRED_KEYS_B64`` into an ordered ``kid -> public key`` map."""
    result: "OrderedDict[str, RSAPublicKey]" = OrderedDict()
    blob = os.environ.get(RETIRED_KEYS_ENV_VAR, "").strip()
    if not blob:
        return result
    try:
        decoded = base64.b64decode(blob).decode("utf-8")
        entries = json.loads(decoded)
    except Exception as exc:  # noqa: BLE001 - re-raised with actionable context
        raise RuntimeError(
            f"{RETIRED_KEYS_ENV_VAR} is set but is not base64-encoded JSON: {exc}"
        ) from exc
    if not isinstance(entries, list):
        raise RuntimeError(
            f"{RETIRED_KEYS_ENV_VAR} must decode to a JSON array of "
            '{"kid": ..., "public_pem": ...} objects.'
        )
    for i, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise RuntimeError(f"{RETIRED_KEYS_ENV_VAR}[{i}] is not a JSON object")
        kid = str(entry.get("kid", "")).strip()
        pem = entry.get("public_pem") or entry.get("pem") or ""
        if not kid or not pem:
            raise RuntimeError(
                f"{RETIRED_KEYS_ENV_VAR}[{i}] needs both a 'kid' and a 'public_pem'"
            )
        if kid in result:
            raise RuntimeError(
                f"{RETIRED_KEYS_ENV_VAR} lists kid {kid!r} more than once"
            )
        result[kid] = _load_public_key_from_pem(str(pem))
    return result


def _build_keyring() -> _Keyring:
    """Assemble the trusted keyring from the environment.

    Active key first (so it wins JWKS ordering and any kid collision with a
    misconfigured retired entry), then every retired verify-only key.
    """
    loaded = _load_from_env()
    private_key, public_key, kid = loaded if loaded is not None else _generate_ephemeral()
    verify_keys: "OrderedDict[str, RSAPublicKey]" = OrderedDict()
    verify_keys[kid] = public_key
    for retired_kid, retired_pub in _load_retired_keys().items():
        if retired_kid == kid:
            # The active key is authoritative for its own kid; a retired entry
            # claiming the same kid is a config smell, not a second key.
            logger.warning(
                "Retired receipt key kid=%s collides with the active signing kid; "
                "ignoring the retired entry and keeping the active key.",
                retired_kid,
            )
            continue
        verify_keys[retired_kid] = retired_pub
    return _Keyring(private_key, public_key, kid, verify_keys)


def _get_keyring() -> _Keyring:
    global _CACHED
    with _LOCK:
        if _CACHED is None:
            _CACHED = _build_keyring()
        return _CACHED


def get_keypair() -> Tuple[RSAPrivateKey, RSAPublicKey, str]:
    """Return ``(private_key, public_key, kid)`` for the ACTIVE signing key.

    Loads from ``RECEIPT_RSA_PRIVATE_KEY`` if set, otherwise generates an
    ephemeral keypair and warns. Cached (with the rest of the keyring) after the
    first call. Only the active key signs; use :func:`verify` /
    :func:`public_pem_for` to reach retired keys by ``kid``.
    """
    ring = _get_keyring()
    return ring.signing_private, ring.signing_public, ring.signing_kid


def reset_cache() -> None:
    """Drop the cached keyring (used in tests)."""
    global _CACHED
    with _LOCK:
        _CACHED = None


def active_key_id() -> str:
    return _get_keyring().signing_kid


def known_key_ids() -> Tuple[str, ...]:
    """Every ``kid`` the ring can verify against (active first, then retired)."""
    return tuple(_get_keyring().verify_keys.keys())


def sign(data: bytes) -> Dict[str, str]:
    """RS256-sign ``data`` with the ACTIVE key; return a detached-signature dict.

    Returns ``{"alg": "RS256", "key_id": kid, "value": base64-signature}``.
    """
    private_key, _, kid = get_keypair()
    signature = private_key.sign(data, padding.PKCS1v15(), hashes.SHA256())
    return {"alg": "RS256", "key_id": kid, "value": base64.b64encode(signature).decode("ascii")}


def verify(data: bytes, signature_b64: str, key_id: Optional[str] = None) -> bool:
    """Verify an RS256 signature over ``data`` against the key named by ``key_id``.

    * A known ``key_id`` is verified against *that* key — so a receipt signed
      under a since-rotated key still verifies as long as its key is retained in
      the ring.
    * An **unknown** ``key_id`` returns ``False``: the signing key is not in this
      process's ring, so we cannot vouch for it (we do not fall back to trying
      other keys, which would let a stripped/spoofed kid probe the whole ring).
    * A blank/absent ``key_id`` is a legacy receipt that recorded no kid; it is
      tried against every key in the ring.
    """
    ring = _get_keyring()
    if key_id:
        public_key = ring.verify_keys.get(key_id)
        if public_key is None:
            return False
        candidates: List[RSAPublicKey] = [public_key]
    else:
        candidates = list(ring.verify_keys.values())
    try:
        raw_sig = base64.b64decode(signature_b64)
    except (ValueError, TypeError):
        return False
    for public_key in candidates:
        try:
            public_key.verify(raw_sig, data, padding.PKCS1v15(), hashes.SHA256())
            return True
        except (InvalidSignature, ValueError, TypeError):
            continue
    return False


def _public_pem_bytes(public_key: RSAPublicKey) -> str:
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")


def public_pem() -> str:
    """Return the ACTIVE public key as a PEM string."""
    return _public_pem_bytes(_get_keyring().signing_public)


def public_pem_for(key_id: Optional[str]) -> Optional[str]:
    """PEM for a specific ``key_id`` — the key that signed a given receipt.

    Returns ``None`` if ``key_id`` is not in the ring (so the caller can refuse
    to ship a self-inconsistent bundle). A blank/None ``key_id`` is a legacy
    receipt with no recorded kid; fall back to the active key.
    """
    ring = _get_keyring()
    if not key_id:
        return _public_pem_bytes(ring.signing_public)
    public_key = ring.verify_keys.get(key_id)
    if public_key is None:
        return None
    return _public_pem_bytes(public_key)


def get_public_jwks() -> Dict[str, Any]:
    """Return the receipt public JWKS document — EVERY key in the ring.

    Publishing all keys (not just the active one) is what lets a third party
    verify a receipt signed under a since-rotated key: they find its ``kid`` in
    the JWKS. The active key is listed first.
    """
    ring = _get_keyring()
    keys: List[Dict[str, str]] = []
    for kid, public_key in ring.verify_keys.items():
        public_numbers = public_key.public_numbers()
        keys.append(
            {
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "kid": kid,
                "n": _int_to_b64url(public_numbers.n),
                "e": _int_to_b64url(public_numbers.e),
            }
        )
    return {"keys": keys}
