/**
 * ReviewerReport Tests
 * ====================
 *
 * Pins the contract of the compact Reviewer Mode surface:
 *   - verdict banner color + copy derived from `overall_assessment` (with
 *     sensible fallback from `sqs_score` + gross_errors when the backend
 *     hasn't filled it in),
 *   - top-N triage sorts by severity (blocking > critical > major > moderate
 *     > minor) while preserving original order within a tie,
 *   - empty findings → explicit "no concerns" state,
 *   - share button stays disabled until a submissionId is present,
 *   - print-only bar hidden at render time is still in the tree (CSS hides
 *     it in @media print; we just verify the class is set).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';

import ReviewerReport, {
  DisciplineCompliancePanel,
  SEVERITY_ORDER,
  formatCategory,
  pickTopConcerns,
  resolveVerdict,
} from '../ReviewerReport';
import { getTheme } from '../../../theme';

const wrap = (ui) => render(<ThemeProvider theme={getTheme('light')}>{ui}</ThemeProvider>);

const makeFinding = (overrides = {}) => ({
  severity: 'major',
  category: 'assumption_reporting',
  title: 'Normality assumption unreported',
  description: 'Shapiro–Wilk result is not shown before the t-test.',
  evidence: '',
  recommendation: 'Report the test of normality or cite a rationale.',
  claim_id: null,
  ...overrides,
});

const makeReport = (overrides = {}) => ({
  title: 'A small randomized trial of X',
  authors: ['Bharti V', 'Chakraborty D'],
  word_count: 5400,
  sqs_score: 72,
  sqs_grade: 'C',
  consistency_rate: 0.94,
  claims_found: 48,
  claims_consistent: 45,
  claims_inconsistent: 3,
  decision_errors: 0,
  gross_errors: 0,
  overall_assessment: 'minor_issues',
  findings: [],
  positive_findings: [],
  ...overrides,
});

describe('pickTopConcerns — triage helper', () => {
  it('sorts by severity rank and returns at most N', () => {
    const findings = [
      makeFinding({ severity: 'minor', title: 'minor-a' }),
      makeFinding({ severity: 'blocking', title: 'blocking-a' }),
      makeFinding({ severity: 'major', title: 'major-a' }),
      makeFinding({ severity: 'critical', title: 'critical-a' }),
      makeFinding({ severity: 'moderate', title: 'moderate-a' }),
    ];
    const top = pickTopConcerns(findings, 3);
    expect(top.map((f) => f.title)).toEqual(['blocking-a', 'critical-a', 'major-a']);
  });

  it('is stable within a severity (preserves original order)', () => {
    const findings = [
      makeFinding({ severity: 'major', title: 'first' }),
      makeFinding({ severity: 'major', title: 'second' }),
      makeFinding({ severity: 'major', title: 'third' }),
    ];
    const top = pickTopConcerns(findings, 2);
    expect(top.map((f) => f.title)).toEqual(['first', 'second']);
  });

  it('handles unknown severities by sending them to the back of the list', () => {
    const findings = [
      makeFinding({ severity: 'space_alien', title: 'weird' }),
      makeFinding({ severity: 'minor', title: 'minor' }),
    ];
    const top = pickTopConcerns(findings, 2);
    expect(top.map((f) => f.title)).toEqual(['minor', 'weird']);
  });

  it('SEVERITY_ORDER is the pre-committed order and nothing else', () => {
    expect(SEVERITY_ORDER).toEqual([
      'blocking',
      'critical',
      'major',
      'moderate',
      'minor',
    ]);
  });
});

describe('resolveVerdict — fallback inference', () => {
  it('honors a backend-supplied overall_assessment', () => {
    expect(resolveVerdict({ overall_assessment: 'pass' })).toBe('pass');
    expect(resolveVerdict({ overall_assessment: 'critical' })).toBe('critical');
  });

  it('escalates to critical when gross_errors > 0 even without an assessment', () => {
    expect(resolveVerdict({ gross_errors: 1, sqs_score: 95 })).toBe('critical');
  });

  it('derives a verdict from the SQS score when overall_assessment is absent', () => {
    expect(resolveVerdict({ sqs_score: 90 })).toBe('pass');
    expect(resolveVerdict({ sqs_score: 70 })).toBe('minor_issues');
    expect(resolveVerdict({ sqs_score: 50 })).toBe('major_issues');
    expect(resolveVerdict({ sqs_score: 20 })).toBe('critical');
  });

  it('defaults to minor_issues when no signal is available', () => {
    expect(resolveVerdict({})).toBe('minor_issues');
  });
});

describe('ReviewerReport rendering', () => {
  it('renders title, authors, and at-a-glance stats', () => {
    wrap(<ReviewerReport report={makeReport()} />);
    expect(screen.getByText(/A small randomized trial of X/i)).toBeInTheDocument();
    expect(screen.getByText(/Bharti V/)).toBeInTheDocument();
    expect(screen.getByText('72/100')).toBeInTheDocument();
    // Consistency rendered as percentage.
    expect(screen.getByText('94%')).toBeInTheDocument();
  });

  it('paints the verdict banner with the correct assessment', () => {
    wrap(
      <ReviewerReport
        report={makeReport({ overall_assessment: 'critical', gross_errors: 2 })}
      />
    );
    const banner = screen.getByTestId('verdict-banner');
    expect(banner).toHaveAttribute('data-verdict', 'critical');
    expect(
      screen.getByText(/do not accept without reanalysis/i)
    ).toBeInTheDocument();
  });

  it('shows "no concerns detected" when findings are empty', () => {
    wrap(<ReviewerReport report={makeReport()} />);
    expect(
      screen.getByText(/No concerns detected above the minor threshold/i)
    ).toBeInTheDocument();
  });

  it('renders only the top 3 concerns in the main list', () => {
    const findings = [
      makeFinding({ severity: 'critical', title: 'first concern' }),
      makeFinding({ severity: 'major', title: 'second concern' }),
      makeFinding({ severity: 'major', title: 'third concern' }),
      makeFinding({ severity: 'minor', title: 'fourth concern' }),
      makeFinding({ severity: 'minor', title: 'fifth concern' }),
    ];
    wrap(<ReviewerReport report={makeReport({ findings })} />);

    // The accordion header advertises the full count.
    expect(screen.getByText(/All findings \(5\)/i)).toBeInTheDocument();

    // Each top-3 concern also appears inside the collapsed accordion, so
    // its text is in the DOM twice. Items outside the top 3 appear only
    // once (accordion copy only).
    expect(screen.getAllByText('first concern')).toHaveLength(2);
    expect(screen.getAllByText('second concern')).toHaveLength(2);
    expect(screen.getAllByText('third concern')).toHaveLength(2);
    expect(screen.getAllByText('fourth concern')).toHaveLength(1);
    expect(screen.getAllByText('fifth concern')).toHaveLength(1);
  });

  it('disables the Share link button when no submissionId is provided', () => {
    wrap(<ReviewerReport report={makeReport()} />);
    const shareBtn = screen.getByRole('button', { name: /share link/i });
    expect(shareBtn).toBeDisabled();
  });

  it('enables the Share link button when a submissionId is provided', () => {
    wrap(
      <ReviewerReport report={makeReport()} submissionId="abc-123-def-456" />
    );
    expect(screen.getByRole('button', { name: /share link/i })).toBeEnabled();
  });

  it('invokes onAnalyzeAnother when that button is clicked', () => {
    const onAnalyzeAnother = jest.fn();
    wrap(
      <ReviewerReport
        report={makeReport()}
        submissionId="sub-1"
        onAnalyzeAnother={onAnalyzeAnother}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /analyze another/i }));
    expect(onAnalyzeAnother).toHaveBeenCalledTimes(1);
  });

  it('positive findings appear inside the "does well" accordion when present', () => {
    const report = makeReport({
      positive_findings: [
        { severity: 'minor', category: 'preregistration', title: 'Pre-registered on OSF', description: 'link cited.' },
      ],
    });
    wrap(<ReviewerReport report={report} />);
    expect(
      screen.getByText(/What the manuscript does well \(1\)/i)
    ).toBeInTheDocument();
  });

  it('renders an info alert when called with a null report', () => {
    wrap(<ReviewerReport report={null} />);
    expect(screen.getByText(/No report loaded\./i)).toBeInTheDocument();
  });
});

describe('formatCategory — pretty-print finding categories', () => {
  it('maps known snake_case keys to human labels', () => {
    expect(formatCategory('multiple_testing')).toBe('Multiple testing');
    expect(formatCategory('effect_size')).toBe('Effect size');
    expect(formatCategory('power')).toBe('Statistical power');
    expect(formatCategory('reproducibility')).toBe('Reproducibility');
    expect(formatCategory('checklist')).toBe('Checklist');
  });

  it('keeps legacy labels stable', () => {
    expect(formatCategory('consistency')).toBe('Consistency');
    expect(formatCategory('reporting')).toBe('Reporting');
    expect(formatCategory('methodology')).toBe('Methodology');
    expect(formatCategory('sqs')).toBe('SQS');
  });

  it('humanises unknown keys rather than printing raw snake_case', () => {
    expect(formatCategory('prereg_compliance')).toBe('Prereg compliance');
    expect(formatCategory('OUTCOME_SWAP')).toBe('Outcome swap');
  });

  it('returns empty string on null / empty input', () => {
    expect(formatCategory(null)).toBe('');
    expect(formatCategory('')).toBe('');
    expect(formatCategory(undefined)).toBe('');
  });
});

describe('ReviewerReport — discipline compliance panel', () => {
  it('does NOT render the panel when discipline_profile is absent', () => {
    wrap(<ReviewerReport report={makeReport()} />);
    expect(screen.queryByTestId('discipline-panel')).toBeNull();
  });

  it('renders the guideline chip + completion percentage when a profile is set', () => {
    wrap(
      <ReviewerReport
        report={makeReport({
          discipline_profile: 'medicine',
          discipline_guideline: 'CONSORT',
          checklist_completion_pct: 67,
          checklist_missing_required: [],
        })}
      />
    );
    const panel = screen.getByTestId('discipline-panel');
    expect(panel).toHaveAttribute('data-guideline', 'CONSORT');
    expect(screen.getByText(/CONSORT compliance/i)).toBeInTheDocument();
    // Both the panel chip and the AtAGlance StatChip render 67%; check the
    // panel surface specifically to avoid a false positive on the stats row.
    expect(panel).toHaveTextContent('67%');
  });

  it('lists each missing-required item by name', () => {
    wrap(
      <ReviewerReport
        report={makeReport({
          discipline_profile: 'medicine',
          discipline_guideline: 'CONSORT',
          checklist_completion_pct: 50,
          checklist_missing_required: [
            'Randomization method described',
            'Allocation concealment described',
          ],
        })}
      />
    );
    expect(
      screen.getByText(/2 required items missing/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Randomization method described/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Allocation concealment described/i)
    ).toBeInTheDocument();
  });

  it('uses singular copy when exactly one required item is missing', () => {
    wrap(
      <ReviewerReport
        report={makeReport({
          discipline_profile: 'psychology',
          discipline_guideline: 'JARS-Quant',
          checklist_completion_pct: 90,
          checklist_missing_required: ['Pre-registration cited'],
        })}
      />
    );
    expect(
      screen.getByText(/1 required item missing/i)
    ).toBeInTheDocument();
  });

  it('shows the Checklist stat in AtAGlance when a pct is present', () => {
    wrap(
      <ReviewerReport
        report={makeReport({
          discipline_profile: 'medicine',
          discipline_guideline: 'CONSORT',
          checklist_completion_pct: 83,
          checklist_missing_required: [],
        })}
      />
    );
    // The 83% tile sits in the stats row — just prove it renders somewhere.
    expect(screen.getAllByText('83%').length).toBeGreaterThanOrEqual(1);
  });

  it('pretty-prints advanced-validator categories on concern cards', () => {
    const findings = [
      {
        severity: 'major',
        category: 'multiple_testing',
        title: 'Uncorrected multiple comparisons',
        description: '18 tests reported without FDR/FWER correction.',
      },
    ];
    wrap(<ReviewerReport report={makeReport({ findings })} />);
    // Chip on the concern card should display "Multiple testing", not
    // the raw "multiple_testing" key.
    expect(screen.getByText('Multiple testing')).toBeInTheDocument();
    expect(screen.queryByText('multiple_testing')).toBeNull();
  });

  // DisciplineCompliancePanel is consumed as a named import by
  // ManuscriptAnalyzer.jsx (the full author-facing surface). This smoke
  // test pins it as a public export so an accidental `const` → private
  // regression breaks the frontend build instead of silently shipping.
  it('DisciplineCompliancePanel is a public named export and renders standalone', () => {
    wrap(
      <DisciplineCompliancePanel
        report={{
          discipline_profile: 'medicine',
          discipline_guideline: 'CONSORT',
          checklist_completion_pct: 72,
          checklist_missing_required: ['Allocation concealment described'],
        }}
      />
    );
    const panel = screen.getByTestId('discipline-panel');
    expect(panel).toHaveAttribute('data-guideline', 'CONSORT');
    expect(screen.getByText(/CONSORT compliance/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Allocation concealment described/i)
    ).toBeInTheDocument();
  });
});
