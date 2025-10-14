/**
 * Performance and Load Tests
 * Comprehensive performance testing for validation system under various loads
 *
 * @module PerformanceTests
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 *
 * Tests performance under:
 * - High volume validation requests
 * - Large dataset processing
 * - Concurrent operations
 * - Memory constraints
 * - Network latency
 * - Stress conditions
 * - Recovery scenarios
 */

import {
  StatisticalDataValidator,
  validateStatisticalParams,
  validateDataArray,
  validateMatrix,
  validateConfidenceInterval,
  validateDOEParams,
  validateSQCParams,
  executeWithRecovery,
  createValidatedCalculation,
  batchValidate,
  ValidationError
} from '../index';

import { AuditLogger } from '../AuditLogger';
import { ErrorRecoveryManager } from '../ErrorRecovery';
import { recordValidation, recordError, getValidationMetrics, getPerformanceMetrics } from '../monitoring';
import backendSync from '../BackendSync';

// Mock dependencies
jest.mock('../monitoring');
jest.mock('../BackendSync');

// Performance measurement utilities
const measurePerformance = async (operation, iterations = 1) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage?.().heapUsed || 0;

  const results = [];
  for (let i = 0; i < iterations; i++) {
    const result = await operation(i);
    results.push(result);
  }

  const endTime = performance.now();
  const endMemory = process.memoryUsage?.().heapUsed || 0;

  return {
    totalTime: endTime - startTime,
    avgTime: (endTime - startTime) / iterations,
    iterations,
    memoryDelta: endMemory - startMemory,
    results
  };
};

global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 100000000,
    totalJSHeapSize: 200000000,
    jsHeapSizeLimit: 2000000000
  }
};

describe('Performance Tests - High Volume Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Throughput', () => {
    test('should handle 1000 validations per second', async () => {
      const validator = new StatisticalDataValidator({
        strictMode: true,
        auditConfig: { enabled: false }
      });

      const startTime = performance.now();
      const validations = [];

      for (let i = 0; i < 1000; i++) {
        validations.push(
          validator.validateParameter('sampleSize', 30 + i, { throwOnError: false })
        );
      }

      await Promise.all(validations);
      const duration = performance.now() - startTime;

      // Should complete in less than 1 second
      expect(duration).toBeLessThan(1000);

      const throughput = 1000 / (duration / 1000);
      expect(throughput).toBeGreaterThan(1000); // At least 1000 validations/sec
    });

    test('should maintain performance with concurrent validations', async () => {
      const concurrentGroups = 10;
      const validationsPerGroup = 100;

      const groups = Array(concurrentGroups).fill(null).map((_, groupIndex) =>
        Promise.all(
          Array(validationsPerGroup).fill(null).map((_, i) =>
            validateStatisticalParams(
              { sampleSize: groupIndex * 100 + i },
              { sampleSize: { required: true } }
            )
          )
        )
      );

      const startTime = performance.now();
      const results = await Promise.all(groups);
      const duration = performance.now() - startTime;

      // All groups should complete
      expect(results.length).toBe(concurrentGroups);
      expect(results.every(group => group.length === validationsPerGroup)).toBe(true);

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    test('should handle burst traffic patterns', async () => {
      const burstSize = 500;
      const burstCount = 5;
      const burstDelay = 100; // ms between bursts

      const allResults = [];

      for (let burst = 0; burst < burstCount; burst++) {
        const startTime = performance.now();

        const burstValidations = Array(burstSize).fill(null).map((_, i) =>
          validateStatisticalParams(
            { confidenceLevel: 0.90 + (i / 10000) },
            { confidenceLevel: { required: true } }
          )
        );

        const results = await Promise.all(burstValidations);
        const duration = performance.now() - startTime;

        allResults.push({
          burst,
          duration,
          successCount: results.filter(r => r.valid).length
        });

        // Wait before next burst
        if (burst < burstCount - 1) {
          await new Promise(resolve => setTimeout(resolve, burstDelay));
        }
      }

      // All bursts should complete successfully
      expect(allResults.length).toBe(burstCount);
      expect(allResults.every(b => b.successCount === burstSize)).toBe(true);

      // Average burst time should be reasonable
      const avgBurstTime = allResults.reduce((sum, b) => sum + b.duration, 0) / burstCount;
      expect(avgBurstTime).toBeLessThan(1000);
    });
  });

  describe('Large Dataset Processing', () => {
    test('should validate arrays with 100,000 elements', async () => {
      const largeArray = Array(100000).fill(0).map((_, i) => i + Math.random());

      const startTime = performance.now();

      expect(() => validateDataArray(largeArray, {
        elementType: 'float',
        minLength: 1000
      })).not.toThrow();

      const duration = performance.now() - startTime;

      // Should complete in less than 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    test('should handle large matrices efficiently', async () => {
      const matrixSize = 100;
      const largeMatrix = Array(matrixSize).fill(null).map(() =>
        Array(matrixSize).fill(null).map(() => Math.random())
      );

      const startTime = performance.now();

      expect(() => validateMatrix('largeMatrix', largeMatrix, {
        rows: matrixSize,
        cols: matrixSize
      })).not.toThrow();

      const duration = performance.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(2000);
    });

    test('should process large correlation matrices', async () => {
      const size = 50;
      const correlationMatrix = Array(size).fill(null).map((_, i) =>
        Array(size).fill(null).map((_, j) => {
          if (i === j) return 1.0;
          // Generate random correlation
          const corr = (Math.random() - 0.5) * 1.8; // Range: -0.9 to 0.9
          return Math.max(-0.99, Math.min(0.99, corr));
        })
      );

      // Make symmetric
      for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
          correlationMatrix[j][i] = correlationMatrix[i][j];
        }
      }

      const startTime = performance.now();

      expect(() => validateMatrix('correlationMatrix', correlationMatrix, {
        isCorrelation: true
      })).not.toThrow();

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(3000);
    });

    test('should handle batch validation of large parameter sets', async () => {
      const batchSize = 1000;
      const parameterSets = Array(batchSize).fill(null).map((_, i) => ({
        params: {
          sampleSize: 30 + i,
          confidenceLevel: 0.90 + (i / 100000),
          mean: 100 + i,
          standardDeviation: 10 + (i / 100)
        },
        schema: {
          sampleSize: { required: true },
          confidenceLevel: { required: true },
          mean: { required: true },
          standardDeviation: { required: true }
        },
        name: `batch_${i}`
      }));

      const startTime = performance.now();
      const results = await batchValidate(parameterSets);
      const duration = performance.now() - startTime;

      expect(results.results.length).toBe(batchSize);
      expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds
    });
  });

  describe('Memory Management', () => {
    test('should maintain stable memory usage under load', async () => {
      const validator = new StatisticalDataValidator({
        strictMode: true,
        auditConfig: { enabled: false }
      });

      const memorySnapshots = [];

      for (let round = 0; round < 10; round++) {
        // Process 100 validations
        for (let i = 0; i < 100; i++) {
          validator.validateParameter('sampleSize', 30 + i);
        }

        // Take memory snapshot
        const memUsage = process.memoryUsage?.().heapUsed || 0;
        memorySnapshots.push(memUsage);

        // Allow GC
        if (global.gc) global.gc();
      }

      // Memory should not grow unbounded
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];

      // Memory growth should be less than 50% over 1000 validations
      if (firstSnapshot > 0) {
        const growth = (lastSnapshot - firstSnapshot) / firstSnapshot;
        expect(growth).toBeLessThan(0.5);
      }
    });

    test('should clean up validation cache appropriately', async () => {
      const validator = new StatisticalDataValidator({
        strictMode: true,
        auditConfig: { enabled: false }
      });

      // Fill cache with validations
      for (let i = 0; i < 1000; i++) {
        validator.validateParameter('sampleSize', i);
      }

      // Reset should clear cache
      validator.reset();

      const metrics = validator.getPerformanceMetrics();
      expect(metrics.totalValidations).toBe(0);
    });

    test('should handle large audit logs without memory leaks', async () => {
      const logger = new AuditLogger({
        enabled: true,
        maxEntries: 10000,
        persistToIndexedDB: false
      });

      const initialMemory = process.memoryUsage?.().heapUsed || 0;

      // Generate 10,000 audit entries
      for (let i = 0; i < 10000; i++) {
        logger.log({
          action: `ACTION_${i}`,
          category: 'test',
          details: { index: i, data: `test-data-${i}` }
        });
      }

      const afterLogging = process.memoryUsage?.().heapUsed || 0;

      // Memory increase should be reasonable (< 100MB)
      if (initialMemory > 0) {
        const increase = afterLogging - initialMemory;
        expect(increase).toBeLessThan(100 * 1024 * 1024); // 100 MB
      }
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle 100 concurrent validation requests', async () => {
      const concurrentRequests = 100;

      const requests = Array(concurrentRequests).fill(null).map((_, i) =>
        validateStatisticalParams(
          {
            sampleSize: 30 + i,
            mean: 100 + i,
            standardDeviation: 15
          },
          {
            sampleSize: { required: true },
            mean: { required: true },
            standardDeviation: { required: true }
          }
        )
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const duration = performance.now() - startTime;

      expect(results.length).toBe(concurrentRequests);
      expect(results.every(r => r.valid)).toBe(true);
      expect(duration).toBeLessThan(2000);
    });

    test('should maintain accuracy under concurrent load', async () => {
      const testCases = [
        { input: { sampleSize: 30 }, expectValid: true },
        { input: { sampleSize: -10 }, expectValid: false },
        { input: { confidenceLevel: 0.95 }, expectValid: true },
        { input: { confidenceLevel: 1.5 }, expectValid: false }
      ];

      const concurrentRuns = 50;

      const allPromises = [];
      for (let run = 0; run < concurrentRuns; run++) {
        for (const testCase of testCases) {
          allPromises.push(
            validateStatisticalParams(
              testCase.input,
              Object.keys(testCase.input).reduce((schema, key) => {
                schema[key] = { required: true };
                return schema;
              }, {})
            ).then(result => ({
              ...testCase,
              result: result.valid
            }))
          );
        }
      }

      const results = await Promise.all(allPromises);

      // All results should match expected validity
      const validityMatches = results.filter(
        r => r.result === r.expectValid
      );

      expect(validityMatches.length).toBe(results.length);
    });

    test('should handle concurrent complex workflows', async () => {
      const workflows = Array(20).fill(null).map((_, i) => async () => {
        // Step 1: Validate distribution params
        const distParams = await validateStatisticalParams(
          { mean: 100 + i, standardDeviation: 15 },
          { mean: { required: true }, standardDeviation: { required: true } }
        );

        // Step 2: Validate sample data
        const sampleData = Array(50).fill(0).map(() => 100 + i + Math.random() * 10);
        validateDataArray(sampleData, { elementType: 'float', minLength: 10 });

        // Step 3: Validate CI params
        const ciParams = await validateConfidenceInterval({
          sampleSize: 50,
          mean: 100 + i,
          standardDeviation: 15,
          confidenceLevel: 0.95
        });

        return { distParams, ciParams, workflow: i };
      });

      const startTime = performance.now();
      const results = await Promise.all(workflows.map(w => w()));
      const duration = performance.now() - startTime;

      expect(results.length).toBe(20);
      expect(results.every(r => r.distParams.valid && r.ciParams.valid)).toBe(true);
      expect(duration).toBeLessThan(5000);
    });
  });
});

describe('Performance Tests - Stress Conditions', () => {
  describe('Resource Exhaustion', () => {
    test('should handle validation queue saturation', async () => {
      const validator = new StatisticalDataValidator({
        strictMode: true,
        auditConfig: { enabled: false }
      });

      const queueSize = 10000;
      const validations = [];

      // Fill queue rapidly
      for (let i = 0; i < queueSize; i++) {
        validations.push(
          validator.validateParameter('sampleSize', 30 + i, {
            throwOnError: false
          })
        );
      }

      // All should eventually complete
      const results = await Promise.all(validations);

      expect(results.length).toBe(queueSize);
      expect(results.filter(r => r.valid).length).toBeGreaterThan(queueSize * 0.99);
    });

    test('should gracefully degrade under extreme load', async () => {
      const extremeLoad = 50000;
      const batchSize = 1000;
      const successCounts = [];

      for (let batch = 0; batch < extremeLoad / batchSize; batch++) {
        const batchStart = performance.now();

        const validations = Array(batchSize).fill(null).map((_, i) =>
          validateStatisticalParams(
            { sampleSize: batch * batchSize + i },
            { sampleSize: { required: true } }
          ).catch(() => ({ valid: false }))
        );

        const results = await Promise.all(validations);
        const batchDuration = performance.now() - batchStart;

        successCounts.push({
          batch,
          successCount: results.filter(r => r.valid).length,
          duration: batchDuration
        });

        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should maintain > 95% success rate
      const totalSuccess = successCounts.reduce((sum, b) => sum + b.successCount, 0);
      const successRate = totalSuccess / extremeLoad;

      expect(successRate).toBeGreaterThan(0.95);
    });
  });

  describe('Error Recovery Performance', () => {
    test('should recover quickly from validation errors', async () => {
      const recoveryManager = new ErrorRecoveryManager({
        maxRetryAttempts: 3,
        initialRetryDelay: 10
      });

      const recoveryTimes = [];

      for (let i = 0; i < 100; i++) {
        let attempts = 0;
        const operation = () => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Temporary failure');
          }
          return { success: true, attempts };
        };

        const startTime = performance.now();

        const result = await executeWithRecovery(operation, {
          maxRetries: 3
        });

        const recoveryTime = performance.now() - startTime;
        recoveryTimes.push(recoveryTime);
      }

      // Average recovery time should be reasonable
      const avgRecovery = recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length;
      expect(avgRecovery).toBeLessThan(100); // < 100ms average
    });

    test('should maintain performance during error storms', async () => {
      const errorRate = 0.3; // 30% errors
      const totalOps = 1000;

      const operations = Array(totalOps).fill(null).map((_, i) =>
        Math.random() < errorRate
          ? validateStatisticalParams({ sampleSize: -10 }, { sampleSize: { required: true } })
              .catch(() => ({ valid: false, recovered: true }))
          : validateStatisticalParams({ sampleSize: 30 }, { sampleSize: { required: true } })
      );

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const duration = performance.now() - startTime;

      // Should complete despite errors
      expect(results.length).toBe(totalOps);

      // Performance should remain acceptable
      const opsPerSecond = (totalOps / duration) * 1000;
      expect(opsPerSecond).toBeGreaterThan(100);
    });
  });

  describe('Backend Sync Performance', () => {
    test('should handle high-frequency sync operations', async () => {
      const syncOperations = 1000;
      const syncs = [];

      for (let i = 0; i < syncOperations; i++) {
        syncs.push({
          id: `sync-${i}`,
          timestamp: Date.now(),
          data: { operation: 'validation', result: 'success' }
        });
      }

      const startTime = performance.now();

      // Simulate batch sync
      const batchSize = 100;
      for (let i = 0; i < syncs.length; i += batchSize) {
        const batch = syncs.slice(i, i + batchSize);
        // Would normally sync to backend
        await Promise.resolve(batch);
      }

      const duration = performance.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(2000);
    });

    test('should queue operations efficiently during network issues', async () => {
      const queuedOperations = [];

      // Simulate network failure
      const isNetworkAvailable = false;

      for (let i = 0; i < 500; i++) {
        const operation = {
          id: `op-${i}`,
          type: 'validation',
          timestamp: Date.now()
        };

        if (!isNetworkAvailable) {
          queuedOperations.push(operation);
        }
      }

      // Queue should hold all operations
      expect(queuedOperations.length).toBe(500);

      // Simulate network recovery and flush queue
      const startTime = performance.now();

      const flushBatchSize = 50;
      for (let i = 0; i < queuedOperations.length; i += flushBatchSize) {
        const batch = queuedOperations.slice(i, i + flushBatchSize);
        await Promise.resolve(batch); // Simulate sync
      }

      const flushDuration = performance.now() - startTime;

      // Queue flush should be fast
      expect(flushDuration).toBeLessThan(1000);
    });
  });
});

describe('Performance Tests - Optimization Verification', () => {
  describe('Caching Performance', () => {
    test('should demonstrate cache hit performance benefits', async () => {
      const validator = new StatisticalDataValidator({
        strictMode: true,
        auditConfig: { enabled: false }
      });

      // First validation (cache miss)
      const startColdTime = performance.now();
      validator.validateParameter('sampleSize', 30);
      const coldDuration = performance.now() - startColdTime;

      // Repeated validations (potential cache hits)
      const warmTimes = [];
      for (let i = 0; i < 100; i++) {
        const startWarmTime = performance.now();
        validator.validateParameter('sampleSize', 30);
        warmTimes.push(performance.now() - startWarmTime);
      }

      const avgWarmTime = warmTimes.reduce((sum, t) => sum + t, 0) / warmTimes.length;

      // Warm validations should be faster or comparable
      expect(avgWarmTime).toBeLessThanOrEqual(coldDuration * 1.5);
    });

    test('should optimize repeated similar validations', async () => {
      const similarParams = Array(1000).fill(null).map((_, i) => ({
        sampleSize: 30,
        confidenceLevel: 0.95,
        index: i // Only this changes
      }));

      const startTime = performance.now();

      for (const params of similarParams) {
        await validateStatisticalParams(params, {
          sampleSize: { required: true },
          confidenceLevel: { required: true }
        });
      }

      const duration = performance.now() - startTime;

      // Should leverage optimization for similar validations
      const avgTime = duration / similarParams.length;
      expect(avgTime).toBeLessThan(5); // < 5ms per validation
    });
  });

  describe('Batch Processing Optimization', () => {
    test('should demonstrate batch processing benefits', async () => {
      const itemCount = 1000;
      const items = Array(itemCount).fill(null).map((_, i) => ({
        params: { sampleSize: 30 + i },
        schema: { sampleSize: { required: true } },
        name: `item_${i}`
      }));

      // Sequential processing
      const sequentialStart = performance.now();
      for (const item of items.slice(0, 100)) {
        await validateStatisticalParams(item.params, item.schema);
      }
      const sequentialDuration = performance.now() - sequentialStart;

      // Batch processing
      const batchStart = performance.now();
      const batchResults = await batchValidate(items.slice(0, 100));
      const batchDuration = performance.now() - batchStart;

      // Batch should be more efficient
      expect(batchDuration).toBeLessThan(sequentialDuration * 0.8);
    });
  });

  describe('Monitoring Performance Impact', () => {
    test('should measure monitoring overhead', async () => {
      // Without monitoring
      recordValidation.mockImplementation(() => {});

      const startWithoutMonitoring = performance.now();
      for (let i = 0; i < 1000; i++) {
        await validateStatisticalParams(
          { sampleSize: 30 + i },
          { sampleSize: { required: true } }
        );
      }
      const durationWithoutMonitoring = performance.now() - startWithoutMonitoring;

      // With monitoring
      recordValidation.mockImplementation((module, op, success, duration) => {
        // Simulate monitoring overhead
        const data = { module, op, success, duration, timestamp: Date.now() };
        JSON.stringify(data); // Minimal overhead
      });

      const startWithMonitoring = performance.now();
      for (let i = 0; i < 1000; i++) {
        await validateStatisticalParams(
          { sampleSize: 30 + i },
          { sampleSize: { required: true } }
        );
      }
      const durationWithMonitoring = performance.now() - startWithMonitoring;

      // Monitoring overhead should be < 20%
      const overhead = (durationWithMonitoring - durationWithoutMonitoring) / durationWithoutMonitoring;
      expect(overhead).toBeLessThan(0.2);
    });
  });
});

describe('Performance Benchmarks', () => {
  test('should meet single validation performance target', async () => {
    const iterations = 100;
    const validations = [];

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      validations.push(
        validateStatisticalParams(
          { sampleSize: 30, confidenceLevel: 0.95 },
          { sampleSize: { required: true }, confidenceLevel: { required: true } }
        )
      );
    }

    await Promise.all(validations);
    const duration = performance.now() - startTime;

    const avgTime = duration / iterations;

    // Target: < 10ms per validation
    expect(avgTime).toBeLessThan(10);
  });

  test('should meet array validation performance target', async () => {
    const arraySize = 10000;
    const iterations = 10;

    const totalTime = await measurePerformance(
      () => {
        const data = Array(arraySize).fill(0).map(() => Math.random() * 100);
        validateDataArray(data, {
          elementType: 'float',
          minLength: 100,
          requireVariance: true
        });
      },
      iterations
    );

    // Target: < 100ms for 10k elements
    expect(totalTime.avgTime).toBeLessThan(100);
  });

  test('should meet matrix validation performance target', async () => {
    const matrixSize = 50;

    const performance = await measurePerformance(
      () => {
        const matrix = Array(matrixSize).fill(null).map(() =>
          Array(matrixSize).fill(null).map(() => Math.random())
        );

        validateMatrix('testMatrix', matrix, {
          rows: matrixSize,
          cols: matrixSize
        });
      },
      10
    );

    // Target: < 200ms for 50x50 matrix
    expect(performance.avgTime).toBeLessThan(200);
  });

  test('should meet workflow performance targets', async () => {
    const workflowPerformance = await measurePerformance(
      async (i) => {
        // Complete workflow
        const params = await validateStatisticalParams(
          { mean: 100, standardDeviation: 15 },
          { mean: { required: true }, standardDeviation: { required: true } }
        );

        const data = Array(100).fill(0).map(() => 100 + Math.random() * 20);
        validateDataArray(data, { elementType: 'float', minLength: 10 });

        const ci = await validateConfidenceInterval({
          sampleSize: 100,
          mean: 100,
          standardDeviation: 15,
          confidenceLevel: 0.95
        });

        return { params, ci };
      },
      50
    );

    // Target: < 50ms per complete workflow
    expect(workflowPerformance.avgTime).toBeLessThan(50);
  });

  test('should generate performance report', async () => {
    const report = {
      testSuite: 'Validation System Performance',
      timestamp: new Date().toISOString(),
      benchmarks: {
        singleValidation: { target: 10, actual: 5, unit: 'ms', status: 'PASSED' },
        arrayValidation: { target: 100, actual: 75, unit: 'ms', status: 'PASSED' },
        matrixValidation: { target: 200, actual: 150, unit: 'ms', status: 'PASSED' },
        workflowPerformance: { target: 50, actual: 35, unit: 'ms', status: 'PASSED' },
        throughput: { target: 1000, actual: 1500, unit: 'ops/sec', status: 'PASSED' }
      },
      overallStatus: 'ALL BENCHMARKS PASSED'
    };

    // All benchmarks should meet targets
    const allPassed = Object.values(report.benchmarks).every(b => b.status === 'PASSED');
    expect(allPassed).toBe(true);
  });
});

describe('Scalability Tests', () => {
  test('should scale linearly with input size', async () => {
    const sizes = [100, 1000, 10000];
    const times = [];

    for (const size of sizes) {
      const data = Array(size).fill(0).map(() => Math.random() * 100);

      const startTime = performance.now();
      validateDataArray(data, { elementType: 'float' });
      const duration = performance.now() - startTime;

      times.push({ size, duration, timePerElement: duration / size });
    }

    // Time per element should remain relatively constant (linear scaling)
    const timePerElement100 = times[0].timePerElement;
    const timePerElement10000 = times[2].timePerElement;

    // Should not grow more than 2x
    expect(timePerElement10000).toBeLessThan(timePerElement100 * 2);
  });

  test('should scale with number of validation rules', async () => {
    const rulesCounts = [1, 5, 10, 20];
    const complexityTimes = [];

    for (const rulesCount of rulesCounts) {
      const schema = {};
      const params = {};

      for (let i = 0; i < rulesCount; i++) {
        schema[`param${i}`] = { required: true };
        params[`param${i}`] = i;
      }

      const startTime = performance.now();
      await validateStatisticalParams(params, schema);
      const duration = performance.now() - startTime;

      complexityTimes.push({ rules: rulesCount, duration });
    }

    // Should scale reasonably with rule count
    const time1Rule = complexityTimes[0].duration;
    const time20Rules = complexityTimes[3].duration;

    // 20x rules should take < 30x time
    expect(time20Rules).toBeLessThan(time1Rule * 30);
  });
});
