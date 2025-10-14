/**
 * Design of Experiments (DOE) - Utility Functions
 *
 * Pure functions for factorial design calculations, effect estimations,
 * ANOVA, and Response Surface Methodology (RSM).
 *
 * Design Types Supported:
 * - Full Factorial (2^k, 3^k)
 * - Fractional Factorial (2^(k-p))
 * - Central Composite Design (CCD)
 * - Box-Behnken Design
 */

// ============================================================
// FACTORIAL DESIGN GENERATION
// ============================================================

/**
 * Generate full factorial design matrix (2^k design)
 *
 * @param {number} k - Number of factors
 * @param {Array<string>} factorNames - Optional factor names
 * @returns {Array<Object>} Design matrix with coded levels (-1, +1)
 */
export function generateFullFactorial(k, factorNames = null) {
  if (k < 1 || k > 10) {
    throw new Error('Number of factors must be between 1 and 10');
  }

  const names = factorNames || Array.from({ length: k }, (_, i) => `X${i + 1}`);
  const numRuns = Math.pow(2, k);
  const design = [];

  for (let run = 0; run < numRuns; run++) {
    const point = {};
    for (let factor = 0; factor < k; factor++) {
      // Use binary representation to assign -1 or +1
      point[names[factor]] = ((run >> factor) & 1) === 0 ? -1 : 1;
    }
    design.push(point);
  }

  return design;
}

/**
 * Generate Central Composite Design (CCD)
 *
 * @param {number} k - Number of factors
 * @param {string} type - 'circumscribed', 'inscribed', or 'faced'
 * @param {number} centerPoints - Number of center point replicates
 * @returns {Object} { design, alpha, type }
 */
export function generateCentralComposite(k, type = 'circumscribed', centerPoints = 3) {
  if (k < 2) {
    throw new Error('CCD requires at least 2 factors');
  }

  // Calculate alpha for rotatability: α = (2^k)^(1/4)
  const alpha = Math.pow(Math.pow(2, k), 0.25);

  const design = [];

  // 1. Factorial points (2^k)
  const factorial = generateFullFactorial(k);
  design.push(...factorial.map(point => ({
    ...point,
    type: 'factorial'
  })));

  // 2. Axial (star) points (2k)
  for (let i = 1; i <= k; i++) {
    const axialLow = {};
    const axialHigh = {};

    for (let j = 1; j <= k; j++) {
      if (i === j) {
        axialLow[`X${j}`] = -alpha;
        axialHigh[`X${j}`] = alpha;
      } else {
        axialLow[`X${j}`] = 0;
        axialHigh[`X${j}`] = 0;
      }
    }

    design.push({ ...axialLow, type: 'axial' });
    design.push({ ...axialHigh, type: 'axial' });
  }

  // 3. Center points (replicates)
  for (let i = 0; i < centerPoints; i++) {
    const center = {};
    for (let j = 1; j <= k; j++) {
      center[`X${j}`] = 0;
    }
    design.push({ ...center, type: 'center' });
  }

  return {
    design,
    alpha,
    type,
    numFactorial: Math.pow(2, k),
    numAxial: 2 * k,
    numCenter: centerPoints,
    totalRuns: design.length
  };
}

// ============================================================
// EFFECT ESTIMATION
// ============================================================

/**
 * Calculate main effect for a factor in a 2^k design
 *
 * @param {Array<Object>} data - Design matrix with response values
 * @param {string} factor - Factor name
 * @param {string} responseKey - Response variable name (default: 'Y')
 * @returns {number} Main effect estimate
 */
export function calculateMainEffect(data, factor, responseKey = 'Y') {
  if (!data || data.length === 0) {
    throw new Error('Data cannot be empty');
  }

  // Average response at high level
  const highData = data.filter(row => row[factor] === 1);
  const highAvg = highData.reduce((sum, row) => sum + row[responseKey], 0) / highData.length;

  // Average response at low level
  const lowData = data.filter(row => row[factor] === -1);
  const lowAvg = lowData.reduce((sum, row) => sum + row[responseKey], 0) / lowData.length;

  return highAvg - lowAvg;
}

/**
 * Calculate two-factor interaction effect in a 2^k design
 *
 * @param {Array<Object>} data - Design matrix with response values
 * @param {string} factor1 - First factor name
 * @param {string} factor2 - Second factor name
 * @param {string} responseKey - Response variable name (default: 'Y')
 * @returns {number} Interaction effect estimate
 */
export function calculateInteractionEffect(data, factor1, factor2, responseKey = 'Y') {
  if (!data || data.length === 0) {
    throw new Error('Data cannot be empty');
  }

  // Effect of factor2 when factor1 is high
  const f1High = data.filter(row => row[factor1] === 1);
  const f1HighF2Effect = calculateMainEffect(f1High, factor2, responseKey);

  // Effect of factor2 when factor1 is low
  const f1Low = data.filter(row => row[factor1] === -1);
  const f1LowF2Effect = calculateMainEffect(f1Low, factor2, responseKey);

  // Interaction: (effect of factor2 at high factor1) - (effect of factor2 at low factor1)
  return (f1HighF2Effect - f1LowF2Effect) / 2;
}

/**
 * Calculate all effects for a 2^k factorial design
 *
 * @param {Array<Object>} data - Design matrix with response values
 * @param {Array<string>} factors - Factor names
 * @param {string} responseKey - Response variable name
 * @returns {Object} { mainEffects, interactions }
 */
export function calculateAllEffects(data, factors, responseKey = 'Y') {
  const mainEffects = {};
  const interactions = {};

  // Main effects
  factors.forEach(factor => {
    mainEffects[factor] = calculateMainEffect(data, factor, responseKey);
  });

  // Two-factor interactions
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      const key = `${factors[i]}*${factors[j]}`;
      interactions[key] = calculateInteractionEffect(data, factors[i], factors[j], responseKey);
    }
  }

  return { mainEffects, interactions };
}

// ============================================================
// ANOVA CALCULATIONS
// ============================================================

/**
 * Calculate Sum of Squares Total (SST)
 *
 * @param {Array<number>} responses - Response values
 * @returns {number} SST
 */
export function calculateSST(responses) {
  const n = responses.length;
  const mean = responses.reduce((sum, y) => sum + y, 0) / n;
  return responses.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0);
}

/**
 * Calculate Sum of Squares for a factor (SS_Factor)
 *
 * @param {Array<Object>} data - Design matrix with response
 * @param {string} factor - Factor name
 * @param {string} responseKey - Response variable name
 * @returns {number} SS for the factor
 */
export function calculateSSFactor(data, factor, responseKey = 'Y') {
  const effect = calculateMainEffect(data, factor, responseKey);
  const n = data.length;

  // SS = n * (effect/2)^2 for 2^k designs
  return n * Math.pow(effect / 2, 2);
}

/**
 * Calculate Sum of Squares for interaction (SS_Interaction)
 *
 * @param {Array<Object>} data - Design matrix with response
 * @param {string} factor1 - First factor name
 * @param {string} factor2 - Second factor name
 * @param {string} responseKey - Response variable name
 * @returns {number} SS for the interaction
 */
export function calculateSSInteraction(data, factor1, factor2, responseKey = 'Y') {
  const effect = calculateInteractionEffect(data, factor1, factor2, responseKey);
  const n = data.length;

  return n * Math.pow(effect / 2, 2);
}

/**
 * Perform complete ANOVA for a 2^k factorial design
 *
 * @param {Array<Object>} data - Design matrix with response
 * @param {Array<string>} factors - Factor names
 * @param {string} responseKey - Response variable name
 * @returns {Object} ANOVA table
 */
export function performANOVA(data, factors, responseKey = 'Y') {
  const responses = data.map(row => row[responseKey]);
  const SST = calculateSST(responses);

  const anovaTable = [];
  let SSModel = 0;

  // Main effects
  factors.forEach(factor => {
    const SS = calculateSSFactor(data, factor, responseKey);
    SSModel += SS;
    anovaTable.push({
      source: factor,
      df: 1,
      SS: SS,
      MS: SS / 1,
      type: 'main'
    });
  });

  // Two-factor interactions
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      const SS = calculateSSInteraction(data, factors[i], factors[j], responseKey);
      SSModel += SS;
      anovaTable.push({
        source: `${factors[i]}*${factors[j]}`,
        df: 1,
        SS: SS,
        MS: SS / 1,
        type: 'interaction'
      });
    }
  }

  // Residual (Error)
  const SSE = SST - SSModel;
  const dfTotal = data.length - 1;
  const dfModel = anovaTable.length;
  const dfError = dfTotal - dfModel;

  const MSE = dfError > 0 ? SSE / dfError : 0;

  // Calculate F-statistics
  anovaTable.forEach(row => {
    row.F = MSE > 0 ? row.MS / MSE : Infinity;
  });

  // R-squared
  const RSquared = SSModel / SST;

  return {
    anovaTable,
    SST,
    SSModel,
    SSE,
    dfTotal,
    dfModel,
    dfError,
    MSE,
    RSquared
  };
}

// ============================================================
// RESPONSE SURFACE METHODOLOGY (RSM)
// ============================================================

/**
 * Fit second-order response surface model
 * y = β₀ + Σβᵢxᵢ + Σβᵢᵢxᵢ² + ΣΣβᵢⱼxᵢxⱼ
 *
 * Uses least squares estimation (simplified for 2 factors)
 *
 * @param {Array<Object>} data - Design matrix with response
 * @param {Array<string>} factors - Factor names (max 2 for this implementation)
 * @param {string} responseKey - Response variable name
 * @returns {Object} Model coefficients and statistics
 */
export function fitSecondOrderModel(data, factors, responseKey = 'Y') {
  if (factors.length !== 2) {
    throw new Error('This implementation supports 2 factors only');
  }

  const [X1, X2] = factors;
  const n = data.length;

  // Build design matrix X and response vector Y
  const Y = data.map(row => row[responseKey]);

  // Terms: 1, x1, x2, x1², x2², x1*x2
  const XMatrix = data.map(row => [
    1,
    row[X1],
    row[X2],
    row[X1] * row[X1],
    row[X2] * row[X2],
    row[X1] * row[X2]
  ]);

  // Simplified least squares for demonstration
  // In production, use proper matrix algebra library

  // Calculate means for normalization
  const meanY = Y.reduce((a, b) => a + b, 0) / n;

  // Approximate coefficients using effect estimates
  const b0 = meanY;
  const b1 = calculateMainEffect(data, X1, responseKey) / 2;
  const b2 = calculateMainEffect(data, X2, responseKey) / 2;
  const b12 = calculateInteractionEffect(data, X1, X2, responseKey) / 2;

  // Quadratic terms (approximated from curvature)
  const centerData = data.filter(row => row[X1] === 0 && row[X2] === 0);
  const centerMean = centerData.length > 0
    ? centerData.reduce((sum, row) => sum + row[responseKey], 0) / centerData.length
    : meanY;

  const factorialMean = data
    .filter(row => Math.abs(row[X1]) === 1 && Math.abs(row[X2]) === 1)
    .reduce((sum, row) => sum + row[responseKey], 0) / Math.pow(2, factors.length);

  const curvature = centerMean - factorialMean;
  const b11 = curvature / 2;
  const b22 = curvature / 2;

  return {
    coefficients: {
      b0,
      b1,
      b2,
      b11,
      b22,
      b12
    },
    factors: [X1, X2],
    equation: `Y = ${b0.toFixed(2)} + ${b1.toFixed(2)}*${X1} + ${b2.toFixed(2)}*${X2} + ${b11.toFixed(2)}*${X1}² + ${b22.toFixed(2)}*${X2}² + ${b12.toFixed(2)}*${X1}*${X2}`
  };
}

/**
 * Predict response using second-order model
 *
 * @param {Object} coefficients - Model coefficients {b0, b1, b2, b11, b22, b12}
 * @param {number} x1 - First factor value (coded)
 * @param {number} x2 - Second factor value (coded)
 * @returns {number} Predicted response
 */
export function predictResponse(coefficients, x1, x2) {
  const { b0, b1, b2, b11, b22, b12 } = coefficients;
  return b0 + b1*x1 + b2*x2 + b11*x1*x1 + b22*x2*x2 + b12*x1*x2;
}

/**
 * Find stationary point of response surface (optimum or saddle point)
 * For model: y = b0 + b1*x1 + b2*x2 + b11*x1² + b22*x2² + b12*x1*x2
 *
 * @param {Object} coefficients - Model coefficients
 * @returns {Object} { x1, x2, yPred, type: 'maximum'|'minimum'|'saddle' }
 */
export function findStationaryPoint(coefficients) {
  const { b1, b2, b11, b22, b12 } = coefficients;

  // Solve: ∂y/∂x1 = b1 + 2*b11*x1 + b12*x2 = 0
  //        ∂y/∂x2 = b2 + b12*x1 + 2*b22*x2 = 0

  // Matrix form: [2*b11  b12 ] [x1]   [-b1]
  //              [b12   2*b22] [x2] = [-b2]

  const det = 4*b11*b22 - b12*b12;

  if (Math.abs(det) < 1e-10) {
    return { x1: NaN, x2: NaN, yPred: NaN, type: 'degenerate' };
  }

  const x1 = (-b1 * 2*b22 + b2 * b12) / det;
  const x2 = (-b2 * 2*b11 + b1 * b12) / det;

  const yPred = predictResponse(coefficients, x1, x2);

  // Determine type using eigenvalues of Hessian
  const trace = 2*b11 + 2*b22;

  if (det > 0) {
    return {
      x1,
      x2,
      yPred,
      type: trace < 0 ? 'maximum' : 'minimum'
    };
  } else {
    return {
      x1,
      x2,
      yPred,
      type: 'saddle'
    };
  }
}

// ============================================================
// CODING/DECODING FUNCTIONS
// ============================================================

/**
 * Convert natural units to coded units
 * coded = (natural - center) / step
 *
 * @param {number} natural - Natural value
 * @param {number} center - Center point
 * @param {number} step - Step size (half range)
 * @returns {number} Coded value
 */
export function codeValue(natural, center, step) {
  return (natural - center) / step;
}

/**
 * Convert coded units to natural units
 * natural = coded * step + center
 *
 * @param {number} coded - Coded value
 * @param {number} center - Center point
 * @param {number} step - Step size (half range)
 * @returns {number} Natural value
 */
export function decodeValue(coded, center, step) {
  return coded * step + center;
}

// ============================================================
// DESIRABILITY FUNCTIONS
// ============================================================

/**
 * Calculate desirability for "target-is-best" objective
 *
 * @param {number} y - Response value
 * @param {number} target - Target value
 * @param {number} tolerance - Acceptable tolerance
 * @returns {number} Desirability [0, 1]
 */
export function targetDesirability(y, target, tolerance) {
  const deviation = Math.abs(y - target);
  if (deviation <= tolerance) {
    return Math.pow(1 - deviation / tolerance, 2);
  }
  return 0;
}

/**
 * Calculate desirability for "larger-is-better" objective
 *
 * @param {number} y - Response value
 * @param {number} lower - Lower acceptable bound
 * @param {number} target - Target (upper) value
 * @returns {number} Desirability [0, 1]
 */
export function maximizeDesirability(y, lower, target) {
  if (y <= lower) return 0;
  if (y >= target) return 1;
  return Math.pow((y - lower) / (target - lower), 2);
}

/**
 * Calculate desirability for "smaller-is-better" objective
 *
 * @param {number} y - Response value
 * @param {number} target - Target (lower) value
 * @param {number} upper - Upper acceptable bound
 * @returns {number} Desirability [0, 1]
 */
export function minimizeDesirability(y, target, upper) {
  if (y <= target) return 1;
  if (y >= upper) return 0;
  return Math.pow((upper - y) / (upper - target), 2);
}

/**
 * Calculate overall desirability for multiple responses
 * D = (d1 * d2 * ... * dn)^(1/n)
 *
 * @param {Array<number>} desirabilities - Individual desirability values
 * @returns {number} Overall desirability [0, 1]
 */
export function overallDesirability(desirabilities) {
  if (desirabilities.some(d => d <= 0)) return 0;
  const product = desirabilities.reduce((prod, d) => prod * d, 1);
  return Math.pow(product, 1 / desirabilities.length);
}
