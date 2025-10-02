import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
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
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const RAGPerformanceDashboard = ({ timeRange = '1h', autoRefresh = true }) => {
  const [metrics, setMetrics] = useState({
    queryLatency: 0,
    indexingSpeed: 0,
    memoryUsage: 0,
    storageUsage: 0,
    queryThroughput: 0,
    successRate: 0,
    activeQueries: 0,
    totalQueries: 0,
  });

  const [historicalData, setHistoricalData] = useState({
    timestamps: [],
    latency: [],
    throughput: [],
    memory: [],
    errors: [],
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = autoRefresh ? setInterval(fetchMetrics, 5000) : null;
    return () => interval && clearInterval(interval);
  }, [selectedTimeRange, autoRefresh]);

  const fetchMetrics = async () => {
    try {
      // Simulate fetching metrics - replace with actual API call
      const mockData = generateMockData();
      setMetrics(mockData.current);
      setHistoricalData(mockData.historical);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching RAG metrics:', error);
      setLoading(false);
    }
  };

  const generateMockData = () => {
    const points = 20;
    const now = Date.now();
    const interval = 60000; // 1 minute

    return {
      current: {
        queryLatency: 45 + Math.random() * 20,
        indexingSpeed: 1000 + Math.random() * 500,
        memoryUsage: 60 + Math.random() * 20,
        storageUsage: 45 + Math.random() * 10,
        queryThroughput: 100 + Math.random() * 50,
        successRate: 95 + Math.random() * 4,
        activeQueries: Math.floor(Math.random() * 10),
        totalQueries: 10000 + Math.floor(Math.random() * 1000),
      },
      historical: {
        timestamps: Array.from({ length: points }, (_, i) => 
          new Date(now - (points - i) * interval).toLocaleTimeString()
        ),
        latency: Array.from({ length: points }, () => 40 + Math.random() * 30),
        throughput: Array.from({ length: points }, () => 80 + Math.random() * 60),
        memory: Array.from({ length: points }, () => 50 + Math.random() * 30),
        errors: Array.from({ length: points }, () => Math.random() * 5),
      },
    };
  };

  const latencyChartData = {
    labels: historicalData.timestamps,
    datasets: [
      {
        label: 'Query Latency (ms)',
        data: historicalData.latency,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const throughputChartData = {
    labels: historicalData.timestamps,
    datasets: [
      {
        label: 'Queries/min',
        data: historicalData.throughput,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
    ],
  };

  const resourceChartData = {
    labels: ['Memory', 'Storage', 'CPU'],
    datasets: [
      {
        data: [metrics.memoryUsage, metrics.storageUsage, 70],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
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
      y: {
        beginAtZero: true,
      },
    },
  };

  const exportMetrics = () => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange: selectedTimeRange,
      metrics,
      historicalData,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-performance-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          RAG Performance Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="5m">Last 5 min</MenuItem>
              <MenuItem value="1h">Last 1 hour</MenuItem>
              <MenuItem value="6h">Last 6 hours</MenuItem>
              <MenuItem value="24h">Last 24 hours</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchMetrics}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Metrics">
            <IconButton onClick={exportMetrics}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Query Latency
                  </Typography>
                  <Typography variant="h4">
                    {metrics.queryLatency.toFixed(0)}ms
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingDownIcon color="success" fontSize="small" />
                    <Typography variant="caption" color="success.main">
                      -12% from last hour
                    </Typography>
                  </Box>
                </Box>
                <SpeedIcon fontSize="large" color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Throughput
                  </Typography>
                  <Typography variant="h4">
                    {metrics.queryThroughput.toFixed(0)}/min
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUpIcon color="success" fontSize="small" />
                    <Typography variant="caption" color="success.main">
                      +8% from last hour
                    </Typography>
                  </Box>
                </Box>
                <TimelineIcon fontSize="large" color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h4">
                    {metrics.successRate.toFixed(1)}%
                  </Typography>
                  <Chip
                    label="Healthy"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <AssessmentIcon fontSize="large" color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Queries
                  </Typography>
                  <Typography variant="h4">
                    {metrics.activeQueries}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total: {metrics.totalQueries.toLocaleString()}
                  </Typography>
                </Box>
                <StorageIcon fontSize="large" color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Query Latency Trend
            </Typography>
            <Box sx={{ height: 240 }}>
              <Line data={latencyChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Query Throughput
            </Typography>
            <Box sx={{ height: 240 }}>
              <Bar data={throughputChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Resource Usage
            </Typography>
            <Box sx={{ height: 240, display: 'flex', justifyContent: 'center' }}>
              <Doughnut 
                data={resourceChartData} 
                options={{
                  ...chartOptions,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Alert severity="success">
                  Vector Database: Operational
                </Alert>
              </Grid>
              <Grid item xs={6}>
                <Alert severity="success">
                  Embedding Service: Operational
                </Alert>
              </Grid>
              <Grid item xs={6}>
                <Alert severity="warning">
                  Cache Hit Rate: 78% (Below target)
                </Alert>
              </Grid>
              <Grid item xs={6}>
                <Alert severity="info">
                  Index Size: 2.4 GB
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RAGPerformanceDashboard;