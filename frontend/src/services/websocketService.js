// WebSocket Service - Enterprise WebSocket communication service
// Provides robust WebSocket connection management with automatic reconnection,
// message queuing, and comprehensive error handling

import { EventEmitter } from 'events';

// Connection status constants
export const ConnectionStatus = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTING: 'DISCONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
  RECONNECTING: 'RECONNECTING',
  CLOSED: 'CLOSED'
};

// Message types for internal communication
export const MessageType = {
  PING: 'ping',
  PONG: 'pong',
  HEARTBEAT: 'heartbeat',
  ERROR: 'error',
  DATA: 'data',
  STATUS: 'status'
};

// Default configuration for WebSocket connections
const DEFAULT_CONFIG = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectIntervalMs: 1000,
  maxReconnectIntervalMs: 30000,
  reconnectDecay: 1.5,
  timeoutMs: 10000,
  heartbeatIntervalMs: 30000,
  debug: false,
  protocols: [],
  binaryType: 'arraybuffer',
  enableQueue: true,
  maxQueueSize: 100,
  forceFallback: false
};

class WebSocketService extends EventEmitter {
  constructor() {
    super();
    
    // Connection state
    this.ws = null;
    this.url = null;
    this.status = ConnectionStatus.CLOSED;
    this.config = { ...DEFAULT_CONFIG };
    
    // Reconnection management
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.reconnectInterval = DEFAULT_CONFIG.reconnectIntervalMs;
    
    // Message queuing for offline scenarios
    this.messageQueue = [];
    this.isConnected = false;
    
    // Heartbeat/ping management
    this.heartbeatTimer = null;
    this.lastHeartbeat = null;
    
    // Connection metrics for monitoring
    this.connectionMetrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      totalReconnects: 0,
      messagesSent: 0,
      messagesReceived: 0,
      lastConnected: null,
      lastDisconnected: null,
      averageLatency: 0,
      latencyHistory: []
    };
    
    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.sendHeartbeat = this.sendHeartbeat.bind(this);
  }

  /**
   * Connect to WebSocket server with enhanced options
   * @param {string} url - WebSocket URL
   * @param {Object} options - Connection options
   */
  connect(url, options = {}) {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      this.log('WebSocket already connected or connecting');
      return;
    }

    this.url = url;
    this.config = { ...this.config, ...options };
    
    this.log(`Attempting to connect to: ${url}`);
    this.setStatus(ConnectionStatus.CONNECTING);
    this.connectionMetrics.connectionAttempts++;

    try {
      // Create WebSocket connection
      this.ws = new WebSocket(url, this.config.protocols);
      this.ws.binaryType = this.config.binaryType;

      // Attach event listeners
      this.ws.addEventListener('open', this.handleOpen);
      this.ws.addEventListener('close', this.handleClose);
      this.ws.addEventListener('error', this.handleError);
      this.ws.addEventListener('message', this.handleMessage);

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.log('Connection timeout');
          this.ws.close();
          this.handleError(new Error('Connection timeout'));
        }
      }, this.config.timeoutMs);

    } catch (error) {
      this.log(`Connection error: ${error.message}`);
      this.handleError(error);
    }
  }

  /**
   * Disconnect from WebSocket server
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   */
  disconnect(code = 1000, reason = 'Normal closure') {
    this.log(`Disconnecting with code ${code}: ${reason}`);
    
    // Clear timers
    this.clearTimers();
    
    // Disable auto-reconnect for manual disconnection
    const originalAutoReconnect = this.config.autoReconnect;
    this.config.autoReconnect = false;
    
    this.setStatus(ConnectionStatus.DISCONNECTING);
    
    if (this.ws) {
      this.ws.close(code, reason);
    } else {
      this.setStatus(ConnectionStatus.DISCONNECTED);
    }
    
    // Restore auto-reconnect setting
    setTimeout(() => {
      this.config.autoReconnect = originalAutoReconnect;
    }, 100);
  }

  /**
   * Send message through WebSocket with queuing support
   * @param {*} data - Data to send
   * @returns {boolean} - Success status
   */
  send(data) {
    const message = this.prepareMessage(data);
    
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(message);
        this.connectionMetrics.messagesSent++;
        this.log(`Message sent: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
        return true;
      } catch (error) {
        this.log(`Send error: ${error.message}`);
        this.handleSendError(data, error);
        return false;
      }
    } else {
      return this.handleOfflineMessage(data);
    }
  }

  /**
   * Handle message sending when offline
   * @param {*} data - Data to queue
   * @returns {boolean} - Success status
   */
  handleOfflineMessage(data) {
    if (this.config.enableQueue) {
      if (this.messageQueue.length < this.config.maxQueueSize) {
        this.messageQueue.push(data);
        this.log(`Message queued (${this.messageQueue.length}/${this.config.maxQueueSize})`);
        return true;
      } else {
        this.log('Message queue full, dropping message');
        return false;
      }
    } else {
      this.log('WebSocket not connected and queuing disabled');
      return false;
    }
  }

  /**
   * Process queued messages after reconnection
   */
  processMessageQueue() {
    if (this.messageQueue.length > 0) {
      this.log(`Processing ${this.messageQueue.length} queued messages`);
      const messages = [...this.messageQueue];
      this.messageQueue = [];
      
      messages.forEach(data => {
        this.send(data);
      });
    }
  }

  /**
   * Prepare message for sending
   * @param {*} data - Raw data
   * @returns {string} - Formatted message
   */
  prepareMessage(data) {
    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'object') {
      return JSON.stringify(data);
    } else {
      return String(data);
    }
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen(event) {
    this.log('WebSocket connected');
    
    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Update state
    this.isConnected = true;
    this.setStatus(ConnectionStatus.CONNECTED);
    this.reconnectAttempts = 0;
    this.reconnectInterval = this.config.reconnectIntervalMs;
    
    // Update metrics
    this.connectionMetrics.successfulConnections++;
    this.connectionMetrics.lastConnected = new Date();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Process any queued messages
    this.processMessageQueue();
    
    // Call user-defined onOpen handler
    if (this.config.onOpen) {
      this.config.onOpen(event);
    }
    
    // Emit connection event
    this.emit('connected', event);
  }

  /**
   * Handle WebSocket close event
   */
  handleClose(event) {
    this.log(`WebSocket closed with code ${event.code}: ${event.reason || 'No reason provided'}`);
    
    // Update state
    this.isConnected = false;
    this.connectionMetrics.lastDisconnected = new Date();
    
    // Clear timers
    this.clearTimers();
    
    // Determine if this was expected or unexpected
    const wasConnected = this.status === ConnectionStatus.CONNECTED;
    
    if (event.code === 1000 || !this.config.autoReconnect) {
      // Normal closure or auto-reconnect disabled
      this.setStatus(ConnectionStatus.CLOSED);
    } else if (wasConnected && this.config.autoReconnect) {
      // Unexpected disconnection - attempt reconnect
      this.setStatus(ConnectionStatus.DISCONNECTED);
      this.scheduleReconnect();
    } else {
      this.setStatus(ConnectionStatus.CLOSED);
    }
    
    // Call user-defined onClose handler
    if (this.config.onClose) {
      this.config.onClose(event);
    }
    
    // Emit disconnection event
    this.emit('disconnected', event);
  }

  /**
   * Handle WebSocket error event
   */
  handleError(error) {
    this.log(`WebSocket error: ${error.message || error}`);
    
    this.setStatus(ConnectionStatus.ERROR);
    
    // Call user-defined onError handler
    if (this.config.onError) {
      this.config.onError(error);
    }
    
    // Emit error event
    this.emit('error', error);
  }

  /**
   * Handle WebSocket message event
   */
  handleMessage(event) {
    this.connectionMetrics.messagesReceived++;
    
    let data;
    try {
      // Try to parse as JSON, fallback to raw data
      data = JSON.parse(event.data);
    } catch {
      data = event.data;
    }
    
    // Handle internal message types
    if (data && typeof data === 'object' && data.type) {
      switch (data.type) {
        case MessageType.PONG:
          this.handlePong(data);
          return;
        case MessageType.HEARTBEAT:
          this.handleHeartbeat(data);
          return;
        case MessageType.ERROR:
          this.handleServerError(data);
          return;
      }
    }
    
    this.log(`Message received: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
    
    // Call user-defined onMessage handler
    if (this.config.onMessage) {
      this.config.onMessage(data, event);
    }
    
    // Emit message event
    this.emit('message', data, event);
  }

  /**
   * Handle pong response for latency calculation
   */
  handlePong(data) {
    if (data.timestamp) {
      const latency = Date.now() - data.timestamp;
      this.connectionMetrics.latencyHistory.push(latency);
      
      // Keep only last 10 latency measurements
      if (this.connectionMetrics.latencyHistory.length > 10) {
        this.connectionMetrics.latencyHistory.shift();
      }
      
      // Calculate average latency
      this.connectionMetrics.averageLatency = 
        this.connectionMetrics.latencyHistory.reduce((a, b) => a + b, 0) / 
        this.connectionMetrics.latencyHistory.length;
      
      this.log(`Latency: ${latency}ms (avg: ${Math.round(this.connectionMetrics.averageLatency)}ms)`);
    }
  }

  /**
   * Handle heartbeat from server
   */
  handleHeartbeat(data) {
    this.lastHeartbeat = Date.now();
    this.log('Heartbeat received from server');
    
    // Respond with pong
    this.send({
      type: MessageType.PONG,
      timestamp: data.timestamp || Date.now()
    });
  }

  /**
   * Handle server error message
   */
  handleServerError(data) {
    const error = new Error(data.message || 'Server error');
    error.code = data.code;
    error.serverError = true;
    
    this.handleError(error);
  }

  /**
   * Handle send error
   */
  handleSendError(data, error) {
    this.log(`Failed to send message: ${error.message}`);
    
    // Queue the message if possible
    if (this.config.enableQueue && this.messageQueue.length < this.config.maxQueueSize) {
      this.messageQueue.push(data);
      this.log('Failed message queued for retry');
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log(`Max reconnect attempts (${this.config.maxReconnectAttempts}) reached`);
      this.setStatus(ConnectionStatus.CLOSED);
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    this.connectionMetrics.totalReconnects++;
    this.setStatus(ConnectionStatus.RECONNECTING);
    
    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${this.reconnectInterval}ms`);
    
    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      interval: this.reconnectInterval
    });

    this.reconnectTimer = setTimeout(() => {
      this.log(`Reconnect attempt ${this.reconnectAttempts}`);
      this.connect(this.url, this.config);
      
      // Exponential backoff for reconnect interval
      this.reconnectInterval = Math.min(
        this.reconnectInterval * this.config.reconnectDecay,
        this.config.maxReconnectIntervalMs
      );
    }, this.reconnectInterval);
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    if (this.config.heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(this.sendHeartbeat, this.config.heartbeatIntervalMs);
      this.lastHeartbeat = Date.now();
    }
  }

  /**
   * Send heartbeat/ping to server
   */
  sendHeartbeat() {
    const pingPayload = this.config.pingPayload || {
      type: MessageType.PING,
      timestamp: Date.now()
    };
    
    this.send(pingPayload);
    this.log('Heartbeat sent');
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Set connection status and emit status change event
   */
  setStatus(newStatus) {
    const previousStatus = this.status;
    this.status = newStatus;
    
    this.log(`Status changed: ${previousStatus} → ${newStatus}`);
    
    this.emit('statusChange', {
      previous: previousStatus,
      current: newStatus
    });
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics() {
    return { ...this.connectionMetrics };
  }

  /**
   * Get compatibility information
   */
  getCompatibilityInfo() {
    return {
      webSocketSupported: typeof WebSocket !== 'undefined',
      currentStatus: this.status,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastHeartbeat: this.lastHeartbeat,
      metrics: this.getConnectionMetrics()
    };
  }

  /**
   * Reset connection state
   */
  reset() {
    this.disconnect();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.reconnectInterval = this.config.reconnectIntervalMs;
    this.connectionMetrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      totalReconnects: 0,
      messagesSent: 0,
      messagesReceived: 0,
      lastConnected: null,
      lastDisconnected: null,
      averageLatency: 0,
      latencyHistory: []
    };
  }

  /**
   * Log debug messages
   */
  log(message) {
    if (this.config.debug) {
      console.log(`[WebSocketService] ${message}`);
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;