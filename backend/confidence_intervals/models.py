import uuid
from django.db import models
from django.conf import settings


class ConfidenceIntervalProject(models.Model):
    """
    Model for storing confidence interval project metadata.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='confidence_interval_projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class IntervalData(models.Model):
    """
    Model for storing sample data for confidence interval calculations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(ConfidenceIntervalProject, on_delete=models.CASCADE, related_name='data_sets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    data_type = models.CharField(max_length=50, choices=[
        ('NORMAL', 'Normal'), 
        ('BINOMIAL', 'Binomial'),
        ('POISSON', 'Poisson'),
        ('CUSTOM', 'Custom')
    ])
    data = models.JSONField()  # Store the actual data points
    parameters = models.JSONField(blank=True, null=True)  # Store optional known parameters
    metadata = models.JSONField(blank=True, null=True)  # Store additional metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.data_type})"


class IntervalResult(models.Model):
    """
    Model for storing confidence interval calculation results.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(ConfidenceIntervalProject, on_delete=models.CASCADE, related_name='interval_results')
    data_source = models.ForeignKey(IntervalData, on_delete=models.CASCADE, related_name='interval_results', 
                                   null=True, blank=True)  # Optional if derived from theoretical parameters
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    interval_type = models.CharField(max_length=50, choices=[
        ('MEAN_Z', 'Mean (Z-interval, known variance)'),
        ('MEAN_T', 'Mean (T-interval, unknown variance)'),
        ('PROPORTION_WALD', 'Proportion (Wald)'),
        ('PROPORTION_WILSON', 'Proportion (Wilson)'),
        ('PROPORTION_CLOPPER_PEARSON', 'Proportion (Clopper-Pearson)'),
        ('VARIANCE', 'Variance'),
        ('STD_DEV', 'Standard Deviation'),
        ('DIFFERENCE_MEANS', 'Difference of Means'),
        ('DIFFERENCE_PROPORTIONS', 'Difference of Proportions'),
        ('BOOTSTRAP', 'Bootstrap'),
        ('BAYESIAN', 'Bayesian Credible Interval'),
        ('CUSTOM', 'Custom')
    ])
    confidence_level = models.FloatField()  # Store as a decimal (e.g., 0.95 for 95%)
    parameters = models.JSONField()  # Store interval-specific parameters
    results = models.JSONField()  # Store the calculation results (e.g., lower/upper bounds, point estimate)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.interval_type}, {self.confidence_level*100:.1f}%)"


class SimulationResult(models.Model):
    """
    Model for storing confidence interval simulation results (e.g., coverage probability, sample size effects).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(ConfidenceIntervalProject, on_delete=models.CASCADE, related_name='simulation_results')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    simulation_type = models.CharField(max_length=50, choices=[
        ('COVERAGE', 'Coverage Probability'),
        ('SAMPLE_SIZE', 'Sample Size Effects'),
        ('BOOTSTRAP_PERFORMANCE', 'Bootstrap Performance'),
        ('NON_NORMALITY', 'Effects of Non-normality'),
        ('BAYESIAN_COMPARISON', 'Frequentist vs Bayesian Comparison'),
        ('CUSTOM', 'Custom')
    ])
    parameters = models.JSONField()  # Store simulation parameters
    results = models.JSONField()  # Store simulation results (could be large)
    visualization_settings = models.JSONField(blank=True, null=True)  # Store visualization preferences
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)  # When the simulation finished
    is_complete = models.BooleanField(default=False)  # Flag for long-running simulations
    
    def __str__(self):
        return f"{self.name} ({self.simulation_type})"


class EducationalResource(models.Model):
    """
    Model for storing educational resources related to confidence intervals.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=50, choices=[
        ('DEFINITION', 'Definition'),
        ('PROOF', 'Mathematical Proof'),
        ('EXAMPLE', 'Example'),
        ('EXPLANATION', 'Explanation'),
        ('INTERACTIVE', 'Interactive Element'),
        ('REFERENCE', 'Reference')
    ])
    category = models.CharField(max_length=50, choices=[
        ('FOUNDATIONS', 'Theoretical Foundations'),
        ('METHODS', 'Statistical Methods'),
        ('APPLICATIONS', 'Applications'),
        ('INTERPRETATION', 'Interpretation'),
        ('OTHER', 'Other')
    ])
    content = models.TextField()  # Can include HTML and LaTeX
    additional_data = models.JSONField(blank=True, null=True)  # For interactive elements
    order = models.IntegerField(default=0)  # For ordering content within a category
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} ({self.content_type})"
    
    class Meta:
        ordering = ['category', 'order', 'title']