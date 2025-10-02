import React, { useState, useEffect, useRef } from 'react';
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
  Dialog, DialogTitle, DialogContent, DialogActions,
  Breadcrumbs, Link, Rating, Skeleton, Backdrop,
  alpha, useTheme, useMediaQuery
} from '@mui/material';

// Icons
import {
  School as SchoolIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  Functions as FunctionsIcon,
  Psychology as PsychologyIcon,
  Timeline as TimelineIcon,
  MenuBook as MenuBookIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  RestartAlt as RestartIcon,
  Speed as SpeedIcon,
  Code as CodeIcon,
  Lightbulb as LightbulbIcon,
  Quiz as QuizIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  WorkspacePremium as PremiumIcon,
  AutoGraph as AutoGraphIcon,
  Insights as InsightsIcon,
  DataUsage as DataUsageIcon,
  Analytics as AnalyticsIcon,
  Calculate as CalculateIcon,
  BookmarkBorder as BookmarkIcon,
  BookmarkAdded as BookmarkAddedIcon,
  Help as HelpIcon,
  VideoLibrary as VideoIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Public as PublicIcon
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAppTheme } from '../context/AppThemeContext';

// Reusable styled components
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

const GlassCard = ({ children, ...props }) => {
  const { glassMorphism } = useAppTheme();
  return (
    <Card sx={{ ...glassMorphism, ...props.sx }} {...props}>
      {children}
    </Card>
  );
};

const StatCard = ({ icon, title, value, subtitle, color, trend }) => {
  const theme = useTheme();
  const { glassMorphism } = useAppTheme();

  return (
    <Card sx={{
      ...glassMorphism,
      border: `1px solid ${alpha(color, 0.2)}`,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 24px ${alpha(color, 0.25)}`
      }
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, mr: 2 }}>
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {trend && (
            trend > 0 ? <TrendingUpIcon color="success" /> : <TrendingUpIcon color="error" sx={{ transform: 'rotate(180deg)' }} />
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

const TabPanel = ({ children, value, index, ...props }) => (
  <div hidden={value !== index} {...props}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

/**
 * MASTER STATISTICAL MODULE TEMPLATE
 *
 * This template provides the foundation for all statistical modules in StickForStats.
 * It ensures consistency, professional quality, and comprehensive educational value.
 *
 * @param {Object} props - Module configuration
 * @param {string} props.moduleName - Name of the statistical test/method
 * @param {Object} props.moduleConfig - Configuration for the specific module
 * @param {Object} props.mathematicalContent - Mathematical formulas, proofs, theorems
 * @param {Object} props.simulationTemplates - Simulation configurations
 * @param {Object} props.educationalContent - Theory, examples, applications
 * @param {Function} props.performAnalysis - Main analysis function
 * @param {Object} props.validationRules - Input validation rules
 */
const StatisticalModuleTemplate = ({
  // Module Identity
  moduleName = "Statistical Module",
  moduleDescription = "Comprehensive statistical analysis with educational resources",
  moduleIcon = <FunctionsIcon />,
  moduleCategory = "general",

  // Module Configuration
  moduleConfig = {},

  // Educational Content
  mathematicalContent = {},
  simulationTemplates = {},
  educationalContent = {},

  // Analysis Functions
  performAnalysis = null,
  validationRules = {},

  // Module Features
  features = {
    hasTheory: true,
    hasAnalysis: true,
    hasSimulations: true,
    hasLearning: true,
    hasApplications: true
  },

  // Customization
  customTabs = [],
  customComponents = {}
}) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { darkMode, toggleDarkMode, gradients, glassMorphism } = useAppTheme();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Core State Management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Data & Results State
  const [inputData, setInputData] = useState(null);
  const [results, setResults] = useState(null);
  const [assumptions, setAssumptions] = useState(null);
  const [interpretation, setInterpretation] = useState(null);

  // Simulation State
  const [activeSimulation, setActiveSimulation] = useState(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationData, setSimulationData] = useState([]);

  // Learning State
  const [learningPath, setLearningPath] = useState('beginner');
  const [completedSections, setCompletedSections] = useState([]);
  const [quizActive, setQuizActive] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [bookmarkedSections, setBookmarkedSections] = useState([]);

  // UI State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [showMathProofs, setShowMathProofs] = useState(false);
  const [showStepByStep, setShowStepByStep] = useState(false);

  // User Progress Tracking
  const [userProgress, setUserProgress] = useState({
    modulesCompleted: [],
    totalTime: 0,
    lastAccessed: new Date(),
    achievements: [],
    certificationsEarned: []
  });

  // Tab Configuration
  const tabs = [
    features.hasTheory && { icon: <SchoolIcon />, label: 'THEORY' },
    features.hasAnalysis && { icon: <AssessmentIcon />, label: 'ANALYSIS' },
    features.hasSimulations && { icon: <ScienceIcon />, label: 'SIMULATIONS' },
    features.hasLearning && { icon: <MenuBookIcon />, label: 'LEARNING' },
    features.hasApplications && { icon: <PublicIcon />, label: 'APPLICATIONS' },
    ...customTabs
  ].filter(Boolean);

  // Effects
  useEffect(() => {
    // Track module access
    trackModuleAccess();

    // Load user progress
    loadUserProgress();

    // Initialize module-specific settings
    initializeModule();
  }, []);

  useEffect(() => {
    // Auto-save progress
    if (results || completedSections.length > 0) {
      saveProgress();
    }
  }, [results, completedSections]);

  // Core Functions
  const trackModuleAccess = () => {
    // Analytics tracking
    console.log(`Module accessed: ${moduleName}`);
    // Would integrate with analytics service
  };

  const loadUserProgress = () => {
    const savedProgress = localStorage.getItem(`${moduleName}_progress`);
    if (savedProgress) {
      setUserProgress(JSON.parse(savedProgress));
    }
  };

  const saveProgress = () => {
    const progressData = {
      ...userProgress,
      lastAccessed: new Date(),
      completedSections,
      bookmarkedSections,
      quizScore
    };
    localStorage.setItem(`${moduleName}_progress`, JSON.stringify(progressData));
  };

  const initializeModule = () => {
    // Module-specific initialization
    if (moduleConfig.defaultSettings) {
      // Apply default settings
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Track tab navigation
    trackEvent('tab_change', { module: moduleName, tab: tabs[newValue].label });
  };

  const trackEvent = (eventName, eventData) => {
    // Analytics event tracking
    console.log('Event:', eventName, eventData);
  };

  const handleAnalysis = async () => {
    if (!performAnalysis) {
      enqueueSnackbar('Analysis function not implemented', { variant: 'error' });
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      // Validate input
      const validation = validateInput(inputData);
      if (!validation.isValid) {
        enqueueSnackbar(validation.message, { variant: 'error' });
        return;
      }

      // Perform analysis
      const analysisResults = await performAnalysis(inputData, moduleConfig);

      setResults(analysisResults);
      setProgress(100);

      // Generate interpretation
      const interpretationData = generateInterpretation(analysisResults);
      setInterpretation(interpretationData);

      enqueueSnackbar('Analysis completed successfully!', { variant: 'success' });

      // Mark section as completed
      markSectionCompleted('analysis');

    } catch (error) {
      console.error('Analysis error:', error);
      enqueueSnackbar('Analysis failed. Please check your input.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validateInput = (data) => {
    // Apply validation rules
    if (!data) {
      return { isValid: false, message: 'No data provided' };
    }

    // Apply module-specific validation
    if (validationRules.validate) {
      return validationRules.validate(data);
    }

    return { isValid: true };
  };

  const generateInterpretation = (results) => {
    // Generate contextual interpretation
    return {
      summary: 'Analysis completed',
      significance: results.p_value < 0.05 ? 'Significant' : 'Not significant',
      recommendations: [],
      nextSteps: []
    };
  };

  const markSectionCompleted = (section) => {
    if (!completedSections.includes(section)) {
      setCompletedSections([...completedSections, section]);

      // Check for achievements
      checkAchievements();
    }
  };

  const checkAchievements = () => {
    // Achievement system
    if (completedSections.length >= 5) {
      unlockAchievement('Module Master');
    }
  };

  const unlockAchievement = (achievement) => {
    enqueueSnackbar(`Achievement Unlocked: ${achievement}!`, {
      variant: 'success',
      autoHideDuration: 5000
    });
  };

  const toggleBookmark = (section) => {
    setBookmarkedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const exportResults = (format = 'json') => {
    if (!results) {
      enqueueSnackbar('No results to export', { variant: 'warning' });
      return;
    }

    const exportData = {
      module: moduleName,
      timestamp: new Date().toISOString(),
      configuration: moduleConfig,
      inputData,
      results,
      interpretation
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${moduleName.replace(/\s+/g, '_')}_results.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    enqueueSnackbar('Results exported successfully!', { variant: 'success' });
  };

  // Module Header Component
  const ModuleHeader = () => (
    <Box sx={{ mb: 4 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/statistical-dashboard')}
          sx={{ cursor: 'pointer' }}
        >
          Dashboard
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate(`/modules/${moduleCategory}`)}
          sx={{ cursor: 'pointer' }}
        >
          {moduleCategory.charAt(0).toUpperCase() + moduleCategory.slice(1)}
        </Link>
        <Typography color="text.primary">{moduleName}</Typography>
      </Breadcrumbs>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
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
                {moduleName}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {moduleDescription}
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Chip
              icon={<StarIcon />}
              label="50-Decimal Precision"
              color="primary"
              variant="outlined"
            />
            <Chip
              icon={<TrophyIcon />}
              label={`${completedSections.length}/${tabs.length} Complete`}
              color="secondary"
              variant="outlined"
            />
            <IconButton onClick={toggleDarkMode}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <IconButton onClick={() => setDrawerOpen(true)}>
              <HelpIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={(completedSections.length / tabs.length) * 100}
        sx={{
          mt: 2,
          height: 8,
          borderRadius: 4,
          background: alpha(theme.palette.primary.main, 0.1),
          '& .MuiLinearProgress-bar': {
            background: gradients.primary,
            borderRadius: 4
          }
        }}
      />
    </Box>
  );

  // Theory Tab Component
  const TheoryTab = () => (
    <Fade in={activeTab === 0} timeout={600}>
      <Grid container spacing={3}>
        {/* Hero Section */}
        <Grid item xs={12}>
          <GradientCard gradient={gradients.primary}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
                    {moduleName}
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 3, opacity: 0.95 }}>
                    {educationalContent.overview || moduleDescription}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<PlayIcon />}
                      sx={{
                        bgcolor: 'white',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'grey.100' }
                      }}
                    >
                      Start Learning
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<VideoIcon />}
                      sx={{ borderColor: 'white', color: 'white' }}
                    >
                      Watch Video
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontSize: 120 }}>
                    {moduleIcon}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </GradientCard>
        </Grid>

        {/* Mathematical Foundation */}
        <Grid item xs={12} lg={6}>
          <GlassCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FunctionsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Mathematical Foundation</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton onClick={() => toggleBookmark('math-foundation')}>
                  {bookmarkedSections.includes('math-foundation') ?
                    <BookmarkAddedIcon color="primary" /> : <BookmarkIcon />
                  }
                </IconButton>
              </Box>

              {mathematicalContent.formulas && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Key Formulas</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {/* Render formulas */}
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                      {JSON.stringify(mathematicalContent.formulas, null, 2)}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              {mathematicalContent.theorems && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Theorems & Proofs</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Button
                      startIcon={showMathProofs ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      onClick={() => setShowMathProofs(!showMathProofs)}
                      size="small"
                    >
                      {showMathProofs ? 'Hide' : 'Show'} Proofs
                    </Button>
                    <Collapse in={showMathProofs}>
                      {/* Render proofs */}
                    </Collapse>
                  </AccordionDetails>
                </Accordion>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Assumptions & Requirements */}
        <Grid item xs={12} lg={6}>
          <GlassCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Assumptions & Requirements</Typography>
              </Box>

              {educationalContent.assumptions && (
                <List>
                  {educationalContent.assumptions.map((assumption, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={assumption.title}
                        secondary={assumption.description}
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>When to Use</AlertTitle>
                {educationalContent.whenToUse || 'Appropriate usage scenarios will be displayed here.'}
              </Alert>
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Custom Theory Components */}
        {customComponents.TheoryExtension && (
          <Grid item xs={12}>
            <customComponents.TheoryExtension />
          </Grid>
        )}
      </Grid>
    </Fade>
  );

  // Analysis Tab Component
  const AnalysisTab = () => (
    <Fade in={activeTab === 1} timeout={600}>
      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} lg={4}>
          <GlassCard sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Analysis Configuration
              </Typography>

              {/* Module-specific configuration UI */}
              {customComponents.ConfigurationPanel ? (
                <customComponents.ConfigurationPanel
                  config={moduleConfig}
                  onChange={setModuleConfig}
                />
              ) : (
                <Alert severity="info">
                  Configuration panel not implemented
                </Alert>
              )}

              <Divider sx={{ my: 3 }} />

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<CalculateIcon />}
                onClick={handleAnalysis}
                disabled={loading || !inputData}
                sx={{
                  background: gradients.primary,
                  '&:hover': { background: gradients.purple }
                }}
              >
                {loading ? 'Calculating...' : 'Perform Analysis'}
              </Button>

              {loading && (
                <LinearProgress
                  sx={{ mt: 2 }}
                  variant="determinate"
                  value={progress}
                />
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Data Input & Results */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            {/* Data Input */}
            <Grid item xs={12}>
              {customComponents.DataInput ? (
                <customComponents.DataInput
                  onDataSubmit={setInputData}
                  validationRules={validationRules}
                />
              ) : (
                <Alert severity="warning">
                  Data input component not implemented
                </Alert>
              )}
            </Grid>

            {/* Results Display */}
            {results && (
              <>
                <Grid item xs={12}>
                  {customComponents.ResultsDisplay ? (
                    <customComponents.ResultsDisplay results={results} />
                  ) : (
                    <GlassCard>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Results
                        </Typography>
                        <pre>{JSON.stringify(results, null, 2)}</pre>
                      </CardContent>
                    </GlassCard>
                  )}
                </Grid>

                <Grid item xs={12}>
                  {customComponents.InterpretationPanel ? (
                    <customComponents.InterpretationPanel
                      results={results}
                      interpretation={interpretation}
                    />
                  ) : (
                    <Alert severity="info">
                      <AlertTitle>Interpretation</AlertTitle>
                      {interpretation?.summary || 'Interpretation not available'}
                    </Alert>
                  )}
                </Grid>

                {/* Visualizations */}
                {customComponents.Visualizations && (
                  <Grid item xs={12}>
                    <customComponents.Visualizations
                      data={inputData}
                      results={results}
                    />
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Fade>
  );

  // Simulations Tab Component
  const SimulationsTab = () => (
    <Fade in={activeTab === 2} timeout={600}>
      <Grid container spacing={3}>
        {/* Simulation Selector */}
        <Grid item xs={12}>
          <GlassCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Interactive Simulations
              </Typography>

              {simulationTemplates && Object.keys(simulationTemplates).length > 0 ? (
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
              ) : (
                <Alert severity="info">
                  No simulations configured for this module
                </Alert>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Simulation Controls & Visualization */}
        {activeSimulation && simulationTemplates[activeSimulation] && (
          <>
            <Grid item xs={12} lg={4}>
              {customComponents.SimulationControl ? (
                <customComponents.SimulationControl
                  template={simulationTemplates[activeSimulation]}
                  onRun={setSimulationData}
                  isRunning={simulationRunning}
                  setIsRunning={setSimulationRunning}
                />
              ) : (
                <Alert severity="warning">
                  Simulation control not implemented
                </Alert>
              )}
            </Grid>

            <Grid item xs={12} lg={8}>
              {customComponents.SimulationVisualization ? (
                <customComponents.SimulationVisualization
                  data={simulationData}
                  template={simulationTemplates[activeSimulation]}
                  isRunning={simulationRunning}
                />
              ) : (
                <GlassCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Simulation Results
                    </Typography>
                    {simulationData.length > 0 ? (
                      <pre>{JSON.stringify(simulationData.slice(0, 5), null, 2)}</pre>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <ScienceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          Run a simulation to see results
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </GlassCard>
              )}
            </Grid>
          </>
        )}

        {/* Educational Insights */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <StatCard
                icon={<LightbulbIcon />}
                title="Key Insight"
                value={educationalContent.keyInsight?.title || "Learning Point"}
                subtitle={educationalContent.keyInsight?.description || "Important concept to remember"}
                color={theme.palette.warning.main}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                icon={<PsychologyIcon />}
                title="Common Misconception"
                value={educationalContent.misconception?.title || "Common Error"}
                subtitle={educationalContent.misconception?.description || "Frequently misunderstood concept"}
                color={theme.palette.info.main}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                icon={<TrendingUpIcon />}
                title="Best Practice"
                value={educationalContent.bestPractice?.title || "Recommendation"}
                subtitle={educationalContent.bestPractice?.description || "Optimal approach"}
                color={theme.palette.success.main}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Fade>
  );

  // Learning Tab Component
  const LearningTab = () => (
    <Fade in={activeTab === 3} timeout={600}>
      <Grid container spacing={3}>
        {/* Learning Path Selector */}
        <Grid item xs={12}>
          <GlassCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Your Learning Path
              </Typography>
              <ToggleButtonGroup
                value={learningPath}
                exclusive
                onChange={(e, v) => v && setLearningPath(v)}
                sx={{ mb: 3 }}
              >
                <ToggleButton value="beginner">
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2">Beginner</Typography>
                    <Typography variant="caption">New to statistics</Typography>
                  </Box>
                </ToggleButton>
                <ToggleButton value="intermediate">
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2">Intermediate</Typography>
                    <Typography variant="caption">Some experience</Typography>
                  </Box>
                </ToggleButton>
                <ToggleButton value="advanced">
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2">Advanced</Typography>
                    <Typography variant="caption">Expert level</Typography>
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Learning Progress Stepper */}
              <Stepper activeStep={completedSections.filter(s => s.startsWith('learn_')).length} alternativeLabel>
                <Step completed={completedSections.includes('learn_basics')}>
                  <StepLabel>Basics</StepLabel>
                </Step>
                <Step completed={completedSections.includes('learn_theory')}>
                  <StepLabel>Theory</StepLabel>
                </Step>
                <Step completed={completedSections.includes('learn_practice')}>
                  <StepLabel>Practice</StepLabel>
                </Step>
                <Step completed={completedSections.includes('learn_mastery')}>
                  <StepLabel>Mastery</StepLabel>
                </Step>
              </Stepper>
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Learning Materials */}
        <Grid item xs={12} md={6}>
          <GlassCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MenuBookIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Study Materials</Typography>
              </Box>

              <List>
                <ListItem button onClick={() => enqueueSnackbar('Opening tutorial...', { variant: 'info' })}>
                  <ListItemIcon><PlayIcon /></ListItemIcon>
                  <ListItemText
                    primary="Interactive Tutorial"
                    secondary="Step-by-step guided learning"
                  />
                </ListItem>
                <ListItem button>
                  <ListItemIcon><VideoIcon /></ListItemIcon>
                  <ListItemText
                    primary="Video Lectures"
                    secondary="Expert explanations"
                  />
                </ListItem>
                <ListItem button>
                  <ListItemIcon><AssignmentIcon /></ListItemIcon>
                  <ListItemText
                    primary="Practice Problems"
                    secondary="Hands-on exercises"
                  />
                </ListItem>
                <ListItem button onClick={() => setQuizActive(true)}>
                  <ListItemIcon><QuizIcon /></ListItemIcon>
                  <ListItemText
                    primary="Knowledge Quiz"
                    secondary="Test your understanding"
                  />
                </ListItem>
              </List>
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Achievement & Progress */}
        <Grid item xs={12} md={6}>
          <GlassCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrophyIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Your Progress</Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Module Mastery
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={completedSections.length / tabs.length * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(completedSections.length / tabs.length * 100)}% Complete
                </Typography>
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Recent Achievements
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip icon={<StarIcon />} label="Quick Learner" color="primary" />
                <Chip icon={<TrophyIcon />} label="Problem Solver" color="secondary" />
                <Chip icon={<PremiumIcon />} label="Theory Master" color="warning" />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="contained"
                startIcon={<WorkspacePremium />}
                sx={{ background: gradients.gold }}
              >
                Get Certificate
              </Button>
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Custom Learning Components */}
        {customComponents.LearningExtension && (
          <Grid item xs={12}>
            <customComponents.LearningExtension
              learningPath={learningPath}
              completedSections={completedSections}
              onSectionComplete={markSectionCompleted}
            />
          </Grid>
        )}
      </Grid>
    </Fade>
  );

  // Applications Tab Component
  const ApplicationsTab = () => (
    <Fade in={activeTab === 4} timeout={600}>
      <Grid container spacing={3}>
        {/* Industry Applications */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom>
            Real-World Applications
          </Typography>
        </Grid>

        {educationalContent.applications?.map((app, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <GlassCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    {app.icon || <PublicIcon />}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{app.industry}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {app.useCase}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" paragraph>
                  {app.description}
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AssignmentIcon />}
                >
                  View Case Study
                </Button>
              </CardContent>
            </GlassCard>
          </Grid>
        ))}

        {/* Custom Applications Components */}
        {customComponents.ApplicationsExtension && (
          <Grid item xs={12}>
            <customComponents.ApplicationsExtension />
          </Grid>
        )}
      </Grid>
    </Fade>
  );

  // Main Render
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Module Header */}
      <ModuleHeader />

      {/* Main Content Area */}
      <Paper sx={{ ...glassMorphism, p: 0 }}>
        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : false}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              py: 2,
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: 600,
              minHeight: 64
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ p: isMobile ? 2 : 3 }}>
          <TabPanel value={activeTab} index={0}>
            <TheoryTab />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <AnalysisTab />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <SimulationsTab />
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            <LearningTab />
          </TabPanel>
          <TabPanel value={activeTab} index={4}>
            <ApplicationsTab />
          </TabPanel>

          {/* Render custom tabs */}
          {customTabs.map((tab, index) => (
            <TabPanel key={index} value={activeTab} index={5 + index}>
              {tab.component}
            </TabPanel>
          ))}
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
          onClick={() => exportResults('json')}
        />
        <SpeedDialAction
          icon={<ShareIcon />}
          tooltipTitle="Share Analysis"
          onClick={() => enqueueSnackbar('Sharing feature coming soon!', { variant: 'info' })}
        />
        <SpeedDialAction
          icon={<GroupIcon />}
          tooltipTitle="Collaborate"
          onClick={() => enqueueSnackbar('Collaboration feature coming soon!', { variant: 'info' })}
        />
        <SpeedDialAction
          icon={<HelpIcon />}
          tooltipTitle="Get Help"
          onClick={() => setDrawerOpen(true)}
        />
      </SpeedDial>

      {/* Help Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: isMobile ? '100%' : 400 } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Help & Resources
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <List>
            <ListItem>
              <ListItemIcon><HelpIcon /></ListItemIcon>
              <ListItemText
                primary="Quick Start Guide"
                secondary="Get started with this module"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><MenuBookIcon /></ListItemIcon>
              <ListItemText
                primary="Documentation"
                secondary="Detailed technical documentation"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><VideoIcon /></ListItemIcon>
              <ListItemText
                primary="Video Tutorials"
                secondary="Step-by-step video guides"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><GroupIcon /></ListItemIcon>
              <ListItemText
                primary="Community Forum"
                secondary="Get help from the community"
              />
            </ListItem>
          </List>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Keyboard Shortcuts
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Ctrl + Enter" secondary="Run analysis" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Ctrl + S" secondary="Save results" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Ctrl + /" secondary="Show help" />
              </ListItem>
            </List>
          </Box>
        </Box>
      </Drawer>

      {/* Quiz Dialog */}
      <Dialog
        open={quizActive}
        onClose={() => setQuizActive(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Knowledge Quiz</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Quiz functionality will be implemented here.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuizActive(false)}>Close</Button>
          <Button variant="contained" onClick={() => setQuizActive(false)}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StatisticalModuleTemplate;