"""
JWT signature verification contracts for SSO and LTI.

Pre-2026-05-06 the SSO and LTI services accepted JWTs without verifying
the signature: ``sso_service.validate_token`` decoded the payload via
``base64 + json.loads`` and only checked exp + audience, and
``lms_service.validate_launch_request`` accepted an already-decoded
claims dict and only checked structural claim names. Either endpoint
could therefore be impersonated with a forged JWT bearing well-formed
claims.

These tests pin the new contracts:

  * Valid signature against the cached JWKS → token accepted.
  * Forged signature with same claims → token rejected.
  * ``alg=none`` and ``alg=HS256`` → rejected (algorithm-confusion guard).
  * Expired ``exp`` → rejected.
  * Wrong audience → rejected.
  * Wrong issuer → rejected.
  * LTI: replayed (issuer, nonce) → rejected.
  * LTI: pre-decoded dict path → rejected when LTI_REQUIRE_JWT_SIGNATURE
    is True (default).
  * JWKS endpoint serves a real RSA key (no ``placeholder_modulus``).

See docs/CRITICAL_REVIEW_2026-05-06.md §P0-2.
"""

from __future__ import annotations

import time
from unittest.mock import patch

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.core.cache import cache
from django.test import TestCase, override_settings
from jose import jwt as jose_jwt

from core.services.lti_keys import (
    _int_to_b64url,
    get_public_jwks,
    reset_cache,
)


def _make_keypair():
    """Generate a fresh 2048-bit RSA keypair for test use."""
    sk = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pk = sk.public_key()
    return sk, pk


def _key_to_pem(sk):
    return sk.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("ascii")


def _public_jwks(pk, kid="test-key-1"):
    pn = pk.public_numbers()
    return {
        "keys": [
            {
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "kid": kid,
                "n": _int_to_b64url(pn.n),
                "e": _int_to_b64url(pn.e),
            }
        ]
    }


def _sign(claims, sk, kid="test-key-1", alg="RS256"):
    pem = _key_to_pem(sk)
    return jose_jwt.encode(claims, pem, algorithm=alg, headers={"kid": kid})


# ----------------------------------------------------------------------------
# SSOService.validate_token
# ----------------------------------------------------------------------------


class TestSSOValidateToken(TestCase):

    def setUp(self):
        cache.clear()
        self.sk, self.pk = _make_keypair()
        self.jwks = _public_jwks(self.pk)
        self.now = int(time.time())
        self.base_claims = {
            "iss": "https://issuer.example.com",
            "aud": "stickforstats-api",
            "sub": "user-123",
            "iat": self.now,
            "exp": self.now + 600,
            "email": "u@example.com",
        }
        # Pre-warm cache so we don't actually call out
        cache.set("jwks:https://jwks.example.com/keys", self.jwks, timeout=60)

    def _validate(self, token):
        from core.services.sso_service import SSOService
        return SSOService.validate_token(
            token,
            expected_audience="stickforstats-api",
            expected_issuer="https://issuer.example.com",
            jwks_uri="https://jwks.example.com/keys",
        )

    def test_valid_signature_accepted(self):
        token = _sign(self.base_claims, self.sk)
        claims = self._validate(token)
        self.assertIsNotNone(claims, "Validly signed token should be accepted")
        self.assertEqual(claims["sub"], "user-123")

    def test_forged_signature_rejected(self):
        """Token signed by a DIFFERENT key with the same claims must be
        rejected (this is the core bug the audit flagged: previously
        any payload with valid claim names was accepted)."""
        other_sk, _ = _make_keypair()
        token = _sign(self.base_claims, other_sk)
        claims = self._validate(token)
        self.assertIsNone(claims, "Forged-signature token must be rejected")

    def test_alg_none_rejected(self):
        # jose refuses to encode with alg=none unless explicitly requested
        # — but a hand-crafted token with alg=none in the header is what
        # an attacker would send.
        import base64
        import json
        header = base64.urlsafe_b64encode(
            json.dumps({"alg": "none", "kid": "test-key-1"}).encode()
        ).rstrip(b"=").decode()
        payload = base64.urlsafe_b64encode(
            json.dumps(self.base_claims).encode()
        ).rstrip(b"=").decode()
        forged = f"{header}.{payload}."  # empty signature
        claims = self._validate(forged)
        self.assertIsNone(claims, "alg=none must be rejected")

    def test_alg_hs256_rejected(self):
        """HMAC-with-shared-secret tokens are vulnerable to JWKS-key-
        confusion attacks (attacker uses the public RSA n/e as the HMAC
        secret) and must be refused."""
        token = jose_jwt.encode(
            self.base_claims, "secret", algorithm="HS256",
            headers={"kid": "test-key-1"},
        )
        claims = self._validate(token)
        self.assertIsNone(claims, "HS256 must be rejected for asymmetric flow")

    def test_expired_token_rejected(self):
        expired = dict(self.base_claims, exp=self.now - 60, iat=self.now - 600)
        token = _sign(expired, self.sk)
        claims = self._validate(token)
        self.assertIsNone(claims, "Expired token must be rejected")

    def test_wrong_audience_rejected(self):
        bad_aud = dict(self.base_claims, aud="some-other-tool")
        token = _sign(bad_aud, self.sk)
        claims = self._validate(token)
        self.assertIsNone(claims, "Wrong audience must be rejected")

    def test_wrong_issuer_rejected(self):
        bad_iss = dict(self.base_claims, iss="https://attacker.example.com")
        token = _sign(bad_iss, self.sk)
        claims = self._validate(token)
        self.assertIsNone(claims, "Wrong issuer must be rejected")

    def test_unknown_kid_rejected(self):
        token = _sign(self.base_claims, self.sk, kid="not-in-jwks")
        # First call refreshes the cache; if the new fetch also lacks the
        # kid, the validation must fail. We mock the refresh to return
        # the same JWKS so the second lookup also misses.
        with patch(
            "core.services.jwks_cache.requests.get"
        ) as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.raise_for_status = lambda: None
            mock_get.return_value.json = lambda: self.jwks
            claims = self._validate(token)
        self.assertIsNone(claims, "Unknown kid must be rejected")

    def test_empty_token_rejected(self):
        self.assertIsNone(self._validate(""))
        self.assertIsNone(self._validate(None))


# ----------------------------------------------------------------------------
# LTIService.validate_launch_request
# ----------------------------------------------------------------------------


class TestLTILaunchValidation(TestCase):

    def setUp(self):
        cache.clear()
        from core.models import LTINonceUsed
        LTINonceUsed.objects.all().delete()

        self.sk, self.pk = _make_keypair()
        self.jwks = _public_jwks(self.pk)
        cache.set("jwks:https://platform.example/jwks", self.jwks, timeout=60)

        self.now = int(time.time())
        self.base_claims = {
            "iss": "https://platform.example",
            "aud": "tool-client-id",
            "sub": "lti-user-1",
            "iat": self.now,
            "exp": self.now + 600,
            "nonce": "nonce-abc-123",
            "https://purl.imsglobal.org/spec/lti/claim/message_type": (
                "LtiResourceLinkRequest"
            ),
            "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
            "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
                "id": "rl-1",
                "title": "Assignment 1",
            },
        }
        self.platform = {
            "jwks_url": "https://platform.example/jwks",
            "client_id": "tool-client-id",
            "issuer": "https://platform.example",
        }

    def _validate(self, token, platform=None):
        from core.services.lms_service import LTIService
        return LTIService.validate_launch_request(token, platform or self.platform)

    def test_valid_signed_launch_accepted(self):
        token = _sign(self.base_claims, self.sk)
        claims = self._validate(token)
        self.assertIsNotNone(claims, "Valid signed LTI launch must be accepted")
        self.assertEqual(claims["sub"], "lti-user-1")

    def test_forged_signature_rejected(self):
        other_sk, _ = _make_keypair()
        token = _sign(self.base_claims, other_sk)
        self.assertIsNone(self._validate(token))

    def test_predecoded_dict_rejected_by_default(self):
        """The legacy 'pass an already-decoded dict' path is now off
        unless LTI_REQUIRE_JWT_SIGNATURE is explicitly set to False."""
        result = self._validate(self.base_claims)  # dict, not str
        self.assertIsNone(result, "Pre-decoded dict path must be rejected")

    @override_settings(LTI_REQUIRE_JWT_SIGNATURE=False)
    def test_predecoded_dict_accepted_when_flag_off(self):
        """Tests still need a way to pass dicts; when the flag is off
        the structural-only path is allowed."""
        result = self._validate(self.base_claims)
        self.assertIsNotNone(result)

    def test_replayed_nonce_rejected(self):
        """Same (issuer, nonce) twice → second call fails."""
        token = _sign(self.base_claims, self.sk)
        first = self._validate(token)
        self.assertIsNotNone(first)
        # Same token, same nonce — must be rejected.
        replay = self._validate(token)
        self.assertIsNone(replay, "Replay attempt must be rejected")

    def test_different_nonce_per_launch_accepted(self):
        token1 = _sign(dict(self.base_claims, nonce="n1"), self.sk)
        token2 = _sign(dict(self.base_claims, nonce="n2"), self.sk)
        self.assertIsNotNone(self._validate(token1))
        self.assertIsNotNone(self._validate(token2))

    def test_expired_launch_rejected(self):
        expired = dict(self.base_claims, exp=self.now - 60, iat=self.now - 600)
        token = _sign(expired, self.sk)
        self.assertIsNone(self._validate(token))

    def test_missing_required_claim_rejected(self):
        bad = dict(self.base_claims)
        del bad["nonce"]
        token = _sign(bad, self.sk)
        self.assertIsNone(self._validate(token))

    def test_alg_none_rejected(self):
        import base64
        import json
        header = base64.urlsafe_b64encode(
            json.dumps({"alg": "none", "kid": "test-key-1"}).encode()
        ).rstrip(b"=").decode()
        payload = base64.urlsafe_b64encode(
            json.dumps(self.base_claims).encode()
        ).rstrip(b"=").decode()
        forged = f"{header}.{payload}."
        self.assertIsNone(self._validate(forged))


# ----------------------------------------------------------------------------
# LTI JWKS endpoint
# ----------------------------------------------------------------------------


class TestLTIJWKSEndpoint(TestCase):

    def setUp(self):
        reset_cache()

    def test_jwks_returns_real_rsa_key_not_placeholder(self):
        """The endpoint helper used to return ``"n": "placeholder_modulus"``
        — make sure we now return a real RSA modulus."""
        jwks = get_public_jwks()
        self.assertIn("keys", jwks)
        self.assertEqual(len(jwks["keys"]), 1)
        key = jwks["keys"][0]
        self.assertEqual(key["kty"], "RSA")
        self.assertEqual(key["alg"], "RS256")
        self.assertEqual(key["use"], "sig")
        self.assertEqual(key["e"], "AQAB")  # standard public exponent
        self.assertNotEqual(key["n"], "placeholder_modulus")
        # 2048-bit RSA modulus → b64url-encoded n is ~342 chars; refuse
        # anything obviously truncated.
        self.assertGreater(len(key["n"]), 200)

    @override_settings(SECURE_SSL_REDIRECT=False)
    def test_view_returns_jwks_at_endpoint(self):
        from rest_framework.test import APIClient
        client = APIClient()
        resp = client.get("/api/v1/lti/jwks/")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn("keys", body)
        self.assertNotEqual(body["keys"][0]["n"], "placeholder_modulus")
