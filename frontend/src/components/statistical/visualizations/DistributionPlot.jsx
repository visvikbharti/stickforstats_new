import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Grid
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  BubbleChart as ScatterIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine
} from 'recharts';

const DistributionPlot = ({
  data = [],
  type = 'histogram',
  showNormalCurve = true,
  showMean = true,
  showMedian = true,
  showStdDev = true,
  title = 'Distribution',
  height = 400,
  colors = ['#667eea', '#764ba2'],
  bins = 10
}) => {
  const [plotType, setPlotType] = useState(type);
  const [showOptions, setShowOptions] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [binCount, setBinCount] = useState(bins);
  const [showDensity, setShowDensity] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [processedData, setProcessedData] = useState([]);
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    if (data && data.length > 0) {
      processData();
      calculateStatistics();
    }
  }, [data, binCount, plotType]);

  const calculateStatistics = () => {
    if (!data || data.length === 0) return;

    const values = Array.isArray(data[0]) ? data.flat() : data;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2
      : sorted[Math.floor(n/2)];

    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];

    setStatistics({
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[n - 1],
      q1,
      q3,
      iqr: q3 - q1,
      count: n
    });
  };

  const processData = () => {
    if (!data || data.length === 0) return;

    const values = Array.isArray(data[0]) ? data.flat() : data;

    if (plotType === 'histogram') {
      const histogramData = createHistogram(values);
      setProcessedData(histogramData);
    } else if (plotType === 'density') {
      const densityData = createDensityPlot(values);
      setProcessedData(densityData);
    } else if (plotType === 'boxplot') {
      const boxplotData = createBoxplot(values);
      setProcessedData(boxplotData);
    } else if (plotType === 'violin') {
      const violinData = createViolinPlot(values);
      setProcessedData(violinData);
    }
  };

  const createHistogram = (values) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const binWidth = range / binCount;

    const bins = Array(binCount).fill(0).map((_, i) => ({
      start: min + i * binWidth,
      end: min + (i + 1) * binWidth,
      count: 0,
      density: 0,
      midpoint: min + (i + 0.5) * binWidth
    }));

    values.forEach(value => {
      const binIndex = Math.min(
        Math.floor((value - min) / binWidth),
        binCount - 1
      );
      bins[binIndex].count++;
    });

    const totalArea = values.length * binWidth;
    bins.forEach(bin => {
      bin.density = bin.count / totalArea;
    });

    if (showNormalCurve) {
      const mean = statistics.mean || values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = statistics.stdDev || Math.sqrt(
        values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length
      );

      bins.forEach(bin => {
        bin.normal = normalPDF(bin.midpoint, mean, stdDev) * values.length * binWidth;
      });
    }

    return bins;
  };

  const normalPDF = (x, mean, stdDev) => {
    const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
    return coefficient * Math.exp(exponent);
  };

  const createDensityPlot = (values) => {
    const points = 100;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.1;

    const densityData = [];
    for (let i = 0; i < points; i++) {
      const x = min - padding + (range + 2 * padding) * (i / (points - 1));
      let density = 0;

      values.forEach(value => {
        const bandwidth = 1.06 * statistics.stdDev * Math.pow(values.length, -1/5);
        density += normalPDF(x, value, bandwidth);
      });

      densityData.push({
        x: x,
        density: density / values.length
      });
    }

    return densityData;
  };

  const createBoxplot = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const q1 = sorted[Math.floor(n * 0.25)];
    const median = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    const lowerWhisker = Math.max(sorted[0], q1 - 1.5 * iqr);
    const upperWhisker = Math.min(sorted[n - 1], q3 + 1.5 * iqr);

    const outliers = values.filter(v => v < lowerWhisker || v > upperWhisker);

    return [{
      name: 'Distribution',
      min: sorted[0],
      lowerWhisker,
      q1,
      median,
      q3,
      upperWhisker,
      max: sorted[n - 1],
      outliers
    }];
  };

  const createViolinPlot = (values) => {
    const densityData = createDensityPlot(values);
    const boxplotData = createBoxplot(values);

    return {
      density: densityData,
      boxplot: boxplotData[0]
    };
  };

  const handleExport = (format) => {
    if (format === 'png') {
      // Implementation for PNG export would require a library like html2canvas
      console.log('Export as PNG');
    } else if (format === 'svg') {
      // Implementation for SVG export
      console.log('Export as SVG');
    } else if (format === 'csv') {
      exportAsCSV();
    }
    setAnchorEl(null);
  };

  const exportAsCSV = () => {
    const csv = processedData.map(row =>
      Object.values(row).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_distribution.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderHistogram = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" display={showGrid ? 'block' : 'none'} />
        <XAxis
          dataKey="midpoint"
          tickFormatter={(value) => value.toFixed(1)}
          label={{ value: 'Value', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          label={{ value: showDensity ? 'Density' : 'Frequency', angle: -90, position: 'insideLeft' }}
        />
        <ChartTooltip
          formatter={(value, name) => [
            typeof value === 'number' ? value.toFixed(3) : value,
            name
          ]}
        />
        <Legend />
        <Bar
          dataKey={showDensity ? 'density' : 'count'}
          fill={colors[0]}
          opacity={0.7}
          name="Frequency"
        />
        {showNormalCurve && (
          <Line
            type="monotone"
            dataKey="normal"
            stroke={colors[1]}
            strokeWidth={2}
            dot={false}
            name="Normal Curve"
          />
        )}
        {showMean && statistics.mean && (
          <ReferenceLine
            x={statistics.mean}
            stroke="#ff0000"
            strokeDasharray="5 5"
            label="Mean"
          />
        )}
        {showMedian && statistics.median && (
          <ReferenceLine
            x={statistics.median}
            stroke="#00ff00"
            strokeDasharray="5 5"
            label="Median"
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderDensityPlot = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" display={showGrid ? 'block' : 'none'} />
        <XAxis
          dataKey="x"
          tickFormatter={(value) => value.toFixed(1)}
          label={{ value: 'Value', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          label={{ value: 'Density', angle: -90, position: 'insideLeft' }}
        />
        <ChartTooltip
          formatter={(value) => value.toFixed(4)}
        />
        <Area
          type="monotone"
          dataKey="density"
          stroke={colors[0]}
          fill={colors[0]}
          fillOpacity={0.6}
        />
        {showMean && statistics.mean && (
          <ReferenceLine
            x={statistics.mean}
            stroke="#ff0000"
            strokeDasharray="5 5"
            label="Mean"
          />
        )}
        {showMedian && statistics.median && (
          <ReferenceLine
            x={statistics.median}
            stroke="#00ff00"
            strokeDasharray="5 5"
            label="Median"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderPlot = () => {
    switch (plotType) {
      case 'histogram':
        return renderHistogram();
      case 'density':
        return renderDensityPlot();
      default:
        return renderHistogram();
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <ToggleButtonGroup
            value={plotType}
            exclusive
            onChange={(e, v) => v && setPlotType(v)}
            size="small"
          >
            <ToggleButton value="histogram">
              <Tooltip title="Histogram">
                <BarChartIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="density">
              <Tooltip title="Density Plot">
                <LineChartIcon />
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
            <MenuItem onClick={() => handleExport('png')}>Export as PNG</MenuItem>
            <MenuItem onClick={() => handleExport('svg')}>Export as SVG</MenuItem>
            <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
          </Menu>
        </Box>
      </Box>

      {showOptions && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>Number of Bins</Typography>
              <Slider
                value={binCount}
                onChange={(e, v) => setBinCount(v)}
                min={5}
                max={50}
                valueLabelDisplay="auto"
                disabled={plotType !== 'histogram'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={<Switch checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />}
                  label="Show Grid"
                />
                <FormControlLabel
                  control={<Switch checked={showDensity} onChange={(e) => setShowDensity(e.target.checked)} />}
                  label="Show as Density"
                  disabled={plotType !== 'histogram'}
                />
                <FormControlLabel
                  control={<Switch checked={showMean} />}
                  label="Show Mean"
                />
                <FormControlLabel
                  control={<Switch checked={showMedian} />}
                  label="Show Median"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {renderPlot()}

      <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Mean</Typography>
            <Typography variant="body2" fontWeight="bold">
              {statistics.mean?.toFixed(3) || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Median</Typography>
            <Typography variant="body2" fontWeight="bold">
              {statistics.median?.toFixed(3) || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Std Dev</Typography>
            <Typography variant="body2" fontWeight="bold">
              {statistics.stdDev?.toFixed(3) || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Count</Typography>
            <Typography variant="body2" fontWeight="bold">
              {statistics.count || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default DistributionPlot;