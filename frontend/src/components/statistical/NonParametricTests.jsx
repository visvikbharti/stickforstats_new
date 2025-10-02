/**
 * Non-Parametric Tests Component
 * ================================
 * Complete UI for performing various non-parametric statistical tests with 50 decimal precision
 * Distribution-free alternatives to parametric tests
 *
 * Features:
 * - Mann-Whitney U test (independent samples)
 * - Wilcoxon signed-rank test (paired samples)
 * - Kruskal-Wallis test (multiple groups)
 * - Friedman test (repeated measures)
 * - Sign test
 * - Mood's median test
 * - Runs test for randomness
 * - Kolmogorov-Smirnov test
 * - 50 decimal precision display
 * - Effect size calculations
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
  ListItemSecondaryAction,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Badge
} from '@mui/material';

import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Help as HelpIcon,
  Assessment as AssessmentIcon,
  CompareArrows as CompareArrowsIcon,
  Groups as GroupsIcon,
  Repeat as RepeatIcon,
  Timeline as TimelineIcon,
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
  TrendingUp as TrendingUpIcon,
  SwapHoriz as SwapHorizIcon,
  Functions as FunctionsIcon
} from '@mui/icons-material';

// Import utilities
import Decimal from 'decimal.js';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Import service
import { NonParametricTestsService } from '../../services/NonParametricTestsService';

// Configure Decimal precision
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

const NonParametricTests = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTest, setSelectedTest] = useState('mann-whitney');
  const [dataInput, setDataInput] = useState({
    dataFormat: 'manual', // manual, paste, file
    rawData: '',
    groups: [],
    numberOfGroups: 2
  });

  const [dataGroups, setDataGroups] = useState([
    { name: 'Group 1', values: [] },
    { name: 'Group 2', values: [] }
  ]);

  const [pairedData, setPairedData] = useState({
    before: [],
    after: []
  });

  const [testOptions, setTestOptions] = useState({
    alternativeHypothesis: 'two-sided', // two-sided, greater, less
    confidenceLevel: 0.95,
    continuityCorrection: true,
    exactTest: false,
    tieCorrection: true,
    effectSizeType: 'r', // r, glass_delta, cliff_delta
    includeDescriptives: true,
    includeCriticalValue: true,
    multipleComparisons: 'none', // none, bonferroni, holm, fdr
    posthocTest: 'dunn' // dunn, conover, nemenyi
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFullPrecision, setShowFullPrecision] = useState(false);
  const [displayPrecision, setDisplayPrecision] = useState(6);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [testSelectorOpen, setTestSelectorOpen] = useState(false);

  // Test configurations
  const nonParametricTests = {
    'mann-whitney': {
      name: 'Mann-Whitney U Test',
      description: 'Compares two independent samples',
      parametricEquivalent: 'Independent t-test',
      dataStructure: 'independent',
      minGroups: 2,
      maxGroups: 2,
      icon: <CompareArrowsIcon />,
      assumptions: [
        'Independent observations',
        'Ordinal or continuous data',
        'Similar distribution shapes (for median comparison)'
      ],
      hypotheses: {
        null: 'The two groups have the same distribution',
        alternative: 'The two groups have different distributions'
      }
    },
    'wilcoxon': {
      name: 'Wilcoxon Signed-Rank Test',
      description: 'Compares two paired/related samples',
      parametricEquivalent: 'Paired t-test',
      dataStructure: 'paired',
      minGroups: 2,
      maxGroups: 2,
      icon: <SwapHorizIcon />,
      assumptions: [
        'Paired observations',
        'Ordinal or continuous data',
        'Symmetric distribution of differences'
      ],
      hypotheses: {
        null: 'The median difference is zero',
        alternative: 'The median difference is not zero'
      }
    },
    'kruskal-wallis': {
      name: 'Kruskal-Wallis Test',
      description: 'Compares three or more independent groups',
      parametricEquivalent: 'One-way ANOVA',
      dataStructure: 'independent',
      minGroups: 3,
      maxGroups: null,
      icon: <GroupsIcon />,
      assumptions: [
        'Independent observations',
        'Ordinal or continuous data',
        'Similar distribution shapes across groups'
      ],
      hypotheses: {
        null: 'All groups have the same distribution',
        alternative: 'At least one group differs'
      }
    },
    'friedman': {
      name: 'Friedman Test',
      description: 'Compares three or more related samples',
      parametricEquivalent: 'Repeated measures ANOVA',
      dataStructure: 'repeated',
      minGroups: 3,
      maxGroups: null,
      icon: <RepeatIcon />,
      assumptions: [
        'Related/repeated measurements',
        'Ordinal or continuous data',
        'Blocks are independent'
      ],
      hypotheses: {
        null: 'All treatments have the same effect',
        alternative: 'At least one treatment differs'
      }
    },
    'sign': {
      name: 'Sign Test',
      description: 'Simple test for paired data based on signs',
      parametricEquivalent: 'One-sample t-test',
      dataStructure: 'paired',
      minGroups: 2,
      maxGroups: 2,
      icon: <TrendingUpIcon />,
      assumptions: [
        'Paired observations',
        'Data can be classified as + or -',
        'Independence of pairs'
      ],
      hypotheses: {
        null: 'The median difference is zero',
        alternative: 'The median difference is not zero'
      }
    },
    'mood-median': {
      name: "Mood's Median Test",
      description: 'Tests equality of medians across groups',
      parametricEquivalent: 'One-way ANOVA',
      dataStructure: 'independent',
      minGroups: 2,
      maxGroups: null,
      icon: <FunctionsIcon />,
      assumptions: [
        'Independent observations',
        'Ordinal or continuous data',
        'Groups have similar dispersion'
      ],
      hypotheses: {
        null: 'All groups have the same median',
        alternative: 'At least one median differs'
      }
    },
    'runs': {
      name: 'Runs Test',
      description: 'Tests randomness in a sequence',
      parametricEquivalent: 'None',
      dataStructure: 'single',
      minGroups: 1,
      maxGroups: 1,
      icon: <TimelineIcon />,
      assumptions: [
        'Binary or dichotomized data',
        'Sequential observations'
      ],
      hypotheses: {
        null: 'The sequence is random',
        alternative: 'The sequence is not random'
      }
    },
    'kolmogorov-smirnov': {
      name: 'Kolmogorov-Smirnov Test',
      description: 'Compares two sample distributions',
      parametricEquivalent: 'None',
      dataStructure: 'independent',
      minGroups: 2,
      maxGroups: 2,
      icon: <AssessmentIcon />,
      assumptions: [
        'Independent observations',
        'Continuous data',
        'No ties (ideally)'
      ],
      hypotheses: {
        null: 'The two samples come from the same distribution',
        alternative: 'The samples come from different distributions'
      }
    }
  };

  // Service instance
  const nonParametricService = useMemo(() => new NonParametricTestsService(), []);

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
      const rows = dataInput.rawData.trim().split('\n').filter(row => row.trim());
      const currentTest = nonParametricTests[selectedTest];

      if (currentTest.dataStructure === 'paired') {
        // Parse paired data
        const before = [];
        const after = [];

        rows.forEach(row => {
          const values = row.split(/[\s,\t]+/).map(v => parseFloat(v.trim()));
          if (values.length >= 2 && !isNaN(values[0]) && !isNaN(values[1])) {
            before.push(values[0]);
            after.push(values[1]);
          }
        });

        if (before.length > 0) {
          setPairedData({ before, after });
          setError(null);
        } else {
          throw new Error('No valid paired data found');
        }

      } else if (currentTest.dataStructure === 'independent') {
        // Parse independent groups
        const groups = Array(dataInput.numberOfGroups).fill(null).map(() => []);

        // Check if first row is headers
        const firstRow = rows[0].split(/[\s,\t]+/);
        const isHeader = firstRow.some(v => isNaN(parseFloat(v)));
        let startIndex = isHeader ? 1 : 0;

        // Parse data into groups
        for (let i = startIndex; i < rows.length; i++) {
          const values = rows[i].split(/[\s,\t]+/).map(v => parseFloat(v.trim()));
          values.forEach((val, j) => {
            if (!isNaN(val) && j < groups.length) {
              groups[j].push(val);
            }
          });
        }

        const newDataGroups = groups.map((values, i) => ({
          name: isHeader ? firstRow[i] : `Group ${i + 1}`,
          values: values
        }));

        setDataGroups(newDataGroups);
        setError(null);

      } else if (currentTest.dataStructure === 'repeated') {
        // Parse repeated measures data
        const measurements = [];
        const firstRow = rows[0].split(/[\s,\t]+/);
        const isHeader = firstRow.some(v => isNaN(parseFloat(v)));
        let headers = isHeader ? firstRow : firstRow.map((_, i) => `Time ${i + 1}`);
        let startIndex = isHeader ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const values = rows[i].split(/[\s,\t]+/).map(v => parseFloat(v.trim()));
          if (values.every(v => !isNaN(v))) {
            measurements.push(values);
          }
        }

        if (measurements.length > 0) {
          const groups = headers.map((name, j) => ({
            name: name,
            values: measurements.map(row => row[j])
          }));
          setDataGroups(groups);
          setError(null);
        } else {
          throw new Error('No valid repeated measures data found');
        }

      } else if (currentTest.dataStructure === 'single') {
        // Parse single sequence
        const values = [];
        rows.forEach(row => {
          const val = parseFloat(row.trim());
          if (!isNaN(val)) {
            values.push(val);
          }
        });

        if (values.length > 0) {
          setDataGroups([{ name: 'Sequence', values }]);
          setError(null);
        } else {
          throw new Error('No valid sequence data found');
        }
      }
    } catch (err) {
      setError(`Error parsing data: ${err.message}`);
    }
  }, [dataInput, selectedTest, nonParametricTests]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 1) {
            const csvText = results.data.map(row => row.join('\t')).join('\n');
            setDataInput({ ...dataInput, rawData: csvText });
            setTimeout(parseDataInput, 100);
          }
        },
        error: (err) => {
          setError(`Error reading file: ${err.message}`);
        }
      });
    }
  }, [dataInput, parseDataInput]);

  const addGroup = useCallback(() => {
    setDataGroups([...dataGroups, { name: `Group ${dataGroups.length + 1}`, values: [] }]);
  }, [dataGroups]);

  const removeGroup = useCallback((index) => {
    const newGroups = dataGroups.filter((_, i) => i !== index);
    setDataGroups(newGroups);
  }, [dataGroups]);

  const performTest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentTest = nonParametricTests[selectedTest];
      let response;

      switch (selectedTest) {
        case 'mann-whitney':
          response = await nonParametricService.performMannWhitneyU({
            group1: dataGroups[0].values,
            group2: dataGroups[1].values,
            alternative: testOptions.alternativeHypothesis,
            continuity_correction: testOptions.continuityCorrection,
            exact: testOptions.exactTest
          });
          break;

        case 'wilcoxon':
          response = await nonParametricService.performWilcoxonSignedRank({
            x: pairedData.before,
            y: pairedData.after,
            alternative: testOptions.alternativeHypothesis,
            correction: testOptions.continuityCorrection,
            exact: testOptions.exactTest
          });
          break;

        case 'kruskal-wallis':
          response = await nonParametricService.performKruskalWallis({
            groups: dataGroups.map(g => g.values),
            group_names: dataGroups.map(g => g.name),
            tie_correction: testOptions.tieCorrection,
            post_hoc: testOptions.posthocTest
          });
          break;

        case 'friedman':
          // Transform data for Friedman test
          const blockedData = [];
          const maxLength = Math.max(...dataGroups.map(g => g.values.length));
          for (let i = 0; i < maxLength; i++) {
            const block = dataGroups.map(g => g.values[i] || null).filter(v => v !== null);
            if (block.length === dataGroups.length) {
              blockedData.push(block);
            }
          }
          response = await nonParametricService.performFriedman({
            data: blockedData,
            treatment_names: dataGroups.map(g => g.name),
            post_hoc: testOptions.posthocTest
          });
          break;

        case 'sign':
          response = await nonParametricService.performSignTest({
            x: pairedData.before,
            y: pairedData.after,
            alternative: testOptions.alternativeHypothesis
          });
          break;

        case 'mood-median':
          response = await nonParametricService.performMoodsMedianTest({
            groups: dataGroups.map(g => g.values),
            group_names: dataGroups.map(g => g.name),
            tie_correction: testOptions.tieCorrection
          });
          break;

        case 'runs':
          response = await nonParametricService.performRunsTest({
            sequence: dataGroups[0].values,
            cutoff: 'median', // or 'mean'
            alternative: testOptions.alternativeHypothesis
          });
          break;

        case 'kolmogorov-smirnov':
          response = await nonParametricService.performKolmogorovSmirnov({
            sample1: dataGroups[0].values,
            sample2: dataGroups[1].values,
            alternative: testOptions.alternativeHypothesis
          });
          break;

        default:
          throw new Error(`Test ${selectedTest} not implemented`);
      }

      // Add test metadata
      response.testName = currentTest.name;
      response.testType = selectedTest;
      setResults(response);

    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTest, dataGroups, pairedData, testOptions, nonParametricService, nonParametricTests]);

  const exportResults = useCallback((format) => {
    if (!results) return;

    if (format === 'pdf') {
      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(16);
      doc.text('Non-Parametric Test Results', 20, yPosition);
      yPosition += 15;

      // Test name
      doc.setFontSize(12);
      doc.text(`Test: ${results.testName}`, 20, yPosition);
      yPosition += 10;

      // Main statistics
      doc.setFontSize(11);
      doc.text('Test Statistics:', 20, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      if (results.statistic !== undefined) {
        doc.text(`Test statistic: ${formatNumber(results.statistic, 6)}`, 25, yPosition);
        yPosition += 5;
      }
      if (results.p_value !== undefined) {
        doc.text(`p-value: ${formatNumber(results.p_value, 6)}`, 25, yPosition);
        yPosition += 5;
      }
      if (results.effect_size !== undefined) {
        doc.text(`Effect size: ${formatNumber(results.effect_size, 4)}`, 25, yPosition);
        yPosition += 5;
      }

      // Sample sizes
      if (results.sample_sizes) {
        yPosition += 5;
        doc.text('Sample Sizes:', 20, yPosition);
        yPosition += 5;
        Object.entries(results.sample_sizes).forEach(([group, size]) => {
          doc.text(`${group}: ${size}`, 25, yPosition);
          yPosition += 5;
        });
      }

      // Descriptive statistics
      if (results.descriptives) {
        yPosition += 5;
        doc.setFontSize(11);
        doc.text('Descriptive Statistics:', 20, yPosition);
        yPosition += 5;

        const descData = Object.entries(results.descriptives).map(([group, stats]) => [
          group,
          formatNumber(stats.median, 4),
          formatNumber(stats.mean, 4),
          formatNumber(stats.std, 4),
          formatNumber(stats.iqr, 4)
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Group', 'Median', 'Mean', 'SD', 'IQR']],
          body: descData,
          theme: 'striped',
          styles: { fontSize: 9 }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // Post-hoc results if available
      if (results.post_hoc) {
        doc.setFontSize(11);
        doc.text('Post-hoc Comparisons:', 20, yPosition);
        yPosition += 5;

        const postHocData = results.post_hoc.comparisons.map(comp => [
          `${comp.group1} vs ${comp.group2}`,
          formatNumber(comp.statistic, 4),
          formatNumber(comp.p_value, 6),
          comp.significant ? 'Yes' : 'No'
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Comparison', 'Statistic', 'p-value', 'Significant']],
          body: postHocData,
          theme: 'striped',
          styles: { fontSize: 9 }
        });
      }

      // Save PDF
      doc.save('nonparametric_test_results.pdf');

    } else if (format === 'csv') {
      let csvContent = 'Non-Parametric Test Results\n\n';
      csvContent += `Test,${results.testName}\n`;
      csvContent += `Test Statistic,${results.statistic}\n`;
      csvContent += `p-value,${results.p_value}\n`;

      if (results.effect_size) {
        csvContent += `Effect Size,${results.effect_size}\n`;
      }

      if (results.descriptives) {
        csvContent += '\nDescriptive Statistics\n';
        csvContent += 'Group,N,Median,Mean,SD,IQR,Min,Max\n';
        Object.entries(results.descriptives).forEach(([group, stats]) => {
          csvContent += `${group},${stats.n},${stats.median},${stats.mean},`;
          csvContent += `${stats.std},${stats.iqr},${stats.min},${stats.max}\n`;
        });
      }

      if (results.post_hoc) {
        csvContent += '\nPost-hoc Comparisons\n';
        csvContent += 'Group 1,Group 2,Statistic,p-value,Adjusted p-value,Significant\n';
        results.post_hoc.comparisons.forEach(comp => {
          csvContent += `${comp.group1},${comp.group2},${comp.statistic},`;
          csvContent += `${comp.p_value},${comp.adjusted_p_value || ''},`;
          csvContent += `${comp.significant ? 'Yes' : 'No'}\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      saveAs(blob, 'nonparametric_test_results.csv');
    }

    setExportDialogOpen(false);
  }, [results, formatNumber]);

  const resetCalculator = useCallback(() => {
    setDataGroups([
      { name: 'Group 1', values: [] },
      { name: 'Group 2', values: [] }
    ]);
    setPairedData({ before: [], after: [] });
    setResults(null);
    setError(null);
  }, []);

  // Render functions
  const renderDataInput = () => {
    const currentTest = nonParametricTests[selectedTest];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TableChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Data Input
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
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

          {currentTest.dataStructure === 'independent' && currentTest.minGroups > 2 && (
            <TextField
              fullWidth
              type="number"
              label="Number of Groups"
              value={dataInput.numberOfGroups}
              onChange={(e) => {
                const num = parseInt(e.target.value);
                setDataInput({ ...dataInput, numberOfGroups: num });
                const newGroups = Array(num).fill(null).map((_, i) => ({
                  name: `Group ${i + 1}`,
                  values: dataGroups[i]?.values || []
                }));
                setDataGroups(newGroups);
              }}
              inputProps={{ min: currentTest.minGroups, max: 10 }}
              sx={{ mb: 2 }}
            />
          )}

          {dataInput.dataFormat === 'manual' || dataInput.dataFormat === 'paste' ? (
            <>
              <TextField
                fullWidth
                multiline
                rows={8}
                variant="outlined"
                label={
                  currentTest.dataStructure === 'paired'
                    ? 'Enter paired data (before after per row)'
                    : currentTest.dataStructure === 'single'
                    ? 'Enter sequence values (one per row)'
                    : 'Enter data (columns for groups)'
                }
                value={dataInput.rawData}
                onChange={(e) => setDataInput({ ...dataInput, rawData: e.target.value })}
                placeholder={
                  currentTest.dataStructure === 'paired'
                    ? '10.5 12.3\n11.2 13.1\n9.8 11.5'
                    : currentTest.dataStructure === 'single'
                    ? '1\n0\n0\n1\n1\n0'
                    : 'Group1 Group2 Group3\n10.5 12.3 11.1\n11.2 13.1 12.5'
                }
                sx={{ mb: 2 }}
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
            <Box>
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

          {/* Data validation feedback */}
          {currentTest.dataStructure === 'paired' && pairedData.before.length > 0 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <AlertTitle>Paired Data Loaded</AlertTitle>
              {pairedData.before.length} paired observations loaded
            </Alert>
          )}

          {currentTest.dataStructure === 'independent' && dataGroups.some(g => g.values.length > 0) && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <AlertTitle>Groups Loaded</AlertTitle>
              {dataGroups.map(g => `${g.name}: ${g.values.length} observations`).join(', ')}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTestOptions = () => {
    const currentTest = nonParametricTests[selectedTest];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Test Options
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Alternative Hypothesis</InputLabel>
                <Select
                  value={testOptions.alternativeHypothesis}
                  onChange={(e) => setTestOptions({ ...testOptions, alternativeHypothesis: e.target.value })}
                  label="Alternative Hypothesis"
                >
                  <MenuItem value="two-sided">Two-sided</MenuItem>
                  <MenuItem value="greater">Greater</MenuItem>
                  <MenuItem value="less">Less</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Confidence Level"
                value={testOptions.confidenceLevel}
                onChange={(e) => setTestOptions({ ...testOptions, confidenceLevel: parseFloat(e.target.value) })}
                inputProps={{ min: 0.5, max: 0.999, step: 0.01 }}
              />
            </Grid>

            {['mann-whitney', 'wilcoxon'].includes(selectedTest) && (
              <>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={testOptions.continuityCorrection}
                        onChange={(e) => setTestOptions({ ...testOptions, continuityCorrection: e.target.checked })}
                      />
                    }
                    label="Apply continuity correction"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={testOptions.exactTest}
                        onChange={(e) => setTestOptions({ ...testOptions, exactTest: e.target.checked })}
                      />
                    }
                    label="Use exact test (for small samples)"
                  />
                </Grid>
              </>
            )}

            {['kruskal-wallis', 'friedman'].includes(selectedTest) && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Post-hoc Test</InputLabel>
                  <Select
                    value={testOptions.posthocTest}
                    onChange={(e) => setTestOptions({ ...testOptions, posthocTest: e.target.value })}
                    label="Post-hoc Test"
                  >
                    <MenuItem value="dunn">Dunn's test</MenuItem>
                    <MenuItem value="conover">Conover-Iman test</MenuItem>
                    <MenuItem value="nemenyi">Nemenyi test</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={testOptions.includeDescriptives}
                    onChange={(e) => setTestOptions({ ...testOptions, includeDescriptives: e.target.checked })}
                  />
                }
                label="Include descriptive statistics"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={performTest}
              disabled={loading ||
                (currentTest.dataStructure === 'paired' ? pairedData.before.length < 5 :
                 !dataGroups.some(g => g.values.length >= 3))}
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
            {results.descriptives && <Tab label="Descriptives" />}
            {results.post_hoc && <Tab label="Post-hoc" />}
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
                      {formatNumber(results.statistic)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {results.statistic_name || 'Test statistic'}
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

                {results.effect_size !== undefined && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Effect Size
                      </Typography>
                      <Typography variant="h4">
                        {formatNumber(results.effect_size, 3)}
                      </Typography>
                      <Chip
                        label={
                          Math.abs(results.effect_size) < 0.3 ? 'Small' :
                          Math.abs(results.effect_size) < 0.5 ? 'Medium' : 'Large'
                        }
                        color={
                          Math.abs(results.effect_size) < 0.3 ? 'default' :
                          Math.abs(results.effect_size) < 0.5 ? 'info' : 'success'
                        }
                        size="small"
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {results.effect_size_type || 'Effect size r'}
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {results.confidence_interval && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        {(testOptions.confidenceLevel * 100).toFixed(0)}% Confidence Interval
                      </Typography>
                      <Typography variant="body1">
                        [{formatNumber(results.confidence_interval[0])}, {formatNumber(results.confidence_interval[1])}]
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        {results.ci_method || 'Hodges-Lehmann estimator'}
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {results.sample_sizes && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Sample Sizes
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {Object.entries(results.sample_sizes).map(([group, size]) => (
                          <Chip
                            key={group}
                            label={`${group}: n=${size}`}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </Grid>

              {results.ranks && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Rank Information</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Group</TableCell>
                            <TableCell align="right">Mean Rank</TableCell>
                            <TableCell align="right">Sum of Ranks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(results.ranks).map(([group, rankInfo]) => (
                            <TableRow key={group}>
                              <TableCell>{group}</TableCell>
                              <TableCell align="right">{formatNumber(rankInfo.mean_rank, 2)}</TableCell>
                              <TableCell align="right">{formatNumber(rankInfo.sum_ranks, 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}

          {/* Descriptives Tab */}
          {activeTab === 1 && results.descriptives && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Group</TableCell>
                    <TableCell align="right">N</TableCell>
                    <TableCell align="right">Median</TableCell>
                    <TableCell align="right">Mean</TableCell>
                    <TableCell align="right">SD</TableCell>
                    <TableCell align="right">IQR</TableCell>
                    <TableCell align="right">Min</TableCell>
                    <TableCell align="right">Max</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(results.descriptives).map(([group, stats]) => (
                    <TableRow key={group}>
                      <TableCell>{group}</TableCell>
                      <TableCell align="right">{stats.n}</TableCell>
                      <TableCell align="right">{formatNumber(stats.median)}</TableCell>
                      <TableCell align="right">{formatNumber(stats.mean)}</TableCell>
                      <TableCell align="right">{formatNumber(stats.std)}</TableCell>
                      <TableCell align="right">{formatNumber(stats.iqr)}</TableCell>
                      <TableCell align="right">{formatNumber(stats.min)}</TableCell>
                      <TableCell align="right">{formatNumber(stats.max)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Post-hoc Tab */}
          {activeTab === 2 && results.post_hoc && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Post-hoc comparisons using {results.post_hoc.method}
                {results.post_hoc.correction && ` with ${results.post_hoc.correction} correction`}
              </Alert>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Comparison</TableCell>
                      <TableCell align="right">Statistic</TableCell>
                      <TableCell align="right">p-value</TableCell>
                      {results.post_hoc.comparisons[0]?.adjusted_p_value !== undefined && (
                        <TableCell align="right">Adjusted p</TableCell>
                      )}
                      <TableCell align="center">Significant</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.post_hoc.comparisons.map((comp, index) => (
                      <TableRow key={index}>
                        <TableCell>{comp.group1} vs {comp.group2}</TableCell>
                        <TableCell align="right">{formatNumber(comp.statistic, 4)}</TableCell>
                        <TableCell align="right">{formatNumber(comp.p_value, 6)}</TableCell>
                        {comp.adjusted_p_value !== undefined && (
                          <TableCell align="right">{formatNumber(comp.adjusted_p_value, 6)}</TableCell>
                        )}
                        <TableCell align="center">
                          {comp.significant ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <Typography color="text.secondary">—</Typography>
                          )}
                        </TableCell>
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
                  <strong>Null Hypothesis:</strong> {nonParametricTests[results.testType].hypotheses.null}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Alternative Hypothesis:</strong> {nonParametricTests[results.testType].hypotheses.alternative}
                </Typography>
                <Typography variant="body2">
                  <strong>Decision:</strong> {results.p_value < 0.05
                    ? 'Reject the null hypothesis at α = 0.05 level'
                    : 'Fail to reject the null hypothesis at α = 0.05 level'}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Parametric Equivalent
                    </Typography>
                    <Typography variant="body2">
                      {nonParametricTests[results.testType].parametricEquivalent}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      When to Use
                    </Typography>
                    <Typography variant="body2">
                      Use this test when parametric assumptions are violated,
                      data is ordinal, or distributions are non-normal.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Assumptions for This Test
                    </Typography>
                    <List dense>
                      {nonParametricTests[results.testType].assumptions.map((assumption, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={assumption} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              </Grid>
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
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderTestSelector = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Select Non-Parametric Test
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setTestSelectorOpen(true)}
            startIcon={<HelpIcon />}
          >
            Help Me Choose
          </Button>
        </Box>

        <FormControl fullWidth>
          <InputLabel>Non-Parametric Test</InputLabel>
          <Select
            value={selectedTest}
            onChange={(e) => {
              setSelectedTest(e.target.value);
              resetCalculator();
            }}
            label="Non-Parametric Test"
          >
            {Object.entries(nonParametricTests).map(([key, test]) => (
              <MenuItem key={key} value={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {test.icon}
                  <Box sx={{ ml: 1, flexGrow: 1 }}>
                    <Typography>{test.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {test.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={test.parametricEquivalent}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 2 }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Current Test: {nonParametricTests[selectedTest].name}</AlertTitle>
          <Typography variant="body2">
            {nonParametricTests[selectedTest].description}
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Non-Parametric Tests Calculator
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Perform distribution-free statistical tests with 50 decimal precision.
        These tests make fewer assumptions about your data than parametric tests.
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
          Non-Parametric Tests Help
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>Overview</Typography>
          <Typography paragraph>
            Non-parametric tests are statistical methods that make fewer assumptions
            about the data distribution. They are useful when:
          </Typography>
          <List>
            <ListItem>• Data is not normally distributed</ListItem>
            <ListItem>• Sample sizes are small</ListItem>
            <ListItem>• Data is ordinal or ranked</ListItem>
            <ListItem>• Presence of outliers</ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Test Selection Guide</Typography>

          <Stepper orientation="vertical">
            <Step active>
              <StepLabel>What type of comparison?</StepLabel>
              <StepContent>
                <Typography variant="body2">
                  • Two independent groups → Mann-Whitney U or Kolmogorov-Smirnov
                </Typography>
                <Typography variant="body2">
                  • Two paired/related samples → Wilcoxon signed-rank or Sign test
                </Typography>
                <Typography variant="body2">
                  • Three+ independent groups → Kruskal-Wallis or Mood's median
                </Typography>
                <Typography variant="body2">
                  • Three+ related samples → Friedman test
                </Typography>
                <Typography variant="body2">
                  • Test for randomness → Runs test
                </Typography>
              </StepContent>
            </Step>
          </Stepper>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Effect Size Guidelines</Typography>
          <List>
            <ListItem>• Small: r = 0.1 - 0.3</ListItem>
            <ListItem>• Medium: r = 0.3 - 0.5</ListItem>
            <ListItem>• Large: r {">"} 0.5</ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Test Selector Helper Dialog */}
      <Dialog
        open={testSelectorOpen}
        onClose={() => setTestSelectorOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Test Selection Assistant</DialogTitle>
        <DialogContent dividers>
          <Stepper orientation="vertical">
            <Step active>
              <StepLabel>Number of Groups/Samples</StepLabel>
              <StepContent>
                <RadioGroup>
                  <FormControlLabel value="two" control={<Radio />} label="Two groups/samples" />
                  <FormControlLabel value="multiple" control={<Radio />} label="Three or more groups" />
                  <FormControlLabel value="single" control={<Radio />} label="Single sample" />
                </RadioGroup>
              </StepContent>
            </Step>
            <Step active>
              <StepLabel>Data Structure</StepLabel>
              <StepContent>
                <RadioGroup>
                  <FormControlLabel value="independent" control={<Radio />} label="Independent/unrelated groups" />
                  <FormControlLabel value="paired" control={<Radio />} label="Paired/related samples" />
                  <FormControlLabel value="repeated" control={<Radio />} label="Repeated measures" />
                </RadioGroup>
              </StepContent>
            </Step>
            <Step active>
              <StepLabel>Recommended Test</StepLabel>
              <StepContent>
                <Alert severity="success">
                  Based on your selections, we recommend using the appropriate test from the dropdown.
                </Alert>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestSelectorOpen(false)}>Close</Button>
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

export default NonParametricTests;