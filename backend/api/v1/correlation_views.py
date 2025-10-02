"""
Correlation and Test Selection API Views
========================================
High-precision correlation analysis and automatic test selection endpoints.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
import numpy as np
import logging

from core.high_precision_calculator import HighPrecisionCalculator
from core.assumption_checker import AssumptionChecker
from core.validation_framework import StatisticalValidator
from .serializers import CorrelationRequestSerializer
from .parameter_adapter import parameter_adapter

logger = logging.getLogger(__name__)


class HighPrecisionCorrelationView(APIView):
    """
    High-precision correlation analysis with automatic test selection.

    Supports:
    - Pearson, Spearman, Kendall's Tau correlations
    - Automatic test selection based on data distribution
    - Comprehensive user guidance
    - 50 decimal precision
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Perform correlation analysis with automatic test selection
        """
        from core.hp_correlation_comprehensive import HighPrecisionCorrelation

        # Apply parameter adapter for flexibility
        adapted_data = parameter_adapter.adapt_parameters('correlation', request.data)

        serializer = CorrelationRequestSerializer(data=adapted_data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid input", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validated_data = serializer.validated_data

            # Initialize services
            correlation = HighPrecisionCorrelation(precision=50)
            assumption_checker = AssumptionChecker()

            # Extract data
            x = validated_data['x']
            y = validated_data['y']
            method = validated_data.get('method', 'auto')
            confidence_level = validated_data.get('parameters', {}).get('confidence_level', 0.95)
            options = validated_data.get('options', {})

            response_data = {
                "method": method,
                "high_precision_result": {},  # Will store high-precision correlation results
                "metadata": {
                    "precision": 50,
                    "algorithm": "high_precision_decimal",
                    "version": "1.0.0"
                }
            }

            # Auto correlation with all methods
            if method == 'auto' or options.get('auto_select', False):
                logger.info("Performing automatic correlation test selection")

                # Get automatic test selection
                result = correlation.auto_correlation(x, y, confidence_level)

                # Store primary result in high_precision_result
                response_data['high_precision_result'] = self._serialize_correlation_result(result['primary_result'])

                response_data.update({
                    "recommendation": result['recommendation'],
                    "primary_result": self._serialize_correlation_result(result['primary_result']),
                    "all_results": {
                        k: self._serialize_correlation_result(v) if v else None
                        for k, v in result['all_results'].items()
                    },
                    "comparison": result['comparison'],
                    "interpretation_guide": result['interpretation_guide'],
                    "visualization_data": result['visualization_data']
                })

            else:
                # Specific correlation method
                logger.info(f"Performing {method} correlation")

                if method == 'pearson':
                    result = correlation.pearson_correlation(x, y, confidence_level)
                elif method == 'spearman':
                    result = correlation.spearman_correlation(x, y, confidence_level)
                elif method == 'kendall':
                    result = correlation.kendall_tau(x, y, confidence_level)
                else:
                    return Response(
                        {"error": f"Unknown correlation method: {method}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Store result in high_precision_result
                response_data['high_precision_result'] = self._serialize_correlation_result(result)
                response_data['primary_result'] = self._serialize_correlation_result(result)

                # Generate interpretation
                response_data['interpretation'] = result.interpretation

            # Check assumptions
            if options.get('check_assumptions', True):
                logger.info("Checking correlation assumptions")
                assumptions = {
                    'x_normality': assumption_checker.check_normality(np.array(x)).to_dict(),
                    'y_normality': assumption_checker.check_normality(np.array(y)).to_dict(),
                    'x_outliers': assumption_checker.check_outliers(np.array(x)).to_dict(),
                    'y_outliers': assumption_checker.check_outliers(np.array(y)).to_dict()
                }
                response_data['assumptions'] = assumptions

            # Log successful calculation
            logger.info(f"Successfully calculated {method} correlation")

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error: {str(e)}")
            return Response(
                {"error": "Calculation error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _serialize_correlation_result(self, result):
        """Convert CorrelationResult to JSON-serializable dict"""
        if result is None:
            return None

        return {
            'correlation_coefficient': str(result.correlation_coefficient),
            'p_value': str(result.p_value),
            'confidence_interval_lower': str(result.confidence_interval_lower),
            'confidence_interval_upper': str(result.confidence_interval_upper),
            'test_statistic': str(result.test_statistic),
            'df': result.df,
            'sample_size': result.sample_size,
            'correlation_type': result.correlation_type,
            'r_squared': str(result.r_squared) if result.r_squared else None,
            'standard_error': str(result.standard_error) if result.standard_error else None,
            'interpretation': result.interpretation
        }


class AutomaticTestSelectorView(APIView):
    """
    Automatic statistical test selection based on data characteristics.

    Analyzes data distribution and research question to recommend
    the most appropriate statistical test.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Get test recommendation based on data and research question
        """
        from core.automatic_test_selector import (
            AutomaticTestSelector,
            ResearchQuestion,
            generate_user_guidance
        )

        try:
            # Parse request
            data = request.data.get('data', [])
            question_str = request.data.get('research_question', 'difference')
            context = request.data.get('context', {})

            # Map question string to enum
            question_map = {
                'difference': ResearchQuestion.DIFFERENCE,
                'correlation': ResearchQuestion.CORRELATION,
                'prediction': ResearchQuestion.PREDICTION,
                'association': ResearchQuestion.ASSOCIATION,
                'trend': ResearchQuestion.TREND,
                'normality': ResearchQuestion.NORMALITY
            }
            research_question = question_map.get(question_str, ResearchQuestion.DIFFERENCE)

            # Initialize selector
            selector = AutomaticTestSelector()

            # Analyze data
            logger.info("Analyzing data characteristics")
            data_profile = selector.analyze_data(data)

            # Get recommendation
            logger.info(f"Getting test recommendation for {research_question.value}")
            recommendation = selector.recommend_test(
                data_profile,
                research_question,
                context
            )

            # Generate user guidance
            guidance = generate_user_guidance(recommendation)

            # Prepare response
            response_data = {
                'recommendation': {
                    'primary_test': recommendation.primary_test,
                    'test_category': recommendation.test_category.value,
                    'confidence_score': recommendation.confidence_score,
                    'alternatives': recommendation.alternatives,
                    'reasoning': recommendation.reasoning,
                    'assumptions_violated': recommendation.assumptions_violated,
                    'warnings': recommendation.warnings,
                    'prerequisites': recommendation.prerequisites,
                    'interpretation_notes': recommendation.interpretation_notes,
                    'when_to_use': recommendation.when_to_use,
                    'when_not_to_use': recommendation.when_not_to_use,
                    'example_interpretation': recommendation.example_interpretation
                },
                'data_profile': {
                    'sample_size': data_profile.sample_size,
                    'num_variables': data_profile.num_variables,
                    'variable_types': {k: v.value for k, v in data_profile.variable_types.items()},
                    'normality': data_profile.normality,
                    'outliers': data_profile.outliers,
                    'missing_data': data_profile.missing_data
                },
                'user_guidance': guidance
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error in test selection: {str(e)}")
            return Response(
                {"error": "Test selection failed", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )