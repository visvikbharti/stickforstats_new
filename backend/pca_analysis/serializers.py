"""
Serializers for the PCA Analysis application.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import (
    PCAProject, 
    SampleGroup, 
    Sample, 
    Gene, 
    ExpressionValue, 
    PCAResult, 
    PCAVisualization,
    GeneContribution
)

User = get_user_model()

class SampleGroupSerializer(serializers.ModelSerializer):
    """Serializer for sample groups."""

    class Meta:
        model = SampleGroup
        fields = ['id', 'name', 'color']


class SampleSerializer(serializers.ModelSerializer):
    """Serializer for samples."""
    
    group_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Sample
        fields = ['id', 'name', 'group', 'group_name', 'replicate_id']
    
    def get_group_name(self, obj):
        return obj.group.name if obj.group else None


class GeneSerializer(serializers.ModelSerializer):
    """Serializer for genes."""
    
    class Meta:
        model = Gene
        fields = ['id', 'name', 'description']


class ExpressionValueSerializer(serializers.ModelSerializer):
    """Serializer for expression values."""
    
    gene_name = serializers.SerializerMethodField()
    sample_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ExpressionValue
        fields = ['id', 'gene', 'gene_name', 'sample', 'sample_name', 'value']
    
    def get_gene_name(self, obj):
        return obj.gene.name
    
    def get_sample_name(self, obj):
        return obj.sample.name


class GeneContributionSerializer(serializers.ModelSerializer):
    """Serializer for gene contributions."""
    
    gene_name = serializers.SerializerMethodField()
    
    class Meta:
        model = GeneContribution
        fields = ['id', 'gene', 'gene_name', 'pc1_contribution', 
                  'pc2_contribution', 'total_contribution']
    
    def get_gene_name(self, obj):
        return obj.gene.name


class PCAVisualizationSerializer(serializers.ModelSerializer):
    """Serializer for PCA visualizations."""

    class Meta:
        model = PCAVisualization
        fields = ['id', 'name', 'plot_type', 'x_component', 'y_component', 'z_component',
                  'include_gene_loadings', 'top_genes_count', 'created_at']


class PCAResultSerializer(serializers.ModelSerializer):
    """Serializer for PCA results."""
    
    visualizations = PCAVisualizationSerializer(many=True, read_only=True)
    gene_contributions = GeneContributionSerializer(many=True, read_only=True)
    
    class Meta:
        model = PCAResult
        fields = ['id', 'project', 'user', 'n_components', 'scaling_method',
                  'status', 'error_message', 'created_at', 'updated_at',
                  'explained_variance', 'cumulative_variance',
                  'visualizations', 'gene_contributions']


class PCAProjectSerializer(serializers.ModelSerializer):
    """Serializer for PCA projects."""
    
    sample_count = serializers.SerializerMethodField()
    gene_count = serializers.SerializerMethodField()
    group_count = serializers.SerializerMethodField()
    results_count = serializers.SerializerMethodField()
    latest_result = serializers.SerializerMethodField()
    
    class Meta:
        model = PCAProject
        fields = ['id', 'name', 'description', 'user', 'created_at', 'updated_at',
                  'scaling_method', 'sample_count', 'gene_count', 'group_count', 
                  'results_count', 'latest_result']
    
    def get_sample_count(self, obj):
        return Sample.objects.filter(project=obj).count()
    
    def get_gene_count(self, obj):
        return Gene.objects.filter(project=obj).count()
    
    def get_group_count(self, obj):
        return SampleGroup.objects.filter(project=obj).count()
    
    def get_results_count(self, obj):
        return PCAResult.objects.filter(project=obj).count()
    
    def get_latest_result(self, obj):
        latest = PCAResult.objects.filter(project=obj).order_by('-created_at').first()
        if latest:
            return {
                'id': str(latest.id),
                'status': latest.status,
                'created_at': latest.created_at,
                'n_components': latest.n_components
            }
        return None


class PCAProjectDetailSerializer(PCAProjectSerializer):
    """Detailed serializer for PCA projects."""
    
    sample_groups = SampleGroupSerializer(many=True, read_only=True, source='samplegroup_set')
    results = serializers.SerializerMethodField()
    
    class Meta(PCAProjectSerializer.Meta):
        fields = PCAProjectSerializer.Meta.fields + ['sample_groups', 'results']
    
    def get_results(self, obj):
        results = PCAResult.objects.filter(project=obj).order_by('-created_at')[:5]
        return PCAResultSerializer(results, many=True).data


class PCAVisualizationDataSerializer(serializers.ModelSerializer):
    """Serializer for PCA visualization data."""

    class Meta:
        model = PCAVisualization
        fields = ['id', 'name', 'plot_type', 'x_component', 'y_component', 'z_component',
                  'include_gene_loadings', 'top_genes_count']


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file uploads."""
    
    file = serializers.FileField()
    project_name = serializers.CharField(max_length=255)
    project_description = serializers.CharField(required=False, allow_blank=True)
    scaling_method = serializers.ChoiceField(
        choices=[
            ('STANDARD', 'Standard (Z-score)'),
            ('MINMAX', 'Min-Max (0-1)'),
            ('NONE', 'None')
        ],
        default='STANDARD'
    )


class CreateDemoDataSerializer(serializers.Serializer):
    """Serializer for creating demo data."""
    
    project_name = serializers.CharField(max_length=255)
    project_description = serializers.CharField(required=False, allow_blank=True)
    scaling_method = serializers.ChoiceField(
        choices=[
            ('STANDARD', 'Standard (Z-score)'),
            ('MINMAX', 'Min-Max (0-1)'),
            ('NONE', 'None')
        ],
        default='STANDARD'
    )


class RunPCASerializer(serializers.Serializer):
    """Serializer for running PCA analysis."""
    
    n_components = serializers.IntegerField(min_value=2, max_value=20, default=5)