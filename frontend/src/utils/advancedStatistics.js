import jStat from 'jstat';

// Advanced Confidence Interval Calculations

export const confidenceIntervalCalculations = {
  // T-distribution CI for mean (unknown variance)
  tDistributionCI: (data, confidenceLevel = 0.95) => {
    const n = data.length;
    const mean = jStat.mean(data);
    const std = jStat.stdev(data, true); // sample standard deviation
    const se = std / Math.sqrt(n);
    const alpha = 1 - confidenceLevel;
    const df = n - 1;
    const tCritical = jStat.studentt.inv(1 - alpha / 2, df);
    
    return {
      mean,
      std,
      se,
      lowerBound: mean - tCritical * se,
      upperBound: mean + tCritical * se,
      marginOfError: tCritical * se,
      method: 'T-Distribution',
      confidenceLevel,
      sampleSize: n,
      degreesOfFreedom: df
    };
  },

  // Z-distribution CI (known variance)
  zDistributionCI: (data, populationStd, confidenceLevel = 0.95) => {
    const n = data.length;
    const mean = jStat.mean(data);
    const se = populationStd / Math.sqrt(n);
    const alpha = 1 - confidenceLevel;
    const zCritical = jStat.normal.inv(1 - alpha / 2, 0, 1);
    
    return {
      mean,
      populationStd,
      se,
      lowerBound: mean - zCritical * se,
      upperBound: mean + zCritical * se,
      marginOfError: zCritical * se,
      method: 'Z-Distribution',
      confidenceLevel,
      sampleSize: n
    };
  },

  // Bootstrap CI (percentile method)
  bootstrapPercentileCI: (data, confidenceLevel = 0.95, numBootstraps = 1000) => {
    const n = data.length;
    const bootstrapMeans = [];
    
    for (let i = 0; i < numBootstraps; i++) {
      const resample = [];
      for (let j = 0; j < n; j++) {
        resample.push(data[Math.floor(Math.random() * n)]);
      }
      bootstrapMeans.push(jStat.mean(resample));
    }
    
    bootstrapMeans.sort((a, b) => a - b);
    const alpha = 1 - confidenceLevel;
    const lowerIndex = Math.floor(alpha / 2 * numBootstraps);
    const upperIndex = Math.floor((1 - alpha / 2) * numBootstraps);
    
    return {
      mean: jStat.mean(data),
      lowerBound: bootstrapMeans[lowerIndex],
      upperBound: bootstrapMeans[upperIndex],
      method: 'Bootstrap Percentile',
      confidenceLevel,
      numBootstraps,
      sampleSize: n,
      bootstrapDistribution: bootstrapMeans
    };
  },

  // Bootstrap BCa (Bias-Corrected and Accelerated)
  bootstrapBCaCI: (data, confidenceLevel = 0.95, numBootstraps = 1000) => {
    const n = data.length;
    const originalMean = jStat.mean(data);
    const bootstrapMeans = [];
    
    // Generate bootstrap samples
    for (let i = 0; i < numBootstraps; i++) {
      const resample = [];
      for (let j = 0; j < n; j++) {
        resample.push(data[Math.floor(Math.random() * n)]);
      }
      bootstrapMeans.push(jStat.mean(resample));
    }
    
    // Calculate bias correction
    const z0 = jStat.normal.inv(
      bootstrapMeans.filter(m => m < originalMean).length / numBootstraps, 0, 1
    );
    
    // Calculate acceleration
    const jackknifeMeans = [];
    for (let i = 0; i < n; i++) {
      const jackknifeSample = data.filter((_, idx) => idx !== i);
      jackknifeMeans.push(jStat.mean(jackknifeSample));
    }
    
    const meanJackknife = jStat.mean(jackknifeMeans);
    const num = jStat.sum(jackknifeMeans.map(m => Math.pow(meanJackknife - m, 3)));
    const den = 6 * Math.pow(jStat.sum(jackknifeMeans.map(m => Math.pow(meanJackknife - m, 2))), 1.5);
    const acceleration = num / den;
    
    // Calculate adjusted percentiles
    const alpha = 1 - confidenceLevel;
    const z_alpha_2 = jStat.normal.inv(alpha / 2, 0, 1);
    const z_1_alpha_2 = jStat.normal.inv(1 - alpha / 2, 0, 1);
    
    const a1 = jStat.normal.cdf(z0 + (z0 + z_alpha_2) / (1 - acceleration * (z0 + z_alpha_2)), 0, 1);
    const a2 = jStat.normal.cdf(z0 + (z0 + z_1_alpha_2) / (1 - acceleration * (z0 + z_1_alpha_2)), 0, 1);
    
    bootstrapMeans.sort((a, b) => a - b);
    
    return {
      mean: originalMean,
      lowerBound: bootstrapMeans[Math.floor(a1 * numBootstraps)],
      upperBound: bootstrapMeans[Math.floor(a2 * numBootstraps)],
      method: 'Bootstrap BCa',
      confidenceLevel,
      numBootstraps,
      sampleSize: n,
      biasCorrection: z0,
      acceleration,
      bootstrapDistribution: bootstrapMeans
    };
  },

  // Binomial proportion CI (Wilson method)
  wilsonCI: (successes, trials, confidenceLevel = 0.95) => {
    const p = successes / trials;
    const alpha = 1 - confidenceLevel;
    const z = jStat.normal.inv(1 - alpha / 2, 0, 1);
    const z2 = z * z;
    
    const denominator = 1 + z2 / trials;
    const centerAdjustment = p + z2 / (2 * trials);
    const marginAdjustment = z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials * trials));
    
    return {
      proportion: p,
      lowerBound: (centerAdjustment - marginAdjustment) / denominator,
      upperBound: (centerAdjustment + marginAdjustment) / denominator,
      method: 'Wilson',
      confidenceLevel,
      successes,
      trials
    };
  },

  // Clopper-Pearson exact CI for proportion
  clopperPearsonCI: (successes, trials, confidenceLevel = 0.95) => {
    const alpha = 1 - confidenceLevel;
    
    let lowerBound, upperBound;
    
    if (successes === 0) {
      lowerBound = 0;
      upperBound = 1 - Math.pow(alpha / 2, 1 / trials);
    } else if (successes === trials) {
      lowerBound = Math.pow(alpha / 2, 1 / trials);
      upperBound = 1;
    } else {
      lowerBound = jStat.beta.inv(alpha / 2, successes, trials - successes + 1);
      upperBound = jStat.beta.inv(1 - alpha / 2, successes + 1, trials - successes);
    }
    
    return {
      proportion: successes / trials,
      lowerBound,
      upperBound,
      method: 'Clopper-Pearson',
      confidenceLevel,
      successes,
      trials
    };
  },

  // Difference of means CI (pooled variance)
  differenceOfMeansCI: (data1, data2, confidenceLevel = 0.95) => {
    const n1 = data1.length;
    const n2 = data2.length;
    const mean1 = jStat.mean(data1);
    const mean2 = jStat.mean(data2);
    const var1 = jStat.variance(data1, true);
    const var2 = jStat.variance(data2, true);
    
    const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
    const df = n1 + n2 - 2;
    const alpha = 1 - confidenceLevel;
    const tCritical = jStat.studentt.inv(1 - alpha / 2, df);
    
    const difference = mean1 - mean2;
    
    return {
      mean1,
      mean2,
      difference,
      lowerBound: difference - tCritical * se,
      upperBound: difference + tCritical * se,
      marginOfError: tCritical * se,
      method: 'Pooled Variance',
      confidenceLevel,
      degreesOfFreedom: df,
      pooledVariance: pooledVar
    };
  },

  // Welch-Satterthwaite CI (unequal variances)
  welchCI: (data1, data2, confidenceLevel = 0.95) => {
    const n1 = data1.length;
    const n2 = data2.length;
    const mean1 = jStat.mean(data1);
    const mean2 = jStat.mean(data2);
    const var1 = jStat.variance(data1, true);
    const var2 = jStat.variance(data2, true);
    
    const se = Math.sqrt(var1 / n1 + var2 / n2);
    
    // Welch-Satterthwaite degrees of freedom
    const num = Math.pow(var1 / n1 + var2 / n2, 2);
    const den = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
    const df = num / den;
    
    const alpha = 1 - confidenceLevel;
    const tCritical = jStat.studentt.inv(1 - alpha / 2, df);
    
    const difference = mean1 - mean2;
    
    return {
      mean1,
      mean2,
      difference,
      lowerBound: difference - tCritical * se,
      upperBound: difference + tCritical * se,
      marginOfError: tCritical * se,
      method: 'Welch-Satterthwaite',
      confidenceLevel,
      degreesOfFreedom: df
    };
  }
};

// Coverage Probability Simulation
export const coverageProbabilitySimulation = (
  trueParam,
  sampleGenerator,
  ciMethod,
  numSimulations = 1000,
  sampleSize = 30,
  confidenceLevel = 0.95
) => {
  let coverageCount = 0;
  const intervals = [];
  const widths = [];
  
  for (let i = 0; i < numSimulations; i++) {
    const sample = sampleGenerator(sampleSize);
    const ci = ciMethod(sample, confidenceLevel);
    
    intervals.push(ci);
    widths.push(ci.upperBound - ci.lowerBound);
    
    if (ci.lowerBound <= trueParam && trueParam <= ci.upperBound) {
      coverageCount++;
    }
  }
  
  return {
    empiricalCoverage: coverageCount / numSimulations,
    theoreticalCoverage: confidenceLevel,
    averageWidth: jStat.mean(widths),
    widthStd: jStat.stdev(widths),
    intervals: intervals.slice(0, 100), // Return first 100 for visualization
    numSimulations,
    sampleSize
  };
};

// Multiple Testing Adjustments
export const multipleTestingAdjustments = {
  // Bonferroni correction
  bonferroni: (pValues, targetAlpha = 0.05) => {
    const m = pValues.length;
    const adjustedAlpha = targetAlpha / m;
    const adjustedPValues = pValues.map(p => Math.min(p * m, 1));
    
    return {
      method: 'Bonferroni',
      adjustedAlpha,
      adjustedPValues,
      rejected: adjustedPValues.map(p => p < targetAlpha)
    };
  },

  // Holm-Bonferroni method
  holmBonferroni: (pValues, targetAlpha = 0.05) => {
    const m = pValues.length;
    const indexed = pValues.map((p, i) => ({ p, index: i }));
    indexed.sort((a, b) => a.p - b.p);
    
    const adjustedPValues = new Array(m);
    const rejected = new Array(m);
    
    for (let i = 0; i < m; i++) {
      const adjustedP = Math.min(indexed[i].p * (m - i), 1);
      adjustedPValues[indexed[i].index] = adjustedP;
      
      if (i === 0 || rejected[indexed[i - 1].index]) {
        rejected[indexed[i].index] = adjustedP < targetAlpha;
      } else {
        rejected[indexed[i].index] = false;
      }
    }
    
    return {
      method: 'Holm-Bonferroni',
      adjustedPValues,
      rejected
    };
  },

  // Benjamini-Hochberg FDR
  benjaminiHochberg: (pValues, targetFDR = 0.05) => {
    const m = pValues.length;
    const indexed = pValues.map((p, i) => ({ p, index: i }));
    indexed.sort((a, b) => a.p - b.p);
    
    const adjustedPValues = new Array(m);
    const rejected = new Array(m).fill(false);
    
    // Find largest i such that P(i) <= (i/m) * FDR
    let maxI = -1;
    for (let i = m - 1; i >= 0; i--) {
      if (indexed[i].p <= ((i + 1) / m) * targetFDR) {
        maxI = i;
        break;
      }
    }
    
    // Reject all hypotheses up to maxI
    for (let i = 0; i <= maxI; i++) {
      rejected[indexed[i].index] = true;
    }
    
    // Calculate adjusted p-values
    for (let i = 0; i < m; i++) {
      adjustedPValues[indexed[i].index] = Math.min(indexed[i].p * m / (i + 1), 1);
    }
    
    return {
      method: 'Benjamini-Hochberg',
      adjustedPValues,
      rejected,
      targetFDR
    };
  }
};

// Distribution Fitting
export const distributionFitting = {
  // Method of Moments estimation
  normalMoM: (data) => {
    return {
      mean: jStat.mean(data),
      std: jStat.stdev(data, true),
      method: 'Method of Moments'
    };
  },

  // Maximum Likelihood Estimation for exponential
  exponentialMLE: (data) => {
    const mean = jStat.mean(data);
    return {
      rate: 1 / mean,
      mean,
      method: 'Maximum Likelihood'
    };
  },

  // Chi-square goodness of fit test
  goodnessOfFit: (observed, expected) => {
    const chiSquare = observed.reduce((sum, obs, i) => {
      return sum + Math.pow(obs - expected[i], 2) / expected[i];
    }, 0);
    
    const df = observed.length - 1;
    const pValue = 1 - jStat.chisquare.cdf(chiSquare, df);
    
    return {
      chiSquare,
      degreesOfFreedom: df,
      pValue,
      reject: pValue < 0.05
    };
  }
};

// Advanced Probability Calculations
export const advancedProbabilityCalculations = {
  // Total Variation Distance
  totalVariationDistance: (pmf1, pmf2) => {
    let tvd = 0;
    const allKeys = new Set([...Object.keys(pmf1), ...Object.keys(pmf2)]);
    
    for (const key of allKeys) {
      tvd += Math.abs((pmf1[key] || 0) - (pmf2[key] || 0));
    }
    
    return tvd / 2;
  },

  // Kullback-Leibler divergence
  klDivergence: (pmf1, pmf2) => {
    let kl = 0;
    
    for (const key in pmf1) {
      if (pmf1[key] > 0 && pmf2[key] > 0) {
        kl += pmf1[key] * Math.log(pmf1[key] / pmf2[key]);
      }
    }
    
    return kl;
  },

  // Poisson approximation to Binomial
  poissonApproximation: (n, p) => {
    const lambda = n * p;
    const useApproximation = n >= 20 && p <= 0.05;
    
    return {
      lambda,
      useApproximation,
      rule: 'n ≥ 20 and p ≤ 0.05',
      quality: useApproximation ? 'Good' : 'Poor'
    };
  },

  // Normal approximation to Binomial
  normalApproximation: (n, p) => {
    const mean = n * p;
    const std = Math.sqrt(n * p * (1 - p));
    const useApproximation = n * p >= 5 && n * (1 - p) >= 5;
    
    return {
      mean,
      std,
      useApproximation,
      rule: 'np ≥ 5 and n(1-p) ≥ 5',
      quality: useApproximation ? 'Good' : 'Poor'
    };
  },

  // Continuity correction for discrete to continuous
  continuityCorrection: (x, adjustment = 0.5) => {
    return {
      lower: x - adjustment,
      upper: x + adjustment,
      explanation: `P(X = ${x}) ≈ P(${x - adjustment} < Y < ${x + adjustment})`
    };
  }
};

// Monte Carlo Integration
export const monteCarloIntegration = (func, lowerBound, upperBound, numSamples = 10000) => {
  let sum = 0;
  const range = upperBound - lowerBound;
  
  for (let i = 0; i < numSamples; i++) {
    const x = lowerBound + Math.random() * range;
    sum += func(x);
  }
  
  const estimate = (sum / numSamples) * range;
  const standardError = Math.sqrt(range * range * jStat.variance(
    Array.from({ length: 1000 }, () => {
      const x = lowerBound + Math.random() * range;
      return func(x);
    })
  ) / numSamples);
  
  return {
    estimate,
    standardError,
    confidenceInterval: {
      lower: estimate - 1.96 * standardError,
      upper: estimate + 1.96 * standardError
    },
    numSamples
  };
};