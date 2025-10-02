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
  Lesson01_IntroductionToSQC,
  Lesson02_VariablesControlCharts,
  Lesson03_AttributesControlCharts,
  Lesson04_ProcessCapability,
  Lesson05_MSA,
  Lesson06_AcceptanceSampling
} from './index';

/**
 * Statistical Quality Control Education Hub
 *
 * Central navigation for all SQC educational lessons
 * Tracks progress and provides structured learning path
 */

const SQCEducationHub = () => {
  const navigate = useNavigate();
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  const lessons = [
    {
      id: 1,
      title: 'Introduction to Statistical Quality Control',
      description: 'History, philosophy, and fundamentals of SQC — from Shewhart to modern Six Sigma',
      duration: '15-20 min',
      difficulty: 'Beginner',
      component: Lesson01_IntroductionToSQC,
      available: true,
      concepts: ['Quality History', 'Variation Types', 'Control vs Capability', 'SPC Philosophy']
    },
    {
      id: 2,
      title: 'Variables Control Charts',
      description: 'X̄-R, X̄-S, and Individual-MR charts — monitoring continuous measurements',
      duration: '20-25 min',
      difficulty: 'Beginner',
      component: Lesson02_VariablesControlCharts,
      available: true,
      concepts: ['X̄-R Charts', 'X̄-S Charts', 'I-MR Charts', 'Control Limits', 'Western Electric Rules']
    },
    {
      id: 3,
      title: 'Attributes Control Charts',
      description: 'p, np, c, and u charts — monitoring counts and proportions',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson03_AttributesControlCharts,
      available: true,
      concepts: ['p-Charts', 'np-Charts', 'c-Charts', 'u-Charts', 'Choosing Chart Type']
    },
    {
      id: 4,
      title: 'Process Capability Analysis',
      description: 'Cp, Cpk, Pp, Ppk — measuring process performance against specifications',
      duration: '25-30 min',
      difficulty: 'Intermediate',
      component: Lesson04_ProcessCapability,
      available: true,
      concepts: ['Cp vs Cpk', 'Pp vs Ppk', 'Capability vs Performance', 'Six Sigma', 'Defect Rates']
    },
    {
      id: 5,
      title: 'Measurement System Analysis',
      description: 'Gage R&R studies — ensuring your measurements are reliable',
      duration: '25-30 min',
      difficulty: 'Advanced',
      component: Lesson05_MSA,
      available: true,
      concepts: ['Gage R&R', 'Repeatability', 'Reproducibility', 'Bias', 'Linearity', 'Stability']
    },
    {
      id: 6,
      title: 'Acceptance Sampling',
      description: 'Sampling plans and OC curves — making accept/reject decisions efficiently',
      duration: '20-25 min',
      difficulty: 'Intermediate',
      component: Lesson06_AcceptanceSampling,
      available: true,
      concepts: ['Single Sampling', 'Double Sampling', 'OC Curves', 'AQL', 'LTPD', 'Producer/Consumer Risk']
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
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#d32f2f' }}>
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
            <SchoolIcon sx={{ fontSize: 48, color: '#d32f2f', mr: 2 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                Learn Statistical Quality Control
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Master SPC, control charts, and process improvement — from fundamentals to advanced techniques
              </Typography>
            </Box>
          </Box>

          <Typography variant="body1" paragraph sx={{ mt: 2, maxWidth: '800px' }}>
            Learn the proven methods used by Toyota, Motorola, and GE to achieve world-class quality.
            Master <strong>control charts</strong>, <strong>process capability</strong>, and{' '}
            <strong>measurement system analysis</strong> through interactive visualizations and real-world examples.
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
                          color="error"
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
        <Paper sx={{ p: 3, mt: 4, bgcolor: '#ffebee' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f' }}>
            Why Learn Statistical Quality Control?
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Manufacturing Excellence:</strong> Reduce defects and improve process stability
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Six Sigma Certification:</strong> Core knowledge for Green Belt and Black Belt
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Cost Reduction:</strong> Prevent defects rather than detect them
          </Typography>
          <Typography variant="body2">
            • <strong>Industry Standard:</strong> Used in automotive, aerospace, pharma, and healthcare
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default SQCEducationHub;
