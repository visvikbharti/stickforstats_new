/**
 * Upper-tail probabilities that survive the tail.
 * ===============================================
 *
 * Every p-value in this codebase's browser-side statistics was computed as `1 - cdf(x)`.
 * That is catastrophic cancellation: as soon as `cdf(x)` rounds to 1.0 in float64 -- which
 * happens for any tail probability below about 2e-16, i.e. for *every decisively significant
 * result* -- the subtraction returns exactly 0. The screen then printed:
 *
 *     p = 0.0000 < 0.05  ->  significantly different
 *
 * A p-value of zero does not exist. It means "this outcome is impossible under the null",
 * which no finite sample can establish. Measured on real inputs from this app:
 *
 *     2 * (1 - jStat.studentt.cdf(40, 20))     ->  0            (truth: 1.46e-20)
 *     1 - jStat.centralF.cdf(200, 2, 30)       ->  0            (truth: 2.06e-18)
 *
 * The functions below compute each upper tail DIRECTLY, so there is nothing to cancel:
 *
 *   - Student t is symmetric, so the upper tail at |t| is the lower tail at -|t|.
 *   - The normal CANNOT use that trick, because jStat's own erfc cancels: `jStat.normal.cdf(-9)`
 *     is exactly 0, when the truth is 1.13e-19. It goes through the incomplete gamma instead
 *     (erfc(x) = Q(1/2, x^2)).
 *   - The F upper tail is a regularized incomplete beta with its arguments swapped:
 *         P(F > f) = I_{d2 / (d2 + d1 f)}(d2/2, d1/2)
 *     which follows from I_x(a, b) = 1 - I_{1-x}(b, a). jStat exposes exactly this.
 *   - chi-square needs the regularized upper incomplete gamma Q(a, x), which jStat does not
 *     expose. It is implemented here with the standard Lentz continued fraction (Numerical
 *     Recipes, gcf), which converges directly on the upper tail, with the series form used
 *     in the region where the series is the stable branch.
 *
 * These agree with scipy's survival functions to float64 precision; there is a jest test
 * that checks exactly that against values computed by the backend.
 */

import { jStat } from 'jstat';

/** Two-sided p-value for a t-statistic: 2 * P(T > |t|). */
export const tSfTwoSided = (t, df) => {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return null;
  return 2 * jStat.studentt.cdf(-Math.abs(t), df);
};

/** One-sided upper tail for a t-statistic: P(T > t). */
export const tSf = (t, df) => {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return null;
  return jStat.studentt.cdf(-t, df);
};

/** Upper tail of the F distribution: P(F_{df1,df2} > f). */
export const fSf = (f, df1, df2) => {
  if (!Number.isFinite(f) || df1 <= 0 || df2 <= 0) return null;
  if (f <= 0) return 1;
  // I_{d2/(d2 + d1 f)}(d2/2, d1/2) -- the upper tail, expressed as a lower incomplete beta.
  return jStat.ibeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2);
};

const MAX_ITER = 300;
const EPS = 1e-16;
const FPMIN = 1e-300;

/**
 * Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x).
 * Continued fraction (modified Lentz) for x > a + 1; series elsewhere.
 */
const gammaQ = (a, x) => {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 1;

  const gln = jStat.gammaln(a);

  if (x < a + 1) {
    // Series for P(a, x); Q = 1 - P. In this region P is comfortably below 1, so the
    // subtraction is well conditioned -- unlike `1 - cdf` out in the tail.
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let i = 0; i < MAX_ITER; i += 1) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * EPS) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gln);
  }

  // Continued fraction for Q(a, x) directly.
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= MAX_ITER; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
};

/** Upper tail of the chi-square distribution: P(X²_df > x). */
export const chiSquareSf = (x, df) => {
  if (!Number.isFinite(x) || df <= 0) return null;
  if (x <= 0) return 1;
  return gammaQ(df / 2, x / 2);
};

/**
 * Upper tail of the standard normal: P(Z > z).
 *
 * NOT `jStat.normal.cdf(-z)`. jStat's own erfc cancels: `jStat.erfc(9 / Math.SQRT2)` is
 * exactly 0, so `jStat.normal.cdf(-9)` is exactly 0, when the true value is 1.13e-19. Every
 * z-based p-value in this app (Mann-Whitney, Wilcoxon, and the normal approximations) went
 * through that function.
 *
 * erfc(x) = Q(1/2, x²) for x >= 0, and Q is the continued fraction above, which converges
 * on the tail directly. So P(Z > z) = erfc(z/sqrt(2)) / 2 = Q(1/2, z²/2) / 2.
 */
export const normalSf = (z) => {
  if (!Number.isFinite(z)) return null;
  if (z < 0) return 1 - normalSf(-z);
  return gammaQ(0.5, (z * z) / 2) / 2;
};

/** Two-sided p-value for a z-score: 2 * P(Z > |z|). */
export const normalSfTwoSided = (z) => {
  if (!Number.isFinite(z)) return null;
  return gammaQ(0.5, (z * z) / 2);
};

const tails = { tSf, tSfTwoSided, normalSf, normalSfTwoSided, fSf, chiSquareSf };

export default tails;
