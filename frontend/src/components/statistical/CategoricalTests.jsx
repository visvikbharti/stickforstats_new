/**
 * Categorical Tests Component
 * ============================
 * ⚠️ DEPRECATED - October 26, 2025 ⚠️
 *
 * This component has been DEPRECATED in favor of the Guardian-protected version at:
 * /components/statistical-analysis/statistical-tests/CategoricalTests.jsx
 *
 * REASON: This component lacks Guardian assumption validation and test blocking.
 * The protected version is integrated into StatisticalAnalysisHub at /statistical-analysis-tools
 *
 * STATUS: Route /statistical-tests has been disabled in App.jsx
 * REPLACEMENT: Use /statistical-analysis-tools for Guardian-protected statistical tests
 *
 * ---
 *
 * Complete UI for performing categorical data analysis with 50 decimal precision
 * Tests for independence, association, and goodness of fit
 *
 * Features:
 * - Chi-square tests (independence, goodness of fit, homogeneity)
 * - Fisher's exact test
 * - McNemar's test
 * - Cochran's Q test
 * - Binomial test
 * - Contingency table analysis
 * - Cramer's V and other effect sizes
 * - 50 decimal precision display
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Badge,
  InputAdornment
} from '@mui/material';

import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  CloudUpload as CloudUploadIcon,
  Help as HelpIcon,
  GridOn as GridOnIcon,
  Assessment as AssessmentIcon,
  Calculate as CalculateIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PictureAsPdf as PictureAsPdfIcon,
  TableChart as TableChartIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  BarChart as BarChartIcon,
  Category as CategoryIcon,
  CompareArrows as CompareArrowsIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

// Import utilities
import Decimal from 'decimal.js';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Import service
import { CategoricalAnalysisService } from '../../services/CategoricalAnalysisService';

// Configure Decimal precision
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

const CategoricalTests = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTest, setSelectedTest] = useState('chi-square-independence');
  const [dataInput, setDataInput] = useState({
    inputMethod: 'table', // table, frequencies, raw
    tableRows: 2,
    tableCols: 2,
    contingencyTable: [[0, 0], [0, 0]],
    observedFrequencies: [],
    expectedFrequencies: [],
    rawData: ''
  });

  const [testOptions, setTestOptions] = useState({
    confidenceLevel: 0.95,
    yatesCorrection: false,
    monteCarloSimulation: false,
    simulations: 10000,
    includeExpected: true,
    includeResiduals: true,
    includeContributions: true,
    effectSizeType: 'cramers_v', // cramers_v, phi, contingency_coefficient, lambda
    alternativeHypothesis: 'two-sided',
    successProbability: 0.5, // for binomial test
    testProportion: 0.5 // for proportion tests
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFullPrecision, setShowFullPrecision] = useState(false);
  const [displayPrecision, setDisplayPrecision] = useState(6);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [interpretationOpen, setInterpretationOpen] = useState(false);

  // Test configurations
  const categoricalTests = {
    'chi-square-independence': {
      name: 'Chi-Square Test of Independence',
      description: 'Tests if two categorical variables are independent',
      dataType: 'contingency',
      minRows: 2,
      minCols: 2,
      icon: <GridOnIcon />,
      assumptions: [
        'Random sampling',
        'Independent observations',
        'Expected frequency ≥ 5 in each cell (80% of cells)',
        'No cell with expected frequency < 1'
      ],
      hypotheses: {
        null: 'The two variables are independent',
        alternative: 'The two variables are associated'
      }
    },
    'chi-square-goodness': {
      name: 'Chi-Square Goodness of Fit',
      description: 'Tests if observed frequencies match expected distribution',
      dataType: 'frequencies',
      minCategories: 2,
      icon: <BarChartIcon />,
      assumptions: [
        'Random sampling',
        'Independent observations',
        'Expected frequency ≥ 5 in each category'
      ],
      hypotheses: {
        null: 'The data follows the expected distribution',
        alternative: 'The data does not follow the expected distribution'
      }
    },
    'chi-square-homogeneity': {
      name: 'Chi-Square Test of Homogeneity',
      description: 'Tests if multiple populations have the same distribution',
      dataType: 'contingency',
      minRows: 2,
      minCols: 2,
      icon: <CompareArrowsIcon />,
      assumptions: [
        'Random sampling from each population',
        'Independent observations',
        'Expected frequency ≥ 5 in each cell'
      ],
      hypotheses: {
        null: 'All populations have the same distribution',
        alternative: 'At least one population differs'
      }
    },
    'fishers-exact': {
      name: "Fisher's Exact Test",
      description: 'Exact test for 2x2 contingency tables',
      dataType: 'contingency',
      minRows: 2,
      maxRows: 2,
      minCols: 2,
      maxCols: 2,
      icon: <AssessmentIcon />,
      assumptions: [
        'Fixed marginal totals',
        'Independent observations',
        'Works for any sample size'
      ],
      hypotheses: {
        null: 'The two variables are independent',
        alternative: 'The two variables are associated'
      }
    },
    'mcnemar': {
      name: "McNemar's Test",
      description: 'Tests for changes in paired dichotomous data',
      dataType: 'contingency',
      minRows: 2,
      maxRows: 2,
      minCols: 2,
      maxCols: 2,
      icon: <CompareArrowsIcon />,
      assumptions: [
        'Paired observations',
        'Dichotomous variables',
        'Fixed marginal distributions'
      ],
      hypotheses: {
        null: 'The marginal probabilities are equal',
        alternative: 'The marginal probabilities differ'
      }
    },
    'cochrans-q': {
      name: "Cochran's Q Test",
      description: 'Tests for differences in multiple matched sets',
      dataType: 'contingency',
      minRows: 3,
      minCols: 2,
      icon: <TimelineIcon />,
      assumptions: [
        'Binary responses',
        'Related samples',
        'Multiple treatments or time points'
      ],
      hypotheses: {
        null: 'All treatments have the same effect',
        alternative: 'At least one treatment differs'
      }
    },
    'binomial': {
      name: 'Binomial Test',
      description: 'Tests if observed proportions match expected probability',
      dataType: 'binomial',
      icon: <CategoryIcon />,
      assumptions: [
        'Binary outcomes',
        'Independent trials',
        'Fixed probability of success'
      ],
      hypotheses: {
        null: 'The success probability equals the hypothesized value',
        alternative: 'The success probability differs from the hypothesized value'
      }
    }
  };

  // Service instance
  const categoricalService = useMemo(() => new CategoricalAnalysisService(), []);

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

  const updateTableDimensions = useCallback((rows, cols) => {
    const newTable = Array(rows).fill(null).map((_, i) =>
      Array(cols).fill(null).map((_, j) =>
        dataInput.contingencyTable[i]?.[j] || 0
      )
    );
    setDataInput({
      ...dataInput,
      tableRows: rows,
      tableCols: cols,
      contingencyTable: newTable
    });
  }, [dataInput]);

  const updateCellValue = useCallback((row, col, value) => {
    const newTable = [...dataInput.contingencyTable];
    newTable[row][col] = parseFloat(value) || 0;
    setDataInput({ ...dataInput, contingencyTable: newTable });
  }, [dataInput]);

  const parseRawData = useCallback(() => {
    try {
      const rows = dataInput.rawData.trim().split('\n').filter(row => row.trim());

      if (selectedTest === 'binomial') {
        // Parse binary data for binomial test
        const values = [];
        rows.forEach(row => {
          const val = row.trim().toLowerCase();
          if (val === '1' || val === 'success' || val === 'true' || val === 'yes') {
            values.push(1);
          } else if (val === '0' || val === 'failure' || val === 'false' || val === 'no') {
            values.push(0);
          }
        });

        const successes = values.filter(v => v === 1).length;
        const total = values.length;

        setDataInput({
          ...dataInput,
          observedFrequencies: [successes, total - successes]
        });
        setError(null);

      } else if (categoricalTests[selectedTest].dataType === 'frequencies') {
        // Parse frequency data
        const frequencies = [];
        const labels = [];

        rows.forEach(row => {
          const parts = row.split(/[\s,\t]+/);
          if (parts.length >= 2) {
            labels.push(parts[0]);
            frequencies.push(parseFloat(parts[1]) || 0);
          }
        });

        setDataInput({
          ...dataInput,
          observedFrequencies: frequencies,
          categoryLabels: labels
        });
        setError(null);

      } else {
        // Parse contingency table
        const table = [];
        rows.forEach(row => {
          const values = row.split(/[\s,\t]+/).map(v => parseFloat(v) || 0);
          if (values.length > 0) {
            table.push(values);
          }
        });

        if (table.length > 0) {
          setDataInput({
            ...dataInput,
            tableRows: table.length,
            tableCols: table[0].length,
            contingencyTable: table
          });
          setError(null);
        }
      }
    } catch (err) {
      setError(`Error parsing data: ${err.message}`);
    }
  }, [dataInput, selectedTest, categoricalTests]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const csvText = results.data.map(row => row.join('\t')).join('\n');
            setDataInput({ ...dataInput, rawData: csvText });
            setTimeout(parseRawData, 100);
          }
        },
        error: (err) => {
          setError(`Error reading file: ${err.message}`);
        }
      });
    }
  }, [dataInput, parseRawData]);

  const performTest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      switch (selectedTest) {
        case 'chi-square-independence':
          response = await categoricalService.chiSquareIndependence({
            observed: dataInput.contingencyTable,
            yates_correction: testOptions.yatesCorrection,
            monte_carlo: testOptions.monteCarloSimulation,
            n_simulations: testOptions.simulations
          });
          break;

        case 'chi-square-goodness':
          response = await categoricalService.chiSquareGoodnessOfFit({
            observed: dataInput.observedFrequencies,
            expected: dataInput.expectedFrequencies.length > 0 ?
              dataInput.expectedFrequencies : null,
            ddof: 0 // degrees of freedom adjustment
          });
          break;

        case 'chi-square-homogeneity':
          response = await categoricalService.chiSquareHomogeneity({
            observed: dataInput.contingencyTable,
            yates_correction: testOptions.yatesCorrection
          });
          break;

        case 'fishers-exact':
          response = await categoricalService.fishersExactTest({
            contingency_table: dataInput.contingencyTable,
            alternative: testOptions.alternativeHypothesis
          });
          break;

        case 'mcnemar':
          response = await categoricalService.mcnemarsTest({
            contingency_table: dataInput.contingencyTable,
            continuity_correction: testOptions.yatesCorrection
          });
          break;

        case 'cochrans-q':
          response = await categoricalService.cochransQ({
            data: dataInput.contingencyTable
          });
          break;

        case 'binomial':
          const [successes, failures] = dataInput.observedFrequencies;
          response = await categoricalService.binomialTest({
            successes: successes,
            n: successes + failures,
            p: testOptions.successProbability,
            alternative: testOptions.alternativeHypothesis
          });
          break;

        default:
          throw new Error(`Test ${selectedTest} not implemented`);
      }

      // Calculate effect sizes if applicable
      if (response && dataInput.contingencyTable && ['chi-square-independence', 'fishers-exact'].includes(selectedTest)) {
        response.effectSizes = calculateEffectSizes(dataInput.contingencyTable, response.chi_square);
      }

      // Add test metadata
      response.testName = categoricalTests[selectedTest].name;
      response.testType = selectedTest;
      setResults(response);

    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTest, dataInput, testOptions, categoricalService, categoricalTests]);

  const calculateEffectSizes = useCallback((table, chiSquare) => {
    const n = table.flat().reduce((a, b) => a + b, 0);
    const rows = table.length;
    const cols = table[0].length;
    const k = Math.min(rows, cols);

    return {
      phi: Math.sqrt(chiSquare / n),
      cramers_v: Math.sqrt(chiSquare / (n * (k - 1))),
      contingency_coefficient: Math.sqrt(chiSquare / (chiSquare + n))
    };
  }, []);

  const getEffectSizeInterpretation = useCallback((effectSize, type) => {
    if (type === 'cramers_v' || type === 'phi') {
      if (effectSize < 0.1) return 'Negligible';
      if (effectSize < 0.3) return 'Small';
      if (effectSize < 0.5) return 'Medium';
      return 'Large';
    }
    return '';
  }, []);

  const exportResults = useCallback((format) => {
    if (!results) return;

    if (format === 'pdf') {
      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(16);
      doc.text('Categorical Analysis Results', 20, yPosition);
      yPosition += 15;

      // Test name
      doc.setFontSize(12);
      doc.text(`Test: ${results.testName}`, 20, yPosition);
      yPosition += 10;

      // Test statistics
      doc.setFontSize(11);
      doc.text('Test Statistics:', 20, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      if (results.chi_square !== undefined) {
        doc.text(`Chi-square: ${formatNumber(results.chi_square, 6)}`, 25, yPosition);
        yPosition += 5;
      }
      if (results.statistic !== undefined) {
        doc.text(`Test statistic: ${formatNumber(results.statistic, 6)}`, 25, yPosition);
        yPosition += 5;
      }
      doc.text(`p-value: ${formatNumber(results.p_value, 6)}`, 25, yPosition);
      yPosition += 5;
      if (results.degrees_of_freedom !== undefined) {
        doc.text(`Degrees of freedom: ${results.degrees_of_freedom}`, 25, yPosition);
        yPosition += 5;
      }

      // Effect sizes
      if (results.effectSizes) {
        yPosition += 5;
        doc.text('Effect Sizes:', 20, yPosition);
        yPosition += 5;
        doc.text(`Phi: ${formatNumber(results.effectSizes.phi, 4)}`, 25, yPosition);
        yPosition += 5;
        doc.text(`Cramer's V: ${formatNumber(results.effectSizes.cramers_v, 4)}`, 25, yPosition);
        yPosition += 5;
      }

      // Contingency table
      if (dataInput.contingencyTable && dataInput.inputMethod === 'table') {
        yPosition += 10;
        doc.text('Observed Frequencies:', 20, yPosition);
        yPosition += 5;

        const tableData = dataInput.contingencyTable.map((row, i) =>
          [`Row ${i + 1}`, ...row.map(v => v.toString())]
        );

        doc.autoTable({
          startY: yPosition,
          head: [['', ...Array(dataInput.tableCols).fill(0).map((_, i) => `Col ${i + 1}`)]],
          body: tableData,
          theme: 'striped',
          styles: { fontSize: 9 }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // Expected frequencies
      if (results.expected_frequencies) {
        doc.text('Expected Frequencies:', 20, yPosition);
        yPosition += 5;

        const expectedData = results.expected_frequencies.map((row, i) =>
          [`Row ${i + 1}`, ...row.map(v => formatNumber(v, 2))]
        );

        doc.autoTable({
          startY: yPosition,
          head: [['', ...Array(results.expected_frequencies[0].length).fill(0).map((_, i) => `Col ${i + 1}`)]],
          body: expectedData,
          theme: 'striped',
          styles: { fontSize: 9 }
        });
      }

      // Save PDF
      doc.save('categorical_test_results.pdf');

    } else if (format === 'csv') {
      let csvContent = 'Categorical Test Results\n\n';
      csvContent += `Test,${results.testName}\n`;

      if (results.chi_square !== undefined) {
        csvContent += `Chi-square,${results.chi_square}\n`;
      }
      csvContent += `p-value,${results.p_value}\n`;
      if (results.degrees_of_freedom !== undefined) {
        csvContent += `Degrees of freedom,${results.degrees_of_freedom}\n`;
      }

      if (results.effectSizes) {
        csvContent += '\nEffect Sizes\n';
        csvContent += `Phi,${results.effectSizes.phi}\n`;
        csvContent += `Cramer's V,${results.effectSizes.cramers_v}\n`;
        csvContent += `Contingency Coefficient,${results.effectSizes.contingency_coefficient}\n`;
      }

      if (dataInput.contingencyTable && dataInput.inputMethod === 'table') {
        csvContent += '\nObserved Frequencies\n';
        dataInput.contingencyTable.forEach(row => {
          csvContent += row.join(',') + '\n';
        });
      }

      if (results.expected_frequencies) {
        csvContent += '\nExpected Frequencies\n';
        results.expected_frequencies.forEach(row => {
          csvContent += row.join(',') + '\n';
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      saveAs(blob, 'categorical_test_results.csv');
    }

    setExportDialogOpen(false);
  }, [results, dataInput, formatNumber]);

  const resetCalculator = useCallback(() => {
    setDataInput({
      inputMethod: 'table',
      tableRows: 2,
      tableCols: 2,
      contingencyTable: [[0, 0], [0, 0]],
      observedFrequencies: [],
      expectedFrequencies: [],
      rawData: ''
    });
    setResults(null);
    setError(null);
  }, []);

  // Render functions
  const renderDataInput = () => {
    const currentTest = categoricalTests[selectedTest];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TableChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Data Input
          </Typography>

          {currentTest.dataType === 'contingency' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Input Method</InputLabel>
              <Select
                value={dataInput.inputMethod}
                onChange={(e) => setDataInput({ ...dataInput, inputMethod: e.target.value })}
                label="Input Method"
              >
                <MenuItem value="table">Interactive Table</MenuItem>
                <MenuItem value="raw">Paste/Upload Data</MenuItem>
              </Select>
            </FormControl>
          )}

          {dataInput.inputMethod === 'table' && currentTest.dataType === 'contingency' && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Rows"
                    value={dataInput.tableRows}
                    onChange={(e) => updateTableDimensions(parseInt(e.target.value) || 2, dataInput.tableCols)}
                    inputProps={{ min: currentTest.minRows, max: currentTest.maxRows || 10 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Columns"
                    value={dataInput.tableCols}
                    onChange={(e) => updateTableDimensions(dataInput.tableRows, parseInt(e.target.value) || 2)}
                    inputProps={{ min: currentTest.minCols, max: currentTest.maxCols || 10 }}
                  />
                </Grid>
              </Grid>

              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      {Array(dataInput.tableCols).fill(0).map((_, j) => (
                        <TableCell key={j} align="center">
                          Column {j + 1}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataInput.contingencyTable.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>Row {i + 1}</TableCell>
                        {row.map((cell, j) => (
                          <TableCell key={j} align="center">
                            <TextField
                              type="number"
                              value={cell}
                              onChange={(e) => updateCellValue(i, j, e.target.value)}
                              inputProps={{ min: 0 }}
                              size="small"
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Display marginal totals */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total observations: {dataInput.contingencyTable.flat().reduce((a, b) => a + b, 0)}
                </Typography>
              </Box>
            </Box>
          )}

          {dataInput.inputMethod === 'raw' || currentTest.dataType === 'frequencies' || currentTest.dataType === 'binomial' && (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={8}
                variant="outlined"
                label={
                  currentTest.dataType === 'binomial'
                    ? 'Enter binary data (0/1 or success/failure per row)'
                    : currentTest.dataType === 'frequencies'
                    ? 'Enter categories and frequencies (category frequency per row)'
                    : 'Enter contingency table (rows and columns separated by spaces/tabs)'
                }
                value={dataInput.rawData}
                onChange={(e) => setDataInput({ ...dataInput, rawData: e.target.value })}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={parseRawData}
                  startIcon={<CalculateIcon />}
                >
                  Parse Data
                </Button>

                <input
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                  >
                    Upload CSV
                  </Button>
                </label>
              </Box>
            </Box>
          )}

          {currentTest.dataType === 'binomial' && dataInput.observedFrequencies.length > 0 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <AlertTitle>Data Loaded</AlertTitle>
              Successes: {dataInput.observedFrequencies[0]}, Failures: {dataInput.observedFrequencies[1]}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTestOptions = () => {
    const currentTest = categoricalTests[selectedTest];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Test Options
          </Typography>

          <Grid container spacing={2}>
            {selectedTest === 'binomial' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Success Probability (H₀)"
                  value={testOptions.successProbability}
                  onChange={(e) => setTestOptions({
                    ...testOptions,
                    successProbability: parseFloat(e.target.value)
                  })}
                  inputProps={{ min: 0, max: 1, step: 0.01 }}
                />
              </Grid>
            )}

            {['fishers-exact', 'binomial'].includes(selectedTest) && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Alternative Hypothesis</InputLabel>
                  <Select
                    value={testOptions.alternativeHypothesis}
                    onChange={(e) => setTestOptions({
                      ...testOptions,
                      alternativeHypothesis: e.target.value
                    })}
                    label="Alternative Hypothesis"
                  >
                    <MenuItem value="two-sided">Two-sided</MenuItem>
                    <MenuItem value="greater">Greater</MenuItem>
                    <MenuItem value="less">Less</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Confidence Level"
                value={testOptions.confidenceLevel}
                onChange={(e) => setTestOptions({
                  ...testOptions,
                  confidenceLevel: parseFloat(e.target.value)
                })}
                inputProps={{ min: 0.5, max: 0.999, step: 0.01 }}
              />
            </Grid>

            {['chi-square-independence', 'chi-square-homogeneity', 'mcnemar'].includes(selectedTest) && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={testOptions.yatesCorrection}
                      onChange={(e) => setTestOptions({
                        ...testOptions,
                        yatesCorrection: e.target.checked
                      })}
                    />
                  }
                  label="Apply Yates' continuity correction (for 2x2 tables)"
                />
              </Grid>
            )}

            {selectedTest === 'chi-square-independence' && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={testOptions.monteCarloSimulation}
                      onChange={(e) => setTestOptions({
                        ...testOptions,
                        monteCarloSimulation: e.target.checked
                      })}
                    />
                  }
                  label="Use Monte Carlo simulation (for small expected frequencies)"
                />
              </Grid>
            )}

            {testOptions.monteCarloSimulation && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Simulations"
                  value={testOptions.simulations}
                  onChange={(e) => setTestOptions({
                    ...testOptions,
                    simulations: parseInt(e.target.value)
                  })}
                  inputProps={{ min: 1000, max: 100000, step: 1000 }}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={testOptions.includeExpected}
                    onChange={(e) => setTestOptions({
                      ...testOptions,
                      includeExpected: e.target.checked
                    })}
                  />
                }
                label="Calculate expected frequencies"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={testOptions.includeResiduals}
                    onChange={(e) => setTestOptions({
                      ...testOptions,
                      includeResiduals: e.target.checked
                    })}
                  />
                }
                label="Calculate residuals"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={performTest}
              disabled={loading ||
                (currentTest.dataType === 'contingency' &&
                 dataInput.contingencyTable.flat().every(v => v === 0))}
              startIcon={loading ? <CircularProgress size={20} /> : <CalculateIcon />}
            >
              {loading ? 'Calculating...' : 'Perform Test'}
            </Button>
            <Button
              variant="outlined"
              onClick={resetCalculator}
              startIcon={<RefreshIcon />}
            >
              Reset
            </Button>
          </Box>
        </CardContent>
      </Card>
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
              Test Results: {results.testName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small">
                <Select
                  value={displayPrecision}
                  onChange={(e) => setDisplayPrecision(e.target.value)}
                >
                  <MenuItem value={4}>4 decimals</MenuItem>
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

          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="Main Results" />
            {results.expected_frequencies && <Tab label="Expected Frequencies" />}
            {results.residuals && <Tab label="Residuals" />}
            <Tab label="Interpretation" />
          </Tabs>

          {/* Main Results Tab */}
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Test Statistic
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {formatNumber(results.chi_square || results.statistic)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {results.chi_square ? 'χ²' : 'Test statistic'}
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
                      severity={results.p_value < 0.05 ? 'success' : 'info'}
                      sx={{ mt: 2 }}
                    >
                      {results.p_value < 0.05
                        ? 'Result is statistically significant'
                        : 'Result is not statistically significant'}
                    </Alert>
                  </Paper>
                </Grid>

                {results.degrees_of_freedom !== undefined && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Degrees of Freedom
                      </Typography>
                      <Typography variant="h4">
                        {results.degrees_of_freedom}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        df = (rows - 1) × (cols - 1)
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {results.effectSizes && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Effect Sizes
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Cramer's V"
                            secondary={`${formatNumber(results.effectSizes.cramers_v, 3)} (${getEffectSizeInterpretation(results.effectSizes.cramers_v, 'cramers_v')})`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Phi coefficient"
                            secondary={formatNumber(results.effectSizes.phi, 3)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Contingency coefficient"
                            secondary={formatNumber(results.effectSizes.contingency_coefficient, 3)}
                          />
                        </ListItem>
                      </List>
                    </Paper>
                  </Grid>
                )}

                {results.odds_ratio !== undefined && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Odds Ratio
                      </Typography>
                      <Typography variant="h4">
                        {formatNumber(results.odds_ratio, 3)}
                      </Typography>
                      {results.odds_ratio_ci && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          95% CI: [{formatNumber(results.odds_ratio_ci[0], 3)},
                          {formatNumber(results.odds_ratio_ci[1], 3)}]
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}

                {results.critical_value !== undefined && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Critical Value
                      </Typography>
                      <Typography variant="body1">
                        χ²({results.degrees_of_freedom}, α={1 - testOptions.confidenceLevel}) = {formatNumber(results.critical_value, 4)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(results.chi_square || results.statistic) > results.critical_value
                          ? 'Test statistic exceeds critical value'
                          : 'Test statistic does not exceed critical value'}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>

              {/* Assumption Checks */}
              {results.assumption_check && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Assumption Checks</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Alert
                      severity={results.assumption_check.all_expected_above_5 ? 'success' : 'warning'}
                    >
                      <AlertTitle>Expected Frequency Check</AlertTitle>
                      <Typography variant="body2">
                        {results.assumption_check.all_expected_above_5
                          ? 'All expected frequencies ≥ 5'
                          : `${results.assumption_check.cells_below_5} cells have expected frequency < 5`}
                      </Typography>
                      {!results.assumption_check.all_expected_above_5 && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Consider using Fisher's exact test or Monte Carlo simulation
                        </Typography>
                      )}
                    </Alert>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}

          {/* Expected Frequencies Tab */}
          {activeTab === 1 && results.expected_frequencies && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    {Array(results.expected_frequencies[0].length).fill(0).map((_, j) => (
                      <TableCell key={j} align="center">
                        Column {j + 1}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.expected_frequencies.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>Row {i + 1}</TableCell>
                      {row.map((cell, j) => (
                        <TableCell key={j} align="center">
                          <Box>
                            <Typography>{formatNumber(cell, 2)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              (O: {dataInput.contingencyTable[i][j]})
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Residuals Tab */}
          {activeTab === 2 && results.residuals && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Standardized residuals show which cells contribute most to the chi-square statistic.
                Values {">"} |2| indicate significant deviation from expected.
              </Alert>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      {Array(results.residuals[0].length).fill(0).map((_, j) => (
                        <TableCell key={j} align="center">
                          Column {j + 1}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.residuals.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>Row {i + 1}</TableCell>
                        {row.map((cell, j) => {
                          const absValue = Math.abs(cell);
                          return (
                            <TableCell key={j} align="center">
                              <Typography
                                color={absValue > 2 ? 'error' : absValue > 1 ? 'warning.main' : 'text.primary'}
                                fontWeight={absValue > 2 ? 'bold' : 'normal'}
                              >
                                {formatNumber(cell, 3)}
                              </Typography>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Interpretation Tab */}
          {activeTab === 3 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Test Interpretation</AlertTitle>
                <Typography variant="body2" paragraph>
                  <strong>Null Hypothesis:</strong> {categoricalTests[results.testType].hypotheses.null}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Alternative Hypothesis:</strong> {categoricalTests[results.testType].hypotheses.alternative}
                </Typography>
                <Typography variant="body2">
                  <strong>Decision:</strong> {results.p_value < 0.05
                    ? 'Reject the null hypothesis at α = 0.05 level'
                    : 'Fail to reject the null hypothesis at α = 0.05 level'}
                </Typography>
              </Alert>

              {results.effectSizes && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Effect Size Interpretation
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Cramer's V = {formatNumber(results.effectSizes.cramers_v, 3)} indicates a{' '}
                    <strong>{getEffectSizeInterpretation(results.effectSizes.cramers_v, 'cramers_v').toLowerCase()}</strong>{' '}
                    association between the variables.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Guidelines: 0.1 (small), 0.3 (medium), 0.5 (large)
                  </Typography>
                </Paper>
              )}

              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Assumptions for This Test
                </Typography>
                <List dense>
                  {categoricalTests[results.testType].assumptions.map((assumption, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={assumption} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}

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

  const renderTestSelector = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Select Categorical Test
        </Typography>

        <FormControl fullWidth>
          <InputLabel>Categorical Test</InputLabel>
          <Select
            value={selectedTest}
            onChange={(e) => {
              setSelectedTest(e.target.value);
              resetCalculator();
            }}
            label="Categorical Test"
          >
            {Object.entries(categoricalTests).map(([key, test]) => (
              <MenuItem key={key} value={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {test.icon}
                  <Box sx={{ ml: 1, flexGrow: 1 }}>
                    <Typography>{test.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {test.description}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Current Test: {categoricalTests[selectedTest].name}</AlertTitle>
          <Typography variant="body2">
            {categoricalTests[selectedTest].description}
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Categorical Tests Calculator
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Perform categorical data analysis with 50 decimal precision.
        Test for independence, association, and goodness of fit.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {renderTestSelector()}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          {renderDataInput()}
        </Grid>
        <Grid item xs={12} lg={6}>
          {renderTestOptions()}
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
          Categorical Tests Help
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>Overview</Typography>
          <Typography paragraph>
            Categorical tests analyze relationships between categorical variables.
            These tests help determine if variables are independent or associated.
          </Typography>

          <Typography variant="h6" gutterBottom>Test Selection Guide</Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Chi-Square Test of Independence"
                secondary="Use when testing if two categorical variables are independent"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Chi-Square Goodness of Fit"
                secondary="Use when testing if observed frequencies match expected distribution"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Fisher's Exact Test"
                secondary="Use for 2x2 tables, especially with small expected frequencies"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="McNemar's Test"
                secondary="Use for paired categorical data (before/after)"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Binomial Test"
                secondary="Use for testing proportions against a hypothesized value"
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom>Effect Size Guidelines</Typography>
          <Typography paragraph>
            Cramer's V interpretation:
          </Typography>
          <List>
            <ListItem>• Small: 0.1</ListItem>
            <ListItem>• Medium: 0.3</ListItem>
            <ListItem>• Large: 0.5</ListItem>
          </List>

          <Typography variant="h6" gutterBottom>Assumptions</Typography>
          <Typography paragraph>
            Most chi-square tests require:
          </Typography>
          <List>
            <ListItem>• Random sampling</ListItem>
            <ListItem>• Independent observations</ListItem>
            <ListItem>• Expected frequency ≥ 5 in most cells</ListItem>
            <ListItem>• Use Fisher's exact test for small samples</ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
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

export default CategoricalTests;