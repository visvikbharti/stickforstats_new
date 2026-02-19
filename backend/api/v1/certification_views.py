"""
Certification Program Views
============================
REST endpoints for the StickForStats Certified Analyst program.
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class CertificationLevelsView(APIView):
    """
    GET /api/v1/certification/levels/
    List all certification levels with requirements.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.certification_service import CertificationService
        levels = CertificationService.get_certification_levels()
        return Response({'levels': levels})


class CertificationLevelDetailView(APIView):
    """
    GET /api/v1/certification/levels/<level_id>/
    Get details for a specific certification level.
    """
    permission_classes = [AllowAny]

    def get(self, request, level_id):
        from core.services.certification_service import CertificationService

        level = CertificationService.get_level_details(level_id)
        if not level:
            return Response({'error': 'Certification level not found'}, status=404)

        prereq_check = None
        if request.user.is_authenticated:
            prereq_check = CertificationService.check_prerequisites(request.user, level_id)

        return Response({
            **level,
            'prerequisites_check': prereq_check,
        })


class ExamStartView(APIView):
    """
    POST /api/v1/certification/exam/start/
    Start a certification exam. Returns questions without answers.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)

        level_id = request.data.get('level_id')
        if not level_id:
            return Response({'error': 'level_id is required'}, status=400)

        from core.services.certification_service import CertificationService

        prereq = CertificationService.check_prerequisites(request.user, level_id)
        if not prereq.get('met'):
            return Response({
                'error': 'Prerequisites not met',
                'details': prereq,
            }, status=403)

        exam = CertificationService.generate_exam(level_id)
        if not exam:
            return Response({'error': 'Could not generate exam'}, status=500)

        return Response(exam)


class ExamSubmitView(APIView):
    """
    POST /api/v1/certification/exam/submit/
    Submit exam answers for grading.
    Body: { "level_id": "foundations", "answers": {"f001": 0, "f002": 1, ...} }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)

        level_id = request.data.get('level_id')
        answers = request.data.get('answers', {})

        if not level_id:
            return Response({'error': 'level_id is required'}, status=400)
        if not answers:
            return Response({'error': 'answers are required'}, status=400)

        from core.services.certification_service import CertificationService

        result = CertificationService.grade_exam(level_id, answers)
        if 'error' in result:
            return Response(result, status=400)

        return Response(result)


class CertificateVerifyView(APIView):
    """
    GET /api/v1/certification/verify/<certificate_id>/
    Public endpoint to verify a certificate's authenticity.
    """
    permission_classes = [AllowAny]

    def get(self, request, certificate_id):
        from core.services.certification_service import CertificationService
        result = CertificationService.verify_certificate(certificate_id)
        status_code = 200 if result.get('valid') else 404
        return Response(result, status=status_code)


class UserCertificationsView(APIView):
    """
    GET /api/v1/certification/my-certifications/
    List current user's certifications and exam history.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)

        # In production, query CertificationRecord model
        return Response({
            'certifications': [],
            'exam_history': [],
            'message': 'Certification records will be stored in the database in production',
        })
