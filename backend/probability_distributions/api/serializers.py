from rest_framework import serializers
from ..models import (
    DistributionProject, Distribution, DistributionVisualization,
    DataSet, DistributionFitting, DistributionComparison,
    BinomialApproximation, ApplicationSimulation
)


class DistributionVisualizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistributionVisualization
        fields = '__all__'


class DistributionSerializer(serializers.ModelSerializer):
    visualizations = DistributionVisualizationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Distribution
        fields = '__all__'


class DataSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSet
        fields = '__all__'


class DistributionFittingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistributionFitting
        fields = '__all__'


class DistributionComparisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistributionComparison
        fields = '__all__'


class BinomialApproximationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinomialApproximation
        fields = '__all__'


class ApplicationSimulationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationSimulation
        fields = '__all__'


class DistributionProjectSerializer(serializers.ModelSerializer):
    distributions = DistributionSerializer(many=True, read_only=True)
    datasets = DataSetSerializer(many=True, read_only=True)
    
    class Meta:
        model = DistributionProject
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class ProbabilityCalculationSerializer(serializers.Serializer):
    distribution_type = serializers.CharField()
    parameters = serializers.JSONField()
    x_values = serializers.ListField(child=serializers.FloatField(), required=False)
    lower_bound = serializers.FloatField(required=False)
    upper_bound = serializers.FloatField(required=False)
    probability_type = serializers.CharField(required=False, default='less_than')  # 'less_than', 'greater_than', 'between', 'exactly'


class RandomSampleSerializer(serializers.Serializer):
    distribution_type = serializers.CharField()
    parameters = serializers.JSONField()
    sample_size = serializers.IntegerField(min_value=1, max_value=10000)
    seed = serializers.IntegerField(required=False)


class BinomialApproximationRequestSerializer(serializers.Serializer):
    n = serializers.IntegerField(min_value=1)
    p = serializers.FloatField(min_value=0.0, max_value=1.0)
    approximation_types = serializers.ListField(
        child=serializers.CharField(),
        default=['POISSON', 'NORMAL']
    )


class DataFittingRequestSerializer(serializers.Serializer):
    data = serializers.ListField(child=serializers.FloatField())
    distribution_types = serializers.ListField(
        child=serializers.CharField(),
        default=['NORMAL', 'POISSON', 'BINOMIAL', 'EXPONENTIAL', 'GAMMA', 'LOGNORMAL']
    )


class ProcessCapabilityRequestSerializer(serializers.Serializer):
    data = serializers.ListField(child=serializers.FloatField())
    lsl = serializers.FloatField()  # Lower specification limit
    usl = serializers.FloatField()  # Upper specification limit
    target = serializers.FloatField(required=False)  # Target value


class ClinicalTrialSimulationSerializer(serializers.Serializer):
    treatment_effect = serializers.FloatField()
    control_mean = serializers.FloatField()
    control_sd = serializers.FloatField(min_value=0.0)
    treatment_sd = serializers.FloatField(min_value=0.0)
    n_control = serializers.IntegerField(min_value=1)
    n_treatment = serializers.IntegerField(min_value=1)
    n_simulations = serializers.IntegerField(min_value=1, max_value=10000, default=1000)
    seed = serializers.IntegerField(required=False)