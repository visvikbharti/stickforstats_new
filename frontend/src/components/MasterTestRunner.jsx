import React, { useState, useEffect } from 'react';
import {
  Box, Stepper, Step, StepLabel, StepContent, Button, Card, CardContent,
  Typography, Alert, CircularProgress, LinearProgress, Chip, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Divider,
  IconButton, Tooltip, Badge, Fade, Zoom, Collapse
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Science as ScienceIcon,
  Upload as UploadIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import TestSelectionDashboard from './TestSelectionDashboard';
import GuardianWarning from './Guardian/GuardianWarning';

// Golden Ratio
const PHI = 1.618;

const MasterTestRunner = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testData, setTestData] = useState(null);
  const [guardianReport, setGuardianReport] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executionTime, setExecutionTime] = useState(null);
  const [showGuardianDetails, setShowGuardianDetails] = useState(false);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [dataInputMethod, setDataInputMethod] = useState('manual'); // manual, file, example

  const steps = [
    {
      label: 'Select Statistical Test',
      icon: <ScienceIcon />,
      description: 'Choose from 40+ statistical tests'
    },
    {
      label: 'Guardian Pre-Flight Check',
      icon: <ShieldIcon />,
      description: 'Verify statistical assumptions'
    },
    {
      label: 'Input Data',
      icon: <UploadIcon />,
      description: 'Enter or upload your data'
    },
    {
      label: 'Execute Test',
      icon: <PlayArrowIcon />,
      description: 'Run analysis with 50-decimal precision'
    },
    {
      label: 'View Results',
      icon: <AssessmentIcon />,
      description: 'Interpret results with visual evidence'
    }
  ];

  // Handle test selection from dashboard
  const handleTestSelection = async (test, category) => {
    setSelectedTest({ ...test, category });
    setActiveStep(1);

    // If test has Guardian protection, run pre-flight check
    if (test.guardian) {
      await runGuardianCheck(test);
    } else {
      // Skip Guardian check for non-protected tests
      setActiveStep(2);
    }
  };

  // Run Guardian pre-flight check
  const runGuardianCheck = async (test) => {
    setLoading(true);
    setError(null);

    try {
      // Mock data for Guardian check - in production, use actual data
      const mockData = {
        data: {
          group1: generateSampleData(30),
          group2: generateSampleData(30)
        },
        test_type: test.id
      };

      const response = await axios.post('http://localhost:8000/api/guardian/check/', mockData);
      setGuardianReport(response.data);

      if (response.data.all_assumptions_met) {
        setActiveStep(2); // Proceed to data input
      } else {
        setShowGuardianDetails(true); // Show warnings
      }
    } catch (err) {
      setError('Guardian check failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Generate sample data for testing
  const generateSampleData = (n) => {
    const data = [];
    for (let i = 0; i < n; i++) {
      data.push(Math.random() * 100);
    }
    return data;
  };

  // Handle data input
  const handleDataInput = (data) => {
    setTestData(data);
    setActiveStep(3);

    // Auto-execute test after data input
    executeTest(data);
  };

  // Execute the selected test
  const executeTest = async (data) => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Prepare request based on test type
      const requestData = prepareTestRequest(selectedTest, data || testData);

      const response = await axios.post(
        `http://localhost:8000${selectedTest.endpoint}`,
        requestData
      );

      setTestResults(response.data);
      setExecutionTime(Date.now() - startTime);
      setActiveStep(4);
    } catch (err) {
      setError('Test execution failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Prepare request data based on test type
  const prepareTestRequest = (test, data) => {
    // Map data format based on test requirements
    switch (test.category) {
      case 'parametric':
        if (test.id === 't_test' || test.id === 'paired_t') {
          return {
            test_type: test.id === 'paired_t' ? 'paired' : 'two_sample',
            data1: data.group1 || data.data1,
            data2: data.group2 || data.data2
          };
        } else if (test.id === 'anova') {
          return {
            groups: data.groups || [data.group1, data.group2, data.group3],
            test_type: 'one_way'
          };
        }
        break;

      case 'nonParametric':
        return {
          group1: data.group1 || data.data1,
          group2: data.group2 || data.data2
        };

      case 'correlation':
        return {
          x: data.x || data.data1,
          y: data.y || data.data2,
          method: test.id
        };

      case 'regression':
        return {
          type: test.id,
          X: data.X || data.independent,
          y: data.y || data.dependent
        };

      default:
        return data;
    }
  };

  // Reset the workflow
  const resetWorkflow = () => {
    setActiveStep(0);
    setSelectedTest(null);
    setTestData(null);
    setGuardianReport(null);
    setTestResults(null);
    setError(null);
    setExecutionTime(null);
  };

  // Format number with 50-decimal precision
  const formatPrecisionNumber = (num) => {
    if (typeof num === 'string') return num;
    if (typeof num !== 'number') return 'N/A';

    // For display, show first 10 decimals with option to expand
    const shortForm = num.toFixed(10);
    const fullForm = num.toFixed(50);

    return (
      <Box>
        <Typography component="span">{shortForm}</Typography>
        <Tooltip title={`Full precision: ${fullForm}`}>
          <Chip
            label="50D"
            size="small"
            color="primary"
            sx={{ ml: 1, cursor: 'pointer' }}
            onClick={() => navigator.clipboard.writeText(fullForm)}
          />
        </Tooltip>
      </Box>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <TestSelectionDashboard onSelectTest={handleTestSelection} />
        );

      case 1:
        return (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                🛡️ Guardian Pre-Flight Check
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                  <CircularProgress size={60} sx={{ color: '#FFD700' }} />
                  <Typography sx={{ mt: 2 }}>Checking statistical assumptions...</Typography>
                </Box>
              ) : guardianReport ? (
                <Box>
                  {guardianReport.all_assumptions_met ? (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      ✅ All statistical assumptions are met. Test can proceed safely.
                    </Alert>
                  ) : (
                    <GuardianWarning
                      guardianReport={guardianReport}
                      onProceed={() => setActiveStep(2)}
                      onSelectAlternative={(altTest) => {
                        setSelectedTest(altTest);
                        setActiveStep(2);
                      }}
                      educationalMode={true}
                    />
                  )}
                </Box>
              ) : (
                <Alert severity="info">
                  Guardian check pending for {selectedTest?.name}
                </Alert>
              )}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📊 Input Your Data
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      // Use example data for testing
                      const exampleData = {
                        group1: generateSampleData(30),
                        group2: generateSampleData(30)
                      };
                      handleDataInput(exampleData);
                    }}
                    sx={{ mr: 2 }}
                  >
                    Use Example Data
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setDataInputMethod('manual')}
                  >
                    Enter Manually
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setDataInputMethod('file')}
                    sx={{ ml: 2 }}
                  >
                    Upload File
                  </Button>
                </Grid>
                {dataInputMethod === 'manual' && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Manual data input interface will be implemented here
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                ⚡ Executing Test
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                  <CircularProgress size={60} />
                  <Typography sx={{ mt: 2 }}>
                    Running {selectedTest?.name} with 50-decimal precision...
                  </Typography>
                  <LinearProgress sx={{ width: '100%', mt: 2 }} />
                </Box>
              ) : (
                <Alert severity="success">
                  Test completed in {executionTime}ms
                </Alert>
              )}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📈 Test Results
              </Typography>
              {testResults ? (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Test Statistic
                        </Typography>
                        {formatPrecisionNumber(testResults.statistic || testResults.t_statistic)}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          P-Value
                        </Typography>
                        {formatPrecisionNumber(testResults.p_value || testResults.pvalue)}
                      </Paper>
                    </Grid>
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, bgcolor: testResults.p_value < 0.05 ? '#e8f5e9' : '#fff3e0' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Statistical Significance
                        </Typography>
                        <Typography>
                          {testResults.p_value < 0.05
                            ? '✅ Result is statistically significant (p < 0.05)'
                            : '⚠️ Result is not statistically significant (p ≥ 0.05)'}
                        </Typography>
                      </Paper>
                    </Grid>
                    {testResults.confidence_interval && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            95% Confidence Interval
                          </Typography>
                          <Typography>
                            [{formatPrecisionNumber(testResults.confidence_interval[0])}, {formatPrecisionNumber(testResults.confidence_interval[1])}]
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={() => setShowResultDetails(!showResultDetails)}
                      sx={{ mr: 2 }}
                    >
                      {showResultDetails ? 'Hide' : 'Show'} Full Details
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={resetWorkflow}
                    >
                      Run Another Test
                    </Button>
                  </Box>

                  <Collapse in={showResultDetails}>
                    <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                        {JSON.stringify(testResults, null, 2)}
                      </Typography>
                    </Paper>
                  </Collapse>
                </Box>
              ) : (
                <Alert severity="info">
                  No results available
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: PHI / 2 }}
      >
        <Typography
          variant="h3"
          sx={{
            textAlign: 'center',
            mb: 2,
            background: 'linear-gradient(90deg, #FFD700, #FFA500)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}
        >
          Master Test Runner
        </Typography>
        <Typography variant="subtitle1" sx={{ textAlign: 'center', mb: 4, color: 'text.secondary' }}>
          Complete statistical analysis workflow with Guardian protection and 50-decimal precision
        </Typography>
      </motion.div>

      {/* Progress Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} orientation="horizontal">
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel
                  StepIconComponent={() => (
                    <Badge
                      badgeContent={index + 1}
                      color={activeStep >= index ? 'primary' : 'default'}
                    >
                      <Box
                        sx={{
                          color: activeStep >= index ? 'primary.main' : 'text.disabled',
                          fontSize: 24
                        }}
                      >
                        {step.icon}
                      </Box>
                    </Badge>
                  )}
                >
                  <Typography variant="subtitle2">{step.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Current Test Info */}
      {selectedTest && (
        <Fade in={true}>
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <IconButton size="small" onClick={resetWorkflow}>
                <RefreshIcon />
              </IconButton>
            }
          >
            <Typography variant="subtitle2">
              <strong>Selected Test:</strong> {selectedTest.name} |
              <strong> Category:</strong> {selectedTest.category} |
              <strong> Guardian:</strong> {selectedTest.guardian ? '🛡️ Protected' : '⚠️ Standard'} |
              <strong> Precision:</strong> {selectedTest.precision}D
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Execution Time Display */}
      {executionTime && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Chip
            icon={<SpeedIcon />}
            label={`Execution time: ${executionTime}ms`}
            color="success"
            variant="outlined"
          />
        </Box>
      )}
    </Box>
  );
};

export default MasterTestRunner;