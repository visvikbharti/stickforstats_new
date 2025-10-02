import { useState, useCallback } from 'react';
import reportService from '../services/reportService';

/**
 * Custom hook for Report API integration
 * 
 * Provides functions for generating and downloading reports
 * 
 * @returns {Object} API functions and state
 */
export const useReportAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  
  /**
   * Generate a report from analyses
   * 
   * @param {Object} params - Report parameters
   * @returns {Promise<Object>} Generated report metadata
   */
  const generateReport = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await reportService.generateReport({
        title: params.title || 'Analysis Report',
        description: params.description || '',
        analyses: params.analyses || [],
        format: params.format || 'pdf',
        include_visualizations: params.includeVisualizations ?? true,
        include_raw_data: params.includeRawData ?? false
      });
      
      setCurrentReport(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Download a generated report
   * 
   * @param {string} reportId - Report ID to download
   * @returns {Promise<boolean>} Success status
   */
  const downloadReport = useCallback(async (reportId) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await reportService.downloadReport(reportId);
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = data.headers?.['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `report_${reportId}.pdf`;
      
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
   * Get a list of generated reports
   * 
   * @returns {Promise<Array>} List of reports
   */
  const getReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await reportService.getReports();
      // Check if data is an object with results property (API format) or a direct array
      const reportsArray = data && data.results ? data.results : 
                           Array.isArray(data) ? data : [];
      setReports(reportsArray);
      return reportsArray;
    } catch (err) {
      setError(err.message);
      // Set reports to empty array on error to prevent filter errors
      setReports([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Get report details by ID
   * 
   * @param {string} reportId - Report ID
   * @returns {Promise<Object>} Report details
   */
  const getReportDetails = useCallback(async (reportId) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await reportService.getReportDetails(reportId);
      setCurrentReport(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    // API methods
    generateReport,
    downloadReport,
    getReports,
    getReportDetails,
    
    // State
    loading,
    error,
    reports,
    currentReport,
  };
};

export default useReportAPI;