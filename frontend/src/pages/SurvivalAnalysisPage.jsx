import React, { useState, useEffect, lazy, Suspense } from 'react';
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
  Alert,
  Snackbar
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';

// Eagerly load essential components
import DataUploader from '../components/pca/DataUploader';
import EducationalBanner from '../components/education/EducationalBanner';

// Lazy load large components
const SurvivalIntroduction = lazy(() => import('../components/survival/SurvivalIntroduction'));
const SurvivalConfiguration = lazy(() => import('../components/survival/SurvivalConfiguration'));
const SurvivalVisualization = lazy(() => import('../components/survival/SurvivalVisualization'));
const SurvivalInterpretation = lazy(() => import('../components/survival/SurvivalInterpretation'));
const SurvivalReportGenerator = lazy(() => import('../components/survival/SurvivalReportGenerator'));

const steps = [
  'Introduction',
  'Upload Data',
  'Configure Analysis',
  'Visualization',
  'Interpretation',
  'Generate Report'
];

function SurvivalAnalysisPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [dataset, setDataset] = useState(null);
  const [configuration, setConfiguration] = useState({
    analysisType: 'kaplan-meier', // 'kaplan-meier' | 'cox-regression'
    durationCol: '',
    eventCol: '',
    groupCol: '',
    covariatesCols: [],
    confidenceLevel: 0.95
  });
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Navigation handlers
  const handleNext = () => setActiveStep((prevStep) => prevStep + 1);
  const handleBack = () => setActiveStep((prevStep) => prevStep - 1);

  // Handle dataset upload
  const handleDatasetUpload = (uploadedDataset) => {
    setDataset(uploadedDataset);
    setNotification({
      open: true,
      message: 'Dataset uploaded successfully! Configure your survival analysis parameters.',
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

  // Handle running survival analysis
  const handleRunAnalysis = async () => {
    try {
      setIsLoading(true);

      // Call appropriate API based on analysis type
      const endpoint = configuration.analysisType === 'kaplan-meier'
        ? '/api/v1/survival/kaplan-meier/'
        : '/api/v1/survival/cox-regression/';

      const requestBody = {
        data: dataset.data,
        duration_col: configuration.durationCol,
        event_col: configuration.eventCol,
        ...(configuration.analysisType === 'kaplan-meier' && configuration.groupCol && {
          group_col: configuration.groupCol
        }),
        ...(configuration.analysisType === 'cox-regression' && {
          covariate_cols: configuration.covariatesCols
        }),
        confidence_level: configuration.confidenceLevel
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      setResults(result.results);

      setNotification({
        open: true,
        message: 'Survival analysis completed successfully!',
        severity: 'success'
      });

      handleNext();
    } catch (err) {
      setError(`Error running survival analysis: ${err.message}`);
      setNotification({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle report generation
  const handleGenerateReport = (reportConfig) => {
    setNotification({
      open: true,
      message: 'Report generated successfully!',
      severity: 'success'
    });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Loading component
  const StepLoadingComponent = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      <CircularProgress />
    </Box>
  );

  // Render step content
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <SurvivalIntroduction onContinue={handleNext} />
          </Suspense>
        );
      case 1:
        return <DataUploader onDatasetUpload={handleDatasetUpload} />;
      case 2:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <SurvivalConfiguration
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
          <Suspense fallback={<StepLoadingComponent />}>
            <SurvivalVisualization
              results={results}
              configuration={configuration}
            />
          </Suspense>
        );
      case 4:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <SurvivalInterpretation
              results={results}
              configuration={configuration}
              onContinue={handleNext}
            />
          </Suspense>
        );
      case 5:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <SurvivalReportGenerator
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
          Survival Analysis
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Analyze time-to-event data with Kaplan-Meier estimation and Cox regression
        </Typography>
      </Paper>

      {/* Educational Banner */}
      {activeStep === 0 && (
        <EducationalBanner module="survival" variant="default" dismissible={true} />
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

export default SurvivalAnalysisPage;
