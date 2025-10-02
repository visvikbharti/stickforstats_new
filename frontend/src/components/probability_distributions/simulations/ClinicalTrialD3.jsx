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
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import ScienceIcon from '@mui/icons-material/Science';
import PercentIcon from '@mui/icons-material/Percent';

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
 * Enhanced Clinical Trial simulation using D3.js
 * 
 * This component demonstrates statistical concepts in clinical trials
 * with interactive visualizations for binomial distribution and
 * hypothesis testing for treatment effectiveness
 */
const ClinicalTrialD3 = ({ projectId, setLoading, setError, setSimulationResult, result }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Main simulation parameters
  const [controlSuccess, setControlSuccess] = useState(0.3); // Success rate in control group
  const [treatmentEffect, setTreatmentEffect] = useState(0.2); // Additional success rate in treatment group
  const [sampleSize, setSampleSize] = useState(50); // Number of patients per group
  const [alpha, setAlpha] = useState(0.05); // Significance level
  const [trials, setTrials] = useState(1); // Number of trials to simulate (power analysis)
  
  // Computed parameters
  const treatmentSuccess = controlSuccess + treatmentEffect;
  const powerAnalysisTrials = 1000; // Fixed number of trials for power analysis
  
  // Chart refs
  const distributionChartRef = useRef(null);
  const powerChartRef = useRef(null);
  const trialResultsChartRef = useRef(null);
  
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
   * Calculate normal CDF (Cumulative Distribution Function)
   * @param {number} x - Value
   * @param {number} mean - Mean
   * @param {number} stdDev - Standard deviation
   * @returns {number} Cumulative probability
   */
  const normalCDF = (x, mean, stdDev) => {
    const z = (x - mean) / (stdDev * Math.sqrt(2));
    return 0.5 * (1 + erf(z));
  };
  
  /**
   * Error function approximation for normal CDF calculation
   * @param {number} x - Input value
   * @returns {number} Error function result
   */
  const erf = (x) => {
    // Constants
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    // Save the sign
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    
    // Approximation formula
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  };
  
  /**
   * Run two-sample proportion test (z-test for proportions)
   * Null hypothesis: p1 = p2
   * Alternative hypothesis: p1 ≠ p2 (or p1 < p2, or p1 > p2)
   * @param {number} x1 - Successes in group 1
   * @param {number} n1 - Sample size of group 1
   * @param {number} x2 - Successes in group 2
   * @param {number} n2 - Sample size of group 2
   * @returns {Object} Test results
   */
  const proportionTest = (x1, n1, x2, n2) => {
    // Calculate proportions
    const p1 = x1 / n1;
    const p2 = x2 / n2;
    const diff = p2 - p1; // Treatment - Control
    
    // Calculate pooled proportion under null hypothesis
    const pooledP = (x1 + x2) / (n1 + n2);
    
    // Calculate standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    
    // Calculate z-statistic
    const z = diff / se;
    
    // Calculate p-value (two-tailed)
    const pValue = 2 * (1 - normalCDF(Math.abs(z), 0, 1));
    
    // Calculate confidence interval for difference
    const seDiff = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
    const ciLower = diff - 1.96 * seDiff;
    const ciUpper = diff + 1.96 * seDiff;
    
    return {
      proportion1: p1,
      proportion2: p2,
      difference: diff,
      zScore: z,
      pValue: pValue,
      significant: pValue < alpha,
      confidenceInterval: [ciLower, ciUpper]
    };
  };
  
  /**
   * Run a single clinical trial simulation
   * @returns {Object} Simulation results
   */
  const runSingleTrial = () => {
    // Simulate control group
    const controlSuccesses = generateBinomialRandom(sampleSize, controlSuccess);
    
    // Simulate treatment group
    const treatmentSuccesses = generateBinomialRandom(sampleSize, treatmentSuccess);
    
    // Run statistical test
    const testResults = proportionTest(
      controlSuccesses, sampleSize, 
      treatmentSuccesses, sampleSize
    );
    
    return {
      controlGroup: {
        size: sampleSize,
        successes: controlSuccesses,
        proportion: controlSuccesses / sampleSize
      },
      treatmentGroup: {
        size: sampleSize,
        successes: treatmentSuccesses,
        proportion: treatmentSuccesses / sampleSize
      },
      testResults: testResults
    };
  };
  
  /**
   * Run power analysis by simulating multiple trials
   * @param {number} numTrials - Number of trials to simulate
   * @returns {Object} Power analysis results
   */
  const runPowerAnalysis = (numTrials) => {
    let significantTrials = 0;
    const differenceDistribution = [];
    const pValueDistribution = [];
    
    for (let i = 0; i < numTrials; i++) {
      // Run a single trial
      const trial = runSingleTrial();
      
      // Record results
      differenceDistribution.push(trial.testResults.difference);
      pValueDistribution.push(trial.testResults.pValue);
      
      // Count significant results
      if (trial.testResults.significant) {
        significantTrials++;
      }
    }
    
    // Calculate power (proportion of significant results)
    const power = significantTrials / numTrials;
    
    return {
      power: power,
      differenceDistribution: differenceDistribution,
      pValueDistribution: pValueDistribution,
      numTrials: numTrials,
      significantTrials: significantTrials
    };
  };
  
  /**
   * Calculate theoretical power for given parameters
   * @returns {number} Power (probability of detecting an effect if it exists)
   */
  const calculateTheoreticalPower = () => {
    // Null hypothesis: p1 = p2
    // Alternative hypothesis: p1 ≠ p2
    const p1 = controlSuccess;
    const p2 = treatmentSuccess;
    
    // Calculate standard error under alternative hypothesis
    const se = Math.sqrt(p1 * (1 - p1) / sampleSize + p2 * (1 - p2) / sampleSize);
    
    // Calculate critical value for two-sided test
    const criticalZ = 1.96; // For alpha = 0.05
    
    // Calculate non-centrality parameter
    const ncparam = (p2 - p1) / se;
    
    // Calculate power
    const power = 1 - normalCDF(criticalZ - ncparam, 0, 1) + normalCDF(-criticalZ - ncparam, 0, 1);
    
    return power;
  };
  
  /**
   * Generate simulation data
   * @returns {Object} Simulation result
   */
  const runClientSimulation = () => {
    // Run specified number of trials
    const trialResults = [];
    for (let i = 0; i < trials; i++) {
      trialResults.push(runSingleTrial());
    }
    
    // Run power analysis
    const powerAnalysis = runPowerAnalysis(powerAnalysisTrials);
    
    // Calculate theoretical distributions
    const controlDist = calculateBinomialDistribution(sampleSize, controlSuccess);
    const treatmentDist = calculateBinomialDistribution(sampleSize, treatmentSuccess);
    
    // Calculate theoretical power
    const theoreticalPower = calculateTheoreticalPower();
    
    return {
      trialResults: trialResults,
      powerAnalysis: powerAnalysis,
      theoreticalDistributions: {
        control: controlDist,
        treatment: treatmentDist
      },
      theoreticalPower: theoreticalPower,
      parameters: {
        controlSuccess: controlSuccess,
        treatmentSuccess: treatmentSuccess,
        sampleSize: sampleSize,
        alpha: alpha,
        effect: treatmentEffect
      },
      summary: summarizeTrials(trialResults)
    };
  };
  
  /**
   * Calculate binomial distribution
   * @param {number} n - Number of trials
   * @param {number} p - Probability of success
   * @returns {Object} Distribution data
   */
  const calculateBinomialDistribution = (n, p) => {
    const values = [];
    const pmf = [];
    const cdf = [];
    
    for (let k = 0; k <= n; k++) {
      values.push(k);
      pmf.push(binomialPMF(k, n, p));
      cdf.push(binomialCDF(k, n, p));
    }
    
    return { values, pmf, cdf };
  };
  
  /**
   * Summarize trial results
   * @param {Array} trials - Trial results
   * @returns {Object} Summary statistics
   */
  const summarizeTrials = (trials) => {
    let significantTrials = 0;
    let largerTreatmentEffect = 0;
    let totalControlSuccesses = 0;
    let totalTreatmentSuccesses = 0;
    
    for (const trial of trials) {
      if (trial.testResults.significant) {
        significantTrials++;
      }
      
      if (trial.treatmentGroup.proportion > trial.controlGroup.proportion) {
        largerTreatmentEffect++;
      }
      
      totalControlSuccesses += trial.controlGroup.successes;
      totalTreatmentSuccesses += trial.treatmentGroup.successes;
    }
    
    return {
      numTrials: trials.length,
      significantTrials: significantTrials,
      significantProportion: significantTrials / trials.length,
      largerTreatmentEffect: largerTreatmentEffect,
      largerTreatmentProportion: largerTreatmentEffect / trials.length,
      avgControlProportion: totalControlSuccesses / (sampleSize * trials.length),
      avgTreatmentProportion: totalTreatmentSuccesses / (sampleSize * trials.length)
    };
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
      console.error('Error simulating clinical trial:', err);
      setError('Error running simulation');
    } finally {
      setLoading(false);
    }
  };
  
  // D3.js Visualization Functions
  
  /**
   * Render binomial distributions chart using D3.js
   */
  const renderDistributionChart = () => {
    if (!distributionChartRef.current || !result?.theoreticalDistributions) return;
    
    // Clear previous chart
    d3.select(distributionChartRef.current).selectAll("*").remove();
    
    const controlDist = result.theoreticalDistributions.control;
    const treatmentDist = result.theoreticalDistributions.treatment;
    
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
    const xScale = d3.scaleLinear()
      .domain([0, sampleSize])
      .range([0, innerWidth])
      .nice();
    
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(
        d3.max(controlDist.pmf) * 1.1,
        d3.max(treatmentDist.pmf) * 1.1
      )])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(10, sampleSize));
    
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
      .text("Number of Successes");
    
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
      .text("Binomial Distributions for Treatment and Control Groups");
    
    // Define area generator for control group
    const controlArea = d3.area()
      .x((d, i) => xScale(i))
      .y0(innerHeight)
      .y1(d => yScale(d));
    
    // Define area generator for treatment group
    const treatmentArea = d3.area()
      .x((d, i) => xScale(i))
      .y0(innerHeight)
      .y1(d => yScale(d));
    
    // Add control group area with animation
    const controlPath = svg.append("path")
      .datum(controlDist.pmf)
      .attr("fill", theme.palette.info.main)
      .attr("fill-opacity", 0.4)
      .attr("stroke", "none");
    
    // Add treatment group area with animation
    const treatmentPath = svg.append("path")
      .datum(treatmentDist.pmf)
      .attr("fill", theme.palette.success.main)
      .attr("fill-opacity", 0.4)
      .attr("stroke", "none");
    
    // Add control group line
    const controlLine = svg.append("path")
      .datum(controlDist.pmf)
      .attr("fill", "none")
      .attr("stroke", theme.palette.info.main)
      .attr("stroke-width", 2);
    
    // Add treatment group line
    const treatmentLine = svg.append("path")
      .datum(treatmentDist.pmf)
      .attr("fill", "none")
      .attr("stroke", theme.palette.success.main)
      .attr("stroke-width", 2);
    
    // Define line generator
    const lineGenerator = d3.line()
      .x((d, i) => xScale(i))
      .y(d => yScale(d));
    
    if (showAnimations && isAnimating) {
      // Animate the paths
      controlPath
        .attr("d", d3.area()
          .x((d, i) => xScale(i))
          .y0(innerHeight)
          .y1(innerHeight)
        )
        .transition()
        .duration(1000)
        .attr("d", controlArea);
      
      treatmentPath
        .attr("d", d3.area()
          .x((d, i) => xScale(i))
          .y0(innerHeight)
          .y1(innerHeight)
        )
        .transition()
        .duration(1000)
        .delay(300) // Stagger the animations
        .attr("d", treatmentArea);
      
      controlLine
        .attr("d", d3.line()
          .x((d, i) => xScale(i))
          .y(innerHeight)
        )
        .transition()
        .duration(1000)
        .attr("d", lineGenerator);
      
      treatmentLine
        .attr("d", d3.line()
          .x((d, i) => xScale(i))
          .y(innerHeight)
        )
        .transition()
        .duration(1000)
        .delay(300)
        .attr("d", lineGenerator);
    } else {
      // No animation
      controlPath.attr("d", controlArea);
      treatmentPath.attr("d", treatmentArea);
      controlLine.attr("d", lineGenerator);
      treatmentLine.attr("d", lineGenerator);
    }
    
    // Add expectation lines
    const controlExpectation = sampleSize * controlSuccess;
    svg.append("line")
      .attr("x1", xScale(controlExpectation))
      .attr("y1", innerHeight)
      .attr("x2", xScale(controlExpectation))
      .attr("y2", 0)
      .attr("stroke", theme.palette.info.dark)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(controlExpectation))
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.info.dark)
      .text(`Expected: ${controlExpectation.toFixed(1)}`);
    
    const treatmentExpectation = sampleSize * treatmentSuccess;
    svg.append("line")
      .attr("x1", xScale(treatmentExpectation))
      .attr("y1", innerHeight)
      .attr("x2", xScale(treatmentExpectation))
      .attr("y2", 0)
      .attr("stroke", theme.palette.success.dark)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(treatmentExpectation))
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.success.dark)
      .text(`Expected: ${treatmentExpectation.toFixed(1)}`);
    
    // Add data points if enabled and trial results are available
    if (showDataPoints && result.trialResults && result.trialResults.length > 0) {
      // Get the first trial result
      const trial = result.trialResults[0];
      
      // Control group data point
      svg.append("circle")
        .attr("cx", xScale(trial.controlGroup.successes))
        .attr("cy", yScale(controlDist.pmf[trial.controlGroup.successes]))
        .attr("r", 6)
        .attr("fill", theme.palette.info.dark)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on("mouseover", function(event) {
          const [mouseX, mouseY] = d3.pointer(event);
          setTooltip({
            visible: true,
            x: mouseX + margin.left,
            y: mouseY + margin.top,
            content: `Control Group:<br>Successes: ${trial.controlGroup.successes}<br>Rate: ${(trial.controlGroup.proportion * 100).toFixed(1)}%`
          });
          d3.select(this).attr("r", 8);
        })
        .on("mouseout", function() {
          setTooltip({ ...tooltip, visible: false });
          d3.select(this).attr("r", 6);
        });
      
      // Treatment group data point
      svg.append("circle")
        .attr("cx", xScale(trial.treatmentGroup.successes))
        .attr("cy", yScale(treatmentDist.pmf[trial.treatmentGroup.successes]))
        .attr("r", 6)
        .attr("fill", theme.palette.success.dark)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on("mouseover", function(event) {
          const [mouseX, mouseY] = d3.pointer(event);
          setTooltip({
            visible: true,
            x: mouseX + margin.left,
            y: mouseY + margin.top,
            content: `Treatment Group:<br>Successes: ${trial.treatmentGroup.successes}<br>Rate: ${(trial.treatmentGroup.proportion * 100).toFixed(1)}%`
          });
          d3.select(this).attr("r", 8);
        })
        .on("mouseout", function() {
          setTooltip({ ...tooltip, visible: false });
          d3.select(this).attr("r", 6);
        });
    }
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 170}, 10)`);
      
      // Control group
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", theme.palette.info.main)
        .attr("fill-opacity", 0.4)
        .attr("stroke", theme.palette.info.main)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 12.5)
        .attr("alignment-baseline", "middle")
        .text(`Control (${(controlSuccess * 100).toFixed(0)}%)`);
      
      // Treatment group
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("y", 25)
        .attr("fill", theme.palette.success.main)
        .attr("fill-opacity", 0.4)
        .attr("stroke", theme.palette.success.main)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 25 + 12.5)
        .attr("alignment-baseline", "middle")
        .text(`Treatment (${(treatmentSuccess * 100).toFixed(0)}%)`);
      
      // Data points if shown
      if (showDataPoints) {
        // Control group data point
        legend.append("circle")
          .attr("cx", 7.5)
          .attr("cy", 55)
          .attr("r", 5)
          .attr("fill", theme.palette.info.dark)
          .attr("stroke", "white")
          .attr("stroke-width", 1.5);
        
        legend.append("text")
          .attr("x", 25)
          .attr("y", 55)
          .attr("alignment-baseline", "middle")
          .text("Observed Control");
        
        // Treatment group data point
        legend.append("circle")
          .attr("cx", 7.5)
          .attr("cy", 80)
          .attr("r", 5)
          .attr("fill", theme.palette.success.dark)
          .attr("stroke", "white")
          .attr("stroke-width", 1.5);
        
        legend.append("text")
          .attr("x", 25)
          .attr("y", 80)
          .attr("alignment-baseline", "middle")
          .text("Observed Treatment");
      }
    }
  };
  
  /**
   * Render power analysis chart using D3.js
   */
  const renderPowerChart = () => {
    if (!powerChartRef.current || !result?.powerAnalysis) return;
    
    // Clear previous chart
    d3.select(powerChartRef.current).selectAll("*").remove();
    
    // Data for power vs sample size curve
    const sampleSizes = [];
    const powers = [];
    
    // Generate power curve for different sample sizes
    for (let n = 10; n <= 200; n += 10) {
      sampleSizes.push(n);
      
      // Calculate SE for this sample size
      const se = Math.sqrt(
        controlSuccess * (1 - controlSuccess) / n + 
        treatmentSuccess * (1 - treatmentSuccess) / n
      );
      
      // Calculate power
      const criticalZ = 1.96; // For alpha = 0.05
      const ncparam = (treatmentSuccess - controlSuccess) / se;
      const power = 1 - normalCDF(criticalZ - ncparam, 0, 1) + normalCDF(-criticalZ - ncparam, 0, 1);
      
      powers.push(power);
    }
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = powerChartRef.current.clientWidth || 600;
    const height = powerChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(powerChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales for power curve
    const xScale = d3.scaleLinear()
      .domain([0, 200])
      .range([0, innerWidth])
      .nice();
    
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0])
      .nice();
    
    // Create line generator for power curve
    const lineGenerator = d3.line()
      .x((d, i) => xScale(sampleSizes[i]))
      .y(d => yScale(d));
    
    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d3.format(".0%"));
    
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
      .text("Sample Size Per Group");
    
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Statistical Power");
    
    // Add title
    svg.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Statistical Power vs Sample Size");
    
    // Add power curve
    if (showAnimations && isAnimating) {
      const path = svg.append("path")
        .datum(powers)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", function() {
          return this.getTotalLength();
        })
        .attr("stroke-dashoffset", function() {
          return this.getTotalLength();
        })
        .attr("d", lineGenerator);
      
      path.transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);
    } else {
      svg.append("path")
        .datum(powers)
        .attr("fill", "none")
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);
    }
    
    // Add power threshold lines at 0.8 and 0.9
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(0.8))
      .attr("x2", innerWidth)
      .attr("y2", yScale(0.8))
      .attr("stroke", theme.palette.info.main)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(0.8) - 5)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.info.main)
      .text("80% Power");
    
    svg.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(0.9))
      .attr("x2", innerWidth)
      .attr("y2", yScale(0.9))
      .attr("stroke", theme.palette.success.main)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", innerWidth - 5)
      .attr("y", yScale(0.9) - 5)
      .attr("text-anchor", "end")
      .attr("fill", theme.palette.success.main)
      .text("90% Power");
    
    // Add current sample size indicator
    svg.append("line")
      .attr("x1", xScale(sampleSize))
      .attr("y1", 0)
      .attr("x2", xScale(sampleSize))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.warning.main)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5");
    
    // Find power for current sample size
    const currentPowerIndex = sampleSizes.findIndex(n => n >= sampleSize);
    const currentPower = currentPowerIndex >= 0 ? powers[currentPowerIndex] : 
                          result.theoreticalPower;
    
    svg.append("circle")
      .attr("cx", xScale(sampleSize))
      .attr("cy", yScale(currentPower))
      .attr("r", 6)
      .attr("fill", theme.palette.warning.main)
      .attr("stroke", "white")
      .attr("stroke-width", 2);
    
    svg.append("text")
      .attr("x", xScale(sampleSize))
      .attr("y", yScale(currentPower) - 10)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.warning.main)
      .text(`Current: ${(currentPower * 100).toFixed(1)}%`);
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(10, 10)`);
      
      // Power curve
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 7.5)
        .attr("x2", 20)
        .attr("y2", 7.5)
        .attr("stroke", theme.palette.primary.main)
        .attr("stroke-width", 2);
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 12.5)
        .attr("alignment-baseline", "middle")
        .text("Power Curve");
      
      // 80% Power threshold
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
        .text("80% Power");
      
      // 90% Power threshold
      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 57.5)
        .attr("x2", 20)
        .attr("y2", 57.5)
        .attr("stroke", theme.palette.success.main)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5");
      
      legend.append("text")
        .attr("x", 30)
        .attr("y", 62.5)
        .attr("alignment-baseline", "middle")
        .text("90% Power");
      
      // Current sample size
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
        .text("Current Design");
    }
  };
  
  /**
   * Render trial results chart using D3.js
   */
  const renderTrialResultsChart = () => {
    if (!trialResultsChartRef.current || !result?.trialResults || result.trialResults.length === 0) return;
    
    // Clear previous chart
    d3.select(trialResultsChartRef.current).selectAll("*").remove();
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = trialResultsChartRef.current.clientWidth || 600;
    const height = trialResultsChartRef.current.clientHeight || 300;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(trialResultsChartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create data for difference plot
    const differences = result.trialResults.map(trial => 
      trial.treatmentGroup.proportion - trial.controlGroup.proportion
    );
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([-0.3, 0.3])
      .range([0, innerWidth])
      .nice();
    
    // Create bin generator with custom domain
    const histGenerator = d3.histogram()
      .domain(xScale.domain())
      .thresholds(xScale.ticks(20));
    
    // Generate bins
    const bins = histGenerator(differences);
    
    // Normalize bin counts
    const maxCount = d3.max(bins, b => b.length);
    const normalizedBins = bins.map(bin => ({
      x0: bin.x0,
      x1: bin.x1,
      length: bin.length,
      normalized: bin.length / maxCount
    }));
    
    // Create y scale for normalized bin counts
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0])
      .nice();
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format(".0%"));
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${Math.round(d * maxCount)}`);
    
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
      .text("Treatment Effect (Difference in Proportions)");
    
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
      .text("Distribution of Treatment Effects");
    
    // Add rectangle for each bin with animation
    const rects = svg.selectAll(".bin")
      .data(normalizedBins)
      .enter()
      .append("rect")
      .attr("class", "bin")
      .attr("x", d => xScale(d.x0))
      .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
      .attr("fill", d => {
        // Determine if the bin is significant
        const isSignificant = 
          (d.x0 > 0 && d.x0 > 1.96 * Math.sqrt(controlSuccess * (1 - controlSuccess) / sampleSize + treatmentSuccess * (1 - treatmentSuccess) / sampleSize)) ||
          (d.x1 < 0 && d.x1 < -1.96 * Math.sqrt(controlSuccess * (1 - controlSuccess) / sampleSize + treatmentSuccess * (1 - treatmentSuccess) / sampleSize));
        
        return isSignificant ? theme.palette.success.main : theme.palette.primary.main;
      })
      .attr("opacity", 0.7);
    
    if (showAnimations && isAnimating) {
      rects
        .attr("y", innerHeight)
        .attr("height", 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 20)
        .attr("y", d => yScale(d.normalized))
        .attr("height", d => innerHeight - yScale(d.normalized));
    } else {
      rects
        .attr("y", d => yScale(d.normalized))
        .attr("height", d => innerHeight - yScale(d.normalized));
    }
    
    // Add true effect line
    svg.append("line")
      .attr("x1", xScale(treatmentEffect))
      .attr("y1", 0)
      .attr("x2", xScale(treatmentEffect))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.warning.main)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
      .attr("x", xScale(treatmentEffect))
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.warning.main)
      .text("True Effect");
    
    // Add mean observed effect line
    const meanEffect = d3.mean(differences);
    svg.append("line")
      .attr("x1", xScale(meanEffect))
      .attr("y1", 0)
      .attr("x2", xScale(meanEffect))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.info.main)
      .attr("stroke-width", 2);
    
    svg.append("text")
      .attr("x", xScale(meanEffect))
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", theme.palette.info.main)
      .text("Observed Mean");
    
    // Add zero effect line
    svg.append("line")
      .attr("x1", xScale(0))
      .attr("y1", 0)
      .attr("x2", xScale(0))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.text.secondary)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
    
    // Add significance region shading (assuming alpha = 0.05, two-tailed z-test)
    const se = Math.sqrt(
      controlSuccess * (1 - controlSuccess) / sampleSize + 
      treatmentSuccess * (1 - treatmentSuccess) / sampleSize
    );
    const criticalDiff = 1.96 * se;
    
    // Left critical region
    svg.append("rect")
      .attr("x", xScale(-0.3))
      .attr("y", 0)
      .attr("width", xScale(-criticalDiff) - xScale(-0.3))
      .attr("height", innerHeight)
      .attr("fill", theme.palette.success.main)
      .attr("opacity", 0.1);
    
    // Right critical region
    svg.append("rect")
      .attr("x", xScale(criticalDiff))
      .attr("y", 0)
      .attr("width", xScale(0.3) - xScale(criticalDiff))
      .attr("height", innerHeight)
      .attr("fill", theme.palette.success.main)
      .attr("opacity", 0.1);
    
    // Add critical difference markers
    svg.append("line")
      .attr("x1", xScale(-criticalDiff))
      .attr("y1", innerHeight + 5)
      .attr("x2", xScale(-criticalDiff))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 2);
    
    svg.append("line")
      .attr("x1", xScale(criticalDiff))
      .attr("y1", innerHeight + 5)
      .attr("x2", xScale(criticalDiff))
      .attr("y2", innerHeight)
      .attr("stroke", theme.palette.error.main)
      .attr("stroke-width", 2);
    
    // Add legend if enabled
    if (showLegend) {
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 160}, 10)`);
      
      // Non-significant
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", theme.palette.primary.main)
        .attr("opacity", 0.7);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 12.5)
        .attr("alignment-baseline", "middle")
        .text("Non-significant");
      
      // Significant
      legend.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("y", 25)
        .attr("fill", theme.palette.success.main)
        .attr("opacity", 0.7);
      
      legend.append("text")
        .attr("x", 25)
        .attr("y", 25 + 12.5)
        .attr("alignment-baseline", "middle")
        .text("Significant");
      
      // True effect
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
        .text("True Effect");
      
      // Mean observed effect
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
        .text("Observed Mean");
    }
  };
  
  // Render charts when data changes
  useEffect(() => {
    if (result) {
      renderDistributionChart();
      renderPowerChart();
      renderTrialResultsChart();
    }
  }, [result, animationProgress, showLegend, showDataPoints, showAnimations, activeTab]);
  
  // Re-render charts on window resize
  useEffect(() => {
    const handleResize = () => {
      if (result) {
        renderDistributionChart();
        renderPowerChart();
        renderTrialResultsChart();
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
              Trial Parameters
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Control Group Success Rate: {(controlSuccess * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={controlSuccess * 100}
                onChange={(e, newValue) => setControlSuccess(newValue / 100)}
                min={10}
                max={50}
                step={1}
                marks={[
                  { value: 10, label: '10%' },
                  { value: 30, label: '30%' },
                  { value: 50, label: '50%' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Treatment Effect (Additional Success): {(treatmentEffect * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={treatmentEffect * 100}
                onChange={(e, newValue) => setTreatmentEffect(newValue / 100)}
                min={5}
                max={30}
                step={1}
                marks={[
                  { value: 5, label: '5%' },
                  { value: 15, label: '15%' },
                  { value: 30, label: '30%' }
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Treatment success rate: {(treatmentSuccess * 100).toFixed(0)}%
              </Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Sample Size (per group): {sampleSize}
              </Typography>
              <Slider
                value={sampleSize}
                onChange={(e, newValue) => setSampleSize(newValue)}
                min={10}
                max={200}
                step={5}
                marks={[
                  { value: 10, label: '10' },
                  { value: 100, label: '100' },
                  { value: 200, label: '200' }
                ]}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Significance Level (α): {(alpha * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={alpha * 100}
                onChange={(e, newValue) => setAlpha(newValue / 100)}
                min={1}
                max={10}
                step={1}
                marks={[
                  { value: 1, label: '1%' },
                  { value: 5, label: '5%' },
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
                  Simulation Results
                </Typography>
                
                {/* First trial results */}
                {result.trialResults.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, borderLeft: '4px solid', 
                                              borderColor: result.trialResults[0].testResults.significant ? 'success.main' : 'error.main' }}>
                    <Typography variant="body2" fontWeight="medium">
                      First Trial Outcome:
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Control: {result.trialResults[0].controlGroup.successes}/{result.trialResults[0].controlGroup.size} ({(result.trialResults[0].controlGroup.proportion * 100).toFixed(1)}%)
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Treatment: {result.trialResults[0].treatmentGroup.successes}/{result.trialResults[0].treatmentGroup.size} ({(result.trialResults[0].treatmentGroup.proportion * 100).toFixed(1)}%)
                        </Typography>
                      </Grid>
                    </Grid>
                    <Typography variant="body2">
                      <strong>Difference:</strong> {(result.trialResults[0].testResults.difference * 100).toFixed(1)}% 
                      <Typography component="span" color={result.trialResults[0].testResults.significant ? 'success.main' : 'error.main'}>
                        {' '}({result.trialResults[0].testResults.significant ? 'significant' : 'not significant'})
                      </Typography>
                    </Typography>
                    <Typography variant="body2">
                      <strong>p-value:</strong> {result.trialResults[0].testResults.pValue.toFixed(4)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>95% CI:</strong> ({(result.trialResults[0].testResults.confidenceInterval[0] * 100).toFixed(1)}%, {(result.trialResults[0].testResults.confidenceInterval[1] * 100).toFixed(1)}%)
                    </Typography>
                  </Paper>
                )}
                
                {/* Power analysis results */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderLeft: '4px solid', 
                                            borderColor: result.theoreticalPower >= 0.8 ? 'success.main' : 'warning.main' }}>
                  <Typography variant="body2" fontWeight="medium">
                    Statistical Power Analysis:
                  </Typography>
                  <Typography variant="body2">
                    <strong>Theoretical Power:</strong> {(result.theoreticalPower * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>Simulated Power:</strong> {(result.powerAnalysis.power * 100).toFixed(1)}% 
                    <Typography component="span" color="text.secondary">
                      {' '}({result.powerAnalysis.significantTrials}/{result.powerAnalysis.numTrials} trials)
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Power is the probability of detecting a true effect if it exists.
                  </Typography>
                </Paper>
                
                {/* Multiple trials summary if more than 1 trial */}
                {trials > 1 && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="body2" fontWeight="medium">
                      Multiple Trials Summary (n={trials}):
                    </Typography>
                    <Typography variant="body2">
                      <strong>Significant Results:</strong> {result.summary.significantProportion * 100}% ({result.summary.significantTrials}/{result.summary.numTrials} trials)
                    </Typography>
                    <Typography variant="body2">
                      <strong>Treatment Better:</strong> {result.summary.largerTreatmentProportion * 100}% ({result.summary.largerTreatmentEffect}/{result.summary.numTrials} trials)
                    </Typography>
                    <Typography variant="body2">
                      <strong>Avg. Control Rate:</strong> {(result.summary.avgControlProportion * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2">
                      <strong>Avg. Treatment Rate:</strong> {(result.summary.avgTreatmentProportion * 100).toFixed(1)}%
                    </Typography>
                  </Paper>
                )}
                
                {result.theoreticalPower < 0.8 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Statistical power ({(result.theoreticalPower * 100).toFixed(1)}%) is below the recommended 80%. 
                    Consider increasing sample size to detect the specified effect.
                  </Alert>
                )}
                
                {trials === 1 && !result.trialResults[0].testResults.significant && result.theoreticalPower >= 0.5 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This trial did not show a significant effect, but your study design has {(result.theoreticalPower * 100).toFixed(0)}% power. 
                    Try running the simulation again - effect may be detected in future trials.
                  </Alert>
                )}
              </Box>
            )}
          </Paper>
          
          {/* Educational details */}
          <Paper sx={{ p: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Clinical Trial Basics
              </Typography>
              
              <Tooltip title="Clinical trials are designed to test the efficacy of treatments by comparing outcomes between treatment and control groups.">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="body2" paragraph>
              Clinical trials use statistical methods to determine if a treatment effect is 
              real or due to chance. The binomial distribution models the number of successful 
              outcomes in a fixed number of independent trials.
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
                • n = sample size (number of patients)
              </Typography>
              <Typography variant="body2">
                • k = number of successes
              </Typography>
              <Typography variant="body2">
                • p = probability of success for each patient
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom fontWeight="medium">
              Key Clinical Trial Concepts:
            </Typography>
            <Typography variant="body2">
              • <strong>Power</strong>: Probability of detecting a real treatment effect (1-β)
            </Typography>
            <Typography variant="body2">
              • <strong>Significance Level (α)</strong>: Probability of falsely concluding an effect exists
            </Typography>
            <Typography variant="body2">
              • <strong>Effect Size</strong>: The magnitude of difference between treatment and control
            </Typography>
            <Typography variant="body2">
              • <strong>p-value</strong>: Probability of observing the data (or more extreme) if no effect exists
            </Typography>
            <Typography variant="body2">
              • <strong>Confidence Interval</strong>: Range of plausible values for the true effect
            </Typography>
          </Paper>
        </Grid>
        
        {/* Visualization Panel */}
        <Grid item xs={12} md={8}>
          {result ? (
            <Box>
              {/* Distribution Chart */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ height: 300 }} ref={distributionChartRef} />
              </Paper>
              
              {/* Tabs for additional charts */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{ mb: 2 }}
                  centered
                >
                  <Tab label="Trial Results" />
                  <Tab label="Power Analysis" />
                </Tabs>
                
                {activeTab === 0 && (
                  <Box sx={{ height: 300 }} ref={trialResultsChartRef} />
                )}
                
                {activeTab === 1 && (
                  <Box sx={{ height: 300 }} ref={powerChartRef} />
                )}
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px dashed', 
                         borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                    Insights from the Simulation:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {activeTab === 0 ? 
                      "This chart shows the distribution of observed differences between treatment and control groups across multiple simulated trials. Significant results (outside the critical region) are highlighted. Notice how the distribution is centered around the true effect size, but individual trials vary due to sampling variation." : 
                      "This chart shows how statistical power increases with sample size. Power is the probability of detecting a true effect if it exists. A study with inadequate power might fail to detect important treatment effects, while a study with excessive power might waste resources."
                    }
                  </Typography>
                </Box>
              </Paper>
              
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Statistical Concepts in Clinical Trials
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Type I and Type II Errors
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Type I Error (α)</strong>: False positive - concluding a treatment works when it does not
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Type II Error (β)</strong>: False negative - failing to detect a treatment that works
                      </Typography>
                      <Typography variant="body2">
                        These errors trade off against each other. Decreasing α increases β (and decreases power).
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Sample Size Determination
                      </Typography>
                      <Typography variant="body2" paragraph>
                        Sample size should be calculated to achieve adequate power (typically 80-90%)
                        while maintaining an acceptable significance level (typically 5%).
                      </Typography>
                      <Typography variant="body2">
                        Larger effect sizes require smaller samples, while smaller effect sizes
                        require larger samples to detect.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', 
                        flexDirection: 'column', justifyContent: 'center' }}>
              <MedicalServicesIcon sx={{ fontSize: 80, color: 'text.secondary', mx: 'auto', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Simulation Data
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Set the parameters and click "Run Simulation" to visualize clinical trial statistics
                using the binomial distribution.
              </Typography>
              
              <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom color="primary" fontWeight="medium">
                  What you'll learn:
                </Typography>
                <Typography variant="body2" paragraph>
                  • How the binomial distribution models success/failure outcomes in clinical trials
                </Typography>
                <Typography variant="body2" paragraph>
                  • The relationship between sample size, effect size, and statistical power
                </Typography>
                <Typography variant="body2" paragraph>
                  • How to interpret p-values and confidence intervals
                </Typography>
                <Typography variant="body2" paragraph>
                  • Why some trials fail to detect real treatment effects
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

export default ClinicalTrialD3;