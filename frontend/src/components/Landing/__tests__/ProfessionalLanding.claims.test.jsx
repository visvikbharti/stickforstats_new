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
 * - Its first paragraph said that Guardian "guards against Type I errors before they happen" and that the
 *   platform is "Trusted by researchers who value scientific integrity over p-hacking". Guardian checks the
 *   assumptions of a test and reports what it finds; it promises no error rate, and nothing shows who trusts
 *   the platform.
 * - It counted "46+ Statistical Tests" in two places. Nobody has counted that many tests that a visitor can
 *   run from the navigation.
 * - Further down, the section on Guardian said that it guards "against the Type I errors and false positives
 *   that plague published research". It says what Guardian does, and that not every test has a check yet.
 * - Under the two buttons stood "50 Decimal Precision" and "9 Guardian Validators". Not every result is
 *   computed to 50 decimals, and one of the nine validators is run by no check: both stand without a number.
 * - Under "Data Requirements" it said "Size: Up to 1M observations supported" and "Missing values: Handled
 *   automatically with multiple imputation options". The module the page sends a visitor to (Data Profiling)
 *   is replaced by the error screen for a file of 150,000 rows, so the page names no size. Nothing is done to
 *   a missing value unless the visitor chooses it, and the choices are to drop the rows or to fill with the
 *   mean, the median or the mode: the sentence says that.
 */
import fs from 'fs';
import path from 'path';
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
  expect(screen.getByRole('heading', { name: '9 Validators' })).toBeInTheDocument();
  const entries = screen
    .getAllByRole('listitem')
    .filter((item) => VALIDATOR_ENTRIES.some((name) => item.textContent.startsWith(name)));
  expect(entries).toHaveLength(9);
  expect(pageText()).not.toMatch(/\b8 (assumption )?validators/i);
});

test('the two labels under the buttons carry no number', () => {
  renderPage();
  expect(pageText()).toMatch(/View Documentation\s*High-precision arithmeticGuardian assumption checks/);
  expect(pageText()).not.toMatch(/\d\s*Decimal Precision/i);
  expect(pageText()).not.toMatch(/Decimal Precision/);
  expect(pageText()).not.toMatch(/\d\s*Guardian Validators/i);
  expect(pageText()).not.toMatch(/Guardian Validators/);
});

test('the section on Guardian says what it does, and that not every test has a check yet', () => {
  renderPage();
  expect(
    screen.getByText(
      'Guardian checks the assumptions of a test before it runs and reports what it finds. Not every test has such a check yet.'
    )
  ).toBeInTheDocument();
  // nothing on the page promises an error rate any more
  expect(pageText()).not.toMatch(/Type I/);
  expect(pageText()).not.toMatch(/guarding\s+against/i);
  expect(pageText()).not.toMatch(/BEFORE running tests/);
  expect(pageText()).not.toMatch(/that plague published research/i);
});

test('the data requirements name no size', () => {
  renderPage();
  expect(pageText()).not.toMatch(/1M/);
  expect(pageText()).not.toMatch(/observations supported/i);
  const items = screen.getAllByRole('listitem').map((item) => item.textContent.replace(/\s+/g, ' ').trim());
  expect(items).toContain('Format: CSV files with headers');
  expect(items).toContain('Columns: Numeric and categorical variables');
  expect(items.filter((item) => /^Size:/.test(item))).toEqual([]);
});

const MISSING_VALUES =
  'Missing values: counted for every column; you choose whether to keep them, drop their rows, or fill them with the mean, median or mode';

test('missing values: the page says what the two modules do, and promises nothing automatic', () => {
  renderPage();
  const items = screen.getAllByRole('listitem').map((item) => item.textContent.replace(/\s+/g, ' ').trim());
  expect(items).toContain(MISSING_VALUES);
  expect(pageText()).not.toMatch(/Handled automatically/i);
  expect(pageText()).not.toMatch(/multiple imputation/i);
  expect(pageText()).not.toMatch(/imputation/i);
});

test('the choices the sentence names are the choices of the preprocessing module, and its default changes nothing', () => {
  const source = (relative) =>
    fs.readFileSync(path.join(__dirname, '../../statistical-analysis', relative), 'utf8');
  const preprocessing = source('preprocessing/DataPreprocessing.jsx');
  // one group of choices for missing values; it starts at "none"
  expect(preprocessing).toContain("const [missingValueStrategy, setMissingValueStrategy] = useState('none');");
  const group = preprocessing.slice(
    preprocessing.indexOf('<RadioGroup value={missingValueStrategy}'),
    preprocessing.indexOf('</RadioGroup>', preprocessing.indexOf('<RadioGroup value={missingValueStrategy}'))
  );
  expect(group.match(/value="[a-z]+"/g)).toEqual([
    'value="none"',
    'value="drop"',
    'value="mean"',
    'value="median"',
    'value="mode"',
  ]);
  for (const label of ['None (Keep as-is)', 'Drop Rows', 'Fill with Mean', 'Fill with Median', 'Fill with Mode']) {
    expect(group).toContain(`<Typography variant="body1">${label}</Typography>`);
  }
  // and the profiling module shows the count of each column
  const chip = ['label={`$', '{analysis.missingCount} missing`}'].join('');
  expect(source('data-profiling/DataProfiling.jsx')).toContain(chip);
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

test('the first paragraph says what the platform is, and promises no error rate', () => {
  renderPage();
  expect(
    screen.getByText('A statistical analysis platform with built-in assumption checks (Guardian).')
  ).toBeInTheDocument();
  expect(pageText()).not.toMatch(/before they happen/i);
  expect(pageText()).not.toMatch(/built-in Guardian protection/i);
});

test('no sentence says who trusts the platform', () => {
  renderPage();
  expect(pageText()).not.toMatch(/Trusted by/i);
  expect(pageText()).not.toMatch(/integrity over p-hacking/i);
});

test('the page does not count the statistical tests', () => {
  renderPage();
  expect(screen.getByRole('heading', { name: 'Statistical Tests' })).toBeInTheDocument();
  expect(screen.getByText('With an educational mode')).toBeInTheDocument();
  expect(pageText()).not.toMatch(/46/);
  expect(pageText()).not.toMatch(/\d\+?\s*Statistical Tests/i);
  expect(screen.queryByText(/Comprehensive suite with educational mode/i)).not.toBeInTheDocument();
  // under the two buttons: two labels, and no count of tests before them
  expect(pageText()).toMatch(/View Documentation\s*High-precision arithmeticGuardian assumption checks/);
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

