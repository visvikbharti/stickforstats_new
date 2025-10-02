from rest_framework import serializers
from uuid import UUID
from django.contrib.auth import get_user_model
from ..models import (
    ExperimentDesign, 
    FactorDefinition, 
    ResponseDefinition, 
    ModelAnalysis, 
    ExperimentRun, 
    OptimizationAnalysis
)
# from core.models import AnalysisSession, AnalysisResult  # Models don't exist yet
from typing import Any as AnalysisSession  # Placeholder type
from typing import Any as AnalysisResult  # Placeholder type

User = get_user_model()

class RunModelAnalysisSerializer(serializers.Serializer):
    """Serializer for running model analysis."""
    
    experiment_design_id = serializers.UUIDField(required=True)
    analysis_type = serializers.CharField(required=True)
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    responses = serializers.ListField(child=serializers.CharField(), required=True)
    analysis_params = serializers.JSONField(required=False)


class RunOptimizationSerializer(serializers.Serializer):
    """Serializer for running optimization."""
    
    model_analysis_id = serializers.UUIDField(required=True)
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    optimization_type = serializers.CharField(required=True)
    response_goals = serializers.JSONField(required=True)
    constraints = serializers.JSONField(required=False)
    optimization_params = serializers.JSONField(required=False)


class AnalysisSessionSerializer(serializers.ModelSerializer):
    """Serializer for AnalysisSession model."""
    
    class Meta:
        model = AnalysisSession
        fields = ['id', 'name', 'description', 'analysis_type', 'status', 'created_at', 'updated_at']


class FactorDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for FactorDefinition model."""
    
    class Meta:
        model = FactorDefinition
        fields = [
            'id', 'name', 'unit', 'data_type', 'low_level', 'high_level', 
            'center_point', 'is_categorical', 'categories'
        ]


class ResponseDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for ResponseDefinition model."""
    
    class Meta:
        model = ResponseDefinition
        fields = [
            'id', 'name', 'unit', 'description', 'target_value', 
            'lower_bound', 'upper_bound', 'weight'
        ]


class ExperimentRunSerializer(serializers.ModelSerializer):
    """Serializer for ExperimentRun model."""
    
    class Meta:
        model = ExperimentRun
        fields = ['id', 'run_order', 'factor_values', 'response_values', 'notes']


class ExperimentDesignSerializer(serializers.ModelSerializer):
    """Basic serializer for ExperimentDesign model."""
    
    class Meta:
        model = ExperimentDesign
        fields = [
            'id', 'analysis_session', 'name', 'description', 'design_type', 
            'num_factors', 'num_runs', 'num_center_points', 'num_replicates', 
            'resolution', 'is_randomized', 'block_column', 'num_blocks', 
            'design_matrix', 'factor_details', 'response_details', 
            'created_at', 'updated_at'
        ]


class ExperimentDesignDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for ExperimentDesign model with related objects."""
    
    analysis_session = AnalysisSessionSerializer(read_only=True)
    factors = FactorDefinitionSerializer(source='factordefinition_set', many=True, read_only=True)
    responses = ResponseDefinitionSerializer(source='responsedefinition_set', many=True, read_only=True)
    runs = ExperimentRunSerializer(source='experimentrun_set', many=True, read_only=True)
    
    class Meta:
        model = ExperimentDesign
        fields = [
            'id', 'analysis_session', 'name', 'description', 'design_type', 
            'num_factors', 'num_runs', 'num_center_points', 'num_replicates', 
            'resolution', 'is_randomized', 'block_column', 'num_blocks', 
            'design_matrix', 'factor_details', 'response_details', 
            'created_at', 'updated_at', 'factors', 'responses', 'runs'
        ]


class ModelAnalysisSerializer(serializers.ModelSerializer):
    """Basic serializer for ModelAnalysis model."""
    
    class Meta:
        model = ModelAnalysis
        fields = [
            'id', 'experiment_design', 'name', 'description', 'analysis_type', 
            'status', 'responses', 'results', 'error_message', 'created_at', 'updated_at'
        ]


class ModelAnalysisDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for ModelAnalysis model."""
    
    experiment_design = ExperimentDesignSerializer(read_only=True)
    
    class Meta:
        model = ModelAnalysis
        fields = [
            'id', 'experiment_design', 'name', 'description', 'analysis_type', 
            'status', 'responses', 'results', 'error_message', 'created_at', 'updated_at'
        ]


class OptimizationAnalysisSerializer(serializers.ModelSerializer):
    """Basic serializer for OptimizationAnalysis model."""
    
    class Meta:
        model = OptimizationAnalysis
        fields = [
            'id', 'model_analysis', 'name', 'description', 'optimization_type', 
            'status', 'response_goals', 'constraints', 'results', 
            'error_message', 'created_at', 'updated_at'
        ]


class OptimizationAnalysisDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for OptimizationAnalysis model."""
    
    model_analysis = ModelAnalysisSerializer(read_only=True)
    
    class Meta:
        model = OptimizationAnalysis
        fields = [
            'id', 'model_analysis', 'name', 'description', 'optimization_type', 
            'status', 'response_goals', 'constraints', 'results', 
            'error_message', 'created_at', 'updated_at'
        ]


class GenerateDesignSerializer(serializers.Serializer):
    """Serializer for generating a new experimental design."""
    
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    design_type = serializers.CharField(required=True)
    
    factors = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
    
    responses = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
    
    design_params = serializers.JSONField(required=False)