/**
 * Probability Distributions - Statistical Utilities
 *
 * Pure functions for calculating PMF, PDF, CDF, and generating random samples
 * from common probability distributions.
 *
 * Distributions supported:
 * - Discrete: Binomial, Poisson
 * - Continuous: Normal (Gaussian), Exponential
 *
 * All functions use numerically stable algorithms:
 * - Log-space calculations for factorials (prevents overflow)
 * - Box-Muller transform for normal distribution
 * - Abramowitz and Stegun approximation for error function
 */

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate log factorial using iterative summation
 * More numerically stable than direct factorial for large n
 *
 * @param {number} num - Non-negative integer
 * @returns {number} log(num!)
 */
export const logFactorial = (num) => {
  if (num < 0) return NaN;
  if (num === 0 || num === 1) return 0;

  let result = 0;
  for (let i = 2; i <= num; i++) {
    result += Math.log(i);
  }
  return result;
};

/**
 * Error function (erf) approximation
 * Uses Abramowitz and Stegun approximation (maximum error: 1.5e-7)
 * Required for normal distribution CDF
 *
 * @param {number} x - Input value
 * @returns {number} erf(x)
 */
export const erf = (x) => {
  // Constants for Abramowitz and Stegun approximation
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = (x < 0) ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);

  return sign * y;
};

/**
 * Box-Muller transform to generate standard normal samples
 * Transforms uniform [0,1] random variables into N(0,1)
 *
 * @returns {object} { z1: number, z2: number } - Two independent N(0,1) samples
 */
export const boxMuller = () => {
  const u1 = Math.random();
  const u2 = Math.random();

  // Avoid log(0)
  const u1Safe = u1 === 0 ? 1e-10 : u1;

  const z1 = Math.sqrt(-2 * Math.log(u1Safe)) * Math.cos(2 * Math.PI * u2);
  const z2 = Math.sqrt(-2 * Math.log(u1Safe)) * Math.sin(2 * Math.PI * u2);

  return { z1, z2 };
};

// ============================================================
// PMF/PDF CALCULATIONS
// ============================================================

/**
 * Calculate Normal (Gaussian) PDF
 * f(x) = (1 / (σ√(2π))) * exp(-0.5 * ((x-μ)/σ)²)
 *
 * @param {number} x - Value to evaluate
 * @param {number} mean - Mean (μ)
 * @param {number} std - Standard deviation (σ)
 * @returns {number} PDF value at x
 */
export const normalPdf = (x, mean = 0, std = 1) => {
  if (std <= 0) return NaN;

  const z = (x - mean) / std;
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
};

/**
 * Calculate Binomial PMF
 * P(X = k) = C(n,k) * p^k * (1-p)^(n-k)
 * Uses log-space to avoid overflow for large n
 *
 * @param {number} k - Number of successes
 * @param {number} n - Number of trials
 * @param {number} p - Probability of success
 * @returns {number} PMF value at k
 */
export const binomialPmf = (k, n, p) => {
  if (k < 0 || k > n || n < 0 || p < 0 || p > 1) return 0;
  if (!Number.isInteger(k) || !Number.isInteger(n)) return 0;

  // Handle edge cases
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;

  // Log-space calculation for numerical stability
  const logP = Math.log(p);
  const log1minusP = Math.log(1 - p);

  // Log of binomial coefficient: log(C(n,k))
  const logCoef = logFactorial(n) - logFactorial(k) - logFactorial(n - k);

  // Log PMF
  const logPMF = logCoef + k * logP + (n - k) * log1minusP;

  return Math.exp(logPMF);
};

/**
 * Calculate Poisson PMF
 * P(X = k) = (λ^k * e^(-λ)) / k!
 * Uses log-space to avoid overflow
 *
 * @param {number} k - Number of events
 * @param {number} lambda - Rate parameter (λ)
 * @returns {number} PMF value at k
 */
export const poissonPmf = (k, lambda) => {
  if (k < 0 || lambda < 0) return 0;
  if (!Number.isInteger(k)) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;

  // Log-space calculation
  const logPMF = k * Math.log(lambda) - lambda - logFactorial(k);

  return Math.exp(logPMF);
};

/**
 * Calculate Exponential PDF
 * f(x) = λ * e^(-λx) for x ≥ 0
 *
 * @param {number} x - Value to evaluate
 * @param {number} rate - Rate parameter (λ)
 * @returns {number} PDF value at x
 */
export const exponentialPdf = (x, rate) => {
  if (x < 0 || rate <= 0) return 0;
  return rate * Math.exp(-rate * x);
};

/**
 * Calculate PMF/PDF for multiple x values
 * Generic interface for all distributions
 *
 * @param {string} type - Distribution type: 'NORMAL', 'BINOMIAL', 'POISSON', 'EXPONENTIAL'
 * @param {object} params - Distribution parameters
 * @param {number[]} xValues - Array of x values to evaluate
 * @returns {object} { x_values, pmf_pdf_values }
 */
export const calculatePmfPdf = (type, params, xValues) => {
  let pmfPdfValues = [];

  switch (type) {
    case 'NORMAL':
      pmfPdfValues = xValues.map(x => normalPdf(x, params.mean, params.std));
      break;

    case 'BINOMIAL':
      pmfPdfValues = xValues.map(k => binomialPmf(k, params.n, params.p));
      break;

    case 'POISSON':
      pmfPdfValues = xValues.map(k => poissonPmf(k, params.lambda));
      break;

    case 'EXPONENTIAL':
      pmfPdfValues = xValues.map(x => exponentialPdf(x, params.rate));
      break;

    default:
      pmfPdfValues = Array(xValues.length).fill(0);
  }

  return { x_values: xValues, pmf_pdf_values: pmfPdfValues };
};

// ============================================================
// CDF CALCULATIONS
// ============================================================

/**
 * Calculate Normal CDF
 * Φ(x) = 0.5 * (1 + erf((x-μ) / (σ√2)))
 *
 * @param {number} x - Value to evaluate
 * @param {number} mean - Mean (μ)
 * @param {number} std - Standard deviation (σ)
 * @returns {number} CDF value at x
 */
export const normalCdf = (x, mean = 0, std = 1) => {
  if (std <= 0) return NaN;

  const z = (x - mean) / (std * Math.sqrt(2));
  return 0.5 * (1 + erf(z));
};

/**
 * Calculate Exponential CDF
 * F(x) = 1 - e^(-λx) for x ≥ 0
 *
 * @param {number} x - Value to evaluate
 * @param {number} rate - Rate parameter (λ)
 * @returns {number} CDF value at x
 */
export const exponentialCdf = (x, rate) => {
  if (x < 0) return 0;
  if (rate <= 0) return NaN;
  return 1 - Math.exp(-rate * x);
};

/**
 * Calculate CDF for multiple x values
 * Generic interface for all distributions
 *
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @param {number[]} xValues - Array of x values to evaluate
 * @returns {object} { x_values, cdf_values }
 */
export const calculateCdf = (type, params, xValues) => {
  let cdfValues = [];

  switch (type) {
    case 'NORMAL':
      cdfValues = xValues.map(x => normalCdf(x, params.mean, params.std));
      break;

    case 'BINOMIAL':
    case 'POISSON': {
      // Calculate cumulative sum of PMF
      const pmfResult = calculatePmfPdf(type, params, xValues);
      let sum = 0;
      cdfValues = pmfResult.pmf_pdf_values.map(pmf => {
        sum += pmf;
        return sum;
      });
      break;
    }

    case 'EXPONENTIAL':
      cdfValues = xValues.map(x => exponentialCdf(x, params.rate));
      break;

    default:
      cdfValues = Array(xValues.length).fill(0);
  }

  return { x_values: xValues, cdf_values: cdfValues };
};

// ============================================================
// RANDOM SAMPLE GENERATION
// ============================================================

/**
 * Generate random sample from Normal distribution
 * Uses Box-Muller transform
 *
 * @param {number} size - Sample size
 * @param {number} mean - Mean (μ)
 * @param {number} std - Standard deviation (σ)
 * @returns {number[]} Random sample
 */
export const generateNormalSample = (size, mean = 0, std = 1) => {
  const sample = [];

  for (let i = 0; i < size; i += 2) {
    const { z1, z2 } = boxMuller();
    sample.push(mean + std * z1);
    if (sample.length < size) {
      sample.push(mean + std * z2);
    }
  }

  return sample.slice(0, size);
};

/**
 * Generate random sample from Binomial distribution
 * Uses inverse transform method
 *
 * @param {number} size - Sample size
 * @param {number} n - Number of trials
 * @param {number} p - Probability of success
 * @returns {number[]} Random sample
 */
export const generateBinomialSample = (size, n, p) => {
  const sample = [];

  for (let i = 0; i < size; i++) {
    let successes = 0;
    for (let j = 0; j < n; j++) {
      if (Math.random() < p) successes++;
    }
    sample.push(successes);
  }

  return sample;
};

/**
 * Generate random sample from Poisson distribution
 * Uses Knuth's algorithm for small λ, rejection method for large λ
 *
 * @param {number} size - Sample size
 * @param {number} lambda - Rate parameter (λ)
 * @returns {number[]} Random sample
 */
export const generatePoissonSample = (size, lambda) => {
  const sample = [];

  if (lambda < 30) {
    // Knuth's algorithm for small λ
    const L = Math.exp(-lambda);

    for (let i = 0; i < size; i++) {
      let k = 0;
      let p = 1;

      do {
        k++;
        p *= Math.random();
      } while (p > L);

      sample.push(k - 1);
    }
  } else {
    // Normal approximation for large λ
    const sqrtLambda = Math.sqrt(lambda);

    for (let i = 0; i < size; i++) {
      const { z1 } = boxMuller();
      const value = Math.round(lambda + sqrtLambda * z1);
      sample.push(Math.max(0, value));
    }
  }

  return sample;
};

/**
 * Generate random sample from Exponential distribution
 * Uses inverse transform: X = -ln(U)/λ
 *
 * @param {number} size - Sample size
 * @param {number} rate - Rate parameter (λ)
 * @returns {number[]} Random sample
 */
export const generateExponentialSample = (size, rate) => {
  const sample = [];

  for (let i = 0; i < size; i++) {
    const u = Math.random();
    const uSafe = u === 0 ? 1e-10 : u;
    sample.push(-Math.log(uSafe) / rate);
  }

  return sample;
};

/**
 * Generate random sample from any distribution
 * Generic interface
 *
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @param {number} size - Sample size
 * @returns {number[]} Random sample
 */
export const generateRandomSample = (type, params, size) => {
  switch (type) {
    case 'NORMAL':
      return generateNormalSample(size, params.mean, params.std);

    case 'BINOMIAL':
      return generateBinomialSample(size, params.n, params.p);

    case 'POISSON':
      return generatePoissonSample(size, params.lambda);

    case 'EXPONENTIAL':
      return generateExponentialSample(size, params.rate);

    default:
      return Array(size).fill(0);
  }
};

// ============================================================
// DISTRIBUTION MOMENTS
// ============================================================

/**
 * Calculate theoretical mean for a distribution
 *
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @returns {number} Theoretical mean
 */
export const getDistributionMean = (type, params) => {
  switch (type) {
    case 'NORMAL':
      return params.mean;
    case 'BINOMIAL':
      return params.n * params.p;
    case 'POISSON':
      return params.lambda;
    case 'EXPONENTIAL':
      return 1 / params.rate;
    default:
      return 0;
  }
};

/**
 * Calculate theoretical variance for a distribution
 *
 * @param {string} type - Distribution type
 * @param {object} params - Distribution parameters
 * @returns {number} Theoretical variance
 */
export const getDistributionVariance = (type, params) => {
  switch (type) {
    case 'NORMAL':
      return params.std * params.std;
    case 'BINOMIAL':
      return params.n * params.p * (1 - params.p);
    case 'POISSON':
      return params.lambda;
    case 'EXPONENTIAL':
      return 1 / (params.rate * params.rate);
    default:
      return 0;
  }
};
