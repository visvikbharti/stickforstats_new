/**
 * The Guardian Summary alert and the page header must not describe every switched gene as a
 * Mann-Whitney / normality case (same defect as issue #31 item 2, in two more places).
 *
 * The alert fires on guardian_summary.cascade_rate, which counts EVERY switch away from Student's
 * t-test -- Welch's included -- and then said "Over 50% of genes failed normality checks. Guardian
 * automatically used Mann-Whitney U test for these genes". Fed one gene per route, that claimed a
 * majority failed normality when one gene in three had.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import GenomicsAnalysisPage from '../GenomicsAnalysisPage';

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

const gene = (name, testUsed) => ({
  gene_name: name, test_used: testUsed, cascaded: testUsed !== 't_test', statistic: 1,
  raw_p_value: 0.2, adjusted_p_value: 0.3, log2_fold_change: 1, mean_group1: 5, mean_group2: 6,
  guardian_confidence: 1, assumptions_passed: testUsed === 't_test', violations: [],
  test_failed: false, test_failure_reason: '', significant: false,
});

const responseFor = (tests) => {
  const genes = tests.map((t, i) => gene(`G${i + 1}`, t));
  const nCascaded = genes.filter((g) => g.cascaded).length;
  return {
    summary: {
      n_genes: genes.length, n_samples: 4, n_group1: 2, n_group2: 2, group1_name: 'control',
      group2_name: 'treatment', n_significant: 0, n_cascaded: nCascaded,
      fdr_method: 'benjamini_hochberg', alpha: 0.05, input_scale: 'log2',
    },
    gene_results: genes,
    volcano_data: [],
    guardian_summary: {
      mean_confidence: 1, min_confidence: 1, n_genes_cascaded: nCascaded,
      cascade_rate: nCascaded / genes.length,
      n_normality_violations: tests.filter((t) => t === 'mann_whitney').length,
      n_variance_violations: tests.filter((t) => t === 'welch_t_test').length,
    },
  };
};

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

const showResults = async (tests) => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => responseFor(tests) }));
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

test('the alert counts each switch by the test it went to', async () => {
  await showResults(['t_test', 'welch_t_test', 'mann_whitney']);
  const alert = screen.getByTestId('cascade-alert');
  expect(alert).toHaveTextContent(
    "Guardian switched 2 of 3 genes away from Student's t-test: " +
      '1 to Mann-Whitney U (nonparametric), because normality was rejected or could not be ' +
      "checked; 1 to Welch's t-test (unequal variances), because the equal-variance check " +
      'failed or could not be computed.'
  );
  expect(alert).not.toHaveTextContent(/failed normality checks/i);
});

test('a cascade made only of Welch switches says nothing about normality or Mann-Whitney', async () => {
  // With two samples per group almost every gene goes to Welch: Levene's test is degenerate there
  // (scipy returns F = inf, p = 0 when the spreads differ, NaN when they are equal).
  await showResults(['welch_t_test', 'welch_t_test', 'welch_t_test']);
  const alert = screen.getByTestId('cascade-alert');
  expect(alert).toHaveTextContent("Guardian switched 3 of 3 genes away from Student's t-test: 3 to Welch's t-test");
  expect(alert).not.toHaveTextContent(/Mann-Whitney|normality/i);
});

test('the page header names both switches', () => {
  render(<GenomicsAnalysisPage />);
  expect(
    screen.getByText(/genes failing only the equal-variance check with Welch's t-test/)
  ).toHaveTextContent(
    "Instead of Student's t-test, genes failing normality are tested with Mann-Whitney U, and " +
      "genes failing only the equal-variance check with Welch's t-test."
  );
});
