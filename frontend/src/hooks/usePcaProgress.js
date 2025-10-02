import { useState, useEffect, useCallback } from 'react';
import useWebSocket from './useWebSocket';

/**
 * Custom hook for tracking PCA analysis progress via WebSockets
 * 
 * @param {string} projectId - ID of the PCA project
 * @param {string} analysisId - ID of the running analysis (if any)
 * @param {boolean} enabled - Whether to enable the WebSocket connection
 * @returns {Object} PCA analysis progress state and control methods
 */
export const usePcaProgress = (projectId, analysisId, enabled = true) => {
  // Progress state
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [currentStep, setCurrentStep] = useState(null);
  const [totalSteps, setTotalSteps] = useState(null);
  const [stepProgress, setStepProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  
  // Create WebSocket URL only if enabled and IDs are provided
  const wsUrl = enabled && projectId && analysisId ? 
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/pca_analysis/progress/${projectId}/${analysisId}/` :
    null;
  
  // Connect to WebSocket
  const { lastMessage, connectionStatus, sendMessage } = useWebSocket(wsUrl, {
    maxReconnectAttempts: 5
  });
  
  // Parse WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        // Handle different message types
        switch (data.type) {
          case 'analysis_progress':
            setProgress(data.progress);
            setStatus(data.status);
            setCurrentStep(data.current_step);
            setTotalSteps(data.total_steps);
            setStepProgress(data.step_progress);
            setEstimatedTimeRemaining(data.estimated_time_remaining);
            break;
            
          case 'analysis_complete':
            setProgress(100);
            setStatus('complete');
            setResult(data.result);
            break;
            
          case 'analysis_error':
            setStatus('error');
            setError(data.error);
            break;
            
          case 'analysis_cancelled':
            setStatus('cancelled');
            break;
            
          default:
            // Ignore unknown message types
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);
  
  // Reset progress when analysis ID changes
  useEffect(() => {
    setProgress(0);
    setStatus(analysisId ? 'running' : 'idle');
    setCurrentStep(null);
    setTotalSteps(null);
    setStepProgress(0);
    setEstimatedTimeRemaining(null);
    setError(null);
    setResult(null);
  }, [analysisId]);
  
  // Request current progress
  const requestProgress = useCallback(() => {
    if (connectionStatus === 'Open') {
      sendMessage(JSON.stringify({
        action: 'get_progress'
      }));
      return true;
    }
    return false;
  }, [connectionStatus, sendMessage]);
  
  // Cancel analysis
  const cancelAnalysis = useCallback(() => {
    if (connectionStatus === 'Open') {
      sendMessage(JSON.stringify({
        action: 'cancel_analysis'
      }));
      return true;
    }
    return false;
  }, [connectionStatus, sendMessage]);
  
  return {
    // Progress state
    progress,
    status,
    currentStep,
    totalSteps,
    stepProgress,
    estimatedTimeRemaining,
    error,
    result,
    
    // Connection state
    connectionStatus,
    
    // Control methods
    requestProgress,
    cancelAnalysis,
    
    // Connection is ready
    isReady: connectionStatus === 'Open'
  };
};

export default usePcaProgress;