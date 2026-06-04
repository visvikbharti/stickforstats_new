/**
 * Regression tests for null-safe stat formatters (robustness audit 2026-06-04, fe-crash follow-up).
 *
 * Guards the crash class where a numeric formatter (.toFixed/.toExponential) was
 * called on a backend-nullable value -> "Cannot read properties of null" ->
 * white-screen. The Genomics differential-expression page hit this on
 * adjusted_p_value (null for failed-test / zero-variance genes).
 */

import { formatPValue, formatNumber, compareWithMissingLast } from './formatStats';

const DASH = '—';

describe('formatPValue', () => {
  it('renders a placeholder for null / undefined / NaN (no crash)', () => {
    expect(formatPValue(null)).toBe(DASH);
    expect(formatPValue(undefined)).toBe(DASH);
    expect(formatPValue(NaN)).toBe(DASH);
  });

  it('uses scientific notation below 0.001', () => {
    expect(formatPValue(0.0001)).toBe('1.00e-4');
    expect(formatPValue(1.34e-35)).toBe('1.34e-35');
  });

  it('uses fixed 4 decimals at or above 0.001', () => {
    expect(formatPValue(0.03)).toBe('0.0300');
    expect(formatPValue(0.5)).toBe('0.5000');
  });
});

describe('formatNumber', () => {
  it('renders a placeholder for missing values', () => {
    expect(formatNumber(null)).toBe(DASH);
    expect(formatNumber(undefined)).toBe(DASH);
    expect(formatNumber(NaN)).toBe(DASH);
  });

  it('formats real numbers to the requested precision', () => {
    expect(formatNumber(3.14159, 2)).toBe('3.14');
    expect(formatNumber(1, 0)).toBe('1');
  });
});

describe('compareWithMissingLast', () => {
  it('sorts missing values last regardless of direction', () => {
    expect(compareWithMissingLast(null, 0.5, 'asc')).toBe(1);
    expect(compareWithMissingLast(0.5, null, 'asc')).toBe(-1);
    expect(compareWithMissingLast(null, 0.5, 'desc')).toBe(1);
    expect(compareWithMissingLast(0.5, null, 'desc')).toBe(-1);
    expect(compareWithMissingLast(null, null, 'asc')).toBe(0);
  });

  it('orders present values normally', () => {
    expect(compareWithMissingLast(0.1, 0.2, 'asc')).toBeLessThan(0);
    expect(compareWithMissingLast(0.1, 0.2, 'desc')).toBeGreaterThan(0);
  });

  it('a failed-test gene (null p) never sorts to the most-significant top', () => {
    const genes = [{ p: null }, { p: 0.5 }, { p: 0.01 }];
    const asc = [...genes].sort((a, b) => compareWithMissingLast(a.p, b.p, 'asc'));
    expect(asc.map((g) => g.p)).toEqual([0.01, 0.5, null]);
  });
});
