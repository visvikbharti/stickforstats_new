import {
  adaptAnovaResponse,
  adaptPostHocResults,
  adaptRepeatedMeasuresResponse,
  adaptTwoWayResponse,
  buildTwoWayCells,
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

/**
 * Two-way and repeated-measures ANOVA have been implemented and cross-validated in the
 * backend for months (two-way vs pingouin, repeated-measures vs statsmodels AnovaRM), and
 * the module's own Theory tab teaches both designs -- but the Analysis tab hard-coded
 * anova_type: 'one_way' and presented the three designs as three decorative <Chip>s. To a
 * user that looked exactly like a toggle group with two broken options, which is precisely
 * how it was reported.
 */
describe('adaptTwoWayResponse', () => {
  const payload = {
    high_precision_result: {
      anova_type: 'two_way',
      design: {
        factor1_n_levels: 2,
        factor2_n_levels: 2,
        balanced: true,
        cell_sizes: [3, 3, 3, 3],
        n_total: 12,
        sum_of_squares_type: 2,
        interaction: true,
      },
      effects: [
        { name: 'factor1', f_statistic: 4.2, p_value: 0.074, df: 1, df_residual: 8, sum_of_squares: 10.5, mean_square: 10.5, partial_eta_squared: 0.344 },
        { name: 'factor2', f_statistic: 96.3, p_value: 9.7e-6, df: 1, df_residual: 8, sum_of_squares: 240.1, mean_square: 240.1, partial_eta_squared: 0.923 },
        { name: 'interaction', f_statistic: 18.7, p_value: 0.0025, df: 1, df_residual: 8, sum_of_squares: 46.6, mean_square: 46.6, partial_eta_squared: 0.700 },
      ],
      r_squared: 0.94,
      adjusted_r_squared: 0.91,
    },
  };

  it('exposes every effect, not just the first', () => {
    const result = adaptTwoWayResponse(payload);
    expect(result.design).toBe('two_way');
    expect(result.effects.map((e) => e.key)).toEqual(['factor1', 'factor2', 'interaction']);
  });

  it('flags significance per effect', () => {
    const { effects } = adaptTwoWayResponse(payload);
    expect(effects.find((e) => e.key === 'factor1').significant).toBe(false);
    expect(effects.find((e) => e.key === 'factor2').significant).toBe(true);
    expect(effects.find((e) => e.key === 'interaction').significant).toBe(true);
  });

  it('carries the design metadata a reader needs to judge the fit', () => {
    const result = adaptTwoWayResponse(payload);
    expect(result.balanced).toBe(true);
    expect(result.sumOfSquaresType).toBe(2);
    expect(result.nTotal).toBe(12);
    expect(result.modelRSquared).toBeCloseTo(0.94);
  });

  it('throws rather than rendering an empty table when the server returns nothing', () => {
    expect(() => adaptTwoWayResponse({})).toThrow(/no two-way ANOVA result/i);
  });
});

describe('adaptRepeatedMeasuresResponse', () => {
  const build = (spherical) => ({
    high_precision_result: {
      anova_type: 'repeated_measures',
      n_subjects: 10,
      n_conditions: 3,
      f_statistic: 12.4,
      p_value: 0.0003,
      df_between: 2,
      df_within: 18,
      partial_eta_squared: 0.58,
      sphericity: {
        mauchly_w: spherical ? 0.91 : 0.42,
        chi_square: spherical ? 0.8 : 7.6,
        df: 2,
        p_value: spherical ? 0.67 : 0.022,
        assumption_met: spherical,
      },
      greenhouse_geisser: { epsilon: spherical ? 0.95 : 0.63, p_value: spherical ? 0.0004 : 0.0031 },
      recommended_p_value: spherical ? 0.0003 : 0.0031,
      recommended_p_basis: spherical ? 'uncorrected' : 'greenhouse_geisser',
    },
  });

  it('reports the uncorrected p when sphericity holds', () => {
    const result = adaptRepeatedMeasuresResponse(build(true));
    expect(result.sphericity.assumption_met).toBe(true);
    expect(result.recommended_p_basis).toBe('uncorrected');
    expect(result.recommended_p_value).toBeCloseTo(0.0003);
  });

  it('switches to the Greenhouse-Geisser p when sphericity is violated', () => {
    // Reporting the uncorrected F under a sphericity violation inflates the Type I error
    // rate -- which is exactly the mistake a user makes when the tool does not tell them.
    const result = adaptRepeatedMeasuresResponse(build(false));
    expect(result.sphericity.assumption_met).toBe(false);
    expect(result.recommended_p_basis).toBe('greenhouse_geisser');
    expect(result.recommended_p_value).toBeCloseTo(0.0031);
    expect(result.recommended_p_value).toBeGreaterThan(result.p_value);
    expect(result.greenhouse_geisser.epsilon).toBeCloseTo(0.63);
  });
});

describe('buildTwoWayCells', () => {
  const rows = [
    { value: 21.4, factor1: 'A', factor2: 'low' },
    { value: 23.1, factor1: 'A', factor2: 'low' },
    { value: 27.6, factor1: 'A', factor2: 'high' },
    { value: 18.2, factor1: 'B', factor2: 'low' },
    { value: 30.1, factor1: 'B', factor2: 'high' },
    { value: 31.8, factor1: 'B', factor2: 'high' },
  ];

  it('lays the cells out in the row-major order the backend expects', () => {
    // two_way_anova indexes groups[i * n2 + j] for (factor1_levels[i], factor2_levels[j]).
    const { cells, factor1Levels, factor2Levels } = buildTwoWayCells(rows);
    expect(factor1Levels).toEqual(['A', 'B']);
    expect(factor2Levels).toEqual(['low', 'high']);
    expect(cells).toEqual([[21.4, 23.1], [27.6], [18.2], [30.1, 31.8]]);
  });

  it('refuses an empty cell rather than sending an inestimable design', () => {
    const missing = rows.filter((r) => !(r.factor1 === 'B' && r.factor2 === 'low'));
    expect(() => buildTwoWayCells(missing)).toThrow(/B x low/);
  });

  it('requires at least two levels per factor', () => {
    const oneLevel = rows.map((r) => ({ ...r, factor1: 'A' }));
    expect(() => buildTwoWayCells(oneLevel)).toThrow(/at least 2 levels/i);
  });
});
