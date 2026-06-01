import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  CardActions, Button, Chip, LinearProgress,
  Avatar, Tooltip, Fab,
  Tab, Tabs, alpha, useTheme, Grow, CardActionArea
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  Functions as FunctionsIcon,
  Psychology as PsychologyIcon,
  BusinessCenter as BusinessIcon,
  LocalHospital as MedicalIcon,
  CompareArrows as CompareIcon,
  BarChart as BarChartIcon,
  ScatterPlot as ScatterPlotIcon,
  PieChart as PieChartIcon,
  ShowChart as ShowChartIcon,
  BubbleChart as BubbleChartIcon,
  DonutLarge as DonutIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  EmojiEvents as TrophyIcon,
  PlayCircleFilled as PlayIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

// Solid color mapping (professional research-software aesthetic)
const gradients = {
  primary: 'primary.main',
  success: 'success.main',
  info: 'info.main',
  warning: 'warning.main',
  dark: 'secondary.main',
  ocean: 'info.main',
  sunset: 'error.main',
  forest: 'success.main',
  gold: 'warning.main',
  purple: 'secondary.main',
  blue: 'primary.main',
  green: 'success.main',
  red: 'error.main',
  orange: 'warning.main',
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

const StatisticalDashboard = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  // Real, computed catalog counts only — no fabricated gamification
  // (streak/level/XP were hardcoded and identical for every user; removed).
  const [userProgress, setUserProgress] = useState({
    totalModules: 0,
    completedModules: 0,
    inProgressModules: 0,
    totalTime: 0,
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
                  bgcolor: categoryColor,
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

  // Render an honest platform-capability summary.
  // NOTE: this card previously showed fabricated personal-progress gamification
  // (hardcoded Level 3 / 750 XP / 7-day streak) shown identically to every user.
  // That is misleading for a scientific tool and was removed
  // (audit 2026-05-31; docs/STRATEGY_AND_POSITIONING_2026-06-01.md). It now
  // summarizes the real module catalog computed from moduleCategories.
  const renderUserStats = () => (
    <Card sx={{ backgroundColor: 'secondary.main', color: 'secondary.contrastText' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Statistical Toolkit
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
          Every analysis is checked by the Guardian assumption-validation system
          before results are reported.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3">{userProgress.totalModules}</Typography>
              <Typography variant="caption">Analysis modules</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3">8</Typography>
              <Typography variant="caption">Guardian validators</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3">50</Typography>
              <Typography variant="caption">Decimal precision</Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Render learning paths
  const renderLearningPaths = () => (
    <Grid container spacing={3}>
      {learningPaths.map((path) => (
        <Grid item xs={12} sm={6} md={3} key={path.id}>
          <Card sx={{ cursor: 'pointer' }}>
            <CardContent>
              <Avatar
                sx={{
                  bgcolor: path.color,
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
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
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
                color: 'primary.main',
                fontWeight: 700,
                textAlign: 'center'
              }}
            >
              Statistical Analysis Dashboard
            </Typography>
            <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
              Master statistics through comprehensive modules, interactive simulations, and real-world applications
            </Typography>

            {/* Quick stats — real capability facts only. The "Level"/"Day Streak"
                gamification chips were hardcoded and identical for every user, so
                they were removed (docs/STRATEGY_AND_POSITIONING_2026-06-01.md). */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
              <Chip icon={<ScienceIcon />} label="50-Decimal Precision" color="primary" />
              <Chip icon={<SchoolIcon />} label={`${userProgress.totalModules} Modules Available`} color="secondary" />
              <Chip icon={<TrophyIcon />} label="8 Guardian Validators" color="success" />
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
                        bgcolor: category.color,
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
        </Container>

        {/* Floating Action Button */}
        <Tooltip title="Quick Analysis">
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
            }}
            onClick={() => navigate('/enhanced-analysis')}
          >
            <PlayIcon />
          </Fab>
        </Tooltip>
      </Box>
  );
};

export default StatisticalDashboard;