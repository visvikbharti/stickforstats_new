import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Slider, 
  Button,
  FormControlLabel,
  Switch,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  ShowChart as ShowChartIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';
import * as d3 from 'd3';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

import OptimizedD3Chart from './OptimizedD3Chart';
import { simplifyPath, memoize } from './D3Optimizer';

/**
 * OptimizedExample - Example component demonstrating the OptimizedD3Chart usage
 * 
 * This component shows how to use the OptimizedD3Chart component with
 * performance optimizations for complex visualizations.
 */
const OptimizedExample = () => {
  // Simulation parameters
  const [sampleSize, setSampleSize] = useState(1000);
  const [complexity, setComplexity] = useState(50);
  const [noiseLevel, setNoiseLevel] = useState(10);
  const [animate, setAnimate] = useState(false);
  const [downsample, setDownsample] = useState(true);
  const [enableOptimizations, setEnableOptimizations] = useState(true);
  
  // Performance metrics
  const [renderTime, setRenderTime] = useState(0);
  const [originalDataPoints, setOriginalDataPoints] = useState(0);
  const [optimizedDataPoints, setOptimizedDataPoints] = useState(0);
  
  // Generate complex time series data with memoization
  const generateData = useMemo(() => memoize((sampleSize, complexity, noiseLevel) => {
    // Measure data generation time
    const startTime = performance.now();
    
    const data = [];
    
    // Generate complex time series with multiple frequencies
    for (let i = 0; i < sampleSize; i++) {
      const x = i / (sampleSize - 1);
      
      // Create a complex wave with multiple frequencies
      let y = Math.sin(2 * Math.PI * x * complexity);
      
      // Add higher frequency components
      for (let j = 1; j <= Math.min(10, complexity / 10); j++) {
        y += (1 / j) * Math.sin(2 * Math.PI * x * complexity * j);
      }
      
      // Normalize and add noise
      y = y / (1 + Math.min(10, complexity / 10)) * 0.5 + 0.5;
      y += (Math.random() - 0.5) * (noiseLevel / 100);
      
      data.push({ x, y });
    }
    
    const endTime = performance.now();
    console.log(`Data generation time: ${(endTime - startTime).toFixed(2)}ms`);
    
    return data;
  }), []);
  
  // Get the current dataset
  const data = useMemo(() => {
    return generateData(sampleSize, complexity, noiseLevel);
  }, [generateData, sampleSize, complexity, noiseLevel]);
  
  // Render the D3 chart
  const renderChart = useCallback(({
    svg,
    data,
    dimensions,
    theme,
    tooltip,
    isSmallScreen,
    useTouchInteractions
  }) => {
    const { width, height, margin, innerWidth, innerHeight } = dimensions;
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([margin.left, width - margin.right]);
      
    const yScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.y) * 0.9,
        d3.max(data, d => d.y) * 1.1
      ])
      .range([height - margin.bottom, margin.top]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(isSmallScreen ? 5 : 10)
      .tickFormat(d3.format('.1f'));
      
    const yAxis = d3.axisLeft(yScale)
      .ticks(isSmallScreen ? 5 : 10)
      .tickFormat(d3.format('.2f'));
    
    // Add axes
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis);
      
    svg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis);
      
    // Add axis labels
    svg.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .style('font-size', isSmallScreen ? '10px' : '12px')
      .text('Time');
      
    svg.append('text')
      .attr('class', 'y-axis-label')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${margin.left / 3},${height / 2}) rotate(-90)`)
      .style('font-size', isSmallScreen ? '10px' : '12px')
      .text('Value');
    
    // Create line generator
    const line = d3.line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveCatmullRom.alpha(0.5));
    
    // Create point data
    const points = data.map(d => [xScale(d.x), yScale(d.y)]);
    
    // Simplify path if optimizations are enabled
    const pathData = enableOptimizations
      ? simplifyPath(points, isSmallScreen ? 2 : 1)
      : points;
    
    // Add path
    const path = svg.append('path')
      .datum(pathData)
      .attr('fill', 'none')
      .attr('stroke', theme.palette.primary.main)
      .attr('stroke-width', 1.5)
      .attr('d', line.x(d => d[0]).y(d => d[1]));
      
    // Add animation if enabled
    if (animate) {
      const pathLength = path.node().getTotalLength();
      
      path.attr('stroke-dasharray', pathLength)
        .attr('stroke-dashoffset', pathLength)
        .transition()
        .duration(2000)
        .attr('stroke-dashoffset', 0);
    }
    
    // Add data points (limited number for performance)
    const displayPoints = data.filter((_, i) => 
      i % Math.max(1, Math.floor(data.length / (isSmallScreen ? 20 : 50))) === 0
    );
    
    svg.selectAll('.data-point')
      .data(displayPoints)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 3)
      .attr('fill', theme.palette.secondary.main)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d) {
        // Show tooltip
        d3.select(tooltip)
          .style('display', 'block')
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 20}px`)
          .html(`
            <div>
              <strong>Time:</strong> ${d.x.toFixed(3)}<br>
              <strong>Value:</strong> ${d.y.toFixed(3)}
            </div>
          `);
        
        // Highlight point
        d3.select(this)
          .attr('r', 5)
          .attr('stroke-width', 2);
      })
      .on('mouseout', function() {
        // Hide tooltip
        d3.select(tooltip)
          .style('display', 'none');
        
        // Restore point size
        d3.select(this)
          .attr('r', 3)
          .attr('stroke-width', 1);
      });
      
    // Add grid lines (optimized for small screens)
    if (!isSmallScreen) {
      // X grid lines
      svg.append('g')
        .attr('class', 'grid x-grid')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .style('stroke-dasharray', '3,3')
        .style('stroke-opacity', 0.2)
        .call(xAxis
          .tickSize(-(height - margin.top - margin.bottom))
          .tickFormat('')
        );
        
      // Y grid lines
      svg.append('g')
        .attr('class', 'grid y-grid')
        .attr('transform', `translate(${margin.left},0)`)
        .style('stroke-dasharray', '3,3')
        .style('stroke-opacity', 0.2)
        .call(yAxis
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat('')
        );
    }
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', isSmallScreen ? '14px' : '16px')
      .style('font-weight', 'bold')
      .text('Complex Time Series Visualization');
      
    // Add performance info
    if (process.env.NODE_ENV === 'development') {
      svg.append('text')
        .attr('x', width - margin.right)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', theme.palette.text.secondary)
        .text(`Path points: ${pathData.length}`);
    }
  }, [animate, enableOptimizations]);
  
  // Handle render metrics update
  const handleRenderComplete = useCallback((metrics) => {
    setRenderTime(metrics.renderTime);
    setOriginalDataPoints(metrics.originalDataLength);
    setOptimizedDataPoints(metrics.optimizedDataLength);
  }, []);
  
  // Generate a new dataset
  const handleGenerateData = useCallback(() => {
    // Force re-render by updating state
    setSampleSize(prev => prev);
  }, []);
  
  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Optimized D3 Chart Example
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              {/* Chart */}
              <OptimizedD3Chart
                data={data}
                renderChart={renderChart}
                title="Time Series Analysis"
                aspectRatio={0.5}
                minHeight={300}
                maxHeight={500}
                downsample={downsample}
                downsampleThreshold={2000}
                onRender={handleRenderComplete}
                debounceResize={true}
                resizeDebounceTime={300}
                enableExport={true}
                exportFormats={['svg', 'png']}
                chartType="time-series"
                exportOptions={{
                  filename: `time_series_complexity_${complexity}`,
                  backgroundColor: '#ffffff',
                  scale: 2
                }}
                onExport={(format, options) => {
                  console.log(`Chart exported as ${format}:`, options);
                }}
              />
              
              {/* Performance Metrics */}
              <Paper
                sx={{
                  mt: 2,
                  p: 2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  justifyContent: 'center'
                }}
              >
                <Chip
                  icon={<TimelineIcon />}
                  label={`Render Time: ${renderTime.toFixed(1)}ms`}
                  color={renderTime > 100 ? 'warning' : 'success'}
                />
                <Chip
                  icon={<ShowChartIcon />}
                  label={`Data Points: ${originalDataPoints} → ${optimizedDataPoints}`}
                  color="primary"
                />
                <Chip
                  icon={<SpeedIcon />}
                  label={`Complexity: ${complexity}`}
                  color="secondary"
                />
                <Chip
                  icon={<MemoryIcon />}
                  label={`Optimizations: ${enableOptimizations ? 'ON' : 'OFF'}`}
                  color={enableOptimizations ? 'success' : 'error'}
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              {/* Controls */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Simulation Controls
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Sample Size: {sampleSize}
                  </Typography>
                  <Slider
                    value={sampleSize}
                    onChange={(_, value) => setSampleSize(value)}
                    min={100}
                    max={10000}
                    step={100}
                    marks={[
                      { value: 100, label: '100' },
                      { value: 10000, label: '10k' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Complexity: {complexity}
                  </Typography>
                  <Slider
                    value={complexity}
                    onChange={(_, value) => setComplexity(value)}
                    min={1}
                    max={100}
                    marks={[
                      { value: 1, label: 'Simple' },
                      { value: 100, label: 'Complex' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Noise Level: {noiseLevel}%
                  </Typography>
                  <Slider
                    value={noiseLevel}
                    onChange={(_, value) => setNoiseLevel(value)}
                    min={0}
                    max={50}
                    marks={[
                      { value: 0, label: 'None' },
                      { value: 50, label: 'High' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>
                
                <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={animate}
                        onChange={(e) => setAnimate(e.target.checked)}
                      />
                    }
                    label="Enable Animation"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={downsample}
                        onChange={(e) => setDownsample(e.target.checked)}
                      />
                    }
                    label="Enable Downsampling"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={enableOptimizations}
                        onChange={(e) => setEnableOptimizations(e.target.checked)}
                      />
                    }
                    label="Enable Path Optimization"
                  />
                </Box>
                
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleGenerateData}
                >
                  Generate New Data
                </Button>
              </Paper>
              
              {/* Explanation */}
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Optimization Techniques
                </Typography>
                
                <Typography variant="body2" paragraph>
                  This example demonstrates several D3.js optimization techniques:
                </Typography>
                
                <ul>
                  <li>
                    <Typography variant="body2">
                      <strong>Data Downsampling:</strong> Reduces data points for large datasets
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      <strong>Path Simplification:</strong> Optimizes SVG path complexity
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      <strong>Responsive Adjustments:</strong> Adapts to screen size
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      <strong>Memoization:</strong> Caches expensive calculations
                    </Typography>
                  </li>
                </ul>
                
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Path Simplification Algorithm
                </Typography>
                
                <BlockMath math="D(P, i, j) = \max_{i < k < j} d(P_k, \overline{P_i P_j})" />
                
                <Typography variant="body2" paragraph>
                  Where <InlineMath math="d(P_k, \overline{P_i P_j})" /> is the perpendicular distance 
                  from point <InlineMath math="P_k" /> to line <InlineMath math="\overline{P_i P_j}" />.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OptimizedExample;