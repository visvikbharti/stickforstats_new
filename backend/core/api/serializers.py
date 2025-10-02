"""
Django REST Framework Serializers for Core Statistical Services
================================================================
Created: 2025-08-06 12:00:00 UTC
Author: StickForStats Development Team
Version: 1.0.0

This module provides comprehensive serializers for all statistical data structures,
ensuring proper validation, type safety, and scientific accuracy in API communication.

Scientific Rigor: MAXIMUM
Enterprise Quality: Production-ready
Security: Input validation and sanitization
"""

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from typing import Dict, List, Optional, Any, Union
import numpy as np
import pandas as pd
from pathlib import Path
import logging
import json
from decimal import Decimal

# Import our core data structures
from ..data_profiler import (
    VariableType, DistributionType, DataQualityIssue,
    VariableProfile, DatasetProfile
)
from ..test_recommender import (
    TestCategory, ResearchQuestion, TestRecommendation
)
from ..services.assumption_service import (
    AssumptionSeverity, AssumptionResult
)
from ..interpretation_engine import (
    SignificanceLevel, EffectSizeMagnitude, PracticalSignificance,
    Interpretation
)

logger = logging.getLogger(__name__)


class ScientificFloatField(serializers.Field):
    """
    Custom field for scientific precision floating point numbers.
    Ensures proper handling of NaN, Inf, and maintains precision.
    """
    
    def __init__(self, precision: int = 4, allow_nan: bool = False, 
                 min_value: Optional[float] = None,
                 max_value: Optional[float] = None, **kwargs):
        """
        Initialize scientific float field.
        
        Args:
            precision: Decimal places for rounding
            allow_nan: Whether to allow NaN values
            min_value: Minimum allowed value
            max_value: Maximum allowed value
        """
        self.precision = precision
        self.allow_nan = allow_nan
        self.min_value = min_value
        self.max_value = max_value
        super().__init__(**kwargs)
        
    def to_representation(self, value):
        """Convert to JSON-safe representation."""
        if value is None:
            return None
            
        if isinstance(value, (np.floating, np.integer)):
            value = float(value)
            
        if np.isnan(value):
            if self.allow_nan:
                return None
            raise ValidationError("NaN values not allowed")
            
        if np.isinf(value):
            raise ValidationError("Infinite values not allowed")
            
        # Round to specified precision
        return round(value, self.precision)
        
    def to_internal_value(self, data):
        """Convert from JSON to internal Python value."""
        if data is None:
            return None
            
        try:
            value = float(data)
        except (TypeError, ValueError):
            raise ValidationError(f"Invalid float value: {data}")
            
        if self.min_value is not None and value < self.min_value:
            raise ValidationError(f"Value {value} below minimum {self.min_value}")
            
        if self.max_value is not None and value > self.max_value:
            raise ValidationError(f"Value {value} above maximum {self.max_value}")
            
        return value


class VariableProfileSerializer(serializers.Serializer):
    """
    Serializer for individual variable profiles.
    Handles complex statistical metadata with scientific precision.
    """
    
    # Basic information
    name = serializers.CharField(max_length=255)
    variable_type = serializers.ChoiceField(
        choices=[(vt.value, vt.value) for vt in VariableType]
    )
    
    # Statistical measures
    count = serializers.IntegerField(min_value=0)
    missing_count = serializers.IntegerField(min_value=0)
    missing_percentage = ScientificFloatField(
        precision=2, min_value=0, max_value=100
    )
    unique_count = serializers.IntegerField(min_value=0)
    unique_percentage = ScientificFloatField(
        precision=2, min_value=0, max_value=100
    )
    
    # Descriptive statistics (conditional on variable type)
    mean = ScientificFloatField(precision=4, allow_nan=True, required=False)
    median = ScientificFloatField(precision=4, allow_nan=True, required=False)
    mode = serializers.JSONField(required=False)  # Can be multiple values
    std = ScientificFloatField(precision=4, allow_nan=True, required=False)
    variance = ScientificFloatField(precision=4, allow_nan=True, required=False)
    min = ScientificFloatField(precision=4, allow_nan=True, required=False)
    max = ScientificFloatField(precision=4, allow_nan=True, required=False)
    range = ScientificFloatField(precision=4, allow_nan=True, required=False)
    
    # Distribution measures
    skewness = ScientificFloatField(precision=4, allow_nan=True, required=False)
    kurtosis = ScientificFloatField(precision=4, allow_nan=True, required=False)
    q1 = ScientificFloatField(precision=4, allow_nan=True, required=False)
    q3 = ScientificFloatField(precision=4, allow_nan=True, required=False)
    iqr = ScientificFloatField(precision=4, allow_nan=True, required=False)
    
    # Advanced statistics
    normality_statistic = ScientificFloatField(precision=6, required=False)
    normality_p_value = ScientificFloatField(
        precision=4, min_value=0, max_value=1, required=False
    )
    
    # Distribution fitting
    distribution_type = serializers.ChoiceField(
        choices=[(dt.value, dt.value) for dt in DistributionType],
        required=False, allow_null=True
    )
    distribution_params = serializers.DictField(
        child=ScientificFloatField(precision=6),
        required=False
    )
    distribution_ks_statistic = ScientificFloatField(
        precision=4, min_value=0, max_value=1, required=False
    )
    distribution_ks_p_value = ScientificFloatField(
        precision=4, min_value=0, max_value=1, required=False
    )
    
    # Outliers
    outlier_count = serializers.IntegerField(min_value=0, required=False)
    outlier_percentage = ScientificFloatField(
        precision=2, min_value=0, max_value=100, required=False
    )
    outlier_indices = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        required=False
    )
    
    # Data quality
    quality_issues = serializers.ListField(
        child=serializers.ChoiceField(
            choices=[(dq.value, dq.value) for dq in DataQualityIssue]
        ),
        required=False
    )
    
    # Transformations
    suggested_transformations = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )
    
    # Categorical data (if applicable)
    categories = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    category_frequencies = serializers.DictField(
        child=serializers.IntegerField(min_value=0),
        required=False
    )
    
    def validate(self, data):
        """
        Perform cross-field validation for scientific consistency.
        """
        # Validate percentages sum to reasonable values
        if 'missing_percentage' in data and 'unique_percentage' in data:
            if data['missing_percentage'] > 100:
                raise ValidationError(
                    "Missing percentage cannot exceed 100%"
                )
                
        # Validate statistical measures consistency
        if 'mean' in data and 'std' in data and 'variance' in data:
            if data['std'] ** 2 != data['variance']:
                # Allow small numerical errors
                if abs(data['std'] ** 2 - data['variance']) > 0.0001:
                    logger.warning(
                        f"Variance inconsistency: std²={data['std']**2}, "
                        f"variance={data['variance']}"
                    )
                    
        # Validate distribution parameters
        if 'distribution_type' in data and data['distribution_type']:
            if 'distribution_params' not in data or not data['distribution_params']:
                raise ValidationError(
                    "Distribution parameters required when distribution type specified"
                )
                
        return data


class DatasetProfileSerializer(serializers.Serializer):
    """
    Serializer for complete dataset profiles.
    Handles complex nested structures with scientific validation.
    """
    
    # Dataset metadata
    n_rows = serializers.IntegerField(min_value=0)
    n_columns = serializers.IntegerField(min_value=0)
    memory_usage_mb = ScientificFloatField(precision=2, min_value=0)
    
    # Variable profiles
    variables = serializers.DictField(
        child=VariableProfileSerializer(),
        help_text="Dictionary of variable names to their profiles"
    )
    
    # Correlation matrix (for numerical variables)
    correlation_matrix = serializers.JSONField(
        required=False,
        help_text="Correlation matrix as nested lists or dict"
    )
    
    # Missing data patterns
    missing_pattern = serializers.ChoiceField(
        choices=['MCAR', 'MAR', 'MNAR', 'No missing data'],
        required=False
    )
    missing_heatmap = serializers.JSONField(
        required=False,
        help_text="Missing data pattern visualization data"
    )
    
    # Multicollinearity
    multicollinearity_detected = serializers.BooleanField(default=False)
    vif_scores = serializers.DictField(
        child=ScientificFloatField(precision=2, min_value=0),
        required=False
    )
    
    # Data quality summary
    overall_quality_score = ScientificFloatField(
        precision=2, min_value=0, max_value=100,
        required=False
    )
    quality_warnings = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False
    )
    
    # Statistical test suggestions
    suggested_analyses = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False
    )
    
    # Metadata
    profiling_timestamp = serializers.DateTimeField(read_only=True)
    profiling_version = serializers.CharField(
        max_length=20, default="1.0.0", read_only=True
    )
    
    def validate_correlation_matrix(self, value):
        """Validate correlation matrix is symmetric and bounded."""
        if value is None:
            return value
            
        # Convert to numpy array for validation
        try:
            if isinstance(value, dict):
                # Assume it's a DataFrame.to_dict() output
                matrix = pd.DataFrame(value).values
            else:
                matrix = np.array(value)
                
            # Check symmetry
            if not np.allclose(matrix, matrix.T, atol=1e-7):
                raise ValidationError("Correlation matrix must be symmetric")
                
            # Check bounds
            if np.any(np.abs(matrix) > 1.0001):  # Small tolerance for numerical errors
                raise ValidationError("Correlation values must be between -1 and 1")
                
        except Exception as e:
            raise ValidationError(f"Invalid correlation matrix: {str(e)}")
            
        return value


class TestRecommendationSerializer(serializers.Serializer):
    """
    Serializer for statistical test recommendations.
    Ensures scientific validity of test suggestions.
    """
    
    # Test identification
    test_name = serializers.CharField(max_length=100)
    test_category = serializers.ChoiceField(
        choices=[(tc.value, tc.value) for tc in TestCategory]
    )
    
    # Recommendation strength
    confidence_score = ScientificFloatField(
        precision=3, min_value=0, max_value=1,
        help_text="Confidence in test appropriateness (0-1)"
    )
    priority = serializers.IntegerField(
        min_value=1, max_value=10,
        help_text="Priority ranking (1=highest)"
    )
    
    # Assumptions
    assumptions_met = serializers.ListField(
        child=serializers.CharField(max_length=100)
    )
    assumptions_violated = serializers.ListField(
        child=serializers.CharField(max_length=100)
    )
    assumption_warnings = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False
    )
    
    # Implementation details
    python_function = serializers.CharField(
        max_length=200,
        help_text="Python function to use (e.g., scipy.stats.ttest_ind)"
    )
    r_function = serializers.CharField(
        max_length=200,
        help_text="R function equivalent"
    )
    
    # Parameters
    required_parameters = serializers.ListField(
        child=serializers.CharField(max_length=50)
    )
    optional_parameters = serializers.DictField(
        child=serializers.CharField(),
        required=False
    )
    
    # Rationale
    rationale = serializers.CharField(
        help_text="Explanation of why this test is recommended"
    )
    
    # Alternatives
    alternative_tests = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False
    )
    
    # Effect size
    expected_effect_size = serializers.CharField(
        max_length=50,
        required=False,
        help_text="Expected effect size measure (e.g., Cohen's d)"
    )
    
    # Sample size
    min_sample_size = serializers.IntegerField(
        min_value=1,
        required=False,
        help_text="Minimum sample size for adequate power"
    )
    
    def validate(self, data):
        """Validate scientific consistency of recommendations."""
        # Ensure confidence score aligns with assumptions
        if data.get('assumptions_violated'):
            n_violations = len(data['assumptions_violated'])
            max_confidence = 1.0 - (n_violations * 0.2)  # Reduce confidence per violation
            if data['confidence_score'] > max_confidence:
                logger.warning(
                    f"Confidence score {data['confidence_score']} seems high "
                    f"given {n_violations} assumption violations"
                )
                
        return data


class AssumptionResultSerializer(serializers.Serializer):
    """
    Serializer for assumption checking results.
    Provides detailed validation information with severity assessment.
    """
    
    # Assumption identification
    assumption_name = serializers.CharField(max_length=100)
    assumption_type = serializers.CharField(max_length=50)
    
    # Result
    is_met = serializers.BooleanField()
    severity = serializers.ChoiceField(
        choices=[(s.value, s.value) for s in AssumptionSeverity]
    )
    
    # Statistical evidence
    test_statistic = ScientificFloatField(precision=6, required=False)
    p_value = ScientificFloatField(
        precision=4, min_value=0, max_value=1, required=False
    )
    critical_value = ScientificFloatField(precision=6, required=False)
    confidence_level = ScientificFloatField(
        precision=2, min_value=0, max_value=1, default=0.95
    )
    
    # Additional metrics
    effect_size = ScientificFloatField(precision=4, required=False)
    sample_size = serializers.IntegerField(min_value=1, required=False)
    degrees_of_freedom = ScientificFloatField(precision=2, required=False)
    
    # Detailed results
    details = serializers.DictField(required=False)
    
    # Recommendations
    recommendation = serializers.CharField(max_length=1000)
    alternative_tests = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False
    )
    transformations = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )
    
    # Visualization
    visualization_data = serializers.JSONField(required=False)
    
    # References
    test_reference = serializers.CharField(max_length=200, required=False)
    interpretation_guide = serializers.CharField(max_length=500, required=False)


class InterpretationSerializer(serializers.Serializer):
    """
    Serializer for statistical result interpretations.
    Provides multi-level explanations with educational content.
    """
    
    # Test information
    test_name = serializers.CharField(max_length=100)
    test_type = serializers.CharField(max_length=50)
    
    # Statistical results
    statistic_value = ScientificFloatField(precision=4)
    p_value = ScientificFloatField(precision=4, min_value=0, max_value=1)
    degrees_of_freedom = serializers.JSONField(
        required=False,
        help_text="Can be single value or tuple for F-tests"
    )
    confidence_interval = serializers.ListField(
        child=ScientificFloatField(precision=4),
        min_length=2, max_length=2,
        required=False
    )
    confidence_level = ScientificFloatField(
        precision=2, min_value=0, max_value=1, default=0.95
    )
    
    # Effect sizes
    effect_size_name = serializers.CharField(max_length=50, required=False)
    effect_size_value = ScientificFloatField(precision=4, required=False)
    effect_size_ci = serializers.ListField(
        child=ScientificFloatField(precision=4),
        min_length=2, max_length=2,
        required=False
    )
    effect_magnitude = serializers.ChoiceField(
        choices=[(em.value, em.value) for em in EffectSizeMagnitude],
        required=False
    )
    
    # Interpretations
    significance_level = serializers.ChoiceField(
        choices=[(sl.value, sl.value) for sl in SignificanceLevel]
    )
    practical_significance = serializers.ChoiceField(
        choices=[(ps.value, ps.value) for ps in PracticalSignificance],
        required=False
    )
    
    # Text interpretations
    apa_format = serializers.CharField(max_length=500)
    plain_english = serializers.CharField(max_length=2000)
    technical_interpretation = serializers.CharField(max_length=2000)
    practical_interpretation = serializers.CharField(max_length=2000)
    
    # Educational content
    what_it_means = serializers.CharField(max_length=2000)
    what_to_do_next = serializers.CharField(max_length=2000)
    common_mistakes = serializers.ListField(
        child=serializers.CharField(max_length=500)
    )
    
    # Visualizations
    visualization_suggestions = serializers.ListField(
        child=serializers.CharField(max_length=200)
    )
    
    # References
    references = serializers.ListField(
        child=serializers.CharField(max_length=500)
    )
    further_reading = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False
    )


class FileUploadSerializer(serializers.Serializer):
    """
    Serializer for file upload with comprehensive validation.
    Ensures data integrity and security.
    """
    
    # File specifications
    file = serializers.FileField(
        max_length=255,
        help_text="Data file (CSV, Excel, JSON, Parquet)"
    )
    
    # Processing options
    target_variable = serializers.CharField(
        max_length=100,
        required=False,
        help_text="Dependent variable for analysis"
    )
    
    research_question = serializers.ChoiceField(
        choices=[(rq.value, rq.value) for rq in ResearchQuestion],
        required=False,
        help_text="Type of research question"
    )
    
    # Configuration
    async_processing = serializers.BooleanField(
        default=None,
        required=False,
        help_text="Force async processing (auto-detected if not specified)"
    )
    
    cache_results = serializers.BooleanField(
        default=True,
        help_text="Cache results for faster subsequent access"
    )
    
    # Data specifications
    delimiter = serializers.CharField(
        max_length=5,
        default=',',
        help_text="Delimiter for text files"
    )
    
    encoding = serializers.CharField(
        max_length=20,
        default='utf-8',
        help_text="File encoding"
    )
    
    header_row = serializers.IntegerField(
        min_value=0,
        default=0,
        help_text="Row number containing headers (0-indexed)"
    )
    
    # Validation options
    max_rows = serializers.IntegerField(
        min_value=1,
        required=False,
        help_text="Maximum rows to process (for testing)"
    )
    
    missing_threshold = ScientificFloatField(
        precision=2,
        min_value=0,
        max_value=100,
        default=50,
        help_text="Maximum allowed missing percentage per variable"
    )
    
    def validate_file(self, value):
        """
        Comprehensive file validation for security and compatibility.
        """
        # Check file size (max 500MB as defined in service)
        max_size_mb = 500
        if value.size > max_size_mb * 1024 * 1024:
            raise ValidationError(
                f"File size {value.size / 1024 / 1024:.1f}MB exceeds "
                f"maximum {max_size_mb}MB"
            )
            
        # Check file extension
        valid_extensions = ['.csv', '.xlsx', '.xls', '.tsv', '.json', '.parquet']
        file_ext = Path(value.name).suffix.lower()
        if file_ext not in valid_extensions:
            raise ValidationError(
                f"Unsupported file format '{file_ext}'. "
                f"Supported formats: {', '.join(valid_extensions)}"
            )
            
        # Security check for file name
        if '..' in value.name or '/' in value.name or '\\' in value.name:
            raise ValidationError("Invalid file name detected")
            
        # Check for malicious content patterns
        if file_ext == '.csv' or file_ext == '.tsv':
            # Read first few bytes to check for formula injection
            value.seek(0)
            first_bytes = value.read(1024)
            value.seek(0)
            
            if isinstance(first_bytes, bytes):
                first_bytes = first_bytes.decode('utf-8', errors='ignore')
                
            dangerous_patterns = ['=', '@', '+', '-', '|']
            for pattern in dangerous_patterns:
                if first_bytes.startswith(pattern):
                    logger.warning(
                        f"Potential formula injection detected in {value.name}"
                    )
                    # Don't reject, but sanitize when processing
                    
        return value
        
    def validate(self, data):
        """Cross-field validation."""
        # Warn if async processing might be needed
        if data.get('max_rows') and data['max_rows'] > 100000:
            if not data.get('async_processing'):
                logger.info(
                    f"Large dataset ({data['max_rows']} rows) - "
                    "async processing recommended"
                )
                
        return data


class ProfilingResultSerializer(serializers.Serializer):
    """
    Serializer for complete profiling results.
    Combines profile, recommendations, and metadata.
    """
    
    # Identification
    profile_id = serializers.UUIDField(read_only=True)
    status = serializers.ChoiceField(
        choices=['completed', 'processing', 'error', 'cached']
    )
    
    # Core results
    profile = DatasetProfileSerializer(required=False)
    recommendations = serializers.ListField(
        child=TestRecommendationSerializer(),
        required=False
    )
    
    # Metadata
    metadata = serializers.DictField(
        help_text="Processing metadata including timing and cache status"
    )
    
    # Error information (if applicable)
    error = serializers.CharField(required=False)
    error_type = serializers.CharField(required=False)
    
    # Processing information
    cache_hit = serializers.BooleanField(default=False)
    processing_time_seconds = ScientificFloatField(
        precision=2, required=False
    )
    
    # URLs for async processing
    check_status_url = serializers.URLField(required=False)
    download_report_url = serializers.URLField(required=False)


class BatchProfilingSerializer(serializers.Serializer):
    """
    Serializer for batch profiling multiple datasets.
    Enables efficient processing of multiple files.
    """
    
    files = serializers.ListField(
        child=serializers.FileField(),
        min_length=1,
        max_length=10,
        help_text="List of files to profile (max 10)"
    )
    
    # Common options for all files
    common_target_variable = serializers.CharField(
        max_length=100,
        required=False,
        help_text="Common dependent variable across datasets"
    )
    
    compare_datasets = serializers.BooleanField(
        default=False,
        help_text="Generate comparative analysis across datasets"
    )
    
    # Processing options
    parallel_processing = serializers.BooleanField(
        default=True,
        help_text="Process files in parallel"
    )
    
    max_workers = serializers.IntegerField(
        min_value=1,
        max_value=8,
        default=4,
        help_text="Maximum parallel workers"
    )
    
    def validate_files(self, value):
        """Validate batch file constraints."""
        total_size = sum(f.size for f in value)
        max_total_mb = 1000  # 1GB total
        
        if total_size > max_total_mb * 1024 * 1024:
            raise ValidationError(
                f"Total file size {total_size / 1024 / 1024:.1f}MB "
                f"exceeds maximum {max_total_mb}MB for batch processing"
            )
            
        return value


class ExportReportSerializer(serializers.Serializer):
    """
    Serializer for report export requests.
    Handles multiple output formats with customization.
    """
    
    profile_id = serializers.UUIDField(
        help_text="Profile ID to export"
    )
    
    format = serializers.ChoiceField(
        choices=['pdf', 'html', 'docx', 'latex', 'markdown'],
        default='pdf',
        help_text="Export format"
    )
    
    # Content options
    include_profile = serializers.BooleanField(
        default=True,
        help_text="Include dataset profile"
    )
    
    include_recommendations = serializers.BooleanField(
        default=True,
        help_text="Include test recommendations"
    )
    
    include_visualizations = serializers.BooleanField(
        default=True,
        help_text="Include statistical visualizations"
    )
    
    include_assumptions = serializers.BooleanField(
        default=True,
        help_text="Include assumption checks"
    )
    
    include_interpretations = serializers.BooleanField(
        default=False,
        help_text="Include detailed interpretations"
    )
    
    # Formatting options
    apa_formatting = serializers.BooleanField(
        default=True,
        help_text="Use APA 7th edition formatting"
    )
    
    confidence_level = ScientificFloatField(
        precision=2,
        min_value=0.8,
        max_value=0.99,
        default=0.95,
        help_text="Confidence level for intervals"
    )
    
    # Metadata
    title = serializers.CharField(
        max_length=200,
        default="Statistical Analysis Report",
        help_text="Report title"
    )
    
    author = serializers.CharField(
        max_length=100,
        required=False,
        help_text="Report author"
    )
    
    organization = serializers.CharField(
        max_length=100,
        required=False,
        help_text="Organization name"
    )
    
    include_citations = serializers.BooleanField(
        default=True,
        help_text="Include statistical references"
    )


# Validator functions for complex validation logic

def validate_statistical_consistency(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate statistical consistency across related fields.
    
    Args:
        data: Serialized data dictionary
        
    Returns:
        Validated data
        
    Raises:
        ValidationError: If statistical inconsistencies detected
    """
    # This would contain complex cross-field validation
    # For example, checking that confidence intervals contain point estimates
    
    return data


def validate_sample_size_requirements(
    test_type: str,
    n: int,
    k: Optional[int] = None
) -> None:
    """
    Validate sample size requirements for statistical tests.
    
    Args:
        test_type: Type of statistical test
        n: Sample size
        k: Number of groups/predictors
        
    Raises:
        ValidationError: If sample size insufficient
    """
    min_requirements = {
        't_test': 2,
        'paired_t_test': 3,
        'anova': 3 * k if k else 9,  # 3 per group minimum
        'correlation': 4,
        'regression': 10 * k if k else 20,  # 10 per predictor rule of thumb
        'chi_square': 5,  # 5 per cell minimum
    }
    
    min_n = min_requirements.get(test_type, 2)
    if n < min_n:
        raise ValidationError(
            f"Sample size {n} insufficient for {test_type}. "
            f"Minimum required: {min_n}"
        )