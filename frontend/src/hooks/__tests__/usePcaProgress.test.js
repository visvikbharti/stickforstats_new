import { renderHook, act } from '@testing-library/react-hooks';
import { usePcaProgress } from '../usePcaProgress';
import useWebSocket from '../useWebSocket';

// Mock the useWebSocket hook
jest.mock('../useWebSocket', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('usePcaProgress Hook', () => {
  // Mock implementation variables
  const mockSendMessage = jest.fn();
  let mockLastMessage = null;
  let mockConnectionStatus = 'Connecting';
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockLastMessage = null;
    mockConnectionStatus = 'Connecting';
    
    // Default mock for useWebSocket
    useWebSocket.mockImplementation((url, options) => ({
      lastMessage: mockLastMessage,
      connectionStatus: mockConnectionStatus,
      sendMessage: mockSendMessage
    }));
  });

  test('initializes with correct default state', () => {
    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));
    
    // Verify initial state
    expect(result.current.progress).toBe(0);
    expect(result.current.status).toBe('running');
    expect(result.current.currentStep).toBeNull();
    expect(result.current.totalSteps).toBeNull();
    expect(result.current.stepProgress).toBe(0);
    expect(result.current.estimatedTimeRemaining).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.isReady).toBe(false);
  });

  test('creates WebSocket with correct URL', () => {
    renderHook(() => usePcaProgress('project-123', 'analysis-456', true));
    
    // Verify WebSocket URL
    expect(useWebSocket).toHaveBeenCalledWith(
      expect.stringContaining('/ws/pca_analysis/progress/project-123/analysis-456/'),
      expect.anything()
    );
  });

  test('handles analysis progress message correctly', () => {
    // Setup mock message to be returned
    mockLastMessage = JSON.stringify({
      type: 'analysis_progress',
      progress: 42,
      status: 'running',
      current_step: 3,
      total_steps: 7,
      step_progress: 75,
      estimated_time_remaining: 60
    });
    
    mockConnectionStatus = 'Open';
    
    // Render the hook
    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));
    
    // Verify state was updated
    expect(result.current.progress).toBe(42);
    expect(result.current.status).toBe('running');
    expect(result.current.currentStep).toBe(3);
    expect(result.current.totalSteps).toBe(7);
    expect(result.current.stepProgress).toBe(75);
    expect(result.current.estimatedTimeRemaining).toBe(60);
  });

  test('handles analysis complete message correctly', () => {
    const mockResult = { id: 'result-789', status: 'complete' };
    
    // Setup mock message to be returned
    mockLastMessage = JSON.stringify({
      type: 'analysis_complete',
      result: mockResult
    });
    
    mockConnectionStatus = 'Open';
    
    // Render the hook
    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));
    
    // Verify state was updated
    expect(result.current.progress).toBe(100);
    expect(result.current.status).toBe('complete');
    expect(result.current.result).toEqual(mockResult);
  });

  test('handles analysis error message correctly', () => {
    // Setup mock message to be returned
    mockLastMessage = JSON.stringify({
      type: 'analysis_error',
      error: 'Memory allocation failed'
    });
    
    mockConnectionStatus = 'Open';
    
    // Render the hook
    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));
    
    // Verify state was updated
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Memory allocation failed');
  });

  test('handles analysis cancelled message correctly', () => {
    // Setup mock message to be returned
    mockLastMessage = JSON.stringify({
      type: 'analysis_cancelled'
    });
    
    mockConnectionStatus = 'Open';
    
    // Render the hook
    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));
    
    // Verify state was updated
    expect(result.current.status).toBe('cancelled');
  });

  test('resets state when analysis ID changes', () => {
    // Initial render
    const { result, rerender } = renderHook(
      ({ projectId, analysisId }) => usePcaProgress(projectId, analysisId, true),
      { initialProps: { projectId: 'project-123', analysisId: 'analysis-456' } }
    );
    
    // Update state with a progress message
    mockLastMessage = JSON.stringify({
      type: 'analysis_progress',
      progress: 50,
      status: 'running',
      current_step: 3,
      total_steps: 7
    });
    
    // Force re-render to process the message
    rerender({ projectId: 'project-123', analysisId: 'analysis-456' });
    
    // Verify state was updated
    expect(result.current.progress).toBe(50);
    
    // Change analysis ID
    rerender({ projectId: 'project-123', analysisId: 'new-analysis-789' });
    
    // Verify state was reset
    expect(result.current.progress).toBe(0);
    expect(result.current.status).toBe('running');
    expect(result.current.currentStep).toBeNull();
    expect(result.current.result).toBeNull();
  });

  test('does not connect if disabled', () => {
    renderHook(() => usePcaProgress('project-123', 'analysis-456', false));
    
    // Verify WebSocket URL is null when disabled
    expect(useWebSocket).toHaveBeenCalledWith(null, expect.anything());
  });

  test('requestProgress sends correct message', () => {
    mockConnectionStatus = 'Open';
    
    // Render the hook
    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));
    
    // Call requestProgress
    act(() => {
      result.current.requestProgress();
    });
    
    // Verify sendMessage was called with correct data
    expect(mockSendMessage).toHaveBeenCalledWith(
      JSON.stringify({ action: 'get_progress' })
    );
  });

  test('cancelAnalysis sends correct message', () => {
    mockConnectionStatus = 'Open';
    
    // Render the hook
    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));
    
    // Call cancelAnalysis
    act(() => {
      result.current.cancelAnalysis();
    });
    
    // Verify sendMessage was called with correct data
    expect(mockSendMessage).toHaveBeenCalledWith(
      JSON.stringify({ action: 'cancel_analysis' })
    );
  });
});