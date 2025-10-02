import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import ScienceIcon from '@mui/icons-material/Science';
import FunctionsIcon from '@mui/icons-material/Functions';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

/**
 * Unified Learning Hub
 *
 * Central educational portal for all StickForStats learning modules
 * Displays PCA, CI, DOE, and Probability courses with unified progress tracking
 */

const LearningHub = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(0);
  const [completedModules, setCompletedModules] = useState(new Set());

  // Educational modules configuration
  const modules = [
    {
      id: 'pca',
      title: 'Principal Component Analysis',
      shortTitle: 'PCA',
      icon: <AutoGraphIcon sx={{ fontSize: 48 }} />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      route: '/pca-learn',
      category: 'Multivariate Analysis',
      difficulty: 'Intermediate',
      duration: '60-90 min',
      lessonsTotal: 10,
      lessonsAvailable: 10,
      description: 'Master dimensionality reduction, data visualization, and feature extraction through interactive lessons',
      topics: [
        'Variance maximization',
        'Eigenvalue decomposition',
        'Scree plots & component selection',
        'Biplot interpretation',
        'Real-world applications'
      ],
      prerequisites: ['Linear algebra basics', 'Statistics fundamentals'],
      learningOutcomes: [
        'Reduce high-dimensional data effectively',
        'Interpret principal components',
        'Choose optimal number of components',
        'Apply PCA to real datasets'
      ]
    },
    {
      id: 'ci',
      title: 'Confidence Intervals',
      shortTitle: 'CI',
      icon: <ShowChartIcon sx={{ fontSize: 48 }} />,
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      route: '/ci-learn',
      category: 'Statistical Inference',
      difficulty: 'Beginner',
      duration: '40-60 min',
      lessonsTotal: 8,
      lessonsAvailable: 8,
      description: 'Understand uncertainty quantification, correct interpretation, and construction methods',
      topics: [
        'Frequentist interpretation',
        'Coverage probability',
        'Bootstrap methods',
        'Sample size determination',
        'Common misconceptions'
      ],
      prerequisites: ['Basic statistics', 'Sampling distributions'],
      learningOutcomes: [
        'Correctly interpret confidence intervals',
        'Calculate intervals for means and proportions',
        'Use bootstrap for non-parametric CIs',
        'Determine required sample sizes'
      ]
    },
    {
      id: 'doe',
      title: 'Design of Experiments',
      shortTitle: 'DOE',
      icon: <ScienceIcon sx={{ fontSize: 48 }} />,
      color: '#ed6c02',
      bgColor: '#fff3e0',
      route: '/doe-learn',
      category: 'Experimental Design',
      difficulty: 'Intermediate',
      duration: '50-75 min',
      lessonsTotal: 8,
      lessonsAvailable: 8,
      description: 'Learn efficient experimental strategies, factorial designs, and interaction analysis',
      topics: [
        'Factorial vs OFAT',
        'Full & fractional designs',
        'Interaction effects',
        'ANOVA analysis',
        'Response surface methods'
      ],
      prerequisites: ['ANOVA', 'Regression basics'],
      learningOutcomes: [
        'Design efficient experiments',
        'Analyze factorial designs',
        'Detect and interpret interactions',
        'Optimize processes with RSM'
      ]
    },
    {
      id: 'probability',
      title: 'Probability Distributions',
      shortTitle: 'Probability',
      icon: <FunctionsIcon sx={{ fontSize: 48 }} />,
      color: '#9c27b0',
      bgColor: '#f3e5f5',
      route: '/probability-learn',
      category: 'Probability Theory',
      difficulty: 'Beginner',
      duration: '60-80 min',
      lessonsTotal: 6,
      lessonsAvailable: 6,
      description: 'Master discrete and continuous distributions from Binomial to Normal with interactive visualizations',
      topics: [
        'Discrete distributions (Binomial, Poisson)',
        'Continuous distributions (Normal, Exponential)',
        'Central Limit Theorem',
        'Real-world applications',
        'Distribution selection'
      ],
      prerequisites: ['Probability basics', 'Calculus (for continuous)'],
      learningOutcomes: [
        'Choose appropriate distributions',
        'Calculate probabilities',
        'Understand the CLT',
        'Apply distributions to real problems'
      ]
    },
    {
      id: 'sqc',
      title: 'Statistical Quality Control',
      shortTitle: 'SQC',
      icon: <TimelineIcon sx={{ fontSize: 48 }} />,
      color: '#d32f2f',
      bgColor: '#ffebee',
      route: '/sqc-learn',
      category: 'Quality Control',
      difficulty: 'Intermediate',
      duration: '60-90 min',
      lessonsTotal: 6,
      lessonsAvailable: 6,
      description: 'Master control charts, process capability, and quality improvement through SPC methods',
      topics: [
        'Control charts (variables & attributes)',
        'Process capability (Cp, Cpk, Pp, Ppk)',
        'Measurement system analysis',
        'Acceptance sampling',
        'Six Sigma fundamentals'
      ],
      prerequisites: ['Statistics fundamentals', 'Normal distribution'],
      learningOutcomes: [
        'Design and interpret control charts',
        'Assess process capability',
        'Conduct Gage R&R studies',
        'Apply SPC to real processes'
      ]
    }
  ];

  // Category definitions
  const categories = [
    { id: 0, name: 'All Courses', icon: <SchoolIcon /> },
    { id: 1, name: 'Beginner', icon: <StarIcon /> },
    { id: 2, name: 'Intermediate', icon: <TrendingUpIcon /> },
    { id: 3, name: 'Advanced', icon: <EmojiEventsIcon /> }
  ];

  // Filter modules by category
  const filteredModules = modules.filter(module => {
    if (activeCategory === 0) return true; // All courses
    if (activeCategory === 1) return module.difficulty === 'Beginner';
    if (activeCategory === 2) return module.difficulty === 'Intermediate';
    if (activeCategory === 3) return module.difficulty === 'Advanced';
    return true;
  });

  // Calculate overall progress
  const totalLessonsAvailable = modules.reduce((sum, m) => sum + m.lessonsAvailable, 0);
  const overallProgress = (completedModules.size / totalLessonsAvailable) * 100;

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('learningHubProgress');
    if (savedProgress) {
      setCompletedModules(new Set(JSON.parse(savedProgress)));
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = (moduleId) => {
    const updated = new Set([...completedModules, moduleId]);
    setCompletedModules(updated);
    localStorage.setItem('learningHubProgress', JSON.stringify([...updated]));
  };

  const handleModuleClick = (route) => {
    navigate(route);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'warning';
      case 'Advanced': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Hero Header */}
        <Paper elevation={4} sx={{ p: 5, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SchoolIcon sx={{ fontSize: 64, mr: 3 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                StickForStats Learning Hub
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Master statistical methods through interactive, progressive lessons
              </Typography>
            </Box>
          </Box>

          {/* Overall Progress */}
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Your Learning Journey: {completedModules.size} / {totalLessonsAvailable} modules completed
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {overallProgress.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: 'rgba(255, 255, 255, 0.3)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#ffd700'
                }
              }}
            />
          </Box>
        </Paper>

        {/* Welcome Message for New Users */}
        {completedModules.size === 0 && (
          <Alert severity="info" sx={{ mb: 4 }} icon={<StarIcon />}>
            <Typography variant="h6" gutterBottom>
              Welcome to Your Learning Journey! 🎉
            </Typography>
            <Typography variant="body2">
              Start with <strong>Confidence Intervals</strong> or <strong>Probability Distributions</strong> (Beginner level),
              then progress to <strong>PCA</strong> and <strong>DOE</strong> (Intermediate level). Each module includes
              interactive visualizations, real-world examples, and hands-on simulations.
            </Typography>
          </Alert>
        )}

        {/* Category Tabs */}
        <Paper elevation={2} sx={{ mb: 4 }}>
          <Tabs
            value={activeCategory}
            onChange={(e, newValue) => setActiveCategory(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {categories.map((cat) => (
              <Tab
                key={cat.id}
                label={cat.name}
                icon={cat.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>

        {/* Module Cards Grid */}
        <Grid container spacing={4}>
          {filteredModules.map((module) => {
            const isCompleted = completedModules.has(module.id);
            const progressPercent = isCompleted ? 100 : 0;

            return (
              <Grid item xs={12} md={6} lg={6} key={module.id}>
                <Card
                  elevation={3}
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 6
                    },
                    border: isCompleted ? '2px solid #4caf50' : 'none'
                  }}
                >
                  <CardActionArea onClick={() => handleModuleClick(module.route)} sx={{ height: '100%' }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Header Section */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{
                          bgcolor: module.bgColor,
                          color: module.color,
                          p: 1.5,
                          borderRadius: 2,
                          mr: 2
                        }}>
                          {module.icon}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {module.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={module.difficulty}
                              size="small"
                              color={getDifficultyColor(module.difficulty)}
                            />
                            <Chip
                              label={module.category}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={module.duration}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        {isCompleted && (
                          <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 32 }} />
                        )}
                      </Box>

                      {/* Description */}
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {module.description}
                      </Typography>

                      {/* Progress Bar */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {module.lessonsAvailable} lessons available
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {progressPercent}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progressPercent}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>

                      {/* Key Topics */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                          Key Topics:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {module.topics.slice(0, 3).map((topic, idx) => (
                            <Chip
                              key={idx}
                              label={topic}
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                          ))}
                          {module.topics.length > 3 && (
                            <Chip
                              label={`+${module.topics.length - 3} more`}
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Prerequisites */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Prerequisites:
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {module.prerequisites.join(', ')}
                        </Typography>
                      </Box>

                      {/* CTA Button */}
                      <Box sx={{ mt: 'auto' }}>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{
                            bgcolor: module.color,
                            '&:hover': { bgcolor: module.color, opacity: 0.9 }
                          }}
                        >
                          {isCompleted ? 'Review Lessons' : 'Start Learning'}
                        </Button>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Learning Path Recommendation */}
        <Paper elevation={3} sx={{ p: 4, mt: 5, bgcolor: '#e3f2fd' }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
            📚 Recommended Learning Path
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Beginners: Start Here
                  </Typography>
                  <Typography variant="body2" paragraph>
                    1. <strong>Probability Distributions</strong> — Foundation for all statistics
                    <br />
                    2. <strong>Confidence Intervals</strong> — Essential inference tool
                    <br />
                    3. <strong>DOE</strong> — Design better experiments
                    <br />
                    4. <strong>PCA</strong> — Advanced multivariate analysis
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#ed6c02' }}>
                    Experienced: Skill Refresh
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • <strong>PCA</strong> — Deepen dimensionality reduction expertise
                    <br />
                    • <strong>DOE</strong> — Master factorial designs and interactions
                    <br />
                    • <strong>CI</strong> — Review bootstrap and non-parametric methods
                    <br />
                    • <strong>Probability</strong> — Solidify CLT understanding
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Platform Features */}
        <Paper sx={{ p: 4, mt: 4, bgcolor: '#f5f5f5' }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
            Why Learn with StickForStats?
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <TimelineIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Interactive Visualizations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  See concepts come alive with D3.js animations and real-time parameter adjustments
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <ScienceIcon sx={{ fontSize: 48, color: '#2e7d32', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Hands-On Simulations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Run experiments, generate data, and observe statistical laws in action
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <SchoolIcon sx={{ fontSize: 48, color: '#ed6c02', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Progressive Learning
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Structured lessons build on each other, from fundamentals to advanced topics
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: '#9c27b0', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Real-World Applications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Every concept includes industry examples and practical use cases
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

      </Container>
    </Box>
  );
};

export default LearningHub;
