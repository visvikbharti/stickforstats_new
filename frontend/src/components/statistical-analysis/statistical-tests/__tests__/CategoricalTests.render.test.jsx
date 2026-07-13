/**
 * Regression test for the Categorical (chi-square) screen.
 *
 * Three bugs have shipped here, and a pure-math unit test would have caught none of them:
 *
 *  1. 6e5effd — the local chiSquareCDF summed the full Poisson mass for df <= 2, so 1 - 1 = 0
 *     and EVERY 2x2 / 2x3 table reported p = 0.0000 / "Significant".
 *  2. the fix for (1) declared chiSquareUpperTail as a component-scoped const BELOW the useMemo
 *     that calls it. useMemo runs synchronously during render, so the memo hit the temporal
 *     dead zone and the whole screen crashed with "Cannot access 'chiSquareUpperTail' before
 *     initialization" — the math was right but the component never rendered.
 *  3. and the deeper problem behind both: the test was being computed HERE, in the browser, in
 *     a hand-rolled incomplete gamma function that had to be kept correct by hand and wasn't.
 *
 * (3) is now fixed by deleting that implementation outright. The screen asks the backend, which
 * has one tested chi-square, checks the expected-count assumption, and reports a p-value that
 * cannot silently drift from the one the rest of the platform computes.
 *
 * So this test now renders the component with a STUBBED backend and proves two things a unit
 * test cannot: that whatever the backend says is what reaches the screen, and that the screen
 * does not quietly substitute a number of its own when the backend fails.
 */
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import CategoricalTests from '../CategoricalTests';

// --- keep the test on the component under test, not its heavy children ---
jest.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    BarChart: Stub, Bar: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub,
    Tooltip: Stub, Legend: Stub, ResponsiveContainer: Stub,
  };
});
jest.mock('../../../../services/GuardianService', () => ({
  __esModule: true,
  default: { checkAssumptions: jest.fn().mockResolvedValue(null) },
}));
jest.mock('../../../Guardian/GuardianWarning', () => () => <div data-testid="guardian-warning" />);
jest.mock('../../../VisualEvidence', () => () => <div />);
jest.mock('../../../common', () => ({ CodeExportPanel: () => <div /> }));
jest.mock('../../../statistical-debugger', () => ({ DebuggerPanel: () => <div /> }));
jest.mock('../../../../context/SettingsContext', () => ({
  useSettings: () => ({ expertMode: false }),
}));

// The backend. These are the real numbers scipy gives for the 2x2 table built below
// (chi2_contingency(correction=False)), which is what the live endpoint returns.
const chiSquareResponse = (statistic, pValue) => ({
  success: true,
  results: {
    test_name: 'Chi-square Test of Independence',
    test_statistic: String(statistic),
    p_value: String(pValue),
    degrees_of_freedom: 1,
    cramers_v: '0.06',
    phi_coefficient: '0.06',
    expected_frequencies: [[24.5, 25.5], [24.5, 25.5]],
    standardized_residuals: [[0.3, -0.3], [-0.3, 0.3]],
    assumptions_met: { expected_frequencies_ge_5: true },
    recommendations: [],
    interpretation: 'stub',
  },
});

const mockFetchOnce = (body, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => body,
  });
};

const buildRows = () => {
  const rows = [];
  const push = (group, a, n) => {
    for (let i = 0; i < n; i++) rows.push({ Group: group, Outcome_A: a });
  };
  push('Treatment', 'Improved', 26);
  push('Treatment', 'NotImproved', 24);
  push('Control', 'Improved', 23);
  push('Control', 'NotImproved', 27);
  return rows;
};

const selectByLabel = (labelText, optionText) => {
  const label = screen.getByText(labelText, { selector: 'label' });
  const control = label.closest('.MuiFormControl-root');
  fireEvent.mouseDown(within(control).getByRole('combobox'));
  const listbox = screen.getByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: optionText }));
};

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

describe('CategoricalTests renders the p-value the backend computed', () => {
  const rows = buildRows();

  it("shows the backend's non-significant p-value, and never 0.0000", async () => {
    mockFetchOnce(chiSquareResponse('0.3601', '0.5484'));

    render(<CategoricalTests data={rows} />);
    selectByLabel(/Variable 1/i, 'Group');
    selectByLabel(/Variable 2/i, 'Outcome_A');

    await waitFor(() => {
      expect(screen.getAllByText('0.5484').length).toBeGreaterThan(0);
    });
    // The bug this screen shipped with: p = 0.0000 on every table.
    expect(screen.queryByText('0.0000')).toBeNull();
    expect(screen.getAllByText(/Not Significant/i).length).toBeGreaterThan(0);
  });

  it("shows the backend's significant p-value for an associated table", async () => {
    mockFetchOnce(chiSquareResponse('5.7692', '0.0163'));

    render(<CategoricalTests data={rows} />);
    selectByLabel(/Variable 1/i, 'Group');
    selectByLabel(/Variable 2/i, 'Outcome_A');

    await waitFor(() => {
      expect(screen.getAllByText('0.0163').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Not Significant/i)).toBeNull();
  });

  it('shows an error, and NO p-value, when the backend fails', async () => {
    // The point of the whole exercise. When the server cannot compute the test, the screen
    // must say so -- not fall back to a number it worked out itself, which is exactly the
    // arrangement that let a wrong chi-square sit on this page undetected.
    mockFetchOnce({ error: 'boom' }, false);

    render(<CategoricalTests data={rows} />);
    selectByLabel(/Variable 1/i, 'Group');
    selectByLabel(/Variable 2/i, 'Outcome_A');

    await waitFor(() => {
      expect(screen.getAllByText(/could not be computed/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/^Significant$/i)).toBeNull();
    expect(screen.queryByText('0.0000')).toBeNull();
  });
});
