/**
 * Normality Tests Component
 *
 * Tests if data follows a normal distribution:
 * - Shapiro-Wilk Test (most powerful for n < 2000)
 * - Anderson-Darling Test (good for detecting deviations in tails)
 * - D'Agostino K² Test (combines skewness and kurtosis)
 * - Visual diagnostics: Q-Q Plot, Histogram with KDE
 */

import React, { useState, useMemo } from 'react';
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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { shapiroWilkTest, andersonDarlingTest, calculateDescriptiveStats } from '../utils/statisticalUtils';

/**
 * Main Normality Tests Component
 */
const NormalityTests = ({ data }) => {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [alpha, setAlpha] = useState(0.05);

  /**
   * Detect numeric columns
   */
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const columns = [];
    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      if (numericCount / values.length > 0.8) {
        columns.push(key);
      }
    });

    return columns;
  }, [data]);

  /**
   * Get column data
   */
  const columnData = useMemo(() => {
    if (!selectedColumn || !data) return [];

    return data
      .map(row => parseFloat(row[selectedColumn]))
      .filter(v => !isNaN(v));
  }, [data, selectedColumn]);

  /**
   * Calculate descriptive statistics
   */
  const stats = useMemo(() => {
    if (columnData.length === 0) return null;
    return calculateDescriptiveStats(columnData);
  }, [columnData]);

  /**
   * Standard normal CDF (approximation)
   * MUST be defined before useMemo hooks that use it
   */
  const normalCDF = (z) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };

  /**
   * Chi-square CDF (approximation for df=2)
   * MUST be defined before useMemo hooks that use it
   */
  const chiSquareCDF = (x, df) => {
    if (df === 2) {
      return 1 - Math.exp(-x / 2);
    }
    // For other df, use a rough approximation
    return normalCDF((Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df)));
  };

  /**
   * Inverse normal CDF (approximation)
   * MUST be defined before useMemo hooks that use it
   */
  const inverseNormalCDF = (p) => {
    // Approximation using rational function
    if (p < 0.5) {
      const t = Math.sqrt(-2 * Math.log(p));
      return -(t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
        (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t));
    } else {
      const t = Math.sqrt(-2 * Math.log(1 - p));
      return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
        (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
    }
  };

  /**
   * Perform Shapiro-Wilk test
   */
  const shapiroResult = useMemo(() => {
    if (columnData.length < 3) return null;
    return shapiroWilkTest(columnData);
  }, [columnData]);

  /**
   * Perform Anderson-Darling test
   */
  const andersonResult = useMemo(() => {
    if (columnData.length < 7) return null;
    return andersonDarlingTest(columnData);
  }, [columnData]);

  /**
   * D'Agostino K² Test (combines skewness and kurtosis)
   */
  const dAgostinoResult = useMemo(() => {
    if (!stats || columnData.length < 20) return null;

    // Test for skewness (should be near 0 for normal distribution)
    const skewnessZ = Math.abs(stats.skewness) / Math.sqrt(6 / columnData.length);
    const skewnessPValue = 2 * (1 - normalCDF(Math.abs(skewnessZ)));

    // Test for kurtosis (should be near 0 for normal distribution, excess kurtosis)
    const kurtosisZ = Math.abs(stats.kurtosis) / Math.sqrt(24 / columnData.length);
    const kurtosisPValue = 2 * (1 - normalCDF(Math.abs(kurtosisZ)));

    // Combine using K² statistic
    const k2 = skewnessZ ** 2 + kurtosisZ ** 2;
    const pValue = 1 - chiSquareCDF(k2, 2);

    return {
      statistic: k2,
      pValue: pValue,
      skewness: stats.skewness,
      kurtosis: stats.kurtosis,
      isNormal: pValue > alpha
    };
  }, [stats, columnData, alpha]);

  /**
   * Prepare Q-Q Plot data
   */
  const qqPlotData = useMemo(() => {
    if (columnData.length === 0) return [];

    const sorted = [...columnData].sort((a, b) => a - b);
    const n = sorted.length;

    return sorted.map((value, i) => {
      // Theoretical quantile (standard normal)
      const p = (i + 0.5) / n;
      const theoreticalQuantile = inverseNormalCDF(p);

      // Sample quantile (standardized)
      const standardized = stats ? (value - stats.mean) / stats.std : value;

      return {
        theoretical: theoreticalQuantile,
        sample: standardized,
        original: value
      };
    });
  }, [columnData, stats]);

  /**
   * Prepare histogram data with normal overlay
   */
  const histogramData = useMemo(() => {
    if (columnData.length === 0 || !stats) return [];

    const numBins = Math.min(30, Math.ceil(Math.sqrt(columnData.length)));
    const binWidth = (stats.max - stats.min) / numBins;

    const bins = Array(numBins).fill(0);
    columnData.forEach(value => {
      const binIndex = Math.min(Math.floor((value - stats.min) / binWidth), numBins - 1);
      bins[binIndex]++;
    });

    // Calculate normal distribution overlay
    return bins.map((count, i) => {
      const binCenter = stats.min + (i + 0.5) * binWidth;
      const density = count / columnData.length;

      // Normal distribution PDF
      const z = (binCenter - stats.mean) / stats.std;
      const normalDensity = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * binWidth;

      return {
        binCenter: binCenter.toFixed(2),
        observed: density,
        expected: normalDensity,
        count: count
      };
    });
  }, [columnData, stats]);

  /**
   * Render data requirement message
   */
  if (!data || data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="info">
          <Typography variant="body1">
            Please upload a dataset in the <strong>Data Profiling</strong> module first.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  if (numericColumns.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            No numeric columns found in the dataset. Normality tests require numeric data.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Configuration Panel */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon /> Normality Tests Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Column</InputLabel>
              <Select
                value={selectedColumn}
                label="Select Column"
                onChange={(e) => setSelectedColumn(e.target.value)}
              >
                <MenuItem value="">
                  <em>Choose a column...</em>
                </MenuItem>
                {numericColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Significance Level (α)</InputLabel>
              <Select
                value={alpha}
                label="Significance Level (α)"
                onChange={(e) => setAlpha(e.target.value)}
              >
                <MenuItem value={0.01}>0.01 (99% confidence)</MenuItem>
                <MenuItem value={0.05}>0.05 (95% confidence)</MenuItem>
                <MenuItem value={0.10}>0.10 (90% confidence)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Results */}
      {selectedColumn && columnData.length > 0 && (
        <>
          {/* Descriptive Statistics */}
          {stats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Sample Size</Typography>
                    <Typography variant="h6">{stats.count}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Mean ± SD</Typography>
                    <Typography variant="h6">{stats.mean.toFixed(2)} ± {stats.std.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Skewness</Typography>
                    <Typography variant="h6">{stats.skewness.toFixed(3)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.abs(stats.skewness) < 0.5 ? 'Approximately symmetric' :
                       stats.skewness > 0 ? 'Right-skewed' : 'Left-skewed'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Kurtosis</Typography>
                    <Typography variant="h6">{stats.kurtosis.toFixed(3)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.abs(stats.kurtosis) < 0.5 ? 'Approximately normal' :
                       stats.kurtosis > 0 ? 'Heavy-tailed' : 'Light-tailed'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Test Results Table */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Normality Test Results (α = {alpha})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Test</strong></TableCell>
                    <TableCell align="right"><strong>Statistic</strong></TableCell>
                    <TableCell align="right"><strong>p-value</strong></TableCell>
                    <TableCell align="center"><strong>Result</strong></TableCell>
                    <TableCell><strong>Interpretation</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Shapiro-Wilk */}
                  {shapiroResult && (
                    <TableRow>
                      <TableCell>Shapiro-Wilk</TableCell>
                      <TableCell align="right">{shapiroResult.statistic.toFixed(4)}</TableCell>
                      <TableCell align="right">{shapiroResult.pValue.toFixed(4)}</TableCell>
                      <TableCell align="center">
                        {shapiroResult.isNormal ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label="Normal"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<CancelOutlinedIcon />}
                            label="Not Normal"
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {shapiroResult.isNormal
                          ? `Data appears normally distributed (p > ${alpha})`
                          : `Data deviates from normal distribution (p < ${alpha})`}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Anderson-Darling */}
                  {andersonResult && (
                    <TableRow>
                      <TableCell>Anderson-Darling</TableCell>
                      <TableCell align="right">{andersonResult.statistic.toFixed(4)}</TableCell>
                      <TableCell align="right">{andersonResult.pValue.toFixed(4)}</TableCell>
                      <TableCell align="center">
                        {andersonResult.isNormal ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label="Normal"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<CancelOutlinedIcon />}
                            label="Not Normal"
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {andersonResult.isNormal
                          ? 'Data fits normal distribution well'
                          : 'Data shows significant deviation from normality'}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* D'Agostino K² */}
                  {dAgostinoResult && (
                    <TableRow>
                      <TableCell>D'Agostino K²</TableCell>
                      <TableCell align="right">{dAgostinoResult.statistic.toFixed(4)}</TableCell>
                      <TableCell align="right">{dAgostinoResult.pValue.toFixed(4)}</TableCell>
                      <TableCell align="center">
                        {dAgostinoResult.isNormal ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label="Normal"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<CancelOutlinedIcon />}
                            label="Not Normal"
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        Combined test of skewness and kurtosis
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Consensus Interpretation:
              </Typography>
              {shapiroResult && andersonResult && dAgostinoResult && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[shapiroResult, andersonResult, dAgostinoResult].filter(r => r.isNormal).length >= 2 ? (
                    <Alert severity="success" sx={{ width: '100%' }}>
                      <Typography variant="body2">
                        <strong>Majority of tests indicate normality.</strong> The data appears to follow a normal distribution.
                        You can proceed with parametric tests (t-tests, ANOVA).
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ width: '100%' }}>
                      <Typography variant="body2">
                        <strong>Data shows deviation from normality.</strong> Consider using non-parametric tests
                        (Mann-Whitney U, Kruskal-Wallis) or data transformations.
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          </Paper>

          {/* Visual Diagnostics */}
          <Grid container spacing={2}>
            {/* Q-Q Plot */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Q-Q Plot (Quantile-Quantile)
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                  Points should follow the diagonal line for normal distribution
                </Typography>
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="theoretical"
                        name="Theoretical Quantiles"
                        label={{ value: 'Theoretical Quantiles', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="sample"
                        name="Sample Quantiles"
                        label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Paper sx={{ p: 1 }}>
                                <Typography variant="caption" display="block">
                                  Theoretical: {payload[0].value.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Sample: {payload[1].value.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Original: {payload[0].payload.original.toFixed(2)}
                                </Typography>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={qqPlotData} fill="#8884d8" />
                      {/* Reference line y = x */}
                      <ReferenceLine
                        segment={[
                          { x: -3, y: -3 },
                          { x: 3, y: 3 }
                        ]}
                        stroke="#f44336"
                        strokeWidth={2}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Histogram with Normal Overlay */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Histogram with Normal Distribution
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                  Blue bars = observed data, Red line = expected normal distribution
                </Typography>
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="binCenter" label={{ value: selectedColumn, position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Density', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="observed" fill="#8884d8" name="Observed" />
                      <Line type="monotone" dataKey="expected" stroke="#f44336" strokeWidth={2} name="Normal Distribution" dot={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Sample Size Warnings */}
          {columnData.length < 20 && (
            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Small Sample Size (n = {columnData.length}):</strong> Normality tests have low power with small samples.
                Results should be interpreted cautiously. Consider using non-parametric tests.
              </Typography>
            </Alert>
          )}

          {columnData.length > 5000 && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Large Sample Size (n = {columnData.length}):</strong> With large samples, normality tests may detect
                trivial deviations from normality. Focus on visual diagnostics (Q-Q plot, histogram) and practical significance.
              </Typography>
            </Alert>
          )}
        </>
      )}

      {/* Column selection prompt */}
      {!selectedColumn && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select a <strong>numeric column</strong> to test for normality.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default NormalityTests;
