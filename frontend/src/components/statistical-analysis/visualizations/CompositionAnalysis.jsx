/**
 * Composition Analysis Component
 *
 * Analyze part-to-whole relationships with:
 * 1. Pie Chart - Show category proportions
 * 2. Donut Chart - Pie chart with center hole
 * 3. Treemap - Hierarchical space-filling visualization
 * 4. Funnel Chart - Sequential conversion/process stages
 *
 * Ported from: app/utils/visualization.py (composition section)
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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import PieChartIcon from '@mui/icons-material/PieChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';

/**
 * Main Composition Analysis Component
 */
const CompositionAnalysis = ({ data }) => {
  const [categoryColumn, setCategoryColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [plotType, setPlotType] = useState('pie');
  const [aggregation, setAggregation] = useState('sum');

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
   * Prepare composition data
   */
  const compositionData = useMemo(() => {
    if (!data || !categoryColumn) return [];

    const grouped = {};

    data.forEach(row => {
      const category = String(row[categoryColumn] || 'Unknown');
      const value = valueColumn ? parseFloat(row[valueColumn]) : 1;

      if (valueColumn && isNaN(value)) return;

      if (!grouped[category]) {
        grouped[category] = { values: [], count: 0 };
      }
      grouped[category].values.push(value);
      grouped[category].count++;
    });

    const result = Object.entries(grouped).map(([category, info]) => {
      let aggregatedValue;
      if (aggregation === 'sum') {
        aggregatedValue = info.values.reduce((a, b) => a + b, 0);
      } else if (aggregation === 'mean') {
        aggregatedValue = info.values.reduce((a, b) => a + b, 0) / info.values.length;
      } else if (aggregation === 'count') {
        aggregatedValue = info.count;
      } else if (aggregation === 'median') {
        const sorted = [...info.values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        aggregatedValue = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      }

      return {
        name: category,
        value: aggregatedValue,
        count: info.count
      };
    });

    // Sort by value descending
    result.sort((a, b) => b.value - a.value);

    // Calculate percentages
    const total = result.reduce((sum, item) => sum + item.value, 0);
    result.forEach(item => {
      item.percentage = (item.value / total) * 100;
    });

    return result;
  }, [data, categoryColumn, valueColumn, aggregation]);

  /**
   * Prepare treemap data
   */
  const treemapData = useMemo(() => {
    return compositionData.map(item => ({
      name: item.name,
      size: item.value
    }));
  }, [compositionData]);

  /**
   * Prepare funnel data (sorted descending)
   */
  const funnelData = useMemo(() => {
    return [...compositionData].sort((a, b) => b.value - a.value);
  }, [compositionData]);

  /**
   * Calculate composition statistics
   */
  const compositionStats = useMemo(() => {
    if (compositionData.length === 0) return null;

    const values = compositionData.map(d => d.value);
    const total = values.reduce((a, b) => a + b, 0);
    const max = Math.max(...values);
    const maxCategory = compositionData.find(d => d.value === max);

    return {
      numCategories: compositionData.length,
      total: total,
      largestCategory: maxCategory?.name,
      largestValue: max,
      largestPercentage: (max / total) * 100
    };
  }, [compositionData]);

  /**
   * Color palette
   */
  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1',
    '#d084d0', '#a4de6c', '#ffbb28', '#ff6b6b', '#4ecdc4',
    '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fab1a0'
  ];

  /**
   * Custom label for pie chart
   */
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  /**
   * Custom tooltip
   */
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="caption" display="block">
            <strong>{data.name}</strong>
          </Typography>
          <Typography variant="caption" display="block">
            Value: {data.value.toFixed(2)}
          </Typography>
          <Typography variant="caption" display="block">
            Percentage: {data.percentage.toFixed(1)}%
          </Typography>
          {data.count && (
            <Typography variant="caption" display="block">
              Count: {data.count}
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  /**
   * Custom treemap content
   */
  const TreemapContent = ({ x, y, width, height, index, name, value }) => {
    const percentage = compositionData[index]?.percentage || 0;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[index % COLORS.length],
            stroke: '#fff',
            strokeWidth: 2,
          }}
        />
        {width > 60 && height > 30 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 8}
              textAnchor="middle"
              fill="#fff"
              fontSize={12}
              fontWeight="bold"
            >
              {name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 8}
              textAnchor="middle"
              fill="#fff"
              fontSize={10}
            >
              {percentage.toFixed(1)}%
            </text>
          </>
        )}
      </g>
    );
  };

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
  if (columnInfo.categorical.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Composition analysis requires at least one categorical column for grouping.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Detected: {columnInfo.categorical.length} categorical columns.
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
          <PieChartIcon /> Composition Analysis Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Category Column */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category Column</InputLabel>
              <Select
                value={categoryColumn}
                label="Category Column"
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

          {/* Value Column (Optional) */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Value Column (Optional)</InputLabel>
              <Select
                value={valueColumn}
                label="Value Column (Optional)"
                onChange={(e) => setValueColumn(e.target.value)}
              >
                <MenuItem value="">
                  <em>Use count</em>
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
                <MenuItem value="pie">Pie Chart</MenuItem>
                <MenuItem value="donut">Donut Chart</MenuItem>
                <MenuItem value="treemap">Treemap</MenuItem>
                <MenuItem value="funnel">Funnel Chart</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Aggregation Method (if value column selected) */}
        {valueColumn && (
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
              <ToggleButton value="sum">Sum</ToggleButton>
              <ToggleButton value="mean">Mean</ToggleButton>
              <ToggleButton value="count">Count</ToggleButton>
              <ToggleButton value="median">Median</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </Paper>

      {/* Render Plot if category column selected */}
      {categoryColumn && compositionData.length > 0 && (
        <>
          {/* Composition Statistics */}
          {compositionStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Number of Categories
                    </Typography>
                    <Typography variant="h6">{compositionStats.numCategories}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Total Value
                    </Typography>
                    <Typography variant="h6">{compositionStats.total.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Largest Category
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                      {compositionStats.largestCategory}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Largest %
                    </Typography>
                    <Typography variant="h6">
                      {compositionStats.largestPercentage.toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Plot Area */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {plotType === 'pie' && `Pie Chart: ${categoryColumn} Composition`}
              {plotType === 'donut' && `Donut Chart: ${categoryColumn} Composition`}
              {plotType === 'treemap' && `Treemap: ${categoryColumn} Hierarchy`}
              {plotType === 'funnel' && `Funnel Chart: ${categoryColumn} Stages`}
            </Typography>

            <Box sx={{ width: '100%', height: 500, mt: 2 }}>
              {/* Pie Chart */}
              {plotType === 'pie' && (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={compositionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={180}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {compositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry) => `${entry.payload.name} (${entry.payload.percentage.toFixed(1)}%)`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Donut Chart */}
              {plotType === 'donut' && (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={compositionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      innerRadius={100}
                      outerRadius={180}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {compositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry) => `${entry.payload.name} (${entry.payload.percentage.toFixed(1)}%)`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Treemap */}
              {plotType === 'treemap' && (
                <ResponsiveContainer>
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#8884d8"
                    content={<TreemapContent />}
                  />
                </ResponsiveContainer>
              )}

              {/* Funnel Chart */}
              {plotType === 'funnel' && (
                <ResponsiveContainer>
                  <BarChart
                    data={funnelData}
                    layout="vertical"
                    margin={{ left: 100, right: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#8884d8">
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>

            {/* Interpretation */}
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Interpretation:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {compositionStats && (
                  <>
                    <Chip
                      label={`${compositionStats.numCategories} categories`}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={`Largest: ${compositionStats.largestCategory} (${compositionStats.largestPercentage.toFixed(1)}%)`}
                      color="secondary"
                      size="small"
                    />
                    {compositionStats.largestPercentage > 50 && (
                      <Chip
                        label="Dominated by one category"
                        color="warning"
                        size="small"
                      />
                    )}
                    {compositionStats.numCategories > 10 && (
                      <Chip
                        label="Many categories - consider grouping smaller ones"
                        color="info"
                        size="small"
                      />
                    )}
                  </>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Composition Table */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Category Breakdown
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Category</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Value</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Percentage</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Count</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {compositionData.map((item, index) => (
                    <tr key={item.name} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        <strong>{item.name}</strong>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {item.value.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {item.percentage.toFixed(1)}%
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        {item.count}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        <Box
                          sx={{
                            width: `${item.percentage}%`,
                            minWidth: '20px',
                            height: '20px',
                            bgcolor: COLORS[index % COLORS.length],
                            borderRadius: '4px',
                            margin: '0 auto'
                          }}
                        />
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
              • <strong>Pie Chart:</strong> Best for showing relative proportions of 3-7 categories
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Donut Chart:</strong> Similar to pie but with center space for totals or labels
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Treemap:</strong> Space-efficient for hierarchical data with many categories
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Funnel Chart:</strong> Ideal for sequential stages or conversion processes
            </Typography>
          </Alert>
        </>
      )}

      {/* Column selection prompt */}
      {!categoryColumn && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select a <strong>Category Column</strong> to analyze composition.
            Optionally select a <strong>Value Column</strong> to aggregate numeric values, or leave blank to use counts.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default CompositionAnalysis;
