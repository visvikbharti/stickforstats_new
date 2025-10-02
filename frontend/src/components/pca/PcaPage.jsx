import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Paper, Typography, Box, Stepper, Step, StepLabel, Button, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';

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
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          Principal Component Analysis
        </Typography>
        
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
      </Box>
    </Container>
  );
};

export default PcaPage;