import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import { 
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
  CheckCircleOutline as SuccessIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  SkipNext as SkipIcon,
  RestartAlt as RestartIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflowAPI } from '../../hooks/useWorkflowAPI';

// Status colors for chips
const statusColors = {
  pending: 'default',
  queued: 'secondary',
  running: 'primary',
  completed: 'success',
  failed: 'error',
  skipped: 'warning',
  cancelled: 'error'
};

const WorkflowExecution = () => {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const { 
    workflow, 
    steps,
    executionStatus,
    loading, 
    error, 
    fetchWorkflow, 
    fetchWorkflowSteps,
    executeWorkflow,
    cancelExecution,
    fetchExecutionStatus,
    updateStepStatus
  } = useWorkflowAPI();
  
  // Refs for polling control
  const pollingRef = useRef(null);
  
  // State for logs and results
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [activeStepId, setActiveStepId] = useState(null);
  
  // Dialog state
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [confirmCancelDialogOpen, setConfirmCancelDialogOpen] = useState(false);
  const [confirmSkipDialogOpen, setConfirmSkipDialogOpen] = useState(false);
  const [stepToSkip, setStepToSkip] = useState(null);
  
  // Load workflow, steps, and execution status on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchWorkflow(workflowId);
        await fetchWorkflowSteps(workflowId);
        
        if (workflow && workflow.status === 'in_progress') {
          await fetchExecutionStatus(workflowId);
        }
      } catch (err) {
        console.error('Error loading workflow data:', err);
      }
    };
    
    loadData();
  }, [fetchWorkflow, fetchWorkflowSteps, fetchExecutionStatus, workflowId, workflow?.status]);
  
  // Set up polling for execution status
  useEffect(() => {
    // Only poll if workflow is in progress
    if (workflow && workflow.status === 'in_progress') {
      // Clear any existing polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      
      // Start polling
      pollingRef.current = setInterval(() => {
        fetchExecutionStatus(workflowId);
      }, 2000);
    } else if (pollingRef.current) {
      // Stop polling if workflow is not in progress
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    // Cleanup
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchExecutionStatus, workflowId, workflow?.status]);
  
  // Update active step when execution status changes
  useEffect(() => {
    if (executionStatus && executionStatus.current_step_index !== undefined) {
      setActiveStep(executionStatus.current_step_index);
      
      // Find the step ID for the active step
      if (steps && steps.length > 0 && executionStatus.current_step_index < steps.length) {
        setActiveStepId(steps[executionStatus.current_step_index].id);
      }
    }
  }, [executionStatus, steps]);
  
  // Format time duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (hrs > 0) result += `${hrs}h `;
    if (mins > 0) result += `${mins}m `;
    if (secs > 0 || result === '') result += `${secs}s`;
    
    return result;
  };
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (!steps || steps.length === 0) return 0;
    if (!executionStatus) return 0;
    
    // Count completed steps
    const completedSteps = steps.filter(step => 
      ['completed', 'skipped'].includes(step.status)
    ).length;
    
    // If current step is running, add partial progress
    let progress = (completedSteps / steps.length) * 100;
    
    // Add partial progress for current running step
    if (executionStatus.current_step_progress) {
      const stepWeight = 1 / steps.length;
      progress += (executionStatus.current_step_progress / 100) * stepWeight * 100;
    }
    
    return Math.min(progress, 100);
  };
  
  // Action handlers
  const handleRefresh = async () => {
    try {
      await fetchWorkflow(workflowId);
      await fetchWorkflowSteps(workflowId);
      
      if (workflow && workflow.status === 'in_progress') {
        await fetchExecutionStatus(workflowId);
      }
    } catch (err) {
      console.error('Error refreshing workflow data:', err);
    }
  };
  
  const handleRunWorkflow = async () => {
    try {
      await executeWorkflow(workflowId);
      await fetchWorkflow(workflowId);
      await fetchExecutionStatus(workflowId);
    } catch (err) {
      console.error('Error executing workflow:', err);
    }
  };
  
  const handleRestartFromStep = async (stepIndex) => {
    try {
      await executeWorkflow(workflowId, stepIndex);
      await fetchWorkflow(workflowId);
      await fetchExecutionStatus(workflowId);
    } catch (err) {
      console.error('Error restarting workflow:', err);
    }
  };
  
  const handleCancelExecution = async () => {
    setConfirmCancelDialogOpen(false);
    
    try {
      await cancelExecution(workflowId);
      await fetchWorkflow(workflowId);
      await fetchExecutionStatus(workflowId);
    } catch (err) {
      console.error('Error cancelling workflow:', err);
    }
  };
  
  const handleSkipStep = async () => {
    if (!stepToSkip) {
      setConfirmSkipDialogOpen(false);
      return;
    }
    
    try {
      await updateStepStatus(workflowId, stepToSkip.id, 'skipped');
      setConfirmSkipDialogOpen(false);
      setStepToSkip(null);
      
      // Refresh data
      await fetchWorkflowSteps(workflowId);
      await fetchExecutionStatus(workflowId);
    } catch (err) {
      console.error('Error skipping step:', err);
    }
  };
  
  const handleViewLogs = (stepId) => {
    // In a real app, you would fetch logs for the specific step
    // For now, we'll simulate with a placeholder
    setLogs([
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'Step started' },
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'Loading data...' },
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'Data processing complete' },
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'Step completed successfully' }
    ]);
    
    setLogDialogOpen(true);
  };
  
  const handleViewResults = (stepId) => {
    // In a real app, you would fetch results for the specific step
    // For now, we'll simulate with a placeholder
    setResults({
      summary: {
        duration: '2m 34s',
        recordsProcessed: 1254,
        outputSize: '2.4 MB'
      },
      sample: {
        type: 'table',
        headers: ['id', 'name', 'value', 'timestamp'],
        data: [
          [1, 'Sample A', 0.254, '2023-05-15T12:34:56'],
          [2, 'Sample B', 0.678, '2023-05-15T12:35:22'],
          [3, 'Sample C', 0.123, '2023-05-15T12:36:11']
        ]
      },
      visualizations: [
        { type: 'chart', url: 'https://example.com/chart1.png' }
      ]
    });
    
    setResultDialogOpen(true);
  };
  
  const handleDownloadResults = (stepId) => {
    // In a real app, you would download results for the specific step
    alert(`Downloading results for step ${stepId}`);
  };
  
  // Render step status icon
  const renderStepStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <SuccessIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'skipped':
        return <SkipIcon color="warning" />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return null;
    }
  };
  
  if (loading && !workflow) {
    return (
      <Box sx={{ py: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography>Loading workflow execution...</Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </Paper>
      </Box>
    );
  }
  
  if (error && !workflow) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error">
          Error loading workflow: {error}
        </Alert>
      </Box>
    );
  }
  
  if (!workflow) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="warning">
          Workflow not found. It may have been deleted.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/workflows')}
          sx={{ mt: 2 }}
        >
          Back to Workflows
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ py: 3 }}>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate(`/workflows/${workflowId}`)}
            sx={{ mb: 1 }}
          >
            Back to Workflow
          </Button>
          
          <Typography variant="h4" component="h1">
            {workflow.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Execution Dashboard
          </Typography>
        </Box>
        
        <Box>
          {['draft', 'active', 'completed', 'failed', 'cancelled'].includes(workflow.status) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<RunIcon />}
              onClick={handleRunWorkflow}
              sx={{ mr: 1 }}
            >
              {['completed', 'failed', 'cancelled'].includes(workflow.status) ? 'Run Again' : 'Run Workflow'}
            </Button>
          )}
          
          {workflow.status === 'in_progress' && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<StopIcon />}
              onClick={() => setConfirmCancelDialogOpen(true)}
              sx={{ mr: 1 }}
            >
              Cancel Execution
            </Button>
          )}
          
          <Tooltip title="Refresh">
            <IconButton 
              onClick={handleRefresh}
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Execution Status */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Execution Status
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="subtitle2">Status</Typography>
              </Grid>
              <Grid item xs={8}>
                <Chip 
                  label={workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                  color={statusColors[workflow.status] || 'default'}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="subtitle2">Started</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography>
                  {executionStatus && executionStatus.started_at 
                    ? new Date(executionStatus.started_at).toLocaleString() 
                    : 'Not started'}
                </Typography>
              </Grid>
              
              {(workflow.status === 'completed' || workflow.status === 'failed' || workflow.status === 'cancelled') && (
                <>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2">Finished</Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography>
                      {executionStatus && executionStatus.completed_at 
                        ? new Date(executionStatus.completed_at).toLocaleString() 
                        : 'N/A'}
                    </Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={4}>
                <Typography variant="subtitle2">Duration</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography>
                  {executionStatus && executionStatus.elapsed_time
                    ? formatDuration(executionStatus.elapsed_time)
                    : 'N/A'}
                </Typography>
              </Grid>
              
              {workflow.status === 'in_progress' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Progress</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={calculateProgress()} 
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />
                    <Typography variant="body2" align="right">
                      {Math.round(calculateProgress())}%
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Current Step</Typography>
                    <Typography>
                      {executionStatus && executionStatus.current_step_name
                        ? executionStatus.current_step_name
                        : 'None'}
                    </Typography>
                  </Grid>
                </>
              )}
              
              {workflow.status === 'failed' && executionStatus && executionStatus.error && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom color="error">
                    Error Message
                  </Typography>
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {executionStatus.error}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Execution Steps
            </Typography>
            
            <Divider sx={{ mb: 3 }} />
            
            {steps.length === 0 ? (
              <Alert severity="info">
                This workflow doesn't have any steps defined.
              </Alert>
            ) : (
              <Stepper orientation="vertical" activeStep={activeStep} nonLinear>
                {steps.map((step, index) => (
                  <Step key={step.id} completed={['completed', 'skipped'].includes(step.status)}>
                    <StepLabel
                      error={step.status === 'failed'}
                      icon={renderStepStatusIcon(step.status)}
                      optional={
                        <Chip 
                          label={step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                          color={statusColors[step.status] || 'default'}
                          size="small"
                        />
                      }
                    >
                      <Typography variant="subtitle1">
                        {step.name}
                      </Typography>
                    </StepLabel>
                    
                    <StepContent>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {step.description || 'No description provided.'}
                        </Typography>
                      </Box>
                      
                      {step.status === 'running' && (
                        <Box sx={{ mb: 2 }}>
                          <LinearProgress 
                            variant={executionStatus && executionStatus.current_step_progress ? "determinate" : "indeterminate"} 
                            value={executionStatus ? executionStatus.current_step_progress : 0} 
                            sx={{ height: 6, borderRadius: 3, mb: 1 }}
                          />
                          
                          {executionStatus && executionStatus.current_step_progress && (
                            <Typography variant="body2" align="right">
                              {Math.round(executionStatus.current_step_progress)}%
                            </Typography>
                          )}
                        </Box>
                      )}
                      
                      {step.duration > 0 && (
                        <Typography variant="body2" gutterBottom>
                          Duration: {formatDuration(step.duration)}
                        </Typography>
                      )}
                      
                      {step.status === 'failed' && step.error_message && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {step.error_message}
                        </Alert>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        {['completed', 'failed'].includes(step.status) && (
                          <>
                            <Button
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewResults(step.id)}
                            >
                              View Results
                            </Button>
                            
                            <Button
                              size="small"
                              startIcon={<DownloadIcon />}
                              onClick={() => handleDownloadResults(step.id)}
                            >
                              Download
                            </Button>
                          </>
                        )}
                        
                        <Button
                          size="small"
                          onClick={() => handleViewLogs(step.id)}
                        >
                          Logs
                        </Button>
                        
                        {workflow.status === 'in_progress' && step.status === 'running' && (
                          <Button
                            size="small"
                            startIcon={<SkipIcon />}
                            color="warning"
                            onClick={() => {
                              setStepToSkip(step);
                              setConfirmSkipDialogOpen(true);
                            }}
                          >
                            Skip
                          </Button>
                        )}
                        
                        {workflow.status !== 'in_progress' && (
                          <Button
                            size="small"
                            startIcon={<RestartIcon />}
                            onClick={() => handleRestartFromStep(index)}
                          >
                            Start from here
                          </Button>
                        )}
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Cancel Execution Dialog */}
      <Dialog
        open={confirmCancelDialogOpen}
        onClose={() => setConfirmCancelDialogOpen(false)}
      >
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel the current workflow execution?
            This will stop all running steps and mark the workflow as cancelled.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancelDialogOpen(false)}>
            No, Continue Execution
          </Button>
          <Button 
            onClick={handleCancelExecution} 
            color="warning" 
            variant="contained"
          >
            Yes, Cancel Execution
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Skip Step Dialog */}
      <Dialog
        open={confirmSkipDialogOpen}
        onClose={() => {
          setConfirmSkipDialogOpen(false);
          setStepToSkip(null);
        }}
      >
        <DialogTitle>Confirm Skip Step</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to skip the current step "{stepToSkip?.name}"?
            This will mark the step as skipped and proceed to the next step.
            Any partial results from this step will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setConfirmSkipDialogOpen(false);
            setStepToSkip(null);
          }}>
            No, Continue Step
          </Button>
          <Button 
            onClick={handleSkipStep} 
            color="warning" 
            variant="contained"
          >
            Yes, Skip Step
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Logs Dialog */}
      <Dialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Step Execution Logs</DialogTitle>
        <DialogContent>
          <Box 
            component="pre" 
            sx={{ 
              maxHeight: 400, 
              overflow: 'auto', 
              p: 2,
              backgroundColor: 'grey.900',
              color: 'grey.100',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap'
            }}
          >
            {logs.map((log, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <span style={{ color: '#8bc34a' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span style={{ 
                  color: log.level === 'ERROR' ? '#f44336' : 
                         log.level === 'WARNING' ? '#ff9800' : 
                         log.level === 'INFO' ? '#2196f3' : '#ffffff' 
                }}>
                  {` [${log.level}] `}
                </span>
                <span>{log.message}</span>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Results Dialog */}
      <Dialog
        open={resultDialogOpen}
        onClose={() => setResultDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Step Results</DialogTitle>
        <DialogContent>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Summary</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="subtitle2">Duration</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography>{results.summary?.duration || 'N/A'}</Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="subtitle2">Records Processed</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography>{results.summary?.recordsProcessed || 'N/A'}</Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="subtitle2">Output Size</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography>{results.summary?.outputSize || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
          
          {results.sample && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Data Sample</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse', 
                    border: '1px solid rgba(224, 224, 224, 1)' 
                  }}>
                    <thead>
                      <tr>
                        {results.sample.headers.map((header, index) => (
                          <th key={index} style={{ 
                            padding: '8px', 
                            borderBottom: '2px solid rgba(224, 224, 224, 1)',
                            textAlign: 'left',
                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                          }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.sample.data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} style={{ 
                              padding: '8px', 
                              borderBottom: '1px solid rgba(224, 224, 224, 1)'
                            }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
          
          {results.visualizations && results.visualizations.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Visualizations</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary" gutterBottom>
                  Visualization preview not available in this demo.
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadResults(activeStepId)}
            sx={{ mr: 'auto' }}
          >
            Download Results
          </Button>
          <Button onClick={() => setResultDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowExecution;