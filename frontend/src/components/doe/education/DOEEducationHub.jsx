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
import { useNavigate } from 'react-router-dom';

import {
  Lesson01_FactorialDesign,
  Lesson02_DesignTypes,
  Lesson03_Interactions,
  Lesson04_Analysis,
  Lesson05_Blocking,
  Lesson06_RSM,
  Lesson07_Desirability,
  Lesson08_Taguchi
} from './index';

/**
 * DOE Education Hub
 *
 * Central navigation for all Design of Experiments educational lessons
 * Tracks progress and provides structured learning path
 */

const DOEEducationHub = () => {
  const navigate = useNavigate();
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  const lessons = [
    {
      id: 1,
      title: 'Factorial Design Fundamentals',
      description: 'Understand why and how to design experiments for multiple factors simultaneously',
      duration: '15-20 min',
      difficulty: 'Beginner',
      component: Lesson01_FactorialDesign,
      available: true,
      concepts: ['Factorial Designs', 'Main Effects', 'Factor Levels']
    },
    {
      id: 2,
      title: 'Design Types & Applications',
      description: 'Full factorial, fractional factorial, and screening designs explained',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson02_DesignTypes,
      available: true,
      concepts: ['Full Factorial', 'Fractional Factorial', 'Plackett-Burman']
    },
    {
      id: 3,
      title: 'Interaction Effects Visualized',
      description: 'See how factors combine — interactions are where the magic happens',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson03_Interactions,
      available: true,
      concepts: ['Interactions', 'Effect Plots', 'Synergy']
    },
    {
      id: 4,
      title: 'Analysis & Interpretation',
      description: 'From design matrix to ANOVA — analyzing DOE results step-by-step',
      duration: '25-30 min',
      difficulty: 'Intermediate',
      component: Lesson04_Analysis,
      available: true,
      concepts: ['ANOVA', 'Residual Analysis', 'Model Validation']
    },
    {
      id: 5,
      title: 'Blocking & Randomization',
      description: 'Control nuisance factors and eliminate bias through proper experimental technique',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson05_Blocking,
      available: true,
      concepts: ['Randomization', 'Blocking', 'RCBD', 'Fisher Principles']
    },
    {
      id: 6,
      title: 'Response Surface Methodology',
      description: 'Model curvature and optimize processes using second-order designs',
      duration: '25-30 min',
      difficulty: 'Advanced',
      component: Lesson06_RSM,
      available: true,
      concepts: ['RSM', 'Central Composite Design', 'Contour Plots', 'Optimization']
    },
    {
      id: 7,
      title: 'Optimization & Desirability Functions',
      description: 'Balance competing objectives using desirability functions and multi-criteria optimization',
      duration: '25-30 min',
      difficulty: 'Advanced',
      component: Lesson07_Desirability,
      available: true,
      concepts: ['Multi-Objective', 'Desirability', 'Pareto Frontier', 'Trade-offs']
    },
    {
      id: 8,
      title: 'Robust Design & Taguchi Methods',
      description: 'Design for quality despite variation using signal-to-noise ratios and parameter design',
      duration: '30-35 min',
      difficulty: 'Advanced',
      component: Lesson08_Taguchi,
      available: true,
      concepts: ['Robustness', 'SNR', 'Taguchi', 'Noise Factors', 'Parameter Design']
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
                Learn Design of Experiments
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Master systematic experimentation from fundamentals to optimization
              </Typography>
            </Box>
          </Box>

          <Typography variant="body1" paragraph sx={{ mt: 2, maxWidth: '800px' }}>
            Master Design of Experiments (DOE) through <strong>interactive visualizations</strong> and
            <strong> practical examples</strong>. Learn how to efficiently uncover cause-and-effect
            relationships and optimize complex systems.
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
            Why Learn DOE?
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Efficiency:</strong> Test multiple factors simultaneously instead of one-at-a-time
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Interactions:</strong> Discover how factors combine — missed by OFAT experiments
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Optimization:</strong> Find optimal settings faster with fewer experiments
          </Typography>
          <Typography variant="body2">
            • <strong>Industry Standard:</strong> Used in pharmaceuticals, manufacturing, agriculture, and more
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default DOEEducationHub;
