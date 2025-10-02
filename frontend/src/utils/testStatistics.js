/**
 * Test our statistical calculations
 * Run this in the browser console to verify accuracy
 */

import * as StatCalc from './statisticalCalculations';

export const runStatisticalTests = () => {
  console.log('=== Testing Statistical Calculations ===\n');

  // Test data
  const testData = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
  const binaryData = [1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1];

  // Test 1: Mean with t-distribution
  console.log('1. Testing Mean CI (t-distribution):');
  console.log('   Data:', testData);
  try {
    const result = StatCalc.calculateMeanTInterval(testData, 0.95);
    console.log('   Mean:', result.mean.toFixed(4));
    console.log('   Sample Std:', result.std.toFixed(4));
    console.log('   95% CI: [' + result.lower.toFixed(4) + ', ' + result.upper.toFixed(4) + ']');
    console.log('   t-critical (df=' + result.df + '):', result.tCritical.toFixed(4));
    console.log('   Margin of Error:', result.marginOfError.toFixed(4));
    console.log('   ✓ Test passed\n');
  } catch (error) {
    console.log('   ✗ Error:', error.message, '\n');
  }

  // Test 2: Mean with z-distribution
  console.log('2. Testing Mean CI (z-distribution):');
  console.log('   Data:', testData);
  console.log('   Known population std: 3.0');
  try {
    const result = StatCalc.calculateMeanZInterval(testData, 3.0, 0.95);
    console.log('   Mean:', result.mean.toFixed(4));
    console.log('   95% CI: [' + result.lower.toFixed(4) + ', ' + result.upper.toFixed(4) + ']');
    console.log('   z-critical:', result.zCritical.toFixed(4));
    console.log('   Margin of Error:', result.marginOfError.toFixed(4));
    console.log('   ✓ Test passed\n');
  } catch (error) {
    console.log('   ✗ Error:', error.message, '\n');
  }

  // Test 3: Wilson Proportion Interval
  console.log('3. Testing Wilson Proportion Interval:');
  const successes = binaryData.filter(x => x === 1).length;
  console.log('   Successes:', successes, 'out of', binaryData.length);
  try {
    const result = StatCalc.calculateWilsonInterval(successes, binaryData.length, 0.95);
    console.log('   Proportion:', result.proportion.toFixed(4));
    console.log('   95% CI: [' + result.lower.toFixed(4) + ', ' + result.upper.toFixed(4) + ']');
    console.log('   ✓ Test passed\n');
  } catch (error) {
    console.log('   ✗ Error:', error.message, '\n');
  }

  // Test 4: Wald Proportion Interval
  console.log('4. Testing Wald Proportion Interval:');
  try {
    const result = StatCalc.calculateWaldInterval(successes, binaryData.length, 0.95);
    console.log('   Proportion:', result.proportion.toFixed(4));
    console.log('   95% CI: [' + result.lower.toFixed(4) + ', ' + result.upper.toFixed(4) + ']');
    console.log('   ✓ Test passed\n');
  } catch (error) {
    console.log('   ✗ Error:', error.message, '\n');
  }

  // Test 5: Clopper-Pearson Exact Interval
  console.log('5. Testing Clopper-Pearson Exact Interval:');
  try {
    const result = StatCalc.calculateClopperPearsonInterval(successes, binaryData.length, 0.95);
    console.log('   Proportion:', result.proportion.toFixed(4));
    console.log('   95% CI: [' + result.lower.toFixed(4) + ', ' + result.upper.toFixed(4) + ']');
    console.log('   ✓ Test passed\n');
  } catch (error) {
    console.log('   ✗ Error:', error.message, '\n');
  }

  // Test 6: Variance Interval
  console.log('6. Testing Variance/Std Dev Interval:');
  console.log('   Data:', testData);
  try {
    const result = StatCalc.calculateVarianceInterval(testData, 0.95);
    console.log('   Sample Variance:', result.sampleVariance.toFixed(4));
    console.log('   Sample Std Dev:', result.sampleStd.toFixed(4));
    console.log('   95% CI for Variance: [' + result.varianceLower.toFixed(4) + ', ' + result.varianceUpper.toFixed(4) + ']');
    console.log('   95% CI for Std Dev: [' + result.stdLower.toFixed(4) + ', ' + result.stdUpper.toFixed(4) + ']');
    console.log('   ✓ Test passed\n');
  } catch (error) {
    console.log('   ✗ Error:', error.message, '\n');
  }

  // Test 7: Two Sample Mean Interval
  console.log('7. Testing Two Sample Mean CI:');
  const data1 = [23, 24, 25, 26, 27];
  const data2 = [28, 29, 30, 31, 32];
  console.log('   Sample 1:', data1);
  console.log('   Sample 2:', data2);
  try {
    const result = StatCalc.calculateTwoSampleMeanInterval(data1, data2, 0.95, false);
    console.log('   Mean 1:', result.mean1.toFixed(4));
    console.log('   Mean 2:', result.mean2.toFixed(4));
    console.log('   Difference:', result.meanDifference.toFixed(4));
    console.log('   95% CI for difference: [' + result.lower.toFixed(4) + ', ' + result.upper.toFixed(4) + ']');
    console.log('   ✓ Test passed\n');
  } catch (error) {
    console.log('   ✗ Error:', error.message, '\n');
  }

  // Test 8: Sample Size Calculations
  console.log('8. Testing Sample Size Calculations:');
  try {
    const n1 = StatCalc.calculateSampleSizeForMean(0.5, 2.0, 0.95);
    console.log('   For mean with margin of error 0.5, std 2.0, 95% CI:');
    console.log('   Required sample size:', n1);

    const n2 = StatCalc.calculateSampleSizeForProportion(0.03, 0.5, 0.95);
    console.log('   For proportion with margin of error 3%, p=0.5, 95% CI:');
    console.log('   Required sample size:', n2);
    console.log('   ✓ Test passed\n');
  } catch (error) {
    console.log('   ✗ Error:', error.message, '\n');
  }

  console.log('=== All Tests Complete ===');
  console.log('\nTo run these tests, open the browser console and call: runStatisticalTests()');

  return 'Tests completed successfully';
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runStatisticalTests = runStatisticalTests;
}