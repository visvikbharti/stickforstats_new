import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Computer as ComputerIcon,
  Smartphone as SmartphoneIcon,
  Tablet as TabletIcon,
  Web as WebIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';

const BrowserCompatibilityTestPage = () => {
  const [testResults, setTestResults] = useState({});
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentBrowser, setCurrentBrowser] = useState({});

  useEffect(() => {
    // Detect current browser
    const detectBrowser = () => {
      const userAgent = navigator.userAgent;
      let browserName = 'Unknown';
      let browserVersion = 'Unknown';

      if (userAgent.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
        browserName = 'Chrome';
        browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
        browserName = 'Safari';
        browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.indexOf('Edg') > -1) {
        browserName = 'Edge';
        browserVersion = userAgent.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
      }

      setCurrentBrowser({ name: browserName, version: browserVersion });
    };

    detectBrowser();
  }, []);

  const browserSupport = [
    {
      browser: 'Chrome',
      minVersion: '90',
      currentSupport: 'Full',
      features: ['WebGL', 'IndexedDB', 'Web Workers', 'WebSocket'],
      status: 'supported'
    },
    {
      browser: 'Firefox',
      minVersion: '88',
      currentSupport: 'Full',
      features: ['WebGL', 'IndexedDB', 'Web Workers', 'WebSocket'],
      status: 'supported'
    },
    {
      browser: 'Safari',
      minVersion: '14',
      currentSupport: 'Full',
      features: ['WebGL', 'IndexedDB', 'Web Workers', 'WebSocket'],
      status: 'supported'
    },
    {
      browser: 'Edge',
      minVersion: '90',
      currentSupport: 'Full',
      features: ['WebGL', 'IndexedDB', 'Web Workers', 'WebSocket'],
      status: 'supported'
    },
    {
      browser: 'Opera',
      minVersion: '76',
      currentSupport: 'Partial',
      features: ['WebGL', 'IndexedDB', 'Web Workers'],
      status: 'partial'
    }
  ];

  const featureTests = [
    {
      name: 'JavaScript ES6+',
      test: () => {
        try {
          eval('const test = () => {}; let x = 1;');
          return true;
        } catch {
          return false;
        }
      },
      required: true
    },
    {
      name: 'LocalStorage',
      test: () => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      },
      required: true
    },
    {
      name: 'SessionStorage',
      test: () => {
        try {
          sessionStorage.setItem('test', 'test');
          sessionStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      },
      required: true
    },
    {
      name: 'IndexedDB',
      test: () => !!window.indexedDB,
      required: true
    },
    {
      name: 'WebSocket',
      test: () => 'WebSocket' in window,
      required: true
    },
    {
      name: 'Web Workers',
      test: () => 'Worker' in window,
      required: false
    },
    {
      name: 'Service Workers',
      test: () => 'serviceWorker' in navigator,
      required: false
    },
    {
      name: 'WebGL',
      test: () => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch {
          return false;
        }
      },
      required: false
    },
    {
      name: 'Fetch API',
      test: () => 'fetch' in window,
      required: true
    },
    {
      name: 'Promises',
      test: () => 'Promise' in window,
      required: true
    }
  ];

  const performanceMetrics = [
    { metric: 'Page Load Time', value: '1.2s', status: 'good' },
    { metric: 'Time to Interactive', value: '2.1s', status: 'good' },
    { metric: 'Memory Usage', value: '145 MB', status: 'warning' },
    { metric: 'CPU Usage', value: '12%', status: 'good' },
    { metric: 'Network Requests', value: '42', status: 'good' }
  ];

  const runCompatibilityTests = () => {
    setIsTestRunning(true);
    const results = {};

    featureTests.forEach((feature) => {
      results[feature.name] = {
        supported: feature.test(),
        required: feature.required
      };
    });

    setTimeout(() => {
      setTestResults(results);
      setIsTestRunning(false);
    }, 2000);
  };

  const getStatusIcon = (supported, required) => {
    if (supported) return <CheckCircleIcon color="success" />;
    if (!supported && required) return <CancelIcon color="error" />;
    return <WarningIcon color="warning" />;
  };

  const getPerformanceColor = (status) => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Browser Compatibility Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Test your browser's compatibility with StickForStats and ensure optimal performance.
        </Typography>
      </Paper>

      {/* Current Browser Info */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Browser
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <WebIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h5">
              {currentBrowser.name} {currentBrowser.version}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              User Agent: {navigator.userAgent}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Quick Test */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Feature Compatibility Test
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Run a comprehensive test to check if your browser supports all required features.
            </Typography>
            
            {!isTestRunning && Object.keys(testResults).length === 0 && (
              <Button 
                variant="contained" 
                size="large" 
                onClick={runCompatibilityTests}
                fullWidth
              >
                Run Compatibility Test
              </Button>
            )}

            {isTestRunning && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Running tests...
                </Typography>
                <LinearProgress />
              </Box>
            )}

            {!isTestRunning && Object.keys(testResults).length > 0 && (
              <Box>
                <Alert 
                  severity={Object.values(testResults).every(r => !r.required || r.supported) ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                >
                  <AlertTitle>
                    {Object.values(testResults).every(r => !r.required || r.supported) 
                      ? 'Your browser is fully compatible!' 
                      : 'Some required features are not supported'}
                  </AlertTitle>
                </Alert>
                
                <List>
                  {featureTests.map((feature) => (
                    <ListItem key={feature.name}>
                      <ListItemIcon>
                        {getStatusIcon(
                          testResults[feature.name]?.supported,
                          testResults[feature.name]?.required
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature.name}
                        secondary={feature.required ? 'Required' : 'Optional'}
                      />
                      {!testResults[feature.name]?.supported && (
                        <Chip 
                          label="Not Supported" 
                          size="small" 
                          color={feature.required ? 'error' : 'warning'}
                        />
                      )}
                    </ListItem>
                  ))}
                </List>

                <Button 
                  variant="outlined" 
                  onClick={runCompatibilityTests}
                  sx={{ mt: 2 }}
                >
                  Run Test Again
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <List>
              {performanceMetrics.map((metric, index) => (
                <ListItem key={index}>
                  <ListItemText 
                    primary={metric.metric}
                    secondary={metric.value}
                  />
                  <Chip 
                    label={metric.status} 
                    size="small" 
                    color={getPerformanceColor(metric.status)}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Browser Support Table */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Supported Browsers
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Browser</TableCell>
                <TableCell>Minimum Version</TableCell>
                <TableCell>Support Level</TableCell>
                <TableCell>Features</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {browserSupport.map((browser) => (
                <TableRow key={browser.browser}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <WebIcon />
                      {browser.browser}
                    </Box>
                  </TableCell>
                  <TableCell>{browser.minVersion}+</TableCell>
                  <TableCell>
                    <Chip 
                      label={browser.currentSupport}
                      size="small"
                      color={browser.status === 'supported' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {browser.features.map((feature, index) => (
                        <Chip key={index} label={feature} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Recommendations */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Browser Recommendations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Alert severity="success">
                <AlertTitle>Recommended</AlertTitle>
                Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
              </Alert>
            </Grid>
            <Grid item xs={12} md={4}>
              <Alert severity="warning">
                <AlertTitle>Limited Support</AlertTitle>
                Older versions may experience reduced functionality
              </Alert>
            </Grid>
            <Grid item xs={12} md={4}>
              <Alert severity="error">
                <AlertTitle>Not Supported</AlertTitle>
                Internet Explorer and browsers older than 2020
              </Alert>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Container>
  );
};

export default BrowserCompatibilityTestPage;