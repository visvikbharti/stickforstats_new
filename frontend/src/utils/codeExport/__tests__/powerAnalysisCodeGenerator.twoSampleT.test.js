/**
 * The exported script has to RUN, and it has to describe the design the screen described.
 *
 * There was no test for the two-sample-t generator at all — the only file here covered the rank
 * tests — and a P1 walked straight through the gap, in the commit that was fixing this very value:
 *
 *   `getCodeParams` began passing `sampleSize2: secondArm`, which is correctly `null` in
 *   sample-size mode (the group-2 box is not on screen there). The R generator opened with
 *
 *       const ratio = n2 / n1;      // null / 30 === 0   in JavaScript
 *
 *   and printed it. So the exported R script told the researcher:
 *
 *       # For unequal allocation (ratio = 0):
 *       # n2 = ceiling(result$n * 0)
 *
 *   Group 2 gets zero subjects. The Python twin hardcoded ratio = 1.0 in the same branch, so the
 *   same export contained an R script and a Python script that disagreed about the design.
 *
 * And clearing the box (`parseInt('') || 0` → 0 → null) put a bare `null` literal into both
 * scripts — `n2 <- null` is not R, `n2 = null` is not Python — so neither would even parse, while
 * the screen showed the balanced answer.
 *
 * A missing second arm means BALANCED, which is what the backend has always done. The script must
 * say the same thing, in a language that runs.
 */

import { generateRCode, generatePythonCode } from '../powerAnalysisCodeGenerator';

const base = {
  testType: 'two-sample-t',
  alpha: 0.05,
  power: 0.8,
  effectSize: 0.5,
  sampleSize: 30,
  numGroups: 3,
  alternative: 'two-sided',
  results: {},
};

const n2InScript = (code) => {
  const match = code.match(/^n2\s*(?:<-|=)\s*(\S+)/m);
  return match ? match[1] : null;
};

describe.each([
  ['R', generateRCode],
  ['Python', generatePythonCode],
])('%s two-sample-t script', (_label, generate) => {
  it('never emits a null, undefined or NaN literal — the script has to parse', () => {
    for (const calculationMode of ['power', 'sampleSize', 'effectSize']) {
      for (const sampleSize2 of [null, undefined, 0, NaN, '']) {
        const code = generate({ ...base, calculationMode, sampleSize2 });
        expect(code).not.toMatch(/\bnull\b/);
        expect(code).not.toMatch(/\bundefined\b/);
        expect(code).not.toMatch(/\bNaN\b/);
      }
    }
  });

  it('treats a missing second arm as BALANCED, exactly as the backend does', () => {
    // The screen shows the 30/30 power when no second arm is sent. The script must agree.
    for (const sampleSize2 of [null, undefined, 0, NaN]) {
      const code = generate({ ...base, calculationMode: 'power', sampleSize2 });
      expect(n2InScript(code)).toBe('30');
    }
  });

  it('honours a real second arm', () => {
    const code = generate({ ...base, calculationMode: 'power', sampleSize2: 60 });
    expect(n2InScript(code)).toBe('60');
  });

  it('never tells the reader group 2 needs zero subjects', () => {
    // The exact P1. `ratio = 0` and `n * 0` both mean an empty arm.
    for (const calculationMode of ['power', 'sampleSize', 'effectSize']) {
      const code = generate({ ...base, calculationMode, sampleSize2: null });
      expect(code).not.toMatch(/ratio\s*=\s*0\b/);
      expect(code).not.toMatch(/\*\s*0\s*\)/);
      expect(code).not.toMatch(/^n2\s*(?:<-|=)\s*0\s*$/m);
    }
  });
});

describe('the R and Python scripts describe the SAME design', () => {
  it.each(['power', 'sampleSize', 'effectSize'])('in %s mode, for a missing second arm', (calculationMode) => {
    // They disagreed: R derived a ratio from a box that mode does not render (getting 0), while
    // Python hardcoded 1.0. One export, two scripts, two different studies.
    const r = generateRCode({ ...base, calculationMode, sampleSize2: null });
    const py = generatePythonCode({ ...base, calculationMode, sampleSize2: null });

    expect(n2InScript(r)).toBe(n2InScript(py));
  });

  it.each(['power', 'effectSize'])('in %s mode, for a genuine 30/60 design', (calculationMode) => {
    const r = generateRCode({ ...base, calculationMode, sampleSize2: 60 });
    const py = generatePythonCode({ ...base, calculationMode, sampleSize2: 60 });

    expect(n2InScript(r)).toBe('60');
    expect(n2InScript(py)).toBe('60');
  });
});

describe('the minimum-detectable-effect scripts solve the design that was entered', () => {
  it('Python no longer hardcodes a balanced allocation', () => {
    // Found by this very test file, while it was being written for a different bug: the Python MDE
    // branch passed `ratio=1.0` and never looked at n2. A 30/60 design was solved as 30/30 --
    // d = 0.7356 where the answer is 0.6334 -- while the R script beside it printed 0.6334.
    const py = generatePythonCode({ ...base, calculationMode: 'effectSize', sampleSize2: 60 });

    expect(py).not.toMatch(/ratio\s*=\s*1\.0/);
    expect(py).toMatch(/ratio\s*=\s*n2\s*\/\s*n1/);
    expect(py).toMatch(/^n2\s*=\s*60/m);
  });

  it('a balanced design still solves as balanced in both languages', () => {
    for (const generate of [generateRCode, generatePythonCode]) {
      const code = generate({ ...base, calculationMode: 'effectSize', sampleSize2: null });
      expect(n2InScript(code)).toBe('30'); // == n1
    }
  });
});

describe('the generated script is the researcher\'s artifact, not a changelog', () => {
  it('carries no commentary about bugs that were fixed', () => {
    for (const generate of [generateRCode, generatePythonCode]) {
      for (const calculationMode of ['power', 'sampleSize', 'effectSize']) {
        const code = generate({ ...base, calculationMode, sampleSize2: null });
        expect(code).not.toMatch(/used to (print|be)|this branch hardcoded|the bug|no subjects at all/i);
      }
    }
  });
});

describe('the sample-size answer is balanced, and the script says so', () => {
  it('the R script no longer derives an allocation ratio it cannot know', () => {
    // pwr.t.test(type = "two.sample") returns n PER GROUP. The mode has no group-2 box, so there is
    // no ratio to report — and deriving one from stale state is how it came to print ratio = 0.
    const code = generateRCode({ ...base, calculationMode: 'sampleSize', sampleSize2: null });

    expect(code).not.toMatch(/For unequal allocation/);
    expect(code).toMatch(/BALANCED design/);
    expect(code).toMatch(/pwr\.t\.test/);
  });
});
