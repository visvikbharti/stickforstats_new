import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DOEWebSocketIntegration from '../DOEWebSocketIntegration';

// Mock WebSocket
let mockWsInstance;
const mockWsSend = jest.fn();
const mockWsClose = jest.fn();

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    mockWsInstance = this;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.send = mockWsSend;
    this.close = mockWsClose;
    // Simulate async connection
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
}
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSED = 3;

// Store the original WebSocket
const OriginalWebSocket = global.WebSocket;

describe('DOEWebSocketIntegration Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockWsInstance = null;
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = OriginalWebSocket;
  });

  test('renders with title and initial disconnected state', () => {
    render(<DOEWebSocketIntegration analysisId="test-123" autoConnect={false} />);
    expect(screen.getByText('DOE Analysis Progress')).toBeInTheDocument();
    expect(screen.getByText('disconnected')).toBeInTheDocument();
  });

  test('connects and shows connected status', async () => {
    render(<DOEWebSocketIntegration analysisId="test-123" />);

    // Advance timers to trigger onopen
    act(() => {
      jest.advanceTimersByTime(10);
    });

    await waitFor(() => {
      expect(screen.getByText('connected')).toBeInTheDocument();
    });
  });

  test('shows progress bar and percentage', async () => {
    render(<DOEWebSocketIntegration analysisId="test-123" />);

    act(() => {
      jest.advanceTimersByTime(10);
    });

    // Simulate a progress message
    act(() => {
      if (mockWsInstance && mockWsInstance.onmessage) {
        mockWsInstance.onmessage({
          data: JSON.stringify({
            type: 'progress',
            progress: 45,
            message: 'Computing eigenvalues...'
          })
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('Computing eigenvalues...')).toBeInTheDocument();
    });
  });

  test('calls onComplete when result message is received', async () => {
    const mockOnComplete = jest.fn();
    render(
      <DOEWebSocketIntegration
        analysisId="test-123"
        onComplete={mockOnComplete}
      />
    );

    act(() => {
      jest.advanceTimersByTime(10);
    });

    // Simulate a result message
    act(() => {
      if (mockWsInstance && mockWsInstance.onmessage) {
        mockWsInstance.onmessage({
          data: JSON.stringify({
            type: 'result',
            result: { factors: 3, runs: 8 }
          })
        });
      }
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({ factors: 3, runs: 8 });
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  test('shows error message on WebSocket error', async () => {
    const mockOnError = jest.fn();
    render(
      <DOEWebSocketIntegration
        analysisId="test-123"
        onError={mockOnError}
      />
    );

    act(() => {
      jest.advanceTimersByTime(10);
    });

    // Simulate an error message from the server
    act(() => {
      if (mockWsInstance && mockWsInstance.onmessage) {
        mockWsInstance.onmessage({
          data: JSON.stringify({
            type: 'error',
            error: 'Analysis failed'
          })
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Analysis failed')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith('Analysis failed');
    });
  });

  test('shows completion state when progress reaches 100', async () => {
    render(<DOEWebSocketIntegration analysisId="test-123" />);

    act(() => {
      jest.advanceTimersByTime(10);
    });

    // Simulate completion
    act(() => {
      if (mockWsInstance && mockWsInstance.onmessage) {
        mockWsInstance.onmessage({
          data: JSON.stringify({
            type: 'result',
            result: { success: true }
          })
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Analysis completed successfully!')).toBeInTheDocument();
    });
  });

  test('does not connect when autoConnect is false', () => {
    render(<DOEWebSocketIntegration analysisId="test-123" autoConnect={false} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockWsInstance).toBeNull();
    expect(screen.getByText('disconnected')).toBeInTheDocument();
  });
});
