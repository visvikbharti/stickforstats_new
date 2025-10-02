/**
 * ANOVA Calculator Component
 * ===========================
 * Complete UI for performing Analysis of Variance with 50 decimal precision
 * Supports one-way, two-way, and repeated measures ANOVA
 *
 * Features:
 * - Multiple group data input
 * - One-way and two-way ANOVA
 * - Post-hoc test selection (Tukey, Bonferroni, Scheffe, etc.)
 * - Assumption checking and validation
 * - 50 decimal precision display
 * - Effect size calculations (eta², omega²)
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
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormGroup,
  Switch
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
  VisibilityOff as VisibilityOffIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  CompareArrows as CompareArrowsIcon
} from '@mui/icons-material';

import { useSnackbar } from 'notistack';
import Decimal from 'decimal.js';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Import services
import HighPrecisionStatisticalService from '../../services/HighPrecisionStatisticalService';
import ExampleDataLoader from '../common/ExampleDataLoader';
import { ExampleDatasets } from '../../data/ExampleDatasets';

// Configure Decimal.js for 50 decimal precision
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

// Component constants
const ANOVA_TYPES = {
  ONE_WAY: 'one_way',
  TWO_WAY: 'two_way',
  REPEATED_MEASURES: 'repeated_measures',
  ANCOVA: 'ancova',
  MANOVA: 'manova'
};

const POST_HOC_TESTS = [
  { value: 'tukey', label: 'Tukey HSD', description: 'Controls family-wise error rate' },
  { value: 'bonferroni', label: 'Bonferroni', description: 'Conservative, controls FWER' },
  { value: 'scheffe', label: 'Scheffe', description: 'Most conservative, allows complex comparisons' },
  { value: 'games_howell', label: 'Games-Howell', description: 'For unequal variances' },
  { value: 'dunnett', label: 'Dunnett', description: 'Compare all groups to control' },
  { value: 'fisher_lsd', label: "Fisher's LSD", description: 'Liberal, no multiple comparison correction' },
  { value: 'newman_keuls', label: 'Newman-Keuls', description: 'Stepwise comparisons' },
  { value: 'duncan', label: 'Duncan', description: 'Multiple range test' }
];

const CORRECTION_METHODS = [
  { value: 'none', label: 'None' },
  { value: 'bonferroni', label: 'Bonferroni' },
  { value: 'holm', label: 'Holm' },
  { value: 'fdr_bh', label: 'Benjamini-Hochberg (FDR)' },
  { value: 'fdr_by', label: 'Benjamini-Yekutieli' },
  { value: 'sidak', label: 'Šidák' }
];

const PRECISION_OPTIONS = [
  { value: 6, label: '6 decimals (Standard)' },
  { value: 10, label: '10 decimals (Extended)' },
  { value: 20, label: '20 decimals (High)' },
  { value: 30, label: '30 decimals (Very High)' },
  { value: 50, label: '50 decimals (Maximum)' }
];

const ANOVACalculator = () => {
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [anovaType, setAnovaType] = useState(ANOVA_TYPES.ONE_WAY);
  const [groups, setGroups] = useState([
    { name: 'Group 1', data: '' },
    { name: 'Group 2', data: '' },
    { name: 'Group 3', data: '' }
  ]);
  const [covariates, setCovariates] = useState([
    { name: 'Covariate 1', data: '' }
  ]);
  const [factor1Name, setFactor1Name] = useState('Factor 1');
  const [factor2Name, setFactor2Name] = useState('Factor 2');
  const [dependentVariable, setDependentVariable] = useState('Dependent Variable');
  const [selectedPostHoc, setSelectedPostHoc] = useState(['tukey']);
  const [correctionMethod, setCorrectionMethod] = useState('bonferroni');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [checkAssumptions, setCheckAssumptions] = useState(true);
  const [calculateEffectSizes, setCalculateEffectSizes] = useState(true);
  const [generateVisualizations, setGenerateVisualizations] = useState(true);
  const [checkHomogeneitySlopes, setCheckHomogeneitySlopes] = useState(true);
  const [displayPrecision, setDisplayPrecision] = useState(6);
  const [showFullPrecision, setShowFullPrecision] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [assumptions, setAssumptions] = useState(null);
  const [postHocResults, setPostHocResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [dataInputMethod, setDataInputMethod] = useState('manual');
  const [errors, setErrors] = useState({});

  // Handle loading example data
  const handleLoadExampleData = useCallback((exampleData) => {
    if (exampleData.groups) {
      // Load group data for standard ANOVA
      const newGroups = exampleData.groups.map(group => ({
        name: group.name,
        data: group.data.join(', ')
      }));
      setGroups(newGroups);
    }

    if (exampleData.covariate) {
      // Load covariate data for ANCOVA
      setAnovaType(ANOVA_TYPES.ANCOVA);
      setCovariates([{
        name: exampleData.covariate.name,
        data: exampleData.covariate.data.join(', ')
      }]);
    }

    enqueueSnackbar('Example data loaded successfully!', { variant: 'success' });
  }, [enqueueSnackbar]);

  // Add or remove groups
  const addGroup = useCallback(() => {
    setGroups(prev => [...prev, { name: `Group ${prev.length + 1}`, data: '' }]);
  }, []);

  const removeGroup = useCallback((index) => {
    if (groups.length > 2) {
      setGroups(prev => prev.filter((_, i) => i !== index));
    } else {
      enqueueSnackbar('ANOVA requires at least 2 groups', { variant: 'warning' });
    }
  }, [groups.length, enqueueSnackbar]);

  // Add or remove covariates (for ANCOVA)
  const addCovariate = useCallback(() => {
    setCovariates(prev => [...prev, { name: `Covariate ${prev.length + 1}`, data: '' }]);
  }, []);

  const removeCovariate = useCallback((index) => {
    if (covariates.length > 1) {
      setCovariates(prev => prev.filter((_, i) => i !== index));
    } else {
      enqueueSnackbar('ANCOVA requires at least 1 covariate', { variant: 'warning' });
    }
  }, [covariates.length, enqueueSnackbar]);

  // Update covariate data
  const updateCovariate = useCallback((index, field, value) => {
    setCovariates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // Update group data
  const updateGroup = useCallback((index, field, value) => {
    setGroups(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

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

    // Check if we have enough groups
    if (groups.length < 2) {
      newErrors.groups = 'ANOVA requires at least 2 groups';
    }

    // Validate each group has data
    let totalGroupObservations = 0;
    groups.forEach((group, index) => {
      try {
        const parsedData = parseData(group.data);
        if (parsedData.length < 2) {
          newErrors[`group_${index}`] = 'Each group needs at least 2 data points';
        }
        totalGroupObservations += parsedData.length;
      } catch (e) {
        newErrors[`group_${index}`] = e.message;
      }
    });

    // For ANCOVA, validate covariates
    if (anovaType === ANOVA_TYPES.ANCOVA) {
      if (covariates.length < 1) {
        newErrors.covariates = 'ANCOVA requires at least 1 covariate';
      }

      covariates.forEach((covariate, index) => {
        try {
          const parsedData = parseData(covariate.data);
          if (parsedData.length !== totalGroupObservations) {
            newErrors[`covariate_${index}`] = `Covariate must have ${totalGroupObservations} observations (same as total group observations)`;
          }
        } catch (e) {
          newErrors[`covariate_${index}`] = e.message;
        }
      });
    }

    // For two-way ANOVA, ensure balanced design (simplified check)
    if (anovaType === ANOVA_TYPES.TWO_WAY) {
      // Additional validation for two-way ANOVA could go here
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [groups, covariates, anovaType, parseData]);

  // Perform ANOVA calculation
  const performANOVA = useCallback(async () => {
    if (!validateInputs()) {
      enqueueSnackbar('Please fix input errors', { variant: 'error' });
      return;
    }

    setLoading(true);
    setResults(null);
    setAssumptions(null);
    setPostHocResults(null);

    try {
      // Parse all group data
      const parsedGroups = groups.map(group => ({
        name: group.name,
        data: parseData(group.data)
      }));

      let response;

      if (anovaType === ANOVA_TYPES.ANCOVA) {
        // Handle ANCOVA
        const parsedCovariates = covariates.map(covariate => ({
          name: covariate.name,
          data: parseData(covariate.data)
        }));

        const ancovaData = {
          groups: parsedGroups.map(g => g.data),
          covariates: parsedCovariates.map(c => c.data),
          groupNames: parsedGroups.map(g => g.name),
          covariateNames: parsedCovariates.map(c => c.name),
          dependentVariableName: dependentVariable,
          alpha: 1 - confidenceLevel,
          checkHomogeneitySlopes: checkHomogeneitySlopes,
          postHoc: selectedPostHoc.length > 0 ? selectedPostHoc[0] : null,
          options: {
            check_assumptions: checkAssumptions,
            calculate_effect_sizes: calculateEffectSizes,
            generate_visualizations: generateVisualizations
          }
        };

        response = await HighPrecisionStatisticalService.performANCOVA(ancovaData);
      } else {
        // Handle regular ANOVA
        const requestData = {
          anova_type: anovaType,
          groups: parsedGroups.map(g => g.data),
          group_names: parsedGroups.map(g => g.name),
          post_hoc: selectedPostHoc.length > 0 ? selectedPostHoc : null,
          correction: correctionMethod !== 'none' ? correctionMethod : null,
          options: {
            check_assumptions: checkAssumptions,
            calculate_effect_sizes: calculateEffectSizes,
            generate_visualizations: generateVisualizations,
            confidence_level: confidenceLevel,
            dependent_variable: dependentVariable,
            factor1_name: factor1Name,
            factor2_name: anovaType === ANOVA_TYPES.TWO_WAY ? factor2Name : null
          }
        };

        response = await HighPrecisionStatisticalService.performANOVA(requestData);
      }

      setResults(response);

      if (response.assumptions) {
        setAssumptions(response.assumptions);
      }

      if (response.post_hoc_results) {
        setPostHocResults(response.post_hoc_results);
      }

      enqueueSnackbar('ANOVA completed successfully!', { variant: 'success' });
    } catch (error) {
      console.error('ANOVA failed:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to perform ANOVA',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  }, [
    validateInputs,
    groups,
    covariates,
    anovaType,
    selectedPostHoc,
    correctionMethod,
    checkAssumptions,
    calculateEffectSizes,
    generateVisualizations,
    checkHomogeneitySlopes,
    confidenceLevel,
    dependentVariable,
    factor1Name,
    factor2Name,
    parseData,
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

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          // Assume each column is a group
          const numColumns = results.data[0].length;
          const newGroups = [];

          for (let col = 0; col < numColumns; col++) {
            const columnData = results.data
              .map(row => row[col])
              .filter(v => v !== '' && v !== null && v !== undefined);

            // Use first row as group name if it's not a number
            let groupName = `Group ${col + 1}`;
            let dataStart = 0;

            if (isNaN(parseFloat(columnData[0]))) {
              groupName = columnData[0];
              dataStart = 1;
            }

            newGroups.push({
              name: groupName,
              data: columnData.slice(dataStart).join('\n')
            });
          }

          setGroups(newGroups);
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
      doc.text('ANOVA Results', 20, 20);

      // Test info
      doc.setFontSize(12);
      doc.text(`ANOVA Type: ${anovaType.replace('_', ' ').toUpperCase()}`, 20, 35);
      doc.text(`Number of Groups: ${groups.length}`, 20, 45);
      doc.text(`Confidence Level: ${(confidenceLevel * 100).toFixed(0)}%`, 20, 55);

      // ANOVA table
      if (results.anova_table) {
        const tableData = [
          ['Source', 'SS', 'df', 'MS', 'F', 'p-value'],
          ...Object.entries(results.anova_table).map(([source, values]) => [
            source,
            formatNumber(values.SS, 4),
            values.df,
            formatNumber(values.MS, 4),
            formatNumber(values.F, 4),
            formatNumber(values.p_value, 6)
          ])
        ];

        doc.autoTable({
          startY: 65,
          head: [tableData[0]],
          body: tableData.slice(1)
        });
      }

      // Effect sizes
      if (results.effect_sizes) {
        const currentY = doc.previousAutoTable.finalY + 10;
        doc.text('Effect Sizes:', 20, currentY);
        doc.text(`Eta²: ${formatNumber(results.effect_sizes.eta_squared, 4)}`, 30, currentY + 10);
        doc.text(`Partial Eta²: ${formatNumber(results.effect_sizes.partial_eta_squared, 4)}`, 30, currentY + 20);
        doc.text(`Omega²: ${formatNumber(results.effect_sizes.omega_squared, 4)}`, 30, currentY + 30);
      }

      // Save PDF
      doc.save(`anova_results_${new Date().toISOString().slice(0, 10)}.pdf`);

    } else if (format === 'csv') {
      // Create CSV content
      let csvContent = [
        ['ANOVA Results'],
        [''],
        ['Test Type', anovaType],
        ['Number of Groups', groups.length],
        ['Confidence Level', confidenceLevel],
        ['']
      ];

      // Add ANOVA table
      if (results.anova_table) {
        csvContent.push(['ANOVA Table']);
        csvContent.push(['Source', 'SS', 'df', 'MS', 'F', 'p-value']);
        Object.entries(results.anova_table).forEach(([source, values]) => {
          csvContent.push([
            source,
            values.SS,
            values.df,
            values.MS,
            values.F,
            values.p_value
          ]);
        });
        csvContent.push(['']);
      }

      // Add effect sizes
      if (results.effect_sizes) {
        csvContent.push(['Effect Sizes']);
        csvContent.push(['Eta²', results.effect_sizes.eta_squared]);
        csvContent.push(['Partial Eta²', results.effect_sizes.partial_eta_squared]);
        csvContent.push(['Omega²', results.effect_sizes.omega_squared]);
      }

      const csvString = csvContent.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `anova_results_${new Date().toISOString().slice(0, 10)}.csv`);
    }

    enqueueSnackbar(`Results exported as ${format.toUpperCase()}`, { variant: 'success' });
  }, [results, anovaType, groups.length, confidenceLevel, formatNumber, enqueueSnackbar]);

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
            {assumptions.normality && (
              <Grid item xs={12} md={6}>
                <Alert severity={assumptions.normality.all_normal ? 'success' : 'warning'}>
                  <AlertTitle>Normality</AlertTitle>
                  {assumptions.normality.all_normal ?
                    'All groups appear normally distributed' :
                    'Some groups may not be normally distributed'}
                  <br />
                  {assumptions.normality.group_results && (
                    <Box sx={{ mt: 1 }}>
                      {Object.entries(assumptions.normality.group_results).map(([group, result]) => (
                        <Typography key={group} variant="caption" display="block">
                          {group}: p = {formatNumber(result.p_value, 4)}
                          {result.is_normal ? ' ✓' : ' ⚠️'}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Alert>
              </Grid>
            )}

            {assumptions.homogeneity && (
              <Grid item xs={12} md={6}>
                <Alert severity={assumptions.homogeneity.is_met ? 'success' : 'warning'}>
                  <AlertTitle>Homogeneity of Variance</AlertTitle>
                  {assumptions.homogeneity.is_met ?
                    'Variances appear equal across groups' :
                    'Variances may be unequal (consider Welch\'s ANOVA or Games-Howell post-hoc)'}
                  <br />
                  <Typography variant="caption">
                    Levene's test p-value: {formatNumber(assumptions.homogeneity.p_value, 4)}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {assumptions.sphericity && anovaType === ANOVA_TYPES.REPEATED_MEASURES && (
              <Grid item xs={12}>
                <Alert severity={assumptions.sphericity.is_met ? 'success' : 'warning'}>
                  <AlertTitle>Sphericity</AlertTitle>
                  {assumptions.sphericity.is_met ?
                    'Sphericity assumption is met' :
                    'Sphericity violated - using Greenhouse-Geisser correction'}
                  <br />
                  <Typography variant="caption">
                    Mauchly's W: {formatNumber(assumptions.sphericity.mauchly_w, 4)},
                    p = {formatNumber(assumptions.sphericity.p_value, 4)}
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

  // Render main ANOVA results
  const renderResults = () => {
    if (!results) return null;

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              ANOVA Results
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
          {results.omnibus_result && (
            <Box sx={{ mb: 3 }}>
              <Alert severity={results.omnibus_result.is_significant ? 'success' : 'info'}>
                <AlertTitle>
                  {results.omnibus_result.is_significant ?
                    'Statistically Significant' :
                    'Not Statistically Significant'}
                </AlertTitle>
                <Typography variant="body2">
                  F({results.omnibus_result.df_between}, {results.omnibus_result.df_within}) = {' '}
                  {formatNumber(results.omnibus_result.F_statistic, 4)}, {' '}
                  p = {formatNumber(results.omnibus_result.p_value, 6)}
                </Typography>
              </Alert>
            </Box>
          )}

          {/* ANOVA Table */}
          {results.anova_table && (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                ANOVA Table
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Source</strong></TableCell>
                      <TableCell align="right"><strong>SS</strong></TableCell>
                      <TableCell align="right"><strong>df</strong></TableCell>
                      <TableCell align="right"><strong>MS</strong></TableCell>
                      <TableCell align="right"><strong>F</strong></TableCell>
                      <TableCell align="right"><strong>p-value</strong></TableCell>
                      {showFullPrecision && (
                        <TableCell align="right"><strong>Full Precision (50 decimals)</strong></TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(results.anova_table).map(([source, values]) => (
                      <TableRow key={source}>
                        <TableCell>{source}</TableCell>
                        <TableCell align="right">{formatNumber(values.SS)}</TableCell>
                        <TableCell align="right">{values.df}</TableCell>
                        <TableCell align="right">{formatNumber(values.MS)}</TableCell>
                        <TableCell align="right">{formatNumber(values.F)}</TableCell>
                        <TableCell align="right">{formatNumber(values.p_value, 6)}</TableCell>
                        {showFullPrecision && (
                          <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            F: {values.F}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Effect Sizes */}
          {results.effect_sizes && (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Effect Sizes
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">
                      {formatNumber(results.effect_sizes.eta_squared, 4)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Eta² (η²)
                    </Typography>
                    {showFullPrecision && (
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', mt: 1 }}>
                        {results.effect_sizes.eta_squared}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">
                      {formatNumber(results.effect_sizes.partial_eta_squared, 4)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Partial Eta² (η²ₚ)
                    </Typography>
                    {showFullPrecision && (
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', mt: 1 }}>
                        {results.effect_sizes.partial_eta_squared}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">
                      {formatNumber(results.effect_sizes.omega_squared, 4)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Omega² (ω²)
                    </Typography>
                    {showFullPrecision && (
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', mt: 1 }}>
                        {results.effect_sizes.omega_squared}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}

          {/* Group Means and Standard Deviations */}
          {results.group_stats && (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Descriptive Statistics
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Group</strong></TableCell>
                      <TableCell align="right"><strong>N</strong></TableCell>
                      <TableCell align="right"><strong>Mean</strong></TableCell>
                      <TableCell align="right"><strong>SD</strong></TableCell>
                      <TableCell align="right"><strong>SE</strong></TableCell>
                      <TableCell align="right"><strong>95% CI</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(results.group_stats).map(([group, stats]) => (
                      <TableRow key={group}>
                        <TableCell>{group}</TableCell>
                        <TableCell align="right">{stats.n}</TableCell>
                        <TableCell align="right">{formatNumber(stats.mean)}</TableCell>
                        <TableCell align="right">{formatNumber(stats.std)}</TableCell>
                        <TableCell align="right">{formatNumber(stats.se)}</TableCell>
                        <TableCell align="right">
                          [{formatNumber(stats.ci_lower, 4)}, {formatNumber(stats.ci_upper, 4)}]
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Effect size interpretation */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Effect Size Interpretation:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Eta² = {formatNumber(results.effect_sizes?.eta_squared, 3)} suggests a{' '}
              {parseFloat(results.effect_sizes?.eta_squared) < 0.01 ? 'negligible' :
               parseFloat(results.effect_sizes?.eta_squared) < 0.06 ? 'small' :
               parseFloat(results.effect_sizes?.eta_squared) < 0.14 ? 'medium' : 'large'} effect size.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render post-hoc test results
  const renderPostHocResults = () => {
    if (!postHocResults) return null;

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <CompareArrowsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Post-Hoc Test Results
          </Typography>

          {Object.entries(postHocResults).map(([testName, testResults]) => (
            <Box key={testName} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                {testName.replace('_', ' ').toUpperCase()}
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Comparison</strong></TableCell>
                      <TableCell align="right"><strong>Mean Diff</strong></TableCell>
                      <TableCell align="right"><strong>SE</strong></TableCell>
                      <TableCell align="right"><strong>t/q</strong></TableCell>
                      <TableCell align="right"><strong>p-value</strong></TableCell>
                      <TableCell align="right"><strong>Adjusted p</strong></TableCell>
                      <TableCell align="center"><strong>Significant</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testResults.comparisons?.map((comp, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{comp.groups.join(' vs ')}</TableCell>
                        <TableCell align="right">{formatNumber(comp.mean_diff, 4)}</TableCell>
                        <TableCell align="right">{formatNumber(comp.se, 4)}</TableCell>
                        <TableCell align="right">{formatNumber(comp.statistic, 4)}</TableCell>
                        <TableCell align="right">{formatNumber(comp.p_value, 6)}</TableCell>
                        <TableCell align="right">{formatNumber(comp.adjusted_p, 6)}</TableCell>
                        <TableCell align="center">
                          {comp.is_significant ?
                            <CheckCircleIcon color="success" fontSize="small" /> :
                            <ClearIcon color="disabled" fontSize="small" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ANOVA Calculator
        <Chip
          label="50 Decimal Precision"
          color="primary"
          size="small"
          sx={{ ml: 2 }}
        />
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Perform Analysis of Variance with automatic assumption checking, post-hoc tests, and effect size calculations.
      </Typography>

      {/* Main configuration card */}
      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
            <Tab label="Data Input" />
            <Tab label="ANOVA Configuration" />
            <Tab label="Post-Hoc & Options" />
            <Tab label="Help & Information" />
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
                      Upload a CSV file with groups in columns. First row can be group names.
                    </Typography>
                  </Grid>
                ) : (
                  <>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">
                          Groups ({groups.length})
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={addGroup}
                        >
                          Add Group
                        </Button>
                      </Box>

                      {groups.map((group, index) => (
                        <Paper key={index} sx={{ p: 2, mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <TextField
                              label="Group Name"
                              value={group.name}
                              onChange={(e) => updateGroup(index, 'name', e.target.value)}
                              sx={{ minWidth: 150 }}
                            />
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label="Data"
                              value={group.data}
                              onChange={(e) => updateGroup(index, 'data', e.target.value)}
                              error={!!errors[`group_${index}`]}
                              helperText={errors[`group_${index}`] || 'Enter values separated by spaces, commas, or new lines'}
                              placeholder="e.g., 1.2, 3.4, 5.6"
                            />
                            <IconButton
                              color="error"
                              onClick={() => removeGroup(index)}
                              disabled={groups.length <= 2}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Paper>
                      ))}
                    </Grid>

                    {/* Covariates input for ANCOVA */}
                    {anovaType === ANOVA_TYPES.ANCOVA && (
                      <Grid item xs={12}>
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Covariates (Continuous Variables for Adjustment)
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Add continuous variables to control for their effects on the dependent variable
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={addCovariate}
                              variant="outlined"
                            >
                              Add Covariate
                            </Button>
                          </Box>

                          {covariates.map((covariate, index) => (
                            <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: 'action.hover' }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                <TextField
                                  label="Covariate Name"
                                  value={covariate.name}
                                  onChange={(e) => updateCovariate(index, 'name', e.target.value)}
                                  sx={{ minWidth: 150 }}
                                />
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={3}
                                  label="Covariate Data"
                                  value={covariate.data}
                                  onChange={(e) => updateCovariate(index, 'data', e.target.value)}
                                  error={!!errors[`covariate_${index}`]}
                                  helperText={errors[`covariate_${index}`] || 'Enter continuous values (same number as total observations in groups)'}
                                  placeholder="e.g., 25, 30, 28, 32, 27, 29, 26, 31, 33..."
                                />
                                <IconButton
                                  color="error"
                                  onClick={() => removeCovariate(index)}
                                  disabled={covariates.length <= 1}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </Paper>
                          ))}

                          <Alert severity="info" sx={{ mt: 2 }}>
                            <AlertTitle>ANCOVA Requirements</AlertTitle>
                            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                              <li>Covariates must be continuous variables measured before treatment</li>
                              <li>Total covariate observations must equal total group observations</li>
                              <li>Linear relationship between covariate and dependent variable is assumed</li>
                              <li>Homogeneity of regression slopes will be tested</li>
                            </ul>
                          </Alert>

                          {/* Homogeneity of slopes checkbox for ANCOVA */}
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={checkHomogeneitySlopes}
                                onChange={(e) => setCheckHomogeneitySlopes(e.target.checked)}
                              />
                            }
                            label="Check homogeneity of regression slopes assumption"
                            sx={{ mt: 2 }}
                          />
                        </Box>
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <ExampleDataLoader
                      testType="anova"
                      subType={anovaType === ANOVA_TYPES.ANCOVA ? 'ancova' : 'oneWay'}
                      onLoadData={handleLoadExampleData}
                      buttonText="Load Example Data"
                      buttonVariant="contained"
                      buttonSize="medium"
                    />
                    <Button
                      variant="text"
                      startIcon={<ClearIcon />}
                      onClick={() => {
                        setGroups([
                          { name: 'Group 1', data: '' },
                          { name: 'Group 2', data: '' },
                          { name: 'Group 3', data: '' }
                        ]);
                        setCovariates([
                          { name: 'Covariate 1', data: '' }
                        ]);
                        setResults(null);
                        setAssumptions(null);
                        setPostHocResults(null);
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

          {/* ANOVA Configuration Tab */}
          {activeTab === 1 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>ANOVA Type</InputLabel>
                    <Select
                      value={anovaType}
                      onChange={(e) => setAnovaType(e.target.value)}
                      label="ANOVA Type"
                    >
                      <MenuItem value={ANOVA_TYPES.ONE_WAY}>One-Way ANOVA</MenuItem>
                      <MenuItem value={ANOVA_TYPES.TWO_WAY}>Two-Way ANOVA</MenuItem>
                      <MenuItem value={ANOVA_TYPES.REPEATED_MEASURES}>Repeated Measures ANOVA</MenuItem>
                      <MenuItem value={ANOVA_TYPES.ANCOVA}>ANCOVA (Covariate Adjustment)</MenuItem>
                      <MenuItem value={ANOVA_TYPES.MANOVA} disabled>MANOVA (Coming Soon)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Dependent Variable Name"
                    value={dependentVariable}
                    onChange={(e) => setDependentVariable(e.target.value)}
                    helperText="Name of the variable being measured"
                  />
                </Grid>

                {anovaType === ANOVA_TYPES.TWO_WAY && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Factor 1 Name"
                        value={factor1Name}
                        onChange={(e) => setFactor1Name(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Factor 2 Name"
                        value={factor2Name}
                        onChange={(e) => setFactor2Name(e.target.value)}
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
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
              </Grid>
            </Box>
          )}

          {/* Post-Hoc & Options Tab */}
          {activeTab === 2 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Post-Hoc Tests
                  </Typography>
                  <FormGroup>
                    {POST_HOC_TESTS.map(test => (
                      <FormControlLabel
                        key={test.value}
                        control={
                          <Checkbox
                            checked={selectedPostHoc.includes(test.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPostHoc(prev => [...prev, test.value]);
                              } else {
                                setSelectedPostHoc(prev => prev.filter(t => t !== test.value));
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">{test.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {test.description}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Multiple Comparison Correction</InputLabel>
                    <Select
                      value={correctionMethod}
                      onChange={(e) => setCorrectionMethod(e.target.value)}
                      label="Multiple Comparison Correction"
                    >
                      {CORRECTION_METHODS.map(method => (
                        <MenuItem key={method.value} value={method.value}>
                          {method.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={checkAssumptions}
                          onChange={(e) => setCheckAssumptions(e.target.checked)}
                        />
                      }
                      label="Check assumptions (normality, homogeneity of variance)"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={calculateEffectSizes}
                          onChange={(e) => setCalculateEffectSizes(e.target.checked)}
                        />
                      }
                      label="Calculate effect sizes (η², ω²)"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={generateVisualizations}
                          onChange={(e) => setGenerateVisualizations(e.target.checked)}
                        />
                      }
                      label="Generate visualizations"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Help & Information Tab */}
          {activeTab === 3 && (
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    <InfoIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: '1.2rem' }} />
                    About ANOVA
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    Analysis of Variance (ANOVA) tests whether there are significant differences between the means of three or more groups.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>One-Way ANOVA:</strong> Tests differences across one factor (e.g., treatment groups).
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Two-Way ANOVA:</strong> Tests main effects of two factors and their interaction.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Repeated Measures:</strong> Tests differences when the same subjects are measured multiple times.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: '1.2rem' }} />
                    Interpreting Results
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    <strong>F-statistic:</strong> Ratio of between-group variance to within-group variance. Larger values suggest differences between groups.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>p-value:</strong> Probability of observing these results if all groups have equal means. Small p-values ({"<"}0.05) suggest significant differences.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Effect Sizes:</strong>
                    <br />• η² (Eta-squared): 0.01 = small, 0.06 = medium, 0.14 = large
                    <br />• ω² (Omega-squared): More conservative, less biased estimate
                  </Typography>
                  <Typography variant="body2">
                    <strong>Post-hoc tests:</strong> If ANOVA is significant, post-hoc tests identify which specific groups differ.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>50 Decimal Precision</AlertTitle>
                All ANOVA calculations, including F-statistics, p-values, and effect sizes, are computed with 50 decimal place precision. This ensures maximum accuracy for research and publication.
              </Alert>
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
              onClick={performANOVA}
              disabled={loading}
            >
              {loading ? 'Calculating...' : 'Perform ANOVA'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Results sections */}
      {results && renderResults()}
      {assumptions && renderAssumptions()}
      {postHocResults && renderPostHocResults()}

      {/* Loading overlay */}
      {loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Performing high-precision ANOVA calculations...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ANOVACalculator;