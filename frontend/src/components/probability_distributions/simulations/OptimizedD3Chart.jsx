import React, { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, CircularProgress, useTheme } from '@mui/material';
import * as d3 from 'd3';
import { 
  debounce, 
  createResponsiveDimensions, 
  optimizeSvg,
  addResponsiveResizeHandler,
  downsampleData
} from './D3Optimizer';
import { 
  getResponsiveDimensions,
  getOptimalTickCount,
  getOptimalLabelRotation,
  shouldUseTouchInteractions
} from './ResponsiveUtils';
import ExportControls from './ExportControls';

/**
 * OptimizedD3Chart - A performance-optimized wrapper for D3.js visualizations
 * 
 * This component provides a standardized way to create D3.js visualizations 
 * with built-in performance optimizations, responsive behavior, and
 * consistent structure.
 */
const OptimizedD3Chart = ({
  // Data and rendering
  data,
  renderChart,
  downsample = true,
  downsampleThreshold = 1000,
  
  // Dimensions
  width,
  height,
  aspectRatio = 0.5,
  minHeight = 200,
  maxHeight = 600,
  margin = { top: 40, right: 40, bottom: 60, left: 60 },
  
  // Appearance
  title,
  xLabel,
  yLabel,
  showLegend = true,
  
  // Behavior
  debounceResize = true,
  resizeDebounceTime = 300,
  
  // Export options
  enableExport = true,
  exportFormats = ['svg', 'png'],
  exportOptions = {},
  chartType = 'generic',
  
  // Additional options
  showLoading = false,
  ariaLabel,
  className,
  style,
  
  // Event handlers
  onRender,
  onResize,
  onExport,
  
  // Custom components
  renderTooltip,
  
  // Children components
  children,
  
  // Additional props
  ...rest
}) => {
  const theme = useTheme();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // State for dimensions and performance metrics
  const [dimensions, setDimensions] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderTime, setRenderTime] = useState(0);
  const [dataPoints, setDataPoints] = useState(0);
  const [optimizedDataPoints, setOptimizedDataPoints] = useState(0);
  
  // Prepare data for visualization
  const prepareData = useCallback((rawData) => {
    if (!rawData || !rawData.length) return [];
    
    // Determine if downsampling is needed
    if (downsample && rawData.length > downsampleThreshold) {
      const optimizedData = downsampleData(rawData, downsampleThreshold);
      setDataPoints(rawData.length);
      setOptimizedDataPoints(optimizedData.length);
      return optimizedData;
    }
    
    setDataPoints(rawData.length);
    setOptimizedDataPoints(rawData.length);
    return rawData;
  }, [downsample, downsampleThreshold]);
  
  // Calculate chart dimensions based on container size
  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    
    // Get responsive dimensions
    const newDimensions = getResponsiveDimensions(containerRef.current, {
      aspectRatio,
      minHeight,
      maxHeight,
      margin
    });
    
    setDimensions(newDimensions);
    if (onResize) onResize(newDimensions);
    
    return newDimensions;
  }, [aspectRatio, minHeight, maxHeight, margin, onResize]);
  
  // Render the D3 visualization
  const renderVisualization = useCallback(() => {
    if (!svgRef.current || !dimensions || !data) return;
    
    setIsRendering(true);
    const startTime = performance.now();
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create the base SVG with optimizations
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr('aria-label', ariaLabel || title || 'Chart visualization');
    
    // Apply SVG optimizations
    optimizeSvg(svg);
    
    // Prepare data for rendering
    const optimizedData = prepareData(data);
    
    // Call the provided render function
    try {
      renderChart({
        svg,
        data: optimizedData,
        dimensions,
        theme: {
          palette: theme.palette,
          typography: theme.typography
        },
        container: containerRef.current,
        tooltip: tooltipRef.current,
        originalDataLength: dataPoints,
        optimizedDataLength: optimizedDataPoints,
        isSmallScreen: dimensions.breakpoint === 'xs' || dimensions.breakpoint === 'sm',
        useTouchInteractions: shouldUseTouchInteractions()
      });
      
      const endTime = performance.now();
      setRenderTime(endTime - startTime);
      
      if (onRender) {
        onRender({
          renderTime: endTime - startTime,
          dimensions,
          originalDataLength: dataPoints,
          optimizedDataLength: optimizedDataPoints
        });
      }
    } catch (error) {
      console.error('Error rendering chart:', error);
    } finally {
      setIsRendering(false);
    }
  }, [
    data,
    dimensions,
    renderChart,
    theme,
    prepareData,
    dataPoints,
    optimizedDataPoints,
    onRender,
    ariaLabel,
    title
  ]);
  
  // Setup resize observer and handle resize events
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Calculate initial dimensions
    calculateDimensions();
    
    // Create resize handler
    const handleResize = debounceResize
      ? debounce(calculateDimensions, resizeDebounceTime)
      : calculateDimensions;
    
    // Use the responsive resize handler
    const cleanup = addResponsiveResizeHandler(handleResize, containerRef);
    
    return cleanup;
  }, [calculateDimensions, debounceResize, resizeDebounceTime]);
  
  // Render visualization when dimensions or data change
  useEffect(() => {
    if (dimensions && data) {
      renderVisualization();
    }
  }, [dimensions, data, renderVisualization]);
  
  // Custom empty state rendering
  const renderEmptyState = () => (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height={height || 300}
      width="100%"
      p={3}
    >
      <Typography variant="body1" color="text.secondary">
        No data available
      </Typography>
    </Box>
  );
  
  // Custom loading state rendering
  const renderLoadingState = () => (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="rgba(255, 255, 255, 0.7)"
      zIndex={2}
    >
      <CircularProgress size={40} />
    </Box>
  );
  
  return (
    <Box
      ref={containerRef}
      position="relative"
      width="100%"
      height={height}
      className={className}
      style={style}
      data-testid="optimized-d3-chart"
      {...rest}
    >
      {/* Chart Title and Export Controls */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center"
        mb={1}
      >
        {title && (
          <Typography
            variant="h6"
            component="h3"
            align="center"
            flexGrow={1}
            data-testid="chart-title"
          >
            {title}
          </Typography>
        )}
        
        {/* Export Controls */}
        {enableExport && (
          <Box ml={2} data-testid="chart-export-controls">
            <ExportControls
              chartRef={svgRef}
              chartType={chartType}
              formats={exportFormats}
              exportOptions={exportOptions}
              variant="outlined"
              size="small"
              onExportComplete={(format, options) => {
                if (onExport) onExport(format, options);
              }}
            />
          </Box>
        )}
      </Box>
      
      {/* Chart Container */}
      <Box position="relative" width="100%" height="100%">
        {/* Loading Overlay */}
        {showLoading && renderLoadingState()}
        
        {/* SVG Container */}
        {!data || data.length === 0 ? (
          renderEmptyState()
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            data-testid="chart-svg"
          />
        )}
        
        {/* Tooltip Container */}
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            display: 'none',
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(1),
            pointerEvents: 'none',
            boxShadow: theme.shadows[2],
            zIndex: 10,
            maxWidth: 300
          }}
          data-testid="chart-tooltip"
        />
        
        {/* Additional chart components */}
        {children}
        
        {/* Performance Debug Information (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <Box
            position="absolute"
            top={4}
            right={4}
            bgcolor="rgba(0,0,0,0.05)"
            p={1}
            borderRadius={1}
            fontSize="0.7rem"
            display="flex"
            flexDirection="column"
            zIndex={1}
            style={{ pointerEvents: 'none' }}
          >
            <span>Render: {renderTime.toFixed(1)}ms</span>
            <span>Data: {dataPoints} → {optimizedDataPoints}</span>
            <span>Size: {dimensions?.width}×{dimensions?.height}</span>
          </Box>
        )}
      </Box>
    </Box>
  );
};

OptimizedD3Chart.propTypes = {
  // Data and rendering
  data: PropTypes.array,
  renderChart: PropTypes.func.isRequired,
  downsample: PropTypes.bool,
  downsampleThreshold: PropTypes.number,
  
  // Dimensions
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  aspectRatio: PropTypes.number,
  minHeight: PropTypes.number,
  maxHeight: PropTypes.number,
  margin: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number
  }),
  
  // Appearance
  title: PropTypes.string,
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
  showLegend: PropTypes.bool,
  
  // Behavior
  debounceResize: PropTypes.bool,
  resizeDebounceTime: PropTypes.number,
  
  // Export options
  enableExport: PropTypes.bool,
  exportFormats: PropTypes.arrayOf(PropTypes.string),
  exportOptions: PropTypes.object,
  chartType: PropTypes.string,
  
  // Additional options
  showLoading: PropTypes.bool,
  ariaLabel: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  
  // Event handlers
  onRender: PropTypes.func,
  onResize: PropTypes.func,
  onExport: PropTypes.func,
  
  // Custom components
  renderTooltip: PropTypes.func,
  
  // Children components
  children: PropTypes.node
};

export default OptimizedD3Chart;