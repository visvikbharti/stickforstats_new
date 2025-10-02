import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService, { ConnectionStatus } from '../services/websocketService';
import { WS_ENDPOINTS } from '../config/apiConfig';

/**
 * Enhanced custom hook for WebSocket communication with improved reconnect handling
 * 
 * @param {string} endpoint - WebSocket endpoint path
 * @param {Object} options - Connection options
 * @returns {Object} - WebSocket state and methods
 */
export const useWebSocket = (endpoint, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [status, setStatus] = useState('CLOSED');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Store options and endpoint references to track changes
  const optionsRef = useRef(options);
  const endpointRef = useRef(endpoint);
  
  // Keep track of event handlers for cleanup
  const onOpenRef = useRef(null);
  const onMessageRef = useRef(null);
  const onCloseRef = useRef(null);
  const onErrorRef = useRef(null);
  const onStatusChangeRef = useRef(null);
  const onReconnectingRef = useRef(null);
  
  // Set up enhanced connection options with safer defaults
  const getEnhancedOptions = useCallback(() => {
    return {
      // Default options
      autoReconnect: true,
      maxReconnectAttempts: 20,
      reconnectIntervalMs: 1500, // Start with 1.5 seconds
      debug: false,                      // Set to true to debug connection issues
      forceFallback: false,
      binaryType: 'arraybuffer',
      protocols: [],
      
      // Override with user options
      ...optionsRef.current,
      
      // Add handlers for internal state management
      onOpen: (event) => {
        setIsConnected(true);
        setStatus(ConnectionStatus.CONNECTED);
        setError(null);
        setReconnectAttempt(0);
        setIsReconnecting(false);
        
        // Call user handler if provided
        if (optionsRef.current.onOpen) {
          optionsRef.current.onOpen(event);
        }
      },
      
      onClose: (event) => {
        setIsConnected(false);
        
        // Don't set status here - let the statusChange handler manage that
        // since websocketService has better logic for reconnections
        
        // Call user handler if provided
        if (optionsRef.current.onClose) {
          optionsRef.current.onClose(event);
        }
      },
      
      onError: (event) => {
        // Set a user-friendly error message
        const errorMessage = event?.message || 'An unknown error occurred';
        setError(new Error(`WebSocket error: ${errorMessage}`));
        
        // Call user handler if provided
        if (optionsRef.current.onError) {
          optionsRef.current.onError(event);
        }
      }
    };
  }, []);
  
  // Connect to WebSocket
  useEffect(() => {
    // Update refs to track current values
    endpointRef.current = endpoint;
    optionsRef.current = options;
    
    if (!endpoint) {
      console.log('No WebSocket endpoint provided, skipping connection');
      return;
    }
    
    // Create enhanced event handlers with reconnection info
    onOpenRef.current = (event) => {
      // Handled by options.onOpen
    };
    
    onMessageRef.current = (data, event) => {
      setLastMessage(data);
      
      if (options.onMessage) {
        options.onMessage(data, event);
      }
    };
    
    onCloseRef.current = (event) => {
      // Most handling done by options.onClose
      // Additional logging if needed
      if (options.debug) {
        console.log(`WebSocket closed with code ${event.code}${event.reason ? ': ' + event.reason : ''}`);
      }
    };
    
    onErrorRef.current = (event) => {
      // Most handling done by options.onError
      // Additional logging if needed
      if (options.debug) {
        console.error('WebSocket error:', event);
      }
    };
    
    // Track status changes from websocketService for better state management
    onStatusChangeRef.current = ({ previous, current }) => {
      setStatus(current);
      
      if (current === ConnectionStatus.RECONNECTING) {
        setIsReconnecting(true);
      } else if (current === ConnectionStatus.CONNECTED) {
        setIsReconnecting(false);
      } else if (current === ConnectionStatus.ERROR) {
        setIsReconnecting(false);
      }
    };
    
    // Track reconnection attempts
    onReconnectingRef.current = () => {
      setReconnectAttempt(prev => prev + 1);
    };
    
    // Register all event handlers
    websocketService
      .on('message', onMessageRef.current)
      .on('statusChange', onStatusChangeRef.current)
      .on('reconnecting', onReconnectingRef.current);
    
    // Connect to WebSocket with enhanced options
    websocketService.connect(endpoint, getEnhancedOptions());
    
    // Initialize status based on current service state
    setStatus(websocketService.getStatus());
    setIsConnected(websocketService.isConnected());
    
    // Cleanup on unmount or when endpoint/options change
    return () => {
      // Remove our event handlers
      websocketService
        .off('message', onMessageRef.current)
        .off('statusChange', onStatusChangeRef.current)
        .off('reconnecting', onReconnectingRef.current);
      
      // Only disconnect if this is the endpoint we connected to
      // This check prevents disconnecting new connections when component updates
      if (websocketService.url && websocketService.url.includes(endpoint)) {
        websocketService.disconnect();
      }
    };
  }, [endpoint, getEnhancedOptions]);
  
  /**
   * Send a message through the WebSocket with improved queuing
   * 
   * @param {Object|string} data - Data to send
   * @returns {boolean} - Whether the message was sent or queued successfully
   */
  const sendMessage = useCallback((data) => {
    // The underlying service will queue messages when offline if autoReconnect is true
    return websocketService.send(data);
  }, []);
  
  /**
   * Manually reconnect the WebSocket
   * Resets reconnect counter and attempts connection with new attempt
   */
  const reconnect = useCallback(() => {
    setReconnectAttempt(0);
    setIsReconnecting(true);
    setError(null);
    
    // Disconnect and reconnect with a slight delay to ensure clean state
    websocketService.disconnect();
    
    setTimeout(() => {
      websocketService.connect(endpointRef.current, getEnhancedOptions());
    }, 100);
  }, [getEnhancedOptions]);
  
  /**
   * Manually disconnect the WebSocket
   */
  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);
  
  /**
   * Get detailed connection info for debugging
   */
  const getConnectionInfo = useCallback(() => {
    return {
      ...websocketService.getCompatibilityInfo(),
      reconnectAttempt,
      isReconnecting,
      status,
      url: endpointRef.current
    };
  }, [reconnectAttempt, isReconnecting, status]);
  
  return {
    // Connection state
    isConnected,
    isReconnecting,
    reconnectAttempt,
    status,
    error,
    lastMessage,
    
    // Actions
    sendMessage,
    reconnect,
    disconnect,
    getConnectionInfo
  };
};

/**
 * Custom hook for DOE WebSocket communication with robust connection handling
 * 
 * @param {string} analysisId - Analysis ID
 * @param {Object} options - Connection options
 */
export const useDOEWebSocket = (analysisId, options = {}) => {
  // Always provide a valid endpoint for DOE, using a demo ID if needed 
  // This helps the application run in demo mode if analysisId is not yet available
  const demoEndpoint = WS_ENDPOINTS.doe.analysis('demo-analysis');
  const endpoint = analysisId ? WS_ENDPOINTS.doe.analysis(analysisId) : demoEndpoint;
  
  // Add domain-specific WebSocket options
  const enhancedOptions = {
    // DOE-specific defaults
    autoReconnect: true,
    reconnectIntervalMs: 1500, // Start with 1.5 seconds
    maxReconnectAttempts: 25,  // More attempts for long-running analyses
    
    // Add a special ping payload for DOE
    pingPayload: { type: 'ping', module: 'doe_analysis', timestamp: Date.now() },
    
    // Override with user options
    ...options
  };
  
  return useWebSocket(endpoint, enhancedOptions);
};

/**
 * Custom hook for PCA WebSocket communication with robust connection handling
 * 
 * @param {string} analysisId - Analysis ID
 * @param {Object} options - Connection options
 */
export const usePCAWebSocket = (analysisId, options = {}) => {
  // Always provide a valid endpoint for PCA, using a demo ID if needed
  const demoEndpoint = WS_ENDPOINTS.pca.progress('demo-analysis');
  const endpoint = analysisId ? WS_ENDPOINTS.pca.progress(analysisId) : demoEndpoint;
  
  // Add domain-specific WebSocket options
  const enhancedOptions = {
    // PCA-specific defaults
    autoReconnect: true,
    reconnectIntervalMs: 2000, // Start with 2 seconds - PCA can take longer
    maxReconnectAttempts: 20,  // More attempts for long-running analyses
    
    // Add a special ping payload for PCA
    pingPayload: { type: 'ping', module: 'pca_analysis', timestamp: Date.now() },
    
    // Override with user options
    ...options
  };
  
  return useWebSocket(endpoint, enhancedOptions);
};

/**
 * Custom hook for Workflow Execution WebSocket communication with robust connection handling
 * 
 * @param {string} workflowId - Workflow ID
 * @param {Object} options - Connection options
 */
export const useWorkflowExecutionWebSocket = (workflowId, options = {}) => {
  // Always provide a valid endpoint for Workflow, using a demo ID if needed
  const demoEndpoint = WS_ENDPOINTS.workflow.execution('demo-workflow');
  const endpoint = workflowId ? WS_ENDPOINTS.workflow.execution(workflowId) : demoEndpoint;
  
  // Add domain-specific WebSocket options
  const enhancedOptions = {
    // Workflow-specific defaults
    autoReconnect: true,
    reconnectIntervalMs: 1000, // Quicker reconnect for workflows
    
    // Add a special ping payload for Workflow
    pingPayload: { type: 'ping', module: 'workflow', timestamp: Date.now() },
    
    // Override with user options
    ...options
  };
  
  return useWebSocket(endpoint, enhancedOptions);
};

export default useWebSocket;