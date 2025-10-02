// Workflow Service - API service for workflow management and execution
import axios from 'axios';
import apiConfig from '../config/apiConfig';

const workflowService = {
  // Create a new workflow
  createWorkflow: async (workflowData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/workflows/`,
        workflowData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  },

  // Get list of workflows
  getWorkflows: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get(
        `${apiConfig.baseURL}/workflows/?${params.toString()}`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  },

  // Get workflow details by ID
  getWorkflowDetails: async (workflowId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/workflows/${workflowId}/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow details:', error);
      throw error;
    }
  },

  // Execute workflow
  executeWorkflow: async (workflowId, executionParams = {}) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/workflows/${workflowId}/execute/`,
        executionParams,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  },

  // Get workflow execution status
  getExecutionStatus: async (executionId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/workflows/executions/${executionId}/status/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching execution status:', error);
      throw error;
    }
  },

  // Update workflow
  updateWorkflow: async (workflowId, updateData) => {
    try {
      const response = await axios.patch(
        `${apiConfig.baseURL}/workflows/${workflowId}/`,
        updateData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  },

  // Delete workflow
  deleteWorkflow: async (workflowId) => {
    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/workflows/${workflowId}/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  }
};

export const createWorkflow = workflowService.createWorkflow;
export const getWorkflows = workflowService.getWorkflows;
export const executeWorkflow = workflowService.executeWorkflow;
export const getWorkflowDetails = workflowService.getWorkflowDetails;

export default workflowService;