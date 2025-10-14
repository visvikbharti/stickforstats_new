/**
 * Validation System Export Module
 * Centralized exports for all validation components
 *
 * @module ValidationSystem
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

// Core validators
export {
  StatisticalDataValidator,
  ValidationError
} from './StatisticalDataValidator';

// Audit logging
export {
  AuditLogger,
  default as auditLogger
} from './AuditLogger';

// Error recovery
export {
  ErrorRecoveryManager,
  RecoverableError,
  RecoveryStrategy,
  ErrorSeverity,
  default as errorRecoveryManager
} from './ErrorRecovery';

// Central error handling
export {
  CentralErrorHandler,
  ErrorCategory,
  NotificationLevel,
  default as centralErrorHandler
} from './CentralErrorHandler';

// Convenience functions for common validations
import validator from './StatisticalDataValidator';
import errorHandler from './CentralErrorHandler';

/**
 * Validate statistical parameters with automatic error handling
 */
export const validateStatisticalParams = async (params, schema = {}) => {
  try {
    return await validator.validateParameters(params, schema);
  } catch (error) {
    return errorHandler.handleError(error, {
      module: 'validation',
      operation: 'validateStatisticalParams',
      inputs: params
    });
  }
};

/**
 * Validate and sanitize data array
 */
export const validateDataArray = (data, options = {}) => {
  const defaultOptions = {
    elementType: 'float',
    nonEmpty: true,
    requireVariance: false,
    positive: false,
    ...options
  };

  return validator.validateArray('data', data, defaultOptions);
};

/**
 * Validate correlation/covariance matrix
 */
export const validateMatrix = (matrix, type = 'correlation') => {
  const options = type === 'correlation'
    ? { isCorrelation: true }
    : { symmetric: true, positiveDefinite: true };

  return validator.validateMatrix(type + 'Matrix', matrix, options);
};

/**
 * Validate confidence interval parameters
 */
export const validateConfidenceInterval = (params) => {
  const schema = {
    sampleSize: { required: true },
    mean: { required: true },
    standardDeviation: { required: true },
    confidenceLevel: { required: true }
  };

  return validator.validateParameters(params, schema);
};

/**
 * Validate DOE (Design of Experiments) parameters
 */
export const validateDOEParams = (params) => {
  const schema = {
    factors: { required: true, minLength: 2, maxLength: 10 },
    levels: { required: true, elementType: 'integer', minValue: 2 },
    replicates: { required: false, default: 1 },
    blocks: { required: false },
    centerPoints: { required: false, default: 0 }
  };

  return validator.validateParameters(params, schema);
};

/**
 * Validate SQC (Statistical Quality Control) parameters
 */
export const validateSQCParams = (params) => {
  const schema = {
    data: { required: true, elementType: 'float' },
    subgroupSize: { required: false, default: 1 },
    controlLimitSigma: { required: false, default: 3 },
    specLimits: { required: false }
  };

  return validator.validateParameters(params, schema);
};

/**
 * Execute operation with full error handling and recovery
 */
export const executeWithRecovery = async (operation, options = {}) => {
  const defaultOptions = {
    maxRetries: 3,
    fallbackValue: null,
    enableAudit: true,
    ...options
  };

  try {
    return await errorHandler.executeWithHandling(operation, defaultOptions);
  } catch (error) {
    if (defaultOptions.fallbackValue !== null) {
      return defaultOptions.fallbackValue;
    }
    throw error;
  }
};

/**
 * Create a validated calculation wrapper
 */
export const createValidatedCalculation = (calculationFn, paramSchema) => {
  return async (params) => {
    // Validate inputs
    const validationResult = await validateStatisticalParams(params, paramSchema);

    if (!validationResult.valid) {
      throw new ValidationError(
        'params',
        params,
        'validation failed',
        { errors: validationResult.errors }
      );
    }

    // Execute calculation with error handling
    return executeWithRecovery(
      () => calculationFn(validationResult.validatedParams),
      {
        module: calculationFn.name || 'calculation',
        inputs: params
      }
    );
  };
};

/**
 * Batch validate multiple parameters
 */
export const batchValidate = async (validations) => {
  const results = {
    valid: true,
    results: [],
    errors: []
  };

  for (const { params, schema, name } of validations) {
    try {
      const result = await validateStatisticalParams(params, schema);
      results.results.push({ name, ...result });

      if (!result.valid) {
        results.valid = false;
        results.errors.push({ name, errors: result.errors });
      }
    } catch (error) {
      results.valid = false;
      results.errors.push({ name, error: error.message });
    }
  }

  return results;
};

// Default export with all components
export default {
  validator,
  auditLogger,
  errorRecoveryManager,
  errorHandler: centralErrorHandler,

  // Convenience functions
  validateStatisticalParams,
  validateDataArray,
  validateMatrix,
  validateConfidenceInterval,
  validateDOEParams,
  validateSQCParams,
  executeWithRecovery,
  createValidatedCalculation,
  batchValidate
};