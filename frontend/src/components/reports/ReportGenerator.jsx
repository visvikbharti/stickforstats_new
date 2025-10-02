import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  Assignment as ReportIcon,
  Description as FileIcon,
  Assessment as AnalysisIcon,
  Image as ImageIcon,
  TableChart as DataIcon,
  Settings as SettingsIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useReportAPI } from '../../hooks/useReportAPI';

/**
 * Component for generating new reports
 */
const ReportGenerator = () => {
  const navigate = useNavigate();
  const { 
    loading, 
    error, 
    currentReport,
    generateReport,
    downloadReport
  } = useReportAPI();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('pdf');
  const [includeVisualizations, setIncludeVisualizations] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalyses, setSelectedAnalyses] = useState([]);
  
  // Validation state
  const [titleError, setTitleError] = useState('');
  const [analysesError, setAnalysesError] = useState('');
  
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);
  
  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  
  // Mock analyses (in a real app, these would come from an API)
  useEffect(() => {
    // Simulate loading analyses from API
    const loadedAnalyses = [
      { 
        id: '1', 
        title: 'Statistical Test Results - Dataset A', 
        type: 'statistical_test',
        created_at: '2023-05-15T12:30:45Z',
        has_visualizations: true 
      },
      { 
        id: '2', 
        title: 'Descriptive Statistics Summary', 
        type: 'descriptive_statistics',
        created_at: '2023-05-16T09:15:20Z',
        has_visualizations: true 
      },
      { 
        id: '3', 
        title: 'Regression Analysis Results', 
        type: 'regression',
        created_at: '2023-05-17T14:22:10Z',
        has_visualizations: true 
      },
      { 
        id: '4', 
        title: 'ANOVA Results - Experiment B', 
        type: 'anova',
        created_at: '2023-05-18T11:05:33Z',
        has_visualizations: true 
      },
      { 
        id: '5', 
        title: 'Correlation Matrix', 
        type: 'correlation',
        created_at: '2023-05-19T10:45:00Z',
        has_visualizations: true 
      }
    ];
    
    setAnalyses(loadedAnalyses);
  }, []);
  
  // Steps definition
  const steps = [
    {
      label: 'Report Information',
      description: 'Enter basic information about the report',
      content: (
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Report Title"
                required
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={!!titleError}
                helperText={titleError}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="format-label">Format</InputLabel>
                <Select
                  labelId="format-label"
                  value={format}
                  label="Format"
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="html">HTML</MenuItem>
                  <MenuItem value="docx">DOCX</MenuItem>
                </Select>
                <FormHelperText>Select the output format for your report</FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: 'Select Analyses',
      description: 'Choose the analyses to include in the report',
      content: (
        <Box sx={{ pt: 2 }}>
          {analysesError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {analysesError}
            </Alert>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Available Analyses
          </Typography>
          
          <Paper variant="outlined" sx={{ mb: 3, maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {analyses.map((analysis) => (
                <ListItem key={analysis.id}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedAnalyses.includes(analysis.id)}
                      onChange={() => {
                        setSelectedAnalyses(prev => 
                          prev.includes(analysis.id)
                            ? prev.filter(id => id !== analysis.id)
                            : [...prev, analysis.id]
                        );
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={analysis.title}
                    secondary={`Type: ${analysis.type.replace('_', ' ')} | Created: ${new Date(analysis.created_at).toLocaleDateString()}`}
                  />
                  {analysis.has_visualizations && (
                    <Chip size="small" icon={<ImageIcon />} label="Visualizations" />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
          
          <Typography variant="subtitle1" gutterBottom>
            Selected Analyses ({selectedAnalyses.length})
          </Typography>
          
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: selectedAnalyses.length === 0 ? 'grey.100' : 'background.paper',
              minHeight: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: selectedAnalyses.length === 0 ? 'center' : 'flex-start',
              flexWrap: 'wrap',
              gap: 1
            }}
          >
            {selectedAnalyses.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No analyses selected. Choose at least one analysis to include in the report.
              </Typography>
            ) : (
              selectedAnalyses.map((id) => {
                const analysis = analyses.find(a => a.id === id);
                return analysis ? (
                  <Chip
                    key={id}
                    label={analysis.title}
                    onDelete={() => {
                      setSelectedAnalyses(prev => prev.filter(analId => analId !== id));
                    }}
                  />
                ) : null;
              })
            )}
          </Paper>
        </Box>
      )
    },
    {
      label: 'Options',
      description: 'Configure additional report options',
      content: (
        <Box sx={{ pt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Report Content Options
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2 }}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeVisualizations}
                    onChange={(e) => setIncludeVisualizations(e.target.checked)}
                  />
                }
                label="Include visualizations"
              />
              <FormHelperText>
                Charts, graphs, and other visual elements will be included in the report
              </FormHelperText>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeRawData}
                    onChange={(e) => setIncludeRawData(e.target.checked)}
                  />
                }
                label="Include raw data tables"
              />
              <FormHelperText>
                Data tables will be included in an appendix section
              </FormHelperText>
            </FormGroup>
          </Paper>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Report Summary
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  Title:
                </Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  {title || 'Untitled Report'}
                </Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  Format:
                </Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  {format.toUpperCase()}
                </Typography>
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  Analyses:
                </Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">
                  {selectedAnalyses.length} selected
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  Options:
                </Typography>
              </Grid>
              <Grid item xs={8}>
                <Box>
                  {includeVisualizations && (
                    <Chip
                      size="small"
                      icon={<ImageIcon />}
                      label="Visualizations"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  )}
                  {includeRawData && (
                    <Chip
                      size="small"
                      icon={<DataIcon />}
                      label="Raw Data"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )
    }
  ];
  
  // Handle navigation and validation
  const handleNext = () => {
    // Validate current step
    if (activeStep === 0) {
      if (!title.trim()) {
        setTitleError('Report title is required');
        return;
      } else {
        setTitleError('');
      }
    } else if (activeStep === 1) {
      if (selectedAnalyses.length === 0) {
        setAnalysesError('Please select at least one analysis');
        return;
      } else {
        setAnalysesError('');
      }
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  const handleGenerate = async () => {
    try {
      // Prepare the analyses array
      const analysisList = selectedAnalyses.map(id => {
        const analysis = analyses.find(a => a.id === id);
        return {
          id,
          title: analysis.title,
          type: analysis.type
        };
      });
      
      // Generate the report
      const reportData = await generateReport({
        title,
        description,
        analyses: analysisList,
        format,
        includeVisualizations,
        includeRawData
      });
      
      // Set generation complete
      setGenerationComplete(true);
      
      // Show success dialog
      setSuccessDialogOpen(true);
    } catch (err) {
      console.error('Error generating report:', err);
    }
  };
  
  const handleDownload = async () => {
    if (!currentReport) return;
    
    try {
      await downloadReport(currentReport.id);
    } catch (err) {
      console.error('Error downloading report:', err);
    }
  };
  
  const handleViewReports = () => {
    navigate('/reports');
  };
  
  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => navigate('/reports')}
          sx={{ mr: 2 }}
        >
          Back to Reports
        </Button>
        
        <Typography variant="h4" component="h1">
          Generate Report
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  <Typography variant="caption">{step.description}</Typography>
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mb: 2, mt: 3 }}>
                  <div>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      startIcon={<BackIcon />}
                      sx={{ mr: 1 }}
                    >
                      Back
                    </Button>
                    
                    {index === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleGenerate}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={24} /> : <ReportIcon />}
                      >
                        {loading ? 'Generating...' : 'Generate Report'}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        endIcon={<NextIcon />}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        
        {generationComplete && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <AlertTitle>Report Generated Successfully</AlertTitle>
              Your report has been generated and is ready to download.
            </Alert>
            
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FileIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    {currentReport?.title || title}
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">
                      Format:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Chip 
                      label={format.toUpperCase()} 
                      size="small" 
                      color={format === 'pdf' ? 'error' : format === 'html' ? 'primary' : 'info'}
                    />
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">
                      Analyses:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {selectedAnalyses.length} included
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">
                      Created:
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      {currentReport?.created_at ? 
                        new Date(currentReport.created_at).toLocaleString() : 
                        new Date().toLocaleString()
                      }
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
              <CardActions>
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  color="primary"
                  variant="contained"
                >
                  Download Report
                </Button>
              </CardActions>
            </Card>
          </Box>
        )}
      </Paper>
      
      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={() => setSuccessDialogOpen(false)}
      >
        <DialogTitle>Report Generated Successfully</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CheckIcon color="success" sx={{ fontSize: 48, mr: 2 }} />
            <DialogContentText>
              Your report has been generated successfully and is ready to download.
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleViewReports}>
            View All Reports
          </Button>
          <Button
            onClick={handleDownload}
            color="primary"
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            Download Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportGenerator;