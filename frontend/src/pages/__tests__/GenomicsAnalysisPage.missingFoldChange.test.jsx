/**
 * A gene with no defined fold change must not white-screen the results table.
 *
 * On a linear scale log2(mean2 / mean1) does not exist when a group mean is 0, so the backend
 * returns log2_fold_change: null for such genes (rather than the fabricated -33.2 an epsilon clamp
 * used to give them). The table then called null.toFixed(2), which threw during render and
 * unmounted the page -- for any upload of counts in which a gene was unexpressed in one group.
 * Missing p-values were made null-safe the same way earlier (2ba7c28).
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

const gene = (name, log2FoldChange, meanGroup1) => ({
  gene_name: name, test_used: 'mann_whitney', cascaded: true, statistic: 0, raw_p_value: 0.002,
  adjusted_p_value: 0.004, log2_fold_change: log2FoldChange, mean_group1: meanGroup1,
  mean_group2: 40, guardian_confidence: 0.7222, assumptions_passed: false, violations: [],
  test_failed: false, test_failure_reason: '', significant: true,
});

const RESPONSE = {
  summary: {
    n_genes: 2, n_samples: 4, n_group1: 2, n_group2: 2, group1_name: 'control',
    group2_name: 'treatment', n_significant: 2, n_cascaded: 2, fdr_method: 'benjamini_hochberg',
    alpha: 0.05, input_scale: 'linear',
  },
  // UNEXPRESSED has a control mean of 0: on a linear scale its fold change does not exist.
  gene_results: [gene('UNEXPRESSED', null, 0), gene('UP', 2, 10)],
  volcano_data: [],
  guardian_summary: {
    mean_confidence: 0.7222, min_confidence: 0.7222, n_genes_cascaded: 2, cascade_rate: 1,
    n_normality_violations: 2, n_variance_violations: 0,
  },
};

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => RESPONSE }));
});
afterEach(() => {
  global.fetch = originalFetch;
});

test('a gene whose fold change is undefined shows a dash, and the table still renders', async () => {
  render(<GenomicsAnalysisPage />);
  const csv = 'gene,ctrl_1,ctrl_2,treat_1,treat_2\nUNEXPRESSED,0,0,35,45\nUP,8,12,35,45';
  fireEvent.change(screen.getByLabelText(/choose csv file/i), {
    target: { files: [new File([csv], 'counts.csv', { type: 'text/csv' })] },
  });
  // FileReader is asynchronous; under a loaded test run the step change can exceed the default
  // 1 s wait.
  fireEvent.click(
    await screen.findByRole('button', { name: /run differential expression/i }, { timeout: 5000 })
  );
  await screen.findByText(/Gene Results/, {}, { timeout: 5000 });

  const unexpressed = screen.getByRole('row', { name: /UNEXPRESSED/ });
  expect(within(unexpressed).getByText('—')).toBeInTheDocument();
  const up = screen.getByRole('row', { name: /^UP / });
  expect(within(up).getByText('+2.00')).toBeInTheDocument();
});
