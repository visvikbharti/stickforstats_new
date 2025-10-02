/**
 * Visualization Service
 * =====================
 * Service for handling all visualization-related API calls and data processing
 */

import axios from 'axios';
import Decimal from 'decimal.js';
import * as Plotly from 'plotly.js-dist';

class VisualizationService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
    this.token = localStorage.getItem('authToken');
    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create visualization from data
   */
  async createVisualization({ type, data, testResults, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/create/`,
        {
          plot_type: type,
          data: this.prepareDataForBackend(data),
          test_results: testResults,
          options: {
            ...options,
            format: 'plotly'
          }
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      console.error('Visualization creation failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create 3D scatter plot
   */
  async create3DScatter({ data, xCol, yCol, zCol, colorCol, sizeCol, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/3d-scatter/`,
        {
          data: this.prepareDataForBackend(data),
          x_column: xCol,
          y_column: yCol,
          z_column: zCol,
          color_column: colorCol,
          size_column: sizeCol,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create animated time series
   */
  async createAnimatedTimeSeries({ data, timeCol, valueColumns, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/animated-timeseries/`,
        {
          data: this.prepareDataForBackend(data),
          time_column: timeCol,
          value_columns: valueColumns,
          options: {
            show_forecast: options.showForecast || false,
            confidence_bands: options.confidenceBands || null,
            ...options
          }
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create statistical dashboard
   */
  async createStatisticalDashboard({ testResults, data, layout = '2x2', options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/dashboard/`,
        {
          test_results: testResults,
          data: this.prepareDataForBackend(data),
          layout,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create heatmap with clustering
   */
  async createClusteredHeatmap({ data, labels, method = 'ward', metric = 'euclidean', options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/heatmap-clustered/`,
        {
          data: this.prepareDataForBackend(data),
          labels,
          clustering_method: method,
          distance_metric: metric,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create volcano plot
   */
  async createVolcanoPlot({ foldChanges, pValues, geneNames, thresholds = {}, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/volcano/`,
        {
          fold_changes: foldChanges,
          p_values: pValues,
          gene_names: geneNames,
          significance_threshold: thresholds.pValue || 0.05,
          fold_change_threshold: thresholds.foldChange || 1.0,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create parallel coordinates plot
   */
  async createParallelCoordinates({ data, colorColumn, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/parallel-coordinates/`,
        {
          data: this.prepareDataForBackend(data),
          color_column: colorColumn,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create network graph
   */
  async createNetworkGraph({ edges, weights, nodeAttributes, layoutType = 'spring', options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/network/`,
        {
          edges,
          weights,
          node_attributes: nodeAttributes,
          layout_type: layoutType,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create sankey diagram
   */
  async createSankeyDiagram({ source, target, values, labels, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/sankey/`,
        {
          source,
          target,
          values,
          labels,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create radar chart
   */
  async createRadarChart({ data, categories, groups, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/radar/`,
        {
          data: this.prepareDataForBackend(data),
          categories,
          groups,
          options: {
            fill: options.fill !== false,
            ...options
          }
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create sunburst chart
   */
  async createSunburstChart({ labels, parents, values, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/sunburst/`,
        {
          labels,
          parents,
          values,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create time series decomposition
   */
  async createTimeSeriesDecomposition({ data, period, model = 'additive', options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/timeseries-decomposition/`,
        {
          data: this.prepareDataForBackend(data),
          period,
          model,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create correlation network
   */
  async createCorrelationNetwork({ correlationMatrix, labels, threshold = 0.3, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/correlation-network/`,
        {
          correlation_matrix: correlationMatrix,
          labels,
          threshold,
          options
        },
        { headers: this.headers }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Export visualization
   */
  async exportVisualization({ plotData, plotLayout, format, options = {} }) {
    try {
      // For client-side export
      if (format === 'png' || format === 'svg' || format === 'pdf') {
        return await this.exportPlotlyLocal(plotData, plotLayout, format, options);
      }

      // For server-side export
      const response = await axios.post(
        `${this.baseURL}/visualization/export/`,
        {
          plot_data: plotData,
          plot_layout: plotLayout,
          format,
          options
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Share visualization
   */
  async shareVisualization({ plotData, plotLayout, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/share/`,
        {
          plot_data: plotData,
          plot_layout: plotLayout,
          options: {
            expiry: options.expiry || '7d',
            password: options.password || null,
            ...options
          }
        },
        { headers: this.headers }
      );

      return response.data.share_url;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get shared visualization
   */
  async getSharedVisualization(shareId, password = null) {
    try {
      const response = await axios.get(
        `${this.baseURL}/visualization/shared/${shareId}/`,
        {
          params: { password },
          headers: this.headers
        }
      );

      return this.processVisualizationResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate publication-ready figure
   */
  async createPublicationFigure({ plotData, plotLayout, options = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/publication/`,
        {
          plot_data: plotData,
          plot_layout: plotLayout,
          width_inches: options.widthInches || 6.5,
          height_inches: options.heightInches || 4.5,
          dpi: options.dpi || 300,
          font_family: options.fontFamily || 'Arial',
          font_size: options.fontSize || 10,
          export_format: options.format || 'svg'
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create real-time dashboard
   */
  createRealTimeDashboard({ dataSource, updateInterval = 1000, plots = [] }) {
    const ws = new WebSocket(`${this.baseURL.replace('http', 'ws')}/visualization/realtime/`);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        token: this.token,
        data_source: dataSource,
        update_interval: updateInterval,
        plots
      }));
    };

    return {
      socket: ws,
      onData: (callback) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          callback(this.processVisualizationResponse(data));
        };
      },
      onError: (callback) => {
        ws.onerror = callback;
      },
      close: () => {
        ws.close();
      }
    };
  }

  /**
   * Batch create visualizations
   */
  async batchCreateVisualizations(visualizations) {
    try {
      const response = await axios.post(
        `${this.baseURL}/visualization/batch/`,
        {
          visualizations: visualizations.map(viz => ({
            ...viz,
            data: this.prepareDataForBackend(viz.data)
          }))
        },
        { headers: this.headers }
      );

      return response.data.results.map(result =>
        this.processVisualizationResponse(result)
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Helper methods

  /**
   * Prepare data for backend
   */
  prepareDataForBackend(data) {
    if (!data) return null;

    // Handle DataFrame-like objects
    if (data.columns && data.values) {
      return {
        columns: data.columns,
        values: data.values,
        index: data.index || null
      };
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data;
    }

    // Handle objects
    return data;
  }

  /**
   * Process visualization response
   */
  processVisualizationResponse(response) {
    // Process high-precision numbers
    if (response.precision_data) {
      response.data = this.processHighPrecisionData(response.data, response.precision_data);
    }

    // Ensure proper format
    return {
      data: response.data || [],
      layout: response.layout || {},
      config: response.config || {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        toImageButtonOptions: {
          format: 'svg',
          filename: 'plot',
          height: 600,
          width: 800,
          scale: 1
        }
      },
      metadata: response.metadata || {}
    };
  }

  /**
   * Process high-precision data
   */
  processHighPrecisionData(data, precisionData) {
    return data.map((trace, idx) => {
      const precision = precisionData[idx];
      if (!precision) return trace;

      // Convert string numbers to Decimal for precision
      if (precision.x) {
        trace.x = trace.x.map(val =>
          typeof val === 'string' ? new Decimal(val).toNumber() : val
        );
      }
      if (precision.y) {
        trace.y = trace.y.map(val =>
          typeof val === 'string' ? new Decimal(val).toNumber() : val
        );
      }
      if (precision.z) {
        trace.z = trace.z.map(val =>
          typeof val === 'string' ? new Decimal(val).toNumber() : val
        );
      }

      return trace;
    });
  }

  /**
   * Export Plotly figure locally
   */
  async exportPlotlyLocal(data, layout, format, options = {}) {
    const tempDiv = document.createElement('div');
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);

    await Plotly.newPlot(tempDiv, data, layout);

    const result = await Plotly.toImage(tempDiv, {
      format: format,
      width: options.width || 800,
      height: options.height || 600,
      scale: options.scale || 2
    });

    document.body.removeChild(tempDiv);

    return {
      format,
      content: result,
      filename: `visualization.${format}`
    };
  }

  /**
   * Handle errors
   */
  handleError(error) {
    if (error.response) {
      // Server error
      const message = error.response.data.message || error.response.data.error || 'Server error';
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other error
      return error;
    }
  }

  /**
   * Update authentication token
   */
  updateToken(token) {
    this.token = token;
    this.headers.Authorization = `Bearer ${token}`;
  }
}

// Create singleton instance
const visualizationService = new VisualizationService();

export default visualizationService;