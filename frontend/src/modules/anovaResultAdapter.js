/**
 * Adapters from the high-precision ANOVA endpoint (/api/v1/stats/anova/) onto
 * the shape ANOVACompleteModule renders.
 *
 * The backend serialises every Decimal as a string so no precision is lost in
 * transit; rounding happens only at render time.
 */

const toNumber = (value) =>
  value === null || value === undefined ? null : Number(value);

// A missing statistic renders as an em dash rather than crashing on .toFixed().
export const formatStat = (value, decimals) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(decimals) : '—';

// Post-hoc p-values are routinely smaller than the display precision (1e-8 is
// common), and toFixed() would render them as a flat "0.0000" — which reads as
// exactly zero. Report them as below the threshold instead.
export const formatPValue = (value, decimals = 4) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';

  const smallest = 10 ** -decimals;
  if (value > 0 && value < smallest) return `< ${smallest.toFixed(decimals)}`;

  return value.toFixed(decimals);
};

/**
 * `post_hoc_results` arrives keyed by comparison, e.g.
 * { "Group_1_vs_Group_2": { mean_difference, p_value, adjusted_p_value, significant } }
 *
 * Bonferroni-adjusted p-values are p x comparisons and can exceed 1; a p-value
 * cannot, so clamp for display. The significance verdict comes from the backend,
 * which compares the unadjusted p against alpha/comparisons.
 */
export const adaptPostHocResults = (raw) => {
  if (!raw) return null;

  return Object.entries(raw).map(([comparison, stats]) => {
    const [group1, group2] = comparison.split('_vs_');
    const adjusted = toNumber(stats.adjusted_p_value ?? stats.p_value);

    return {
      group1: (group1 || '').replace(/_/g, ' '),
      group2: (group2 || '').replace(/_/g, ' '),
      mean_diff: toNumber(stats.mean_difference),
      p_value: adjusted === null ? null : Math.min(adjusted, 1),
      significant: Boolean(stats.significant),
    };
  });
};

export const adaptAnovaResponse = (payload) => {
  const hp = payload?.high_precision_result;
  if (!hp) {
    throw new Error('The server returned no ANOVA result.');
  }
  const effects = payload.effect_sizes || hp;

  return {
    design: 'one_way',
    f_statistic: toNumber(hp.f_statistic),
    p_value: toNumber(hp.p_value),
    degrees_of_freedom_between: hp.df_between,
    degrees_of_freedom_within: hp.df_within,
    sum_of_squares_between: toNumber(hp.ss_between),
    sum_of_squares_within: toNumber(hp.ss_within),
    eta_squared: toNumber(effects.eta_squared),
    omega_squared: toNumber(effects.omega_squared),
    post_hoc: adaptPostHocResults(payload.post_hoc_results),
  };
};

/**
 * Two-way ANOVA returns SEVERAL effects (factor A, factor B, and their interaction),
 * so it cannot be squeezed into the single-effect shape above -- which is a large part
 * of why this design was never wired up in the UI at all.
 */
export const adaptTwoWayResponse = (payload) => {
  const hp = payload?.high_precision_result;
  if (!hp || !Array.isArray(hp.effects)) {
    throw new Error('The server returned no two-way ANOVA result.');
  }

  const LABELS = {
    factor1: 'Factor A (main effect)',
    factor2: 'Factor B (main effect)',
    interaction: 'A x B interaction',
  };

  return {
    design: 'two_way',
    balanced: hp.design?.balanced,
    sumOfSquaresType: hp.design?.sum_of_squares_type,
    nTotal: hp.design?.n_total,
    cellSizes: hp.design?.cell_sizes,
    // The backend key is `r_squared` (verified against two_way_anova's actual return, not
    // guessed) -- reading a key that does not exist is how half this app ended up rendering
    // blanks and NaNs.
    modelRSquared: toNumber(hp.r_squared),
    adjustedRSquared: toNumber(hp.adjusted_r_squared),
    residual: hp.residual,
    effects: hp.effects.map((effect) => ({
      key: effect.name,
      label: LABELS[effect.name] || effect.name,
      f_statistic: toNumber(effect.f_statistic),
      p_value: toNumber(effect.p_value),
      df: toNumber(effect.df),
      df_residual: toNumber(effect.df_residual),
      sum_of_squares: toNumber(effect.sum_of_squares),
      mean_square: toNumber(effect.mean_square),
      partial_eta_squared: toNumber(effect.partial_eta_squared),
      significant: toNumber(effect.p_value) < 0.05,
    })),
  };
};

/**
 * Repeated-measures ANOVA additionally reports Mauchly's test of sphericity and the
 * Greenhouse-Geisser correction. `recommended_p_value` is the one to report: the backend
 * picks the uncorrected p when sphericity holds and the GG-corrected p when it does not,
 * which is exactly the decision a user would otherwise get wrong.
 */
export const adaptRepeatedMeasuresResponse = (payload) => {
  const hp = payload?.high_precision_result;
  if (!hp) {
    throw new Error('The server returned no repeated-measures ANOVA result.');
  }

  const sphericity = hp.sphericity || {};
  const gg = hp.greenhouse_geisser || {};

  return {
    design: 'repeated_measures',
    n_subjects: hp.n_subjects,
    n_conditions: hp.n_conditions,
    f_statistic: toNumber(hp.f_statistic),
    p_value: toNumber(hp.p_value),
    degrees_of_freedom_between: hp.df_between,
    degrees_of_freedom_within: hp.df_within,
    partial_eta_squared: toNumber(hp.partial_eta_squared),
    sphericity: {
      mauchly_w: toNumber(sphericity.mauchly_w),
      chi_square: toNumber(sphericity.chi_square),
      df: toNumber(sphericity.df),
      p_value: toNumber(sphericity.p_value),
      assumption_met: sphericity.assumption_met,
    },
    greenhouse_geisser: {
      epsilon: toNumber(gg.epsilon),
      p_value: toNumber(gg.p_value),
    },
    recommended_p_value: toNumber(hp.recommended_p_value),
    recommended_p_basis: hp.recommended_p_basis,
  };
};

/**
 * Long-format rows -> the cell-sample layout two_way_anova expects: cells in ROW-MAJOR
 * order, groups[i * n2 + j] holding the cell for (factor1Levels[i], factor2Levels[j]).
 *
 * Throws on an empty cell, because an empty cell is not something the backend can
 * silently absorb -- a factorial design with a missing cell is not estimable.
 */
export const buildTwoWayCells = (rows) => {
  const factor1Levels = [...new Set(rows.map((row) => row.factor1))];
  const factor2Levels = [...new Set(rows.map((row) => row.factor2))];

  if (factor1Levels.length < 2 || factor2Levels.length < 2) {
    throw new Error('Two-way ANOVA needs at least 2 levels in each factor.');
  }

  const cells = [];
  const empty = [];
  factor1Levels.forEach((level1) => {
    factor2Levels.forEach((level2) => {
      const values = rows
        .filter((row) => row.factor1 === level1 && row.factor2 === level2)
        .map((row) => row.value);
      if (values.length === 0) empty.push(`${level1} x ${level2}`);
      cells.push(values);
    });
  });

  if (empty.length) {
    throw new Error(
      `Every combination of the two factors needs at least one observation. Missing: ${empty.join(', ')}.`
    );
  }

  return { cells, factor1Levels, factor2Levels };
};
