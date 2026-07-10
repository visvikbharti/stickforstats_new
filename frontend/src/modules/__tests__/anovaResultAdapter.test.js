import {
  adaptAnovaResponse,
  adaptPostHocResults,
  formatPValue,
  formatStat,
} from '../anovaResultAdapter';

/**
 * Regression guard for the fabricated-results bug: ANOVACompleteModule used to
 * POST to a nonexistent '/statistical-tests/anova/' route and, on the resulting
 * 404, render hard-coded numbers (F=4.573, p=0.012, eta2=0.348) as if they were
 * the user's results. It now calls the real high-precision endpoint and renders
 * only what the backend returns.
 *
 * The payload below mirrors HighPrecisionANOVAView (backend/api/v1/views.py),
 * which serialises every Decimal as a string to preserve 50-decimal precision.
 */
const omit = (obj, key) => {
  const copy = { ...obj };
  delete copy[key];
  return copy;
};

const backendPayload = {
  high_precision_result: {
    f_statistic: '4.57312345678901234567890123456789012345678901234567',
    p_value: '0.01234567890123456789012345678901234567890123456789',
    df_between: 2,
    df_within: 27,
    df_total: 29,
    ss_between: '125.45000000000000000000000000000000000000000000000',
    ss_within: '234.67000000000000000000000000000000000000000000000',
    ss_total: '360.12000000000000000000000000000000000000000000000',
    ms_between: '62.725',
    ms_within: '8.691481481481481481481481481481481481481481481481',
    eta_squared: '0.34835054981672775',
    partial_eta_squared: '0.34835054981672775',
    omega_squared: '0.31219512195121951',
    cohen_f: '0.73123456789012345',
    observed_power: '0.7412',
  },
  effect_sizes: {
    eta_squared: '0.34835054981672775',
    partial_eta_squared: '0.34835054981672775',
    omega_squared: '0.31219512195121951',
    cohen_f: '0.73123456789012345',
  },
  post_hoc_results: {
    Group_1_vs_Group_2: {
      mean_difference: '3.4500000000',
      t_statistic: '2.6100000000',
      p_value: '0.0145000000',
      adjusted_p_value: '0.0435000000',
      significant: true,
    },
    Group_1_vs_Group_3: {
      mean_difference: '1.2000000000',
      t_statistic: '0.9100000000',
      p_value: '0.3700000000',
      adjusted_p_value: '1.1100000000',
      significant: false,
    },
  },
};

describe('adaptAnovaResponse', () => {
  it('maps the backend payload onto the fields the module renders', () => {
    const result = adaptAnovaResponse(backendPayload);

    expect(result.f_statistic).toBeCloseTo(4.573123, 5);
    expect(result.p_value).toBeCloseTo(0.012345, 5);
    expect(result.degrees_of_freedom_between).toBe(2);
    expect(result.degrees_of_freedom_within).toBe(27);
    expect(result.sum_of_squares_between).toBeCloseTo(125.45, 5);
    expect(result.sum_of_squares_within).toBeCloseTo(234.67, 5);
    expect(result.eta_squared).toBeCloseTo(0.348351, 5);
    expect(result.omega_squared).toBeCloseTo(0.312195, 5);
  });

  it('returns numbers, not Decimal strings, so .toFixed() at render is safe', () => {
    const result = adaptAnovaResponse(backendPayload);
    ['f_statistic', 'p_value', 'eta_squared', 'omega_squared'].forEach((key) => {
      expect(typeof result[key]).toBe('number');
    });
  });

  it('never invents a result when the backend returns none', () => {
    expect(() => adaptAnovaResponse({})).toThrow(/no ANOVA result/i);
    expect(() => adaptAnovaResponse(null)).toThrow(/no ANOVA result/i);
  });

  it('does not emit the old hard-coded fallback values', () => {
    const result = adaptAnovaResponse(backendPayload);
    expect(result.f_statistic).not.toBe(4.573);
    expect(result.p_value).not.toBe(0.012);
    expect(result.eta_squared).not.toBe(0.348);
  });

  it('falls back to high_precision_result when effect_sizes is absent', () => {
    const withoutEffects = omit(backendPayload, 'effect_sizes');
    const result = adaptAnovaResponse(withoutEffects);
    expect(result.eta_squared).toBeCloseTo(0.348351, 5);
  });

  it('yields a null post_hoc when the backend omits it (fewer than 3 groups)', () => {
    const noPostHoc = omit(backendPayload, 'post_hoc_results');
    expect(adaptAnovaResponse(noPostHoc).post_hoc).toBeNull();
  });
});

describe('adaptPostHocResults', () => {
  it('turns the comparison-keyed object into rows with readable group labels', () => {
    const rows = adaptPostHocResults(backendPayload.post_hoc_results);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      group1: 'Group 1',
      group2: 'Group 2',
      significant: true,
    });
    expect(rows[0].mean_diff).toBeCloseTo(3.45, 5);
  });

  it('reports the Bonferroni-adjusted p-value, clamped to 1', () => {
    const rows = adaptPostHocResults(backendPayload.post_hoc_results);

    expect(rows[0].p_value).toBeCloseTo(0.0435, 5);
    // adjusted_p_value of 1.11 is p x comparisons and is not a valid probability
    expect(rows[1].p_value).toBe(1);
  });

  it('carries the backend significance verdict rather than recomputing it', () => {
    const rows = adaptPostHocResults({
      Group_1_vs_Group_2: {
        mean_difference: '1.0',
        adjusted_p_value: '0.04',
        significant: false, // backend compares against alpha/comparisons
      },
    });
    expect(rows[0].significant).toBe(false);
  });

  it('uses the unadjusted p-value only when no adjusted one is supplied', () => {
    const rows = adaptPostHocResults({
      Group_1_vs_Group_2: { mean_difference: '1.0', p_value: '0.02', significant: true },
    });
    expect(rows[0].p_value).toBeCloseTo(0.02, 5);
  });

  it('returns null for a missing post-hoc block', () => {
    expect(adaptPostHocResults(null)).toBeNull();
    expect(adaptPostHocResults(undefined)).toBeNull();
  });

  it('parses the scientific notation the backend emits for tiny p-values', () => {
    const rows = adaptPostHocResults({
      Group_1_vs_Group_2: {
        mean_difference: '4.325',
        adjusted_p_value: '5.8946656435820541E-8',
        significant: true,
      },
    });
    expect(rows[0].p_value).toBe(5.8946656435820541e-8);
  });
});

describe('formatPValue', () => {
  it('does not render a tiny but nonzero p-value as a flat 0.0000', () => {
    // The backend routinely returns post-hoc p-values around 1e-8.
    expect(formatPValue(5.8946656435820541e-8, 4)).toBe('< 0.0001');
    expect(formatPValue(0.0000027648, 4)).toBe('< 0.0001');
  });

  it('renders an ordinary p-value at the requested precision', () => {
    expect(formatPValue(0.0435, 4)).toBe('0.0435');
    expect(formatPValue(1, 4)).toBe('1.0000');
  });

  it('renders an exact zero as zero, not as a threshold', () => {
    expect(formatPValue(0, 4)).toBe('0.0000');
  });

  it('renders a missing value as an em dash', () => {
    expect(formatPValue(null, 4)).toBe('—');
    expect(formatPValue(undefined, 4)).toBe('—');
    expect(formatPValue(NaN, 4)).toBe('—');
  });
});

describe('formatStat', () => {
  it('rounds a finite number and dashes anything else', () => {
    expect(formatStat(3.45678, 3)).toBe('3.457');
    expect(formatStat(null, 3)).toBe('—');
    expect(formatStat(Infinity, 3)).toBe('—');
  });
});
