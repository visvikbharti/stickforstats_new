/**
 * Effect Size & Power Analysis Component
 * =======================================
 *
 * Comprehensive tool for calculating effect sizes and statistical power.
 *
 * Features:
 * - Effect Size Calculator: Cohen's d, Hedges' g, η², ω², r, Cramér's V
 * - Power Analysis: Calculate power given N, or required N given power
 * - Interactive power curves visualization
 * - Sensitivity analysis
 * - Clear interpretation guidelines
 *
 * Backend API: /api/v1/effect-sizes/, /api/v1/power/
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import jStat from 'jstat';
import { runPowerCalculation, runSampleSizeCalculation, runPowerCurve } from '../utils/hubTestService';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  CircularProgress,
  Button,
  TextField,
  Tabs,
  Tab,
  Slider,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import InfoIcon from '@mui/icons-material/Info';
import CalculateIcon from '@mui/icons-material/Calculate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// Effect size interpretation benchmarks
const EFFECT_SIZE_BENCHMARKS = {
  'd': { small: 0.2, medium: 0.5, large: 0.8 },
  'g': { small: 0.2, medium: 0.5, large: 0.8 },
  'r': { small: 0.1, medium: 0.3, large: 0.5 },
  'eta_squared': { small: 0.01, medium: 0.06, large: 0.14 },
  'omega_squared': { small: 0.01, medium: 0.06, large: 0.14 },
  'cramers_v': { small: 0.1, medium: 0.3, large: 0.5 }
};

/**
 * Power has three states, not two: adequate, inadequate, and NOT COMPUTED.
 *
 * The old code collapsed the third into the second. `powerResults.power >= 0.8` is false when
 * power is null, so a failed calculation rendered as an orange "Underpowered (< 80%)" chip -- a
 * confident verdict about a study, produced by a computation that did not happen. And
 * `(null * 100).toFixed(1)` is "0.0", because null coerces to 0, so the headline read "0.0%":
 * not "we could not work this out", but "this design has no chance whatsoever of detecting the
 * effect". Those are very different sentences and only one of them was true.
 */
const formatPercent = (value, digits = 1) =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : `${(value * 100).toFixed(digits)}%`;

const isAdequate = (power) => (power === null || power === undefined || Number.isNaN(power) ? null : power >= 0.8);

const powerLabel = (power) => {
  const adequate = isAdequate(power);
  if (adequate === null) return 'Not computed';
  return adequate ? 'Adequate power (≥ 80%)' : 'Underpowered (< 80%)';
};

const powerChipColor = (power) => {
  const adequate = isAdequate(power);
  if (adequate === null) return 'default';
  return adequate ? 'success' : 'warning';
};

const sampleSizeLabel = (testType) => (testType === 'correlation' ? 'N' : 'N per group');

const xAxisLabel = (testType) =>
  testType === 'correlation' ? 'Sample Size' : 'Sample Size per Group';

const powerInterpretation = (result) => {
  if (result.power === null) {
    return 'Power is not defined for this design, so no value is shown. Check the effect size, α and sample size.';
  }
  const pct = formatPercent(result.power, 1);
  if (result.power >= 0.8) {
    return `With this design you would detect an effect of this size ${pct} of the time. That is at or above the conventional 80% threshold.`;
  }
  return `With this design you would detect an effect of this size only ${pct} of the time — you would miss it ${formatPercent(result.beta, 1)} of the time. Consider increasing the sample size, or switch to "Calculate Required N" to find the size that reaches 80%.`;
};

const sampleSizeInterpretation = (result) => {
  if (result.requiredN === null) return 'No sample size was returned for this design.';

  const unit = result.testType === 'correlation' ? '' : ' per group';
  const total = result.totalN !== null ? ` (${result.totalN} in total)` : '';
  return `You need ${result.requiredN}${unit}${total} to reach ${formatPercent(result.desiredPower, 0)} power against an effect of ${result.effectSize}. At that sample size the power is ${formatPercent(result.actualPower, 1)} — n is an integer, so it lands just above the target rather than exactly on it.`;
};

const EffectSizePower = ({ data }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Colour follows the same three states: green (adequate), amber (underpowered), and neutral
  // grey when there is no power to report. Grey is the one that used to be amber.
  const powerColor = (power) => {
    const adequate = isAdequate(power);
    if (adequate === null) return theme.palette.text.secondary;
    return adequate ? theme.palette.success.main : theme.palette.warning.main;
  };

  const powerCardBg = (power) => {
    const adequate = isAdequate(power);
    if (adequate === null) return 'transparent';
    const palette = adequate ? theme.palette.success : theme.palette.warning;
    return isDarkMode ? palette.dark + '20' : palette.light + '30';
  };

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Effect Size Calculator State
  const [effectTestType, setEffectTestType] = useState('t-test');
  const [inputMode, setInputMode] = useState('statistics'); // 'statistics' or 'data'
  const [selectedColumn1, setSelectedColumn1] = useState('');
  const [selectedColumn2, setSelectedColumn2] = useState('');
  const [selectedGroupColumn, setSelectedGroupColumn] = useState('');

  // Statistics input
  const [mean1, setMean1] = useState('');
  const [mean2, setMean2] = useState('');
  const [sd1, setSd1] = useState('');
  const [sd2, setSd2] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [correlation, setCorrelation] = useState('');
  const [fStatistic, setFStatistic] = useState('');
  const [dfBetween, setDfBetween] = useState('');
  const [dfWithin, setDfWithin] = useState('');
  const [chiSquare, setChiSquare] = useState('');
  const [totalN, setTotalN] = useState('');
  const [minDim, setMinDim] = useState('');

  // Effect Size Results
  const [effectResults, setEffectResults] = useState(null);
  const [effectLoading, setEffectLoading] = useState(false);

  // Power Analysis State
  const [powerTestType, setPowerTestType] = useState('t-test');
  const [powerMode, setPowerMode] = useState('calculate-power'); // or 'calculate-n'
  const [powerEffectSize, setPowerEffectSize] = useState(0.5);
  const [powerAlpha, setPowerAlpha] = useState(0.05);
  const [powerN, setPowerN] = useState(30);
  const [desiredPower, setDesiredPower] = useState(0.80);
  const [alternative, setAlternative] = useState('two-sided');
  const [nGroups, setNGroups] = useState(2);

  // Power Results
  const [powerResults, setPowerResults] = useState(null);
  const [powerLoading, setPowerLoading] = useState(false);
  const [powerCurveData, setPowerCurveData] = useState(null);
  // Monotonic request counter: only the newest request may write to state.
  const powerRequestRef = useRef(0);

  /**
   * Detect column types from data
   */
  const columnInfo = useMemo(() => {
    if (!data || data.length === 0) return { numeric: [], categorical: [] };

    const numeric = [];
    const categorical = [];

    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueCount = new Set(values).size;
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      if (numericCount / values.length > 0.8) {
        numeric.push(key);
      } else if (uniqueCount >= 2 && uniqueCount <= 15) {
        categorical.push(key);
      }
    });

    return { numeric, categorical };
  }, [data]);

  /**
   * Calculate Effect Size
   */
  const calculateEffectSize = useCallback(async () => {
    setEffectLoading(true);
    setEffectResults(null);

    try {
      let result = {};

      if (effectTestType === 't-test') {
        const m1 = parseFloat(mean1);
        const m2 = parseFloat(mean2);
        const s1 = parseFloat(sd1);
        const s2 = parseFloat(sd2);
        const sampleN1 = parseInt(n1);
        const sampleN2 = parseInt(n2);

        if (isNaN(m1) || isNaN(m2) || isNaN(s1) || isNaN(s2)) {
          throw new Error('Please enter valid statistics');
        }

        // Cohen's d (pooled SD)
        const pooledSD = Math.sqrt(((sampleN1 - 1) * s1 * s1 + (sampleN2 - 1) * s2 * s2) / (sampleN1 + sampleN2 - 2));
        const cohensD = (m1 - m2) / pooledSD;

        // Hedges' g (bias corrected)
        const df = sampleN1 + sampleN2 - 2;
        const correctionFactor = 1 - (3 / (4 * df - 1));
        const hedgesG = cohensD * correctionFactor;

        // Glass's delta (uses control group SD)
        const glassDelta = (m1 - m2) / s2;

        // Point-biserial r
        const r = cohensD / Math.sqrt(cohensD * cohensD + 4);

        // 95% CI for Cohen's d (approximate)
        const seD = Math.sqrt((sampleN1 + sampleN2) / (sampleN1 * sampleN2) + (cohensD * cohensD) / (2 * (sampleN1 + sampleN2)));
        const zCrit95 = jStat.normal.inv(0.975, 0, 1);
        const ciLower = cohensD - zCrit95 * seD;
        const ciUpper = cohensD + zCrit95 * seD;

        result = {
          type: 't-test',
          cohens_d: cohensD,
          hedges_g: hedgesG,
          glass_delta: glassDelta,
          point_biserial_r: r,
          ci_lower: ciLower,
          ci_upper: ciUpper,
          interpretation: interpretEffectSize(Math.abs(cohensD), 'd')
        };

      } else if (effectTestType === 'anova') {
        const f = parseFloat(fStatistic);
        const dfB = parseInt(dfBetween);
        const dfW = parseInt(dfWithin);

        if (isNaN(f) || isNaN(dfB) || isNaN(dfW)) {
          throw new Error('Please enter valid ANOVA statistics');
        }

        // Eta squared
        const etaSquared = (f * dfB) / (f * dfB + dfW);

        // Omega squared (less biased)
        const omegaSquared = (f - 1) * dfB / ((f - 1) * dfB + dfW + dfB + 1);

        // Partial eta squared
        const partialEtaSquared = etaSquared;

        // Cohen's f
        const cohensF = Math.sqrt(etaSquared / (1 - etaSquared));

        result = {
          type: 'anova',
          eta_squared: etaSquared,
          omega_squared: Math.max(0, omegaSquared),
          partial_eta_squared: partialEtaSquared,
          cohens_f: cohensF,
          interpretation: interpretEffectSize(etaSquared, 'eta_squared')
        };

      } else if (effectTestType === 'correlation') {
        const r = parseFloat(correlation);

        if (isNaN(r) || r < -1 || r > 1) {
          throw new Error('Please enter a valid correlation (-1 to 1)');
        }

        // R-squared
        const rSquared = r * r;

        // Convert to Cohen's d
        const cohensD = (2 * r) / Math.sqrt(1 - r * r);

        // Fisher's z
        const fishersZ = 0.5 * Math.log((1 + r) / (1 - r));

        result = {
          type: 'correlation',
          r: r,
          r_squared: rSquared,
          cohens_d_equivalent: cohensD,
          fishers_z: fishersZ,
          interpretation: interpretEffectSize(Math.abs(r), 'r')
        };

      } else if (effectTestType === 'chi-square') {
        const chi2 = parseFloat(chiSquare);
        const n = parseInt(totalN);
        const k = parseInt(minDim);

        if (isNaN(chi2) || isNaN(n) || isNaN(k)) {
          throw new Error('Please enter valid chi-square statistics');
        }

        // Phi coefficient (for 2x2)
        const phi = Math.sqrt(chi2 / n);

        // Cramér's V
        const cramersV = Math.sqrt(chi2 / (n * (k - 1)));

        // Odds ratio approximation (for 2x2)
        const oddsRatio = Math.exp(2 * phi);

        result = {
          type: 'chi-square',
          phi: phi,
          cramers_v: cramersV,
          odds_ratio_approx: oddsRatio,
          interpretation: interpretEffectSize(cramersV, 'cramers_v')
        };
      }

      setEffectResults(result);

    } catch (err) {
      setEffectResults({ error: err.message });
    } finally {
      setEffectLoading(false);
    }
  }, [effectTestType, mean1, mean2, sd1, sd2, n1, n2, fStatistic, dfBetween, dfWithin, correlation, chiSquare, totalN, minDim]);

  /**
   * Interpret effect size
   */
  const interpretEffectSize = (value, type) => {
    const benchmarks = EFFECT_SIZE_BENCHMARKS[type] || EFFECT_SIZE_BENCHMARKS['d'];
    const absValue = Math.abs(value);

    if (absValue < benchmarks.small) return 'Negligible';
    if (absValue < benchmarks.medium) return 'Small';
    if (absValue < benchmarks.large) return 'Medium';
    return 'Large';
  };

  /**
   * Power analysis. Runs on the backend, against the exact non-central distributions.
   *
   * It used to run here, on jStat, and every one of the six calculations was wrong:
   *
   *   - t-test power used the NORMAL critical value and the NORMAL CDF instead of the
   *     non-central t, overstating power by up to ~4 points.
   *
   *   - ANOVA power used a normal approximation to the non-central F. At Cohen's f = 0.25 with
   *     4 groups and n = 45 it reported 0.66 where the truth is 0.80 -- it told you that you
   *     were underpowered when you were not. And `sqrt(2 * ncp - dfBetween)` takes the square
   *     root of a NEGATIVE number whenever the effect is small; the NaN that came back was
   *     rendered as a confident "Underpowered (< 80%)". The value was then clamped into
   *     [0.001, 0.999], which is an invented claim in its own right.
   *
   *   - ANOVA sample size was off by a FACTOR of 2.3x to 3.3x: at f = 0.25 with 4 groups it
   *     demanded 126 per group (504 total) where 45 per group (180 total) reaches 80% power.
   *
   *   - t-test sample size used ceil(2 * ((za + zb) / d)^2), which gives 63 for the most common
   *     power analysis in the literature (d = 0.5, alpha = 0.05, power = 0.80). The answer is
   *     64; at 63 the true power is 0.795, not the 0.80 the researcher thinks they have.
   *
   * The one calculation that was right -- correlation, via Fisher's z -- is the one the backend
   * computes the same way, and it still agrees.
   */
  const calculatePower = useCallback(async () => {
    // Click "Calculate" twice with different parameters and the two requests race. If the first
    // is slower, its answer lands last and is shown against the second set of inputs -- a result
    // for a design the user is no longer looking at. Only the most recent request may write.
    const requestId = ++powerRequestRef.current;

    setPowerLoading(true);
    setPowerResults(null);
    setPowerCurveData(null);

    const common = {
      testType: powerTestType,
      effectSize: Number(powerEffectSize),
      alpha: Number(powerAlpha),
      groups: Number(nGroups),
      alternative,
    };

    try {
      const result =
        powerMode === 'calculate-power'
          ? await runPowerCalculation({ ...common, sampleSize: Number(powerN) })
          : await runSampleSizeCalculation({ ...common, power: Number(desiredPower) });

      if (requestId !== powerRequestRef.current) return; // superseded
      setPowerResults(result);

      // The curve is a second, independent request: if it fails, the number the user asked for
      // is still on screen. A missing chart is not a reason to withhold the answer.
      try {
        const curve = await runPowerCurve(common);
        if (requestId === powerRequestRef.current) setPowerCurveData(curve);
      } catch {
        if (requestId === powerRequestRef.current) setPowerCurveData(null);
      }
    } catch (err) {
      if (requestId !== powerRequestRef.current) return;
      setPowerResults({ error: err.message });
    } finally {
      if (requestId === powerRequestRef.current) setPowerLoading(false);
    }
  }, [powerMode, powerTestType, powerEffectSize, powerN, powerAlpha, desiredPower, alternative, nGroups]);


  // Render
  return (
    <Box>
      {/* Tabs */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<CalculateIcon />}
            label="Effect Size Calculator"
            iconPosition="start"
          />
          <Tab
            icon={<TrendingUpIcon />}
            label="Power Analysis"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Effect Size Calculator Tab */}
      {activeTab === 0 && (
        <Box>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Effect Size Calculator
              <Tooltip title="Calculate standardized effect sizes from your test statistics">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Typography>

            <Grid container spacing={3}>
              {/* Test Type Selection */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Test Type</InputLabel>
                  <Select
                    value={effectTestType}
                    label="Test Type"
                    onChange={(e) => {
                      setEffectTestType(e.target.value);
                      setEffectResults(null);
                    }}
                  >
                    <MenuItem value="t-test">t-test (Independent Groups)</MenuItem>
                    <MenuItem value="anova">ANOVA / F-test</MenuItem>
                    <MenuItem value="correlation">Correlation</MenuItem>
                    <MenuItem value="chi-square">Chi-Square</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* t-test Inputs */}
            {effectTestType === 't-test' && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Enter group statistics:
                  </Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Mean 1"
                    type="number"
                    value={mean1}
                    onChange={(e) => setMean1(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Mean 2"
                    type="number"
                    value={mean2}
                    onChange={(e) => setMean2(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="SD 1"
                    type="number"
                    value={sd1}
                    onChange={(e) => setSd1(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="SD 2"
                    type="number"
                    value={sd2}
                    onChange={(e) => setSd2(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="n₁"
                    type="number"
                    value={n1}
                    onChange={(e) => setN1(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="n₂"
                    type="number"
                    value={n2}
                    onChange={(e) => setN2(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            )}

            {/* ANOVA Inputs */}
            {effectTestType === 'anova' && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Enter ANOVA statistics:
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="F statistic"
                    type="number"
                    value={fStatistic}
                    onChange={(e) => setFStatistic(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="df (between)"
                    type="number"
                    value={dfBetween}
                    onChange={(e) => setDfBetween(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="df (within)"
                    type="number"
                    value={dfWithin}
                    onChange={(e) => setDfWithin(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            )}

            {/* Correlation Inputs */}
            {effectTestType === 'correlation' && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Enter correlation coefficient:
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="r (correlation)"
                    type="number"
                    value={correlation}
                    onChange={(e) => setCorrelation(e.target.value)}
                    fullWidth
                    size="small"
                    inputProps={{ min: -1, max: 1, step: 0.01 }}
                  />
                </Grid>
              </Grid>
            )}

            {/* Chi-Square Inputs */}
            {effectTestType === 'chi-square' && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Enter chi-square statistics:
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="χ² statistic"
                    type="number"
                    value={chiSquare}
                    onChange={(e) => setChiSquare(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Total N"
                    type="number"
                    value={totalN}
                    onChange={(e) => setTotalN(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Min dimension (k)"
                    type="number"
                    value={minDim}
                    onChange={(e) => setMinDim(e.target.value)}
                    fullWidth
                    size="small"
                    helperText="Smaller of rows or columns"
                  />
                </Grid>
              </Grid>
            )}

            {/* Calculate Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={calculateEffectSize}
                disabled={effectLoading}
                startIcon={effectLoading ? <CircularProgress size={20} /> : <CalculateIcon />}
              >
                Calculate Effect Size
              </Button>
            </Box>
          </Paper>

          {/* Effect Size Results */}
          {effectResults && !effectResults.error && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Effect Size Results
              </Typography>

              <Grid container spacing={3}>
                {effectResults.type === 't-test' && (
                  <>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30', height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Cohen's d</Typography>
                          <Typography variant="h4">{effectResults.cohens_d?.toFixed(3)}</Typography>
                          <Chip
                            label={effectResults.interpretation}
                            size="small"
                            color={effectResults.interpretation === 'Large' ? 'error' :
                              effectResults.interpretation === 'Medium' ? 'warning' : 'success'}
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Hedges' g</Typography>
                          <Typography variant="h4">{effectResults.hedges_g?.toFixed(3)}</Typography>
                          <Typography variant="caption">Bias-corrected</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Glass's Δ</Typography>
                          <Typography variant="h4">{effectResults.glass_delta?.toFixed(3)}</Typography>
                          <Typography variant="caption">Control SD</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Point-biserial r</Typography>
                          <Typography variant="h4">{effectResults.point_biserial_r?.toFixed(3)}</Typography>
                          <Typography variant="caption">Correlation metric</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="body2">
                          <strong>95% CI for Cohen's d:</strong> [{effectResults.ci_lower?.toFixed(3)}, {effectResults.ci_upper?.toFixed(3)}]
                        </Typography>
                      </Alert>
                    </Grid>
                  </>
                )}

                {effectResults.type === 'anova' && (
                  <>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30', height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">η² (Eta Squared)</Typography>
                          <Typography variant="h4">{effectResults.eta_squared?.toFixed(4)}</Typography>
                          <Chip label={effectResults.interpretation} size="small" sx={{ mt: 1 }} />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">ω² (Omega Squared)</Typography>
                          <Typography variant="h4">{effectResults.omega_squared?.toFixed(4)}</Typography>
                          <Typography variant="caption">Less biased</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Partial η²</Typography>
                          <Typography variant="h4">{effectResults.partial_eta_squared?.toFixed(4)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Cohen's f</Typography>
                          <Typography variant="h4">{effectResults.cohens_f?.toFixed(3)}</Typography>
                          <Typography variant="caption">For power analysis</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}

                {effectResults.type === 'correlation' && (
                  <>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30', height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">r (Correlation)</Typography>
                          <Typography variant="h4">{effectResults.r?.toFixed(3)}</Typography>
                          <Chip label={effectResults.interpretation} size="small" sx={{ mt: 1 }} />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">R²</Typography>
                          <Typography variant="h4">{effectResults.r_squared?.toFixed(4)}</Typography>
                          <Typography variant="caption">Variance explained</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Cohen's d equiv.</Typography>
                          <Typography variant="h4">{effectResults.cohens_d_equivalent?.toFixed(3)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Fisher's z</Typography>
                          <Typography variant="h4">{effectResults.fishers_z?.toFixed(3)}</Typography>
                          <Typography variant="caption">For meta-analysis</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}

                {effectResults.type === 'chi-square' && (
                  <>
                    <Grid item xs={6} md={4}>
                      <Card sx={{ bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30', height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Cramér's V</Typography>
                          <Typography variant="h4">{effectResults.cramers_v?.toFixed(3)}</Typography>
                          <Chip label={effectResults.interpretation} size="small" sx={{ mt: 1 }} />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={4}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Phi (φ)</Typography>
                          <Typography variant="h4">{effectResults.phi?.toFixed(3)}</Typography>
                          <Typography variant="caption">For 2×2 tables</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={4}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Odds Ratio (approx)</Typography>
                          <Typography variant="h4">{effectResults.odds_ratio_approx?.toFixed(2)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Interpretation Guide */}
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Effect Size Benchmarks (Cohen, 1988)</Typography>
                <Typography variant="body2">
                  <strong>Cohen's d / Hedges' g:</strong> Small = 0.2, Medium = 0.5, Large = 0.8<br />
                  <strong>r / Cramér's V:</strong> Small = 0.1, Medium = 0.3, Large = 0.5<br />
                  <strong>η² / ω²:</strong> Small = 0.01, Medium = 0.06, Large = 0.14
                </Typography>
              </Alert>
            </Paper>
          )}

          {effectResults?.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {effectResults.error}
            </Alert>
          )}
        </Box>
      )}

      {/* Power Analysis Tab */}
      {activeTab === 1 && (
        <Box>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Power Analysis
              <Tooltip title="Calculate statistical power or required sample size">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Typography>

            <Grid container spacing={3}>
              {/* Mode Selection */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Analysis Mode</InputLabel>
                  <Select
                    value={powerMode}
                    label="Analysis Mode"
                    onChange={(e) => {
                      setPowerMode(e.target.value);
                      setPowerResults(null);
                    }}
                  >
                    <MenuItem value="calculate-power">Calculate Power (given N)</MenuItem>
                    <MenuItem value="calculate-n">Calculate Sample Size (given Power)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Test Type */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Test Type</InputLabel>
                  <Select
                    value={powerTestType}
                    label="Test Type"
                    onChange={(e) => {
                      setPowerTestType(e.target.value);
                      setPowerResults(null);
                    }}
                  >
                    <MenuItem value="t-test">t-test (Two Groups)</MenuItem>
                    <MenuItem value="anova">ANOVA / F-test</MenuItem>
                    <MenuItem value="correlation">Correlation</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Alternative */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Alternative</InputLabel>
                  <Select
                    value={alternative}
                    label="Alternative"
                    onChange={(e) => setAlternative(e.target.value)}
                  >
                    <MenuItem value="two-sided">Two-sided</MenuItem>
                    {/*
                      This used to be value="one-sided". No mapping recognised that string, so it
                      fell through the backend's `else` into a LEFT-tailed test -- the tail pointing
                      AWAY from the effect -- and the screen reported 0.0% power for a design with
                      88% power. A one-sided power analysis is computed in the hypothesised
                      direction, which is "greater"; the backend now rejects anything else outright.
                    */}
                    <MenuItem value="greater">One-sided (in the hypothesised direction)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Parameters */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Effect Size Slider */}
              <Grid item xs={12} md={powerMode === 'calculate-power' ? 4 : 6}>
                <Typography gutterBottom>
                  Effect Size (d/f/r): <strong>{powerEffectSize.toFixed(2)}</strong>
                </Typography>
                <Slider
                  value={powerEffectSize}
                  onChange={(e, value) => setPowerEffectSize(value)}
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  marks={[
                    { value: 0.2, label: 'Small' },
                    { value: 0.5, label: 'Medium' },
                    { value: 0.8, label: 'Large' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>

              {/* Alpha Level */}
              <Grid item xs={12} md={powerMode === 'calculate-power' ? 4 : 6}>
                <Typography gutterBottom>
                  Significance Level (α): <strong>{powerAlpha}</strong>
                </Typography>
                <Slider
                  value={powerAlpha}
                  onChange={(e, value) => setPowerAlpha(value)}
                  min={0.01}
                  max={0.10}
                  step={0.01}
                  marks={[
                    { value: 0.01, label: '0.01' },
                    { value: 0.05, label: '0.05' },
                    { value: 0.10, label: '0.10' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>

              {/* Sample Size (for calculate-power mode) */}
              {powerMode === 'calculate-power' && (
                <Grid item xs={12} md={4}>
                  <Typography gutterBottom>
                    Sample Size per Group: <strong>{powerN}</strong>
                  </Typography>
                  <Slider
                    value={powerN}
                    onChange={(e, value) => setPowerN(value)}
                    min={5}
                    max={200}
                    step={5}
                    marks={[
                      { value: 20, label: '20' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              )}

              {/* Desired Power (for calculate-n mode) */}
              {powerMode === 'calculate-n' && (
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Desired Power: <strong>{(desiredPower * 100).toFixed(0)}%</strong>
                  </Typography>
                  <Slider
                    value={desiredPower}
                    onChange={(e, value) => setDesiredPower(value)}
                    min={0.50}
                    max={0.99}
                    step={0.05}
                    marks={[
                      { value: 0.80, label: '80%' },
                      { value: 0.90, label: '90%' },
                      { value: 0.95, label: '95%' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              )}

              {/* Number of Groups (for ANOVA) */}
              {powerTestType === 'anova' && (
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Number of Groups"
                    type="number"
                    value={nGroups}
                    onChange={(e) => setNGroups(parseInt(e.target.value) || 2)}
                    fullWidth
                    inputProps={{ min: 2, max: 10 }}
                  />
                </Grid>
              )}
            </Grid>

            {/* Calculate Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={calculatePower}
                disabled={powerLoading}
                startIcon={powerLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              >
                {powerMode === 'calculate-power' ? 'Calculate Power' : 'Calculate Required N'}
              </Button>
            </Box>
          </Paper>

          {/* Power Results */}
          {powerResults && !powerResults.error && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Power Analysis Results
              </Typography>

              <Grid container spacing={3}>
                {powerResults.mode === 'calculate-power' ? (
                  <>
                    <Grid item xs={6} md={4}>
                      <Card sx={{ bgcolor: powerCardBg(powerResults.power), height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Statistical Power</Typography>
                          <Typography variant="h3" sx={{ color: powerColor(powerResults.power) }}>
                            {formatPercent(powerResults.power, 1)}
                          </Typography>
                          <Chip
                            label={powerLabel(powerResults.power)}
                            size="small"
                            color={powerChipColor(powerResults.power)}
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={4}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Type II Error (β)</Typography>
                          <Typography variant="h4">{formatPercent(powerResults.beta, 1)}</Typography>
                          <Typography variant="caption">Probability of a false negative</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Parameters Used</Typography>
                          <Typography variant="body2">Effect size: {powerResults.effectSize}</Typography>
                          <Typography variant="body2">{sampleSizeLabel(powerResults.testType)}: {powerResults.sampleSize}</Typography>
                          {powerResults.groups !== null && (
                            <Typography variant="body2">Groups: {powerResults.groups}</Typography>
                          )}
                          <Typography variant="body2">α: {powerResults.alpha}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={6} md={4}>
                      <Card sx={{ bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30', height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            {powerResults.testType === 'correlation' ? 'Required N' : 'Required N per Group'}
                          </Typography>
                          <Typography variant="h3" sx={{ color: theme.palette.primary.main }}>
                            {powerResults.requiredN ?? '—'}
                          </Typography>
                          <Typography variant="body2">Total N: {powerResults.totalN ?? '—'}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={4}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Power at that N</Typography>
                          <Typography variant="h4">{formatPercent(powerResults.actualPower, 1)}</Typography>
                          {/*
                            The target and the power actually delivered are shown together, and
                            they are not the same number. n is an integer, so the power at the
                            smallest n that clears the target lands slightly ABOVE it -- never
                            below, which is the entire point of solving this exactly instead of
                            rounding a closed form that lands one subject short.
                          */}
                          <Typography variant="caption">
                            Target was {formatPercent(powerResults.desiredPower, 0)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Parameters</Typography>
                          <Typography variant="body2">Effect size: {powerResults.effectSize}</Typography>
                          {powerResults.groups !== null && (
                            <Typography variant="body2">Groups: {powerResults.groups}</Typography>
                          )}
                          <Typography variant="body2">α: {powerResults.alpha}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Power Curve */}
              {powerCurveData && powerCurveData.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Power Curve
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={powerCurveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="n"
                          label={{ value: xAxisLabel(powerResults.testType), position: 'bottom', offset: 0 }}
                        />
                        <YAxis
                          domain={[0, 1]}
                          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                          label={{ value: 'Power', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip
                          formatter={(value, name) => [
                            name === 'power' ? `${(value * 100).toFixed(1)}%` : `${(value * 100).toFixed(0)}%`,
                            name === 'power' ? 'Power' : 'Target'
                          ]}
                          labelFormatter={(label) => `N = ${label}`}
                        />
                        <Legend />
                        <ReferenceLine y={0.8} stroke={theme.palette.warning.main} strokeDasharray="5 5" label={{ value: '80%', position: 'right' }} />
                        <Area
                          type="monotone"
                          dataKey="power"
                          fill={theme.palette.primary.main}
                          fillOpacity={0.3}
                          stroke={theme.palette.primary.main}
                          strokeWidth={2}
                          name="Power"
                        />
                        {powerResults.mode === 'calculate-power' ? (
                          <ReferenceLine x={powerResults.sampleSize} stroke={theme.palette.success.main} strokeWidth={2} label={{ value: `N=${powerResults.sampleSize}`, position: 'top' }} />
                        ) : (
                          powerResults.requiredN !== null && (
                            <ReferenceLine x={powerResults.requiredN} stroke={theme.palette.success.main} strokeWidth={2} label={{ value: `N=${powerResults.requiredN}`, position: 'top' }} />
                          )
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              )}

              {/* Interpretation */}
              <Alert severity={powerResults.power === null && powerResults.mode === 'calculate-power' ? 'warning' : 'info'} sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Interpretation</Typography>
                <Typography variant="body2">
                  {powerResults.mode === 'calculate-power'
                    ? powerInterpretation(powerResults)
                    : sampleSizeInterpretation(powerResults)}
                </Typography>
              </Alert>
            </Paper>
          )}

          {powerResults?.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {powerResults.error}
            </Alert>
          )}

          {/* Guidelines */}
          <Paper elevation={2} sx={{ p: 3, bgcolor: theme.palette.grey[isDarkMode ? 800 : 50] }}>
            <Typography variant="h6" gutterBottom>
              Power Analysis Guidelines
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom color="primary">
                  Recommended Power Levels
                </Typography>
                <Typography variant="body2">
                  • <strong>80%</strong>: Conventional minimum<br />
                  • <strong>90%</strong>: Recommended for important studies<br />
                  • <strong>95%</strong>: For critical decisions
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom color="primary">
                  Effect Size Selection
                </Typography>
                <Typography variant="body2">
                  • Use pilot data or prior studies when possible<br />
                  • Medium effect (d=0.5) is commonly used<br />
                  • Smaller effects require larger samples
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default EffectSizePower;
