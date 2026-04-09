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
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

logger = logging.getLogger(__name__)


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
        consent_type = request.data.get("consent_type")
        granted = request.data.get("granted")

        if consent_type is None or granted is None:
            return Response({"error": "consent_type and granted are required"}, status=400)

        ip = request.META.get("REMOTE_ADDR", "")
        ua = request.META.get("HTTP_USER_AGENT", "")

        from core.services.gdpr_service import GDPRService

        result = GDPRService.update_consent(request.user, consent_type, bool(granted), ip_address=ip, user_agent=ua)

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
    Requires explicit confirmation via confirm=true in request body.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        confirm = request.data.get("confirm", False)

        from core.services.gdpr_service import GDPRService

        result = GDPRService.erase_user_data(request.user, confirm=bool(confirm))

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
