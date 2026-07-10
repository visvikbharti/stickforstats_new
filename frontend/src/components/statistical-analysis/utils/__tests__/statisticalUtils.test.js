import {
  calculateDescriptiveStats,
  oneSampleTTest,
  independentTTest,
  pairedTTest,
  oneWayANOVA,
} from '../statisticalUtils';

/**
 * These pin the client-side (no-backend) statistics the in-page hub shows to
 * users against scipy / numpy(ddof=1). The regression they guard: the t-tests
 * used the POPULATION SD/variance (÷ n) where the sample estimate (÷ n-1) is
 * required, inflating every t and understating every p.
 *
 * Expected values are scipy.stats.ttest_* / numpy(ddof=1), not a prior run of
 * this code.
 */

describe('oneSampleTTest', () => {
  it('matches scipy.stats.ttest_1samp (sample SD, not population)', () => {
    const r = oneSampleTTest([5, 7, 8, 6, 9, 10, 4], 6);
    expect(r.statistic).toBeCloseTo(1.2247448714, 8);
    expect(r.pValue).toBeCloseTo(0.2665697034, 8);
    expect(r.df).toBe(6);
    // The old population-SD bug produced t=1.3229 -- guard against its return.
    expect(r.statistic).not.toBeCloseTo(1.3229, 3);
  });
});

describe('independentTTest', () => {
  it('matches scipy.stats.ttest_ind (pooled, sample variance)', () => {
    const r = independentTTest([5, 7, 8, 6, 9], [10, 4, 3, 7, 8]);
    expect(r.statistic).toBeCloseTo(0.4082482905, 8);
    expect(r.pValue).toBeCloseTo(0.6937998380, 8);
    expect(r.df).toBe(8);
    expect(r.statistic).not.toBeCloseTo(0.4564, 3); // the old population-variance value
  });
});

describe('pairedTTest', () => {
  it('matches scipy.stats.ttest_rel', () => {
    const r = pairedTTest([5, 7, 8, 6, 9], [4, 6, 9, 5, 7]);
    expect(r.statistic).toBeCloseTo(1.6329931619, 8);
    expect(r.pValue).toBeCloseTo(0.1778078084, 8);
    expect(r.df).toBe(4);
    expect(r.statistic).not.toBeCloseTo(1.8257, 3); // the old inherited-bug value
  });
});

describe('calculateDescriptiveStats', () => {
  it('reports the sample SD/variance (÷ n-1), matching numpy ddof=1', () => {
    const s = calculateDescriptiveStats([5, 7, 8, 6, 9, 10, 4]);
    expect(s.std).toBeCloseTo(2.1602468995, 8);
    expect(s.variance).toBeCloseTo(4.6666666667, 8);
    // population SD (the old value) would have been exactly 2.0
    expect(s.std).not.toBeCloseTo(2.0, 3);
  });

  it('keeps excess kurtosis on the population second moment despite the SD change', () => {
    // Uniform-ish small sample: value is stable and independent of the ddof
    // choice for the reported variance. Guards that the kurtosis moment was not
    // accidentally switched to the sample variance.
    const s = calculateDescriptiveStats([1, 2, 3, 4, 5]);
    // m4/m2^2 - 3 for [1..5] = 1.7 - 3 = -1.3 exactly (population moments).
    expect(s.kurtosis).toBeCloseTo(-1.3, 8);
  });
});

describe('oneWayANOVA (unchanged; guards against collateral damage)', () => {
  it('matches scipy.stats.f_oneway', () => {
    const r = oneWayANOVA([
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6],
      [5, 6, 7, 8, 9],
    ]);
    // scipy.stats.f_oneway -> F=8.6666667, p=0.0046873
    expect(r.fStatistic).toBeCloseTo(8.6666667, 6);
    expect(r.pValue).toBeCloseTo(0.0046873, 6);
    expect(r.dfBetween).toBe(2);
    expect(r.dfWithin).toBe(12);
  });
});
