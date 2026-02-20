/**
 * Bland-Altman Agreement Analysis Utilities
 *
 * Computes bias, limits of agreement, and statistics
 * for method comparison studies.
 */

/**
 * Compute Bland-Altman statistics from two method columns.
 *
 * @param {number[]} method1 - Measurements from method 1
 * @param {number[]} method2 - Measurements from method 2
 * @param {number} sdMultiplier - Multiplier for LOA (default 1.96 for 95%)
 * @param {boolean} percentageDiff - Use percentage difference instead of absolute
 * @returns {{ means: number[], diffs: number[], bias: number, sd: number, loa: { upper: number, lower: number }, n: number }}
 */
export function blandAltmanStats(method1, method2, sdMultiplier = 1.96, percentageDiff = false) {
  const n = Math.min(method1.length, method2.length);
  const means = [];
  const diffs = [];

  for (let i = 0; i < n; i++) {
    const m1 = +method1[i];
    const m2 = +method2[i];
    if (isNaN(m1) || isNaN(m2)) continue;

    const mean = (m1 + m2) / 2;
    const diff = percentageDiff
      ? ((m1 - m2) / mean) * 100
      : m1 - m2;

    means.push(mean);
    diffs.push(diff);
  }

  const validN = diffs.length;
  if (validN === 0) {
    return { means: [], diffs: [], bias: 0, sd: 0, loa: { upper: 0, lower: 0 }, n: 0 };
  }

  const bias = diffs.reduce((a, b) => a + b, 0) / validN;
  const sd = Math.sqrt(
    diffs.reduce((s, d) => s + (d - bias) ** 2, 0) / (validN - 1)
  );

  return {
    means,
    diffs,
    bias,
    sd,
    loa: {
      upper: bias + sdMultiplier * sd,
      lower: bias - sdMultiplier * sd,
    },
    n: validN,
  };
}

/**
 * Process raw data for Bland-Altman plot.
 *
 * @param {Object[]} data - Raw data rows
 * @param {string} col1 - Column name for method 1
 * @param {string} col2 - Column name for method 2
 * @param {number} sdMultiplier
 * @param {boolean} percentageDiff
 * @returns {Object} Full B-A statistics
 */
export function processBlandAltmanData(data, col1, col2, sdMultiplier = 1.96, percentageDiff = false) {
  const m1 = data.map(d => +d[col1]);
  const m2 = data.map(d => +d[col2]);
  return blandAltmanStats(m1, m2, sdMultiplier, percentageDiff);
}
