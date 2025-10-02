/**
 * WorkflowProgress Component
 * 
 * Simple progress visualization for workflow completion.
 * MVP version - functional and clean.
 * 
 * @author Vishal Bharti
 * @date 2025-08-26
 * @version 1.0.0 (MVP)
 */

import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Paper,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as PendingIcon,
  PlayCircle as CurrentIcon,
  Timer as TimeIcon,
  TrendingUp as ProgressIcon
} from '@mui/icons-material';

const WorkflowProgress = ({ 
  progress = 0, 
  currentStep = null, 
  completedSteps = [], 
  totalSteps = 0,
  startTime = null,
  estimatedTimeRemaining = null 
}) => {
  
  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!startTime) return 'Not started';
    const elapsed = Date.now() - new Date(startTime).getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Simple step status
  const getStepStatus = (index) => {
    if (completedSteps.includes(index)) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  return (
    <Paper elevation={2} sx={{ p: 3, width: '100%' }}>
      {/* Main Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">
            Analysis Progress
          </Typography>
          <Typography variant="h6" color="primary">
            {progress}%
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ height: 10, borderRadius: 5 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            {completedSteps.length} of {totalSteps} steps completed
          </Typography>
          {currentStep && (
            <Typography variant="body2" color="primary">
              Current: {currentStep}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <CompleteIcon color="success" />
            <Typography variant="h6">{completedSteps.length}</Typography>
            <Typography variant="caption" color="textSecondary">
              Completed
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <PendingIcon color="action" />
            <Typography variant="h6">{totalSteps - completedSteps.length}</Typography>
            <Typography variant="caption" color="textSecondary">
              Remaining
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <TimeIcon color="primary" />
            <Typography variant="h6">{getElapsedTime()}</Typography>
            <Typography variant="caption" color="textSecondary">
              Time Elapsed
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <ProgressIcon color="secondary" />
            <Typography variant="h6">
              {estimatedTimeRemaining || 'N/A'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Est. Remaining
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Step Indicators - Simple */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const status = getStepStatus(i);
          return (
            <Chip
              key={i}
              label={`Step ${i + 1}`}
              size="small"
              color={
                status === 'completed' ? 'success' :
                status === 'current' ? 'primary' :
                'default'
              }
              icon={
                status === 'completed' ? <CompleteIcon /> :
                status === 'current' ? <CurrentIcon /> :
                <PendingIcon />
              }
            />
          );
        })}
      </Box>
    </Paper>
  );
};

export default WorkflowProgress;