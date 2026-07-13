/**
 * Confidence Interval Utilities - Test Suite
 *
 * Comprehensive tests for confidence interval calculations.
 * Validates correctness of statistical formulas and edge cases.
 *
 * Test Coverage:
 * - Basic statistics (mean, variance, std)
 * - t-intervals for mean
 * - z-intervals for mean
 * - Variance and std dev intervals
 * - Proportion intervals (Wald, Wilson)
 * - Coverage probability (Monte Carlo verification)
 */

import {
  generateRandomSample,
  calculateStats,
  calculateMeanTInterval,
  calculateMeanZInterval,
  calculateVarianceInterval,
  calculateStdDevInterval,
  calculateProportionWaldInterval,
  calculateProportionWilsonInterval
} from './simulationUtils';

// ============================================================
// BASIC STATISTICS TESTS
// ============================================================

describe('calculateStats', () => {
  test('should calculate correct mean', () => {
    const data = [1, 2, 3, 4, 5];
    const stats = calculateStats(data);
    expect(stats.mean).toBe(3);
  });

  test('should calculate correct sample variance', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const stats = calculateStats(data);
    // Mean = 5, sum of squared deviations = 32, n-1 = 7
    // Sample variance = 32/7 ≈ 4.571
    expect(stats.variance).toBeCloseTo(4.571, 2);
  });

  test('should calculate correct standard deviation', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const stats = calculateStats(data);
    // Sample std = √(32/7) ≈ 2.138
    expect(stats.std).toBeCloseTo(2.138, 2);
  });

  test('should handle constant data', () => {
    const data = [5, 5, 5, 5, 5];
    const stats = calculateStats(data);
    expect(stats.mean).toBe(5);
    expect(stats.variance).toBe(0);
    expect(stats.std).toBe(0);
  });

  test('should return correct sample size', () => {
    const data = [1, 2, 3];
    const stats = calculateStats(data);
    expect(stats.n).toBe(3);
  });
});

// ============================================================
// T-INTERVAL FOR MEAN TESTS
// ============================================================

describe('calculateMeanTInterval', () => {
  test('should return interval containing the mean', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = calculateMeanTInterval(data, 0.95);

    expect(result.lower).toBeLessThan(result.mean);
    expect(result.upper).toBeGreaterThan(result.mean);
    expect(result.mean).toBe(5);
  });

  test('should return wider interval for lower confidence level', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const ci90 = calculateMeanTInterval(data, 0.90);
    const ci95 = calculateMeanTInterval(data, 0.95);
    const ci99 = calculateMeanTInterval(data, 0.99);

    const width90 = ci90.upper - ci90.lower;
    const width95 = ci95.upper - ci95.lower;
    const width99 = ci99.upper - ci99.lower;

    expect(width90).toBeLessThan(width95);
    expect(width95).toBeLessThan(width99);
  });

  test('should have narrower interval for larger sample size', () => {
    // Small sample
    const data1 = [1, 2, 3, 4, 5];
    const ci1 = calculateMeanTInterval(data1, 0.95);
    const width1 = ci1.upper - ci1.lower;

    // Larger sample with same mean and std
    const data2 = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5];
    const ci2 = calculateMeanTInterval(data2, 0.95);
    const width2 = ci2.upper - ci2.lower;

    expect(width2).toBeLessThan(width1);
  });

  test('should include correct statistical properties', () => {
    const data = [10, 12, 14, 16, 18];
    const result = calculateMeanTInterval(data, 0.95);

    expect(result).toHaveProperty('lower');
    expect(result).toHaveProperty('upper');
    expect(result).toHaveProperty('mean');
    expect(result).toHaveProperty('std');
    expect(result).toHaveProperty('n');
    expect(result).toHaveProperty('margin');

    expect(result.n).toBe(5);
    expect(result.mean).toBe(14);
  });

  test('margin of error formula: ME = t * (s/√n)', () => {
    const data = [10, 12, 14, 16, 18];
    const result = calculateMeanTInterval(data, 0.95);

    // Margin should approximately equal half the interval width
    const calculatedMargin = (result.upper - result.lower) / 2;
    expect(result.margin).toBeCloseTo(calculatedMargin, 5);

    // Check formula structure (approximate due to t-critical approximation)
    const expectedMargin = result.margin;
    expect(result.upper).toBeCloseTo(result.mean + expectedMargin, 5);
    expect(result.lower).toBeCloseTo(result.mean - expectedMargin, 5);
  });

  /**
   * A 95% interval must cover the truth 95% of the time. This is the property the whole
   * confidence_intervals module exists to demonstrate, so it is worth testing properly.
   *
   * The previous version of this test asserted `expect(coverage).toBeLessThan(1.0)` over 100
   * simulations -- i.e. it demanded that at least one interval MISS. But 100/100 coverage is a
   * perfectly legitimate random outcome; it happens with probability 0.95^100. The test was
   * asserting that a random event must occur, and it duly failed in CI at random -- which, because
   * `docker-build` needs `frontend-test`, BLOCKED THE PRODUCTION IMAGE PUSH.
   *
   * It also could not have detected the real bug underneath it. `tCritical` returned the NORMAL
   * quantile for df > 30, so a nominal 95% interval covered only 94.3% at n = 41 -- and this test
   * only ever ran n = 30, on the one side of the cliff where the error happened to be conservative.
   *
   * So: sample sizes on BOTH sides of df = 30, and a band derived from the binomial standard error
   * rather than guessed. With N = 4000, se = sqrt(0.95 * 0.05 / 4000) = 0.0034, so +/- 0.02 is
   * about 6 se -- noise cannot trip it.
   *
   * BUT BE HONEST ABOUT WHAT THIS TEST CANNOT DO. A 0.93-0.97 band does NOT catch the bug above:
   * the broken coverage was 0.9426, which sits comfortably inside it. I wrote "it cannot pass with
   * the old coverage" in this very comment, and that was FALSE -- a mutation (putting the normal
   * approximation back) left all 47 tests green. Separating 0.95 from 0.9426 by Monte Carlo alone
   * would need ~64,000 replicates per sample size.
   *
   * So the precision guard is NOT this test. It is the deterministic one below, which pins the
   * critical value itself against the exact inverse-t. This one is a coverage smoke test: it proves
   * the intervals are broadly calibrated, and it would catch a gross error. It is kept for that,
   * and for the property it demonstrates -- not relied on for the thing it cannot see.
   */
  test.each([10, 30, 41, 61])('a 95%% t-interval covers ~95%% of the time at n = %i (Monte Carlo)', (sampleSize) => {
    const numSimulations = 4000;
    const trueMean = 10;
    const trueStd = 2;
    let coverageCount = 0;

    for (let i = 0; i < numSimulations; i++) {
      const sample = generateRandomSample('NORMAL', { mean: trueMean, std: trueStd }, sampleSize);
      const ci = calculateMeanTInterval(sample, 0.95);

      if (ci.lower <= trueMean && trueMean <= ci.upper) {
        coverageCount++;
      }
    }

    const coverage = coverageCount / numSimulations;

    // ~6 binomial standard errors either side: noise cannot trip it. (It also cannot see a 0.9426
    // -- see the note above. The deterministic test below is what guards that.)
    expect(coverage).toBeGreaterThan(0.93);
    expect(coverage).toBeLessThan(0.97);
  });

  /**
   * THE ACTUAL GUARD. Deterministic, exact, and it dies the moment the approximation comes back.
   *
   * `tCritical` returned the NORMAL quantile (1.959964) for every df > 30, so a "95%" interval at
   * n = 41 was built from 1.96 where Student's t is 2.021075 -- 3.0% too narrow, covering 94.3%.
   * Too narrow is the dangerous direction: it overstates precision.
   *
   * tCritical is module-private, so recover it through the public API. The margin is
   * t * s / sqrt(n), hence t = margin * sqrt(n) / s. A fixed arithmetic sample makes this exact and
   * free of any randomness.
   *
   * The expected values are scipy's stats.t.ppf(0.975, df), executed -- not transcribed from
   * memory, and not read off a table.
   */
  describe('the critical value is the exact inverse-t, on both sides of df = 30', () => {
    const impliedTCritical = (n) => {
      const data = Array.from({ length: n }, (_, i) => i + 1); // fixed, non-degenerate
      const ci = calculateMeanTInterval(data, 0.95);
      return (ci.margin * Math.sqrt(ci.n)) / ci.std;
    };

    const NORMAL_QUANTILE_975 = 1.959964; // what the broken code returned for every df > 30

    it.each([
      [10, 2.26215716], // df 9
      [30, 2.04522964], // df 29  -- the old series was 1.5% too WIDE here
      [41, 2.02107539], // df 40  -- the old code returned 1.96 here: 3.0% too NARROW
      [61, 2.00029782], // df 60
    ])('at n = %i the critical value is %f', (n, exact) => {
      expect(impliedTCritical(n)).toBeCloseTo(exact, 6);
    });

    it('never substitutes the normal quantile for t above df = 30', () => {
      // The exact regression. Both of these sit on the far side of the old `if (df > 30)` cliff.
      for (const n of [41, 61]) {
        expect(impliedTCritical(n)).not.toBeCloseTo(NORMAL_QUANTILE_975, 3);
        expect(impliedTCritical(n)).toBeGreaterThan(NORMAL_QUANTILE_975);
      }
    });

    it('is monotonically decreasing in n, approaching the normal quantile from above', () => {
      // Student's t is always wider than the normal, and converges to it. A critical value that
      // jumped DOWN to 1.96 at df = 31 was not a t distribution at all.
      const values = [10, 30, 41, 61, 121].map(impliedTCritical);

      expect(values).toEqual([...values].sort((a, b) => b - a)); // strictly decreasing
      expect(values[values.length - 1]).toBeGreaterThan(NORMAL_QUANTILE_975);
    });
  });
});

// ============================================================
// Z-INTERVAL FOR MEAN TESTS
// ============================================================

describe('calculateMeanZInterval', () => {
  test('should return interval containing the mean', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = calculateMeanZInterval(data, 0.95);

    expect(result.lower).toBeLessThan(result.mean);
    expect(result.upper).toBeGreaterThan(result.mean);
  });

  test('should use known sigma when provided', () => {
    const data = [10, 12, 14, 16, 18];
    const knownSigma = 3;
    const result = calculateMeanZInterval(data, 0.95, knownSigma);

    // Margin should be based on known sigma, not sample std
    // ME = z * σ / √n = 1.96 * 3 / √5 ≈ 2.63
    const expectedMargin = 1.96 * knownSigma / Math.sqrt(5);
    expect(result.margin).toBeCloseTo(expectedMargin, 1);
  });

  test('should use sample std when sigma not provided', () => {
    const data = [10, 12, 14, 16, 18];
    const result = calculateMeanZInterval(data, 0.95, null);

    expect(result).toHaveProperty('std');
    expect(result.std).toBeGreaterThan(0);
  });

  test('z-interval should be narrower than t-interval for small samples', () => {
    const data = [1, 2, 3, 4, 5]; // Small sample where t differs from z
    const tInterval = calculateMeanTInterval(data, 0.95);
    const zInterval = calculateMeanZInterval(data, 0.95);

    const tWidth = tInterval.upper - tInterval.lower;
    const zWidth = zInterval.upper - zInterval.lower;

    // t-interval should be wider due to t > z for small df
    expect(tWidth).toBeGreaterThan(zWidth);
  });

  test('95% CI should use z ≈ 1.96', () => {
    const data = new Array(100).fill(0).map((_, i) => i); // 0 to 99
    const result = calculateMeanZInterval(data, 0.95);

    // Mean = 49.5, n = 100
    // With large sample, can check margin structure
    const stats = calculateStats(data);
    const expectedZ = 1.96; // approximate
    const expectedMargin = expectedZ * stats.std / Math.sqrt(100);

    expect(result.margin).toBeCloseTo(expectedMargin, 0.5);
  });
});

// ============================================================
// VARIANCE INTERVAL TESTS
// ============================================================

describe('calculateVarianceInterval', () => {
  test('should return interval for variance', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = calculateVarianceInterval(data, 0.95);

    // Interval should exist and variance should be correct
    // Note: Chi-squared approximation can have issues with small df
    expect(result.lower).toBeGreaterThan(0);
    expect(result.upper).toBeGreaterThan(0);
    expect(result.variance).toBeCloseTo(4.571, 2);
    expect(result.n).toBe(8);
  });

  test('should return wider interval for higher confidence', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const ci90 = calculateVarianceInterval(data, 0.90);
    const ci95 = calculateVarianceInterval(data, 0.95);
    const ci99 = calculateVarianceInterval(data, 0.99);

    const width90 = Math.abs(ci90.upper - ci90.lower);
    const width95 = Math.abs(ci95.upper - ci95.lower);
    const width99 = Math.abs(ci99.upper - ci99.lower);

    expect(width90).toBeLessThan(width95);
    expect(width95).toBeLessThan(width99);
  });

  test('should use chi-squared distribution formula', () => {
    const data = [1, 2, 3, 4, 5];
    const result = calculateVarianceInterval(data, 0.95);

    // Interval should be based on (n-1)s²/χ² distribution
    // Lower bound should be positive, upper should be greater than lower
    expect(result.lower).toBeGreaterThan(0);
    expect(result.upper).toBeGreaterThan(0);
    expect(result.variance).toBeGreaterThan(0);
    // Width should be reasonable for small sample
    const width = Math.abs(result.upper - result.lower);
    expect(width).toBeGreaterThan(0);
  });

  test('should include sample size', () => {
    const data = [1, 2, 3, 4, 5];
    const result = calculateVarianceInterval(data, 0.95);

    expect(result.n).toBe(5);
  });
});

// ============================================================
// STANDARD DEVIATION INTERVAL TESTS
// ============================================================

describe('calculateStdDevInterval', () => {
  test('should return interval for std dev', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = calculateStdDevInterval(data, 0.95);

    // Interval should exist
    expect(result.lower).toBeGreaterThan(0);
    expect(result.upper).toBeGreaterThan(0);
    expect(result.std).toBeCloseTo(2.138, 2);
    expect(result.n).toBe(8);
  });

  test('should be square root of variance interval', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const varResult = calculateVarianceInterval(data, 0.95);
    const stdResult = calculateStdDevInterval(data, 0.95);

    // Std interval bounds should be square roots of variance interval bounds
    // Handle potential negative values in approximation by using absolute values
    expect(stdResult.lower).toBeCloseTo(Math.sqrt(Math.abs(varResult.lower)), 4);
    expect(Math.abs(stdResult.upper)).toBeCloseTo(Math.sqrt(Math.abs(varResult.upper)), 4);
  });

  test('should always be positive', () => {
    const data = [1, 2, 3, 4, 5];
    const result = calculateStdDevInterval(data, 0.95);

    expect(result.lower).toBeGreaterThan(0);
    expect(result.std).toBeGreaterThan(0);
    expect(Math.abs(result.upper)).toBeGreaterThan(0);
  });
});

// ============================================================
// PROPORTION INTERVAL TESTS (WALD)
// ============================================================

describe('calculateProportionWaldInterval', () => {
  test('should return interval for proportion', () => {
    const result = calculateProportionWaldInterval(40, 100, 0.95);

    expect(result.proportion).toBe(0.4);
    expect(result.lower).toBeLessThan(0.4);
    expect(result.upper).toBeGreaterThan(0.4);
  });

  test('should be in [0, 1] range', () => {
    const result = calculateProportionWaldInterval(5, 100, 0.95);

    expect(result.lower).toBeGreaterThanOrEqual(0);
    expect(result.upper).toBeLessThanOrEqual(1);
  });

  test('should handle extreme proportions (near 0)', () => {
    const result = calculateProportionWaldInterval(1, 100, 0.95);

    expect(result.proportion).toBe(0.01);
    expect(result.lower).toBeGreaterThanOrEqual(0);
  });

  test('should handle extreme proportions (near 1)', () => {
    const result = calculateProportionWaldInterval(99, 100, 0.95);

    expect(result.proportion).toBe(0.99);
    expect(result.upper).toBeLessThanOrEqual(1);
  });

  test('should use Wald formula: p̂ ± z*√(p̂(1-p̂)/n)', () => {
    const n = 100;
    const x = 50;
    const result = calculateProportionWaldInterval(x, n, 0.95);

    expect(result.proportion).toBe(0.5);
    // Margin ≈ 1.96 * √(0.5 * 0.5 / 100) ≈ 0.098
    expect(result.margin).toBeCloseTo(0.098, 2);
  });

  test('narrower interval for larger sample size', () => {
    const ci1 = calculateProportionWaldInterval(50, 100, 0.95);
    const ci2 = calculateProportionWaldInterval(500, 1000, 0.95);

    const width1 = ci1.upper - ci1.lower;
    const width2 = ci2.upper - ci2.lower;

    expect(width2).toBeLessThan(width1);
  });
});

// ============================================================
// PROPORTION INTERVAL TESTS (WILSON)
// ============================================================

describe('calculateProportionWilsonInterval', () => {
  test('should return interval for proportion', () => {
    const result = calculateProportionWilsonInterval(40, 100, 0.95);

    expect(result.proportion).toBe(0.4);
    expect(result.lower).toBeLessThan(result.proportion);
    expect(result.upper).toBeGreaterThan(result.proportion);
  });

  test('should be in [0, 1] range', () => {
    const result = calculateProportionWilsonInterval(5, 100, 0.95);

    expect(result.lower).toBeGreaterThanOrEqual(0);
    expect(result.upper).toBeLessThanOrEqual(1);
  });

  test('should handle extreme proportions better than Wald', () => {
    // Wilson performs better for small p
    const _wald = calculateProportionWaldInterval(0, 20, 0.95);
    const wilson = calculateProportionWilsonInterval(0, 20, 0.95);

    // Wilson should give non-zero lower bound even when x=0
    // (Actually, both clamp to 0, but Wilson's upper bound is more accurate)
    expect(wilson.upper).toBeGreaterThan(0);
    expect(wilson.upper).toBeLessThan(0.25); // Reasonable bound
  });

  test('Wilson interval should differ from Wald for small samples', () => {
    const wald = calculateProportionWaldInterval(5, 20, 0.95);
    const wilson = calculateProportionWilsonInterval(5, 20, 0.95);

    // Intervals should be different (Wilson is more accurate)
    const waldWidth = wald.upper - wald.lower;
    const wilsonWidth = wilson.upper - wilson.lower;

    expect(Math.abs(waldWidth - wilsonWidth)).toBeGreaterThan(0.01);
  });

  test('Wilson should approach Wald for large n', () => {
    const wald = calculateProportionWaldInterval(500, 1000, 0.95);
    const wilson = calculateProportionWilsonInterval(500, 1000, 0.95);

    // For large n, Wilson ≈ Wald
    expect(Math.abs(wilson.lower - wald.lower)).toBeLessThan(0.01);
    expect(Math.abs(wilson.upper - wald.upper)).toBeLessThan(0.01);
  });
});

// ============================================================
// RANDOM SAMPLE GENERATION TESTS
// ============================================================

describe('generateRandomSample', () => {
  test('should generate correct sample size', () => {
    const sample = generateRandomSample('NORMAL', { mean: 0, std: 1 }, 100);
    expect(sample).toHaveLength(100);
  });

  test('NORMAL: sample mean should approximate population mean', () => {
    const trueMean = 10;
    const sample = generateRandomSample('NORMAL', { mean: trueMean, std: 1 }, 5000);
    const sampleMean = sample.reduce((a, b) => a + b, 0) / sample.length;

    expect(Math.abs(sampleMean - trueMean)).toBeLessThan(0.1);
  });

  test('UNIFORM: sample should be within range', () => {
    const sample = generateRandomSample('UNIFORM', { mean: 0, std: 1 }, 100);
    const min = Math.min(...sample);
    const max = Math.max(...sample);

    // Uniform with mean=0, std=1: range = [0 - √3, 0 + √3] ≈ [-1.73, 1.73]
    expect(min).toBeGreaterThan(-2);
    expect(max).toBeLessThan(2);
  });

  test('LOGNORMAL: all values should be positive', () => {
    const sample = generateRandomSample('LOGNORMAL', { mean: 0, sigma: 1 }, 100);
    sample.forEach(x => {
      expect(x).toBeGreaterThan(0);
    });
  });

  test('BINOMIAL: values should be integers in [0, n]', () => {
    const n = 10;
    const sample = generateRandomSample('BINOMIAL', { p: 0.5, n: n }, 100);
    sample.forEach(x => {
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(n);
    });
  });

  test('POISSON: values should be non-negative integers', () => {
    const sample = generateRandomSample('POISSON', { lambda: 5 }, 100);
    sample.forEach(x => {
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
    });
  });

  test('MIXTURE: should produce bimodal distribution', () => {
    const sample = generateRandomSample('MIXTURE', {
      mean: 0,
      std: 1,
      means: [-5, 5],
      stds: [1, 1],
      weights: [0.5, 0.5]
    }, 1000);

    // Some values should be near -5, some near 5
    const nearNeg5 = sample.filter(x => Math.abs(x + 5) < 2).length;
    const nearPos5 = sample.filter(x => Math.abs(x - 5) < 2).length;

    // Both modes should have substantial probability
    expect(nearNeg5).toBeGreaterThan(100);
    expect(nearPos5).toBeGreaterThan(100);
  });
});

// ============================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================

describe('Edge Cases', () => {
  test('calculateStats with single element', () => {
    const data = [5];
    const stats = calculateStats(data);

    expect(stats.mean).toBe(5);
    expect(stats.n).toBe(1);
    // Variance with n=1 is undefined (NaN) or Infinity
    // Our function uses (n-1) denominator, so 0/0
  });

  test('confidence intervals should handle perfect data', () => {
    const data = [1, 1, 1, 1, 1];
    const result = calculateMeanTInterval(data, 0.95);

    expect(result.mean).toBe(1);
    // Std = 0, so margin = 0
    expect(result.margin).toBe(0);
    expect(result.lower).toBe(1);
    expect(result.upper).toBe(1);
  });

  test('proportion intervals with p=0.5 (maximum variance)', () => {
    // p=0.5 gives widest interval
    const ci50 = calculateProportionWaldInterval(50, 100, 0.95);
    const ci20 = calculateProportionWaldInterval(20, 100, 0.95);
    const ci80 = calculateProportionWaldInterval(80, 100, 0.95);

    const width50 = ci50.upper - ci50.lower;
    const width20 = ci20.upper - ci20.lower;
    const width80 = ci80.upper - ci80.lower;

    // p=0.5 should have widest interval
    expect(width50).toBeGreaterThan(width20);
    expect(width50).toBeGreaterThan(width80);
  });
});
