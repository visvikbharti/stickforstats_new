"""
High-Precision Categorical Analysis Views
==========================================
Provides API endpoints for categorical data analysis with 50 decimal precision.

Author: StickForStats Development Team
Date: September 17, 2025
Version: 1.0.0
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
import numpy as np
import logging
from typing import Dict, Any, List, Optional

# Import our high-precision categorical module
from core.hp_categorical_comprehensive import HighPrecisionCategorical
from .parameter_adapter import parameter_adapter

# Set up logging
logger = logging.getLogger(__name__)

# Initialize calculator
categorical_calculator = HighPrecisionCategorical()


def adapt_categorical_params(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adapt various parameter formats to expected format.
    Handles backward compatibility for all parameter variations.
    """
    # Use the universal adapter
    adapted = parameter_adapter.adapt_parameters('categorical', data)

    # Additional specific adaptations for categorical tests
    # For Chi-square: Map to contingency_table
    if 'table' in adapted and 'contingency_table' not in adapted:
        adapted['contingency_table'] = adapted.get('table')
    if 'data' in adapted and 'contingency_table' not in adapted:
        adapted['contingency_table'] = adapted.get('data')

    # For Fisher's: Map contingency_table to table
    if 'contingency_table' in adapted and 'table' not in adapted:
        adapted['table'] = adapted.get('contingency_table')

    # Map observed/expected for goodness of fit
    if 'obs' in adapted and 'observed' not in adapted:
        adapted['observed'] = adapted.get('obs')
    if 'exp' in adapted and 'expected' not in adapted:
        adapted['expected'] = adapted.get('exp')

    # For Binomial: Map various parameter names to what the test expects (successes, n)
    # Map trials → n
    if 'trials' in adapted and 'n' not in adapted:
        adapted['n'] = adapted.get('trials')
    # Keep successes as is, but also map k → successes
    if 'k' in adapted and 'successes' not in adapted:
        adapted['successes'] = adapted.get('k')
    # Map probability → p
    if 'probability' in adapted and 'p' not in adapted:
        adapted['p'] = adapted.get('probability')
    if 'prob' in adapted and 'p' not in adapted:
        adapted['p'] = adapted.get('prob')

    return adapted


@api_view(['POST'])
@permission_classes([AllowAny])
def chi_square_independence_test(request):
    """
    Perform chi-square test of independence with 50 decimal precision.

    Expected JSON payload:
    {
        "contingency_table": [[10, 20, 30], [15, 25, 35]],
        "alpha": 0.05,
        "yates_correction": false
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        if 'contingency_table' not in data:
            return Response(
                {'error': 'Missing required parameter: contingency_table'},
                status=status.HTTP_400_BAD_REQUEST
            )

        contingency_table = np.array(data.get('contingency_table'))
        alpha = data.get('alpha', 0.05)
        yates_correction = data.get('yates_correction', False)

        # Perform calculation with 50 decimal precision
        result = categorical_calculator.chi_square_independence(
            contingency_table,
            correction=yates_correction
        )

        logger.info(f"Chi-square test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'chi_square_independence'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in chi-square test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def chi_square_goodness_of_fit(request):
    """
    Perform chi-square goodness of fit test with 50 decimal precision.

    Expected JSON payload:
    {
        "observed": [10, 15, 20, 25],
        "expected": [12, 13, 22, 23],
        "alpha": 0.05
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        if 'observed' not in data:
            return Response(
                {'error': 'Missing required parameter: observed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        observed = np.array(data.get('observed'))
        expected = data.get('expected', None)
        alpha = data.get('alpha', 0.05)

        if expected is not None:
            expected = np.array(expected)

        # Perform calculation
        result = categorical_calculator.chi_square_goodness_of_fit(
            observed,
            expected=expected
        )

        logger.info(f"Goodness of fit test completed for user {request.user.id}")

        return Response({
            'success': True,
            'high_precision_result': result.to_dict(),
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'chi_square_goodness_of_fit',
            'metadata': {
                'precision': 50,
                'algorithm': 'high_precision_decimal',
                'version': '1.0.0'
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in goodness of fit test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def fishers_exact_test(request):
    """
    Perform Fisher's exact test with 50 decimal precision.

    Expected JSON payload:
    {
        "table": [[8, 2], [1, 9]],
        "alternative": "two-sided"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        if 'table' not in data:
            return Response(
                {'error': 'Missing required parameter: table'},
                status=status.HTTP_400_BAD_REQUEST
            )

        table = np.array(data.get('table'))
        alternative = data.get('alternative', 'two-sided')

        # Validate table is 2x2
        if table.shape != (2, 2):
            return Response(
                {'error': 'Fisher\'s exact test requires a 2x2 contingency table'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Perform calculation
        result = categorical_calculator.fisher_exact_test(
            table,
            alternative=alternative
        )

        logger.info(f"Fisher's exact test completed for user {request.user.id}")

        return Response({
            'success': True,
            'high_precision_result': result.to_dict(),
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'fishers_exact',
            'metadata': {
                'precision': 50,
                'algorithm': 'high_precision_decimal',
                'version': '1.0.0'
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Fisher's exact test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def mcnemar_test(request):
    """
    Perform McNemar's test with 50 decimal precision.

    Expected JSON payload:
    {
        "table": [[10, 5], [2, 20]],
        "exact": false,
        "correction": true
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        if 'table' not in data:
            return Response(
                {'error': 'Missing required parameter: table'},
                status=status.HTTP_400_BAD_REQUEST
            )

        table = np.array(data.get('table'))
        exact = data.get('exact', False)
        correction = data.get('correction', True)

        # Validate table is 2x2
        if table.shape != (2, 2):
            return Response(
                {'error': 'McNemar test requires a 2x2 contingency table'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Perform calculation
        result = categorical_calculator.mcnemar_test(
            table,
            correction=correction
        )

        logger.info(f"McNemar test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'mcnemar'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in McNemar test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def cochrans_q_test(request):
    """
    Perform Cochran's Q test with 50 decimal precision.

    Expected JSON payload:
    {
        "data": [[1, 0, 1], [1, 1, 0], [0, 1, 1]],
        "alpha": 0.05
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        test_data = np.array(data.get('data'))
        alpha = data.get('alpha', 0.05)

        # Perform calculation
        result = categorical_calculator.cochrans_q(
            test_data,
            alpha=alpha
        )

        logger.info(f"Cochran's Q test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'cochrans_q'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Cochran's Q test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def g_test(request):
    """
    Perform G-test (likelihood ratio test) with 50 decimal precision.

    Expected JSON payload:
    {
        "observed": [[10, 20], [30, 40]],
        "alpha": 0.05,
        "williams_correction": true
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        if 'observed' not in data:
            return Response(
                {'error': 'Missing required parameter: observed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        observed = np.array(data.get('observed'))
        alpha = data.get('alpha', 0.05)  # Keep for potential future use
        # williams_correction is applied automatically by g_test when n < 200

        # Perform calculation (g_test doesn't accept alpha/williams_correction params)
        result = categorical_calculator.g_test(observed)

        logger.info(f"G-test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'g_test'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in G-test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def binomial_test(request):
    """
    Perform binomial test with 50 decimal precision.

    Expected JSON payload:
    {
        "successes": 7,
        "n": 10,
        "p": 0.5,
        "alternative": "two-sided"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        required = ['successes', 'n']
        for param in required:
            if param not in data:
                return Response(
                    {'error': f'Missing required parameter: {param}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        successes = data.get('successes')
        n = data.get('n')
        p = data.get('p', 0.5)
        alternative = data.get('alternative', 'two-sided')

        # Perform calculation
        result = categorical_calculator.binomial_test(
            successes, n, p,
            alternative=alternative
        )

        logger.info(f"Binomial test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'binomial_test'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in binomial test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def multinomial_test(request):
    """
    Perform multinomial test with 50 decimal precision.

    Expected JSON payload:
    {
        "observed": [10, 20, 30, 40],
        "expected_probs": [0.2, 0.3, 0.3, 0.2],
        "alpha": 0.05
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        if 'observed' not in data:
            return Response(
                {'error': 'Missing required parameter: observed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        observed = np.array(data.get('observed'))
        expected_probs = data.get('expected_probs', None)
        alpha = data.get('alpha', 0.05)

        if expected_probs is not None:
            expected_probs = np.array(expected_probs)

        # Perform calculation
        result = categorical_calculator.multinomial_test(
            observed,
            expected_probs=expected_probs,
            alpha=alpha
        )

        logger.info(f"Multinomial test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'multinomial_test'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in multinomial test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def categorical_effect_sizes(request):
    """
    Calculate effect sizes for categorical data with 50 decimal precision.

    Expected JSON payload:
    {
        "contingency_table": [[10, 20], [30, 40]],
        "effect_sizes": ["cramers_v", "phi", "odds_ratio", "risk_ratio"]
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_categorical_params(request.data)

        # Validate required parameters
        if 'contingency_table' not in data:
            return Response(
                {'error': 'Missing required parameter: contingency_table'},
                status=status.HTTP_400_BAD_REQUEST
            )

        contingency_table = np.array(data.get('contingency_table'))
        requested_sizes = data.get('effect_sizes', ['cramers_v', 'phi', 'odds_ratio'])

        # Calculate all effect sizes
        result = categorical_calculator.calculate_effect_sizes(
            contingency_table,
            requested_sizes
        )

        logger.info(f"Effect sizes calculated for user {request.user.id}")

        # Convert Decimal values to strings for JSON serialization
        results_serialized = {k: str(v) for k, v in result.items()}

        return Response({
            'success': True,
            'results': results_serialized,
            'precision': '50 decimal places',
            'method': 'effect_sizes'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error calculating effect sizes: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )