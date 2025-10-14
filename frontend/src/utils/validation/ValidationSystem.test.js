/**
 * Validation System Test Suite
 * Comprehensive tests for data validation, error recovery, and audit logging
 *
 * @module ValidationSystemTests
 * @version 1.0.0
 */

import { StatisticalDataValidator, ValidationError } from './StatisticalDataValidator';
import { AuditLogger } from './AuditLogger';
import { ErrorRecoveryManager, RecoverableError, RecoveryStrategy, ErrorSeverity } from './ErrorRecovery';
import { CentralErrorHandler, ErrorCategory, NotificationLevel } from './CentralErrorHandler';

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    onsuccess: jest.fn(),
    onerror: jest.fn(),
    onupgradeneeded: jest.fn()
  })
};

// Mock crypto for testing
const mockCrypto = {
  subtle: {
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn()
  },
  getRandomValues: jest.fn(arr => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

// Setup global mocks
global.indexedDB = mockIndexedDB;
global.crypto = mockCrypto;
global.performance = { now: jest.fn(() => Date.now()) };

describe('StatisticalDataValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new StatisticalDataValidator({
      strictMode: true,
      auditConfig: { enabled: false }
    });
  });

  describe('Parameter Validation', () => {
    test('should validate sample size correctly', () => {
      expect(() => validator.validateParameter('sampleSize', 100))
        .not.toThrow();

      expect(() => validator.validateParameter('sampleSize', 0))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('sampleSize', -10))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('sampleSize', 1.5))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('sampleSize', 1000001))
        .toThrow(ValidationError);
    });

    test('should validate confidence level correctly', () => {
      expect(() => validator.validateParameter('confidenceLevel', 0.95))
        .not.toThrow();

      expect(() => validator.validateParameter('confidenceLevel', 0))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('confidenceLevel', 1))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('confidenceLevel', 1.5))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('confidenceLevel', -0.1))
        .toThrow(ValidationError);
    });

    test('should validate standard deviation correctly', () => {
      expect(() => validator.validateParameter('standardDeviation', 10))
        .not.toThrow();

      expect(() => validator.validateParameter('standardDeviation', 0))
        .not.toThrow(); // Zero is allowed for SD

      expect(() => validator.validateParameter('standardDeviation', -5))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('standardDeviation', NaN))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('standardDeviation', Infinity))
        .toThrow(ValidationError);
    });

    test('should validate correlation correctly', () => {
      expect(() => validator.validateParameter('correlation', 0.5))
        .not.toThrow();

      expect(() => validator.validateParameter('correlation', -1))
        .not.toThrow();

      expect(() => validator.validateParameter('correlation', 1))
        .not.toThrow();

      expect(() => validator.validateParameter('correlation', 1.1))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('correlation', -1.1))
        .toThrow(ValidationError);
    });

    test('should validate degrees of freedom correctly', () => {
      expect(() => validator.validateParameter('degreesOfFreedom', 10))
        .not.toThrow();

      expect(() => validator.validateParameter('degreesOfFreedom', 1))
        .not.toThrow();

      expect(() => validator.validateParameter('degreesOfFreedom', 0))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('degreesOfFreedom', 1.5))
        .toThrow(ValidationError);

      expect(() => validator.validateParameter('degreesOfFreedom', 10001))
        .toThrow(ValidationError);
    });
  });

  describe('Array Validation', () => {
    test('should validate numeric arrays correctly', () => {
      const validArray = [1, 2, 3, 4, 5];
      const result = validator.validateArray('testArray', validArray, {
        elementType: 'float',
        minLength: 3,
        maxLength: 10
      });

      expect(result).toBeUndefined(); // No error thrown
    });

    test('should reject arrays with invalid length', () => {
      const shortArray = [1, 2];

      expect(() => validator.validateArray('testArray', shortArray, {
        minLength: 3
      })).toThrow(ValidationError);

      const longArray = Array(11).fill(1);

      expect(() => validator.validateArray('testArray', longArray, {
        maxLength: 10
      })).toThrow(ValidationError);
    });

    test('should validate unique values constraint', () => {
      const duplicateArray = [1, 2, 3, 2, 4];

      expect(() => validator.validateArray('testArray', duplicateArray, {
        unique: true
      })).toThrow(ValidationError);

      const uniqueArray = [1, 2, 3, 4, 5];

      expect(() => validator.validateArray('testArray', uniqueArray, {
        unique: true
      })).not.toThrow();
    });

    test('should validate variance requirement', () => {
      const noVarianceArray = [5, 5, 5, 5, 5];

      expect(() => validator.validateArray('testArray', noVarianceArray, {
        elementType: 'float',
        requireVariance: true
      })).toThrow(ValidationError);

      const withVarianceArray = [1, 2, 3, 4, 5];

      expect(() => validator.validateArray('testArray', withVarianceArray, {
        elementType: 'float',
        requireVariance: true
      })).not.toThrow();
    });

    test('should validate sum constraint', () => {
      const probabilities = [0.2, 0.3, 0.5];

      expect(() => validator.validateArray('probabilities', probabilities, {
        elementType: 'float',
        sumToOne: true
      })).not.toThrow();

      const invalidProbabilities = [0.2, 0.3, 0.4];

      expect(() => validator.validateArray('probabilities', invalidProbabilities, {
        elementType: 'float',
        sumToOne: true
      })).toThrow(ValidationError);
    });
  });

  describe('Matrix Validation', () => {
    test('should validate rectangular matrices', () => {
      const validMatrix = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];

      expect(() => validator.validateMatrix('testMatrix', validMatrix))
        .not.toThrow();

      const invalidMatrix = [
        [1, 2, 3],
        [4, 5],  // Inconsistent row length
        [7, 8, 9]
      ];

      expect(() => validator.validateMatrix('testMatrix', invalidMatrix))
        .toThrow(ValidationError);
    });

    test('should validate square matrices', () => {
      const squareMatrix = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];

      expect(() => validator.validateMatrix('testMatrix', squareMatrix, {
        square: true
      })).not.toThrow();

      const nonSquareMatrix = [
        [1, 2, 3],
        [4, 5, 6]
      ];

      expect(() => validator.validateMatrix('testMatrix', nonSquareMatrix, {
        square: true
      })).toThrow(ValidationError);
    });

    test('should validate symmetric matrices', () => {
      const symmetricMatrix = [
        [1, 2, 3],
        [2, 5, 6],
        [3, 6, 9]
      ];

      expect(() => validator.validateMatrix('testMatrix', symmetricMatrix, {
        symmetric: true
      })).not.toThrow();

      const nonSymmetricMatrix = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];

      expect(() => validator.validateMatrix('testMatrix', nonSymmetricMatrix, {
        symmetric: true
      })).toThrow(ValidationError);
    });

    test('should validate correlation matrices', () => {
      const validCorrelation = [
        [1.0, 0.5, 0.3],
        [0.5, 1.0, 0.7],
        [0.3, 0.7, 1.0]
      ];

      expect(() => validator.validateMatrix('correlationMatrix', validCorrelation, {
        isCorrelation: true
      })).not.toThrow();

      const invalidCorrelation = [
        [1.0, 0.5, 0.3],
        [0.5, 0.9, 0.7],  // Diagonal not 1
        [0.3, 0.7, 1.0]
      ];

      expect(() => validator.validateMatrix('correlationMatrix', invalidCorrelation, {
        isCorrelation: true
      })).toThrow(ValidationError);
    });

    test('should validate positive definite matrices', () => {
      const positiveDefinite = [
        [4, 1, 1],
        [1, 3, 1],
        [1, 1, 2]
      ];

      expect(() => validator.validateMatrix('testMatrix', positiveDefinite, {
        positiveDefinite: true
      })).not.toThrow();

      const notPositiveDefinite = [
        [1, 2, 3],
        [2, 1, 2],
        [3, 2, 1]
      ];

      expect(() => validator.validateMatrix('testMatrix', notPositiveDefinite, {
        positiveDefinite: true
      })).toThrow(ValidationError);
    });
  });

  describe('Performance Metrics', () => {
    test('should track validation performance', () => {
      validator.reset();

      validator.validateParameter('sampleSize', 100);
      validator.validateParameter('confidenceLevel', 0.95);

      try {
        validator.validateParameter('sampleSize', -10);
      } catch (e) {
        // Expected to fail
      }

      const metrics = validator.getPerformanceMetrics();

      expect(metrics.totalValidations).toBe(3);
      expect(metrics.failedValidations).toBe(1);
      expect(metrics.successRate).toBeCloseTo(0.667, 2);
      expect(metrics.avgValidationTime).toBeGreaterThan(0);
    });
  });
});

describe('ErrorRecoveryManager', () => {
  let recoveryManager;

  beforeEach(() => {
    recoveryManager = new ErrorRecoveryManager({
      maxRetryAttempts: 3,
      initialRetryDelay: 100,
      auditConfig: { enabled: false }
    });
  });

  describe('Retry Strategy', () => {
    test('should retry failed operations', async () => {
      let attempts = 0;
      const operation = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Operation failed');
        }
        return 'success';
      });

      const error = new RecoverableError('Test error', {
        recoveryStrategy: RecoveryStrategy.RETRY,
        context: { operation }
      });

      const result = await recoveryManager.handleError(error);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries', async () => {
      const operation = jest.fn(() => {
        throw new Error('Always fails');
      });

      const error = new RecoverableError('Test error', {
        recoveryStrategy: RecoveryStrategy.RETRY,
        maxAttempts: 2,
        context: { operation }
      });

      await expect(recoveryManager.handleError(error, {
        maxAttempts: 2
      })).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Fallback Strategy', () => {
    test('should use fallback value on error', async () => {
      const error = new RecoverableError('Test error', {
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        fallbackValue: 'default value'
      });

      const result = await recoveryManager.handleError(error);

      expect(result.success).toBe(true);
      expect(result.result).toBe('default value');
    });

    test('should use type-based fallback', async () => {
      const error = new RecoverableError('Test error', {
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        context: { expectedType: 'array' }
      });

      const result = await recoveryManager.handleError(error);

      expect(result.success).toBe(true);
      expect(result.result).toEqual([]);
    });
  });

  describe('Rollback Strategy', () => {
    test('should execute rollback operation', async () => {
      const rollbackOperation = jest.fn(() => 'rolled back');

      const error = new RecoverableError('Test error', {
        recoveryStrategy: RecoveryStrategy.ROLLBACK,
        rollbackData: { operation: rollbackOperation }
      });

      const result = await recoveryManager.handleError(error);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ rolledBack: true });
      expect(rollbackOperation).toHaveBeenCalled();
    });

    test('should restore previous state', async () => {
      const previousState = { value: 'original' };

      const error = new RecoverableError('Test error', {
        recoveryStrategy: RecoveryStrategy.ROLLBACK,
        rollbackData: { previousState }
      });

      const result = await recoveryManager.handleError(error);

      expect(result.success).toBe(true);
      expect(result.result).toEqual(previousState);
    });
  });

  describe('Circuit Breaker', () => {
    test('should trip circuit after threshold failures', async () => {
      const circuitBreaker = recoveryManager.getOrCreateCircuitBreaker('test');

      const failingOperation = jest.fn(() => {
        throw new Error('Always fails');
      });

      // Fail multiple times to trip the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.state).toBe('open');

      // Should fail immediately when open
      await expect(circuitBreaker.execute(failingOperation))
        .rejects.toThrow('Circuit breaker is open');

      // Operation should not have been called when circuit is open
      expect(failingOperation).toHaveBeenCalledTimes(5);
    });

    test('should use fallback when circuit is open', async () => {
      const circuitBreaker = recoveryManager.getOrCreateCircuitBreaker('test-fallback');

      const failingOperation = jest.fn(() => {
        throw new Error('Always fails');
      });

      const fallback = jest.fn(() => 'fallback value');

      // Trip the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(failingOperation, fallback);
        } catch (e) {
          // Expected
        }
      }

      // Should use fallback when open
      const result = await circuitBreaker.execute(failingOperation, fallback);

      expect(result).toBe('fallback value');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('Queue Strategy', () => {
    test('should queue operations for later execution', async () => {
      const operation = jest.fn(() => 'queued result');

      const error = new RecoverableError('Test error', {
        recoveryStrategy: RecoveryStrategy.QUEUE,
        context: { operation }
      });

      const result = await recoveryManager.handleError(error, {
        delay: 100
      });

      expect(result.success).toBe(true);
      expect(result.result.queued).toBe(true);
      expect(result.result.queueId).toBeDefined();
      expect(recoveryManager.operationQueue).toHaveLength(1);

      // Clean up
      recoveryManager.reset();
    });
  });

  describe('Statistics', () => {
    test('should track recovery statistics', async () => {
      recoveryManager.reset();

      // Successful recovery
      const successError = new RecoverableError('Test', {
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        fallbackValue: 'recovered'
      });

      await recoveryManager.handleError(successError);

      // Failed recovery
      const failError = new RecoverableError('Test', {
        recoveryStrategy: RecoveryStrategy.RETRY,
        canRecover: false
      });

      try {
        await recoveryManager.handleError(failError);
      } catch (e) {
        // Expected
      }

      const stats = recoveryManager.getStatistics();

      expect(stats.totalErrors).toBe(2);
      expect(stats.recoveredErrors).toBe(1);
      expect(stats.failedRecoveries).toBe(1);
      expect(stats.recoveryRate).toBe(0.5);
    });
  });
});

describe('CentralErrorHandler', () => {
  let errorHandler;
  let notificationCallback;

  beforeEach(() => {
    notificationCallback = jest.fn();
    errorHandler = new CentralErrorHandler({
      enableRecovery: true,
      enableAudit: false,
      enableNotifications: true,
      notificationCallback
    });
  });

  describe('Error Categorization', () => {
    test('should categorize validation errors', async () => {
      const validationError = new ValidationError('sampleSize', -10, 'below minimum');

      const result = await errorHandler.handleError(validationError);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.handled).toBe(true);
    });

    test('should categorize network errors', async () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'NetworkError';

      const result = await errorHandler.handleError(networkError);

      expect(result.category).toBe(ErrorCategory.NETWORK);
    });

    test('should categorize system errors', async () => {
      const typeError = new TypeError('Cannot read property of undefined');

      const result = await errorHandler.handleError(typeError);

      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.handled).toBe(true);
    });
  });

  describe('Error Notification', () => {
    test('should notify user for validation errors', async () => {
      const validationError = new ValidationError('sampleSize', -10, 'below minimum');

      await errorHandler.handleError(validationError);

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: NotificationLevel.WARNING
        })
      );
    });

    test('should notify critically for system errors', async () => {
      const criticalError = new Error('Critical system failure');
      criticalError.severity = ErrorSeverity.CRITICAL;

      await errorHandler.handleError(criticalError);

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: NotificationLevel.CRITICAL
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce error rate limits', async () => {
      errorHandler.config.maxErrorRate = 5;
      errorHandler.config.errorRateWindow = 1000;

      // Generate errors rapidly
      for (let i = 0; i < 10; i++) {
        const error = new Error(`Error ${i}`);
        await errorHandler.handleError(error);
      }

      // Should be rate limited
      const result = await errorHandler.handleError(new Error('Rate limited'));

      expect(result.rateLimited).toBe(true);
      expect(result.handled).toBe(false);
    });
  });

  describe('Custom Handlers', () => {
    test('should use registered custom handlers', async () => {
      const customHandler = jest.fn(async (error, context) => ({
        handled: true,
        result: 'custom handled',
        notification: {
          level: NotificationLevel.INFO,
          message: 'Custom handler executed'
        }
      }));

      class CustomError extends Error {
        constructor(message) {
          super(message);
          this.name = 'CustomError';
        }
      }

      errorHandler.registerHandler(CustomError, customHandler);

      const customError = new CustomError('Test custom error');
      const result = await errorHandler.handleError(customError);

      expect(customHandler).toHaveBeenCalled();
      expect(result.handled).toBe(true);
      expect(result.result).toBe('custom handled');
    });
  });

  describe('Global Handlers', () => {
    test('should execute global handlers', async () => {
      const globalHandler = jest.fn();

      errorHandler.registerGlobalHandler(globalHandler);

      const error = new Error('Test error');
      await errorHandler.handleError(error);

      expect(globalHandler).toHaveBeenCalledWith(
        error,
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('Validation Integration', () => {
    test('should validate with error handling', async () => {
      const result = await errorHandler.validateWithHandling('sampleSize', 100);

      expect(result.valid).toBe(true);
      expect(result.paramName).toBe('sampleSize');
    });

    test('should handle validation failures gracefully', async () => {
      await expect(errorHandler.validateWithHandling('sampleSize', -10))
        .rejects.toThrow(ValidationError);

      expect(notificationCallback).toHaveBeenCalled();
    });
  });

  describe('Operation Execution', () => {
    test('should execute operations with error handling', async () => {
      const successOperation = jest.fn(async () => 'success');

      const result = await errorHandler.executeWithHandling(successOperation);

      expect(result).toBe('success');
      expect(successOperation).toHaveBeenCalled();
    });

    test('should handle operation failures', async () => {
      const failingOperation = jest.fn(async () => {
        throw new Error('Operation failed');
      });

      await expect(errorHandler.executeWithHandling(failingOperation))
        .rejects.toThrow('Operation failed');

      expect(failingOperation).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    test('should track error statistics', async () => {
      errorHandler.reset();

      await errorHandler.handleError(new Error('Error 1'));
      await errorHandler.handleError(new ValidationError('field', 'value', 'constraint'));

      const criticalError = new Error('Critical');
      criticalError.severity = ErrorSeverity.CRITICAL;
      await errorHandler.handleError(criticalError);

      const stats = errorHandler.getStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.criticalErrors).toBe(1);
      expect(stats.recentErrors).toBe(3);
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete validation workflow', async () => {
    const errorHandler = new CentralErrorHandler({
      enableRecovery: true,
      enableAudit: false,
      enableNotifications: false
    });

    // Valid data
    const validResult = await errorHandler.validateWithHandling('sampleSize', 50);
    expect(validResult.valid).toBe(true);

    // Invalid data with recovery
    const invalidError = new ValidationError('confidenceLevel', 1.5, 'above maximum');
    invalidError.fallbackValue = { valid: false, defaulted: true, value: 0.95 };

    const recoveredResult = await errorHandler.handleError(invalidError);
    expect(recoveredResult.handled).toBe(true);
  });

  test('should handle cascading errors with circuit breaker', async () => {
    const recoveryManager = new ErrorRecoveryManager({
      maxRetryAttempts: 2,
      initialRetryDelay: 10
    });

    let callCount = 0;
    const unstableOperation = () => {
      callCount++;
      if (callCount < 10) {
        throw new Error('Service unavailable');
      }
      return 'success';
    };

    // Create multiple errors to trip circuit
    const promises = [];
    for (let i = 0; i < 7; i++) {
      const error = new RecoverableError('Service error', {
        recoveryStrategy: RecoveryStrategy.RETRY,
        context: { operation: unstableOperation }
      });
      promises.push(recoveryManager.handleError(error).catch(e => e));
    }

    await Promise.all(promises);

    // Circuit should be tripped, preventing excessive retries
    expect(callCount).toBeLessThan(21); // Would be 21 without circuit breaker (7 * 3)
  });

  test('should maintain audit trail for regulatory compliance', async () => {
    const auditLogger = new AuditLogger({
      enabled: true,
      persistToLocalStorage: true,
      persistToIndexedDB: false
    });

    // Perform operations
    auditLogger.logDataAccess('user123', 'patient_data', 'record_456', 'READ');
    auditLogger.logDataModification('user123', 'patient_data', 'record_456',
      { status: 'active' }, { status: 'inactive' });
    auditLogger.logCalculation('STATISTICS', { n: 100 }, { mean: 50 }, 125);

    // Verify audit trail
    const logs = await auditLogger.query({
      userId: 'user123'
    });

    expect(logs.length).toBeGreaterThanOrEqual(3);
    expect(logs[0].userId).toBe('user123');

    // Verify chain integrity
    const integrity = auditLogger.verifyChainIntegrity();
    expect(integrity.valid).toBe(true);
  });
});

// Export test utilities for other test files
export const createMockValidator = (config = {}) => {
  return new StatisticalDataValidator({
    strictMode: true,
    auditConfig: { enabled: false },
    ...config
  });
};

export const createMockErrorHandler = (config = {}) => {
  return new CentralErrorHandler({
    enableRecovery: true,
    enableAudit: false,
    enableNotifications: false,
    ...config
  });
};

export const createMockRecoveryManager = (config = {}) => {
  return new ErrorRecoveryManager({
    maxRetryAttempts: 3,
    initialRetryDelay: 100,
    auditConfig: { enabled: false },
    ...config
  });
};