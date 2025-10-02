/**
 * T-Test Calculator Component
 * ===========================
 * Complete UI for performing T-tests with 50 decimal precision
 * Supports one-sample, paired, and independent samples t-tests
 *
 * Features:
 * - Data input (paste, file upload, manual entry)
 * - Test type selection with intelligent defaults
 * - Assumption checking and validation
 * - 50 decimal precision display
 * - Effect size calculations
 * - Interactive visualizations
 * - Export to publication-ready formats
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Snackbar
} from '@mui/material';

import {
  Calculate as CalculateIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Help as HelpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ContentPaste as PasteIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

import { useSnackbar } from 'notistack';
import Decimal from 'decimal.js';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Import services
import HighPrecisionStatisticalService from '../../services/HighPrecisionStatisticalService';

// Import components
import ExampleDataLoader from '../common/ExampleDataLoader';

// Configure Decimal.js for 50 decimal precision
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

// Component constants
const TEST_TYPES = {
  ONE_SAMPLE: 'one_sample',
  PAIRED: 'paired',
  INDEPENDENT: 'two_sample'
};

const PRECISION_OPTIONS = [
  { value: 6, label: '6 decimals (Standard)' },
  { value: 10, label: '10 decimals (Extended)' },
  { value: 20, label: '20 decimals (High)' },
  { value: 30, label: '30 decimals (Very High)' },
  { value: 50, label: '50 decimals (Maximum)' }
];

const TTestCalculator = () => {
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [testType, setTestType] = useState(TEST_TYPES.INDEPENDENT);
  const [data1, setData1] = useState('');
  const [data2, setData2] = useState('');
  const [hypothesizedMean, setHypothesizedMean] = useState('0');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [alternativeHypothesis, setAlternativeHypothesis] = useState('two_sided');
  const [assumeEqualVariance, setAssumeEqualVariance] = useState(false);
  const [checkAssumptions, setCheckAssumptions] = useState(true);
  const [displayPrecision, setDisplayPrecision] = useState(6);
  const [showFullPrecision, setShowFullPrecision] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [assumptions, setAssumptions] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [dataInputMethod, setDataInputMethod] = useState('manual');
  const [errors, setErrors] = useState({});

  // Parse data from text input
  const parseData = useCallback((text) => {
    if (!text.trim()) return [];

    // Try to parse as comma/space/tab/newline separated values
    const separators = [',', '\t', '\n', ' '];
    let values = text.trim();

    for (const sep of separators) {
      if (values.includes(sep)) {
        values = values.split(sep);
        break;
      }
    }

    if (typeof values === 'string') {
      values = values.split(/\s+/);
    }

    return values
      .map(v => v.trim())
      .filter(v => v !== '')
      .map(v => {
        const num = parseFloat(v);
        if (isNaN(num)) {
          throw new Error(`Invalid number: ${v}`);
        }
        return num;
      });
  }, []);

  // Validate inputs
  const validateInputs = useCallback(() => {
    const newErrors = {};

    try {
      const parsedData1 = parseData(data1);
      if (parsedData1.length < 2) {
        newErrors.data1 = 'Need at least 2 data points';
      }
    } catch (e) {
      newErrors.data1 = e.message;
    }

    if (testType !== TEST_TYPES.ONE_SAMPLE) {
      try {
        const parsedData2 = parseData(data2);
        if (parsedData2.length < 2) {
          newErrors.data2 = 'Need at least 2 data points';
        }

        if (testType === TEST_TYPES.PAIRED) {
          const parsedData1 = parseData(data1);
          if (parsedData1.length !== parsedData2.length) {
            newErrors.data2 = 'Paired samples must have equal length';
          }
        }
      } catch (e) {
        newErrors.data2 = e.message;
      }
    }

    if (testType === TEST_TYPES.ONE_SAMPLE) {
      const mu = parseFloat(hypothesizedMean);
      if (isNaN(mu)) {
        newErrors.hypothesizedMean = 'Must be a valid number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data1, data2, testType, hypothesizedMean, parseData]);

  // Perform t-test calculation
  const performTTest = useCallback(async () => {
    if (!validateInputs()) {
      enqueueSnackbar('Please fix input errors', { variant: 'error' });
      return;
    }

    setLoading(true);
    setResults(null);
    setAssumptions(null);

    try {
      const parsedData1 = parseData(data1);
      const parsedData2 = testType !== TEST_TYPES.ONE_SAMPLE ? parseData(data2) : null;

      const requestData = {
        test_type: testType,
        data1: parsedData1,
        ...(parsedData2 && { data2: parsedData2 }),
        parameters: {
          mu: testType === TEST_TYPES.ONE_SAMPLE ? parseFloat(hypothesizedMean) : 0,
          equal_var: assumeEqualVariance,
          confidence: confidenceLevel,
          alternative: alternativeHypothesis
        },
        options: {
          check_assumptions: checkAssumptions,
          validate_results: true,
          compare_standard: true,
          calculate_effect_sizes: true,
          generate_visualizations: true
        }
      };

      const response = await HighPrecisionStatisticalService.performTTest(requestData);

      setResults(response);

      if (response.assumptions) {
        setAssumptions(response.assumptions);
      }

      enqueueSnackbar('T-test completed successfully!', { variant: 'success' });
    } catch (error) {
      console.error('T-test failed:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to perform t-test',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  }, [
    validateInputs,
    parseData,
    data1,
    data2,
    testType,
    hypothesizedMean,
    assumeEqualVariance,
    confidenceLevel,
    alternativeHypothesis,
    checkAssumptions,
    enqueueSnackbar
  ]);

  // Format number with specified precision
  const formatNumber = useCallback((value, precision = null) => {
    if (value === null || value === undefined) return '-';

    const p = precision || displayPrecision;

    try {
      if (typeof value === 'string' && value.includes('.')) {
        // High precision value from backend
        const decimal = new Decimal(value);
        return decimal.toFixed(p);
      } else {
        // Regular number
        return parseFloat(value).toFixed(p);
      }
    } catch {
      return value.toString();
    }
  }, [displayPrecision]);

  // Handle example data loading
  const handleExampleDataLoad = useCallback((exampleData) => {
    if (exampleData) {
      // Handle different data formats from example datasets
      if (exampleData.data) {
        // One-sample t-test data
        setData1(exampleData.data.join(', '));
        setTestType(TEST_TYPES.ONE_SAMPLE);
        if (exampleData.hypothesizedMean !== undefined) {
          setHypothesizedMean(exampleData.hypothesizedMean.toString());
        }
      } else if (exampleData.before && exampleData.after) {
        // Paired t-test data
        setData1(exampleData.before.join(', '));
        setData2(exampleData.after.join(', '));
        setTestType(TEST_TYPES.PAIRED);
      } else if (exampleData.group1Data && exampleData.group2Data) {
        // Independent samples t-test data
        setData1(exampleData.group1Data.join(', '));
        setData2(exampleData.group2Data.join(', '));
        setTestType(TEST_TYPES.INDEPENDENT);
      }

      enqueueSnackbar('Example data loaded successfully', { variant: 'success' });
    }
  }, [enqueueSnackbar]);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          // Assume first column is data1, second column (if exists) is data2
          const col1 = results.data.map(row => row[0]).filter(v => v !== '').join('\n');
          setData1(col1);

          if (results.data[0].length > 1) {
            const col2 = results.data.map(row => row[1]).filter(v => v !== '').join('\n');
            setData2(col2);
          }

          enqueueSnackbar('Data imported successfully', { variant: 'success' });
        }
      },
      error: (error) => {
        enqueueSnackbar(`Import failed: ${error.message}`, { variant: 'error' });
      }
    });
  }, [enqueueSnackbar]);

  // Export results
  const exportResults = useCallback((format) => {
    if (!results) return;

    if (format === 'pdf') {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(16);
      doc.text('T-Test Results', 20, 20);

      // Test info
      doc.setFontSize(12);
      doc.text(`Test Type: ${testType.replace('_', ' ').toUpperCase()}`, 20, 35);
      doc.text(`Confidence Level: ${(confidenceLevel * 100).toFixed(0)}%`, 20, 45);
      doc.text(`Alternative: ${alternativeHypothesis.replace('_', ' ')}`, 20, 55);

      // Results table
      const tableData = [
        ['Statistic', 'Value', 'Precision'],
        ['T-statistic', formatNumber(results.high_precision_result?.t_statistic), `${displayPrecision} decimals`],
        ['P-value', formatNumber(results.high_precision_result?.p_value), `${displayPrecision} decimals`],
        ['Degrees of Freedom', results.high_precision_result?.df || '-', '-'],
        ['Effect Size (Cohen\'s d)', formatNumber(results.effect_sizes?.cohens_d), `${displayPrecision} decimals`],
        ['CI Lower', formatNumber(results.confidence_interval?.lower), `${displayPrecision} decimals`],
        ['CI Upper', formatNumber(results.confidence_interval?.upper), `${displayPrecision} decimals`]
      ];

      doc.autoTable({
        startY: 65,
        head: [tableData[0]],
        body: tableData.slice(1)
      });

      // Save PDF
      doc.save(`ttest_results_${new Date().toISOString().slice(0, 10)}.pdf`);

    } else if (format === 'csv') {
      // Create CSV content
      const csvContent = [
        ['T-Test Results'],
        [''],
        ['Test Type', testType],
        ['Confidence Level', confidenceLevel],
        ['Alternative Hypothesis', alternativeHypothesis],
        [''],
        ['Results'],
        ['T-statistic', results.high_precision_result?.t_statistic],
        ['P-value', results.high_precision_result?.p_value],
        ['Degrees of Freedom', results.high_precision_result?.df],
        ['Effect Size (Cohen\'s d)', results.effect_sizes?.cohens_d],
        ['CI Lower', results.confidence_interval?.lower],
        ['CI Upper', results.confidence_interval?.upper],
        [''],
        ['Precision', `${displayPrecision} decimal places`]
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `ttest_results_${new Date().toISOString().slice(0, 10)}.csv`);
    }

    enqueueSnackbar(`Results exported as ${format.toUpperCase()}`, { variant: 'success' });
  }, [results, testType, confidenceLevel, alternativeHypothesis, displayPrecision, formatNumber, enqueueSnackbar]);

  // Render assumption check results
  const renderAssumptions = () => {
    if (!assumptions) return null;

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Assumption Checks
          </Typography>

          <Grid container spacing={2}>
            {assumptions.normality_data1 && (
              <Grid item xs={12} md={6}>
                <Alert severity={assumptions.normality_data1.is_met ? 'success' : 'warning'}>
                  <AlertTitle>Normality (Sample 1)</AlertTitle>
                  {assumptions.normality_data1.is_met ? 'Data appears normally distributed' : 'Data may not be normally distributed'}
                  <br />
                  <Typography variant="caption">
                    Shapiro-Wilk p-value: {formatNumber(assumptions.normality_data1.p_value, 4)}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {assumptions.normality_data2 && (
              <Grid item xs={12} md={6}>
                <Alert severity={assumptions.normality_data2.is_met ? 'success' : 'warning'}>
                  <AlertTitle>Normality (Sample 2)</AlertTitle>
                  {assumptions.normality_data2.is_met ? 'Data appears normally distributed' : 'Data may not be normally distributed'}
                  <br />
                  <Typography variant="caption">
                    Shapiro-Wilk p-value: {formatNumber(assumptions.normality_data2.p_value, 4)}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {assumptions.equal_variance && (
              <Grid item xs={12}>
                <Alert severity={assumptions.equal_variance.is_met ? 'info' : 'warning'}>
                  <AlertTitle>Homogeneity of Variance</AlertTitle>
                  {assumptions.equal_variance.is_met ?
                    'Variances appear equal (Welch\'s correction may not be necessary)' :
                    'Variances appear unequal (Consider using Welch\'s t-test)'}
                  <br />
                  <Typography variant="caption">
                    Levene's test p-value: {formatNumber(assumptions.equal_variance.p_value, 4)}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {assumptions.recommendation && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <AlertTitle>Recommendation</AlertTitle>
                  {assumptions.recommendation}
                </Alert>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Render main results
  const renderResults = () => {
    if (!results || !results.high_precision_result) return null;

    const hpResult = results.high_precision_result;
    const effectSizes = results.effect_sizes || {};
    const ci = results.confidence_interval || {};

    // Determine significance
    const isSignificant = parseFloat(hpResult.p_value) < (1 - confidenceLevel);

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Results
            </Typography>

            <Box>
              <FormControl size="small" sx={{ mr: 2, minWidth: 150 }}>
                <InputLabel>Precision</InputLabel>
                <Select
                  value={displayPrecision}
                  onChange={(e) => setDisplayPrecision(e.target.value)}
                  label="Precision"
                >
                  {PRECISION_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title={showFullPrecision ? 'Hide full precision' : 'Show full precision'}>
                <IconButton
                  onClick={() => setShowFullPrecision(!showFullPrecision)}
                  color={showFullPrecision ? 'primary' : 'default'}
                >
                  {showFullPrecision ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Main results summary */}
          <Box sx={{ mb: 3 }}>
            <Alert severity={isSignificant ? 'success' : 'info'} sx={{ mb: 2 }}>
              <AlertTitle>
                {isSignificant ? 'Statistically Significant' : 'Not Statistically Significant'}
              </AlertTitle>
              <Typography variant="body2">
                p-value ({formatNumber(hpResult.p_value, 4)}) is {isSignificant ? '<' : '≥'} α ({1 - confidenceLevel})
              </Typography>
            </Alert>
          </Box>

          {/* Results table */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Statistic</strong></TableCell>
                  <TableCell align="right"><strong>Value</strong></TableCell>
                  {showFullPrecision && (
                    <TableCell align="right"><strong>Full Precision (50 decimals)</strong></TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>T-statistic</TableCell>
                  <TableCell align="right">{formatNumber(hpResult.t_statistic)}</TableCell>
                  {showFullPrecision && (
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {hpResult.t_statistic}
                    </TableCell>
                  )}
                </TableRow>

                <TableRow>
                  <TableCell>P-value</TableCell>
                  <TableCell align="right">{formatNumber(hpResult.p_value)}</TableCell>
                  {showFullPrecision && (
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {hpResult.p_value}
                    </TableCell>
                  )}
                </TableRow>

                <TableRow>
                  <TableCell>Degrees of Freedom</TableCell>
                  <TableCell align="right">{hpResult.df}</TableCell>
                  {showFullPrecision && (
                    <TableCell align="right">-</TableCell>
                  )}
                </TableRow>

                <TableRow>
                  <TableCell>Effect Size (Cohen's d)</TableCell>
                  <TableCell align="right">{formatNumber(effectSizes.cohens_d)}</TableCell>
                  {showFullPrecision && (
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {effectSizes.cohens_d}
                    </TableCell>
                  )}
                </TableRow>

                <TableRow>
                  <TableCell>Effect Size (Hedges' g)</TableCell>
                  <TableCell align="right">{formatNumber(effectSizes.hedges_g)}</TableCell>
                  {showFullPrecision && (
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {effectSizes.hedges_g}
                    </TableCell>
                  )}
                </TableRow>

                <TableRow>
                  <TableCell>CI Lower ({(confidenceLevel * 100).toFixed(0)}%)</TableCell>
                  <TableCell align="right">{formatNumber(ci.lower)}</TableCell>
                  {showFullPrecision && (
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {ci.lower}
                    </TableCell>
                  )}
                </TableRow>

                <TableRow>
                  <TableCell>CI Upper ({(confidenceLevel * 100).toFixed(0)}%)</TableCell>
                  <TableCell align="right">{formatNumber(ci.upper)}</TableCell>
                  {showFullPrecision && (
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {ci.upper}
                    </TableCell>
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Effect size interpretation */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Effect Size Interpretation:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cohen's d = {formatNumber(effectSizes.cohens_d, 3)} suggests a{' '}
              {Math.abs(parseFloat(effectSizes.cohens_d)) < 0.2 ? 'negligible' :
               Math.abs(parseFloat(effectSizes.cohens_d)) < 0.5 ? 'small' :
               Math.abs(parseFloat(effectSizes.cohens_d)) < 0.8 ? 'medium' : 'large'} effect size.
            </Typography>
          </Box>

          {/* Precision comparison if available */}
          {results.comparison && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info">
                <AlertTitle>Precision Advantage</AlertTitle>
                This calculation provides {results.comparison.decimal_places_gained} more decimal places
                than standard implementations, ensuring maximum accuracy for your research.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        T-Test Calculator
        <Chip
          label="50 Decimal Precision"
          color="primary"
          size="small"
          sx={{ ml: 2 }}
        />
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Perform high-precision t-tests with automatic assumption checking and effect size calculations.
      </Typography>

      {/* Main configuration card */}
      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
            <Tab label="Data Input" />
            <Tab label="Test Configuration" />
            <Tab label="Advanced Options" />
          </Tabs>

          {/* Data Input Tab */}
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <Typography variant="subtitle2" gutterBottom>
                      Input Method
                    </Typography>
                    <RadioGroup
                      row
                      value={dataInputMethod}
                      onChange={(e) => setDataInputMethod(e.target.value)}
                    >
                      <FormControlLabel value="manual" control={<Radio />} label="Manual Entry" />
                      <FormControlLabel value="paste" control={<Radio />} label="Paste Data" />
                      <FormControlLabel value="upload" control={<Radio />} label="Upload File" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {dataInputMethod === 'upload' ? (
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      fullWidth
                    >
                      Upload CSV File
                      <input
                        type="file"
                        hidden
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                      />
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Upload a CSV file with data in columns. First column will be Sample 1, second column (if present) will be Sample 2.
                    </Typography>
                  </Grid>
                ) : (
                  <>
                    <Grid item xs={12} md={testType === TEST_TYPES.ONE_SAMPLE ? 12 : 6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label={testType === TEST_TYPES.ONE_SAMPLE ? 'Sample Data' : 'Sample 1'}
                        value={data1}
                        onChange={(e) => setData1(e.target.value)}
                        error={!!errors.data1}
                        helperText={errors.data1 || 'Enter values separated by spaces, commas, or new lines'}
                        placeholder="e.g., 1.2, 3.4, 5.6 or one value per line"
                      />
                    </Grid>

                    {testType !== TEST_TYPES.ONE_SAMPLE && (
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          multiline
                          rows={6}
                          label="Sample 2"
                          value={data2}
                          onChange={(e) => setData2(e.target.value)}
                          error={!!errors.data2}
                          helperText={errors.data2 || 'Enter values separated by spaces, commas, or new lines'}
                          placeholder="e.g., 2.1, 4.3, 6.5 or one value per line"
                        />
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <ExampleDataLoader
                      testType="ttest"
                      subType={testType}
                      onLoadData={handleExampleDataLoad}
                      buttonText="Load Example"
                      buttonVariant="contained"
                      buttonSize="small"
                    />
                    <Button
                      variant="text"
                      startIcon={<ClearIcon />}
                      onClick={() => {
                        setData1('');
                        setData2('');
                        setResults(null);
                        setAssumptions(null);
                        setErrors({});
                      }}
                    >
                      Clear All Data
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Test Configuration Tab */}
          {activeTab === 1 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Test Type</InputLabel>
                    <Select
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      label="Test Type"
                    >
                      <MenuItem value={TEST_TYPES.ONE_SAMPLE}>One-Sample T-Test</MenuItem>
                      <MenuItem value={TEST_TYPES.PAIRED}>Paired Samples T-Test</MenuItem>
                      <MenuItem value={TEST_TYPES.INDEPENDENT}>Independent Samples T-Test</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {testType === TEST_TYPES.ONE_SAMPLE && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Hypothesized Mean (μ₀)"
                      value={hypothesizedMean}
                      onChange={(e) => setHypothesizedMean(e.target.value)}
                      error={!!errors.hypothesizedMean}
                      helperText={errors.hypothesizedMean || 'Population mean to test against'}
                      type="number"
                    />
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Alternative Hypothesis</InputLabel>
                    <Select
                      value={alternativeHypothesis}
                      onChange={(e) => setAlternativeHypothesis(e.target.value)}
                      label="Alternative Hypothesis"
                    >
                      <MenuItem value="two_sided">Two-sided (≠)</MenuItem>
                      <MenuItem value="greater">Greater than (&gt;)</MenuItem>
                      <MenuItem value="less">Less than (&lt;)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Confidence Level: {(confidenceLevel * 100).toFixed(0)}%
                    </Typography>
                    <Slider
                      value={confidenceLevel}
                      onChange={(e, v) => setConfidenceLevel(v)}
                      min={0.8}
                      max={0.99}
                      step={0.01}
                      marks={[
                        { value: 0.9, label: '90%' },
                        { value: 0.95, label: '95%' },
                        { value: 0.99, label: '99%' }
                      ]}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                  </Box>
                </Grid>

                {testType === TEST_TYPES.INDEPENDENT && (
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={assumeEqualVariance}
                          onChange={(e) => setAssumeEqualVariance(e.target.checked)}
                        />
                      }
                      label="Assume equal variances (Student's t-test)"
                    />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Uncheck for Welch's t-test (recommended when variances may be unequal)
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Advanced Options Tab */}
          {activeTab === 2 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={checkAssumptions}
                        onChange={(e) => setCheckAssumptions(e.target.checked)}
                      />
                    }
                    label="Check assumptions (normality, homogeneity of variance)"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        <InfoIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: '1.2rem' }} />
                        About T-Tests
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        The t-test is used to determine if there is a significant difference between the means of two groups.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>One-Sample T-Test:</strong> Tests if a sample mean differs from a hypothesized population mean.
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Paired Samples T-Test:</strong> Tests the difference between paired observations (e.g., before/after measurements).
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Independent Samples T-Test:</strong> Tests if two independent groups have different means.
                      </Typography>
                      <Typography variant="body2">
                        <strong>Assumptions:</strong> Data should be approximately normally distributed. For independent samples,
                        variances should be roughly equal (unless using Welch's correction).
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <AlertTitle>50 Decimal Precision</AlertTitle>
                    All calculations are performed with 50 decimal place precision, providing unmatched accuracy
                    for scientific research and publication-quality results.
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Action buttons */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              {results && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => exportResults('pdf')}
                    sx={{ mr: 1 }}
                  >
                    Export PDF
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => exportResults('csv')}
                  >
                    Export CSV
                  </Button>
                </>
              )}
            </Box>

            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
              onClick={performTTest}
              disabled={loading}
            >
              {loading ? 'Calculating...' : 'Perform T-Test'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Results section */}
      {results && renderResults()}

      {/* Assumptions section */}
      {assumptions && renderAssumptions()}

      {/* Loading overlay */}
      {loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Performing high-precision calculations...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TTestCalculator;