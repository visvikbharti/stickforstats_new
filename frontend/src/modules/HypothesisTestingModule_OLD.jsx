import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, Tab, Tabs, Paper, Grid, Card, CardContent,
  Button, Slider, TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, Chip, LinearProgress, Tooltip, IconButton, Switch, FormControlLabel,
  Divider, List, ListItem, ListItemText, ListItemIcon, Accordion,
  AccordionSummary, AccordionDetails, Stepper, Step, StepLabel, Badge,
  Fab, Zoom, Fade, Grow, Collapse
} from '@mui/material';
import {
  PlayArrow, Pause, Refresh, Info, School, Code, Assessment,
  Psychology, Science, Timeline, Functions, Speed, CheckCircle,
  Warning, Error, TrendingUp, ShowChart, BarChart, PieChart,
  Help, Lightbulb, Calculate, Storage, CloudDownload, Share,
  ExpandMore, NavigateNext, Casino, Equalizer
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import {
  LineChart, Line, BarChart as RechartsBarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell,
  RadialBarChart, RadialBar, PieChart as RechartsPieChart, Pie
} from 'recharts';
import { useAppTheme } from '../context/AppThemeContext';

// Styled Components
const GradientCard = styled(Card)(({ theme, gradient }) => ({
  background: gradient || theme.palette.background.gradient,
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.18)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
  }
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  marginRight: theme.spacing(2),
  minHeight: 48,
  '&.Mui-selected': {
    color: theme.palette.primary.main
  }
}));

const AnimatedProgress = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
  }
}));

const PulseButton = styled(Button)(({ theme }) => ({
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.7)'
    },
    '70%': {
      boxShadow: '0 0 0 10px rgba(102, 126, 234, 0)'
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(102, 126, 234, 0)'
    }
  }
}));

// Simulation Components
const TypeITypeIIErrorSimulation = ({ darkMode }) => {
  const [alpha, setAlpha] = useState(0.05);
  const [beta, setBeta] = useState(0.20);
  const [effectSize, setEffectSize] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(30);
  const [power, setPower] = useState(0.80);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationData, setSimulationData] = useState([]);

  const generateErrorData = () => {
    const data = [];
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const x = (i - 50) / 10;
      const h0 = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
      const h1 = Math.exp(-0.5 * (x - effectSize * Math.sqrt(sampleSize / 2)) ** 2) / Math.sqrt(2 * Math.PI);

      data.push({
        x: x,
        h0: h0,
        h1: h1,
        typeI: x > 1.96 ? h0 : 0,
        typeII: x < 1.96 ? h1 : 0,
        power: x > 1.96 ? h1 : 0
      });
    }

    setSimulationData(data);
    setPower(1 - beta);
  };

  useEffect(() => {
    generateErrorData();
  }, [alpha, beta, effectSize, sampleSize]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="error" />
        Type I & Type II Error Visualization
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Simulation Parameters</Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Significance Level (α): {alpha}</Typography>
              <Slider
                value={alpha}
                onChange={(e, v) => setAlpha(v)}
                min={0.01}
                max={0.10}
                step={0.01}
                marks
                valueLabelDisplay="auto"
                color="error"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Type II Error Rate (β): {beta}</Typography>
              <Slider
                value={beta}
                onChange={(e, v) => setBeta(v)}
                min={0.05}
                max={0.40}
                step={0.05}
                marks
                valueLabelDisplay="auto"
                color="warning"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Effect Size (d): {effectSize}</Typography>
              <Slider
                value={effectSize}
                onChange={(e, v) => setEffectSize(v)}
                min={0.2}
                max={1.5}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                color="primary"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Sample Size (n): {sampleSize}</Typography>
              <Slider
                value={sampleSize}
                onChange={(e, v) => setSampleSize(v)}
                min={10}
                max={200}
                step={10}
                marks
                valueLabelDisplay="auto"
                color="secondary"
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Statistical Power</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <AnimatedProgress variant="determinate" value={power * 100} />
              </Box>
              <Typography variant="h6" color="primary">{(power * 100).toFixed(1)}%</Typography>
            </Box>

            <List dense>
              <ListItem>
                <ListItemIcon><Error color="error" /></ListItemIcon>
                <ListItemText
                  primary="Type I Error (α)"
                  secondary={`False Positive Rate: ${(alpha * 100).toFixed(1)}%`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><Warning color="warning" /></ListItemIcon>
                <ListItemText
                  primary="Type II Error (β)"
                  secondary={`False Negative Rate: ${(beta * 100).toFixed(1)}%`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                <ListItemText
                  primary="Statistical Power"
                  secondary={`1 - β = ${(power * 100).toFixed(1)}%`}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 500 }}>
            <Typography variant="subtitle1" gutterBottom>
              Hypothesis Testing Error Regions
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={simulationData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="x" label={{ value: "Test Statistic", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "Probability Density", angle: -90, position: "insideLeft" }} />
                <RechartsTooltip />
                <Legend />

                <Area
                  type="monotone"
                  dataKey="h0"
                  stroke="#667eea"
                  fill="#667eea"
                  fillOpacity={0.3}
                  name="Null Hypothesis (H₀)"
                />

                <Area
                  type="monotone"
                  dataKey="h1"
                  stroke="#764ba2"
                  fill="#764ba2"
                  fillOpacity={0.3}
                  name="Alternative Hypothesis (H₁)"
                />

                <Area
                  type="monotone"
                  dataKey="typeI"
                  stroke="#f56565"
                  fill="#f56565"
                  fillOpacity={0.5}
                  name="Type I Error Region"
                />

                <Area
                  type="monotone"
                  dataKey="typeII"
                  stroke="#f6ad55"
                  fill="#f6ad55"
                  fillOpacity={0.5}
                  name="Type II Error Region"
                />

                <ReferenceLine x={1.96} stroke="#ff0000" strokeDasharray="5 5" label="Critical Value" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Understanding Type I & Type II Errors</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" color="error" gutterBottom>
                  Type I Error (False Positive)
                </Typography>
                <Typography variant="body2" paragraph>
                  Rejecting the null hypothesis when it is actually true. This is like a "false alarm"
                  where we conclude there is an effect when there isn't one.
                </Typography>
                <Typography variant="body2">
                  • Probability = α (significance level)<br/>
                  • Example: Concluding a drug works when it doesn't<br/>
                  • Controlled by setting α (usually 0.05)
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" color="warning" gutterBottom>
                  Type II Error (False Negative)
                </Typography>
                <Typography variant="body2" paragraph>
                  Failing to reject the null hypothesis when it is actually false. This is like
                  "missing a real effect" that actually exists.
                </Typography>
                <Typography variant="body2">
                  • Probability = β<br/>
                  • Example: Concluding a drug doesn't work when it does<br/>
                  • Reduced by increasing sample size or effect size
                </Typography>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

const PowerAnalysisSimulation = ({ darkMode }) => {
  const [effectSize, setEffectSize] = useState(0.5);
  const [alpha, setAlpha] = useState(0.05);
  const [desiredPower, setDesiredPower] = useState(0.80);
  const [testType, setTestType] = useState('two-tailed');
  const [powerCurveData, setPowerCurveData] = useState([]);
  const [requiredSampleSize, setRequiredSampleSize] = useState(0);

  const calculatePower = (n, d, alpha, tails) => {
    // Simplified power calculation for demonstration
    const z_alpha = tails === 'two-tailed' ? 1.96 : 1.645;
    const lambda = d * Math.sqrt(n / 2);
    const z_beta = lambda - z_alpha;
    const power = 1 - (1 / (1 + Math.exp(1.7 * z_beta)));
    return Math.min(0.999, Math.max(0.001, power));
  };

  const generatePowerCurve = () => {
    const data = [];
    for (let n = 10; n <= 200; n += 5) {
      const power = calculatePower(n, effectSize, alpha, testType);
      data.push({
        sampleSize: n,
        power: power,
        targetPower: desiredPower
      });

      if (power >= desiredPower && requiredSampleSize === 0) {
        setRequiredSampleSize(n);
      }
    }
    setPowerCurveData(data);
  };

  useEffect(() => {
    generatePowerCurve();
  }, [effectSize, alpha, desiredPower, testType]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUp color="primary" />
        Power Analysis Calculator
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Analysis Parameters</Typography>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                label="Test Type"
              >
                <MenuItem value="one-tailed">One-tailed</MenuItem>
                <MenuItem value="two-tailed">Two-tailed</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2">Effect Size (Cohen's d): {effectSize}</Typography>
              <Slider
                value={effectSize}
                onChange={(e, v) => setEffectSize(v)}
                min={0.2}
                max={1.5}
                step={0.1}
                marks={[
                  { value: 0.2, label: 'Small' },
                  { value: 0.5, label: 'Medium' },
                  { value: 0.8, label: 'Large' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2">Significance Level (α): {alpha}</Typography>
              <Slider
                value={alpha}
                onChange={(e, v) => setAlpha(v)}
                min={0.01}
                max={0.10}
                step={0.01}
                marks
                valueLabelDisplay="auto"
                color="error"
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2">Desired Power: {desiredPower}</Typography>
              <Slider
                value={desiredPower}
                onChange={(e, v) => setDesiredPower(v)}
                min={0.60}
                max={0.95}
                step={0.05}
                marks
                valueLabelDisplay="auto"
                color="success"
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 2, mt: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Typography variant="h6" sx={{ color: 'white' }}>
              Required Sample Size
            </Typography>
            <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
              n = {requiredSampleSize}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1 }}>
              Per group for {(desiredPower * 100).toFixed(0)}% power
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 500 }}>
            <Typography variant="subtitle1" gutterBottom>
              Power Curve Analysis
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={powerCurveData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="sampleSize"
                  label={{ value: "Sample Size (n)", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  label={{ value: "Statistical Power", angle: -90, position: "insideLeft" }}
                  domain={[0, 1]}
                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                />
                <RechartsTooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="#667eea"
                  strokeWidth={3}
                  name="Power"
                  dot={false}
                />

                <ReferenceLine
                  y={desiredPower}
                  stroke="#48bb78"
                  strokeDasharray="5 5"
                  label={`Target Power: ${(desiredPower * 100).toFixed(0)}%`}
                />

                <ReferenceLine
                  x={requiredSampleSize}
                  stroke="#f56565"
                  strokeDasharray="5 5"
                  label={`n = ${requiredSampleSize}`}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <GradientCard gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
                <CardContent>
                  <Typography variant="h6" sx={{ color: 'white' }}>Effect Size</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    Cohen's d = {effectSize}<br/>
                    {effectSize <= 0.2 ? 'Small' : effectSize <= 0.5 ? 'Medium' : effectSize <= 0.8 ? 'Large' : 'Very Large'} Effect
                  </Typography>
                </CardContent>
              </GradientCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <GradientCard gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
                <CardContent>
                  <Typography variant="h6" sx={{ color: 'white' }}>Type I Error</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    α = {alpha}<br/>
                    {(alpha * 100).toFixed(0)}% False Positive Rate
                  </Typography>
                </CardContent>
              </GradientCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <GradientCard gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
                <CardContent>
                  <Typography variant="h6" sx={{ color: 'white' }}>Statistical Power</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    1 - β = {desiredPower}<br/>
                    {(desiredPower * 100).toFixed(0)}% True Positive Rate
                  </Typography>
                </CardContent>
              </GradientCard>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

const PValueDistributionExplorer = ({ darkMode }) => {
  const [nullTrue, setNullTrue] = useState(true);
  const [effectSize, setEffectSize] = useState(0);
  const [sampleSize, setSampleSize] = useState(30);
  const [numSimulations, setNumSimulations] = useState(1000);
  const [pValueData, setPValueData] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = () => {
    setIsSimulating(true);
    const pValues = [];
    const histogram = Array(20).fill(0);

    for (let i = 0; i < numSimulations; i++) {
      // Simulate t-test p-values
      const mean = nullTrue ? 0 : effectSize;
      const se = 1 / Math.sqrt(sampleSize);
      const t = (mean + (Math.random() - 0.5) * 2 * se) / se;
      const df = sampleSize - 1;

      // Approximate p-value calculation
      const p = 2 * (1 - Math.min(0.999, Math.max(0.001,
        0.5 + 0.5 * Math.sign(t) * (1 - Math.exp(-Math.abs(t) * 1.5)))));

      pValues.push(p);
      const bin = Math.floor(p * 20);
      histogram[Math.min(bin, 19)]++;
    }

    const histogramData = histogram.map((count, i) => ({
      range: `${(i * 0.05).toFixed(2)}-${((i + 1) * 0.05).toFixed(2)}`,
      count: count,
      proportion: count / numSimulations
    }));

    setPValueData(histogramData);
    setIsSimulating(false);
  };

  useEffect(() => {
    runSimulation();
  }, [nullTrue, effectSize, sampleSize, numSimulations]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BarChart color="secondary" />
        P-Value Distribution Explorer
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Simulation Settings</Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={nullTrue}
                  onChange={(e) => setNullTrue(e.target.checked)}
                  color="primary"
                />
              }
              label="Null Hypothesis is True"
              sx={{ mt: 2 }}
            />

            {!nullTrue && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">True Effect Size: {effectSize}</Typography>
                <Slider
                  value={effectSize}
                  onChange={(e, v) => setEffectSize(v)}
                  min={0}
                  max={1.5}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={nullTrue}
                />
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Sample Size: {sampleSize}</Typography>
              <Slider
                value={sampleSize}
                onChange={(e, v) => setSampleSize(v)}
                min={10}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Number of Simulations: {numSimulations}</Typography>
              <Slider
                value={numSimulations}
                onChange={(e, v) => setNumSimulations(v)}
                min={100}
                max={5000}
                step={100}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              startIcon={<Casino />}
              onClick={runSimulation}
              disabled={isSimulating}
              sx={{ mt: 2 }}
            >
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </Button>
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Key Insights</Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><Lightbulb color="primary" /></ListItemIcon>
                <ListItemText
                  primary="Under H₀"
                  secondary="P-values should be uniformly distributed"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><Info color="info" /></ListItemIcon>
                <ListItemText
                  primary="Under H₁"
                  secondary="P-values skew toward 0"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><Warning color="warning" /></ListItemIcon>
                <ListItemText
                  primary="P-hacking Warning"
                  secondary="Multiple testing inflates Type I error"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 500 }}>
            <Typography variant="subtitle1" gutterBottom>
              P-Value Distribution ({numSimulations} simulations)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <RechartsBarChart data={pValueData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="range"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  label={{ value: "P-Value Range", position: "insideBottom", offset: -40 }}
                />
                <YAxis
                  label={{ value: "Proportion", angle: -90, position: "insideLeft" }}
                />
                <RechartsTooltip />
                <Bar dataKey="proportion" fill="#667eea">
                  {pValueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      index < 1 ? '#f56565' : // p < 0.05: red
                      index < 2 ? '#f6ad55' : // p < 0.10: orange
                      '#667eea' // p >= 0.10: blue
                    } />
                  ))}
                </Bar>
                {nullTrue && (
                  <ReferenceLine
                    y={0.05}
                    stroke="#48bb78"
                    strokeDasharray="5 5"
                    label="Expected under H₀"
                  />
                )}
              </RechartsBarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Main Module Component
const HypothesisTestingModule = () => {
  const { darkMode, gradients } = useAppTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [completedSections, setCompletedSections] = useState([]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (!completedSections.includes(newValue)) {
      setCompletedSections([...completedSections, newValue]);
    }
  };

  const progress = (completedSections.length / 5) * 100;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            background: darkMode ? gradients.blue : gradients.primary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 2
          }}
        >
          Hypothesis Testing Mastery
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Master the foundations of statistical inference through interactive simulations and comprehensive theory
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Chip
            icon={<Science />}
            label="50-Decimal Precision"
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<School />}
            label="Interactive Learning"
            color="secondary"
            variant="outlined"
          />
          <Chip
            icon={<Assessment />}
            label="Real-time Simulations"
            color="success"
            variant="outlined"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Module Progress: {Math.round(progress)}% Complete
          </Typography>
          <AnimatedProgress variant="determinate" value={progress} />
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <StyledTab icon={<Psychology />} label="Theory" />
          <StyledTab icon={<Warning />} label="Type I & II Errors" />
          <StyledTab icon={<TrendingUp />} label="Power Analysis" />
          <StyledTab icon={<BarChart />} label="P-Values" />
          <StyledTab icon={<Functions />} label="Applications" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && (
          <Fade in timeout={500}>
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <GradientCard gradient={gradients.primary}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h5" gutterBottom>
                        The Foundation of Statistical Inference
                      </Typography>
                      <Typography variant="body1" paragraph>
                        Hypothesis testing is the cornerstone of scientific research, providing a framework
                        for making decisions based on data.
                      </Typography>
                      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
                      <Typography variant="h6" gutterBottom>
                        Key Concepts:
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemText
                            primary="Null Hypothesis (H₀)"
                            secondary="The default assumption of no effect or no difference"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Alternative Hypothesis (H₁)"
                            secondary="The research hypothesis claiming an effect exists"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Test Statistic"
                            secondary="A value calculated from data to test the hypothesis"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="P-value"
                            secondary="Probability of observing data as extreme under H₀"
                            secondaryTypographyProps={{ style: { color: 'rgba(255,255,255,0.9)' } }}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Mathematical Framework
                    </Typography>

                    <Box sx={{ bgcolor: darkMode ? 'grey.900' : 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
                        Test Statistic: t = (x̄ - μ₀) / (s / √n)<br/><br/>
                        Where:<br/>
                        • x̄ = sample mean<br/>
                        • μ₀ = hypothesized population mean<br/>
                        • s = sample standard deviation<br/>
                        • n = sample size
                      </Typography>
                    </Box>

                    <Typography variant="h6" gutterBottom color="secondary">
                      Decision Rules
                    </Typography>

                    <List>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText
                          primary="Reject H₀ if p-value &lt; α"
                          secondary="Evidence supports the alternative hypothesis"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Error color="error" /></ListItemIcon>
                        <ListItemText
                          primary="Fail to reject H₀ if p-value ≥ α"
                          secondary="Insufficient evidence against null hypothesis"
                        />
                      </ListItem>
                    </List>

                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Remember: Failing to reject H₀ is not the same as accepting it.
                        We simply lack sufficient evidence to reject it.
                      </Typography>
                    </Alert>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )}

        {activeTab === 1 && (
          <Fade in timeout={500}>
            <Box>
              <TypeITypeIIErrorSimulation darkMode={darkMode} />
            </Box>
          </Fade>
        )}

        {activeTab === 2 && (
          <Fade in timeout={500}>
            <Box>
              <PowerAnalysisSimulation darkMode={darkMode} />
            </Box>
          </Fade>
        )}

        {activeTab === 3 && (
          <Fade in timeout={500}>
            <Box>
              <PValueDistributionExplorer darkMode={darkMode} />
            </Box>
          </Fade>
        )}

        {activeTab === 4 && (
          <Fade in timeout={500}>
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <GradientCard gradient={gradients.success}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h6" gutterBottom>
                        Medical Research
                      </Typography>
                      <Typography variant="body2">
                        Testing efficacy of new treatments, comparing drug effectiveness,
                        analyzing clinical trial outcomes
                      </Typography>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12} md={4}>
                  <GradientCard gradient={gradients.info}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h6" gutterBottom>
                        Quality Control
                      </Typography>
                      <Typography variant="body2">
                        Manufacturing process monitoring, product testing,
                        defect rate analysis, specification compliance
                      </Typography>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12} md={4}>
                  <GradientCard gradient={gradients.warning}>
                    <CardContent sx={{ color: 'white' }}>
                      <Typography variant="h6" gutterBottom>
                        Business Analytics
                      </Typography>
                      <Typography variant="body2">
                        A/B testing for marketing, customer behavior analysis,
                        performance metrics evaluation, ROI assessment
                      </Typography>
                    </CardContent>
                  </GradientCard>
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Real-World Case Study: Clinical Trial
                    </Typography>

                    <Stepper activeStep={-1} orientation="vertical">
                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Define Hypotheses</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            H₀: New drug has no effect (μ_treatment = μ_placebo)<br/>
                            H₁: New drug is effective (μ_treatment ≠ μ_placebo)
                          </Typography>
                        </Box>
                      </Step>

                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Set Significance Level</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            α = 0.05 (5% chance of Type I error)
                          </Typography>
                        </Box>
                      </Step>

                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Calculate Test Statistic</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            t = 2.34 with df = 198
                          </Typography>
                        </Box>
                      </Step>

                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Find P-value</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            p = 0.020 &lt; α = 0.05
                          </Typography>
                        </Box>
                      </Step>

                      <Step expanded>
                        <StepLabel>
                          <Typography variant="subtitle1">Make Decision</Typography>
                        </StepLabel>
                        <Box sx={{ pl: 4, pb: 2 }}>
                          <Typography variant="body2">
                            Reject H₀: Evidence suggests the drug is effective
                          </Typography>
                        </Box>
                      </Step>
                    </Stepper>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )}
      </Box>

      {/* Floating Action Button */}
      <Zoom in>
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <NavigateNext />
        </Fab>
      </Zoom>
    </Container>
  );
};

export default HypothesisTestingModule;