/**
 * ReviewerReport — Reviewer Mode (Pillar 2)
 * ==========================================
 *
 * Compact, editor-facing rendering of a ManuscriptReviewReport. Designed
 * to be absorbed in 60 seconds:
 *
 *   1. Verdict banner: traffic-light (green / yellow / red) + one line.
 *   2. At-a-glance stats: SQS score, consistency rate, decision / gross errors.
 *   3. Top 3 Concerns: triaged from `findings[]` by severity weight.
 *   4. What the manuscript does well: a collapsed summary of positive_findings.
 *   5. All findings: a collapsed accordion for editors who want the full list.
 *
 * Sibling component to `ManuscriptAnalyzer.jsx`, which is author-facing and
 * deliberately exposes the full 45-rule detail. Both consume the same
 * `/api/v1/manuscript/analyze/` payload; this one triages.
 */

import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Assignment as ChecklistIcon,
  CheckCircleOutline,
  ContentCopy,
  ErrorOutline,
  ExpandMore,
  InfoOutlined,
  Print as PrintIcon,
  Share as ShareIcon,
  Upload as UploadIcon,
  WarningAmber,
} from '@mui/icons-material';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Severity order matches ManuscriptAnalyzer.jsx. Lower index = higher priority.
export const SEVERITY_ORDER = [
  'blocking',
  'critical',
  'major',
  'moderate',
  'minor',
];

const SEVERITY_CFG = {
  blocking: { color: 'error', label: 'Blocking', Icon: ErrorOutline },
  critical: { color: 'error', label: 'Critical', Icon: ErrorOutline },
  major: { color: 'warning', label: 'Major', Icon: WarningAmber },
  moderate: { color: 'info', label: 'Moderate', Icon: InfoOutlined },
  minor: { color: 'info', label: 'Minor', Icon: InfoOutlined },
};

// Pretty-print finding categories. Backend emits snake_case keys like
// "multiple_testing" from the 7 advanced validators; the fallback below
// humanises anything not explicitly listed.
const CATEGORY_LABELS = {
  consistency: 'Consistency',
  reporting: 'Reporting',
  methodology: 'Methodology',
  sqs: 'SQS',
  multiple_testing: 'Multiple testing',
  effect_size: 'Effect size',
  power: 'Statistical power',
  reproducibility: 'Reproducibility',
  checklist: 'Checklist',
};

export const formatCategory = (cat) => {
  if (!cat) return '';
  const key = String(cat).toLowerCase();
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  // Fallback: underscore→space, capitalise first letter.
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Assessment → verdict card styling + copy.
const VERDICT_CFG = {
  pass: {
    color: 'success',
    Icon: CheckCircleOutline,
    headline: 'Pass — statistical quality meets reviewer expectations',
    body:
      'No blocking or critical issues were detected. Check the top concerns below for minor improvements.',
  },
  minor_issues: {
    color: 'info',
    Icon: InfoOutlined,
    headline: 'Minor issues — revisions recommended',
    body:
      'Statistical reporting is largely sound but has small gaps. Addressable in revision without new analyses.',
  },
  major_issues: {
    color: 'warning',
    Icon: WarningAmber,
    headline: 'Major issues — substantial revision needed',
    body:
      'Meaningful statistical problems were detected. Some may require reanalysis before the manuscript can progress.',
  },
  critical: {
    color: 'error',
    Icon: ErrorOutline,
    headline: 'Critical — do not accept without reanalysis',
    body:
      'Blocking-severity issues detected. Reject or require fundamental reanalysis before further review.',
  },
};

// ---------------------------------------------------------------------------
// Pure helpers (exported so tests can hit them directly)
// ---------------------------------------------------------------------------

/** Rank a severity string. Unknown severities sort after 'minor'. */
const severityRank = (sev) => {
  const idx = SEVERITY_ORDER.indexOf(String(sev || '').toLowerCase());
  return idx === -1 ? SEVERITY_ORDER.length : idx;
};

/** Triaged top-N findings. Stable-sorted: severity first, original order second. */
export const pickTopConcerns = (findings = [], n = 3) => {
  const indexed = findings.map((f, i) => ({ f, i }));
  indexed.sort((a, b) => {
    const sev = severityRank(a.f.severity) - severityRank(b.f.severity);
    return sev !== 0 ? sev : a.i - b.i;
  });
  return indexed.slice(0, n).map((x) => x.f);
};

/** Format a 0–100 SQS score as a compact string. */
const fmtScore = (v) =>
  typeof v === 'number' && Number.isFinite(v) ? `${Math.round(v)}/100` : '—';

/** Derive the verdict key from report fields. */
export const resolveVerdict = (report) => {
  const raw = String(report?.overall_assessment || '').toLowerCase();
  if (VERDICT_CFG[raw]) return raw;
  // Fallback: infer from score + gross errors.
  if ((report?.gross_errors ?? 0) > 0) return 'critical';
  const score = report?.sqs_score;
  if (typeof score === 'number') {
    if (score >= 75) return 'pass';
    if (score >= 60) return 'minor_issues';
    if (score >= 40) return 'major_issues';
    return 'critical';
  }
  return 'minor_issues';
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const VerdictBanner = ({ report }) => {
  const key = resolveVerdict(report);
  const cfg = VERDICT_CFG[key];
  const { Icon } = cfg;
  return (
    <Paper
      elevation={0}
      data-testid="verdict-banner"
      data-verdict={key}
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderLeft: 6,
        borderLeftColor: `${cfg.color}.main`,
        backgroundColor: `${cfg.color}.main`,
        color: `${cfg.color}.contrastText`,
      }}
    >
      <Icon sx={{ fontSize: 48, flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="h5" fontWeight={600} sx={{ lineHeight: 1.2 }}>
          {cfg.headline}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
          {cfg.body}
        </Typography>
      </Box>
    </Paper>
  );
};

const StatChip = ({ label, value, helperText, tone = 'default' }) => (
  <Tooltip title={helperText || ''} arrow placement="bottom" disableHoverListener={!helperText}>
    <Paper
      variant="outlined"
      sx={{ px: 2, py: 1.25, minWidth: 140, textAlign: 'left' }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        fontWeight={600}
        color={tone === 'default' ? 'text.primary' : `${tone}.main`}
        sx={{ mt: 0.25 }}
      >
        {value}
      </Typography>
    </Paper>
  </Tooltip>
);

const AtAGlance = ({ report }) => {
  const consistencyPct =
    typeof report?.consistency_rate === 'number'
      ? `${Math.round(report.consistency_rate * 100)}%`
      : '—';
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
      <StatChip
        label="SQS score"
        value={fmtScore(report?.sqs_score)}
        helperText="Statistical Quality Score — 45 reporting rules across 6 categories."
      />
      <StatChip
        label="Grade"
        value={report?.sqs_grade || '—'}
        helperText="Letter grade derived from the SQS percentage."
      />
      <StatChip
        label="Claims"
        value={
          report?.claims_found != null
            ? `${report.claims_consistent ?? 0}/${report.claims_found}`
            : '—'
        }
        helperText={`${report?.claims_consistent ?? 0} consistent, ${report?.claims_inconsistent ?? 0} inconsistent of ${report?.claims_found ?? 0} statistical claims extracted.`}
      />
      <StatChip
        label="Consistency"
        value={consistencyPct}
        helperText="Fraction of extracted statistical claims that pass STATCHECK-style recomputation."
      />
      <StatChip
        label="Decision errors"
        value={report?.decision_errors ?? '—'}
        tone={(report?.decision_errors ?? 0) > 0 ? 'warning' : 'default'}
        helperText="Reported p-value crosses a significance threshold that the recomputed value does not — the conclusion would flip."
      />
      <StatChip
        label="Gross errors"
        value={report?.gross_errors ?? '—'}
        tone={(report?.gross_errors ?? 0) > 0 ? 'error' : 'default'}
        helperText="Recomputed statistic differs from reported value by an order of magnitude or more."
      />
      {typeof report?.checklist_completion_pct === 'number' && (
        <StatChip
          label="Checklist"
          value={`${Math.round(report.checklist_completion_pct)}%`}
          tone={
            report.checklist_completion_pct >= 80
              ? 'success'
              : report.checklist_completion_pct >= 50
              ? 'warning'
              : 'error'
          }
          helperText={
            report?.discipline_guideline
              ? `Compliance with the ${report.discipline_guideline} reporting checklist.`
              : 'Discipline-specific reporting-checklist completion.'
          }
        />
      )}
    </Stack>
  );
};

const DisciplineCompliancePanel = ({ report }) => {
  const profile = report?.discipline_profile;
  const guideline = report?.discipline_guideline;
  const pct = report?.checklist_completion_pct;
  const missing = report?.checklist_missing_required || [];

  // If no discipline profile was applied (field='general' or unknown),
  // the panel is a no-op. Keeps the UI honest: we only make CONSORT-style
  // compliance claims when a profile was actually selected.
  if (!profile && pct == null) return null;

  const pctNum = typeof pct === 'number' && Number.isFinite(pct) ? pct : null;
  const tone = pctNum == null
    ? 'info'
    : pctNum >= 80 ? 'success' : pctNum >= 50 ? 'warning' : 'error';

  return (
    <Paper
      variant="outlined"
      data-testid="discipline-panel"
      data-guideline={guideline || ''}
      sx={{ p: 2.5 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <ChecklistIcon color={tone} />
        <Typography variant="subtitle1" fontWeight={600}>
          {guideline
            ? `${guideline} compliance`
            : 'Discipline checklist'}
        </Typography>
        {profile && (
          <Chip
            size="small"
            label={profile}
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        )}
        {pctNum != null && (
          <Chip
            size="small"
            label={`${Math.round(pctNum)}%`}
            color={tone}
            variant="outlined"
          />
        )}
      </Stack>

      {pctNum != null && (
        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(100, pctNum))}
          color={tone}
          sx={{ mb: missing.length > 0 ? 1.5 : 0, height: 6, borderRadius: 3 }}
        />
      )}

      {missing.length > 0 && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
          <AlertTitle sx={{ mb: 0.5 }}>
            {missing.length} required item{missing.length === 1 ? '' : 's'} missing
          </AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {missing.map((name) => (
              <li key={name}>
                <Typography variant="body2">{name}</Typography>
              </li>
            ))}
          </Box>
        </Alert>
      )}
    </Paper>
  );
};

const ConcernCard = ({ finding }) => {
  const cfg = SEVERITY_CFG[String(finding.severity).toLowerCase()] || SEVERITY_CFG.minor;
  const { Icon } = cfg;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderLeft: 4,
        borderLeftColor: `${cfg.color}.main`,
      }}
    >
      <Stack direction="row" spacing={1.5}>
        <Icon color={cfg.color} sx={{ mt: 0.25 }} />
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Chip size="small" label={cfg.label} color={cfg.color} variant="outlined" />
            {finding.category && (
              <Chip
                size="small"
                label={formatCategory(finding.category)}
                variant="outlined"
              />
            )}
          </Stack>
          <Typography variant="subtitle2" fontWeight={600}>
            {finding.title}
          </Typography>
          {finding.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {finding.description}
            </Typography>
          )}
          {finding.recommendation && (
            <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
              <strong>Recommendation:</strong> {finding.recommendation}
            </Alert>
          )}
          {finding.evidence && (
            <Typography
              variant="caption"
              color="text.secondary"
              component="pre"
              sx={{
                mt: 1,
                p: 1,
                background: 'background.subtle',
                borderRadius: 0.5,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
              }}
            >
              {finding.evidence}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ReviewerReport = ({ report, submissionId, onAnalyzeAnother }) => {
  const [snackbar, setSnackbar] = useState(null);
  const topConcerns = useMemo(
    () => pickTopConcerns(report?.findings || [], 3),
    [report]
  );
  const remainingCount = Math.max((report?.findings?.length || 0) - topConcerns.length, 0);

  if (!report) {
    return (
      <Alert severity="info" variant="outlined">
        No report loaded.
      </Alert>
    );
  }

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (!submissionId) {
      setSnackbar('No submission ID yet — analyze a manuscript first.');
      return;
    }
    const url = `${window.location.origin}/review/${submissionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setSnackbar(`Copied ${url}`);
    } catch {
      setSnackbar(url);
    }
  };

  return (
    <Stack spacing={2.5} className="reviewer-report" data-testid="reviewer-report">
      {/* Print CSS — hide action buttons and accordions-collapsed-state for print */}
      <style>{`
        @media print {
          .reviewer-action-bar { display: none !important; }
          .reviewer-report .MuiAccordion-root { page-break-inside: avoid; }
          .reviewer-report { color: #000; }
          .MuiPaper-root { box-shadow: none !important; border-color: #999 !important; }
        }
      `}</style>

      {/* Heading line — title + submission id */}
      <Box>
        <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {report.title || 'Untitled manuscript'}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
          {(report.authors || []).slice(0, 4).map((a, i) => (
            <Typography key={`${a}-${i}`} variant="body2" color="text.secondary">
              {a}{i < Math.min(report.authors.length, 4) - 1 ? ';' : ''}
            </Typography>
          ))}
          {(report.authors || []).length > 4 && (
            <Typography variant="body2" color="text.secondary">
              …and {report.authors.length - 4} more
            </Typography>
          )}
          {submissionId && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: 'monospace' }}
            >
              submission {submissionId.slice(0, 8)}
            </Typography>
          )}
        </Stack>
      </Box>

      <VerdictBanner report={report} />
      <AtAGlance report={report} />
      <DisciplineCompliancePanel report={report} />

      {/* Top concerns */}
      <Box>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          Top concerns
        </Typography>
        {topConcerns.length === 0 ? (
          <Alert severity="success" variant="outlined">
            No concerns detected above the minor threshold.
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            {topConcerns.map((f, i) => (
              <ConcernCard key={`${f.title}-${i}`} finding={f} />
            ))}
          </Stack>
        )}
      </Box>

      {/* What the manuscript does well */}
      {(report.positive_findings || []).length > 0 && (
        <Accordion variant="outlined" disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" fontWeight={600}>
              What the manuscript does well ({report.positive_findings.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {report.positive_findings.map((p, i) => (
                <Alert key={`${p.title}-${i}`} severity="success" variant="outlined">
                  <strong>{p.title}</strong>
                  {p.description ? ` — ${p.description}` : ''}
                </Alert>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* All findings */}
      {remainingCount > 0 && (
        <Accordion variant="outlined" disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" fontWeight={600}>
              All findings ({report.findings.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              {report.findings.map((f, i) => (
                <ConcernCard key={`${f.title}-${i}`} finding={f} />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Action bar */}
      <Stack
        direction="row"
        spacing={1}
        className="reviewer-action-bar"
        sx={{ pt: 1, flexWrap: 'wrap' }}
      >
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Download PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={handleShare}
          disabled={!submissionId}
        >
          Share link
        </Button>
        {submissionId && (
          <Tooltip title={`Submission ${submissionId}`}>
            <IconButton
              size="small"
              aria-label="copy submission id"
              onClick={() => {
                navigator.clipboard?.writeText(submissionId);
                setSnackbar(`Copied ${submissionId}`);
              }}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onAnalyzeAnother && (
          <Button variant="text" startIcon={<UploadIcon />} onClick={onAnalyzeAnother}>
            Analyze another manuscript
          </Button>
        )}
      </Stack>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar || ''}
      />
    </Stack>
  );
};

export default ReviewerReport;
