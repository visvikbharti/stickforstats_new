"""
Serializers for StickForStats Core API
Handles data validation and serialization for frontend-backend communication
"""

from rest_framework import serializers
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np


class DataUploadSerializer(serializers.Serializer):
    """Serializer for data file uploads"""
    file = serializers.FileField(required=True)
    file_type = serializers.ChoiceField(
        choices=['csv', 'excel', 'spss', 'json'],
        default='csv'
    )
    delimiter = serializers.CharField(default=',', required=False)
    has_header = serializers.BooleanField(default=True)
    
    def validate_file(self, value):
        """Validate uploaded file"""
        # Check file size (max 50MB)
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 50MB")
        
        # Check file extension
        allowed_extensions = ['.csv', '.xlsx', '.xls', '.sav', '.json']
        file_name = value.name.lower()
        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
            )
        
        return value


class VariableInfoSerializer(serializers.Serializer):
    """Serializer for variable information"""
    name = serializers.CharField(max_length=100)
    type = serializers.ChoiceField(
        choices=['continuous', 'ordinal', 'nominal', 'binary']
    )
    dtype = serializers.CharField()  # numpy dtype
    missing_count = serializers.IntegerField()
    unique_count = serializers.IntegerField()
    sample_values = serializers.ListField(
        child=serializers.CharField(),
        max_length=5
    )


class DataSummarySerializer(serializers.Serializer):
    """Serializer for data summary response"""
    data_id = serializers.CharField()
    n_rows = serializers.IntegerField()
    n_cols = serializers.IntegerField()
    variables = VariableInfoSerializer(many=True)
    missing_summary = serializers.DictField()
    data_types = serializers.DictField()
    preview = serializers.ListField()  # First 5 rows


class AssumptionCheckRequestSerializer(serializers.Serializer):
    """Serializer for assumption check requests"""
    data_id = serializers.CharField(required=True)
    test_type = serializers.ChoiceField(
        choices=[
            'normality', 'homogeneity', 'independence',
            'linearity', 'multicollinearity', 'outliers'
        ],
        required=False
    )
    variables = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    alpha = serializers.FloatField(default=0.05, min_value=0.001, max_value=0.999)


class AssumptionResultSerializer(serializers.Serializer):
    """Serializer for assumption test results"""
    test_name = serializers.CharField()
    statistic = serializers.FloatField()
    p_value = serializers.FloatField()
    passed = serializers.BooleanField()
    interpretation = serializers.CharField()
    recommendations = serializers.ListField(
        child=serializers.CharField()
    )


class TestRecommendationRequestSerializer(serializers.Serializer):
    """Serializer for test recommendation requests"""
    data_id = serializers.CharField(required=True)
    dependent_var = serializers.CharField(required=True)
    independent_vars = serializers.ListField(
        child=serializers.CharField(),
        min_length=1
    )
    hypothesis_type = serializers.ChoiceField(
        choices=['difference', 'relationship', 'prediction', 'reduction'],
        default='difference'
    )
    is_paired = serializers.BooleanField(default=False)
    alpha = serializers.FloatField(default=0.05)


class RecommendedTestSerializer(serializers.Serializer):
    """Serializer for recommended test information"""
    test_name = serializers.CharField()
    test_type = serializers.CharField()
    suitability_score = serializers.FloatField()
    reasons = serializers.ListField(child=serializers.CharField())
    assumptions_met = serializers.ListField(child=serializers.CharField())
    assumptions_violated = serializers.ListField(child=serializers.CharField())
    power_estimate = serializers.FloatField(required=False)
    sample_size_adequate = serializers.BooleanField()
    alternatives = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )


class TestExecutionRequestSerializer(serializers.Serializer):
    """Serializer for test execution requests"""
    data_id = serializers.CharField(required=True)
    test_type = serializers.CharField(required=True)
    dependent_var = serializers.CharField(required=True)
    independent_vars = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    parameters = serializers.DictField(default=dict)
    options = serializers.DictField(default=dict)


class TestResultSerializer(serializers.Serializer):
    """Serializer for test execution results"""
    test_name = serializers.CharField()
    statistic = serializers.FloatField()
    p_value = serializers.FloatField()
    degrees_of_freedom = serializers.FloatField(required=False)
    effect_size = serializers.DictField()  # type, value, CI
    confidence_interval = serializers.ListField(
        child=serializers.FloatField(),
        required=False
    )
    summary_statistics = serializers.DictField()
    interpretation = serializers.CharField()
    apa_format = serializers.CharField()
    assumptions = AssumptionResultSerializer(many=True)
    post_hoc = serializers.DictField(required=False)
    visualizations = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )


# Multiplicity Correction Serializers

class MultiplicityCorrectionRequestSerializer(serializers.Serializer):
    """Serializer for multiplicity correction requests"""
    p_values = serializers.ListField(
        child=serializers.FloatField(min_value=0, max_value=1),
        min_length=2
    )
    method = serializers.ChoiceField(
        choices=[
            'bonferroni', 'holm', 'hochberg', 'hommel',
            'fdr_bh', 'fdr_by', 'fdr_tsbh', 'fdr_tsbky',
            'sidak', 'holm-sidak', 'simes-hochberg'
        ],
        default='holm'
    )
    alpha = serializers.FloatField(default=0.05, min_value=0.001, max_value=0.999)
    hypothesis_names = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    
    def validate(self, data):
        """Validate that p_values and hypothesis_names have same length if both provided"""
        if 'hypothesis_names' in data:
            if len(data['hypothesis_names']) != len(data['p_values']):
                raise serializers.ValidationError(
                    "Number of hypothesis names must match number of p-values"
                )
        return data


class MultiplicityCorrectionResultSerializer(serializers.Serializer):
    """Serializer for multiplicity correction results"""
    method = serializers.CharField()
    alpha_original = serializers.FloatField()
    alpha_adjusted = serializers.FloatField()
    p_values_original = serializers.ListField(child=serializers.FloatField())
    p_values_adjusted = serializers.ListField(child=serializers.FloatField())
    rejected = serializers.ListField(child=serializers.BooleanField())
    n_significant = serializers.IntegerField()
    n_tests = serializers.IntegerField()
    family_wise_error_rate = serializers.FloatField()
    false_discovery_rate = serializers.FloatField(required=False)
    summary = serializers.CharField()


# Power Analysis Serializers

class PowerCalculationRequestSerializer(serializers.Serializer):
    """Serializer for power calculation requests"""
    test_type = serializers.ChoiceField(
        choices=[
            't-test', 'anova', 'correlation', 'regression',
            'chi-square', 'proportion', 'means'
        ]
    )
    effect_size = serializers.FloatField()
    sample_size = serializers.IntegerField(min_value=2, required=False)
    n_groups = serializers.IntegerField(min_value=2, default=2)
    alpha = serializers.FloatField(default=0.05, min_value=0.001, max_value=0.999)
    power = serializers.FloatField(min_value=0.01, max_value=0.999, required=False)
    alternative = serializers.ChoiceField(
        choices=['two-sided', 'greater', 'less'],
        default='two-sided'
    )
    
    def validate(self, data):
        """Ensure either sample_size or power is provided"""
        if 'sample_size' not in data and 'power' not in data:
            raise serializers.ValidationError(
                "Either sample_size or power must be provided"
            )
        if 'sample_size' in data and 'power' in data:
            raise serializers.ValidationError(
                "Provide either sample_size or power, not both"
            )
        return data


class PowerAnalysisResultSerializer(serializers.Serializer):
    """Serializer for power analysis results"""
    power = serializers.FloatField(required=False)
    sample_size = serializers.IntegerField(required=False)
    effect_size = serializers.FloatField()
    alpha = serializers.FloatField()
    test_type = serializers.CharField()
    n_groups = serializers.IntegerField()
    critical_value = serializers.FloatField()
    noncentrality = serializers.FloatField()
    interpretation = serializers.CharField()
    power_curve = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
    recommendations = serializers.ListField(
        child=serializers.CharField()
    )


# Effect Size Serializers

class EffectSizeCalculationRequestSerializer(serializers.Serializer):
    """Serializer for effect size calculation requests"""
    data_id = serializers.CharField(required=False)
    values = serializers.DictField(required=False)  # For direct data input
    test_type = serializers.ChoiceField(
        choices=[
            'cohens_d', 'hedges_g', 'glass_delta',
            'eta_squared', 'partial_eta_squared', 'omega_squared',
            'cohens_f', 'cohens_f2', 'cramers_v', 'phi',
            'odds_ratio', 'risk_ratio', 'correlation_r'
        ]
    )
    groups = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    confidence_level = serializers.FloatField(default=0.95)
    
    def validate(self, data):
        """Ensure either data_id or values is provided"""
        if 'data_id' not in data and 'values' not in data:
            raise serializers.ValidationError(
                "Either data_id or values must be provided"
            )
        return data


class EffectSizeResultSerializer(serializers.Serializer):
    """Serializer for effect size results"""
    effect_size_type = serializers.CharField()
    value = serializers.FloatField()
    confidence_interval = serializers.ListField(
        child=serializers.FloatField(),
        min_length=2,
        max_length=2
    )
    standard_error = serializers.FloatField()
    interpretation = serializers.CharField()
    magnitude = serializers.ChoiceField(
        choices=['trivial', 'small', 'medium', 'large', 'very_large']
    )
    sample_size = serializers.IntegerField()
    benchmarks = serializers.DictField()  # Domain-specific benchmarks


# Reproducibility Serializers

class BundleCreationRequestSerializer(serializers.Serializer):
    """Serializer for reproducibility bundle creation"""
    analysis_id = serializers.CharField(required=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False)
    include_data = serializers.BooleanField(default=True)
    include_code = serializers.BooleanField(default=True)
    include_environment = serializers.BooleanField(default=True)
    include_results = serializers.BooleanField(default=True)
    compression = serializers.ChoiceField(
        choices=['none', 'gzip', 'zip'],
        default='gzip'
    )


class BundleInfoSerializer(serializers.Serializer):
    """Serializer for bundle information"""
    bundle_id = serializers.CharField()
    fingerprint = serializers.CharField()
    created_at = serializers.DateTimeField()
    size_bytes = serializers.IntegerField()
    contents = serializers.DictField()
    download_url = serializers.URLField()
    validation_status = serializers.CharField()
    reproducibility_score = serializers.FloatField()


# Error Response Serializer

class ErrorResponseSerializer(serializers.Serializer):
    """Standard error response format"""
    error = serializers.CharField()
    detail = serializers.CharField(required=False)
    code = serializers.CharField(required=False)
    timestamp = serializers.DateTimeField()
    request_id = serializers.CharField(required=False)