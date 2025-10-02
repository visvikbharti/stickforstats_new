/**
 * GeneContributionPlot Component
 * 
 * Visualizes the contribution of individual genes to principal components
 */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, useTheme, useMediaQuery } from '@mui/material';
import * as d3 from 'd3';

const GeneContributionPlot = ({ data, pcIndex = 0, width = 600, height = 400, topGenesCount = 20 }) => {
  const containerRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [plotData, setPlotData] = useState([]);

  // Process data to get top contributing genes
  useEffect(() => {
    if (!data || !data.geneContributions) return;
    
    // Sort genes by absolute contribution for the selected PC
    const sortedGenes = [...data.geneContributions]
      .sort((a, b) => Math.abs(b.contributions[pcIndex]) - Math.abs(a.contributions[pcIndex]))
      .slice(0, topGenesCount);
    
    setPlotData(sortedGenes);
  }, [data, pcIndex, topGenesCount]);

  // Render the visualization
  useEffect(() => {
    if (!containerRef.current || plotData.length === 0) return;

    // Clear previous visualization
    d3.select(containerRef.current).selectAll("*").remove();

    // Setup dimensions
    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const actualWidth = width - margin.left - margin.right;
    const actualHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(containerRef.current)
      .append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale for genes
    const x = d3.scaleBand()
      .domain(plotData.map(d => d.geneName))
      .range([0, actualWidth])
      .padding(0.2);

    // Y scale for contribution values
    const y = d3.scaleLinear()
      .domain([
        d3.min(plotData, d => d.contributions[pcIndex]) * 1.1,
        d3.max(plotData, d => d.contributions[pcIndex]) * 1.1
      ])
      .range([actualHeight, 0]);

    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${actualHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "10px");

    // Add Y axis
    svg.append("g")
      .call(d3.axisLeft(y));

    // Add bars
    svg.selectAll("mybar")
      .data(plotData)
      .enter()
      .append("rect")
        .attr("x", d => x(d.geneName))
        .attr("y", d => d.contributions[pcIndex] > 0 ? y(d.contributions[pcIndex]) : y(0))
        .attr("width", x.bandwidth())
        .attr("height", d => Math.abs(y(d.contributions[pcIndex]) - y(0)))
        .attr("fill", d => d.contributions[pcIndex] > 0 ? theme.palette.primary.main : theme.palette.error.main);

    // Add title
    svg.append("text")
      .attr("x", actualWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Gene Contributions to PC${pcIndex + 1}`);

    // Add X axis label
    svg.append("text")
      .attr("x", actualWidth / 2)
      .attr("y", actualHeight + margin.bottom - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Genes");

    // Add Y axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -actualHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Contribution");

  }, [plotData, pcIndex, width, height, theme]);

  // Handle no data case
  if (!data || !data.geneContributions || data.geneContributions.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1">No gene contribution data available</Typography>
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

export default GeneContributionPlot;