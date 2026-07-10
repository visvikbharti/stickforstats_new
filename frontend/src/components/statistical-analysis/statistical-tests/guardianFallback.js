/**
 * Guardian -> non-parametric hand-off for the in-page analysis hub.
 *
 * When Guardian reports a violated assumption it also names alternative tests.
 * Those names cannot be trusted as-is, because `_get_alternatives` in
 * backend/core/guardian/guardian_core.py keys off the *backend* test type, and
 * ParametricTests collapses three different designs -- one-sample, independent
 * and paired -- onto the single backend type `t_test`. So Guardian recommends
 * `mann_whitney`, an independent-samples test, even when the user chose a paired
 * design, and even for a one-sample design where no two groups exist at all.
 *
 * The design the user picked is the only thing that knows which rank test is
 * valid here, so the fallback is keyed on that. Guardian's rank-test suggestion
 * is corrected to match the design *before* it is ever rendered as a button, so
 * the button's label and the test it runs can never disagree.
 *
 * The non-parametric module spells its test ids with hyphens; Guardian uses
 * underscores. Both spellings are kept explicit rather than derived, so a
 * rename on either side fails a test instead of silently mis-routing.
 */

/**
 * Rank tests Guardian may suggest. Every one of these must be checked against
 * the design before it is offered, and none may be routed on its own name.
 */
export const RANK_TEST_SUGGESTIONS = new Set([
  'mann_whitney',
  'wilcoxon',
  'kruskal_wallis',
  'friedman',
]);

/**
 * The rank test that is valid for each design ParametricTests offers.
 *
 * `one-sample` is absent on purpose: the non-parametric module implements no
 * one-sample rank test (sign test / one-sample Wilcoxon), so there is nothing
 * to hand off to. Offering Mann-Whitney there, as Guardian currently does,
 * would be recommending a two-sample test for one sample.
 */
export const NP_FALLBACK_BY_DESIGN = {
  independent: {
    suggestionId: 'mann_whitney',
    moduleTest: 'mann-whitney',
    sourceLabel: 'independent-samples t-test',
  },
  paired: {
    suggestionId: 'wilcoxon',
    moduleTest: 'wilcoxon',
    sourceLabel: 'paired t-test',
  },
  anova: {
    suggestionId: 'kruskal_wallis',
    moduleTest: 'kruskal-wallis',
    sourceLabel: 'one-way ANOVA',
  },
};

/** Route the hand-off targets at the non-parametric module. */
export const NON_PARAMETRIC_ROUTE = '/modules/nonparametric-real';

const ALTERNATIVE_DISPLAY_NAMES = {
  bootstrap: 'Bootstrap Test',
  permutation_test: 'Permutation Test',
  permutation_anova: 'Permutation ANOVA',
  welch_t_test: "Welch's t-test",
  mann_whitney: 'Mann-Whitney U Test',
  wilcoxon: 'Wilcoxon Signed-Rank Test',
  kruskal_wallis: 'Kruskal-Wallis H Test',
  friedman: 'Friedman Test',
};

/** Human-readable name for a Guardian alternative id. */
export const displayNameFor = (alternativeId) =>
  ALTERNATIVE_DISPLAY_NAMES[alternativeId] ||
  String(alternativeId)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

/**
 * Rewrite Guardian's alternative list so it fits the design the user chose.
 *
 * Any rank test it names is replaced by the one rank test that is valid for
 * this design, then de-duplicated (an ANOVA report names both `kruskal_wallis`
 * and `friedman`, which collapse to a single entry). Non-rank suggestions
 * -- permutation, bootstrap, Welch -- are sound regardless of design and pass
 * through untouched. For a one-sample design every rank suggestion is dropped.
 */
export function correctAlternatives(alternatives, testType) {
  const fallback = NP_FALLBACK_BY_DESIGN[testType];
  const corrected = [];

  for (const alternative of Array.isArray(alternatives) ? alternatives : []) {
    let id = alternative;
    if (RANK_TEST_SUGGESTIONS.has(alternative)) {
      if (!fallback) continue; // one-sample: no valid rank test to offer
      id = fallback.suggestionId;
    }
    if (!corrected.includes(id)) corrected.push(id);
  }

  return corrected;
}

/**
 * Build the react-router `location.state` that NonParametricTestsRealProfessional
 * consumes, or null when this design/data cannot produce a runnable hand-off.
 *
 * Returning null rather than a partial payload matters: the module indexes
 * `dataGroups[0].values` and `dataGroups[1].values` directly for Mann-Whitney,
 * so a short array would throw on arrival rather than fail here.
 */
export function buildNonParametricHandoff({
  testType,
  columnData = [],
  columnData2 = [],
  groupedData = {},
}) {
  const fallback = NP_FALLBACK_BY_DESIGN[testType];
  if (!fallback) return null;

  const base = {
    fromGuardian: true,
    autoRun: true,
    selectedTest: fallback.moduleTest,
    datasetLabel: `Imported from your ${fallback.sourceLabel}`,
  };

  if (testType === 'paired') {
    if (columnData.length < 2) return null;
    if (columnData.length !== columnData2.length) return null;
    return { ...base, pairedData: { before: [...columnData], after: [...columnData2] } };
  }

  const dataGroups = Object.entries(groupedData).map(([name, values]) => ({
    name,
    values: [...values],
  }));

  if (testType === 'independent' && dataGroups.length !== 2) return null;
  if (testType === 'anova' && dataGroups.length < 2) return null;
  if (dataGroups.some((group) => group.values.length < 2)) return null;

  return { ...base, dataGroups };
}
