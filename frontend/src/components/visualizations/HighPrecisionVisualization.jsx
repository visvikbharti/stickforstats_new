/**
 * High-Precision Statistical Visualization Component
 * ===================================================
 * Displays 50-decimal precision results with beautiful, interactive charts
 * Maintains scientific integrity while providing stunning visual insights
 *
 * Created: September 18, 2025
 * Author: StickForStats Team
 * Version: 1.0.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Divider
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  ShowChart as ShowChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ScatterPlot as ScatterPlotIcon,
  Timeline as TimelineIcon,
  InfoOutlined as InfoIcon,
  GetApp as DownloadIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';
import Decimal from 'decimal.js';

// Configure Decimal for 50-digit precision
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

// High-precision color palette
const PRECISION_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
  precision: '#9c27b0',
  confidence: '#00acc1',
  effect: '#ff6f00',
  gradient: {
    start: '#667eea',
    end: '#764ba2'
  }
};

/**
 * Custom tooltip that displays high-precision values
 */
const HighPrecisionTooltip = ({ active, payload, label, precision = 10 }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={3} sx={{ p: 2, maxWidth: 400 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={index} sx={{ mt: 1 }}>
            <Typography variant="body2" color={entry.color}>
              {entry.name}:
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {typeof entry.value === 'string' && entry.value.includes('.')
                ? entry.value.substring(0, precision + entry.value.indexOf('.') + 1)
                : entry.value}
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};

/**
 * T-Test Result Visualization with 50-decimal precision
 */
export const TTestVisualization = ({ results, displayPrecision = 10 }) => {
  const [chartType, setChartType] = useState('bar');
  const [showConfidence, setShowConfidence] = useState(true);
  const [precisionLevel, setPrecisionLevel] = useState(displayPrecision);

  const formatPrecisionValue = useCallback((value, precision = null) => {
    const p = precision || precisionLevel;
    if (typeof value === 'string' && value.includes('.')) {
      const decimal = new Decimal(value);
      return decimal.toFixed(p);
    }
    return value;
  }, [precisionLevel]);

  const chartData = useMemo(() => {
    if (!results?.high_precision_result) return [];

    const hpResult = results.high_precision_result;

    return [
      {
        metric: 'T-Statistic',
        value: parseFloat(formatPrecisionValue(hpResult.t_statistic, 6)),
        fullValue: hpResult.t_statistic,
        interpretation: Math.abs(parseFloat(hpResult.t_statistic)) > 1.96 ? 'Significant' : 'Not Significant'
      },
      {
        metric: 'Effect Size',
        value: parseFloat(formatPrecisionValue(hpResult.cohen_d || '0', 6)),
        fullValue: hpResult.cohen_d,
        interpretation: Math.abs(parseFloat(hpResult.cohen_d || '0')) > 0.8 ? 'Large' :
                       Math.abs(parseFloat(hpResult.cohen_d || '0')) > 0.5 ? 'Medium' : 'Small'
      },
      {
        metric: 'Degrees of Freedom',
        value: hpResult.df,
        fullValue: hpResult.df,
        interpretation: `n = ${hpResult.df + 1}`
      }
    ];
  }, [results, formatPrecisionValue]);

  const pValueData = useMemo(() => {
    if (!results?.high_precision_result) return null;

    const pValue = results.high_precision_result.p_value;
    const significance = parseFloat(pValue) < 0.05;

    return {
      value: pValue,
      displayValue: formatPrecisionValue(pValue),
      significant: significance,
      percentage: Math.min(100, -Math.log10(parseFloat(pValue)) * 20) // Visual representation
    };
  }, [results, formatPrecisionValue]);

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom>
            T-Test Results Visualization
            <Chip
              label="50-Decimal Precision"
              color="secondary"
              size="small"
              sx={{ ml: 2 }}
            />
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="caption">Display Precision:</Typography>
            <Slider
              value={precisionLevel}
              onChange={(e, v) => setPrecisionLevel(v)}
              min={2}
              max={50}
              step={1}
              sx={{ width: 150 }}
              valueLabelDisplay="auto"
            />

            <ToggleButtonGroup
              value={chartType}
              exclusive
              onChange={(e, v) => v && setChartType(v)}
              size="small"
            >
              <ToggleButton value="bar">
                <BarChartIcon />
              </ToggleButton>
              <ToggleButton value="radar">
                <TimelineIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Main Chart */}
          <Grid item xs={12} md={8}>
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <RechartsTooltip content={<HighPrecisionTooltip precision={precisionLevel} />} />
                  <Bar dataKey="value" fill={PRECISION_COLORS.primary}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.interpretation === 'Significant' || entry.interpretation === 'Large'
                          ? PRECISION_COLORS.success
                          : entry.interpretation === 'Medium'
                          ? PRECISION_COLORS.warning
                          : PRECISION_COLORS.info}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  <Radar
                    name="Value"
                    dataKey="value"
                    stroke={PRECISION_COLORS.primary}
                    fill={PRECISION_COLORS.primary}
                    fillOpacity={0.6}
                  />
                </RadarChart>
              )}
            </ResponsiveContainer>
          </Grid>

          {/* P-Value Display */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%', background: pValueData?.significant
              ? `linear-gradient(135deg, ${PRECISION_COLORS.gradient.start} 0%, ${PRECISION_COLORS.gradient.end} 100%)`
              : '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom color={pValueData?.significant ? 'white' : 'textPrimary'}>
                P-Value Analysis
              </Typography>

              <Box sx={{ my: 2 }}>
                <Typography variant="h3" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                  color={pValueData?.significant ? 'white' : 'textPrimary'}>
                  {pValueData?.displayValue}
                </Typography>
              </Box>

              <Divider sx={{ my: 2, bgcolor: pValueData?.significant ? 'rgba(255,255,255,0.3)' : '' }} />

              <Typography variant="body2" color={pValueData?.significant ? 'white' : 'textSecondary'}>
                {pValueData?.significant
                  ? '✓ Statistically Significant (p < 0.05)'
                  : '✗ Not Statistically Significant (p ≥ 0.05)'}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color={pValueData?.significant ? 'white' : 'textSecondary'}>
                  Confidence Level: {((1 - parseFloat(pValueData?.value || '0')) * 100).toFixed(2)}%
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Confidence Intervals */}
          {showConfidence && results?.high_precision_result?.confidence_interval && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  95% Confidence Interval
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                    [{formatPrecisionValue(results.high_precision_result.confidence_interval.lower)}
                  </Typography>
                  <Typography variant="h6">
                    ,
                  </Typography>
                  <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                    {formatPrecisionValue(results.high_precision_result.confidence_interval.upper)}]
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Precision Indicator */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="textSecondary">
            Displaying {precisionLevel} of 50 available decimal places.
            Adjust slider to see more precision.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * ANOVA Results Visualization
 */
export const ANOVAVisualization = ({ results, displayPrecision = 10 }) => {
  const [showEffectSizes, setShowEffectSizes] = useState(true);

  const formatValue = useCallback((value, precision = displayPrecision) => {
    if (typeof value === 'string' && value.includes('.')) {
      return new Decimal(value).toFixed(precision);
    }
    return value;
  }, [displayPrecision]);

  const chartData = useMemo(() => {
    if (!results?.high_precision_result) return [];

    const hpResult = results.high_precision_result;

    const data = [
      {
        source: 'Between Groups',
        ss: parseFloat(formatValue(hpResult.ss_between, 4)),
        df: hpResult.df_between,
        ms: parseFloat(formatValue(hpResult.ms_between, 4))
      },
      {
        source: 'Within Groups',
        ss: parseFloat(formatValue(hpResult.ss_within, 4)),
        df: hpResult.df_within,
        ms: parseFloat(formatValue(hpResult.ms_within, 4))
      }
    ];

    return data;
  }, [results, formatValue]);

  const effectSizes = useMemo(() => {
    if (!results?.high_precision_result || !showEffectSizes) return null;

    const hpResult = results.high_precision_result;

    return [
      {
        name: 'Eta Squared',
        value: parseFloat(formatValue(hpResult.eta_squared, 6)),
        interpretation: parseFloat(hpResult.eta_squared) > 0.14 ? 'Large' :
                       parseFloat(hpResult.eta_squared) > 0.06 ? 'Medium' : 'Small'
      },
      {
        name: 'Omega Squared',
        value: parseFloat(formatValue(hpResult.omega_squared, 6)),
        interpretation: parseFloat(hpResult.omega_squared) > 0.14 ? 'Large' :
                       parseFloat(hpResult.omega_squared) > 0.06 ? 'Medium' : 'Small'
      },
      {
        name: "Cohen's f",
        value: parseFloat(formatValue(hpResult.cohen_f, 6)),
        interpretation: parseFloat(hpResult.cohen_f) > 0.40 ? 'Large' :
                       parseFloat(hpResult.cohen_f) > 0.25 ? 'Medium' : 'Small'
      }
    ];
  }, [results, showEffectSizes, formatValue]);

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          ANOVA Results
          <Chip label="High Precision" color="primary" size="small" sx={{ ml: 2 }} />
        </Typography>

        <Grid container spacing={3}>
          {/* Variance Decomposition */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Variance Decomposition
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <RechartsTooltip content={<HighPrecisionTooltip precision={displayPrecision} />} />
                <Legend />
                <Bar dataKey="ss" name="Sum of Squares" fill={PRECISION_COLORS.primary} />
                <Bar dataKey="ms" name="Mean Square" fill={PRECISION_COLORS.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </Grid>

          {/* Effect Sizes */}
          {effectSizes && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Effect Sizes
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={effectSizes}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.value.toFixed(4)}`}
                  >
                    {effectSizes.map((entry, index) => (
                      <Cell key={`cell-${index}`}
                        fill={entry.interpretation === 'Large' ? PRECISION_COLORS.success :
                              entry.interpretation === 'Medium' ? PRECISION_COLORS.warning :
                              PRECISION_COLORS.info} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
          )}

          {/* F-Statistic Display */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center',
              background: `linear-gradient(135deg, ${PRECISION_COLORS.gradient.start} 0%, ${PRECISION_COLORS.gradient.end} 100%)` }}>
              <Typography variant="h6" color="white" gutterBottom>
                F-Statistic
              </Typography>
              <Typography variant="h2" color="white" sx={{ fontFamily: 'monospace' }}>
                {formatValue(results?.high_precision_result?.f_statistic, displayPrecision)}
              </Typography>
              <Typography variant="body2" color="white" sx={{ mt: 2 }}>
                p-value: {formatValue(results?.high_precision_result?.p_value, displayPrecision)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

/**
 * Correlation Visualization
 */
export const CorrelationVisualization = ({ results, xData, yData, displayPrecision = 10 }) => {
  const scatterData = useMemo(() => {
    if (!xData || !yData) return [];

    return xData.map((x, i) => ({
      x: parseFloat(x),
      y: parseFloat(yData[i])
    }));
  }, [xData, yData]);

  const correlation = results?.primary_result?.correlation_coefficient;
  const strength = Math.abs(parseFloat(correlation || '0'));

  const getStrength = () => {
    if (strength > 0.7) return 'Strong';
    if (strength > 0.3) return 'Moderate';
    return 'Weak';
  };

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Correlation Analysis
          <Chip label={`r = ${new Decimal(correlation || '0').toFixed(displayPrecision)}`}
            color="secondary" sx={{ ml: 2 }} />
        </Typography>

        <Grid container spacing={3}>
          {/* Scatter Plot */}
          <Grid item xs={12} md={8}>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="X Variable" />
                <YAxis dataKey="y" name="Y Variable" />
                <RechartsTooltip />
                <Scatter name="Data Points" data={scatterData}
                  fill={PRECISION_COLORS.primary} />
              </ScatterChart>
            </ResponsiveContainer>
          </Grid>

          {/* Correlation Strength Indicator */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Correlation Strength
              </Typography>

              <Box sx={{ my: 3 }}>
                <Typography variant="h3" color={
                  getStrength() === 'Strong' ? 'success.main' :
                  getStrength() === 'Moderate' ? 'warning.main' : 'info.main'
                }>
                  {getStrength()}
                </Typography>
              </Box>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Direction: {parseFloat(correlation || '0') > 0 ? 'Positive' : 'Negative'}
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Typography variant="caption">R-Squared:</Typography>
                <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                  {new Decimal(results?.primary_result?.r_squared || '0').toFixed(displayPrecision)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

/**
 * Main High-Precision Visualization Dashboard
 */
const HighPrecisionVisualization = ({
  testType,
  results,
  xData,
  yData,
  displayPrecision = 10
}) => {
  const renderVisualization = () => {
    switch(testType) {
      case 'ttest':
        return <TTestVisualization results={results} displayPrecision={displayPrecision} />;
      case 'anova':
        return <ANOVAVisualization results={results} displayPrecision={displayPrecision} />;
      case 'correlation':
        return <CorrelationVisualization
          results={results}
          xData={xData}
          yData={yData}
          displayPrecision={displayPrecision}
        />;
      default:
        return (
          <Card>
            <CardContent>
              <Typography>
                Select a test to visualize results with 50-decimal precision
              </Typography>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {renderVisualization()}

      {/* Footer with precision info */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="caption" color="textSecondary">
          🔬 StickForStats v1.0 - Visualizing statistical results with up to 50 decimal places of precision
        </Typography>
      </Box>
    </Box>
  );
};

export default HighPrecisionVisualization;