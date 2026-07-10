import {
  NON_PARAMETRIC_ROUTE,
  NP_FALLBACK_BY_DESIGN,
  buildNonParametricHandoff,
  correctAlternatives,
  displayNameFor,
} from '../guardianFallback';

/**
 * The exact lists `_get_alternatives` returns in
 * backend/core/guardian/guardian_core.py. It returns `list(set(...))`, so the
 * order is not stable -- nothing here may depend on it.
 */
const GUARDIAN_T_TEST_ALTERNATIVES = ['mann_whitney', 'permutation_test', 'bootstrap'];
const GUARDIAN_ANOVA_ALTERNATIVES = ['kruskal_wallis', 'friedman', 'permutation_anova'];

describe('correctAlternatives', () => {
  it('leaves the independent design alone -- Mann-Whitney is already right', () => {
    expect(correctAlternatives(GUARDIAN_T_TEST_ALTERNATIVES, 'independent')).toEqual([
      'mann_whitney',
      'permutation_test',
      'bootstrap',
    ]);
  });

  it('substitutes Wilcoxon for Mann-Whitney on a paired design', () => {
    // Guardian maps paired onto `t_test` and so names an independent-samples
    // test. Offering it on paired data would be recommending the wrong test.
    const corrected = correctAlternatives(GUARDIAN_T_TEST_ALTERNATIVES, 'paired');
    expect(corrected).toEqual(['wilcoxon', 'permutation_test', 'bootstrap']);
    expect(corrected).not.toContain('mann_whitney');
  });

  it('offers no rank test at all for a one-sample design', () => {
    // The non-parametric module has no one-sample rank test to hand off to.
    expect(correctAlternatives(GUARDIAN_T_TEST_ALTERNATIVES, 'one-sample')).toEqual([
      'permutation_test',
      'bootstrap',
    ]);
  });

  it('collapses kruskal_wallis + friedman to the one test valid for one-way ANOVA', () => {
    // Friedman is a repeated-measures test; the hub's ANOVA is between-subjects.
    const corrected = correctAlternatives(GUARDIAN_ANOVA_ALTERNATIVES, 'anova');
    expect(corrected).toEqual(['kruskal_wallis', 'permutation_anova']);
    expect(corrected).not.toContain('friedman');
  });

  it('passes Welch through -- it is design-agnostic advice', () => {
    expect(correctAlternatives([...GUARDIAN_T_TEST_ALTERNATIVES, 'welch_t_test'], 'independent')).toContain(
      'welch_t_test'
    );
  });

  it('does not depend on the order the backend happens to emit', () => {
    const reversed = [...GUARDIAN_ANOVA_ALTERNATIVES].reverse();
    expect(new Set(correctAlternatives(reversed, 'anova'))).toEqual(
      new Set(correctAlternatives(GUARDIAN_ANOVA_ALTERNATIVES, 'anova'))
    );
  });

  it('survives a missing or malformed alternatives field', () => {
    expect(correctAlternatives(undefined, 'anova')).toEqual([]);
    expect(correctAlternatives(null, 'anova')).toEqual([]);
    expect(correctAlternatives([], 'anova')).toEqual([]);
  });

  it('normalizes the design-aware backend ids to the routable rank test', () => {
    // The design-aware backend now emits wilcoxon_signed_rank (paired /
    // one-sample) and sign_test; these must map to the design's routable id so
    // the button reaches the non-parametric module instead of dead-ending.
    expect(correctAlternatives(['wilcoxon_signed_rank', 'permutation_test', 'bootstrap'], 'paired')).toEqual([
      'wilcoxon',
      'permutation_test',
      'bootstrap',
    ]);
    // One-sample still has no runnable rank test, so both rank ids drop out.
    expect(correctAlternatives(['wilcoxon_signed_rank', 'sign_test', 'bootstrap'], 'one-sample')).toEqual([
      'bootstrap',
    ]);
  });

  it('never emits a rank test the module cannot run', () => {
    const runnable = new Set(Object.values(NP_FALLBACK_BY_DESIGN).map((f) => f.suggestionId));
    const everything = [...GUARDIAN_T_TEST_ALTERNATIVES, ...GUARDIAN_ANOVA_ALTERNATIVES, 'welch_t_test'];
    const rankTestsOffered = [];
    for (const design of ['one-sample', 'independent', 'paired', 'anova']) {
      for (const id of correctAlternatives(everything, design)) {
        if (id.includes('whitney') || id.includes('wilcoxon') || id.includes('kruskal') || id.includes('friedman')) {
          rankTestsOffered.push(id);
        }
      }
    }
    expect(rankTestsOffered.every((id) => runnable.has(id))).toBe(true);
  });
});

describe('buildNonParametricHandoff', () => {
  const groupedData = { Control: [1, 2, 3, 4], Treated: [5, 6, 7, 8] };

  it('routes an independent design to Mann-Whitney with both groups', () => {
    const handoff = buildNonParametricHandoff({ testType: 'independent', groupedData });
    expect(handoff).toEqual({
      fromGuardian: true,
      autoRun: true,
      selectedTest: 'mann-whitney',
      datasetLabel: 'Imported from your independent-samples t-test',
      dataGroups: [
        { name: 'Control', values: [1, 2, 3, 4] },
        { name: 'Treated', values: [5, 6, 7, 8] },
      ],
    });
  });

  it('preserves the real group names rather than inventing "Group 1"', () => {
    const handoff = buildNonParametricHandoff({ testType: 'anova', groupedData });
    expect(handoff.dataGroups.map((g) => g.name)).toEqual(['Control', 'Treated']);
    expect(handoff.selectedTest).toBe('kruskal-wallis');
  });

  it('routes a paired design to Wilcoxon with before/after', () => {
    const handoff = buildNonParametricHandoff({
      testType: 'paired',
      columnData: [1, 2, 3],
      columnData2: [4, 5, 6],
    });
    expect(handoff.selectedTest).toBe('wilcoxon');
    expect(handoff.pairedData).toEqual({ before: [1, 2, 3], after: [4, 5, 6] });
    expect(handoff.dataGroups).toBeUndefined();
  });

  it('refuses a one-sample design -- there is no target test', () => {
    expect(buildNonParametricHandoff({ testType: 'one-sample', columnData: [1, 2, 3] })).toBeNull();
  });

  it('refuses ragged paired columns rather than sending them', () => {
    expect(
      buildNonParametricHandoff({ testType: 'paired', columnData: [1, 2, 3], columnData2: [4, 5] })
    ).toBeNull();
  });

  it('refuses an independent design that is not exactly two groups', () => {
    // performTest() indexes dataGroups[1].values directly; one group would throw there.
    expect(buildNonParametricHandoff({ testType: 'independent', groupedData: { A: [1, 2] } })).toBeNull();
    expect(
      buildNonParametricHandoff({
        testType: 'independent',
        groupedData: { A: [1, 2], B: [3, 4], C: [5, 6] },
      })
    ).toBeNull();
  });

  it('refuses any group with fewer than two values', () => {
    expect(
      buildNonParametricHandoff({ testType: 'anova', groupedData: { A: [1, 2], B: [3] } })
    ).toBeNull();
  });

  it('accepts a two-group ANOVA (Kruskal-Wallis is defined for k=2)', () => {
    expect(buildNonParametricHandoff({ testType: 'anova', groupedData }).dataGroups).toHaveLength(2);
  });

  it('copies the arrays so the module cannot mutate the hub state', () => {
    const source = { A: [1, 2], B: [3, 4] };
    const handoff = buildNonParametricHandoff({ testType: 'independent', groupedData: source });
    handoff.dataGroups[0].values.push(999);
    expect(source.A).toEqual([1, 2]);
  });

  it('emits exactly the shape NonParametricTestsRealProfessional reads', () => {
    const handoff = buildNonParametricHandoff({ testType: 'independent', groupedData });
    // The module gates on `fromGuardian`, aligns on `selectedTest`, then runs.
    expect(handoff.fromGuardian).toBe(true);
    expect(handoff.autoRun).toBe(true);
    expect(handoff.dataGroups[0].values).toEqual(expect.any(Array));
    expect(handoff.dataGroups[1].values).toEqual(expect.any(Array));
  });
});

describe('wiring constants', () => {
  it('targets the route the non-parametric module is mounted at', () => {
    expect(NON_PARAMETRIC_ROUTE).toBe('/modules/nonparametric-real');
  });

  it('spells module test ids with hyphens and Guardian ids with underscores', () => {
    for (const fallback of Object.values(NP_FALLBACK_BY_DESIGN)) {
      expect(fallback.moduleTest).not.toContain('_');
      expect(fallback.suggestionId).not.toContain('-');
    }
  });

  it('names the tests the way a statistician would', () => {
    expect(displayNameFor('mann_whitney')).toBe('Mann-Whitney U Test');
    expect(displayNameFor('welch_t_test')).toBe("Welch's t-test");
    expect(displayNameFor('something_new')).toBe('Something New');
  });
});
