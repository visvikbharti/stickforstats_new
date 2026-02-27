/**
 * Non-Linear Regression Utilities for Biophysics Analysis
 *
 * Implements Levenberg-Marquardt algorithm for fitting arbitrary models to data.
 * Used for Michaelis-Menten kinetics, binding curves, dose-response, etc.
 *
 * @author StickForStats Team
 * @version 1.0.0
 *
 * References:
 * - Levenberg, K. (1944). A Method for the Solution of Certain Non-Linear Problems in Least Squares
 * - Marquardt, D. (1963). An Algorithm for Least-Squares Estimation of Nonlinear Parameters
 * - Press et al. (2007). Numerical Recipes: The Art of Scientific Computing
 */

import jStat from 'jstat';

// ============================================================================
// MATRIX OPERATIONS
// ============================================================================

/**
 * Matrix multiplication
 */
export function matrixMultiply(A, B) {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;

  const result = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return result;
}

/**
 * Matrix transpose
 */
export function matrixTranspose(A) {
  const rows = A.length;
  const cols = A[0].length;
  const result = Array(cols).fill(null).map(() => Array(rows).fill(0));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }

  return result;
}

/**
 * Matrix inversion using Gauss-Jordan elimination
 */
export function matrixInverse(A) {
  const n = A.length;
  const augmented = A.map((row, i) => {
    const identityRow = Array(n).fill(0);
    identityRow[i] = 1;
    return [...row, ...identityRow];
  });

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Check for singular matrix
    if (Math.abs(augmented[i][i]) < 1e-12) {
      throw new Error('Matrix is singular or nearly singular');
    }

    // Scale row
    const scale = augmented[i][i];
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= scale;
    }

    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  // Extract inverse
  return augmented.map(row => row.slice(n));
}

/**
 * Matrix-vector multiplication
 */
export function matrixVectorMultiply(A, v) {
  return A.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

/**
 * Calculate sum of squared residuals
 */
export function sumSquaredResiduals(observed, predicted) {
  return observed.reduce((sum, obs, i) => sum + Math.pow(obs - predicted[i], 2), 0);
}

/**
 * Calculate total sum of squares
 */
export function totalSumOfSquares(observed) {
  const mean = observed.reduce((a, b) => a + b, 0) / observed.length;
  return observed.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
}

/**
 * Calculate R-squared (coefficient of determination)
 */
export function calculateRSquared(observed, predicted) {
  const SSR = sumSquaredResiduals(observed, predicted);
  const SST = totalSumOfSquares(observed);
  return 1 - (SSR / SST);
}

/**
 * Calculate adjusted R-squared
 */
export function calculateAdjustedRSquared(observed, predicted, numParams) {
  const n = observed.length;
  const R2 = calculateRSquared(observed, predicted);
  return 1 - ((1 - R2) * (n - 1) / (n - numParams - 1));
}

/**
 * Calculate AIC (Akaike Information Criterion)
 */
export function calculateAIC(observed, predicted, numParams) {
  const n = observed.length;
  const SSR = sumSquaredResiduals(observed, predicted);
  const sigma2 = SSR / n;
  return n * Math.log(sigma2) + 2 * numParams;
}

/**
 * Calculate BIC (Bayesian Information Criterion)
 */
export function calculateBIC(observed, predicted, numParams) {
  const n = observed.length;
  const SSR = sumSquaredResiduals(observed, predicted);
  const sigma2 = SSR / n;
  return n * Math.log(sigma2) + numParams * Math.log(n);
}

/**
 * Calculate standard error of regression
 */
export function calculateStandardError(observed, predicted, numParams) {
  const n = observed.length;
  const SSR = sumSquaredResiduals(observed, predicted);
  const degreesOfFreedom = n - numParams;
  return Math.sqrt(SSR / degreesOfFreedom);
}

// ============================================================================
// NUMERICAL DIFFERENTIATION
// ============================================================================

/**
 * Calculate numerical gradient using central differences
 */
export function numericalGradient(func, x, params, h = 1e-8) {
  const gradient = [];
  const paramNames = Object.keys(params);

  for (const paramName of paramNames) {
    const paramsPlus = { ...params };
    const paramsMinus = { ...params };

    paramsPlus[paramName] = params[paramName] + h;
    paramsMinus[paramName] = params[paramName] - h;

    const fPlus = func(x, paramsPlus);
    const fMinus = func(x, paramsMinus);

    gradient.push((fPlus - fMinus) / (2 * h));
  }

  return gradient;
}

/**
 * Calculate Jacobian matrix
 */
export function calculateJacobian(func, xData, params, h = 1e-8) {
  const n = xData.length;
  const paramNames = Object.keys(params);
  const p = paramNames.length;

  const J = Array(n).fill(null).map(() => Array(p).fill(0));

  for (let i = 0; i < n; i++) {
    const gradient = numericalGradient(func, xData[i], params, h);
    for (let j = 0; j < p; j++) {
      J[i][j] = gradient[j];
    }
  }

  return J;
}

// ============================================================================
// LEVENBERG-MARQUARDT ALGORITHM
// ============================================================================

/**
 * Levenberg-Marquardt non-linear least squares optimization
 *
 * @param {Function} model - Model function: f(x, params) => y
 * @param {number[]} xData - Independent variable data
 * @param {number[]} yData - Dependent variable data (observed values)
 * @param {Object} initialParams - Initial parameter guesses
 * @param {Object} options - Algorithm options
 * @returns {Object} Fit results including parameters, statistics, and diagnostics
 */
export function levenbergMarquardt(model, xData, yData, initialParams, options = {}) {
  const {
    maxIterations = 1000,
    tolerance = 1e-10,
    lambdaInitial = 0.001,
    lambdaUp = 10,
    lambdaDown = 0.1,
    minLambda = 1e-12,
    maxLambda = 1e12,
    parameterBounds = null,
    weights = null
  } = options;

  const n = xData.length;
  const paramNames = Object.keys(initialParams);
  const p = paramNames.length;

  // Initialize parameters
  let params = { ...initialParams };
  let paramsArray = paramNames.map(name => params[name]);

  // Apply weights if provided
  const w = weights || Array(n).fill(1);

  // Calculate initial predictions and residuals
  let predicted = xData.map(x => model(x, params));
  let residuals = yData.map((y, i) => (y - predicted[i]) * Math.sqrt(w[i]));
  let chi2 = residuals.reduce((sum, r) => sum + r * r, 0);

  let lambda = lambdaInitial;
  let converged = false;
  let iterations = 0;
  const history = [];

  while (iterations < maxIterations && !converged) {
    iterations++;

    // Calculate Jacobian
    const J = calculateJacobian(model, xData, params);

    // Apply weights to Jacobian
    const Jw = J.map((row, i) => row.map(val => val * Math.sqrt(w[i])));

    // Calculate J^T * J (Hessian approximation)
    const JtJ = matrixMultiply(matrixTranspose(Jw), Jw);

    // Calculate J^T * residuals
    const Jtr = matrixVectorMultiply(matrixTranspose(Jw), residuals);

    // Add damping: (J^T * J + lambda * diag(J^T * J)) * delta = J^T * r
    // eslint-disable-next-line no-loop-func
    const JtJdamped = JtJ.map((row, i) =>
      row.map((val, j) => i === j ? val * (1 + lambda) : val)
    );

    try {
      // Solve for parameter update
      const JtJinv = matrixInverse(JtJdamped);
      const delta = matrixVectorMultiply(JtJinv, Jtr);

      // Update parameters
      const newParamsArray = paramsArray.map((p, i) => p + delta[i]);

      // Apply bounds if specified
      if (parameterBounds) {
        for (let i = 0; i < p; i++) {
          const name = paramNames[i];
          if (parameterBounds[name]) {
            const { min, max } = parameterBounds[name];
            if (min !== undefined) newParamsArray[i] = Math.max(newParamsArray[i], min);
            if (max !== undefined) newParamsArray[i] = Math.min(newParamsArray[i], max);
          }
        }
      }

      const newParams = {};
      paramNames.forEach((name, i) => { newParams[name] = newParamsArray[i]; });

      // Calculate new chi-squared
      const newPredicted = xData.map(x => model(x, newParams));
      const newResiduals = yData.map((y, i) => (y - newPredicted[i]) * Math.sqrt(w[i]));
      const newChi2 = newResiduals.reduce((sum, r) => sum + r * r, 0);

      // Decide whether to accept the step
      if (newChi2 < chi2) {
        // Accept step, decrease lambda
        params = newParams;
        paramsArray = newParamsArray;
        predicted = newPredicted;
        residuals = newResiduals;

        const improvement = (chi2 - newChi2) / chi2;
        chi2 = newChi2;
        lambda = Math.max(lambda * lambdaDown, minLambda);

        history.push({
          iteration: iterations,
          chi2,
          lambda,
          params: { ...params },
          accepted: true
        });

        // Check for convergence
        if (improvement < tolerance) {
          converged = true;
        }
      } else {
        // Reject step, increase lambda
        lambda = Math.min(lambda * lambdaUp, maxLambda);

        history.push({
          iteration: iterations,
          chi2,
          lambda,
          params: { ...params },
          accepted: false
        });

        // Check for convergence (lambda too large)
        if (lambda >= maxLambda) {
          converged = true;
        }
      }
    } catch (error) {
      // Matrix inversion failed, increase lambda and try again
      lambda = Math.min(lambda * lambdaUp, maxLambda);
      if (lambda >= maxLambda) {
        converged = true;
      }
    }
  }

  // Calculate final statistics
  const finalPredicted = xData.map(x => model(x, params));
  const R2 = calculateRSquared(yData, finalPredicted);
  const adjustedR2 = calculateAdjustedRSquared(yData, finalPredicted, p);
  const AIC = calculateAIC(yData, finalPredicted, p);
  const BIC = calculateBIC(yData, finalPredicted, p);
  const standardError = calculateStandardError(yData, finalPredicted, p);

  // Calculate parameter standard errors from covariance matrix
  const J = calculateJacobian(model, xData, params);
  const Jw = J.map((row, i) => row.map(val => val * Math.sqrt(w[i])));
  const JtJ = matrixMultiply(matrixTranspose(Jw), Jw);

  let parameterErrors = {};
  let covariance = null;

  try {
    const sigma2 = chi2 / (n - p);
    covariance = matrixInverse(JtJ).map(row => row.map(val => val * sigma2));

    paramNames.forEach((name, i) => {
      parameterErrors[name] = Math.sqrt(covariance[i][i]);
    });
  } catch (error) {
    // Covariance matrix calculation failed
    paramNames.forEach(name => {
      parameterErrors[name] = NaN;
    });
  }

  // Calculate confidence intervals (95%)
  const tCritical = getTCritical(0.05, n - p);
  const confidenceIntervals = {};

  paramNames.forEach(name => {
    const se = parameterErrors[name];
    confidenceIntervals[name] = {
      lower: params[name] - tCritical * se,
      upper: params[name] + tCritical * se
    };
  });

  return {
    success: converged && chi2 < Infinity,
    parameters: params,
    parameterErrors,
    confidenceIntervals,
    statistics: {
      R2,
      adjustedR2,
      AIC,
      BIC,
      standardError,
      chi2,
      degreesOfFreedom: n - p,
      reducedChi2: chi2 / (n - p)
    },
    convergence: {
      converged,
      iterations,
      finalLambda: lambda
    },
    predicted: finalPredicted,
    residuals: yData.map((y, i) => y - finalPredicted[i]),
    covariance,
    history
  };
}

// ============================================================================
// T-DISTRIBUTION CRITICAL VALUES
// ============================================================================

/**
 * Approximate t-distribution critical value
 * Uses Abramowitz and Stegun approximation
 */
export function getTCritical(alpha, df) {
  if (df <= 0) return NaN;
  return jStat.studentt.inv(1 - alpha / 2, df);
}

// ============================================================================
// PRE-BUILT MODELS
// ============================================================================

/**
 * Collection of common biophysics models
 */
export const MODELS = {
  /**
   * Michaelis-Menten equation
   * v = Vmax * [S] / (Km + [S])
   */
  michaelismenten: (S, params) => {
    const { Vmax, Km } = params;
    return (Vmax * S) / (Km + S);
  },

  /**
   * Hill equation (cooperativity)
   * v = Vmax * [S]^n / (K0.5^n + [S]^n)
   */
  hill: (S, params) => {
    const { Vmax, K05, n } = params;
    return (Vmax * Math.pow(S, n)) / (Math.pow(K05, n) + Math.pow(S, n));
  },

  /**
   * Substrate inhibition
   * v = Vmax * [S] / (Km + [S] * (1 + [S]/Ki))
   */
  substrateInhibition: (S, params) => {
    const { Vmax, Km, Ki } = params;
    return (Vmax * S) / (Km + S * (1 + S / Ki));
  },

  /**
   * One-site specific binding
   * Y = Bmax * [L] / (Kd + [L])
   */
  onesite_binding: (L, params) => {
    const { Bmax, Kd } = params;
    return (Bmax * L) / (Kd + L);
  },

  /**
   * Two-site specific binding
   * Y = Bmax1 * [L] / (Kd1 + [L]) + Bmax2 * [L] / (Kd2 + [L])
   */
  twosite_binding: (L, params) => {
    const { Bmax1, Kd1, Bmax2, Kd2 } = params;
    return (Bmax1 * L) / (Kd1 + L) + (Bmax2 * L) / (Kd2 + L);
  },

  /**
   * One-site binding with Hill slope
   * Y = Bmax * [L]^h / (Kd^h + [L]^h)
   */
  binding_hill: (L, params) => {
    const { Bmax, Kd, h } = params;
    return (Bmax * Math.pow(L, h)) / (Math.pow(Kd, h) + Math.pow(L, h));
  },

  /**
   * Four-parameter logistic (dose-response)
   * Y = Bottom + (Top - Bottom) / (1 + 10^((LogIC50 - X) * HillSlope))
   */
  fourPL: (logX, params) => {
    const { Bottom, Top, LogIC50, HillSlope } = params;
    return Bottom + (Top - Bottom) / (1 + Math.pow(10, (LogIC50 - logX) * HillSlope));
  },

  /**
   * Three-parameter logistic (dose-response with fixed bottom)
   * Y = Bottom + (Top - Bottom) / (1 + 10^((LogIC50 - X) * HillSlope))
   * Bottom fixed at 0
   */
  threePL: (logX, params) => {
    const { Top, LogIC50, HillSlope } = params;
    return Top / (1 + Math.pow(10, (LogIC50 - logX) * HillSlope));
  },

  /**
   * Exponential decay (first order)
   * Y = Y0 * exp(-k * t)
   */
  exponentialDecay: (t, params) => {
    const { Y0, k } = params;
    return Y0 * Math.exp(-k * t);
  },

  /**
   * Exponential association
   * Y = Ymax * (1 - exp(-k * t))
   */
  exponentialAssociation: (t, params) => {
    const { Ymax, k } = params;
    return Ymax * (1 - Math.exp(-k * t));
  },

  /**
   * Two-phase exponential decay
   * Y = Span1 * exp(-k1 * t) + Span2 * exp(-k2 * t) + Plateau
   */
  biexponentialDecay: (t, params) => {
    const { Span1, k1, Span2, k2, Plateau } = params;
    return Span1 * Math.exp(-k1 * t) + Span2 * Math.exp(-k2 * t) + Plateau;
  },

  /**
   * Boltzmann sigmoidal (thermal denaturation)
   * Y = Bottom + (Top - Bottom) / (1 + exp((Tm - T) / slope))
   */
  boltzmann: (T, params) => {
    const { Bottom, Top, slope } = params;
    return Bottom + (Top - Bottom) / (1 + Math.exp((params.Tm - T) / slope));
  },

  /**
   * Two-state thermal denaturation (van't Hoff)
   * Fraction folded as function of temperature
   * Assumes ΔCp = 0
   */
  thermalDenaturation: (T, params) => {
    const { YN, YD, Tm, DeltaH } = params;
    const R = 8.314; // J/(mol·K)
    const TKelvin = T + 273.15;
    const TmKelvin = Tm + 273.15;

    // ΔG = ΔH * (1 - T/Tm)
    const deltaG = DeltaH * (1 - TKelvin / TmKelvin);
    const K = Math.exp(-deltaG / (R * TKelvin));
    const fractionUnfolded = K / (1 + K);

    return YN + (YD - YN) * fractionUnfolded;
  },

  /**
   * Linear model (for comparison)
   * Y = m * X + b
   */
  linear: (x, params) => {
    const { m, b } = params;
    return m * x + b;
  },

  /**
   * Quadratic model
   * Y = a * X^2 + b * X + c
   */
  quadratic: (x, params) => {
    const { a, b, c } = params;
    return a * x * x + b * x + c;
  }
};

// ============================================================================
// INITIAL PARAMETER ESTIMATION
// ============================================================================

/**
 * Estimate initial parameters for Michaelis-Menten
 */
export function estimateMMParams(xData, yData) {
  // Vmax estimate: maximum observed velocity or extrapolation
  const maxY = Math.max(...yData);
  const Vmax = maxY * 1.1; // Slightly higher than max observed

  // Km estimate: substrate concentration at half Vmax
  const halfVmax = Vmax / 2;
  let Km = xData[0];

  for (let i = 0; i < yData.length - 1; i++) {
    if ((yData[i] <= halfVmax && yData[i + 1] >= halfVmax) ||
        (yData[i] >= halfVmax && yData[i + 1] <= halfVmax)) {
      // Linear interpolation
      const frac = (halfVmax - yData[i]) / (yData[i + 1] - yData[i]);
      Km = xData[i] + frac * (xData[i + 1] - xData[i]);
      break;
    }
  }

  // If no crossing found, estimate from median
  if (Km === xData[0]) {
    Km = xData[Math.floor(xData.length / 2)];
  }

  return { Vmax, Km };
}

/**
 * Estimate initial parameters for Hill equation
 */
export function estimateHillParams(xData, yData) {
  const mmParams = estimateMMParams(xData, yData);
  return {
    Vmax: mmParams.Vmax,
    K05: mmParams.Km,
    n: 1 // Start with no cooperativity
  };
}

/**
 * Estimate initial parameters for binding curve
 */
export function estimateBindingParams(xData, yData) {
  const Bmax = Math.max(...yData) * 1.1;

  // Kd estimate: concentration at half Bmax
  const halfBmax = Bmax / 2;
  let Kd = xData[Math.floor(xData.length / 2)];

  for (let i = 0; i < yData.length - 1; i++) {
    if ((yData[i] <= halfBmax && yData[i + 1] >= halfBmax) ||
        (yData[i] >= halfBmax && yData[i + 1] <= halfBmax)) {
      const frac = (halfBmax - yData[i]) / (yData[i + 1] - yData[i]);
      Kd = xData[i] + frac * (xData[i + 1] - xData[i]);
      break;
    }
  }

  return { Bmax, Kd };
}

/**
 * Estimate initial parameters for 4PL dose-response
 */
export function estimate4PLParams(logXData, yData) {
  const sorted = [...yData].sort((a, b) => a - b);
  const Bottom = sorted[0];
  const Top = sorted[sorted.length - 1];

  // LogIC50: log concentration at 50% response
  const mid = (Top + Bottom) / 2;
  let LogIC50 = logXData[Math.floor(logXData.length / 2)];

  for (let i = 0; i < yData.length - 1; i++) {
    if ((yData[i] <= mid && yData[i + 1] >= mid) ||
        (yData[i] >= mid && yData[i + 1] <= mid)) {
      const frac = (mid - yData[i]) / (yData[i + 1] - yData[i]);
      LogIC50 = logXData[i] + frac * (logXData[i + 1] - logXData[i]);
      break;
    }
  }

  return { Bottom, Top, LogIC50, HillSlope: 1 };
}

/**
 * Estimate initial parameters for thermal denaturation
 */
export function estimateThermalParams(tempData, signalData) {
  const sorted = [...signalData].sort((a, b) => a - b);
  const YN = sorted[0]; // Native state signal
  const YD = sorted[sorted.length - 1]; // Denatured state signal

  // Tm: temperature at midpoint
  const mid = (YN + YD) / 2;
  let Tm = tempData[Math.floor(tempData.length / 2)];

  for (let i = 0; i < signalData.length - 1; i++) {
    if ((signalData[i] <= mid && signalData[i + 1] >= mid) ||
        (signalData[i] >= mid && signalData[i + 1] <= mid)) {
      const frac = (mid - signalData[i]) / (signalData[i + 1] - signalData[i]);
      Tm = tempData[i] + frac * (tempData[i + 1] - tempData[i]);
      break;
    }
  }

  // Default enthalpy estimate (typical for proteins: 200-400 kJ/mol)
  const DeltaH = 250000; // 250 kJ/mol in J/mol

  return { YN, YD, Tm, DeltaH };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Fit Michaelis-Menten model to data
 */
export function fitMichaelisMenten(substrate, velocity, options = {}) {
  const initialParams = options.initialParams || estimateMMParams(substrate, velocity);

  return levenbergMarquardt(
    MODELS.michaelismenten,
    substrate,
    velocity,
    initialParams,
    {
      parameterBounds: {
        Vmax: { min: 0 },
        Km: { min: 0 }
      },
      ...options
    }
  );
}

/**
 * Fit Hill equation to data
 */
export function fitHill(substrate, velocity, options = {}) {
  const initialParams = options.initialParams || estimateHillParams(substrate, velocity);

  return levenbergMarquardt(
    MODELS.hill,
    substrate,
    velocity,
    initialParams,
    {
      parameterBounds: {
        Vmax: { min: 0 },
        K05: { min: 0 },
        n: { min: 0.1, max: 10 }
      },
      ...options
    }
  );
}

/**
 * Fit one-site binding model to data
 */
export function fitBinding(ligand, bound, options = {}) {
  const initialParams = options.initialParams || estimateBindingParams(ligand, bound);

  return levenbergMarquardt(
    MODELS.onesite_binding,
    ligand,
    bound,
    initialParams,
    {
      parameterBounds: {
        Bmax: { min: 0 },
        Kd: { min: 0 }
      },
      ...options
    }
  );
}

/**
 * Fit 4PL dose-response model to data
 */
export function fit4PL(logConc, response, options = {}) {
  const initialParams = options.initialParams || estimate4PLParams(logConc, response);

  return levenbergMarquardt(
    MODELS.fourPL,
    logConc,
    response,
    initialParams,
    {
      ...options
    }
  );
}

/**
 * Fit thermal denaturation model to data
 */
export function fitThermalDenaturation(temperature, signal, options = {}) {
  const initialParams = options.initialParams || estimateThermalParams(temperature, signal);

  return levenbergMarquardt(
    MODELS.thermalDenaturation,
    temperature,
    signal,
    initialParams,
    {
      parameterBounds: {
        DeltaH: { min: 0 }
      },
      ...options
    }
  );
}

const nonLinearRegression = {
  levenbergMarquardt,
  MODELS,
  fitMichaelisMenten,
  fitHill,
  fitBinding,
  fit4PL,
  fitThermalDenaturation,
  calculateRSquared,
  calculateAIC,
  calculateBIC
};

export default nonLinearRegression;
