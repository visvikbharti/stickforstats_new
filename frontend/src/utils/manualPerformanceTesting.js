/**
 * Manual Performance Testing Utilities
 * 
 * This module provides utilities for manual performance testing of components
 * and application flows. It complements the automated performance testing system
 * and can be used during development to identify performance issues.
 */
import { getMetrics, addCustomMark } from './performanceMonitoring';

// -------------------------------------------------------------------------
// Constants and Types
// -------------------------------------------------------------------------

/**
 * Supported test types
 * @typedef {'render' | 'interaction' | 'animation' | 'data-processing' | 'custom'} TestType
 */

/**
 * Performance test result
 * @typedef {Object} PerformanceTestResult
 * @property {string} name - Test name
 * @property {TestType} type - Test type
 * @property {number} duration - Test duration in ms
 * @property {number} iterations - Number of iterations (for averaged tests)
 * @property {Object} [metadata] - Additional test metadata
 * @property {string} component - Component being tested
 * @property {number} timestamp - Test timestamp
 * @property {Object} [measurements] - Detailed test measurements
 */

/**
 * Performance test configuration
 * @typedef {Object} TestConfig
 * @property {boolean} [autoStart=false] - Automatically start test when created
 * @property {number} [iterations=1] - Number of iterations for the test
 * @property {boolean} [logToConsole=true] - Log results to console
 * @property {boolean} [saveResult=true] - Save result to test history
 * @property {Object} [metadata] - Additional test metadata
 */

// Default test configuration
const DEFAULT_CONFIG = {
  autoStart: false,
  iterations: 1,
  logToConsole: true,
  saveResult: true,
  metadata: {}
};

// Test history storage
const testHistory = [];

// -------------------------------------------------------------------------
// Core Performance Testing API
// -------------------------------------------------------------------------

/**
 * Create a new performance test
 * @param {string} name - Test name
 * @param {TestType} type - Test type 
 * @param {string} component - Component being tested
 * @param {TestConfig} [config] - Test configuration
 * @returns {Object} Test controller
 */
export function createPerformanceTest(name, type, component, config = {}) {
  // Merge configuration with defaults
  const testConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Test state
  let isRunning = false;
  let startTime = 0;
  let endTime = 0;
  let iterations = 0;
  let iterationResults = [];
  let measurements = {};
  
  /**
   * Start the performance test
   * @returns {Object} Test controller
   */
  const start = () => {
    if (isRunning) {
      console.warn(`Test "${name}" is already running`);
      return controller;
    }
    
    isRunning = true;
    startTime = performance.now();
    iterations = 0;
    iterationResults = [];
    measurements = {};
    
    return controller;
  };
  
  /**
   * Mark a measurement point within the test
   * @param {string} markName - Measurement name
   * @returns {Object} Test controller
   */
  const mark = (markName) => {
    if (!isRunning) {
      console.warn(`Cannot mark test "${name}" - test is not running`);
      return controller;
    }
    
    const markTime = performance.now() - startTime;
    measurements[markName] = markTime;
    
    return controller;
  };
  
  /**
   * Complete a test iteration
   * @returns {Object} Test controller
   */
  const iterationComplete = () => {
    if (!isRunning) {
      console.warn(`Cannot complete iteration for test "${name}" - test is not running`);
      return controller;
    }
    
    const iterationTime = performance.now() - startTime;
    iterationResults.push(iterationTime);
    iterations++;
    
    // If we've completed all iterations, end the test
    if (iterations >= testConfig.iterations) {
      return end();
    }
    
    // Otherwise, prepare for next iteration
    startTime = performance.now();
    return controller;
  };
  
  /**
   * End the performance test
   * @returns {PerformanceTestResult} Test result
   */
  const end = () => {
    if (!isRunning) {
      console.warn(`Cannot end test "${name}" - test is not running`);
      return null;
    }
    
    endTime = performance.now();
    isRunning = false;
    
    // Calculate duration
    let duration;
    if (iterationResults.length > 0) {
      // Use the average of iterations
      duration = iterationResults.reduce((sum, time) => sum + time, 0) / iterationResults.length;
    } else {
      // Single run
      duration = endTime - startTime;
      iterationResults.push(duration);
    }
    
    // Create result object
    const result = {
      name,
      type,
      duration,
      iterations: iterations || 1,
      component,
      metadata: testConfig.metadata,
      timestamp: Date.now(),
      measurements,
      rawIterations: [...iterationResults]
    };
    
    // Log result
    if (testConfig.logToConsole) {
      console.log(`%c📊 Performance Test: ${name}`, 'font-weight: bold; color: #6200ee;');
      console.log(`Component: ${component}`);
      console.log(`Type: ${type}`);
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      
      if (iterationResults.length > 1) {
        console.log(`Iterations: ${iterationResults.length}`);
        console.log(`Min: ${Math.min(...iterationResults).toFixed(2)}ms`);
        console.log(`Max: ${Math.max(...iterationResults).toFixed(2)}ms`);
      }
      
      if (Object.keys(measurements).length > 0) {
        console.log('Measurements:');
        Object.entries(measurements).forEach(([key, value]) => {
          console.log(`  ${key}: ${value.toFixed(2)}ms`);
        });
      }
    }
    
    // Save to history
    if (testConfig.saveResult) {
      testHistory.push(result);
      
      // Also store as custom mark for integration with performance monitoring
      addCustomMark(`test_${name}`, {
        duration,
        type,
        component
      });
    }
    
    return result;
  };
  
  // Assemble controller object
  const controller = {
    start,
    mark,
    iterationComplete,
    end,
    
    // Additional utilities
    isRunning: () => isRunning,
    getConfig: () => ({ ...testConfig }),
    getState: () => ({
      isRunning,
      startTime,
      endTime,
      iterations,
      measurements
    })
  };
  
  // Auto-start if configured
  if (testConfig.autoStart) {
    controller.start();
  }
  
  return controller;
}

/**
 * Run a simple performance test with automatic start/end
 * @param {string} name - Test name
 * @param {TestType} type - Test type
 * @param {string} component - Component being tested
 * @param {Function} testFn - Function to test (will be awaited if it returns a Promise)
 * @param {TestConfig} [config] - Test configuration
 * @returns {Promise<PerformanceTestResult>} Test result
 */
export async function runPerformanceTest(name, type, component, testFn, config = {}) {
  const test = createPerformanceTest(name, type, component, config);
  
  const runIteration = async () => {
    test.start();
    
    try {
      // Run the test function
      await testFn(test);
      
      // Complete the iteration
      if (test.isRunning()) {
        test.iterationComplete();
      }
    } catch (error) {
      // End the test on error
      console.error(`Error in performance test "${name}":`, error);
      return test.end();
    }
    
    // Check if we need to run more iterations
    if (test.isRunning()) {
      return runIteration();
    } else {
      return test.end();
    }
  };
  
  return runIteration();
}

/**
 * Time a function execution
 * @param {Function} fn - Function to time
 * @param {string} [name] - Name for the timing (optional)
 * @returns {any} Return value from the function
 */
export function timeFunction(fn, name = 'Function timing') {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  
  return result;
}

/**
 * Time an async function execution
 * @param {Function} fn - Async function to time
 * @param {string} [name] - Name for the timing (optional)
 * @returns {Promise<any>} Promise that resolves to the function's return value
 */
export async function timeAsyncFunction(fn, name = 'Async function timing') {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  
  return result;
}

/**
 * Create a timing decorator (not usable with class fields)
 * @param {string} [name] - Name for the timing (optional)
 * @returns {Function} Timing decorator function
 */
export function timed(name = null) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
      const timingName = name || `${target.constructor.name}.${propertyKey}`;
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      
      if (result instanceof Promise) {
        return result.then(value => {
          const duration = performance.now() - start;
          console.log(`${timingName}: ${duration.toFixed(2)}ms`);
          return value;
        });
      } else {
        const duration = performance.now() - start;
        console.log(`${timingName}: ${duration.toFixed(2)}ms`);
        return result;
      }
    };
    
    return descriptor;
  };
}

// -------------------------------------------------------------------------
// Specialized Test Functions
// -------------------------------------------------------------------------

/**
 * Test component render performance
 * @param {string} componentName - Name of the component
 * @param {Function} renderFn - Function that renders the component
 * @param {TestConfig} [config] - Test configuration
 * @returns {Promise<PerformanceTestResult>} Test result
 */
export function testRenderPerformance(componentName, renderFn, config = {}) {
  return runPerformanceTest(
    `Render_${componentName}`,
    'render',
    componentName,
    renderFn,
    config
  );
}

/**
 * Test data processing performance
 * @param {string} name - Test name
 * @param {string} component - Component or module being tested
 * @param {Function} processFn - Function that performs the data processing
 * @param {TestConfig} [config] - Test configuration
 * @returns {Promise<PerformanceTestResult>} Test result
 */
export function testDataProcessing(name, component, processFn, config = {}) {
  return runPerformanceTest(
    name,
    'data-processing',
    component,
    processFn,
    config
  );
}

/**
 * Test animation performance
 * @param {string} name - Test name
 * @param {string} component - Component being tested
 * @param {Function} animateFn - Function that performs the animation
 * @param {TestConfig} [config] - Test configuration
 * @returns {Promise<PerformanceTestResult>} Test result
 */
export function testAnimationPerformance(name, component, animateFn, config = {}) {
  return runPerformanceTest(
    name,
    'animation',
    component,
    animateFn,
    config
  );
}

/**
 * Test user interaction flow
 * @param {string} name - Test name
 * @param {string} component - Component being tested
 * @param {Function} interactionFn - Function that simulates user interaction
 * @param {TestConfig} [config] - Test configuration
 * @returns {Promise<PerformanceTestResult>} Test result
 */
export function testInteraction(name, component, interactionFn, config = {}) {
  return runPerformanceTest(
    name,
    'interaction',
    component,
    interactionFn,
    config
  );
}

// -------------------------------------------------------------------------
// Test History and Reporting
// -------------------------------------------------------------------------

/**
 * Get all test results
 * @returns {Array<PerformanceTestResult>} All test results
 */
export function getAllTestResults() {
  return [...testHistory];
}

/**
 * Get test results for a specific component
 * @param {string} component - Component name
 * @returns {Array<PerformanceTestResult>} Component test results
 */
export function getComponentTestResults(component) {
  return testHistory.filter(result => result.component === component);
}

/**
 * Get test results by type
 * @param {TestType} type - Test type
 * @returns {Array<PerformanceTestResult>} Test results of the specified type
 */
export function getTestResultsByType(type) {
  return testHistory.filter(result => result.type === type);
}

/**
 * Clear test history
 */
export function clearTestHistory() {
  testHistory.length = 0;
}

/**
 * Generate a performance report
 * @returns {Object} Performance report
 */
export function generatePerformanceReport() {
  // Get current web vitals and other metrics
  const metrics = getMetrics();
  
  return {
    timestamp: Date.now(),
    webVitals: metrics.webVitals,
    navigationTimings: metrics.navigationTimings,
    testResults: getAllTestResults(),
    summary: {
      totalTests: testHistory.length,
      byComponent: Object.fromEntries(
        Object.entries(
          testHistory.reduce((acc, result) => {
            acc[result.component] = (acc[result.component] || 0) + 1;
            return acc;
          }, {})
        )
      ),
      byType: Object.fromEntries(
        Object.entries(
          testHistory.reduce((acc, result) => {
            acc[result.type] = (acc[result.type] || 0) + 1;
            return acc;
          }, {})
        )
      ),
      slowestTests: [...testHistory]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map(result => ({
          name: result.name,
          component: result.component,
          duration: result.duration
        }))
    }
  };
}

/**
 * Export performance report as JSON
 * @returns {string} JSON string of the report
 */
export function exportPerformanceReport() {
  return JSON.stringify(generatePerformanceReport(), null, 2);
}

// Export all functions
export default {
  createPerformanceTest,
  runPerformanceTest,
  timeFunction,
  timeAsyncFunction,
  timed,
  testRenderPerformance,
  testDataProcessing,
  testAnimationPerformance,
  testInteraction,
  getAllTestResults,
  getComponentTestResults,
  getTestResultsByType,
  clearTestHistory,
  generatePerformanceReport,
  exportPerformanceReport
};