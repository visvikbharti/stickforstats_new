/**
 * Curve Fitting Utilities for Publication Engine
 *
 * - 4PL dose-response wrapper (delegates to nonLinearRegression.js)
 * - Polynomial regression (degree 2-5)
 * - LOESS smoother (locally weighted scatterplot smoothing)
 */

import { levenbergMarquardt, MODELS, estimate4PLParams } from '../../../utils/biophysics/nonLinearRegression';

// ============================================================================
// 4PL DOSE-RESPONSE FITTING
// ============================================================================

/**
 * Fit a 4-parameter logistic (sigmoidal) curve to dose-response data.
 *
 * @param {number[]} xData - Concentrations (will be log10-transformed internally)
 * @param {number[]} yData - Response values
 * @param {Object} options - Extra LM options
 * @returns {Object} { params: { Bottom, Top, LogIC50, HillSlope }, predicted, ic50, curve, success }
 */
export function fit4PL(xData, yData, options = {}) {
  // Log-transform concentrations (skip zeros)
  const logX = xData.map(x => (x > 0 ? Math.log10(x) : Math.log10(1e-12)));

  const initialParams = estimate4PLParams(logX, yData);

  const result = levenbergMarquardt(MODELS.fourPL, logX, yData, initialParams, {
    maxIterations: 2000,
    tolerance: 1e-10,
    ...options,
  });

  const ic50 = result.success ? Math.pow(10, result.parameters.LogIC50) : null;

  // Generate smooth curve
  const logMin = Math.min(...logX);
  const logMax = Math.max(...logX);
  const curvePoints = options.curvePoints || 200;
  const step = (logMax - logMin) / (curvePoints - 1);
  const curve = [];
  for (let i = 0; i < curvePoints; i++) {
    const lx = logMin + i * step;
    curve.push({ x: Math.pow(10, lx), logX: lx, y: MODELS.fourPL(lx, result.parameters) });
  }

  return { ...result, ic50, curve };
}

// ============================================================================
// POLYNOMIAL REGRESSION
// ============================================================================

/**
 * Fit a polynomial of given degree to data using ordinary least squares.
 * Solves the normal equation: (X^T X)^{-1} X^T y
 *
 * @param {number[]} xData
 * @param {number[]} yData
 * @param {number} degree - Polynomial degree (1-5)
 * @returns {{ coefficients: number[], predict: (x: number) => number, r2: number }}
 */
export function polynomialRegression(xData, yData, degree = 2) {
  const n = xData.length;
  const d = Math.min(degree, 5);

  // Build Vandermonde matrix
  const X = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j <= d; j++) {
      row.push(Math.pow(xData[i], j));
    }
    X.push(row);
  }

  // X^T X
  const p = d + 1;
  const XtX = Array.from({ length: p }, () => Array(p).fill(0));
  const XtY = Array(p).fill(0);

  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < n; k++) {
        XtX[i][j] += X[k][i] * X[k][j];
      }
    }
    for (let k = 0; k < n; k++) {
      XtY[i] += X[k][i] * yData[k];
    }
  }

  // Solve via Gauss-Jordan elimination
  const aug = XtX.map((row, i) => [...row, XtY[i]]);
  for (let col = 0; col < p; col++) {
    // Pivot
    let maxRow = col;
    for (let r = col + 1; r < p; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue; // singular — skip

    for (let j = col; j <= p; j++) aug[col][j] /= pivot;
    for (let r = 0; r < p; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      for (let j = col; j <= p; j++) aug[r][j] -= factor * aug[col][j];
    }
  }

  const coefficients = aug.map(row => row[p]);

  const predict = (x) => {
    let val = 0;
    for (let j = 0; j <= d; j++) val += coefficients[j] * Math.pow(x, j);
    return val;
  };

  // R²
  const yMean = yData.reduce((a, b) => a + b, 0) / n;
  const ssTot = yData.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = yData.reduce((s, y, i) => s + (y - predict(xData[i])) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { coefficients, predict, r2 };
}

// ============================================================================
// LOESS SMOOTHER
// ============================================================================

/**
 * LOESS (locally estimated scatterplot smoothing).
 *
 * For each evaluation point, fits a weighted linear regression
 * using a tri-cube weight function over the nearest `span` fraction of data.
 *
 * @param {number[]} xData
 * @param {number[]} yData
 * @param {number} span - Fraction of data used per window (0 < span <= 1, default 0.3)
 * @param {number} nPoints - Number of output points (default 100)
 * @returns {{ x: number, y: number }[]}
 */
export function loessSmooth(xData, yData, span = 0.3, nPoints = 100) {
  const n = xData.length;
  if (n < 3) return xData.map((x, i) => ({ x, y: yData[i] }));

  const k = Math.max(3, Math.ceil(span * n)); // window size

  // Sort input by x
  const sorted = xData.map((x, i) => ({ x, y: yData[i] })).sort((a, b) => a.x - b.x);
  const sx = sorted.map(d => d.x);
  const sy = sorted.map(d => d.y);

  const xMin = sx[0];
  const xMax = sx[n - 1];
  const step = (xMax - xMin) / (nPoints - 1);
  const result = [];

  for (let p = 0; p < nPoints; p++) {
    const xp = xMin + p * step;

    // Find k nearest neighbors by distance
    const dists = sx.map((xi, i) => ({ i, d: Math.abs(xi - xp) }));
    dists.sort((a, b) => a.d - b.d);
    const neighbors = dists.slice(0, k);
    const maxDist = neighbors[neighbors.length - 1].d || 1;

    // Tri-cube weights
    const weights = neighbors.map(nb => {
      const u = nb.d / (maxDist * 1.0001); // small padding to avoid 0/0
      return Math.pow(1 - Math.pow(u, 3), 3);
    });

    // Weighted linear regression: y = a + b*x
    let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
    for (let j = 0; j < neighbors.length; j++) {
      const idx = neighbors[j].i;
      const w = weights[j];
      sw += w;
      swx += w * sx[idx];
      swy += w * sy[idx];
      swxx += w * sx[idx] * sx[idx];
      swxy += w * sx[idx] * sy[idx];
    }

    const det = sw * swxx - swx * swx;
    let yp;
    if (Math.abs(det) < 1e-12) {
      yp = sw > 0 ? swy / sw : 0;
    } else {
      const a = (swxx * swy - swx * swxy) / det;
      const b = (sw * swxy - swx * swy) / det;
      yp = a + b * xp;
    }

    result.push({ x: xp, y: yp });
  }

  return result;
}

/**
 * Generate a smooth polynomial curve for rendering.
 *
 * @param {number[]} xData
 * @param {number[]} yData
 * @param {number} degree
 * @param {number} nPoints
 * @returns {{ x: number, y: number }[]}
 */
export function polynomialCurve(xData, yData, degree = 2, nPoints = 100) {
  const { predict } = polynomialRegression(xData, yData, degree);
  const xMin = Math.min(...xData);
  const xMax = Math.max(...xData);
  const step = (xMax - xMin) / (nPoints - 1);
  const curve = [];
  for (let i = 0; i < nPoints; i++) {
    const x = xMin + i * step;
    curve.push({ x, y: predict(x) });
  }
  return curve;
}
