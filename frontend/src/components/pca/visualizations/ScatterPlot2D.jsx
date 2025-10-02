import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import * as d3 from 'd3';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10, schemeSet2, schemePaired } from 'd3-scale-chromatic';

// 2D Scatter Plot Component
const ScatterPlot2D = ({ 
  data, 
  xComponent, 
  yComponent, 
  markerSize, 
  colorPalette, 
  showLabels, 
  ellipseTransparency,
  plotRef 
}) => {
  useEffect(() => {
    if (!data || !data.sample_data || data.sample_data.length === 0 || !plotRef.current) {
      return;
    }

    // Render the 2D scatter plot
    const render2DScatterPlot = () => {
      // Clear previous visualization
      d3.select(plotRef.current).selectAll("*").remove();
      
      // Extract data
      const sampleData = data.sample_data;
      const uniqueGroups = Array.from(new Set(sampleData.map(d => d.group)));
      
      // Set up dimensions and margins
      const margin = { top: 40, right: 120, bottom: 60, left: 80 };
      const width = Math.min(800, plotRef.current.clientWidth) - margin.left - margin.right;
      const height = 500 - margin.top - margin.bottom;
      
      // Create SVG element
      const svg = d3.select(plotRef.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      
      // Set up scales
      const xValues = sampleData.map(d => d.pc1);
      const yValues = sampleData.map(d => d.pc2);
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);
      
      // Add some padding to the axes
      const xPadding = (xMax - xMin) * 0.1;
      const yPadding = (yMax - yMin) * 0.1;
      
      const xScale = d3.scaleLinear()
        .domain([xMin - xPadding, xMax + xPadding])
        .range([0, width]);
      
      const yScale = d3.scaleLinear()
        .domain([yMin - yPadding, yMax + yPadding])
        .range([height, 0]);
      
      // Create color scale
      let colorScale;
      if (colorPalette === 'Category10') {
        colorScale = scaleOrdinal(schemeCategory10);
      } else if (colorPalette === 'Set2') {
        colorScale = scaleOrdinal(schemeSet2);
      } else if (colorPalette === 'Paired') {
        colorScale = scaleOrdinal(schemePaired);
      } else {
        colorScale = scaleOrdinal(schemeCategory10);
      }
      colorScale.domain(uniqueGroups);
      
      // Create axes
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);
      
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);
      
      svg.append("g")
        .call(yAxis);
      
      // Add axis labels
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text(`PC${xComponent} (${data.explained_variance[xComponent-1].toFixed(2)}%)`);
      
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .text(`PC${yComponent} (${data.explained_variance[yComponent-1].toFixed(2)}%)`);
      
      // Add title
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("PCA Scatter Plot");
      
      // Add confidence ellipses if we have group centroids
      if (data.group_centroids) {
        const confidenceEllipse = (group, meanX, meanY) => {
          // Get group data
          const groupData = sampleData.filter(d => d.group === group);
          if (groupData.length < 3) return null; // Need at least 3 points for an ellipse
          
          // Calculate covariance matrix
          let xx = 0, xy = 0, yy = 0;
          groupData.forEach(d => {
            const dx = d.pc1 - meanX;
            const dy = d.pc2 - meanY;
            xx += dx * dx;
            xy += dx * dy;
            yy += dy * dy;
          });
          xx /= groupData.length;
          xy /= groupData.length;
          yy /= groupData.length;
          
          // Calculate eigenvalues and eigenvectors
          const trace = xx + yy;
          const determinant = xx * yy - xy * xy;
          const lambda1 = (trace + Math.sqrt(trace * trace - 4 * determinant)) / 2;
          const lambda2 = (trace - Math.sqrt(trace * trace - 4 * determinant)) / 2;
          
          let ex1 = 1;
          let ey1 = (lambda1 - xx) / xy;
          const len1 = Math.sqrt(ex1 * ex1 + ey1 * ey1);
          ex1 /= len1;
          ey1 /= len1;
          
          let ex2 = 1;
          let ey2 = (lambda2 - xx) / xy;
          const len2 = Math.sqrt(ex2 * ex2 + ey2 * ey2);
          ex2 /= len2;
          ey2 /= len2;
          
          // For a 95% confidence interval, use 2.447 for n=3
          // Adjust based on the number of samples
          const nSamples = groupData.length;
          let factor;
          if (nSamples <= 3) factor = 2.45;
          else if (nSamples <= 5) factor = 2.0;
          else if (nSamples <= 10) factor = 1.8;
          else factor = 1.96; // Asymptotic to normal distribution
          
          // Draw the ellipse
          const ellipsePath = [];
          for (let i = 0; i <= 360; i += 5) {
            const angle = (i * Math.PI) / 180;
            const x = meanX + factor * Math.sqrt(lambda1) * Math.cos(angle) * ex1 + factor * Math.sqrt(lambda2) * Math.sin(angle) * ex2;
            const y = meanY + factor * Math.sqrt(lambda1) * Math.cos(angle) * ey1 + factor * Math.sqrt(lambda2) * Math.sin(angle) * ey2;
            ellipsePath.push([xScale(x), yScale(y)]);
          }
          
          const ellipse = d3.line()(ellipsePath);
          
          return svg.append("path")
            .attr("d", ellipse)
            .attr("stroke", colorScale(group))
            .attr("stroke-width", 1.5)
            .attr("fill", colorScale(group))
            .attr("fill-opacity", ellipseTransparency)
            .attr("stroke-opacity", 0.8);
        };
        
        // Draw ellipses for each group
        Object.entries(data.group_centroids).forEach(([group, centroid]) => {
          confidenceEllipse(group, centroid.PC1, centroid.PC2);
        });
      }
      
      // Plot data points
      const points = svg.selectAll("circle")
        .data(sampleData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.pc1))
        .attr("cy", d => yScale(d.pc2))
        .attr("r", markerSize / 10)
        .attr("fill", d => colorScale(d.group))
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8)
        .attr("class", "data-point");
      
      // Add sample labels if enabled
      if (showLabels) {
        svg.selectAll(".sample-label")
          .data(sampleData)
          .enter()
          .append("text")
          .attr("class", "sample-label")
          .attr("x", d => xScale(d.pc1) + (markerSize / 10) + 2)
          .attr("y", d => yScale(d.pc2) + 4)
          .text(d => d.sample_id)
          .attr("font-size", "10px")
          .attr("fill", "#333");
      }
      
      // Add tooltips
      points.append("title")
        .text(d => `${d.sample_id}\nGroup: ${d.group}\nPC${xComponent}: ${d.pc1.toFixed(3)}\nPC${yComponent}: ${d.pc2.toFixed(3)}`);
      
      // Add legend
      const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 0)`);
      
      uniqueGroups.forEach((group, i) => {
        const legendRow = legend.append("g")
          .attr("transform", `translate(0, ${i * 20})`);
        
        legendRow.append("rect")
          .attr("width", 10)
          .attr("height", 10)
          .attr("fill", colorScale(group));
        
        legendRow.append("text")
          .attr("x", 15)
          .attr("y", 9)
          .attr("font-size", "12px")
          .text(group);
      });
      
      // Add interaction (zoom and pan)
      const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on("zoom", (event) => {
          svg.attr("transform", event.transform);
        });
      
      d3.select(plotRef.current).select("svg")
        .call(zoom);
    };

    render2DScatterPlot();
  }, [data, xComponent, yComponent, markerSize, colorPalette, showLabels, ellipseTransparency, plotRef]);

  return (
    <Box
      ref={plotRef}
      sx={{
        width: '100%',
        height: 500,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center'
      }}
    />
  );
};

export default React.memo(ScatterPlot2D);