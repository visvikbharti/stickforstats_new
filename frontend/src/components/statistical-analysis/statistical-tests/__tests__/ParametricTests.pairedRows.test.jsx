/**
 * The hub's paired t-test keeps the rows of the table.
 *
 * Each of the two columns was read by itself and its blank cells dropped. With one blank in each
 * column, in different rows, the test and the Guardian check were sent nine values per column, of
 * which four "pairs" joined the values of two different rows. Both now get the rows in which both
 * columns have a value, and the page says how many rows it left out.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import guardianService from '../../../../services/GuardianService';
import ParametricTests from '../ParametricTests';

jest.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    BarChart: Stub, Bar: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub,
    Legend: Stub, ResponsiveContainer: Stub, ErrorBar: Stub, ReferenceLine: Stub,
  };
});
jest.mock('../../../../services/GuardianService', () => ({
  __esModule: true,
  default: { checkAssumptions: jest.fn(), requestFor: () => undefined },
}));
jest.mock('../../../Guardian/TransformationWizard', () => () => null);
// The two panels under the result are handed the data of the test; what they are handed is recorded.
const mockPanels = [];
jest.mock('../../../common', () => ({
  ...jest.requireActual('../../../common'),
  CodeExportPanel: (props) => {
    mockPanels.push(['export', props.testType, props.data]);
    return null;
  },
}));
jest.mock('../../../statistical-debugger', () => ({
  DebuggerPanel: (props) => {
    mockPanels.push(['debugger', props.testType, props.data]);
    return null;
  },
}));
jest.mock('../../../VisualEvidence', () => () => <div />);
jest.mock('../../../../context/SettingsContext', () => ({
  useSettings: () => ({ expertMode: false, shouldBlockTest: () => true }),
}));

jest.setTimeout(20000);

// ten rows; the third has no "before" and the seventh has no "after"
const BEFORE = [5.1, 6.3, '', 4.4, 8.0, 5.5, 6.1, 7.7, 5.9, 6.6];
const AFTER = [5.4, 6.0, 7.5, 4.7, 8.3, 5.2, '', 8.1, 6.3, 6.5];
const rowsWithBlanks = BEFORE.map((before, i) => ({ before, after: AFTER[i] }));
const COMPLETE_BEFORE = [5.1, 6.3, 4.4, 8.0, 5.5, 7.7, 5.9, 6.6];
const COMPLETE_AFTER = [5.4, 6.0, 4.7, 8.3, 5.2, 8.1, 6.3, 6.5];

let ttestBodies;

beforeEach(() => {
  ttestBodies = [];
  mockPanels.length = 0;
  global.fetch = jest.fn(async (url, init) => {
    ttestBodies.push(JSON.parse(init.body));
    return {
      ok: true,
      json: async () => ({
        test_type: 'paired',
        high_precision_result: { t_statistic: '-1.1558', p_value: '0.2857', df: 7, mean_diff: '-0.1375', se: '0.119' },
      }),
    };
  });
  guardianService.checkAssumptions.mockImplementation(async () => ({
    can_proceed: true, violations: [], assumptions_checked: ['normality'], confidence_score: 1, alternative_tests: [],
  }));
});

afterEach(() => {
  delete global.fetch;
});

const choose = (index, optionName) => {
  fireEvent.mouseDown(screen.getAllByRole('combobox')[index]);
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: optionName }));
};

// Comboboxes in page order for a paired test: Test Type, Significance Level, First Column, Second Column.
const runPaired = (rows) => {
  render(
    <MemoryRouter>
      <ParametricTests data={rows} />
    </MemoryRouter>
  );
  choose(0, 'Paired Samples t-test');
  choose(2, 'before');
  choose(3, 'after');
};

test('the test and the Guardian check get the complete rows, and the page says how many it left out', async () => {
  runPaired(rowsWithBlanks);
  expect(
    await screen.findByText('2 rows were left out: in each, one of the two columns has no value. The paired test uses the 8 complete rows.')
  ).toBeInTheDocument();
  await waitFor(() => expect(ttestBodies.length).toBeGreaterThan(0));
  const body = ttestBodies[ttestBodies.length - 1];
  expect(body.test_type).toBe('paired');
  expect(body.data1).toEqual(COMPLETE_BEFORE);
  expect(body.data2).toEqual(COMPLETE_AFTER);
  await waitFor(() => expect(guardianService.checkAssumptions).toHaveBeenCalled());
  const calls = guardianService.checkAssumptions.mock.calls;
  const [checked, , , options] = calls[calls.length - 1];
  expect(checked).toEqual([COMPLETE_BEFORE, COMPLETE_AFTER]);
  expect(options).toEqual({ design: 'paired' });
  // no request was ever sent with each column's own nine values
  ttestBodies.forEach((sent) => expect(sent.data1).toHaveLength(8));
  // the code export and the debugger under the result are handed the same rows
  await screen.findByText('Paired Samples t-test Results');
  for (const panel of ['export', 'debugger']) {
    const handed = mockPanels.filter(([name, testType]) => name === panel && testType === 'paired_t_test');
    expect(handed.length).toBeGreaterThan(0);
    const [, , data] = handed[handed.length - 1];
    expect([data.values1, data.values2, data.n]).toEqual([COMPLETE_BEFORE, COMPLETE_AFTER, 8]);
  }
});

test('a complete table is sent as it is, with no such sentence', async () => {
  runPaired(COMPLETE_BEFORE.map((before, i) => ({ before, after: COMPLETE_AFTER[i] })));
  await waitFor(() => expect(ttestBodies.length).toBeGreaterThan(0));
  expect(ttestBodies[ttestBodies.length - 1].data1).toEqual(COMPLETE_BEFORE);
  expect(ttestBodies[ttestBodies.length - 1].data2).toEqual(COMPLETE_AFTER);
  expect(screen.queryByText(/left out/)).not.toBeInTheDocument();
});

test('columns of different lengths are run on their complete rows too', async () => {
  // the last row has no "after": before this, the page ran nothing and said nothing
  const rows = [...COMPLETE_BEFORE.map((before, i) => ({ before, after: COMPLETE_AFTER[i] })), { before: 7.0, after: '' }];
  runPaired(rows);
  expect(
    await screen.findByText('1 row was left out: one of its two columns has no value. The paired test uses the 8 complete rows.')
  ).toBeInTheDocument();
  await waitFor(() => expect(ttestBodies.length).toBeGreaterThan(0));
  expect(ttestBodies[ttestBodies.length - 1].data1).toEqual(COMPLETE_BEFORE);
});

test('the hand-off to the signed-rank test carries the complete rows', async () => {
  guardianService.checkAssumptions.mockImplementation(async () => ({
    can_proceed: false,
    confidence_score: 0.2,
    assumptions_checked: ['normality'],
    violations: [{
      assumption: 'normality', test_name: 'Shapiro-Wilk', severity: 'critical', p_value: 0.001, statistic: 0.7,
      message: 'Normality rejected in the differences.', recommendation: 'Use the Wilcoxon signed-rank test.',
    }],
    alternative_tests: ['wilcoxon'],
  }));
  const Arrived = () => <div data-testid="handed-over">{JSON.stringify(useLocation().state?.pairedData)}</div>;
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ParametricTests data={rowsWithBlanks} />} />
        <Route path="/modules/nonparametric-real" element={<Arrived />} />
      </Routes>
    </MemoryRouter>
  );
  choose(0, 'Paired Samples t-test');
  choose(2, 'before');
  choose(3, 'after');
  fireEvent.click(await screen.findByRole('button', { name: /View Alternatives/ }));
  fireEvent.click(screen.getByRole('button', { name: /Wilcoxon/i }));
  const arrived = await screen.findByTestId('handed-over');
  expect(JSON.parse(arrived.textContent)).toEqual({ before: COMPLETE_BEFORE, after: COMPLETE_AFTER });
});
