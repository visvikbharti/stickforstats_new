/**
 * NonParametricTestsReal Component - Professional UI Version
 * ===========================================================
 * Real backend integration for non-parametric statistical tests
 * Now with Professional UI featuring dark mode, gradients, and glass effects
 *
 * THIS IS THE STANDARD IMPLEMENTATION - USE AS REFERENCE
 *
 * Features:
 * - Professional UI with dark mode toggle
 * - Glass morphism effects on cards
 * - Smooth animations
 * - Beautiful gradients
 * - 50-decimal precision backend
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  Chip,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Fade,
  Zoom,
  Grow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

import {
  Assessment as AssessmentIcon,
  Calculate as CalculateIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  DataUsage as DataUsageIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

// Import Professional Container for consistent UI
import ProfessionalContainer from '../components/common/ProfessionalContainer';

// Import the existing NonParametricTestsService which connects to backend
import { NonParametricTestsService } from '../services/NonParametricTestsService';

// Import real datasets
import { REAL_EXAMPLE_DATASETS } from '../data/RealExampleDatasets';

// Interactive "why non-parametric routing matters" lecture demo, backend-anchored
// to the real Guardian engine (reproduces the Fig 8 cascade calibration benchmark).
import { GuardianCascadeSimulator } from '../components/statistical/educational';

const NonParametricTestsRealProfessional = () => {
  // State management
  const [selectedTest, setSelectedTest] = useState('mann-whitney');
  const [dataGroups, setDataGroups] = useState([]);
  const [pairedData, setPairedData] = useState({ before: [], after: [] });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendPrecision, setBackendPrecision] = useState(50);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [animationKey, setAnimationKey] = useState(0);
  const [postHoc, setPostHoc] = useState(null);
  const [postHocLoading, setPostHocLoading] = useState(false);

  // Guardian hand-off: a parametric module (t-test / ANOVA) can navigate here
  // with the user's data + a pre-selected test via react-router location.state.
  const location = useLocation();
  const pendingHandoffRef = useRef(
    location.state && location.state.fromGuardian ? location.state : null
  );
  const [pendingAutoRun, setPendingAutoRun] = useState(false);

  // Service instance
  const service = new NonParametricTestsService();

  // Test configurations with icons
  const testConfigs = {
    'mann-whitney': {
      name: 'Mann-Whitney U Test',
      description: 'Compare two independent samples (non-parametric)',
      dataType: 'independent',
      minGroups: 2,
      maxGroups: 2,
      icon: <BarChartIcon />,
      color: 'primary'
    },
    'wilcoxon': {
      name: 'Wilcoxon Signed-Rank Test',
      description: 'Compare paired samples (non-parametric)',
      dataType: 'paired',
      minGroups: 2,
      maxGroups: 2,
      icon: <TrendingUpIcon />,
      color: 'success'
    },
    'kruskal-wallis': {
      name: 'Kruskal-Wallis Test',
      description: 'Compare 3+ independent groups (non-parametric ANOVA)',
      dataType: 'independent',
      minGroups: 3,
      maxGroups: null,
      icon: <DataUsageIcon />,
      color: 'info'
    },
    'friedman': {
      name: 'Friedman Test',
      description: 'Compare 3+ related samples (repeated measures)',
      dataType: 'repeated',
      minGroups: 3,
      maxGroups: null,
      icon: <TimelineIcon />,
      color: 'warning'
    }
  };

  // Load example data based on test type
  const loadExampleData = useCallback(() => {
    setAnimationKey(prev => prev + 1); // Trigger re-animation

    if (selectedTest === 'mann-whitney') {
      const dataset = REAL_EXAMPLE_DATASETS.medical.bloodPressure;
      setDataGroups([
        { name: 'Control', values: dataset.control },
        { name: 'Treatment', values: dataset.treatment }
      ]);
      setSelectedDataset(dataset.name);
    } else if (selectedTest === 'wilcoxon') {
      const dataset = REAL_EXAMPLE_DATASETS.medical.cholesterol;
      setPairedData({
        before: dataset.before,
        after: dataset.after
      });
      setSelectedDataset(dataset.name);
    } else if (selectedTest === 'kruskal-wallis') {
      const dataset = REAL_EXAMPLE_DATASETS.medical.hemoglobin;
      setDataGroups([
        { name: 'Placebo', values: dataset.placebo },
        { name: 'Iron Only', values: dataset.ironOnly },
        { name: 'Iron + Vit C', values: dataset.ironPlusVitC }
      ]);
      setSelectedDataset(dataset.name);
    } else if (selectedTest === 'friedman') {
      const dataset = REAL_EXAMPLE_DATASETS.education.satScores;
      setDataGroups([
        { name: 'Self Study', values: dataset.selfStudy },
        { name: 'Online Course', values: dataset.onlineCourse },
        { name: 'In-Person', values: dataset.inPersonTutoring }
      ]);
      setSelectedDataset(dataset.name);
    }
  }, [selectedTest]);

  // Seed the module's data. If we arrived from a Guardian hand-off, hydrate the
  // user's data + pre-selected test instead of loading example data (and never
  // let the example loader clobber the injected data).
  useEffect(() => {
    const handoff = pendingHandoffRef.current;
    if (handoff) {
      // First align selectedTest, then apply the data on the follow-up run so
      // the data lands under the correct test config.
      if (handoff.selectedTest && handoff.selectedTest !== selectedTest) {
        setSelectedTest(handoff.selectedTest);
        return;
      }
      pendingHandoffRef.current = null; // consume once
      if (handoff.dataGroups) setDataGroups(handoff.dataGroups);
      if (handoff.pairedData) setPairedData(handoff.pairedData);
      setSelectedDataset(handoff.datasetLabel || 'Imported from your parametric test');
      if (handoff.autoRun) setPendingAutoRun(true);
      return;
    }
    loadExampleData();
  }, [selectedTest, loadExampleData]);

  // Perform test using backend service
  const performTest = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      switch (selectedTest) {
        case 'mann-whitney':
          response = await service.mannWhitneyU(
            dataGroups[0].values,
            dataGroups[1].values,
            {
              alternative: 'two-sided',
              use_continuity: true,
              include_effect_size: true,
              include_descriptive_stats: true
            }
          );
          break;

        case 'wilcoxon':
          response = await service.wilcoxonSignedRank(
            pairedData.before,
            pairedData.after,
            {
              alternative: 'two-sided',
              correction: true,
              include_effect_size: true,
              include_hodges_lehmann: true
            }
          );
          break;

        case 'kruskal-wallis':
          response = await service.kruskalWallis(
            dataGroups.map(g => g.values),
            {
              group_names: dataGroups.map(g => g.name),
              tie_correction: true,
              include_effect_size: true,
              include_descriptive_stats: true,
              include_post_hoc: true,
              post_hoc_method: 'dunn'
            }
          );
          break;

        case 'friedman':
          const blockedData = [];
          const maxLength = Math.max(...dataGroups.map(g => g.values.length));
          for (let i = 0; i < maxLength; i++) {
            const block = dataGroups.map(g => g.values[i] || null).filter(v => v !== null);
            if (block.length === dataGroups.length) {
              blockedData.push(block);
            }
          }

          response = await service.friedmanTest(
            blockedData,
            {
              condition_names: dataGroups.map(g => g.name),
              include_effect_size: true,
              include_post_hoc: true,
              post_hoc_method: 'nemenyi',
              include_kendalls_w: true
            }
          );
          break;

        default:
          throw new Error(`Test ${selectedTest} not implemented`);
      }

      response.testName = testConfigs[selectedTest].name;
      response.testType = selectedTest;

      if (response.precision) {
        setBackendPrecision(response.precision);
      }

      setResults(response);

      // Post-hoc pairwise comparisons are only meaningful for 3+ group tests.
      // Kruskal-Wallis -> Dunn's test (verified endpoint). Reset otherwise.
      setPostHoc(null);
      if (selectedTest === 'kruskal-wallis') {
        runPostHoc(dataGroups.map((g) => g.values));
      }

    } catch (err) {
      console.error('Test error:', err);
      setError(err.message || 'Failed to perform test');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-run the test once the Guardian-injected data is present in state.
  useEffect(() => {
    if (!pendingAutoRun) return;
    const ready = testConfigs[selectedTest]?.dataType === 'paired'
      ? (pairedData.before.length > 0 && pairedData.after.length > 0)
      : (dataGroups.length > 0 && dataGroups.every((g) => g.values && g.values.length > 0));
    if (ready) {
      setPendingAutoRun(false);
      performTest();
    }
    // performTest is redefined every render; we only want to fire when the
    // injected data becomes ready, so it is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoRun, dataGroups, pairedData, selectedTest]);

  // Format number with precision
  const formatNumber = (value, precision = 6) => {
    if (value === null || value === undefined) return 'N/A';

    // Resolve to a plain JS number when possible (handles numbers, numeric
    // strings, and Decimal.js-like objects that expose toString()).
    let num;
    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      num = parseFloat(value);
      if (isNaN(num)) return value;
    } else if (value && typeof value.toString === 'function') {
      num = Number(value.toString());
      if (isNaN(num)) {
        return typeof value.toFixed === 'function' ? value.toFixed(precision) : String(value);
      }
    } else {
      return String(value);
    }

    // Scientific notation only for very small NON-ZERO magnitudes, so negative
    // effect sizes (e.g. -0.3) stay decimals and tiny numeric post-hoc p-values
    // (e.g. 3e-7) don't collapse to "0.0000".
    if (num !== 0 && Math.abs(num) < 0.0001) {
      return num.toExponential(precision);
    }
    return num.toFixed(precision);
  };

  // ---- Descriptive statistics (computed locally from the input data) ----
  const quantile = (sorted, q) => {
    if (!sorted.length) return NaN;
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  };

  const describe = (values) => {
    const arr = (values || [])
      .filter((v) => typeof v === 'number' && !isNaN(v))
      .slice()
      .sort((a, b) => a - b);
    const n = arr.length;
    if (!n) return null;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const sd = n > 1
      ? Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
      : 0;
    const q1 = quantile(arr, 0.25);
    const q3 = quantile(arr, 0.75);
    return { n, mean, median: quantile(arr, 0.5), sd, min: arr[0], q1, q3, max: arr[n - 1], iqr: q3 - q1 };
  };

  // The groups shown in the Descriptives tab (paired tests use before/after).
  const descriptiveGroups = () =>
    testConfigs[selectedTest].dataType === 'paired'
      ? [
          { name: 'Before / Group 1', values: pairedData.before },
          { name: 'After / Group 2', values: pairedData.after },
        ]
      : dataGroups;

  // ---- Effect-size metadata per test ----
  const effectSizeInfo = (testType) => {
    switch (testType) {
      case 'mann-whitney':
        return { name: 'Rank-biserial correlation (r)', kind: 'r', noun: 'effect' };
      case 'wilcoxon':
        return { name: 'Matched-pairs rank-biserial (r)', kind: 'r', noun: 'effect' };
      case 'kruskal-wallis':
        return { name: 'Epsilon-squared (ε²)', kind: 'variance', noun: 'effect' };
      case 'friedman':
        return { name: "Kendall's W", kind: 'concordance', noun: 'agreement' };
      default:
        return { name: 'Effect size', kind: 'variance', noun: 'effect' };
    }
  };

  const magnitudeLabel = (value, kind) => {
    const a = Math.abs(Number(value));
    if (isNaN(a)) return null;
    if (kind === 'r') {
      // Cohen's conventions for correlation-family effect sizes
      if (a < 0.1) return 'negligible';
      if (a < 0.3) return 'small';
      if (a < 0.5) return 'medium';
      return 'large';
    }
    if (kind === 'concordance') {
      // Kendall's W (coefficient of concordance, [0,1]) — matches the backend's
      // own interpretation thresholds so the chip can't contradict the text.
      if (a < 0.1) return 'very weak';
      if (a < 0.3) return 'weak';
      if (a < 0.5) return 'moderate';
      if (a < 0.7) return 'strong';
      return 'very strong';
    }
    // variance-explained family (ε²): eta-squared-like conventions
    if (a < 0.01) return 'negligible';
    if (a < 0.06) return 'small';
    if (a < 0.14) return 'medium';
    return 'large';
  };

  // ---- Post-hoc pairwise comparisons (separate backend endpoint) ----
  const runPostHoc = async (groups) => {
    try {
      setPostHocLoading(true);
      const ph = await service.dunnsTest(groups, { p_adjust_method: 'bonferroni' });
      setPostHoc(ph);
    } catch (e) {
      setPostHoc({ error: e?.message || 'Post-hoc comparison failed' });
    } finally {
      setPostHocLoading(false);
    }
  };

  // Reset calculator
  const resetCalculator = () => {
    setResults(null);
    setError(null);
    setPostHoc(null);
    loadExampleData();
  };

  // Render data input section with professional styling
  const renderDataInput = () => (
    <Zoom in timeout={600} key={`input-${animationKey}`}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DataUsageIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Data Input
            </Typography>
            {selectedDataset && (
              <Grow in>
                <Chip
                  label={`Dataset: ${selectedDataset}`}
                  size="small"
                  color="primary"
                  sx={{ ml: 'auto' }}
                />
              </Grow>
            )}
          </Box>

          {testConfigs[selectedTest].dataType === 'paired' ? (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Before/Group 1"
                  value={pairedData.before.join('\n')}
                  onChange={(e) => {
                    const values = e.target.value.split('\n').map(v => parseFloat(v)).filter(v => !isNaN(v));
                    setPairedData({ ...pairedData, before: values });
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="After/Group 2"
                  value={pairedData.after.join('\n')}
                  onChange={(e) => {
                    const values = e.target.value.split('\n').map(v => parseFloat(v)).filter(v => !isNaN(v));
                    setPairedData({ ...pairedData, after: values });
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2}>
              {dataGroups.map((group, index) => (
                <Grid item xs={12 / Math.min(dataGroups.length, 3)} key={index}>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    label={group.name}
                    value={group.values.join('\n')}
                    onChange={(e) => {
                      const values = e.target.value.split('\n').map(v => parseFloat(v)).filter(v => !isNaN(v));
                      const newGroups = [...dataGroups];
                      newGroups[index] = { ...group, values };
                      setDataGroups(newGroups);
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={performTest}
              disabled={loading}
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
            <Button
              variant="outlined"
              onClick={loadExampleData}
              startIcon={<CloudUploadIcon />}
            >
              Load Example Data
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );

  // Render results section with professional styling
  const renderResults = () => {
    if (!results) return null;

    return (
      <Fade in timeout={800}>
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Test Results: {results.testName}
              </Typography>
              <Chip
                label={`${backendPrecision}-decimal precision`}
                color="success"
                icon={<CheckCircleIcon />}
                sx={{
                  fontWeight: 600,
                }}
              />
            </Box>

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="Main Results" />
              <Tab label="Effect Sizes" />
              <Tab label="Post-hoc" />
              <Tab label="Descriptives" />
            </Tabs>

            {/* Main Results Tab */}
            {activeTab === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Zoom in timeout={600}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Test Statistic
                      </Typography>
                      <Typography variant="h3" sx={{
                        color: 'primary.main',
                        fontWeight: 700
                      }}>
                        {formatNumber(results.statistic || results.u_statistic || results.w_statistic || results.h_statistic || results.chi_squared)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedTest === 'mann-whitney' && 'U statistic'}
                        {selectedTest === 'wilcoxon' && 'W statistic'}
                        {selectedTest === 'kruskal-wallis' && 'H statistic'}
                        {selectedTest === 'friedman' && 'Chi-squared statistic'}
                      </Typography>
                    </Paper>
                  </Zoom>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Zoom in timeout={800}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Statistical Significance
                      </Typography>
                      <Typography variant="body1">
                        p-value: <strong>{formatNumber(results.p_value, 8)}</strong>
                      </Typography>
                      <Alert
                        severity={results.p_value < 0.05 ? 'success' : 'info'}
                        sx={{ mt: 2 }}
                      >
                        {results.p_value < 0.05
                          ? 'Result is statistically significant (p < 0.05)'
                          : 'Result is not statistically significant (p ≥ 0.05)'}
                      </Alert>
                    </Paper>
                  </Zoom>
                </Grid>

                {/* High Precision Display */}
                <Grid item xs={12}>
                  <Grow in timeout={1000}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        High Precision Values ({backendPrecision}-decimal backend)
                      </Typography>
                      {[
                        { label: 'Test statistic', value: results.test_statistic },
                        { label: 'p-value', value: results.p_value },
                        { label: 'Effect size', value: results.effect_size },
                      ]
                        .filter((row) => row.value !== undefined && row.value !== null)
                        .map((row) => (
                          <Box key={row.label} sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {row.label}
                            </Typography>
                            <Typography sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              backgroundColor: 'action.hover',
                              p: 1,
                              borderRadius: 1,
                              wordBreak: 'break-all',
                            }}>
                              {String(row.value)}
                            </Typography>
                          </Box>
                        ))}
                    </Paper>
                  </Grow>
                </Grid>
              </Grid>
            )}

            {/* Effect Sizes Tab */}
            {activeTab === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Effect Size</Typography>
                    {results.effect_size !== undefined && results.effect_size !== null ? (
                      <>
                        <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>
                          {formatNumber(results.effect_size, 4)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {effectSizeInfo(selectedTest).name}
                        </Typography>
                        {magnitudeLabel(results.effect_size, effectSizeInfo(selectedTest).kind) && (
                          <Chip
                            size="small"
                            color="primary"
                            label={`${magnitudeLabel(results.effect_size, effectSizeInfo(selectedTest).kind)} ${effectSizeInfo(selectedTest).noun || 'effect'}`}
                            sx={{ mt: 1, textTransform: 'capitalize' }}
                          />
                        )}
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                          Full precision:
                        </Typography>
                        <Typography sx={{
                          fontFamily: 'monospace', fontSize: '0.78rem',
                          backgroundColor: 'action.hover', p: 1, borderRadius: 1, wordBreak: 'break-all'
                        }}>
                          {String(results.effect_size)}
                        </Typography>
                      </>
                    ) : (
                      <Alert severity="info">No effect size was returned for this test.</Alert>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Interpretation</Typography>
                    <Typography variant="body2">{results.interpretation || 'N/A'}</Typography>
                    {Array.isArray(results.recommendations) && results.recommendations.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Divider sx={{ mb: 1 }} />
                        <Typography variant="subtitle2" gutterBottom>Recommendations</Typography>
                        {results.recommendations.map((r, i) => (
                          <Typography key={i} variant="body2" color="text.secondary">• {r}</Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Grid>
                {(results.mean_ranks || results.sum_ranks) && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Rank summary</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>{selectedTest === 'wilcoxon' ? 'Rank sign' : 'Group'}</TableCell>
                              {results.mean_ranks && <TableCell align="right">Mean rank</TableCell>}
                              {results.sum_ranks && <TableCell align="right">Sum of ranks</TableCell>}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.keys(results.mean_ranks || results.sum_ranks).map((k) => (
                              <TableRow key={k}>
                                <TableCell sx={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</TableCell>
                                {results.mean_ranks && (
                                  <TableCell align="right">{formatNumber(results.mean_ranks[k], 2)}</TableCell>
                                )}
                                {results.sum_ranks && (
                                  <TableCell align="right">{formatNumber(results.sum_ranks[k], 2)}</TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Post-hoc Tab */}
            {activeTab === 2 && (
              <Box>
                {(selectedTest === 'mann-whitney' || selectedTest === 'wilcoxon') ? (
                  <Alert severity="info">
                    Post-hoc pairwise comparisons apply to tests with three or more groups.
                    This test already compares exactly two samples, so the main result above <em>is</em> the
                    pairwise comparison.
                  </Alert>
                ) : selectedTest === 'friedman' ? (
                  <Alert severity="info">
                    Automated post-hoc (Nemenyi) for the Friedman test is not yet wired into this view.
                    The omnibus result above tells you whether the conditions differ overall.
                  </Alert>
                ) : postHocLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Running Dunn's pairwise comparisons…</Typography>
                  </Box>
                ) : postHoc && postHoc.error ? (
                  <Alert severity="warning">Post-hoc comparison unavailable: {postHoc.error}</Alert>
                ) : postHoc && Array.isArray(postHoc.comparisons) ? (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Dunn's test — pairwise comparisons ({postHoc.correction_method || 'bonferroni'}-adjusted)
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Comparison</TableCell>
                            <TableCell align="right">Mean rank diff</TableCell>
                            <TableCell align="right">z</TableCell>
                            <TableCell align="right">p (raw)</TableCell>
                            <TableCell align="right">p (adjusted)</TableCell>
                            <TableCell align="center">Significant</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {postHoc.comparisons.map((c) => (
                            <TableRow key={c.label}>
                              <TableCell sx={{ textTransform: 'capitalize' }}>{c.label}</TableCell>
                              <TableCell align="right">{formatNumber(c.mean_rank_diff, 2)}</TableCell>
                              <TableCell align="right">{formatNumber(c.z_statistic, 3)}</TableCell>
                              <TableCell align="right">{formatNumber(c.p_value, 4)}</TableCell>
                              <TableCell align="right">{formatNumber(c.adjusted_p_value, 4)}</TableCell>
                              <TableCell align="center">
                                {c.significant
                                  ? <Chip size="small" color="success" label="Yes" />
                                  : <Chip size="small" variant="outlined" label="No" />}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                ) : (
                  <Alert severity="info">Run the test to compute pairwise comparisons.</Alert>
                )}
              </Box>
            )}

            {/* Descriptives Tab */}
            {activeTab === 3 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Descriptive statistics (computed from the input data)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Group</TableCell>
                        <TableCell align="right">n</TableCell>
                        <TableCell align="right">Mean</TableCell>
                        <TableCell align="right">Median</TableCell>
                        <TableCell align="right">SD</TableCell>
                        <TableCell align="right">Min</TableCell>
                        <TableCell align="right">Q1</TableCell>
                        <TableCell align="right">Q3</TableCell>
                        <TableCell align="right">Max</TableCell>
                        <TableCell align="right">IQR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {descriptiveGroups().map((g) => {
                        const d = describe(g.values);
                        return (
                          <TableRow key={g.name}>
                            <TableCell>{g.name}</TableCell>
                            {d ? (
                              <>
                                <TableCell align="right">{d.n}</TableCell>
                                <TableCell align="right">{formatNumber(d.mean, 3)}</TableCell>
                                <TableCell align="right">{formatNumber(d.median, 3)}</TableCell>
                                <TableCell align="right">{formatNumber(d.sd, 3)}</TableCell>
                                <TableCell align="right">{formatNumber(d.min, 3)}</TableCell>
                                <TableCell align="right">{formatNumber(d.q1, 3)}</TableCell>
                                <TableCell align="right">{formatNumber(d.q3, 3)}</TableCell>
                                <TableCell align="right">{formatNumber(d.max, 3)}</TableCell>
                                <TableCell align="right">{formatNumber(d.iqr, 3)}</TableCell>
                              </>
                            ) : (
                              <TableCell colSpan={9} align="center">No numeric data</TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Non-parametric tests rank the data; means and SD are shown for context only.
                </Typography>
              </Paper>
            )}
          </CardContent>
        </Card>
      </Fade>
    );
  };

  // Main component render with ProfessionalContainer
  return (
    <ProfessionalContainer
      title={
        <Typography variant="h4" sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AssessmentIcon sx={{ mr: 2, fontSize: 40 }} />
          Non-Parametric Tests
          <Chip
            label="Professional UI"
            color="secondary"
            size="small"
            sx={{ ml: 2 }}
          />
        </Typography>
      }
      gradient="primary"
      enableGlassMorphism={true}
    >
      <Typography variant="body1" color="text.secondary" paragraph align="center">
        Distribution-free statistical tests powered by high-precision backend calculations.
        All calculations performed with 50-decimal precision using real datasets.
      </Typography>

      {/* Why non-parametric? — interactive Guardian cascade lecture demo */}
      <Accordion sx={{ mb: 3 }} defaultExpanded={false} TransitionProps={{ unmountOnExit: true }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Why one t-test isn&rsquo;t enough — interactive Guardian cascade
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <GuardianCascadeSimulator />
        </AccordionDetails>
      </Accordion>

      {error && (
        <Fade in>
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
          >
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        </Fade>
      )}

      {/* Test Selection with glass effect */}
      <Zoom in timeout={400}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {testConfigs[selectedTest].icon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                Select Test
              </Typography>
            </Box>

            <FormControl fullWidth>
              <InputLabel>Non-Parametric Test</InputLabel>
              <Select
                value={selectedTest}
                onChange={(e) => {
                  setSelectedTest(e.target.value);
                  setResults(null);
                  setError(null);
                }}
                label="Non-Parametric Test"
              >
                {Object.entries(testConfigs).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {config.icon}
                      <Box sx={{ ml: 2 }}>
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

            <Alert
              severity="info"
              sx={{ mt: 2 }}
            >
              <AlertTitle>{testConfigs[selectedTest].name}</AlertTitle>
              {testConfigs[selectedTest].description}
            </Alert>
          </CardContent>
        </Card>
      </Zoom>

      {/* Data Input */}
      {renderDataInput()}

      {/* Results */}
      {renderResults()}
    </ProfessionalContainer>
  );
};

export default NonParametricTestsRealProfessional;