"""
Statistical Quality Control (SQC) analysis models.

This module defines models for SQC analysis functionality, including control charts,
process capability analysis, acceptance sampling, and measurement systems analysis.
"""

import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
# from core.models import AnalysisSession, AnalysisResult  # Models don't exist yet
from typing import Any as AnalysisSession  # Placeholder type
from typing import Any as AnalysisResult  # Placeholder type


class ControlChartAnalysis(models.Model):
    """Model for control chart analysis configuration and results."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_session = models.ForeignKey(
        AnalysisSession, 
        on_delete=models.CASCADE, 
        related_name='control_chart_analyses'
    )
    analysis_result = models.OneToOneField(
        AnalysisResult,
        on_delete=models.CASCADE,
        related_name='control_chart_detail',
        null=True,
        blank=True
    )
    chart_type = models.CharField(max_length=20, choices=[
        ('xbar_r', 'X̄-R Chart'),
        ('xbar_s', 'X̄-S Chart'),
        ('i_mr', 'I-MR Chart'),
        ('p', 'p Chart'),
        ('np', 'np Chart'),
        ('c', 'c Chart'),
        ('u', 'u Chart'),
    ])
    sample_size = models.IntegerField(default=5)
    variable_sample_size = models.BooleanField(default=False)
    
    # Control chart parameters
    parameter_column = models.CharField(max_length=255)
    grouping_column = models.CharField(max_length=255, blank=True)
    time_column = models.CharField(max_length=255, blank=True)
    
    # Control limits
    use_custom_limits = models.BooleanField(default=False)
    upper_control_limit = models.FloatField(null=True, blank=True)
    lower_control_limit = models.FloatField(null=True, blank=True)
    center_line = models.FloatField(null=True, blank=True)
    
    # Rule detection
    detect_rules = models.BooleanField(default=True)
    rule_set = models.CharField(max_length=20, choices=[
        ('western_electric', 'Western Electric Rules'),
        ('nelson', 'Nelson Rules'),
        ('custom', 'Custom Rules'),
    ], default='western_electric')
    
    # Special cause patterns
    special_causes_detected = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('control chart analysis')
        verbose_name_plural = _('control chart analyses')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.chart_type} Chart ({self.analysis_session.name})"


class ProcessCapabilityAnalysis(models.Model):
    """Model for process capability analysis configuration and results."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_session = models.ForeignKey(
        AnalysisSession, 
        on_delete=models.CASCADE, 
        related_name='process_capability_analyses'
    )
    analysis_result = models.OneToOneField(
        AnalysisResult,
        on_delete=models.CASCADE,
        related_name='process_capability_detail',
        null=True,
        blank=True
    )
    
    # Process capability parameters
    parameter_column = models.CharField(max_length=255)
    grouping_column = models.CharField(max_length=255, blank=True)
    
    # Specification limits
    lower_spec_limit = models.FloatField(null=True, blank=True)
    upper_spec_limit = models.FloatField(null=True, blank=True)
    target_value = models.FloatField(null=True, blank=True)
    
    # Distribution settings
    assume_normality = models.BooleanField(default=True)
    transformation_method = models.CharField(max_length=20, choices=[
        ('none', 'None'),
        ('box_cox', 'Box-Cox'),
        ('johnson', 'Johnson'),
        ('log', 'Logarithmic'),
    ], default='none')
    transformation_lambda = models.FloatField(null=True, blank=True)
    
    # Capability indices results
    cp = models.FloatField(null=True, blank=True)
    cpk = models.FloatField(null=True, blank=True)
    pp = models.FloatField(null=True, blank=True)
    ppk = models.FloatField(null=True, blank=True)
    
    # Process statistics
    mean = models.FloatField(null=True, blank=True)
    std_dev = models.FloatField(null=True, blank=True)
    within_std_dev = models.FloatField(null=True, blank=True)
    overall_std_dev = models.FloatField(null=True, blank=True)
    
    # Process performance
    dpm = models.FloatField(null=True, blank=True)  # Defects per million
    process_yield = models.FloatField(null=True, blank=True)  # Process yield percentage
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('process capability analysis')
        verbose_name_plural = _('process capability analyses')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Process Capability ({self.analysis_session.name})"


class AcceptanceSamplingPlan(models.Model):
    """Model for acceptance sampling plan configuration and results."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_session = models.ForeignKey(
        AnalysisSession, 
        on_delete=models.CASCADE, 
        related_name='acceptance_sampling_plans'
    )
    analysis_result = models.OneToOneField(
        AnalysisResult,
        on_delete=models.CASCADE,
        related_name='acceptance_sampling_detail',
        null=True,
        blank=True
    )
    
    # Plan configuration
    plan_type = models.CharField(max_length=20, choices=[
        ('single', 'Single Sampling'),
        ('double', 'Double Sampling'),
        ('multiple', 'Multiple Sampling'),
        ('sequential', 'Sequential Sampling'),
        ('skip_lot', 'Skip-Lot Sampling'),
        ('continuous', 'Continuous Sampling'),
    ], default='single')
    
    # Sampling parameters
    lot_size = models.IntegerField()
    sample_size = models.IntegerField()
    acceptance_number = models.IntegerField()
    rejection_number = models.IntegerField(null=True, blank=True)
    
    # Second stage parameters (for double/multiple sampling)
    second_sample_size = models.IntegerField(null=True, blank=True)
    second_acceptance_number = models.IntegerField(null=True, blank=True)
    second_rejection_number = models.IntegerField(null=True, blank=True)
    
    # Standard references
    standard_used = models.CharField(max_length=50, choices=[
        ('none', 'None (Custom Plan)'),
        ('ansi_z1.4', 'ANSI/ASQ Z1.4'),
        ('ansi_z1.9', 'ANSI/ASQ Z1.9'),
        ('iso_2859', 'ISO 2859'),
        ('iso_3951', 'ISO 3951'),
    ], default='none')
    aql = models.FloatField(null=True, blank=True)  # Acceptable Quality Level
    ltpd = models.FloatField(null=True, blank=True)  # Lot Tolerance Percent Defective
    
    # Risk parameters
    producer_risk = models.FloatField(null=True, blank=True)  # Alpha
    consumer_risk = models.FloatField(null=True, blank=True)  # Beta
    
    # OC curve data points
    oc_curve_data = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('acceptance sampling plan')
        verbose_name_plural = _('acceptance sampling plans')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.plan_type} Sampling Plan ({self.analysis_session.name})"


class MeasurementSystemAnalysis(models.Model):
    """Model for measurement system analysis configuration and results."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_session = models.ForeignKey(
        AnalysisSession, 
        on_delete=models.CASCADE, 
        related_name='measurement_system_analyses'
    )
    analysis_result = models.OneToOneField(
        AnalysisResult,
        on_delete=models.CASCADE,
        related_name='msa_detail',
        null=True,
        blank=True
    )
    
    # MSA type
    msa_type = models.CharField(max_length=30, choices=[
        ('gage_rr', 'Gage R&R'),
        ('attribute_agreement', 'Attribute Agreement'),
        ('bias', 'Bias Study'),
        ('linearity', 'Linearity Study'),
        ('stability', 'Stability Study'),
    ], default='gage_rr')
    
    # Study parameters
    parameter_column = models.CharField(max_length=255)
    part_column = models.CharField(max_length=255, blank=True)
    operator_column = models.CharField(max_length=255, blank=True)
    reference_column = models.CharField(max_length=255, blank=True)
    
    # For attribute agreement analysis
    attribute_type = models.CharField(max_length=20, choices=[
        ('binary', 'Binary (Pass/Fail)'),
        ('ordinal', 'Ordinal Categories'),
        ('nominal', 'Nominal Categories'),
    ], blank=True)
    
    # MSA results
    total_variation = models.FloatField(null=True, blank=True)
    repeatability = models.FloatField(null=True, blank=True)
    reproducibility = models.FloatField(null=True, blank=True)
    gage_rr = models.FloatField(null=True, blank=True)
    part_variation = models.FloatField(null=True, blank=True)
    
    # Study metrics
    number_of_distinct_categories = models.IntegerField(null=True, blank=True)
    percent_study_variation = models.FloatField(null=True, blank=True)
    percent_tolerance = models.FloatField(null=True, blank=True)
    
    # ANOVA results
    anova_results = models.JSONField(default=dict, blank=True)
    
    # Agreement results (for attribute studies)
    percent_agreement = models.FloatField(null=True, blank=True)
    kappa_statistic = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('measurement system analysis')
        verbose_name_plural = _('measurement system analyses')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.msa_type} Analysis ({self.analysis_session.name})"