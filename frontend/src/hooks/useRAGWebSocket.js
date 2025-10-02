import { useState, useEffect, useCallback, useRef } from 'react';
import { secureWebSocketUrl, createWebSocketOptions, safeSend, isWebSocketConnected, createHeartbeat } from '../utils/secureWebSocketUtils';

const useRAGWebSocket = (options = {}) => {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    heartbeatInterval = 30000,
    onMessage,
    onError,
    onStatusChange,
    sessionId = null,
  } = options;

  const [status, setStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    latency: 0,
    messagesSent: 0,
    messagesReceived: 0,
    bytesTransferred: 0,
    uptime: 0,
  });
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const heartbeatRef = useRef(null);
  const metricsIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

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
      const wsUrl = secureWebSocketUrl('/rag/chat');
      const wsOptions = createWebSocketOptions();
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      startTimeRef.current = Date.now();

      ws.onopen = () => {
        console.log('RAG WebSocket connected');
        updateStatus('connected');
        reconnectCountRef.current = 0;
        setError(null);
        
        // Initialize session
        safeSend(ws, {
          type: 'init',
          sessionId: sessionId || `session-${Date.now()}`,
        });
        
        // Start heartbeat
        heartbeatRef.current = createHeartbeat(ws, heartbeatInterval);
        heartbeatRef.current.start();
        
        // Start metrics tracking
        metricsIntervalRef.current = setInterval(() => {
          const uptime = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setMetrics(prev => ({ ...prev, uptime }));
        }, 1000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Update metrics
          setMetrics(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
            bytesTransferred: prev.bytesTransferred + event.data.length,
          }));
          
          switch (message.type) {
            case 'response':
              setMessages(prev => [...prev, {
                id: message.id || Date.now(),
                type: 'assistant',
                content: message.content,
                timestamp: new Date().toISOString(),
                metadata: message.metadata,
              }]);
              break;
              
            case 'stream':
              // Handle streaming responses
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.id === message.streamId) {
                  // Update existing message
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMessage,
                      content: lastMessage.content + message.chunk,
                    },
                  ];
                } else {
                  // Create new streaming message
                  return [...prev, {
                    id: message.streamId,
                    type: 'assistant',
                    content: message.chunk,
                    timestamp: new Date().toISOString(),
                    streaming: true,
                  }];
                }
              });
              break;
              
            case 'stream_end':
              // Mark streaming as complete
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.id === message.streamId) {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMessage, streaming: false },
                  ];
                }
                return prev;
              });
              break;
              
            case 'error':
              setError(message.error || 'Unknown error occurred');
              if (onError) onError(message.error);
              break;
              
            case 'sources':
              // Update last message with sources
              setMessages(prev => {
                if (prev.length > 0) {
                  const lastMessage = prev[prev.length - 1];
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMessage, sources: message.sources },
                  ];
                }
                return prev;
              });
              break;
              
            case 'latency':
              setMetrics(prev => ({ ...prev, latency: message.value }));
              break;
              
            default:
              console.log('Unknown RAG message type:', message.type);
          }
          
          if (onMessage) {
            onMessage(message);
          }
        } catch (err) {
          console.error('Error parsing RAG WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('RAG WebSocket error:', event);
        updateStatus('error');
        setError('WebSocket connection error');
        if (onError) onError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('RAG WebSocket closed:', event.code, event.reason);
        updateStatus('disconnected');
        wsRef.current = null;
        
        // Stop heartbeat and metrics
        if (heartbeatRef.current) {
          heartbeatRef.current.stop();
          heartbeatRef.current = null;
        }
        if (metricsIntervalRef.current) {
          clearInterval(metricsIntervalRef.current);
          metricsIntervalRef.current = null;
        }
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts && autoConnect) {
          reconnectCountRef.current++;
          console.log(`Attempting to reconnect (${reconnectCountRef.current}/${reconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectCountRef.current);
        }
      };
    } catch (err) {
      console.error('Error creating RAG WebSocket:', err);
      setError('Failed to establish WebSocket connection');
      updateStatus('error');
    }
  }, [sessionId, updateStatus, reconnectAttempts, reconnectDelay, autoConnect, heartbeatInterval, onMessage, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatRef.current) {
      heartbeatRef.current.stop();
      heartbeatRef.current = null;
    }
    
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    updateStatus('disconnected');
    reconnectCountRef.current = 0;
  }, [updateStatus]);

  // Send message through WebSocket
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!isWebSocketConnected(wsRef.current)) {
      console.warn('Cannot send message: WebSocket is not connected');
      return false;
    }
    
    const message = {
      type: 'query',
      id: Date.now(),
      content,
      timestamp: new Date().toISOString(),
      ...options,
    };
    
    // Add to messages
    setMessages(prev => [...prev, {
      id: message.id,
      type: 'user',
      content: message.content,
      timestamp: message.timestamp,
    }]);
    
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      messagesSent: prev.messagesSent + 1,
      bytesTransferred: prev.bytesTransferred + JSON.stringify(message).length,
    }));
    
    return await safeSend(wsRef.current, message);
  }, []);

  // Clear conversation
  const clearMessages = useCallback(() => {
    setMessages([]);
    if (isWebSocketConnected(wsRef.current)) {
      safeSend(wsRef.current, { type: 'clear_session' });
    }
  }, []);

  // Export conversation
  const exportConversation = useCallback(() => {
    return {
      sessionId: sessionId || 'unknown',
      messages: messages,
      exportedAt: new Date().toISOString(),
    };
  }, [sessionId, messages]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    // State
    status,
    messages,
    error,
    metrics,
    isConnected: status === 'connected',
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    exportConversation,
    
    // WebSocket reference (for advanced use)
    ws: wsRef.current,
  };
};

export default useRAGWebSocket;