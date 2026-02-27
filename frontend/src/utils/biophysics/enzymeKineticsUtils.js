/**
 * Enzyme Kinetics Utilities
 *
 * Comprehensive utilities for enzyme kinetics analysis including:
 * - Michaelis-Menten kinetics
 * - Linear transformations (Lineweaver-Burk, Eadie-Hofstee, Hanes-Woolf)
 * - Enzyme inhibition analysis
 * - Hill equation for cooperativity
 *
 * @author StickForStats Team
 * @version 1.0.0
 *
 * References:
 * - Cornish-Bowden, A. (2012). Fundamentals of Enzyme Kinetics. Wiley-Blackwell.
 * - Copeland, R.A. (2000). Enzymes: A Practical Introduction to Structure, Mechanism, and Data Analysis. Wiley-VCH.
 * - Segel, I.H. (1975). Enzyme Kinetics. Wiley-Interscience.
 */

import {
  fitMichaelisMenten,
  fitHill,
  levenbergMarquardt,
  MODELS
} from './nonLinearRegression';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Gas constant in J/(mol·K)
 */
export const R = 8.314;

/**
 * Boltzmann constant in J/K
 */
export const kB = 1.381e-23;

/**
 * Planck constant in J·s
 */
export const h = 6.626e-34;

// ============================================================================
// MICHAELIS-MENTEN ANALYSIS
// ============================================================================

/**
 * Perform complete Michaelis-Menten analysis
 *
 * @param {number[]} substrate - Substrate concentrations [S]
 * @param {number[]} velocity - Reaction velocities v
 * @param {Object} options - Analysis options
 * @returns {Object} Complete analysis results
 */
export function analyzeMichaelisMenten(substrate, velocity, options = {}) {
  // Validate input
  const validation = validateEnzymeData(substrate, velocity);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: validation.warnings };
  }

  // Fit Michaelis-Menten model
  const fit = fitMichaelisMenten(substrate, velocity, options);

  if (!fit.success) {
    return {
      success: false,
      errors: ['Non-linear regression failed to converge'],
      warnings: validation.warnings
    };
  }

  const { Vmax, Km } = fit.parameters;

  // Calculate linear transformations for comparison
  const lineweaverBurk = calculateLineweaverBurk(substrate, velocity);
  const eadieHofstee = calculateEadieHofstee(substrate, velocity);
  const hanesWoolf = calculateHanesWoolf(substrate, velocity);

  // Calculate catalytic efficiency (kcat/Km) if enzyme concentration provided
  let catalyticEfficiency = null;
  if (options.enzymeConcentration) {
    const kcat = Vmax / options.enzymeConcentration;
    catalyticEfficiency = {
      kcat,
      kcatOverKm: kcat / Km,
      unit: 'M⁻¹s⁻¹'
    };
  }

  // Generate curve data for plotting
  const curveData = generateMichaelisMentenCurve(Vmax, Km, substrate);

  return {
    success: true,
    model: 'Michaelis-Menten',
    equation: 'v = (Vmax × [S]) / (Km + [S])',
    parameters: {
      Vmax: {
        value: Vmax,
        error: fit.parameterErrors.Vmax,
        ci95: fit.confidenceIntervals.Vmax,
        unit: options.velocityUnit || 'μmol/min'
      },
      Km: {
        value: Km,
        error: fit.parameterErrors.Km,
        ci95: fit.confidenceIntervals.Km,
        unit: options.concentrationUnit || 'μM'
      }
    },
    statistics: fit.statistics,
    catalyticEfficiency,
    linearTransformations: {
      lineweaverBurk,
      eadieHofstee,
      hanesWoolf
    },
    curveData,
    residuals: fit.residuals,
    warnings: validation.warnings,
    interpretation: interpretMMResults(Vmax, Km, fit.statistics.R2)
  };
}

/**
 * Generate Michaelis-Menten curve data for plotting
 */
export function generateMichaelisMentenCurve(Vmax, Km, substrateData, numPoints = 100) {
  const maxS = Math.max(...substrateData) * 1.2;
  const minS = Math.min(...substrateData.filter(s => s > 0)) * 0.1;

  const curve = [];
  for (let i = 0; i < numPoints; i++) {
    const S = minS + (maxS - minS) * (i / (numPoints - 1));
    const v = (Vmax * S) / (Km + S);
    curve.push({ S, v });
  }

  return curve;
}

/**
 * Interpret Michaelis-Menten results
 */
function interpretMMResults(Vmax, Km, R2) {
  const interpretations = [];

  // Km interpretation
  if (Km < 1) {
    interpretations.push(`Low Km (${Km.toFixed(3)} μM) indicates high substrate affinity`);
  } else if (Km < 100) {
    interpretations.push(`Moderate Km (${Km.toFixed(2)} μM) indicates typical substrate affinity`);
  } else {
    interpretations.push(`High Km (${Km.toFixed(1)} μM) indicates lower substrate affinity`);
  }

  // Fit quality
  if (R2 > 0.99) {
    interpretations.push('Excellent fit (R² > 0.99) - data follows Michaelis-Menten kinetics well');
  } else if (R2 > 0.95) {
    interpretations.push('Good fit (R² > 0.95) - Michaelis-Menten model is appropriate');
  } else if (R2 > 0.90) {
    interpretations.push('Moderate fit (R² > 0.90) - consider cooperative or inhibition models');
  } else {
    interpretations.push('Poor fit (R² < 0.90) - Michaelis-Menten model may not be appropriate');
  }

  return interpretations;
}

// ============================================================================
// LINEAR TRANSFORMATIONS
// ============================================================================

/**
 * Lineweaver-Burk (Double Reciprocal) Plot
 *
 * 1/v = (Km/Vmax) × (1/[S]) + 1/Vmax
 *
 * Historically important but statistically poor due to:
 * - Distortion of error structure
 * - Over-weighting of low substrate points
 *
 * @param {number[]} substrate - Substrate concentrations
 * @param {number[]} velocity - Reaction velocities
 * @returns {Object} Plot data and fitted parameters
 */
export function calculateLineweaverBurk(substrate, velocity) {
  // Filter out zero values
  const validPairs = substrate.map((s, i) => ({ s, v: velocity[i] }))
    .filter(p => p.s > 0 && p.v > 0);

  const x = validPairs.map(p => 1 / p.s); // 1/[S]
  const y = validPairs.map(p => 1 / p.v); // 1/v

  // Linear regression: y = mx + b
  const { slope, intercept, R2 } = linearRegression(x, y);

  // Extract kinetic parameters
  // y-intercept = 1/Vmax => Vmax = 1/intercept
  // slope = Km/Vmax => Km = slope × Vmax
  const Vmax = 1 / intercept;
  const Km = slope * Vmax;

  // Generate line for plotting
  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const xRange = xMax - xMin;

  const line = [
    { x: xMin - xRange * 0.2, y: slope * (xMin - xRange * 0.2) + intercept },
    { x: xMax + xRange * 0.2, y: slope * (xMax + xRange * 0.2) + intercept }
  ];

  // X-intercept = -1/Km
  const xIntercept = -1 / Km;

  return {
    name: 'Lineweaver-Burk',
    equation: '1/v = (Km/Vmax) × (1/[S]) + 1/Vmax',
    xAxis: '1/[S]',
    yAxis: '1/v',
    dataPoints: x.map((xi, i) => ({ x: xi, y: y[i] })),
    line,
    parameters: {
      slope,
      intercept,
      xIntercept,
      Vmax,
      Km,
      R2
    },
    warning: 'Lineweaver-Burk plot distorts error structure. Use non-linear regression for parameter estimation.'
  };
}

/**
 * Eadie-Hofstee Plot
 *
 * v = -Km × (v/[S]) + Vmax
 *
 * Advantages:
 * - Better error distribution than Lineweaver-Burk
 * - Deviations from Michaelis-Menten more visible
 *
 * @param {number[]} substrate - Substrate concentrations
 * @param {number[]} velocity - Reaction velocities
 * @returns {Object} Plot data and fitted parameters
 */
export function calculateEadieHofstee(substrate, velocity) {
  const validPairs = substrate.map((s, i) => ({ s, v: velocity[i] }))
    .filter(p => p.s > 0 && p.v > 0);

  const x = validPairs.map(p => p.v / p.s); // v/[S]
  const y = validPairs.map(p => p.v);        // v

  const { slope, intercept, R2 } = linearRegression(x, y);

  // v = -Km × (v/[S]) + Vmax
  // slope = -Km => Km = -slope
  // intercept = Vmax
  const Km = -slope;
  const Vmax = intercept;

  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const xRange = xMax - xMin;

  const line = [
    { x: xMin - xRange * 0.2, y: slope * (xMin - xRange * 0.2) + intercept },
    { x: xMax + xRange * 0.2, y: slope * (xMax + xRange * 0.2) + intercept }
  ];

  return {
    name: 'Eadie-Hofstee',
    equation: 'v = -Km × (v/[S]) + Vmax',
    xAxis: 'v/[S]',
    yAxis: 'v',
    dataPoints: x.map((xi, i) => ({ x: xi, y: y[i] })),
    line,
    parameters: {
      slope,
      intercept,
      Vmax,
      Km,
      R2
    },
    note: 'Eadie-Hofstee shows deviations from Michaelis-Menten more clearly than Lineweaver-Burk.'
  };
}

/**
 * Hanes-Woolf Plot
 *
 * [S]/v = (1/Vmax) × [S] + Km/Vmax
 *
 * Advantages:
 * - Best error distribution among linear plots
 * - Often preferred over Lineweaver-Burk
 *
 * @param {number[]} substrate - Substrate concentrations
 * @param {number[]} velocity - Reaction velocities
 * @returns {Object} Plot data and fitted parameters
 */
export function calculateHanesWoolf(substrate, velocity) {
  const validPairs = substrate.map((s, i) => ({ s, v: velocity[i] }))
    .filter(p => p.s > 0 && p.v > 0);

  const x = validPairs.map(p => p.s);        // [S]
  const y = validPairs.map(p => p.s / p.v);  // [S]/v

  const { slope, intercept, R2 } = linearRegression(x, y);

  // [S]/v = (1/Vmax) × [S] + Km/Vmax
  // slope = 1/Vmax => Vmax = 1/slope
  // intercept = Km/Vmax => Km = intercept × Vmax
  const Vmax = 1 / slope;
  const Km = intercept * Vmax;

  const xMin = Math.min(...x);
  const xMax = Math.max(...x);
  const xRange = xMax - xMin;

  const line = [
    { x: 0, y: intercept },
    { x: xMax + xRange * 0.2, y: slope * (xMax + xRange * 0.2) + intercept }
  ];

  return {
    name: 'Hanes-Woolf',
    equation: '[S]/v = (1/Vmax) × [S] + Km/Vmax',
    xAxis: '[S]',
    yAxis: '[S]/v',
    dataPoints: x.map((xi, i) => ({ x: xi, y: y[i] })),
    line,
    parameters: {
      slope,
      intercept,
      Vmax,
      Km,
      R2
    },
    note: 'Hanes-Woolf has the best error properties among linear transformations.'
  };
}

/**
 * Simple linear regression
 */
function linearRegression(x, y) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const _sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const SST = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const predicted = x.map(xi => slope * xi + intercept);
  const SSR = y.reduce((sum, yi, i) => sum + Math.pow(yi - predicted[i], 2), 0);
  const R2 = 1 - SSR / SST;

  return { slope, intercept, R2 };
}

// ============================================================================
// HILL EQUATION (COOPERATIVITY)
// ============================================================================

/**
 * Perform Hill equation analysis for cooperative binding
 *
 * v = Vmax × [S]^n / (K0.5^n + [S]^n)
 *
 * @param {number[]} substrate - Substrate concentrations
 * @param {number[]} velocity - Reaction velocities
 * @param {Object} options - Analysis options
 * @returns {Object} Complete analysis results
 */
export function analyzeHill(substrate, velocity, options = {}) {
  const validation = validateEnzymeData(substrate, velocity);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: validation.warnings };
  }

  const fit = fitHill(substrate, velocity, options);

  if (!fit.success) {
    return {
      success: false,
      errors: ['Hill equation fit failed to converge'],
      warnings: validation.warnings
    };
  }

  const { Vmax, K05, n } = fit.parameters;

  // Hill plot data (linearized)
  const hillPlot = calculateHillPlot(substrate, velocity, Vmax);

  // Generate curve
  const curveData = generateHillCurve(Vmax, K05, n, substrate);

  return {
    success: true,
    model: 'Hill Equation',
    equation: 'v = Vmax × [S]ⁿ / (K₀.₅ⁿ + [S]ⁿ)',
    parameters: {
      Vmax: {
        value: Vmax,
        error: fit.parameterErrors.Vmax,
        ci95: fit.confidenceIntervals.Vmax,
        unit: options.velocityUnit || 'μmol/min'
      },
      K05: {
        value: K05,
        error: fit.parameterErrors.K05,
        ci95: fit.confidenceIntervals.K05,
        unit: options.concentrationUnit || 'μM',
        description: 'Substrate concentration at half-maximal velocity'
      },
      n: {
        value: n,
        error: fit.parameterErrors.n,
        ci95: fit.confidenceIntervals.n,
        unit: 'dimensionless',
        description: 'Hill coefficient'
      }
    },
    statistics: fit.statistics,
    hillPlot,
    curveData,
    residuals: fit.residuals,
    warnings: validation.warnings,
    interpretation: interpretHillResults(n, fit.statistics.R2)
  };
}

/**
 * Calculate Hill plot (linearized form)
 *
 * log(v / (Vmax - v)) = n × log[S] - n × log(K0.5)
 */
export function calculateHillPlot(substrate, velocity, Vmax) {
  const validPairs = substrate.map((s, i) => ({ s, v: velocity[i] }))
    .filter(p => p.s > 0 && p.v > 0 && p.v < Vmax);

  const x = validPairs.map(p => Math.log10(p.s));
  const y = validPairs.map(p => Math.log10(p.v / (Vmax - p.v)));

  const { slope, intercept, R2 } = linearRegression(x, y);

  // slope = n (Hill coefficient)
  // intercept = -n × log(K0.5) => K0.5 = 10^(-intercept/n)
  const n = slope;
  const K05 = Math.pow(10, -intercept / n);

  return {
    name: 'Hill Plot',
    equation: 'log(v/(Vmax-v)) = n × log[S] - n × log(K₀.₅)',
    xAxis: 'log[S]',
    yAxis: 'log(v/(Vmax-v))',
    dataPoints: x.map((xi, i) => ({ x: xi, y: y[i] })),
    parameters: {
      slope: n,
      intercept,
      n,
      K05,
      R2
    }
  };
}

/**
 * Generate Hill equation curve
 */
export function generateHillCurve(Vmax, K05, n, substrateData, numPoints = 100) {
  const maxS = Math.max(...substrateData) * 1.2;
  const minS = Math.min(...substrateData.filter(s => s > 0)) * 0.1;

  const curve = [];
  for (let i = 0; i < numPoints; i++) {
    const S = minS + (maxS - minS) * (i / (numPoints - 1));
    const v = (Vmax * Math.pow(S, n)) / (Math.pow(K05, n) + Math.pow(S, n));
    curve.push({ S, v });
  }

  return curve;
}

/**
 * Interpret Hill coefficient results
 */
function interpretHillResults(n, R2) {
  const interpretations = [];

  if (n > 1.1) {
    interpretations.push(`Hill coefficient n = ${n.toFixed(2)} indicates positive cooperativity`);
    interpretations.push('Binding of substrate to one site increases affinity at other sites');
  } else if (n < 0.9) {
    interpretations.push(`Hill coefficient n = ${n.toFixed(2)} indicates negative cooperativity`);
    interpretations.push('Binding of substrate to one site decreases affinity at other sites');
  } else {
    interpretations.push(`Hill coefficient n ≈ 1 (${n.toFixed(2)}) indicates no cooperativity`);
    interpretations.push('Michaelis-Menten kinetics is appropriate');
  }

  if (R2 > 0.98) {
    interpretations.push('Excellent fit - Hill equation describes the data well');
  } else if (R2 > 0.95) {
    interpretations.push('Good fit - Hill equation is appropriate');
  }

  return interpretations;
}

// ============================================================================
// ENZYME INHIBITION
// ============================================================================

/**
 * Inhibition types and their equations
 */
export const INHIBITION_TYPES = {
  competitive: {
    name: 'Competitive Inhibition',
    equation: 'v = Vmax × [S] / (Km × (1 + [I]/Ki) + [S])',
    description: 'Inhibitor competes with substrate for active site',
    effect: {
      Vmax: 'Unchanged',
      Km: 'Increased (apparent Km = Km × (1 + [I]/Ki))'
    },
    lineweaverBurk: 'Lines intersect on y-axis (same 1/Vmax)'
  },
  noncompetitive: {
    name: 'Non-competitive Inhibition',
    equation: 'v = Vmax / (1 + [I]/Ki) × [S] / (Km + [S])',
    description: 'Inhibitor binds to site other than active site, affecting catalysis',
    effect: {
      Vmax: 'Decreased (apparent Vmax = Vmax / (1 + [I]/Ki))',
      Km: 'Unchanged'
    },
    lineweaverBurk: 'Lines intersect on x-axis (same -1/Km)'
  },
  uncompetitive: {
    name: 'Uncompetitive Inhibition',
    equation: 'v = Vmax / (1 + [I]/Ki) × [S] / (Km / (1 + [I]/Ki) + [S])',
    description: 'Inhibitor binds only to enzyme-substrate complex',
    effect: {
      Vmax: 'Decreased',
      Km: 'Decreased'
    },
    lineweaverBurk: 'Parallel lines (same slope Km/Vmax)'
  },
  mixed: {
    name: 'Mixed Inhibition',
    equation: 'v = Vmax / (1 + [I]/Ki\') × [S] / (Km × (1 + [I]/Ki) + [S])',
    description: 'Inhibitor can bind to both free enzyme and ES complex',
    effect: {
      Vmax: 'Decreased',
      Km: 'May increase or decrease depending on α'
    },
    lineweaverBurk: 'Lines intersect in second or third quadrant'
  }
};

/**
 * Competitive inhibition model
 */
export const competitiveInhibitionModel = (S, params, inhibitorConc) => {
  const { Vmax, Km, Ki } = params;
  const KmApp = Km * (1 + inhibitorConc / Ki);
  return (Vmax * S) / (KmApp + S);
};

/**
 * Non-competitive inhibition model
 */
export const noncompetitiveInhibitionModel = (S, params, inhibitorConc) => {
  const { Vmax, Km, Ki } = params;
  const VmaxApp = Vmax / (1 + inhibitorConc / Ki);
  return (VmaxApp * S) / (Km + S);
};

/**
 * Uncompetitive inhibition model
 */
export const uncompetitiveInhibitionModel = (S, params, inhibitorConc) => {
  const { Vmax, Km, Ki } = params;
  const factor = 1 + inhibitorConc / Ki;
  const VmaxApp = Vmax / factor;
  const KmApp = Km / factor;
  return (VmaxApp * S) / (KmApp + S);
};

/**
 * Mixed inhibition model
 */
export const mixedInhibitionModel = (S, params, inhibitorConc) => {
  const { Vmax, Km, Ki, KiPrime } = params;
  const KmApp = Km * (1 + inhibitorConc / Ki);
  const VmaxApp = Vmax / (1 + inhibitorConc / KiPrime);
  return (VmaxApp * S) / (KmApp + S);
};

/**
 * Analyze enzyme inhibition
 */
export function analyzeInhibition(substrate, velocity, inhibitorConcs, velocityData, options = {}) {
  const results = {
    inhibitorConcentrations: inhibitorConcs,
    analyses: [],
    globalFit: null,
    inhibitionType: null,
    Ki: null
  };

  // Analyze each inhibitor concentration separately
  for (let i = 0; i < inhibitorConcs.length; i++) {
    const analysis = analyzeMichaelisMenten(substrate, velocityData[i], options);
    results.analyses.push({
      inhibitorConc: inhibitorConcs[i],
      ...analysis
    });
  }

  // Determine inhibition type from parameter patterns
  if (results.analyses.length >= 2) {
    const params = results.analyses.map(a => ({
      Vmax: a.parameters?.Vmax?.value,
      Km: a.parameters?.Km?.value
    }));

    const VmaxValues = params.map(p => p.Vmax).filter(v => v);
    const KmValues = params.map(p => p.Km).filter(v => v);

    const VmaxCV = calculateCV(VmaxValues);
    const KmCV = calculateCV(KmValues);

    // Classify inhibition type
    if (VmaxCV < 0.1 && KmCV > 0.2) {
      results.inhibitionType = 'competitive';
    } else if (VmaxCV > 0.2 && KmCV < 0.1) {
      results.inhibitionType = 'noncompetitive';
    } else if (VmaxCV > 0.15 && KmCV > 0.15) {
      // Check if Km and Vmax change proportionally
      const firstVmax = VmaxValues[0];
      const lastVmax = VmaxValues[VmaxValues.length - 1];
      const firstKm = KmValues[0];
      const lastKm = KmValues[KmValues.length - 1];

      const VmaxRatio = lastVmax / firstVmax;
      const KmRatio = lastKm / firstKm;

      if (Math.abs(VmaxRatio - KmRatio) < 0.2) {
        results.inhibitionType = 'uncompetitive';
      } else {
        results.inhibitionType = 'mixed';
      }
    }

    results.typeInfo = INHIBITION_TYPES[results.inhibitionType];
  }

  return results;
}

/**
 * Calculate coefficient of variation
 */
function calculateCV(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Calculate Ki using Cheng-Prusoff equation
 *
 * For competitive inhibition with IC50 data:
 * Ki = IC50 / (1 + [S]/Km)
 *
 * @param {number} IC50 - IC50 value
 * @param {number} substrate - Substrate concentration used
 * @param {number} Km - Michaelis constant
 * @returns {number} Ki value
 */
export function calculateKiFromIC50(IC50, substrate, Km) {
  return IC50 / (1 + substrate / Km);
}

// ============================================================================
// SUBSTRATE INHIBITION
// ============================================================================

/**
 * Analyze substrate inhibition
 *
 * v = Vmax × [S] / (Km + [S] × (1 + [S]/Ki))
 *
 * @param {number[]} substrate - Substrate concentrations
 * @param {number[]} velocity - Reaction velocities
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results
 */
export function analyzeSubstrateInhibition(substrate, velocity, options = {}) {
  const validation = validateEnzymeData(substrate, velocity);

  // Initial parameter estimates
  const mmParams = analyzeMichaelisMenten(substrate, velocity);
  const initialParams = {
    Vmax: mmParams.parameters?.Vmax?.value || Math.max(...velocity) * 1.5,
    Km: mmParams.parameters?.Km?.value || substrate[Math.floor(substrate.length / 2)],
    Ki: Math.max(...substrate) * 2 // Start with Ki >> max substrate
  };

  const fit = levenbergMarquardt(
    MODELS.substrateInhibition,
    substrate,
    velocity,
    initialParams,
    {
      parameterBounds: {
        Vmax: { min: 0 },
        Km: { min: 0 },
        Ki: { min: 0 }
      },
      ...options
    }
  );

  if (!fit.success) {
    return {
      success: false,
      errors: ['Substrate inhibition fit failed'],
      warnings: validation.warnings
    };
  }

  const { Vmax, Km, Ki } = fit.parameters;

  // Calculate optimal substrate concentration
  // d(v)/d[S] = 0 => [S]opt = sqrt(Km × Ki)
  const Sopt = Math.sqrt(Km * Ki);
  const Vopt = (Vmax * Sopt) / (Km + Sopt * (1 + Sopt / Ki));

  return {
    success: true,
    model: 'Substrate Inhibition',
    equation: 'v = Vmax × [S] / (Km + [S] × (1 + [S]/Ki))',
    parameters: {
      Vmax: { value: Vmax, error: fit.parameterErrors.Vmax },
      Km: { value: Km, error: fit.parameterErrors.Km },
      Ki: { value: Ki, error: fit.parameterErrors.Ki }
    },
    statistics: fit.statistics,
    optimalSubstrate: {
      Sopt,
      Vopt,
      description: 'Substrate concentration giving maximum velocity'
    },
    warnings: validation.warnings
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate enzyme kinetics data
 */
export function validateEnzymeData(substrate, velocity) {
  const errors = [];
  const warnings = [];

  // Check array lengths
  if (substrate.length !== velocity.length) {
    errors.push('Substrate and velocity arrays must have same length');
  }

  // Check for sufficient data points
  if (substrate.length < 5) {
    warnings.push('Recommend at least 5 data points for reliable fitting');
  }

  // Check for negative values
  if (substrate.some(s => s < 0)) {
    errors.push('Substrate concentrations cannot be negative');
  }
  if (velocity.some(v => v < 0)) {
    warnings.push('Negative velocities detected - check data');
  }

  // Check for zero values
  const zeroSubstrate = substrate.filter(s => s === 0).length;
  if (zeroSubstrate > 0) {
    warnings.push(`${zeroSubstrate} zero substrate values will be excluded from linear plots`);
  }

  // Check substrate concentration range
  const nonZeroSubstrate = substrate.filter(s => s > 0);
  if (nonZeroSubstrate.length > 0) {
    const ratio = Math.max(...nonZeroSubstrate) / Math.min(...nonZeroSubstrate);
    if (ratio < 10) {
      warnings.push('Substrate concentrations should span at least 10-fold range for accurate Km determination');
    }
  }

  // Check if velocity is approaching saturation
  const sortedVelocity = [...velocity].sort((a, b) => b - a);
  const topVelocities = sortedVelocity.slice(0, 3);
  const velocityRange = Math.max(...velocity) - Math.min(...velocity.filter(v => v > 0));
  const topRange = Math.max(...topVelocities) - Math.min(...topVelocities);

  if (topRange / velocityRange < 0.1) {
    // Good - approaching saturation
  } else {
    warnings.push('Data may not reach saturation - Vmax estimate may be unreliable');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// EXPORT
// ============================================================================

const enzymeKineticsUtils = {
  analyzeMichaelisMenten,
  analyzeHill,
  analyzeInhibition,
  analyzeSubstrateInhibition,
  calculateLineweaverBurk,
  calculateEadieHofstee,
  calculateHanesWoolf,
  calculateHillPlot,
  calculateKiFromIC50,
  validateEnzymeData,
  INHIBITION_TYPES
};

export default enzymeKineticsUtils;
