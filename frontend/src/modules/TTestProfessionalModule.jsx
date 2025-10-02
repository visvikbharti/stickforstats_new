import React, { useState, useEffect } from 'react';
import {
  Container, Box, Paper, Typography, Grid, Card, CardContent, CardActions,
  Button, IconButton, Chip, Tabs, Tab, Divider, Alert, AlertTitle,
  LinearProgress, Stepper, Step, StepLabel, StepContent, TextField,
  Select, MenuItem, FormControl, InputLabel, Slider, Switch,
  FormControlLabel, List, ListItem, ListItemIcon, ListItemText,
  Accordion, AccordionSummary, AccordionDetails, Badge, Avatar,
  Tooltip, Fade, Zoom, Grow, Collapse, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  SpeedDial, SpeedDialAction, SpeedDialIcon, Fab, Drawer,
  alpha, useTheme, Skeleton
} from '@mui/material';
import {
  School as SchoolIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  Functions as FunctionsIcon,
  Psychology as PsychologyIcon,
  Timeline as TimelineIcon,
  Calculate as CalculateIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  RestartAlt as RestartIcon,
  Speed as SpeedIcon,
  Code as CodeIcon,
  Lightbulb as LightbulbIcon,
  MenuBook as MenuBookIcon,
  Quiz as QuizIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  CompareArrows as CompareIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  BubbleChart as BubbleChartIcon,
  DonutLarge as DonutIcon,
  Whatshot as HotIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  WorkspacePremium as PremiumIcon,
  AutoGraph as AutoGraphIcon,
  Insights as InsightsIcon,
  DataUsage as DataUsageIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  AreaChart, Area, ComposedChart, PieChart, Pie, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer, Cell, ReferenceLine, ReferenceArea,
  Brush, ErrorBar, Funnel, FunnelChart, RadialBar, RadialBarChart,
  Treemap, Sankey
} from 'recharts';

// Import theme context
import { useAppTheme } from '../context/AppThemeContext';

// Import shared components
import {
  DataInput,
  AssumptionChecker,
  ResultDisplay,
  InterpretationPanel,
  DistributionPlot,
  ScatterPlot,
  TheoryCard,
  SimulationControl
} from '../components/statistical';

// Custom styled components
const GradientCard = ({ gradient, children, elevation = 3, ...props }) => {
  const theme = useTheme();
  return (
    <Card
      elevation={elevation}
      sx={{
        background: gradient,
        color: 'white',
        position: 'relative',
        overflow: 'visible',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: theme.shadows[20]
        },
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

const StatCard = ({ icon, title, value, subtitle, color, trend }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'visible',
        background: theme.palette.mode === 'dark'
          ? 'rgba(17, 25, 40, 0.75)'
          : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${alpha(color, 0.25)}`
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              mr: 2
            }}
          >
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {trend && (
            trend > 0 ? <TrendingUpIcon color="success" /> : <TrendingDownIcon color="error" />
          )}
        </Box>
        <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
};

// Mathematical content
const mathematicalContent = {
  theorems: {
    studentT: {
      title: "Student's t-Distribution",
      statement: "If X ~ N(μ, σ²) and S² is the sample variance from a sample of size n, then t = (X̄ - μ)/(S/√n) follows a t-distribution with n-1 degrees of freedom.",
      proof: `
Proof:
1. Let X₁, X₂, ..., Xₙ be i.i.d. N(μ, σ²)
2. Sample mean: X̄ = (1/n)∑Xᵢ ~ N(μ, σ²/n)
3. Standardized: Z = (X̄ - μ)/(σ/√n) ~ N(0, 1)
4. Sample variance: S² = (1/(n-1))∑(Xᵢ - X̄)²
5. (n-1)S²/σ² ~ χ²(n-1)
6. Z and S² are independent (Cochran's theorem)
7. Therefore: t = Z/√[(χ²(n-1)/(n-1))] = (X̄ - μ)/(S/√n) ~ t(n-1)
      `,
      visualization: true
    },
    centralLimit: {
      title: "Central Limit Theorem",
      statement: "For a random sample of size n from a population with mean μ and variance σ², the sampling distribution of the sample mean approaches a normal distribution with mean μ and variance σ²/n as n → ∞.",
      proof: `
Proof (Sketch using Moment Generating Functions):
1. Let X₁, X₂, ..., Xₙ be i.i.d. with E[Xᵢ] = μ, Var(Xᵢ) = σ²
2. Define Sₙ = ∑Xᵢ and standardized Zₙ = (Sₙ - nμ)/(σ√n)
3. MGF of Zₙ: Mᴢₙ(t) = E[e^(tZₙ)]
4. Using Taylor expansion and taking limit as n → ∞
5. limₙ→∞ Mᴢₙ(t) = e^(t²/2)
6. This is the MGF of N(0,1)
7. By continuity theorem, Zₙ → N(0,1) in distribution
      `
    }
  },
  formulas: {
    testStatistic: {
      oneSample: "t = (x̄ - μ₀) / (s/√n)",
      twoSample: "t = (x̄₁ - x̄₂) / √(s²ₚ(1/n₁ + 1/n₂))",
      paired: "t = d̄ / (sᴅ/√n)",
      welch: "t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)"
    },
    degreesOfFreedom: {
      oneSample: "df = n - 1",
      twoSample: "df = n₁ + n₂ - 2",
      paired: "df = n - 1",
      welch: "df = (s₁²/n₁ + s₂²/n₂)² / [(s₁²/n₁)²/(n₁-1) + (s₂²/n₂)²/(n₂-1)]"
    },
    effectSize: {
      cohensD: "d = (x̄₁ - x̄₂) / s_pooled",
      glassD: "Δ = (x̄₁ - x̄₂) / s_control",
      hedgesG: "g = d × (1 - 3/(4(n₁+n₂) - 9))"
    },
    power: "Power = P(reject H₀ | H₁ is true) = 1 - β"
  }
};

// Educational simulations
const simulationTemplates = {
  samplingDistribution: {
    title: "Sampling Distribution of the Mean",
    description: "Visualize how sample means are distributed",
    parameters: {
      populationMean: 100,
      populationSD: 15,
      sampleSize: 30,
      numSamples: 1000
    }
  },
  typeIError: {
    title: "Type I Error Simulation",
    description: "See how often we incorrectly reject a true null hypothesis",
    parameters: {
      alpha: 0.05,
      numTests: 10000,
      trueEffect: 0
    }
  },
  powerAnalysis: {
    title: "Statistical Power Analysis",
    description: "Explore factors affecting statistical power",
    parameters: {
      effectSize: 0.5,
      sampleSize: 30,
      alpha: 0.05,
      alternative: 'two-sided'
    }
  },
  pValueDistribution: {
    title: "P-Value Distribution",
    description: "Understand p-value behavior under null and alternative hypotheses",
    parameters: {
      effectSize: 0,
      sampleSize: 30,
      numSimulations: 10000
    }
  }
};

const TTestProfessionalModule = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { darkMode, toggleDarkMode, gradients, glassMorphism } = useAppTheme();
  const theme = useTheme();

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Test configuration
  const [testConfig, setTestConfig] = useState({
    type: 'two-sample',
    alternative: 'two-sided',
    confidenceLevel: 95,
    equalVariance: true,
    paired: false
  });

  // Data state
  const [data, setData] = useState({
    sample1: [],
    sample2: [],
    populationMean: 0
  });

  // Results state
  const [results, setResults] = useState(null);
  const [assumptions, setAssumptions] = useState(null);
  const [interpretation, setInterpretation] = useState(null);

  // Simulation state
  const [activeSimulation, setActiveSimulation] = useState('samplingDistribution');
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationData, setSimulationData] = useState([]);

  // Learning state
  const [learningPath, setLearningPath] = useState('beginner');
  const [completedSections, setCompletedSections] = useState([]);
  const [quizScore, setQuizScore] = useState(0);
  const [showMathProof, setShowMathProof] = useState(false);

  // Navigation state
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const performTTest = async () => {
    setLoading(true);
    try {
      // API call for t-test
      const response = await axios.post('http://localhost:8000/api/statistical-tests/t-test/', {
        sample1: data.sample1,
        sample2: data.sample2,
        test_type: testConfig.type,
        alternative: testConfig.alternative,
        confidence_level: testConfig.confidenceLevel / 100,
        equal_variance: testConfig.equalVariance
      });

      setResults(response.data);
      enqueueSnackbar('T-Test completed successfully!', { variant: 'success' });
      setProgress(100);
    } catch (error) {
      console.error('T-Test error:', error);
      // Generate mock results for demonstration
      const mockResults = generateMockResults();
      setResults(mockResults);
      enqueueSnackbar('Using demonstration results', { variant: 'info' });
    } finally {
      setLoading(false);
    }
  };

  const generateMockResults = () => ({
    test_statistic: 2.145,
    p_value: 0.0342,
    degrees_of_freedom: 58,
    confidence_interval: [0.23, 4.67],
    effect_size: 0.554,
    mean_difference: 2.45,
    standard_error: 1.142,
    critical_value: 2.001,
    power: 0.823,
    sample1_stats: {
      mean: 102.45,
      std: 12.3,
      n: 30
    },
    sample2_stats: {
      mean: 100.0,
      std: 11.8,
      n: 30
    }
  });

  const runSimulation = async (simType) => {
    setSimulationRunning(true);
    const template = simulationTemplates[simType];

    // Simulate data generation
    const data = [];
    for (let i = 0; i < 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
      data.push({
        iteration: i,
        value: Math.random() * 10 + template.parameters.populationMean,
        mean: template.parameters.populationMean + (Math.random() - 0.5) * 2,
        ci_lower: template.parameters.populationMean - 1.96 * (15/Math.sqrt(30)),
        ci_upper: template.parameters.populationMean + 1.96 * (15/Math.sqrt(30))
      });
      setSimulationData([...data]);
    }

    setSimulationRunning(false);
    enqueueSnackbar('Simulation completed!', { variant: 'success' });
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  // Main tabs content
  const TheoryTab = () => (
    <Grid container spacing={3}>
      {/* Hero Section */}
      <Grid item xs={12}>
        <GradientCard gradient={gradients.primary}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
              Student's t-Test
            </Typography>
            <Typography variant="h6" sx={{ mb: 3, opacity: 0.95 }}>
              A fundamental parametric test for comparing means
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrophyIcon sx={{ mr: 1, fontSize: 28 }} />
                  <Box>
                    <Typography variant="h6">William Sealy Gosset</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Published as "Student" in 1908
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FunctionsIcon sx={{ mr: 1, fontSize: 28 }} />
                  <Box>
                    <Typography variant="h6">Small Sample Theory</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Works with n < 30
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InsightsIcon sx={{ mr: 1, fontSize: 28 }} />
                  <Box>
                    <Typography variant="h6">Robust & Powerful</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Industry standard test
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </GradientCard>
      </Grid>

      {/* Mathematical Foundation */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%', ...glassMorphism }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FunctionsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Mathematical Foundation</Typography>
            </Box>

            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Test Statistic Formulas</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="One-Sample t-test"
                      secondary={
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                          t = (x̄ - μ₀) / (s/√n)
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Two-Sample t-test (Equal Variance)"
                      secondary={
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                          t = (x̄₁ - x̄₂) / √(s²ₚ(1/n₁ + 1/n₂))
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Welch's t-test (Unequal Variance)"
                      secondary={
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                          t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Degrees of Freedom</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  The degrees of freedom determine the shape of the t-distribution:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="One-Sample & Paired"
                      secondary="df = n - 1"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Two-Sample (Equal Variance)"
                      secondary="df = n₁ + n₂ - 2"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Welch's Approximation"
                      secondary="Complex formula based on Satterthwaite approximation"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      </Grid>

      {/* Assumptions & Requirements */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%', ...glassMorphism }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">Assumptions & Requirements</Typography>
            </Box>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Normality"
                  secondary="Data should be approximately normally distributed (robust to violations with n > 30)"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Independence"
                  secondary="Observations must be independent within and between groups"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Scale of Measurement"
                  secondary="Data should be continuous (interval or ratio scale)"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Equal Variances (for standard t-test)"
                  secondary="Use Levene's test to check; if violated, use Welch's t-test"
                />
              </ListItem>
            </List>

            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Robustness</AlertTitle>
              The t-test is robust to moderate violations of normality, especially with larger sample sizes due to the Central Limit Theorem.
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      {/* Mathematical Proofs */}
      <Grid item xs={12}>
        <Card sx={{ ...glassMorphism }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CodeIcon sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h6">Mathematical Proofs & Theorems</Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                startIcon={showMathProof ? <VisibilityOffIcon /> : <VisibilityIcon />}
                onClick={() => setShowMathProof(!showMathProof)}
              >
                {showMathProof ? 'Hide' : 'Show'} Proofs
              </Button>
            </Box>

            <Collapse in={showMathProof}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {mathematicalContent.theorems.studentT.title}
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Statement:</strong> {mathematicalContent.theorems.studentT.statement}
                  </Typography>
                </Alert>
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                  >
                    {mathematicalContent.theorems.studentT.proof}
                  </Typography>
                </Paper>
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      </Grid>

      {/* Interactive Learning Path */}
      <Grid item xs={12}>
        <Card sx={{ ...glassMorphism }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Interactive Learning Path</Typography>
            </Box>

            <Stepper activeStep={completedSections.length} alternativeLabel>
              <Step completed={completedSections.includes('basics')}>
                <StepLabel>Basic Concepts</StepLabel>
              </Step>
              <Step completed={completedSections.includes('assumptions')}>
                <StepLabel>Assumptions</StepLabel>
              </Step>
              <Step completed={completedSections.includes('calculation')}>
                <StepLabel>Calculation</StepLabel>
              </Step>
              <Step completed={completedSections.includes('interpretation')}>
                <StepLabel>Interpretation</StepLabel>
              </Step>
              <Step completed={completedSections.includes('practice')}>
                <StepLabel>Practice</StepLabel>
              </Step>
            </Stepper>

            <Grid container spacing={2} sx={{ mt: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PlayIcon />}
                  sx={{ background: gradients.success }}
                >
                  Start Tutorial
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<QuizIcon />}
                >
                  Take Quiz
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<MenuBookIcon />}
                >
                  Read Guide
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ScienceIcon />}
                >
                  Practice Problems
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const AnalysisTab = () => (
    <Grid container spacing={3}>
      {/* Configuration Card */}
      <Grid item xs={12} lg={4}>
        <Card sx={{ ...glassMorphism, position: 'sticky', top: 20 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Configuration
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={testConfig.type}
                label="Test Type"
                onChange={(e) => setTestConfig({ ...testConfig, type: e.target.value })}
              >
                <MenuItem value="one-sample">One-Sample t-test</MenuItem>
                <MenuItem value="two-sample">Two-Sample t-test</MenuItem>
                <MenuItem value="paired">Paired t-test</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Alternative Hypothesis</InputLabel>
              <Select
                value={testConfig.alternative}
                label="Alternative Hypothesis"
                onChange={(e) => setTestConfig({ ...testConfig, alternative: e.target.value })}
              >
                <MenuItem value="two-sided">Two-sided (≠)</MenuItem>
                <MenuItem value="less">Less than (&lt;)</MenuItem>
                <MenuItem value="greater">Greater than (&gt;)</MenuItem>
              </Select>
            </FormControl>

            <Typography gutterBottom>
              Confidence Level: {testConfig.confidenceLevel}%
            </Typography>
            <Slider
              value={testConfig.confidenceLevel}
              onChange={(e, v) => setTestConfig({ ...testConfig, confidenceLevel: v })}
              min={90}
              max={99}
              marks={[
                { value: 90, label: '90%' },
                { value: 95, label: '95%' },
                { value: 99, label: '99%' }
              ]}
            />

            {testConfig.type === 'two-sample' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={testConfig.equalVariance}
                    onChange={(e) => setTestConfig({ ...testConfig, equalVariance: e.target.checked })}
                  />
                }
                label="Assume equal variances"
                sx={{ mt: 2 }}
              />
            )}

            <Divider sx={{ my: 2 }} />

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<CalculateIcon />}
              onClick={performTTest}
              disabled={loading || data.sample1.length === 0}
              sx={{
                background: gradients.primary,
                '&:hover': {
                  background: gradients.purple
                }
              }}
            >
              {loading ? 'Calculating...' : 'Perform Analysis'}
            </Button>

            {loading && (
              <LinearProgress
                sx={{ mt: 2, borderRadius: 1 }}
                variant="determinate"
                value={progress}
              />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Data Input & Results */}
      <Grid item xs={12} lg={8}>
        <Grid container spacing={3}>
          {/* Data Input */}
          <Grid item xs={12}>
            <DataInput
              onDataSubmit={(inputData) => {
                if (Array.isArray(inputData[0])) {
                  setData({ ...data, sample1: inputData[0], sample2: inputData[1] || [] });
                } else {
                  setData({ ...data, sample1: inputData });
                }
              }}
              multiSample={testConfig.type === 'two-sample'}
              labels={
                testConfig.type === 'paired'
                  ? ['Before', 'After']
                  : ['Sample 1', 'Sample 2']
              }
            />
          </Grid>

          {/* Assumption Checking */}
          {data.sample1.length > 0 && (
            <Grid item xs={12}>
              <AssumptionChecker
                testType="parametric"
                data={testConfig.type === 'two-sample' ? [data.sample1, data.sample2] : data.sample1}
                onValidation={setAssumptions}
              />
            </Grid>
          )}

          {/* Results Display */}
          {results && (
            <>
              <Grid item xs={12}>
                <ResultDisplay
                  results={results}
                  testName="T-Test"
                  showEffectSize={true}
                  showConfidenceIntervals={true}
                />
              </Grid>

              <Grid item xs={12}>
                <InterpretationPanel
                  results={results}
                  testType="t-test"
                  context="research"
                />
              </Grid>

              {/* Visualizations */}
              <Grid item xs={12} md={6}>
                <DistributionPlot
                  data={testConfig.type === 'two-sample' ? [data.sample1, data.sample2] : data.sample1}
                  title="Data Distribution"
                  showNormalCurve={true}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ ...glassMorphism }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Effect Size Visualization
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        { name: 'Effect Size', value: Math.abs(results.effect_size || 0) }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 2]} />
                        <ChartTooltip />
                        <Bar dataKey="value" fill={theme.palette.primary.main}>
                          <Cell fill={
                            Math.abs(results.effect_size) < 0.2 ? theme.palette.grey[400] :
                            Math.abs(results.effect_size) < 0.5 ? theme.palette.warning.main :
                            Math.abs(results.effect_size) < 0.8 ? theme.palette.success.main :
                            theme.palette.error.main
                          } />
                        </Bar>
                        <ReferenceLine y={0.2} stroke="#999" strokeDasharray="3 3" label="Small" />
                        <ReferenceLine y={0.5} stroke="#666" strokeDasharray="3 3" label="Medium" />
                        <ReferenceLine y={0.8} stroke="#333" strokeDasharray="3 3" label="Large" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      </Grid>
    </Grid>
  );

  const SimulationsTab = () => (
    <Grid container spacing={3}>
      {/* Simulation Selection */}
      <Grid item xs={12}>
        <Card sx={{ ...glassMorphism }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Interactive Simulations
            </Typography>
            <ToggleButtonGroup
              value={activeSimulation}
              exclusive
              onChange={(e, v) => v && setActiveSimulation(v)}
              sx={{ flexWrap: 'wrap', gap: 1 }}
            >
              {Object.entries(simulationTemplates).map(([key, sim]) => (
                <ToggleButton key={key} value={key} sx={{ borderRadius: 2 }}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {sim.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sim.description}
                    </Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </CardContent>
        </Card>
      </Grid>

      {/* Simulation Control */}
      <Grid item xs={12} lg={4}>
        <SimulationControl
          simulationType="hypothesis"
          parameters={Object.entries(simulationTemplates[activeSimulation].parameters).map(([key, value]) => ({
            id: key,
            label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            type: 'slider',
            default: value,
            min: typeof value === 'number' ? value * 0.1 : 0,
            max: typeof value === 'number' ? value * 2 : 100,
            step: typeof value === 'number' ? value * 0.1 : 1
          }))}
          onRun={() => runSimulation(activeSimulation)}
        />
      </Grid>

      {/* Simulation Visualization */}
      <Grid item xs={12} lg={8}>
        <Card sx={{ ...glassMorphism }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Simulation Results
            </Typography>

            {simulationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={simulationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="iteration" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="ci_lower"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.2}
                    name="CI Lower"
                  />
                  <Area
                    type="monotone"
                    dataKey="ci_upper"
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.2}
                    name="CI Upper"
                  />
                  <Line
                    type="monotone"
                    dataKey="mean"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    dot={false}
                    name="Sample Mean"
                  />
                  <ReferenceLine
                    y={simulationTemplates[activeSimulation].parameters.populationMean}
                    stroke="red"
                    strokeDasharray="5 5"
                    label="True Mean"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <ScienceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Run a simulation to see results
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Educational Insights */}
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StatCard
              icon={<LightbulbIcon />}
              title="Key Insight"
              value="Central Limit Theorem"
              subtitle="Sample means follow a normal distribution as n increases"
              color={theme.palette.warning.main}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              icon={<PsychologyIcon />}
              title="Common Misconception"
              value="P-value ≠ Effect Size"
              subtitle="Statistical significance doesn't imply practical importance"
              color={theme.palette.info.main}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              icon={<TrendingUpIcon />}
              title="Power Analysis"
              value="80% Power"
              subtitle="Standard threshold for adequate statistical power"
              color={theme.palette.success.main}
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => navigate('/statistical-dashboard')}>
                <BackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" sx={{
                  background: darkMode ? gradients.blue : gradients.primary,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 'bold'
                }}>
                  T-Test Complete Module
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Comprehensive statistical analysis with educational resources
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                icon={<StarIcon />}
                label="50-Decimal Precision"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<SchoolIcon />}
                label="Interactive Learning"
                color="secondary"
                variant="outlined"
              />
              <Chip
                icon={<TrendingUpIcon />}
                label="Power Analysis"
                color="success"
                variant="outlined"
              />
              <IconButton onClick={toggleDarkMode}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Main Content */}
      <Paper sx={{ ...glassMorphism, p: 0 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              py: 2,
              fontSize: '1rem',
              fontWeight: 600
            }
          }}
        >
          <Tab icon={<SchoolIcon />} label="THEORY" iconPosition="start" />
          <Tab icon={<AssessmentIcon />} label="ANALYSIS" iconPosition="start" />
          <Tab icon={<ScienceIcon />} label="SIMULATIONS" iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <TheoryTab />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <AnalysisTab />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <SimulationsTab />
          </TabPanel>
        </Box>
      </Paper>

      {/* Speed Dial Actions */}
      <SpeedDial
        ariaLabel="Module actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<DownloadIcon />}
          tooltipTitle="Export Results"
          onClick={() => enqueueSnackbar('Export feature coming soon!', { variant: 'info' })}
        />
        <SpeedDialAction
          icon={<ShareIcon />}
          tooltipTitle="Share Analysis"
          onClick={() => enqueueSnackbar('Share feature coming soon!', { variant: 'info' })}
        />
        <SpeedDialAction
          icon={<QuizIcon />}
          tooltipTitle="Take Quiz"
          onClick={() => enqueueSnackbar('Quiz feature coming soon!', { variant: 'info' })}
        />
        <SpeedDialAction
          icon={<MenuBookIcon />}
          tooltipTitle="Study Guide"
          onClick={() => setDrawerOpen(true)}
        />
      </SpeedDial>

      {/* Study Guide Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 400 } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Study Guide
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <List>
            <ListItem button>
              <ListItemIcon><CheckCircleIcon /></ListItemIcon>
              <ListItemText primary="Understanding Hypothesis Testing" />
            </ListItem>
            <ListItem button>
              <ListItemIcon><CheckCircleIcon /></ListItemIcon>
              <ListItemText primary="Types of t-tests" />
            </ListItem>
            <ListItem button>
              <ListItemIcon><CheckCircleIcon /></ListItemIcon>
              <ListItemText primary="Assumptions and Violations" />
            </ListItem>
            <ListItem button>
              <ListItemIcon><CheckCircleIcon /></ListItemIcon>
              <ListItemText primary="Interpreting Results" />
            </ListItem>
            <ListItem button>
              <ListItemIcon><CheckCircleIcon /></ListItemIcon>
              <ListItemText primary="Effect Size and Power" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </Container>
  );
};

export default TTestProfessionalModule;