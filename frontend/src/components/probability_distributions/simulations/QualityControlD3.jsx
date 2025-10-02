import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Slider, 
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import FactoryIcon from '@mui/icons-material/Factory';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';

import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Utility function to render LaTeX formula
const renderLatex = (formula) => {
  const container = document.createElement('span');
  katex.render(formula, container, {
    throwOnError: false,
    displayMode: false
  });
  return container.innerHTML;
};

/**
 * Enhanced Quality Control simulation using D3.js
 * 
 * This component demonstrates how manufacturing measurements follow
 * a Normal distribution with interactive visualization of control charts
 * and process capability metrics
 */
const QualityControlD3 = ({ projectId, setLoading, setError, setSimulationResult, result }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Main simulation parameters
  const [mean, setMean] = useState(100);
  const [stdDev, setStdDev] = useState(5);
  const [lowerSpec, setLowerSpec] = useState(85);
  const [upperSpec, setUpperSpec] = useState(115);
  const [sampleSize, setSampleSize] = useState(30);
  
  // Chart refs
  const measurementsChartRef = useRef(null);
  const distributionChartRef = useRef(null);
  const controlChartRef = useRef(null);
  
  // Advanced state
  const [showAnimations, setShowAnimations] = useState(true);
  const [showDataPoints, setShowDataPoints] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Animation state
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: ''
  });

  // Client-side simulation functions
  
  /**
   * Generate normally distributed random number using Box-Muller transform
   * @param {number} mu - Mean
   * @param {number} sigma - Standard deviation
   * @returns {number} Normal random variate
   */
  const generateNormalRandom = (mu, sigma) => {
    let u1 = Math.random();
    let u2 = Math.random();
    
    // Box-Muller transform
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // Transform to desired mean and standard deviation
    return mu + sigma * z0;
  };
  
  /**
   * Generate measurements for the manufacturing process
   * @returns {Array} Measurement values
   */
  const generateMeasurements = () => {
    return Array.from({ length: sampleSize }, () => 
      generateNormalRandom(mean, stdDev)
    );
  };
  
  /**
   * Calculate normal PDF (Probability Density Function)
   * @param {number} x - Value
   * @param {number} mu - Mean
   * @param {number} sigma - Standard deviation
   * @returns {number} Probability density
   */
  const normalPDF = (x, mu, sigma) => {
    const factor = 1 / (sigma * Math.sqrt(2 * Math.PI));
    const exponent = -Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2));
    return factor * Math.exp(exponent);
  };
  
  /**
   * Calculate normal CDF (Cumulative Distribution Function)
   * @param {number} x - Value
   * @param {number} mu - Mean
   * @param {number} sigma - Standard deviation
   * @returns {number} Cumulative probability
   */
  const normalCDF = (x, mu, sigma) => {
    // Error function approximation for normal CDF
    const z = (x - mu) / (sigma * Math.sqrt(2));
    
    // Approximation of error function
    const t = 1 / (1 + 0.3275911 * Math.abs(z));
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 1 - (a1 * t + a2 * t ** 2 + a3 * t ** 3 + a4 * t ** 4 + a5 * t ** 5) * Math.exp(-z * z);
    
    return z < 0 ? 1 - p : p;
  };
  
  /**
   * Generate theoretical Normal distribution data
   * @returns {Object} Distribution data
   */
  const generateTheoreticalDistribution = () => {
    // Calculate reasonable range for x values (mean ± 4 sigma)
    const minX = Math.min(mean - 4 * stdDev, lowerSpec - 2 * stdDev);
    const maxX = Math.max(mean + 4 * stdDev, upperSpec + 2 * stdDev);
    const xValues = [];
    
    // Generate 100 points for smooth curve
    for (let i = 0; i <= 100; i++) {
      xValues.push(minX + (i / 100) * (maxX - minX));
    }
    
    // Calculate PDF and CDF values
    const pdfValues = xValues.map(x => normalPDF(x, mean, stdDev));
    const cdfValues = xValues.map(x => normalCDF(x, mean, stdDev));
    
    return { xValues, pdfValues, cdfValues };
  };
  
  /**
   * Calculate process capability metrics
   * @param {Array} measurements - Measurement values
   * @returns {Object} Process capability metrics
   */
  const calculateProcessCapability = (measurements) => {
    const empiricalMean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    
    const empiricalStdDev = Math.sqrt(
      measurements.reduce((sum, val) => sum + Math.pow(val - empiricalMean, 2), 0) / 
      measurements.length
    );
    
    // Process capability indices
    const cp = (upperSpec - lowerSpec) / (6 * empiricalStdDev);
    const cpk = Math.min(
      (upperSpec - empiricalMean) / (3 * empiricalStdDev),
      (empiricalMean - lowerSpec) / (3 * empiricalStdDev)
    );
    
    // Defect rates
    const pLower = normalCDF(lowerSpec, empiricalMean, empiricalStdDev);
    const pUpper = 1 - normalCDF(upperSpec, empiricalMean, empiricalStdDev);
    const defectRate = pLower + pUpper;
    const dpmo = defectRate * 1000000; // Defects per million opportunities
    
    // Calculate sigma level (Six Sigma metric)
    const sigmaLevel = 
      defectRate < 1e-10 ? 6 : // Practical limit
      defectRate < 3.4e-6 ? 6 :
      defectRate < 2.33e-5 ? 5.5 :
      defectRate < 6.21e-5 ? 5 :
      defectRate < 0.00135 ? 4.5 :
      defectRate < 0.00621 ? 4 :
      defectRate < 0.0233 ? 3.5 :
      defectRate < 0.0621 ? 3 :
      defectRate < 0.135 ? 2.5 :
      defectRate < 0.308 ? 2 :
      defectRate < 0.5 ? 1.5 : 1;
    
    // Control limits (±3 sigma)
    const ucl = empiricalMean + 3 * empiricalStdDev;
    const lcl = empiricalMean - 3 * empiricalStdDev;
    
    return {
      empiricalMean,
      empiricalStdDev,
      cp,
      cpk,
      defectRate,
      dpmo,
      sigmaLevel,
      ucl,
      lcl
    };
  };
  
  /**
   * Generate data for control chart
   * @param {Array} measurements - Measurement values
   * @param {Object} capability - Process capability metrics
   * @returns {Object} Control chart data
   */
  const generateControlChartData = (measurements, capability) => {
    // Group measurements into subgroups of 5
    const subgroupSize = 5;
    const numSubgroups = Math.ceil(measurements.length / subgroupSize);
    
    const subgroups = [];
    for (let i = 0; i < numSubgroups; i++) {
      const start = i * subgroupSize;
      const end = Math.min(start + subgroupSize, measurements.length);
      subgroups.push(measurements.slice(start, end));
    }
    
    // Calculate subgroup statistics
    const subgroupMeans = subgroups.map(group => 
      group.reduce((sum, val) => sum + val, 0) / group.length
    );
    
    const subgroupRanges = subgroups.map(group => 
      Math.max(...group) - Math.min(...group)
    );
    
    // Calculate control limits for Xbar chart
    const meanOfMeans = subgroupMeans.reduce((sum, val) => sum + val, 0) / subgroupMeans.length;
    const meanOfRanges = subgroupRanges.reduce((sum, val) => sum + val, 0) / subgroupRanges.length;
    
    // Constants for control limits (based on subgroup size)
    const controlConstants = {
      2: { a2: 1.880, d3: 0, d4: 3.267 },
      3: { a2: 1.023, d3: 0, d4: 2.575 },
      4: { a2: 0.729, d3: 0, d4: 2.282 },
      5: { a2: 0.577, d3: 0, d4: 2.115 }
    };
    
    const effectiveSize = Math.min(5, subgroupSize); // Cap at 5 for constants
    const { a2, d3, d4 } = controlConstants[effectiveSize];
    
    const xBarUcl = meanOfMeans + a2 * meanOfRanges;
    const xBarLcl = meanOfMeans - a2 * meanOfRanges;
    
    const rChartUcl = d4 * meanOfRanges;
    const rChartLcl = d3 * meanOfRanges;
    
    return {
      subgroupMeans,
      subgroupRanges,
      meanOfMeans,
      meanOfRanges,
      xBarUcl,
      xBarLcl,
      rChartUcl,
      rChartLcl
    };
  };
  
  /**
   * Generate simulation data
   * @returns {Object} Simulation result
   */
  const runClientSimulation = () => {
    // Generate measurements
    const measurements = generateMeasurements();
    
    // Sort measurements for easier visualization
    const sortedMeasurements = [...measurements].sort((a, b) => a - b);
    
    // Calculate process capability metrics
    const capability = calculateProcessCapability(measurements);
    
    // Generate control chart data
    const controlChart = generateControlChartData(measurements, capability);
    
    // Check if any points are outside spec limits
    const outOfSpecCount = measurements.filter(
      m => m < lowerSpec || m > upperSpec
    ).length;
    
    // Check if any points are outside control limits
    const outOfControlCount = measurements.filter(
      m => m < capability.lcl || m > capability.ucl
    ).length;
    
    return {
      measurements,
      sortedMeasurements,
      capability,
      controlChart,
      outOfSpecCount,
      outOfControlCount,
      theoretical: generateTheoreticalDistribution()
    };
  };
  
  // Run simulation
  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For the enhanced version, we'll use client-side simulation
      // In a production app, you might want to keep the server calls for
      // more complex simulations or to log user activities
      const simulationResult = runClientSimulation();
      
      setSimulationResult(simulationResult);
      
      // Start animation if enabled
      if (showAnimations) {
        setAnimationProgress(0);
        setIsAnimating(true);
        
        // Animate the visualization
        const animationDuration = 1500;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / animationDuration, 1);
          
          setAnimationProgress(progress);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setIsAnimating(false);
          }
        };
        
        requestAnimationFrame(animate);
      }
      
    } catch (err) {
      console.error('Error simulating quality control:', err);
      setError('Error running simulation');
    } finally {
      setLoading(false);
    }
  };
  
  // D3.js Visualization Functions
  
  /**
   * Render measurements chart using D3.js
   */
  const renderMeasurementsChart = () => {
    if (!measurementsChartRef.current || !result?.measurements) return;
    
    // Clear previous chart
    d3.select(measurementsChartRef.current).selectAll("*").remove();
    
    const measurements = result.measurements;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = measurementsChartRef.current.clientWidth || 600;
    const height = measurementsChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(measurementsChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, measurements.length - 1])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([
        Math.min(d3.min(measurements), lowerSpec - stdDev),
        Math.max(d3.max(measurements), upperSpec + stdDev)
      ])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(10, measurements.length))
      .tickFormat(d => (d + 1).toString());
    
    const yAxis = d3.axisLeft(yScale).ticks(5);
    
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
    
    svg.append("g")
      .call(yAxis);
    
    // Add axes labels
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .text("Measurement Number");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Measurement Value");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Manufacturing Measurements");
    
    // Define gradients
    const defs = svg.append("defs");
    
    const areaGradient = defs.append("linearGradient")
      .attr("id", "measurements-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", 0).attr("y2", innerHeight);
    
    areaGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", theme.palette.primary.light)
      .attr("stop-opacity", 0.7);
    
    areaGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", theme.palette.primary.main)
      .attr("stop-opacity", 0.2);
    
    // Add specification lines
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(upperSpec))
      .attr("x2", innerWidth)
      .attr("y2", yScale(upperSpec))
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(upperSpec) - 5)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.error.main)
      .text("USL");
    
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(lowerSpec))
      .attr("x2", innerWidth)
      .attr("y2", yScale(lowerSpec))
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(lowerSpec) + 15)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.error.main)
      .text("LSL");
    
    // Add target line (mean)
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(mean))
      .attr("x2", innerWidth)
      .attr("y2", yScale(mean))
      .attr("stroke", theme.palette.success.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(mean) + 5)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.success.main)
      .text("Target");
    
    // Create line generator
    const lineGenerator = d3.line()
      .x((_, i) => xScale(i))
      .y(d => yScale(d));
    
    // Add measurements line with animation
    if (showAnimations && isAnimating) {
      // Animated line
      const lineLength = d3.line()
        .x((_, i) => xScale(i))
        .y(d => yScale(d));
      
      const visiblePoints = Math.ceil(measurements.length * animationProgress);
      const visibleData = measurements.slice(0, visiblePoints);
      
      svg.append("path")
        .datum(visibleData)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);
      
      // Add visible points
      if (showDataPoints) {
        svg.selectAll(".point")
          .data(visibleData)
          .join("circle")
          .attr("class", "point")
          .attr("cx", (_, i) => xScale(i))
          .attr("cy", d => yScale(d))
          .attr("r", 4)
          .attr("fill", d => (d < lowerSpec || d > upperSpec) ? theme.palette.error.main : theme.palette.primary.main)
          .attr("stroke", "white")
          .attr("stroke-width", 1.5);
      }
    } else {
      // Non-animated line
      svg.append("path")
        .datum(measurements)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);
      
      // Add data points
      if (showDataPoints) {
        svg.selectAll(".point")
          .data(measurements)
          .join("circle")
          .attr("class", "point")
          .attr("cx", (_, i) => xScale(i))
          .attr("cy", d => yScale(d))
          .attr("r", 4)
          .attr("fill", d => (d < lowerSpec || d > upperSpec) ? theme.palette.error.main : theme.palette.primary.main)
          .attr("stroke", "white")
          .attr("stroke-width", 1.5)
          .on("mouseover", function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event);
            const i = measurements.indexOf(d);
            setTooltip({
              visible: true,
              x: mouseX + margin.left,
              y: mouseY + margin.top,
              content: `Measurement #${i+1}<br>Value: ${d.toFixed(2)}<br>Target: ${mean.toFixed(2)}`
            });
            d3.select(this).attr("r", 6);
          })
          .on("mouseout", function() {
            setTooltip({ ...tooltip, visible: false });
            d3.select(this).attr("r", 4);
          });
      }
    }
    
    // Add a filled area between the line and the x-axis
    svg.append("path")
      .datum(measurements)
      .attr("fill", "url(#measurements-gradient)")
      .attr("opacity", 0.5)
      .attr("d", d3.area()
        .x((_, i) => xScale(i))
        .y0(innerHeight)
        .y1(d => yScale(d))
      );
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(10, 0)`);
      
      // Measurements
      legend.append("circle")
        .attr("cx", 10)
        .attr("cy", 10)
        .attr("r", 4)
        .attr("fill", theme.palette.primary.main);
      
      legend.append("text")
        .attr("x", 20)
        .attr("y", 15)
        .text("Measurements");
      
      // USL
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 35)
        .attr("x2", 15)
        .attr("y2", 35)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .text("Spec Limits");
      
      // Target
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 60)
        .attr("x2", 15)
        .attr("y2", 60)
        .attr("stroke", theme.palette.success.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,3");
      
      legend.append("text")
        .attr("x", 20)
        .attr("y", 65)
        .text("Target");
    }
  };
  
  /**
   * Render distribution chart using D3.js
   */
  const renderDistributionChart = () => {
    if (!distributionChartRef.current || !result?.theoretical) return;
    
    // Clear previous chart
    d3.select(distributionChartRef.current).selectAll("*").remove();
    
    const { xValues, pdfValues } = result.theoretical;
    const measurements = result.measurements;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 40 };
    const width = distributionChartRef.current.clientWidth || 600;
    const height = distributionChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(distributionChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([d3.min(xValues), d3.max(xValues)])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(pdfValues) * 1.1])
      .range([innerHeight, 0]);
    
    // Create histogram for actual measurements
    const histogram = d3.histogram()
      .value(d => d)
      .domain(xScale.domain())
      .thresholds(xScale.ticks(20));
    
    const bins = histogram(measurements);
    
    // Normalize histogram to match PDF scale
    const maxBinCount = d3.max(bins, d => d.length) / measurements.length;
    const normalizedBins = bins.map(bin => ({
      x0: bin.x0,
      x1: bin.x1,
      length: bin.length / measurements.length / (bin.x1 - bin.x0)
    }));
    
    const yHistScale = d3.scaleLinear()
      .domain([0, d3.max(normalizedBins, d => d.length) * 1.1])
      .range([innerHeight, 0]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
    
    svg.append("g")
      .call(yAxis);
    
    // Add axes labels
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .text("Measurement Value");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Probability Density");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Normal Distribution of Measurements");
    
    // Create line generator for PDF
    const lineGenerator = d3.line()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]));
    
    // Add histogram bars
    svg.selectAll(".hist-bar")
      .data(normalizedBins)
      .join("rect")
      .attr("class", "hist-bar")
      .attr("x", d => xScale(d.x0))
      .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
      .attr("y", d => yHistScale(d.length))
      .attr("height", d => innerHeight - yHistScale(d.length))
      .attr("fill", theme.palette.primary.light)
      .attr("opacity", 0.5);
    
    // Add PDF curve with animation
    if (showAnimations && isAnimating) {
      // Create animation path
      const pdPath = svg.append("path")
        .datum(xValues.map((x, i) => [x, pdfValues[i]]))
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", function() {
          const pathLength = this.getTotalLength();
          return `${pathLength} ${pathLength}`;
        })
        .attr("stroke-dashoffset", function() {
          const pathLength = this.getTotalLength();
          return pathLength;
        })
        .attr("d", lineGenerator);
      
      // Animate path
      pdPath.transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);
    } else {
      // Non-animated PDF curve
      svg.append("path")
        .datum(xValues.map((x, i) => [x, pdfValues[i]]))
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 3)
        .attr("d", lineGenerator);
    }
    
    // Add specification limits
    svg.append("line")
      .attr("x1", xScale(upperSpec))
      .attr("y1", 0)
      .attr("x2", xScale(upperSpec))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(upperSpec))
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.error.main)
      .text("USL");
    
    svg.append("line")
      .attr("x1", xScale(lowerSpec))
      .attr("y1", 0)
      .attr("x2", xScale(lowerSpec))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(lowerSpec))
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.error.main)
      .text("LSL");
    
    // Add mean line
    svg.append("line")
      .attr("x1", xScale(mean))
      .attr("y1", 0)
      .attr("x2", xScale(mean))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.success.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");
    
    svg.append("text")
      .attr("x", xScale(mean))
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.success.main)
      .text("Target");
    
    // Fill area outside specification limits
    // Lower spec area
    svg.append("path")
      .datum(xValues.filter(x => x < lowerSpec).map((x, i) => [x, pdfValues[xValues.indexOf(x)]]))
      .attr("fill", theme.palette.error.main)
      .attr("opacity", 0.3)
      .attr("d", d3.area()
        .x(d => xScale(d[0]))
        .y0(innerHeight)
        .y1(d => yScale(d[1]))
      );
    
    // Upper spec area
    svg.append("path")
      .datum(xValues.filter(x => x > upperSpec).map((x, i) => [x, pdfValues[xValues.indexOf(x)]]))
      .attr("fill", theme.palette.error.main)
      .attr("opacity", 0.3)
      .attr("d", d3.area()
        .x(d => xScale(d[0]))
        .y0(innerHeight)
        .y1(d => yScale(d[1]))
      );
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 150}, 0)`);
      
      // PDF curve
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 15)
        .attr("x2", 20)
        .attr("y2", 15)
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 3);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 20)
        .text("Normal Distribution");
      
      // Histogram
      legend.append("rect")
        .attr("x", 0)
        .attr("y", 35)
        .attr("width", 20)
        .attr("height", 10)
        .attr("fill", theme.palette.primary.light)
        .attr("opacity", 0.5);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 45)
        .text("Measured Data");
      
      // Spec limits
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 65)
        .attr("x2", 20)
        .attr("y2", 65)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 70)
        .text("Spec Limits");
    }
  };
  
  /**
   * Render control chart using D3.js
   */
  const renderControlChart = () => {
    if (!controlChartRef.current || !result?.controlChart) return;
    
    // Clear previous chart
    d3.select(controlChartRef.current).selectAll("*").remove();
    
    const { 
      subgroupMeans, 
      subgroupRanges, 
      meanOfMeans, 
      meanOfRanges, 
      xBarUcl, 
      xBarLcl, 
      rChartUcl, 
      rChartLcl 
    } = result.controlChart;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = controlChartRef.current.clientWidth || 600;
    const height = controlChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(controlChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Data to display depends on active tab
    const chartData = activeTab === 0 ? subgroupMeans : subgroupRanges;
    const chartMean = activeTab === 0 ? meanOfMeans : meanOfRanges;
    const chartUcl = activeTab === 0 ? xBarUcl : rChartUcl;
    const chartLcl = activeTab === 0 ? xBarLcl : rChartLcl;
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, chartData.length - 1])
      .range([0, innerWidth]);
    
    const yDomain = activeTab === 0 
      ? [
          Math.min(xBarLcl - 5, d3.min(subgroupMeans)), 
          Math.max(xBarUcl + 5, d3.max(subgroupMeans))
        ]
      : [0, Math.max(rChartUcl * 1.1, d3.max(subgroupRanges) * 1.1)];
    
    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(10, chartData.length))
      .tickFormat(d => (d + 1).toString());
    
    const yAxis = d3.axisLeft(yScale).ticks(5);
    
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);
    
    svg.append("g")
      .call(yAxis);
    
    // Add axes labels
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .text("Subgroup Number");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text(activeTab === 0 ? "Subgroup Mean" : "Subgroup Range");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(activeTab === 0 ? "X-bar Control Chart" : "R Control Chart");
    
    // Add control limits
    // Center line
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(chartMean))
      .attr("x2", innerWidth)
      .attr("y2", yScale(chartMean))
      .attr("stroke", theme.palette.success.main)
      .attr("stroke-width", 2);
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(chartMean) + 15)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.success.main)
      .text("CL");
    
    // Upper control limit
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(chartUcl))
      .attr("x2", innerWidth)
      .attr("y2", yScale(chartUcl))
      .attr("stroke", theme.palette.warning.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(chartUcl) - 5)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.warning.main)
      .text("UCL");
    
    // Lower control limit
    if (chartLcl > 0 || activeTab === 0) {
      svg.append("line")
        .attr("x1", 0)
        .attr("y1", yScale(chartLcl))
        .attr("x2", innerWidth)
        .attr("y2", yScale(chartLcl))
        .attr("stroke", theme.palette.warning.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      svg.append("text")
        .attr("x", innerWidth - 5)
        .attr("y", yScale(chartLcl) + 15)
        .attr("text-anchor", "end")
        .attr("fill", theme.palette.warning.main)
        .text("LCL");
    }
    
    // Create line generator
    const lineGenerator = d3.line()
      .x((_, i) => xScale(i))
      .y(d => yScale(d));
    
    // Add data line with animation
    if (showAnimations && isAnimating) {
      // Animated line
      const visiblePoints = Math.ceil(chartData.length * animationProgress);
      const visibleData = chartData.slice(0, visiblePoints);
      
      svg.append("path")
        .datum(visibleData)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);
      
      // Add visible points
      svg.selectAll(".point")
        .data(visibleData)
        .join("circle")
        .attr("class", "point")
        .attr("cx", (_, i) => xScale(i))
        .attr("cy", d => yScale(d))
        .attr("r", 4)
        .attr("fill", d => {
          if (activeTab === 0) {
            if (d > xBarUcl || d < xBarLcl) return theme.palette.error.main;
          } else {
            if (d > rChartUcl || d < rChartLcl) return theme.palette.error.main;
          }
          return theme.palette.primary.main;
        })
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
    } else {
      // Non-animated line
      svg.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);
      
      // Add data points
      svg.selectAll(".point")
        .data(chartData)
        .join("circle")
        .attr("class", "point")
        .attr("cx", (_, i) => xScale(i))
        .attr("cy", d => yScale(d))
        .attr("r", 4)
        .attr("fill", d => {
          if (activeTab === 0) {
            if (d > xBarUcl || d < xBarLcl) return theme.palette.error.main;
          } else {
            if (d > rChartUcl || d < rChartLcl) return theme.palette.error.main;
          }
          return theme.palette.primary.main;
        })
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .on("mouseover", function(event, d) {
          const [mouseX, mouseY] = d3.pointer(event);
          const i = chartData.indexOf(d);
          setTooltip({
            visible: true,
            x: mouseX + margin.left,
            y: mouseY + margin.top,
            content: `Subgroup ${i+1}<br>Value: ${d.toFixed(2)}<br>CL: ${chartMean.toFixed(2)}`
          });
          d3.select(this).attr("r", 6);
        })
        .on("mouseout", function() {
          setTooltip({ ...tooltip, visible: false });
          d3.select(this).attr("r", 4);
        });
    }
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(10, 0)`);
      
      // Data points
      legend.append("circle")
        .attr("cx", 10)
        .attr("cy", 10)
        .attr("r", 4)
        .attr("fill", theme.palette.primary.main)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
      
      legend.append("text")
        .attr("x", 20)
        .attr("y", 15)
        .text("Subgroup Data");
      
      // Control limits
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 35)
        .attr("x2", 15)
        .attr("y2", 35)
        .attr("stroke", theme.palette.warning.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .text("Control Limits");
      
      // Center line
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 60)
        .attr("x2", 15)
        .attr("y2", 60)
        .attr("stroke", theme.palette.success.main)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 20)
        .attr("y", 65)
        .text("Center Line");
      
      // Out of control
      legend.append("circle")
        .attr("cx", 10)
        .attr("cy", 85)
        .attr("r", 4)
        .attr("fill", theme.palette.error.main)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
      
      legend.append("text")
        .attr("x", 20)
        .attr("y", 90)
        .text("Out of Control");
    }
  };
  
  // Render charts when data changes
  useEffect(() => {
    if (result) {
      renderMeasurementsChart();
      renderDistributionChart();
      renderControlChart();
    }
  }, [result, animationProgress, showLegend, showDataPoints, showAnimations, activeTab]);
  
  // Re-render charts on window resize
  useEffect(() => {
    const handleResize = () => {
      if (result) {
        renderMeasurementsChart();
        renderDistributionChart();
        renderControlChart();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [result, activeTab]);
  
  // Component UI
  return (
    <Box>
      <Grid container spacing={3}>
        {/* Parameters Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Simulation Parameters
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Target Value (Mean): {mean}
              </Typography>
              <Slider
                value={mean}
                onChange={(e, newValue) => setMean(newValue)}
                min={50}
                max={150}
                step={1}
                marks={[
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                  { value: 150, label: '150' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Process Variation (Std Dev): {stdDev}
              </Typography>
              <Slider
                value={stdDev}
                onChange={(e, newValue) => setStdDev(newValue)}
                min={1}
                max={10}
                step={0.5}
                marks={[
                  { value: 1, label: '1' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Lower Specification Limit: {lowerSpec}
              </Typography>
              <Slider
                value={lowerSpec}
                onChange={(e, newValue) => setLowerSpec(newValue)}
                min={mean - 4 * stdDev}
                max={mean - stdDev}
                step={1}
                marks={[
                  { value: mean - 3 * stdDev, label: `-3σ` },
                  { value: mean - 2 * stdDev, label: `-2σ` }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Upper Specification Limit: {upperSpec}
              </Typography>
              <Slider
                value={upperSpec}
                onChange={(e, newValue) => setUpperSpec(newValue)}
                min={mean + stdDev}
                max={mean + 4 * stdDev}
                step={1}
                marks={[
                  { value: mean + 2 * stdDev, label: `+2σ` },
                  { value: mean + 3 * stdDev, label: `+3σ` }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Sample Size: {sampleSize}
              </Typography>
              <Slider
                value={sampleSize}
                onChange={(e, newValue) => setSampleSize(newValue)}
                min={10}
                max={100}
                step={5}
                marks={[
                  { value: 10, label: '10' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
              />
            </Box>
            
            {/* Show/hide advanced settings */}
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => setShowControls(!showControls)}
                sx={{ mb: 2 }}
              >
                {showControls ? 'Hide' : 'Show'} Visualization Settings
              </Button>
              
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="body2" gutterBottom fontWeight="medium">
                        Visualization Settings
                      </Typography>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showAnimations}
                            onChange={(e) => setShowAnimations(e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Show Animations"
                      />
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showDataPoints}
                            onChange={(e) => setShowDataPoints(e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Show Data Points"
                      />
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showLegend}
                            onChange={(e) => setShowLegend(e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Show Legend"
                      />
                    </Paper>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
            
            {/* Action buttons */}
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={runSimulation}
                  disabled={isAnimating}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  {isAnimating ? 
                    <CircularProgress size={24} color="inherit" /> : 
                    'Run Simulation'}
                </Button>
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={() => {
                    setSimulationResult(null);
                    setIsAnimating(false);
                  }}
                  disabled={!result || isAnimating}
                  fullWidth
                >
                  Reset
                </Button>
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    // In a real app, we would implement export functionality
                    alert("Export functionality would be implemented here");
                  }}
                  disabled={!result || isAnimating}
                  fullWidth
                >
                  Export
                </Button>
              </Grid>
            </Grid>
            
            {/* Results summary section */}
            {result && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Simulation Results
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderLeft: '4px solid', 
                                             borderColor: result.capability.cpk < 1 ? 'error.main' : 
                                                        result.capability.cpk < 1.33 ? 'warning.main' : 'success.main' }}>
                  <Typography variant="body2" fontWeight="medium">
                    <strong>Process Capability (Cp):</strong> {result.capability.cp.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    <strong>Process Capability Index (Cpk):</strong> {result.capability.cpk.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    <strong>Defect Rate:</strong> {(result.capability.defectRate * 100).toFixed(4)}%
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    <strong>DPMO:</strong> {Math.round(result.capability.dpmo)}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    <strong>Sigma Level:</strong> {result.capability.sigmaLevel.toFixed(1)}σ
                  </Typography>
                </Paper>
                
                {result.outOfSpecCount > 0 && (
                  <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                    {result.outOfSpecCount} out of {result.measurements.length} measurements are outside specification limits.
                  </Alert>
                )}
                
                {result.outOfControlCount > 0 && (
                  <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
                    {result.outOfControlCount} measurements are outside control limits (±3σ).
                  </Alert>
                )}
                
                {result.capability.cpk < 1 && (
                  <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                    Process is not capable (Cpk &lt; 1.0). Consider improving the process or widening specifications.
                  </Alert>
                )}
                
                {result.capability.cpk >= 1 && result.capability.cpk < 1.33 && (
                  <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
                    Process is marginally capable (1.0 &lt; Cpk &lt; 1.33). Consider process improvements.
                  </Alert>
                )}
                
                {result.capability.cpk >= 1.33 && (
                  <Alert severity="success" sx={{ mt: 1, mb: 1 }}>
                    Process is capable (Cpk &gt; 1.33). Continue to monitor for stability.
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
          
          {/* Educational details */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Normal Distribution Model
              </Typography>
              
              <Tooltip title="The Normal distribution is commonly used to model manufacturing process variation. It forms the theoretical foundation for Statistical Process Control.">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="body2" paragraph>
              The Normal (Gaussian) distribution is a continuous probability distribution that is 
              symmetric about the mean. In manufacturing, it's used to model the natural variation 
              in measurements due to common causes.
            </Typography>
            
            <Box sx={{ my: 2, bgcolor: 'background.paper', borderRadius: 1, p: 2, 
                    border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                Normal PDF (Probability Density Function):
              </Typography>
              
              <Box sx={{ my: 1, textAlign: 'center' }}
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex("f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}") 
                }}
              />
              
              <Typography variant="body2" gutterBottom>
                Where:
              </Typography>
              <Typography variant="body2">
                • μ (mu) = mean (target value) = {mean}
              </Typography>
              <Typography variant="body2">
                • σ (sigma) = standard deviation = {stdDev}
              </Typography>
              <Typography variant="body2">
                • x = measurement value
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom fontWeight="medium">
              Process Capability Indices:
            </Typography>
            <Typography variant="body2">
              • <strong>Cp</strong> = (USL - LSL) / (6σ) - measures the potential capability
            </Typography>
            <Typography variant="body2">
              • <strong>Cpk</strong> = min[(USL - μ) / (3σ), (μ - LSL) / (3σ)] - measures actual capability
            </Typography>
            <Typography variant="body2">
              • <strong>Sigma Level</strong> - relates to defects per million opportunities (DPMO)
            </Typography>
            <Typography variant="body2">
              • For a capable process, Cpk ≥ 1.33 is generally desired
            </Typography>
          </Paper>
        </Grid>
        
        {/* Visualization Panel */}
        <Grid item xs={12} md={8}>
          {result ? (
            <Box>
              {/* Measurements Chart */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ height: 300 }} ref={measurementsChartRef} />
              </Paper>
              
              {/* Distribution Chart */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ height: 300 }} ref={distributionChartRef} />
              </Paper>
              
              {/* Control Chart */}
              <Paper sx={{ p: 2 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{ mb: 2 }}
                  centered
                >
                  <Tab label="X-bar Chart" />
                  <Tab label="R Chart" />
                </Tabs>
                
                <Box sx={{ height: 300 }} ref={controlChartRef} />
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px dashed', 
                         borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                    Insights from Statistical Process Control:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Control charts help distinguish between common cause variation (natural to the process)
                    and special cause variation (assignable causes that should be identified and eliminated).
                  </Typography>
                  <Typography variant="body2">
                    {activeTab === 0 ? 
                      "The X-bar chart monitors the process average over time. Points outside control limits indicate a shift in the process mean." :
                      "The R chart monitors the process variability. Points outside control limits indicate changes in process consistency or precision."}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', 
                        flexDirection: 'column', justifyContent: 'center' }}>
              <FactoryIcon sx={{ fontSize: 80, color: 'text.secondary', mx: 'auto', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Simulation Data
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Set the parameters and click "Run Simulation" to visualize manufacturing process quality control
                using the Normal distribution.
              </Typography>
              
              <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="medium">
                  What you'll learn:
                </Typography>
                <Typography variant="body2" paragraph>
                  • How the Normal distribution models manufacturing process variation
                </Typography>
                <Typography variant="body2" paragraph>
                  • How to interpret process capability indices (Cp, Cpk)
                </Typography>
                <Typography variant="body2" paragraph>
                  • How control charts help monitor process stability
                </Typography>
                <Typography variant="body2" paragraph>
                  • How to relate defect rates to sigma levels
                </Typography>
              </Box>
              
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 3, mx: 'auto' }}
                onClick={runSimulation}
              >
                Run Simulation
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>
      
      {/* Custom tooltip */}
      {tooltip.visible && (
        <div 
          style={{
            position: 'absolute',
            top: tooltip.y,
            left: tooltip.x,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: '200px'
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </Box>
  );
};

export default QualityControlD3;