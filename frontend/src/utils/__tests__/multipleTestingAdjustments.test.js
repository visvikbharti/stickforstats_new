/**
 * Adjusted p-values must be monotone. Neither of these was.
 *
 * An adjusted p-value exists so that the reader can compare it to alpha directly. If the
 * sequence is not monotone in the raw p-values, that comparison gives the wrong answer: a
 * hypothesis with a LARGER raw p can be reported with a SMALLER adjusted p, and read as more
 * significant than one it is strictly less significant than.
 *
 * Holm's step-down needs a running maximum; Benjamini-Hochberg's step-up needs a running
 * minimum. Both were missing. The reference values below are statsmodels' `multipletests`,
 * which agrees with R's `p.adjust`.
 */

import { multipleTestingAdjustments } from '../advancedStatistics';

const close = (actual, expected) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10));
};

describe('Holm-Bonferroni', () => {
  test('adjusted p-values are a running maximum (they used to decrease)', () => {
    // multiplier 3, 2, 1 gives 0.09, 0.08, 0.04 -- the LARGEST raw p getting the SMALLEST
    // adjusted p. At alpha = 0.05 the third hypothesis read as significant. Holm rejects none.
    const { adjustedPValues, rejected } = multipleTestingAdjustments.holmBonferroni(
      [0.03, 0.04, 0.04],
      0.05
    );

    close(adjustedPValues, [0.09, 0.09, 0.09]);
    expect(rejected).toEqual([false, false, false]);
  });

  test('matches the reference on a mixed set', () => {
    const { adjustedPValues, rejected } = multipleTestingAdjustments.holmBonferroni(
      [0.001, 0.02, 0.03, 0.7],
      0.05
    );

    close(adjustedPValues, [0.004, 0.06, 0.06, 0.7]);
    expect(rejected).toEqual([true, false, false, false]);
  });

  test('adjusted p-values never decrease, for any input', () => {
    const raw = [0.001, 0.008, 0.012, 0.02, 0.031, 0.04, 0.2, 0.9];
    const { adjustedPValues } = multipleTestingAdjustments.holmBonferroni(raw, 0.05);

    const byRawOrder = raw
      .map((p, i) => ({ p, adjusted: adjustedPValues[i] }))
      .sort((a, b) => a.p - b.p)
      .map((entry) => entry.adjusted);

    for (let i = 1; i < byRawOrder.length; i += 1) {
      expect(byRawOrder[i]).toBeGreaterThanOrEqual(byRawOrder[i - 1]);
    }
  });
});

describe('Benjamini-Hochberg', () => {
  test('adjusted p-values are a running minimum from the top', () => {
    // p * m / rank gives 0.03, 0.045, 0.04: the middle hypothesis reported as LESS significant
    // than the one with a larger raw p.
    const { adjustedPValues } = multipleTestingAdjustments.benjaminiHochberg(
      [0.01, 0.03, 0.04],
      0.05
    );

    close(adjustedPValues, [0.03, 0.04, 0.04]);
  });

  test('matches the reference on a mixed set', () => {
    const { adjustedPValues, rejected } = multipleTestingAdjustments.benjaminiHochberg(
      [0.001, 0.02, 0.03, 0.7],
      0.05
    );

    close(adjustedPValues, [0.004, 0.04, 0.04, 0.7]);
    expect(rejected).toEqual([true, true, true, false]);
  });

  test('is never more conservative than Holm', () => {
    // BH controls the FDR, Holm the FWER. BH's adjusted p-values must therefore be <= Holm's,
    // for every hypothesis. If the monotonicity steps are wrong this can fail either way.
    const raw = [0.001, 0.008, 0.012, 0.02, 0.031, 0.04, 0.2, 0.9];
    const holm = multipleTestingAdjustments.holmBonferroni(raw, 0.05).adjustedPValues;
    const bh = multipleTestingAdjustments.benjaminiHochberg(raw, 0.05).adjustedPValues;

    raw.forEach((_, i) => expect(bh[i]).toBeLessThanOrEqual(holm[i] + 1e-12));
  });
});
