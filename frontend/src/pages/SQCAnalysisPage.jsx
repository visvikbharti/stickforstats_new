import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Stepper, 
  Step, 
  StepLabel, 
  Typography, 
  Paper, 
  Button, 
  Container,
  Grid,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { getWebSocketUrl } from '../config/apiConfig';

// Import components
import DataUploadStep from '../components/sqc/DataUploadStep';
import ChartConfigurationStep from '../components/sqc/ChartConfigurationStep';
import ControlChartVisualization from '../components/sqc/ControlChartVisualization';
import InterpretationPanel from '../components/sqc/InterpretationPanel';
import RecommendationsPanel from '../components/sqc/RecommendationsPanel';
import ReportGenerationPanel from '../components/sqc/ReportGenerationPanel';
import EducationalPanel from '../components/sqc/EducationalPanel';

// Import utilities and hooks
import { useSQCAnalysisAPI } from '../hooks/useSQCAnalysisAPI';
import { useWebSocket } from '../hooks/useWebSocket';
import { useReportAPI } from '../hooks/useReportAPI';

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const stepVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
};

// Main SQC Analysis Page component
const SQCAnalysisPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { sessionId } = useParams();
  
  // Refs
  const chartContainerRef = useRef(null);
  
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [dataset, setDataset] = useState(null);
  const [configuration, setConfiguration] = useState({
    chartType: 'xbar_r',
    parameterColumn: '',
    groupingColumn: '',
    sampleSize: 5,
    detectRules: true,
    ruleSet: 'western_electric'
  });
  const [analysisSession, setAnalysisSession] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [educationalContent, setEducationalContent] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [processingStatus, setProcessingStatus] = useState({ isProcessing: false, progress: 0, message: '' });
  
  // API hooks
  const { 
    uploadDataset, 
    createAnalysisSession,
    runControlChartAnalysis,
    getAnalysisResult,
    getRecommendations,
    getEducationalContent,
    isLoading, 
    error 
  } = useSQCAnalysisAPI();
  
  const { 
    generateReport, 
    downloadReport,
    reportIsGenerating
  } = useReportAPI();
  
  // WebSocket for real-time updates
  const { lastMessage, sendMessage, connectionStatus } = useWebSocket(
    sessionId ? getWebSocketUrl(`sqc/analysis/${sessionId}/`) : null
  );
  
  // Load existing session if sessionId is provided
  useEffect(() => {
    if (sessionId) {
      // Load the existing session and set appropriate step
      const loadSession = async () => {
        try {
          setProcessingStatus({ isProcessing: true, progress: 0, message: 'Loading existing analysis...' });
          const session = await getAnalysisResult(sessionId);
          
          if (session) {
            setAnalysisSession(session);
            setDataset(session.dataset);
            setConfiguration(session.configuration);
            setAnalysisResult(session.result);
            
            // Set the appropriate step (viewing results)
            setActiveStep(2);
            
            // Load recommendations
            const recs = await getRecommendations(sessionId);
            setRecommendations(recs);
            
            // Load educational content
            const eduContent = await getEducationalContent(session.result.analysis_type);
            setEducationalContent(eduContent);
          }
        } catch (err) {
          setNotification({
            open: true,
            message: `Error loading analysis session: ${err.message}`,
            severity: 'error'
          });
        } finally {
          setProcessingStatus({ isProcessing: false, progress: 100, message: '' });
        }
      };
      
      loadSession();
    }
  }, [sessionId, getAnalysisResult, getRecommendations, getEducationalContent]);
  
  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        if (data.type === 'status_update') {
          // Update progress
          setProcessingStatus(prev => ({
            ...prev,
            progress: data.data.progress || prev.progress,
            message: data.data.message || prev.message
          }));
        } else if (data.type === 'analysis_complete') {
          // Analysis is complete, update result
          setAnalysisResult(data.data.result);
          setProcessingStatus({ isProcessing: false, progress: 100, message: '' });
          
          // Show notification
          setNotification({
            open: true,
            message: 'Analysis completed successfully!',
            severity: 'success'
          });
          
          // Get recommendations
          getRecommendations(data.data.session_id).then(setRecommendations);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    }
  }, [lastMessage, getRecommendations]);
  
  // Handle dataset upload
  const handleDatasetUpload = async (uploadedDataset) => {
    setDataset(uploadedDataset);
    setNotification({
      open: true,
      message: 'Dataset uploaded successfully!',
      severity: 'success'
    });
    
    // Move to the next step
    setActiveStep(1);
  };
  
  // Handle configuration changes
  const handleConfigurationChange = (newConfig) => {
    setConfiguration(prevConfig => ({
      ...prevConfig,
      ...newConfig
    }));
  };
  
  // Handle analysis submission
  const handleSubmitAnalysis = async () => {
    try {
      setProcessingStatus({ 
        isProcessing: true, 
        progress: 0, 
        message: 'Creating analysis session...' 
      });
      
      // Create a new analysis session
      const session = await createAnalysisSession({
        datasetId: dataset.id,
        name: `SQC Analysis - ${configuration.chartType} Chart`,
        module: 'sqc',
        description: `Control chart analysis using ${configuration.chartType} chart`
      });
      
      setAnalysisSession(session);
      setProcessingStatus({ 
        isProcessing: true, 
        progress: 20, 
        message: 'Running control chart analysis...' 
      });
      
      // Connect to WebSocket for real-time updates
      if (connectionStatus !== 'Open') {
        // Wait for connection to open
        setTimeout(() => {
          sendMessage(JSON.stringify({
            type: 'request_status',
            session_id: session.id
          }));
        }, 1000);
      } else {
        sendMessage(JSON.stringify({
          type: 'request_status',
          session_id: session.id
        }));
      }
      
      // Run the control chart analysis
      const result = await runControlChartAnalysis({
        sessionId: session.id,
        ...configuration
      });
      
      setAnalysisResult(result);
      setProcessingStatus({ isProcessing: false, progress: 100, message: '' });
      
      // Get recommendations
      const recs = await getRecommendations(session.id);
      setRecommendations(recs);
      
      // Get educational content
      const eduContent = await getEducationalContent(result.analysis_type);
      setEducationalContent(eduContent);
      
      // Move to the next step
      setActiveStep(2);
      
      // Show notification
      setNotification({
        open: true,
        message: 'Analysis completed successfully!',
        severity: 'success'
      });
      
      // Update URL with session ID for sharing
      navigate(`/sqc/analysis/${session.id}`, { replace: true });
      
    } catch (err) {
      setProcessingStatus({ isProcessing: false, progress: 0, message: '' });
      setNotification({
        open: true,
        message: `Error running analysis: ${err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Handle report generation
  const handleGenerateReport = async (reportConfig) => {
    try {
      if (!analysisSession) return;
      
      const reportId = await generateReport({
        sessionId: analysisSession.id,
        format: reportConfig.format || 'pdf',
        includeInterpretation: reportConfig.includeInterpretation || true,
        includeVisualization: reportConfig.includeVisualization || true,
        includeRawData: reportConfig.includeRawData || false,
        title: reportConfig.title || `SQC Analysis Report - ${configuration.chartType} Chart`
      });
      
      setNotification({
        open: true,
        message: 'Report generated successfully! Downloading...',
        severity: 'success'
      });
      
      // Download the report
      await downloadReport(reportId);
      
    } catch (err) {
      setNotification({
        open: true,
        message: `Error generating report: ${err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Handle recommendation click
  const handleRecommendationClick = (recommendation) => {
    // Handle different recommendation types
    if (recommendation.action_type === 'analysis' && recommendation.analysis_type) {
      // Start a new analysis of the recommended type
      navigate(`/sqc/${recommendation.analysis_type}`);
    } else if (recommendation.action_type === 'education' && recommendation.resource_id) {
      // Load and display the educational content
      getEducationalContent(recommendation.resource_id).then(setEducationalContent);
    }
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Render steps content
  const getStepContent = (step) => {
    switch (step) {
      case 0: // Data Upload
        return (
          <motion.div
            variants={stepVariants}
            initial="hidden"
            animate="visible"
          >
            <DataUploadStep
              onDatasetUpload={handleDatasetUpload}
              isLoading={isLoading}
            />
          </motion.div>
        );
      case 1: // Chart Configuration
        return (
          <motion.div
            variants={stepVariants}
            initial="hidden"
            animate="visible"
          >
            <ChartConfigurationStep
              dataset={dataset}
              configuration={configuration}
              onChange={handleConfigurationChange}
              onSubmit={handleSubmitAnalysis}
              isSubmitting={processingStatus.isProcessing}
            />
          </motion.div>
        );
      case 2: // Results and Interpretation
        return (
          <motion.div
            variants={stepVariants}
            initial="hidden"
            animate="visible"
          >
            <Grid container spacing={3}>
              {/* Control Chart Visualization */}
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 3, mb: 3 }} ref={chartContainerRef}>
                  <Typography variant="h5" gutterBottom>
                    {configuration.chartType.toUpperCase()} Chart Analysis
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  {analysisResult ? (
                    <ControlChartVisualization
                      chartData={analysisResult}
                      chartType={configuration.chartType}
                      onPointClick={(data) => console.log('Point clicked:', data)}
                      isLoading={false}
                    />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                      <CircularProgress />
                    </Box>
                  )}
                </Paper>
              </Grid>
              
              {/* Interpretation and Recommendations */}
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3, mb: 3, height: '100%' }}>
                  <InterpretationPanel
                    interpretation={analysisResult?.chart_interpretation || ''}
                    statistics={analysisResult?.process_statistics || {}}
                  />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3, mb: 3, height: '100%' }}>
                  <RecommendationsPanel
                    recommendations={recommendations}
                    onRecommendationClick={handleRecommendationClick}
                  />
                </Paper>
              </Grid>
              
              {/* Educational Content */}
              {educationalContent && (
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <EducationalPanel content={educationalContent} />
                  </Paper>
                </Grid>
              )}
              
              {/* Report Generation */}
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 3 }}>
                  <ReportGenerationPanel
                    onGenerateReport={handleGenerateReport}
                    isGenerating={reportIsGenerating}
                  />
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        );
      default:
        return 'Unknown step';
    }
  };
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'transparent' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Statistical Quality Control Analysis
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Create, analyze, and interpret control charts and other SQC tools
            </Typography>
          </Paper>
          
          {/* Stepper */}
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              <Step>
                <StepLabel>Upload Data</StepLabel>
              </Step>
              <Step>
                <StepLabel>Configure Analysis</StepLabel>
              </Step>
              <Step>
                <StepLabel>View Results</StepLabel>
              </Step>
            </Stepper>
          </Paper>
          
          {/* Processing Indicator */}
          {processingStatus.isProcessing && (
            <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
              <Box display="flex" alignItems="center">
                <CircularProgress 
                  variant={processingStatus.progress ? "determinate" : "indeterminate"} 
                  value={processingStatus.progress} 
                  size={40} 
                  sx={{ mr: 2 }} 
                />
                <Box>
                  <Typography variant="h6">Processing Analysis</Typography>
                  <Typography variant="body2">{processingStatus.message}</Typography>
                </Box>
              </Box>
            </Paper>
          )}
          
          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>
          )}
          
          {/* Main Content */}
          <Paper elevation={2} sx={{ p: 3, minHeight: '50vh' }}>
            {getStepContent(activeStep)}
          </Paper>
          
          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            {activeStep > 0 && (
              <Button
                variant="outlined"
                onClick={() => setActiveStep((prevStep) => prevStep - 1)}
                sx={{ mr: 1 }}
                disabled={processingStatus.isProcessing}
              >
                Back
              </Button>
            )}
            
            {activeStep === 1 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmitAnalysis}
                disabled={processingStatus.isProcessing || !dataset}
              >
                {processingStatus.isProcessing ? 'Processing...' : 'Run Analysis'}
              </Button>
            )}
          </Box>
        </Container>
        
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
      </motion.div>
    </AnimatePresence>
  );
};

export default SQCAnalysisPage;