/**
 * In JavaScript, `null < 0.05` is TRUE.
 *
 * null coerces to 0, and 0 < 0.05. Every `if (pValue < alpha)` in this codebase therefore treated
 * a MISSING p-value as the most significant result possible. A test that could not be computed
 * rendered as three stars, a green "Significant" chip, and "reject the null hypothesis" -- with
 * an em dash sitting in the p-value cell right next to it, because the formatter was honest about
 * the very same value.
 *
 * The backend now returns null wherever a statistic is genuinely undefined, which means this
 * coercion is no longer a latent bug: it is the bug the honesty work would have introduced. These
 * tests exist to keep it dead.
 */

import { isSignificant, significanceStars, formatPValue, formatNumber } from '../formatStats';

describe('the coercion this all exists to prevent', () => {
  test('null < 0.05 really is true in JavaScript', () => {
    // If this ever stops being true, JavaScript has changed, not this codebase.
    expect(null < 0.05).toBe(true);
    expect(null < 0.001).toBe(true);

    // ...and undefined is NOT, which is why the bug only ever bit for null -- exactly what an
    // honest backend sends.
    expect(undefined < 0.05).toBe(false);
  });
});

describe('isSignificant', () => {
  test('a missing p-value is neither significant nor not significant', () => {
    expect(isSignificant(null)).toBeNull();
    expect(isSignificant(undefined)).toBeNull();
    expect(isSignificant(NaN)).toBeNull();
  });

  test('null is emphatically not significant', () => {
    // The whole point: this must not be true.
    expect(isSignificant(null)).not.toBe(true);
  });

  test('real p-values still decide', () => {
    expect(isSignificant(0.01)).toBe(true);
    expect(isSignificant(0.2)).toBe(false);
    expect(isSignificant(0.03, 0.01)).toBe(false);
    expect(isSignificant(0.003, 0.01)).toBe(true);
  });

  test('a p-value of exactly zero would be significant, but must never arise', () => {
    // Guarding the guard: 0 is falsy, so an `if (p)` style check would drop it. isSignificant
    // uses an explicit missing-check, so a (hypothetical) 0 is treated as a number.
    expect(isSignificant(0)).toBe(true);
  });
});

describe('significanceStars', () => {
  test('a missing p-value gets an em dash, not three stars', () => {
    // This is the "N/A  ***" row: the most significant result possible, printed next to an
    // admission that there is no result.
    expect(significanceStars(null)).toBe('—');
    expect(significanceStars(undefined)).toBe('—');
    expect(significanceStars(NaN)).toBe('—');
  });

  test('real p-values still get their stars', () => {
    expect(significanceStars(0.0001)).toBe('***');
    expect(significanceStars(0.005)).toBe('**');
    expect(significanceStars(0.03)).toBe('*');
    expect(significanceStars(0.08)).toBe('.');
    expect(significanceStars(0.5)).toBe('ns');
  });
});

describe('formatters never throw on a null', () => {
  test('formatPValue and formatNumber render an em dash', () => {
    // `x.toFixed()` on null is a TypeError, which unmounts the page.
    expect(() => formatPValue(null)).not.toThrow();
    expect(() => formatNumber(null)).not.toThrow();
    expect(formatPValue(null)).toBe('—');
    expect(formatNumber(null)).toBe('—');
  });

  test('a tiny p-value is shown, not rounded to 0.0000', () => {
    expect(formatPValue(1.46e-20)).toBe('1.46e-20');
  });
});
