"""
GDPR Compliance Views
=====================
REST endpoints for GDPR data subject rights:
- Consent management
- Data export (DSAR)
- Right to erasure
- Privacy information
"""

import logging

from django.http import QueryDict
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

logger = logging.getLogger(__name__)

# The only spellings a form-encoded yes/no field may take (compared case-insensitively).
_FORM_BOOLEANS = {"true": True, "false": False}


def read_strict_boolean(request, field):
    """Read a yes/no request field strictly. Returns (value, None) or (None, error message).

    A JSON body must carry the boolean true or false. A form-encoded or multipart body must carry
    the field exactly once, as the string "true" or "false" in any letter case. Anything else --
    missing, null, "", "1", "0", 1, 0, "yes", "on", a list, a repeated field -- is refused: bool()
    reads the string "false" as true, so a withdrawal or a refusal sent from a form would act as a yes.
    """
    error = f'"{field}" must be true or false.'
    data = request.data
    if isinstance(data, QueryDict):  # form-encoded or multipart
        values = data.getlist(field)
        if len(values) == 1 and isinstance(values[0], str):
            value = _FORM_BOOLEANS.get(values[0].lower())
            if value is not None:
                return value, None
        return None, error
    value = data.get(field) if isinstance(data, dict) else None
    if isinstance(value, bool):
        return value, None
    return None, error


class ConsentStatusView(APIView):
    """
    GET /api/v1/privacy/consent/
    Get current consent status for all processing activities.

    POST /api/v1/privacy/consent/
    Update consent for a specific processing activity.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from core.services.gdpr_service import GDPRService

        consents = GDPRService.get_consent_status(request.user)
        return Response({"consents": consents})

    def post(self, request):
        # A JSON body that is not an object (a list, a text) has no fields.
        consent_type = request.data.get("consent_type") if isinstance(request.data, dict) else None
        if consent_type is None:
            return Response({"error": "consent_type and granted are required"}, status=400)

        granted, error = read_strict_boolean(request, "granted")
        if error:
            return Response({"error": error}, status=400)

        ip = request.META.get("REMOTE_ADDR", "")
        ua = request.META.get("HTTP_USER_AGENT", "")

        from core.services.gdpr_service import GDPRService

        result = GDPRService.update_consent(request.user, consent_type, granted, ip_address=ip, user_agent=ua)

        if "error" in result:
            return Response(result, status=400)
        return Response(result)


class DataExportView(APIView):
    """
    GET /api/v1/privacy/export/
    Export all personal data (GDPR Art. 15 + Art. 20 DSAR).
    Returns JSON with all data categories.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from core.services.gdpr_service import GDPRService

        export = GDPRService.export_user_data(request.user)
        return Response(export)


class DataErasureView(APIView):
    """
    POST /api/v1/privacy/erase/
    Right to erasure / right to be forgotten (GDPR Art. 17).
    Requires explicit confirmation: confirm=true in the request body (JSON true, or the form value "true").
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        confirm, error = read_strict_boolean(request, "confirm")
        if error:
            return Response({"error": error}, status=400)

        from core.services.gdpr_service import GDPRService

        result = GDPRService.erase_user_data(request.user, confirm=confirm)

        if "error" in result:
            return Response(result, status=400)
        return Response(result)


class PrivacyInfoView(APIView):
    """
    GET /api/v1/privacy/info/
    Public endpoint with data processing information (GDPR Art. 13/14).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.gdpr_service import GDPRService

        return Response(GDPRService.get_data_processing_info())
