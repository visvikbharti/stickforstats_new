/**
 * The genomics upload screen must say which scale the matrix is on (issue #31).
 *
 * The page used to POST csv_data, sample_groups, the group names and alpha -- and no input_scale --
 * so the API's default, "linear", was applied to every upload. On an already-log2 matrix that takes
 * log2 of a ratio of log-scale means, which is not a fold change (a true +2.79 was shown as +0.33).
 * These tests drive the real page against a stubbed backend and read the request it sends.
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

// A synthetic matrix of KNOWN fold changes: each treatment sample is an exact multiple k of the
// matching control sample, so the true log2 fold change is log2(k) on either scale.
const CONTROL = [80, 90, 100, 110, 120, 100];
const FOLDS = { UNCHANGED: 1, UP2: 2, UP4: 4, DOWN8: 0.125 };
const SAMPLES = [1, 2, 3, 4, 5, 6].map((i) => `ctrl_${i}`).concat(
  [1, 2, 3, 4, 5, 6].map((i) => `treat_${i}`)
);
const csvFor = (scale) =>
  [`gene,${SAMPLES.join(',')}`]
    .concat(
      Object.entries(FOLDS).map(([gene, k]) => {
        const values = CONTROL.concat(CONTROL.map((x) => k * x));
        return `${gene},${(scale === 'log2' ? values.map(Math.log2) : values).join(',')}`;
      })
    )
    .join('\n');

// What the backend returns: it echoes the scale it was given, as the real endpoint does.
const backendResponse = (inputScale) => ({
  summary: {
    n_genes: 4, n_samples: 12, n_group1: 6, n_group2: 6,
    group1_name: 'control', group2_name: 'treatment',
    n_significant: 0, n_cascaded: 0, fdr_method: 'benjamini_hochberg', alpha: 0.05,
    input_scale: inputScale,
  },
  gene_results: Object.entries(FOLDS).map(([gene, k]) => ({
    gene_name: gene, test_used: 't_test', statistic: 0, raw_p_value: 0.5, adjusted_p_value: 0.5,
    log2_fold_change: Math.log2(k), mean_group1: 100, mean_group2: 100 * k,
    guardian_confidence: 1, assumptions_passed: true, cascaded: false, violations: [],
    test_failed: false, test_failure_reason: '', significant: false,
  })),
  volcano_data: [],
  guardian_summary: {
    mean_confidence: 1, min_confidence: 1, n_genes_cascaded: 0, cascade_rate: 0,
    n_normality_violations: 0, n_variance_violations: 0,
  },
});

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn(async (_url, init) => ({
    ok: true,
    json: async () => backendResponse(JSON.parse(init.body).input_scale),
  }));
});
afterEach(() => {
  global.fetch = originalFetch;
});

const upload = async (csv) => {
  const file = new File([csv], 'matrix.csv', { type: 'text/csv' });
  fireEvent.change(screen.getByLabelText(/choose csv file/i), { target: { files: [file] } });
  // FileReader is asynchronous; under a loaded test run the step change can exceed the default
  // 1 s wait.
  await screen.findByText('Configure Groups', {}, { timeout: 5000 });
};

const runAnalysis = async () => {
  fireEvent.click(screen.getByRole('button', { name: /run differential expression/i }));
  await screen.findByTestId('results-input-scale', {}, { timeout: 5000 });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  return JSON.parse(global.fetch.mock.calls[0][1].body);
};

describe('Genomics upload screen: the input scale', () => {
  test('the upload screen offers the choice, with detection as the suggested default', () => {
    render(<GenomicsAnalysisPage />);
    const choice = screen.getByRole('radiogroup', { name: 'Scale of the expression values' });
    expect(within(choice).getByLabelText('Detect from the values (suggested)')).toBeChecked();
    expect(within(choice).getByLabelText('Linear: counts, CPM, TPM or intensities')).not.toBeChecked();
    expect(within(choice).getByLabelText('Already log2-transformed, e.g. log2(TPM + 1)')).not.toBeChecked();
  });

  test('a log2 matrix is detected, the assumption is shown, and the request says log2', async () => {
    render(<GenomicsAnalysisPage />);
    await upload(csvFor('log2'));

    const note = screen.getByTestId('input-scale-note');
    expect(note).toHaveTextContent('Assumed: already log2-transformed values');
    expect(note).toHaveTextContent('detected from your data');
    expect(note).toHaveTextContent('log2 fold change = mean(treatment) − mean(control)');

    const body = await runAnalysis();
    expect(body.input_scale).toBe('log2');
    expect(screen.getByTestId('results-input-scale')).toHaveTextContent(
      'Fold changes were computed for already log2-transformed values, detected from your data'
    );
  });

  test('a linear matrix is detected as linear and the request says linear', async () => {
    render(<GenomicsAnalysisPage />);
    await upload(csvFor('linear'));

    const note = screen.getByTestId('input-scale-note');
    expect(note).toHaveTextContent('Assumed: linear values (counts, CPM, TPM or intensities)');
    expect(note).toHaveTextContent('log2 fold change = log2(mean(treatment) / mean(control))');

    const body = await runAnalysis();
    expect(body.input_scale).toBe('linear');
  });

  test('an override is sent as chosen, with a warning when it contradicts the values', async () => {
    render(<GenomicsAnalysisPage />);
    await upload(csvFor('log2'));
    fireEvent.click(screen.getByLabelText('Linear: counts, CPM, TPM or intensities'));

    const note = screen.getByTestId('input-scale-note');
    expect(note).toHaveTextContent('Assumed: linear values (counts, CPM, TPM or intensities), as you chose');
    expect(note).toHaveTextContent('Check this choice: the values look like already log2-transformed values');

    const body = await runAnalysis();
    expect(body.input_scale).toBe('linear');
    expect(screen.getByTestId('results-input-scale')).toHaveTextContent('as you chose');
  });

  test('a choice the values contradict is still flagged on the results', async () => {
    render(<GenomicsAnalysisPage />);
    await upload(csvFor('log2'));
    fireEvent.click(screen.getByLabelText('Linear: counts, CPM, TPM or intensities'));

    await runAnalysis();
    expect(screen.getByTestId('results-input-scale')).toHaveTextContent(
      'as you chose, although the values looked like already log2-transformed values'
    );
  });

  test('New Analysis starts the next file from detection again', async () => {
    // A scale chosen for one file must not silently become the default for the next.
    render(<GenomicsAnalysisPage />);
    await upload(csvFor('log2'));
    fireEvent.click(screen.getByLabelText('Linear: counts, CPM, TPM or intensities'));
    await runAnalysis();

    fireEvent.click(screen.getByRole('button', { name: /new analysis/i }));
    expect(screen.getByLabelText('Detect from the values (suggested)')).toBeChecked();
    expect(screen.queryByText(/Loaded:/)).not.toBeInTheDocument();
  });

  test('the results describe the scale the backend says it used, not the one requested', async () => {
    // A backend that ignored input_scale would compute on its "linear" default. The results note
    // must report what was computed, not repeat what the page asked for.
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => backendResponse('linear') }));
    render(<GenomicsAnalysisPage />);
    await upload(csvFor('log2'));

    const body = await runAnalysis();
    expect(body.input_scale).toBe('log2');
    expect(screen.getByTestId('results-input-scale')).toHaveTextContent(
      'Fold changes were computed for linear values (counts, CPM, TPM or intensities), ' +
        'not the already log2-transformed values this page sent'
    );
  });

  test('when the scale cannot be detected, the analysis waits for the user to choose', async () => {
    render(<GenomicsAnalysisPage />);
    await upload('gene,ctrl_1,treat_1\nG1,NA,NA');

    expect(screen.getByTestId('input-scale-note')).toHaveTextContent('The scale could not be detected');
    const run = screen.getByRole('button', { name: /run differential expression/i });
    expect(run).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Already log2-transformed, e.g. log2(TPM + 1)'));
    expect(run).toBeEnabled();
  });
});
