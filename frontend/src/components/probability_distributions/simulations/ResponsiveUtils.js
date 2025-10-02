/**
 * ResponsiveUtils - Responsive design utilities for D3.js visualizations
 * 
 * This module provides utilities for creating responsive layouts
 * for D3.js visualizations across different screen sizes and devices.
 */

/**
 * Default breakpoints for responsive designs
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920
};

/**
 * Get current breakpoint based on window width
 * 
 * @returns {string} Current breakpoint name
 */
export const getCurrentBreakpoint = () => {
  const width = window.innerWidth;
  
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * Check if current screen size is below a breakpoint
 * 
 * @param {string} breakpoint - Breakpoint to check against
 * @returns {boolean} True if screen size is below the breakpoint
 */
export const isBelowBreakpoint = (breakpoint) => {
  const width = window.innerWidth;
  return width < BREAKPOINTS[breakpoint];
};

/**
 * Get responsive configuration based on current breakpoint
 * 
 * @param {Object} configs - Configuration object keyed by breakpoint
 * @param {string} defaultBreakpoint - Default breakpoint to use
 * @returns {Object} Configuration for current breakpoint
 */
export const getResponsiveConfig = (configs, defaultBreakpoint = 'md') => {
  const currentBreakpoint = getCurrentBreakpoint();
  
  // Return config for exact breakpoint match
  if (configs[currentBreakpoint]) {
    return configs[currentBreakpoint];
  }
  
  // Find the closest smaller breakpoint
  const breakpoints = ['xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpoints.indexOf(currentBreakpoint);
  
  for (let i = currentIndex + 1; i < breakpoints.length; i++) {
    if (configs[breakpoints[i]]) {
      return configs[breakpoints[i]];
    }
  }
  
  // Find the closest larger breakpoint
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (configs[breakpoints[i]]) {
      return configs[breakpoints[i]];
    }
  }
  
  // Return default if no match found
  return configs[defaultBreakpoint] || configs;
};

/**
 * Calculate responsive dimensions for a chart
 * 
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Configuration options
 * @returns {Object} Dimensions object
 */
export const getResponsiveDimensions = (container, options = {}) => {
  const {
    aspectRatio = 0.5,
    maxHeight = 500,
    minHeight = 200,
    margin = { top: 40, right: 40, bottom: 60, left: 60 }
  } = options;
  
  const currentBreakpoint = getCurrentBreakpoint();
  
  // Adjust margins based on breakpoint
  let responsiveMargin = { ...margin };
  
  if (currentBreakpoint === 'xs') {
    responsiveMargin = {
      top: Math.max(20, margin.top * 0.6),
      right: Math.max(10, margin.right * 0.5),
      bottom: Math.max(30, margin.bottom * 0.7),
      left: Math.max(30, margin.left * 0.7)
    };
  } else if (currentBreakpoint === 'sm') {
    responsiveMargin = {
      top: Math.max(30, margin.top * 0.8),
      right: Math.max(20, margin.right * 0.7),
      bottom: Math.max(40, margin.bottom * 0.8),
      left: Math.max(40, margin.left * 0.8)
    };
  }
  
  // Get container width
  const containerWidth = container.clientWidth || container.offsetWidth || 800;
  
  // Calculate height based on aspect ratio
  let height = Math.round(containerWidth * aspectRatio);
  
  // Apply min/max constraints
  height = Math.min(maxHeight, Math.max(minHeight, height));
  
  // Calculate inner dimensions
  const innerWidth = containerWidth - responsiveMargin.left - responsiveMargin.right;
  const innerHeight = height - responsiveMargin.top - responsiveMargin.bottom;
  
  return {
    width: containerWidth,
    height,
    margin: responsiveMargin,
    innerWidth,
    innerHeight,
    breakpoint: currentBreakpoint
  };
};

/**
 * Get responsive font size based on breakpoint
 * 
 * @param {Object} sizes - Font sizes by breakpoint
 * @returns {string} Font size string
 */
export const getResponsiveFontSize = (sizes = {}) => {
  const defaultSizes = {
    xs: '10px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    ...sizes
  };
  
  const currentBreakpoint = getCurrentBreakpoint();
  return defaultSizes[currentBreakpoint] || defaultSizes.md;
};

/**
 * Calculate optimal number of ticks for an axis based on available space
 * 
 * @param {number} availableSpace - Available space in pixels
 * @param {Object} options - Configuration options
 * @returns {number} Optimal number of ticks
 */
export const getOptimalTickCount = (availableSpace, options = {}) => {
  const { minPixelsPerTick = 60, minTicks = 2, maxTicks = 10 } = options;
  
  const calculatedTicks = Math.floor(availableSpace / minPixelsPerTick);
  return Math.min(maxTicks, Math.max(minTicks, calculatedTicks));
};

/**
 * Calculate optimal label rotation angle based on available space and label length
 * 
 * @param {number} availableWidth - Available width in pixels
 * @param {number} labelCount - Number of labels
 * @param {number} avgLabelLength - Average label length in characters
 * @returns {number} Rotation angle in degrees
 */
export const getOptimalLabelRotation = (availableWidth, labelCount, avgLabelLength = 8) => {
  const pixelsPerChar = 7;
  const totalLabelWidth = labelCount * avgLabelLength * pixelsPerChar;
  
  if (totalLabelWidth <= availableWidth) {
    return 0; // No rotation needed
  }
  
  if (totalLabelWidth <= availableWidth * 1.5) {
    return 30; // Slight rotation
  }
  
  if (totalLabelWidth <= availableWidth * 2.5) {
    return 45; // Medium rotation
  }
  
  return 90; // Extreme rotation
};

/**
 * Create a responsive layout grid for small multiples
 * 
 * @param {number} itemCount - Number of items to layout
 * @param {Object} options - Configuration options
 * @returns {Object} Grid configuration
 */
export const createResponsiveGrid = (itemCount, options = {}) => {
  const {
    containerWidth = 800,
    aspectRatio = 0.75,
    minCellWidth = 200,
    maxCellWidth = 400,
    cellPadding = 10
  } = options;
  
  // Calculate optimal columns based on container width
  const maxColumns = Math.floor(containerWidth / minCellWidth);
  const minColumns = Math.max(1, Math.floor(containerWidth / maxCellWidth));
  
  // Start with max columns and reduce if needed
  let columns = Math.min(maxColumns, itemCount);
  
  // Ensure we don't go below minimum columns
  columns = Math.max(minColumns, columns);
  
  // Calculate rows
  const rows = Math.ceil(itemCount / columns);
  
  // Calculate cell dimensions
  const availableWidth = containerWidth - (columns - 1) * cellPadding;
  const cellWidth = availableWidth / columns;
  const cellHeight = cellWidth * aspectRatio;
  
  // Create positions for each cell
  const cells = [];
  for (let i = 0; i < itemCount; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    
    cells.push({
      index: i,
      x: col * (cellWidth + cellPadding),
      y: row * (cellHeight + cellPadding),
      width: cellWidth,
      height: cellHeight
    });
  }
  
  return {
    columns,
    rows,
    cellWidth,
    cellHeight,
    totalWidth: containerWidth,
    totalHeight: rows * cellHeight + (rows - 1) * cellPadding,
    cells
  };
};

/**
 * Determine if touch interactions should be used
 * 
 * @returns {boolean} True if touch interactions should be used
 */
export const shouldUseTouchInteractions = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Get appropriate event handlers based on device
 * 
 * @param {Object} handlers - Event handlers object
 * @returns {Object} Device-appropriate event handlers
 */
export const getResponsiveEventHandlers = (handlers) => {
  const isTouchDevice = shouldUseTouchInteractions();
  
  if (isTouchDevice) {
    return {
      onTouchStart: handlers.onMouseEnter,
      onTouchMove: handlers.onMouseMove,
      onTouchEnd: handlers.onMouseLeave,
      onClick: handlers.onClick
    };
  }
  
  return {
    onMouseEnter: handlers.onMouseEnter,
    onMouseMove: handlers.onMouseMove,
    onMouseLeave: handlers.onMouseLeave,
    onClick: handlers.onClick
  };
};

/**
 * Add responsive attributes to SVG elements
 * 
 * @param {d3.Selection} svg - D3 selection of SVG element
 */
export const makeResponsiveSvg = (svg) => {
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 \${width} \${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
};

/**
 * Create a responsive tooltip positioning function
 * 
 * @param {HTMLElement} container - Container element
 * @returns {Function} Tooltip positioning function
 */
export const createResponsiveTooltipPositioner = (container) => {
  return (event, tooltipWidth, tooltipHeight) => {
    const containerRect = container.getBoundingClientRect();
    let x = event.clientX - containerRect.left + 10;
    let y = event.clientY - containerRect.top + 10;
    
    // Check right edge
    if (x + tooltipWidth > containerRect.width) {
      x = event.clientX - containerRect.left - tooltipWidth - 10;
    }
    
    // Check bottom edge
    if (y + tooltipHeight > containerRect.height) {
      y = event.clientY - containerRect.top - tooltipHeight - 10;
    }
    
    return { x, y };
  };
};

// Export all utilities
export default {
  BREAKPOINTS,
  getCurrentBreakpoint,
  isBelowBreakpoint,
  getResponsiveConfig,
  getResponsiveDimensions,
  getResponsiveFontSize,
  getOptimalTickCount,
  getOptimalLabelRotation,
  createResponsiveGrid,
  shouldUseTouchInteractions,
  getResponsiveEventHandlers,
  makeResponsiveSvg,
  createResponsiveTooltipPositioner
};