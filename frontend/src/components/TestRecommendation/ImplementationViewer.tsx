/**
 * ImplementationViewer Component
 * 
 * Displays code implementation for statistical tests.
 * 
 * @timestamp 2025-08-06 22:30:00 UTC
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Button,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

import { ImplementationViewerProps } from './TestRecommendation.types';

const ImplementationViewer: React.FC<ImplementationViewerProps> = ({
  implementation,
  language: defaultLanguage = 'python',
  onCopy,
  onDownload,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // Get code based on selected language
  const getCode = () => {
    switch (selectedLanguage) {
      case 'python':
        return implementation.pythonCode;
      case 'r':
        return implementation.rCode;
      case 'spss':
        return implementation.spsseSyntax || 'SPSS syntax not available';
      case 'sas':
        return implementation.sasCode || 'SAS code not available';
      default:
        return implementation.pythonCode;
    }
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    const code = getCode();
    navigator.clipboard.writeText(code).then(() => {
      setSnackbar({ open: true, message: 'Code copied to clipboard!' });
      if (onCopy) {
        onCopy(code);
      }
    });
  };

  // Handle download
  const handleDownload = () => {
    const code = getCode();
    const extension = selectedLanguage === 'python' ? 'py' : 
                     selectedLanguage === 'r' ? 'R' : 
                     selectedLanguage === 'spss' ? 'sps' : 'sas';
    const filename = `statistical_test.${extension}`;
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    if (onDownload) {
      onDownload(code, filename);
    }
    
    setSnackbar({ open: true, message: `Code downloaded as ${filename}` });
  };

  // Language display names
  const languageNames = {
    python: 'Python',
    r: 'R',
    spss: 'SPSS',
    sas: 'SAS',
  };

  // Check which languages are available
  const availableLanguages = [];
  if (implementation.pythonCode) availableLanguages.push('python');
  if (implementation.rCode) availableLanguages.push('r');
  if (implementation.spsseSyntax) availableLanguages.push('spss');
  if (implementation.sasCode) availableLanguages.push('sas');

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            Implementation Code
          </Typography>
          <Box>
            <Tooltip title="Copy code">
              <IconButton onClick={handleCopy} size="small">
                <CopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download code">
              <IconButton onClick={handleDownload} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Tabs
          value={selectedLanguage}
          onChange={(e, value) => setSelectedLanguage(value)}
          aria-label="implementation language tabs"
        >
          {availableLanguages.map(lang => (
            <Tab
              key={lang}
              label={languageNames[lang as keyof typeof languageNames]}
              value={lang}
              icon={<CodeIcon />}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Libraries Required */}
      {implementation.libraries.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Required Libraries:
          </Typography>
          <Typography variant="body2">
            {selectedLanguage === 'python' && `pip install ${implementation.libraries.join(' ')}`}
            {selectedLanguage === 'r' && `install.packages(c(${implementation.libraries.map(lib => `"${lib}"`).join(', ')}))`}
          </Typography>
        </Alert>
      )}

      {/* Data Preparation Steps */}
      {implementation.dataPreparation.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Data Preparation Required:
          </Typography>
          {implementation.dataPreparation.map((step, idx) => (
            <Typography key={idx} variant="body2">
              {idx + 1}. {step}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Code Display */}
      <Box
        sx={{
          bgcolor: 'grey.100',
          p: 2,
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          overflow: 'auto',
          maxHeight: 400,
          '& pre': {
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          },
        }}
      >
        <pre>{getCode()}</pre>
      </Box>

      {/* Usage Notes */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Usage Notes:
        </Typography>
        <Typography variant="body2" paragraph>
          • Replace 'your_data' with your actual dataset variable
        </Typography>
        <Typography variant="body2" paragraph>
          • Adjust column names to match your data structure
        </Typography>
        <Typography variant="body2" paragraph>
          • Check assumptions before running the test
        </Typography>
        <Typography variant="body2">
          • Interpret results in the context of your research question
        </Typography>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Paper>
  );
};

export default ImplementationViewer;