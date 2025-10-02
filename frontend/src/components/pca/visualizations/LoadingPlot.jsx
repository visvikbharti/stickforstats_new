/**
 * LoadingPlot Component
 * 
 * Visualizes PCA loadings to show the influence of original variables on principal components
 */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import * as d3 from 'd3';

const LoadingPlot = ({ 
  data, 
  pc1Index = 0, 
  pc2Index = 1, 
  width = 600, 
  height = 500,
  significanceThreshold = 0.7 
}) => {
  const containerRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [plotData, setPlotData] = useState([]);

  // Process data for visualization
  useEffect(() => {
    if (!data || !data.loadings || !data.loadings.length) return;
    
    const processedData = data.loadings.map(variable => ({
      variable: variable.name,
      x: variable.values[pc1Index],
      y: variable.values[pc2Index],
      magnitude: Math.sqrt(Math.pow(variable.values[pc1Index], 2) + Math.pow(variable.values[pc2Index], 2)),
      significant: Math.abs(variable.values[pc1Index]) > significanceThreshold || 
                  Math.abs(variable.values[pc2Index]) > significanceThreshold
    }));
    
    setPlotData(processedData);
  }, [data, pc1Index, pc2Index, significanceThreshold]);

  // Create the visualization
  useEffect(() => {
    if (!containerRef.current || plotData.length === 0) return;

    // Clear previous visualization
    d3.select(containerRef.current).selectAll("*").remove();

    // Setup dimensions
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const actualWidth = width - margin.left - margin.right;
    const actualHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(containerRef.current)
      .append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Find axis ranges
    const xMax = d3.max(plotData, d => Math.abs(d.x)) || 1;
    const yMax = d3.max(plotData, d => Math.abs(d.y)) || 1;
    const axisMax = Math.max(xMax, yMax) * 1.1;

    // Create scales
    const x = d3.scaleLinear()
      .domain([-axisMax, axisMax])
      .range([0, actualWidth]);

    const y = d3.scaleLinear()
      .domain([-axisMax, axisMax])
      .range([actualHeight, 0]);

    // Add X and Y axes
    svg.append("g")
      .attr("transform", `translate(0,${actualHeight/2})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${actualWidth/2},0)`)
      .call(d3.axisLeft(y));

    // Add axis labels
    svg.append("text")
      .attr("x", actualWidth / 2)
      .attr("y", actualHeight + margin.bottom / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text(`PC${pc1Index + 1}`);

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -actualHeight / 2)
      .attr("y", -margin.left / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text(`PC${pc2Index + 1}`);

    // Add title
    svg.append("text")
      .attr("x", actualWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Loading Plot: PC${pc1Index + 1} vs PC${pc2Index + 1}`);

    // Add zero lines
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", actualHeight/2)
      .attr("x2", actualWidth)
      .attr("y2", actualHeight/2)
      .attr("stroke", theme.palette.divider)
      .attr("stroke-dasharray", "4");

    svg.append("line")
      .attr("x1", actualWidth/2)
      .attr("y1", 0)
      .attr("x2", actualWidth/2)
      .attr("y2", actualHeight)
      .attr("stroke", theme.palette.divider)
      .attr("stroke-dasharray", "4");

    // Draw loading vectors
    svg.selectAll("loading-lines")
      .data(plotData)
      .enter()
      .append("line")
        .attr("x1", actualWidth/2)
        .attr("y1", actualHeight/2)
        .attr("x2", d => x(d.x))
        .attr("y2", d => y(d.y))
        .attr("stroke", d => d.significant ? theme.palette.primary.main : theme.palette.text.secondary)
        .attr("stroke-width", d => d.significant ? 2 : 1)
        .attr("opacity", d => d.significant ? 1 : 0.5);

    // Add vector labels
    svg.selectAll("loading-labels")
      .data(plotData)
      .enter()
      .append("text")
        .attr("x", d => x(d.x * 1.05))
        .attr("y", d => y(d.y * 1.05))
        .attr("text-anchor", d => d.x > 0 ? "start" : "end")
        .attr("font-size", d => d.significant ? "12px" : "10px")
        .attr("font-weight", d => d.significant ? "bold" : "normal")
        .attr("opacity", d => d.significant ? 1 : 0.7)
        .text(d => d.variable);

  }, [plotData, pc1Index, pc2Index, width, height, theme]);

  // Handle no data case
  if (!data || !data.loadings || data.loadings.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1">No loading data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: isMobile ? '100%' : width,
      mx: 'auto',
      my: 2
    }}>
      <div ref={containerRef} />
    </Box>
  );
};

export default LoadingPlot;