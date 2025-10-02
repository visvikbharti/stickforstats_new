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
  TextField,
  InputAdornment
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import FactoryIcon from '@mui/icons-material/Factory';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AssessmentIcon from '@mui/icons-material/Assessment';

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
 * Enhanced Manufacturing Defects simulation using D3.js
 * 
 * This component demonstrates how to apply binomial distribution to model
 * manufacturing defects, implement acceptance sampling plans,
 * and visualize operating characteristic curves for quality control
 */
const ManufacturingDefectsD3 = ({ projectId, setLoading, setError, setSimulationResult, result }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Main simulation parameters
  const [defectRate, setDefectRate] = useState(0.05); // Defect rate (probability of defect)
  const [batchSize, setBatchSize] = useState(1000); // Total batch size
  const [sampleSize, setSampleSize] = useState(100); // Inspection sample size
  const [acceptanceNumber, setAcceptanceNumber] = useState(3); // Max allowed defects for acceptance
  const [aqlLevel, setAqlLevel] = useState(0.04); // Acceptable Quality Level
  const [trials, setTrials] = useState(1); // Number of trials to simulate

  // Chart refs
  const defectsDistributionRef = useRef(null);
  const ocCurveRef = useRef(null);
  const operationResultsRef = useRef(null);
  
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
   * Generate binomial random variate
   * @param {number} n - Number of trials 
   * @param {number} p - Probability of success
   * @returns {number} Number of successes
   */
  const generateBinomialRandom = (n, p) => {
    let successes = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) {
        successes++;
      }
    }
    return successes;
  };
  
  /**
   * Calculate binomial PMF (Probability Mass Function)
   * @param {number} k - Number of successes
   * @param {number} n - Number of trials
   * @param {number} p - Probability of success
   * @returns {number} Probability
   */
  const binomialPMF = (k, n, p) => {
    if (k < 0 || k > n) return 0;
    
    // Calculate log of binomial coefficient to prevent overflow
    const logBinomCoeff = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
    
    // Calculate log of probability
    const logProb = k * Math.log(p) + (n - k) * Math.log(1 - p);
    
    // Return the exponentiated result
    return Math.exp(logBinomCoeff + logProb);
  };
  
  /**
   * Calculate binomial CDF (Cumulative Distribution Function)
   * @param {number} k - Number of successes
   * @param {number} n - Number of trials
   * @param {number} p - Probability of success
   * @returns {number} Cumulative probability
   */
  const binomialCDF = (k, n, p) => {
    let cdf = 0;
    for (let i = 0; i <= k; i++) {
      cdf += binomialPMF(i, n, p);
    }
    return cdf;
  };
  
  /**
   * Calculate factorial logarithm (log(n!))
   * @param {number} n 
   * @returns {number} Log of factorial
   */
  const logFactorial = (n) => {
    if (n <= 1) return 0;
    let result = 0;
    for (let i = 2; i <= n; i++) {
      result += Math.log(i);
    }
    return result;
  };
  
  /**
   * Calculate the probability of batch acceptance given a defect rate
   * @param {number} p - Defect rate
   * @param {number} n - Sample size
   * @param {number} c - Acceptance number
   * @returns {number} Probability of acceptance
   */
  const calculateAcceptanceProbability = (p, n, c) => {
    // Sum of binomial PMFs from 0 to c
    return binomialCDF(c, n, p);
  };
  
  /**
   * Generate data for Operating Characteristic (OC) curve
   * @returns {Array} Array of (defect rate, acceptance probability) pairs
   */
  const generateOCCurveData = () => {
    const data = [];
    for (let p = 0; p <= 0.2; p += 0.005) {
      data.push({
        defectRate: p,
        acceptProb: calculateAcceptanceProbability(p, sampleSize, acceptanceNumber)
      });
    }
    return data;
  };
  
  /**
   * Run a single sampling inspection
   * @returns {Object} Inspection results
   */
  const runSingleInspection = () => {
    // Generate number of defects in the sample
    const numDefects = generateBinomialRandom(sampleSize, defectRate);
    
    // Determine if the batch is accepted
    const isAccepted = numDefects <= acceptanceNumber;
    
    // Calculate probability of this outcome
    const probability = binomialPMF(numDefects, sampleSize, defectRate);
    
    // Calculate risk levels
    const producerRisk = 1 - calculateAcceptanceProbability(aqlLevel, sampleSize, acceptanceNumber);
    const consumerRisk = calculateAcceptanceProbability(defectRate * 2, sampleSize, acceptanceNumber);
    
    return {
      sampleSize,
      numDefects,
      isAccepted,
      probability,
      producerRisk,
      consumerRisk,
      defectRate,
      acceptanceNumber,
      percentDefective: (numDefects / sampleSize) * 100
    };
  };
  
  /**
   * Calculate theoretical binomial distribution
   * @param {number} n - Number of trials
   * @param {number} p - Probability of success
   * @returns {Object} Distribution data
   */
  const calculateBinomialDistribution = (n, p) => {
    const values = [];
    const pmf = [];
    const cdf = [];
    
    // Calculate maximum number of defects to display (showing at least acceptanceNumber + 5)
    const maxDefects = Math.min(n, Math.max(acceptanceNumber + 5, Math.ceil(n * p * 3)));
    
    for (let k = 0; k <= maxDefects; k++) {
      values.push(k);
      pmf.push(binomialPMF(k, n, p));
      cdf.push(binomialCDF(k, n, p));
    }
    
    return { values, pmf, cdf };
  };
  
  /**
   * Analyze sampling plan characteristics
   * @returns {Object} Sampling plan metrics
   */
  const analyzeSamplingPlan = () => {
    // Calculate AQL and RQL (Rejectable Quality Level)
    const aqlAcceptProb = calculateAcceptanceProbability(aqlLevel, sampleSize, acceptanceNumber);
    
    // Find RQL (quality level with ~10% acceptance probability)
    let rql = aqlLevel;
    while (calculateAcceptanceProbability(rql, sampleSize, acceptanceNumber) > 0.1 && rql < 0.5) {
      rql += 0.01;
    }
    
    // Calculate Indifference Quality Level (50% acceptance prob)
    let iql = aqlLevel;
    while (calculateAcceptanceProbability(iql, sampleSize, acceptanceNumber) > 0.5 && iql < 0.5) {
      iql += 0.005;
    }
    
    // Calculate Average Outgoing Quality (AOQ) curve peak
    let maxAOQ = 0;
    let maxAOQPoint = 0;
    for (let p = 0; p <= 0.2; p += 0.001) {
      const acceptProb = calculateAcceptanceProbability(p, sampleSize, acceptanceNumber);
      const aoq = p * acceptProb;
      if (aoq > maxAOQ) {
        maxAOQ = aoq;
        maxAOQPoint = p;
      }
    }
    
    // Calculate Average Total Inspection (ATI)
    const atiData = [];
    for (let p = 0; p <= 0.2; p += 0.01) {
      const acceptProb = calculateAcceptanceProbability(p, sampleSize, acceptanceNumber);
      const ati = sampleSize + (1 - acceptProb) * (batchSize - sampleSize);
      atiData.push({ defectRate: p, ati });
    }
    
    return {
      aql: aqlLevel,
      aqlAcceptProb,
      rql,
      iql,
      maxAOQ,
      maxAOQPoint,
      atiData
    };
  };
  
  /**
   * Generate data for multiple trial simulation
   * @returns {Object} Simulation results
   */
  const runMultipleTrials = () => {
    const results = [];
    let acceptedCount = 0;
    let totalDefects = 0;
    
    for (let i = 0; i < trials; i++) {
      const trial = runSingleInspection();
      results.push(trial);
      
      if (trial.isAccepted) {
        acceptedCount++;
      }
      totalDefects += trial.numDefects;
    }
    
    return {
      trials: results,
      acceptedCount,
      rejectedCount: trials - acceptedCount,
      acceptanceRate: acceptedCount / trials,
      avgDefects: totalDefects / trials,
      avgDefectRate: totalDefects / (sampleSize * trials)
    };
  };
  
  /**
   * Generate simulation data
   * @returns {Object} Simulation result
   */
  const runClientSimulation = () => {
    // Generate binomial distribution data
    const binomialDist = calculateBinomialDistribution(sampleSize, defectRate);
    
    // Run the specified number of trials
    const multipleTrials = runMultipleTrials();
    
    // Generate OC curve data
    const ocCurveData = generateOCCurveData();
    
    // Analyze sampling plan characteristics
    const samplingPlanAnalysis = analyzeSamplingPlan();
    
    return {
      binomialDist,
      multipleTrials,
      ocCurveData,
      samplingPlanAnalysis,
      parameters: {
        defectRate,
        sampleSize,
        acceptanceNumber,
        batchSize,
        aqlLevel,
        trials
      }
    };
  };
  
  // Run simulation
  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For the enhanced version, we'll use client-side simulation
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
      console.error('Error simulating manufacturing defects:', err);
      setError('Error running simulation');
    } finally {
      setLoading(false);
    }
  };
  
  // D3.js Visualization Functions
  
  /**
   * Render binomial distribution chart using D3.js
   */
  const renderDefectsDistribution = () => {
    if (!defectsDistributionRef.current || !result?.binomialDist) return;
    
    // Clear previous chart
    d3.select(defectsDistributionRef.current).selectAll("*").remove();
    
    const { values, pmf, cdf } = result.binomialDist;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = defectsDistributionRef.current.clientWidth || 600;
    const height = defectsDistributionRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(defectsDistributionRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(values)])
      .range([0, innerWidth])
      .nice();
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(pmf) * 1.1])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(10, values.length))
      .tickFormat(d => Math.round(d).toString());
    
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
      .text("Number of Defective Items");
    
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
      .text("Defects Distribution in Sample");
    
    // Define area generator for PMF
    const areaGenerator = d3.area()
      .x((d, i) => xScale(values[i]))
      .y0(innerHeight)
      .y1(d => yScale(d));
    
    // Add bar chart with animation
    if (showAnimations && isAnimating) {
      // Animation version
      svg.selectAll(".defect-bar")
        .data(pmf)
        .enter()
        .append("rect")
        .attr("class", "defect-bar")
        .attr("x", (d, i) => xScale(values[i]) - (innerWidth / values.length / 2) + 1)
        .attr("width", innerWidth / values.length - 2)
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("fill", (d, i) => {
          return values[i] <= acceptanceNumber ? theme.palette.success.main : theme.palette.error.main;
        })
        .attr("opacity", 0.7)
        .transition()
        .duration(1000)
        .attr("y", d => yScale(d))
        .attr("height", d => innerHeight - yScale(d));
    } else {
      // Non-animation version
      svg.selectAll(".defect-bar")
        .data(pmf)
        .enter()
        .append("rect")
        .attr("class", "defect-bar")
        .attr("x", (d, i) => xScale(values[i]) - (innerWidth / values.length / 2) + 1)
        .attr("width", innerWidth / values.length - 2)
        .attr("y", d => yScale(d))
        .attr("height", d => innerHeight - yScale(d))
        .attr("fill", (d, i) => {
          return values[i] <= acceptanceNumber ? theme.palette.success.main : theme.palette.error.main;
        })
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d, i) {
          const idx = pmf.indexOf(d);
          const val = values[idx];
          const prob = d;
          
          const [mouseX, mouseY] = d3.pointer(event);
          setTooltip({
            visible: true,
            x: mouseX + margin.left,
            y: mouseY + margin.top,
            content: `Defects: ${val}<br>Probability: ${(prob * 100).toFixed(2)}%<br>Cumulative: ${(cdf[idx] * 100).toFixed(2)}%`
          });
          d3.select(this).attr("opacity", 1);
        })
        .on("mouseout", function() {
          setTooltip({ ...tooltip, visible: false });
          d3.select(this).attr("opacity", 0.7);
        });
    }
    
    // Add acceptance threshold line
    svg.append("line")
      .attr("x1", xScale(acceptanceNumber + 0.5))
      .attr("y1", 0)
      .attr("x2", xScale(acceptanceNumber + 0.5))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.warning.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(acceptanceNumber + 0.5))
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.warning.main)
      .text("Accept Limit");
    
    // Add expected value line
    const expectedValue = sampleSize * defectRate;
    svg.append("line")
      .attr("x1", xScale(expectedValue))
      .attr("y1", 0)
      .attr("x2", xScale(expectedValue))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.info.main)
      .attr("stroke-width", 2);
    
    svg.append("text")
      .attr("x", xScale(expectedValue))
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.info.main)
      .text(`Expected: ${expectedValue.toFixed(1)}`);
    
    // Add acceptance probability
    const acceptProb = calculateAcceptanceProbability(defectRate, sampleSize, acceptanceNumber);
    svg.append("rect")
      .attr("x", 10)
      .attr("y", 10)
      .attr("width", 160)
      .attr("height", 45)
      .attr("fill", "white")
      .attr("stroke", theme.palette.divider)
      .attr("stroke-width", 1)
      .attr("rx", 4);
    
    svg.append("text")
      .attr("x", 20)
      .attr("y", 30)
      .attr("fill", acceptProb > 0.9 ? theme.palette.success.main : 
             acceptProb > 0.5 ? theme.palette.warning.main : theme.palette.error.main)
      .attr("font-weight", "bold")
      .text(`Acceptance Probability:`);
    
    svg.append("text")
      .attr("x", 20)
      .attr("y", 50)
      .attr("fill", acceptProb > 0.9 ? theme.palette.success.main : 
             acceptProb > 0.5 ? theme.palette.warning.main : theme.palette.error.main)
      .attr("font-weight", "bold")
      .text(`${(acceptProb * 100).toFixed(1)}%`);
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 150}, 10)`);
      
      // Acceptable defect count
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", theme.palette.success.main)
        .attr("opacity", 0.7);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 12.5)
        .attr("alignment-baseline", "middle")
        .text("Acceptable");
      
      // Unacceptable defect count
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("y", 25)
        .attr("fill", theme.palette.error.main)
        .attr("opacity", 0.7);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 25 + 12.5)
        .attr("alignment-baseline", "middle")
        .text("Rejectable");
      
      // Acceptance limit
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 55)
        .attr("x2", 15)
        .attr("y2", 55)
        .attr("stroke", theme.palette.warning.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 55)
        .attr("alignment-baseline", "middle")
        .text(`Accept Limit (${acceptanceNumber})`);
      
      // Expected value
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 80)
        .attr("x2", 15)
        .attr("y2", 80)
        .attr("stroke", theme.palette.info.main)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 80)
        .attr("alignment-baseline", "middle")
        .text("Expected Value");
    }
  };
  
  /**
   * Render Operating Characteristic curve using D3.js
   */
  const renderOCCurve = () => {
    if (!ocCurveRef.current || !result?.ocCurveData) return;
    
    // Clear previous chart
    d3.select(ocCurveRef.current).selectAll("*").remove();
    
    const ocData = result.ocCurveData;
    const samplingPlan = result.samplingPlanAnalysis;
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = ocCurveRef.current.clientWidth || 600;
    const height = ocCurveRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(ocCurveRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, 0.2])
      .range([0, innerWidth])
      .nice();
    
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(10)
      .tickFormat(d3.format(".0%"));
    
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
      .text("Lot Defect Rate (p)");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Probability of Acceptance");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Operating Characteristic (OC) Curve");
    
    // Create line generator
    const lineGenerator = d3.line()
      .x(d => xScale(d.defectRate))
      .y(d => yScale(d.acceptProb))
      .curve(d3.curveMonotoneX);
    
    // Add OC curve with animation
    if (showAnimations && isAnimating) {
      const path = svg.append("path")
        .datum(ocData)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2.5)
        .attr("d", lineGenerator)
        .attr("stroke-dasharray", function() {
          return this.getTotalLength();
        })
        .attr("stroke-dashoffset", function() {
          return this.getTotalLength();
        });
      
      path.transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);
    } else {
      svg.append("path")
        .datum(ocData)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2.5)
        .attr("d", lineGenerator);
    }
    
    // Add risk level lines
    // Producer's risk line (at AQL)
    svg.append("line")
      .attr("x1", xScale(samplingPlan.aql))
      .attr("y1", 0)
      .attr("x2", xScale(samplingPlan.aql))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.info.main)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(samplingPlan.aql) + 5)
      .attr("y", 15)
      .attr("text-anchor", "start")
      .attr("fill", theme.palette.info.main)
      .text(`AQL (${(samplingPlan.aql * 100).toFixed(1)}%)`);
    
    // Consumer's risk line (at RQL)
    svg.append("line")
      .attr("x1", xScale(samplingPlan.rql))
      .attr("y1", 0)
      .attr("x2", xScale(samplingPlan.rql))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(samplingPlan.rql) + 5)
      .attr("y", 30)
      .attr("text-anchor", "start")
      .attr("fill", theme.palette.error.main)
      .text(`RQL (${(samplingPlan.rql * 100).toFixed(1)}%)`);
    
    // Add horizontal lines at key probabilities
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(0.95))
      .attr("x2", innerWidth)
      .attr("y2", yScale(0.95))
      .attr("stroke", theme.palette.success.main)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3");
    
    svg.append("text")
      .attr("x", 5)
      .attr("y", yScale(0.95) - 5)
      .attr("fill", theme.palette.success.main)
      .text("95% Acceptance");
    
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(0.1))
      .attr("x2", innerWidth)
      .attr("y2", yScale(0.1))
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3");
    
    svg.append("text")
      .attr("x", 5)
      .attr("y", yScale(0.1) - 5)
      .attr("fill", theme.palette.error.main)
      .text("10% Acceptance");
    
    // Add current defect rate point
    svg.append("circle")
      .attr("cx", xScale(defectRate))
      .attr("cy", yScale(calculateAcceptanceProbability(defectRate, sampleSize, acceptanceNumber)))
      .attr("r", 6)
      .attr("fill", theme.palette.warning.main)
      .attr("stroke", "white")
      .attr("stroke-width", 2);
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 150}, 10)`);
      
      // OC curve
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 7.5)
        .attr("x2", 20)
        .attr("y2", 7.5)
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2.5);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 12.5)
        .attr("alignment-baseline", "middle")
        .text("OC Curve");
      
      // AQL line
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 32.5)
        .attr("x2", 20)
        .attr("y2", 32.5)
        .attr("stroke", theme.palette.info.main)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 37.5)
        .attr("alignment-baseline", "middle")
        .text("AQL");
      
      // RQL line
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 57.5)
        .attr("x2", 20)
        .attr("y2", 57.5)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 62.5)
        .attr("alignment-baseline", "middle")
        .text("RQL");
      
      // Current defect rate
      legend.append("circle")
        .attr("cx", 10)
        .attr("cy", 82.5)
        .attr("r", 5)
        .attr("fill", theme.palette.warning.main)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 87.5)
        .attr("alignment-baseline", "middle")
        .text("Current p");
    }
  };
  
  /**
   * Render inspection operation results using D3.js
   */
  const renderOperationResults = () => {
    if (!operationResultsRef.current || !result?.multipleTrials) return;
    
    // Clear previous chart
    d3.select(operationResultsRef.current).selectAll("*").remove();
    
    const { trials } = result.multipleTrials;
    
    // If we only have one trial, render a visual acceptance/rejection graphic
    if (trials.length === 1) {
      renderSingleInspectionResult(trials[0]);
      return;
    }
    
    // Otherwise, render a histogram of defect counts for multiple trials
    renderMultipleTrialsHistogram(trials);
  };
  
  /**
   * Render single inspection result visualization
   * @param {Object} inspectionResult - Result of a single inspection
   */
  const renderSingleInspectionResult = (inspectionResult) => {
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = operationResultsRef.current.clientWidth || 600;
    const height = operationResultsRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(operationResultsRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Inspection Result");
    
    // Create acceptance indicator
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    const radius = Math.min(innerWidth, innerHeight) / 3;
    
    // Add background circle
    svg.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", radius)
      .attr("fill", inspectionResult.isAccepted ? theme.palette.success.light : theme.palette.error.light)
      .attr("stroke", inspectionResult.isAccepted ? theme.palette.success.dark : theme.palette.error.dark)
      .attr("stroke-width", 3);
    
    // Add icon
    if (inspectionResult.isAccepted) {
      // Check mark for accepted
      svg.append("path")
        .attr("d", "M " + (centerX - radius/2) + " " + centerY + " L " + centerX + " " + (centerY + radius/2) + " L " + (centerX + radius/2) + " " + (centerY - radius/2))
        .attr("stroke", theme.palette.success.dark)
        .attr("stroke-width", 5)
        .attr("fill", "none")
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");
    } else {
      // X mark for rejected
      svg.append("line")
        .attr("x1", centerX - radius/2)
        .attr("y1", centerY - radius/2)
        .attr("x2", centerX + radius/2)
        .attr("y2", centerY + radius/2)
        .attr("stroke", theme.palette.error.dark)
        .attr("stroke-width", 5)
        .attr("stroke-linecap", "round");
      
      svg.append("line")
        .attr("x1", centerX - radius/2)
        .attr("y1", centerY + radius/2)
        .attr("x2", centerX + radius/2)
        .attr("y2", centerY - radius/2)
        .attr("stroke", theme.palette.error.dark)
        .attr("stroke-width", 5)
        .attr("stroke-linecap", "round");
    }
    
    // Add inspection details
    const detailsY = centerY + radius + 30;
    
    svg.append("text")
      .attr("x", centerX)
      .attr("y", detailsY)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(inspectionResult.isAccepted ? "ACCEPTED" : "REJECTED");
    
    svg.append("text")
      .attr("x", centerX)
      .attr("y", detailsY + 25)
      .attr("text-anchor", "middle")
      .text(`${inspectionResult.numDefects} defects found in sample of ${inspectionResult.sampleSize}`);
    
    svg.append("text")
      .attr("x", centerX)
      .attr("y", detailsY + 50)
      .attr("text-anchor", "middle")
      .text(`Defect rate: ${(inspectionResult.percentDefective).toFixed(1)}% vs. limit: ${acceptanceNumber}/${sampleSize} (${(acceptanceNumber/sampleSize*100).toFixed(1)}%)`);
  };
  
  /**
   * Render histogram for multiple trials results
   * @param {Array} trials - Array of trial results
   */
  const renderMultipleTrialsHistogram = (trials) => {
    // Prepare data - count defects
    const defectCounts = trials.map(t => t.numDefects);
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = operationResultsRef.current.clientWidth || 600;
    const height = operationResultsRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(operationResultsRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Determine max defect count for scale
    const maxDefects = Math.max(...defectCounts, acceptanceNumber + 3);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, maxDefects])
      .range([0, innerWidth])
      .nice();
    
    // Create bin generator
    const histogram = d3.histogram()
      .domain(xScale.domain())
      .thresholds(xScale.ticks(Math.min(20, maxDefects)))
      .value(d => d);
    
    // Generate bins
    const bins = histogram(defectCounts);
    
    // Create y scale based on bin counts
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(bins, b => b.length)])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(10, maxDefects))
      .tickFormat(d => Math.round(d).toString());
    
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
      .text("Number of Defects");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Frequency");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(`Defect Distribution in ${trials.length} Trials`);
    
    // Add bars with animation
    if (showAnimations && isAnimating) {
      svg.selectAll(".hist-bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "hist-bar")
        .attr("x", d => xScale(d.x0) + 1)
        .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("fill", d => {
          return d.x1 <= acceptanceNumber + 1 ? theme.palette.success.main : theme.palette.error.main;
        })
        .attr("opacity", 0.7)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 30)
        .attr("y", d => yScale(d.length))
        .attr("height", d => innerHeight - yScale(d.length));
    } else {
      svg.selectAll(".hist-bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "hist-bar")
        .attr("x", d => xScale(d.x0) + 1)
        .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
        .attr("y", d => yScale(d.length))
        .attr("height", d => innerHeight - yScale(d.length))
        .attr("fill", d => {
          return d.x1 <= acceptanceNumber + 1 ? theme.palette.success.main : theme.palette.error.main;
        })
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d) {
          const [mouseX, mouseY] = d3.pointer(event);
          setTooltip({
            visible: true,
            x: mouseX + margin.left,
            y: mouseY + margin.top,
            content: `Defects: ${d.x0}-${d.x1}<br>Count: ${d.length}<br>Percentage: ${(d.length/trials.length*100).toFixed(1)}%`
          });
          d3.select(this).attr("opacity", 1);
        })
        .on("mouseout", function() {
          setTooltip({ ...tooltip, visible: false });
          d3.select(this).attr("opacity", 0.7);
        });
    }
    
    // Add acceptance threshold line
    svg.append("line")
      .attr("x1", xScale(acceptanceNumber + 0.5))
      .attr("y1", 0)
      .attr("x2", xScale(acceptanceNumber + 0.5))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.warning.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(acceptanceNumber + 0.5))
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.warning.main)
      .text("Accept Limit");
    
    // Add expected value line
    const expectedValue = sampleSize * defectRate;
    svg.append("line")
      .attr("x1", xScale(expectedValue))
      .attr("y1", 0)
      .attr("x2", xScale(expectedValue))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.info.main)
      .attr("stroke-width", 2);
    
    svg.append("text")
      .attr("x", xScale(expectedValue))
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.info.main)
      .text(`Expected: ${expectedValue.toFixed(1)}`);
    
    // Add summary statistics
    const acceptedCount = trials.filter(t => t.isAccepted).length;
    const acceptanceRate = acceptedCount / trials.length;
    
    svg.append("rect")
      .attr("x", 10)
      .attr("y", 10)
      .attr("width", 180)
      .attr("height", 65)
      .attr("fill", "white")
      .attr("stroke", theme.palette.divider)
      .attr("stroke-width", 1)
      .attr("rx", 4);
    
    svg.append("text")
      .attr("x", 20)
      .attr("y", 30)
      .attr("fill", "text.primary")
      .attr("font-weight", "bold")
      .text(`Accepted Batches: ${acceptedCount}/${trials.length}`);
    
    svg.append("text")
      .attr("x", 20)
      .attr("y", 50)
      .attr("fill", acceptanceRate > 0.9 ? theme.palette.success.main : 
             acceptanceRate > 0.5 ? theme.palette.warning.main : theme.palette.error.main)
      .attr("font-weight", "bold")
      .text(`Acceptance Rate: ${(acceptanceRate * 100).toFixed(1)}%`);
    
    svg.append("text")
      .attr("x", 20)
      .attr("y", 70)
      .attr("fill", "text.secondary")
      .text(`Avg. Defects: ${(result.multipleTrials.avgDefects).toFixed(1)}`);
  };
  
  // Render charts when data changes
  useEffect(() => {
    if (result) {
      renderDefectsDistribution();
      renderOCCurve();
      renderOperationResults();
    }
  }, [result, animationProgress, showLegend, showDataPoints, showAnimations, activeTab]);
  
  // Re-render charts on window resize
  useEffect(() => {
    const handleResize = () => {
      if (result) {
        renderDefectsDistribution();
        renderOCCurve();
        renderOperationResults();
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
              Sampling Plan Parameters
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Defect Rate (p): {(defectRate * 100).toFixed(1)}%
              </Typography>
              <Slider
                value={defectRate * 100}
                onChange={(e, newValue) => setDefectRate(newValue / 100)}
                min={1}
                max={15}
                step={0.5}
                marks={[
                  { value: 1, label: '1%' },
                  { value: 5, label: '5%' },
                  { value: 15, label: '15%' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Total Batch Size: {batchSize}
              </Typography>
              <Slider
                value={batchSize}
                onChange={(e, newValue) => setBatchSize(newValue)}
                min={100}
                max={10000}
                step={100}
                marks={[
                  { value: 100, label: '100' },
                  { value: 5000, label: '5k' },
                  { value: 10000, label: '10k' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Sample Size (n): {sampleSize}
              </Typography>
              <Slider
                value={sampleSize}
                onChange={(e, newValue) => setSampleSize(newValue)}
                min={10}
                max={500}
                step={10}
                marks={[
                  { value: 10, label: '10' },
                  { value: 250, label: '250' },
                  { value: 500, label: '500' }
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Sampling ratio: {(sampleSize / batchSize * 100).toFixed(1)}% of total batch
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Acceptance Number (c): {acceptanceNumber}
              </Typography>
              <Slider
                value={acceptanceNumber}
                onChange={(e, newValue) => setAcceptanceNumber(newValue)}
                min={0}
                max={10}
                step={1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' }
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Acceptance limit: {(acceptanceNumber / sampleSize * 100).toFixed(1)}% defective in sample
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Acceptable Quality Level (AQL): {(aqlLevel * 100).toFixed(1)}%
              </Typography>
              <Slider
                value={aqlLevel * 100}
                onChange={(e, newValue) => setAqlLevel(newValue / 100)}
                min={0.5}
                max={10}
                step={0.5}
                marks={[
                  { value: 1, label: '1%' },
                  { value: 4, label: '4%' },
                  { value: 10, label: '10%' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Number of Trials: {trials}
              </Typography>
              <Slider
                value={trials}
                onChange={(e, newValue) => setTrials(newValue)}
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
                  Sampling Plan Analysis
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderLeft: '4px solid', 
                                            borderColor: result.samplingPlanAnalysis.aqlAcceptProb > 0.95 ? 'success.main' : 'warning.main' }}>
                  <Typography variant="body2" fontWeight="medium">
                    Plan Performance:
                  </Typography>
                  <Typography variant="body2">
                    <strong>AQL Accept Probability:</strong> {(result.samplingPlanAnalysis.aqlAcceptProb * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>Producer's Risk:</strong> {((1 - result.samplingPlanAnalysis.aqlAcceptProb) * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>Consumer's Risk:</strong> {(calculateAcceptanceProbability(result.samplingPlanAnalysis.rql, sampleSize, acceptanceNumber) * 100).toFixed(1)}%
                  </Typography>
                </Paper>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Quality Levels:
                  </Typography>
                  <Typography variant="body2">
                    <strong>AQL (95% acceptance):</strong> {(result.samplingPlanAnalysis.aql * 100).toFixed(2)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>IQL (50% acceptance):</strong> {(result.samplingPlanAnalysis.iql * 100).toFixed(2)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>RQL (10% acceptance):</strong> {(result.samplingPlanAnalysis.rql * 100).toFixed(2)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>AOQL:</strong> {(result.samplingPlanAnalysis.maxAOQ * 100).toFixed(2)}% at p = {(result.samplingPlanAnalysis.maxAOQPoint * 100).toFixed(2)}%
                  </Typography>
                </Paper>
                
                {/* Results of sampling simulation */}
                {result.multipleTrials.trials.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, borderLeft: '4px solid', 
                                             borderColor: result.multipleTrials.acceptanceRate > 0.9 ? 'success.main' : 
                                                       result.multipleTrials.acceptanceRate > 0.5 ? 'warning.main' : 'error.main' }}>
                    <Typography variant="body2" fontWeight="medium">
                      Simulation Results ({trials} trial{trials > 1 ? 's' : ''}):
                    </Typography>
                    <Typography variant="body2">
                      <strong>Accepted Batches:</strong> {result.multipleTrials.acceptedCount}/{trials} ({(result.multipleTrials.acceptanceRate * 100).toFixed(1)}%)
                    </Typography>
                    <Typography variant="body2">
                      <strong>Rejected Batches:</strong> {result.multipleTrials.rejectedCount}/{trials} ({((1 - result.multipleTrials.acceptanceRate) * 100).toFixed(1)}%)
                    </Typography>
                    <Typography variant="body2">
                      <strong>Average Defects:</strong> {result.multipleTrials.avgDefects.toFixed(1)} ({(result.multipleTrials.avgDefectRate * 100).toFixed(2)}%)
                    </Typography>
                  </Paper>
                )}
                
                {calculateAcceptanceProbability(defectRate, sampleSize, acceptanceNumber) < 0.5 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    The current process defect rate ({(defectRate * 100).toFixed(1)}%) is too high for 
                    this sampling plan. Consider improving the process quality or adjusting the plan parameters.
                  </Alert>
                )}
                
                {defectRate < aqlLevel && acceptanceNumber < 3 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    The process quality is better than AQL. Consider increasing the acceptance number 
                    to reduce the producer's risk while maintaining adequate consumer protection.
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
          
          {/* Educational details */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Manufacturing Quality Control
              </Typography>
              
              <Tooltip title="Acceptance sampling is a statistical quality control technique used to determine whether to accept or reject a batch of products based on an inspection of a sample.">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="body2" paragraph>
              Acceptance sampling uses statistical methods to decide whether to accept or reject a lot of 
              products based on the inspection of a sample. The binomial distribution models the 
              number of defective items in a random sample from a lot.
            </Typography>
            
            <Box sx={{ my: 2, bgcolor: 'background.paper', borderRadius: 1, p: 2, 
                    border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                Binomial Probability Mass Function:
              </Typography>
              
              <Box sx={{ my: 1, textAlign: 'center' }}
                dangerouslySetInnerHTML={{ 
                  __html: renderLatex("P(X = k) = {n \\choose k}p^k(1-p)^{n-k}") 
                }}
              />
              
              <Typography variant="body2" gutterBottom>
                Where:
              </Typography>
              <Typography variant="body2">
                • n = sample size (number of items inspected)
              </Typography>
              <Typography variant="body2">
                • k = number of defective items found
              </Typography>
              <Typography variant="body2">
                • p = defect rate (probability of defect)
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom fontWeight="medium">
              Key Acceptance Sampling Concepts:
            </Typography>
            <Typography variant="body2">
              • <strong>Acceptance Number (c)</strong>: Maximum allowed defects to accept the lot
            </Typography>
            <Typography variant="body2">
              • <strong>AQL</strong>: Acceptable Quality Level - "good enough" quality
            </Typography>
            <Typography variant="body2">
              • <strong>Producer's Risk (α)</strong>: Probability of rejecting a good lot
            </Typography>
            <Typography variant="body2">
              • <strong>Consumer's Risk (β)</strong>: Probability of accepting a bad lot
            </Typography>
            <Typography variant="body2">
              • <strong>OC Curve</strong>: Operating Characteristic curve - shows plan performance
            </Typography>
            <Typography variant="body2">
              • <strong>AOQL</strong>: Average Outgoing Quality Limit - worst-case quality after inspection
            </Typography>
          </Paper>
        </Grid>
        
        {/* Visualization Panel */}
        <Grid item xs={12} md={8}>
          {result ? (
            <Box>
              {/* Defects Distribution Chart */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ height: 300 }} ref={defectsDistributionRef} />
              </Paper>
              
              {/* Tabs for additional charts */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{ mb: 2 }}
                  centered
                >
                  <Tab label="Inspection Results" />
                  <Tab label="OC Curve" />
                </Tabs>
                
                {activeTab === 0 && (
                  <Box sx={{ height: 300 }} ref={operationResultsRef} />
                )}
                
                {activeTab === 1 && (
                  <Box sx={{ height: 300 }} ref={ocCurveRef} />
                )}
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px dashed', 
                         borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                    Insights from the Simulation:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {activeTab === 0 ? 
                      "This chart shows the inspection results from our simulated sampling. Each batch is inspected based on a sample, and the decision to accept or reject is based on the number of defects found. Sampling plans balance the risks of accepting bad lots against rejecting good ones." : 
                      "The OC Curve shows how the sampling plan performs at different quality levels. It plots the probability of accepting a lot against the lot defect rate. A good sampling plan has high acceptance probability at AQL and low acceptance probability at RQL."
                    }
                  </Typography>
                </Box>
              </Paper>
              
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Acceptance Sampling in Manufacturing
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Types of Sampling Plans
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Single Sampling</strong>: One sample determines acceptance/rejection
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Double Sampling</strong>: Second sample taken if first sample is inconclusive
                      </Typography>
                      <Typography variant="body2">
                        <strong>Multiple Sampling</strong>: Several smaller samples used sequentially
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Benefits of Statistical Quality Control
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Reduces inspection costs while maintaining quality
                      </Typography>
                      <Typography variant="body2" paragraph>
                        • Provides quantifiable risk assessment
                      </Typography>
                      <Typography variant="body2">
                        • Creates incentives for process improvement
                      </Typography>
                      <Typography variant="body2">
                        • Standardizes quality decisions
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
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
                Set the parameters and click "Run Simulation" to visualize manufacturing defects
                using the binomial distribution and acceptance sampling.
              </Typography>
              
              <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="medium">
                  What you'll learn:
                </Typography>
                <Typography variant="body2" paragraph>
                  • How the binomial distribution models manufacturing defects
                </Typography>
                <Typography variant="body2" paragraph>
                  • How acceptance sampling plans work in quality control
                </Typography>
                <Typography variant="body2" paragraph>
                  • How to interpret Operating Characteristic (OC) curves
                </Typography>
                <Typography variant="body2" paragraph>
                  • How to balance producer's and consumer's risks
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

export default ManufacturingDefectsD3;