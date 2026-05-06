"""
Certification Program Views
============================
REST endpoints for the StickForStats Certified Analyst program.
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


class CertificationLevelsView(APIView):
    """
    GET /api/v1/certification/levels/
    List all certification levels with requirements.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from core.services.certification_service import CertificationService

        levels = CertificationService.get_certification_levels()
        return Response({"levels": levels})


class CertificationLevelDetailView(APIView):
    """
    GET /api/v1/certification/levels/<level_id>/
    Get details for a specific certification level.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, level_id):
        from core.services.certification_service import CertificationService

        level = CertificationService.get_level_details(level_id)
        if not level:
            return Response({"error": "Certification level not found"}, status=404)

        prereq_check = CertificationService.check_prerequisites(request.user, level_id)

        return Response(
            {
                **level,
                "prerequisites_check": prereq_check,
            }
        )


class ExamStartView(APIView):
    """
    POST /api/v1/certification/exam/start/
    Start a certification exam. Returns questions without answers.

    Body: ``{"level_id": "foundations"}``

    Response includes ``attempt_id`` --- the client must echo this
    back to /exam/submit/ so the server can grade against the original
    question-id snapshot and reject re-submission.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        level_id = request.data.get("level_id")
        if not level_id:
            return Response({"error": "level_id is required"}, status=400)

        from core.services.certification_service import CertificationService

        prereq = CertificationService.check_prerequisites(request.user, level_id)
        if not prereq.get("met"):
            return Response(
                {
                    "error": "Prerequisites not met",
                    "details": prereq,
                },
                status=403,
            )

        exam = CertificationService.generate_exam(level_id, user=request.user)
        if not exam:
            return Response({"error": "Could not generate exam"}, status=500)

        return Response(exam)


class ExamSubmitView(APIView):
    """
    POST /api/v1/certification/exam/submit/
    Submit exam answers for grading.

    Body: ``{"level_id": "foundations", "attempt_id": "<uuid>",
             "answers": {"<question_uuid>": 0, ...}}``

    The attempt_id is required so the server can grade against the
    same question-id snapshot it issued at /exam/start/ AND so an
    already-submitted attempt cannot be re-graded (replay protection).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        level_id = request.data.get("level_id")
        attempt_id = request.data.get("attempt_id")
        answers = request.data.get("answers", {})

        if not level_id:
            return Response({"error": "level_id is required"}, status=400)
        if not isinstance(answers, dict) or not answers:
            return Response({"error": "answers (dict of question_id -> option_index) are required"}, status=400)

        from core.services.certification_service import CertificationService

        result = CertificationService.grade_exam(
            level_id, answers, attempt_id=attempt_id, user=request.user
        )
        if "error" in result:
            return Response(result, status=400)

        return Response(result)


class CertificateVerifyView(APIView):
    """
    GET /api/v1/certification/verify/<certificate_id>/
    Public endpoint to verify a certificate's authenticity.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, certificate_id):
        from core.services.certification_service import CertificationService

        result = CertificationService.verify_certificate(certificate_id)
        status_code = 200 if result.get("valid") else 404
        return Response(result, status=status_code)


class UserCertificationsView(APIView):
    """
    GET /api/v1/certification/my-certifications/
    List current user's certifications and exam history.

    Both lists come from the DB-backed ``CertificationRecord`` and
    ``CertificationExamAttempt`` models; an empty list means the user
    has no records / attempts on file (not that the feature is
    unimplemented, as it did pre-2026-05-06).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from core.services.certification_service import CertificationService

        return Response(
            {
                "certifications": CertificationService.get_user_certifications(request.user),
                "exam_history": CertificationService.get_user_exam_history(request.user),
            }
        )
