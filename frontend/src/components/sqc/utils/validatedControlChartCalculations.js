/**
 * Validated Statistical Quality Control (SQC) Module
 * Enhanced with enterprise-grade validation, error recovery, and audit logging
 *
 * @module ValidatedSQCCalculations
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

// Import original SQC functions
import * as sqcCalculations from './controlChartCalculations';

/**
 * Validation schemas for SQC parameters
 */
const SQC_SCHEMAS = {
  SUBGROUP_DATA: {
    data: {
      required: true,
      type: 'array',
      minLength: 2,
      elementType: 'array'
    }
  },
  INDIVIDUAL_DATA: {
    data: {
      required: true,
      type: 'array',
      elementType: 'float',
      minLength: 2,
      maxLength: 100000
    },
    mrSpan: {
      required: false,
      type: 'integer',
      min: 2,
      max: 10,
      default: 2
    }
  },
  P_CHART: {
    defects: {
      required: true,
      type: 'array',
      elementType: 'integer',
      minLength: 2,
      min: 0
    },
    sampleSizes: {
      required: true,
      type: 'array',
      elementType: 'integer',
      minLength: 2,
      min: 1
    }
  },
  C_CHART: {
    counts: {
      required: true,
      type: 'array',
      elementType: 'integer',
      minLength: 2,
      min: 0
    }
  },
  WESTERN_ELECTRIC: {
    values: {
      required: true,
      type: 'array',
      elementType: 'float',
      minLength: 15  // Minimum for all rules to be applicable
    },
    cl: {
      required: true,
      type: 'float'
    },
    ucl: {
      required: true,
      type: 'float'
    },
    lcl: {
      required: true,
      type: 'float'
    }
  },
  PROCESS_CAPABILITY: {
    data: {
      required: true,
      type: 'array',
      elementType: 'float',
      minLength: 30,  // Minimum for reliable capability analysis
      maxLength: 100000
    },
    usl: {
      required: true,
      type: 'float'
    },
    lsl: {
      required: true,
      type: 'float'
    }
  },
  CUSUM: {
    data: {
      required: true,
      type: 'array',
      elementType: 'float',
      minLength: 5
    },
    target: {
      required: true,
      type: 'float'
    },
    k: {
      required: true,
      type: 'float',
      min: 0,
      excludeZero: true
    },
    h: {
      required: true,
      type: 'float',
      min: 0,
      excludeZero: true
    }
  },
  EWMA: {
    data: {
      required: true,
      type: 'array',
      elementType: 'float',
      minLength: 5
    },
    target: {
      required: true,
      type: 'float'
    },
    lambda: {
      required: false,
      type: 'float',
      min: 0,
      max: 1,
      excludeZero: true,
      excludeOne: false,
      default: 0.2
    },
    L: {
      required: false,
      type: 'float',
      min: 1,
      max: 6,
      default: 3
    }
  }
};

/**
 * Validate subgroup data structure
 * @private
 */
async function validateSubgroupData(data) {
  if (!Array.isArray(data) || data.length < 2) {
    throw new ValidationError('data', data, 'must have at least 2 subgroups');
  }

  const subgroupSize = data[0].length;
  if (subgroupSize < 2 || subgroupSize > 25) {
    throw new ValidationError('subgroupSize', subgroupSize,
      'must be between 2 and 25');
  }

  // Check all subgroups have same size
  for (let i = 0; i < data.length; i++) {
    if (!Array.isArray(data[i])) {
      throw new ValidationError(`data[${i}]`, data[i], 'must be an array');
    }

    if (data[i].length !== subgroupSize) {
      throw new ValidationError(`data[${i}]`, data[i],
        `inconsistent subgroup size (expected ${subgroupSize}, got ${data[i].length})`);
    }

    // Validate each value
    for (let j = 0; j < data[i].length; j++) {
      if (!isFinite(data[i][j])) {
        throw new ValidationError(`data[${i}][${j}]`, data[i][j],
          'must be a finite number');
      }
    }
  }

  return true;
}

/**
 * Validated X-bar R chart calculation
 * @param {Array<Array<number>>} data - Subgroups of measurements
 * @returns {Promise<object>} Control limits and statistics
 */
export const calculateXbarRLimits = createValidatedCalculation(
  async (params) => {
    const startTime = performance.now();

    // Additional subgroup validation
    await validateSubgroupData(params.data);

    // Calculate limits
    const result = sqcCalculations.calculateXbarRLimits(params.data);

    // Validate results
    if (result.xbar.ucl <= result.xbar.lcl) {
      throw new Error('Invalid X-bar limits: UCL must be greater than LCL');
    }

    if (result.r.ucl < 0 || result.r.lcl < 0) {
      throw new Error('Invalid R chart limits: cannot be negative');
    }

    // Log calculation
    auditLogger.logCalculation('XBAR_R_CHART',
      {
        numSubgroups: params.data.length,
        subgroupSize: params.data[0].length
      },
      {
        xbarUCL: result.xbar.ucl,
        xbarCL: result.xbar.cl,
        xbarLCL: result.xbar.lcl,
        rUCL: result.r.ucl,
        rCL: result.r.cl,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  SQC_SCHEMAS.SUBGROUP_DATA
);

/**
 * Validated X-bar S chart calculation
 * @param {Array<Array<number>>} data - Subgroups of measurements
 * @returns {Promise<object>} Control limits and statistics
 */
export const calculateXbarSLimits = createValidatedCalculation(
  async (params) => {
    const startTime = performance.now();

    // Additional subgroup validation
    await validateSubgroupData(params.data);

    // Subgroup size should be >= 10 for S chart
    if (params.data[0].length < 10) {
      console.warn('X-bar S chart is recommended for subgroup size >= 10');
    }

    // Calculate limits
    const result = sqcCalculations.calculateXbarSLimits(params.data);

    // Validate results
    if (result.xbar.ucl <= result.xbar.lcl) {
      throw new Error('Invalid X-bar limits: UCL must be greater than LCL');
    }

    if (result.s.ucl < 0 || result.s.lcl < 0) {
      throw new Error('Invalid S chart limits: cannot be negative');
    }

    // Log calculation
    auditLogger.logCalculation('XBAR_S_CHART',
      {
        numSubgroups: params.data.length,
        subgroupSize: params.data[0].length
      },
      {
        xbarUCL: result.xbar.ucl,
        xbarCL: result.xbar.cl,
        xbarLCL: result.xbar.lcl,
        sUCL: result.s.ucl,
        sCL: result.s.cl,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  SQC_SCHEMAS.SUBGROUP_DATA
);

/**
 * Validated I-MR chart calculation
 * @param {Array<number>} data - Individual measurements
 * @param {number} [mrSpan] - Moving range span
 * @returns {Promise<object>} Control limits and statistics
 */
export const calculateIMRLimits = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    if (params.data.length < params.mrSpan) {
      throw new ValidationError('data', params.data,
        `need at least ${params.mrSpan} points for MR span of ${params.mrSpan}`);
    }

    // Calculate limits
    const result = sqcCalculations.calculateIMRLimits(
      params.data,
      params.mrSpan || 2
    );

    // Validate results
    if (result.i.ucl <= result.i.lcl) {
      throw new Error('Invalid I chart limits: UCL must be greater than LCL');
    }

    // Log calculation
    auditLogger.logCalculation('I_MR_CHART',
      {
        dataPoints: params.data.length,
        mrSpan: params.mrSpan || 2
      },
      {
        iUCL: result.i.ucl,
        iCL: result.i.cl,
        iLCL: result.i.lcl,
        mrUCL: result.mr.ucl,
        mrCL: result.mr.cl,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  SQC_SCHEMAS.INDIVIDUAL_DATA
);

/**
 * Validated p-chart calculation
 * @param {Array<number>} defects - Number of defects
 * @param {Array<number>} sampleSizes - Sample sizes
 * @returns {Promise<object>} Control limits and statistics
 */
export const calculatePChartLimits = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    if (params.defects.length !== params.sampleSizes.length) {
      throw new ValidationError('defects', params.defects,
        'must have same length as sampleSizes');
    }

    // Check defects don't exceed sample sizes
    for (let i = 0; i < params.defects.length; i++) {
      if (params.defects[i] > params.sampleSizes[i]) {
        throw new ValidationError(`defects[${i}]`, params.defects[i],
          `cannot exceed sample size (${params.sampleSizes[i]})`);
      }
    }

    // Calculate limits
    const result = sqcCalculations.calculatePChartLimits(
      params.defects,
      params.sampleSizes
    );

    // Validate results
    if (result.statistics.avgProportion < 0 || result.statistics.avgProportion > 1) {
      throw new Error('Invalid average proportion: must be between 0 and 1');
    }

    // Log calculation
    auditLogger.logCalculation('P_CHART',
      {
        numSamples: params.defects.length,
        totalDefects: result.statistics.totalDefects,
        totalSamples: result.statistics.totalSamples
      },
      {
        avgProportion: result.statistics.avgProportion,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  SQC_SCHEMAS.P_CHART
);

/**
 * Validated c-chart calculation
 * @param {Array<number>} counts - Count of defects
 * @returns {Promise<object>} Control limits and statistics
 */
export const calculateCChartLimits = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Calculate limits
    const result = sqcCalculations.calculateCChartLimits(params.counts);

    // Validate results
    if (result.ucl < 0) {
      throw new Error('Invalid c-chart UCL: cannot be negative');
    }

    if (result.lcl < 0) {
      result.lcl = 0; // LCL cannot be negative for count data
    }

    // Log calculation
    auditLogger.logCalculation('C_CHART',
      {
        numSamples: params.counts.length,
        avgCount: result.statistics.avgCount
      },
      {
        ucl: result.ucl,
        cl: result.cl,
        lcl: result.lcl,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  SQC_SCHEMAS.C_CHART
);

/**
 * Validated Western Electric rules application
 * @param {Array<number>} values - Data points
 * @param {number} cl - Center line
 * @param {number} ucl - Upper control limit
 * @param {number} lcl - Lower control limit
 * @returns {Promise<Array>} Rule violations
 */
export const applyWesternElectricRules = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    if (params.ucl <= params.cl) {
      throw new ValidationError('ucl', params.ucl, 'must be greater than center line');
    }

    if (params.lcl >= params.cl) {
      throw new ValidationError('lcl', params.lcl, 'must be less than center line');
    }

    // Apply rules
    const violations = sqcCalculations.applyWesternElectricRules(
      params.values,
      params.cl,
      params.ucl,
      params.lcl
    );

    // Remove duplicate violations (same points flagged by multiple rules)
    const uniqueViolations = violations.filter((v, i, arr) =>
      i === arr.findIndex(v2 =>
        v.rule === v2.rule &&
        JSON.stringify(v.points) === JSON.stringify(v2.points)
      )
    );

    // Log calculation
    auditLogger.logCalculation('WESTERN_ELECTRIC_RULES',
      {
        dataPoints: params.values.length,
        cl: params.cl,
        ucl: params.ucl,
        lcl: params.lcl
      },
      {
        violationCount: uniqueViolations.length,
        rulesTriggered: [...new Set(uniqueViolations.map(v => v.rule))],
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return uniqueViolations;
  },
  SQC_SCHEMAS.WESTERN_ELECTRIC
);

/**
 * Validated process capability calculation
 * @param {Array<number>} data - Process measurements
 * @param {number} usl - Upper specification limit
 * @param {number} lsl - Lower specification limit
 * @returns {Promise<object>} Process capability indices
 */
export const calculateProcessCapability = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Additional validation
    if (params.usl <= params.lsl) {
      throw new ValidationError('usl', params.usl,
        'must be greater than lower specification limit');
    }

    // Check if data is within reasonable range of specs
    const dataMin = Math.min(...params.data);
    const dataMax = Math.max(...params.data);
    const specRange = params.usl - params.lsl;

    if (dataMax - dataMin > 10 * specRange) {
      console.warn('Data range is much larger than specification range - check for outliers');
    }

    // Calculate capability
    const result = sqcCalculations.calculateProcessCapability(
      params.data,
      params.usl,
      params.lsl
    );

    // Validate results
    if (result.cp < 0) {
      throw new Error('Invalid Cp: cannot be negative');
    }

    // Interpret capability
    let interpretation;
    if (result.cpk >= 1.33) {
      interpretation = 'Capable';
    } else if (result.cpk >= 1.0) {
      interpretation = 'Marginally Capable';
    } else {
      interpretation = 'Not Capable';
    }

    // Add interpretation to result
    result.interpretation = interpretation;

    // Log calculation
    auditLogger.logCalculation('PROCESS_CAPABILITY',
      {
        dataPoints: params.data.length,
        usl: params.usl,
        lsl: params.lsl
      },
      {
        cp: result.cp,
        cpk: result.cpk,
        dpmo: result.performance.dpmo,
        yield: result.performance.yield,
        interpretation,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  SQC_SCHEMAS.PROCESS_CAPABILITY
);

/**
 * Validated CUSUM chart calculation
 * @param {Array<number>} data - Process measurements
 * @param {number} target - Target value
 * @param {number} k - Reference value
 * @param {number} h - Decision interval
 * @returns {Promise<object>} CUSUM chart data
 */
export const calculateCUSUM = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Calculate CUSUM
    const result = sqcCalculations.calculateCUSUM(
      params.data,
      params.target,
      params.k,
      params.h
    );

    // Validate results
    if (result.cPlus.some(v => v < 0) || result.cMinus.some(v => v < 0)) {
      throw new Error('Invalid CUSUM values: cannot be negative');
    }

    // Log calculation
    auditLogger.logCalculation('CUSUM_CHART',
      {
        dataPoints: params.data.length,
        target: params.target,
        k: params.k,
        h: params.h
      },
      {
        signalCount: result.signals.length,
        maxCPlus: Math.max(...result.cPlus),
        maxCMinus: Math.max(...result.cMinus),
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  SQC_SCHEMAS.CUSUM
);

/**
 * Validated EWMA chart calculation
 * @param {Array<number>} data - Process measurements
 * @param {number} target - Target value
 * @param {number} [lambda] - Smoothing parameter
 * @param {number} [L] - Control limit width
 * @returns {Promise<object>} EWMA chart data
 */
export const calculateEWMA = createValidatedCalculation(
  (params) => {
    const startTime = performance.now();

    // Calculate EWMA
    const result = sqcCalculations.calculateEWMA(
      params.data,
      params.target,
      params.lambda || 0.2,
      params.L || 3
    );

    // Validate results
    if (result.values.some(v => !isFinite(v))) {
      throw new Error('Invalid EWMA values: must be finite');
    }

    // Log calculation
    auditLogger.logCalculation('EWMA_CHART',
      {
        dataPoints: params.data.length,
        target: params.target,
        lambda: params.lambda || 0.2,
        L: params.L || 3
      },
      {
        signalCount: result.signals.length,
        finalEWMA: result.values[result.values.length - 1],
        sigma: result.parameters.sigma,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  },
  SQC_SCHEMAS.EWMA
);

/**
 * Validated Shewhart limits calculation
 * @param {Array<number>} data - Individual measurements
 * @param {number} [k] - Number of standard deviations
 * @returns {Promise<object>} Control limits
 */
export async function calculateShewhartLimits(data, k = 3) {
  // Validate inputs
  await validateDataArray(data, {
    minLength: 2,
    elementType: 'float'
  });

  if (k <= 0 || k > 6) {
    throw new ValidationError('k', k, 'must be between 0 and 6');
  }

  return executeWithRecovery(() => {
    const startTime = performance.now();

    // Calculate limits
    const result = sqcCalculations.calculateShewhartLimits(data, k);

    // Validate results
    if (result.ucl <= result.lcl) {
      throw new Error('Invalid Shewhart limits: UCL must be greater than LCL');
    }

    // Log calculation
    auditLogger.logCalculation('SHEWHART_LIMITS',
      {
        dataPoints: data.length,
        k
      },
      {
        ucl: result.ucl,
        cl: result.cl,
        lcl: result.lcl,
        sigma: result.sigma,
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return result;
  }, {
    fallbackValue: {
      ucl: 0,
      cl: 0,
      lcl: 0,
      sigma: 0
    },
    maxRetries: 2
  });
}

/**
 * Get validated control constants
 * @param {number} n - Subgroup size
 * @returns {Promise<object>} Control constants
 */
export async function getControlConstants(n) {
  // Validate subgroup size
  if (!Number.isInteger(n) || n < 2 || n > 100) {
    throw new ValidationError('n', n, 'must be integer between 2 and 100');
  }

  return executeWithRecovery(() => {
    const constants = sqcCalculations.getControlConstants(n);

    // Validate constants
    const requiredKeys = ['A2', 'd2'];
    for (const key of requiredKeys) {
      if (!(key in constants) || !isFinite(constants[key])) {
        throw new Error(`Invalid constant ${key}`);
      }
    }

    // Log retrieval
    auditLogger.logCalculation('GET_CONTROL_CONSTANTS',
      { subgroupSize: n },
      constants,
      performance.now()
    );

    return constants;
  }, {
    fallbackValue: sqcCalculations.CONTROL_CHART_CONSTANTS[5], // Default to n=5
    maxRetries: 1
  });
}

/**
 * Batch SQC calculations
 * @param {Array<object>} requests - Array of calculation requests
 * @returns {Promise<object>} Results
 */
export async function batchSQCCalculations(requests) {
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

      switch (request.chartType) {
        case 'XBAR_R':
          result = await calculateXbarRLimits(request.data);
          break;

        case 'XBAR_S':
          result = await calculateXbarSLimits(request.data);
          break;

        case 'I_MR':
          result = await calculateIMRLimits(request.data, request.mrSpan);
          break;

        case 'P_CHART':
          result = await calculatePChartLimits(request.defects, request.sampleSizes);
          break;

        case 'C_CHART':
          result = await calculateCChartLimits(request.counts);
          break;

        case 'PROCESS_CAPABILITY':
          result = await calculateProcessCapability(
            request.data,
            request.usl,
            request.lsl
          );
          break;

        case 'CUSUM':
          result = await calculateCUSUM(
            request.data,
            request.target,
            request.k,
            request.h
          );
          break;

        case 'EWMA':
          result = await calculateEWMA(
            request.data,
            request.target,
            request.lambda,
            request.L
          );
          break;

        case 'WESTERN_ELECTRIC':
          result = await applyWesternElectricRules(
            request.values,
            request.cl,
            request.ucl,
            request.lcl
          );
          break;

        default:
          throw new ValidationError('chartType', request.chartType, 'invalid chart type');
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
  auditLogger.logCalculation('BATCH_SQC_CALCULATION',
    {
      totalCalculations: requests.length,
      chartTypes: requests.map(r => r.chartType)
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
 * Comprehensive SQC analysis
 * Runs multiple chart types on the same data
 * @param {Array<number>|Array<Array<number>>} data - Process data
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Comprehensive analysis results
 */
export async function comprehensiveSQCAnalysis(data, options = {}) {
  const startTime = performance.now();
  const results = {};

  try {
    // Determine data type
    const isSubgroupData = Array.isArray(data[0]);

    if (isSubgroupData) {
      // Validate subgroup data
      await validateSubgroupData(data);

      // X-bar R chart
      results.xbarR = await calculateXbarRLimits({ data });

      // X-bar S chart (if subgroup size >= 10)
      if (data[0].length >= 10) {
        results.xbarS = await calculateXbarSLimits({ data });
      }

    } else {
      // Individual data
      await validateDataArray(data, {
        minLength: 2,
        elementType: 'float'
      });

      // I-MR chart
      results.iMR = await calculateIMRLimits({ data });

      // Shewhart limits
      results.shewhart = await calculateShewhartLimits(data);

      // CUSUM (if target provided)
      if (options.target !== undefined) {
        const sigma = results.iMR.statistics.estimatedSigma;
        results.cusum = await calculateCUSUM({
          data,
          target: options.target,
          k: options.k || 0.5 * sigma,
          h: options.h || 4 * sigma
        });
      }

      // EWMA (if target provided)
      if (options.target !== undefined) {
        results.ewma = await calculateEWMA({
          data,
          target: options.target,
          lambda: options.lambda,
          L: options.L
        });
      }

      // Process capability (if specs provided)
      if (options.usl !== undefined && options.lsl !== undefined && data.length >= 30) {
        results.processCapability = await calculateProcessCapability({
          data,
          usl: options.usl,
          lsl: options.lsl
        });
      }
    }

    // Western Electric rules
    if (results.iMR) {
      results.westernElectric = await applyWesternElectricRules({
        values: data,
        cl: results.iMR.i.cl,
        ucl: results.iMR.i.ucl,
        lcl: results.iMR.i.lcl
      });
    } else if (results.xbarR) {
      results.westernElectric = await applyWesternElectricRules({
        values: results.xbarR.xbar.values,
        cl: results.xbarR.xbar.cl,
        ucl: results.xbarR.xbar.ucl,
        lcl: results.xbarR.xbar.lcl
      });
    }

    // Log comprehensive analysis
    auditLogger.logCalculation('COMPREHENSIVE_SQC_ANALYSIS',
      {
        dataType: isSubgroupData ? 'subgroups' : 'individuals',
        dataPoints: isSubgroupData ? data.length : data.length,
        options
      },
      {
        chartsGenerated: Object.keys(results),
        executionTime: performance.now() - startTime
      },
      performance.now() - startTime
    );

    return {
      results,
      summary: {
        dataType: isSubgroupData ? 'subgroups' : 'individuals',
        chartsGenerated: Object.keys(results),
        inControl: !results.westernElectric || results.westernElectric.length === 0,
        capability: results.processCapability?.interpretation || 'Not assessed'
      }
    };

  } catch (error) {
    // Log error
    auditLogger.logError(error, {
      operation: 'comprehensiveSQCAnalysis',
      dataLength: Array.isArray(data) ? data.length : 0
    });

    throw error;
  }
}

/**
 * Export all validated functions
 */
export default {
  // Variables control charts
  calculateXbarRLimits,
  calculateXbarSLimits,
  calculateIMRLimits,
  calculateShewhartLimits,

  // Attributes control charts
  calculatePChartLimits,
  calculateCChartLimits,

  // Advanced control charts
  calculateCUSUM,
  calculateEWMA,

  // Analysis tools
  applyWesternElectricRules,
  calculateProcessCapability,

  // Utilities
  getControlConstants,

  // Batch operations
  batchSQCCalculations,
  comprehensiveSQCAnalysis,

  // Schemas for external use
  SQC_SCHEMAS
};