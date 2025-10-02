import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Callable
import logging
from dataclasses import dataclass
from io import BytesIO
import json

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

class DataValidator:
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
            'missing_values': data.isna().sum().to_dict(),
            'unique_values': {col: data[col].nunique() for col in data.columns if data[col].dtype != 'object' or data[col].nunique() < 100}
        }
        
        return ValidationResult(
            is_valid=is_valid,
            messages=messages,
            data=data,
            metadata=metadata
        )
    
    def validate_file(self, file_obj: BytesIO, file_type: str = None) -> ValidationResult:
        """
        Validate a file by first loading it into a DataFrame.
        
        Args:
            file_obj: A file-like object
            file_type: The type of file ('csv', 'excel', etc.)
            
        Returns:
            A ValidationResult object
        """
        try:
            # Determine file type if not provided
            if file_type is None:
                filename = getattr(file_obj, 'name', '')
                if filename.endswith('.csv'):
                    file_type = 'csv'
                elif filename.endswith(('.xls', '.xlsx', '.xlsm')):
                    file_type = 'excel'
                else:
                    return ValidationResult(
                        is_valid=False,
                        messages=[ValidationMessage(
                            message="Unable to determine file type. Please specify.",
                            level='error'
                        )],
                        data=None
                    )
            
            # Load the data based on file type
            if file_type == 'csv':
                data = pd.read_csv(file_obj)
            elif file_type == 'excel':
                data = pd.read_excel(file_obj)
            else:
                return ValidationResult(
                    is_valid=False,
                    messages=[ValidationMessage(
                        message=f"Unsupported file type: {file_type}",
                        level='error'
                    )],
                    data=None
                )
            
            # Validate the loaded data
            return self.validate(data)
            
        except Exception as e:
            logger.error(f"Error loading file: {str(e)}")
            return ValidationResult(
                is_valid=False,
                messages=[ValidationMessage(
                    message=f"Error loading file: {str(e)}",
                    level='error',
                    context={'exception': str(e)}
                )],
                data=None
            )
    
    def add_standard_rules(self):
        """Add standard validation rules that apply to most datasets."""
        # Check for empty dataframe
        self.add_rule(
            lambda df: len(df) > 0,
            "Dataset is empty",
            'error'
        )
        
        # Check for too many missing values
        self.add_rule(
            lambda df: df.isna().mean().max() < 0.5,
            "Some columns have more than 50% missing values",
            'warning',
            {'columns': lambda df: df.columns[df.isna().mean() > 0.5].tolist()}
        )
        
        # Check for columns with a single value (no variance)
        self.add_rule(
            lambda df: all(df[col].nunique() > 1 for col in df.columns if df[col].dtype != 'object'),
            "Some numeric columns have no variance (single value)",
            'warning',
            {'columns': lambda df: [col for col in df.columns if df[col].dtype != 'object' and df[col].nunique() == 1]}
        )
        
        # Check for duplicate rows
        self.add_rule(
            lambda df: df.duplicated().sum() == 0,
            "Dataset contains duplicate rows",
            'warning',
            {'duplicate_count': lambda df: df.duplicated().sum()}
        )
        
        return self
    
    def add_correlation_rules(self):
        """Add rules specific to correlation analyses."""
        # Check for at least two numeric columns
        self.add_rule(
            lambda df: sum(pd.api.types.is_numeric_dtype(df[col]) for col in df.columns) >= 2,
            "Correlation analysis requires at least two numeric columns",
            'error',
            {'numeric_columns': lambda df: [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]}
        )
        
        # Check for high multicollinearity
        def check_multicollinearity(df):
            numeric_cols = [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]
            if len(numeric_cols) < 2:
                return True  # Not enough columns for multicollinearity
            
            corr_matrix = df[numeric_cols].corr().abs()
            upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            return upper_tri.max().max() < 0.95  # No correlation above 0.95
        
        self.add_rule(
            check_multicollinearity,
            "Dataset contains highly correlated variables (r > 0.95)",
            'warning',
            {'corr_matrix': lambda df: df.corr().to_dict()}
        )
        
        return self
    
    def add_t_test_rules(self, paired: bool = False, equal_variance: bool = True):
        """
        Add rules for t-test validation.
        
        Args:
            paired: Whether this is for a paired t-test
            equal_variance: Whether to check for equal variances (for independent t-test)
        """
        # For paired t-test, we need exactly two columns with equal lengths
        if paired:
            self.add_rule(
                lambda df: len(df.columns) >= 2,
                "Paired t-test requires at least two columns",
                'error'
            )
            
            # Placeholder for specific paired t-test validation
            # In real code, this would check paired structure
        else:
            # For independent t-test
            self.add_rule(
                lambda df: any('group' in col.lower() for col in df.columns) or df.select_dtypes(include=['object', 'category']).shape[1] > 0,
                "Independent t-test requires a grouping variable",
                'warning'
            )
            
            # If checking equal variance
            if equal_variance:
                # This would actually check variances across groups
                pass
        
        return self
    
    def add_anova_rules(self):
        """Add rules for ANOVA validation."""
        # Need at least one categorical and one numeric column
        self.add_rule(
            lambda df: any(pd.api.types.is_numeric_dtype(df[col]) for col in df.columns) and 
                      any(not pd.api.types.is_numeric_dtype(df[col]) for col in df.columns),
            "ANOVA requires at least one numeric and one categorical column",
            'error'
        )
        
        # Check group sizes (ANOVA assumes balanced design)
        def check_group_sizes(df):
            # Simplified check - in real code, would actually detect the grouping variables
            # and analyze their distribution
            return True
        
        self.add_rule(
            check_group_sizes,
            "ANOVA performs best with balanced group sizes",
            'warning'
        )
        
        return self
    
    def add_regression_rules(self):
        """Add rules for regression analysis validation."""
        # Need at least one predictor and one outcome
        self.add_rule(
            lambda df: sum(pd.api.types.is_numeric_dtype(df[col]) for col in df.columns) >= 2,
            "Regression requires at least two numeric columns (predictor and outcome)",
            'error'
        )
        
        # Check for collinearity among predictors
        # (Simplified - real implementation would be more comprehensive)
        def check_predictor_collinearity(df):
            numeric_cols = [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]
            if len(numeric_cols) < 2:
                return True
            
            corr_matrix = df[numeric_cols].corr().abs()
            upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            return upper_tri.max().max() < 0.8  # No correlation above 0.8
        
        self.add_rule(
            check_predictor_collinearity,
            "Dataset contains highly correlated predictors, which may cause multicollinearity issues",
            'warning'
        )
        
        return self
    
    def add_normality_rules(self, columns: Optional[List[str]] = None):
        """
        Add rules to check normality assumptions.
        
        Args:
            columns: Specific columns to check, or None for all numeric columns
        """
        # Placeholder for normality checks - in a real implementation, 
        # this would use statistical tests like Shapiro-Wilk
        def check_normality(df):
            # In real code, perform actual normality tests
            return True
        
        self.add_rule(
            check_normality,
            "Some columns may not be normally distributed",
            'warning'
        )
        
        return self
    
    def add_preprocessing_recommendation(self, condition: Callable[[pd.DataFrame], bool],
                                      recommendation: str, 
                                      context: Optional[Dict[str, Any]] = None):
        """
        Add a data preprocessing recommendation based on a condition.
        
        Args:
            condition: Function that takes a dataframe and returns True if the recommendation applies
            recommendation: The text recommendation
            context: Additional context for the recommendation
        """
        self.preprocessing_recommendations.append({
            'condition': condition,
            'recommendation': recommendation,
            'context': context or {}
        })
        return self
    
    def get_preprocessing_recommendations(self, data: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Get preprocessing recommendations that apply to the data.
        
        Args:
            data: The DataFrame to check
            
        Returns:
            List of applicable preprocessing recommendations
        """
        recommendations = []
        
        for rec in self.preprocessing_recommendations:
            try:
                if rec['condition'](data):
                    # Evaluate any callable context values
                    context = {}
                    for k, v in rec['context'].items():
                        if callable(v):
                            context[k] = v(data)
                        else:
                            context[k] = v
                    
                    recommendations.append({
                        'recommendation': rec['recommendation'],
                        'context': context
                    })
            except Exception as e:
                logger.error(f"Error evaluating preprocessing recommendation: {str(e)}")
        
        return recommendations
    
    def add_standard_preprocessing_recommendations(self):
        """Add standard preprocessing recommendations."""
        # Missing value handling
        self.add_preprocessing_recommendation(
            lambda df: df.isna().sum().sum() > 0,
            "Handle missing values using imputation or removal",
            {'missing_counts': lambda df: df.isna().sum().to_dict()}
        )
        
        # Outlier detection
        self.add_preprocessing_recommendation(
            lambda df: any(pd.api.types.is_numeric_dtype(df[col]) for col in df.columns),
            "Check for outliers in numeric columns using boxplots or z-scores",
            {'numeric_columns': lambda df: [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]}
        )
        
        # Categorical encoding
        self.add_preprocessing_recommendation(
            lambda df: any(pd.api.types.is_categorical_dtype(df[col]) or pd.api.types.is_object_dtype(df[col]) 
                        for col in df.columns),
            "Encode categorical variables using one-hot or label encoding",
            {'categorical_columns': lambda df: [col for col in df.columns 
                                              if pd.api.types.is_categorical_dtype(df[col]) 
                                              or pd.api.types.is_object_dtype(df[col])]}
        )
        
        # Scaling recommendation
        self.add_preprocessing_recommendation(
            lambda df: any(pd.api.types.is_numeric_dtype(df[col]) for col in df.columns),
            "Consider scaling numeric features for algorithms sensitive to feature magnitudes",
            {'numeric_columns': lambda df: [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]}
        )
        
        return self

    @staticmethod
    def create_for_analysis_type(analysis_type: str) -> 'DataValidator':
        """
        Factory method to create a validator with rules for a specific analysis type.
        
        Args:
            analysis_type: The type of analysis ('correlation', 't_test', 'anova', etc.)
            
        Returns:
            A configured DataValidator
        """
        validator = DataValidator()
        validator.add_standard_rules()
        validator.add_standard_preprocessing_recommendations()
        
        if analysis_type == 'correlation':
            validator.add_correlation_rules()
        elif analysis_type == 't_test_independent':
            validator.add_t_test_rules(paired=False)
        elif analysis_type == 't_test_paired':
            validator.add_t_test_rules(paired=True)
        elif analysis_type == 'anova':
            validator.add_anova_rules()
        elif analysis_type == 'regression':
            validator.add_regression_rules()
        elif analysis_type == 'normality':
            validator.add_normality_rules()
        
        return validator