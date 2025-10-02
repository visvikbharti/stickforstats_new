import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/datasets`;

/**
 * Fetches a paginated list of datasets with optional filtering
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Number of items per page
 * @param {string} options.search - Optional search query
 * @param {string} options.file_type - Optional file type filter (csv, excel)
 * @param {string} options.sort - Optional sort field with direction (-created_at, name, etc.)
 * @returns {Promise<Object>} - Paginated results
 */
export const fetchDatasets = async ({
  page = 1,
  limit = 10,
  search = '',
  file_type = '',
  sort = '-created_at'
} = {}) => {
  try {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    
    if (search) params.append('search', search);
    if (file_type) params.append('file_type', file_type);
    if (sort) params.append('sort', sort);
    
    const response = await axios.get(`${API_URL}/?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches a single dataset by ID
 * 
 * @param {string} id - Dataset ID
 * @returns {Promise<Object>} - Dataset object
 */
export const fetchDatasetById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches a preview of a dataset (first few rows)
 * 
 * @param {string} id - Dataset ID
 * @returns {Promise<Object>} - Dataset preview with columns and data
 */
export const fetchDatasetPreview = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}/preview/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Uploads a new dataset
 * 
 * @param {FormData} formData - Form data with file and metadata
 * @returns {Promise<Object>} - Created dataset object
 */
export const uploadDataset = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a dataset
 * 
 * @param {string} id - Dataset ID to delete
 * @returns {Promise<Object>} - Response object
 */
export const deleteDataset = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates dataset metadata
 * 
 * @param {string} id - Dataset ID to update
 * @param {Object} data - New metadata
 * @returns {Promise<Object>} - Updated dataset
 */
export const updateDataset = async (id, data) => {
  try {
    const response = await axios.patch(`${API_URL}/${id}/`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Validates an existing dataset
 * 
 * @param {string} id - Dataset ID to validate
 * @param {string} validationType - Type of validation to perform
 * @returns {Promise<Object>} - Validation results
 */
export const validateDataset = async (id, validationType = 'standard') => {
  try {
    const response = await axios.post(`${API_URL}/${id}/validate/`, {
      validation_type: validationType
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Downloads a dataset file
 * 
 * @param {string} id - Dataset ID to download
 * @returns {Promise<Blob>} - File blob
 */
export const downloadDataset = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}/download/`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};