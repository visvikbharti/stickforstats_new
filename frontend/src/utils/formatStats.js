/**
 * Null-safe formatters for statistical values rendered from API responses.
 *
 * Backends legitimately serialize a statistic as null (e.g. a per-gene test that
 * failed on a zero-variance gene -> adjusted_p_value: null). Calling .toFixed /
 * .toExponential on such a value throws "Cannot read properties of null", which
 * unmounts the page (white-screen). These helpers render a placeholder instead.
 * (robustness audit 2026-06-04, fe-crash follow-up.)
 */

const MISSING = '—'; // em dash

function isMissing(value) {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
}

/**
 * Format a p-value: scientific notation below 0.001, else fixed 4 decimals.
 * Returns an em dash for null / undefined / NaN.
 */
export function formatPValue(p) {
  if (isMissing(p)) return MISSING;
  return p < 0.001 ? p.toExponential(2) : p.toFixed(4);
}

/**
 * Format a number to `precision` decimals; em dash for null / undefined / NaN.
 */
export function formatNumber(value, precision = 4) {
  if (isMissing(value)) return MISSING;
  return value.toFixed(precision);
}

/**
 * Comparator that always sorts missing (null/undefined/NaN) values LAST,
 * regardless of direction, so a failed/absent statistic never masquerades as
 * the "most significant" row. `dir` is 'asc' or 'desc'.
 */
export function compareWithMissingLast(a, b, dir = 'asc') {
  const aMissing = isMissing(a);
  const bMissing = isMissing(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return dir === 'asc' ? a - b : b - a;
}

/**
 * Is this p-value significant at `alpha`?
 *
 * Returns null when there is no p-value -- NOT false, and above all not true.
 *
 * The reason this function has to exist: in JavaScript, `null < 0.05` is TRUE. null coerces to
 * 0, and 0 < 0.05. So every `if (p < alpha)` in the codebase treated a MISSING p-value as the
 * most significant result possible. A test that could not be computed rendered as three stars,
 * a green "Significant" chip, and "reject the null hypothesis" -- with an em dash sitting in the
 * p-value cell right next to it, because the formatter above was honest about the same value.
 *
 * `undefined < 0.05` is false (undefined coerces to NaN), so the bug only bit for null -- which
 * is exactly what an honest backend sends.
 */
export function isSignificant(pValue, alpha = 0.05) {
  if (isMissing(pValue)) return null;
  return pValue < alpha;
}

/**
 * Significance stars, or an em dash when there is no p-value to star.
 */
export function significanceStars(pValue) {
  if (isMissing(pValue)) return MISSING;
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';
  if (pValue < 0.1) return '.';
  return 'ns';
}
