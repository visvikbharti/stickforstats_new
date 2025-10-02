/**
 * d3Imports.js
 * 
 * This module provides fine-grained imports from D3.js library to optimize bundle size.
 * Instead of importing the entire D3 library, import only the specific functions you need from this module.
 */

// Core functionality
import { select, selectAll } from 'd3-selection';
import { scaleLinear, scaleBand, scaleOrdinal } from 'd3-scale';
import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { line, area, arc, pie, curveCatmullRom, curveLinear, curveBasis } from 'd3-shape';

// Format helpers
import { format } from 'd3-format';
import { timeFormat, timeParse } from 'd3-time-format';

// Data processing
import { min, max, extent, sum, mean, median, deviation, variance } from 'd3-array';

// Transitions and animations
import { transition } from 'd3-transition';
import { easeLinear, easeQuadIn, easeQuadOut, easeQuadInOut, easeCubic } from 'd3-ease';

// Color scales
import { interpolateRgb, interpolateHsl, interpolateLab, interpolateViridis, interpolateSpectral } from 'd3-scale-chromatic';

// Brush for interactive selections
import { brush, brushX, brushY } from 'd3-brush';

// Hierarchy for tree structures
import { hierarchy, treemap, tree } from 'd3-hierarchy';

// Force simulation for force-directed graphs
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';

// Export directly usable functions
export {
  // Selection
  select,
  selectAll,
  
  // Scales
  scaleLinear,
  scaleBand,
  scaleOrdinal,
  
  // Axes
  axisBottom,
  axisLeft,
  axisRight,
  axisTop,
  
  // Shapes
  line,
  area,
  arc,
  pie,
  curveCatmullRom,
  curveLinear,
  curveBasis,
  
  // Format
  format,
  timeFormat,
  timeParse,
  
  // Arrays
  min,
  max,
  extent,
  sum,
  mean,
  median,
  deviation,
  variance,
  
  // Transitions
  transition,
  easeLinear,
  easeQuadIn,
  easeQuadOut,
  easeQuadInOut,
  easeCubic,
  
  // Colors
  interpolateRgb,
  interpolateHsl,
  interpolateLab,
  interpolateViridis,
  interpolateSpectral,
  
  // Brush
  brush,
  brushX,
  brushY,
  
  // Hierarchy
  hierarchy,
  treemap,
  tree,
  
  // Force
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter
};

// Math utilities - commonly used in statistical visualizations
export const math = {
  // Helper functions from d3-array
  sum: sum,
  mean: mean,
  median: median,
  variance: variance,
  deviation: deviation,
  
  // Common mathematical operations not provided by D3
  calculateQuartiles: (data) => {
    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q2Index = Math.floor(sorted.length * 0.5);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    return {
      q1: sorted[q1Index],
      q2: sorted[q2Index],
      q3: sorted[q3Index]
    };
  },
  
  // Common statistical distributions
  normalPdf: (x, mean = 0, std = 1) => {
    const a = 1 / (std * Math.sqrt(2 * Math.PI));
    const b = Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
    return a * b;
  },
  
  // Common statistical functions
  // Calculate cumulative distribution function for normal distribution
  normalCdf: (x, mean = 0, std = 1) => {
    // Using error function approximation
    const z = (x - mean) / (std * Math.sqrt(2));
    return 0.5 * (1 + erf(z));
  }
};

// Error function approximation for normal CDF
function erf(x) {
  // Constants
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  // Save the sign of x
  const sign = (x < 0) ? -1 : 1;
  x = Math.abs(x);

  // A&S formula 7.1.26
  const t = 1.0/(1.0 + p*x);
  const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);

  return sign*y;
}

// Common visualization components
export const components = {
  // Create a histogram from data with configurable bins
  createHistogram: (data, binCount = 30) => {
    if (!data || data.length === 0) return { labels: [], data: [] };
    
    // Find min and max values
    const minValue = min(data);
    const maxValue = max(data);
    
    // Add a small padding to avoid outliers at the boundaries
    const range = maxValue - minValue;
    const paddedMin = minValue - range * 0.05;
    const paddedMax = maxValue + range * 0.05;
    
    // Create bins
    const binWidth = (paddedMax - paddedMin) / binCount;
    const bins = Array(binCount).fill(0);
    
    // Count values in each bin
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - paddedMin) / binWidth), binCount - 1);
      if (binIndex >= 0) bins[binIndex]++;
    });
    
    // Create bin labels (center of each bin)
    const labels = Array.from({ length: binCount }, (_, i) => paddedMin + (i + 0.5) * binWidth);
    
    // Normalize bins to create a probability density
    const normalizationFactor = data.length * binWidth;
    const normalizedBins = bins.map(count => count / normalizationFactor);
    
    return { labels, data: normalizedBins };
  },
  
  // Add axis with improved styling
  createStyledAxis: (svg, scale, orientation, options = {}) => {
    const {
      position = { x: 0, y: 0 },
      tickSize = 6,
      tickPadding = 3,
      tickFormat = null,
      label = '',
      labelOffset = 30,
      fontSize = 10,
      fontColor = '#546E7A',
      axisOpacity = 0.5
    } = options;
    
    // Create axis generator
    let axis;
    switch (orientation) {
      case 'bottom':
        axis = axisBottom(scale);
        break;
      case 'left':
        axis = axisLeft(scale);
        break;
      case 'right':
        axis = axisRight(scale);
        break;
      case 'top':
        axis = axisTop(scale);
        break;
      default:
        axis = axisBottom(scale);
    }
    
    // Configure axis
    if (tickFormat) axis.tickFormat(tickFormat);
    axis.tickSize(tickSize)
        .tickPadding(tickPadding);
    
    // Create and style axis
    const axisGroup = svg.append('g')
      .attr('class', `${orientation}-axis`)
      .attr('transform', `translate(${position.x},${position.y})`)
      .call(axis)
      .call(g => g.select('.domain').attr('stroke-opacity', axisOpacity))
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', axisOpacity))
      .call(g => g.selectAll('.tick text')
        .attr('font-size', fontSize)
        .attr('fill', fontColor));
    
    // Add axis label if provided
    if (label) {
      const labelElement = axisGroup.append('text')
        .attr('fill', fontColor)
        .attr('font-size', fontSize * 1.2)
        .attr('font-weight', 'bold')
        .text(label);
      
      // Position the label based on orientation
      switch (orientation) {
        case 'bottom':
          labelElement
            .attr('x', position.x)
            .attr('y', labelOffset)
            .attr('text-anchor', 'middle');
          break;
        case 'left':
          labelElement
            .attr('transform', 'rotate(-90)')
            .attr('y', -labelOffset)
            .attr('x', 0)
            .attr('text-anchor', 'middle');
          break;
        case 'right':
          labelElement
            .attr('transform', 'rotate(90)')
            .attr('y', -labelOffset)
            .attr('x', 0)
            .attr('text-anchor', 'middle');
          break;
        case 'top':
          labelElement
            .attr('x', position.x)
            .attr('y', -labelOffset)
            .attr('text-anchor', 'middle');
          break;
      }
    }
    
    return axisGroup;
  },
  
  // Add grid lines with improved styling
  createGrid: (svg, xScale, yScale, width, height, options = {}) => {
    const {
      xTickSize = height,
      yTickSize = width,
      strokeDasharray = '2,4',
      opacity = 0.15
    } = options;
    
    // Create grids
    const xGrid = svg.append('g')
      .attr('class', 'grid x-grid')
      .style('stroke-dasharray', strokeDasharray)
      .style('opacity', opacity)
      .call(
        axisBottom(xScale)
          .tickSize(-xTickSize)
          .tickFormat('')
      );
    
    const yGrid = svg.append('g')
      .attr('class', 'grid y-grid')
      .style('stroke-dasharray', strokeDasharray)
      .style('opacity', opacity)
      .call(
        axisLeft(yScale)
          .tickSize(-yTickSize)
          .tickFormat('')
      );
    
    return { xGrid, yGrid };
  },
  
  // Create gradient for fills
  createGradient: (svg, id, options = {}) => {
    const {
      direction = 'vertical', // 'vertical' or 'horizontal'
      colors = [
        { offset: '0%', color: 'rgba(54, 162, 235, 0.2)', opacity: 0.2 },
        { offset: '100%', color: 'rgba(54, 162, 235, 0.8)', opacity: 0.8 }
      ]
    } = options;
    
    // Create gradient element
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', id)
      .attr('gradientUnits', 'userSpaceOnUse');
    
    // Set gradient direction
    if (direction === 'vertical') {
      gradient
        .attr('x1', 0).attr('y1', '100%')
        .attr('x2', 0).attr('y2', '0%');
    } else {
      gradient
        .attr('x1', '0%').attr('y1', 0)
        .attr('x2', '100%').attr('y2', 0);
    }
    
    // Add color stops
    colors.forEach(({ offset, color, opacity = 1 }) => {
      gradient.append('stop')
        .attr('offset', offset)
        .attr('stop-color', color)
        .attr('stop-opacity', opacity);
    });
    
    return gradient;
  }
};

// Re-export for convenience when all of D3 is needed
export const d3 = {
  select,
  selectAll,
  scaleLinear,
  scaleBand,
  scaleOrdinal,
  axisBottom,
  axisLeft,
  axisRight,
  axisTop,
  line,
  area,
  arc,
  pie,
  curveCatmullRom,
  curveLinear,
  curveBasis,
  format,
  timeFormat,
  timeParse,
  min,
  max,
  extent,
  sum,
  mean,
  median,
  deviation,
  variance,
  transition,
  easeLinear,
  easeQuadIn,
  easeQuadOut,
  easeQuadInOut,
  easeCubic,
  interpolateRgb,
  interpolateHsl,
  interpolateLab,
  interpolateViridis,
  interpolateSpectral,
  brush,
  brushX,
  brushY,
  hierarchy,
  treemap,
  tree,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  ...math
};