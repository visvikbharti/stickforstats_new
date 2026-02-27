import { useState, useEffect, useCallback, useRef } from 'react';
import { secureWebSocketUrl, createWebSocketOptions, safeSend, isWebSocketConnected } from '../utils/secureWebSocketUtils';

/**
 * Custom hook for DOE WebSocket communication.
 * NOTE: ASGI/Channels is not currently configured on the backend.
 * This hook gracefully handles connection failures and will not spam
 * console errors. When ASGI is enabled, WebSocket connections will
 * work automatically.
 */
const useDOEWebSocket = (analysisId, options = {}) => {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    onMessage,
    onError,
    onStatusChange,
  } = options;

  const [status, setStatus] = useState('disconnected');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectCountRef = useRef(0);

  // Update status and notify
  const updateStatus = useCallback((newStatus) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  }, [onStatusChange]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      updateStatus('connecting');
      const wsUrl = secureWebSocketUrl(`/doe/analysis/${analysisId}`);
      const _wsOptions = createWebSocketOptions();

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // DOE WebSocket connected
        updateStatus('connected');
        reconnectCountRef.current = 0;
        setError(null);
        
        // Subscribe to analysis updates
        safeSend(ws, {
          type: 'subscribe',
          analysisId: analysisId,
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'progress':
              setProgress(message.progress || 0);
              setData(prev => ({
                ...prev,
                status: 'processing',
                progress: message.progress,
                message: message.message,
              }));
              break;
              
            case 'result':
              setProgress(100);
              setData({
                status: 'completed',
                result: message.result,
                completedAt: new Date().toISOString(),
              });
              break;
              
            case 'error':
              setError(message.error || 'Unknown error occurred');
              setData(prev => ({
                ...prev,
                status: 'error',
                error: message.error,
              }));
              if (onError) onError(message.error);
              break;
              
            case 'status':
              setData(prev => ({
                ...prev,
                ...message.data,
              }));
              break;
              
            default:
              // Unknown DOE message type
          }
          
          if (onMessage) {
            onMessage(message);
          }
        } catch (err) {
          console.error('Error parsing DOE WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        // Log at warn level to avoid console.error spam when ASGI is not configured
        if (reconnectCountRef.current === 0) {
          console.warn('DOE WebSocket connection failed. ASGI may not be configured. Falling back to REST.');
        }
        updateStatus('error');
        setError('WebSocket connection error');
        if (onError) onError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        // DOE WebSocket closed
        updateStatus('disconnected');
        wsRef.current = null;
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts && autoConnect) {
          reconnectCountRef.current++;
          // Attempting to reconnect
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectCountRef.current);
        }
      };
    } catch (err) {
      // Log once at warn level; avoid console.error spam when ASGI is not configured
      if (reconnectCountRef.current === 0) {
        console.warn('DOE WebSocket creation failed. ASGI may not be configured.', err.message);
      }
      setError('Failed to establish WebSocket connection');
      updateStatus('error');
    }
  }, [analysisId, updateStatus, reconnectAttempts, reconnectDelay, autoConnect, onMessage, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    updateStatus('disconnected');
    reconnectCountRef.current = 0;
  }, [updateStatus]);

  // Send message through WebSocket
  const sendMessage = useCallback(async (message) => {
    if (!isWebSocketConnected(wsRef.current)) {
      console.warn('Cannot send message: WebSocket is not connected');
      return false;
    }
    
    return await safeSend(wsRef.current, message);
  }, []);

  // Start analysis
  const startAnalysis = useCallback(async (parameters) => {
    return sendMessage({
      type: 'start_analysis',
      analysisId,
      parameters,
    });
  }, [analysisId, sendMessage]);

  // Cancel analysis
  const cancelAnalysis = useCallback(async () => {
    return sendMessage({
      type: 'cancel_analysis',
      analysisId,
    });
  }, [analysisId, sendMessage]);

  // Update analysis parameters
  const updateParameters = useCallback(async (parameters) => {
    return sendMessage({
      type: 'update_parameters',
      analysisId,
      parameters,
    });
  }, [analysisId, sendMessage]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (autoConnect && analysisId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [analysisId, autoConnect, connect, disconnect]);

  return {
    // State
    status,
    data,
    error,
    progress,
    isConnected: status === 'connected',
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    startAnalysis,
    cancelAnalysis,
    updateParameters,
    
    // WebSocket reference (for advanced use)
    ws: wsRef.current,
  };
};

export default useDOEWebSocket;