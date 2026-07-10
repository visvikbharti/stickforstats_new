/**
 * Statistical Distribution Functions
 *
 * Client-side implementations of probability distribution functions
 * for power analysis calculations.
 *
 * These are approximations suitable for interactive demonstrations.
 * For high-precision calculations, use the backend API.
 *
 * References:
 * - Abramowitz & Stegun (1972). Handbook of Mathematical Functions.
 * - Cody, W.J. (1969). Rational Chebyshev approximations for the error function.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const SQRT_2 = Math.sqrt(2);
const SQRT_2_PI = Math.sqrt(2 * Math.PI);
const LOG_SQRT_2_PI = 0.5 * Math.log(2 * Math.PI);

// ============================================================================
// ERROR FUNCTION AND RELATED
// ============================================================================

/**
 * Error function erf(x)
 *
 * Uses Horner's method with coefficients from Abramowitz & Stegun.
 *
 * @param {number} x - Input value
 * @returns {number} erf(x)
 */
export function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  // Coefficients for approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Complementary error function erfc(x) = 1 - erf(x)
 *
 * @param {number} x - Input value
 * @returns {number} erfc(x)
 */
export function erfc(x) {
  return 1 - erf(x);
}

// ============================================================================
// NORMAL DISTRIBUTION
// ============================================================================

/**
 * Standard normal PDF: φ(x) = (1/√(2π)) × e^(-x²/2)
 *
 * @param {number} x - Input value
 * @returns {number} PDF value
 */
export function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2_PI;
}

/**
 * Standard normal CDF: Φ(x) = P(Z ≤ x)
 *
 * Uses the error function relationship:
 * Φ(x) = 0.5 × (1 + erf(x / √2))
 *
 * @param {number} x - Input value
 * @returns {number} CDF value
 */
export function normalCDF(x) {
  return 0.5 * (1 + erf(x / SQRT_2));
}

/**
 * Standard normal quantile (inverse CDF): Φ⁻¹(p)
 *
 * Uses Rational approximation for the normal deviate
 * Based on algorithm AS241 (Wichura, 1988)
 *
 * @param {number} p - Probability (0 < p < 1)
 * @returns {number} Quantile value
 */
export function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Coefficients for rational approximation
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q, r;

  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
           ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  } else if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5]) * q /
           (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
            ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  }
}

// ============================================================================
// GAMMA FUNCTION AND RELATED
// ============================================================================

/**
 * Log of gamma function: ln(Γ(x))
 *
 * Uses Lanczos approximation with g=7 and n=9.
 *
 * @param {number} x - Input value (x > 0)
 * @returns {number} ln(Γ(x))
 */
export function logGamma(x) {
  if (x <= 0) return Infinity;

  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;

  for (let i = 1; i < g + 2; i++) {
    a += c[i] / (x + i);
  }

  return LOG_SQRT_2_PI + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Gamma function: Γ(x)
 *
 * @param {number} x - Input value
 * @returns {number} Γ(x)
 */
export function gamma(x) {
  return Math.exp(logGamma(x));
}

/**
 * Regularized incomplete beta function: I_x(a, b)
 *
 * Used for t-distribution and F-distribution CDFs.
 *
 * @param {number} x - Upper limit (0 ≤ x ≤ 1)
 * @param {number} a - Shape parameter a > 0
 * @param {number} b - Shape parameter b > 0
 * @returns {number} I_x(a, b)
 */
export function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta);

  // Continued-fraction evaluation via Lentz's modified algorithm
  // (Numerical Recipes `betacf`). Converges fastest for x < (a+1)/(a+b+2),
  // so the symmetry relation below routes every call into that regime.
  const betacf = (bx, ba, bb) => {
    const FPMIN = 1e-300;
    const qab = ba + bb;
    const qap = ba + 1;
    const qam = ba - 1;
    let c = 1;
    let d = 1 - qab * bx / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (bb - m) * bx / ((qam + m2) * (ba + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;
      aa = -(ba + m) * (qab + m) * bx / ((ba + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    return h;
  };

  if (x < (a + 1) / (a + b + 2)) {
    return front * betacf(x, a, b) / a;
  }
  return 1 - front * betacf(1 - x, b, a) / b;
}

/**
 * Regularized incomplete gamma function: P(a, x) = γ(a, x) / Γ(a)
 *
 * @param {number} a - Shape parameter
 * @param {number} x - Upper limit
 * @returns {number} P(a, x)
 */
export function regularizedIncompleteGamma(a, x) {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;

  if (x < a + 1) {
    // Use series expansion
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  } else {
    // Use continued fraction
    return 1 - regularizedIncompleteGammaUpper(a, x);
  }
}

/**
 * Upper regularized incomplete gamma function: Q(a, x) = Γ(a, x) / Γ(a)
 *
 * @param {number} a - Shape parameter
 * @param {number} x - Lower limit
 * @returns {number} Q(a, x)
 */
function regularizedIncompleteGammaUpper(a, x) {
  // Continued fraction expansion (Lentz's algorithm)
  let f = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / f;
  let h = d;

  for (let n = 1; n <= 100; n++) {
    const an = -n * (n - a);
    const bn = x + 2 * n + 1 - a;
    d = bn + an * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = bn + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }

  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

// ============================================================================
// T-DISTRIBUTION
// ============================================================================

/**
 * Student's t-distribution PDF
 *
 * f(t) = Γ((ν+1)/2) / (√(νπ) × Γ(ν/2)) × (1 + t²/ν)^(-(ν+1)/2)
 *
 * @param {number} t - Input value
 * @param {number} df - Degrees of freedom
 * @returns {number} PDF value
 */
export function tPDF(t, df) {
  const coef = gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * gamma(df / 2));
  return coef * Math.pow(1 + t * t / df, -(df + 1) / 2);
}

/**
 * Student's t-distribution CDF
 *
 * P(T ≤ t) where T ~ t(ν)
 *
 * Uses the incomplete beta function relationship.
 *
 * @param {number} t - Input value
 * @param {number} df - Degrees of freedom
 * @returns {number} CDF value
 */
export function tCDF(t, df) {
  const x = df / (df + t * t);
  const prob = 0.5 * regularizedIncompleteBeta(x, df / 2, 0.5);

  return t < 0 ? prob : 1 - prob;
}

/**
 * Student's t-distribution quantile (inverse CDF)
 *
 * @param {number} p - Probability
 * @param {number} df - Degrees of freedom
 * @returns {number} Quantile value
 */
export function tQuantile(p, df) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Use Newton-Raphson iteration
  let x = normalQuantile(p);

  for (let i = 0; i < 10; i++) {
    const fx = tCDF(x, df) - p;
    const fpx = tPDF(x, df);
    const dx = fx / fpx;
    x -= dx;
    if (Math.abs(dx) < 1e-10) break;
  }

  return x;
}

// ============================================================================
// NON-CENTRAL T-DISTRIBUTION
// ============================================================================

/**
 * Non-central t-distribution CDF
 *
 * P(T ≤ t | ncp) where T ~ t'(ν, λ)
 *
 * Uses series expansion method.
 *
 * @param {number} t - Input value
 * @param {number} df - Degrees of freedom
 * @param {number} ncp - Non-centrality parameter (δ or λ)
 * @returns {number} CDF value
 */
export function nonCentralTCDF(t, df, ncp) {
  if (ncp === 0) {
    return tCDF(t, df);
  }
  if (!isFinite(t)) {
    return t > 0 ? 1 : 0;
  }

  // Algorithm AS 243 (Lenth 1989), the same series R and scipy use. The
  // previous implementation summed central-t CDFs at inflated df weighted by
  // Poisson terms — that is not the non-central t CDF and returned ~1 for
  // values well below the mean, so every t/paired power calculation collapsed
  // to roughly alpha. Handle t < 0 by the reflection F(t;ν,δ)=1−F(−t;ν,−δ).
  let del = ncp;
  let negdel = false;
  let tt = t;
  if (t < 0) {
    negdel = true;
    tt = -t;
    del = -ncp;
  }

  const x = (tt * tt) / (tt * tt + df);
  let tnc = 0;

  if (x > 0) {
    const lambda = del * del;
    let p = 0.5 * Math.exp(-0.5 * lambda);
    let q = Math.sqrt(2 / Math.PI) * p * del;
    let s = 0.5 - p;
    let a = 0.5;
    const b = 0.5 * df;
    const rxb = Math.pow(1 - x, b);
    const albeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    let xodd = regularizedIncompleteBeta(x, a, b);
    let godd = 2 * rxb * Math.exp(a * Math.log(x) - albeta);
    let xeven = 1 - rxb;
    let geven = b * x * rxb;
    tnc = p * xodd + q * xeven;

    const itrmax = 1000;
    const errmax = 1e-12;
    for (let it = 1; it <= itrmax; it++) {
      a += 1;
      xodd -= godd;
      xeven -= geven;
      godd *= (x * (a + b - 1)) / a;
      geven *= (x * (a + b - 0.5)) / (a + 0.5);
      p *= lambda / (2 * it);
      q *= lambda / (2 * it + 1);
      s -= p;
      tnc += p * xodd + q * xeven;
      const errbd = 2 * s * (xodd - godd);
      if (Math.abs(errbd) < errmax) break;
    }
  }

  tnc += normalCDF(-del);
  const result = negdel ? 1 - tnc : tnc;
  return Math.max(0, Math.min(1, result));
}

// ============================================================================
// F-DISTRIBUTION
// ============================================================================

/**
 * F-distribution PDF
 *
 * @param {number} f - Input value (f > 0)
 * @param {number} df1 - Numerator degrees of freedom
 * @param {number} df2 - Denominator degrees of freedom
 * @returns {number} PDF value
 */
export function fPDF(f, df1, df2) {
  if (f <= 0) return 0;

  const coef = Math.pow(df1 / df2, df1 / 2) * Math.pow(f, df1 / 2 - 1) /
               (beta(df1 / 2, df2 / 2) * Math.pow(1 + df1 * f / df2, (df1 + df2) / 2));
  return coef;
}

/**
 * F-distribution CDF
 *
 * P(F ≤ f) where F ~ F(d1, d2)
 *
 * @param {number} f - Input value
 * @param {number} df1 - Numerator degrees of freedom
 * @param {number} df2 - Denominator degrees of freedom
 * @returns {number} CDF value
 */
export function fCDF(f, df1, df2) {
  if (f <= 0) return 0;

  const x = df1 * f / (df1 * f + df2);
  return regularizedIncompleteBeta(x, df1 / 2, df2 / 2);
}

// ============================================================================
// NON-CENTRAL F-DISTRIBUTION
// ============================================================================

/**
 * Non-central F-distribution CDF
 *
 * P(F ≤ f | ncp) where F ~ F'(d1, d2, λ)
 *
 * Uses Poisson mixture representation.
 *
 * @param {number} f - Input value
 * @param {number} df1 - Numerator degrees of freedom
 * @param {number} df2 - Denominator degrees of freedom
 * @param {number} ncp - Non-centrality parameter (λ)
 * @returns {number} CDF value
 */
export function nonCentralFCDF(f, df1, df2, ncp) {
  if (f <= 0) return 0;
  if (ncp === 0) return fCDF(f, df1, df2);

  // Poisson mixture approximation
  const maxIter = 100;
  let sum = 0;
  const lambda = ncp / 2;
  let poissonWeight = Math.exp(-lambda);
  let prevSum = -1;

  for (let j = 0; j < maxIter; j++) {
    // F-CDF with shifted numerator df
    const contribution = fCDF(f * df1 / (df1 + 2 * j), df1 + 2 * j, df2);

    sum += poissonWeight * contribution;

    if (Math.abs(sum - prevSum) < 1e-12) break;
    prevSum = sum;

    // Update Poisson weight
    poissonWeight *= lambda / (j + 1);
  }

  return sum;
}

// ============================================================================
// CHI-SQUARE DISTRIBUTION
// ============================================================================

/**
 * Chi-square distribution PDF
 *
 * f(x) = (x^(k/2-1) × e^(-x/2)) / (2^(k/2) × Γ(k/2))
 *
 * @param {number} x - Input value (x ≥ 0)
 * @param {number} df - Degrees of freedom
 * @returns {number} PDF value
 */
export function chiSquarePDF(x, df) {
  if (x < 0) return 0;
  if (x === 0) return df === 2 ? 0.5 : 0;

  const k = df / 2;
  return Math.pow(x, k - 1) * Math.exp(-x / 2) / (Math.pow(2, k) * gamma(k));
}

/**
 * Chi-square distribution CDF
 *
 * P(X ≤ x) where X ~ χ²(k)
 *
 * Uses the regularized incomplete gamma function.
 *
 * @param {number} x - Input value
 * @param {number} df - Degrees of freedom
 * @returns {number} CDF value
 */
export function chiSquareCDF(x, df) {
  if (x <= 0) return 0;
  return regularizedIncompleteGamma(df / 2, x / 2);
}

/**
 * Non-central chi-square CDF, as a Poisson-weighted mixture of central
 * chi-square CDFs:
 *   F(x; k, λ) = Σ_j  e^{-λ/2}(λ/2)^j / j!  ·  F_central(x; k + 2j)
 *
 * This is the correct distribution for chi-square power: 1 - F(crit; df, ncp).
 * Do NOT approximate it by shifting the central CDF's argument by the
 * non-centrality parameter -- that gives power = 1 whenever crit - ncp <= 0.
 *
 * @param {number} x - Value at which to evaluate the CDF
 * @param {number} df - Degrees of freedom
 * @param {number} ncp - Non-centrality parameter (λ)
 * @returns {number} P(X <= x)
 */
export function nonCentralChiSquareCDF(x, df, ncp) {
  if (x <= 0) return 0;
  if (!ncp || ncp === 0) return chiSquareCDF(x, df);

  const maxIter = 1000;
  const lambda = ncp / 2;
  let poissonWeight = Math.exp(-lambda);
  let sum = 0;
  let prevSum = -1;

  for (let j = 0; j < maxIter; j++) {
    sum += poissonWeight * chiSquareCDF(x, df + 2 * j);
    // Only test convergence past the peak of the Poisson weights (near j=λ);
    // early terms can be small enough to trip a premature stop.
    if (j > lambda && Math.abs(sum - prevSum) < 1e-12) break;
    prevSum = sum;
    poissonWeight *= lambda / (j + 1);
  }

  return Math.min(1, Math.max(0, sum));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Beta function: B(a, b) = Γ(a)Γ(b) / Γ(a+b)
 *
 * @param {number} a - Parameter a
 * @param {number} b - Parameter b
 * @returns {number} B(a, b)
 */
export function beta(a, b) {
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

/**
 * Log of beta function: ln(B(a, b))
 *
 * @param {number} a - Parameter a
 * @param {number} b - Parameter b
 * @returns {number} ln(B(a, b))
 */
export function logBeta(a, b) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}
