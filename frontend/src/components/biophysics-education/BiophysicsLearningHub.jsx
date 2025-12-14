/**
 * BiophysicsLearningHub - Educational Module for Biophysics Analysis
 *
 * Comprehensive educational content covering:
 * - Enzyme kinetics fundamentals
 * - Michaelis-Menten equation derivation
 * - Linear transformation methods
 * - Enzyme inhibition
 * - Binding equilibria
 * - Dose-response analysis
 * - Thermal stability
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Button,
  LinearProgress,
  Alert,
  Divider
} from '@mui/material';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScienceIcon from '@mui/icons-material/Science';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import FunctionsIcon from '@mui/icons-material/Functions';
import TimelineIcon from '@mui/icons-material/Timeline';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import SchoolIcon from '@mui/icons-material/School';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';

// Lesson Components
import Lesson1_EnzymeKineticsIntro from './lessons/Lesson1_EnzymeKineticsIntro';
import Lesson2_MichaelisMentenDerivation from './lessons/Lesson2_MichaelisMentenDerivation';
import Lesson3_LinearTransformations from './lessons/Lesson3_LinearTransformations';
import Lesson4_EnzymeInhibition from './lessons/Lesson4_EnzymeInhibition';
import Lesson5_Cooperativity from './lessons/Lesson5_Cooperativity';
import Lesson6_BindingEquilibria from './lessons/Lesson6_BindingEquilibria';
import Lesson7_DoseResponse from './lessons/Lesson7_DoseResponse';
import Lesson8_CircularDichroism from './lessons/Lesson8_CircularDichroism';
import Lesson9_ThermalStability from './lessons/Lesson9_ThermalStability';

// ============================================================================
// LESSON DEFINITIONS
// ============================================================================

const LESSONS = [
  {
    id: 1,
    title: 'Introduction to Enzyme Kinetics',
    description: 'Fundamentals of enzyme catalysis, reaction rates, and why kinetics matter in biochemistry',
    duration: '20-25 min',
    complexity: 'Beginner',
    icon: BiotechIcon,
    component: Lesson1_EnzymeKineticsIntro,
    topics: ['Enzymes as Catalysts', 'Reaction Rates', 'Substrate-Enzyme Interactions', 'Steady-State Assumption'],
    available: true
  },
  {
    id: 2,
    title: 'Michaelis-Menten Equation Derivation',
    description: 'Step-by-step derivation of the MM equation with mathematical rigor and biological interpretation',
    duration: '25-30 min',
    complexity: 'Intermediate',
    icon: FunctionsIcon,
    component: Lesson2_MichaelisMentenDerivation,
    topics: ['Steady-State Kinetics', 'Mathematical Derivation', 'Vmax and Km', 'Physical Meaning'],
    available: true
  },
  {
    id: 3,
    title: 'Linear Transformation Methods',
    description: 'Lineweaver-Burk, Eadie-Hofstee, and Hanes-Woolf plots: history, application, and limitations',
    duration: '25 min',
    complexity: 'Intermediate',
    icon: ShowChartIcon,
    component: Lesson3_LinearTransformations,
    topics: ['Double Reciprocal Plots', 'Error Propagation', 'Why Non-Linear is Better'],
    available: true
  },
  {
    id: 4,
    title: 'Enzyme Inhibition',
    description: 'Competitive, non-competitive, uncompetitive, and mixed inhibition: mechanisms and analysis',
    duration: '30 min',
    complexity: 'Intermediate',
    icon: ScienceIcon,
    component: Lesson4_EnzymeInhibition,
    topics: ['Inhibition Types', 'Ki Determination', 'Diagnostic Plots', 'Drug Discovery'],
    available: true
  },
  {
    id: 5,
    title: 'Cooperativity and the Hill Equation',
    description: 'Understanding cooperative binding, allosteric effects, and sigmoidal kinetics',
    duration: '30 min',
    complexity: 'Advanced',
    icon: TimelineIcon,
    component: Lesson5_Cooperativity,
    topics: ['Hill Coefficient', 'Positive/Negative Cooperativity', 'Allosteric Enzymes', 'Hemoglobin Example'],
    available: true
  },
  {
    id: 6,
    title: 'Binding Equilibria Fundamentals',
    description: 'Understanding Kd, Ka, and the thermodynamics of ligand-receptor interactions',
    duration: '25 min',
    complexity: 'Intermediate',
    icon: ShowChartIcon,
    component: Lesson6_BindingEquilibria,
    topics: ['Dissociation Constants', 'Binding Isotherms', 'Scatchard Analysis', 'Thermodynamics'],
    available: true
  },
  {
    id: 7,
    title: 'Dose-Response Analysis',
    description: 'IC50, EC50, Hill slope: understanding potency and efficacy in pharmacology',
    duration: '30 min',
    complexity: 'Intermediate',
    icon: TimelineIcon,
    component: Lesson7_DoseResponse,
    topics: ['4-Parameter Logistic', 'Potency vs Efficacy', 'Cheng-Prusoff Equation', 'Drug Screening'],
    available: true
  },
  {
    id: 8,
    title: 'Circular Dichroism Spectroscopy',
    description: 'Principles of CD, secondary structure estimation, and protein folding studies',
    duration: '25 min',
    complexity: 'Advanced',
    icon: ScienceIcon,
    component: Lesson8_CircularDichroism,
    topics: ['CD Principles', 'Secondary Structure', 'Thermal Denaturation', 'Data Analysis'],
    available: true
  },
  {
    id: 9,
    title: 'Thermal Stability Analysis',
    description: 'Protein melting curves, Tm determination, and thermodynamic parameters',
    duration: '30 min',
    complexity: 'Advanced',
    icon: ThermostatIcon,
    component: Lesson9_ThermalStability,
    topics: ['Two-State Model', 'Van\'t Hoff Analysis', 'ΔH and ΔG', 'Protein Engineering'],
    available: true
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BiophysicsLearningHub = () => {
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  const handleLessonClick = (lesson) => {
    if (lesson.available && lesson.component) {
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

  const progressPercentage = (completedLessons.size / LESSONS.length) * 100;

  // Render active lesson
  if (currentLesson) {
    const lesson = LESSONS.find(l => l.id === currentLesson);
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
              Back to Learning Hub
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
              Lesson {lesson.id}: {lesson.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {lesson.description}
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 3 }}>
          {LessonComponent && (
            <LessonComponent onComplete={() => handleCompleteLesson(lesson.id)} />
          )}
        </Container>
      </Box>
    );
  }

  // Render hub
  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            mb: 4,
            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BiotechIcon sx={{ fontSize: 56, mr: 2 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                Biophysics Learning Hub
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Master enzyme kinetics, binding analysis, and biophysical methods
              </Typography>
            </Box>
          </Box>

          <Typography variant="body1" paragraph sx={{ maxWidth: '800px', mt: 2 }}>
            This comprehensive educational module covers the theoretical foundations and practical applications
            of biophysics analysis. From basic enzyme kinetics to advanced binding studies, each lesson includes
            <strong> mathematical derivations, interactive simulations, and real-world examples</strong>.
          </Typography>

          {/* Progress */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Progress: {completedLessons.size} / {LESSONS.length} lessons completed
              </Typography>
              <Typography variant="body2">
                {progressPercentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' }
              }}
            />
          </Box>

          {/* Feature Chips */}
          <Box sx={{ display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap' }}>
            <Chip label="9 Comprehensive Lessons" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            <Chip label="Mathematical Rigor" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            <Chip label="Interactive Simulations" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            <Chip label="Real-World Examples" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          </Box>
        </Paper>

        {/* Learning Path Info */}
        <Alert severity="info" sx={{ mb: 4 }} icon={<SchoolIcon />}>
          <Typography variant="body2">
            <strong>Recommended Learning Path:</strong> Start with Lesson 1 (Introduction to Enzyme Kinetics)
            to build foundational knowledge. Lessons build upon each other, progressing from basic concepts
            to advanced analysis techniques. Each lesson includes interactive examples and practice problems.
          </Typography>
        </Alert>

        {/* Lesson Grid */}
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', mb: 3 }}>
          Available Lessons
        </Typography>

        <Grid container spacing={3}>
          {LESSONS.map((lesson) => {
            const isCompleted = completedLessons.has(lesson.id);
            const isLocked = !lesson.available;
            const IconComponent = lesson.icon;

            return (
              <Grid item xs={12} md={6} key={lesson.id}>
                <Card
                  elevation={isLocked ? 1 : 3}
                  sx={{
                    height: '100%',
                    opacity: isLocked ? 0.7 : 1,
                    transition: 'all 0.3s',
                    border: isCompleted ? '2px solid #4caf50' : 'none',
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconComponent sx={{ fontSize: 32, color: '#1976d2' }} />
                          <Chip label={`Lesson ${lesson.id}`} color="primary" size="small" />
                        </Box>
                        {isCompleted && <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 28 }} />}
                        {!lesson.available && <Chip label="Coming Soon" size="small" color="warning" />}
                      </Box>

                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        {lesson.title}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" paragraph>
                        {lesson.description}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip label={lesson.duration} size="small" variant="outlined" />
                        <Chip
                          label={lesson.complexity}
                          size="small"
                          variant="outlined"
                          color={
                            lesson.complexity === 'Beginner' ? 'success' :
                            lesson.complexity === 'Intermediate' ? 'warning' : 'error'
                          }
                        />
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                        Topics Covered:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {lesson.topics.map((topic, idx) => (
                          <Chip key={idx} label={topic} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                        ))}
                      </Box>

                      {lesson.available && lesson.component && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PlayCircleIcon />}
                          sx={{ mt: 2 }}
                          fullWidth
                        >
                          {isCompleted ? 'Review Lesson' : 'Start Lesson'}
                        </Button>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Reference Section */}
        <Paper sx={{ p: 3, mt: 4, bgcolor: '#e8f5e9' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
            Key References
          </Typography>
          <Typography variant="body2" paragraph>
            • Cornish-Bowden, A. (2012). <em>Fundamentals of Enzyme Kinetics</em>. Wiley-Blackwell.
          </Typography>
          <Typography variant="body2" paragraph>
            • Copeland, R.A. (2000). <em>Enzymes: A Practical Introduction to Structure, Mechanism, and Data Analysis</em>. Wiley-VCH.
          </Typography>
          <Typography variant="body2" paragraph>
            • Segel, I.H. (1975). <em>Enzyme Kinetics</em>. Wiley-Interscience.
          </Typography>
          <Typography variant="body2">
            • Hulme, E.C. & Trevethick, M.A. (2010). Ligand binding assays at equilibrium. <em>Br J Pharmacol</em>.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default BiophysicsLearningHub;
