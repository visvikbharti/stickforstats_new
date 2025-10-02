"""
Error handling utilities for Confidence Intervals module.
Real implementation with no placeholders.
"""

import logging
import traceback
from functools import wraps
from rest_framework.response import Response
from rest_framework import status
import time

logger = logging.getLogger(__name__)


def handle_api_exception(func):
    """
    Decorator to handle API exceptions with proper error responses.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValueError as e:
            logger.error(f"Value error in {func.__name__}: {str(e)}")
            return Response(
                {"error": str(e), "type": "validation_error"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except KeyError as e:
            logger.error(f"Key error in {func.__name__}: {str(e)}")
            return Response(
                {"error": f"Missing required field: {str(e)}", "type": "missing_field"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ZeroDivisionError as e:
            logger.error(f"Division by zero in {func.__name__}: {str(e)}")
            return Response(
                {"error": "Division by zero in calculation", "type": "calculation_error"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}\n{traceback.format_exc()}")
            return Response(
                {"error": "An unexpected error occurred", "type": "internal_error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    return wrapper


def log_performance(operation_name=None):
    """
    Decorator to log performance metrics for functions.
    Can be used with or without arguments:
    @log_performance or @log_performance('operation_name')
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            end_time = time.time()
            duration = end_time - start_time
            
            op_name = operation_name or func.__name__
            logger.info(f"{op_name} executed in {duration:.4f} seconds")
            
            # Add performance data to response if it's a Response object
            if isinstance(result, Response):
                if not hasattr(result, 'data'):
                    result.data = {}
                if isinstance(result.data, dict):
                    result.data['_performance'] = {
                        'duration_seconds': duration,
                        'operation': op_name
                    }
            
            return result
        return wrapper
    
    # Handle both @log_performance and @log_performance('name')
    if callable(operation_name):
        # Called without arguments
        func = operation_name
        operation_name = None
        return decorator(func)
    else:
        # Called with arguments
        return decorator


class ConfidenceIntervalError(Exception):
    """
    Custom exception for confidence interval calculations.
    """
    pass


class DataValidationError(ConfidenceIntervalError):
    """
    Exception for data validation errors.
    """
    pass


class CalculationError(ConfidenceIntervalError):
    """
    Exception for calculation errors.
    """
    pass