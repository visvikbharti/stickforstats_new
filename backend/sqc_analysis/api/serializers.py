"""
API serializers for the SQC Analysis module.

This module provides serializers for SQC analysis models and API requests/responses.
"""

from rest_framework import serializers
# from core.models import AnalysisSession, AnalysisResult  # Models don't exist yet
from typing import Any as AnalysisSession  # Placeholder type
from typing import Any as AnalysisResult  # Placeholder type
from stickforstats.sqc_analysis.models import (
    ControlChartAnalysis, ProcessCapabilityAnalysis,
    AcceptanceSamplingPlan, MeasurementSystemAnalysis,
    EconomicDesignAnalysis, SPCImplementationPlan
)


class AnalysisResultSerializer(serializers.ModelSerializer):
    """Serializer for AnalysisResult model."""
    
    class Meta:
        model = AnalysisResult
        fields = [
            'id', 'name', 'analysis_type', 'parameters', 
            'result_summary', 'interpretation', 'created_at'
        ]


class AnalysisSessionSerializer(serializers.ModelSerializer):
    """Serializer for AnalysisSession model."""
    
    class Meta:
        model = AnalysisSession
        fields = [
            'id', 'name', 'description', 'module', 
            'status', 'created_at', 'updated_at'
        ]


class ControlChartAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for ControlChartAnalysis model."""
    
    analysis_session = AnalysisSessionSerializer(read_only=True)
    analysis_result = AnalysisResultSerializer(read_only=True)
    
    class Meta:
        model = ControlChartAnalysis
        fields = [
            'id', 'analysis_session', 'analysis_result', 'chart_type',
            'sample_size', 'variable_sample_size', 'parameter_column',
            'grouping_column', 'time_column', 'use_custom_limits',
            'upper_control_limit', 'lower_control_limit', 'center_line',
            'detect_rules', 'rule_set', 'special_causes_detected',
            'created_at', 'updated_at'
        ]


class ProcessCapabilityAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for ProcessCapabilityAnalysis model."""
    
    analysis_session = AnalysisSessionSerializer(read_only=True)
    analysis_result = AnalysisResultSerializer(read_only=True)
    
    class Meta:
        model = ProcessCapabilityAnalysis
        fields = [
            'id', 'analysis_session', 'analysis_result', 'parameter_column',
            'grouping_column', 'lower_spec_limit', 'upper_spec_limit',
            'target_value', 'assume_normality', 'transformation_method',
            'transformation_lambda', 'cp', 'cpk', 'pp', 'ppk', 'mean',
            'std_dev', 'within_std_dev', 'overall_std_dev', 'dpm',
            'process_yield', 'created_at', 'updated_at'
        ]


class AcceptanceSamplingPlanSerializer(serializers.ModelSerializer):
    """Serializer for AcceptanceSamplingPlan model."""
    
    analysis_session = AnalysisSessionSerializer(read_only=True)
    analysis_result = AnalysisResultSerializer(read_only=True)
    
    class Meta:
        model = AcceptanceSamplingPlan
        fields = [
            'id', 'analysis_session', 'analysis_result', 'plan_type',
            'lot_size', 'sample_size', 'acceptance_number', 'rejection_number',
            'second_sample_size', 'second_acceptance_number', 'second_rejection_number',
            'standard_used', 'aql', 'ltpd', 'producer_risk', 'consumer_risk',
            'oc_curve_data', 'created_at', 'updated_at'
        ]


class MeasurementSystemAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for MeasurementSystemAnalysis model."""
    
    analysis_session = AnalysisSessionSerializer(read_only=True)
    analysis_result = AnalysisResultSerializer(read_only=True)
    
    class Meta:
        model = MeasurementSystemAnalysis
        fields = [
            'id', 'analysis_session', 'analysis_result', 'msa_type',
            'parameter_column', 'part_column', 'operator_column', 'reference_column',
            'attribute_type', 'total_variation', 'repeatability', 'reproducibility',
            'gage_rr', 'part_variation', 'number_of_distinct_categories',
            'percent_study_variation', 'percent_tolerance', 'anova_results',
            'percent_agreement', 'kappa_statistic', 'created_at', 'updated_at'
        ]


class EconomicDesignAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for EconomicDesignAnalysis model."""
    
    analysis_session = AnalysisSessionSerializer(read_only=True)
    analysis_result = AnalysisResultSerializer(read_only=True)
    
    class Meta:
        model = EconomicDesignAnalysis
        fields = [
            'id', 'analysis_session', 'analysis_result', 'chart_type',
            'sample_size', 'sampling_interval', 'k_factor',
            'upper_control_limit', 'lower_control_limit', 'center_line',
            'in_control_arl', 'out_of_control_arl',
            'hourly_cost', 'cost_savings',
            'created_at', 'updated_at'
        ]


class SPCImplementationPlanSerializer(serializers.ModelSerializer):
    """Serializer for SPCImplementationPlan model."""
    
    analysis_session = AnalysisSessionSerializer(read_only=True)
    analysis_result = AnalysisResultSerializer(read_only=True)
    
    class Meta:
        model = SPCImplementationPlan
        fields = [
            'id', 'analysis_session', 'analysis_result', 'plan_type',
            'industry', 'organization_size', 'implementation_scope',
            'start_date', 'target_completion_date', 'total_duration',
            'focus_area', 'maturity_level', 'maturity_score',
            'completeness_score', 'quality_score', 'plan_content',
            'created_at', 'updated_at'
        ]


# Request Serializers

class ControlChartRequestSerializer(serializers.Serializer):
    """Serializer for control chart analysis request."""
    
    dataset_id = serializers.UUIDField(required=True)
    chart_type = serializers.ChoiceField(
        choices=['xbar_r', 'xbar_s', 'i_mr', 'p', 'np', 'c', 'u'],
        required=True
    )
    parameter_column = serializers.CharField(required=True)
    grouping_column = serializers.CharField(required=False, allow_blank=True)
    time_column = serializers.CharField(required=False, allow_blank=True)
    sample_size = serializers.IntegerField(required=False, min_value=2, max_value=25)
    detect_rules = serializers.BooleanField(required=False, default=True)
    rule_set = serializers.ChoiceField(
        choices=['western_electric', 'nelson', 'custom'],
        required=False,
        default='western_electric'
    )
    custom_control_limits = serializers.JSONField(required=False)
    session_name = serializers.CharField(required=False, max_length=255)


class ProcessCapabilityRequestSerializer(serializers.Serializer):
    """Serializer for process capability analysis request."""
    
    dataset_id = serializers.UUIDField(required=True)
    parameter_column = serializers.CharField(required=True)
    grouping_column = serializers.CharField(required=False, allow_blank=True)
    lower_spec_limit = serializers.FloatField(required=False, allow_null=True)
    upper_spec_limit = serializers.FloatField(required=False, allow_null=True)
    target_value = serializers.FloatField(required=False, allow_null=True)
    assume_normality = serializers.BooleanField(required=False, default=True)
    transformation_method = serializers.ChoiceField(
        choices=['none', 'box_cox', 'johnson', 'log'],
        required=False,
        default='none'
    )
    session_name = serializers.CharField(required=False, max_length=255)
    
    def validate(self, data):
        """Validate that at least one specification limit is provided."""
        if not data.get('lower_spec_limit') and not data.get('upper_spec_limit'):
            raise serializers.ValidationError(
                "At least one specification limit (lower or upper) must be provided."
            )
        return data


class AcceptanceSamplingRequestSerializer(serializers.Serializer):
    """Serializer for acceptance sampling plan request."""
    
    plan_type = serializers.ChoiceField(
        choices=['single', 'double', 'multiple', 'sequential', 'skip_lot', 'continuous', 'ansi_z14'],
        required=True
    )
    lot_size = serializers.IntegerField(required=False, min_value=1)
    aql = serializers.FloatField(required=False, min_value=0.01, max_value=10.0)
    ltpd = serializers.FloatField(required=False, min_value=0.01)
    producer_risk = serializers.FloatField(required=False, min_value=0.001, max_value=0.5, default=0.05)
    consumer_risk = serializers.FloatField(required=False, min_value=0.001, max_value=0.5, default=0.1)
    inspection_level = serializers.CharField(required=False)
    frequency_index = serializers.IntegerField(required=False, min_value=1, max_value=10)
    clearing_interval = serializers.IntegerField(required=False, min_value=1)
    sampling_fraction = serializers.FloatField(required=False, min_value=0.01, max_value=1.0)
    session_name = serializers.CharField(required=False, max_length=255)
    
    def validate(self, data):
        """Validate based on plan type."""
        plan_type = data.get('plan_type')
        
        if plan_type in ['single', 'double', 'multiple', 'skip_lot', 'ansi_z14']:
            if not data.get('lot_size'):
                raise serializers.ValidationError({
                    "lot_size": f"Lot size is required for {plan_type} sampling plan."
                })
        
        return data


class MeasurementSystemAnalysisRequestSerializer(serializers.Serializer):
    """Serializer for measurement system analysis request."""
    
    dataset_id = serializers.UUIDField(required=True)
    msa_type = serializers.ChoiceField(
        choices=['gage_rr', 'attribute_agreement', 'bias', 'linearity', 'stability'],
        required=True
    )
    parameter_column = serializers.CharField(required=True)
    part_column = serializers.CharField(required=False, allow_blank=True)
    operator_column = serializers.CharField(required=False, allow_blank=True)
    reference_column = serializers.CharField(required=False, allow_blank=True)
    time_column = serializers.CharField(required=False, allow_blank=True)
    method = serializers.ChoiceField(
        choices=['anova', 'range'],
        required=False,
        default='anova'
    )
    attribute_type = serializers.ChoiceField(
        choices=['binary', 'ordinal', 'nominal'],
        required=False,
        default='binary'
    )
    session_name = serializers.CharField(required=False, max_length=255)
    
    def validate(self, data):
        """Validate fields based on MSA type."""
        msa_type = data.get('msa_type')
        
        if msa_type in ['gage_rr', 'attribute_agreement']:
            if not data.get('part_column'):
                raise serializers.ValidationError({
                    "part_column": f"Part column is required for {msa_type} analysis."
                })
            if not data.get('operator_column'):
                raise serializers.ValidationError({
                    "operator_column": f"Operator column is required for {msa_type} analysis."
                })
        
        if msa_type in ['bias', 'linearity']:
            if not data.get('reference_column'):
                raise serializers.ValidationError({
                    "reference_column": f"Reference column is required for {msa_type} analysis."
                })
        
        if msa_type == 'stability':
            if not data.get('time_column'):
                raise serializers.ValidationError({
                    "time_column": f"Time column is required for stability analysis."
                })
        
        return data


class EconomicDesignRequestSerializer(serializers.Serializer):
    """Serializer for economic design of control charts request."""
    
    chart_type = serializers.ChoiceField(
        choices=['xbar', 'xbar_r', 'xbar_s', 'i_mr', 'p', 'np', 'c', 'u'],
        required=True
    )
    # Process parameters
    mean_time_to_failure = serializers.FloatField(required=False, min_value=0.1, default=100)
    shift_size = serializers.FloatField(required=False, min_value=0.1, default=2.0)
    std_dev = serializers.FloatField(required=False, min_value=0.01, default=1.0)
    hourly_production = serializers.FloatField(required=False, min_value=1, default=100)
    
    # Cost parameters
    sampling_cost = serializers.FloatField(required=False, min_value=0, default=5.0)
    fixed_sampling_cost = serializers.FloatField(required=False, min_value=0, default=10.0)
    false_alarm_cost = serializers.FloatField(required=False, min_value=0, default=200.0)
    hourly_defect_cost = serializers.FloatField(required=False, min_value=0, default=500.0)
    finding_cost = serializers.FloatField(required=False, min_value=0, default=250.0)
    
    # Constraints
    min_sample_size = serializers.IntegerField(required=False, min_value=1, default=1)
    max_sample_size = serializers.IntegerField(required=False, min_value=1, default=15)
    min_sampling_interval = serializers.FloatField(required=False, min_value=0.01, default=0.25)
    max_sampling_interval = serializers.FloatField(required=False, min_value=0.01, default=8.0)
    min_detection_power = serializers.FloatField(required=False, min_value=0.01, max_value=0.99, default=0.9)
    max_false_alarm_rate = serializers.FloatField(required=False, min_value=0.001, max_value=0.5, default=0.01)
    
    session_name = serializers.CharField(required=False, max_length=255)
    
    def validate(self, data):
        """Validate constraints."""
        min_sample_size = data.get('min_sample_size', 1)
        max_sample_size = data.get('max_sample_size', 15)
        
        if min_sample_size > max_sample_size:
            raise serializers.ValidationError({
                "min_sample_size": "Minimum sample size cannot be greater than maximum sample size."
            })
        
        min_sampling_interval = data.get('min_sampling_interval', 0.25)
        max_sampling_interval = data.get('max_sampling_interval', 8.0)
        
        if min_sampling_interval > max_sampling_interval:
            raise serializers.ValidationError({
                "min_sampling_interval": "Minimum sampling interval cannot be greater than maximum sampling interval."
            })
        
        return data


class SPCImplementationRequestSerializer(serializers.Serializer):
    """Serializer for SPC implementation plan request."""
    
    plan_type = serializers.ChoiceField(
        choices=['roadmap', 'control_plan', 'maturity_assessment', 'case_study'],
        required=True
    )
    industry = serializers.CharField(required=False, default='manufacturing')
    organization_size = serializers.ChoiceField(
        choices=['small', 'medium', 'large', 'enterprise'],
        required=False,
        default='medium'
    )
    implementation_scope = serializers.ChoiceField(
        choices=['pilot', 'department', 'division', 'organization'],
        required=False,
        default='department'
    )
    existing_quality_system = serializers.ChoiceField(
        choices=['none', 'basic', 'iso9001', 'six_sigma', 'lean'],
        required=False,
        default='basic'
    )
    process_complexity = serializers.ChoiceField(
        choices=['low', 'medium', 'high'],
        required=False,
        default='medium'
    )
    focus_area = serializers.CharField(required=False)
    
    # For control plans
    control_plan_items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    
    # For maturity assessments
    assessment_responses = serializers.DictField(required=False, default=dict)
    
    session_name = serializers.CharField(required=False, max_length=255)
    
    def validate(self, data):
        """Validate based on plan type."""
        plan_type = data.get('plan_type')
        
        if plan_type == 'control_plan' and not data.get('control_plan_items'):
            raise serializers.ValidationError({
                "control_plan_items": "Control plan items are required for control plan."
            })
        
        if plan_type == 'maturity_assessment' and not data.get('assessment_responses'):
            raise serializers.ValidationError({
                "assessment_responses": "Assessment responses are required for maturity assessment."
            })
        
        if plan_type == 'case_study' and not data.get('focus_area'):
            raise serializers.ValidationError({
                "focus_area": "Focus area is required for case study."
            })
        
        return data