import { useState, useCallback } from 'react';
import axios from 'axios';

// Check if in demo mode
const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true' || process.env.REACT_APP_DISABLE_API === 'true';

// Create an Axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock data for demo mode
const generateMockControlChart = (chartType, dataSize = 100) => {
  const centerLine = 50;
  const ucl = centerLine + 3 * 5; // 3 sigma
  const lcl = centerLine - 3 * 5;
  
  const data = Array.from({length: dataSize}, (_, i) => {
    const value = centerLine + (Math.random() - 0.5) * 10;
    const outOfControl = Math.random() < 0.05; // 5% out of control
    
    return {
      sample_number: i + 1,
      value: outOfControl ? (Math.random() > 0.5 ? ucl + 2 : lcl - 2) : value,
      subgroup_mean: value,
      subgroup_range: Math.random() * 5,
      moving_range: i > 0 ? Math.abs(value - centerLine) : 0,
      out_of_control: outOfControl,
      violated_rules: outOfControl ? ['Rule 1: Point beyond control limits'] : []
    };
  });
  
  return {
    chart_type: chartType,
    center_line: centerLine,
    upper_control_limit: ucl,
    lower_control_limit: lcl,
    data: data,
    statistics: {
      mean: centerLine,
      std_dev: 5,
      cp: 1.33,
      cpk: 1.25,
      pp: 1.28,
      ppk: 1.20,
      out_of_control_points: data.filter(d => d.out_of_control).length,
      total_points: dataSize
    },
    process_capability: {
      cp: 1.33,
      cpk: 1.25,
      pp: 1.28,
      ppk: 1.20,
      sigma_level: 3.98,
      dpmo: 6210,
      within_spec_percentage: 99.38
    }
  };
};

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Custom hook for SQC Analysis API integration
 * 
 * Provides functions for interacting with the SQC Analysis API endpoints
 * 
 * @returns {Object} API functions and state
 */
export const useSQCAnalysisAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Upload a dataset to the server
   * 
   * @param {Object} dataset Dataset object with file and metadata
   * @returns {Promise<Object>} Uploaded dataset info
   */
  const uploadDataset = useCallback(async (dataset) => {
    setIsLoading(true);
    setError(null);
    
    if (isDemoMode) {
      // Simulate dataset upload in demo mode
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockDataset = {
        id: `demo-dataset-${Date.now()}`,
        name: dataset.name || 'Demo SQC Dataset',
        description: dataset.description || 'Statistical Quality Control demo data',
        rows: 100,
        columns: ['Sample_ID', 'Measurement', 'Subgroup', 'Operator'],
        created_at: new Date().toISOString(),
        preview: Array.from({length: 5}, (_, i) => ({
          Sample_ID: i + 1,
          Measurement: 50 + (Math.random() - 0.5) * 10,
          Subgroup: Math.floor(i / 5) + 1,
          Operator: ['A', 'B', 'C'][i % 3]
        }))
      };
      
      setIsLoading(false);
      return mockDataset;
    }
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', dataset.file);
      formData.append('name', dataset.name);
      formData.append('description', dataset.description || '');
      formData.append('file_type', dataset.fileType);
      formData.append('has_header', dataset.hasHeader);
      formData.append('delimiter', dataset.delimiter);
      
      // Send request
      const response = await api.post('/core/datasets/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Create a new analysis session
   * 
   * @param {Object} params Session parameters
   * @returns {Promise<Object>} Created session info
   */
  const createAnalysisSession = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    if (isDemoMode) {
      // Simulate session creation in demo mode
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockSession = {
        id: `demo-session-${Date.now()}`,
        dataset_id: params.datasetId,
        name: params.name || 'Demo SQC Analysis',
        description: params.description || '',
        module: params.module || 'sqc',
        configuration: params.configuration || {},
        created_at: new Date().toISOString(),
        status: 'active'
      };
      
      setIsLoading(false);
      return mockSession;
    }
    
    try {
      const response = await api.post('/core/analysis-sessions/', {
        dataset_id: params.datasetId,
        name: params.name,
        description: params.description || '',
        module: params.module,
        configuration: params.configuration || {}
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Run a control chart analysis
   * 
   * @param {Object} params Analysis parameters
   * @returns {Promise<Object>} Analysis result
   */
  const runControlChartAnalysis = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    if (isDemoMode) {
      // Simulate control chart analysis in demo mode
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult = {
        id: `demo-analysis-${Date.now()}`,
        session_id: params.sessionId,
        chart_type: params.chartType,
        ...generateMockControlChart(params.chartType),
        recommendations: [
          {
            type: 'warning',
            title: 'Process Variability',
            description: 'The process shows signs of increased variability. Consider investigating potential causes.',
            action: 'Review recent process changes'
          },
          {
            type: 'info',
            title: 'Process Capability',
            description: 'Process capability indices indicate the process is capable but could be improved.',
            action: 'Consider process optimization'
          }
        ]
      };
      
      setIsLoading(false);
      return mockResult;
    }
    
    try {
      const response = await api.post('/sqc/control-charts/', {
        session_id: params.sessionId,
        chart_type: params.chartType,
        parameter_column: params.parameterColumn,
        grouping_column: params.groupingColumn,
        time_column: params.timeColumn,
        sample_size: params.sampleSize,
        detect_rules: params.detectRules,
        rule_set: params.ruleSet,
        custom_control_limits: params.useCustomLimits ? {
          x_ucl: params.upperControlLimit,
          x_lcl: params.lowerControlLimit,
          x_cl: params.centerLine
        } : null
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Run a process capability analysis
   * 
   * @param {Object} params Analysis parameters
   * @returns {Promise<Object>} Analysis result
   */
  const runProcessCapabilityAnalysis = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/sqc/process-capability/', {
        session_id: params.sessionId,
        parameter_column: params.parameterColumn,
        grouping_column: params.groupingColumn,
        lower_spec_limit: params.lowerSpecLimit,
        upper_spec_limit: params.upperSpecLimit,
        target_value: params.targetValue,
        assume_normality: params.assumeNormality,
        transformation_method: params.transformationMethod
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Create an acceptance sampling plan
   * 
   * @param {Object} params Sampling plan parameters
   * @returns {Promise<Object>} Sampling plan result
   */
  const createAcceptanceSamplingPlan = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/sqc/acceptance-sampling/', {
        plan_type: params.planType,
        lot_size: params.lotSize,
        aql: params.aql,
        ltpd: params.ltpd,
        producer_risk: params.producerRisk,
        consumer_risk: params.consumerRisk,
        inspection_level: params.inspectionLevel,
        frequency_index: params.frequencyIndex,
        clearing_interval: params.clearingInterval,
        sampling_fraction: params.samplingFraction,
        session_name: params.sessionName
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Perform a measurement system analysis
   * 
   * @param {Object} params MSA parameters
   * @returns {Promise<Object>} MSA result
   */
  const performMSA = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/sqc/msa/', {
        dataset_id: params.datasetId,
        msa_type: params.msaType,
        parameter_column: params.parameterColumn,
        part_column: params.partColumn,
        operator_column: params.operatorColumn,
        reference_column: params.referenceColumn,
        time_column: params.timeColumn,
        method: params.method,
        attribute_type: params.attributeType,
        session_name: params.sessionName
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Calculate economic design parameters for control charts
   * 
   * @param {Object} params Economic design parameters
   * @returns {Promise<Object>} Economic design result
   */
  const calculateEconomicDesign = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/sqc/economic-design/', {
        chart_type: params.chartType,
        mean_time_to_failure: params.meanTimeToFailure,
        shift_size: params.shiftSize,
        std_dev: params.stdDev,
        hourly_production: params.hourlyProduction,
        sampling_cost: params.samplingCost,
        fixed_sampling_cost: params.fixedSamplingCost,
        false_alarm_cost: params.falseAlarmCost,
        hourly_defect_cost: params.hourlyDefectCost,
        finding_cost: params.findingCost,
        min_sample_size: params.minSampleSize,
        max_sample_size: params.maxSampleSize,
        min_sampling_interval: params.minSamplingInterval,
        max_sampling_interval: params.maxSamplingInterval,
        min_detection_power: params.minDetectionPower,
        max_false_alarm_rate: params.maxFalseAlarmRate,
        session_name: params.sessionName
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Compare economic design alternatives
   * 
   * @param {Object} params Comparison parameters and alternatives
   * @returns {Promise<Object>} Comparison results
   */
  const compareEconomicDesignAlternatives = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/sqc/economic-design/compare-alternatives/', {
        process_parameters: params.processParameters,
        cost_parameters: params.costParameters,
        alternatives: params.alternatives
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Calculate cost of quality metrics
   * 
   * @param {Object} params Cost of quality parameters
   * @returns {Promise<Object>} Cost of quality analysis
   */
  const calculateCostOfQuality = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/sqc/economic-design/cost-of-quality/', params);
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Calculate ROI for SPC implementation
   * 
   * @param {Object} params ROI calculation parameters
   * @returns {Promise<Object>} ROI analysis
   */
  const calculateSPCROI = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/sqc/economic-design/calculate-roi/', {
        initial_investment: params.initialInvestment,
        monthly_costs: params.monthlyCosts,
        monthly_benefits: params.monthlyBenefits,
        time_horizon: params.timeHorizon
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Create an SPC implementation plan
   * 
   * @param {Object} params Implementation plan parameters
   * @returns {Promise<Object>} Implementation plan
   */
  const createSPCImplementationPlan = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/sqc/spc-implementation/', {
        plan_type: params.planType,
        industry: params.industry,
        organization_size: params.organizationSize,
        implementation_scope: params.implementationScope,
        existing_quality_system: params.existingQualitySystem,
        process_complexity: params.processComplexity,
        focus_area: params.focusArea,
        control_plan_items: params.controlPlanItems,
        assessment_responses: params.assessmentResponses,
        session_name: params.sessionName
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Get industry-specific recommendations for SPC implementation
   * 
   * @param {string} industry Industry name
   * @returns {Promise<Object>} Industry recommendations
   */
  const getIndustryRecommendations = useCallback(async (industry) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/sqc/spc-implementation/industry-recommendations/?industry=${industry}`);
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Get an analysis result by ID
   * 
   * @param {string} id Analysis ID
   * @returns {Promise<Object>} Analysis result
   */
  const getAnalysisResult = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/sqc/control-charts/${id}/`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Get recommendations based on analysis result
   * 
   * @param {string} id Analysis ID
   * @returns {Promise<Array>} List of recommendations
   */
  const getRecommendations = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/sqc/control-charts/${id}/recommendations/`);
      return response.data.recommendations || [];
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Get educational content related to analysis type or resource
   * 
   * @param {string} resourceId Resource ID or analysis type
   * @returns {Promise<Object>} Educational content
   */
  const getEducationalContent = useCallback(async (resourceId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/education/content/${resourceId}/`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      // Return default content for demo
      return {
        title: "Control Chart Theory",
        type: "theory",
        theory: `
# Control Chart Theory

Control charts, also known as Shewhart charts, are tools used to determine if a manufacturing or business process is in a state of statistical control.

## Key Concepts

A process is said to be in **statistical control** when it only exhibits **common cause variation** - the natural, expected variation inherent to the process.

When a process exhibits **special cause variation** - variation from external factors not inherent to the process - it is said to be out of control.

Control charts help distinguish between these two types of variation by establishing:

- A **center line** (CL) representing the process average
- **Upper control limit** (UCL) at 3 standard deviations above the center line
- **Lower control limit** (LCL) at 3 standard deviations below the center line

When points fall outside these control limits or exhibit non-random patterns, the process may be affected by special causes that should be investigated.`,
        formulas: [
          { 
            name: "X-bar Chart Control Limits", 
            formula: "\\begin{align} UCL_{\\bar{x}} &= \\bar{\\bar{x}} + A_2\\bar{R} \\\\ CL_{\\bar{x}} &= \\bar{\\bar{x}} \\\\ LCL_{\\bar{x}} &= \\bar{\\bar{x}} - A_2\\bar{R} \\end{align}"
          },
          {
            name: "R Chart Control Limits",
            formula: "\\begin{align} UCL_R &= D_4\\bar{R} \\\\ CL_R &= \\bar{R} \\\\ LCL_R &= D_3\\bar{R} \\end{align}"
          }
        ]
      };
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    // Original methods
    uploadDataset,
    createAnalysisSession,
    runControlChartAnalysis,
    getAnalysisResult,
    getRecommendations,
    getEducationalContent,
    
    // New methods for SQC module
    runProcessCapabilityAnalysis,
    createAcceptanceSamplingPlan,
    performMSA,
    calculateEconomicDesign,
    compareEconomicDesignAlternatives,
    calculateCostOfQuality,
    calculateSPCROI,
    createSPCImplementationPlan,
    getIndustryRecommendations,
    
    // State
    isLoading,
    error
  };
};

export default useSQCAnalysisAPI;