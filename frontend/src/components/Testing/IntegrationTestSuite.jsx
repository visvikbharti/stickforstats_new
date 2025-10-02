import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Tab,
  Tabs
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Error,
  Warning,
  PlayArrow,
  Stop,
  Refresh,
  Download,
  ContentCopy,
  Science,
  Assessment,
  Functions,
  Category,
  DataUsage,
  AutoFixHigh
} from '@mui/icons-material';
import { Decimal } from 'decimal.js';

// Import all our services
import PowerAnalysisService from '../../services/PowerAnalysisService';
import RegressionAnalysisService from '../../services/RegressionAnalysisService';
import NonParametricTestsService from '../../services/NonParametricTestsService';
import CategoricalAnalysisService from '../../services/CategoricalAnalysisService';
import MissingDataService from '../../services/MissingDataService';
import HighPrecisionStatisticalService from '../../services/HighPrecisionStatisticalService';

// Configure Decimal.js for 50 decimal precision
Decimal.set({ precision: 50 });

const IntegrationTestSuite = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [selectedTests, setSelectedTests] = useState([]);
  const [globalStatus, setGlobalStatus] = useState('idle');
  const [precisionVerification, setPrecisionVerification] = useState({});

  // Test configurations for each service
  const testConfigurations = {
    powerAnalysis: {
      name: 'Power Analysis Service',
      icon: <Science />,
      service: PowerAnalysisService,
      tests: [
        {
          id: 'power_t_test',
          name: 'T-Test Power Calculation',
          method: 'calculatePowerTTest',
          params: {
            sample_size: 30,
            effect_size: 0.8,
            alpha: 0.05,
            test_type: 'two-sided'
          },
          expectedFields: ['power', 'effect_size', 'sample_size', 'alpha'],
          precisionCheck: ['power']
        },
        {
          id: 'sample_size_anova',
          name: 'ANOVA Sample Size',
          method: 'calculateSampleSizeANOVA',
          params: {
            effect_size: 0.4,
            alpha: 0.05,
            power: 0.8,
            num_groups: 3
          },
          expectedFields: ['total_sample_size', 'per_group_sample_size'],
          precisionCheck: ['total_sample_size']
        },
        {
          id: 'power_curves',
          name: 'Power Curves Generation',
          method: 'generatePowerCurves',
          params: {
            test_type: 't-test',
            effect_sizes: [0.2, 0.5, 0.8],
            sample_sizes: [10, 20, 30, 50, 100],
            alpha: 0.05
          },
          expectedFields: ['curves', 'effect_sizes', 'sample_sizes'],
          precisionCheck: ['curves']
        }
      ]
    },
    regression: {
      name: 'Regression Analysis Service',
      icon: <Functions />,
      service: RegressionAnalysisService,
      tests: [
        {
          id: 'linear_regression',
          name: 'Linear Regression',
          method: 'performLinearRegression',
          params: {
            data: [
              { x: 1, y: 2.5 },
              { x: 2, y: 4.8 },
              { x: 3, y: 7.2 },
              { x: 4, y: 9.5 },
              { x: 5, y: 12.1 }
            ]
          },
          expectedFields: ['coefficients', 'r_squared', 'adjusted_r_squared', 'p_values'],
          precisionCheck: ['coefficients', 'r_squared']
        },
        {
          id: 'multiple_regression',
          name: 'Multiple Regression',
          method: 'performMultipleRegression',
          params: {
            data: [
              { x1: 1, x2: 2, y: 5.5 },
              { x1: 2, x2: 3, y: 8.2 },
              { x1: 3, x2: 4, y: 11.1 },
              { x1: 4, x2: 5, y: 14.3 },
              { x1: 5, x2: 6, y: 17.8 }
            ],
            predictors: ['x1', 'x2'],
            response: 'y'
          },
          expectedFields: ['coefficients', 'r_squared', 'vif', 'condition_number'],
          precisionCheck: ['coefficients', 'r_squared', 'condition_number']
        }
      ]
    },
    nonParametric: {
      name: 'Non-Parametric Tests Service',
      icon: <Assessment />,
      service: NonParametricTestsService,
      tests: [
        {
          id: 'mann_whitney',
          name: 'Mann-Whitney U Test',
          method: 'performMannWhitneyTest',
          params: {
            group1: [12.5, 14.2, 11.8, 15.3, 13.7],
            group2: [10.2, 9.8, 11.1, 8.9, 10.5]
          },
          expectedFields: ['u_statistic', 'p_value', 'effect_size', 'z_score'],
          precisionCheck: ['u_statistic', 'p_value', 'effect_size']
        },
        {
          id: 'kruskal_wallis',
          name: 'Kruskal-Wallis Test',
          method: 'performKruskalWallisTest',
          params: {
            groups: [
              [12, 14, 11],
              [15, 17, 16],
              [9, 10, 8]
            ]
          },
          expectedFields: ['h_statistic', 'p_value', 'df', 'effect_size'],
          precisionCheck: ['h_statistic', 'p_value']
        }
      ]
    },
    categorical: {
      name: 'Categorical Analysis Service',
      icon: <Category />,
      service: CategoricalAnalysisService,
      tests: [
        {
          id: 'chi_square',
          name: 'Chi-Square Test of Independence',
          method: 'performChiSquareTest',
          params: {
            contingency_table: [
              [10, 20, 30],
              [15, 25, 35]
            ]
          },
          expectedFields: ['chi_square', 'p_value', 'df', 'cramers_v'],
          precisionCheck: ['chi_square', 'p_value', 'cramers_v']
        },
        {
          id: 'fishers_exact',
          name: "Fisher's Exact Test",
          method: 'performFishersExactTest',
          params: {
            table: [[8, 2], [1, 9]]
          },
          expectedFields: ['p_value', 'odds_ratio', 'confidence_interval'],
          precisionCheck: ['p_value', 'odds_ratio']
        }
      ]
    },
    missingData: {
      name: 'Missing Data Service',
      icon: <DataUsage />,
      service: MissingDataService,
      tests: [
        {
          id: 'pattern_detection',
          name: 'Missing Data Pattern Detection',
          method: 'detectMissingPatterns',
          params: {
            data: [
              { a: 1, b: 2, c: null },
              { a: 2, b: null, c: 3 },
              { a: 3, b: 4, c: 5 },
              { a: null, b: 5, c: 6 },
              { a: 5, b: 6, c: null }
            ]
          },
          expectedFields: ['pattern_type', 'missing_percentage', 'column_patterns'],
          precisionCheck: ['missing_percentage']
        },
        {
          id: 'mean_imputation',
          name: 'Mean Imputation',
          method: 'performImputation',
          params: {
            data: [1, 2, null, 4, 5, null, 7],
            method: 'mean'
          },
          expectedFields: ['imputed_data', 'imputed_values', 'statistics'],
          precisionCheck: ['imputed_values']
        }
      ]
    },
    highPrecision: {
      name: 'High Precision Statistical Service',
      icon: <AutoFixHigh />,
      service: HighPrecisionStatisticalService,
      tests: [
        {
          id: 'one_sample_t',
          name: 'One-Sample T-Test (50 decimals)',
          method: 'performOneSampleTTest',
          params: {
            data: [
              '10.123456789012345678901234567890123456789012345678',
              '10.234567890123456789012345678901234567890123456789',
              '10.345678901234567890123456789012345678901234567890',
              '10.456789012345678901234567890123456789012345678901',
              '10.567890123456789012345678901234567890123456789012'
            ],
            population_mean: '10.000000000000000000000000000000000000000000000000'
          },
          expectedFields: ['t_statistic', 'p_value', 'confidence_interval', 'mean', 'std_dev'],
          precisionCheck: ['t_statistic', 'mean', 'std_dev'],
          verifyFullPrecision: true
        },
        {
          id: 'anova_high_precision',
          name: 'One-Way ANOVA (50 decimals)',
          method: 'performOneWayANOVA',
          params: {
            groups: [
              ['12.123456789012345678901234567890123456789012345678', '12.234567890123456789012345678901234567890123456789'],
              ['15.345678901234567890123456789012345678901234567890', '15.456789012345678901234567890123456789012345678901'],
              ['9.567890123456789012345678901234567890123456789012', '9.678901234567890123456789012345678901234567890123']
            ]
          },
          expectedFields: ['f_statistic', 'p_value', 'df_between', 'df_within', 'effect_size'],
          precisionCheck: ['f_statistic', 'p_value', 'effect_size'],
          verifyFullPrecision: true
        }
      ]
    }
  };

  // Verify precision of a value
  const verifyPrecision = (value, fieldName) => {
    if (value === null || value === undefined) return { valid: false, decimals: 0 };

    const stringValue = value.toString();
    const decimalMatch = stringValue.match(/\.(\d+)/);
    const decimals = decimalMatch ? decimalMatch[1].length : 0;

    // Check if it's a Decimal object
    const isDecimalObject = value instanceof Decimal || value._decimal !== undefined;

    // For full precision verification, expect at least 30 decimals
    const valid = decimals >= 30 || isDecimalObject;

    return {
      valid,
      decimals,
      isDecimalObject,
      value: stringValue
    };
  };

  // Run a single test
  const runSingleTest = async (serviceKey, test) => {
    const testId = `${serviceKey}_${test.id}`;
    setLoading(prev => ({ ...prev, [testId]: true }));
    setErrors(prev => ({ ...prev, [testId]: null }));

    try {
      const service = testConfigurations[serviceKey].service;
      const startTime = performance.now();

      // Call the service method
      const result = await service[test.method](test.params);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Verify expected fields
      const missingFields = test.expectedFields.filter(field =>
        !(field in result) && !result.data?.[field]
      );

      // Verify precision for specified fields
      const precisionResults = {};
      if (test.precisionCheck) {
        test.precisionCheck.forEach(field => {
          const value = result[field] || result.data?.[field];
          if (value) {
            precisionResults[field] = verifyPrecision(value, field);
          }
        });
      }

      // Store results
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          success: true,
          data: result,
          executionTime,
          missingFields,
          timestamp: new Date().toISOString()
        }
      }));

      setPrecisionVerification(prev => ({
        ...prev,
        [testId]: precisionResults
      }));

      return { success: true, testId };

    } catch (error) {
      console.error(`Test ${testId} failed:`, error);
      setErrors(prev => ({
        ...prev,
        [testId]: error.message || 'Unknown error occurred'
      }));
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
      return { success: false, testId, error: error.message };
    } finally {
      setLoading(prev => ({ ...prev, [testId]: false }));
    }
  };

  // Run all selected tests
  const runAllTests = async () => {
    setGlobalStatus('running');
    const results = [];

    for (const serviceKey of Object.keys(testConfigurations)) {
      for (const test of testConfigurations[serviceKey].tests) {
        if (selectedTests.includes(`${serviceKey}_${test.id}`) || selectedTests.length === 0) {
          const result = await runSingleTest(serviceKey, test);
          results.push(result);
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    setGlobalStatus(`completed: ${successCount} passed, ${failureCount} failed`);
  };

  // Select all tests
  const selectAllTests = () => {
    const allTestIds = [];
    Object.keys(testConfigurations).forEach(serviceKey => {
      testConfigurations[serviceKey].tests.forEach(test => {
        allTestIds.push(`${serviceKey}_${test.id}`);
      });
    });
    setSelectedTests(allTestIds);
  };

  // Clear all results
  const clearResults = () => {
    setTestResults({});
    setErrors({});
    setPrecisionVerification({});
    setGlobalStatus('idle');
  };

  // Export results as JSON
  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      results: testResults,
      errors: errors,
      precisionVerification: precisionVerification,
      summary: {
        total: Object.keys(testResults).length,
        successful: Object.values(testResults).filter(r => r.success).length,
        failed: Object.values(testResults).filter(r => !r.success).length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration_test_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format high precision number for display
  const formatHighPrecision = (value) => {
    if (!value) return 'N/A';

    if (typeof value === 'object' && value._decimal) {
      return value.toString();
    }

    const str = value.toString();
    if (str.includes('.')) {
      const parts = str.split('.');
      const decimals = parts[1].length;
      if (decimals > 10) {
        return `${parts[0]}.${parts[1].substring(0, 10)}... (${decimals} decimals)`;
      }
    }
    return str;
  };

  // Render test result
  const renderTestResult = (serviceKey, test) => {
    const testId = `${serviceKey}_${test.id}`;
    const result = testResults[testId];
    const error = errors[testId];
    const isLoading = loading[testId];
    const precision = precisionVerification[testId];

    return (
      <Accordion key={testId}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
            {isLoading && <CircularProgress size={20} />}
            {!isLoading && result?.success && <CheckCircle color="success" />}
            {!isLoading && !result?.success && error && <Error color="error" />}
            {!isLoading && !result && !error && <Warning color="warning" />}

            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {test.name}
            </Typography>

            {result?.executionTime && (
              <Chip
                label={`${result.executionTime.toFixed(2)}ms`}
                size="small"
                variant="outlined"
              />
            )}

            <Button
              size="small"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                runSingleTest(serviceKey, test);
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Running...' : 'Run'}
            </Button>
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          {/* Test Parameters */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Test Parameters:
            </Typography>
            <Paper sx={{ p: 1, bgcolor: 'grey.100' }}>
              <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                {JSON.stringify(test.params, null, 2)}
              </pre>
            </Paper>
          </Box>

          {/* Test Results */}
          {result?.success && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Results:
              </Typography>

              {/* Precision Verification */}
              {precision && Object.keys(precision).length > 0 && (
                <Alert
                  severity={Object.values(precision).every(p => p.valid) ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Precision Verification:
                  </Typography>
                  {Object.entries(precision).map(([field, info]) => (
                    <Box key={field} sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>{field}:</strong> {info.decimals} decimals
                        {info.isDecimalObject && ' (Decimal object)'}
                        {info.valid ? ' ✓' : ' ⚠️'}
                      </Typography>
                      {test.verifyFullPrecision && (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                          {formatHighPrecision(info.value)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Alert>
              )}

              {/* Missing Fields Check */}
              {result.missingFields && result.missingFields.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Missing expected fields: {result.missingFields.join(', ')}
                </Alert>
              )}

              {/* Result Data */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </Paper>
            </>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error">
              <Typography variant="subtitle2" gutterBottom>
                Error:
              </Typography>
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  // Render service tests
  const renderServiceTests = (serviceKey) => {
    const config = testConfigurations[serviceKey];
    return (
      <Box key={serviceKey} sx={{ mb: 4 }}>
        <Paper sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {config.icon}
            <Typography variant="h6" sx={{ ml: 1 }}>
              {config.name}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => {
                config.tests.forEach(test => runSingleTest(serviceKey, test));
              }}
            >
              Run All {config.name} Tests
            </Button>
          </Box>

          {config.tests.map(test => renderTestResult(serviceKey, test))}
        </Paper>
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          StickForStats Integration Test Suite
        </Typography>

        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Comprehensive testing of all services with 50 decimal precision verification
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Global Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrow />}
            onClick={runAllTests}
            disabled={globalStatus === 'running'}
          >
            Run All Tests
          </Button>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={clearResults}
          >
            Clear Results
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportResults}
            disabled={Object.keys(testResults).length === 0}
          >
            Export Results
          </Button>

          <Button
            variant="outlined"
            onClick={selectAllTests}
          >
            Select All Tests
          </Button>

          {globalStatus !== 'idle' && (
            <Chip
              label={globalStatus}
              color={globalStatus.includes('failed') ? 'error' : 'success'}
              variant="filled"
            />
          )}
        </Box>

        {/* Test Summary */}
        {Object.keys(testResults).length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Tests Run
                  </Typography>
                  <Typography variant="h4">
                    {Object.keys(testResults).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Passed
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {Object.values(testResults).filter(r => r.success).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Failed
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {Object.values(testResults).filter(r => !r.success).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Precision Verified
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {Object.values(precisionVerification).filter(pv =>
                      Object.values(pv).every(p => p.valid)
                    ).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Service Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {Object.entries(testConfigurations).map(([key, config], index) => (
            <Tab
              key={key}
              label={config.name}
              icon={config.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* Test Panels */}
      {Object.keys(testConfigurations).map((serviceKey, index) => (
        <Box
          key={serviceKey}
          hidden={activeTab !== index}
        >
          {renderServiceTests(serviceKey)}
        </Box>
      ))}
    </Container>
  );
};

export default IntegrationTestSuite;