import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Circle as CircleIcon,
  Refresh as RefreshIcon,
  Stop as StopIcon,
  PlayArrow as PlayArrowIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  DataUsage as DataUsageIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cable as CableIcon
} from '@mui/icons-material';

const WebSocketMonitoringPage = () => {
  const [connections, setConnections] = useState([
    {
      id: 'ws-001',
      endpoint: '/ws/analytics',
      status: 'connected',
      uptime: '2h 15m',
      messages: 1542,
      latency: 12,
      errors: 0
    },
    {
      id: 'ws-002',
      endpoint: '/ws/collaboration',
      status: 'connected',
      uptime: '45m',
      messages: 823,
      latency: 8,
      errors: 2
    },
    {
      id: 'ws-003',
      endpoint: '/ws/notifications',
      status: 'disconnected',
      uptime: '0m',
      messages: 0,
      latency: 0,
      errors: 5
    }
  ]);

  const [autoReconnect, setAutoReconnect] = useState(true);
  const [monitoringActive, setMonitoringActive] = useState(true);

  const messageLog = [
    {
      id: 1,
      timestamp: '14:23:45',
      connection: 'ws-001',
      type: 'incoming',
      message: '{"type": "analysis_update", "status": "completed", "id": "12345"}',
      size: '128 bytes'
    },
    {
      id: 2,
      timestamp: '14:23:42',
      connection: 'ws-002',
      type: 'outgoing',
      message: '{"type": "user_activity", "action": "edit", "document": "67890"}',
      size: '96 bytes'
    },
    {
      id: 3,
      timestamp: '14:23:38',
      connection: 'ws-001',
      type: 'incoming',
      message: '{"type": "progress_update", "percentage": 75}',
      size: '64 bytes'
    },
    {
      id: 4,
      timestamp: '14:23:35',
      connection: 'ws-003',
      type: 'error',
      message: 'Connection timeout: Unable to establish WebSocket connection',
      size: '-'
    }
  ];

  const performanceMetrics = {
    totalConnections: 3,
    activeConnections: 2,
    messagesPerSecond: 4.2,
    averageLatency: 10,
    uptime: 99.8,
    dataTransferred: '125 MB'
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CircleIcon sx={{ color: 'success.main', fontSize: 12 }} />;
      case 'disconnected':
        return <CircleIcon sx={{ color: 'error.main', fontSize: 12 }} />;
      case 'connecting':
        return <CircleIcon sx={{ color: 'warning.main', fontSize: 12 }} />;
      default:
        return <CircleIcon sx={{ color: 'grey.500', fontSize: 12 }} />;
    }
  };

  const getMessageTypeColor = (type) => {
    switch (type) {
      case 'incoming': return 'primary';
      case 'outgoing': return 'secondary';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              WebSocket Monitoring
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Real-time monitoring of WebSocket connections and message flow.
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button 
              variant="outlined" 
              startIcon={monitoringActive ? <StopIcon /> : <PlayArrowIcon />}
              onClick={() => setMonitoringActive(!monitoringActive)}
            >
              {monitoringActive ? 'Stop' : 'Start'} Monitoring
            </Button>
            <IconButton color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Performance Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Connections
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.totalConnections}
                  </Typography>
                </Box>
                <CableIcon color="primary" />
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
                    Active
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {performanceMetrics.activeConnections}
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
                    Messages/sec
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.messagesPerSecond}
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
                    Avg Latency
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.averageLatency}ms
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
                    Uptime
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.uptime}%
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
                    Data Transfer
                  </Typography>
                  <Typography variant="h4">
                    {performanceMetrics.dataTransferred}
                  </Typography>
                </Box>
                <DataUsageIcon color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Connection Status */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Active Connections
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoReconnect}
                    onChange={(e) => setAutoReconnect(e.target.checked)}
                  />
                }
                label="Auto-reconnect"
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Uptime</TableCell>
                    <TableCell align="right">Messages</TableCell>
                    <TableCell align="right">Latency</TableCell>
                    <TableCell align="right">Errors</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {connections.map((conn) => (
                    <TableRow key={conn.id}>
                      <TableCell>{conn.endpoint}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {getStatusIcon(conn.status)}
                          <Typography variant="body2">
                            {conn.status}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{conn.uptime}</TableCell>
                      <TableCell align="right">{conn.messages}</TableCell>
                      <TableCell align="right">{conn.latency}ms</TableCell>
                      <TableCell align="right">
                        {conn.errors > 0 && (
                          <Chip 
                            label={conn.errors} 
                            size="small" 
                            color="error" 
                          />
                        )}
                        {conn.errors === 0 && '-'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small">
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Message Log */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Message Log
            </Typography>
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {messageLog.map((log) => (
                <ListItem key={log.id}>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {log.timestamp}
                        </Typography>
                        <Chip 
                          label={log.connection} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={log.type} 
                          size="small" 
                          color={getMessageTypeColor(log.type)}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {log.size}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.75rem',
                          color: log.type === 'error' ? 'error.main' : 'text.secondary',
                          wordBreak: 'break-all'
                        }}
                      >
                        {log.message}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Health Status */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Alert severity="success">
                  WebSocket server is operational
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="warning">
                  1 connection experiencing intermittent issues
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="info">
                  Last system check: 2 minutes ago
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default WebSocketMonitoringPage;