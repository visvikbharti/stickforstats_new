import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';

import { getMetrics, getPerformanceSummary, clearMetrics } from '../../utils/performanceMonitoring';

/**
 * Performance monitoring dashboard component
 * Displays Web Vitals and other performance metrics
 */
const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Fetch metrics data
  useEffect(() => {
    setMetrics(getMetrics());
    setSummary(getPerformanceSummary());
  }, [refreshCounter]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Refresh metrics
  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };
  
  // Clear metrics
  const handleClear = () => {
    clearMetrics();
    setRefreshCounter(prev => prev + 1);
  };
  
  // Download metrics as JSON
  const handleDownload = () => {
    const data = JSON.stringify(metrics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Toggle minimized view
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  
  // Helper function to format time in ms
  const formatTime = (time) => {
    if (time === null || time === undefined) return 'N/A';
    return `${time.toFixed(2)} ms`;
  };
  
  // Helper function to format size in KB
  const formatSize = (bytes) => {
    if (bytes === null || bytes === undefined) return 'N/A';
    return `${(bytes / 1024).toFixed(2)} KB`;
  };
  
  // Helper to get color for metric value
  const getMetricColor = (name, value) => {
    if (value === null) return 'default';
    
    // Web Vitals thresholds
    const thresholds = {
      CLS: { good: 0.1, needsImprovement: 0.25 },
      FID: { good: 100, needsImprovement: 300 },
      LCP: { good: 2500, needsImprovement: 4000 },
      FCP: { good: 1800, needsImprovement: 3000 },
      TTFB: { good: 500, needsImprovement: 1000 },
    };
    
    if (!thresholds[name]) return 'default';
    
    if (value <= thresholds[name].good) return 'success';
    if (value <= thresholds[name].needsImprovement) return 'warning';
    return 'error';
  };
  
  // Render minimized view
  if (isMinimized) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <Card 
          elevation={3}
          sx={{ 
            cursor: 'pointer',
            maxWidth: 200,
            opacity: 0.9,
            '&:hover': { opacity: 1 }
          }}
          onClick={toggleMinimize}
        >
          <CardContent sx={{ py: 1, px: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Performance Metrics
            </Typography>
            {summary && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" component="div">
                  FCP: {formatTime(summary.webVitals.FCP)}
                </Typography>
                <Typography variant="caption" component="div">
                  LCP: {formatTime(summary.webVitals.LCP)}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }
  
  return (
    <Box 
      sx={{ 
        position: 'fixed',
        bottom: 16,
        right: 16,
        maxWidth: 800,
        maxHeight: 'calc(100vh - 32px)',
        width: '90%',
        zIndex: 1000,
        overflow: 'auto',
      }}
    >
      <Card elevation={4}>
        <Box sx={{ 
          px: 2, 
          py: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Typography variant="h6">
            Performance Dashboard
          </Typography>
          <Box>
            <Tooltip title="Refresh metrics">
              <IconButton color="inherit" onClick={handleRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download metrics">
              <IconButton color="inherit" onClick={handleDownload} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear metrics">
              <IconButton color="inherit" onClick={handleClear} size="small">
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Minimize">
              <IconButton color="inherit" onClick={toggleMinimize} size="small">
                <ExpandMoreIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Divider />
        
        <Box sx={{ width: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="performance metrics tabs"
          >
            <Tab label="Summary" />
            <Tab label="Web Vitals" />
            <Tab label="Resources" />
            <Tab label="Components" />
            <Tab label="API Calls" />
            <Tab label="Errors" />
          </Tabs>
        </Box>
        
        <Divider />
        
        <CardContent>
          {!metrics && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
          
          {metrics && activeTab === 0 && (
            <SummaryTab summary={summary} webVitals={metrics.webVitals} />
          )}
          
          {metrics && activeTab === 1 && (
            <WebVitalsTab webVitals={metrics.webVitals} navigationTimings={metrics.navigationTimings} />
          )}
          
          {metrics && activeTab === 2 && (
            <ResourcesTab resources={metrics.resources} />
          )}
          
          {metrics && activeTab === 3 && (
            <ComponentsTab componentRenders={metrics.componentRenders} />
          )}
          
          {metrics && activeTab === 4 && (
            <ApiCallsTab apiCalls={metrics.apiCalls} />
          )}
          
          {metrics && activeTab === 5 && (
            <ErrorsTab jsErrors={metrics.jsErrors} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// Summary Tab Component
const SummaryTab = ({ summary, webVitals }) => {
  if (!summary) return <Alert severity="info">No summary data available</Alert>;

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Performance Overview
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="caption" color="text.secondary">LCP</Typography>
            <Typography variant="h5" color={
              webVitals.LCP < 2500 ? 'success.main' : 
              webVitals.LCP < 4000 ? 'warning.main' : 'error.main'
            }>
              {webVitals.LCP ? `${(webVitals.LCP / 1000).toFixed(2)}s` : 'N/A'}
            </Typography>
            <Typography variant="caption" display="block">
              Largest Contentful Paint
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={4}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="caption" color="text.secondary">FID</Typography>
            <Typography variant="h5" color={
              webVitals.FID < 100 ? 'success.main' : 
              webVitals.FID < 300 ? 'warning.main' : 'error.main'
            }>
              {webVitals.FID ? `${webVitals.FID.toFixed(0)}ms` : 'N/A'}
            </Typography>
            <Typography variant="caption" display="block">
              First Input Delay
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={4}>
          <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="caption" color="text.secondary">CLS</Typography>
            <Typography variant="h5" color={
              webVitals.CLS < 0.1 ? 'success.main' : 
              webVitals.CLS < 0.25 ? 'warning.main' : 'error.main'
            }>
              {webVitals.CLS ? webVitals.CLS.toFixed(3) : 'N/A'}
            </Typography>
            <Typography variant="caption" display="block">
              Cumulative Layout Shift
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Paper elevation={0} variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="h6">{summary.resourceCount}</Typography>
            <Typography variant="caption">Resources</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Paper elevation={0} variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="h6">{summary.slowResources}</Typography>
            <Typography variant="caption">Slow Resources</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Paper elevation={0} variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="h6">{summary.apiCallsCount}</Typography>
            <Typography variant="caption">API Calls</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Paper elevation={0} variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="h6">{summary.errorCount}</Typography>
            <Typography variant="caption">JS Errors</Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {summary.pageLoad && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Page Load: {(summary.pageLoad / 1000).toFixed(2)}s
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={100} 
            sx={{ 
              height: 10, 
              borderRadius: 5,
              mb: 1,
              bgcolor: 'background.paper',
              '& .MuiLinearProgress-bar': {
                bgcolor: summary.pageLoad < 3000 ? 'success.main' : 
                         summary.pageLoad < 5000 ? 'warning.main' : 'error.main'
              }
            }} 
          />
          <Typography variant="caption" color="text.secondary">
            Core Web Vitals assessment: {' '}
            {webVitals.LCP < 2500 && webVitals.FID < 100 && webVitals.CLS < 0.1 
              ? 'Good' 
              : webVitals.LCP < 4000 && webVitals.FID < 300 && webVitals.CLS < 0.25
                ? 'Needs Improvement'
                : 'Poor'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Web Vitals Tab Component
const WebVitalsTab = ({ webVitals, navigationTimings }) => {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Core Web Vitals
      </Typography>
      
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>LCP</TableCell>
              <TableCell>{webVitals.LCP ? `${(webVitals.LCP / 1000).toFixed(2)}s` : 'N/A'}</TableCell>
              <TableCell>
                <Chip 
                  size="small" 
                  label={
                    webVitals.LCP < 2500 ? 'Good' : 
                    webVitals.LCP < 4000 ? 'Needs Improvement' : 'Poor'
                  } 
                  color={
                    webVitals.LCP < 2500 ? 'success' : 
                    webVitals.LCP < 4000 ? 'warning' : 'error'
                  }
                />
              </TableCell>
              <TableCell>Largest Contentful Paint</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>FID</TableCell>
              <TableCell>{webVitals.FID ? `${webVitals.FID.toFixed(2)}ms` : 'N/A'}</TableCell>
              <TableCell>
                <Chip 
                  size="small" 
                  label={
                    webVitals.FID < 100 ? 'Good' : 
                    webVitals.FID < 300 ? 'Needs Improvement' : 'Poor'
                  } 
                  color={
                    webVitals.FID < 100 ? 'success' : 
                    webVitals.FID < 300 ? 'warning' : 'error'
                  }
                />
              </TableCell>
              <TableCell>First Input Delay</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>CLS</TableCell>
              <TableCell>{webVitals.CLS ? webVitals.CLS.toFixed(3) : 'N/A'}</TableCell>
              <TableCell>
                <Chip 
                  size="small" 
                  label={
                    webVitals.CLS < 0.1 ? 'Good' : 
                    webVitals.CLS < 0.25 ? 'Needs Improvement' : 'Poor'
                  } 
                  color={
                    webVitals.CLS < 0.1 ? 'success' : 
                    webVitals.CLS < 0.25 ? 'warning' : 'error'
                  }
                />
              </TableCell>
              <TableCell>Cumulative Layout Shift</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>FCP</TableCell>
              <TableCell>{webVitals.FCP ? `${(webVitals.FCP / 1000).toFixed(2)}s` : 'N/A'}</TableCell>
              <TableCell>
                <Chip 
                  size="small" 
                  label={
                    webVitals.FCP < 1800 ? 'Good' : 
                    webVitals.FCP < 3000 ? 'Needs Improvement' : 'Poor'
                  } 
                  color={
                    webVitals.FCP < 1800 ? 'success' : 
                    webVitals.FCP < 3000 ? 'warning' : 'error'
                  }
                />
              </TableCell>
              <TableCell>First Contentful Paint</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>TTFB</TableCell>
              <TableCell>{webVitals.TTFB ? `${webVitals.TTFB.toFixed(2)}ms` : 'N/A'}</TableCell>
              <TableCell>
                <Chip 
                  size="small" 
                  label={
                    webVitals.TTFB < 500 ? 'Good' : 
                    webVitals.TTFB < 1000 ? 'Needs Improvement' : 'Poor'
                  } 
                  color={
                    webVitals.TTFB < 500 ? 'success' : 
                    webVitals.TTFB < 1000 ? 'warning' : 'error'
                  }
                />
              </TableCell>
              <TableCell>Time to First Byte</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      {navigationTimings && (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Navigation Timings
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Page Load</TableCell>
                  <TableCell>{formatTime(navigationTimings.pageLoad)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>DOM Interactive</TableCell>
                  <TableCell>{formatTime(navigationTimings.domInteractive)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>DOM Content Loaded</TableCell>
                  <TableCell>{formatTime(navigationTimings.domContentLoaded)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>First Byte</TableCell>
                  <TableCell>{formatTime(navigationTimings.firstByte)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>DNS Lookup</TableCell>
                  <TableCell>{formatTime(navigationTimings.dnsLookup)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>TCP Connect</TableCell>
                  <TableCell>{formatTime(navigationTimings.tcpConnect)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

// Resources Tab Component
const ResourcesTab = ({ resources }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceType, setResourceType] = useState('all');
  
  // Filter resources based on search and type
  const filteredResources = resources.filter(resource => {
    const matchesSearch = searchTerm === '' || 
      resource.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = resourceType === 'all' || 
      resource.type === resourceType;
    
    return matchesSearch && matchesType;
  });
  
  // Group resources by type
  const resourcesByType = {};
  resources.forEach(resource => {
    if (!resourcesByType[resource.type]) {
      resourcesByType[resource.type] = [];
    }
    resourcesByType[resource.type].push(resource);
  });
  
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1">
          Resources ({resources.length})
        </Typography>
        
        <Box>
          <Chip 
            label={`All (${resources.length})`}
            onClick={() => setResourceType('all')}
            color={resourceType === 'all' ? 'primary' : 'default'}
            sx={{ mr: 0.5 }}
            size="small"
          />
          {Object.keys(resourcesByType).map(type => (
            <Chip 
              key={type}
              label={`${type} (${resourcesByType[type].length})`}
              onClick={() => setResourceType(type)}
              color={resourceType === type ? 'primary' : 'default'}
              sx={{ mr: 0.5 }}
              size="small"
            />
          ))}
        </Box>
      </Box>
      
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Size</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredResources.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">No resources found</TableCell>
              </TableRow>
            )}
            
            {filteredResources.map((resource, index) => (
              <TableRow key={index} hover>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Tooltip title={resource.name}>
                    <Typography variant="body2">{resource.name.split('/').pop()}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>{resource.type}</TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    color={
                      resource.duration < 200 ? 'success.main' : 
                      resource.duration < 500 ? 'text.primary' : 
                      'error.main'
                    }
                  >
                    {formatTime(resource.duration)}
                  </Typography>
                </TableCell>
                <TableCell>{formatSize(resource.transferSize)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Components Tab
const ComponentsTab = ({ componentRenders }) => {
  if (!componentRenders || Object.keys(componentRenders).length === 0) {
    return <Alert severity="info">No component render data available</Alert>;
  }
  
  // Convert to sorted array
  const componentsArray = Object.entries(componentRenders)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.averageTime - a.averageTime);
  
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Component Render Performance
      </Typography>
      
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Component</TableCell>
              <TableCell align="right">Renders</TableCell>
              <TableCell align="right">Avg Time</TableCell>
              <TableCell align="right">Max Time</TableCell>
              <TableCell align="right">Total Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {componentsArray.map((component) => (
              <TableRow key={component.name} hover>
                <TableCell>{component.name}</TableCell>
                <TableCell align="right">{component.count}</TableCell>
                <TableCell align="right" 
                  sx={{ 
                    color: component.averageTime < 16 
                      ? 'success.main'
                      : component.averageTime < 50
                        ? 'warning.main'
                        : 'error.main'
                  }}
                >
                  {formatTime(component.averageTime)}
                </TableCell>
                <TableCell align="right"
                  sx={{ 
                    color: component.maxTime < 16 
                      ? 'success.main'
                      : component.maxTime < 100
                        ? 'warning.main'
                        : 'error.main'
                  }}
                >
                  {formatTime(component.maxTime)}
                </TableCell>
                <TableCell align="right">{formatTime(component.totalTime)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// API Calls Tab
const ApiCallsTab = ({ apiCalls }) => {
  if (!apiCalls || apiCalls.length === 0) {
    return <Alert severity="info">No API call data available</Alert>;
  }
  
  // Sort API calls by duration
  const sortedCalls = [...apiCalls].sort((a, b) => b.duration - a.duration);
  
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        API Calls
      </Typography>
      
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>URL</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Success</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCalls.map((call, index) => (
              <TableRow key={index} hover>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Tooltip title={call.url}>
                    <Typography variant="body2">
                      {call.url.split('?')[0].split('/').slice(-2).join('/')}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>{call.method}</TableCell>
                <TableCell>{call.status || 'N/A'}</TableCell>
                <TableCell
                  sx={{ 
                    color: call.duration < 200 
                      ? 'success.main'
                      : call.duration < 1000
                        ? 'warning.main'
                        : 'error.main'
                  }}
                >
                  {formatTime(call.duration)}
                </TableCell>
                <TableCell>
                  <Chip 
                    size="small" 
                    label={call.success ? 'Success' : 'Failed'} 
                    color={call.success ? 'success' : 'error'} 
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Errors Tab
const ErrorsTab = ({ jsErrors }) => {
  if (!jsErrors || jsErrors.length === 0) {
    return <Alert severity="success">No JavaScript errors recorded</Alert>;
  }
  
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        JavaScript Errors
      </Typography>
      
      {jsErrors.map((error, index) => (
        <Accordion key={index} variant="outlined" sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" color="error.main">
              {error.message}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" component="div">
              <strong>Source:</strong> {error.source}
            </Typography>
            <Typography variant="caption" component="div">
              <strong>Location:</strong> Line {error.line}, Column {error.column}
            </Typography>
            <Typography variant="caption" component="div">
              <strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}
            </Typography>
            {error.stack && (
              <Box sx={{ mt: 1, bgcolor: 'grey.100', p: 1, borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                  {error.stack}
                </pre>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default PerformanceDashboard;