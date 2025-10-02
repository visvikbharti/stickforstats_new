"""
High-Precision Regression API Views
====================================
API endpoints for all regression analysis methods with 50 decimal precision.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.cache import cache
import numpy as np
import pandas as pd
from decimal import Decimal
import json
import hashlib

from core.hp_regression_comprehensive import (
    HighPrecisionRegression,
    RegressionType
)
from core.missing_data_handler import (
    MissingDataHandler,
    ImputationMethod
)
from core.comprehensive_visualization_system import (
    ComprehensiveVisualizationSystem
)
from .serializers import RegressionRequestSerializer, MissingDataRequestSerializer
from .parameter_adapter import parameter_adapter
from .cache_utils import cache_statistical_result


class HighPrecisionRegressionView(APIView):
    """
    API endpoint for high-precision regression analysis.
    Supports multiple regression types with comprehensive diagnostics.
    """
    permission_classes = [AllowAny]

    @cache_statistical_result(timeout=3600)  # Cache for 1 hour
    def post(self, request):
        """
        Perform regression analysis with specified method.

        Request body:
        {
            "data": {
                "X": [[...], [...], ...],  // Independent variables
                "y": [...],                 // Dependent variable
                "feature_names": ["var1", "var2", ...]  // Optional
            },
            "method": "linear",  // linear, ridge, lasso, polynomial, logistic, etc.
            "parameters": {
                "confidence_level": 0.95,
                "handle_missing": "drop",  // drop, mean, median, mice
                "robust_standard_errors": false,
                "alpha": 1.0,  // For regularized methods
                "degree": 2,   // For polynomial
                "quantile": 0.5,  // For quantile regression
                "cv_folds": 5  // For cross-validation
            },
            "options": {
                "include_diagnostics": true,
                "include_visualization": true,
                "compare_with_standard": true
            }
        }
        """
        # Apply parameter adapter for flexibility
        adapted_data = parameter_adapter.adapt_parameters('regression', request.data)

        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Regression - Original data: {request.data}")
        logger.info(f"Regression - After adapter: {adapted_data}")

        # Handle data wrapped in 'data' field
        if 'data' in adapted_data and 'X' not in adapted_data:
            # Unwrap data field but preserve other fields like 'type'
            data_field = adapted_data.get('data', {})
            if isinstance(data_field, dict) and ('X' in data_field or 'x' in data_field):
                # Move X and y from data field to top level
                if 'X' in data_field:
                    adapted_data['X'] = data_field['X']
                if 'x' in data_field:
                    adapted_data['X'] = data_field['x']
                if 'y' in data_field:
                    adapted_data['y'] = data_field['y']
                if 'Y' in data_field:
                    adapted_data['y'] = data_field['Y']
                # Remove the data field after extracting
                adapted_data.pop('data', None)

        # Ensure we have the required fields
        if 'X' not in adapted_data and 'x' in adapted_data:
            adapted_data['X'] = adapted_data.pop('x')
        if 'Y' in adapted_data and 'y' not in adapted_data:
            adapted_data['y'] = adapted_data.pop('Y')

        serializer = RegressionRequestSerializer(data=adapted_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Extract data directly from validated_data
            X_data = serializer.validated_data['X']
            y = np.array(serializer.validated_data['y'])

            # Handle simple linear/polynomial (1D) vs multiple (2D) X
            regression_type = serializer.validated_data.get('type', 'simple_linear')
            if regression_type in ['simple_linear', 'polynomial']:
                # Convert 1D X to 2D for consistency
                X = np.array(X_data).reshape(-1, 1)
            else:
                X = np.array(X_data)

            feature_names = None  # Not in the current serializer

            # Map serializer type to method
            type_to_method = {
                'simple_linear': 'linear',
                'multiple_linear': 'multiple',
                'polynomial': 'polynomial',
                'logistic': 'logistic',
                'ridge': 'ridge',
                'lasso': 'lasso'
            }
            method = type_to_method.get(regression_type, 'linear')
            params = serializer.validated_data.get('parameters', {})
            options = serializer.validated_data.get('options', {})

            # Handle missing data if present
            missing_handler = MissingDataHandler()

            # Check for missing values
            if np.isnan(X).any() or np.isnan(y).any():
                handle_method = params.get('handle_missing', 'drop')

                # Simple handling for now - just drop NaN values
                if handle_method == 'drop':
                    # Create mask for non-NaN values
                    mask = ~(np.isnan(X).any(axis=1) | np.isnan(y))
                    X = X[mask]
                    y = y[mask]

                missing_info = {
                    'had_missing': True,
                    'method_used': handle_method
                }
            else:
                missing_info = {'had_missing': False}

            # Initialize regression
            hp_regression = HighPrecisionRegression(precision=50)

            # Perform regression based on method
            if method == 'linear' or method == 'multiple':
                result = hp_regression.linear_regression(
                    X, y,
                    feature_names=feature_names,
                    confidence_level=params.get('confidence_level', 0.95),
                    robust_standard_errors=params.get('robust_standard_errors', False)
                )

            elif method == 'ridge':
                result = hp_regression.ridge_regression(
                    X, y,
                    alpha=params.get('alpha', 1.0),
                    feature_names=feature_names,
                    cv_folds=params.get('cv_folds', 5)
                )

            elif method == 'lasso':
                result = hp_regression.lasso_regression(
                    X, y,
                    alpha=params.get('alpha', 1.0),
                    feature_names=feature_names
                )

            elif method == 'polynomial':
                result = hp_regression.polynomial_regression(
                    X, y,
                    degree=params.get('degree', 2),
                    feature_names=feature_names,
                    include_interaction=params.get('include_interaction', True),
                    regularization=params.get('regularization'),
                    alpha=params.get('alpha', 1.0)
                )

            elif method == 'logistic':
                result = hp_regression.logistic_regression(
                    X, y,
                    feature_names=feature_names,
                    regression_type=params.get('logistic_type', 'binary'),
                    regularization=params.get('regularization'),
                    alpha=params.get('alpha', 1.0)
                )

            elif method == 'quantile':
                result = hp_regression.quantile_regression(
                    X, y,
                    quantile=params.get('quantile', 0.5),
                    feature_names=feature_names
                )

            elif method == 'robust':
                result = hp_regression.robust_regression(
                    X, y,
                    method=params.get('robust_method', 'huber'),
                    feature_names=feature_names
                )

            elif method == 'stepwise':
                result = hp_regression.stepwise_regression(
                    X, y,
                    feature_names=feature_names,
                    method=params.get('stepwise_method', 'both'),
                    alpha_in=params.get('alpha_in', 0.05),
                    alpha_out=params.get('alpha_out', 0.10)
                )

            else:
                return Response(
                    {'error': f'Unknown regression method: {method}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prepare response
            response_data = {
                'method': method,
                'coefficients': {k: str(v) for k, v in result.coefficients.items()},
                'intercept': str(result.intercept),
                'metrics': {
                    'r_squared': str(result.r_squared),
                    'adjusted_r_squared': str(result.adjusted_r_squared),
                    'mse': str(result.mse),
                    'rmse': str(result.rmse),
                    'mae': str(result.mae),
                    'mape': str(result.mape),
                    'aic': str(result.aic),
                    'bic': str(result.bic)
                },
                'statistics': {
                    'f_statistic': str(result.f_statistic),
                    'f_p_value': str(result.f_p_value)
                },
                'missing_data_info': missing_info
            }

            # Add method-specific results
            if hasattr(result, 'standard_errors') and result.standard_errors:
                response_data['standard_errors'] = {k: str(v) for k, v in result.standard_errors.items()}

            if hasattr(result, 'p_values') and result.p_values:
                response_data['p_values'] = {k: str(v) for k, v in result.p_values.items()}

            if hasattr(result, 'confidence_intervals') and result.confidence_intervals:
                response_data['confidence_intervals'] = {
                    k: [str(v[0]), str(v[1])] for k, v in result.confidence_intervals.items()
                }

            if hasattr(result, 'selected_features') and result.selected_features:
                response_data['selected_features'] = result.selected_features

            if hasattr(result, 'feature_importance') and result.feature_importance:
                response_data['feature_importance'] = {k: str(v) for k, v in result.feature_importance.items()}

            # Add diagnostics if requested
            if options.get('include_diagnostics', True):
                diagnostics = result.diagnostics
                response_data['diagnostics'] = {
                    'multicollinearity': {
                        'detected': diagnostics.multicollinearity_detected,
                        'vif': {k: str(v) for k, v in diagnostics.vif.items()} if diagnostics.vif else {}
                    },
                    'heteroscedasticity': {
                        'detected': diagnostics.heteroscedasticity_detected,
                        'breusch_pagan': {k: str(v) for k, v in diagnostics.breusch_pagan.items()}
                    },
                    'autocorrelation': {
                        'detected': diagnostics.autocorrelation_detected,
                        'durbin_watson': str(diagnostics.durbin_watson)
                    },
                    'normality': {
                        'violated': diagnostics.normality_violated,
                        'jarque_bera': {k: str(v) for k, v in diagnostics.jarque_bera.items()}
                    },
                    'outliers': diagnostics.outliers,
                    'influential_points': diagnostics.influential_points,
                    'condition_number': str(diagnostics.condition_number)
                }

            # Add visualizations if requested
            if options.get('include_visualization', False):
                viz_system = StatisticalVisualizationSystem()

                # Generate regression plots
                plots = {}

                # Residual plots
                plots['residual_plot'] = viz_system.create_regression_diagnostics(
                    y, result.predictions,
                    result.residuals,
                    result.diagnostics.leverage
                )

                # Q-Q plot
                plots['qq_plot'] = viz_system.create_qq_plot(result.residuals)

                # Feature importance plot if available
                if hasattr(result, 'feature_importance') and result.feature_importance:
                    plots['feature_importance'] = viz_system.create_feature_importance_plot(
                        result.feature_importance
                    )

                response_data['visualizations'] = plots

            # Add interpretation
            if hasattr(result, 'interpretation') and result.interpretation:
                response_data['interpretation'] = result.interpretation

            # Add assumptions check
            if hasattr(result, 'assumptions_met') and result.assumptions_met:
                response_data['assumptions_met'] = result.assumptions_met

            # Add warnings
            if hasattr(result, 'warnings') and result.warnings:
                response_data['warnings'] = result.warnings

            # Compare with standard precision if requested
            if options.get('compare_with_standard', False):
                from sklearn.linear_model import LinearRegression
                sklearn_model = LinearRegression()
                sklearn_model.fit(X, y)
                sklearn_r2 = sklearn_model.score(X, y)

                response_data['precision_comparison'] = {
                    'high_precision_r2': str(result.r_squared),
                    'standard_precision_r2': float(sklearn_r2),
                    'difference': str(result.r_squared - Decimal(str(sklearn_r2))),
                    'decimal_places_achieved': 50
                }

            # Cache results
            cache_key = self._generate_cache_key(request.data)
            cache.set(cache_key, response_data, timeout=3600)  # Cache for 1 hour

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_imputation_method(self, method_str: str) -> ImputationMethod:
        """Convert string to ImputationMethod enum."""
        method_map = {
            'drop': ImputationMethod.DROP,
            'mean': ImputationMethod.MEAN,
            'median': ImputationMethod.MEDIAN,
            'mode': ImputationMethod.MODE,
            'knn': ImputationMethod.KNN,
            'mice': ImputationMethod.MICE,
            'forward_fill': ImputationMethod.FORWARD_FILL,
            'backward_fill': ImputationMethod.BACKWARD_FILL,
            'interpolation': ImputationMethod.LINEAR_INTERPOLATION
        }
        return method_map.get(method_str, ImputationMethod.MEAN)

    def _generate_cache_key(self, data: dict) -> str:
        """Generate cache key from request data."""
        data_str = json.dumps(data, sort_keys=True)
        return f"regression_{hashlib.md5(data_str.encode()).hexdigest()}"


class RegressionModelComparisonView(APIView):
    """
    Compare multiple regression models on the same dataset.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Compare multiple regression models.

        Request body:
        {
            "data": {
                "X": [[...], [...]],
                "y": [...],
                "feature_names": [...]
            },
            "models": [
                {"method": "linear", "parameters": {...}},
                {"method": "ridge", "parameters": {"alpha": 1.0}},
                {"method": "lasso", "parameters": {"alpha": 0.1}}
            ],
            "comparison_metrics": ["r_squared", "mse", "aic", "bic"]
        }
        """
        try:
            # Apply parameter adapter for flexibility
            adapted_data = parameter_adapter.adapt_parameters('regression', request.data)
            data = adapted_data['data']
            X = np.array(data['X'])
            y = np.array(data['y'])
            feature_names = data.get('feature_names')

            models = adapted_data.get('models', [])
            metrics_to_compare = adapted_data.get('comparison_metrics',
                                                 ['r_squared', 'mse', 'aic', 'bic'])

            # Initialize regression
            hp_regression = HighPrecisionRegression(precision=50)

            # Results storage
            comparison_results = []

            for model_config in models:
                method = model_config['method']
                params = model_config.get('parameters', {})

                # Run regression based on method
                if method == 'linear':
                    result = hp_regression.linear_regression(X, y, feature_names)
                elif method == 'ridge':
                    result = hp_regression.ridge_regression(
                        X, y,
                        alpha=params.get('alpha', 1.0),
                        feature_names=feature_names
                    )
                elif method == 'lasso':
                    result = hp_regression.lasso_regression(
                        X, y,
                        alpha=params.get('alpha', 1.0),
                        feature_names=feature_names
                    )
                elif method == 'polynomial':
                    result = hp_regression.polynomial_regression(
                        X, y,
                        degree=params.get('degree', 2),
                        feature_names=feature_names
                    )
                else:
                    continue

                # Extract metrics
                model_metrics = {
                    'method': method,
                    'parameters': params
                }

                for metric in metrics_to_compare:
                    if hasattr(result, metric):
                        value = getattr(result, metric)
                        model_metrics[metric] = str(value) if isinstance(value, Decimal) else value

                comparison_results.append(model_metrics)

            # Determine best model for each metric
            best_models = {}
            for metric in metrics_to_compare:
                if metric in ['r_squared', 'adjusted_r_squared']:
                    # Higher is better
                    best_model = max(comparison_results,
                                   key=lambda x: float(x.get(metric, 0)))
                else:
                    # Lower is better (mse, aic, bic)
                    best_model = min(comparison_results,
                                   key=lambda x: float(x.get(metric, float('inf'))))

                best_models[metric] = best_model['method']

            response_data = {
                'models': comparison_results,
                'best_models': best_models,
                'recommendation': self._generate_recommendation(comparison_results, best_models)
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_recommendation(self, results: list, best_models: dict) -> str:
        """Generate model recommendation based on comparison."""
        # Count which model is best most often
        model_counts = {}
        for model in best_models.values():
            model_counts[model] = model_counts.get(model, 0) + 1

        best_overall = max(model_counts, key=model_counts.get)

        return f"Based on the comparison, {best_overall} performs best on most metrics. " \
               f"It is the best model for {model_counts[best_overall]} out of {len(best_models)} metrics."


class MissingDataAnalysisView(APIView):
    """
    Analyze and handle missing data in datasets.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Analyze missing data patterns and provide recommendations.

        Request body:
        {
            "data": [[...], [...]],
            "column_names": ["var1", "var2", ...],
            "perform_tests": true
        }
        """
        # Apply parameter adapter for flexibility
        adapted_data = parameter_adapter.adapt_parameters('regression', request.data)

        serializer = MissingDataRequestSerializer(data=adapted_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = np.array(serializer.validated_data['data'])
            column_names = serializer.validated_data.get('column_names')
            perform_tests = serializer.validated_data.get('perform_tests', True)

            # Initialize handler
            handler = MissingDataHandler()

            # Analyze missing data
            analysis = handler.analyze_missing_data(
                data,
                column_names=column_names,
                perform_tests=perform_tests
            )

            # Prepare response
            response_data = {
                'summary': {
                    'total_missing': analysis.total_missing,
                    'total_observations': analysis.total_observations,
                    'missing_percentage': str(analysis.missing_percentage)
                },
                'pattern': {
                    'type': analysis.missing_pattern.value,
                    'confidence': str(analysis.pattern_confidence)
                },
                'by_column': {
                    col: {
                        'count': info['count'],
                        'percentage': str(info['percentage']),
                        'pattern': info['pattern']
                    }
                    for col, info in analysis.missing_by_column.items()
                },
                'recommendations': analysis.recommendations,
                'warnings': analysis.warnings
            }

            # Add test results if performed
            if perform_tests and analysis.little_mcar_test:
                response_data['little_mcar_test'] = {
                    k: str(v) for k, v in analysis.little_mcar_test.items()
                }

            # Add visualization data
            if analysis.missing_heatmap_data is not None:
                response_data['visualization'] = {
                    'heatmap': analysis.missing_heatmap_data.tolist(),
                    'correlations': analysis.missing_correlations.to_dict() if analysis.missing_correlations is not None else None
                }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )