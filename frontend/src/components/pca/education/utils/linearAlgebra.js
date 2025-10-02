/**
 * Linear Algebra Utilities for PCA Education
 *
 * Pure mathematical functions for matrix operations,
 * eigenvalue/eigenvector computations, and statistical calculations.
 *
 * All functions are client-side, optimized for educational visualization.
 */

/**
 * Calculate mean of array
 * @param {number[]} values - Array of numbers
 * @returns {number} Mean value
 */
export const mean = (values) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

/**
 * Calculate variance of array
 * @param {number[]} values - Array of numbers
 * @returns {number} Variance
 */
export const variance = (values) => {
  if (values.length === 0) return 0;
  const m = mean(values);
  return values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / values.length;
};

/**
 * Calculate standard deviation
 * @param {number[]} values - Array of numbers
 * @returns {number} Standard deviation
 */
export const std = (values) => {
  return Math.sqrt(variance(values));
};

/**
 * Calculate covariance between two arrays
 * @param {number[]} x - First array
 * @param {number[]} y - Second array
 * @returns {number} Covariance
 */
export const covariance = (x, y) => {
  if (x.length !== y.length || x.length === 0) return 0;

  const mx = mean(x);
  const my = mean(y);

  let cov = 0;
  for (let i = 0; i < x.length; i++) {
    cov += (x[i] - mx) * (y[i] - my);
  }

  return cov / x.length;
};

/**
 * Calculate 2D covariance matrix from points
 * @param {Array<{x: number, y: number}>} points - Data points
 * @returns {{xx: number, yy: number, xy: number}} Covariance matrix elements
 */
export const covarianceMatrix2D = (points) => {
  if (points.length === 0) {
    return { xx: 0, yy: 0, xy: 0 };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const mx = mean(xs);
  const my = mean(ys);

  let xx = 0, yy = 0, xy = 0;

  points.forEach(p => {
    const dx = p.x - mx;
    const dy = p.y - my;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  });

  const n = points.length;

  return {
    xx: xx / n,
    yy: yy / n,
    xy: xy / n
  };
};

/**
 * Calculate eigenvalues of 2×2 matrix
 * Uses closed-form solution of characteristic equation
 *
 * @param {number} a - Element (0,0)
 * @param {number} b - Element (0,1)
 * @param {number} c - Element (1,0)
 * @param {number} d - Element (1,1)
 * @returns {{lambda1: number, lambda2: number}} Eigenvalues (descending order)
 */
export const eigenvalues2x2 = (a, b, c, d) => {
  // Characteristic equation: det(A - λI) = 0
  // λ² - tr(A)λ + det(A) = 0

  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;

  // Handle numerical errors
  if (discriminant < 0) {
    console.warn('Negative discriminant in eigenvalue calculation:', discriminant);
    return { lambda1: trace / 2, lambda2: trace / 2 };
  }

  const sqrtDisc = Math.sqrt(discriminant);

  return {
    lambda1: (trace + sqrtDisc) / 2,
    lambda2: (trace - sqrtDisc) / 2
  };
};

/**
 * Calculate eigenvector corresponding to eigenvalue for 2×2 matrix
 *
 * @param {number} a - Element (0,0)
 * @param {number} b - Element (0,1)
 * @param {number} c - Element (1,0)
 * @param {number} d - Element (1,1)
 * @param {number} lambda - Eigenvalue
 * @returns {{x: number, y: number}} Normalized eigenvector
 */
export const eigenvector2x2 = (a, b, c, d, lambda) => {
  // Solve (A - λI)v = 0

  let vx, vy;

  // For diagonal matrices, eigenvectors are standard basis vectors
  if (Math.abs(b) < 1e-10 && Math.abs(c) < 1e-10) {
    if (Math.abs(lambda - d) < Math.abs(lambda - a)) {
      // Eigenvalue closer to d → eigenvector is [0, 1]
      return { x: 0, y: 1 };
    } else {
      // Eigenvalue closer to a → eigenvector is [1, 0]
      return { x: 1, y: 0 };
    }
  }

  // Try using first row: (a - λ)vx + b*vy = 0
  if (Math.abs(b) >= 1e-10) {
    vx = 1;
    vy = -(a - lambda) / b;
  }
  // If b is near zero, use second row: c*vx + (d - λ)vy = 0
  else if (Math.abs(c) >= 1e-10) {
    vx = -(d - lambda) / c;
    vy = 1;
  }
  // Degenerate case (shouldn't happen with valid inputs)
  else {
    return { x: 1, y: 0 };
  }

  // Normalize
  const len = Math.sqrt(vx * vx + vy * vy);

  if (len < 1e-10) {
    // Another degenerate case
    return { x: 1, y: 0 };
  }

  return {
    x: vx / len,
    y: vy / len
  };
};

/**
 * Calculate eigendecomposition of 2×2 covariance matrix
 * Returns eigenvalues and eigenvectors in descending order of eigenvalue magnitude
 *
 * @param {{xx: number, yy: number, xy: number}} cov - Covariance matrix
 * @returns {{
 *   lambda1: number,
 *   lambda2: number,
 *   v1: {x: number, y: number},
 *   v2: {x: number, y: number}
 * }}
 */
export const eigendecomposition2D = (cov) => {
  const { xx, yy, xy } = cov;

  // Calculate eigenvalues
  const eigenvals = eigenvalues2x2(xx, xy, xy, yy);
  const { lambda1, lambda2 } = eigenvals;

  // Special case: identity or near-identity matrix (all eigenvectors valid)
  if (Math.abs(xy) < 1e-10 && Math.abs(xx - yy) < 1e-10) {
    // Return standard orthogonal basis
    return {
      lambda1,
      lambda2,
      v1: { x: 1, y: 0 },
      v2: { x: 0, y: 1 }
    };
  }

  // Calculate eigenvectors
  const v1 = eigenvector2x2(xx, xy, xy, yy, lambda1);
  const v2 = eigenvector2x2(xx, xy, xy, yy, lambda2);

  return {
    lambda1,
    lambda2,
    v1,
    v2
  };
};

/**
 * Project point onto direction vector
 * @param {{x: number, y: number}} point - Point to project
 * @param {{x: number, y: number}} center - Center point (usually mean)
 * @param {{x: number, y: number}} direction - Unit direction vector
 * @returns {{
 *   projection: number,
 *   projectedPoint: {x: number, y: number}
 * }}
 */
export const projectPoint = (point, center, direction) => {
  // Center the point
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  // Project onto direction (dot product)
  const projection = dx * direction.x + dy * direction.y;

  // Projected point in original space
  const projectedPoint = {
    x: center.x + projection * direction.x,
    y: center.y + projection * direction.y
  };

  return { projection, projectedPoint };
};

/**
 * Calculate variance along a direction
 * @param {Array<{x: number, y: number}>} points - Data points
 * @param {number} angle - Direction angle in radians
 * @returns {{
 *   variance: number,
 *   projections: number[],
 *   mean: {x: number, y: number}
 * }}
 */
export const varianceAlongDirection = (points, angle) => {
  if (points.length === 0) {
    return { variance: 0, projections: [], mean: { x: 0, y: 0 } };
  }

  // Direction vector
  const direction = {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };

  // Calculate mean
  const center = {
    x: mean(points.map(p => p.x)),
    y: mean(points.map(p => p.y))
  };

  // Project all points and calculate variance
  const projections = [];
  let sumSquares = 0;

  points.forEach(point => {
    const { projection } = projectPoint(point, center, direction);
    projections.push(projection);
    sumSquares += projection * projection;
  });

  const varianceValue = sumSquares / points.length;

  return {
    variance: varianceValue,
    projections,
    mean: center
  };
};

/**
 * Find angle of maximum variance (brute force search)
 * @param {Array<{x: number, y: number}>} points - Data points
 * @param {number} numSteps - Number of angles to test (default: 180)
 * @returns {{
 *   angle: number,
 *   variance: number
 * }}
 */
export const findMaxVarianceAngle = (points, numSteps = 180) => {
  let maxVar = 0;
  let maxAngle = 0;

  for (let i = 0; i < numSteps; i++) {
    const angle = (i / numSteps) * Math.PI;
    const { variance } = varianceAlongDirection(points, angle);

    if (variance > maxVar) {
      maxVar = variance;
      maxAngle = angle;
    }
  }

  return { angle: maxAngle, variance: maxVar };
};

/**
 * Find angle of maximum variance using eigendecomposition (exact)
 * @param {Array<{x: number, y: number}>} points - Data points
 * @returns {{
 *   angle: number,
 *   variance: number,
 *   eigenvector: {x: number, y: number}
 * }}
 */
export const findMaxVarianceAngleExact = (points) => {
  const cov = covarianceMatrix2D(points);
  const { lambda1, v1 } = eigendecomposition2D(cov);

  const angle = Math.atan2(v1.y, v1.x);

  return {
    angle,
    variance: lambda1,
    eigenvector: v1
  };
};

/**
 * Normalize vector to unit length
 * @param {{x: number, y: number}} vector - Vector to normalize
 * @returns {{x: number, y: number}} Normalized vector
 */
export const normalize = (vector) => {
  const len = Math.sqrt(vector.x * vector.x + vector.y * vector.y);

  if (len < 1e-10) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / len,
    y: vector.y / len
  };
};

/**
 * Dot product of two vectors
 * @param {{x: number, y: number}} v1 - First vector
 * @param {{x: number, y: number}} v2 - Second vector
 * @returns {number} Dot product
 */
export const dot = (v1, v2) => {
  return v1.x * v2.x + v1.y * v2.y;
};

/**
 * Vector magnitude
 * @param {{x: number, y: number}} vector - Vector
 * @returns {number} Magnitude
 */
export const magnitude = (vector) => {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
};

/**
 * Angle between two vectors
 * @param {{x: number, y: number}} v1 - First vector
 * @param {{x: number, y: number}} v2 - Second vector
 * @returns {number} Angle in radians
 */
export const angleBetween = (v1, v2) => {
  const dotProd = dot(v1, v2);
  const mag1 = magnitude(v1);
  const mag2 = magnitude(v2);

  if (mag1 < 1e-10 || mag2 < 1e-10) return 0;

  const cosTheta = dotProd / (mag1 * mag2);

  // Clamp to [-1, 1] to handle numerical errors
  const clamped = Math.max(-1, Math.min(1, cosTheta));

  return Math.acos(clamped);
};

/**
 * Matrix-vector multiplication (2×2 matrix × 2D vector)
 * @param {{xx: number, xy: number, yx: number, yy: number}} matrix - Matrix
 * @param {{x: number, y: number}} vector - Vector
 * @returns {{x: number, y: number}} Result vector
 */
export const matrixVectorMultiply = (matrix, vector) => {
  return {
    x: matrix.xx * vector.x + matrix.xy * vector.y,
    y: matrix.yx * vector.x + matrix.yy * vector.y
  };
};

/**
 * Check if two vectors are approximately orthogonal
 * @param {{x: number, y: number}} v1 - First vector
 * @param {{x: number, y: number}} v2 - Second vector
 * @param {number} tolerance - Tolerance (default: 1e-6)
 * @returns {boolean} True if orthogonal
 */
export const areOrthogonal = (v1, v2, tolerance = 1e-6) => {
  return Math.abs(dot(v1, v2)) < tolerance;
};
