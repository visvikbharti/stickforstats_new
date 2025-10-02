"""
Design of Experiments (DOE) analysis models.

This module defines models for DOE analysis functionality, including factorial designs,
response surface methodology, screening designs, and analysis results.
"""

import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
import json

# from core.models import AnalysisSession, AnalysisResult  # Models don't exist yet
from typing import Any as AnalysisSession  # Placeholder type
from typing import Any as AnalysisResult  # Placeholder type
from .constants import (
    FACTORIAL_DESIGN, FRACTIONAL_FACTORIAL_DESIGN, RESPONSE_SURFACE_DESIGN,
    CENTRAL_COMPOSITE_DESIGN, BOX_BEHNKEN_DESIGN, PLACKETT_BURMAN_DESIGN,
    MIXTURE_DESIGN, DEFINITIVE_SCREENING_DESIGN, LATIN_SQUARE_DESIGN,
    SPLIT_PLOT_DESIGN, D_OPTIMAL_DESIGN, CUSTOM_DESIGN,
    CONTINUOUS_FACTOR, CATEGORICAL_FACTOR,
    LINEAR_MODEL, QUADRATIC_MODEL, INTERACTION_MODEL, CUSTOM_MODEL,
    MANUAL_SELECTION, STEPWISE_SELECTION, BACKWARD_SELECTION, FORWARD_SELECTION, ALL_TERMS,
    DESIRABILITY_METHOD, GRID_SEARCH_METHOD, GENETIC_ALGORITHM_METHOD, SIMULATED_ANNEALING_METHOD,
    MAXIMIZE_GOAL, MINIMIZE_GOAL, TARGET_GOAL, RANGE_GOAL, NONE_GOAL,
    STATUS_PENDING, STATUS_PROCESSING, STATUS_COMPLETED, STATUS_FAILED, STATUS_CANCELLED
)


class ExperimentDesign(models.Model):
    """Model for experiment design configurations and metadata."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_session = models.ForeignKey(
        AnalysisSession, 
        on_delete=models.CASCADE, 
        related_name='experiment_designs'
    )
    analysis_result = models.OneToOneField(
        AnalysisResult,
        on_delete=models.CASCADE,
        related_name='experiment_design_detail',
        null=True,
        blank=True
    )
    
    # Design metadata
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Design type
    DESIGN_TYPES = [
        (FACTORIAL_DESIGN, 'Factorial Design'),
        (FRACTIONAL_FACTORIAL_DESIGN, 'Fractional Factorial Design'),
        (RESPONSE_SURFACE_DESIGN, 'Response Surface Methodology'),
        (CENTRAL_COMPOSITE_DESIGN, 'Central Composite Design'),
        (BOX_BEHNKEN_DESIGN, 'Box-Behnken Design'),
        (PLACKETT_BURMAN_DESIGN, 'Plackett-Burman Design'),
        (DEFINITIVE_SCREENING_DESIGN, 'Definitive Screening Design'),
        (MIXTURE_DESIGN, 'Mixture Design'),
        (LATIN_SQUARE_DESIGN, 'Latin Square Design'),
        (SPLIT_PLOT_DESIGN, 'Split-Plot Design'),
        (D_OPTIMAL_DESIGN, 'D-Optimal Design'),
        (CUSTOM_DESIGN, 'Custom Design')
    ]
    design_type = models.CharField(max_length=30, choices=DESIGN_TYPES)
    
    # Design parameters
    num_factors = models.IntegerField()
    num_runs = models.IntegerField()
    num_center_points = models.IntegerField(default=0)
    num_replicates = models.IntegerField(default=1)
    resolution = models.CharField(max_length=10, blank=True)
    
    # Randomization and blocking
    is_randomized = models.BooleanField(default=True)
    block_column = models.CharField(max_length=255, blank=True)
    num_blocks = models.IntegerField(default=1)
    
    # Design matrix and factor details stored as JSON
    design_matrix = models.JSONField(default=dict)
    factor_details = models.JSONField(default=dict)
    response_details = models.JSONField(default=dict)
    
    # Creation timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('experiment design')
        verbose_name_plural = _('experiment designs')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.design_type})"


class FactorDefinition(models.Model):
    """Model for experiment factor definitions."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experiment_design = models.ForeignKey(
        ExperimentDesign, 
        on_delete=models.CASCADE, 
        related_name='factors'
    )
    
    # Factor metadata
    name = models.CharField(max_length=255)
    symbol = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    
    # Factor type
    FACTOR_TYPES = [
        (CONTINUOUS_FACTOR, 'Continuous'),
        (CATEGORICAL_FACTOR, 'Categorical'),
        ('MIXTURE_COMPONENT', 'Mixture Component')
    ]
    factor_type = models.CharField(max_length=20, choices=FACTOR_TYPES)
    
    # Factor levels
    low_level = models.FloatField(null=True, blank=True)
    high_level = models.FloatField(null=True, blank=True)
    center_point = models.FloatField(null=True, blank=True)
    
    # For categorical factors
    level_values = models.JSONField(default=list, blank=True)
    
    # Units and constraints
    units = models.CharField(max_length=50, blank=True)
    min_constraint = models.FloatField(null=True, blank=True)
    max_constraint = models.FloatField(null=True, blank=True)
    
    # Creation timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('factor definition')
        verbose_name_plural = _('factor definitions')
        unique_together = ['experiment_design', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.experiment_design.name})"


class ResponseDefinition(models.Model):
    """Model for experiment response definitions."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experiment_design = models.ForeignKey(
        ExperimentDesign, 
        on_delete=models.CASCADE, 
        related_name='responses'
    )
    
    # Response metadata
    name = models.CharField(max_length=255)
    symbol = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    
    # Response details
    units = models.CharField(max_length=50, blank=True)
    objective = models.CharField(
        max_length=20, 
        choices=[
            ('maximize', 'Maximize'),
            ('minimize', 'Minimize'),
            ('target', 'Target Value'),
            ('range', 'In Range'),
            ('none', 'None')
        ],
        default='none'
    )
    target_value = models.FloatField(null=True, blank=True)
    lower_bound = models.FloatField(null=True, blank=True)
    upper_bound = models.FloatField(null=True, blank=True)
    importance = models.IntegerField(default=3)  # 1-5 scale
    
    # Creation timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('response definition')
        verbose_name_plural = _('response definitions')
        unique_together = ['experiment_design', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.experiment_design.name})"


class ModelAnalysis(models.Model):
    """Model for DOE model analysis results."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experiment_design = models.ForeignKey(
        ExperimentDesign, 
        on_delete=models.CASCADE, 
        related_name='model_analyses'
    )
    analysis_result = models.OneToOneField(
        AnalysisResult,
        on_delete=models.CASCADE,
        related_name='model_analysis_detail',
        null=True,
        blank=True
    )
    
    # Model metadata
    response_name = models.CharField(max_length=255)
    model_type = models.CharField(
        max_length=30,
        choices=[
            ('linear', 'Linear'),
            ('interaction', 'Interaction'),
            ('quadratic', 'Quadratic'),
            ('cubic', 'Cubic'),
            ('reduced', 'Reduced'),
            ('customized', 'Customized')
        ]
    )
    
    # Model statistics
    r_squared = models.FloatField(null=True, blank=True)
    adjusted_r_squared = models.FloatField(null=True, blank=True)
    predicted_r_squared = models.FloatField(null=True, blank=True)
    f_value = models.FloatField(null=True, blank=True)
    p_value = models.FloatField(null=True, blank=True)
    rmse = models.FloatField(null=True, blank=True)  # Root Mean Square Error
    aic = models.FloatField(null=True, blank=True)  # Akaike Information Criterion
    bic = models.FloatField(null=True, blank=True)  # Bayesian Information Criterion
    
    # Model terms and coefficients
    terms = models.JSONField(default=list)
    coefficients = models.JSONField(default=dict)
    
    # ANOVA results
    anova_results = models.JSONField(default=dict)
    
    # Residual analysis
    residual_analysis = models.JSONField(default=dict)
    
    # Optimization results
    optimization_results = models.JSONField(default=dict, blank=True)
    
    # Creation timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('model analysis')
        verbose_name_plural = _('model analyses')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.response_name} Model ({self.experiment_design.name})"


class ExperimentRun(models.Model):
    """Model for individual experiment runs and results."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experiment_design = models.ForeignKey(
        ExperimentDesign, 
        on_delete=models.CASCADE, 
        related_name='runs'
    )
    
    # Run metadata
    run_order = models.IntegerField()
    standard_order = models.IntegerField()
    block = models.IntegerField(default=1)
    is_center_point = models.BooleanField(default=False)
    
    # Factor values and response results stored as JSON
    factor_values = models.JSONField(default=dict)
    response_values = models.JSONField(default=dict)
    
    # Run status
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('error', 'Error'),
        ('excluded', 'Excluded from Analysis')
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = _('experiment run')
        verbose_name_plural = _('experiment runs')
        ordering = ['experiment_design', 'run_order']
        unique_together = ['experiment_design', 'run_order']
    
    def __str__(self):
        return f"Run {self.run_order} ({self.experiment_design.name})"


class OptimizationAnalysis(models.Model):
    """Model for optimization analysis of experimental designs."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experiment_design = models.ForeignKey(
        ExperimentDesign, 
        on_delete=models.CASCADE, 
        related_name='optimizations'
    )
    analysis_result = models.OneToOneField(
        AnalysisResult,
        on_delete=models.CASCADE,
        related_name='optimization_detail',
        null=True,
        blank=True
    )
    
    # Optimization metadata
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Optimization type
    OPTIMIZATION_TYPES = [
        ('single_response', 'Single Response'),
        ('multiple_response', 'Multiple Response'),
        ('desirability', 'Desirability Function'),
        ('pareto', 'Pareto Optimization'),
        ('custom', 'Custom Optimization')
    ]
    optimization_type = models.CharField(max_length=30, choices=OPTIMIZATION_TYPES)
    
    # Optimization criteria and weights
    criteria = models.JSONField(default=list)
    weights = models.JSONField(default=dict)
    
    # Optimization results
    optimal_settings = models.JSONField(default=dict)
    predicted_responses = models.JSONField(default=dict)
    desirability = models.FloatField(null=True, blank=True)
    
    # Robustness analysis
    sensitivity_analysis = models.JSONField(default=dict, blank=True)
    
    # Creation timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('optimization analysis')
        verbose_name_plural = _('optimization analyses')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.experiment_design.name})"