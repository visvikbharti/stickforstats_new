import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Science as ScienceIcon,
  Shield as ShieldIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  DataUsage as DataIcon,
  Timeline as TimelineIcon,
  Psychology as PsychologyIcon,
  Speed as SpeedIcon,
  Fingerprint as FingerprintIcon,
  AutoAwesome as AutoIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import DataInput from './DataInput';
import ResultsDisplay from './ResultsDisplay';
import VisualEvidence from './VisualEvidence';
import StatisticalTestService from '../services/StatisticalTestService';
import { useDarkMode } from '../context/DarkModeContext';

const UnifiedTestExecutor = () => {
  const { darkMode } = useDarkMode();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [testConfig, setTestConfig] = useState(null);
  const [loadedData, setLoadedData] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [guardianStatus, setGuardianStatus] = useState(null);
  const [testRecommendation, setTestRecommendation] = useState(null);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [testParameters, setTestParameters] = useState({});
  const [executionHistory, setExecutionHistory] = useState([]);

  const steps = [
    'Load Data',
    'Select Test',
    'Configure Parameters',
    'Guardian Validation',
    'Execute Test',
    'View Results'
  ];

  useEffect(() => {
    checkGuardianHealth();
  }, []);

  const checkGuardianHealth = async () => {
    const health = await StatisticalTestService.checkGuardianHealth();
    setGuardianStatus(health);

    if (!health.isOperational) {
      enqueueSnackbar('Guardian System offline - results may be less reliable', {
        variant: 'warning',
        persist: true
      });
    }
  };

  const handleDataLoaded = (dataInfo) => {
    setLoadedData(dataInfo);
    enqueueSnackbar(`Data loaded: ${dataInfo.data.length} rows, ${dataInfo.columns.length} columns`, {
      variant: 'success'
    });

    if (dataInfo.validation && dataInfo.validation.warnings.length > 0) {
      dataInfo.validation.warnings.forEach(warning => {
        enqueueSnackbar(warning, { variant: 'warning' });
      });
    }

    setActiveStep(1);

    if (dataInfo.data.length >= 10) {
      requestTestRecommendation(dataInfo);
    }
  };

  const requestTestRecommendation = async (dataInfo) => {
    try {
      const recommendation = await StatisticalTestService.getTestRecommendation(
        dataInfo.data.slice(0, 100),
        'Analyze statistical significance'
      );

      if (recommendation.success) {
        setTestRecommendation(recommendation);
        setShowRecommendationDialog(true);
      }
    } catch (error) {
      console.warn('Could not get test recommendation:', error);
    }
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    setSelectedTest('');
    setTestConfig(null);
  };

  const handleTestChange = (event) => {
    const testKey = event.target.value;
    setSelectedTest(testKey);

    const category = StatisticalTestService.testCategories[selectedCategory];
    if (category && category.tests[testKey]) {
      const test = category.tests[testKey];
      setTestConfig({
        ...test,
        categoryName: category.name,
        categoryKey: selectedCategory
      });

      const sampleSize = loadedData?.data?.length || 0;
      if (test.minSampleSize && sampleSize < test.minSampleSize) {
        enqueueSnackbar(
          `Warning: Sample size (${sampleSize}) is below minimum (${test.minSampleSize}) for ${test.name}`,
          { variant: 'warning' }
        );
      }
    }
  };

  const handleParameterChange = (param, value) => {
    setTestParameters(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const prepareTestData = () => {
    if (!loadedData || !testConfig) return null;

    const data = loadedData.data;
    const columns = loadedData.columns;
    const numericColumns = columns.filter(col =>
      loadedData.dataTypes[col] === 'numeric'
    );

    let preparedData = {};

    switch (selectedCategory) {
      case 'parametric':
        if (selectedTest === 'tTest') {
          const variant = testParameters.variant || 'one_sample';
          if (variant === 'one_sample') {
            preparedData.data1 = data.map(row => parseFloat(row[numericColumns[0]]));
          } else if (variant === 'two_sample') {
            if (numericColumns.length >= 2) {
              preparedData.data1 = data.map(row => parseFloat(row[numericColumns[0]]));
              preparedData.data2 = data.map(row => parseFloat(row[numericColumns[1]]));
            } else {
              const midpoint = Math.floor(data.length / 2);
              preparedData.data1 = data.slice(0, midpoint).map(row => parseFloat(row[numericColumns[0]]));
              preparedData.data2 = data.slice(midpoint).map(row => parseFloat(row[numericColumns[0]]));
            }
          } else if (variant === 'paired') {
            preparedData.data1 = data.map(row => parseFloat(row[numericColumns[0]]));
            preparedData.data2 = data.map(row => parseFloat(row[numericColumns[1]] || row[numericColumns[0]]));
          }
        } else if (selectedTest === 'anova') {
          preparedData.groups = [];
          const groupColumn = columns.find(col => loadedData.dataTypes[col] === 'categorical');
          const valueColumn = numericColumns[0];

          if (groupColumn) {
            const groups = {};
            data.forEach(row => {
              const group = row[groupColumn];
              if (!groups[group]) groups[group] = [];
              groups[group].push(parseFloat(row[valueColumn]));
            });
            preparedData.groups = Object.values(groups);
          } else {
            const groupSize = Math.ceil(data.length / 3);
            preparedData.groups = [
              data.slice(0, groupSize).map(row => parseFloat(row[valueColumn])),
              data.slice(groupSize, groupSize * 2).map(row => parseFloat(row[valueColumn])),
              data.slice(groupSize * 2).map(row => parseFloat(row[valueColumn]))
            ];
          }
        }
        break;

      case 'correlation':
        if (numericColumns.length >= 2) {
          preparedData.x = data.map(row => parseFloat(row[numericColumns[0]]));
          preparedData.y = data.map(row => parseFloat(row[numericColumns[1]]));
        }
        break;

      case 'nonparametric':
        preparedData.data = data.map(row =>
          numericColumns.map(col => parseFloat(row[col]))
        );
        break;

      case 'categorical':
        const categoricalColumns = columns.filter(col =>
          loadedData.dataTypes[col] === 'categorical'
        );

        if (categoricalColumns.length >= 2) {
          const contingencyTable = {};
          data.forEach(row => {
            const row_val = row[categoricalColumns[0]];
            const col_val = row[categoricalColumns[1]];
            if (!contingencyTable[row_val]) contingencyTable[row_val] = {};
            if (!contingencyTable[row_val][col_val]) contingencyTable[row_val][col_val] = 0;
            contingencyTable[row_val][col_val]++;
          });

          preparedData.table = Object.values(contingencyTable).map(row =>
            Object.values(row)
          );
        }
        break;

      default:
        preparedData.data = data;
    }

    return preparedData;
  };

  const executeTest = async () => {
    if (!loadedData || !testConfig) {
      enqueueSnackbar('Please load data and select a test', { variant: 'error' });
      return;
    }

    setIsExecuting(true);
    setActiveStep(4);

    try {
      const testData = prepareTestData();
      if (!testData) {
        throw new Error('Failed to prepare data for test');
      }

      let result;

      switch (selectedCategory) {
        case 'parametric':
          const testType = selectedTest === 'tTest' ?
            `t-test-${testParameters.variant || 'one'}` :
            selectedTest === 'anova' ? 'anova-one-way' : selectedTest;

          result = await StatisticalTestService.runParametricTest(
            testType,
            testData,
            testParameters
          );
          break;

        case 'correlation':
          const method = testConfig.method || 'pearson';
          result = await StatisticalTestService.runCorrelationTest(
            method,
            testData.x,
            testData.y,
            testParameters
          );
          break;

        case 'nonparametric':
          result = await StatisticalTestService.runNonParametricTest(
            selectedTest.replace(/([A-Z])/g, '-$1').toLowerCase(),
            testData,
            testParameters
          );
          break;

        case 'categorical':
          result = await StatisticalTestService.runCategoricalTest(
            selectedTest.replace(/([A-Z])/g, '-$1').toLowerCase(),
            testData,
            testParameters
          );
          break;

        case 'powerAnalysis':
          result = await StatisticalTestService.runPowerAnalysis(
            selectedTest,
            { ...testData, ...testParameters }
          );
          break;

        case 'missingData':
          result = await StatisticalTestService.handleMissingData(
            selectedTest,
            testData.data,
            testParameters
          );
          break;

        default:
          throw new Error(`Unknown category: ${selectedCategory}`);
      }

      if (result.success) {
        setTestResults(result);
        setActiveStep(5);

        const historyEntry = {
          id: Date.now(),
          testName: testConfig.name,
          category: testConfig.categoryName,
          timestamp: new Date().toISOString(),
          success: true,
          pValue: result.main_results?.p_value,
          sampleSize: loadedData.data.length
        };
        setExecutionHistory(prev => [historyEntry, ...prev.slice(0, 9)]);

        enqueueSnackbar('Test completed successfully!', { variant: 'success' });
      } else {
        throw new Error(result.error || 'Test execution failed');
      }
    } catch (error) {
      enqueueSnackbar(`Test execution failed: ${error.message}`, { variant: 'error' });
      console.error('Test execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const renderTestSelection = () => {
    const categories = StatisticalTestService.getCategorySummary();

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Test Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={handleCategoryChange}
              label="Test Category"
            >
              {categories.map(cat => (
                <MenuItem key={cat.key} value={cat.key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography>{cat.name}</Typography>
                    <Chip
                      size="small"
                      label={`${cat.testCount} tests`}
                      sx={{ ml: 'auto', mr: 1 }}
                    />
                    {cat.guardianProtected && (
                      <Tooltip title="Guardian Protected">
                        <ShieldIcon fontSize="small" color="warning" />
                      </Tooltip>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {selectedCategory && (
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Statistical Test</InputLabel>
              <Select
                value={selectedTest}
                onChange={handleTestChange}
                label="Statistical Test"
              >
                {Object.entries(StatisticalTestService.testCategories[selectedCategory]?.tests || {})
                  .map(([key, test]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Typography>{test.name}</Typography>
                        {test.guardianRequired && (
                          <Tooltip title="Guardian Validation Required">
                            <ShieldIcon fontSize="small" color="warning" sx={{ ml: 2 }} />
                          </Tooltip>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {testConfig && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {testConfig.name} Information
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Minimum Sample Size
                    </Typography>
                    <Typography variant="body1">
                      {testConfig.minSampleSize || 'Not specified'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Guardian Protection
                    </Typography>
                    <Chip
                      icon={testConfig.guardianRequired ? <ShieldIcon /> : null}
                      label={testConfig.guardianRequired ? 'Required' : 'Optional'}
                      color={testConfig.guardianRequired ? 'warning' : 'default'}
                      size="small"
                    />
                  </Grid>

                  {testConfig.assumptions && testConfig.assumptions.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Assumptions
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {testConfig.assumptions.map(assumption => (
                          <Chip
                            key={assumption}
                            label={assumption.replace(/_/g, ' ')}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderParameterConfiguration = () => {
    if (!testConfig) return null;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Configure Test Parameters
          </Typography>
        </Grid>

        {selectedTest === 'tTest' && (
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Test Variant</InputLabel>
              <Select
                value={testParameters.variant || 'one_sample'}
                onChange={(e) => handleParameterChange('variant', e.target.value)}
                label="Test Variant"
              >
                <MenuItem value="one_sample">One Sample</MenuItem>
                <MenuItem value="two_sample">Two Sample</MenuItem>
                <MenuItem value="paired">Paired</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Confidence Level"
            type="number"
            value={testParameters.confidence || 0.95}
            onChange={(e) => handleParameterChange('confidence', parseFloat(e.target.value))}
            inputProps={{ min: 0.5, max: 0.999, step: 0.01 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Alpha (Significance Level)"
            type="number"
            value={testParameters.alpha || 0.05}
            onChange={(e) => handleParameterChange('alpha', parseFloat(e.target.value))}
            inputProps={{ min: 0.001, max: 0.5, step: 0.01 }}
          />
        </Grid>

        {selectedTest === 'tTest' && testParameters.variant === 'one_sample' && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Population Mean (μ)"
              type="number"
              value={testParameters.mu || 0}
              onChange={(e) => handleParameterChange('mu', parseFloat(e.target.value))}
            />
          </Grid>
        )}

        {selectedTest === 'tTest' && testParameters.variant === 'two_sample' && (
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Assume Equal Variance</InputLabel>
              <Select
                value={testParameters.equalVariance !== false}
                onChange={(e) => handleParameterChange('equalVariance', e.target.value)}
                label="Assume Equal Variance"
              >
                <MenuItem value={true}>Yes (Student's t-test)</MenuItem>
                <MenuItem value={false}>No (Welch's t-test)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderGuardianValidation = () => {
    const guardianRequired = testConfig?.guardianRequired || false;

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ShieldIcon sx={{ mr: 2, fontSize: 40, color: theme.palette.warning.main }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Guardian System Validation
            </Typography>
            <Chip
              icon={guardianStatus?.isOperational ? <CheckIcon /> : <ErrorIcon />}
              label={guardianStatus?.isOperational ? 'Operational' : 'Offline'}
              color={guardianStatus?.isOperational ? 'success' : 'error'}
            />
          </Box>

          {guardianRequired ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This test requires Guardian validation to ensure statistical assumptions are met.
              The Guardian System will check for normality, homogeneity, independence, and other critical assumptions.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Guardian validation is optional for this test but recommended for best results.
            </Alert>
          )}

          {guardianStatus?.validators && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Available Validators:
              </Typography>
              <Grid container spacing={1}>
                {guardianStatus.validators.map(validator => (
                  <Grid item key={validator}>
                    <Chip
                      label={validator.replace(/_/g, ' ')}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {testConfig?.assumptions && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Assumptions to be Checked:
              </Typography>
              <List dense>
                {testConfig.assumptions.map(assumption => (
                  <ListItem key={assumption}>
                    <ListItemIcon>
                      <CheckIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={assumption.replace(/_/g, ' ').replace(/^./, str => str.toUpperCase())}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderExecution = () => {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {isExecuting ? (
              <>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Executing {testConfig?.name}...
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Processing with 50-decimal precision
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                  <Chip icon={<FingerprintIcon />} label="50 Decimal Precision" color="success" />
                  <Chip icon={<ShieldIcon />} label="Guardian Active" color="warning" />
                  <Chip icon={<SpeedIcon />} label="High Performance" color="info" />
                </Box>
              </>
            ) : (
              <>
                <CheckIcon sx={{ fontSize: 60, color: theme.palette.success.main, mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Test Ready to Execute
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  All parameters configured and data prepared
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayIcon />}
                  onClick={executeTest}
                  sx={{ mt: 2 }}
                >
                  Execute Test
                </Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        background: darkMode
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ScienceIcon sx={{ mr: 2, fontSize: 40, color: theme.palette.primary.main }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            Unified Test Executor
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Execute any of 46 statistical tests with 50-decimal precision
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={<AssessmentIcon />}
            label={`${StatisticalTestService.testCount} Tests`}
            color="primary"
          />
          <Chip
            icon={<ShieldIcon />}
            label="Guardian Protected"
            color="warning"
          />
          <Chip
            icon={<FingerprintIcon />}
            label="50-Decimal"
            color="success"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Test Workflow
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel
                    onClick={() => index < activeStep && setActiveStep(index)}
                    sx={{ cursor: index < activeStep ? 'pointer' : 'default' }}
                  >
                    {label}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary">
                      {index === 0 && 'Upload CSV or enter data manually'}
                      {index === 1 && 'Choose from 46 statistical tests'}
                      {index === 2 && 'Set test-specific parameters'}
                      {index === 3 && 'Validate statistical assumptions'}
                      {index === 4 && 'Run test with 50-decimal precision'}
                      {index === 5 && 'View results and visualizations'}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {executionHistory.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Recent Tests
                </Typography>
                <List dense>
                  {executionHistory.slice(0, 3).map(entry => (
                    <ListItem key={entry.id}>
                      <ListItemText
                        primary={entry.testName}
                        secondary={new Date(entry.timestamp).toLocaleTimeString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          {activeStep === 0 && (
            <DataInput
              onDataLoaded={handleDataLoaded}
            />
          )}

          {activeStep === 1 && renderTestSelection()}

          {activeStep === 2 && renderParameterConfiguration()}

          {activeStep === 3 && renderGuardianValidation()}

          {activeStep === 4 && renderExecution()}

          {activeStep === 5 && testResults && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ResultsDisplay
                  results={testResults}
                  testName={testConfig?.name}
                />
              </Grid>
              <Grid item xs={12}>
                <VisualEvidence
                  data={loadedData}
                  testType={selectedTest}
                  guardianReport={testResults.guardian_report}
                />
              </Grid>
            </Grid>
          )}

          {activeStep < 5 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                disabled={activeStep === 0}
                onClick={() => setActiveStep(prev => prev - 1)}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                disabled={
                  (activeStep === 0 && !loadedData) ||
                  (activeStep === 1 && !selectedTest) ||
                  activeStep === 5
                }
                onClick={() => {
                  if (activeStep === 3) {
                    executeTest();
                  } else {
                    setActiveStep(prev => prev + 1);
                  }
                }}
              >
                {activeStep === 3 ? 'Execute Test' : 'Next'}
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>

      <Dialog
        open={showRecommendationDialog}
        onClose={() => setShowRecommendationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoIcon sx={{ mr: 1 }} />
            Test Recommendation
          </Box>
        </DialogTitle>
        <DialogContent>
          {testRecommendation && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Based on your data characteristics, we recommend:
              </Alert>
              <Typography variant="h6" gutterBottom>
                {testRecommendation.primary_recommendation}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {testRecommendation.reasoning}
              </Typography>
              {testRecommendation.alternatives && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Alternative tests:
                  </Typography>
                  <List dense>
                    {testRecommendation.alternatives.map((alt, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={alt} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRecommendationDialog(false)}>
            Ignore
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowRecommendationDialog(false);
            }}
          >
            Use Recommendation
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UnifiedTestExecutor;