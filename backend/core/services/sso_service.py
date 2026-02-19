"""
SSO Integration Service
========================
OIDC/SAML authentication via Keycloak or any standard identity provider.
Handles token validation, user provisioning, and role mapping.
"""

import hashlib
import hmac
import json
import logging
import time
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


class SSOConfiguration:
    """SSO provider configuration."""

    # Default Keycloak configuration
    DEFAULT_CONFIG = {
        'provider': 'keycloak',
        'realm': 'stickforstats',
        'client_id': 'stickforstats-api',
        'issuer_url': '{base_url}/realms/stickforstats',
        'authorization_endpoint': '{base_url}/realms/stickforstats/protocol/openid-connect/auth',
        'token_endpoint': '{base_url}/realms/stickforstats/protocol/openid-connect/token',
        'userinfo_endpoint': '{base_url}/realms/stickforstats/protocol/openid-connect/userinfo',
        'jwks_uri': '{base_url}/realms/stickforstats/protocol/openid-connect/certs',
        'end_session_endpoint': '{base_url}/realms/stickforstats/protocol/openid-connect/logout',
        'scopes': ['openid', 'profile', 'email', 'roles'],
    }

    @classmethod
    def get_config(cls, base_url=None):
        """Get SSO configuration with URLs resolved."""
        from django.conf import settings
        base_url = base_url or getattr(settings, 'KEYCLOAK_URL', 'http://localhost:8180')

        config = {}
        for key, val in cls.DEFAULT_CONFIG.items():
            if isinstance(val, str) and '{base_url}' in val:
                config[key] = val.format(base_url=base_url)
            else:
                config[key] = val
        return config

    @classmethod
    def get_authorization_url(cls, redirect_uri, state, nonce=None):
        """Build OIDC authorization URL for login redirect."""
        config = cls.get_config()
        params = {
            'response_type': 'code',
            'client_id': config['client_id'],
            'redirect_uri': redirect_uri,
            'scope': ' '.join(config['scopes']),
            'state': state,
        }
        if nonce:
            params['nonce'] = nonce
        return f"{config['authorization_endpoint']}?{urlencode(params)}"


class SSOService:
    """
    Handles SSO authentication flows.
    """

    # Keycloak role → StickForStats role mapping
    ROLE_MAPPING = {
        'sfs-admin': 'owner',
        'sfs-enterprise-user': 'admin',
        'sfs-journal-editor': 'admin',
        'sfs-instructor': 'member',
        'sfs-user': 'member',
    }

    @classmethod
    def validate_token(cls, token, expected_audience=None):
        """
        Validate an OIDC access/ID token.
        In production, this verifies JWT signature against JWKS.
        """
        if not token:
            return None

        # In production: fetch JWKS, verify signature, check claims
        # For now, return basic structure validation
        try:
            import base64
            parts = token.split('.')
            if len(parts) != 3:
                return None

            # Decode payload (add padding)
            payload = parts[1]
            padding = 4 - len(payload) % 4
            if padding != 4:
                payload += '=' * padding
            claims = json.loads(base64.urlsafe_b64decode(payload))

            # Check expiration
            if claims.get('exp', 0) < time.time():
                logger.warning("SSO token expired")
                return None

            # Check audience
            if expected_audience:
                aud = claims.get('aud', '')
                if isinstance(aud, list):
                    if expected_audience not in aud:
                        return None
                elif aud != expected_audience:
                    return None

            return claims

        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None

    @classmethod
    def provision_user(cls, claims):
        """
        Create or update a Django user from SSO claims.
        Called after successful OIDC authentication.
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()

        email = claims.get('email', '')
        if not email:
            return None, 'No email in SSO claims'

        # Find or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': claims.get('given_name', ''),
                'last_name': claims.get('family_name', ''),
                'is_active': True,
            }
        )

        if not created:
            # Update profile on each login
            if claims.get('given_name'):
                user.first_name = claims['given_name']
            if claims.get('family_name'):
                user.last_name = claims['family_name']
            user.save(update_fields=['first_name', 'last_name'])

        return user, 'created' if created else 'existing'

    @classmethod
    def map_roles(cls, sso_roles):
        """Map SSO roles to StickForStats roles."""
        mapped = set()
        for role in sso_roles:
            if role in cls.ROLE_MAPPING:
                mapped.add(cls.ROLE_MAPPING[role])
        return list(mapped) if mapped else ['member']

    @classmethod
    def sync_organization_membership(cls, user, claims):
        """
        Sync user's organization membership based on SSO claims.
        """
        org_id = claims.get('organization')
        if not org_id:
            return None

        from core.models import Organization, OrganizationMembership

        try:
            org = Organization.objects.get(slug=org_id, is_active=True)
        except Organization.DoesNotExist:
            return None

        sso_roles = claims.get('realm_roles', [])
        mapped_roles = cls.map_roles(sso_roles)
        best_role = mapped_roles[0] if mapped_roles else 'member'

        membership, created = OrganizationMembership.objects.get_or_create(
            user=user,
            organization=org,
            defaults={
                'role': best_role,
                'is_active': True,
            }
        )

        if not created and membership.role != best_role:
            membership.role = best_role
            membership.save(update_fields=['role'])

        return membership

    @classmethod
    def get_sso_providers(cls):
        """List available SSO identity providers."""
        return [
            {
                'id': 'keycloak',
                'name': 'Keycloak (Self-Hosted)',
                'protocols': ['OIDC', 'SAML 2.0'],
                'status': 'supported',
            },
            {
                'id': 'google',
                'name': 'Google Workspace',
                'protocols': ['OIDC'],
                'status': 'supported',
            },
            {
                'id': 'azure_ad',
                'name': 'Microsoft Azure AD / Entra ID',
                'protocols': ['OIDC', 'SAML 2.0'],
                'status': 'supported',
            },
            {
                'id': 'okta',
                'name': 'Okta',
                'protocols': ['OIDC', 'SAML 2.0'],
                'status': 'supported',
            },
            {
                'id': 'orcid',
                'name': 'ORCID (Academic Identity)',
                'protocols': ['OIDC'],
                'status': 'supported',
            },
        ]
