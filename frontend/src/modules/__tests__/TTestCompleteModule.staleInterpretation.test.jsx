/**
 * The t-test page's interpretation always belongs to the latest run.
 *
 * When the backend reports an undefined test (t and p null: no within-group variance), the page
 * built an interpretation saying so but never displayed it, so the previous run's "Significant
 * difference detected" stayed under a results card saying no statistic could be computed. A
 * failed request left the previous interpretation on screen in the same way.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import guardianService from '../../services/GuardianService';
import TTestCompleteModule from '../TTestCompleteModule';

jest.setTimeout(20000);

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));
jest.mock('../../services/GuardianService', () => ({
  __esModule: true,
  default: { checkAssumptions: jest.fn() },
}));

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const significant = {
  data: { high_precision_result: { t_statistic: '-8.66', p_value: '7.76E-8', df: 18, alternative: 'two-sided' } },
};
const undefinedTest = {
  data: {
    high_precision_result: {
      t_statistic: null,
      p_value: null,
      df: 18,
      alternative: 'two-sided',
      interpretation: 'The within-group variance is zero.',
    },
  },
};

const firstRunSignificant = async () => {
  guardianService.checkAssumptions.mockResolvedValue(null);
  axios.post.mockResolvedValueOnce(significant);
  render(
    <MemoryRouter>
      <TTestCompleteModule />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: /Analysis/ }));
  fireEvent.click(screen.getByRole('button', { name: /Medical/ }));
  fireEvent.click(screen.getByRole('button', { name: /Perform Analysis/ }));
  expect(await screen.findByText('Significant difference detected')).toBeInTheDocument();
};

afterEach(() => jest.clearAllMocks());

test('an undefined test replaces the previous interpretation', async () => {
  await firstRunSignificant();
  axios.post.mockResolvedValueOnce(undefinedTest);
  fireEvent.click(screen.getByRole('button', { name: /Perform Analysis/ }));

  expect(await screen.findByText('No test statistic could be computed')).toBeInTheDocument();
  expect(screen.queryByText('Significant difference detected')).not.toBeInTheDocument();
});

test('a failed request clears the previous interpretation', async () => {
  await firstRunSignificant();
  axios.post.mockRejectedValueOnce(new Error('network down'));
  fireEvent.click(screen.getByRole('button', { name: /Perform Analysis/ }));

  await waitFor(() => expect(screen.queryByText('Significant difference detected')).not.toBeInTheDocument());
  expect(screen.queryByText('Interpretation')).not.toBeInTheDocument();
});
