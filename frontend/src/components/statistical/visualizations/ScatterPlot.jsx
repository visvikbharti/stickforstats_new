import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  TrendingUp as TrendIcon,
  BubbleChart as BubbleIcon,
  ScatterPlot as ScatterIcon
} from '@mui/icons-material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Line,
  ComposedChart
} from 'recharts';

const ScatterPlot = ({
  data = [],
  xLabel = 'X Variable',
  yLabel = 'Y Variable',
  title = 'Scatter Plot',
  showRegression = true,
  showConfidenceBands = false,
  showCorrelation = true,
  showGrid = true,
  height = 400,
  colors = ['#667eea', '#764ba2', '#f093fb'],
  pointSize = 60,
  groupBy = null
}) => {
  const [processedData, setProcessedData] = useState([]);
  const [regression, setRegression] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showTrendline, setShowTrendline] = useState(showRegression);
  const [showDataLabels, setShowDataLabels] = useState(false);
  const [highlightOutliers, setHighlightOutliers] = useState(false);
  const [plotType, setPlotType] = useState('scatter');
  const [showConfidenceBandsState, setShowConfidenceBands] = useState(showConfidenceBands);
  const [showGridState, setShowGrid] = useState(showGrid);

  useEffect(() => {
    if (data && data.length > 0) {
      processData();
      if (showRegression || showCorrelation) {
        calculateStatistics();
      }
    }
  }, [data, showRegression, showCorrelation]);

  const processData = () => {
    if (!data || data.length === 0) return;

    let processed;
    if (Array.isArray(data[0])) {
      // Data is in format [[x1, y1], [x2, y2], ...]
      processed = data.map(([x, y], index) => ({
        x,
        y,
        index,
        label: `Point ${index + 1}`
      }));
    } else if (typeof data[0] === 'object') {
      // Data is already in object format
      processed = data.map((d, index) => ({
        ...d,
        index,
        label: d.label || `Point ${index + 1}`
      }));
    }

    // Identify outliers if requested
    if (highlightOutliers && processed) {
      const xValues = processed.map(d => d.x);
      const yValues = processed.map(d => d.y);

      const xMean = mean(xValues);
      const yMean = mean(yValues);
      const xStd = stdDev(xValues);
      const yStd = stdDev(yValues);

      processed = processed.map(point => ({
        ...point,
        isOutlier: Math.abs(point.x - xMean) > 2 * xStd ||
                   Math.abs(point.y - yMean) > 2 * yStd
      }));
    }

    setProcessedData(processed);
  };

  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

  const stdDev = (values) => {
    const avg = mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(mean(squareDiffs));
  };

  const calculateStatistics = () => {
    if (!processedData || processedData.length < 2) return;

    const xValues = processedData.map(d => d.x);
    const yValues = processedData.map(d => d.y);

    // Calculate correlation
    const n = xValues.length;
    const xMean = mean(xValues);
    const yMean = mean(yValues);

    const numerator = processedData.reduce((sum, d) =>
      sum + (d.x - xMean) * (d.y - yMean), 0
    );

    const xDenom = Math.sqrt(xValues.reduce((sum, x) =>
      sum + Math.pow(x - xMean, 2), 0
    ));

    const yDenom = Math.sqrt(yValues.reduce((sum, y) =>
      sum + Math.pow(y - yMean, 2), 0
    ));

    const r = numerator / (xDenom * yDenom);
    setCorrelation({
      r: r,
      r2: r * r,
      pValue: calculatePValue(r, n),
      interpretation: getCorrelationInterpretation(r)
    });

    // Calculate regression line
    if (showRegression) {
      const slope = numerator / xValues.reduce((sum, x) =>
        sum + Math.pow(x - xMean, 2), 0
      );
      const intercept = yMean - slope * xMean;

      // Calculate standard error
      const residuals = processedData.map(d =>
        d.y - (slope * d.x + intercept)
      );
      const se = Math.sqrt(residuals.reduce((sum, r) =>
        sum + r * r, 0
      ) / (n - 2));

      setRegression({
        slope,
        intercept,
        equation: `y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)}`,
        se,
        confidenceBands: calculateConfidenceBands(xValues, slope, intercept, se, n)
      });
    }
  };

  const calculatePValue = (r, n) => {
    // Simplified p-value calculation using t-distribution
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const df = n - 2;
    // This is a rough approximation
    if (Math.abs(t) > 3) return 0.001;
    if (Math.abs(t) > 2) return 0.05;
    return 0.1;
  };

  const getCorrelationInterpretation = (r) => {
    const absR = Math.abs(r);
    if (absR < 0.1) return 'Negligible';
    if (absR < 0.3) return 'Weak';
    if (absR < 0.5) return 'Moderate';
    if (absR < 0.7) return 'Strong';
    return 'Very Strong';
  };

  const calculateConfidenceBands = (xValues, slope, intercept, se, n) => {
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const xMean = mean(xValues);
    const ssx = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);

    const bands = [];
    const steps = 50;
    const tValue = 1.96; // Approximate t-value for 95% CI

    for (let i = 0; i <= steps; i++) {
      const x = xMin + (xMax - xMin) * (i / steps);
      const y = slope * x + intercept;
      const margin = tValue * se * Math.sqrt(1/n + Math.pow(x - xMean, 2) / ssx);

      bands.push({
        x,
        y,
        lower: y - margin,
        upper: y + margin,
        fit: y
      });
    }

    return bands;
  };

  const handleExport = (format) => {
    if (format === 'csv') {
      exportAsCSV();
    }
    setAnchorEl(null);
  };

  const exportAsCSV = () => {
    const headers = ['Index', 'X', 'Y', 'Label'];
    const rows = processedData.map(d =>
      [d.index, d.x, d.y, d.label].join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_scatter.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1 }}>
          <Typography variant="caption" display="block">
            {data.label}
          </Typography>
          <Typography variant="caption" display="block">
            {xLabel}: {data.x.toFixed(3)}
          </Typography>
          <Typography variant="caption" display="block">
            {yLabel}: {data.y.toFixed(3)}
          </Typography>
          {data.isOutlier && (
            <Chip label="Outlier" size="small" color="warning" />
          )}
        </Paper>
      );
    }
    return null;
  };

  const renderRegressionLine = () => {
    if (!regression || !showTrendline) return null;

    const xMin = Math.min(...processedData.map(d => d.x));
    const xMax = Math.max(...processedData.map(d => d.x));

    return (
      <>
        <ReferenceLine
          segment={[
            { x: xMin, y: regression.slope * xMin + regression.intercept },
            { x: xMax, y: regression.slope * xMax + regression.intercept }
          ]}
          stroke={colors[1]}
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        {showConfidenceBandsState && regression.confidenceBands && (
          <>
            <Line
              data={regression.confidenceBands}
              dataKey="upper"
              stroke={colors[1]}
              strokeWidth={1}
              dot={false}
              strokeOpacity={0.3}
            />
            <Line
              data={regression.confidenceBands}
              dataKey="lower"
              stroke={colors[1]}
              strokeWidth={1}
              dot={false}
              strokeOpacity={0.3}
            />
          </>
        )}
      </>
    );
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          {correlation && showCorrelation && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip
                label={`r = ${correlation.r.toFixed(3)}`}
                size="small"
                color={Math.abs(correlation.r) > 0.5 ? 'primary' : 'default'}
              />
              <Chip
                label={`r² = ${correlation.r2.toFixed(3)}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={correlation.interpretation}
                size="small"
                variant="outlined"
              />
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <ToggleButtonGroup
            value={plotType}
            exclusive
            onChange={(e, v) => v && setPlotType(v)}
            size="small"
          >
            <ToggleButton value="scatter">
              <Tooltip title="Scatter Plot">
                <ScatterIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="bubble">
              <Tooltip title="Bubble Plot">
                <BubbleIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <IconButton onClick={() => setShowOptions(!showOptions)} size="small">
            <SettingsIcon />
          </IconButton>

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <DownloadIcon />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
          </Menu>
        </Box>
      </Box>

      {showOptions && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showTrendline}
                    onChange={(e) => setShowTrendline(e.target.checked)}
                  />
                }
                label="Show Regression Line"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showConfidenceBandsState}
                    onChange={(e) => setShowConfidenceBands(e.target.checked)}
                    disabled={!showTrendline}
                  />
                }
                label="Show Confidence Bands"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showGridState}
                    onChange={(e) => setShowGrid(e.target.checked)}
                  />
                }
                label="Show Grid"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={highlightOutliers}
                    onChange={(e) => setHighlightOutliers(e.target.checked)}
                  />
                }
                label="Highlight Outliers"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" display={showGridState ? 'block' : 'none'} />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            label={{ value: xLabel, position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
          />
          <ChartTooltip content={<CustomTooltip />} />
          <Scatter
            name="Data Points"
            data={processedData}
            fill={colors[0]}
          >
            {processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isOutlier ? colors[2] : colors[0]}
              />
            ))}
          </Scatter>
          {renderRegressionLine()}
        </ScatterChart>
      </ResponsiveContainer>

      {regression && showTrendline && (
        <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Regression Equation
          </Typography>
          <Typography variant="body2" fontFamily="monospace">
            {regression.equation}
          </Typography>
          {regression.se && (
            <Typography variant="caption" color="text.secondary">
              Standard Error: {regression.se.toFixed(4)}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ScatterPlot;