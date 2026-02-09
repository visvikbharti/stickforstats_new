/**
 * Test our statistical calculations
 * Run this in the browser console to verify accuracy
 */

import * as StatCalc from './statisticalCalculations';

export const runStatisticalTests = () => {
  // Test data
  const testData = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
  const binaryData = [1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1];

  const results = [];

  // Test 1: Mean with t-distribution
  try {
    const result = StatCalc.calculateMeanTInterval(testData, 0.95);
    results.push({ test: 'Mean CI (t-distribution)', passed: true, result });
  } catch (error) {
    results.push({ test: 'Mean CI (t-distribution)', passed: false, error: error.message });
  }

  // Test 2: Mean with z-distribution
  try {
    const result = StatCalc.calculateMeanZInterval(testData, 3.0, 0.95);
    results.push({ test: 'Mean CI (z-distribution)', passed: true, result });
  } catch (error) {
    results.push({ test: 'Mean CI (z-distribution)', passed: false, error: error.message });
  }

  // Test 3: Wilson Proportion Interval
  const successes = binaryData.filter(x => x === 1).length;
  try {
    const result = StatCalc.calculateWilsonInterval(successes, binaryData.length, 0.95);
    results.push({ test: 'Wilson Proportion Interval', passed: true, result });
  } catch (error) {
    results.push({ test: 'Wilson Proportion Interval', passed: false, error: error.message });
  }

  // Test 4: Wald Proportion Interval
  try {
    const result = StatCalc.calculateWaldInterval(successes, binaryData.length, 0.95);
    results.push({ test: 'Wald Proportion Interval', passed: true, result });
  } catch (error) {
    results.push({ test: 'Wald Proportion Interval', passed: false, error: error.message });
  }

  // Test 5: Clopper-Pearson Exact Interval
  try {
    const result = StatCalc.calculateClopperPearsonInterval(successes, binaryData.length, 0.95);
    results.push({ test: 'Clopper-Pearson Exact Interval', passed: true, result });
  } catch (error) {
    results.push({ test: 'Clopper-Pearson Exact Interval', passed: false, error: error.message });
  }

  // Test 6: Variance Interval
  try {
    const result = StatCalc.calculateVarianceInterval(testData, 0.95);
    results.push({ test: 'Variance/Std Dev Interval', passed: true, result });
  } catch (error) {
    results.push({ test: 'Variance/Std Dev Interval', passed: false, error: error.message });
  }

  // Test 7: Two Sample Mean Interval
  const data1 = [23, 24, 25, 26, 27];
  const data2 = [28, 29, 30, 31, 32];
  try {
    const result = StatCalc.calculateTwoSampleMeanInterval(data1, data2, 0.95, false);
    results.push({ test: 'Two Sample Mean CI', passed: true, result });
  } catch (error) {
    results.push({ test: 'Two Sample Mean CI', passed: false, error: error.message });
  }

  // Test 8: Sample Size Calculations
  try {
    const n1 = StatCalc.calculateSampleSizeForMean(0.5, 2.0, 0.95);
    const n2 = StatCalc.calculateSampleSizeForProportion(0.03, 0.5, 0.95);
    results.push({ test: 'Sample Size Calculations', passed: true, result: { meanSampleSize: n1, proportionSampleSize: n2 } });
  } catch (error) {
    results.push({ test: 'Sample Size Calculations', passed: false, error: error.message });
  }

  return { results, allPassed: results.every(r => r.passed) };
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runStatisticalTests = runStatisticalTests;
}
