/**
 * NonParametricTestsReal Component - Backend Integration
 * ========================================================
 * Real backend integration for non-parametric statistical tests
 * Uses high-precision backend API (50-decimal precision)
 *
 * Features:
 * - Mann-Whitney U test with real backend
 * - Wilcoxon signed-rank test with real backend
 * - Kruskal-Wallis test with real backend
 * - Friedman test with real backend
 * - Real example datasets from studies
 * - 50-decimal precision display
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Divider
} from '@mui/material';

import {
  Assessment as AssessmentIcon,
  Calculate as CalculateIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

// Import the existing NonParametricTestsService which connects to backend
import { NonParametricTestsService } from '../services/NonParametricTestsService';

// Import real datasets
import { REAL_EXAMPLE_DATASETS } from '../data/RealExampleDatasets';

const NonParametricTestsReal = () => {
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

  // Service instance
  const service = new NonParametricTestsService();

  // Test configurations (simplified)
  const testConfigs = {
    'mann-whitney': {
      name: 'Mann-Whitney U Test',
      description: 'Compare two independent samples (non-parametric)',
      dataType: 'independent',
      minGroups: 2,
      maxGroups: 2
    },
    'wilcoxon': {
      name: 'Wilcoxon Signed-Rank Test',
      description: 'Compare paired samples (non-parametric)',
      dataType: 'paired',
      minGroups: 2,
      maxGroups: 2
    },
    'kruskal-wallis': {
      name: 'Kruskal-Wallis Test',
      description: 'Compare 3+ independent groups (non-parametric ANOVA)',
      dataType: 'independent',
      minGroups: 3,
      maxGroups: null
    },
    'friedman': {
      name: 'Friedman Test',
      description: 'Compare 3+ related samples (repeated measures)',
      dataType: 'repeated',
      minGroups: 3,
      maxGroups: null
    }
  };

  // Load example data based on test type
  const loadExampleData = useCallback(() => {
    const test = testConfigs[selectedTest];

    if (selectedTest === 'mann-whitney') {
      // Use blood pressure data for Mann-Whitney
      const dataset = REAL_EXAMPLE_DATASETS.medical.bloodPressure;
      setDataGroups([
        { name: 'Control', values: dataset.control },
        { name: 'Treatment', values: dataset.treatment }
      ]);
      setSelectedDataset(dataset.name);
    } else if (selectedTest === 'wilcoxon') {
      // Use cholesterol before/after for Wilcoxon
      const dataset = REAL_EXAMPLE_DATASETS.medical.cholesterol;
      setPairedData({
        before: dataset.before,
        after: dataset.after
      });
      setSelectedDataset(dataset.name);
    } else if (selectedTest === 'kruskal-wallis') {
      // Use hemoglobin data for Kruskal-Wallis
      const dataset = REAL_EXAMPLE_DATASETS.medical.hemoglobin;
      setDataGroups([
        { name: 'Placebo', values: dataset.placebo },
        { name: 'Iron Only', values: dataset.ironOnly },
        { name: 'Iron + Vit C', values: dataset.ironPlusVitC }
      ]);
      setSelectedDataset(dataset.name);
    } else if (selectedTest === 'friedman') {
      // Use SAT scores for Friedman (repeated measures)
      const dataset = REAL_EXAMPLE_DATASETS.education.satScores;
      // Transform to repeated measures format
      const repeatedData = [];
      for (let i = 0; i < dataset.selfStudy.length; i++) {
        repeatedData.push([
          dataset.selfStudy[i],
          dataset.onlineCourse[i],
          dataset.inPersonTutoring[i]
        ]);
      }
      setDataGroups([
        { name: 'Self Study', values: dataset.selfStudy },
        { name: 'Online Course', values: dataset.onlineCourse },
        { name: 'In-Person', values: dataset.inPersonTutoring }
      ]);
      setSelectedDataset(dataset.name);
    }
  }, [selectedTest]);

  // Load example data when test changes
  useEffect(() => {
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
          // Transform data for Friedman test
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

      // Add test metadata and precision info
      response.testName = testConfigs[selectedTest].name;
      response.testType = selectedTest;

      // Extract precision from response if available
      if (response.precision) {
        setBackendPrecision(response.precision);
      }

      setResults(response);

    } catch (err) {
      console.error('Test error:', err);
      setError(err.message || 'Failed to perform test');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Format number with precision
  const formatNumber = (value, precision = 6) => {
    if (value === null || value === undefined) return 'N/A';

    // Handle Decimal objects
    if (value.toFixed) {
      return value.toFixed(precision);
    }

    // Handle strings
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        if (num < 0.0001) {
          return num.toExponential(precision);
        }
        return num.toFixed(precision);
      }
      return value;
    }

    // Handle numbers
    if (typeof value === 'number') {
      if (value < 0.0001) {
        return value.toExponential(precision);
      }
      return value.toFixed(precision);
    }

    return value.toString();
  };

  // Reset calculator
  const resetCalculator = () => {
    setResults(null);
    setError(null);
    loadExampleData();
  };

  // Render data input section
  const renderDataInput = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Data Input
          {selectedDataset && (
            <Chip
              label={`Dataset: ${selectedDataset}`}
              size="small"
              color="primary"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>

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
                />
              </Grid>
            ))}
          </Grid>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
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
  );

  // Render results section
  const renderResults = () => {
    if (!results) return null;

    return (
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
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Test Statistic
                  </Typography>
                  <Typography variant="h3" color="primary">
                    {formatNumber(results.statistic || results.u_statistic || results.w_statistic || results.h_statistic || results.chi_squared)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedTest === 'mann-whitney' && 'U statistic'}
                    {selectedTest === 'wilcoxon' && 'W statistic'}
                    {selectedTest === 'kruskal-wallis' && 'H statistic'}
                    {selectedTest === 'friedman' && 'Chi-squared statistic'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
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
              </Grid>

              {results.confidence_interval && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      95% Confidence Interval
                    </Typography>
                    <Typography variant="body1">
                      [{formatNumber(results.confidence_interval.lower || results.confidence_interval[0])},
                       {formatNumber(results.confidence_interval.upper || results.confidence_interval[1])}]
                    </Typography>
                    {results.hodges_lehmann_estimate && (
                      <Typography variant="caption" color="text.secondary">
                        Hodges-Lehmann Estimate: {formatNumber(results.hodges_lehmann_estimate)}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              )}

              {/* Display full precision values */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    High Precision Values (50 decimals)
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {results.statistic_display || results.statistic || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Effect Sizes Tab */}
          {activeTab === 1 && (
            <Box>
              {results.effect_size !== undefined && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Effect Size
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(results.effect_size, 4)}
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
                </Paper>
              )}

              {results.kendalls_w !== undefined && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Kendall's W
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(results.kendalls_w, 4)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Agreement coefficient (0 = no agreement, 1 = perfect agreement)
                  </Typography>
                </Paper>
              )}

              {results.epsilon_squared !== undefined && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Epsilon Squared
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(results.epsilon_squared, 4)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Proportion of variance explained
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* Post-hoc Tab */}
          {activeTab === 2 && results.post_hoc && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Post-hoc comparisons using {results.post_hoc.method || 'Dunn\'s test'}
              </Alert>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Comparison</TableCell>
                      <TableCell align="right">Statistic</TableCell>
                      <TableCell align="right">p-value</TableCell>
                      <TableCell align="right">Adjusted p-value</TableCell>
                      <TableCell align="center">Significant</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.post_hoc.comparisons && results.post_hoc.comparisons.map((comp, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{comp.group1} vs {comp.group2}</TableCell>
                        <TableCell align="right">{formatNumber(comp.statistic, 4)}</TableCell>
                        <TableCell align="right">{formatNumber(comp.p_value, 6)}</TableCell>
                        <TableCell align="right">
                          {comp.adjusted_p_value ? formatNumber(comp.adjusted_p_value, 6) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {comp.significant || comp.p_value < 0.05 ? (
                            <CheckCircleIcon color="success" />
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Descriptives Tab */}
          {activeTab === 3 && results.descriptives && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Group</TableCell>
                    <TableCell align="right">N</TableCell>
                    <TableCell align="right">Median</TableCell>
                    <TableCell align="right">Mean</TableCell>
                    <TableCell align="right">SD</TableCell>
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
                      <TableCell align="right">{formatNumber(stats.min)}</TableCell>
                      <TableCell align="right">{formatNumber(stats.max)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Non-Parametric Tests (Real Backend)
        <Chip
          label="50-decimal precision"
          color="success"
          size="small"
          sx={{ ml: 2 }}
        />
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Distribution-free statistical tests powered by high-precision backend calculations.
        All calculations performed with 50-decimal precision using real datasets from published studies.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Test Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Test
          </Typography>

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
                  <Box>
                    <Typography>{config.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {config.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle>{testConfigs[selectedTest].name}</AlertTitle>
            {testConfigs[selectedTest].description}
          </Alert>
        </CardContent>
      </Card>

      {/* Data Input */}
      {renderDataInput()}

      {/* Results */}
      {renderResults()}
    </Box>
  );
};

export default NonParametricTestsReal;