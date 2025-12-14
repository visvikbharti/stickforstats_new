/**
 * Non-Parametric Power Analysis Demo
 *
 * Interactive comparison of parametric vs non-parametric test power.
 *
 * Features:
 * - Side-by-side power curves (t-test vs Mann-Whitney, etc.)
 * - Asymptotic Relative Efficiency (ARE) visualization
 * - Sample size inflation calculator
 * - Robustness demonstration with non-normal data
 * - When to use non-parametric tests guide
 *
 * Educational Purpose:
 * Demonstrates that non-parametric tests:
 * 1. Have slightly lower power for normal data (ARE ≈ 0.955)
 * 2. Can be MORE powerful for non-normal data
 * 3. Are robust to distribution assumptions
 *
 * Scientific Basis:
 * - ARE for Mann-Whitney vs t-test ≈ 3/π ≈ 0.955 (for normal data)
 * - ARE for Wilcoxon vs paired t ≈ 3/π ≈ 0.955
 * - ARE for Kruskal-Wallis vs ANOVA ≈ 3/π ≈ 0.955
 *
 * References:
 * - Lehmann, E.L. (1975). Nonparametrics: Statistical Methods Based on Ranks.
 * - Siegel, S. & Castellan, N.J. (1988). Nonparametric Statistics.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Slider,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Tooltip
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  BarChart,
  Bar
} from 'recharts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

// Import power calculation functions
import {
  powerTwoSampleTTest,
  powerPairedTTest,
  powerOneWayANOVA,
  powerMannWhitneyU,
  powerWilcoxonSignedRank,
  powerKruskalWallis,
  ARE_NORMAL
} from '../utils/powerCalculations';

/**
 * Test pair configurations
 */
const TEST_PAIRS = [
  {
    id: 'independent',
    parametric: { name: 'Two-Sample t-Test', shortName: 't-test' },
    nonparametric: { name: 'Mann-Whitney U', shortName: 'M-W U' },
    description: 'Independent samples comparison'
  },
  {
    id: 'paired',
    parametric: { name: 'Paired t-Test', shortName: 'Paired t' },
    nonparametric: { name: 'Wilcoxon Signed-Rank', shortName: 'Wilcoxon' },
    description: 'Paired/matched samples comparison'
  },
  {
    id: 'groups',
    parametric: { name: 'One-Way ANOVA', shortName: 'ANOVA' },
    nonparametric: { name: 'Kruskal-Wallis H', shortName: 'K-W' },
    description: 'Multiple groups comparison'
  }
];

/**
 * Scenarios for when to use each test type
 */
const SCENARIOS = [
  {
    condition: 'Normal data, equal variances',
    recommendation: 'Parametric',
    icon: <CheckCircleIcon color="success" />,
    reason: 'Parametric tests are optimal (UMPU)'
  },
  {
    condition: 'Non-normal but symmetric',
    recommendation: 'Either',
    icon: <CompareArrowsIcon color="primary" />,
    reason: 'Both work well; parametric slightly more powerful'
  },
  {
    condition: 'Skewed distribution',
    recommendation: 'Non-parametric',
    icon: <WarningIcon color="warning" />,
    reason: 'Parametric tests may have inflated Type I error'
  },
  {
    condition: 'Outliers present',
    recommendation: 'Non-parametric',
    icon: <WarningIcon color="error" />,
    reason: 'Ranks are robust to outliers'
  },
  {
    condition: 'Ordinal data',
    recommendation: 'Non-parametric',
    icon: <CheckCircleIcon color="success" />,
    reason: 'Ranks preserve ordinal information'
  },
  {
    condition: 'Small sample (n < 15)',
    recommendation: 'Non-parametric',
    icon: <WarningIcon color="warning" />,
    reason: 'Normality hard to verify; ranks safer'
  }
];

/**
 * Main Non-Parametric Power Demo Component
 */
const NonParametricPowerDemo = ({ embedded = false }) => {
  // Test selection
  const [testPair, setTestPair] = useState('independent');
  const [nGroups, setNGroups] = useState(3);

  // Parameters
  const [effectSize, setEffectSize] = useState(0.5);
  const [alpha, setAlpha] = useState(0.05);
  const [targetPower, setTargetPower] = useState(0.80);

  // Sample size range
  const [maxN, setMaxN] = useState(100);

  // Get current test pair config
  const currentPair = TEST_PAIRS.find(p => p.id === testPair);

  // Generate power comparison data
  const powerData = useMemo(() => {
    const data = [];
    for (let n = 10; n <= maxN; n += 2) {
      let parametricPower, nonparametricPower;

      switch (testPair) {
        case 'independent':
          parametricPower = powerTwoSampleTTest(n, n, effectSize, alpha, 'two-sided').power;
          nonparametricPower = powerMannWhitneyU(n, n, effectSize, alpha, 'two-sided').power;
          break;
        case 'paired':
          parametricPower = powerPairedTTest(n, effectSize, alpha, 'two-sided').power;
          nonparametricPower = powerWilcoxonSignedRank(n, effectSize, alpha, 'two-sided').power;
          break;
        case 'groups':
          parametricPower = powerOneWayANOVA(n, nGroups, effectSize, alpha).power;
          nonparametricPower = powerKruskalWallis(n, nGroups, effectSize, alpha).power;
          break;
        default:
          parametricPower = powerTwoSampleTTest(n, n, effectSize, alpha, 'two-sided').power;
          nonparametricPower = powerMannWhitneyU(n, n, effectSize, alpha, 'two-sided').power;
      }

      data.push({
        n,
        parametric: Math.round(parametricPower * 1000) / 1000,
        nonparametric: Math.round(nonparametricPower * 1000) / 1000,
        difference: Math.round((parametricPower - nonparametricPower) * 1000) / 1000,
        parametricPercent: (parametricPower * 100).toFixed(1),
        nonparametricPercent: (nonparametricPower * 100).toFixed(1)
      });
    }
    return data;
  }, [testPair, effectSize, alpha, maxN, nGroups]);

  // Calculate required sample sizes for target power
  const sampleSizeComparison = useMemo(() => {
    // Find n for parametric
    let nParametric = 10;
    while (nParametric < 500) {
      let power;
      switch (testPair) {
        case 'independent':
          power = powerTwoSampleTTest(nParametric, nParametric, effectSize, alpha, 'two-sided').power;
          break;
        case 'paired':
          power = powerPairedTTest(nParametric, effectSize, alpha, 'two-sided').power;
          break;
        case 'groups':
          power = powerOneWayANOVA(nParametric, nGroups, effectSize, alpha).power;
          break;
        default:
          power = powerTwoSampleTTest(nParametric, nParametric, effectSize, alpha, 'two-sided').power;
      }
      if (power >= targetPower) break;
      nParametric++;
    }

    // Find n for non-parametric
    let nNonparametric = 10;
    while (nNonparametric < 500) {
      let power;
      switch (testPair) {
        case 'independent':
          power = powerMannWhitneyU(nNonparametric, nNonparametric, effectSize, alpha, 'two-sided').power;
          break;
        case 'paired':
          power = powerWilcoxonSignedRank(nNonparametric, effectSize, alpha, 'two-sided').power;
          break;
        case 'groups':
          power = powerKruskalWallis(nNonparametric, nGroups, effectSize, alpha).power;
          break;
        default:
          power = powerMannWhitneyU(nNonparametric, nNonparametric, effectSize, alpha, 'two-sided').power;
      }
      if (power >= targetPower) break;
      nNonparametric++;
    }

    const inflation = ((nNonparametric - nParametric) / nParametric * 100).toFixed(1);
    const theoreticalInflation = ((1 / ARE_NORMAL - 1) * 100).toFixed(1);

    return {
      nParametric,
      nNonparametric,
      inflation,
      theoreticalInflation
    };
  }, [testPair, effectSize, alpha, targetPower, nGroups]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.95)', boxShadow: 3 }}>
          <Typography variant="subtitle2" gutterBottom>n = {label}</Typography>
          {payload.map((entry, i) => (
            <Typography key={i} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {(entry.value * 100).toFixed(1)}%
            </Typography>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="caption" color="text.secondary">
            Difference: {((payload[0]?.value - payload[1]?.value) * 100).toFixed(1)}%
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper elevation={embedded ? 0 : 3} sx={{ p: 3, bgcolor: '#fff' }}>
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrowsIcon /> Parametric vs Non-Parametric Power
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Compare statistical power between parametric and non-parametric tests.
            Non-parametric tests sacrifice ~5% efficiency for distribution-free robustness.
          </Typography>
        </Box>
      )}

      {/* ARE Highlight */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<TrendingUpIcon />}>
        <Typography variant="body2">
          <strong>Asymptotic Relative Efficiency (ARE):</strong> For normal data, non-parametric tests have
          ARE ≈ <strong>3/π ≈ {(ARE_NORMAL * 100).toFixed(1)}%</strong> compared to parametric tests.
          This means you need about <strong>{((1/ARE_NORMAL - 1) * 100).toFixed(1)}% more samples</strong> for equivalent power.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Test Selection</Typography>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Test Comparison</InputLabel>
                <Select
                  value={testPair}
                  onChange={(e) => setTestPair(e.target.value)}
                  label="Test Comparison"
                >
                  {TEST_PAIRS.map(pair => (
                    <MenuItem key={pair.id} value={pair.id}>
                      {pair.parametric.shortName} vs {pair.nonparametric.shortName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {testPair === 'groups' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Number of Groups: <strong>{nGroups}</strong>
                  </Typography>
                  <Slider
                    value={nGroups}
                    onChange={(e, v) => setNGroups(v)}
                    min={2}
                    max={6}
                    step={1}
                    marks
                    size="small"
                    sx={{ color: '#d32f2f' }}
                  />
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Effect Size (d): <strong>{effectSize}</strong>
                </Typography>
                <Slider
                  value={effectSize}
                  onChange={(e, v) => setEffectSize(v)}
                  min={0.2}
                  max={1.2}
                  step={0.1}
                  marks={[
                    { value: 0.2, label: 'S' },
                    { value: 0.5, label: 'M' },
                    { value: 0.8, label: 'L' }
                  ]}
                  size="small"
                  sx={{ color: '#d32f2f' }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Alpha (α): <strong>{alpha}</strong>
                </Typography>
                <Slider
                  value={alpha}
                  onChange={(e, v) => setAlpha(v)}
                  min={0.01}
                  max={0.10}
                  step={0.01}
                  size="small"
                  sx={{ color: '#d32f2f' }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Target Power: <strong>{(targetPower * 100).toFixed(0)}%</strong>
                </Typography>
                <Slider
                  value={targetPower}
                  onChange={(e, v) => setTargetPower(v)}
                  min={0.70}
                  max={0.95}
                  step={0.05}
                  size="small"
                  sx={{ color: '#d32f2f' }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Sample Size Comparison Card */}
          <Card variant="outlined" sx={{ bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Sample Size for {(targetPower * 100).toFixed(0)}% Power
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {currentPair?.parametric.shortName}
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 700 }}>
                    n = {sampleSizeComparison.nParametric}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {currentPair?.nonparametric.shortName}
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#d32f2f', fontWeight: 700 }}>
                    n = {sampleSizeComparison.nNonparametric}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                Non-parametric requires <strong>+{sampleSizeComparison.inflation}%</strong> more samples
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                (Theoretical: +{sampleSizeComparison.theoreticalInflation}% based on ARE)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Chart */}
        <Grid item xs={12} md={9}>
          <Box sx={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={powerData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="n"
                  label={{ value: 'Sample Size (n per group)', position: 'bottom', offset: 0 }}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  label={{ value: 'Statistical Power', angle: -90, position: 'insideLeft' }}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" />

                {/* 80% Power Reference */}
                <ReferenceLine
                  y={targetPower}
                  stroke="#666"
                  strokeDasharray="5 5"
                  label={{ value: `${(targetPower * 100).toFixed(0)}%`, position: 'right', fontSize: 10 }}
                />

                {/* Parametric curve */}
                <Line
                  type="monotone"
                  dataKey="parametric"
                  name={currentPair?.parametric.name}
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />

                {/* Non-parametric curve */}
                <Line
                  type="monotone"
                  dataKey="nonparametric"
                  name={currentPair?.nonparametric.name}
                  stroke="#d32f2f"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />

                {/* Difference area */}
                <Area
                  type="monotone"
                  dataKey="difference"
                  name="Power Difference"
                  fill="rgba(156, 39, 176, 0.2)"
                  stroke="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>

          {/* When to Use Guide */}
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                When to Use Each Test Type
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Data Condition</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Recommendation</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {SCENARIOS.map((scenario, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {scenario.icon}
                            {scenario.condition}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={scenario.recommendation}
                            size="small"
                            color={
                              scenario.recommendation === 'Parametric' ? 'primary'
                                : scenario.recommendation === 'Non-parametric' ? 'error'
                                  : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {scenario.reason}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Key Takeaway */}
      <Alert severity="success" sx={{ mt: 3 }} icon={<CheckCircleIcon />}>
        <Typography variant="body2">
          <strong>Key Takeaway:</strong> For normal data, parametric tests are slightly more powerful.
          However, non-parametric tests are <em>robust</em> to distribution violations.
          The ~5% efficiency loss is often worth the insurance against assumption violations,
          especially with small samples or unknown distributions.
        </Typography>
      </Alert>
    </Paper>
  );
};

export default NonParametricPowerDemo;
