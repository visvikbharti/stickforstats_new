/**
 * Statistical Data Validator
 * Enterprise-grade validation for scientific computing
 * Compliant with FDA 21 CFR Part 11, GxP, and ISO 9001:2015
 *
 * @module StatisticalDataValidator
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import { AuditLogger } from './AuditLogger';

/**
 * Statistical parameter bounds based on practical and theoretical limits
 */
const STATISTICAL_BOUNDS = {
  sampleSize: { min: 1, max: 1000000, type: 'integer' },
  mean: { min: -1e10, max: 1e10, type: 'float' },
  standardDeviation: { min: 0, max: 1e10, type: 'float', excludeZero: false },
  variance: { min: 0, max: 1e20, type: 'float' },
  confidenceLevel: { min: 0, max: 1, type: 'float', excludeZero: true, excludeOne: true },
  alpha: { min: 0, max: 1, type: 'float', excludeZero: true, excludeOne: true },
  beta: { min: 0, max: 1, type: 'float', excludeZero: true, excludeOne: true },
  power: { min: 0, max: 1, type: 'float', excludeZero: true, excludeOne: false },
  correlation: { min: -1, max: 1, type: 'float' },
  degreesOfFreedom: { min: 1, max: 10000, type: 'integer' },
  lambda: { min: 0, max: 10000, type: 'float', excludeZero: true }, // Poisson parameter
  probability: { min: 0, max: 1, type: 'float' },
  proportion: { min: 0, max: 1, type: 'float' },
  effectSize: { min: -10, max: 10, type: 'float' },
  factorLevels: { min: 2, max: 100, type: 'integer' },
  replicates: { min: 1, max: 1000, type: 'integer' },
  blocks: { min: 1, max: 100, type: 'integer' },
  centerPoints: { min: 0, max: 50, type: 'integer' },
  axialDistance: { min: 0.1, max: 10, type: 'float', excludeZero: true },
  controlLimitSigma: { min: 1, max: 6, type: 'float' },
  subgroupSize: { min: 1, max: 100, type: 'integer' },
  ewmaLambda: { min: 0, max: 1, type: 'float', excludeZero: true, excludeOne: true },
  cusumK: { min: 0, max: 5, type: 'float', excludeZero: true },
  cusumH: { min: 0, max: 10, type: 'float', excludeZero: true },
  specLimitLower: { min: -1e10, max: 1e10, type: 'float' },
  specLimitUpper: { min: -1e10, max: 1e10, type: 'float' },
  targetValue: { min: -1e10, max: 1e10, type: 'float' }
};

/**
 * Validation error class with detailed context
 */
export class ValidationError extends Error {
  constructor(field, value, constraint, context = {}) {
    const message = `Validation failed for ${field}: value ${value} violates ${constraint}`;
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.constraint = constraint;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.stackTrace = new Error().stack;
  }

  toJSON() {
    return {
      name: this.name,
      field: this.field,
      value: this.value,
      constraint: this.constraint,
      context: this.context,
      timestamp: this.timestamp,
      message: this.message
    };
  }
}

/**
 * Main validator class for statistical data
 */
export class StatisticalDataValidator {
  constructor(options = {}) {
    this.strictMode = options.strictMode !== false;
    this.auditLogger = new AuditLogger(options.auditConfig);
    this.customRules = options.customRules || {};
    this.validationCache = new Map();
    this.performanceMetrics = {
      totalValidations: 0,
      failedValidations: 0,
      avgValidationTime: 0
    };
  }

  /**
   * Validate a single parameter
   * @param {string} paramName - Parameter name
   * @param {*} value - Value to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateParameter(paramName, value, options = {}) {
    const startTime = performance.now();
    const validationId = this.generateValidationId();

    try {
      // Check if parameter has defined bounds
      const bounds = STATISTICAL_BOUNDS[paramName] || options.customBounds;
      if (!bounds) {
        if (this.strictMode) {
          throw new ValidationError(paramName, value, 'undefined parameter type');
        }
        return this.createValidationResult(true, paramName, value);
      }

      // Type validation
      const typeValid = this.validateType(value, bounds.type);
      if (!typeValid) {
        throw new ValidationError(
          paramName,
          value,
          `type mismatch (expected ${bounds.type})`,
          { providedType: typeof value }
        );
      }

      // Numeric validation
      if (bounds.type === 'integer' || bounds.type === 'float') {
        this.validateNumericBounds(paramName, value, bounds);
      }

      // Array validation
      if (Array.isArray(value)) {
        this.validateArray(paramName, value, bounds);
      }

      // Matrix validation
      if (options.isMatrix) {
        this.validateMatrix(paramName, value, options);
      }

      // Custom validation rules
      if (this.customRules[paramName]) {
        const customResult = this.customRules[paramName](value, options);
        if (!customResult.valid) {
          throw new ValidationError(paramName, value, customResult.message);
        }
      }

      // Log successful validation
      const result = this.createValidationResult(true, paramName, value);
      this.auditLogger.logValidation({
        validationId,
        paramName,
        value: this.sanitizeForLogging(value),
        result: 'success',
        duration: performance.now() - startTime
      });

      this.updatePerformanceMetrics(performance.now() - startTime, true);
      return result;

    } catch (error) {
      // Log failed validation
      this.auditLogger.logValidation({
        validationId,
        paramName,
        value: this.sanitizeForLogging(value),
        result: 'failed',
        error: error.message,
        duration: performance.now() - startTime
      });

      this.updatePerformanceMetrics(performance.now() - startTime, false);

      if (options.throwOnError !== false) {
        throw error;
      }

      return this.createValidationResult(false, paramName, value, error.message);
    }
  }

  /**
   * Validate multiple parameters
   * @param {Object} params - Parameters to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation results
   */
  validateParameters(params, schema) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      validatedParams: {}
    };

    for (const [key, value] of Object.entries(params)) {
      try {
        const schemaRule = schema[key] || {};
        const validationResult = this.validateParameter(key, value, schemaRule);

        if (validationResult.valid) {
          results.validatedParams[key] = validationResult.sanitizedValue || value;
        } else {
          results.valid = false;
          results.errors.push(validationResult);
        }
      } catch (error) {
        results.valid = false;
        results.errors.push({
          field: key,
          message: error.message,
          value: this.sanitizeForLogging(value)
        });
      }
    }

    // Check for required parameters
    if (schema) {
      for (const [key, rule] of Object.entries(schema)) {
        if (rule.required && !(key in params)) {
          results.valid = false;
          results.errors.push({
            field: key,
            message: 'Required parameter missing',
            value: undefined
          });
        }
      }
    }

    return results;
  }

  /**
   * Validate data type
   * @private
   */
  validateType(value, expectedType) {
    switch (expectedType) {
      case 'integer':
        return Number.isInteger(value);
      case 'float':
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
      case 'string':
        return typeof value === 'string';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Validate numeric bounds
   * @private
   */
  validateNumericBounds(paramName, value, bounds) {
    // Check minimum
    if (bounds.min !== undefined && value < bounds.min) {
      throw new ValidationError(
        paramName,
        value,
        `below minimum (${bounds.min})`,
        { min: bounds.min, actual: value }
      );
    }

    // Check maximum
    if (bounds.max !== undefined && value > bounds.max) {
      throw new ValidationError(
        paramName,
        value,
        `above maximum (${bounds.max})`,
        { max: bounds.max, actual: value }
      );
    }

    // Check zero exclusion
    if (bounds.excludeZero && value === 0) {
      throw new ValidationError(paramName, value, 'zero not allowed');
    }

    // Check one exclusion
    if (bounds.excludeOne && value === 1) {
      throw new ValidationError(paramName, value, 'one not allowed');
    }

    // Check for NaN
    if (isNaN(value)) {
      throw new ValidationError(paramName, value, 'NaN not allowed');
    }

    // Check for Infinity
    if (!isFinite(value)) {
      throw new ValidationError(paramName, value, 'Infinity not allowed');
    }
  }

  /**
   * Validate array data
   * @private
   */
  validateArray(paramName, array, options = {}) {
    if (!Array.isArray(array)) {
      throw new ValidationError(paramName, array, 'not an array');
    }

    // Check array length
    if (options.minLength && array.length < options.minLength) {
      throw new ValidationError(
        paramName,
        array,
        `array too short (min: ${options.minLength})`
      );
    }

    if (options.maxLength && array.length > options.maxLength) {
      throw new ValidationError(
        paramName,
        array,
        `array too long (max: ${options.maxLength})`
      );
    }

    // Check for empty array
    if (options.nonEmpty && array.length === 0) {
      throw new ValidationError(paramName, array, 'empty array not allowed');
    }

    // Validate each element
    if (options.elementType) {
      for (let i = 0; i < array.length; i++) {
        if (!this.validateType(array[i], options.elementType)) {
          throw new ValidationError(
            `${paramName}[${i}]`,
            array[i],
            `invalid element type (expected ${options.elementType})`
          );
        }

        // Additional numeric validation for array elements
        if (options.elementBounds && (options.elementType === 'float' || options.elementType === 'integer')) {
          this.validateNumericBounds(`${paramName}[${i}]`, array[i], options.elementBounds);
        }
      }
    }

    // Check for unique values if required
    if (options.unique) {
      const uniqueValues = new Set(array);
      if (uniqueValues.size !== array.length) {
        throw new ValidationError(paramName, array, 'duplicate values not allowed');
      }
    }

    // Statistical checks for numeric arrays
    if (options.elementType === 'float' || options.elementType === 'integer') {
      this.validateNumericArray(paramName, array, options);
    }
  }

  /**
   * Validate numeric array with statistical checks
   * @private
   */
  validateNumericArray(paramName, array, options = {}) {
    // Check for all zeros
    if (options.nonZero && array.every(x => x === 0)) {
      throw new ValidationError(paramName, array, 'all zeros not allowed');
    }

    // Check for negative values
    if (options.positive && array.some(x => x < 0)) {
      throw new ValidationError(paramName, array, 'negative values not allowed');
    }

    // Check for non-positive values
    if (options.strictlyPositive && array.some(x => x <= 0)) {
      throw new ValidationError(paramName, array, 'non-positive values not allowed');
    }

    // Check variance
    if (options.requireVariance) {
      const mean = array.reduce((a, b) => a + b, 0) / array.length;
      const variance = array.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / array.length;
      if (variance === 0) {
        throw new ValidationError(paramName, array, 'zero variance not allowed');
      }
    }

    // Check sum
    if (options.sumToOne) {
      const sum = array.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 1e-10) {
        throw new ValidationError(paramName, array, `must sum to 1 (actual: ${sum})`);
      }
    }
  }

  /**
   * Validate matrix data
   * @private
   */
  validateMatrix(paramName, matrix, options = {}) {
    if (!Array.isArray(matrix)) {
      throw new ValidationError(paramName, matrix, 'not a matrix');
    }

    if (matrix.length === 0) {
      if (options.allowEmpty) return;
      throw new ValidationError(paramName, matrix, 'empty matrix not allowed');
    }

    const numCols = matrix[0].length;

    // Check rectangular shape
    for (let i = 0; i < matrix.length; i++) {
      if (!Array.isArray(matrix[i])) {
        throw new ValidationError(
          `${paramName}[${i}]`,
          matrix[i],
          'matrix row must be array'
        );
      }
      if (matrix[i].length !== numCols) {
        throw new ValidationError(
          paramName,
          matrix,
          `inconsistent row lengths (row ${i}: ${matrix[i].length}, expected: ${numCols})`
        );
      }
    }

    // Check dimensions
    if (options.rows && matrix.length !== options.rows) {
      throw new ValidationError(
        paramName,
        matrix,
        `incorrect rows (expected ${options.rows}, got ${matrix.length})`
      );
    }

    if (options.cols && numCols !== options.cols) {
      throw new ValidationError(
        paramName,
        matrix,
        `incorrect columns (expected ${options.cols}, got ${numCols})`
      );
    }

    // Check square matrix
    if (options.square && matrix.length !== numCols) {
      throw new ValidationError(
        paramName,
        matrix,
        `not square (${matrix.length}x${numCols})`
      );
    }

    // Check symmetric matrix
    if (options.symmetric) {
      if (!options.square && matrix.length !== numCols) {
        throw new ValidationError(paramName, matrix, 'symmetric matrix must be square');
      }
      for (let i = 0; i < matrix.length; i++) {
        for (let j = i + 1; j < numCols; j++) {
          if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) {
            throw new ValidationError(
              paramName,
              matrix,
              `not symmetric at [${i}][${j}]`
            );
          }
        }
      }
    }

    // Check positive definite
    if (options.positiveDefinite) {
      if (!this.isPositiveDefinite(matrix)) {
        throw new ValidationError(paramName, matrix, 'not positive definite');
      }
    }

    // Check correlation matrix properties
    if (options.isCorrelation) {
      this.validateCorrelationMatrix(paramName, matrix);
    }
  }

  /**
   * Validate correlation matrix
   * @private
   */
  validateCorrelationMatrix(paramName, matrix) {
    const n = matrix.length;

    // Must be square
    if (matrix.some(row => row.length !== n)) {
      throw new ValidationError(paramName, matrix, 'correlation matrix must be square');
    }

    // Check diagonal elements are 1
    for (let i = 0; i < n; i++) {
      if (Math.abs(matrix[i][i] - 1) > 1e-10) {
        throw new ValidationError(
          paramName,
          matrix,
          `diagonal element [${i}][${i}] must be 1 (got ${matrix[i][i]})`
        );
      }
    }

    // Check off-diagonal elements are in [-1, 1]
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && (matrix[i][j] < -1 || matrix[i][j] > 1)) {
          throw new ValidationError(
            paramName,
            matrix,
            `correlation [${i}][${j}] out of range (${matrix[i][j]})`
          );
        }
      }
    }

    // Check symmetry
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) {
          throw new ValidationError(
            paramName,
            matrix,
            `not symmetric at [${i}][${j}]`
          );
        }
      }
    }
  }

  /**
   * Check if matrix is positive definite
   * @private
   */
  isPositiveDefinite(matrix) {
    try {
      // Attempt Cholesky decomposition
      const n = matrix.length;
      const L = Array(n).fill(null).map(() => Array(n).fill(0));

      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
          let sum = 0;
          for (let k = 0; k < j; k++) {
            sum += L[i][k] * L[j][k];
          }

          if (i === j) {
            const diag = matrix[i][i] - sum;
            if (diag <= 0) return false;
            L[i][j] = Math.sqrt(diag);
          } else {
            L[i][j] = (matrix[i][j] - sum) / L[j][j];
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize value for logging (remove sensitive data)
   * @private
   */
  sanitizeForLogging(value) {
    if (value === null || value === undefined) return value;

    // For arrays, limit to first 5 elements
    if (Array.isArray(value)) {
      return value.length > 5
        ? [...value.slice(0, 5), `... (${value.length} total)`]
        : value;
    }

    // For objects, remove potentially sensitive keys
    if (typeof value === 'object') {
      const sanitized = {};
      const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];

      for (const [key, val] of Object.entries(value)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = val;
        }
      }
      return sanitized;
    }

    return value;
  }

  /**
   * Generate unique validation ID
   * @private
   */
  generateValidationId() {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create validation result object
   * @private
   */
  createValidationResult(valid, paramName, value, error = null) {
    return {
      valid,
      paramName,
      value: this.sanitizeForLogging(value),
      error,
      timestamp: new Date().toISOString(),
      validatorVersion: '1.0.0'
    };
  }

  /**
   * Update performance metrics
   * @private
   */
  updatePerformanceMetrics(duration, success) {
    this.performanceMetrics.totalValidations++;
    if (!success) {
      this.performanceMetrics.failedValidations++;
    }

    // Update rolling average
    const currentAvg = this.performanceMetrics.avgValidationTime;
    const totalValidations = this.performanceMetrics.totalValidations;
    this.performanceMetrics.avgValidationTime =
      (currentAvg * (totalValidations - 1) + duration) / totalValidations;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      successRate: this.performanceMetrics.totalValidations > 0
        ? (this.performanceMetrics.totalValidations - this.performanceMetrics.failedValidations)
          / this.performanceMetrics.totalValidations
        : 0
    };
  }

  /**
   * Reset validator state
   */
  reset() {
    this.validationCache.clear();
    this.performanceMetrics = {
      totalValidations: 0,
      failedValidations: 0,
      avgValidationTime: 0
    };
  }
}

// Export singleton instance for convenience
export default new StatisticalDataValidator({
  strictMode: true,
  auditConfig: {
    enabled: true,
    level: 'info'
  }
});