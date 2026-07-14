/**
 * Regression: a local `const isSignificant` shadowed the imported helper.
 *
 * All three components in this folder import `isSignificant` from
 * utils/formatStats, and then declared a local `const isSignificant = ...`
 * inside a block that ALSO called the helper on the line above:
 *
 *     const wasSignificant = isSignificant(item.pValue, alpha);   // <-- throws
 *     const isSignificant  = adjusted < alpha;
 *
 * A `const` shadows the outer binding across the whole block, so that call did
 * not reach the import — it reached the local, still in its temporal dead zone.
 * `ReferenceError: Cannot access 'isSignificant' before initialization`, on
 * every row, unconditionally.
 *
 * These components are not currently rendered by the routed panel, so nothing
 * exercised them and nothing caught it. CI's eslint has `no-use-before-define`
 * enabled and would have flagged all of it — but it was never pointed at a
 * single `.jsx` file. These tests execute the code paths, so the crash cannot
 * come back silently.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import PValueAdjustmentTable from '../PValueAdjustmentTable';
import MultipleTestingReport from '../MultipleTestingReport';

// Bonferroni with m = 4, alpha = 0.05 (adjusted = min(p * 4, 1)):
//
//   p = 0.001 -> 0.004   significant before AND after
//   p = 0.004 -> 0.016   significant before AND after
//   p = 0.020 -> 0.080   significant before, NOT after  <-- exactly one flip
//   p = 0.600 -> 1.000   significant neither before nor after
//
// So the table must show exactly one "Lost Significance" row. That pins the
// before/after decision algebra, not merely the absence of a crash.
const P_VALUES = [
  { id: 1, pValue: 0.001, hypothesis: 'Hypothesis A' },
  { id: 2, pValue: 0.004, hypothesis: 'Hypothesis B' },
  { id: 3, pValue: 0.02, hypothesis: 'Hypothesis C' },
  { id: 4, pValue: 0.6, hypothesis: 'Hypothesis D' },
];

const SESSION_TESTS = P_VALUES.map((p) => ({
  ...p,
  // adjustedPValue present so generateDecisionAudit() takes its live branch
  adjustedPValue: Math.min(p.pValue * P_VALUES.length, 1),
}));

describe('MultiplicityCorrectionPanel — shadowed isSignificant (TDZ)', () => {
  it('PValueAdjustmentTable computes every row without a ReferenceError', () => {
    // Before the fix the useMemo threw on the FIRST row, so nothing mounted.
    render(
      <PValueAdjustmentTable pValues={P_VALUES} correctionMethod="bonferroni" alpha={0.05} />,
    );

    expect(screen.getByText('Hypothesis A')).toBeInTheDocument();
    expect(screen.getByText('Hypothesis D')).toBeInTheDocument();
  });

  it('PValueAdjustmentTable reports the one decision flip Bonferroni causes', () => {
    // Guards the shorthand key too: `isSignificant,` in the pushed row object
    // had to become `isSignificant: adjustedSignificant,` or every row's
    // "after" decision would be wrong even though nothing threw.
    render(
      <PValueAdjustmentTable pValues={P_VALUES} correctionMethod="bonferroni" alpha={0.05} />,
    );

    // Scope to the table: the summary header above it carries the same words,
    // so matching on page-wide text would count it too.
    const table = within(screen.getByRole('table'));
    expect(table.getAllByText(/Lost Significance/i)).toHaveLength(1);
    expect(table.queryByText(/Gained Significance/i)).not.toBeInTheDocument();
    // 0.001 and 0.004 survive the correction; 0.6 was never significant.
    expect(table.getAllByText('✓ Significant')).toHaveLength(2);
    expect(table.getAllByText('✗ Not Significant')).toHaveLength(1);
  });

  it('MultipleTestingReport builds the decision audit without a ReferenceError', () => {
    // generateDecisionAudit() runs inside the fullReport useMemo on first
    // render (selectedSections.audit defaults to true), and hit the TDZ on
    // its first row.
    render(
      <MultipleTestingReport
        sessionTests={SESSION_TESTS}
        hypotheses={SESSION_TESTS}
        correctionMethod="benjamini_hochberg"
        alpha={0.05}
      />,
    );

    expect(screen.getAllByText(/Decision Audit Trail/i).length).toBeGreaterThan(0);
  });
});
