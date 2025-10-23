import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
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
import { useNavigate } from 'react-router-dom';

import {
  Lesson01_Variance,
  Lesson02_BestLine,
  Lesson03_CovarianceMatrix,
  Lesson04_Eigenvectors,
  Lesson05_Eigendecomposition,
  Lesson06_Projection,
  Lesson07_Proof,
  Lesson08_KernelPCA,
  Lesson09_SVD,
  Lesson10_Applications
} from './index';

/**
 * PCA Education Hub
 *
 * Central navigation for all PCA educational lessons
 * Tracks progress and provides structured learning path
 */

const PCAEducationHub = () => {
  const navigate = useNavigate();
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  const lessons = [
    {
      id: 1,
      title: 'The Variance Intuition',
      description: 'Understand variance as geometric spread along a direction',
      duration: '10-15 min',
      difficulty: 'Beginner',
      component: Lesson01_Variance,
      available: true,
      concepts: ['Variance', 'Directional Spread', 'Data Ellipse']
    },
    {
      id: 2,
      title: 'Finding the Best Line',
      description: 'Discover which direction captures maximum variance',
      duration: '15-20 min',
      difficulty: 'Beginner',
      component: Lesson02_BestLine,
      available: true,
      concepts: ['Optimization', 'Maximum Variance', 'Principal Direction']
    },
    {
      id: 3,
      title: 'Covariance Matrix Unveiled',
      description: 'The matrix that encodes all directional variances',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson03_CovarianceMatrix,
      available: true,
      concepts: ['Covariance', 'Matrix Form', 'Correlation']
    },
    {
      id: 4,
      title: 'Eigenvectors as Special Directions',
      description: 'Directions that the matrix simply stretches',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson04_Eigenvectors,
      available: true,
      concepts: ['Eigenvectors', 'Eigenvalues', 'Matrix Transformation']
    },
    {
      id: 5,
      title: 'Eigendecomposition Step-by-Step',
      description: 'Breaking down the covariance matrix',
      duration: '25-30 min',
      difficulty: 'Intermediate',
      component: Lesson05_Eigendecomposition,
      available: true,
      concepts: ['Power Iteration', 'Eigendecomposition', 'Spectral Theorem']
    },
    {
      id: 6,
      title: 'Projection and Reconstruction',
      description: 'Dimensionality reduction visualized in 3D',
      duration: '20-25 min',
      difficulty: 'Advanced',
      component: Lesson06_Projection,
      available: true,
      concepts: ['Projection', 'Reconstruction Error', 'Dimensionality Reduction']
    },
    {
      id: 7,
      title: 'The Variance Maximization Proof',
      description: 'Why PCA finds the optimal low-rank approximation',
      duration: '30-35 min',
      difficulty: 'Advanced',
      component: Lesson07_Proof,
      available: true,
      concepts: ['Lagrange Multipliers', 'Optimization Theory', 'Mathematical Proof']
    },
    {
      id: 8,
      title: 'The Kernel Trick Preview',
      description: 'PCA in infinite dimensions',
      duration: '25-30 min',
      difficulty: 'Advanced',
      component: Lesson08_KernelPCA,
      available: true,
      concepts: ['Kernel PCA', 'Nonlinear Data', 'Feature Spaces']
    },
    {
      id: 9,
      title: 'Relationship to SVD',
      description: 'PCA and Singular Value Decomposition connection',
      duration: '20-25 min',
      difficulty: 'Advanced',
      component: Lesson09_SVD,
      available: true,
      concepts: ['SVD', 'Matrix Factorization', 'Equivalence']
    },
    {
      id: 10,
      title: 'Real-World Applications',
      description: 'See PCA in action across domains',
      duration: '30-40 min',
      difficulty: 'All Levels',
      component: Lesson10_Applications,
      available: true,
      concepts: ['Eigenfaces', 'Gene Expression', 'Recommender Systems']
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
        <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SchoolIcon sx={{ fontSize: 48, color: '#1976d2', mr: 2 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                Learn PCA Visually
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Interactive lessons with step-by-step derivations
              </Typography>
            </Box>
          </Box>

          <Typography variant="body1" paragraph sx={{ mt: 2, maxWidth: '800px' }}>
            Master Principal Component Analysis through <strong>interactive visualizations</strong> and
            <strong> step-by-step derivations</strong>. Each lesson builds geometric intuition before
            diving into the mathematics.
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
            💡 Learning Tips
          </Typography>
          <Typography variant="body2" paragraph>
            • Take your time - interact with each visualization thoroughly
          </Typography>
          <Typography variant="body2" paragraph>
            • Try the "Try This" challenges in each lesson
          </Typography>
          <Typography variant="body2" paragraph>
            • Experiment with different parameter values
          </Typography>
          <Typography variant="body2">
            • Review previous lessons if concepts feel unclear
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default PCAEducationHub;
