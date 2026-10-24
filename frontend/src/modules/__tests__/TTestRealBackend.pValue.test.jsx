/**
 * /modules/t-test-real (not linked from any page) prints the backend's p-value through the shared
 * formatter. It printed the raw 50-digit string.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import TTestRealBackend from '../TTestRealBackend';

jest.mock('../../services/HighPrecisionStatisticalService', () => ({
  // A plain class: CRA's resetMocks would clear a jest.fn implementation defined here.
  HighPrecisionStatisticalService: class {
    performTTest() {
      return Promise.resolve({
        high_precision_result: {
          t_statistic: '-8.6617013131302910540300793932505604890876456526992',
          p_value: '7.7615315650003952552146497347420289454645218856193E-8',
          df: 18,
        },
      });
    }
  },
}));
jest.mock('../../components/Guardian', () => ({ GuardianReportDisplay: () => null, GuardianBadge: () => null }));
jest.mock('../../hooks/useGuardianReport', () => () => ({ hasGuardianContext: false }));
// The page frame needs the app's dark-mode context; it is not under test.
jest.mock('../../components/common/ProfessionalContainer', () => ({ children }) => <div>{children}</div>);

test('the p-value prints with significant figures', async () => {
  render(<TTestRealBackend />);
  fireEvent.click(screen.getByRole('button', { name: 'Load Example' }));
  fireEvent.click(screen.getByRole('button', { name: /Calculate \(Real Backend\)/ }));
  expect(await screen.findByText('7.76e-8')).toBeInTheDocument();
  expect(screen.queryByText(/7\.7615315650003952552146497347420289454645218856193E-8/)).not.toBeInTheDocument();
});
