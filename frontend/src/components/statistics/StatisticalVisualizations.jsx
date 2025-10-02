import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import jStat from 'jstat';

// Color palette for consistent styling
const COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
  quartile: '#9c27b0',
  outlier: '#f44336'
};

/**
 * Histogram Component with Normal Distribution Overlay
 */
export const Histogram = ({ data, columnName, bins = 20, showNormalCurve = true }) => {
  const histogramData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const validData = data.filter(val => !isNaN(val) && val !== null);
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const binWidth = (max - min) / bins;

    // Create bins
    const histogram = [];
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = validData.filter(val =>
        i === bins - 1 ? val >= binStart && val <= binEnd : val >= binStart && val < binEnd
      ).length;

      histogram.push({
        range: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
        midpoint: (binStart + binEnd) / 2,
        count,
        frequency: count / validData.length,
        binStart,
        binEnd
      });
    }

    // Add normal distribution overlay if requested
    if (showNormalCurve) {
      const mean = jStat.mean(validData);
      const std = jStat.stdev(validData, true);

      histogram.forEach(bin => {
        // Calculate expected frequency under normal distribution
        const z1 = (bin.binStart - mean) / std;
        const z2 = (bin.binEnd - mean) / std;
        const p1 = jStat.normal.cdf(z1, 0, 1);
        const p2 = jStat.normal.cdf(z2, 0, 1);
        bin.normalExpected = (p2 - p1) * validData.length;
      });
    }

    return histogram;
  }, [data, bins, showNormalCurve]);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const validData = data.filter(val => !isNaN(val) && val !== null);

    return {
      mean: jStat.mean(validData),
      median: jStat.median(validData),
      std: jStat.stdev(validData, true),
      skewness: calculateSkewness(validData),
      kurtosis: calculateKurtosis(validData)
    };
  }, [data]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Distribution: {columnName}
        </Typography>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="midpoint"
              tickFormatter={(value) => value.toFixed(1)}
              label={{ value: columnName, position: 'insideBottom', offset: -5 }}
            />
            <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value, name) => [
                name === 'count' ? value : value.toFixed(2),
                name === 'count' ? 'Count' : 'Normal Expected'
              ]}
            />
            <Legend />
            <Bar dataKey="count" fill={COLORS.primary} opacity={0.7} />
            {showNormalCurve && (
              <Line
                type="monotone"
                dataKey="normalExpected"
                stroke={COLORS.secondary}
                strokeWidth={2}
                dot={false}
                name="Normal Curve"
              />
            )}
            {stats && (
              <>
                <ReferenceLine x={stats.mean} stroke={COLORS.success} strokeDasharray="5 5" label="Mean" />
                <ReferenceLine x={stats.median} stroke={COLORS.warning} strokeDasharray="5 5" label="Median" />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {stats && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Mean: ${stats.mean.toFixed(3)}`} size="small" />
            <Chip label={`Median: ${stats.median.toFixed(3)}`} size="small" />
            <Chip label={`Std: ${stats.std.toFixed(3)}`} size="small" />
            <Chip
              label={`Skewness: ${stats.skewness.toFixed(3)}`}
              size="small"
              color={Math.abs(stats.skewness) > 1 ? 'warning' : 'default'}
            />
            <Chip
              label={`Kurtosis: ${stats.kurtosis.toFixed(3)}`}
              size="small"
              color={Math.abs(stats.kurtosis - 3) > 2 ? 'warning' : 'default'}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Box Plot Component
 */
export const BoxPlot = ({ data, columnName, showOutliers = true }) => {
  const boxPlotData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const validData = data.filter(val => !isNaN(val) && val !== null).sort((a, b) => a - b);
    const q1 = jStat.quartiles(validData)[0];
    const median = jStat.median(validData);
    const q3 = jStat.quartiles(validData)[2];
    const iqr = q3 - q1;
    const min = Math.max(jStat.min(validData), q1 - 1.5 * iqr);
    const max = Math.min(jStat.max(validData), q3 + 1.5 * iqr);

    // Identify outliers
    const outliers = showOutliers ?
      validData.filter(val => val < q1 - 1.5 * iqr || val > q3 + 1.5 * iqr) : [];

    return {
      min,
      q1,
      median,
      q3,
      max,
      outliers,
      data: validData
    };
  }, [data, showOutliers]);

  if (!boxPlotData) return null;

  // Create data for the box plot visualization
  const chartData = [
    { name: 'Min', value: boxPlotData.min, fill: COLORS.info },
    { name: 'Q1', value: boxPlotData.q1, fill: COLORS.quartile },
    { name: 'Median', value: boxPlotData.median, fill: COLORS.success },
    { name: 'Q3', value: boxPlotData.q3, fill: COLORS.quartile },
    { name: 'Max', value: boxPlotData.max, fill: COLORS.info }
  ];

  // Create scatter data for actual points
  const scatterData = boxPlotData.data.map((value, index) => ({
    x: 1,
    y: value,
    isOutlier: boxPlotData.outliers.includes(value)
  }));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Box Plot: {columnName}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  domain={[0, 2]}
                  ticks={[1]}
                  tickFormatter={() => columnName}
                />
                <YAxis
                  domain={['dataMin - 5', 'dataMax + 5']}
                  label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />

                {/* Box plot elements */}
                <ReferenceLine y={boxPlotData.min} stroke={COLORS.info} strokeWidth={2} />
                <ReferenceLine y={boxPlotData.max} stroke={COLORS.info} strokeWidth={2} />
                <ReferenceLine y={boxPlotData.median} stroke={COLORS.success} strokeWidth={3} />

                {/* Box (IQR) */}
                <Area
                  type="monotone"
                  dataKey="y"
                  data={[
                    { x: 0.8, y: boxPlotData.q1 },
                    { x: 0.8, y: boxPlotData.q3 },
                    { x: 1.2, y: boxPlotData.q3 },
                    { x: 1.2, y: boxPlotData.q1 }
                  ]}
                  fill={COLORS.primary}
                  fillOpacity={0.3}
                  stroke={COLORS.primary}
                  strokeWidth={2}
                />

                {/* Scatter plot for all points */}
                <Scatter
                  name="Data Points"
                  data={scatterData}
                  fill={COLORS.primary}
                  fillOpacity={0.5}
                >
                  {scatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isOutlier ? COLORS.outlier : COLORS.primary}
                    />
                  ))}
                </Scatter>
              </ComposedChart>
            </ResponsiveContainer>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Five-Number Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip label={`Min: ${boxPlotData.min.toFixed(3)}`} size="small" variant="outlined" />
                <Chip label={`Q1: ${boxPlotData.q1.toFixed(3)}`} size="small" color="secondary" />
                <Chip label={`Median: ${boxPlotData.median.toFixed(3)}`} size="small" color="success" />
                <Chip label={`Q3: ${boxPlotData.q3.toFixed(3)}`} size="small" color="secondary" />
                <Chip label={`Max: ${boxPlotData.max.toFixed(3)}`} size="small" variant="outlined" />
                <Chip
                  label={`IQR: ${(boxPlotData.q3 - boxPlotData.q1).toFixed(3)}`}
                  size="small"
                  color="primary"
                />
                {boxPlotData.outliers.length > 0 && (
                  <Chip
                    label={`Outliers: ${boxPlotData.outliers.length}`}
                    size="small"
                    color="error"
                  />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

/**
 * Q-Q Plot Component for Normality Testing
 */
export const QQPlot = ({ data, columnName }) => {
  const qqData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const validData = data.filter(val => !isNaN(val) && val !== null).sort((a, b) => a - b);
    const n = validData.length;
    const mean = jStat.mean(validData);
    const std = jStat.stdev(validData, true);

    return validData.map((value, i) => {
      // Calculate theoretical quantile
      const p = (i + 0.5) / n;
      const theoreticalQuantile = jStat.normal.inv(p, mean, std);

      return {
        theoretical: theoreticalQuantile,
        sample: value,
        percentile: p * 100
      };
    });
  }, [data]);

  // Calculate R² for the Q-Q plot
  const rSquared = useMemo(() => {
    if (qqData.length === 0) return 0;

    const xMean = jStat.mean(qqData.map(d => d.theoretical));
    const yMean = jStat.mean(qqData.map(d => d.sample));

    const ssTotal = qqData.reduce((sum, d) => sum + Math.pow(d.sample - yMean, 2), 0);
    const ssResidual = qqData.reduce((sum, d) => sum + Math.pow(d.sample - d.theoretical, 2), 0);

    return 1 - (ssResidual / ssTotal);
  }, [qqData]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Q-Q Plot: {columnName}
        </Typography>

        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="theoretical"
              name="Theoretical Quantiles"
              label={{ value: 'Theoretical Quantiles', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              dataKey="sample"
              name="Sample Quantiles"
              label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value) => value.toFixed(3)}
              labelFormatter={(value) => `Theoretical: ${value?.toFixed(3)}`}
            />

            {/* Reference line (y=x) for perfect normality */}
            <ReferenceLine
              x={0}
              y={0}
              stroke={COLORS.secondary}
              strokeDasharray="5 5"
              segment={[
                { x: Math.min(...qqData.map(d => d.theoretical)), y: Math.min(...qqData.map(d => d.theoretical)) },
                { x: Math.max(...qqData.map(d => d.theoretical)), y: Math.max(...qqData.map(d => d.theoretical)) }
              ]}
            />

            <Scatter
              name="Q-Q Points"
              data={qqData}
              fill={COLORS.primary}
            />
          </ScatterChart>
        </ResponsiveContainer>

        <Box sx={{ mt: 2 }}>
          <Chip
            label={`R² = ${rSquared.toFixed(4)}`}
            color={rSquared > 0.95 ? 'success' : rSquared > 0.90 ? 'warning' : 'error'}
            size="small"
          />
          <Typography variant="caption" sx={{ ml: 2 }}>
            {rSquared > 0.95 ? 'Data appears normally distributed' :
             rSquared > 0.90 ? 'Data shows slight deviation from normality' :
             'Data significantly deviates from normal distribution'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Scatter Matrix for Multiple Variables
 */
export const ScatterMatrix = ({ data, columns, selectedColumns }) => {
  const scatterData = useMemo(() => {
    if (!data || data.length === 0 || !selectedColumns || selectedColumns.length < 2) return null;

    const matrix = {};

    for (let i = 0; i < selectedColumns.length; i++) {
      for (let j = 0; j < selectedColumns.length; j++) {
        const col1 = selectedColumns[i];
        const col2 = selectedColumns[j];
        const key = `${col1}-${col2}`;

        if (i === j) {
          // Diagonal: histogram data
          const colData = data.map(row => parseFloat(row[col1])).filter(val => !isNaN(val));
          matrix[key] = {
            type: 'histogram',
            data: colData,
            column: columns[col1]
          };
        } else {
          // Off-diagonal: scatter plot data
          const points = data
            .map(row => ({
              x: parseFloat(row[col1]),
              y: parseFloat(row[col2])
            }))
            .filter(point => !isNaN(point.x) && !isNaN(point.y));

          matrix[key] = {
            type: 'scatter',
            data: points,
            xColumn: columns[col1],
            yColumn: columns[col2],
            correlation: points.length > 2 ?
              jStat.corrcoeff(points.map(p => p.x), points.map(p => p.y)) : 0
          };
        }
      }
    }

    return matrix;
  }, [data, columns, selectedColumns]);

  if (!scatterData) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Scatter Matrix
        </Typography>

        <Grid container spacing={1}>
          {selectedColumns.map((col1, i) => (
            selectedColumns.map((col2, j) => {
              const key = `${col1}-${col2}`;
              const plotData = scatterData[key];

              return (
                <Grid item xs={12 / selectedColumns.length} key={key}>
                  <Paper sx={{ p: 1 }}>
                    {plotData.type === 'histogram' ? (
                      <Box>
                        <Typography variant="caption" align="center" display="block">
                          {plotData.column}
                        </Typography>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={createSimpleHistogram(plotData.data, 10)}>
                            <Bar dataKey="count" fill={COLORS.primary} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="caption" align="center" display="block">
                          r = {plotData.correlation.toFixed(2)}
                        </Typography>
                        <ResponsiveContainer width="100%" height={150}>
                          <ScatterChart>
                            <XAxis
                              dataKey="x"
                              hide
                              domain={['dataMin', 'dataMax']}
                            />
                            <YAxis
                              dataKey="y"
                              hide
                              domain={['dataMin', 'dataMax']}
                            />
                            <Scatter
                              data={plotData.data}
                              fill={getCorrelationColor(plotData.correlation)}
                              fillOpacity={0.6}
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              );
            })
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

/**
 * Combined Visualization Dashboard
 */
export const StatisticalVisualizationDashboard = ({ data, columns, selectedColumns }) => {
  const [visualizationType, setVisualizationType] = React.useState('all');
  const [selectedColumn, setSelectedColumn] = React.useState(selectedColumns[0] || 0);

  const columnData = useMemo(() => {
    if (!data || selectedColumn === undefined) return [];
    return data.map(row => parseFloat(row[selectedColumn])).filter(val => !isNaN(val));
  }, [data, selectedColumn]);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Visualization Type</InputLabel>
          <Select
            value={visualizationType}
            onChange={(e) => setVisualizationType(e.target.value)}
            label="Visualization Type"
          >
            <MenuItem value="all">All Visualizations</MenuItem>
            <MenuItem value="histogram">Histogram</MenuItem>
            <MenuItem value="boxplot">Box Plot</MenuItem>
            <MenuItem value="qqplot">Q-Q Plot</MenuItem>
            <MenuItem value="scatter">Scatter Matrix</MenuItem>
          </Select>
        </FormControl>

        {visualizationType !== 'scatter' && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Column</InputLabel>
            <Select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              label="Column"
            >
              {selectedColumns.map(colIndex => (
                <MenuItem key={colIndex} value={colIndex}>
                  {columns[colIndex]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Grid container spacing={3}>
        {(visualizationType === 'all' || visualizationType === 'histogram') && (
          <Grid item xs={12}>
            <Histogram
              data={columnData}
              columnName={columns[selectedColumn]}
              bins={20}
              showNormalCurve={true}
            />
          </Grid>
        )}

        {(visualizationType === 'all' || visualizationType === 'boxplot') && (
          <Grid item xs={12}>
            <BoxPlot
              data={columnData}
              columnName={columns[selectedColumn]}
              showOutliers={true}
            />
          </Grid>
        )}

        {(visualizationType === 'all' || visualizationType === 'qqplot') && (
          <Grid item xs={12}>
            <QQPlot
              data={columnData}
              columnName={columns[selectedColumn]}
            />
          </Grid>
        )}

        {(visualizationType === 'all' || visualizationType === 'scatter') && selectedColumns.length > 1 && (
          <Grid item xs={12}>
            <ScatterMatrix
              data={data}
              columns={columns}
              selectedColumns={selectedColumns}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

// Helper functions
const calculateSkewness = (data) => {
  const n = data.length;
  const mean = jStat.mean(data);
  const std = jStat.stdev(data, true);
  const sum = data.reduce((acc, x) => acc + Math.pow((x - mean) / std, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
};

const calculateKurtosis = (data) => {
  const n = data.length;
  const mean = jStat.mean(data);
  const std = jStat.stdev(data, true);
  const sum = data.reduce((acc, x) => acc + Math.pow((x - mean) / std, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
};

const createSimpleHistogram = (data, bins) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins;

  const histogram = [];
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = data.filter(val =>
      i === bins - 1 ? val >= binStart && val <= binEnd : val >= binStart && val < binEnd
    ).length;

    histogram.push({ bin: i, count });
  }

  return histogram;
};

const getCorrelationColor = (correlation) => {
  const absCorr = Math.abs(correlation);
  if (absCorr > 0.7) return COLORS.secondary;
  if (absCorr > 0.4) return COLORS.warning;
  return COLORS.success;
};

export default StatisticalVisualizationDashboard;