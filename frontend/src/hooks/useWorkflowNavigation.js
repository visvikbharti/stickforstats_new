/**
 * useWorkflowNavigation Hook
 * 
 * Custom React hook for managing workflow navigation state and operations.
 * Provides intelligent navigation, state management, and decision support.
 * 
 * @author Vishal Bharti
 * @date 2025-08-26
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';

// Navigation modes matching backend
const NavigationMode = {
  GUIDED: 'guided',
  ASSISTED: 'assisted',
  EXPERT: 'expert',
  CUSTOM: 'custom'
};

// Step types matching backend
const StepType = {
  DATA_UPLOAD: 'data_upload',
  DATA_PROFILING: 'data_profiling',
  DATA_CLEANING: 'data_cleaning',
  ASSUMPTION_CHECK: 'assumption_check',
  TEST_SELECTION: 'test_selection',
  TEST_EXECUTION: 'test_execution',
  RESULT_INTERPRETATION: 'result_interpretation',
  REPORT_GENERATION: 'report_generation',
  VISUALIZATION: 'visualization',
  DECISION_POINT: 'decision_point'
};

/**
 * Custom hook for workflow navigation
 * @param {string} workflowId - Unique workflow identifier
 * @param {object} options - Configuration options
 */
export const useWorkflowNavigation = (workflowId, options = {}) => {
  // Configuration
  const {
    mode = NavigationMode.GUIDED,
    autoSave = true,
    autoSaveInterval = 30000, // 30 seconds
    enableWebSocket = false,
    apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
  } = options;

  // State management
  const [navigationState, setNavigationState] = useState({
    currentStep: null,
    nextStep: null,
    previousSteps: [],
    availableSteps: [],
    completedSteps: [],
    mode: mode,
    progress: 0,
    isLoading: false,
    error: null
  });

  const [context, setContext] = useState({
    data: null,
    parameters: {},
    results: {},
    metadata: {},
    checkpoints: []
  });

  const [recommendations, setRecommendations] = useState([]);
  const [decisionNode, setDecisionNode] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Refs for cleanup
  const autoSaveTimerRef = useRef(null);
  const wsRef = useRef(null);

  // Redux integration (if available)
  const dispatch = useDispatch ? useDispatch() : null;
  const reduxState = useSelector ? useSelector(state => state.workflow) : null;

  /**
   * Initialize navigation controller
   */
  const initializeNavigation = useCallback(async () => {
    setNavigationState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await axios.post(`${apiBaseUrl}/workflow/navigation/initialize`, {
        workflow_id: workflowId,
        mode: mode
      });

      const { data } = response;
      
      setNavigationState(prev => ({
        ...prev,
        currentStep: data.current_step,
        nextStep: data.next_step,
        availableSteps: data.available_steps,
        progress: data.progress,
        isLoading: false
      }));

      // Set initial recommendations
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }

      return data;
    } catch (error) {
      console.error('Failed to initialize navigation:', error);
      setNavigationState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, [workflowId, mode, apiBaseUrl]);

  /**
   * Navigate to a specific step
   */
  const navigateToStep = useCallback(async (stepId, skipValidation = false) => {
    if (!skipValidation) {
      // Validate transition
      const isValid = await validateTransition(navigationState.currentStep, stepId);
      if (!isValid) {
        console.warn(`Invalid transition from ${navigationState.currentStep} to ${stepId}`);
        return false;
      }
    }

    setNavigationState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await axios.post(`${apiBaseUrl}/workflow/navigation/navigate`, {
        workflow_id: workflowId,
        from_step: navigationState.currentStep,
        to_step: stepId,
        context: context
      });

      const { data } = response;

      // Update navigation state
      setNavigationState(prev => ({
        ...prev,
        previousSteps: [...prev.previousSteps, prev.currentStep].filter(Boolean),
        currentStep: stepId,
        nextStep: data.next_step,
        completedSteps: data.completed_steps || prev.completedSteps,
        progress: data.progress,
        isLoading: false
      }));

      // Update recommendations
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }

      // Update decision node if applicable
      if (data.decision_node) {
        setDecisionNode(data.decision_node);
      }

      // Dispatch Redux action if available
      if (dispatch) {
        dispatch({
          type: 'WORKFLOW_NAVIGATE',
          payload: { workflowId, stepId, data }
        });
      }

      return true;
    } catch (error) {
      console.error('Navigation failed:', error);
      setNavigationState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      return false;
    }
  }, [workflowId, navigationState.currentStep, context, apiBaseUrl, dispatch]);

  /**
   * Validate a step transition
   */
  const validateTransition = useCallback(async (fromStep, toStep) => {
    try {
      const response = await axios.post(`${apiBaseUrl}/workflow/navigation/validate`, {
        workflow_id: workflowId,
        from_step: fromStep,
        to_step: toStep,
        context: context
      });

      const { is_valid, errors = [] } = response.data;
      
      if (!is_valid) {
        setValidationErrors(errors);
      }

      return is_valid;
    } catch (error) {
      console.error('Validation failed:', error);
      return false;
    }
  }, [workflowId, context, apiBaseUrl]);

  /**
   * Get available actions for current step
   */
  const getAvailableActions = useCallback(async () => {
    if (!navigationState.currentStep) return [];

    try {
      const response = await axios.get(
        `${apiBaseUrl}/workflow/navigation/actions/${workflowId}/${navigationState.currentStep}`
      );

      return response.data.actions || [];
    } catch (error) {
      console.error('Failed to get actions:', error);
      return [];
    }
  }, [workflowId, navigationState.currentStep, apiBaseUrl]);

  /**
   * Update workflow context
   */
  const updateContext = useCallback((updates) => {
    setContext(prev => {
      const newContext = { ...prev, ...updates };
      
      // Auto-save if enabled
      if (autoSave) {
        saveState();
      }

      return newContext;
    });
  }, [autoSave]);

  /**
   * Save navigation state
   */
  const saveState = useCallback(async () => {
    try {
      const response = await axios.post(`${apiBaseUrl}/workflow/navigation/save`, {
        workflow_id: workflowId,
        navigation_state: navigationState,
        context: context
      });

      return response.data.state_id;
    } catch (error) {
      console.error('Failed to save state:', error);
      return null;
    }
  }, [workflowId, navigationState, context, apiBaseUrl]);

  /**
   * Load navigation state
   */
  const loadState = useCallback(async (stateId) => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}/workflow/navigation/load/${workflowId}/${stateId}`
      );

      const { navigation_state, context: loadedContext } = response.data;

      setNavigationState(navigation_state);
      setContext(loadedContext);

      return true;
    } catch (error) {
      console.error('Failed to load state:', error);
      return false;
    }
  }, [workflowId, apiBaseUrl]);

  /**
   * Go back to previous step
   */
  const goBack = useCallback(() => {
    if (navigationState.previousSteps.length === 0) {
      console.warn('No previous steps to go back to');
      return false;
    }

    const previousStep = navigationState.previousSteps[navigationState.previousSteps.length - 1];
    const newPreviousSteps = navigationState.previousSteps.slice(0, -1);

    setNavigationState(prev => ({
      ...prev,
      currentStep: previousStep,
      previousSteps: newPreviousSteps
    }));

    return true;
  }, [navigationState.previousSteps]);

  /**
   * Reset navigation to beginning
   */
  const resetNavigation = useCallback(() => {
    setNavigationState({
      currentStep: null,
      nextStep: null,
      previousSteps: [],
      availableSteps: [],
      completedSteps: [],
      mode: mode,
      progress: 0,
      isLoading: false,
      error: null
    });

    setContext({
      data: null,
      parameters: {},
      results: {},
      metadata: {},
      checkpoints: []
    });

    setRecommendations([]);
    setDecisionNode(null);
    setValidationErrors([]);
  }, [mode]);

  /**
   * Get progress information
   */
  const getProgress = useCallback(() => {
    const totalSteps = navigationState.availableSteps.length || 1;
    const completedSteps = navigationState.completedSteps.length;
    const percentage = Math.round((completedSteps / totalSteps) * 100);

    return {
      percentage,
      completedSteps,
      totalSteps,
      currentStep: navigationState.currentStep,
      isComplete: completedSteps >= totalSteps
    };
  }, [navigationState]);

  /**
   * Make a decision (for decision nodes)
   */
  const makeDecision = useCallback(async (optionId) => {
    if (!decisionNode) {
      console.warn('No decision node active');
      return false;
    }

    try {
      const response = await axios.post(`${apiBaseUrl}/workflow/navigation/decide`, {
        workflow_id: workflowId,
        decision_node_id: decisionNode.id,
        selected_option: optionId,
        context: context
      });

      const { next_step, next_decision_node } = response.data;

      if (next_step) {
        await navigateToStep(next_step);
      }

      if (next_decision_node) {
        setDecisionNode(next_decision_node);
      } else {
        setDecisionNode(null);
      }

      return true;
    } catch (error) {
      console.error('Decision failed:', error);
      return false;
    }
  }, [workflowId, decisionNode, context, apiBaseUrl, navigateToStep]);

  /**
   * Setup WebSocket connection for real-time updates
   */
  const setupWebSocket = useCallback(() => {
    if (!enableWebSocket) return;

    const wsUrl = apiBaseUrl.replace('http', 'ws') + `/workflow/ws/${workflowId}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      switch (data.type) {
        case 'navigation_update':
          setNavigationState(prev => ({ ...prev, ...data.payload }));
          break;
        case 'recommendation_update':
          setRecommendations(data.payload);
          break;
        case 'context_update':
          setContext(prev => ({ ...prev, ...data.payload }));
          break;
        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
    };
  }, [enableWebSocket, apiBaseUrl, workflowId]);

  // Effects

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeNavigation();

    // Setup WebSocket if enabled
    setupWebSocket();

    // Setup auto-save if enabled
    if (autoSave) {
      autoSaveTimerRef.current = setInterval(() => {
        saveState();
      }, autoSaveInterval);
    }

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  /**
   * Update recommendations when context changes
   */
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!navigationState.currentStep) return;

      try {
        const response = await axios.post(
          `${apiBaseUrl}/workflow/navigation/recommendations`,
          {
            workflow_id: workflowId,
            current_step: navigationState.currentStep,
            context: context
          }
        );

        setRecommendations(response.data.recommendations || []);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      }
    };

    fetchRecommendations();
  }, [navigationState.currentStep, context]);

  // Public API
  return {
    // State
    navigationState,
    context,
    recommendations,
    decisionNode,
    validationErrors,
    
    // Navigation methods
    navigateToStep,
    goBack,
    resetNavigation,
    
    // Context methods
    updateContext,
    
    // Decision methods
    makeDecision,
    
    // State management
    saveState,
    loadState,
    
    // Utility methods
    getProgress,
    getAvailableActions,
    validateTransition,
    
    // Control methods
    setMode: (newMode) => setNavigationState(prev => ({ ...prev, mode: newMode }))
  };
};

export default useWorkflowNavigation;