import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Paper, Typography, Box, Stepper, Step, StepLabel, Button, Alert, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardIcon from '@mui/icons-material/Keyboard';

import LoadingOverlay from '../common/LoadingOverlay';
import PcaIntroduction from './PcaIntroduction';
import DataUploader from './DataUploader';
import SampleGroupManager from './SampleGroupManager';
import PcaConfiguration from './PcaConfiguration';
import PcaVisualization from './PcaVisualization';
import PcaInterpretation from './PcaInterpretation';
import PcaReportGenerator from './PcaReportGenerator';

import { fetchPcaProject, fetchPcaResults } from '../../api/pcaApi';
import useWebSocket from '../../hooks/useWebSocket';

const steps = [
  'Introduction', 
  'Upload Data', 
  'Configure Groups', 
  'Run Analysis', 
  'Visualize Results',
  'Interpret Results',
  'Generate Report'
];

const PcaPage = () => {
  const theme = useTheme();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [project, setProject] = useState(null);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [socket, setSocket] = useState(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  // WebSocket connection for real-time updates
  const wsUrl = projectId ?
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/pca_analysis/${projectId}/` :
    null;

  const { lastMessage, connectionStatus } = useWebSocket(wsUrl);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);

        // Handle general project-level updates
        if (data.type === 'new_result') {
          // A new result has been added to the project
          loadProjectData();
        } else if (data.type === 'new_visualization') {
          // A new visualization has been created
          loadProjectData();
        } else if (data.type === 'project_updated') {
          // The project has been updated
          loadProjectData();
        }

        // Analysis progress will be handled by PcaProgressTracker component
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const projectData = await fetchPcaProject(projectId);
      setProject(projectData);
      
      // If the project has results, fetch the latest one
      if (projectData.results_count > 0 && projectData.latest_result) {
        const resultData = await fetchPcaResults(projectData.latest_result.id);
        setLatestResult(resultData);
        
        // Automatically advance to visualization step if we have results
        if (activeStep < 4) {
          setActiveStep(4);
        }
      }
    } catch (err) {
      setError(`Failed to load project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'n':
          if (activeStep < steps.length - 1 && !isRunningAnalysis) {
            handleNext();
          }
          break;
        case 'ArrowLeft':
        case 'b':
          if (activeStep > 0) {
            handleBack();
          }
          break;
        case '?':
        case 'h':
          setHelpDialogOpen(true);
          break;
        case 'Escape':
          setHelpDialogOpen(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, isRunningAnalysis]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <PcaIntroduction onNext={handleNext} />;
      case 1:
        return <DataUploader 
                 projectId={projectId} 
                 onDataUploaded={loadProjectData} 
                 onNext={handleNext} 
               />;
      case 2:
        return <SampleGroupManager 
                 projectId={projectId} 
                 project={project}
                 onGroupsConfigured={loadProjectData} 
                 onNext={handleNext} 
               />;
      case 3:
        return <PcaConfiguration 
                 projectId={projectId} 
                 project={project}
                 isRunningAnalysis={isRunningAnalysis}
                 analysisProgress={analysisProgress}
                 onAnalysisStarted={() => setIsRunningAnalysis(true)}
                 onAnalysisCompleted={() => {
                   setIsRunningAnalysis(false);
                   loadProjectData();
                   handleNext();
                 }}
                 onNext={handleNext} 
               />;
      case 4:
        return <PcaVisualization 
                 projectId={projectId} 
                 resultId={latestResult?.id}
                 onNext={handleNext} 
               />;
      case 5:
        return <PcaInterpretation 
                 projectId={projectId} 
                 resultId={latestResult?.id}
                 onNext={handleNext} 
               />;
      case 6:
        return <PcaReportGenerator 
                 projectId={projectId} 
                 resultId={latestResult?.id}
               />;
      default:
        return <PcaIntroduction onNext={handleNext} />;
    }
  };

  if (loading && !project) {
    return <LoadingOverlay message="Loading PCA project..." />;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
            Principal Component Analysis
          </Typography>
          <Tooltip title="View keyboard shortcuts and help">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              sx={{ position: 'absolute', right: 0 }}
              color="primary"
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ width: '100%', mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            minHeight: '70vh',
            position: 'relative' 
          }}
        >
          {renderStepContent()}
        </Paper>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          
          {activeStep < steps.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={
                // Disable next button if no project data yet
                (activeStep >= 2 && !project) ||
                // Disable next button if running analysis
                (activeStep === 3 && isRunningAnalysis) ||
                // Disable next button if no results yet
                (activeStep >= 3 && !latestResult)
              }
            >
              Next
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={() => navigate('/dashboard')}
            >
              Finish
            </Button>
          )}
        </Box>

        {/* Help Dialog */}
        <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyboardIcon />
            Keyboard Shortcuts & Quick Help
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
              Navigation Shortcuts
            </Typography>
            <List>
              <ListItem>
                <Chip label="→" sx={{ mr: 2, minWidth: 60 }} /> or <Chip label="N" sx={{ mx: 2, minWidth: 60 }} />
                <ListItemText primary="Go to next step" />
              </ListItem>
              <ListItem>
                <Chip label="←" sx={{ mr: 2, minWidth: 60 }} /> or <Chip label="B" sx={{ mx: 2, minWidth: 60 }} />
                <ListItemText primary="Go to previous step" />
              </ListItem>
              <ListItem>
                <Chip label="?" sx={{ mr: 2, minWidth: 60 }} /> or <Chip label="H" sx={{ mx: 2, minWidth: 60 }} />
                <ListItemText primary="Show this help dialog" />
              </ListItem>
              <ListItem>
                <Chip label="ESC" sx={{ mr: 2, minWidth: 60 }} />
                <ListItemText primary="Close dialogs" />
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Workflow Steps
            </Typography>
            <List dense>
              {steps.map((step, index) => (
                <ListItem key={step}>
                  <Chip
                    label={index + 1}
                    size="small"
                    color={activeStep === index ? 'primary' : 'default'}
                    sx={{ mr: 2, minWidth: 40 }}
                  />
                  <ListItemText
                    primary={step}
                    secondary={
                      index === 0 ? 'Learn about PCA fundamentals with interactive visualizations' :
                      index === 1 ? 'Upload your gene expression data or create a demo project' :
                      index === 2 ? 'Organize samples into groups for visualization' :
                      index === 3 ? 'Configure PCA parameters and run the analysis' :
                      index === 4 ? 'Explore PCA plots, loadings, and variance explained' :
                      index === 5 ? 'Understand and interpret your PCA results' :
                      index === 6 ? 'Generate comprehensive PDF reports'
                      : ''
                    }
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Tips & Features
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="🎓 Interactive Learning"
                  secondary="Start with the Introduction tab to learn PCA visually with step-by-step animations"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="📊 Demo Mode"
                  secondary="Create demo projects to explore the interface without uploading your own data"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="⚡ Offline Support"
                  secondary="Core functionality works offline with fallback demo mode"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="💾 Export Data"
                  secondary="Export visualization data as JSON for further analysis"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="🔄 Real-time Updates"
                  secondary="Analysis results update in real-time via WebSocket connection"
                />
              </ListItem>
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHelpDialogOpen(false)} variant="contained">
              Got it!
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default PcaPage;