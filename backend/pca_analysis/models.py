import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class PCAProject(models.Model):
    """
    Model for storing PCA project metadata.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pca_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Project settings
    scaling_method = models.CharField(
        max_length=50,
        choices=[
            ('STANDARD', 'Standard (Z-score)'),
            ('MINMAX', 'Min-Max (0-1)'),
            ('NONE', 'None')
        ],
        default='STANDARD'
    )
    
    class Meta:
        ordering = ['-updated_at']
        verbose_name = _("PCA Project")
        verbose_name_plural = _("PCA Projects")
    
    def __str__(self):
        return f"{self.name} ({self.created_at.strftime('%Y-%m-%d')})"


class SampleGroup(models.Model):
    """
    Model for storing sample group information.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(PCAProject, on_delete=models.CASCADE, related_name='sample_groups')
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = _("Sample Group")
        verbose_name_plural = _("Sample Groups")
    
    def __str__(self):
        return f"{self.name} (Project: {self.project.name})"


class Sample(models.Model):
    """
    Model for storing sample information.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(PCAProject, on_delete=models.CASCADE, related_name='samples')
    group = models.ForeignKey(SampleGroup, on_delete=models.CASCADE, related_name='samples', null=True, blank=True)
    name = models.CharField(max_length=255)
    replicate_id = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = _("Sample")
        verbose_name_plural = _("Samples")
    
    def __str__(self):
        return f"{self.name} (Group: {self.group.name if self.group else 'None'})"


class Gene(models.Model):
    """
    Model for storing gene information.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(PCAProject, on_delete=models.CASCADE, related_name='genes')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = _("Gene")
        verbose_name_plural = _("Genes")

    def __str__(self):
        return f"{self.name} (Project: {self.project.name})"


class ExpressionValue(models.Model):
    """
    Model for storing gene expression values.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(PCAProject, on_delete=models.CASCADE, related_name='expression_values')
    sample = models.ForeignKey(Sample, on_delete=models.CASCADE, related_name='expression_values')
    gene = models.ForeignKey(Gene, on_delete=models.CASCADE, related_name='expression_values')
    value = models.FloatField()
    
    class Meta:
        unique_together = ('sample', 'gene')
        verbose_name = _("Expression Value")
        verbose_name_plural = _("Expression Values")


class PCAResult(models.Model):
    """
    Model for storing PCA analysis results.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, default="PCA Analysis")
    project = models.ForeignKey(PCAProject, on_delete=models.CASCADE, related_name='pca_results')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pca_results')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Analysis parameters
    n_components = models.PositiveIntegerField(default=5)
    scaling_method = models.CharField(
        max_length=50,
        choices=[
            ('STANDARD', 'Standard (Z-score)'),
            ('MINMAX', 'Min-Max (0-1)'),
            ('NONE', 'None')
        ],
        default='STANDARD'
    )
    
    # Results
    explained_variance = models.JSONField(null=True, blank=True)
    cumulative_variance = models.JSONField(null=True, blank=True)
    loadings = models.JSONField(null=True, blank=True)
    scores = models.JSONField(null=True, blank=True)
    group_centroids = models.JSONField(null=True, blank=True)
    group_distances = models.JSONField(null=True, blank=True)
    group_variations = models.JSONField(null=True, blank=True)

    # Analysis status
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed')
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _("PCA Result")
        verbose_name_plural = _("PCA Results")
    
    def __str__(self):
        return f"PCA Result for {self.project.name} ({self.created_at.strftime('%Y-%m-%d')})"


class PCAVisualization(models.Model):
    """
    Model for storing PCA visualization settings and cached results.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pca_result = models.ForeignKey(PCAResult, on_delete=models.CASCADE, related_name='visualizations')
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Visualization settings
    plot_type = models.CharField(
        max_length=20,
        choices=[
            ('2D', '2D Scatter Plot'),
            ('3D', '3D Scatter Plot'),
            ('BIPLOT', 'Biplot'),
            ('LOADINGS', 'Loadings Plot')
        ],
        default='2D'
    )
    x_component = models.PositiveIntegerField(default=1)  # 1-based index for PC1
    y_component = models.PositiveIntegerField(default=2)  # 1-based index for PC2
    z_component = models.PositiveIntegerField(default=3, null=True, blank=True)  # Only for 3D plots
    
    # Appearance settings
    color_palette = models.CharField(max_length=50, default='Set1')
    marker_size = models.PositiveIntegerField(default=120)
    show_confidence_ellipses = models.BooleanField(default=True)
    ellipse_transparency = models.FloatField(default=0.15)
    
    # Gene loadings settings
    include_gene_loadings = models.BooleanField(default=True)
    top_genes_count = models.PositiveIntegerField(default=10)
    arrow_thickness = models.PositiveIntegerField(default=3)
    highlight_style = models.CharField(
        max_length=20,
        choices=[
            ('DEFAULT', 'Default'),
            ('BOLD', 'Bold'),
            ('COLORFUL', 'Colorful')
        ],
        default='DEFAULT'
    )
    
    # Cached visualization data (base64 encoded images)
    pca_plot_image = models.TextField(blank=True)
    loadings_plot_image = models.TextField(blank=True)
    variance_plot_image = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _("PCA Visualization")
        verbose_name_plural = _("PCA Visualizations")
    
    def __str__(self):
        return f"{self.name} (Result: {self.pca_result.id})"


class GeneContribution(models.Model):
    """
    Model for storing gene contribution data.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pca_result = models.ForeignKey(PCAResult, on_delete=models.CASCADE, related_name='gene_contributions')
    gene = models.ForeignKey(Gene, on_delete=models.CASCADE, related_name='contributions')
    pc1_contribution = models.FloatField()
    pc2_contribution = models.FloatField()
    total_contribution = models.FloatField()
    
    class Meta:
        ordering = ['-total_contribution']
        verbose_name = _("Gene Contribution")
        verbose_name_plural = _("Gene Contributions")
    
    def __str__(self):
        return f"{self.gene.name} contribution to {self.pca_result.project.name}"