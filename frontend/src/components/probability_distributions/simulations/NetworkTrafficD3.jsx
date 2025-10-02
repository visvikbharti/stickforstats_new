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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import RouterIcon from '@mui/icons-material/Router';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';

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
 * Enhanced Network Traffic simulation using D3.js
 * 
 * This component demonstrates queueing theory concepts in network traffic
 * with interactive visualizations for Poisson arrivals and service times
 */
const NetworkTrafficD3 = ({ projectId, setLoading, setError, setSimulationResult, result }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Main simulation parameters
  const [arrivalRate, setArrivalRate] = useState(5); // λ: Average packet arrivals per second
  const [serviceRate, setServiceRate] = useState(8); // μ: Average packets serviced per second
  const [bufferSize, setBufferSize] = useState(10); // K: Maximum queue length (number of packets)
  const [simulationTime, setSimulationTime] = useState(60); // seconds to simulate
  
  // Derived metrics
  const trafficIntensity = arrivalRate / serviceRate; // ρ (rho): Traffic intensity
  
  // Chart refs
  const queueSizeChartRef = useRef(null);
  const utilizationChartRef = useRef(null);
  const simulationChartRef = useRef(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState(0);
  
  // Advanced state
  const [showAnimations, setShowAnimations] = useState(true);
  const [showDataPoints, setShowDataPoints] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  
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
   * Generate exponentially distributed random number
   * @param {number} rate - Rate parameter
   * @returns {number} Exponential random variate
   */
  const generateExponentialRandom = (rate) => {
    return -Math.log(Math.random()) / rate;
  };
  
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
   * Run network traffic simulation using discrete event simulation
   * @returns {Object} Simulation results
   */
  const runNetworkSimulation = () => {
    // Initialize simulation state
    let currentTime = 0;
    let queueSize = 0;
    let busyTime = 0;
    let lastEventTime = 0;
    let nextArrivalTime = generateExponentialRandom(arrivalRate);
    let nextDepartureTime = Infinity; // No departure until first arrival
    
    // Statistics collection
    const timePoints = [0];
    const queueSizes = [0];
    const arrivals = [0];
    const departures = [0];
    const totalArrivals = [0];
    const totalDepartures = [0];
    const serverStates = [0]; // 0 = idle, 1 = busy
    const packetsDropped = [];
    
    let totalPacketsGenerated = 0;
    let totalPacketsProcessed = 0;
    let totalPacketsDropped = 0;
    
    // Run simulation until simulationTime
    while (currentTime < simulationTime) {
      // Determine next event
      if (nextArrivalTime < nextDepartureTime) {
        // Next event is an arrival
        currentTime = nextArrivalTime;
        timePoints.push(currentTime);
        
        // Update statistics for time between events
        if (queueSize > 0 || nextDepartureTime < Infinity) {
          busyTime += currentTime - lastEventTime;
        }
        lastEventTime = currentTime;
        
        // Process arrival
        totalPacketsGenerated++;
        
        if (queueSize < bufferSize) {
          // Packet can be added to queue
          queueSize++;
          
          // If server was idle, schedule a departure
          if (queueSize === 1) {
            nextDepartureTime = currentTime + generateExponentialRandom(serviceRate);
          }
          
          totalArrivals[totalArrivals.length - 1]++;
          arrivals.push(1);
          departures.push(0);
        } else {
          // Packet is dropped (buffer full)
          totalPacketsDropped++;
          packetsDropped.push(currentTime);
          arrivals.push(0);
          departures.push(0);
        }
        
        // Schedule next arrival
        nextArrivalTime = currentTime + generateExponentialRandom(arrivalRate);
        
        // Record state
        queueSizes.push(queueSize);
        totalArrivals.push(totalArrivals[totalArrivals.length - 1]);
        totalDepartures.push(totalDepartures[totalDepartures.length - 1]);
        serverStates.push(queueSize > 0 ? 1 : 0);
      } else {
        // Next event is a departure
        currentTime = nextDepartureTime;
        timePoints.push(currentTime);
        
        // Update statistics for time between events
        if (queueSize > 0) {
          busyTime += currentTime - lastEventTime;
        }
        lastEventTime = currentTime;
        
        // Process departure
        queueSize--;
        totalPacketsProcessed++;
        
        // Schedule next departure if queue is not empty
        if (queueSize > 0) {
          nextDepartureTime = currentTime + generateExponentialRandom(serviceRate);
        } else {
          nextDepartureTime = Infinity; // No more departures until next arrival
        }
        
        // Record state
        queueSizes.push(queueSize);
        totalDepartures[totalDepartures.length - 1]++;
        arrivals.push(0);
        departures.push(1);
        totalArrivals.push(totalArrivals[totalArrivals.length - 1]);
        totalDepartures.push(totalDepartures[totalDepartures.length - 1]);
        serverStates.push(queueSize > 0 ? 1 : 0);
      }
    }
    
    // Calculate performance metrics
    const avgQueueSize = calculateAverageQueueSize(timePoints, queueSizes);
    const utilizationRate = busyTime / simulationTime;
    const blockingProbability = totalPacketsDropped / totalPacketsGenerated;
    const throughput = totalPacketsProcessed / simulationTime;
    
    // Calculate average waiting time using Little's Law
    // avg waiting time = avg queue size / throughput (for non-dropped packets)
    const avgWaitingTime = avgQueueSize / (throughput || 1);
    
    // Calculate distribution of queue size
    const queueSizeDistribution = Array(bufferSize + 1).fill(0);
    
    // Calculate time spent at each queue size
    for (let i = 1; i < timePoints.length; i++) {
      const timeSpent = timePoints[i] - timePoints[i - 1];
      const size = queueSizes[i - 1];
      queueSizeDistribution[size] += timeSpent / simulationTime;
    }
    
    // Calculate theoretical metrics
    const theoreticalMetrics = calculateTheoreticalMetrics(arrivalRate, serviceRate, bufferSize);
    
    return {
      simulationData: {
        timePoints,
        queueSizes,
        arrivals,
        departures,
        totalArrivals,
        totalDepartures,
        serverStates,
        packetsDropped
      },
      metrics: {
        avgQueueSize,
        utilizationRate,
        blockingProbability,
        throughput,
        avgWaitingTime,
        totalPacketsGenerated,
        totalPacketsProcessed,
        totalPacketsDropped
      },
      queueSizeDistribution,
      theoreticalMetrics,
      parameters: {
        arrivalRate,
        serviceRate,
        bufferSize,
        simulationTime,
        trafficIntensity
      }
    };
  };
  
  /**
   * Calculate average queue size from simulation data
   * @param {Array} timePoints - Array of time points
   * @param {Array} queueSizes - Array of queue sizes at each time point
   * @returns {number} Average queue size
   */
  const calculateAverageQueueSize = (timePoints, queueSizes) => {
    let totalQueueTimeProduct = 0;
    let totalTime = timePoints[timePoints.length - 1];
    
    for (let i = 1; i < timePoints.length; i++) {
      const timeInterval = timePoints[i] - timePoints[i - 1];
      totalQueueTimeProduct += queueSizes[i - 1] * timeInterval;
    }
    
    return totalQueueTimeProduct / totalTime;
  };
  
  /**
   * Calculate theoretical metrics for M/M/1/K queue
   * @param {number} lambda - Arrival rate
   * @param {number} mu - Service rate
   * @param {number} K - Buffer size
   * @returns {Object} Theoretical metrics
   */
  const calculateTheoreticalMetrics = (lambda, mu, K) => {
    const rho = lambda / mu; // Traffic intensity
    
    // Handle special case when rho = 1
    if (Math.abs(rho - 1) < 0.001) {
      const blockingProb = 1 / (K + 1);
      const utilization = 1 - blockingProb;
      const avgQueueSize = K / 2;
      const throughput = lambda * (1 - blockingProb);
      const avgWaitingTime = avgQueueSize / throughput;
      
      return {
        blockingProbability: blockingProb,
        utilization,
        avgQueueSize,
        throughput,
        avgWaitingTime
      };
    }
    
    // General case when rho != 1
    const denominator = 1 - Math.pow(rho, K + 1);
    const blockingProb = (1 - rho) * Math.pow(rho, K) / denominator;
    const utilization = rho * (1 - Math.pow(rho, K)) / denominator;
    
    // Average number of packets in the system
    const avgQueueSize = rho * (1 - (K + 1) * Math.pow(rho, K) + K * Math.pow(rho, K + 1)) 
                         / ((1 - rho) * denominator);
    
    // Throughput
    const throughput = lambda * (1 - blockingProb);
    
    // Average waiting time using Little's Law
    const avgWaitingTime = avgQueueSize / throughput;
    
    return {
      blockingProbability: blockingProb,
      utilization,
      avgQueueSize,
      throughput,
      avgWaitingTime
    };
  };
  
  /**
   * Generate simulation data
   * @returns {Object} Simulation result
   */
  const runClientSimulation = () => {
    // Run the queueing simulation
    return runNetworkSimulation();
  };
  
  // Run simulation
  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Client-side simulation
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
      console.error('Error simulating network traffic:', err);
      setError('Error running simulation');
    } finally {
      setLoading(false);
    }
  };
  
  // D3.js Visualization Functions
  
  /**
   * Render queue size time series chart using D3.js
   */
  const renderQueueSizeChart = () => {
    if (!queueSizeChartRef.current || !result?.simulationData) return;
    
    // Clear previous chart
    d3.select(queueSizeChartRef.current).selectAll("*").remove();
    
    const { timePoints, queueSizes } = result.simulationData;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = queueSizeChartRef.current.clientWidth || 600;
    const height = queueSizeChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(queueSizeChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, simulationTime])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([0, bufferSize + 1])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(10);
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(Math.min(bufferSize + 1, 10))
      .tickFormat(d => Math.floor(d));
    
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
      .text("Time (seconds)");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Queue Size");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Queue Size Over Time");
    
    // Create line generator
    const lineGenerator = d3.line()
      .x((_, i) => xScale(timePoints[i]))
      .y(d => yScale(d));
    
    // Add buffer size line
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(bufferSize))
      .attr("x2", innerWidth)
      .attr("y2", yScale(bufferSize))
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(bufferSize) - 5)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.error.main)
      .text("Buffer Limit");
    
    // Add average queue size line
    const avgQueueSize = result.metrics.avgQueueSize;
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(avgQueueSize))
      .attr("x2", innerWidth)
      .attr("y2", yScale(avgQueueSize))
      .attr("stroke", theme.palette.info.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(avgQueueSize) + 15)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.info.main)
      .text(`Avg: ${avgQueueSize.toFixed(2)}`);
    
    // Add queue size line with animation
    if (showAnimations && isAnimating) {
      // Determine number of points to show based on animation progress
      const numPoints = Math.floor(timePoints.length * animationProgress);
      const visibleTimePoints = timePoints.slice(0, numPoints);
      const visibleQueueSizes = queueSizes.slice(0, numPoints);
      
      svg.append("path")
        .datum(visibleQueueSizes)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2)
        .attr("d", d3.line()
          .x((_, i) => xScale(visibleTimePoints[i]))
          .y(d => yScale(d))
        );
      
    } else {
      // No animation
      svg.append("path")
        .datum(queueSizes)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2)
        .attr("d", d3.line()
          .x((_, i) => xScale(timePoints[i]))
          .y(d => yScale(d))
        );
    }
    
    // Add packet drops as points if there are any
    const { packetsDropped } = result.simulationData;
    if (packetsDropped.length > 0) {
      svg.selectAll(".drop-point")
        .data(packetsDropped)
        .enter()
        .append("circle")
        .attr("class", "drop-point")
        .attr("cx", d => xScale(d))
        .attr("cy", yScale(bufferSize))
        .attr("r", 4)
        .attr("fill", theme.palette.error.main)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .on("mouseover", function(event, d) {
          const [mouseX, mouseY] = d3.pointer(event);
          setTooltip({
            visible: true,
            x: mouseX + margin.left,
            y: mouseY + margin.top,
            content: `Packet dropped at t = ${d.toFixed(2)}s`
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
        .attr("transform", `translate(10, 10)`);
      
      // Queue size
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 7.5)
        .attr("x2", 20)
        .attr("y2", 7.5)
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 10)
        .attr("alignment-baseline", "middle")
        .text("Queue Size");
      
      // Buffer Limit
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 30)
        .attr("x2", 20)
        .attr("y2", 30)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 32.5)
        .attr("alignment-baseline", "middle")
        .text("Buffer Limit");
      
      // Average Queue Size
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 52.5)
        .attr("x2", 20)
        .attr("y2", 52.5)
        .attr("stroke", theme.palette.info.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,3");
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 55)
        .attr("alignment-baseline", "middle")
        .text("Average Queue Size");
      
      // Packet Drops
      if (packetsDropped.length > 0) {
        legend.append("circle")
          .attr("cx", 10)
          .attr("cy", 75)
          .attr("r", 4)
          .attr("fill", theme.palette.error.main)
          .attr("stroke", "white")
          .attr("stroke-width", 1.5);
        
        legend.append("text")
          .attr("x", 30)
          .attr("y", 77.5)
          .attr("alignment-baseline", "middle")
          .text("Packet Dropped");
      }
    }
  };
  
  /**
   * Render queue size distribution chart using D3.js
   */
  const renderQueueDistributionChart = () => {
    if (!utilizationChartRef.current || !result?.queueSizeDistribution) return;
    
    // Clear previous chart
    d3.select(utilizationChartRef.current).selectAll("*").remove();
    
    const queueSizeDistribution = result.queueSizeDistribution;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = utilizationChartRef.current.clientWidth || 600;
    const height = utilizationChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(utilizationChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(queueSizeDistribution.map((_, i) => i))
      .range([0, innerWidth])
      .padding(0.2);
    
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(...queueSizeDistribution) * 1.1])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d3.format(".0%"));
    
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
      .text("Queue Size");
    
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
      .text("Queue Size Distribution");
    
    // Add bars with animation
    if (showAnimations && isAnimating) {
      svg.selectAll(".bar")
        .data(queueSizeDistribution)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (_, i) => xScale(i))
        .attr("width", xScale.bandwidth())
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("fill", (_, i) => {
          if (i === 0) return theme.palette.success.main; // Idle server
          if (i === bufferSize) return theme.palette.error.main; // Full buffer
          return theme.palette.primary.main;
        })
        .transition()
        .duration(1000)
        .delay((_, i) => i * 50)
        .attr("y", d => yScale(d))
        .attr("height", d => innerHeight - yScale(d));
    } else {
      svg.selectAll(".bar")
        .data(queueSizeDistribution)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (_, i) => xScale(i))
        .attr("width", xScale.bandwidth())
        .attr("y", d => yScale(d))
        .attr("height", d => innerHeight - yScale(d))
        .attr("fill", (_, i) => {
          if (i === 0) return theme.palette.success.main; // Idle server
          if (i === bufferSize) return theme.palette.error.main; // Full buffer
          return theme.palette.primary.main;
        })
        .on("mouseover", function(event, d) {
          const [mouseX, mouseY] = d3.pointer(event);
          const i = queueSizeDistribution.indexOf(d);
          setTooltip({
            visible: true,
            x: mouseX + margin.left,
            y: mouseY + margin.top,
            content: `Queue Size: ${i}<br>Probability: ${(d * 100).toFixed(2)}%`
          });
          d3.select(this).attr("opacity", 0.7);
        })
        .on("mouseout", function() {
          setTooltip({ ...tooltip, visible: false });
          d3.select(this).attr("opacity", 1);
        });
    }
    
    // Add theoretical distribution if traffic intensity < 1
    if (trafficIntensity < 1) {
      // Calculate theoretical distribution for M/M/1/K queue
      const theoreticalDistribution = [];
      const rho = trafficIntensity;
      const piZero = (1 - rho) / (1 - Math.pow(rho, bufferSize + 1));
      
      for (let i = 0; i <= bufferSize; i++) {
        theoreticalDistribution.push(piZero * Math.pow(rho, i));
      }
      
      // Add theoretical distribution line
      const lineGenerator = d3.line()
        .x((_, i) => xScale(i) + xScale.bandwidth() / 2)
        .y(d => yScale(d));
      
      if (showAnimations && isAnimating) {
        const line = svg.append("path")
          .datum(theoreticalDistribution)
          .attr("fill", "none")
          .attr("stroke", theme.palette.secondary.main)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", function() {
            const pathLength = this.getTotalLength();
            return `${pathLength} ${pathLength}`;
          })
          .attr("stroke-dashoffset", function() {
            const pathLength = this.getTotalLength();
            return pathLength;
          })
          .attr("d", lineGenerator);
        
        line.transition()
          .duration(1500)
          .ease(d3.easeLinear)
          .attr("stroke-dashoffset", 0);
      } else {
        svg.append("path")
          .datum(theoreticalDistribution)
          .attr("fill", "none")
          .attr("stroke", theme.palette.secondary.main)
          .attr("stroke-width", 2)
          .attr("d", lineGenerator);
      }
      
      // Add dots for theoretical distribution
      svg.selectAll(".theory-dot")
        .data(theoreticalDistribution)
        .enter()
        .append("circle")
        .attr("class", "theory-dot")
        .attr("cx", (_, i) => xScale(i) + xScale.bandwidth() / 2)
        .attr("cy", d => yScale(d))
        .attr("r", 4)
        .attr("fill", theme.palette.secondary.main)
        .attr("opacity", showAnimations && isAnimating ? 0 : 1)
        .on("mouseover", function(event, d) {
          const [mouseX, mouseY] = d3.pointer(event);
          const i = theoreticalDistribution.indexOf(d);
          setTooltip({
            visible: true,
            x: mouseX + margin.left,
            y: mouseY + margin.top,
            content: `Queue Size: ${i}<br>Theoretical: ${(d * 100).toFixed(2)}%`
          });
          d3.select(this).attr("r", 6);
        })
        .on("mouseout", function() {
          setTooltip({ ...tooltip, visible: false });
          d3.select(this).attr("r", 4);
        });
      
      if (showAnimations && isAnimating) {
        svg.selectAll(".theory-dot")
          .transition()
          .duration(1500)
          .delay(1000)
          .attr("opacity", 1);
      }
    }
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 140}, 10)`);
      
      // Simulated distribution
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", theme.palette.primary.main);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 7.5)
        .attr("alignment-baseline", "middle")
        .text("Simulated");
      
      // Theoretical distribution
      if (trafficIntensity < 1) {
        legend.append("line")
          .attr("x1", 0)
          .attr("y1", 30)
          .attr("x2", 15)
          .attr("y2", 30)
          .attr("stroke", theme.palette.secondary.main)
          .attr("stroke-width", 2);
        
        legend.append("circle")
          .attr("cx", 7.5)
          .attr("cy", 30)
          .attr("r", 4)
          .attr("fill", theme.palette.secondary.main);
        
        legend.append("text")
          .attr("x", 25)
          .attr("y", 30)
          .attr("alignment-baseline", "middle")
          .text("Theoretical");
      }
      
      // Idle server
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("y", 45)
        .attr("fill", theme.palette.success.main);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 52.5)
        .attr("alignment-baseline", "middle")
        .text("Idle Server");
      
      // Full buffer
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("y", 70)
        .attr("fill", theme.palette.error.main);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 77.5)
        .attr("alignment-baseline", "middle")
        .text("Full Buffer");
    }
  };
  
  /**
   * Render network traffic simulation animation using D3.js
   */
  const renderSimulationChart = () => {
    if (!simulationChartRef.current || !result?.simulationData) return;
    
    // Clear previous chart
    d3.select(simulationChartRef.current).selectAll("*").remove();
    
    const { timePoints, totalArrivals, totalDepartures, serverStates } = result.simulationData;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = simulationChartRef.current.clientWidth || 600;
    const height = simulationChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(simulationChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, simulationTime])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(d3.max(totalArrivals), d3.max(totalDepartures)) * 1.1])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(10);
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5);
    
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
      .text("Time (seconds)");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Cumulative Packets");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Cumulative Arrivals and Departures");
    
    // Create line generators
    const arrivalLineGenerator = d3.line()
      .x((_, i) => xScale(timePoints[i]))
      .y(d => yScale(d));
    
    const departureLineGenerator = d3.line()
      .x((_, i) => xScale(timePoints[i]))
      .y(d => yScale(d));
    
    // Add server busy periods to background
    const busyPeriods = [];
    let startBusy = -1;
    
    for (let i = 0; i < serverStates.length; i++) {
      if (serverStates[i] === 1 && startBusy === -1) {
        startBusy = timePoints[i];
      } else if (serverStates[i] === 0 && startBusy !== -1) {
        busyPeriods.push({
          start: startBusy,
          end: timePoints[i]
        });
        startBusy = -1;
      }
    }
    
    // If server is still busy at end of simulation
    if (startBusy !== -1) {
      busyPeriods.push({
        start: startBusy,
        end: timePoints[timePoints.length - 1]
      });
    }
    
    // Add busy periods as background
    svg.selectAll(".busy-period")
      .data(busyPeriods)
      .enter()
      .append("rect")
      .attr("class", "busy-period")
      .attr("x", d => xScale(d.start))
      .attr("y", 0)
      .attr("width", d => xScale(d.end) - xScale(d.start))
      .attr("height", innerHeight)
      .attr("fill", theme.palette.warning.main)
      .attr("opacity", 0.1);
    
    // Add arrivals and departures lines with animation
    if (showAnimations && isAnimating) {
      // Determine number of points to show based on animation progress
      const numPoints = Math.floor(timePoints.length * animationProgress);
      const visibleTimePoints = timePoints.slice(0, numPoints);
      const visibleArrivals = totalArrivals.slice(0, numPoints);
      const visibleDepartures = totalDepartures.slice(0, numPoints);
      
      // Add arrivals line
      svg.append("path")
        .datum(visibleArrivals)
        .attr("fill", "none")
        .attr("stroke", theme.palette.info.main)
        .attr("stroke-width", 2)
        .attr("d", d3.line()
          .x((_, i) => xScale(visibleTimePoints[i]))
          .y(d => yScale(d))
        );
      
      // Add departures line
      svg.append("path")
        .datum(visibleDepartures)
        .attr("fill", "none")
        .attr("stroke", theme.palette.success.main)
        .attr("stroke-width", 2)
        .attr("d", d3.line()
          .x((_, i) => xScale(visibleTimePoints[i]))
          .y(d => yScale(d))
        );
      
    } else {
      // No animation
      // Add arrivals line
      svg.append("path")
        .datum(totalArrivals)
        .attr("fill", "none")
        .attr("stroke", theme.palette.info.main)
        .attr("stroke-width", 2)
        .attr("d", d3.line()
          .x((_, i) => xScale(timePoints[i]))
          .y(d => yScale(d))
        );
      
      // Add departures line
      svg.append("path")
        .datum(totalDepartures)
        .attr("fill", "none")
        .attr("stroke", theme.palette.success.main)
        .attr("stroke-width", 2)
        .attr("d", d3.line()
          .x((_, i) => xScale(timePoints[i]))
          .y(d => yScale(d))
        );
    }
    
    // Add utilization label
    svg.append("text")
      .attr("x", innerWidth - 10)
      .attr("y", 20)
      .attr("text-anchor", "end")
      .attr("font-weight", "bold")
      .text(`Utilization: ${(result.metrics.utilizationRate * 100).toFixed(1)}%`);
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(10, 10)`);
      
      // Arrivals
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 7.5)
        .attr("x2", 20)
        .attr("y2", 7.5)
        .attr("stroke", theme.palette.info.main)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 10)
        .attr("alignment-baseline", "middle")
        .text("Arrivals");
      
      // Departures
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 30)
        .attr("x2", 20)
        .attr("y2", 30)
        .attr("stroke", theme.palette.success.main)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 32.5)
        .attr("alignment-baseline", "middle")
        .text("Departures");
      
      // Busy Periods
      legend.append("rect")
        .attr("x", 0)
        .attr("y", 45)
        .attr("width", 20)
        .attr("height", 15)
        .attr("fill", theme.palette.warning.main)
        .attr("opacity", 0.1);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 52.5)
        .attr("alignment-baseline", "middle")
        .text("Server Busy");
    }
  };
  
  // Render charts when data changes or when tab changes
  useEffect(() => {
    if (result) {
      switch (activeTab) {
        case 0:
          renderQueueSizeChart();
          break;
        case 1:
          renderQueueDistributionChart();
          break;
        case 2:
          renderSimulationChart();
          break;
        default:
          break;
      }
    }
  }, [result, animationProgress, showLegend, showDataPoints, showAnimations, activeTab]);
  
  // Re-render charts on window resize
  useEffect(() => {
    const handleResize = () => {
      if (result) {
        switch (activeTab) {
          case 0:
            renderQueueSizeChart();
            break;
          case 1:
            renderQueueDistributionChart();
            break;
          case 2:
            renderSimulationChart();
            break;
          default:
            break;
        }
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
              Network Parameters
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Packet Arrival Rate (λ): {arrivalRate} packets/second
              </Typography>
              <Slider
                value={arrivalRate}
                onChange={(e, newValue) => setArrivalRate(newValue)}
                min={1}
                max={20}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Service Rate (μ): {serviceRate} packets/second
              </Typography>
              <Slider
                value={serviceRate}
                onChange={(e, newValue) => setServiceRate(newValue)}
                min={Math.max(1, arrivalRate - 5)}
                max={Math.max(25, arrivalRate + 5)}
                step={1}
                marks={[
                  { value: Math.max(1, arrivalRate - 5), label: 'Min' },
                  { value: Math.max(25, arrivalRate + 5), label: 'Max' }
                ]}
              />
              <Typography 
                variant="caption" 
                color={trafficIntensity >= 1 ? 'error' : 'text.secondary'}
              >
                Traffic Intensity (ρ = λ/μ): {trafficIntensity.toFixed(2)}
                {trafficIntensity >= 1 && ' - Queue will grow unbounded unless buffer limited'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Buffer Size (K): {bufferSize} packets
              </Typography>
              <Slider
                value={bufferSize}
                onChange={(e, newValue) => setBufferSize(newValue)}
                min={1}
                max={50}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Simulation Time: {simulationTime} seconds
              </Typography>
              <Slider
                value={simulationTime}
                onChange={(e, newValue) => setSimulationTime(newValue)}
                min={10}
                max={300}
                step={10}
                marks={[
                  { value: 10, label: '10s' },
                  { value: 60, label: '1m' },
                  { value: 300, label: '5m' }
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
                
                {/* Server state card */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderLeft: '4px solid', 
                                            borderColor: trafficIntensity >= 1 ? 'error.main' : 
                                                      result.metrics.blockingProbability > 0.05 ? 'warning.main' : 'success.main' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" fontWeight="medium">
                        Traffic Intensity (ρ):
                      </Typography>
                      <Chip 
                        label={`${(trafficIntensity * 100).toFixed(1)}%`}
                        size="small"
                        color={trafficIntensity >= 1 ? "error" : trafficIntensity >= 0.9 ? "warning" : "success"}
                        sx={{ mt: 0.5 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" fontWeight="medium">
                        Utilization:
                      </Typography>
                      <Chip 
                        label={`${(result.metrics.utilizationRate * 100).toFixed(1)}%`}
                        size="small"
                        color={result.metrics.utilizationRate >= 0.95 ? "error" : 
                              result.metrics.utilizationRate >= 0.8 ? "warning" : "success"}
                        sx={{ mt: 0.5 }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
                
                {/* Performance metrics */}
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Packet Loss Rate:</TableCell>
                        <TableCell align="right">
                          <Typography 
                            component="span" 
                            color={result.metrics.blockingProbability > 0.05 ? 'error.main' : 'text.primary'}
                          >
                            {(result.metrics.blockingProbability * 100).toFixed(2)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Queue Size:</TableCell>
                        <TableCell align="right">{result.metrics.avgQueueSize.toFixed(2)} packets</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Waiting Time:</TableCell>
                        <TableCell align="right">{result.metrics.avgWaitingTime.toFixed(3)} seconds</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Throughput:</TableCell>
                        <TableCell align="right">{result.metrics.throughput.toFixed(2)} packets/second</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Packets:</TableCell>
                        <TableCell align="right">{result.metrics.totalPacketsGenerated}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Packets Dropped:</TableCell>
                        <TableCell align="right">
                          <Typography 
                            component="span" 
                            color={result.metrics.totalPacketsDropped > 0 ? 'error.main' : 'text.primary'}
                          >
                            {result.metrics.totalPacketsDropped}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Theoretical vs Observed comparison button */}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                  endIcon={<InfoIcon />}
                  sx={{ mb: 1 }}
                >
                  {showAdvancedMetrics ? 'Hide' : 'Show'} Theoretical Comparison
                </Button>
                
                {/* Theoretical vs Observed metrics */}
                <AnimatePresence>
                  {showAdvancedMetrics && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Metric</TableCell>
                              <TableCell align="right">Theoretical</TableCell>
                              <TableCell align="right">Observed</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Utilization:</TableCell>
                              <TableCell align="right">{(result.theoreticalMetrics.utilization * 100).toFixed(2)}%</TableCell>
                              <TableCell align="right">{(result.metrics.utilizationRate * 100).toFixed(2)}%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Packet Loss:</TableCell>
                              <TableCell align="right">{(result.theoreticalMetrics.blockingProbability * 100).toFixed(2)}%</TableCell>
                              <TableCell align="right">{(result.metrics.blockingProbability * 100).toFixed(2)}%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Avg Queue Size:</TableCell>
                              <TableCell align="right">{result.theoreticalMetrics.avgQueueSize.toFixed(2)}</TableCell>
                              <TableCell align="right">{result.metrics.avgQueueSize.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Throughput:</TableCell>
                              <TableCell align="right">{result.theoreticalMetrics.throughput.toFixed(2)}</TableCell>
                              <TableCell align="right">{result.metrics.throughput.toFixed(2)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Waiting Time:</TableCell>
                              <TableCell align="right">{result.theoreticalMetrics.avgWaitingTime.toFixed(3)}s</TableCell>
                              <TableCell align="right">{result.metrics.avgWaitingTime.toFixed(3)}s</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {trafficIntensity >= 1 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Traffic intensity (ρ = {trafficIntensity.toFixed(2)}) is greater than or equal to 1. 
                    Without a buffer limit, the queue would grow unbounded.
                  </Alert>
                )}
                
                {result.metrics.blockingProbability > 0.05 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Packet loss rate ({(result.metrics.blockingProbability * 100).toFixed(2)}%) exceeds 5%.
                    Consider increasing buffer size or service rate.
                  </Alert>
                )}
                
                {trafficIntensity < 1 && result.metrics.blockingProbability <= 0.01 && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Network is operating efficiently with minimal packet loss 
                    ({(result.metrics.blockingProbability * 100).toFixed(2)}%).
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
          
          {/* Educational details */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Queueing Theory Fundamentals
              </Typography>
              
              <Tooltip title="Queueing theory is a mathematical study of waiting lines or queues, used to analyze network traffic and many other systems.">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="body2" paragraph>
              This simulation models network traffic as an M/M/1/K queue, where:
            </Typography>
            <Typography variant="body2">
              • First M: Poisson arrival process (exponential interarrival times)
            </Typography>
            <Typography variant="body2">
              • Second M: Exponential service times
            </Typography>
            <Typography variant="body2">
              • 1: Single server (e.g., router, network interface)
            </Typography>
            <Typography variant="body2">
              • K: Maximum queue length (buffer size)
            </Typography>
            
            <Box sx={{ my: 2, bgcolor: 'background.paper', borderRadius: 1, p: 2, 
                    border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                Key Queueing Theory Formulas:
              </Typography>
              
              {/* Traffic Intensity */}
              <Typography variant="body2">Traffic Intensity (ρ):</Typography>
              <Box sx={{ my: 1, textAlign: 'center' }}
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex("\\rho = \\frac{\\lambda}{\\mu}") 
                }}
              />
              
              {/* Blocking Probability */}
              <Typography variant="body2">Blocking Probability (for M/M/1/K):</Typography>
              <Box sx={{ my: 1, textAlign: 'center' }}
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex("P_K = \\frac{(1-\\rho)\\rho^K}{1-\\rho^{K+1}}") 
                }}
              />
              
              {/* Average Queue Size */}
              <Typography variant="body2">Average Queue Size:</Typography>
              <Box sx={{ my: 1, textAlign: 'center' }}
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex("L = \\frac{\\rho(1-(K+1)\\rho^K+K\\rho^{K+1})}{(1-\\rho)(1-\\rho^{K+1})}") 
                }}
              />
              
              {/* Little's Law */}
              <Typography variant="body2">Little's Law:</Typography>
              <Box sx={{ my: 1, textAlign: 'center' }}
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex("L = \\lambda_{eff} W") 
                }}
              />
              <Typography variant="caption" color="text.secondary">
                where L is the average queue size, λₑff is the effective arrival rate, and W is the average waiting time
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom fontWeight="medium">
              Important Concepts:
            </Typography>
            <Typography variant="body2">
              • <strong>Traffic Intensity (ρ)</strong>: When ρ &lt; 1, the system is stable; when ρ ≥ 1, unlimited queue would grow unbounded
            </Typography>
            <Typography variant="body2">
              • <strong>Utilization</strong>: Proportion of time the server is busy
            </Typography>
            <Typography variant="body2">
              • <strong>Packet Loss</strong>: Occurs when the buffer is full and new packets are dropped
            </Typography>
            <Typography variant="body2">
              • <strong>Little's Law</strong>: Fundamental relationship connecting queue size, waiting time, and throughput
            </Typography>
          </Paper>
        </Grid>
        
        {/* Visualization Panel */}
        <Grid item xs={12} md={8}>
          {result ? (
            <Box>
              {/* Tabs for different visualizations */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{ mb: 2 }}
                  centered
                >
                  <Tab label="Queue Size" />
                  <Tab label="Queue Distribution" />
                  <Tab label="Packet Flow" />
                </Tabs>
                
                <Box sx={{ height: 300 }}>
                  {activeTab === 0 && <Box sx={{ height: '100%' }} ref={queueSizeChartRef} />}
                  {activeTab === 1 && <Box sx={{ height: '100%' }} ref={utilizationChartRef} />}
                  {activeTab === 2 && <Box sx={{ height: '100%' }} ref={simulationChartRef} />}
                </Box>
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px dashed', 
                         borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                    Insights from the Simulation:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {activeTab === 0 ? 
                      "The Queue Size chart shows how many packets are waiting in the buffer over time. Peaks occur when packets arrive faster than they can be processed, while valleys appear when the service rate catches up with arrivals." : 
                      activeTab === 1 ?
                      "The Queue Distribution chart shows the proportion of time spent at each queue size. A well-designed network should spend most time with small queue sizes, minimizing delays while maintaining high utilization." :
                      "The Packet Flow chart shows cumulative arrivals and departures over time. The gap between the curves represents packets waiting in the queue. Highlighted regions show when the server is busy processing packets."
                    }
                  </Typography>
                </Box>
              </Paper>
              
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Network Design Considerations
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Buffer Size Tradeoffs
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Larger Buffers:</strong> Reduce packet loss but increase latency
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Smaller Buffers:</strong> Decrease latency but increase packet loss
                      </Typography>
                      <Typography variant="body2">
                        Modern networks often use active queue management techniques like Random Early Detection (RED) 
                        to balance these tradeoffs.
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Traffic Engineering
                      </Typography>
                      <Typography variant="body2" paragraph>
                        Network capacity planning should aim for:
                      </Typography>
                      <Typography variant="body2">
                        • Traffic intensity (ρ) &lt; 0.7 for normal operation
                      </Typography>
                      <Typography variant="body2">
                        • Packet loss rate &lt; 1% for most applications
                      </Typography>
                      <Typography variant="body2">
                        • Sufficient capacity for peak loads
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', 
                        flexDirection: 'column', justifyContent: 'center' }}>
              <RouterIcon sx={{ fontSize: 80, color: 'text.secondary', mx: 'auto', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Simulation Data
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Set the parameters and click "Run Simulation" to visualize network traffic behavior
                using queueing theory and the Poisson distribution.
              </Typography>
              
              <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="medium">
                  What you'll learn:
                </Typography>
                <Typography variant="body2" paragraph>
                  • How the Poisson distribution models network packet arrivals
                </Typography>
                <Typography variant="body2" paragraph>
                  • How queue size varies with traffic intensity
                </Typography>
                <Typography variant="body2" paragraph>
                  • The relationship between buffer size, packet loss, and latency
                </Typography>
                <Typography variant="body2" paragraph>
                  • How queueing theory helps with network capacity planning
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

export default NetworkTrafficD3;