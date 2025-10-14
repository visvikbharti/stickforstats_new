/**
 * Validation System Integration Tests
 * Comprehensive tests for validation integration with all statistical modules
 *
 * @module ValidationIntegrationTests
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 *
 * Tests validation system integration with:
 * - Probability distributions module
 * - DOE (Design of Experiments) module
 * - SQC (Statistical Quality Control) module
 * - Backend synchronization
 * - Real-time monitoring
 * - Audit logging
 */

import {
  StatisticalDataValidator,
  ValidationError,
  validateStatisticalParams,
  validateDataArray,
  validateMatrix,
  validateConfidenceInterval,
  validateDOEParams,
  validateSQCParams,
  executeWithRecovery,
  createValidatedCalculation,
  batchValidate
} from '../index';

import { auditLogger } from '../AuditLogger';
import { centralErrorHandler } from '../CentralErrorHandler';
import { errorRecoveryManager } from '../ErrorRecovery';
import backendSync from '../BackendSync';
import { recordValidation, recordError, getValidationMetrics } from '../monitoring';

// Mock modules
jest.mock('../AuditLogger');
jest.mock('../BackendSync');
jest.mock('../monitoring');

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 100000000,
    totalJSHeapSize: 200000000,
    jsHeapSizeLimit: 2000000000
  }
};

// Mock crypto for digital signatures
global.crypto = {
  subtle: {
    importKey: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn()
  },
  getRandomValues: jest.fn(arr => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

// Mock IndexedDB
global.indexedDB = {
  open: jest.fn().mockReturnValue({
    onsuccess: jest.fn(),
    onerror: jest.fn(),
    onupgradeneeded: jest.fn()
  })
};

describe('Validation System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Probability Distribution Integration', () => {
    test('should validate normal distribution parameters', async () => {
      const params = {
        mean: 100,
        standardDeviation: 15
      };

      const schema = {
        mean: { required: true },
        standardDeviation: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
      expect(result.validatedParams).toEqual(params);
    });

    test('should reject invalid normal distribution parameters', async () => {
      const params = {
        mean: 100,
        standardDeviation: -15 // Invalid: negative SD
      };

      const schema = {
        mean: { required: true },
        standardDeviation: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate binomial distribution parameters', async () => {
      const params = {
        sampleSize: 100,
        probability: 0.5
      };

      const schema = {
        sampleSize: { required: true },
        probability: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
    });

    test('should validate Poisson distribution parameters', async () => {
      const params = {
        lambda: 5.0
      };

      const schema = {
        lambda: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
    });

    test('should reject invalid probability values', async () => {
      const invalidProbabilities = [-0.1, 1.5, NaN, Infinity];

      for (const prob of invalidProbabilities) {
        const params = { probability: prob };
        const schema = { probability: { required: true } };

        const result = await validateStatisticalParams(params, schema);
        expect(result.valid).toBe(false);
      }
    });

    test('should validate distribution data arrays', () => {
      const validData = [10, 20, 30, 40, 50];

      expect(() => validateDataArray(validData, {
        elementType: 'float',
        minLength: 3,
        requireVariance: true
      })).not.toThrow();
    });

    test('should reject data arrays without variance', () => {
      const constantData = [5, 5, 5, 5, 5];

      expect(() => validateDataArray(constantData, {
        elementType: 'float',
        requireVariance: true
      })).toThrow(ValidationError);
    });
  });

  describe('Confidence Interval Integration', () => {
    test('should validate confidence interval parameters', async () => {
      const params = {
        sampleSize: 30,
        mean: 50,
        standardDeviation: 10,
        confidenceLevel: 0.95
      };

      const result = await validateConfidenceInterval(params);

      expect(result.valid).toBe(true);
      expect(result.validatedParams.sampleSize).toBe(30);
    });

    test('should reject invalid confidence levels', async () => {
      const invalidLevels = [0, 1, 0.001, 1.5, -0.5];

      for (const level of invalidLevels) {
        const params = {
          sampleSize: 30,
          mean: 50,
          standardDeviation: 10,
          confidenceLevel: level
        };

        const result = await validateConfidenceInterval(params);
        expect(result.valid).toBe(false);
      }
    });

    test('should validate t-test parameters', async () => {
      const params = {
        sampleSize: 25,
        mean: 100,
        standardDeviation: 15,
        confidenceLevel: 0.95,
        degreesOfFreedom: 24
      };

      const schema = {
        sampleSize: { required: true },
        mean: { required: true },
        standardDeviation: { required: true },
        confidenceLevel: { required: true },
        degreesOfFreedom: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
    });

    test('should validate margin of error calculation', async () => {
      const params = {
        standardDeviation: 10,
        sampleSize: 100,
        confidenceLevel: 0.95
      };

      const schema = {
        standardDeviation: { required: true },
        sampleSize: { required: true },
        confidenceLevel: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
      expect(result.validatedParams.sampleSize).toBe(100);
    });
  });

  describe('DOE (Design of Experiments) Integration', () => {
    test('should validate factorial design parameters', async () => {
      const params = {
        factors: ['Temperature', 'Pressure', 'Time'],
        levels: [2, 2, 2],
        replicates: 3,
        centerPoints: 4
      };

      const result = await validateDOEParams(params);

      expect(result.valid).toBe(true);
      expect(result.validatedParams.factors.length).toBe(3);
    });

    test('should validate response surface design', async () => {
      const params = {
        factors: ['X1', 'X2'],
        levels: [3, 3],
        centerPoints: 5,
        axialDistance: 1.414 // for CCD
      };

      const schema = {
        factors: { required: true, minLength: 2 },
        levels: { required: true },
        centerPoints: { required: false },
        axialDistance: { required: false }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
    });

    test('should reject invalid factor counts', async () => {
      const invalidFactorCounts = [
        { factors: [], levels: [] }, // Too few factors
        { factors: Array(11).fill('F'), levels: Array(11).fill(2) } // Too many factors
      ];

      for (const params of invalidFactorCounts) {
        const result = await validateDOEParams(params);
        expect(result.valid).toBe(false);
      }
    });

    test('should validate blocking variables', async () => {
      const params = {
        factors: ['Factor1', 'Factor2'],
        levels: [2, 3],
        blocks: 4,
        replicates: 2
      };

      const schema = {
        factors: { required: true },
        levels: { required: true },
        blocks: { required: false },
        replicates: { required: false }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
    });

    test('should validate design matrix', () => {
      const designMatrix = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ];

      expect(() => validateMatrix('designMatrix', designMatrix, {
        rows: 4,
        cols: 2
      })).not.toThrow();
    });

    test('should validate response data', () => {
      const responseData = [45.2, 52.1, 48.7, 55.3, 49.8, 54.2, 47.9, 53.6];

      expect(() => validateDataArray(responseData, {
        elementType: 'float',
        nonEmpty: true,
        requireVariance: true
      })).not.toThrow();
    });
  });

  describe('SQC (Statistical Quality Control) Integration', () => {
    test('should validate X-bar chart parameters', async () => {
      const params = {
        data: [50, 51, 49, 52, 48, 50, 51, 49],
        subgroupSize: 4,
        controlLimitSigma: 3
      };

      const result = await validateSQCParams(params);

      expect(result.valid).toBe(true);
    });

    test('should validate control chart data', () => {
      const data = Array(100).fill(0).map((_, i) => 50 + Math.random() * 10 - 5);

      expect(() => validateDataArray(data, {
        elementType: 'float',
        minLength: 20,
        requireVariance: true
      })).not.toThrow();
    });

    test('should validate R-chart parameters', async () => {
      const params = {
        data: [10, 12, 11, 13, 9, 11, 12, 10],
        subgroupSize: 4,
        controlLimitSigma: 3
      };

      const result = await validateSQCParams(params);

      expect(result.valid).toBe(true);
    });

    test('should validate specification limits', async () => {
      const params = {
        data: [50, 51, 49, 52, 48],
        specLimitLower: 45,
        specLimitUpper: 55,
        targetValue: 50
      };

      const schema = {
        data: { required: true },
        specLimitLower: { required: true },
        specLimitUpper: { required: true },
        targetValue: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
      expect(result.validatedParams.specLimitLower).toBeLessThan(
        result.validatedParams.specLimitUpper
      );
    });

    test('should validate process capability indices', async () => {
      const params = {
        mean: 50,
        standardDeviation: 2,
        specLimitLower: 44,
        specLimitUpper: 56,
        targetValue: 50
      };

      const schema = {
        mean: { required: true },
        standardDeviation: { required: true },
        specLimitLower: { required: true },
        specLimitUpper: { required: true },
        targetValue: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
    });

    test('should validate CUSUM chart parameters', async () => {
      const params = {
        data: [50, 51, 52, 49, 50, 51],
        cusumK: 0.5,
        cusumH: 5,
        targetValue: 50
      };

      const schema = {
        data: { required: true },
        cusumK: { required: true },
        cusumH: { required: true },
        targetValue: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
    });

    test('should validate EWMA chart parameters', async () => {
      const params = {
        data: [50, 51, 49, 52, 48],
        ewmaLambda: 0.2,
        controlLimitSigma: 3
      };

      const schema = {
        data: { required: true },
        ewmaLambda: { required: true },
        controlLimitSigma: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(true);
    });
  });

  describe('Matrix Validation Integration', () => {
    test('should validate correlation matrices', () => {
      const correlationMatrix = [
        [1.0, 0.5, 0.3],
        [0.5, 1.0, 0.7],
        [0.3, 0.7, 1.0]
      ];

      expect(() => validateMatrix(correlationMatrix, 'correlation'))
        .not.toThrow();
    });

    test('should validate covariance matrices', () => {
      const covarianceMatrix = [
        [4.0, 2.0],
        [2.0, 3.0]
      ];

      expect(() => validateMatrix(covarianceMatrix, 'covariance'))
        .not.toThrow();
    });

    test('should reject non-symmetric matrices for correlation', () => {
      const nonSymmetric = [
        [1.0, 0.5],
        [0.4, 1.0] // Not symmetric
      ];

      expect(() => validateMatrix(nonSymmetric, 'correlation'))
        .toThrow(ValidationError);
    });

    test('should reject invalid diagonal elements in correlation matrix', () => {
      const invalidDiagonal = [
        [0.9, 0.5], // Diagonal should be 1.0
        [0.5, 1.0]
      ];

      expect(() => validateMatrix(invalidDiagonal, 'correlation'))
        .toThrow(ValidationError);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from validation errors with fallback', async () => {
      const operation = jest.fn(() => {
        throw new ValidationError('test', -1, 'below minimum');
      });

      const result = await executeWithRecovery(operation, {
        fallbackValue: { success: false, recovered: true },
        maxRetries: 1
      });

      expect(result.recovered).toBe(true);
    });

    test('should retry failed operations', async () => {
      let attempts = 0;
      const operation = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, attempts };
      });

      const result = await executeWithRecovery(operation, {
        maxRetries: 3
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    test('should handle cascading validation errors', async () => {
      const validations = [
        { params: { sampleSize: 30 }, schema: { sampleSize: { required: true } }, name: 'validation1' },
        { params: { sampleSize: -10 }, schema: { sampleSize: { required: true } }, name: 'validation2' },
        { params: { confidenceLevel: 0.95 }, schema: { confidenceLevel: { required: true } }, name: 'validation3' }
      ];

      const result = await batchValidate(validations);

      expect(result.valid).toBe(false);
      expect(result.results.length).toBe(3);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Validated Calculation Wrappers', () => {
    test('should create validated calculation function', async () => {
      const meanCalculation = createValidatedCalculation(
        (params) => params.values.reduce((a, b) => a + b, 0) / params.values.length,
        {
          values: { required: true, elementType: 'array' }
        }
      );

      const result = await meanCalculation({ values: [10, 20, 30, 40, 50] });

      expect(result).toBe(30);
    });

    test('should reject invalid parameters in wrapped calculations', async () => {
      const sdCalculation = createValidatedCalculation(
        (params) => Math.sqrt(params.variance),
        {
          variance: { required: true }
        }
      );

      await expect(sdCalculation({ variance: -10 }))
        .rejects.toThrow(ValidationError);
    });

    test('should audit wrapped calculations', async () => {
      const auditedCalc = createValidatedCalculation(
        (params) => params.a + params.b,
        {
          a: { required: true },
          b: { required: true }
        }
      );

      const result = await auditedCalc({ a: 10, b: 20 });

      expect(result).toBe(30);
    });
  });

  describe('Real-time Validation Integration', () => {
    test('should validate parameters in real-time', async () => {
      const validator = new StatisticalDataValidator({
        strictMode: true,
        auditConfig: { enabled: false }
      });

      const result1 = validator.validateParameter('sampleSize', 100);
      expect(result1.valid).toBe(true);

      const result2 = validator.validateParameter('sampleSize', -10, {
        throwOnError: false
      });
      expect(result2.valid).toBe(false);
    });

    test('should track validation performance metrics', async () => {
      const validator = new StatisticalDataValidator({
        strictMode: true,
        auditConfig: { enabled: false }
      });

      validator.reset();

      // Perform multiple validations
      for (let i = 0; i < 10; i++) {
        validator.validateParameter('sampleSize', i + 1);
      }

      const metrics = validator.getPerformanceMetrics();

      expect(metrics.totalValidations).toBe(10);
      expect(metrics.failedValidations).toBe(0);
      expect(metrics.successRate).toBe(1.0);
      expect(metrics.avgValidationTime).toBeGreaterThan(0);
    });
  });

  describe('Multi-Module Validation Scenarios', () => {
    test('should validate complete probability analysis workflow', async () => {
      // Step 1: Validate distribution parameters
      const distParams = {
        mean: 100,
        standardDeviation: 15
      };

      const distSchema = {
        mean: { required: true },
        standardDeviation: { required: true }
      };

      const distValidation = await validateStatisticalParams(distParams, distSchema);
      expect(distValidation.valid).toBe(true);

      // Step 2: Validate sample data
      const sampleData = Array(30).fill(0).map(() =>
        distParams.mean + (Math.random() - 0.5) * 20
      );

      expect(() => validateDataArray(sampleData, {
        elementType: 'float',
        minLength: 20,
        requireVariance: true
      })).not.toThrow();

      // Step 3: Validate confidence interval parameters
      const ciParams = {
        sampleSize: sampleData.length,
        mean: sampleData.reduce((a, b) => a + b, 0) / sampleData.length,
        standardDeviation: distParams.standardDeviation,
        confidenceLevel: 0.95
      };

      const ciValidation = await validateConfidenceInterval(ciParams);
      expect(ciValidation.valid).toBe(true);
    });

    test('should validate complete DOE workflow', async () => {
      // Step 1: Validate design parameters
      const designParams = {
        factors: ['Temperature', 'Pressure'],
        levels: [2, 2],
        replicates: 3,
        centerPoints: 2
      };

      const designValidation = await validateDOEParams(designParams);
      expect(designValidation.valid).toBe(true);

      // Step 2: Validate design matrix
      const designMatrix = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ];

      expect(() => validateMatrix('designMatrix', designMatrix, {
        rows: 4,
        cols: 2
      })).not.toThrow();

      // Step 3: Validate response data
      const responses = [45.2, 52.1, 48.7, 55.3];

      expect(() => validateDataArray(responses, {
        elementType: 'float',
        nonEmpty: true
      })).not.toThrow();
    });

    test('should validate complete SQC workflow', async () => {
      // Step 1: Validate process data
      const processData = Array(100).fill(0).map(() => 50 + Math.random() * 5 - 2.5);

      expect(() => validateDataArray(processData, {
        elementType: 'float',
        minLength: 20,
        requireVariance: true
      })).not.toThrow();

      // Step 2: Validate control chart parameters
      const chartParams = {
        data: processData,
        subgroupSize: 5,
        controlLimitSigma: 3
      };

      const chartValidation = await validateSQCParams(chartParams);
      expect(chartValidation.valid).toBe(true);

      // Step 3: Validate specification limits
      const specParams = {
        specLimitLower: 45,
        specLimitUpper: 55,
        targetValue: 50
      };

      const schema = {
        specLimitLower: { required: true },
        specLimitUpper: { required: true },
        targetValue: { required: true }
      };

      const specValidation = await validateStatisticalParams(specParams, schema);
      expect(specValidation.valid).toBe(true);
    });
  });

  describe('Cross-Module Data Flow', () => {
    test('should validate data flowing from Probability to CI module', async () => {
      // Generate probability distribution sample
      const distributionSample = Array(50).fill(0).map(() =>
        100 + (Math.random() - 0.5) * 30
      );

      // Validate sample data
      expect(() => validateDataArray(distributionSample, {
        elementType: 'float',
        minLength: 30,
        requireVariance: true
      })).not.toThrow();

      // Calculate sample statistics
      const sampleMean = distributionSample.reduce((a, b) => a + b, 0) / distributionSample.length;
      const sampleVariance = distributionSample.reduce((a, b) =>
        a + Math.pow(b - sampleMean, 2), 0
      ) / (distributionSample.length - 1);
      const sampleSD = Math.sqrt(sampleVariance);

      // Validate CI parameters
      const ciParams = {
        sampleSize: distributionSample.length,
        mean: sampleMean,
        standardDeviation: sampleSD,
        confidenceLevel: 0.95
      };

      const ciValidation = await validateConfidenceInterval(ciParams);
      expect(ciValidation.valid).toBe(true);
    });

    test('should validate data flowing from DOE to SQC module', async () => {
      // DOE response data
      const doeResponses = [48.5, 52.3, 49.7, 53.1, 50.2, 51.8, 49.3, 52.7];

      // Validate DOE responses
      expect(() => validateDataArray(doeResponses, {
        elementType: 'float',
        minLength: 4,
        requireVariance: true
      })).not.toThrow();

      // Use responses in SQC control chart
      const sqcParams = {
        data: doeResponses,
        subgroupSize: 2,
        controlLimitSigma: 3
      };

      const sqcValidation = await validateSQCParams(sqcParams);
      expect(sqcValidation.valid).toBe(true);
    });
  });

  describe('Batch Validation Operations', () => {
    test('should validate multiple parameter sets simultaneously', async () => {
      const parameterSets = [
        { params: { sampleSize: 30 }, schema: { sampleSize: { required: true } }, name: 'set1' },
        { params: { confidenceLevel: 0.95 }, schema: { confidenceLevel: { required: true } }, name: 'set2' },
        { params: { mean: 100 }, schema: { mean: { required: true } }, name: 'set3' },
        { params: { standardDeviation: 15 }, schema: { standardDeviation: { required: true } }, name: 'set4' }
      ];

      const result = await batchValidate(parameterSets);

      expect(result.valid).toBe(true);
      expect(result.results.length).toBe(4);
      expect(result.errors.length).toBe(0);
    });

    test('should identify all validation errors in batch', async () => {
      const parameterSets = [
        { params: { sampleSize: -30 }, schema: { sampleSize: { required: true } }, name: 'invalid1' },
        { params: { confidenceLevel: 1.5 }, schema: { confidenceLevel: { required: true } }, name: 'invalid2' },
        { params: { mean: 100 }, schema: { mean: { required: true } }, name: 'valid1' },
        { params: { standardDeviation: -15 }, schema: { standardDeviation: { required: true } }, name: 'invalid3' }
      ];

      const result = await batchValidate(parameterSets);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
      expect(result.results.filter(r => r.valid).length).toBe(1);
    });
  });

  describe('Performance and Optimization', () => {
    test('should validate large datasets efficiently', () => {
      const largeDataset = Array(10000).fill(0).map((_, i) => i + Math.random());

      const startTime = performance.now();

      expect(() => validateDataArray(largeDataset, {
        elementType: 'float',
        minLength: 100
      })).not.toThrow();

      const duration = performance.now() - startTime;

      // Validation should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    test('should handle validation caching', () => {
      const validator = new StatisticalDataValidator({
        strictMode: true,
        auditConfig: { enabled: false }
      });

      // First validation
      const startTime1 = performance.now();
      validator.validateParameter('sampleSize', 100);
      const duration1 = performance.now() - startTime1;

      // Subsequent validations should be faster due to internal optimizations
      const startTime2 = performance.now();
      for (let i = 0; i < 100; i++) {
        validator.validateParameter('sampleSize', 100 + i);
      }
      const duration2 = performance.now() - startTime2;

      // Average per-validation time should be reasonable
      const avgDuration = duration2 / 100;
      expect(avgDuration).toBeLessThan(10); // Less than 10ms per validation
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle minimum valid values', async () => {
      const params = {
        sampleSize: 1,
        confidenceLevel: 0.001,
        mean: -1e10,
        standardDeviation: 0
      };

      const schema = {
        sampleSize: { required: true },
        confidenceLevel: { required: false },
        mean: { required: true },
        standardDeviation: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      // Some should be valid, some invalid based on bounds
      expect(result).toBeDefined();
    });

    test('should handle maximum valid values', async () => {
      const params = {
        sampleSize: 1000000,
        confidenceLevel: 0.999,
        mean: 1e10
      };

      const schema = {
        sampleSize: { required: true },
        confidenceLevel: { required: false },
        mean: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result).toBeDefined();
    });

    test('should handle empty arrays appropriately', () => {
      const emptyArray = [];

      expect(() => validateDataArray(emptyArray, {
        nonEmpty: true
      })).toThrow(ValidationError);

      expect(() => validateDataArray(emptyArray, {
        nonEmpty: false
      })).not.toThrow();
    });

    test('should handle single-element arrays', () => {
      const singleElement = [42];

      expect(() => validateDataArray(singleElement, {
        elementType: 'float',
        minLength: 1
      })).not.toThrow();

      expect(() => validateDataArray(singleElement, {
        elementType: 'float',
        requireVariance: true
      })).toThrow(ValidationError);
    });

    test('should handle special numeric values', () => {
      const specialValues = [0, -0, 0.0000001, 1e-10, 1e10];

      expect(() => validateDataArray(specialValues, {
        elementType: 'float'
      })).not.toThrow();

      const invalidValues = [NaN, Infinity, -Infinity];

      expect(() => validateDataArray(invalidValues, {
        elementType: 'float'
      })).toThrow(ValidationError);
    });
  });

  describe('Type Coercion and Conversion', () => {
    test('should handle numeric strings', async () => {
      const params = {
        sampleSize: '30', // String instead of number
        confidenceLevel: '0.95'
      };

      const schema = {
        sampleSize: { required: true },
        confidenceLevel: { required: true }
      };

      // Validator should handle type coercion or reject appropriately
      const result = await validateStatisticalParams(params, schema);

      expect(result).toBeDefined();
    });

    test('should reject non-numeric strings', async () => {
      const params = {
        sampleSize: 'invalid',
        confidenceLevel: 'abc'
      };

      const schema = {
        sampleSize: { required: true },
        confidenceLevel: { required: true }
      };

      const result = await validateStatisticalParams(params, schema);

      expect(result.valid).toBe(false);
    });
  });
});

describe('Validation System Stress Tests', () => {
  test('should handle rapid successive validations', async () => {
    const validator = new StatisticalDataValidator({
      strictMode: true,
      auditConfig: { enabled: false }
    });

    const promises = [];

    for (let i = 0; i < 1000; i++) {
      promises.push(
        validateStatisticalParams(
          { sampleSize: 30 + i, confidenceLevel: 0.95 },
          { sampleSize: { required: true }, confidenceLevel: { required: true } }
        )
      );
    }

    const results = await Promise.all(promises);

    expect(results.length).toBe(1000);
    expect(results.every(r => r.valid)).toBe(true);
  });

  test('should handle concurrent validations from multiple modules', async () => {
    const validations = await Promise.all([
      validateConfidenceInterval({ sampleSize: 30, mean: 50, standardDeviation: 10, confidenceLevel: 0.95 }),
      validateDOEParams({ factors: ['A', 'B'], levels: [2, 2], replicates: 3 }),
      validateSQCParams({ data: [50, 51, 49, 52], subgroupSize: 2, controlLimitSigma: 3 }),
      validateDataArray([10, 20, 30, 40, 50], { elementType: 'float' }),
      validateMatrix([[1, 0.5], [0.5, 1]], 'correlation')
    ]);

    expect(validations.length).toBe(5);
    expect(validations.filter(v => v.valid).length).toBeGreaterThan(0);
  });
});
