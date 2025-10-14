/**
 * Error Recovery and Resilience System
 * Provides automatic recovery from failures and maintains data integrity
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Circuit breaker pattern for fault tolerance
 * - Data recovery and rollback capabilities
 * - Error context preservation
 * - Recovery strategy selection
 *
 * @module ErrorRecovery
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import { AuditLogger } from './AuditLogger';

/**
 * Recovery strategies enumeration
 */
export const RecoveryStrategy = {
  RETRY: 'retry',
  ROLLBACK: 'rollback',
  FALLBACK: 'fallback',
  CACHE: 'cache',
  QUEUE: 'queue',
  IGNORE: 'ignore',
  ESCALATE: 'escalate'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open'
};

/**
 * Enhanced error class with recovery context
 */
export class RecoverableError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'RecoverableError';
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.recoveryStrategy = options.recoveryStrategy || RecoveryStrategy.RETRY;
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();
    this.attemptCount = 0;
    this.maxAttempts = options.maxAttempts || 3;
    this.canRecover = options.canRecover !== false;
    this.originalError = options.originalError || null;
    this.fallbackValue = options.fallbackValue;
    this.rollbackData = options.rollbackData;
  }

  incrementAttempt() {
    this.attemptCount++;
    return this.attemptCount < this.maxAttempts;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      severity: this.severity,
      recoveryStrategy: this.recoveryStrategy,
      context: this.context,
      timestamp: this.timestamp,
      attemptCount: this.attemptCount,
      maxAttempts: this.maxAttempts,
      canRecover: this.canRecover,
      stack: this.stack
    };
  }
}

/**
 * Circuit Breaker implementation for fault tolerance
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }

  async execute(fn, fallback) {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        if (fallback) {
          return fallback();
        }
        throw new RecoverableError('Circuit breaker is open', {
          severity: ErrorSeverity.HIGH,
          recoveryStrategy: RecoveryStrategy.FALLBACK,
          context: { circuitName: this.name }
        });
      } else {
        this.state = CircuitState.HALF_OPEN;
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.reset();
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.recordFailure();

      if (this.state === CircuitState.OPEN && fallback) {
        return fallback();
      }

      throw error;
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      this.trip();
    }
  }

  trip() {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.resetTimeout;
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }
}

/**
 * Main Error Recovery Manager
 */
export class ErrorRecoveryManager {
  constructor(options = {}) {
    this.auditLogger = new AuditLogger(options.auditConfig);
    this.circuitBreakers = new Map();
    this.recoveryHandlers = new Map();
    this.errorHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
    this.globalFallback = options.globalFallback || null;

    // Retry configuration
    this.retryConfig = {
      maxAttempts: options.maxRetryAttempts || 3,
      initialDelay: options.initialRetryDelay || 1000,
      maxDelay: options.maxRetryDelay || 10000,
      backoffMultiplier: options.backoffMultiplier || 2,
      jitter: options.retryJitter !== false
    };

    // Recovery strategies configuration
    this.strategies = {
      [RecoveryStrategy.RETRY]: this.retryStrategy.bind(this),
      [RecoveryStrategy.ROLLBACK]: this.rollbackStrategy.bind(this),
      [RecoveryStrategy.FALLBACK]: this.fallbackStrategy.bind(this),
      [RecoveryStrategy.CACHE]: this.cacheStrategy.bind(this),
      [RecoveryStrategy.QUEUE]: this.queueStrategy.bind(this),
      [RecoveryStrategy.IGNORE]: this.ignoreStrategy.bind(this),
      [RecoveryStrategy.ESCALATE]: this.escalateStrategy.bind(this)
    };

    // Data recovery cache
    this.recoveryCache = new Map();
    this.rollbackStack = [];
    this.operationQueue = [];

    // Statistics
    this.statistics = {
      totalErrors: 0,
      recoveredErrors: 0,
      failedRecoveries: 0,
      strategyUsage: {},
      severityDistribution: {}
    };

    this.initializeDefaultHandlers();
  }

  /**
   * Initialize default recovery handlers
   * @private
   */
  initializeDefaultHandlers() {
    // Network errors
    this.registerRecoveryHandler('NetworkError', async (error) => {
      return this.strategies[RecoveryStrategy.RETRY](
        error,
        { maxAttempts: 5, initialDelay: 2000 }
      );
    });

    // Validation errors
    this.registerRecoveryHandler('ValidationError', async (error) => {
      return this.strategies[RecoveryStrategy.FALLBACK](
        error,
        { fallbackValue: error.fallbackValue }
      );
    });

    // Calculation errors
    this.registerRecoveryHandler('CalculationError', async (error) => {
      return this.strategies[RecoveryStrategy.ROLLBACK](
        error,
        { rollbackData: error.rollbackData }
      );
    });

    // Memory errors
    this.registerRecoveryHandler('MemoryError', async (error) => {
      // Clear caches and retry
      this.clearCaches();
      return this.strategies[RecoveryStrategy.RETRY](
        error,
        { maxAttempts: 2 }
      );
    });
  }

  /**
   * Main error handling and recovery method
   */
  async handleError(error, options = {}) {
    const startTime = performance.now();
    const errorId = this.generateErrorId();

    try {
      // Convert to RecoverableError if needed
      const recoverableError = this.toRecoverableError(error, options);

      // Log error occurrence
      this.auditLogger.logError(recoverableError, {
        errorId,
        recoveryAttempt: true
      });

      // Update statistics
      this.updateStatistics(recoverableError);

      // Add to history
      this.addToHistory(recoverableError);

      // Check if recovery is possible
      if (!recoverableError.canRecover) {
        throw recoverableError;
      }

      // Get recovery strategy
      const strategy = this.selectStrategy(recoverableError);

      // Execute recovery
      const result = await this.executeRecovery(
        recoverableError,
        strategy,
        options
      );

      // Log successful recovery
      this.auditLogger.log({
        action: 'ERROR_RECOVERED',
        category: 'system',
        details: {
          errorId,
          strategy,
          duration: performance.now() - startTime
        },
        result: 'success'
      });

      this.statistics.recoveredErrors++;

      return {
        success: true,
        result,
        strategy,
        errorId
      };

    } catch (finalError) {
      // Log failed recovery
      this.auditLogger.log({
        action: 'ERROR_RECOVERY_FAILED',
        category: 'error',
        details: {
          errorId,
          originalError: error.message,
          finalError: finalError.message,
          duration: performance.now() - startTime
        },
        result: 'failure'
      }, 'error');

      this.statistics.failedRecoveries++;

      // Try global fallback if available
      if (this.globalFallback) {
        return {
          success: false,
          result: await this.globalFallback(finalError),
          strategy: 'global_fallback',
          errorId
        };
      }

      throw finalError;
    }
  }

  /**
   * Execute recovery with circuit breaker
   * @private
   */
  async executeRecovery(error, strategy, options) {
    const circuitBreaker = this.getOrCreateCircuitBreaker(strategy);

    return circuitBreaker.execute(
      async () => {
        const handler = this.strategies[strategy];
        if (!handler) {
          throw new Error(`Unknown recovery strategy: ${strategy}`);
        }

        return await handler(error, options);
      },
      () => this.globalFallback ? this.globalFallback(error) : null
    );
  }

  /**
   * Retry strategy with exponential backoff
   * @private
   */
  async retryStrategy(error, options = {}) {
    const config = { ...this.retryConfig, ...options };
    let lastError = error;
    let delay = 0; // Initialize delay variable

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // Calculate delay with exponential backoff
        const baseDelay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        // Add jitter if enabled
        delay = config.jitter
          ? baseDelay * (0.5 + Math.random())
          : baseDelay;

        // Wait before retry
        if (attempt > 1) {
          await this.sleep(delay);
        }

        // Execute the original operation if provided
        if (error.context && error.context.operation) {
          return await error.context.operation();
        }

        // If no operation provided, consider it recovered
        return { recovered: true, attempt };

      } catch (retryError) {
        lastError = retryError;

        // Log retry attempt
        this.auditLogger.log({
          action: 'RETRY_ATTEMPT',
          category: 'recovery',
          details: {
            attempt,
            maxAttempts: config.maxAttempts,
            delay: delay || 0,
            error: retryError.message
          },
          result: attempt < config.maxAttempts ? 'continue' : 'failed'
        });

        if (attempt === config.maxAttempts) {
          throw new RecoverableError(`Retry failed after ${attempt} attempts`, {
            severity: ErrorSeverity.HIGH,
            originalError: lastError,
            canRecover: false
          });
        }
      }
    }

    throw lastError;
  }

  /**
   * Rollback strategy
   * @private
   */
  async rollbackStrategy(error, options = {}) {
    const rollbackData = options.rollbackData || error.rollbackData;

    if (!rollbackData) {
      throw new Error('No rollback data available');
    }

    try {
      // Execute rollback operation
      if (typeof rollbackData === 'function') {
        await rollbackData();
      } else if (rollbackData.operation) {
        await rollbackData.operation();
      }

      // Restore previous state if provided
      if (rollbackData.previousState) {
        return rollbackData.previousState;
      }

      return { rolledBack: true };

    } catch (rollbackError) {
      throw new RecoverableError('Rollback failed', {
        severity: ErrorSeverity.CRITICAL,
        originalError: rollbackError,
        canRecover: false
      });
    }
  }

  /**
   * Fallback strategy
   * @private
   */
  async fallbackStrategy(error, options = {}) {
    const fallbackValue = options.fallbackValue !== undefined
      ? options.fallbackValue
      : error.fallbackValue;

    if (fallbackValue !== undefined) {
      return fallbackValue;
    }

    // Check for registered fallback handler
    const fallbackHandler = this.recoveryHandlers.get(`${error.name}_fallback`);
    if (fallbackHandler) {
      return await fallbackHandler(error);
    }

    // Use default values based on context
    if (error.context && error.context.expectedType) {
      switch (error.context.expectedType) {
        case 'array':
          return [];
        case 'object':
          return {};
        case 'number':
          return 0;
        case 'string':
          return '';
        case 'boolean':
          return false;
        default:
          return null;
      }
    }

    return null;
  }

  /**
   * Cache strategy
   * @private
   */
  async cacheStrategy(error, options = {}) {
    const cacheKey = options.cacheKey || error.context?.cacheKey;

    if (!cacheKey) {
      throw new Error('No cache key provided for cache strategy');
    }

    // Check if cached value exists
    if (this.recoveryCache.has(cacheKey)) {
      const cached = this.recoveryCache.get(cacheKey);

      // Check if cache is still valid
      if (cached.expiry > Date.now()) {
        return cached.value;
      }

      // Remove expired cache
      this.recoveryCache.delete(cacheKey);
    }

    // Try to get fresh value
    if (error.context && error.context.operation) {
      try {
        const freshValue = await error.context.operation();

        // Cache the fresh value
        this.recoveryCache.set(cacheKey, {
          value: freshValue,
          expiry: Date.now() + (options.ttl || 300000) // 5 minutes default
        });

        return freshValue;
      } catch (cacheError) {
        // If we have an expired cache value, return it as last resort
        const expired = this.recoveryCache.get(cacheKey);
        if (expired) {
          return expired.value;
        }

        throw cacheError;
      }
    }

    throw new Error('Unable to recover using cache strategy');
  }

  /**
   * Queue strategy for deferred execution
   * @private
   */
  async queueStrategy(error, options = {}) {
    const operation = error.context?.operation || options.operation;

    if (!operation) {
      throw new Error('No operation provided for queue strategy');
    }

    const queueEntry = {
      id: this.generateErrorId(),
      operation,
      error,
      timestamp: Date.now(),
      retryAt: Date.now() + (options.delay || 5000),
      maxRetries: options.maxRetries || 3,
      retryCount: 0
    };

    this.operationQueue.push(queueEntry);

    // Start queue processor if not running
    if (!this.queueProcessor) {
      this.startQueueProcessor();
    }

    return {
      queued: true,
      queueId: queueEntry.id,
      retryAt: new Date(queueEntry.retryAt).toISOString()
    };
  }

  /**
   * Ignore strategy
   * @private
   */
  async ignoreStrategy(error, options = {}) {
    // Log that error was ignored
    this.auditLogger.log({
      action: 'ERROR_IGNORED',
      category: 'recovery',
      details: {
        error: error.message,
        reason: options.reason || 'Strategy decision'
      },
      result: 'ignored'
    });

    return {
      ignored: true,
      reason: options.reason
    };
  }

  /**
   * Escalate strategy
   * @private
   */
  async escalateStrategy(error, options = {}) {
    // Escalate to higher-level handler or monitoring system
    const escalationTarget = options.target || 'monitoring';

    // Log escalation
    this.auditLogger.log({
      action: 'ERROR_ESCALATED',
      category: 'critical',
      details: {
        error: error.message,
        target: escalationTarget,
        severity: error.severity
      },
      result: 'escalated'
    }, 'critical');

    // Send to monitoring system (in production)
    if (options.notificationEndpoint) {
      try {
        await fetch(options.notificationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: error.toJSON(),
            escalationTarget,
            timestamp: new Date().toISOString()
          })
        });
      } catch (notifyError) {
        console.error('Failed to send escalation notification:', notifyError);
      }
    }

    // Re-throw as critical error
    throw new RecoverableError(`Escalated: ${error.message}`, {
      severity: ErrorSeverity.CRITICAL,
      originalError: error,
      canRecover: false
    });
  }

  /**
   * Select appropriate recovery strategy
   * @private
   */
  selectStrategy(error) {
    // Use explicitly specified strategy
    if (error.recoveryStrategy) {
      return error.recoveryStrategy;
    }

    // Check for registered handler
    const handler = this.recoveryHandlers.get(error.name);
    if (handler && handler.strategy) {
      return handler.strategy;
    }

    // Select based on error type and severity
    if (error.severity === ErrorSeverity.CRITICAL) {
      return RecoveryStrategy.ESCALATE;
    }

    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return RecoveryStrategy.RETRY;
    }

    if (error.name === 'ValidationError') {
      return RecoveryStrategy.FALLBACK;
    }

    if (error.context?.rollbackData) {
      return RecoveryStrategy.ROLLBACK;
    }

    // Default strategy
    return RecoveryStrategy.RETRY;
  }

  /**
   * Register custom recovery handler
   */
  registerRecoveryHandler(errorType, handler, strategy = null) {
    this.recoveryHandlers.set(errorType, {
      handler,
      strategy
    });
  }

  /**
   * Get or create circuit breaker
   * @private
   */
  getOrCreateCircuitBreaker(name) {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker({ name }));
    }
    return this.circuitBreakers.get(name);
  }

  /**
   * Convert error to RecoverableError
   * @private
   */
  toRecoverableError(error, options = {}) {
    if (error instanceof RecoverableError) {
      return error;
    }

    return new RecoverableError(error.message, {
      severity: this.determineSeverity(error),
      originalError: error,
      context: {
        ...error.context,
        ...options.context
      },
      ...options
    });
  }

  /**
   * Determine error severity
   * @private
   */
  determineSeverity(error) {
    if (error.severity) return error.severity;

    // Critical errors
    if (error.name === 'SecurityError' ||
        error.name === 'DataIntegrityError' ||
        error.message.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity
    if (error.name === 'TypeError' ||
        error.name === 'ReferenceError' ||
        error.message.includes('failed')) {
      return ErrorSeverity.HIGH;
    }

    // Low severity
    if (error.name === 'ValidationError' ||
        error.message.includes('warning')) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Add error to history
   * @private
   */
  addToHistory(error) {
    this.errorHistory.push({
      error: error.toJSON(),
      timestamp: Date.now()
    });

    // Trim history if needed
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Update statistics
   * @private
   */
  updateStatistics(error) {
    this.statistics.totalErrors++;

    // Update strategy usage
    const strategy = error.recoveryStrategy || 'none';
    this.statistics.strategyUsage[strategy] =
      (this.statistics.strategyUsage[strategy] || 0) + 1;

    // Update severity distribution
    this.statistics.severityDistribution[error.severity] =
      (this.statistics.severityDistribution[error.severity] || 0) + 1;
  }

  /**
   * Start queue processor
   * @private
   */
  startQueueProcessor() {
    this.queueProcessor = setInterval(async () => {
      const now = Date.now();
      const readyOperations = this.operationQueue.filter(op => op.retryAt <= now);

      for (const operation of readyOperations) {
        try {
          await operation.operation();

          // Remove from queue on success
          const index = this.operationQueue.indexOf(operation);
          if (index > -1) {
            this.operationQueue.splice(index, 1);
          }
        } catch (error) {
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            // Remove from queue after max retries
            const index = this.operationQueue.indexOf(operation);
            if (index > -1) {
              this.operationQueue.splice(index, 1);
            }

            // Log failure
            this.auditLogger.log({
              action: 'QUEUE_OPERATION_FAILED',
              category: 'error',
              details: {
                operationId: operation.id,
                attempts: operation.retryCount,
                error: error.message
              },
              result: 'failed'
            }, 'error');
          } else {
            // Schedule next retry
            operation.retryAt = now + (5000 * Math.pow(2, operation.retryCount));
          }
        }
      }

      // Stop processor if queue is empty
      if (this.operationQueue.length === 0) {
        clearInterval(this.queueProcessor);
        this.queueProcessor = null;
      }
    }, 1000); // Check every second
  }

  /**
   * Clear caches
   * @private
   */
  clearCaches() {
    this.recoveryCache.clear();
  }

  /**
   * Sleep utility
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique error ID
   * @private
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recovery statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      recoveryRate: this.statistics.totalErrors > 0
        ? this.statistics.recoveredErrors / this.statistics.totalErrors
        : 0,
      circuitBreakers: Array.from(this.circuitBreakers.values())
        .map(cb => cb.getStatus()),
      queueLength: this.operationQueue.length,
      cacheSize: this.recoveryCache.size,
      historySize: this.errorHistory.length
    };
  }

  /**
   * Get error history
   */
  getErrorHistory(filter = {}) {
    let history = [...this.errorHistory];

    if (filter.severity) {
      history = history.filter(h => h.error.severity === filter.severity);
    }

    if (filter.startTime) {
      history = history.filter(h => h.timestamp >= filter.startTime);
    }

    if (filter.endTime) {
      history = history.filter(h => h.timestamp <= filter.endTime);
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Reset recovery manager
   */
  reset() {
    this.errorHistory = [];
    this.operationQueue = [];
    this.recoveryCache.clear();
    this.rollbackStack = [];
    this.circuitBreakers.clear();
    this.statistics = {
      totalErrors: 0,
      recoveredErrors: 0,
      failedRecoveries: 0,
      strategyUsage: {},
      severityDistribution: {}
    };

    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
  }
}

// Export singleton instance
export default new ErrorRecoveryManager({
  maxRetryAttempts: 3,
  initialRetryDelay: 1000,
  maxRetryDelay: 10000,
  backoffMultiplier: 2,
  retryJitter: true
});