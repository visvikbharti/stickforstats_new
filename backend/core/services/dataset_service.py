"""
Dataset Service Module for StickForStats.

This module provides services for dataset handling, validation, and processing.
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import json
import logging
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import transaction
from dataclasses import dataclass

# from core.models import Dataset, User  # These models don't exist yet
from typing import Any as Dataset  # Placeholder type
from typing import Any as User  # Placeholder type

# Get logger
logger = logging.getLogger(__name__)


@dataclass
class DatasetValidationResult:
    """Data class for dataset validation results."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    data_info: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class DatasetService:
    """Service for dataset handling and validation."""
    
    def __init__(self):
        """Initialize the dataset service."""
        pass
    
    def save_uploaded_dataset(
        self,
        user: User,
        file_obj,
        name: str,
        description: str = "",
        has_header: bool = True,
        delimiter: str = ","
    ) -> Tuple[Dataset, DatasetValidationResult]:
        """
        Save an uploaded dataset file and perform validation.
        
        Args:
            user: The user uploading the dataset
            file_obj: The uploaded file object
            name: Name for the dataset
            description: Description of the dataset
            has_header: Whether the file has a header row
            delimiter: Delimiter for CSV files
        
        Returns:
            Tuple of (Dataset, DatasetValidationResult)
        """
        try:
            # Determine file type from extension
            file_name = file_obj.name
            file_ext = os.path.splitext(file_name)[1].lower()
            
            if file_ext == '.csv':
                file_type = 'csv'
            elif file_ext in ['.xlsx', '.xls']:
                file_type = 'excel'
            elif file_ext == '.json':
                file_type = 'json'
            else:
                return None, DatasetValidationResult(
                    is_valid=False,
                    errors=[f"Unsupported file type: {file_ext}. Supported types are: .csv, .xlsx, .xls, .json"],
                    warnings=[]
                )
            
            # Check file size
            if file_obj.size > user.max_dataset_size:
                return None, DatasetValidationResult(
                    is_valid=False,
                    errors=[f"File size ({file_obj.size} bytes) exceeds your subscription limit ({user.max_dataset_size} bytes)"],
                    warnings=[]
                )
            
            # Create dataset instance
            with transaction.atomic():
                dataset = Dataset.objects.create(
                    user=user,
                    name=name,
                    description=description,
                    file=file_obj,
                    file_type=file_type,
                    has_header=has_header,
                    delimiter=delimiter,
                    size_bytes=file_obj.size
                )
                
                # Validate and process the dataset
                validation_result = self.validate_dataset(dataset)
                
                if validation_result.is_valid and validation_result.data_info:
                    # Update dataset with metadata
                    dataset.rows = validation_result.data_info.get('rows', 0)
                    dataset.columns = validation_result.data_info.get('columns', 0)
                    dataset.column_types = validation_result.data_info.get('column_types', {})
                    dataset.metadata = validation_result.metadata or {}
                    dataset.save()
                
                return dataset, validation_result
                
        except Exception as e:
            logger.error(f"Error saving dataset: {str(e)}")
            return None, DatasetValidationResult(
                is_valid=False,
                errors=[f"Error processing dataset: {str(e)}"],
                warnings=[]
            )
    
    def validate_dataset(self, dataset: Dataset) -> DatasetValidationResult:
        """
        Validate a dataset file and extract metadata.
        
        Args:
            dataset: The dataset to validate
        
        Returns:
            DatasetValidationResult with validation status and metadata
        """
        errors = []
        warnings = []
        
        try:
            # Read dataset file based on type
            df = self._read_dataset_file(dataset)
            
            if df is None:
                return DatasetValidationResult(
                    is_valid=False,
                    errors=["Unable to read file. Please check the file format."],
                    warnings=[]
                )
            
            # Basic validation
            if df.empty:
                return DatasetValidationResult(
                    is_valid=False,
                    errors=["Dataset is empty."],
                    warnings=[]
                )
            
            # Check for minimum required rows
            if len(df) < 2:
                errors.append("Dataset must contain at least 2 rows for analysis.")
            
            # Check for missing values
            missing_values = df.isnull().sum().sum()
            if missing_values > 0:
                missing_percent = (missing_values / (df.shape[0] * df.shape[1])) * 100
                if missing_percent > 50:
                    errors.append(f"Dataset contains {missing_percent:.2f}% missing values, which is too high.")
                elif missing_percent > 10:
                    warnings.append(f"Dataset contains {missing_percent:.2f}% missing values.")
            
            # Check column types
            column_types = {}
            numeric_columns = []
            categorical_columns = []
            datetime_columns = []
            object_columns = []
            
            for col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]):
                    dtype = 'numeric'
                    numeric_columns.append(col)
                elif pd.api.types.is_datetime64_dtype(df[col]):
                    dtype = 'datetime'
                    datetime_columns.append(col)
                elif pd.api.types.is_categorical_dtype(df[col]):
                    dtype = 'categorical'
                    categorical_columns.append(col)
                    # Store unique values for categorical columns
                    unique_vals = df[col].unique().tolist()
                    if len(unique_vals) <= 20:  # Only store if not too many
                        column_types[col] = {
                            'type': dtype,
                            'unique_values': unique_vals
                        }
                        continue
                else:
                    # Check if object can be converted to datetime
                    try:
                        pd.to_datetime(df[col], errors='raise')
                        dtype = 'datetime'
                        datetime_columns.append(col)
                    except (ValueError, TypeError):
                        # Check if column has few unique values (likely categorical)
                        unique_vals = df[col].unique()
                        if len(unique_vals) <= min(10, len(df) // 5):
                            dtype = 'categorical'
                            categorical_columns.append(col)
                            # Store unique values for categorical columns
                            if len(unique_vals) <= 20:  # Only store if not too many
                                column_types[col] = {
                                    'type': dtype,
                                    'unique_values': [str(v) for v in unique_vals if pd.notna(v)]
                                }
                                continue
                        else:
                            dtype = 'text'
                            object_columns.append(col)
                
                column_types[col] = {'type': dtype}
            
            # Check if there are numeric columns for statistical analysis
            if len(numeric_columns) == 0:
                warnings.append("No numeric columns found. Many statistical analyses require numeric data.")
            
            # Generate dataset info and metadata
            data_info = {
                'rows': len(df),
                'columns': len(df.columns),
                'column_types': column_types,
            }
            
            # Generate statistical summary
            metadata = self._generate_metadata(df, numeric_columns, categorical_columns)
            
            # Determine overall validity
            is_valid = len(errors) == 0
            
            return DatasetValidationResult(
                is_valid=is_valid,
                errors=errors,
                warnings=warnings,
                data_info=data_info,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Error validating dataset: {str(e)}")
            return DatasetValidationResult(
                is_valid=False,
                errors=[f"Error validating dataset: {str(e)}"],
                warnings=[]
            )
    
    def _read_dataset_file(self, dataset: Dataset) -> Optional[pd.DataFrame]:
        """
        Read a dataset file into a pandas DataFrame.
        
        Args:
            dataset: The dataset to read
        
        Returns:
            DataFrame or None if file cannot be read
        """
        try:
            file_path = dataset.file.path
            
            if dataset.file_type == 'csv':
                return pd.read_csv(file_path, header=0 if dataset.has_header else None, 
                                   delimiter=dataset.delimiter)
            elif dataset.file_type == 'excel':
                return pd.read_excel(file_path, header=0 if dataset.has_header else None)
            elif dataset.file_type == 'json':
                return pd.read_json(file_path)
            else:
                logger.error(f"Unsupported file type: {dataset.file_type}")
                return None
                
        except Exception as e:
            logger.error(f"Error reading dataset file: {str(e)}")
            return None
    
    def _generate_metadata(
        self, 
        df: pd.DataFrame, 
        numeric_columns: List[str],
        categorical_columns: List[str]
    ) -> Dict[str, Any]:
        """
        Generate metadata for a dataset.
        
        Args:
            df: The dataset DataFrame
            numeric_columns: List of numeric column names
            categorical_columns: List of categorical column names
        
        Returns:
            Dictionary of metadata
        """
        metadata = {}
        
        # Generate summary statistics for numeric columns
        if numeric_columns:
            numeric_stats = {}
            for col in numeric_columns:
                try:
                    column_data = df[col].dropna()
                    numeric_stats[col] = {
                        'mean': float(column_data.mean()),
                        'median': float(column_data.median()),
                        'std_dev': float(column_data.std()),
                        'min': float(column_data.min()),
                        'max': float(column_data.max()),
                        'q1': float(column_data.quantile(0.25)),
                        'q3': float(column_data.quantile(0.75)),
                        'missing': int(df[col].isnull().sum())
                    }
                except Exception as e:
                    logger.warning(f"Error calculating stats for column {col}: {str(e)}")
                    continue
            
            metadata['numeric_stats'] = numeric_stats
        
        # Generate frequency counts for categorical columns
        if categorical_columns:
            categorical_stats = {}
            for col in categorical_columns:
                try:
                    value_counts = df[col].value_counts().head(20)  # Limit to top 20 categories
                    categorical_stats[col] = {
                        'top_values': {str(k): int(v) for k, v in value_counts.items()},
                        'total_unique': int(df[col].nunique()),
                        'missing': int(df[col].isnull().sum())
                    }
                except Exception as e:
                    logger.warning(f"Error calculating stats for column {col}: {str(e)}")
                    continue
                    
            metadata['categorical_stats'] = categorical_stats
        
        # Add overall dataset properties
        metadata['properties'] = {
            'memory_usage': int(df.memory_usage(deep=True).sum()),
            'numeric_columns': numeric_columns,
            'categorical_columns': categorical_columns,
            'missing_values_total': int(df.isnull().sum().sum()),
            'missing_values_percent': float((df.isnull().sum().sum() / (df.shape[0] * df.shape[1])) * 100)
        }
        
        return metadata
    
    def get_dataset_sample(self, dataset: Dataset, rows: int = 10) -> Optional[Dict[str, Any]]:
        """
        Get a sample of rows from a dataset.
        
        Args:
            dataset: The dataset to sample
            rows: Number of rows to sample
        
        Returns:
            Dictionary with sample data or None if error
        """
        try:
            df = self._read_dataset_file(dataset)
            if df is None:
                return None
            
            sample = df.head(rows)
            
            # Convert to JSON-compatible format
            columns = sample.columns.tolist()
            data = sample.values.tolist()
            
            # Convert numpy types to Python types
            data = [[self._convert_numpy_type(val) for val in row] for row in data]
            
            return {
                'columns': columns,
                'data': data,
                'total_rows': len(df)
            }
            
        except Exception as e:
            logger.error(f"Error getting dataset sample: {str(e)}")
            return None
    
    def _convert_numpy_type(self, value):
        """Convert numpy types to Python native types for JSON serialization."""
        if isinstance(value, (np.integer, np.int64)):
            return int(value)
        elif isinstance(value, (np.floating, np.float64)):
            return float(value)
        elif isinstance(value, np.bool_):
            return bool(value)
        elif pd.isna(value):
            return None
        else:
            return value