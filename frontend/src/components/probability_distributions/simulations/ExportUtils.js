/**
 * ExportUtils - Utilities for exporting D3.js visualizations
 * 
 * This module provides functions for exporting D3.js visualizations
 * as SVG and PNG files, with various export options and configurations.
 */

import { saveSvgAsPng } from 'save-svg-as-png';
import * as d3 from 'd3';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default options for SVG export
 */
const DEFAULT_SVG_OPTIONS = {
  includeStyles: true,
  excludeElements: '[data-no-export="true"]',
  beautify: true,
  indent: 2,
  filename: 'chart.svg'
};

/**
 * Default options for PNG export
 */
const DEFAULT_PNG_OPTIONS = {
  scale: 2,
  encoderOptions: 1,
  backgroundColor: '#ffffff',
  canvg: undefined,
  filename: 'chart.png'
};

/**
 * Prepare SVG for export by cleaning and optimizing
 * 
 * @param {SVGElement} svgElement - The SVG element to prepare
 * @param {Object} options - Options for preparation
 * @returns {SVGElement} Prepared SVG element clone
 */
const prepareSvgForExport = (svgElement, options = {}) => {
  const {
    includeStyles = true,
    excludeElements = DEFAULT_SVG_OPTIONS.excludeElements,
    copyAttributes = true,
    backgroundColor = null
  } = options;
  
  // Clone the SVG element to avoid modifying the original
  const clone = svgElement.cloneNode(true);
  
  // Add XML namespace if not present
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  
  // Add XML namespace for xlink if not present
  if (!clone.getAttribute('xmlns:xlink') && clone.querySelector('use')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }
  
  // Add random id to ensure uniqueness
  const randomId = `svg-export-${uuidv4().substring(0, 8)}`;
  clone.setAttribute('id', randomId);
  
  // Remove elements that should be excluded from export
  if (excludeElements) {
    const elementsToRemove = clone.querySelectorAll(excludeElements);
    elementsToRemove.forEach(el => el.remove());
  }
  
  // Add background color if specified
  if (backgroundColor) {
    clone.style.backgroundColor = backgroundColor;
  }
  
  // Include computed styles if requested
  if (includeStyles) {
    // Get all stylesheets
    const sheets = document.styleSheets;
    let stylesText = '';
    
    // Extract rules from stylesheets
    for (let i = 0; i < sheets.length; i++) {
      try {
        const rules = sheets[i].cssRules || sheets[i].rules;
        
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            stylesText += rules[j].cssText + '\n';
          }
        }
      } catch (e) {
        console.warn('Error accessing stylesheet rules:', e);
      }
    }
    
    // Add styles to a style element
    if (stylesText) {
      const styleElement = document.createElement('style');
      styleElement.type = 'text/css';
      styleElement.textContent = stylesText;
      clone.insertBefore(styleElement, clone.firstChild);
    }
    
    // Apply computed styles to elements
    const elements = clone.querySelectorAll('*');
    elements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      
      // Extract styles necessary for rendering
      const relevantStyles = [
        'fill', 'fill-opacity', 'fill-rule',
        'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray',
        'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
        'font-family', 'font-size', 'font-weight', 'font-style',
        'text-anchor', 'visibility', 'display', 'opacity'
      ];
      
      relevantStyles.forEach(style => {
        const value = computedStyle.getPropertyValue(style);
        if (value && value !== '') {
          el.style[style] = value;
        }
      });
    });
  }
  
  return clone;
};

/**
 * Convert SVG to XML string
 * 
 * @param {SVGElement} svgElement - The SVG element to convert
 * @param {Object} options - Options for conversion
 * @returns {string} SVG as XML string
 */
const svgToString = (svgElement, options = {}) => {
  const {
    beautify = DEFAULT_SVG_OPTIONS.beautify,
    indent = DEFAULT_SVG_OPTIONS.indent
  } = options;
  
  // Create serializer
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgElement);
  
  // Add XML declaration
  svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgString;
  
  // Beautify if requested
  if (beautify) {
    // Simple beautifier for XML
    const openTagRegex = /<([^\s>]+)([^>]*)>/g;
    const closeTagRegex = /<\/([^>]+)>/g;
    const selfClosingTagRegex = /<([^\s>]+)([^>]*?)\/>/g;
    
    let depth = 0;
    const indentString = ' '.repeat(indent);
    
    // Add indentation to open tags
    svgString = svgString.replace(openTagRegex, (match, tag, attrs) => {
      const indentation = indentString.repeat(depth);
      depth++;
      return `\n${indentation}<${tag}${attrs}>`;
    });
    
    // Add indentation to close tags
    svgString = svgString.replace(closeTagRegex, (match, tag) => {
      depth--;
      const indentation = indentString.repeat(depth);
      return `\n${indentation}</${tag}>`;
    });
    
    // Add indentation to self-closing tags
    svgString = svgString.replace(selfClosingTagRegex, (match, tag, attrs) => {
      const indentation = indentString.repeat(depth);
      return `\n${indentation}<${tag}${attrs}/>`;
    });
  }
  
  return svgString;
};

/**
 * Export SVG element as SVG file
 * 
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {Object} options - Export options
 */
export const exportSvg = (svgElement, options = {}) => {
  const opts = { ...DEFAULT_SVG_OPTIONS, ...options };
  
  // Prepare SVG for export
  const prepared = prepareSvgForExport(svgElement, opts);
  
  // Convert to string
  const svgString = svgToString(prepared, opts);
  
  // Create download link
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  // Create and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = opts.filename || 'chart.svg';
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return svgString;
};

/**
 * Export SVG element as PNG file
 * 
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {Object} options - Export options
 * @returns {Promise<void>} Promise that resolves when export is complete
 */
export const exportPng = async (svgElement, options = {}) => {
  const opts = { ...DEFAULT_PNG_OPTIONS, ...options };
  
  // Use save-svg-as-png library for PNG export
  try {
    await saveSvgAsPng(svgElement, opts.filename, {
      scale: opts.scale,
      encoderOptions: opts.encoderOptions,
      backgroundColor: opts.backgroundColor,
      canvg: opts.canvg,
      selectorRemap: opts.selectorRemap,
      modifyStyle: opts.modifyStyle,
      excludeElements: opts.excludeElements
    });
  } catch (error) {
    console.error('Error exporting PNG:', error);
    throw new Error(`Failed to export PNG: ${error.message}`);
  }
};

/**
 * Export D3 chart as SVG or PNG
 * 
 * @param {string|Element} selector - CSS selector or DOM element for the chart SVG
 * @param {string} format - Export format ('svg' or 'png')
 * @param {Object} options - Export options
 * @returns {Promise<void>} Promise that resolves when export is complete
 */
export const exportChart = async (selector, format = 'svg', options = {}) => {
  // Get SVG element
  let svgElement;
  
  if (typeof selector === 'string') {
    svgElement = document.querySelector(selector);
  } else if (selector instanceof Element) {
    svgElement = selector;
  } else {
    throw new Error('Invalid selector: must be a CSS selector string or DOM element');
  }
  
  if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
    throw new Error('No SVG element found for export');
  }
  
  // Set default filename if not provided
  if (!options.filename) {
    const defaultName = 'stickforstats_chart';
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
    options.filename = `${defaultName}_${timestamp}.${format}`;
  }
  
  // Export based on format
  if (format.toLowerCase() === 'svg') {
    return exportSvg(svgElement, options);
  } else if (format.toLowerCase() === 'png') {
    return exportPng(svgElement, options);
  } else {
    throw new Error(`Unsupported export format: ${format}`);
  }
};

/**
 * Fix SVG for export (addresses common issues with D3 SVGs)
 * 
 * @param {SVGElement} svgElement - The SVG element to fix
 */
export const fixSvgForExport = (svgElement) => {
  // Ensure SVG has explicit width and height
  const bbox = svgElement.getBBox();
  svgElement.setAttribute('width', bbox.width);
  svgElement.setAttribute('height', bbox.height);
  
  // Remove pointer-events attributes which can cause issues
  svgElement.querySelectorAll('[pointer-events]').forEach(el => {
    el.removeAttribute('pointer-events');
  });
  
  // Ensure text elements have proper attributes
  svgElement.querySelectorAll('text').forEach(el => {
    // Ensure text has explicit font attributes
    if (!el.style.fontFamily) {
      el.style.fontFamily = window.getComputedStyle(el).fontFamily;
    }
    if (!el.style.fontSize) {
      el.style.fontSize = window.getComputedStyle(el).fontSize;
    }
  });
  
  // Fix relative URLs in href attributes
  svgElement.querySelectorAll('[href]').forEach(el => {
    const href = el.getAttribute('href');
    if (href && href.startsWith('/')) {
      el.setAttribute('href', window.location.origin + href);
    }
  });
  
  // Fix relative URLs in xlink:href attributes
  svgElement.querySelectorAll('[*|href]').forEach(el => {
    const xlinkHref = el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (xlinkHref && xlinkHref.startsWith('/')) {
      el.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'href',
        window.location.origin + xlinkHref
      );
    }
  });
};

/**
 * Get export options for a specific chart type
 * 
 * @param {string} chartType - Type of chart
 * @param {Object} customOptions - Custom options to merge
 * @returns {Object} Export options
 */
export const getChartExportOptions = (chartType, customOptions = {}) => {
  // Base options
  const baseOptions = {
    scale: 2,
    backgroundColor: '#ffffff'
  };
  
  // Chart-specific options
  const chartOptions = {
    'probability-distribution': {
      filename: 'probability_distribution_chart',
      backgroundColor: '#ffffff',
      excludeElements: '.chart-controls, .export-controls, [data-no-export="true"]'
    },
    'box-plot': {
      filename: 'box_plot_chart',
      backgroundColor: '#ffffff',
      excludeElements: '.chart-controls, .export-controls, [data-no-export="true"]'
    },
    'scatter-plot': {
      filename: 'scatter_plot_chart',
      backgroundColor: '#ffffff',
      excludeElements: '.chart-controls, .export-controls, [data-no-export="true"]'
    },
    'bar-chart': {
      filename: 'bar_chart',
      backgroundColor: '#ffffff',
      excludeElements: '.chart-controls, .export-controls, [data-no-export="true"]'
    },
    'histogram': {
      filename: 'histogram_chart',
      backgroundColor: '#ffffff',
      excludeElements: '.chart-controls, .export-controls, [data-no-export="true"]'
    },
    'time-series': {
      filename: 'time_series_chart',
      backgroundColor: '#ffffff',
      excludeElements: '.chart-controls, .export-controls, [data-no-export="true"]'
    },
    'simulation': {
      filename: 'statistical_simulation',
      backgroundColor: '#ffffff',
      excludeElements: '.chart-controls, .export-controls, [data-no-export="true"]'
    }
  };
  
  // Get options for specific chart type, or use generic options
  const typeOptions = chartOptions[chartType] || { filename: 'statistical_chart' };
  
  // Merge all options, with custom options taking precedence
  return {
    ...baseOptions,
    ...typeOptions,
    ...customOptions
  };
};

/**
 * Create export buttons for a D3 chart
 * 
 * @param {Element} container - Container element to add buttons to
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {Object} options - Options for export buttons
 */
export const createExportButtons = (container, svgElement, options = {}) => {
  const {
    formats = ['svg', 'png'],
    chartType = 'generic',
    buttonClassName = 'export-button',
    containerClassName = 'export-controls',
    buttonStyle = {},
    labels = {
      svg: 'Export SVG',
      png: 'Export PNG'
    }
  } = options;
  
  // Create container for export buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = containerClassName;
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.margin = '8px 0';
  
  // Create buttons for each format
  formats.forEach(format => {
    const button = document.createElement('button');
    button.textContent = labels[format] || `Export ${format.toUpperCase()}`;
    button.className = buttonClassName;
    
    // Apply styles
    Object.assign(button.style, {
      padding: '6px 12px',
      cursor: 'pointer',
      backgroundColor: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '14px',
      ...buttonStyle
    });
    
    // Add click handler
    button.addEventListener('click', async () => {
      try {
        // Fix SVG for export
        fixSvgForExport(svgElement);
        
        // Get export options for chart type
        const exportOptions = getChartExportOptions(chartType);
        
        // Perform export
        await exportChart(svgElement, format, exportOptions);
      } catch (error) {
        console.error(`Error exporting as ${format}:`, error);
        alert(`Failed to export as ${format}: ${error.message}`);
      }
    });
    
    buttonContainer.appendChild(button);
  });
  
  // Add container to parent
  container.appendChild(buttonContainer);
};

/**
 * React component props for the ExportControls component - shown here for documentation
 * Actual PropTypes are defined in the ExportControls component
 */
export const exportControlsProps = {
  chartRef: 'object (required)',
  chartType: 'string',
  formats: 'array of strings',
  exportOptions: 'object',
  buttonStyle: 'object',
  className: 'string'
};

// Main export
export default {
  exportSvg,
  exportPng,
  exportChart,
  fixSvgForExport,
  getChartExportOptions,
  createExportButtons,
  DEFAULT_SVG_OPTIONS,
  DEFAULT_PNG_OPTIONS
};