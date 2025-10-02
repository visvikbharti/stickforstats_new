import React, { useRef, useEffect, useState } from 'react';
import { 
  Box,
  Typography,
  Slider,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoIcon from '@mui/icons-material/Info';
import FunctionsIcon from '@mui/icons-material/Functions';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';

// For direct calculation without API
const calculatePmfPdf = (type, params, xValues) => {
  let pmfPdfValues = [];
  
  switch (type) {
    case 'NORMAL':
      pmfPdfValues = xValues.map(x => {
        const z = (x - params.mean) / params.std;
        return (1 / (params.std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
      });
      break;
      
    case 'BINOMIAL':
      pmfPdfValues = xValues.map(k => {
        if (k < 0 || k > params.n) return 0;
        
        // Calculate binomial PMF using log for numerical stability
        const logP = Math.log(params.p);
        const log1minusP = Math.log(1 - params.p);
        
        // Log factorial function
        const logFact = (num) => {
          let result = 0;
          for (let i = 2; i <= num; i++) {
            result += Math.log(i);
          }
          return result;
        };
        
        // Log of binomial coefficient
        const logCoef = logFact(params.n) - logFact(k) - logFact(params.n - k);
        
        // Log PMF
        const logPMF = logCoef + k * logP + (params.n - k) * log1minusP;
        return Math.exp(logPMF);
      });
      break;
      
    case 'POISSON':
      pmfPdfValues = xValues.map(k => {
        if (k < 0) return 0;
        
        // Calculate Poisson PMF
        const logFact = (num) => {
          let result = 0;
          for (let i = 2; i <= num; i++) {
            result += Math.log(i);
          }
          return result;
        };
        
        const logPMF = k * Math.log(params.lambda) - params.lambda - logFact(k);
        return Math.exp(logPMF);
      });
      break;
      
    case 'EXPONENTIAL':
      pmfPdfValues = xValues.map(x => {
        if (x < 0) return 0;
        return params.rate * Math.exp(-params.rate * x);
      });
      break;
      
    default:
      pmfPdfValues = Array(xValues.length).fill(0);
  }
  
  return { x_values: xValues, pmf_pdf_values: pmfPdfValues };
};

const calculateCdf = (type, params, xValues) => {
  let cdfValues = [];
  
  switch (type) {
    case 'NORMAL': {
      // Error function for normal CDF
      const erf = (x) => {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = (x < 0) ? -1 : 1;
        x = Math.abs(x);
        
        const t = 1.0/(1.0 + p*x);
        const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
        
        return sign*y;
      };
      
      cdfValues = xValues.map(x => {
        const z = (x - params.mean) / (params.std * Math.sqrt(2));
        return 0.5 * (1 + erf(z));
      });
      break;
    }
      
    case 'BINOMIAL': {
      // Calculate cumulative sum of PMF
      const pmfResult = calculatePmfPdf(type, params, xValues);
      cdfValues = [];
      let sum = 0;
      
      for (const pmf of pmfResult.pmf_pdf_values) {
        sum += pmf;
        cdfValues.push(sum);
      }
      break;
    }
      
    case 'POISSON': {
      // Calculate cumulative sum of PMF
      const pmfResult = calculatePmfPdf(type, params, xValues);
      cdfValues = [];
      let sum = 0;
      
      for (const pmf of pmfResult.pmf_pdf_values) {
        sum += pmf;
        cdfValues.push(sum);
      }
      break;
    }
      
    case 'EXPONENTIAL':
      cdfValues = xValues.map(x => {
        if (x < 0) return 0;
        return 1 - Math.exp(-params.rate * x);
      });
      break;
      
    default:
      cdfValues = Array(xValues.length).fill(0);
  }
  
  return { x_values: xValues, cdf_values: cdfValues };
};

const generateRandomSample = (type, params, size) => {
  let sample = [];
  
  switch (type) {
    case 'NORMAL': {
      // Box-Muller transform for normal distribution
      for (let i = 0; i < size; i += 2) {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sample.push(params.mean + params.std * z1);
        
        if (i + 1 < size) {
          const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
          sample.push(params.mean + params.std * z2);
        }
      }
      break;
    }
      
    case 'BINOMIAL': {
      // Generate binomial samples
      for (let i = 0; i < size; i++) {
        let successes = 0;
        for (let j = 0; j < params.n; j++) {
          if (Math.random() < params.p) {
            successes++;
          }
        }
        sample.push(successes);
      }
      break;
    }
      
    case 'POISSON': {
      // Knuth's algorithm for Poisson distribution
      for (let i = 0; i < size; i++) {
        const L = Math.exp(-params.lambda);
        let k = 0;
        let p = 1;
        
        do {
          k++;
          p *= Math.random();
        } while (p > L);
        
        sample.push(k - 1);
      }
      break;
    }
      
    case 'EXPONENTIAL': {
      // Inverse transform sampling for exponential distribution
      for (let i = 0; i < size; i++) {
        const u = Math.random();
        sample.push(-Math.log(1 - u) / params.rate);
      }
      break;
    }
      
    default:
      sample = Array(size).fill(0);
  }
  
  return { sample };
};

// Animation state constants
const ANIMATION_STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

const DistributionAnimation = ({ type }) => {
  const [animationState, setAnimationState] = useState(ANIMATION_STATE.IDLE);
  const [animationStep, setAnimationStep] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [distributionParams, setDistributionParams] = useState(getDefaultParams(type));
  const [sampleData, setSampleData] = useState([]);
  const [theoreticalData, setTheoreticalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  
  const animationRef = useRef(null);
  const chartRef = useRef(null);
  
  // Generate default parameters based on distribution type
  function getDefaultParams(type) {
    switch (type) {
      case 'NORMAL':
        return { mean: 0, std: 1 };
      case 'BINOMIAL':
        return { n: 10, p: 0.5 };
      case 'POISSON':
        return { lambda: 5 };
      case 'EXPONENTIAL':
        return { rate: 1 };
      default:
        return {};
    }
  }
  
  // Generate x-values based on distribution type
  const generateXValues = () => {
    let min, max, step;
    let count = 100; // Number of points to plot
    
    switch (type) {
      case 'NORMAL':
        min = distributionParams.mean - 4 * distributionParams.std;
        max = distributionParams.mean + 4 * distributionParams.std;
        break;
      
      case 'BINOMIAL':
        min = 0;
        max = distributionParams.n;
        count = distributionParams.n + 1; // One point for each possible value
        break;
      
      case 'POISSON':
        min = 0;
        max = Math.max(20, distributionParams.lambda * 3);
        count = Math.ceil(max) + 1; // One point for each possible value
        break;
      
      case 'EXPONENTIAL':
        min = 0;
        max = 5 / distributionParams.rate; // 5 times the mean
        break;
      
      default:
        min = -5;
        max = 5;
    }
    
    step = (max - min) / (count - 1);
    
    // For discrete distributions, generate integer x values
    if (['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(type)) {
      return Array.from({ length: count }, (_, i) => Math.floor(min + i));
    }
    
    // For continuous distributions, generate evenly spaced x values
    return Array.from({ length: count }, (_, i) => min + i * step);
  };
  
  // Fetch theoretical distribution data
  const fetchDistributionData = async () => {
    setLoading(true);
    
    try {
      const xValues = generateXValues();
      
      const [pmfPdfResult, cdfResult] = await Promise.all([
        calculatePmfPdf(type, distributionParams, xValues),
        calculateCdf(type, distributionParams, xValues)
      ]);
      
      setTheoreticalData({
        xValues: pmfPdfResult.x_values,
        pmfPdfValues: pmfPdfResult.pmf_pdf_values,
        cdfValues: cdfResult.cdf_values
      });
    } catch (error) {
      console.error('Error fetching distribution data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate a random sample from the distribution
  const generateSample = async (sampleSize = 100) => {
    setLoading(true);
    
    try {
      const result = await generateRandomSample(type, distributionParams, sampleSize);
      return result.sample;
    } catch (error) {
      console.error('Error generating random sample:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Handle animation steps
  useEffect(() => {
    if (animationState === ANIMATION_STATE.PLAYING) {
      const maxSteps = getAnimationSteps().length - 1;
      
      if (animationStep < maxSteps) {
        const timeout = setTimeout(() => {
          setAnimationStep(prev => prev + 1);
        }, 2000 / animationSpeed);
        
        return () => clearTimeout(timeout);
      } else {
        setAnimationState(ANIMATION_STATE.COMPLETED);
      }
    }
  }, [animationState, animationStep, animationSpeed]);
  
  // Update explanation based on current animation step
  useEffect(() => {
    const steps = getAnimationSteps();
    if (steps[animationStep]) {
      setCurrentExplanation(steps[animationStep].explanation);
      
      // Execute the step's function if it exists
      if (steps[animationStep].execute) {
        steps[animationStep].execute();
      }
    }
  }, [animationStep]);
  
  // Initial data fetch and reset animation when parameters change
  useEffect(() => {
    fetchDistributionData();
    // Reset the animation state and sample data when distribution parameters change
    if (animationState !== ANIMATION_STATE.IDLE) {
      resetAnimation();
    }
  }, [type, distributionParams]);

  // Update explanation text when distribution parameters change
  useEffect(() => {
    if (animationStep > 0) {
      const steps = getAnimationSteps();
      if (steps[animationStep]) {
        setCurrentExplanation(steps[animationStep].explanation);
      }
    }
  }, [distributionParams]);
  
  // Animation controls
  const playAnimation = () => {
    if (animationState === ANIMATION_STATE.COMPLETED) {
      // If completed, reset and play from beginning
      setAnimationStep(0);
    }
    setAnimationState(ANIMATION_STATE.PLAYING);
  };
  
  const pauseAnimation = () => {
    setAnimationState(ANIMATION_STATE.PAUSED);
  };
  
  const resetAnimation = () => {
    setAnimationStep(0);
    setAnimationState(ANIMATION_STATE.IDLE);
    setSampleData([]);
  };
  
  // Handle animation speed change
  const handleSpeedChange = (event, newValue) => {
    setAnimationSpeed(newValue);
  };

  // Reset animation and apply new parameters
  const applyParameterChanges = () => {
    resetAnimation();
    fetchDistributionData();
  };
  
  // Define animation steps based on distribution type
  const getAnimationSteps = () => {
    switch (type) {
      case 'NORMAL':
        return [
          {
            explanation: "The Normal distribution is characterized by its bell-shaped curve and is fully specified by two parameters: the mean (μ) and standard deviation (σ). Try adjusting these parameters using the sliders to see how they affect the distribution.",
            execute: null
          },
          {
            explanation: `The mean (μ = ${distributionParams.mean}) determines the center of the distribution. You can adjust the mean slider to visualize how changing this parameter shifts the entire distribution without changing its shape.`,
            execute: null
          },
          {
            explanation: `The standard deviation (σ = ${distributionParams.std}) determines the spread or width of the distribution. Try changing the standard deviation slider - a larger σ creates a wider, flatter curve, while a smaller σ creates a narrower, taller curve.`,
            execute: null
          },
          {
            explanation: "Now let's generate random samples from this distribution to see the Law of Large Numbers in action. The sample distribution will begin to approximate the theoretical curve as sample size increases.",
            execute: async () => {
              const sample = await generateSample(50);
              setSampleData(sample);
            }
          },
          {
            explanation: "As we increase the sample size, the histogram of our samples begins to approximate the theoretical probability density function (PDF) more closely. This demonstrates the Law of Large Numbers in practice.",
            execute: async () => {
              const newSample = await generateSample(500);
              setSampleData(newSample);
            }
          },
          {
            explanation: "The Normal distribution is central to statistics because of the Central Limit Theorem, which states that the sampling distribution of the mean approaches a normal distribution as sample size increases, regardless of the original population distribution.",
            execute: null
          },
          {
            explanation: `One important property of the Normal distribution is the 68-95-99.7 rule: approximately 68% of values lie within 1 standard deviation (±${distributionParams.std.toFixed(2)}) of the mean, 95% within 2 standard deviations (±${(2 * distributionParams.std).toFixed(2)}), and 99.7% within 3 standard deviations (±${(3 * distributionParams.std).toFixed(2)}).`,
            execute: null
          }
        ];

      case 'BINOMIAL':
        return [
          {
            explanation: "The Binomial distribution models the number of successes in a fixed number of independent trials, each with the same probability of success. Use the sliders to adjust n (number of trials) and p (success probability).",
            execute: null
          },
          {
            explanation: "It is parameterized by n (the number of trials) and p (the probability of success on each trial).",
            execute: null
          },
          {
            explanation: `Let's visualize how increasing the number of trials (n) affects the distribution. Try adjusting the n slider while keeping p constant. The current value is n = ${distributionParams.n}.`,
            execute: null
          },
          {
            explanation: `Now let's see how changing the success probability (p) affects the shape of the distribution. Try adjusting the p slider while keeping n constant. The current value is p = ${distributionParams.p}.`,
            execute: null
          },
          {
            explanation: "When p = 0.5, the distribution is symmetric. When p < 0.5, it is skewed to the right, and when p > 0.5, it is skewed to the left.",
            execute: null
          },
          {
            explanation: "Let's generate random samples from this Binomial distribution to see how the sample distribution compares to the theoretical PMF. The blue line shows the theoretical distribution, while the red bars show the histogram of sampled values.",
            execute: async () => {
              const sample = await generateSample(100);
              setSampleData(sample);
            }
          },
          {
            explanation: `As the number of trials (n) increases, the Binomial distribution can be approximated by a Normal distribution with mean np = ${(distributionParams.n * distributionParams.p).toFixed(2)} and variance np(1-p) = ${(distributionParams.n * distributionParams.p * (1 - distributionParams.p)).toFixed(2)}. This is known as the Normal approximation to the Binomial.`,
            execute: async () => {
              const newSample = await generateSample(500);
              setSampleData(newSample);
            }
          }
        ];

      case 'POISSON':
        return [
          {
            explanation: "The Poisson distribution models the number of events occurring in a fixed interval of time or space, assuming events occur at a constant average rate and independently of each other. Use the slider to adjust λ (lambda).",
            execute: null
          },
          {
            explanation: `It is parameterized by λ (lambda), which represents the average number of events in the given interval. The current value is λ = ${distributionParams.lambda}.`,
            execute: null
          },
          {
            explanation: "Let's visualize how changing λ affects the shape of the distribution. Try adjusting the λ slider to see this in real-time.",
            execute: null
          },
          {
            explanation: `For small values of λ (< 10), the distribution is skewed to the right. As λ increases (> 10), the distribution becomes more symmetric and approaches a normal distribution. Your current λ = ${distributionParams.lambda} shows ${distributionParams.lambda < 10 ? 'right skewness' : 'a more symmetric shape'}.`,
            execute: null
          },
          {
            explanation: "Let's generate random samples from this Poisson distribution to see how the sample distribution compares to the theoretical PMF. The blue line shows the theoretical distribution, while the red bars show the histogram of sampled values.",
            execute: async () => {
              const sample = await generateSample(100);
              setSampleData(sample);
            }
          },
          {
            explanation: `The Poisson distribution has an interesting property: its mean and variance are both equal to λ (${distributionParams.lambda}). This is a distinguishing characteristic of the Poisson distribution.`,
            execute: null
          },
          {
            explanation: "The Poisson distribution can be used to approximate the Binomial distribution when n is large and p is small, such that np remains constant (λ = np). Let's generate more samples to see the distribution more clearly.",
            execute: async () => {
              const newSample = await generateSample(500);
              setSampleData(newSample);
            }
          }
        ];

      case 'EXPONENTIAL':
        return [
          {
            explanation: "The Exponential distribution models the time between events in a Poisson process. It represents the time until the first 'success' in a continuous process where events occur at a constant rate.",
            execute: null
          },
          {
            explanation: `It is parameterized by λ (lambda), the rate parameter. The current value is λ = ${distributionParams.rate}. This means the average waiting time is 1/λ = ${(1/distributionParams.rate).toFixed(2)} units.`,
            execute: null
          },
          {
            explanation: "Let's visualize how changing λ affects the shape of the distribution. Try adjusting the λ slider to see how it affects the exponential curve.",
            execute: null
          },
          {
            explanation: "Unlike the normal distribution, the exponential distribution is not symmetric. It is always skewed to the right, with most values close to zero and a long tail extending to the right.",
            execute: null
          },
          {
            explanation: "Let's generate random samples from this Exponential distribution. The blue line shows the theoretical PDF, while the red bars show the histogram of sampled values.",
            execute: async () => {
              const sample = await generateSample(100);
              setSampleData(sample);
            }
          },
          {
            explanation: "The Exponential distribution has the 'memoryless property': the probability of waiting an additional time t is independent of how long you've already waited. This is unique to the exponential distribution.",
            execute: null
          },
          {
            explanation: "Let's generate more samples to better visualize the distribution. Notice how the empirical distribution approaches the theoretical curve as the sample size increases.",
            execute: async () => {
              const newSample = await generateSample(500);
              setSampleData(newSample);
            }
          }
        ];

      // Add cases for other distributions

      default:
        return [
          {
            explanation: "Select a specific distribution type to view its animated explanation. You'll be able to adjust parameters and see interactive demonstrations.",
            execute: null
          }
        ];
    }
  };
  
  // D3.js chart rendering function
  const renderD3Chart = () => {
    if (!theoreticalData || !chartRef.current) return;
    
    const isDiscrete = ['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(type);
    
    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 50, bottom: 60, left: 60 };
    const width = chartRef.current.clientWidth;
    const height = chartRef.current.clientHeight;
    
    // Create SVG element
    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Create a gradient for fills
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', height - margin.bottom)
      .attr('x2', 0).attr('y2', margin.top);
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#4682b4')
      .attr('stop-opacity', 0.2);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#4682b4')
      .attr('stop-opacity', 0.8);
    
    // Create scales
    const xMin = Math.min(...theoreticalData.xValues);
    const xMax = Math.max(...theoreticalData.xValues);
    
    const xScale = isDiscrete 
      ? d3.scaleBand()
          .domain(theoreticalData.xValues)
          .range([margin.left, width - margin.right])
          .padding(0.1)
      : d3.scaleLinear()
          .domain([xMin, xMax])
          .range([margin.left, width - margin.right]);
    
    const yMax = Math.max(
      ...theoreticalData.pmfPdfValues,
      ...(sampleData.length > 0 ? createHistogramData().map(d => d.y) : [0])
    ) * 1.1; // Add 10% padding
    
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .tickSize(-height + margin.top + margin.bottom)
      .tickPadding(10);
    
    if (!isDiscrete && theoreticalData.xValues.length > 10) {
      // For continuous distributions with many points, use fewer ticks
      xAxis.ticks(10);
    }
    
    const yAxis = d3.axisLeft(yScale)
      .tickSize(-width + margin.left + margin.right)
      .tickPadding(10);
    
    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .attr('class', 'x-axis')
      .call(xAxis)
      .style('font-size', '12px');
    
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .attr('class', 'y-axis')
      .call(yAxis)
      .style('font-size', '12px');
    
    // Add axes labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 15)
      .attr('text-anchor', 'middle')
      .text('Value')
      .attr('fill', 'currentColor')
      .style('font-size', '14px');
    
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(height / 2))
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .text(isDiscrete ? 'Probability Mass Function' : 'Probability Density Function')
      .attr('fill', 'currentColor')
      .style('font-size', '14px');
    
    // Draw theoretical PMF/PDF
    if (isDiscrete) {
      // For discrete distributions, draw bars
      svg.selectAll('.theoretical-bar')
        .data(theoreticalData.xValues)
        .enter()
        .append('rect')
        .attr('class', 'theoretical-bar')
        .attr('x', d => xScale(d))
        .attr('y', (d, i) => yScale(theoreticalData.pmfPdfValues[i]))
        .attr('width', xScale.bandwidth())
        .attr('height', (d, i) => height - margin.bottom - yScale(theoreticalData.pmfPdfValues[i]))
        .attr('fill', 'rgba(54, 162, 235, 0.7)')
        .attr('stroke', 'rgba(54, 162, 235, 1)')
        .attr('stroke-width', 1);
    } else {
      // For continuous distributions, draw a line and area
      const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveBasis);
      
      const area = d3.area()
        .x(d => xScale(d.x))
        .y0(height - margin.bottom)
        .y1(d => yScale(d.y))
        .curve(d3.curveBasis);
      
      const lineData = theoreticalData.xValues.map((x, i) => ({
        x,
        y: theoreticalData.pmfPdfValues[i]
      }));
      
      svg.append('path')
        .datum(lineData)
        .attr('class', 'area')
        .attr('d', area)
        .attr('fill', 'url(#area-gradient)');
      
      svg.append('path')
        .datum(lineData)
        .attr('class', 'line')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(54, 162, 235, 1)')
        .attr('stroke-width', 2.5);
    }
    
    // Draw sample histogram if available
    if (sampleData.length > 0) {
      const histogramData = createHistogramData();
      
      if (isDiscrete) {
        // For discrete distributions, draw overlay bars
        svg.selectAll('.sample-bar')
          .data(histogramData)
          .enter()
          .append('rect')
          .attr('class', 'sample-bar')
          .attr('x', d => xScale(d.x))
          .attr('y', d => yScale(d.y))
          .attr('width', xScale.bandwidth())
          .attr('height', d => height - margin.bottom - yScale(d.y))
          .attr('fill', 'rgba(255, 99, 132, 0.6)')
          .attr('stroke', 'rgba(255, 99, 132, 1)')
          .attr('stroke-width', 1);
      } else {
        // For continuous distributions, draw histogram bars
        const binWidth = (xMax - xMin) / 30;
        
        svg.selectAll('.sample-bar')
          .data(histogramData)
          .enter()
          .append('rect')
          .attr('class', 'sample-bar')
          .attr('x', d => xScale(d.x - binWidth/2))
          .attr('y', d => yScale(d.y))
          .attr('width', (xScale(xMin + binWidth) - xScale(xMin)))
          .attr('height', d => height - margin.bottom - yScale(d.y))
          .attr('fill', 'rgba(255, 99, 132, 0.6)')
          .attr('stroke', 'rgba(255, 99, 132, 1)')
          .attr('stroke-width', 1);
      }
      
      // Add legend
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.right - 150}, ${margin.top + 10})`);
      
      // Theoretical distribution
      legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', 'rgba(54, 162, 235, 0.7)');
      
      legend.append('text')
        .attr('x', 25)
        .attr('y', 12.5)
        .text(isDiscrete ? 'Theoretical PMF' : 'Theoretical PDF')
        .attr('fill', 'currentColor')
        .style('font-size', '12px');
      
      // Sample distribution
      legend.append('rect')
        .attr('x', 0)
        .attr('y', 25)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', 'rgba(255, 99, 132, 0.6)');
      
      legend.append('text')
        .attr('x', 25)
        .attr('y', 37.5)
        .text('Sample Distribution')
        .attr('fill', 'currentColor')
        .style('font-size', '12px');
    }
  };
  
  // Helper function to create histogram data from samples
  const createHistogramData = () => {
    if (!theoreticalData || sampleData.length === 0) return [];
    
    const isDiscrete = ['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(type);
    const minValue = Math.min(...theoreticalData.xValues);
    const maxValue = Math.max(...theoreticalData.xValues);
    const binCount = isDiscrete ? (maxValue - minValue + 1) : 30;
    const binWidth = (maxValue - minValue) / binCount;
    
    // Initialize histogram bins
    const bins = Array(binCount).fill(0);
    
    // Count values in each bin
    sampleData.forEach(value => {
      if (value >= minValue && value <= maxValue) {
        const binIndex = isDiscrete 
          ? Math.floor(value - minValue)
          : Math.min(Math.floor((value - minValue) / binWidth), binCount - 1);
        bins[binIndex]++;
      }
    });
    
    // Normalize histogram to represent density
    const normalizationFactor = isDiscrete ? 1 : (sampleData.length * binWidth);
    
    // Create x-values for histogram bins
    const histogramXValues = isDiscrete
      ? Array.from({ length: binCount }, (_, i) => minValue + i)
      : Array.from({ length: binCount }, (_, i) => minValue + (i + 0.5) * binWidth);
    
    return bins.map((count, i) => ({
      x: histogramXValues[i],
      y: count / normalizationFactor
    }));
  };
  
  // Get formula for the current distribution
  const getFormula = () => {
    switch (type) {
      case 'NORMAL':
        return "$$f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$$";
      
      case 'BINOMIAL':
        return "$$P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}$$";
      
      case 'POISSON':
        return "$$P(X = k) = \\frac{e^{-\\lambda} \\lambda^k}{k!}$$";
      
      case 'EXPONENTIAL':
        return "$$f(x) = \\lambda e^{-\\lambda x}, \\quad x \\geq 0$$";
      
      default:
        return "";
    }
  };
  
  // Get description of parameters
  const getParameterDescription = () => {
    switch (type) {
      case 'NORMAL':
        return (
          <>
            <Typography variant="body2">
              <strong>μ (mean)</strong>: {distributionParams.mean} - The center of the distribution
            </Typography>
            <Typography variant="body2">
              <strong>σ (standard deviation)</strong>: {distributionParams.std} - The spread of the distribution
            </Typography>
          </>
        );
      
      case 'BINOMIAL':
        return (
          <>
            <Typography variant="body2">
              <strong>n (trials)</strong>: {distributionParams.n} - The number of independent trials
            </Typography>
            <Typography variant="body2">
              <strong>p (probability)</strong>: {distributionParams.p} - The probability of success on each trial
            </Typography>
          </>
        );
      
      case 'POISSON':
        return (
          <Typography variant="body2">
            <strong>λ (lambda)</strong>: {distributionParams.lambda} - The average number of events per interval
          </Typography>
        );
      
      case 'EXPONENTIAL':
        return (
          <Typography variant="body2">
            <strong>λ (rate)</strong>: {distributionParams.rate} - The rate parameter (mean = 1/λ)
          </Typography>
        );
      
      default:
        return null;
    }
  };
  
  // Initial rendering and window resize handler
  useEffect(() => {
    if (theoreticalData) {
      renderD3Chart();
      
      // Add window resize handler
      const handleResize = () => {
        renderD3Chart();
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [theoreticalData, sampleData]);
  
  // Handle parameter changes
  const handleParameterChange = (param, value) => {
    setDistributionParams(prev => ({ ...prev, [param]: value }));
  };

  // Render parameter controls based on distribution type
  const renderParameterControls = () => {
    switch (type) {
      case 'NORMAL':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Adjust Parameters:
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Mean (μ): {distributionParams.mean}
              </Typography>
              <Slider
                value={distributionParams.mean}
                onChange={(_, value) => handleParameterChange('mean', value)}
                min={-5}
                max={5}
                step={0.1}
                marks={[
                  { value: -5, label: '-5' },
                  { value: 0, label: '0' },
                  { value: 5, label: '5' }
                ]}
                valueLabelDisplay="auto"
                disabled={loading || animationState === ANIMATION_STATE.PLAYING}
              />
            </Box>
            <Box>
              <Typography variant="body2" gutterBottom>
                Standard Deviation (σ): {distributionParams.std}
              </Typography>
              <Slider
                value={distributionParams.std}
                onChange={(_, value) => handleParameterChange('std', value)}
                min={0.1}
                max={3}
                step={0.1}
                marks={[
                  { value: 0.1, label: '0.1' },
                  { value: 1.5, label: '1.5' },
                  { value: 3, label: '3' }
                ]}
                valueLabelDisplay="auto"
                disabled={loading || animationState === ANIMATION_STATE.PLAYING}
              />
            </Box>
          </Box>
        );

      case 'BINOMIAL':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Adjust Parameters:
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Number of Trials (n): {distributionParams.n}
              </Typography>
              <Slider
                value={distributionParams.n}
                onChange={(_, value) => handleParameterChange('n', value)}
                min={1}
                max={50}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' }
                ]}
                valueLabelDisplay="auto"
                disabled={loading || animationState === ANIMATION_STATE.PLAYING}
              />
            </Box>
            <Box>
              <Typography variant="body2" gutterBottom>
                Success Probability (p): {distributionParams.p}
              </Typography>
              <Slider
                value={distributionParams.p}
                onChange={(_, value) => handleParameterChange('p', value)}
                min={0.01}
                max={0.99}
                step={0.01}
                marks={[
                  { value: 0.01, label: '0.01' },
                  { value: 0.5, label: '0.5' },
                  { value: 0.99, label: '0.99' }
                ]}
                valueLabelDisplay="auto"
                disabled={loading || animationState === ANIMATION_STATE.PLAYING}
              />
            </Box>
          </Box>
        );

      case 'POISSON':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Adjust Parameters:
            </Typography>
            <Box>
              <Typography variant="body2" gutterBottom>
                Rate (λ): {distributionParams.lambda}
              </Typography>
              <Slider
                value={distributionParams.lambda}
                onChange={(_, value) => handleParameterChange('lambda', value)}
                min={0.1}
                max={20}
                step={0.1}
                marks={[
                  { value: 0.1, label: '0.1' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' }
                ]}
                valueLabelDisplay="auto"
                disabled={loading || animationState === ANIMATION_STATE.PLAYING}
              />
            </Box>
          </Box>
        );

      case 'EXPONENTIAL':
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Adjust Parameters:
            </Typography>
            <Box>
              <Typography variant="body2" gutterBottom>
                Rate (λ): {distributionParams.rate}
              </Typography>
              <Slider
                value={distributionParams.rate}
                onChange={(_, value) => handleParameterChange('rate', value)}
                min={0.1}
                max={5}
                step={0.1}
                marks={[
                  { value: 0.1, label: '0.1' },
                  { value: 2.5, label: '2.5' },
                  { value: 5, label: '5' }
                ]}
                valueLabelDisplay="auto"
                disabled={loading || animationState === ANIMATION_STATE.PLAYING}
              />
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400, position: 'relative' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : theoreticalData ? (
              <div ref={chartRef} style={{ width: '100%', height: '100%' }}></div>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body2" color="text.secondary">
                  No data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%', overflow: 'auto' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {type.replace('_', ' ')} Distribution
              </Typography>

              <Box sx={{ my: 2 }}>
                <BlockMath>{getFormula().replace(/\$\$/g, '')}</BlockMath>
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Current Parameters:
              </Typography>
              {getParameterDescription()}

              {renderParameterControls()}

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Animation Step: {animationStep + 1} of {getAnimationSteps().length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Animation Controls
              </Typography>
              <ButtonGroup variant="outlined" sx={{ mr: 2 }}>
                {animationState === ANIMATION_STATE.PLAYING ? (
                  <Button onClick={pauseAnimation} startIcon={<PauseIcon />}>
                    Pause
                  </Button>
                ) : (
                  <Button
                    onClick={playAnimation}
                    startIcon={<PlayArrowIcon />}
                    disabled={loading}
                  >
                    {animationState === ANIMATION_STATE.COMPLETED ? 'Replay' : 'Play'}
                  </Button>
                )}
                <Button
                  onClick={resetAnimation}
                  startIcon={<RestartAltIcon />}
                  disabled={loading || animationState === ANIMATION_STATE.IDLE}
                >
                  Reset
                </Button>
              </ButtonGroup>

              <Box sx={{ display: 'inline-block', width: 200, ml: 2 }}>
                <Typography variant="caption" gutterBottom>
                  Speed: {animationSpeed}x
                </Typography>
                <Slider
                  value={animationSpeed}
                  onChange={handleSpeedChange}
                  min={0.5}
                  max={3}
                  step={0.5}
                  marks
                  disabled={loading}
                />
              </Box>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body1">
                {currentExplanation}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DistributionAnimation;