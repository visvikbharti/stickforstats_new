import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  SignalCellularAlt as SignalIcon,
  SignalCellularConnectedNoInternet0Bar as NoSignalIcon,
} from '@mui/icons-material';

const DOEWebSocketIntegration = ({ 
  analysisId,
  onUpdate,
  onComplete,
  onError,
  wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
  autoConnect = true,
}) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${wsUrl}/doe/${analysisId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('DOE WebSocket connected');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        setError(null);
        
        // Send initial message to subscribe to analysis updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          analysisId: analysisId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'progress':
              setProgress(data.progress || 0);
              setStatusMessage(data.message || '');
              if (onUpdate) onUpdate(data);
              break;
              
            case 'result':
              setProgress(100);
              setStatusMessage('Analysis complete');
              if (onComplete) onComplete(data.result);
              break;
              
            case 'error':
              setError(data.error || 'Unknown error occurred');
              if (onError) onError(data.error);
              break;
              
            case 'status':
              setStatusMessage(data.message || '');
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('DOE WebSocket error:', event);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('DOE WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts && autoConnect) {
          setReconnectAttempts(prev => prev + 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
            connect();
          }, reconnectDelay);
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to establish WebSocket connection');
      setConnectionStatus('error');
    }
  }, [analysisId, wsUrl, onUpdate, onComplete, onError, reconnectAttempts, autoConnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setReconnectAttempts(0);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setError(null);
    setReconnectAttempts(0);
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (autoConnect && analysisId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [analysisId, autoConnect, connect, disconnect]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <SignalIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'disconnected':
        return <NoSignalIcon color="disabled" />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      case 'disconnected':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          {getStatusIcon()}
          <Typography variant="h6">
            DOE Analysis Progress
          </Typography>
          <Chip
            label={connectionStatus}
            size="small"
            color={getStatusColor()}
            variant="outlined"
          />
        </Box>
        
        <Tooltip title="Reconnect">
          <IconButton
            onClick={reconnect}
            disabled={connectionStatus === 'connected'}
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Reconnecting... Attempt {reconnectAttempts} of {maxReconnectAttempts}
        </Alert>
      )}

      <Box mb={2}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {statusMessage || 'Waiting for analysis to start...'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {progress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'grey.300',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: progress === 100 
                ? 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            },
          }}
        />
      </Box>

      {progress === 100 && (
        <Box display="flex" alignItems="center" gap={1} color="success.main">
          <CheckCircleIcon />
          <Typography variant="body2">
            Analysis completed successfully!
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default DOEWebSocketIntegration;