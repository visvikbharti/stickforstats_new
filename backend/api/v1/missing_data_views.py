"""
Missing Data Handler Views
===========================
Provides API endpoints for missing data analysis and imputation with 50 decimal precision.

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
import pandas as pd
import logging
from typing import Dict, Any, List, Optional

# Import our missing data handler module
from core.missing_data_handler import MissingDataHandler

# Set up logging
logger = logging.getLogger(__name__)

# Initialize handler
missing_data_handler = MissingDataHandler()


@api_view(['POST'])
@permission_classes([AllowAny])
def detect_missing_patterns(request):
    """
    Detect missing data patterns (MCAR, MAR, MNAR) with statistical tests.

    Expected JSON payload:
    {
        "data": [[1, 2, null], [3, null, 5], [6, 7, 8]],
        "column_names": ["col1", "col2", "col3"],
        "perform_tests": true
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_data = data.get('data')
        column_names = data.get('column_names', None)
        perform_tests = data.get('perform_tests', True)

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Analyze missing patterns
        result = missing_data_handler.analyze_missing_patterns(
            df,
            perform_tests=perform_tests
        )

        logger.info("Missing pattern detection completed")

        return Response({
            'success': True,
            'results': result,
            'method': 'pattern_detection'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in pattern detection: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def perform_littles_mcar_test(request):
    """
    Perform Little's MCAR test to determine if data is Missing Completely At Random.

    Expected JSON payload:
    {
        "data": [[1, 2, null], [3, null, 5], [6, 7, 8]],
        "column_names": ["col1", "col2", "col3"]
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_data = data.get('data')
        column_names = data.get('column_names', None)

        # Convert to DataFrame
        if column_names:
            df = pd.DataFrame(raw_data, columns=column_names)
        else:
            df = pd.DataFrame(raw_data)

        # Perform Little's MCAR test
        result = missing_data_handler.littles_mcar_test(df)

        logger.info(f"Little's MCAR test completed ")

        return Response({
            'success': True,
            'results': result,
            'method': 'littles_mcar_test'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Little's MCAR test: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def impute_missing_data(request):
    """
    Impute missing data using various methods.

    Expected JSON payload:
    {
        "data": [[1, 2, null], [3, null, 5], [6, 7, 8]],
        "method": "mean",
        "column_strategies": {"col2": "median", "col3": "knn"},
        "parameters": {
            "n_neighbors": 5,
            "max_iter": 10
        }
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_data = data.get('data')
        method = data.get('method', 'mean')
        column_strategies = data.get('column_strategies', {})
        parameters = data.get('parameters', {})

        # Convert to appropriate format
        if isinstance(raw_data[0], list):
            # 2D data
            df = pd.DataFrame(raw_data)
        else:
            # 1D data
            df = pd.Series(raw_data)

        # Perform imputation
        result = missing_data_handler.impute_data(
            df,
            method=method,
            column_strategies=column_strategies,
            **parameters
        )

        # Handle ImputationResult object
        if hasattr(result, 'imputed_data'):
            # It's an ImputationResult object
            imputed_data_raw = result.imputed_data
            # Convert to serializable format
            if isinstance(imputed_data_raw, pd.DataFrame):
                imputed_data = imputed_data_raw.values.tolist()
            elif isinstance(imputed_data_raw, pd.Series):
                imputed_data = imputed_data_raw.tolist()
            elif isinstance(imputed_data_raw, np.ndarray):
                imputed_data = imputed_data_raw.tolist()
            else:
                imputed_data = imputed_data_raw

            response_data = {
                'imputed_data': imputed_data,
                'method_used': str(result.method_used) if hasattr(result.method_used, 'value') else result.method_used,
                'imputation_details': result.imputation_details if hasattr(result, 'imputation_details') else {}
            }
        else:
            # Fallback for direct data return
            if isinstance(result, pd.DataFrame):
                imputed_data = result.values.tolist()
            elif isinstance(result, pd.Series):
                imputed_data = result.tolist()
            else:
                imputed_data = result

            response_data = {
                'imputed_data': imputed_data,
                'method_used': method,
                'imputation_details': missing_data_handler.get_imputation_summary()
            }

        logger.info(f"Data imputation completed ")

        return Response({
            'success': True,
            'results': response_data,
            'method': 'imputation'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in data imputation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def multiple_imputation(request):
    """
    Perform Multiple Imputation by Chained Equations (MICE).

    Expected JSON payload:
    {
        "data": [[1, 2, null], [3, null, 5], [6, 7, 8]],
        "n_imputations": 5,
        "max_iter": 10,
        "random_state": 42
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_data = data.get('data')
        n_imputations = data.get('n_imputations', 5)
        max_iter = data.get('max_iter', 10)
        random_state = data.get('random_state', None)

        # Convert to DataFrame
        df = pd.DataFrame(raw_data)

        # Perform MICE
        result = missing_data_handler.mice_imputation(
            df,
            n_imputations=n_imputations,
            max_iter=max_iter,
            random_state=random_state
        )

        logger.info(f"MICE imputation completed ")

        return Response({
            'success': True,
            'results': result,
            'method': 'mice_imputation'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in MICE imputation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def knn_imputation(request):
    """
    Perform K-Nearest Neighbors imputation.

    Expected JSON payload:
    {
        "data": [[1, 2, null], [3, null, 5], [6, 7, 8]],
        "n_neighbors": 5,
        "weights": "uniform",
        "metric": "euclidean"
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_data = data.get('data')
        n_neighbors = data.get('n_neighbors', 5)
        weights = data.get('weights', 'uniform')
        metric = data.get('metric', 'euclidean')

        # Convert to DataFrame
        df = pd.DataFrame(raw_data)

        # Perform KNN imputation
        result = missing_data_handler.knn_imputation(
            df,
            n_neighbors=n_neighbors,
            weights=weights,
            metric=metric
        )

        # Convert result to serializable format
        imputed_data = result.values.tolist()

        response_data = {
            'imputed_data': imputed_data,
            'method': 'knn',
            'parameters': {
                'n_neighbors': n_neighbors,
                'weights': weights,
                'metric': metric
            }
        }

        logger.info(f"KNN imputation completed ")

        return Response({
            'success': True,
            'results': response_data,
            'method': 'knn_imputation'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in KNN imputation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def em_algorithm_imputation(request):
    """
    Perform Expectation-Maximization algorithm for imputation.

    Expected JSON payload:
    {
        "data": [[1, 2, null], [3, null, 5], [6, 7, 8]],
        "max_iter": 100,
        "tol": 1e-4
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_data = data.get('data')
        max_iter = data.get('max_iter', 100)
        tol = data.get('tol', 1e-4)

        # Convert to DataFrame
        df = pd.DataFrame(raw_data)

        # Perform EM imputation
        result = missing_data_handler.em_imputation(
            df,
            max_iter=max_iter,
            tol=tol
        )

        logger.info(f"EM algorithm imputation completed ")

        return Response({
            'success': True,
            'results': result,
            'method': 'em_algorithm'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in EM imputation: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def visualize_missing_patterns(request):
    """
    Generate visualizations for missing data patterns.

    Expected JSON payload:
    {
        "data": [[1, 2, null], [3, null, 5], [6, 7, 8]],
        "visualization_types": ["matrix", "bar", "heatmap", "dendrogram"]
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_data = data.get('data')
        visualization_types = data.get('visualization_types', ['matrix', 'bar'])

        # Convert to DataFrame
        df = pd.DataFrame(raw_data)

        # Generate visualizations
        result = missing_data_handler.visualize_missing(
            df,
            visualization_types=visualization_types
        )

        logger.info(f"Missing data visualization completed ")

        return Response({
            'success': True,
            'results': result,
            'method': 'visualization'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in visualization: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def compare_imputation_methods(request):
    """
    Compare multiple imputation methods on the same dataset.

    Expected JSON payload:
    {
        "data": [[1, 2, null], [3, null, 5], [6, 7, 8]],
        "methods": ["mean", "median", "knn", "mice"],
        "metrics": ["rmse", "mae", "bias"]
    }
    """
    try:
        data = request.data

        # Validate required parameters
        if 'data' not in data:
            return Response(
                {'error': 'Missing required parameter: data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_data = data.get('data')
        methods = data.get('methods', ['mean', 'median', 'knn'])
        metrics = data.get('metrics', ['rmse', 'mae'])

        # Convert to DataFrame
        df = pd.DataFrame(raw_data)

        # Compare methods
        result = missing_data_handler.compare_methods(
            df,
            methods=methods,
            metrics=metrics
        )

        logger.info(f"Imputation method comparison completed ")

        return Response({
            'success': True,
            'results': result,
            'method': 'comparison'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in method comparison: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_imputation_methods_info(request):
    """
    Get information about available imputation methods.
    """
    try:
        methods_info = {
            'mean': {
                'description': 'Replace missing values with column mean',
                'best_for': 'Numerical data with normal distribution',
                'parameters': []
            },
            'median': {
                'description': 'Replace missing values with column median',
                'best_for': 'Numerical data with outliers',
                'parameters': []
            },
            'mode': {
                'description': 'Replace missing values with most frequent value',
                'best_for': 'Categorical data',
                'parameters': []
            },
            'forward_fill': {
                'description': 'Propagate last valid observation forward',
                'best_for': 'Time series data',
                'parameters': ['limit']
            },
            'backward_fill': {
                'description': 'Propagate next valid observation backward',
                'best_for': 'Time series data',
                'parameters': ['limit']
            },
            'linear_interpolation': {
                'description': 'Linear interpolation between known values',
                'best_for': 'Continuous numerical data',
                'parameters': ['order', 'limit']
            },
            'knn': {
                'description': 'K-Nearest Neighbors imputation',
                'best_for': 'Data with local patterns',
                'parameters': ['n_neighbors', 'weights', 'metric']
            },
            'mice': {
                'description': 'Multiple Imputation by Chained Equations',
                'best_for': 'Complex missing patterns',
                'parameters': ['n_imputations', 'max_iter']
            },
            'em': {
                'description': 'Expectation-Maximization algorithm',
                'best_for': 'Multivariate normal data',
                'parameters': ['max_iter', 'tol']
            },
            'random_forest': {
                'description': 'Random Forest imputation',
                'best_for': 'Non-linear relationships',
                'parameters': ['n_estimators', 'max_depth']
            }
        }

        logger.info(f"Imputation methods info retrieved ")

        return Response({
            'success': True,
            'methods': methods_info
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error retrieving methods info: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )