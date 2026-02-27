"""
SSO Authentication Views
========================
OIDC/SAML endpoints for enterprise SSO integration.
"""

import logging
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class SSOConfigView(APIView):
    """
    GET /api/v1/sso/config/
    Get SSO configuration for the frontend.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.sso_service import SSOConfiguration

        config = SSOConfiguration.get_config()
        # Don't expose sensitive fields
        return Response(
            {
                "provider": config["provider"],
                "authorization_endpoint": config["authorization_endpoint"],
                "end_session_endpoint": config["end_session_endpoint"],
                "client_id": config["client_id"],
                "scopes": config["scopes"],
            }
        )


class SSOLoginView(APIView):
    """
    GET /api/v1/sso/login/
    Initiate SSO login flow. Returns authorization URL.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.sso_service import SSOConfiguration

        redirect_uri = request.query_params.get("redirect_uri", request.build_absolute_uri("/api/v1/sso/callback/"))
        state = str(uuid.uuid4())
        nonce = str(uuid.uuid4())

        auth_url = SSOConfiguration.get_authorization_url(
            redirect_uri=redirect_uri,
            state=state,
            nonce=nonce,
        )

        return Response(
            {
                "authorization_url": auth_url,
                "state": state,
                "nonce": nonce,
            }
        )


class SSOCallbackView(APIView):
    """
    GET /api/v1/sso/callback/
    OIDC callback — exchange authorization code for tokens.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        error = request.query_params.get("error")

        if error:
            return Response(
                {
                    "error": error,
                    "error_description": request.query_params.get("error_description", ""),
                },
                status=400,
            )

        if not code:
            return Response({"error": "No authorization code received"}, status=400)

        # In production: exchange code for tokens via token endpoint
        return Response(
            {
                "status": "callback_received",
                "code": code[:10] + "...",
                "state": state,
                "message": "In production, this exchanges the code for tokens and creates a session.",
            }
        )


class SSOTokenValidateView(APIView):
    """
    POST /api/v1/sso/validate/
    Validate an SSO access token and return user info.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token", "")
        if not token:
            auth_header = request.META.get("HTTP_AUTHORIZATION", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        if not token:
            return Response({"error": "No token provided"}, status=400)

        from core.services.sso_service import SSOService

        claims = SSOService.validate_token(token)
        if not claims:
            return Response({"error": "Invalid or expired token"}, status=401)

        user_info = {
            "sub": claims.get("sub"),
            "email": claims.get("email"),
            "name": claims.get("name"),
            "roles": claims.get("realm_roles", []),
            "organization": claims.get("organization"),
        }

        return Response(
            {
                "valid": True,
                "user": user_info,
                "mapped_roles": SSOService.map_roles(user_info.get("roles", [])),
            }
        )


class SSOProvidersView(APIView):
    """
    GET /api/v1/sso/providers/
    List available SSO identity providers.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.sso_service import SSOService

        return Response(
            {
                "providers": SSOService.get_sso_providers(),
                "supported_protocols": ["OIDC", "SAML 2.0"],
            }
        )
