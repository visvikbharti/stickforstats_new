import { renderHook } from '@testing-library/react';
import useDOEWebSocket from '../useDOEWebSocket';

// Mock the secureWebSocketUtils module
jest.mock('../../utils/secureWebSocketUtils', () => ({
  secureWebSocketUrl: jest.fn((path) => `wss://localhost:8000/ws${path}`),
  createWebSocketOptions: jest.fn(() => ({})),
  safeSend: jest.fn((ws, data) => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }),
  isWebSocketConnected: jest.fn((ws) => ws && ws.readyState === 1),
}));

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.CLOSED = 3;
    MockWebSocket.instances.push(this);

    // Simulate async open
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data) {
    this.lastSentMessage = data;
    return true;
  }

  close(code = 1000, reason = '') {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ code, reason, wasClean: true });
  }
}
MockWebSocket.instances = [];
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

global.WebSocket = MockWebSocket;

describe('useDOEWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockWebSocket.instances = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initializes with disconnected status when no analysisId', () => {
    const { result } = renderHook(() =>
      useDOEWebSocket(null, { autoConnect: false })
    );

    expect(result.current.status).toBe('disconnected');
  });

  test('returns isConnected correctly', () => {
    const { result } = renderHook(() =>
      useDOEWebSocket(null, { autoConnect: false })
    );

    expect(result.current.isConnected).toBe(false);
  });

  test('exposes sendMessage function', () => {
    const { result } = renderHook(() =>
      useDOEWebSocket(null, { autoConnect: false })
    );

    expect(typeof result.current.sendMessage).toBe('function');
  });

  test('exposes connect and disconnect functions', () => {
    const { result } = renderHook(() =>
      useDOEWebSocket(null, { autoConnect: false })
    );

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  test('exposes startAnalysis and cancelAnalysis', () => {
    const { result } = renderHook(() =>
      useDOEWebSocket(null, { autoConnect: false })
    );

    expect(typeof result.current.startAnalysis).toBe('function');
    expect(typeof result.current.cancelAnalysis).toBe('function');
  });

  test('returns initial progress as 0', () => {
    const { result } = renderHook(() =>
      useDOEWebSocket(null, { autoConnect: false })
    );

    expect(result.current.progress).toBe(0);
  });

  test('returns null data initially', () => {
    const { result } = renderHook(() =>
      useDOEWebSocket(null, { autoConnect: false })
    );

    expect(result.current.data).toBeNull();
  });
});
