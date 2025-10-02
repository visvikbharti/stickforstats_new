/**
 * Client-side simulation utilities for confidence intervals
 * These functions run simulations in the browser without requiring backend WebSocket connections
 */

// Statistical distributions and calculations

/**
 * Box-Muller transform to generate normal random variables
 */
function normalRandom(mean = 0, std = 1) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * std + mean;
}

/**
 * Generate random samples from various distributions
 */
export function generateRandomSample(distribution, params, sampleSize) {
  const sample = [];

  switch (distribution) {
    case 'NORMAL':
      for (let i = 0; i < sampleSize; i++) {
        sample.push(normalRandom(params.mean || 0, params.std || 1));
      }
      break;

    case 'UNIFORM':
      const min = (params.mean || 0) - Math.sqrt(3) * (params.std || 1);
      const max = (params.mean || 0) + Math.sqrt(3) * (params.std || 1);
      for (let i = 0; i < sampleSize; i++) {
        sample.push(min + Math.random() * (max - min));
      }
      break;

    case 'LOGNORMAL':
      for (let i = 0; i < sampleSize; i++) {
        sample.push(Math.exp(normalRandom(params.mean || 0, params.sigma || 1)));
      }
      break;

    case 'GAMMA':
      // Using shape-scale parameterization
      const shape = params.shape || 2;
      const scale = params.scale || 1;
      for (let i = 0; i < sampleSize; i++) {
        sample.push(gammaRandom(shape, scale));
      }
      break;

    case 'T':
      // Student's t-distribution using normal approximation for simplicity
      const df = params.df || 10;
      for (let i = 0; i < sampleSize; i++) {
        sample.push(tRandom(df));
      }
      break;

    case 'BINOMIAL':
      const p = params.p || 0.5;
      const n = params.n || sampleSize;
      for (let i = 0; i < sampleSize; i++) {
        let successes = 0;
        for (let j = 0; j < n; j++) {
          if (Math.random() < p) successes++;
        }
        sample.push(successes);
      }
      break;

    case 'POISSON':
      const lambda = params.lambda || 5;
      for (let i = 0; i < sampleSize; i++) {
        sample.push(poissonRandom(lambda));
      }
      break;

    case 'MIXTURE':
      // Bimodal mixture
      const means = params.means || [params.mean - 2, params.mean + 2];
      const stds = params.stds || [params.std, params.std];
      const weights = params.weights || [0.5, 0.5];
      for (let i = 0; i < sampleSize; i++) {
        const component = Math.random() < weights[0] ? 0 : 1;
        sample.push(normalRandom(means[component], stds[component]));
      }
      break;

    default:
      // Default to normal
      for (let i = 0; i < sampleSize; i++) {
        sample.push(normalRandom(params.mean || 0, params.std || 1));
      }
  }

  return sample;
}

/**
 * Gamma random variable using Marsaglia and Tsang method
 */
function gammaRandom(shape, scale) {
  if (shape < 1) {
    return gammaRandom(shape + 1, scale) * Math.pow(Math.random(), 1.0 / shape);
  }

  const d = shape - 1.0 / 3.0;
  const c = 1.0 / Math.sqrt(9.0 * d);

  while (true) {
    let x, v;
    do {
      x = normalRandom(0, 1);
      v = 1.0 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v * scale;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

/**
 * Student's t random variable
 */
function tRandom(df) {
  const z = normalRandom(0, 1);
  const chi2 = chiSquaredRandom(df);
  return z / Math.sqrt(chi2 / df);
}

/**
 * Chi-squared random variable
 */
function chiSquaredRandom(df) {
  return gammaRandom(df / 2, 2);
}

/**
 * Poisson random variable
 */
function poissonRandom(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

/**
 * Calculate sample statistics
 */
export function calculateStats(data) {
  const n = data.length;
  const mean = data.reduce((sum, x) => sum + x, 0) / n;
  const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
  const std = Math.sqrt(variance);

  return { mean, std, variance, n };
}

/**
 * Calculate t critical value (approximation)
 */
function tCritical(df, alpha) {
  // Using Wilson-Hilferty approximation for t-distribution
  const z = normalQuantile(1 - alpha / 2);

  if (df > 30) {
    return z;
  }

  // Better approximation for small df
  const g1 = 1 / (4 * df);
  const g2 = 1 / (96 * df * df);
  return z * (1 + g1 * (z * z + 3) + g2 * (z * z * z * z + 5 * z * z + 3));
}

/**
 * Normal quantile function (inverse CDF) - approximation
 */
function normalQuantile(p) {
  // Beasley-Springer-Moro approximation
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
             0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
             0.0000321767881768, 0.0000002888167364, 0.0000003960315187];

  if (p <= 0 || p >= 1) {
    throw new Error("Probability must be between 0 and 1");
  }

  const y = p - 0.5;

  if (Math.abs(y) < 0.42) {
    const r = y * y;
    let x = y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]);
    x /= ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
    return x;
  }

  let r = p;
  if (y > 0) r = 1 - p;
  r = Math.log(-Math.log(r));

  let x = c[0];
  for (let i = 1; i < c.length; i++) {
    x += c[i] * Math.pow(r, i);
  }

  if (y < 0) x = -x;
  return x;
}

/**
 * Chi-squared critical value
 */
function chiSquaredCritical(df, alpha) {
  // Wilson-Hilferty approximation
  const z = normalQuantile(1 - alpha);
  const h = 1 - 2/(9*df);
  const w = z * Math.sqrt(2/(9*df));
  return df * Math.pow(h + w, 3);
}

/**
 * Calculate confidence interval for mean (t-interval)
 */
export function calculateMeanTInterval(data, confidenceLevel) {
  const stats = calculateStats(data);
  const alpha = 1 - confidenceLevel;
  const t = tCritical(stats.n - 1, alpha);
  const margin = t * stats.std / Math.sqrt(stats.n);

  return {
    lower: stats.mean - margin,
    upper: stats.mean + margin,
    mean: stats.mean,
    std: stats.std,
    n: stats.n,
    margin
  };
}

/**
 * Calculate confidence interval for mean (z-interval with known sigma)
 */
export function calculateMeanZInterval(data, confidenceLevel, sigma = null) {
  const stats = calculateStats(data);
  const actualSigma = sigma || stats.std;
  const alpha = 1 - confidenceLevel;
  const z = normalQuantile(1 - alpha / 2);
  const margin = z * actualSigma / Math.sqrt(stats.n);

  return {
    lower: stats.mean - margin,
    upper: stats.mean + margin,
    mean: stats.mean,
    std: stats.std,
    n: stats.n,
    margin
  };
}

/**
 * Calculate confidence interval for variance
 */
export function calculateVarianceInterval(data, confidenceLevel) {
  const stats = calculateStats(data);
  const alpha = 1 - confidenceLevel;
  const df = stats.n - 1;

  const chiLower = chiSquaredCritical(df, 1 - alpha / 2);
  const chiUpper = chiSquaredCritical(df, alpha / 2);

  return {
    lower: (df * stats.variance) / chiLower,
    upper: (df * stats.variance) / chiUpper,
    variance: stats.variance,
    n: stats.n
  };
}

/**
 * Calculate confidence interval for standard deviation
 */
export function calculateStdDevInterval(data, confidenceLevel) {
  const varInterval = calculateVarianceInterval(data, confidenceLevel);
  return {
    lower: Math.sqrt(varInterval.lower),
    upper: Math.sqrt(varInterval.upper),
    std: Math.sqrt(varInterval.variance),
    n: varInterval.n
  };
}

/**
 * Calculate confidence interval for proportion (Wald method)
 */
export function calculateProportionWaldInterval(successes, n, confidenceLevel) {
  const p = successes / n;
  const alpha = 1 - confidenceLevel;
  const z = normalQuantile(1 - alpha / 2);
  const margin = z * Math.sqrt(p * (1 - p) / n);

  return {
    lower: Math.max(0, p - margin),
    upper: Math.min(1, p + margin),
    proportion: p,
    n,
    margin
  };
}

/**
 * Calculate confidence interval for proportion (Wilson score method)
 */
export function calculateProportionWilsonInterval(successes, n, confidenceLevel) {
  const p = successes / n;
  const alpha = 1 - confidenceLevel;
  const z = normalQuantile(1 - alpha / 2);
  const z2 = z * z;

  const center = (p + z2 / (2 * n)) / (1 + z2 / n);
  const margin = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / (1 + z2 / n);

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    proportion: p,
    n,
    margin
  };
}

/**
 * Run coverage simulation
 * Generates many samples and checks if the true parameter is captured
 */
export async function runCoverageSimulation(params, onProgress) {
  const {
    intervalType,
    confidenceLevel,
    sampleSize,
    numSimulations,
    distribution,
    distParams
  } = params;

  const results = {
    intervals: [],
    coverage: 0,
    averageWidth: 0,
    trueValue: distParams.mean || 0
  };

  let captured = 0;
  let totalWidth = 0;

  // Run simulations in chunks to allow UI updates
  const chunkSize = 100;
  const numChunks = Math.ceil(numSimulations / chunkSize);

  for (let chunk = 0; chunk < numChunks; chunk++) {
    const simulationsInChunk = Math.min(chunkSize, numSimulations - chunk * chunkSize);

    for (let i = 0; i < simulationsInChunk; i++) {
      // Generate sample
      const sample = generateRandomSample(distribution, distParams, sampleSize);

      // Calculate confidence interval
      let interval;
      if (intervalType === 'MEAN_T' || intervalType === 'mean') {
        interval = calculateMeanTInterval(sample, confidenceLevel);
      } else if (intervalType === 'MEAN_Z') {
        interval = calculateMeanZInterval(sample, confidenceLevel, distParams.std);
      } else if (intervalType === 'VARIANCE') {
        interval = calculateVarianceInterval(sample, confidenceLevel);
        results.trueValue = distParams.std * distParams.std;
      } else if (intervalType === 'STD_DEV') {
        interval = calculateStdDevInterval(sample, confidenceLevel);
        results.trueValue = distParams.std;
      } else {
        interval = calculateMeanTInterval(sample, confidenceLevel);
      }

      // Check if interval captures true value
      const captures = interval.lower <= results.trueValue && interval.upper >= results.trueValue;
      if (captures) captured++;

      // Track width
      const width = interval.upper - interval.lower;
      totalWidth += width;

      // Store some intervals for visualization (first 100)
      if (results.intervals.length < 100) {
        results.intervals.push({
          lower: interval.lower,
          upper: interval.upper,
          captures,
          sampleMean: interval.mean || interval.variance || interval.std
        });
      }
    }

    // Update progress
    const progress = ((chunk + 1) / numChunks) * 100;
    if (onProgress) {
      onProgress(progress);
    }

    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  results.coverage = captured / numSimulations;
  results.averageWidth = totalWidth / numSimulations;

  return results;
}

/**
 * Run sample size simulation
 * Shows how interval width changes with sample size
 */
export async function runSampleSizeSimulation(params, onProgress) {
  const {
    confidenceLevel,
    minSampleSize,
    maxSampleSize,
    sampleSizeStep,
    distribution,
    distParams,
    numSimulations
  } = params;

  const results = {
    sampleSizes: [],
    averageWidths: [],
    coverageRates: []
  };

  const sampleSizes = [];
  for (let n = minSampleSize; n <= maxSampleSize; n += sampleSizeStep) {
    sampleSizes.push(n);
  }

  for (let sizeIndex = 0; sizeIndex < sampleSizes.length; sizeIndex++) {
    const n = sampleSizes[sizeIndex];
    let totalWidth = 0;
    let captured = 0;
    const trueValue = distParams.mean || 0;

    for (let sim = 0; sim < numSimulations; sim++) {
      const sample = generateRandomSample(distribution, distParams, n);
      const interval = calculateMeanTInterval(sample, confidenceLevel);

      totalWidth += (interval.upper - interval.lower);
      if (interval.lower <= trueValue && interval.upper >= trueValue) {
        captured++;
      }
    }

    results.sampleSizes.push(n);
    results.averageWidths.push(totalWidth / numSimulations);
    results.coverageRates.push(captured / numSimulations);

    // Update progress
    const progress = ((sizeIndex + 1) / sampleSizes.length) * 100;
    if (onProgress) {
      onProgress(progress);
    }

    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}

/**
 * Run bootstrap simulation
 */
export async function runBootstrapSimulation(params, onProgress) {
  const {
    sampleSize,
    numBootstraps,
    confidenceLevel,
    distribution,
    distParams
  } = params;

  // Generate original sample
  const originalSample = generateRandomSample(distribution, distParams, sampleSize);
  const originalStats = calculateStats(originalSample);

  // Bootstrap resampling
  const bootstrapMeans = [];

  for (let i = 0; i < numBootstraps; i++) {
    // Resample with replacement
    const resample = [];
    for (let j = 0; j < sampleSize; j++) {
      const index = Math.floor(Math.random() * sampleSize);
      resample.push(originalSample[index]);
    }

    const resampleStats = calculateStats(resample);
    bootstrapMeans.push(resampleStats.mean);

    // Update progress
    if (i % 100 === 0 && onProgress) {
      onProgress((i / numBootstraps) * 100);
    }
  }

  // Calculate percentile intervals
  bootstrapMeans.sort((a, b) => a - b);
  const alpha = 1 - confidenceLevel;
  const lowerIndex = Math.floor(alpha / 2 * numBootstraps);
  const upperIndex = Math.ceil((1 - alpha / 2) * numBootstraps);

  // Calculate bootstrap statistics
  const bootstrapMean = bootstrapMeans.reduce((sum, val) => sum + val, 0) / bootstrapMeans.length;
  const bootstrapSE = Math.sqrt(
    bootstrapMeans.reduce((sum, val) => sum + Math.pow(val - bootstrapMean, 2), 0) / (bootstrapMeans.length - 1)
  );

  // Generate histogram data
  const numBins = 30;
  const minVal = Math.min(...bootstrapMeans);
  const maxVal = Math.max(...bootstrapMeans);
  const binWidth = (maxVal - minVal) / numBins;
  const histogram = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = minVal + i * binWidth;
    const binEnd = binStart + binWidth;
    const binCenter = (binStart + binEnd) / 2;
    const count = bootstrapMeans.filter(val => val >= binStart && val < binEnd).length;
    histogram.push({ bin_center: binCenter, count });
  }

  // Calculate percentiles
  const percentileValues = [1, 5, 10, 25, 50, 75, 90, 95, 99];
  const percentiles = percentileValues.map(p => ({
    percentile: p,
    value: bootstrapMeans[Math.floor((p / 100) * bootstrapMeans.length)]
  }));

  // Get true parameter if distribution has known mean
  let trueParam = null;
  if (distribution === 'NORMAL' && distParams.mean !== undefined) {
    trueParam = distParams.mean;
  }

  return {
    originalMean: originalStats.mean,
    originalStd: originalStats.std,
    bootstrapMeans,
    lower: bootstrapMeans[lowerIndex],
    upper: bootstrapMeans[upperIndex],
    sampleSize,
    numBootstraps,
    // Additional properties for complete Bootstrap analysis
    observed_stat: originalStats.mean,
    bootstrap_mean: bootstrapMean,
    bootstrap_se: bootstrapSE,
    ci_lower: bootstrapMeans[lowerIndex],
    ci_upper: bootstrapMeans[upperIndex],
    bootstrap_histogram: histogram,
    percentiles: percentiles,
    true_param: trueParam
  };
}

/**
 * Run transformation simulation
 * Compares confidence intervals on original vs transformed scales
 */
export async function runTransformationSimulation(params, onProgress) {
  const {
    sampleSize,
    numSimulations,
    confidenceLevel,
    distribution,
    distParams,
    transformation
  } = params;

  // Define transformation functions
  const transformFunctions = {
    LOG: {
      forward: x => Math.log(Math.abs(x) + 0.001),
      inverse: x => Math.exp(x),
      name: 'Natural Logarithm'
    },
    SQRT: {
      forward: x => Math.sqrt(Math.abs(x)),
      inverse: x => x * x,
      name: 'Square Root'
    },
    SQUARE: {
      forward: x => x * x,
      inverse: x => Math.sqrt(Math.abs(x)),
      name: 'Square'
    },
    INVERSE: {
      forward: x => 1 / (x + 0.001),
      inverse: x => 1 / (x + 0.001),
      name: 'Inverse (1/x)'
    }
  };

  const transform = transformFunctions[transformation] || transformFunctions.LOG;

  // Get true parameter value
  const trueParameter = distParams.mean || 0;

  const originalIntervals = [];
  const transformedIntervals = [];
  let originalContains = 0;
  let transformedContains = 0;
  let originalWidthSum = 0;
  let transformedWidthSum = 0;
  const originalWidths = [];
  const transformedWidths = [];
  const intervalExamples = [];

  for (let i = 0; i < numSimulations; i++) {
    // Generate sample
    const sample = generateRandomSample(distribution, distParams, sampleSize);

    // Calculate interval on original scale
    const originalInterval = calculateMeanTInterval(sample, confidenceLevel);
    const originalWidth = originalInterval.upper - originalInterval.lower;
    originalWidths.push(originalWidth);
    originalWidthSum += originalWidth;

    const originalContainsTrueValue =
      originalInterval.lower <= trueParameter && originalInterval.upper >= trueParameter;
    if (originalContainsTrueValue) originalContains++;

    // Transform the sample
    const transformedSample = sample.map(x => transform.forward(x));

    // Calculate interval on transformed scale
    const transformedInterval = calculateMeanTInterval(transformedSample, confidenceLevel);

    // Back-transform the interval to original scale
    const backLower = transform.inverse(transformedInterval.lower);
    const backUpper = transform.inverse(transformedInterval.upper);
    const [transformedLower, transformedUpper] = backLower < backUpper ?
      [backLower, backUpper] : [backUpper, backLower];

    const transformedWidth = transformedUpper - transformedLower;
    transformedWidths.push(transformedWidth);
    transformedWidthSum += transformedWidth;

    const transformedContainsTrueValue =
      transformedLower <= trueParameter && transformedUpper >= trueParameter;
    if (transformedContainsTrueValue) transformedContains++;

    // Store examples (first 10)
    if (i < 10) {
      intervalExamples.push({
        original_lower: originalInterval.lower,
        original_upper: originalInterval.upper,
        transformed_lower: transformedLower,
        transformed_upper: transformedUpper,
        contains_true: originalContainsTrueValue,
        transformed_contains_true: transformedContainsTrueValue
      });
    }

    // Update progress
    if (i % 100 === 0 && onProgress) {
      onProgress((i / numSimulations) * 100);
    }

    // Allow UI updates
    if (i % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Calculate statistics
  const originalCoverage = originalContains / numSimulations;
  const transformedCoverage = transformedContains / numSimulations;
  const originalMeanWidth = originalWidthSum / numSimulations;
  const transformedMeanWidth = transformedWidthSum / numSimulations;

  originalWidths.sort((a, b) => a - b);
  transformedWidths.sort((a, b) => a - b);
  const originalMedianWidth = originalWidths[Math.floor(numSimulations / 2)];
  const transformedMedianWidth = transformedWidths[Math.floor(numSimulations / 2)];

  // Calculate symmetry measure (ratio of distances from true value to lower/upper bounds)
  const originalSymmetry = intervalExamples.reduce((sum, ex) => {
    const lowerDist = trueParameter - ex.original_lower;
    const upperDist = ex.original_upper - trueParameter;
    return sum + Math.abs(Math.log(upperDist / lowerDist));
  }, 0) / intervalExamples.length;

  const transformedSymmetry = intervalExamples.reduce((sum, ex) => {
    const lowerDist = trueParameter - ex.transformed_lower;
    const upperDist = ex.transformed_upper - trueParameter;
    return sum + Math.abs(Math.log(upperDist / lowerDist));
  }, 0) / intervalExamples.length;

  const symmetryImprovement = originalSymmetry - transformedSymmetry;

  return {
    original_coverage: originalCoverage,
    transformed_coverage: transformedCoverage,
    original_mean_width: originalMeanWidth,
    back_transformed_mean_width: transformedMeanWidth,
    original_median_width: originalMedianWidth,
    transformed_median_width: transformedMedianWidth,
    original_intervals_containing_true: originalContains,
    transformed_intervals_containing_true: transformedContains,
    transformed_mean_width: transformedMeanWidth,
    symmetry_improvement: symmetryImprovement,
    original_interval_shape: originalSymmetry < 0.1 ? 'Symmetric' : 'Asymmetric',
    transformed_interval_shape: transformedSymmetry < 0.1 ? 'Symmetric' : 'Asymmetric',
    transformation_function: transform.name,
    true_parameter: trueParameter,
    interval_examples: intervalExamples
  };
}

/**
 * Calculate trimmed mean (removing top and bottom 10%)
 */
function calculateTrimmedMean(sample) {
  const sorted = [...sample].sort((a, b) => a - b);
  const trimCount = Math.floor(sample.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
}

/**
 * Calculate skewness
 */
function calculateSkewness(sample) {
  const stats = calculateStats(sample);
  const n = sample.length;
  const sum3 = sample.reduce((sum, x) => sum + Math.pow((x - stats.mean) / stats.std, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum3;
}

/**
 * Calculate kurtosis
 */
function calculateKurtosis(sample) {
  const stats = calculateStats(sample);
  const n = sample.length;
  const sum4 = sample.reduce((sum, x) => sum + Math.pow((x - stats.mean) / stats.std, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4 -
         (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
}

/**
 * Run non-normality simulation
 * Compares different CI methods under non-normal distributions
 */
export async function runNonNormalitySimulation(params, onProgress) {
  const {
    sampleSize,
    numSimulations,
    confidenceLevel,
    distribution,
    distParams
  } = params;

  // Get true parameter value
  const trueParameter = distParams.mean || 0;

  // Track results for different interval methods
  const methods = {
    'MEAN_T': { id: 'MEAN_T', label: 'Mean (t-interval)', contains: 0, widths: [] },
    'TRIMMED_MEAN': { id: 'TRIMMED_MEAN', label: 'Trimmed Mean (10%)', contains: 0, widths: [] },
    'MEDIAN': { id: 'MEDIAN', label: 'Median', contains: 0, widths: [] }
  };

  // Collect samples for distribution analysis
  const allSampleValues = [];
  let skewnessSum = 0;
  let kurtosisSum = 0;

  for (let i = 0; i < numSimulations; i++) {
    // Generate sample
    const sample = generateRandomSample(distribution, distParams, sampleSize);

    // Store values for histogram (first 100 samples)
    if (i < 100) {
      allSampleValues.push(...sample);
    }

    // Calculate skewness and kurtosis
    skewnessSum += calculateSkewness(sample);
    kurtosisSum += calculateKurtosis(sample);

    // Method 1: Standard t-interval for mean
    const meanInterval = calculateMeanTInterval(sample, confidenceLevel);
    methods.MEAN_T.widths.push(meanInterval.upper - meanInterval.lower);
    if (meanInterval.lower <= trueParameter && meanInterval.upper >= trueParameter) {
      methods.MEAN_T.contains++;
    }

    // Method 2: Trimmed mean interval (simplified - using t-interval on trimmed data)
    const trimmedMean = calculateTrimmedMean(sample);
    const trimmedSample = [...sample].sort((a, b) => a - b);
    const trimCount = Math.floor(sampleSize * 0.1);
    const trimmedData = trimmedSample.slice(trimCount, trimmedSample.length - trimCount);
    const trimmedInterval = calculateMeanTInterval(trimmedData, confidenceLevel);
    methods.TRIMMED_MEAN.widths.push(trimmedInterval.upper - trimmedInterval.lower);
    if (trimmedInterval.lower <= trueParameter && trimmedInterval.upper >= trueParameter) {
      methods.TRIMMED_MEAN.contains++;
    }

    // Method 3: Median interval (using bootstrap percentile method)
    const medianBootstraps = [];
    for (let b = 0; b < 200; b++) {
      const resample = [];
      for (let j = 0; j < sampleSize; j++) {
        resample.push(sample[Math.floor(Math.random() * sampleSize)]);
      }
      resample.sort((a, b) => a - b);
      medianBootstraps.push(resample[Math.floor(resample.length / 2)]);
    }
    medianBootstraps.sort((a, b) => a - b);
    const alpha = 1 - confidenceLevel;
    const lowerIdx = Math.floor(alpha / 2 * 200);
    const upperIdx = Math.ceil((1 - alpha / 2) * 200);
    const medianLower = medianBootstraps[lowerIdx];
    const medianUpper = medianBootstraps[upperIdx];
    methods.MEDIAN.widths.push(medianUpper - medianLower);
    if (medianLower <= trueParameter && medianUpper >= trueParameter) {
      methods.MEDIAN.contains++;
    }

    // Update progress
    if (i % 100 === 0 && onProgress) {
      onProgress((i / numSimulations) * 100);
    }

    // Allow UI updates
    if (i % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Calculate statistics for each method
  const intervalTypes = Object.values(methods).map(method => {
    const coverage = method.contains / numSimulations;
    const meanWidth = method.widths.reduce((sum, w) => sum + w, 0) / numSimulations;
    const coverageError = Math.abs(coverage - confidenceLevel);

    return {
      id: method.id,
      label: method.label,
      coverage: coverage,
      mean_width: meanWidth,
      relative_efficiency: meanWidth / methods.MEAN_T.widths.reduce((sum, w) => sum + w, 0) * numSimulations,
      robustness_score: (1 - coverageError) / (meanWidth / 10) // Higher is better
    };
  });

  // Create distribution histogram
  allSampleValues.sort((a, b) => a - b);
  const numBins = 30;
  const minVal = allSampleValues[0];
  const maxVal = allSampleValues[allSampleValues.length - 1];
  const binWidth = (maxVal - minVal) / numBins;
  const distributionHistogram = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = minVal + i * binWidth;
    const binEnd = binStart + binWidth;
    const binCenter = (binStart + binEnd) / 2;
    const count = allSampleValues.filter(v => v >= binStart && v < binEnd).length;
    const density = count / (allSampleValues.length * binWidth);
    distributionHistogram.push({ x: binCenter, density });
  }

  // Calculate overall distribution statistics
  const observedSkewness = skewnessSum / numSimulations;
  const observedKurtosis = kurtosisSum / numSimulations;

  // Simple normality test based on skewness and kurtosis
  const normalityPassed = Math.abs(observedSkewness) < 1 && Math.abs(observedKurtosis) < 2;
  const normalityPValue = normalityPassed ? 0.15 : 0.01; // Simplified

  // Distribution name
  const distNames = {
    'NORMAL': 'Normal',
    'T': "Student's t",
    'LOGNORMAL': 'Log-normal',
    'GAMMA': 'Gamma',
    'UNIFORM': 'Uniform',
    'BINOMIAL': 'Binomial',
    'POISSON': 'Poisson',
    'MIXTURE': 'Bimodal Mixture'
  };

  return {
    interval_types: intervalTypes,
    distribution_histogram: distributionHistogram,
    true_parameter: trueParameter,
    distribution_name: distNames[distribution] || distribution,
    observed_skewness: observedSkewness,
    observed_kurtosis: observedKurtosis,
    normality_test: {
      passed: normalityPassed,
      p_value: normalityPValue
    }
  };
}
