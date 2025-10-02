/**
 * PowerAnalysisReal Component - Professional UI Version
 * ======================================================
 * Real backend integration for statistical power analysis
 * Now with Professional UI featuring dark mode, gradients, and glass effects
 *
 * Features:
 * - Professional UI with dark mode toggle
 * - Glass morphism effects
 * - Smooth animations
 * - Power calculation for various test types
 * - Sample size determination
 * - Effect size calculation
 * - Real-world example scenarios
 * - 50-decimal precision calculations
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
  Slider,
  FormControlLabel,
  RadioGroup,
  Radio,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Fade,
  Zoom,
  Grow,
  alpha
} from '@mui/material';

import {
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Science as ScienceIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

// Import Professional Container for consistent UI
import ProfessionalContainer, { glassMorphism, gradients } from '../components/common/ProfessionalContainer';

// Import axios for backend calls
import axios from 'axios';

// Import real example scenarios
const POWER_SCENARIOS = {
  clinical: {
    name: "Clinical Trial",
    description: "Comparing new drug vs placebo",
    testType: "t_test",
    params: {
      alpha: 0.05,
      power: 0.80,
      effectSize: 0.5,  // Medium effect
      tails: 2,
      allocation: 1     // Equal allocation
    },
    context: "FDA requires 80% power for primary endpoints"
  },
  education: {
    name: "Educational Intervention",
    description: "Testing new teaching method effectiveness",
    testType: "t_test",
    params: {
      alpha: 0.05,
      power: 0.90,      // Higher power for educational policy
      effectSize: 0.3,  // Small-to-medium effect expected
      tails: 1,         // One-tailed (improvement expected)
      allocation: 1
    },
    context: "Department of Education recommends 90% power"
  },
  psychology: {
    name: "Psychology Experiment",
    description: "Studying cognitive performance differences",
    testType: "anova",
    params: {
      alpha: 0.05,
      power: 0.80,
      effectSize: 0.25,  // Medium effect (f)
      groups: 3,
      tails: 2
    },
    context: "APA guidelines suggest minimum 80% power"
  },
  marketing: {
    name: "A/B Testing",
    description: "Comparing conversion rates",
    testType: "proportion",
    params: {
      alpha: 0.05,
      power: 0.80,
      p1: 0.10,        // Baseline conversion rate
      p2: 0.12,        // Expected improvement
      allocation: 1
    },
    context: "Industry standard for online experiments"
  }
};

const PowerAnalysisReal = () => {
  // State management
  const [calculationMode, setCalculationMode] = useState('power'); // power, sampleSize, effectSize
  const [testType, setTestType] = useState('t_test');
  const [selectedScenario, setSelectedScenario] = useState('clinical');
  const [activeTab, setActiveTab] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  // Get dark mode state from local storage
  const [darkMode] = useState(() => {
    const saved = localStorage.getItem('professionalDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [parameters, setParameters] = useState({
    alpha: 0.05,
    power: 0.80,
    effectSize: 0.5,
    sampleSize: null,
    sampleSize1: null,
    sampleSize2: null,
    tails: 2,
    groups: 2,
    p1: 0.5,
    p2: 0.6,
    allocation: 1,
    correlation: 0.3
  });

  const [results, setResults] = useState(null);
  const [powerCurve, setPowerCurve] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendPrecision, setBackendPrecision] = useState(50);

  // API configuration
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Load scenario data
  const loadScenario = useCallback(() => {
    const scenario = POWER_SCENARIOS[selectedScenario];
    setTestType(scenario.testType);
    setParameters(prev => ({
      ...prev,
      ...scenario.params
    }));
  }, [selectedScenario]);

  useEffect(() => {
    loadScenario();
  }, [selectedScenario, loadScenario]);

  // Perform power calculation using backend
  const performCalculation = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = '';
      let requestData = {};

      // Prepare request based on calculation mode and test type
      if (calculationMode === 'power') {
        endpoint = `/api/v1/power/${testType === 't_test' ? 't-test' : testType}/`;
        requestData = {
          alpha: parameters.alpha,
          effect_size: parameters.effectSize,
          sample_size: parameters.sampleSize || 30,
          tails: parameters.tails,
          power_calculation: true
        };
      } else if (calculationMode === 'sampleSize') {
        endpoint = `/api/v1/power/sample-size/${testType === 't_test' ? 't-test' : testType}/`;
        requestData = {
          alpha: parameters.alpha,
          power: parameters.power,
          effect_size: parameters.effectSize,
          tails: parameters.tails
        };
      } else if (calculationMode === 'effectSize') {
        endpoint = `/api/v1/power/effect-size/${testType === 't_test' ? 't-test' : testType}/`;
        requestData = {
          alpha: parameters.alpha,
          power: parameters.power,
          sample_size: parameters.sampleSize || 30,
          tails: parameters.tails
        };
      }

      // Add test-specific parameters
      if (testType === 'anova') {
        requestData.groups = parameters.groups;
      } else if (testType === 'proportion') {
        requestData.p1 = parameters.p1;
        requestData.p2 = parameters.p2;
        requestData.allocation_ratio = parameters.allocation;
      } else if (testType === 'correlation') {
        requestData.correlation = parameters.correlation;
      }

      // Make API call
      const response = await axios.post(`${API_BASE}${endpoint}`, requestData);

      // Process results
      const result = response.data;

      // Extract precision if available
      if (result.precision) {
        setBackendPrecision(result.precision);
      }

      // Add calculation metadata
      result.calculationMode = calculationMode;
      result.testType = testType;
      result.scenario = POWER_SCENARIOS[selectedScenario];

      setResults(result);

      // Generate power curve if in power mode
      if (calculationMode === 'power') {
        generatePowerCurve();
      }

    } catch (err) {
      console.error('Calculation error:', err);
      setError(err.response?.data?.error || err.message || 'Calculation failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Generate power curve
  const generatePowerCurve = async () => {
    try {
      const curveData = [];
      const effectSizes = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0];

      for (const es of effectSizes) {
        const response = await axios.post(
          `${API_BASE}/api/v1/power/${testType === 't_test' ? 't-test' : testType}/`,
          {
            alpha: parameters.alpha,
            effect_size: es,
            sample_size: parameters.sampleSize || 30,
            tails: parameters.tails,
            power_calculation: true
          }
        );

        curveData.push({
          effectSize: es,
          power: response.data.power || response.data.calculated_power
        });
      }

      setPowerCurve(curveData);
    } catch (err) {
      console.error('Power curve generation error:', err);
    }
  };

  // Format number with precision
  const formatNumber = (value, precision = 6) => {
    if (value === null || value === undefined) return 'N/A';

    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toFixed(precision);
      }
      return value;
    }

    if (typeof value === 'number') {
      return value.toFixed(precision);
    }

    return value.toString();
  };

  // Reset calculator
  const resetCalculator = () => {
    setResults(null);
    setPowerCurve(null);
    setError(null);
    loadScenario();
  };

  // Render parameter inputs
  const renderParameterInputs = () => (
    <Fade in timeout={800}>
      <Card sx={{ ...glassMorphism[darkMode ? 'dark' : 'light'] }}>
        <CardContent>
        <Typography variant="h6" gutterBottom>
          Parameters
        </Typography>

        <Grid container spacing={2}>
          {/* Alpha Level */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Significance Level (α)"
              value={parameters.alpha}
              onChange={(e) => setParameters({ ...parameters, alpha: parseFloat(e.target.value) })}
              inputProps={{ min: 0.001, max: 0.1, step: 0.01 }}
              disabled={loading}
            />
          </Grid>

          {/* Power (when not calculating power) */}
          {calculationMode !== 'power' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Statistical Power (1-β)"
                value={parameters.power}
                onChange={(e) => setParameters({ ...parameters, power: parseFloat(e.target.value) })}
                inputProps={{ min: 0.5, max: 0.99, step: 0.05 }}
                disabled={loading}
              />
            </Grid>
          )}

          {/* Effect Size (when not calculating effect size) */}
          {calculationMode !== 'effectSize' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label={testType === 'correlation' ? 'Correlation (r)' : 'Effect Size (d)'}
                value={testType === 'correlation' ? parameters.correlation : parameters.effectSize}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (testType === 'correlation') {
                    setParameters({ ...parameters, correlation: value });
                  } else {
                    setParameters({ ...parameters, effectSize: value });
                  }
                }}
                inputProps={{
                  min: testType === 'correlation' ? -1 : 0,
                  max: testType === 'correlation' ? 1 : 2,
                  step: 0.1
                }}
                disabled={loading}
              />
            </Grid>
          )}

          {/* Sample Size (when not calculating sample size) */}
          {calculationMode !== 'sampleSize' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Sample Size (per group)"
                value={parameters.sampleSize || ''}
                onChange={(e) => setParameters({ ...parameters, sampleSize: parseInt(e.target.value) })}
                inputProps={{ min: 5, max: 10000, step: 5 }}
                disabled={loading}
                placeholder="Enter sample size"
              />
            </Grid>
          )}

          {/* Tails */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={parameters.tails}
                onChange={(e) => setParameters({ ...parameters, tails: e.target.value })}
                label="Test Type"
                disabled={loading}
              >
                <MenuItem value={1}>One-tailed</MenuItem>
                <MenuItem value={2}>Two-tailed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Groups (for ANOVA) */}
          {testType === 'anova' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Number of Groups"
                value={parameters.groups}
                onChange={(e) => setParameters({ ...parameters, groups: parseInt(e.target.value) })}
                inputProps={{ min: 2, max: 10, step: 1 }}
                disabled={loading}
              />
            </Grid>
          )}

          {/* Proportions (for proportion tests) */}
          {testType === 'proportion' && (
            <>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Proportion 1"
                  value={parameters.p1}
                  onChange={(e) => setParameters({ ...parameters, p1: parseFloat(e.target.value) })}
                  inputProps={{ min: 0.01, max: 0.99, step: 0.01 }}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Proportion 2"
                  value={parameters.p2}
                  onChange={(e) => setParameters({ ...parameters, p2: parseFloat(e.target.value) })}
                  inputProps={{ min: 0.01, max: 0.99, step: 0.01 }}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Allocation Ratio"
                  value={parameters.allocation}
                  onChange={(e) => setParameters({ ...parameters, allocation: parseFloat(e.target.value) })}
                  inputProps={{ min: 0.1, max: 10, step: 0.1 }}
                  disabled={loading}
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* Effect Size Guide */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Effect Size Guidelines</AlertTitle>
          {testType === 'correlation' ? (
            <Typography variant="body2">
              Small: r = 0.1 | Medium: r = 0.3 | Large: r = 0.5
            </Typography>
          ) : testType === 'anova' ? (
            <Typography variant="body2">
              Small: f = 0.1 | Medium: f = 0.25 | Large: f = 0.4
            </Typography>
          ) : (
            <Typography variant="body2">
              Small: d = 0.2 | Medium: d = 0.5 | Large: d = 0.8
            </Typography>
          )}
        </Alert>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={performCalculation}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CalculateIcon />}
            sx={{
              background: gradients.primary,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </Button>
          <Button
            variant="outlined"
            onClick={resetCalculator}
            startIcon={<RefreshIcon />}
            sx={{
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
                transform: 'rotate(180deg)',
                transition: 'transform 0.3s'
              }
            }}
          >
            Reset
          </Button>
        </Box>
      </CardContent>
    </Card>
    </Fade>
  );

  // Render results
  const renderResults = () => {
    if (!results) return null;

    return (
      <Zoom in timeout={600}>
        <Card sx={{ mt: 3, ...glassMorphism[darkMode ? 'dark' : 'light'] }}>
          <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Results
            </Typography>
            <Chip
              label={`${backendPrecision}-decimal precision`}
              color="success"
              icon={<CheckCircleIcon />}
            />
          </Box>

          <Grid container spacing={2}>
            {/* Main Result */}
            <Grid item xs={12} md={6}>
              <Grow in timeout={800}>
                <Paper sx={{ p: 3, ...glassMorphism[darkMode ? 'dark' : 'light'] }}>
                <Typography variant="h6" gutterBottom>
                  {calculationMode === 'power' && 'Statistical Power'}
                  {calculationMode === 'sampleSize' && 'Required Sample Size'}
                  {calculationMode === 'effectSize' && 'Detectable Effect Size'}
                </Typography>
                <Typography variant="h3" sx={{
                  background: gradients.primary,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 700
                }}>
                  {calculationMode === 'power' && formatNumber(results.power || results.calculated_power, 4)}
                  {calculationMode === 'sampleSize' && Math.ceil(results.sample_size || results.required_sample_size)}
                  {calculationMode === 'effectSize' && formatNumber(results.effect_size || results.detectable_effect_size, 4)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {calculationMode === 'power' && `Probability of detecting true effect`}
                  {calculationMode === 'sampleSize' && `Per group (balanced design)`}
                  {calculationMode === 'effectSize' && `Cohen's d (standardized)`}
                </Typography>
                </Paper>
              </Grow>
            </Grid>

            {/* Additional Info */}
            <Grid item xs={12} md={6}>
              <Grow in timeout={1000}>
                <Paper sx={{ p: 3, ...glassMorphism[darkMode ? 'dark' : 'light'] }}>
                <Typography variant="h6" gutterBottom>
                  Test Configuration
                </Typography>
                <Typography variant="body2">
                  Test Type: <strong>{testType.replace('_', ' ').toUpperCase()}</strong>
                </Typography>
                <Typography variant="body2">
                  Alpha Level: <strong>{parameters.alpha}</strong>
                </Typography>
                <Typography variant="body2">
                  Tails: <strong>{parameters.tails === 1 ? 'One-tailed' : 'Two-tailed'}</strong>
                </Typography>
                {results.scenario && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Scenario: <strong>{results.scenario.name}</strong>
                  </Typography>
                )}
                </Paper>
              </Grow>
            </Grid>

            {/* Critical Values */}
            {results.critical_value && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Critical Value
                  </Typography>
                  <Typography variant="body1">
                    {formatNumber(results.critical_value, 6)}
                  </Typography>
                </Paper>
              </Grid>
            )}

            {/* Non-centrality Parameter */}
            {results.noncentrality && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Non-centrality Parameter (λ)
                  </Typography>
                  <Typography variant="body1">
                    {formatNumber(results.noncentrality, 6)}
                  </Typography>
                </Paper>
              </Grid>
            )}

            {/* High Precision Display */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  High Precision Result (50 decimals)
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {results.high_precision_result || results.power || results.sample_size || results.effect_size}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Interpretation */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle>Interpretation</AlertTitle>
            {calculationMode === 'power' && (
              <Typography variant="body2">
                With the given parameters, you have a {formatNumber(results.power || results.calculated_power, 2)}%
                probability of detecting a statistically significant effect if it truly exists.
                {(results.power || results.calculated_power) < 0.8 &&
                  ' Consider increasing sample size or effect size to achieve adequate power (≥80%).'}
              </Typography>
            )}
            {calculationMode === 'sampleSize' && (
              <Typography variant="body2">
                You need at least {Math.ceil(results.sample_size || results.required_sample_size)} participants
                per group to achieve {(parameters.power * 100).toFixed(0)}% power for detecting the specified effect size.
              </Typography>
            )}
            {calculationMode === 'effectSize' && (
              <Typography variant="body2">
                With your sample size and desired power, you can reliably detect effects of
                {' '}{formatNumber(results.effect_size || results.detectable_effect_size, 3)} or larger.
                This is considered a {
                  (results.effect_size || results.detectable_effect_size) < 0.3 ? 'small' :
                  (results.effect_size || results.detectable_effect_size) < 0.6 ? 'medium' : 'large'
                } effect size.
              </Typography>
            )}
          </Alert>
        </CardContent>
      </Card>
    </Zoom>
    );
  };

  // Render power curve
  const renderPowerCurve = () => {
    if (!powerCurve || powerCurve.length === 0) return null;

    return (
      <Fade in timeout={1000}>
        <Card sx={{ mt: 3, ...glassMorphism[darkMode ? 'dark' : 'light'] }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
            <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Power Curve
          </Typography>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Effect Size</TableCell>
                  <TableCell align="right">Statistical Power</TableCell>
                  <TableCell align="center">Interpretation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {powerCurve.map((point) => (
                  <TableRow key={point.effectSize}>
                    <TableCell>{point.effectSize.toFixed(1)}</TableCell>
                    <TableCell align="right">{(point.power * 100).toFixed(1)}%</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={
                          point.power < 0.5 ? 'Low' :
                          point.power < 0.8 ? 'Moderate' : 'Adequate'
                        }
                        color={
                          point.power < 0.5 ? 'error' :
                          point.power < 0.8 ? 'warning' : 'success'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Fade>
    );
  };

  return (
    <ProfessionalContainer
      title={
        <Typography variant="h4" sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AnalyticsIcon sx={{ mr: 2, fontSize: 40 }} />
          Power Analysis
          <Chip
            label="50-decimal precision"
            color="success"
            size="small"
            sx={{ ml: 2 }}
          />
        </Typography>
      }
      gradient="info"
      enableGlassMorphism={true}
    >
      <Typography variant="body1" color="text.secondary" paragraph align="center">
        Statistical power analysis with high-precision backend calculations.
        Determine sample sizes, detect effect sizes, and calculate statistical power.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Configuration Section */}
      <Grid container spacing={3}>
        {/* Left Column - Settings */}
        <Grid item xs={12} md={4}>
          <Fade in timeout={600}>
            <Card sx={{ ...glassMorphism[darkMode ? 'dark' : 'light'] }}>
              <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>

              {/* Calculation Mode */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Calculate</InputLabel>
                <Select
                  value={calculationMode}
                  onChange={(e) => setCalculationMode(e.target.value)}
                  label="Calculate"
                >
                  <MenuItem value="power">Statistical Power</MenuItem>
                  <MenuItem value="sampleSize">Sample Size</MenuItem>
                  <MenuItem value="effectSize">Effect Size</MenuItem>
                </Select>
              </FormControl>

              {/* Test Type */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Statistical Test</InputLabel>
                <Select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  label="Statistical Test"
                >
                  <MenuItem value="t_test">T-Test</MenuItem>
                  <MenuItem value="anova">ANOVA</MenuItem>
                  <MenuItem value="correlation">Correlation</MenuItem>
                  <MenuItem value="proportion">Proportion Test</MenuItem>
                  <MenuItem value="chi_square">Chi-Square</MenuItem>
                  <MenuItem value="regression">Regression</MenuItem>
                </Select>
              </FormControl>

              {/* Scenario Selection */}
              <FormControl fullWidth>
                <InputLabel>Example Scenario</InputLabel>
                <Select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  label="Example Scenario"
                >
                  {Object.entries(POWER_SCENARIOS).map(([key, scenario]) => (
                    <MenuItem key={key} value={key}>
                      <Box>
                        <Typography>{scenario.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {scenario.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Context Info */}
              {POWER_SCENARIOS[selectedScenario] && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    {POWER_SCENARIOS[selectedScenario].context}
                  </Typography>
                </Alert>
              )}
            </CardContent>
            </Card>
          </Fade>
        </Grid>

        {/* Right Column - Parameters */}
        <Grid item xs={12} md={8}>
          {renderParameterInputs()}
        </Grid>
      </Grid>

      {/* Results Section */}
      {renderResults()}

      {/* Power Curve */}
      {renderPowerCurve()}
    </ProfessionalContainer>
  );
};

export default PowerAnalysisReal;