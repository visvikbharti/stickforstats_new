/**
 * The shared result card (components/statistical/core/ResultDisplay, used by the /modules/* pages)
 * prints p with significant figures.
 *
 * It passed p through its generic formatValue, which is toFixed(precision): "p = 0.0000" for any
 * p below 0.00005, both on the card and in its interpretation sentence.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultDisplay from '../ResultDisplay';

test.each([
  [3.2e-9, 'p = 3.20e-9', /statistically significant \(p = 3\.20e-9 < 0\.05\)/],
  [0, 'p < 2.2e-16', /statistically significant \(p < 2\.2e-16 < 0\.05\)/],
])('p = %p prints as "%s"', (pValue, card, sentence) => {
  render(<ResultDisplay results={{ p_value: pValue, test_statistic: 9.81, degrees_of_freedom: 18 }} />);
  expect(screen.getByText(card)).toBeInTheDocument();
  expect(screen.queryAllByText(/0\.0000/)).toHaveLength(0);
  fireEvent.click(screen.getByRole('tab', { name: 'Interpretation' }));
  expect(screen.getByText(sentence)).toBeInTheDocument();
  expect(screen.queryAllByText(/0\.0000/)).toHaveLength(0);
});
