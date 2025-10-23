"""
Factor Analysis API Views
==========================
Provides API endpoints for factor analysis including Exploratory Factor Analysis (EFA),
factor rotation, and factor selection methods.

Features:
- Data adequacy testing (Bartlett's, KMO)
- Automatic factor number determination
- Exploratory Factor Analysis with multiple rotation methods
- Factor scores transformation
- Interactive tutorial

Author: StickForStats Development Team
Date: October 23, 2025
Version: 1.0.0
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
import numpy as np
import pandas as pd
import logging
from typing import Dict, Any, List, Optional

# Import our factor analysis service
from core.services.analytics.factor import get_factor_service

# Set up logging
logger = logging.getLogger(__name__)

# Initialize service
factor_service = get_factor_service()


@api_view(['GET'])
@permission_classes([AllowAny])
def check_factor_availability(request):
    """
    Check if factor analysis is available.

    Returns availability status and installation instructions if needed.
    """
    try:
        result = factor_service.check_availability()

        return Response({
            'success': True,
            'availability': result
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error checking factor availability: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def test_adequacy(request):
    """
    Test if data is adequate for factor analysis.

    Performs Bartlett's test of sphericity and KMO measure.

    Expected JSON payload:
    {
        "data": [[1, 2, 3], [4, 5, 6], ...],
        "column_names": ["var1", "var2", "var3"]
    }

    Returns:
    {
        "success": true,
        "results": {
            "bartlett_test": {...},
            "kmo_test": {...},
            "adequacy_status": "excellent",
            "recommendation": "..."
        }
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {
                    'error': 'Missing required parameter: data'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract parameters
        raw_data = data['data']
        column_names = data.get('column_names')

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Test adequacy
        results = factor_service.test_adequacy(df)

        logger.info(f"Adequacy testing completed for {len(df)} observations")

        return Response({
            'success': True,
            'results': results,
            'method': 'adequacy_testing'
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        logger.error(f"Validation error in adequacy testing: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'validation_error'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except RuntimeError as e:
        logger.error(f"Runtime error in adequacy testing: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'runtime_error'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    except Exception as e:
        logger.error(f"Unexpected error in adequacy testing: {str(e)}")
        return Response(
            {
                'success': False,
                'error': 'An unexpected error occurred',
                'details': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def determine_factors(request):
    """
    Determine optimal number of factors using multiple methods.

    Expected JSON payload:
    {
        "data": [[1, 2, 3], [4, 5, 6], ...],
        "column_names": ["var1", "var2", "var3"],
        "methods": ["kaiser", "scree", "parallel"]  // optional
    }

    Returns:
    {
        "success": true,
        "results": {
            "methods": {
                "kaiser": {"n_factors_recommended": 3, ...},
                "scree": {"n_factors_recommended": 2, ...},
                "parallel": {"n_factors_recommended": 2, ...}
            },
            "consensus": {
                "recommended_n_factors": 2,
                "range": [2, 3],
                "interpretation": "..."
            }
        }
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {
                    'error': 'Missing required parameter: data'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract parameters
        raw_data = data['data']
        column_names = data.get('column_names')
        methods = data.get('methods', ['kaiser', 'scree', 'parallel'])

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Determine factors
        results = factor_service.determine_n_factors(df, methods=methods)

        logger.info(f"Factor determination completed: {results['consensus']['recommended_n_factors']} factors recommended")

        return Response({
            'success': True,
            'results': results,
            'method': 'factor_determination'
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        logger.error(f"Validation error in factor determination: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'validation_error'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except RuntimeError as e:
        logger.error(f"Runtime error in factor determination: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'runtime_error'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    except Exception as e:
        logger.error(f"Unexpected error in factor determination: {str(e)}")
        return Response(
            {
                'success': False,
                'error': 'An unexpected error occurred',
                'details': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def exploratory_factor_analysis(request):
    """
    Perform Exploratory Factor Analysis (EFA).

    Expected JSON payload:
    {
        "data": [[1, 2, 3], [4, 5, 6], ...],
        "column_names": ["var1", "var2", "var3"],
        "n_factors": 2,  // optional, auto-determined if not provided
        "rotation": "varimax",  // optional, default "varimax"
        "method": "minres"  // optional, default "minres"
    }

    Returns:
    {
        "success": true,
        "results": {
            "n_factors": 2,
            "factor_loadings": {...},
            "communalities": {...},
            "variance_explained": {...},
            "factor_scores": {...},
            "model_id": "uuid-for-future-use"
        }
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {
                    'error': 'Missing required parameter: data'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract parameters
        raw_data = data['data']
        column_names = data.get('column_names')
        n_factors = data.get('n_factors')
        rotation = data.get('rotation', 'varimax')
        method = data.get('method', 'minres')

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Perform EFA
        results = factor_service.exploratory_factor_analysis(
            data=df,
            n_factors=n_factors,
            rotation=rotation,
            method=method
        )

        logger.info(f"EFA completed: {results['n_factors']} factors extracted from {len(df)} observations")

        return Response({
            'success': True,
            'results': results,
            'method': 'exploratory_factor_analysis'
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        logger.error(f"Validation error in EFA: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'validation_error'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except RuntimeError as e:
        logger.error(f"Runtime error in EFA: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'runtime_error'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    except Exception as e:
        logger.error(f"Unexpected error in EFA: {str(e)}")
        return Response(
            {
                'success': False,
                'error': 'An unexpected error occurred',
                'details': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def transform_factors(request):
    """
    Transform new data to factor scores using a fitted model.

    Expected JSON payload:
    {
        "model_id": "uuid-from-previous-efa",
        "data": [[1, 2, 3], [4, 5, 6], ...],
        "column_names": ["var1", "var2", "var3"]
    }

    Returns:
    {
        "success": true,
        "results": {
            "model_id": "uuid",
            "n_observations": 100,
            "factor_scores": [[...], [...], ...],
            "factor_names": ["Factor_1", "Factor_2"]
        }
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'model_id' not in data or 'data' not in data:
            return Response(
                {
                    'error': 'Missing required parameters: model_id, data'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract parameters
        model_id = data['model_id']
        raw_data = data['data']
        column_names = data.get('column_names')

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Transform to factors
        results = factor_service.transform_to_factors(
            model_id=model_id,
            new_data=df
        )

        logger.info(f"Factor transformation completed for {len(df)} observations using model {model_id}")

        return Response({
            'success': True,
            'results': results,
            'method': 'factor_transformation'
        }, status=status.HTTP_200_OK)

    except FileNotFoundError as e:
        logger.error(f"Model not found: {str(e)}")
        return Response(
            {
                'success': False,
                'error': 'Model not found',
                'details': str(e)
            },
            status=status.HTTP_404_NOT_FOUND
        )

    except ValueError as e:
        logger.error(f"Validation error in transformation: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'validation_error'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        logger.error(f"Unexpected error in transformation: {str(e)}")
        return Response(
            {
                'success': False,
                'error': 'An unexpected error occurred',
                'details': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def factor_tutorial(request):
    """
    Generate tutorial example data and perform complete factor analysis workflow.

    This endpoint provides an example workflow for learning factor analysis.

    Returns example data and complete analysis results.
    """
    try:
        # Generate example data (personality questionnaire)
        np.random.seed(42)
        n = 200  # 200 respondents

        # Simulate 5 underlying factors
        extraversion = np.random.normal(0, 1, n)
        agreeableness = np.random.normal(0, 1, n)
        conscientiousness = np.random.normal(0, 1, n)
        neuroticism = np.random.normal(0, 1, n)
        openness = np.random.normal(0, 1, n)

        # Create 15 observed variables (3 per factor)
        items = {}

        # Extraversion items
        items['Sociable'] = extraversion + np.random.normal(0, 0.3, n)
        items['Talkative'] = extraversion + np.random.normal(0, 0.3, n)
        items['Energetic'] = extraversion + np.random.normal(0, 0.3, n)

        # Agreeableness items
        items['Kind'] = agreeableness + np.random.normal(0, 0.3, n)
        items['Cooperative'] = agreeableness + np.random.normal(0, 0.3, n)
        items['Trusting'] = agreeableness + np.random.normal(0, 0.3, n)

        # Conscientiousness items
        items['Organized'] = conscientiousness + np.random.normal(0, 0.3, n)
        items['Reliable'] = conscientiousness + np.random.normal(0, 0.3, n)
        items['Disciplined'] = conscientiousness + np.random.normal(0, 0.3, n)

        # Neuroticism items
        items['Anxious'] = neuroticism + np.random.normal(0, 0.3, n)
        items['Moody'] = neuroticism + np.random.normal(0, 0.3, n)
        items['Stressed'] = neuroticism + np.random.normal(0, 0.3, n)

        # Openness items
        items['Creative'] = openness + np.random.normal(0, 0.3, n)
        items['Curious'] = openness + np.random.normal(0, 0.3, n)
        items['Imaginative'] = openness + np.random.normal(0, 0.3, n)

        example_data = pd.DataFrame(items)

        # Test adequacy
        adequacy_results = factor_service.test_adequacy(example_data)

        # Determine number of factors
        factor_determination = factor_service.determine_n_factors(
            example_data,
            methods=['kaiser', 'scree', 'parallel']
        )

        # Perform EFA with 5 factors (we know the true structure)
        efa_results = factor_service.exploratory_factor_analysis(
            data=example_data,
            n_factors=5,
            rotation='varimax',
            method='minres'
        )

        logger.info("Factor analysis tutorial completed successfully")

        return Response({
            'success': True,
            'tutorial': {
                'description': 'Example factor analysis with simulated personality questionnaire data (Big Five)',
                'sample_data': example_data.head(10).to_dict('records'),
                'data_description': {
                    'n_respondents': n,
                    'n_items': len(items),
                    'true_factors': ['Extraversion', 'Agreeableness', 'Conscientiousness', 'Neuroticism', 'Openness'],
                    'items_per_factor': 3
                },
                'adequacy_results': adequacy_results,
                'factor_determination': factor_determination,
                'efa_results': efa_results
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in factor tutorial: {str(e)}")
        return Response(
            {
                'success': False,
                'error': 'An error occurred generating tutorial',
                'details': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
