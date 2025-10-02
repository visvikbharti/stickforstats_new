import React, { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  AlertTitle,
  Divider,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Checkbox,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress
} from '@mui/material';
import { 
  FileUpload as UploadIcon,
  GetApp as DownloadIcon,
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  Upload as ImportIcon,
  Archive as ArchiveIcon,
  CloudDownload as ExportIcon,
  DataObject as DataIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  ExpandLess,
  ExpandMore,
  Description as FileIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWorkflowAPI } from '../../hooks/useWorkflowAPI';

const WorkflowImportExport = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { 
    workflows, 
    loading, 
    error, 
    fetchWorkflows,
    exportWorkflow,
    importWorkflow
  } = useWorkflowAPI();
  
  // State for import/export options
  const [activeTab, setActiveTab] = useState('import'); // 'import' or 'export'
  const [importFile, setImportFile] = useState(null);
  const [includeData, setIncludeData] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState({
    steps: true,
    parameters: true,
    results: true,
    visualizations: true,
    datasets: includeData
  });
  
  // Import progress state
  const [importProgress, setImportProgress] = useState({
    isImporting: false,
    currentStep: 0,
    steps: [
      'Validating file',
      'Importing workflow structure',
      'Importing steps',
      'Importing datasets',
      'Complete'
    ],
    error: null,
    result: null
  });
  
  // Export progress state
  const [exportProgress, setExportProgress] = useState({
    isExporting: false,
    currentStep: 0,
    steps: [
      'Preparing workflow',
      'Gathering steps',
      'Processing datasets',
      'Creating export file',
      'Complete'
    ],
    error: null
  });
  
  // Expanded panels state
  const [expandedPanels, setExpandedPanels] = useState({
    options: true,
    components: false,
    preview: false
  });
  
  // Success/error dialog state
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [operationResult, setOperationResult] = useState({
    success: false,
    title: '',
    message: '',
    details: null,
    workflow: null
  });
  
  // Load workflows
  React.useEffect(() => {
    const loadWorkflows = async () => {
      try {
        await fetchWorkflows();
      } catch (err) {
        console.error('Error loading workflows:', err);
      }
    };
    
    loadWorkflows();
  }, [fetchWorkflows]);
  
  // Update selectedComponents when includeData changes
  React.useEffect(() => {
    setSelectedComponents(prev => ({
      ...prev,
      datasets: includeData
    }));
  }, [includeData]);
  
  // Handle file selection for import
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
    }
  };
  
  // Handle import workflow
  const handleImport = async () => {
    if (!importFile) return;
    
    setImportProgress(prev => ({
      ...prev,
      isImporting: true,
      currentStep: 0,
      error: null,
      result: null
    }));
    
    try {
      // Simulate step progress (in a real app, this would be updated based on backend events)
      const simulateSteps = async () => {
        for (let i = 0; i < importProgress.steps.length - 1; i++) {
          setImportProgress(prev => ({ ...prev, currentStep: i }));
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      };
      
      await simulateSteps();
      
      // Perform the actual import
      const result = await importWorkflow(importFile, includeData);
      
      setImportProgress(prev => ({
        ...prev,
        isImporting: false,
        currentStep: importProgress.steps.length - 1,
        result
      }));
      
      // Show success dialog
      setOperationResult({
        success: true,
        title: 'Workflow Imported Successfully',
        message: `The workflow "${result.name}" has been imported.`,
        details: `${result.steps.length} steps were imported.`,
        workflow: result
      });
      
      setResultDialogOpen(true);
      
      // Reset file input
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh workflows list
      await fetchWorkflows();
    } catch (err) {
      console.error('Error importing workflow:', err);
      
      setImportProgress(prev => ({
        ...prev,
        isImporting: false,
        error: err.message || 'Unknown error occurred during import'
      }));
      
      // Show error dialog
      setOperationResult({
        success: false,
        title: 'Import Failed',
        message: 'There was an error importing the workflow.',
        details: err.message || 'Unknown error'
      });
      
      setResultDialogOpen(true);
    }
  };
  
  // Handle export workflow
  const handleExport = async () => {
    if (!selectedWorkflow) return;
    
    setExportProgress(prev => ({
      ...prev,
      isExporting: true,
      currentStep: 0,
      error: null
    }));
    
    try {
      // Simulate step progress (in a real app, this would be updated based on backend events)
      const simulateSteps = async () => {
        for (let i = 0; i < exportProgress.steps.length - 1; i++) {
          setExportProgress(prev => ({ ...prev, currentStep: i }));
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      };
      
      await simulateSteps();
      
      // Perform the actual export
      await exportWorkflow(selectedWorkflow, includeData);
      
      setExportProgress(prev => ({
        ...prev,
        isExporting: false,
        currentStep: exportProgress.steps.length - 1
      }));
      
      // Show success dialog
      setOperationResult({
        success: true,
        title: 'Workflow Exported Successfully',
        message: 'The workflow has been exported and downloaded.',
        details: `Format: ${exportFormat.toUpperCase()}, Includes Data: ${includeData ? 'Yes' : 'No'}`
      });
      
      setResultDialogOpen(true);
    } catch (err) {
      console.error('Error exporting workflow:', err);
      
      setExportProgress(prev => ({
        ...prev,
        isExporting: false,
        error: err.message || 'Unknown error occurred during export'
      }));
      
      // Show error dialog
      setOperationResult({
        success: false,
        title: 'Export Failed',
        message: 'There was an error exporting the workflow.',
        details: err.message || 'Unknown error'
      });
      
      setResultDialogOpen(true);
    }
  };
  
  // Handle toggling expanded panels
  const togglePanel = (panel) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };
  
  // Handle component selection change
  const handleComponentChange = (component) => {
    setSelectedComponents(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };
  
  // Handle going to imported workflow
  const handleGoToWorkflow = () => {
    if (operationResult.workflow) {
      navigate(`/workflows/${operationResult.workflow.id}`);
    }
    setResultDialogOpen(false);
  };
  
  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => navigate('/workflows')}
          sx={{ mr: 2 }}
        >
          Back to Workflows
        </Button>
        
        <Typography variant="h4" component="h1">
          Import/Export Workflows
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Grid container>
            <Grid item xs={6}>
              <Button
                variant={activeTab === 'import' ? 'contained' : 'outlined'}
                fullWidth
                startIcon={<ImportIcon />}
                onClick={() => setActiveTab('import')}
                sx={{ borderRadius: '4px 0 0 4px' }}
              >
                Import Workflow
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant={activeTab === 'export' ? 'contained' : 'outlined'}
                fullWidth
                startIcon={<ExportIcon />}
                onClick={() => setActiveTab('export')}
                sx={{ borderRadius: '0 4px 4px 0' }}
              >
                Export Workflow
              </Button>
            </Grid>
          </Grid>
        </Box>
        
        {activeTab === 'import' ? (
          <>
            <Typography variant="h6" gutterBottom>
              Import Workflow
            </Typography>
            
            <Typography variant="body2" color="textSecondary" paragraph>
              Import workflows from JSON files. You can import workflows that were previously exported
              from this application or compatible systems.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Select Workflow File
              </Typography>
              
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              
              <Box 
                sx={{ 
                  border: '2px dashed #ccc', 
                  borderRadius: 2, 
                  p: 3, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {importFile ? (
                  <Box>
                    <FileIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      {importFile.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {(importFile.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <UploadIcon sx={{ fontSize: 48, mb: 1, color: '#aaa' }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Click to select a workflow file
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Supported format: JSON
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Import Options
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={includeData}
                    onChange={() => setIncludeData(!includeData)}
                  />
                }
                label="Import dataset data (if included in the export file)"
              />
              
              <Typography variant="body2" color="textSecondary">
                If disabled, only workflow structure and configuration will be imported.
              </Typography>
            </Box>
            
            <Box sx={{ my: 3 }}>
              <Stepper activeStep={importProgress.currentStep} orientation="vertical">
                {importProgress.steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                    {importProgress.isImporting && importProgress.currentStep === index && (
                      <StepContent>
                        <LinearProgress />
                      </StepContent>
                    )}
                  </Step>
                ))}
              </Stepper>
            </Box>
            
            {importProgress.error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Error</AlertTitle>
                {importProgress.error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ImportIcon />}
                onClick={handleImport}
                disabled={!importFile || importProgress.isImporting}
              >
                {importProgress.isImporting ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Importing...
                  </>
                ) : (
                  'Import Workflow'
                )}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              Export Workflow
            </Typography>
            
            <Typography variant="body2" color="textSecondary" paragraph>
              Export workflows to share them or create backups. You can export the workflow structure
              with or without associated data.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Select Workflow
              </Typography>
              
              {loading ? (
                <CircularProgress size={24} sx={{ my: 2 }} />
              ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Error loading workflows: {error}
                </Alert>
              ) : workflows.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No workflows found. Create a workflow first.
                </Alert>
              ) : (
                <FormControl component="fieldset" fullWidth>
                  <RadioGroup
                    value={selectedWorkflow}
                    onChange={(e) => setSelectedWorkflow(e.target.value)}
                  >
                    <Grid container spacing={2}>
                      {workflows.map((workflow) => (
                        <Grid item xs={12} sm={6} md={4} key={workflow.id}>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              border: '1px solid',
                              borderColor: selectedWorkflow === workflow.id ? 'primary.main' : 'divider',
                              backgroundColor: selectedWorkflow === workflow.id ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedWorkflow(workflow.id)}
                          >
                            <Box sx={{ display: 'flex' }}>
                              <Radio 
                                value={workflow.id} 
                                checked={selectedWorkflow === workflow.id}
                                sx={{ p: 0, mr: 1 }}
                              />
                              <Box>
                                <Typography variant="subtitle1">{workflow.name}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {workflow.description || 'No description'}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Steps: {workflow.step_count || 'N/A'} | Status: {workflow.status}
                                </Typography>
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </RadioGroup>
                </FormControl>
              )}
            </Box>
            
            <ListItem button onClick={() => togglePanel('options')}>
              <ListItemText primary="Export Options" />
              {expandedPanels.options ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            
            <Collapse in={expandedPanels.options} timeout="auto">
              <Box sx={{ pl: 4, pr: 2, py: 1 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Export Format</FormLabel>
                      <RadioGroup
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                      >
                        <FormControlLabel value="json" control={<Radio />} label="JSON" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeData}
                          onChange={() => setIncludeData(!includeData)}
                        />
                      }
                      label="Include dataset data"
                    />
                    
                    <Typography variant="body2" color="textSecondary">
                      Export will include raw data associated with the workflow.
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
            
            <ListItem button onClick={() => togglePanel('components')}>
              <ListItemText primary="Advanced: Select Components" />
              {expandedPanels.components ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            
            <Collapse in={expandedPanels.components} timeout="auto">
              <Box sx={{ pl: 4, pr: 2, py: 1 }}>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedComponents.steps}
                        onChange={() => handleComponentChange('steps')}
                        disabled
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Workflow Steps" 
                      secondary="Core workflow structure and step definitions (always included)"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedComponents.parameters}
                        onChange={() => handleComponentChange('parameters')}
                        disabled
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Step Parameters" 
                      secondary="Configuration for each workflow step (always included)"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedComponents.results}
                        onChange={() => handleComponentChange('results')}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Execution Results" 
                      secondary="Results from previous workflow executions"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedComponents.visualizations}
                        onChange={() => handleComponentChange('visualizations')}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Visualizations" 
                      secondary="Charts and visual outputs from analysis steps"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedComponents.datasets}
                        onChange={() => handleComponentChange('datasets')}
                        disabled={!includeData}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Datasets" 
                      secondary="Raw data used by the workflow"
                    />
                  </ListItem>
                </List>
              </Box>
            </Collapse>
            
            <Box sx={{ my: 3 }}>
              <Stepper activeStep={exportProgress.currentStep} orientation="vertical">
                {exportProgress.steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                    {exportProgress.isExporting && exportProgress.currentStep === index && (
                      <StepContent>
                        <LinearProgress />
                      </StepContent>
                    )}
                  </Step>
                ))}
              </Stepper>
            </Box>
            
            {exportProgress.error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Error</AlertTitle>
                {exportProgress.error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                disabled={!selectedWorkflow || exportProgress.isExporting}
              >
                {exportProgress.isExporting ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Exporting...
                  </>
                ) : (
                  'Export Workflow'
                )}
              </Button>
            </Box>
          </>
        )}
      </Paper>
      
      {/* Result Dialog */}
      <Dialog
        open={resultDialogOpen}
        onClose={() => setResultDialogOpen(false)}
      >
        <DialogTitle>
          {operationResult.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {operationResult.success ? (
              <SuccessIcon color="success" sx={{ fontSize: 48, mr: 2 }} />
            ) : (
              <ErrorIcon color="error" sx={{ fontSize: 48, mr: 2 }} />
            )}
            <DialogContentText>
              {operationResult.message}
            </DialogContentText>
          </Box>
          
          {operationResult.details && (
            <Typography variant="body2" color="textSecondary">
              {operationResult.details}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {operationResult.success && operationResult.workflow && (
            <Button 
              onClick={handleGoToWorkflow}
              color="primary"
            >
              Go to Workflow
            </Button>
          )}
          <Button onClick={() => setResultDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowImportExport;