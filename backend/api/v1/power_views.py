"""
Power Analysis API Views
========================
API endpoints for high-precision power analysis with 50 decimal places.

This module provides REST API endpoints for:
- Power calculations for various tests
- Sample size determination
- Effect size detection
- Power curves generation
- Optimal allocation
- Sensitivity analysis

Author: StickForStats Development Team
Date: September 2025
Version: 1.0.0
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.views.decorators.cache import cache_page
from django.core.cache import cache
import logging
import json
from typing import Dict, Any, List, Optional

# Import the high-precision power analysis module
from core.hp_power_analysis_comprehensive import HighPrecisionPowerAnalysis
from .parameter_adapter import parameter_adapter

logger = logging.getLogger(__name__)

# Initialize the calculator
power_calculator = HighPrecisionPowerAnalysis()


def adapt_power_params(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adapt various parameter formats to expected format.
    Handles backward compatibility for all parameter variations.
    """
    # Use the universal adapter
    adapted = parameter_adapter.adapt_parameters('power', data)

    # Additional specific adaptations for power analysis
    # Map effect to effect_size
    if 'effect' in adapted and 'effect_size' not in adapted:
        adapted['effect_size'] = adapted['effect']
    if 'd' in adapted and 'effect_size' not in adapted:
        adapted['effect_size'] = adapted['d']

    # Map n to sample_size
    if 'n' in adapted and 'sample_size' not in adapted:
        adapted['sample_size'] = adapted['n']
    if 'size' in adapted and 'sample_size' not in adapted:
        adapted['sample_size'] = adapted['size']

    # For ANOVA - map sample_size to n_per_group
    if 'sample_size' in adapted and 'n_per_group' not in adapted:
        adapted['n_per_group'] = adapted['sample_size']
    if 'n' in adapted and 'n_per_group' not in adapted:
        adapted['n_per_group'] = adapted['n']

    # Map sig_level to alpha
    if 'sig_level' in adapted and 'alpha' not in adapted:
        adapted['alpha'] = adapted['sig_level']
    if 'significance' in adapted and 'alpha' not in adapted:
        adapted['alpha'] = adapted['significance']

    return adapted


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_power_t_test(request):
    """
    Calculate statistical power for t-tests with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.5,
        "sample_size": 64,
        "alpha": 0.05,
        "alternative": "two-sided",
        "test_type": "independent"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ['effect_size', 'sample_size']
        for param in required:
            if param not in data:
                return Response(
                    {'error': f'Missing required parameter: {param}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate power
        result = power_calculator.calculate_power_t_test(
            effect_size=data['effect_size'],
            sample_size=data['sample_size'],
            alpha=data.get('alpha', 0.05),
            alternative=data.get('alternative', 'two-sided'),
            test_type=data.get('test_type', 'independent')
        )

        # Log the analysis
        logger.info(f"T-test power calculation completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result,
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in t-test power calculation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_sample_size_t_test(request):
    """
    Calculate required sample size for t-tests with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.5,
        "power": 0.8,
        "alpha": 0.05,
        "alternative": "two-sided",
        "test_type": "independent"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ['effect_size']
        for param in required:
            if param not in data:
                return Response(
                    {'error': f'Missing required parameter: {param}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate sample size
        result = power_calculator.calculate_sample_size_t_test(
            effect_size=data['effect_size'],
            power=data.get('power', 0.8),
            alpha=data.get('alpha', 0.05),
            alternative=data.get('alternative', 'two-sided'),
            test_type=data.get('test_type', 'independent')
        )

        logger.info(f"Sample size calculation completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result,
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in sample size calculation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_effect_size_t_test(request):
    """
    Calculate detectable effect size for t-tests with 50 decimal precision.

    Expected JSON payload:
    {
        "sample_size": 64,
        "power": 0.8,
        "alpha": 0.05,
        "alternative": "two-sided",
        "test_type": "independent"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ['sample_size']
        for param in required:
            if param not in data:
                return Response(
                    {'error': f'Missing required parameter: {param}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate effect size
        result = power_calculator.calculate_effect_size_t_test(
            sample_size=data['sample_size'],
            power=data.get('power', 0.8),
            alpha=data.get('alpha', 0.05),
            alternative=data.get('alternative', 'two-sided'),
            test_type=data.get('test_type', 'independent')
        )

        logger.info(f"Effect size calculation completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result,
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in effect size calculation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_power_anova(request):
    """
    Calculate statistical power for ANOVA with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.25,
        "groups": 3,
        "n_per_group": 20,
        "alpha": 0.05
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ['effect_size', 'groups', 'n_per_group']
        for param in required:
            if param not in data:
                return Response(
                    {'error': f'Missing required parameter: {param}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate power
        result = power_calculator.calculate_power_anova(
            effect_size=data['effect_size'],
            groups=data['groups'],
            n_per_group=data['n_per_group'],
            alpha=data.get('alpha', 0.05)
        )

        logger.info(f"ANOVA power calculation completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result,
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in ANOVA power calculation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_power_correlation(request):
    """
    Calculate statistical power for correlation tests with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.3,
        "sample_size": 100,
        "alpha": 0.05,
        "alternative": "two-sided"
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ['effect_size', 'sample_size']
        for param in required:
            if param not in data:
                return Response(
                    {'error': f'Missing required parameter: {param}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate power
        result = power_calculator.calculate_power_correlation(
            effect_size=data['effect_size'],
            sample_size=data['sample_size'],
            alpha=data.get('alpha', 0.05),
            alternative=data.get('alternative', 'two-sided')
        )

        logger.info(f"Correlation power calculation completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result,
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in correlation power calculation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def calculate_power_chi_square(request):
    """
    Calculate statistical power for chi-square tests with 50 decimal precision.

    Expected JSON payload:
    {
        "effect_size": 0.3,
        "df": 4,
        "sample_size": 100,
        "alpha": 0.05
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ['effect_size', 'df', 'sample_size']
        for param in required:
            if param not in data:
                return Response(
                    {'error': f'Missing required parameter: {param}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate power
        result = power_calculator.calculate_power_chi_square(
            effect_size=data['effect_size'],
            df=data['df'],
            sample_size=data['sample_size'],
            alpha=data.get('alpha', 0.05)
        )

        logger.info(f"Chi-square power calculation completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': result,
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in chi-square power calculation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@cache_page(60 * 15)  # Cache for 15 minutes
def create_power_curves(request):
    """
    Create power curves for visualization.

    Expected JSON payload:
    {
        "test_type": "t-test",
        "effect_sizes": [0.1, 0.2, 0.3, ...],
        "sample_sizes": [10, 20, 30, ...],
        "alpha": 0.05,
        "additional_params": {}
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Generate power curves
        result = power_calculator.create_power_curves(
            test_type=data.get('test_type', 't-test'),
            effect_sizes=data.get('effect_sizes'),
            sample_sizes=data.get('sample_sizes'),
            alpha=data.get('alpha', 0.05),
            **data.get('additional_params', {})
        )

        logger.info(f"Power curves generated for user {request.user.id}")

        return Response({
            'success': True,
            'results': {
                'figure': result['figure'],
                'effect_sizes': result['effect_sizes'],
                'sample_sizes': result['sample_sizes'],
                'test_type': result['test_type'],
                'alpha': result['alpha'],
                'description': result['description']
            },
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error generating power curves: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def optimal_allocation(request):
    """
    Calculate optimal sample size allocation across groups.

    Expected JSON payload:
    {
        "total_sample_size": 200,
        "group_costs": [1.0, 1.5, 2.0],
        "group_variances": [1.0, 1.2, 0.8],
        "n_groups": 3
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        if 'total_sample_size' not in data:
            return Response(
                {'error': 'Missing required parameter: total_sample_size'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate optimal allocation
        result = power_calculator.optimal_allocation(
            total_sample_size=data['total_sample_size'],
            group_costs=data.get('group_costs'),
            group_variances=data.get('group_variances'),
            n_groups=data.get('n_groups', 2)
        )

        logger.info(f"Optimal allocation calculated for user {request.user.id}")

        return Response({
            'success': True,
            'results': result,
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in optimal allocation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def sensitivity_analysis(request):
    """
    Perform sensitivity analysis on power calculations.

    Expected JSON payload:
    {
        "test_type": "t-test",
        "base_params": {
            "effect_size": 0.5,
            "sample_size": 64,
            "alpha": 0.05
        },
        "vary_param": "effect_size",
        "vary_range": [0.1, 1.0],
        "n_points": 20
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        required = ['test_type', 'base_params', 'vary_param', 'vary_range']
        for param in required:
            if param not in data:
                return Response(
                    {'error': f'Missing required parameter: {param}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Perform sensitivity analysis
        result = power_calculator.sensitivity_analysis(
            test_type=data['test_type'],
            base_params=data['base_params'],
            vary_param=data['vary_param'],
            vary_range=tuple(data['vary_range']),
            n_points=data.get('n_points', 20)
        )

        logger.info(f"Sensitivity analysis completed for user {request.user.id}")

        return Response({
            'success': True,
            'results': {
                'results': result['results'],
                'figure': result['figure'],
                'vary_parameter': result['vary_parameter'],
                'vary_range': result['vary_range'],
                'value_for_80_power': result['value_for_80_power'],
                'test_type': result['test_type'],
                'base_parameters': result['base_parameters']
            },
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in sensitivity analysis: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def comprehensive_power_report(request):
    """
    Generate comprehensive power analysis report.

    Expected JSON payload:
    {
        "test_type": "t-test",
        "params": {
            "effect_size": 0.5,
            "sample_size": 64,
            "alpha": 0.05,
            "alternative": "two-sided",
            "test_type": "independent"
        }
    }
    """
    try:
        # Apply parameter adapter for flexibility
        data = adapt_power_params(request.data)

        # Validate required parameters
        if 'test_type' not in data or 'params' not in data:
            return Response(
                {'error': 'Missing required parameters: test_type and params'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate comprehensive report
        result = power_calculator.comprehensive_power_report(
            test_type=data['test_type'],
            **data['params']
        )

        logger.info(f"Comprehensive power report generated for user {request.user.id}")

        return Response({
            'success': True,
            'report': result,
            'precision': '50 decimal places'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error generating comprehensive report: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def power_analysis_info(request):
    """
    Get information about available power analysis methods.
    """
    info = {
        'description': 'High-precision power analysis with 50 decimal places',
        'precision': '50 decimal places',
        'available_tests': [
            {
                'name': 't-test',
                'endpoints': [
                    '/api/v1/power/t-test/',
                    '/api/v1/power/sample-size/t-test/',
                    '/api/v1/power/effect-size/t-test/'
                ],
                'test_types': ['independent', 'paired', 'one-sample'],
                'alternatives': ['two-sided', 'greater', 'less']
            },
            {
                'name': 'anova',
                'endpoints': ['/api/v1/power/anova/'],
                'description': 'One-way ANOVA power analysis'
            },
            {
                'name': 'correlation',
                'endpoints': ['/api/v1/power/correlation/'],
                'alternatives': ['two-sided', 'greater', 'less']
            },
            {
                'name': 'chi-square',
                'endpoints': ['/api/v1/power/chi-square/'],
                'description': 'Chi-square test power analysis'
            }
        ],
        'utility_endpoints': [
            {
                'name': 'Power Curves',
                'endpoint': '/api/v1/power/curves/',
                'description': 'Generate power curves for visualization'
            },
            {
                'name': 'Optimal Allocation',
                'endpoint': '/api/v1/power/allocation/',
                'description': 'Calculate optimal sample allocation'
            },
            {
                'name': 'Sensitivity Analysis',
                'endpoint': '/api/v1/power/sensitivity/',
                'description': 'Perform sensitivity analysis'
            },
            {
                'name': 'Comprehensive Report',
                'endpoint': '/api/v1/power/report/',
                'description': 'Generate full power analysis report'
            }
        ],
        'effect_size_guidelines': {
            't-test': {
                'small': 0.2,
                'medium': 0.5,
                'large': 0.8
            },
            'anova': {
                'small': 0.1,
                'medium': 0.25,
                'large': 0.4
            },
            'correlation': {
                'small': 0.1,
                'medium': 0.3,
                'large': 0.5
            },
            'chi-square': {
                'small': 0.1,
                'medium': 0.3,
                'large': 0.5
            }
        }
    }

    return Response(info, status=status.HTTP_200_OK)


# URL patterns for inclusion in urls.py
urlpatterns = [
    ('power/t-test/', calculate_power_t_test),
    ('power/sample-size/t-test/', calculate_sample_size_t_test),
    ('power/effect-size/t-test/', calculate_effect_size_t_test),
    ('power/anova/', calculate_power_anova),
    ('power/correlation/', calculate_power_correlation),
    ('power/chi-square/', calculate_power_chi_square),
    ('power/curves/', create_power_curves),
    ('power/allocation/', optimal_allocation),
    ('power/sensitivity/', sensitivity_analysis),
    ('power/report/', comprehensive_power_report),
    ('power/info/', power_analysis_info),
]