/**
 * CodeExportPanel Component
 *
 * A reusable panel for exporting statistical analysis code in R and Python.
 * Includes syntax highlighting, copy/download functionality, and language toggle.
 *
 * Features:
 * - R and Python code generation
 * - Syntax highlighting (basic)
 * - Copy to clipboard
 * - Download as file
 * - Collapsible panel
 * - Guardian assumption checks included
 *
 * @module CodeExportPanel
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Tooltip,
  Collapse,
  Snackbar,
  Alert,
  Divider,
  Chip,
  useTheme
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Code as CodeIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

import {
  generateRCode,
  generatePythonCode,
  downloadCode,
  copyToClipboard
} from '../../utils/codeExport/statisticalTestsCodeGenerator';

/**
 * CodeExportPanel - Export statistical analysis code
 *
 * @param {Object} props
 * @param {string} props.testType - Type of statistical test
 * @param {Object} props.data - Data used in the analysis
 * @param {Object} props.results - Results from the analysis
 * @param {Object} props.assumptions - Guardian assumption check results
 * @param {Object} props.options - Test options (alpha, alternative, etc.)
 * @param {boolean} props.defaultExpanded - Whether panel starts expanded
 * @param {string} props.title - Custom title for the panel
 */
const CodeExportPanel = ({
  testType,
  data = {},
  results = {},
  assumptions = {},
  options = {},
  defaultExpanded = false,
  title = 'Export Reproducible Code'
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [language, setLanguage] = useState('R');
  const [copied, setCopied] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Generate code based on selected language
  const generatedCode = useMemo(() => {
    const params = {
      testType,
      data,
      results,
      assumptions,
      options
    };

    try {
      return language === 'R' ? generateRCode(params) : generatePythonCode(params);
    } catch (error) {
      console.error('Code generation error:', error);
      return `# Error generating code: ${error.message}\n# Please check your data and try again.`;
    }
  }, [testType, data, results, assumptions, options, language]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(generatedCode);
    if (success) {
      setCopied(true);
      setSnackbar({
        open: true,
        message: `${language} code copied to clipboard!`,
        severity: 'success'
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to copy. Please select and copy manually.',
        severity: 'error'
      });
    }
  }, [generatedCode, language]);

  // Handle download
  const handleDownload = useCallback(() => {
    try {
      downloadCode(generatedCode, language, testType);
      setSnackbar({
        open: true,
        message: `${language} code downloaded successfully!`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Download failed. Please try again.',
        severity: 'error'
      });
    }
  }, [generatedCode, language, testType]);

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Get line count for code
  const lineCount = generatedCode.split('\n').length;

  return (
    <Paper
      elevation={2}
      sx={{
        mt: 3,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="medium">
            {title}
          </Typography>
          <Chip
            label={`${lineCount} lines`}
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
          />
          {assumptions.violations?.length > 0 && (
            <Chip
              label="Guardian warnings included"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {/* Language Toggle and Actions */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper
          }}
        >
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => setLanguage('R')}
              variant={language === 'R' ? 'contained' : 'outlined'}
              sx={{ minWidth: 60 }}
            >
              R
            </Button>
            <Button
              onClick={() => setLanguage('Python')}
              variant={language === 'Python' ? 'contained' : 'outlined'}
              sx={{ minWidth: 80 }}
            >
              Python
            </Button>
          </ButtonGroup>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
              <Button
                size="small"
                startIcon={copied ? <CheckIcon /> : <CopyIcon />}
                onClick={handleCopy}
                color={copied ? 'success' : 'primary'}
                variant="outlined"
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Tooltip>
            <Tooltip title={`Download as .${language === 'R' ? 'R' : 'py'} file`}>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                variant="outlined"
              >
                Download
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Code Display */}
        <Box
          sx={{
            maxHeight: 500,
            overflow: 'auto',
            bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5'
          }}
        >
          <pre
            style={{
              margin: 0,
              padding: '16px',
              fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
              fontSize: '13px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: theme.palette.mode === 'dark' ? '#d4d4d4' : '#333'
            }}
          >
            {generatedCode}
          </pre>
        </Box>

        {/* Footer with info */}
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
            borderTop: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {language === 'R' ? (
              <>Required packages: stats, car, effectsize, nortest</>
            ) : (
              <>Required packages: numpy, pandas, scipy, statsmodels, pingouin</>
            )}
          </Typography>
        </Box>
      </Collapse>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

/**
 * Compact version for inline use
 */
export const CodeExportButton = ({
  testType,
  data,
  results,
  assumptions,
  options
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Tooltip title="Export R/Python code">
        <IconButton
          onClick={() => setDialogOpen(true)}
          color="primary"
          size="small"
        >
          <CodeIcon />
        </IconButton>
      </Tooltip>

      {dialogOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3
          }}
          onClick={() => setDialogOpen(false)}
        >
          <Box
            onClick={e => e.stopPropagation()}
            sx={{ width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }}
          >
            <CodeExportPanel
              testType={testType}
              data={data}
              results={results}
              assumptions={assumptions}
              options={options}
              defaultExpanded={true}
              title="Export Reproducible Code"
            />
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setDialogOpen(false)}
              sx={{ mt: 1 }}
            >
              Close
            </Button>
          </Box>
        </Box>
      )}
    </>
  );
};

export default CodeExportPanel;
