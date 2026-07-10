import { nonCentralChiSquareCDF, chiSquareCDF } from '../distributionFunctions';
import {
  powerChiSquare,
  generatePowerCurve,
  findSampleSizeForPower,
} from '../powerCalculations';

/**
 * Chi-square power was computed from the CENTRAL chi-square CDF shifted by the
 * non-centrality parameter, which returns power = 1.0000 for most inputs (and
 * was shown under a "validated against G*Power" banner). And generatePowerCurve
 * had no chi-square case, so sample-size / MDE for chi-square silently computed
 * a two-sample t-test. Values pinned to scipy.stats.ncx2 (== G*Power 3.1.9.7).
 */

describe('nonCentralChiSquareCDF', () => {
  it('matches scipy.stats.ncx2.cdf', () => {
    expect(nonCentralChiSquareCDF(3.8415, 1, 9)).toBeCloseTo(0.149164, 4);
    expect(nonCentralChiSquareCDF(5.9915, 2, 7.5)).toBeCloseTo(0.312348, 4);
  });

  it('reduces to the central chi-square CDF when ncp = 0', () => {
    expect(nonCentralChiSquareCDF(3.8415, 1, 0)).toBeCloseTo(chiSquareCDF(3.8415, 1), 10);
  });
});

describe('powerChiSquare', () => {
  it('matches G*Power for w=0.3, df=1, N=100', () => {
    expect(powerChiSquare(100, 0.3, 1).power).toBeCloseTo(0.8508, 3);
  });

  it('matches G*Power for w=0.5, df=2, N=30', () => {
    expect(powerChiSquare(30, 0.5, 2).power).toBeCloseTo(0.6877, 3);
  });

  it('does not fabricate power = 1.0 for a moderate effect', () => {
    expect(powerChiSquare(100, 0.3, 1).power).toBeLessThan(0.99);
  });
});

describe('generatePowerCurve chi-square routing', () => {
  it('uses chi-square power, not a fallback two-sample t-test', () => {
    const chi = generatePowerCurve('chi-square', [100], [0.3], 0.05, { df: 1 });
    expect(chi[0].power).toBeCloseTo(0.8508, 3);

    // The old default fell through to a two-sample t-test on the same inputs,
    // which gives a materially different (wrong) power.
    const ttest = generatePowerCurve('two-sample-t', [100], [0.3], 0.05);
    expect(Math.abs(chi[0].power - ttest[0].power)).toBeGreaterThan(0.05);
  });
});

describe('findSampleSizeForPower for chi-square', () => {
  it('returns a chi-square sample size, not the t-test one', () => {
    const chi = findSampleSizeForPower('chi-square', 0.3, 0.8, 0.05, { df: 1 });
    // G*Power: total N for w=0.3, df=1, power 0.80 is ~88.
    expect(chi.n).toBeGreaterThan(60);
    expect(chi.n).toBeLessThan(120);
    const tSize = findSampleSizeForPower('two-sample-t', 0.3, 0.8, 0.05);
    expect(chi.n).not.toBe(tSize.n);
  });
});
