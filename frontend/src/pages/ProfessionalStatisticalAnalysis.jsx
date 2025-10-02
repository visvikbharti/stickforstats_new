import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  Fade,
  Zoom,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  useTheme,
  alpha,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  Insights as InsightsIcon,
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  BarChart as BarChartIcon,
  ScatterPlot as ScatterPlotIcon,
  Analytics as AnalyticsIcon,
  AutoGraph as AutoGraphIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Download as DownloadIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ReferenceLine
} from 'recharts';

// Beautiful gradient color schemes
const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  dark: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ocean: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  forest: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  night: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  aurora: 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)'
};

// Chart color palette
const chartColors = {
  primary: '#667eea',
  secondary: '#764ba2',
  tertiary: '#f093fb',
  quaternary: '#4facfe',
  success: '#00f2fe',
  warning: '#fa709a',
  danger: '#f5576c'
};

const ProfessionalStatisticalAnalysis = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [darkMode, setDarkMode] = useState(false);
  const [analysisType, setAnalysisType] = useState('descriptive');
  const [inputData, setInputData] = useState('');
  const [inputData2, setInputData2] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showVisualization, setShowVisualization] = useState(true);

  // Create custom theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#667eea',
      },
      secondary: {
        main: '#764ba2',
      },
      background: {
        default: darkMode ? '#0a0e27' : '#f8f9fa',
        paper: darkMode ? '#1a1f3a' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h3: {
        fontWeight: 700,
        background: darkMode ? gradients.night : gradients.primary,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
    },
    shape: {
      borderRadius: 16,
    },
  });

  // Parse comma-separated values
  const parseData = (dataString) => {
    if (!dataString.trim()) return null;
    const values = dataString
      .split(',')
      .map(val => val.trim())
      .filter(val => val !== '')
      .map(val => parseFloat(val))
      .filter(val => !isNaN(val));
    return values.length > 0 ? values : null;
  };

  // Generate visualization data based on analysis type
  const generateVisualizationData = (results, type) => {
    if (!results || !results.high_precision_result) return null;
    const hp = results.high_precision_result;
    const data1 = parseData(inputData);

    switch (type) {
      case 'descriptive':
        // Create histogram-like data
        if (!data1) return null;
        const min = Math.min(...data1);
        const max = Math.max(...data1);
        const bins = 10;
        const binSize = (max - min) / bins;
        const histogram = [];

        for (let i = 0; i < bins; i++) {
          const binStart = min + i * binSize;
          const binEnd = binStart + binSize;
          const count = data1.filter(v => v >= binStart && v < binEnd).length;
          histogram.push({
            range: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
            frequency: count,
            percentage: (count / data1.length * 100).toFixed(1)
          });
        }
        return { histogram, boxplot: calculateBoxplotData(data1) };

      case 'ttest':
        // Create comparison visualization
        const data2 = parseData(inputData2);
        if (!data1 || !data2) return null;

        return {
          comparison: [
            { group: 'Group 1', mean: calculateMean(data1), std: calculateStd(data1), size: data1.length },
            { group: 'Group 2', mean: calculateMean(data2), std: calculateStd(data2), size: data2.length }
          ],
          distributions: generateDistributionData(data1, data2)
        };

      case 'correlation':
      case 'regression':
        // Create scatter plot data
        const yData = parseData(inputData2);
        if (!data1 || !yData) return null;

        const scatterData = data1.map((x, i) => ({ x, y: yData[i] }));
        const slope = parseFloat(hp.slope || hp.correlation_coefficient || 0);
        const intercept = parseFloat(hp.intercept || 0);

        // Add regression line
        const regressionLine = data1.map(x => ({
          x,
          y: slope * x + intercept,
          yActual: yData[data1.indexOf(x)]
        }));

        return { scatter: scatterData, regression: regressionLine };

      default:
        return null;
    }
  };

  // Helper functions for calculations
  const calculateMean = (data) => data.reduce((a, b) => a + b, 0) / data.length;
  const calculateStd = (data) => {
    const mean = calculateMean(data);
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  };

  const calculateBoxplotData = (data) => {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    return { min, q1, median, q3, max };
  };

  const generateDistributionData = (data1, data2) => {
    const points = 50;
    const combined = [...data1, ...data2];
    const min = Math.min(...combined);
    const max = Math.max(...combined);
    const range = max - min;
    const step = range / points;

    const distribution = [];
    for (let i = 0; i < points; i++) {
      const x = min + i * step;
      distribution.push({
        x: x.toFixed(2),
        group1: gaussianDensity(x, calculateMean(data1), calculateStd(data1)),
        group2: gaussianDensity(x, calculateMean(data2), calculateStd(data2))
      });
    }
    return distribution;
  };

  const gaussianDensity = (x, mean, std) => {
    const coefficient = 1 / (std * Math.sqrt(2 * Math.PI));
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(std, 2));
    return coefficient * Math.exp(exponent);
  };

  // Perform analysis
  const performAnalysis = async () => {
    setError(null);
    setResults(null);
    const data1 = parseData(inputData);

    if (!data1) {
      setError('Please enter valid numerical data (comma-separated values)');
      return;
    }

    setIsAnalyzing(true);

    try {
      let endpoint = '';
      let payload = {};

      switch (analysisType) {
        case 'descriptive':
          endpoint = '/api/v1/stats/descriptive/';
          payload = { data: data1, statistics: 'all' };
          break;

        case 'ttest':
          const data2 = parseData(inputData2);
          if (!data2) {
            setError('T-Test requires two groups of data');
            setIsAnalyzing(false);
            return;
          }
          endpoint = '/api/v1/stats/ttest/';
          payload = { test_type: 'two_sample', data1: data1, data2: data2 };
          break;

        case 'correlation':
          const yData = parseData(inputData2);
          if (!yData || yData.length !== data1.length) {
            setError('Correlation requires two variables with equal number of values');
            setIsAnalyzing(false);
            return;
          }
          endpoint = '/api/v1/stats/correlation/';
          payload = { x: data1, y: yData, method: 'pearson' };
          break;

        case 'regression':
          const yValues = parseData(inputData2);
          if (!yValues || yValues.length !== data1.length) {
            setError('Regression requires X and Y values with equal length');
            setIsAnalyzing(false);
            return;
          }
          endpoint = '/api/v1/stats/regression/';
          payload = { type: 'simple_linear', X: data1, y: yValues };
          break;

        default:
          setError('Analysis type not yet implemented');
          setIsAnalyzing(false);
          return;
      }

      const response = await axios.post(`http://localhost:8000${endpoint}`, payload);

      if (response.data.high_precision_result) {
        setResults(response.data);
        enqueueSnackbar('Analysis completed successfully!', { variant: 'success' });
      } else {
        setError('Analysis completed but high precision results not available');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.error || 'Failed to perform analysis');
      enqueueSnackbar('Analysis failed', { variant: 'error' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load example data
  const loadExampleData = () => {
    switch (analysisType) {
      case 'descriptive':
        setInputData('12.5, 14.3, 11.8, 15.6, 13.2, 14.9, 12.1, 13.7, 15.2, 11.4, 14.8, 13.5, 12.9, 14.1, 15.8, 11.9, 13.3, 14.6, 12.7, 15.1');
        setInputData2('');
        break;
      case 'ttest':
        setInputData('23.5, 24.1, 22.8, 25.2, 23.9, 24.5, 23.2, 24.8, 23.6, 24.3');
        setInputData2('26.3, 27.1, 25.8, 28.2, 26.7, 27.5, 26.1, 27.9, 26.4, 27.3');
        break;
      case 'correlation':
      case 'regression':
        setInputData('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
        setInputData2('2.5, 5.1, 7.8, 10.2, 12.9, 15.3, 18.1, 20.7, 23.4, 26.0');
        break;
    }
    enqueueSnackbar('Example data loaded!', { variant: 'info' });
  };

  // Render beautiful result cards
  const renderResultCard = (title, value, icon, gradient, suffix = '') => (
    <Zoom in={true} timeout={500}>
      <Card
        sx={{
          background: gradient,
          color: 'white',
          borderRadius: 3,
          boxShadow: '0 10px 35px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 15px 45px rgba(0,0,0,0.3)',
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {icon}
            <Typography variant="subtitle2" sx={{ ml: 1, opacity: 0.9 }}>
              {title}
            </Typography>
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              fontSize: '1.1rem'
            }}
          >
            {value}
            {suffix && <span style={{ fontSize: '0.8rem', opacity: 0.8 }}> {suffix}</span>}
          </Typography>
        </CardContent>
      </Card>
    </Zoom>
  );

  // Render visualization based on analysis type
  const renderVisualization = () => {
    const vizData = generateVisualizationData(results, analysisType);
    if (!vizData) return null;

    switch (analysisType) {
      case 'descriptive':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom>Distribution Histogram</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vizData.histogram}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="frequency" fill={chartColors.primary}>
                      {vizData.histogram.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`${chartColors.primary}${Math.floor(50 + index * 20).toString(16)}`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom>Box Plot Summary</Typography>
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ position: 'relative', height: 60, mt: 4 }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '10%',
                        right: '10%',
                        height: 2,
                        backgroundColor: chartColors.primary,
                        top: '50%'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '25%',
                        right: '25%',
                        height: 40,
                        backgroundColor: alpha(chartColors.primary, 0.3),
                        border: `2px solid ${chartColors.primary}`,
                        top: '30%',
                        borderRadius: 1
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '50%',
                        width: 2,
                        height: 40,
                        backgroundColor: chartColors.danger,
                        top: '30%'
                      }}
                    />
                    {['10%', '25%', '50%', '75%', '90%'].map((label, i) => (
                      <Typography
                        key={label}
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          left: `${[10, 25, 50, 75, 90][i]}%`,
                          top: '80%',
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {label}
                      </Typography>
                    ))}
                  </Box>
                  <Grid container spacing={2} sx={{ mt: 4 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Min: {vizData.boxplot.min.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Max: {vizData.boxplot.max.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Q1: {vizData.boxplot.q1.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Q3: {vizData.boxplot.q3.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="primary">Median: {vizData.boxplot.median.toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        );

      case 'ttest':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom>Group Comparison</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vizData.comparison}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="group" />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="mean" fill={chartColors.primary} />
                    <Bar dataKey="std" fill={chartColors.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom>Distribution Curves</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={vizData.distributions}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="x" />
                    <YAxis />
                    <ChartTooltip />
                    <Area type="monotone" dataKey="group1" stroke={chartColors.primary} fill={alpha(chartColors.primary, 0.3)} />
                    <Area type="monotone" dataKey="group2" stroke={chartColors.secondary} fill={alpha(chartColors.secondary, 0.3)} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        );

      case 'correlation':
      case 'regression':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom>Scatter Plot with Regression Line</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="x" name="X" />
                    <YAxis dataKey="y" name="Y" />
                    <ChartTooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Data Points" data={vizData.scatter} fill={chartColors.primary} />
                    <Line
                      type="monotone"
                      data={vizData.regression}
                      dataKey="y"
                      stroke={chartColors.danger}
                      strokeWidth={2}
                      dot={false}
                      name="Regression Line"
                    />
                    <Legend />
                  </ScatterChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  // Render results based on analysis type
  const renderResults = () => {
    if (!results || !results.high_precision_result) return null;
    const hp = results.high_precision_result;

    switch (analysisType) {
      case 'descriptive':
        return (
          <Grid container spacing={3}>
            {hp.mean && renderResultCard('Mean', hp.mean, <TrendingUpIcon />, gradients.primary)}
            {hp.median && renderResultCard('Median', hp.median, <ShowChartIcon />, gradients.info)}
            {hp.std_dev && renderResultCard('Std Deviation', hp.std_dev, <BarChartIcon />, gradients.success)}
            {hp.variance && renderResultCard('Variance', hp.variance, <ScatterPlotIcon />, gradients.warning)}
            {hp.skewness && renderResultCard('Skewness', hp.skewness, <AnalyticsIcon />, gradients.dark)}
            {hp.kurtosis && renderResultCard('Kurtosis', hp.kurtosis, <AutoGraphIcon />, gradients.forest)}
          </Grid>
        );

      case 'ttest':
        return (
          <Grid container spacing={3}>
            {renderResultCard('T-Statistic', hp.t_statistic, <InsightsIcon />, gradients.primary)}
            {renderResultCard('P-Value', hp.p_value, <ScienceIcon />,
              parseFloat(hp.p_value) < 0.05 ? gradients.success : gradients.warning)}
            {hp.degrees_of_freedom && renderResultCard('Degrees of Freedom', hp.degrees_of_freedom, <AnalyticsIcon />, gradients.info)}
            {hp.confidence_interval_lower && renderResultCard('CI Lower', hp.confidence_interval_lower, <TrendingUpIcon />, gradients.ocean)}
            {hp.confidence_interval_upper && renderResultCard('CI Upper', hp.confidence_interval_upper, <TrendingUpIcon />, gradients.ocean)}
          </Grid>
        );

      case 'correlation':
        return (
          <Grid container spacing={3}>
            {renderResultCard('Correlation', hp.correlation_coefficient, <ScatterPlotIcon />, gradients.primary)}
            {renderResultCard('P-Value', hp.p_value, <ScienceIcon />, gradients.info)}
            {hp.r_squared && renderResultCard('R-Squared', hp.r_squared, <BarChartIcon />, gradients.success)}
          </Grid>
        );

      case 'regression':
        return (
          <Grid container spacing={3}>
            {renderResultCard('Slope', hp.slope, <TrendingUpIcon />, gradients.primary)}
            {renderResultCard('Intercept', hp.intercept, <ShowChartIcon />, gradients.info)}
            {hp.r_squared && renderResultCard('R-Squared', hp.r_squared, <BarChartIcon />, gradients.success)}
          </Grid>
        );

      default:
        return null;
    }
  };

  const requiresTwoInputs = ['ttest', 'correlation', 'regression'].includes(analysisType);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: darkMode
            ? 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)'
            : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Fade in={true} timeout={1000}>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Typography variant="h3" gutterBottom>
                Statistical Analysis Suite
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                Professional-grade statistical computations with 50-decimal precision
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Chip
                  icon={<ScienceIcon />}
                  label="50-Decimal Precision"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
                <Tooltip title="Toggle Dark Mode">
                  <IconButton
                    onClick={() => setDarkMode(!darkMode)}
                    sx={{
                      background: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        background: alpha(theme.palette.primary.main, 0.2),
                      },
                    }}
                  >
                    {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Fade>

          <Grid container spacing={4}>
            {/* Configuration Panel */}
            <Grid item xs={12} md={4}>
              <Fade in={true} timeout={1200}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
                    background: theme.palette.background.paper,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                      Configuration
                    </Typography>

                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>Analysis Type</InputLabel>
                      <Select
                        value={analysisType}
                        label="Analysis Type"
                        onChange={(e) => {
                          setAnalysisType(e.target.value);
                          setResults(null);
                          setError(null);
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="descriptive">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <BarChartIcon sx={{ mr: 1, color: chartColors.primary }} />
                            Descriptive Statistics
                          </Box>
                        </MenuItem>
                        <MenuItem value="ttest">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <InsightsIcon sx={{ mr: 1, color: chartColors.secondary }} />
                            T-Test (Two Sample)
                          </Box>
                        </MenuItem>
                        <MenuItem value="correlation">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ScatterPlotIcon sx={{ mr: 1, color: chartColors.tertiary }} />
                            Correlation (Pearson)
                          </Box>
                        </MenuItem>
                        <MenuItem value="regression">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TrendingUpIcon sx={{ mr: 1, color: chartColors.quaternary }} />
                            Linear Regression
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      fullWidth
                      onClick={loadExampleData}
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        background: gradients.info,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        '&:hover': {
                          background: gradients.dark,
                        },
                      }}
                      startIcon={<CopyIcon />}
                    >
                      Load Example Data
                    </Button>

                    <Divider sx={{ my: 3 }} />

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: alpha(theme.palette.primary.main, 0.05),
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {analysisType === 'descriptive' && (
                          <>
                            <strong>Descriptive Statistics:</strong> Analyze a single dataset to understand its central tendency,
                            dispersion, and distribution characteristics.
                          </>
                        )}
                        {analysisType === 'ttest' && (
                          <>
                            <strong>T-Test:</strong> Compare means between two groups to determine if they are statistically
                            different from each other.
                          </>
                        )}
                        {analysisType === 'correlation' && (
                          <>
                            <strong>Correlation:</strong> Measure the linear relationship between two continuous variables.
                          </>
                        )}
                        {analysisType === 'regression' && (
                          <>
                            <strong>Linear Regression:</strong> Model the relationship between variables and make predictions.
                          </>
                        )}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Data Input Panel */}
            <Grid item xs={12} md={8}>
              <Fade in={true} timeout={1400}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
                    background: theme.palette.background.paper,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                      Data Input
                    </Typography>

                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      variant="outlined"
                      label={requiresTwoInputs ? "Dataset 1 (X values)" : "Enter your data"}
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder="12.5, 14.3, 11.8, 15.6, 13.2..."
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />

                    {requiresTwoInputs && (
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        label="Dataset 2 (Y values)"
                        value={inputData2}
                        onChange={(e) => setInputData2(e.target.value)}
                        placeholder="26.3, 27.1, 25.8, 28.2, 26.7..."
                        sx={{
                          mb: 3,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    )}

                    {error && (
                      <Fade in={true}>
                        <Alert
                          severity="error"
                          sx={{
                            mb: 3,
                            borderRadius: 2,
                          }}
                        >
                          {error}
                        </Alert>
                      </Fade>
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        onClick={performAnalysis}
                        disabled={isAnalyzing || !inputData.trim()}
                        sx={{
                          borderRadius: 2,
                          background: gradients.primary,
                          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                          '&:hover': {
                            background: gradients.dark,
                          },
                        }}
                        startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Perform Analysis'}
                      </Button>

                      <Button
                        variant="outlined"
                        onClick={() => {
                          setInputData('');
                          setInputData2('');
                          setResults(null);
                          setError(null);
                        }}
                        sx={{
                          borderRadius: 2,
                          borderColor: theme.palette.primary.main,
                          color: theme.palette.primary.main,
                          '&:hover': {
                            borderColor: theme.palette.primary.dark,
                            background: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                        startIcon={<ClearIcon />}
                      >
                        Clear
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Results Panel */}
            {results && (
              <Grid item xs={12}>
                <Fade in={true} timeout={1600}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
                      background: theme.palette.background.paper,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          Analysis Results
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {results.metadata && (
                            <Chip
                              label={`${results.metadata.precision} decimal precision`}
                              color="primary"
                              size="small"
                            />
                          )}
                          <Tooltip title="Download Results">
                            <IconButton size="small">
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Tabs
                        value={selectedTab}
                        onChange={(e, v) => setSelectedTab(v)}
                        sx={{ mb: 3 }}
                      >
                        <Tab label="Statistics" />
                        <Tab label="Visualizations" />
                      </Tabs>

                      {selectedTab === 0 && (
                        <Fade in={true}>
                          <Box>{renderResults()}</Box>
                        </Fade>
                      )}

                      {selectedTab === 1 && (
                        <Fade in={true}>
                          <Box>{renderVisualization()}</Box>
                        </Fade>
                      )}
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ProfessionalStatisticalAnalysis;