"""
High-Precision Non-Parametric Tests Views
==========================================
Provides API endpoints for non-parametric statistical tests with 50 decimal precision.
Now with flexible parameter support for backward compatibility.

Author: StickForStats Development Team
Date: September 17, 2025
Version: 1.1.0
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
import numpy as np
import logging
from typing import Dict, Any, List, Optional

# Import our high-precision non-parametric module
from core.hp_nonparametric_comprehensive import HighPrecisionNonParametric
from .parameter_adapter import parameter_adapter

# Set up logging
logger = logging.getLogger(__name__)

# Initialize calculator
nonparametric_calculator = HighPrecisionNonParametric()


def adapt_nonparametric_params(data: Dict[str, Any], original_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Adapt various parameter formats to expected format.
    Handles backward compatibility for all parameter variations.
    """
    if original_data is None:
        original_data = data

    # Use the universal adapter
    adapted = parameter_adapter.adapt_parameters('nonparametric', data)

    # Additional specific adaptations for non-parametric tests

    # For Mann-Whitney U Test ONLY
    # Map data1/data2 to group1/group2 (but NOT x/y, as those are used by Wilcoxon)
    if 'data1' in adapted and 'group1' not in adapted and 'x' not in original_data:
        adapted['group1'] = adapted.get('data1')
    if 'data2' in adapted and 'group2' not in adapted and 'y' not in original_data:
        adapted['group2'] = adapted.get('data2')

    # For Wilcoxon Signed-Rank Test and Sign Test
    # These tests expect x/y, so preserve them if present
    # Map data1/data2, before/after to x/y
    if 'data1' in adapted and 'x' not in adapted:
        adapted['x'] = adapted.get('data1')
    elif 'before' in adapted and 'x' not in adapted:
        adapted['x'] = adapted.get('before')

    if 'data2' in adapted and 'y' not in adapted:
        adapted['y'] = adapted.get('data2')
    elif 'after' in adapted and 'y' not in adapted:
        adapted['y'] = adapted.get('after')

    # For Kruskal-Wallis Test
    # Map data, samples to groups
    if 'groups' not in adapted:
        if 'data' in adapted:
            adapted['groups'] = adapted.get('data')
        elif 'samples' in adapted:
            adapted['groups'] = adapted.get('samples')

    # For Friedman Test
    # Map data, groups to measurements
    if 'measurements' not in adapted:
        if 'data' in adapted:
            adapted['measurements'] = adapted.get('data')
        elif 'groups' in adapted:
            adapted['measurements'] = adapted.get('groups')

    return adapted


@api_view(['POST'])
@permission_classes([AllowAny])
def mann_whitney_u_test(request):
    """
    Perform Mann-Whitney U test with 50 decimal precision.

    Expected JSON payload:
    {
        "group1": [12.5, 14.2, 11.8, 15.3, 13.7],
        "group2": [10.2, 9.8, 11.1, 8.9, 10.5],
        "alternative": "two-sided",
        "use_continuity": true,
        "calculate_effect_size": true
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_nonparametric_params(request.data, request.data)

        # Validate required parameters
        if 'group1' not in data or 'group2' not in data:
            return Response(
                {'error': 'Missing required parameters: group1 and group2'},
                status=status.HTTP_400_BAD_REQUEST
            )

        group1 = np.array(data.get('group1'))
        group2 = np.array(data.get('group2'))
        alternative = data.get('alternative', 'two-sided')
        use_continuity = data.get('use_continuity', True)
        calculate_effect_size = data.get('calculate_effect_size', True)

        # Perform calculation with 50 decimal precision
        result = nonparametric_calculator.mann_whitney_u(
            group1, group2,
            alternative=alternative,
            use_continuity=use_continuity
        )

        logger.info(f"Mann-Whitney U test completed for user {request.user.id}")

        return Response({
            'success': True,
            'high_precision_result': result.to_dict(),
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'mann_whitney_u',
            'metadata': {
                'precision': 50,
                'algorithm': 'high_precision_decimal',
                'version': '1.0.0'
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Mann-Whitney U test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def wilcoxon_signed_rank_test(request):
    """
    Perform Wilcoxon signed-rank test with 50 decimal precision.

    Expected JSON payload:
    {
        "x": [1.2, 2.3, 3.4, 4.5],
        "y": [1.5, 2.1, 3.6, 4.2],
        "alternative": "two-sided",
        "zero_method": "pratt",
        "correction": false
    }
    """
    try:
        # For Wilcoxon, we need x/y specifically, so handle this specially
        data = dict(request.data)  # Make a copy

        # Handle alternative parameter variations
        if 'alternative' in data and data['alternative'] == 'two-sided':
            data['alternative'] = 'two-sided'  # Keep as is
        elif 'alternative' in data and data['alternative'] == 'two_sided':
            data['alternative'] = 'two-sided'

        # Map common variations to x/y
        if 'data1' in data and 'x' not in data:
            data['x'] = data['data1']
        if 'data2' in data and 'y' not in data:
            data['y'] = data['data2']
        if 'before' in data and 'x' not in data:
            data['x'] = data['before']
        if 'after' in data and 'y' not in data:
            data['y'] = data['after']
        if 'group1' in data and 'x' not in data:
            data['x'] = data['group1']
        if 'group2' in data and 'y' not in data:
            data['y'] = data['group2']

        # Validate required parameters
        if 'x' not in data:
            return Response(
                {'error': f'Missing required parameter: x. Keys: {list(data.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        x = np.array(data.get('x'))
        y = data.get('y', None)
        alternative = data.get('alternative', 'two-sided')
        zero_method = data.get('zero_method', 'pratt')
        correction = data.get('correction', False)

        if y is not None:
            y = np.array(y)

        # Perform calculation
        result = nonparametric_calculator.wilcoxon_signed_rank(
            x, y,
            alternative=alternative,
            zero_method=zero_method,
            correction=correction
        )

        logger.info(f"Wilcoxon signed-rank test completed for user {request.user.id}")

        return Response({
            'success': True,
            'high_precision_result': result.to_dict(),
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'wilcoxon_signed_rank',
            'metadata': {
                'precision': 50,
                'algorithm': 'high_precision_decimal',
                'version': '1.0.0'
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Wilcoxon test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def kruskal_wallis_test(request):
    """
    Perform Kruskal-Wallis test with 50 decimal precision.

    Expected JSON payload:
    {
        "groups": [[12, 14, 11], [15, 17, 16], [9, 10, 8]],
        "nan_policy": "omit",
        "calculate_effect_size": true
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_nonparametric_params(request.data, request.data)

        # Validate required parameters
        if 'groups' not in data:
            return Response(
                {'error': 'Missing required parameter: groups'},
                status=status.HTTP_400_BAD_REQUEST
            )

        groups = [np.array(g) for g in data.get('groups')]
        nan_policy = data.get('nan_policy', 'omit')
        calculate_effect_size = data.get('calculate_effect_size', True)

        # Perform calculation
        result = nonparametric_calculator.kruskal_wallis(
            *groups,
            nan_policy=nan_policy
        )

        logger.info(f"Kruskal-Wallis test completed for user {request.user.id}")

        return Response({
            'success': True,
            'high_precision_result': result.to_dict(),
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'kruskal_wallis',
            'metadata': {
                'precision': 50,
                'algorithm': 'high_precision_decimal',
                'version': '1.0.0'
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Kruskal-Wallis test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def friedman_test(request):
    """
    Perform Friedman test with 50 decimal precision.

    Expected JSON payload:
    {
        "measurements": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        "calculate_effect_size": true
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_nonparametric_params(request.data, request.data)

        # Validate required parameters
        if 'measurements' not in data:
            return Response(
                {'error': 'Missing required parameter: measurements'},
                status=status.HTTP_400_BAD_REQUEST
            )

        measurements = np.array(data.get('measurements'))
        calculate_effect_size = data.get('calculate_effect_size', True)

        # Perform calculation
        result = nonparametric_calculator.friedman(
            measurements
        )

        logger.info(f"Friedman test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'friedman'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Friedman test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def sign_test(request):
    """
    Perform sign test with 50 decimal precision.

    Expected JSON payload:
    {
        "x": [1.2, 2.3, 3.4, 4.5],
        "y": [1.5, 2.1, 3.6, 4.2],
        "alternative": "two-sided"
    }
    """
    try:
        # For Sign test, we need x/y specifically, handle like Wilcoxon
        data = dict(request.data)  # Make a copy

        # Handle alternative parameter variations
        if 'alternative' in data and data['alternative'] == 'two_sided':
            data['alternative'] = 'two-sided'

        # Map common variations to x/y
        if 'data1' in data and 'x' not in data:
            data['x'] = data['data1']
        if 'data2' in data and 'y' not in data:
            data['y'] = data['data2']
        if 'before' in data and 'x' not in data:
            data['x'] = data['before']
        if 'after' in data and 'y' not in data:
            data['y'] = data['after']
        if 'group1' in data and 'x' not in data:
            data['x'] = data['group1']
        if 'group2' in data and 'y' not in data:
            data['y'] = data['group2']

        # Validate required parameters
        if 'x' not in data:
            return Response(
                {'error': 'Missing required parameter: x'},
                status=status.HTTP_400_BAD_REQUEST
            )

        x = np.array(data.get('x'))
        y = data.get('y', None)
        alternative = data.get('alternative', 'two-sided')

        if y is not None:
            y = np.array(y)

        # Perform calculation
        result = nonparametric_calculator.sign_test(
            x, y,
            alternative=alternative
        )

        logger.info(f"Sign test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'sign_test'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in sign test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def moods_median_test(request):
    """
    Perform Mood's median test with 50 decimal precision.

    Expected JSON payload:
    {
        "groups": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        "ties": "average",
        "nan_policy": "omit"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_nonparametric_params(request.data, request.data)

        # Validate required parameters
        if 'groups' not in data:
            return Response(
                {'error': 'Missing required parameter: groups'},
                status=status.HTTP_400_BAD_REQUEST
            )

        groups = [np.array(g) for g in data.get('groups')]
        ties = data.get('ties', 'average')
        nan_policy = data.get('nan_policy', 'omit')

        # Perform calculation
        result = nonparametric_calculator.moods_median(
            *groups,
            ties=ties,
            nan_policy=nan_policy
        )

        logger.info(f"Mood's median test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'moods_median'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Mood's median test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def jonckheere_terpstra_test(request):
    """
    Perform Jonckheere-Terpstra test with 50 decimal precision.

    Expected JSON payload:
    {
        "groups": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        "alternative": "increasing"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_nonparametric_params(request.data, request.data)

        # Validate required parameters
        if 'groups' not in data:
            return Response(
                {'error': 'Missing required parameter: groups'},
                status=status.HTTP_400_BAD_REQUEST
            )

        groups = [np.array(g) for g in data.get('groups')]
        alternative = data.get('alternative', 'increasing')

        # Perform calculation
        result = nonparametric_calculator.jonckheere_terpstra(
            groups,
            alternative=alternative
        )

        logger.info(f"Jonckheere-Terpstra test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'jonckheere_terpstra'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Jonckheere-Terpstra test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def pages_trend_test(request):
    """
    Perform Page's trend test with 50 decimal precision.

    Expected JSON payload:
    {
        "data": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        "ranked": false
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_nonparametric_params(request.data, request.data)

        # Validate required parameters
        # ✅ FIXED: Accept both 'data' and 'groups' (adapter transforms data → groups)
        if 'data' not in data and 'groups' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get data from either 'data' or 'groups' (adapter may have transformed it)
        test_data = np.array(data.get('data') if 'data' in data else data.get('groups'))
        ranked = data.get('ranked', False)

        # Perform calculation
        result = nonparametric_calculator.pages_trend(
            test_data,
            ranked=ranked
        )

        logger.info(f"Page's trend test completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': 'pages_trend'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Page's trend test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def nonparametric_post_hoc(request):
    """
    Perform post-hoc tests for non-parametric analyses with 50 decimal precision.

    Expected JSON payload:
    {
        "groups": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        "test_type": "dunn",
        "p_adjust": "bonferroni"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_nonparametric_params(request.data, request.data)

        # Validate required parameters
        if 'groups' not in data:
            return Response(
                {'error': 'Missing required parameter: groups'},
                status=status.HTTP_400_BAD_REQUEST
            )

        groups = [np.array(g) for g in data.get('groups')]
        test_type = data.get('test_type', 'dunn')
        p_adjust = data.get('p_adjust', 'bonferroni')

        # Perform calculation based on test type
        if test_type == 'dunn':
            result = nonparametric_calculator.dunn_test(
                *groups,  # ✅ FIXED: Unpack groups as *args
                method=p_adjust  # ✅ FIXED: Parameter name is 'method', not 'p_adjust'
            )
        elif test_type == 'nemenyi':
            result = nonparametric_calculator.nemenyi_test(groups)
        elif test_type == 'conover':
            result = nonparametric_calculator.conover_test(
                groups,
                p_adjust=p_adjust
            )
        else:
            return Response(
                {'error': f'Unknown post-hoc test type: {test_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(f"Post-hoc test ({test_type}) completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': f'post_hoc_{test_type}'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in post-hoc test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def nonparametric_effect_sizes(request):
    """
    Calculate effect sizes for non-parametric tests with 50 decimal precision.

    Expected JSON payload:
    {
        "test_type": "mann_whitney",
        "data": {
            "group1": [1, 2, 3],
            "group2": [4, 5, 6]
        }
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_nonparametric_params(request.data, request.data)

        # Validate required parameters
        if 'test_type' not in data or 'data' not in data:
            return Response(
                {'error': 'Missing required parameters: test_type and data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        test_type = data.get('test_type')
        test_data = data.get('data')

        # Calculate effect size based on test type
        if test_type == 'mann_whitney':
            group1 = np.array(test_data.get('group1'))
            group2 = np.array(test_data.get('group2'))
            result = nonparametric_calculator.rank_biserial_correlation(group1, group2)
        elif test_type == 'kruskal_wallis':
            groups = [np.array(g) for g in test_data.get('groups')]
            result = nonparametric_calculator.epsilon_squared(groups)
        elif test_type == 'friedman':
            measurements = np.array(test_data.get('measurements'))
            result = nonparametric_calculator.kendalls_w(measurements)
        else:
            return Response(
                {'error': f'Unknown test type for effect size: {test_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(f"Effect size calculation completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result.to_dict(),
            'precision': '50 decimal places',
            'method': f'effect_size_{test_type}'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error calculating effect size: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )