/**
 * Central Error Handler
 * Unified error handling system for the entire application
 * Integrates validation, logging, recovery, and user notification
 *
 * @module CentralErrorHandler
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import { StatisticalDataValidator, ValidationError } from './StatisticalDataValidator';
import { AuditLogger } from './AuditLogger';
import { ErrorRecoveryManager, RecoverableError, RecoveryStrategy, ErrorSeverity } from './ErrorRecovery';

/**
 * Error categories for classification
 */
export const ErrorCategory = {
  VALIDATION: 'validation',
  CALCULATION: 'calculation',
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATA_INTEGRITY: 'data_integrity',
  SYSTEM: 'system',
  USER_INPUT: 'user_input',
  CONFIGURATION: 'configuration',
  UNKNOWN: 'unknown'
};

/**
 * User notification levels
 */
export const NotificationLevel = {
  SILENT: 'silent',      // No user notification
  INFO: 'info',          // Informational message
  WARNING: 'warning',    // Warning message
  ERROR: 'error',        // Error message
  CRITICAL: 'critical'   // Critical error requiring immediate action
};

/**
 * Error context builder for detailed error information
 */
class ErrorContext {
  constructor() {
    this.context = {
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      sessionId: this.getSessionId(),
      userId: null,
      module: null,
      operation: null,
      inputs: null,
      stackTrace: null
    };
  }

  getSessionId() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem('sessionId') || 'no-session';
    }
    return 'server-session';
  }

  setUser(userId) {
    this.context.userId = userId;
    return this;
  }

  setModule(module) {
    this.context.module = module;
    return this;
  }

  setOperation(operation) {
    this.context.operation = operation;
    return this;
  }

  setInputs(inputs) {
    this.context.inputs = this.sanitizeInputs(inputs);
    return this;
  }

  setStackTrace(stack) {
    this.context.stackTrace = stack;
    return this;
  }

  sanitizeInputs(inputs) {
    // Remove sensitive information
    if (!inputs) return null;

    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'ssn', 'creditCard'];
    const sanitized = JSON.parse(JSON.stringify(inputs));

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    if (typeof sanitized === 'object') {
      sanitizeObject(sanitized);
    }

    return sanitized;
  }

  build() {
    return { ...this.context };
  }
}

/**
 * Main Central Error Handler class
 */
export class CentralErrorHandler {
  constructor(config = {}) {
    // Initialize components
    this.validator = new StatisticalDataValidator(config.validatorConfig);
    this.auditLogger = new AuditLogger(config.auditConfig);
    this.recoveryManager = new ErrorRecoveryManager(config.recoveryConfig);

    // Configuration
    this.config = {
      enableRecovery: config.enableRecovery !== false,
      enableAudit: config.enableAudit !== false,
      enableNotifications: config.enableNotifications !== false,
      enableStackTrace: config.enableStackTrace !== false,
      maxErrorRate: config.maxErrorRate || 10, // errors per minute
      errorRateWindow: config.errorRateWindow || 60000, // 1 minute
      criticalErrorThreshold: config.criticalErrorThreshold || 5,
      notificationCallback: config.notificationCallback || null
    };

    // Error tracking
    this.errorCount = 0;
    this.errorTimestamps = [];
    this.criticalErrorCount = 0;
    this.errorHandlers = new Map();
    this.globalHandlers = [];

    // Initialize default handlers
    this.initializeDefaultHandlers();

    // Set up global error catching
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandling();
    }
  }

  /**
   * Initialize default error handlers
   * @private
   */
  initializeDefaultHandlers() {
    // Validation errors
    this.registerHandler(ValidationError, async (error, context) => {
      const result = await this.handleValidationError(error, context);
      return {
        handled: true,
        result,
        notification: {
          level: NotificationLevel.WARNING,
          message: `Validation failed: ${error.field} - ${error.constraint}`
        }
      };
    });

    // Network errors
    this.registerHandler('NetworkError', async (error, context) => {
      if (this.config.enableRecovery) {
        const recovery = await this.recoveryManager.handleError(error, {
          recoveryStrategy: RecoveryStrategy.RETRY,
          maxAttempts: 3,
          context
        });
        return {
          handled: recovery.success,
          result: recovery.result,
          notification: {
            level: recovery.success ? NotificationLevel.INFO : NotificationLevel.ERROR,
            message: recovery.success
              ? 'Network issue resolved'
              : 'Network error - please check your connection'
          }
        };
      }
      return { handled: false };
    });

    // Type errors (programming errors)
    this.registerHandler(TypeError, async (error, context) => {
      // These are usually programming errors
      this.auditLogger.log({
        action: 'PROGRAMMING_ERROR',
        category: 'critical',
        details: {
          error: error.message,
          stack: error.stack,
          context
        },
        result: 'logged'
      }, 'critical');

      return {
        handled: true,
        notification: {
          level: NotificationLevel.ERROR,
          message: 'An unexpected error occurred. Our team has been notified.'
        }
      };
    });

    // Range errors
    this.registerHandler(RangeError, async (error, context) => {
      return {
        handled: true,
        result: null,
        notification: {
          level: NotificationLevel.WARNING,
          message: 'Value out of acceptable range'
        }
      };
    });
  }

  /**
   * Setup global error handling
   * @private
   */
  setupGlobalErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'uncaught',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandled_promise',
        promise: event.promise
      });
    });
  }

  /**
   * Main error handling method
   */
  async handleError(error, contextData = {}) {
    const startTime = performance.now();
    const errorId = this.generateErrorId();

    try {
      // Build error context
      const context = new ErrorContext()
        .setModule(contextData.module)
        .setOperation(contextData.operation)
        .setInputs(contextData.inputs)
        .setStackTrace(error.stack || new Error().stack)
        .build();

      // Categorize error
      const category = this.categorizeError(error);

      // Check error rate limiting
      if (this.isErrorRateExceeded()) {
        this.handleErrorRateExceeded();
        return {
          errorId,
          handled: false,
          rateLimited: true
        };
      }

      // Track error
      this.trackError(error, category);

      // Log to audit
      if (this.config.enableAudit) {
        this.auditLogger.logError(error, {
          errorId,
          category,
          context,
          ...contextData
        });
      }

      // Find and execute handler
      const handler = this.findHandler(error);
      let handlerResult = null;

      if (handler) {
        handlerResult = await handler(error, context);
      }

      // Try recovery if handler didn't fully resolve
      if (!handlerResult || !handlerResult.handled) {
        if (this.config.enableRecovery) {
          const recoveryResult = await this.attemptRecovery(error, context);
          if (recoveryResult.success) {
            handlerResult = {
              handled: true,
              result: recoveryResult.result,
              recoveryStrategy: recoveryResult.strategy
            };
          }
        }
      }

      // Notify user if needed
      if (this.config.enableNotifications && handlerResult) {
        await this.notifyUser(error, handlerResult.notification || {
          level: this.getNotificationLevel(error, category),
          message: this.getUserMessage(error, category)
        });
      }

      // Execute global handlers
      for (const globalHandler of this.globalHandlers) {
        try {
          await globalHandler(error, context, handlerResult);
        } catch (globalError) {
          console.error('Global handler failed:', globalError);
        }
      }

      // Check for critical error threshold
      if (category === ErrorCategory.SYSTEM || error.severity === ErrorSeverity.CRITICAL) {
        this.criticalErrorCount++;
        if (this.criticalErrorCount >= this.config.criticalErrorThreshold) {
          this.handleCriticalThreshold();
        }
      }

      const duration = performance.now() - startTime;

      return {
        errorId,
        handled: handlerResult?.handled || false,
        result: handlerResult?.result,
        category,
        duration,
        recoveryStrategy: handlerResult?.recoveryStrategy
      };

    } catch (handlingError) {
      // Last resort - log the error handling failure
      console.error('Error handler failed:', handlingError);
      console.error('Original error:', error);

      return {
        errorId,
        handled: false,
        handlingError: handlingError.message
      };
    }
  }

  /**
   * Handle validation errors specifically
   * @private
   */
  async handleValidationError(error, context) {
    // Check if it's a statistical validation error
    if (error.field && STATISTICAL_BOUNDS[error.field]) {
      const bounds = STATISTICAL_BOUNDS[error.field];

      // Provide helpful context
      const suggestion = this.getValidationSuggestion(error.field, error.value, bounds);

      return {
        valid: false,
        field: error.field,
        value: error.value,
        constraint: error.constraint,
        suggestion,
        bounds
      };
    }

    return {
      valid: false,
      error: error.message
    };
  }

  /**
   * Get validation suggestion
   * @private
   */
  getValidationSuggestion(field, value, bounds) {
    const suggestions = [];

    if (typeof value === 'number') {
      if (value < bounds.min) {
        suggestions.push(`Value must be at least ${bounds.min}`);
      }
      if (value > bounds.max) {
        suggestions.push(`Value must be at most ${bounds.max}`);
      }
      if (bounds.type === 'integer' && !Number.isInteger(value)) {
        suggestions.push(`Value must be an integer`);
      }
    }

    // Field-specific suggestions
    switch (field) {
      case 'sampleSize':
        suggestions.push('Sample size must be a positive integer');
        break;
      case 'confidenceLevel':
        suggestions.push('Confidence level must be between 0 and 1 (e.g., 0.95 for 95%)');
        break;
      case 'standardDeviation':
        suggestions.push('Standard deviation must be non-negative');
        break;
      case 'degreesOfFreedom':
        suggestions.push('Degrees of freedom must be a positive integer');
        break;
    }

    return suggestions.join('. ');
  }

  /**
   * Attempt error recovery
   * @private
   */
  async attemptRecovery(error, context) {
    // Create recoverable error
    const recoverableError = new RecoverableError(error.message, {
      severity: this.determineSeverity(error),
      context,
      originalError: error,
      recoveryStrategy: this.selectRecoveryStrategy(error)
    });

    return this.recoveryManager.handleError(recoverableError);
  }

  /**
   * Categorize error
   * @private
   */
  categorizeError(error) {
    if (error instanceof ValidationError || error.name === 'ValidationError') {
      return ErrorCategory.VALIDATION;
    }

    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }

    if (error.name === 'AuthenticationError') {
      return ErrorCategory.AUTHENTICATION;
    }

    if (error.name === 'AuthorizationError') {
      return ErrorCategory.AUTHORIZATION;
    }

    if (error.message.includes('calculation') || error.message.includes('compute')) {
      return ErrorCategory.CALCULATION;
    }

    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return ErrorCategory.SYSTEM;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   * @private
   */
  determineSeverity(error) {
    if (error.severity) return error.severity;

    if (error.name === 'SecurityError' ||
        error.name === 'DataIntegrityError') {
      return ErrorSeverity.CRITICAL;
    }

    if (error.name === 'TypeError' ||
        error.name === 'ReferenceError') {
      return ErrorSeverity.HIGH;
    }

    if (error.name === 'ValidationError') {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Select recovery strategy based on error type
   * @private
   */
  selectRecoveryStrategy(error) {
    const category = this.categorizeError(error);

    switch (category) {
      case ErrorCategory.NETWORK:
        return RecoveryStrategy.RETRY;
      case ErrorCategory.VALIDATION:
        return RecoveryStrategy.FALLBACK;
      case ErrorCategory.CALCULATION:
        return RecoveryStrategy.CACHE;
      case ErrorCategory.SYSTEM:
        return RecoveryStrategy.ESCALATE;
      default:
        return RecoveryStrategy.RETRY;
    }
  }

  /**
   * Get notification level for error
   * @private
   */
  getNotificationLevel(error, category) {
    const severity = this.determineSeverity(error);

    if (severity === ErrorSeverity.CRITICAL) {
      return NotificationLevel.CRITICAL;
    }

    if (severity === ErrorSeverity.HIGH) {
      return NotificationLevel.ERROR;
    }

    if (category === ErrorCategory.VALIDATION ||
        category === ErrorCategory.USER_INPUT) {
      return NotificationLevel.WARNING;
    }

    return NotificationLevel.INFO;
  }

  /**
   * Get user-friendly error message
   * @private
   */
  getUserMessage(error, category) {
    const messages = {
      [ErrorCategory.VALIDATION]: 'Please check your input values',
      [ErrorCategory.NETWORK]: 'Network connection issue - please try again',
      [ErrorCategory.AUTHENTICATION]: 'Please log in to continue',
      [ErrorCategory.AUTHORIZATION]: 'You don\'t have permission for this action',
      [ErrorCategory.CALCULATION]: 'Calculation error - please verify your inputs',
      [ErrorCategory.SYSTEM]: 'System error - our team has been notified',
      [ErrorCategory.DATA_INTEGRITY]: 'Data integrity issue detected',
      [ErrorCategory.CONFIGURATION]: 'Configuration error - please contact support',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred'
    };

    return messages[category] || messages[ErrorCategory.UNKNOWN];
  }

  /**
   * Track error for rate limiting
   * @private
   */
  trackError(error, category) {
    const now = Date.now();

    // Add timestamp
    this.errorTimestamps.push(now);

    // Remove old timestamps outside window
    const windowStart = now - this.config.errorRateWindow;
    this.errorTimestamps = this.errorTimestamps.filter(ts => ts > windowStart);

    // Increment counter
    this.errorCount++;
  }

  /**
   * Check if error rate is exceeded
   * @private
   */
  isErrorRateExceeded() {
    const now = Date.now();
    const windowStart = now - this.config.errorRateWindow;
    const recentErrors = this.errorTimestamps.filter(ts => ts > windowStart);

    return recentErrors.length > this.config.maxErrorRate;
  }

  /**
   * Handle error rate exceeded
   * @private
   */
  handleErrorRateExceeded() {
    this.auditLogger.log({
      action: 'ERROR_RATE_EXCEEDED',
      category: 'security',
      details: {
        errorCount: this.errorTimestamps.length,
        maxRate: this.config.maxErrorRate,
        window: this.config.errorRateWindow
      },
      result: 'rate_limited'
    }, 'warning');

    // Could trigger additional security measures here
  }

  /**
   * Handle critical error threshold
   * @private
   */
  handleCriticalThreshold() {
    this.auditLogger.log({
      action: 'CRITICAL_ERROR_THRESHOLD',
      category: 'critical',
      details: {
        criticalCount: this.criticalErrorCount,
        threshold: this.config.criticalErrorThreshold
      },
      result: 'threshold_exceeded'
    }, 'critical');

    // Notify administrators
    if (this.config.notificationCallback) {
      this.config.notificationCallback({
        level: NotificationLevel.CRITICAL,
        message: 'Critical error threshold exceeded - immediate attention required'
      });
    }

    // Could trigger emergency procedures here
  }

  /**
   * Notify user about error
   * @private
   */
  async notifyUser(error, notification) {
    if (this.config.notificationCallback) {
      try {
        await this.config.notificationCallback(notification);
      } catch (notifyError) {
        console.error('Failed to notify user:', notifyError);
      }
    }
  }

  /**
   * Find handler for error
   * @private
   */
  findHandler(error) {
    // Check for exact match
    if (this.errorHandlers.has(error.constructor)) {
      return this.errorHandlers.get(error.constructor);
    }

    // Check by error name
    if (error.name && this.errorHandlers.has(error.name)) {
      return this.errorHandlers.get(error.name);
    }

    // Check inheritance chain
    let proto = Object.getPrototypeOf(error);
    while (proto && proto.constructor !== Object) {
      if (this.errorHandlers.has(proto.constructor)) {
        return this.errorHandlers.get(proto.constructor);
      }
      proto = Object.getPrototypeOf(proto);
    }

    return null;
  }

  /**
   * Register error handler
   */
  registerHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }

  /**
   * Register global handler
   */
  registerGlobalHandler(handler) {
    this.globalHandlers.push(handler);
  }

  /**
   * Generate unique error ID
   * @private
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate data with error handling
   */
  async validateWithHandling(paramName, value, options = {}) {
    try {
      return this.validator.validateParameter(paramName, value, options);
    } catch (validationError) {
      const result = await this.handleError(validationError, {
        module: 'validation',
        operation: 'validateParameter',
        inputs: { paramName, value, options }
      });

      if (result.handled && result.result) {
        return result.result;
      }

      throw validationError;
    }
  }

  /**
   * Execute operation with error handling
   */
  async executeWithHandling(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      const result = await this.handleError(error, {
        ...context,
        operation: operation.name || 'anonymous'
      });

      if (result.handled && result.result !== undefined) {
        return result.result;
      }

      throw error;
    }
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.errorTimestamps.length,
      criticalErrors: this.criticalErrorCount,
      errorRate: this.errorTimestamps.length / (this.config.errorRateWindow / 1000),
      recoveryStats: this.recoveryManager.getStatistics(),
      auditStats: this.auditLogger.getStatistics()
    };
  }

  /**
   * Reset error handler
   */
  reset() {
    this.errorCount = 0;
    this.errorTimestamps = [];
    this.criticalErrorCount = 0;
    this.recoveryManager.reset();
  }
}

// Import STATISTICAL_BOUNDS from validator
const STATISTICAL_BOUNDS = {
  sampleSize: { min: 1, max: 1000000, type: 'integer' },
  confidenceLevel: { min: 0, max: 1, type: 'float', excludeZero: true, excludeOne: true },
  standardDeviation: { min: 0, max: 1e10, type: 'float' },
  degreesOfFreedom: { min: 1, max: 10000, type: 'integer' }
};

// Export singleton instance
export default new CentralErrorHandler({
  enableRecovery: true,
  enableAudit: true,
  enableNotifications: true,
  enableStackTrace: true
});