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
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Backdrop
} from '@mui/material';
import { jStat } from 'jstat';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import TuneIcon from '@mui/icons-material/Tune';

/**
 * Component for animating how confidence intervals are constructed
 * and showing the effect of different parameters on interval width
 */
const IntervalConstructionAnimation = ({
  height = 400,
  width = '100%',
  initialSampleSize = 30,
  initialConfidenceLevel = 0.95,
  initialStdDev = 2
}) => {
  const svgRef = useRef(null);
  const [sampleSize, setSampleSize] = useState(initialSampleSize);
  const [confidenceLevel, setConfidenceLevel] = useState(initialConfidenceLevel);
  const [stdDev, setStdDev] = useState(initialStdDev);
  const [distributionType, setDistributionType] = useState('t');
  const [sample, setSample] = useState([]);
  const [intervalData, setIntervalData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate a random sample
  const generateSample = () => {
    const mean = 10; // Fixed mean for consistency
    const newSample = Array(sampleSize).fill().map(() => 
      d3.randomNormal(mean, stdDev)()
    );
    setSample(newSample);
  };

  // Calculate confidence interval from the sample
  const calculateInterval = () => {
    if (sample.length === 0) return null;
    
    const sampleMean = d3.mean(sample);
    const sampleStdDev = d3.deviation(sample);
    const standardError = sampleStdDev / Math.sqrt(sample.length);
    
    let criticalValue;
    if (distributionType === 'z') {
      // Use Z distribution (normal)
      const alpha = 1 - confidenceLevel;
      criticalValue = Math.abs(jStat.normal.inv(alpha / 2, 0, 1));
    } else {
      // Use T distribution
      const alpha = 1 - confidenceLevel;
      const df = sample.length - 1;
      criticalValue = Math.abs(jStat.studentt.inv(alpha / 2, df));
    }
    
    const marginOfError = criticalValue * standardError;
    const lowerBound = sampleMean - marginOfError;
    const upperBound = sampleMean + marginOfError;
    
    return {
      mean: sampleMean,
      stdDev: sampleStdDev,
      standardError,
      criticalValue,
      marginOfError,
      lower: lowerBound,
      upper: upperBound,
      width: upperBound - lowerBound
    };
  };

  // Generate a sample and calculate interval (memoized to avoid infinite renders)
  useEffect(() => {
    setLoading(true);
    
    // Add a timeout to prevent infinite loading if the operation takes too long
    const timeoutId = setTimeout(() => {
      setLoading(false);
      console.warn("Operation timed out - resetting loading state");
    }, 5000); // 5 second timeout
    
    try {
      // Generate initial sample
      const mean = 10; // Fixed mean for consistency
      const actualStdDev = Math.max(0.1, stdDev); // Ensure positive std deviation
      
      // Safely generate random sample
      let newSample = [];
      try {
        newSample = Array(sampleSize).fill().map(() => 
          d3.randomNormal(mean, actualStdDev)()
        );
        
        // Filter out any NaN values
        newSample = newSample.filter(val => Number.isFinite(val));
        
        // If we lost too many values due to filtering, regenerate with safer parameters
        if (newSample.length < sampleSize * 0.9) {
          newSample = Array(sampleSize).fill().map((_, i) => 
            mean + (i % 10) * 0.1 * actualStdDev // Deterministic fallback
          );
        }
      } catch (err) {
        console.error("Error generating sample:", err);
        // Create a deterministic fallback sample
        newSample = Array(sampleSize).fill().map((_, i) => 
          mean + Math.sin(i) * actualStdDev
        );
      }
      
      setSample(newSample);
      
      // Calculate interval from the sample
      if (newSample.length > 0) {
        const sampleMean = d3.mean(newSample) || mean;
        let sampleStdDev = d3.deviation(newSample);
        
        // Fallback if standard deviation calculation fails
        if (!sampleStdDev || !Number.isFinite(sampleStdDev) || sampleStdDev <= 0) {
          sampleStdDev = actualStdDev;
        }
        
        const standardError = sampleStdDev / Math.sqrt(newSample.length);
        
        let criticalValue;
        try {
          if (distributionType === 'z') {
            // Use Z distribution (normal)
            const alpha = 1 - confidenceLevel;
            criticalValue = Math.abs(jStat.normal.inv(alpha / 2, 0, 1));
          } else {
            // Use T distribution
            const alpha = 1 - confidenceLevel;
            const df = Math.max(1, newSample.length - 1); // Ensure df is at least 1
            criticalValue = Math.abs(jStat.studentt.inv(alpha / 2, df));
          }
          
          // Fallback if critical value calculation fails
          if (!criticalValue || !Number.isFinite(criticalValue)) {
            console.warn("Critical value calculation failed, using fallback");
            criticalValue = distributionType === 'z' ? 1.96 : 2.0;
          }
        } catch (err) {
          console.error("Error calculating critical value:", err);
          criticalValue = distributionType === 'z' ? 1.96 : 2.0; // Fallback values
        }
        
        const marginOfError = criticalValue * standardError;
        const lowerBound = sampleMean - marginOfError;
        const upperBound = sampleMean + marginOfError;
        
        setIntervalData({
          mean: sampleMean,
          stdDev: sampleStdDev,
          standardError,
          criticalValue,
          marginOfError,
          lower: lowerBound,
          upper: upperBound,
          width: upperBound - lowerBound
        });
      }
    } catch (error) {
      console.error("Error generating sample or calculating interval:", error);
      // Create basic fallback interval data for visualization
      setIntervalData({
        mean: 10,
        stdDev: stdDev || 1,
        standardError: (stdDev || 1) / Math.sqrt(sampleSize),
        criticalValue: distributionType === 'z' ? 1.96 : 2.0,
        marginOfError: (stdDev || 1) / Math.sqrt(sampleSize) * (distributionType === 'z' ? 1.96 : 2.0),
        lower: 10 - ((stdDev || 1) / Math.sqrt(sampleSize) * (distributionType === 'z' ? 1.96 : 2.0)),
        upper: 10 + ((stdDev || 1) / Math.sqrt(sampleSize) * (distributionType === 'z' ? 1.96 : 2.0)),
        width: 2 * ((stdDev || 1) / Math.sqrt(sampleSize) * (distributionType === 'z' ? 1.96 : 2.0))
      });
    } finally {
      clearTimeout(timeoutId); // Clear the timeout if operation completes
      setLoading(false);
    }
  }, [sampleSize, stdDev, confidenceLevel, distributionType]);

  // Update visualization when data changes
  useEffect(() => {
    if (!svgRef.current || !intervalData) {
      // Ensure loading is turned off even if we can't render
      setLoading(false);
      return;
    }
    
    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      
      // Get the width of the container
      const containerWidth = svgRef.current.clientWidth || 300; // Fallback width if clientWidth is 0
      
      // Setup dimensions
      const margin = { top: 40, right: 30, bottom: 50, left: 60 };
      const innerWidth = containerWidth - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
    
    // Data range
    const mean = intervalData.mean;
    const padding = intervalData.width * 0.5;
    const minX = Math.min(intervalData.lower - padding, mean - padding * 1.5);
    const maxX = Math.max(intervalData.upper + padding, mean + padding * 1.5);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([minX, maxX])
      .range([0, innerWidth]);
    
    // Create the main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    
    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(xAxis);
    
    // Add title
    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(`Confidence Interval Construction (${confidenceLevel * 100}% CI)`);
    
    // Add x-axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Parameter Value");
    
    // Draw distribution curve
    const distributionCurve = createDistributionCurve(
      mean, 
      intervalData.standardError, 
      xScale, 
      innerHeight,
      distributionType === 't' ? sample.length - 1 : null
    );
    
    // Define gradient for distribution fill
    const gradient = g.append("defs")
      .append("linearGradient")
      .attr("id", "distribution-gradient")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");
      
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "rgba(25, 118, 210, 0.7)");
      
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "rgba(25, 118, 210, 0.1)");
    
    // Draw the distribution path
    g.append("path")
      .datum(distributionCurve)
      .attr("fill", "url(#distribution-gradient)")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveBasis)
      );
    
    // Shade the confidence interval area
    const ciAreaPoints = distributionCurve.filter(
      d => xScale.invert(d.x) >= intervalData.lower && xScale.invert(d.x) <= intervalData.upper
    );
    
    // Create closed path for the shaded area
    if (ciAreaPoints.length > 0) {
      const areaPath = [
        { x: xScale(intervalData.lower), y: innerHeight },
        ...ciAreaPoints,
        { x: xScale(intervalData.upper), y: innerHeight }
      ];
      
      g.append("path")
        .datum(areaPath)
        .attr("fill", "rgba(76, 175, 80, 0.4)")
        .attr("d", d3.line()
          .x(d => d.x)
          .y(d => d.y)
          .curve(d3.curveBasis)
        );
    }
    
    // Draw confidence interval
    g.append("line")
      .attr("x1", xScale(intervalData.lower))
      .attr("x2", xScale(intervalData.upper))
      .attr("y1", innerHeight * 0.85)
      .attr("y2", innerHeight * 0.85)
      .attr("stroke", "#4caf50")
      .attr("stroke-width", 3);
    
    // Draw endpoints
    g.append("line")
      .attr("x1", xScale(intervalData.lower))
      .attr("x2", xScale(intervalData.lower))
      .attr("y1", innerHeight * 0.82)
      .attr("y2", innerHeight * 0.88)
      .attr("stroke", "#4caf50")
      .attr("stroke-width", 2);
      
    g.append("line")
      .attr("x1", xScale(intervalData.upper))
      .attr("x2", xScale(intervalData.upper))
      .attr("y1", innerHeight * 0.82)
      .attr("y2", innerHeight * 0.88)
      .attr("stroke", "#4caf50")
      .attr("stroke-width", 2);
    
    // Draw mean
    g.append("circle")
      .attr("cx", xScale(intervalData.mean))
      .attr("cy", innerHeight * 0.85)
      .attr("r", 5)
      .attr("fill", "#e91e63");
    
    // Add labels
    g.append("text")
      .attr("x", xScale(intervalData.lower))
      .attr("y", innerHeight * 0.78)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(intervalData.lower.toFixed(2));
      
    g.append("text")
      .attr("x", xScale(intervalData.upper))
      .attr("y", innerHeight * 0.78)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(intervalData.upper.toFixed(2));
    
    g.append("text")
      .attr("x", xScale(intervalData.mean))
      .attr("y", innerHeight * 0.95)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#e91e63")
      .text(`Mean: ${intervalData.mean.toFixed(2)}`);
      
    // Add margin of error annotation
    const moeLabelX = (xScale(intervalData.upper) + xScale(intervalData.mean)) / 2;
    
    g.append("text")
      .attr("x", moeLabelX)
      .attr("y", innerHeight * 0.7)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(`Margin of Error: ${intervalData.marginOfError.toFixed(2)}`);
      
    g.append("line")
      .attr("x1", xScale(intervalData.mean))
      .attr("x2", xScale(intervalData.upper))
      .attr("y1", innerHeight * 0.73)
      .attr("y2", innerHeight * 0.73)
      .attr("stroke", "#666")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
      
    g.append("line")
      .attr("x1", xScale(intervalData.mean))
      .attr("x2", xScale(intervalData.mean))
      .attr("y1", innerHeight * 0.73)
      .attr("y2", innerHeight * 0.76)
      .attr("stroke", "#666")
      .attr("stroke-width", 1);
      
    g.append("line")
      .attr("x1", xScale(intervalData.upper))
      .attr("x2", xScale(intervalData.upper))
      .attr("y1", innerHeight * 0.73)
      .attr("y2", innerHeight * 0.76)
      .attr("stroke", "#666")
      .attr("stroke-width", 1);
    
    // Add formula
    g.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .style("font-size", "12px")
      .style("font-style", "italic")
      .text(`Formula: Mean ± ${distributionType === 'z' ? 'z' : 't'}${intervalData.criticalValue.toFixed(2)} × SE${intervalData.standardError.toFixed(2)}`);
    } catch (error) {
      console.error("Error rendering visualization:", error);
      // Clear any partial rendering
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        // Add error message to SVG
        svg.append("text")
          .attr("x", svgRef.current.clientWidth / 2 || 150)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .style("fill", "red")
          .text("Error rendering visualization. Try adjusting parameters.");
      }
    } finally {
      // Always ensure loading is turned off
      setLoading(false);
    }
  }, [intervalData, height, distributionType, confidenceLevel, sample.length]);

  // Helper function to create a distribution curve
  const createDistributionCurve = (mean, se, xScale, height, df = null) => {
    try {
      // Safety check for inputs
      if (!mean || !se || !xScale || !height || typeof mean !== 'number' || typeof se !== 'number' || se <= 0) {
        console.error("Invalid inputs to createDistributionCurve:", { mean, se, height, df });
        throw new Error("Invalid distribution parameters");
      }
      
      const x = d3.range(
        xScale.domain()[0], 
        xScale.domain()[1], 
        (xScale.domain()[1] - xScale.domain()[0]) / 100
      );
      
      let y;
      
      if (df === null) {
        // Normal distribution
        y = x.map(d => jStat.normal.pdf(d, mean, se));
      } else {
        // T distribution (centered and scaled)
        const scaleFactor = se;
        y = x.map(d => {
          const standardized = (d - mean) / scaleFactor;
          return jStat.studentt.pdf(standardized, df) / scaleFactor;
        });
      }
      
      // Filter out any NaN or infinite values
      y = y.map(val => (Number.isFinite(val) ? val : 0));
      
      // Scale y values to fit within height
      const maxY = Math.max(...y);
      // Prevent division by zero or very small values
      const scaleFactor = maxY > 0.00001 ? (height * 0.6 / maxY) : 1;
      
      // Create array of points
      return x.map((d, i) => ({
        x: xScale(d),
        y: height - y[i] * scaleFactor
      }));
    } catch (error) {
      console.error("Error creating distribution curve:", error);
      // Return a simple, safe curve in case of error
      return [
        { x: 0, y: height },
        { x: xScale.range()[1] / 2, y: height / 2 },
        { x: xScale.range()[1], y: height }
      ];
    }
  };

  // Handle sample size change - memoized with useCallback to prevent recreation on every render
  const handleSampleSizeChange = React.useCallback((change) => {
    setSampleSize(prevSize => {
      return Math.max(5, Math.min(500, prevSize + change));
    });
    // Don't call generateSample() here since setting sampleSize will trigger the useEffect
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Interactive Confidence Interval Construction
      </Typography>
      
      <Typography paragraph>
        Explore how different factors affect the width of confidence intervals.
        Adjust the parameters below to see the changes in real-time.
      </Typography>
      
      {/* SVG container for the visualization */}
      <Box sx={{ width: '100%', height: height, overflow: 'hidden', border: '1px solid #eee', borderRadius: 1, position: 'relative' }}>
        <svg ref={svgRef} width="100%" height={height} />
        
        {/* Loading backdrop */}
        <Backdrop
          sx={{ 
            position: 'absolute', 
            zIndex: 10,
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }}
          open={loading}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress color="inherit" />
            <Typography sx={{ mt: 2 }}>Loading visualization...</Typography>
          </Box>
        </Backdrop>
      </Box>
      
      {/* Controls */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Sample Size
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => handleSampleSizeChange(-5)}
                >
                  <RemoveIcon fontSize="small" />
                </Button>
                
                <Typography sx={{ mx: 2 }}>
                  n = {sampleSize}
                </Typography>
                
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => handleSampleSizeChange(5)}
                >
                  <AddIcon fontSize="small" />
                </Button>
              </Box>
              
              <Typography variant="body2" color="textSecondary">
                Increasing sample size reduces the width of the confidence interval.
                The relationship is proportional to 1/√n.
              </Typography>
              
              {intervalData && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" display="block">
                    Standard Error: {intervalData.standardError.toFixed(4)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Confidence Level
              </Typography>
              
              <Slider
                value={confidenceLevel}
                onChange={(e, newValue) => setConfidenceLevel(newValue)}
                step={0.01}
                marks={[
                  { value: 0.8, label: '80%' },
                  { value: 0.9, label: '90%' },
                  { value: 0.95, label: '95%' },
                  { value: 0.99, label: '99%' }
                ]}
                min={0.8}
                max={0.99}
              />
              
              <Typography variant="body2" color="textSecondary">
                Higher confidence requires wider intervals. As confidence level approaches 100%,
                the interval width approaches infinity.
              </Typography>
              
              {intervalData && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" display="block">
                    Critical Value: {intervalData.criticalValue.toFixed(4)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom color="primary">
                Data Variability
              </Typography>
              
              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={8}>
                  <Slider
                    value={stdDev}
                    onChange={(e, newValue) => {
                      setStdDev(newValue);
                      generateSample();
                    }}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: 'Low' },
                      { value: 2, label: 'Med' },
                      { value: 5, label: 'High' }
                    ]}
                    min={0.5}
                    max={5}
                  />
                </Grid>
                
                <Grid item xs={4}>
                  <Typography>
                    σ = {stdDev.toFixed(1)}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 1 }} />
              
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel id="distribution-type-label">Distribution</InputLabel>
                <Select
                  labelId="distribution-type-label"
                  value={distributionType}
                  label="Distribution"
                  onChange={(e) => setDistributionType(e.target.value)}
                >
                  <MenuItem value="z">Normal (Z)</MenuItem>
                  <MenuItem value="t">Student's t</MenuItem>
                </Select>
              </FormControl>
              
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                More variable data produces wider intervals. The interval width is directly 
                proportional to the standard deviation.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Resample button */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button 
          variant="contained" 
          startIcon={<TuneIcon />}
          onClick={() => {
            // Force a new sample by using a different stdDev and then reverting back
            const currentStdDev = stdDev;
            setStdDev(prev => prev + 0.001);
            setTimeout(() => setStdDev(currentStdDev), 10);
          }}
        >
          Generate New Sample
        </Button>
        
        {intervalData && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Interval Width: {intervalData.width.toFixed(4)} | 
            Margin of Error: {intervalData.marginOfError.toFixed(4)}
          </Typography>
        )}
      </Box>
      
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        This interactive visualization demonstrates how confidence intervals are constructed and
        how they change based on sample size, confidence level, and data variability. The curve
        represents the sampling distribution of the mean, and the green area shows the confidence
        interval. The red dot indicates the sample mean.
      </Typography>
    </Box>
  );
};

export default IntervalConstructionAnimation;