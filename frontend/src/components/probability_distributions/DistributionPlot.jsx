import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, Paper, useTheme } from '@mui/material';
import * as d3 from 'd3';
import { useErrorHandler } from '../../utils/errorHandlers';
import { motion } from 'framer-motion';

/**
 * DistributionPlot component for visualizing probability distributions
 * 
 * @param {Object} props
 * @param {string} props.type - Distribution type: 'normal', 'poisson', or 'binomial'
 * @param {Object} props.parameters - Distribution parameters
 * @param {Object} props.plotConfig - Configuration for the plot
 * @param {Function} props.onCalculationComplete - Callback when calculation completes
 */
const DistributionPlot = ({ 
  type = 'normal', 
  parameters = {}, 
  plotConfig = {
    width: 800,
    height: 400,
    showPdf: true,
    showCdf: false,
    fillArea: false,
    fillRange: [null, null],
    showGrid: true,
    margin: { top: 30, right: 30, bottom: 50, left: 60 }
  },
  onCalculationComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ pdf: [], cdf: [] });
  const svgRef = useRef();
  const handleError = useErrorHandler();

  // Generate x values based on distribution type and parameters
  const generateXValues = () => {
    switch (type) {
      case 'normal': {
        const { mean = 0, sd = 1 } = parameters;
        const min = mean - 4 * sd;
        const max = mean + 4 * sd;
        return Array.from({ length: 100 }, (_, i) => min + (i * (max - min)) / 99);
      }
      case 'poisson': {
        const { lambda = 5 } = parameters;
        const max = Math.max(20, Math.ceil(lambda + 4 * Math.sqrt(lambda)));
        return Array.from({ length: max + 1 }, (_, i) => i);
      }
      case 'binomial': {
        const { n = 10, p = 0.5 } = parameters;
        return Array.from({ length: n + 1 }, (_, i) => i);
      }
      default:
        return [];
    }
  };

  // Calculate PDF/PMF values
  const calculatePdf = (xValues) => {
    switch (type) {
      case 'normal': {
        const { mean = 0, sd = 1 } = parameters;
        return xValues.map(x => {
          const z = (x - mean) / sd;
          return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
        });
      }
      case 'poisson': {
        const { lambda = 5 } = parameters;
        return xValues.map(k => {
          if (k < 0) return 0;
          const logPmf = k * Math.log(lambda) - lambda - d3.sum(Array.from({ length: k }, (_, i) => Math.log(i + 1)));
          return Math.exp(logPmf);
        });
      }
      case 'binomial': {
        const { n = 10, p = 0.5 } = parameters;
        return xValues.map(k => {
          if (k < 0 || k > n) return 0;
          const logComb = d3.sum(Array.from({ length: k }, (_, i) => Math.log(n - i))) - 
                          d3.sum(Array.from({ length: k }, (_, i) => Math.log(i + 1)));
          return Math.exp(logComb + k * Math.log(p) + (n - k) * Math.log(1 - p));
        });
      }
      default:
        return [];
    }
  };

  // Calculate CDF values
  const calculateCdf = (xValues, pdfValues) => {
    if (!pdfValues.length) return [];
    
    const cdf = [];
    let sum = 0;
    
    switch (type) {
      case 'normal': {
        const { mean = 0, sd = 1 } = parameters;
        return xValues.map(x => {
          // Using error function approximation for normal CDF
          const z = (x - mean) / (sd * Math.sqrt(2));
          return 0.5 * (1 + erf(z));
        });
      }
      case 'poisson':
      case 'binomial': {
        // For discrete distributions, use cumulative sum of PMF values
        pdfValues.forEach(pdfValue => {
          sum += pdfValue;
          cdf.push(sum);
        });
        return cdf;
      }
      default:
        return [];
    }
  };

  // Error function approximation for normal CDF
  const erf = (x) => {
    // Constants
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    // Save the sign of x
    const sign = (x < 0) ? -1 : 1;
    x = Math.abs(x);

    // A&S formula 7.1.26
    const t = 1.0/(1.0 + p*x);
    const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);

    return sign*y;
  };

  // Draw the distribution plot
  const drawPlot = () => {
    if (!svgRef.current || !data.pdf.length) return;

    const { width, height, margin, showPdf, showCdf, fillArea, fillRange, showGrid } = plotConfig;
    const svg = d3.select(svgRef.current);
    
    // Clear existing plot
    svg.selectAll("*").remove();
    
    // Create scales
    const xValues = generateXValues();
    const xScale = type === 'normal' 
      ? d3.scaleLinear()
          .domain([xValues[0], xValues[xValues.length - 1]])
          .range([margin.left, width - margin.right])
      : d3.scaleBand()
          .domain(xValues)
          .range([margin.left, width - margin.right])
          .padding(0.2); // Increased padding for better aesthetics

    const yMax = Math.max(...data.pdf);
    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.15]) // Add 15% padding at the top for better visuals
      .range([height - margin.bottom, margin.top]);

    // Create axes with improved styling
    const xAxis = d3.axisBottom(xScale)
      .tickSize(-5) // Shorter ticks for cleaner look
      .tickPadding(10); // More space between axis and labels
      
    const yAxis = d3.axisLeft(yScale)
      .tickSize(-5)
      .tickPadding(10)
      .ticks(5); // Limit number of ticks for cleaner appearance

    // Add X axis with improved styling
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .call(g => g.select(".domain").attr("stroke-opacity", 0.5)) // Soften axis line
      .call(g => g.selectAll(".tick line").attr("stroke-opacity", 0.5))
      .call(g => g.selectAll(".tick text").attr("font-size", "12px"))
      .append("text")
      .attr("fill", "#546E7A") // More subtle text color
      .attr("x", width / 2)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(type === 'normal' ? "x" : "k");

    // Add Y axis with improved styling
    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis)
      .call(g => g.select(".domain").attr("stroke-opacity", 0.5)) // Soften axis line
      .call(g => g.selectAll(".tick line").attr("stroke-opacity", 0.5))
      .call(g => g.selectAll(".tick text").attr("font-size", "12px"))
      .append("text")
      .attr("fill", "#546E7A") // More subtle text color
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -(height / 2))
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(type === 'normal' ? "Probability Density" : "Probability Mass");

    // Add grid lines if enabled - with improved styling
    if (showGrid) {
      // Add X grid lines
      svg.append("g")
        .attr("class", "grid x-grid")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .style("stroke-dasharray", "2,4")
        .style("opacity", 0.15) // More subtle grid
        .call(
          xAxis
            .tickSize(-(height - margin.top - margin.bottom))
            .tickFormat("")
        );

      // Add Y grid lines
      svg.append("g")
        .attr("class", "grid y-grid")
        .attr("transform", `translate(${margin.left},0)`)
        .style("stroke-dasharray", "2,4")
        .style("opacity", 0.15) // More subtle grid
        .call(
          yAxis
            .tickSize(-(width - margin.left - margin.right))
            .tickFormat("")
        );
        
      // Add subtle background for the plot area
      svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "#f8f9fa")
        .attr("opacity", 0.3)
        .lower(); // Move to back
    }

    // Create a gradient for fills
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "area-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", height - margin.bottom)
      .attr("x2", 0).attr("y2", margin.top);
        
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#4682b4")
      .attr("stop-opacity", 0.2);
        
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#4682b4")
      .attr("stop-opacity", 0.8);
    
    // Create highlight gradient for selected areas
    const highlightGradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "highlight-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", height - margin.bottom)
      .attr("x2", 0).attr("y2", margin.top);
        
    highlightGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#FF5722")
      .attr("stop-opacity", 0.3);
        
    highlightGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#FF5722")
      .attr("stop-opacity", 0.7);

    // Draw PDF/PMF with enhanced styling
    if (showPdf) {
      if (type === 'normal') {
        // For normal distribution, use curved line for PDF
        const line = d3.line()
          .x((d, i) => xScale(xValues[i]))
          .y(d => yScale(d))
          .curve(d3.curveCatmullRom.alpha(0.5)); // Smoother curve

        // Add subtle shadow for depth
        svg.append("path")
          .datum(data.pdf)
          .attr("fill", "none")
          .attr("stroke", "#1A237E")
          .attr("stroke-width", 4)
          .attr("stroke-opacity", 0.1)
          .attr("stroke-linejoin", "round")
          .attr("d", line);

        svg.append("path")
          .datum(data.pdf)
          .attr("fill", "none")
          .attr("stroke", "#1E88E5") // Richer blue
          .attr("stroke-width", 2.5)
          .attr("stroke-linejoin", "round")
          .attr("d", line)
          .style("filter", "drop-shadow(0px 1px 1px rgba(0,0,0,0.1))"); // Subtle shadow

        // Fill area if enabled with gradient
        if (fillArea && fillRange[0] !== null && fillRange[1] !== null) {
          const startIdx = xValues.findIndex(x => x >= fillRange[0]);
          const endIdx = xValues.findIndex(x => x > fillRange[1]);
          
          const area = d3.area()
            .x((d, i) => xScale(xValues[i + startIdx]))
            .y0(yScale(0))
            .y1(d => yScale(d))
            .curve(d3.curveCatmullRom.alpha(0.5)); // Match the line curve

          svg.append("path")
            .datum(data.pdf.slice(startIdx, endIdx !== -1 ? endIdx : undefined))
            .attr("fill", "url(#highlight-gradient)") // Use gradient
            .attr("d", area)
            .style("filter", "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))");
        }
      } else {
        // For discrete distributions, use enhanced bars for PMF
        const bars = svg.selectAll(".bar")
          .data(data.pdf)
          .enter()
          .append("rect")
          .attr("class", "bar")
          .attr("x", (d, i) => xScale(i))
          .attr("width", xScale.bandwidth())
          .attr("y", height - margin.bottom) // Start from the bottom
          .attr("height", 0) // Initial height 0 for animation
          .attr("fill", "url(#area-gradient)") // Use gradient
          .attr("stroke", "#1E88E5")
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.7)
          .attr("rx", 2) // Rounded corners
          .attr("ry", 2);
          
        // Animate bars growing from the bottom
        bars.transition()
          .duration(750)
          .attr("y", d => yScale(d))
          .attr("height", d => height - margin.bottom - yScale(d));

        // Highlight specific bars if fillArea is enabled with different gradient
        if (fillArea && fillRange[0] !== null && fillRange[1] !== null) {
          svg.selectAll(".bar")
            .attr("fill", (d, i) => (i >= fillRange[0] && i <= fillRange[1]) ? "url(#highlight-gradient)" : "url(#area-gradient)")
            .attr("stroke", (d, i) => (i >= fillRange[0] && i <= fillRange[1]) ? "#FF5722" : "#1E88E5")
            .attr("stroke-width", (d, i) => (i >= fillRange[0] && i <= fillRange[1]) ? 1.5 : 1)
            .attr("stroke-opacity", (d, i) => (i >= fillRange[0] && i <= fillRange[1]) ? 0.9 : 0.7);
        }
      }
    }

    // Draw CDF if enabled with improved styling
    if (showCdf) {
      const cdfLine = d3.line()
        .x((d, i) => type === 'normal' ? xScale(xValues[i]) : xScale(i) + xScale.bandwidth() / 2)
        .y(d => yScale(d))
        .curve(d3.curveCatmullRom.alpha(0.5)); // Smoother curve

      // Add shadow for depth
      svg.append("path")
        .datum(data.cdf)
        .attr("fill", "none")
        .attr("stroke", "#2E7D32") // Darker green for shadow
        .attr("stroke-width", 4)
        .attr("stroke-opacity", 0.1)
        .attr("d", cdfLine);

      svg.append("path")
        .datum(data.cdf)
        .attr("fill", "none")
        .attr("stroke", "#43A047") // Rich green
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "6,3") // More refined dash pattern
        .attr("d", cdfLine)
        .style("filter", "drop-shadow(0px 1px 1px rgba(0,0,0,0.1))"); // Subtle shadow
    }

    // Add title with improved styling
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#37474F") // Dark blueish gray
      .text(`${type.charAt(0).toUpperCase() + type.slice(1)} Distribution ${type === 'normal' ? 'PDF' : 'PMF'}${showCdf ? ' and CDF' : ''}`);
      
    // Add a subtle subtitle if area is being calculated
    if (fillArea && fillRange[0] !== null && fillRange[1] !== null) {
      let subtitleText = '';
      if (fillRange[0] === Number.NEGATIVE_INFINITY) {
        subtitleText = `P(X < ${fillRange[1].toFixed(2)})`;
      } else if (fillRange[1] === Number.POSITIVE_INFINITY) {
        subtitleText = `P(X > ${fillRange[0].toFixed(2)})`;
      } else if (fillRange[0] === Math.floor(fillRange[0]) && fillRange[1] === Math.ceil(fillRange[0]) && fillRange[1] - fillRange[0] === 1) {
        subtitleText = `P(X = ${fillRange[0]})`;
      } else {
        subtitleText = `P(${fillRange[0].toFixed(2)} < X < ${fillRange[1].toFixed(2)})`;
      }
      
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2 + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#78909C") // Lighter subtle color
        .text(subtitleText);
    }
  };

  // Calculate distribution data when parameters or type changes
  useEffect(() => {
    const calculateDistribution = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Generate x values
        const xValues = generateXValues();
        
        // Calculate PDF/PMF and CDF
        const pdfValues = calculatePdf(xValues);
        const cdfValues = calculateCdf(xValues, pdfValues);
        
        setData({ pdf: pdfValues, cdf: cdfValues });
        
        if (onCalculationComplete) {
          onCalculationComplete({ xValues, pdfValues, cdfValues });
        }
      } catch (err) {
        handleError(err, {
          onServerError: () => setError('Server error calculating distribution values. Please try again later.'),
          onNetworkError: () => setError('Network error. Please check your connection.'),
          onValidationError: () => setError('Invalid distribution parameters provided.'),
          onOtherError: () => setError('Failed to calculate distribution values')
        });
      } finally {
        setLoading(false);
      }
    };

    calculateDistribution();
  }, [type, JSON.stringify(parameters)]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Draw the plot when data changes
  useEffect(() => {
    drawPlot();
  }, [data, plotConfig]);  // eslint-disable-line react-hooks/exhaustive-deps

  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          background: 'linear-gradient(to bottom, #ffffff, #f9fafc)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}
      >
        {error && (
          <Box sx={{ p: 2, color: 'error.main', bgcolor: 'error.light', borderRadius: 1, mb: 2 }}>
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
        
        {loading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(2px)',
            zIndex: 1
          }}>
            <CircularProgress color="primary" />
          </Box>
        )}
        
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
        >
          <svg 
            ref={svgRef} 
            width={plotConfig.width} 
            height={plotConfig.height}
            style={{ 
              display: 'block', 
              margin: '0 auto',
              filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.05))'
            }}
          />
        </motion.div>
      </Paper>
    </motion.div>
  );
};

export default DistributionPlot;