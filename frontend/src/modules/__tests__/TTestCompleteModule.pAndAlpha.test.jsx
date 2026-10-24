/**
 * The t-test page (/modules/t-test) prints p-values with significant figures and α as set.
 *
 * Executed on the live site on 24 October 2026 with the Medical example: the backend returned
 * p = 7.7615...E-8 and the page wrote "p = 0.0000 < α = 0.050000000000000044". It printed p with
 * toFixed(4) and computed α as 1 - 95 / 100. The equal-variance check printed its p-value with
 * toFixed(4) too, and the table's "Significant" chip compared against a fixed 0.05.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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

const respond = (pValue, tStatistic = '-8.6617013131302910540300793932505604890876456526992') => {
  axios.post.mockResolvedValue({
    data: { high_precision_result: { t_statistic: tStatistic, p_value: pValue, df: 18, alternative: 'two-sided' } },
  });
};

const open = () => {
  guardianService.checkAssumptions.mockResolvedValue(null);
  render(
    <MemoryRouter>
      <TTestCompleteModule />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: /Analysis/ }));
};

const run = () => fireEvent.click(screen.getByRole('button', { name: /Perform Analysis/ }));

afterEach(() => jest.clearAllMocks());

test('a p-value of 7.76e-8 prints with significant figures, and α prints as 0.05', async () => {
  respond('7.7615315650003952552146497347420289454645218856193E-8');
  open();
  fireEvent.click(screen.getByRole('button', { name: /Medical/ }));
  run();

  expect(
    await screen.findByText(/The test is statistically significant \(p = 7\.76e-8 < α = 0\.05\)\./)
  ).toBeInTheDocument();
  expect(screen.getByText('7.76e-8')).toBeInTheDocument();
  expect(screen.getByTitle('Full precision: 7.7615315650003952552146497347420289454645218856193E-8')).toBeInTheDocument();
  expect(screen.getByText('Significant')).toBeInTheDocument();
  expect(screen.queryAllByText(/0\.0000|0\.050000000000000044/)).toHaveLength(0);
});

test('a p-value below the range of a JavaScript number still prints its size', async () => {
  // parseFloat('1.2345E-400') is 0; the page reads the backend's string instead.
  respond('1.2345E-400', '-61.2');
  open();
  fireEvent.click(screen.getByRole('button', { name: /Medical/ }));
  run();

  expect(
    await screen.findByText(/The test is statistically significant \(p = 1\.23e-400 < α = 0\.05\)\./)
  ).toBeInTheDocument();
  expect(screen.getByText('1.23e-400')).toBeInTheDocument();
});

test('at 99% confidence α prints as 0.01, and the table judges p = 0.03 at it', async () => {
  respond('0.03', '2.3');
  open();
  const slider = screen.getAllByRole('slider').find((s) => s.getAttribute('aria-valuemin') === '90');
  fireEvent.change(slider, { target: { value: 99 } });
  expect(screen.getByText('Confidence Level: 99%')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Medical/ }));
  run();

  expect(
    await screen.findByText(/The test is not statistically significant \(p = 0\.0300 ≥ α = 0\.01\)\./)
  ).toBeInTheDocument();
  // A fixed 0.05 would have called p = 0.03 significant beside a sentence saying it is not.
  expect(screen.queryByText('Significant')).not.toBeInTheDocument();
  expect(screen.queryAllByText(/0\.010000000000000009/)).toHaveLength(0);
});

test.each([
  // F = 19.30 on (9, 9) df: p = 1.4993e-4, which toFixed(4) printed as 0.0001.
  ['10, 11, 9, 12, 8, 10, 11, 9, 12, 8', /\(F=19\.30, p = 1\.50e-4\)/],
  // F = 193000: 1 - cdf rounds to 0, which toFixed(4) printed as 0.0000.
  ['10, 10.01, 9.99, 10.02, 9.98, 10, 10.01, 9.99, 10.02, 9.98', /\(F=193000\.00, p < 2\.2e-16\)/],
])('the equal-variance check prints its p-value with significant figures (%s)', async (sample1, finding) => {
  respond('0.2');
  open();
  fireEvent.change(screen.getByLabelText('Sample 1 (Control/Group A)'), { target: { value: sample1 } });
  fireEvent.change(screen.getByLabelText('Sample 2 (Treatment/Group B)'), {
    target: { value: '0, 20, 5, 15, 10, 2, 18, 8, 12, 10' },
  });
  run();

  expect(await screen.findByText(finding)).toBeInTheDocument();
  expect(screen.queryAllByText(/p ?= ?0\.000[01]\b/)).toHaveLength(0);
});
