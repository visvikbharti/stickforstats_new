"""
Survival Analysis API Views
============================
Provides API endpoints for survival analysis including Kaplan-Meier estimation,
Cox proportional hazards regression, and log-rank testing.

Features:
- Kaplan-Meier survival curves with confidence intervals
- Cox proportional hazards regression with hazard ratios
- Log-rank test for comparing survival curves
- Survival probability predictions
- Model storage and retrieval

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

# Import our survival analysis service
from core.services.analytics.survival import get_survival_service

# Set up logging
logger = logging.getLogger(__name__)

# Initialize service
survival_service = get_survival_service()


@api_view(['GET'])
@permission_classes([AllowAny])
def check_survival_availability(request):
    """
    Check if survival analysis is available.

    Returns availability status and installation instructions if needed.
    """
    try:
        result = survival_service.check_availability()

        return Response({
            'success': True,
            'availability': result
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error checking survival availability: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def kaplan_meier_analysis(request):
    """
    Perform Kaplan-Meier survival analysis.

    Expected JSON payload:
    {
        "data": [[1, 1, "A"], [5, 0, "A"], [10, 1, "B"], ...],
        "column_names": ["duration", "event", "group"],
        "duration_col": "duration",
        "event_col": "event",
        "group_col": "group",  // optional
        "confidence_level": 0.95,  // optional, default 0.95
        "timeline": [1, 2, 3, 5, 10]  // optional time points
    }

    Returns:
    {
        "success": true,
        "results": {
            "survival_function": {...},
            "median_survival": {...},
            "event_table": {...},
            "groups": {...},  // if group_col specified
            "logrank_test": {...}  // if group_col specified
        }
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data or 'duration_col' not in data or 'event_col' not in data:
            return Response(
                {
                    'error': 'Missing required parameters: data, duration_col, event_col'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract parameters
        raw_data = data['data']
        column_names = data.get('column_names')
        duration_col = data['duration_col']
        event_col = data['event_col']
        group_col = data.get('group_col')
        confidence_level = data.get('confidence_level', 0.95)
        timeline = data.get('timeline')

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Perform analysis
        results = survival_service.kaplan_meier_analysis(
            data=df,
            duration_col=duration_col,
            event_col=event_col,
            group_col=group_col,
            confidence_level=confidence_level,
            timeline=timeline
        )

        logger.info(f"Kaplan-Meier analysis completed for {len(df)} subjects")

        return Response({
            'success': True,
            'results': results,
            'method': 'kaplan_meier'
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        logger.error(f"Validation error in Kaplan-Meier: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'validation_error'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except RuntimeError as e:
        logger.error(f"Runtime error in Kaplan-Meier: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'runtime_error'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    except Exception as e:
        logger.error(f"Unexpected error in Kaplan-Meier: {str(e)}")
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
def cox_regression(request):
    """
    Perform Cox proportional hazards regression.

    Expected JSON payload:
    {
        "data": [[1, 1, 50, 1], [5, 0, 45, 0], ...],
        "column_names": ["duration", "event", "age", "treatment"],
        "duration_col": "duration",
        "event_col": "event",
        "covariate_cols": ["age", "treatment"],
        "confidence_level": 0.95,  // optional, default 0.95
        "penalizer": 0.0  // optional, L2 penalty
    }

    Returns:
    {
        "success": true,
        "results": {
            "covariates": {
                "age": {
                    "coefficient": 0.05,
                    "hazard_ratio": 1.05,
                    "p_value": 0.023,
                    "confidence_lower": 1.01,
                    "confidence_upper": 1.09,
                    "is_significant": true
                },
                ...
            },
            "model_fit": {
                "concordance_index": 0.72,
                "log_likelihood": -123.45,
                "aic": 250.9
            },
            "model_id": "uuid-for-predictions"
        }
    }
    """
    try:
        data = request.data

        # Validate required parameters
        required = ['data', 'duration_col', 'event_col', 'covariate_cols']
        missing = [p for p in required if p not in data]
        if missing:
            return Response(
                {
                    'error': f'Missing required parameters: {", ".join(missing)}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract parameters
        raw_data = data['data']
        column_names = data.get('column_names')
        duration_col = data['duration_col']
        event_col = data['event_col']
        covariate_cols = data['covariate_cols']
        confidence_level = data.get('confidence_level', 0.95)
        penalizer = data.get('penalizer', 0.0)

        # Validate covariate_cols is a list
        if not isinstance(covariate_cols, list) or len(covariate_cols) == 0:
            return Response(
                {
                    'error': 'covariate_cols must be a non-empty list of column names'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Perform analysis
        results = survival_service.cox_proportional_hazards(
            data=df,
            duration_col=duration_col,
            event_col=event_col,
            covariate_cols=covariate_cols,
            confidence_level=confidence_level,
            penalizer=penalizer
        )

        logger.info(f"Cox regression completed for {len(df)} subjects with {len(covariate_cols)} covariates")

        return Response({
            'success': True,
            'results': results,
            'method': 'cox_proportional_hazards'
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        logger.error(f"Validation error in Cox regression: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'validation_error'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except RuntimeError as e:
        logger.error(f"Runtime error in Cox regression: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'runtime_error'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    except Exception as e:
        logger.error(f"Unexpected error in Cox regression: {str(e)}")
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
def predict_survival(request):
    """
    Predict survival probabilities for new subjects using a fitted Cox model.

    Expected JSON payload:
    {
        "model_id": "uuid-from-cox-regression",
        "data": [[50, 1], [45, 0], ...],
        "column_names": ["age", "treatment"],
        "times": [1, 2, 5, 10]  // optional time points
    }

    Returns:
    {
        "success": true,
        "results": {
            "model_id": "uuid",
            "n_subjects": 2,
            "predictions": [
                {
                    "subject_id": "0",
                    "survival_function": {
                        "time": [1, 2, 5, 10],
                        "survival_probability": [0.98, 0.95, 0.87, 0.72]
                    }
                },
                ...
            ]
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
        times = data.get('times')

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Make predictions
        results = survival_service.predict_survival(
            model_id=model_id,
            new_data=df,
            times=times
        )

        logger.info(f"Survival predictions made for {len(df)} subjects using model {model_id}")

        return Response({
            'success': True,
            'results': results,
            'method': 'survival_prediction'
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
        logger.error(f"Validation error in prediction: {str(e)}")
        return Response(
            {
                'success': False,
                'error': str(e),
                'error_type': 'validation_error'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        logger.error(f"Unexpected error in prediction: {str(e)}")
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
def survival_tutorial(request):
    """
    Generate tutorial example data and perform basic survival analysis.

    This endpoint provides an example workflow for learning survival analysis.

    Returns example data and complete analysis results.
    """
    try:
        # Generate example data
        np.random.seed(42)
        n = 100

        # Create example survival data
        treatment = np.random.choice(['Control', 'Treatment'], n)
        age = np.random.normal(60, 10, n)

        # Simulate survival times (treatment group lives longer)
        base_risk = 0.01
        treatment_effect = np.where(treatment == 'Treatment', 0.5, 1.0)
        age_effect = np.exp((age - 60) * 0.02)

        scale = 1 / (base_risk * treatment_effect * age_effect)
        duration = np.random.exponential(scale)

        # Simulate censoring (some subjects don't experience event)
        censoring_time = np.random.uniform(0, 200, n)
        observed_duration = np.minimum(duration, censoring_time)
        event = (duration <= censoring_time).astype(int)

        # Create DataFrame
        example_data = pd.DataFrame({
            'duration': observed_duration,
            'event': event,
            'treatment': treatment,
            'age': age
        })

        # Perform Kaplan-Meier analysis by treatment group
        km_results = survival_service.kaplan_meier_analysis(
            data=example_data,
            duration_col='duration',
            event_col='event',
            group_col='treatment',
            confidence_level=0.95
        )

        # Perform Cox regression
        cox_results = survival_service.cox_proportional_hazards(
            data=example_data,
            duration_col='duration',
            event_col='event',
            covariate_cols=['age'],
            confidence_level=0.95
        )

        logger.info("Survival tutorial completed successfully")

        return Response({
            'success': True,
            'tutorial': {
                'description': 'Example survival analysis with simulated clinical trial data',
                'sample_data': example_data.head(10).to_dict('records'),
                'data_description': {
                    'n_subjects': n,
                    'n_events': int(event.sum()),
                    'n_censored': int((1 - event).sum()),
                    'groups': ['Control', 'Treatment'],
                    'covariates': ['age']
                },
                'kaplan_meier_results': km_results,
                'cox_regression_results': cox_results
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in survival tutorial: {str(e)}")
        return Response(
            {
                'success': False,
                'error': 'An error occurred generating tutorial',
                'details': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
