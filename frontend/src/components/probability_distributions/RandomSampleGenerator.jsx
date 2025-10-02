import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Grid, 
  TextField, 
  Button, 
  FormControlLabel,
  Switch,
  Slider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { Line, Bar, Scatter } from 'react-chartjs-2';

import { generateRandomSample } from '../../api/probabilityDistributionsApi';

const RandomSampleGenerator = ({ 
  distributionType, 
  parameters,
  projectId,
  distributionId
}) => {
  const [sampleSize, setSampleSize] = useState(100);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState('');
  const [useSeed, setUseSeed] = useState(false);
  const [chartType, setChartType] = useState('histogram');
  const [animating, setAnimating] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [animationData, setAnimationData] = useState([]);
  
  const chartRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();
  const animationRef = useRef(null);
  
  // Generate random samples
  const handleGenerateSamples = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Make sure we have both distributionType and parameters before proceeding
      if (!distributionType || !parameters) {
        setError('Distribution type or parameters not available');
        setLoading(false);
        return;
      }
      
      // Validate parameters to ensure they are complete based on distribution type
      let missingParams = false;
      if (distributionType === 'NORMAL' && (parameters.mean === undefined || (parameters.std === undefined && parameters.stdDev === undefined))) {
        missingParams = true;
      } else if (distributionType === 'BINOMIAL' && (parameters.n === undefined || parameters.p === undefined)) {
        missingParams = true;
      } else if (distributionType === 'POISSON' && parameters.lambda === undefined) {
        missingParams = true;
      } else if (distributionType === 'EXPONENTIAL' && parameters.rate === undefined) {
        missingParams = true;
      } else if (distributionType === 'UNIFORM' && (parameters.a === undefined || parameters.b === undefined)) {
        missingParams = true;
      }
      
      if (missingParams) {
        setError('Required parameters for the selected distribution are missing');
        setLoading(false);
        return;
      }
      
      // Normalize parameter names for API compatibility
      const normalizedParams = { ...parameters };
      if (distributionType === 'NORMAL' && parameters.stdDev !== undefined) {
        normalizedParams.std = parameters.stdDev;
        delete normalizedParams.stdDev;
      }
      
      const result = await generateRandomSample(
        distributionType,
        normalizedParams,
        sampleSize,
        useSeed ? parseInt(seed) : undefined
      );
      
      if (result && result.sample) {
        setSamples(result.sample);
        setAnimationStep(0);
        setAnimationData([]);
        setAnimating(false);
      } else if (result && Array.isArray(result.samples)) {
        // Some versions of the API might return 'samples' instead of 'sample'
        setSamples(result.samples);
        setAnimationStep(0);
        setAnimationData([]);
        setAnimating(false);
      } else if (result && result.data && (Array.isArray(result.data.sample) || Array.isArray(result.data.samples))) {
        // Handle nested response format
        const sampleData = Array.isArray(result.data.sample) ? result.data.sample : result.data.samples;
        setSamples(sampleData);
        setAnimationStep(0);
        setAnimationData([]);
        setAnimating(false);
      } else {
        console.error('Unexpected API response format:', result);
        setError('Failed to generate samples. API response format unexpected.');
      }
    } catch (err) {
      console.error('Error generating samples:', err);
      setError(`Error generating random samples: ${err.message || 'Unknown error'}`);
      enqueueSnackbar('Error generating samples', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Copy samples to clipboard
  const handleCopySamples = () => {
    if (samples.length === 0) return;
    
    const text = samples.join('\n');
    navigator.clipboard.writeText(text)
      .then(() => {
        enqueueSnackbar('Samples copied to clipboard', { variant: 'success' });
      })
      .catch((err) => {
        console.error('Error copying to clipboard:', err);
        enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' });
      });
  };
  
  // Download samples as CSV
  const handleDownloadSamples = () => {
    if (samples.length === 0) return;
    
    const text = samples.join('\n');
    const blob = new Blob([text], { type: 'text/csv' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = `${distributionType ? distributionType.toLowerCase() : 'probability'}_samples.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Toggle chart type
  const handleToggleChartType = () => {
    setChartType(chartType === 'histogram' ? 'dotplot' : 'histogram');
  };
  
  // Start animation
  const handleStartAnimation = () => {
    if (samples.length === 0) {
      enqueueSnackbar('Generate samples first', { variant: 'info' });
      return;
    }
    
    setAnimating(true);
    setAnimationStep(0);
    setAnimationData([]);
  };
  
  // Handle animation
  useEffect(() => {
    if (animating && samples.length > 0) {
      const totalSteps = Math.min(100, samples.length);
      const stepSize = Math.ceil(samples.length / totalSteps);
      
      // Clear any existing animation timer
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      
      if (animationStep < totalSteps) {
        animationRef.current = setTimeout(() => {
          const newStep = animationStep + 1;
          const dataToShow = samples.slice(0, newStep * stepSize);
          setAnimationData(dataToShow);
          setAnimationStep(newStep);
        }, 50);
      } else {
        // Animation complete
        setAnimating(false);
      }
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [animating, animationStep, samples]);
  
  // Prepare histogram data
  const getHistogramData = (data) => {
    if (!data || data.length === 0) return null;
    
    // Determine number of bins (Sturges' formula)
    const binCount = Math.min(30, Math.max(5, Math.ceil(Math.log2(data.length) + 1)));
    
    // Find min and max values
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // Calculate bin width
    const binWidth = (max - min) / binCount;
    
    // Create bins
    const bins = Array(binCount).fill(0);
    
    // Count values in each bin
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
      bins[binIndex]++;
    });
    
    // Create bin labels (lower bound of each bin)
    const labels = Array.from({ length: binCount }, (_, i) => min + i * binWidth);
    
    // For discrete distributions, adjust bins to whole numbers
    if (['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(distributionType)) {
      // Create integer-based bins
      const discreteMin = Math.floor(min);
      const discreteMax = Math.ceil(max);
      const discreteBinCount = discreteMax - discreteMin + 1;
      
      const discreteBins = Array(discreteBinCount).fill(0);
      
      // Count values in each discrete bin
      data.forEach(value => {
        const binIndex = Math.floor(value) - discreteMin;
        if (binIndex >= 0 && binIndex < discreteBinCount) {
          discreteBins[binIndex]++;
        }
      });
      
      // Create discrete bin labels
      const discreteLabels = Array.from({ length: discreteBinCount }, (_, i) => discreteMin + i);
      
      return {
        labels: discreteLabels,
        values: discreteBins.map(count => count / data.length), // Normalize to proportions
        binWidth: 1
      };
    }
    
    return {
      labels,
      values: bins.map(count => count / data.length), // Normalize to proportions
      binWidth
    };
  };
  
  // Calculate basic statistics
  const calculateStats = (data) => {
    if (!data || data.length === 0) return null;
    
    const n = data.length;
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // Calculate variance
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Sort data for percentiles
    const sortedData = [...data].sort((a, b) => a - b);
    
    // Calculate median (50th percentile)
    const median = n % 2 === 0
      ? (sortedData[n / 2 - 1] + sortedData[n / 2]) / 2
      : sortedData[Math.floor(n / 2)];
    
    // Calculate other percentiles
    const p25 = sortedData[Math.floor(n * 0.25)];
    const p75 = sortedData[Math.floor(n * 0.75)];
    
    return {
      count: n,
      mean,
      median,
      stdDev,
      min,
      max,
      variance,
      p25,
      p75,
      sum
    };
  };
  
  // Prepare chart data
  const getChartData = () => {
    const dataToUse = animating ? animationData : samples;
    
    if (dataToUse.length === 0) return null;
    
    if (chartType === 'histogram') {
      const histogramData = getHistogramData(dataToUse);
      
      if (!histogramData) return null;
      
      return {
        labels: histogramData.labels,
        datasets: [
          {
            label: 'Sample Distribution',
            data: histogramData.values,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            barPercentage: 1,
            categoryPercentage: 1
          }
        ]
      };
    } else { // Dot plot
      return {
        datasets: [
          {
            label: 'Sample Values',
            data: dataToUse.map((value, index) => ({ x: value, y: 0 })),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 0.8)',
            borderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      };
    }
  };
  
  // Chart options
  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: animating ? 0 : 500
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              if (chartType === 'histogram') {
                const value = parseFloat(context[0].label);
                const histogramData = getHistogramData(animating ? animationData : samples);
                const binWidth = histogramData.binWidth;
                return `Range: ${value.toFixed(2)} to ${(value + binWidth).toFixed(2)}`;
              }
              return `Value: ${parseFloat(context[0].parsed.x).toFixed(4)}`;
            },
            label: function(context) {
              if (chartType === 'histogram') {
                const count = context.parsed.y * (animating ? animationData.length : samples.length);
                return `Count: ${Math.round(count)} (${(context.parsed.y * 100).toFixed(2)}%)`;
              }
              return `Value: ${parseFloat(context.parsed.x).toFixed(4)}`;
            }
          }
        }
      }
    };
    
    if (chartType === 'histogram') {
      return {
        ...baseOptions,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Value'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Relative Frequency'
            },
            min: 0,
            ticks: {
              callback: function(value) {
                return (value * 100).toFixed(0) + '%';
              }
            }
          }
        }
      };
    } else { // Dot plot
      const dataToUse = animating ? animationData : samples;
      const min = Math.min(...dataToUse);
      const max = Math.max(...dataToUse);
      const padding = (max - min) * 0.1;
      
      return {
        ...baseOptions,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Value'
            },
            min: min - padding,
            max: max + padding
          },
          y: {
            display: false,
            min: -1,
            max: 1
          }
        },
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            callbacks: {
              title: function(context) {
                return `Value: ${parseFloat(context[0].parsed.x).toFixed(4)}`;
              },
              label: function() {
                return '';
              }
            }
          }
        }
      };
    }
  };
  
  // Theoretical expected values based on distribution type and parameters
  const getTheoreticalValues = () => {
    let mean, variance, median, mode;
    
    switch (distributionType) {
      case 'NORMAL':
        mean = parameters.mean;
        variance = Math.pow(parameters.std, 2);
        median = parameters.mean;
        mode = parameters.mean;
        break;
      
      case 'BINOMIAL':
        mean = parameters.n * parameters.p;
        variance = parameters.n * parameters.p * (1 - parameters.p);
        // Approximate median for binomial
        median = Math.floor(parameters.n * parameters.p + 0.5);
        mode = Math.floor((parameters.n + 1) * parameters.p);
        break;
      
      case 'POISSON':
        mean = parameters.lambda;
        variance = parameters.lambda;
        // Approximate median for Poisson
        median = Math.floor(parameters.lambda + 1/3 - 0.02/parameters.lambda);
        mode = Math.floor(parameters.lambda);
        break;
      
      case 'EXPONENTIAL':
        mean = 1 / parameters.rate;
        variance = 1 / Math.pow(parameters.rate, 2);
        median = Math.log(2) / parameters.rate;
        mode = 0;
        break;
      
      case 'UNIFORM':
        mean = (parameters.a + parameters.b) / 2;
        variance = Math.pow(parameters.b - parameters.a, 2) / 12;
        median = mean;
        mode = 'N/A';
        break;
      
      case 'GAMMA':
        mean = parameters.shape * parameters.scale;
        variance = parameters.shape * Math.pow(parameters.scale, 2);
        // Approximate median for gamma
        median = mean;
        mode = parameters.shape > 1 ? (parameters.shape - 1) * parameters.scale : 0;
        break;
      
      case 'BETA':
        mean = parameters.alpha / (parameters.alpha + parameters.beta);
        variance = (parameters.alpha * parameters.beta) / 
          (Math.pow(parameters.alpha + parameters.beta, 2) * (parameters.alpha + parameters.beta + 1));
        // Mode for beta
        if (parameters.alpha > 1 && parameters.beta > 1) {
          mode = (parameters.alpha - 1) / (parameters.alpha + parameters.beta - 2);
        } else if (parameters.alpha === 1 && parameters.beta === 1) {
          mode = 'Uniform';
        } else if (parameters.alpha < 1 && parameters.beta < 1) {
          mode = 'Bimodal (0,1)';
        } else if (parameters.alpha <= 1) {
          mode = 0;
        } else if (parameters.beta <= 1) {
          mode = 1;
        }
        median = mean; // Approximation
        break;
      
      case 'LOGNORMAL':
        mean = Math.exp(parameters.mean + Math.pow(parameters.sigma, 2) / 2);
        variance = (Math.exp(Math.pow(parameters.sigma, 2)) - 1) * 
          Math.exp(2 * parameters.mean + Math.pow(parameters.sigma, 2));
        median = Math.exp(parameters.mean);
        mode = Math.exp(parameters.mean - Math.pow(parameters.sigma, 2));
        break;
      
      case 'WEIBULL':
        // Simplified approximation
        mean = parameters.scale * gamma(1 + 1/parameters.shape);
        variance = Math.pow(parameters.scale, 2) * (
          gamma(1 + 2/parameters.shape) - Math.pow(gamma(1 + 1/parameters.shape), 2)
        );
        median = parameters.scale * Math.pow(Math.log(2), 1/parameters.shape);
        mode = parameters.shape > 1 
          ? parameters.scale * Math.pow((parameters.shape - 1) / parameters.shape, 1/parameters.shape) 
          : 0;
        break;
      
      default:
        mean = variance = median = mode = null;
    }
    
    return {
      mean: typeof mean === 'number' ? mean : 'N/A',
      variance: typeof variance === 'number' ? variance : 'N/A',
      stdDev: typeof variance === 'number' ? Math.sqrt(variance) : 'N/A',
      median: typeof median === 'number' ? median : 'N/A',
      mode: typeof mode === 'number' ? mode : mode || 'N/A',
    };
  };
  
  // Simple approximation of the gamma function
  function gamma(x) {
    // Use simple approximation for common cases
    if (x === 1) return 1;
    if (x === 2) return 1;
    if (x === 3) return 2;
    if (x === 4) return 6;
    if (x === 5) return 24;
    
    // Lanczos approximation for other values
    return Math.sqrt(2 * Math.PI / x) * Math.pow((x / Math.E) * Math.sqrt(x * Math.sinh(1/x) + 1/(810 * Math.pow(x, 6))), x);
  }
  
  const chartData = getChartData();
  const sampleStats = calculateStats(samples);
  const theoreticalValues = getTheoreticalValues();
  
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Random Sample Generator
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Generate random samples from the current probability distribution.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Sample Size: {sampleSize}
              </Typography>
              <Slider
                value={sampleSize}
                onChange={(e, newValue) => setSampleSize(newValue)}
                min={10}
                max={1000}
                step={10}
                marks={[
                  { value: 10, label: '10' },
                  { value: 100, label: '100' },
                  { value: 500, label: '500' },
                  { value: 1000, label: '1000' }
                ]}
                disabled={loading}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={useSeed} 
                    onChange={(e) => setUseSeed(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Use fixed random seed"
              />
              
              {useSeed && (
                <TextField
                  label="Seed (integer)"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  disabled={loading}
                  size="small"
                  helperText="Using the same seed will generate the same 'random' samples"
                />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateSamples}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              >
                Generate
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleStartAnimation}
                disabled={loading || samples.length === 0 || animating}
                startIcon={<PlayArrowIcon />}
              >
                Animate
              </Button>
            </Box>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Visualization Settings
            </Typography>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={chartType === 'dotplot'} 
                  onChange={handleToggleChartType}
                  disabled={loading || animating}
                />
              }
              label={chartType === 'dotplot' ? 'Dot Plot' : 'Histogram'}
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Distribution
              </Typography>
              <Typography variant="body2" gutterBottom>
                {distributionType ? String(distributionType) : 'Probability'} Distribution
              </Typography>
              
              {parameters && (
                <>
                  <Typography variant="body2" gutterBottom>
                    Parameters:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {Object.entries(parameters).map(([key, value]) => (
                      <Typography key={key} variant="body2">
                        {key}: {value}
                      </Typography>
                    ))}
                  </Box>
                </>
              )}
            </Box>
            
            {samples.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Tooltip title="Copy samples to clipboard">
                  <IconButton 
                    onClick={handleCopySamples}
                    disabled={loading || samples.length === 0}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Download samples as CSV">
                  <IconButton 
                    onClick={handleDownloadSamples}
                    disabled={loading || samples.length === 0}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400, position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                {animating ? `Sampling Animation (${animationData.length} of ${samples.length} samples)` : 'Sample Distribution'}
              </Typography>
              
              {animating && (
                <Typography variant="caption" color="text.secondary">
                  Animating...
                </Typography>
              )}
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
              </Box>
            ) : samples.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Generate random samples to visualize their distribution
                </Typography>
              </Box>
            ) : chartData ? (
              <Box sx={{ height: 350 }}>
                {chartType === 'histogram' ? (
                  <Bar data={chartData} options={getChartOptions()} ref={chartRef} />
                ) : (
                  <Scatter data={chartData} options={getChartOptions()} ref={chartRef} />
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Error generating chart
                </Typography>
              </Box>
            )}
          </Paper>
          
          {samples.length > 0 && sampleStats && (
            <Paper sx={{ p: 2, mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Sample Statistics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Statistic</TableCell>
                          <TableCell align="right">Sample Value</TableCell>
                          <TableCell align="right">Theoretical Value</TableCell>
                          <TableCell align="right">Difference</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Mean</TableCell>
                          <TableCell align="right">{sampleStats.mean.toFixed(4)}</TableCell>
                          <TableCell align="right">
                            {typeof theoreticalValues.mean === 'number' 
                              ? theoreticalValues.mean.toFixed(4) 
                              : theoreticalValues.mean}
                          </TableCell>
                          <TableCell align="right">
                            {typeof theoreticalValues.mean === 'number' 
                              ? (sampleStats.mean - theoreticalValues.mean).toFixed(4) 
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Standard Deviation</TableCell>
                          <TableCell align="right">{sampleStats.stdDev.toFixed(4)}</TableCell>
                          <TableCell align="right">
                            {typeof theoreticalValues.stdDev === 'number' 
                              ? theoreticalValues.stdDev.toFixed(4) 
                              : theoreticalValues.stdDev}
                          </TableCell>
                          <TableCell align="right">
                            {typeof theoreticalValues.stdDev === 'number' 
                              ? (sampleStats.stdDev - theoreticalValues.stdDev).toFixed(4) 
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Median</TableCell>
                          <TableCell align="right">{sampleStats.median.toFixed(4)}</TableCell>
                          <TableCell align="right">
                            {typeof theoreticalValues.median === 'number' 
                              ? theoreticalValues.median.toFixed(4) 
                              : theoreticalValues.median}
                          </TableCell>
                          <TableCell align="right">
                            {typeof theoreticalValues.median === 'number' 
                              ? (sampleStats.median - theoreticalValues.median).toFixed(4) 
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Sample Summary
                      </Typography>
                      
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Count</Typography>
                          <Typography variant="body2">{sampleStats.count}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Range</Typography>
                          <Typography variant="body2">{sampleStats.min.toFixed(2)} - {sampleStats.max.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">25th Percentile</Typography>
                          <Typography variant="body2">{sampleStats.p25.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">75th Percentile</Typography>
                          <Typography variant="body2">{sampleStats.p75.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">IQR</Typography>
                          <Typography variant="body2">{(sampleStats.p75 - sampleStats.p25).toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Sum</Typography>
                          <Typography variant="body2">{sampleStats.sum.toFixed(4)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Law of Large Numbers: As the sample size increases, the sample mean gets closer to the theoretical mean.
                      Try increasing the sample size to see this effect.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Interpretation
              </Typography>
              <Typography variant="body2">
                {getSampleInterpretation(
                  distributionType, 
                  parameters, 
                  sampleStats, 
                  theoreticalValues, 
                  sampleSize
                )}
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper function to generate interpretation text
const getSampleInterpretation = (distributionType, parameters, sampleStats, theoreticalValues, sampleSize) => {
  if (!sampleStats || !theoreticalValues) return '';
  
  const meanDiff = typeof theoreticalValues.mean === 'number'
    ? Math.abs(sampleStats.mean - theoreticalValues.mean)
    : null;
  
  const stdDevDiff = typeof theoreticalValues.stdDev === 'number'
    ? Math.abs(sampleStats.stdDev - theoreticalValues.stdDev)
    : null;
  
  const relMeanError = meanDiff !== null && theoreticalValues.mean !== 0
    ? (meanDiff / Math.abs(theoreticalValues.mean)) * 100
    : null;
  
  const relStdDevError = stdDevDiff !== null && theoreticalValues.stdDev !== 0
    ? (stdDevDiff / theoreticalValues.stdDev) * 100
    : null;
  
  // Basic interpretation based on sample size and accuracy
  let interpretation = `This sample of ${sampleSize} random values from the ${distributionType ? distributionType.toLowerCase() : 'probability'} distribution `;
  
  if (relMeanError !== null) {
    if (relMeanError < 1) {
      interpretation += `has a sample mean very close to the theoretical mean (${relMeanError.toFixed(2)}% difference). `;
    } else if (relMeanError < 5) {
      interpretation += `has a sample mean reasonably close to the theoretical mean (${relMeanError.toFixed(2)}% difference). `;
    } else {
      interpretation += `has a sample mean that differs from the theoretical mean by ${relMeanError.toFixed(2)}%. `;
    }
  }
  
  if (relStdDevError !== null) {
    if (relStdDevError < 5) {
      interpretation += `The sample variability is very similar to what we'd expect theoretically (${relStdDevError.toFixed(2)}% difference in standard deviation).`;
    } else if (relStdDevError < 15) {
      interpretation += `The sample shows moderate variation from the expected theoretical variability (${relStdDevError.toFixed(2)}% difference in standard deviation).`;
    } else {
      interpretation += `The sample shows considerable variation from the expected theoretical variability (${relStdDevError.toFixed(2)}% difference in standard deviation).`;
    }
  }
  
  // Add information specific to the distribution type
  switch (distributionType) {
    case 'NORMAL':
      interpretation += ` With a normal distribution, we expect about 68% of values to fall within ±1 standard deviation of the mean, and about 95% within ±2 standard deviations.`;
      break;
    
    case 'BINOMIAL':
      if (parameters.p < 0.3 || parameters.p > 0.7) {
        interpretation += ` This binomial distribution with p=${parameters.p} is skewed, which is reflected in the difference between the mean and median in your sample.`;
      } else {
        interpretation += ` This binomial distribution with p=${parameters.p} is approximately symmetric for large n.`;
      }
      break;
    
    case 'POISSON':
      interpretation += ` For a Poisson distribution, the variance equals the mean (λ=${parameters.lambda}), which you can verify in your sample statistics.`;
      break;
    
    case 'EXPONENTIAL':
      interpretation += ` The exponential distribution is highly skewed, with most values clustered near zero and a long tail to the right.`;
      break;
    
    case 'UNIFORM':
      interpretation += ` The uniform distribution has equal probability across its range from ${parameters.a} to ${parameters.b}, resulting in a flat histogram.`;
      break;
  }
  
  // Add note about sample size if small
  if (sampleSize < 50) {
    interpretation += ` Note that with only ${sampleSize} samples, substantial random variation is expected. Try increasing the sample size to see the distribution converge closer to theoretical expectations.`;
  }
  
  return interpretation;
};

export default RandomSampleGenerator;