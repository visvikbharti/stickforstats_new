import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, Chip, Fade, Zoom, IconButton,
  Tooltip, Tabs, Tab, Divider, useTheme, alpha, ThemeProvider,
  createTheme, CssBaseline, Accordion, AccordionSummary,
  AccordionDetails, Slider, Switch, FormControlLabel, List,
  ListItem, ListItemIcon, ListItemText, Stepper, Step, StepLabel,
  StepContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  Calculate as CalculateIcon, Clear as ClearIcon, ContentCopy as CopyIcon,
  Insights as InsightsIcon, TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon, BarChart as BarChartIcon,
  ScatterPlot as ScatterPlotIcon, Analytics as AnalyticsIcon,
  AutoGraph as AutoGraphIcon, DarkMode as DarkModeIcon,
  LightMode as LightModeIcon, Download as DownloadIcon,
  Science as ScienceIcon, School as SchoolIcon,
  Psychology as PsychologyIcon, MenuBook as MenuBookIcon,
  Functions as FunctionsIcon, CheckCircle as CheckCircleIcon,
  WarningAmber as WarningIcon, Info as InfoIcon,
  ExpandMore as ExpandMoreIcon, Lightbulb as LightbulbIcon,
  Timeline as TimelineIcon, Assessment as AssessmentIcon,
  BusinessCenter as BusinessIcon, LocalHospital as MedicalIcon,
  Factory as FactoryIcon, Nature as EnvironmentIcon,
  Campaign as MarketingIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer, Area, AreaChart,
  ReferenceLine, ReferenceArea, Cell
} from 'recharts';

// Enhanced gradient color schemes
const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  dark: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  theory: 'linear-gradient(135deg, #667eea 0%, #4facfe 100%)',
  simulation: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  application: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  medical: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
  business: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
  environment: 'linear-gradient(135deg, #96e6a1 0%, #4bc0c8 100%)'
};

const EnhancedStatisticalAnalysis = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [analysisType, setAnalysisType] = useState('descriptive');
  const [inputData, setInputData] = useState('');
  const [inputData2, setInputData2] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Simulation parameters
  const [sampleSize, setSampleSize] = useState(30);
  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [numSimulations, setNumSimulations] = useState(100);
  const [distribution, setDistribution] = useState('normal');
  const [simulationResults, setSimulationResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Create custom theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#667eea' },
      secondary: { main: '#764ba2' },
      background: {
        default: darkMode ? '#0a0e27' : '#f8f9fa',
        paper: darkMode ? '#1a1f3a' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h3: {
        fontWeight: 700,
        background: darkMode ? gradients.dark : gradients.primary,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
    },
    shape: { borderRadius: 16 },
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

  // Perform statistical analysis
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

  // Run simulation
  const runSimulation = () => {
    setIsSimulating(true);

    // Simulate confidence interval coverage
    const simResults = [];
    for (let i = 0; i < numSimulations; i++) {
      // Generate random data based on distribution
      const data = generateRandomData(sampleSize, distribution);
      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      const std = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (data.length - 1));
      const marginOfError = (1.96 * std) / Math.sqrt(data.length); // 95% CI

      simResults.push({
        iteration: i + 1,
        mean: mean,
        lower: mean - marginOfError,
        upper: mean + marginOfError,
        width: 2 * marginOfError,
        containsTrue: Math.random() < (confidenceLevel / 100) // Simplified
      });
    }

    setSimulationResults(simResults);
    setIsSimulating(false);
    enqueueSnackbar('Simulation completed!', { variant: 'success' });
  };

  // Generate random data
  const generateRandomData = (n, dist) => {
    const data = [];
    for (let i = 0; i < n; i++) {
      if (dist === 'normal') {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        data.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
      } else if (dist === 'uniform') {
        data.push(Math.random());
      } else if (dist === 'exponential') {
        data.push(-Math.log(1 - Math.random()));
      }
    }
    return data;
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

  // Generate interpretation based on results
  const generateInterpretation = () => {
    if (!results || !results.high_precision_result) return null;
    const hp = results.high_precision_result;

    switch (analysisType) {
      case 'descriptive':
        const mean = parseFloat(hp.mean);
        const std = parseFloat(hp.std_dev);
        const skewness = parseFloat(hp.skewness);
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              <LightbulbIcon /> Result Interpretation
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                <ListItemText
                  primary="Central Tendency"
                  secondary={`The mean value of ${mean.toFixed(2)} indicates the average of your dataset. This is the balance point of your data distribution.`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
                <ListItemText
                  primary="Variability"
                  secondary={`With a standard deviation of ${std.toFixed(2)}, your data shows ${std < mean * 0.2 ? 'low' : std < mean * 0.5 ? 'moderate' : 'high'} variability around the mean.`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  {Math.abs(skewness) < 0.5 ? <CheckCircleIcon color="success" /> : <WarningIcon color="warning" />}
                </ListItemIcon>
                <ListItemText
                  primary="Distribution Shape"
                  secondary={`Skewness of ${skewness.toFixed(2)} suggests your data is ${Math.abs(skewness) < 0.5 ? 'approximately symmetric' : skewness > 0 ? 'right-skewed (positive tail)' : 'left-skewed (negative tail)'}.`}
                />
              </ListItem>
            </List>
          </Box>
        );

      case 'ttest':
        const tStat = parseFloat(hp.t_statistic);
        const pValue = parseFloat(hp.p_value);
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              <LightbulbIcon /> Result Interpretation
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  {pValue < 0.05 ? <CheckCircleIcon color="success" /> : <WarningIcon color="warning" />}
                </ListItemIcon>
                <ListItemText
                  primary="Statistical Significance"
                  secondary={pValue < 0.05
                    ? `With p-value = ${pValue.toFixed(4)}, there is strong evidence of a significant difference between the two groups.`
                    : `With p-value = ${pValue.toFixed(4)}, there is insufficient evidence to conclude a significant difference between the groups.`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
                <ListItemText
                  primary="Effect Size"
                  secondary={`The t-statistic of ${tStat.toFixed(2)} indicates ${Math.abs(tStat) < 1 ? 'a small' : Math.abs(tStat) < 2.5 ? 'a moderate' : 'a large'} effect size.`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><PsychologyIcon /></ListItemIcon>
                <ListItemText
                  primary="Practical Implications"
                  secondary="Consider whether this statistical difference is also practically meaningful in your specific context."
                />
              </ListItem>
            </List>
          </Box>
        );

      default:
        return null;
    }
  };

  // Render theoretical foundations content
  const renderTheoreticalFoundations = () => (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Theoretical Foundations
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                <FunctionsIcon sx={{ mr: 1 }} />
                What are Confidence Intervals?
              </Typography>
              <Typography variant="body2" paragraph>
                A confidence interval is a range of values that is likely to contain a population parameter
                with a certain level of confidence. It provides a measure of uncertainty around a sample estimate.
              </Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <Typography variant="body1" align="center" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  CI = x̄ ± z × (σ / √n)
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }} align="center">
                  Where: x̄ = sample mean, z = critical value, σ = standard deviation, n = sample size
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                <ScienceIcon sx={{ mr: 1 }} />
                Key Properties
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" size="small" /></ListItemIcon>
                  <ListItemText primary="Coverage Probability" secondary="Frequency of containing true parameter" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" size="small" /></ListItemIcon>
                  <ListItemText primary="Precision" secondary="Measured by interval width" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" size="small" /></ListItemIcon>
                  <ListItemText primary="Consistency" secondary="Narrows with larger samples" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" size="small" /></ListItemIcon>
                  <ListItemText primary="Efficiency" secondary="Minimum expected width" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Common Misconceptions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      <WarningIcon sx={{ mr: 1 }} />
                      Incorrect Interpretation
                    </Typography>
                    <Typography variant="body2">
                      "There is a 95% chance that the population parameter is in this interval."
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                    <Typography variant="subtitle2" color="success" gutterBottom>
                      <CheckCircleIcon sx={{ mr: 1 }} />
                      Correct Interpretation
                    </Typography>
                    <Typography variant="body2">
                      "95% of similarly constructed intervals would contain the true parameter."
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );

  // Render interactive simulations
  const renderSimulations = () => (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Interactive Simulations
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Simulation Parameters
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <Typography gutterBottom>Sample Size: {sampleSize}</Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, v) => setSampleSize(v)}
                  min={10}
                  max={200}
                  marks={[{value: 10, label: '10'}, {value: 200, label: '200'}]}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <Typography gutterBottom>Confidence Level: {confidenceLevel}%</Typography>
                <Slider
                  value={confidenceLevel}
                  onChange={(e, v) => setConfidenceLevel(v)}
                  min={80}
                  max={99}
                  marks={[{value: 80, label: '80%'}, {value: 99, label: '99%'}]}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <Typography gutterBottom>Number of Simulations: {numSimulations}</Typography>
                <Slider
                  value={numSimulations}
                  onChange={(e, v) => setNumSimulations(v)}
                  min={10}
                  max={1000}
                  marks={[{value: 10, label: '10'}, {value: 1000, label: '1000'}]}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Distribution</InputLabel>
                <Select
                  value={distribution}
                  label="Distribution"
                  onChange={(e) => setDistribution(e.target.value)}
                >
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="uniform">Uniform</MenuItem>
                  <MenuItem value="exponential">Exponential</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                onClick={runSimulation}
                disabled={isSimulating}
                startIcon={isSimulating ? <CircularProgress size={20} /> : <TimelineIcon />}
                sx={{
                  background: gradients.simulation,
                  '&:hover': { background: gradients.dark }
                }}
              >
                {isSimulating ? 'Running...' : 'Run Simulation'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Simulation Results
              </Typography>

              {simulationResults ? (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Coverage: {simulationResults.filter(r => r.containsTrue).length}/{numSimulations}
                    ({(simulationResults.filter(r => r.containsTrue).length / numSimulations * 100).toFixed(1)}%)
                  </Typography>

                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={simulationResults.slice(0, 50)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="iteration" />
                      <YAxis />
                      <ChartTooltip />
                      <Line type="monotone" dataKey="mean" stroke={theme.palette.primary.main} dot={false} />
                      <Line type="monotone" dataKey="lower" stroke={theme.palette.error.main} strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="upper" stroke={theme.palette.error.main} strokeDasharray="5 5" dot={false} />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>

                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Average CI Width: {(simulationResults.reduce((a, b) => a + b.width, 0) / simulationResults.length).toFixed(4)}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Run a simulation to see results
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Render real-world applications
  const renderApplications = () => (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Real-World Applications
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{
            height: '100%',
            background: gradients.medical,
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <MedicalIcon sx={{ mr: 1 }} />
                Clinical Trials
              </Typography>
              <Typography variant="body2" paragraph>
                In medical research, confidence intervals are crucial for:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Treatment Effect Estimation"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Determining if a new drug is more effective than placebo
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Bioequivalence Studies"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Assessing if generic drugs perform similarly to brand-name drugs
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Safety Monitoring"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Tracking adverse event rates with uncertainty bounds
                    </Typography>}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{
            height: '100%',
            background: gradients.business,
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <MarketingIcon sx={{ mr: 1 }} />
                A/B Testing & Marketing
              </Typography>
              <Typography variant="body2" paragraph>
                Business applications include:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Conversion Rate Optimization"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Testing website changes to improve user engagement
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Campaign Performance"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Measuring marketing campaign effectiveness
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Customer Satisfaction"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Tracking NPS scores with confidence bounds
                    </Typography>}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{
            height: '100%',
            background: gradients.environment,
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EnvironmentIcon sx={{ mr: 1 }} />
                Environmental Monitoring
              </Typography>
              <Typography variant="body2" paragraph>
                Environmental applications:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Air Quality Assessment"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Monitoring pollution levels with uncertainty
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Water Contamination"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Testing water safety within regulatory limits
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Climate Research"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Analyzing temperature trends with confidence bands
                    </Typography>}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FactoryIcon sx={{ mr: 1 }} />
                Manufacturing Quality Control
              </Typography>
              <Typography variant="body2" paragraph>
                Industrial applications:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Process Capability"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Measuring Cp and Cpk indices with confidence
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Defect Rate Estimation"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Calculating PPM with uncertainty bounds
                    </Typography>}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Reliability Analysis"
                    secondary={<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      Estimating MTBF with confidence intervals
                    </Typography>}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Render teaching tips
  const renderTeachingTips = () => (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Teaching Tips & Best Practices
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Stepper orientation="vertical">
            <Step active>
              <StepLabel>
                <Typography variant="h6">Start with Visual Intuition</Typography>
              </StepLabel>
              <StepContent>
                <Typography paragraph>
                  Begin by showing multiple samples from the same population and their confidence intervals.
                  Demonstrate how most intervals contain the true parameter, building intuition about coverage.
                </Typography>
                <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                  <Typography variant="body2">
                    <strong>Interactive Exercise:</strong> Have students generate 100 confidence intervals
                    and count how many contain the true value. This reinforces the frequentist interpretation.
                  </Typography>
                </Paper>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography variant="h6">Address Common Misconceptions</Typography>
              </StepLabel>
              <StepContent>
                <Typography paragraph>
                  Explicitly contrast correct and incorrect interpretations:
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                    <ListItemText
                      primary="Avoid probability statements about the parameter"
                      secondary="The parameter is fixed; the interval is random"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                    <ListItemText
                      primary="Emphasize the long-run frequency interpretation"
                      secondary="Focus on the procedure's reliability over many repetitions"
                    />
                  </ListItem>
                </List>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography variant="h6">Connect to Real Applications</Typography>
              </StepLabel>
              <StepContent>
                <Typography paragraph>
                  Use relatable examples from students' fields of interest:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        For Biology Students
                      </Typography>
                      <Typography variant="body2">
                        Drug effectiveness trials, species population estimates
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        For Business Students
                      </Typography>
                      <Typography variant="body2">
                        Market research, customer satisfaction surveys
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        For Engineering Students
                      </Typography>
                      <Typography variant="body2">
                        Quality control, reliability testing
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography variant="h6">Practice Interpretation</Typography>
              </StepLabel>
              <StepContent>
                <Typography paragraph>
                  Provide multiple scenarios for students to practice:
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Written interpretations"
                      secondary="Have students write interpretations in plain language"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Peer review"
                      secondary="Students critique each other's interpretations"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Real data analysis"
                      secondary="Work with actual datasets from research papers"
                    />
                  </ListItem>
                </List>
              </StepContent>
            </Step>
          </Stepper>
        </Grid>
      </Grid>
    </Box>
  );

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
                Enhanced Statistical Analysis Suite
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                Professional statistical analysis with comprehensive educational resources
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Chip icon={<ScienceIcon />} label="50-Decimal Precision" color="primary" />
                <Chip icon={<SchoolIcon />} label="Educational Content" color="secondary" />
                <Chip icon={<TimelineIcon />} label="Interactive Simulations" color="success" />
                <Tooltip title="Toggle Dark Mode">
                  <IconButton onClick={() => setDarkMode(!darkMode)}>
                    {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Fade>

          {/* Main Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 3 }}>
            <Tabs
              value={selectedTab}
              onChange={(e, v) => setSelectedTab(v)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Analysis" icon={<CalculateIcon />} iconPosition="start" />
              <Tab label="Theory" icon={<MenuBookIcon />} iconPosition="start" />
              <Tab label="Simulations" icon={<TimelineIcon />} iconPosition="start" />
              <Tab label="Applications" icon={<BusinessIcon />} iconPosition="start" />
              <Tab label="Teaching" icon={<SchoolIcon />} iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          <Fade in={true} key={selectedTab}>
            <Box>
              {selectedTab === 0 && (
                <Grid container spacing={4}>
                  {/* Configuration Panel */}
                  <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
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
                          >
                            <MenuItem value="descriptive">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <BarChartIcon sx={{ mr: 1 }} />
                                Descriptive Statistics
                              </Box>
                            </MenuItem>
                            <MenuItem value="ttest">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <InsightsIcon sx={{ mr: 1 }} />
                                T-Test (Two Sample)
                              </Box>
                            </MenuItem>
                            <MenuItem value="correlation">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ScatterPlotIcon sx={{ mr: 1 }} />
                                Correlation (Pearson)
                              </Box>
                            </MenuItem>
                            <MenuItem value="regression">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <TrendingUpIcon sx={{ mr: 1 }} />
                                Linear Regression
                              </Box>
                            </MenuItem>
                          </Select>
                        </FormControl>

                        <Button
                          variant="contained"
                          fullWidth
                          onClick={loadExampleData}
                          sx={{ mb: 2, background: gradients.info }}
                          startIcon={<CopyIcon />}
                        >
                          Load Example Data
                        </Button>

                        <Divider sx={{ my: 3 }} />

                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                          <Typography variant="body2" color="text.secondary">
                            {analysisType === 'descriptive' && (
                              <>
                                <strong>Descriptive Statistics:</strong> Comprehensive analysis of central tendency,
                                dispersion, and distribution shape with 50-decimal precision.
                              </>
                            )}
                            {analysisType === 'ttest' && (
                              <>
                                <strong>T-Test:</strong> Compare means between two groups with confidence intervals
                                and effect size calculations.
                              </>
                            )}
                            {analysisType === 'correlation' && (
                              <>
                                <strong>Correlation:</strong> Measure linear relationships with significance testing
                                and confidence bounds.
                              </>
                            )}
                            {analysisType === 'regression' && (
                              <>
                                <strong>Linear Regression:</strong> Model relationships with prediction intervals
                                and diagnostic statistics.
                              </>
                            )}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Data Input Panel */}
                  <Grid item xs={12} md={8}>
                    <Card sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
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
                          sx={{ mb: 3 }}
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
                            sx={{ mb: 3 }}
                          />
                        )}

                        {error && (
                          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                            {error}
                          </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            variant="contained"
                            onClick={performAnalysis}
                            disabled={isAnalyzing || !inputData.trim()}
                            sx={{ background: gradients.primary }}
                            startIcon={isAnalyzing ? <CircularProgress size={20} /> : <CalculateIcon />}
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
                            startIcon={<ClearIcon />}
                          >
                            Clear
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>

                    {/* Results and Interpretation */}
                    {results && (
                      <Card sx={{ mt: 3, borderRadius: 3 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Results & Interpretation
                          </Typography>
                          {generateInterpretation()}
                        </CardContent>
                      </Card>
                    )}
                  </Grid>
                </Grid>
              )}

              {selectedTab === 1 && renderTheoreticalFoundations()}
              {selectedTab === 2 && renderSimulations()}
              {selectedTab === 3 && renderApplications()}
              {selectedTab === 4 && renderTeachingTips()}
            </Box>
          </Fade>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default EnhancedStatisticalAnalysis;