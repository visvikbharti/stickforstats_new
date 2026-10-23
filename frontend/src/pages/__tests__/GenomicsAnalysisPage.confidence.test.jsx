/**
 * Every "confidence" on the genomics results is defined where it appears (issue #31 item 6): the
 * Mean Confidence card, Min Confidence, the Guardian column and each gene's percentage.
 *
 * The expected text is written out here rather than imported, so the test fails if the wording
 * changes. The percentages it quotes are pinned to the backend formula by
 * backend/tests/test_genomics_confidence_definition.py.
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

const DEFINITION =
  "Confidence is Guardian's assumption-check score for a gene, not a probability and not a " +
  'confidence level. It is 100% when every check that ran passed: Shapiro-Wilk normality in ' +
  "each group of 3 or more samples, and Levene's test of equal variances, both at α = 0.05. " +
  'Each failed or uncomputable check lowers it: one failure at 0.01 ≤ p < 0.05, or one check ' +
  'that could not be computed, gives 81%; one failure at p < 0.01 gives 72%; the lowest ' +
  'possible score is 17%.';

const RESPONSE = {
  summary: {
    n_genes: 2, n_samples: 4, n_group1: 2, n_group2: 2, group1_name: 'control',
    group2_name: 'treatment', n_significant: 0, n_cascaded: 1, fdr_method: 'benjamini_hochberg',
    alpha: 0.05, input_scale: 'log2',
  },
  gene_results: [
    { gene_name: 'CLEAN', test_used: 't_test', cascaded: false, guardian_confidence: 1 },
    { gene_name: 'ONE_MILD', test_used: 'welch_t_test', cascaded: true, guardian_confidence: 0.8148 },
  ].map((g) => ({
    statistic: 1, raw_p_value: 0.2, adjusted_p_value: 0.3, log2_fold_change: 1, mean_group1: 5,
    mean_group2: 6, assumptions_passed: !g.cascaded, violations: [], test_failed: false,
    test_failure_reason: '', significant: false, ...g,
  })),
  volcano_data: [],
  guardian_summary: {
    mean_confidence: 0.9074, min_confidence: 0.8148, n_genes_cascaded: 1, cascade_rate: 0.5,
    n_normality_violations: 0, n_variance_violations: 1,
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

test('the Guardian Summary says what confidence is', async () => {
  await showResults();
  expect(screen.getByTestId('confidence-definition')).toHaveTextContent(DEFINITION);
});

test('Mean Confidence and Min Confidence say what they summarise', async () => {
  await showResults();
  expect(screen.getByTestId('mean-confidence-definition')).toHaveTextContent(
    'Average of the per-gene confidence scores over all genes, including genes whose test gave no p-value.'
  );
  expect(screen.getByTestId('min-confidence-definition')).toHaveTextContent(
    'Lowest per-gene confidence score. With two groups it cannot fall below 16.7%.'
  );
});

test('the Guardian column explains its percentage and its check mark', async () => {
  await showResults();
  expect(screen.getByTestId('guardian-column-definition')).toHaveTextContent(
    "Guardian column: the gene's confidence score. ✓ marks 80% or more, meaning no check failed, " +
      'or one failed at 0.01 ≤ p < 0.05 or could not be computed, so the gene may still have been ' +
      "switched to Welch's t-test or Mann-Whitney U. ⚠ marks less than 80%."
  );
});

test("each gene's percentage says what it is, and where it is defined", async () => {
  await showResults();
  const note = ": Guardian's assumption-check score, not a probability (defined under Guardian Summary)";
  expect(screen.getByLabelText(`Confidence 81%${note}`)).toHaveTextContent('81%');
  expect(screen.getByLabelText(`Confidence 100%${note}`)).toHaveTextContent('100%');
});
