import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as d3 from 'd3';

// Scree Plot Component
const ScreePlot = React.memo(({ data, plotRef }) => {
  const theme = useTheme();

  useEffect(() => {
    if (!data || !data.explained_variance || data.explained_variance.length === 0 || !plotRef.current) {
      return;
    }
    
    // Clear previous visualization
    d3.select(plotRef.current).selectAll("*").remove();
    
    // Extract data
    const explainedVariance = data.explained_variance;
    const cumulativeVariance = data.cumulative_variance;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const width = Math.min(700, plotRef.current.clientWidth) - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG element
    const svg = d3.select(plotRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const xScale = d3.scaleBand()
      .domain(explainedVariance.map((_, i) => i + 1))
      .range([0, width])
      .padding(0.2);
    
    const yScaleLeft = d3.scaleLinear()
      .domain([0, Math.max(...explainedVariance) * 1.1])
      .range([height, 0]);
    
    const yScaleRight = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxisLeft = d3.axisLeft(yScaleLeft);
    const yAxisRight = d3.axisRight(yScaleRight);
    
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
    
    svg.append("g")
      .call(yAxisLeft);
    
    svg.append("g")
      .attr("transform", `translate(${width},0)`)
      .call(yAxisRight);
    
    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("Principal Component");
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .text("Explained Variance (%)");
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", width + margin.right - 15)
      .text("Cumulative Variance (%)");
    
    // Add title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Scree Plot - Explained Variance");
    
    // Plot individual variance bars
    svg.selectAll(".variance-bar")
      .data(explainedVariance)
      .enter()
      .append("rect")
      .attr("class", "variance-bar")
      .attr("x", (d, i) => xScale(i + 1))
      .attr("y", d => yScaleLeft(d))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yScaleLeft(d))
      .attr("fill", theme.palette.primary.main)
      .attr("opacity", 0.7);
    
    // Plot cumulative variance line
    const line = d3.line()
      .x((d, i) => xScale(i + 1) + xScale.bandwidth() / 2)
      .y(d => yScaleRight(d));
    
    svg.append("path")
      .datum(cumulativeVariance)
      .attr("fill", "none")
      .attr("stroke", theme.palette.secondary.main)
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add dots for the cumulative variance
    svg.selectAll(".cumulative-dot")
      .data(cumulativeVariance)
      .enter()
      .append("circle")
      .attr("class", "cumulative-dot")
      .attr("cx", (d, i) => xScale(i + 1) + xScale.bandwidth() / 2)
      .attr("cy", d => yScaleRight(d))
      .attr("r", 4)
      .attr("fill", theme.palette.secondary.main);
    
    // Add tooltips for variance bars
    svg.selectAll(".variance-bar")
      .append("title")
      .text((d, i) => `PC${i + 1}: ${d.toFixed(2)}%`);
    
    // Add hover effects
    svg.selectAll(".variance-bar")
      .on("mouseover", function() {
        d3.select(this)
          .attr("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("opacity", 0.7);
      });
    
    // Add a horizontal line at 80% cumulative variance
    const eightyPercentY = yScaleRight(80);
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", eightyPercentY)
      .attr("x2", width)
      .attr("y2", eightyPercentY)
      .attr("stroke", "#888")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
    
    svg.append("text")
      .attr("x", width - 5)
      .attr("y", eightyPercentY - 5)
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .text("80% Variance");
    
    // Find where cumulative variance exceeds 80%
    const pcFor80Percent = cumulativeVariance.findIndex(d => d >= 80) + 1;
    if (pcFor80Percent > 0 && pcFor80Percent <= cumulativeVariance.length) {
      svg.append("line")
        .attr("x1", xScale(pcFor80Percent) + xScale.bandwidth() / 2)
        .attr("y1", eightyPercentY)
        .attr("x2", xScale(pcFor80Percent) + xScale.bandwidth() / 2)
        .attr("y2", height)
        .attr("stroke", "#888")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");
      
      svg.append("text")
        .attr("x", xScale(pcFor80Percent) + xScale.bandwidth() / 2)
        .attr("y", height + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text(`PC${pcFor80Percent}`);
    }
  }, [data, plotRef, theme]);

  return (
    <Box
      ref={plotRef}
      sx={{
        width: '100%',
        height: 400,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center'
      }}
    />
  );
});

export default ScreePlot;