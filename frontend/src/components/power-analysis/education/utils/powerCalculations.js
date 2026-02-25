/**
 * Power Analysis Calculations
 *
 * Client-side power analysis calculations for interactive demonstrations.
 * Uses standard statistical formulas validated against G*Power 3.1.9.7.
 *
 * For production calculations, use the backend API which provides
 * 50-decimal precision using Python's mpmath library.
 *
 * References:
 * - Cohen, J. (1988). Statistical power analysis for the behavioral sciences.
 * - Faul, F., et al. (2007). G*Power 3: A flexible statistical power analysis program.
 */

import {
  normalCDF,
  normalQuantile,
  tQuantile,
  fCDF,
  chiSquareCDF,
  nonCentralTCDF,
  nonCentralFCDF
} from './distributionFunctions';

// ============================================================================
// EFFECT SIZE CALCULATIONS
// ============================================================================

/**
 * Cohen's d - Standardized mean difference
 *
 * d = (μ₁ - μ₂) / σ_pooled
 *
 * Benchmarks (Cohen, 1988):
 * - Small: 0.2
 * - Medium: 0.5
 * - Large: 0.8
 *
 * @param {number} mean1 - Mean of group 1
 * @param {number} mean2 - Mean of group 2
 * @param {number} sd1 - Standard deviation of group 1
 * @param {number} sd2 - Standard deviation of group 2
 * @param {number} n1 - Sample size of group 1
 * @param {number} n2 - Sample size of group 2
 * @returns {Object} { d, pooledSD, interpretation }
 */
export function cohensD(mean1, mean2, sd1, sd2, n1, n2) {
  // Pooled standard deviation
  const pooledVar = ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2);
  const pooledSD = Math.sqrt(pooledVar);

  const d = (mean1 - mean2) / pooledSD;

  return {
    d: d,
    pooledSD: pooledSD,
    interpretation: interpretEffectSize(Math.abs(d), 'cohens_d')
  };
}

/**
 * Hedges' g - Bias-corrected Cohen's d for small samples
 *
 * g = d × (1 - 3 / (4(n₁ + n₂) - 9))
 *
 * @param {number} d - Cohen's d
 * @param {number} n1 - Sample size of group 1
 * @param {number} n2 - Sample size of group 2
 * @returns {number} Hedges' g
 */
export function hedgesG(d, n1, n2) {
  const correction = 1 - 3 / (4 * (n1 + n2) - 9);
  return d * correction;
}

/**
 * Cohen's f - Effect size for ANOVA
 *
 * f = σ_between / σ_within = √(η² / (1 - η²))
 *
 * Benchmarks:
 * - Small: 0.10
 * - Medium: 0.25
 * - Large: 0.40
 *
 * @param {number} etaSquared - Eta squared from ANOVA
 * @returns {Object} { f, interpretation }
 */
export function cohensF(etaSquared) {
  const f = Math.sqrt(etaSquared / (1 - etaSquared));
  return {
    f: f,
    interpretation: interpretEffectSize(f, 'cohens_f')
  };
}

/**
 * Cohen's f² - Effect size for regression
 *
 * f² = R² / (1 - R²)
 *
 * Benchmarks:
 * - Small: 0.02
 * - Medium: 0.15
 * - Large: 0.35
 *
 * @param {number} rSquared - R-squared from regression
 * @returns {Object} { f2, interpretation }
 */
export function cohensF2(rSquared) {
  const f2 = rSquared / (1 - rSquared);
  return {
    f2: f2,
    interpretation: interpretEffectSize(f2, 'cohens_f2')
  };
}

/**
 * Cohen's w - Effect size for chi-square
 *
 * w = √(χ² / n)
 *
 * Benchmarks:
 * - Small: 0.10
 * - Medium: 0.30
 * - Large: 0.50
 *
 * @param {number} chiSquare - Chi-square statistic
 * @param {number} n - Total sample size
 * @returns {Object} { w, interpretation }
 */
export function cohensW(chiSquare, n) {
  const w = Math.sqrt(chiSquare / n);
  return {
    w: w,
    interpretation: interpretEffectSize(w, 'cohens_w')
  };
}

/**
 * Cohen's h - Effect size for proportions
 *
 * h = 2 × arcsin(√p₁) - 2 × arcsin(√p₂)
 *
 * @param {number} p1 - Proportion 1
 * @param {number} p2 - Proportion 2
 * @returns {Object} { h, interpretation }
 */
export function cohensH(p1, p2) {
  const phi1 = 2 * Math.asin(Math.sqrt(p1));
  const phi2 = 2 * Math.asin(Math.sqrt(p2));
  const h = phi1 - phi2;
  return {
    h: h,
    interpretation: interpretEffectSize(Math.abs(h), 'cohens_d') // Same benchmarks as d
  };
}

/**
 * Interpret effect size based on Cohen's benchmarks
 *
 * @param {number} value - Effect size value
 * @param {string} type - Effect size type
 * @returns {string} Interpretation
 */
export function interpretEffectSize(value, type) {
  const benchmarks = {
    cohens_d: { small: 0.2, medium: 0.5, large: 0.8 },
    cohens_f: { small: 0.1, medium: 0.25, large: 0.4 },
    cohens_f2: { small: 0.02, medium: 0.15, large: 0.35 },
    cohens_w: { small: 0.1, medium: 0.3, large: 0.5 },
    correlation: { small: 0.1, medium: 0.3, large: 0.5 }
  };

  const bench = benchmarks[type] || benchmarks.cohens_d;
  const absValue = Math.abs(value);

  if (absValue < bench.small) return 'negligible';
  if (absValue < bench.medium) return 'small';
  if (absValue < bench.large) return 'medium';
  return 'large';
}

// ============================================================================
// EFFECT SIZE CONVERSIONS
// ============================================================================

/**
 * Convert Cohen's d to correlation r
 *
 * r = d / √(d² + 4)
 *
 * @param {number} d - Cohen's d
 * @returns {number} Correlation r
 */
export function dToR(d) {
  return d / Math.sqrt(d * d + 4);
}

/**
 * Convert correlation r to Cohen's d
 *
 * d = 2r / √(1 - r²)
 *
 * @param {number} r - Correlation
 * @returns {number} Cohen's d
 */
export function rToD(r) {
  return (2 * r) / Math.sqrt(1 - r * r);
}

/**
 * Convert eta-squared to Cohen's f
 *
 * f = √(η² / (1 - η²))
 *
 * @param {number} etaSquared - Eta squared
 * @returns {number} Cohen's f
 */
export function etaSquaredToF(etaSquared) {
  return Math.sqrt(etaSquared / (1 - etaSquared));
}

/**
 * Convert Cohen's f to eta-squared
 *
 * η² = f² / (1 + f²)
 *
 * @param {number} f - Cohen's f
 * @returns {number} Eta squared
 */
export function fToEtaSquared(f) {
  return (f * f) / (1 + f * f);
}

// ============================================================================
// POWER CALCULATIONS - PARAMETRIC TESTS
// ============================================================================

/**
 * Calculate power for two-sample t-test
 *
 * Uses non-central t-distribution.
 * λ = d × √(n₁n₂ / (n₁ + n₂))
 *
 * @param {number} n1 - Sample size group 1
 * @param {number} n2 - Sample size group 2
 * @param {number} d - Cohen's d effect size
 * @param {number} alpha - Significance level (default 0.05)
 * @param {string} alternative - 'two-sided', 'greater', or 'less' (default 'two-sided')
 * @returns {Object} { power, ncp, df, criticalValue }
 */
export function powerTwoSampleTTest(n1, n2, d, alpha = 0.05, alternative = 'two-sided') {
  const df = n1 + n2 - 2;

  // Noncentrality parameter
  const ncp = d * Math.sqrt((n1 * n2) / (n1 + n2));

  let power;
  let criticalValue;

  if (alternative === 'two-sided') {
    criticalValue = tQuantile(1 - alpha / 2, df);
    // Power = P(|T| > t_crit | ncp)
    const powerUpper = 1 - nonCentralTCDF(criticalValue, df, ncp);
    const powerLower = nonCentralTCDF(-criticalValue, df, ncp);
    power = powerUpper + powerLower;
  } else if (alternative === 'greater') {
    criticalValue = tQuantile(1 - alpha, df);
    power = 1 - nonCentralTCDF(criticalValue, df, ncp);
  } else {
    criticalValue = tQuantile(alpha, df);
    power = nonCentralTCDF(criticalValue, df, ncp);
  }

  return {
    power: Math.max(0, Math.min(1, power)),
    ncp: ncp,
    df: df,
    criticalValue: criticalValue
  };
}

/**
 * Calculate power for one-sample t-test
 *
 * @param {number} n - Sample size
 * @param {number} d - Cohen's d effect size
 * @param {number} alpha - Significance level
 * @param {string} alternative - 'two-sided', 'greater', or 'less'
 * @returns {Object} { power, ncp, df, criticalValue }
 */
export function powerOneSampleTTest(n, d, alpha = 0.05, alternative = 'two-sided') {
  const df = n - 1;
  const ncp = d * Math.sqrt(n);

  let power;
  let criticalValue;

  if (alternative === 'two-sided') {
    criticalValue = tQuantile(1 - alpha / 2, df);
    const powerUpper = 1 - nonCentralTCDF(criticalValue, df, ncp);
    const powerLower = nonCentralTCDF(-criticalValue, df, ncp);
    power = powerUpper + powerLower;
  } else if (alternative === 'greater') {
    criticalValue = tQuantile(1 - alpha, df);
    power = 1 - nonCentralTCDF(criticalValue, df, ncp);
  } else {
    criticalValue = tQuantile(alpha, df);
    power = nonCentralTCDF(criticalValue, df, ncp);
  }

  return {
    power: Math.max(0, Math.min(1, power)),
    ncp: ncp,
    df: df,
    criticalValue: criticalValue
  };
}

/**
 * Calculate power for paired t-test
 *
 * Same formula as one-sample t-test, but d = μ_D / σ_D
 *
 * @param {number} n - Number of pairs
 * @param {number} d - Standardized mean difference of paired differences
 * @param {number} alpha - Significance level
 * @param {string} alternative - 'two-sided', 'greater', or 'less'
 * @returns {Object} { power, ncp, df, criticalValue }
 */
export function powerPairedTTest(n, d, alpha = 0.05, alternative = 'two-sided') {
  return powerOneSampleTTest(n, d, alpha, alternative);
}

/**
 * Calculate power for one-way ANOVA
 *
 * Uses non-central F-distribution.
 * λ = n × k × f²
 *
 * @param {number} nPerGroup - Sample size per group
 * @param {number} k - Number of groups
 * @param {number} f - Cohen's f effect size
 * @param {number} alpha - Significance level
 * @returns {Object} { power, ncp, dfBetween, dfWithin, criticalF }
 */
export function powerOneWayANOVA(nPerGroup, k, f, alpha = 0.05) {
  const totalN = nPerGroup * k;
  const dfBetween = k - 1;
  const dfWithin = totalN - k;

  // Noncentrality parameter
  const ncp = totalN * f * f;

  // Critical F value
  const criticalF = fQuantile(1 - alpha, dfBetween, dfWithin);

  // Power using non-central F
  const power = 1 - nonCentralFCDF(criticalF, dfBetween, dfWithin, ncp);

  return {
    power: Math.max(0, Math.min(1, power)),
    ncp: ncp,
    dfBetween: dfBetween,
    dfWithin: dfWithin,
    criticalF: criticalF,
    totalN: totalN
  };
}

/**
 * Calculate power for correlation test
 *
 * Uses Fisher's z transformation.
 *
 * @param {number} n - Sample size
 * @param {number} r - Expected correlation
 * @param {number} alpha - Significance level
 * @param {string} alternative - 'two-sided', 'greater', or 'less'
 * @param {number} rho0 - Correlation under null (default 0)
 * @returns {Object} { power, fisherZ, se }
 */
export function powerCorrelation(n, r, alpha = 0.05, alternative = 'two-sided', rho0 = 0) {
  // Fisher's z transformation
  const zr = 0.5 * Math.log((1 + r) / (1 - r));
  const z0 = 0.5 * Math.log((1 + rho0) / (1 - rho0));

  // Standard error of Fisher's z
  const se = 1 / Math.sqrt(n - 3);

  let power;

  if (alternative === 'two-sided') {
    const zCrit = normalQuantile(1 - alpha / 2);
    const zUpper = (zr - z0) / se - zCrit;
    const zLower = (zr - z0) / se + zCrit;
    power = normalCDF(zUpper) + normalCDF(-zLower);
  } else if (alternative === 'greater') {
    const zCrit = normalQuantile(1 - alpha);
    power = normalCDF((zr - z0) / se - zCrit);
  } else {
    const zCrit = normalQuantile(alpha);
    power = normalCDF(zCrit - (zr - z0) / se);
  }

  return {
    power: Math.max(0, Math.min(1, power)),
    fisherZ: zr,
    se: se
  };
}

/**
 * Calculate power for chi-square test
 *
 * Uses non-central chi-square distribution.
 *
 * @param {number} n - Total sample size
 * @param {number} w - Cohen's w effect size
 * @param {number} df - Degrees of freedom
 * @param {number} alpha - Significance level
 * @returns {Object} { power, ncp, criticalChi2 }
 */
export function powerChiSquare(n, w, df, alpha = 0.05) {
  // Noncentrality parameter
  const ncp = n * w * w;

  // Critical chi-square value
  const criticalChi2 = chiSquareQuantile(1 - alpha, df);

  // Power using non-central chi-square
  // Note: This is an approximation; for exact, use non-central chi-square CDF
  const power = 1 - chiSquareCDF(criticalChi2 - ncp, df);

  return {
    power: Math.max(0, Math.min(1, power)),
    ncp: ncp,
    criticalChi2: criticalChi2
  };
}

// ============================================================================
// SAMPLE SIZE CALCULATIONS
// ============================================================================

/**
 * Calculate required sample size for two-sample t-test
 *
 * n = 2 × ((z_{1-α/2} + z_{1-β}) / d)²
 *
 * @param {number} d - Cohen's d effect size
 * @param {number} power - Desired power (default 0.80)
 * @param {number} alpha - Significance level (default 0.05)
 * @param {string} alternative - 'two-sided' or 'one-sided'
 * @param {number} ratio - n2/n1 allocation ratio (default 1)
 * @returns {Object} { n1, n2, totalN, achievedPower }
 */
export function sampleSizeTwoSampleTTest(d, power = 0.80, alpha = 0.05, alternative = 'two-sided', ratio = 1) {
  const zBeta = normalQuantile(power);
  const zAlpha = alternative === 'two-sided'
    ? normalQuantile(1 - alpha / 2)
    : normalQuantile(1 - alpha);

  // Initial estimate using normal approximation
  const n1Initial = Math.ceil((1 + 1 / ratio) * Math.pow((zAlpha + zBeta) / d, 2));

  // Refine using iterative search
  let n1 = n1Initial;
  let achievedPower = 0;

  for (let i = 0; i < 100; i++) {
    const n2 = Math.ceil(n1 * ratio);
    const result = powerTwoSampleTTest(n1, n2, d, alpha, alternative);
    achievedPower = result.power;

    if (achievedPower >= power) {
      break;
    }
    n1++;
  }

  const n2 = Math.ceil(n1 * ratio);

  return {
    n1: n1,
    n2: n2,
    totalN: n1 + n2,
    achievedPower: achievedPower
  };
}

/**
 * Calculate required sample size for one-way ANOVA
 *
 * @param {number} f - Cohen's f effect size
 * @param {number} k - Number of groups
 * @param {number} power - Desired power
 * @param {number} alpha - Significance level
 * @returns {Object} { nPerGroup, totalN, achievedPower }
 */
export function sampleSizeOneWayANOVA(f, k, power = 0.80, alpha = 0.05) {
  // Initial estimate
  let nPerGroup = Math.ceil(10 / (f * f));
  let achievedPower = 0;

  // Iterative search
  for (let i = 0; i < 500; i++) {
    const result = powerOneWayANOVA(nPerGroup, k, f, alpha);
    achievedPower = result.power;

    if (achievedPower >= power) {
      break;
    }
    nPerGroup++;
  }

  return {
    nPerGroup: nPerGroup,
    totalN: nPerGroup * k,
    achievedPower: achievedPower
  };
}

/**
 * Calculate required sample size for correlation test
 *
 * n = ((z_{1-α/2} + z_{1-β}) / z_r)² + 3
 *
 * @param {number} r - Expected correlation
 * @param {number} power - Desired power
 * @param {number} alpha - Significance level
 * @param {string} alternative - 'two-sided' or 'one-sided'
 * @returns {Object} { n, achievedPower }
 */
export function sampleSizeCorrelation(r, power = 0.80, alpha = 0.05, alternative = 'two-sided') {
  const zBeta = normalQuantile(power);
  const zAlpha = alternative === 'two-sided'
    ? normalQuantile(1 - alpha / 2)
    : normalQuantile(1 - alpha);
  const zr = 0.5 * Math.log((1 + r) / (1 - r));

  const n = Math.ceil(Math.pow((zAlpha + zBeta) / zr, 2) + 3);

  // Verify achieved power
  const result = powerCorrelation(n, r, alpha, alternative);

  return {
    n: n,
    achievedPower: result.power
  };
}

/**
 * Calculate required sample size for paired t-test
 *
 * @param {number} d - Cohen's d effect size
 * @param {number} power - Desired power (default 0.80)
 * @param {number} alpha - Significance level (default 0.05)
 * @param {string} alternative - 'two-sided' or 'one-sided'
 * @returns {Object} { n, achievedPower }
 */
export function sampleSizePairedTTest(d, power = 0.80, alpha = 0.05, alternative = 'two-sided') {
  const zBeta = normalQuantile(power);
  const zAlpha = alternative === 'two-sided'
    ? normalQuantile(1 - alpha / 2)
    : normalQuantile(1 - alpha);

  // Initial estimate using normal approximation
  let n = Math.ceil(Math.pow((zAlpha + zBeta) / d, 2));
  let achievedPower = 0;

  // Refine using iterative search
  for (let i = 0; i < 100; i++) {
    const result = powerPairedTTest(n, d, alpha, alternative);
    achievedPower = result.power;

    if (achievedPower >= power) {
      break;
    }
    n++;
  }

  return {
    n: n,
    achievedPower: achievedPower
  };
}

/**
 * Calculate required sample size for one-sample t-test
 *
 * @param {number} d - Cohen's d effect size
 * @param {number} power - Desired power (default 0.80)
 * @param {number} alpha - Significance level (default 0.05)
 * @param {string} alternative - 'two-sided' or 'one-sided'
 * @returns {Object} { n, achievedPower }
 */
export function sampleSizeOneSampleTTest(d, power = 0.80, alpha = 0.05, alternative = 'two-sided') {
  const zBeta = normalQuantile(power);
  const zAlpha = alternative === 'two-sided'
    ? normalQuantile(1 - alpha / 2)
    : normalQuantile(1 - alpha);

  // Initial estimate using normal approximation
  let n = Math.ceil(Math.pow((zAlpha + zBeta) / d, 2));
  let achievedPower = 0;

  // Refine using iterative search
  for (let i = 0; i < 100; i++) {
    const result = powerOneSampleTTest(n, d, alpha, alternative);
    achievedPower = result.power;

    if (achievedPower >= power) {
      break;
    }
    n++;
  }

  return {
    n: n,
    achievedPower: achievedPower
  };
}

// ============================================================================
// NON-PARAMETRIC POWER CALCULATIONS
// ============================================================================

/**
 * Asymptotic Relative Efficiency (ARE)
 *
 * For normal data:
 * - Mann-Whitney vs t-test: 3/π ≈ 0.955
 * - Wilcoxon vs paired t-test: 3/π ≈ 0.955
 * - Kruskal-Wallis vs ANOVA: 3/π ≈ 0.955
 */
export const ARE_NORMAL = 3 / Math.PI; // ≈ 0.9549

/**
 * Calculate power for Mann-Whitney U test
 *
 * Uses ARE approximation: effectively reduces sample size by factor of ARE.
 *
 * @param {number} n1 - Sample size group 1
 * @param {number} n2 - Sample size group 2
 * @param {number} d - Effect size (Cohen's d equivalent)
 * @param {number} alpha - Significance level
 * @param {string} alternative - 'two-sided', 'greater', or 'less'
 * @returns {Object} { power, effectiveN, are }
 */
export function powerMannWhitneyU(n1, n2, d, alpha = 0.05, alternative = 'two-sided') {
  // Effective sample size accounting for ARE
  const effectiveN1 = n1 * ARE_NORMAL;
  const effectiveN2 = n2 * ARE_NORMAL;

  // Use t-test power with effective sample sizes
  const result = powerTwoSampleTTest(effectiveN1, effectiveN2, d, alpha, alternative);

  return {
    power: result.power,
    effectiveN: effectiveN1 + effectiveN2,
    are: ARE_NORMAL,
    ncp: result.ncp
  };
}

/**
 * Calculate power for Wilcoxon signed-rank test
 *
 * @param {number} n - Number of pairs
 * @param {number} d - Effect size (standardized mean difference)
 * @param {number} alpha - Significance level
 * @param {string} alternative - 'two-sided', 'greater', or 'less'
 * @returns {Object} { power, effectiveN, are }
 */
export function powerWilcoxonSignedRank(n, d, alpha = 0.05, alternative = 'two-sided') {
  // Effective sample size
  const effectiveN = n * ARE_NORMAL;

  // Use paired t-test power with effective sample size
  const result = powerPairedTTest(effectiveN, d, alpha, alternative);

  return {
    power: result.power,
    effectiveN: effectiveN,
    are: ARE_NORMAL
  };
}

/**
 * Calculate power for Kruskal-Wallis test
 *
 * @param {number} nPerGroup - Sample size per group
 * @param {number} k - Number of groups
 * @param {number} f - Cohen's f effect size
 * @param {number} alpha - Significance level
 * @returns {Object} { power, effectiveN, are }
 */
export function powerKruskalWallis(nPerGroup, k, f, alpha = 0.05) {
  // Effective sample size per group
  const effectiveNPerGroup = nPerGroup * ARE_NORMAL;

  // Use ANOVA power with effective sample sizes
  const result = powerOneWayANOVA(effectiveNPerGroup, k, f, alpha);

  return {
    power: result.power,
    effectiveN: effectiveNPerGroup * k,
    are: ARE_NORMAL
  };
}

// ============================================================================
// POWER CURVE GENERATION
// ============================================================================

/**
 * Generate power curve data for visualization
 *
 * @param {string} testType - 't-test', 'anova', 'correlation', etc.
 * @param {Array<number>} sampleSizes - Array of sample sizes to evaluate
 * @param {Array<number>} effectSizes - Array of effect sizes
 * @param {number} alpha - Significance level
 * @param {Object} options - Additional test-specific options
 * @returns {Array<Object>} Array of { n, effectSize, power } objects
 */
export function generatePowerCurve(testType, sampleSizes, effectSizes, alpha = 0.05, options = {}) {
  const data = [];

  for (const n of sampleSizes) {
    for (const es of effectSizes) {
      let power;

      switch (testType) {
        case 't-test':
        case 'two-sample-t':
          power = powerTwoSampleTTest(n, n, es, alpha, options.alternative || 'two-sided').power;
          break;
        case 'one-sample-t':
          power = powerOneSampleTTest(n, es, alpha, options.alternative || 'two-sided').power;
          break;
        case 'paired-t':
          power = powerPairedTTest(n, es, alpha, options.alternative || 'two-sided').power;
          break;
        case 'anova':
          power = powerOneWayANOVA(n, options.k || 3, es, alpha).power;
          break;
        case 'correlation':
          power = powerCorrelation(n, es, alpha, options.alternative || 'two-sided').power;
          break;
        case 'mann-whitney':
          power = powerMannWhitneyU(n, n, es, alpha, options.alternative || 'two-sided').power;
          break;
        case 'wilcoxon':
          power = powerWilcoxonSignedRank(n, es, alpha, options.alternative || 'two-sided').power;
          break;
        case 'kruskal-wallis':
          power = powerKruskalWallis(n, options.k || 3, es, alpha).power;
          break;
        default:
          power = powerTwoSampleTTest(n, n, es, alpha).power;
      }

      data.push({
        n: n,
        effectSize: es,
        power: power,
        powerPercent: (power * 100).toFixed(1)
      });
    }
  }

  return data;
}

/**
 * Find sample size for target power
 *
 * @param {string} testType - Test type
 * @param {number} effectSize - Effect size
 * @param {number} targetPower - Target power (default 0.80)
 * @param {number} alpha - Significance level
 * @param {Object} options - Additional options
 * @returns {Object} { n, achievedPower }
 */
export function findSampleSizeForPower(testType, effectSize, targetPower = 0.80, alpha = 0.05, options = {}) {
  let n = 4; // Minimum practical sample size
  let power = 0;
  const maxN = 10000;

  while (power < targetPower && n < maxN) {
    const curveData = generatePowerCurve(testType, [n], [effectSize], alpha, options);
    power = curveData[0].power;

    if (power < targetPower) {
      n++;
    }
  }

  return {
    n: n,
    achievedPower: power
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate minimum detectable effect size
 *
 * Given sample size and desired power, what's the smallest effect we can detect?
 *
 * @param {number} n - Sample size (per group for two-sample tests)
 * @param {number} power - Desired power
 * @param {number} alpha - Significance level
 * @param {string} testType - Test type
 * @returns {number} Minimum detectable effect size
 */
export function minimumDetectableEffectSize(n, power = 0.80, alpha = 0.05, testType = 't-test') {
  let minD = 0.01;
  let maxD = 3.0;
  let tolerance = 0.001;

  // Binary search for effect size
  while (maxD - minD > tolerance) {
    const midD = (minD + maxD) / 2;
    const curveData = generatePowerCurve(testType, [n], [midD], alpha);
    const achievedPower = curveData[0].power;

    if (achievedPower < power) {
      minD = midD;
    } else {
      maxD = midD;
    }
  }

  return (minD + maxD) / 2;
}

/**
 * Calculate post hoc power (with warning)
 *
 * WARNING: Post hoc power is generally meaningless and should not be used
 * to interpret non-significant results. This function is provided for
 * educational purposes only.
 *
 * @param {number} observedEffect - Observed effect size
 * @param {number} n1 - Sample size group 1
 * @param {number} n2 - Sample size group 2
 * @param {number} alpha - Significance level
 * @returns {Object} { power, warning }
 */
export function postHocPower(observedEffect, n1, n2, alpha = 0.05) {
  const result = powerTwoSampleTTest(n1, n2, observedEffect, alpha);

  return {
    power: result.power,
    warning: 'Post hoc power is a function of the p-value and provides no additional information. ' +
             'If your result was non-significant, calculating post hoc power does NOT tell you ' +
             'whether you had "enough" power. Instead, report confidence intervals or conduct ' +
             'a sensitivity analysis to determine what effect size you could have detected.'
  };
}

// Helper: F distribution quantile (inverse CDF)
function fQuantile(p, df1, df2) {
  // Approximation using normal for large df
  if (df1 > 100 && df2 > 100) {
    return 1 + normalQuantile(p) * Math.sqrt(2 / df1);
  }

  // Use iterative search for smaller df
  let low = 0;
  let high = 100;
  const tolerance = 0.0001;

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const cdf = fCDF(mid, df1, df2);
    if (cdf < p) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

// Helper: Chi-square quantile (inverse CDF)
function chiSquareQuantile(p, df) {
  // Wilson-Hilferty approximation
  const z = normalQuantile(p);
  const term = 1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df));
  return df * Math.pow(term, 3);
}
