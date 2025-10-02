/**
 * Error handling utilities for StickForStats
 * 
 * This file provides consistent ways to handle API errors and display
 * user-friendly messages throughout the application
 */

import { useSnackbar } from 'notistack';

/**
 * Handle API error with appropriate UI feedback
 * @param {Object} error - Error object from API service
 * @param {Object} options - Error handling options
 * @param {Function} options.onNetworkError - Callback for network errors
 * @param {Function} options.onAuthError - Callback for authentication errors
 * @param {Function} options.onNotFound - Callback for not found errors
 * @param {Function} options.onServerError - Callback for server errors
 * @param {Function} options.onValidationError - Callback for validation errors
 * @param {Function} options.onOtherError - Callback for other errors
 * @param {Boolean} options.showSnackbar - Whether to show snackbar notification
 * @returns {Object} The original error for further processing
 */
export const handleApiError = (error, options = {}) => {
  const {
    onNetworkError,
    onAuthError,
    onNotFound,
    onServerError,
    onValidationError,
    onOtherError,
    showSnackbar = true
  } = options;

  // Extract error information
  const { type, message, fieldErrors } = error;

  // Call specific handler based on error type
  switch (type) {
    case 'NETWORK_ERROR':
      if (onNetworkError) onNetworkError(error);
      break;
    case 'AUTH_ERROR':
      if (onAuthError) onAuthError(error);
      break;
    case 'NOT_FOUND':
      if (onNotFound) onNotFound(error);
      break;
    case 'SERVER_ERROR':
      if (onServerError) onServerError(error);
      break;
    case 'VALIDATION_ERROR':
      if (onValidationError) onValidationError(error, fieldErrors);
      break;
    default:
      if (onOtherError) onOtherError(error);
  }

  // Return the error for further processing
  return error;
};

/**
 * React hook for handling API errors with snackbar notifications
 * 
 * @returns {Function} Error handler function
 * 
 * @example
 * const handleError = useErrorHandler();
 * 
 * try {
 *   const data = await apiService.get('/some-endpoint');
 * } catch (error) {
 *   handleError(error, {
 *     onValidationError: (err, fieldErrors) => {
 *       // Set form errors
 *       setFormErrors(fieldErrors);
 *     }
 *   });
 * }
 */
export const useErrorHandler = () => {
  const { enqueueSnackbar } = useSnackbar();

  return (error, options = {}) => {
    // Default behavior for showing snackbar
    const showSnackbar = options.showSnackbar !== false;
    
    if (showSnackbar) {
      let variant = 'error';
      let message = error.message || 'An unexpected error occurred';
      
      // For validation errors, we might want to show a different style
      if (error.type === 'VALIDATION_ERROR') {
        variant = 'warning';
      }
      
      // For network errors, we might want a different message style
      if (error.type === 'NETWORK_ERROR') {
        variant = 'warning';
      }
      
      enqueueSnackbar(message, { 
        variant,
        autoHideDuration: 5000
      });
    }
    
    return handleApiError(error, options);
  };
};

/**
 * Creates an async error boundary for API calls
 * 
 * @param {Function} apiCall - The API function to call
 * @param {Function} errorHandler - Error handler function
 * @param {Object} errorOptions - Options to pass to the error handler
 * @returns {Function} A function that executes the API call with error handling
 * 
 * @example
 * const fetchUsers = withErrorHandling(
 *   () => apiService.get('/users'),
 *   error => console.error('Failed to fetch users:', error)
 * );
 * 
 * // Usage
 * const users = await fetchUsers();
 */
export const withErrorHandling = (apiCall, errorHandler, errorOptions = {}) => {
  return async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error, errorOptions);
      }
      return null;
    }
  };
};

/**
 * Retry a failed API call with exponential backoff
 * 
 * @param {Function} apiCall - The API function to call
 * @param {Object} options - Retry options
 * @param {Number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {Number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {Array} options.retryableErrors - Types of errors to retry (default: ['NETWORK_ERROR'])
 * @returns {Promise} Result of the API call or last error
 */
export const retryApiCall = async (apiCall, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    retryableErrors = ['NETWORK_ERROR']
  } = options;

  let lastError;
  let retryCount = 0;
  let delay = initialDelay;

  while (retryCount < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!retryableErrors.includes(error.type)) {
        break;
      }
      
      // Increase retry count
      retryCount++;
      
      // If we've used all retries, break
      if (retryCount >= maxRetries) {
        break;
      }
      
      // Wait for the current delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
    }
  }

  throw lastError;
};