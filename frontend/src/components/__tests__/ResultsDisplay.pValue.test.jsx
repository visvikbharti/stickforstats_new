/**
 * The unified test runner's results table reads an exact 0 as a bound.
 *
 * It printed "0.0000e+0 ***" for a p-value of 0 (a tail that underflowed), and the heading's
 * `{p_value && ...}` rendered a stray "0" beside "Primary Results".
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ResultsDisplay from '../ResultsDisplay';

jest.mock('../../context/DarkModeContext', () => ({ useDarkMode: () => ({ darkMode: false }) }));

test('an exact 0 reads as a bound, with no stray 0 beside the heading', () => {
  render(<ResultsDisplay results={{ main_results: { p_value: 0, t_statistic: 12.5 } }} />);
  expect(screen.getByText('< 2.2e-16 ***')).toBeInTheDocument();
  expect(screen.getByText('Highly Significant')).toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  expect(screen.queryByText(/0\.0000e\+0/)).not.toBeInTheDocument();
});
