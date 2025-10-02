"""
Serializers for Regression API
===============================
Data validation and serialization for regression endpoints.
"""

from rest_framework import serializers
from typing import List, Dict, Any, Optional


class RegressionDataSerializer(serializers.Serializer):
    """Serializer for regression input data."""
    X = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        help_text="Independent variables matrix (n_samples x n_features)"
    )
    y = serializers.ListField(
        child=serializers.FloatField(),
        help_text="Dependent variable vector"
    )
    feature_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        help_text="Names of features"
    )


class RegressionParametersSerializer(serializers.Serializer):
    """Parameters for regression methods."""
    confidence_level = serializers.FloatField(
        default=0.95,
        min_value=0.5,
        max_value=0.999,
        help_text="Confidence level for intervals"
    )
    handle_missing = serializers.ChoiceField(
        choices=['drop', 'mean', 'median', 'mode', 'knn', 'mice'],
        default='drop',
        help_text="Method to handle missing values"
    )
    robust_standard_errors = serializers.BooleanField(
        default=False,
        help_text="Use heteroscedasticity-robust standard errors"
    )
    alpha = serializers.FloatField(
        default=1.0,
        min_value=0,
        help_text="Regularization strength for Ridge/Lasso"
    )
    degree = serializers.IntegerField(
        default=2,
        min_value=1,
        max_value=10,
        help_text="Polynomial degree"
    )
    quantile = serializers.FloatField(
        default=0.5,
        min_value=0.01,
        max_value=0.99,
        help_text="Quantile for quantile regression"
    )
    cv_folds = serializers.IntegerField(
        default=5,
        min_value=2,
        max_value=20,
        help_text="Number of cross-validation folds"
    )
    include_interaction = serializers.BooleanField(
        default=True,
        help_text="Include interaction terms in polynomial regression"
    )
    regularization = serializers.ChoiceField(
        choices=['none', 'l1', 'l2', 'elastic_net'],
        default='none',
        required=False,
        help_text="Regularization type"
    )
    logistic_type = serializers.ChoiceField(
        choices=['binary', 'multinomial'],
        default='binary',
        help_text="Type of logistic regression"
    )
    robust_method = serializers.ChoiceField(
        choices=['huber', 'ransac', 'theil_sen'],
        default='huber',
        help_text="Robust regression method"
    )
    stepwise_method = serializers.ChoiceField(
        choices=['forward', 'backward', 'both'],
        default='both',
        help_text="Stepwise selection method"
    )
    alpha_in = serializers.FloatField(
        default=0.05,
        min_value=0.001,
        max_value=0.5,
        help_text="P-value threshold for adding features"
    )
    alpha_out = serializers.FloatField(
        default=0.10,
        min_value=0.001,
        max_value=0.5,
        help_text="P-value threshold for removing features"
    )


class RegressionOptionsSerializer(serializers.Serializer):
    """Options for regression output."""
    include_diagnostics = serializers.BooleanField(
        default=True,
        help_text="Include diagnostic statistics"
    )
    include_visualization = serializers.BooleanField(
        default=False,
        help_text="Include visualization data"
    )
    compare_with_standard = serializers.BooleanField(
        default=False,
        help_text="Compare with standard precision"
    )


class RegressionInputSerializer(serializers.Serializer):
    """Main input serializer for regression endpoint."""
    data = RegressionDataSerializer()
    method = serializers.ChoiceField(
        choices=[
            'linear', 'multiple', 'ridge', 'lasso', 'elastic_net',
            'polynomial', 'logistic', 'quantile', 'robust', 'stepwise'
        ],
        default='linear',
        help_text="Regression method to use"
    )
    parameters = RegressionParametersSerializer(required=False)
    options = RegressionOptionsSerializer(required=False)

    def validate(self, data):
        """Validate input data consistency."""
        regression_data = data['data']
        X = regression_data['X']
        y = regression_data['y']

        # Check dimensions
        if len(X) != len(y):
            raise serializers.ValidationError(
                "Number of samples in X must match length of y"
            )

        if len(X) == 0:
            raise serializers.ValidationError("Data cannot be empty")

        # Check feature names if provided
        if 'feature_names' in regression_data:
            n_features = len(X[0]) if X else 0
            if len(regression_data['feature_names']) != n_features:
                raise serializers.ValidationError(
                    "Number of feature names must match number of features"
                )

        # Method-specific validation
        method = data.get('method')
        params = data.get('parameters', {})

        if method == 'logistic':
            # Check if y is binary/categorical
            unique_values = set(y)
            if params.get('logistic_type') == 'binary' and len(unique_values) > 2:
                raise serializers.ValidationError(
                    "Binary logistic regression requires binary target variable"
                )

        return data


class RegressionResultSerializer(serializers.Serializer):
    """Serializer for regression results."""
    method = serializers.CharField()
    coefficients = serializers.DictField(
        child=serializers.CharField()
    )
    intercept = serializers.CharField()
    metrics = serializers.DictField()
    statistics = serializers.DictField()
    standard_errors = serializers.DictField(required=False)
    p_values = serializers.DictField(required=False)
    confidence_intervals = serializers.DictField(required=False)
    selected_features = serializers.ListField(required=False)
    feature_importance = serializers.DictField(required=False)
    diagnostics = serializers.DictField(required=False)
    visualizations = serializers.DictField(required=False)
    interpretation = serializers.DictField(required=False)
    assumptions_met = serializers.DictField(required=False)
    warnings = serializers.ListField(required=False)
    missing_data_info = serializers.DictField(required=False)
    precision_comparison = serializers.DictField(required=False)


class ModelComparisonInputSerializer(serializers.Serializer):
    """Serializer for model comparison input."""
    data = RegressionDataSerializer()
    models = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of models to compare"
    )
    comparison_metrics = serializers.ListField(
        child=serializers.CharField(),
        default=['r_squared', 'mse', 'aic', 'bic'],
        help_text="Metrics to compare"
    )


class MissingDataSerializer(serializers.Serializer):
    """Serializer for missing data analysis."""
    data = serializers.ListField(
        child=serializers.ListField(),
        help_text="Data matrix with potential missing values"
    )
    column_names = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Column names"
    )
    perform_tests = serializers.BooleanField(
        default=True,
        help_text="Perform statistical tests for missingness"
    )


class ImputationInputSerializer(serializers.Serializer):
    """Serializer for data imputation input."""
    data = serializers.ListField(
        child=serializers.ListField(),
        help_text="Data with missing values"
    )
    method = serializers.ChoiceField(
        choices=[
            'drop', 'mean', 'median', 'mode',
            'forward_fill', 'backward_fill',
            'linear_interpolation', 'spline_interpolation',
            'knn', 'mice', 'regression', 'random_forest',
            'hot_deck', 'cold_deck', 'constant'
        ],
        default='mean',
        help_text="Imputation method"
    )
    column_strategies = serializers.DictField(
        child=serializers.CharField(),
        required=False,
        help_text="Column-specific imputation strategies"
    )
    parameters = serializers.DictField(
        required=False,
        help_text="Method-specific parameters"
    )