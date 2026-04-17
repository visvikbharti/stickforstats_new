import React, { useState } from 'react';
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
  Button
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { alpha } from '@mui/material/styles';
// Import lessons directly to avoid circular dependency
import Lesson01_Interpretation from './lessons/Lesson01_Interpretation';
import Lesson02_Coverage from './lessons/Lesson02_Coverage';
import Lesson03_Bootstrap from './lessons/Lesson03_Bootstrap';
import Lesson04_SampleSize from './lessons/Lesson04_SampleSize';
import Lesson05_HypothesisTests from './lessons/Lesson05_HypothesisTests';
import Lesson06_NonNormalData from './lessons/Lesson06_NonNormalData';
import Lesson07_AdvancedBootstrap from './lessons/Lesson07_AdvancedBootstrap';
import Lesson08_BayesianCredible from './lessons/Lesson08_BayesianCredible';

/**
 * CI Education Hub
 *
 * Central navigation for all Confidence Intervals educational lessons
 * Tracks progress and provides structured learning path
 */

const CIEducationHub = () => {
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  const lessons = [
    {
      id: 1,
      title: 'What is a Confidence Interval?',
      description: 'Understand the meaning and correct interpretation of confidence intervals',
      duration: '10-15 min',
      difficulty: 'Beginner',
      component: Lesson01_Interpretation,
      available: true,
      concepts: ['Interpretation', 'Coverage', 'Frequentist View']
    },
    {
      id: 2,
      title: 'Coverage Probability Visualized',
      description: 'See how repeated sampling creates intervals that capture the true parameter',
      duration: '15-20 min',
      difficulty: 'Beginner',
      component: Lesson02_Coverage,
      available: true,
      concepts: ['Coverage Rate', 'Repeated Sampling', 'Confidence Level']
    },
    {
      id: 3,
      title: 'Bootstrap Methods Interactive',
      description: 'Learn resampling methods that work without distributional assumptions',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson03_Bootstrap,
      available: true,
      concepts: ['Bootstrap', 'Resampling', 'Non-parametric']
    },
    {
      id: 4,
      title: 'Sample Size Effects',
      description: 'Explore how sample size affects interval width and precision',
      duration: '15-20 min',
      difficulty: 'Intermediate',
      component: Lesson04_SampleSize,
      available: true,
      concepts: ['Precision', 'Width vs n', 'Power']
    },
    {
      id: 5,
      title: 'Hypothesis Testing Connection',
      description: 'The fundamental duality between confidence intervals and hypothesis tests',
      duration: '15-20 min',
      difficulty: 'Intermediate',
      component: Lesson05_HypothesisTests,
      available: true,
      concepts: ['Duality', 'Equivalence', 'Decision Making']
    },
    {
      id: 6,
      title: 'Non-Normal Data & Transformations',
      description: 'How departures from normality affect coverage and what to do about it',
      duration: '20-25 min',
      difficulty: 'Advanced',
      component: Lesson06_NonNormalData,
      available: true,
      concepts: ['Robustness', 'Transformations', 'CLT', 'Rank Methods']
    },
    {
      id: 7,
      title: 'Advanced Bootstrap Methods',
      description: 'BCa and bootstrap-t for better coverage in challenging situations',
      duration: '20-25 min',
      difficulty: 'Advanced',
      component: Lesson07_AdvancedBootstrap,
      available: true,
      concepts: ['BCa', 'Bootstrap-t', 'Acceleration', 'Studentization']
    },
    {
      id: 8,
      title: 'Bayesian Credible Intervals',
      description: 'The Bayesian alternative: direct probability statements about parameters',
      duration: '25-30 min',
      difficulty: 'Advanced',
      component: Lesson08_BayesianCredible,
      available: true,
      concepts: ['Bayes Theorem', 'Prior', 'Posterior', 'Credible Intervals']
    }
  ];

  const handleLessonClick = (lesson) => {
    if (lesson.available) {
      setCurrentLesson(lesson.id);
    }
  };

  const handleBackToHub = () => {
    setCurrentLesson(null);
  };

  const handleCompleteLesson = (lessonId) => {
    setCompletedLessons(new Set([...completedLessons, lessonId]));
    setCurrentLesson(null);
  };

  const progressPercentage = (completedLessons.size / lessons.length) * 100;

  // If a lesson is selected, show it
  if (currentLesson) {
    const lesson = lessons.find(l => l.id === currentLesson);
    const LessonComponent = lesson.component;

    return (
      <Box sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50], minHeight: '100vh' }}>
        <Box sx={{ bgcolor: 'background.paper', borderBottom: (theme) => `1px solid ${theme.palette.divider}`, py: 2 }}>
          <Container>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToHub}
              sx={{ mb: 1 }}
            >
              Back to Lessons
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Lesson {lesson.id}: {lesson.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {lesson.description}
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ py: 3 }}>
          <LessonComponent onComplete={() => handleCompleteLesson(lesson.id)} />
        </Container>
      </Box>
    );
  }

  // Show lesson selection hub
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SchoolIcon sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                Learn Confidence Intervals
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Interactive lessons from interpretation to implementation
              </Typography>
            </Box>
          </Box>

          <Typography variant="body1" paragraph sx={{ mt: 2, maxWidth: '800px' }}>
            Master confidence intervals through <strong>interactive visualizations</strong> and
            <strong> hands-on simulations</strong>. Each lesson builds intuition for correct
            interpretation and practical application.
          </Typography>

          {/* Progress */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Your Progress: {completedLessons.size} / {lessons.length} lessons
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {progressPercentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </Paper>

        {/* Lessons Grid */}
        <Grid container spacing={3}>
          {lessons.map((lesson) => {
            const isCompleted = completedLessons.has(lesson.id);
            const isLocked = !lesson.available;

            return (
              <Grid item xs={12} md={6} key={lesson.id}>
                <Card
                  elevation={isLocked ? 1 : 3}
                  sx={{
                    height: '100%',
                    opacity: isLocked ? 0.6 : 1,
                    position: 'relative',
                    transition: 'box-shadow 0.3s',
                    '&:hover': {
                      boxShadow: isLocked ? undefined : 6
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => handleLessonClick(lesson)}
                    disabled={isLocked}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      {/* Lesson number and status */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Chip
                          label={`Lesson ${lesson.id}`}
                          color="primary"
                          size="small"
                        />
                        {isCompleted && (
                          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28 }} />
                        )}
                        {isLocked && (
                          <LockIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                        )}
                      </Box>

                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        {lesson.title}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" paragraph>
                        {lesson.description}
                      </Typography>

                      {/* Meta info */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label={lesson.duration}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={lesson.difficulty}
                          size="small"
                          variant="outlined"
                          color={
                            lesson.difficulty === 'Beginner' ? 'success' :
                            lesson.difficulty === 'Intermediate' ? 'warning' : 'error'
                          }
                        />
                      </Box>

                      {/* Concepts covered */}
                      {lesson.concepts && (
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                            Key Concepts:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {lesson.concepts.map((concept, idx) => (
                              <Chip
                                key={idx}
                                label={concept}
                                size="small"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {isLocked && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 2,
                            color: 'text.disabled',
                            fontStyle: 'italic'
                          }}
                        >
                          Complete previous lessons to unlock.
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Footer info */}
        <Paper sx={{ p: 3, mt: 4, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Learning Tips
          </Typography>
          <Typography variant="body2" paragraph>
            • Confidence intervals are about <strong>repeated sampling</strong>, not individual intervals
          </Typography>
          <Typography variant="body2" paragraph>
            • Run simulations multiple times to see variability in action
          </Typography>
          <Typography variant="body2" paragraph>
            • Experiment with different sample sizes and confidence levels
          </Typography>
          <Typography variant="body2">
            • The correct interpretation is crucial - watch for common misconceptions
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default CIEducationHub;
