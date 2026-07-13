/**
 * An effect must be labelled on the scale it is actually measured on.
 *
 * `interpretEffectSize` ended with a silent default:
 *
 *     const bench = benchmarks[type] || benchmarks.cohens_d;
 *
 * and the live call sites passed names that were NEVER keys in that table -- 'd', 'r',
 * 'eta_squared', 'cramers_v', and in one case no type at all. So every one of them fell through to
 * Cohen's d thresholds (0.2 / 0.5 / 0.8) and was labelled on the wrong scale. Executed against the
 * shipped code, these were the labels a user actually saw:
 *
 *     eta^2 = 0.14  ->  "negligible"   (it is a LARGE effect: 0.01 / 0.06 / 0.14)
 *     eta^2 = 0.06  ->  "negligible"   (it is MEDIUM)
 *     r     = 0.50  ->  "medium"       (it is LARGE: 0.1 / 0.3 / 0.5)
 *     r     = 0.30  ->  "small"        (it is MEDIUM)
 *
 * Eta-squared is almost never above 0.2, so EVERY ANOVA effect size on the Effect Size & Power tab
 * came back "negligible" -- telling a researcher a real effect was nothing. That is worse than a
 * slightly wrong number: it is the conclusion, stated in words.
 *
 * Same class as the bare `else` in the power API: a parameter we do not recognise must never be
 * quietly replaced with one we do.
 */

import { interpretEffectSize } from '../powerCalculations';

describe('every effect size is labelled on its own scale', () => {
  // Cohen (1988). The boundary value belongs to the band it opens: 0.14 IS large for eta-squared.
  const SCALES = {
    cohens_d: [0.2, 0.5, 0.8],
    cohens_f: [0.1, 0.25, 0.4],
    cohens_f2: [0.02, 0.15, 0.35],
    cohens_w: [0.1, 0.3, 0.5],
    correlation: [0.1, 0.3, 0.5],
    eta_squared: [0.01, 0.06, 0.14],
    partial_eta_squared: [0.01, 0.06, 0.14],
    omega_squared: [0.01, 0.06, 0.14],
    cramers_v: [0.1, 0.3, 0.5],
  };

  it.each(Object.entries(SCALES))('%s uses its own thresholds', (scale, [small, medium, large]) => {
    expect(interpretEffectSize(small / 2, scale)).toBe('negligible');
    expect(interpretEffectSize(small, scale)).toBe('small');
    expect(interpretEffectSize(medium, scale)).toBe('medium');
    expect(interpretEffectSize(large, scale)).toBe('large');
    expect(interpretEffectSize(large * 2, scale)).toBe('large');
  });

  it('labels the sign-free magnitude, so a negative effect is not always negligible', () => {
    expect(interpretEffectSize(-0.8, 'cohens_d')).toBe('large');
    expect(interpretEffectSize(-0.5, 'correlation')).toBe('large');
  });
});

describe('the exact regressions -- the labels a user was actually shown', () => {
  it('a large eta-squared is not called negligible', () => {
    expect(interpretEffectSize(0.14, 'eta_squared')).toBe('large');
    expect(interpretEffectSize(0.14, 'eta_squared')).not.toBe('negligible');

    expect(interpretEffectSize(0.06, 'eta_squared')).toBe('medium');
    expect(interpretEffectSize(0.10, 'eta_squared')).toBe('medium');
  });

  it('a large correlation is not called medium', () => {
    expect(interpretEffectSize(0.5, 'r')).toBe('large');
    expect(interpretEffectSize(0.3, 'r')).toBe('medium');
  });

  it("does not silently label everything on Cohen's d", () => {
    // The single assertion that would have caught all of it: the same number means different things
    // on different scales, so the labels MUST differ.
    expect(interpretEffectSize(0.14, 'eta_squared')).not.toBe(interpretEffectSize(0.14, 'cohens_d'));
    expect(interpretEffectSize(0.3, 'correlation')).not.toBe(interpretEffectSize(0.3, 'cohens_d'));
  });
});

describe('the names the call sites actually use are understood', () => {
  // These aliases were passed by live components and matched nothing.
  it.each([
    ['d', 'cohens_d'],
    ['f', 'cohens_f'],
    ['w', 'cohens_w'],
    ['r', 'correlation'],
    ['eta2', 'eta_squared'],
  ])('%s means %s', (alias, canonical) => {
    for (const value of [0.05, 0.14, 0.3, 0.5, 0.9]) {
      expect(interpretEffectSize(value, alias)).toBe(interpretEffectSize(value, canonical));
    }
  });
});

describe('a scale we do not recognise is not guessed at', () => {
  it('returns null rather than falling back to Cohen\'s d', () => {
    for (const unknown of ['hedges_g', 'glass_delta', 'banana', '', undefined, null]) {
      expect(interpretEffectSize(0.5, unknown)).toBeNull();
    }
  });

  it('returns null for a value that is not a number', () => {
    for (const bad of [null, undefined, NaN, 'abc']) {
      expect(interpretEffectSize(bad, 'cohens_d')).toBeNull();
    }
  });

  it('null is the honest answer, not the word "negligible"', () => {
    // Returning a LABEL for an unknown scale is how a real effect came to be called nothing.
    expect(interpretEffectSize(0.5, 'unknown_scale')).not.toBe('negligible');
    expect(interpretEffectSize(0.5, 'unknown_scale')).not.toBe('medium');
  });
});
