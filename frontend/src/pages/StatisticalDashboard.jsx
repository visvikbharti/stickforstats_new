import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  CardActions, Button, IconButton, Chip, LinearProgress,
  Avatar, Badge, Tooltip, Fab, Divider, List, ListItem,
  ListItemIcon, ListItemText, ListItemAvatar, ListItemButton,
  Tab, Tabs, alpha, useTheme, ThemeProvider, createTheme,
  CssBaseline, Zoom, Fade, Grow, CardMedia, CardActionArea
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Functions as FunctionsIcon,
  Psychology as PsychologyIcon,
  BusinessCenter as BusinessIcon,
  LocalHospital as MedicalIcon,
  Factory as FactoryIcon,
  Nature as EnvironmentIcon,
  CompareArrows as CompareIcon,
  BarChart as BarChartIcon,
  ScatterPlot as ScatterPlotIcon,
  PieChart as PieChartIcon,
  ShowChart as ShowChartIcon,
  BubbleChart as BubbleChartIcon,
  DonutLarge as DonutIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  Lock as LockIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  MenuBook as MenuBookIcon,
  PlayCircleFilled as PlayIcon,
  ArrowForward as ArrowForwardIcon,
  Whatshot as HotIcon,
  NewReleases as NewIcon,
  Verified as VerifiedIcon,
  Grade as GradeIcon,
  WorkspacePremium as PremiumIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

// Beautiful gradient schemes
const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  dark: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ocean: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  forest: 'linear-gradient(135deg, #96e6a1 0%, #4bc0c8 100%)',
  gold: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
  purple: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  blue: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  green: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  red: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
  orange: 'linear-gradient(135deg, #f46b45 0%, #eea849 100%)'
};

// Module categories
const moduleCategories = {
  fundamental: {
    title: 'Fundamental Statistics',
    icon: <FunctionsIcon />,
    color: gradients.primary,
    modules: [
      {
        id: 'descriptive',
        title: 'Descriptive Statistics',
        description: 'Measures of central tendency, variability, and distribution shape',
        icon: <BarChartIcon />,
        path: '/modules/descriptive',
        progress: 100,
        status: 'completed',
        difficulty: 'Beginner',
        estimatedTime: '30 min',
        topics: ['Mean', 'Median', 'Standard Deviation', 'Skewness', 'Kurtosis']
      },
      {
        id: 'hypothesis-testing',
        title: 'Hypothesis Testing Mastery',
        description: 'Master statistical inference with comprehensive simulations',
        icon: <ScienceIcon />,
        path: '/modules/hypothesis-testing',
        progress: 100,
        status: 'completed',
        difficulty: 'Fundamental',
        estimatedTime: '60 min',
        topics: ['Type I/II Errors', 'Power Analysis', 'P-values', 'Effect Size', 'Simulations']
      },
      {
        id: 't-test',
        title: 'T-Tests',
        description: 'Compare means between groups with hypothesis testing',
        icon: <CompareIcon />,
        path: '/modules/t-test',
        progress: 100,
        status: 'completed',
        difficulty: 'Intermediate',
        estimatedTime: '45 min',
        topics: ['One-sample', 'Two-sample', 'Paired', 'Welch\'s t-test']
      },
      {
        id: 'anova',
        title: 'ANOVA',
        description: 'Analysis of variance for multiple group comparisons',
        icon: <ShowChartIcon />,
        path: '/modules/anova',
        progress: 75,
        status: 'in-progress',
        difficulty: 'Intermediate',
        estimatedTime: '60 min',
        topics: ['One-way', 'Two-way', 'Repeated Measures', 'MANOVA']
      },
      {
        id: 'chi-square',
        title: 'Chi-Square Tests',
        description: 'Test relationships between categorical variables',
        icon: <PieChartIcon />,
        path: '/modules/chi-square',
        progress: 0,
        status: 'pending',
        difficulty: 'Intermediate',
        estimatedTime: '40 min',
        topics: ['Goodness of Fit', 'Independence', 'Homogeneity']
      }
    ]
  },
  relationships: {
    title: 'Relationships & Predictions',
    icon: <ScatterPlotIcon />,
    color: gradients.success,
    modules: [
      {
        id: 'correlation-regression',
        title: 'Correlation & Regression Mastery',
        description: 'Comprehensive analysis of relationships with interactive simulations',
        icon: <ScatterPlotIcon />,
        path: '/modules/correlation-regression',
        progress: 100,
        status: 'completed',
        difficulty: 'Intermediate-Advanced',
        estimatedTime: '90 min',
        topics: ['Pearson', 'Spearman', 'Linear', 'Multiple', 'Logistic', 'Diagnostics']
      },
      {
        id: 'time-series',
        title: 'Time Series Analysis',
        description: 'Analyze data patterns over time',
        icon: <TimelineIcon />,
        path: '/modules/time-series',
        progress: 0,
        status: 'locked',
        difficulty: 'Advanced',
        estimatedTime: '120 min',
        topics: ['ARIMA', 'Seasonality', 'Forecasting', 'Decomposition']
      }
    ]
  },
  nonparametric: {
    title: 'Non-Parametric Tests',
    icon: <BubbleChartIcon />,
    color: gradients.info,
    modules: [
      {
        id: 'mann-whitney',
        title: 'Mann-Whitney U Test',
        description: 'Non-parametric alternative to independent t-test',
        icon: <CompareIcon />,
        path: '/modules/mann-whitney',
        progress: 0,
        status: 'pending',
        difficulty: 'Intermediate',
        estimatedTime: '40 min',
        topics: ['Rank-based', 'Two Independent Samples']
      },
      {
        id: 'wilcoxon',
        title: 'Wilcoxon Tests',
        description: 'Non-parametric tests for paired and single samples',
        icon: <ShowChartIcon />,
        path: '/modules/wilcoxon',
        progress: 0,
        status: 'pending',
        difficulty: 'Intermediate',
        estimatedTime: '35 min',
        topics: ['Signed-Rank', 'Rank-Sum']
      },
      {
        id: 'kruskal-wallis',
        title: 'Kruskal-Wallis Test',
        description: 'Non-parametric alternative to one-way ANOVA',
        icon: <BarChartIcon />,
        path: '/modules/kruskal-wallis',
        progress: 0,
        status: 'locked',
        difficulty: 'Advanced',
        estimatedTime: '45 min',
        topics: ['Multiple Groups', 'Rank-based ANOVA']
      }
    ]
  },
  advanced: {
    title: 'Advanced Techniques',
    icon: <ScienceIcon />,
    color: gradients.warning,
    modules: [
      {
        id: 'multivariate',
        title: 'Multivariate Analysis',
        description: 'Analyze multiple variables simultaneously',
        icon: <DonutIcon />,
        path: '/modules/multivariate',
        progress: 0,
        status: 'locked',
        difficulty: 'Expert',
        estimatedTime: '150 min',
        topics: ['PCA', 'Factor Analysis', 'Cluster Analysis', 'Discriminant']
      },
      {
        id: 'bayesian',
        title: 'Bayesian Statistics',
        description: 'Incorporate prior knowledge into statistical analysis',
        icon: <PsychologyIcon />,
        path: '/modules/bayesian',
        progress: 0,
        status: 'locked',
        difficulty: 'Expert',
        estimatedTime: '180 min',
        topics: ['Bayes Theorem', 'Prior/Posterior', 'MCMC', 'Credible Intervals']
      },
      {
        id: 'machine-learning',
        title: 'Statistical ML',
        description: 'Bridge between statistics and machine learning',
        icon: <SpeedIcon />,
        path: '/modules/ml-stats',
        progress: 0,
        status: 'locked',
        difficulty: 'Expert',
        estimatedTime: '200 min',
        topics: ['Cross-validation', 'Regularization', 'Feature Selection', 'Model Evaluation']
      }
    ]
  }
};

// Learning paths
const learningPaths = [
  {
    id: 'beginner',
    title: 'Statistical Foundations',
    description: 'Start your journey with fundamental concepts',
    icon: <SchoolIcon />,
    color: gradients.green,
    modules: ['descriptive', 't-test', 'chi-square', 'correlation'],
    progress: 45
  },
  {
    id: 'researcher',
    title: 'Research Methods',
    description: 'Essential tools for scientific research',
    icon: <ScienceIcon />,
    color: gradients.blue,
    modules: ['t-test', 'anova', 'regression', 'power-analysis'],
    progress: 30
  },
  {
    id: 'business',
    title: 'Business Analytics',
    description: 'Data-driven decision making for business',
    icon: <BusinessIcon />,
    color: gradients.gold,
    modules: ['descriptive', 'regression', 'time-series', 'forecasting'],
    progress: 15
  },
  {
    id: 'medical',
    title: 'Medical Statistics',
    description: 'Clinical trials and medical research',
    icon: <MedicalIcon />,
    color: gradients.red,
    modules: ['t-test', 'anova', 'survival', 'meta-analysis'],
    progress: 0
  }
];

// Achievements
const achievements = [
  { id: 1, title: 'First Analysis', icon: <StarIcon />, unlocked: true, description: 'Complete your first statistical analysis' },
  { id: 2, title: 'Theory Master', icon: <MenuBookIcon />, unlocked: true, description: 'Read all theoretical foundations' },
  { id: 3, title: 'Simulation Expert', icon: <TimelineIcon />, unlocked: false, description: 'Run 100 simulations' },
  { id: 4, title: 'Data Wizard', icon: <TrophyIcon />, unlocked: false, description: 'Analyze 50 datasets' },
];

const StatisticalDashboard = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [userProgress, setUserProgress] = useState({
    totalModules: 0,
    completedModules: 0,
    inProgressModules: 0,
    totalTime: 0,
    streak: 7,
    level: 3,
    experience: 750,
    nextLevelXP: 1000
  });

  // Calculate user progress
  useEffect(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;

    Object.values(moduleCategories).forEach(category => {
      category.modules.forEach(module => {
        total++;
        if (module.status === 'completed') completed++;
        if (module.status === 'in-progress') inProgress++;
      });
    });

    setUserProgress(prev => ({
      ...prev,
      totalModules: total,
      completedModules: completed,
      inProgressModules: inProgress
    }));
  }, []);

  // Create theme
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#667eea' },
      secondary: { main: '#764ba2' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    shape: { borderRadius: 16 },
  });

  // Navigate to module
  const handleModuleClick = (module) => {
    if (module.status === 'locked') {
      enqueueSnackbar('This module is locked. Complete prerequisites first!', { variant: 'warning' });
      return;
    }
    navigate(module.path);
    enqueueSnackbar(`Opening ${module.title}...`, { variant: 'info' });
  };

  // Render module card
  const renderModuleCard = (module, categoryColor) => (
    <Grow in={true} key={module.id}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          cursor: module.status !== 'locked' ? 'pointer' : 'not-allowed',
          opacity: module.status === 'locked' ? 0.6 : 1,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: module.status !== 'locked' ? 'translateY(-5px)' : 'none',
            boxShadow: module.status !== 'locked' ? '0 12px 24px rgba(0,0,0,0.15)' : 'default'
          }
        }}
        onClick={() => handleModuleClick(module)}
      >
        {/* Status Badge */}
        {module.status === 'completed' && (
          <Chip
            label="Completed"
            icon={<CheckCircleIcon />}
            color="success"
            size="small"
            sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
          />
        )}
        {module.status === 'locked' && (
          <Chip
            label="Locked"
            icon={<LockIcon />}
            color="default"
            size="small"
            sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
          />
        )}
        {module.status === 'in-progress' && (
          <Chip
            label="In Progress"
            color="primary"
            size="small"
            sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
          />
        )}

        <CardActionArea sx={{ flexGrow: 1 }} disabled={module.status === 'locked'}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  background: categoryColor,
                  width: 56,
                  height: 56,
                  mr: 2
                }}
              >
                {module.icon}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {module.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={module.difficulty} size="small" variant="outlined" />
                  <Chip label={module.estimatedTime} size="small" variant="outlined" />
                </Box>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              {module.description}
            </Typography>

            {/* Topics */}
            <Box sx={{ mb: 2 }}>
              {module.topics.slice(0, 3).map((topic, idx) => (
                <Chip
                  key={idx}
                  label={topic}
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5, fontSize: '0.75rem' }}
                />
              ))}
              {module.topics.length > 3 && (
                <Chip
                  label={`+${module.topics.length - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 0.5, fontSize: '0.75rem' }}
                />
              )}
            </Box>

            {/* Progress Bar */}
            {module.status !== 'locked' && (
              <Box sx={{ mt: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">Progress</Typography>
                  <Typography variant="caption">{module.progress}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={module.progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      background: module.progress === 100 ? gradients.success : categoryColor
                    }
                  }}
                />
              </Box>
            )}
          </CardContent>
        </CardActionArea>

        <CardActions>
          <Button
            fullWidth
            variant="contained"
            disabled={module.status === 'locked'}
            endIcon={module.status === 'locked' ? <LockIcon /> : <ArrowForwardIcon />}
            sx={{
              background: module.status === 'locked' ? 'grey' : categoryColor,
              '&:hover': {
                background: module.status === 'locked' ? 'grey' : categoryColor
              }
            }}
          >
            {module.status === 'locked' ? 'Locked' :
             module.status === 'completed' ? 'Review' :
             module.status === 'in-progress' ? 'Continue' : 'Start'}
          </Button>
        </CardActions>
      </Card>
    </Grow>
  );

  // Render user stats card
  const renderUserStats = () => (
    <Card sx={{ background: gradients.purple, color: 'white' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Your Progress
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3">{userProgress.completedModules}</Typography>
              <Typography variant="caption">Completed</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3">{userProgress.inProgressModules}</Typography>
              <Typography variant="caption">In Progress</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3">{userProgress.streak}</Typography>
              <Typography variant="caption">Day Streak 🔥</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3">Lv.{userProgress.level}</Typography>
              <Typography variant="caption">Current Level</Typography>
            </Box>
          </Grid>
        </Grid>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Level {userProgress.level} Progress
            </Typography>
            <Typography variant="body2">
              {userProgress.experience}/{userProgress.nextLevelXP} XP
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(userProgress.experience / userProgress.nextLevelXP) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: '#ffffff'
              }
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );

  // Render learning paths
  const renderLearningPaths = () => (
    <Grid container spacing={3}>
      {learningPaths.map((path) => (
        <Grid item xs={12} sm={6} md={3} key={path.id}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
              }
            }}
          >
            <CardContent>
              <Avatar
                sx={{
                  background: path.color,
                  width: 48,
                  height: 48,
                  mb: 2
                }}
              >
                {path.icon}
              </Avatar>
              <Typography variant="h6" gutterBottom>
                {path.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {path.description}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={path.progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  mb: 1
                }}
              />
              <Typography variant="caption">
                {path.progress}% Complete
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" fullWidth>
                View Path
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: darkMode
            ? 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)'
            : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          pb: 4
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ pt: 4, pb: 3 }}>
            <Typography
              variant="h3"
              gutterBottom
              sx={{
                background: gradients.primary,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
                textAlign: 'center'
              }}
            >
              Statistical Analysis Dashboard
            </Typography>
            <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
              Master statistics through comprehensive modules, interactive simulations, and real-world applications
            </Typography>

            {/* Quick Stats */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
              <Chip icon={<ScienceIcon />} label="50-Decimal Precision" color="primary" />
              <Chip icon={<SchoolIcon />} label="13 Modules Available" color="secondary" />
              <Chip icon={<TrophyIcon />} label="Level 3" color="success" />
              <Chip icon={<HotIcon />} label="7 Day Streak" color="error" />
            </Box>
          </Box>

          {/* User Progress Card */}
          <Box sx={{ mb: 4 }}>
            {renderUserStats()}
          </Box>

          {/* Navigation Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={selectedTab}
              onChange={(e, v) => setSelectedTab(v)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="All Modules" icon={<DashboardIcon />} iconPosition="start" />
              <Tab label="Learning Paths" icon={<SchoolIcon />} iconPosition="start" />
              <Tab label="Achievements" icon={<TrophyIcon />} iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          {selectedTab === 0 && (
            <Box>
              {/* Module Categories */}
              {Object.entries(moduleCategories).map(([key, category]) => (
                <Box key={key} sx={{ mb: 5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      sx={{
                        background: category.color,
                        width: 48,
                        height: 48,
                        mr: 2
                      }}
                    >
                      {category.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        {category.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {category.modules.length} modules available
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={3}>
                    {category.modules.map(module =>
                      <Grid item xs={12} sm={6} md={4} key={module.id}>
                        {renderModuleCard(module, category.color)}
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ))}
            </Box>
          )}

          {selectedTab === 1 && renderLearningPaths()}

          {selectedTab === 2 && (
            <Grid container spacing={3}>
              {achievements.map((achievement) => (
                <Grid item xs={12} sm={6} md={3} key={achievement.id}>
                  <Card sx={{ opacity: achievement.unlocked ? 1 : 0.5 }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          margin: '0 auto',
                          mb: 2,
                          background: achievement.unlocked ? gradients.gold : 'grey'
                        }}
                      >
                        {achievement.icon}
                      </Avatar>
                      <Typography variant="h6" gutterBottom>
                        {achievement.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {achievement.description}
                      </Typography>
                      {achievement.unlocked && (
                        <Chip
                          label="Unlocked"
                          color="success"
                          size="small"
                          sx={{ mt: 2 }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>

        {/* Floating Action Button */}
        <Tooltip title="Quick Analysis">
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: gradients.primary
            }}
            onClick={() => navigate('/enhanced-analysis')}
          >
            <PlayIcon />
          </Fab>
        </Tooltip>
      </Box>
    </ThemeProvider>
  );
};

export default StatisticalDashboard;