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
  Tooltip,
  Card,
  CardContent,
  Divider
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
  LineChart,
  Line,
  ReferenceLine,
  ComposedChart
} from 'recharts';
import axios from 'axios';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { runCoverageSimulation } from '../../../utils/simulationUtils';

/**
 * Coverage Properties Simulation component
 * This component demonstrates the actual coverage probability of different confidence interval methods
 */
const CoverageSimulation = ({ projectId }) => {
  // States for simulation parameters
  const [intervalType, setIntervalType] = useState('MEAN_T');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [sampleSize, setSampleSize] = useState(30);
  const [numSimulations, setNumSimulations] = useState(1000);
  const [distributionType, setDistributionType] = useState('NORMAL');
  const [distributionParams, setDistributionParams] = useState({
    mean: 0,
    std: 1,
    df: 5,
    shape: 1,
    scale: 1,
    p: 0.5,
    lambda: 1
  });
  const [additionalOptions, setAdditionalOptions] = useState({
    method: 'WILSON', // For proportion intervals
    equivariance: false, // For variance intervals
    equal_variances: false // For difference of means
  });

  // States for simulation status and results
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('idle');

  // Parameter options for different interval types
  const intervalOptions = [
    { value: 'MEAN_T', label: 'Mean (t-interval, unknown variance)' },
    { value: 'MEAN_Z', label: 'Mean (z-interval, known variance)' },
    { value: 'PROPORTION_WALD', label: 'Proportion (Wald)' },
    { value: 'PROPORTION_WILSON', label: 'Proportion (Wilson)' },
    { value: 'PROPORTION_CLOPPER_PEARSON', label: 'Proportion (Clopper-Pearson)' },
    { value: 'VARIANCE', label: 'Variance' },
    { value: 'STD_DEV', label: 'Standard Deviation' },
    { value: 'DIFFERENCE_MEANS', label: 'Difference of Means' },
    { value: 'DIFFERENCE_PROPORTIONS', label: 'Difference of Proportions' }
  ];

  const distributionOptions = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'T', label: 'Student\'s t' },
    { value: 'LOGNORMAL', label: 'Log-normal' },
    { value: 'GAMMA', label: 'Gamma' },
    { value: 'UNIFORM', label: 'Uniform' },
    { value: 'BINOMIAL', label: 'Binomial' },
    { value: 'POISSON', label: 'Poisson' },
    { value: 'MIXTURE', label: 'Mixture (Bimodal)' }
  ];

  const proportionMethodOptions = [
    { value: 'WALD', label: 'Wald' },
    { value: 'WILSON', label: 'Wilson Score' },
    { value: 'CLOPPER_PEARSON', label: 'Clopper-Pearson (Exact)' }
  ];

  // No WebSocket needed - simulations run client-side

  // Handle parameter changes
  const handleIntervalTypeChange = (event) => {
    setIntervalType(event.target.value);
    
    // Reset method if changing away from proportion
    if (!event.target.value.includes('PROPORTION')) {
      setAdditionalOptions({
        ...additionalOptions,
        method: 'WILSON'
      });
    }
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

  const handleNumSimulationsChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0) {
      setNumSimulations(value);
    }
  };

  const handleDistributionTypeChange = (event) => {
    setDistributionType(event.target.value);
  };

  const handleDistributionParamChange = (param, value) => {
    setDistributionParams({
      ...distributionParams,
      [param]: value
    });
  };

  const handleAdditionalOptionChange = (option, value) => {
    setAdditionalOptions({
      ...additionalOptions,
      [option]: value
    });
  };

  // Run the simulation (projectId no longer required - simulations work client-side)
  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setSimulationStatus('starting');

    try {
      // Prepare distribution parameters
      let distParams = {};
      switch (distributionType) {
        case 'NORMAL':
          distParams = {
            mean: distributionParams.mean,
            std: distributionParams.std
          };
          break;
        case 'T':
          distParams = {
            df: distributionParams.df,
            mean: distributionParams.mean,
            std: distributionParams.std
          };
          break;
        case 'LOGNORMAL':
          distParams = {
            mean: distributionParams.mean,
            sigma: distributionParams.std
          };
          break;
        case 'GAMMA':
          distParams = {
            shape: distributionParams.shape,
            scale: distributionParams.scale
          };
          break;
        case 'BINOMIAL':
          distParams = {
            n: sampleSize,
            p: distributionParams.p
          };
          break;
        case 'POISSON':
          distParams = {
            lambda: distributionParams.lambda,
            mean: distributionParams.mean,
            std: distributionParams.std
          };
          break;
        case 'MIXTURE':
          distParams = {
            means: [distributionParams.mean - 2, distributionParams.mean + 2],
            stds: [distributionParams.std, distributionParams.std],
            weights: [0.5, 0.5],
            mean: distributionParams.mean,
            std: distributionParams.std
          };
          break;
        case 'UNIFORM':
          distParams = {
            mean: distributionParams.mean,
            std: distributionParams.std
          };
          break;
        default:
          distParams = {
            mean: distributionParams.mean,
            std: distributionParams.std
          };
      }

      // Run the simulation client-side
      setSimulationStatus('running');
      const simulationResults = await runCoverageSimulation(
        {
          intervalType,
          confidenceLevel,
          sampleSize,
          numSimulations,
          distribution: distributionType,
          distParams
        },
        (progressValue) => {
          setProgress(progressValue);
        }
      );

      // Process results for visualization
      setResult({
        coverage: simulationResults.coverage,
        averageWidth: simulationResults.averageWidth,
        trueValue: simulationResults.trueValue,
        intervals: simulationResults.intervals,
        nominalCoverage: confidenceLevel
      });

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
              <Typography gutterBottom>Log-Mean (μ)</Typography>
              <Slider
                value={distributionParams.mean}
                onChange={(e, value) => handleDistributionParamChange('mean', value)}
                min={-2}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Log-Standard Deviation (σ)</Typography>
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
              <Typography gutterBottom>Shape (α)</Typography>
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
              <Typography gutterBottom>Scale (β)</Typography>
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
      case 'BINOMIAL':
        return (
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Success Probability (p)</Typography>
            <Slider
              value={distributionParams.p}
              onChange={(e, value) => handleDistributionParamChange('p', value)}
              min={0.01}
              max={0.99}
              step={0.01}
              valueLabelDisplay="auto"
              disabled={loading}
            />
          </Grid>
        );
      case 'POISSON':
        return (
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Rate Parameter (λ)</Typography>
            <Slider
              value={distributionParams.lambda}
              onChange={(e, value) => handleDistributionParamChange('lambda', value)}
              min={0.1}
              max={20}
              step={0.1}
              valueLabelDisplay="auto"
              disabled={loading}
            />
          </Grid>
        );
      case 'MIXTURE':
        return (
          <>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Center (μ)</Typography>
              <Slider
                value={distributionParams.mean}
                onChange={(e, value) => handleDistributionParamChange('mean', value)}
                min={-5}
                max={5}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
              <Typography variant="caption">
                The mixture will use two components at μ±2
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Component Std Dev (σ)</Typography>
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
      default:
        return null;
    }
  };

  // Render additional options based on interval type
  const renderAdditionalOptions = () => {
    if (intervalType.includes('PROPORTION')) {
      return (
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="proportion-method-label">Proportion Method</InputLabel>
            <Select
              labelId="proportion-method-label"
              id="proportion-method-select"
              value={additionalOptions.method}
              label="Proportion Method"
              onChange={(e) => handleAdditionalOptionChange('method', e.target.value)}
              disabled={loading}
            >
              {proportionMethodOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      );
    } else if (intervalType === 'VARIANCE' || intervalType === 'STD_DEV') {
      return (
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="equivariance-label">Use Equivariance</InputLabel>
            <Select
              labelId="equivariance-label"
              id="equivariance-select"
              value={additionalOptions.equivariance ? 'true' : 'false'}
              label="Use Equivariance"
              onChange={(e) => handleAdditionalOptionChange('equivariance', e.target.value === 'true')}
              disabled={loading}
            >
              <MenuItem value="true">Yes (transform CI from variance)</MenuItem>
              <MenuItem value="false">No (direct calculation)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      );
    } else if (intervalType === 'DIFFERENCE_MEANS') {
      return (
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="equal-variances-label">Variance Assumption</InputLabel>
            <Select
              labelId="equal-variances-label"
              id="equal-variances-select"
              value={additionalOptions.equal_variances ? 'true' : 'false'}
              label="Variance Assumption"
              onChange={(e) => handleAdditionalOptionChange('equal_variances', e.target.value === 'true')}
              disabled={loading}
            >
              <MenuItem value="true">Equal Variances (Pooled)</MenuItem>
              <MenuItem value="false">Unequal Variances (Welch's)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      );
    } else {
      return null;
    }
  };

  // Function to render the simulation results
  const renderResults = () => {
    if (!result) return null;

    // Prepare the data for the coverage chart
    const coverageChartData = [
      { name: 'Actual', value: result.coverage * 100 },
      { name: 'Nominal', value: confidenceLevel * 100 }
    ];

    // Prepare data for the interval widths histogram (not used in current client-side implementation)
    const widthsData = [];

    // Calculate coverage difference for display
    const coverageDiff = (result.coverage * 100) - (confidenceLevel * 100);
    const coverageQuality =
      Math.abs(coverageDiff) < 2 ? 'excellent' :
      Math.abs(coverageDiff) < 5 ? 'good' : 'poor';

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Simulation Results
        </Typography>
        
        {/* Coverage comparison */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Coverage Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={coverageChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    domain={[
                      Math.min(confidenceLevel * 100 * 0.9, result.coverage * 100 * 0.9),
                      Math.max(confidenceLevel * 100 * 1.05, result.coverage * 100 * 1.05)
                    ]}
                    label={{ value: 'Coverage (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <RechartsTooltip />
                  <Bar 
                    dataKey="value" 
                    fill={coverageQuality === 'excellent' ? '#4caf50' : 
                           coverageQuality === 'good' ? '#ff9800' : '#f44336'}
                  />
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Actual Coverage:</strong> {(result.coverage * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2">
                <strong>Nominal Coverage:</strong> {(confidenceLevel * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2">
                <strong>Difference:</strong> {coverageDiff > 0 ? '+' : ''}{coverageDiff.toFixed(1)} percentage points
              </Typography>
            </Paper>
          </Grid>
          
          {/* Interval widths histogram */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Interval Widths Distribution
              </Typography>
              {result.width_histogram ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={widthsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      label={{ value: 'Interval Width', position: 'insideBottom', offset: -5 }} 
                    />
                    <YAxis 
                      label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} 
                    />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#3f51b5" />
                    <ReferenceLine 
                      x={result.mean_interval_width.toFixed(2)}
                      stroke="#e91e63" 
                      strokeWidth={2}
                      label={{ value: 'Mean', position: 'top', fill: '#e91e63' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Width histogram data not available
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Average Interval Width:</strong> {result.averageWidth.toFixed(4)}
              </Typography>
              <Typography variant="body2">
                <strong>Number of Simulations:</strong> {numSimulations}
              </Typography>
              <Typography variant="body2">
                <strong>True Parameter Value:</strong> {result.trueValue.toFixed(4)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Simulation details and interpretation */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Interpretation
          </Typography>
          
          <Typography paragraph>
            The simulation results show that the {intervalOptions.find(opt => opt.value === intervalType)?.label} 
            confidence interval has {coverageQuality} coverage properties under the specified conditions:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Simulation Parameters</Typography>
                <Typography variant="body2">
                  <strong>Interval Type:</strong> {intervalOptions.find(opt => opt.value === intervalType)?.label}
                </Typography>
                <Typography variant="body2">
                  <strong>Sample Size:</strong> {sampleSize}
                </Typography>
                <Typography variant="body2">
                  <strong>Confidence Level:</strong> {(confidenceLevel * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2">
                  <strong>Distribution:</strong> {distributionOptions.find(opt => opt.value === distributionType)?.label}
                </Typography>
                <Typography variant="body2">
                  <strong>Number of Simulations:</strong> {numSimulations}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Key Results</Typography>
                <Typography variant="body2">
                  <strong>Actual Coverage:</strong> {(result.coverage * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  <strong>Coverage Quality:</strong> {coverageQuality.charAt(0).toUpperCase() + coverageQuality.slice(1)}
                </Typography>
                <Typography variant="body2">
                  <strong>Average Width:</strong> {result.averageWidth.toFixed(4)}
                </Typography>
                <Typography variant="body2">
                  <strong>Number of Intervals Containing True Parameter:</strong> {Math.round(result.coverage * numSimulations)}
                  out of {numSimulations}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Method-specific interpretation */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Method-Specific Insights</Typography>
            
            {intervalType.startsWith('MEAN_T') && (
              <Typography variant="body2" paragraph>
                The t-interval generally provides {coverageQuality} coverage when the underlying data is 
                {distributionType === 'NORMAL' ? ' normally distributed' : 
                  distributionType === 'T' ? ' t-distributed' : 
                  ' not normally distributed'}. {
                  distributionType !== 'NORMAL' && distributionType !== 'T' ? 
                  'The t-interval is somewhat robust to non-normality, especially for larger sample sizes, but may not provide accurate coverage for heavily skewed or heavy-tailed distributions.' :
                  'For normal data, the t-interval provides optimal coverage.'
                }
              </Typography>
            )}
            
            {intervalType === 'MEAN_Z' && (
              <Typography variant="body2" paragraph>
                The z-interval assumes that the population variance is known. In practice, this variance is often estimated,
                which can lead to undercoverage. The z-interval is most appropriate when the population standard deviation
                is truly known or the sample size is very large.
              </Typography>
            )}
            
            {intervalType.includes('PROPORTION') && (
              <Typography variant="body2" paragraph>
                {additionalOptions.method === 'WALD' ? 
                  'The Wald interval for proportions is known to have poor coverage for small sample sizes or extreme proportions (near 0 or 1). It tends to have actual coverage below the nominal level.' :
                  additionalOptions.method === 'WILSON' ?
                  'The Wilson score interval generally has better coverage properties than the Wald interval, especially for small samples and extreme proportions.' :
                  'The Clopper-Pearson interval is guaranteed to have coverage at least equal to the nominal level, but is often conservative (wider than necessary).'
                } For your simulation with sample size {sampleSize}, the method showed {coverageQuality} performance.
              </Typography>
            )}
            
            {(intervalType === 'VARIANCE' || intervalType === 'STD_DEV') && (
              <Typography variant="body2" paragraph>
                The chi-square-based interval for {intervalType === 'VARIANCE' ? 'variance' : 'standard deviation'} is
                highly sensitive to departures from normality. {
                  distributionType === 'NORMAL' ? 
                  'For normal data, the interval provides exact coverage.' :
                  'For non-normal data, the actual coverage can differ substantially from the nominal level.'
                } The transformation from variance to standard deviation can affect coverage properties, particularly for small samples.
              </Typography>
            )}
            
            {intervalType === 'DIFFERENCE_MEANS' && (
              <Typography variant="body2" paragraph>
                The interval for difference of means uses {additionalOptions.equal_variances ? 'the pooled variance approach, which assumes equal variances' : 'the Welch approximation, which allows for unequal variances'}. 
                {additionalOptions.equal_variances ? 
                  ' This method is more powerful when variances are truly equal but can lead to poor coverage when they differ substantially.' : 
                  ' This method is more robust to variance heterogeneity but may be slightly less efficient when variances are equal.'
                }
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <MathJaxContext>
      <Box>
        <Typography variant="h6" gutterBottom>
          Coverage Properties Simulation
        </Typography>
        
        <Typography paragraph>
          This simulation allows you to explore how well different confidence interval methods achieve 
          their nominal coverage level under various conditions.
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
            {/* Interval type selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="interval-type-label">Interval Type</InputLabel>
                <Select
                  labelId="interval-type-label"
                  id="interval-type-select"
                  value={intervalType}
                  label="Interval Type"
                  onChange={handleIntervalTypeChange}
                  disabled={loading}
                >
                  {intervalOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Distribution type selection */}
            <Grid item xs={12} sm={6}>
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
            
            {/* Additional options based on interval type */}
            {renderAdditionalOptions()}
            
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
            
            {/* Sample size and number of simulations */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sample Size"
                type="number"
                value={sampleSize}
                onChange={handleSampleSizeChange}
                InputProps={{
                  inputProps: { min: 2, max: 1000 }
                }}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Number of Simulations"
                type="number"
                value={numSimulations}
                onChange={handleNumSimulationsChange}
                InputProps={{
                  inputProps: { min: 100, max: 10000 }
                }}
                disabled={loading}
                helperText="More simulations = more accurate results but longer runtime"
              />
            </Grid>
            
            {/* Distribution parameters */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Distribution Parameters
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
              {simulationStatus === 'running' && `Running simulation (${Math.floor(numSimulations * progress / 100)} of ${numSimulations} iterations completed)`}
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
            The coverage probability of a confidence interval is the proportion of times that the interval 
            contains the true parameter value when the procedure is repeated on multiple samples. For a 
            $(1-\alpha)$ confidence interval, the ideal coverage probability is $1-\alpha$.
          </Typography>
          
          <MathJax>
            {"$$\\text{Coverage Probability} = P(L(X) \\leq \\theta \\leq U(X))$$"}
          </MathJax>
          
          <Typography paragraph sx={{ mt: 2 }}>
            For a simulation with $n$ samples, we can estimate the coverage probability as:
          </Typography>
          
          <MathJax>
            {"$$\\text{Estimated Coverage} = \\frac{\\text{Number of intervals containing } \\theta}{\\text{Total number of intervals}}$$"}
          </MathJax>
          
          <Box sx={{ mt: 3 }}>
            <Divider />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Key Properties of Different Interval Methods
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      t-intervals (Mean, Unknown Variance)
                    </Typography>
                    <Typography variant="body2">
                      • Exact coverage for normal data, any sample size
                    </Typography>
                    <Typography variant="body2">
                      • Moderately robust to non-normality
                    </Typography>
                    <Typography variant="body2">
                      • Width proportional to 1/√{sampleSize}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Proportion Intervals
                    </Typography>
                    <Typography variant="body2">
                      • Wald: Simple but poor coverage for small n or extreme p
                    </Typography>
                    <Typography variant="body2">
                      • Wilson: Better coverage, especially for small samples
                    </Typography>
                    <Typography variant="body2">
                      • Clopper-Pearson: Guaranteed coverage but conservative
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Variance Intervals
                    </Typography>
                    <Typography variant="body2">
                      • Requires normality for accuracy
                    </Typography>
                    <Typography variant="body2">
                      • Often asymmetric around point estimate
                    </Typography>
                    <Typography variant="body2">
                      • Transformation (e.g., to std dev) affects coverage
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </MathJaxContext>
  );
};

CoverageSimulation.propTypes = {
  projectId: PropTypes.string
};

export default CoverageSimulation;