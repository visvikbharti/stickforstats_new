/**
 * The input-scale detector behind the genomics upload screen (issue #31).
 *
 * Its core is GEO2R's rule, defined on R's quantile(). The cases under "reproduces R's decision"
 * were cross-checked by evaluating that R expression, in R 4.4.1, on the same vectors -- every
 * decision there is the one R gave, and the vectors sit exactly on the rule's thresholds, so a
 * quantile definition or threshold that drifts from R's fails this file. The cases under "where
 * it departs from GEO2R" are the two guards for count matrices, which GEO2R does not have.
 */

import {
  INPUT_SCALE_AUTO,
  INPUT_SCALE_LINEAR,
  INPUT_SCALE_LOG2,
  detectInputScale,
  expressionValuesFromCsv,
  resolveInputScale,
} from '../inputScale';

// A synthetic matrix of KNOWN fold changes: each treatment sample is an exact multiple k of the
// matching control sample, so the true log2 fold change is log2(k) on either scale.
const CONTROL = [80, 90, 100, 110, 120, 100];
const FOLDS = { UNCHANGED: 1, UP2: 2, UP4: 4, DOWN8: 0.125 };
const SAMPLES = [1, 2, 3, 4, 5, 6].map((i) => `ctrl_${i}`).concat(
  [1, 2, 3, 4, 5, 6].map((i) => `treat_${i}`)
);
const csvFor = (scale) =>
  [`gene,${SAMPLES.join(',')}`]
    .concat(
      Object.entries(FOLDS).map(([gene, k]) => {
        const values = CONTROL.concat(CONTROL.map((x) => k * x));
        return `${gene},${(scale === 'log2' ? values.map(Math.log2) : values).join(',')}`;
      })
    )
    .join('\n');

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('detectInputScale on a matrix of known fold changes', () => {
  test('the linear matrix is detected as linear', () => {
    const d = detectInputScale(expressionValuesFromCsv(csvFor('linear')));
    expect(d.scale).toBe(INPUT_SCALE_LINEAR);
    expect(d.quantiles.q99).toBeCloseTo(461.2, 6); // R: 461.200000
  });

  test('the same matrix, log2-transformed, is detected as log2', () => {
    const d = detectInputScale(expressionValuesFromCsv(csvFor('log2')));
    expect(d.scale).toBe(INPUT_SCALE_LOG2);
    expect(d.quantiles.q99).toBeCloseTo(8.847891, 6); // R: 8.847891
  });

  test('the reason shown to the user names the statistic that decided it', () => {
    expect(detectInputScale(expressionValuesFromCsv(csvFor('linear'))).reason).toMatch(
      /99th percentile of the values is 461/
    );
    expect(detectInputScale(expressionValuesFromCsv(csvFor('log2'))).reason).toMatch(
      /small enough to be log2-transformed/
    );
  });

  test('a number quoted beside a threshold is never rounded onto its wrong side', () => {
    // 99th percentile 100.3: to three significant digits that is "100", which would sit beside
    // "log2 values do not go above 100" while claiming the values are above it.
    expect(detectInputScale([...Array(99).fill(1), 100.3, 100.3]).reason).toMatch(
      /99th percentile of the values is 100\.3, and log2 values do not go above 100/
    );
  });
});

// Non-integer vectors, so the count guards below cannot decide them: these exercise GEO2R's rule.
const halves = (from, to) => range(from, to).map((x) => x + 0.5);

describe("detectInputScale reproduces R's decision at the rule's boundaries", () => {
  test.each([
    // [label, values, R's decision]
    ['0.5..100.5: 99th percentile 99.5, but a spread of 100 above a positive lower quartile', halves(0, 100), INPUT_SCALE_LINEAR],
    ['50.5..100.5: 99th percentile exactly 100 and a spread of exactly 50 -- neither is MORE than its threshold', halves(50, 100), INPUT_SCALE_LOG2],
    ['51.5..101.5: 99th percentile 101', halves(51, 101), INPUT_SCALE_LINEAR],
    ['1..51 then 51.5: 99th percentile 51.245, but a spread of 50.5 above a positive lower quartile', [...range(1, 51), 51.5], INPUT_SCALE_LINEAR],
    ['ten zeros then 112.5: interpolated 99th percentile 101.25', [...Array(10).fill(0), 112.5], INPUT_SCALE_LINEAR],
  ])('%s', (_label, values, expected) => {
    expect(detectInputScale(values).scale).toBe(expected);
  });

  test('the 99th percentile that sits exactly on 100 is computed as exactly 100, as in R', () => {
    expect(detectInputScale(halves(50, 100)).quantiles.q99).toBe(100);
  });

  test("a 99th percentile one rounding step above 100 is above 100, as R's quantile() computes it", () => {
    // R 4.4.1, reading these exact doubles, gives a 99th percentile of 100.00000000000001, and its
    // GEO2R expression says linear. The algebraically equal x[lo] + h * (x[hi] - x[lo]) rounds to
    // exactly 100 instead, so R's own (1 - h) * x[lo] + h * x[hi] is what decides this case.
    const values = [...Array(39).fill(0), 28.3, 147.79999999999973];
    expect(detectInputScale(values).quantiles.q99).toBe(100.00000000000001);
    expect(detectInputScale(values).scale).toBe(INPUT_SCALE_LINEAR);
  });

  test('negative values (centred log data) are not mistaken for linear values', () => {
    expect(detectInputScale([-2.5, -1, -0.2, 0, 0.4, 1.3, 2.8]).scale).toBe(INPUT_SCALE_LOG2);
  });

  test('a known limitation: linear ratios clustered around 1 look like log2 values', () => {
    // Nothing in these numbers distinguishes them from log2 values, which is why the page shows
    // what it assumed and lets the user override it. (Older GEO2R scripts had a third condition
    // for this case; the current rule does not, and R agrees: log2.)
    expect(detectInputScale([0.5, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.5, 1.8, 2.5]).scale).toBe(
      INPUT_SCALE_LOG2
    );
  });
});

describe('where it departs from GEO2R: count matrices', () => {
  test('a sparse count matrix is linear, although GEO2R would call it log2', () => {
    // Ten zero counts and a few small ones: the lower quartile is 0, so GEO2R's span condition
    // cannot fire, and its 99th percentile (43.7 in R) is below 100 -- R's GEO2R expression says
    // log2, which would turn every fold change into a difference of raw counts.
    const d = detectInputScale([...Array(10).fill(0), 35, 45, 8, 12]);
    expect(d.scale).toBe(INPUT_SCALE_LINEAR);
    expect(d.reason).toBe('every value is a whole number, from 0 to 45, as in a matrix of counts');
  });

  test('counts of 10 vs 40 are linear (GEO2R would call them log2)', () => {
    expect(detectInputScale([10, 10, 10, 10, 10, 10, 40, 40, 40, 40, 40, 40]).scale).toBe(
      INPUT_SCALE_LINEAR
    );
  });

  test('whole numbers no larger than 20 are left to the rule: they could be rounded log2 values', () => {
    expect(detectInputScale([0, 1, 2, 3, 5, 8]).scale).toBe(INPUT_SCALE_LOG2);
    expect(detectInputScale([2, 2, 2, 2, 2, 2, 5, 5, 5, 5, 5, 5]).scale).toBe(INPUT_SCALE_LOG2);
  });

  test('a spread too wide for log2 values, with too many zeros for the rule, gets no suggestion', () => {
    // R's GEO2R expression says log2 for this vector; a span of 110.5 is a 2^110-fold range as
    // log2 values, so the page asks the user instead of guessing.
    const d = detectInputScale([...Array(10).fill(0), 110.5]);
    expect(d.scale).toBeNull();
    expect(d.reason).toMatch(/span 111 \(from 0 to 111\), too wide for log2 values, but their lower quartile is 0 or less/);
  });
});

describe('expressionValuesFromCsv splits rows and cells as the backend does, and skips cells it would reject', () => {
  test('skips the header row and the gene-name column', () => {
    expect(expressionValuesFromCsv('gene,s1,s2\nG1,1.5,2\nG2,3,4')).toEqual([1.5, 2, 3, 4]);
  });

  test('numeric gene IDs and numeric sample names are labels, not values', () => {
    // Entrez IDs such as 7157 (TP53) are common gene "names"; counted as values they alone
    // would push the 99th percentile past 100 and make a log2 matrix look linear.
    expect(expressionValuesFromCsv('gene,1,2\n7157,5.5,6.5\n672,7,8')).toEqual([5.5, 6.5, 7, 8]);
  });

  test('a blank cell is missing, not zero', () => {
    expect(expressionValuesFromCsv('gene,s1,s2,s3\nG1,5,,7')).toEqual([5, 7]);
  });

  test('Windows line endings and non-numeric cells are tolerated', () => {
    expect(expressionValuesFromCsv('gene,s1,s2\r\nG1,1,NA\r\nG2,3,4\r\n')).toEqual([1, 3, 4]);
  });
});

describe('when nothing can be detected', () => {
  test('no numeric values gives no scale, and says why', () => {
    const d = detectInputScale(expressionValuesFromCsv('gene,s1,s2\nG1,NA,NA'));
    expect(d.scale).toBeNull();
    expect(d.reason).toMatch(/no numeric expression values/);
  });
});

describe('resolveInputScale', () => {
  const log2 = { scale: INPUT_SCALE_LOG2 };
  test('auto uses the detected scale', () => {
    expect(resolveInputScale(INPUT_SCALE_AUTO, log2)).toBe(INPUT_SCALE_LOG2);
  });
  test('an explicit choice wins over detection', () => {
    expect(resolveInputScale(INPUT_SCALE_LINEAR, log2)).toBe(INPUT_SCALE_LINEAR);
  });
  test('auto with nothing detected resolves to no scale, so the analysis cannot run on a guess', () => {
    expect(resolveInputScale(INPUT_SCALE_AUTO, null)).toBeNull();
    expect(resolveInputScale(INPUT_SCALE_AUTO, { scale: null })).toBeNull();
  });
});
