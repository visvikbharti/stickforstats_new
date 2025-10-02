/**
 * GuidedNavigation Component
 * 
 * Simple, functional workflow navigation interface.
 * Focuses on usability and getting to deployment quickly.
 * 
 * @author Vishal Bharti
 * @date 2025-08-26
 * @version 1.0.0 (MVP)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Chip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Collapse,
  Grid
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  PlayArrow as StartIcon,
  RestartAlt as RestartIcon,
  Save as SaveIcon,
  TipsAndUpdates as TipIcon,
  AssignmentTurnedIn as TaskIcon
} from '@mui/icons-material';
import { useWorkflowNavigation } from '../../hooks/useWorkflowNavigation';

// Step configuration - keeping it simple
const STEP_CONFIG = {
  data_upload: {
    label: 'Upload Data',
    description: 'Upload your dataset for analysis',
    icon: '📊'
  },
  data_profiling: {
    label: 'Data Profiling',
    description: 'Analyzing your data characteristics',
    icon: '🔍'
  },
  assumption_check: {
    label: 'Check Assumptions',
    description: 'Validating statistical assumptions',
    icon: '✓'
  },
  test_selection: {
    label: 'Select Test',
    description: 'Choose appropriate statistical test',
    icon: '🎯'
  },
  test_execution: {
    label: 'Run Analysis',
    description: 'Executing statistical analysis',
    icon: '⚡'
  },
  result_interpretation: {
    label: 'Interpret Results',
    description: 'Understanding your results',
    icon: '📈'
  },
  report_generation: {
    label: 'Generate Report',
    description: 'Creating your analysis report',
    icon: '📄'
  }
};

const GuidedNavigation = ({ workflowId, onComplete, initialData = null }) => {
  // Use our custom hook
  const {
    navigationState,
    context,
    recommendations,
    navigateToStep,
    goBack,
    resetNavigation,
    updateContext,
    getProgress,
    saveState
  } = useWorkflowNavigation(workflowId);

  // Local state
  const [showHelp, setShowHelp] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  // Get progress info
  const progress = getProgress();

  // Auto-save handler
  const handleAutoSave = async () => {
    setAutoSaveStatus('saving');
    const stateId = await saveState();
    if (stateId) {
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } else {
      setAutoSaveStatus('error');
    }
  };

  // Handle step navigation
  const handleNext = async () => {
    if (navigationState.nextStep) {
      await navigateToStep(navigationState.nextStep);
    }
  };

  const handleStepClick = async (stepId) => {
    // Only allow navigation to completed steps or next step
    if (navigationState.completedSteps.includes(stepId) || stepId === navigationState.nextStep) {
      await navigateToStep(stepId);
    }
  };

  // Effect to update context with initial data
  useEffect(() => {
    if (initialData) {
      updateContext({ data: initialData });
    }
  }, [initialData]);

  // Effect to check completion
  useEffect(() => {
    if (progress.isComplete && onComplete) {
      onComplete();
    }
  }, [progress.isComplete]);

  // Render loading state
  if (navigationState.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (navigationState.error) {
    return (
      <Alert severity="error">
        <AlertTitle>Navigation Error</AlertTitle>
        {navigationState.error}
        <Button onClick={resetNavigation} startIcon={<RestartIcon />} sx={{ mt: 2 }}>
          Restart Workflow
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Progress */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>
              Guided Statistical Analysis
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Follow the steps below to complete your analysis
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box textAlign="right">
              <Typography variant="h6" color="primary">
                {progress.percentage}% Complete
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {progress.completedSteps} of {progress.totalSteps} steps
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleAutoSave}
            disabled={autoSaveStatus === 'saving'}
          >
            {autoSaveStatus === 'saving' ? 'Saving...' : 
             autoSaveStatus === 'saved' ? 'Saved!' : 'Save Progress'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RestartIcon />}
            onClick={resetNavigation}
          >
            Start Over
          </Button>
          <Tooltip title="Show Help">
            <IconButton onClick={() => setShowHelp(!showHelp)}>
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Navigation Area */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Workflow Steps
            </Typography>

            {/* Stepper - Simple vertical stepper */}
            <Stepper
              activeStep={Object.keys(STEP_CONFIG).indexOf(navigationState.currentStep)}
              orientation="vertical"
            >
              {Object.entries(STEP_CONFIG).map(([stepId, config], index) => {
                const isCompleted = navigationState.completedSteps.includes(stepId);
                const isCurrent = navigationState.currentStep === stepId;
                const isClickable = isCompleted || stepId === navigationState.nextStep;

                return (
                  <Step key={stepId} completed={isCompleted}>
                    <StepLabel
                      optional={
                        isCurrent && (
                          <Typography variant="caption" color="primary">
                            Current Step
                          </Typography>
                        )
                      }
                      sx={{ cursor: isClickable ? 'pointer' : 'default' }}
                      onClick={() => isClickable && handleStepClick(stepId)}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{config.icon}</span>
                        <Typography>
                          {config.label}
                        </Typography>
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="textSecondary">
                        {config.description}
                      </Typography>
                      {isCurrent && (
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="contained"
                            onClick={handleNext}
                            startIcon={<NextIcon />}
                            disabled={!navigationState.nextStep}
                          >
                            Continue
                          </Button>
                          <Button
                            onClick={goBack}
                            disabled={navigationState.previousSteps.length === 0}
                            startIcon={<BackIcon />}
                            sx={{ ml: 1 }}
                          >
                            Back
                          </Button>
                        </Box>
                      )}
                    </StepContent>
                  </Step>
                );
              })}
            </Stepper>

            {/* Completion Message */}
            {progress.isComplete && (
              <Alert severity="success" sx={{ mt: 3 }}>
                <AlertTitle>Analysis Complete!</AlertTitle>
                All steps have been completed. You can now download your report.
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Recommendations Panel */}
        <Grid item xs={12} md={4}>
          {/* Recommendations */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TipIcon color="primary" />
                <Typography variant="h6">Recommendations</Typography>
              </Box>

              {recommendations.length > 0 ? (
                <List dense>
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {rec.priority === 'high' ? (
                          <WarningIcon color="warning" />
                        ) : (
                          <InfoIcon color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={rec.message}
                        secondary={rec.rationale}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No recommendations at this time
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Current Context Summary */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TaskIcon color="primary" />
                <Typography variant="h6">Analysis Context</Typography>
              </Box>

              {context.data ? (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Data:</strong> {context.data.shape?.[0] || 0} rows, {context.data.shape?.[1] || 0} columns
                  </Typography>
                  {context.parameters.statistical && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" gutterBottom>
                        <strong>Parameters:</strong>
                      </Typography>
                      {Object.entries(context.parameters.statistical).map(([key, value]) => (
                        <Chip
                          key={key}
                          label={`${key}: ${value}`}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No data uploaded yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Help Section - Collapsible */}
      <Collapse in={showHelp}>
        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>How to Use Guided Navigation</AlertTitle>
          <List dense>
            <ListItem>• Follow the steps in order for best results</ListItem>
            <ListItem>• Click on completed steps to review</ListItem>
            <ListItem>• Save your progress regularly</ListItem>
            <ListItem>• Check recommendations for helpful tips</ListItem>
            <ListItem>• Your context is preserved throughout the workflow</ListItem>
          </List>
        </Alert>
      </Collapse>
    </Box>
  );
};

export default GuidedNavigation;