import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  Divider,
  CircularProgress,
  Switch,
  FormControlLabel,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton
} from '@mui/material';
import { 
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Code as CodeIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflowAPI } from '../../hooks/useWorkflowAPI';
import { JSONEditor } from '@json-editor/json-editor';

// Step type definitions with schemas for each type
const STEP_TYPES = {
  data_load: {
    label: 'Data Loading',
    description: 'Load data from various sources',
    schema: {
      type: 'object',
      required: ['source'],
      properties: {
        source: {
          type: 'string',
          enum: ['file', 'database', 'api', 'previous_step'],
          default: 'file'
        },
        file_path: {
          type: 'string',
          description: 'Path to the data file (required for file source)'
        },
        connection_string: {
          type: 'string',
          description: 'Database connection string (required for database source)'
        },
        query: {
          type: 'string',
          description: 'SQL query or API endpoint (required for database or API source)'
        },
        step_id: {
          type: 'string',
          description: 'ID of the previous step to use data from (required for previous_step source)'
        },
        options: {
          type: 'object',
          properties: {
            header: { type: 'boolean', default: true },
            delimiter: { type: 'string', default: ',' },
            sheet_name: { type: 'string' },
            encoding: { type: 'string', default: 'utf-8' }
          }
        }
      }
    }
  },
  data_transform: {
    label: 'Data Transformation',
    description: 'Transform and clean data',
    schema: {
      type: 'object',
      required: ['operations'],
      properties: {
        operations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type'],
            properties: {
              type: {
                type: 'string',
                enum: [
                  'filter', 'select', 'rename', 'drop', 'fill_na', 
                  'transform', 'sort', 'group', 'join', 'custom'
                ]
              },
              column: { type: 'string' },
              columns: { 
                type: 'array',
                items: { type: 'string' }
              },
              expression: { type: 'string' },
              value: { type: 'string' },
              code: { type: 'string' }
            }
          }
        },
        input_step_id: { type: 'string' }
      }
    }
  },
  statistical_analysis: {
    label: 'Statistical Analysis',
    description: 'Perform statistical analysis on data',
    schema: {
      type: 'object',
      required: ['analysis_type'],
      properties: {
        analysis_type: {
          type: 'string',
          enum: [
            'descriptive', 'hypothesis_test', 'correlation', 
            'regression', 'anova', 'custom'
          ]
        },
        parameters: {
          type: 'object',
          properties: {
            variables: {
              type: 'array',
              items: { type: 'string' }
            },
            grouping_variable: { type: 'string' },
            test_type: { type: 'string' },
            alpha: { type: 'number', default: 0.05 },
            custom_code: { type: 'string' }
          }
        },
        input_step_id: { type: 'string' }
      }
    }
  },
  visualization: {
    label: 'Visualization',
    description: 'Create data visualizations',
    schema: {
      type: 'object',
      required: ['viz_type'],
      properties: {
        viz_type: {
          type: 'string',
          enum: [
            'scatter', 'line', 'bar', 'histogram', 'box', 
            'heatmap', 'pie', 'violin', 'custom'
          ]
        },
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'string' },
            y: { type: 'string' },
            color: { type: 'string' },
            size: { type: 'string' },
            facet: { type: 'string' },
            title: { type: 'string' },
            width: { type: 'number', default: 800 },
            height: { type: 'number', default: 500 },
            custom_code: { type: 'string' }
          }
        },
        input_step_id: { type: 'string' }
      }
    }
  },
  machine_learning: {
    label: 'Machine Learning',
    description: 'Apply machine learning algorithms',
    schema: {
      type: 'object',
      required: ['ml_type', 'algorithm'],
      properties: {
        ml_type: {
          type: 'string',
          enum: ['classification', 'regression', 'clustering', 'dimensionality_reduction', 'custom']
        },
        algorithm: {
          type: 'string',
          enum: [
            'linear_regression', 'logistic_regression', 'decision_tree', 
            'random_forest', 'svm', 'naive_bayes', 'kmeans', 'dbscan', 
            'pca', 'tsne', 'custom'
          ]
        },
        parameters: {
          type: 'object',
          properties: {
            features: {
              type: 'array',
              items: { type: 'string' }
            },
            target: { type: 'string' },
            test_size: { type: 'number', default: 0.2 },
            random_state: { type: 'number', default: 42 },
            hyperparameters: { type: 'object' },
            custom_code: { type: 'string' }
          }
        },
        input_step_id: { type: 'string' }
      }
    }
  },
  export: {
    label: 'Export Results',
    description: 'Export data or results to various formats',
    schema: {
      type: 'object',
      required: ['format'],
      properties: {
        format: {
          type: 'string',
          enum: ['csv', 'excel', 'json', 'pdf', 'html']
        },
        file_name: { type: 'string' },
        include_visualizations: { type: 'boolean', default: true },
        include_raw_data: { type: 'boolean', default: false },
        input_step_id: { type: 'string' }
      }
    }
  },
  custom: {
    label: 'Custom Code',
    description: 'Execute custom code',
    schema: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string' },
        language: {
          type: 'string',
          enum: ['python', 'r', 'javascript'],
          default: 'python'
        },
        input_step_ids: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  }
};

const WorkflowStepForm = () => {
  const { workflowId, stepId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!stepId;
  
  const { 
    workflow,
    steps,
    loading, 
    error, 
    fetchWorkflow,
    fetchWorkflowSteps,
    createWorkflowStep,
    updateWorkflowStep,
    deleteWorkflowStep
  } = useWorkflowAPI();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stepType, setStepType] = useState('');
  const [parameters, setParameters] = useState({});
  const [jsonEditor, setJsonEditor] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJson, setRawJson] = useState('{}');
  const [editorInitialized, setEditorInitialized] = useState(false);
  
  // Validation state
  const [nameError, setNameError] = useState('');
  const [typeError, setTypeError] = useState('');
  const [parameterError, setParameterError] = useState('');
  
  // Help dialog state
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  
  // Load workflow and step data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load workflow
        const workflowData = await fetchWorkflow(workflowId);
        
        // Load steps for dependency selection
        await fetchWorkflowSteps(workflowId);
        
        // If editing, load step data
        if (isEditMode) {
          const stepResponse = steps.find(s => s.id === stepId);
          
          if (stepResponse) {
            setName(stepResponse.name);
            setDescription(stepResponse.description || '');
            setStepType(stepResponse.step_type);
            setParameters(stepResponse.parameters || {});
            setRawJson(JSON.stringify(stepResponse.parameters || {}, null, 2));
          }
        }
      } catch (err) {
        console.error('Error loading workflow data:', err);
      }
    };
    
    loadData();
  }, [fetchWorkflow, fetchWorkflowSteps, workflowId, stepId, isEditMode, steps]);
  
  // Initialize JSON editor when step type changes
  useEffect(() => {
    if (!stepType) return;
    
    // Destroy existing editor if it exists
    if (jsonEditor) {
      jsonEditor.destroy();
    }
    
    // Create editor container if it doesn't exist
    const editorContainer = document.getElementById('json-editor');
    if (!editorContainer) return;
    
    // Clear container
    editorContainer.innerHTML = '';
    
    // Get schema for selected step type
    const schema = STEP_TYPES[stepType]?.schema;
    
    if (schema) {
      // Initialize JSON Editor
      const editor = new JSONEditor(editorContainer, {
        schema,
        theme: 'bootstrap4',
        iconlib: 'fontawesome5',
        disable_edit_json: false,
        disable_properties: true,
        disable_collapse: false,
        disable_array_add: false,
        disable_array_delete: false,
        disable_array_reorder: false,
        enable_array_copy: true,
        show_errors: 'always',
        compact: false,
        format: 'grid',
        startval: parameters
      });
      
      // Save editor instance
      setJsonEditor(editor);
      setEditorInitialized(true);
      
      // Update raw JSON
      editor.on('change', () => {
        try {
          const values = editor.getValue();
          setRawJson(JSON.stringify(values, null, 2));
          setParameters(values);
        } catch (err) {
          console.error('Error getting editor value:', err);
        }
      });
    }
    
    return () => {
      if (jsonEditor) {
        jsonEditor.destroy();
      }
    };
  }, [stepType, parameters, jsonEditor]);
  
  // Validate form
  const validateForm = () => {
    let isValid = true;
    
    if (!name.trim()) {
      setNameError('Step name is required');
      isValid = false;
    } else {
      setNameError('');
    }
    
    if (!stepType) {
      setTypeError('Step type is required');
      isValid = false;
    } else {
      setTypeError('');
    }
    
    if (jsonEditor) {
      const errors = jsonEditor.validate();
      
      if (errors.length > 0) {
        setParameterError('There are errors in the parameters configuration');
        isValid = false;
      } else {
        setParameterError('');
      }
    }
    
    return isValid;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      let params = parameters;
      
      // If using raw JSON mode, parse the JSON
      if (showRawJson) {
        try {
          params = JSON.parse(rawJson);
        } catch (err) {
          setParameterError('Invalid JSON format');
          return;
        }
      } else if (jsonEditor) {
        // Get values from JSON editor
        params = jsonEditor.getValue();
      }
      
      const stepData = {
        name,
        description,
        step_type: stepType,
        parameters: params
      };
      
      if (isEditMode) {
        await updateWorkflowStep(workflowId, stepId, stepData);
      } else {
        await createWorkflowStep(workflowId, stepData);
      }
      
      // Navigate back to workflow detail
      navigate(`/workflows/${workflowId}`);
    } catch (err) {
      console.error('Error saving workflow step:', err);
    }
  };
  
  // Handle step type change
  const handleStepTypeChange = (e) => {
    const newType = e.target.value;
    setStepType(newType);
    setParameters({});
    setRawJson('{}');
  };
  
  // Handle raw JSON change
  const handleRawJsonChange = (e) => {
    setRawJson(e.target.value);
    
    // Try to parse JSON and update editor if valid
    try {
      const parsed = JSON.parse(e.target.value);
      setParameters(parsed);
      
      if (jsonEditor && !showRawJson) {
        jsonEditor.setValue(parsed);
      }
      
      setParameterError('');
    } catch (err) {
      setParameterError('Invalid JSON format');
    }
  };
  
  // Handle JSON mode toggle
  const handleJsonModeToggle = () => {
    if (!showRawJson && jsonEditor) {
      // Switching to raw JSON, get current values
      setRawJson(JSON.stringify(jsonEditor.getValue(), null, 2));
    }
    
    setShowRawJson(!showRawJson);
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (!isEditMode) return;
    
    try {
      await deleteWorkflowStep(workflowId, stepId);
      navigate(`/workflows/${workflowId}`);
    } catch (err) {
      console.error('Error deleting step:', err);
    }
  };
  
  if (loading && !workflow) {
    return (
      <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => navigate(`/workflows/${workflowId}`)}
          sx={{ mr: 2 }}
        >
          Back to Workflow
        </Button>
        
        <Typography variant="h4" component="h1">
          {isEditMode ? 'Edit Workflow Step' : 'Add Workflow Step'}
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Step Name"
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={!!nameError}
                helperText={nameError}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!typeError}>
                <InputLabel id="step-type-label">Step Type</InputLabel>
                <Select
                  labelId="step-type-label"
                  value={stepType}
                  onChange={handleStepTypeChange}
                  label="Step Type"
                >
                  {Object.entries(STEP_TYPES).map(([key, { label, description }]) => (
                    <MenuItem key={key} value={key}>
                      <Box>
                        <Typography>{label}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {typeError && <FormHelperText>{typeError}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
            
            {stepType && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Parameters
                    </Typography>
                    
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showRawJson}
                            onChange={handleJsonModeToggle}
                          />
                        }
                        label="Edit Raw JSON"
                      />
                      
                      <IconButton 
                        color="primary"
                        onClick={() => setHelpDialogOpen(true)}
                      >
                        <HelpIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    {showRawJson ? (
                      <TextField
                        label="Parameters (JSON)"
                        fullWidth
                        multiline
                        rows={10}
                        value={rawJson}
                        onChange={handleRawJsonChange}
                        error={!!parameterError}
                        helperText={parameterError}
                        sx={{ fontFamily: 'monospace' }}
                      />
                    ) : (
                      <Box>
                        <div id="json-editor" />
                        {parameterError && (
                          <FormHelperText error>{parameterError}</FormHelperText>
                        )}
                        {!editorInitialized && (
                          <Box sx={{ p: 2, textAlign: 'center' }}>
                            <CircularProgress size={24} />
                            <Typography>Initializing parameter editor...</Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Box>
                  {isEditMode && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDelete}
                    >
                      Delete Step
                    </Button>
                  )}
                </Box>
                
                <Box>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/workflows/${workflowId}`)}
                    sx={{ mr: 2 }}
                    startIcon={<CancelIcon />}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    startIcon={<SaveIcon />}
                  >
                    {isEditMode ? 'Update Step' : 'Add Step'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      {/* Help Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {stepType && STEP_TYPES[stepType]?.label} Parameters Help
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {stepType && STEP_TYPES[stepType]?.description}
          </DialogContentText>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Required Parameters:</Typography>
            <ul>
              {stepType && Object.entries(STEP_TYPES[stepType]?.schema.properties || {})
                .filter(([_, prop]) => STEP_TYPES[stepType]?.schema.required?.includes(_))
                .map(([key, prop]) => (
                  <li key={key}>
                    <Typography>
                      <strong>{key}</strong>: {prop.description || 'No description available'}
                    </Typography>
                  </li>
                ))}
            </ul>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Optional Parameters:</Typography>
            <ul>
              {stepType && Object.entries(STEP_TYPES[stepType]?.schema.properties || {})
                .filter(([_, prop]) => !STEP_TYPES[stepType]?.schema.required?.includes(_))
                .map(([key, prop]) => (
                  <li key={key}>
                    <Typography>
                      <strong>{key}</strong>: {prop.description || 'No description available'}
                    </Typography>
                  </li>
                ))}
            </ul>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Parameter Schema:</Typography>
            <Box component="pre" sx={{ 
              backgroundColor: 'grey.100',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.8rem'
            }}>
              {stepType && JSON.stringify(STEP_TYPES[stepType]?.schema, null, 2)}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowStepForm;