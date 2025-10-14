/**
 * Relationship Analysis Component
 *
 * Provides 4 plot types for exploring relationships between variables:
 * 1. Scatter Plot - basic relationship visualization
 * 2. Line Plot - for ordered/sequential relationships
 * 3. Hex Plot - 2D density histogram for large datasets
 * 4. Regression Plot - with trendline and R² statistic
 *
 * Includes correlation analysis and statistical interpretations.
 * Ported from: app/utils/visualization.py (lines 583-667)
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
  Chip
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis
} from 'recharts';
import { pearsonCorrelation, linearRegression } from '../utils/statisticalUtils';

/**
 * Relationship Analysis Component
 */
const RelationshipAnalysis = ({ data }) => {
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [plotType, setPlotType] = useState('scatter');
  const [colorColumn, setColorColumn] = useState('');

  /**
   * Get numeric columns
   */
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const columns = Object.keys(data[0]);
    return columns.filter(col => typeof data[0][col] === 'number');
  }, [data]);

  /**
   * Get all columns (for color grouping)
   */
  const allColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  /**
   * Prepare plot data
   */
  const plotData = useMemo(() => {
    if (!xColumn || !yColumn || !data) return [];

    return data
      .filter(row => {
        const x = row[xColumn];
        const y = row[yColumn];
        return typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y);
      })
      .map((row, idx) => ({
        x: row[xColumn],
        y: row[yColumn],
        color: colorColumn ? row[colorColumn] : undefined,
        idx
      }));
  }, [data, xColumn, yColumn, colorColumn]);

  /**
   * Calculate correlation
   */
  const correlation = useMemo(() => {
    if (plotData.length < 2) return null;
    const xValues = plotData.map(d => d.x);
    const yValues = plotData.map(d => d.y);
    return pearsonCorrelation(xValues, yValues);
  }, [plotData]);

  /**
   * Calculate regression
   */
  const regression = useMemo(() => {
    if (plotData.length < 2) return null;
    const xValues = plotData.map(d => d.x);
    const yValues = plotData.map(d => d.y);
    return linearRegression(xValues, yValues);
  }, [plotData]);

  /**
   * Prepare regression line data
   */
  const regressionLineData = useMemo(() => {
    if (!regression || plotData.length === 0) return [];

    const xValues = plotData.map(d => d.x);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);

    return [
      { x: xMin, y: regression.predict(xMin) },
      { x: xMax, y: regression.predict(xMax) }
    ];
  }, [regression, plotData]);

  /**
   * Get unique color values for grouping
   */
  const colorGroups = useMemo(() => {
    if (!colorColumn || !data) return [];
    const unique = [...new Set(data.map(row => row[colorColumn]))].filter(v => v !== null && v !== undefined);
    return unique.slice(0, 10); // Limit to 10 colors
  }, [data, colorColumn]);

  /**
   * Group data by color
   */
  const groupedData = useMemo(() => {
    if (!colorColumn || colorGroups.length === 0) return [{ name: 'Data', data: plotData }];

    return colorGroups.map(group => ({
      name: String(group),
      data: plotData.filter(d => d.color === group)
    }));
  }, [plotData, colorColumn, colorGroups]);

  /**
   * Color palette
   */
  const colors = ['#1976d2', '#ff5722', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#e91e63', '#795548', '#607d8b', '#cddc39'];

  /**
   * Render plot based on type
   */
  const renderPlot = () => {
    if (!xColumn || !yColumn || plotData.length === 0) {
      return (
        <Alert severity="info">
          Please select X and Y variables to visualize their relationship
        </Alert>
      );
    }

    switch (plotType) {
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name={xColumn}
                label={{ value: xColumn, position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yColumn}
                label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {colorColumn ? (
                <>
                  <Legend />
                  {groupedData.map((group, idx) => (
                    <Scatter
                      key={group.name}
                      name={group.name}
                      data={group.data}
                      fill={colors[idx % colors.length]}
                    />
                  ))}
                </>
              ) : (
                <Scatter data={plotData} fill="#1976d2" />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'line':
        // Sort data by x value for line plot
        const sortedData = [...plotData].sort((a, b) => a.x - b.x);

        return (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                label={{ value: xColumn, position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              {colorColumn ? (
                groupedData.map((group, idx) => (
                  <Line
                    key={group.name}
                    type="monotone"
                    data={group.data.sort((a, b) => a.x - b.x)}
                    dataKey="y"
                    stroke={colors[idx % colors.length]}
                    name={group.name}
                    strokeWidth={2}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke="#1976d2"
                  strokeWidth={2}
                  name={yColumn}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'hex':
        // Create 2D histogram (hex bins approximation)
        const xValues = plotData.map(d => d.x);
        const yValues = plotData.map(d => d.y);
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);

        const gridSize = 20;
        const xBinWidth = (xMax - xMin) / gridSize;
        const yBinWidth = (yMax - yMin) / gridSize;

        const bins = {};
        plotData.forEach(d => {
          const xBin = Math.floor((d.x - xMin) / xBinWidth);
          const yBin = Math.floor((d.y - yMin) / yBinWidth);
          const key = `${xBin},${yBin}`;
          bins[key] = (bins[key] || 0) + 1;
        });

        const hexData = Object.entries(bins).map(([key, count]) => {
          const [xBin, yBin] = key.split(',').map(Number);
          return {
            x: xMin + (xBin + 0.5) * xBinWidth,
            y: yMin + (yBin + 0.5) * yBinWidth,
            z: count
          };
        });

        return (
          <Box>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={xColumn}
                  label={{ value: xColumn, position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={yColumn}
                  label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
                />
                <ZAxis type="number" dataKey="z" range={[50, 500]} name="Density" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter
                  data={hexData}
                  fill="#1976d2"
                  fillOpacity={0.6}
                  name="Density"
                />
              </ScatterChart>
            </ResponsiveContainer>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                The hex plot (2D histogram) shows the density of data points.
                Larger circles indicate more data points in that region.
              </Typography>
            </Alert>
          </Box>
        );

      case 'regression':
        return (
          <Box>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={xColumn}
                  label={{ value: xColumn, position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={yColumn}
                  label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter data={plotData} fill="#1976d2" name="Data Points" />
                <Line
                  type="monotone"
                  data={regressionLineData}
                  dataKey="y"
                  stroke="#ff5722"
                  strokeWidth={2}
                  dot={false}
                  name={`Trendline (R² = ${regression.rSquared.toFixed(3)})`}
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Regression statistics */}
            {regression && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Slope</Typography>
                      <Typography variant="h6">{regression.slope.toFixed(4)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Intercept</Typography>
                      <Typography variant="h6">{regression.intercept.toFixed(4)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">R²</Typography>
                      <Typography variant="h6">{regression.rSquared.toFixed(4)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Fit Quality</Typography>
                      <Typography variant="h6">
                        {regression.rSquared > 0.9 ? 'Excellent' :
                         regression.rSquared > 0.7 ? 'Good' :
                         regression.rSquared > 0.5 ? 'Moderate' : 'Poor'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Regression Equation:</strong> {yColumn} = {regression.slope.toFixed(4)} × {xColumn} + {regression.intercept.toFixed(4)}
                <br />
                <br />
                R² = {regression.rSquared.toFixed(4)} indicates that {(regression.rSquared * 100).toFixed(1)}% of the
                variance in {yColumn} is explained by {xColumn}.
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
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>X-Axis Variable</InputLabel>
              <Select
                value={xColumn}
                label="X-Axis Variable"
                onChange={(e) => setXColumn(e.target.value)}
              >
                {numericColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Y-Axis Variable</InputLabel>
              <Select
                value={yColumn}
                label="Y-Axis Variable"
                onChange={(e) => setYColumn(e.target.value)}
              >
                {numericColumns.filter(col => col !== xColumn).map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Plot Type</InputLabel>
              <Select
                value={plotType}
                label="Plot Type"
                onChange={(e) => setPlotType(e.target.value)}
              >
                <MenuItem value="scatter">Scatter Plot</MenuItem>
                <MenuItem value="line">Line Plot</MenuItem>
                <MenuItem value="hex">Hex Plot (2D Histogram)</MenuItem>
                <MenuItem value="regression">Regression Plot</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Color By (Optional)</InputLabel>
              <Select
                value={colorColumn}
                label="Color By (Optional)"
                onChange={(e) => setColorColumn(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {allColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Correlation Analysis */}
      {correlation && xColumn && yColumn && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Correlation Analysis: {xColumn} vs {yColumn}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Correlation (r)</Typography>
                  <Typography variant="h6">{correlation.coefficient.toFixed(4)}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">P-value</Typography>
                  <Typography variant="h6">{correlation.pValue.toFixed(6)}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Significance</Typography>
                  <Typography variant="h6">
                    {correlation.significant ? 'Yes' : 'No'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Strength</Typography>
                  <Typography variant="h6">
                    {Math.abs(correlation.coefficient) > 0.7 ? 'Strong' :
                     Math.abs(correlation.coefficient) > 0.5 ? 'Moderate' :
                     Math.abs(correlation.coefficient) > 0.3 ? 'Weak' : 'Very Weak'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Interpretation chips */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {correlation.coefficient > 0 && (
              <Chip label="Positive Correlation" color="success" size="small" />
            )}
            {correlation.coefficient < 0 && (
              <Chip label="Negative Correlation" color="error" size="small" />
            )}
            {correlation.significant && (
              <Chip label="Statistically Significant (p < 0.05)" color="primary" size="small" />
            )}
            {!correlation.significant && (
              <Chip label="Not Significant (p ≥ 0.05)" color="default" size="small" />
            )}
          </Box>

          <Alert severity={correlation.significant ? "success" : "info"} sx={{ mt: 2 }}>
            <Typography variant="body2">
              {correlation.significant ? (
                <>
                  There is a <strong>{Math.abs(correlation.coefficient) > 0.7 ? 'strong' : Math.abs(correlation.coefficient) > 0.5 ? 'moderate' : 'weak'}</strong>{' '}
                  <strong>{correlation.coefficient > 0 ? 'positive' : 'negative'}</strong> correlation
                  between {xColumn} and {yColumn} (r = {correlation.coefficient.toFixed(3)}, p = {correlation.pValue.toFixed(4)}).
                </>
              ) : (
                <>
                  No statistically significant correlation detected between {xColumn} and {yColumn}
                  (r = {correlation.coefficient.toFixed(3)}, p = {correlation.pValue.toFixed(4)}).
                </>
              )}
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Plot */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {plotType === 'scatter' && 'Scatter Plot'}
          {plotType === 'line' && 'Line Plot'}
          {plotType === 'hex' && 'Hex Plot (2D Density)'}
          {plotType === 'regression' && 'Regression Analysis'}
        </Typography>

        {renderPlot()}
      </Paper>
    </Box>
  );
};

export default RelationshipAnalysis;
