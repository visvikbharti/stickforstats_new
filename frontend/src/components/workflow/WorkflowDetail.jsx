import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Chip,
  Grid,
  Divider,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  TextField
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  FileCopy as CloneIcon,
  GetApp as ExportIcon,
  Visibility as ViewResultsIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflowAPI } from '../../hooks/useWorkflowAPI';

// Status colors for chips
const statusColors = {
  draft: 'default',
  active: 'primary',
  in_progress: 'secondary',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning'
};

// Step status colors
const stepStatusColors = {
  pending: 'default',
  running: 'primary',
  completed: 'success',
  failed: 'error',
  skipped: 'warning'
};

const WorkflowDetail = () => {
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
    deleteWorkflow,
    deleteWorkflowStep,
    updateWorkflowStep,
    updateWorkflow,
    executeWorkflow,
    cancelExecution,
    fetchExecutionStatus,
    cloneWorkflow,
    exportWorkflow
  } = useWorkflowAPI();
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStepDialogOpen, setDeleteStepDialogOpen] = useState(false);
  const [stepToDelete, setStepToDelete] = useState(null);
  
  // Load workflow and steps on mount
  useEffect(() => {
    const loadWorkflowData = async () => {
      try {
        await fetchWorkflow(workflowId);
        await fetchWorkflowSteps(workflowId);
        
        // Also fetch execution status if the workflow is in progress
        if (workflow && ['in_progress'].includes(workflow.status)) {
          await fetchExecutionStatus(workflowId);
        }
      } catch (err) {
        console.error('Error loading workflow data:', err);
      }
    };
    
    loadWorkflowData();
    
    // Set up polling for execution status if workflow is in progress
    const intervalId = setInterval(() => {
      if (workflow && ['in_progress'].includes(workflow.status)) {
        fetchExecutionStatus(workflowId);
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [fetchWorkflow, fetchWorkflowSteps, fetchExecutionStatus, workflowId, workflow?.status]);
  
  // Set up edit mode values when workflow changes
  useEffect(() => {
    if (workflow) {
      setEditedName(workflow.name);
      setEditedDescription(workflow.description || '');
    }
  }, [workflow]);
  
  // Format datetime string
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Action handlers
  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
    
    // Reset form if cancelling edit
    if (isEditMode) {
      setEditedName(workflow.name);
      setEditedDescription(workflow.description || '');
    }
  };
  
  const handleSaveWorkflow = async () => {
    try {
      await updateWorkflow(workflowId, {
        name: editedName,
        description: editedDescription
      });
      
      setIsEditMode(false);
      fetchWorkflow(workflowId);
    } catch (err) {
      console.error('Error updating workflow:', err);
    }
  };
  
  const handleDeleteWorkflow = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await deleteWorkflow(workflowId);
      setDeleteDialogOpen(false);
      
      // Navigate back to workflows list
      navigate('/workflows');
    } catch (err) {
      console.error('Error deleting workflow:', err);
    }
  };
  
  const handleAddStep = () => {
    navigate(`/workflows/${workflowId}/steps/new`);
  };
  
  const handleEditStep = (stepId) => {
    navigate(`/workflows/${workflowId}/steps/${stepId}/edit`);
  };
  
  const handleDeleteStepClick = (step) => {
    setStepToDelete(step);
    setDeleteStepDialogOpen(true);
  };
  
  const handleDeleteStepConfirm = async () => {
    if (!stepToDelete) return;
    
    try {
      await deleteWorkflowStep(workflowId, stepToDelete.id);
      setDeleteStepDialogOpen(false);
      setStepToDelete(null);
      
      // Refresh steps
      fetchWorkflowSteps(workflowId);
    } catch (err) {
      console.error('Error deleting step:', err);
    }
  };
  
  const handleDeleteStepCancel = () => {
    setDeleteStepDialogOpen(false);
    setStepToDelete(null);
  };
  
  const handleMoveStep = async (stepId, direction) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return;
    
    const newOrder = direction === 'up' 
      ? Math.max(0, steps[stepIndex].order - 1)
      : Math.min(steps.length - 1, steps[stepIndex].order + 1);
    
    // Check if already at the limit
    if (newOrder === steps[stepIndex].order) return;
    
    try {
      await updateWorkflowStep(workflowId, stepId, {
        order: newOrder
      });
      
      // Refresh steps
      fetchWorkflowSteps(workflowId);
    } catch (err) {
      console.error('Error moving step:', err);
    }
  };
  
  const handleExecuteWorkflow = async () => {
    try {
      await executeWorkflow(workflowId);
      
      // Refresh workflow and steps
      fetchWorkflow(workflowId);
      fetchWorkflowSteps(workflowId);
    } catch (err) {
      console.error('Error executing workflow:', err);
    }
  };
  
  const handleCancelExecution = async () => {
    try {
      await cancelExecution(workflowId);
      
      // Refresh workflow and execution status
      fetchWorkflow(workflowId);
      fetchExecutionStatus(workflowId);
    } catch (err) {
      console.error('Error cancelling execution:', err);
    }
  };
  
  const handleRefresh = async () => {
    try {
      await fetchWorkflow(workflowId);
      await fetchWorkflowSteps(workflowId);
      
      if (workflow && ['in_progress'].includes(workflow.status)) {
        await fetchExecutionStatus(workflowId);
      }
    } catch (err) {
      console.error('Error refreshing workflow data:', err);
    }
  };
  
  const handleCloneWorkflow = async () => {
    try {
      const clonedWorkflow = await cloneWorkflow(workflowId);
      
      // Navigate to the cloned workflow
      navigate(`/workflows/${clonedWorkflow.id}`);
    } catch (err) {
      console.error('Error cloning workflow:', err);
    }
  };
  
  const handleExportWorkflow = async () => {
    try {
      await exportWorkflow(workflowId);
    } catch (err) {
      console.error('Error exporting workflow:', err);
    }
  };
  
  const handleViewResults = (stepId) => {
    navigate(`/workflows/${workflowId}/steps/${stepId}/results`);
  };
  
  // Calculate overall workflow progress
  const calculateProgress = () => {
    if (!steps || steps.length === 0) return 0;
    
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };
  
  if (loading && !workflow) {
    return (
      <Box sx={{ py: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography>Loading workflow details...</Typography>
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
            onClick={() => navigate('/workflows')}
            sx={{ mb: 1 }}
          >
            Back to Workflows
          </Button>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              {isEditMode ? (
                <TextField
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  variant="outlined"
                  fullWidth
                  label="Workflow Name"
                  size="small"
                  sx={{ minWidth: 300 }}
                />
              ) : (
                workflow.name
              )}
            </Typography>
            
            <Chip 
              label={workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
              color={statusColors[workflow.status] || 'default'}
              size="small"
              sx={{ ml: 2 }}
            />
          </Box>
        </Box>
        
        <Box>
          {isEditMode ? (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveWorkflow}
                sx={{ mr: 1 }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={handleEditToggle}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {['draft', 'active'].includes(workflow.status) && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RunIcon />}
                  onClick={handleExecuteWorkflow}
                  sx={{ mr: 1 }}
                >
                  Run Workflow
                </Button>
              )}
              
              {workflow.status === 'in_progress' && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<StopIcon />}
                  onClick={handleCancelExecution}
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
              
              <Tooltip title="Edit workflow">
                <IconButton 
                  onClick={handleEditToggle}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Clone workflow">
                <IconButton 
                  onClick={handleCloneWorkflow}
                  sx={{ mr: 1 }}
                >
                  <CloneIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Export workflow">
                <IconButton 
                  onClick={handleExportWorkflow}
                  sx={{ mr: 1 }}
                >
                  <ExportIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Delete workflow">
                <IconButton 
                  onClick={handleDeleteWorkflow}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
      
      {/* Workflow details */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Workflow Details
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
                <Typography variant="subtitle2">Created</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography>{formatDate(workflow.created_at)}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="subtitle2">Last Updated</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography>{formatDate(workflow.updated_at)}</Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="subtitle2">Last Run</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography>{formatDate(workflow.last_executed_at || null)}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Description</Typography>
                {isEditMode ? (
                  <TextField
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={4}
                    label="Workflow Description"
                  />
                ) : (
                  <Typography>
                    {workflow.description || 'No description provided.'}
                  </Typography>
                )}
              </Grid>
            </Grid>
            
            {workflow.status === 'in_progress' && executionStatus && (
              <>
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Execution Progress
                </Typography>
                
                <LinearProgress 
                  variant="determinate" 
                  value={calculateProgress()} 
                  sx={{ height: 10, borderRadius: 5, my: 2 }}
                />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Current Step</Typography>
                    <Typography>
                      {executionStatus.current_step_name || 'N/A'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Elapsed Time</Typography>
                    <Typography>
                      {executionStatus.elapsed_time 
                        ? `${Math.floor(executionStatus.elapsed_time / 60)}m ${Math.floor(executionStatus.elapsed_time % 60)}s`
                        : 'N/A'
                      }
                    </Typography>
                  </Grid>
                </Grid>
              </>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Workflow Steps
              </Typography>
              
              {['draft', 'active'].includes(workflow.status) && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleAddStep}
                >
                  Add Step
                </Button>
              )}
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            {steps.length === 0 ? (
              <Alert severity="info">
                This workflow doesn't have any steps yet. Add steps to define your workflow.
              </Alert>
            ) : (
              <Stepper orientation="vertical" nonLinear>
                {steps.map((step, index) => (
                  <Step key={step.id} active={true}>
                    <StepLabel
                      optional={
                        <Chip 
                          label={step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                          color={stepStatusColors[step.status] || 'default'}
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
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Type:</strong> {step.step_type}
                        </Typography>
                        
                        {step.parameters && Object.keys(step.parameters).length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>Parameters:</strong>
                            </Typography>
                            <Box component="pre" sx={{ 
                              backgroundColor: 'grey.100',
                              p: 1,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              overflowX: 'auto'
                            }}>
                              {JSON.stringify(step.parameters, null, 2)}
                            </Box>
                          </Box>
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {['completed', 'failed'].includes(step.status) && (
                          <Button
                            size="small"
                            startIcon={<ViewResultsIcon />}
                            onClick={() => handleViewResults(step.id)}
                          >
                            View Results
                          </Button>
                        )}
                        
                        {['draft', 'active'].includes(workflow.status) && (
                          <>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditStep(step.id)}
                            >
                              Edit
                            </Button>
                            
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteStepClick(step)}
                            >
                              Delete
                            </Button>
                            
                            {index > 0 && (
                              <IconButton
                                size="small"
                                onClick={() => handleMoveStep(step.id, 'up')}
                              >
                                <MoveUpIcon />
                              </IconButton>
                            )}
                            
                            {index < steps.length - 1 && (
                              <IconButton
                                size="small"
                                onClick={() => handleMoveStep(step.id, 'down')}
                              >
                                <MoveDownIcon />
                              </IconButton>
                            )}
                          </>
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
      
      {/* Delete workflow confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete workflow "{workflow.name}"? 
            This action cannot be undone and all associated steps and data will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete step confirmation dialog */}
      <Dialog
        open={deleteStepDialogOpen}
        onClose={handleDeleteStepCancel}
      >
        <DialogTitle>Confirm Step Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete step "{stepToDelete?.name}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteStepCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteStepConfirm} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowDetail;