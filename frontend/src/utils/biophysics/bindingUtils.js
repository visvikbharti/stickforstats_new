/**
 * Binding Affinity Utilities
 *
 * Comprehensive utilities for ligand-receptor binding analysis including:
 * - Saturation binding curves (Kd determination)
 * - Scatchard analysis
 * - Dose-response curves (IC50/EC50)
 * - Competition binding
 * - Multi-site binding models
 *
 * @author StickForStats Team
 * @version 1.0.0
 *
 * References:
 * - Hulme, E.C. & Trevethick, M.A. (2010). Ligand binding assays at equilibrium. Br J Pharmacol.
 * - Motulsky, H.J. & Neubig, R.R. (2010). Analyzing binding data. Curr Protoc Neurosci.
 * - Cheng, Y. & Prusoff, W.H. (1973). Relationship between the inhibition constant (Ki)
 *   and the concentration of inhibitor which causes 50% inhibition (IC50). Biochem Pharmacol.
 */

import {
  fitBinding,
  fit4PL,
  levenbergMarquardt,
  MODELS
} from './nonLinearRegression';
import { fSf } from '../../components/statistical-analysis/utils/tails';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Common binding affinity classifications
 */
export const AFFINITY_CLASSIFICATION = {
  picomolar: { range: [1e-12, 1e-9], label: 'Picomolar (pM)', description: 'Extremely high affinity' },
  nanomolar: { range: [1e-9, 1e-6], label: 'Nanomolar (nM)', description: 'High affinity (drug-like)' },
  micromolar: { range: [1e-6, 1e-3], label: 'Micromolar (μM)', description: 'Moderate affinity' },
  millimolar: { range: [1e-3, 1], label: 'Millimolar (mM)', description: 'Low affinity' }
};

// ============================================================================
// SATURATION BINDING ANALYSIS
// ============================================================================

/**
 * Perform complete saturation binding analysis
 *
 * One-site binding: B = Bmax × [L] / (Kd + [L])
 *
 * @param {number[]} ligand - Ligand concentrations [L]
 * @param {number[]} bound - Bound ligand concentrations or binding signal
 * @param {Object} options - Analysis options
 * @returns {Object} Complete analysis results
 */
export function analyzeSaturationBinding(ligand, bound, options = {}) {
  const validation = validateBindingData(ligand, bound);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: validation.warnings };
  }

  // Try one-site binding first
  const oneSiteFit = fitBinding(ligand, bound, options);

  // Calculate Scatchard plot
  const scatchard = calculateScatchard(ligand, bound, oneSiteFit.parameters?.Bmax);

  // Generate binding curve
  const curveData = generateBindingCurve(
    oneSiteFit.parameters.Bmax,
    oneSiteFit.parameters.Kd,
    ligand
  );

  // Try two-site binding for comparison if sufficient data
  let twoSiteFit = null;
  let modelComparison = null;

  if (ligand.length >= 8 && options.compareTwoSite !== false) {
    twoSiteFit = fitTwoSiteBinding(ligand, bound, options);

    if (twoSiteFit.success) {
      modelComparison = compareBindingModels(oneSiteFit, twoSiteFit, ligand.length);
    }
  }

  // Calculate free ligand if total ligand provided
  let freeLigand = null;
  if (options.totalLigand) {
    freeLigand = options.totalLigand.map((total, i) => total - bound[i]);
  }

  return {
    success: oneSiteFit.success,
    model: 'One-Site Specific Binding',
    equation: 'B = Bmax × [L] / (Kd + [L])',
    parameters: {
      Bmax: {
        value: oneSiteFit.parameters.Bmax,
        error: oneSiteFit.parameterErrors.Bmax,
        ci95: oneSiteFit.confidenceIntervals.Bmax,
        unit: options.bindingUnit || 'fmol/mg protein',
        description: 'Maximum specific binding capacity'
      },
      Kd: {
        value: oneSiteFit.parameters.Kd,
        error: oneSiteFit.parameterErrors.Kd,
        ci95: oneSiteFit.confidenceIntervals.Kd,
        unit: options.concentrationUnit || 'nM',
        description: 'Equilibrium dissociation constant'
      }
    },
    derivedParameters: {
      Ka: {
        value: 1 / oneSiteFit.parameters.Kd,
        unit: options.concentrationUnit ? `${options.concentrationUnit}⁻¹` : 'nM⁻¹',
        description: 'Association constant (1/Kd)'
      }
    },
    statistics: oneSiteFit.statistics,
    scatchard,
    curveData,
    freeLigand,
    twoSiteFit: twoSiteFit?.success ? {
      parameters: twoSiteFit.parameters,
      statistics: twoSiteFit.statistics
    } : null,
    modelComparison,
    residuals: oneSiteFit.residuals,
    warnings: validation.warnings,
    interpretation: interpretBindingResults(oneSiteFit.parameters.Kd, oneSiteFit.statistics.R2)
  };
}

/**
 * Fit two-site binding model
 *
 * B = Bmax1 × [L] / (Kd1 + [L]) + Bmax2 × [L] / (Kd2 + [L])
 */
export function fitTwoSiteBinding(ligand, bound, options = {}) {
  // Estimate initial parameters
  const oneSite = fitBinding(ligand, bound);
  const Bmax = oneSite.parameters.Bmax;
  const Kd = oneSite.parameters.Kd;

  const initialParams = {
    Bmax1: Bmax * 0.5,
    Kd1: Kd * 0.1,  // High affinity site
    Bmax2: Bmax * 0.5,
    Kd2: Kd * 10    // Low affinity site
  };

  return levenbergMarquardt(
    MODELS.twosite_binding,
    ligand,
    bound,
    initialParams,
    {
      parameterBounds: {
        Bmax1: { min: 0 },
        Kd1: { min: 0 },
        Bmax2: { min: 0 },
        Kd2: { min: 0 }
      },
      ...options
    }
  );
}

/**
 * Compare one-site vs two-site binding models
 */
export function compareBindingModels(oneSiteFit, twoSiteFit, n) {
  const AIC1 = oneSiteFit.statistics.AIC;
  const AIC2 = twoSiteFit.statistics.AIC;
  const BIC1 = oneSiteFit.statistics.BIC;
  const BIC2 = twoSiteFit.statistics.BIC;

  // F-test for nested models
  const RSS1 = oneSiteFit.residuals.reduce((sum, r) => sum + r * r, 0);
  const RSS2 = twoSiteFit.residuals.reduce((sum, r) => sum + r * r, 0);
  const df1 = n - 2; // one-site has 2 parameters
  const df2 = n - 4; // two-site has 4 parameters

  const Fstat = ((RSS1 - RSS2) / (df1 - df2)) / (RSS2 / df2);
  // The F-test p-value is the UPPER tail, computed as an upper tail.
  //
  // This was `1 - fDistributionCDF(...)`, where fDistributionCDF called a hand-rolled
  // `incompleteBeta` that was the Numerical Recipes continued fraction WITH THE SYMMETRY
  // SWAP REMOVED. NR only evaluates that fraction for x < (a+1)/(a+b+2) and otherwise uses
  // 1 - I(1-x, b, a); applied unconditionally it diverges. The result was a p-value that
  // could come out NEGATIVE:
  //
  //     F = 100, df = (2, 20)  ->  rendered "p = -6.62e-7"   (truth: 3.86e-11)
  //
  // and that negative number then drove the model-selection decision below, and was printed
  // to the user as "Two-site model significantly better (F-test p = -6.62e-7)".
  const pValue = fSf(Fstat, df1 - df2, df2);

  // Determine preferred model
  let preferredModel = 'one-site';
  let reason = '';

  if (AIC2 < AIC1 - 2 && pValue < 0.05) {
    preferredModel = 'two-site';
    reason = `Two-site model significantly better (F-test p = ${pValue.toExponential(2)}, ΔAIC = ${(AIC1 - AIC2).toFixed(1)})`;
  } else if (AIC2 < AIC1 - 2) {
    preferredModel = 'two-site (tentative)';
    reason = `Two-site has lower AIC but F-test not significant (p = ${pValue.toExponential(2)})`;
  } else {
    reason = `One-site model adequate (ΔAIC = ${(AIC2 - AIC1).toFixed(1)})`;
  }

  return {
    oneSite: { AIC: AIC1, BIC: BIC1, RSS: RSS1 },
    twoSite: { AIC: AIC2, BIC: BIC2, RSS: RSS2 },
    fTest: { Fstat, df1: df1 - df2, df2, pValue },
    preferredModel,
    reason
  };
}

/**
 * Generate binding curve for plotting
 */
export function generateBindingCurve(Bmax, Kd, ligandData, numPoints = 100) {
  const maxL = Math.max(...ligandData) * 1.2;
  const minL = Math.min(...ligandData.filter(l => l > 0)) * 0.1;

  const curve = [];
  for (let i = 0; i < numPoints; i++) {
    const L = minL + (maxL - minL) * (i / (numPoints - 1));
    const B = (Bmax * L) / (Kd + L);
    curve.push({ L, B });
  }

  return curve;
}

// ============================================================================
// SCATCHARD ANALYSIS
// ============================================================================

/**
 * Calculate Scatchard plot data
 *
 * Bound/Free = (Bmax - Bound) / Kd
 *
 * Linear transformation:
 * B/F = Bmax/Kd - B/Kd
 *
 * Slope = -1/Kd
 * X-intercept = Bmax
 * Y-intercept = Bmax/Kd
 *
 * @param {number[]} ligand - Free ligand concentrations [L] (or total if similar to free)
 * @param {number[]} bound - Bound ligand
 * @param {number} Bmax - Maximum binding (from non-linear fit)
 * @returns {Object} Scatchard plot data
 */
export function calculateScatchard(ligand, bound, Bmax) {
  // Filter valid points (B > 0, F > 0, B < Bmax)
  const validPairs = ligand.map((L, i) => ({
    free: L - bound[i] > 0 ? L - bound[i] : L, // Use total as approx if free not calculated
    bound: bound[i]
  })).filter(p => p.free > 0 && p.bound > 0 && p.bound < Bmax);

  const x = validPairs.map(p => p.bound);                    // Bound
  const y = validPairs.map(p => p.bound / p.free);           // Bound/Free

  // Linear regression
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Extract parameters
  // slope = -1/Kd => Kd = -1/slope
  // y-intercept = Bmax/Kd => Bmax = intercept * Kd
  const KdScatchard = -1 / slope;
  const BmaxScatchard = intercept * KdScatchard;

  // X-intercept (where y = 0)
  const xIntercept = -intercept / slope;

  // Generate line for plotting
  const line = [
    { x: 0, y: intercept },
    { x: xIntercept, y: 0 }
  ];

  return {
    name: 'Scatchard Plot',
    equation: 'B/F = Bmax/Kd - B/Kd',
    xAxis: 'Bound',
    yAxis: 'Bound/Free',
    dataPoints: x.map((xi, i) => ({ x: xi, y: y[i] })),
    line,
    parameters: {
      slope,
      intercept,
      xIntercept,
      Kd: KdScatchard,
      Bmax: BmaxScatchard
    },
    warning: 'Scatchard analysis distorts error structure. Use non-linear regression for parameter estimation. ' +
             'Curvilinear Scatchard plots may indicate cooperativity, multiple binding sites, or non-specific binding.'
  };
}

// ============================================================================
// DOSE-RESPONSE ANALYSIS
// ============================================================================

/**
 * Perform dose-response (IC50/EC50) analysis
 *
 * Four-parameter logistic model:
 * Y = Bottom + (Top - Bottom) / (1 + 10^((LogIC50 - X) × HillSlope))
 *
 * @param {number[]} concentration - Drug/ligand concentrations (linear scale)
 * @param {number[]} response - Measured response (% activity, binding, etc.)
 * @param {Object} options - Analysis options
 * @returns {Object} Complete analysis results
 */
export function analyzeDoseResponse(concentration, response, options = {}) {
  const validation = validateDoseResponseData(concentration, response);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: validation.warnings };
  }

  // Convert to log scale
  const logConc = concentration.map(c => Math.log10(c));

  // Fit 4PL model
  const fit = fit4PL(logConc, response, options);

  if (!fit.success) {
    return {
      success: false,
      errors: ['Dose-response fit failed to converge'],
      warnings: validation.warnings
    };
  }

  const { Bottom, Top, LogIC50, HillSlope } = fit.parameters;

  // Convert LogIC50 to IC50
  const IC50 = Math.pow(10, LogIC50);

  // Calculate EC/IC values at different levels
  const effectLevels = calculateEffectLevels(Bottom, Top, LogIC50, HillSlope);

  // Generate curve
  const curveData = generateDoseResponseCurve(Bottom, Top, LogIC50, HillSlope, logConc);

  // Determine if inhibition or stimulation
  const isInhibition = Top > Bottom;
  const _parameterName = isInhibition ? 'IC50' : 'EC50';

  return {
    success: true,
    model: 'Four-Parameter Logistic (4PL)',
    equation: 'Y = Bottom + (Top - Bottom) / (1 + 10^((LogIC50 - X) × HillSlope))',
    type: isInhibition ? 'Inhibition' : 'Stimulation',
    parameters: {
      IC50: {
        value: IC50,
        logValue: LogIC50,
        error: fit.parameterErrors.LogIC50 ? Math.pow(10, LogIC50) * Math.log(10) * fit.parameterErrors.LogIC50 : null,
        ci95: fit.confidenceIntervals.LogIC50 ? {
          lower: Math.pow(10, fit.confidenceIntervals.LogIC50.lower),
          upper: Math.pow(10, fit.confidenceIntervals.LogIC50.upper)
        } : null,
        unit: options.concentrationUnit || 'nM',
        description: `Concentration producing 50% ${isInhibition ? 'inhibition' : 'effect'}`
      },
      HillSlope: {
        value: HillSlope,
        error: fit.parameterErrors.HillSlope,
        ci95: fit.confidenceIntervals.HillSlope,
        unit: 'dimensionless',
        description: 'Slope factor (steepness of curve)'
      },
      Top: {
        value: Top,
        error: fit.parameterErrors.Top,
        ci95: fit.confidenceIntervals.Top,
        unit: options.responseUnit || '%',
        description: 'Response at zero drug (baseline)'
      },
      Bottom: {
        value: Bottom,
        error: fit.parameterErrors.Bottom,
        ci95: fit.confidenceIntervals.Bottom,
        unit: options.responseUnit || '%',
        description: 'Response at infinite drug concentration'
      }
    },
    effectLevels,
    statistics: fit.statistics,
    curveData,
    residuals: fit.residuals,
    warnings: validation.warnings,
    interpretation: interpretDoseResponseResults(IC50, HillSlope, fit.statistics.R2, isInhibition)
  };
}

/**
 * Calculate effect concentrations at different levels
 */
export function calculateEffectLevels(Bottom, Top, LogIC50, HillSlope) {
  const levels = [10, 20, 50, 80, 90];
  const results = {};

  for (const level of levels) {
    // Y = Bottom + (Top - Bottom) × F where F is fraction
    // For inhibition curves (Top > Bottom): F = 1 - level/100
    // For stimulation curves (Top < Bottom): F = level/100
    const fraction = (Top > Bottom) ? (100 - level) / 100 : level / 100;

    // Solve for X (log concentration)
    // F = 1 / (1 + 10^((LogIC50 - X) × HillSlope))
    // 10^((LogIC50 - X) × HillSlope) = (1 - F) / F
    // LogIC50 - X = log((1-F)/F) / HillSlope
    // X = LogIC50 - log((1-F)/F) / HillSlope

    const logEC = LogIC50 - Math.log10((1 - fraction) / fraction) / HillSlope;
    const EC = Math.pow(10, logEC);

    const name = (Top > Bottom) ? `IC${level}` : `EC${level}`;
    results[name] = {
      value: EC,
      logValue: logEC,
      description: `Concentration producing ${level}% ${Top > Bottom ? 'inhibition' : 'effect'}`
    };
  }

  return results;
}

/**
 * Generate dose-response curve for plotting
 */
export function generateDoseResponseCurve(Bottom, Top, LogIC50, HillSlope, logConcData, numPoints = 100) {
  const maxLogC = Math.max(...logConcData) + 1;
  const minLogC = Math.min(...logConcData) - 1;

  const curve = [];
  for (let i = 0; i < numPoints; i++) {
    const logC = minLogC + (maxLogC - minLogC) * (i / (numPoints - 1));
    const C = Math.pow(10, logC);
    const Y = Bottom + (Top - Bottom) / (1 + Math.pow(10, (LogIC50 - logC) * HillSlope));
    curve.push({ concentration: C, logConcentration: logC, response: Y });
  }

  return curve;
}

/**
 * Interpret dose-response results
 */
function interpretDoseResponseResults(IC50, HillSlope, R2, isInhibition) {
  const interpretations = [];
  const paramName = isInhibition ? 'IC50' : 'EC50';

  // Potency interpretation
  if (IC50 < 1e-9) {
    interpretations.push(`Very high potency (${paramName} in picomolar range)`);
  } else if (IC50 < 1e-6) {
    interpretations.push(`High potency (${paramName} in nanomolar range - drug-like)`);
  } else if (IC50 < 1e-3) {
    interpretations.push(`Moderate potency (${paramName} in micromolar range)`);
  } else {
    interpretations.push(`Low potency (${paramName} in millimolar range)`);
  }

  // Hill slope interpretation
  if (Math.abs(HillSlope) < 0.5) {
    interpretations.push(`Very shallow curve (Hill slope = ${HillSlope.toFixed(2)}) - may indicate multiple mechanisms`);
  } else if (Math.abs(HillSlope) > 0.8 && Math.abs(HillSlope) < 1.2) {
    interpretations.push(`Hill slope ≈ 1 (${HillSlope.toFixed(2)}) - consistent with simple binding`);
  } else if (Math.abs(HillSlope) > 1.5) {
    interpretations.push(`Steep curve (Hill slope = ${HillSlope.toFixed(2)}) - may indicate positive cooperativity`);
  }

  // Fit quality
  if (R2 > 0.98) {
    interpretations.push('Excellent fit to 4PL model');
  } else if (R2 > 0.95) {
    interpretations.push('Good fit to 4PL model');
  } else if (R2 < 0.90) {
    interpretations.push('Consider alternative models or check data quality');
  }

  return interpretations;
}

// ============================================================================
// COMPETITION BINDING
// ============================================================================

/**
 * Analyze competition binding to determine Ki
 *
 * Uses Cheng-Prusoff equation:
 * Ki = IC50 / (1 + [L]/Kd)
 *
 * @param {number[]} competitor - Competitor concentrations
 * @param {number[]} binding - Specific binding (% or absolute)
 * @param {Object} conditions - Experimental conditions
 * @returns {Object} Competition analysis results
 */
export function analyzeCompetitionBinding(competitor, binding, conditions) {
  const { radioligandConc, radioligandKd, hotLigandConc, hotLigandKd } = conditions;

  // First, fit dose-response to get IC50
  const doseResponse = analyzeDoseResponse(competitor, binding, {
    ...conditions,
    concentrationUnit: conditions.competitorUnit || 'nM'
  });

  if (!doseResponse.success) {
    return {
      success: false,
      errors: doseResponse.errors,
      warnings: doseResponse.warnings
    };
  }

  const IC50 = doseResponse.parameters.IC50.value;

  // Calculate Ki using Cheng-Prusoff equation
  let Ki = null;
  let KiMethod = null;

  if (radioligandConc && radioligandKd) {
    // Standard Cheng-Prusoff
    Ki = IC50 / (1 + radioligandConc / radioligandKd);
    KiMethod = 'Cheng-Prusoff';
  } else if (hotLigandConc && hotLigandKd) {
    // Alternative nomenclature
    Ki = IC50 / (1 + hotLigandConc / hotLigandKd);
    KiMethod = 'Cheng-Prusoff';
  }

  // Calculate error propagation for Ki if available
  let KiError = null;
  if (Ki && doseResponse.parameters.IC50.error && radioligandKd) {
    const IC50Error = doseResponse.parameters.IC50.error;
    const relativeError = IC50Error / IC50;
    KiError = Ki * relativeError; // Simplified error propagation
  }

  return {
    success: true,
    model: 'Competition Binding',
    IC50: doseResponse.parameters.IC50,
    Ki: Ki ? {
      value: Ki,
      error: KiError,
      unit: conditions.competitorUnit || 'nM',
      method: KiMethod,
      equation: 'Ki = IC50 / (1 + [L]/Kd)'
    } : null,
    conditions: {
      radioligandConc,
      radioligandKd
    },
    doseResponse,
    interpretation: interpretCompetitionResults(Ki, IC50)
  };
}

/**
 * Interpret competition binding results
 */
function interpretCompetitionResults(Ki, IC50) {
  const interpretations = [];

  if (Ki) {
    if (Ki < IC50 * 0.5) {
      interpretations.push('Ki << IC50: High radioligand occupancy - Ki more accurate than IC50');
    } else if (Ki > IC50 * 0.9) {
      interpretations.push('Ki ≈ IC50: Low radioligand occupancy');
    }

    // Affinity classification
    const classification = classifyAffinity(Ki);
    interpretations.push(`Competitor affinity: ${classification.description}`);
  }

  return interpretations;
}

/**
 * Classify affinity based on Kd or Ki value
 */
export function classifyAffinity(value) {
  for (const [key, data] of Object.entries(AFFINITY_CLASSIFICATION)) {
    if (value >= data.range[0] && value < data.range[1]) {
      return { class: key, ...data };
    }
  }
  return { class: 'unknown', label: 'Unknown', description: 'Outside typical range' };
}

// ============================================================================
// BINDING WITH HILL COEFFICIENT
// ============================================================================

/**
 * Analyze binding with Hill coefficient for cooperativity
 *
 * B = Bmax × [L]^h / (Kd^h + [L]^h)
 *
 * @param {number[]} ligand - Ligand concentrations
 * @param {number[]} bound - Bound ligand
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results
 */
export function analyzeBindingWithHill(ligand, bound, options = {}) {
  const validation = validateBindingData(ligand, bound);

  // Initial parameter estimates
  const simpleBinding = fitBinding(ligand, bound);

  const initialParams = {
    Bmax: simpleBinding.parameters.Bmax,
    Kd: simpleBinding.parameters.Kd,
    h: 1 // Start with no cooperativity
  };

  const fit = levenbergMarquardt(
    MODELS.binding_hill,
    ligand,
    bound,
    initialParams,
    {
      parameterBounds: {
        Bmax: { min: 0 },
        Kd: { min: 0 },
        h: { min: 0.1, max: 10 }
      },
      ...options
    }
  );

  if (!fit.success) {
    return {
      success: false,
      errors: ['Hill binding fit failed'],
      warnings: validation.warnings
    };
  }

  const { Bmax, Kd, h } = fit.parameters;

  // Compare with simple binding model
  const aicSimple = simpleBinding.statistics.AIC;
  const aicHill = fit.statistics.AIC;
  const hillBetter = aicHill < aicSimple - 2;

  return {
    success: true,
    model: 'Binding with Hill Coefficient',
    equation: 'B = Bmax × [L]ʰ / (Kdʰ + [L]ʰ)',
    parameters: {
      Bmax: { value: Bmax, error: fit.parameterErrors.Bmax },
      Kd: { value: Kd, error: fit.parameterErrors.Kd, description: 'Apparent dissociation constant' },
      h: {
        value: h,
        error: fit.parameterErrors.h,
        description: 'Hill coefficient'
      }
    },
    statistics: fit.statistics,
    modelComparison: {
      simpleBindingAIC: aicSimple,
      hillBindingAIC: aicHill,
      hillBetter,
      recommendation: hillBetter ?
        'Hill model preferred - indicates cooperativity' :
        'Simple binding model adequate'
    },
    interpretation: interpretHillBindingResults(h, hillBetter),
    warnings: validation.warnings
  };
}

/**
 * Interpret Hill binding results
 */
function interpretHillBindingResults(h, hillBetter) {
  const interpretations = [];

  if (!hillBetter) {
    interpretations.push('Simple binding model is adequate - no significant cooperativity detected');
    return interpretations;
  }

  if (h > 1.1) {
    interpretations.push(`Positive cooperativity (h = ${h.toFixed(2)} > 1)`);
    interpretations.push('Binding to one site increases affinity at other sites');
  } else if (h < 0.9) {
    interpretations.push(`Negative cooperativity (h = ${h.toFixed(2)} < 1)`);
    interpretations.push('Binding to one site decreases affinity at other sites');
  } else {
    interpretations.push(`No significant cooperativity (h ≈ 1)`);
  }

  return interpretations;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate binding data
 */
export function validateBindingData(ligand, bound) {
  const errors = [];
  const warnings = [];

  if (ligand.length !== bound.length) {
    errors.push('Ligand and bound arrays must have same length');
  }

  if (ligand.length < 5) {
    warnings.push('Recommend at least 5 data points for reliable Kd determination');
  }

  if (ligand.some(l => l < 0)) {
    errors.push('Ligand concentrations cannot be negative');
  }

  if (bound.some(b => b < 0)) {
    warnings.push('Negative binding values detected - check for non-specific binding subtraction');
  }

  // Check concentration range
  const nonZeroLigand = ligand.filter(l => l > 0);
  if (nonZeroLigand.length > 0) {
    const ratio = Math.max(...nonZeroLigand) / Math.min(...nonZeroLigand);
    if (ratio < 100) {
      warnings.push('Ligand concentrations should span at least 100-fold range for accurate Kd determination');
    }
  }

  // Check for saturation
  const sortedBound = [...bound].sort((a, b) => b - a);
  const topValues = sortedBound.slice(0, 3);
  const maxBound = Math.max(...bound);
  const minBound = Math.min(...bound.filter(b => b > 0));
  const range = maxBound - minBound;

  if (topValues.length >= 3) {
    const topRange = Math.max(...topValues) - Math.min(...topValues);
    if (topRange / range > 0.2) {
      warnings.push('Binding may not reach saturation - Bmax estimate may be unreliable');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate dose-response data
 */
export function validateDoseResponseData(concentration, response) {
  const errors = [];
  const warnings = [];

  if (concentration.length !== response.length) {
    errors.push('Concentration and response arrays must have same length');
  }

  if (concentration.length < 6) {
    warnings.push('Recommend at least 6 data points for reliable IC50 determination');
  }

  if (concentration.some(c => c <= 0)) {
    errors.push('All concentrations must be positive (non-zero) for log transformation');
  }

  // Check concentration range
  const ratio = Math.max(...concentration) / Math.min(...concentration);
  if (ratio < 1000) {
    warnings.push('Concentration range should span at least 3 log units (1000-fold) for accurate IC50');
  }

  // Check for baseline and maximum
  const sortedResponse = [...response].sort((a, b) => a - b);
  const responseRange = sortedResponse[sortedResponse.length - 1] - sortedResponse[0];

  if (responseRange < 50) {
    warnings.push('Response range is narrow - ensure data includes both baseline and maximum effect');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Interpret binding results
 */
function interpretBindingResults(Kd, R2) {
  const interpretations = [];

  // Classify affinity
  const classification = classifyAffinity(Kd);
  interpretations.push(`Binding affinity: ${classification.description} (Kd = ${formatKd(Kd)})`);

  // Fit quality
  if (R2 > 0.98) {
    interpretations.push('Excellent fit - data consistent with one-site binding model');
  } else if (R2 > 0.95) {
    interpretations.push('Good fit - one-site binding model appropriate');
  } else if (R2 > 0.90) {
    interpretations.push('Moderate fit - consider two-site model or check for non-specific binding');
  } else {
    interpretations.push('Poor fit - check data quality or consider alternative models');
  }

  return interpretations;
}

/**
 * Format Kd value with appropriate units
 */
export function formatKd(Kd) {
  if (Kd < 1e-9) {
    return `${(Kd * 1e12).toFixed(1)} pM`;
  } else if (Kd < 1e-6) {
    return `${(Kd * 1e9).toFixed(1)} nM`;
  } else if (Kd < 1e-3) {
    return `${(Kd * 1e6).toFixed(1)} μM`;
  } else {
    return `${(Kd * 1e3).toFixed(1)} mM`;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/*
 * fDistributionCDF() and incompleteBeta() used to live here. They are gone.
 *
 * incompleteBeta() was Numerical Recipes' `betacf` continued fraction applied unconditionally,
 * without the symmetry swap NR requires for x > (a+1)/(a+b+2). Outside its region of
 * convergence it returns garbage, including negative "probabilities". Measured:
 *
 *     F = 50,  df = (2, 20)  ->  1.753e-8   (truth: 1.654e-8)   -- 6% off
 *     F = 100, df = (2, 20)  ->  -6.620e-7  (truth: 3.855e-11)  -- negative
 *
 * The F upper tail now comes from ../..//components/statistical-analysis/utils/tails, which
 * expresses it as a regularized incomplete beta with its arguments swapped -- the same
 * identity NR uses -- and is tested against scipy.
 */



// ============================================================================
// EXPORT
// ============================================================================

const bindingUtils = {
  analyzeSaturationBinding,
  analyzeDoseResponse,
  analyzeCompetitionBinding,
  analyzeBindingWithHill,
  calculateScatchard,
  calculateEffectLevels,
  classifyAffinity,
  formatKd,
  validateBindingData,
  validateDoseResponseData,
  AFFINITY_CLASSIFICATION
};

export default bindingUtils;
