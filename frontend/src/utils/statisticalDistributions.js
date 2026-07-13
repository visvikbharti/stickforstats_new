/**
 * Statistical Distribution Functions
 *
 * The three p-value functions here were each computed as `1 - jStat.X.cdf(...)`.
 *
 * That is catastrophic cancellation. Once the CDF rounds to 1.0 in float64 -- which happens for
 * any tail probability below about 2e-16, i.e. for EVERY decisively significant result -- the
 * subtraction returns exactly 0, and the screen prints:
 *
 *     p = 0.0000 < 0.05  ->  significant
 *
 * A p-value of zero does not exist; it asserts the outcome is impossible under the null, which
 * no finite sample can establish. Measured on inputs these very screens produce:
 *
 *     1 - jStat.centralF.cdf(200, 2, 30)        ->  0        (truth: 2.06e-18)
 *     2 * (1 - jStat.studentt.cdf(40, 20))      ->  0        (truth: 1.46e-20)
 *     1 - jStat.chisquare.cdf(100, 10)          ->  0        (truth: 5.45e-17)
 *
 * These now delegate to `utils/tails`, which computes each upper tail DIRECTLY -- there is
 * nothing to cancel -- and is checked against scipy's survival functions in tails.test.js.
 *
 * This file is live: TwoWayANOVA, MANOVA, PostHocTests and RepeatedMeasuresANOVA all import it,
 * and all four are reachable from /statistical-analysis-tools -> Advanced Statistics.
 */

import jStat from 'jstat';

import { tSfTwoSided, fSf, chiSquareSf } from './tails';

/**
 * F-distribution p-value (upper tail).
 * P(F > f | df1, df2)
 */
export const fTestPValue = (f, df1, df2) => {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 1;
  return fSf(f, df1, df2);
};

/**
 * t-distribution p-value (two-tailed).
 * P(|T| > |t| | df)
 */
export const tTestPValue = (t, df) => {
  if (df <= 0) return 1;
  return tSfTwoSided(t, df);
};

/**
 * t-distribution critical value (upper tail).
 * Returns t such that P(T > t | df) = alpha.
 */
export const tCriticalValue = (df, alpha) => {
  if (df <= 0 || alpha <= 0 || alpha >= 1) return NaN;
  return jStat.studentt.inv(1 - alpha, df);
};

/**
 * F-distribution critical value (upper tail).
 * Returns f such that P(F > f | df1, df2) = alpha.
 */
export const fCriticalValue = (df1, df2, alpha) => {
  if (df1 <= 0 || df2 <= 0 || alpha <= 0 || alpha >= 1) return NaN;
  return jStat.centralF.inv(1 - alpha, df1, df2);
};

/**
 * Chi-square distribution p-value (upper tail).
 * P(X² > x | df)
 */
export const chiSquarePValue = (x, df) => {
  if (x <= 0 || df <= 0) return 1;
  return chiSquareSf(x, df);
};

/**
 * The smallest Tukey p-value this quadrature can actually resolve.
 *
 * `tukeyPValue` evaluates the studentized-range CDF by 16-point Gauss-Legendre quadrature and
 * subtracts it from 1. The quadrature itself is only good to roughly 1e-8 relative, so any
 * "p-value" it reports below that is numerical noise -- and once the CDF rounds to 1.0, the
 * subtraction gives exactly 0, which it then clamped and printed as "p = 0.0000".
 *
 * Below this floor the function returns null, and the caller says "p < 1e-8" -- which is a true
 * statement about a bound, rather than a false statement about a value.
 */
export const TUKEY_RESOLUTION = 1e-8;

/**
 * Clamp a quadrature tail to what the quadrature can actually see. Below the resolution the
 * answer is not zero -- it is unknown, and smaller than the floor.
 */
const resolveTail = (tail) => {
  if (!Number.isFinite(tail)) return null;
  if (tail < TUKEY_RESOLUTION) return null;
  return Math.min(1, tail);
};

/**
 * Tukey HSD p-value using numerical integration.
 *
 * Computes 1 - CDF of the Studentized Range distribution Q(q, k, df)
 * using Gauss-Legendre quadrature. Returns null below TUKEY_RESOLUTION.
 *
 * Reference: Algorithm AS 190 (Lund & Lund, 1983)
 */
export const tukeyPValue = (q, k, df) => {
  if (q <= 0) return 1;
  if (k < 2 || df < 2) return NaN;

  const phi = (x) => jStat.normal.pdf(x, 0, 1);
  const Phi = (x) => jStat.normal.cdf(x, 0, 1);

  // 16-point Gauss-Legendre nodes and weights on [-1, 1]
  const glNodes = [
    -0.9894009349916499, -0.9445750230732326, -0.8656312023878318, -0.7554044083550030,
    -0.6178762444026438, -0.4580167776572274, -0.2816035507792589, -0.0950125098376374,
     0.0950125098376374,  0.2816035507792589,  0.4580167776572274,  0.6178762444026438,
     0.7554044083550030,  0.8656312023878318,  0.9445750230732326,  0.9894009349916499
  ];
  const glWeights = [
    0.0271524594117541, 0.0622535239386479, 0.0951585116824928, 0.1246289712555339,
    0.1495959888165767, 0.1691565193950025, 0.1826034150449236, 0.1894506104550685,
    0.1894506104550685, 0.1826034150449236, 0.1691565193950025, 0.1495959888165767,
    0.1246289712555339, 0.0951585116824928, 0.0622535239386479, 0.0271524594117541
  ];

  // Inner integral: ∫ φ(x) * [Φ(x + q*s) - Φ(x)]^{k-1} dx over [-6, 6]
  const innerIntegral = (qs) => {
    const a = -6, b = 6;
    let sum = 0;
    for (let i = 0; i < 16; i++) {
      const x = a + (b - a) * (glNodes[i] + 1) / 2;
      const diff = Phi(x + qs) - Phi(x);
      if (diff > 0) {
        sum += glWeights[i] * phi(x) * Math.pow(diff, k - 1);
      }
    }
    return sum * (b - a) / 2;
  };

  // For very large df, use the asymptotic (infinite df) formula
  if (df > 5000) {
    const cdf = k * innerIntegral(q);
    return resolveTail(1 - cdf);
  }

  // Outer integral over s: ∫ f_S(s) * innerIntegral(q*s) ds
  // where S = sqrt(chi²_df / df) has density f_S
  const logNorm = (df / 2) * Math.log(df / 2) - jStat.gammaln(df / 2) + Math.log(2);

  const fS = (s) => {
    if (s <= 0) return 0;
    return Math.exp(logNorm + (df - 1) * Math.log(s) - df * s * s / 2);
  };

  // Adaptive integration bounds for the chi distribution
  const mean_s = 1 - 1 / (4 * df); // approximate mean of sqrt(chi²/df)
  const sd_s = 1 / Math.sqrt(2 * df); // approximate sd
  const lo = Math.max(0.001, mean_s - 5 * sd_s);
  const hi = mean_s + 5 * sd_s;

  let outerSum = 0;
  for (let i = 0; i < 16; i++) {
    const s = lo + (hi - lo) * (glNodes[i] + 1) / 2;
    outerSum += glWeights[i] * fS(s) * innerIntegral(q * s);
  }

  const cdf = k * outerSum * (hi - lo) / 2;
  return resolveTail(1 - cdf);
};

/**
 * Scheffé test p-value.
 * Scheffé's test statistic F_s = t² / (k-1) follows F(k-1, df) under H0.
 */
export const scheffePValue = (tStat, k, df) => {
  const fStat = (tStat * tStat) / (k - 1);
  return fTestPValue(fStat, k - 1, df);
};

/**
 * Anderson-Darling p-value approximation.
 * Uses the D'Agostino & Stephens (1986) formula with sample-size correction.
 * Reference: Marsaglia & Marsaglia (2004) for improved accuracy.
 */
export const andersonDarlingPValue = (A2, n) => {
  // Apply sample-size correction: A* = A2 * (1 + 0.75/n + 2.25/n²)
  const Astar = A2 * (1 + 0.75 / n + 2.25 / (n * n));

  if (Astar >= 0.6) {
    return Math.max(0.0001, Math.exp(1.2937 - 5.709 * Astar + 0.0186 * Astar * Astar));
  } else if (Astar >= 0.34) {
    return Math.exp(0.9177 - 4.279 * Astar - 1.38 * Astar * Astar);
  } else if (Astar >= 0.2) {
    return 1 - Math.exp(-8.318 + 42.796 * Astar - 59.938 * Astar * Astar);
  } else {
    return 1 - Math.exp(-13.436 + 101.14 * Astar - 223.73 * Astar * Astar);
  }
};
