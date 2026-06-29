/**
 * BundleVerifier — multi-file submission upload for the raw-data verifier.
 * ========================================================================
 * The editor/publisher case: drag in a WHOLE submission (manuscript + supplements
 * + raw-data tables + figure images), POST it to /api/v1/verify/bundle/, and render
 * the VerificationReport. The multi-file sibling of ManuscriptAnalyzer (single file).
 *
 * Privacy: only the uploaded files are sent; the endpoint fetches no external data.
 * Backend caps mirrored client-side as a friendly pre-check (the server is
 * authoritative): ≤ 50 files/bundle, ≤ 25 MB/file.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CloudUpload,
  InsertDriveFile,
  TableChart,
  Image as ImageIcon,
  HelpOutline,
  Delete,
  PlayArrow,
  Replay,
} from '@mui/icons-material';
import { verifyBundle } from '../../services/ManuscriptService';
import VerificationReport, { IngestionReport } from './VerificationReport';

// ---------------------------------------------------------------------------
// Constants — mirror backend api/v1/_upload_utils.classify_upload + caps
// ---------------------------------------------------------------------------

const MANUSCRIPT_EXT = ['.pdf', '.tex', '.latex', '.docx', '.txt', '.xml', '.nxml'];
const DATA_EXT = ['.csv', '.tsv', '.tab', '.dat', '.xlsx', '.xls', '.sav', '.sas7bdat', '.dta', '.json'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.gif', '.webp'];

const ACCEPT_ATTR = [...MANUSCRIPT_EXT, ...DATA_EXT, ...IMAGE_EXT].join(',');

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (backend default cap)
const MAX_FILES = 50;

const KIND_ICON = {
  manuscript: <InsertDriveFile fontSize="small" color="primary" />,
  data: <TableChart fontSize="small" color="primary" />,
  image: <ImageIcon fontSize="small" color="primary" />,
  unknown: <HelpOutline fontSize="small" color="disabled" />,
};

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

function extOf(name) {
  const i = (name || '').lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

/** Classify a filename the way the backend will (manuscript|data|image|unknown). */
export function classifyFile(name) {
  const ext = extOf(name);
  if (MANUSCRIPT_EXT.includes(ext)) return 'manuscript';
  if (DATA_EXT.includes(ext)) return 'data';
  if (IMAGE_EXT.includes(ext)) return 'image';
  return 'unknown';
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// Styled drop zone (matches ManuscriptAnalyzer)
// ---------------------------------------------------------------------------

const DropZone = styled(Paper, {
  // keep the custom drag/file-state props off the underlying DOM node
  shouldForwardProp: (prop) => prop !== 'isDragActive' && prop !== 'hasFiles',
})(({ theme, isDragActive, hasFiles }) => ({
  padding: theme.spacing(4),
  border: `2px dashed ${
    isDragActive ? theme.palette.primary.main : hasFiles ? theme.palette.success.main : theme.palette.divider
  }`,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: isDragActive ? theme.palette.action.hover : theme.palette.background.paper,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.light,
  },
  minHeight: 160,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
}));

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const BundleVerifier = () => {
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [errorIngestion, setErrorIngestion] = useState(null);

  // -- file intake ----------------------------------------------------------
  // Computed synchronously against the current `files` (so the setFiles updater
  // stays pure — no side effects inside it; StrictMode double-invokes updaters).

  const addFiles = useCallback(
    (incoming) => {
      const list = Array.from(incoming || []);
      if (list.length === 0) return;

      const merged = [...files];
      const seen = new Set(files.map((f) => `${f.name}:${f.size}`));
      const rejected = [];
      for (const f of list) {
        const key = `${f.name}:${f.size}`;
        if (seen.has(key)) continue;
        if (f.size > MAX_FILE_SIZE) {
          rejected.push(`${f.name} (${formatFileSize(f.size)} exceeds 25 MB)`);
          continue;
        }
        seen.add(key);
        merged.push(f);
      }

      let next = merged;
      let message = null;
      if (merged.length > MAX_FILES) {
        message = `Too many files (${merged.length}); the limit is ${MAX_FILES} per bundle.`;
        next = merged.slice(0, MAX_FILES);
      } else if (rejected.length) {
        message = `Skipped oversized file(s): ${rejected.join(', ')}.`;
      }

      setFiles(next);
      setError(message); // null clears any prior error on a clean add
    },
    [files]
  );

  const removeFile = useCallback((idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
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
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleInputChange = useCallback(
    (e) => {
      addFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addFiles]
  );

  // -- submit ---------------------------------------------------------------

  const runVerification = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setErrorIngestion(null);
    setReport(null);
    setUploadPct(0);

    try {
      const result = await verifyBundle(files, {
        title: title || undefined,
        onUploadProgress: (evt) => {
          if (evt.total) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      setReport(result);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Verification failed. Please try again.';
      setError(message);
      // the 400 "no manuscript text" path returns the per-file ingestion report
      // so the user can see how each upload was handled — surface it.
      setErrorIngestion(err?.response?.data?.ingestion || null);
    } finally {
      setLoading(false);
    }
  }, [files, title]);

  const reset = useCallback(() => {
    setReport(null);
    setError(null);
    setErrorIngestion(null);
    setFiles([]);
    setTitle('');
    setUploadPct(0);
  }, []);

  // -- render ---------------------------------------------------------------

  // counts for the helper line under the dropzone
  const counts = files.reduce(
    (acc, f) => {
      acc[classifyFile(f.name)] = (acc[classifyFile(f.name)] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {!report && !loading && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <DropZone
            isDragActive={isDragActive}
            hasFiles={files.length > 0 && !loading}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload submission files — drag and drop here, or activate to browse"
            elevation={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              aria-label="Upload submission files"
              style={{ display: 'none' }}
              onChange={handleInputChange}
              data-testid="bundle-file-input"
            />
            <CloudUpload sx={{ fontSize: 52, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Drag and drop the whole submission here
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse — manuscript, supplements, raw-data tables, and figure images
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Up to {MAX_FILES} files · 25 MB each · PDF / DOCX / LaTeX / JATS-XML · CSV / Excel / SPSS / SAS / Stata · PNG / JPEG / TIFF
            </Typography>
          </DropZone>

          {files.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Chip size="small" label={`${files.length} file${files.length === 1 ? '' : 's'}`} />
                {counts.manuscript ? <Chip size="small" variant="outlined" label={`${counts.manuscript} manuscript`} /> : null}
                {counts.data ? <Chip size="small" variant="outlined" label={`${counts.data} data`} /> : null}
                {counts.image ? <Chip size="small" variant="outlined" label={`${counts.image} image`} /> : null}
                {counts.unknown ? (
                  <Chip size="small" variant="outlined" color="warning" label={`${counts.unknown} unsupported`} />
                ) : null}
              </Box>
              <List dense disablePadding data-testid="bundle-file-list">
                {files.map((f, idx) => {
                  const kind = classifyFile(f.name);
                  return (
                    <ListItem
                      key={`${f.name}:${f.size}`}
                      divider
                      secondaryAction={
                        <Tooltip title="Remove file">
                          <IconButton
                            edge="end"
                            size="small"
                            aria-label={`Remove ${f.name}`}
                            onClick={() => removeFile(idx)}
                            disabled={loading}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{KIND_ICON[kind] || KIND_ICON.unknown}</ListItemIcon>
                      <ListItemText
                        primary={f.name}
                        secondary={`${kind} · ${formatFileSize(f.size)}`}
                        primaryTypographyProps={{ sx: { wordBreak: 'break-word' } }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Manuscript title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              sx={{ minWidth: 280, flexGrow: 1 }}
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={runVerification}
              disabled={files.length === 0 || loading}
              sx={{ px: 4 }}
            >
              Verify bundle
            </Button>
          </Box>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: errorIngestion ? 2 : 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {error && errorIngestion && (
        <Box sx={{ mb: 3 }}>
          <IngestionReport ingestion={errorIngestion} defaultExpanded />
        </Box>
      )}

      {loading && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {uploadPct < 100 ? 'Uploading bundle…' : 'Re-running the authors’ tests…'}
          </Typography>
          <Box sx={{ maxWidth: 500, mx: 'auto', mb: 1 }}>
            {uploadPct < 100 ? (
              <LinearProgress variant="determinate" value={uploadPct} sx={{ height: 10, borderRadius: 5 }} />
            ) : (
              <LinearProgress sx={{ height: 10, borderRadius: 5 }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {uploadPct < 100
              ? `${uploadPct}% uploaded`
              : 'Extracting claims, resolving references, and verifying — this can take a moment for large bundles.'}
          </Typography>
        </Paper>
      )}

      {report && !loading && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="outlined" startIcon={<Replay />} onClick={reset}>
              Verify another bundle
            </Button>
          </Box>
          <VerificationReport report={report} />
        </Box>
      )}
    </Box>
  );
};

export default BundleVerifier;
