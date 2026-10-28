/**
 * Welch's t-test on the Parametric tab, on the demo file.
 *
 * Guardian blocks the independent t-test on fixtures/guardian_demo_long.csv (Levene's
 * p = 5.5e-5) and recommends welch_t_test, which this screen could not run: the button
 * only said so. Welch's is now a test type of its own. The server's answers below are the
 * real responses for this file (fixtures/welchDemoResponses.json).
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import guardianService from '../../../../services/GuardianService';
import ParametricTests from '../ParametricTests';
import captured from './fixtures/welchDemoResponses.json';

jest.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    BarChart: Stub, Bar: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub,
    Legend: Stub, ResponsiveContainer: Stub, ErrorBar: Stub, ReferenceLine: Stub,
  };
});
jest.mock('../../../../services/GuardianService', () => ({
  __esModule: true,
  default: { checkAssumptions: jest.fn() },
}));
jest.mock('../../../Guardian/TransformationWizard', () => () => null);
jest.mock('../../../VisualEvidence', () => () => <div />);
jest.mock('../../../../context/SettingsContext', () => ({
  useSettings: () => ({ expertMode: false, shouldBlockTest: () => true }),
}));

jest.setTimeout(20000);

const demoRows = fs
  .readFileSync(path.join(__dirname, 'fixtures', 'guardian_demo_long.csv'), 'utf8')
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => {
    const [group, measurement] = line.split(',');
    return { group, measurement: Number(measurement) };
  });

const valuesOf = (group) => demoRows.filter((r) => r.group === group).map((r) => r.measurement);

let ttestBodies;

beforeEach(() => {
  ttestBodies = [];
  global.fetch = jest.fn(async (url, init) => {
    const body = JSON.parse(init.body);
    ttestBodies.push(body);
    const payload = body.equal_variance === false ? captured.ttest_welch : captured.ttest_student;
    return { ok: true, json: async () => payload };
  });
  guardianService.checkAssumptions.mockImplementation(async (data, testType) =>
    testType === 'welch_t_test' ? captured.guardian_welch_t_test : captured.guardian_t_test
  );
});

afterEach(() => {
  delete global.fetch;
});

// Comboboxes in page order: Test Type, Significance Level, Data Column, Group Column.
const combobox = (index) => screen.getAllByRole('combobox')[index];

const choose = (index, optionName) => {
  fireEvent.mouseDown(combobox(index));
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: optionName }));
};

const runOnDemoFile = (testName) => {
  render(
    <MemoryRouter>
      <ParametricTests data={demoRows} />
    </MemoryRouter>
  );
  choose(0, testName);
  choose(2, 'measurement');
  choose(3, 'group');
};

/** The cells of the table row whose first cell reads `firstCell`. */
const rowCells = (firstCell) => {
  const row = screen
    .getAllByRole('row')
    .find((r) => within(r).queryAllByRole('cell')[0]?.textContent === firstCell);
  if (!row) throw new Error(`no row starting "${firstCell}"`);
  return within(row).getAllByRole('cell').map((cell) => cell.textContent);
};

test("Welch's t-test is listed directly below the Independent Samples t-test", () => {
  render(
    <MemoryRouter>
      <ParametricTests data={demoRows} />
    </MemoryRouter>
  );
  fireEvent.mouseDown(combobox(0));
  const names = within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent);
  expect(names[names.indexOf('Independent Samples t-test') + 1]).toBe("Welch's t-test (unequal variances)");
});

test("Welch's t-test shows the demo file's numbers, Treatment minus Control", async () => {
  runOnDemoFile("Welch's t-test (unequal variances)");

  expect(await screen.findByText("Welch's t-test Results")).toBeInTheDocument();
  expect(rowCells('Treatment')).toEqual(['Treatment', '10', '91.6300', '17.0081']);
  expect(rowCells('Control')).toEqual(['Control', '40', '98.9725', '5.9235']);
  expect(rowCells('Mean Difference (Treatment − Control)')[1]).toBe('-7.3425');
  expect(rowCells('95% CI of the Difference')[1]).toBe('[-19.585, 4.900]');
  expect(rowCells('Standard Error')[1]).toBe('5.4594');
  expect(rowCells('t-statistic')[1]).toBe('-1.3449');
  expect(rowCells('Degrees of Freedom (Welch–Satterthwaite)')[1]).toBe('9.5521');
  expect(rowCells('p-value')[1]).toBe('0.2097');
  expect(rowCells("Cohen's d*")[1]).toBe('-0.577');
  expect(screen.getByText("Welch's t-test: t(9.55) = -1.34, p = 0.2097")).toBeInTheDocument();

  // The page asked for Welch's, with the groups in the order the independent test uses.
  const welchRequest = ttestBodies.find((b) => b.equal_variance === false);
  expect(welchRequest).toMatchObject({ test_type: 'two_sample', data1: valuesOf('Treatment'), data2: valuesOf('Control') });
});

test("Guardian checks Welch's as itself, and its variance check is information, not a violation", async () => {
  runOnDemoFile("Welch's t-test (unequal variances)");

  expect(await screen.findByText("Welch's t-test Results")).toBeInTheDocument();
  expect(guardianService.checkAssumptions).toHaveBeenLastCalledWith(
    { Treatment: valuesOf('Treatment'), Control: valuesOf('Control') },
    'welch_t_test',
    0.05,
    { design: 'independent' }
  );
  const info = screen.getAllByRole('alert').find((a) => /Variance check \(information only\)/.test(a.textContent));
  expect(info).toHaveTextContent("Welch's test does not assume equal variances. Levene's Test: p = 5.52e-5.");
  expect(screen.queryByText(/Test Execution Blocked/)).not.toBeInTheDocument();
});

test('the independent t-test is unchanged: Student, checked as t_test, and still blocked', async () => {
  runOnDemoFile('Independent Samples t-test');

  expect(await screen.findByText(/Test Execution Blocked/)).toBeInTheDocument();
  expect(guardianService.checkAssumptions).toHaveBeenLastCalledWith(expect.anything(), 't_test', 0.05, { design: 'independent' });
  await waitFor(() => expect(ttestBodies.length).toBeGreaterThan(0));
  ttestBodies.forEach((body) => expect(body).not.toHaveProperty('equal_variance'));
  expect(screen.queryByText(/Variance check \(information only\)/)).not.toBeInTheDocument();
  expect(screen.queryByText("Welch's t-test Results")).not.toBeInTheDocument();
});

test("the Welch T Test recommendation switches to Welch's and keeps the columns", async () => {
  runOnDemoFile('Independent Samples t-test');
  expect(await screen.findByText(/Test Execution Blocked/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /View Alternatives/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Welch T Test' }));

  expect(await screen.findByText("Welch's t-test Results")).toBeInTheDocument();
  expect(combobox(0)).toHaveTextContent("Welch's t-test (unequal variances)");
  expect(combobox(2)).toHaveTextContent('measurement');
  expect(combobox(3)).toHaveTextContent('group');
  expect(rowCells('t-statistic')[1]).toBe('-1.3449');
  expect(screen.queryByText(/Test Execution Blocked/)).not.toBeInTheDocument();
  expect(screen.queryByText(/this screen cannot run it/)).not.toBeInTheDocument();
});

test("the code export and the debugger render for Welch's", async () => {
  runOnDemoFile("Welch's t-test (unequal variances)");
  expect(await screen.findByText("Welch's t-test Results")).toBeInTheDocument();

  expect(screen.getByText(/t\.test\(group1, group2, var\.equal = FALSE/)).toBeInTheDocument();
  expect(screen.getByText(/Common Pitfalls for Welch's t-Test/)).toBeInTheDocument();
});
