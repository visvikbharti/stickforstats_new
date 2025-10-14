/**
 * Validated Probability Distributions Module
 * Enhanced version with enterprise-grade validation, error recovery, and audit logging
 *
 * @module ValidatedDistributions
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import {
  validateStatisticalParams,
  executeWithRecovery,
  auditLogger,
  ValidationError,
  createValidatedCalculation
} from '../../../utils/validation';

// Import original distribution functions
import * as distributions from './distributions';

/**
 * Validation schemas for distribution parameters
 */
const DISTRIBUTION_SCHEMAS = {
  NORMAL: {
    mean: {
      required: true,
      type: 'float',
      min: -1e10,
      max: 1e10
    },
    std: {
      required: true,
      type: 'float',
      min: 0,
      excludeZero: true,
      max: 1e10
    }
  },
  BINOMIAL: {
    n: {
      required: true,
      type: 'integer',
      min: 1,
      max: 10000
    },
    p: {
      required: true,
      type: 'float',
      min: 0,
      max: 1
    }
  },
  POISSON: {
    lambda: {
      required: true,
      type: 'float',
      min: 0,
      excludeZero: true,
      max: 10000
    }
  },
  EXPONENTIAL: {
    rate: {
      required: true,
      type: 'float',
      min: 0,
      excludeZero: true,
      max: 10000
    }
  }
};

/**
 * Validated Normal PDF calculation
 * @param {number} x - Value to evaluate
 * @param {number} mean - Mean (μ)
 * @param {number} std - Standard deviation (σ)
 * @returns {Promise<number>} PDF value at x
 */
export const normalPdf = createValidatedCalculation(
  (params) => {
    const result = distributions.normalPdf(params.x, params.mean, params.std);

    // Log calculation for audit
    auditLogger.logCalculation('NORMAL_PDF',
      { x: params.x, mean: params.mean, std: params.std },
      { pdf: result },
      performance.now()
    );

    return result;
  },
  {
    x: { required: true, type: 'float' },
    ...DISTRIBUTION_SCHEMAS.NORMAL
  }
);

/**
 * Validated Binomial PMF calculation
 * @param {number} k - Number of successes
 * @param {number} n - Number of trials
 * @param {number} p - Probability of success
 * @returns {Promise<number>} PMF value at k
 */
export const binomialPmf = createValidatedCalculation(
  (params) => {
    // Additional validation: k must be between 0 and n
    if (params.k < 0 || params.k > params.n) {
      throw new ValidationError('k', params.k, `must be between 0 and ${params.n}`);
    }

    if (!Number.isInteger(params.k)) {
      throw new ValidationError('k', params.k, 'must be an integer');
    }

    const result = distributions.binomialPmf(params.k, params.n, params.p);

    // Log calculation
    auditLogger.logCalculation('BINOMIAL_PMF',
      { k: params.k, n: params.n, p: params.p },
      { pmf: result },
      performance.now()
    );

    return result;
  },
  {
    k: { required: true, type: 'integer', min: 0 },
    ...DISTRIBUTION_SCHEMAS.BINOMIAL
  }
);

/**
 * Validated Poisson PMF calculation
 * @param {number} k - Number of events
 * @param {number} lambda - Rate parameter (λ)
 * @returns {Promise<number>} PMF value at k
 */
export const poissonPmf = createValidatedCalculation(
  (params) => {
    if (!Number.isInteger(params.k)) {
      throw new ValidationError('k', params.k, 'must be a non-negative integer');
    }

    const result = distributions.poissonPmf(params.k, params.lambda);

    // Log calculation
    auditLogger.logCalculation('POISSON_PMF',
      { k: params.k, lambda: params.lambda },
      { pmf: result },
      performance.now()
    );

    return result;
  },
  {
    k: { required: true, type: 'integer', min: 0, max: 10000 },
    ...DISTRIBUTION_SCHEMAS.POISSON
  }
);

/**
 * Validated Exponential PDF calculation
 * @param {number} x - Value to evaluate
 * @param {number} rate - Rate parameter (λ)
 * @returns {Promise<number>} PDF value at x
 */
export const exponentialPdf = createValidatedCalculation(
  (params) => {
    if (params.x < 0) {
      return 0; // Exponential is 0 for negative values
    }

    const result = distributions.exponentialPdf(params.x, params.rate);

    // Log calculation
    auditLogger.logCalculation('EXPONENTIAL_PDF',
      { x: params.x, rate: params.rate },
      { pdf: result },
      performance.now()
    );

    return result;
  },
  {
    x: { required: true, type: 'float' },
    ...DISTRIBUTION_SCHEMAS.EXPONENTIAL
  }
);

/**
 * Validated Normal CDF calculation
 * @param {number} x - Value to evaluate
 * @param {number} mean - Mean (μ)
 * @param {number} std - Standard deviation (σ)
 * @returns {Promise<number>} CDF value at x
 */
export const normalCdf = createValidatedCalculation(
  (params) => {
    const result = distributions.normalCdf(params.x, params.mean, params.std);

    // Log calculation
    auditLogger.logCalculation('NORMAL_CDF',
      { x: params.x, mean: params.mean, std: params.std },
      { cdf: result },
      performance.now()
    );

    return result;
  },
  {
    x: { required: true, type: 'float' },
    ...DISTRIBUTION_SCHEMAS.NORMAL
  }
);

/**
 * Validated Exponential CDF calculation
 * @param {number} x - Value to evaluate
 * @param {number} rate - Rate parameter (λ)
 * @returns {Promise<number>} CDF value at x
 */
export const exponentialCdf = createValidatedCalculation(
  (params) => {
    if (params.x < 0) {
      return 0; // CDF is 0 for negative values
    }

    const result = distributions.exponentialCdf(params.x, params.rate);

    // Log calculation
    auditLogger.logCalculation('EXPONENTIAL_CDF',
      { x: params.x, rate: params.rate },
      { cdf: result },
      performance.now()
    );

    return result;
  },
  {
    x: { required: true, type: 'float' },
    ...DISTRIBUTION_SCHEMAS.EXPONENTIAL
  }
);

/**
 * Validated PMF/PDF calculation for multiple values
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @param {number[]} xValues - Array of x values
 * @returns {Promise<object>} { x_values, pmf_pdf_values }
 */
export async function calculatePmfPdf(type, params, xValues) {
  // Validate distribution type
  if (!DISTRIBUTION_SCHEMAS[type]) {
    throw new ValidationError('type', type, 'invalid distribution type');
  }

  // Validate xValues array
  if (!Array.isArray(xValues)) {
    throw new ValidationError('xValues', xValues, 'must be an array');
  }

  if (xValues.length === 0) {
    throw new ValidationError('xValues', xValues, 'array cannot be empty');
  }

  if (xValues.length > 10000) {
    throw new ValidationError('xValues', xValues, 'array too large (max 10000 points)');
  }

  // Validate distribution parameters
  const validation = await validateStatisticalParams(params, DISTRIBUTION_SCHEMAS[type]);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid distribution parameters', {
      errors: validation.errors
    });
  }

  // Execute with recovery
  return executeWithRecovery(() => {
    const startTime = performance.now();
    const result = distributions.calculatePmfPdf(type, validation.validatedParams, xValues);

    // Log calculation
    auditLogger.logCalculation(`${type}_PMF_PDF`,
      {
        type,
        params: validation.validatedParams,
        points: xValues.length
      },
      {
        calculated: result.pmf_pdf_values.length,
        min: Math.min(...result.pmf_pdf_values),
        max: Math.max(...result.pmf_pdf_values)
      },
      performance.now() - startTime
    );

    return result;
  }, {
    fallbackValue: { x_values: xValues, pmf_pdf_values: Array(xValues.length).fill(0) },
    maxRetries: 2
  });
}

/**
 * Validated CDF calculation for multiple values
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @param {number[]} xValues - Array of x values
 * @returns {Promise<object>} { x_values, cdf_values }
 */
export async function calculateCdf(type, params, xValues) {
  // Validate distribution type
  if (!DISTRIBUTION_SCHEMAS[type]) {
    throw new ValidationError('type', type, 'invalid distribution type');
  }

  // Validate xValues
  if (!Array.isArray(xValues)) {
    throw new ValidationError('xValues', xValues, 'must be an array');
  }

  if (xValues.length === 0) {
    throw new ValidationError('xValues', xValues, 'array cannot be empty');
  }

  if (xValues.length > 10000) {
    throw new ValidationError('xValues', xValues, 'array too large (max 10000 points)');
  }

  // Validate distribution parameters
  const validation = await validateStatisticalParams(params, DISTRIBUTION_SCHEMAS[type]);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid distribution parameters', {
      errors: validation.errors
    });
  }

  // Execute with recovery
  return executeWithRecovery(() => {
    const startTime = performance.now();
    const result = distributions.calculateCdf(type, validation.validatedParams, xValues);

    // Validate CDF properties (must be non-decreasing)
    for (let i = 1; i < result.cdf_values.length; i++) {
      if (result.cdf_values[i] < result.cdf_values[i - 1]) {
        throw new Error('CDF values must be non-decreasing');
      }
    }

    // Log calculation
    auditLogger.logCalculation(`${type}_CDF`,
      {
        type,
        params: validation.validatedParams,
        points: xValues.length
      },
      {
        calculated: result.cdf_values.length,
        min: Math.min(...result.cdf_values),
        max: Math.max(...result.cdf_values)
      },
      performance.now() - startTime
    );

    return result;
  }, {
    fallbackValue: { x_values: xValues, cdf_values: Array(xValues.length).fill(0) },
    maxRetries: 2
  });
}

/**
 * Validated random sample generation
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @param {number} size - Sample size
 * @returns {Promise<number[]>} Random sample
 */
export async function generateRandomSample(type, params, size) {
  // Validate distribution type
  if (!DISTRIBUTION_SCHEMAS[type]) {
    throw new ValidationError('type', type, 'invalid distribution type');
  }

  // Validate sample size
  if (!Number.isInteger(size) || size < 1) {
    throw new ValidationError('size', size, 'must be a positive integer');
  }

  if (size > 1000000) {
    throw new ValidationError('size', size, 'sample size too large (max 1,000,000)');
  }

  // Validate distribution parameters
  const validation = await validateStatisticalParams(params, DISTRIBUTION_SCHEMAS[type]);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid distribution parameters', {
      errors: validation.errors
    });
  }

  // Execute with recovery
  return executeWithRecovery(() => {
    const startTime = performance.now();
    const sample = distributions.generateRandomSample(
      type,
      validation.validatedParams,
      size
    );

    // Validate sample properties
    if (sample.length !== size) {
      throw new Error(`Sample size mismatch: expected ${size}, got ${sample.length}`);
    }

    // Calculate sample statistics
    const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
    const variance = sample.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sample.length;

    // Log generation
    auditLogger.logCalculation(`${type}_SAMPLE_GENERATION`,
      {
        type,
        params: validation.validatedParams,
        size
      },
      {
        sampleSize: sample.length,
        sampleMean: mean,
        sampleVariance: variance,
        min: Math.min(...sample),
        max: Math.max(...sample)
      },
      performance.now() - startTime
    );

    return sample;
  }, {
    fallbackValue: Array(size).fill(0),
    maxRetries: 2
  });
}

/**
 * Validated distribution mean calculation
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @returns {Promise<number>} Theoretical mean
 */
export async function getDistributionMean(type, params) {
  // Validate distribution type
  if (!DISTRIBUTION_SCHEMAS[type]) {
    throw new ValidationError('type', type, 'invalid distribution type');
  }

  // Validate distribution parameters
  const validation = await validateStatisticalParams(params, DISTRIBUTION_SCHEMAS[type]);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid distribution parameters', {
      errors: validation.errors
    });
  }

  return executeWithRecovery(() => {
    const mean = distributions.getDistributionMean(type, validation.validatedParams);

    // Log calculation
    auditLogger.logCalculation(`${type}_MEAN`,
      { type, params: validation.validatedParams },
      { mean },
      performance.now()
    );

    return mean;
  }, {
    fallbackValue: 0,
    maxRetries: 1
  });
}

/**
 * Validated distribution variance calculation
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @returns {Promise<number>} Theoretical variance
 */
export async function getDistributionVariance(type, params) {
  // Validate distribution type
  if (!DISTRIBUTION_SCHEMAS[type]) {
    throw new ValidationError('type', type, 'invalid distribution type');
  }

  // Validate distribution parameters
  const validation = await validateStatisticalParams(params, DISTRIBUTION_SCHEMAS[type]);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid distribution parameters', {
      errors: validation.errors
    });
  }

  return executeWithRecovery(() => {
    const variance = distributions.getDistributionVariance(type, validation.validatedParams);

    // Log calculation
    auditLogger.logCalculation(`${type}_VARIANCE`,
      { type, params: validation.validatedParams },
      { variance, stdDev: Math.sqrt(variance) },
      performance.now()
    );

    return variance;
  }, {
    fallbackValue: 0,
    maxRetries: 1
  });
}

/**
 * Batch calculation with validation
 * @param {Array<object>} calculations - Array of calculation requests
 * @returns {Promise<Array>} Results for all calculations
 */
export async function batchCalculate(calculations) {
  if (!Array.isArray(calculations)) {
    throw new ValidationError('calculations', calculations, 'must be an array');
  }

  if (calculations.length > 100) {
    throw new ValidationError('calculations', calculations, 'batch size too large (max 100)');
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < calculations.length; i++) {
    const calc = calculations[i];

    try {
      let result;

      switch (calc.operation) {
        case 'pdf':
        case 'pmf':
          result = await calculatePmfPdf(calc.type, calc.params, calc.xValues);
          break;

        case 'cdf':
          result = await calculateCdf(calc.type, calc.params, calc.xValues);
          break;

        case 'sample':
          result = await generateRandomSample(calc.type, calc.params, calc.size);
          break;

        case 'mean':
          result = await getDistributionMean(calc.type, calc.params);
          break;

        case 'variance':
          result = await getDistributionVariance(calc.type, calc.params);
          break;

        default:
          throw new ValidationError('operation', calc.operation, 'invalid operation');
      }

      results.push({
        index: i,
        success: true,
        result
      });

    } catch (error) {
      errors.push({
        index: i,
        error: error.message
      });

      results.push({
        index: i,
        success: false,
        error: error.message
      });
    }
  }

  // Log batch operation
  auditLogger.logCalculation('BATCH_DISTRIBUTION_CALC',
    {
      totalCalculations: calculations.length,
      operations: calculations.map(c => c.operation)
    },
    {
      successful: results.filter(r => r.success).length,
      failed: errors.length
    },
    performance.now()
  );

  return {
    results,
    errors,
    summary: {
      total: calculations.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length
    }
  };
}

/**
 * Export all validated functions
 */
export default {
  // Individual calculations
  normalPdf,
  binomialPmf,
  poissonPmf,
  exponentialPdf,
  normalCdf,
  exponentialCdf,

  // Bulk calculations
  calculatePmfPdf,
  calculateCdf,

  // Random sampling
  generateRandomSample,

  // Distribution properties
  getDistributionMean,
  getDistributionVariance,

  // Batch operations
  batchCalculate,

  // Schemas for external use
  DISTRIBUTION_SCHEMAS
};