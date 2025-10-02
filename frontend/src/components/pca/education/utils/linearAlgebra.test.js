/**
 * Linear Algebra Utilities - Test Suite
 *
 * Enterprise-grade test coverage for mathematical functions.
 * Validates correctness against known analytical solutions.
 */

import {
  mean,
  variance,
  std,
  covariance,
  covarianceMatrix2D,
  eigenvalues2x2,
  eigenvector2x2,
  eigendecomposition2D,
  projectPoint,
  varianceAlongDirection,
  findMaxVarianceAngle,
  findMaxVarianceAngleExact,
  normalize,
  dot,
  magnitude,
  angleBetween,
  matrixVectorMultiply,
  areOrthogonal
} from './linearAlgebra';

describe('Basic Statistics', () => {
  test('mean - simple array', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  test('mean - empty array', () => {
    expect(mean([])).toBe(0);
  });

  test('mean - negative numbers', () => {
    expect(mean([-2, -1, 0, 1, 2])).toBe(0);
  });

  test('variance - known values', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    // Variance = 4
    expect(variance(data)).toBeCloseTo(4, 5);
  });

  test('variance - constant array', () => {
    expect(variance([5, 5, 5, 5])).toBe(0);
  });

  test('std - known values', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    // Std = 2
    expect(std(data)).toBeCloseTo(2, 5);
  });

  test('covariance - perfect positive correlation', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(covariance(x, y)).toBeCloseTo(4, 5);
  });

  test('covariance - no correlation', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 5, 5, 5, 5];
    expect(covariance(x, y)).toBeCloseTo(0, 5);
  });
});

describe('Covariance Matrix', () => {
  test('covarianceMatrix2D - unit circle', () => {
    const points = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 }
    ];

    const cov = covarianceMatrix2D(points);

    // Should be symmetric
    expect(cov.xy).toBeCloseTo(0, 5);

    // Variances should be equal for circle
    expect(cov.xx).toBeCloseTo(cov.yy, 5);
  });

  test('covarianceMatrix2D - diagonal line y=x', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 }
    ];

    const cov = covarianceMatrix2D(points);

    // Perfect correlation: cov(x,y) should equal var(x)
    expect(cov.xy).toBeCloseTo(cov.xx, 5);
    expect(cov.xy).toBeCloseTo(cov.yy, 5);
  });

  test('covarianceMatrix2D - empty array', () => {
    const cov = covarianceMatrix2D([]);
    expect(cov.xx).toBe(0);
    expect(cov.yy).toBe(0);
    expect(cov.xy).toBe(0);
  });
});

describe('Eigenvalue Computation', () => {
  test('eigenvalues2x2 - identity matrix', () => {
    const { lambda1, lambda2 } = eigenvalues2x2(1, 0, 0, 1);
    expect(lambda1).toBeCloseTo(1, 5);
    expect(lambda2).toBeCloseTo(1, 5);
  });

  test('eigenvalues2x2 - diagonal matrix', () => {
    const { lambda1, lambda2 } = eigenvalues2x2(4, 0, 0, 9);
    expect(lambda1).toBeCloseTo(9, 5);
    expect(lambda2).toBeCloseTo(4, 5);
  });

  test('eigenvalues2x2 - known example', () => {
    // Matrix: [[3, 1], [1, 3]]
    // Eigenvalues: 4, 2
    const { lambda1, lambda2 } = eigenvalues2x2(3, 1, 1, 3);
    expect(lambda1).toBeCloseTo(4, 5);
    expect(lambda2).toBeCloseTo(2, 5);
  });

  test('eigenvalues2x2 - symmetric matrix', () => {
    // Matrix: [[5, 2], [2, 2]]
    // Eigenvalues: 6, 1
    const { lambda1, lambda2 } = eigenvalues2x2(5, 2, 2, 2);
    expect(lambda1).toBeCloseTo(6, 5);
    expect(lambda2).toBeCloseTo(1, 5);
  });
});

describe('Eigenvector Computation', () => {
  test('eigenvector2x2 - identity matrix', () => {
    const v = eigenvector2x2(1, 0, 0, 1, 1);
    // Any unit vector is an eigenvector of identity
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    expect(len).toBeCloseTo(1, 5);
  });

  test('eigenvector2x2 - diagonal matrix', () => {
    // Matrix: [[4, 0], [0, 9]], eigenvalue 9
    const v = eigenvector2x2(4, 0, 0, 9, 9);
    // Eigenvector should be [0, 1] (y-axis)
    expect(Math.abs(v.y)).toBeCloseTo(1, 5);
    expect(Math.abs(v.x)).toBeCloseTo(0, 5);
  });

  test('eigenvector2x2 - known example', () => {
    // Matrix: [[3, 1], [1, 3]], eigenvalue 4
    const v = eigenvector2x2(3, 1, 1, 3, 4);
    // Eigenvector: [1, 1] normalized = [1/√2, 1/√2]
    expect(Math.abs(v.x)).toBeCloseTo(1 / Math.sqrt(2), 5);
    expect(Math.abs(v.y)).toBeCloseTo(1 / Math.sqrt(2), 5);
  });

  test('eigenvector2x2 - normalization', () => {
    const v = eigenvector2x2(5, 2, 2, 2, 6);
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    expect(len).toBeCloseTo(1, 5);
  });
});

describe('Eigendecomposition', () => {
  test('eigendecomposition2D - identity covariance', () => {
    const cov = { xx: 1, yy: 1, xy: 0 };
    const { lambda1, lambda2, v1, v2 } = eigendecomposition2D(cov);

    expect(lambda1).toBeCloseTo(1, 5);
    expect(lambda2).toBeCloseTo(1, 5);

    // Eigenvectors should be orthogonal
    const dotProd = v1.x * v2.x + v1.y * v2.y;
    expect(Math.abs(dotProd)).toBeLessThan(1e-5);
  });

  test('eigendecomposition2D - elongated ellipse', () => {
    const cov = { xx: 4, yy: 1, xy: 0 };
    const { lambda1, lambda2 } = eigendecomposition2D(cov);

    // Larger eigenvalue should be 4, smaller 1
    expect(lambda1).toBeCloseTo(4, 5);
    expect(lambda2).toBeCloseTo(1, 5);
  });

  test('eigendecomposition2D - correlated data', () => {
    const cov = { xx: 2, yy: 2, xy: 1.5 };
    const { lambda1, lambda2, v1, v2 } = eigendecomposition2D(cov);

    // lambda1 > lambda2
    expect(lambda1).toBeGreaterThan(lambda2);

    // Eigenvectors should be unit length
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    expect(len1).toBeCloseTo(1, 5);
    expect(len2).toBeCloseTo(1, 5);

    // Eigenvectors should be orthogonal
    const dotProd = v1.x * v2.x + v1.y * v2.y;
    expect(Math.abs(dotProd)).toBeLessThan(1e-5);
  });

  test('eigendecomposition2D - trace and determinant', () => {
    const cov = { xx: 3, yy: 5, xy: 2 };
    const { lambda1, lambda2 } = eigendecomposition2D(cov);

    // Trace = sum of eigenvalues
    expect(lambda1 + lambda2).toBeCloseTo(cov.xx + cov.yy, 5);

    // Determinant = product of eigenvalues
    expect(lambda1 * lambda2).toBeCloseTo(cov.xx * cov.yy - cov.xy * cov.xy, 5);
  });
});

describe('Point Projection', () => {
  test('projectPoint - onto x-axis', () => {
    const point = { x: 3, y: 4 };
    const center = { x: 0, y: 0 };
    const direction = { x: 1, y: 0 };

    const { projection, projectedPoint } = projectPoint(point, center, direction);

    expect(projection).toBeCloseTo(3, 5);
    expect(projectedPoint.x).toBeCloseTo(3, 5);
    expect(projectedPoint.y).toBeCloseTo(0, 5);
  });

  test('projectPoint - onto y-axis', () => {
    const point = { x: 3, y: 4 };
    const center = { x: 0, y: 0 };
    const direction = { x: 0, y: 1 };

    const { projection, projectedPoint } = projectPoint(point, center, direction);

    expect(projection).toBeCloseTo(4, 5);
    expect(projectedPoint.x).toBeCloseTo(0, 5);
    expect(projectedPoint.y).toBeCloseTo(4, 5);
  });

  test('projectPoint - onto diagonal', () => {
    const point = { x: 2, y: 0 };
    const center = { x: 0, y: 0 };
    const direction = { x: 1 / Math.sqrt(2), y: 1 / Math.sqrt(2) };

    const { projection, projectedPoint } = projectPoint(point, center, direction);

    expect(projection).toBeCloseTo(Math.sqrt(2), 5);
    expect(projectedPoint.x).toBeCloseTo(1, 5);
    expect(projectedPoint.y).toBeCloseTo(1, 5);
  });
});

describe('Variance Along Direction', () => {
  test('varianceAlongDirection - horizontal data', () => {
    const points = [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ];

    // Variance along x-axis should be maximum
    const result = varianceAlongDirection(points, 0);
    expect(result.variance).toBeGreaterThan(0);

    // Variance along y-axis should be zero
    const resultY = varianceAlongDirection(points, Math.PI / 2);
    expect(resultY.variance).toBeCloseTo(0, 5);
  });

  test('varianceAlongDirection - diagonal data', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 }
    ];

    // Maximum variance along diagonal (45°)
    const result45 = varianceAlongDirection(points, Math.PI / 4);

    // Less variance perpendicular to diagonal
    const result135 = varianceAlongDirection(points, (3 * Math.PI) / 4);

    expect(result45.variance).toBeGreaterThan(result135.variance);
  });
});

describe('Maximum Variance Finding', () => {
  test('findMaxVarianceAngle - horizontal data', () => {
    const points = [
      { x: -2, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ];

    const { angle } = findMaxVarianceAngle(points, 180);

    // Should find 0° (horizontal)
    expect(angle).toBeCloseTo(0, 1);
  });

  test('findMaxVarianceAngleExact - diagonal data', () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 }
    ];

    const { angle, variance, eigenvector } = findMaxVarianceAngleExact(points);

    // Should find 45° (diagonal)
    expect(angle).toBeCloseTo(Math.PI / 4, 2);

    // Eigenvector should point along diagonal
    expect(Math.abs(eigenvector.x)).toBeCloseTo(Math.abs(eigenvector.y), 2);
  });

  test('findMaxVarianceAngle vs Exact - consistency', () => {
    const points = [
      { x: 1, y: 0.5 },
      { x: 2, y: 1 },
      { x: 3, y: 1.5 },
      { x: 4, y: 2 }
    ];

    const brute = findMaxVarianceAngle(points, 360);
    const exact = findMaxVarianceAngleExact(points);

    // Angles should be close
    expect(Math.abs(brute.angle - exact.angle)).toBeLessThan(0.1);
  });
});

describe('Vector Operations', () => {
  test('normalize - arbitrary vector', () => {
    const v = normalize({ x: 3, y: 4 });
    expect(v.x).toBeCloseTo(0.6, 5);
    expect(v.y).toBeCloseTo(0.8, 5);

    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    expect(len).toBeCloseTo(1, 5);
  });

  test('normalize - zero vector', () => {
    const v = normalize({ x: 0, y: 0 });
    // Should return default unit vector
    expect(v.x).toBe(1);
    expect(v.y).toBe(0);
  });

  test('dot - perpendicular vectors', () => {
    const v1 = { x: 1, y: 0 };
    const v2 = { x: 0, y: 1 };
    expect(dot(v1, v2)).toBeCloseTo(0, 5);
  });

  test('dot - parallel vectors', () => {
    const v1 = { x: 2, y: 3 };
    const v2 = { x: 4, y: 6 };
    expect(dot(v1, v2)).toBeCloseTo(26, 5);
  });

  test('magnitude - known values', () => {
    expect(magnitude({ x: 3, y: 4 })).toBeCloseTo(5, 5);
    expect(magnitude({ x: 1, y: 0 })).toBeCloseTo(1, 5);
  });

  test('angleBetween - perpendicular', () => {
    const v1 = { x: 1, y: 0 };
    const v2 = { x: 0, y: 1 };
    expect(angleBetween(v1, v2)).toBeCloseTo(Math.PI / 2, 5);
  });

  test('angleBetween - parallel', () => {
    const v1 = { x: 1, y: 1 };
    const v2 = { x: 2, y: 2 };
    expect(angleBetween(v1, v2)).toBeCloseTo(0, 5);
  });

  test('angleBetween - opposite', () => {
    const v1 = { x: 1, y: 0 };
    const v2 = { x: -1, y: 0 };
    expect(angleBetween(v1, v2)).toBeCloseTo(Math.PI, 5);
  });
});

describe('Matrix Operations', () => {
  test('matrixVectorMultiply - identity', () => {
    const matrix = { xx: 1, xy: 0, yx: 0, yy: 1 };
    const vector = { x: 3, y: 4 };
    const result = matrixVectorMultiply(matrix, vector);

    expect(result.x).toBeCloseTo(3, 5);
    expect(result.y).toBeCloseTo(4, 5);
  });

  test('matrixVectorMultiply - scaling', () => {
    const matrix = { xx: 2, xy: 0, yx: 0, yy: 3 };
    const vector = { x: 1, y: 1 };
    const result = matrixVectorMultiply(matrix, vector);

    expect(result.x).toBeCloseTo(2, 5);
    expect(result.y).toBeCloseTo(3, 5);
  });

  test('matrixVectorMultiply - rotation 90°', () => {
    const matrix = { xx: 0, xy: -1, yx: 1, yy: 0 };
    const vector = { x: 1, y: 0 };
    const result = matrixVectorMultiply(matrix, vector);

    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(1, 5);
  });

  test('areOrthogonal - perpendicular vectors', () => {
    const v1 = { x: 1, y: 0 };
    const v2 = { x: 0, y: 1 };
    expect(areOrthogonal(v1, v2)).toBe(true);
  });

  test('areOrthogonal - non-perpendicular vectors', () => {
    const v1 = { x: 1, y: 0 };
    const v2 = { x: 1, y: 1 };
    expect(areOrthogonal(v1, v2)).toBe(false);
  });
});

describe('Edge Cases and Robustness', () => {
  test('handles negative eigenvalues gracefully', () => {
    // This shouldn't happen with valid covariance matrices,
    // but test robustness
    const { lambda1, lambda2 } = eigenvalues2x2(1, 10, 10, 1);
    expect(lambda1).toBeGreaterThanOrEqual(lambda2);
  });

  test('handles near-singular matrices', () => {
    const cov = { xx: 1e-10, yy: 1e-10, xy: 0 };
    const { lambda1, lambda2 } = eigendecomposition2D(cov);
    expect(lambda1).toBeGreaterThanOrEqual(0);
    expect(lambda2).toBeGreaterThanOrEqual(0);
  });

  test('handles large numbers', () => {
    const points = [
      { x: 1e6, y: 1e6 },
      { x: 2e6, y: 2e6 }
    ];
    const cov = covarianceMatrix2D(points);
    expect(cov.xx).toBeGreaterThan(0);
    expect(cov.yy).toBeGreaterThan(0);
  });
});
