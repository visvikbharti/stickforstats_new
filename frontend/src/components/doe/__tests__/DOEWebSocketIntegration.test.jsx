import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import DOEWebSocketIntegration from '../DOEWebSocketIntegration';
import useDOEWebSocket from '../../../hooks/useDOEWebSocket';
import ProgressTracker from '../ProgressTracker';

// Mock the custom hook
jest.mock('../../../hooks/useDOEWebSocket', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the ProgressTracker component
jest.mock('../ProgressTracker', () => {
  return function MockProgressTracker({ status, progress, taskType, error, onComplete }) {
    return (
      <div data-testid="progress-tracker">
        <div data-testid="connection-status">{status}</div>
        <div data-testid="progress-status">{progress?.status || 'not_started'}</div>
        <div data-testid="task-type">{taskType}</div>
        {error && <div data-testid="error">{typeof error === 'string' ? error : error.message}</div>}
        {progress?.status === 'completed' && (
          <button 
            data-testid="complete-button" 
            onClick={() => onComplete && onComplete(progress.result)}
          >
            Complete
          </button>
        )}
      </div>
    );
  };
});

describe('DOEWebSocketIntegration Component', () => {
  const experimentId = 'exp-123';
  const mockOnDesignGenerated = jest.fn();
  const mockOnAnalysisComplete = jest.fn();
  const mockOnOptimizationComplete = jest.fn();
  
  // Mock implementation for the useDOEWebSocket hook
  const mockSendMessage = jest.fn();
  const mockRequestDesignGeneration = jest.fn();
  const mockRequestAnalysisUpdate = jest.fn();
  const mockRequestOptimization = jest.fn();
  const mockConnect = jest.fn();
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up the mock return value for the hook
    useDOEWebSocket.mockReturnValue({
      status: 'connected',
      error: null,
      sendMessage: mockSendMessage,
      requestDesignGeneration: mockRequestDesignGeneration,
      requestAnalysisUpdate: mockRequestAnalysisUpdate,
      requestOptimization: mockRequestOptimization,
      connect: mockConnect,
      isConnected: true,
      isConnecting: false,
      hasError: false
    });
  });
  
  test('renders correctly with connected status', () => {
    render(
      <DOEWebSocketIntegration
        experimentId={experimentId}
        onDesignGenerated={mockOnDesignGenerated}
        onAnalysisComplete={mockOnAnalysisComplete}
        onOptimizationComplete={mockOnOptimizationComplete}
        activeTask="design_generation"
      />
    );
    
    expect(screen.getByTestId('progress-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status').textContent).toBe('connected');
    expect(screen.getByTestId('task-type').textContent).toBe('design_generation');
  });
  
  test('shows error when WebSocket connection fails', () => {
    useDOEWebSocket.mockReturnValue({
      status: 'error',
      error: 'Failed to connect to WebSocket server',
      sendMessage: mockSendMessage,
      requestDesignGeneration: mockRequestDesignGeneration,
      requestAnalysisUpdate: mockRequestAnalysisUpdate,
      requestOptimization: mockRequestOptimization,
      connect: mockConnect,
      isConnected: false,
      isConnecting: false,
      hasError: true
    });
    
    render(
      <DOEWebSocketIntegration
        experimentId={experimentId}
        activeTask="design_generation"
      />
    );
    
    expect(screen.getByTestId('connection-status').textContent).toBe('error');
    expect(screen.getByTestId('error').textContent).toBe('Failed to connect to WebSocket server');
  });
  
  test('calls onDesignGenerated when design generation completes', async () => {
    const mockHandleMessage = jest.fn();
    let savedCallback;
    
    // Capture the onMessage callback
    useDOEWebSocket.mockImplementation((expId, onMessage) => {
      savedCallback = onMessage;
      return {
        status: 'connected',
        error: null,
        sendMessage: mockSendMessage,
        requestDesignGeneration: mockRequestDesignGeneration,
        requestAnalysisUpdate: mockRequestAnalysisUpdate,
        requestOptimization: mockRequestOptimization,
        connect: mockConnect,
        isConnected: true,
        isConnecting: false,
        hasError: false
      };
    });
    
    render(
      <DOEWebSocketIntegration
        experimentId={experimentId}
        onDesignGenerated={mockOnDesignGenerated}
        activeTask="design_generation"
      />
    );
    
    // Simulate a task_complete message for design_generation
    act(() => {
      savedCallback({
        type: 'task_complete',
        task_type: 'design_generation',
        status: 'completed',
        result: { id: 'design-123', factors: 3, runs: 8 },
        timestamp: new Date().toISOString()
      });
    });
    
    // Wait for the component to update
    await waitFor(() => {
      expect(screen.getByTestId('progress-status').textContent).toBe('completed');
    });
    
    // Simulate clicking the complete button
    act(() => {
      screen.getByTestId('complete-button').click();
    });
    
    // Check if the callback was called with the result
    expect(mockOnDesignGenerated).toHaveBeenCalledWith({ id: 'design-123', factors: 3, runs: 8 });
  });
  
  test('exposes methods via ref', () => {
    const ref = React.createRef();
    
    render(
      <DOEWebSocketIntegration
        ref={ref}
        experimentId={experimentId}
        activeTask="design_generation"
      />
    );
    
    // Check if methods are exposed
    expect(ref.current.startDesignGeneration).toBeDefined();
    expect(ref.current.startAnalysis).toBeDefined();
    expect(ref.current.startOptimization).toBeDefined();
    
    // Call methods and check if the underlying functions are called
    ref.current.startDesignGeneration({ factors: 3 });
    expect(mockRequestDesignGeneration).toHaveBeenCalledWith({ factors: 3 });
    
    ref.current.startAnalysis({ modelType: 'factorial' });
    expect(mockRequestAnalysisUpdate).toHaveBeenCalledWith({ modelType: 'factorial' });
    
    ref.current.startOptimization({ target: 'maximize' });
    expect(mockRequestOptimization).toHaveBeenCalledWith({ target: 'maximize' });
  });
});