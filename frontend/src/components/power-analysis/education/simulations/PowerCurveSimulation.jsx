/**
 * Power Curve Simulation
 *
 * Interactive visualization showing the relationship between:
 * - Sample size (n)
 * - Effect size (d)
 * - Significance level (α)
 * - Statistical power (1 - β)
 *
 * Features:
 * - Multiple power curves for different effect sizes
 * - Interactive parameter sliders
 * - 80% power reference line
 * - Sample size finder for target power
 * - Comparison across test types
 * - Export capability
 *
 * This visualization helps researchers understand how much sample size
 * they need to achieve adequate power for different effect sizes.
 *
 * References:
 * - Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
 * - Faul, F. et al. (2007). G*Power 3.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  Tooltip,
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
  IconButton,
  Switch,
  FormControlLabel,
  TextField
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
  ComposedChart
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import TableChartIcon from '@mui/icons-material/TableChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import CalculateIcon from '@mui/icons-material/Calculate';
import InfoIcon from '@mui/icons-material/Info';

// Import power calculation functions
import {
  generatePowerCurve,
  findSampleSizeForPower,
  powerTwoSampleTTest,
  powerOneSampleTTest,
  powerPairedTTest,
  powerOneWayANOVA,
  powerCorrelation,
  powerMannWhitneyU,
  powerWilcoxonSignedRank,
  powerKruskalWallis
} from '../utils/powerCalculations';

/**
 * Effect size benchmarks and colors
 */
const EFFECT_SIZE_CONFIG = {
  small: { d: 0.2, f: 0.10, r: 0.10, color: '#2196f3', label: 'Small' },
  medium: { d: 0.5, f: 0.25, r: 0.30, color: '#ff9800', label: 'Medium' },
  large: { d: 0.8, f: 0.40, r: 0.50, color: '#f44336', label: 'Large' }
};

/**
 * Test type configurations
 */
const TEST_TYPES = [
  { value: 'two-sample-t', label: 'Two-Sample t-Test', effectType: 'd' },
  { value: 'one-sample-t', label: 'One-Sample t-Test', effectType: 'd' },
  { value: 'paired-t', label: 'Paired t-Test', effectType: 'd' },
  { value: 'anova', label: 'One-Way ANOVA', effectType: 'f' },
  { value: 'correlation', label: 'Correlation', effectType: 'r' },
  { value: 'mann-whitney', label: 'Mann-Whitney U', effectType: 'd' },
  { value: 'wilcoxon', label: 'Wilcoxon Signed-Rank', effectType: 'd' },
  { value: 'kruskal-wallis', label: 'Kruskal-Wallis', effectType: 'f' }
];

/**
 * Main Power Curve Simulation Component
 */
const PowerCurveSimulation = ({ embedded = false }) => {
  // Test parameters
  const [testType, setTestType] = useState('two-sample-t');
  const [alpha, setAlpha] = useState(0.05);
  const [nGroups, setNGroups] = useState(3);  // For ANOVA/Kruskal-Wallis

  // Sample size range
  const [minN, setMinN] = useState(10);
  const [maxN, setMaxN] = useState(150);

  // Custom effect sizes
  const [showCustomEffect, setShowCustomEffect] = useState(false);
  const [customEffectSize, setCustomEffectSize] = useState(0.35);

  // Target power for sample size calculation
  const [targetPower, setTargetPower] = useState(0.80);

  // Display options
  const [showSmall, setShowSmall] = useState(true);
  const [showMedium, setShowMedium] = useState(true);
  const [showLarge, setShowLarge] = useState(true);
  const [showTable, setShowTable] = useState(false);

  // Get effect type for current test
  const currentTestConfig = TEST_TYPES.find(t => t.value === testType);
  const effectType = currentTestConfig?.effectType || 'd';

  // Generate power curve data
  const powerCurveData = useMemo(() => {
    const sampleSizes = [];
    for (let n = minN; n <= maxN; n += Math.max(1, Math.floor((maxN - minN) / 50))) {
      sampleSizes.push(n);
    }
    // Ensure maxN is included
    if (sampleSizes[sampleSizes.length - 1] !== maxN) {
      sampleSizes.push(maxN);
    }

    const effectSizes = [];
    if (showSmall) effectSizes.push({ key: 'small', value: EFFECT_SIZE_CONFIG.small[effectType] });
    if (showMedium) effectSizes.push({ key: 'medium', value: EFFECT_SIZE_CONFIG.medium[effectType] });
    if (showLarge) effectSizes.push({ key: 'large', value: EFFECT_SIZE_CONFIG.large[effectType] });
    if (showCustomEffect) effectSizes.push({ key: 'custom', value: customEffectSize });

    const data = sampleSizes.map(n => {
      const point = { n };

      effectSizes.forEach(({ key, value }) => {
        let power;
        const options = { k: nGroups, alternative: 'two-sided' };

        switch (testType) {
          case 'two-sample-t':
            power = powerTwoSampleTTest(n, n, value, alpha, 'two-sided').power;
            break;
          case 'one-sample-t':
            power = powerOneSampleTTest(n, value, alpha, 'two-sided').power;
            break;
          case 'paired-t':
            power = powerPairedTTest(n, value, alpha, 'two-sided').power;
            break;
          case 'anova':
            power = powerOneWayANOVA(n, nGroups, value, alpha).power;
            break;
          case 'correlation':
            power = powerCorrelation(n, value, alpha, 'two-sided').power;
            break;
          case 'mann-whitney':
            power = powerMannWhitneyU(n, n, value, alpha, 'two-sided').power;
            break;
          case 'wilcoxon':
            power = powerWilcoxonSignedRank(n, value, alpha, 'two-sided').power;
            break;
          case 'kruskal-wallis':
            power = powerKruskalWallis(n, nGroups, value, alpha).power;
            break;
          default:
            power = powerTwoSampleTTest(n, n, value, alpha, 'two-sided').power;
        }

        point[key] = Math.round(power * 1000) / 1000;  // Round to 3 decimal places
        point[`${key}_percent`] = (power * 100).toFixed(1);
      });

      return point;
    });

    return data;
  }, [testType, alpha, minN, maxN, nGroups, showSmall, showMedium, showLarge, showCustomEffect, customEffectSize, effectType]);

  // Calculate required sample sizes for target power
  const requiredSampleSizes = useMemo(() => {
    const results = {};
    const effectSizes = [
      { key: 'small', value: EFFECT_SIZE_CONFIG.small[effectType], label: 'Small' },
      { key: 'medium', value: EFFECT_SIZE_CONFIG.medium[effectType], label: 'Medium' },
      { key: 'large', value: EFFECT_SIZE_CONFIG.large[effectType], label: 'Large' }
    ];

    effectSizes.forEach(({ key, value, label }) => {
      const result = findSampleSizeForPower(testType, value, targetPower, alpha, { k: nGroups });
      results[key] = {
        n: result.n,
        achievedPower: result.achievedPower,
        effectSize: value,
        label
      };
    });

    return results;
  }, [testType, alpha, targetPower, nGroups, effectType]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.95)', boxShadow: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Sample Size: n = {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color, fontWeight: 500 }}
            >
              {entry.name}: {(entry.value * 100).toFixed(1)}%
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // Export data to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['Sample Size (n)', 'Small Effect Power', 'Medium Effect Power', 'Large Effect Power'];
    if (showCustomEffect) headers.push(`Custom (${customEffectSize}) Power`);

    const rows = powerCurveData.map(point => {
      const row = [point.n];
      if (showSmall) row.push(point.small_percent || '');
      if (showMedium) row.push(point.medium_percent || '');
      if (showLarge) row.push(point.large_percent || '');
      if (showCustomEffect) row.push(point.custom_percent || '');
      return row.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `power_curve_${testType}_alpha${alpha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [powerCurveData, testType, alpha, showSmall, showMedium, showLarge, showCustomEffect, customEffectSize]);

  return (
    <Paper elevation={embedded ? 0 : 3} sx={{ p: 3, bgcolor: 'background.paper' }}>
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineIcon /> Power Curve Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Explore how statistical power changes with sample size for different effect sizes.
            Find the optimal sample size for your study.
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Controls Panel */}
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Test Configuration
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Test Type</InputLabel>
                <Select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  label="Test Type"
                >
                  {TEST_TYPES.map(test => (
                    <MenuItem key={test.value} value={test.value}>
                      {test.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Significance Level (α): <strong>{alpha}</strong>
                </Typography>
                <Slider
                  value={alpha}
                  onChange={(e, v) => setAlpha(v)}
                  min={0.01}
                  max={0.10}
                  step={0.01}
                  marks={[
                    { value: 0.01, label: '0.01' },
                    { value: 0.05, label: '0.05' },
                    { value: 0.10, label: '0.10' }
                  ]}
                  size="small"
                  sx={{ color: '#d32f2f' }}
                />
              </Box>

              {(testType === 'anova' || testType === 'kruskal-wallis') && (
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
                  Sample Size Range: {minN} - {maxN}
                </Typography>
                <Slider
                  value={[minN, maxN]}
                  onChange={(e, v) => { setMinN(v[0]); setMaxN(v[1]); }}
                  min={5}
                  max={300}
                  step={5}
                  size="small"
                  sx={{ color: '#d32f2f' }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Effect Sizes ({effectType === 'd' ? "Cohen's d" : effectType === 'f' ? "Cohen's f" : "r"})
              </Typography>

              <FormControlLabel
                control={<Switch checked={showSmall} onChange={(e) => setShowSmall(e.target.checked)} size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: EFFECT_SIZE_CONFIG.small.color, borderRadius: '50%' }} />
                    <Typography variant="body2">Small ({EFFECT_SIZE_CONFIG.small[effectType]})</Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={<Switch checked={showMedium} onChange={(e) => setShowMedium(e.target.checked)} size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: EFFECT_SIZE_CONFIG.medium.color, borderRadius: '50%' }} />
                    <Typography variant="body2">Medium ({EFFECT_SIZE_CONFIG.medium[effectType]})</Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={<Switch checked={showLarge} onChange={(e) => setShowLarge(e.target.checked)} size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: EFFECT_SIZE_CONFIG.large.color, borderRadius: '50%' }} />
                    <Typography variant="body2">Large ({EFFECT_SIZE_CONFIG.large[effectType]})</Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={<Switch checked={showCustomEffect} onChange={(e) => setShowCustomEffect(e.target.checked)} size="small" />}
                label={<Typography variant="body2">Custom Effect</Typography>}
              />

              {showCustomEffect && (
                <TextField
                  size="small"
                  type="number"
                  label={`Custom ${effectType}`}
                  value={customEffectSize}
                  onChange={(e) => setCustomEffectSize(parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0.01, max: 2, step: 0.01 }}
                  fullWidth
                  sx={{ mt: 1 }}
                />
              )}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<TableChartIcon />}
              onClick={() => setShowTable(!showTable)}
              fullWidth
            >
              {showTable ? 'Hide' : 'Show'} Table
            </Button>
            <Tooltip title="Export to CSV">
              <IconButton onClick={exportToCSV} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>

        {/* Chart */}
        <Grid item xs={12} md={9}>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={powerCurveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="n"
                  label={{ value: 'Sample Size (n per group)', position: 'bottom', offset: 0 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  label={{ value: 'Statistical Power', angle: -90, position: 'insideLeft', offset: 10 }}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />

                {/* 80% Power Reference Line */}
                <ReferenceLine
                  y={0.8}
                  stroke="#666"
                  strokeDasharray="5 5"
                  label={{ value: '80% Power', position: 'right', fontSize: 11 }}
                />

                {/* Power Curves */}
                {showSmall && (
                  <Line
                    type="monotone"
                    dataKey="small"
                    name={`Small (${effectType}=${EFFECT_SIZE_CONFIG.small[effectType]})`}
                    stroke={EFFECT_SIZE_CONFIG.small.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showMedium && (
                  <Line
                    type="monotone"
                    dataKey="medium"
                    name={`Medium (${effectType}=${EFFECT_SIZE_CONFIG.medium[effectType]})`}
                    stroke={EFFECT_SIZE_CONFIG.medium.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showLarge && (
                  <Line
                    type="monotone"
                    dataKey="large"
                    name={`Large (${effectType}=${EFFECT_SIZE_CONFIG.large[effectType]})`}
                    stroke={EFFECT_SIZE_CONFIG.large.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showCustomEffect && (
                  <Line
                    type="monotone"
                    dataKey="custom"
                    name={`Custom (${effectType}=${customEffectSize})`}
                    stroke="#9c27b0"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Box>

          {/* Sample Size Requirements Card */}
          <Card variant="outlined" sx={{ mt: 2, bgcolor: 'background.default' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CalculateIcon color="error" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Required Sample Sizes for {(targetPower * 100).toFixed(0)}% Power
                </Typography>
                <Slider
                  value={targetPower}
                  onChange={(e, v) => setTargetPower(v)}
                  min={0.70}
                  max={0.95}
                  step={0.05}
                  marks={[
                    { value: 0.70, label: '70%' },
                    { value: 0.80, label: '80%' },
                    { value: 0.90, label: '90%' }
                  ]}
                  sx={{ width: 200, ml: 2, color: '#d32f2f' }}
                  size="small"
                />
              </Box>

              <Grid container spacing={2}>
                {Object.entries(requiredSampleSizes).map(([key, data]) => (
                  <Grid item xs={12} sm={4} key={key}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: 'background.paper',
                        borderLeft: `4px solid ${EFFECT_SIZE_CONFIG[key].color}`
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {data.label} Effect ({effectType}={data.effectSize})
                      </Typography>
                      <Typography variant="h4" sx={{ color: EFFECT_SIZE_CONFIG[key].color, fontWeight: 700 }}>
                        n = {data.n}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Achieved: {(data.achievedPower * 100).toFixed(1)}% power
                      </Typography>
                      {testType.includes('two-sample') || testType.includes('mann-whitney') ? (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Total N = {data.n * 2} (both groups)
                        </Typography>
                      ) : testType.includes('anova') || testType.includes('kruskal') ? (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Total N = {data.n * nGroups} ({nGroups} groups)
                        </Typography>
                      ) : null}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Table */}
      {showTable && (
        <TableContainer component={Paper} sx={{ mt: 3, maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>n</TableCell>
                {showSmall && <TableCell sx={{ fontWeight: 600, color: EFFECT_SIZE_CONFIG.small.color }}>Small</TableCell>}
                {showMedium && <TableCell sx={{ fontWeight: 600, color: EFFECT_SIZE_CONFIG.medium.color }}>Medium</TableCell>}
                {showLarge && <TableCell sx={{ fontWeight: 600, color: EFFECT_SIZE_CONFIG.large.color }}>Large</TableCell>}
                {showCustomEffect && <TableCell sx={{ fontWeight: 600, color: '#9c27b0' }}>Custom</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {powerCurveData.filter((_, i) => i % 3 === 0).map((row) => (
                <TableRow key={row.n} hover>
                  <TableCell>{row.n}</TableCell>
                  {showSmall && <TableCell>{row.small_percent}%</TableCell>}
                  {showMedium && <TableCell>{row.medium_percent}%</TableCell>}
                  {showLarge && <TableCell>{row.large_percent}%</TableCell>}
                  {showCustomEffect && <TableCell>{row.custom_percent}%</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Educational Note */}
      <Alert severity="info" sx={{ mt: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>Practical Guidance:</strong> For most research, aim for 80% power (β = 0.20).
          This provides a 4:1 ratio of Type II to Type I error, balancing the costs of false negatives
          against false positives. Note that detecting <em>small</em> effects requires substantially
          larger samples than <em>large</em> effects.
        </Typography>
      </Alert>
    </Paper>
  );
};

export default PowerCurveSimulation;
