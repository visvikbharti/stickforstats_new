/**
 * /modules/nonparametric-real, the Friedman test, and a value of 0.
 *
 * The page builds one row for each subject from the columns that were typed, and it reads a value
 * of 0 as a missing value. A subject with a 0 in any condition is left out of the request, and the
 * test is computed on the others. KNOWN_ISSUES.md has the entry; nothing is repaired here.
 *
 * This file types three conditions for eight subjects into the page, presses "Perform Test" and
 * reads the request the page makes. It holds the page to what the entry says: when the page sends
 * all eight rows, the first test fails and the entry goes.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NonParametricTestsRealProfessional from '../NonParametricTestsRealProfessional';

jest.setTimeout(10 * 60 * 1000);

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const mockRequests = [];

jest.mock('../../services/NonParametricTestsService', () => ({
  // A plain class: CRA's resetMocks would clear a jest.fn implementation defined here.
  NonParametricTestsService: class {
    friedmanTest(rows, options) {
      mockRequests.push({ rows, options });
      return Promise.reject(new Error('the request was read by the test and not sent'));
    }
  },
}));
jest.mock('../../components/statistical/educational', () => ({ GuardianCascadeSimulator: () => null }));
// The page frame needs the app's dark-mode context; it is not under test.
jest.mock('../../components/common/ProfessionalContainer', () => ({ children }) => <div>{children}</div>);

// Eight subjects under three conditions. The second subject scored 0 under the first condition.
const CONDITIONS = {
  'Self Study': [3, 0, 5, 4, 6, 2, 7, 1],
  'Online Course': [5, 2, 6, 6, 7, 4, 9, 3],
  'In-Person': [8, 4, 9, 7, 9, 6, 12, 5],
};
const ROWS = CONDITIONS['Self Study'].map((_, subject) => Object.values(CONDITIONS).map((values) => values[subject]));

const typeAndRun = async (conditions) => {
  render(
    <MemoryRouter>
      <NonParametricTestsRealProfessional />
    </MemoryRouter>
  );
  await settle();
  // the one menu of the page: the choice of the test
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(await screen.findByRole('option', { name: /Friedman Test/ }));
  await settle();
  Object.entries(conditions).forEach(([name, values]) => {
    fireEvent.change(screen.getByLabelText(name), { target: { value: values.join('\n') } });
  });
  await settle();
  fireEvent.click(screen.getByRole('button', { name: 'Perform Test' }));
  await settle();
  expect(mockRequests).toHaveLength(1);
  return mockRequests[0];
};

beforeEach(() => {
  mockRequests.length = 0;
});

test('a subject with a value of 0 is left out of the request', async () => {
  expect(ROWS).toHaveLength(8);
  expect(ROWS[1]).toEqual([0, 2, 4]);
  const { rows, options } = await typeAndRun(CONDITIONS);
  expect(options.condition_names).toEqual(['Self Study', 'Online Course', 'In-Person']);
  // seven rows of the eight that were typed: the row of the second subject is not among them
  expect(rows).toHaveLength(7);
  expect(rows).toEqual(ROWS.filter((_, subject) => subject !== 1));
  expect(rows).not.toContainEqual([0, 2, 4]);
});

test('with 0.5 in the place of the 0, every subject is sent', async () => {
  const conditions = { ...CONDITIONS, 'Self Study': [3, 0.5, 5, 4, 6, 2, 7, 1] };
  const { rows } = await typeAndRun(conditions);
  expect(rows).toHaveLength(8);
  expect(rows[1]).toEqual([0.5, 2, 4]);
});
