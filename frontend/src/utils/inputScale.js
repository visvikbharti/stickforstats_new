/**
 * Which scale is an uploaded expression matrix on -- linear (counts, CPM, TPM, intensities) or
 * already log2-transformed?
 *
 * The answer decides what a "log2 fold change" is. On a linear scale it is the log2 of the RATIO
 * of the group means; on a log2 scale the values are already logarithms, so it is the DIFFERENCE
 * of the group means. Applying the linear rule to log2 data gives log2 of a ratio of log-scale
 * means, which is not a fold change at all: it shrinks the fold changes of genes with high
 * log-scale means toward zero (issue #31: a true +2.79 was shown as +0.33) and inflates those of
 * lowly expressed genes.
 *
 * The backend computes both correctly, but it cannot tell which one an upload is -- it has to be
 * told, via `input_scale`. This module suggests the answer from the values themselves. It is only
 * a suggestion: no rule of this kind is right for every matrix (linear ratios clustered around 1
 * look like log2 values to it, and it cannot tell a natural-log or log10 matrix from a log2 one),
 * so the page always shows what it assumed and why, and lets the user override it.
 */

export const INPUT_SCALE_AUTO = 'auto';
export const INPUT_SCALE_LINEAR = 'linear';
export const INPUT_SCALE_LOG2 = 'log2';

// R's default quantile (type 7), computed the way R's quantile.default computes it --
// (1 - h) * x[lo] + h * x[hi], and only where the two order statistics differ -- so that a value
// lying exactly on one of the rule's thresholds lands on the same side as it does in R.
const quantileType7 = (sorted, p) => {
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  const h = index - lo;
  if (h === 0 || sorted[hi] === sorted[lo]) return sorted[lo];
  return (1 - h) * sorted[lo] + h * sorted[hi];
};

/**
 * The numeric cells of a CSV expression matrix, split into rows and cells the way the backend
 * splits them (DifferentialExpressionService.parse_expression_matrix): rows on "\n", cells on ",",
 * the first row is the header and the first column holds the gene names. Blank, non-numeric and
 * infinite cells are skipped -- the backend would reject them, and detection only needs the values
 * that are there.
 */
export const expressionValuesFromCsv = (csvText) => {
  const lines = String(csvText ?? '').trim().split('\n');
  const values = [];
  lines.slice(1).forEach((line) => {
    line.split(',').slice(1).forEach((cell) => {
      // Number('') is 0, which would invent a zero for every blank cell.
      const value = cell.trim() === '' ? NaN : Number(cell);
      if (Number.isFinite(value)) values.push(value);
    });
  });
  return values;
};

const formatValue = (x) =>
  Number(x.toPrecision(3)).toLocaleString('en-US', { maximumFractionDigits: 20 });

// A value quoted against a threshold, rounded no further than keeps it on its side of the
// threshold: a 99th percentile of 100.3 is shown as 100.3, not as "100" beside "above 100".
const formatBeside = (x, threshold) => {
  for (const digits of [3, 6, 12]) {
    const shown = Number(x.toPrecision(digits));
    if ((shown > threshold) === (x > threshold)) {
      return shown.toLocaleString('en-US', { maximumFractionDigits: 20 });
    }
  }
  return String(x);
};

/**
 * Suggest the scale of a set of expression values.
 *
 * The core is the rule in the R script NCBI's GEO2R generates to decide whether to log2-transform
 * a series before its limma analysis (as in scripts generated with R 4.2.2 / limma 3.54.0, and as
 * Bioconductor's GEOexplorer reimplements it):
 *
 *     LogC <- (qx[5] > 100) || (qx[6]-qx[1] > 50 && qx[2] > 0)
 *
 * where qx holds the 0th, 25th, 50th, 75th, 99th and 100th percentiles of all the values. LogC true
 * means LINEAR (not yet log-transformed). Both conditions describe values that cannot plausibly be
 * log2 values: read as log2, a 99th percentile above 100 would be a linear value above 2^100, and a
 * span of more than 50 a dynamic range of more than 2^50-fold. (Older GEO2R scripts had a third
 * condition, which also called values clustered around 1 linear; the current rule does not.)
 *
 * GEO2R is a microarray tool, and on RNA-seq counts its rule has a blind spot: when a quarter or
 * more of the cells are 0, the lower quartile is 0, so only the 99th percentile can make the
 * matrix linear, and a sparse or shallow count matrix is then called log2 -- turning its fold
 * changes into differences of raw counts. Two guards close it:
 *
 *   - every value a whole number >= 0, and the largest above 20, is called linear: that is a count
 *     matrix. Log2 values are not all whole numbers, and log2(CPM + 1) or log2(TPM + 1) cannot
 *     exceed log2(10^6 + 1), just under 20;
 *   - a span of more than 50 that GEO2R's rule does not call linear gets no suggestion at all: it
 *     is too wide for log2 values, but the rule cannot call it linear, so the user must choose.
 *
 * Returns { scale, reason, quantiles }: scale is 'linear', 'log2', or null when the values give no
 * safe answer; reason is a lower-case clause for the page to show.
 */
export const detectInputScale = (values) => {
  const finite = (values || []).filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) {
    return {
      scale: null,
      reason: 'no numeric expression values were found',
      quantiles: null,
    };
  }
  const [q0, q25, q50, q75, q99, q100] = [0, 0.25, 0.5, 0.75, 0.99, 1].map((p) =>
    quantileType7(finite, p)
  );
  const quantiles = { q0, q25, q50, q75, q99, q100 };
  const span = `from ${formatValue(q0)} to ${formatValue(q100)}`;

  if (q0 >= 0 && q100 > 20 && finite.every(Number.isInteger)) {
    return {
      scale: INPUT_SCALE_LINEAR,
      reason: `every value is a whole number, ${span}, as in a matrix of counts`,
      quantiles,
    };
  }
  if (q99 > 100) {
    return {
      scale: INPUT_SCALE_LINEAR,
      reason:
        `the 99th percentile of the values is ${formatBeside(q99, 100)}, and log2 values do not ` +
        'go above 100 (that would be 2^100 on the linear scale)',
      quantiles,
    };
  }
  if (q100 - q0 > 50 && q25 > 0) {
    return {
      scale: INPUT_SCALE_LINEAR,
      reason:
        `the values span ${formatBeside(q100 - q0, 50)} (${span}) and their lower quartile is ` +
        'above 0; as log2 values that span would be a range of more than 2^50-fold',
      quantiles,
    };
  }
  if (q100 - q0 > 50) {
    return {
      scale: null,
      reason:
        `the values span ${formatBeside(q100 - q0, 50)} (${span}), too wide for log2 values, but ` +
        'their lower quartile is 0 or less, so the rule cannot call them linear either',
      quantiles,
    };
  }
  return {
    scale: INPUT_SCALE_LOG2,
    reason:
      `the values run ${span}, with a 99th percentile of ${formatValue(q99)}, which is small ` +
      'enough to be log2-transformed values',
    quantiles,
  };
};

/** The scale to send to the backend: the user's choice, or the detected scale under 'auto'. */
export const resolveInputScale = (choice, detection) =>
  choice === INPUT_SCALE_AUTO ? (detection && detection.scale) || null : choice;
