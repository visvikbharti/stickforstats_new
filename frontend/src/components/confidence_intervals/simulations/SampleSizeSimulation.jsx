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
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  Label
} from 'recharts';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { runSampleSizeSimulation } from '../../../utils/simulationUtils';

/**
 * Sample Size Effects Simulation component
 * This component demonstrates how sample size affects confidence interval width and coverage
 */
const SampleSizeSimulation = ({ projectId }) => {
  // States for simulation parameters
  const [intervalType, setIntervalType] = useState('MEAN_T');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [minSampleSize, setMinSampleSize] = useState(5);
  const [maxSampleSize, setMaxSampleSize] = useState(100);
  const [numSimulations, setNumSimulations] = useState(500);
  const [distributionType, setDistributionType] = useState('NORMAL');
  const [distributionParams, setDistributionParams] = useState({
    mean: 0,
    std: 1,
    df: 5,
    shape: 1,
    scale: 1,
    p: 0.5
  });
  const [additionalOptions, setAdditionalOptions] = useState({
    method: 'WILSON', // For proportion intervals
    sampleSizeStep: 5  // Step size for sample size range
  });

  // States for simulation status and results
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('idle');

  // Parameter options for different interval types
  const intervalOptions = [
    { value: 'MEAN_T', label: 'Mean (t-interval)' },
    { value: 'PROPORTION_WALD', label: 'Proportion (Wald)' },
    { value: 'PROPORTION_WILSON', label: 'Proportion (Wilson)' },
    { value: 'PROPORTION_CLOPPER_PEARSON', label: 'Proportion (Clopper-Pearson)' }
  ];

  const distributionOptions = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'T', label: 'Student\'s t' },
    { value: 'LOGNORMAL', label: 'Log-normal' },
    { value: 'GAMMA', label: 'Gamma' },
    { value: 'BINOMIAL', label: 'Binomial' }
  ];

  const proportionMethodOptions = [
    { value: 'WALD', label: 'Wald' },
    { value: 'WILSON', label: 'Wilson Score' },
    { value: 'CLOPPER_PEARSON', label: 'Clopper-Pearson (Exact)' }
  ];


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

  const handleMinSampleSizeChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0 && value < maxSampleSize) {
      setMinSampleSize(value);
    }
  };

  const handleMaxSampleSizeChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > minSampleSize) {
      setMaxSampleSize(value);
    }
  };

  const handleSampleSizeStepChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value > 0) {
      setAdditionalOptions({
        ...additionalOptions,
        sampleSizeStep: value
      });
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

  const handleMethodChange = (event) => {
    setAdditionalOptions({
      ...additionalOptions,
      method: event.target.value
    });
  };

  // Run the simulation (client-side, no WebSocket required)
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
          distParams = { mean: distributionParams.mean, std: distributionParams.std };
          break;
        case 'T':
          distParams = { df: distributionParams.df, mean: 0, std: 1 };
          break;
        case 'LOGNORMAL':
          distParams = { mean: distributionParams.mean, sigma: distributionParams.std };
          break;
        case 'GAMMA':
          distParams = { shape: distributionParams.shape, scale: distributionParams.scale };
          break;
        case 'BINOMIAL':
          distParams = { p: distributionParams.p, n: 1 };
          break;
        default:
          distParams = { mean: distributionParams.mean, std: distributionParams.std };
      }

      // Run the simulation client-side
      setSimulationStatus('running');
      const simulationResults = await runSampleSizeSimulation(
        {
          confidenceLevel,
          minSampleSize,
          maxSampleSize,
          sampleSizeStep: additionalOptions.sampleSizeStep,
          distribution: distributionType,
          distParams,
          numSimulations
        },
        (progressValue) => {
          setProgress(progressValue);
        }
      );

      // Process results for visualization
      setResult({
        sample_sizes: simulationResults.sampleSizes,
        coverages: simulationResults.coverageRates,
        avg_widths: simulationResults.averageWidths
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
      default:
        return null;
    }
  };

  // Function to render the simulation results
  const renderResults = () => {
    if (!result) return null;

    // Prepare data for charts
    const coverageData = result.sample_sizes.map((size, index) => ({
      sampleSize: size,
      coverage: result.coverages[index] * 100,
      nominalCoverage: confidenceLevel * 100
    }));

    const widthData = result.sample_sizes.map((size, index) => ({
      sampleSize: size,
      width: result.avg_widths[index]
    }));

    // Prepare data for log-log plot
    const logLogData = result.sample_sizes.map((size, index) => ({
      logSampleSize: Math.log(size),
      logWidth: Math.log(result.avg_widths[index])
    }));

    // Calculate the slope of the log-log relationship
    const xValues = result.sample_sizes.map(size => Math.log(size));
    const yValues = result.avg_widths.map(width => Math.log(width));
    
    // Simple linear regression for slope calculation
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((total, x, i) => total + x * yValues[i], 0);
    const sumXX = xValues.reduce((total, x) => total + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Simulation Results
        </Typography>
        
        {/* Coverage vs. Sample Size */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Coverage Probability vs. Sample Size
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={coverageData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="sampleSize" 
                    label={{ value: 'Sample Size', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Coverage (%)', angle: -90, position: 'insideLeft' }}
                    domain={[
                      Math.min(confidenceLevel * 100 * 0.9, Math.min(...result.coverages) * 100 * 0.9),
                      Math.max(confidenceLevel * 100 * 1.05, Math.max(...result.coverages) * 100 * 1.05)
                    ]} 
                  />
                  <RechartsTooltip />
                  <Legend />
                  <ReferenceLine 
                    y={confidenceLevel * 100} 
                    stroke="red" 
                    strokeDasharray="3 3" 
                  >
                    <Label value={`Nominal ${(confidenceLevel * 100).toFixed(0)}%`} position="right" />
                  </ReferenceLine>
                  <Line
                    type="monotone"
                    dataKey="coverage"
                    name="Actual Coverage"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Width vs. Sample Size */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Average Interval Width vs. Sample Size
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={widthData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="sampleSize" 
                    label={{ value: 'Sample Size', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Average Width', angle: -90, position: 'insideLeft' }} 
                  />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="width"
                    name="Avg Width"
                    stroke="#82ca9d"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Log-Log Plot of Width vs. Sample Size */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Log-Log Plot: Width vs. Sample Size
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="logSampleSize" 
                    name="Log(Sample Size)" 
                    label={{ value: 'Log(Sample Size)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    dataKey="logWidth" 
                    name="Log(Width)" 
                    label={{ value: 'Log(Width)', angle: -90, position: 'insideLeft' }}
                  />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter 
                    name="Log-Log Data" 
                    data={logLogData} 
                    fill="#8884d8" 
                  />
                  {/* Add the fitted line */}
                  <Line
                    name={`Fitted Line (slope = ${slope.toFixed(3)})`}
                    data={logLogData.map(point => ({
                      logSampleSize: point.logSampleSize,
                      fittedValue: intercept + slope * point.logSampleSize
                    }))}
                    dataKey="fittedValue"
                    xAxisId={0}
                    yAxisId={0}
                    stroke="#ff7300"
                    dot={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Fitted Slope:</strong> {slope.toFixed(3)} (theoretical value for 1/√n relationship: -0.5)
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Result table */}
        <Paper sx={{ p: 2, mt: 3, overflow: 'auto' }}>
          <Typography variant="subtitle1" gutterBottom>
            Detailed Results
          </Typography>
          <Box sx={{ minWidth: 650 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Sample Size</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Coverage (%)</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Avg Width</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Theoretical Width*</th>
                </tr>
              </thead>
              <tbody>
                {result.sample_sizes.map((size, index) => (
                  <tr key={size}>
                    <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{size}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>{(result.coverages[index] * 100).toFixed(1)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>{result.avg_widths[index].toFixed(4)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                      {result.theoretical_widths && result.theoretical_widths[index] 
                        ? result.theoretical_widths[index].toFixed(4) 
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            *Theoretical width available only for certain interval types and distributions
          </Typography>
        </Paper>
        
        {/* Interpretation */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Interpretation
          </Typography>
          
          <Typography paragraph>
            The simulation results demonstrate two key effects of increasing sample size on confidence intervals:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Effect on Coverage Probability
                  </Typography>
                  <Typography variant="body2" paragraph>
                    As sample size increases, the actual coverage probability 
                    {Math.abs(result.coverages[result.coverages.length - 1] - confidenceLevel) < 
                      Math.abs(result.coverages[0] - confidenceLevel) 
                        ? ' approaches' 
                        : ' deviates from'} 
                    the nominal level of {(confidenceLevel * 100).toFixed(0)}%.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Small samples (n = {result.sample_sizes[0]}):</strong> {(result.coverages[0] * 100).toFixed(1)}% coverage
                  </Typography>
                  <Typography variant="body2">
                    <strong>Large samples (n = {result.sample_sizes[result.sample_sizes.length - 1]}):</strong> {(result.coverages[result.coverages.length - 1] * 100).toFixed(1)}% coverage
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Effect on Interval Width
                  </Typography>
                  <Typography variant="body2" paragraph>
                    The width of the confidence interval decreases as sample size increases, following approximately 
                    a 1/√n relationship (shown by the log-log plot with slope ≈ -0.5).
                  </Typography>
                  <Typography variant="body2">
                    <strong>Small samples (n = {result.sample_sizes[0]}):</strong> {result.avg_widths[0].toFixed(4)} width
                  </Typography>
                  <Typography variant="body2">
                    <strong>Large samples (n = {result.sample_sizes[result.sample_sizes.length - 1]}):</strong> {result.avg_widths[result.avg_widths.length - 1].toFixed(4)} width
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Width ratio:</strong> {(result.avg_widths[0] / result.avg_widths[result.avg_widths.length - 1]).toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Sample size ratio:</strong> {(result.sample_sizes[result.sample_sizes.length - 1] / result.sample_sizes[0]).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Typography variant="subtitle2" sx={{ mt: 3 }}>
            Practical Implications:
          </Typography>
          
          <Typography paragraph>
            To halve the width of a confidence interval, you need to quadruple the sample size. This 
            demonstrates the "diminishing returns" of increasing sample size beyond a certain point.
          </Typography>
          
          {intervalType.includes('PROPORTION') && (
            <Typography paragraph>
              For proportion intervals, the {additionalOptions.method.toLowerCase()} method shows 
              {additionalOptions.method === 'WALD' 
                ? ' poor coverage for small sample sizes, particularly when the proportion is near 0 or 1.' 
                : additionalOptions.method === 'WILSON'
                  ? ' good coverage across sample sizes, even for smaller samples.'
                  : ' conservative coverage (at or above the nominal level) for all sample sizes.'}
            </Typography>
          )}
          
          {intervalType === 'MEAN_T' && (
            <Typography paragraph>
              The t-interval maintains good coverage across all sample sizes for 
              {distributionType === 'NORMAL' 
                ? ' normally distributed data, with exact coverage properties.' 
                : distributionType === 'T'
                  ? ' t-distributed data, especially as degrees of freedom increase.'
                  : ' this distribution, showing robustness to moderate departures from normality.'}
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
          Sample Size Effects Simulation
        </Typography>
        
        <Typography paragraph>
          This simulation demonstrates how sample size affects the width and coverage probability 
          of confidence intervals. As sample size increases, intervals typically become narrower 
          (more precise) while maintaining their nominal coverage level.
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
            
            {/* Method selection for proportion intervals */}
            {intervalType.includes('PROPORTION') && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="proportion-method-label">Proportion Method</InputLabel>
                  <Select
                    labelId="proportion-method-label"
                    id="proportion-method-select"
                    value={additionalOptions.method}
                    label="Proportion Method"
                    onChange={handleMethodChange}
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
            )}
            
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
            
            {/* Sample size parameters */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Minimum Sample Size"
                type="number"
                value={minSampleSize}
                onChange={handleMinSampleSizeChange}
                InputProps={{
                  inputProps: { min: 2, max: 100 }
                }}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Maximum Sample Size"
                type="number"
                value={maxSampleSize}
                onChange={handleMaxSampleSizeChange}
                InputProps={{
                  inputProps: { min: 10, max: 500 }
                }}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Sample Size Step"
                type="number"
                value={additionalOptions.sampleSizeStep}
                onChange={handleSampleSizeStepChange}
                InputProps={{
                  inputProps: { min: 1, max: 50 }
                }}
                disabled={loading}
                helperText="Increment between sample sizes"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Number of Simulations per Sample Size"
                type="number"
                value={numSimulations}
                onChange={handleNumSimulationsChange}
                InputProps={{
                  inputProps: { min: 100, max: 5000 }
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
              {simulationStatus === 'running' && `Running simulations across different sample sizes...`}
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
            The relationship between confidence interval width and sample size follows a predictable pattern.
            For many common parameters, interval width is proportional to 1/√n, where n is the sample size.
          </Typography>
          
          <MathJax>
            {"$$\\text{Width} \\propto \\frac{1}{\\sqrt{n}}$$"}
          </MathJax>
          
          <Typography paragraph sx={{ mt: 2 }}>
            For example, for a normal mean with a t-interval:
          </Typography>
          
          <MathJax>
            {"$$\\text{Width} = 2 \\times t_{\\alpha/2, n-1} \\times \\frac{s}{\\sqrt{n}}$$"}
          </MathJax>
          
          <Typography paragraph sx={{ mt: 2 }}>
            This explains why quadrupling the sample size only halves the width of the interval:
          </Typography>
          
          <MathJax>
            {"$$\\frac{\\text{Width}_1}{\\text{Width}_2} \\approx \\sqrt{\\frac{n_2}{n_1}}$$"}
          </MathJax>
          
          <Box sx={{ mt: 3 }}>
            <Divider />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Practical Sample Size Determination
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Margin of Error Approach
                    </Typography>
                    <Typography variant="body2" paragraph>
                      To achieve a desired margin of error (E), sample size can be calculated:
                    </Typography>
                    <MathJax>
                      {"$$n \\approx \\left(\\frac{z_{\\alpha/2} \\times \\sigma}{E}\\right)^2$$"}
                    </MathJax>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Where σ is the population standard deviation, which may need to be estimated.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Power Analysis Approach
                    </Typography>
                    <Typography variant="body2" paragraph>
                      For hypothesis testing, sample size relates to the power (1-β) to detect an effect size d:
                    </Typography>
                    <MathJax>
                      {"$$n \\approx \\frac{2(z_{\\alpha/2} + z_{\\beta})^2}{d^2}$$"}
                    </MathJax>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Where d is the standardized effect size (difference/standard deviation).
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

SampleSizeSimulation.propTypes = {
  projectId: PropTypes.string
};

export default SampleSizeSimulation;