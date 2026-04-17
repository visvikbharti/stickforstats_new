import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Card,
  CardContent,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Divider,
  Grid,
  Button,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Snackbar,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CloudUpload,
  CheckCircleOutline,
  WarningAmber,
  ErrorOutline,
  InfoOutlined,
  InsertDriveFile,
  ExpandMore,
  ContentCopy,
  Assessment,
  FindInPage,
  ThumbUp,
  CompareArrows,
  Summarize,
  Search as SearchIcon,
} from '@mui/icons-material';
import { analyzeManuscript } from '../../services/ManuscriptService';
import { DisciplineCompliancePanel } from './ReviewerReport';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_EXTENSIONS = ['.pdf', '.tex', '.latex', '.docx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const FIELD_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'economics', label: 'Economics' },
  { value: 'education', label: 'Education' },
  { value: 'biology', label: 'Biology' },
  { value: 'social_science', label: 'Social Science' },
  { value: 'clinical_trials', label: 'Clinical Trials' },
];

const ANALYSIS_STEPS = [
  'Parsing document...',
  'Extracting statistical claims...',
  'Validating consistency...',
  'Generating report...',
];

const SEVERITY_ORDER = ['blocking', 'critical', 'major', 'moderate', 'minor'];

const SEVERITY_MUI_MAP = {
  blocking: 'error',
  critical: 'error',
  major: 'warning',
  moderate: 'info',
  minor: 'info',
};

const CONSISTENCY_ROW_COLORS = {
  consistent: 'success.light',
  minor: 'warning.light',
  major: 'warning.main',
  gross_error: 'error.light',
};

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const DropZone = styled(Paper)(({ theme, isDragActive, hasFile }) => ({
  padding: theme.spacing(4),
  border: `2px dashed ${
    isDragActive
      ? theme.palette.primary.main
      : hasFile
      ? theme.palette.success.main
      : theme.palette.divider
  }`,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: isDragActive
    ? theme.palette.action.hover
    : theme.palette.background.paper,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.light,
  },
  minHeight: 180,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
}));

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getScoreColor(score, theme) {
  if (score >= 80) return theme.palette.success.main;
  if (score >= 60) return theme.palette.warning.main;
  return theme.palette.error.main;
}

function getScoreGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getConsistencyColor(rate, theme) {
  if (rate >= 90) return theme.palette.success.main;
  if (rate >= 75) return theme.palette.warning.main;
  return theme.palette.error.main;
}

function getAssessmentBadge(assessment) {
  const map = {
    pass: { label: 'Pass', color: 'success' },
    minor_issues: { label: 'Minor Issues', color: 'info' },
    major_issues: { label: 'Major Issues', color: 'warning' },
    critical: { label: 'Critical', color: 'error' },
  };
  const normalized = (assessment || '').toLowerCase().replace(/\s+/g, '_');
  return map[normalized] || { label: assessment || 'Unknown', color: 'default' };
}

function groupFindingsBySeverity(findings) {
  const grouped = {};
  for (const sev of SEVERITY_ORDER) {
    grouped[sev] = [];
  }
  for (const finding of findings || []) {
    const sev = (finding.severity || 'minor').toLowerCase();
    if (grouped[sev]) {
      grouped[sev].push(finding);
    } else {
      grouped.minor.push(finding);
    }
  }
  return grouped;
}

// ---------------------------------------------------------------------------
// Sub-component: Overview Cards
// ---------------------------------------------------------------------------

function OverviewCards({ report, theme }) {
  const score = report?.sqs_score ?? 0;
  const claimsCount = report?.claims_found ?? 0;
  const consistencyRate = report?.consistency_rate ?? 0;
  const assessment = report?.overall_assessment ?? 'Unknown';
  const badge = getAssessmentBadge(assessment);

  const cards = [
    {
      title: 'SQS Score',
      content: (
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: getScoreColor(score, theme),
              lineHeight: 1.1,
            }}
          >
            {Math.round(score)}
          </Typography>
          <Chip
            label={`Grade: ${getScoreGrade(score)}`}
            size="small"
            sx={{
              mt: 1,
              backgroundColor: getScoreColor(score, theme),
              color: '#fff',
              fontWeight: 600,
            }}
          />
        </Box>
      ),
    },
    {
      title: 'Claims Found',
      content: (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ fontWeight: 700, color: theme.palette.primary.main, lineHeight: 1.1 }}>
            {claimsCount}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            statistical claims extracted
          </Typography>
        </Box>
      ),
    },
    {
      title: 'Consistency Rate',
      content: (
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: getConsistencyColor(consistencyRate, theme),
              lineHeight: 1.1,
            }}
          >
            {Math.round(consistencyRate)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={consistencyRate}
            sx={{
              mt: 1.5,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.palette.action.disabledBackground,
              '& .MuiLinearProgress-bar': {
                backgroundColor: getConsistencyColor(consistencyRate, theme),
              },
            }}
          />
        </Box>
      ),
    },
    {
      title: 'Overall Assessment',
      content: (
        <Box sx={{ textAlign: 'center', pt: 1 }}>
          <Chip
            label={badge.label}
            color={badge.color}
            sx={{ fontSize: '1rem', fontWeight: 600, px: 2, py: 2.5 }}
          />
        </Box>
      ),
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.title}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {card.title}
              </Typography>
              {card.content}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Findings Panel (Issues + Positive tabs)
// ---------------------------------------------------------------------------

function FindingsPanel({ findings, positiveFindings, theme }) {
  const grouped = groupFindingsBySeverity(findings);

  const issueCount = (findings || []).length;
  const positiveCount = (positiveFindings || []).length;

  return (
    <Box>
      {/* Issues grouped by severity */}
      {SEVERITY_ORDER.map((sev) => {
        const items = grouped[sev];
        if (!items || items.length === 0) return null;

        return (
          <Box key={sev} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                mb: 1,
                textTransform: 'capitalize',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {sev === 'blocking' || sev === 'critical' ? (
                <ErrorOutline fontSize="small" color="error" />
              ) : sev === 'major' ? (
                <WarningAmber fontSize="small" color="warning" />
              ) : (
                <InfoOutlined fontSize="small" color="info" />
              )}
              {sev} ({items.length})
            </Typography>
            {items.map((finding, idx) => (
              <Alert
                key={`${sev}-${idx}`}
                severity={SEVERITY_MUI_MAP[sev] || 'info'}
                sx={{
                  mb: 1,
                  ...(sev === 'minor' && {
                    opacity: 0.85,
                    '& .MuiAlert-icon': { opacity: 0.7 },
                  }),
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {finding.title || finding.rule || 'Finding'}
                </Typography>
                {finding.description && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {finding.description}
                  </Typography>
                )}
                {finding.evidence && (
                  <Box
                    component="code"
                    sx={{
                      display: 'block',
                      mt: 1,
                      p: 1,
                      backgroundColor: theme.palette.action.hover,
                      borderRadius: 1,
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {finding.evidence}
                  </Box>
                )}
                {finding.recommendation && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Recommendation: {finding.recommendation}
                  </Typography>
                )}
                {finding.claim_id && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Claim: {finding.claim_id}
                  </Typography>
                )}
              </Alert>
            ))}
          </Box>
        );
      })}

      {issueCount === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          No statistical issues found. Excellent work!
        </Alert>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Positive Findings Panel
// ---------------------------------------------------------------------------

function PositiveFindingsPanel({ positiveFindings }) {
  if (!positiveFindings || positiveFindings.length === 0) {
    return (
      <Alert severity="info">
        No positive findings recorded for this manuscript.
      </Alert>
    );
  }

  return (
    <Box>
      {positiveFindings.map((finding, idx) => (
        <Alert
          key={idx}
          severity="success"
          icon={<CheckCircleOutline fontSize="small" />}
          sx={{ mb: 1 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {finding.title || finding.rule || 'Positive Finding'}
          </Typography>
          {finding.description && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {finding.description}
            </Typography>
          )}
        </Alert>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Consistency Table
// ---------------------------------------------------------------------------

function ConsistencyTable({ results, theme, sortConfig, onRequestSort }) {
  if (!results || results.length === 0) {
    return (
      <Alert severity="info">
        No consistency check results available.
      </Alert>
    );
  }

  const severityWeight = {
    gross_error: 4,
    major: 3,
    minor: 2,
    consistent: 1,
  };

  // Sort inline (no hooks in sub-components per project rules)
  const sortedResults = (() => {
    const sorted = [...results];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === 'severity') {
          aVal = severityWeight[a.severity] || 0;
          bVal = severityWeight[b.severity] || 0;
        } else {
          aVal = a[sortConfig.key] ?? '';
          bVal = b[sortConfig.key] ?? '';
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  })();

  const columns = [
    { key: 'claim_id', label: 'Claim ID' },
    { key: 'type', label: 'Type' },
    { key: 'reported_text', label: 'Reported Text' },
    { key: 'reported_p', label: 'Reported p' },
    { key: 'computed_p', label: 'Computed p' },
    { key: 'match', label: 'Match?' },
    { key: 'severity', label: 'Severity' },
  ];

  function getRowBgColor(severity) {
    const colorKey = CONSISTENCY_ROW_COLORS[severity];
    if (!colorKey) return 'inherit';
    // Resolve dot-path against theme.palette
    const parts = colorKey.split('.');
    let val = theme.palette;
    for (const p of parts) {
      val = val?.[p];
    }
    return val ? `${val}22` : 'inherit'; // append alpha for subtle tint
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.key} sx={{ fontWeight: 600 }}>
                {col.key === 'severity' ? (
                  <TableSortLabel
                    active={sortConfig.key === 'severity'}
                    direction={sortConfig.key === 'severity' ? sortConfig.direction : 'asc'}
                    onClick={() => onRequestSort('severity')}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : (
                  col.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedResults.map((row, idx) => (
            <TableRow
              key={row.claim_id || idx}
              sx={{ backgroundColor: getRowBgColor(row.severity) }}
            >
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {row.claim_id || '-'}
                </Typography>
              </TableCell>
              <TableCell>{row.type || '-'}</TableCell>
              <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Tooltip title={row.reported_text || ''} arrow>
                  <span>{row.reported_text || '-'}</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                {row.reported_p != null ? Number(row.reported_p).toFixed(4) : '-'}
              </TableCell>
              <TableCell>
                {row.computed_p != null ? Number(row.computed_p).toFixed(4) : '-'}
              </TableCell>
              <TableCell>
                {row.match === true ? (
                  <CheckCircleOutline fontSize="small" color="success" />
                ) : row.match === false ? (
                  <ErrorOutline fontSize="small" color="error" />
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <Chip
                  label={row.severity || 'unknown'}
                  size="small"
                  color={
                    row.severity === 'consistent'
                      ? 'success'
                      : row.severity === 'minor'
                      ? 'warning'
                      : row.severity === 'major'
                      ? 'warning'
                      : row.severity === 'gross_error'
                      ? 'error'
                      : 'default'
                  }
                  variant={row.severity === 'consistent' ? 'filled' : 'outlined'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Extraction Summary Panel
// ---------------------------------------------------------------------------

function ExtractionSummaryPanel({ summary }) {
  if (!summary) {
    return (
      <Alert severity="info">
        No extraction summary available.
      </Alert>
    );
  }

  const claimsByType = summary.claims_by_type || {};
  const totalClaims = Object.values(claimsByType).reduce((sum, n) => sum + n, 0);

  const coverageStats = [
    { label: 'Claims with p-values', value: summary.pct_with_p_values },
    { label: 'Claims with effect sizes', value: summary.pct_with_effect_sizes },
    { label: 'Claims with confidence intervals', value: summary.pct_with_ci },
  ];

  return (
    <Box>
      {/* Claims by type */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        Claims by Type
      </Typography>
      {totalClaims > 0 ? (
        <Grid container spacing={1} sx={{ mb: 3 }}>
          {Object.entries(claimsByType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <Grid item xs={6} sm={4} md={3} key={type}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {type.replace(/_/g, ' ')}
                  </Typography>
                </Paper>
              </Grid>
            ))}
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No claims categorized by type.
        </Typography>
      )}

      {/* Coverage statistics */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        Reporting Coverage
      </Typography>
      {coverageStats.map((stat) => (
        <Box key={stat.label} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">{stat.label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {stat.value != null ? `${Math.round(stat.value)}%` : 'N/A'}
            </Typography>
          </Box>
          {stat.value != null && (
            <LinearProgress
              variant="determinate"
              value={stat.value}
              sx={{
                height: 8,
                borderRadius: 4,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Tab Panel helper
// ---------------------------------------------------------------------------

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ManuscriptAnalyzer = () => {
  const theme = useTheme();
  const fileInputRef = useRef(null);

  // -- Upload state ---------------------------------------------------------
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [field, setField] = useState('general');

  // -- Analysis state -------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  // -- UI state -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'severity', direction: 'desc' });
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // -- Derived data ---------------------------------------------------------
  const findings = report?.findings || [];
  const positiveFindings = report?.positive_findings || [];
  const consistencyResults = report?.consistency_results || [];
  const extractionSummary = report?.extraction_summary || null;
  const editorSummary = report?.editor_summary || '';

  const analysisProgress = loading
    ? Math.min(((analysisStep + 1) / ANALYSIS_STEPS.length) * 100, 95)
    : 0;

  // -- File validation ------------------------------------------------------

  const isAcceptedFile = useCallback((f) => {
    if (!f || !f.name) return false;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext);
  }, []);

  const validateFile = useCallback((f) => {
    if (!f) return 'No file selected.';
    if (!isAcceptedFile(f)) {
      return `Unsupported file type. Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File too large (${formatFileSize(f.size)}). Maximum size: ${formatFileSize(MAX_FILE_SIZE)}.`;
    }
    return null;
  }, [isAcceptedFile]);

  // -- Analysis pipeline ----------------------------------------------------

  const runAnalysis = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setAnalysisStep(0);
    setActiveTab(0);

    try {
      // Simulate step progression with timers (the actual API is a single call,
      // but we show incremental feedback to the user)
      const stepTimer = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev < ANALYSIS_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 3000);

      const result = await analyzeManuscript(file, { field });

      clearInterval(stepTimer);
      setAnalysisStep(ANALYSIS_STEPS.length - 1);
      setReport(result);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'An unexpected error occurred while analyzing the manuscript.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [file, field]);

  // -- Drag-and-drop handlers -----------------------------------------------

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        const validationError = validateFile(droppedFile);
        if (validationError) {
          setError(validationError);
          return;
        }
        setFile(droppedFile);
        setError(null);
        setReport(null);
      }
    },
    [validateFile]
  );

  // -- Click-to-upload handler -----------------------------------------------

  const handleFileInputChange = useCallback(
    (e) => {
      const selected = e.target.files?.[0];
      if (selected) {
        const validationError = validateFile(selected);
        if (validationError) {
          setError(validationError);
          return;
        }
        setFile(selected);
        setError(null);
        setReport(null);
      }
      // Reset so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [validateFile]
  );

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // -- Tab change handler ---------------------------------------------------

  const handleTabChange = useCallback((_event, newValue) => {
    setActiveTab(newValue);
  }, []);

  // -- Sort handler for consistency table -----------------------------------

  const handleRequestSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  // -- Copy editor summary --------------------------------------------------

  const handleCopyEditorSummary = useCallback(() => {
    if (!editorSummary) return;
    navigator.clipboard.writeText(editorSummary).then(
      () => {
        setSnackbarMessage('Editor summary copied to clipboard.');
        setSnackbarOpen(true);
      },
      () => {
        setSnackbarMessage('Failed to copy to clipboard.');
        setSnackbarOpen(true);
      }
    );
  }, [editorSummary]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  // -- Field change handler -------------------------------------------------

  const handleFieldChange = useCallback((e) => {
    setField(e.target.value);
  }, []);

  // -- Render ---------------------------------------------------------------

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Manuscript Statistical Analyzer
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload a manuscript to receive a comprehensive statistical quality review.
          Checks for reporting consistency, methodological rigor, and common statistical errors.
        </Typography>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: File Upload Area                                        */}
      {/* ------------------------------------------------------------------ */}

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <DropZone
          isDragActive={isDragActive}
          hasFile={!!file && !loading}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
          elevation={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.tex,.latex,.docx"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />

          {file && !loading ? (
            <Box>
              <InsertDriveFile sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(file.size)} -- Click or drop a new file to replace
              </Typography>
            </Box>
          ) : (
            <>
              <CloudUpload sx={{ fontSize: 56, color: 'primary.main', mb: 1.5 }} />
              <Typography variant="h6" gutterBottom>
                Drag and drop your manuscript here
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse -- PDF, LaTeX, and DOCX files accepted
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Maximum file size: 50 MB
              </Typography>
            </>
          )}
        </DropZone>

        {/* Field selector + Analyze button */}
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="field-select-label">Research Field</InputLabel>
            <Select
              labelId="field-select-label"
              value={field}
              label="Research Field"
              onChange={handleFieldChange}
              disabled={loading}
            >
              {FIELD_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            size="large"
            startIcon={<SearchIcon />}
            onClick={runAnalysis}
            disabled={!file || loading}
            sx={{ px: 4 }}
          >
            Analyze Manuscript
          </Button>
        </Box>
      </Paper>

      {/* ------------------------------------------------------------------ */}
      {/* Error display                                                       */}
      {/* ------------------------------------------------------------------ */}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Loading State                                            */}
      {/* ------------------------------------------------------------------ */}

      {loading && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Analyzing Manuscript
          </Typography>
          <Box sx={{ maxWidth: 500, mx: 'auto', mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={analysisProgress}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
            {ANALYSIS_STEPS[analysisStep] || 'Processing...'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Step {analysisStep + 1} of {ANALYSIS_STEPS.length}
          </Typography>
        </Paper>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Results Dashboard                                        */}
      {/* ------------------------------------------------------------------ */}

      {report && !loading && (
        <Box>
          {/* 3a. Overview Cards */}
          <OverviewCards report={report} theme={theme} />

          {/* 3a'. Discipline compliance (CONSORT/STROBE/ICH-E9/JARS-Quant) —
               only rendered when the backend resolved a profile for the
               caller's `field`. The panel itself is defined in
               ReviewerReport.jsx so the two surfaces stay consistent. */}
          <Box sx={{ mb: 3 }}>
            <DisciplineCompliancePanel report={report} />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* 3b. Findings Tab Panel */}
          <Paper variant="outlined" sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
              }}
            >
              <Tab
                icon={<FindInPage fontSize="small" />}
                iconPosition="start"
                label={`Issues (${findings.length})`}
              />
              <Tab
                icon={<ThumbUp fontSize="small" />}
                iconPosition="start"
                label={`Positive (${positiveFindings.length})`}
              />
              <Tab
                icon={<CompareArrows fontSize="small" />}
                iconPosition="start"
                label={`Consistency (${consistencyResults.length})`}
              />
              <Tab
                icon={<Summarize fontSize="small" />}
                iconPosition="start"
                label="Extraction Summary"
              />
            </Tabs>

            <Box sx={{ p: 2 }}>
              {/* Tab 1: Issues */}
              <TabPanel value={activeTab} index={0}>
                <FindingsPanel
                  findings={findings}
                  positiveFindings={positiveFindings}
                  theme={theme}
                />
              </TabPanel>

              {/* Tab 2: Positive Findings */}
              <TabPanel value={activeTab} index={1}>
                <PositiveFindingsPanel positiveFindings={positiveFindings} />
              </TabPanel>

              {/* Tab 3: Consistency Details */}
              <TabPanel value={activeTab} index={2}>
                <ConsistencyTable
                  results={consistencyResults}
                  theme={theme}
                  sortConfig={sortConfig}
                  onRequestSort={handleRequestSort}
                />
              </TabPanel>

              {/* Tab 4: Extraction Summary */}
              <TabPanel value={activeTab} index={3}>
                <ExtractionSummaryPanel summary={extractionSummary} />
              </TabPanel>
            </Box>
          </Paper>

          {/* 3c. Editor Summary (expandable accordion) */}
          {editorSummary && (
            <Accordion
              expanded={editorExpanded}
              onChange={() => setEditorExpanded((prev) => !prev)}
              variant="outlined"
              sx={{ mb: 3 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment fontSize="small" color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Editor Summary
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ position: 'relative' }}>
                  <Tooltip title="Copy to clipboard">
                    <IconButton
                      onClick={handleCopyEditorSummary}
                      size="small"
                      sx={{ position: 'absolute', top: 0, right: 0 }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Box
                    sx={{
                      p: 2,
                      pr: 5,
                      backgroundColor: theme.palette.action.hover,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.6,
                    }}
                  >
                    {editorSummary}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {/* Snackbar for copy feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default ManuscriptAnalyzer;
