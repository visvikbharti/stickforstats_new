/**
 * chartUtils.js
 * 
 * This module provides optimized chart utilities to standardize visualization approaches
 * across the application and reduce dependency size by choosing the right library for each use case.
 */

import React, { lazy, Suspense } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Import core d3 utilities for direct use
import { scaleLinear, scaleBand } from 'd3-scale';
import { select } from 'd3-selection';
import { axisBottom, axisLeft } from 'd3-axis';
import { line, area } from 'd3-shape';

// Simple charts - direct implementation with minimal dependencies

// Basic SVG-based bar chart
export const SimpleBarChart = ({ 
  data, 
  width = 600, 
  height = 300, 
  margin = { top: 20, right: 30, bottom: 40, left: 50 },
  barColor = '#4682b4',
  showGridLines = false,
  xAxisLabel = '',
  yAxisLabel = ''
}) => {
  const svgRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;
    
    // Clear previous chart
    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Calculate dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create scales
    const xScale = scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.2);
      
    const yScale = scaleLinear()
      .domain([0, Math.max(...data.map(d => d.value)) * 1.1])
      .range([innerHeight, 0]);
    
    // Create axes
    const xAxis = axisBottom(xScale);
    const yAxis = axisLeft(yScale);
    
    // Create chart group with margin
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Add grid lines if enabled
    if (showGridLines) {
      g.append('g')
        .attr('class', 'grid')
        .call(axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(''))
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.2);
    }
    
    // Add x-axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .append('text')
      .attr('fill', 'currentColor')
      .attr('x', innerWidth / 2)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .text(xAxisLabel);
    
    // Add y-axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .append('text')
      .attr('fill', 'currentColor')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text(yAxisLabel);
    
    // Add bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.label))
      .attr('y', d => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.value))
      .attr('fill', barColor);
  }, [data, width, height, margin, barColor, showGridLines, xAxisLabel, yAxisLabel]);
  
  return (
    <svg ref={svgRef} width={width} height={height} />
  );
};

// Basic SVG-based line chart
export const SimpleLineChart = ({ 
  data, 
  width = 600, 
  height = 300, 
  margin = { top: 20, right: 30, bottom: 40, left: 50 },
  lineColor = '#4682b4',
  showArea = false,
  areaColor = 'rgba(70, 130, 180, 0.2)',
  showGridLines = false,
  xAxisLabel = '',
  yAxisLabel = ''
}) => {
  const svgRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;
    
    // Clear previous chart
    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Calculate dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create scales
    const xScale = scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);
      
    const yScale = scaleLinear()
      .domain([0, Math.max(...data.map(d => d.value)) * 1.1])
      .range([innerHeight, 0]);
    
    // Create line generator
    const lineGenerator = line()
      .x((d, i) => xScale(i))
      .y(d => yScale(d.value));
    
    // Create area generator if needed
    const areaGenerator = area()
      .x((d, i) => xScale(i))
      .y0(innerHeight)
      .y1(d => yScale(d.value));
    
    // Create axes
    const xAxis = axisBottom(xScale)
      .ticks(Math.min(data.length, 10))
      .tickFormat(i => data[i] ? data[i].label : '');
      
    const yAxis = axisLeft(yScale);
    
    // Create chart group with margin
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Add grid lines if enabled
    if (showGridLines) {
      g.append('g')
        .attr('class', 'grid')
        .call(axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(''))
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.2);
    }
    
    // Add area if enabled
    if (showArea) {
      g.append('path')
        .datum(data)
        .attr('fill', areaColor)
        .attr('d', areaGenerator);
    }
    
    // Add line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 2)
      .attr('d', lineGenerator);
    
    // Add x-axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .append('text')
      .attr('fill', 'currentColor')
      .attr('x', innerWidth / 2)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .text(xAxisLabel);
    
    // Add y-axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .append('text')
      .attr('fill', 'currentColor')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text(yAxisLabel);
    
  }, [data, width, height, margin, lineColor, showArea, areaColor, showGridLines, xAxisLabel, yAxisLabel]);
  
  return (
    <svg ref={svgRef} width={width} height={height} />
  );
};

// Lazy-loaded chart libraries for more complex visualizations
const LazyRechartComponents = {
  // Core Recharts components
  LineChart: lazy(() => import('recharts').then(module => ({ default: module.LineChart }))),
  BarChart: lazy(() => import('recharts').then(module => ({ default: module.BarChart }))),
  AreaChart: lazy(() => import('recharts').then(module => ({ default: module.AreaChart }))),
  PieChart: lazy(() => import('recharts').then(module => ({ default: module.PieChart }))),
  ScatterChart: lazy(() => import('recharts').then(module => ({ default: module.ScatterChart }))),
  ComposedChart: lazy(() => import('recharts').then(module => ({ default: module.ComposedChart }))),
  
  // Supporting Recharts components
  Line: lazy(() => import('recharts').then(module => ({ default: module.Line }))),
  Bar: lazy(() => import('recharts').then(module => ({ default: module.Bar }))),
  Area: lazy(() => import('recharts').then(module => ({ default: module.Area }))),
  Pie: lazy(() => import('recharts').then(module => ({ default: module.Pie }))),
  Scatter: lazy(() => import('recharts').then(module => ({ default: module.Scatter }))),
  XAxis: lazy(() => import('recharts').then(module => ({ default: module.XAxis }))),
  YAxis: lazy(() => import('recharts').then(module => ({ default: module.YAxis }))),
  CartesianGrid: lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid }))),
  Tooltip: lazy(() => import('recharts').then(module => ({ default: module.Tooltip }))),
  Legend: lazy(() => import('recharts').then(module => ({ default: module.Legend }))),
  ResponsiveContainer: lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer }))),
};

// Function to choose the appropriate chart library based on complexity
export const getChartLibrary = (complexity = 'simple') => {
  switch (complexity) {
    case 'simple':
      return {
        BarChart: SimpleBarChart,
        LineChart: SimpleLineChart
      };
    case 'complex':
      return LazyRechartComponents;
    default:
      return {
        BarChart: SimpleBarChart,
        LineChart: SimpleLineChart
      };
  }
};

// Wrapper for lazy-loaded Recharts components
export const LazyLineChart = ({ children, ...props }) => {
  return (
    <Suspense fallback={<ChartLoading />}>
      <LazyRechartComponents.ResponsiveContainer {...props}>
        <LazyRechartComponents.LineChart {...props}>
          {children}
        </LazyRechartComponents.LineChart>
      </LazyRechartComponents.ResponsiveContainer>
    </Suspense>
  );
};

export const LazyBarChart = ({ children, ...props }) => {
  return (
    <Suspense fallback={<ChartLoading />}>
      <LazyRechartComponents.ResponsiveContainer {...props}>
        <LazyRechartComponents.BarChart {...props}>
          {children}
        </LazyRechartComponents.BarChart>
      </LazyRechartComponents.ResponsiveContainer>
    </Suspense>
  );
};

// Loading placeholder for charts
const ChartLoading = ({ height = 300 }) => (
  <Box 
    sx={{ 
      height, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      bgcolor: 'rgba(0, 0, 0, 0.04)',
      borderRadius: 1
    }}
  >
    <CircularProgress size={40} sx={{ mb: 2 }} />
    <Typography variant="body2" color="text.secondary">
      Loading chart...
    </Typography>
  </Box>
);

// Re-export for convenience
export const Charts = {
  ...LazyRechartComponents,
  SimpleBarChart,
  SimpleLineChart,
  LazyLineChart,
  LazyBarChart
};