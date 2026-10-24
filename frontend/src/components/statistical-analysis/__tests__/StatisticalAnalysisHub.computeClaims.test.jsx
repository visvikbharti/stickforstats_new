/**
 * The tools page must not contradict itself about where its numbers are computed (issue #31 item 5).
 *
 * Its Key Features list said BOTH "Every test on this page is computed by the backend" and "All
 * computations in-browser, zero backend dependencies", and the footer added "No Server Required:
 * All calculations run in your browser for speed and privacy". None was true: the Statistical
 * Tests module, power analysis and Guardian call the server, while two-way ANOVA, post-hoc tests,
 * the correlation matrix and others compute in the browser. The list also claimed "77.3% coverage",
 * a count of React components wired to Guardian in an old inventory that the current code cannot
 * reproduce. The page now states the split, and no coverage figure.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import StatisticalAnalysisHub from '../StatisticalAnalysisHub';

// Keep the test on the hub's own text, not its ten modules.
jest.mock('../data-profiling/DataProfiling', () => () => null);
jest.mock('../preprocessing/DataPreprocessing', () => () => null);
jest.mock('../visualizations/VisualizationSuite', () => () => null);
jest.mock('../statistical-tests/StatisticalTests', () => () => null);
jest.mock('../advanced-stats/AdvancedStatistics', () => () => null);
jest.mock('../machine-learning/MachineLearning', () => () => null);
jest.mock('../../statistical/RegressionCalculator', () => () => null);
jest.mock('../power-analysis/PowerAnalysisTool', () => () => null);
jest.mock('../study-design-wizard/StudyDesignWizard', () => () => null);
jest.mock('../biophysics/BiophysicsHub', () => () => null);

const pageText = () => {
  render(<StatisticalAnalysisHub />);
  return document.body.textContent.replace(/\s+/g, ' ');
};

test('neither contradictory claim about where tests are computed remains', () => {
  const text = pageText();
  expect(text).not.toMatch(/Every test on this page is computed by the backend/);
  expect(text).not.toMatch(/All computations in-browser, zero backend dependencies/);
  expect(text).not.toMatch(/No Server Required/);
  expect(text).not.toMatch(/run in your browser for speed and privacy/);
});

test('the page states which computations run where, and that Guardian sends data to the server', () => {
  const text = pageText();
  expect(text).toContain(
    'The tests in the Statistical Tests module (normality, t-tests, one-way ANOVA, non-parametric ' +
      "tests, pairwise correlation and chi-square), the normality test in the Visualization module's " +
      'distribution view, and every power calculation are computed on our server'
  );
  expect(text).toContain(
    'Two-way, repeated-measures and multivariate ANOVA, post-hoc tests, the correlation matrix, the ' +
      'correlations in the Visualization module, effect sizes, machine learning and the biophysics ' +
      'fits are computed in your browser; repeated-measures and multivariate ANOVA first send the ' +
      'uploaded table to our server, which currently rejects it.'
  );
  expect(text).toContain(
    "Guardian's checks run on our server, so a screen that uses Guardian sends your data there even " +
      'when its test is computed in your browser.'
  );
});

test('no unexplained coverage figure is claimed for Guardian', () => {
  const text = pageText();
  expect(text).not.toMatch(/77\.3/);
  expect(text).toContain(
    "Guardian Protection System: Checks a test's assumptions against your data and warns you when one is violated"
  );
});
