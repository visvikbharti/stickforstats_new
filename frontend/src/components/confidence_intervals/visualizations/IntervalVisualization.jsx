import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';
import { Box, Typography, Paper } from '@mui/material';
import { jStat } from 'jstat'; // jStat library for statistical distributions

/**
 * Component for visualizing confidence intervals
 */
const IntervalVisualization = ({ 
  result, 
  height = 200, 
  showDistribution = true, 
  showAxisLabels = true,
  margin = { top: 20, right: 30, bottom: 40, left: 50 }
}) => {
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!result || !result.result) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous visualization
    
    // Extract required values from result
    const lowerBound = result.result.lower;
    const upperBound = result.result.upper;
    const pointEstimate = result.result.mean || 
                         result.result.proportion || 
                         result.result.statistic ||
                         (lowerBound + upperBound) / 2;
    
    // Setup dimensions
    const width = svgRef.current.clientWidth;
    const innerHeight = height - margin.top - margin.bottom;
    const innerWidth = width - margin.left - margin.right;
    
    // Create scales
    // For x-axis, include some padding around the interval
    const padding = (upperBound - lowerBound) * 0.3;
    const xDomain = [
      Math.min(lowerBound - padding, pointEstimate - padding * 2),
      Math.max(upperBound + padding, pointEstimate + padding * 2)
    ];
    
    const xScale = d3.scaleLinear()
      .domain(xDomain)
      .range([0, innerWidth]);
    
    // Create the container group with margin convention
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Draw x-axis
    const xAxis = d3.axisBottom(xScale)
      .tickSizeOuter(0)
      .ticks(5);
    
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("class", "x-axis");
    
    // Add axis label if requested
    if (showAxisLabels) {
      g.append("text")
        .attr("class", "x-axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .style("font-size", "12px")
        .text(getParameterLabel(result.interval_type));
    }
    
    // Draw distribution curve if requested
    if (showDistribution) {
      // Generate distribution curve based on interval type
      const distributionCurve = generateDistributionCurve(
        result.interval_type,
        pointEstimate,
        (upperBound - lowerBound) / 2,
        xScale,
        innerHeight,
        result.result
      );
      
      if (distributionCurve) {
        // Define gradient for distribution fill
        const gradient = g.append("defs")
          .append("linearGradient")
          .attr("id", "distribution-gradient")
          .attr("x1", "0%")
          .attr("x2", "0%")
          .attr("y1", "0%")
          .attr("y2", "100%");
          
        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", "rgba(25, 118, 210, 0.7)");
          
        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", "rgba(25, 118, 210, 0.1)");
        
        // Draw the distribution path
        g.append("path")
          .datum(distributionCurve)
          .attr("fill", "url(#distribution-gradient)")
          .attr("stroke", "none")
          .attr("d", d3.area()
            .x(d => d.x)
            .y0(innerHeight)
            .y1(d => d.y)
          );
      }
    }
    
    // Draw confidence interval line
    g.append("line")
      .attr("x1", xScale(lowerBound))
      .attr("x2", xScale(upperBound))
      .attr("y1", innerHeight * 0.7)
      .attr("y2", innerHeight * 0.7)
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 3);
    
    // Draw interval endpoints (vertical lines)
    g.append("line")
      .attr("x1", xScale(lowerBound))
      .attr("x2", xScale(lowerBound))
      .attr("y1", innerHeight * 0.65)
      .attr("y2", innerHeight * 0.75)
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 2);
      
    g.append("line")
      .attr("x1", xScale(upperBound))
      .attr("x2", xScale(upperBound))
      .attr("y1", innerHeight * 0.65)
      .attr("y2", innerHeight * 0.75)
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 2);
    
    // Draw point estimate marker
    g.append("circle")
      .attr("cx", xScale(pointEstimate))
      .attr("cy", innerHeight * 0.7)
      .attr("r", 5)
      .attr("fill", "#e91e63");
    
    // Add labels
    if (showAxisLabels) {
      // Lower bound label
      g.append("text")
        .attr("x", xScale(lowerBound))
        .attr("y", innerHeight * 0.6)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .style("font-size", "12px")
        .text(lowerBound.toFixed(2));
        
      // Upper bound label
      g.append("text")
        .attr("x", xScale(upperBound))
        .attr("y", innerHeight * 0.6)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .style("font-size", "12px")
        .text(upperBound.toFixed(2));
      
      // Point estimate label
      g.append("text")
        .attr("x", xScale(pointEstimate))
        .attr("y", innerHeight * 0.85)
        .attr("text-anchor", "middle")
        .attr("fill", "#e91e63")
        .style("font-size", "12px")
        .text(pointEstimate.toFixed(2));
    }
  }, [result, height, margin, showDistribution, showAxisLabels, generateDistributionCurve]);

  // Helper function to generate distribution curve data based on interval type
  const generateDistributionCurve = (
    intervalType, 
    mean, 
    halfWidth, 
    xScale, 
    height, 
    resultDetails
  ) => {
    if (!mean || !halfWidth) return null;
    
    const sigma = halfWidth / (intervalType.includes('MEAN_Z') ? 1.96 : 2);
    const x = d3.range(
      xScale.domain()[0], 
      xScale.domain()[1], 
      (xScale.domain()[1] - xScale.domain()[0]) / 100
    );
    
    let y;
    
    if (intervalType.startsWith('MEAN')) {
      // Normal distribution
      y = x.map(d => jStat.normal.pdf(d, mean, sigma));
    } else if (intervalType.startsWith('PROPORTION')) {
      // Beta distribution (better approximation for proportions)
      const n = resultDetails.sample_size || 100;
      const p = mean;
      const alpha = p * n + 1;
      const beta = (1 - p) * n + 1;
      
      y = x.map(d => {
        if (d < 0 || d > 1) return 0;
        return jStat.beta.pdf(d, alpha, beta);
      });
    } else if (intervalType === 'VARIANCE') {
      // Chi-squared distribution for variance
      const df = resultDetails.df || 10;
      const scale = mean / df;
      
      y = x.map(d => {
        if (d <= 0) return 0;
        return jStat.chisquare.pdf(d / scale, df) / scale;
      });
    } else if (intervalType.startsWith('BOOTSTRAP')) {
      // Use bootstrap replicates if available
      if (resultDetails.bootstrap_replicates) {
        const replicates = resultDetails.bootstrap_replicates;
        
        // Calculate histogram
        const histogram = d3.histogram()
          .domain(xScale.domain())
          .thresholds(30)
          (replicates);
        
        // Convert histogram to density
        const totalCount = replicates.length;
        const bins = histogram.map(bin => {
          return {
            x: (bin.x0 + bin.x1) / 2,
            y: bin.length / totalCount / (bin.x1 - bin.x0)
          };
        });
        
        // Create density curve using kernel density estimation
        const kde = kernelDensityEstimator(kernelEpanechnikov(7), x);
        
        return kde(replicates).map(point => ({
          x: xScale(point[0]),
          y: (point[1] * height * 0.7)
        }));
      }
      
      // Fallback to normal approximation
      y = x.map(d => jStat.normal.pdf(d, mean, sigma));
    } else {
      // Default to normal distribution
      y = x.map(d => jStat.normal.pdf(d, mean, sigma));
    }
    
    // Scale y values to fit within height
    const maxY = Math.max(...y);
    const scaledY = y.map(d => d / maxY * (height * 0.7));
    
    // Create array of points
    return x.map((d, i) => ({
      x: xScale(d),
      y: height - scaledY[i]
    }));
  };

  // Helper functions for kernel density estimation
  const kernelDensityEstimator = (kernel, X) => {
    return function(V) {
      return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
  };
  
  const kernelEpanechnikov = (bandwidth) => {
    return x => Math.abs(x /= bandwidth) <= 1 ? 0.75 * (1 - x * x) / bandwidth : 0;
  };

  // Helper function to get parameter label based on interval type
  const getParameterLabel = (intervalType) => {
    if (intervalType.startsWith('MEAN')) {
      return 'Population Mean (μ)';
    } else if (intervalType.startsWith('PROPORTION')) {
      return 'Population Proportion (p)';
    } else if (intervalType === 'VARIANCE') {
      return 'Population Variance (σ²)';
    } else if (intervalType.includes('DIFFERENCE_MEANS')) {
      return 'Difference in Means (μ₁ - μ₂)';
    } else if (intervalType.includes('DIFFERENCE_PROPORTIONS')) {
      return 'Difference in Proportions (p₁ - p₂)';
    } else {
      return 'Parameter Value';
    }
  };

  if (!result || !result.result) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No data to visualize
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <svg ref={svgRef} width="100%" height={height} />
    </Box>
  );
};

IntervalVisualization.propTypes = {
  result: PropTypes.object,
  height: PropTypes.number,
  showDistribution: PropTypes.bool,
  showAxisLabels: PropTypes.bool,
  margin: PropTypes.object
};

export default IntervalVisualization;