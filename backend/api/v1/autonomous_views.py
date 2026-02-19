"""
Autonomous Intelligence Layer — API Views
==========================================
REST API endpoints for the autonomous analysis pipeline.

Endpoints:
- POST /api/v1/autonomous/profile/    — Smart data profiling
- POST /api/v1/autonomous/query/      — Full autonomous query pipeline
- POST /api/v1/autonomous/cascade/    — Guardian cascade execution
- POST /api/v1/autonomous/translate/  — Plain language translation
- POST /api/v1/autonomous/next-step/  — Next step recommendations

Author: StickForStats Development Team
Created: February 2026
"""

import io
import json
import pandas as pd
import numpy as np
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import logging

from core.services.smart_profiler import SmartProfiler
from core.services.cascade_engine import AutonomousCascadeEngine
from core.services.plain_language_translator import PlainLanguageTranslator, OutputMode
from core.services.autonomous_query_handler import AutonomousQueryHandler

logger = logging.getLogger(__name__)


def _parse_dataframe(request) -> pd.DataFrame:
    """
    Parse a DataFrame from the request.
    Supports: CSV file upload, JSON body with data, or inline arrays.
    """
    # Option 1: File upload (CSV/Excel)
    if 'file' in request.FILES:
        uploaded = request.FILES['file']
        name = uploaded.name.lower()
        if name.endswith('.csv'):
            return pd.read_csv(uploaded)
        elif name.endswith(('.xls', '.xlsx')):
            return pd.read_excel(uploaded)
        else:
            raise ValueError(f"Unsupported file type: {name}. Use CSV or Excel.")

    # Option 2: JSON body with 'data' key (list of dicts or dict of lists)
    data = request.data
    if isinstance(data, dict):
        raw = data.get('data')
        if raw:
            if isinstance(raw, list):
                return pd.DataFrame(raw)
            elif isinstance(raw, dict):
                return pd.DataFrame(raw)
            elif isinstance(raw, str):
                return pd.read_csv(io.StringIO(raw))

    # Option 3: Full body is the data
    if isinstance(data, list):
        return pd.DataFrame(data)

    raise ValueError(
        "No data found. Send a CSV file as 'file', or JSON with a 'data' key "
        "(list of row dicts or dict of column arrays)."
    )


class SmartProfileView(APIView):
    """
    POST /api/v1/autonomous/profile/

    Upload data → get complete profile with research question inference,
    test recommendations, and data health card.

    Accepts:
    - File upload: multipart/form-data with 'file' field (CSV/Excel)
    - JSON body: {"data": [...]} with list of row dicts or dict of column arrays
    - Optional: "user_hint" string for guiding inference
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        try:
            df = _parse_dataframe(request)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if df.empty:
            return Response(
                {'error': 'Dataset is empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_hint = request.data.get('user_hint') if isinstance(request.data, dict) else None

        try:
            profiler = SmartProfiler()
            result = profiler.profile_and_recommend(df, user_hint=user_hint)
        except Exception as e:
            logger.error(f"SmartProfiler failed: {e}", exc_info=True)
            return Response(
                {'error': f'Profiling failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Serialize the result
        response_data = {
            'profile': {
                'n_rows': result.profile.n_rows,
                'n_columns': result.profile.n_columns,
                'total_missing': result.profile.total_missing,
                'missing_pattern': result.profile.missing_pattern,
            },
            'inferred_questions': [
                {
                    'type': q.question_type.value,
                    'text': q.question_text,
                    'variables': q.variables_involved,
                    'suggested_tests': q.suggested_tests,
                    'confidence': q.confidence,
                    'explanation': q.explanation,
                }
                for q in result.inferred_questions
            ],
            'data_health': {
                'overall_score': result.data_health.overall_score,
                'completeness_score': result.data_health.completeness_score,
                'quality_score': result.data_health.quality_score,
                'suitability_score': result.data_health.suitability_score,
                'issues': result.data_health.issues,
                'strengths': result.data_health.strengths,
            },
            'variables': result.variable_summary,
            'suggested_workflow': result.suggested_workflow,
            'recommendations': [
                {
                    'primary_test': rec.primary_test,
                    'confidence_score': rec.confidence_score,
                    'alternatives': rec.alternatives,
                    'reasoning': rec.reasoning,
                    'warnings': rec.warnings,
                }
                for rec in result.recommendations
            ],
        }

        return Response(response_data, status=status.HTTP_200_OK)


class AutonomousQueryView(APIView):
    """
    POST /api/v1/autonomous/query/

    Send a natural language query + data → get full pipeline results
    including Guardian-validated analysis and plain English translation.

    Body:
    {
        "query": "Is there a difference in scores between groups?",
        "data": [...],  // or upload via file
        "mode": "plain_english",  // or "researcher" or "apa_format"
        "alpha": 0.05
    }
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        try:
            df = _parse_dataframe(request)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        query_text = ''
        mode = OutputMode.PLAIN_ENGLISH
        alpha = 0.05

        if isinstance(request.data, dict):
            query_text = request.data.get('query', '')
            mode = request.data.get('mode', OutputMode.PLAIN_ENGLISH)
            try:
                alpha = float(request.data.get('alpha', 0.05))
            except (ValueError, TypeError):
                alpha = 0.05

        if not query_text:
            return Response(
                {'error': 'A "query" field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            handler = AutonomousQueryHandler()
            result = handler.handle_query(query_text, df, mode=mode, alpha=alpha)
        except Exception as e:
            logger.error(f"AutonomousQueryHandler failed: {e}", exc_info=True)
            return Response(
                {'error': f'Analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response_data = {
            'query': result.query,
            'parsed_intent': result.parsed_intent,
            'profile_summary': result.profile_summary,
            'cascade_result': result.cascade_result,
            'translation': result.translation,
            'inferred_questions': result.inferred_questions,
            'suggested_next_steps': result.suggested_next_steps,
            'confidence': result.confidence,
            'warnings': result.warnings,
        }

        return Response(response_data, status=status.HTTP_200_OK)


class CascadeExecuteView(APIView):
    """
    POST /api/v1/autonomous/cascade/

    Execute a specific test with Guardian cascade protection.

    Body:
    {
        "test": "independent_t",
        "data": {"group1": [1,2,3], "group2": [4,5,6]},
        "alpha": 0.05,
        "max_cascades": 3
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        test_name = request.data.get('test')
        data = request.data.get('data')
        alpha = float(request.data.get('alpha', 0.05))
        max_cascades = int(request.data.get('max_cascades', 3))

        if not test_name:
            return Response(
                {'error': '"test" field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not data:
            return Response(
                {'error': '"data" field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            engine = AutonomousCascadeEngine()
            result = engine.execute_with_cascade(data, test_name, alpha=alpha, max_cascades=max_cascades)
        except Exception as e:
            logger.error(f"CascadeEngine failed: {e}", exc_info=True)
            return Response(
                {'error': f'Cascade execution failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response_data = {
            'original_test': result.original_test,
            'final_test': result.final_test,
            'n_cascades': result.n_cascades,
            'assumptions_satisfied': result.assumptions_satisfied,
            'confidence_score': result.confidence_score,
            'cascade_path': [
                {
                    'test': step.test_attempted,
                    'passed': step.guardian_passed,
                    'violations': step.violations,
                    'alternatives': step.alternatives_suggested,
                }
                for step in result.cascade_path
            ],
            'result': {
                'test_name': result.result.test_name,
                'statistic': result.result.statistic,
                'p_value': result.result.p_value,
                'effect_size': result.result.effect_size,
                'effect_size_name': result.result.effect_size_name,
                'degrees_of_freedom': result.result.degrees_of_freedom,
                'additional': result.result.additional,
            } if result.result else None,
            'guardian_report': result.guardian_report,
        }

        return Response(response_data, status=status.HTTP_200_OK)


class TranslateResultsView(APIView):
    """
    POST /api/v1/autonomous/translate/

    Translate statistical results into plain English, researcher view, or APA format.

    Body:
    {
        "test_type": "independent_t",
        "results": {"statistic": 2.45, "p_value": 0.023, "effect_size": 0.65},
        "mode": "plain_english",
        "alpha": 0.05
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        test_type = request.data.get('test_type')
        results = request.data.get('results')
        mode = request.data.get('mode', OutputMode.PLAIN_ENGLISH)
        alpha = float(request.data.get('alpha', 0.05))

        if not test_type or not results:
            return Response(
                {'error': '"test_type" and "results" fields are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            translator = PlainLanguageTranslator()
            translation = translator.translate(test_type, results, mode=mode, alpha=alpha)
        except Exception as e:
            logger.error(f"Translation failed: {e}", exc_info=True)
            return Response(
                {'error': f'Translation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(translation, status=status.HTTP_200_OK)


class NextStepView(APIView):
    """
    POST /api/v1/autonomous/next-step/

    Get recommendations for what to do next.

    Body:
    {
        "has_data": true,
        "data_profiled": true,
        "test_executed": false,
        "results_translated": false
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        analysis_state = request.data if isinstance(request.data, dict) else {}

        try:
            handler = AutonomousQueryHandler()
            steps = handler.get_next_steps(analysis_state)
        except Exception as e:
            logger.error(f"NextStep failed: {e}", exc_info=True)
            return Response(
                {'error': f'Failed to get next steps: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({'next_steps': steps}, status=status.HTTP_200_OK)
