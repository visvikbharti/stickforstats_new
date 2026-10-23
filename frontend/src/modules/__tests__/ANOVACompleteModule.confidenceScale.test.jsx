/**
 * /modules/anova shows Guardian's confidence on the scale it is reported in.
 *
 * /api/guardian/check/ returns confidence_score as a fraction in [0, 1] (executed: 0.722 for
 * three normal groups whose report had one minor outlier violation). GuardianReportDisplay and
 * its gauge work in percent.
 * The module passed the fraction straight through, so 0.722 and a clean 1.0 both rendered as
 * "1%", in red, with the gauge's tooltip reading "Critical - Results may be unreliable" under a
 * report headed "All Assumptions Validated".
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import guardianService from '../../services/GuardianService';
import ANOVACompleteModule from '../ANOVACompleteModule';

// Each test renders the whole module and waits up to 5 s for the mocked Guardian report. Jest's
// default budget is 5 s for the whole test, which ran out for the genomics page tests under a
// loaded full-suite run ("Exceeded timeout of 5000 ms"), and CI runners can be slower.
jest.setTimeout(20000);

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));
jest.mock('../../services/GuardianService', () => ({
  __esModule: true,
  default: { checkAssumptions: jest.fn() },
}));
// The real data-entry widget is a form; the bug is downstream of it, so a button that submits
// three fixed groups stands in for it. The other shared components are not under test.
jest.mock('../../components/statistical', () => ({
  DataInput: ({ onDataSubmit }) => (
    <button type="button" onClick={() => onDataSubmit([[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]])}>
      submit test groups
    </button>
  ),
  FactorialDataInput: () => null,
  ResultDisplay: () => null,
  InterpretationPanel: () => null,
  DistributionPlot: () => null,
  TheoryCard: () => null,
  SimulationControl: () => null,
}));

const report = (confidence, violations = []) => ({
  test_type: 'anova',
  can_proceed: true,
  confidence_score: confidence,
  assumptions_checked: ['normality', 'variance_homogeneity', 'outliers'],
  violations,
  alternative_tests: [],
});

const runWith = async (confidence, violations) => {
  guardianService.checkAssumptions.mockResolvedValue(report(confidence, violations));
  axios.post.mockRejectedValue(new Error('ANOVA call not under test'));
  render(
    <MemoryRouter>
      <ANOVACompleteModule />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: /Analysis/ }));
  fireEvent.click(screen.getByRole('button', { name: 'submit test groups' }));
  expect(await screen.findByText('Guardian Assumption Report', {}, { timeout: 5000 })).toBeInTheDocument();
};

afterEach(() => jest.clearAllMocks());

// The header chip (its tooltip text is copied into aria-label) and the gauge's value heading.
const expectShownAs = (percentText, tooltipPercent) => {
  expect(screen.getByLabelText(`Confidence Score: ${tooltipPercent}`)).toHaveTextContent(percentText);
  expect(screen.getByRole('heading', { level: 6, name: percentText })).toBeInTheDocument();
  expect(screen.queryByText('1%')).not.toBeInTheDocument();
};

test('a reported confidence of 0.722 is shown as 72%, with the gauge reading it on the same scale', async () => {
  // As executed: one minor outlier violation gives 0.722.
  await runWith(0.722, [{ assumption: 'outliers', severity: 'minor', message: 'Outliers detected in group 2' }]);
  expectShownAs('72%', '72.2%');
  expect(screen.getByLabelText('Acceptable - Some assumptions questionable')).toBeInTheDocument();
});

test('a clean report (1.0) is shown as 100%, not as 1% and "Critical"', async () => {
  await runWith(1);
  expectShownAs('100%', '100.0%');
  expect(screen.getByLabelText('Excellent - All assumptions well supported')).toBeInTheDocument();
  expect(screen.queryByLabelText('Critical - Results may be unreliable')).not.toBeInTheDocument();
});
