/**
 * Statistical Quality Control (SQC) - Control Chart Calculations
 *
 * Pure functions for control chart calculations, Western Electric rules,
 * process capability analysis, and acceptance sampling.
 *
 * Chart Types Supported:
 * - Variables: X-R, X-S, I-MR
 * - Attributes: p, np, c, u
 * - Advanced: CUSUM, EWMA
 */

// ============================================================
// CONTROL CHART CONSTANTS
// ============================================================

/**
 * Control chart constants for various subgroup sizes
 * Used in X-R and X-S charts
 */
export const CONTROL_CHART_CONSTANTS = {
  2: { A2: 1.880, A3: 2.659, B3: 0, B4: 3.267, D3: 0, D4: 3.267, d2: 1.128, c4: 0.7979 },
  3: { A2: 1.023, A3: 1.954, B3: 0, B4: 2.568, D3: 0, D4: 2.574, d2: 1.693, c4: 0.8862 },
  4: { A2: 0.729, A3: 1.628, B3: 0, B4: 2.266, D3: 0, D4: 2.282, d2: 2.059, c4: 0.9213 },
  5: { A2: 0.577, A3: 1.427, B3: 0, B4: 2.089, D3: 0, D4: 2.114, d2: 2.326, c4: 0.9400 },
  6: { A2: 0.483, A3: 1.287, B3: 0.030, B4: 1.970, D3: 0, D4: 2.004, d2: 2.534, c4: 0.9515 },
  7: { A2: 0.419, A3: 1.182, B3: 0.118, B4: 1.882, D3: 0.076, D4: 1.924, d2: 2.704, c4: 0.9594 },
  8: { A2: 0.373, A3: 1.099, B3: 0.185, B4: 1.815, D3: 0.136, D4: 1.864, d2: 2.847, c4: 0.9650 },
  9: { A2: 0.337, A3: 1.032, B3: 0.239, B4: 1.761, D3: 0.184, D4: 1.816, d2: 2.970, c4: 0.9693 },
  10: { A2: 0.308, A3: 0.975, B3: 0.284, B4: 1.716, D3: 0.223, D4: 1.777, d2: 3.078, c4: 0.9727 },
  15: { A2: 0.223, A3: 0.789, B3: 0.428, B4: 1.572, D3: 0.347, D4: 1.653, d2: 3.472, c4: 0.9823 },
  20: { A2: 0.180, A3: 0.680, B3: 0.510, B4: 1.490, D3: 0.415, D4: 1.585, d2: 3.735, c4: 0.9869 },
  25: { A2: 0.153, A3: 0.606, B3: 0.565, B4: 1.435, D3: 0.459, D4: 1.541, d2: 3.931, c4: 0.9896 }
};

/**
 * Get control chart constants for a given subgroup size
 * Uses interpolation for sizes not in the table
 *
 * @param {number} n - Subgroup size
 * @returns {Object} Control chart constants
 */
export function getControlConstants(n) {
  if (CONTROL_CHART_CONSTANTS[n]) {
    return CONTROL_CHART_CONSTANTS[n];
  }

  // Find nearest sizes for interpolation
  const sizes = Object.keys(CONTROL_CHART_CONSTANTS).map(Number).sort((a, b) => a - b);
  let lower = sizes[0];
  let upper = sizes[sizes.length - 1];

  for (let i = 0; i < sizes.length - 1; i++) {
    if (sizes[i] <= n && n <= sizes[i + 1]) {
      lower = sizes[i];
      upper = sizes[i + 1];
      break;
    }
  }

  // Return nearest if outside range
  if (n < lower) return CONTROL_CHART_CONSTANTS[lower];
  if (n > upper) return CONTROL_CHART_CONSTANTS[upper];

  // Linear interpolation
  const lowerConstants = CONTROL_CHART_CONSTANTS[lower];
  const upperConstants = CONTROL_CHART_CONSTANTS[upper];
  const ratio = (n - lower) / (upper - lower);

  const interpolated = {};
  for (const key in lowerConstants) {
    interpolated[key] = lowerConstants[key] + ratio * (upperConstants[key] - lowerConstants[key]);
  }

  return interpolated;
}

// ============================================================
// X-R CHART CALCULATIONS
// ============================================================

/**
 * Calculate X-bar R chart control limits
 *
 * @param {Array<Array<number>>} data - Subgroups of measurements
 * @returns {Object} Control limits and statistics
 */
export function calculateXbarRLimits(data) {
  const k = data.length; // Number of subgroups
  const n = data[0].length; // Subgroup size

  // Calculate subgroup means and ranges
  const xbars = data.map(subgroup => {
    const sum = subgroup.reduce((a, b) => a + b, 0);
    return sum / subgroup.length;
  });

  const ranges = data.map(subgroup => {
    const max = Math.max(...subgroup);
    const min = Math.min(...subgroup);
    return max - min;
  });

  // Grand average and average range
  const xbarbar = xbars.reduce((a, b) => a + b, 0) / k;
  const rbar = ranges.reduce((a, b) => a + b, 0) / k;

  // Get constants
  const constants = getControlConstants(n);

  // X-bar chart limits
  const xbarUCL = xbarbar + constants.A2 * rbar;
  const xbarCL = xbarbar;
  const xbarLCL = xbarbar - constants.A2 * rbar;

  // R chart limits
  const rUCL = constants.D4 * rbar;
  const rCL = rbar;
  const rLCL = constants.D3 * rbar;

  return {
    xbar: {
      values: xbars,
      ucl: xbarUCL,
      cl: xbarCL,
      lcl: xbarLCL
    },
    r: {
      values: ranges,
      ucl: rUCL,
      cl: rCL,
      lcl: rLCL
    },
    statistics: {
      grandMean: xbarbar,
      avgRange: rbar,
      subgroupSize: n,
      numSubgroups: k
    }
  };
}

// ============================================================
// X-S CHART CALCULATIONS
// ============================================================

/**
 * Calculate X-bar S chart control limits
 *
 * @param {Array<Array<number>>} data - Subgroups of measurements
 * @returns {Object} Control limits and statistics
 */
export function calculateXbarSLimits(data) {
  const k = data.length;
  const n = data[0].length;

  // Calculate subgroup means and standard deviations
  const xbars = data.map(subgroup => {
    const sum = subgroup.reduce((a, b) => a + b, 0);
    return sum / subgroup.length;
  });

  const stdevs = data.map(subgroup => {
    const mean = subgroup.reduce((a, b) => a + b, 0) / subgroup.length;
    const sumSquaredDev = subgroup.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    return Math.sqrt(sumSquaredDev / (subgroup.length - 1));
  });

  // Grand average and average standard deviation
  const xbarbar = xbars.reduce((a, b) => a + b, 0) / k;
  const sbar = stdevs.reduce((a, b) => a + b, 0) / k;

  // Get constants
  const constants = getControlConstants(n);

  // X-bar chart limits
  const xbarUCL = xbarbar + constants.A3 * sbar;
  const xbarCL = xbarbar;
  const xbarLCL = xbarbar - constants.A3 * sbar;

  // S chart limits
  const sUCL = constants.B4 * sbar;
  const sCL = sbar;
  const sLCL = constants.B3 * sbar;

  return {
    xbar: {
      values: xbars,
      ucl: xbarUCL,
      cl: xbarCL,
      lcl: xbarLCL
    },
    s: {
      values: stdevs,
      ucl: sUCL,
      cl: sCL,
      lcl: sLCL
    },
    statistics: {
      grandMean: xbarbar,
      avgStdDev: sbar,
      subgroupSize: n,
      numSubgroups: k
    }
  };
}

// ============================================================
// I-MR CHART CALCULATIONS
// ============================================================

/**
 * Calculate I-MR (Individual-Moving Range) chart control limits
 *
 * @param {Array<number>} data - Individual measurements
 * @param {number} mrSpan - Moving range span (default: 2)
 * @returns {Object} Control limits and statistics
 */
export function calculateIMRLimits(data, mrSpan = 2) {
  const n = data.length;

  // Calculate moving ranges
  const movingRanges = [];
  for (let i = mrSpan - 1; i < n; i++) {
    const window = data.slice(i - mrSpan + 1, i + 1);
    const mr = Math.max(...window) - Math.min(...window);
    movingRanges.push(mr);
  }

  // Average of individuals and moving ranges
  const xbar = data.reduce((a, b) => a + b, 0) / n;
  const mrbar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;

  // Get constants (use mrSpan for subgroup size)
  const constants = getControlConstants(mrSpan);

  // Estimated standard deviation
  const sigma = mrbar / constants.d2;

  // Individual chart limits
  const iUCL = xbar + 3 * sigma;
  const iCL = xbar;
  const iLCL = xbar - 3 * sigma;

  // Moving range chart limits
  const mrUCL = constants.D4 * mrbar;
  const mrCL = mrbar;
  const mrLCL = constants.D3 * mrbar;

  return {
    i: {
      values: data,
      ucl: iUCL,
      cl: iCL,
      lcl: iLCL
    },
    mr: {
      values: movingRanges,
      ucl: mrUCL,
      cl: mrCL,
      lcl: mrLCL
    },
    statistics: {
      mean: xbar,
      avgMovingRange: mrbar,
      estimatedSigma: sigma,
      mrSpan: mrSpan
    }
  };
}

// ============================================================
// P-CHART CALCULATIONS (Proportion Defective)
// ============================================================

/**
 * Calculate p-chart control limits
 *
 * @param {Array<number>} defects - Number of defects in each sample
 * @param {Array<number>} sampleSizes - Size of each sample
 * @returns {Object} Control limits and statistics
 */
export function calculatePChartLimits(defects, sampleSizes) {
  const k = defects.length;

  // Calculate proportions
  const proportions = defects.map((d, i) => d / sampleSizes[i]);

  // Overall proportion (weighted average)
  const totalDefects = defects.reduce((a, b) => a + b, 0);
  const totalSamples = sampleSizes.reduce((a, b) => a + b, 0);
  const pbar = totalDefects / totalSamples;

  // Control limits (variable for each sample size)
  const limits = sampleSizes.map(n => {
    const sigma = Math.sqrt((pbar * (1 - pbar)) / n);
    return {
      ucl: Math.min(1, pbar + 3 * sigma),
      cl: pbar,
      lcl: Math.max(0, pbar - 3 * sigma)
    };
  });

  return {
    values: proportions,
    limits: limits,
    statistics: {
      avgProportion: pbar,
      totalDefects: totalDefects,
      totalSamples: totalSamples
    }
  };
}

// ============================================================
// C-CHART CALCULATIONS (Count of Defects)
// ============================================================

/**
 * Calculate c-chart control limits
 *
 * @param {Array<number>} counts - Count of defects per unit
 * @returns {Object} Control limits and statistics
 */
export function calculateCChartLimits(counts) {
  const n = counts.length;

  // Average count
  const cbar = counts.reduce((a, b) => a + b, 0) / n;

  // Control limits
  const sigma = Math.sqrt(cbar);
  const ucl = cbar + 3 * sigma;
  const cl = cbar;
  const lcl = Math.max(0, cbar - 3 * sigma);

  return {
    values: counts,
    ucl: ucl,
    cl: cl,
    lcl: lcl,
    statistics: {
      avgCount: cbar,
      sigma: sigma
    }
  };
}

// ============================================================
// WESTERN ELECTRIC RULES
// ============================================================

/**
 * Apply Western Electric rules to detect special causes
 *
 * @param {Array<number>} values - Data points
 * @param {number} cl - Center line
 * @param {number} ucl - Upper control limit
 * @param {number} lcl - Lower control limit
 * @returns {Array<Object>} Rule violations
 */
export function applyWesternElectricRules(values, cl, ucl, lcl) {
  const violations = [];
  const n = values.length;

  // Calculate sigma zones
  const sigma = (ucl - cl) / 3;
  const ucl1 = cl + sigma;
  const lcl1 = cl - sigma;
  const ucl2 = cl + 2 * sigma;
  const lcl2 = cl - 2 * sigma;

  // Rule 1: One point beyond 3Ã
  for (let i = 0; i < n; i++) {
    if (values[i] > ucl || values[i] < lcl) {
      violations.push({
        rule: 1,
        description: 'Point beyond control limits',
        points: [i]
      });
    }
  }

  // Rule 2: 9 points in a row on same side of center line
  for (let i = 8; i < n; i++) {
    const subset = values.slice(i - 8, i + 1);
    if (subset.every(v => v > cl) || subset.every(v => v < cl)) {
      violations.push({
        rule: 2,
        description: '9 points on same side of center',
        points: Array.from({ length: 9 }, (_, j) => i - 8 + j)
      });
    }
  }

  // Rule 3: 6 points in a row steadily increasing or decreasing
  for (let i = 5; i < n; i++) {
    let increasing = true;
    let decreasing = true;

    for (let j = i - 4; j < i; j++) {
      if (values[j] >= values[j - 1]) decreasing = false;
      if (values[j] <= values[j - 1]) increasing = false;
    }

    if (increasing || decreasing) {
      violations.push({
        rule: 3,
        description: '6 points trending',
        points: Array.from({ length: 6 }, (_, j) => i - 5 + j)
      });
    }
  }

  // Rule 4: 14 points alternating up and down
  for (let i = 13; i < n; i++) {
    let alternating = true;

    for (let j = i - 12; j < i; j++) {
      const diff1 = values[j] - values[j - 1];
      const diff2 = values[j + 1] - values[j];
      if (diff1 * diff2 >= 0) { // Same direction
        alternating = false;
        break;
      }
    }

    if (alternating) {
      violations.push({
        rule: 4,
        description: '14 points alternating',
        points: Array.from({ length: 14 }, (_, j) => i - 13 + j)
      });
    }
  }

  // Rule 5: 2 out of 3 points beyond 2Ã (same side)
  for (let i = 2; i < n; i++) {
    const subset = values.slice(i - 2, i + 1);
    const aboveCount = subset.filter(v => v > ucl2).length;
    const belowCount = subset.filter(v => v < lcl2).length;

    if (aboveCount >= 2 || belowCount >= 2) {
      violations.push({
        rule: 5,
        description: '2 of 3 beyond 2Ã',
        points: [i - 2, i - 1, i]
      });
    }
  }

  // Rule 6: 4 out of 5 points beyond 1Ã (same side)
  for (let i = 4; i < n; i++) {
    const subset = values.slice(i - 4, i + 1);
    const aboveCount = subset.filter(v => v > ucl1).length;
    const belowCount = subset.filter(v => v < lcl1).length;

    if (aboveCount >= 4 || belowCount >= 4) {
      violations.push({
        rule: 6,
        description: '4 of 5 beyond 1Ã',
        points: Array.from({ length: 5 }, (_, j) => i - 4 + j)
      });
    }
  }

  // Rule 7: 15 points within 1Ã
  for (let i = 14; i < n; i++) {
    const subset = values.slice(i - 14, i + 1);
    if (subset.every(v => v <= ucl1 && v >= lcl1)) {
      violations.push({
        rule: 7,
        description: '15 points within 1Ã',
        points: Array.from({ length: 15 }, (_, j) => i - 14 + j)
      });
    }
  }

  // Rule 8: 8 points beyond 1Ã (either side)
  for (let i = 7; i < n; i++) {
    const subset = values.slice(i - 7, i + 1);
    if (subset.every(v => v > ucl1 || v < lcl1)) {
      violations.push({
        rule: 8,
        description: '8 points beyond 1Ã',
        points: Array.from({ length: 8 }, (_, j) => i - 7 + j)
      });
    }
  }

  return violations;
}

// ============================================================
// PROCESS CAPABILITY INDICES
// ============================================================

/**
 * Calculate process capability indices Cp and Cpk
 *
 * @param {Array<number>} data - Process measurements
 * @param {number} usl - Upper specification limit
 * @param {number} lsl - Lower specification limit
 * @returns {Object} Process capability indices
 */
export function calculateProcessCapability(data, usl, lsl) {
  const n = data.length;

  // Calculate mean and standard deviation
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const sumSquaredDev = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const stdDev = Math.sqrt(sumSquaredDev / (n - 1));

  // Cp: Process capability (potential)
  const cp = (usl - lsl) / (6 * stdDev);

  // Cpk: Process capability index (actual)
  const cpu = (usl - mean) / (3 * stdDev);
  const cpl = (mean - lsl) / (3 * stdDev);
  const cpk = Math.min(cpu, cpl);

  // Pp and Ppk (using overall standard deviation)
  const pp = (usl - lsl) / (6 * stdDev);
  const ppk = Math.min((usl - mean) / (3 * stdDev), (mean - lsl) / (3 * stdDev));

  // Expected defects per million
  const zUpper = (usl - mean) / stdDev;
  const zLower = (mean - lsl) / stdDev;
  const pUpper = normalCDF(-zUpper);
  const pLower = normalCDF(-zLower);
  const dpmo = (pUpper + pLower) * 1000000;

  return {
    cp: cp,
    cpk: cpk,
    cpu: cpu,
    cpl: cpl,
    pp: pp,
    ppk: ppk,
    statistics: {
      mean: mean,
      stdDev: stdDev,
      n: n
    },
    specifications: {
      usl: usl,
      lsl: lsl,
      target: (usl + lsl) / 2
    },
    performance: {
      zUpper: zUpper,
      zLower: zLower,
      dpmo: dpmo,
      yield: (1 - (pUpper + pLower)) * 100
    }
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate cumulative distribution function for standard normal
 *
 * @param {number} z - Z-score
 * @returns {number} Probability
 */
function normalCDF(z) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const erf = 1 - ((a1 * t) + (a2 * t2) + (a3 * t3) + (a4 * t4) + (a5 * t5)) * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * erf);
}

/**
 * Calculate Shewhart individuals control chart limits
 *
 * @param {Array<number>} data - Individual measurements
 * @param {number} k - Number of standard deviations (default: 3)
 * @returns {Object} Control limits
 */
export function calculateShewhartLimits(data, k = 3) {
  const n = data.length;

  // Calculate mean
  const mean = data.reduce((a, b) => a + b, 0) / n;

  // Calculate moving ranges for sigma estimation
  const movingRanges = [];
  for (let i = 1; i < n; i++) {
    movingRanges.push(Math.abs(data[i] - data[i - 1]));
  }

  const mrbar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;
  const sigma = mrbar / 1.128; // d2 for n=2

  return {
    ucl: mean + k * sigma,
    cl: mean,
    lcl: mean - k * sigma,
    sigma: sigma
  };
}

/**
 * Calculate CUSUM (Cumulative Sum) chart values
 *
 * @param {Array<number>} data - Process measurements
 * @param {number} target - Target value (¼0)
 * @param {number} k - Reference value (typically 0.5Ã)
 * @param {number} h - Decision interval (typically 4Ã or 5Ã)
 * @returns {Object} CUSUM chart data
 */
export function calculateCUSUM(data, target, k, h) {
  const n = data.length;
  const cPlus = [];
  const cMinus = [];

  let cpCurrent = 0;
  let cmCurrent = 0;

  for (let i = 0; i < n; i++) {
    cpCurrent = Math.max(0, data[i] - (target + k) + cpCurrent);
    cmCurrent = Math.max(0, (target - k) - data[i] + cmCurrent);

    cPlus.push(cpCurrent);
    cMinus.push(cmCurrent);
  }

  // Detect out-of-control signals
  const signals = [];
  for (let i = 0; i < n; i++) {
    if (cPlus[i] > h) {
      signals.push({ point: i, type: 'upper', value: cPlus[i] });
    }
    if (cMinus[i] > h) {
      signals.push({ point: i, type: 'lower', value: cMinus[i] });
    }
  }

  return {
    cPlus: cPlus,
    cMinus: cMinus,
    signals: signals,
    parameters: {
      target: target,
      k: k,
      h: h
    }
  };
}

/**
 * Calculate EWMA (Exponentially Weighted Moving Average) chart values
 *
 * @param {Array<number>} data - Process measurements
 * @param {number} target - Target value (¼0)
 * @param {number} lambda - Smoothing parameter (0 < » d 1, typically 0.2)
 * @param {number} L - Control limit width (typically 2.7 or 3)
 * @returns {Object} EWMA chart data
 */
export function calculateEWMA(data, target, lambda = 0.2, L = 3) {
  const n = data.length;
  const ewma = [];
  const ucl = [];
  const lcl = [];

  // Estimate sigma from moving ranges
  const movingRanges = [];
  for (let i = 1; i < n; i++) {
    movingRanges.push(Math.abs(data[i] - data[i - 1]));
  }
  const mrbar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;
  const sigma = mrbar / 1.128;

  // Initialize EWMA
  let z = target;

  for (let i = 0; i < n; i++) {
    // Update EWMA
    z = lambda * data[i] + (1 - lambda) * z;
    ewma.push(z);

    // Calculate control limits (they narrow as i increases)
    const sigmaZ = sigma * Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * (i + 1))));
    ucl.push(target + L * sigmaZ);
    lcl.push(target - L * sigmaZ);
  }

  // Detect out-of-control signals
  const signals = [];
  for (let i = 0; i < n; i++) {
    if (ewma[i] > ucl[i] || ewma[i] < lcl[i]) {
      signals.push({ point: i, value: ewma[i] });
    }
  }

  return {
    values: ewma,
    ucl: ucl,
    lcl: lcl,
    cl: target,
    signals: signals,
    parameters: {
      target: target,
      lambda: lambda,
      L: L,
      sigma: sigma
    }
  };
}