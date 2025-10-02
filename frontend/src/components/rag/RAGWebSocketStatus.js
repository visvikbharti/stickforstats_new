import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Alert,
} from '@mui/material';
import {
  WifiTethering as ConnectedIcon,
  WifiTetheringOff as DisconnectedIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Circle as CircleIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  SwapVert as DataTransferIcon,
} from '@mui/icons-material';

const RAGWebSocketStatus = ({ 
  wsConnection,
  showDetails = true,
  compact = false,
  position = 'bottom-right',
  autoHide = false,
  hideDelay = 5000,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const [metrics, setMetrics] = useState({
    latency: 0,
    messagesSent: 0,
    messagesReceived: 0,
    bytesTransferred: 0,
    uptime: 0,
    reconnectAttempts: 0,
  });
  const [statusHistory, setStatusHistory] = useState([]);

  // Update metrics from websocket connection
  useEffect(() => {
    if (wsConnection) {
      const updateMetrics = () => {
        setMetrics(prev => ({
          ...prev,
          latency: wsConnection.latency || 0,
          messagesSent: wsConnection.messagesSent || prev.messagesSent,
          messagesReceived: wsConnection.messagesReceived || prev.messagesReceived,
          bytesTransferred: wsConnection.bytesTransferred || prev.bytesTransferred,
          uptime: wsConnection.uptime || 0,
          reconnectAttempts: wsConnection.reconnectAttempts || 0,
        }));
      };

      const interval = setInterval(updateMetrics, 1000);
      return () => clearInterval(interval);
    }
  }, [wsConnection]);

  // Auto-hide functionality
  useEffect(() => {
    if (autoHide && wsConnection?.status === 'connected') {
      const timer = setTimeout(() => {
        setVisible(false);
      }, hideDelay);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [autoHide, hideDelay, wsConnection?.status]);

  // Track status changes
  useEffect(() => {
    if (wsConnection?.status) {
      setStatusHistory(prev => [
        {
          status: wsConnection.status,
          timestamp: new Date(),
          message: wsConnection.message || '',
        },
        ...prev.slice(0, 9), // Keep last 10 entries
      ]);
    }
  }, [wsConnection?.status]);

  const getStatusColor = () => {
    switch (wsConnection?.status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'disconnected':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (wsConnection?.status) {
      case 'connected':
        return <ConnectedIcon />;
      case 'connecting':
        return (
          <Badge badgeContent="..." color="warning">
            <ConnectedIcon />
          </Badge>
        );
      case 'disconnected':
        return <DisconnectedIcon />;
      case 'error':
        return <ErrorIcon />;
      default:
        return <DisconnectedIcon />;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const handleReconnect = () => {
    if (wsConnection?.reconnect) {
      wsConnection.reconnect();
    }
  };

  if (!visible && autoHide) {
    return null;
  }

  const positionStyles = {
    'bottom-right': { position: 'fixed', bottom: 16, right: 16 },
    'bottom-left': { position: 'fixed', bottom: 16, left: 16 },
    'top-right': { position: 'fixed', top: 16, right: 16 },
    'top-left': { position: 'fixed', top: 16, left: 16 },
  };

  if (compact) {
    return (
      <Box sx={{ ...positionStyles[position], zIndex: 1300 }}>
        <Tooltip title={`WebSocket: ${wsConnection?.status || 'disconnected'}`}>
          <Chip
            icon={getStatusIcon()}
            label={wsConnection?.status || 'disconnected'}
            color={getStatusColor()}
            size="small"
            onClick={() => setExpanded(!expanded)}
          />
        </Tooltip>
      </Box>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        ...positionStyles[position],
        zIndex: 1300,
        minWidth: 300,
        maxWidth: 400,
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          {getStatusIcon()}
          <Typography variant="subtitle2" fontWeight="medium">
            RAG WebSocket
          </Typography>
          <Chip
            label={wsConnection?.status || 'disconnected'}
            color={getStatusColor()}
            size="small"
          />
        </Box>
        
        <Box display="flex" alignItems="center">
          {wsConnection?.status === 'disconnected' && (
            <Tooltip title="Reconnect">
              <IconButton size="small" onClick={handleReconnect}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {showDetails && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
      </Box>

      {wsConnection?.status === 'connecting' && (
        <LinearProgress />
      )}

      {wsConnection?.error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {wsConnection.error}
        </Alert>
      )}

      <Collapse in={expanded && showDetails}>
        <Box sx={{ p: 2 }}>
          {/* Metrics */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Connection Metrics
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <SpeedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Latency"
                secondary={`${metrics.latency}ms`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DataTransferIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Data Transferred"
                secondary={formatBytes(metrics.bytesTransferred)}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TimerIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Uptime"
                secondary={formatUptime(metrics.uptime)}
              />
            </ListItem>
          </List>

          {/* Status History */}
          {statusHistory.length > 0 && (
            <>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                gutterBottom 
                sx={{ mt: 2 }}
              >
                Recent Status Changes
              </Typography>
              <List dense sx={{ maxHeight: 120, overflow: 'auto' }}>
                {statusHistory.map((entry, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CircleIcon 
                        fontSize="small" 
                        color={
                          entry.status === 'connected' ? 'success' :
                          entry.status === 'error' ? 'error' : 'disabled'
                        }
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={entry.status}
                      secondary={new Date(entry.timestamp).toLocaleTimeString()}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default RAGWebSocketStatus;