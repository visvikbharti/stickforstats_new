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
const FactorIntroduction = lazy(() => import('../components/factor/FactorIntroduction'));
const FactorAdequacy = lazy(() => import('../components/factor/FactorAdequacy'));
const FactorConfiguration = lazy(() => import('../components/factor/FactorConfiguration'));
const FactorVisualization = lazy(() => import('../components/factor/FactorVisualization'));
const FactorInterpretation = lazy(() => import('../components/factor/FactorInterpretation'));
const FactorReportGenerator = lazy(() => import('../components/factor/FactorReportGenerator'));

const steps = [
  'Introduction',
  'Upload Data',
  'Test Adequacy',
  'Configure Analysis',
  'Visualization',
  'Interpretation',
  'Generate Report'
];

function FactorAnalysisPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [dataset, setDataset] = useState(null);
  const [adequacyResults, setAdequacyResults] = useState(null);
  const [configuration, setConfiguration] = useState({
    nFactors: null, // Auto-determined if null
    rotation: 'varimax', // 'varimax' | 'promax' | 'oblimin' | 'quartimax'
    method: 'minres', // 'minres' | 'ml' | 'principal'
    factorSelectionMethods: ['kaiser', 'scree', 'parallel']
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
      message: 'Dataset uploaded successfully! Testing data adequacy...',
      severity: 'success'
    });
    // Automatically test adequacy
    testAdequacy(uploadedDataset);
    handleNext();
  };

  // Test data adequacy (Bartlett's test, KMO)
  const testAdequacy = async (datasetToTest) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/v1/factor/adequacy/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: datasetToTest.data,
          column_names: datasetToTest.columns
        })
      });

      if (!response.ok) {
        throw new Error(`Adequacy test failed: ${response.statusText}`);
      }

      const result = await response.json();
      setAdequacyResults(result.results);

      if (result.results.adequacy_status === 'poor') {
        setNotification({
          open: true,
          message: 'Warning: Data may not be suitable for factor analysis. Check adequacy results.',
          severity: 'warning'
        });
      }
    } catch (err) {
      setError(`Error testing adequacy: ${err.message}`);
      setNotification({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle configuration changes
  const handleConfigurationChange = (newConfig) => {
    setConfiguration(prev => ({
      ...prev,
      ...newConfig
    }));
  };

  // Handle running factor analysis
  const handleRunAnalysis = async () => {
    try {
      setIsLoading(true);

      const requestBody = {
        data: dataset.data,
        column_names: dataset.columns,
        n_factors: configuration.nFactors,
        rotation: configuration.rotation,
        method: configuration.method
      };

      const response = await fetch('/api/v1/factor/efa/', {
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
        message: 'Factor analysis completed successfully!',
        severity: 'success'
      });

      handleNext();
    } catch (err) {
      setError(`Error running factor analysis: ${err.message}`);
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
            <FactorIntroduction onContinue={handleNext} />
          </Suspense>
        );
      case 1:
        return <DataUploader onDatasetUpload={handleDatasetUpload} />;
      case 2:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <FactorAdequacy
              adequacyResults={adequacyResults}
              onContinue={handleNext}
              onBack={handleBack}
            />
          </Suspense>
        );
      case 3:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <FactorConfiguration
              dataset={dataset}
              adequacyResults={adequacyResults}
              configuration={configuration}
              onChange={handleConfigurationChange}
              onRunAnalysis={handleRunAnalysis}
              isRunning={isLoading}
            />
          </Suspense>
        );
      case 4:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <FactorVisualization
              results={results}
              configuration={configuration}
            />
          </Suspense>
        );
      case 5:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <FactorInterpretation
              results={results}
              configuration={configuration}
              dataset={dataset}
              onContinue={handleNext}
            />
          </Suspense>
        );
      case 6:
        return (
          <Suspense fallback={<StepLoadingComponent />}>
            <FactorReportGenerator
              results={results}
              dataset={dataset}
              configuration={configuration}
              adequacyResults={adequacyResults}
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
          Exploratory Factor Analysis (EFA)
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Discover underlying latent variables with factor analysis and rotation methods
        </Typography>
      </Paper>

      {/* Educational Banner */}
      {activeStep === 0 && (
        <EducationalBanner module="factor" variant="default" dismissible={true} />
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
        {isLoading && activeStep !== 2 && activeStep < 4 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <CircularProgress />
          </Box>
        ) : (
          getStepContent(activeStep)
        )}
      </Paper>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        {activeStep > 0 && activeStep < 4 && activeStep !== 2 && (
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

export default FactorAnalysisPage;
