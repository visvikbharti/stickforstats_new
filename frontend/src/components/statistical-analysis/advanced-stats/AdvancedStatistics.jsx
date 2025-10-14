/**
 * Advanced Statistics Module
 *
 * Comprehensive advanced statistical analysis tools:
 * - Two-way ANOVA (factorial designs with interactions)
 * - MANOVA (multivariate analysis of variance)
 * - Repeated Measures ANOVA (within-subjects designs)
 * - Post-hoc Tests (Tukey HSD, Bonferroni, Scheffé)
 * - Effect Sizes and Power Analysis
 */

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
  Button,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimelineIcon from '@mui/icons-material/Timeline';
import GridOnIcon from '@mui/icons-material/GridOn';
import CompareIcon from '@mui/icons-material/Compare';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import CalculateIcon from '@mui/icons-material/Calculate';

// Import test components
import TwoWayANOVA from './TwoWayANOVA';
import PostHocTests from './PostHocTests';
// import MANOVA from './MANOVA';
// import RepeatedMeasuresANOVA from './RepeatedMeasuresANOVA';
// import EffectSizeAnalysis from './EffectSizeAnalysis';

/**
 * Main Advanced Statistics Component
 *
 * Hub for selecting and running advanced statistical analyses
 */
const AdvancedStatistics = ({ data, setData, onComplete }) => {
  const [currentTest, setCurrentTest] = useState(null);

  /**
   * Test category definitions
   */
  const testCategories = [
    {
      id: 'two-way-anova',
      name: 'Two-way ANOVA',
      description: 'Analyze effects of two categorical factors and their interaction on a continuous outcome',
      icon: GridOnIcon,
      component: TwoWayANOVA,
      available: true,
      difficulty: 'Advanced',
      concepts: ['Main Effects', 'Interaction Effects', 'Factorial Design', 'Post-hoc Tests']
    },
    {
      id: 'manova',
      name: 'MANOVA',
      description: 'Multivariate analysis of variance for multiple dependent variables simultaneously',
      icon: CompareIcon,
      component: null, // MANOVA,
      available: true,
      difficulty: 'Advanced',
      concepts: ['Multivariate', "Wilks' Lambda", "Pillai's Trace", 'Roy\'s Root']
    },
    {
      id: 'repeated-measures',
      name: 'Repeated Measures ANOVA',
      description: 'Within-subjects design analysis for measurements taken at multiple time points',
      icon: AutoGraphIcon,
      component: null, // RepeatedMeasuresANOVA,
      available: true,
      difficulty: 'Advanced',
      concepts: ['Within-Subjects', 'Sphericity', 'Greenhouse-Geisser', 'Mauchly\'s Test']
    },
    {
      id: 'post-hoc',
      name: 'Post-hoc Tests',
      description: 'Multiple comparison procedures: Tukey HSD, Bonferroni, Scheffé, Fisher LSD',
      icon: CalculateIcon,
      component: PostHocTests,
      available: true,
      difficulty: 'Intermediate',
      concepts: ['Multiple Comparisons', 'Family-wise Error', 'Tukey HSD', 'Bonferroni']
    },
    {
      id: 'effect-size',
      name: 'Effect Size & Power',
      description: 'Calculate effect sizes (η², ω², Cohen\'s d) and statistical power analysis',
      icon: TimelineIcon,
      component: null, // EffectSizeAnalysis,
      available: true,
      difficulty: 'Intermediate',
      concepts: ['Effect Size', 'Statistical Power', 'Sample Size', 'Cohen\'s d', 'η²']
    }
  ];

  /**
   * Handle test selection
   */
  const handleTestClick = (test) => {
    if (test.available && test.component) {
      setCurrentTest(test.id);
    }
  };

  /**
   * Return to test selection
   */
  const handleBackToSelection = () => {
    setCurrentTest(null);
  };

  /**
   * Render selected test component
   */
  if (currentTest) {
    const test = testCategories.find(t => t.id === currentTest);
    const TestComponent = test.component;

    return (
      <Box>
        {/* Test Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToSelection}
            sx={{ mb: 2 }}
          >
            Back to Test Selection
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <test.icon sx={{ fontSize: 40, color: '#1976d2' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
                {test.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {test.description}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Test Component */}
        {TestComponent ? (
          <TestComponent data={data} />
        ) : (
          <Alert severity="info">
            <Typography variant="body1">
              This test is under development. Coming soon!
            </Typography>
          </Alert>
        )}
      </Box>
    );
  }

  /**
   * Render test selection interface
   */
  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TimelineIcon sx={{ fontSize: 40, color: '#1976d2' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
              Advanced Statistical Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sophisticated statistical methods for complex experimental designs and multivariate data
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Prerequisites:</strong> These tests require understanding of basic hypothesis testing,
            ANOVA, and experimental design. Ensure your data meets the assumptions for each test.
          </Typography>
        </Alert>
      </Paper>

      {/* Test Categories Grid */}
      <Grid container spacing={3}>
        {testCategories.map((test) => {
          const IconComponent = test.icon;
          const isUnderDevelopment = !test.component;

          return (
            <Grid item xs={12} md={6} key={test.id}>
              <Card
                elevation={isUnderDevelopment ? 1 : 3}
                sx={{
                  height: '100%',
                  opacity: isUnderDevelopment ? 0.6 : 1,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: isUnderDevelopment ? 'none' : 'translateY(-4px)',
                    boxShadow: isUnderDevelopment ? undefined : 6
                  }
                }}
              >
                <CardActionArea
                  onClick={() => handleTestClick(test)}
                  disabled={isUnderDevelopment}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    {/* Test Icon and Difficulty */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <IconComponent sx={{ fontSize: 36, color: '#1976d2' }} />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={test.difficulty}
                          size="small"
                          color={test.difficulty === 'Intermediate' ? 'warning' : 'error'}
                        />
                        {isUnderDevelopment && (
                          <Chip label="Coming Soon" size="small" color="default" />
                        )}
                      </Box>
                    </Box>

                    {/* Test Name */}
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {test.name}
                    </Typography>

                    {/* Test Description */}
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {test.description}
                    </Typography>

                    {/* Key Concepts */}
                    {test.concepts && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                          Key Concepts:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {test.concepts.map((concept, idx) => (
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

                    {/* Status Message */}
                    {isUnderDevelopment && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 2,
                          color: '#666',
                          fontStyle: 'italic'
                        }}
                      >
                        Under active development. Check back soon!
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Help Section */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: '#e3f2fd' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
          When to Use Advanced Statistics?
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Two-way ANOVA:</strong> When you have two categorical independent variables and want to test their interaction
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>MANOVA:</strong> When you have multiple related dependent variables to analyze simultaneously
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Repeated Measures:</strong> When the same subjects are measured multiple times (within-subjects design)
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Post-hoc Tests:</strong> After finding significant ANOVA results, to identify which groups differ
        </Typography>
        <Typography variant="body2">
          • <strong>Effect Size:</strong> To quantify the magnitude of differences and assess practical significance
        </Typography>
      </Paper>
    </Box>
  );
};

export default AdvancedStatistics;
