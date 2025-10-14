# Validation System Integration Guide

## Overview
The StickForStats Validation System provides enterprise-grade data validation, error recovery, and audit logging for scientific computing applications. This guide shows how to integrate the validation system with existing modules.

## Core Components

### 1. Statistical Data Validator
- Validates statistical parameters against scientific bounds
- Ensures data integrity for calculations
- Provides type checking and range validation

### 2. Audit Logger
- FDA 21 CFR Part 11 compliant logging
- Tracks all data access and modifications
- Provides tamper-proof audit trail

### 3. Error Recovery Manager
- Automatic retry with exponential backoff
- Circuit breaker pattern for fault tolerance
- Multiple recovery strategies

### 4. Central Error Handler
- Unified error handling across the application
- User-friendly error messages
- Automatic recovery attempts

## Integration Examples

### Probability Distributions Module

```javascript
import {
  validateStatisticalParams,
  executeWithRecovery,
  auditLogger
} from '../utils/validation';

// Before (without validation)
export function calculateNormalProbability(mean, stdDev, x) {
  const z = (x - mean) / stdDev;
  return normalCDF(z);
}

// After (with validation)
export async function calculateNormalProbability(mean, stdDev, x) {
  // Validate inputs
  const validation = await validateStatisticalParams({
    mean,
    standardDeviation: stdDev,
    value: x
  }, {
    mean: { required: true },
    standardDeviation: { required: true, min: 0, excludeZero: true },
    value: { required: true }
  });

  if (!validation.valid) {
    throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
  }

  // Execute with recovery
  return executeWithRecovery(() => {
    const z = (x - mean) / stdDev;
    const result = normalCDF(z);

    // Log calculation for audit
    auditLogger.logCalculation('NORMAL_PROBABILITY',
      { mean, stdDev, x },
      { probability: result },
      performance.now()
    );

    return result;
  }, {
    fallbackValue: 0,
    maxRetries: 2
  });
}
```

### Confidence Intervals Module

```javascript
import {
  validateConfidenceInterval,
  centralErrorHandler,
  createValidatedCalculation
} from '../utils/validation';

// Create validated calculation wrapper
export const calculateTInterval = createValidatedCalculation(
  (params) => {
    const { sampleSize, mean, standardDeviation, confidenceLevel } = params;

    const df = sampleSize - 1;
    const alpha = 1 - confidenceLevel;
    const tValue = tDistribution.inverseCDF(1 - alpha / 2, df);
    const marginOfError = tValue * standardDeviation / Math.sqrt(sampleSize);

    return {
      lower: mean - marginOfError,
      upper: mean + marginOfError,
      marginOfError,
      tValue
    };
  },
  {
    sampleSize: { required: true, min: 2 },
    mean: { required: true },
    standardDeviation: { required: true, min: 0, excludeZero: true },
    confidenceLevel: { required: true, min: 0, max: 1, excludeZero: true, excludeOne: true }
  }
);

// Usage with automatic validation and error handling
try {
  const interval = await calculateTInterval({
    sampleSize: 30,
    mean: 100,
    standardDeviation: 15,
    confidenceLevel: 0.95
  });
  console.log('Confidence interval:', interval);
} catch (error) {
  // Error is automatically handled, logged, and user is notified
  console.error('Calculation failed:', error);
}
```

### DOE Module Integration

```javascript
import {
  validateDOEParams,
  auditLogger,
  ErrorRecoveryManager
} from '../utils/validation';

export class DOECalculator {
  constructor() {
    this.recoveryManager = new ErrorRecoveryManager();
  }

  async generateFactorialDesign(params) {
    // Validate DOE parameters
    const validation = await validateDOEParams(params);

    if (!validation.valid) {
      // Log validation failure
      auditLogger.logValidation({
        module: 'DOE',
        operation: 'generateFactorialDesign',
        params,
        result: 'failed',
        errors: validation.errors
      });

      throw new Error('Invalid DOE parameters');
    }

    // Generate design with error recovery
    return this.recoveryManager.handleError(
      new RecoverableError('Design generation failed', {
        context: {
          operation: () => this._generateDesign(validation.validatedParams)
        },
        recoveryStrategy: RecoveryStrategy.RETRY,
        maxAttempts: 3
      })
    );
  }

  _generateDesign(params) {
    // Actual design generation logic
    const { factors, levels, replicates } = params;
    // ... implementation
  }
}
```

### SQC Module Integration

```javascript
import {
  validateSQCParams,
  validateDataArray,
  centralErrorHandler
} from '../utils/validation';

export class ControlChartCalculator {
  async calculateControlLimits(data, options = {}) {
    // Set up error context
    const context = {
      module: 'SQC',
      operation: 'calculateControlLimits',
      inputs: { dataLength: data.length, options }
    };

    try {
      // Validate data array
      await validateDataArray(data, {
        minLength: 2,
        elementType: 'float',
        requireVariance: true
      });

      // Validate SQC parameters
      const validation = await validateSQCParams({
        data,
        ...options
      });

      if (!validation.valid) {
        throw new ValidationError('Invalid SQC parameters', validation.errors);
      }

      // Calculate with validated parameters
      const result = this._calculate(validation.validatedParams);

      // Audit the calculation
      auditLogger.logCalculation('CONTROL_LIMITS',
        { dataPoints: data.length, options },
        result,
        performance.now()
      );

      return result;

    } catch (error) {
      // Central error handler manages recovery and user notification
      return centralErrorHandler.handleError(error, context);
    }
  }

  _calculate(params) {
    // Actual calculation logic
  }
}
```

## React Component Integration

```javascript
import React, { useState, useCallback } from 'react';
import {
  validateStatisticalParams,
  centralErrorHandler,
  NotificationLevel
} from '../../utils/validation';

function StatisticalCalculator() {
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Set up error notification handler
  React.useEffect(() => {
    centralErrorHandler.config.notificationCallback = (notification) => {
      if (notification.level === NotificationLevel.ERROR ||
          notification.level === NotificationLevel.CRITICAL) {
        setError(notification.message);
      }
    };
  }, []);

  const handleCalculate = useCallback(async () => {
    try {
      // Validate inputs
      const validation = await validateStatisticalParams(inputs, {
        sampleSize: { required: true, min: 2 },
        mean: { required: true },
        standardDeviation: { required: true, min: 0, excludeZero: true }
      });

      if (!validation.valid) {
        setError('Please check your input values');
        return;
      }

      // Perform calculation with validated params
      const calculationResult = await centralErrorHandler.executeWithHandling(
        () => performCalculation(validation.validatedParams),
        { module: 'UI', operation: 'calculate' }
      );

      setResult(calculationResult);
      setError(null);

    } catch (err) {
      // Error is automatically handled by central error handler
      console.error('Calculation failed:', err);
    }
  }, [inputs]);

  return (
    <div>
      {/* Input fields */}
      {error && <div className="error">{error}</div>}
      {result && <div className="result">{JSON.stringify(result)}</div>}
      <button onClick={handleCalculate}>Calculate</button>
    </div>
  );
}
```

## API Integration

```javascript
// api/statistical.js
import {
  validateStatisticalParams,
  auditLogger,
  executeWithRecovery
} from '../utils/validation';

export async function processStatisticalRequest(req, res) {
  const { userId, data, operation } = req.body;

  try {
    // Validate request data
    const validation = await validateStatisticalParams(data);

    if (!validation.valid) {
      // Log invalid request
      auditLogger.logDataAccess(userId, 'statistical_api', operation, 'REJECTED', {
        reason: 'validation_failed',
        errors: validation.errors
      });

      return res.status(400).json({
        error: 'Invalid parameters',
        details: validation.errors
      });
    }

    // Process with recovery
    const result = await executeWithRecovery(
      () => processData(validation.validatedParams),
      {
        maxRetries: 3,
        fallbackValue: { error: 'Service temporarily unavailable' }
      }
    );

    // Audit successful operation
    auditLogger.logDataAccess(userId, 'statistical_api', operation, 'SUCCESS', {
      inputCount: Object.keys(data).length,
      resultType: typeof result
    });

    res.json({ success: true, result });

  } catch (error) {
    // Log error
    auditLogger.logError(error, { userId, operation });

    res.status(500).json({
      error: 'Internal server error',
      message: 'The operation could not be completed'
    });
  }
}
```

## Testing Integration

```javascript
import {
  createMockValidator,
  createMockErrorHandler
} from '../../utils/validation/ValidationSystem.test';

describe('Module with Validation', () => {
  let validator;
  let errorHandler;

  beforeEach(() => {
    validator = createMockValidator();
    errorHandler = createMockErrorHandler();
  });

  test('should validate inputs before calculation', async () => {
    const calculate = createValidatedCalculation(
      (params) => params.a + params.b,
      {
        a: { required: true, type: 'number' },
        b: { required: true, type: 'number' }
      }
    );

    // Valid inputs
    const result = await calculate({ a: 5, b: 3 });
    expect(result).toBe(8);

    // Invalid inputs
    await expect(calculate({ a: 'not a number', b: 3 }))
      .rejects.toThrow(ValidationError);
  });

  test('should recover from transient errors', async () => {
    let attempts = 0;
    const unstableOperation = jest.fn(() => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
      return 'success';
    });

    const result = await executeWithRecovery(unstableOperation, {
      maxRetries: 3
    });

    expect(result).toBe('success');
    expect(unstableOperation).toHaveBeenCalledTimes(3);
  });
});
```

## Configuration

### Environment-Specific Configuration

```javascript
// config/validation.config.js
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const validationConfig = {
  validator: {
    strictMode: isProduction,
    auditConfig: {
      enabled: true,
      level: isDevelopment ? 'debug' : 'info'
    }
  },

  errorHandler: {
    enableRecovery: true,
    enableAudit: isProduction,
    enableNotifications: true,
    maxErrorRate: isDevelopment ? 100 : 10,
    criticalErrorThreshold: isDevelopment ? 20 : 5
  },

  auditLogger: {
    enabled: true,
    persistToIndexedDB: isProduction,
    persistToLocalStorage: !isProduction,
    encryptLogs: isProduction,
    retentionDays: isProduction ? 2555 : 7, // 7 years for production
    remoteEndpoint: process.env.AUDIT_LOG_ENDPOINT
  },

  recovery: {
    maxRetryAttempts: isDevelopment ? 2 : 5,
    initialRetryDelay: 1000,
    maxRetryDelay: isDevelopment ? 5000 : 30000,
    backoffMultiplier: 2
  }
};

// Initialize with configuration
import ValidationSystem from '../utils/validation';

ValidationSystem.errorHandler.config = {
  ...ValidationSystem.errorHandler.config,
  ...validationConfig.errorHandler
};

ValidationSystem.auditLogger.config = {
  ...ValidationSystem.auditLogger.config,
  ...validationConfig.auditLogger
};
```

## Migration Checklist

When integrating the validation system into existing modules:

1. **Identify Critical Paths**
   - [ ] List all calculation functions
   - [ ] Identify user input points
   - [ ] Map data flow through the application

2. **Add Input Validation**
   - [ ] Define parameter schemas
   - [ ] Add validation before calculations
   - [ ] Handle validation errors gracefully

3. **Implement Error Recovery**
   - [ ] Wrap critical operations with executeWithRecovery
   - [ ] Define fallback values where appropriate
   - [ ] Set up retry strategies for network operations

4. **Enable Audit Logging**
   - [ ] Log all data access operations
   - [ ] Track calculation inputs and outputs
   - [ ] Record user actions for compliance

5. **Test Integration**
   - [ ] Unit test validation rules
   - [ ] Test error recovery scenarios
   - [ ] Verify audit trail completeness

6. **Monitor and Optimize**
   - [ ] Check performance metrics
   - [ ] Review error statistics
   - [ ] Adjust recovery strategies based on patterns

## Regulatory Compliance

The validation system supports various regulatory requirements:

- **FDA 21 CFR Part 11**: Electronic records and signatures
- **GxP**: Good Practice quality guidelines
- **ISO 9001:2015**: Quality management systems
- **HIPAA**: Health Insurance Portability and Accountability Act

Key compliance features:
- Tamper-proof audit trails
- User authentication tracking
- Data integrity validation
- Automatic record retention
- Cryptographic signatures
- Access control logging

## Performance Considerations

The validation system is designed for minimal performance impact:

- Validation caching for repeated checks
- Async operations to prevent blocking
- Circuit breakers to prevent cascading failures
- Efficient error recovery strategies
- Lazy loading of audit logs

Performance tips:
1. Use batch validation for multiple parameters
2. Enable caching for frequently validated data
3. Adjust retry delays based on operation type
4. Use appropriate recovery strategies
5. Monitor and optimize based on metrics

## Support and Troubleshooting

Common issues and solutions:

### Validation Failures
- Check parameter bounds in STATISTICAL_BOUNDS
- Verify data types match schema
- Ensure required fields are present

### Recovery Failures
- Increase retry attempts for unstable operations
- Implement appropriate fallback values
- Check circuit breaker status

### Audit Log Issues
- Verify IndexedDB permissions
- Check localStorage quota
- Ensure remote endpoint is accessible

### Performance Issues
- Review validation cache hit rate
- Optimize retry strategies
- Check for excessive error rates

## Conclusion

The StickForStats Validation System provides comprehensive data validation, error recovery, and audit logging capabilities essential for scientific computing applications. By following this integration guide, you can ensure your modules maintain the highest standards of data integrity, regulatory compliance, and user experience.