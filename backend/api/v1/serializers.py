"""
Serializers for High-Precision Statistical API
"""

from rest_framework import serializers
from typing import List, Optional, Union
import numpy as np


class FlexibleDataField(serializers.Field):
    """Field that accepts both string (comma-separated) and list formats"""

    def to_internal_value(self, data):
        """Convert input to list of floats"""
        # Handle string input (comma-separated values)
        if isinstance(data, str):
            try:
                # Split by comma and convert to floats
                values = [float(x.strip()) for x in data.split(',') if x.strip()]
            except (ValueError, TypeError) as e:
                raise serializers.ValidationError(f"Invalid numeric data: {str(e)}")

        # Handle list input
        elif isinstance(data, list):
            try:
                values = [float(x) for x in data]
            except (ValueError, TypeError) as e:
                raise serializers.ValidationError(f"Invalid numeric data: {str(e)}")

        else:
            raise serializers.ValidationError(
                "Data must be a comma-separated string or a list of numbers"
            )

        # Validate minimum length
        if len(values) < 2:
            raise serializers.ValidationError("Need at least 2 data points")

        # Check for NaN or Inf
        if any(np.isnan(x) or np.isinf(x) for x in values):
            raise serializers.ValidationError("Data contains NaN or Inf values")

        return values

    def to_representation(self, value):
        """Convert list to output format"""
        return value


class DataArrayValidator:
    """Validate numerical arrays for statistical calculations"""

    def __call__(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Data must be a list")

        if len(value) < 2:
            raise serializers.ValidationError("Need at least 2 data points")

        if len(value) > 1000000:
            raise serializers.ValidationError("Data size exceeds maximum (1M points)")

        # Check all values are numeric
        try:
            numeric_values = [float(x) for x in value]
        except (ValueError, TypeError):
            raise serializers.ValidationError("All values must be numeric")

        # Check for NaN or Inf
        if any(np.isnan(x) or np.isinf(x) for x in numeric_values):
            raise serializers.ValidationError("Data contains NaN or Inf values")

        return numeric_values


class TTestRequestSerializer(serializers.Serializer):
    """Serializer for t-test requests with flexible parameter support"""

    # Extended test types for backward compatibility
    TEST_TYPES = ['one_sample', 'two_sample', 'paired']
    TEST_TYPE_ALIASES = {
        'one-sample': 'one_sample',
        'two-sample': 'two_sample',
        'independent': 'two_sample',
        'paired-sample': 'paired',
        'dependent': 'paired'
    }

    ALTERNATIVES = ['two_sided', 'less', 'greater']
    ALTERNATIVE_ALIASES = {
        'two-sided': 'two_sided',
        'two.sided': 'two_sided',
        'both': 'two_sided'
    }

    test_type = serializers.CharField()  # Changed from ChoiceField for flexibility
    data1 = FlexibleDataField()
    data2 = FlexibleDataField(required=False)

    # Additional parameters with multiple name support
    alternative = serializers.CharField(default='two_sided', required=False)
    confidence_level = serializers.CharField(default='95', required=False)
    hypothesized_mean = serializers.CharField(required=False)
    mu = serializers.CharField(required=False)  # Alias for hypothesized_mean
    alpha = serializers.FloatField(required=False, default=0.05)  # Alternative to confidence_level

    parameters = serializers.DictField(required=False, default=dict)
    options = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        """Cross-field validation with parameter normalization"""

        # Normalize test_type using aliases
        test_type = data['test_type'].lower()
        if test_type in self.TEST_TYPE_ALIASES:
            data['test_type'] = self.TEST_TYPE_ALIASES[test_type]
        elif test_type not in self.TEST_TYPES:
            raise serializers.ValidationError(
                f"Invalid test_type. Must be one of: {', '.join(self.TEST_TYPES + list(self.TEST_TYPE_ALIASES.keys()))}"
            )
        else:
            data['test_type'] = test_type

        # Normalize alternative
        if 'alternative' in data:
            alt = data['alternative'].lower()
            if alt in self.ALTERNATIVE_ALIASES:
                data['alternative'] = self.ALTERNATIVE_ALIASES[alt]
            elif alt not in self.ALTERNATIVES:
                data['alternative'] = 'two_sided'  # Default
            else:
                data['alternative'] = alt

        # Handle mu/hypothesized_mean aliases
        if 'mu' in data and 'hypothesized_mean' not in data:
            data['hypothesized_mean'] = data.pop('mu')
        elif 'mu' in data and 'hypothesized_mean' in data:
            # If both provided, mu takes precedence
            data.pop('mu')

        # Handle alpha/confidence_level conversion
        if 'alpha' in data and 'confidence_level' not in data:
            # Convert alpha to confidence level
            alpha = float(data['alpha'])
            data['confidence_level'] = str((1 - alpha) * 100)

        # Merge parameters from different sources
        params = data.get('parameters', {})
        if 'mu' in params:
            if 'hypothesized_mean' not in data:
                data['hypothesized_mean'] = str(params['mu'])

        # Get normalized test type for validation
        test_type = data['test_type']

        # Validate data2 requirement based on test type
        if test_type in ['two_sample', 'paired'] and 'data2' not in data:
            raise serializers.ValidationError(
                f"{test_type} test requires data2"
            )

        # For paired test, ensure equal lengths
        if test_type == 'paired' and 'data2' in data:
            if len(data['data1']) != len(data['data2']):
                raise serializers.ValidationError(
                    "Paired test requires data1 and data2 to have equal length"
                )

        # Validate hypothesized mean for one-sample test
        if test_type == 'one_sample':
            if 'hypothesized_mean' in data:
                try:
                    float(data['hypothesized_mean'])
                except (ValueError, TypeError):
                    raise serializers.ValidationError("Hypothesized mean must be numeric")
            elif 'mu' in params:
                try:
                    data['hypothesized_mean'] = str(float(params['mu']))
                except (ValueError, TypeError):
                    raise serializers.ValidationError("Parameter 'mu' must be numeric")

        return data


class TTestResponseSerializer(serializers.Serializer):
    """Serializer for t-test responses"""

    test_type = serializers.CharField()
    high_precision_result = serializers.DictField()
    standard_precision_result = serializers.DictField(required=False)
    assumptions = serializers.DictField(required=False)
    validation = serializers.DictField(required=False)
    comparison = serializers.DictField(required=False)
    recommendations = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    metadata = serializers.DictField()


class ComparisonRequestSerializer(serializers.Serializer):
    """Serializer for comparison requests"""

    SUPPORTED_TESTS = [
        't_test', 'anova', 'correlation', 'chi_square',
        'linear_regression', 'mann_whitney', 'wilcoxon'
    ]

    test_name = serializers.ChoiceField(choices=SUPPORTED_TESTS)
    data = serializers.DictField()  # Flexible structure for different tests
    parameters = serializers.DictField(required=False, default=dict)


class DataImportSerializer(serializers.Serializer):
    """Serializer for data import"""

    file = serializers.FileField()
    format = serializers.CharField(required=False)
    options = serializers.DictField(required=False, default=dict)

    def validate_file(self, value):
        """Validate uploaded file"""
        # Check file size (max 100MB)
        if value.size > 100 * 1024 * 1024:
            raise serializers.ValidationError(
                "File size exceeds maximum (100MB)"
            )

        # Check file extension
        allowed_extensions = ['.csv', '.xlsx', '.xls', '.json', '.tsv']
        file_name = value.name.lower()

        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
            )

        return value


class FlexibleGroupsField(serializers.Field):
    """Field that accepts various formats for group data"""

    def to_internal_value(self, data):
        """Convert input to list of lists of floats"""
        groups = []

        # Handle list of lists of numbers
        if isinstance(data, list) and all(isinstance(g, list) for g in data):
            try:
                for group in data:
                    if isinstance(group, list):
                        group_data = [float(x) for x in group]
                        groups.append(group_data)
            except (ValueError, TypeError) as e:
                raise serializers.ValidationError(f"Invalid numeric data in groups: {str(e)}")

        # Handle list of dictionaries with 'name' and 'data' fields
        elif isinstance(data, list) and all(isinstance(g, dict) for g in data):
            try:
                for group in data:
                    if 'data' in group:
                        group_data = group['data']
                        if isinstance(group_data, str):
                            # Parse comma-separated string
                            values = [float(x.strip()) for x in group_data.split(',') if x.strip()]
                        elif isinstance(group_data, list):
                            values = [float(x) for x in group_data]
                        else:
                            raise serializers.ValidationError("Group data must be a string or list")
                        groups.append(values)
                    else:
                        raise serializers.ValidationError("Each group must have a 'data' field")
            except (ValueError, TypeError) as e:
                raise serializers.ValidationError(f"Invalid group data: {str(e)}")

        else:
            raise serializers.ValidationError(
                "Groups must be a list of lists or a list of dictionaries with 'data' fields"
            )

        # Validate minimum groups
        if len(groups) < 2:
            raise serializers.ValidationError("ANOVA requires at least 2 groups")

        # Validate each group has at least 2 data points
        for i, group in enumerate(groups):
            if len(group) < 2:
                raise serializers.ValidationError(f"Group {i+1} needs at least 2 data points")

        return groups

    def to_representation(self, value):
        return value


class FlexibleCovariatesField(serializers.Field):
    """Field that accepts various formats for covariate data without group validation"""

    def to_internal_value(self, data):
        """Convert input to list of lists of floats for covariates"""
        covariates = []

        # Handle list of lists of numbers
        if isinstance(data, list) and all(isinstance(c, list) for c in data):
            try:
                for covariate in data:
                    if isinstance(covariate, list):
                        cov_data = [float(x) for x in covariate]
                        covariates.append(cov_data)
            except (ValueError, TypeError) as e:
                raise serializers.ValidationError(f"Invalid numeric data in covariates: {str(e)}")

        # Handle list of dictionaries with 'name' and 'data' fields
        elif isinstance(data, list) and all(isinstance(c, dict) for c in data):
            try:
                for covariate in data:
                    if 'data' in covariate:
                        cov_data = covariate['data']
                        if isinstance(cov_data, str):
                            # Parse comma-separated string
                            values = [float(x.strip()) for x in cov_data.split(',') if x.strip()]
                        elif isinstance(cov_data, list):
                            values = [float(x) for x in cov_data]
                        else:
                            raise serializers.ValidationError("Covariate data must be a string or list")
                        covariates.append(values)
                    else:
                        raise serializers.ValidationError("Each covariate must have a 'data' field")
            except (ValueError, TypeError) as e:
                raise serializers.ValidationError(f"Invalid covariate data: {str(e)}")

        else:
            raise serializers.ValidationError(
                "Covariates must be a list of lists or a list of dictionaries with 'data' fields"
            )

        # No minimum covariates requirement - can have 1 or more covariates
        # No minimum data points requirement per covariate

        return covariates

    def to_representation(self, value):
        """Convert internal value to representation"""
        return value


class ANOVARequestSerializer(serializers.Serializer):
    """Serializer for comprehensive ANOVA requests with flexible parameters"""

    ANOVA_TYPES = ['one_way', 'two_way', 'repeated_measures', 'manova']
    ANOVA_TYPE_ALIASES = {
        'one-way': 'one_way',
        'oneway': 'one_way',
        '1way': 'one_way',
        'two-way': 'two_way',
        'twoway': 'two_way',
        '2way': 'two_way',
        'repeated': 'repeated_measures',
        'rm': 'repeated_measures',
        'repeated-measures': 'repeated_measures'
    }

    POST_HOC_TESTS = [
        'tukey', 'bonferroni', 'scheffe', 'games_howell',
        'dunnett', 'sidak', 'holm', 'lsd'
    ]
    CORRECTIONS = ['bonferroni', 'holm', 'fdr_bh', 'fdr_by', 'sidak', 'none']

    anova_type = serializers.CharField(default='one_way')  # Changed for flexibility
    groups = FlexibleGroupsField(required=False)  # Make optional for 'data' parameter
    data = FlexibleGroupsField(required=False)  # Alternative parameter name

    # For two-way ANOVA
    factor1_levels = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    factor2_levels = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

    # For MANOVA
    dependent_variables = serializers.ListField(
        child=serializers.ListField(
            child=serializers.FloatField()
        ),
        required=False
    )

    # Post-hoc tests
    post_hoc = serializers.ChoiceField(
        choices=POST_HOC_TESTS,
        required=False,
        allow_null=True
    )

    # Multiple comparison correction
    correction = serializers.ChoiceField(
        choices=CORRECTIONS,
        default='none',
        required=False
    )

    # Additional parameters
    parameters = serializers.DictField(required=False, default=dict)
    options = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        """Comprehensive validation for ANOVA requests with parameter normalization"""

        # Normalize anova_type using aliases
        anova_type = data.get('anova_type', 'one_way').lower()
        if anova_type in self.ANOVA_TYPE_ALIASES:
            data['anova_type'] = self.ANOVA_TYPE_ALIASES[anova_type]
        elif anova_type not in self.ANOVA_TYPES:
            # Default to one_way if invalid
            data['anova_type'] = 'one_way'
        else:
            data['anova_type'] = anova_type

        # Handle 'data' vs 'groups' parameter aliases
        if 'data' in data and 'groups' not in data:
            data['groups'] = data.pop('data')
        elif 'data' in data and 'groups' in data:
            # If both provided, 'data' takes precedence
            data['groups'] = data.pop('data')
        elif 'groups' not in data:
            raise serializers.ValidationError(
                "Either 'groups' or 'data' parameter is required"
            )

        # Handle 'repeated' parameter for repeated measures
        if 'repeated' in data and data.get('repeated'):
            data['anova_type'] = 'repeated_measures'

        # Handle 'factors' parameter for two-way ANOVA
        if 'factors' in data and not data.get('factor1_levels'):
            factors = data.get('factors', {})
            if isinstance(factors, dict):
                factor_names = list(factors.keys())
                if len(factor_names) >= 2:
                    data['factor1_levels'] = factors.get(factor_names[0], [])
                    data['factor2_levels'] = factors.get(factor_names[1], [])
                    data['anova_type'] = 'two_way'

        # Get normalized values
        anova_type = data['anova_type']
        groups = data['groups']

        # Validate groups data
        for i, group in enumerate(groups):
            if len(group) < 2:
                raise serializers.ValidationError(
                    f"Group {i+1} has insufficient data (minimum 2 required)"
                )
            # Check for NaN/Inf
            if any(np.isnan(x) or np.isinf(x) for x in group):
                raise serializers.ValidationError(
                    f"Group {i+1} contains NaN or Inf values"
                )

        # Two-way ANOVA validation
        if anova_type == 'two_way':
            if 'factor1_levels' not in data or 'factor2_levels' not in data:
                raise serializers.ValidationError(
                    "Two-way ANOVA requires factor1_levels and factor2_levels"
                )
            expected_groups = len(data['factor1_levels']) * len(data['factor2_levels'])
            if len(groups) != expected_groups:
                raise serializers.ValidationError(
                    f"Two-way ANOVA expects {expected_groups} groups"
                )

        # MANOVA validation
        if anova_type == 'manova':
            if 'dependent_variables' not in data:
                raise serializers.ValidationError(
                    "MANOVA requires dependent_variables"
                )
            # Check all dependent variables have same length as groups
            for dv in data['dependent_variables']:
                if len(dv) != sum(len(g) for g in groups):
                    raise serializers.ValidationError(
                        "Dependent variables must match total observations"
                    )

        # Post-hoc test validation
        if data.get('post_hoc') and len(groups) < 3:
            raise serializers.ValidationError(
                "Post-hoc tests require at least 3 groups"
            )

        return data


class CorrelationRequestSerializer(serializers.Serializer):
    """Serializer for correlation requests"""

    CORRELATION_METHODS = ['pearson', 'spearman', 'kendall']

    x = serializers.ListField(
        child=serializers.FloatField(),
        min_length=3,
        validators=[DataArrayValidator()]
    )
    y = serializers.ListField(
        child=serializers.FloatField(),
        min_length=3,
        validators=[DataArrayValidator()]
    )
    method = serializers.ChoiceField(
        choices=CORRELATION_METHODS,
        default='pearson'
    )
    parameters = serializers.DictField(required=False, default=dict)
    options = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        """Ensure x and y have same length"""
        if len(data['x']) != len(data['y']):
            raise serializers.ValidationError(
                "x and y must have the same length"
            )
        return data


class RegressionRequestSerializer(serializers.Serializer):
    """Serializer for regression requests"""

    REGRESSION_TYPES = [
        'simple_linear', 'multiple_linear', 'polynomial',
        'logistic', 'ridge', 'lasso'
    ]

    type = serializers.ChoiceField(choices=REGRESSION_TYPES)
    X = serializers.ListField()  # Can be 1D or 2D
    y = serializers.ListField(
        child=serializers.FloatField(),
        validators=[DataArrayValidator()]
    )
    parameters = serializers.DictField(required=False, default=dict)
    options = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        """Validate regression data"""
        X = data['X']
        y = data['y']

        # Check dimensions
        if data['type'] in ['simple_linear', 'polynomial']:
            # X should be 1D for simple linear and polynomial
            if not all(isinstance(x, (int, float)) for x in X):
                raise serializers.ValidationError(
                    f"{data['type'].replace('_', ' ').title()} regression requires 1D array for X"
                )
            if len(X) != len(y):
                raise serializers.ValidationError(
                    "X and y must have the same length"
                )
        else:
            # X should be 2D (list of lists) for multiple linear, ridge, lasso, logistic
            if not all(isinstance(row, list) for row in X):
                raise serializers.ValidationError(
                    f"{data['type'].replace('_', ' ').title()} regression requires 2D array for X"
                )
            if len(X) != len(y):
                raise serializers.ValidationError(
                    "Number of rows in X must match length of y"
                )

        return data


class ValidationMetricsSerializer(serializers.Serializer):
    """Serializer for validation metrics"""

    overall_accuracy = serializers.CharField()
    decimal_precision = serializers.IntegerField()
    tests_validated = serializers.IntegerField()
    tests_passed = serializers.IntegerField()
    last_validation = serializers.DateTimeField()
    comparison = serializers.DictField()


class HighPrecisionNumberField(serializers.Field):
    """
    Custom field for high-precision numbers.
    Stores as string to preserve precision.
    """

    def to_representation(self, value):
        """Convert to string for JSON"""
        return str(value)

    def to_internal_value(self, data):
        """Convert from string to Decimal"""
        from decimal import Decimal, InvalidOperation
        try:
            return Decimal(str(data))
        except (InvalidOperation, ValueError, TypeError):
            raise serializers.ValidationError(
                "Invalid numeric value"
            )


class CategoricalRequestSerializer(serializers.Serializer):
    """Serializer for categorical/contingency test requests"""

    TEST_TYPES = [
        'chi_square_independence', 'chi_square_goodness',
        'fishers_exact', 'mcnemar', 'cochran_q', 'g_test',
        'binomial', 'multinomial', 'cochran_armitage'
    ]

    test_type = serializers.ChoiceField(choices=TEST_TYPES)
    contingency_table = serializers.ListField(
        child=serializers.ListField(
            child=serializers.IntegerField(min_value=0)
        ),
        required=False
    )
    data = serializers.DictField(required=False)  # For raw categorical data
    expected_frequencies = serializers.ListField(
        child=serializers.FloatField(min_value=0),
        required=False
    )
    alpha = serializers.FloatField(default=0.05, min_value=0, max_value=1)
    parameters = serializers.DictField(required=False, default=dict)
    options = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        """Validate categorical test data"""
        test_type = data['test_type']

        # Ensure either contingency_table or data is provided
        if 'contingency_table' not in data and 'data' not in data:
            raise serializers.ValidationError(
                "Either 'contingency_table' or 'data' must be provided"
            )

        # Validate contingency table dimensions for specific tests
        if 'contingency_table' in data:
            table = data['contingency_table']

            if test_type == 'fishers_exact' and (len(table) != 2 or len(table[0]) != 2):
                raise serializers.ValidationError(
                    "Fisher's exact test requires a 2x2 contingency table"
                )

            if test_type == 'mcnemar' and (len(table) != 2 or len(table[0]) != 2):
                raise serializers.ValidationError(
                    "McNemar's test requires a 2x2 contingency table"
                )

        return data


class NonParametricRequestSerializer(serializers.Serializer):
    """Serializer for non-parametric test requests"""

    TEST_TYPES = [
        'mann_whitney', 'wilcoxon', 'kruskal_wallis', 'friedman',
        'sign_test', 'mood_median', 'jonckheere', 'page_trend',
        'spearman', 'kendall_tau', 'dunn', 'nemenyi'
    ]

    test_type = serializers.ChoiceField(choices=TEST_TYPES)
    groups = serializers.ListField(
        child=serializers.ListField(
            child=serializers.FloatField()
        ),
        required=False
    )
    data1 = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        validators=[DataArrayValidator()]
    )
    data2 = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        validators=[DataArrayValidator()]
    )
    paired = serializers.BooleanField(default=False)
    alternative = serializers.ChoiceField(
        choices=['two_sided', 'greater', 'less'],
        default='two_sided'
    )
    alpha = serializers.FloatField(default=0.05, min_value=0, max_value=1)
    parameters = serializers.DictField(required=False, default=dict)
    options = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        """Validate non-parametric test data"""
        test_type = data['test_type']

        # Validate data requirements based on test type
        if test_type in ['mann_whitney', 'wilcoxon', 'sign_test']:
            if test_type == 'mann_whitney' and not ('data1' in data and 'data2' in data):
                raise serializers.ValidationError(
                    "Mann-Whitney U test requires data1 and data2"
                )
            if test_type == 'wilcoxon' and data.get('paired'):
                if not ('data1' in data and 'data2' in data):
                    raise serializers.ValidationError(
                        "Paired Wilcoxon test requires data1 and data2"
                    )
                if len(data['data1']) != len(data['data2']):
                    raise serializers.ValidationError(
                        "Paired samples must have equal length"
                    )

        elif test_type in ['kruskal_wallis', 'friedman']:
            if 'groups' not in data:
                raise serializers.ValidationError(
                    f"{test_type} test requires 'groups' data"
                )
            if len(data['groups']) < 3:
                raise serializers.ValidationError(
                    f"{test_type} test requires at least 3 groups"
                )

        return data


class ANCOVARequestSerializer(serializers.Serializer):
    """Serializer for ANCOVA (Analysis of Covariance) requests"""
    groups = FlexibleGroupsField(
        help_text="List of groups, each containing numerical data points"
    )
    covariates = FlexibleCovariatesField(
        help_text="List of covariates, each containing numerical data points"
    )
    group_names = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Optional names for each group"
    )
    covariate_names = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Optional names for each covariate"
    )
    dependent_variable_name = serializers.CharField(
        required=False,
        default="Dependent Variable",
        help_text="Name of the dependent variable"
    )
    alpha = serializers.FloatField(
        required=False,
        default=0.05,
        min_value=0.001,
        max_value=0.999,
        help_text="Significance level for tests"
    )
    check_homogeneity_slopes = serializers.BooleanField(
        required=False,
        default=True,
        help_text="Check homogeneity of regression slopes assumption"
    )
    post_hoc = serializers.ChoiceField(
        choices=['tukey', 'bonferroni', 'scheffe', 'games_howell',
                'dunnett', 'fisher_lsd', 'newman_keuls', 'duncan'],
        required=False,
        help_text="Post-hoc test to perform"
    )
    options = serializers.DictField(
        child=serializers.JSONField(),
        required=False,
        help_text="Additional options for ANCOVA analysis"
    )

    def validate_groups(self, value):
        """Ensure groups have appropriate structure"""
        if not value:
            raise serializers.ValidationError("At least two groups required")

        for i, group in enumerate(value):
            if len(group) < 2:
                raise serializers.ValidationError(
                    f"Group {i+1} must have at least 2 data points"
                )

        return value

    def validate_covariates(self, value):
        """Ensure covariates are properly formatted"""
        if not value:
            raise serializers.ValidationError("At least one covariate required for ANCOVA")

        # Check all covariates have same length
        cov_lengths = [len(cov) for cov in value]
        if len(set(cov_lengths)) > 1:
            raise serializers.ValidationError("All covariates must have the same length")

        return value

    def validate(self, attrs):
        """Cross-field validation"""
        groups = attrs.get('groups', [])
        covariates = attrs.get('covariates', [])

        if groups and covariates:
            # Total observations should match
            total_group_obs = sum(len(g) for g in groups)
            covariate_obs = len(covariates[0]) if covariates else 0

            # For ANCOVA, we need matching observations
            if total_group_obs != covariate_obs:
                raise serializers.ValidationError(
                    f"Total group observations ({total_group_obs}) must match covariate observations ({covariate_obs})"
                )

        return attrs


class MissingDataRequestSerializer(serializers.Serializer):
    """Serializer for missing data handling requests"""

    IMPUTATION_METHODS = [
        'mean', 'median', 'mode', 'forward_fill', 'backward_fill',
        'linear_interpolation', 'knn', 'mice', 'hot_deck', 'cold_deck',
        'regression', 'em_algorithm', 'random_forest', 'drop'
    ]

    MISSINGNESS_TESTS = ['mcar', 'mar', 'mnar']

    data = serializers.ListField()  # Can contain None/NaN values
    method = serializers.ChoiceField(choices=IMPUTATION_METHODS)
    test_missingness = serializers.BooleanField(default=True)
    missingness_type = serializers.ChoiceField(
        choices=MISSINGNESS_TESTS,
        required=False
    )
    columns = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    parameters = serializers.DictField(required=False, default=dict)
    options = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        """Validate missing data handling request"""
        method = data['method']

        # Validate KNN parameters
        if method == 'knn' and 'parameters' in data:
            params = data['parameters']
            if 'n_neighbors' in params:
                n = params['n_neighbors']
                if not isinstance(n, int) or n < 1:
                    raise serializers.ValidationError(
                        "n_neighbors must be a positive integer"
                    )

        # Validate MICE parameters
        if method == 'mice' and 'parameters' in data:
            params = data['parameters']
            if 'n_iterations' in params:
                n = params['n_iterations']
                if not isinstance(n, int) or n < 1:
                    raise serializers.ValidationError(
                        "n_iterations must be a positive integer"
                    )

        return data