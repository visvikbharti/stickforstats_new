import { renderHook, act } from '@testing-library/react';
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

    // Verify initial state — analysisId is set so status resets to 'running'
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

  test('does not connect if disabled', () => {
    renderHook(() => usePcaProgress('project-123', 'analysis-456', false));

    // Verify WebSocket URL is null when disabled
    expect(useWebSocket).toHaveBeenCalledWith(null, expect.anything());
  });

  test('returns connectionStatus from WebSocket', () => {
    mockConnectionStatus = 'Open';
    useWebSocket.mockImplementation(() => ({
      lastMessage: null,
      connectionStatus: 'Open',
      sendMessage: mockSendMessage
    }));

    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));

    expect(result.current.connectionStatus).toBe('Open');
    expect(result.current.isReady).toBe(true);
  });

  test('requestProgress sends correct message when connected', () => {
    useWebSocket.mockImplementation(() => ({
      lastMessage: null,
      connectionStatus: 'Open',
      sendMessage: mockSendMessage
    }));

    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));

    act(() => {
      result.current.requestProgress();
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      JSON.stringify({ action: 'get_progress' })
    );
  });

  test('cancelAnalysis sends correct message when connected', () => {
    useWebSocket.mockImplementation(() => ({
      lastMessage: null,
      connectionStatus: 'Open',
      sendMessage: mockSendMessage
    }));

    const { result } = renderHook(() => usePcaProgress('project-123', 'analysis-456', true));

    act(() => {
      result.current.cancelAnalysis();
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      JSON.stringify({ action: 'cancel_analysis' })
    );
  });
});
