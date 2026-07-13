/**
 * The p-values on this page used to be exactly 0.
 *
 * Every browser-side tail was `1 - cdf(x)`. Once `cdf(x)` rounds to 1.0 in float64 -- which
 * happens for any tail below ~2e-16, i.e. for every decisively significant result -- the
 * subtraction returns 0, and the UI printed "p = 0.0000 < 0.05 -> significantly different".
 *
 * The reference values below were computed with scipy (`stats.chi2.sf`, `stats.f.sf`,
 * `2 * stats.t.sf`) and are the truth these functions must reproduce.
 */

import { jStat } from 'jstat';

import { tSfTwoSided, normalSfTwoSided, fSf, chiSquareSf } from '../tails';

// value -> scipy's answer. Anything the old `1 - cdf` form returned as 0 is marked.
const CHI_SQUARE = [
  { x: 1, df: 1, expected: 0.31731050786291415 },
  { x: 3.84, df: 1, expected: 0.05004352124870519 },
  { x: 50, df: 5, expected: 1.3857973367010141e-9 },
  { x: 100, df: 10, expected: 5.449701982920423e-17 }, // old: 0
  { x: 200, df: 3, expected: 4.2185411071915414e-43 }, // old: 0
  { x: 500, df: 20, expected: 2.910266873346434e-93 }, // old: 0
];

const F = [
  { f: 1, df1: 3, df2: 10, expected: 0.4323372030216971 },
  { f: 4.5, df1: 2, df2: 27, expected: 0.020574394164054694 },
  { f: 200, df1: 2, df2: 30, expected: 4.516396474400558e-18 }, // old: 0
  { f: 20000, df1: 2, df2: 12, expected: 7.276891767084956e-22 }, // old: 0
];

const T = [
  { t: 1, df: 10, expected: 0.34089313521500226 },
  { t: 2.5, df: 7, expected: 0.04099222327279165 },
  { t: 40, df: 20, expected: 1.4574696554311688e-20 }, // old: 0
];

// jStat's own incomplete beta / gamma are accurate to roughly 1e-8 relative. That is the
// floor here; the point of this test is that the answer is not ZERO, and is right to well
// within display precision.
const closeTo = (actual, expected) => {
  expect(Number.isFinite(actual)).toBe(true);
  expect(actual).toBeGreaterThan(0);
  const relativeError = Math.abs(actual - expected) / expected;
  expect(relativeError).toBeLessThan(1e-6);
};

describe('upper tails do not cancel to zero', () => {
  test.each(CHI_SQUARE)('chi-square sf(x=$x, df=$df)', ({ x, df, expected }) => {
    closeTo(chiSquareSf(x, df), expected);
  });

  test.each(F)('F sf(f=$f, df=($df1,$df2))', ({ f, df1, df2, expected }) => {
    closeTo(fSf(f, df1, df2), expected);
  });

  test.each(T)('two-sided t sf(t=$t, df=$df)', ({ t, df, expected }) => {
    closeTo(tSfTwoSided(t, df), expected);
  });

  test('normal two-sided tail survives far out', () => {
    // 1 - jStat.normal.cdf(9) is 0 in float64.
    closeTo(normalSfTwoSided(9), 2.2571769025871336e-19);
  });
});

describe('the naive form these replace really was broken', () => {
  test('1 - cdf returns exactly zero where the tail is not zero', () => {
    // This is the bug, demonstrated. If jStat ever becomes more accurate and this starts
    // failing, that is good news -- but the direct-tail functions above are still correct.
    expect(2 * (1 - jStat.studentt.cdf(40, 20))).toBe(0);
    expect(1 - jStat.centralF.cdf(200, 2, 30)).toBe(0);

    // ...while the replacements return the real value.
    expect(tSfTwoSided(40, 20)).toBeGreaterThan(0);
    expect(fSf(200, 2, 30)).toBeGreaterThan(0);
  });
});

describe('degenerate inputs', () => {
  test('a non-finite statistic has no p-value', () => {
    expect(tSfTwoSided(NaN, 10)).toBeNull();
    expect(fSf(NaN, 2, 10)).toBeNull();
    expect(chiSquareSf(NaN, 3)).toBeNull();
  });

  test('zero degrees of freedom has no p-value', () => {
    expect(tSfTwoSided(2, 0)).toBeNull();
    expect(fSf(2, 0, 10)).toBeNull();
    expect(chiSquareSf(2, 0)).toBeNull();
  });

  test('a statistic of zero is the least extreme possible outcome', () => {
    expect(fSf(0, 2, 10)).toBe(1);
    expect(chiSquareSf(0, 3)).toBe(1);
  });
});
