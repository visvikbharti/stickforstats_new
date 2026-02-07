from rest_framework import serializers
from ..models import (
    ExperimentDesign,
    FactorDefinition,
    ResponseDefinition,
    ModelAnalysis,
    ExperimentRun,
    OptimizationAnalysis
)
from core.models import AnalysisSession


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
    # Expose model fields with API-friendly aliases
    unit = serializers.CharField(source='units', required=False, allow_blank=True)
    data_type = serializers.CharField(source='factor_type', required=False)
    is_categorical = serializers.SerializerMethodField()
    categories = serializers.JSONField(source='level_values', required=False)

    class Meta:
        model = FactorDefinition
        fields = [
            'id', 'name', 'symbol', 'unit', 'data_type', 'low_level', 'high_level',
            'center_point', 'is_categorical', 'categories'
        ]

    def get_is_categorical(self, obj):
        return obj.factor_type == 'CATEGORICAL'


class ResponseDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for ResponseDefinition model."""
    unit = serializers.CharField(source='units', required=False, allow_blank=True)
    weight = serializers.IntegerField(source='importance', required=False)

    class Meta:
        model = ResponseDefinition
        fields = [
            'id', 'name', 'unit', 'description', 'objective', 'target_value',
            'lower_bound', 'upper_bound', 'weight'
        ]


class ExperimentRunSerializer(serializers.ModelSerializer):
    """Serializer for ExperimentRun model."""
    class Meta:
        model = ExperimentRun
        fields = ['id', 'run_order', 'standard_order', 'block', 'is_center_point',
                  'factor_values', 'response_values', 'status', 'notes']


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
    factors = FactorDefinitionSerializer(many=True, read_only=True)
    responses = ResponseDefinitionSerializer(source='responses_defs', many=True, read_only=True)
    runs = ExperimentRunSerializer(source='runs_set', many=True, read_only=True)

    class Meta:
        model = ExperimentDesign
        fields = [
            'id', 'analysis_session', 'name', 'description', 'design_type',
            'num_factors', 'num_runs', 'num_center_points', 'num_replicates',
            'resolution', 'is_randomized', 'block_column', 'num_blocks',
            'design_matrix', 'factor_details', 'response_details',
            'created_at', 'updated_at', 'factors', 'responses', 'runs'
        ]

    def to_representation(self, instance):
        """Override to use correct related names."""
        ret = super().to_representation(instance)
        # Use the actual related_name from the FK definitions
        ret['factors'] = FactorDefinitionSerializer(
            instance.factors.all(), many=True
        ).data
        ret['responses'] = ResponseDefinitionSerializer(
            instance.responses.all(), many=True
        ).data
        ret['runs'] = ExperimentRunSerializer(
            instance.runs.all(), many=True
        ).data
        return ret


class ModelAnalysisSerializer(serializers.ModelSerializer):
    """Basic serializer for ModelAnalysis model."""
    analysis_type = serializers.CharField(source='model_type', required=False)

    class Meta:
        model = ModelAnalysis
        fields = [
            'id', 'experiment_design', 'name', 'response_name', 'description',
            'analysis_type', 'status', 'responses', 'results', 'error_message',
            'created_at', 'updated_at'
        ]


class ModelAnalysisDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for ModelAnalysis model."""
    experiment_design = ExperimentDesignSerializer(read_only=True)
    analysis_type = serializers.CharField(source='model_type', required=False)

    class Meta:
        model = ModelAnalysis
        fields = [
            'id', 'experiment_design', 'name', 'response_name', 'description',
            'analysis_type', 'status', 'responses', 'results', 'error_message',
            'r_squared', 'adjusted_r_squared', 'predicted_r_squared',
            'f_value', 'p_value', 'rmse', 'aic', 'bic',
            'terms', 'coefficients', 'anova_results', 'residual_analysis',
            'created_at', 'updated_at'
        ]


class OptimizationAnalysisSerializer(serializers.ModelSerializer):
    """Basic serializer for OptimizationAnalysis model."""
    class Meta:
        model = OptimizationAnalysis
        fields = [
            'id', 'experiment_design', 'model_analysis', 'name', 'description',
            'optimization_type', 'status', 'response_goals', 'constraints',
            'results', 'error_message', 'created_at', 'updated_at'
        ]


class OptimizationAnalysisDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for OptimizationAnalysis model."""
    model_analysis = ModelAnalysisSerializer(read_only=True)

    class Meta:
        model = OptimizationAnalysis
        fields = [
            'id', 'experiment_design', 'model_analysis', 'name', 'description',
            'optimization_type', 'status', 'response_goals', 'constraints',
            'results', 'error_message', 'optimal_settings', 'predicted_responses',
            'desirability', 'created_at', 'updated_at'
        ]


class GenerateDesignSerializer(serializers.Serializer):
    """Serializer for generating a new experimental design."""
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    design_type = serializers.CharField(required=True)
    factors = serializers.ListField(child=serializers.DictField(), required=True)
    responses = serializers.ListField(child=serializers.DictField(), required=True)
    design_params = serializers.JSONField(required=False)
