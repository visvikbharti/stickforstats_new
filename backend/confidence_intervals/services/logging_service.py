"""
Logging service for Confidence Intervals module.
Real implementation for tracking calculations and user actions.
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Configure module logger
logger = logging.getLogger('confidence_intervals')
logger.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create console handler if not exists
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)


class LoggingService:
    """
    Service for structured logging of confidence interval calculations.
    """
    
    def __init__(self):
        self.logger = logger
        
    def log_calculation(self, 
                       calculation_type: str,
                       parameters: Dict[str, Any],
                       result: Optional[Dict[str, Any]] = None,
                       error: Optional[str] = None,
                       user_id: Optional[int] = None):
        """
        Log a confidence interval calculation.
        
        Args:
            calculation_type: Type of CI calculation (e.g., 'mean', 'proportion')
            parameters: Input parameters for the calculation
            result: Calculation result (if successful)
            error: Error message (if failed)
            user_id: ID of the user performing the calculation
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'calculation_type': calculation_type,
            'parameters': parameters,
            'user_id': user_id
        }
        
        if result:
            log_entry['result'] = result
            log_entry['status'] = 'success'
            self.logger.info(f"CI calculation successful: {json.dumps(log_entry)}")
        elif error:
            log_entry['error'] = error
            log_entry['status'] = 'error'
            self.logger.error(f"CI calculation failed: {json.dumps(log_entry)}")
        else:
            log_entry['status'] = 'unknown'
            self.logger.warning(f"CI calculation status unknown: {json.dumps(log_entry)}")
    
    def log_bootstrap(self,
                     data_size: int,
                     n_iterations: int,
                     confidence_level: float,
                     duration_seconds: float,
                     user_id: Optional[int] = None):
        """
        Log bootstrap confidence interval calculation.
        
        Args:
            data_size: Size of the input data
            n_iterations: Number of bootstrap iterations
            confidence_level: Confidence level (e.g., 0.95)
            duration_seconds: Time taken for calculation
            user_id: ID of the user
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'type': 'bootstrap',
            'data_size': data_size,
            'n_iterations': n_iterations,
            'confidence_level': confidence_level,
            'duration_seconds': duration_seconds,
            'user_id': user_id
        }
        
        self.logger.info(f"Bootstrap CI completed: {json.dumps(log_entry)}")
    
    def log_visualization(self,
                         visualization_type: str,
                         data_points: int,
                         user_id: Optional[int] = None):
        """
        Log visualization generation.
        
        Args:
            visualization_type: Type of visualization
            data_points: Number of data points
            user_id: ID of the user
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'type': 'visualization',
            'visualization_type': visualization_type,
            'data_points': data_points,
            'user_id': user_id
        }
        
        self.logger.info(f"Visualization generated: {json.dumps(log_entry)}")
    
    def log_error(self,
                 error_type: str,
                 error_message: str,
                 context: Optional[Dict[str, Any]] = None,
                 user_id: Optional[int] = None):
        """
        Log an error with context.
        
        Args:
            error_type: Type of error
            error_message: Error message
            context: Additional context
            user_id: ID of the user
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'error_type': error_type,
            'error_message': error_message,
            'context': context or {},
            'user_id': user_id
        }
        
        self.logger.error(f"Error occurred: {json.dumps(log_entry)}")
    
    def log_api_request(self,
                       endpoint: str,
                       method: str,
                       parameters: Dict[str, Any],
                       user_id: Optional[int] = None):
        """
        Log API request.
        
        Args:
            endpoint: API endpoint
            method: HTTP method
            parameters: Request parameters
            user_id: ID of the user
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'type': 'api_request',
            'endpoint': endpoint,
            'method': method,
            'parameters': parameters,
            'user_id': user_id
        }
        
        self.logger.info(f"API request: {json.dumps(log_entry)}")
    
    def log_performance(self,
                       operation: str,
                       duration_seconds: float,
                       details: Optional[Dict[str, Any]] = None):
        """
        Log performance metrics.
        
        Args:
            operation: Operation being measured
            duration_seconds: Duration in seconds
            details: Additional details
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'type': 'performance',
            'operation': operation,
            'duration_seconds': duration_seconds,
            'details': details or {}
        }
        
        self.logger.info(f"Performance metric: {json.dumps(log_entry)}")


# Create singleton instance
logging_service = LoggingService()