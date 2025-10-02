"""
Guardian API Views
==================
RESTful API endpoints for the Statistical Guardian system.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
import numpy as np
import json
from typing import Dict, Any, List
import traceback

from .guardian_core import GuardianCore, GuardianReport


class GuardianCheckView(APIView):
    """
    Main Guardian endpoint for checking statistical assumptions

    POST /api/guardian/check/
    """
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def post(self, request):
        """
        Check statistical assumptions for given data and test type

        Expected JSON payload:
        {
            "data": [...] or {"group1": [...], "group2": [...]},
            "test_type": "t_test" | "anova" | "pearson" | etc.,
            "alpha": 0.05 (optional)
        }
        """
        try:
            # Extract parameters
            data = request.data.get('data')
            test_type = request.data.get('test_type', 't_test')
            alpha = request.data.get('alpha', 0.05)

            # Validate input
            if not data:
                return Response(
                    {'error': 'Data is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not isinstance(data, (list, dict)):
                return Response(
                    {'error': 'Data must be a list or dictionary of lists'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Initialize Guardian
            guardian = GuardianCore()

            # Perform check
            report = guardian.check(data, test_type, alpha)

            # Convert report to JSON-serializable format
            response_data = self._serialize_report(report)

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Guardian error: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Guardian check failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _serialize_report(self, report: GuardianReport) -> Dict[str, Any]:
        """Convert GuardianReport to JSON-serializable dictionary"""
        return {
            'test_type': report.test_type,
            'data_summary': report.data_summary,
            'assumptions_checked': report.assumptions_checked,
            'violations': [
                {
                    'assumption': v.assumption,
                    'test_name': v.test_name,
                    'severity': v.severity,
                    'p_value': v.p_value,
                    'statistic': v.statistic,
                    'message': v.message,
                    'recommendation': v.recommendation,
                    'visual_evidence': v.visual_evidence
                }
                for v in report.violations
            ],
            'can_proceed': report.can_proceed,
            'alternative_tests': report.alternative_tests,
            'confidence_score': report.confidence_score,
            'visual_evidence': report.visual_evidence,
            'guardian_status': self._get_status_message(report)
        }

    def _get_status_message(self, report: GuardianReport) -> Dict[str, str]:
        """Generate user-friendly status message"""
        if report.can_proceed:
            if not report.violations:
                return {
                    'level': 'success',
                    'message': '✅ All assumptions satisfied. Safe to proceed with analysis.',
                    'emoji': '🛡️'
                }
            else:
                return {
                    'level': 'warning',
                    'message': '⚠️ Minor violations detected but analysis can proceed with caution.',
                    'emoji': '🔍'
                }
        else:
            return {
                'level': 'danger',
                'message': '🚫 Critical assumption violations detected. Analysis results may be invalid.',
                'emoji': '⛔'
            }


class GuardianValidateNormalityView(APIView):
    """Dedicated endpoint for normality checking"""
    permission_classes = [AllowAny]  # ✅ FIXED: Allow public access like other Guardian endpoints

    def post(self, request):
        """
        Check normality for given data

        POST /api/guardian/validate/normality/
        """
        try:
            data = request.data.get('data', [])
            alpha = request.data.get('alpha', 0.05)

            if not data:
                return Response(
                    {'error': 'Data is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Convert to numpy array
            arr = np.array(data)

            # Check normality
            from .guardian_core import NormalityValidator
            validator = NormalityValidator()
            result = validator.validate([arr], alpha)

            return Response({
                'is_normal': not result['violated'],
                'details': result
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GuardianDetectOutliersView(APIView):
    """Dedicated endpoint for outlier detection"""
    permission_classes = [AllowAny]  # ✅ FIXED: Allow public access like other Guardian endpoints

    def post(self, request):
        """
        Detect outliers in given data

        POST /api/guardian/detect/outliers/
        """
        try:
            data = request.data.get('data', [])

            if not data:
                return Response(
                    {'error': 'Data is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Convert to numpy array
            arr = np.array(data)

            # Detect outliers
            from .guardian_core import OutlierDetector
            detector = OutlierDetector()
            result = detector.validate([arr])

            return Response({
                'has_outliers': result['violated'],
                'details': result
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GuardianTestRequirementsView(APIView):
    """Get requirements for a specific statistical test"""

    @method_decorator(cache_page(60 * 60))  # Cache for 1 hour
    def get(self, request, test_type=None):
        """
        Get assumption requirements for a test

        GET /api/guardian/requirements/{test_type}/
        """
        guardian = GuardianCore()

        if test_type:
            requirements = guardian.test_requirements.get(test_type)
            if not requirements:
                return Response(
                    {'error': f'Unknown test type: {test_type}'},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response({
                'test_type': test_type,
                'requirements': requirements,
                'description': self._get_test_description(test_type)
            }, status=status.HTTP_200_OK)
        else:
            # Return all test requirements
            return Response({
                'available_tests': list(guardian.test_requirements.keys()),
                'requirements': guardian.test_requirements
            }, status=status.HTTP_200_OK)

    def _get_test_description(self, test_type: str) -> str:
        """Get human-readable description of test"""
        descriptions = {
            't_test': 'Compare means between two groups',
            'anova': 'Compare means across multiple groups',
            'pearson': 'Measure linear correlation between variables',
            'regression': 'Model relationship between variables',
            'chi_square': 'Test independence of categorical variables',
            'mann_whitney': 'Non-parametric alternative to t-test',
            'kruskal_wallis': 'Non-parametric alternative to ANOVA'
        }
        return descriptions.get(test_type, 'Statistical test')


class GuardianHealthCheckView(APIView):
    """Health check endpoint for Guardian system"""
    permission_classes = [AllowAny]  # Allow public access to health check

    def get(self, request):
        """
        Check if Guardian system is operational

        GET /api/guardian/health/
        """
        try:
            # Test Guardian with sample data
            guardian = GuardianCore()
            test_data = [1, 2, 3, 4, 5]
            report = guardian.check(test_data, 't_test')

            return Response({
                'status': 'operational',
                'message': 'Guardian system is protecting your statistics',
                'golden_ratio': '1.618033988749895',
                'validators_available': list(guardian.validators.keys()),
                'tests_supported': list(guardian.test_requirements.keys())
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)