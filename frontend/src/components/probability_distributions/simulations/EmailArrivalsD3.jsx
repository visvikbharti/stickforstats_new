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
  useMediaQuery
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import EmailIcon from '@mui/icons-material/Email';
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
 * Enhanced Email Arrivals simulation using D3.js
 * 
 * This component demonstrates how email arrivals follow a Poisson distribution
 * with interactive visualization and educational content
 */
const EmailArrivalsD3 = ({ projectId, setLoading, setError, setSimulationResult, result }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Main simulation parameters
  const [hourlyRate, setHourlyRate] = useState(20);
  const [workdayHours, setWorkdayHours] = useState(8);
  const [serverCapacity, setServerCapacity] = useState(200);
  
  // Chart refs
  const hourlyChartRef = useRef(null);
  const distributionChartRef = useRef(null);
  
  // Advanced state
  const [showAnimations, setShowAnimations] = useState(true);
  const [showDataPoints, setShowDataPoints] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showControls, setShowControls] = useState(false);
  
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
   * Generate Poisson distributed random number
   * @param {number} lambda - Rate parameter
   * @returns {number} Poisson random variate
   */
  const generatePoissonRandom = (lambda) => {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    
    return k - 1;
  };
  
  /**
   * Generate email arrivals for each hour of the workday
   * @returns {Array} Hourly email counts
   */
  const generateHourlyArrivals = () => {
    return Array.from({ length: workdayHours }, () => 
      generatePoissonRandom(hourlyRate)
    );
  };
  
  /**
   * Calculate Poisson PMF (Probability Mass Function)
   * @param {number} k - Number of events
   * @param {number} lambda - Rate parameter
   * @returns {number} Probability
   */
  const poissonPMF = (k, lambda) => {
    // Base case
    if (k < 0) return 0;
    
    // Calculate log factorial to avoid overflow
    const logFactorial = (n) => {
      let result = 0;
      for (let i = 2; i <= n; i++) {
        result += Math.log(i);
      }
      return result;
    };
    
    // Calculate PMF using logarithms for numerical stability
    const logPMF = k * Math.log(lambda) - lambda - logFactorial(k);
    return Math.exp(logPMF);
  };
  
  /**
   * Calculate Poisson CDF (Cumulative Distribution Function)
   * @param {number} k - Number of events
   * @param {number} lambda - Rate parameter
   * @returns {number} Cumulative probability
   */
  const poissonCDF = (k, lambda) => {
    let sum = 0;
    for (let i = 0; i <= k; i++) {
      sum += poissonPMF(i, lambda);
    }
    return sum;
  };
  
  /**
   * Generate theoretical Poisson distribution data
   * @returns {Object} Distribution data
   */
  const generateTheoreticalDistribution = () => {
    const totalHours = workdayHours;
    const dailyRate = hourlyRate * totalHours;
    
    // Calculate reasonable range for k values
    const maxK = Math.min(Math.max(Math.ceil(dailyRate + 4 * Math.sqrt(dailyRate)), serverCapacity + 20), 500);
    const kValues = Array.from({ length: maxK + 1 }, (_, i) => i);
    
    // Calculate PMF and CDF values
    const pmfValues = kValues.map(k => poissonPMF(k, dailyRate));
    const cdfValues = kValues.map(k => poissonCDF(k, dailyRate));
    
    return { kValues, pmfValues, cdfValues, dailyRate };
  };
  
  /**
   * Generate simulation data
   * @returns {Object} Simulation result
   */
  const runClientSimulation = () => {
    // Generate hourly arrivals
    const hourlyArrivals = generateHourlyArrivals();
    const totalArrivals = hourlyArrivals.reduce((sum, count) => sum + count, 0);
    
    // Calculate theoretical distribution
    const { kValues, pmfValues, cdfValues, dailyRate } = generateTheoreticalDistribution();
    
    // Create observed distribution
    // In a real simulation, this would come from many days of data
    // Here we're just using the single simulation
    const observedPMF = Array(kValues.length).fill(0);
    observedPMF[totalArrivals] = 1; // Single observation at the total count
    
    return {
      hourly_arrivals: hourlyArrivals,
      total_arrivals: totalArrivals,
      k_values: kValues,
      theoretical_pmf: pmfValues,
      theoretical_cdf: cdfValues,
      observed_pmf: observedPMF,
      daily_rate: dailyRate,
      exceeds_capacity: totalArrivals > serverCapacity
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
      console.error('Error simulating email arrivals:', err);
      setError('Error running simulation');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate probability of exceeding server capacity
  const calculateExceedProbability = (result) => {
    if (!result) return 0;
    
    const dailyRate = result.daily_rate || hourlyRate * workdayHours;
    
    // Find index of server capacity in k_values
    const capacityIndex = result.k_values.findIndex(k => k >= serverCapacity);
    
    if (capacityIndex === -1) return 0;
    
    return 1 - result.theoretical_cdf[capacityIndex];
  };
  
  // Check if capacity was exceeded in simulation
  const wasCapacityExceeded = (result) => {
    return result?.exceeds_capacity || (result?.total_arrivals > serverCapacity);
  };
  
  const exceedProbability = result ? calculateExceedProbability(result) : 0;
  const exceededCapacity = result ? wasCapacityExceeded(result) : false;
  
  // D3.js Visualization Functions
  
  /**
   * Render hourly email arrivals chart using D3.js
   */
  const renderHourlyArrivalsChart = () => {
    if (!hourlyChartRef.current || !result?.hourly_arrivals) return;
    
    // Clear previous chart
    d3.select(hourlyChartRef.current).selectAll("*").remove();
    
    const hourlyData = result.hourly_arrivals;
    const expectedRate = Array(workdayHours).fill(hourlyRate);
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = hourlyChartRef.current.clientWidth || 600;
    const height = hourlyChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(hourlyChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(hourlyData.map((_, i) => `Hour ${i+1}`))
      .range([0, innerWidth])
      .padding(0.3);
    
    const maxValue = Math.max(
      ...hourlyData, 
      hourlyRate * 1.5 // Show at least 1.5x the expected rate
    );
    
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).ticks(5);
    
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");
    
    svg.append("g")
      .call(yAxis);
    
    // Add axes labels
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .text("Hour of Day");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Number of Emails");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Hourly Email Arrivals");
    
    // Define gradients
    const defs = svg.append("defs");
    
    const barGradient = defs.append("linearGradient")
      .attr("id", "bar-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", yScale(0))
      .attr("x2", 0).attr("y2", yScale(maxValue));
    
    barGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", theme.palette.info.light)
      .attr("stop-opacity", 0.3);
    
    barGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", theme.palette.info.main)
      .attr("stop-opacity", 0.9);
    
    // Animation function - only show bars up to the animation progress
    const getBarHeight = (d, i) => {
      if (!showAnimations || !isAnimating) {
        return innerHeight - yScale(d);
      }
      
      const targetHeight = innerHeight - yScale(d);
      const barProgress = Math.min(1, animationProgress * (workdayHours / (i + 1)));
      return targetHeight * barProgress;
    };
    
    // Add bars with animations
    svg.selectAll(".bar")
      .data(hourlyData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (_, i) => xScale(`Hour ${i+1}`))
      .attr("width", xScale.bandwidth())
      .attr("y", d => innerHeight - getBarHeight(d, 0)) // Start at the bottom
      .attr("height", (d, i) => getBarHeight(d, i))
      .attr("fill", "url(#bar-gradient)")
      .attr("rx", 3) // Rounded corners
      .attr("ry", 3)
      .on("mouseover", function(event, d) {
        const [mouseX, mouseY] = d3.pointer(event);
        setTooltip({
          visible: true,
          x: mouseX + margin.left,
          y: mouseY + margin.top,
          content: `Hour: ${hourlyData.indexOf(d) + 1}<br>Emails: ${d}<br>Expected: ${hourlyRate}`
        });
        d3.select(this).attr("fill", theme.palette.primary.main);
      })
      .on("mouseout", function() {
        setTooltip({ ...tooltip, visible: false });
        d3.select(this).attr("fill", "url(#bar-gradient)");
      });
    
    // Add expected rate line
    const lineGenerator = d3.line()
      .x((_, i) => xScale(`Hour ${i+1}`) + xScale.bandwidth() / 2)
      .y(d => yScale(d));
    
    svg.append("path")
      .datum(expectedRate)
      .attr("fill", "none")
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("d", lineGenerator);
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 120}, 0)`);
      
      // Actual emails bar
      legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", theme.palette.info.main)
        .attr("rx", 3)
        .attr("ry", 3);
      
      legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .text("Actual Emails");
      
      // Expected rate line
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 30)
        .attr("x2", 18)
        .attr("y2", 30)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 24)
        .attr("y", 30)
        .attr("dy", "0.35em")
        .text("Expected Rate");
    }
  };
  
  /**
   * Render distribution chart using D3.js
   */
  const renderDistributionChart = () => {
    if (!distributionChartRef.current || !result?.k_values) return;
    
    // Clear previous chart
    d3.select(distributionChartRef.current).selectAll("*").remove();
    
    const { k_values, theoretical_pmf, observed_pmf } = result;
    
    // Find reasonable range to display
    const lambda = hourlyRate * workdayHours;
    const minK = Math.max(0, Math.floor(lambda - 3 * Math.sqrt(lambda)));
    const maxK = Math.min(Math.ceil(lambda + 3 * Math.sqrt(lambda)), k_values.length - 1);
    
    // Filter data to reasonable range
    const displayedK = k_values.slice(minK, maxK + 1);
    const displayedPMF = theoretical_pmf.slice(minK, maxK + 1);
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
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
    const xScale = d3.scaleBand()
      .domain(displayedK.map(k => k.toString()))
      .range([0, innerWidth])
      .padding(0.2);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(displayedPMF) * 1.1])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .tickValues(xScale.domain().filter((_, i) => i % Math.ceil(displayedK.length / 10) === 0));
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d3.format(".1%"));
    
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
      .text("Number of Emails per Day");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Probability");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Daily Email Volume Distribution");
    
    // Define gradient
    const defs = svg.append("defs");
    
    const barGradient = defs.append("linearGradient")
      .attr("id", "dist-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", yScale(0))
      .attr("x2", 0).attr("y2", yScale(d3.max(displayedPMF)));
    
    barGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", theme.palette.success.light)
      .attr("stop-opacity", 0.3);
    
    barGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", theme.palette.success.main)
      .attr("stop-opacity", 0.9);
    
    // Add theoretical distribution bars with animation
    svg.selectAll(".theory-bar")
      .data(displayedPMF)
      .join("rect")
      .attr("class", "theory-bar")
      .attr("x", (_, i) => xScale(displayedK[i].toString()))
      .attr("width", xScale.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", (_, i) => {
        // Highlight values that exceed server capacity
        if (displayedK[i] > serverCapacity) {
          return theme.palette.error.light;
        }
        return "url(#dist-gradient)";
      })
      .attr("rx", 3)
      .attr("ry", 3)
      .transition()
      .duration(showAnimations ? 1000 : 0)
      .delay((_, i) => showAnimations ? i * 10 : 0)
      .attr("y", d => yScale(d))
      .attr("height", d => innerHeight - yScale(d));
      
    // Add server capacity line
    if (serverCapacity >= minK && serverCapacity <= maxK) {
      svg.append("line")
        .attr("x1", xScale(serverCapacity.toString()) + xScale.bandwidth() / 2)
        .attr("y1", 0)
        .attr("x2", xScale(serverCapacity.toString()) + xScale.bandwidth() / 2)
        .attr("y2", innerHeight)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      svg.append("text")
        .attr("x", xScale(serverCapacity.toString()) + xScale.bandwidth() / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .attr("fill", theme.palette.error.main)
        .attr("font-size", "12px")
        .text("Server Capacity");
    }
    
    // Add mean indicator line
    svg.append("line")
      .attr("x1", xScale(Math.round(lambda).toString()) + xScale.bandwidth() / 2)
      .attr("y1", 0)
      .attr("x2", xScale(Math.round(lambda).toString()) + xScale.bandwidth() / 2)
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.info.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");
    
    svg.append("text")
      .attr("x", xScale(Math.round(lambda).toString()) + xScale.bandwidth() / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.info.main)
      .attr("font-size", "12px")
      .text("Mean");
    
    // Add area for probability of exceeding
    if (exceedProbability > 0.001) {
      // Find first k that exceeds server capacity
      const exceedIndex = displayedK.findIndex(k => k > serverCapacity);
      if (exceedIndex !== -1) {
        // Highlight area
        for (let i = exceedIndex; i < displayedK.length; i++) {
          svg.append("rect")
            .attr("x", xScale(displayedK[i].toString()))
            .attr("width", xScale.bandwidth())
            .attr("y", yScale(displayedPMF[i]))
            .attr("height", innerHeight - yScale(displayedPMF[i]))
            .attr("fill", theme.palette.error.main)
            .attr("opacity", 0.3);
        }
        
        // Add probability label
        svg.append("text")
          .attr("x", xScale(displayedK[Math.min(exceedIndex + 3, displayedK.length - 1)].toString()))
          .attr("y", yScale(displayedPMF[exceedIndex] / 2))
          .attr("text-anchor", "middle")
          .attr("fill", theme.palette.error.main)
          .attr("font-size", "12px")
          .text(`P(exceed) = ${(exceedProbability * 100).toFixed(2)}%`);
      }
    }
    
    // Add actual simulation result if available and enabled
    if (showDataPoints && result.total_arrivals) {
      // Only show if within display range
      if (result.total_arrivals >= minK && result.total_arrivals <= maxK) {
        const displayIndex = displayedK.indexOf(result.total_arrivals);
        
        if (displayIndex !== -1) {
          svg.append("circle")
            .attr("cx", xScale(result.total_arrivals.toString()) + xScale.bandwidth() / 2)
            .attr("cy", yScale(displayedPMF[displayIndex]))
            .attr("r", 8)
            .attr("fill", theme.palette.warning.main)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("opacity", 0.8);
          
          svg.append("text")
            .attr("x", xScale(result.total_arrivals.toString()) + xScale.bandwidth() / 2)
            .attr("y", yScale(displayedPMF[displayIndex]) - 15)
            .attr("text-anchor", "middle")
            .attr("fill", theme.palette.warning.dark)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text("Simulation");
        }
      }
    }
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 140}, 0)`);
      
      // Theoretical distribution
      legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", theme.palette.success.main)
        .attr("rx", 3)
        .attr("ry", 3);
      
      legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .text("Poisson Distribution");
      
      // Server capacity
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 30)
        .attr("x2", 18)
        .attr("y2", 30)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 24)
        .attr("y", 30)
        .attr("dy", "0.35em")
        .text("Server Capacity");
      
      // Simulation point
      if (showDataPoints) {
        legend.append("circle")
          .attr("cx", 9)
          .attr("cy", 50)
          .attr("r", 6)
          .attr("fill", theme.palette.warning.main)
          .attr("stroke", "white")
          .attr("stroke-width", 2);
        
        legend.append("text")
          .attr("x", 24)
          .attr("y", 50)
          .attr("dy", "0.35em")
          .text("Simulation Result");
      }
    }
  };
  
  // Render charts when data changes
  useEffect(() => {
    if (result) {
      renderHourlyArrivalsChart();
      renderDistributionChart();
    }
  }, [result, animationProgress, showLegend, showDataPoints, showAnimations]);
  
  // Re-render charts on window resize
  useEffect(() => {
    const handleResize = () => {
      if (result) {
        renderHourlyArrivalsChart();
        renderDistributionChart();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [result]);
  
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
                Average Email Arrival Rate (per hour): {hourlyRate}
              </Typography>
              <Slider
                value={hourlyRate}
                onChange={(e, newValue) => setHourlyRate(newValue)}
                min={1}
                max={100}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Workday Length (hours): {workdayHours}
              </Typography>
              <Slider
                value={workdayHours}
                onChange={(e, newValue) => setWorkdayHours(newValue)}
                min={1}
                max={24}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 8, label: '8' },
                  { value: 24, label: '24' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Server Daily Capacity (emails): {serverCapacity}
              </Typography>
              <Slider
                value={serverCapacity}
                onChange={(e, newValue) => setServerCapacity(newValue)}
                min={Math.max(50, hourlyRate * workdayHours / 2)}
                max={Math.max(500, hourlyRate * workdayHours * 2)}
                step={10}
                marks={[
                  { value: Math.max(50, hourlyRate * workdayHours / 2), label: 'Min' },
                  { value: hourlyRate * workdayHours, label: 'Mean' },
                  { value: Math.max(500, hourlyRate * workdayHours * 2), label: 'Max' }
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
                                              borderColor: exceededCapacity ? 'error.main' : 'primary.main' }}>
                  <Typography variant="body2" fontWeight="medium">
                    <strong>Expected emails per day:</strong> {hourlyRate * workdayHours}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    <strong>Simulated total emails:</strong> {result.total_arrivals}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    <strong>Server capacity:</strong> {serverCapacity} emails/day
                  </Typography>
                </Paper>
                
                <Typography variant="body2" gutterBottom>
                  <strong>Probability of exceeding capacity:</strong> {(exceedProbability * 100).toFixed(2)}%
                </Typography>
                
                {exceedProbability > 0.1 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    There is a {(exceedProbability * 100).toFixed(2)}% risk of exceeding server capacity, which is significant.
                    Consider increasing capacity or optimizing email processing.
                  </Alert>
                )}
                
                {exceededCapacity && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    In this simulation, the server capacity was exceeded by {result.total_arrivals - serverCapacity} emails.
                  </Alert>
                )}
                
                {exceedProbability < 0.01 && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    The server capacity is adequate with only a {(exceedProbability * 100).toFixed(2)}% risk of being exceeded.
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
          
          {/* Educational details */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Poisson Process Model
              </Typography>
              
              <Tooltip title="The Poisson distribution is commonly used to model the number of events occurring within a fixed interval of time when these events happen at a constant average rate independently of each other.">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="body2" paragraph>
              The Poisson distribution models random events occurring at a constant average rate,
              independent of the time since the last event. This makes it ideal for modeling email arrivals
              and many other real-world phenomena.
            </Typography>
            
            <Box sx={{ my: 2, bgcolor: 'background.paper', borderRadius: 1, p: 2, 
                     border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                Poisson PMF (Probability Mass Function):
              </Typography>
              
              <Box sx={{ my: 1, textAlign: 'center' }}
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex("P(X = k) = \\frac{e^{-\\lambda} \\lambda^k}{k!}") 
                }}
              />
              
              <Typography variant="body2" gutterBottom>
                Where:
              </Typography>
              <Typography variant="body2">
                • λ (lambda) = average number of events (emails per day) = {hourlyRate * workdayHours}
              </Typography>
              <Typography variant="body2">
                • k = specific number of emails
              </Typography>
              <Typography variant="body2">
                • e = mathematical constant ≈ 2.71828
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom fontWeight="medium">
              Why the Poisson model is appropriate:
            </Typography>
            <Typography variant="body2">
              • Email arrivals are independent events
            </Typography>
            <Typography variant="body2">
              • Arrivals occur at an approximately constant rate
            </Typography>
            <Typography variant="body2">
              • The probability of two emails arriving at exactly the same instant is negligible
            </Typography>
            <Typography variant="body2">
              • The Poisson distribution is used in many real-world applications including
                telecommunications, website traffic, and customer service
            </Typography>
          </Paper>
        </Grid>
        
        {/* Visualization Panel */}
        <Grid item xs={12} md={8}>
          {result ? (
            <Box>
              {/* Hourly Email Arrivals Chart */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ height: 300 }} ref={hourlyChartRef} />
              </Paper>
              
              {/* Daily Email Volume Distribution Chart */}
              <Paper sx={{ p: 2 }}>
                <Box sx={{ height: 300 }} ref={distributionChartRef} />
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px dashed', 
                         borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                    Insights from the Simulation:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    This simulation demonstrates how the Poisson distribution models the random variability
                    in daily email volumes. Understanding this variability is critical for capacity planning 
                    and ensuring service reliability.
                  </Typography>
                  <Typography variant="body2">
                    The server capacity should be set to handle peak loads, not just the average. A good rule of thumb
                    is to plan for capacity that covers at least the 95th or 99th percentile of the expected distribution.
                  </Typography>
                </Box>
              </Paper>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', 
                        flexDirection: 'column', justifyContent: 'center' }}>
              <EmailIcon sx={{ fontSize: 80, color: 'text.secondary', mx: 'auto', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Simulation Data
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Set the parameters and click "Run Simulation" to visualize email arrivals 
                using the Poisson distribution.
              </Typography>
              
              <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="medium">
                  What you'll learn:
                </Typography>
                <Typography variant="body2" paragraph>
                  • How the Poisson distribution models random events occurring at a constant rate
                </Typography>
                <Typography variant="body2" paragraph>
                  • How to calculate the probability of exceeding server capacity
                </Typography>
                <Typography variant="body2" paragraph>
                  • How to use statistical distributions for capacity planning
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

export default EmailArrivalsD3;