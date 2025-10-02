import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Slider, 
  Button, 
  Grid, 
  Paper, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Tooltip, 
  IconButton,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  useTheme
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { motion, AnimatePresence } from 'framer-motion';

import * as d3 from 'd3';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

const CLTSimulator = () => {
  // State for simulation parameters
  const [originalDistribution, setOriginalDistribution] = useState('uniform');
  const [sampleSize, setSampleSize] = useState(10);
  const [numberOfSamples, setNumberOfSamples] = useState(1000);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // State for generated data
  const [originalData, setOriginalData] = useState([]);
  const [sampleMeans, setSampleMeans] = useState([]);
  
  // Refs for charts
  const originalChartRef = useRef(null);
  const sampleMeansChartRef = useRef(null);
  
  // Effect to run simulation when parameters change
  useEffect(() => {
    if (simulationCompleted) {
      setSimulationCompleted(false);
      setSampleMeans([]);
    }
  }, [originalDistribution, sampleSize, numberOfSamples]);
  
  // Function to run simulation
  const runSimulation = () => {
    setSimulationRunning(true);
    setSimulationCompleted(false);
    setProgress(0);
    
    // Generate original population data
    const populationSize = 10000;
    const newOriginalData = generateDistribution(originalDistribution, populationSize);
    setOriginalData(newOriginalData);
    
    // Start with empty sample means array
    setSampleMeans([]);
    
    // Use a web worker or setTimeout to avoid blocking the UI
    const batchSize = 50; // Process in batches to update progress
    const totalBatches = Math.ceil(numberOfSamples / batchSize);
    let currentBatch = 0;
    let allSampleMeans = [];
    
    const processBatch = () => {
      for (let i = 0; i < batchSize && (currentBatch * batchSize + i) < numberOfSamples; i++) {
        // Take a random sample from the original data
        const sample = [];
        for (let j = 0; j < sampleSize; j++) {
          const randomIndex = Math.floor(Math.random() * populationSize);
          sample.push(newOriginalData[randomIndex]);
        }
        
        // Calculate the mean of the sample
        const mean = sample.reduce((sum, value) => sum + value, 0) / sampleSize;
        allSampleMeans.push(mean);
      }
      
      currentBatch++;
      const newProgress = (currentBatch / totalBatches) * 100;
      setProgress(newProgress);
      setSampleMeans([...allSampleMeans]);
      
      if (currentBatch < totalBatches) {
        setTimeout(processBatch, 0); // Continue processing in the next event loop
      } else {
        setSimulationRunning(false);
        setSimulationCompleted(true);
      }
    };
    
    // Start processing
    setTimeout(processBatch, 0);
  };
  
  // Reset simulation
  const resetSimulation = () => {
    setSimulationCompleted(false);
    setSampleMeans([]);
    setOriginalData([]);
    setProgress(0);
  };
  
  // Generate data from different distributions
  const generateDistribution = (type, size) => {
    const data = [];
    
    switch (type) {
      case 'uniform':
        // Uniform distribution between 0 and 1
        for (let i = 0; i < size; i++) {
          data.push(Math.random());
        }
        break;
      
      case 'exponential':
        // Exponential distribution with rate parameter 1
        for (let i = 0; i < size; i++) {
          data.push(-Math.log(Math.random()));
        }
        break;
      
      case 'normal':
        // Normal distribution using Box-Muller transform
        for (let i = 0; i < size; i += 2) {
          const u1 = Math.random();
          const u2 = Math.random();
          const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
          data.push(z1);
          if (i + 1 < size) data.push(z2);
        }
        break;
      
      case 'bimodal':
        // Bimodal distribution (mixture of two normals)
        for (let i = 0; i < size; i += 2) {
          const u1 = Math.random();
          const u2 = Math.random();
          const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          // Use another random number to decide which normal to sample from
          const shift = Math.random() < 0.5 ? -1.5 : 1.5;
          data.push(z1 + shift);
        }
        break;
      
      case 'bernoulli':
        // Bernoulli distribution (0 or 1 with p=0.3)
        for (let i = 0; i < size; i++) {
          data.push(Math.random() < 0.3 ? 1 : 0);
        }
        break;
      
      case 'skewed':
        // Skewed distribution using squared standard normals
        for (let i = 0; i < size; i += 2) {
          const u1 = Math.random();
          const u2 = Math.random();
          const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          data.push(z1 * z1 * Math.sign(z1));
        }
        break;
      
      default:
        // Default to uniform
        for (let i = 0; i < size; i++) {
          data.push(Math.random());
        }
    }
    
    return data;
  };
  
  // Create histogram data from an array of values
  const createHistogram = (data, binCount = 30) => {
    if (!data || data.length === 0) return { labels: [], data: [] };
    
    // Find min and max values
    let min = Math.min(...data);
    let max = Math.max(...data);
    
    // Add a small padding to avoid outliers at the boundaries
    const range = max - min;
    min -= range * 0.05;
    max += range * 0.05;
    
    // Create bins
    const binWidth = (max - min) / binCount;
    const bins = Array(binCount).fill(0);
    
    // Count values in each bin
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
      if (binIndex >= 0) bins[binIndex]++;
    });
    
    // Create bin labels (center of each bin)
    const labels = Array.from({ length: binCount }, (_, i) => min + (i + 0.5) * binWidth);
    
    // Normalize bins to create a probability density
    const normalizationFactor = data.length * binWidth;
    const normalizedBins = bins.map(count => count / normalizationFactor);
    
    return { labels, data: normalizedBins };
  };
  
  // Render the distribution chart with D3.js
  const renderPopulationChart = () => {
    if (!originalChartRef.current || originalData.length === 0) return;
    
    // Clear previous chart
    d3.select(originalChartRef.current).selectAll('*').remove();
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = originalChartRef.current.clientWidth;
    const height = originalChartRef.current.clientHeight || 250;
    
    // Create SVG element
    const svg = d3.select(originalChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Create a gradient for fills
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'population-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', height - margin.bottom)
      .attr('x2', 0).attr('y2', margin.top);
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'rgba(255, 99, 132, 0.2)')
      .attr('stop-opacity', 0.2);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'rgba(255, 99, 132, 0.8)')
      .attr('stop-opacity', 0.8);
    
    // Create histogram from data
    const { labels, data: histData } = createHistogram(originalData);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([Math.min(...labels), Math.max(...labels)])
      .range([margin.left, width - margin.right]);
    
    const yMax = Math.max(...histData) * 1.1; // Add 10% padding
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d3.format('.1f'));
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d3.format('.1f'));
    
    // Add x-axis
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .append('text')
      .attr('fill', 'currentColor')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text('Value');
    
    // Add y-axis
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis)
      .append('text')
      .attr('fill', 'currentColor')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -(height / 2))
      .attr('text-anchor', 'middle')
      .text('Density');
    
    // Create histogram bars
    svg.selectAll('.bar')
      .data(histData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d, i) => xScale(labels[i] - (labels[1] - labels[0]) / 2))
      .attr('y', d => yScale(d))
      .attr('width', (labels[1] - labels[0]) * width / (Math.max(...labels) - Math.min(...labels)))
      .attr('height', d => height - margin.bottom - yScale(d))
      .attr('fill', 'url(#population-gradient)');
    
    // Add chart title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Original Distribution');
  };
  
  // Render the sample means chart with D3.js
  const renderSampleMeansChart = () => {
    if (!sampleMeansChartRef.current || sampleMeans.length === 0) return;
    
    // Clear previous chart
    d3.select(sampleMeansChartRef.current).selectAll('*').remove();
    
    // Set up dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 50 };
    const width = sampleMeansChartRef.current.clientWidth;
    const height = sampleMeansChartRef.current.clientHeight || 250;
    
    // Create SVG element
    const svg = d3.select(sampleMeansChartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Create a gradient for fills
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'means-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', height - margin.bottom)
      .attr('x2', 0).attr('y2', margin.top);
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'rgba(54, 162, 235, 0.2)')
      .attr('stop-opacity', 0.2);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'rgba(54, 162, 235, 0.8)')
      .attr('stop-opacity', 0.8);
    
    // Create histogram from data
    const { labels, data: histData } = createHistogram(sampleMeans);
    
    // Calculate mean and standard deviation for theoretical normal curve
    const mean = sampleMeans.reduce((sum, value) => sum + value, 0) / sampleMeans.length;
    const variance = sampleMeans.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / sampleMeans.length;
    const stdDev = Math.sqrt(variance);
    
    // Create x-scale
    const xMin = Math.min(...labels);
    const xMax = Math.max(...labels);
    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([margin.left, width - margin.right]);
    
    // Generate theoretical normal curve points
    const theoreticalCurvePoints = [];
    for (let x = xMin; x <= xMax; x += (xMax - xMin) / 100) {
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
      theoreticalCurvePoints.push({ x, y });
    }
    
    // Find max y value including theoretical curve points
    const yMax = Math.max(
      Math.max(...histData),
      Math.max(...theoreticalCurvePoints.map(p => p.y))
    ) * 1.1; // Add 10% padding
    
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d3.format('.1f'));
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d3.format('.1f'));
    
    // Add x-axis
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .append('text')
      .attr('fill', 'currentColor')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text('Sample Mean');
    
    // Add y-axis
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis)
      .append('text')
      .attr('fill', 'currentColor')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -(height / 2))
      .attr('text-anchor', 'middle')
      .text('Density');
    
    // Create histogram bars
    svg.selectAll('.bar')
      .data(histData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d, i) => xScale(labels[i] - (labels[1] - labels[0]) / 2))
      .attr('y', d => yScale(d))
      .attr('width', (labels[1] - labels[0]) * width / (xMax - xMin))
      .attr('height', d => height - margin.bottom - yScale(d))
      .attr('fill', 'url(#means-gradient)');
    
    // Create line generator for the theoretical normal curve
    const line = d3.line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveBasis);
    
    // Draw theoretical normal curve
    svg.append('path')
      .datum(theoreticalCurvePoints)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(75, 192, 192, 1)')
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right - 120}, ${margin.top + 10})`);
    
    // Sample means histogram
    legend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', 'rgba(54, 162, 235, 0.7)');
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .attr('text-anchor', 'start')
      .text('Sample Means');
    
    // Theoretical normal curve
    legend.append('line')
      .attr('x1', 0)
      .attr('y1', 30)
      .attr('x2', 15)
      .attr('y2', 30)
      .attr('stroke', 'rgba(75, 192, 192, 1)')
      .attr('stroke-width', 2);
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 33)
      .attr('text-anchor', 'start')
      .text('Theoretical Normal');
    
    // Add chart title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Sampling Distribution of the Mean');
  };
  
  // Update charts when data changes
  useEffect(() => {
    if (originalData.length > 0) {
      renderPopulationChart();
    }
    if (sampleMeans.length > 0) {
      renderSampleMeansChart();
    }
  }, [originalData, sampleMeans]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (originalData.length > 0) {
        renderPopulationChart();
      }
      if (sampleMeans.length > 0) {
        renderSampleMeansChart();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [originalData, sampleMeans]);
  
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Central Limit Theorem Simulator
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This simulator demonstrates how the sampling distribution of the mean approaches a normal distribution
              as sample size increases, regardless of the shape of the original population distribution.
            </Typography>
          </Box>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Simulation Parameters
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Original Distribution</InputLabel>
              <Select
                value={originalDistribution}
                label="Original Distribution"
                onChange={(e) => setOriginalDistribution(e.target.value)}
                disabled={simulationRunning}
              >
                <MenuItem value="uniform">Uniform</MenuItem>
                <MenuItem value="exponential">Exponential</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="bimodal">Bimodal</MenuItem>
                <MenuItem value="bernoulli">Bernoulli</MenuItem>
                <MenuItem value="skewed">Right-Skewed</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom display="flex" alignItems="center">
                Sample Size (n): {sampleSize}
                <Tooltip title="The number of observations in each sample. As this increases, the CLT effect becomes stronger.">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Slider
                value={sampleSize}
                onChange={(e, newValue) => setSampleSize(newValue)}
                min={2}
                max={100}
                step={1}
                marks={[
                  { value: 2, label: '2' },
                  { value: 30, label: '30' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
                disabled={simulationRunning}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom display="flex" alignItems="center">
                Number of Samples: {numberOfSamples}
                <Tooltip title="The number of samples to generate. More samples provide a smoother approximation of the sampling distribution.">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Slider
                value={numberOfSamples}
                onChange={(e, newValue) => setNumberOfSamples(newValue)}
                min={100}
                max={5000}
                step={100}
                marks={[
                  { value: 100, label: '100' },
                  { value: 1000, label: '1,000' },
                  { value: 5000, label: '5,000' }
                ]}
                disabled={simulationRunning}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={runSimulation}
                disabled={simulationRunning}
              >
                {simulationCompleted ? 'Run Again' : 'Run Simulation'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={resetSimulation}
                disabled={simulationRunning || (!simulationCompleted && sampleMeans.length === 0)}
              >
                Reset
              </Button>
            </Box>
            
            {simulationRunning && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                <Typography variant="body2">
                  Simulation in progress: {Math.round(progress)}% complete
                </Typography>
              </Box>
            )}
          </Paper>
          
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Central Limit Theorem Explained
            </Typography>
            
            <Typography variant="body2" paragraph>
              The Central Limit Theorem (CLT) states that the sampling distribution of the mean approaches a normal
              distribution as the sample size increases, regardless of the shape of the population distribution.
            </Typography>
            
            <Box sx={{ my: 2, px: 2 }}>
              <BlockMath>{"\\frac{\\bar{X}_n - \\mu}{\\sigma/\\sqrt{n}} \\xrightarrow{d} N(0,1)"}</BlockMath>
            </Box>
            
            <Typography variant="body2" paragraph>
              Where:
            </Typography>
            <Box sx={{ ml: 2 }}>
              <Typography variant="body2">
                • <InlineMath>{"\\bar{X}_n"}</InlineMath> is the sample mean
              </Typography>
              <Typography variant="body2">
                • <InlineMath>{"\\mu"}</InlineMath> is the population mean
              </Typography>
              <Typography variant="body2">
                • <InlineMath>{"\\sigma"}</InlineMath> is the population standard deviation
              </Typography>
              <Typography variant="body2">
                • <InlineMath>{"n"}</InlineMath> is the sample size
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ mt: 2 }}>
              Conditions:
            </Typography>
            <Box sx={{ ml: 2 }}>
              <Typography variant="body2">
                • Samples must be independent
              </Typography>
              <Typography variant="body2">
                • Sample size should be sufficiently large (typically n ≥ 30)
              </Typography>
              <Typography variant="body2">
                • For very skewed distributions, larger sample sizes are needed
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 3, height: 300 }}>
            <Typography variant="subtitle2" gutterBottom>
              Original Distribution
            </Typography>
            {originalData.length > 0 ? (
              <Box sx={{ height: 250 }}>
                <div ref={originalChartRef} style={{ width: '100%', height: '100%' }} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                <Typography variant="body2" color="text.secondary">
                  Run the simulation to see the original distribution
                </Typography>
              </Box>
            )}
          </Paper>
          
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle2" gutterBottom>
              Sampling Distribution of the Mean
            </Typography>
            {sampleMeans.length > 0 ? (
              <Box sx={{ height: 250 }}>
                <div ref={sampleMeansChartRef} style={{ width: '100%', height: '100%' }} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                <Typography variant="body2" color="text.secondary">
                  Run the simulation to see the sampling distribution
                </Typography>
              </Box>
            )}
          </Paper>
          
          {simulationCompleted && (
            <Paper sx={{ p: 2, mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Simulation Results
              </Typography>
              <SimulationSummary 
                originalData={originalData} 
                sampleMeans={sampleMeans} 
                sampleSize={sampleSize}
              />
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

// Component to display summary statistics
const SimulationSummary = ({ originalData, sampleMeans, sampleSize }) => {
  // Calculate statistics for the original data
  const originalMean = originalData.reduce((sum, value) => sum + value, 0) / originalData.length;
  const originalVariance = originalData.reduce((sum, value) => sum + Math.pow(value - originalMean, 2), 0) / originalData.length;
  const originalStdDev = Math.sqrt(originalVariance);
  
  // Calculate statistics for the sample means
  const sampleMeansMean = sampleMeans.reduce((sum, value) => sum + value, 0) / sampleMeans.length;
  const sampleMeansVariance = sampleMeans.reduce((sum, value) => sum + Math.pow(value - sampleMeansMean, 2), 0) / sampleMeans.length;
  const sampleMeansStdDev = Math.sqrt(sampleMeansVariance);
  
  // Calculate theoretical standard error
  const theoreticalStdError = originalStdDev / Math.sqrt(sampleSize);
  
  // Calculate normality measures (simplified)
  const calculateSkewness = (data, mean, stdDev) => {
    return data.reduce((sum, value) => sum + Math.pow((value - mean) / stdDev, 3), 0) / data.length;
  };
  
  const calculateKurtosis = (data, mean, stdDev) => {
    return data.reduce((sum, value) => sum + Math.pow((value - mean) / stdDev, 4), 0) / data.length - 3;
  };
  
  const originalSkewness = calculateSkewness(originalData, originalMean, originalStdDev);
  const sampleMeansSkewness = calculateSkewness(sampleMeans, sampleMeansMean, sampleMeansStdDev);
  
  const originalKurtosis = calculateKurtosis(originalData, originalMean, originalStdDev);
  const sampleMeansKurtosis = calculateKurtosis(sampleMeans, sampleMeansMean, sampleMeansStdDev);
  
  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography variant="body2" fontWeight="bold">Original Distribution:</Typography>
        <Typography variant="body2">Mean: {originalMean.toFixed(4)}</Typography>
        <Typography variant="body2">Std Dev: {originalStdDev.toFixed(4)}</Typography>
        <Typography variant="body2">Skewness: {originalSkewness.toFixed(4)}</Typography>
        <Typography variant="body2">Kurtosis: {originalKurtosis.toFixed(4)}</Typography>
      </Grid>
      
      <Grid item xs={6}>
        <Typography variant="body2" fontWeight="bold">Sampling Distribution:</Typography>
        <Typography variant="body2">Mean: {sampleMeansMean.toFixed(4)}</Typography>
        <Typography variant="body2">Std Dev: {sampleMeansStdDev.toFixed(4)}</Typography>
        <Typography variant="body2">Theoretical Std Dev: {theoreticalStdError.toFixed(4)}</Typography>
        <Typography variant="body2">Skewness: {sampleMeansSkewness.toFixed(4)}</Typography>
        <Typography variant="body2">Kurtosis: {sampleMeansKurtosis.toFixed(4)}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2">
            {Math.abs(sampleMeansSkewness) < 0.5 && Math.abs(sampleMeansKurtosis) < 1
              ? "The sampling distribution closely approximates a normal distribution, demonstrating the Central Limit Theorem."
              : sampleSize < 30
                ? "The sampling distribution is approaching normality, but the sample size may need to be larger for the CLT to fully apply."
                : "The sampling distribution is approaching normality, but the original distribution's shape still has some influence."}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
};

export default CLTSimulator;