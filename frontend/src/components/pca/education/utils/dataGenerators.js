/**
 * Data Generators for PCA Education
 *
 * Synthetic dataset generation for educational visualizations.
 * Each generator creates point clouds with specific statistical properties.
 */

/**
 * Generate correlated 2D data
 * @param {number} n - Number of points
 * @param {number} correlation - Correlation coefficient (-1 to 1)
 * @param {number} centerX - Center x coordinate
 * @param {number} centerY - Center y coordinate
 * @param {number} scaleX - X scale
 * @param {number} scaleY - Y scale
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateCorrelated = (
  n = 50,
  correlation = 0.8,
  centerX = 0,
  centerY = 0,
  scaleX = 1,
  scaleY = 1
) => {
  const points = [];

  for (let i = 0; i < n; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

    // Generate correlated variables using Cholesky decomposition
    // For 2D: L = [[1, 0], [ρ, √(1-ρ²)]]
    const x = z1;
    const y = correlation * z1 + Math.sqrt(1 - correlation * correlation) * z2;

    points.push({
      x: centerX + x * scaleX,
      y: centerY + y * scaleY
    });
  }

  return points;
};

/**
 * Generate circular (uncorrelated) 2D data
 * @param {number} n - Number of points
 * @param {number} centerX - Center x coordinate
 * @param {number} centerY - Center y coordinate
 * @param {number} radius - Radius of circle
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateCircular = (
  n = 50,
  centerX = 0,
  centerY = 0,
  radius = 1
) => {
  const points = [];

  for (let i = 0; i < n; i++) {
    // Box-Muller for independent normal variables
    const u1 = Math.random();
    const u2 = Math.random();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

    points.push({
      x: centerX + z1 * radius,
      y: centerY + z2 * radius
    });
  }

  return points;
};

/**
 * Generate uniformly random 2D data
 * @param {number} n - Number of points
 * @param {number} minX - Minimum x
 * @param {number} maxX - Maximum x
 * @param {number} minY - Minimum y
 * @param {number} maxY - Maximum y
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateRandom = (
  n = 50,
  minX = -2,
  maxX = 2,
  minY = -2,
  maxY = 2
) => {
  const points = [];

  for (let i = 0; i < n; i++) {
    points.push({
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY)
    });
  }

  return points;
};

/**
 * Generate diagonal line data
 * @param {number} n - Number of points
 * @param {number} slope - Line slope
 * @param {number} intercept - Y-intercept
 * @param {number} noise - Noise level (std dev)
 * @param {number} minX - Minimum x
 * @param {number} maxX - Maximum x
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateDiagonal = (
  n = 50,
  slope = 1,
  intercept = 0,
  noise = 0.2,
  minX = -2,
  maxX = 2
) => {
  const points = [];

  for (let i = 0; i < n; i++) {
    const x = minX + (i / (n - 1)) * (maxX - minX);

    // Add Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    const gaussianNoise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    const y = slope * x + intercept + gaussianNoise * noise;

    points.push({ x, y });
  }

  return points;
};

/**
 * Generate anisotropic Gaussian (stretched ellipse)
 * @param {number} n - Number of points
 * @param {number} centerX - Center x
 * @param {number} centerY - Center y
 * @param {number} majorAxis - Major axis length
 * @param {number} minorAxis - Minor axis length
 * @param {number} angle - Rotation angle in radians
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateElliptical = (
  n = 50,
  centerX = 0,
  centerY = 0,
  majorAxis = 2,
  minorAxis = 0.5,
  angle = Math.PI / 4
) => {
  const points = [];

  for (let i = 0; i < n; i++) {
    // Generate point in axis-aligned ellipse
    const u1 = Math.random();
    const u2 = Math.random();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

    const x = z1 * majorAxis;
    const y = z2 * minorAxis;

    // Rotate
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const xRot = x * cos - y * sin;
    const yRot = x * sin + y * cos;

    points.push({
      x: centerX + xRot,
      y: centerY + yRot
    });
  }

  return points;
};

/**
 * Generate two-cluster data
 * @param {number} n - Points per cluster
 * @param {Object} cluster1 - First cluster params {centerX, centerY, scaleX, scaleY}
 * @param {Object} cluster2 - Second cluster params {centerX, centerY, scaleX, scaleY}
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateTwoClusters = (
  n = 25,
  cluster1 = { centerX: -1, centerY: -1, scaleX: 0.5, scaleY: 0.5 },
  cluster2 = { centerX: 1, centerY: 1, scaleX: 0.5, scaleY: 0.5 }
) => {
  const points1 = generateCircular(n, cluster1.centerX, cluster1.centerY, cluster1.scaleX);
  const points2 = generateCircular(n, cluster2.centerX, cluster2.centerY, cluster2.scaleX);

  return [...points1, ...points2];
};

/**
 * Generate Swiss roll pattern (for nonlinear PCA demos)
 * @param {number} n - Number of points
 * @param {number} noise - Noise level
 * @returns {Array<{x: number, y: number}>} Data points (2D projection of 3D Swiss roll)
 */
export const generateSwissRoll = (n = 100, noise = 0.1) => {
  const points = [];

  for (let i = 0; i < n; i++) {
    const t = 1.5 * Math.PI * (1 + 2 * i / n);

    // Add noise
    const u1 = Math.random();
    const u2 = Math.random();
    const noiseX = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * noise;
    const noiseY = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2) * noise;

    points.push({
      x: t * Math.cos(t) + noiseX,
      y: t * Math.sin(t) + noiseY
    });
  }

  return points;
};

/**
 * Generate S-curve pattern (for manifold learning demos)
 * @param {number} n - Number of points
 * @param {number} noise - Noise level
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateSCurve = (n = 100, noise = 0.1) => {
  const points = [];

  for (let i = 0; i < n; i++) {
    const t = -1 + 2 * i / n;

    // Add noise
    const u1 = Math.random();
    const u2 = Math.random();
    const noiseX = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * noise;
    const noiseY = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2) * noise;

    points.push({
      x: Math.sin(Math.PI * t) + noiseX,
      y: 2 * t + noiseY
    });
  }

  return points;
};

/**
 * Generate moon-shaped pattern (for nonlinear separation demos)
 * @param {number} n - Points per moon
 * @param {number} noise - Noise level
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateMoons = (n = 50, noise = 0.1) => {
  const points = [];

  // Upper moon
  for (let i = 0; i < n; i++) {
    const angle = Math.PI * i / n;

    const u1 = Math.random();
    const u2 = Math.random();
    const noiseX = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * noise;
    const noiseY = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2) * noise;

    points.push({
      x: Math.cos(angle) + noiseX,
      y: Math.sin(angle) + noiseY
    });
  }

  // Lower moon (shifted and rotated)
  for (let i = 0; i < n; i++) {
    const angle = Math.PI * i / n;

    const u1 = Math.random();
    const u2 = Math.random();
    const noiseX = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * noise;
    const noiseY = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2) * noise;

    points.push({
      x: 1 - Math.cos(angle) + noiseX,
      y: 0.5 - Math.sin(angle) + noiseY
    });
  }

  return points;
};

/**
 * Generate dataset by type name (convenience function)
 * @param {string} type - Dataset type name
 * @param {number} n - Number of points
 * @param {Object} options - Additional options
 * @returns {Array<{x: number, y: number}>} Data points
 */
export const generateDataset = (type, n = 50, options = {}) => {
  switch (type) {
    case 'correlated':
      return generateCorrelated(n, options.correlation || 0.8);
    case 'circular':
      return generateCircular(n);
    case 'random':
      return generateRandom(n);
    case 'diagonal':
      return generateDiagonal(n, options.slope || 1, options.intercept || 0, options.noise || 0.2);
    case 'elliptical':
      return generateElliptical(n, 0, 0, 2, 0.5, Math.PI / 4);
    case 'two-clusters':
      return generateTwoClusters(n / 2);
    case 'swiss-roll':
      return generateSwissRoll(n);
    case 's-curve':
      return generateSCurve(n);
    case 'moons':
      return generateMoons(n / 2);
    default:
      return generateCorrelated(n);
  }
};

/**
 * Normalize points to fit in bounding box
 * @param {Array<{x: number, y: number}>} points - Points to normalize
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @param {number} padding - Padding ratio (0-1)
 * @returns {Array<{x: number, y: number}>} Normalized points
 */
export const normalizePoints = (points, width, height, padding = 0.1) => {
  if (points.length === 0) return [];

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const paddingX = rangeX * padding;
  const paddingY = rangeY * padding;

  return points.map(p => ({
    x: ((p.x - minX) / rangeX) * (width * (1 - 2 * padding)) + width * padding,
    y: ((p.y - minY) / rangeY) * (height * (1 - 2 * padding)) + height * padding
  }));
};

/**
 * Center and scale points
 * @param {Array<{x: number, y: number}>} points - Points to transform
 * @returns {{
 *   centered: Array<{x: number, y: number}>,
 *   mean: {x: number, y: number},
 *   scale: number
 * }}
 */
export const centerAndScale = (points) => {
  if (points.length === 0) {
    return { centered: [], mean: { x: 0, y: 0 }, scale: 1 };
  }

  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  const centered = points.map(p => ({
    x: p.x - meanX,
    y: p.y - meanY
  }));

  // Find max distance from origin for scaling
  const maxDist = Math.max(...centered.map(p => Math.sqrt(p.x * p.x + p.y * p.y)));
  const scale = maxDist || 1;

  return {
    centered,
    mean: { x: meanX, y: meanY },
    scale
  };
};
