/**
 * Reviewer Mode Page (Pillar 2)
 * =============================
 *
 * Two flows:
 *   - /reviewer          → blank upload surface. Drop a PDF / LaTeX / DOCX,
 *                          get the triaged report inline.
 *   - /review/:submissionId → load a previously-stored review by ID, useful
 *                             for sharing a report link with another reviewer.
 *
 * This page is deliberately lean (no sidebars, no decoration) so it reads
 * well on the 13" laptop screens editors actually use during review.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CloudUpload,
  InsertDriveFile,
  Replay as RetryIcon,
} from '@mui/icons-material';

import ReviewerReport from '../components/manuscript/ReviewerReport';
import {
  analyzeManuscript,
  getReport,
} from '../services/ManuscriptService';

const ACCEPTED_EXTENSIONS = ['.pdf', '.tex', '.latex', '.docx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const DropZone = styled(Paper)(({ theme, isDragActive, hasFile }) => ({
  borderRadius: theme.shape.borderRadius,
  border: `2px dashed ${
    isDragActive
      ? theme.palette.primary.main
      : hasFile
        ? theme.palette.success.main
        : theme.palette.divider
  }`,
  padding: theme.spacing(5),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 150ms ease, background-color 150ms ease',
  backgroundColor: isDragActive
    ? theme.palette.action.hover
    : theme.palette.background.paper,
  '&:hover': { backgroundColor: theme.palette.action.hover },
}));

const extractError = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.detail ||
  err?.message ||
  'Analysis failed for an unknown reason.';

export default function ReviewerModePage() {
  const { submissionId: urlSubmissionId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [file, setFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [submissionId, setSubmissionId] = useState(urlSubmissionId || null);
  const fileInputRef = useRef(null);

  const isShareableFlow = Boolean(urlSubmissionId);

  // Shareable-URL flow: load the report by ID on mount.
  useEffect(() => {
    if (!urlSubmissionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getReport(urlSubmissionId)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setSubmissionId(urlSubmissionId);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(extractError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [urlSubmissionId]);

  const isAcceptedFile = useCallback((f) => {
    if (!f || !f.name) return false;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext);
  }, []);

  const runAnalysis = useCallback(async (selected) => {
    if (!selected) return;
    if (!isAcceptedFile(selected)) {
      setError(
        `Unsupported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}.`
      );
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('File exceeds the 50 MB limit.');
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await analyzeManuscript(selected, { field: 'general' });
      setReport(data);
      if (data?.submission_id) {
        setSubmissionId(data.submission_id);
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [isAcceptedFile]);

  const handleFileSelected = useCallback(
    (f) => {
      if (!f) return;
      setFile(f);
      runAnalysis(f);
    },
    [runAnalysis]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      const dropped = e.dataTransfer?.files?.[0];
      if (dropped) handleFileSelected(dropped);
    },
    [handleFileSelected]
  );

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

  const analyzeAnother = () => {
    setFile(null);
    setReport(null);
    setSubmissionId(null);
    setError(null);
    if (urlSubmissionId) navigate('/reviewer');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          Reviewer Mode
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload a manuscript. Get a one-page statistical-quality report in
          under a minute — verdict, at-a-glance stats, and top three concerns,
          sized for a reviewer who has thirty minutes and a decision to make.
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button
              size="small"
              color="inherit"
              startIcon={<RetryIcon />}
              onClick={() => {
                setError(null);
                if (file) runAnalysis(file);
              }}
              disabled={!file}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <InsertDriveFile color="action" />
            <Typography variant="body2">
              {file
                ? `Analyzing ${file.name}…`
                : isShareableFlow
                  ? `Loading submission ${urlSubmissionId}…`
                  : 'Working…'}
            </Typography>
          </Stack>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Parsing → extracting statistical claims → consistency check → SQS scoring.
          </Typography>
        </Paper>
      )}

      {/* Drop zone — only if we don't already have a report */}
      {!report && !loading && !isShareableFlow && (
        <DropZone
          isDragActive={isDragActive}
          hasFile={Boolean(file)}
          elevation={0}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
          <CloudUpload sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Drop a manuscript here to review
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ACCEPTED_EXTENSIONS.join(', ')} up to 50 MB.
          </Typography>
        </DropZone>
      )}

      {/* Report */}
      {report && !loading && (
        <ReviewerReport
          report={report}
          submissionId={submissionId}
          onAnalyzeAnother={analyzeAnother}
        />
      )}
    </Container>
  );
}
