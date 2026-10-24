/**
 * The survival and factor introductions offer "Get Started" only where an analysis step follows.
 * SurvivalAnalysisPage.jsx and FactorAnalysisPage.jsx show them with no such step.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SurvivalIntroduction from '../survival/SurvivalIntroduction';
import FactorIntroduction from '../factor/FactorIntroduction';

describe.each([
  ['SurvivalIntroduction', SurvivalIntroduction],
  ['FactorIntroduction', FactorIntroduction],
])('%s', (name, Introduction) => {
  test('no Get Started button without a next step', () => {
    render(<Introduction />);
    expect(screen.queryByRole('button', { name: 'Get Started' })).toBeNull();
  });

  test('the Get Started button is there when a next step is given', () => {
    render(<Introduction onContinue={() => {}} />);
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });
});
