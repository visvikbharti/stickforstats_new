import { useState, useCallback, useEffect, useRef } from 'react';
import workflowService from '../services/workflowService';

/**
 * Custom hook for working with workflows
 * 
 * Provides functions for managing workflows and their execution
 * 
 * @returns {Object} Workflow API functions and states
 */
export const useWorkflowAPI = () => {
  const [workflows, setWorkflows] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  
  // For polling execution status
  const pollingInterval = useRef(null);
  
  /**
   * Clear any polling intervals when component unmounts
   */
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);
  
  /**
   * Get all workflows with optional filtering
   * 
   * @param {Object} filters - Optional filters
   */
  const fetchWorkflows = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.getWorkflows(filters);
      setWorkflows(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Get a single workflow by ID
   * 
   * @param {string} workflowId - Workflow ID to fetch
   */
  const fetchWorkflow = useCallback(async (workflowId) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.getWorkflow(workflowId);
      setWorkflow(data);
      
      // Also fetch execution status for active workflows
      if (['active', 'in_progress'].includes(data.status)) {
        fetchExecutionStatus(workflowId);
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Create a new workflow
   * 
   * @param {Object} workflowData - New workflow data
   */
  const createWorkflow = useCallback(async (workflowData) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.createWorkflow(workflowData);
      setWorkflow(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Update an existing workflow
   * 
   * @param {string} workflowId - Workflow ID to update
   * @param {Object} workflowData - Updated workflow data
   */
  const updateWorkflow = useCallback(async (workflowId, workflowData) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.updateWorkflow(workflowId, workflowData);
      setWorkflow(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Delete a workflow
   * 
   * @param {string} workflowId - Workflow ID to delete
   */
  const deleteWorkflow = useCallback(async (workflowId) => {
    setLoading(true);
    setError(null);
    
    try {
      await workflowService.deleteWorkflow(workflowId);
      setWorkflow(null);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Fetch steps for a workflow
   * 
   * @param {string} workflowId - Workflow ID
   */
  const fetchWorkflowSteps = useCallback(async (workflowId) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.getWorkflowSteps(workflowId);
      setSteps(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Create a workflow step
   * 
   * @param {string} workflowId - Workflow ID
   * @param {Object} stepData - Step data
   */
  const createWorkflowStep = useCallback(async (workflowId, stepData) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.createWorkflowStep(workflowId, stepData);
      
      // Update steps list
      setSteps(prevSteps => [...prevSteps, data]);
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Update a workflow step
   * 
   * @param {string} workflowId - Workflow ID
   * @param {string} stepId - Step ID
   * @param {Object} stepData - Updated step data
   */
  const updateWorkflowStep = useCallback(async (workflowId, stepId, stepData) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.updateWorkflowStep(workflowId, stepId, stepData);
      
      // Update steps list
      setSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId ? data : step
        )
      );
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Delete a workflow step
   * 
   * @param {string} workflowId - Workflow ID
   * @param {string} stepId - Step ID to delete
   */
  const deleteWorkflowStep = useCallback(async (workflowId, stepId) => {
    setLoading(true);
    setError(null);
    
    try {
      await workflowService.deleteWorkflowStep(workflowId, stepId);
      
      // Update steps list
      setSteps(prevSteps => prevSteps.filter(step => step.id !== stepId));
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Update a step's status
   * 
   * @param {string} workflowId - Workflow ID
   * @param {string} stepId - Step ID
   * @param {string} status - New status
   * @param {string} errorMessage - Optional error message
   */
  const updateStepStatus = useCallback(async (workflowId, stepId, status, errorMessage = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.updateStepStatus(workflowId, stepId, {
        status,
        error_message: errorMessage
      });
      
      // Update steps list
      setSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId ? data : step
        )
      );
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Execute a workflow
   * 
   * @param {string} workflowId - Workflow ID to execute
   * @param {number} executeFromStep - Optional step index to start from
   */
  const executeWorkflow = useCallback(async (workflowId, executeFromStep = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.executeWorkflow(workflowId, {
        execute_from_step: executeFromStep
      });
      
      // Start polling for execution status
      startPolling(workflowId);
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Fetch execution status for a workflow
   * 
   * @param {string} workflowId - Workflow ID
   */
  const fetchExecutionStatus = useCallback(async (workflowId) => {
    setError(null);
    
    try {
      const data = await workflowService.getExecutionStatus(workflowId);
      setExecutionStatus(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  /**
   * Start polling for execution status
   * 
   * @param {string} workflowId - Workflow ID
   * @param {number} interval - Polling interval in ms
   */
  const startPolling = useCallback((workflowId, interval = 2000) => {
    // Clear any existing polling
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    // Start new polling
    pollingInterval.current = setInterval(async () => {
      try {
        const status = await fetchExecutionStatus(workflowId);
        
        // Stop polling when execution is complete or failed
        if (['completed', 'failed', 'cancelled'].includes(status.status)) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
          
          // Refresh workflow data
          fetchWorkflow(workflowId);
        }
      } catch (err) {
        console.error('Error polling execution status:', err);
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }, interval);
    
    return () => {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    };
  }, [fetchExecutionStatus, fetchWorkflow]);
  
  /**
   * Stop polling for execution status
   */
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);
  
  /**
   * Cancel workflow execution
   * 
   * @param {string} workflowId - Workflow ID
   */
  const cancelExecution = useCallback(async (workflowId) => {
    setError(null);
    
    try {
      const data = await workflowService.cancelExecution(workflowId);
      
      // Stop polling
      stopPolling();
      
      // Update execution status
      if (data) {
        setExecutionStatus(data);
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [stopPolling]);
  
  /**
   * Get execution history
   * 
   * @param {number} limit - Maximum number of history items
   */
  const getExecutionHistory = useCallback(async (limit = 20) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.getExecutionHistory({ limit });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Clone a workflow
   * 
   * @param {string} workflowId - Workflow ID to clone
   * @param {string} name - Optional new name
   * @param {boolean} includeSessions - Whether to include sessions
   */
  const cloneWorkflow = useCallback(async (workflowId, name = '', includeSessions = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workflowService.cloneWorkflow(workflowId, {
        name,
        include_sessions: includeSessions
      });
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Export a workflow
   * 
   * @param {string} workflowId - Workflow ID to export
   * @param {boolean} includeData - Whether to include dataset data
   */
  const exportWorkflow = useCallback(async (workflowId, includeData = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await workflowService.exportWorkflow(workflowId, {
        include_data: includeData
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([result.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = result.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `workflow_${workflowId}.json`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Import a workflow
   * 
   * @param {File} file - Workflow JSON file
   * @param {boolean} importData - Whether to import dataset data
   */
  const importWorkflow = useCallback(async (file, importData = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('import_data', importData);
      
      const data = await workflowService.importWorkflow(formData);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    // State
    workflows,
    workflow,
    steps,
    loading,
    error,
    executionStatus,
    
    // Workflow CRUD
    fetchWorkflows,
    fetchWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    
    // Step management
    fetchWorkflowSteps,
    createWorkflowStep,
    updateWorkflowStep,
    deleteWorkflowStep,
    updateStepStatus,
    
    // Execution
    executeWorkflow,
    fetchExecutionStatus,
    startPolling,
    stopPolling,
    cancelExecution,
    getExecutionHistory,
    
    // Management
    cloneWorkflow,
    exportWorkflow,
    importWorkflow
  };
};

export default useWorkflowAPI;