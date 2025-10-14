/**
 * Distribution Analysis Component
 *
 * Provides 5 plot types for analyzing variable distributions:
 * 1. Histogram - with optional normal distribution overlay
 * 2. Box Plot - with outlier detection
 * 3. Violin Plot - showing distribution density
 * 4. KDE Plot - kernel density estimation
 * 5. Q-Q Plot - normality assessment
 *
 * Includes comprehensive statistical context and interpretations.
 * Ported from: app/utils/visualization.py (lines 339-581)
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
  Checkbox,
  FormControlLabel,
  Slider,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { calculateDescriptiveStats, createHistogramBins, shapiroWilkTest } from '../utils/statisticalUtils';
import jStat from 'jstat';

/**
 * Distribution Analysis Component
 */
const DistributionAnalysis = ({ data }) => {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [plotType, setPlotType] = useState('histogram');
  const [numBins, setNumBins] = useState(20);
  const [showNormalOverlay, setShowNormalOverlay] = useState(true);

  /**
   * Get numeric columns
   */
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const columns = Object.keys(data[0]);
    return columns.filter(col => typeof data[0][col] === 'number');
  }, [data]);

  /**
   * Get column data
   */
  const columnData = useMemo(() => {
    if (!selectedColumn || !data) return [];
    return data.map(row => row[selectedColumn]).filter(v => typeof v === 'number' && !isNaN(v));
  }, [data, selectedColumn]);

  /**
   * Calculate statistics
   */
  const stats = useMemo(() => {
    if (columnData.length === 0) return null;
    return calculateDescriptiveStats(columnData);
  }, [columnData]);

  /**
   * Perform normality test
   */
  const normalityTest = useMemo(() => {
    if (columnData.length < 3 || columnData.length > 5000) return null;
    return shapiroWilkTest(columnData);
  }, [columnData]);

  /**
   * Create histogram data with normal overlay
   */
  const histogramData = useMemo(() => {
    if (columnData.length === 0) return [];

    const bins = createHistogramBins(columnData, numBins);

    // Add normal distribution overlay
    if (showNormalOverlay && stats) {
      const binWidth = (stats.max - stats.min) / numBins;
      return bins.map(bin => {
        // Calculate normal density at bin midpoint
        const normalDensity = jStat.normal.pdf(bin.midpoint, stats.mean, stats.std);
        return {
          ...bin,
          normalDensity: normalDensity * columnData.length * binWidth
        };
      });
    }

    return bins;
  }, [columnData, numBins, showNormalOverlay, stats]);

  /**
   * Create box plot data
   */
  const boxPlotData = useMemo(() => {
    if (!stats) return null;

    // Calculate outliers (values beyond 1.5 * IQR from Q1/Q3)
    const lowerFence = stats.q1 - 1.5 * stats.iqr;
    const upperFence = stats.q3 + 1.5 * stats.iqr;
    const outliers = columnData.filter(v => v < lowerFence || v > upperFence);

    return {
      min: stats.min,
      q1: stats.q1,
      median: stats.median,
      q3: stats.q3,
      max: stats.max,
      lowerFence,
      upperFence,
      outliers: outliers.map((value, idx) => ({ idx, value }))
    };
  }, [stats, columnData]);

  /**
   * Create violin plot data (density estimation)
   */
  const violinData = useMemo(() => {
    if (columnData.length === 0 || !stats) return [];

    // Create density estimation
    const bandwidth = 1.06 * stats.std * Math.pow(columnData.length, -1/5); // Silverman's rule
    const points = 50;
    const min = stats.min;
    const max = stats.max;
    const step = (max - min) / points;

    const densityData = [];
    for (let i = 0; i <= points; i++) {
      const x = min + i * step;
      // Kernel density estimation (Gaussian kernel)
      let density = 0;
      columnData.forEach(val => {
        const z = (x - val) / bandwidth;
        density += Math.exp(-0.5 * z * z) / (bandwidth * Math.sqrt(2 * Math.PI));
      });
      density /= columnData.length;

      densityData.push({
        value: x,
        density,
        densityLeft: -density,
        densityRight: density
      });
    }

    return densityData;
  }, [columnData, stats]);

  /**
   * Create KDE plot data
   */
  const kdeData = useMemo(() => {
    if (columnData.length === 0 || !stats) return [];

    const bandwidth = 1.06 * stats.std * Math.pow(columnData.length, -1/5);
    const points = 100;
    const min = stats.min - stats.std;
    const max = stats.max + stats.std;
    const step = (max - min) / points;

    const kdePoints = [];
    for (let i = 0; i <= points; i++) {
      const x = min + i * step;
      let density = 0;
      columnData.forEach(val => {
        const z = (x - val) / bandwidth;
        density += Math.exp(-0.5 * z * z) / (bandwidth * Math.sqrt(2 * Math.PI));
      });
      density /= columnData.length;

      kdePoints.push({ value: x, density });
    }

    return kdePoints;
  }, [columnData, stats]);

  /**
   * Create Q-Q plot data
   */
  const qqPlotData = useMemo(() => {
    if (columnData.length === 0) return [];

    // Sort data
    const sorted = [...columnData].sort((a, b) => a - b);
    const n = sorted.length;

    // Calculate theoretical quantiles and sample quantiles
    const qqPoints = sorted.map((value, i) => {
      // Theoretical quantile (standard normal)
      const p = (i + 0.5) / n; // Use median plotting position
      const theoreticalQuantile = jStat.normal.inv(p, 0, 1);

      // Standardize sample value
      const sampleQuantile = stats ? (value - stats.mean) / stats.std : value;

      return {
        theoretical: theoreticalQuantile,
        sample: sampleQuantile,
        original: value
      };
    });

    return qqPoints;
  }, [columnData, stats]);

  /**
   * Handle column selection
   */
  const handleColumnChange = (event) => {
    setSelectedColumn(event.target.value);
  };

  /**
   * Handle plot type change
   */
  const handlePlotTypeChange = (event) => {
    setPlotType(event.target.value);
  };

  /**
   * Render plot based on type
   */
  const renderPlot = () => {
    if (!selectedColumn || columnData.length === 0) {
      return (
        <Alert severity="info">
          Please select a numeric variable to visualize
        </Alert>
      );
    }

    switch (plotType) {
      case 'histogram':
        return (
          <Box>
            {/* Controls */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>Number of Bins: {numBins}</Typography>
                <Slider
                  value={numBins}
                  onChange={(e, val) => setNumBins(val)}
                  min={5}
                  max={50}
                  step={1}
                  marks={[
                    { value: 5, label: '5' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' }
                  ]}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showNormalOverlay}
                      onChange={(e) => setShowNormalOverlay(e.target.checked)}
                    />
                  }
                  label="Show Normal Distribution Overlay"
                />
              </Grid>
            </Grid>

            {/* Histogram */}
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#1976d2" name="Frequency" />
                {showNormalOverlay && (
                  <Line
                    type="monotone"
                    dataKey="normalDensity"
                    stroke="#ff5722"
                    strokeWidth={2}
                    dot={false}
                    name="Normal Distribution"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        );

      case 'boxplot':
        return (
          <Box>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="category" dataKey="name" domain={['Box Plot']} />
                <YAxis dataKey="value" domain={[boxPlotData.min - stats.std, boxPlotData.max + stats.std]} />
                <Tooltip />

                {/* Draw box plot manually */}
                <ReferenceLine y={boxPlotData.median} stroke="#1976d2" strokeWidth={2} />
                <ReferenceLine y={boxPlotData.q1} stroke="#666" strokeDasharray="3 3" />
                <ReferenceLine y={boxPlotData.q3} stroke="#666" strokeDasharray="3 3" />

                {/* Outliers */}
                <Scatter
                  data={boxPlotData.outliers}
                  fill="#ff5722"
                  name="Outliers"
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Box plot statistics */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Min</Typography>
                <Typography variant="body1">{boxPlotData.min.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Q1</Typography>
                <Typography variant="body1">{boxPlotData.q1.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Median</Typography>
                <Typography variant="body1">{boxPlotData.median.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Q3</Typography>
                <Typography variant="body1">{boxPlotData.q3.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Max</Typography>
                <Typography variant="body1">{boxPlotData.max.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">IQR</Typography>
                <Typography variant="body1">{stats.iqr.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Outliers</Typography>
                <Typography variant="body1">{boxPlotData.outliers.length}</Typography>
              </Grid>
            </Grid>
          </Box>
        );

      case 'violin':
        return (
          <Box>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={violinData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="densityLeft"
                  domain={['auto', 'auto']}
                  label={{ value: 'Density', position: 'insideBottom' }}
                />
                <YAxis
                  dataKey="value"
                  label={{ value: selectedColumn, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Line type="monotone" dataKey="densityLeft" stroke="#1976d2" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="densityRight" stroke="#1976d2" strokeWidth={2} dot={false} />
                <ReferenceLine y={stats.median} stroke="#ff5722" strokeWidth={2} label="Median" />
              </LineChart>
            </ResponsiveContainer>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                The violin plot shows the probability density of the data at different values.
                Wider sections indicate higher probability of data points at that value.
              </Typography>
            </Alert>
          </Box>
        );

      case 'kde':
        return (
          <Box>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={kdeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="value"
                  label={{ value: selectedColumn, position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  label={{ value: 'Density', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="density"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={false}
                  name="KDE"
                  fill="#1976d2"
                  fillOpacity={0.3}
                />
                <ReferenceLine x={stats.mean} stroke="#ff5722" strokeDasharray="3 3" label="Mean" />
                <ReferenceLine x={stats.median} stroke="#4caf50" strokeDasharray="3 3" label="Median" />
              </LineChart>
            </ResponsiveContainer>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Kernel Density Estimation (KDE) provides a smooth estimate of the probability density function.
                This is a non-parametric way to visualize the distribution.
              </Typography>
            </Alert>
          </Box>
        );

      case 'qqplot':
        return (
          <Box>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="theoretical"
                  name="Theoretical Quantiles"
                  label={{ value: 'Theoretical Quantiles (Normal)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="sample"
                  name="Sample Quantiles"
                  label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter data={qqPlotData} fill="#1976d2" name="Data Points" />

                {/* Reference line (y = x) */}
                <Line
                  type="monotone"
                  dataKey="theoretical"
                  stroke="#ff5722"
                  strokeWidth={2}
                  dot={false}
                  name="Reference Line"
                  data={qqPlotData.map(d => ({ theoretical: d.theoretical, sample: d.theoretical }))}
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Normality test results */}
            {normalityTest && (
              <Alert
                severity={normalityTest.isNormal ? "success" : "warning"}
                sx={{ mt: 2 }}
              >
                <Typography variant="body2">
                  <strong>Shapiro-Wilk Normality Test:</strong>
                  <br />
                  Test Statistic: {normalityTest.statistic?.toFixed(4)}
                  <br />
                  P-value: {normalityTest.pValue?.toFixed(4)}
                  <br />
                  <br />
                  {normalityTest.isNormal ? (
                    <>✅ Data appears to be <strong>normally distributed</strong> (p &gt; 0.05)</>
                  ) : (
                    <>⚠️ Data <strong>deviates from normal distribution</strong> (p &lt; 0.05)</>
                  )}
                </Typography>
              </Alert>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                The Q-Q (Quantile-Quantile) plot compares the distribution of your data to a normal distribution.
                If points fall along the reference line, the data is normally distributed.
                Deviations indicate non-normality.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Variable and Plot Type Selection */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Select Variable</InputLabel>
              <Select
                value={selectedColumn}
                label="Select Variable"
                onChange={handleColumnChange}
              >
                {numericColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Plot Type</InputLabel>
              <Select
                value={plotType}
                label="Plot Type"
                onChange={handlePlotTypeChange}
              >
                <MenuItem value="histogram">Histogram</MenuItem>
                <MenuItem value="boxplot">Box Plot</MenuItem>
                <MenuItem value="violin">Violin Plot</MenuItem>
                <MenuItem value="kde">KDE Plot</MenuItem>
                <MenuItem value="qqplot">Q-Q Plot</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Summary */}
      {stats && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Descriptive Statistics: {selectedColumn}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Mean</Typography>
                  <Typography variant="h6">{stats.mean.toFixed(2)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Median</Typography>
                  <Typography variant="h6">{stats.median.toFixed(2)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Std Dev</Typography>
                  <Typography variant="h6">{stats.std.toFixed(2)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Skewness</Typography>
                  <Typography variant="h6">{stats.skewness.toFixed(2)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Kurtosis</Typography>
                  <Typography variant="h6">{stats.kurtosis.toFixed(2)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Count</Typography>
                  <Typography variant="h6">{stats.count}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Interpretation chips */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Math.abs(stats.skewness) < 0.5 && (
              <Chip label="Symmetric Distribution" color="success" size="small" />
            )}
            {stats.skewness > 0.5 && (
              <Chip label="Right-Skewed" color="warning" size="small" />
            )}
            {stats.skewness < -0.5 && (
              <Chip label="Left-Skewed" color="warning" size="small" />
            )}
            {Math.abs(stats.kurtosis) < 1 && (
              <Chip label="Normal Tail Behavior" color="success" size="small" />
            )}
            {stats.kurtosis > 1 && (
              <Chip label="Heavy Tails" color="info" size="small" />
            )}
            {stats.kurtosis < -1 && (
              <Chip label="Light Tails" color="info" size="small" />
            )}
          </Box>
        </Paper>
      )}

      {/* Plot */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {plotType === 'histogram' && 'Histogram'}
          {plotType === 'boxplot' && 'Box Plot'}
          {plotType === 'violin' && 'Violin Plot'}
          {plotType === 'kde' && 'Kernel Density Estimation'}
          {plotType === 'qqplot' && 'Q-Q Plot (Normality Assessment)'}
        </Typography>

        {renderPlot()}
      </Paper>
    </Box>
  );
};

export default DistributionAnalysis;
