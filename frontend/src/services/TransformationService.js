/**
 * Transformation Service
 * =====================
 * Frontend service for data transformation API endpoints.
 * Provides methods to suggest, apply, validate, and export transformations.
 *
 * Author: StickForStats Development Team
 * Date: October 2025
 */

import axios from 'axios';
import apiConfig from '../config/apiConfig';

const API_BASE = apiConfig.baseURL || 'http://localhost:8000';

class TransformationService {
  /**
   * Get transformation suggestion based on data characteristics
   *
   * @param {Array<number>} data - Array of numeric values
   * @param {string} violationType - Type of violation ('normality', 'variance', etc.)
   * @returns {Promise<Object>} Suggestion details
   */
  static async suggestTransformation(data, violationType = 'normality') {
    try {
      const response = await axios.post(
        `${API_BASE}/api/guardian/transformation/suggest/`,
        {
          data: data,
          violation_type: violationType
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Transformation suggestion error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to suggest transformation'
      };
    }
  }

  /**
   * Apply transformation to data
   *
   * @param {Array<number>} data - Original data
   * @param {string} transformationType - Type: 'log', 'sqrt', 'boxcox', 'inverse', 'rank'
   * @param {Object} parameters - Transformation parameters (e.g., {add_constant: 1.0})
   * @returns {Promise<Object>} Transformed data and details
   */
  static async applyTransformation(data, transformationType, parameters = {}) {
    try {
      const response = await axios.post(
        `${API_BASE}/api/guardian/transformation/apply/`,
        {
          data: data,
          transformation: transformationType,
          parameters: parameters
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Transformation apply error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to apply transformation'
      };
    }
  }

  /**
   * Validate transformation effectiveness
   *
   * @param {Array<number>} originalData - Original data
   * @param {Array<number>} transformedData - Transformed data
   * @returns {Promise<Object>} Validation results
   */
  static async validateTransformation(originalData, transformedData) {
    try {
      const response = await axios.post(
        `${API_BASE}/api/guardian/transformation/validate/`,
        {
          original_data: originalData,
          transformed_data: transformedData
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Transformation validation error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to validate transformation'
      };
    }
  }

  /**
   * Export transformation code (Python or R)
   *
   * @param {string} transformationType - Type of transformation
   * @param {Object} parameters - Transformation parameters
   * @param {string} language - 'python' or 'r'
   * @returns {Promise<Object>} Code string
   */
  static async exportCode(transformationType, parameters, language = 'python') {
    try {
      const response = await axios.post(
        `${API_BASE}/api/guardian/transformation/export-code/`,
        {
          transformation: transformationType,
          parameters: parameters,
          language: language
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        code: response.data.code,
        language: response.data.language
      };
    } catch (error) {
      console.error('Code export error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to export code'
      };
    }
  }

  /**
   * Helper: Flatten grouped data to single array
   *
   * @param {Array|Object} data - Data in various formats
   * @returns {Array<number>} Flattened array
   */
  static flattenData(data) {
    if (Array.isArray(data)) {
      // Check if it's array of arrays (grouped data)
      if (data.length > 0 && Array.isArray(data[0])) {
        return data.flat();
      }
      return data;
    } else if (typeof data === 'object') {
      // Object with group keys
      const allValues = [];
      Object.values(data).forEach(group => {
        if (Array.isArray(group)) {
          allValues.push(...group);
        }
      });
      return allValues;
    }
    return [];
  }

  /**
   * Helper: Download code as file
   *
   * @param {string} code - Code content
   * @param {string} language - 'python' or 'r'
   */
  static downloadCodeFile(code, language) {
    const extension = language === 'python' ? 'py' : 'R';
    const filename = `transformation_code.${extension}`;

    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get transformation display name
   *
   * @param {string} transformationType - Internal type name
   * @returns {string} Display name
   */
  static getTransformationDisplayName(transformationType) {
    const names = {
      'log': 'Logarithmic Transformation',
      'sqrt': 'Square Root Transformation',
      'boxcox': 'Box-Cox Transformation',
      'inverse': 'Inverse Transformation',
      'rank': 'Rank Transformation (Normal Scores)'
    };
    return names[transformationType] || transformationType;
  }

  /**
   * Get transformation description
   *
   * @param {string} transformationType - Internal type name
   * @returns {string} Description
   */
  static getTransformationDescription(transformationType) {
    const descriptions = {
      'log': 'Best for right-skewed data. Compresses large values, useful for exponential growth patterns.',
      'sqrt': 'Best for count data or moderate right skewness. Stabilizes variance in Poisson-distributed data.',
      'boxcox': 'Optimal general-purpose transformation. Automatically finds best parameter (λ) for normality.',
      'inverse': 'Best for left-skewed data. Useful for time-to-event and hazard rate data.',
      'rank': 'Best for severe non-normality or outliers. Guarantees normality by mapping to standard normal quantiles.'
    };
    return descriptions[transformationType] || 'Data transformation to improve normality.';
  }
}

export default TransformationService;
