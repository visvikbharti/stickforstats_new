"""
Models for the Probability Distributions module.
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class DistributionProject(models.Model):
    """Project model for probability distribution analysis."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='distribution_projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.id})"


class Distribution(models.Model):
    """Model for a probability distribution."""
    
    DISTRIBUTION_TYPES = [
        ('BINOMIAL', 'Binomial'),
        ('POISSON', 'Poisson'),
        ('NORMAL', 'Normal'),
        ('EXPONENTIAL', 'Exponential'),
        ('UNIFORM', 'Uniform'),
        ('GAMMA', 'Gamma'),
        ('BETA', 'Beta'),
        ('CHI_SQUARED', 'Chi-squared'),
        ('T', 'Student\'s t'),
        ('F', 'F-distribution'),
        ('LOG_NORMAL', 'Log-normal'),
        ('WEIBULL', 'Weibull'),
        ('CUSTOM', 'Custom'),
    ]
    
    CATEGORY_CHOICES = [
        ('DISCRETE', 'Discrete'),
        ('CONTINUOUS', 'Continuous'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(DistributionProject, on_delete=models.CASCADE, related_name='distributions')
    name = models.CharField(max_length=255)
    distribution_type = models.CharField(max_length=20, choices=DISTRIBUTION_TYPES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    parameters = models.JSONField()  # Store distribution-specific parameters
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.distribution_type})"


class DistributionVisualization(models.Model):
    """Model for visualization settings for a distribution."""
    
    VISUALIZATION_TYPES = [
        ('PDF', 'Probability Density Function'),
        ('PMF', 'Probability Mass Function'),
        ('CDF', 'Cumulative Distribution Function'),
        ('QUANTILE', 'Quantile Function'),
        ('HISTOGRAM', 'Histogram'),
        ('BOX_PLOT', 'Box Plot'),
        ('PP_PLOT', 'P-P Plot'),
        ('QQ_PLOT', 'Q-Q Plot'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    distribution = models.ForeignKey(Distribution, on_delete=models.CASCADE, related_name='visualizations')
    visualization_type = models.CharField(max_length=20, choices=VISUALIZATION_TYPES)
    settings = models.JSONField()  # Store visualization-specific settings
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.visualization_type} for {self.distribution.name}"


class DataSet(models.Model):
    """Model for a dataset to fit a distribution to."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(DistributionProject, on_delete=models.CASCADE, related_name='datasets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    data = models.JSONField()  # Store the actual data points
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.id})"


class DistributionFitting(models.Model):
    """Model for the results of fitting a distribution to data."""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(DataSet, on_delete=models.CASCADE, related_name='fittings')
    distribution = models.ForeignKey(Distribution, on_delete=models.CASCADE, related_name='fittings')
    parameters = models.JSONField()  # Store fitted parameters
    goodness_of_fit = models.JSONField()  # Store goodness-of-fit statistics
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Fitting {self.distribution.name} to {self.dataset.name}"


class DistributionComparison(models.Model):
    """Model for comparing multiple distributions."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(DistributionProject, on_delete=models.CASCADE, related_name='comparisons')
    name = models.CharField(max_length=255)
    distributions = models.ManyToManyField(Distribution, related_name='comparisons')
    comparison_type = models.CharField(max_length=50)  # Type of comparison
    settings = models.JSONField()  # Settings for the comparison
    results = models.JSONField(null=True, blank=True)  # Results of the comparison
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.id})"


class BinomialApproximation(models.Model):
    """Model for binomial approximation analysis."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(DistributionProject, on_delete=models.CASCADE, related_name='approximations')
    name = models.CharField(max_length=255)
    n = models.IntegerField()  # Number of trials
    p = models.FloatField()  # Probability of success
    approximation_types = models.JSONField()  # Types of approximations to use
    results = models.JSONField(null=True, blank=True)  # Results of the approximation
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (n={self.n}, p={self.p})"


class ApplicationSimulation(models.Model):
    """Model for real-world application simulations."""
    
    APPLICATION_TYPES = [
        ('EMAIL_ARRIVALS', 'Email Arrivals (Poisson)'),
        ('QUALITY_CONTROL', 'Quality Control (Normal)'),
        ('CLINICAL_TRIALS', 'Clinical Trials (Binomial and Normal)'),
        ('NETWORK_TRAFFIC', 'Network Traffic (Poisson)'),
        ('MANUFACTURING_DEFECTS', 'Manufacturing Defects (Binomial and Poisson)'),
        ('CUSTOM', 'Custom Simulation'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(DistributionProject, on_delete=models.CASCADE, related_name='simulations')
    name = models.CharField(max_length=255)
    application_type = models.CharField(max_length=30, choices=APPLICATION_TYPES)
    parameters = models.JSONField()  # Application-specific parameters
    results = models.JSONField(null=True, blank=True)  # Simulation results
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.application_type})"