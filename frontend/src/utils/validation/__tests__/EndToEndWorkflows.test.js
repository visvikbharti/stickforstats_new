/**
 * End-to-End Workflow Tests
 * Comprehensive tests for complete user workflows from input through validation,
 * calculation, monitoring, and backend synchronization
 *
 * @module EndToEndWorkflowTests
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 *
 * Tests complete workflows:
 * - User input validation
 * - Statistical calculations
 * - Real-time monitoring
 * - Backend synchronization
 * - Audit logging
 * - Error recovery
 * - UI feedback integration
 */

import {
  validateStatisticalParams,
  validateDataArray,
  validateConfidenceInterval,
  validateDOEParams,
  validateSQCParams,
  executeWithRecovery,
  createValidatedCalculation,
  auditLogger,
  centralErrorHandler,
  ValidationError
} from '../index';

import { recordValidation, recordError, getValidationMetrics, recordComplianceMetric } from '../monitoring';
import backendSync, { syncAuditLog, getSyncStatus, forceSync } from '../BackendSync';
import { useValidation, useFormValidation } from '../../../components/validation/useValidation';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies
jest.mock('../monitoring');
jest.mock('../BackendSync');
jest.mock('../AuditLogger');

// Mock browser APIs
global.fetch = jest.fn();
global.performance = { now: jest.fn(() => Date.now()) };
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

describe('End-to-End Workflow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  describe('Probability Distribution Analysis Workflow', () => {
    test('should complete normal distribution analysis workflow', async () => {
      // Step 1: User inputs distribution parameters
      const userInput = {
        distributionType: 'NORMAL',
        mean: 100,
        standardDeviation: 15,
        sampleSize: 1000
      };

      // Step 2: Validate user inputs
      const validationResult = await validateStatisticalParams(userInput, {
        distributionType: { required: true },
        mean: { required: true },
        standardDeviation: { required: true },
        sampleSize: { required: true }
      });

      expect(validationResult.valid).toBe(true);
      expect(recordValidation).toHaveBeenCalled();

      // Step 3: Generate sample data
      const generateSample = createValidatedCalculation(
        (params) => {
          const sample = [];
          for (let i = 0; i < params.sampleSize; i++) {
            // Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            sample.push(params.mean + z * params.standardDeviation);
          }
          return sample;
        },
        {
          mean: { required: true },
          standardDeviation: { required: true },
          sampleSize: { required: true }
        }
      );

      const sample = await generateSample(validationResult.validatedParams);

      expect(sample).toHaveLength(1000);
      expect(sample.every(x => typeof x === 'number' && isFinite(x))).toBe(true);

      // Step 4: Validate generated sample
      expect(() => validateDataArray(sample, {
        elementType: 'float',
        minLength: 100,
        requireVariance: true
      })).not.toThrow();

      // Step 5: Calculate sample statistics
      const calculateStats = createValidatedCalculation(
        (params) => {
          const data = params.data;
          const n = data.length;
          const mean = data.reduce((sum, x) => sum + x, 0) / n;
          const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
          const stdDev = Math.sqrt(variance);

          return { mean, variance, stdDev, n };
        },
        {
          data: { required: true }
        }
      );

      const stats = await calculateStats({ data: sample });

      expect(stats.mean).toBeCloseTo(100, 0);
      expect(stats.stdDev).toBeCloseTo(15, 0);

      // Step 6: Calculate confidence interval
      const ciParams = {
        sampleSize: stats.n,
        mean: stats.mean,
        standardDeviation: stats.stdDev,
        confidenceLevel: 0.95
      };

      const ciValidation = await validateConfidenceInterval(ciParams);
      expect(ciValidation.valid).toBe(true);

      // Step 7: Verify audit trail
      expect(auditLogger.logCalculation).toHaveBeenCalled();

      // Step 8: Verify monitoring
      expect(recordValidation).toHaveBeenCalledTimes(2);
    });

    test('should handle binomial distribution workflow with error recovery', async () => {
      // Step 1: User inputs (with initial error)
      const invalidInput = {
        distributionType: 'BINOMIAL',
        n: 100,
        p: 1.5 // Invalid probability
      };

      // Step 2: Validate and catch error
      const validation1 = await validateStatisticalParams(invalidInput, {
        distributionType: { required: true },
        n: { required: true },
        p: { required: true }
      });

      expect(validation1.valid).toBe(false);
      expect(validation1.errors.length).toBeGreaterThan(0);

      // Step 3: User corrects input
      const correctedInput = {
        ...invalidInput,
        p: 0.5
      };

      const validation2 = await validateStatisticalParams(correctedInput, {
        distributionType: { required: true },
        n: { required: true },
        p: { required: true }
      });

      expect(validation2.valid).toBe(true);

      // Step 4: Calculate binomial probabilities
      const calculateBinomialPmf = createValidatedCalculation(
        (params) => {
          const { n, p, k } = params;
          // Calculate binomial coefficient
          const binomCoeff = (n, k) => {
            if (k < 0 || k > n) return 0;
            if (k === 0 || k === n) return 1;

            let result = 1;
            for (let i = 1; i <= Math.min(k, n - k); i++) {
              result = result * (n - i + 1) / i;
            }
            return result;
          };

          return binomCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
        },
        {
          n: { required: true },
          p: { required: true },
          k: { required: true }
        }
      );

      const pmf = await calculateBinomialPmf({ n: 100, p: 0.5, k: 50 });

      expect(pmf).toBeGreaterThan(0);
      expect(pmf).toBeLessThanOrEqual(1);

      // Step 5: Verify error recovery was tracked
      expect(recordError).toHaveBeenCalled();
    });

    test('should complete Poisson distribution workflow', async () => {
      // Complete workflow from input to visualization
      const poissonParams = {
        lambda: 5.0,
        maxK: 20
      };

      // Validate parameters
      const validation = await validateStatisticalParams(poissonParams, {
        lambda: { required: true },
        maxK: { required: true }
      });

      expect(validation.valid).toBe(true);

      // Calculate PMF for range
      const calculatePoissonPmfRange = createValidatedCalculation(
        (params) => {
          const { lambda, maxK } = params;
          const pmfValues = [];

          for (let k = 0; k <= maxK; k++) {
            // Poisson PMF: P(X=k) = (λ^k * e^(-λ)) / k!
            const factorial = (n) => {
              if (n === 0 || n === 1) return 1;
              let result = 1;
              for (let i = 2; i <= n; i++) result *= i;
              return result;
            };

            const pmf = (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
            pmfValues.push({ k, pmf });
          }

          return pmfValues;
        },
        {
          lambda: { required: true },
          maxK: { required: true }
        }
      );

      const pmfRange = await calculatePoissonPmfRange(validation.validatedParams);

      expect(pmfRange).toHaveLength(21);
      expect(pmfRange.every(p => p.pmf >= 0 && p.pmf <= 1)).toBe(true);

      // Verify sum of probabilities is approximately 1
      const totalProb = pmfRange.reduce((sum, p) => sum + p.pmf, 0);
      expect(totalProb).toBeCloseTo(1, 1);
    });
  });

  describe('Confidence Interval Calculation Workflow', () => {
    test('should complete z-interval workflow', async () => {
      // Step 1: User enters sample data
      const sampleData = [
        95, 102, 98, 105, 100, 97, 103, 99, 101, 104,
        96, 100, 98, 102, 99, 101, 97, 103, 100, 98
      ];

      // Step 2: Validate sample data
      expect(() => validateDataArray(sampleData, {
        elementType: 'float',
        minLength: 5,
        requireVariance: true
      })).not.toThrow();

      // Step 3: Calculate sample statistics
      const n = sampleData.length;
      const mean = sampleData.reduce((sum, x) => sum + x, 0) / n;
      const variance = sampleData.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
      const stdDev = Math.sqrt(variance);

      // Step 4: User selects confidence level
      const confidenceLevel = 0.95;

      // Step 5: Validate CI parameters
      const ciParams = {
        sampleSize: n,
        mean: mean,
        standardDeviation: stdDev,
        confidenceLevel: confidenceLevel
      };

      const ciValidation = await validateConfidenceInterval(ciParams);
      expect(ciValidation.valid).toBe(true);

      // Step 6: Calculate confidence interval
      const calculateCI = createValidatedCalculation(
        (params) => {
          const { mean, standardDeviation, sampleSize, confidenceLevel } = params;

          // Z-score for 95% confidence
          const zScore = 1.96; // Simplified for 95% CI

          const marginOfError = zScore * (standardDeviation / Math.sqrt(sampleSize));
          const lowerBound = mean - marginOfError;
          const upperBound = mean + marginOfError;

          return {
            mean,
            marginOfError,
            lowerBound,
            upperBound,
            confidenceLevel
          };
        },
        {
          mean: { required: true },
          standardDeviation: { required: true },
          sampleSize: { required: true },
          confidenceLevel: { required: true }
        }
      );

      const ci = await calculateCI(ciValidation.validatedParams);

      expect(ci.lowerBound).toBeLessThan(ci.mean);
      expect(ci.upperBound).toBeGreaterThan(ci.mean);
      expect(ci.marginOfError).toBeGreaterThan(0);

      // Step 7: Verify audit logging
      expect(auditLogger.logCalculation).toHaveBeenCalled();
    });

    test('should complete t-interval workflow for small sample', async () => {
      // Small sample size (< 30)
      const smallSample = [45, 52, 48, 55, 50, 49, 51, 47, 53, 46];

      // Validate sample
      expect(() => validateDataArray(smallSample, {
        elementType: 'float',
        minLength: 5,
        requireVariance: true
      })).not.toThrow();

      // Calculate statistics
      const n = smallSample.length;
      const mean = smallSample.reduce((sum, x) => sum + x, 0) / n;
      const variance = smallSample.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
      const stdDev = Math.sqrt(variance);
      const df = n - 1;

      // Validate parameters
      const params = {
        sampleSize: n,
        mean: mean,
        standardDeviation: stdDev,
        confidenceLevel: 0.95,
        degreesOfFreedom: df
      };

      const validation = await validateStatisticalParams(params, {
        sampleSize: { required: true },
        mean: { required: true },
        standardDeviation: { required: true },
        confidenceLevel: { required: true },
        degreesOfFreedom: { required: true }
      });

      expect(validation.valid).toBe(true);

      // Calculate t-interval
      const calculateTInterval = createValidatedCalculation(
        (params) => {
          const { mean, standardDeviation, sampleSize, degreesOfFreedom } = params;

          // Simplified t-score (approximate for df=9)
          const tScore = 2.262;

          const standardError = standardDeviation / Math.sqrt(sampleSize);
          const marginOfError = tScore * standardError;

          return {
            mean,
            standardError,
            marginOfError,
            lowerBound: mean - marginOfError,
            upperBound: mean + marginOfError,
            degreesOfFreedom
          };
        },
        {
          mean: { required: true },
          standardDeviation: { required: true },
          sampleSize: { required: true },
          degreesOfFreedom: { required: true }
        }
      );

      const tInterval = await calculateTInterval(validation.validatedParams);

      expect(tInterval.lowerBound).toBeLessThan(tInterval.mean);
      expect(tInterval.upperBound).toBeGreaterThan(tInterval.mean);
      expect(tInterval.degreesOfFreedom).toBe(9);
    });
  });

  describe('Design of Experiments Workflow', () => {
    test('should complete full factorial design workflow', async () => {
      // Step 1: Define experimental factors
      const designInput = {
        factors: ['Temperature', 'Pressure', 'Time'],
        levels: [2, 2, 2],
        replicates: 3,
        centerPoints: 4
      };

      // Step 2: Validate design parameters
      const designValidation = await validateDOEParams(designInput);
      expect(designValidation.valid).toBe(true);

      // Step 3: Generate design matrix
      const generateDesignMatrix = createValidatedCalculation(
        (params) => {
          const { factors, levels } = params;
          const numFactors = factors.length;
          const numRuns = levels.reduce((prod, l) => prod * l, 1);

          const designMatrix = [];

          for (let run = 0; run < numRuns; run++) {
            const row = [];
            let temp = run;

            for (let f = 0; f < numFactors; f++) {
              const level = temp % levels[f];
              row.push(level === 0 ? -1 : 1); // Coded levels
              temp = Math.floor(temp / levels[f]);
            }

            designMatrix.push(row);
          }

          return designMatrix;
        },
        {
          factors: { required: true },
          levels: { required: true }
        }
      );

      const designMatrix = await generateDesignMatrix(designValidation.validatedParams);

      expect(designMatrix).toHaveLength(8); // 2^3 = 8 runs
      expect(designMatrix[0]).toHaveLength(3); // 3 factors

      // Step 4: Validate design matrix
      expect(() => validateMatrix('designMatrix', designMatrix, {
        rows: 8,
        cols: 3
      })).not.toThrow();

      // Step 5: Collect response data
      const responses = [
        45.2, 52.1, 48.7, 55.3, 49.8, 54.2, 47.9, 53.6
      ];

      // Step 6: Validate responses
      expect(() => validateDataArray(responses, {
        elementType: 'float',
        nonEmpty: true,
        requireVariance: true
      })).not.toThrow();

      // Step 7: Analyze effects
      const analyzeEffects = createValidatedCalculation(
        (params) => {
          const { designMatrix, responses } = params;
          const numFactors = designMatrix[0].length;
          const effects = [];

          for (let f = 0; f < numFactors; f++) {
            let highSum = 0, lowSum = 0;
            let highCount = 0, lowCount = 0;

            for (let run = 0; run < designMatrix.length; run++) {
              if (designMatrix[run][f] === 1) {
                highSum += responses[run];
                highCount++;
              } else {
                lowSum += responses[run];
                lowCount++;
              }
            }

            const effect = (highSum / highCount) - (lowSum / lowCount);
            effects.push(effect);
          }

          return effects;
        },
        {
          designMatrix: { required: true },
          responses: { required: true }
        }
      );

      const effects = await analyzeEffects({
        designMatrix,
        responses
      });

      expect(effects).toHaveLength(3);
      expect(effects.every(e => typeof e === 'number' && isFinite(e))).toBe(true);

      // Step 8: Verify audit trail
      expect(auditLogger.logCalculation).toHaveBeenCalled();
    });

    test('should complete response surface design workflow', async () => {
      // Central Composite Design
      const rsdInput = {
        factors: ['X1', 'X2'],
        levels: [3, 3],
        centerPoints: 5,
        axialDistance: 1.414 // sqrt(2) for rotatability
      };

      // Validate parameters
      const validation = await validateStatisticalParams(rsdInput, {
        factors: { required: true },
        levels: { required: true },
        centerPoints: { required: true },
        axialDistance: { required: true }
      });

      expect(validation.valid).toBe(true);

      // Generate CCD design
      const generateCCD = createValidatedCalculation(
        (params) => {
          const { axialDistance, centerPoints } = params;
          const alpha = axialDistance;

          const design = [
            // Factorial points
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
            // Axial points
            [-alpha, 0],
            [alpha, 0],
            [0, -alpha],
            [0, alpha]
          ];

          // Add center points
          for (let i = 0; i < centerPoints; i++) {
            design.push([0, 0]);
          }

          return design;
        },
        {
          axialDistance: { required: true },
          centerPoints: { required: true }
        }
      );

      const ccdDesign = await generateCCD(validation.validatedParams);

      expect(ccdDesign).toHaveLength(13); // 4 + 4 + 5
      expect(ccdDesign[0]).toHaveLength(2);

      // Validate design matrix
      expect(() => validateMatrix('ccdMatrix', ccdDesign, {
        cols: 2
      })).not.toThrow();
    });
  });

  describe('Statistical Quality Control Workflow', () => {
    test('should complete X-bar control chart workflow', async () => {
      // Step 1: Collect process data (25 subgroups of 5 measurements)
      const generateProcessData = () => {
        const data = [];
        const processMean = 50;
        const processSD = 2;

        for (let i = 0; i < 125; i++) {
          // Normal random with occasional shifts
          const shift = i > 80 ? 3 : 0; // Process shift after sample 80
          data.push(processMean + shift + (Math.random() - 0.5) * 2 * processSD);
        }

        return data;
      };

      const processData = generateProcessData();

      // Step 2: Validate process data
      expect(() => validateDataArray(processData, {
        elementType: 'float',
        minLength: 20,
        requireVariance: true
      })).not.toThrow();

      // Step 3: Set up control chart parameters
      const chartParams = {
        data: processData,
        subgroupSize: 5,
        controlLimitSigma: 3
      };

      const chartValidation = await validateSQCParams(chartParams);
      expect(chartValidation.valid).toBe(true);

      // Step 4: Calculate control limits
      const calculateControlLimits = createValidatedCalculation(
        (params) => {
          const { data, subgroupSize, controlLimitSigma } = params;
          const numSubgroups = Math.floor(data.length / subgroupSize);

          // Calculate subgroup means
          const subgroupMeans = [];
          for (let i = 0; i < numSubgroups; i++) {
            const subgroup = data.slice(i * subgroupSize, (i + 1) * subgroupSize);
            const mean = subgroup.reduce((sum, x) => sum + x, 0) / subgroupSize;
            subgroupMeans.push(mean);
          }

          // Overall mean
          const centerLine = subgroupMeans.reduce((sum, x) => sum + x, 0) / numSubgroups;

          // Estimate standard deviation
          const variance = subgroupMeans.reduce((sum, x) => sum + Math.pow(x - centerLine, 2), 0) / numSubgroups;
          const stdDev = Math.sqrt(variance);

          const ucl = centerLine + controlLimitSigma * stdDev / Math.sqrt(subgroupSize);
          const lcl = centerLine - controlLimitSigma * stdDev / Math.sqrt(subgroupSize);

          return {
            centerLine,
            ucl,
            lcl,
            subgroupMeans
          };
        },
        {
          data: { required: true },
          subgroupSize: { required: true },
          controlLimitSigma: { required: true }
        }
      );

      const controlLimits = await calculateControlLimits(chartValidation.validatedParams);

      expect(controlLimits.ucl).toBeGreaterThan(controlLimits.centerLine);
      expect(controlLimits.lcl).toBeLessThan(controlLimits.centerLine);
      expect(controlLimits.subgroupMeans.length).toBe(25);

      // Step 5: Detect out-of-control points
      const outOfControl = controlLimits.subgroupMeans.filter(
        mean => mean > controlLimits.ucl || mean < controlLimits.lcl
      );

      expect(outOfControl.length).toBeGreaterThan(0); // Should detect shift

      // Step 6: Verify monitoring
      expect(recordValidation).toHaveBeenCalled();
    });

    test('should complete process capability analysis workflow', async () => {
      // Step 1: Collect stable process data
      const stableData = Array(100).fill(0).map(() => 50 + (Math.random() - 0.5) * 4);

      // Step 2: Validate data
      expect(() => validateDataArray(stableData, {
        elementType: 'float',
        minLength: 30,
        requireVariance: true
      })).not.toThrow();

      // Step 3: Define specification limits
      const specParams = {
        data: stableData,
        specLimitLower: 44,
        specLimitUpper: 56,
        targetValue: 50
      };

      const validation = await validateStatisticalParams(specParams, {
        data: { required: true },
        specLimitLower: { required: true },
        specLimitUpper: { required: true },
        targetValue: { required: true }
      });

      expect(validation.valid).toBe(true);

      // Step 4: Calculate capability indices
      const calculateCapability = createValidatedCalculation(
        (params) => {
          const { data, specLimitLower, specLimitUpper, targetValue } = params;

          const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
          const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (data.length - 1);
          const stdDev = Math.sqrt(variance);

          const cp = (specLimitUpper - specLimitLower) / (6 * stdDev);
          const cpk = Math.min(
            (specLimitUpper - mean) / (3 * stdDev),
            (mean - specLimitLower) / (3 * stdDev)
          );
          const cpm = cp / Math.sqrt(1 + Math.pow((mean - targetValue) / stdDev, 2));

          return {
            cp,
            cpk,
            cpm,
            mean,
            stdDev
          };
        },
        {
          data: { required: true },
          specLimitLower: { required: true },
          specLimitUpper: { required: true },
          targetValue: { required: true }
        }
      );

      const capability = await calculateCapability(validation.validatedParams);

      expect(capability.cp).toBeGreaterThan(0);
      expect(capability.cpk).toBeGreaterThan(0);
      expect(capability.cpm).toBeGreaterThan(0);

      // Step 5: Interpret capability
      const isCapable = capability.cpk >= 1.33;
      expect(typeof isCapable).toBe('boolean');
    });
  });

  describe('Cross-Module Workflows', () => {
    test('should complete workflow spanning multiple modules', async () => {
      // Workflow: Generate distribution → Sample data → DOE → SQC

      // Phase 1: Generate normal distribution sample
      const distributionParams = {
        mean: 100,
        standardDeviation: 10,
        sampleSize: 200
      };

      const distValidation = await validateStatisticalParams(distributionParams, {
        mean: { required: true },
        standardDeviation: { required: true },
        sampleSize: { required: true }
      });

      expect(distValidation.valid).toBe(true);

      // Generate sample
      const sample = Array(200).fill(0).map(() =>
        distributionParams.mean + (Math.random() - 0.5) * 20
      );

      // Phase 2: Use sample in DOE analysis
      const doeParams = {
        factors: ['Factor1', 'Factor2'],
        levels: [2, 2],
        replicates: 50 // Use sample data for replicates
      };

      const doeValidation = await validateDOEParams(doeParams);
      expect(doeValidation.valid).toBe(true);

      // Assign sample data to design runs
      const designMatrix = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ];

      const runSizes = 50;
      const runData = designMatrix.map((_, i) =>
        sample.slice(i * runSizes, (i + 1) * runSizes)
      );

      // Phase 3: Apply SQC to each treatment
      for (const data of runData) {
        const sqcParams = {
          data: data,
          subgroupSize: 5,
          controlLimitSigma: 3
        };

        const sqcValidation = await validateSQCParams(sqcParams);
        expect(sqcValidation.valid).toBe(true);
      }

      // Phase 4: Verify complete audit trail
      expect(auditLogger.logCalculation).toHaveBeenCalled();
      expect(recordValidation).toHaveBeenCalled();
    });

    test('should handle data transformation between modules', async () => {
      // Transform probability data for CI analysis
      const probabilityData = Array(50).fill(0).map(() => Math.random());

      // Validate as probability data
      expect(() => validateDataArray(probabilityData, {
        elementType: 'float',
        positive: false // Probabilities can be 0
      })).not.toThrow();

      // Transform to normal scale (logit transform)
      const transformedData = probabilityData.map(p =>
        Math.log(p / (1 - p))
      ).filter(x => isFinite(x));

      // Use in CI calculation
      const n = transformedData.length;
      const mean = transformedData.reduce((sum, x) => sum + x, 0) / n;
      const variance = transformedData.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
      const stdDev = Math.sqrt(variance);

      const ciParams = {
        sampleSize: n,
        mean: mean,
        standardDeviation: stdDev,
        confidenceLevel: 0.95
      };

      const ciValidation = await validateConfidenceInterval(ciParams);
      expect(ciValidation.valid).toBe(true);
    });
  });

  describe('Backend Synchronization Workflows', () => {
    test('should sync validation results to backend', async () => {
      // Perform validation
      const params = {
        sampleSize: 30,
        confidenceLevel: 0.95
      };

      const validation = await validateStatisticalParams(params, {
        sampleSize: { required: true },
        confidenceLevel: { required: true }
      });

      expect(validation.valid).toBe(true);

      // Verify sync was triggered
      expect(syncAuditLog).toHaveBeenCalled();
    });

    test('should handle sync failures gracefully', async () => {
      // Mock sync failure
      syncAuditLog.mockRejectedValueOnce(new Error('Network error'));

      const params = {
        mean: 100,
        standardDeviation: 15
      };

      // Validation should still succeed even if sync fails
      const validation = await executeWithRecovery(
        async () => {
          const result = await validateStatisticalParams(params, {
            mean: { required: true },
            standardDeviation: { required: true }
          });

          // Attempt sync
          await syncAuditLog({ validation: result });

          return result;
        },
        {
          fallbackValue: { valid: true, synced: false },
          maxRetries: 2
        }
      );

      expect(validation).toBeDefined();
    });

    test('should batch sync multiple operations', async () => {
      // Perform multiple validations
      const validations = [];

      for (let i = 0; i < 10; i++) {
        const result = await validateStatisticalParams(
          { sampleSize: 30 + i },
          { sampleSize: { required: true } }
        );
        validations.push(result);
      }

      expect(validations).toHaveLength(10);
      expect(validations.every(v => v.valid)).toBe(true);

      // Force sync
      await forceSync();

      // Verify sync status
      const syncStatus = getSyncStatus();
      expect(syncStatus).toBeDefined();
    });
  });

  describe('Error Recovery in Workflows', () => {
    test('should recover from mid-workflow validation errors', async () => {
      // Multi-step workflow with error in middle
      const workflow = async () => {
        // Step 1: Success
        const step1 = await validateStatisticalParams(
          { mean: 100 },
          { mean: { required: true } }
        );

        expect(step1.valid).toBe(true);

        // Step 2: Error
        try {
          await validateStatisticalParams(
            { standardDeviation: -10 },
            { standardDeviation: { required: true } }
          );
        } catch (error) {
          // Recover with default value
          const recovered = { standardDeviation: 1 };

          // Step 3: Continue with recovered value
          const step3 = await validateStatisticalParams(
            recovered,
            { standardDeviation: { required: true } }
          );

          expect(step3.valid).toBe(true);
          return { recovered: true, step3 };
        }
      };

      const result = await workflow();
      expect(result.recovered).toBe(true);
    });

    test('should rollback on critical workflow failures', async () => {
      const initialState = { data: [1, 2, 3, 4, 5] };
      let currentState = { ...initialState };

      const criticalWorkflow = async () => {
        // Modify state
        currentState.data.push(6);

        // Critical operation fails
        try {
          await validateDataArray([], { nonEmpty: true });
        } catch (error) {
          // Rollback
          currentState = { ...initialState };
          throw error;
        }
      };

      await expect(criticalWorkflow()).rejects.toThrow();

      // Verify rollback occurred
      expect(currentState.data).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('UI Integration Workflows', () => {
    test('should integrate with React validation hook', async () => {
      const { result } = renderHook(() => useValidation({
        schema: {
          sampleSize: { required: true },
          confidenceLevel: { required: true }
        },
        mode: 'onChange'
      }));

      // Set field values
      act(() => {
        result.current.handleChange('sampleSize', 30);
        result.current.handleChange('confidenceLevel', 0.95);
      });

      // Validate all
      await act(async () => {
        await result.current.validateAll();
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    test('should provide real-time validation feedback', async () => {
      const { result } = renderHook(() => useValidation({
        schema: {
          sampleSize: { required: true }
        },
        mode: 'realtime'
      }));

      // Enter invalid value
      act(() => {
        result.current.handleChange('sampleSize', -10);
      });

      // Wait for debounced validation
      await new Promise(resolve => setTimeout(resolve, 400));

      // Mark as touched to show error
      act(() => {
        result.current.handleBlur('sampleSize');
      });

      expect(result.current.hasErrors).toBe(true);
    });

    test('should handle form submission workflow', async () => {
      const onSubmit = jest.fn();

      const { result } = renderHook(() => useFormValidation(
        { sampleSize: 30, confidenceLevel: 0.95 },
        {
          sampleSize: { required: true },
          confidenceLevel: { required: true }
        }
      ));

      // Submit form
      await act(async () => {
        const submitHandler = result.current.handleSubmit(onSubmit);
        await submitHandler({ preventDefault: jest.fn() });
      });

      expect(onSubmit).toHaveBeenCalledWith({
        sampleSize: 30,
        confidenceLevel: 0.95
      });
    });
  });

  describe('Performance Monitoring in Workflows', () => {
    test('should track metrics throughout workflow', async () => {
      // Clear metrics
      recordValidation.mockClear();
      recordError.mockClear();

      // Execute workflow
      const workflowSteps = [
        () => validateStatisticalParams({ mean: 100 }, { mean: { required: true } }),
        () => validateStatisticalParams({ sampleSize: 30 }, { sampleSize: { required: true } }),
        () => validateDataArray([1, 2, 3, 4, 5], { elementType: 'float' })
      ];

      for (const step of workflowSteps) {
        await step();
      }

      // Verify metrics were recorded
      expect(recordValidation).toHaveBeenCalledTimes(3);
    });

    test('should generate workflow completion report', async () => {
      // Execute complete workflow
      const workflow = async () => {
        const startTime = Date.now();

        // Multiple validations
        await validateStatisticalParams({ mean: 100 }, { mean: { required: true } });
        await validateDataArray([1, 2, 3], { elementType: 'float' });
        await validateConfidenceInterval({
          sampleSize: 30,
          mean: 100,
          standardDeviation: 15,
          confidenceLevel: 0.95
        });

        const endTime = Date.now();

        return {
          duration: endTime - startTime,
          steps: 3,
          success: true
        };
      };

      const report = await workflow();

      expect(report.success).toBe(true);
      expect(report.steps).toBe(3);
      expect(report.duration).toBeGreaterThan(0);
    });
  });
});
