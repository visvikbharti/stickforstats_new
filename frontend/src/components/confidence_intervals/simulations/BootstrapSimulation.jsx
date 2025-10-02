import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  TextField,
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Tooltip,
  RadioGroup,
  Radio,
  FormControlLabel
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Histogram,
  LineChart,
  Line,
  ScatterChart,
  Scatter
} from 'recharts';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { runBootstrapSimulation } from '../../../utils/simulationUtils';

/**
 * Bootstrap Confidence Intervals Simulation component
 * This component demonstrates how bootstrap methods can be used to construct confidence intervals
 * without making parametric assumptions
 */
const BootstrapSimulation = ({ projectId }) => {
  // States for simulation parameters
  const [parameterType, setParameterType] = useState('MEAN');
  const [bootstrapMethod, setBootstrapMethod] = useState('PERCENTILE');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [sampleSize, setSampleSize] = useState(30);
  const [numBootstraps, setNumBootstraps] = useState(2000);
  const [distributionType, setDistributionType] = useState('NORMAL');
  const [distributionParams, setDistributionParams] = useState({
    mean: 0,
    std: 1,
    df: 5,
    shape: 2,
    scale: 1,
    skew: 1,
    location: 0,
    p1: 0.5,
    p2: 0.5,
    mean1: -2,
    mean2: 2,
    std1: 1,
    std2: 1
  });
  const [userDefinedData, setUserDefinedData] = useState('');
  const [useUserData, setUseUserData] = useState(false);

  // States for simulation status and results
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('idle');

  // Parameter options
  const parameterOptions = [
    { value: 'MEAN', label: 'Mean' },
    { value: 'MEDIAN', label: 'Median' },
    { value: 'TRIMMED_MEAN', label: 'Trimmed Mean (10%)' },
    { value: 'STD_DEV', label: 'Standard Deviation' },
    { value: 'IQR', label: 'Interquartile Range' },
    { value: 'CORRELATION', label: 'Correlation' },
    { value: 'SKEWNESS', label: 'Skewness' }
  ];

  const bootstrapMethodOptions = [
    { value: 'PERCENTILE', label: 'Percentile' },
    { value: 'BASIC', label: 'Basic (Reflection)' },
    { value: 'BCA', label: 'BCa (Bias-Corrected and Accelerated)' },
    { value: 'T', label: 'Studentized (t-bootstrap)' }
  ];

  const distributionOptions = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'T', label: 'Student\'s t' },
    { value: 'LOGNORMAL', label: 'Log-normal' },
    { value: 'GAMMA', label: 'Gamma' },
    { value: 'UNIFORM', label: 'Uniform' },
    { value: 'SKEWED', label: 'Skewed' },
    { value: 'MIXTURE', label: 'Mixture (Bimodal)' },
    { value: 'USER', label: 'User-defined' }
  ];


  // Handle parameter changes
  const handleParameterTypeChange = (event) => {
    setParameterType(event.target.value);
  };

  const handleBootstrapMethodChange = (event) => {
    setBootstrapMethod(event.target.value);
  };

  const handleConfidenceLevelChange = (event, newValue) => {
    setConfidenceLevel(newValue);
  };

  const handleSampleSizeChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0) {
      setSampleSize(value);
    }
  };

  const handleNumBootstrapsChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0) {
      setNumBootstraps(value);
    }
  };

  const handleDistributionTypeChange = (event) => {
    setDistributionType(event.target.value);
    if (event.target.value === 'USER') {
      setUseUserData(true);
    } else {
      setUseUserData(false);
    }
  };

  const handleDistributionParamChange = (param, value) => {
    setDistributionParams({
      ...distributionParams,
      [param]: value
    });
  };

  const handleUserDefinedDataChange = (event) => {
    setUserDefinedData(event.target.value);
  };

  // Parse user-defined data to validate format
  const parseUserData = () => {
    if (!userDefinedData.trim()) {
      return { valid: false, message: "Please enter comma-separated numeric values." };
    }
    
    try {
      const values = userDefinedData.split(',')
        .map(val => val.trim())
        .filter(val => val !== '')
        .map(val => {
          const num = parseFloat(val);
          if (isNaN(num)) throw new Error("Invalid number");
          return num;
        });
      
      if (values.length < 5) {
        return { valid: false, message: "Please provide at least 5 data points." };
      }
      
      return { valid: true, data: values };
    } catch (error) {
      return { valid: false, message: "Invalid format. Please enter comma-separated numeric values." };
    }
  };

  // Run the simulation (client-side, no WebSocket required)
  const handleRunSimulation = async () => {
    // Validate user data if selected
    if (useUserData) {
      const parsedData = parseUserData();
      if (!parsedData.valid) {
        setError(parsedData.message);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setProgress(0);
    setSimulationStatus('starting');

    try {
      // Prepare distribution parameters
      let distParams = {};
      switch (distributionType) {
        case 'NORMAL':
          distParams = { mean: distributionParams.mean, std: distributionParams.std };
          break;
        case 'T':
          distParams = { df: distributionParams.df, mean: 0, std: 1 };
          break;
        case 'LOGNORMAL':
          distParams = { mean: distributionParams.location, sigma: distributionParams.std };
          break;
        case 'GAMMA':
          distParams = { shape: distributionParams.shape, scale: distributionParams.scale };
          break;
        case 'UNIFORM':
          distParams = {
            mean: distributionParams.mean,
            std: distributionParams.std
          };
          break;
        case 'MIXTURE':
          distParams = {
            means: [distributionParams.mean1, distributionParams.mean2],
            stds: [distributionParams.std1, distributionParams.std2],
            weights: [distributionParams.p1, 1 - distributionParams.p1]
          };
          break;
        case 'USER':
          // Parse user data
          const parsedData = parseUserData();
          distParams = { userData: parsedData.data };
          break;
        default:
          distParams = { mean: distributionParams.mean, std: distributionParams.std };
      }

      // Run the simulation client-side
      setSimulationStatus('running');
      const simulationResults = await runBootstrapSimulation(
        {
          sampleSize,
          numBootstraps,
          confidenceLevel,
          distribution: distributionType,
          distParams
        },
        (progressValue) => {
          setProgress(progressValue);
        }
      );

      // Process results for visualization - use all properties from simulation
      setResult(simulationResults);

      setSimulationStatus('complete');
      setProgress(100);
      setLoading(false);
    } catch (err) {
      console.error('Simulation error:', err);
      setError(`Simulation failed: ${err.message}`);
      setSimulationStatus('error');
      setLoading(false);
    }
  };

  // Determine which distribution parameters to show based on distribution type
  const renderDistributionParams = () => {
    if (useUserData) {
      return (
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Enter comma-separated values"
            multiline
            rows={4}
            value={userDefinedData}
            onChange={handleUserDefinedDataChange}
            placeholder="e.g., 3.5, 7.2, 9.1, 4.8, 6.3, 5.5, 8.7, 10.2, 4.9, 6.1"
            disabled={loading}
            helperText="Enter at least 5 data points, separated by commas"
          />
        </Grid>
      );
    }

    switch (distributionType) {
      case 'NORMAL':
        return (
          <>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Mean (μ)</Typography>
              <Slider
                value={distributionParams.mean}
                onChange={(e, value) => handleDistributionParamChange('mean', value)}
                min={-10}
                max={10}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Standard Deviation (σ)</Typography>
              <Slider
                value={distributionParams.std}
                onChange={(e, value) => handleDistributionParamChange('std', value)}
                min={0.1}
                max={5}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
          </>
        );
      case 'T':
        return (
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Degrees of Freedom (df)</Typography>
            <Slider
              value={distributionParams.df}
              onChange={(e, value) => handleDistributionParamChange('df', value)}
              min={1}
              max={30}
              step={1}
              valueLabelDisplay="auto"
              disabled={loading}
            />
          </Grid>
        );
      case 'LOGNORMAL':
        return (
          <>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Location (μ)</Typography>
              <Slider
                value={distributionParams.location}
                onChange={(e, value) => handleDistributionParamChange('location', value)}
                min={-2}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Scale (σ)</Typography>
              <Slider
                value={distributionParams.std}
                onChange={(e, value) => handleDistributionParamChange('std', value)}
                min={0.1}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
          </>
        );
      case 'GAMMA':
        return (
          <>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Shape (k)</Typography>
              <Slider
                value={distributionParams.shape}
                onChange={(e, value) => handleDistributionParamChange('shape', value)}
                min={0.1}
                max={10}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Scale (θ)</Typography>
              <Slider
                value={distributionParams.scale}
                onChange={(e, value) => handleDistributionParamChange('scale', value)}
                min={0.1}
                max={5}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
          </>
        );
      case 'SKEWED':
        return (
          <>
            <Grid item xs={12} sm={4}>
              <Typography gutterBottom>Location</Typography>
              <Slider
                value={distributionParams.location}
                onChange={(e, value) => handleDistributionParamChange('location', value)}
                min={-5}
                max={5}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography gutterBottom>Scale</Typography>
              <Slider
                value={distributionParams.scale}
                onChange={(e, value) => handleDistributionParamChange('scale', value)}
                min={0.1}
                max={5}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography gutterBottom>Skewness</Typography>
              <Slider
                value={distributionParams.skew}
                onChange={(e, value) => handleDistributionParamChange('skew', value)}
                min={-5}
                max={5}
                step={0.1}
                valueLabelDisplay="auto"
                marks={[
                  { value: -5, label: 'Left' },
                  { value: 0, label: 'None' },
                  { value: 5, label: 'Right' }
                ]}
                disabled={loading}
              />
            </Grid>
          </>
        );
      case 'MIXTURE':
        return (
          <>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Weight of Component 1 (p₁)</Typography>
              <Slider
                value={distributionParams.p1}
                onChange={(e, value) => handleDistributionParamChange('p1', value)}
                min={0.1}
                max={0.9}
                step={0.05}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Mean of Component 1 (μ₁)</Typography>
              <Slider
                value={distributionParams.mean1}
                onChange={(e, value) => handleDistributionParamChange('mean1', value)}
                min={-5}
                max={5}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Std Dev of Component 1 (σ₁)</Typography>
              <Slider
                value={distributionParams.std1}
                onChange={(e, value) => handleDistributionParamChange('std1', value)}
                min={0.1}
                max={3}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Mean of Component 2 (μ₂)</Typography>
              <Slider
                value={distributionParams.mean2}
                onChange={(e, value) => handleDistributionParamChange('mean2', value)}
                min={-5}
                max={5}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Std Dev of Component 2 (σ₂)</Typography>
              <Slider
                value={distributionParams.std2}
                onChange={(e, value) => handleDistributionParamChange('std2', value)}
                min={0.1}
                max={3}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
          </>
        );
      default:
        return null;
    }
  };

  // Function to render the simulation results
  const renderResults = () => {
    if (!result) return null;

    // Prepare data for bootstrap distribution histogram
    const histogramData = result.bootstrap_histogram.map(bin => ({
      x: bin.bin_center,
      count: bin.count
    }));

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Simulation Results
        </Typography>
        
        {/* Result metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Observed {parameterOptions.find(p => p.value === parameterType)?.label}
              </Typography>
              <Typography variant="h5">
                {result.observed_stat.toFixed(4)}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Bootstrap Mean
              </Typography>
              <Typography variant="h5">
                {result.bootstrap_mean.toFixed(4)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mean of bootstrap distribution
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Bootstrap Standard Error
              </Typography>
              <Typography variant="h5">
                {result.bootstrap_se.toFixed(4)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Standard deviation of bootstrap distribution
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Bias
              </Typography>
              <Typography variant="h5">
                {(result.bootstrap_mean - result.observed_stat).toFixed(4)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Difference between bootstrap mean and observed statistic
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Confidence interval results */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {(confidenceLevel * 100).toFixed(0)}% Bootstrap Confidence Interval ({
              bootstrapMethod === 'PERCENTILE' ? 'Percentile Method' :
              bootstrapMethod === 'BASIC' ? 'Basic Bootstrap Method' :
              bootstrapMethod === 'BCA' ? 'BCa Method' : 'Studentized Method'
            })
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Lower Bound:</strong> {result.ci_lower.toFixed(4)}
              </Typography>
              <Typography variant="body2">
                <strong>Upper Bound:</strong> {result.ci_upper.toFixed(4)}
              </Typography>
              <Typography variant="body2">
                <strong>Interval Width:</strong> {(result.ci_upper - result.ci_lower).toFixed(4)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              {result.true_param !== null && (
                <>
                  <Typography variant="body2">
                    <strong>True Parameter Value:</strong> {result.true_param.toFixed(4)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Interval Contains True Value:</strong> {
                      result.ci_lower <= result.true_param && result.true_param <= result.ci_upper 
                        ? 'Yes' : 'No'
                    }
                  </Typography>
                </>
              )}
            </Grid>
          </Grid>
        </Paper>
        
        {/* Bootstrap distribution histogram */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Bootstrap Distribution of {parameterOptions.find(p => p.value === parameterType)?.label}
          </Typography>
          
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={histogramData}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                label={{ value: parameterOptions.find(p => p.value === parameterType)?.label, position: 'insideBottom', offset: -15 }}
              />
              <YAxis 
                label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} 
              />
              <RechartsTooltip formatter={(value, name, props) => [value, 'Frequency']} />
              <Bar dataKey="count" fill="#8884d8" />
              
              {/* Add reference lines for CI bounds */}
              <ReferenceLine 
                x={result.ci_lower} 
                stroke="red" 
                strokeWidth={2} 
                strokeDasharray="3 3"
                label={{ value: 'Lower', position: 'top' }}
              />
              <ReferenceLine 
                x={result.ci_upper} 
                stroke="red" 
                strokeWidth={2} 
                strokeDasharray="3 3"
                label={{ value: 'Upper', position: 'top' }}
              />
              
              {/* Add reference line for observed statistic */}
              <ReferenceLine 
                x={result.observed_stat} 
                stroke="blue" 
                strokeWidth={2}
                label={{ value: 'Observed', position: 'bottom' }}
              />
              
              {/* Add reference line for true parameter if available */}
              {result.true_param !== null && (
                <ReferenceLine 
                  x={result.true_param} 
                  stroke="green" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: 'True', position: 'bottom' }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </Paper>
        
        {/* Bootstrap percentiles table */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Bootstrap Percentiles
          </Typography>
          
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Percentile</th>
                  {result.percentiles.map(p => (
                    <th key={p.percentile} style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                      {p.percentile}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Value</td>
                  {result.percentiles.map(p => (
                    <td key={p.percentile} style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                      {p.value.toFixed(4)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Box>
        </Paper>
        
        {/* Interpretation */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Interpretation
          </Typography>
          
          <Typography paragraph>
            The {bootstrapMethod.toLowerCase()} bootstrap method produced a {(confidenceLevel * 100).toFixed(0)}% confidence 
            interval of [{result.ci_lower.toFixed(4)}, {result.ci_upper.toFixed(4)}] 
            for the {parameterOptions.find(p => p.value === parameterType)?.label.toLowerCase()}.
          </Typography>
          
          <Typography paragraph>
            This interval was constructed using {numBootstraps} bootstrap resamples from the original sample. 
            The bootstrap distribution provides an approximation of the sampling distribution of the
            {parameterOptions.find(p => p.value === parameterType)?.label.toLowerCase()}.
          </Typography>
          
          {result.true_param !== null && (
            <Typography paragraph>
              The true parameter value ({result.true_param.toFixed(4)}) {
                result.ci_lower <= result.true_param && result.true_param <= result.ci_upper
                  ? 'is contained within the confidence interval'
                  : 'is not contained within the confidence interval'
              }.
            </Typography>
          )}
          
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Method-Specific Insights:
          </Typography>
          
          {bootstrapMethod === 'PERCENTILE' && (
            <Typography paragraph>
              The percentile method simply uses the empirical percentiles of the bootstrap distribution
              to define the confidence interval bounds. It is easy to understand and works well when 
              the bootstrap distribution is symmetric around the true parameter value.
              However, it can be biased when the distribution is skewed or the statistic has a 
              non-linear relationship with the parameter.
            </Typography>
          )}
          
          {bootstrapMethod === 'BASIC' && (
            <Typography paragraph>
              The basic bootstrap method (reflection method) reflects the bootstrap distribution 
              around the observed statistic. This can correct for some bias in the percentile method,
              but it may produce bounds outside the parameter space (e.g., negative values for 
              a standard deviation or correlation outside [-1, 1]).
            </Typography>
          )}
          
          {bootstrapMethod === 'BCA' && (
            <Typography paragraph>
              The bias-corrected and accelerated (BCa) method adjusts for both bias and 
              non-constant variance in the bootstrap distribution. It generally provides better 
              coverage than the percentile or basic methods, especially for skewed distributions
              and small sample sizes, but is more computationally intensive.
            </Typography>
          )}
          
          {bootstrapMethod === 'T' && (
            <Typography paragraph>
              The studentized (t-bootstrap) method incorporates an estimate of the standard error
              for each bootstrap sample. This generally provides better coverage than the other 
              methods, particularly for sample means, but requires additional bootstrap samples to
              estimate the standard error, making it the most computationally intensive.
            </Typography>
          )}
          
          {parameterType === 'MEAN' && (
            <Typography paragraph>
              For the mean with normal data, bootstrap intervals are typically similar to the standard
              t-interval. However, the bootstrap really shines with non-normal distributions or more
              complex statistics where analytical intervals are difficult or impossible to derive.
            </Typography>
          )}
          
          {(parameterType === 'MEDIAN' || parameterType === 'TRIMMED_MEAN') && (
            <Typography paragraph>
              For robust statistics like the median or trimmed mean, bootstrap intervals provide a
              reliable alternative to analytical methods, especially with skewed or heavy-tailed data
              where the sampling distribution may be complex.
            </Typography>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <MathJaxContext>
      <Box>
        <Typography variant="h6" gutterBottom>
          Bootstrap Confidence Intervals
        </Typography>
        
        <Typography paragraph>
          Bootstrap methods allow you to construct confidence intervals without making parametric
          assumptions about the distribution of the data. These methods involve resampling with
          replacement from the observed data to estimate the sampling distribution of a statistic.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Simulation parameters form */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Simulation Parameters
          </Typography>
          
          <Grid container spacing={3}>
            {/* Parameter of interest */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="parameter-type-label">Parameter of Interest</InputLabel>
                <Select
                  labelId="parameter-type-label"
                  id="parameter-type-select"
                  value={parameterType}
                  label="Parameter of Interest"
                  onChange={handleParameterTypeChange}
                  disabled={loading}
                >
                  {parameterOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Bootstrap method */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="bootstrap-method-label">Bootstrap Method</InputLabel>
                <Select
                  labelId="bootstrap-method-label"
                  id="bootstrap-method-select"
                  value={bootstrapMethod}
                  label="Bootstrap Method"
                  onChange={handleBootstrapMethodChange}
                  disabled={loading}
                >
                  {bootstrapMethodOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                {bootstrapMethod === 'PERCENTILE' && 'Simple but can be biased for skewed distributions'}
                {bootstrapMethod === 'BASIC' && 'Corrects some bias but may exceed parameter space'}
                {bootstrapMethod === 'BCA' && 'Best coverage for skewed distributions and small samples'}
                {bootstrapMethod === 'T' && 'Best for means, requires more computation'}
              </Typography>
            </Grid>
            
            {/* Confidence level */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography gutterBottom>
                  Confidence Level: {(confidenceLevel * 100).toFixed(0)}%
                </Typography>
                <Slider
                  value={confidenceLevel}
                  onChange={handleConfidenceLevelChange}
                  min={0.8}
                  max={0.99}
                  step={0.01}
                  marks={[
                    { value: 0.8, label: '80%' },
                    { value: 0.9, label: '90%' },
                    { value: 0.95, label: '95%' },
                    { value: 0.99, label: '99%' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={value => `${(value * 100).toFixed(0)}%`}
                  disabled={loading}
                />
              </Box>
            </Grid>
            
            {/* Sample size and number of bootstraps */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sample Size"
                type="number"
                value={sampleSize}
                onChange={handleSampleSizeChange}
                InputProps={{
                  inputProps: { min: 5, max: 1000 }
                }}
                disabled={loading}
                helperText="Size of the original sample"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Number of Bootstrap Samples"
                type="number"
                value={numBootstraps}
                onChange={handleNumBootstrapsChange}
                InputProps={{
                  inputProps: { min: 500, max: 10000 }
                }}
                disabled={loading}
                helperText="More samples = more accurate but slower"
              />
            </Grid>
            
            {/* Distribution type selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="distribution-type-label">Distribution Type</InputLabel>
                <Select
                  labelId="distribution-type-label"
                  id="distribution-type-select"
                  value={distributionType}
                  label="Distribution Type"
                  onChange={handleDistributionTypeChange}
                  disabled={loading}
                >
                  {distributionOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Distribution parameters */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                {useUserData ? 'User-Defined Data' : 'Distribution Parameters'}
              </Typography>
              <Grid container spacing={2}>
                {renderDistributionParams()}
              </Grid>
            </Grid>
            
            {/* Run button */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleRunSimulation}
                disabled={loading}
                fullWidth
                size="large"
                sx={{ mt: 2 }}
              >
                {loading ? 
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} /> 
                    Running Simulation ({progress.toFixed(0)}%)
                  </> : 
                  'Run Simulation'
                }
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Progress bar when simulation is running */}
        {loading && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Simulation Progress
            </Typography>
            <Box sx={{ width: '100%', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {`${Math.round(progress)}%`}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {simulationStatus === 'starting' && 'Starting simulation...'}
              {simulationStatus === 'running' && `Generating bootstrap samples (${numBootstraps} resamples)...`}
              {simulationStatus === 'complete' && 'Simulation complete!'}
            </Typography>
          </Paper>
        )}
        
        {/* Results section */}
        {result && renderResults()}
        
        {/* Mathematical background */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Mathematical Background
          </Typography>
          
          <Typography paragraph>
            Bootstrap confidence intervals are based on resampling with replacement from the observed data
            to approximate the sampling distribution of a statistic without making parametric assumptions.
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Key Bootstrap Methods:
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Percentile Method
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Uses empirical percentiles of the bootstrap distribution:
                    </Typography>
                    <MathJax>
                      {"$$[\\hat{\\theta}^*_{(\\alpha/2)}, \\hat{\\theta}^*_{(1-\\alpha/2)}]$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      Where θ*(q) is the q-th quantile of the bootstrap distribution.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Basic Bootstrap Method
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Based on reflection around the observed statistic:
                    </Typography>
                    <MathJax>
                      {"$$[2\\hat{\\theta} - \\hat{\\theta}^*_{(1-\\alpha/2)}, 2\\hat{\\theta} - \\hat{\\theta}^*_{(\\alpha/2)}]$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      Where <MathJax inline>{"\\hat{\\theta}"}</MathJax> is the observed statistic.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      BCa Method
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Adjusts for bias and non-constant variance using bias-correction factor $z_0$ and acceleration $a$:
                    </Typography>
                    <MathJax>
                      {"$$[\\hat{\\theta}^*_{(\\alpha_1)}, \\hat{\\theta}^*_{(\\alpha_2)}]$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      Where $\alpha_1$ and $\alpha_2$ are adjusted percentiles based on $z_0$ and $a$.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Studentized Method
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Incorporates estimated standard errors from each bootstrap sample:
                    </Typography>
                    <MathJax>
                      {"$$[\\hat{\\theta} - \\hat{t}^*_{(1-\\alpha/2)} \\cdot \\hat{SE}, \\hat{\\theta} - \\hat{t}^*_{(\\alpha/2)} \\cdot \\hat{SE}]$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      Where <MathJax inline>{"\\hat{t}^*"}</MathJax> values are based on studentized bootstrap statistics.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Divider />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              When to Use Bootstrap Methods:
            </Typography>
            <Typography variant="body2" paragraph>
              1. When the sampling distribution is non-normal or unknown
            </Typography>
            <Typography variant="body2" paragraph>
              2. For complex statistics where analytical formulas are unavailable
            </Typography>
            <Typography variant="body2" paragraph>
              3. When sample sizes are small to moderate
            </Typography>
            <Typography variant="body2" paragraph>
              4. For parameters where standard intervals have poor coverage
            </Typography>
          </Box>
        </Paper>
      </Box>
    </MathJaxContext>
  );
};

BootstrapSimulation.propTypes = {
  projectId: PropTypes.string
};

export default BootstrapSimulation;