/**
 * Bayesian Power Analysis Calculations
 *
 * Functions for Bayesian approaches to study design:
 * - Bayes Factor calculations
 * - Assurance (Bayesian power)
 * - Precision-based sample size planning
 * - Prior elicitation helpers
 *
 * References:
 * - Schönbrodt & Wagenmakers (2018). Bayes factor design analysis.
 * - O'Hagan et al. (2005). Assurance in clinical trial design.
 */

import { normalPDF, normalQuantile, tPDF } from './distributionFunctions';

// ============================================================================
// BAYES FACTOR CALCULATIONS
// ============================================================================

/**
 * Calculate Bayes Factor for t-test (BF₁₀)
 *
 * Uses Rouder's JZS (Jeffreys-Zellner-Siow) prior.
 * BF₁₀ > 1 supports H₁, BF₁₀ < 1 supports H₀
 *
 * Interpretation (Jeffreys, 1961):
 * - BF > 100: Extreme evidence for H₁
 * - BF > 30: Very strong evidence
 * - BF > 10: Strong evidence
 * - BF > 3: Moderate evidence
 * - BF > 1: Anecdotal evidence
 * - BF = 1: No evidence
 * - BF < 1: Evidence for H₀
 *
 * @param {number} t - t-statistic
 * @param {number} n1 - Sample size group 1
 * @param {number} n2 - Sample size group 2 (0 for one-sample)
 * @param {number} r - Scale parameter for Cauchy prior (default √2/2 ≈ 0.707)
 * @returns {Object} { bf10, bf01, interpretation }
 */
export function bayesFactorTTest(t, n1, n2 = 0, r = Math.SQRT2 / 2) {
  const n = n2 === 0 ? n1 : n1 + n2;
  const df = n2 === 0 ? n1 - 1 : n1 + n2 - 2;

  // Effective sample size
  const nEff = n2 === 0 ? n1 : (n1 * n2) / (n1 + n2);

  // JZS Bayes Factor (Rouder et al., 2009)
  // Using approximation for computational efficiency
  const v = df;
  const tSquared = t * t;

  // Savage-Dickey density ratio approximation
  // For small effect sizes, BF ≈ √(1 + nEff * r²) / (1 + tSquared / v)^((v+1)/2)
  // * integral adjustment

  // More accurate: numerical integration
  const bf10 = computeJZSBayesFactor(t, nEff, v, r);

  return {
    bf10: bf10,
    bf01: 1 / bf10,
    logBF10: Math.log(bf10),
    interpretation: interpretBayesFactor(bf10)
  };
}

/**
 * Compute JZS Bayes Factor using numerical integration
 *
 * @param {number} t - t-statistic
 * @param {number} nEff - Effective sample size
 * @param {number} v - Degrees of freedom
 * @param {number} r - Scale parameter
 * @returns {number} BF₁₀
 */
function computeJZSBayesFactor(t, nEff, v, r) {
  // Numerator: likelihood under H₁ (integrated over prior)
  // Using Gauss-Legendre quadrature

  const nPoints = 100;
  const { nodes, weights } = gaussLegendreNodes(nPoints);

  let numerator = 0;

  // Transform from [-1, 1] to [0, ∞) using tan transformation
  for (let i = 0; i < nPoints; i++) {
    // Map to (0, π/2)
    const theta = (Math.PI / 4) * (nodes[i] + 1);
    const delta = Math.tan(theta); // Effect size parameter

    // Cauchy prior on delta
    const prior = cauchyPDF(delta, 0, r);

    // Likelihood: non-central t
    const ncp = delta * Math.sqrt(nEff);

    // Use normal approximation for large v
    const likelihood = v > 30
      ? normalPDF(t - ncp)
      : approxNonCentralTPDF(t, v, ncp);

    // Jacobian for transformation
    const jacobian = (Math.PI / 4) * (1 + delta * delta);

    numerator += weights[i] * prior * likelihood * jacobian;
  }

  // Denominator: likelihood under H₀
  const denominator = tPDF(t, v);

  // Avoid division by zero
  if (denominator < 1e-300) return numerator > 1e-300 ? Infinity : 1;

  return numerator / denominator;
}

/**
 * Cauchy probability density function
 *
 * f(x) = 1 / (π × γ × (1 + ((x - x₀) / γ)²))
 *
 * @param {number} x - Input value
 * @param {number} x0 - Location parameter (default 0)
 * @param {number} gamma - Scale parameter
 * @returns {number} PDF value
 */
export function cauchyPDF(x, x0 = 0, gamma = 1) {
  const z = (x - x0) / gamma;
  return 1 / (Math.PI * gamma * (1 + z * z));
}

/**
 * Approximate non-central t PDF (for BF calculation)
 *
 * @param {number} t - Input value
 * @param {number} v - Degrees of freedom
 * @param {number} ncp - Non-centrality parameter
 * @returns {number} Approximate PDF value
 */
function approxNonCentralTPDF(t, v, ncp) {
  // Use series expansion approximation
  const z = (t - ncp) * Math.sqrt(v / (v + t * t / 2));
  return normalPDF(z) * Math.sqrt(v / (v + t * t / 2));
}

/**
 * Interpret Bayes Factor according to Jeffreys (1961) scale
 *
 * @param {number} bf - Bayes Factor (BF₁₀)
 * @returns {Object} { category, description }
 */
export function interpretBayesFactor(bf) {
  if (bf > 100) return { category: 'extreme', description: 'Extreme evidence for H₁' };
  if (bf > 30) return { category: 'very_strong', description: 'Very strong evidence for H₁' };
  if (bf > 10) return { category: 'strong', description: 'Strong evidence for H₁' };
  if (bf > 3) return { category: 'moderate', description: 'Moderate evidence for H₁' };
  if (bf > 1) return { category: 'anecdotal', description: 'Anecdotal evidence for H₁' };
  if (bf === 1) return { category: 'none', description: 'No evidence either way' };
  if (bf > 1/3) return { category: 'anecdotal_h0', description: 'Anecdotal evidence for H₀' };
  if (bf > 1/10) return { category: 'moderate_h0', description: 'Moderate evidence for H₀' };
  if (bf > 1/30) return { category: 'strong_h0', description: 'Strong evidence for H₀' };
  if (bf > 1/100) return { category: 'very_strong_h0', description: 'Very strong evidence for H₀' };
  return { category: 'extreme_h0', description: 'Extreme evidence for H₀' };
}

// ============================================================================
// ASSURANCE (BAYESIAN POWER)
// ============================================================================

/**
 * Calculate assurance (Bayesian power)
 *
 * Assurance = E[P(BF > threshold | δ)] = ∫ P(BF > threshold | δ) × π(δ) dδ
 *
 * This is the expected probability of obtaining compelling evidence
 * (BF exceeding a threshold) given uncertainty about the true effect size.
 *
 * @param {number} n1 - Sample size group 1
 * @param {number} n2 - Sample size group 2 (0 for one-sample)
 * @param {Function} priorPDF - Prior PDF for effect size δ
 * @param {number} bfThreshold - BF threshold for "success" (default 10)
 * @param {number} r - Scale for JZS prior (default √2/2)
 * @returns {Object} { assurance, details }
 */
export function calculateAssurance(n1, n2, priorPDF, bfThreshold = 10, r = Math.SQRT2 / 2) {
  const nPoints = 50;
  const { nodes, weights } = gaussLegendreNodes(nPoints);

  let assurance = 0;
  const details = [];

  // Integrate over plausible effect sizes (map [-1, 1] to [-3, 3])
  for (let i = 0; i < nPoints; i++) {
    const delta = 3 * nodes[i]; // Effect size in range [-3, 3]

    // Prior probability at this effect size
    const prior = priorPDF(delta);

    if (prior > 1e-10) {
      // Probability of achieving BF > threshold at this effect size
      const probSuccess = probBFExceedsThreshold(n1, n2, delta, bfThreshold, r);

      assurance += 3 * weights[i] * prior * probSuccess;

      details.push({ delta, prior, probSuccess });
    }
  }

  return {
    assurance: Math.max(0, Math.min(1, assurance)),
    details: details
  };
}

/**
 * Probability that BF exceeds threshold given true effect size
 *
 * Uses simulation-based approximation.
 *
 * @param {number} n1 - Sample size group 1
 * @param {number} n2 - Sample size group 2
 * @param {number} delta - True effect size
 * @param {number} threshold - BF threshold
 * @param {number} r - Scale parameter
 * @returns {number} P(BF > threshold | δ)
 */
function probBFExceedsThreshold(n1, n2, delta, threshold, r) {
  const nEff = n2 === 0 ? n1 : (n1 * n2) / (n1 + n2);
  const df = n2 === 0 ? n1 - 1 : n1 + n2 - 2;

  // Expected t-statistic distribution: non-central t with ncp = delta * sqrt(nEff)
  const ncp = delta * Math.sqrt(nEff);

  // Monte Carlo approximation
  const nSims = 1000;
  let count = 0;

  for (let i = 0; i < nSims; i++) {
    // Sample from non-central t distribution
    const t = sampleNonCentralT(df, ncp);

    // Calculate BF for this t
    const bf = computeJZSBayesFactor(t, nEff, df, r);

    if (bf > threshold) count++;
  }

  return count / nSims;
}

/**
 * Sample from non-central t distribution
 *
 * @param {number} df - Degrees of freedom
 * @param {number} ncp - Non-centrality parameter
 * @returns {number} Random sample
 */
function sampleNonCentralT(df, ncp) {
  // Non-central t = (Z + ncp) / sqrt(χ²/df)
  const z = sampleStandardNormal();
  const chi2 = sampleChiSquare(df);
  return (z + ncp) / Math.sqrt(chi2 / df);
}

// ============================================================================
// PRECISION-BASED SAMPLE SIZE
// ============================================================================

/**
 * Calculate sample size for desired posterior credible interval width
 *
 * Plans for sample size that achieves a credible interval of specified width.
 *
 * @param {number} targetWidth - Desired credible interval half-width
 * @param {number} priorSD - Prior standard deviation for effect size
 * @param {number} sigma - Expected data standard deviation
 * @param {number} credibleLevel - Credible level (default 0.95)
 * @returns {Object} { n, expectedWidth, posteriorSD }
 */
export function sampleSizeForPrecision(targetWidth, priorSD, sigma, credibleLevel = 0.95) {
  const z = normalQuantile((1 + credibleLevel) / 2);

  // For normal-normal conjugate model:
  // Posterior precision = Prior precision + Data precision
  // Posterior variance = 1 / (1/priorSD² + n/sigma²)

  // Solve for n such that z * posteriorSD = targetWidth
  // posteriorSD = 1 / sqrt(1/priorSD² + n/sigma²)
  // z / sqrt(1/priorSD² + n/sigma²) = targetWidth
  // 1/priorSD² + n/sigma² = (z/targetWidth)²
  // n = sigma² × ((z/targetWidth)² - 1/priorSD²)

  const n = sigma * sigma * (Math.pow(z / targetWidth, 2) - 1 / (priorSD * priorSD));

  const actualN = Math.max(Math.ceil(n), 2);

  // Calculate actual posterior SD and width
  const posteriorVar = 1 / (1 / (priorSD * priorSD) + actualN / (sigma * sigma));
  const posteriorSD = Math.sqrt(posteriorVar);
  const expectedWidth = z * posteriorSD;

  return {
    n: actualN,
    expectedWidth: expectedWidth,
    posteriorSD: posteriorSD
  };
}

// ============================================================================
// PRIOR ELICITATION HELPERS
// ============================================================================

/**
 * Create normal prior from percentile beliefs
 *
 * "I believe there's a 95% chance the effect is between low and high"
 *
 * @param {number} low - Lower bound (2.5th percentile)
 * @param {number} high - Upper bound (97.5th percentile)
 * @param {number} level - Credible level (default 0.95)
 * @returns {Object} { mean, sd, pdf }
 */
export function normalPriorFromPercentiles(low, high, level = 0.95) {
  const z = normalQuantile((1 + level) / 2);
  const mean = (low + high) / 2;
  const sd = (high - low) / (2 * z);

  return {
    mean: mean,
    sd: sd,
    pdf: (x) => normalPDF((x - mean) / sd) / sd
  };
}

/**
 * Create half-normal prior (for positive effect sizes)
 *
 * @param {number} sd - Scale parameter
 * @returns {Object} { sd, pdf, mean, mode }
 */
export function halfNormalPrior(sd) {
  return {
    sd: sd,
    pdf: (x) => x >= 0 ? 2 * normalPDF(x / sd) / sd : 0,
    mean: sd * Math.sqrt(2 / Math.PI),
    mode: 0
  };
}

/**
 * Create informed prior from meta-analysis
 *
 * @param {number} estimate - Meta-analytic effect estimate
 * @param {number} se - Standard error of estimate
 * @returns {Object} { mean, sd, pdf }
 */
export function informedPrior(estimate, se) {
  return {
    mean: estimate,
    sd: se,
    pdf: (x) => normalPDF((x - estimate) / se) / se
  };
}

/**
 * Create skeptical prior centered at zero
 *
 * @param {number} sd - How skeptical (smaller = more skeptical)
 * @returns {Object} { mean, sd, pdf }
 */
export function skepticalPrior(sd = 0.5) {
  return {
    mean: 0,
    sd: sd,
    pdf: (x) => normalPDF(x / sd) / sd
  };
}

/**
 * Create enthusiastic prior (shifted away from zero)
 *
 * @param {number} expectedEffect - Expected effect size
 * @param {number} sd - Uncertainty
 * @returns {Object} { mean, sd, pdf }
 */
export function enthusiasticPrior(expectedEffect, sd = 0.5) {
  return {
    mean: expectedEffect,
    sd: sd,
    pdf: (x) => normalPDF((x - expectedEffect) / sd) / sd
  };
}

// ============================================================================
// COMPARISON: FREQUENTIST VS BAYESIAN
// ============================================================================

/**
 * Compare frequentist power with Bayesian assurance
 *
 * @param {number} n1 - Sample size group 1
 * @param {number} n2 - Sample size group 2
 * @param {number} expectedEffect - Point estimate effect size (for frequentist)
 * @param {Function} priorPDF - Prior PDF for effect size (for Bayesian)
 * @param {number} alpha - Significance level (frequentist)
 * @param {number} bfThreshold - BF threshold (Bayesian)
 * @returns {Object} { frequentistPower, bayesianAssurance, comparison }
 */
export function compareFrequentistBayesian(n1, n2, expectedEffect, priorPDF, alpha = 0.05, bfThreshold = 10) {
  // Import power calculation (avoid circular dependency)
  const { powerTwoSampleTTest } = require('./powerCalculations');

  // Frequentist power at point estimate
  const powerResult = powerTwoSampleTTest(n1, n2, expectedEffect, alpha, 'two-sided');
  const frequentistPower = powerResult.power;

  // Bayesian assurance with prior uncertainty
  const assuranceResult = calculateAssurance(n1, n2, priorPDF, bfThreshold);
  const bayesianAssurance = assuranceResult.assurance;

  return {
    frequentistPower: frequentistPower,
    bayesianAssurance: bayesianAssurance,
    difference: frequentistPower - bayesianAssurance,
    comparison: frequentistPower > bayesianAssurance
      ? 'Frequentist power is higher (likely because prior includes smaller effects)'
      : 'Bayesian assurance is higher (prior may be more optimistic)'
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gauss-Legendre quadrature nodes and weights
 *
 * @param {number} n - Number of points
 * @returns {Object} { nodes, weights }
 */
function gaussLegendreNodes(n) {
  const nodes = [];
  const weights = [];

  const m = Math.floor((n + 1) / 2);

  for (let i = 0; i < m; i++) {
    // Initial approximation for root
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5));
    let z1, pp;

    // Newton-Raphson refinement
    do {
      let p1 = 1;
      let p2 = 0;

      for (let j = 0; j < n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
      }

      pp = n * (z * p1 - p2) / (z * z - 1);
      z1 = z;
      z = z1 - p1 / pp;
    } while (Math.abs(z - z1) > 1e-14);

    nodes[i] = -z;
    nodes[n - 1 - i] = z;
    weights[i] = 2 / ((1 - z * z) * pp * pp);
    weights[n - 1 - i] = weights[i];
  }

  return { nodes, weights };
}

/**
 * Sample from standard normal distribution (Box-Muller)
 *
 * @returns {number} Random sample
 */
function sampleStandardNormal() {
  let u1, u2;
  do {
    u1 = Math.random();
    u2 = Math.random();
  } while (u1 === 0);

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Sample from chi-square distribution
 *
 * @param {number} df - Degrees of freedom
 * @returns {number} Random sample
 */
function sampleChiSquare(df) {
  // Sum of squared standard normals
  let sum = 0;
  for (let i = 0; i < df; i++) {
    const z = sampleStandardNormal();
    sum += z * z;
  }
  return sum;
}
