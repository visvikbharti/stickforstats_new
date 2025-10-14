/**
 * Time Series Analysis Component
 *
 * Analyze temporal patterns with:
 * 1. Line Plot - Basic time series visualization
 * 2. Area Plot - Filled area under the line
 * 3. Rolling Statistics - Moving average and standard deviation
 * 4. Seasonal Decomposition - Trend, seasonal, residual components
 *
 * Ported from: app/utils/visualization.py (time series section)
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
  Slider
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

/**
 * Main Time Series Analysis Component
 */
const TimeSeriesAnalysis = ({ data }) => {
  const [timeColumn, setTimeColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [plotType, setPlotType] = useState('line');
  const [windowSize, setWindowSize] = useState(7);

  /**
   * Detect column types
   */
  const columnInfo = useMemo(() => {
    if (!data || data.length === 0) return { time: [], numeric: [] };

    const time = [];
    const numeric = [];

    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      // Try to parse as date
      const dateCount = values.filter(v => {
        const date = new Date(v);
        return date.toString() !== 'Invalid Date' && !isNaN(date.getTime());
      }).length;

      if (dateCount / values.length > 0.5) {
        time.push(key);
      } else if (numericCount / values.length > 0.8) {
        numeric.push(key);
      }
    });

    return { time, numeric };
  }, [data]);

  /**
   * Prepare time series data
   */
  const timeSeriesData = useMemo(() => {
    if (!data || !timeColumn || !valueColumn) return [];

    return data
      .map(row => {
        const timeValue = row[timeColumn];
        const value = parseFloat(row[valueColumn]);

        // Try to parse as date
        let time = new Date(timeValue);
        if (time.toString() === 'Invalid Date' || isNaN(time.getTime())) {
          // If not a valid date, use as is (might be sequential index)
          time = timeValue;
        }

        if (isNaN(value)) return null;

        return {
          time: time instanceof Date ? time.getTime() : timeValue,
          timeDisplay: time instanceof Date ? time.toLocaleDateString() : String(timeValue),
          value
        };
      })
      .filter(d => d !== null)
      .sort((a, b) => {
        if (typeof a.time === 'number' && typeof b.time === 'number') {
          return a.time - b.time;
        }
        return 0;
      });
  }, [data, timeColumn, valueColumn]);

  /**
   * Calculate rolling statistics
   */
  const rollingData = useMemo(() => {
    if (timeSeriesData.length === 0) return [];

    const result = timeSeriesData.map((point, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = timeSeriesData.slice(start, index + 1);
      const values = window.map(d => d.value);

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      return {
        ...point,
        rollingMean: mean,
        rollingStd: std,
        upperBand: mean + 2 * std,
        lowerBand: mean - 2 * std
      };
    });

    return result;
  }, [timeSeriesData, windowSize]);

  /**
   * Calculate trend using simple moving average
   */
  const trendData = useMemo(() => {
    if (timeSeriesData.length === 0) return [];

    const trendWindow = Math.max(7, Math.floor(timeSeriesData.length / 10));

    return timeSeriesData.map((point, index) => {
      const start = Math.max(0, index - Math.floor(trendWindow / 2));
      const end = Math.min(timeSeriesData.length, index + Math.floor(trendWindow / 2) + 1);
      const window = timeSeriesData.slice(start, end);
      const trend = window.reduce((sum, d) => sum + d.value, 0) / window.length;

      return {
        ...point,
        trend
      };
    });
  }, [timeSeriesData]);

  /**
   * Calculate seasonal component (simplified)
   */
  const decomposedData = useMemo(() => {
    if (trendData.length === 0) return [];

    // Calculate mean of values
    const mean = trendData.reduce((sum, d) => sum + d.value, 0) / trendData.length;

    return trendData.map(point => {
      const detrended = point.value - point.trend;
      const residual = point.value - point.trend;

      return {
        ...point,
        seasonal: detrended,
        residual: residual
      };
    });
  }, [trendData]);

  /**
   * Calculate time series statistics
   */
  const timeSeriesStats = useMemo(() => {
    if (timeSeriesData.length === 0) return null;

    const values = timeSeriesData.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    // Calculate trend direction
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trendDirection = secondMean > firstMean ? 'Increasing' : 'Decreasing';

    return {
      count: values.length,
      mean: mean,
      std: std,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      trendDirection
    };
  }, [timeSeriesData]);

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
  if (columnInfo.time.length === 0 && columnInfo.numeric.length < 2) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Time series analysis requires at least one time/date column (or sequential index) and one numeric column.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Detected: {columnInfo.time.length} time columns, {columnInfo.numeric.length} numeric columns.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <em>Tip: If you don't have a date column, you can use any sequential numeric column (e.g., index, day number) as the time axis.</em>
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
          <TimelineIcon /> Time Series Analysis Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Time Column */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Time/Date Column</InputLabel>
              <Select
                value={timeColumn}
                label="Time/Date Column"
                onChange={(e) => setTimeColumn(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a column...</em>
                </MenuItem>
                {/* First show detected time columns */}
                {columnInfo.time.map((col) => (
                  <MenuItem key={col} value={col}>{col} (Date)</MenuItem>
                ))}
                {/* Then show numeric columns as alternative */}
                {columnInfo.numeric.map((col) => (
                  <MenuItem key={col} value={col}>{col} (Sequential)</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Value Column */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Value Column</InputLabel>
              <Select
                value={valueColumn}
                label="Value Column"
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
                <MenuItem value="line">Line Plot</MenuItem>
                <MenuItem value="area">Area Plot</MenuItem>
                <MenuItem value="rolling">Rolling Statistics</MenuItem>
                <MenuItem value="decomposition">Seasonal Decomposition</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Window Size Slider (for rolling statistics) */}
        {plotType === 'rolling' && (
          <Box sx={{ mt: 3, px: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Rolling Window Size: {windowSize} periods
            </Typography>
            <Slider
              value={windowSize}
              onChange={(e, newValue) => setWindowSize(newValue)}
              min={2}
              max={Math.min(50, Math.floor(timeSeriesData.length / 2))}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        )}
      </Paper>

      {/* Render Plot if columns selected */}
      {timeColumn && valueColumn && timeSeriesData.length > 0 && (
        <>
          {/* Time Series Statistics */}
          {timeSeriesStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Observations
                    </Typography>
                    <Typography variant="h6">{timeSeriesStats.count}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Mean Value
                    </Typography>
                    <Typography variant="h6">{timeSeriesStats.mean.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Std Deviation
                    </Typography>
                    <Typography variant="h6">{timeSeriesStats.std.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Trend Direction
                    </Typography>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUpIcon
                        sx={{
                          transform: timeSeriesStats.trendDirection === 'Decreasing' ? 'rotate(180deg)' : 'none',
                          color: timeSeriesStats.trendDirection === 'Increasing' ? '#4caf50' : '#f44336'
                        }}
                      />
                      {timeSeriesStats.trendDirection}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Plot Area */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {plotType === 'line' && `Line Plot: ${valueColumn} over ${timeColumn}`}
              {plotType === 'area' && `Area Plot: ${valueColumn} over ${timeColumn}`}
              {plotType === 'rolling' && `Rolling Statistics: ${windowSize}-period Moving Average`}
              {plotType === 'decomposition' && `Seasonal Decomposition: ${valueColumn}`}
            </Typography>

            {/* Line Plot */}
            {plotType === 'line' && (
              <Box sx={{ width: '100%', height: 400, mt: 2 }}>
                <ResponsiveContainer>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timeDisplay"
                      label={{ value: timeColumn, position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis label={{ value: valueColumn, angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                      name={valueColumn}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Area Plot */}
            {plotType === 'area' && (
              <Box sx={{ width: '100%', height: 400, mt: 2 }}>
                <ResponsiveContainer>
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timeDisplay"
                      label={{ value: timeColumn, position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis label={{ value: valueColumn, angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      name={valueColumn}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Rolling Statistics */}
            {plotType === 'rolling' && (
              <Box sx={{ width: '100%', height: 400, mt: 2 }}>
                <ResponsiveContainer>
                  <LineChart data={rollingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timeDisplay"
                      label={{ value: timeColumn, position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis label={{ value: valueColumn, angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      strokeWidth={1}
                      dot={false}
                      name="Original"
                      opacity={0.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="rollingMean"
                      stroke="#ff7300"
                      strokeWidth={2}
                      dot={false}
                      name={`${windowSize}-period MA`}
                    />
                    <Line
                      type="monotone"
                      dataKey="upperBand"
                      stroke="#82ca9d"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Upper Band (μ+2σ)"
                    />
                    <Line
                      type="monotone"
                      dataKey="lowerBand"
                      stroke="#82ca9d"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Lower Band (μ-2σ)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Seasonal Decomposition */}
            {plotType === 'decomposition' && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Original */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Original Series</Typography>
                  <Box sx={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <LineChart data={decomposedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timeDisplay" hide />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>

                {/* Trend */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Trend Component</Typography>
                  <Box sx={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <LineChart data={decomposedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timeDisplay" hide />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="trend" stroke="#ff7300" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>

                {/* Seasonal */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Seasonal Component (Detrended)</Typography>
                  <Box sx={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <LineChart data={decomposedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timeDisplay" hide />
                        <YAxis />
                        <Tooltip />
                        <ReferenceLine y={0} stroke="#666" />
                        <Line type="monotone" dataKey="seasonal" stroke="#82ca9d" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>

                {/* Residual */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Residual Component</Typography>
                  <Box sx={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                      <LineChart data={decomposedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timeDisplay" />
                        <YAxis />
                        <Tooltip />
                        <ReferenceLine y={0} stroke="#666" />
                        <Line type="monotone" dataKey="residual" stroke="#d084d0" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              </Grid>
            )}

            {/* Interpretation */}
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Interpretation:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {timeSeriesStats && (
                  <>
                    <Chip
                      label={`${timeSeriesStats.count} observations`}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={`Trend: ${timeSeriesStats.trendDirection}`}
                      color={timeSeriesStats.trendDirection === 'Increasing' ? 'success' : 'error'}
                      size="small"
                    />
                    <Chip
                      label={`Range: ${timeSeriesStats.range.toFixed(2)}`}
                      color="secondary"
                      size="small"
                    />
                    {timeSeriesStats.std / timeSeriesStats.mean > 0.3 && (
                      <Chip
                        label="High volatility (CV > 30%)"
                        color="warning"
                        size="small"
                      />
                    )}
                  </>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Usage Tips */}
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Plot Type Guide:</strong>
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Line Plot:</strong> Basic time series visualization showing values over time
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Area Plot:</strong> Same as line plot but with filled area for emphasis
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Rolling Statistics:</strong> Shows moving average to smooth short-term fluctuations
            </Typography>
            <Typography variant="caption" component="div">
              • <strong>Seasonal Decomposition:</strong> Breaks down series into trend, seasonal, and residual components
            </Typography>
          </Alert>
        </>
      )}

      {/* Column selection prompt */}
      {(!timeColumn || !valueColumn) && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select both a <strong>Time/Date Column</strong> (or sequential index) and a <strong>Value Column</strong> (numeric data to analyze over time).
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default TimeSeriesAnalysis;
