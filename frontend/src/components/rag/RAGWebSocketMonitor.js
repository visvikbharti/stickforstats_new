import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  DataUsage as DataUsageIcon,
  Memory as MemoryIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const RAGWebSocketMonitor = ({ 
  wsConnection,
  maxDataPoints = 50,
  updateInterval = 1000,
  showDetailedMetrics = true,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [metrics, setMetrics] = useState({
    messagesPerSecond: 0,
    averageLatency: 0,
    totalMessages: 0,
    errorRate: 0,
    uptime: 0,
    memoryUsage: 0,
    activeConnections: 0,
    dataTransferRate: 0,
  });
  
  const [timeSeriesData, setTimeSeriesData] = useState({
    timestamps: [],
    latency: [],
    messagesPerSecond: [],
    errorRate: [],
    memoryUsage: [],
  });
  
  const [messageLog, setMessageLog] = useState([]);
  const [connectionEvents, setConnectionEvents] = useState([]);
  const intervalRef = useRef(null);

  // Update metrics from WebSocket connection
  const updateMetrics = useCallback(() => {
    if (!wsConnection || isPaused) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    
    // Simulate metrics (in real app, these would come from wsConnection)
    const newMetrics = {
      messagesPerSecond: wsConnection.messagesPerSecond || Math.random() * 10,
      averageLatency: wsConnection.latency || Math.random() * 100,
      totalMessages: wsConnection.totalMessages || metrics.totalMessages + Math.floor(Math.random() * 5),
      errorRate: wsConnection.errorRate || Math.random() * 0.05,
      uptime: wsConnection.uptime || metrics.uptime + 1,
      memoryUsage: wsConnection.memoryUsage || 50 + Math.random() * 30,
      activeConnections: wsConnection.activeConnections || 1,
      dataTransferRate: wsConnection.dataTransferRate || Math.random() * 1000,
    };
    
    setMetrics(newMetrics);
    
    // Update time series data
    setTimeSeriesData(prev => {
      const newData = {
        timestamps: [...prev.timestamps, timestamp].slice(-maxDataPoints),
        latency: [...prev.latency, newMetrics.averageLatency].slice(-maxDataPoints),
        messagesPerSecond: [...prev.messagesPerSecond, newMetrics.messagesPerSecond].slice(-maxDataPoints),
        errorRate: [...prev.errorRate, newMetrics.errorRate * 100].slice(-maxDataPoints),
        memoryUsage: [...prev.memoryUsage, newMetrics.memoryUsage].slice(-maxDataPoints),
      };
      return newData;
    });
  }, [wsConnection, isPaused, metrics.totalMessages, metrics.uptime, maxDataPoints]);

  // Set up update interval
  useEffect(() => {
    intervalRef.current = setInterval(updateMetrics, updateInterval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateMetrics, updateInterval]);

  // Listen for WebSocket messages
  useEffect(() => {
    if (!wsConnection?.ws) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const logEntry = {
          id: Date.now(),
          timestamp: new Date(),
          type: data.type || 'message',
          content: data,
          size: event.data.length,
        };
        
        setMessageLog(prev => [logEntry, ...prev].slice(0, 100));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    const handleConnectionEvent = (type) => {
      const event = {
        id: Date.now(),
        timestamp: new Date(),
        type,
        status: wsConnection.status,
      };
      
      setConnectionEvents(prev => [event, ...prev].slice(0, 50));
    };

    wsConnection.ws.addEventListener('message', handleMessage);
    wsConnection.ws.addEventListener('open', () => handleConnectionEvent('open'));
    wsConnection.ws.addEventListener('close', () => handleConnectionEvent('close'));
    wsConnection.ws.addEventListener('error', () => handleConnectionEvent('error'));

    return () => {
      wsConnection.ws.removeEventListener('message', handleMessage);
    };
  }, [wsConnection]);

  const handleClearData = () => {
    setTimeSeriesData({
      timestamps: [],
      latency: [],
      messagesPerSecond: [],
      errorRate: [],
      memoryUsage: [],
    });
    setMessageLog([]);
    setConnectionEvents([]);
  };

  const handleExportData = () => {
    const exportData = {
      metrics,
      timeSeriesData,
      messageLog: messageLog.slice(0, 20),
      connectionEvents: connectionEvents.slice(0, 20),
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-websocket-monitor-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Chart configurations
  const latencyChartData = {
    labels: timeSeriesData.timestamps,
    datasets: [
      {
        label: 'Latency (ms)',
        data: timeSeriesData.latency,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const messageRateChartData = {
    labels: timeSeriesData.timestamps,
    datasets: [
      {
        label: 'Messages/sec',
        data: timeSeriesData.messagesPerSecond,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            RAG WebSocket Monitor
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title={isPaused ? 'Resume' : 'Pause'}>
              <IconButton onClick={() => setIsPaused(!isPaused)} color="primary">
                {isPaused ? <PlayIcon /> : <PauseIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear Data">
              <IconButton onClick={handleClearData}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Data">
              <IconButton onClick={handleExportData}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={updateMetrics}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Status and Key Metrics */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Connection Status
                    </Typography>
                    <Chip
                      label={wsConnection?.status || 'Disconnected'}
                      color={getStatusColor(wsConnection?.status)}
                      size="small"
                    />
                  </Box>
                  <TimelineIcon color="primary" />
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
                      Average Latency
                    </Typography>
                    <Typography variant="h5">
                      {metrics.averageLatency.toFixed(1)}ms
                    </Typography>
                  </Box>
                  <SpeedIcon color="primary" />
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
                      Message Rate
                    </Typography>
                    <Typography variant="h5">
                      {metrics.messagesPerSecond.toFixed(1)}/s
                    </Typography>
                  </Box>
                  <DataUsageIcon color="primary" />
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
                      Uptime
                    </Typography>
                    <Typography variant="h5">
                      {formatUptime(metrics.uptime)}
                    </Typography>
                  </Box>
                  <MemoryIcon color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs for different views */}
        {showDetailedMetrics && (
          <>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="Real-time Charts" />
              <Tab label="Message Log" />
              <Tab label="Connection Events" />
              <Tab label="Detailed Metrics" />
            </Tabs>

            {/* Real-time Charts */}
            {activeTab === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: 300 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Latency Over Time
                    </Typography>
                    <Box sx={{ height: 250 }}>
                      <Line data={latencyChartData} options={chartOptions} />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: 300 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Message Rate
                    </Typography>
                    <Box sx={{ height: 250 }}>
                      <Line data={messageRateChartData} options={chartOptions} />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Message Log */}
            {activeTab === 1 && (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Content</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {messageLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Chip label={log.type} size="small" />
                        </TableCell>
                        <TableCell>{log.size} bytes</TableCell>
                        <TableCell>
                          <Typography variant="caption" noWrap sx={{ maxWidth: 300 }}>
                            {JSON.stringify(log.content)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Connection Events */}
            {activeTab === 2 && (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {connectionEvents.map((event) => (
                  <ListItem key={event.id}>
                    <ListItemText
                      primary={event.type.toUpperCase()}
                      secondary={new Date(event.timestamp).toLocaleString()}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={event.status}
                        color={getStatusColor(event.status)}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            {/* Detailed Metrics */}
            {activeTab === 3 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Total Messages"
                        secondary={metrics.totalMessages.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Error Rate"
                        secondary={`${(metrics.errorRate * 100).toFixed(2)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Memory Usage"
                        secondary={`${metrics.memoryUsage.toFixed(1)}%`}
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Active Connections"
                        secondary={metrics.activeConnections}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Data Transfer Rate"
                        secondary={formatBytes(metrics.dataTransferRate)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Last Update"
                        secondary={new Date().toLocaleTimeString()}
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default RAGWebSocketMonitor;