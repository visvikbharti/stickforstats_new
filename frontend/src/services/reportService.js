// Report Service - API service for report generation and management
import axios from 'axios';
import apiConfig from '../config/apiConfig';

const reportService = {
  // Generate a new report from analysis data
  generateReport: async (reportParams) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/reports/generate/`,
        reportParams,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  // Get list of available reports
  getReports: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.format) params.append('format', filters.format);
      if (filters.created_after) params.append('created_after', filters.created_after);
      if (filters.created_before) params.append('created_before', filters.created_before);
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get(
        `${apiConfig.baseURL}/reports/?${params.toString()}`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  // Get report details by ID
  getReportDetails: async (reportId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/reports/${reportId}/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching report details:', error);
      throw error;
    }
  },

  // Download a generated report
  downloadReport: async (reportId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/reports/${reportId}/download/`,
        {
          ...apiConfig,
          responseType: 'blob', // Important for file downloads
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },

  // Update report metadata
  updateReport: async (reportId, updateData) => {
    try {
      const response = await axios.patch(
        `${apiConfig.baseURL}/reports/${reportId}/`,
        updateData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  },

  // Delete a report
  deleteReport: async (reportId) => {
    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/reports/${reportId}/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Get available report templates
  getReportTemplates: async () => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/reports/templates/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching report templates:', error);
      throw error;
    }
  },

  // Create custom report template
  createReportTemplate: async (templateData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/reports/templates/`,
        templateData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error creating report template:', error);
      throw error;
    }
  },

  // Generate report from template
  generateReportFromTemplate: async (templateId, reportData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/reports/templates/${templateId}/generate/`,
        reportData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error generating report from template:', error);
      throw error;
    }
  },

  // Schedule report generation
  scheduleReport: async (scheduleData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/reports/schedule/`,
        scheduleData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  },

  // Get scheduled reports
  getScheduledReports: async () => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/reports/scheduled/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      throw error;
    }
  },

  // Update scheduled report
  updateScheduledReport: async (scheduleId, updateData) => {
    try {
      const response = await axios.patch(
        `${apiConfig.baseURL}/reports/scheduled/${scheduleId}/`,
        updateData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error updating scheduled report:', error);
      throw error;
    }
  },

  // Cancel scheduled report
  cancelScheduledReport: async (scheduleId) => {
    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/reports/scheduled/${scheduleId}/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error cancelling scheduled report:', error);
      throw error;
    }
  },

  // Export report in different formats
  exportReport: async (reportId, format = 'pdf') => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/reports/${reportId}/export/`,
        { format },
        {
          ...apiConfig,
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  },

  // Share report with users/groups
  shareReport: async (reportId, shareData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/reports/${reportId}/share/`,
        shareData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error sharing report:', error);
      throw error;
    }
  },

  // Get report sharing details
  getReportSharing: async (reportId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/reports/${reportId}/sharing/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching report sharing details:', error);
      throw error;
    }
  },

  // Get report generation status
  getReportStatus: async (reportId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/reports/${reportId}/status/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching report status:', error);
      throw error;
    }
  },

  // Cancel report generation
  cancelReportGeneration: async (reportId) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/reports/${reportId}/cancel/`,
        {},
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error cancelling report generation:', error);
      throw error;
    }
  },

  // Get report usage analytics
  getReportAnalytics: async (timeRange = '30d') => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/reports/analytics/?time_range=${timeRange}`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching report analytics:', error);
      throw error;
    }
  }
};

// Named exports for backward compatibility
export const generateReport = reportService.generateReport;
export const getReports = reportService.getReports;
export const downloadReport = reportService.downloadReport;
export const getReportDetails = reportService.getReportDetails;
export const deleteReport = reportService.deleteReport;
export const updateReport = reportService.updateReport;

// Additional utility functions
export const createReportFromAnalysis = async (analysisData, reportOptions = {}) => {
  try {
    const reportData = {
      title: reportOptions.title || `Analysis Report - ${new Date().toLocaleDateString()}`,
      description: reportOptions.description || 'Generated analysis report',
      analyses: [analysisData],
      format: reportOptions.format || 'pdf',
      include_visualizations: reportOptions.includeVisualizations ?? true,
      include_raw_data: reportOptions.includeRawData ?? false,
      template_id: reportOptions.templateId,
      ...reportOptions
    };

    const response = await reportService.generateReport(reportData);
    return response;
  } catch (error) {
    console.error('Error creating report from analysis:', error);
    throw error;
  }
};

export const bulkExportReports = async (reportIds, format = 'pdf') => {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}/reports/bulk-export/`,
      { report_ids: reportIds, format },
      {
        ...apiConfig,
        responseType: 'blob',
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error bulk exporting reports:', error);
    throw error;
  }
};

export const validateReportData = (reportData) => {
  const errors = [];
  
  if (!reportData.title || reportData.title.trim() === '') {
    errors.push('Report title is required');
  }
  
  if (!reportData.analyses || !Array.isArray(reportData.analyses) || reportData.analyses.length === 0) {
    errors.push('At least one analysis is required');
  }
  
  if (reportData.format && !['pdf', 'docx', 'html', 'xlsx'].includes(reportData.format)) {
    errors.push('Invalid report format. Supported formats: pdf, docx, html, xlsx');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default reportService;