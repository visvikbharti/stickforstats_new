/**
 * Power Analysis Step
 *
 * Step 4 of the Study Design Wizard.
 * Calculates required sample size on the backend, against the exact non-central distributions.
 * Integrates with existing power calculation utilities.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

import { runSampleSizeCalculation, runPowerCurve, isPowerTestSupported } from '../../utils/hubTestService';

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
 * This step used to compute its own power, and it called the calculator with the arguments in
 * the WRONG ORDER. Not approximately wrong -- structurally wrong:
 *
 *     powerTwoSampleTTest(n1, n2, d, alpha, alternative)          <- the real signature
 *     powerTwoSampleTTest(params.n, params.effectSize, params.alpha, params.tails)   <- the call
 *
 * so n2 received the effect size (0.5), d received alpha (0.05), and alpha received the number of
 * tails (2). Executed, that returns **power = 1.0** with df = 62.5 and a null critical value:
 * every t-test design the wizard has ever shown a user was reported as having 100% power.
 *
 * The ANOVA path was the same shape -- powerOneWayANOVA(nPerGroup, k, f, alpha) called with
 * (n, effectSize, alpha, numGroups) -- and produced dfBetween = -0.5, a NEGATIVE degrees of
 * freedom, which it rendered without complaint. In sample-size mode it asked for 150 subjects per
 * group and simultaneously reported the resulting design had a power of 7.2e-9.
 *
 * And every `alternative` slot received the NUMBER `tails` (1 or 2) rather than the string
 * 'two-sided', so even the calls whose argument order was right fell through to the one-sided
 * branch: a user who selected a two-tailed hypothesis got a one-tailed critical value.
 *
 * All of it now runs on the backend, against the exact non-central distributions. There is no
 * local fallback: the `catch` here used to substitute Math.ceil((2.8 / d)^2) -- a hardcoded
 * (1.96 + 0.84) closed form -- and present it as the answer, so a failed calculation was
 * indistinguishable from a successful one.
 */

const PowerAnalysisStep = ({ data, updateData, errors }) => {
  const { powerAnalysis, testSelection, variables, studyType } = data;

  // Local state for immediate UI updates
  const [localEffectSize, setLocalEffectSize] = useState(powerAnalysis.effectSize);
  const [localAlpha, setLocalAlpha] = useState(powerAnalysis.alpha);
  const [localPower, setLocalPower] = useState(powerAnalysis.power);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [powerCurveData, setPowerCurveData] = useState([]);

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

  // The hypothesis decides the alternative. It must be the STRING the backend expects, not the
  // number of tails -- passing 2 where a string was wanted is what silently made every
  // two-tailed design one-tailed.
  const alternative = variables.hypothesisType === 'two-tailed' ? 'two-sided' : 'greater';

  // The old lookup ended in `|| calculators['independent-t'][mode]`, so an unsupported test --
  // a factorial ANOVA, a logistic regression, a Friedman -- was quietly given a two-sample
  // t-test sample size under its own name. We now say we cannot do it.
  const testSupported = isPowerTestSupported(testSelection.selectedTest);

  /**
   * Calculate the required sample size, on the backend.
   */
  const calculateSampleSize = useCallback(async () => {
    setIsCalculating(true);
    setCalcError(null);

    try {
      const result = await runSampleSizeCalculation({
        testType: testSelection.selectedTest,
        effectSize: localEffectSize,
        power: localPower,
        alpha: localAlpha,
        groups: numGroups,
        alternative,
      });

      if (result.requiredN === null) {
        throw new Error('The backend did not return a sample size for this design.');
      }

      updateData('powerAnalysis', {
        effectSize: localEffectSize,
        effectSizeType,
        alpha: localAlpha,
        power: localPower,
        calculatedSampleSize: result.requiredN,
        sampleSizePerGroup: result.perGroup ?? result.requiredN,
        totalSampleSize: result.totalN ?? result.requiredN,
        // The power the design will ACTUALLY have at that integer n -- at or just above the
        // target, never below. Shown so the two numbers can be compared.
        achievedPower: result.actualPower,
        numberOfGroups: result.groups ?? 1,
      });
    } catch (error) {
      // No fallback. A number invented here is indistinguishable from one that was computed.
      setCalcError(error.message);
    } finally {
      setIsCalculating(false);
    }
  }, [
    localEffectSize,
    localAlpha,
    localPower,
    alternative,
    numGroups,
    testSelection.selectedTest,
    effectSizeType,
    updateData,
  ]);

  /**
   * Power curve, also from the backend.
   */
  useEffect(() => {
    let cancelled = false;
    if (!testSupported) {
      setPowerCurveData([]);
      return undefined;
    }

    runPowerCurve({
      testType: testSelection.selectedTest,
      effectSize: localEffectSize,
      alpha: localAlpha,
      groups: numGroups,
      alternative,
      nMin: 5,
      nMax: 300,
      step: 5,
    })
      .then((points) => {
        // The chart keys on powerPercent (0-100); the service speaks power (0-1).
        if (!cancelled) setPowerCurveData(points.map((p) => ({ ...p, powerPercent: p.power * 100 })));
      })
      .catch(() => {
        // A missing curve is a missing chart, not a wrong one.
        if (!cancelled) setPowerCurveData([]);
      });

    return () => {
      cancelled = true;
    };
  }, [localEffectSize, localAlpha, numGroups, alternative, testSelection.selectedTest, testSupported]);

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

      {calcError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          The sample size could not be calculated: {calcError}
        </Alert>
      )}

      {!testSupported && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          A sample-size calculation is not available for{' '}
          <strong>{testSelection.selectedTest}</strong>. Repeated-measures and factorial designs
          have different degrees of freedom from a one-way ANOVA, and regression power needs an
          F-test on f² — neither is a t-test, so we will not give you a t-test answer under
          another name. Use G*Power for this design, or pick a supported test.
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
                <strong>Groups:</strong> {numGroups} |{' '}
                <strong>Tails:</strong> {alternative === 'two-sided' ? 2 : 1}
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
              disabled={isCalculating || !testSupported}
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
                  {/*
                    The target and the power the design will actually have are different numbers.
                    n is an integer, so the smallest n that clears the target lands slightly above
                    it -- never below. Both are shown; the old code showed only the target, which
                    is the number the user typed in rather than anything that was computed.
                  */}
                  {powerAnalysis.achievedPower != null && (
                    <Typography variant="caption" color="text.secondary">
                      achieved: {(powerAnalysis.achievedPower * 100).toFixed(1)}%
                    </Typography>
                  )}
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
          <strong>Reference:</strong> Cohen, J. (1988). Statistical Power Analysis for the
          Behavioral Sciences (2nd ed.). Computed from the exact non-central t and F distributions
          and verified against statsmodels. (We have not run G*Power itself, so we no longer claim
          to have been validated against it.)
        </Typography>
      </Alert>
    </Box>
  );
};

export default PowerAnalysisStep;
