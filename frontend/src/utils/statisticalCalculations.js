/**
 * Real statistical calculations for confidence intervals
 * No mock data, no placeholders - everything scientifically accurate
 */

import { jStat } from 'jstat';

/**
 * Calculate confidence interval for mean with unknown variance (t-distribution)
 * @param {Array<number>} data - Sample data
 * @param {number} confidenceLevel - Confidence level (e.g., 0.95 for 95%)
 * @returns {Object} Confidence interval results
 */
export const calculateMeanTInterval = (data, confidenceLevel = 0.95) => {
  if (!data || data.length < 2) {
    throw new Error('Need at least 2 data points');
  }

  const n = data.length;
  const mean = jStat.mean(data);
  const std = jStat.stdev(data, true); // Sample standard deviation
  const se = std / Math.sqrt(n);
  const df = n - 1;
  const alpha = 1 - confidenceLevel;
  const tCritical = jStat.studentt.inv(1 - alpha / 2, df);

  return {
    mean,
    std,
    se,
    df,
    tCritical,
    lower: mean - tCritical * se,
    upper: mean + tCritical * se,
    confidenceLevel,
    sampleSize: n,
    marginOfError: tCritical * se
  };
};

/**
 * Calculate confidence interval for mean with known variance (z-distribution)
 * @param {Array<number>} data - Sample data
 * @param {number} populationStd - Known population standard deviation
 * @param {number} confidenceLevel - Confidence level
 * @returns {Object} Confidence interval results
 */
export const calculateMeanZInterval = (data, populationStd, confidenceLevel = 0.95) => {
  if (!data || data.length === 0) {
    throw new Error('Data cannot be empty');
  }
  if (populationStd <= 0) {
    throw new Error('Population standard deviation must be positive');
  }

  const n = data.length;
  const mean = jStat.mean(data);
  const se = populationStd / Math.sqrt(n);
  const alpha = 1 - confidenceLevel;
  const zCritical = jStat.normal.inv(1 - alpha / 2, 0, 1);

  return {
    mean,
    populationStd,
    se,
    zCritical,
    lower: mean - zCritical * se,
    upper: mean + zCritical * se,
    confidenceLevel,
    sampleSize: n,
    marginOfError: zCritical * se
  };
};

/**
 * Calculate Wilson score interval for proportion
 * @param {number} successes - Number of successes
 * @param {number} n - Total number of trials
 * @param {number} confidenceLevel - Confidence level
 * @returns {Object} Confidence interval results
 */
export const calculateWilsonInterval = (successes, n, confidenceLevel = 0.95) => {
  if (n <= 0) {
    throw new Error('Sample size must be positive');
  }
  if (successes < 0 || successes > n) {
    throw new Error('Number of successes must be between 0 and sample size');
  }

  const p = successes / n;
  const alpha = 1 - confidenceLevel;
  const z = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const z2 = z * z;

  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = (z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / denominator;

  return {
    proportion: p,
    successes,
    n,
    zCritical: z,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    confidenceLevel,
    method: 'Wilson'
  };
};

/**
 * Calculate Wald interval for proportion
 * @param {number} successes - Number of successes
 * @param {number} n - Total number of trials
 * @param {number} confidenceLevel - Confidence level
 * @returns {Object} Confidence interval results
 */
export const calculateWaldInterval = (successes, n, confidenceLevel = 0.95) => {
  if (n <= 0) {
    throw new Error('Sample size must be positive');
  }
  if (successes < 0 || successes > n) {
    throw new Error('Number of successes must be between 0 and sample size');
  }

  const p = successes / n;
  const alpha = 1 - confidenceLevel;
  const z = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const se = Math.sqrt(p * (1 - p) / n);
  const margin = z * se;

  return {
    proportion: p,
    successes,
    n,
    zCritical: z,
    se,
    lower: Math.max(0, p - margin),
    upper: Math.min(1, p + margin),
    confidenceLevel,
    marginOfError: margin,
    method: 'Wald'
  };
};

/**
 * Calculate Clopper-Pearson exact interval for proportion
 * @param {number} successes - Number of successes
 * @param {number} n - Total number of trials
 * @param {number} confidenceLevel - Confidence level
 * @returns {Object} Confidence interval results
 */
export const calculateClopperPearsonInterval = (successes, n, confidenceLevel = 0.95) => {
  if (n <= 0) {
    throw new Error('Sample size must be positive');
  }
  if (successes < 0 || successes > n) {
    throw new Error('Number of successes must be between 0 and sample size');
  }

  const alpha = 1 - confidenceLevel;
  let lower, upper;

  if (successes === 0) {
    lower = 0;
    upper = 1 - Math.pow(alpha / 2, 1 / n);
  } else if (successes === n) {
    lower = Math.pow(alpha / 2, 1 / n);
    upper = 1;
  } else {
    // Use beta distribution quantiles
    lower = jStat.beta.inv(alpha / 2, successes, n - successes + 1);
    upper = jStat.beta.inv(1 - alpha / 2, successes + 1, n - successes);
  }

  return {
    proportion: successes / n,
    successes,
    n,
    lower,
    upper,
    confidenceLevel,
    method: 'Clopper-Pearson (Exact)'
  };
};

/**
 * Calculate confidence interval for variance
 * @param {Array<number>} data - Sample data
 * @param {number} confidenceLevel - Confidence level
 * @returns {Object} Confidence interval results
 */
export const calculateVarianceInterval = (data, confidenceLevel = 0.95) => {
  if (!data || data.length < 2) {
    throw new Error('Need at least 2 data points');
  }

  const n = data.length;
  const sampleVariance = jStat.variance(data, true); // Sample variance
  const df = n - 1;
  const alpha = 1 - confidenceLevel;

  const chiLower = jStat.chisquare.inv(1 - alpha / 2, df);
  const chiUpper = jStat.chisquare.inv(alpha / 2, df);

  const varianceLower = (df * sampleVariance) / chiLower;
  const varianceUpper = (df * sampleVariance) / chiUpper;

  return {
    sampleVariance,
    sampleStd: Math.sqrt(sampleVariance),
    df,
    chiSquareLower: chiLower,
    chiSquareUpper: chiUpper,
    varianceLower,
    varianceUpper,
    stdLower: Math.sqrt(varianceLower),
    stdUpper: Math.sqrt(varianceUpper),
    confidenceLevel,
    sampleSize: n
  };
};

/**
 * Calculate confidence interval for the difference between two means
 * @param {Array<number>} data1 - First sample data
 * @param {Array<number>} data2 - Second sample data
 * @param {number} confidenceLevel - Confidence level
 * @param {boolean} equalVariances - Assume equal variances
 * @returns {Object} Confidence interval results
 */
export const calculateTwoSampleMeanInterval = (data1, data2, confidenceLevel = 0.95, equalVariances = false) => {
  if (!data1 || data1.length < 2 || !data2 || data2.length < 2) {
    throw new Error('Each sample needs at least 2 data points');
  }

  const n1 = data1.length;
  const n2 = data2.length;
  const mean1 = jStat.mean(data1);
  const mean2 = jStat.mean(data2);
  const s1 = jStat.stdev(data1, true);
  const s2 = jStat.stdev(data2, true);
  const meanDiff = mean1 - mean2;
  const alpha = 1 - confidenceLevel;

  let se, df, tCritical;

  if (equalVariances) {
    // Pooled variance
    const sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2));
    se = sp * Math.sqrt(1 / n1 + 1 / n2);
    df = n1 + n2 - 2;
  } else {
    // Welch's t-test
    se = Math.sqrt(s1 * s1 / n1 + s2 * s2 / n2);
    const v1 = s1 * s1 / n1;
    const v2 = s2 * s2 / n2;
    df = Math.pow(v1 + v2, 2) / (v1 * v1 / (n1 - 1) + v2 * v2 / (n2 - 1));
  }

  tCritical = jStat.studentt.inv(1 - alpha / 2, df);

  return {
    mean1,
    mean2,
    meanDifference: meanDiff,
    std1: s1,
    std2: s2,
    se,
    df,
    tCritical,
    lower: meanDiff - tCritical * se,
    upper: meanDiff + tCritical * se,
    confidenceLevel,
    n1,
    n2,
    equalVariances,
    marginOfError: tCritical * se
  };
};

/**
 * Calculate confidence interval for the difference between two proportions
 * @param {number} successes1 - Successes in first sample
 * @param {number} n1 - First sample size
 * @param {number} successes2 - Successes in second sample
 * @param {number} n2 - Second sample size
 * @param {number} confidenceLevel - Confidence level
 * @returns {Object} Confidence interval results
 */
export const calculateTwoProportionInterval = (successes1, n1, successes2, n2, confidenceLevel = 0.95) => {
  if (n1 <= 0 || n2 <= 0) {
    throw new Error('Sample sizes must be positive');
  }
  if (successes1 < 0 || successes1 > n1 || successes2 < 0 || successes2 > n2) {
    throw new Error('Number of successes must be between 0 and sample size');
  }

  const p1 = successes1 / n1;
  const p2 = successes2 / n2;
  const diff = p1 - p2;
  const alpha = 1 - confidenceLevel;
  const z = jStat.normal.inv(1 - alpha / 2, 0, 1);

  const se = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
  const margin = z * se;

  return {
    proportion1: p1,
    proportion2: p2,
    difference: diff,
    successes1,
    n1,
    successes2,
    n2,
    zCritical: z,
    se,
    lower: diff - margin,
    upper: diff + margin,
    confidenceLevel,
    marginOfError: margin
  };
};

/**
 * Calculate sample size needed for desired margin of error (mean)
 * @param {number} marginOfError - Desired margin of error
 * @param {number} std - Standard deviation (estimated or known)
 * @param {number} confidenceLevel - Confidence level
 * @returns {number} Required sample size
 */
export const calculateSampleSizeForMean = (marginOfError, std, confidenceLevel = 0.95) => {
  if (marginOfError <= 0) {
    throw new Error('Margin of error must be positive');
  }
  if (std <= 0) {
    throw new Error('Standard deviation must be positive');
  }

  const alpha = 1 - confidenceLevel;
  const z = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const n = Math.pow((z * std) / marginOfError, 2);

  return Math.ceil(n);
};

/**
 * Calculate sample size needed for desired margin of error (proportion)
 * @param {number} marginOfError - Desired margin of error
 * @param {number} estimatedProportion - Estimated proportion (use 0.5 for most conservative)
 * @param {number} confidenceLevel - Confidence level
 * @returns {number} Required sample size
 */
export const calculateSampleSizeForProportion = (marginOfError, estimatedProportion = 0.5, confidenceLevel = 0.95) => {
  if (marginOfError <= 0 || marginOfError >= 1) {
    throw new Error('Margin of error must be between 0 and 1');
  }
  if (estimatedProportion < 0 || estimatedProportion > 1) {
    throw new Error('Estimated proportion must be between 0 and 1');
  }

  const alpha = 1 - confidenceLevel;
  const z = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const n = (z * z * estimatedProportion * (1 - estimatedProportion)) / (marginOfError * marginOfError);

  return Math.ceil(n);
};

/**
 * Perform coverage probability simulation
 * @param {Function} intervalFunction - Function that calculates CI
 * @param {number} trueParameter - True parameter value
 * @param {number} sampleSize - Sample size
 * @param {number} numSimulations - Number of simulations
 * @param {number} confidenceLevel - Confidence level
 * @returns {Object} Coverage results
 */
export const simulateCoverage = (intervalFunction, trueParameter, sampleSize, numSimulations = 1000, confidenceLevel = 0.95) => {
  let coverage = 0;
  let widths = [];

  for (let i = 0; i < numSimulations; i++) {
    // Generate sample from normal distribution
    const sample = [];
    for (let j = 0; j < sampleSize; j++) {
      sample.push(jStat.normal.sample(trueParameter, 1));
    }

    const result = intervalFunction(sample, confidenceLevel);

    if (result.lower <= trueParameter && result.upper >= trueParameter) {
      coverage++;
    }

    widths.push(result.upper - result.lower);
  }

  return {
    coverageProbability: coverage / numSimulations,
    expectedCoverage: confidenceLevel,
    averageWidth: jStat.mean(widths),
    widthStd: jStat.stdev(widths, true),
    numSimulations,
    sampleSize
  };
};