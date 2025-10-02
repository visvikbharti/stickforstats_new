"""
Workflow Context Manager
========================

This module manages the execution context and state for statistical analysis workflows,
ensuring data persistence, recovery, and proper state transitions.

Author: Vishal Bharti
Date: 2025-08-26
Version: 1.0.0
"""

import json
import pickle
import hashlib
from typing import Dict, Any, List, Optional, Union, Tuple
from datetime import datetime
import pandas as pd
import numpy as np
from pathlib import Path
import uuid

from django.core.cache import cache
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

import logging

logger = logging.getLogger(__name__)


class ContextValidationError(Exception):
    """Raised when context validation fails"""
    pass


class WorkflowContext:
    """
    Manages workflow execution context and state.
    
    This class handles:
    - Data management throughout workflow
    - Parameter tracking
    - Results aggregation
    - State persistence and recovery
    - Context validation
    """
    
    def __init__(self, workflow_id: str = None, user_id: str = None):
        """
        Initialize workflow context.
        
        Args:
            workflow_id: Unique workflow identifier
            user_id: User identifier for context isolation
        """
        self.workflow_id = workflow_id or str(uuid.uuid4())
        self.user_id = user_id
        self.created_at = datetime.now()
        self.last_modified = datetime.now()
        
        # Core context data
        self.data = None  # Primary dataset
        self.secondary_data = {}  # Additional datasets
        self.analysis_type = None
        self.results = {}  # Analysis results
        self.parameters = {}  # Analysis parameters
        self.metadata = {}  # Additional metadata
        
        # State tracking
        self.history = []  # Action history
        self.checkpoints = {}  # Named checkpoints
        self.current_checkpoint = None
        self.validation_errors = []
        
        # Data characteristics (populated by profiling)
        self.data_profile = {}
        self.data_quality_metrics = {}
        
        logger.info(f"WorkflowContext initialized: {self.workflow_id}")
    
    def set_data(self, data: Union[pd.DataFrame, np.ndarray, dict], 
                 data_name: str = "primary") -> None:
        """
        Set workflow data with validation.
        
        Args:
            data: Data to set (DataFrame, array, or dict)
            data_name: Name identifier for the data
        """
        # Validate data
        if data is None:
            raise ContextValidationError("Data cannot be None")
        
        # Convert to DataFrame if necessary
        if isinstance(data, np.ndarray):
            data = pd.DataFrame(data)
        elif isinstance(data, dict):
            data = pd.DataFrame(data)
        
        # Store data
        if data_name == "primary":
            self.data = data
            self._profile_data(data)
        else:
            self.secondary_data[data_name] = data
        
        # Update history
        self._add_to_history("data_set", {
            "data_name": data_name,
            "shape": data.shape if hasattr(data, 'shape') else None,
            "type": type(data).__name__
        })
        
        self.last_modified = datetime.now()
        logger.info(f"Data set: {data_name} with shape {data.shape if hasattr(data, 'shape') else 'N/A'}")
    
    def get_data(self, data_name: str = "primary") -> Optional[pd.DataFrame]:
        """
        Retrieve data from context.
        
        Args:
            data_name: Name of data to retrieve
            
        Returns:
            DataFrame or None if not found
        """
        if data_name == "primary":
            return self.data
        return self.secondary_data.get(data_name)
    
    def set_parameter(self, key: str, value: Any, category: str = "general") -> None:
        """
        Set an analysis parameter.
        
        Args:
            key: Parameter key
            value: Parameter value
            category: Parameter category for organization
        """
        if category not in self.parameters:
            self.parameters[category] = {}
        
        self.parameters[category][key] = value
        
        self._add_to_history("parameter_set", {
            "key": key,
            "value": str(value),
            "category": category
        })
        
        self.last_modified = datetime.now()
    
    def get_parameter(self, key: str, category: str = "general", 
                      default: Any = None) -> Any:
        """
        Get an analysis parameter.
        
        Args:
            key: Parameter key
            category: Parameter category
            default: Default value if not found
            
        Returns:
            Parameter value or default
        """
        if category in self.parameters:
            return self.parameters[category].get(key, default)
        return default
    
    def add_result(self, result_key: str, result_data: Dict[str, Any], 
                  result_type: str = "analysis") -> None:
        """
        Add analysis result to context.
        
        Args:
            result_key: Unique key for the result
            result_data: Result data dictionary
            result_type: Type of result (analysis, visualization, etc.)
        """
        if result_type not in self.results:
            self.results[result_type] = {}
        
        self.results[result_type][result_key] = {
            "data": result_data,
            "timestamp": datetime.now().isoformat(),
            "type": result_type
        }
        
        self._add_to_history("result_added", {
            "key": result_key,
            "type": result_type
        })
        
        self.last_modified = datetime.now()
        logger.info(f"Result added: {result_key} of type {result_type}")
    
    def get_result(self, result_key: str, result_type: str = None) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific result.
        
        Args:
            result_key: Result key
            result_type: Result type (searches all if None)
            
        Returns:
            Result data or None if not found
        """
        if result_type:
            return self.results.get(result_type, {}).get(result_key)
        
        # Search all result types
        for rtype in self.results.values():
            if result_key in rtype:
                return rtype[result_key]
        return None
    
    def save_checkpoint(self, checkpoint_name: str = None) -> str:
        """
        Save current state as a checkpoint.
        
        Args:
            checkpoint_name: Optional name for checkpoint
            
        Returns:
            Checkpoint identifier
        """
        checkpoint_id = checkpoint_name or f"checkpoint_{len(self.checkpoints) + 1}"
        
        # Create checkpoint data
        checkpoint_data = {
            "id": checkpoint_id,
            "timestamp": datetime.now().isoformat(),
            "data_hash": self._compute_data_hash(),
            "parameters": self.parameters.copy(),
            "results": self._serialize_results(),
            "metadata": self.metadata.copy(),
            "data_profile": self.data_profile.copy()
        }
        
        # Store checkpoint
        self.checkpoints[checkpoint_id] = checkpoint_data
        self.current_checkpoint = checkpoint_id
        
        # Persist to storage
        self._persist_checkpoint(checkpoint_id, checkpoint_data)
        
        self._add_to_history("checkpoint_saved", {"checkpoint_id": checkpoint_id})
        
        logger.info(f"Checkpoint saved: {checkpoint_id}")
        return checkpoint_id
    
    def restore_checkpoint(self, checkpoint_id: str) -> bool:
        """
        Restore state from a checkpoint.
        
        Args:
            checkpoint_id: Checkpoint identifier
            
        Returns:
            True if restoration successful, False otherwise
        """
        if checkpoint_id not in self.checkpoints:
            # Try loading from storage
            checkpoint_data = self._load_checkpoint(checkpoint_id)
            if not checkpoint_data:
                logger.warning(f"Checkpoint not found: {checkpoint_id}")
                return False
        else:
            checkpoint_data = self.checkpoints[checkpoint_id]
        
        try:
            # Restore state
            self.parameters = checkpoint_data.get("parameters", {})
            self.metadata = checkpoint_data.get("metadata", {})
            self.data_profile = checkpoint_data.get("data_profile", {})
            
            # Restore results (may need deserialization)
            self.results = self._deserialize_results(checkpoint_data.get("results", {}))
            
            self.current_checkpoint = checkpoint_id
            self._add_to_history("checkpoint_restored", {"checkpoint_id": checkpoint_id})
            
            logger.info(f"Checkpoint restored: {checkpoint_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error restoring checkpoint: {e}")
            return False
    
    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validate the current context state.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check for required data
        if self.data is None:
            errors.append("No primary data set")
        
        # Check data integrity
        if self.data is not None:
            if self.data.empty:
                errors.append("Primary data is empty")
            if self.data.isnull().all().any():
                errors.append("Data contains columns with all null values")
        
        # Check for analysis type
        if not self.analysis_type:
            errors.append("Analysis type not specified")
        
        # Validate parameters based on analysis type
        param_errors = self._validate_parameters()
        errors.extend(param_errors)
        
        self.validation_errors = errors
        is_valid = len(errors) == 0
        
        if not is_valid:
            logger.warning(f"Context validation failed: {errors}")
        
        return is_valid, errors
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the current context.
        
        Returns:
            Summary dictionary
        """
        return {
            "workflow_id": self.workflow_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "last_modified": self.last_modified.isoformat(),
            "has_data": self.data is not None,
            "data_shape": self.data.shape if self.data is not None else None,
            "analysis_type": self.analysis_type,
            "num_parameters": sum(len(params) for params in self.parameters.values()),
            "num_results": sum(len(results) for results in self.results.values()),
            "num_checkpoints": len(self.checkpoints),
            "current_checkpoint": self.current_checkpoint,
            "history_length": len(self.history),
            "is_valid": self.validate()[0]
        }
    
    def export_context(self, format: str = "json") -> Union[str, bytes]:
        """
        Export context to specified format.
        
        Args:
            format: Export format (json, pickle)
            
        Returns:
            Exported context data
        """
        export_data = {
            "workflow_id": self.workflow_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "last_modified": self.last_modified.isoformat(),
            "analysis_type": self.analysis_type,
            "parameters": self.parameters,
            "results": self._serialize_results(),
            "metadata": self.metadata,
            "data_profile": self.data_profile,
            "checkpoints": list(self.checkpoints.keys()),
            "history": self.history[-100:]  # Last 100 history items
        }
        
        if format == "json":
            return json.dumps(export_data, indent=2)
        elif format == "pickle":
            return pickle.dumps(export_data)
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def import_context(self, context_data: Union[str, bytes], format: str = "json") -> bool:
        """
        Import context from external data.
        
        Args:
            context_data: Context data to import
            format: Data format (json, pickle)
            
        Returns:
            True if import successful, False otherwise
        """
        try:
            if format == "json":
                import_data = json.loads(context_data)
            elif format == "pickle":
                import_data = pickle.loads(context_data)
            else:
                raise ValueError(f"Unsupported import format: {format}")
            
            # Import data
            self.workflow_id = import_data.get("workflow_id", self.workflow_id)
            self.user_id = import_data.get("user_id", self.user_id)
            self.analysis_type = import_data.get("analysis_type")
            self.parameters = import_data.get("parameters", {})
            self.metadata = import_data.get("metadata", {})
            self.data_profile = import_data.get("data_profile", {})
            
            # Import results
            self.results = self._deserialize_results(import_data.get("results", {}))
            
            self._add_to_history("context_imported", {"format": format})
            logger.info(f"Context imported from {format}")
            return True
            
        except Exception as e:
            logger.error(f"Error importing context: {e}")
            return False
    
    # Private helper methods
    
    def _profile_data(self, data: pd.DataFrame) -> None:
        """Profile the data and store characteristics."""
        if not isinstance(data, pd.DataFrame):
            return
        
        self.data_profile = {
            "shape": data.shape,
            "columns": list(data.columns),
            "dtypes": {col: str(dtype) for col, dtype in data.dtypes.items()},
            "missing_values": data.isnull().sum().to_dict(),
            "memory_usage": data.memory_usage(deep=True).sum(),
            "numeric_columns": list(data.select_dtypes(include=[np.number]).columns),
            "categorical_columns": list(data.select_dtypes(include=['object', 'category']).columns)
        }
        
        # Basic quality metrics
        total_cells = data.shape[0] * data.shape[1]
        missing_cells = data.isnull().sum().sum()
        
        self.data_quality_metrics = {
            "completeness": (total_cells - missing_cells) / total_cells if total_cells > 0 else 0,
            "has_duplicates": data.duplicated().any(),
            "num_duplicates": data.duplicated().sum()
        }
    
    def _compute_data_hash(self) -> str:
        """Compute hash of current data for comparison."""
        if self.data is None:
            return ""
        
        # Create hash of data shape and sample
        data_str = f"{self.data.shape}_{self.data.iloc[:10].to_string()}"
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def _add_to_history(self, action: str, details: Dict[str, Any]) -> None:
        """Add an action to history."""
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "details": details
        })
        
        # Keep history size manageable
        if len(self.history) > 1000:
            self.history = self.history[-1000:]
    
    def _serialize_results(self) -> Dict[str, Any]:
        """Serialize results for storage."""
        serialized = {}
        for result_type, results in self.results.items():
            serialized[result_type] = {}
            for key, value in results.items():
                # Convert complex objects to JSON-serializable format
                if isinstance(value, pd.DataFrame):
                    serialized[result_type][key] = {
                        "type": "dataframe",
                        "data": value.to_dict()
                    }
                elif isinstance(value, np.ndarray):
                    serialized[result_type][key] = {
                        "type": "ndarray",
                        "data": value.tolist()
                    }
                else:
                    serialized[result_type][key] = value
        return serialized
    
    def _deserialize_results(self, serialized: Dict[str, Any]) -> Dict[str, Any]:
        """Deserialize results from storage."""
        deserialized = {}
        for result_type, results in serialized.items():
            deserialized[result_type] = {}
            for key, value in results.items():
                if isinstance(value, dict) and "type" in value:
                    if value["type"] == "dataframe":
                        deserialized[result_type][key] = pd.DataFrame(value["data"])
                    elif value["type"] == "ndarray":
                        deserialized[result_type][key] = np.array(value["data"])
                    else:
                        deserialized[result_type][key] = value
                else:
                    deserialized[result_type][key] = value
        return deserialized
    
    def _persist_checkpoint(self, checkpoint_id: str, checkpoint_data: Dict[str, Any]) -> None:
        """Persist checkpoint to storage."""
        # Save to cache for quick access
        cache_key = f"workflow_checkpoint_{self.workflow_id}_{checkpoint_id}"
        cache.set(cache_key, json.dumps(checkpoint_data, default=str), timeout=86400)
        
        # Could also save to database or file storage
        # For now, just use cache
    
    def _load_checkpoint(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """Load checkpoint from storage."""
        cache_key = f"workflow_checkpoint_{self.workflow_id}_{checkpoint_id}"
        checkpoint_json = cache.get(cache_key)
        
        if checkpoint_json:
            return json.loads(checkpoint_json)
        return None
    
    def _validate_parameters(self) -> List[str]:
        """Validate parameters based on analysis type."""
        errors = []
        
        if self.analysis_type == "hypothesis_testing":
            # Check for required hypothesis testing parameters
            if not self.get_parameter("alpha_level", "statistical"):
                errors.append("Alpha level not specified for hypothesis testing")
            
        elif self.analysis_type == "regression":
            # Check for regression parameters
            if not self.get_parameter("dependent_variable", "model"):
                errors.append("Dependent variable not specified for regression")
        
        # Add more validation rules as needed
        
        return errors