import React, { useState, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  TextField, 
  Checkbox,
  FormGroup,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  Delete as DeleteIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  ZoomIn as ZoomInIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

import { Line, Bar } from 'react-chartjs-2';
import { MathJax } from 'better-react-mathjax';

import { fitDistribution } from '../../api/probabilityDistributionsApi';

// Define the distributions to fit
const DISTRIBUTIONS_TO_FIT = [
  { value: 'NORMAL', label: 'Normal', selected: true },
  { value: 'LOGNORMAL', label: 'Log-Normal', selected: true },
  { value: 'EXPONENTIAL', label: 'Exponential', selected: true },
  { value: 'GAMMA', label: 'Gamma', selected: true },
  { value: 'BETA', label: 'Beta', selected: false },
  { value: 'WEIBULL', label: 'Weibull', selected: false },
  { value: 'UNIFORM', label: 'Uniform', selected: false },
  { value: 'POISSON', label: 'Poisson', selected: false },
  { value: 'BINOMIAL', label: 'Binomial', selected: false }
];

const DataFitting = ({ projectId }) => {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [distributionsToFit, setDistributionsToFit] = useState(DISTRIBUTIONS_TO_FIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fittingResults, setFittingResults] = useState(null);
  const [showAllDistributions, setShowAllDistributions] = useState(false);
  const [dataName, setDataName] = useState('');
  const [dataDescription, setDataDescription] = useState('');
  
  const chartRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();
  
  // Handle file upload with drag and drop
  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];
    if (file) {
      setFileName(file.name);
      
      // Auto-set dataset name based on file name
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setDataName(nameWithoutExtension);
      
      // Parse CSV file
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            // Try to find a numeric column to use for fitting
            const headers = Object.keys(results.data[0]);
            const numericColumns = headers.filter(header => 
              results.data.some(row => typeof row[header] === 'number')
            );
            
            if (numericColumns.length === 0) {
              setError('No numeric columns found in the data file');
              return;
            }
            
            // Use the first numeric column
            const columnToUse = numericColumns[0];
            
            // Extract numeric values and filter out undefined, null, or NaN
            const numericData = results.data
              .map(row => row[columnToUse])
              .filter(value => value !== undefined && value !== null && !isNaN(value));
            
            if (numericData.length === 0) {
              setError('No valid numeric data found in the selected column');
              return;
            }
            
            setData(numericData);
            setError(null);
            
            // Set description with basic stats
            const min = Math.min(...numericData);
            const max = Math.max(...numericData);
            const count = numericData.length;
            const mean = numericData.reduce((sum, val) => sum + val, 0) / count;
            
            setDataDescription(
              `${count} observations from column "${columnToUse}" (range: ${min.toFixed(2)} to ${max.toFixed(2)}, mean: ${mean.toFixed(2)})`
            );
          } else {
            setError('No data found in the file');
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setError('Error parsing CSV file. Make sure it is a valid CSV file.');
        }
      });
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });
  
  // Handle manual data input
  const handleManualDataInput = (event) => {
    const inputText = event.target.value;
    
    // Parse comma or space separated values, newlines, etc.
    const parsedData = inputText
      .split(/[\s,;\n]+/)
      .map(value => parseFloat(value.trim()))
      .filter(value => !isNaN(value));
    
    if (parsedData.length > 0) {
      setData(parsedData);
      setFileName('Manually entered data');
      
      // Set default name and description
      if (!dataName) {
        setDataName('Manual Data');
      }
      
      // Set description with basic stats
      const min = Math.min(...parsedData);
      const max = Math.max(...parsedData);
      const count = parsedData.length;
      const mean = parsedData.reduce((sum, val) => sum + val, 0) / count;
      
      setDataDescription(
        `${count} manually entered values (range: ${min.toFixed(2)} to ${max.toFixed(2)}, mean: ${mean.toFixed(2)})`
      );
      
      setError(null);
    } else {
      setError('No valid numeric data entered');
    }
  };
  
  // Handle distribution selection
  const handleDistributionChange = (index) => {
    const updatedDistributions = distributionsToFit.map((dist, i) => {
      if (i === index) {
        return { ...dist, selected: !dist.selected };
      }
      return dist;
    });
    
    setDistributionsToFit(updatedDistributions);
  };
  
  // Clear all data
  const handleClearData = () => {
    setData([]);
    setFileName('');
    setDataName('');
    setDataDescription('');
    setFittingResults(null);
    setError(null);
  };
  
  // Fit distributions to the data
  const handleFitDistributions = async () => {
    if (data.length === 0) {
      setError('Please upload or enter data first');
      return;
    }
    
    const selectedDistributions = distributionsToFit
      .filter(dist => dist.selected)
      .map(dist => dist.value);
    
    if (selectedDistributions.length === 0) {
      setError('Please select at least one distribution to fit');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await fitDistribution(data, selectedDistributions);
      setFittingResults(results);
      enqueueSnackbar('Distributions fitted successfully', { variant: 'success' });
    } catch (err) {
      console.error('Error fitting distributions:', err);
      setError('Failed to fit distributions to the data');
      enqueueSnackbar('Error fitting distributions', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Save fitting results to project
  const handleSaveResults = async () => {
    if (!fittingResults || !projectId) {
      return;
    }
    
    if (!dataName.trim()) {
      enqueueSnackbar('Please provide a name for the dataset', { variant: 'warning' });
      return;
    }
    
    setLoading(true);
    
    try {
      // Save results to project
      const selectedDistributions = distributionsToFit
        .filter(dist => dist.selected)
        .map(dist => dist.value);
      
      await fitDistribution(
        data,
        selectedDistributions,
        true, // save = true
        projectId,
        dataName,
        dataDescription
      );
      
      enqueueSnackbar('Fitting results saved to project', { variant: 'success' });
    } catch (err) {
      console.error('Error saving fitting results:', err);
      enqueueSnackbar('Error saving results to project', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare histogram data
  const getHistogramData = () => {
    if (data.length === 0) return null;
    
    // Determine number of bins (Sturges' formula)
    const binCount = Math.ceil(Math.log2(data.length) + 1);
    
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
    
    // Convert to density (normalize the histogram)
    const normalizationFactor = data.length * binWidth;
    const normalizedBins = bins.map(count => count / normalizationFactor);
    
    return {
      labels,
      values: normalizedBins,
      binWidth
    };
  };
  
  // Prepare chart data
  const getChartData = () => {
    if (data.length === 0) return null;
    
    const histogramData = getHistogramData();
    
    if (!histogramData) return null;
    
    // Create datasets array starting with the histogram
    const datasets = [
      {
        type: 'bar',
        label: 'Data Histogram',
        data: histogramData.labels.map((x, i) => ({
          x: x + histogramData.binWidth / 2, // Use center of bin for x-coordinate
          y: histogramData.values[i]
        })),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        barPercentage: 1,
        categoryPercentage: 1
      }
    ];
    
    // Add fitted distributions if available
    if (fittingResults && fittingResults.fitted_distributions) {
      // Determine which distributions to show based on ranking and user preference
      let distributionsToShow = fittingResults.fitted_distributions;
      
      if (!showAllDistributions) {
        // Sort by goodness of fit metric (lower is better)
        distributionsToShow = [...distributionsToShow].sort((a, b) => {
          return a.goodness_of_fit.aic - b.goodness_of_fit.aic;
        });
        
        // Take only the top 3
        distributionsToShow = distributionsToShow.slice(0, 3);
      }
      
      // Colors for different distributions
      const distributionColors = [
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 205, 86, 1)',
        'rgba(201, 203, 207, 1)',
        'rgba(255, 99, 71, 1)',
        'rgba(46, 139, 87, 1)',
        'rgba(106, 90, 205, 1)'
      ];
      
      // Add each fitted distribution
      distributionsToShow.forEach((dist, index) => {
        const color = distributionColors[index % distributionColors.length];
        
        datasets.push({
          type: 'line',
          label: `${dist.distribution_type} Fit`,
          data: dist.pdf_values.map((y, i) => ({
            x: dist.x_values[i],
            y
          })),
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        });
      });
    }
    
    return {
      datasets
    };
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Value'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Density'
        },
        min: 0
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            label += ': ';
            label += context.parsed.y.toFixed(4);
            return label;
          }
        }
      }
    }
  };
  
  // Format goodness of fit metrics for display
  const formatGoodnessOfFit = (metrics) => {
    if (!metrics) return {};
    
    return {
      aic: metrics.aic ? metrics.aic.toFixed(2) : 'N/A',
      bic: metrics.bic ? metrics.bic.toFixed(2) : 'N/A',
      ksDist: metrics.ks_distance ? metrics.ks_distance.toFixed(4) : 'N/A',
      ksPvalue: metrics.ks_pvalue ? metrics.ks_pvalue.toFixed(4) : 'N/A'
    };
  };
  
  // Calculate basic statistics from the data
  const calculateBasicStats = () => {
    if (data.length === 0) return null;
    
    const n = data.length;
    const sortedData = [...data].sort((a, b) => a - b);
    const min = sortedData[0];
    const max = sortedData[n - 1];
    const sum = sortedData.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    // Calculate variance
    const variance = sortedData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Calculate median
    const median = n % 2 === 0
      ? (sortedData[n / 2 - 1] + sortedData[n / 2]) / 2
      : sortedData[Math.floor(n / 2)];
    
    // Calculate quartiles
    const q1 = sortedData[Math.floor(n * 0.25)];
    const q3 = sortedData[Math.floor(n * 0.75)];
    
    // Calculate skewness (simplest method)
    const skewness = sortedData.reduce((a, b) => a + Math.pow(b - mean, 3), 0) / (n * Math.pow(stdDev, 3));
    
    // Calculate kurtosis (simplest method)
    const kurtosis = sortedData.reduce((a, b) => a + Math.pow(b - mean, 4), 0) / (n * Math.pow(variance, 2)) - 3;
    
    return {
      count: n,
      min: min,
      max: max,
      mean: mean,
      median: median,
      variance: variance,
      stdDev: stdDev,
      q1: q1,
      q3: q3,
      skewness: skewness,
      kurtosis: kurtosis
    };
  };
  
  const basicStats = calculateBasicStats();
  const chartData = getChartData();
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Distribution Fitting
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Data Input
            </Typography>
            
            <Box {...getRootProps()} sx={{ 
              p: 2, 
              border: '2px dashed #ccc', 
              borderRadius: 1, 
              textAlign: 'center',
              mb: 2,
              cursor: 'pointer',
              bgcolor: isDragActive ? 'rgba(0, 0, 0, 0.05)' : 'inherit',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.05)'
              }
            }}>
              <input {...getInputProps()} />
              <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="body1" gutterBottom>
                Drag & drop a CSV file here, or click to select a file
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Only CSV files are accepted. The first numerical column will be used for fitting.
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Or enter data manually:
            </Typography>
            
            <TextField
              label="Enter values (comma, space, or newline separated)"
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              onChange={handleManualDataInput}
              placeholder="e.g., 1.2, 3.4, 5.6, 7.8, 9.1"
              sx={{ mb: 2 }}
            />
            
            {fileName && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Data source:
                </Typography>
                <Chip label={fileName} size="small" />
                <IconButton size="small" onClick={handleClearData} sx={{ ml: 1 }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {data.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="Dataset Name"
                  value={dataName}
                  onChange={(e) => setDataName(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  label="Description (optional)"
                  value={dataDescription}
                  onChange={(e) => setDataDescription(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                />
              </Box>
            )}
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Distributions to Fit
            </Typography>
            
            <FormGroup>
              <Grid container spacing={1}>
                {distributionsToFit.map((dist, index) => (
                  <Grid item xs={6} key={dist.value}>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          checked={dist.selected} 
                          onChange={() => handleDistributionChange(index)}
                          disabled={loading}
                        />
                      }
                      label={dist.label}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleFitDistributions}
                disabled={loading || data.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Fitting...' : 'Fit Distributions'}
              </Button>
              
              {projectId && fittingResults && (
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveResults}
                  disabled={loading}
                >
                  Save to Project
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 400, position: 'relative' }}>
            <Typography variant="subtitle1" gutterBottom>
              Data Visualization
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
              </Box>
            ) : data.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Upload or enter data to visualize distribution fitting
                </Typography>
              </Box>
            ) : chartData ? (
              <Box sx={{ height: 350 }}>
                <Line data={chartData} options={chartOptions} ref={chartRef} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Error generating chart
                </Typography>
              </Box>
            )}
          </Paper>
          
          {basicStats && (
            <Paper sx={{ p: 2, mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardHeader 
                      title="Basic Statistics" 
                      titleTypographyProps={{ variant: 'subtitle2' }}
                    />
                    <Divider />
                    <CardContent sx={{ pt: 1 }}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Sample Size</Typography>
                          <Typography variant="body2">{basicStats.count}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Range</Typography>
                          <Typography variant="body2">{basicStats.min.toFixed(2)} - {basicStats.max.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Mean</Typography>
                          <Typography variant="body2">{basicStats.mean.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Median</Typography>
                          <Typography variant="body2">{basicStats.median.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Std Dev</Typography>
                          <Typography variant="body2">{basicStats.stdDev.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Variance</Typography>
                          <Typography variant="body2">{basicStats.variance.toFixed(4)}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardHeader 
                      title="Shape Metrics" 
                      titleTypographyProps={{ variant: 'subtitle2' }}
                    />
                    <Divider />
                    <CardContent sx={{ pt: 1 }}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Q1 (25%)</Typography>
                          <Typography variant="body2">{basicStats.q1.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Q3 (75%)</Typography>
                          <Typography variant="body2">{basicStats.q3.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">IQR</Typography>
                          <Typography variant="body2">{(basicStats.q3 - basicStats.q1).toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Skewness</Typography>
                          <Typography variant="body2">{basicStats.skewness.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Kurtosis</Typography>
                          <Typography variant="body2">{basicStats.kurtosis.toFixed(4)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Likely Shape</Typography>
                          <Typography variant="body2">
                            {basicStats.skewness < -0.5 ? 'Left-skewed' : 
                             basicStats.skewness > 0.5 ? 'Right-skewed' : 
                             'Approximately symmetric'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          )}
          
          {fittingResults && (
            <Paper sx={{ p: 2, mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  Fitting Results
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={showAllDistributions} 
                      onChange={(e) => setShowAllDistributions(e.target.checked)}
                    />
                  }
                  label="Show all distributions"
                />
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Distribution</TableCell>
                      <TableCell>Parameters</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Akaike Information Criterion - Lower is better">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            AIC
                            <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Bayesian Information Criterion - Lower is better">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            BIC
                            <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Kolmogorov-Smirnov Test P-value - Higher is better">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            K-S P-value
                            <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fittingResults.fitted_distributions
                      // Sort by AIC (lower is better)
                      .sort((a, b) => a.goodness_of_fit.aic - b.goodness_of_fit.aic)
                      .map((dist, index) => {
                        const gof = formatGoodnessOfFit(dist.goodness_of_fit);
                        
                        return (
                          <TableRow 
                            key={dist.distribution_type}
                            sx={{ 
                              bgcolor: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'inherit',
                              display: !showAllDistributions && index > 2 ? 'none' : 'table-row'
                            }}
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{dist.distribution_type}</TableCell>
                            <TableCell>
                              {Object.entries(dist.parameters).map(([key, value]) => (
                                <Box key={key}>
                                  <Typography variant="caption">
                                    {key}: {typeof value === 'number' ? value.toFixed(4) : value}
                                  </Typography>
                                </Box>
                              ))}
                            </TableCell>
                            <TableCell align="right">{gof.aic}</TableCell>
                            <TableCell align="right">{gof.bic}</TableCell>
                            <TableCell align="right">{gof.ksPvalue}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Best Fit Distribution: {fittingResults.fitted_distributions
                    .sort((a, b) => a.goodness_of_fit.aic - b.goodness_of_fit.aic)[0]?.distribution_type}
                </Typography>
                
                <Typography variant="body2">
                  {getDistributionInterpretation(
                    fittingResults.fitted_distributions
                      .sort((a, b) => a.goodness_of_fit.aic - b.goodness_of_fit.aic)[0],
                    basicStats
                  )}
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper function to generate interpretation text based on the best-fitting distribution
const getDistributionInterpretation = (distribution, basicStats) => {
  if (!distribution || !basicStats) return '';
  
  const type = distribution.type || distribution.distribution_type;
  const params = distribution.parameters;
  
  switch (type) {
    case 'NORMAL':
      return `The data appears to follow a Normal distribution with mean μ=${params.mean.toFixed(4)} and standard deviation σ=${params.std.toFixed(4)}. This suggests the data may be generated by a process with natural random variation around a central value.`;
    
    case 'LOGNORMAL':
      return `The data follows a Log-Normal distribution with parameters μ=${params.mean.toFixed(4)} and σ=${params.sigma.toFixed(4)}. This indicates the logarithm of the data follows a normal distribution, which is common for data that cannot be negative and has a right skew (e.g., income, stock prices, biological measurements).`;
    
    case 'EXPONENTIAL':
      return `The data follows an Exponential distribution with rate parameter λ=${params.rate.toFixed(4)} (mean 1/λ=${(1/params.rate).toFixed(4)}). This suggests a process where events occur continuously and independently at a constant average rate, such as time between events in a Poisson process.`;
    
    case 'GAMMA':
      return `The data follows a Gamma distribution with shape parameter k=${params.shape.toFixed(4)} and scale parameter θ=${params.scale.toFixed(4)}. Gamma distributions often describe waiting times or amounts that accumulate over time, such as rainfall amounts or service times.`;
    
    case 'BETA':
      return `The data follows a Beta distribution with parameters α=${params.alpha.toFixed(4)} and β=${params.beta.toFixed(4)}. This distribution is suitable for modeling proportions or probabilities, as it's bounded between 0 and 1.`;
    
    case 'WEIBULL':
      return `The data follows a Weibull distribution with shape parameter k=${params.shape.toFixed(4)} and scale parameter λ=${params.scale.toFixed(4)}. This distribution is often used in reliability engineering and survival analysis, modeling time-to-failure or similar phenomena.`;
    
    case 'POISSON':
      return `The data follows a Poisson distribution with parameter λ=${params.lambda.toFixed(4)}. This suggests the data represents counts of events occurring in a fixed interval of time or space, at a constant average rate and independently of each other.`;
    
    case 'BINOMIAL':
      return `The data follows a Binomial distribution with parameters n=${params.n} and p=${params.p.toFixed(4)}. This suggests the data represents the number of successes in a fixed number of independent trials with the same probability of success.`;
    
    case 'UNIFORM':
      return `The data follows a Uniform distribution between a=${params.a.toFixed(4)} and b=${params.b.toFixed(4)}. This indicates all values within the range are equally likely to occur, suggesting a random process with no central tendency.`;
    
    default:
      return `The best-fitting distribution is ${type}, indicating this model represents the data most accurately based on information criteria (AIC/BIC) and goodness-of-fit tests.`;
  }
};

export default DataFitting;