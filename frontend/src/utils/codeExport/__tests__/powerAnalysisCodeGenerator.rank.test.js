/**
 * The generated script has to compute the number the screen showed.
 *
 * The R and Python rank-test generators each hardcoded
 *
 *     const are = 0.955;   // 3/π for normal data
 *
 * and printed "For normally distributed data ... non-parametric tests need ~5% larger samples for
 * same power" -- while the tool above them lets the user choose the parent distribution and solves
 * with the matching ARE. So a user who selected a Laplace parent was shown 43 per group and handed
 * a script that computes 68.
 *
 * That is the worst place for this bug to live. The script is the artifact that outlives the
 * session: it goes in the supplementary material, and it is what a reviewer re-runs. A tool that
 * disagrees with its own exported code is worse than one that exports nothing.
 *
 * The "~5% larger samples" line was the same claim the app itself was corrected for: 3/π is the
 * efficiency under NORMALITY -- an odd assumption for data you have chosen a rank test for -- and
 * it points the wrong way, since every heavier-tailed parent makes the rank test need FEWER
 * subjects.
 */

import { generateRCode, generatePythonCode } from '../powerAnalysisCodeGenerator';

// The ARE the backend actually returns, per parent. (backend: ARE_VS_PARAMETRIC)
const BACKEND_ARE = {
  normal: 3 / Math.PI,
  uniform: 1.0,
  logistic: Math.PI ** 2 / 9,
  laplace: 1.5,
  exponential: 3.0,
};

const paramsFor = (parentDistribution, testType = 'mann-whitney') => ({
  testType,
  calculationMode: 'sampleSize',
  alpha: 0.05,
  power: 0.8,
  effectSize: 0.5,
  sampleSize: 30,
  numGroups: 3,
  alternative: 'two-sided',
  parentDistribution,
  // What the backend handed back for this design -- the ARE the displayed answer used.
  results: { are: BACKEND_ARE[parentDistribution] },
});

// The ARE the script will actually RUN with: the assignment statement, anchored to the start of a
// line so it cannot match the word "ARE" inside the explanatory comments above it.
const areInCode = (code) => {
  const match = code.match(/^ARE\s*(?:<-|=)\s*([0-9.]+)/m);
  return match ? Number(match[1]) : null;
};

describe.each([
  ['R', generateRCode],
  ['Python', generatePythonCode],
])('%s rank-test code carries the ARE the answer was computed with', (_label, generate) => {
  it.each([
    ['normal', 0.9549],
    ['uniform', 1.0],
    ['logistic', 1.0966],
    ['laplace', 1.5],
    ['exponential', 3.0],
  ])('a %s parent puts ARE = %f in the script, not 0.955', (parent, expected) => {
    const code = generate(paramsFor(parent));
    expect(areInCode(code)).toBeCloseTo(expected, 3);
  });

  it('does not hardcode the normal ARE for a heavy-tailed design', () => {
    // The exact regression: Laplace on screen (n = 43), 0.955 in the script (n = 68).
    const code = generate(paramsFor('laplace'));

    expect(areInCode(code)).toBeCloseTo(1.5, 6);
    expect(areInCode(code)).not.toBeCloseTo(0.955, 2);
  });

  it('names the parent distribution it assumed, so the reader can check it', () => {
    expect(generate(paramsFor('laplace'))).toMatch(/Laplace/i);
    expect(generate(paramsFor('exponential'))).toMatch(/exponential/i);
  });

  it('no longer claims rank tests always cost ~5% more subjects', () => {
    // Backwards for every heavy-tailed parent, which is the case a rank test is chosen FOR.
    for (const parent of Object.keys(BACKEND_ARE)) {
      expect(generate(paramsFor(parent))).not.toMatch(/need ~5% larger samples/i);
    }
  });

  it('uses the exact ARE the backend returned when it describes the parent being named', () => {
    // The backend sends full precision; the table is rounded. Same parent -> take the backend's,
    // so the script computes with the number the screen was computed with.
    const code = generate({ ...paramsFor('laplace'), results: { are: 1.5000000001 } });
    expect(areInCode(code)).toBeCloseTo(1.5, 6);
  });

  it('never names one parent while computing with another', () => {
    // `results` (last completed run) and `parentDistribution` (live UI state) come from different
    // places. A caller that lets them drift -- change the parent dropdown, do not re-run -- would
    // otherwise emit "assumes a Laplace parent, ARE = 0.9549", which names one distribution and
    // computes with another in a single line. On disagreement the STATED parent wins, because that
    // is what the surrounding prose commits to.
    const stale = { ...paramsFor('laplace'), results: { are: 3 / Math.PI } }; // normal's ARE
    const code = generate(stale);

    expect(code).toMatch(/Laplace/);
    expect(areInCode(code)).toBeCloseTo(1.5, 6); // Laplace's ARE, not the stale normal one
    expect(areInCode(code)).not.toBeCloseTo(0.955, 2);
  });

  it('covers all three rank tests', () => {
    for (const testType of ['mann-whitney', 'wilcoxon', 'kruskal-wallis']) {
      const code = generate(paramsFor('laplace', testType));
      expect(areInCode(code)).toBeCloseTo(1.5, 6);
    }
  });

  /**
   * The comment table in the generated script, pinned — FOR EVERY RANK TEST.
   *
   * Two defects lived here, and the second was invisible to the test written for the first.
   *
   * 1. I ran four of the five rows against the engine and INTERPOLATED the fifth: I wrote 65 for
   *    the uniform parent because ARE = 1.0 sits between the normal (0.955 -> 68) and the logistic
   *    (1.097 -> 59). The answer is 64.
   *
   * 2. One generator function serves all three rank tests, and the table was a MANN-WHITNEY table
   *    printed under all three headings. A Wilcoxon script said a normal-parent design needs "68
   *    per group": it needs 36 PAIRS — 89% too large, and "per group" is meaningless for a
   *    one-sample test. Kruskal-Wallis was told 68 where the answer is 15, off by 4.5x.
   *
   * MY TEST FOR (1) COULD NOT SEE (2), for the third time in a row and by the same mechanism: every
   * assertion generated the Mann-Whitney script. The table was pinned exactly where it was correct
   * and nowhere it was wrong. So this now generates ALL THREE, and asserts each carries ITS OWN
   * numbers and its own unit.
   *
   * All 15 values are asserted against the real engine in
   * backend/tests/test_the_fix_can_lie_too.py::TheExportedTableIsPerTestNotPerMannWhitney.
   */
  const EXPECTED = {
    'mann-whitney': { unit: 'n per group', sizes: [68, 64, 59, 43, 22] },
    wilcoxon: { unit: 'n pairs', sizes: [36, 34, 32, 23, 12] },
    'kruskal-wallis': { unit: 'n per group, k = 3', sizes: [15, 14, 13, 10, 5] },
  };

  const tableSizes = (code) =>
    ['normal', 'uniform', 'logistic', 'Laplace', 'exponential'].map((parent) => {
      const row = code.split('\n').find((line) => line.includes(parent) && /\s\d+\s*$/.test(line));
      return Number(row.trim().split(/\s+/).pop());
    });

  it.each(Object.keys(EXPECTED))('the %s script carries the table for the %s design', (testType) => {
    const code = generate(paramsFor('normal', testType));

    expect(tableSizes(code)).toEqual(EXPECTED[testType].sizes);
    expect(code).toContain(EXPECTED[testType].unit);
  });

  it('a Wilcoxon script is not handed the Mann-Whitney table', () => {
    // The exact defect: 68 per group, where the answer is 36 pairs.
    const wilcoxon = generate(paramsFor('normal', 'wilcoxon'));

    expect(tableSizes(wilcoxon)).not.toEqual(EXPECTED['mann-whitney'].sizes);
    expect(wilcoxon).not.toContain('n per group'); // meaningless for a one-sample test
    expect(wilcoxon).toContain('n pairs');
  });

  it('the three tables are genuinely different from one another', () => {
    const columns = Object.keys(EXPECTED).map((t) => tableSizes(generate(paramsFor('normal', t))).join(','));
    expect(new Set(columns).size).toBe(3);
  });

  it.each(Object.keys(EXPECTED))('the %s table shows heavier tails needing FEWER subjects', (testType) => {
    const sizes = tableSizes(generate(paramsFor('normal', testType)));
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a)); // strictly decreasing — its whole point
  });
});
