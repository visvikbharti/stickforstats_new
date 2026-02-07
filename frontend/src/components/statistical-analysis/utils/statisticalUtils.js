// Statistical utility functions for client-side data analysis
import * as ss from 'simple-statistics';
import jStat from 'jstat';

/**
 * Calculate descriptive statistics for a numeric array
 */
export const calculateDescriptiveStats = (data) => {
  if (!data || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => a - b);
  const mean = ss.mean(data);
  const median = ss.median(data);
  const std = ss.standardDeviation(data);
  const variance = ss.variance(data);
  const min = ss.min(data);
  const max = ss.max(data);
  const q1 = ss.quantile(data, 0.25);
  const q3 = ss.quantile(data, 0.75);
  const iqr = q3 - q1;

  // Skewness and kurtosis
  const skewness = ss.sampleSkewness(data);

  // Kurtosis calculation
  const n = data.length;
  const meanCentered = data.map(x => x - mean);
  const m4 = meanCentered.reduce((sum, x) => sum + Math.pow(x, 4), 0) / n;
  const m2 = variance;
  const kurtosis = (m4 / Math.pow(m2, 2)) - 3; // Excess kurtosis

  return {
    count: data.length,
    mean,
    median,
    std,
    variance,
    min,
    max,
    q1,
    q3,
    iqr,
    skewness,
    kurtosis,
    range: max - min
  };
};

/**
 * Perform Shapiro-Wilk normality test approximation
 * Note: This is a simplified version. For large samples, use normal approximation.
 */
export const shapiroWilkTest = (data) => {
  if (!data || data.length < 3 || data.length > 5000) {
    return { statistic: null, pValue: null, isNormal: null };
  }

  // Sort data
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = ss.mean(sorted);

  // Calculate sum of squares
  const ss_total = sorted.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0);

  // Simplified W statistic calculation for small samples
  // This is an approximation - for production, consider server-side calculation
  const b = sorted.reduce((sum, x, i) => {
    const a_i = (i < n/2) ?
      Math.sqrt(n - i) - Math.sqrt(i + 1) :
      Math.sqrt(i + 1) - Math.sqrt(n - i);
    return sum + a_i * x;
  }, 0);

  let W = Math.pow(b, 2) / ss_total;

  // Clamp W to valid range (0, 1) to handle numerical precision issues
  // W should be close to 1 for normal data
  W = Math.max(0.001, Math.min(0.9999, W));

  // Approximate p-value using normal distribution
  const logW = Math.log(1 - W);
  const z = (logW - (-2.273)) / 0.459; // Approximate transformation
  let pValue = 1 - jStat.normal.cdf(Math.abs(z), 0, 1);
  pValue = Math.max(0.001, Math.min(1, pValue * 2)); // Two-tailed, minimum 0.001

  return {
    statistic: W,
    pValue: pValue,
    isNormal: pValue > 0.05
  };
};

/**
 * Anderson-Darling normality test
 */
export const andersonDarlingTest = (data) => {
  if (!data || data.length < 3) {
    return { statistic: null, criticalValues: null };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = ss.mean(sorted);
  const std = ss.standardDeviation(sorted);

  // Standardize data
  const standardized = sorted.map(x => (x - mean) / std);

  // Calculate Anderson-Darling statistic
  let A2 = 0;
  for (let i = 0; i < n; i++) {
    const Fi = jStat.normal.cdf(standardized[i], 0, 1);
    const F_complement = jStat.normal.cdf(standardized[n - 1 - i], 0, 1);
    A2 += (2 * (i + 1) - 1) * (Math.log(Fi) + Math.log(1 - F_complement));
  }
  A2 = -n - A2 / n;

  // Critical values for different significance levels
  const criticalValues = {
    '15%': 1.610,
    '10%': 1.933,
    '5%': 2.492,
    '2.5%': 3.070,
    '1%': 3.857
  };

  // Determine if normal at 5% significance level
  const isNormal = A2 < criticalValues['5%'];

  // Approximate p-value based on critical value comparison
  let pValue;
  if (A2 < criticalValues['15%']) {
    pValue = 0.15 + (criticalValues['15%'] - A2) / criticalValues['15%'] * 0.85;  // > 0.15
  } else if (A2 < criticalValues['10%']) {
    pValue = 0.10 + (criticalValues['10%'] - A2) / (criticalValues['10%'] - criticalValues['15%']) * 0.05;
  } else if (A2 < criticalValues['5%']) {
    pValue = 0.05 + (criticalValues['5%'] - A2) / (criticalValues['5%'] - criticalValues['10%']) * 0.05;
  } else if (A2 < criticalValues['2.5%']) {
    pValue = 0.025 + (criticalValues['2.5%'] - A2) / (criticalValues['2.5%'] - criticalValues['5%']) * 0.025;
  } else if (A2 < criticalValues['1%']) {
    pValue = 0.01 + (criticalValues['1%'] - A2) / (criticalValues['1%'] - criticalValues['2.5%']) * 0.015;
  } else {
    pValue = 0.001;  // Less than 1%
  }

  return {
    statistic: A2,
    pValue: Math.max(0.001, Math.min(1, pValue)),
    criticalValues,
    significanceLevel: Object.entries(criticalValues).find(([_, val]) => A2 < val)?.[0] || '>1%',
    isNormal: isNormal
  };
};

/**
 * One-sample t-test
 */
export const oneSampleTTest = (data, populationMean = 0) => {
  if (!data || data.length < 2) return null;

  const n = data.length;
  const sampleMean = ss.mean(data);
  const sampleStd = ss.standardDeviation(data);
  const standardError = sampleStd / Math.sqrt(n);

  const tStatistic = (sampleMean - populationMean) / standardError;
  const df = n - 1;

  // Two-tailed p-value
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), df));

  return {
    statistic: tStatistic,
    pValue,
    df,
    sampleMean,
    populationMean,
    standardError,
    significant: pValue < 0.05
  };
};

/**
 * Independent samples t-test
 */
export const independentTTest = (group1, group2) => {
  if (!group1 || !group2 || group1.length < 2 || group2.length < 2) return null;

  const n1 = group1.length;
  const n2 = group2.length;
  const mean1 = ss.mean(group1);
  const mean2 = ss.mean(group2);
  const var1 = ss.variance(group1);
  const var2 = ss.variance(group2);

  // Pooled standard deviation
  const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
  const standardError = Math.sqrt(pooledVar * (1/n1 + 1/n2));

  const tStatistic = (mean1 - mean2) / standardError;
  const df = n1 + n2 - 2;

  // Two-tailed p-value
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), df));

  return {
    statistic: tStatistic,
    pValue,
    df,
    mean1,
    mean2,
    meanDifference: mean1 - mean2,
    standardError,
    significant: pValue < 0.05
  };
};

/**
 * Paired samples t-test
 */
export const pairedTTest = (group1, group2) => {
  if (!group1 || !group2 || group1.length !== group2.length || group1.length < 2) {
    return null;
  }

  // Calculate differences
  const differences = group1.map((val, i) => val - group2[i]);

  // Perform one-sample t-test on differences against 0
  return oneSampleTTest(differences, 0);
};

/**
 * One-way ANOVA
 */
export const oneWayANOVA = (groups) => {
  if (!groups || groups.length < 2) return null;

  // Flatten all data
  const allData = groups.flat();
  const grandMean = ss.mean(allData);
  const n = allData.length;
  const k = groups.length;

  // Between-group sum of squares
  let ssBetween = 0;
  groups.forEach(group => {
    const groupMean = ss.mean(group);
    const groupN = group.length;
    ssBetween += groupN * Math.pow(groupMean - grandMean, 2);
  });

  // Within-group sum of squares
  let ssWithin = 0;
  groups.forEach(group => {
    const groupMean = ss.mean(group);
    group.forEach(val => {
      ssWithin += Math.pow(val - groupMean, 2);
    });
  });

  // Degrees of freedom
  const dfBetween = k - 1;
  const dfWithin = n - k;

  // Mean squares
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;

  // F-statistic
  const fStatistic = msBetween / msWithin;

  // P-value
  const pValue = 1 - jStat.centralF.cdf(fStatistic, dfBetween, dfWithin);

  // Effect size (eta-squared)
  const etaSquared = ssBetween / (ssBetween + ssWithin);

  return {
    fStatistic,           // F-statistic
    statistic: fStatistic, // Alias for consistency
    pValue,
    dfb: dfBetween,       // Degrees of freedom between groups
    dfw: dfWithin,        // Degrees of freedom within groups
    dfBetween,            // Keep full name for compatibility
    dfWithin,             // Keep full name for compatibility
    msb: msBetween,       // Mean square between groups
    msw: msWithin,        // Mean square within groups
    msBetween,            // Keep full name for compatibility
    msWithin,             // Keep full name for compatibility
    ssb: ssBetween,       // Sum of squares between groups
    ssw: ssWithin,        // Sum of squares within groups
    ssBetween,            // Keep full name for compatibility
    ssWithin,             // Keep full name for compatibility
    etaSquared,
    significant: pValue < 0.05
  };
};

/**
 * Pearson correlation coefficient
 */
export const pearsonCorrelation = (x, y) => {
  if (!x || !y || x.length !== y.length || x.length < 2) return null;

  const r = ss.sampleCorrelation(x, y);
  const n = x.length;

  // T-statistic for significance test
  const tStatistic = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;

  // Two-tailed p-value
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), df));

  return {
    coefficient: r,
    pValue,
    n,
    significant: pValue < 0.05
  };
};

/**
 * Spearman rank correlation
 */
export const spearmanCorrelation = (x, y) => {
  if (!x || !y || x.length !== y.length || x.length < 2) return null;

  // Convert to ranks
  const rankX = getRanks(x);
  const rankY = getRanks(y);

  // Calculate Pearson correlation on ranks
  return pearsonCorrelation(rankX, rankY);
};

/**
 * Helper function to convert array to ranks
 */
const getRanks = (arr) => {
  const sorted = arr.map((val, idx) => ({ val, idx }))
    .sort((a, b) => a.val - b.val);

  const ranks = new Array(arr.length);
  sorted.forEach((item, rank) => {
    ranks[item.idx] = rank + 1;
  });

  return ranks;
};

/**
 * Linear regression
 */
export const linearRegression = (x, y) => {
  if (!x || !y || x.length !== y.length || x.length < 2) return null;

  // Convert to points format [[x1, y1], [x2, y2], ...] for simple-statistics
  const points = x.map((xi, i) => [xi, y[i]]);
  const regression = ss.linearRegression(points);
  const line = ss.linearRegressionLine(regression);

  // R-squared
  const yMean = ss.mean(y);
  const yPredicted = x.map(xi => line(xi));

  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - yPredicted[i], 2), 0);
  const rSquared = 1 - (ssResidual / ssTotal);

  return {
    slope: regression.m,
    intercept: regression.b,
    rSquared,
    predict: line
  };
};

/**
 * Create histogram bins
 */
export const createHistogramBins = (data, numBins = 20) => {
  if (!data || data.length === 0) return [];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / numBins;

  const bins = Array(numBins).fill(0);
  const binLabels = [];

  data.forEach(val => {
    const binIndex = Math.min(Math.floor((val - min) / binWidth), numBins - 1);
    bins[binIndex]++;
  });

  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    binLabels.push({
      range: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
      midpoint: binStart + binWidth / 2,
      count: bins[i],
      density: bins[i] / (data.length * binWidth)
    });
  }

  return binLabels;
};

/**
 * Mann-Whitney U test (Wilcoxon rank-sum test)
 */
export const mannWhitneyUTest = (group1, group2) => {
  if (!group1 || !group2 || group1.length < 1 || group2.length < 1) return null;

  const n1 = group1.length;
  const n2 = group2.length;

  // Combine and rank all data
  const combined = [
    ...group1.map(val => ({ val, group: 1 })),
    ...group2.map(val => ({ val, group: 2 }))
  ].sort((a, b) => a.val - b.val);

  // Assign ranks
  const ranks = combined.map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Sum of ranks for group 1
  const R1 = ranks.filter(item => item.group === 1)
    .reduce((sum, item) => sum + item.rank, 0);

  // Calculate U statistic
  const U1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - R1;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);

  // Calculate z-score for large samples
  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (U - meanU) / stdU;

  // Two-tailed p-value
  const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));

  return {
    statistic: U,
    zScore: z,
    pValue,
    significant: pValue < 0.05
  };
};

/**
 * Chi-square test of independence
 */
export const chiSquareTest = (observed) => {
  if (!observed || observed.length === 0) return null;

  const rows = observed.length;
  const cols = observed[0].length;

  // Calculate row and column totals
  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = Array(cols).fill(0);
  observed.forEach(row => {
    row.forEach((val, col) => {
      colTotals[col] += val;
    });
  });
  const total = rowTotals.reduce((a, b) => a + b, 0);

  // Calculate expected frequencies and chi-square statistic
  let chiSquare = 0;
  const expected = [];

  for (let i = 0; i < rows; i++) {
    expected[i] = [];
    for (let j = 0; j < cols; j++) {
      const exp = (rowTotals[i] * colTotals[j]) / total;
      expected[i][j] = exp;
      chiSquare += Math.pow(observed[i][j] - exp, 2) / exp;
    }
  }

  // Degrees of freedom
  const df = (rows - 1) * (cols - 1);

  // P-value
  const pValue = 1 - jStat.chisquare.cdf(chiSquare, df);

  // Cramer's V effect size
  const minDim = Math.min(rows - 1, cols - 1);
  const cramersV = Math.sqrt(chiSquare / (total * minDim));

  return {
    statistic: chiSquare,
    pValue,
    df,
    expected,
    cramersV,
    significant: pValue < 0.05
  };
};

/**
 * Kruskal-Wallis H Test
 * Non-parametric alternative to one-way ANOVA for 3+ independent groups
 * Tests if samples originate from the same distribution
 *
 * @param {Object} groups - Object with group names as keys and arrays of values
 * @returns {Object} Test results including H statistic, p-value, and effect size
 */
export const kruskalWallisTest = (groups) => {
  const groupNames = Object.keys(groups);
  const groupArrays = Object.values(groups);

  if (groupNames.length < 2) return null;
  if (groupArrays.some(g => !g || g.length < 1)) return null;

  const k = groupNames.length; // Number of groups
  const N = groupArrays.reduce((sum, g) => sum + g.length, 0); // Total sample size

  // Combine all data with group labels
  const combined = [];
  groupArrays.forEach((values, groupIndex) => {
    values.forEach(val => {
      combined.push({ val, group: groupIndex });
    });
  });

  // Sort and assign ranks
  combined.sort((a, b) => a.val - b.val);

  // Handle ties by averaging ranks
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].val === combined[i].val) {
      j++;
    }
    const avgRank = (i + j + 1) / 2; // Average rank for tied values
    for (let t = i; t < j; t++) {
      combined[t].rank = avgRank;
    }
    i = j;
  }

  // Calculate sum of ranks for each group
  const rankSums = new Array(k).fill(0);
  const groupSizes = groupArrays.map(g => g.length);

  combined.forEach(item => {
    rankSums[item.group] += item.rank;
  });

  // Calculate H statistic
  let sumTerm = 0;
  for (let g = 0; g < k; g++) {
    sumTerm += (rankSums[g] * rankSums[g]) / groupSizes[g];
  }

  const H = (12 / (N * (N + 1))) * sumTerm - 3 * (N + 1);

  // Degrees of freedom
  const df = k - 1;

  // P-value from chi-square distribution
  const pValue = 1 - jStat.chisquare.cdf(H, df);

  // Effect size: Epsilon-squared (η²H)
  const etaSquared = (H - k + 1) / (N - k);

  return {
    statistic: H,
    pValue,
    df,
    etaSquared: Math.max(0, etaSquared), // Ensure non-negative
    groupRankSums: Object.fromEntries(groupNames.map((name, i) => [name, rankSums[i]])),
    groupSizes: Object.fromEntries(groupNames.map((name, i) => [name, groupSizes[i]])),
    significant: pValue < 0.05
  };
};

/**
 * Wilcoxon Signed-Rank Test
 * Non-parametric alternative to paired t-test
 * Tests if the median difference between paired observations is zero
 *
 * @param {Array} sample1 - First set of measurements
 * @param {Array} sample2 - Second set of measurements (paired with sample1)
 * @returns {Object} Test results including W statistic, p-value, and effect size
 */
export const wilcoxonSignedRankTest = (sample1, sample2) => {
  if (!sample1 || !sample2) return null;
  if (sample1.length !== sample2.length) return null;
  if (sample1.length < 2) return null;

  const n = sample1.length;

  // Calculate differences
  const differences = sample1.map((val, i) => ({
    diff: val - sample2[i],
    absDiff: Math.abs(val - sample2[i]),
    sign: Math.sign(val - sample2[i])
  })).filter(d => d.diff !== 0); // Exclude zero differences

  if (differences.length === 0) {
    return {
      statistic: 0,
      pValue: 1,
      zScore: 0,
      effectSize: 0,
      nPairs: n,
      nNonZero: 0,
      significant: false
    };
  }

  const nNonZero = differences.length;

  // Rank absolute differences
  differences.sort((a, b) => a.absDiff - b.absDiff);

  // Handle ties by averaging ranks
  let i = 0;
  while (i < differences.length) {
    let j = i;
    while (j < differences.length && differences[j].absDiff === differences[i].absDiff) {
      j++;
    }
    const avgRank = (i + j + 1) / 2;
    for (let t = i; t < j; t++) {
      differences[t].rank = avgRank;
    }
    i = j;
  }

  // Calculate W+ (sum of ranks for positive differences) and W- (sum of ranks for negative differences)
  let wPlus = 0;
  let wMinus = 0;

  differences.forEach(d => {
    if (d.sign > 0) {
      wPlus += d.rank;
    } else {
      wMinus += d.rank;
    }
  });

  // Test statistic is the smaller of W+ and W-
  const W = Math.min(wPlus, wMinus);

  // For larger samples, use normal approximation
  const meanW = nNonZero * (nNonZero + 1) / 4;
  const stdW = Math.sqrt(nNonZero * (nNonZero + 1) * (2 * nNonZero + 1) / 24);
  const z = (W - meanW) / stdW;

  // Two-tailed p-value
  const pValue = 2 * jStat.normal.cdf(-Math.abs(z), 0, 1);

  // Effect size: r = z / sqrt(n)
  const effectSize = Math.abs(z) / Math.sqrt(nNonZero);

  return {
    statistic: W,
    wPlus,
    wMinus,
    zScore: z,
    pValue,
    effectSize,
    nPairs: n,
    nNonZero,
    significant: pValue < 0.05
  };
};

/**
 * Friedman Test
 * Non-parametric alternative to repeated measures ANOVA
 * Tests if there are differences among multiple repeated measurements
 *
 * @param {Array<Array>} measurements - Array of arrays, each inner array is measurements for one condition
 *                                      All arrays must have the same length (number of subjects)
 * @param {Array<string>} conditionNames - Names of the conditions/treatments
 * @returns {Object} Test results including chi-square statistic, p-value, and effect size
 */
export const friedmanTest = (measurements, conditionNames = null) => {
  if (!measurements || measurements.length < 2) return null;

  const k = measurements.length; // Number of conditions
  const n = measurements[0].length; // Number of subjects

  // Verify all conditions have same number of subjects
  if (measurements.some(m => m.length !== n)) return null;
  if (n < 2) return null;

  // Create condition names if not provided
  const names = conditionNames || measurements.map((_, i) => `Condition ${i + 1}`);

  // Rank within each subject (row)
  const ranks = [];
  for (let subject = 0; subject < n; subject++) {
    // Get values for this subject across all conditions
    const subjectValues = measurements.map((condition, condIdx) => ({
      value: condition[subject],
      conditionIndex: condIdx
    }));

    // Sort by value
    subjectValues.sort((a, b) => a.value - b.value);

    // Assign ranks (handle ties)
    const subjectRanks = new Array(k);
    let i = 0;
    while (i < k) {
      let j = i;
      while (j < k && subjectValues[j].value === subjectValues[i].value) {
        j++;
      }
      const avgRank = (i + j + 1) / 2;
      for (let t = i; t < j; t++) {
        subjectRanks[subjectValues[t].conditionIndex] = avgRank;
      }
      i = j;
    }
    ranks.push(subjectRanks);
  }

  // Calculate sum of ranks for each condition
  const rankSums = new Array(k).fill(0);
  for (let subject = 0; subject < n; subject++) {
    for (let condition = 0; condition < k; condition++) {
      rankSums[condition] += ranks[subject][condition];
    }
  }

  // Calculate mean ranks for each condition
  const meanRanks = rankSums.map(sum => sum / n);

  // Calculate Friedman chi-square statistic
  const sumRankSquared = rankSums.reduce((sum, R) => sum + R * R, 0);
  const chiSquare = (12 / (n * k * (k + 1))) * sumRankSquared - 3 * n * (k + 1);

  // Degrees of freedom
  const df = k - 1;

  // P-value from chi-square distribution
  const pValue = 1 - jStat.chisquare.cdf(chiSquare, df);

  // Effect size: Kendall's W (coefficient of concordance)
  const kendallW = chiSquare / (n * (k - 1));

  return {
    statistic: chiSquare,
    pValue,
    df,
    kendallW: Math.min(1, Math.max(0, kendallW)), // Ensure 0-1 range
    nSubjects: n,
    nConditions: k,
    conditionRankSums: Object.fromEntries(names.map((name, i) => [name, rankSums[i]])),
    conditionMeanRanks: Object.fromEntries(names.map((name, i) => [name, meanRanks[i]])),
    significant: pValue < 0.05
  };
};
