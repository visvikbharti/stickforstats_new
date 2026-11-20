/**
 * /modules/t-test-real, paired test: a blank entry does not move the values after it.
 *
 * The page dropped every blank from each sample by itself and sent what was left. With one blank
 * in each sample, at different positions, nine "pairs" were sent of which four joined the values
 * of two different rows, and the page showed their t-test. It now sends the rows in which both
 * samples have a value and says how many rows it left out.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import TTestRealBackend from '../TTestRealBackend';

// No assertion of this file races a clock. The request is answered by a promise that is already
// resolved, so what the page shows next is there after one turn of the event loop: `settle` waits
// for that turn, however long the machine takes over it, and the assertions then look once. The
// file used to poll with the library's one-second deadline inside Jest's five-second budget, and
// its first test, which also pays for the first render of the page, ran out of that budget once
// on a busy machine.
jest.setTimeout(10 * 60 * 1000);

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const mockRequests = [];

jest.mock('../../services/HighPrecisionStatisticalService', () => ({
  // A plain class: CRA's resetMocks would clear a jest.fn implementation defined here.
  HighPrecisionStatisticalService: class {
    performTTest(request) {
      mockRequests.push(request);
      return Promise.resolve({ high_precision_result: { t_statistic: '-1.1558', p_value: '0.2857', df: 7 } });
    }
  },
}));
jest.mock('../../components/Guardian', () => ({ GuardianReportDisplay: () => null, GuardianBadge: () => null }));
jest.mock('../../hooks/useGuardianReport', () => () => ({ hasGuardianContext: false }));
// The page frame needs the app's dark-mode context; it is not under test.
jest.mock('../../components/common/ProfessionalContainer', () => ({ children }) => <div>{children}</div>);

const SAMPLE_1 = '5.1, 6.3, , 4.4, 8.0, 5.5, 6.1, 7.7, 5.9, 6.6';
const SAMPLE_2 = '5.4, 6.0, 7.5, 4.7, 8.3, 5.2, , 8.1, 6.3, 6.5';

beforeEach(() => {
  mockRequests.length = 0;
});

const choose = (testType) => {
  fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: testType }));
};

const type = (label, text) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } });

const calculate = () => fireEvent.click(screen.getByRole('button', { name: /Calculate \(Real Backend\)/ }));

test('a paired test sends the complete rows and says how many it left out', async () => {
  render(<TTestRealBackend />);
  choose('Paired');
  type('Sample 1 (comma-separated)', SAMPLE_1);
  type('Sample 2 (comma-separated)', SAMPLE_2);
  calculate();
  await settle();
  expect(
    screen.getByText('2 rows were left out: in each, one of the two values is missing. The paired test uses the 8 complete pairs.')
  ).toBeInTheDocument();
  expect(mockRequests).toHaveLength(1);
  expect(mockRequests[0].test_type).toBe('paired');
  expect(mockRequests[0].data1).toEqual([5.1, 6.3, 4.4, 8.0, 5.5, 7.7, 5.9, 6.6]);
  expect(mockRequests[0].data2).toEqual([5.4, 6.0, 4.7, 8.3, 5.2, 8.1, 6.3, 6.5]);
});

test('complete samples are sent as they are, with no such sentence', async () => {
  render(<TTestRealBackend />);
  choose('Paired');
  type('Sample 1 (comma-separated)', '1, 2, 3, 4');
  type('Sample 2 (comma-separated)', '2, 2.5, 3.9, 4.1');
  calculate();
  await settle();
  expect(mockRequests).toHaveLength(1);
  expect(mockRequests[0].data1).toEqual([1, 2, 3, 4]);
  expect(mockRequests[0].data2).toEqual([2, 2.5, 3.9, 4.1]);
  expect(screen.queryByText(/left out/)).not.toBeInTheDocument();
});

test('fewer than two complete pairs: no request, and the page says why', async () => {
  render(<TTestRealBackend />);
  choose('Paired');
  type('Sample 1 (comma-separated)', '1, , 3');
  type('Sample 2 (comma-separated)', ' , 5, 6');
  calculate();
  await settle();
  expect(
    screen.getByText('A paired test needs at least 2 complete pairs: rows in which both samples have a value.')
  ).toBeInTheDocument();
  expect(mockRequests).toHaveLength(0);
});

test('two independent samples are read each by itself, as before', async () => {
  render(<TTestRealBackend />);
  type('Sample 1 (comma-separated)', SAMPLE_1);
  type('Sample 2 (comma-separated)', SAMPLE_2);
  calculate();
  await settle();
  expect(mockRequests).toHaveLength(1);
  expect(mockRequests[0].test_type).toBe('two_sample');
  expect(mockRequests[0].data1).toHaveLength(9);
  expect(mockRequests[0].data2).toHaveLength(9);
  expect(screen.queryByText(/left out/)).not.toBeInTheDocument();
});
