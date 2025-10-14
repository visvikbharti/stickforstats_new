/**
 * Statistical Analysis Hub
 *
 * Main entry point for comprehensive statistical analysis tools.
 * Provides 6 modules:
 * 1. Data Profiling - Dataset overview and column analysis
 * 2. Data Preprocessing - Missing values, scaling, encoding
 * 3. Visualization Suite - 5 types of analysis visualizations
 * 4. Statistical Tests - Normality, parametric, non-parametric, correlation, categorical tests
 * 5. Advanced Statistics - ANOVA variants, MANOVA, post-hoc tests
 * 6. Machine Learning - Regression, classification, clustering
 *
 * Ported from Python/Streamlit app to React/Material-UI
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
  LinearProgress,
  Alert,
  Button
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScienceIcon from '@mui/icons-material/Science';
import TimelineIcon from '@mui/icons-material/Timeline';
import PsychologyIcon from '@mui/icons-material/Psychology';

// Import module components
import DataProfiling from './data-profiling/DataProfiling';
import DataPreprocessing from './preprocessing/DataPreprocessing';
import VisualizationSuite from './visualizations/VisualizationSuite';
import StatisticalTests from './statistical-tests/StatisticalTests';
import AdvancedStatistics from './advanced-stats/AdvancedStatistics';
import MachineLearning from './machine-learning/MachineLearning';

/**
 * Main Statistical Analysis Hub Component
 *
 * Architecture:
 * - Module selection interface (inspired by educational hubs)
 * - Each module is a separate component
 * - Shared data state passed between modules
 * - Progress tracking for completed analyses
 */
const StatisticalAnalysisHub = () => {
  const [currentModule, setCurrentModule] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const [completedModules, setCompletedModules] = useState(new Set());

  /**
   * Module definitions
   * Each module represents a major analysis capability
   */
  const modules = [
    {
      id: 1,
      title: 'Data Profiling',
      description: 'Comprehensive dataset overview with column-by-column analysis and distributions',
      duration: '5-10 min',
      complexity: 'Beginner',
      icon: AssessmentIcon,
      component: DataProfiling,
      available: true,
      features: ['Dataset Info', 'Column Analysis', 'Missing Values', 'Distributions']
    },
    {
      id: 2,
      title: 'Data Preprocessing',
      description: 'Clean and prepare data: handle missing values, scale features, encode categoricals',
      duration: '10-15 min',
      complexity: 'Beginner',
      icon: CleaningServicesIcon,
      component: DataPreprocessing,
      available: true,
      features: ['Missing Values', 'Feature Scaling', 'Categorical Encoding', 'Data Export']
    },
    {
      id: 3,
      title: 'Visualization Suite',
      description: 'Create interactive visualizations: distributions, relationships, comparisons, time series',
      duration: '15-20 min',
      complexity: 'Intermediate',
      icon: BarChartIcon,
      component: VisualizationSuite,
      available: true,
      features: ['Distribution Analysis', 'Relationship Analysis', 'Comparative Analysis', 'Time Series', 'Composition']
    },
    {
      id: 4,
      title: 'Statistical Tests',
      description: 'Comprehensive hypothesis testing: normality, t-tests, ANOVA, correlation, chi-square',
      duration: '15-25 min',
      complexity: 'Intermediate',
      icon: ScienceIcon,
      component: StatisticalTests,
      available: true,
      features: ['Normality Tests', 'Parametric Tests', 'Non-parametric Tests', 'Correlation', 'Categorical Tests']
    },
    {
      id: 5,
      title: 'Advanced Statistics',
      description: 'Advanced analysis: two-way ANOVA, MANOVA, repeated measures, post-hoc tests',
      duration: '20-30 min',
      complexity: 'Advanced',
      icon: TimelineIcon,
      component: AdvancedStatistics,
      available: true,
      features: ['Two-way ANOVA', 'MANOVA', 'Repeated Measures', 'Post-hoc Tests', 'Effect Sizes']
    },
    {
      id: 6,
      title: 'Machine Learning',
      description: 'Train and evaluate ML models: regression, classification, clustering with metrics',
      duration: '20-30 min',
      complexity: 'Advanced',
      icon: PsychologyIcon,
      component: MachineLearning,
      available: true,
      features: ['Linear Regression', 'Classification', 'Clustering', 'Model Evaluation', 'Feature Importance']
    }
  ];

  /**
   * Handle module selection
   */
  const handleModuleClick = (module) => {
    if (module.available && module.component) {
      setCurrentModule(module.id);
    }
  };

  /**
   * Return to module selection
   */
  const handleBackToHub = () => {
    setCurrentModule(null);
  };

  /**
   * Mark module as completed
   */
  const handleCompleteModule = (moduleId) => {
    setCompletedModules(new Set([...completedModules, moduleId]));
    setCurrentModule(null);
  };

  /**
   * Calculate progress percentage
   */
  const progressPercentage = (completedModules.size / modules.length) * 100;

  /**
   * Render selected module
   */
  if (currentModule) {
    const module = modules.find(m => m.id === currentModule);
    const ModuleComponent = module.component;

    return (
      <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh' }}>
        {/* Module Header */}
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', py: 2 }}>
          <Container>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToHub}
              sx={{ mb: 1 }}
            >
              Back to Module Selection
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
              {module.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {module.description}
            </Typography>
          </Container>
        </Box>

        {/* Module Content */}
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {ModuleComponent ? (
            <ModuleComponent
              data={uploadedData}
              setData={setUploadedData}
              onComplete={() => handleCompleteModule(module.id)}
            />
          ) : (
            <Alert severity="info">
              This module is under development. Coming soon!
            </Alert>
          )}
        </Container>
      </Box>
    );
  }

  /**
   * Render module selection hub
   */
  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssessmentIcon sx={{ fontSize: 48, color: '#1976d2', mr: 2 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                Statistical Analysis Platform
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Comprehensive data analysis, testing, and machine learning tools
              </Typography>
            </Box>
          </Box>

          <Typography variant="body1" paragraph sx={{ mt: 2, maxWidth: '800px' }}>
            Welcome to the Statistical Analysis Platform! This comprehensive suite provides
            <strong> professional-grade statistical tools</strong> for data profiling, preprocessing,
            visualization, hypothesis testing, and machine learning—all running directly in your browser.
          </Typography>

          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Getting Started:</strong> Begin with Data Profiling to understand your dataset,
              then proceed through preprocessing, visualization, and statistical tests. Each module
              builds upon the previous ones to provide a complete analysis workflow.
            </Typography>
          </Alert>

          {/* Progress Tracker */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Analysis Progress: {completedModules.size} / {modules.length} modules
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

        {/* Modules Grid */}
        <Grid container spacing={3}>
          {modules.map((module) => {
            const isCompleted = completedModules.has(module.id);
            const isLocked = !module.available;
            const isUnderDevelopment = !module.component;
            const IconComponent = module.icon;

            return (
              <Grid item xs={12} md={6} key={module.id}>
                <Card
                  elevation={isLocked || isUnderDevelopment ? 1 : 3}
                  sx={{
                    height: '100%',
                    opacity: isLocked || isUnderDevelopment ? 0.6 : 1,
                    position: 'relative',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: (isLocked || isUnderDevelopment) ? 'none' : 'translateY(-4px)',
                      boxShadow: (isLocked || isUnderDevelopment) ? undefined : 6
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => handleModuleClick(module)}
                    disabled={isLocked || isUnderDevelopment}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      {/* Module Icon and Status */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconComponent sx={{ fontSize: 32, color: '#1976d2' }} />
                          <Chip
                            label={`Module ${module.id}`}
                            color="primary"
                            size="small"
                          />
                        </Box>
                        {isCompleted && (
                          <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 28 }} />
                        )}
                        {isLocked && (
                          <LockIcon sx={{ color: '#999', fontSize: 28 }} />
                        )}
                        {isUnderDevelopment && (
                          <Chip label="In Development" size="small" color="warning" />
                        )}
                      </Box>

                      {/* Module Title */}
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        {module.title}
                      </Typography>

                      {/* Module Description */}
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {module.description}
                      </Typography>

                      {/* Meta Info */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label={module.duration}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={module.complexity}
                          size="small"
                          variant="outlined"
                          color={
                            module.complexity === 'Beginner' ? 'success' :
                              module.complexity === 'Intermediate' ? 'warning' : 'error'
                          }
                        />
                      </Box>

                      {/* Features Covered */}
                      {module.features && (
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                            Features:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {module.features.map((feature, idx) => (
                              <Chip
                                key={idx}
                                label={feature}
                                size="small"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Status Messages */}
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
                          This module is locked. Complete previous modules to unlock.
                        </Typography>
                      )}
                      {isUnderDevelopment && !isLocked && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 2,
                            color: '#ed6c02',
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

        {/* Footer Info */}
        <Paper sx={{ p: 3, mt: 4, bgcolor: '#e3f2fd' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
            Why Use Statistical Analysis Platform?
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Comprehensive Toolkit:</strong> Everything from basic descriptive statistics to advanced machine learning
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>No Server Required:</strong> All calculations run in your browser for speed and privacy
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Interactive Visualizations:</strong> Explore your data with responsive charts and plots
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Educational:</strong> Learn statistical concepts with guided workflows and interpretations
          </Typography>
          <Typography variant="body2">
            • <strong>Export Results:</strong> Download your analyses, processed data, and visualizations
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default StatisticalAnalysisHub;
