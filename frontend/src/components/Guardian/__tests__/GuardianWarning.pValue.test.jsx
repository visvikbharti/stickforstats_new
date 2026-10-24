/**
 * The Guardian warning lists each violation's p-value with significant figures.
 *
 * It printed toFixed(4), so a normality p-value of 3.2e-9 read "p-value: 0.0000", and a
 * truthiness check hid the line altogether for a p-value of exactly 0.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GuardianWarning from '../GuardianWarning';

jest.mock('../../../services/GuardianService', () => ({ __esModule: true, default: {} }));
// The wizard pulls in axios, which CRA's Jest cannot load; it is not under test.
jest.mock('../TransformationWizard', () => () => null);

const report = (pValue) => ({
  can_proceed: true,
  violations: [
    { assumption: 'normality', severity: 'warning', message: 'Not normal', p_value: pValue, test_name: 'Shapiro-Wilk' },
  ],
  alternative_tests: [],
});

test.each([
  [3.2e-9, 'p-value: 3.20e-9 | Test: Shapiro-Wilk'],
  [0, 'p-value: < 2.2e-16 | Test: Shapiro-Wilk'],
  [0.0123, 'p-value: 0.0123 | Test: Shapiro-Wilk'],
])('a violation with p = %p reads "%s"', (pValue, text) => {
  render(<GuardianWarning guardianReport={report(pValue)} />);
  expect(screen.getByText(text)).toBeInTheDocument();
});

test.each([
  [3.2e-9, '3.20e-9'],
  [0, '< 2.2e-16'],
])("the violation's detail dialog prints p = %p as %s", (pValue, text) => {
  render(<GuardianWarning guardianReport={report(pValue)} />);
  fireEvent.click(screen.getByText('normality'));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(text)).toBeInTheDocument();
  // It printed the raw number, and `{0 && ...}` rendered a stray "0" for a p-value of 0.
  expect(within(dialog).queryByText('0')).not.toBeInTheDocument();
});

test('a violation without a p-value has no p-value line', () => {
  render(<GuardianWarning guardianReport={report(null)} />);
  expect(screen.queryByText(/p-value:/)).not.toBeInTheDocument();
});
