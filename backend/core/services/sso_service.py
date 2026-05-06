"""
SSO Integration Service
========================
OIDC/SAML authentication via Keycloak or any standard identity provider.
Handles token validation, user provisioning, and role mapping.
"""

import json
import logging
import time
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


class SSOConfiguration:
    """SSO provider configuration."""

    # Default Keycloak configuration
    DEFAULT_CONFIG = {
        "provider": "keycloak",
        "realm": "stickforstats",
        "client_id": "stickforstats-api",
        "issuer_url": "{base_url}/realms/stickforstats",
        "authorization_endpoint": "{base_url}/realms/stickforstats/protocol/openid-connect/auth",
        "token_endpoint": "{base_url}/realms/stickforstats/protocol/openid-connect/token",
        "userinfo_endpoint": "{base_url}/realms/stickforstats/protocol/openid-connect/userinfo",
        "jwks_uri": "{base_url}/realms/stickforstats/protocol/openid-connect/certs",
        "end_session_endpoint": "{base_url}/realms/stickforstats/protocol/openid-connect/logout",
        "scopes": ["openid", "profile", "email", "roles"],
    }

    @classmethod
    def get_config(cls, base_url=None):
        """Get SSO configuration with URLs resolved."""
        from django.conf import settings

        base_url = base_url or getattr(settings, "KEYCLOAK_URL", "http://localhost:8180")

        config = {}
        for key, val in cls.DEFAULT_CONFIG.items():
            if isinstance(val, str) and "{base_url}" in val:
                config[key] = val.format(base_url=base_url)
            else:
                config[key] = val
        return config

    @classmethod
    def get_authorization_url(cls, redirect_uri, state, nonce=None):
        """Build OIDC authorization URL for login redirect."""
        config = cls.get_config()
        params = {
            "response_type": "code",
            "client_id": config["client_id"],
            "redirect_uri": redirect_uri,
            "scope": " ".join(config["scopes"]),
            "state": state,
        }
        if nonce:
            params["nonce"] = nonce
        return f"{config['authorization_endpoint']}?{urlencode(params)}"


class SSOService:
    """
    Handles SSO authentication flows.
    """

    # Keycloak role → StickForStats role mapping
    ROLE_MAPPING = {
        "sfs-admin": "owner",
        "sfs-enterprise-user": "admin",
        "sfs-journal-editor": "admin",
        "sfs-instructor": "member",
        "sfs-user": "member",
    }

    @classmethod
    def validate_token(cls, token, expected_audience=None, expected_issuer=None,
                       jwks_uri=None):
        """Validate an OIDC access / ID token by full JWT signature
        verification against the issuer's JWKS.

        Parameters
        ----------
        token
            Compact-serialized JWT (header.payload.signature).
        expected_audience
            ``aud`` claim the token must contain. If None, falls back
            to ``SSOConfiguration.get_config()["client_id"]``.
        expected_issuer
            ``iss`` claim the token must equal. If None, falls back to
            ``SSOConfiguration.get_config()["issuer_url"]``.
        jwks_uri
            JWKS URL to fetch the signing keys from. If None, falls
            back to ``SSOConfiguration.get_config()["jwks_uri"]``.

        Returns
        -------
        dict or None
            The verified claims dict on success; ``None`` on any
            verification failure (signature, expiry, audience, issuer,
            or JWKS fetch error).

        Notes
        -----
        Earlier versions of this method decoded the JWT payload via
        base64 + json.loads and checked exp/aud only --- the signature
        was never verified, so any forged JWT with valid claim names
        was accepted. That bypass is fixed here by routing the
        validation through ``jose.jwt.decode`` against the issuer's
        cached JWKS. See docs/CRITICAL_REVIEW_2026-05-06.md §P0-2.
        """
        if not token:
            return None

        from jose import jwt as jose_jwt
        from jose.exceptions import (
            ExpiredSignatureError,
            JWSError,
            JWTClaimsError,
            JWTError,
        )

        from core.services.jwks_cache import (
            JWKSError,
            find_signing_key,
            get_jwks,
            invalidate_cache,
        )

        config = SSOConfiguration.get_config()
        if expected_audience is None:
            expected_audience = config.get("client_id")
        if expected_issuer is None:
            expected_issuer = config.get("issuer_url")
        if jwks_uri is None:
            jwks_uri = config.get("jwks_uri")

        if not jwks_uri:
            logger.error("SSO token validation: jwks_uri not configured")
            return None

        # Read the JWT header to find the kid (key id) and alg.
        try:
            header = jose_jwt.get_unverified_header(token)
        except JWTError as exc:
            logger.warning("SSO token has invalid JWT header: %s", exc)
            return None

        kid = header.get("kid")
        alg = header.get("alg") or "RS256"
        # Restrict to asymmetric algorithms; reject "none" and HS*
        # (HMAC-with-shared-secret would be vulnerable to JWKS-key
        # confusion attacks).
        if alg.lower().startswith(("hs", "none")):
            logger.warning("SSO token uses unsupported alg %s; rejecting", alg)
            return None

        # Fetch JWKS, retry once with cache bust if kid not found
        # (handles issuer key rotation gracefully).
        try:
            jwks = get_jwks(jwks_uri)
            signing_key = find_signing_key(jwks, kid)
            if signing_key is None:
                invalidate_cache(jwks_uri)
                jwks = get_jwks(jwks_uri, force_refresh=True)
                signing_key = find_signing_key(jwks, kid)
        except JWKSError as exc:
            logger.error("SSO JWKS lookup failed: %s", exc)
            return None

        if signing_key is None:
            logger.warning("SSO token kid=%r not found in JWKS at %s", kid, jwks_uri)
            return None

        # Verify signature + standard claims.
        try:
            claims = jose_jwt.decode(
                token,
                signing_key,
                algorithms=[alg],
                audience=expected_audience,
                issuer=expected_issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_aud": expected_audience is not None,
                    "verify_iss": expected_issuer is not None,
                },
            )
        except ExpiredSignatureError:
            logger.warning("SSO token expired")
            return None
        except JWTClaimsError as exc:
            logger.warning("SSO token failed claim validation: %s", exc)
            return None
        except (JWSError, JWTError) as exc:
            logger.warning("SSO token signature verification failed: %s", exc)
            return None

        # exp is also enforced by jose.jwt above, but defence-in-depth:
        if claims.get("exp", 0) < time.time():
            logger.warning("SSO token expired (post-decode check)")
            return None

        return claims

    @classmethod
    def provision_user(cls, claims):
        """
        Create or update a Django user from SSO claims.
        Called after successful OIDC authentication.
        """
        from django.contrib.auth import get_user_model

        User = get_user_model()

        email = claims.get("email", "")
        if not email:
            return None, "No email in SSO claims"

        # Find or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email.split("@")[0],
                "first_name": claims.get("given_name", ""),
                "last_name": claims.get("family_name", ""),
                "is_active": True,
            },
        )

        if not created:
            # Update profile on each login
            if claims.get("given_name"):
                user.first_name = claims["given_name"]
            if claims.get("family_name"):
                user.last_name = claims["family_name"]
            user.save(update_fields=["first_name", "last_name"])

        return user, "created" if created else "existing"

    @classmethod
    def map_roles(cls, sso_roles):
        """Map SSO roles to StickForStats roles."""
        mapped = set()
        for role in sso_roles:
            if role in cls.ROLE_MAPPING:
                mapped.add(cls.ROLE_MAPPING[role])
        return list(mapped) if mapped else ["member"]

    @classmethod
    def sync_organization_membership(cls, user, claims):
        """
        Sync user's organization membership based on SSO claims.
        """
        org_id = claims.get("organization")
        if not org_id:
            return None

        from core.models import Organization, OrganizationMembership

        try:
            org = Organization.objects.get(slug=org_id, is_active=True)
        except Organization.DoesNotExist:
            return None

        sso_roles = claims.get("realm_roles", [])
        mapped_roles = cls.map_roles(sso_roles)
        best_role = mapped_roles[0] if mapped_roles else "member"

        membership, created = OrganizationMembership.objects.get_or_create(
            user=user,
            organization=org,
            defaults={
                "role": best_role,
                "is_active": True,
            },
        )

        if not created and membership.role != best_role:
            membership.role = best_role
            membership.save(update_fields=["role"])

        return membership

    @classmethod
    def get_sso_providers(cls):
        """List available SSO identity providers."""
        return [
            {
                "id": "keycloak",
                "name": "Keycloak (Self-Hosted)",
                "protocols": ["OIDC", "SAML 2.0"],
                "status": "supported",
            },
            {
                "id": "google",
                "name": "Google Workspace",
                "protocols": ["OIDC"],
                "status": "supported",
            },
            {
                "id": "azure_ad",
                "name": "Microsoft Azure AD / Entra ID",
                "protocols": ["OIDC", "SAML 2.0"],
                "status": "supported",
            },
            {
                "id": "okta",
                "name": "Okta",
                "protocols": ["OIDC", "SAML 2.0"],
                "status": "supported",
            },
            {
                "id": "orcid",
                "name": "ORCID (Academic Identity)",
                "protocols": ["OIDC"],
                "status": "supported",
            },
        ]
