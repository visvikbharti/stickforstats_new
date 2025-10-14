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

// Import lessons directly to avoid circular dependency
import Lesson01_DiscreteDistributions from './lessons/Lesson01_DiscreteDistributions';
import Lesson02_ContinuousDistributions from './lessons/Lesson02_ContinuousDistributions';
import Lesson03_CentralLimitTheorem from './lessons/Lesson03_CentralLimitTheorem';
import Lesson04_Applications from './lessons/Lesson04_Applications';
import Lesson05_JointDistributions from './lessons/Lesson05_JointDistributions';
import Lesson06_Transformations from './lessons/Lesson06_Transformations';

/**
 * Probability Education Hub
 *
 * Central navigation for all Probability Distributions educational lessons
 * Tracks progress and provides structured learning path
 */

const ProbabilityEducationHub = () => {
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  const lessons = [
    {
      id: 1,
      title: 'Discrete Distributions',
      description: 'Binomial, Poisson, and Geometric distributions — modeling countable outcomes',
      duration: '15-20 min',
      difficulty: 'Beginner',
      component: Lesson01_DiscreteDistributions,
      available: true,
      concepts: ['Binomial', 'Poisson', 'Geometric', 'PMF']
    },
    {
      id: 2,
      title: 'Continuous Distributions',
      description: 'Normal, Exponential, and Uniform distributions — modeling measurements',
      duration: '20-25 min',
      difficulty: 'Beginner',
      component: Lesson02_ContinuousDistributions,
      available: true,
      concepts: ['Normal', 'Exponential', 'Uniform', 'PDF', 'CDF']
    },
    {
      id: 3,
      title: 'Central Limit Theorem',
      description: 'Why averages are normal — the most important theorem in statistics',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson03_CentralLimitTheorem,
      available: true,
      concepts: ['CLT', 'Sampling Distribution', 'Convergence']
    },
    {
      id: 4,
      title: 'Real-World Applications',
      description: 'See distributions in action: clinical trials, manufacturing, networks, and more',
      duration: '25-30 min',
      difficulty: 'Intermediate',
      component: Lesson04_Applications,
      available: true,
      concepts: ['Clinical Trials', 'Quality Control', 'Reliability']
    },
    {
      id: 5,
      title: 'Joint & Conditional Distributions',
      description: 'Multiple random variables: joint, marginal, conditional, and independence',
      duration: '25-30 min',
      difficulty: 'Advanced',
      component: Lesson05_JointDistributions,
      available: true,
      concepts: ['Joint Distributions', 'Marginal', 'Conditional', 'Independence', 'Covariance']
    },
    {
      id: 6,
      title: 'Transformations & MGFs',
      description: 'Transform random variables and use moment generating functions',
      duration: '30-35 min',
      difficulty: 'Advanced',
      component: Lesson06_Transformations,
      available: true,
      concepts: ['Transformations', 'Jacobian', 'MGF', 'Moment Generation']
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
      <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh' }}>
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', py: 2 }}>
          <Container>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToHub}
              sx={{ mb: 1 }}
            >
              Back to Lessons
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
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
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SchoolIcon sx={{ fontSize: 48, color: '#1976d2', mr: 2 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                Learn Probability Distributions
              </Typography>
              <Typography variant="h6" color="text.secondary">
                From discrete to continuous — master the foundations of statistical modeling
              </Typography>
            </Box>
          </Box>

          <Typography variant="body1" paragraph sx={{ mt: 2, maxWidth: '800px' }}>
            Master probability distributions through <strong>interactive visualizations</strong> and
            <strong> real-world applications</strong>. Learn how to choose the right distribution
            for your data and understand the Central Limit Theorem.
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
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: isLocked ? 'none' : 'translateY(-4px)',
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
                          <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 28 }} />
                        )}
                        {isLocked && (
                          <LockIcon sx={{ color: '#999', fontSize: 28 }} />
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
                            color: '#999',
                            fontStyle: 'italic'
                          }}
                        >
                          Coming soon! Complete previous lessons to unlock.
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
        <Paper sx={{ p: 3, mt: 4, bgcolor: '#e3f2fd' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
            Why Learn Probability Distributions?
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Data Modeling:</strong> Choose the right distribution to model your data
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Statistical Inference:</strong> Understand sampling distributions and hypothesis tests
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Prediction:</strong> Model uncertainty in forecasts and risk analysis
          </Typography>
          <Typography variant="body2">
            • <strong>Universal Language:</strong> Distributions are the foundation of all statistical methods
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default ProbabilityEducationHub;
