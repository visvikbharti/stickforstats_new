import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Table,
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  CircularProgress,
  Chip,
  Alert,
  Divider,
  Tooltip,
  IconButton,
  LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SpeedIcon from '@mui/icons-material/Speed';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import DevicesIcon from '@mui/icons-material/Devices';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import MemoryIcon from '@mui/icons-material/Memory';
import InfoIcon from '@mui/icons-material/Info';

import { 
  DEVICE_PROFILES,
  NETWORK_PROFILES,
  TEST_SCENARIOS,
  PERFORMANCE_METRICS,
  configurePerformanceTesting,
  runPerformanceTest,
  getTestStatus,
  getSavedTestResults,
  clearSavedTestResults,
  exportResultsToCSV,
  generateTestSummary
} from '../../utils/performanceTesting';

/**
 * Performance score indicator component
 */
const ScoreIndicator = ({ score }) => {
  let color = '#4CAF50'; // Green
  if (score < 90) color = '#FFC107'; // Yellow
  if (score < 70) color = '#FF9800'; // Orange
  if (score < 50) color = '#F44336'; // Red

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={score}
        size={40}
        thickness={4}
        sx={{ color }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" component="div" color="text.secondary">
          {score}
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Performance Test Dashboard component
 * 
 * This component provides a UI for configuring, running, and viewing performance tests.
 */
const PerformanceTestDashboard = () => {
  // State for test configuration
  const [deviceProfile, setDeviceProfile] = useState('DESKTOP');
  const [networkProfile, setNetworkProfile] = useState('WIFI');
  const [selectedScenarios, setSelectedScenarios] = useState(['HOME_PAGE']);
  const [iterations, setIterations] = useState(3);
  const [delayBetweenRuns, setDelayBetweenRuns] = useState(3000);
  
  // State for test execution
  const [testInProgress, setTestInProgress] = useState(false);
  const [currentTestRun, setCurrentTestRun] = useState(0);
  const [totalTestRuns, setTotalTestRuns] = useState(0);
  const [testResults, setTestResults] = useState([]);
  const [testSummary, setTestSummary] = useState(null);
  
  // State for saved results
  const [savedResults, setSavedResults] = useState([]);
  const [selectedSavedSummary, setSelectedSavedSummary] = useState(null);
  
  // Load saved results on mount
  useEffect(() => {
    loadSavedResults();
    
    // Check test status periodically
    const intervalId = setInterval(() => {
      const status = getTestStatus();
      if (status.inProgress) {
        setTestInProgress(true);
        setCurrentTestRun(status.currentRun);
        setTotalTestRuns(status.totalRuns);
      } else if (testInProgress) {
        setTestInProgress(false);
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [testInProgress]);
  
  /**
   * Load saved test results from localStorage
   */
  const loadSavedResults = () => {
    const results = getSavedTestResults();
    
    // Group results by test run
    const groupedResults = {};
    
    results.forEach(result => {
      const timestamp = new Date(result.timestamp).toISOString().split('T')[0]; // Group by date
      if (!groupedResults[timestamp]) {
        groupedResults[timestamp] = [];
      }
      groupedResults[timestamp].push(result);
    });
    
    // Generate summaries for each group
    const summaries = Object.entries(groupedResults).map(([date, results]) => ({
      date,
      results: results.length,
      summary: generateTestSummary(results)
    }));
    
    // Sort by date (newest first)
    summaries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setSavedResults(summaries);
  };
  
  /**
   * Handle running the performance test
   */
  const handleRunTest = async () => {
    if (testInProgress) return;
    
    // Prepare test configuration
    const config = {
      deviceProfile: DEVICE_PROFILES[deviceProfile],
      networkProfile: NETWORK_PROFILES[networkProfile],
      iterations: parseInt(iterations, 10),
      delayBetweenRuns: parseInt(delayBetweenRuns, 10),
      consoleOutput: true,
      saveToStorage: true
    };
    
    // Configure the testing framework
    configurePerformanceTesting(config);
    
    // Prepare scenarios
    const scenarios = selectedScenarios.map(key => TEST_SCENARIOS[key]);
    
    setTestInProgress(true);
    setTestResults([]);
    setTestSummary(null);
    
    try {
      // Run the tests
      const { results, summary } = await runPerformanceTest(scenarios);
      
      // Update state with results
      setTestResults(results);
      setTestSummary(summary);
      
      // Reload saved results
      loadSavedResults();
    } catch (error) {
      console.error('Performance test failed', error);
    } finally {
      setTestInProgress(false);
    }
  };
  
  /**
   * Handle clearing saved test results
   */
  const handleClearSavedResults = () => {
    if (window.confirm('Are you sure you want to clear all saved test results?')) {
      clearSavedTestResults();
      setSavedResults([]);
      setSelectedSavedSummary(null);
    }
  };
  
  /**
   * Handle exporting test results to CSV
   */
  const handleExportResults = () => {
    if (testResults.length > 0) {
      exportResultsToCSV(testResults);
    } else if (selectedSavedSummary) {
      // Find the actual results for the selected summary
      const results = getSavedTestResults().filter(result => {
        const resultDate = new Date(result.timestamp).toISOString().split('T')[0];
        return resultDate === selectedSavedSummary.date;
      });
      
      exportResultsToCSV(results);
    }
  };
  
  /**
   * Render the test configuration section
   */
  const renderTestConfiguration = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Test Configuration
        </Typography>
        
        <Grid container spacing={2}>
          {/* Device Profile */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="device-profile-label">Device Profile</InputLabel>
              <Select
                labelId="device-profile-label"
                id="device-profile"
                value={deviceProfile}
                label="Device Profile"
                onChange={(e) => setDeviceProfile(e.target.value)}
                startAdornment={<DevicesIcon sx={{ mr: 1 }} />}
              >
                {Object.keys(DEVICE_PROFILES).map((key) => (
                  <MenuItem key={key} value={key}>
                    {DEVICE_PROFILES[key].name} ({DEVICE_PROFILES[key].viewport.width}x{DEVICE_PROFILES[key].viewport.height})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Network Profile */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="network-profile-label">Network Profile</InputLabel>
              <Select
                labelId="network-profile-label"
                id="network-profile"
                value={networkProfile}
                label="Network Profile"
                onChange={(e) => setNetworkProfile(e.target.value)}
                startAdornment={<NetworkCheckIcon sx={{ mr: 1 }} />}
              >
                {Object.keys(NETWORK_PROFILES).map((key) => (
                  <MenuItem key={key} value={key}>
                    {NETWORK_PROFILES[key].name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Test Scenarios */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="scenarios-label">Test Scenarios</InputLabel>
              <Select
                labelId="scenarios-label"
                id="scenarios"
                multiple
                value={selectedScenarios}
                label="Test Scenarios"
                onChange={(e) => setSelectedScenarios(e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={TEST_SCENARIOS[value].name} />
                    ))}
                  </Box>
                )}
              >
                {Object.keys(TEST_SCENARIOS).map((key) => (
                  <MenuItem key={key} value={key}>
                    {TEST_SCENARIOS[key].name} - {TEST_SCENARIOS[key].description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Iterations */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="iterations"
              label="Iterations"
              type="number"
              InputProps={{ inputProps: { min: 1, max: 10 } }}
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
              helperText="Number of times to run each test (1-10)"
            />
          </Grid>
          
          {/* Delay Between Runs */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="delay-between-runs"
              label="Delay Between Runs (ms)"
              type="number"
              InputProps={{ inputProps: { min: 1000, max: 10000, step: 500 } }}
              value={delayBetweenRuns}
              onChange={(e) => setDelayBetweenRuns(e.target.value)}
              helperText="Delay between test runs in milliseconds"
            />
          </Grid>
          
          {/* Run Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SpeedIcon />}
              onClick={handleRunTest}
              disabled={testInProgress || selectedScenarios.length === 0}
              fullWidth
            >
              {testInProgress ? 'Running Tests...' : 'Run Performance Tests'}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
  
  /**
   * Render the test progress section
   */
  const renderTestProgress = () => {
    if (!testInProgress) return null;
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Progress
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={(currentTestRun / totalTestRuns) * 100} 
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
          
          <Typography variant="body2">
            Running Test {currentTestRun} of {totalTestRuns}
          </Typography>
        </CardContent>
      </Card>
    );
  };
  
  /**
   * Render the test results section
   */
  const renderTestResults = () => {
    if (!testSummary) return null;
    
    const { scenarios, successRate, totalRuns, avgDuration, issuesFound, recommendations } = testSummary;
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Test Results
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportResults}
              disabled={testResults.length === 0}
            >
              Export CSV
            </Button>
          </Box>
          
          {/* Summary Info */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Success Rate</Typography>
                  <Typography variant="h6">{(successRate * 100).toFixed(0)}%</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Total Runs</Typography>
                  <Typography variant="h6">{totalRuns}</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Avg. Duration</Typography>
                  <Typography variant="h6">{Math.round(avgDuration)}ms</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Issues Found</Typography>
                  <Typography variant="h6">{issuesFound ? 'Yes' : 'No'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Scenario Results */}
          <Typography variant="subtitle1" gutterBottom>
            Scenario Performance
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Scenario</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell align="right">LCP</TableCell>
                  <TableCell align="right">FID</TableCell>
                  <TableCell align="right">CLS</TableCell>
                  <TableCell align="right">FCP</TableCell>
                  <TableCell align="right">Load</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(scenarios).map(([name, data]) => (
                  <TableRow key={name} hover>
                    <TableCell component="th" scope="row">
                      {TEST_SCENARIOS[name]?.name || name}
                    </TableCell>
                    <TableCell align="center">
                      <ScoreIndicator score={data.overallScore} />
                    </TableCell>
                    <TableCell align="right">
                      {Math.round(data.metrics.webVitals.LCP)}ms
                    </TableCell>
                    <TableCell align="right">
                      {data.metrics.webVitals.FID ? `${Math.round(data.metrics.webVitals.FID)}ms` : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {data.metrics.webVitals.CLS ? data.metrics.webVitals.CLS.toFixed(3) : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {Math.round(data.metrics.webVitals.FCP)}ms
                    </TableCell>
                    <TableCell align="right">
                      {Math.round(data.metrics.pageLoad)}ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Recommendations
              </Typography>
              
              {recommendations.map((rec, index) => (
                <Alert 
                  key={index} 
                  severity="warning" 
                  sx={{ mb: 1 }}
                  action={
                    <Tooltip title="More Info">
                      <IconButton
                        color="inherit"
                        size="small"
                        onClick={() => {
                          // Open documentation about this metric in a new tab
                          const metricKey = Object.keys(PERFORMANCE_METRICS).find(
                            key => PERFORMANCE_METRICS[key].name === rec.metric
                          );
                          
                          if (metricKey) {
                            window.open(`https://web.dev/metrics/${metricKey.toLowerCase()}/`, '_blank');
                          }
                        }}
                      >
                        <InfoIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <Typography variant="subtitle2">
                    {rec.scenario} - {rec.metric}: {rec.value}
                  </Typography>
                  <Typography variant="body2">
                    {rec.recommendation}
                  </Typography>
                </Alert>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };
  
  /**
   * Render the saved results section
   */
  const renderSavedResults = () => {
    if (savedResults.length === 0) {
      return (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Saved Results
            </Typography>
            <Alert severity="info">
              No saved test results found. Run some tests to generate results.
            </Alert>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Saved Results
            </Typography>
            
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadSavedResults}
                sx={{ mr: 1 }}
              >
                Refresh
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleClearSavedResults}
              >
                Clear All
              </Button>
            </Box>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Tests</TableCell>
                  <TableCell align="center">Device</TableCell>
                  <TableCell align="center">Network</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {savedResults.map((result) => (
                  <TableRow 
                    key={result.date} 
                    hover 
                    selected={selectedSavedSummary?.date === result.date}
                    onClick={() => setSelectedSavedSummary(result)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell component="th" scope="row">
                      {result.date}
                    </TableCell>
                    <TableCell align="center">{result.results}</TableCell>
                    <TableCell align="center">{result.summary.device}</TableCell>
                    <TableCell align="center">{result.summary.network}</TableCell>
                    <TableCell align="center">
                      <ScoreIndicator score={Object.values(result.summary.scenarios).reduce(
                        (avg, s) => avg + s.overallScore, 0) / Object.values(result.summary.scenarios).length} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSavedSummary(result);
                          handleExportResults();
                        }}
                      >
                        Export
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Selected saved result details */}
          {selectedSavedSummary && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  Details for {selectedSavedSummary.date} ({selectedSavedSummary.results} tests)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Scenario</TableCell>
                        <TableCell align="center">Score</TableCell>
                        <TableCell align="right">LCP</TableCell>
                        <TableCell align="right">FID</TableCell>
                        <TableCell align="right">CLS</TableCell>
                        <TableCell align="right">FCP</TableCell>
                        <TableCell align="right">Load</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(selectedSavedSummary.summary.scenarios).map(([name, data]) => (
                        <TableRow key={name} hover>
                          <TableCell component="th" scope="row">
                            {TEST_SCENARIOS[name]?.name || name}
                          </TableCell>
                          <TableCell align="center">
                            <ScoreIndicator score={data.overallScore} />
                          </TableCell>
                          <TableCell align="right">
                            {Math.round(data.metrics.webVitals.LCP)}ms
                          </TableCell>
                          <TableCell align="right">
                            {data.metrics.webVitals.FID ? `${Math.round(data.metrics.webVitals.FID)}ms` : 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            {data.metrics.webVitals.CLS ? data.metrics.webVitals.CLS.toFixed(3) : 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            {Math.round(data.metrics.webVitals.FCP)}ms
                          </TableCell>
                          <TableCell align="right">
                            {Math.round(data.metrics.pageLoad)}ms
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Recommendations */}
                {selectedSavedSummary.summary.recommendations && selectedSavedSummary.summary.recommendations.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Recommendations
                    </Typography>
                    
                    {selectedSavedSummary.summary.recommendations.map((rec, index) => (
                      <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">
                          {rec.scenario} - {rec.metric}: {rec.value}
                        </Typography>
                        <Typography variant="body2">
                          {rec.recommendation}
                        </Typography>
                      </Alert>
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          )}
        </CardContent>
      </Card>
    );
  };
  
  /**
   * Render the metrics reference section
   */
  const renderMetricsReference = () => (
    <Accordion sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">
          <MemoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Performance Metrics Reference
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Good</TableCell>
                <TableCell align="center">Needs Improvement</TableCell>
                <TableCell align="center">Poor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(PERFORMANCE_METRICS).map(([key, metric]) => (
                <TableRow key={key} hover>
                  <TableCell component="th" scope="row">
                    <Tooltip title="Open documentation">
                      <Typography
                        sx={{ 
                          cursor: 'pointer', 
                          textDecoration: 'underline',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                        onClick={() => {
                          window.open(`https://web.dev/metrics/${key.toLowerCase()}/`, '_blank');
                        }}
                      >
                        {metric.name}
                        <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{metric.description}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`0-${metric.thresholds.good}${metric.unit}`}
                      size="small"
                      color="success"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${metric.thresholds.good}-${metric.thresholds.needsImprovement}${metric.unit}`}
                      size="small"
                      color="warning"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`>${metric.thresholds.needsImprovement}${metric.unit}`}
                      size="small"
                      color="error"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
  
  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        <SpeedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Performance Testing Dashboard
      </Typography>
      
      <Typography variant="body1" paragraph color="text.secondary">
        Configure and run performance tests across different device profiles and network conditions.
        Track performance metrics over time and identify areas for improvement.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {renderTestConfiguration()}
      {renderTestProgress()}
      {renderTestResults()}
      {renderSavedResults()}
      {renderMetricsReference()}
    </Box>
  );
};

export default PerformanceTestDashboard;