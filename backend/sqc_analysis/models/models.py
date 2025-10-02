"""
Models for the SQC (Statistical Quality Control) Analysis module.
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import JSONField


class ControlChartAnalysis(models.Model):
    """
    Model for storing control chart analysis data and results.
    """
    CHART_TYPES = [
        ('xbar_r', 'X-bar and R Chart'),
        ('xbar_s', 'X-bar and S Chart'),
        ('i_mr', 'Individual and Moving Range Chart'),
        ('p', 'p Chart'),
        ('np', 'np Chart'),
        ('c', 'c Chart'),
        ('u', 'u Chart'),
        ('ewma', 'EWMA Chart'),
        ('cusum', 'CUSUM Chart'),
        ('custom', 'Custom Chart'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='control_chart_analyses')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Chart configuration
    chart_type = models.CharField(max_length=20, choices=CHART_TYPES)
    subgroup_size = models.IntegerField(default=5)
    number_of_subgroups = models.IntegerField(null=True, blank=True)
    
    # Data and results
    raw_data = JSONField(default=dict)
    calculated_statistics = JSONField(default=dict)
    control_limits = JSONField(default=dict)
    out_of_control_points = JSONField(default=list)
    special_causes = JSONField(default=list)

    # Additional parameters
    parameters = JSONField(default=dict)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Control Chart Analysis'
        verbose_name_plural = 'Control Chart Analyses'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.chart_type} Analysis: {self.name}"


class ProcessCapabilityAnalysis(models.Model):
    """
    Model for storing process capability analysis data and results.
    """
    DISTRIBUTION_TYPES = [
        ('normal', 'Normal Distribution'),
        ('weibull', 'Weibull Distribution'),
        ('lognormal', 'Log-normal Distribution'),
        ('custom', 'Custom Distribution'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='process_capability_analyses')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Process specifications
    lower_specification_limit = models.FloatField(null=True, blank=True)
    upper_specification_limit = models.FloatField(null=True, blank=True)
    target_value = models.FloatField(null=True, blank=True)
    distribution_type = models.CharField(max_length=20, choices=DISTRIBUTION_TYPES, default='normal')
    
    # Data and results
    raw_data = JSONField(default=dict)
    calculated_statistics = JSONField(default=dict)
    capability_indices = JSONField(default=dict)
    normality_test_results = JSONField(default=dict)

    # Additional parameters
    parameters = JSONField(default=dict)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Process Capability Analysis'
        verbose_name_plural = 'Process Capability Analyses'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Process Capability Analysis: {self.name}"


class AcceptanceSamplingPlan(models.Model):
    """
    Model for storing acceptance sampling plan data and results.
    """
    PLAN_TYPES = [
        ('single', 'Single Sampling Plan'),
        ('double', 'Double Sampling Plan'),
        ('multiple', 'Multiple Sampling Plan'),
        ('sequential', 'Sequential Sampling Plan'),
        ('continuous', 'Continuous Sampling Plan'),
        ('skip_lot', 'Skip-Lot Sampling Plan'),
    ]
    
    STANDARD_TYPES = [
        ('ansi_asq_z1.4', 'ANSI/ASQ Z1.4'),
        ('ansi_asq_z1.9', 'ANSI/ASQ Z1.9'),
        ('mil_std_105e', 'MIL-STD-105E'),
        ('mil_std_414', 'MIL-STD-414'),
        ('iso_2859', 'ISO 2859'),
        ('iso_3951', 'ISO 3951'),
        ('custom', 'Custom'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='acceptance_sampling_plans')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Plan configuration
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPES)
    standard = models.CharField(max_length=20, choices=STANDARD_TYPES, default='custom')
    lot_size = models.IntegerField(null=True, blank=True)
    sample_size = models.IntegerField()
    acceptance_number = models.IntegerField()
    rejection_number = models.IntegerField(null=True, blank=True)
    
    # For double/multiple sampling plans
    additional_sample_sizes = JSONField(default=list)
    additional_acceptance_numbers = JSONField(default=list)
    additional_rejection_numbers = JSONField(default=list)

    # Data and results
    calculated_statistics = JSONField(default=dict)
    oc_curve_data = JSONField(default=dict)
    aoc_curve_data = JSONField(default=dict)

    # Additional parameters
    parameters = JSONField(default=dict)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Acceptance Sampling Plan'
        verbose_name_plural = 'Acceptance Sampling Plans'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.plan_type} Sampling Plan: {self.name}"


class MeasurementSystemAnalysis(models.Model):
    """
    Model for storing measurement system analysis data and results.
    """
    MSA_TYPES = [
        ('gage_rr', 'Gage R&R'),
        ('attribute_agreement', 'Attribute Agreement Analysis'),
        ('bias', 'Bias Study'),
        ('linearity', 'Linearity Study'),
        ('stability', 'Stability Study'),
    ]
    
    METHOD_TYPES = [
        ('anova', 'ANOVA Method'),
        ('average_range', 'Average and Range Method'),
        ('range', 'Range Method'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='measurement_system_analyses')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # MSA configuration
    msa_type = models.CharField(max_length=20, choices=MSA_TYPES)
    method = models.CharField(max_length=20, choices=METHOD_TYPES, null=True, blank=True)
    number_of_parts = models.IntegerField(null=True, blank=True)
    number_of_operators = models.IntegerField(null=True, blank=True)
    number_of_replicates = models.IntegerField(null=True, blank=True)
    
    # Data and results
    raw_data = JSONField(default=dict)
    calculated_statistics = JSONField(default=dict)
    variance_components = JSONField(default=dict)
    gauge_metrics = JSONField(default=dict)

    # Additional parameters
    parameters = JSONField(default=dict)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Measurement System Analysis'
        verbose_name_plural = 'Measurement System Analyses'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.msa_type} Analysis: {self.name}"


class SPCImplementationPlan(models.Model):
    """
    Model for storing SPC implementation plan data.
    """
    IMPLEMENTATION_PHASES = [
        ('preparation', 'Preparation Phase'),
        ('pilot', 'Pilot Implementation'),
        ('full', 'Full Implementation'),
        ('evaluation', 'Evaluation and Refinement'),
        ('expansion', 'Expansion Phase'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='spc_implementation_plans')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Plan details
    current_phase = models.CharField(max_length=20, choices=IMPLEMENTATION_PHASES)
    organization_name = models.CharField(max_length=255, blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    process_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Implementation details
    phases = JSONField(default=dict)
    timelines = JSONField(default=dict)
    responsible_persons = JSONField(default=dict)
    resources = JSONField(default=dict)
    critical_success_factors = JSONField(default=list)

    # Additional parameters
    control_charts_planned = JSONField(default=list)
    parameters = JSONField(default=dict)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'SPC Implementation Plan'
        verbose_name_plural = 'SPC Implementation Plans'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"SPC Implementation Plan: {self.name}"


class EconomicDesign(models.Model):
    """
    Model for storing economic design of control charts data and results.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='economic_designs')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Cost parameters
    sampling_cost = models.FloatField()
    testing_cost = models.FloatField()
    false_alarm_cost = models.FloatField()
    out_of_control_cost = models.FloatField(help_text="Cost per hour of operating in out-of-control state")
    adjustment_cost = models.FloatField()
    
    # Process parameters
    shift_magnitude = models.FloatField(help_text="Magnitude of process shift in standard deviations")
    shift_frequency = models.FloatField(help_text="Expected frequency of process shifts")
    time_to_detect = models.FloatField(help_text="Expected time to detect a process shift")
    time_to_adjust = models.FloatField(help_text="Expected time to adjust the process")
    
    # Results
    optimal_sample_size = models.IntegerField(null=True, blank=True)
    optimal_sampling_interval = models.FloatField(null=True, blank=True)
    optimal_control_limits = models.FloatField(null=True, blank=True)
    expected_hourly_cost = models.FloatField(null=True, blank=True)
    cost_comparison = JSONField(default=dict)

    # Additional parameters
    parameters = JSONField(default=dict)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Economic Design'
        verbose_name_plural = 'Economic Designs'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Economic Design: {self.name}"