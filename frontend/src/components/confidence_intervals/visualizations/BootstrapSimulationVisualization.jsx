import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  Slider,
  useTheme
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  SkipNext as SkipNextIcon
} from '@mui/icons-material';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

/**
 * Bootstrap Simulation Visualization Component
 * 
 * This component visualizes the bootstrap resampling process and resulting
 * confidence intervals.
 */
const BootstrapSimulationVisualization = ({
  originalData = [],
  bootstrapSamples = [],
  bootstrapStatistics = [],
  confidenceInterval = { lower: null, upper: null },
  originalStatistic = null,
  statisticName = "Mean",
  isLoading = false,
  height = 400,
  width = 800
}) => {
  const theme = useTheme();
  const svgRef = useRef(null);
  const histogramRef = useRef(null);
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSample, setCurrentSample] = useState(0);
  const [samplingSpeed, setSamplingSpeed] = useState(200); // ms per sample
  const [hasStarted, setHasStarted] = useState(false);
  
  // Dimensions
  const margins = { top: 20, right: 30, bottom: 40, left: 50 };
  const effectiveWidth = width - margins.left - margins.right;
  const effectiveHeight = height - margins.top - margins.bottom;
  
  // Drawing constants
  const pointRadius = 4;
  const highlightedPointRadius = 6;
  const samplePointRadius = 3;
  const histogramHeight = effectiveHeight * 0.4;
  const samplingHeight = effectiveHeight * 0.6;
  
  // Setup scales and axes
  useEffect(() => {
    if (!svgRef.current || originalData.length === 0) return;
    
    // Clear any existing SVG
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margins.left}, ${margins.top})`);
    
    // Data extent
    const dataExtent = d3.extent(originalData);
    const domainPadding = (dataExtent[1] - dataExtent[0]) * 0.1;
    
    // X scale for original data and samples
    const xScaleSampling = d3.scaleLinear()
      .domain([dataExtent[0] - domainPadding, dataExtent[1] + domainPadding])
      .range([0, effectiveWidth]);
    
    // Y scale for original data (just for separation)
    const yScaleSampling = d3.scalePoint()
      .domain(["original", "current"])
      .range([0, samplingHeight]);
    
    // Sampling area background
    svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", effectiveWidth)
      .attr("height", samplingHeight)
      .attr("fill", theme.palette.background.default)
      .attr("rx", 4);
    
    // X axis for sampling area
    svg.append("g")
      .attr("transform", `translate(0, ${samplingHeight})`)
      .call(d3.axisBottom(xScaleSampling));
    
    // Original data points
    svg.append("g")
      .selectAll("circle")
      .data(originalData)
      .enter()
      .append("circle")
      .attr("cx", d => xScaleSampling(d))
      .attr("cy", yScaleSampling("original"))
      .attr("r", pointRadius)
      .attr("fill", theme.palette.primary.main)
      .attr("stroke", "none")
      .attr("opacity", 0.8);
    
    // Original data line (to show distribution)
    const lineGenerator = d3.line()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveBasis);
    
    const kde = kernelDensityEstimator(kernelEpanechnikov(1.5), xScaleSampling.ticks(50));
    const density = kde(originalData);
    
    svg.append("path")
      .datum(density)
      .attr("fill", "none")
      .attr("stroke", theme.palette.primary.main)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3 3")
      .attr("d", lineGenerator)
      .attr("transform", `translate(0, ${yScaleSampling("original") - 15})`);
    
    // Label for original data
    svg.append("text")
      .attr("x", -40)
      .attr("y", yScaleSampling("original"))
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .style("font-size", "12px")
      .text("Original");
    
    // Label for current sample
    svg.append("text")
      .attr("x", -40)
      .attr("y", yScaleSampling("current"))
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .style("font-size", "12px")
      .text("Sample");
    
    // Mark original statistic
    if (originalStatistic !== null) {
      svg.append("line")
        .attr("x1", xScaleSampling(originalStatistic))
        .attr("x2", xScaleSampling(originalStatistic))
        .attr("y1", yScaleSampling("original") - 15)
        .attr("y2", yScaleSampling("original") + 15)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,3");
      
      svg.append("text")
        .attr("x", xScaleSampling(originalStatistic))
        .attr("y", yScaleSampling("original") - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", theme.palette.error.main)
        .text(`${statisticName}: ${originalStatistic.toFixed(2)}`);
    }
    
    // Setup histogram area
    const histogramContainer = svg.append("g")
      .attr("transform", `translate(0, ${samplingHeight + 20})`)
      .attr("class", "histogram-container");
    
    histogramRef.current = histogramContainer;
    
    // Histogram title
    histogramContainer.append("text")
      .attr("x", effectiveWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text("Bootstrap Distribution");
    
    // Histogram x-axis (initial, will be updated with data)
    histogramContainer.append("g")
      .attr("class", "histogram-x-axis")
      .attr("transform", `translate(0, ${histogramHeight})`);
    
    // Histogram y-axis
    histogramContainer.append("g")
      .attr("class", "histogram-y-axis");
  }, [svgRef, originalData, originalStatistic, width, height, theme, statisticName, effectiveWidth, effectiveHeight, samplingHeight, histogramHeight, margins.left, margins.top]);
  
  // Update histogram with bootstrap statistics
  useEffect(() => {
    if (!histogramRef.current || bootstrapStatistics.length === 0) return;
    
    const histogramContainer = histogramRef.current;
    
    // Data extent for the statistic
    const statExtent = d3.extent(bootstrapStatistics);
    const domainPadding = (statExtent[1] - statExtent[0]) * 0.1;
    
    // X scale for histogram
    const xScaleHistogram = d3.scaleLinear()
      .domain([
        Math.min(statExtent[0] - domainPadding, confidenceInterval.lower || statExtent[0]), 
        Math.max(statExtent[1] + domainPadding, confidenceInterval.upper || statExtent[1])
      ])
      .range([0, effectiveWidth]);
    
    // Update histogram x-axis
    histogramContainer.select(".histogram-x-axis")
      .call(d3.axisBottom(xScaleHistogram));
    
    // Generate histogram data
    const histogram = d3.histogram()
      .domain(xScaleHistogram.domain())
      .thresholds(xScaleHistogram.ticks(20))
      .value(d => d);
    
    const bins = histogram(bootstrapStatistics);
    
    // Y scale for histogram
    const yScaleHistogram = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([histogramHeight, 0]);
    
    // Update histogram y-axis
    histogramContainer.select(".histogram-y-axis")
      .call(d3.axisLeft(yScaleHistogram).ticks(5));
    
    // Remove old bars
    histogramContainer.selectAll(".histogram-bar").remove();
    
    // Add new bars
    histogramContainer.selectAll(".histogram-bar")
      .data(bins)
      .enter()
      .append("rect")
      .attr("class", "histogram-bar")
      .attr("x", d => xScaleHistogram(d.x0))
      .attr("y", d => yScaleHistogram(d.length))
      .attr("width", d => Math.max(0, xScaleHistogram(d.x1) - xScaleHistogram(d.x0) - 1))
      .attr("height", d => histogramHeight - yScaleHistogram(d.length))
      .attr("fill", theme.palette.secondary.main)
      .attr("opacity", 0.7);
    
    // Add confidence interval markers
    if (confidenceInterval.lower !== null && confidenceInterval.upper !== null) {
      // Lower bound
      histogramContainer.selectAll(".ci-lower").remove();
      histogramContainer.append("line")
        .attr("class", "ci-lower")
        .attr("x1", xScaleHistogram(confidenceInterval.lower))
        .attr("x2", xScaleHistogram(confidenceInterval.lower))
        .attr("y1", 0)
        .attr("y2", histogramHeight)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,3");
      
      // Upper bound
      histogramContainer.selectAll(".ci-upper").remove();
      histogramContainer.append("line")
        .attr("class", "ci-upper")
        .attr("x1", xScaleHistogram(confidenceInterval.upper))
        .attr("x2", xScaleHistogram(confidenceInterval.upper))
        .attr("y1", 0)
        .attr("y2", histogramHeight)
        .attr("stroke", theme.palette.error.main)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,3");
      
      // Confidence interval region
      histogramContainer.selectAll(".ci-region").remove();
      histogramContainer.append("rect")
        .attr("class", "ci-region")
        .attr("x", xScaleHistogram(confidenceInterval.lower))
        .attr("y", 0)
        .attr("width", xScaleHistogram(confidenceInterval.upper) - xScaleHistogram(confidenceInterval.lower))
        .attr("height", histogramHeight)
        .attr("fill", theme.palette.error.main)
        .attr("opacity", 0.1);
      
      // Label for CI
      histogramContainer.selectAll(".ci-label").remove();
      histogramContainer.append("text")
        .attr("class", "ci-label")
        .attr("x", (xScaleHistogram(confidenceInterval.lower) + xScaleHistogram(confidenceInterval.upper)) / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", theme.palette.error.main)
        .text(`CI: [${confidenceInterval.lower.toFixed(2)}, ${confidenceInterval.upper.toFixed(2)}]`);
    }
    
    // Add original statistic marker on histogram
    if (originalStatistic !== null) {
      histogramContainer.selectAll(".original-stat").remove();
      histogramContainer.append("line")
        .attr("class", "original-stat")
        .attr("x1", xScaleHistogram(originalStatistic))
        .attr("x2", xScaleHistogram(originalStatistic))
        .attr("y1", 0)
        .attr("y2", histogramHeight)
        .attr("stroke", theme.palette.info.main)
        .attr("stroke-width", 2);
      
      histogramContainer.append("text")
        .attr("class", "original-stat-label")
        .attr("x", xScaleHistogram(originalStatistic))
        .attr("y", histogramHeight + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", theme.palette.info.main)
        .text(`Original ${statisticName}`);
    }
  }, [bootstrapStatistics, confidenceInterval, originalStatistic, theme, statisticName, effectiveWidth, histogramHeight]);
  
  // Update current bootstrap sample visualization
  useEffect(() => {
    if (!svgRef.current || !bootstrapSamples.length || currentSample >= bootstrapSamples.length) return;
    
    const svg = d3.select(svgRef.current).select("g");
    
    // Remove previous sample
    svg.selectAll(".current-sample").remove();
    svg.selectAll(".current-statistic").remove();
    
    // Data extent
    const dataExtent = d3.extent(originalData);
    const domainPadding = (dataExtent[1] - dataExtent[0]) * 0.1;
    
    // X scale for original data and samples
    const xScaleSampling = d3.scaleLinear()
      .domain([dataExtent[0] - domainPadding, dataExtent[1] + domainPadding])
      .range([0, effectiveWidth]);
    
    // Y scale for original data (just for separation)
    const yScaleSampling = d3.scalePoint()
      .domain(["original", "current"])
      .range([0, samplingHeight]);
    
    // Get current sample and statistic
    const currentData = bootstrapSamples[currentSample];
    const currentStatValue = bootstrapStatistics[currentSample];
    
    // Add current sample points
    svg.selectAll(".current-sample")
      .data(currentData)
      .enter()
      .append("circle")
      .attr("class", "current-sample")
      .attr("cx", d => xScaleSampling(d))
      .attr("cy", yScaleSampling("current"))
      .attr("r", samplePointRadius)
      .attr("fill", theme.palette.secondary.main)
      .attr("opacity", 0.7);
    
    // Mark current statistic
    if (currentStatValue !== undefined) {
      svg.append("line")
        .attr("class", "current-statistic")
        .attr("x1", xScaleSampling(currentStatValue))
        .attr("x2", xScaleSampling(currentStatValue))
        .attr("y1", yScaleSampling("current") - 15)
        .attr("y2", yScaleSampling("current") + 15)
        .attr("stroke", theme.palette.secondary.dark)
        .attr("stroke-width", 2);
      
      svg.append("text")
        .attr("class", "current-statistic")
        .attr("x", xScaleSampling(currentStatValue))
        .attr("y", yScaleSampling("current") - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", theme.palette.secondary.dark)
        .text(`${statisticName}: ${currentStatValue.toFixed(2)}`);
    }
  }, [currentSample, bootstrapSamples, bootstrapStatistics, originalData, theme, statisticName, effectiveWidth, samplingHeight, samplePointRadius]);
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying || bootstrapSamples.length === 0) return;
    
    const animationInterval = setInterval(() => {
      setCurrentSample(prev => {
        // Reset to beginning when we reach the end
        if (prev >= bootstrapSamples.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, samplingSpeed);
    
    return () => clearInterval(animationInterval);
  }, [isPlaying, bootstrapSamples.length, samplingSpeed]);
  
  // Toggle animation
  const toggleAnimation = () => {
    if (!hasStarted) setHasStarted(true);
    setIsPlaying(!isPlaying);
  };
  
  // Reset animation
  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentSample(0);
    setHasStarted(true);
  };
  
  // Step to next sample
  const stepNext = () => {
    if (!hasStarted) setHasStarted(true);
    setIsPlaying(false);
    setCurrentSample(prev => Math.min(prev + 1, bootstrapSamples.length - 1));
  };
  
  // Handle speed change
  const handleSpeedChange = (event, newValue) => {
    setSamplingSpeed(newValue);
  };
  
  // Kernel density estimation functions
  function kernelDensityEstimator(kernel, X) {
    return function(V) {
      return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
  }
  
  function kernelEpanechnikov(k) {
    return function(v) {
      return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
  }
  
  // Check if we have data to display
  const hasData = originalData.length > 0;
  const hasResults = bootstrapStatistics.length > 0;
  
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        height: 'auto', 
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        position: 'relative'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          Bootstrap Sampling Visualization
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ mr: 2 }}>
            {hasResults 
              ? `Sample ${currentSample + 1} of ${bootstrapSamples.length}`
              : 'No samples yet'
            }
          </Typography>
          
          <Tooltip title="Reset">
            <IconButton size="small" onClick={resetAnimation} disabled={!hasResults}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isPlaying ? "Pause" : "Play"}>
            <IconButton size="small" onClick={toggleAnimation} disabled={!hasResults}>
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Next Sample">
            <IconButton size="small" onClick={stepNext} disabled={!hasResults || currentSample >= bootstrapSamples.length - 1}>
              <SkipNextIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Speed slider */}
      {hasResults && (
        <Grid container alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Typography variant="caption">Speed:</Typography>
          </Grid>
          <Grid item xs={9}>
            <Slider
              value={samplingSpeed}
              onChange={handleSpeedChange}
              min={50}
              max={500}
              step={50}
              marks={[
                { value: 50, label: 'Fast' },
                { value: 250, label: 'Medium' },
                { value: 500, label: 'Slow' }
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={value => `${value} ms`}
              size="small"
            />
          </Grid>
        </Grid>
      )}
      
      {/* Visualization area */}
      <Box 
        sx={{ 
          width: '100%', 
          height: height, 
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 10,
              borderRadius: 1
            }}
          >
            <CircularProgress />
          </Box>
        )}
        
        {!hasData && !isLoading ? (
          <Typography variant="body2" color="text.secondary">
            No data available for visualization. Please run a bootstrap simulation first.
          </Typography>
        ) : (
          <svg ref={svgRef} width={width} height={height} />
        )}
      </Box>
      
      {hasResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              This visualization shows the bootstrap process. Original data points are shown at the top, with the current
              bootstrap sample in the middle. The histogram shows the distribution of the bootstrap {statisticName.toLowerCase()} values,
              with the confidence interval marked in red.
            </Typography>
          </Box>
        </motion.div>
      )}
    </Paper>
  );
};

export default BootstrapSimulationVisualization;