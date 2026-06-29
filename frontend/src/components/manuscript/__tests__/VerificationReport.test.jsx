/**
 * VerificationReport Tests
 * ========================
 * Pins the contract of the multi-file verifier report surface:
 *   - the exported pure helpers (verdict metadata, percent/p formatting,
 *     citation-content-conflict detection),
 *   - the certify_note is always shown verbatim (honest-framing invariant),
 *   - the summary stats render from the paper-level profile,
 *   - the conflict panel surfaces a citation-content conflict,
 *   - an OCR-sourced (figure) claim is tagged as lower confidence,
 *   - the ingestion report lists every uploaded file,
 *   - a null report degrades to an explicit empty state.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';

import VerificationReport, {
  VERDICT_META,
  verdictMeta,
  formatPercent,
  formatP,
  formatStat,
  isConflictClaim,
} from '../VerificationReport';
import { getTheme } from '../../../theme';

const wrap = (ui) => render(<ThemeProvider theme={getTheme('light')}>{ui}</ThemeProvider>);

const CERTIFY =
  'This report checks the internal consistency of the reported statistics and, where raw data ' +
  'were available, re-runs the authors’ tests. It does NOT certify the scientific validity, ' +
  'design, or conclusions of the study.';

const makeClaim = (overrides = {}) => ({
  claim_id: 'C001',
  verdict: 'INSUFFICIENT_DATA',
  claim_text: 'An independent t-test showed a difference (t(38) = 2.10, p = 0.04).',
  recomputed: { test: null, statistic: null, p_value: null, effect_size: null, effect_name: null },
  claimed: { statistic: 2.1, p_value: 0.04, effect_size: null },
  match: { statistic: null, p_value: null, effect_size: null, deltas: {} },
  assumptions: { checked: false, satisfied: null, violations: [], reported_in_text: null },
  data_available: false,
  linked_dataset_id: null,
  confidence: { uncalibrated_engine: null, calibrated: null },
  test_failed: false,
  test_failure_reason: '',
  provenance: {
    section: 'Results',
    page: null,
    position: 10,
    source_file: 'manuscript.pdf',
    cited_references: [],
    resolved_reference: null,
    resolution_confidence: null,
    link_method: null,
    extraction_method: 'text',
  },
  notes: [],
  ...overrides,
});

const makeReport = (overrides = {}) => ({
  n_claims: 3,
  verdict_distribution: { VERIFIED: 1, DISCREPANT: 1, INSUFFICIENT_DATA: 1 },
  verifiability_rate: 0.667,
  coverage: 0.85,
  low_coverage: false,
  n_inconsistent_reporting: 0,
  n_checkable: 2,
  n_decision_changing: 0,
  n_references_resolved: 1,
  n_citation_conflicts: 1,
  certify_note: CERTIFY,
  claims: [
    makeClaim({ claim_id: 'C001', verdict: 'VERIFIED' }),
    makeClaim({ claim_id: 'C002', verdict: 'INSUFFICIENT_DATA' }),
  ],
  ingestion: {
    n_files: 3,
    n_manuscript_files: 1,
    n_data_files: 1,
    n_image_files: 1,
    n_unknown: 0,
    manuscript_chars: 12000,
    ocr_used: false,
    files: [
      { name: 'manuscript.pdf', kind: 'manuscript', detail: 'pdf', ok: true, role: 'manuscript_text', chars: 12000, n_rows: 0, n_cols: 0, ocr_used: false, warnings: [], error: '' },
      { name: 'data.csv', kind: 'data', detail: '.csv', ok: true, role: 'dataset', chars: 0, n_rows: 120, n_cols: 6, ocr_used: false, warnings: [], error: '' },
      { name: 'figure1.png', kind: 'image', detail: '.png', ok: true, role: 'ocr_text', chars: 40, n_rows: 0, n_cols: 0, ocr_used: true, warnings: [], error: '' },
    ],
    warnings: [],
  },
  run_id: 'run-123',
  report_token: 'tok-abc',
  report_url: '/api/v1/verify/report/run-123/?token=tok-abc',
  ...overrides,
});

const makeConflictClaim = () =>
  makeClaim({
    claim_id: 'C009',
    verdict: 'DISCREPANT',
    claim_text: 'Group A scored higher than group B (t(58) = 3.4, p = 0.001).',
    claimed: { statistic: 3.4, p_value: 0.001, effect_size: null },
    recomputed: { test: 'independent_t', statistic: 0.4, p_value: 0.69, effect_size: null, effect_name: null },
    match: { statistic: false, p_value: false, effect_size: null, deltas: {} },
    provenance: {
      section: 'Results',
      page: null,
      position: 5,
      source_file: 'manuscript.pdf',
      cited_references: ['Supplementary Table S3'],
      resolved_reference: 'Supplementary Table S3',
      resolution_confidence: 0.92,
      link_method: 'conflict',
      extraction_method: 'text',
    },
    notes: [
      'data link: reference-directed: cited Supplementary Table S3',
      'citation-content conflict: the data the author cites does NOT reproduce the claimed result',
    ],
  });

// ---------------------------------------------------------------------------

describe('verdict metadata helpers', () => {
  it('maps every backend verdict to a valid MUI color', () => {
    const valid = ['success', 'error', 'warning', 'info', 'default', 'primary', 'secondary'];
    Object.values(VERDICT_META).forEach((m) => {
      expect(valid).toContain(m.color);
      expect(m.label).toBeTruthy();
    });
  });

  it('VERIFIED is success and DISCREPANT is error', () => {
    expect(verdictMeta('VERIFIED').color).toBe('success');
    expect(verdictMeta('DISCREPANT').color).toBe('error');
  });

  it('falls back gracefully for an unknown verdict', () => {
    const m = verdictMeta('SOME_NEW_VERDICT');
    expect(m.label).toBe('SOME_NEW_VERDICT');
    expect(m.color).toBe('default');
  });
});

describe('formatting helpers', () => {
  it('formatPercent renders a fraction as a percentage and N/A for null', () => {
    expect(formatPercent(0.667)).toBe('66.7%');
    expect(formatPercent(1)).toBe('100.0%');
    expect(formatPercent(null)).toBe('N/A');
    expect(formatPercent(undefined)).toBe('N/A');
  });

  it('formatP handles missing, small (scientific), and ordinary p-values', () => {
    expect(formatP(null)).toBe('—');
    expect(formatP(0.04)).toBe('0.0400');
    expect(formatP(1.34e-35)).toBe('1.34e-35');
    expect(formatP(0)).toBe('0');
  });

  it('formatStat prints integers plainly and floats to 3 dp', () => {
    expect(formatStat(null)).toBe('—');
    expect(formatStat(38)).toBe('38');
    expect(formatStat(2.10456)).toBe('2.105');
  });
});

describe('isConflictClaim', () => {
  it('is true when link_method is "conflict"', () => {
    expect(isConflictClaim(makeClaim({ provenance: { link_method: 'conflict' } }))).toBe(true);
  });

  it('is true when a note mentions a citation-content conflict', () => {
    expect(
      isConflictClaim(makeClaim({ notes: ['citation-content conflict: data does not reproduce'] }))
    ).toBe(true);
  });

  it('is false for an ordinary claim', () => {
    expect(isConflictClaim(makeClaim())).toBe(false);
    expect(isConflictClaim(null)).toBe(false);
  });
});

describe('VerificationReport rendering', () => {
  it('renders the certify note verbatim (honest-framing invariant)', () => {
    wrap(<VerificationReport report={makeReport()} />);
    const note = screen.getByTestId('certify-note');
    expect(note).toHaveTextContent(/does NOT certify the scientific validity/i);
  });

  it('always shows a certify note, falling back to a default when the payload omits it', () => {
    wrap(<VerificationReport report={makeReport({ certify_note: '' })} />);
    expect(screen.getByTestId('certify-note')).toHaveTextContent(/does NOT certify/i);
  });

  it('flags an OCR-sourced conflict as lower confidence in the conflict panel', () => {
    const c = makeConflictClaim();
    c.provenance.extraction_method = 'ocr';
    wrap(<VerificationReport report={makeReport({ claims: [c] })} />);
    expect(screen.getByTestId('conflict-C009')).toHaveTextContent(/OCR extraction — lower confidence/i);
  });

  it('renders the paper-level summary stats', () => {
    wrap(<VerificationReport report={makeReport()} />);
    const summary = screen.getByTestId('verification-summary');
    expect(summary).toHaveTextContent('66.7%'); // verifiability rate
    expect(summary).toHaveTextContent('85.0%'); // coverage
    expect(within(summary).getByTestId('conflict-badge')).toHaveTextContent('Citation–content conflicts: 1');
  });

  it('surfaces a citation-content conflict in the conflict panel', () => {
    const report = makeReport({ claims: [makeConflictClaim(), makeClaim()] });
    wrap(<VerificationReport report={report} />);
    const panel = screen.getByTestId('conflict-panel');
    expect(panel).toHaveTextContent(/Citation–content conflicts \(1\)/i);
    expect(screen.getByTestId('conflict-C009')).toHaveTextContent(/Supplementary Table S3/i);
    expect(screen.getByTestId('conflict-C009')).toHaveTextContent(/does NOT reproduce/i);
  });

  it('shows the reassuring empty state when there are no conflicts', () => {
    const report = makeReport({ n_citation_conflicts: 0, claims: [makeClaim()] });
    wrap(<VerificationReport report={report} />);
    expect(screen.getByTestId('conflict-panel')).toHaveTextContent(/No citation–content conflicts detected/i);
  });

  it('tags an OCR-sourced claim as lower confidence', () => {
    const ocrClaim = makeClaim({
      claim_id: 'C050',
      provenance: { ...makeClaim().provenance, source_file: 'figure1.png', extraction_method: 'ocr' },
    });
    wrap(<VerificationReport report={makeReport({ claims: [ocrClaim] })} />);
    const row = screen.getByTestId('claim-row-C050');
    expect(within(row).getByText('OCR')).toBeInTheDocument();
  });

  it('marks the conflict row in the claims table', () => {
    const report = makeReport({ claims: [makeConflictClaim()] });
    wrap(<VerificationReport report={report} />);
    expect(screen.getByTestId('claim-row-C009')).toHaveAttribute('data-conflict', 'true');
  });

  it('lists every uploaded file in the ingestion report', () => {
    wrap(<VerificationReport report={makeReport()} />);
    const ingestion = screen.getByTestId('ingestion-report');
    expect(ingestion).toHaveTextContent('manuscript.pdf');
    expect(ingestion).toHaveTextContent('data.csv');
    expect(ingestion).toHaveTextContent('figure1.png');
  });

  it('renders an info alert when called with a null report', () => {
    wrap(<VerificationReport report={null} />);
    expect(screen.getByText(/No verification report loaded\./i)).toBeInTheDocument();
  });

  it('handles a sparse verdict_distribution and zero claims without crashing', () => {
    const report = makeReport({
      n_claims: 0,
      verdict_distribution: {},
      verifiability_rate: 0,
      coverage: null,
      n_checkable: 0,
      n_references_resolved: 0,
      n_citation_conflicts: 0,
      claims: [],
      ingestion: null,
    });
    wrap(<VerificationReport report={report} />);
    expect(screen.getByTestId('verification-summary')).toHaveTextContent('N/A'); // coverage null
    expect(screen.getByText(/No verifiable statistical claims were extracted/i)).toBeInTheDocument();
  });
});
