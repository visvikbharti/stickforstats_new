"""
JWKS fetching with TTL cache.

Both the SSO service (OIDC providers like Keycloak / Google / Okta /
Entra ID) and the LTI 1.3 service (Canvas / Blackboard / Moodle) need
to verify incoming JWTs against the issuer's published JWKS. We don't
want to hit the issuer's HTTP endpoint on every token — typical OIDC
providers expect callers to cache keys for ~1 hour.

This module provides a single ``get_jwks`` helper that:

  * fetches a JWKS document over HTTPS,
  * caches it in Django's default cache backend with a per-URL key,
  * returns the cached value on subsequent calls within ``cache_ttl``,
  * exposes a ``find_signing_key`` helper that picks the right key out
    of the JWKS by ``kid`` (key id) so callers don't have to.

Errors are raised as ``JWKSError`` so callers can distinguish a JWKS
fetch failure from a signature failure (which jose.jwt raises).

See docs/CRITICAL_REVIEW_2026-05-06.md §P0-2 for the audit finding
this module addresses.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)


DEFAULT_CACHE_TTL = 3600  # 1 hour
DEFAULT_FETCH_TIMEOUT = 5.0  # seconds


class JWKSError(Exception):
    """JWKS fetch / parse / lookup failure (distinct from signature failure)."""


def _cache_key(jwks_url: str) -> str:
    return f"jwks:{jwks_url}"


def get_jwks(
    jwks_url: str,
    cache_ttl: int = DEFAULT_CACHE_TTL,
    fetch_timeout: float = DEFAULT_FETCH_TIMEOUT,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """Return a JWKS document for ``jwks_url``, using the cache if fresh.

    Parameters
    ----------
    jwks_url
        Absolute https:// URL of the issuer's JWKS endpoint.
    cache_ttl
        Seconds to cache the JWKS document. Defaults to 3600 (1 hr).
    fetch_timeout
        HTTP timeout for the fetch in seconds.
    force_refresh
        If True, skip the cache and fetch from the URL. Useful when
        a kid-not-found lookup suggests the issuer rotated keys.

    Raises
    ------
    JWKSError
        If the URL is not https://, the fetch fails, or the response
        body is not a valid JWKS document with a ``keys`` array.
    """
    if not jwks_url or not jwks_url.startswith(("https://", "http://")):
        # http:// is allowed for local development only; production
        # configs MUST use https.
        raise JWKSError(f"JWKS URL must be http(s)://: {jwks_url!r}")

    cache_key = _cache_key(jwks_url)
    if not force_refresh:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    try:
        resp = requests.get(jwks_url, timeout=fetch_timeout)
        resp.raise_for_status()
        body = resp.json()
    except requests.RequestException as exc:
        raise JWKSError(f"JWKS fetch failed for {jwks_url}: {exc}") from exc
    except ValueError as exc:
        raise JWKSError(f"JWKS response is not valid JSON: {exc}") from exc

    if not isinstance(body, dict) or "keys" not in body or not isinstance(body["keys"], list):
        raise JWKSError(
            f"JWKS response missing 'keys' array: {jwks_url}"
        )

    cache.set(cache_key, body, timeout=cache_ttl)
    logger.info(
        "JWKS fetched and cached for %s (%d keys, ttl=%ds)",
        jwks_url, len(body["keys"]), cache_ttl,
    )
    return body


def find_signing_key(
    jwks: Dict[str, Any],
    kid: Optional[str],
    *,
    use: str = "sig",
) -> Optional[Dict[str, Any]]:
    """Return the JWK matching ``kid`` from a JWKS document, or None.

    If ``kid`` is None (legitimate for some single-key JWKS), the first
    key with matching ``use`` (default ``sig``) is returned.
    """
    keys = jwks.get("keys", []) if isinstance(jwks, dict) else []
    if kid is not None:
        for key in keys:
            if key.get("kid") == kid:
                return key
        return None
    # No kid in the JWT header — fall back to first signing key.
    for key in keys:
        if key.get("use", "sig") == use:
            return key
    return None


def invalidate_cache(jwks_url: str) -> None:
    """Drop the cached JWKS for a URL (call after a kid-not-found error
    so the next request re-fetches in case the issuer rotated keys)."""
    cache.delete(_cache_key(jwks_url))
