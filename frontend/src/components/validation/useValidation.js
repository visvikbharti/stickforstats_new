/**
 * React Hook for Real-time Validation
 * Provides validation state management and real-time feedback
 *
 * @module useValidation
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  validateStatisticalParams,
  validateDataArray,
  centralErrorHandler,
  ValidationError,
  auditLogger
} from '../../utils/validation';

/**
 * Debounce function for validation
 * @private
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for field validation
 * @param {object} options - Validation options
 * @returns {object} Validation state and methods
 */
export function useValidation(options = {}) {
  const {
    schema = {},
    mode = 'onChange', // 'onChange', 'onBlur', 'onSubmit', 'realtime'
    debounceMs = 300,
    showSuccessIndicator = true,
    enableAudit = true
  } = options;

  // State
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [validationStats, setValidationStats] = useState({
    totalValidations: 0,
    failedValidations: 0,
    lastValidation: null
  });

  // Refs for tracking
  const validationTimeout = useRef(null);
  const fieldValidationStatus = useRef({});

  // Debounced values for real-time validation
  const debouncedValues = useDebounce(values, debounceMs);

  /**
   * Validate a single field
   */
  const validateField = useCallback(async (name, value, fieldSchema = null) => {
    const startTime = performance.now();
    const schemaToUse = fieldSchema || schema[name];

    if (!schemaToUse) {
      return { valid: true };
    }

    try {
      const result = await validateStatisticalParams(
        { [name]: value },
        { [name]: schemaToUse }
      );

      // Update field status
      fieldValidationStatus.current[name] = {
        status: result.valid ? 'valid' : 'invalid',
        timestamp: Date.now()
      };

      // Log if enabled
      if (enableAudit && result.valid) {
        auditLogger.logValidation({
          field: name,
          value: value,
          result: 'success',
          duration: performance.now() - startTime
        });
      }

      return result;

    } catch (error) {
      // Update field status
      fieldValidationStatus.current[name] = {
        status: 'error',
        timestamp: Date.now(),
        error: error.message
      };

      if (enableAudit) {
        auditLogger.logValidation({
          field: name,
          value: value,
          result: 'failed',
          error: error.message,
          duration: performance.now() - startTime
        });
      }

      return {
        valid: false,
        error: error.message
      };
    }
  }, [schema, enableAudit]);

  /**
   * Validate all fields
   */
  const validateAll = useCallback(async () => {
    setIsValidating(true);
    const newErrors = {};
    let allValid = true;

    try {
      const result = await validateStatisticalParams(values, schema);

      if (!result.valid) {
        allValid = false;
        result.errors.forEach(error => {
          newErrors[error.field] = error.message;
        });
      }

      setErrors(newErrors);
      setIsValid(allValid);

      // Update stats
      setValidationStats(prev => ({
        totalValidations: prev.totalValidations + 1,
        failedValidations: prev.failedValidations + (allValid ? 0 : 1),
        lastValidation: Date.now()
      }));

      return allValid;

    } catch (error) {
      centralErrorHandler.handleError(error, {
        module: 'validation',
        operation: 'validateAll'
      });

      setIsValid(false);
      return false;

    } finally {
      setIsValidating(false);
    }
  }, [values, schema]);

  /**
   * Handle field change
   */
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));

    // Clear error if exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Validate based on mode
    if (mode === 'onChange' || mode === 'realtime') {
      // Clear existing timeout
      if (validationTimeout.current) {
        clearTimeout(validationTimeout.current);
      }

      // Set new timeout for validation
      validationTimeout.current = setTimeout(async () => {
        const result = await validateField(name, value);

        if (!result.valid && result.error) {
          setErrors(prev => ({ ...prev, [name]: result.error }));
        }
      }, mode === 'realtime' ? 0 : debounceMs);
    }
  }, [errors, mode, debounceMs, validateField]);

  /**
   * Handle field blur
   */
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    if (mode === 'onBlur') {
      validateField(name, values[name]).then(result => {
        if (!result.valid && result.error) {
          setErrors(prev => ({ ...prev, [name]: result.error }));
        }
      });
    }
  }, [mode, values, validateField]);

  /**
   * Reset validation state
   */
  const reset = useCallback(() => {
    setValues({});
    setErrors({});
    setTouched({});
    setIsValid(true);
    fieldValidationStatus.current = {};
  }, []);

  /**
   * Set field value programmatically
   */
  const setFieldValue = useCallback((name, value) => {
    handleChange(name, value);
  }, [handleChange]);

  /**
   * Set field error programmatically
   */
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  /**
   * Get field props for input components
   */
  const getFieldProps = useCallback((name, fieldSchema = null) => {
    return {
      name,
      value: values[name] || '',
      onChange: (e) => handleChange(name, e.target ? e.target.value : e),
      onBlur: () => handleBlur(name),
      error: touched[name] && errors[name],
      helperText: touched[name] && errors[name],
      'data-validation-status': fieldValidationStatus.current[name]?.status,
      'aria-invalid': touched[name] && !!errors[name],
      'aria-describedby': errors[name] ? `${name}-error` : undefined
    };
  }, [values, errors, touched, handleChange, handleBlur]);

  /**
   * Validate data array
   */
  const validateArray = useCallback(async (data, arrayOptions = {}) => {
    try {
      await validateDataArray(data, arrayOptions);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }, []);

  /**
   * Real-time validation effect
   */
  useEffect(() => {
    if (mode === 'realtime' && Object.keys(debouncedValues).length > 0) {
      validateAll();
    }
  }, [debouncedValues, mode, validateAll]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (validationTimeout.current) {
        clearTimeout(validationTimeout.current);
      }
    };
  }, []);

  return {
    // State
    values,
    errors,
    touched,
    isValidating,
    isValid,
    validationStats,

    // Methods
    handleChange,
    handleBlur,
    validateField,
    validateAll,
    validateArray,
    reset,
    setFieldValue,
    setFieldError,
    getFieldProps,

    // Field status
    fieldStatus: fieldValidationStatus.current,

    // Helpers
    hasErrors: Object.keys(errors).length > 0,
    isTouched: Object.keys(touched).length > 0,
    isDirty: Object.keys(values).length > 0
  };
}

/**
 * Hook for form validation
 */
export function useFormValidation(initialValues = {}, schema = {}, options = {}) {
  const validation = useValidation({
    ...options,
    schema,
    mode: options.mode || 'onChange'
  });

  // Initialize with default values
  useEffect(() => {
    Object.entries(initialValues).forEach(([key, value]) => {
      validation.setFieldValue(key, value);
    });
  }, []); // Only on mount

  /**
   * Handle form submit
   */
  const handleSubmit = useCallback(async (onSubmit) => {
    return async (e) => {
      if (e && e.preventDefault) {
        e.preventDefault();
      }

      // Validate all fields
      const isValid = await validation.validateAll();

      if (isValid) {
        try {
          await onSubmit(validation.values);

          // Log successful submission
          if (options.enableAudit) {
            auditLogger.log({
              action: 'FORM_SUBMITTED',
              category: 'user_action',
              details: {
                formId: options.formId || 'unknown',
                fieldCount: Object.keys(validation.values).length
              },
              result: 'success'
            });
          }
        } catch (error) {
          // Handle submission error
          centralErrorHandler.handleError(error, {
            module: 'form',
            operation: 'submit'
          });
        }
      } else {
        // Mark all fields as touched to show errors
        const allTouched = {};
        Object.keys(schema).forEach(key => {
          allTouched[key] = true;
        });
        validation.setTouched(allTouched);

        // Log validation failure
        if (options.enableAudit) {
          auditLogger.log({
            action: 'FORM_VALIDATION_FAILED',
            category: 'validation',
            details: {
              formId: options.formId || 'unknown',
              errors: validation.errors
            },
            result: 'failed'
          });
        }
      }
    };
  }, [validation, schema, options]);

  return {
    ...validation,
    handleSubmit,
    initialValues
  };
}

/**
 * Hook for array/matrix validation
 */
export function useArrayValidation(options = {}) {
  const [data, setData] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Validate array data
   */
  const validate = useCallback(async (arrayData = data) => {
    setIsValidating(true);

    try {
      await validateDataArray(arrayData, options);

      setValidationResult({
        valid: true,
        stats: {
          length: arrayData.length,
          min: Math.min(...arrayData),
          max: Math.max(...arrayData),
          mean: arrayData.reduce((a, b) => a + b, 0) / arrayData.length
        }
      });

      return true;

    } catch (error) {
      setValidationResult({
        valid: false,
        error: error.message
      });

      return false;

    } finally {
      setIsValidating(false);
    }
  }, [data, options]);

  /**
   * Update data and validate
   */
  const updateData = useCallback((newData) => {
    setData(newData);

    if (options.validateOnChange) {
      validate(newData);
    }
  }, [options.validateOnChange, validate]);

  /**
   * Add item to array
   */
  const addItem = useCallback((item) => {
    const newData = [...data, item];
    updateData(newData);
  }, [data, updateData]);

  /**
   * Remove item from array
   */
  const removeItem = useCallback((index) => {
    const newData = data.filter((_, i) => i !== index);
    updateData(newData);
  }, [data, updateData]);

  /**
   * Clear array
   */
  const clear = useCallback(() => {
    setData([]);
    setValidationResult(null);
  }, []);

  return {
    data,
    validationResult,
    isValidating,
    isValid: validationResult?.valid || false,
    error: validationResult?.error,
    stats: validationResult?.stats,

    // Methods
    validate,
    updateData,
    addItem,
    removeItem,
    clear
  };
}

/**
 * Hook for live validation feedback
 */
export function useLiveValidation(value, schema, options = {}) {
  const [isValid, setIsValid] = useState(null);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const debouncedValue = useDebounce(value, options.debounceMs || 300);

  useEffect(() => {
    if (debouncedValue === undefined || debouncedValue === null || debouncedValue === '') {
      setIsValid(null);
      setError(null);
      return;
    }

    setIsValidating(true);

    validateStatisticalParams(
      { value: debouncedValue },
      { value: schema }
    ).then(result => {
      setIsValid(result.valid);
      setError(result.valid ? null : result.errors?.[0]?.message || 'Invalid value');
      setIsValidating(false);
    }).catch(err => {
      setIsValid(false);
      setError(err.message);
      setIsValidating(false);
    });
  }, [debouncedValue, schema]);

  return {
    isValid,
    error,
    isValidating,
    status: isValidating ? 'validating' : isValid === null ? 'idle' : isValid ? 'valid' : 'invalid'
  };
}

export default {
  useValidation,
  useFormValidation,
  useArrayValidation,
  useLiveValidation
};