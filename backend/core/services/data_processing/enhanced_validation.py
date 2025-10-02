"""
Enhanced Data Validation Service for StickForStats platform.

This module provides advanced data validation functionality for statistical analysis,
including domain-specific validation for different types of analysis.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Callable, Union
import logging
from dataclasses import dataclass
from io import BytesIO
import json
import re
from pandas.api.types import is_numeric_dtype, is_datetime64_dtype, is_categorical_dtype
import datetime

logger = logging.getLogger(__name__)


@dataclass
class ValidationMessage:
    """Class for storing validation messages with severity levels."""
    message: str
    level: str  # 'error', 'warning', 'info'
    context: Optional[Dict[str, Any]] = None


@dataclass
class ValidationResult:
    """Class for storing validation results."""
    is_valid: bool
    messages: List[ValidationMessage]
    data: Optional[pd.DataFrame] = None
    metadata: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None


class EnhancedDataValidator:
    """
    Enhanced data validator with support for various statistical analyses.
    
    This validator can validate data for different types of statistical tests
    and analyses, and can provide tailored validation messages and preprocessing
    recommendations.
    """
    
    def __init__(self):
        """Initialize the validator with empty rules."""
        self.rules = []
        self.preprocessing_recommendations = []
    
    def add_rule(self, check_func: Callable[[pd.DataFrame], bool], 
                message: str, level: str = 'error', 
                context: Optional[Dict[str, Any]] = None):
        """
        Add a validation rule.
        
        Args:
            check_func: A function that takes a DataFrame and returns True if valid, False if invalid
            message: The message to display when the check fails
            level: The severity level ('error', 'warning', 'info')
            context: Additional context for the message
        """
        self.rules.append({
            'check': check_func,
            'message': message,
            'level': level,
            'context': context or {}
        })
        return self
    
    def validate(self, data: pd.DataFrame) -> ValidationResult:
        """
        Validate the dataframe against all rules.
        
        Args:
            data: The DataFrame to validate
            
        Returns:
            A ValidationResult object containing validation status and messages
        """
        messages = []
        is_valid = True
        
        # Run each validation rule
        for rule in self.rules:
            try:
                check_result = rule['check'](data)
                if not check_result:
                    messages.append(ValidationMessage(
                        message=rule['message'],
                        level=rule['level'],
                        context=rule['context']
                    ))
                    
                    # Only set is_valid to False for errors, not warnings
                    if rule['level'] == 'error':
                        is_valid = False
            except Exception as e:
                logger.error(f"Error in validation rule: {str(e)}")
                messages.append(ValidationMessage(
                    message=f"Validation error: {str(e)}",
                    level='error',
                    context={'exception': str(e)}
                ))
                is_valid = False
        
        # Compute metadata about the dataframe
        metadata = {
            'shape': data.shape,
            'columns': list(data.columns),
            'dtypes': {col: str(dtype) for col, dtype in data.dtypes.items()},
            'missing_values': {col: int(data[col].isna().sum()) for col in data.columns},
            'column_types': self._infer_column_types(data)
        }
        
        return ValidationResult(
            is_valid=is_valid,
            messages=messages,
            data=data,
            metadata=metadata,
            recommendations=self.preprocessing_recommendations.copy()
        )
    
    def _infer_column_types(self, data: pd.DataFrame) -> Dict[str, str]:
        """
        Infer the statistical type of each column in the dataframe.
        
        Args:
            data: The DataFrame to analyze
            
        Returns:
            Dictionary mapping column names to types ('numeric', 'categorical', 'datetime', etc.)
        """
        column_types = {}
        
        for col in data.columns:
            if is_numeric_dtype(data[col]):
                if len(data[col].unique()) <= 10:
                    column_types[col] = 'categorical_numeric'
                else:
                    column_types[col] = 'continuous'
            elif is_datetime64_dtype(data[col]):
                column_types[col] = 'datetime'
            elif is_categorical_dtype(data[col]):
                column_types[col] = 'categorical'
            else:
                # Try to infer from string data
                unique_vals = data[col].dropna().unique()
                if len(unique_vals) <= 20:  # Arbitrary threshold for categorical
                    column_types[col] = 'categorical'
                else:
                    column_types[col] = 'text'
        
        return column_types
    
    def add_common_rules(self):
        """Add common validation rules that apply to most datasets."""
        # Check if data exists and is not empty
        self.add_rule(
            lambda df: df is not None and not df.empty,
            "Dataset is empty",
            "error"
        )
        
        # Check for reasonable dimensions
        self.add_rule(
            lambda df: df.shape[0] > 1,
            "Dataset must have at least 2 rows",
            "error"
        )
        
        # Check for columns
        self.add_rule(
            lambda df: df.shape[1] > 0,
            "Dataset must have at least 1 column",
            "error"
        )
        
        # Check for all NaN columns
        self.add_rule(
            lambda df: not any(df[col].isna().all() for col in df.columns),
            "Some columns contain only missing values",
            "warning",
            {"recommendation": "Consider removing columns with all missing values"}
        )
        
        # Check for duplicate columns
        self.add_rule(
            lambda df: df.columns.is_unique,
            "Dataset contains duplicate column names",
            "warning",
            {"recommendation": "Consider renaming duplicate columns"}
        )
        
        # Check for index uniqueness
        self.add_rule(
            lambda df: df.index.is_unique,
            "Dataset contains duplicate row indices",
            "warning",
            {"recommendation": "Consider resetting the index"}
        )
        
        return self
    
    def add_anova_rules(self):
        """Add validation rules specific to ANOVA analysis."""
        # Check for at least one numeric column
        self.add_rule(
            lambda df: any(is_numeric_dtype(df[col]) for col in df.columns),
            "ANOVA requires at least one numeric column for the dependent variable",
            "error"
        )
        
        # Check for at least one categorical column
        self.add_rule(
            lambda df: any(not is_numeric_dtype(df[col]) or 
                           (is_numeric_dtype(df[col]) and len(df[col].unique()) <= 10) 
                           for col in df.columns),
            "ANOVA requires at least one categorical column for the grouping variable",
            "error"
        )
        
        # For each potential numeric column, check if it meets assumptions
        def check_anova_assumptions(df):
            numeric_cols = [col for col in df.columns if is_numeric_dtype(df[col])]
            categorical_cols = [col for col in df.columns if not is_numeric_dtype(df[col]) or 
                               (is_numeric_dtype(df[col]) and len(df[col].unique()) <= 10)]
            
            if not numeric_cols or not categorical_cols:
                return True  # This will be caught by other rules
            
            recommendations = []
            for num_col in numeric_cols:
                # Check for outliers using IQR method
                q1 = df[num_col].quantile(0.25)
                q3 = df[num_col].quantile(0.75)
                iqr = q3 - q1
                outliers = df[(df[num_col] < q1 - 1.5 * iqr) | (df[num_col] > q3 + 1.5 * iqr)]
                if len(outliers) / len(df) > 0.05:  # More than 5% outliers
                    recommendations.append(f"Column '{num_col}' contains outliers that may affect ANOVA results.")
            
            if recommendations:
                self.preprocessing_recommendations.extend(recommendations)
                return False
            return True
        
        self.add_rule(
            check_anova_assumptions,
            "Some numeric columns might violate ANOVA assumptions",
            "warning"
        )
        
        return self
    
    def add_regression_rules(self):
        """Add validation rules specific to regression analysis."""
        # Check for at least one numeric target column
        self.add_rule(
            lambda df: any(is_numeric_dtype(df[col]) for col in df.columns),
            "Regression requires at least one numeric column for the dependent variable",
            "error"
        )
        
        # Check for sufficient data points
        self.add_rule(
            lambda df: df.shape[0] >= 20,  # Arbitrary threshold
            "Regression typically requires more data points for reliable results",
            "warning"
        )
        
        # Check for potential multicollinearity
        def check_multicollinearity(df):
            numeric_cols = [col for col in df.columns if is_numeric_dtype(df[col])]
            if len(numeric_cols) < 2:
                return True
            
            try:
                corr_matrix = df[numeric_cols].corr()
                high_corr_pairs = []
                for i in range(len(numeric_cols)):
                    for j in range(i+1, len(numeric_cols)):
                        if abs(corr_matrix.iloc[i, j]) > 0.8:  # Arbitrary threshold
                            high_corr_pairs.append((numeric_cols[i], numeric_cols[j]))
                
                if high_corr_pairs:
                    self.preprocessing_recommendations.append(
                        f"Detected potential multicollinearity between columns: {high_corr_pairs}"
                    )
                    return False
            except Exception:
                pass  # Correlation calculation may fail for various reasons
            
            return True
        
        self.add_rule(
            check_multicollinearity,
            "Potential multicollinearity detected among numeric columns",
            "warning"
        )
        
        return self
    
    def add_time_series_rules(self):
        """Add validation rules specific to time series analysis."""
        # Check for datetime column
        def has_datetime_column(df):
            for col in df.columns:
                try:
                    if is_datetime64_dtype(df[col]):
                        return True
                    # Try to convert the column to datetime
                    pd.to_datetime(df[col], errors='raise')
                    return True
                except (ValueError, TypeError):
                    continue
            return False
        
        self.add_rule(
            has_datetime_column,
            "Time series analysis requires a datetime column",
            "error"
        )
        
        # Check for sufficient data points
        self.add_rule(
            lambda df: df.shape[0] >= 30,  # Arbitrary threshold for time series
            "Time series analysis typically requires more data points for reliable results",
            "warning"
        )
        
        # Check for regular time intervals
        def check_regular_intervals(df):
            datetime_cols = []
            for col in df.columns:
                try:
                    if is_datetime64_dtype(df[col]):
                        datetime_cols.append(col)
                    else:
                        datetime_col = pd.to_datetime(df[col], errors='ignore')
                        if not isinstance(datetime_col, pd.Series) or datetime_col.equals(df[col]):
                            continue
                        datetime_cols.append(col)
                except:
                    continue
            
            if not datetime_cols:
                return True  # This will be caught by other rules
            
            for col in datetime_cols:
                try:
                    # Convert to datetime if needed
                    if not is_datetime64_dtype(df[col]):
                        datetime_series = pd.to_datetime(df[col])
                    else:
                        datetime_series = df[col]
                    
                    # Sort and calculate differences
                    sorted_dates = datetime_series.sort_values()
                    time_diffs = sorted_dates.diff().dropna()
                    
                    # Check if all differences are the same
                    if time_diffs.nunique() > 1:
                        self.preprocessing_recommendations.append(
                            f"Column '{col}' has irregular time intervals. Consider resampling to regular intervals."
                        )
                        return False
                except:
                    continue
            
            return True
        
        self.add_rule(
            check_regular_intervals,
            "Some datetime columns have irregular time intervals",
            "warning"
        )
        
        return self
    
    def add_clustering_rules(self):
        """Add validation rules specific to clustering analysis."""
        # Check for numeric columns
        self.add_rule(
            lambda df: any(is_numeric_dtype(df[col]) for col in df.columns),
            "Clustering requires numeric columns",
            "error"
        )
        
        # Check for large range differences
        def check_column_ranges(df):
            numeric_cols = [col for col in df.columns if is_numeric_dtype(df[col])]
            if not numeric_cols:
                return True
            
            ranges = []
            for col in numeric_cols:
                col_range = df[col].max() - df[col].min()
                ranges.append((col, col_range))
            
            ranges.sort(key=lambda x: x[1], reverse=True)
            if ranges[0][1] / (ranges[-1][1] + 1e-10) > 1000:  # Arbitrary threshold
                self.preprocessing_recommendations.append(
                    f"Column '{ranges[0][0]}' has a much larger range than column '{ranges[-1][0]}'. Consider scaling your data."
                )
                return False
            
            return True
        
        self.add_rule(
            check_column_ranges,
            "Some numeric columns have very different ranges",
            "warning"
        )
        
        return self
    
    def add_pca_rules(self):
        """Add validation rules specific to PCA analysis."""
        # Check for numeric columns
        self.add_rule(
            lambda df: sum(is_numeric_dtype(df[col]) for col in df.columns) >= 3,
            "PCA typically requires at least 3 numeric columns",
            "error"
        )
        
        # Check for sufficient variability
        def check_variability(df):
            numeric_cols = [col for col in df.columns if is_numeric_dtype(df[col])]
            low_var_cols = []
            
            for col in numeric_cols:
                if df[col].std() < 1e-5:  # Arbitrary threshold
                    low_var_cols.append(col)
            
            if low_var_cols:
                self.preprocessing_recommendations.append(
                    f"Columns {low_var_cols} have very low variance and may not be useful for PCA."
                )
                return False
            
            return True
        
        self.add_rule(
            check_variability,
            "Some numeric columns have very low variance",
            "warning"
        )
        
        return self


def validate_file_upload(file_data: BytesIO, file_name: str) -> ValidationResult:
    """
    Validate an uploaded file and parse it into a DataFrame.
    
    Args:
        file_data: The file contents as BytesIO
        file_name: The name of the file
        
    Returns:
        ValidationResult object with validation status and the parsed DataFrame if valid
    """
    try:
        # Check file type
        file_ext = file_name.split('.')[-1].lower()
        data = None
        messages = []
        
        # Parse based on file type
        if file_ext == 'csv':
            data = pd.read_csv(file_data)
        elif file_ext == 'xlsx' or file_ext == 'xls':
            data = pd.read_excel(file_data)
        elif file_ext == 'json':
            data = pd.read_json(file_data)
        elif file_ext == 'tsv' or file_ext == 'txt':
            data = pd.read_csv(file_data, sep='\t')
        else:
            return ValidationResult(
                is_valid=False,
                messages=[ValidationMessage(
                    message=f"Unsupported file format: {file_ext}",
                    level="error"
                )],
                data=None
            )
        
        # Check if data was loaded successfully
        if data is None or data.empty:
            return ValidationResult(
                is_valid=False,
                messages=[ValidationMessage(
                    message="Failed to load data or data is empty",
                    level="error"
                )],
                data=None
            )
        
        # Validate loaded data
        validator = EnhancedDataValidator()
        validator.add_common_rules()
        
        return validator.validate(data)
        
    except Exception as e:
        return ValidationResult(
            is_valid=False,
            messages=[ValidationMessage(
                message=f"Error processing file: {str(e)}",
                level="error",
                context={"exception": str(e)}
            )],
            data=None
        )


def validate_for_analysis_type(data: pd.DataFrame, analysis_type: str) -> ValidationResult:
    """
    Validate data for a specific type of statistical analysis.
    
    Args:
        data: The DataFrame to validate
        analysis_type: The type of analysis to validate for
        
    Returns:
        ValidationResult object with validation status and recommendations
    """
    validator = EnhancedDataValidator()
    validator.add_common_rules()
    
    # Add specific rules based on analysis type
    if analysis_type.lower() in ['anova', 'one_way_anova', 'two_way_anova']:
        validator.add_anova_rules()
    elif analysis_type.lower() in ['regression', 'linear_regression', 'logistic_regression']:
        validator.add_regression_rules()
    elif analysis_type.lower() in ['time_series', 'forecasting']:
        validator.add_time_series_rules()
    elif analysis_type.lower() in ['clustering', 'cluster_analysis']:
        validator.add_clustering_rules()
    elif analysis_type.lower() in ['pca', 'principal_component_analysis']:
        validator.add_pca_rules()
    
    return validator.validate(data)