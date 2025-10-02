import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Button,
  Chip,
  Divider,
  useTheme
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import { usePcaProgress } from '../../hooks/usePcaProgress';

// Helper to format estimated time remaining
const formatTime = (seconds) => {
  if (!seconds || seconds < 0) return 'Calculating...';
  
  if (seconds < 60) {
    return `${Math.ceil(seconds)} seconds`;
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)} minutes`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
};

/**
 * Component for tracking and displaying real-time PCA analysis progress
 */
const PcaProgressTracker = ({ 
  projectId, 
  analysisId, 
  onComplete, 
  onCancel, 
  onError, 
  enabled = true 
}) => {
  const theme = useTheme();
  
  // PCA analysis steps (these should match the backend steps)
  const steps = [
    'Data preprocessing',
    'Standardizing data',
    'Computing correlation matrix',
    'Eigenvalue decomposition',
    'Computing principal components',
    'Analyzing variance',
    'Processing results'
  ];
  
  // Connect to WebSocket for progress updates
  const {
    progress,
    status,
    currentStep,
    totalSteps,
    stepProgress,
    estimatedTimeRemaining,
    error,
    result,
    isReady,
    cancelAnalysis
  } = usePcaProgress(projectId, analysisId, enabled);
  
  // Convert current step to index for the Stepper component
  const currentStepIndex = currentStep ? Math.min(steps.length - 1, currentStep - 1) : 0;
  
  // Alert user if connection is lost
  const [connectionLost, setConnectionLost] = useState(false);
  
  useEffect(() => {
    // If analysis is running but we're not connected, show warning
    if (status === 'running' && !isReady && enabled) {
      const timeout = setTimeout(() => {
        setConnectionLost(true);
      }, 5000); // Wait 5 seconds before showing the warning
      
      return () => clearTimeout(timeout);
    } else {
      setConnectionLost(false);
    }
  }, [status, isReady, enabled]);
  
  // Call onComplete when analysis is finished
  useEffect(() => {
    if (status === 'complete' && result) {
      onComplete?.(result);
    }
  }, [status, result, onComplete]);
  
  // Call onError when analysis fails
  useEffect(() => {
    if (status === 'error' && error) {
      onError?.(error);
    }
  }, [status, error, onError]);
  
  // Handle cancel request
  const handleCancel = () => {
    cancelAnalysis();
    onCancel?.();
  };
  
  if (!enabled || !analysisId) {
    return null;
  }
  
  // Render different states
  const renderContent = () => {
    switch (status) {
      case 'running':
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Running PCA Analysis
              </Typography>
              
              <Chip 
                icon={<AutorenewIcon />} 
                label="Running"
                color="primary"
                variant="outlined"
                size="small"
                sx={{ mr: 1 }}
              />
              
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={!isReady}
              >
                Cancel
              </Button>
            </Box>
            
            {connectionLost && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Connection to server lost. Progress updates may be delayed. The analysis is still running in the background.
              </Alert>
            )}
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  Overall progress:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {Math.round(progress)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            
            <Stepper activeStep={currentStepIndex} alternativeLabel sx={{ mb: 4 }}>
              {steps.map((label, index) => (
                <Step key={label} completed={index < currentStepIndex}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            {currentStep && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {steps[currentStepIndex]}:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {Math.round(stepProgress)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stepProgress} 
                  color="secondary"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
            
            {estimatedTimeRemaining !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
                <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: theme.palette.text.secondary }} />
                <Typography variant="body2" color="text.secondary">
                  Estimated time remaining: {formatTime(estimatedTimeRemaining)}
                </Typography>
              </Box>
            )}
          </>
        );
        
      case 'complete':
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1, color: theme.palette.success.main }}>
                PCA Analysis Complete
              </Typography>
              <CheckCircleIcon color="success" />
            </Box>
            
            <Typography paragraph>
              The PCA analysis has been successfully completed. You can now view the results and visualizations.
            </Typography>
            
            <LinearProgress 
              variant="determinate" 
              value={100} 
              color="success"
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />
          </>
        );
        
      case 'error':
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1, color: theme.palette.error.main }}>
                Analysis Error
              </Typography>
              <WarningIcon color="error" />
            </Box>
            
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || 'An error occurred during the PCA analysis. Please try again.'}
            </Alert>
            
            <Typography variant="body2" color="text.secondary">
              You can try running the analysis again with different parameters or a smaller dataset.
            </Typography>
          </>
        );
        
      case 'cancelled':
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1, color: theme.palette.warning.main }}>
                Analysis Cancelled
              </Typography>
              <CancelIcon color="warning" />
            </Box>
            
            <Typography paragraph>
              The PCA analysis was cancelled. No results are available.
            </Typography>
          </>
        );
        
      case 'idle':
      default:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography>
              Initializing PCA analysis...
            </Typography>
          </Box>
        );
    }
  };
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper
      }}
    >
      {renderContent()}
    </Paper>
  );
};

export default PcaProgressTracker;