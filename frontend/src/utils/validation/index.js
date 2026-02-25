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
import { ValidationError } from './StatisticalDataValidator';
import validator from './StatisticalDataValidator';
import auditLogger from './AuditLogger';
import errorRecoveryManager from './ErrorRecovery';
import errorHandler from './CentralErrorHandler';
import { recordValidation, recordError } from './monitoring';
import { syncAuditLog } from './BackendSync';

/**
 * Validate statistical parameters with automatic error handling
 */
export const validateStatisticalParams = async (params, schema = {}) => {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const result = await validator.validateParameters(params, schema);
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    try { recordValidation('statistical', 'validateParams', result.valid, duration); } catch (e) { /* monitoring optional */ }
    if (!result.valid) {
      try { recordError(new Error('Validation failed'), 'statistical', 'validation'); } catch (e) { /* monitoring optional */ }
    }
    try { auditLogger.logCalculation('validation', params, result, duration); } catch (e) { /* audit optional */ }
    try { const p = syncAuditLog({ validation: result }); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch (e) { /* sync optional */ }
    return result;
  } catch (error) {
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    try {
      recordValidation('statistical', 'validateParams', false, duration);
      recordError(error, 'statistical', 'validation');
    } catch (e) { /* monitoring optional */ }
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
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const defaultOptions = {
    elementType: 'float',
    nonEmpty: true,
    requireVariance: false,
    positive: false,
    ...options
  };

  const result = validator.validateArray('data', data, defaultOptions);
  const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  try { recordValidation('array', 'validateDataArray', true, duration); } catch (e) { /* monitoring optional */ }
  return result;
};

/**
 * Validate correlation/covariance matrix
 * Supports both (matrix, type) and (name, matrix, options) calling conventions
 */
export const validateMatrix = (nameOrMatrix, matrixOrType = 'correlation', options = {}) => {
  // 3-arg form: validateMatrix('name', matrix, options)
  if (typeof nameOrMatrix === 'string') {
    return validator.validateMatrix(nameOrMatrix, matrixOrType, options);
  }
  // 2-arg form: validateMatrix(matrix, type)
  const matrix = nameOrMatrix;
  const type = matrixOrType;
  const opts = type === 'correlation'
    ? { isCorrelation: true }
    : { symmetric: true, positiveDefinite: true };

  return validator.validateMatrix(type + 'Matrix', matrix, opts);
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

  let lastError;
  for (let attempt = 0; attempt <= defaultOptions.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }

  if (defaultOptions.fallbackValue !== null) {
    return defaultOptions.fallbackValue;
  }
  throw lastError;
};

/**
 * Create a validated calculation wrapper
 */
export const createValidatedCalculation = (calculationFn, paramSchema) => {
  return async (params) => {
    // Validate inputs directly (not via validateStatisticalParams to avoid double monitoring)
    const validationResult = await validator.validateParameters(params, paramSchema);

    if (!validationResult.valid) {
      throw new ValidationError(
        'params',
        params,
        'validation failed',
        { errors: validationResult.errors }
      );
    }

    // Execute calculation with error handling
    const calcStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const result = await executeWithRecovery(
      () => calculationFn(validationResult.validatedParams),
      {
        module: calculationFn.name || 'calculation',
        inputs: params
      }
    );
    const calcDuration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - calcStart;

    // Audit the calculation
    try { auditLogger.logCalculation(calculationFn.name || 'calculation', params, result, calcDuration); } catch (e) { /* audit optional */ }

    return result;
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
  errorHandler,

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
