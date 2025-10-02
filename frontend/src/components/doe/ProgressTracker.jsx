import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  LinearProgress,
  Paper,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

const ProgressTracker = ({
  steps = [],
  currentStep = 0,
  orientation = 'vertical',
  showDetails = true,
  showMetrics = true,
  compact = false,
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const [expandedSteps, setExpandedSteps] = React.useState({});

  // Calculate overall progress
  const calculateProgress = () => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  // Get step icon based on status
  const getStepIcon = (step, index) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'active':
        return <SpeedIcon color="primary" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  // Get step color based on status
  const getStepColor = (step) => {
    switch (step.status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'active':
        return 'primary';
      default:
        return 'default';
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const toggleStepExpansion = (stepIndex) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex],
    }));
  };

  if (compact) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2">
            Progress: Step {currentStep + 1} of {steps.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(calculateProgress())}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={calculateProgress()}
          sx={{ height: 8, borderRadius: 4 }}
        />
        {steps[currentStep] && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Current: {steps[currentStep].label}
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          DOE Analysis Progress
        </Typography>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {showMetrics && (
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(calculateProgress())}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={calculateProgress()}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                backgroundColor: calculateProgress() === 100 ? 'success.main' : 'primary.main',
              },
            }}
          />
        </Box>
      )}

      <Collapse in={expanded}>
        <Stepper
          activeStep={currentStep}
          orientation={orientation}
          sx={{ mt: 2 }}
        >
          {steps.map((step, index) => (
            <Step key={step.id || index} completed={step.status === 'completed'}>
              <StepLabel
                StepIconComponent={() => getStepIcon(step, index)}
                error={step.status === 'error'}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2">
                    {step.label}
                  </Typography>
                  {step.status === 'active' && (
                    <CircularProgress size={16} thickness={4} />
                  )}
                  <Chip
                    label={step.status}
                    size="small"
                    color={getStepColor(step)}
                    variant="outlined"
                  />
                </Box>
              </StepLabel>
              {showDetails && (
                <StepContent>
                  {step.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {step.description}
                    </Typography>
                  )}
                  
                  {step.progress !== undefined && step.status === 'active' && (
                    <Box mb={2}>
                      <LinearProgress
                        variant="determinate"
                        value={step.progress}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {step.progress}% complete
                      </Typography>
                    </Box>
                  )}

                  {step.metrics && (
                    <Box display="flex" gap={2} mb={1}>
                      {step.metrics.duration && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <TimerIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            {formatDuration(step.metrics.duration)}
                          </Typography>
                        </Box>
                      )}
                      {step.metrics.itemsProcessed && (
                        <Typography variant="caption">
                          {step.metrics.itemsProcessed} items processed
                        </Typography>
                      )}
                    </Box>
                  )}

                  {step.substeps && step.substeps.length > 0 && (
                    <Box>
                      <Box
                        display="flex"
                        alignItems="center"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => toggleStepExpansion(index)}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Substeps ({step.substeps.filter(s => s.completed).length}/{step.substeps.length})
                        </Typography>
                        <IconButton size="small">
                          {expandedSteps[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Box>
                      <Collapse in={expandedSteps[index]}>
                        <List dense>
                          {step.substeps.map((substep, subIndex) => (
                            <ListItem key={subIndex}>
                              <ListItemIcon>
                                {substep.completed ? (
                                  <CheckCircleIcon fontSize="small" color="success" />
                                ) : (
                                  <PendingIcon fontSize="small" color="disabled" />
                                )}
                              </ListItemIcon>
                              <ListItemText
                                primary={substep.label}
                                primaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Collapse>
                    </Box>
                  )}

                  {step.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {step.error}
                    </Alert>
                  )}

                  {step.warning && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      {step.warning}
                    </Alert>
                  )}
                </StepContent>
              )}
            </Step>
          ))}
        </Stepper>

        {steps.length > 0 && steps.every(step => step.status === 'completed') && (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
            icon={<CheckCircleIcon />}
          >
            All steps completed successfully!
          </Alert>
        )}
      </Collapse>
    </Paper>
  );
};

export default ProgressTracker;