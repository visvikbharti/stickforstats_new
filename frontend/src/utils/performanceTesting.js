/**
 * Performance Testing Utilities
 * 
 * This module provides tools for automated performance testing, including benchmarking,
 * network throttling, device emulation, and reporting.
 */
import { getMetrics, getPerformanceSummary, initPerformanceMonitoring } from './performanceMonitoring';

// Device profiles for testing
export const DEVICE_PROFILES = {
  DESKTOP: {
    name: 'Desktop',
    viewport: { width: 1920, height: 1080 },
    devicePixelRatio: 1,
    userAgent: 'Desktop'
  },
  LAPTOP: {
    name: 'Laptop',
    viewport: { width: 1366, height: 768 },
    devicePixelRatio: 1,
    userAgent: 'Laptop'
  },
  TABLET: {
    name: 'Tablet',
    viewport: { width: 768, height: 1024 },
    devicePixelRatio: 2,
    userAgent: 'Tablet'
  },
  MOBILE: {
    name: 'Mobile',
    viewport: { width: 375, height: 812 },
    devicePixelRatio: 3,
    userAgent: 'Mobile'
  }
};

// Network throttling profiles
export const NETWORK_PROFILES = {
  OFFLINE: {
    name: 'Offline',
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: Number.POSITIVE_INFINITY
  },
  SLOW_2G: {
    name: 'Slow 2G',
    downloadThroughput: 250 * 1024 / 8, // 250kbps
    uploadThroughput: 50 * 1024 / 8, // 50kbps
    latency: 300 // ms
  },
  FAST_3G: {
    name: 'Fast 3G',
    downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5Mbps
    uploadThroughput: 750 * 1024 / 8, // 750kbps
    latency: 40 // ms
  },
  SLOW_4G: {
    name: 'Slow 4G',
    downloadThroughput: 4 * 1024 * 1024 / 8, // 4Mbps
    uploadThroughput: 2 * 1024 * 1024 / 8, // 2Mbps
    latency: 20 // ms
  },
  FAST_4G: {
    name: 'Fast 4G',
    downloadThroughput: 25 * 1024 * 1024 / 8, // 25Mbps
    uploadThroughput: 10 * 1024 * 1024 / 8, // 10Mbps
    latency: 5 // ms
  },
  WIFI: {
    name: 'WiFi',
    downloadThroughput: 50 * 1024 * 1024 / 8, // 50Mbps
    uploadThroughput: 20 * 1024 * 1024 / 8, // 20Mbps
    latency: 2 // ms
  }
};

// Key performance metrics with thresholds
export const PERFORMANCE_METRICS = {
  // Core Web Vitals
  FCP: {
    name: 'First Contentful Paint',
    description: 'Time until the first content is painted',
    unit: 'ms',
    thresholds: {
      good: 1000, // 0-1000ms is good
      needsImprovement: 3000, // 1000-3000ms needs improvement
      // > 3000ms is poor
    }
  },
  LCP: {
    name: 'Largest Contentful Paint',
    description: 'Time until the largest content element is painted',
    unit: 'ms',
    thresholds: {
      good: 2500, // 0-2500ms is good
      needsImprovement: 4000, // 2500-4000ms needs improvement
      // > 4000ms is poor
    }
  },
  FID: {
    name: 'First Input Delay',
    description: 'Time from first user interaction to response',
    unit: 'ms',
    thresholds: {
      good: 100, // 0-100ms is good
      needsImprovement: 300, // 100-300ms needs improvement
      // > 300ms is poor
    }
  },
  CLS: {
    name: 'Cumulative Layout Shift',
    description: 'Sum of layout shift scores',
    unit: 'score',
    thresholds: {
      good: 0.1, // 0-0.1 is good
      needsImprovement: 0.25, // 0.1-0.25 needs improvement
      // > 0.25 is poor
    }
  },
  
  // Navigation metrics
  TTFB: {
    name: 'Time to First Byte',
    description: 'Time until the first byte is received',
    unit: 'ms',
    thresholds: {
      good: 200, // 0-200ms is good
      needsImprovement: 500, // 200-500ms needs improvement
      // > 500ms is poor
    }
  },
  DCL: {
    name: 'DOMContentLoaded',
    description: 'Time until the DOM is ready',
    unit: 'ms',
    thresholds: {
      good: 1000, // 0-1000ms is good
      needsImprovement: 2000, // 1000-2000ms needs improvement
      // > 2000ms is poor
    }
  },
  LOAD: {
    name: 'Load Event',
    description: 'Time until the page is fully loaded',
    unit: 'ms',
    thresholds: {
      good: 2500, // 0-2500ms is good
      needsImprovement: 5000, // 2500-5000ms needs improvement
      // > 5000ms is poor
    }
  },
  
  // Resource metrics
  RESOURCE_COUNT: {
    name: 'Resource Count',
    description: 'Number of resources loaded',
    unit: 'count',
    thresholds: {
      good: 40, // 0-40 is good
      needsImprovement: 80, // 40-80 needs improvement
      // > 80 is poor
    }
  },
  TOTAL_BLOCKING_TIME: {
    name: 'Total Blocking Time',
    description: 'Sum of blocking time after FCP',
    unit: 'ms',
    thresholds: {
      good: 200, // 0-200ms is good
      needsImprovement: 600, // 200-600ms needs improvement
      // > 600ms is poor
    }
  },
  JS_HEAP_SIZE: {
    name: 'JS Heap Size',
    description: 'JavaScript memory usage',
    unit: 'MB',
    thresholds: {
      good: 30, // 0-30MB is good
      needsImprovement: 60, // 30-60MB needs improvement
      // > 60MB is poor
    }
  },
  
  // Custom metrics
  TIME_TO_INTERACTIVE: {
    name: 'Time to Interactive',
    description: 'Time until the page is fully interactive',
    unit: 'ms',
    thresholds: {
      good: 3500, // 0-3500ms is good
      needsImprovement: 7500, // 3500-7500ms needs improvement
      // > 7500ms is poor
    }
  },
  PAGE_WEIGHT: {
    name: 'Page Weight',
    description: 'Total size of all resources',
    unit: 'KB',
    thresholds: {
      good: 1000, // 0-1000KB is good
      needsImprovement: 2500, // 1000-2500KB needs improvement
      // > 2500KB is poor
    }
  }
};

// Test scenarios for StickForStats
export const TEST_SCENARIOS = {
  HOME_PAGE: {
    name: 'Home Page',
    path: '/',
    description: 'Initial page load performance'
  },
  PROBABILITY_DISTRIBUTIONS: {
    name: 'Probability Distributions',
    path: '/probability-distributions',
    description: 'Performance of probability distributions module'
  },
  CONFIDENCE_INTERVALS: {
    name: 'Confidence Intervals',
    path: '/confidence-intervals',
    description: 'Performance of confidence intervals module'
  },
  DOE_ANALYSIS: {
    name: 'DOE Analysis',
    path: '/doe-analysis',
    description: 'Performance of DOE analysis module'
  },
  SQC_ANALYSIS: {
    name: 'SQC Analysis',
    path: '/sqc-analysis',
    description: 'Performance of SQC analysis module'
  },
  PCA_ANALYSIS: {
    name: 'PCA Analysis',
    path: '/pca-analysis',
    description: 'Performance of PCA analysis module'
  }
};

// Configuration for testing runs
let testConfig = {
  deviceProfile: DEVICE_PROFILES.DESKTOP,
  networkProfile: NETWORK_PROFILES.WIFI,
  iterations: 3, // Run each test 3 times by default
  delayBetweenRuns: 3000, // 3 seconds between runs
  timeout: 60000, // 1 minute timeout for each test
  consoleOutput: true, // Log test results to console
  saveToStorage: true, // Save results to localStorage
  exportCSV: false, // Export results as CSV
  autoRun: false // Don't run tests automatically
};

// Current test state
let testState = {
  currentRun: 0,
  totalRuns: 0,
  results: [],
  inProgress: false,
  lastRunTimestamp: null,
  testStart: null,
  testEnd: null
};

/**
 * Emulate a device profile
 * @param {Object} profile - The device profile to emulate
 */
function emulateDevice(profile) {
  if (typeof window === 'undefined') return;

  // Store original values for later restoration
  if (!window.__originalViewport) {
    window.__originalViewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  // Apply viewport size if supported
  if (window.resizeTo) {
    window.resizeTo(profile.viewport.width, profile.viewport.height);
  }

  // Apply device pixel ratio if supported
  if (Object.defineProperty) {
    try {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() { return profile.devicePixelRatio; }
      });
    } catch (e) {
      console.warn('Failed to emulate device pixel ratio', e);
    }
  }

  // Log emulation
  console.info(`Device emulation: ${profile.name} (${profile.viewport.width}x${profile.viewport.height}, DPR: ${profile.devicePixelRatio})`);
}

/**
 * Reset device emulation to default
 */
function resetDeviceEmulation() {
  if (typeof window === 'undefined' || !window.__originalViewport) return;

  // Restore original viewport size
  if (window.resizeTo) {
    window.resizeTo(window.__originalViewport.width, window.__originalViewport.height);
  }

  // Log reset
  console.info('Device emulation reset to original values');
}

/**
 * Apply network throttling
 * @param {Object} profile - The network profile to apply
 */
function applyNetworkThrottling(profile) {
  if (typeof window === 'undefined') return;

  // Network throttling requires Chrome DevTools Protocol or service worker
  // In browser, we can't truly throttle, but we can simulate it via fetch/XHR interceptors
  // or guide users to use browser developer tools for throttling

  console.info(`Network throttling can only be fully applied in automated environments.`);
  console.info(`Please use browser DevTools to apply ${profile.name} throttling manually:`);
  console.info(` - Chrome: DevTools > Network > ${profile.name}`);
  console.info(` - Firefox: DevTools > Network > ${profile.name}`);
  
  // We can still simulate some network conditions with service workers
  // but that requires a complex setup beyond the scope of this example
}

/**
 * Configure the performance testing framework
 * @param {Object} config - Configuration options
 */
export function configurePerformanceTesting(config = {}) {
  testConfig = { ...testConfig, ...config };
  
  // Configure performance monitoring
  initPerformanceMonitoring({
    logToConsole: testConfig.consoleOutput,
    sendToBackend: false,
    samplingRate: 1.0,
    includeResourceDetails: true
  });
  
  return testConfig;
}

/**
 * Start an automated performance test
 * @param {Object|Array} scenarios - Test scenario or array of scenarios
 * @param {Object} options - Test options (overrides global config)
 */
export async function runPerformanceTest(scenarios, options = {}) {
  // Merge options with config
  const config = { ...testConfig, ...options };
  
  // Convert single scenario to array
  const scenariosArray = Array.isArray(scenarios) ? scenarios : [scenarios];
  
  // Calculate total runs
  testState.totalRuns = scenariosArray.length * config.iterations;
  testState.currentRun = 0;
  testState.results = [];
  testState.inProgress = true;
  testState.testStart = Date.now();
  
  try {
    // Apply device emulation
    if (config.deviceProfile) {
      emulateDevice(config.deviceProfile);
    }
    
    // Apply network throttling (guidance only in browser context)
    if (config.networkProfile) {
      applyNetworkThrottling(config.networkProfile);
    }
    
    // Run each scenario
    for (const scenario of scenariosArray) {
      // Run each iteration
      for (let i = 0; i < config.iterations; i++) {
        testState.currentRun++;
        
        // Log progress
        if (config.consoleOutput) {
          console.info(`Running test: ${scenario.name} (${testState.currentRun}/${testState.totalRuns})`);
        }
        
        try {
          // Run the individual test
          const result = await runSingleTest(scenario, config);
          
          // Add result to state
          testState.results.push(result);
          
          // Save to storage if enabled
          if (config.saveToStorage) {
            saveResultToStorage(result);
          }
          
          // Delay between runs
          if (testState.currentRun < testState.totalRuns) {
            await new Promise(resolve => setTimeout(resolve, config.delayBetweenRuns));
          }
        } catch (error) {
          console.error(`Test failed: ${scenario.name}`, error);
          
          // Add failed result
          testState.results.push({
            scenario: scenario.name,
            timestamp: Date.now(),
            success: false,
            error: error.message,
            deviceProfile: config.deviceProfile.name,
            networkProfile: config.networkProfile.name,
            iteration: i + 1
          });
        }
      }
    }
    
    // Complete test run
    testState.inProgress = false;
    testState.testEnd = Date.now();
    
    // Export results if enabled
    if (config.exportCSV) {
      exportResultsToCSV(testState.results);
    }
    
    // Generate summary report
    const summary = generateTestSummary(testState.results);
    
    // Log summary report
    if (config.consoleOutput) {
      console.info('Performance test complete', summary);
    }
    
    // Reset emulation
    resetDeviceEmulation();
    
    return { results: testState.results, summary };
  } catch (error) {
    testState.inProgress = false;
    testState.testEnd = Date.now();
    
    // Reset emulation
    resetDeviceEmulation();
    
    throw error;
  }
}

/**
 * Run a single performance test
 * @param {Object} scenario - The test scenario
 * @param {Object} config - Test configuration
 */
async function runSingleTest(scenario, config) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let timeoutId;
    
    // Set timeout
    if (config.timeout > 0) {
      timeoutId = setTimeout(() => {
        reject(new Error(`Test timed out after ${config.timeout}ms`));
      }, config.timeout);
    }
    
    try {
      // Navigate to the page
      window.location.href = scenario.path;
      
      // Set up load completion listener
      const checkCompletion = () => {
        // Wait for performance data to be collected
        setTimeout(() => {
          // Get metrics
          const metrics = getPerformanceSummary();
          
          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          // Prepare result
          const result = {
            scenario: scenario.name,
            path: scenario.path,
            timestamp: startTime,
            duration: Date.now() - startTime,
            metrics,
            deviceProfile: config.deviceProfile.name,
            networkProfile: config.networkProfile.name,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent,
            success: true
          };
          
          resolve(result);
        }, 1000); // Wait 1 second after load to collect metrics
      };
      
      // Listen for page load completion
      if (document.readyState === 'complete') {
        checkCompletion();
      } else {
        window.addEventListener('load', checkCompletion, { once: true });
      }
    } catch (error) {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      reject(error);
    }
  });
}

/**
 * Save test result to localStorage
 * @param {Object} result - The test result
 */
function saveResultToStorage(result) {
  try {
    // Get existing results
    const storedResults = localStorage.getItem('performance_test_results');
    const results = storedResults ? JSON.parse(storedResults) : [];
    
    // Add new result
    results.push(result);
    
    // Limit to 100 results to avoid storage issues
    while (results.length > 100) {
      results.shift();
    }
    
    // Save back to storage
    localStorage.setItem('performance_test_results', JSON.stringify(results));
  } catch (error) {
    console.error('Failed to save test results to storage', error);
  }
}

/**
 * Get saved test results from localStorage
 * @returns {Array} Saved test results
 */
export function getSavedTestResults() {
  try {
    const storedResults = localStorage.getItem('performance_test_results');
    return storedResults ? JSON.parse(storedResults) : [];
  } catch (error) {
    console.error('Failed to retrieve saved test results', error);
    return [];
  }
}

/**
 * Clear saved test results from localStorage
 */
export function clearSavedTestResults() {
  try {
    localStorage.removeItem('performance_test_results');
  } catch (error) {
    console.error('Failed to clear saved test results', error);
  }
}

/**
 * Export test results to CSV
 * @param {Array} results - Test results to export
 */
export function exportResultsToCSV(results) {
  // Check if browser environment
  if (typeof window === 'undefined' || !results || !results.length) return;
  
  try {
    // Get all metrics from first result to build columns
    const firstResult = results[0];
    const metrics = firstResult.metrics || {};
    
    // Build CSV header
    let headers = [
      'Timestamp',
      'Scenario',
      'Path',
      'Duration (ms)',
      'Device',
      'Network',
      'Viewport',
      'Success'
    ];
    
    // Add metric columns
    for (const metricKey in metrics.webVitals) {
      headers.push(`${metricKey} (ms)`);
    }
    
    // Add other important metrics
    headers = headers.concat([
      'Page Load (ms)',
      'Resource Count',
      'Slow Resources',
      'API Calls',
      'Slow API Calls',
      'Error Count'
    ]);
    
    // Build CSV rows
    const rows = results.map(result => {
      const metrics = result.metrics || {};
      const webVitals = metrics.webVitals || {};
      
      const baseRow = [
        new Date(result.timestamp).toISOString(),
        result.scenario,
        result.path,
        result.duration,
        result.deviceProfile,
        result.networkProfile,
        result.viewport,
        result.success
      ];
      
      // Add web vitals
      for (const metricKey in webVitals) {
        baseRow.push(webVitals[metricKey]);
      }
      
      // Add other metrics
      baseRow.push(
        metrics.pageLoad,
        metrics.resourceCount,
        metrics.slowResources,
        metrics.apiCallsCount,
        metrics.slowApiCalls,
        metrics.errorCount
      );
      
      return baseRow;
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `performance_test_${Date.now()}.csv`);
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Failed to export results to CSV', error);
  }
}

/**
 * Generate a summary report from test results
 * @param {Array} results - Test results to summarize
 * @returns {Object} Summary report
 */
export function generateTestSummary(results) {
  if (!results || !results.length) {
    return { success: false, message: 'No results to summarize' };
  }
  
  // Group results by scenario
  const scenarioResults = {};
  
  results.forEach(result => {
    if (!scenarioResults[result.scenario]) {
      scenarioResults[result.scenario] = [];
    }
    scenarioResults[result.scenario].push(result);
  });
  
  // Calculate scenario summaries
  const scenarios = {};
  
  for (const scenario in scenarioResults) {
    const scenarioData = scenarioResults[scenario];
    
    // Calculate metric averages
    const metrics = {
      webVitals: {
        FCP: calculateAverage(scenarioData.map(r => r.metrics?.webVitals?.FCP).filter(Boolean)),
        LCP: calculateAverage(scenarioData.map(r => r.metrics?.webVitals?.LCP).filter(Boolean)),
        CLS: calculateAverage(scenarioData.map(r => r.metrics?.webVitals?.CLS).filter(Boolean)),
        FID: calculateAverage(scenarioData.map(r => r.metrics?.webVitals?.FID).filter(Boolean)),
        TTFB: calculateAverage(scenarioData.map(r => r.metrics?.webVitals?.TTFB).filter(Boolean))
      },
      pageLoad: calculateAverage(scenarioData.map(r => r.metrics?.pageLoad).filter(Boolean)),
      resourceCount: calculateAverage(scenarioData.map(r => r.metrics?.resourceCount).filter(Boolean)),
      duration: calculateAverage(scenarioData.map(r => r.duration).filter(Boolean))
    };
    
    // Calculate scores based on thresholds
    const scores = calculateScores(metrics);
    
    // Store summary
    scenarios[scenario] = {
      results: scenarioData.length,
      successRate: scenarioData.filter(r => r.success).length / scenarioData.length,
      metrics,
      scores,
      overallScore: calculateOverallScore(scores)
    };
  }
  
  // Calculate overall summary
  const successRate = results.filter(r => r.success).length / results.length;
  const duration = calculateAverage(results.map(r => r.duration).filter(Boolean));
  const startTime = Math.min(...results.map(r => r.timestamp));
  const endTime = Math.max(...results.map(r => r.timestamp + (r.duration || 0)));
  
  // Check if any scenario scored below threshold
  const issuesFound = Object.values(scenarios).some(s => s.overallScore < 70);
  
  return {
    timestamp: Date.now(),
    testDuration: endTime - startTime,
    totalRuns: results.length,
    successRate,
    avgDuration: duration,
    scenarios,
    issuesFound,
    recommendations: issuesFound ? generateRecommendations(scenarios) : [],
    device: results[0].deviceProfile,
    network: results[0].networkProfile
  };
}

/**
 * Calculate the average of an array of numbers
 * @param {Array} values - Numbers to average
 * @returns {number} The average value
 */
function calculateAverage(values) {
  if (!values || !values.length) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate scores for metrics based on thresholds
 * @param {Object} metrics - The metrics to score
 * @returns {Object} Scores object
 */
function calculateScores(metrics) {
  const scores = {};
  
  // Web Vitals
  for (const metricKey in metrics.webVitals) {
    const value = metrics.webVitals[metricKey];
    if (value === null) continue;
    
    const thresholds = PERFORMANCE_METRICS[metricKey]?.thresholds;
    if (!thresholds) continue;
    
    // Calculate score (0-100)
    let score;
    if (value <= thresholds.good) {
      // Good range (90-100)
      score = 90 + 10 * (1 - value / thresholds.good);
    } else if (value <= thresholds.needsImprovement) {
      // Needs improvement range (60-90)
      const range = thresholds.needsImprovement - thresholds.good;
      score = 90 - 30 * ((value - thresholds.good) / range);
    } else {
      // Poor range (0-60)
      score = Math.max(0, 60 - 60 * ((value - thresholds.needsImprovement) / thresholds.needsImprovement));
    }
    
    scores[metricKey] = Math.round(score);
  }
  
  // Page Load
  if (metrics.pageLoad !== null) {
    const thresholds = PERFORMANCE_METRICS.LOAD.thresholds;
    let score;
    if (metrics.pageLoad <= thresholds.good) {
      score = 90 + 10 * (1 - metrics.pageLoad / thresholds.good);
    } else if (metrics.pageLoad <= thresholds.needsImprovement) {
      const range = thresholds.needsImprovement - thresholds.good;
      score = 90 - 30 * ((metrics.pageLoad - thresholds.good) / range);
    } else {
      score = Math.max(0, 60 - 60 * ((metrics.pageLoad - thresholds.needsImprovement) / thresholds.needsImprovement));
    }
    scores.LOAD = Math.round(score);
  }
  
  // Resource Count
  if (metrics.resourceCount !== null) {
    const thresholds = PERFORMANCE_METRICS.RESOURCE_COUNT.thresholds;
    let score;
    if (metrics.resourceCount <= thresholds.good) {
      score = 90 + 10 * (1 - metrics.resourceCount / thresholds.good);
    } else if (metrics.resourceCount <= thresholds.needsImprovement) {
      const range = thresholds.needsImprovement - thresholds.good;
      score = 90 - 30 * ((metrics.resourceCount - thresholds.good) / range);
    } else {
      score = Math.max(0, 60 - 60 * ((metrics.resourceCount - thresholds.needsImprovement) / thresholds.needsImprovement));
    }
    scores.RESOURCE_COUNT = Math.round(score);
  }
  
  return scores;
}

/**
 * Calculate an overall score from individual metric scores
 * @param {Object} scores - The individual metric scores
 * @returns {number} Overall score (0-100)
 */
function calculateOverallScore(scores) {
  const weights = {
    LCP: 0.25, // Largest Contentful Paint (most important)
    FID: 0.15, // First Input Delay
    CLS: 0.15, // Cumulative Layout Shift
    FCP: 0.10, // First Contentful Paint
    TTFB: 0.10, // Time to First Byte
    LOAD: 0.15, // Page Load
    RESOURCE_COUNT: 0.10 // Resource Count
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const metricKey in scores) {
    const weight = weights[metricKey] || 0.05; // Default weight for other metrics
    weightedSum += scores[metricKey] * weight;
    totalWeight += weight;
  }
  
  // Normalize by actual weights used
  return Math.round(weightedSum / (totalWeight || 1));
}

/**
 * Generate recommendations based on test results
 * @param {Object} scenarios - The scenario summaries
 * @returns {Array} List of recommendations
 */
function generateRecommendations(scenarios) {
  const recommendations = [];
  
  for (const scenarioName in scenarios) {
    const scenario = scenarios[scenarioName];
    const metrics = scenario.metrics;
    const scores = scenario.scores;
    
    // Check each metric and add recommendations for poor scores
    for (const metricKey in scores) {
      const score = scores[metricKey];
      if (score < 60) { // Poor score
        const value = metricKey in metrics.webVitals ? metrics.webVitals[metricKey] : metrics[metricKey.toLowerCase()];
        const unit = PERFORMANCE_METRICS[metricKey]?.unit || 'ms';
        
        switch (metricKey) {
          case 'LCP':
            recommendations.push({
              scenario: scenarioName,
              metric: PERFORMANCE_METRICS.LCP.name,
              value: `${Math.round(value)}${unit}`,
              score,
              recommendation: 'Optimize Largest Contentful Paint by improving image loading, reducing server response time, or implementing priority loading for critical assets. Consider lazy-loading images below the fold.'
            });
            break;
          case 'FID':
            recommendations.push({
              scenario: scenarioName,
              metric: PERFORMANCE_METRICS.FID.name,
              value: `${Math.round(value)}${unit}`,
              score,
              recommendation: 'Improve First Input Delay by reducing JavaScript execution time, breaking up long tasks, or optimizing event handlers. Consider code splitting and deferring non-critical JavaScript.'
            });
            break;
          case 'CLS':
            recommendations.push({
              scenario: scenarioName,
              metric: PERFORMANCE_METRICS.CLS.name,
              value: `${value.toFixed(3)}${unit}`,
              score,
              recommendation: 'Reduce Cumulative Layout Shift by adding size attributes to images and video elements, avoiding inserting content above existing content, and using transform animations instead of animations that trigger layout changes.'
            });
            break;
          case 'FCP':
            recommendations.push({
              scenario: scenarioName,
              metric: PERFORMANCE_METRICS.FCP.name,
              value: `${Math.round(value)}${unit}`,
              score,
              recommendation: 'Improve First Contentful Paint by eliminating render-blocking resources, minifying CSS and JavaScript, or using a CDN. Consider implementing critical CSS inline.'
            });
            break;
          case 'TTFB':
            recommendations.push({
              scenario: scenarioName,
              metric: PERFORMANCE_METRICS.TTFB.name,
              value: `${Math.round(value)}${unit}`,
              score,
              recommendation: 'Reduce Time to First Byte by optimizing server processing, implementing caching, or using a CDN. Review backend performance and database queries.'
            });
            break;
          case 'LOAD':
            recommendations.push({
              scenario: scenarioName,
              metric: PERFORMANCE_METRICS.LOAD.name,
              value: `${Math.round(value)}${unit}`,
              score,
              recommendation: 'Improve page load time by reducing the overall page weight, implementing code splitting, or optimizing resource loading. Consider lazy-loading non-critical resources.'
            });
            break;
          case 'RESOURCE_COUNT':
            recommendations.push({
              scenario: scenarioName,
              metric: PERFORMANCE_METRICS.RESOURCE_COUNT.name,
              value: `${Math.round(value)}${unit}`,
              score,
              recommendation: 'Reduce the number of resource requests by bundling assets, using sprite sheets for icons, or eliminating unnecessary resources. Consider implementing HTTP/2 to make multiple requests more efficient.'
            });
            break;
        }
      }
    }
  }
  
  return recommendations;
}

/**
 * Get the current test status
 * @returns {Object} Current test state
 */
export function getTestStatus() {
  return { ...testState };
}

/**
 * Check if we're running in a testing environment
 * @returns {boolean} True if in a testing environment
 */
export function isTestEnvironment() {
  if (typeof window === 'undefined') return false;
  
  // Check for Cypress
  if (window.Cypress) return true;
  
  // Check for Jest
  if (process.env.NODE_ENV === 'test') return true;
  
  // Check for other common test environments
  if (window.navigator.userAgent.includes('HeadlessChrome')) return true;
  if (window.navigator.userAgent.includes('PhantomJS')) return true;
  
  return false;
}

/**
 * Create a performance test URL with parameters
 * @param {string} scenario - The scenario to test
 * @param {Object} options - Test options
 * @returns {string} URL for running the test
 */
export function createTestUrl(scenario, options = {}) {
  if (typeof window === 'undefined') return '';
  
  const base = window.location.origin;
  const path = TEST_SCENARIOS[scenario]?.path || scenario;
  const params = new URLSearchParams();
  
  params.append('perfTest', 'true');
  
  if (options.device) {
    params.append('device', options.device);
  }
  
  if (options.network) {
    params.append('network', options.network);
  }
  
  if (options.autoRun) {
    params.append('autoRun', 'true');
  }
  
  return `${base}${path}?${params.toString()}`;
}

/**
 * Parse performance test parameters from URL
 * @returns {Object|null} Test parameters or null if not a test URL
 */
export function parseTestUrlParams() {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  
  if (!params.has('perfTest')) return null;
  
  return {
    device: params.get('device'),
    network: params.get('network'),
    autoRun: params.get('autoRun') === 'true'
  };
}

/**
 * Initialize performance testing from URL parameters
 */
export function initFromUrlParams() {
  const params = parseTestUrlParams();
  
  if (!params) return false;
  
  // Configure testing
  const config = {};
  
  if (params.device && DEVICE_PROFILES[params.device.toUpperCase()]) {
    config.deviceProfile = DEVICE_PROFILES[params.device.toUpperCase()];
  }
  
  if (params.network && NETWORK_PROFILES[params.network.toUpperCase()]) {
    config.networkProfile = NETWORK_PROFILES[params.network.toUpperCase()];
  }
  
  if (params.autoRun) {
    config.autoRun = true;
  }
  
  // Apply configuration
  configurePerformanceTesting(config);
  
  // Auto-run if enabled
  if (config.autoRun) {
    // Create a scenario based on current path
    const path = window.location.pathname;
    const scenario = {
      name: 'Auto Test',
      path,
      description: 'Automatically generated test'
    };
    
    // Wait for page to load and then run the test
    if (document.readyState === 'complete') {
      runPerformanceTest(scenario);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          runPerformanceTest(scenario);
        }, 1000); // Wait 1 second after load
      });
    }
  }
  
  return true;
}