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
