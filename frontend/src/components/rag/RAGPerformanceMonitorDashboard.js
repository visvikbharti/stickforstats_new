import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  BugReport as BugIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  DataUsage as DataUsageIcon,
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import RAGWebSocketMonitor from './RAGWebSocketMonitor';

const RAGPerformanceMonitorDashboard = ({ 
  wsConnection,
  showWebSocketMonitor = true,
  refreshInterval = 5000,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState({
    overview: {
      status: 'healthy',
      uptime: '99.9%',
      avgResponseTime: 234,
      totalRequests: 45678,
      errorRate: 0.02,
      activeConnections: 12,
    },
    queries: [],
    errors: [],
    resources: {
      cpu: 45,
      memory: 62,
      disk: 38,
      network: 28,
    },
    alerts: [],
  });

  const [chartData, setChartData] = useState({
    responseTime: {
      labels: [],
      datasets: [{
        label: 'Response Time (ms)',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      }],
    },
    throughput: {
      labels: [],
      datasets: [{
        label: 'Requests/sec',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      }],
    },
  });

  const intervalRef = useRef(null);

  useEffect(() => {
    fetchPerformanceData();
    intervalRef.current = setInterval(fetchPerformanceData, refreshInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval]);

  const fetchPerformanceData = async () => {
    try {
      // Simulate fetching data - replace with actual API calls
      const mockData = generateMockPerformanceData();
      setPerformanceData(mockData);
      updateChartData(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setLoading(false);
    }
  };

  const generateMockPerformanceData = () => {
    const now = new Date();
    return {
      overview: {
        status: Math.random() > 0.9 ? 'warning' : 'healthy',
        uptime: '99.9%',
        avgResponseTime: 200 + Math.random() * 100,
        totalRequests: 45678 + Math.floor(Math.random() * 1000),
        errorRate: Math.random() * 0.05,
        activeConnections: Math.floor(Math.random() * 20),
      },
      queries: Array.from({ length: 10 }, (_, i) => ({
        id: `q${i}`,
        timestamp: new Date(now - i * 60000).toISOString(),
        query: `Sample query ${i + 1}`,
        responseTime: 100 + Math.random() * 400,
        tokens: Math.floor(Math.random() * 1000),
        status: Math.random() > 0.95 ? 'error' : 'success',
        cached: Math.random() > 0.7,
      })),
      errors: Array.from({ length: 5 }, (_, i) => ({
        id: `e${i}`,
        timestamp: new Date(now - i * 300000).toISOString(),
        type: ['timeout', 'rate_limit', 'invalid_query', 'server_error'][Math.floor(Math.random() * 4)],
        message: `Error message ${i + 1}`,
        count: Math.floor(Math.random() * 10) + 1,
      })),
      resources: {
        cpu: 30 + Math.random() * 40,
        memory: 50 + Math.random() * 30,
        disk: 30 + Math.random() * 20,
        network: 20 + Math.random() * 30,
      },
      alerts: [
        { id: 1, severity: 'warning', message: 'High memory usage detected', timestamp: now },
        { id: 2, severity: 'info', message: 'Scheduled maintenance in 2 hours', timestamp: now },
      ],
    };
  };

  const updateChartData = (data) => {
    const labels = Array.from({ length: 10 }, (_, i) => 
      new Date(Date.now() - i * 60000).toLocaleTimeString()
    ).reverse();

    setChartData({
      responseTime: {
        labels,
        datasets: [{
          label: 'Response Time (ms)',
          data: Array.from({ length: 10 }, () => 200 + Math.random() * 100),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        }],
      },
      throughput: {
        labels,
        datasets: [{
          label: 'Requests/sec',
          data: Array.from({ length: 10 }, () => 50 + Math.random() * 50),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        }],
      },
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'error':
        return <ErrorIcon />;
      default:
        return <DashboardIcon />;
    }
  };

  const exportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      performanceData,
      chartData,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-performance-monitor-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          RAG Performance Monitor
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchPerformanceData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Data">
            <IconButton onClick={exportData}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* System Status Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    System Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(performanceData.overview.status)}
                    label={performanceData.overview.status.toUpperCase()}
                    color={getStatusColor(performanceData.overview.status)}
                  />
                </Box>
                <DashboardIcon fontSize="large" color="action" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Avg Response Time
                  </Typography>
                  <Typography variant="h5">
                    {performanceData.overview.avgResponseTime.toFixed(0)}ms
                  </Typography>
                </Box>
                <SpeedIcon fontSize="large" color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Requests
                  </Typography>
                  <Typography variant="h5">
                    {performanceData.overview.totalRequests.toLocaleString()}
                  </Typography>
                </Box>
                <DataUsageIcon fontSize="large" color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Error Rate
                  </Typography>
                  <Typography variant="h5">
                    {(performanceData.overview.errorRate * 100).toFixed(2)}%
                  </Typography>
                </Box>
                <BugIcon fontSize="large" color={performanceData.overview.errorRate > 0.03 ? 'error' : 'action'} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {performanceData.alerts.length > 0 && (
        <Box mb={3}>
          {performanceData.alerts.map((alert) => (
            <Alert key={alert.id} severity={alert.severity} sx={{ mb: 1 }}>
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Performance Metrics" />
          <Tab label="Recent Queries" />
          <Tab label="Resource Usage" />
          <Tab label="Error Log" />
          {showWebSocketMonitor && <Tab label="WebSocket Monitor" />}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 300 }}>
              <Typography variant="h6" gutterBottom>
                Response Time Trend
              </Typography>
              <Box sx={{ height: 250 }}>
                <Line 
                  data={chartData.responseTime} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 300 }}>
              <Typography variant="h6" gutterBottom>
                Throughput
              </Typography>
              <Box sx={{ height: 250 }}>
                <Bar 
                  data={chartData.throughput} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Query</TableCell>
                <TableCell>Response Time</TableCell>
                <TableCell>Tokens</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Cached</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {performanceData.queries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell>{new Date(query.timestamp).toLocaleTimeString()}</TableCell>
                  <TableCell>{query.query}</TableCell>
                  <TableCell>{query.responseTime.toFixed(0)}ms</TableCell>
                  <TableCell>{query.tokens}</TableCell>
                  <TableCell>
                    <Chip
                      label={query.status}
                      color={query.status === 'success' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {query.cached && <Chip label="Cached" size="small" variant="outlined" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {Object.entries(performanceData.resources).map(([resource, usage]) => (
            <Grid item xs={12} sm={6} md={3} key={resource}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                  {resource}
                </Typography>
                <Box position="relative" display="inline-flex" width="100%">
                  <CircularProgress
                    variant="determinate"
                    value={usage}
                    size={100}
                    thickness={4}
                    sx={{ color: usage > 80 ? 'error.main' : usage > 60 ? 'warning.main' : 'success.main' }}
                  />
                  <Box
                    top={0}
                    left={0}
                    bottom={0}
                    right={0}
                    position="absolute"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography variant="h6" component="div" color="text.secondary">
                      {`${Math.round(usage)}%`}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 3 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {performanceData.errors.map((error) => (
                <TableRow key={error.id}>
                  <TableCell>{new Date(error.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={error.type} color="error" size="small" />
                  </TableCell>
                  <TableCell>{error.message}</TableCell>
                  <TableCell>{error.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 4 && showWebSocketMonitor && (
        <RAGWebSocketMonitor wsConnection={wsConnection} />
      )}
    </Box>
  );
};

export default RAGPerformanceMonitorDashboard;