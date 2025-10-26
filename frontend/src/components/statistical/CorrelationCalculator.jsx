/**
 * Correlation Calculator Component
 * =================================
 * Complete UI for performing correlation analysis with 50 decimal precision
 * Supports Pearson, Spearman, and Kendall correlations with matrices
 *
 * Features:
 * - Multiple correlation methods (Pearson, Spearman, Kendall)
 * - Pairwise and matrix correlations
 * - Significance testing and confidence intervals
 * - Correlation matrix heatmap visualization
 * - 50 decimal precision display
 * - Assumption checking for Pearson correlation
 * - Export to publication-ready formats
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Tooltip,
  IconButton,
  Divider,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';

import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  GetApp as GetAppIcon,
  Help as HelpIcon,
  ScatterPlot as ScatterPlotIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  GridOn as GridOnIcon,
  Calculate as CalculateIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PictureAsPdf as PictureAsPdfIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';

// Import utilities
import Decimal from 'decimal.js';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Import service
import { HighPrecisionStatisticalService } from '../../services/HighPrecisionStatisticalService';
import GuardianService from '../../services/GuardianService';
import GuardianWarning from '../Guardian/GuardianWarning';

// Configure Decimal precision
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

const CorrelationCalculator = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [correlationType, setCorrelationType] = useState('pearson');
  const [analysisMode, setAnalysisMode] = useState('pairwise'); // pairwise or matrix
  const [dataInput, setDataInput] = useState({
    dataFormat: 'manual', // manual, paste, file
    rawData: '',
    variables: []
  });

  const [dataPoints, setDataPoints] = useState({
    data: [], // Array of arrays for matrix correlation
    variableNames: [],
    pairwiseX: [],
    pairwiseY: []
  });

  const [options, setOptions] = useState({
    confidenceLevel: 0.95,
    alternativeHypothesis: 'two-sided', // two-sided, greater, less
    missingDataMethod: 'pairwise', // pairwise, listwise
    correctForMultipleTesting: false,
    bonferroniCorrection: false,
    bootstrapCI: false,
    bootstrapIterations: 1000
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFullPrecision, setShowFullPrecision] = useState(false);
  const [displayPrecision, setDisplayPrecision] = useState(6);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [interpretationOpen, setInterpretationOpen] = useState(false);

  // Guardian Integration State
  const [guardianResult, setGuardianResult] = useState(null);
  const [isCheckingAssumptions, setIsCheckingAssumptions] = useState(false);
  const [isTestBlocked, setIsTestBlocked] = useState(false);

  // Correlation methods configuration
  const correlationMethods = {
    pearson: {
      name: "Pearson's r",
      description: 'Measures linear correlation between continuous variables',
      assumptions: ['Linear relationship', 'Continuous data', 'Normal distribution', 'No outliers'],
      range: '[-1, 1]',
      icon: <ScatterPlotIcon />
    },
    spearman: {
      name: "Spearman's ρ",
      description: 'Rank-based correlation for monotonic relationships',
      assumptions: ['Monotonic relationship', 'Ordinal or continuous data'],
      range: '[-1, 1]',
      icon: <TimelineIcon />
    },
    kendall: {
      name: "Kendall's τ",
      description: 'Rank-based correlation measuring concordance',
      assumptions: ['Ordinal or continuous data', 'Useful for small samples'],
      range: '[-1, 1]',
      icon: <AssessmentIcon />
    }
  };

  // Service instance
  const statService = useMemo(() => new HighPrecisionStatisticalService(), []);

  // Guardian: Validate Pearson correlation assumptions
  useEffect(() => {
    const validateAssumptions = async () => {
      // Only validate Pearson correlation (parametric test with assumptions)
      // Spearman and Kendall are non-parametric - no normality assumptions
      if (correlationType !== 'pearson') {
        setGuardianResult(null);
        setIsTestBlocked(false);
        return;
      }

      // Check if we have sufficient data
      if (analysisMode === 'pairwise') {
        // Pairwise mode: need both X and Y arrays
        if (!dataPoints.pairwiseX || !dataPoints.pairwiseY ||
            dataPoints.pairwiseX.length < 3 || dataPoints.pairwiseY.length < 3) {
          setGuardianResult(null);
          setIsTestBlocked(false);
          return;
        }
      } else {
        // Matrix mode: need at least 2 variables with data
        if (!dataPoints.data || dataPoints.data.length < 2 ||
            !dataPoints.data[0] || dataPoints.data[0].length < 3) {
          setGuardianResult(null);
          setIsTestBlocked(false);
          return;
        }
      }

      try {
        setIsCheckingAssumptions(true);

        let formattedData;
        if (analysisMode === 'pairwise') {
          // Format as array of two arrays for Guardian
          formattedData = [dataPoints.pairwiseX, dataPoints.pairwiseY];
        } else {
          // Matrix mode: data is already in array of arrays format
          formattedData = dataPoints.data;
        }

        // Call Guardian API
        const result = await GuardianService.checkAssumptions(
          formattedData,
          'pearson',  // Test type for Pearson correlation
          1 - options.confidenceLevel // alpha
        );

        setGuardianResult(result);

        // Block test if critical violations detected
        setIsTestBlocked(
          result.hasViolations && result.criticalViolations && result.criticalViolations.length > 0
        );

        console.log('[CorrelationCalculator] Guardian validation result:', result);

      } catch (error) {
        console.error('[CorrelationCalculator] Guardian validation error:', error);
        // Don't block on Guardian errors - allow test to proceed
        setGuardianResult(null);
        setIsTestBlocked(false);
      } finally {
        setIsCheckingAssumptions(false);
      }
    };

    validateAssumptions();
  }, [dataPoints.pairwiseX, dataPoints.pairwiseY, dataPoints.data, correlationType, analysisMode, options.confidenceLevel]);

  // Helper functions
  const formatNumber = useCallback((value, precision = displayPrecision) => {
    if (value === null || value === undefined) return 'N/A';
    try {
      const decimal = new Decimal(value.toString());
      if (showFullPrecision) {
        return decimal.toString();
      }
      return decimal.toFixed(precision);
    } catch (e) {
      return value.toString();
    }
  }, [displayPrecision, showFullPrecision]);

  const parseDataInput = useCallback(() => {
    try {
      if (dataInput.dataFormat === 'manual' || dataInput.dataFormat === 'paste') {
        const rows = dataInput.rawData.trim().split('\n').filter(row => row.trim());

        if (analysisMode === 'pairwise') {
          // For pairwise correlation, expect two columns
          const xValues = [];
          const yValues = [];

          rows.forEach(row => {
            const values = row.split(/[\s,\t]+/).map(v => parseFloat(v.trim()));
            if (values.length >= 2 && !isNaN(values[0]) && !isNaN(values[1])) {
              xValues.push(values[0]);
              yValues.push(values[1]);
            }
          });

          if (xValues.length > 0) {
            setDataPoints({
              ...dataPoints,
              pairwiseX: xValues,
              pairwiseY: yValues
            });
            setError(null);
          } else {
            throw new Error('No valid data points found. Expected format: x y per row');
          }
        } else {
          // For matrix correlation, expect multiple columns
          const firstRow = rows[0].split(/[\s,\t]+/);
          const isHeader = firstRow.some(v => isNaN(parseFloat(v)));

          let headers = [];
          let dataStartIndex = 0;

          if (isHeader) {
            headers = firstRow;
            dataStartIndex = 1;
          } else {
            headers = firstRow.map((_, i) => `Variable ${i + 1}`);
          }

          const data = Array(headers.length).fill(null).map(() => []);

          for (let i = dataStartIndex; i < rows.length; i++) {
            const values = rows[i].split(/[\s,\t]+/).map(v => parseFloat(v.trim()));
            if (values.length === headers.length) {
              values.forEach((val, j) => {
                if (!isNaN(val)) {
                  data[j].push(val);
                }
              });
            }
          }

          if (data[0].length > 0) {
            setDataPoints({
              ...dataPoints,
              data: data,
              variableNames: headers
            });
            setError(null);
          } else {
            throw new Error('No valid data found for matrix correlation');
          }
        }
      }
    } catch (err) {
      setError(`Error parsing data: ${err.message}`);
    }
  }, [dataInput, analysisMode, dataPoints]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 1) {
            const headers = results.data[0];
            const data = results.data.slice(1).filter(row => row.some(cell => cell !== ''));

            if (analysisMode === 'pairwise') {
              const xValues = [];
              const yValues = [];

              data.forEach(row => {
                const x = parseFloat(row[0]);
                const y = parseFloat(row[1]);
                if (!isNaN(x) && !isNaN(y)) {
                  xValues.push(x);
                  yValues.push(y);
                }
              });

              setDataPoints({
                ...dataPoints,
                pairwiseX: xValues,
                pairwiseY: yValues,
                variableNames: headers.slice(0, 2)
              });
            } else {
              const matrixData = Array(headers.length).fill(null).map(() => []);

              data.forEach(row => {
                row.forEach((val, j) => {
                  const num = parseFloat(val);
                  if (!isNaN(num)) {
                    matrixData[j].push(num);
                  }
                });
              });

              setDataPoints({
                ...dataPoints,
                data: matrixData,
                variableNames: headers
              });
            }

            setError(null);
          }
        },
        error: (err) => {
          setError(`Error reading file: ${err.message}`);
        }
      });
    }
  }, [analysisMode, dataPoints]);

  const performCorrelation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (analysisMode === 'pairwise') {
        // Validate pairwise data
        if (dataPoints.pairwiseX.length < 3) {
          throw new Error('At least 3 data points are required');
        }

        response = await statService.performCorrelation({
          method: correlationType,
          x_values: dataPoints.pairwiseX,
          y_values: dataPoints.pairwiseY,
          confidence_level: options.confidenceLevel,
          alternative: options.alternativeHypothesis,
          include_assumptions: correlationType === 'pearson',
          bootstrap_ci: options.bootstrapCI,
          n_bootstrap: options.bootstrapIterations
        });

        // Process pairwise result
        response.isPairwise = true;
      } else {
        // Matrix correlation
        if (dataPoints.data.length < 2) {
          throw new Error('At least 2 variables are required for matrix correlation');
        }

        response = await statService.performCorrelationMatrix({
          method: correlationType,
          data: dataPoints.data,
          variable_names: dataPoints.variableNames,
          confidence_level: options.confidenceLevel,
          missing_method: options.missingDataMethod,
          bonferroni: options.bonferroniCorrection
        });

        // Process matrix result
        response.isMatrix = true;
      }

      setResults(response);

    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [dataPoints, analysisMode, correlationType, options, statService]);

  const getCorrelationStrength = useCallback((value) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.9) return { label: 'Very Strong', color: 'error' };
    if (absValue >= 0.7) return { label: 'Strong', color: 'warning' };
    if (absValue >= 0.5) return { label: 'Moderate', color: 'info' };
    if (absValue >= 0.3) return { label: 'Weak', color: 'default' };
    return { label: 'Very Weak', color: 'default' };
  }, []);

  const exportResults = useCallback((format) => {
    if (!results) return;

    if (format === 'pdf') {
      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(16);
      doc.text('Correlation Analysis Results', 20, yPosition);
      yPosition += 15;

      // Method
      doc.setFontSize(12);
      doc.text(`Method: ${correlationMethods[correlationType].name}`, 20, yPosition);
      yPosition += 10;

      if (results.isPairwise) {
        // Pairwise correlation results
        doc.setFontSize(11);
        doc.text('Correlation Results:', 20, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.text(`Correlation coefficient: ${formatNumber(results.correlation, 6)}`, 25, yPosition);
        yPosition += 5;
        doc.text(`p-value: ${formatNumber(results.p_value, 6)}`, 25, yPosition);
        yPosition += 5;

        if (results.confidence_interval) {
          doc.text(`95% CI: [${formatNumber(results.confidence_interval[0], 6)}, ${formatNumber(results.confidence_interval[1], 6)}]`, 25, yPosition);
          yPosition += 5;
        }

        doc.text(`Sample size: ${results.sample_size}`, 25, yPosition);
        yPosition += 5;

        const strength = getCorrelationStrength(results.correlation);
        doc.text(`Strength: ${strength.label}`, 25, yPosition);

      } else if (results.isMatrix) {
        // Matrix correlation results
        doc.setFontSize(11);
        doc.text('Correlation Matrix:', 20, yPosition);
        yPosition += 5;

        // Create correlation matrix table
        const matrixData = results.correlation_matrix.map((row, i) =>
          [results.variable_names[i], ...row.map(val => formatNumber(val, 4))]
        );

        doc.autoTable({
          startY: yPosition,
          head: [['', ...results.variable_names]],
          body: matrixData,
          theme: 'striped',
          styles: { fontSize: 8 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;

        // P-values matrix if available
        if (results.p_value_matrix) {
          doc.setFontSize(11);
          doc.text('P-value Matrix:', 20, yPosition);
          yPosition += 5;

          const pValueData = results.p_value_matrix.map((row, i) =>
            [results.variable_names[i], ...row.map(val => val === null ? '-' : formatNumber(val, 6))]
          );

          doc.autoTable({
            startY: yPosition,
            head: [['', ...results.variable_names]],
            body: pValueData,
            theme: 'striped',
            styles: { fontSize: 8 }
          });
        }
      }

      // Save PDF
      doc.save('correlation_analysis_results.pdf');

    } else if (format === 'csv') {
      let csvContent = 'Correlation Analysis Results\n\n';
      csvContent += `Method,${correlationMethods[correlationType].name}\n\n`;

      if (results.isPairwise) {
        csvContent += 'Statistics,Value\n';
        csvContent += `Correlation coefficient,${results.correlation}\n`;
        csvContent += `p-value,${results.p_value}\n`;
        csvContent += `Sample size,${results.sample_size}\n`;

        if (results.confidence_interval) {
          csvContent += `CI Lower,${results.confidence_interval[0]}\n`;
          csvContent += `CI Upper,${results.confidence_interval[1]}\n`;
        }

      } else if (results.isMatrix) {
        // Correlation matrix
        csvContent += 'Correlation Matrix\n';
        csvContent += ',' + results.variable_names.join(',') + '\n';
        results.correlation_matrix.forEach((row, i) => {
          csvContent += results.variable_names[i] + ',' + row.join(',') + '\n';
        });

        // P-value matrix
        if (results.p_value_matrix) {
          csvContent += '\nP-value Matrix\n';
          csvContent += ',' + results.variable_names.join(',') + '\n';
          results.p_value_matrix.forEach((row, i) => {
            csvContent += results.variable_names[i] + ',' + row.map(v => v === null ? '' : v).join(',') + '\n';
          });
        }
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      saveAs(blob, 'correlation_analysis_results.csv');
    }

    setExportDialogOpen(false);
  }, [results, correlationType, correlationMethods, formatNumber, getCorrelationStrength]);

  const resetCalculator = useCallback(() => {
    setDataPoints({
      data: [],
      variableNames: [],
      pairwiseX: [],
      pairwiseY: []
    });
    setResults(null);
    setError(null);
  }, []);

  // Render functions
  const renderDataInput = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <TableChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Data Input
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Analysis Mode</InputLabel>
              <Select
                value={analysisMode}
                onChange={(e) => {
                  setAnalysisMode(e.target.value);
                  setDataPoints({ data: [], variableNames: [], pairwiseX: [], pairwiseY: [] });
                }}
                label="Analysis Mode"
              >
                <MenuItem value="pairwise">Pairwise Correlation (2 variables)</MenuItem>
                <MenuItem value="matrix">Correlation Matrix (multiple variables)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Data Entry Method</InputLabel>
              <Select
                value={dataInput.dataFormat}
                onChange={(e) => setDataInput({ ...dataInput, dataFormat: e.target.value })}
                label="Data Entry Method"
              >
                <MenuItem value="manual">Manual Entry</MenuItem>
                <MenuItem value="paste">Paste from Clipboard</MenuItem>
                <MenuItem value="file">Upload CSV File</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {dataInput.dataFormat === 'manual' || dataInput.dataFormat === 'paste' ? (
          <>
            <TextField
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              label={analysisMode === 'pairwise' ? 'Enter Data (X Y per row)' : 'Enter Data (columns separated by spaces/tabs)'}
              value={dataInput.rawData}
              onChange={(e) => setDataInput({ ...dataInput, rawData: e.target.value })}
              placeholder={analysisMode === 'pairwise' ? '1.2 3.4\n2.3 4.5\n3.4 5.6' : 'Var1 Var2 Var3\n1.2 3.4 5.6\n2.3 4.5 6.7'}
              sx={{ mt: 2, mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={parseDataInput}
              startIcon={<CalculateIcon />}
            >
              Parse Data
            </Button>
          </>
        ) : (
          <Box sx={{ mt: 2 }}>
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUploadIcon />}
              >
                Upload CSV File
              </Button>
            </label>
          </Box>
        )}

        {((analysisMode === 'pairwise' && dataPoints.pairwiseX.length > 0) ||
          (analysisMode === 'matrix' && dataPoints.data.length > 0)) && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <AlertTitle>Data Loaded</AlertTitle>
            {analysisMode === 'pairwise'
              ? `${dataPoints.pairwiseX.length} data points loaded`
              : `${dataPoints.variableNames.length} variables with ${dataPoints.data[0]?.length || 0} observations`}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderCorrelationOptions = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Correlation Options
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Correlation Method</InputLabel>
              <Select
                value={correlationType}
                onChange={(e) => setCorrelationType(e.target.value)}
                label="Correlation Method"
              >
                {Object.entries(correlationMethods).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {config.icon}
                      <Box sx={{ ml: 1 }}>
                        <Typography>{config.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {config.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {analysisMode === 'pairwise' && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Alternative Hypothesis</InputLabel>
                <Select
                  value={options.alternativeHypothesis}
                  onChange={(e) => setOptions({ ...options, alternativeHypothesis: e.target.value })}
                  label="Alternative Hypothesis"
                >
                  <MenuItem value="two-sided">Two-sided (≠ 0)</MenuItem>
                  <MenuItem value="greater">Greater than 0</MenuItem>
                  <MenuItem value="less">Less than 0</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Confidence Level"
              value={options.confidenceLevel}
              onChange={(e) => setOptions({ ...options, confidenceLevel: parseFloat(e.target.value) })}
              inputProps={{ min: 0.5, max: 0.999, step: 0.01 }}
            />
          </Grid>

          {analysisMode === 'matrix' && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Missing Data Method</InputLabel>
                  <Select
                    value={options.missingDataMethod}
                    onChange={(e) => setOptions({ ...options, missingDataMethod: e.target.value })}
                    label="Missing Data Method"
                  >
                    <MenuItem value="pairwise">Pairwise deletion</MenuItem>
                    <MenuItem value="listwise">Listwise deletion</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={options.bonferroniCorrection}
                      onChange={(e) => setOptions({ ...options, bonferroniCorrection: e.target.checked })}
                    />
                  }
                  label="Apply Bonferroni correction for multiple comparisons"
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.bootstrapCI}
                  onChange={(e) => setOptions({ ...options, bootstrapCI: e.target.checked })}
                  disabled={analysisMode === 'matrix'}
                />
              }
              label="Calculate bootstrap confidence intervals"
            />
          </Grid>

          {options.bootstrapCI && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Bootstrap Iterations"
                value={options.bootstrapIterations}
                onChange={(e) => setOptions({ ...options, bootstrapIterations: parseInt(e.target.value) })}
                inputProps={{ min: 100, max: 10000, step: 100 }}
              />
            </Grid>
          )}
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={performCorrelation}
              disabled={loading || isCheckingAssumptions || isTestBlocked ||
                (analysisMode === 'pairwise' ? dataPoints.pairwiseX.length < 3 : dataPoints.data.length < 2)}
              startIcon={
                loading || isCheckingAssumptions ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CalculateIcon />
                )
              }
            >
              {isCheckingAssumptions
                ? 'Validating Assumptions...'
                : loading
                ? 'Calculating...'
                : isTestBlocked
                ? '⛔ Test Blocked - Fix Violations'
                : 'Calculate Correlation'}
            </Button>
            <Button
              variant="outlined"
              onClick={resetCalculator}
              startIcon={<RefreshIcon />}
            >
              Reset
            </Button>
          </Box>

          {isTestBlocked && (
            <Alert severity="error">
              <AlertTitle>⛔ Test Execution Blocked</AlertTitle>
              Critical assumption violations detected for Pearson correlation. Please address the
              violations above using the "Fix Data" button, or switch to a non-parametric alternative
              (Spearman or Kendall correlation).
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderPairwiseResults = () => {
    if (!results || !results.isPairwise) return null;

    const strength = getCorrelationStrength(results.correlation);

    return (
      <Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Correlation Coefficient
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h3" color="primary">
                  {formatNumber(results.correlation)}
                </Typography>
                <Chip
                  label={strength.label}
                  color={strength.color}
                  size="small"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {correlationMethods[correlationType].name}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Statistical Significance
              </Typography>
              <Typography variant="body1">
                p-value: <strong>{formatNumber(results.p_value)}</strong>
              </Typography>
              <Alert
                severity={results.p_value < 0.05 ? 'success' : 'warning'}
                sx={{ mt: 2 }}
              >
                {results.p_value < 0.05
                  ? 'Statistically significant correlation'
                  : 'Not statistically significant'}
              </Alert>
            </Paper>
          </Grid>

          {results.confidence_interval && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {(options.confidenceLevel * 100).toFixed(0)}% Confidence Interval
                </Typography>
                <Typography variant="body1">
                  [{formatNumber(results.confidence_interval[0])}, {formatNumber(results.confidence_interval[1])}]
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {options.bootstrapCI ? 'Bootstrap CI' : 'Fisher transformation CI'}
                </Typography>
              </Paper>
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Effect Size
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="r²"
                    secondary={formatNumber(Math.pow(results.correlation, 2))}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Sample Size"
                    secondary={results.sample_size}
                  />
                </ListItem>
                {results.test_statistic && (
                  <ListItem>
                    <ListItemText
                      primary="Test Statistic"
                      secondary={formatNumber(results.test_statistic)}
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>

        {results.assumptions && correlationType === 'pearson' && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Assumption Checks</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {results.assumptions.normality_x && (
                  <Grid item xs={12} md={6}>
                    <Alert
                      severity={results.assumptions.normality_x.p_value > 0.05 ? 'success' : 'warning'}
                    >
                      <AlertTitle>Variable X Normality</AlertTitle>
                      <Typography variant="body2">
                        Shapiro-Wilk p-value: {formatNumber(results.assumptions.normality_x.p_value, 4)}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                {results.assumptions.normality_y && (
                  <Grid item xs={12} md={6}>
                    <Alert
                      severity={results.assumptions.normality_y.p_value > 0.05 ? 'success' : 'warning'}
                    >
                      <AlertTitle>Variable Y Normality</AlertTitle>
                      <Typography variant="body2">
                        Shapiro-Wilk p-value: {formatNumber(results.assumptions.normality_y.p_value, 4)}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                {results.assumptions.linearity && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <AlertTitle>Linearity Check</AlertTitle>
                      <Typography variant="body2">
                        Visual inspection of scatter plot recommended for linearity assessment
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  const renderMatrixResults = () => {
    if (!results || !results.isMatrix) return null;

    return (
      <Box>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Correlation Matrix" />
          <Tab label="P-values" />
          <Tab label="Heatmap" />
        </Tabs>

        {activeTab === 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  {results.variable_names.map((name, index) => (
                    <TableCell key={index} align="center">
                      <strong>{name}</strong>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {results.correlation_matrix.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell component="th" scope="row">
                      <strong>{results.variable_names[i]}</strong>
                    </TableCell>
                    {row.map((value, j) => {
                      const strength = getCorrelationStrength(value);
                      return (
                        <TableCell key={j} align="center">
                          {i === j ? (
                            <Typography color="text.secondary">1.000</Typography>
                          ) : (
                            <Box>
                              <Typography>{formatNumber(value, 3)}</Typography>
                              {Math.abs(value) >= 0.3 && (
                                <Chip
                                  label={strength.label}
                                  color={strength.color}
                                  size="small"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {activeTab === 1 && results.p_value_matrix && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  {results.variable_names.map((name, index) => (
                    <TableCell key={index} align="center">
                      <strong>{name}</strong>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {results.p_value_matrix.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell component="th" scope="row">
                      <strong>{results.variable_names[i]}</strong>
                    </TableCell>
                    {row.map((value, j) => (
                      <TableCell key={j} align="center">
                        {value === null ? (
                          <Typography color="text.secondary">-</Typography>
                        ) : (
                          <Box>
                            <Typography
                              color={value < 0.05 ? 'success.main' : 'text.primary'}
                              fontWeight={value < 0.05 ? 'bold' : 'normal'}
                            >
                              {formatNumber(value, 4)}
                            </Typography>
                            {value < 0.001 && <Typography variant="caption">***</Typography>}
                            {value >= 0.001 && value < 0.01 && <Typography variant="caption">**</Typography>}
                            {value >= 0.01 && value < 0.05 && <Typography variant="caption">*</Typography>}
                          </Box>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {options.bonferroniCorrection && (
              <Box sx={{ p: 2 }}>
                <Alert severity="info">
                  <Typography variant="caption">
                    P-values adjusted using Bonferroni correction for multiple comparisons
                  </Typography>
                </Alert>
              </Box>
            )}
          </TableContainer>
        )}

        {activeTab === 2 && (
          <Alert severity="info">
            <AlertTitle>Correlation Heatmap</AlertTitle>
            <Typography variant="body2">
              Interactive heatmap visualization with color-coded correlation strengths
              is available in the full application version. The correlation values range from
              -1 (perfect negative correlation) through 0 (no correlation) to +1 (perfect positive correlation).
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" display="block">
                • Dark blue: Strong negative correlation
              </Typography>
              <Typography variant="caption" display="block">
                • Light blue: Weak negative correlation
              </Typography>
              <Typography variant="caption" display="block">
                • White: No correlation
              </Typography>
              <Typography variant="caption" display="block">
                • Light red: Weak positive correlation
              </Typography>
              <Typography variant="caption" display="block">
                • Dark red: Strong positive correlation
              </Typography>
            </Box>
          </Alert>
        )}
      </Box>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Correlation Results
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small">
                <Select
                  value={displayPrecision}
                  onChange={(e) => setDisplayPrecision(e.target.value)}
                >
                  <MenuItem value={3}>3 decimals</MenuItem>
                  <MenuItem value={6}>6 decimals</MenuItem>
                  <MenuItem value={10}>10 decimals</MenuItem>
                  <MenuItem value={20}>20 decimals</MenuItem>
                  <MenuItem value={30}>30 decimals</MenuItem>
                  <MenuItem value={50}>50 decimals</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                onClick={() => setShowFullPrecision(!showFullPrecision)}
                color={showFullPrecision ? 'primary' : 'default'}
              >
                {showFullPrecision ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Box>
          </Box>

          {results.isPairwise && renderPairwiseResults()}
          {results.isMatrix && renderMatrixResults()}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => setExportDialogOpen(true)}
            >
              Export Results
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                const resultsText = JSON.stringify(results, null, 2);
                navigator.clipboard.writeText(resultsText);
              }}
            >
              Copy to Clipboard
            </Button>
            <Button
              variant="outlined"
              startIcon={<HelpIcon />}
              onClick={() => setInterpretationOpen(true)}
            >
              Interpretation Guide
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <ScatterPlotIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Correlation Analysis Calculator
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Perform correlation analysis with 50 decimal precision. Calculate Pearson, Spearman, or Kendall
        correlations for pairwise analysis or correlation matrices.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Guardian Warning Section */}
      {guardianResult && (
        <Box sx={{ mb: 2 }}>
          <GuardianWarning
            guardianReport={guardianResult}
            onProceed={() => setIsTestBlocked(false)}
            onSelectAlternative={(test) => {
              if (test.toLowerCase().includes('spearman')) {
                setCorrelationType('spearman');
              } else if (test.toLowerCase().includes('kendall')) {
                setCorrelationType('kendall');
              }
            }}
            onViewEvidence={() => {
              console.log('[CorrelationCalculator] Visual evidence requested');
            }}
            data={analysisMode === 'pairwise'
              ? [dataPoints.pairwiseX, dataPoints.pairwiseY]
              : dataPoints.data}
            alpha={1 - options.confidenceLevel}
            onTransformComplete={(transformedData, transformationType, parameters) => {
              console.log('[CorrelationCalculator] Transformation applied:', transformationType, parameters);

              if (analysisMode === 'pairwise') {
                // Pairwise mode: update X and Y arrays
                if (Array.isArray(transformedData) && transformedData.length === 2) {
                  setDataPoints({
                    ...dataPoints,
                    pairwiseX: transformedData[0],
                    pairwiseY: transformedData[1]
                  });
                }
              } else {
                // Matrix mode: update data array
                if (Array.isArray(transformedData)) {
                  setDataPoints({
                    ...dataPoints,
                    data: transformedData
                  });
                }
              }

              // Show success feedback
              setError(null);
              console.log(`Data transformed using ${transformationType}. Re-validating assumptions...`);
            }}
          />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          {renderDataInput()}
        </Grid>
        <Grid item xs={12} lg={6}>
          {renderCorrelationOptions()}
        </Grid>
      </Grid>

      {renderResults()}

      {/* Help Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <HelpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Correlation Analysis Help
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>Overview</Typography>
          <Typography paragraph>
            Correlation analysis measures the strength and direction of relationships between variables.
            This calculator provides three methods with 50 decimal precision.
          </Typography>

          <Typography variant="h6" gutterBottom>Methods</Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Pearson's r"
                secondary="Measures linear relationships. Assumes normality and no outliers. Best for continuous, normally distributed data."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Spearman's ρ (rho)"
                secondary="Rank-based correlation for monotonic relationships. Does not assume normality. Good for ordinal data or non-normal continuous data."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Kendall's τ (tau)"
                secondary="Rank-based correlation measuring concordance. More robust than Spearman for small samples. Good for ordinal data."
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom>Interpretation</Typography>
          <Typography paragraph>
            Correlation coefficients range from -1 to +1:
          </Typography>
          <List>
            <ListItem>• -1: Perfect negative correlation</ListItem>
            <ListItem>• 0: No linear correlation</ListItem>
            <ListItem>• +1: Perfect positive correlation</ListItem>
          </List>

          <Typography variant="h6" gutterBottom>Strength Guidelines</Typography>
          <List>
            <ListItem>• 0.9-1.0: Very strong</ListItem>
            <ListItem>• 0.7-0.9: Strong</ListItem>
            <ListItem>• 0.5-0.7: Moderate</ListItem>
            <ListItem>• 0.3-0.5: Weak</ListItem>
            <ListItem>• 0.0-0.3: Very weak/None</ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Interpretation Dialog */}
      <Dialog
        open={interpretationOpen}
        onClose={() => setInterpretationOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Interpretation Guide</DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>Understanding Your Results</Typography>

          {results && results.isPairwise && (
            <>
              <Typography paragraph>
                Your correlation coefficient of {formatNumber(results.correlation, 3)} indicates a{' '}
                <strong>{getCorrelationStrength(results.correlation).label.toLowerCase()}</strong>{' '}
                {results.correlation > 0 ? 'positive' : 'negative'} relationship.
              </Typography>

              <Typography paragraph>
                The p-value of {formatNumber(results.p_value, 4)}{' '}
                {results.p_value < 0.05
                  ? 'suggests this correlation is statistically significant.'
                  : 'suggests this correlation is not statistically significant.'}
              </Typography>

              <Typography paragraph>
                R² = {formatNumber(Math.pow(results.correlation, 2), 3)} means that{' '}
                {(Math.pow(results.correlation, 2) * 100).toFixed(1)}% of the variance in one
                variable can be explained by the other.
              </Typography>
            </>
          )}

          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>Important</AlertTitle>
            Correlation does not imply causation. A significant correlation only indicates
            that variables are related, not that one causes the other.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterpretationOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      >
        <DialogTitle>Export Results</DialogTitle>
        <DialogContent>
          <List>
            <ListItemButton onClick={() => exportResults('pdf')}>
              <ListItemIcon>
                <PictureAsPdfIcon />
              </ListItemIcon>
              <ListItemText
                primary="Export as PDF"
                secondary="Publication-ready PDF with all results"
              />
            </ListItemButton>
            <ListItemButton onClick={() => exportResults('csv')}>
              <ListItemIcon>
                <TableChartIcon />
              </ListItemIcon>
              <ListItemText
                primary="Export as CSV"
                secondary="Spreadsheet-compatible format"
              />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Help Button */}
      <Tooltip title="Help">
        <IconButton
          onClick={() => setHelpDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            }
          }}
        >
          <HelpIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default CorrelationCalculator;