import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Box, 
  CircularProgress,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';

// Eagerly load small, essential components
import DataUploader from '../components/pca/DataUploader';
import PcaProgressTracker from '../components/pca/PcaProgressTracker';
import EducationalBanner from '../components/education/EducationalBanner';
// Import hooks
import { usePcaProgress } from '../hooks/usePcaProgress';
// PCA API
import { runPcaAnalysis, getPcaResults } from '../api/pcaApi';

// Lazy load large components to reduce initial bundle size
const PcaIntroduction = lazy(() => import('../components/pca/PcaIntroduction'));
const PcaConfiguration = lazy(() => import('../components/pca/PcaConfiguration'));
const PcaVisualization = lazy(() => import('../components/pca'));
const PcaInterpretation = lazy(() => import('../components/pca/PcaInterpretation'));
const PcaReportGenerator = lazy(() => import('../components/pca/PcaReportGenerator'));
const SampleGroupManager = lazy(() => import('../components/pca/SampleGroupManager'));

const steps = [
  'Introduction',
  'Upload Data',
  'Configure Analysis',
  'Visualization',
  'Interpretation',
  'Generate Report'
];

function PCAAnalysisPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [dataset, setDataset] = useState(null);
  const [configuration, setConfiguration] = useState({
    numComponents: 2,
    scalingMethod: 'standard',
    excludeColumns: [],
    groupingColumn: '',
  });
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Hook for tracking PCA analysis progress
  const { progress, currentTask, startTracking, stopTracking } = usePcaProgress(sessionId);
  
  // Load existing session if sessionId is provided
  useEffect(() => {
    if (sessionId) {
      setIsLoading(true);
      getPcaResults(sessionId)
        .then(data => {
          if (data) {
            setDataset(data.dataset);
            setConfiguration(data.configuration);
            setResults(data.results);
            setActiveStep(3); // Set to visualization step
          }
        })
        .catch(err => {
          setError(`Error loading PCA session: ${err.message}`);
          setNotification({
            open: true,
            message: `Error loading session: ${err.message}`,
            severity: 'error'
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [sessionId]);
  
  // Handle next step
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  // Handle back step
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // Handle dataset upload
  const handleDatasetUpload = (uploadedDataset) => {
    setDataset(uploadedDataset);
    setNotification({
      open: true,
      message: 'Dataset uploaded successfully!',
      severity: 'success'
    });
    handleNext();
  };
  
  // Handle configuration changes
  const handleConfigurationChange = (newConfig) => {
    setConfiguration(prev => ({
      ...prev,
      ...newConfig
    }));
  };
  
  // Handle running PCA analysis
  const handleRunAnalysis = async () => {
    try {
      setIsLoading(true);
      startTracking();
      
      const result = await runPcaAnalysis({
        datasetId: dataset.id,
        configuration
      });
      
      setResults(result);
      
      // Update URL with session ID for sharing
      navigate(`/pca-analysis/${result.sessionId}`, { replace: true });
      
      setNotification({
        open: true,
        message: 'PCA analysis completed successfully!',
        severity: 'success'
      });
      
      handleNext();
    } catch (err) {
      setError(`Error running PCA analysis: ${err.message}`);
      setNotification({
        open: true,
        message: `Error running analysis: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
      stopTracking();
    }
  };
  
  // Handle report generation
  const handleGenerateReport = (reportConfig) => {
    // Implementation would call an API endpoint to generate a report
    setNotification({
      open: true,
      message: 'Report generated and downloaded successfully!',
      severity: 'success'
    });
    // In a real implementation, this would trigger a file download
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };
  
  // Loading component for step-based code splitting
  const StepLoadingComponent = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      <CircularProgress />
    </Box>
  );

  // Render step content with code splitting
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <PcaIntroduction onContinue={handleNext} />
          </Suspense>
        );
      case 1:
        // DataUploader is loaded eagerly as it's small and essential
        return <DataUploader onDatasetUpload={handleDatasetUpload} />;
      case 2:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <PcaConfiguration
              dataset={dataset}
              configuration={configuration}
              onChange={handleConfigurationChange}
              onRunAnalysis={handleRunAnalysis}
              isRunning={isLoading}
            />
          </Suspense>
        );
      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Suspense fallback={<StepLoadingComponent />}>
                <PcaVisualization results={results} />
              </Suspense>
            </Grid>
            <Grid item xs={12}>
              <Suspense fallback={<StepLoadingComponent />}>
                <SampleGroupManager 
                  results={results} 
                  groupingColumn={configuration.groupingColumn}
                />
              </Suspense>
            </Grid>
          </Grid>
        );
      case 4:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <PcaInterpretation
              results={results}
              configuration={configuration}
              onContinue={handleNext}
            />
          </Suspense>
        );
      case 5:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <PcaReportGenerator
              results={results}
              dataset={dataset}
              configuration={configuration}
              onGenerateReport={handleGenerateReport}
            />
          </Suspense>
        );
      default:
        return 'Unknown step';
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: 'transparent' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Principal Component Analysis (PCA)
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Analyze high-dimensional data and identify patterns with PCA
        </Typography>
      </Paper>

      {/* Educational Banner - Show on Introduction step */}
      {activeStep === 0 && (
        <EducationalBanner module="pca" variant="default" dismissible={true} />
      )}

      {/* Progress Tracking */}
      {isLoading && (
        <Box sx={{ mb: 4 }}>
          <PcaProgressTracker
            progress={progress}
            currentTask={currentTask}
          />
        </Box>
      )}
      
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Stepper */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>
      
      {/* Main Content */}
      <Paper elevation={2} sx={{ p: 3, minHeight: '60vh' }}>
        {isLoading && activeStep < 3 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <CircularProgress />
          </Box>
        ) : (
          getStepContent(activeStep)
        )}
      </Paper>
      
      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        {activeStep > 0 && activeStep < 3 && (
          <Button
            variant="outlined"
            onClick={handleBack}
            sx={{ mr: 1 }}
            disabled={isLoading}
          >
            Back
          </Button>
        )}
        
        {activeStep === 0 && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
          >
            Start Analysis
          </Button>
        )}
      </Box>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default PCAAnalysisPage;