/**
 * A p-value never prints as zero.
 *
 * The t-test page printed "p = 0.0000" for p = 7.76e-8 (it used toFixed(4)). formatPValue is the
 * shared formatter; these tests pin the cases a fixed number of decimals gets wrong.
 */

import { formatPValue, formatPClause, capPValue } from '../formatStats';

describe('formatPValue', () => {
  test('three significant figures below 0.001', () => {
    expect(formatPValue(7.761531565000387e-8)).toBe('7.76e-8');
    expect(formatPValue(0.000999)).toBe('9.99e-4');
  });

  test('fixed four decimals from 0.001 up, as before', () => {
    expect(formatPValue(0.001)).toBe('0.0010');
    expect(formatPValue(0.0312)).toBe('0.0312');
  });

  test("the backend's high-precision string", () => {
    expect(formatPValue('7.7615315650003952552146497347420289454645218856193E-8')).toBe('7.76e-8');
    expect(formatPValue('0.0312')).toBe('0.0312');
  });

  test('a string below the range of a JavaScript number keeps its size', () => {
    expect(Number('1.2345E-400')).toBe(0); // what reading it as a number would print
    expect(formatPValue('1.2345E-400')).toBe('1.23e-400');
    expect(formatPValue('9.995E-400')).toBe('1.00e-399');
    expect(formatPValue('0.0001234E-400')).toBe('1.23e-404');
  });

  test('exactly zero prints as R prints a p-value below machine epsilon', () => {
    expect(formatPValue(0)).toBe('< 2.2e-16');
    expect(formatPValue('0')).toBe('< 2.2e-16');
    expect(formatPValue('0.000E-50')).toBe('< 2.2e-16');
  });

  test('no positive p-value down to the smallest JavaScript number prints as zero', () => {
    for (let exponent = 0; exponent >= -323; exponent -= 1) {
      const printed = formatPValue(Number(`1e${exponent}`));
      expect(Number(printed)).toBeGreaterThan(0);
    }
  });

  test('missing and non-numeric values print an em dash', () => {
    [null, undefined, NaN, '', '  ', 'n/a'].forEach((value) => {
      expect(formatPValue(value)).toBe('—');
    });
  });
});

describe('formatPClause', () => {
  test('reads as running text, with the bound written as a bound', () => {
    expect(formatPClause(7.761531565000387e-8)).toBe('p = 7.76e-8');
    expect(formatPClause(0)).toBe('p < 2.2e-16');
    expect(formatPClause(0.0312, 'adj. p')).toBe('adj. p = 0.0312');
    expect(formatPClause(null)).toBe('p = —');
  });
});

describe('capPValue', () => {
  test('caps at 1 and keeps a missing p-value missing', () => {
    expect(Math.min(null, 1)).toBe(0); // the coercion it replaces
    expect(capPValue(null)).toBeNull();
    expect(capPValue(undefined)).toBeNull();
    expect(capPValue(1.7)).toBe(1);
    expect(capPValue(0.02)).toBe(0.02);
  });
});
