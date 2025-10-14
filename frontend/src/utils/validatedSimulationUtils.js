/**
 * Validated Simulation Utilities for Confidence Intervals
 * Enhanced with enterprise-grade validation, error recovery, and audit logging
 *
 * @module ValidatedSimulationUtils
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
  centralErrorHandler
} from './validation';

// Import original simulation functions
import * as simulationUtils from './simulationUtils';

/**
 * Validation schemas for confidence interval parameters
 */
const CI_SCHEMAS = {
  MEAN_T: {
    data: {
      required: true,
      type: 'array',
      elementType: 'float',
      minLength: 2,
      maxLength: 100000,
      requireVariance: true
    },
    confidenceLevel: {
      required: true,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: true
    }
  },
  MEAN_Z: {
    data: {
      required: true,
      type: 'array',
      elementType: 'float',
      minLength: 1,
      maxLength: 100000
    },
    confidenceLevel: {
      required: true,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: true
    },
    sigma: {
      required: false,
      type: 'float',
      min: 0,
      excludeZero: true,
      max: 1e10
    }
  },
  PROPORTION: {
    successes: {
      required: true,
      type: 'integer',
      min: 0
    },
    n: {
      required: true,
      type: 'integer',
      min: 1,
      max: 1000000
    },
    confidenceLevel: {
      required: true,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: true
    }
  },
  SIMULATION: {
    intervalType: {
      required: true,
      type: 'string',
      enum: ['MEAN_T', 'MEAN_Z', 'VARIANCE', 'STD_DEV', 'mean']
    },
    confidenceLevel: {
      required: true,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: true
    },
    sampleSize: {
      required: true,
      type: 'integer',
      min: 2,
      max: 10000
    },
    numSimulations: {
      required: true,
      type: 'integer',
      min: 1,
      max: 100000
    },
    distribution: {
      required: true,
      type: 'string',
      enum: ['NORMAL', 'UNIFORM', 'LOGNORMAL', 'GAMMA', 'T', 'BINOMIAL', 'POISSON', 'MIXTURE']
    },
    distParams: {
      required: true,
      type: 'object'
    }
  }
};

/**
 * Validated mean t-interval calculation
 * @param {number[]} data - Sample data
 * @param {number} confidenceLevel - Confidence level (0 to 1)
 * @returns {Promise<object>} Confidence interval
 */
export const calculateMeanTInterval = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation for minimum sample size
    if (params.data.length < 2) {
      throw new ValidationError('data', params.data,
        'at least 2 observations required for t-interval');
    }

    // Check for variance
    const mean = params.data.reduce((sum, x) => sum + x, 0) / params.data.length;
    const variance = params.data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (params.data.length - 1);

    if (variance === 0) {
      throw new ValidationError('data', params.data,
        'zero variance - confidence interval undefined');
    }

    // Calculate interval
    const result = simulationUtils.calculateMeanTInterval(params.data, params.confidenceLevel);

    // Validate result
    if (result.lower >= result.upper) {
      throw new Error('Invalid interval: lower bound >= upper bound');
    }

    // Log calculation
    auditLogger.logCalculation('MEAN_T_INTERVAL',
      {
        sampleSize: params.data.length,
        confidenceLevel: params.confidenceLevel,
        sampleMean: mean,
        sampleStd: Math.sqrt(variance)
      },
      {
        lower: result.lower,
        upper: result.upper,
        marginOfError: result.margin
      },
      performance.now() - startTime
    );

    return result;
  },
  CI_SCHEMAS.MEAN_T
);

/**
 * Validated mean z-interval calculation
 * @param {number[]} data - Sample data
 * @param {number} confidenceLevel - Confidence level (0 to 1)
 * @param {number} [sigma] - Known population standard deviation
 * @returns {Promise<object>} Confidence interval
 */
export const calculateMeanZInterval = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // If sigma not provided, require large sample
    if (!params.sigma && params.data.length < 30) {
      throw new ValidationError('data', params.data,
        'z-interval requires n >= 30 when sigma is unknown');
    }

    // Calculate interval
    const result = simulationUtils.calculateMeanZInterval(
      params.data,
      params.confidenceLevel,
      params.sigma
    );

    // Validate result
    if (result.lower >= result.upper) {
      throw new Error('Invalid interval: lower bound >= upper bound');
    }

    // Log calculation
    auditLogger.logCalculation('MEAN_Z_INTERVAL',
      {
        sampleSize: params.data.length,
        confidenceLevel: params.confidenceLevel,
        knownSigma: params.sigma || 'estimated'
      },
      {
        lower: result.lower,
        upper: result.upper,
        marginOfError: result.margin
      },
      performance.now() - startTime
    );

    return result;
  },
  CI_SCHEMAS.MEAN_Z
);

/**
 * Validated variance interval calculation
 * @param {number[]} data - Sample data
 * @param {number} confidenceLevel - Confidence level (0 to 1)
 * @returns {Promise<object>} Confidence interval for variance
 */
export const calculateVarianceInterval = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    if (params.data.length < 2) {
      throw new ValidationError('data', params.data,
        'at least 2 observations required for variance interval');
    }

    // Calculate interval
    const result = simulationUtils.calculateVarianceInterval(params.data, params.confidenceLevel);

    // Validate result
    if (result.lower < 0) {
      throw new Error('Invalid interval: variance cannot be negative');
    }

    if (result.lower >= result.upper) {
      throw new Error('Invalid interval: lower bound >= upper bound');
    }

    // Log calculation
    auditLogger.logCalculation('VARIANCE_INTERVAL',
      {
        sampleSize: params.data.length,
        confidenceLevel: params.confidenceLevel,
        sampleVariance: result.variance
      },
      {
        lower: result.lower,
        upper: result.upper
      },
      performance.now() - startTime
    );

    return result;
  },
  CI_SCHEMAS.MEAN_T // Uses same schema as mean interval
);

/**
 * Validated standard deviation interval calculation
 * @param {number[]} data - Sample data
 * @param {number} confidenceLevel - Confidence level (0 to 1)
 * @returns {Promise<object>} Confidence interval for standard deviation
 */
export const calculateStdDevInterval = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    if (params.data.length < 2) {
      throw new ValidationError('data', params.data,
        'at least 2 observations required for standard deviation interval');
    }

    // Calculate interval
    const result = simulationUtils.calculateStdDevInterval(params.data, params.confidenceLevel);

    // Validate result
    if (result.lower < 0) {
      throw new Error('Invalid interval: standard deviation cannot be negative');
    }

    if (result.lower >= result.upper) {
      throw new Error('Invalid interval: lower bound >= upper bound');
    }

    // Log calculation
    auditLogger.logCalculation('STD_DEV_INTERVAL',
      {
        sampleSize: params.data.length,
        confidenceLevel: params.confidenceLevel,
        sampleStd: result.std
      },
      {
        lower: result.lower,
        upper: result.upper
      },
      performance.now() - startTime
    );

    return result;
  },
  CI_SCHEMAS.MEAN_T // Uses same schema as mean interval
);

/**
 * Validated proportion interval calculation (Wald method)
 * @param {number} successes - Number of successes
 * @param {number} n - Sample size
 * @param {number} confidenceLevel - Confidence level (0 to 1)
 * @returns {Promise<object>} Confidence interval for proportion
 */
export const calculateProportionWaldInterval = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    if (params.successes > params.n) {
      throw new ValidationError('successes', params.successes,
        `cannot exceed sample size (${params.n})`);
    }

    // Check for extreme proportions
    const p = params.successes / params.n;
    if ((p === 0 || p === 1) && params.n < 30) {
      console.warn('Wald interval may be inaccurate for extreme proportions with small samples');
    }

    // Calculate interval
    const result = simulationUtils.calculateProportionWaldInterval(
      params.successes,
      params.n,
      params.confidenceLevel
    );

    // Log calculation
    auditLogger.logCalculation('PROPORTION_WALD_INTERVAL',
      {
        successes: params.successes,
        n: params.n,
        confidenceLevel: params.confidenceLevel,
        proportion: p
      },
      {
        lower: result.lower,
        upper: result.upper,
        marginOfError: result.margin
      },
      performance.now() - startTime
    );

    return result;
  },
  CI_SCHEMAS.PROPORTION
);

/**
 * Validated proportion interval calculation (Wilson score method)
 * @param {number} successes - Number of successes
 * @param {number} n - Sample size
 * @param {number} confidenceLevel - Confidence level (0 to 1)
 * @returns {Promise<object>} Confidence interval for proportion
 */
export const calculateProportionWilsonInterval = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    if (params.successes > params.n) {
      throw new ValidationError('successes', params.successes,
        `cannot exceed sample size (${params.n})`);
    }

    // Calculate interval
    const result = simulationUtils.calculateProportionWilsonInterval(
      params.successes,
      params.n,
      params.confidenceLevel
    );

    // Log calculation
    auditLogger.logCalculation('PROPORTION_WILSON_INTERVAL',
      {
        successes: params.successes,
        n: params.n,
        confidenceLevel: params.confidenceLevel,
        proportion: params.successes / params.n
      },
      {
        lower: result.lower,
        upper: result.upper,
        marginOfError: result.margin
      },
      performance.now() - startTime
    );

    return result;
  },
  CI_SCHEMAS.PROPORTION
);

/**
 * Validated coverage simulation
 * @param {object} params - Simulation parameters
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} Simulation results
 */
export async function runCoverageSimulation(params, onProgress) {
  // Validate parameters
  const validation = await validateStatisticalParams(params, CI_SCHEMAS.SIMULATION);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid simulation parameters', {
      errors: validation.errors
    });
  }

  // Additional validation for distribution parameters
  const distParamSchemas = {
    NORMAL: {
      mean: { required: true, type: 'float' },
      std: { required: true, type: 'float', min: 0, excludeZero: true }
    },
    UNIFORM: {
      mean: { required: false, type: 'float' },
      std: { required: false, type: 'float', min: 0 }
    },
    GAMMA: {
      shape: { required: true, type: 'float', min: 0, excludeZero: true },
      scale: { required: true, type: 'float', min: 0, excludeZero: true }
    },
    T: {
      df: { required: true, type: 'integer', min: 1, max: 1000 }
    },
    BINOMIAL: {
      p: { required: true, type: 'float', min: 0, max: 1 },
      n: { required: true, type: 'integer', min: 1 }
    },
    POISSON: {
      lambda: { required: true, type: 'float', min: 0, excludeZero: true, max: 10000 }
    }
  };

  if (distParamSchemas[params.distribution]) {
    const distValidation = await validateStatisticalParams(
      params.distParams,
      distParamSchemas[params.distribution]
    );

    if (!distValidation.valid) {
      throw new ValidationError('distParams', params.distParams,
        `invalid ${params.distribution} distribution parameters`,
        { errors: distValidation.errors }
      );
    }
  }

  // Execute simulation with recovery
  return executeWithRecovery(async () => {
    const startTime = performance.now();

    // Run simulation
    const result = await simulationUtils.runCoverageSimulation(
      validation.validatedParams,
      onProgress
    );

    // Validate results
    if (result.coverage < 0 || result.coverage > 1) {
      throw new Error(`Invalid coverage rate: ${result.coverage}`);
    }

    if (result.averageWidth < 0) {
      throw new Error(`Invalid average width: ${result.averageWidth}`);
    }

    // Log simulation
    auditLogger.logCalculation('COVERAGE_SIMULATION',
      {
        intervalType: params.intervalType,
        confidenceLevel: params.confidenceLevel,
        sampleSize: params.sampleSize,
        numSimulations: params.numSimulations,
        distribution: params.distribution
      },
      {
        coverage: result.coverage,
        averageWidth: result.averageWidth,
        intervalsStored: result.intervals.length,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  }, {
    maxRetries: 2,
    fallbackValue: {
      intervals: [],
      coverage: 0,
      averageWidth: 0,
      trueValue: 0,
      error: 'Simulation failed'
    }
  });
}

/**
 * Validated sample size simulation
 * @param {object} params - Simulation parameters
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} Simulation results
 */
export async function runSampleSizeSimulation(params, onProgress) {
  // Validate base parameters
  const baseSchema = {
    confidenceLevel: {
      required: true,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: true
    },
    minSampleSize: {
      required: true,
      type: 'integer',
      min: 2,
      max: 10000
    },
    maxSampleSize: {
      required: true,
      type: 'integer',
      min: 2,
      max: 10000
    },
    sampleSizeStep: {
      required: true,
      type: 'integer',
      min: 1,
      max: 1000
    },
    distribution: {
      required: true,
      type: 'string'
    },
    distParams: {
      required: true,
      type: 'object'
    },
    numSimulations: {
      required: true,
      type: 'integer',
      min: 10,
      max: 10000
    }
  };

  const validation = await validateStatisticalParams(params, baseSchema);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid simulation parameters', {
      errors: validation.errors
    });
  }

  // Additional validation
  if (params.minSampleSize >= params.maxSampleSize) {
    throw new ValidationError('minSampleSize', params.minSampleSize,
      'must be less than maxSampleSize');
  }

  // Execute simulation with recovery
  return executeWithRecovery(async () => {
    const startTime = performance.now();

    // Run simulation
    const result = await simulationUtils.runSampleSizeSimulation(
      validation.validatedParams,
      onProgress
    );

    // Validate results
    if (!Array.isArray(result.sampleSizes) || result.sampleSizes.length === 0) {
      throw new Error('Invalid simulation results: no sample sizes generated');
    }

    // Log simulation
    auditLogger.logCalculation('SAMPLE_SIZE_SIMULATION',
      {
        minSampleSize: params.minSampleSize,
        maxSampleSize: params.maxSampleSize,
        step: params.sampleSizeStep,
        numSimulations: params.numSimulations
      },
      {
        sampleSizesEvaluated: result.sampleSizes.length,
        minWidth: Math.min(...result.averageWidths),
        maxWidth: Math.max(...result.averageWidths),
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  }, {
    maxRetries: 2,
    fallbackValue: {
      sampleSizes: [],
      averageWidths: [],
      coverageRates: [],
      error: 'Simulation failed'
    }
  });
}

/**
 * Validated bootstrap simulation
 * @param {object} params - Simulation parameters
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} Simulation results
 */
export async function runBootstrapSimulation(params, onProgress) {
  // Validate parameters
  const schema = {
    sampleSize: {
      required: true,
      type: 'integer',
      min: 5,
      max: 10000
    },
    numBootstraps: {
      required: true,
      type: 'integer',
      min: 100,
      max: 100000
    },
    confidenceLevel: {
      required: true,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: true
    },
    distribution: {
      required: true,
      type: 'string'
    },
    distParams: {
      required: true,
      type: 'object'
    }
  };

  const validation = await validateStatisticalParams(params, schema);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid bootstrap parameters', {
      errors: validation.errors
    });
  }

  // Execute simulation with recovery
  return executeWithRecovery(async () => {
    const startTime = performance.now();

    // Run bootstrap
    const result = await simulationUtils.runBootstrapSimulation(
      validation.validatedParams,
      onProgress
    );

    // Validate results
    if (!Array.isArray(result.bootstrapMeans) ||
        result.bootstrapMeans.length !== params.numBootstraps) {
      throw new Error('Invalid bootstrap results');
    }

    if (result.lower >= result.upper) {
      throw new Error('Invalid bootstrap interval: lower >= upper');
    }

    // Log simulation
    auditLogger.logCalculation('BOOTSTRAP_SIMULATION',
      {
        sampleSize: params.sampleSize,
        numBootstraps: params.numBootstraps,
        confidenceLevel: params.confidenceLevel,
        distribution: params.distribution
      },
      {
        originalMean: result.originalMean,
        bootstrapMean: result.bootstrap_mean,
        bootstrapSE: result.bootstrap_se,
        lower: result.lower,
        upper: result.upper,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  }, {
    maxRetries: 2,
    fallbackValue: {
      bootstrapMeans: [],
      lower: 0,
      upper: 0,
      error: 'Bootstrap failed'
    }
  });
}

/**
 * Validated transformation simulation
 * @param {object} params - Simulation parameters
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} Simulation results
 */
export async function runTransformationSimulation(params, onProgress) {
  // Validate parameters
  const schema = {
    sampleSize: {
      required: true,
      type: 'integer',
      min: 5,
      max: 10000
    },
    numSimulations: {
      required: true,
      type: 'integer',
      min: 10,
      max: 10000
    },
    confidenceLevel: {
      required: true,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: true
    },
    distribution: {
      required: true,
      type: 'string'
    },
    distParams: {
      required: true,
      type: 'object'
    },
    transformation: {
      required: true,
      type: 'string',
      enum: ['LOG', 'SQRT', 'SQUARE', 'INVERSE']
    }
  };

  const validation = await validateStatisticalParams(params, schema);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid transformation parameters', {
      errors: validation.errors
    });
  }

  // Execute simulation with recovery
  return executeWithRecovery(async () => {
    const startTime = performance.now();

    // Run simulation
    const result = await simulationUtils.runTransformationSimulation(
      validation.validatedParams,
      onProgress
    );

    // Validate results
    if (result.original_coverage < 0 || result.original_coverage > 1) {
      throw new Error('Invalid coverage results');
    }

    // Log simulation
    auditLogger.logCalculation('TRANSFORMATION_SIMULATION',
      {
        sampleSize: params.sampleSize,
        numSimulations: params.numSimulations,
        transformation: params.transformation
      },
      {
        originalCoverage: result.original_coverage,
        transformedCoverage: result.transformed_coverage,
        symmetryImprovement: result.symmetry_improvement,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  }, {
    maxRetries: 2,
    fallbackValue: {
      original_coverage: 0,
      transformed_coverage: 0,
      error: 'Transformation simulation failed'
    }
  });
}

/**
 * Validated non-normality simulation
 * @param {object} params - Simulation parameters
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} Simulation results
 */
export async function runNonNormalitySimulation(params, onProgress) {
  // Validate parameters
  const schema = {
    sampleSize: {
      required: true,
      type: 'integer',
      min: 5,
      max: 10000
    },
    numSimulations: {
      required: true,
      type: 'integer',
      min: 10,
      max: 10000
    },
    confidenceLevel: {
      required: true,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: true
    },
    distribution: {
      required: true,
      type: 'string'
    },
    distParams: {
      required: true,
      type: 'object'
    }
  };

  const validation = await validateStatisticalParams(params, schema);

  if (!validation.valid) {
    throw new ValidationError('params', params, 'invalid simulation parameters', {
      errors: validation.errors
    });
  }

  // Execute simulation with recovery
  return executeWithRecovery(async () => {
    const startTime = performance.now();

    // Run simulation
    const result = await simulationUtils.runNonNormalitySimulation(
      validation.validatedParams,
      onProgress
    );

    // Validate results
    if (!Array.isArray(result.interval_types) || result.interval_types.length === 0) {
      throw new Error('Invalid simulation results');
    }

    // Log simulation
    auditLogger.logCalculation('NON_NORMALITY_SIMULATION',
      {
        sampleSize: params.sampleSize,
        numSimulations: params.numSimulations,
        distribution: params.distribution
      },
      {
        methodsCompared: result.interval_types.length,
        observedSkewness: result.observed_skewness,
        observedKurtosis: result.observed_kurtosis,
        normalityPassed: result.normality_test.passed,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  }, {
    maxRetries: 2,
    fallbackValue: {
      interval_types: [],
      distribution_histogram: [],
      error: 'Non-normality simulation failed'
    }
  });
}

/**
 * Calculate statistics with validation
 * @param {number[]} data - Sample data
 * @returns {Promise<object>} Statistics
 */
export async function calculateStats(data) {
  // Validate data array
  await validateDataArray(data, {
    minLength: 1,
    elementType: 'float'
  });

  return executeWithRecovery(() => {
    const stats = simulationUtils.calculateStats(data);

    // Validate results
    if (!isFinite(stats.mean) || !isFinite(stats.std)) {
      throw new Error('Invalid statistics calculated');
    }

    return stats;
  }, {
    fallbackValue: {
      mean: 0,
      std: 0,
      variance: 0,
      n: data.length
    }
  });
}

/**
 * Generate random sample with validation
 * @param {string} distribution - Distribution type
 * @param {object} params - Distribution parameters
 * @param {number} sampleSize - Sample size
 * @returns {Promise<number[]>} Random sample
 */
export async function generateRandomSample(distribution, params, sampleSize) {
  // Validate sample size
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 1000000) {
    throw new ValidationError('sampleSize', sampleSize,
      'must be integer between 1 and 1,000,000');
  }

  // Validate distribution type
  const validDistributions = ['NORMAL', 'UNIFORM', 'LOGNORMAL', 'GAMMA', 'T',
    'BINOMIAL', 'POISSON', 'MIXTURE'];

  if (!validDistributions.includes(distribution)) {
    throw new ValidationError('distribution', distribution,
      `must be one of: ${validDistributions.join(', ')}`);
  }

  return executeWithRecovery(() => {
    const sample = simulationUtils.generateRandomSample(distribution, params, sampleSize);

    // Validate sample
    if (!Array.isArray(sample) || sample.length !== sampleSize) {
      throw new Error('Invalid sample generated');
    }

    // Check for NaN or Infinity
    if (sample.some(x => !isFinite(x))) {
      throw new Error('Sample contains invalid values');
    }

    return sample;
  }, {
    fallbackValue: Array(sampleSize).fill(0),
    maxRetries: 2
  });
}

/**
 * Batch confidence interval calculation
 * @param {Array<object>} requests - Array of CI calculation requests
 * @returns {Promise<object>} Results for all calculations
 */
export async function batchCalculateIntervals(requests) {
  if (!Array.isArray(requests)) {
    throw new ValidationError('requests', requests, 'must be an array');
  }

  if (requests.length > 100) {
    throw new ValidationError('requests', requests, 'batch size too large (max 100)');
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];

    try {
      let result;

      switch (request.type) {
        case 'MEAN_T':
          result = await calculateMeanTInterval(request.data, request.confidenceLevel);
          break;

        case 'MEAN_Z':
          result = await calculateMeanZInterval(
            request.data,
            request.confidenceLevel,
            request.sigma
          );
          break;

        case 'VARIANCE':
          result = await calculateVarianceInterval(request.data, request.confidenceLevel);
          break;

        case 'STD_DEV':
          result = await calculateStdDevInterval(request.data, request.confidenceLevel);
          break;

        case 'PROPORTION_WALD':
          result = await calculateProportionWaldInterval(
            request.successes,
            request.n,
            request.confidenceLevel
          );
          break;

        case 'PROPORTION_WILSON':
          result = await calculateProportionWilsonInterval(
            request.successes,
            request.n,
            request.confidenceLevel
          );
          break;

        default:
          throw new ValidationError('type', request.type, 'invalid interval type');
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
  auditLogger.logCalculation('BATCH_CI_CALCULATION',
    {
      totalCalculations: requests.length,
      types: requests.map(r => r.type)
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
  // Confidence interval calculations
  calculateMeanTInterval,
  calculateMeanZInterval,
  calculateVarianceInterval,
  calculateStdDevInterval,
  calculateProportionWaldInterval,
  calculateProportionWilsonInterval,

  // Simulations
  runCoverageSimulation,
  runSampleSizeSimulation,
  runBootstrapSimulation,
  runTransformationSimulation,
  runNonNormalitySimulation,

  // Utilities
  calculateStats,
  generateRandomSample,

  // Batch operations
  batchCalculateIntervals,

  // Schemas for external use
  CI_SCHEMAS
};