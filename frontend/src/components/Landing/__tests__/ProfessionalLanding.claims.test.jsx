/**
 * The landing page's claims about privacy, Guardian's validators and the tests on offer
 * must match what the code does.
 *
 * - Analyses run on the server, so "All data processed locally on your machine", "No cloud
 *   storage or external uploads" and "Complete GDPR and HIPAA compliance" were false.
 * - Guardian registers 9 validators (core/guardian/guardian_core.py, GuardianCore.validators);
 *   the page said 8. backend/tests/test_landing_validator_count.py ties the number to the registry.
 * - It named methods Guardian never runs: Bartlett's test, an F-test, Durbin-Watson (the
 *   independence check is a lag-1 autocorrelation), Isolation Forest, Hartigan's dip test, and
 *   power analysis for sample size (the check is a minimum group size).
 * - It listed a sign test and Fisher's exact test, which no screen offers.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ProfessionalLanding from '../ProfessionalLanding';

const renderPage = () => render(<ProfessionalLanding onEnter={() => {}} />);
const pageText = () => document.body.textContent;

test('no claim that data stays on the visitor\'s machine, or of GDPR/HIPAA compliance', () => {
  renderPage();
  expect(pageText()).not.toMatch(/processed locally/i);
  expect(pageText()).not.toMatch(/no cloud storage/i);
  expect(pageText()).not.toMatch(/HIPAA/i);
  expect(pageText()).not.toMatch(/GDPR/i);
});

test('the data-privacy note says analyses run on the server and links to the privacy page', () => {
  renderPage();
  expect(pageText()).toMatch(/Analyses run on our server, so the data you upload is sent there/);
  const link = screen.getByRole('link', { name: /Privacy & data/ });
  expect(link).toHaveAttribute('href', '/privacy');
});

// The nine registered validators, as the documentation list names them.
const VALIDATOR_ENTRIES = [
  'Normality:', 'Sample Size:', 'Homogeneity:', 'Independence:', 'Outliers:',
  'Modality:', 'Linearity:', 'Homoscedasticity:', 'Similar shapes:',
];

test('every validator count on the page is 9, and the list under it has 9 entries', () => {
  renderPage();
  expect(screen.getByText('9 assumption validators; each test runs the ones that apply to it')).toBeInTheDocument();
  // The trust indicator renders <span>9</span><span>Guardian Validators</span>.
  expect(pageText()).toMatch(/(^|\D)9Guardian Validators/);
  expect(screen.getByRole('heading', { name: '9 Validators' })).toBeInTheDocument();
  const entries = screen
    .getAllByRole('listitem')
    .filter((item) => VALIDATOR_ENTRIES.some((name) => item.textContent.startsWith(name)));
  expect(entries).toHaveLength(9);
  expect(pageText()).not.toMatch(/\b8 (assumption )?validators/i);
  expect(pageText()).not.toMatch(/\b8Guardian Validators/);
});

test('the one validator no test uses is marked as such', () => {
  renderPage();
  expect(pageText()).toMatch(/Modality:\s*Peaks in a kernel density estimate \(implemented, but no test uses it yet\)/);
  // ...and it is not advertised as a check in the "Statistical Validation" feature grid.
  expect(screen.queryByRole('heading', { name: 'Modality Detection' })).not.toBeInTheDocument();
});

test.each([
  ["Bartlett's test", /Bartlett/i],
  ['an F-test of variances', /F-test/i],
  ['Durbin-Watson', /Durbin/i],
  ['Isolation Forest', /Isolation Forest/i],
  ["Hartigan's dip test", /Hartigan|dip test/i],
  ['power analysis as the sample-size check', /Power analysis/i],
])('names no method Guardian does not run: %s', (_name, pattern) => {
  renderPage();
  expect(pageText()).not.toMatch(pattern);
});

test('the methods Guardian does run are the ones named', () => {
  renderPage();
  const text = pageText();
  expect(text).toMatch(/Levene's test, median-centred/);
  expect(text).toMatch(/Lag-1 autocorrelation, run only when a request declares its data time-ordered/);
  expect(text).toMatch(/Minimum group size: a warning below 20, critical below 3/);
  expect(text).toMatch(/Shapiro-Wilk \(Anderson-Darling above 5,000 observations\)/);
  expect(text).toMatch(/Breusch-Pagan test on regression residuals/);
  expect(text).toMatch(/Kolmogorov-Smirnov on median-centred groups/);
});

test('the list of available tests names no test that no screen offers', () => {
  renderPage();
  expect(screen.queryByText('Sign test')).not.toBeInTheDocument();
  expect(screen.queryByText("Fisher's exact test")).not.toBeInTheDocument();
  // The tests the screens do offer are still listed.
  expect(screen.getByText('Friedman test')).toBeInTheDocument();
  expect(screen.getByText("Kendall's tau")).toBeInTheDocument();
  expect(screen.getByText('Chi-square test of independence')).toBeInTheDocument();
});

test('MANOVA is not listed: its only screen computes a statistic that ignores the covariance', () => {
  // MANOVA.jsx posts a body /api/v1/multivariate/manova/ rejects, then falls back to a browser
  // "Wilks' lambda" that sums univariate SS ratios, so it is not a MANOVA.
  renderPage();
  expect(pageText()).not.toMatch(/MANOVA/);
});

test('no confidence threshold or reference software the code does not have', () => {
  renderPage();
  expect(pageText()).not.toMatch(/Scores below 70% trigger warnings/);
  expect(pageText()).toMatch(/The confidence score summarises the average\s+severity/);
  expect(pageText()).not.toMatch(/SPSS|SAS outputs/);
  expect(pageText()).not.toMatch(/Python 3\.9/);
});

