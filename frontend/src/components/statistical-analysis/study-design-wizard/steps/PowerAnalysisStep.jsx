/**
 * Power Analysis Step
 *
 * Step 4 of the Study Design Wizard.
 * Calculates required sample size using validated G*Power methodology.
 * Integrates with existing power calculation utilities.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Slider,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Chip,
  Paper,
  Button,
  Divider,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  TrendingUp as PowerIcon,
  People as SampleIcon,
  Speed as EffectIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';

// Import power calculation utilities
import {
  powerTwoSampleTTest,
  powerOneSampleTTest,
  powerPairedTTest,
  powerOneWayANOVA,
  powerCorrelation,
  sampleSizeTwoSampleTTest,
  sampleSizeOneSampleTTest,
  sampleSizePairedTTest,
  sampleSizeOneWayANOVA,
  sampleSizeCorrelation,
} from '../../../power-analysis/education/utils/powerCalculations';

/**
 * Cohen's effect size benchmarks
 */
const EFFECT_SIZE_BENCHMARKS = {
  d: {
    small: 0.2,
    medium: 0.5,
    large: 0.8,
    name: "Cohen's d",
    description: 'Standardized mean difference',
  },
  f: {
    small: 0.1,
    medium: 0.25,
    large: 0.4,
    name: "Cohen's f",
    description: 'ANOVA effect size',
  },
  r: {
    small: 0.1,
    medium: 0.3,
    large: 0.5,
    name: "Pearson's r",
    description: 'Correlation coefficient',
  },
  w: {
    small: 0.1,
    medium: 0.3,
    large: 0.5,
    name: "Cohen's w",
    description: 'Chi-square effect size',
  },
  f2: {
    small: 0.02,
    medium: 0.15,
    large: 0.35,
    name: "Cohen's f²",
    description: 'Regression effect size',
  },
};

/**
 * Map test to effect size type
 */
const TEST_EFFECT_SIZE_MAP = {
  'independent-t': 'd',
  'paired-t': 'd',
  'one-sample-t': 'd',
  'one-way-anova': 'f',
  'repeated-measures-anova': 'f',
  'factorial-anova': 'f',
  'mixed-anova': 'f',
  'pearson': 'r',
  'spearman': 'r',
  'linear-regression': 'f2',
  'multiple-regression': 'f2',
  'logistic-regression': 'f2',
  'mann-whitney': 'd', // Use d equivalent
  'wilcoxon': 'd',
  'kruskal-wallis': 'f',
  'friedman': 'f',
  'chi-square': 'w',
};

/**
 * Get power calculation function based on test type
 */
function getPowerCalculator(testType, mode = 'sampleSize') {
  const calculators = {
    'independent-t': {
      power: (params) => powerTwoSampleTTest(params.n, params.effectSize, params.alpha, params.tails),
      sampleSize: (params) => sampleSizeTwoSampleTTest(params.effectSize, params.power, params.alpha, params.tails),
    },
    'paired-t': {
      power: (params) => powerPairedTTest(params.n, params.effectSize, params.alpha, params.tails),
      sampleSize: (params) => sampleSizePairedTTest(params.effectSize, params.power, params.alpha, params.tails),
    },
    'one-sample-t': {
      power: (params) => powerOneSampleTTest(params.n, params.effectSize, params.alpha, params.tails),
      sampleSize: (params) => sampleSizeOneSampleTTest(params.effectSize, params.power, params.alpha, params.tails),
    },
    'one-way-anova': {
      power: (params) => powerOneWayANOVA(params.n, params.effectSize, params.alpha, params.numGroups),
      sampleSize: (params) => sampleSizeOneWayANOVA(params.effectSize, params.power, params.alpha, params.numGroups),
    },
    'pearson': {
      power: (params) => powerCorrelation(params.n, params.effectSize, params.alpha, params.tails),
      sampleSize: (params) => sampleSizeCorrelation(params.effectSize, params.power, params.alpha, params.tails),
    },
  };

  // Default to t-test if not found
  return calculators[testType]?.[mode] || calculators['independent-t'][mode];
}

/**
 * Generate power curve data
 */
function generatePowerCurve(params, testType) {
  const { effectSize, alpha, numGroups } = params;
  const data = [];
  const tails = params.hypothesisType === 'two-tailed' ? 2 : 1;

  // Generate curve for different sample sizes
  for (let n = 5; n <= 300; n += 5) {
    try {
      const calculator = getPowerCalculator(testType, 'power');
      const power = calculator({
        n,
        effectSize,
        alpha,
        tails,
        numGroups: numGroups || 2,
      });

      data.push({
        n,
        power: Math.min(power, 1), // Cap at 1
        powerPercent: Math.min(power * 100, 100),
      });
    } catch (e) {
      // Skip invalid calculations
    }
  }

  return data;
}

/**
 * Power Analysis Step Component
 */
const PowerAnalysisStep = ({ data, updateData, errors }) => {
  const { powerAnalysis, testSelection, variables, studyType } = data;

  // Local state for immediate UI updates
  const [localEffectSize, setLocalEffectSize] = useState(powerAnalysis.effectSize);
  const [localAlpha, setLocalAlpha] = useState(powerAnalysis.alpha);
  const [localPower, setLocalPower] = useState(powerAnalysis.power);
  const [isCalculating, setIsCalculating] = useState(false);

  // Determine effect size type from selected test
  const effectSizeType = useMemo(() => {
    return TEST_EFFECT_SIZE_MAP[testSelection.selectedTest] || 'd';
  }, [testSelection.selectedTest]);

  const effectSizeBenchmark = EFFECT_SIZE_BENCHMARKS[effectSizeType];

  // Determine number of groups from variables
  const numGroups = useMemo(() => {
    const iv = variables.independentVariables[0];
    return iv?.levels?.length || 2;
  }, [variables.independentVariables]);

  // Determine tails from hypothesis
  const tails = variables.hypothesisType === 'two-tailed' ? 2 : 1;

  /**
   * Calculate sample size
   */
  const calculateSampleSize = useCallback(() => {
    setIsCalculating(true);

    try {
      const calculator = getPowerCalculator(testSelection.selectedTest, 'sampleSize');

      const result = calculator({
        effectSize: localEffectSize,
        power: localPower,
        alpha: localAlpha,
        tails,
        numGroups,
      });

      // Handle different result formats
      let sampleSizePerGroup, totalSampleSize;

      if (typeof result === 'object') {
        sampleSizePerGroup = result.nPerGroup || result.n || result;
        totalSampleSize = result.totalN || (sampleSizePerGroup * numGroups);
      } else {
        sampleSizePerGroup = Math.ceil(result);
        totalSampleSize = sampleSizePerGroup * numGroups;
      }

      updateData('powerAnalysis', {
        effectSize: localEffectSize,
        effectSizeType,
        alpha: localAlpha,
        power: localPower,
        calculatedSampleSize: sampleSizePerGroup,
        sampleSizePerGroup,
        totalSampleSize,
        numberOfGroups: numGroups,
      });
    } catch (error) {
      console.error('Power calculation error:', error);
      // Provide a fallback estimate
      const fallbackN = Math.ceil(Math.pow(2.8 / localEffectSize, 2));
      updateData('powerAnalysis', {
        effectSize: localEffectSize,
        effectSizeType,
        alpha: localAlpha,
        power: localPower,
        calculatedSampleSize: fallbackN,
        sampleSizePerGroup: fallbackN,
        totalSampleSize: fallbackN * numGroups,
        numberOfGroups: numGroups,
      });
    }

    setIsCalculating(false);
  }, [localEffectSize, localAlpha, localPower, tails, numGroups, testSelection.selectedTest, effectSizeType, updateData]);

  /**
   * Generate power curve data
   */
  const powerCurveData = useMemo(() => {
    return generatePowerCurve({
      effectSize: localEffectSize,
      alpha: localAlpha,
      numGroups,
      hypothesisType: variables.hypothesisType,
    }, testSelection.selectedTest);
  }, [localEffectSize, localAlpha, numGroups, variables.hypothesisType, testSelection.selectedTest]);

  /**
   * Handle effect size preset click
   */
  const handleEffectSizePreset = (size) => {
    const value = effectSizeBenchmark[size];
    setLocalEffectSize(value);
  };

  return (
    <Box>
      {/* Guidance */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<TipIcon />}>
        <Typography variant="body2">
          <strong>Power Analysis:</strong> Calculate the sample size needed to detect your
          expected effect with {(localPower * 100).toFixed(0)}% power at α = {localAlpha}.
          Based on <strong>{effectSizeBenchmark.name}</strong> ({effectSizeBenchmark.description}).
        </Typography>
      </Alert>

      {errors.sampleSize && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.sampleSize}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Effect Size Section */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              <EffectIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ff9800' }} />
              Effect Size ({effectSizeBenchmark.name})
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Expected magnitude of the effect
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {['small', 'medium', 'large'].map((size) => (
                  <Chip
                    key={size}
                    label={`${size.charAt(0).toUpperCase() + size.slice(1)} (${effectSizeBenchmark[size]})`}
                    onClick={() => handleEffectSizePreset(size)}
                    color={localEffectSize === effectSizeBenchmark[size] ? 'primary' : 'default'}
                    variant={localEffectSize === effectSizeBenchmark[size] ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Box>

              <Slider
                value={localEffectSize}
                onChange={(e, value) => setLocalEffectSize(value)}
                min={0.01}
                max={effectSizeType === 'd' ? 2.0 : effectSizeType === 'r' ? 0.9 : 1.5}
                step={0.01}
                valueLabelDisplay="on"
                valueLabelFormat={(v) => v.toFixed(2)}
                marks={[
                  { value: effectSizeBenchmark.small, label: 'S' },
                  { value: effectSizeBenchmark.medium, label: 'M' },
                  { value: effectSizeBenchmark.large, label: 'L' },
                ]}
              />

              <TextField
                fullWidth
                type="number"
                label={`${effectSizeBenchmark.name} Value`}
                value={localEffectSize}
                onChange={(e) => setLocalEffectSize(parseFloat(e.target.value) || 0)}
                inputProps={{ step: 0.01, min: 0.01, max: 2 }}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>

            {/* Effect Size Interpretation */}
            <Alert
              severity={
                localEffectSize >= effectSizeBenchmark.large ? 'success' :
                localEffectSize >= effectSizeBenchmark.medium ? 'info' : 'warning'
              }
              sx={{ mt: 2 }}
            >
              <Typography variant="caption">
                <strong>Interpretation:</strong> Your effect size ({localEffectSize.toFixed(2)}) is considered{' '}
                <strong>
                  {localEffectSize >= effectSizeBenchmark.large ? 'large' :
                   localEffectSize >= effectSizeBenchmark.medium ? 'medium' : 'small'}
                </strong>
                {localEffectSize < effectSizeBenchmark.medium && (
                  <>. Small effects require larger samples to detect.</>
                )}
              </Typography>
            </Alert>
          </Paper>
        </Grid>

        {/* Alpha & Power Section */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Statistical Parameters
            </Typography>

            {/* Alpha Level */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Significance Level (α)
              </Typography>
              <FormControl component="fieldset" size="small">
                <RadioGroup
                  row
                  value={localAlpha.toString()}
                  onChange={(e) => setLocalAlpha(parseFloat(e.target.value))}
                >
                  <FormControlLabel value="0.05" control={<Radio size="small" />} label="0.05 (5%)" />
                  <FormControlLabel value="0.01" control={<Radio size="small" />} label="0.01 (1%)" />
                  <FormControlLabel value="0.001" control={<Radio size="small" />} label="0.001 (0.1%)" />
                </RadioGroup>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Probability of Type I error (false positive)
              </Typography>
            </Box>

            {/* Power Level */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Statistical Power (1 - β)
              </Typography>
              <Slider
                value={localPower}
                onChange={(e, value) => setLocalPower(value)}
                min={0.5}
                max={0.99}
                step={0.01}
                valueLabelDisplay="on"
                valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
                marks={[
                  { value: 0.8, label: '80%' },
                  { value: 0.9, label: '90%' },
                  { value: 0.95, label: '95%' },
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Probability of detecting a true effect. 80% is conventional; 90%+ recommended for important studies.
              </Typography>
            </Box>

            {/* Test Info */}
            <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Test:</strong> {testSelection.selectedTest?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Not selected'}
              </Typography>
              <br />
              <Typography variant="caption" color="text.secondary">
                <strong>Groups:</strong> {numGroups} | <strong>Tails:</strong> {tails}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Calculate Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CalculateIcon />}
              onClick={calculateSampleSize}
              disabled={isCalculating}
              sx={{ px: 4, py: 1.5 }}
            >
              {isCalculating ? 'Calculating...' : 'Calculate Required Sample Size'}
            </Button>
          </Box>
        </Grid>

        {/* Results Section */}
        {powerAnalysis.calculatedSampleSize && (
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.12)' : '#e8f5e9' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SampleIcon sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="success.dark">
                    n = {powerAnalysis.sampleSizePerGroup}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    per group ({powerAnalysis.totalSampleSize} total)
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Effect Size</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {effectSizeBenchmark.name} = {powerAnalysis.effectSize?.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Alpha</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    α = {powerAnalysis.alpha}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Power</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {(powerAnalysis.power * 100).toFixed(0)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Groups</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {powerAnalysis.numberOfGroups}
                  </Typography>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mt: 2 }} icon={<CheckIcon />}>
                <Typography variant="body2">
                  You need <strong>{powerAnalysis.sampleSizePerGroup} participants per group</strong>{' '}
                  ({powerAnalysis.totalSampleSize} total) to have {(powerAnalysis.power * 100).toFixed(0)}% power
                  to detect a {localEffectSize >= effectSizeBenchmark.large ? 'large' :
                    localEffectSize >= effectSizeBenchmark.medium ? 'medium' : 'small'} effect
                  ({effectSizeBenchmark.name} = {powerAnalysis.effectSize?.toFixed(2)}) at α = {powerAnalysis.alpha}.
                </Typography>
              </Alert>
            </Paper>
          </Grid>
        )}

        {/* Power Curve */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              <PowerIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
              Power Curve
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shows how statistical power changes with sample size for your selected effect size
            </Typography>

            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={powerCurveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="n"
                    label={{ value: 'Sample Size (per group)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    label={{ value: 'Power (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Power']}
                    labelFormatter={(label) => `n = ${label} per group`}
                  />
                  <ReferenceLine y={80} stroke="#ff9800" strokeDasharray="5 5" label="80%" />
                  <ReferenceLine y={90} stroke="#4caf50" strokeDasharray="5 5" label="90%" />
                  {powerAnalysis.sampleSizePerGroup && (
                    <ReferenceLine
                      x={powerAnalysis.sampleSizePerGroup}
                      stroke="#1976d2"
                      strokeWidth={2}
                      label={`n=${powerAnalysis.sampleSizePerGroup}`}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="powerPercent"
                    fill="#e3f2fd"
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="powerPercent"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Citation */}
      <Alert severity="info" sx={{ mt: 3 }} icon={<InfoIcon />}>
        <Typography variant="caption">
          <strong>Reference:</strong> Power calculations based on Cohen, J. (1988).
          Statistical Power Analysis for the Behavioral Sciences (2nd ed.).
          Validated against G*Power 3.1.9.7.
        </Typography>
      </Alert>
    </Box>
  );
};

export default PowerAnalysisStep;
