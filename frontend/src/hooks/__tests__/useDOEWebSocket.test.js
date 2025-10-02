import { renderHook, act } from '@testing-library/react-hooks';
import useDOEWebSocket from '../useDOEWebSocket';
import config from '../../config';

// Mock global WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.CLOSED = WebSocket.CLOSED;
    
    // Call onopen asynchronously to simulate connection establishment
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  send(data) {
    this.lastSentMessage = data;
    return true;
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({
      code: 1000, 
      reason: 'Normal closure', 
      wasClean: true
    });
  }
}

// Mock config
jest.mock('../../config', () => ({
  WS_BASE_URL: 'wss://api.example.com',
  API_BASE_URL: 'https://api.example.com'
}));

// Mock WebSocket global
global.WebSocket = MockWebSocket;
global.WebSocket.CONNECTING = 0;
global.WebSocket.OPEN = 1;
global.WebSocket.CLOSING = 2;
global.WebSocket.CLOSED = 3;

describe('useDOEWebSocket Hook', () => {
  const experimentId = 'exp-123';
  const mockOnMessage = jest.fn();
  const mockOnStatusChange = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.log = jest.fn();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('initializes with disconnected status', () => {
    const { result } = renderHook(() => 
      useDOEWebSocket(null, mockOnMessage, mockOnStatusChange)
    );
    
    expect(result.current.status).toBe('disconnected');
    expect(result.current.error).not.toBeNull();
  });
  
  test('connects to WebSocket when experimentId is provided', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Initially connecting
    expect(result.current.status).toBe('connecting');
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Should be connected
    expect(result.current.status).toBe('connected');
    expect(result.current.error).toBeNull();
    expect(mockOnStatusChange).toHaveBeenCalledWith('connected');
  });
  
  test('handles WebSocket message correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Simulate receiving a message
    const testMessage = { type: 'test', data: { value: 123 } };
    act(() => {
      result.current.socket.current.onmessage({ 
        data: JSON.stringify(testMessage) 
      });
    });
    
    // Check if onMessage callback was called with the parsed message
    expect(mockOnMessage).toHaveBeenCalledWith(testMessage);
  });
  
  test('handles WebSocket errors correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Simulate an error
    act(() => {
      result.current.socket.current.onerror({ message: 'WebSocket error' });
    });
    
    // Should have error status
    expect(result.current.error).not.toBeNull();
    expect(mockOnStatusChange).toHaveBeenCalledWith('error');
  });
  
  test('handles WebSocket closing correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Simulate connection closing
    act(() => {
      result.current.socket.current.onclose({ 
        code: 1000, 
        reason: 'Normal closure', 
        wasClean: true 
      });
    });
    
    // Should have disconnected status
    expect(result.current.status).toBe('disconnected');
    expect(mockOnStatusChange).toHaveBeenCalledWith('disconnected');
  });
  
  test('sends message correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Mock the send method
    const sendSpy = jest.spyOn(result.current.socket.current, 'send');
    
    // Send a message
    const testMessage = { type: 'test_command', data: { value: 456 } };
    act(() => {
      result.current.sendMessage(testMessage);
    });
    
    // Check if the message was sent with the correct content
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testMessage));
  });
  
  test('does not send message when not connected', () => {
    const { result } = renderHook(() => 
      useDOEWebSocket(null, mockOnMessage, mockOnStatusChange)
    );
    
    // Should have error and not be connected
    expect(result.current.status).not.toBe('connected');
    
    // Attempt to send message
    const success = result.current.sendMessage({ type: 'test' });
    
    // Should return false and not call send
    expect(success).toBe(false);
    expect(result.current.error).not.toBeNull();
  });
  
  test('reconnects when experimentId changes', async () => {
    const { result, waitForNextUpdate, rerender } = renderHook(
      (props) => useDOEWebSocket(props.experimentId, mockOnMessage, mockOnStatusChange),
      { initialProps: { experimentId } }
    );
    
    // Wait for initial connection
    await waitForNextUpdate();
    
    // Close spy to check if close is called on reconnect
    const closeSpy = jest.spyOn(result.current.socket.current, 'close');
    
    // Change experimentId to trigger reconnect
    rerender({ experimentId: 'exp-456' });
    
    // Should close existing connection
    expect(closeSpy).toHaveBeenCalled();
    
    // Should be in connecting state
    expect(result.current.status).toBe('connecting');
    
    // Wait for new connection
    await waitForNextUpdate();
    
    // Should be connected again
    expect(result.current.status).toBe('connected');
  });
  
  test('requestAnalysisUpdate sends correct message format', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Mock the send method
    const sendSpy = jest.spyOn(result.current.socket.current, 'send');
    
    // Request analysis update
    const analysisParams = { 
      responseVar: 'Yield', 
      modelType: 'quadratic' 
    };
    
    act(() => {
      result.current.requestAnalysisUpdate(analysisParams);
    });
    
    // Check message format
    const expectedMessage = {
      type: 'request_analysis',
      data: analysisParams
    };
    
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(expectedMessage));
  });
  
  test('requestDesignGeneration sends correct message format', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Mock the send method
    const sendSpy = jest.spyOn(result.current.socket.current, 'send');
    
    // Request design generation
    const designParams = { 
      designType: 'factorial',
      factors: [{ name: 'Temp', low: 25, high: 35 }]
    };
    
    act(() => {
      result.current.requestDesignGeneration(designParams);
    });
    
    // Check message format
    const expectedMessage = {
      type: 'generate_design',
      data: designParams
    };
    
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(expectedMessage));
  });
  
  test('requestOptimization sends correct message format', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Mock the send method
    const sendSpy = jest.spyOn(result.current.socket.current, 'send');
    
    // Request optimization
    const optimizationParams = { 
      responseVar: 'Yield',
      goal: 'maximize' 
    };
    
    act(() => {
      result.current.requestOptimization(optimizationParams);
    });
    
    // Check message format
    const expectedMessage = {
      type: 'optimize',
      data: optimizationParams
    };
    
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(expectedMessage));
  });
  
  test('connect method attempts to reconnect', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for initial connection
    await waitForNextUpdate();
    
    // Simulate connection closing
    act(() => {
      result.current.socket.current.onclose({ 
        code: 1006, 
        reason: 'Abnormal closure', 
        wasClean: false 
      });
    });
    
    // Status should be disconnected
    expect(result.current.status).toBe('disconnected');
    
    // Call connect to manually reconnect
    act(() => {
      result.current.connect();
    });
    
    // Should be in connecting state
    expect(result.current.status).toBe('connecting');
    
    // Wait for reconnection
    await waitForNextUpdate();
    
    // Should be connected again
    expect(result.current.status).toBe('connected');
  });
  
  test('websocket url is correctly formatted', async () => {
    // Spy on WebSocket constructor
    const webSocketSpy = jest.spyOn(global, 'WebSocket');
    
    const { waitForNextUpdate } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Check that WebSocket was constructed with correct URL
    expect(webSocketSpy).toHaveBeenCalledWith(`${config.WS_BASE_URL}/ws/doe/${experimentId}/`);
  });
  
  test('cleans up websocket on unmount', async () => {
    const { result, waitForNextUpdate, unmount } = renderHook(() => 
      useDOEWebSocket(experimentId, mockOnMessage, mockOnStatusChange)
    );
    
    // Wait for connection to be established
    await waitForNextUpdate();
    
    // Spy on close method
    const closeSpy = jest.spyOn(result.current.socket.current, 'close');
    
    // Unmount the hook
    unmount();
    
    // Should have closed the WebSocket connection
    expect(closeSpy).toHaveBeenCalled();
  });
});