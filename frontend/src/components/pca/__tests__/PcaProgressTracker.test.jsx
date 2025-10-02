import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PcaProgressTracker from '../PcaProgressTracker';
import * as usePcaProgress from '../../../hooks/usePcaProgress';

// Mock the usePcaProgress hook
jest.mock('../../../hooks/usePcaProgress', () => ({
  usePcaProgress: jest.fn(),
}));

// Create a theme for testing
const theme = createTheme();

// Helper function to render component with theme
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PcaProgressTracker Component', () => {
  // Mock implementation setup
  const mockCancelAnalysis = jest.fn();
  const mockRequestProgress = jest.fn();
  
  const defaultMockHookReturn = {
    progress: 0,
    status: 'idle',
    currentStep: null,
    totalSteps: null,
    stepProgress: 0,
    estimatedTimeRemaining: null,
    error: null,
    result: null,
    connectionStatus: 'Connecting',
    requestProgress: mockRequestProgress,
    cancelAnalysis: mockCancelAnalysis,
    isReady: false
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    usePcaProgress.usePcaProgress = jest.fn(() => defaultMockHookReturn);
  });

  test('renders initializing state correctly', () => {
    usePcaProgress.usePcaProgress.mockReturnValue({
      ...defaultMockHookReturn,
      status: 'idle'
    });
    
    renderWithTheme(
      <PcaProgressTracker 
        projectId="test-project" 
        analysisId="test-analysis" 
        enabled={true}
      />
    );
    
    expect(screen.getByText(/Initializing PCA analysis/i)).toBeInTheDocument();
  });

  test('renders running analysis state correctly', () => {
    usePcaProgress.usePcaProgress.mockReturnValue({
      ...defaultMockHookReturn,
      status: 'running',
      progress: 30,
      currentStep: 2,
      totalSteps: 7,
      stepProgress: 45,
      estimatedTimeRemaining: 120,
      connectionStatus: 'Open',
      isReady: true
    });
    
    renderWithTheme(
      <PcaProgressTracker 
        projectId="test-project" 
        analysisId="test-analysis" 
        enabled={true}
      />
    );
    
    expect(screen.getByText(/Running PCA Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Overall progress:/i)).toBeInTheDocument();
    expect(screen.getByText(/30%/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimated time remaining: 2 minutes/i)).toBeInTheDocument();
  });

  test('renders completed state correctly', () => {
    const mockResult = { id: 'result-123', status: 'completed' };
    const mockOnComplete = jest.fn();
    
    usePcaProgress.usePcaProgress.mockReturnValue({
      ...defaultMockHookReturn,
      status: 'complete',
      progress: 100,
      result: mockResult,
      connectionStatus: 'Open',
      isReady: true
    });
    
    renderWithTheme(
      <PcaProgressTracker 
        projectId="test-project" 
        analysisId="test-analysis" 
        onComplete={mockOnComplete}
        enabled={true}
      />
    );
    
    expect(screen.getByText(/PCA Analysis Complete/i)).toBeInTheDocument();
    
    // Verify callback was called
    expect(mockOnComplete).toHaveBeenCalledWith(mockResult);
  });

  test('renders error state correctly', () => {
    const mockError = 'Analysis failed due to insufficient memory';
    const mockOnError = jest.fn();
    
    usePcaProgress.usePcaProgress.mockReturnValue({
      ...defaultMockHookReturn,
      status: 'error',
      error: mockError,
      connectionStatus: 'Open',
      isReady: true
    });
    
    renderWithTheme(
      <PcaProgressTracker 
        projectId="test-project" 
        analysisId="test-analysis" 
        onError={mockOnError}
        enabled={true}
      />
    );
    
    expect(screen.getByText(/Analysis Error/i)).toBeInTheDocument();
    expect(screen.getByText(mockError)).toBeInTheDocument();
    
    // Verify callback was called
    expect(mockOnError).toHaveBeenCalledWith(mockError);
  });

  test('renders cancelled state correctly', () => {
    const mockOnCancel = jest.fn();
    
    usePcaProgress.usePcaProgress.mockReturnValue({
      ...defaultMockHookReturn,
      status: 'cancelled',
      connectionStatus: 'Open',
      isReady: true
    });
    
    renderWithTheme(
      <PcaProgressTracker 
        projectId="test-project" 
        analysisId="test-analysis" 
        onCancel={mockOnCancel}
        enabled={true}
      />
    );
    
    expect(screen.getByText(/Analysis Cancelled/i)).toBeInTheDocument();
  });

  test('handles cancel button click correctly', async () => {
    usePcaProgress.usePcaProgress.mockReturnValue({
      ...defaultMockHookReturn,
      status: 'running',
      progress: 50,
      connectionStatus: 'Open',
      isReady: true,
      cancelAnalysis: mockCancelAnalysis
    });
    
    renderWithTheme(
      <PcaProgressTracker 
        projectId="test-project" 
        analysisId="test-analysis" 
        enabled={true}
      />
    );
    
    // Click cancel button
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    
    // Verify cancelAnalysis was called
    expect(mockCancelAnalysis).toHaveBeenCalled();
  });

  test('shows connection lost warning when appropriate', async () => {
    jest.useFakeTimers();
    
    usePcaProgress.usePcaProgress.mockReturnValue({
      ...defaultMockHookReturn,
      status: 'running',
      progress: 50,
      connectionStatus: 'Closed',
      isReady: false
    });
    
    renderWithTheme(
      <PcaProgressTracker 
        projectId="test-project" 
        analysisId="test-analysis" 
        enabled={true}
      />
    );
    
    // Advance timers to trigger connection lost warning
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    
    // Verify warning is shown
    expect(screen.getByText(/Connection to server lost/i)).toBeInTheDocument();
    
    jest.useRealTimers();
  });

  test('does not render when disabled', () => {
    renderWithTheme(
      <PcaProgressTracker 
        projectId="test-project" 
        analysisId="test-analysis" 
        enabled={false}
      />
    );
    
    // Component should be empty when disabled
    expect(screen.queryByText(/Running PCA Analysis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Initializing PCA analysis/i)).not.toBeInTheDocument();
  });
});