/**
 * The test chip's tooltip names the switch Guardian actually made (issue #31 item 2).
 *
 * The backend marks a gene `cascaded` when Guardian switches it away from Student's t-test: to
 * Welch's t-test when the variances differ, or to Mann-Whitney U when normality fails. The tooltip
 * said "Guardian cascaded to nonparametric" for every cascaded gene -- but Welch's t-test is
 * parametric, so every gene switched for unequal variances was described wrongly.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import GenomicsAnalysisPage from '../GenomicsAnalysisPage';
import { describeTestUsed } from '../../utils/genomicsTestUsed';

// Each test renders the whole page and waits on its data flow (FileReader, mocked API) for up to
// 5 s per step. Jest's default budget is 5 s for the whole test, which ran out under a loaded
// full-suite run ("Exceeded timeout of 5000 ms"), and CI runners can be slower.
jest.setTimeout(20000);

jest.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    ScatterChart: Stub, Scatter: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub,
    Tooltip: Stub, ResponsiveContainer: Stub, ReferenceLine: Stub, Cell: Stub,
  };
});

// The three two-group routes the backend's _test_two_groups can take.
const gene = (name, testUsed, cascaded) => ({
  gene_name: name, test_used: testUsed, cascaded, statistic: 1, raw_p_value: 0.2,
  adjusted_p_value: 0.3, log2_fold_change: 1, mean_group1: 5, mean_group2: 6,
  guardian_confidence: cascaded ? 0.8148 : 1, assumptions_passed: !cascaded, violations: [],
  test_failed: false, test_failure_reason: '', significant: false,
});

const RESPONSE = {
  summary: {
    n_genes: 3, n_samples: 4, n_group1: 2, n_group2: 2, group1_name: 'control',
    group2_name: 'treatment', n_significant: 0, n_cascaded: 2, fdr_method: 'benjamini_hochberg',
    alpha: 0.05, input_scale: 'log2',
  },
  gene_results: [
    gene('STUDENT', 't_test', false),
    gene('WELCH', 'welch_t_test', true),
    gene('MANNWHITNEY', 'mann_whitney', true),
  ],
  volcano_data: [],
  guardian_summary: {
    mean_confidence: 0.8765, min_confidence: 0.8148, n_genes_cascaded: 2, cascade_rate: 0.6667,
    n_normality_violations: 1, n_variance_violations: 1,
  },
};

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => RESPONSE }));
});
afterEach(() => {
  global.fetch = originalFetch;
});

const showResults = async () => {
  render(<GenomicsAnalysisPage />);
  const csv = 'gene,ctrl_1,ctrl_2,treat_1,treat_2\nG1,5,6,7,8';
  fireEvent.change(screen.getByLabelText(/choose csv file/i), {
    target: { files: [new File([csv], 'matrix.csv', { type: 'text/csv' })] },
  });
  // FileReader is asynchronous; under a loaded test run the step change can exceed the default
  // 1 s wait.
  fireEvent.click(
    await screen.findByRole('button', { name: /run differential expression/i }, { timeout: 5000 })
  );
  await screen.findByText(/Gene Results/, {}, { timeout: 5000 });
};

describe('describeTestUsed', () => {
  test.each([
    ['t_test', false, "Student's t-test (parametric)"],
    ['welch_t_test', true, "Guardian switched to Welch's t-test (unequal variances)"],
    ['mann_whitney', true, 'Guardian switched to Mann-Whitney U (nonparametric)'],
    ['anova', false, 'One-way ANOVA (parametric)'],
    ['kruskal_wallis', true, 'Guardian switched to Kruskal-Wallis (nonparametric)'],
  ])('%s (cascaded=%s) -> %s', (testUsed, cascaded, expected) => {
    expect(describeTestUsed({ test_used: testUsed, cascaded })).toBe(expected);
  });

  test('a test it does not know is named as the backend named it, not guessed at', () => {
    expect(describeTestUsed({ test_used: 'some_new_test', cascaded: true })).toBe(
      'Guardian switched to some_new_test'
    );
  });
});

describe('the results table tooltip', () => {
  test('a gene switched for unequal variances is named as Welch, not as nonparametric', async () => {
    await showResults();
    // MUI opens a Tooltip on mouseover of its child. (@testing-library/user-event is installed but
    // cannot load here: its peer @testing-library/dom is only nested under @testing-library/react.)
    fireEvent.mouseOver(screen.getByText('welch_t_test'));
    expect(await screen.findByRole('tooltip', {}, { timeout: 5000 })).toHaveTextContent(
      "Guardian switched to Welch's t-test (unequal variances)"
    );
  });

  test('each chip is labelled with the test that ran', async () => {
    await showResults();
    expect(screen.getByLabelText("Student's t-test (parametric)")).toHaveTextContent('t_test');
    expect(
      screen.getByLabelText("Guardian switched to Welch's t-test (unequal variances)")
    ).toHaveTextContent('welch_t_test');
    expect(
      screen.getByLabelText('Guardian switched to Mann-Whitney U (nonparametric)')
    ).toHaveTextContent('mann_whitney');
    expect(screen.queryByLabelText(/cascaded to nonparametric/i)).not.toBeInTheDocument();
  });
});
