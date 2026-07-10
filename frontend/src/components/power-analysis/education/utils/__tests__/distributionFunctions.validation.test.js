import {
  regularizedIncompleteBeta,
  tCDF,
  tQuantile,
  fCDF,
  nonCentralTCDF,
  nonCentralFCDF,
} from '../distributionFunctions';

/**
 * These distribution primitives are the foundation for every t-test, F-test and
 * power calculation in the education module. Two of them shipped badly broken:
 *
 *   1. regularizedIncompleteBeta used a malformed continued fraction that
 *      returned 0, 1 or NaN even for trivial inputs (I_0.5(1,1) = NaN), so
 *      tCDF/fCDF were wrong for every df.
 *   2. nonCentralTCDF summed central-t CDFs at inflated df weighted by Poisson
 *      terms — not the non-central t CDF at all — so it returned ~1 for values
 *      well below the mean and every t/paired power calculation collapsed to
 *      roughly alpha.
 *
 * All reference values are scipy.stats (== the analytic beta/nct/ncf), which is
 * what G*Power uses. Pinned to scipy, never to a prior code run.
 */

const near = (v, expected, digits = 5) => expect(v).toBeCloseTo(expected, digits);

describe('regularizedIncompleteBeta (I_x(a,b))', () => {
  it('matches scipy.special.betainc', () => {
    near(regularizedIncompleteBeta(0.5, 1, 1), 0.5);        // uniform CDF
    near(regularizedIncompleteBeta(0.3, 2, 3), 0.34830);    // betainc(2,3,0.3)
    near(regularizedIncompleteBeta(0.7, 5, 2), 0.420175);   // betainc(5,2,0.7)
    near(regularizedIncompleteBeta(0.98096, 99, 0.5), 0.05135, 4);
  });
  it('honours the boundaries', () => {
    expect(regularizedIncompleteBeta(0, 2, 3)).toBe(0);
    expect(regularizedIncompleteBeta(1, 2, 3)).toBe(1);
  });
});

describe('tCDF / tQuantile', () => {
  it('matches scipy.stats.t.cdf including large df', () => {
    near(tCDF(-2.0, 10), 0.036694);
    near(tCDF(1.96, 30), 0.970329);
    near(tCDF(1.96, 198), 0.974301, 4);
  });
  it('inverts to scipy.stats.t.ppf', () => {
    near(tQuantile(0.975, 10), 2.228139, 4);
    near(tQuantile(0.975, 198), 1.972017, 4);
    near(tQuantile(0.95, 30), 1.697261, 4);
  });
});

describe('fCDF', () => {
  it('matches scipy.stats.f.cdf', () => {
    near(fCDF(3.0, 2, 20), 0.927462, 4);
    near(fCDF(2.5, 3, 45), 0.928489, 4);
  });
});

describe('nonCentralTCDF (Algorithm AS 243)', () => {
  it('matches scipy.stats.nct.cdf', () => {
    near(nonCentralTCDF(1.97, 198, 2.1213203435596424), 0.439173, 4);
    near(nonCentralTCDF(1.979, 126, 2.8284271247461903), 0.198550, 4);
    near(nonCentralTCDF(2.0, 10, 1.5), 0.659154, 4);
    near(nonCentralTCDF(-1.0, 10, 1.5), 0.007779, 4);
    near(nonCentralTCDF(0.0, 5, 2.0), 0.022750, 4);
  });
  it('reduces to central t when ncp = 0', () => {
    near(nonCentralTCDF(2.056, 26, 0.0), tCDF(2.056, 26), 8);
  });
  it('does not report a below-mean value as near-certain', () => {
    // Regression guard for the old fabricated formula, which returned ~1 here.
    expect(nonCentralTCDF(1.97, 198, 2.1213203435596424)).toBeLessThan(0.5);
  });
});

describe('nonCentralFCDF', () => {
  it('matches scipy.stats.ncf.cdf', () => {
    near(nonCentralFCDF(3.0, 2, 20, 10.0), 0.193977, 4);
    near(nonCentralFCDF(2.5, 3, 45, 12.0), 0.152401, 4);
    near(nonCentralFCDF(4.0, 1, 30, 8.0), 0.206530, 4);
  });
});
