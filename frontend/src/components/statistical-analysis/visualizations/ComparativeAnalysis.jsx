/**
 * Comparative Analysis Component
 *
 * Compare groups or categories with:
 * 1. Bar Plot - Aggregated comparisons (mean, sum, count, median)
 * 2. Box Plot - Distribution by group
 * 3. Violin Plot - Distribution shape by group
 * 4. Strip Plot - Individual points by group with jitter
 *
 * Ported from: app/utils/visualization.py (comparative section)
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
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import CompareIcon from '@mui/icons-material/Compare';
import BarChartIcon from '@mui/icons-material/BarChart';
import { calculateDescriptiveStats } from '../utils/statisticalUtils';

/**
 * Main Comparative Analysis Component
 */
const ComparativeAnalysis = ({ data }) => {
  const [categoryColumn, setCategoryColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [plotType, setPlotType] = useState('bar');
  const [aggregation, setAggregation] = useState('mean');

  /**
   * Detect column types
   */
  const columnInfo = useMemo(() => {
    if (!data || data.length === 0) return { categorical: [], numeric: [] };

    const categorical = [];
    const numeric = [];

    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueCount = new Set(values).size;
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      // Consider categorical if: unique values < 20 OR less than 50% are numeric
      if (uniqueCount < 20 || numericCount / values.length < 0.5) {
        categorical.push(key);
      } else {
        numeric.push(key);
      }
    });

    return { categorical, numeric };
  }, [data]);

  /**
   * Helper: Calculate median
   */
  const calculateMedian = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  /**
   * Helper: Calculate percentile
   */
  const calculatePercentile = (values, percentile) => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  /**
   * Prepare data for plotting
   */
  const plotData = useMemo(() => {
    if (!data || !categoryColumn || !valueColumn) return [];

    const grouped = {};

    data.forEach(row => {
      const category = String(row[categoryColumn] || 'Unknown');
      const value = parseFloat(row[valueColumn]);

      if (isNaN(value)) return;

      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(value);
    });

    return Object.entries(grouped).map(([category, values]) => ({
      category,
      values,
      count: values.length,
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      sum: values.reduce((a, b) => a + b, 0),
      median: calculateMedian(values),
      min: Math.min(...values),
      max: Math.max(...values),
      q1: calculatePercentile(values, 25),
      q3: calculatePercentile(values, 75)
    }));
  }, [data, categoryColumn, valueColumn]);

  /**
   * Prepare bar chart data based on aggregation
   */
  const barChartData = useMemo(() => {
    return plotData.map(item => ({
      category: item.category,
      value: item[aggregation]
    }));
  }, [plotData, aggregation]);

  /**
   * Calculate overall statistics
   */
  const overallStats = useMemo(() => {
    if (plotData.length === 0) return null;

    const groupMeans = plotData.map(g => g.mean);
    const groupCounts = plotData.map(g => g.count);
    const totalCount = groupCounts.reduce((a, b) => a + b, 0);

    return {
      numGroups: plotData.length,
      totalCount,
      meanOfMeans: groupMeans.reduce((a, b) => a + b, 0) / groupMeans.length,
      minGroupMean: Math.min(...groupMeans),
      maxGroupMean: Math.max(...groupMeans),
      range: Math.max(...groupMeans) - Math.min(...groupMeans)
    };
  }, [plotData]);

  /**
   * Prepare strip plot data with jitter
   */
  const stripPlotData = useMemo(() => {
    if (plotData.length === 0) return [];

    const result = [];
    const jitterAmount = 0.3;

    plotData.forEach((group, groupIndex) => {
      group.values.forEach(value => {
        result.push({
          category: groupIndex,
          categoryName: group.category,
          value: value,
          jitter: groupIndex + (Math.random() - 0.5) * jitterAmount
        });
      });
    });

    return result;
  }, [plotData]);

  /**
   * Color palette for groups
   */
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#d084d0', '#a4de6c'];

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

  /**
   * Render column selection
   */
  if (columnInfo.categorical.length === 0 || columnInfo.numeric.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Comparative analysis requires at least one categorical column and one numeric column.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Detected: {columnInfo.categorical.length} categorical, {columnInfo.numeric.length} numeric columns.
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
          <CompareIcon /> Comparative Analysis Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Category Column */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category Column (Groups)</InputLabel>
              <Select
                value={categoryColumn}
                label="Category Column (Groups)"
                onChange={(e) => setCategoryColumn(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a column...</em>
                </MenuItem>
                {columnInfo.categorical.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Value Column */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Value Column (Numeric)</InputLabel>
              <Select
                value={valueColumn}
                label="Value Column (Numeric)"
                onChange={(e) => setValueColumn(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a column...</em>
                </MenuItem>
                {columnInfo.numeric.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Plot Type */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Plot Type</InputLabel>
              <Select
                value={plotType}
                label="Plot Type"
                onChange={(e) => setPlotType(e.target.value)}
              >
                <MenuItem value="bar">Bar Plot</MenuItem>
                <MenuItem value="box">Box Plot</MenuItem>
                <MenuItem value="violin">Violin Plot</MenuItem>
                <MenuItem value="strip">Strip Plot</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Aggregation Method (for Bar Plot only) */}
        {plotType === 'bar' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Aggregation Method:
            </Typography>
            <ToggleButtonGroup
              value={aggregation}
              exclusive
              onChange={(e, newValue) => newValue && setAggregation(newValue)}
              size="small"
            >
              <ToggleButton value="mean">Mean</ToggleButton>
              <ToggleButton value="sum">Sum</ToggleButton>
              <ToggleButton value="count">Count</ToggleButton>
              <ToggleButton value="median">Median</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </Paper>

      {/* Render Plot if columns selected */}
      {categoryColumn && valueColumn && plotData.length > 0 && (
        <>
          {/* Overall Statistics */}
          {overallStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Number of Groups
                    </Typography>
                    <Typography variant="h6">{overallStats.numGroups}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Total Observations
                    </Typography>
                    <Typography variant="h6">{overallStats.totalCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Mean of Group Means
                    </Typography>
                    <Typography variant="h6">{overallStats.meanOfMeans.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Range (Max - Min Mean)
                    </Typography>
                    <Typography variant="h6">{overallStats.range.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Plot Area */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {plotType === 'bar' && `Bar Plot: ${aggregation.charAt(0).toUpperCase() + aggregation.slice(1)} by ${categoryColumn}`}
              {plotType === 'box' && `Box Plot: ${valueColumn} by ${categoryColumn}`}
              {plotType === 'violin' && `Violin Plot: ${valueColumn} by ${categoryColumn}`}
              {plotType === 'strip' && `Strip Plot: ${valueColumn} by ${categoryColumn}`}
            </Typography>

            <Box sx={{ width: '100%', height: 400, mt: 2 }}>
              {/* Bar Plot */}
              {plotType === 'bar' && (
                <ResponsiveContainer>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis label={{ value: aggregation.charAt(0).toUpperCase() + aggregation.slice(1), angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name={aggregation.charAt(0).toUpperCase() + aggregation.slice(1)}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Box Plot */}
              {plotType === 'box' && (
                <ResponsiveContainer>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="category"
                      dataKey="categoryIndex"
                      ticks={plotData.map((_, i) => i)}
                      tickFormatter={(value) => plotData[value]?.category || ''}
                    />
                    <YAxis type="number" label={{ value: valueColumn, angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1 }}>
                              <Typography variant="caption" display="block">
                                <strong>{data.categoryName}</strong>
                              </Typography>
                              <Typography variant="caption" display="block">
                                Min: {data.min.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Q1: {data.q1.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Median: {data.median.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Q3: {data.q3.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Max: {data.max.toFixed(2)}
                              </Typography>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Box plot elements */}
                    {plotData.map((group, index) => (
                      <React.Fragment key={group.category}>
                        {/* Min-Max line */}
                        <Scatter
                          data={[
                            { categoryIndex: index, value: group.min, categoryName: group.category, ...group },
                            { categoryIndex: index, value: group.max, categoryName: group.category, ...group }
                          ]}
                          fill="none"
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                        {/* Box (Q1-Q3) */}
                        <Scatter
                          data={[
                            { categoryIndex: index - 0.2, value: group.q1, categoryName: group.category, ...group },
                            { categoryIndex: index + 0.2, value: group.q1, categoryName: group.category, ...group },
                            { categoryIndex: index + 0.2, value: group.q3, categoryName: group.category, ...group },
                            { categoryIndex: index - 0.2, value: group.q3, categoryName: group.category, ...group }
                          ]}
                          fill={COLORS[index % COLORS.length]}
                          fillOpacity={0.3}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                        />
                        {/* Median line */}
                        <Scatter
                          data={[
                            { categoryIndex: index - 0.2, value: group.median, categoryName: group.category, ...group },
                            { categoryIndex: index + 0.2, value: group.median, categoryName: group.category, ...group }
                          ]}
                          fill="none"
                          stroke="#000"
                          strokeWidth={3}
                          isAnimationActive={false}
                        />
                      </React.Fragment>
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              )}

              {/* Violin Plot (simplified as scatter with density) */}
              {plotType === 'violin' && (
                <ResponsiveContainer>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="category"
                      dataKey="jitter"
                      ticks={plotData.map((_, i) => i)}
                      tickFormatter={(value) => plotData[Math.round(value)]?.category || ''}
                    />
                    <YAxis type="number" label={{ value: valueColumn, angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1 }}>
                              <Typography variant="caption" display="block">
                                <strong>{data.categoryName}</strong>
                              </Typography>
                              <Typography variant="caption">
                                Value: {data.value.toFixed(2)}
                              </Typography>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    {plotData.map((group, index) => (
                      <Scatter
                        key={group.category}
                        data={group.values.map(v => ({
                          jitter: index + (Math.random() - 0.5) * 0.3,
                          value: v,
                          categoryName: group.category
                        }))}
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.6}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              )}

              {/* Strip Plot */}
              {plotType === 'strip' && (
                <ResponsiveContainer>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="jitter"
                      ticks={plotData.map((_, i) => i)}
                      tickFormatter={(value) => plotData[Math.round(value)]?.category || ''}
                      domain={[-0.5, plotData.length - 0.5]}
                    />
                    <YAxis type="number" label={{ value: valueColumn, angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1 }}>
                              <Typography variant="caption" display="block">
                                <strong>{data.categoryName}</strong>
                              </Typography>
                              <Typography variant="caption">
                                Value: {data.value.toFixed(2)}
                              </Typography>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={stripPlotData} fill="#8884d8">
                      {stripPlotData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.category % COLORS.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </Box>

            {/* Interpretation */}
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Interpretation:
              </Typography>
              {plotType === 'bar' && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Highest ${aggregation}: ${barChartData.reduce((max, item) => item.value > max.value ? item : max).category}`}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={`Lowest ${aggregation}: ${barChartData.reduce((min, item) => item.value < min.value ? item : min).category}`}
                    color="secondary"
                    size="small"
                  />
                  {overallStats.range > overallStats.meanOfMeans * 0.5 && (
                    <Chip
                      label="High variability between groups"
                      color="warning"
                      size="small"
                    />
                  )}
                </Box>
              )}
              {(plotType === 'box' || plotType === 'violin' || plotType === 'strip') && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {plotData.map((group, index) => {
                    const iqr = group.q3 - group.q1;
                    return (
                      <Chip
                        key={group.category}
                        label={`${group.category}: Mean=${group.mean.toFixed(2)}, N=${group.count}`}
                        sx={{ bgcolor: COLORS[index % COLORS.length], color: 'white' }}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            </Box>
          </Paper>

          {/* Group Statistics Table */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Statistics
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Group</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Count</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Mean</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Median</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Min</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Max</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Q1</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Q3</th>
                  </tr>
                </thead>
                <tbody>
                  {plotData.map((group, index) => (
                    <tr key={group.category} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        <strong>{group.category}</strong>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {group.count}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {group.mean.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {group.median.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {group.min.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {group.max.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {group.q1.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {group.q3.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>

          {/* Usage Tips */}
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Plot Type Guide:</strong>
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Bar Plot:</strong> Best for comparing aggregated values (mean, sum, count) across groups
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Box Plot:</strong> Shows distribution quartiles and outliers for each group
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Violin Plot:</strong> Displays full distribution shape for each group
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Strip Plot:</strong> Shows individual data points with jitter to avoid overlap
            </Typography>
          </Alert>
        </>
      )}

      {/* Column selection prompt */}
      {(!categoryColumn || !valueColumn) && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select both a <strong>Category Column</strong> (for grouping) and a <strong>Value Column</strong> (numeric data to compare).
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ComparativeAnalysis;
