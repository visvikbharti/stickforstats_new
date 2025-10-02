import logging
import traceback
import sys
import os
from datetime import datetime
from typing import Callable, Any, Dict, Optional, Type
import functools
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status

# Configure logging
logger = logging.getLogger(__name__)

class ErrorHandler:
    """Global error handler for the application."""
    
    @staticmethod
    def handle_exception(func: Callable) -> Callable:
        """
        Decorator for handling exceptions in functions.
        
        Args:
            func: Function to wrap with error handling
            
        Returns:
            Wrapped function with error handling
        """
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                ErrorHandler.log_error(e)
                # No display here - that's handled by the appropriate response mechanism
                return None
        return wrapper
    
    @staticmethod
    def log_error(error: Exception, additional_info: Optional[Dict[str, Any]] = None) -> None:
        """
        Log error details for debugging.
        
        Args:
            error: Exception that occurred
            additional_info: Optional additional information for debugging
        """
        try:
            # Create error log entry
            error_info = {
                'timestamp': datetime.now().isoformat(),
                'error_type': type(error).__name__,
                'error_message': str(error),
                'traceback': traceback.format_exc()
            }
            
            # Add additional info if provided
            if additional_info:
                error_info.update(additional_info)
            
            # Log to Python logger
            logger.error(
                f"Error: {error_info['error_type']} - {error_info['error_message']}\n"
                f"Traceback: {error_info['traceback']}"
            )
            
            # Write to error log file
            log_dir = os.path.join(settings.BASE_DIR, 'logs')
            os.makedirs(log_dir, exist_ok=True)
            with open(os.path.join(log_dir, 'stickforstats.log'), 'a') as f:
                f.write(f"\n{'='*50}\n")
                f.write(f"TIMESTAMP: {error_info['timestamp']}\n")
                f.write(f"ERROR TYPE: {error_info['error_type']}\n")
                f.write(f"ERROR MESSAGE: {error_info['error_message']}\n")
                f.write(f"TRACEBACK:\n{error_info['traceback']}\n")
                if additional_info:
                    f.write("ADDITIONAL INFO:\n")
                    for k, v in additional_info.items():
                        f.write(f"  {k}: {v}\n")
        except Exception as e:
            # If error logging fails, at least print to stderr
            print(f"Error logging failed: {str(e)}", file=sys.stderr)
            print(f"Original error: {str(error)}", file=sys.stderr)
    
    @staticmethod
    def get_user_friendly_message(error: Exception) -> str:
        """
        Generate a user-friendly error message based on the error type.
        
        Args:
            error: Exception that occurred
            
        Returns:
            User-friendly error message
        """
        error_type = type(error).__name__
        error_message = str(error)
        
        # Default user-friendly messages based on error type
        if error_type == 'ModuleNotFoundError':
            return f"Missing module: {error_message}. This might be due to a missing dependency."
        elif error_type == 'FileNotFoundError':
            return f"File not found: {error_message}. Please check if the file exists and is accessible."
        elif error_type == 'PermissionError':
            return f"Permission denied: {error_message}. Please check if you have the necessary permissions."
        elif error_type == 'ValueError':
            return f"Invalid value: {error_message}. Please check your inputs and try again."
        elif error_type == 'KeyError':
            return f"Missing key: {error_message}. This might be due to a missing configuration value."
        else:
            return f"An error occurred: {error_message}. Please try again or contact support if the problem persists."
    
    @staticmethod
    def api_exception_handler(exc, context):
        """
        Custom exception handler for DRF API views.
        
        Args:
            exc: Exception that occurred
            context: Error context from DRF
            
        Returns:
            DRF Response object with error details
        """
        # First, get the standard DRF response
        response = drf_exception_handler(exc, context)
        
        # If the response is None, it's an unhandled exception
        if response is None:
            ErrorHandler.log_error(exc, {'context': str(context)})
            user_friendly_message = ErrorHandler.get_user_friendly_message(exc)
            
            # Create a custom response
            response = Response({
                'error': user_friendly_message,
                'detail': str(exc),
                'type': type(exc).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Add debug info in development mode
            if settings.DEBUG:
                response.data['traceback'] = traceback.format_exc()
        
        return response

def safe_operation(func: Callable) -> Callable:
    """
    Decorator for safe operation with error handling.
    Simplified alias for ErrorHandler.handle_exception.
    
    Args:
        func: Function to wrap with error handling
        
    Returns:
        Wrapped function with error handling
    """
    return ErrorHandler.handle_exception(func)

def try_except(func: Callable, default_return: Any = None, 
               error_message: Optional[str] = None) -> Any:
    """
    Execute a function with try-except and return a default value on error.
    
    Args:
        func: Function to execute
        default_return: Value to return if an error occurs
        error_message: Custom error message for logging
        
    Returns:
        Function result or default value on error
    """
    try:
        return func()
    except Exception as e:
        additional_info = {'custom_message': error_message} if error_message else None
        ErrorHandler.log_error(e, additional_info)
        return default_return

class ApiErrorResponse:
    """Helper for generating error responses in API views."""
    
    @staticmethod
    def bad_request(message: str, details: Optional[Dict] = None) -> JsonResponse:
        """Generate a 400 Bad Request response."""
        response_data = {'error': message}
        if details and settings.DEBUG:
            response_data['details'] = details
        return JsonResponse(response_data, status=400)
    
    @staticmethod
    def not_found(message: str) -> JsonResponse:
        """Generate a 404 Not Found response."""
        return JsonResponse({'error': message}, status=404)
    
    @staticmethod
    def server_error(message: str, exc: Optional[Exception] = None) -> JsonResponse:
        """Generate a 500 Server Error response."""
        response_data = {'error': message}
        
        if exc:
            ErrorHandler.log_error(exc)
            if settings.DEBUG:
                response_data['exception'] = str(exc)
                response_data['traceback'] = traceback.format_exc()
                
        return JsonResponse(response_data, status=500)
    
    @staticmethod
    def validation_error(errors: Dict) -> JsonResponse:
        """Generate a response for validation errors."""
        return JsonResponse({
            'error': 'Validation failed',
            'validation_errors': errors
        }, status=400)