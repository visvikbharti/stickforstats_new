/**
 * Regression test for the Categorical (chi-square) screen.
 *
 * Two bugs have shipped here, and a pure-math unit test would have caught
 * neither on its own:
 *
 *  1. 6e5effd — the local chiSquareCDF summed the full Poisson mass for df <= 2,
 *     so 1 - 1 = 0 and EVERY 2x2 / 2x3 table reported p = 0.0000 / "Significant".
 *  2. the fix for (1) declared chiSquareUpperTail as a component-scoped const
 *     BELOW the useMemo that calls it. useMemo runs its callback synchronously
 *     during render, so the memo hit the temporal dead zone and the whole screen
 *     crashed with "Cannot access 'chiSquareUpperTail' before initialization" —
 *     the math was right but the component never rendered.
 *
 * So this test RENDERS the component and reads the p-value off the screen, and
 * it checks two tables whose verdicts differ — a chi-square that always says
 * "Significant" cannot pass.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CategoricalTests from '../CategoricalTests';

// --- keep the test on the component under test, not its heavy children ---
jest.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    BarChart: Stub, Bar: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub,
    Tooltip: Stub, Legend: Stub, ResponsiveContainer: Stub,
  };
});
jest.mock('../../../../services/GuardianService', () => ({
  __esModule: true,
  default: { checkAssumptions: jest.fn().mockResolvedValue(null) },
}));
jest.mock('../../../Guardian/GuardianWarning', () => () => <div data-testid="guardian-warning" />);
jest.mock('../../../VisualEvidence', () => () => <div />);
jest.mock('../../../common', () => ({ CodeExportPanel: () => <div /> }));
jest.mock('../../../statistical-debugger', () => ({ DebuggerPanel: () => <div /> }));
jest.mock('../../../../context/SettingsContext', () => ({
  useSettings: () => ({ expertMode: false }),
}));

/**
 * Long/tidy rows. Group x Outcome_A and Group x Outcome_B are two different 2x2
 * tables built from the SAME Group column:
 *   Outcome_A: Treatment 26/24, Control 23/27  -> chi2=0.3601, df=1, p=0.5484 (ns)
 *   Outcome_B: Treatment 32/18, Control 20/30  -> chi2=5.7692, df=1, p=0.0163 (sig)
 * (both cross-checked against scipy.stats.chi2_contingency(correction=False))
 */
const buildRows = () => {
  const rows = [];
  const push = (group, a, b, n) => {
    for (let i = 0; i < n; i++) rows.push({ Group: group, Outcome_A: a, Outcome_B: b });
  };
  // Treatment: Outcome_A 26 Improved / 24 Not; Outcome_B 32 Improved / 18 Not
  push('Treatment', 'Improved', 'Improved', 26);
  push('Treatment', 'NotImproved', 'Improved', 6);
  push('Treatment', 'NotImproved', 'NotImproved', 18);
  // Control: Outcome_A 23 Improved / 27 Not; Outcome_B 20 Improved / 30 Not
  push('Control', 'Improved', 'Improved', 20);
  push('Control', 'Improved', 'NotImproved', 3);
  push('Control', 'NotImproved', 'NotImproved', 27);
  return rows;
};

// The two selects are labelled "Variable 1 (Rows)" / "Variable 2 (Columns)"; grab
// them by their MUI FormControl via the visible label text.
const selectByLabel = (labelText, optionText) => {
  const label = screen.getByText(labelText, { selector: 'label' });
  const control = label.closest('.MuiFormControl-root');
  fireEvent.mouseDown(within(control).getByRole('combobox'));
  const listbox = screen.getByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: optionText }));
};

describe('CategoricalTests — chi-square renders a real, discriminating p-value', () => {
  const rows = buildRows();

  it('renders without a temporal-dead-zone crash and reports p = 0.5484 (NOT significant)', () => {
    render(<CategoricalTests data={rows} />);
    selectByLabel(/Variable 1/i, 'Group');
    selectByLabel(/Variable 2/i, 'Outcome_A');

    // The pre-fix bug rendered 0.0000 here for every table.
    expect(screen.getAllByText('0.5484').length).toBeGreaterThan(0);
    expect(screen.queryByText('0.0000')).toBeNull();
    expect(screen.getAllByText(/Not Significant/i).length).toBeGreaterThan(0);
  });

  it('reports p = 0.0163 (SIGNIFICANT) for a genuinely associated table', () => {
    render(<CategoricalTests data={rows} />);
    selectByLabel(/Variable 1/i, 'Group');
    selectByLabel(/Variable 2/i, 'Outcome_B');

    expect(screen.getAllByText('0.0163').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Not Significant/i)).toBeNull();
  });
});
