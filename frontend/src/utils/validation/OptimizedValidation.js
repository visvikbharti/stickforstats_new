/**
 * Optimized Validation Functions
 * Performance-optimized wrappers for validation operations
 *
 * @module OptimizedValidation
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import { PerformanceOptimizer } from './PerformanceOptimizer';
import { validateStatisticalParams, validateDataArray } from './index';
import { createValidatedCalculation } from './index';
import { recordValidation } from './monitoring';

/**
 * Cache keys for different validation types
 */
const CACHE_KEYS = {
  PARAM_VALIDATION: 'param_validation',
  ARRAY_VALIDATION: 'array_validation',
  SCHEMA_VALIDATION: 'schema_validation',
  BOUNDS_CHECK: 'bounds_check',
  TYPE_CHECK: 'type_check'
};

/**
 * Optimized parameter validation with caching
 */
export const validateParamsOptimized = PerformanceOptimizer.memoize(
  async (params, schema) => {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = `${CACHE_KEYS.PARAM_VALIDATION}:${JSON.stringify({ params, schema })}`;
      const cached = PerformanceOptimizer.getCached(cacheKey);

      if (cached) {
        recordValidation('validation', 'params', true, performance.now() - startTime);
        return cached.value;
      }

      // Perform validation
      const result = await validateStatisticalParams(params, schema);

      // Cache successful validations
      if (result.valid) {
        PerformanceOptimizer.setCached(cacheKey, result, 60000); // 1 minute TTL
      }

      recordValidation('validation', 'params', result.valid, performance.now() - startTime);
      return result;

    } catch (error) {
      recordValidation('validation', 'params', false, performance.now() - startTime);
      throw error;
    }
  },
  {
    ttl: 300000, // 5 minutes
    keyGenerator: (params, schema) => {
      // Create efficient cache key
      return `params_${Object.keys(params).sort().join('_')}_${Object.keys(schema).sort().join('_')}`;
    }
  }
);

/**
 * Optimized array validation with batch processing
 */
export const validateArrayOptimized = async (data, options = {}) => {
  const { batchSize = 1000, parallel = true } = options;

  // For small arrays, use direct validation
  if (data.length <= batchSize) {
    return PerformanceOptimizer.measure('array_validation', async () => {
      const cacheKey = `${CACHE_KEYS.ARRAY_VALIDATION}:${data.length}:${JSON.stringify(options)}`;
      const cached = PerformanceOptimizer.getCached(cacheKey);

      if (cached) {
        return cached.value;
      }

      const result = await validateDataArray(data, options);
      PerformanceOptimizer.setCached(cacheKey, result, 30000); // 30 seconds TTL

      return result;
    })();
  }

  // For large arrays, use batch processing
  return PerformanceOptimizer.processBatch(
    data,
    async (batch) => validateDataArray(batch, options),
    {
      batchSize,
      parallel,
      onProgress: (progress) => {
        console.log(`Validation progress: ${progress.percentage.toFixed(1)}%`);
      }
    }
  );
};

/**
 * Optimized bounds checking
 */
export const checkBoundsOptimized = PerformanceOptimizer.memoize(
  (value, min, max, excludeZero = false) => {
    // Quick checks first
    if (value === null || value === undefined) {
      return { valid: false, error: 'Value is required' };
    }

    const numValue = Number(value);
    if (isNaN(numValue)) {
      return { valid: false, error: 'Value must be a number' };
    }

    if (excludeZero && numValue === 0) {
      return { valid: false, error: 'Value cannot be zero' };
    }

    if (numValue < min || numValue > max) {
      return {
        valid: false,
        error: `Value must be between ${min} and ${max}`
      };
    }

    return { valid: true };
  },
  {
    ttl: 600000, // 10 minutes
    keyGenerator: (value, min, max, excludeZero) =>
      `bounds_${value}_${min}_${max}_${excludeZero}`
  }
);

/**
 * Optimized type checking
 */
export const checkTypeOptimized = PerformanceOptimizer.memoize(
  (value, expectedType) => {
    const typeCheckers = {
      integer: (v) => Number.isInteger(v),
      float: (v) => typeof v === 'number' && !isNaN(v),
      string: (v) => typeof v === 'string',
      boolean: (v) => typeof v === 'boolean',
      array: (v) => Array.isArray(v),
      object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
      function: (v) => typeof v === 'function'
    };

    const checker = typeCheckers[expectedType];
    if (!checker) {
      return { valid: false, error: `Unknown type: ${expectedType}` };
    }

    if (!checker(value)) {
      return {
        valid: false,
        error: `Expected ${expectedType}, got ${typeof value}`
      };
    }

    return { valid: true };
  },
  {
    ttl: 3600000, // 1 hour (type checks rarely change)
    keyGenerator: (value, type) => `type_${typeof value}_${type}`
  }
);

/**
 * Create optimized validated calculation
 */
export const createOptimizedCalculation = (calculationFn, schema, options = {}) => {
  const {
    cacheResults = true,
    cacheTTL = 60000,
    deduplicate = true,
    measurePerformance = true
  } = options;

  // Wrap the calculation function
  let wrappedFn = calculationFn;

  // Add performance measurement
  if (measurePerformance) {
    const fnName = calculationFn.name || 'calculation';
    wrappedFn = PerformanceOptimizer.measure(fnName, wrappedFn);

    // Set performance threshold
    PerformanceOptimizer.setThreshold(fnName, 100, (violation) => {
      console.warn(`Performance threshold exceeded:`, violation);
    });
  }

  // Add memoization
  if (cacheResults) {
    wrappedFn = PerformanceOptimizer.memoize(wrappedFn, {
      ttl: cacheTTL,
      excludeFromCache: (params) => {
        // Don't cache if params contain functions or large arrays
        return Object.values(params).some(v =>
          typeof v === 'function' ||
          (Array.isArray(v) && v.length > 1000)
        );
      }
    });
  }

  // Add deduplication
  if (deduplicate) {
    const originalWrappedFn = wrappedFn;
    wrappedFn = async (params) => {
      const key = JSON.stringify(params);
      return PerformanceOptimizer.deduplicate(key, () => originalWrappedFn(params));
    };
  }

  // Create validated calculation
  return createValidatedCalculation(wrappedFn, schema);
};

/**
 * Batch validation for multiple parameter sets
 */
export const batchValidate = async (paramSets, schema, options = {}) => {
  const { parallel = true, batchSize = 100 } = options;

  return PerformanceOptimizer.processBatch(
    paramSets,
    async (params) => validateParamsOptimized(params, schema),
    {
      batchSize,
      parallel,
      onProgress: options.onProgress
    }
  );
};

/**
 * Lazy load validation schemas
 */
export const loadValidationSchema = async (schemaName) => {
  return PerformanceOptimizer.lazyLoad(
    `schema_${schemaName}`,
    async () => {
      // Dynamically import schema
      const module = await import(`./schemas/${schemaName}Schema.js`);
      return module.default;
    },
    {
      priority: 'high',
      timeout: 5000
    }
  );
};

/**
 * Preload common validation schemas
 */
export const preloadCommonSchemas = async () => {
  const commonSchemas = [
    { key: 'distribution', loader: () => import('./schemas/distributionSchema.js'), priority: 'high' },
    { key: 'confidence', loader: () => import('./schemas/confidenceSchema.js'), priority: 'high' },
    { key: 'doe', loader: () => import('./schemas/doeSchema.js'), priority: 'normal' },
    { key: 'sqc', loader: () => import('./schemas/sqcSchema.js'), priority: 'normal' }
  ];

  return PerformanceOptimizer.preload(commonSchemas);
};

/**
 * Worker-based validation for heavy computations
 */
export const validateInWorker = async (params, schema) => {
  const workerScript = `
    self.addEventListener('message', async (event) => {
      const { params, schema } = event.data;

      try {
        // Perform validation logic in worker
        const errors = [];

        for (const [key, rules] of Object.entries(schema)) {
          const value = params[key];

          if (rules.required && value === undefined) {
            errors.push({ field: key, message: 'Field is required' });
          }

          if (rules.type === 'integer' && !Number.isInteger(value)) {
            errors.push({ field: key, message: 'Must be an integer' });
          }

          if (rules.min !== undefined && value < rules.min) {
            errors.push({ field: key, message: 'Value too small' });
          }

          if (rules.max !== undefined && value > rules.max) {
            errors.push({ field: key, message: 'Value too large' });
          }
        }

        self.postMessage({
          result: {
            valid: errors.length === 0,
            errors
          }
        });
      } catch (error) {
        self.postMessage({ error: error.message });
      }
    });
  `;

  return PerformanceOptimizer.runInWorker({ params, schema }, workerScript);
};

/**
 * Clear all optimization caches
 */
export const clearOptimizationCaches = () => {
  PerformanceOptimizer.clearAll();
  console.log('All optimization caches cleared');
};

/**
 * Get optimization statistics
 */
export const getOptimizationStats = () => {
  const stats = PerformanceOptimizer.getStats();

  // Calculate optimization effectiveness
  const cacheHitRate = stats.cache.hitRate || 0;
  const deduplicationRate = stats.deduplication.deduplicationRate || 0;
  const avgImprovement = (cacheHitRate + deduplicationRate) / 2;

  return {
    ...stats,
    optimization: {
      effectiveness: `${avgImprovement.toFixed(1)}%`,
      memorySaved: `${(stats.cache.hits * 50).toFixed(0)}KB`, // Estimate
      timesSaved: `${(stats.cache.hits * 10).toFixed(0)}ms`, // Estimate
      recommendations: generateOptimizationRecommendations(stats)
    }
  };
};

/**
 * Generate optimization recommendations
 */
const generateOptimizationRecommendations = (stats) => {
  const recommendations = [];

  // Cache recommendations
  if (stats.cache.hitRate < 50) {
    recommendations.push({
      type: 'cache',
      message: 'Low cache hit rate. Consider increasing cache size or TTL.',
      priority: 'high'
    });
  }

  // Deduplication recommendations
  if (stats.deduplication.deduplicationRate < 10) {
    recommendations.push({
      type: 'deduplication',
      message: 'Low deduplication rate. Requests are not being duplicated.',
      priority: 'low'
    });
  }

  // Performance recommendations
  if (stats.performance) {
    Object.entries(stats.performance).forEach(([name, metrics]) => {
      if (metrics && metrics.p95 > 100) {
        recommendations.push({
          type: 'performance',
          message: `Function "${name}" P95 latency is ${metrics.p95.toFixed(0)}ms. Consider optimization.`,
          priority: 'medium'
        });
      }
    });
  }

  return recommendations;
};

/**
 * Auto-optimize based on usage patterns
 */
export const enableAutoOptimization = () => {
  // Monitor and adjust cache size based on hit rate
  setInterval(() => {
    const stats = PerformanceOptimizer.getStats();

    // Increase cache size if hit rate is high
    if (stats.cache.hitRate > 80 && stats.cache.size >= stats.cache.maxSize * 0.9) {
      PerformanceOptimizer.cache.maxSize = Math.min(
        PerformanceOptimizer.cache.maxSize * 1.5,
        10000 // Max 10,000 entries
      );
      console.log(`Cache size increased to ${PerformanceOptimizer.cache.maxSize}`);
    }

    // Clear old cache entries if hit rate is low
    if (stats.cache.hitRate < 20) {
      PerformanceOptimizer.cache.clearExpired();
      console.log('Cleared expired cache entries due to low hit rate');
    }
  }, 300000); // Every 5 minutes
};

// Export optimized validation API
export default {
  validateParams: validateParamsOptimized,
  validateArray: validateArrayOptimized,
  checkBounds: checkBoundsOptimized,
  checkType: checkTypeOptimized,
  createCalculation: createOptimizedCalculation,
  batchValidate,
  loadSchema: loadValidationSchema,
  preloadSchemas: preloadCommonSchemas,
  validateInWorker,
  clearCaches: clearOptimizationCaches,
  getStats: getOptimizationStats,
  enableAutoOptimization
};