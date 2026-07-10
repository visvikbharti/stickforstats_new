import React, { useState } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, Chip, Fade, Tabs, Tab, Divider, alpha,
  Accordion, AccordionSummary,
  AccordionDetails, Slider, Switch, FormControlLabel, List,
  ListItem, ListItemIcon, ListItemText, Table, TableBody, TableCell, TableContainer, TableRow
} from '@mui/material';
import {
  Calculate as CalculateIcon, Clear as ClearIcon,
  School as SchoolIcon, Science as ScienceIcon, MenuBook as MenuBookIcon,
  Functions as FunctionsIcon, CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon, Lightbulb as LightbulbIcon,
  Timeline as TimelineIcon,
  BusinessCenter as BusinessIcon, LocalHospital as MedicalIcon,
  PlayArrow as PlayIcon,
  CompareArrows as CompareIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jStat from 'jstat';
import { getApiUrl, endpoints } from '../config/apiConfig';
import guardianService from '../services/GuardianService';
import GuardianFallbackCard from '../components/Guardian/GuardianFallbackCard';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// Professional color palette
const colors = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#48bb78',
  warning: '#f6ad55',
  danger: '#f56565',
  info: '#4299e1',
  dark: '#2d3748',
  light: '#f7fafc'
};

// Which distribution-free test replaces each parametric t-test design when the
// Guardian assumption check fails. (one-sample is out of scope for this pass.)
const TTEST_NP_FALLBACK = {
  'two-sample': { test: 'mann-whitney', label: 'Run Mann-Whitney U instead' },
  'paired': { test: 'wilcoxon', label: 'Run Wilcoxon signed-rank instead' },
};

// Comprehensive T-Test Module
const TTestCompleteModule = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  // Main navigation tabs
  const [mainTab, setMainTab] = useState(0);

  // Test configuration
  const [testType, setTestType] = useState('two-sample');
  const [alternative, setAlternative] = useState('two-sided');
  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [equalVariance, setEqualVariance] = useState(true);

  // Data management
  const [sample1, setSample1] = useState('');
  const [sample2, setSample2] = useState('');
  const [pairedDifferences, setPairedDifferences] = useState('');
  const [populationMean, setPopulationMean] = useState(0);

  // Results
  const [results, setResults] = useState(null);
  const [assumptions, setAssumptions] = useState(null);
  const [interpretation, setInterpretation] = useState(null);

  // Guardian backend assumption report (non-parametric fallback)
  const [guardianReport, setGuardianReport] = useState(null);

  // Hand the user's data to the Non-Parametric module and auto-run the
  // recommended distribution-free test for the current t-test design.
  const runNonParametricFallback = () => {
    const fb = TTEST_NP_FALLBACK[testType];
    if (!fb) return;
    const g1 = parseData(sample1);
    const g2 = parseData(sample2);
    if (!g1 || !g2) return;
    const state = {
      fromGuardian: true,
      selectedTest: fb.test,
      autoRun: true,
      datasetLabel: 'Imported from your t-test',
    };
    if (fb.test === 'wilcoxon') {
      state.pairedData = { before: g1, after: g2 };
    } else {
      state.dataGroups = [
        { name: 'Sample 1', values: g1 },
        { name: 'Sample 2', values: g2 },
      ];
    }
    navigate('/modules/nonparametric-real', { state });
  };

  // Simulation state
  const [simRunning, setSimRunning] = useState(false);
  const [simParams, setSimParams] = useState({
    sampleSize: 30,
    effectSize: 0.5,
    numSimulations: 1000,
    alpha: 0.05
  });
  const [simResults, setSimResults] = useState(null);

  // Learning state
  const [showStepByStep, setShowStepByStep] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});

  // Parse data helper
  const parseData = (dataString) => {
    if (!dataString.trim()) return null;
    return dataString
      .split(',')
      .map(val => val.trim())
      .filter(val => val !== '')
      .map(val => parseFloat(val))
      .filter(val => !isNaN(val));
  };

  // Load example datasets
  const loadExampleData = (scenario) => {
    const examples = {
      medical: {
        sample1: '120, 125, 130, 128, 132, 127, 131, 129, 126, 133',
        sample2: '140, 138, 142, 145, 139, 143, 141, 144, 137, 146',
        description: 'Blood pressure measurements: Control vs Treatment group'
      },
      education: {
        sample1: '75, 82, 78, 85, 80, 77, 83, 79, 81, 84',
        sample2: '88, 92, 85, 91, 89, 87, 90, 86, 93, 94',
        description: 'Test scores: Traditional vs New teaching method'
      },
      business: {
        sample1: '45, 52, 48, 50, 47, 51, 49, 46, 53, 44',
        sample2: '58, 62, 55, 60, 59, 61, 57, 63, 56, 64',
        description: 'Sales performance: Region A vs Region B (in thousands)'
      },
      paired: {
        sample1: '160, 165, 158, 162, 168, 164, 161, 167, 163, 166',
        sample2: '155, 158, 152, 156, 160, 157, 154, 159, 156, 158',
        description: 'Weight measurements: Before vs After diet program'
      }
    };

    const example = examples[scenario];
    if (example) {
      setSample1(example.sample1);
      setSample2(example.sample2);
      enqueueSnackbar(`Loaded: ${example.description}`, { variant: 'info' });
    }
  };

  // Check assumptions
  const checkAssumptions = (data1, data2) => {
    const assumptions = {
      normality: { passed: false, pValue: 0, message: '' },
      independence: { passed: true, message: 'Assumed based on study design' },
      equalVariance: { passed: false, pValue: 0, message: '' },
      sampleSize: { passed: false, message: '' }
    };

    // Sample size check
    assumptions.sampleSize.passed = data1.length >= 20 && (!data2 || data2.length >= 20);
    assumptions.sampleSize.message = assumptions.sampleSize.passed
      ? 'Sample size adequate (n ≥ 20)'
      : 'Small sample size - consider non-parametric alternatives';

    // Quick normality heuristic (proper Shapiro-Wilk requires backend)
    // D'Agostino rule of thumb: |skewness| < 2 AND |excess kurtosis| < 7
    const checkNormality = (data) => {
      const n = data.length;
      const mean = data.reduce((a, b) => a + b, 0) / n;
      const std = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
      if (std === 0) return true;
      const skewness = data.reduce((a, b) => a + Math.pow((b - mean) / std, 3), 0) / n;
      const kurtosis = data.reduce((a, b) => a + Math.pow((b - mean) / std, 4), 0) / n;
      return Math.abs(skewness) < 2 && Math.abs(kurtosis - 3) < 7;
    };

    assumptions.normality.passed = checkNormality(data1) && (!data2 || checkNormality(data2));
    assumptions.normality.message = assumptions.normality.passed
      ? 'Data appears approximately normal'
      : 'Data may violate normality - interpret with caution';

    // Variance equality check (F-test with proper p-value). Equal variances are
    // an assumption of the two-sample t-test only: the one-sample and paired
    // tests compare a single distribution (of values, or of differences), so
    // reporting the check there would render a failed assumption that does not
    // apply to the test being run.
    if (testType === 'two-sample' && data2) {
      const var1 = data1.reduce((a, b, i, arr) => a + Math.pow(b - arr.reduce((x, y) => x + y, 0) / arr.length, 2), 0) / (data1.length - 1);
      const var2 = data2.reduce((a, b, i, arr) => a + Math.pow(b - arr.reduce((x, y) => x + y, 0) / arr.length, 2), 0) / (data2.length - 1);
      const fStat = Math.max(var1, var2) / Math.min(var1, var2);
      const df1 = (var1 >= var2 ? data1.length : data2.length) - 1;
      const df2 = (var1 >= var2 ? data2.length : data1.length) - 1;
      const fPValue = 2 * Math.min(1 - jStat.centralF.cdf(fStat, df1, df2), jStat.centralF.cdf(fStat, df1, df2));
      assumptions.equalVariance.passed = fPValue > 0.05;
      assumptions.equalVariance.pValue = fPValue;

      // Which test actually runs is decided by the "Assume equal variances"
      // switch, not by this check. Say what will happen, not what ought to.
      //
      // Future tense, deliberately: this panel is populated before the request
      // is sent, and it deliberately survives a failed request (see the caller),
      // so "was used" would assert a result that may never have been computed.
      const finding = `${assumptions.equalVariance.passed ? 'Variances appear equal' : 'Unequal variances detected'} (F=${fStat.toFixed(2)}, p=${fPValue.toFixed(4)})`;
      if (assumptions.equalVariance.passed) {
        assumptions.equalVariance.message = finding;
      } else if (equalVariance) {
        assumptions.equalVariance.message = `${finding} - "Assume equal variances" is on, so Student's pooled t-test will be used. Turn it off to run Welch's t-test.`;
      } else {
        assumptions.equalVariance.message = `${finding} - Welch's t-test will be used, which does not assume equal variances.`;
      }
    } else {
      delete assumptions.equalVariance;
    }

    return assumptions;
  };

  // Perform t-test calculation
  const performTTest = async () => {
    const data1 = parseData(sample1);
    if (!data1 || data1.length < 2) {
      enqueueSnackbar('Please enter valid data for sample 1', { variant: 'error' });
      return;
    }

    let endpoint = '';
    let payload = {};

    switch (testType) {
      case 'one-sample':
        endpoint = endpoints.stats.ttest;
        // The serializer requires `data1`, and the view reads the hypothesized
        // mean from parameters.mu specifically -- top-level mu / population_mean
        // are dropped and the test silently runs against 0. Sending `data` (the
        // old key) 400'd every run outright.
        payload = {
          test_type: 'one_sample',
          data1: data1,
          parameters: { mu: populationMean },
          alternative: alternative
        };
        break;

      case 'two-sample':
        const data2 = parseData(sample2);
        if (!data2 || data2.length < 2) {
          enqueueSnackbar('Please enter valid data for sample 2', { variant: 'error' });
          return;
        }
        endpoint = endpoints.stats.ttest;
        payload = {
          test_type: 'two_sample',
          data1: data1,
          data2: data2,
          alternative: alternative,
          equal_variance: equalVariance
        };
        break;

      case 'paired':
        const data2Paired = parseData(sample2);
        if (!data2Paired || data2Paired.length !== data1.length) {
          enqueueSnackbar('Paired samples must have equal length', { variant: 'error' });
          return;
        }
        endpoint = endpoints.stats.ttest;
        payload = {
          test_type: 'paired',
          data1: data1,
          data2: data2Paired,
          alternative: alternative
        };
        break;
    }

    // Check assumptions. This runs on the submitted samples regardless of
    // whether the analysis call itself succeeds — a violated assumption (and the
    // non-parametric alternative it implies) is worth surfacing even when the
    // parametric test cannot be computed.
    const data2 = testType !== 'one-sample' ? parseData(sample2) : null;
    setAssumptions(checkAssumptions(data1, data2));

    // Backend Guardian assumption check (non-blocking): if the parametric
    // assumptions are violated, offer a distribution-free alternative.
    setGuardianReport(null);
    if (TTEST_NP_FALLBACK[testType] && data2 && data2.length >= 2) {
      // Paired t-test assumes normality of the within-pair DIFFERENCES, so
      // send those as a flat array; independent t-test checks each group.
      const guardianData =
        testType === 'paired'
          ? data1.map((v, i) => v - data2[i])
          : { group1: data1, group2: data2 };
      guardianService
        .checkAssumptions(guardianData, 't_test', 1 - confidenceLevel / 100)
        .then(setGuardianReport)
        .catch(() => setGuardianReport(null));
    }

    try {
      const response = await axios.post(getApiUrl(endpoint), payload);
      setResults(response.data);

      // Generate interpretation
      generateInterpretation(response.data);

      enqueueSnackbar('Analysis completed successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Analysis error:', error);
      setResults(null);
      enqueueSnackbar('Analysis failed', { variant: 'error' });
    }
  };

  // Generate comprehensive interpretation
  const generateInterpretation = (results) => {
    const pValue = parseFloat(results.high_precision_result?.p_value || results.p_value || 0);
    const tStat = parseFloat(results.high_precision_result?.t_statistic || results.t_statistic || 0);
    const alpha = 1 - confidenceLevel / 100;

    const interp = {
      summary: '',
      statistical: '',
      practical: '',
      recommendations: [],
      visualization: ''
    };

    // Statistical interpretation
    if (pValue < alpha) {
      interp.statistical = `The test is statistically significant (p = ${pValue.toFixed(4)} < α = ${alpha}). We reject the null hypothesis.`;
      interp.summary = 'Significant difference detected';
    } else {
      interp.statistical = `The test is not statistically significant (p = ${pValue.toFixed(4)} ≥ α = ${alpha}). We fail to reject the null hypothesis.`;
      interp.summary = 'No significant difference detected';
    }

    // Effect size interpretation (Cohen's d)
    let effectSize = 0;
    const data1 = parseData(sample1);
    if (testType === 'one-sample') {
      // One-sample Cohen's d = |mean - mu| / sd
      const mean1 = data1.reduce((a, b) => a + b, 0) / data1.length;
      const sd1 = Math.sqrt(data1.reduce((s, x) => s + (x - mean1) ** 2, 0) / (data1.length - 1));
      effectSize = sd1 > 0 ? Math.abs(mean1 - populationMean) / sd1 : 0;
    } else {
      // Two-sample / paired Cohen's d = |mean1 - mean2| / pooled_SD
      const data2 = parseData(sample2);
      if (data1 && data2 && data1.length > 1 && data2.length > 1) {
        const mean1 = data1.reduce((a, b) => a + b, 0) / data1.length;
        const mean2 = data2.reduce((a, b) => a + b, 0) / data2.length;
        const var1 = data1.reduce((s, x) => s + (x - mean1) ** 2, 0) / (data1.length - 1);
        const var2 = data2.reduce((s, x) => s + (x - mean2) ** 2, 0) / (data2.length - 1);
        const pooledSD = Math.sqrt(((data1.length - 1) * var1 + (data2.length - 1) * var2) / (data1.length + data2.length - 2));
        effectSize = pooledSD > 0 ? Math.abs(mean1 - mean2) / pooledSD : 0;
      }
    }
    if (effectSize < 0.2) interp.practical = 'The effect size is negligible.';
    else if (effectSize < 0.5) interp.practical = 'The effect size is small.';
    else if (effectSize < 0.8) interp.practical = 'The effect size is medium.';
    else interp.practical = 'The effect size is large.';

    // Recommendations
    if (pValue < alpha) {
      interp.recommendations.push('Consider practical significance alongside statistical significance');
      interp.recommendations.push('Validate findings with additional studies if possible');
    } else {
      interp.recommendations.push('Consider increasing sample size for more statistical power');
      interp.recommendations.push('Check for potential confounding variables');
    }

    if (assumptions && !assumptions.normality.passed) {
      interp.recommendations.push('Consider non-parametric alternatives (Mann-Whitney U test)');
    }

    setInterpretation(interp);
  };

  // Run simulation
  const runSimulation = async () => {
    setSimRunning(true);

    // Simulate multiple t-tests to show power and type I error
    const results = [];
    for (let i = 0; i < simParams.numSimulations; i++) {
      // Generate random samples
      const sample1Sim = Array.from({ length: simParams.sampleSize },
        () => Math.random() * 10);
      const sample2Sim = Array.from({ length: simParams.sampleSize },
        () => Math.random() * 10 + simParams.effectSize);

      // Calculate t-statistic
      const mean1 = sample1Sim.reduce((a, b) => a + b, 0) / sample1Sim.length;
      const mean2 = sample2Sim.reduce((a, b) => a + b, 0) / sample2Sim.length;
      const pooledStd = Math.sqrt(
        (sample1Sim.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) +
         sample2Sim.reduce((a, b) => a + Math.pow(b - mean2, 2), 0)) /
        (sample1Sim.length + sample2Sim.length - 2)
      );
      const tStat = (mean2 - mean1) / (pooledStd * Math.sqrt(2 / simParams.sampleSize));

      const df = sample1Sim.length + sample2Sim.length - 2;
      results.push({
        iteration: i + 1,
        tStatistic: tStat,
        significant: Math.abs(tStat) > jStat.studentt.inv(1 - simParams.alpha / 2, df),
        effectSize: (mean2 - mean1) / pooledStd
      });
    }

    const power = results.filter(r => r.significant).length / results.length;

    setSimResults({
      data: results.slice(0, 100), // Show first 100 for visualization
      power: power,
      typeIError: simParams.effectSize === 0 ? power : null,
      averageEffect: results.reduce((a, b) => a + b.effectSize, 0) / results.length
    });

    setSimRunning(false);
    enqueueSnackbar('Simulation completed!', { variant: 'success' });
  };

  // Render theoretical foundations
  const renderTheory = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          T-Test: Theoretical Foundations
        </Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              <FunctionsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Mathematical Foundation
            </Typography>

            <Box sx={{ my: 2, p: 2, bgcolor: alpha(colors.primary, 0.1), borderRadius: 2 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', textAlign: 'center' }}>
                t = (x̄₁ - x̄₂) / (s_p × √(1/n₁ + 1/n₂))
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                Two-sample t-statistic formula
              </Typography>
            </Box>

            <List dense>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText
                  primary="Compares means of two groups"
                  secondary="Tests if the difference is statistically significant"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText
                  primary="Based on Student's t-distribution"
                  secondary="Accounts for sample size in determining significance"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText
                  primary="Degrees of freedom = n₁ + n₂ - 2"
                  secondary="For equal variance assumption"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Key Assumptions
            </Typography>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>1. Independence</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  Observations within and between groups must be independent.
                  This is typically ensured through random sampling and proper study design.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>2. Normality</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  Data should be approximately normally distributed. The t-test is robust
                  to violations with large samples (n ≥ 30) due to the Central Limit Theorem.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>3. Equal Variance (Homoscedasticity)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  For standard t-test, variances should be equal. If violated, use Welch's t-test
                  which doesn't assume equal variances.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>4. Scale of Measurement</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  Data should be continuous (interval or ratio scale). For ordinal data,
                  consider non-parametric alternatives like Mann-Whitney U test.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              <CompareIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Types of T-Tests
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, bgcolor: alpha(colors.info, 0.1) }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>One-Sample T-Test</strong>
                  </Typography>
                  <Typography variant="body2">
                    Compares a sample mean to a known population mean.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Example: Is the average height of students different from the national average?
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, bgcolor: alpha(colors.success, 0.1) }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Two-Sample T-Test</strong>
                  </Typography>
                  <Typography variant="body2">
                    Compares means of two independent groups.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Example: Is there a difference in test scores between two teaching methods?
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, bgcolor: alpha(colors.warning, 0.1) }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Paired T-Test</strong>
                  </Typography>
                  <Typography variant="body2">
                    Compares means of the same subjects at two time points.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Example: Is there a difference in blood pressure before and after treatment?
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render analysis interface
  const renderAnalysis = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          T-Test Analysis
        </Typography>
      </Grid>

      {/* Configuration */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Configuration
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={testType}
                label="Test Type"
                onChange={(e) => { setTestType(e.target.value); setGuardianReport(null); }}
              >
                <MenuItem value="one-sample">One-Sample T-Test</MenuItem>
                <MenuItem value="two-sample">Two-Sample T-Test</MenuItem>
                <MenuItem value="paired">Paired T-Test</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Alternative Hypothesis</InputLabel>
              <Select
                value={alternative}
                label="Alternative Hypothesis"
                onChange={(e) => setAlternative(e.target.value)}
              >
                <MenuItem value="two-sided">Two-sided (≠)</MenuItem>
                <MenuItem value="less">Less than (&lt;)</MenuItem>
                <MenuItem value="greater">Greater than (&gt;)</MenuItem>
              </Select>
            </FormControl>

            <Typography gutterBottom>
              Confidence Level: {confidenceLevel}%
            </Typography>
            <Slider
              value={confidenceLevel}
              onChange={(e, v) => setConfidenceLevel(v)}
              min={90}
              max={99}
              marks={[
                { value: 90, label: '90%' },
                { value: 95, label: '95%' },
                { value: 99, label: '99%' }
              ]}
              sx={{ mb: 2 }}
            />

            {testType === 'two-sample' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={equalVariance}
                    onChange={(e) => setEqualVariance(e.target.checked)}
                  />
                }
                label="Assume equal variances"
              />
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Load Example Dataset
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Button
                  size="small"
                  fullWidth
                  variant="outlined"
                  onClick={() => loadExampleData('medical')}
                  startIcon={<MedicalIcon />}
                >
                  Medical
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  size="small"
                  fullWidth
                  variant="outlined"
                  onClick={() => loadExampleData('education')}
                  startIcon={<SchoolIcon />}
                >
                  Education
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  size="small"
                  fullWidth
                  variant="outlined"
                  onClick={() => loadExampleData('business')}
                  startIcon={<BusinessIcon />}
                >
                  Business
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  size="small"
                  fullWidth
                  variant="outlined"
                  onClick={() => loadExampleData('paired')}
                  startIcon={<CompareIcon />}
                >
                  Paired
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Data Input */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Data Input
            </Typography>

            {testType === 'one-sample' && (
              <>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Sample Data (comma-separated)"
                  value={sample1}
                  onChange={(e) => setSample1(e.target.value)}
                  placeholder="e.g., 23.5, 24.1, 22.8, 25.2, 23.9"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Population Mean (μ₀)"
                  value={populationMean}
                  onChange={(e) => setPopulationMean(parseFloat(e.target.value))}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {(testType === 'two-sample' || testType === 'paired') && (
              <>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={testType === 'paired' ? 'Before/First Measurement' : 'Sample 1 (Control/Group A)'}
                  value={sample1}
                  onChange={(e) => setSample1(e.target.value)}
                  placeholder="e.g., 23.5, 24.1, 22.8, 25.2, 23.9"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={testType === 'paired' ? 'After/Second Measurement' : 'Sample 2 (Treatment/Group B)'}
                  value={sample2}
                  onChange={(e) => setSample2(e.target.value)}
                  placeholder="e.g., 26.3, 27.1, 25.8, 28.2, 26.7"
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={performTTest}
                startIcon={<CalculateIcon />}
              >
                Perform Analysis
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setSample1('');
                  setSample2('');
                  setResults(null);
                  setAssumptions(null);
                  setInterpretation(null);
                  setGuardianReport(null);
                }}
                startIcon={<ClearIcon />}
              >
                Clear
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={showStepByStep}
                    onChange={(e) => setShowStepByStep(e.target.checked)}
                  />
                }
                label="Show steps"
              />
            </Box>
          </CardContent>
        </Card>

        {/* Assumptions Check */}
        {assumptions && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Assumptions Check
              </Typography>

              <Grid container spacing={2}>
                {Object.entries(assumptions).map(([key, value]) => (
                  <Grid item xs={12} md={6} key={key}>
                    <Alert
                      severity={value.passed ? 'success' : 'warning'}
                      icon={value.passed ? <CheckCircleIcon /> : <WarningIcon />}
                    >
                      <Typography variant="subtitle2">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </Typography>
                      <Typography variant="body2">
                        {value.message}
                      </Typography>
                    </Alert>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Guardian non-parametric fallback (only for designs with a mapping) */}
        {TTEST_NP_FALLBACK[testType] && (
          <GuardianFallbackCard
            report={guardianReport}
            actionLabel={TTEST_NP_FALLBACK[testType].label}
            onRun={runNonParametricFallback}
          />
        )}

        {/* Results */}
        {results && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Results
              </Typography>

              {results.high_precision_result && (
                <TableContainer component={Paper}>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>T-Statistic</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                          {results.high_precision_result.t_statistic}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>P-Value</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                          {results.high_precision_result.p_value}
                          {parseFloat(results.high_precision_result.p_value) < 0.05 && (
                            <Chip label="Significant" color="error" size="small" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Degrees of Freedom</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                          {results.high_precision_result.degrees_of_freedom}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Interpretation */}
        {interpretation && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Interpretation
              </Typography>

              <Alert severity={interpretation.summary.includes('Significant') ? 'success' : 'info'} sx={{ mb: 2 }}>
                <Typography variant="subtitle1">{interpretation.summary}</Typography>
              </Alert>

              <Typography variant="body2" paragraph>
                <strong>Statistical Interpretation:</strong> {interpretation.statistical}
              </Typography>

              <Typography variant="body2" paragraph>
                <strong>Practical Significance:</strong> {interpretation.practical}
              </Typography>

              <Typography variant="body2" gutterBottom>
                <strong>Recommendations:</strong>
              </Typography>
              <List dense>
                {interpretation.recommendations.map((rec, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );

  // Render simulations
  const renderSimulations = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Interactive Simulations
        </Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Simulation Parameters
            </Typography>

            <Typography gutterBottom>
              Sample Size: {simParams.sampleSize}
            </Typography>
            <Slider
              value={simParams.sampleSize}
              onChange={(e, v) => setSimParams({ ...simParams, sampleSize: v })}
              min={10}
              max={200}
              sx={{ mb: 2 }}
            />

            <Typography gutterBottom>
              Effect Size (Cohen's d): {simParams.effectSize}
            </Typography>
            <Slider
              value={simParams.effectSize}
              onChange={(e, v) => setSimParams({ ...simParams, effectSize: v })}
              min={0}
              max={2}
              step={0.1}
              marks={[
                { value: 0, label: 'None' },
                { value: 0.5, label: 'Small' },
                { value: 0.8, label: 'Medium' },
                { value: 1.2, label: 'Large' }
              ]}
              sx={{ mb: 2 }}
            />

            <Typography gutterBottom>
              Number of Simulations: {simParams.numSimulations}
            </Typography>
            <Slider
              value={simParams.numSimulations}
              onChange={(e, v) => setSimParams({ ...simParams, numSimulations: v })}
              min={100}
              max={10000}
              step={100}
              sx={{ mb: 2 }}
            />

            <Typography gutterBottom>
              Significance Level (α): {simParams.alpha}
            </Typography>
            <Slider
              value={simParams.alpha}
              onChange={(e, v) => setSimParams({ ...simParams, alpha: v })}
              min={0.01}
              max={0.1}
              step={0.01}
              marks={[
                { value: 0.01, label: '0.01' },
                { value: 0.05, label: '0.05' },
                { value: 0.1, label: '0.10' }
              ]}
              sx={{ mb: 3 }}
            />

            <Button
              variant="contained"
              fullWidth
              color="success"
              onClick={runSimulation}
              disabled={simRunning}
              startIcon={simRunning ? <CircularProgress size={20} /> : <PlayIcon />}
            >
              {simRunning ? 'Running Simulation...' : 'Run Simulation'}
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        {simResults && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Power Analysis Results
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(colors.success, 0.1) }}>
                        <Typography variant="h3" color="primary">
                          {(simResults.power * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="subtitle2">Statistical Power</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(colors.info, 0.1) }}>
                        <Typography variant="h3" color="secondary">
                          {simResults.averageEffect.toFixed(3)}
                        </Typography>
                        <Typography variant="subtitle2">Average Effect Size</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(colors.warning, 0.1) }}>
                        <Typography variant="h3">
                          {simParams.sampleSize}
                        </Typography>
                        <Typography variant="subtitle2">Sample Size</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Typography variant="body2" sx={{ mt: 2 }}>
                    With a sample size of {simParams.sampleSize} and an effect size of {simParams.effectSize},
                    you have {(simResults.power * 100).toFixed(1)}% power to detect a significant difference
                    at α = {simParams.alpha}.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    T-Statistics Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={simResults.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="iteration" />
                      <YAxis />
                      <ChartTooltip />
                      <ReferenceLine y={jStat.normal.inv(1 - simParams.alpha / 2, 0, 1)} stroke={colors.danger} strokeDasharray="5 5" label="Critical Value" />
                      <ReferenceLine y={-jStat.normal.inv(1 - simParams.alpha / 2, 0, 1)} stroke={colors.danger} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="tStatistic" stroke={colors.primary} dot={false} />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Grid>
    </Grid>
  );

  // Main render
  return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            T-Test Complete Module
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Comprehensive statistical analysis with educational resources
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Chip icon={<ScienceIcon />} label="50-Decimal Precision" color="primary" sx={{ mr: 1 }} />
            <Chip icon={<SchoolIcon />} label="Interactive Learning" color="secondary" sx={{ mr: 1 }} />
            <Chip icon={<TimelineIcon />} label="Power Analysis" color="success" />
          </Box>
        </Box>

        {/* Main Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={mainTab}
            onChange={(e, v) => setMainTab(v)}
            variant="fullWidth"
          >
            <Tab label="Theory" icon={<MenuBookIcon />} iconPosition="start" />
            <Tab label="Analysis" icon={<CalculateIcon />} iconPosition="start" />
            <Tab label="Simulations" icon={<TimelineIcon />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Fade in={true} key={mainTab}>
          <Box>
            {mainTab === 0 && renderTheory()}
            {mainTab === 1 && renderAnalysis()}
            {mainTab === 2 && renderSimulations()}
          </Box>
        </Fade>
      </Container>
  );
};

export default TTestCompleteModule;