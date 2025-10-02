from rest_framework import serializers
from django.contrib.auth import get_user_model
from ..models import (
    ConfidenceIntervalProject,
    IntervalData,
    IntervalResult,
    SimulationResult,
    EducationalResource
)

User = get_user_model()


class PmfPdfCalculationSerializer(serializers.Serializer):
    """Serializer for calculating PMF/PDF of various distributions."""
    distribution = serializers.CharField(required=True)
    params = serializers.DictField(required=True)
    x_min = serializers.FloatField(required=False)
    x_max = serializers.FloatField(required=False)
    num_points = serializers.IntegerField(required=False, default=100)
    discrete = serializers.BooleanField(required=False, default=False)


class CoverageSimulationSerializer(serializers.Serializer):
    """Serializer for confidence interval coverage simulation."""
    project_id = serializers.UUIDField(required=True)
    interval_type = serializers.CharField(required=True)
    confidence_level = serializers.FloatField(default=0.95)
    sample_size = serializers.IntegerField(required=True)
    n_simulations = serializers.IntegerField(default=1000)
    distribution = serializers.CharField(default='NORMAL')
    dist_params = serializers.DictField(required=False, default=dict)
    additional_options = serializers.DictField(required=False, default=dict)


class IntervalDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntervalData
        fields = ['id', 'project', 'name', 'data_type', 'data',
                  'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class IntervalResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntervalResult
        fields = ['id', 'project', 'interval_type', 'data_source', 'parameters', 'results',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SimulationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationResult
        fields = ['id', 'project', 'simulation_type', 'parameters', 'results',
                 'created_at', 'completed_at', 'is_complete']
        read_only_fields = ['id', 'created_at', 'completed_at']


class EducationalResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationalResource
        fields = ['id', 'title', 'content_type', 'content', 'category', 'order',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ConfidenceIntervalProjectSerializer(serializers.ModelSerializer):
    data_sets = IntervalDataSerializer(many=True, read_only=True)
    interval_results = IntervalResultSerializer(many=True, read_only=True)
    simulation_results = SimulationResultSerializer(many=True, read_only=True)

    class Meta:
        model = ConfidenceIntervalProject
        fields = ['id', 'user', 'name', 'description', 'is_public', 'created_at',
                 'updated_at', 'data_sets', 'interval_results', 'simulation_results']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CalculateIntervalSerializer(serializers.Serializer):
    interval_type = serializers.CharField(required=True)
    data_id = serializers.UUIDField(required=False)
    project_id = serializers.UUIDField(required=True)
    confidence_level = serializers.FloatField(default=0.95)
    
    # Fields for manual data entry
    numeric_data = serializers.ListField(child=serializers.FloatField(), required=False)
    sample_size = serializers.IntegerField(required=False)
    successes = serializers.IntegerField(required=False)
    sample_mean = serializers.FloatField(required=False)
    sample_std = serializers.FloatField(required=False)
    population_std = serializers.FloatField(required=False)
    
    # Fields for difference intervals
    data_id_2 = serializers.UUIDField(required=False)
    numeric_data_2 = serializers.ListField(child=serializers.FloatField(), required=False)
    sample_size_2 = serializers.IntegerField(required=False)
    successes_2 = serializers.IntegerField(required=False)
    sample_mean_2 = serializers.FloatField(required=False)
    sample_std_2 = serializers.FloatField(required=False)
    
    # Bootstrap specific parameters
    n_resamples = serializers.IntegerField(default=1000, required=False)
    bootstrap_method = serializers.CharField(default='percentile', required=False)
    
    def validate(self, data):
        interval_type = data.get('interval_type')
        
        # Validate required fields based on interval type
        if interval_type == 'MEAN_Z':
            if not (('numeric_data' in data) or 
                   ('sample_mean' in data and 'population_std' in data and 'sample_size' in data)):
                raise serializers.ValidationError(
                    "For Z-interval, provide either numeric_data or sample_mean, population_std, and sample_size")
        
        elif interval_type == 'MEAN_T':
            if not (('numeric_data' in data) or 
                   ('sample_mean' in data and 'sample_std' in data and 'sample_size' in data)):
                raise serializers.ValidationError(
                    "For T-interval, provide either numeric_data or sample_mean, sample_std, and sample_size")
        
        elif interval_type in ['PROPORTION_WALD', 'PROPORTION_WILSON', 'PROPORTION_CLOPPER_PEARSON']:
            if not (('numeric_data' in data) or ('successes' in data and 'sample_size' in data)):
                raise serializers.ValidationError(
                    f"For {interval_type}, provide either numeric_data or successes and sample_size")
                
        elif interval_type == 'VARIANCE':
            if not ('numeric_data' in data):
                raise serializers.ValidationError("For variance interval, provide numeric_data")
        
        elif interval_type == 'DIFFERENCE_MEANS':
            if not ((('data_id' in data) and ('data_id_2' in data)) or 
                   (('numeric_data' in data) and ('numeric_data_2' in data)) or
                   (('sample_mean' in data) and ('sample_mean_2' in data) and
                    ('sample_std' in data) and ('sample_std_2' in data) and
                    ('sample_size' in data) and ('sample_size_2' in data))):
                raise serializers.ValidationError(
                    "For difference in means, provide either data IDs, numeric data arrays, or summary statistics")
        
        elif interval_type == 'DIFFERENCE_PROPORTIONS':
            if not ((('data_id' in data) and ('data_id_2' in data)) or 
                   (('successes' in data) and ('successes_2' in data) and
                    ('sample_size' in data) and ('sample_size_2' in data))):
                raise serializers.ValidationError(
                    "For difference in proportions, provide either data IDs or summary statistics")
        
        elif interval_type.startswith('BOOTSTRAP_'):
            if not ('numeric_data' in data or 'data_id' in data):
                raise serializers.ValidationError("For bootstrap methods, provide either numeric_data or data_id")
            
            if interval_type == 'BOOTSTRAP_DIFFERENCE' and not ('numeric_data_2' in data or 'data_id_2' in data):
                raise serializers.ValidationError(
                    "For bootstrap difference, provide either numeric_data_2 or data_id_2")
        
        return data


class BootstrapSimulationSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(required=True)
    true_param = serializers.FloatField(required=True)
    sample_size = serializers.IntegerField(required=True)
    n_simulations = serializers.IntegerField(default=1000)
    n_bootstrap = serializers.IntegerField(default=1000)
    distribution = serializers.CharField(default='normal')
    statistic = serializers.CharField(default='mean')
    confidence_level = serializers.FloatField(default=0.95)
    method = serializers.CharField(default='percentile')
    dist_params = serializers.DictField(required=False)
    
    def validate(self, data):
        # Validate distribution type
        valid_distributions = ['normal', 'uniform', 'exponential', 'binomial', 'poisson']
        if data['distribution'].lower() not in valid_distributions:
            raise serializers.ValidationError(f"Distribution must be one of: {', '.join(valid_distributions)}")
        
        # Validate statistic
        valid_statistics = ['mean', 'median', 'variance', 'std']
        if data['statistic'].lower() not in valid_statistics:
            raise serializers.ValidationError(f"Statistic must be one of: {', '.join(valid_statistics)}")
        
        # Validate bootstrap method
        valid_methods = ['percentile', 'basic', 'bca', 'student']
        if data['method'].lower() not in valid_methods:
            raise serializers.ValidationError(f"Method must be one of: {', '.join(valid_methods)}")
        
        return data