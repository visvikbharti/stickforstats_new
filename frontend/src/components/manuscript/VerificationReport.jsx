/**
 * VerificationReport — render the multi-file verifier response.
 * =============================================================
 * Presentational sibling of ManuscriptAnalyzer's report dashboard, but for the
 * raw-data verification surface (POST /api/v1/verify/bundle/). It renders the
 * paper-level VerificationProfile, the per-claim verdicts with cross-reference
 * provenance, the per-file ingestion report, and — prominently — the
 * citation-content conflicts (the highest-value output).
 *
 * Consumes the backend contract from `backend/api/v1/verify_views.py`
 * (VerifyBundleView) verbatim; it does NOT mutate or re-shape it. The
 * `certify_note` is always shown (honest-framing project invariant).
 *
 * Pure component: all view state (the verdict filter) lives here; sub-components
 * are stateless per the project's "no hooks in sub-components" rule.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import {
  ExpandMore,
  ReportProblem,
  CheckCircleOutline,
  InsertDriveFile,
  TableChart,
  Image as ImageIcon,
  HelpOutline,
  Link as LinkIcon,
  VerifiedUser,
  Gavel,
} from '@mui/icons-material';

// ---------------------------------------------------------------------------
// Verdict taxonomy (mirrors backend core/manuscript/verdicts.py:Verdict)
// ---------------------------------------------------------------------------

/**
 * Per-verdict display metadata. `color` is a valid MUI Chip/severity color.
 * Descriptions are faithful to the backend's own semantics.
 */
export const VERDICT_META = {
  VERIFIED: {
    label: 'Verified',
    color: 'success',
    description:
      'Data were found and re-running the authors’ test reproduced the reported statistic within tolerance.',
  },
  DISCREPANT: {
    label: 'Discrepant',
    color: 'error',
    description: 'Data were found, but re-analysis materially disagrees with the reported numbers.',
  },
  ASSUMPTION_VIOLATED: {
    label: 'Assumption violated',
    color: 'error',
    description: 'Data were found and the used test’s assumptions fail (regardless of p-match).',
  },
  ASSUMPTION_UNREPORTED: {
    label: 'Assumption unreported',
    color: 'warning',
    description:
      'A test requiring assumption checks was used, but no such check is reported in the text.',
  },
  INCONSISTENT_REPORTING: {
    label: 'Inconsistent reporting',
    color: 'warning',
    description:
      'Internal inconsistency between the reported statistic, df, and p (statcheck-style). A secondary signal.',
  },
  INSUFFICIENT_DATA: {
    label: 'Insufficient data',
    color: 'default',
    description:
      'The underlying data were unavailable or not linkable, so the claim could not be verified. This is a normal, honest outcome — not a failure.',
  },
  UNVERIFIABLE_EXTRACTION: {
    label: 'Unverifiable extraction',
    color: 'default',
    description: 'The claim could not be reliably extracted, so nothing is asserted about it.',
  },
};

/** Display order for the distribution bar / table grouping (worst-to-neutral). */
export const VERDICT_ORDER = [
  'DISCREPANT',
  'ASSUMPTION_VIOLATED',
  'ASSUMPTION_UNREPORTED',
  'INCONSISTENT_REPORTING',
  'VERIFIED',
  'INSUFFICIENT_DATA',
  'UNVERIFIABLE_EXTRACTION',
];

/** Verdict metadata with a safe fallback for an unknown/new verdict string. */
export function verdictMeta(verdict) {
  return (
    VERDICT_META[verdict] || {
      label: verdict || 'Unknown',
      color: 'default',
      description: '',
    }
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers (exported for tests)
// ---------------------------------------------------------------------------

/** Format a fraction (0..1) as a percentage string, or 'N/A' for null/NaN. */
export function formatPercent(fraction) {
  if (fraction == null || Number.isNaN(Number(fraction))) return 'N/A';
  return `${(Number(fraction) * 100).toFixed(1)}%`;
}

/** Format a p-value for display (scientific for very small, em-dash for missing). */
export function formatP(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  return n.toFixed(4);
}

/** Format a generic numeric statistic for display. */
export function formatStat(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3);
}

/**
 * Is this claim a citation-content conflict? (plan §3.4)
 * A conflict is flagged either by the linker (`provenance.link_method === 'conflict'`)
 * or by a human-readable note ("citation-content conflict: ...").
 */
export function isConflictClaim(claim) {
  if (!claim) return false;
  const linkMethod = claim.provenance && claim.provenance.link_method;
  if (linkMethod === 'conflict') return true;
  // Match the backend's conflict signals (verify_pipeline.py): the explicit
  // "citation-content conflict: …" note AND any "data link: …conflict…" reason,
  // so the panel can't disagree with report.n_citation_conflicts.
  return (claim.notes || []).some((n) => String(n).toLowerCase().includes('conflict'));
}

/** Resolve a verdict color name to a concrete theme palette value (for the bar). */
function verdictColorValue(colorName, theme) {
  if (!colorName || colorName === 'default') {
    return (theme.palette.grey && theme.palette.grey[400]) || theme.palette.text.disabled || '#9e9e9e';
  }
  return (theme.palette[colorName] && theme.palette[colorName].main) || theme.palette.text.disabled;
}

const KIND_ICON = {
  manuscript: <InsertDriveFile fontSize="small" />,
  data: <TableChart fontSize="small" />,
  image: <ImageIcon fontSize="small" />,
  unknown: <HelpOutline fontSize="small" />,
};

// ---------------------------------------------------------------------------
// Sub-component: verdict distribution bar
// ---------------------------------------------------------------------------

function VerdictDistribution({ distribution, total, theme }) {
  const present = VERDICT_ORDER.filter((v) => (distribution[v] || 0) > 0);
  // include any unexpected/new verdict keys the backend might add
  const extras = Object.keys(distribution).filter(
    (v) => !VERDICT_ORDER.includes(v) && (distribution[v] || 0) > 0
  );
  const ordered = [...present, ...extras];

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No verifiable statistical claims were extracted from this bundle.
      </Typography>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: 14,
          borderRadius: 1,
          overflow: 'hidden',
          mb: 1.5,
        }}
        data-testid="verdict-distribution-bar"
        aria-hidden="true"
      >
        {ordered.map((v) => {
          const count = distribution[v] || 0;
          const meta = verdictMeta(v);
          const pct = (count / total) * 100;
          return (
            <Tooltip key={v} title={`${meta.label}: ${count} (${pct.toFixed(0)}%)`} arrow>
              <Box
                sx={{
                  width: `${pct}%`,
                  backgroundColor: verdictColorValue(meta.color, theme),
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {ordered.map((v) => {
          const meta = verdictMeta(v);
          return (
            <Tooltip key={v} title={meta.description} arrow>
              <Chip
                size="small"
                label={`${meta.label}: ${distribution[v] || 0}`}
                color={meta.color === 'default' ? 'default' : meta.color}
                variant={meta.color === 'default' ? 'outlined' : 'filled'}
              />
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: a single stat tile
// ---------------------------------------------------------------------------

function StatTile({ label, value, hint, accent }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, lineHeight: 1.1, color: accent || 'text.primary' }}
        >
          {value}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.5, textTransform: 'uppercase', letterSpacing: 0.4 }}
        >
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: summary card (header)
// ---------------------------------------------------------------------------

function SummaryCard({ report, theme }) {
  const total = report.n_claims || 0;
  const distribution = report.verdict_distribution || {};
  const conflicts = report.n_citation_conflicts || 0;
  const resolved = report.n_references_resolved || 0;
  const decisionChanging = report.n_decision_changing || 0;
  const inconsistent = report.n_inconsistent_reporting || 0;

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }} data-testid="verification-summary">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <VerifiedUser color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Verification Summary
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatTile label="Claims checked" value={total} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatTile
            label="Verifiability rate"
            value={formatPercent(report.verifiability_rate)}
            hint="claims we could attempt"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatTile
            label="Coverage"
            value={formatPercent(report.coverage)}
            hint={report.low_coverage ? 'low — read with care' : 'extraction recall'}
            accent={report.low_coverage ? theme.palette.warning.main : undefined}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatTile label="Recomputable" value={report.n_checkable || 0} hint="internal-consistency denominator" />
        </Grid>
      </Grid>

      {/* badges row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Chip
          icon={<LinkIcon />}
          variant="outlined"
          label={`References resolved: ${resolved}`}
        />
        <Chip
          icon={<ReportProblem />}
          color={conflicts > 0 ? 'error' : 'default'}
          variant={conflicts > 0 ? 'filled' : 'outlined'}
          label={`Citation–content conflicts: ${conflicts}`}
          data-testid="conflict-badge"
        />
        <Chip
          variant="outlined"
          color={inconsistent > 0 ? 'warning' : 'default'}
          label={`Inconsistent reporting: ${inconsistent}`}
        />
        <Chip
          variant="outlined"
          color={decisionChanging > 0 ? 'error' : 'default'}
          label={`Decision-changing: ${decisionChanging}`}
        />
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        Verdict distribution
      </Typography>
      <VerdictDistribution distribution={distribution} total={total} theme={theme} />
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: certify note (mandatory honest-framing box)
// ---------------------------------------------------------------------------

// Canonical fallback mirroring backend verify_pipeline.CERTIFY_NOTE, so the
// honest-framing disclaimer is shown UNCONDITIONALLY even if a payload omits it.
const DEFAULT_CERTIFY_NOTE =
  'This report checks the internal consistency of the reported statistics and, where raw data were ' +
  'available, re-runs the authors’ tests and audits their assumptions. It does NOT certify the ' +
  'scientific validity, design, or conclusions of the study. Claims marked INSUFFICIENT_DATA could ' +
  'not be verified because the underlying data were unavailable or not linkable. ' +
  'ASSUMPTION_UNREPORTED means only that the manuscript does not state that a required assumption ' +
  'was checked — it is a statement about DISCLOSURE, not about the data: the assumption may well ' +
  'hold, and the result may well be correct. It is raised only when the paper names its test ' +
  'explicitly; where the design is not stated, no claim is made.';

function CertifyNote({ note }) {
  return (
    <Alert severity="info" icon={<Gavel fontSize="small" />} sx={{ mb: 3 }} data-testid="certify-note">
      <AlertTitle sx={{ fontWeight: 600 }}>What this report does — and does not — certify</AlertTitle>
      {note || DEFAULT_CERTIFY_NOTE}
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: conflict panel (surfaced first; highest-value output)
// ---------------------------------------------------------------------------

function ConflictPanel({ conflicts }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }} data-testid="conflict-panel">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <ReportProblem color={conflicts.length > 0 ? 'error' : 'disabled'} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Citation–content conflicts ({conflicts.length})
        </Typography>
      </Box>

      {conflicts.length === 0 ? (
        <Alert severity="success" icon={<CheckCircleOutline fontSize="small" />}>
          No citation–content conflicts detected — every claim whose data file was selected by its
          own citation reproduced as cited.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The author cited a specific data file/table for these claims, but re-running that data did
            not reproduce the reported result. These are the highest-priority items to inspect.
          </Typography>
          {conflicts.map((claim) => {
            const prov = claim.provenance || {};
            const conflictNotes = (claim.notes || []).filter((n) =>
              String(n).toLowerCase().includes('conflict')
            );
            return (
              <Alert
                key={claim.claim_id}
                severity="error"
                sx={{ mb: 1.5 }}
                data-testid={`conflict-${claim.claim_id}`}
              >
                <AlertTitle sx={{ fontWeight: 600 }}>
                  {claim.claim_id}
                  {prov.resolved_reference ? ` — cited ${prov.resolved_reference}` : ''}
                </AlertTitle>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {claim.claim_text || '(no claim text)'}
                </Typography>
                {(prov.extraction_method === 'ocr' || prov.extraction_method === 'vision') && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`${prov.extraction_method.toUpperCase()} extraction — lower confidence`}
                    sx={{ mb: 1 }}
                  />
                )}
                <Typography variant="body2" sx={{ mb: conflictNotes.length ? 1 : 0 }}>
                  Reported p {formatP(claim.claimed && claim.claimed.p_value)} vs recomputed p{' '}
                  {formatP(claim.recomputed && claim.recomputed.p_value)}.
                </Typography>
                {conflictNotes.map((n, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                    {n}
                  </Typography>
                ))}
              </Alert>
            );
          })}
        </>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ingestion report (collapsible per-file table)
// ---------------------------------------------------------------------------

function fileSizeHint(file) {
  if (file.kind === 'data') return `${file.n_rows} × ${file.n_cols}`;
  if (file.chars) return `${file.chars.toLocaleString()} chars`;
  return '—';
}

export function IngestionReport({ ingestion, defaultExpanded = false }) {
  if (!ingestion) return null;
  const files = ingestion.files || [];
  const warnings = ingestion.warnings || [];

  return (
    <Accordion variant="outlined" defaultExpanded={defaultExpanded} sx={{ mb: 3 }} data-testid="ingestion-report">
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <InsertDriveFile fontSize="small" color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Ingestion report
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ingestion.n_files} file{ingestion.n_files === 1 ? '' : 's'} ·{' '}
            {ingestion.n_manuscript_files} manuscript · {ingestion.n_data_files} data ·{' '}
            {ingestion.n_image_files} image
            {ingestion.n_unknown ? ` · ${ingestion.n_unknown} unsupported` : ''}
            {ingestion.ocr_used ? ' · OCR used' : ''}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {warnings.map((w, i) => (
              <Typography key={i} variant="body2">
                {w}
              </Typography>
            ))}
          </Alert>
        )}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Per-file ingestion report">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>File</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Kind</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Used as</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((f, idx) => (
                <TableRow key={`${f.name}-${idx}`}>
                  <TableCell sx={{ maxWidth: 240, wordBreak: 'break-word' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {KIND_ICON[f.kind] || KIND_ICON.unknown}
                      <span>{f.name}</span>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={f.kind === 'unknown' ? 'default' : 'primary'}
                      label={f.kind}
                    />
                  </TableCell>
                  <TableCell>
                    {f.ok ? (
                      <Typography variant="body2">
                        {(f.role || '').replace(/_/g, ' ') || 'processed'}
                        {f.ocr_used ? ' (OCR)' : ''}
                      </Typography>
                    ) : (
                      <Chip size="small" color="default" variant="outlined" label="skipped" />
                    )}
                  </TableCell>
                  <TableCell>{fileSizeHint(f)}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    {f.error && (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                        {f.error}
                      </Typography>
                    )}
                    {(f.warnings || []).map((w, i) => (
                      <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {w}
                      </Typography>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: provenance cell
// ---------------------------------------------------------------------------

function ProvenanceCell({ claim }) {
  const prov = claim.provenance || {};
  const cited = prov.cited_references || [];
  const method = prov.link_method;
  const extraction = prov.extraction_method || 'text';
  const lowConfidence = extraction === 'ocr' || extraction === 'vision';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {prov.source_file && (
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          {prov.source_file}
        </Typography>
      )}
      {cited.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {cited.map((ref, i) => (
            <Chip key={i} size="small" variant="outlined" icon={<LinkIcon />} label={ref} />
          ))}
        </Box>
      )}
      {prov.resolved_reference && (
        <Typography variant="caption" color="text.secondary">
          {'→ '}
          {prov.resolved_reference}
          {prov.resolution_confidence != null
            ? ` (conf ${Number(prov.resolution_confidence).toFixed(2)})`
            : ''}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {method && (
          <Chip
            size="small"
            variant="outlined"
            color={method === 'conflict' ? 'error' : 'default'}
            label={method}
          />
        )}
        {lowConfidence && (
          <Tooltip title={`Claim text extracted via ${extraction.toUpperCase()} — treat as lower confidence.`} arrow>
            <Chip size="small" color="warning" variant="outlined" label={extraction.toUpperCase()} />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: claims table
// ---------------------------------------------------------------------------

function ClaimsTable({ claims, theme }) {
  if (!claims || claims.length === 0) {
    return <Alert severity="info">No claims to display for the selected filter.</Alert>;
  }

  return (
    <TableContainer component={Paper} variant="outlined" data-testid="claims-table">
      <Table size="small" aria-label="Per-claim verdicts">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Verdict</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Claim</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Reported p</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Recomputed p</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Provenance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {claims.map((claim, idx) => {
            const meta = verdictMeta(claim.verdict);
            const conflict = isConflictClaim(claim);
            return (
              <TableRow
                key={claim.claim_id || idx}
                data-testid={`claim-row-${claim.claim_id}`}
                data-verdict={claim.verdict}
                data-conflict={conflict ? 'true' : 'false'}
                sx={
                  conflict
                    ? { backgroundColor: `${theme.palette.error.main}14` }
                    : undefined
                }
              >
                <TableCell>
                  <Tooltip title={meta.description} arrow>
                    <Chip
                      size="small"
                      label={meta.label}
                      color={meta.color === 'default' ? 'default' : meta.color}
                      variant={meta.color === 'default' ? 'outlined' : 'filled'}
                    />
                  </Tooltip>
                  {conflict && (
                    <Chip
                      size="small"
                      color="error"
                      icon={<ReportProblem />}
                      label="conflict"
                      sx={{ ml: 0.5 }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 360 }}>
                  <Typography variant="body2" sx={{ mb: claim.recomputed && claim.recomputed.test ? 0.25 : 0 }}>
                    {claim.claim_text || '—'}
                  </Typography>
                  {claim.recomputed && claim.recomputed.test && (
                    <Typography variant="caption" color="text.secondary">
                      re-ran: {claim.recomputed.test}
                      {claim.recomputed.statistic != null
                        ? `, stat ${formatStat(claim.recomputed.statistic)}`
                        : ''}
                    </Typography>
                  )}
                  {claim.test_failed && claim.test_failure_reason && (
                    <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                      {claim.test_failure_reason}
                    </Typography>
                  )}
                  {/*
                    Methodological appropriateness findings. These are ADVISORY and never move a
                    verdict — a verdict answers "do these numbers reproduce", a finding answers
                    "was this the right test" — so they render beside the claim rather than as
                    part of its verdict chip. Until now they reached the API and the database and
                    stopped there, which for a finding addressed to an author is the same as not
                    existing.
                  */}
                  {(claim.appropriateness || []).map((finding, i) => (
                    <Tooltip
                      key={i}
                      arrow
                      title={
                        <>
                          <div>{finding.description}</div>
                          {finding.evidence ? <div><em>“{finding.evidence}”</em></div> : null}
                          <div>{finding.recommendation}</div>
                          <div style={{ opacity: 0.8 }}>{finding.citation}</div>
                        </>
                      }
                    >
                      <Chip
                        size="small"
                        icon={<Gavel fontSize="inherit" />}
                        label={finding.title}
                        color="warning"
                        variant="outlined"
                        sx={{ mt: 0.5, maxWidth: '100%' }}
                      />
                    </Tooltip>
                  ))}
                  {/*
                    Coverage, keyed on there being something to SAY: a non-empty
                    `not_evaluated` list. A claim reading "assumptions satisfied" while a
                    quarter of them were never looked at is the exact shape this whole arc was
                    about.

                    This deliberately does NOT also require `assumptions.checked`. That guard
                    was in the first version and mutation testing killed it: a report where
                    Guardian examined NOTHING has `checked: false` with a non-empty
                    `not_evaluated` (the cox_regression / survival / iv / psm shape), so the
                    guard hid the caption in precisely the case coverage matters most. Claims
                    that never reached Guardian have an empty list and stay quiet anyway.
                  */}
                  {claim.assumptions &&
                    (claim.assumptions.not_evaluated || []).length > 0 && (
                      <Tooltip
                        arrow
                        title={
                          `Not examined on this data: ` +
                          `${(claim.assumptions.not_evaluated || []).join(', ').replace(/_/g, ' ')}. ` +
                          `Unverified is not the same as satisfied.`
                        }
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.25 }}
                        >
                          <HelpOutline fontSize="inherit" sx={{ verticalAlign: 'text-bottom' }} />{' '}
                          assumption coverage{' '}
                          {claim.assumptions.coverage != null
                            ? `${Math.round(claim.assumptions.coverage * 100)}%`
                            : '—'}{' '}
                          ({(claim.assumptions.not_evaluated || []).length} not examined)
                        </Typography>
                      </Tooltip>
                    )}
                </TableCell>
                <TableCell>{formatP(claim.claimed && claim.claimed.p_value)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {formatP(claim.recomputed && claim.recomputed.p_value)}
                    {claim.match && claim.match.p_value === false && (
                      <Tooltip title="recomputed p does not match the reported p" arrow>
                        <ReportProblem fontSize="inherit" color="error" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <ProvenanceCell claim={claim} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function VerificationReport({ report }) {
  const theme = useTheme();
  const [verdictFilter, setVerdictFilter] = useState('ALL');

  const claims = useMemo(() => report?.claims || [], [report]);
  const conflicts = useMemo(() => claims.filter(isConflictClaim), [claims]);

  const presentVerdicts = useMemo(() => {
    const order = [...VERDICT_ORDER];
    const seen = Object.keys(report?.verdict_distribution || {});
    seen.forEach((v) => {
      if (!order.includes(v)) order.push(v);
    });
    return order.filter((v) => (report?.verdict_distribution || {})[v] > 0);
  }, [report]);

  const filteredClaims = useMemo(
    () => (verdictFilter === 'ALL' ? claims : claims.filter((c) => c.verdict === verdictFilter)),
    [claims, verdictFilter]
  );

  if (!report) {
    return <Alert severity="info">No verification report loaded.</Alert>;
  }

  return (
    <Box data-testid="verification-report">
      <SummaryCard report={report} theme={theme} />

      <CertifyNote note={report.certify_note} />

      {/* Conflicts surfaced first (highest-value output) */}
      <ConflictPanel conflicts={conflicts} />

      <IngestionReport ingestion={report.ingestion} />

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Per-claim verdicts ({claims.length})
        </Typography>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="verdict-filter-label">Filter by verdict</InputLabel>
          <Select
            labelId="verdict-filter-label"
            value={verdictFilter}
            label="Filter by verdict"
            onChange={(e) => setVerdictFilter(e.target.value)}
          >
            <MenuItem value="ALL">All verdicts ({claims.length})</MenuItem>
            {presentVerdicts.map((v) => (
              <MenuItem key={v} value={v}>
                {verdictMeta(v).label} ({report.verdict_distribution[v]})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <ClaimsTable claims={filteredClaims} theme={theme} />
    </Box>
  );
}

export default VerificationReport;
