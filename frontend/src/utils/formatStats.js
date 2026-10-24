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

// What R's format.pval prints for a p-value below machine epsilon. A calculation that returns
// a p-value of exactly 0 has gone below it: an upper tail computed as 1 - cdf rounds to 0 once
// it is under about 1.1e-16, and a tail computed directly only below about 5e-324.
const BELOW_EPSILON = '< 2.2e-16';

/**
 * Three significant figures of a decimal string, written as toExponential(2) writes them, but
 * read from the string's digits rather than through a JavaScript number, which turns anything
 * below about 5e-324 into 0. Null when the string is not a plain decimal or has no non-zero digit.
 */
function exponentialFromDecimalString(text) {
  const m = /^\s*\+?(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?\s*$/.exec(text);
  if (!m) return null;
  const whole = m[1] || '';
  const digits = whole + (m[2] || '');
  const first = digits.search(/[1-9]/);
  if (first < 0) return null;
  let exponent = parseInt(m[3] || '0', 10) + whole.length - 1 - first;
  const significant = digits.slice(first);
  let kept = significant.slice(0, 3).padEnd(3, '0');
  if (significant.length > 3 && significant[3] >= '5') {
    kept = String(Number(kept) + 1);
    if (kept.length > 3) {
      kept = kept.slice(0, 3);
      exponent += 1;
    }
  }
  return `${kept[0]}.${kept.slice(1)}e${exponent < 0 ? '-' : '+'}${Math.abs(exponent)}`;
}

/**
 * Format a p-value: three significant figures in scientific notation below 0.001 (7.76e-8),
 * else fixed 4 decimals (0.0312). A p-value never prints as zero: exactly 0 prints as
 * "< 2.2e-16" (see BELOW_EPSILON).
 *
 * Takes a number or a numeric string, such as the backend's 50-digit high-precision p-values
 * ("7.7615...E-8"). A string below the smallest JavaScript number keeps its size ("1.23e-400").
 *
 * Returns an em dash for null / undefined / NaN and for a string that is not a number.
 */
export function formatPValue(p) {
  if (typeof p === 'string') {
    const value = Number(p);
    if (p.trim() === '' || Number.isNaN(value)) return MISSING;
    if (value === 0) return exponentialFromDecimalString(p) || BELOW_EPSILON;
    return formatPValue(value);
  }
  if (isMissing(p)) return MISSING;
  if (p === 0) return BELOW_EPSILON;
  return p < 0.001 ? p.toExponential(2) : p.toFixed(4);
}

/**
 * formatPValue as a clause for running text: "p = 7.76e-8", or "p < 2.2e-16" for a p-value of
 * exactly 0, where "p = < 2.2e-16" would not read.
 */
export function formatPClause(p, symbol = 'p') {
  const text = formatPValue(p);
  return text.startsWith('<') ? `${symbol} ${text}` : `${symbol} = ${text}`;
}

/**
 * A p-value capped at 1 (a Bonferroni product can exceed it), with a missing one kept missing.
 * `Math.min(null, 1)` is 0, which turned a p-value a calculation could not resolve into the
 * most significant result there is.
 */
export function capPValue(p) {
  return isMissing(p) ? null : Math.min(p, 1);
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
