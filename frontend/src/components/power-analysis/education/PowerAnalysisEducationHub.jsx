import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  LinearProgress,
  Button,
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BoltIcon from '@mui/icons-material/Bolt';
import ScienceIcon from '@mui/icons-material/Science';
import CalculateIcon from '@mui/icons-material/Calculate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import { useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Import all lessons directly (avoid circular dependency with index.js)
import Lesson01_FundamentalProblem from './lessons/Lesson01_FundamentalProblem';
import Lesson02_HypothesisTesting from './lessons/Lesson02_HypothesisTesting';
import Lesson03_StatisticalPower from './lessons/Lesson03_StatisticalPower';
import Lesson04_FourPillars from './lessons/Lesson04_FourPillars';
import Lesson05_EffectSize from './lessons/Lesson05_EffectSize';
import Lesson06_Mathematics from './lessons/Lesson06_Mathematics';
import Lesson07_DifferentDesigns from './lessons/Lesson07_DifferentDesigns';
import Lesson08_Assumptions from './lessons/Lesson08_Assumptions';
import Lesson09_APrioriVsPostHoc from './lessons/Lesson09_APrioriVsPostHoc';
import Lesson10_RealWorld from './lessons/Lesson10_RealWorld';
import Lesson11_BayesianPower from './lessons/Lesson11_BayesianPower';

/**
 * Power Analysis Education Hub
 *
 * Central navigation for all Power Analysis educational lessons.
 * Teaches researchers how to properly determine sample sizes,
 * understand effect sizes, and design adequately powered studies.
 *
 * Based on comprehensive lecture notes covering:
 * - Hypothesis testing framework
 * - Type I and Type II errors
 * - Statistical power (1 - β)
 * - Effect size measures (Cohen's d, f, r, etc.)
 * - Non-central distributions
 * - Non-parametric power analysis
 * - Bayesian alternatives
 *
 * Scientific Foundation: Cohen (1988), Faul et al. (2007, 2009)
 */

const PowerAnalysisEducationHub = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('powerAnalysisProgress');
    if (savedProgress) {
      try {
        setCompletedLessons(new Set(JSON.parse(savedProgress)));
      } catch (e) {
        console.error('Error loading progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = (lessonId) => {
    const updated = new Set([...completedLessons, lessonId]);
    setCompletedLessons(updated);
    localStorage.setItem('powerAnalysisProgress', JSON.stringify([...updated]));
  };

  // Lesson configuration - 11 comprehensive lessons
  const lessons = [
    {
      id: 1,
      title: 'The Fundamental Problem',
      description: 'Why power analysis matters: ethics, resources, and the "How many subjects?" question',
      duration: '10-15 min',
      difficulty: 'Beginner',
      component: Lesson01_FundamentalProblem,
      available: true,
      concepts: ['Sample Size', 'Research Ethics', 'Resource Optimization'],
      icon: <ScienceIcon />
    },
    {
      id: 2,
      title: 'Hypothesis Testing Framework',
      description: 'H₀ vs H₁, the decision matrix, Type I and Type II errors explained',
      duration: '15-20 min',
      difficulty: 'Beginner',
      component: Lesson02_HypothesisTesting,
      available: true,
      concepts: ['Null Hypothesis', 'Alternative Hypothesis', 'Decision Matrix', 'α and β'],
      icon: <CalculateIcon />
    },
    {
      id: 3,
      title: 'What is Statistical Power?',
      description: 'Power = 1 - β: The probability of detecting a real effect when it exists',
      duration: '15-20 min',
      difficulty: 'Beginner',
      component: Lesson03_StatisticalPower,
      available: true,
      concepts: ['Power Definition', '80% Convention', 'Type II Error'],
      icon: <BoltIcon />
    },
    {
      id: 4,
      title: 'The Four Pillars',
      description: 'Sample size, effect size, α, and power: Know three, solve for the fourth',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson04_FourPillars,
      available: true,
      concepts: ['n', 'Effect Size', 'Alpha', 'Power', 'Interdependence'],
      icon: <AutoGraphIcon />
    },
    {
      id: 5,
      title: 'Effect Size: The Crucial Concept',
      description: "Cohen's d, f, r, w, h - standardized measures of magnitude with full derivations",
      duration: '25-30 min',
      difficulty: 'Intermediate',
      component: Lesson05_EffectSize,
      available: true,
      concepts: ["Cohen's d", "Cohen's f", 'Correlation r', 'Benchmarks', 'Estimation'],
      icon: <TrendingUpIcon />
    },
    {
      id: 6,
      title: 'The Mathematics of Power',
      description: 'Non-central distributions, noncentrality parameters, and sample size formulas',
      duration: '30-40 min',
      difficulty: 'Advanced',
      component: Lesson06_Mathematics,
      available: true,
      concepts: ['Non-central t', 'Non-central F', 'Noncentrality Parameter', 'Derivations'],
      icon: <CalculateIcon />
    },
    {
      id: 7,
      title: 'Power for Different Designs',
      description: 't-tests, ANOVA, correlation, regression, chi-square, and non-parametric tests',
      duration: '35-45 min',
      difficulty: 'Intermediate',
      component: Lesson07_DifferentDesigns,
      available: true,
      concepts: ['t-test', 'ANOVA', 'Correlation', 'Regression', 'Chi-square', 'Non-parametric'],
      icon: <ScienceIcon />
    },
    {
      id: 8,
      title: 'Assumptions and Violations',
      description: 'What happens when normality, homogeneity, or independence fail',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson08_Assumptions,
      available: true,
      concepts: ['Normality', 'Homoscedasticity', 'Independence', 'Design Effect'],
      icon: <WarningIcon />
    },
    {
      id: 9,
      title: 'A Priori vs Post Hoc',
      description: 'Why post hoc power is meaningless and what to do instead',
      duration: '15-20 min',
      difficulty: 'Intermediate',
      component: Lesson09_APrioriVsPostHoc,
      available: true,
      concepts: ['A Priori Planning', 'Post Hoc Fallacy', 'Sensitivity Analysis'],
      icon: <WarningIcon />
    },
    {
      id: 10,
      title: 'Real-World Applications',
      description: 'Complete worked example: Mouse anxiety experiment from start to finish',
      duration: '25-35 min',
      difficulty: 'All Levels',
      component: Lesson10_RealWorld,
      available: true,
      concepts: ['Worked Example', 'Protocol', 'Software', 'Red Flags'],
      icon: <ScienceIcon />
    },
    {
      id: 11,
      title: 'Bayesian Power Analysis',
      description: 'Bayes Factors, assurance, and precision-based planning',
      duration: '30-40 min',
      difficulty: 'Advanced',
      component: Lesson11_BayesianPower,
      available: true,
      concepts: ['Bayes Factor', 'Assurance', 'Prior Elicitation', 'Credible Intervals'],
      icon: <AutoGraphIcon />
    }
  ];

  // Event handlers
  const handleLessonClick = (lesson) => {
    if (lesson.available) {
      setCurrentLesson(lesson.id);
    }
  };

  const handleBackToHub = () => {
    setCurrentLesson(null);
  };

  const handleCompleteLesson = (lessonId) => {
    saveProgress(lessonId);
    setCurrentLesson(null);
  };

  // Progress calculation
  const progressPercentage = (completedLessons.size / lessons.length) * 100;

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'success';
      case 'Intermediate': return 'warning';
      case 'Advanced': return 'error';
      default: return 'default';
    }
  };

  // Render individual lesson
  if (currentLesson) {
    const lesson = lessons.find(l => l.id === currentLesson);
    const LessonComponent = lesson.component;

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Navigation Header */}
          <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToHub}
                variant="outlined"
              >
                Back to Hub
              </Button>
              <Typography variant="h6" sx={{ color: theme.palette.error.main }}>
                Lesson {lesson.id}: {lesson.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={lesson.difficulty}
                color={getDifficultyColor(lesson.difficulty)}
                size="small"
              />
              <Chip
                label={lesson.duration}
                variant="outlined"
                size="small"
              />
              {completedLessons.has(lesson.id) && (
                <CheckCircleIcon sx={{ color: theme.palette.success.main }} />
              )}
            </Box>
          </Paper>

          {/* Lesson Content */}
          <LessonComponent
            onComplete={() => handleCompleteLesson(lesson.id)}
            lessonId={lesson.id}
          />
        </Container>
      </Box>
    );
  }

  // Render hub (lesson selection grid)
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Hero Header */}
        <Paper
          elevation={4}
          sx={{
            p: 5,
            mb: 4,
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 50%, ${isDarkMode ? theme.palette.error.dark : '#b71c1c'} 100%)`,
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <BoltIcon sx={{ fontSize: 64, mr: 3 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                Statistical Power Analysis
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Master sample size determination, effect sizes, and study design
              </Typography>
            </Box>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Your Progress: {completedLessons.size} / {lessons.length} lessons completed
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {progressPercentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: 'rgba(255, 255, 255, 0.3)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: isDarkMode ? theme.palette.warning.light : '#ffd700'
                }
              }}
            />
          </Box>
        </Paper>

        {/* Key Message */}
        <Alert severity="info" sx={{ mb: 4 }} icon={<BoltIcon />}>
          <Typography variant="body1">
            <strong>Why Power Analysis?</strong> An adequately powered study is essential for ethical research.
            Too few subjects waste resources and may produce false negatives. Too many subjects waste resources
            and may cause unnecessary harm. Power analysis provides a <em>principled, mathematical</em> answer
            to "How many subjects do I need?"
          </Typography>
        </Alert>

        {/* Learning Path */}
        <Paper elevation={2} sx={{ p: 3, mb: 4, bgcolor: isDarkMode ? theme.palette.warning.dark + '20' : theme.palette.warning.light + '30' }}>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.warning.dark, fontWeight: 600 }}>
            Recommended Learning Path
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                  Foundations (Lessons 1-3)
                </Typography>
                <Typography variant="body2">
                  Start here: Understand the problem, hypothesis testing, and what power means.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
                  Core Concepts (Lessons 4-8)
                </Typography>
                <Typography variant="body2">
                  The four pillars, effect sizes, mathematics, and different test designs.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                  Advanced Topics (Lessons 9-11)
                </Typography>
                <Typography variant="body2">
                  Common mistakes, real applications, and Bayesian alternatives.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Lesson Cards Grid */}
        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          All Lessons
        </Typography>

        <Grid container spacing={3}>
          {lessons.map((lesson) => {
            const isCompleted = completedLessons.has(lesson.id);

            return (
              <Grid item xs={12} sm={6} md={4} key={lesson.id}>
                <Card
                  elevation={3}
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s',
                    opacity: lesson.available ? 1 : 0.6,
                    '&:hover': lesson.available ? {
                      transform: 'translateY(-8px)',
                      boxShadow: 6
                    } : {},
                    border: isCompleted ? `2px solid ${theme.palette.success.main}` : 'none'
                  }}
                >
                  <CardActionArea
                    onClick={() => handleLessonClick(lesson)}
                    disabled={!lesson.available}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Lesson Header */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{
                          bgcolor: isDarkMode ? theme.palette.error.dark + '30' : theme.palette.error.light + '30',
                          color: theme.palette.error.main,
                          p: 1.5,
                          borderRadius: 2,
                          mr: 2
                        }}>
                          {lesson.icon}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Lesson {lesson.id}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                            {lesson.title}
                          </Typography>
                        </Box>
                        {!lesson.available && <LockIcon sx={{ color: theme.palette.text.disabled }} />}
                        {isCompleted && <CheckCircleIcon sx={{ color: theme.palette.success.main }} />}
                      </Box>

                      {/* Description */}
                      <Typography variant="body2" color="text.secondary" paragraph sx={{ flexGrow: 1 }}>
                        {lesson.description}
                      </Typography>

                      {/* Metadata */}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip
                          label={lesson.difficulty}
                          size="small"
                          color={getDifficultyColor(lesson.difficulty)}
                        />
                        <Chip
                          label={lesson.duration}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      {/* Key Concepts */}
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {lesson.concepts.slice(0, 3).map((concept, idx) => (
                          <Chip
                            key={idx}
                            label={concept}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20, bgcolor: theme.palette.grey[isDarkMode ? 800 : 50] }}
                          />
                        ))}
                        {lesson.concepts.length > 3 && (
                          <Chip
                            label={`+${lesson.concepts.length - 3}`}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Back to Learning Hub */}
        <Box sx={{ mt: 5, textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/learn')}
            size="large"
          >
            Back to Learning Hub
          </Button>
        </Box>

        {/* Scientific References */}
        <Paper elevation={1} sx={{ p: 3, mt: 4, bgcolor: theme.palette.grey[isDarkMode ? 800 : 50] }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Scientific Foundation
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This module is based on established statistical methodology:
            Cohen, J. (1988). Statistical power analysis for the behavioral sciences.
            Faul, F., et al. (2007). G*Power 3: A flexible statistical power analysis program.
            Faul, F., et al. (2009). Statistical power analyses using G*Power 3.1.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default PowerAnalysisEducationHub;
