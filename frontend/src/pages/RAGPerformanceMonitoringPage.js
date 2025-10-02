import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Button,
  IconButton,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  QueryStats as QueryStatsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Timer as TimerIcon,
  Storage as StorageIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Line, Bar } from 'recharts';

const RAGPerformanceMonitoringPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const performanceMetrics = {
    queryLatency: 234,
    retrievalAccuracy: 92.5,
    responseQuality: 88.3,
    systemUptime: 99.7,
    indexSize: '2.4 GB',
    documentsIndexed: 45678
  };

  const recentQueries = [
    {
      id: 1,
      query: 'How to perform time series decomposition?',
      latency: 156,
      relevance: 0.95,
      sources: 4,
      timestamp: '2025-06-21 14:32:15',
      status: 'success'
    },
    {
      id: 2,
      query: 'Statistical significance testing methods',
      latency: 289,
      relevance: 0.88,
      sources: 6,
      timestamp: '2025-06-21 14:28:42',
      status: 'success'
    },
    {
      id: 3,
      query: 'Bayesian vs frequentist approaches',
      latency: 412,
      relevance: 0.76,
      sources: 3,
      timestamp: '2025-06-21 14:25:18',
      status: 'warning'
    },
    {
      id: 4,
      query: 'Machine learning model evaluation metrics',
      latency: 523,
      relevance: 0.45,
      sources: 2,
      timestamp: '2025-06-21 14:22:30',
      status: 'error'
    }
  ];

  const documentStats = [
    { category: 'Statistical Methods', count: 12450, percentage: 27.3 },
    { category: 'Tutorial Content', count: 8932, percentage: 19.6 },
    { category: 'Research Papers', count: 7845, percentage: 17.2 },
    { category: 'Documentation', count: 6234, percentage: 13.7 },
    { category: 'Case Studies', count: 5123, percentage: 11.2 },
    { category: 'Other', count: 5094, percentage: 11.0 }
  ];

  const hourlyPerformance = [
    { hour: '00:00', queries: 45, latency: 210 },
    { hour: '04:00', queries: 12, latency: 180 },
    { hour: '08:00', queries: 156, latency: 245 },
    { hour: '12:00', queries: 234, latency: 298 },
    { hour: '16:00', queries: 198, latency: 267 },
    { hour: '20:00', queries: 87, latency: 223 }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getRelevanceColor = (relevance) => {
    if (relevance >= 0.8) return 'success.main';
    if (relevance >= 0.6) return 'warning.main';
    return 'error.main';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              RAG Performance Monitoring
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor the performance and effectiveness of the Retrieval-Augmented Generation system.
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="outlined" startIcon={<DownloadIcon />}>
              Export Report
            </Button>
            <IconButton color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Avg Query Latency
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.queryLatency}ms
                  </Typography>
                </Box>
                <SpeedIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Retrieval Accuracy
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {performanceMetrics.retrievalAccuracy}%
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Response Quality
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.responseQuality}%
                  </Typography>
                </Box>
                <QueryStatsIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    System Uptime
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.systemUptime}%
                  </Typography>
                </Box>
                <TimerIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Index Size
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.indexSize}
                  </Typography>
                </Box>
                <StorageIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Documents
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.documentsIndexed.toLocaleString()}
                  </Typography>
                </Box>
                <MemoryIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Recent Queries" />
          <Tab label="Document Statistics" />
          <Tab label="Performance Trends" />
          <Tab label="System Health" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Queries
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Query</TableCell>
                  <TableCell align="right">Latency</TableCell>
                  <TableCell align="right">Relevance</TableCell>
                  <TableCell align="right">Sources</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentQueries.map((query) => (
                  <TableRow key={query.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 400 }}>
                        {query.query}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        {query.latency}ms
                        {query.latency > 400 && (
                          <Tooltip title="High latency detected">
                            <ErrorIcon color="error" fontSize="small" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        <LinearProgress 
                          variant="determinate" 
                          value={query.relevance * 100} 
                          sx={{ 
                            width: 60,
                            bgcolor: 'grey.300',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getRelevanceColor(query.relevance)
                            }
                          }}
                        />
                        <Typography variant="body2">
                          {(query.relevance * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{query.sources}</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {query.timestamp}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={query.status} 
                        size="small" 
                        color={getStatusColor(query.status)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Document Statistics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Document Categories
              </Typography>
              <List>
                {documentStats.map((stat, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={stat.category}
                      secondary={`${stat.count.toLocaleString()} documents`}
                    />
                    <Box sx={{ minWidth: 200 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress 
                          variant="determinate" 
                          value={stat.percentage} 
                          sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2">
                          {stat.percentage}%
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Last index update: 2 hours ago
              </Alert>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button variant="outlined" fullWidth>
                  Rebuild Index
                </Button>
                <Button variant="outlined" fullWidth>
                  Add Documents
                </Button>
                <Button variant="outlined" fullWidth>
                  Optimize Index
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Performance Trends
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Query Volume (24h)
              </Typography>
              <Box sx={{ height: 300, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">
                  Query volume chart visualization
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Response Latency (24h)
              </Typography>
              <Box sx={{ height: 300, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">
                  Latency trend chart visualization
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Health
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Alert severity="success">
                All RAG components operational
              </Alert>
            </Grid>
            <Grid item xs={12} md={4}>
              <Alert severity="warning">
                Index optimization recommended
              </Alert>
            </Grid>
            <Grid item xs={12} md={4}>
              <Alert severity="info">
                Next scheduled maintenance: 7 days
              </Alert>
            </Grid>
          </Grid>
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Component Status
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Vector Database"
                  secondary="Operational - 156ms avg response"
                />
                <CheckCircleIcon color="success" />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Embedding Service"
                  secondary="Operational - Processing 234 req/min"
                />
                <CheckCircleIcon color="success" />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Query Processor"
                  secondary="Operational - 0.002% error rate"
                />
                <CheckCircleIcon color="success" />
              </ListItem>
            </List>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default RAGPerformanceMonitoringPage;