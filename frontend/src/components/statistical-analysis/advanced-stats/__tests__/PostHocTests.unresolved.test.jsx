/**
 * A Tukey p-value the quadrature cannot resolve is shown as unknown, not as zero.
 *
 * tukeyPValue returns null below its resolution, and the table capped it with Math.min(null, 1),
 * which is 0, so the comparison printed "0.00e+0". It may be far from zero: #32 item 2 found the
 * quadrature returning null at q = 6 (k = 3, df = 27), where the exact p-value is about 6.6e-4.
 * The cell now shows an em dash.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SettingsProvider } from '../../../../context/SettingsContext';
import PostHocTests from '../PostHocTests';

jest.mock('../../../../services/GuardianService', () => ({
  __esModule: true,
  // A plain function: CRA's resetMocks would clear a jest.fn implementation before the test.
  default: { checkAssumptions: () => Promise.resolve({ can_proceed: true, violations: [] }) },
}));
jest.mock('../../../Guardian/GuardianWarning', () => () => null);

// The results chart measures its container, which jsdom cannot do.
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const base = [9.0, 9.5, 10.0, 10.5, 11.0, 9.2, 9.8, 10.2, 10.8, 10.0];
const rows = [
  ...base.map((v) => ({ group: 'A', value: v })),
  ...base.map((v) => ({ group: 'B', value: v + 0.5 })),
  ...base.map((v) => ({ group: 'C', value: v + 10 })),
];

function choose(selectIndex, optionName) {
  fireEvent.mouseDown(screen.getAllByRole('combobox')[selectIndex]);
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: optionName }));
}

// The p-value column of the pairwise-comparison table: its rows have six cells, and the
// comparisons are also named elsewhere on the page.
function pCell(comparison) {
  const cells = screen
    .getAllByRole('row')
    .map((row) => within(row).queryAllByRole('cell'))
    .find((rowCells) => rowCells.length === 6 && rowCells[0].textContent === comparison);
  return cells[4].textContent;
}

test('an unresolved Tukey p-value shows an em dash; a resolved one shows its value', async () => {
  render(
    <ThemeProvider theme={createTheme()}>
      <SettingsProvider>
        <PostHocTests data={rows} />
      </SettingsProvider>
    </ThemeProvider>
  );
  choose(0, 'group');
  choose(1, 'value');

  await screen.findByText(/^Significant \(α =/);
  expect(pCell('A vs C')).toBe('—');
  expect(pCell('B vs C')).toBe('—');
  expect(pCell('A vs B')).toMatch(/^0\.\d{4}$/);
});
