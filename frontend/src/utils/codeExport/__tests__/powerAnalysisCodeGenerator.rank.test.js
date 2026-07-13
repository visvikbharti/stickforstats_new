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

/**
 * The Kruskal-Wallis table is computed at k = 3. The user can pick any k, and the answer moves a
 * long way: at d = 0.5, 80% power, normal parent it is 18 per group at k = 2, 15 at k = 3, and 6 at
 * k = 20. A table printing 15 beside a user's own answer of 6 is a number that was not computed for
 * their design -- which is the defect this table has already had twice (a fabricated row, then the
 * Mann-Whitney column under every heading).
 *
 * The ARE column IS k-invariant, and is the point the table exists to make, so it stays.
 */
describe.each([
  ['R', generateRCode],
  ['Python', generatePythonCode],
])('%s Kruskal-Wallis script is honest about the k its table assumes', (_label, generate) => {
  const kwParams = (numGroups) => ({ ...paramsFor('normal', 'kruskal-wallis'), numGroups });

  it('says nothing extra when the user IS running k = 3', () => {
    expect(generate(kwParams(3))).not.toMatch(/NOTE: the n column/);
  });

  it.each([2, 5, 8, 20])('warns that the column does not describe a k = %i design', (k) => {
    const code = generate(kwParams(k));

    expect(code).toMatch(/NOTE: the n column above is for k = 3 groups/);
    expect(code).toMatch(new RegExp(`Your design has k = ${k}`));
    expect(code).not.toMatch(/k = undefined/); // the interpolation must actually resolve
    expect(code).toMatch(/ARE column does not depend on k/);
  });

  it('never warns for the rank tests that have no k at all', () => {
    for (const testType of ['mann-whitney', 'wilcoxon']) {
      const code = generate({ ...paramsFor('normal', testType), numGroups: 5 });
      expect(code).not.toMatch(/NOTE: the n column/);
    }
  });
});

/**
 * The rank generators TOOK a `mode` and never READ it. Every other generator branches on it.
 *
 * So sample-size mode -- where the sample-size box is not rendered at all, leaving `sampleSize` at
 * its untouched default of 30 -- exported a script headed "Calculation Mode: sampleSize" which
 * computed the POWER of a 30-subject study and then signed off with the achieved power of the
 * 68-subject study the screen had recommended:
 *
 *     # Calculation Mode: sampleSize
 *     n <- 30                                  <- an n the user never saw or typed
 *     effective_n <- n * ARE                   <- 28.65
 *     result <- pwr.t.test(n = effective_n, d = 0.5, type = "two.sample")
 *     # StickForStats Result: Power = 80.15%   <- the script computes 0.4600
 *
 * A 34-point contradiction inside a single artifact -- and the artifact is the one that goes into
 * the supplementary material. This is the same defect as 13070e3 ("the exported script disagreed
 * with the answer on screen"), one test branch to the left.
 *
 * The generated scripts here are EXECUTED -- R with pwr, Python with statsmodels -- and land on the
 * engine's own numbers: 64 -> 68, 34 -> 36, 14 -> 15.
 */
describe.each([
  ['R', generateRCode],
  ['Python', generatePythonCode],
])('%s rank script honours the calculation mode', (label, generate) => {
  const solveParams = (testType, results) => ({
    testType,
    calculationMode: 'sampleSize',
    alpha: 0.05,
    power: 0.8,
    effectSize: 0.5,
    sampleSize: 30, // the untouched default -- the box does not render in this mode
    numGroups: 3,
    alternative: 'two-sided',
    parentDistribution: 'normal',
    results,
  });

  // Executed against the engine (backend/tests/test_the_fix_can_lie_too.py).
  const SOLVED = {
    'mann-whitney': { n: 68, power: 0.807193, unit: 'n per group' },
    wilcoxon: { n: 36, power: 0.812291, unit: 'n pairs' },
    'kruskal-wallis': { n: 15, power: 0.813660, unit: 'n per group, k = 3' },
  };

  it.each(Object.keys(SOLVED))('a %s sample-size run solves for n instead of computing a power', (testType) => {
    const { n, power, unit } = SOLVED[testType];
    const code = generate(solveParams(testType, { n, power, are: 3 / Math.PI }));

    // It must SOLVE. The target power is an input, not an output.
    expect(code).toMatch(/n_rank/);
    expect(code).toMatch(/n_parametric/);

    // It must NOT quietly compute the power of the hidden default sample size.
    expect(code).not.toMatch(/^n\s*(?:<-|=)\s*30\b/m);
    expect(code).not.toMatch(/effective_n/);

    // And the footer must state the answer the screen stated, in the right unit.
    expect(code).toContain(`n = ${n} (${unit})`);
    expect(code).toContain(`achieving power = ${(power * 100).toFixed(2)}%`);
  });

  it('rounds the parametric n up to a whole subject BEFORE inflating it by the ARE', () => {
    // ceil(63.7656) = 64 -> ceil(64 / 0.954930) = 68, which is the screen's answer.
    // Dividing the continuous 63.7656 first gives ceil(66.77) = 67 -- one subject short.
    const code = generate(solveParams('mann-whitney', { n: 68, power: 0.807193, are: 3 / Math.PI }));

    const ceilFn = label === 'R' ? 'ceiling' : 'math\\.ceil';
    // the parametric solve is ceil'd where it is bound...
    expect(code).toMatch(new RegExp(`n_parametric\\s*(?:<-|=)\\s*${ceilFn}\\(`));
    // ...and the inflation is ceil'd again, of the ALREADY-INTEGER n_parametric.
    expect(code).toMatch(new RegExp(`n_rank\\s*(?:<-|=)\\s*${ceilFn}\\(\\s*n_parametric\\s*/\\s*ARE\\s*\\)`));
  });

  it('still computes a power when the user asked for a power', () => {
    const code = generate({
      ...solveParams('mann-whitney', { power: 0.460036, are: 3 / Math.PI }),
      calculationMode: 'power',
    });

    expect(code).toMatch(/effective_n/);       // power mode DOES use the ARE-adjusted n
    expect(code).toMatch(/^n\s*(?:<-|=)\s*30\b/m); // and 30 is the n the user actually typed here
    expect(code).not.toMatch(/n_rank/);
    expect(code).toContain('Power = 46.00%');
  });

  it('does not truncate the ARE-adjusted sample size', () => {
    // The engine stopped flooring `n * ARE` (it understated every rank power and made a whole extra
    // subject sometimes buy nothing). The script must not re-introduce the floor.
    const code = generate({
      ...solveParams('mann-whitney', { power: 0.460036, are: 3 / Math.PI }),
      calculationMode: 'power',
    });

    expect(code).not.toMatch(/int\(effective_n\)/);
    expect(code).not.toMatch(/floor\(effective_n\)/);
  });
});

/**
 * The R script and the Python script in ONE export must describe ONE study.
 *
 * `generatePythonCodeNonParametric` RECEIVED the alternative all along and never used it: all four
 * of its statsmodels calls hardcoded `alternative="two-sided"`, while the R twin threaded the user's
 * choice through correctly. The Alternative dropdown IS rendered for Mann-Whitney and Wilcoxon, and
 * the engine honours it, so a one-sided design exported two scripts for two different studies:
 *
 *     Mann-Whitney, d = 0.5, 80% power, one-sided, normal parent
 *       screen and exported R:  54 per group
 *       exported PYTHON:        68 per group    <- 26% more subjects
 *     Wilcoxon:  screen and R 29 pairs, Python 36 pairs
 *     Power mode: screen 0.5887, exported Python computes 0.4600
 *
 * A mutation proved this hole was total: hardcoding the alternative in the R generator TOO left all
 * 62 rank tests passing. Not one of them looked at it. Same hole as "there was no test for the
 * two-sample-t generator at all", which is how the last P1 walked in.
 *
 * statsmodels spells it `larger`/`smaller`; pwr spells it `greater`/`less`. The two scripts must
 * therefore not be compared literally -- they must be compared through the mapping.
 */
describe('the R and Python rank scripts run the SAME alternative hypothesis', () => {
  const params = (testType, calculationMode, alternative) => ({
    testType,
    calculationMode,
    alternative,
    alpha: 0.05,
    power: 0.8,
    effectSize: 0.5,
    sampleSize: 30,
    numGroups: 3,
    parentDistribution: 'normal',
    results: { n: 54, power: 0.809745, are: 3 / Math.PI },
  });

  // How each library spells the same hypothesis.
  const SPELLING = {
    'two-sided': { r: 'two.sided', py: 'two-sided' },
    greater: { r: 'greater', py: 'larger' },
    less: { r: 'less', py: 'smaller' },
  };

  const altInR = (code) => (code.match(/alternative\s*=\s*"([^"]+)"/) || [])[1];
  const altInPy = (code) => (code.match(/alternative="([^"]+)"/) || [])[1];

  describe.each(['mann-whitney', 'wilcoxon'])('%s', (testType) => {
    it.each(['power', 'sampleSize'])('in %s mode, both scripts carry the user\'s alternative', (mode) => {
      for (const alternative of ['two-sided', 'greater', 'less']) {
        const r = generateRCode(params(testType, mode, alternative));
        const py = generatePythonCode(params(testType, mode, alternative));

        expect(altInR(r)).toBe(SPELLING[alternative].r);
        expect(altInPy(py)).toBe(SPELLING[alternative].py);
      }
    });

    it.each(['power', 'sampleSize'])('in %s mode, a one-sided design is never exported as two-sided', (mode) => {
      // The exact regression: Python said two-sided while R and the screen said one-sided.
      const py = generatePythonCode(params(testType, mode, 'greater'));

      expect(py).not.toMatch(/alternative="two-sided"/);
      expect(altInPy(py)).toBe('larger');
    });

    it('uses the statsmodels spelling, not pwr\'s -- the script has to run', () => {
      // `alternative="greater"` is a ValueError in statsmodels. Interpolating the raw value would
      // have produced a script that does not execute at all.
      for (const alternative of ['greater', 'less']) {
        const py = generatePythonCode(params(testType, 'sampleSize', alternative));
        expect(py).not.toMatch(/alternative="(greater|less)"/);
      }
    });
  });

  it('Kruskal-Wallis has no alternative to carry, and does not invent one', () => {
    // pwr.anova.test / FTestAnovaPower take no alternative. The dropdown is not rendered for it.
    for (const generate of [generateRCode, generatePythonCode]) {
      const code = generate(params('kruskal-wallis', 'sampleSize', 'two-sided'));
      expect(code).not.toMatch(/alternative/);
    }
  });
});

/**
 * statsmodels' FTestAnovaPower.solve_power returns the TOTAL observations across all k groups --
 * 41.6856 for f = 0.5, k = 3, 80% power -- not the per-group count. The engine works per group.
 *
 * So the script must divide by k before it ceils: ceil(41.6856 / 3) = 14 -> ceil(14 / ARE) = 15,
 * which is the screen's answer. Dropping the `/ k` yields ceil(42 / ARE) = 44 per group, a 3x
 * overstatement -- and a mutation proved it: deleting the `/ k` left all 62 rank tests green,
 * because the only assertion on that line was a regex that matched either way.
 */
describe('the Python Kruskal-Wallis script converts total observations to per-group', () => {
  const kwParams = {
    testType: 'kruskal-wallis',
    calculationMode: 'sampleSize',
    alpha: 0.05,
    power: 0.8,
    effectSize: 0.5,
    sampleSize: 30,
    numGroups: 3,
    alternative: 'two-sided',
    parentDistribution: 'normal',
    results: { n: 15, power: 0.813660, are: 3 / Math.PI },
  };

  it('divides the total by k before rounding up', () => {
    const py = generatePythonCode(kwParams);

    expect(py).toMatch(/n_parametric\s*=\s*math\.ceil\(\s*total_parametric\s*\/\s*k\s*\)/);
  });

  it('names the trap, because the total looks like a per-group count', () => {
    expect(generatePythonCode(kwParams)).toMatch(/TOTAL observations/i);
  });

  it('R needs no such division -- pwr.anova.test returns n per group directly', () => {
    const r = generateRCode(kwParams);

    expect(r).toMatch(/n_parametric\s*<-\s*ceiling\(parametric\$n\)/);
    expect(r).not.toMatch(/\/\s*k/);
  });
});
