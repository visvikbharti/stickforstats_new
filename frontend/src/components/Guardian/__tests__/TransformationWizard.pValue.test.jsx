/**
 * The transformation wizard prints the server's p-values through the shared formatter.
 *
 * It printed them as they came: the server rounded them to 4 decimals, so a strongly non-normal
 * sample read "Current p-value: 0" and "Shapiro-Wilk p = 0". The server now sends the computed
 * value ("fix(api): p-values leave the server at full precision").
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import TransformationWizard from '../TransformationWizard';

jest.setTimeout(20000);

// Plain functions: CRA's resetMocks would clear jest.fn implementations defined here.
jest.mock('../../../services/TransformationService', () => ({
  __esModule: true,
  default: {
    flattenData: (data) => data,
    suggestTransformation: () =>
      Promise.resolve({
        success: true,
        data: {
          recommended: 'log', alternatives: [], reason: 'Right-skewed', expected_improvement: 50,
          current_p_value: 3.2e-9, estimated_p_value: 0.15, current_skewness: 2.1, current_kurtosis: 4.2,
          has_negative: false, has_zeros: false,
        },
      }),
    applyTransformation: () =>
      Promise.resolve({ success: true, data: { success: true, transformed_data: [0.1, 0.4, 0.9, 1.2, 1.6, 2.3] } }),
    validateTransformation: () =>
      Promise.resolve({
        success: true,
        data: {
          original_p_value: 0, transformed_p_value: 0.21, improvement: true, improvement_score: 60,
          still_violated: false, skewness_before: 2.1, skewness_after: 0.1,
          normality_test_before: 'Shapiro-Wilk', normality_test_after: 'Shapiro-Wilk',
        },
      }),
    getTransformationDisplayName: (name) => name,
    getTransformationDescription: () => 'Natural logarithm',
    exportCode: () => Promise.resolve({ success: true, code: '' }),
    downloadCodeFile: () => {},
  },
}));

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

test('the suggestion and the validation print p with significant figures, and a 0 as a bound', async () => {
  render(<TransformationWizard open onClose={() => {}} data={[1.1, 1.5, 2.4, 3.3, 5.0, 9.8]} violations={[]} />);
  next();
  expect(await screen.findByText('Current p-value: 3.20e-9')).toBeInTheDocument();
  expect(screen.getByText('Estimated p-value: 0.1500')).toBeInTheDocument();

  // The comparison is drawn on the Preview step, but the transformation is applied on leaving it
  // (handleNext at step 2), so the validation shows after going on to Apply and back.
  next();
  next();
  fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
  expect(await screen.findByText('Shapiro-Wilk p < 2.2e-16')).toBeInTheDocument();
  expect(screen.getByText('Shapiro-Wilk p = 0.2100')).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '< 2.2e-16' })).toBeInTheDocument();
  expect(screen.queryAllByText(/p = 0$|^0$/)).toHaveLength(0);
});
