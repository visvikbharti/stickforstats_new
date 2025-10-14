/**
 * Validated Design of Experiments (DOE) Module
 * Enhanced with enterprise-grade validation, error recovery, and audit logging
 *
 * @module ValidatedDOECalculations
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import {
  validateStatisticalParams,
  validateDataArray,
  executeWithRecovery,
  auditLogger,
  ValidationError,
  createValidatedCalculation,
  validateMatrix
} from '../../../utils/validation';

// Import original DOE functions
import * as doeCalculations from './designCalculations';

/**
 * Validation schemas for DOE parameters
 */
const DOE_SCHEMAS = {
  FACTORIAL_DESIGN: {
    k: {
      required: true,
      type: 'integer',
      min: 1,
      max: 10
    },
    factorNames: {
      required: false,
      type: 'array',
      elementType: 'string',
      unique: true
    }
  },
  CCD_DESIGN: {
    k: {
      required: true,
      type: 'integer',
      min: 2,
      max: 8
    },
    type: {
      required: false,
      type: 'string',
      enum: ['circumscribed', 'inscribed', 'faced'],
      default: 'circumscribed'
    },
    centerPoints: {
      required: false,
      type: 'integer',
      min: 0,
      max: 50,
      default: 3
    }
  },
  EFFECT_CALCULATION: {
    data: {
      required: true,
      type: 'array',
      minLength: 2,
      elementType: 'object'
    },
    factor: {
      required: true,
      type: 'string'
    },
    responseKey: {
      required: false,
      type: 'string',
      default: 'Y'
    }
  },
  ANOVA: {
    data: {
      required: true,
      type: 'array',
      minLength: 3,
      elementType: 'object'
    },
    factors: {
      required: true,
      type: 'array',
      minLength: 1,
      maxLength: 10,
      elementType: 'string'
    },
    responseKey: {
      required: false,
      type: 'string',
      default: 'Y'
    }
  },
  RSM_MODEL: {
    data: {
      required: true,
      type: 'array',
      minLength: 6,  // Minimum for second-order model
      elementType: 'object'
    },
    factors: {
      required: true,
      type: 'array',
      minLength: 2,
      maxLength: 2,  // Current implementation supports 2 factors only
      elementType: 'string'
    },
    responseKey: {
      required: false,
      type: 'string',
      default: 'Y'
    }
  },
  DESIRABILITY: {
    y: {
      required: true,
      type: 'float'
    },
    target: {
      required: true,
      type: 'float'
    },
    tolerance: {
      required: false,
      type: 'float',
      min: 0,
      excludeZero: true
    },
    lower: {
      required: false,
      type: 'float'
    },
    upper: {
      required: false,
      type: 'float'
    }
  }
};

/**
 * Validated full factorial design generation
 * @param {number} k - Number of factors
 * @param {Array<string>} [factorNames] - Optional factor names
 * @returns {Promise<Array>} Design matrix
 */
export const generateFullFactorial = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation for factor names
    if (params.factorNames && params.factorNames.length !== params.k) {
      throw new ValidationError('factorNames', params.factorNames,
        `must have exactly ${params.k} names to match number of factors`);
    }

    // Generate design
    const design = doeCalculations.generateFullFactorial(params.k, params.factorNames);

    // Validate output
    const expectedRuns = Math.pow(2, params.k);
    if (design.length !== expectedRuns) {
      throw new Error(`Invalid design: expected ${expectedRuns} runs, got ${design.length}`);
    }

    // Verify all factors are present
    const factorKeys = params.factorNames ||
      Array.from({ length: params.k }, (_, i) => `X${i + 1}`);

    for (const run of design) {
      for (const key of factorKeys) {
        if (!(key in run)) {
          throw new Error(`Missing factor ${key} in design`);
        }
        if (run[key] !== -1 && run[key] !== 1) {
          throw new Error(`Invalid level for factor ${key}: ${run[key]}`);
        }
      }
    }

    // Log design generation
    auditLogger.logCalculation('FULL_FACTORIAL_DESIGN',
      {
        k: params.k,
        factorNames: params.factorNames
      },
      {
        totalRuns: design.length,
        factors: factorKeys.length,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return design;
  },
  DOE_SCHEMAS.FACTORIAL_DESIGN
);

/**
 * Validated Central Composite Design generation
 * @param {number} k - Number of factors
 * @param {string} [type] - Design type
 * @param {number} [centerPoints] - Number of center points
 * @returns {Promise<object>} CCD design
 */
export const generateCentralComposite = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Generate CCD
    const result = doeCalculations.generateCentralComposite(
      params.k,
      params.type || 'circumscribed',
      params.centerPoints || 3
    );

    // Validate output
    const expectedFactorial = Math.pow(2, params.k);
    const expectedAxial = 2 * params.k;
    const expectedTotal = expectedFactorial + expectedAxial + (params.centerPoints || 3);

    if (result.design.length !== expectedTotal) {
      throw new Error(`Invalid CCD: expected ${expectedTotal} runs, got ${result.design.length}`);
    }

    // Validate alpha for rotatability
    const expectedAlpha = Math.pow(Math.pow(2, params.k), 0.25);
    if (Math.abs(result.alpha - expectedAlpha) > 0.001) {
      throw new Error(`Invalid alpha value: ${result.alpha}`);
    }

    // Log design generation
    auditLogger.logCalculation('CENTRAL_COMPOSITE_DESIGN',
      {
        k: params.k,
        type: params.type || 'circumscribed',
        centerPoints: params.centerPoints || 3
      },
      {
        totalRuns: result.design.length,
        numFactorial: result.numFactorial,
        numAxial: result.numAxial,
        numCenter: result.numCenter,
        alpha: result.alpha,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  DOE_SCHEMAS.CCD_DESIGN
);

/**
 * Validated main effect calculation
 * @param {Array} data - Design matrix with response
 * @param {string} factor - Factor name
 * @param {string} [responseKey] - Response variable name
 * @returns {Promise<number>} Main effect
 */
export const calculateMainEffect = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Validate data structure
    for (const row of params.data) {
      if (!(params.factor in row)) {
        throw new ValidationError('data', params.data,
          `factor ${params.factor} not found in data`);
      }
      if (!(params.responseKey in row)) {
        throw new ValidationError('data', params.data,
          `response ${params.responseKey} not found in data`);
      }
      if (row[params.factor] !== -1 && row[params.factor] !== 1) {
        throw new ValidationError('data', params.data,
          `invalid factor level: ${row[params.factor]} (must be -1 or 1)`);
      }
    }

    // Calculate effect
    const effect = doeCalculations.calculateMainEffect(
      params.data,
      params.factor,
      params.responseKey || 'Y'
    );

    // Validate result
    if (!isFinite(effect)) {
      throw new Error('Invalid effect calculated: not finite');
    }

    // Log calculation
    auditLogger.logCalculation('MAIN_EFFECT',
      {
        dataPoints: params.data.length,
        factor: params.factor,
        responseKey: params.responseKey || 'Y'
      },
      {
        effect,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return effect;
  },
  DOE_SCHEMAS.EFFECT_CALCULATION
);

/**
 * Validated interaction effect calculation
 * @param {Array} data - Design matrix with response
 * @param {string} factor1 - First factor
 * @param {string} factor2 - Second factor
 * @param {string} [responseKey] - Response variable name
 * @returns {Promise<number>} Interaction effect
 */
export async function calculateInteractionEffect(data, factor1, factor2, responseKey = 'Y') {
  // Validate parameters
  const validation = await validateStatisticalParams({
    data,
    factor1,
    factor2,
    responseKey
  }, {
    data: { required: true, type: 'array', minLength: 2 },
    factor1: { required: true, type: 'string' },
    factor2: { required: true, type: 'string' },
    responseKey: { required: false, type: 'string', default: 'Y' }
  });

  if (!validation.valid) {
    throw new ValidationError('params', { data, factor1, factor2 },
      'invalid interaction parameters', { errors: validation.errors });
  }

  // Additional validation
  if (factor1 === factor2) {
    throw new ValidationError('factors', { factor1, factor2 },
      'factors must be different for interaction');
  }

  return executeWithRecovery(() => {
    const startTime = performance.now();

    // Calculate interaction
    const effect = doeCalculations.calculateInteractionEffect(
      data,
      factor1,
      factor2,
      responseKey
    );

    // Validate result
    if (!isFinite(effect)) {
      throw new Error('Invalid interaction effect: not finite');
    }

    // Log calculation
    auditLogger.logCalculation('INTERACTION_EFFECT',
      {
        dataPoints: data.length,
        factor1,
        factor2,
        responseKey
      },
      {
        effect,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return effect;
  }, {
    fallbackValue: 0,
    maxRetries: 2
  });
}

/**
 * Validated ANOVA calculation
 * @param {Array} data - Design matrix with response
 * @param {Array<string>} factors - Factor names
 * @param {string} [responseKey] - Response variable name
 * @returns {Promise<object>} ANOVA table
 */
export const performANOVA = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    const responses = params.data.map(row => row[params.responseKey || 'Y']);
    if (responses.some(r => !isFinite(r))) {
      throw new ValidationError('data', params.data,
        'response values must be finite numbers');
    }

    // Check for sufficient degrees of freedom
    const numEffects = params.factors.length + (params.factors.length * (params.factors.length - 1)) / 2;
    if (params.data.length <= numEffects) {
      throw new ValidationError('data', params.data,
        `insufficient data points for ANOVA (need > ${numEffects})`);
    }

    // Perform ANOVA
    const result = doeCalculations.performANOVA(
      params.data,
      params.factors,
      params.responseKey || 'Y'
    );

    // Validate results
    if (result.RSquared < 0 || result.RSquared > 1) {
      throw new Error(`Invalid R-squared: ${result.RSquared}`);
    }

    if (result.dfError < 0) {
      throw new Error('Negative degrees of freedom for error');
    }

    // Log calculation
    auditLogger.logCalculation('ANOVA',
      {
        dataPoints: params.data.length,
        factors: params.factors,
        responseKey: params.responseKey || 'Y'
      },
      {
        SST: result.SST,
        SSModel: result.SSModel,
        SSE: result.SSE,
        RSquared: result.RSquared,
        dfTotal: result.dfTotal,
        dfModel: result.dfModel,
        dfError: result.dfError,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  DOE_SCHEMAS.ANOVA
);

/**
 * Validated RSM model fitting
 * @param {Array} data - Design matrix with response
 * @param {Array<string>} factors - Factor names (max 2)
 * @param {string} [responseKey] - Response variable name
 * @returns {Promise<object>} Model coefficients
 */
export const fitSecondOrderModel = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation for RSM requirements
    const centerPoints = params.data.filter(row => {
      return params.factors.every(f => Math.abs(row[f]) < 0.01);
    });

    if (centerPoints.length === 0) {
      console.warn('No center points found - model may be less accurate');
    }

    // Fit model
    const result = doeCalculations.fitSecondOrderModel(
      params.data,
      params.factors,
      params.responseKey || 'Y'
    );

    // Validate coefficients
    const coeffKeys = ['b0', 'b1', 'b2', 'b11', 'b22', 'b12'];
    for (const key of coeffKeys) {
      if (!isFinite(result.coefficients[key])) {
        throw new Error(`Invalid coefficient ${key}: ${result.coefficients[key]}`);
      }
    }

    // Log calculation
    auditLogger.logCalculation('RSM_MODEL_FIT',
      {
        dataPoints: params.data.length,
        factors: params.factors,
        responseKey: params.responseKey || 'Y',
        centerPoints: centerPoints.length
      },
      {
        coefficients: result.coefficients,
        equation: result.equation,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  DOE_SCHEMAS.RSM_MODEL
);

/**
 * Validated response prediction
 * @param {object} coefficients - Model coefficients
 * @param {number} x1 - First factor value
 * @param {number} x2 - Second factor value
 * @returns {Promise<number>} Predicted response
 */
export async function predictResponse(coefficients, x1, x2) {
  // Validate inputs
  const validation = await validateStatisticalParams({
    x1,
    x2
  }, {
    x1: { required: true, type: 'float', min: -10, max: 10 },
    x2: { required: true, type: 'float', min: -10, max: 10 }
  });

  if (!validation.valid) {
    throw new ValidationError('params', { x1, x2 },
      'invalid factor values', { errors: validation.errors });
  }

  // Validate coefficients
  const requiredCoeffs = ['b0', 'b1', 'b2', 'b11', 'b22', 'b12'];
  for (const key of requiredCoeffs) {
    if (!(key in coefficients) || !isFinite(coefficients[key])) {
      throw new ValidationError('coefficients', coefficients,
        `missing or invalid coefficient: ${key}`);
    }
  }

  return executeWithRecovery(() => {
    const prediction = doeCalculations.predictResponse(coefficients, x1, x2);

    if (!isFinite(prediction)) {
      throw new Error('Invalid prediction: not finite');
    }

    // Log prediction
    auditLogger.logCalculation('RSM_PREDICTION',
      { x1, x2, coefficients },
      { prediction },
      performance.now()
    );

    return prediction;
  }, {
    fallbackValue: 0,
    maxRetries: 1
  });
}

/**
 * Validated stationary point finding
 * @param {object} coefficients - Model coefficients
 * @returns {Promise<object>} Stationary point
 */
export async function findStationaryPoint(coefficients) {
  // Validate coefficients
  const requiredCoeffs = ['b0', 'b1', 'b2', 'b11', 'b22', 'b12'];
  for (const key of requiredCoeffs) {
    if (!(key in coefficients) || !isFinite(coefficients[key])) {
      throw new ValidationError('coefficients', coefficients,
        `missing or invalid coefficient: ${key}`);
    }
  }

  return executeWithRecovery(() => {
    const result = doeCalculations.findStationaryPoint(coefficients);

    // Validate result
    if (result.type === 'degenerate') {
      console.warn('Degenerate stationary point - model may be ill-conditioned');
    }

    // Log calculation
    auditLogger.logCalculation('STATIONARY_POINT',
      { coefficients },
      result,
      performance.now()
    );

    return result;
  }, {
    fallbackValue: {
      x1: 0,
      x2: 0,
      yPred: 0,
      type: 'unknown'
    },
    maxRetries: 1
  });
}

/**
 * Validated desirability calculation
 * @param {string} type - Desirability type ('target', 'maximize', 'minimize')
 * @param {object} params - Desirability parameters
 * @returns {Promise<number>} Desirability value
 */
export async function calculateDesirability(type, params) {
  // Validate type
  const validTypes = ['target', 'maximize', 'minimize'];
  if (!validTypes.includes(type)) {
    throw new ValidationError('type', type,
      `must be one of: ${validTypes.join(', ')}`);
  }

  // Validate parameters based on type
  let schema;
  switch (type) {
    case 'target':
      schema = {
        y: { required: true, type: 'float' },
        target: { required: true, type: 'float' },
        tolerance: { required: true, type: 'float', min: 0, excludeZero: true }
      };
      break;
    case 'maximize':
      schema = {
        y: { required: true, type: 'float' },
        lower: { required: true, type: 'float' },
        target: { required: true, type: 'float' }
      };
      break;
    case 'minimize':
      schema = {
        y: { required: true, type: 'float' },
        target: { required: true, type: 'float' },
        upper: { required: true, type: 'float' }
      };
      break;
  }

  const validation = await validateStatisticalParams(params, schema);

  if (!validation.valid) {
    throw new ValidationError('params', params,
      'invalid desirability parameters', { errors: validation.errors });
  }

  // Additional validation
  if (type === 'maximize' && params.lower >= params.target) {
    throw new ValidationError('params', params,
      'lower must be less than target for maximize');
  }

  if (type === 'minimize' && params.target >= params.upper) {
    throw new ValidationError('params', params,
      'target must be less than upper for minimize');
  }

  return executeWithRecovery(() => {
    let desirability;

    switch (type) {
      case 'target':
        desirability = doeCalculations.targetDesirability(
          params.y,
          params.target,
          params.tolerance
        );
        break;
      case 'maximize':
        desirability = doeCalculations.maximizeDesirability(
          params.y,
          params.lower,
          params.target
        );
        break;
      case 'minimize':
        desirability = doeCalculations.minimizeDesirability(
          params.y,
          params.target,
          params.upper
        );
        break;
    }

    // Validate result
    if (desirability < 0 || desirability > 1) {
      throw new Error(`Invalid desirability: ${desirability}`);
    }

    // Log calculation
    auditLogger.logCalculation('DESIRABILITY',
      { type, ...params },
      { desirability },
      performance.now()
    );

    return desirability;
  }, {
    fallbackValue: 0,
    maxRetries: 1
  });
}

/**
 * Validated overall desirability calculation
 * @param {Array<number>} desirabilities - Individual desirabilities
 * @returns {Promise<number>} Overall desirability
 */
export async function calculateOverallDesirability(desirabilities) {
  // Validate array
  await validateDataArray(desirabilities, {
    minLength: 1,
    elementType: 'float'
  });

  // Validate each desirability is in [0, 1]
  for (let i = 0; i < desirabilities.length; i++) {
    if (desirabilities[i] < 0 || desirabilities[i] > 1) {
      throw new ValidationError(`desirabilities[${i}]`, desirabilities[i],
        'must be between 0 and 1');
    }
  }

  return executeWithRecovery(() => {
    const overall = doeCalculations.overallDesirability(desirabilities);

    // Log calculation
    auditLogger.logCalculation('OVERALL_DESIRABILITY',
      {
        count: desirabilities.length,
        min: Math.min(...desirabilities),
        max: Math.max(...desirabilities)
      },
      { overall },
      performance.now()
    );

    return overall;
  }, {
    fallbackValue: 0,
    maxRetries: 1
  });
}

/**
 * Batch DOE calculations
 * @param {Array<object>} requests - Array of calculation requests
 * @returns {Promise<object>} Results
 */
export async function batchDOECalculations(requests) {
  if (!Array.isArray(requests)) {
    throw new ValidationError('requests', requests, 'must be an array');
  }

  if (requests.length > 50) {
    throw new ValidationError('requests', requests, 'batch size too large (max 50)');
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];

    try {
      let result;

      switch (request.operation) {
        case 'factorial':
          result = await generateFullFactorial(request.k, request.factorNames);
          break;

        case 'ccd':
          result = await generateCentralComposite(
            request.k,
            request.type,
            request.centerPoints
          );
          break;

        case 'mainEffect':
          result = await calculateMainEffect(
            request.data,
            request.factor,
            request.responseKey
          );
          break;

        case 'interaction':
          result = await calculateInteractionEffect(
            request.data,
            request.factor1,
            request.factor2,
            request.responseKey
          );
          break;

        case 'anova':
          result = await performANOVA(
            request.data,
            request.factors,
            request.responseKey
          );
          break;

        case 'rsm':
          result = await fitSecondOrderModel(
            request.data,
            request.factors,
            request.responseKey
          );
          break;

        default:
          throw new ValidationError('operation', request.operation, 'invalid operation');
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
  auditLogger.logCalculation('BATCH_DOE_CALCULATION',
    {
      totalCalculations: requests.length,
      operations: requests.map(r => r.operation)
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
      total: requests.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length
    }
  };
}

/**
 * Export all validated functions
 */
export default {
  // Design generation
  generateFullFactorial,
  generateCentralComposite,

  // Effect calculations
  calculateMainEffect,
  calculateInteractionEffect,

  // Analysis
  performANOVA,

  // Response Surface Methodology
  fitSecondOrderModel,
  predictResponse,
  findStationaryPoint,

  // Desirability
  calculateDesirability,
  calculateOverallDesirability,

  // Batch operations
  batchDOECalculations,

  // Schemas for external use
  DOE_SCHEMAS
};