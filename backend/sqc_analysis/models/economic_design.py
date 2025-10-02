"""
Economic Design models for SQC Analysis.
"""

import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings


class EconomicDesignAnalysis(models.Model):
    """
    Model for storing economic design of control charts data and results.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='economic_design_analyses')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Chart configuration
    chart_type = models.CharField(max_length=20)
    sample_size = models.IntegerField()
    sampling_interval = models.FloatField()
    k_factor = models.FloatField()
    
    # Control limits
    upper_control_limit = models.FloatField(null=True, blank=True)
    lower_control_limit = models.FloatField(null=True, blank=True)
    center_line = models.FloatField(null=True, blank=True)
    
    # Performance metrics
    in_control_arl = models.FloatField(null=True, blank=True)
    out_of_control_arl = models.FloatField(null=True, blank=True)
    
    # Cost metrics
    hourly_cost = models.FloatField(null=True, blank=True)
    cost_savings = models.FloatField(null=True, blank=True)
    
    # JSON fields for detailed data
    process_parameters = models.JSONField(default=dict)
    cost_parameters = models.JSONField(default=dict)
    optimization_results = models.JSONField(default=dict)
    
    class Meta:
        verbose_name = 'Economic Design Analysis'
        verbose_name_plural = 'Economic Design Analyses'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Economic Design: {self.name}"