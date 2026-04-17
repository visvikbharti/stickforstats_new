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
  Chip,
  Card,
  CardContent,
  CardActionArea,
  Alert,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
  Divider,
  Grid,
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
  Psychology,
  TableChart,
} from '@mui/icons-material';
import { profileData } from '../../services/AutonomousService';

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

const ScoreGauge = styled(Box)(({ theme, score }) => {
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));

  let color = theme.palette.success.main;
  if (pct < 50) color = theme.palette.error.main;
  else if (pct < 75) color = theme.palette.warning.main;

  return {
    position: 'relative',
    width: size,
    height: size,
    '& .gauge-bg': {
      stroke: theme.palette.action.disabledBackground,
      fill: 'none',
      strokeWidth,
    },
    '& .gauge-fg': {
      stroke: color,
      fill: 'none',
      strokeWidth,
      strokeLinecap: 'round',
      strokeDasharray: circumference,
      strokeDashoffset: circumference - (pct / 100) * circumference,
      transition: 'stroke-dashoffset 0.6s ease',
      transform: 'rotate(-90deg)',
      transformOrigin: '50% 50%',
    },
    '& .gauge-text': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };
});

const QuestionCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'box-shadow 0.2s',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const severityMap = {
  critical: 'error',
  warning: 'warning',
  minor: 'info',
};

const severityIcon = {
  critical: <ErrorOutline fontSize="small" />,
  warning: <WarningAmber fontSize="small" />,
  minor: <InfoOutlined fontSize="small" />,
};

// ---------------------------------------------------------------------------
// Variable type chip colors
// ---------------------------------------------------------------------------

const typeColor = {
  numeric: 'primary',
  categorical: 'secondary',
  datetime: 'info',
  boolean: 'default',
  text: 'default',
  ordinal: 'warning',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Circular score gauge rendered with inline SVG.
 */
const CircularGauge = ({ score, label }) => {
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const pct = Math.max(0, Math.min(100, score));

  return (
    <ScoreGauge score={score}>
      <svg width={size} height={size}>
        <circle className="gauge-bg" cx={size / 2} cy={size / 2} r={radius} />
        <circle className="gauge-fg" cx={size / 2} cy={size / 2} r={radius} />
      </svg>
      <Box className="gauge-text">
        <Box textAlign="center">
          <Typography variant="h5" fontWeight={700}>
            {Math.round(pct)}
          </Typography>
          {label && (
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          )}
        </Box>
      </Box>
    </ScoreGauge>
  );
};

/**
 * Data Health Card showing overall score, sub-scores, issues, and strengths.
 */
const DataHealthCard = ({ health }) => {
  const theme = useTheme();

  if (!health) return null;

  const { overall_score, completeness, quality, suitability, issues, strengths } = health;

  const subScores = [
    { label: 'Completeness', value: completeness },
    { label: 'Quality', value: quality },
    { label: 'Suitability', value: suitability },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Data Health
      </Typography>

      <Box display="flex" alignItems="center" gap={4} mb={3} flexWrap="wrap">
        <CircularGauge score={overall_score} label="Score" />

        <Box flex={1} minWidth={200}>
          {subScores.map((s) => (
            <Box key={s.label} mb={1.5}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2">{s.label}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {Math.round(s.value ?? 0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={s.value ?? 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.palette.action.disabledBackground,
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Issues */}
      {issues && issues.length > 0 && (
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Issues
          </Typography>
          {issues.map((issue, idx) => (
            <Alert
              key={idx}
              severity={severityMap[issue.severity] || 'info'}
              icon={severityIcon[issue.severity] || <InfoOutlined fontSize="small" />}
              sx={{ mb: 1 }}
            >
              {issue.message || issue}
            </Alert>
          ))}
        </Box>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Strengths
          </Typography>
          {strengths.map((strength, idx) => (
            <Alert
              key={idx}
              severity="success"
              icon={<CheckCircleOutline fontSize="small" />}
              sx={{ mb: 1 }}
            >
              {strength.message || strength}
            </Alert>
          ))}
        </Box>
      )}
    </Paper>
  );
};

/**
 * Variable Summary Table with editable type chips.
 */
const VariableSummaryTable = ({ variables, onTypeOverride }) => {
  const [editingVar, setEditingVar] = useState(null);

  const availableTypes = ['numeric', 'categorical', 'datetime', 'boolean', 'text', 'ordinal'];

  const handleTypeClick = useCallback((varName) => {
    setEditingVar((prev) => (prev === varName ? null : varName));
  }, []);

  const handleTypeChange = useCallback(
    (varName, newType) => {
      setEditingVar(null);
      if (onTypeOverride) {
        onTypeOverride(varName, newType);
      }
    },
    [onTypeOverride]
  );

  if (!variables || variables.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ mb: 3 }}>
      <Box px={2} py={1.5}>
        <Typography variant="h6">
          <TableChart fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Variable Summary
        </Typography>
      </Box>
      <Divider />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Variable</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Unique</TableCell>
              <TableCell align="right">Missing %</TableCell>
              <TableCell align="right">Normality</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {variables.map((v) => (
              <TableRow key={v.name} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {v.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {editingVar === v.name ? (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={v.type}
                        onChange={(e) => handleTypeChange(v.name, e.target.value)}
                        autoFocus
                        onBlur={() => setEditingVar(null)}
                      >
                        {availableTypes.map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Tooltip title="Click to change type">
                      <Chip
                        label={v.type}
                        color={typeColor[v.type] || 'default'}
                        size="small"
                        onClick={() => handleTypeClick(v.name)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="right">{v.unique_values ?? '-'}</TableCell>
                <TableCell align="right">
                  {v.missing_pct != null ? `${v.missing_pct.toFixed(1)}%` : '-'}
                </TableCell>
                <TableCell align="right">
                  {v.normality != null ? (
                    <Chip
                      label={v.normality}
                      size="small"
                      color={v.normality === 'normal' ? 'success' : 'default'}
                      variant="outlined"
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

/**
 * Inferred Research Questions displayed as clickable cards.
 */
const InferredQuestions = ({ questions, onSelectQuestion }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <Box mb={3}>
      <Typography variant="h6" gutterBottom>
        <Psychology fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
        Inferred Research Questions
      </Typography>
      <Grid container spacing={2}>
        {questions.map((q, idx) => (
          <Grid item xs={12} sm={6} md={4} key={idx}>
            <QuestionCard variant="outlined">
              <CardActionArea
                onClick={() => onSelectQuestion && onSelectQuestion(q)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Typography variant="body1" gutterBottom>
                    {q.text || q.question}
                  </Typography>

                  {q.confidence != null && (
                    <Chip
                      label={`${Math.round(q.confidence * 100)}% confidence`}
                      size="small"
                      color={q.confidence >= 0.7 ? 'success' : q.confidence >= 0.4 ? 'warning' : 'default'}
                      sx={{ mb: 1 }}
                    />
                  )}

                  {q.suggested_tests && q.suggested_tests.length > 0 && (
                    <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                      {q.suggested_tests.map((test, tIdx) => (
                        <Chip
                          key={tIdx}
                          label={test}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </CardActionArea>
            </QuestionCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

/**
 * Data Preview table showing first 5 rows.
 */
const DataPreview = ({ preview }) => {
  if (!preview || !preview.columns || !preview.rows || preview.rows.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ mb: 3 }}>
      <Box px={2} py={1.5}>
        <Typography variant="h6">Data Preview</Typography>
        <Typography variant="caption" color="text.secondary">
          Showing first {preview.rows.length} rows
        </Typography>
      </Box>
      <Divider />
      <TableContainer sx={{ maxHeight: 320 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
              {preview.columns.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 600 }}>
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {preview.rows.map((row, rIdx) => (
              <TableRow key={rIdx} hover>
                <TableCell>{rIdx + 1}</TableCell>
                {preview.columns.map((col) => (
                  <TableCell key={col}>
                    {row[col] != null ? String(row[col]) : ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * SmartUpload -- Autonomous Intelligence Layer entry point.
 *
 * Accepts CSV / Excel files via drag-and-drop or click-to-upload, profiles the
 * data through the backend, and renders a Data Health Card, Variable Summary,
 * Inferred Research Questions, and a Data Preview.
 *
 * Props:
 *   onProfileComplete(profileResult) - called after profiling finishes
 *   onSelectQuestion(question)       - called when user clicks an inferred question
 *   onDataReady(file)                - called when a file is loaded
 */
const SmartUpload = ({ onProfileComplete, onSelectQuestion, onDataReady }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);

  // -- state ----------------------------------------------------------------
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileResult, setProfileResult] = useState(null);

  // -- helpers --------------------------------------------------------------

  const isAcceptedFile = useCallback((f) => {
    if (!f || !f.name) return false;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext);
  }, []);

  // -- profiling ------------------------------------------------------------

  const runProfiling = useCallback(
    async (uploadedFile) => {
      setLoading(true);
      setError(null);

      try {
        const result = await profileData(uploadedFile);
        setProfileResult(result);

        if (onProfileComplete) {
          onProfileComplete(result);
        }
      } catch (err) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          'An error occurred while profiling the data.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [onProfileComplete]
  );

  const processFile = useCallback(
    (selectedFile) => {
      if (!isAcceptedFile(selectedFile)) {
        setError(
          'Unsupported file type. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.'
        );
        return;
      }

      setFile(selectedFile);
      setError(null);
      setProfileResult(null);

      if (onDataReady) {
        onDataReady(selectedFile);
      }

      runProfiling(selectedFile);
    },
    [isAcceptedFile, onDataReady, runProfiling]
  );

  // -- drag-and-drop handlers -----------------------------------------------

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

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
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  // -- click-to-upload handler -----------------------------------------------

  const handleFileInputChange = useCallback(
    (e) => {
      const selected = e.target.files?.[0];
      if (selected) {
        processFile(selected);
      }
      // Reset so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // -- type override handler -------------------------------------------------

  const handleTypeOverride = useCallback(
    (varName, newType) => {
      if (!profileResult || !profileResult.variables) return;

      const updatedVars = profileResult.variables.map((v) =>
        v.name === varName ? { ...v, type: newType } : v
      );

      const updatedResult = { ...profileResult, variables: updatedVars };
      setProfileResult(updatedResult);

      if (onProfileComplete) {
        onProfileComplete(updatedResult);
      }
    },
    [profileResult, onProfileComplete]
  );

  // -- render ----------------------------------------------------------------

  return (
    <Box>
      {/* Drop zone */}
      <DropZone
        isDragActive={isDragActive}
        hasFile={!!file && !loading}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
        elevation={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        {loading ? (
          <Box width="100%">
            <Typography variant="body1" gutterBottom>
              Profiling your data...
            </Typography>
            <LinearProgress sx={{ mx: 'auto', maxWidth: 400, mt: 1 }} />
          </Box>
        ) : file ? (
          <Box>
            <InsertDriveFile
              sx={{ fontSize: 48, color: 'success.main', mb: 1 }}
            />
            <Typography variant="body1" fontWeight={500}>
              {file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click or drop a new file to replace
            </Typography>
          </Box>
        ) : (
          <>
            <CloudUpload
              sx={{ fontSize: 56, color: 'primary.main', mb: 1.5 }}
            />
            <Typography variant="h6" gutterBottom>
              Drag and drop your data file here
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse -- CSV and Excel files accepted
            </Typography>
          </>
        )}
      </DropZone>

      {/* Progress bar shown below drop zone while loading */}
      {loading && (
        <LinearProgress
          sx={{
            mt: -0.5,
            borderBottomLeftRadius: theme.shape.borderRadius * 2,
            borderBottomRightRadius: theme.shape.borderRadius * 2,
          }}
        />
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Profile results */}
      {profileResult && !loading && (
        <Box mt={3}>
          {/* Data Health Card */}
          <DataHealthCard health={profileResult.health} />

          {/* Variable Summary Table */}
          <VariableSummaryTable
            variables={profileResult.variables}
            onTypeOverride={handleTypeOverride}
          />

          {/* Inferred Research Questions */}
          <InferredQuestions
            questions={profileResult.questions}
            onSelectQuestion={onSelectQuestion}
          />

          {/* Data Preview */}
          <DataPreview preview={profileResult.preview} />
        </Box>
      )}
    </Box>
  );
};

export default SmartUpload;
