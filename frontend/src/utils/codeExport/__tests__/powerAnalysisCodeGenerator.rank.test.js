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

  it('prefers the ARE the backend returned over its own table', () => {
    // If the two ever diverge, the script must follow the number that was actually displayed.
    const code = generate({ ...paramsFor('normal'), results: { are: 1.2345 } });
    expect(areInCode(code)).toBeCloseTo(1.2345, 4);
  });

  it('covers all three rank tests', () => {
    for (const testType of ['mann-whitney', 'wilcoxon', 'kruskal-wallis']) {
      const code = generate(paramsFor('laplace', testType));
      expect(areInCode(code)).toBeCloseTo(1.5, 6);
    }
  });
});
