import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Chip,
  Tabs,
  Tab,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  Science as ScienceIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Shield as ShieldIcon,
  Assessment as AssessmentIcon,
  ShowChart as ChartIcon,
  ScatterPlot as ScatterIcon,
  BarChart as BarIcon,
  Timeline as TimelineIcon,
  BubbleChart as BubbleIcon
} from '@mui/icons-material';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
  ComposedChart,
  ErrorBar,
  Dot
} from 'recharts';
import { useSnackbar } from 'notistack';
import { useDarkMode } from '../context/DarkModeContext';

const VisualEvidence = ({ data, testType, guardianReport = null }) => {
  const { darkMode } = useDarkMode();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const canvasRef = useRef(null);
  const [selectedPlot, setSelectedPlot] = useState(0);
  const [plotData, setPlotData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedVariable, setSelectedVariable] = useState('');

  useEffect(() => {
    if (data) {
      generatePlotData();
    }
  }, [data, selectedPlot]);

  const chartColors = {
    primary: darkMode ? '#667eea' : '#5a67d8',
    secondary: darkMode ? '#f093fb' : '#ed64a6',
    tertiary: darkMode ? '#4facfe' : '#4299e1',
    success: darkMode ? '#00f2fe' : '#48bb78',
    warning: darkMode ? '#fa709a' : '#ed8936',
    danger: darkMode ? '#f5576c' : '#f56565',
    grid: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    text: darkMode ? '#ffffff' : '#2d3748'
  };

  const calculateNormalDistribution = (mean, stdDev, count = 100) => {
    const points = [];
    const minX = mean - 4 * stdDev;
    const maxX = mean + 4 * stdDev;
    const step = (maxX - minX) / count;

    for (let x = minX; x <= maxX; x += step) {
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
      points.push({ x: x, y: y });
    }
    return points;
  };

  const generateQQPlot = (values) => {
    if (!values || values.length === 0) return [];

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    const qqData = sorted.map((value, i) => {
      const p = (i + 0.5) / n;
      const z = inverseNormalCDF(p);
      const theoretical = mean + stdDev * z;
      return {
        observed: value,
        theoretical: theoretical,
        percentile: p * 100
      };
    });

    return qqData;
  };

  const inverseNormalCDF = (p) => {
    const a1 = -3.969683028665376e+01;
    const a2 = 2.209460984245205e+02;
    const a3 = -2.759285104469687e+02;
    const a4 = 1.383577518672690e+02;
    const a5 = -3.066479806614716e+01;
    const a6 = 2.506628277459239e+00;

    const b1 = -5.447609879822406e+01;
    const b2 = 1.615858368580409e+02;
    const b3 = -1.556989798598866e+02;
    const b4 = 6.680131188771972e+01;
    const b5 = -1.328068155288572e+01;

    const c1 = -7.784894002430293e-03;
    const c2 = -3.223964580411365e-01;
    const c3 = -2.400758277161838e+00;
    const c4 = -2.549732539343734e+00;
    const c5 = 4.374664141464968e+00;
    const c6 = 2.938163982698783e+00;

    const d1 = 7.784695709041462e-03;
    const d2 = 3.224671290700398e-01;
    const d3 = 2.445134137142996e+00;
    const d4 = 3.754408661907416e+00;

    const p_low = 0.02425;
    const p_high = 1 - p_low;

    let q, r;

    if (p < p_low) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= p_high) {
      q = p - 0.5;
      r = q * q;
      return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
        (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
  };

  const generateHistogram = (values, bins = 20) => {
    if (!values || values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    const histogram = [];
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = values.filter(v => v >= binStart && v < binEnd).length;
      histogram.push({
        bin: i,
        range: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
        start: binStart,
        end: binEnd,
        count: count,
        frequency: count / values.length,
        midpoint: (binStart + binEnd) / 2
      });
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);
    const normalCurve = calculateNormalDistribution(mean, stdDev, 50);

    const maxFreq = Math.max(...histogram.map(h => h.frequency));
    const normalizedCurve = normalCurve.map(point => ({
      x: point.x,
      y: point.y * stdDev * Math.sqrt(2 * Math.PI) * maxFreq
    }));

    return { histogram, normalCurve: normalizedCurve, mean, stdDev };
  };

  const generateBoxPlot = (values) => {
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);

    const q1 = sorted[q1Index];
    const median = sorted[q2Index];
    const q3 = sorted[q3Index];

    const iqr = q3 - q1;
    const lowerWhisker = Math.max(Math.min(...sorted), q1 - 1.5 * iqr);
    const upperWhisker = Math.min(Math.max(...sorted), q3 + 1.5 * iqr);

    const outliers = sorted.filter(v => v < lowerWhisker || v > upperWhisker);

    return {
      min: Math.min(...sorted),
      q1: q1,
      median: median,
      q3: q3,
      max: Math.max(...sorted),
      lowerWhisker: lowerWhisker,
      upperWhisker: upperWhisker,
      outliers: outliers,
      iqr: iqr,
      mean: sorted.reduce((a, b) => a + b, 0) / n
    };
  };

  const generateResidualPlot = (observed, predicted) => {
    if (!observed || !predicted || observed.length !== predicted.length) return [];

    return observed.map((obs, i) => ({
      index: i,
      observed: obs,
      predicted: predicted[i],
      residual: obs - predicted[i],
      standardized: (obs - predicted[i]) / Math.sqrt(Math.abs(predicted[i]))
    }));
  };

  const generateScatterPlot = (xValues, yValues) => {
    if (!xValues || !yValues || xValues.length !== yValues.length) return [];

    const points = xValues.map((x, i) => ({
      x: x,
      y: yValues[i],
      index: i
    }));

    const n = points.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const trendLine = [
      { x: Math.min(...xValues), y: slope * Math.min(...xValues) + intercept },
      { x: Math.max(...xValues), y: slope * Math.max(...xValues) + intercept }
    ];

    const meanY = sumY / n;
    const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssResidual = yValues.reduce((sum, y, i) =>
      sum + Math.pow(y - (slope * xValues[i] + intercept), 2), 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return { points, trendLine, slope, intercept, r2 };
  };

  const generatePlotData = () => {
    setIsGenerating(true);

    try {
      if (!data || !data.data || data.data.length === 0) {
        setPlotData(null);
        setIsGenerating(false);
        return;
      }

      const dataset = data.data;
      const columns = data.columns || Object.keys(dataset[0]);
      const numericColumns = columns.filter(col => {
        const values = dataset.map(row => parseFloat(row[col]));
        return values.some(v => !isNaN(v));
      });

      if (numericColumns.length === 0) {
        enqueueSnackbar('No numeric data available for visualization', { variant: 'warning' });
        setPlotData(null);
        setIsGenerating(false);
        return;
      }

      const primaryColumn = selectedVariable || numericColumns[0];
      const values = dataset.map(row => parseFloat(row[primaryColumn])).filter(v => !isNaN(v));

      let newPlotData = {};

      switch (selectedPlot) {
        case 0:
          newPlotData = {
            type: 'qq',
            data: generateQQPlot(values),
            column: primaryColumn
          };
          break;

        case 1:
          const histResult = generateHistogram(values);
          newPlotData = {
            type: 'histogram',
            ...histResult,
            column: primaryColumn
          };
          break;

        case 2:
          if (numericColumns.length >= 2) {
            const xCol = numericColumns[0];
            const yCol = numericColumns[1];
            const xValues = dataset.map(row => parseFloat(row[xCol])).filter(v => !isNaN(v));
            const yValues = dataset.map(row => parseFloat(row[yCol])).filter(v => !isNaN(v));
            newPlotData = {
              type: 'scatter',
              ...generateScatterPlot(xValues, yValues),
              xColumn: xCol,
              yColumn: yCol
            };
          }
          break;

        case 3:
          newPlotData = {
            type: 'box',
            data: generateBoxPlot(values),
            column: primaryColumn
          };
          break;

        case 4:
          const predicted = values.map((v, i) => v + (Math.random() - 0.5) * 2);
          newPlotData = {
            type: 'residual',
            data: generateResidualPlot(values, predicted),
            column: primaryColumn
          };
          break;

        default:
          break;
      }

      setPlotData(newPlotData);
    } catch (error) {
      console.error('Error generating plot data:', error);
      enqueueSnackbar('Error generating visualization', { variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPlot = () => {
    const svgElement = document.querySelector('.recharts-wrapper svg');
    if (!svgElement) {
      enqueueSnackbar('No chart available to download', { variant: 'warning' });
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = darkMode ? '#1a1a1a' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visual_evidence_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    enqueueSnackbar('Plot downloaded successfully', { variant: 'success' });
  };

  const renderQQPlot = () => {
    if (!plotData || plotData.type !== 'qq') return null;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            dataKey="theoretical"
            name="Theoretical Quantiles"
            label={{ value: 'Theoretical Quantiles', position: 'insideBottom', offset: -10, fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <YAxis
            dataKey="observed"
            name="Sample Quantiles"
            label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft', fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <ChartTooltip
            contentStyle={{
              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
              border: `1px solid ${chartColors.primary}`,
              borderRadius: 8
            }}
          />
          <ReferenceLine
            x={Math.min(...plotData.data.map(d => d.theoretical))}
            y={Math.min(...plotData.data.map(d => d.theoretical))}
            stroke={chartColors.danger}
            strokeDasharray="5 5"
          />
          <Scatter
            data={plotData.data}
            fill={chartColors.primary}
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  const renderHistogram = () => {
    if (!plotData || plotData.type !== 'histogram') return null;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={plotData.histogram} margin={{ top: 20, right: 20, bottom: 50, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            dataKey="midpoint"
            label={{ value: 'Value', position: 'insideBottom', offset: -10, fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <YAxis
            label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <ChartTooltip
            contentStyle={{
              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
              border: `1px solid ${chartColors.primary}`,
              borderRadius: 8
            }}
          />
          <Bar dataKey="frequency" fill={alpha(chartColors.primary, 0.7)} />
          <Line
            type="monotone"
            data={plotData.normalCurve}
            dataKey="y"
            stroke={chartColors.danger}
            strokeWidth={2}
            dot={false}
            name="Normal Distribution"
          />
          <ReferenceLine x={plotData.mean} stroke={chartColors.success} strokeDasharray="5 5" />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const renderScatterPlot = () => {
    if (!plotData || plotData.type !== 'scatter') return null;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            type="number"
            dataKey="x"
            name={plotData.xColumn}
            label={{ value: plotData.xColumn, position: 'insideBottom', offset: -10, fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={plotData.yColumn}
            label={{ value: plotData.yColumn, angle: -90, position: 'insideLeft', fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <ChartTooltip
            contentStyle={{
              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
              border: `1px solid ${chartColors.primary}`,
              borderRadius: 8
            }}
          />
          <Scatter
            name="Data Points"
            data={plotData.points}
            fill={chartColors.primary}
          />
          <Line
            type="linear"
            data={plotData.trendLine}
            dataKey="y"
            stroke={chartColors.danger}
            strokeWidth={2}
            dot={false}
            name="Trend Line"
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  const renderBoxPlot = () => {
    if (!plotData || plotData.type !== 'box' || !plotData.data) return null;

    const boxData = plotData.data;
    const boxPlotData = [
      { name: 'Min', value: boxData.min },
      { name: 'Q1', value: boxData.q1 },
      { name: 'Median', value: boxData.median },
      { name: 'Q3', value: boxData.q3 },
      { name: 'Max', value: boxData.max }
    ];

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={boxPlotData} margin={{ top: 20, right: 20, bottom: 50, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            dataKey="name"
            stroke={chartColors.text}
          />
          <YAxis
            label={{ value: 'Value', angle: -90, position: 'insideLeft', fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <ChartTooltip
            contentStyle={{
              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
              border: `1px solid ${chartColors.primary}`,
              borderRadius: 8
            }}
          />
          <Bar dataKey="value" fill={chartColors.primary} />
          <ReferenceLine y={boxData.mean} stroke={chartColors.danger} strokeDasharray="5 5" label="Mean" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderResidualPlot = () => {
    if (!plotData || plotData.type !== 'residual') return null;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart data={plotData.data} margin={{ top: 20, right: 20, bottom: 50, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            dataKey="predicted"
            name="Fitted Values"
            label={{ value: 'Fitted Values', position: 'insideBottom', offset: -10, fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <YAxis
            dataKey="residual"
            name="Residuals"
            label={{ value: 'Residuals', angle: -90, position: 'insideLeft', fill: chartColors.text }}
            stroke={chartColors.text}
          />
          <ChartTooltip
            contentStyle={{
              backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
              border: `1px solid ${chartColors.primary}`,
              borderRadius: 8
            }}
          />
          <ReferenceLine y={0} stroke={chartColors.danger} strokeDasharray="5 5" />
          <Scatter
            name="Residuals"
            data={plotData.data}
            fill={chartColors.primary}
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  const renderPlot = () => {
    if (isGenerating) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!plotData) {
      return (
        <Alert severity="info">
          No data available for visualization. Please load data first.
        </Alert>
      );
    }

    switch (plotData.type) {
      case 'qq':
        return renderQQPlot();
      case 'histogram':
        return renderHistogram();
      case 'scatter':
        return renderScatterPlot();
      case 'box':
        return renderBoxPlot();
      case 'residual':
        return renderResidualPlot();
      default:
        return null;
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        background: darkMode
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ScienceIcon sx={{ mr: 2, fontSize: 32, color: theme.palette.primary.main }} />
        <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1 }}>
          Visual Evidence Generator
        </Typography>

        {data && data.columns && (
          <FormControl size="small" sx={{ minWidth: 150, mr: 2 }}>
            <InputLabel>Variable</InputLabel>
            <Select
              value={selectedVariable}
              onChange={(e) => {
                setSelectedVariable(e.target.value);
              }}
              label="Variable"
            >
              {data.columns.filter(col => {
                const values = data.data.map(row => parseFloat(row[col]));
                return values.some(v => !isNaN(v));
              }).map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Tooltip title="Refresh Plot">
          <IconButton onClick={generatePlotData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Download Plot">
          <IconButton onClick={downloadPlot} color="primary">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {guardianReport && guardianReport.visual_requirements && (
        <Alert
          severity="info"
          icon={<ShieldIcon />}
          sx={{
            mb: 2,
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            color: '#000'
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Guardian System Requirements:
          </Typography>
          <Typography variant="body2">
            {guardianReport.visual_requirements}
          </Typography>
        </Alert>
      )}

      <Tabs
        value={selectedPlot}
        onChange={(e, newValue) => setSelectedPlot(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<ChartIcon />} label="Q-Q Plot" />
        <Tab icon={<BarIcon />} label="Histogram" />
        <Tab icon={<ScatterIcon />} label="Scatter Plot" />
        <Tab icon={<TimelineIcon />} label="Box Plot" />
        <Tab icon={<BubbleIcon />} label="Residual Plot" />
      </Tabs>

      <Card elevation={2}>
        <CardContent>
          {renderPlot()}

          {plotData && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Plot Information
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={`Type: ${plotData.type.toUpperCase()}`}
                    color="primary"
                  />
                  {plotData.column && (
                    <Chip
                      size="small"
                      label={`Variable: ${plotData.column}`}
                      color="secondary"
                    />
                  )}
                  {plotData.r2 !== undefined && (
                    <Chip
                      size="small"
                      label={`R²: ${plotData.r2.toFixed(4)}`}
                      color="success"
                    />
                  )}
                  {plotData.mean !== undefined && (
                    <Chip
                      size="small"
                      label={`Mean: ${plotData.mean.toFixed(4)}`}
                      color="info"
                    />
                  )}
                  {plotData.stdDev !== undefined && (
                    <Chip
                      size="small"
                      label={`Std Dev: ${plotData.stdDev.toFixed(4)}`}
                      color="warning"
                    />
                  )}
                </Box>
              </Grid>

              {plotData.type === 'box' && plotData.data && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Box Plot Statistics
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={4} md={2}>
                      <Typography variant="caption" color="textSecondary">Min</Typography>
                      <Typography variant="body2">{plotData.data.min.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Typography variant="caption" color="textSecondary">Q1</Typography>
                      <Typography variant="body2">{plotData.data.q1.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Typography variant="caption" color="textSecondary">Median</Typography>
                      <Typography variant="body2">{plotData.data.median.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Typography variant="caption" color="textSecondary">Q3</Typography>
                      <Typography variant="body2">{plotData.data.q3.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Typography variant="caption" color="textSecondary">Max</Typography>
                      <Typography variant="body2">{plotData.data.max.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                      <Typography variant="caption" color="textSecondary">IQR</Typography>
                      <Typography variant="body2">{plotData.data.iqr.toFixed(4)}</Typography>
                    </Grid>
                  </Grid>
                  {plotData.data.outliers && plotData.data.outliers.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        {plotData.data.outliers.length} outliers detected
                      </Typography>
                    </Alert>
                  )}
                </Grid>
              )}

              {plotData.type === 'scatter' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Regression Statistics
                  </Typography>
                  <Typography variant="body2">
                    Equation: y = {plotData.slope.toFixed(4)}x + {plotData.intercept.toFixed(4)}
                  </Typography>
                  <Typography variant="body2">
                    R² = {plotData.r2.toFixed(4)} ({(plotData.r2 * 100).toFixed(2)}% variance explained)
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Paper>
  );
};

export default VisualEvidence;