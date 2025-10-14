/**
 * Validation Monitoring Dashboard
 * Real-time monitoring and analytics for validation system
 *
 * @module ValidationDashboard
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  IconButton,
  Button,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  CircularProgress,
  Tooltip,
  Badge,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Fade,
  Grow
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment,
  Security,
  Speed,
  Error as ErrorIcon,
  CheckCircle,
  Warning,
  Info,
  Refresh,
  Download,
  FilterList,
  TrendingUp,
  TrendingDown,
  Analytics,
  VerifiedUser,
  BugReport,
  Timeline,
  DataUsage,
  Memory
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subHours, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  getValidationMetrics,
  getAuditLogs,
  getPerformanceMetrics,
  getComplianceStatus
} from '../../../utils/validation/monitoring';
import { ErrorCategory, NotificationLevel } from '../../../utils/validation';

/**
 * Main dashboard component
 */
const ValidationDashboard = () => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [loading, setLoading] = useState(true);

  // Metrics state
  const [validationMetrics, setValidationMetrics] = useState(null);
  const [errorMetrics, setErrorMetrics] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [complianceMetrics, setComplianceMetrics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Time series data
  const [validationTimeSeries, setValidationTimeSeries] = useState([]);
  const [errorTimeSeries, setErrorTimeSeries] = useState([]);
  const [performanceTimeSeries, setPerformanceTimeSeries] = useState([]);

  /**
   * Fetch all metrics
   */
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);

      // Get time range
      const now = new Date();
      let startTime;
      switch (timeRange) {
        case '1h':
          startTime = subHours(now, 1);
          break;
        case '24h':
          startTime = subDays(now, 1);
          break;
        case '7d':
          startTime = subDays(now, 7);
          break;
        case '30d':
          startTime = subDays(now, 30);
          break;
        default:
          startTime = subDays(now, 1);
      }

      // Fetch all metrics in parallel
      const [validation, errors, performance, compliance, logs] = await Promise.all([
        getValidationMetrics(startTime, now),
        getErrorMetrics(startTime, now),
        getPerformanceMetrics(startTime, now),
        getComplianceStatus(),
        getAuditLogs({ startTime, endTime: now, limit: 100 })
      ]);

      // Update state
      setValidationMetrics(validation);
      setErrorMetrics(errors);
      setPerformanceMetrics(performance);
      setComplianceMetrics(compliance);
      setAuditLogs(logs);

      // Process time series data
      processTimeSeriesData(validation, errors, performance);

    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  /**
   * Process time series data for charts
   */
  const processTimeSeriesData = (validation, errors, performance) => {
    // Validation time series
    const validationSeries = validation.timeSeries?.map(point => ({
      time: format(new Date(point.timestamp), 'HH:mm'),
      total: point.total,
      successful: point.successful,
      failed: point.failed,
      successRate: point.successRate
    })) || [];
    setValidationTimeSeries(validationSeries);

    // Error time series
    const errorSeries = errors.timeSeries?.map(point => ({
      time: format(new Date(point.timestamp), 'HH:mm'),
      validation: point.categories?.VALIDATION || 0,
      calculation: point.categories?.CALCULATION || 0,
      input: point.categories?.INPUT || 0,
      system: point.categories?.SYSTEM || 0
    })) || [];
    setErrorTimeSeries(errorSeries);

    // Performance time series
    const performanceSeries = performance.timeSeries?.map(point => ({
      time: format(new Date(point.timestamp), 'HH:mm'),
      avgResponseTime: point.avgResponseTime,
      p95ResponseTime: point.p95ResponseTime,
      p99ResponseTime: point.p99ResponseTime,
      throughput: point.throughput
    })) || [];
    setPerformanceTimeSeries(performanceSeries);
  };

  /**
   * Auto refresh effect
   */
  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  /**
   * Overview tab content
   */
  const OverviewTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics Cards */}
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Total Validations"
          value={validationMetrics?.total || 0}
          change={validationMetrics?.changePercent || 0}
          icon={<Assessment />}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Success Rate"
          value={`${validationMetrics?.successRate?.toFixed(1) || 0}%`}
          change={validationMetrics?.successRateChange || 0}
          icon={<CheckCircle />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Error Rate"
          value={`${errorMetrics?.errorRate?.toFixed(1) || 0}%`}
          change={errorMetrics?.errorRateChange || 0}
          icon={<ErrorIcon />}
          color="error"
          invertChange
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Avg Response Time"
          value={`${performanceMetrics?.avgResponseTime?.toFixed(0) || 0}ms`}
          change={performanceMetrics?.responseTimeChange || 0}
          icon={<Speed />}
          color="warning"
          invertChange
        />
      </Grid>

      {/* Validation Success Chart */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Validation Trends
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={validationTimeSeries}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f44336" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <ChartTooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="successful"
                stroke="#4caf50"
                fillOpacity={1}
                fill="url(#colorSuccess)"
                name="Successful"
              />
              <Area
                type="monotone"
                dataKey="failed"
                stroke="#f44336"
                fillOpacity={1}
                fill="url(#colorFailed)"
                name="Failed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Error Distribution */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Error Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Validation', value: errorMetrics?.categories?.VALIDATION || 0, color: '#ff9800' },
                  { name: 'Calculation', value: errorMetrics?.categories?.CALCULATION || 0, color: '#f44336' },
                  { name: 'Input', value: errorMetrics?.categories?.INPUT || 0, color: '#9c27b0' },
                  { name: 'System', value: errorMetrics?.categories?.SYSTEM || 0, color: '#3f51b5' }
                ]}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label
              >
                {errorMetrics?.categories && Object.keys(errorMetrics.categories).map((key, index) => (
                  <Cell key={`cell-${index}`} fill={['#ff9800', '#f44336', '#9c27b0', '#3f51b5'][index]} />
                ))}
              </Pie>
              <ChartTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Recent Alerts */}
      <Grid item xs={12}>
        <RecentAlerts alerts={errorMetrics?.recentAlerts || []} />
      </Grid>
    </Grid>
  );

  /**
   * Performance tab content
   */
  const PerformanceTab = () => (
    <Grid container spacing={3}>
      {/* Performance Metrics */}
      <Grid item xs={12} md={3}>
        <PerformanceMetric
          label="P50 Response Time"
          value={performanceMetrics?.p50ResponseTime || 0}
          unit="ms"
          threshold={100}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <PerformanceMetric
          label="P95 Response Time"
          value={performanceMetrics?.p95ResponseTime || 0}
          unit="ms"
          threshold={500}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <PerformanceMetric
          label="P99 Response Time"
          value={performanceMetrics?.p99ResponseTime || 0}
          unit="ms"
          threshold={1000}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <PerformanceMetric
          label="Throughput"
          value={performanceMetrics?.throughput || 0}
          unit="req/s"
          threshold={100}
          higherIsBetter
        />
      </Grid>

      {/* Response Time Chart */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Response Time Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={performanceTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
              <ChartTooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgResponseTime"
                stroke="#2196f3"
                name="Average"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="p95ResponseTime"
                stroke="#ff9800"
                name="P95"
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="p99ResponseTime"
                stroke="#f44336"
                name="P99"
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Resource Usage */}
      <Grid item xs={12} md={6}>
        <ResourceUsageCard metrics={performanceMetrics?.resourceUsage} />
      </Grid>

      {/* Cache Performance */}
      <Grid item xs={12} md={6}>
        <CachePerformanceCard metrics={performanceMetrics?.cacheMetrics} />
      </Grid>
    </Grid>
  );

  /**
   * Compliance tab content
   */
  const ComplianceTab = () => (
    <Grid container spacing={3}>
      {/* Compliance Status Cards */}
      <Grid item xs={12} md={4}>
        <ComplianceCard
          standard="FDA 21 CFR Part 11"
          status={complianceMetrics?.fda21CFR11}
          lastAudit={complianceMetrics?.lastFDAaudit}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <ComplianceCard
          standard="GxP"
          status={complianceMetrics?.gxp}
          lastAudit={complianceMetrics?.lastGxPaudit}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <ComplianceCard
          standard="ISO 9001:2015"
          status={complianceMetrics?.iso9001}
          lastAudit={complianceMetrics?.lastISOaudit}
        />
      </Grid>

      {/* Audit Trail Summary */}
      <Grid item xs={12}>
        <AuditTrailSummary logs={auditLogs} />
      </Grid>

      {/* Compliance Checklist */}
      <Grid item xs={12} md={6}>
        <ComplianceChecklist items={complianceMetrics?.checklist || []} />
      </Grid>

      {/* Data Integrity Metrics */}
      <Grid item xs={12} md={6}>
        <DataIntegrityMetrics metrics={complianceMetrics?.dataIntegrity} />
      </Grid>
    </Grid>
  );

  /**
   * Audit Logs tab content
   */
  const AuditLogsTab = () => (
    <Box>
      <AuditLogViewer logs={auditLogs} onRefresh={fetchMetrics} />
    </Box>
  );

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <DashboardIcon color="primary" fontSize="large" />
          <Typography variant="h4">
            Validation Monitoring Dashboard
          </Typography>
          <Chip
            label={loading ? "Updating..." : "Live"}
            color={loading ? "default" : "success"}
            size="small"
            icon={loading ? <CircularProgress size={12} /> : <CheckCircle />}
          />
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          {/* Time Range Selector */}
          <FormControl size="small">
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>

          {/* Auto Refresh Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto Refresh"
          />

          {/* Manual Refresh */}
          <IconButton onClick={fetchMetrics} disabled={loading}>
            <Refresh />
          </IconButton>

          {/* Export Button */}
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportMetrics()}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Overview" icon={<DashboardIcon />} iconPosition="start" />
          <Tab label="Performance" icon={<Speed />} iconPosition="start" />
          <Tab label="Compliance" icon={<VerifiedUser />} iconPosition="start" />
          <Tab label="Audit Logs" icon={<Security />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Fade in={!loading} timeout={500}>
        <Box>
          {activeTab === 0 && <OverviewTab />}
          {activeTab === 1 && <PerformanceTab />}
          {activeTab === 2 && <ComplianceTab />}
          {activeTab === 3 && <AuditLogsTab />}
        </Box>
      </Fade>
    </Box>
  );
};

/**
 * Metric card component
 */
const MetricCard = ({ title, value, change, icon, color, invertChange = false }) => {
  const isPositive = invertChange ? change < 0 : change > 0;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4">
              {value}
            </Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {isPositive ? (
                <TrendingUp color="success" fontSize="small" />
              ) : (
                <TrendingDown color="error" fontSize="small" />
              )}
              <Typography
                variant="body2"
                color={isPositive ? 'success.main' : 'error.main'}
                ml={0.5}
              >
                {Math.abs(change)}%
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {React.cloneElement(icon, { color, fontSize: 'large' })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Performance metric component
 */
const PerformanceMetric = ({ label, value, unit, threshold, higherIsBetter = false }) => {
  const isGood = higherIsBetter ? value >= threshold : value <= threshold;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="h4" color={isGood ? 'success.main' : 'warning.main'}>
        {value}
        <Typography component="span" variant="h6" color="textSecondary" ml={0.5}>
          {unit}
        </Typography>
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min((value / threshold) * 100, 100)}
        color={isGood ? 'success' : 'warning'}
        sx={{ mt: 1 }}
      />
      <Typography variant="caption" color="textSecondary">
        Threshold: {threshold}{unit}
      </Typography>
    </Paper>
  );
};

/**
 * Recent alerts component
 */
const RecentAlerts = ({ alerts }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" gutterBottom>
      Recent Alerts
    </Typography>
    {alerts.length === 0 ? (
      <Alert severity="success">
        <AlertTitle>All Clear</AlertTitle>
        No validation alerts in the selected time range
      </Alert>
    ) : (
      alerts.map((alert, index) => (
        <Alert
          key={index}
          severity={alert.level === 'CRITICAL' ? 'error' : alert.level === 'WARNING' ? 'warning' : 'info'}
          sx={{ mb: 1 }}
        >
          <AlertTitle>{alert.title}</AlertTitle>
          {alert.message} - {format(new Date(alert.timestamp), 'PPpp')}
        </Alert>
      ))
    )}
  </Paper>
);

/**
 * Export metrics function
 */
const exportMetrics = () => {
  // Implementation would export metrics to CSV/JSON
  console.log('Exporting metrics...');
};

/**
 * Get error metrics (mock implementation)
 */
const getErrorMetrics = async (startTime, endTime) => {
  // Mock implementation - would fetch from backend
  return {
    errorRate: 2.3,
    errorRateChange: -0.5,
    categories: {
      VALIDATION: 45,
      CALCULATION: 23,
      INPUT: 18,
      SYSTEM: 14
    },
    recentAlerts: [],
    timeSeries: []
  };
};

export default ValidationDashboard;