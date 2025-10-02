import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Science as ScienceIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Shield as ShieldIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Code as CodeIcon,
  TableChart as TableIcon,
  Description as DocumentIcon,
  Psychology as PsychologyIcon,
  Calculate as CalculateIcon,
  Fingerprint as FingerprintIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDarkMode } from '../context/DarkModeContext';

const ResultsDisplay = ({ results, testName = 'Statistical Analysis' }) => {
  const { darkMode } = useDarkMode();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});
  const [precisionDisplay, setPrecisionDisplay] = useState('scientific');
  const [decimalPlaces, setDecimalPlaces] = useState(6);
  const [showRawData, setShowRawData] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  if (!results) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No results to display. Please run an analysis first.
        </Typography>
      </Paper>
    );
  }

  const formatNumber = (value, precision = decimalPlaces) => {
    if (value === null || value === undefined) return '-';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return value;

    if (precisionDisplay === 'scientific') {
      return num.toExponential(precision);
    } else if (precisionDisplay === 'decimal') {
      return num.toFixed(precision);
    } else if (precisionDisplay === 'full') {
      return value.toString();
    }
    return num.toLocaleString('en-US', { maximumFractionDigits: precision });
  };

  const formatPValue = (pValue) => {
    if (!pValue && pValue !== 0) return '-';

    const p = typeof pValue === 'string' ? parseFloat(pValue) : pValue;

    if (p < 0.001) {
      return `${p.toExponential(4)} ***`;
    } else if (p < 0.01) {
      return `${p.toFixed(6)} **`;
    } else if (p < 0.05) {
      return `${p.toFixed(6)} *`;
    } else {
      return p.toFixed(6);
    }
  };

  const getSignificanceLabel = (pValue) => {
    if (!pValue && pValue !== 0) return null;

    const p = typeof pValue === 'string' ? parseFloat(pValue) : pValue;

    if (p < 0.001) {
      return <Chip label="Highly Significant" color="error" size="small" />;
    } else if (p < 0.01) {
      return <Chip label="Very Significant" color="warning" size="small" />;
    } else if (p < 0.05) {
      return <Chip label="Significant" color="info" size="small" />;
    } else {
      return <Chip label="Not Significant" color="default" size="small" />;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      enqueueSnackbar('Copied to clipboard', { variant: 'success' });
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateCSV = () => {
    const csvRows = [];
    csvRows.push(['StickForStats Results Export']);
    csvRows.push(['Test:', testName]);
    csvRows.push(['Generated:', new Date().toISOString()]);
    csvRows.push([]);

    if (results.main_results) {
      csvRows.push(['Main Results']);
      Object.entries(results.main_results).forEach(([key, value]) => {
        csvRows.push([key, formatNumber(value, 50)]);
      });
      csvRows.push([]);
    }

    if (results.statistics) {
      csvRows.push(['Statistics']);
      Object.entries(results.statistics).forEach(([key, value]) => {
        if (typeof value === 'object') {
          csvRows.push([key]);
          Object.entries(value).forEach(([subKey, subValue]) => {
            csvRows.push(['  ' + subKey, formatNumber(subValue, 50)]);
          });
        } else {
          csvRows.push([key, formatNumber(value, 50)]);
        }
      });
      csvRows.push([]);
    }

    if (results.guardian_report) {
      csvRows.push(['Guardian System Report']);
      csvRows.push(['Status:', results.guardian_report.status || 'Unknown']);
      if (results.guardian_report.warnings) {
        csvRows.push(['Warnings:']);
        results.guardian_report.warnings.forEach(warning => {
          csvRows.push(['  -', warning]);
        });
      }
      csvRows.push([]);
    }

    if (results.precision_info) {
      csvRows.push(['Precision Information']);
      csvRows.push(['Decimal Places:', results.precision_info.decimal_places || '50']);
      csvRows.push(['Calculation Method:', results.precision_info.method || 'Python Decimal']);
      csvRows.push([]);
    }

    const csvContent = csvRows.map(row =>
      row.map(cell =>
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(',')
    ).join('\n');

    return csvContent;
  };

  const generateJSON = () => {
    const exportData = {
      test_name: testName,
      export_date: new Date().toISOString(),
      results: results,
      precision: {
        decimal_places: 50,
        display_format: precisionDisplay,
        calculation_method: 'Python Decimal Library'
      }
    };
    return JSON.stringify(exportData, null, 2);
  };

  const generateLatex = () => {
    let latex = '\\documentclass{article}\n';
    latex += '\\usepackage{amsmath}\n';
    latex += '\\usepackage{booktabs}\n';
    latex += '\\begin{document}\n\n';
    latex += '\\section{Statistical Analysis Results}\n\n';
    latex += `\\subsection{${testName}}\n\n`;

    if (results.main_results) {
      latex += '\\begin{table}[h]\n';
      latex += '\\centering\n';
      latex += '\\begin{tabular}{lr}\n';
      latex += '\\toprule\n';
      latex += 'Metric & Value \\\\\n';
      latex += '\\midrule\n';

      Object.entries(results.main_results).forEach(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/^./, str => str.toUpperCase());
        latex += `${formattedKey} & ${formatNumber(value, 10)} \\\\\n`;
      });

      latex += '\\bottomrule\n';
      latex += '\\end{tabular}\n';
      latex += '\\caption{Main Results}\n';
      latex += '\\end{table}\n\n';
    }

    latex += '\\end{document}';
    return latex;
  };

  const handleExport = () => {
    let content, filename, mimeType;

    switch (exportFormat) {
      case 'csv':
        content = generateCSV();
        filename = `results_${Date.now()}.csv`;
        mimeType = 'text/csv';
        break;
      case 'json':
        content = generateJSON();
        filename = `results_${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      case 'latex':
        content = generateLatex();
        filename = `results_${Date.now()}.tex`;
        mimeType = 'text/plain';
        break;
      default:
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    enqueueSnackbar(`Results exported as ${exportFormat.toUpperCase()}`, { variant: 'success' });
    setExportDialogOpen(false);
  };

  const renderMainResults = () => {
    if (!results.main_results) return null;

    return (
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssessmentIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" fontWeight="bold">
              Primary Results
            </Typography>
            {results.main_results.p_value && getSignificanceLabel(results.main_results.p_value)}
          </Box>

          <TableContainer>
            <Table size="small">
              <TableBody>
                {Object.entries(results.main_results).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 'medium' }}>
                      {key.replace(/_/g, ' ').replace(/^./, str => str.toUpperCase())}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Typography variant="body2" fontFamily="monospace">
                          {key.includes('p_value') ? formatPValue(value) : formatNumber(value)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(value.toString())}
                          sx={{ ml: 1 }}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {results.main_results.confidence_interval && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                95% Confidence Interval: [{formatNumber(results.main_results.confidence_interval[0])},
                {formatNumber(results.main_results.confidence_interval[1])}]
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderStatistics = () => {
    if (!results.statistics) return null;

    return (
      <Card elevation={2}>
        <CardContent>
          <Box
            sx={{ display: 'flex', alignItems: 'center', mb: 2, cursor: 'pointer' }}
            onClick={() => toggleSection('statistics')}
          >
            <CalculateIcon sx={{ mr: 1, color: theme.palette.info.main }} />
            <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
              Detailed Statistics
            </Typography>
            {expandedSections.statistics ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>

          <Collapse in={expandedSections.statistics !== false}>
            <Grid container spacing={2}>
              {Object.entries(results.statistics).map(([category, stats]) => (
                <Grid item xs={12} md={6} key={category}>
                  <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {category.replace(/_/g, ' ').replace(/^./, str => str.toUpperCase())}
                    </Typography>
                    {typeof stats === 'object' ? (
                      <List dense>
                        {Object.entries(stats).map(([key, value]) => (
                          <ListItem key={key} sx={{ py: 0 }}>
                            <ListItemText
                              primary={key.replace(/_/g, ' ')}
                              secondary={formatNumber(value)}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" fontFamily="monospace">
                        {formatNumber(stats)}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  const renderGuardianReport = () => {
    if (!results.guardian_report) return null;

    const status = results.guardian_report.status || 'unknown';
    const statusColor = status === 'passed' ? 'success' : status === 'warning' ? 'warning' : 'error';

    return (
      <Card elevation={2} sx={{
        borderLeft: `4px solid ${theme.palette[statusColor].main}`,
        background: darkMode
          ? `linear-gradient(135deg, ${alpha(theme.palette[statusColor].main, 0.1)} 0%, transparent 100%)`
          : `linear-gradient(135deg, ${alpha(theme.palette[statusColor].main, 0.05)} 0%, transparent 100%)`
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ShieldIcon sx={{ mr: 1, color: theme.palette[statusColor].main }} />
            <Typography variant="h6" fontWeight="bold">
              Guardian System Report
            </Typography>
            <Chip
              label={status.toUpperCase()}
              color={statusColor}
              size="small"
              sx={{ ml: 'auto' }}
            />
          </Box>

          {results.guardian_report.checks && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Assumption Checks:
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(results.guardian_report.checks).map(([check, passed]) => (
                  <Grid item xs={6} sm={4} md={3} key={check}>
                    <Chip
                      icon={passed ? <CheckIcon /> : <ErrorIcon />}
                      label={check.replace(/_/g, ' ')}
                      color={passed ? 'success' : 'error'}
                      variant="outlined"
                      size="small"
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {results.guardian_report.warnings && results.guardian_report.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Warnings:
              </Typography>
              {results.guardian_report.warnings.map((warning, index) => (
                <Typography key={index} variant="body2">
                  • {warning}
                </Typography>
              ))}
            </Alert>
          )}

          {results.guardian_report.suggestions && results.guardian_report.suggestions.length > 0 && (
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                Recommendations:
              </Typography>
              {results.guardian_report.suggestions.map((suggestion, index) => (
                <Typography key={index} variant="body2">
                  • {suggestion}
                </Typography>
              ))}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPrecisionInfo = () => {
    if (!results.precision_info) return null;

    return (
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FingerprintIcon sx={{ mr: 1, color: theme.palette.success.main }} />
            <Typography variant="h6" fontWeight="bold">
              50-Decimal Precision Guarantee
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: alpha(theme.palette.success.main, 0.1) }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  50
                </Typography>
                <Typography variant="body2">
                  Decimal Places
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {results.precision_info.method || 'Python Decimal'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Calculation Method
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {results.precision_info.verification || 'Verified'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Precision Status
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {results.precision_info.note && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {results.precision_info.note}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderInterpretation = () => {
    if (!results.interpretation) return null;

    return (
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PsychologyIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />
            <Typography variant="h6" fontWeight="bold">
              Scientific Interpretation
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            {results.interpretation.summary}
          </Typography>

          {results.interpretation.effect_size && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Effect Size:</strong> {results.interpretation.effect_size.value} ({results.interpretation.effect_size.interpretation})
              </Typography>
            </Alert>
          )}

          {results.interpretation.practical_significance && (
            <Typography variant="body2" color="textSecondary">
              <strong>Practical Significance:</strong> {results.interpretation.practical_significance}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        background: darkMode
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ScienceIcon sx={{ mr: 2, fontSize: 32, color: theme.palette.primary.main }} />
        <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1 }}>
          {testName} Results
        </Typography>

        <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
          <InputLabel>Precision</InputLabel>
          <Select
            value={precisionDisplay}
            onChange={(e) => setPrecisionDisplay(e.target.value)}
            label="Precision"
          >
            <MenuItem value="scientific">Scientific</MenuItem>
            <MenuItem value="decimal">Decimal</MenuItem>
            <MenuItem value="full">Full (50-decimal)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          type="number"
          size="small"
          label="Decimals"
          value={decimalPlaces}
          onChange={(e) => setDecimalPlaces(parseInt(e.target.value) || 6)}
          inputProps={{ min: 1, max: 50 }}
          sx={{ width: 100, mr: 2 }}
        />

        <Tooltip title="Export Results">
          <IconButton onClick={() => setExportDialogOpen(true)} color="primary">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Tabs
        value={selectedTab}
        onChange={(e, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Summary" />
        <Tab label="Details" />
        <Tab label="Guardian" />
        <Tab label="Raw Data" />
      </Tabs>

      {selectedTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {renderMainResults()}
          </Grid>
          <Grid item xs={12}>
            {renderInterpretation()}
          </Grid>
          <Grid item xs={12}>
            {renderPrecisionInfo()}
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {renderStatistics()}
          </Grid>
          {results.additional_metrics && (
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Additional Metrics
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(results.additional_metrics).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell>{key.replace(/_/g, ' ')}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                              {formatNumber(value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {renderGuardianReport()}
          </Grid>
        </Grid>
      )}

      {selectedTab === 3 && (
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CodeIcon sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                Raw JSON Output
              </Typography>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(JSON.stringify(results, null, 2))}
                sx={{ ml: 'auto' }}
              >
                <CopyIcon />
              </IconButton>
            </Box>
            <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', overflow: 'auto', maxHeight: 500 }}>
              <pre style={{ margin: 0, fontSize: '0.85rem' }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            </Paper>
          </CardContent>
        </Card>
      )}

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Results</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              label="Export Format"
            >
              <MenuItem value="csv">CSV (Spreadsheet)</MenuItem>
              <MenuItem value="json">JSON (Full Precision)</MenuItem>
              <MenuItem value="latex">LaTeX (Publication)</MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            All exports maintain full 50-decimal precision for scientific accuracy.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} variant="contained" startIcon={<DownloadIcon />}>
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ResultsDisplay;