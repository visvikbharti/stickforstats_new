// Utility functions for secure WebSocket connections

/**
 * Determines the appropriate WebSocket protocol based on the current page protocol
 * @returns {string} 'wss' for HTTPS, 'ws' for HTTP
 */
export const getWebSocketProtocol = () => {
  return window.location.protocol === 'https:' ? 'wss' : 'ws';
};

/**
 * Constructs a secure WebSocket URL based on environment and current location
 * @param {string} endpoint - The WebSocket endpoint path
 * @param {Object} options - Configuration options
 * @returns {string} The complete WebSocket URL
 */
export const secureWebSocketUrl = (endpoint, options = {}) => {
  const {
    host = process.env.REACT_APP_WS_HOST || window.location.hostname,
    port = process.env.REACT_APP_WS_PORT || (window.location.protocol === 'https:' ? '443' : '8000'),
    protocol = getWebSocketProtocol(),
    basePath = process.env.REACT_APP_WS_BASE_PATH || '/ws',
  } = options;

  // Handle different environments
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_WS_URL) {
    // Use configured production WebSocket URL
    return `${process.env.REACT_APP_WS_URL}${endpoint}`;
  }

  // Construct URL based on current environment
  const portPart = (protocol === 'wss' && port === '443') || (protocol === 'ws' && port === '80') 
    ? '' 
    : `:${port}`;
  
  return `${protocol}://${host}${portPart}${basePath}${endpoint}`;
};

/**
 * Validates WebSocket URL format
 * @param {string} url - The WebSocket URL to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidWebSocketUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'ws:' || parsedUrl.protocol === 'wss:';
  } catch {
    return false;
  }
};

/**
 * Creates WebSocket connection options with security headers
 * @param {Object} authToken - Authentication token
 * @returns {Object} WebSocket connection options
 */
export const createWebSocketOptions = (authToken = null) => {
  const options = {
    // Reconnection settings
    reconnect: true,
    reconnectInterval: 1000,
    maxReconnectInterval: 30000,
    reconnectDecay: 1.5,
    timeoutInterval: 2000,
    maxReconnectAttempts: 10,
    
    // Security settings
    enableCompression: true,
    handshakeTimeout: 5000,
  };

  // Add authentication if available
  if (authToken) {
    options.headers = {
      'Authorization': `Bearer ${authToken}`,
    };
  }

  return options;
};

/**
 * Generates a unique client ID for WebSocket connections
 * @returns {string} Unique client identifier
 */
export const generateClientId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `client-${timestamp}-${random}`;
};

/**
 * Parses WebSocket error messages for user-friendly display
 * @param {Event|Error} error - The WebSocket error
 * @returns {string} User-friendly error message
 */
export const parseWebSocketError = (error) => {
  if (error instanceof Event) {
    switch (error.type) {
      case 'error':
        return 'Connection error occurred. Please check your network.';
      case 'close':
        if (error.code === 1006) {
          return 'Connection lost unexpectedly. Attempting to reconnect...';
        }
        return `Connection closed: ${error.reason || 'Unknown reason'}`;
      default:
        return 'An unexpected error occurred.';
    }
  }
  
  return error.message || 'Unknown error occurred';
};

/**
 * WebSocket ready state constants
 */
export const WS_READY_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

/**
 * Checks if WebSocket is in a connected state
 * @param {WebSocket} ws - The WebSocket instance
 * @returns {boolean} True if connected, false otherwise
 */
export const isWebSocketConnected = (ws) => {
  return ws && ws.readyState === WS_READY_STATES.OPEN;
};

/**
 * Safely sends data through WebSocket with error handling
 * @param {WebSocket} ws - The WebSocket instance
 * @param {*} data - Data to send
 * @returns {Promise<boolean>} Success status
 */
export const safeSend = async (ws, data) => {
  return new Promise((resolve) => {
    if (!isWebSocketConnected(ws)) {
      console.warn('WebSocket is not connected');
      resolve(false);
      return;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.send(message);
      resolve(true);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      resolve(false);
    }
  });
};

/**
 * Creates a heartbeat mechanism for WebSocket connections
 * @param {WebSocket} ws - The WebSocket instance
 * @param {number} interval - Heartbeat interval in milliseconds
 * @returns {Object} Heartbeat controller with start/stop methods
 */
export const createHeartbeat = (ws, interval = 30000) => {
  let heartbeatInterval = null;
  let missedHeartbeats = 0;
  const maxMissedHeartbeats = 3;

  const start = () => {
    heartbeatInterval = setInterval(() => {
      if (isWebSocketConnected(ws)) {
        safeSend(ws, { type: 'ping' });
        missedHeartbeats++;
        
        if (missedHeartbeats >= maxMissedHeartbeats) {
          console.warn('Too many missed heartbeats, connection may be dead');
          ws.close();
        }
      }
    }, interval);

    // Reset missed heartbeats on pong
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          missedHeartbeats = 0;
        }
      } catch {}
    });
  };

  const stop = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    missedHeartbeats = 0;
  };

  return { start, stop };
};

/**
 * WebSocket message types enum
 */
export const WS_MESSAGE_TYPES = {
  // Connection management
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  PING: 'ping',
  PONG: 'pong',
  
  // Authentication
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth_success',
  AUTH_ERROR: 'auth_error',
  
  // Data operations
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  DATA: 'data',
  UPDATE: 'update',
  
  // Analysis operations
  ANALYSIS_START: 'analysis_start',
  ANALYSIS_PROGRESS: 'analysis_progress',
  ANALYSIS_COMPLETE: 'analysis_complete',
  ANALYSIS_ERROR: 'analysis_error',
  
  // Error handling
  ERROR: 'error',
  VALIDATION_ERROR: 'validation_error',
};