/**
 * D3Optimizer - Performance optimization utilities for D3.js visualizations
 * 
 * This module provides utilities for optimizing D3.js visualizations in React
 * components, focusing on performance, responsiveness, and resource management.
 */

/**
 * Debounce function for controlling high-frequency events
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to call immediately
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300, immediate = false) => {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
};

/**
 * Throttle function for limiting execution rate
 * 
 * @param {Function} func - Function to throttle 
 * @param {number} limit - Throttle time in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 100) => {
  let inThrottle = false;
  
  return function executedFunction(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Calculate optimal tick count based on container width
 * 
 * @param {number} width - Container width in pixels
 * @param {number} minSpacing - Minimum spacing between ticks in pixels 
 * @returns {number} Optimal tick count
 */
export const calculateOptimalTickCount = (width, minSpacing = 60) => {
  return Math.max(2, Math.floor(width / minSpacing));
};

/**
 * Downsample data for more efficient visualization
 * 
 * @param {Array} data - Array of data points
 * @param {number} threshold - Maximum number of points to display
 * @param {Function} importanceFunction - Function to determine point importance (optional)
 * @returns {Array} Downsampled data
 */
export const downsampleData = (data, threshold = 100, importanceFunction = null) => {
  if (data.length <= threshold) return data;
  
  // If no importance function provided, use simple evenly-spaced sampling
  if (!importanceFunction) {
    const step = Math.ceil(data.length / threshold);
    return data.filter((_, i) => i % step === 0);
  }
  
  // Otherwise, use importance-based sampling
  const annotatedData = data.map((point, i) => ({
    point,
    index: i,
    importance: importanceFunction(point, i, data)
  }));
  
  // Sort by importance and take the top 'threshold' points
  const sortedData = [...annotatedData].sort((a, b) => b.importance - a.importance);
  const selectedIndices = sortedData
    .slice(0, threshold)
    .map(item => item.index)
    .sort((a, b) => a - b); // Resort by original index
  
  // Return points in original order
  return selectedIndices.map(i => data[i]);
};

/**
 * Create a memoized version of a calculation function
 * 
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export const memoize = (fn) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) return cache.get(key);
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
};

/**
 * Calculate optimal number of bins for histogram
 * 
 * @param {Array} data - Data array
 * @param {number} maxBins - Maximum number of bins
 * @returns {number} Optimal bin count
 */
export const calculateOptimalBinCount = (data, maxBins = 50) => {
  // Freedman-Diaconis rule
  if (data.length < 2) return 1;
  
  const sorted = [...data].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const binWidth = 2 * iqr * Math.pow(data.length, -1/3);
  const range = Math.max(...data) - Math.min(...data);
  
  if (binWidth <= 0) return Math.min(data.length, maxBins);
  
  return Math.min(Math.ceil(range / binWidth), maxBins);
};

/**
 * Progressive rendering function for large datasets
 * 
 * @param {Function} renderFn - Rendering function
 * @param {Array} data - Data array 
 * @param {number} chunkSize - Size of chunks to render
 * @param {number} delay - Delay between chunks in ms
 */
export const renderProgressively = (renderFn, data, chunkSize = 100, delay = 10) => {
  let i = 0;
  
  function renderChunk() {
    const chunk = data.slice(i, i + chunkSize);
    renderFn(chunk, i);
    i += chunkSize;
    
    if (i < data.length) {
      setTimeout(renderChunk, delay);
    }
  }
  
  renderChunk();
};

/**
 * Create a responsive dimensions object based on container and screen size
 * 
 * @param {Object} container - Container element or dimensions 
 * @param {Object} options - Configuration options
 * @returns {Object} Responsive dimensions
 */
export const createResponsiveDimensions = (container, options = {}) => {
  const {
    aspectRatio = 0.5,
    maxHeight = 600,
    minHeight = 200,
    marginTop = 30,
    marginRight = 30,
    marginBottom = 50,
    marginLeft = 60,
    smallScreenBreakpoint = 768,
    smallScreenMarginAdjustment = 0.7,
  } = options;
  
  const width = container.clientWidth || container.width || 800;
  const calculatedHeight = Math.min(maxHeight, Math.max(minHeight, width * aspectRatio));
  
  // Reduce margins on small screens
  const isSmallScreen = window.innerWidth < smallScreenBreakpoint;
  const marginAdjustment = isSmallScreen ? smallScreenMarginAdjustment : 1;
  
  return {
    width,
    height: calculatedHeight,
    margin: {
      top: marginTop,
      right: marginRight * marginAdjustment,
      bottom: marginBottom,
      left: marginLeft * marginAdjustment,
    },
    innerWidth: width - (marginLeft + marginRight) * marginAdjustment,
    innerHeight: calculatedHeight - marginTop - marginBottom,
    isSmallScreen,
  };
};

/**
 * Create a CSS font size string that scales based on screen size
 * 
 * @param {Object} options - Configuration options
 * @returns {string} CSS font size value
 */
export const responsiveFontSize = (options = {}) => {
  const {
    baseFontSize = 12,
    minFontSize = 10,
    maxFontSize = 16,
    scaleWithWidth = true,
  } = options;
  
  if (!scaleWithWidth) return `${baseFontSize}px`;
  
  return `clamp(${minFontSize}px, ${baseFontSize}px + 0.5vw, ${maxFontSize}px)`;
};

/**
 * Simplify path data for better performance when rendering complex paths
 * 
 * @param {Array} points - Array of [x, y] points
 * @param {number} tolerance - Simplification tolerance (higher = more simplification) 
 * @returns {Array} Simplified points
 */
export const simplifyPath = (points, tolerance = 1) => {
  if (points.length <= 2) return points;
  
  // Douglas-Peucker algorithm implementation
  function getSqDist(p1, p2) {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return dx * dx + dy * dy;
  }
  
  function getSqSegDist(p, p1, p2) {
    let l2 = getSqDist(p1, p2);
    if (l2 === 0) return getSqDist(p, p1);
    
    let t = ((p[0] - p1[0]) * (p2[0] - p1[0]) + (p[1] - p1[1]) * (p2[1] - p1[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    
    return getSqDist(p, [
      p1[0] + t * (p2[0] - p1[0]),
      p1[1] + t * (p2[1] - p1[1])
    ]);
  }
  
  function simplifyDouglasPeucker(points, tolerance) {
    const sqTolerance = tolerance * tolerance;
    const len = points.length;
    const result = [];
    const markers = new Uint8Array(len);
    
    markers[0] = 1;
    markers[len - 1] = 1;
    
    function simplifySection(first, last) {
      let maxSqDist = 0;
      let index = 0;
      
      for (let i = first + 1; i < last; i++) {
        const sqDist = getSqSegDist(points[i], points[first], points[last]);
        
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }
      
      if (maxSqDist > sqTolerance) {
        markers[index] = 1;
        simplifySection(first, index);
        simplifySection(index, last);
      }
    }
    
    simplifySection(0, len - 1);
    
    for (let i = 0; i < len; i++) {
      if (markers[i]) result.push(points[i]);
    }
    
    return result;
  }
  
  return simplifyDouglasPeucker(points, tolerance);
};

/**
 * Optimize SVG for rendering performance
 * 
 * @param {d3.Selection} svg - D3 selection for SVG element
 */
export const optimizeSvg = (svg) => {
  // Add shape-rendering attribute for better performance
  svg.attr('shape-rendering', 'optimizeSpeed');
  
  // Disable pointer events on non-interactive elements
  svg.selectAll('path, line, rect:not(.interactive)')
    .attr('pointer-events', 'none');
    
  // Use vector-effect to maintain crisp lines at any scale
  svg.selectAll('path, line')
    .attr('vector-effect', 'non-scaling-stroke');
};

/**
 * Apply responsive optimizations to a D3 chart
 * 
 * @param {Object} options - Configuration options
 * @param {d3.Selection} options.svg - D3 selection for the SVG element
 * @param {Object} options.dimensions - Chart dimensions
 * @param {d3.Scale} options.xScale - X scale
 * @param {d3.Scale} options.yScale - Y scale
 * @param {d3.Axis} options.xAxis - X axis
 * @param {d3.Axis} options.yAxis - Y axis
 * @param {Array} options.data - Chart data
 */
export const applyResponsiveOptimizations = (options) => {
  const {
    svg,
    dimensions,
    xScale,
    yScale,
    xAxis,
    yAxis,
    data,
  } = options;
  
  // Optimize SVG
  optimizeSvg(svg);
  
  // Calculate optimal tick count
  const xTickCount = calculateOptimalTickCount(dimensions.innerWidth);
  const yTickCount = calculateOptimalTickCount(dimensions.innerHeight);
  
  // Apply responsive ticks
  const newXAxis = xAxis.ticks(xTickCount);
  const newYAxis = yAxis.ticks(yTickCount);
  
  // Reduce font size on small screens
  if (dimensions.isSmallScreen) {
    svg.selectAll('text')
      .style('font-size', '10px');
      
    svg.selectAll('.axis-label')
      .style('font-size', '11px');
  }
  
  // Update axes
  svg.select('.x-axis').call(newXAxis);
  svg.select('.y-axis').call(newYAxis);
  
  // Apply rotated tick labels if needed for x-axis on narrow screens
  if (dimensions.isSmallScreen) {
    svg.select('.x-axis')
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em')
      .style('text-anchor', 'end');
  }
  
  // Potential data downsampling for performance
  const debouncedData = data.length > 1000 
    ? downsampleData(data, 1000) 
    : data;
    
  return { 
    xAxis: newXAxis, 
    yAxis: newYAxis,
    optimizedData: debouncedData 
  };
};

/**
 * Add responsive resize handling to a D3 chart
 * 
 * @param {Function} renderFn - Chart rendering function
 * @param {Object} ref - Reference to chart container
 * @returns {Function} Cleanup function
 */
export const addResponsiveResizeHandler = (renderFn, ref) => {
  // Create a debounced version of the render function
  const debouncedRender = debounce(renderFn, 300);
  
  // Create resize observer
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      debouncedRender(entry.contentRect);
    }
  });
  
  // Start observing
  if (ref.current) {
    resizeObserver.observe(ref.current);
  }
  
  // Create window resize handler for backup
  const handleResize = () => {
    if (ref.current) {
      debouncedRender({
        width: ref.current.clientWidth,
        height: ref.current.clientHeight
      });
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  // Return cleanup function
  return () => {
    resizeObserver.disconnect();
    window.removeEventListener('resize', handleResize);
  };
};

// Export all utilities
export default {
  debounce,
  throttle,
  calculateOptimalTickCount,
  downsampleData,
  memoize,
  calculateOptimalBinCount,
  renderProgressively,
  createResponsiveDimensions,
  responsiveFontSize,
  simplifyPath,
  optimizeSvg,
  applyResponsiveOptimizations,
  addResponsiveResizeHandler
};