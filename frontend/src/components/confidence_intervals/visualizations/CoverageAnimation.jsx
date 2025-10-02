import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Chip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';

// D3 doesn't have quantileNormal directly - implement it using normal distribution
// quantileNormal approximates the inverse of the standard normal CDF
const quantileNormal = (p) => {
  // Initial approximation
  let a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
  let b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
  let c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209, 0.0276438810333863, 0.0038405729373609, 0.0003951896511919, 0.0000321767881768, 0.0000002888167364, 0.0000003960315187];
  
  // Handle edge cases
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  
  // Transform for symmetry
  let q = p - 0.5;
  
  // Rational approximation for central region
  if (Math.abs(q) <= 0.425) {
    let r = 0.180625 - q * q;
    let val = q * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) / 
             (((b[3] * r + b[2]) * r + b[1]) * r + b[0]);
    return val;
  }
  
  // Rational approximation for tails
  let r = p < 0.5 ? p : 1 - p;
  r = Math.sqrt(-Math.log(r));
  
  let val;
  if (r <= 5) {
    r = r - 1.6;
    val = (((((((c[8] * r + c[7]) * r + c[6]) * r + c[5]) * r + c[4]) * r + c[3]) * r + c[2]) * r + c[1]) * r + c[0];
  } else {
    r = r - 5;
    val = (((((((c[8] * r + c[7]) * r + c[6]) * r + c[5]) * r + c[4]) * r + c[3]) * r + c[2]) * r + c[1]) * r + c[0];
  }
  
  return p < 0.5 ? -val : val;
};

/**
 * Component for animating the concept of confidence interval coverage
 */
const CoverageAnimation = ({
  height = 400,
  width = '100%',
  trueValue = 5,
  initialConfidenceLevel = 0.95,
  maxIntervals = 100
}) => {
  const svgRef = useRef(null);
  const [confidenceLevel, setConfidenceLevel] = useState(initialConfidenceLevel);
  const [numIntervals, setNumIntervals] = useState(20);
  const [distribution, setDistribution] = useState('normal');
  const [isAnimating, setIsAnimating] = useState(false);
  const [intervals, setIntervals] = useState([]);
  const [coverageRate, setCoverageRate] = useState(0);
  const animationRef = useRef(null);

  // Generate a random interval
  const generateInterval = () => {
    // Define parameters based on distribution type
    let mean, stdDev, sampleStdDev, sampleMean, lower, upper, covers;
    const sampleSize = 30;
    
    if (distribution === 'normal') {
      // For normal distribution
      mean = trueValue;
      stdDev = 2;
      
      // Generate random sample
      const sample = Array(sampleSize).fill().map(() => 
        d3.randomNormal(mean, stdDev)()
      );
      
      // Calculate sample statistics
      sampleMean = d3.mean(sample);
      sampleStdDev = d3.deviation(sample);
      
      // Calculate critical value based on confidence level
      const criticalValue = getCriticalValue(confidenceLevel, sampleSize - 1);
      
      // Calculate interval bounds
      const marginOfError = criticalValue * sampleStdDev / Math.sqrt(sampleSize);
      lower = sampleMean - marginOfError;
      upper = sampleMean + marginOfError;
    } else if (distribution === 'bernoulli') {
      // For bernoulli distribution (proportion)
      const p = trueValue;
      
      // Simulate Bernoulli trials
      const sample = Array(sampleSize).fill().map(() => 
        Math.random() < p ? 1 : 0
      );
      
      // Calculate sample proportion
      const sampleProportion = d3.mean(sample);
      
      // Calculate Wilson score interval
      const z = getCriticalValue(confidenceLevel);
      const z2 = z * z;
      const factor = 1 / (1 + z2/sampleSize);
      const center = (sampleProportion + z2/(2*sampleSize)) * factor;
      const halfWidth = z * Math.sqrt((sampleProportion*(1-sampleProportion) + z2/(4*sampleSize)) / sampleSize) * factor;
      
      lower = center - halfWidth;
      upper = center + halfWidth;
      sampleMean = sampleProportion;
    } else {
      // Default to normal
      mean = trueValue;
      stdDev = 2;
      
      const sample = Array(sampleSize).fill().map(() => 
        d3.randomNormal(mean, stdDev)()
      );
      
      sampleMean = d3.mean(sample);
      sampleStdDev = d3.deviation(sample);
      
      const criticalValue = getCriticalValue(confidenceLevel, sampleSize - 1);
      const marginOfError = criticalValue * sampleStdDev / Math.sqrt(sampleSize);
      lower = sampleMean - marginOfError;
      upper = sampleMean + marginOfError;
    }
    
    // Determine if interval covers the true value
    covers = lower <= trueValue && upper >= trueValue;
    
    return {
      sampleMean,
      lower,
      upper,
      covers
    };
  };

  // Get critical value for a given confidence level
  const getCriticalValue = (conf, df = null) => {
    // For z-value (normal distribution)
    if (df === null) {
      const alpha = 1 - conf;
      const z = Math.abs(quantileNormal(alpha / 2));
      return z;
    } 
    // For t-value (with degrees of freedom)
    else {
      // Approximation of t-distribution quantile
      // NOTE: This is just an approximation for the animation
      // In a real implementation, use a proper t-distribution function
      const alpha = 1 - conf;
      const z = Math.abs(quantileNormal(alpha / 2));
      const correction = df < 30 ? 1 + 2 / df : 1;
      return z * correction;
    }
  };

  // Animation function to add intervals gradually
  const addInterval = () => {
    if (intervals.length >= maxIntervals) {
      setIsAnimating(false);
      return;
    }
    
    const newInterval = generateInterval();
    const updatedIntervals = [...intervals, newInterval];
    setIntervals(updatedIntervals);
    
    // Calculate current coverage rate
    const covered = updatedIntervals.filter(i => i.covers).length;
    setCoverageRate(covered / updatedIntervals.length);
    
    if (isAnimating) {
      animationRef.current = setTimeout(() => addInterval(), 500);
    }
  };

  // Handle start/stop animation
  const toggleAnimation = () => {
    if (isAnimating) {
      clearTimeout(animationRef.current);
      setIsAnimating(false);
    } else {
      setIsAnimating(true);
      addInterval();
    }
  };

  // Reset animation
  const resetAnimation = () => {
    clearTimeout(animationRef.current);
    setIsAnimating(false);
    setIntervals([]);
    setCoverageRate(0);
  };

  // Restart animation
  const restartAnimation = () => {
    resetAnimation();
    setIsAnimating(true);
    setTimeout(() => addInterval(), 100);
  };

  // Update visualization when parameters or data change
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Get the width of the container
    const containerWidth = svgRef.current.clientWidth;
    
    // Calculate the range for x-axis
    let minValue = trueValue - 5;
    let maxValue = trueValue + 5;
    
    // Adjust range based on observed intervals
    if (intervals.length > 0) {
      const allLower = intervals.map(i => i.lower);
      const allUpper = intervals.map(i => i.upper);
      const minObserved = d3.min(allLower);
      const maxObserved = d3.max(allUpper);
      
      // Extend range if needed
      minValue = Math.min(minValue, minObserved - 1);
      maxValue = Math.max(maxValue, maxObserved + 1);
    }
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([50, containerWidth - 20]);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxIntervals])
      .range([50, height - 30]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    
    svg.append("g")
      .attr("transform", `translate(0, ${height - 30})`)
      .call(xAxis);
    
    // Add title
    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(`Confidence Interval Coverage Simulation (${confidenceLevel * 100}% CI)`);
    
    // Add true value vertical line
    svg.append("line")
      .attr("x1", xScale(trueValue))
      .attr("x2", xScale(trueValue))
      .attr("y1", 40)
      .attr("y2", height - 30)
      .attr("stroke", "red")
      .attr("stroke-width", 2);
    
    svg.append("text")
      .attr("x", xScale(trueValue))
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "red")
      .text(`True Value: ${trueValue}`);
    
    // Draw intervals
    intervals.forEach((interval, i) => {
      const y = yScale(i);
      
      // Interval line
      svg.append("line")
        .attr("x1", xScale(interval.lower))
        .attr("x2", xScale(interval.upper))
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", interval.covers ? "#4caf50" : "#f44336")
        .attr("stroke-width", 2);
      
      // Endpoint markers
      svg.append("circle")
        .attr("cx", xScale(interval.lower))
        .attr("cy", y)
        .attr("r", 3)
        .attr("fill", interval.covers ? "#4caf50" : "#f44336");
        
      svg.append("circle")
        .attr("cx", xScale(interval.upper))
        .attr("cy", y)
        .attr("r", 3)
        .attr("fill", interval.covers ? "#4caf50" : "#f44336");
      
      // Sample mean marker
      svg.append("circle")
        .attr("cx", xScale(interval.sampleMean))
        .attr("cy", y)
        .attr("r", 2)
        .attr("fill", "black");
    });
    
    // Add coverage rate label
    if (intervals.length > 0) {
      svg.append("text")
        .attr("x", 20)
        .attr("y", 20)
        .style("font-size", "12px")
        .text(`Coverage: ${(coverageRate * 100).toFixed(1)}%`);
        
      svg.append("text")
        .attr("x", containerWidth - 20)
        .attr("y", 20)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text(`Intervals: ${intervals.length}`);
    }
    
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${containerWidth - 150}, ${height - 80})`);
    
    legend.append("rect")
      .attr("width", 130)
      .attr("height", 50)
      .attr("fill", "white")
      .attr("stroke", "#ccc");
    
    // Covers true value
    legend.append("line")
      .attr("x1", 10)
      .attr("x2", 50)
      .attr("y1", 15)
      .attr("y2", 15)
      .attr("stroke", "#4caf50")
      .attr("stroke-width", 2);
      
    legend.append("text")
      .attr("x", 60)
      .attr("y", 18)
      .style("font-size", "10px")
      .text("Covers true value");
    
    // Misses true value
    legend.append("line")
      .attr("x1", 10)
      .attr("x2", 50)
      .attr("y1", 35)
      .attr("y2", 35)
      .attr("stroke", "#f44336")
      .attr("stroke-width", 2);
      
    legend.append("text")
      .attr("x", 60)
      .attr("y", 38)
      .style("font-size", "10px")
      .text("Misses true value");
  }, [intervals, confidenceLevel, trueValue, height, maxIntervals, coverageRate]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      {/* SVG container for the visualization */}
      <Box sx={{ width: '100%', height: height, overflow: 'hidden' }}>
        <svg ref={svgRef} width="100%" height={height} />
      </Box>
      
      {/* Controls */}
      <Box sx={{ mt: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="distribution-label">Distribution</InputLabel>
              <Select
                labelId="distribution-label"
                value={distribution}
                label="Distribution"
                onChange={(e) => {
                  setDistribution(e.target.value);
                  resetAnimation();
                }}
              >
                <MenuItem value="normal">Normal (Mean)</MenuItem>
                <MenuItem value="bernoulli">Bernoulli (Proportion)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography id="confidence-level-slider" gutterBottom>
              Confidence Level: {(confidenceLevel * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={confidenceLevel}
              onChange={(e, newValue) => {
                setConfidenceLevel(newValue);
                resetAnimation();
              }}
              step={0.01}
              marks={[
                { value: 0.8, label: '80%' },
                { value: 0.9, label: '90%' },
                { value: 0.95, label: '95%' },
                { value: 0.99, label: '99%' }
              ]}
              min={0.8}
              max={0.99}
              aria-labelledby="confidence-level-slider"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant={isAnimating ? "contained" : "outlined"}
                color={isAnimating ? "secondary" : "primary"}
                startIcon={isAnimating ? <PauseIcon /> : <PlayArrowIcon />}
                onClick={toggleAnimation}
              >
                {isAnimating ? "Pause" : "Start"}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ReplayIcon />}
                onClick={restartAnimation}
              >
                Restart
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Expected coverage: {(confidenceLevel * 100).toFixed(0)}%
          </Typography>
          
          {intervals.length > 0 && (
            <Chip 
              label={`Actual coverage: ${(coverageRate * 100).toFixed(1)}%`} 
              color={Math.abs(coverageRate - confidenceLevel) < 0.1 ? "success" : "default"}
            />
          )}
        </Box>
      </Box>
      
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        This animation demonstrates how confidence intervals work. Each horizontal line represents a 
        confidence interval constructed from a random sample. The vertical red line shows the true 
        population parameter. Green intervals cover the true value, while red intervals miss it.
        As more intervals are added, the coverage rate should approach the confidence level.
      </Typography>
    </Box>
  );
};

export default CoverageAnimation;