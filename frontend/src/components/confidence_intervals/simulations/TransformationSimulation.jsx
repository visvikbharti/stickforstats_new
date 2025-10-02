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
  Scatter
} from 'recharts';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { runTransformationSimulation } from '../../../utils/simulationUtils';

/**
 * Transformation Simulation component
 * This component demonstrates how transformations affect confidence intervals
 */
const TransformationSimulation = ({ projectId }) => {
  // States for simulation parameters
  const [parameterType, setParameterType] = useState('VARIANCE');
  const [transformationType, setTransformationType] = useState('SQRT');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [sampleSize, setSampleSize] = useState(30);
  const [numSimulations, setNumSimulations] = useState(1000);
  const [distributionParams, setDistributionParams] = useState({
    mean: 0,
    std: 1,
    df: 5,
    shape: 2,
    scale: 1,
    lambda: 1,
    p: 0.5
  });

  // States for simulation status and results
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('idle');

  // Parameter options
  const parameterOptions = [
    { value: 'VARIANCE', label: 'Variance' },
    { value: 'STD_DEV', label: 'Standard Deviation' },
    { value: 'MEAN_POS', label: 'Mean (Positive Values)' },
    { value: 'PROPORTION', label: 'Proportion' },
    { value: 'ODDS', label: 'Odds' },
    { value: 'RATE', label: 'Rate' }
  ];

  const transformationOptions = {
    'VARIANCE': [
      { value: 'SQRT', label: 'Square Root (to Std Dev)' },
      { value: 'LOG', label: 'Log Transformation' },
      { value: 'INVERSE', label: 'Inverse (1/x)' }
    ],
    'STD_DEV': [
      { value: 'SQUARE', label: 'Square (to Variance)' },
      { value: 'LOG', label: 'Log Transformation' },
      { value: 'INVERSE', label: 'Inverse (1/x)' }
    ],
    'MEAN_POS': [
      { value: 'LOG', label: 'Log Transformation' },
      { value: 'SQRT', label: 'Square Root' },
      { value: 'INVERSE', label: 'Inverse (1/x)' }
    ],
    'PROPORTION': [
      { value: 'LOGIT', label: 'Logit (log odds)' },
      { value: 'ARCSINE', label: 'Arcsine √p' },
      { value: 'ODDS', label: 'To Odds (p/(1-p))' }
    ],
    'ODDS': [
      { value: 'LOG', label: 'Log Odds' },
      { value: 'PROP', label: 'To Proportion (odds/(1+odds))' }
    ],
    'RATE': [
      { value: 'LOG', label: 'Log Rate' },
      { value: 'SQRT', label: 'Square Root' }
    ]
  };


  // Get appropriate transformation options based on parameter type
  const getTransformationOptions = () => {
    return transformationOptions[parameterType] || [];
  };

  // Handle parameter changes
  const handleParameterTypeChange = (event) => {
    const newParamType = event.target.value;
    setParameterType(newParamType);
    
    // Reset transformation type to the first available option for this parameter
    if (transformationOptions[newParamType] && transformationOptions[newParamType].length > 0) {
      setTransformationType(transformationOptions[newParamType][0].value);
    }
  };

  const handleTransformationTypeChange = (event) => {
    setTransformationType(event.target.value);
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

  const handleDistributionParamChange = (param, value) => {
    setDistributionParams({
      ...distributionParams,
      [param]: value
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
      let intervalType = 'MEAN_T'; // Default interval type

      switch (parameterType) {
        case 'VARIANCE':
          distParams = { mean: 0, std: distributionParams.std };
          intervalType = 'VARIANCE';
          break;
        case 'STD_DEV':
          distParams = { mean: 0, std: distributionParams.std };
          intervalType = 'STD_DEV';
          break;
        case 'MEAN_POS':
          distParams = { mean: Math.max(1, distributionParams.mean), std: distributionParams.std };
          intervalType = 'MEAN_T';
          break;
        case 'PROPORTION':
        case 'ODDS':
          distParams = { p: distributionParams.p };
          intervalType = 'MEAN_T'; // Use normal approximation
          break;
        case 'RATE':
          distParams = { lambda: distributionParams.lambda };
          intervalType = 'MEAN_T';
          break;
        default:
          distParams = { mean: distributionParams.mean, std: distributionParams.std };
          intervalType = 'MEAN_T';
      }

      // Run the simulation client-side using transformation simulation
      setSimulationStatus('running');
      const simulationResults = await runTransformationSimulation(
        {
          sampleSize,
          numSimulations,
          confidenceLevel,
          distribution: 'NORMAL',
          distParams,
          transformation: transformationType
        },
        (progressValue) => {
          setProgress(progressValue);
        }
      );

      // Results already contain all properties needed by renderResults
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

  // Determine which distribution parameters to show based on parameter type
  const renderDistributionParams = () => {
    switch (parameterType) {
      case 'VARIANCE':
      case 'STD_DEV':
        return (
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Population Standard Deviation (σ)</Typography>
            <Slider
              value={distributionParams.std}
              onChange={(e, value) => handleDistributionParamChange('std', value)}
              min={0.1}
              max={5}
              step={0.1}
              valueLabelDisplay="auto"
              disabled={loading}
            />
            <Typography variant="caption" color="text.secondary">
              Population variance: {(distributionParams.std * distributionParams.std).toFixed(2)}
            </Typography>
          </Grid>
        );
      case 'MEAN_POS':
        return (
          <>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Population Mean (μ)</Typography>
              <Slider
                value={distributionParams.mean}
                onChange={(e, value) => handleDistributionParamChange('mean', value)}
                min={1}
                max={10}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
              <Typography variant="caption" color="text.secondary">
                Restricted to positive values for transformation validity
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Population Standard Deviation (σ)</Typography>
              <Slider
                value={distributionParams.std}
                onChange={(e, value) => handleDistributionParamChange('std', value)}
                min={0.1}
                max={Math.max(2, distributionParams.mean / 2)}
                step={0.1}
                valueLabelDisplay="auto"
                disabled={loading}
              />
              <Typography variant="caption" color="text.secondary">
                Limited to prevent excessive negative values in simulation
              </Typography>
            </Grid>
          </>
        );
      case 'PROPORTION':
      case 'ODDS':
        return (
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Population Proportion (p)</Typography>
            <Slider
              value={distributionParams.p}
              onChange={(e, value) => handleDistributionParamChange('p', value)}
              min={0.01}
              max={0.99}
              step={0.01}
              valueLabelDisplay="auto"
              marks={[
                { value: 0.25, label: '0.25' },
                { value: 0.5, label: '0.5' },
                { value: 0.75, label: '0.75' }
              ]}
              disabled={loading}
            />
            <Typography variant="caption" color="text.secondary">
              Corresponding odds: {(distributionParams.p / (1 - distributionParams.p)).toFixed(2)}
            </Typography>
          </Grid>
        );
      case 'RATE':
        return (
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Rate Parameter (λ)</Typography>
            <Slider
              value={distributionParams.lambda}
              onChange={(e, value) => handleDistributionParamChange('lambda', value)}
              min={0.1}
              max={10}
              step={0.1}
              valueLabelDisplay="auto"
              disabled={loading}
            />
            <Typography variant="caption" color="text.secondary">
              Mean of Poisson distribution
            </Typography>
          </Grid>
        );
      default:
        return null;
    }
  };

  // Function to render the simulation results
  const renderResults = () => {
    if (!result) return null;

    // Prepare data for visualization
    const coverageData = [
      { name: 'Original', value: result.original_coverage * 100, nominal: confidenceLevel * 100 },
      { name: 'Transformed', value: result.transformed_coverage * 100, nominal: confidenceLevel * 100 }
    ];

    // Prepare width comparison data
    const widthsData = [
      { name: 'Original', value: result.original_mean_width },
      { name: 'Transformed (Raw Scale)', value: result.back_transformed_mean_width }
    ];

    // Prepare scatter plot data for CI comparisons
    const ciComparisonData = result.interval_examples.map((interval, index) => ({
      index,
      original_lower: interval.original_lower,
      original_upper: interval.original_upper,
      transformed_lower: interval.transformed_lower,
      transformed_upper: interval.transformed_upper,
      contains_true: interval.contains_true,
      transformed_contains_true: interval.transformed_contains_true
    }));

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Simulation Results
        </Typography>
        
        {/* Summary metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Coverage Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={coverageData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    domain={[
                      Math.min(confidenceLevel * 100 * 0.9, Math.min(result.original_coverage, result.transformed_coverage) * 100 * 0.9),
                      Math.max(confidenceLevel * 100 * 1.05, Math.max(result.original_coverage, result.transformed_coverage) * 100 * 1.05)
                    ]}
                    label={{ value: 'Coverage (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <RechartsTooltip />
                  <Legend />
                  <ReferenceLine 
                    y={confidenceLevel * 100} 
                    stroke="red" 
                    strokeDasharray="3 3"
                    label={{ value: `Nominal ${(confidenceLevel * 100).toFixed(0)}%`, position: 'right' }}
                  />
                  <Line type="monotone" dataKey="value" name="Actual Coverage" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Width Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={widthsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    label={{ value: 'Average Width', angle: -90, position: 'insideLeft' }}
                  />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Average Width" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Result metrics */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Detailed Results
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Original Parameter
                  </Typography>
                  <Typography variant="body2">
                    <strong>Coverage:</strong> {(result.original_coverage * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>Average Width:</strong> {result.original_mean_width.toFixed(4)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Median Width:</strong> {result.original_median_width.toFixed(4)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Intervals Containing True Value:</strong> {result.original_intervals_containing_true} / {numSimulations}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Transformed Parameter
                  </Typography>
                  <Typography variant="body2">
                    <strong>Coverage:</strong> {(result.transformed_coverage * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>Average Width (Transformed Scale):</strong> {result.transformed_mean_width.toFixed(4)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Average Width (Original Scale):</strong> {result.back_transformed_mean_width.toFixed(4)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Intervals Containing True Value:</strong> {result.transformed_intervals_containing_true} / {numSimulations}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Additional metrics */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Transformation Effects
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Coverage Difference:</strong> {((result.transformed_coverage - result.original_coverage) * 100).toFixed(1)} percentage points
                </Typography>
                <Typography variant="body2">
                  <strong>Relative Width Difference:</strong> {((result.back_transformed_mean_width / result.original_mean_width - 1) * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  <strong>Symmetry Improvement:</strong> {result.symmetry_improvement.toFixed(2)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Original Interval Shape:</strong> {result.original_interval_shape}
                </Typography>
                <Typography variant="body2">
                  <strong>Transformed Interval Shape:</strong> {result.transformed_interval_shape}
                </Typography>
                <Typography variant="body2">
                  <strong>Transformation Function:</strong> {result.transformation_function}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Paper>
        
        {/* Interval examples visualization */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Confidence Interval Visualization
          </Typography>
          
          <Typography variant="body2" paragraph>
            The chart below shows {Math.min(10, result.interval_examples.length)} example confidence intervals from the simulation. 
            Each point represents the interval midpoint, with error bars showing the interval bounds.
            Red intervals don't contain the true parameter, green intervals do.
          </Typography>
          
          <Box sx={{ height: 400, width: '100%', overflowX: 'auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="index"
                  type="number"
                  domain={[0, Math.min(10, result.interval_examples.length) - 1]}
                  label={{ value: 'Interval Example', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  label={{ value: 'Parameter Value', angle: -90, position: 'insideLeft' }}
                />
                <RechartsTooltip 
                  formatter={(value, name) => {
                    if (name === 'Original CI') {
                      return [`[${value[0].toFixed(4)}, ${value[1].toFixed(4)}]`, name];
                    } else {
                      return [`[${value[0].toFixed(4)}, ${value[1].toFixed(4)}]`, name];
                    }
                  }}
                />
                <Legend />
                
                {/* Original intervals */}
                {result.interval_examples.slice(0, 10).map((interval, idx) => (
                  <Line
                    key={`original-${idx}`}
                    dataKey={() => [interval.original_lower, interval.original_upper]}
                    name="Original CI"
                    stroke={interval.contains_true ? "#4caf50" : "#f44336"}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    data={[{index: idx}]}
                    isAnimationActive={false}
                  />
                ))}
                
                {/* Transformed intervals (back-transformed to original scale) */}
                {result.interval_examples.slice(0, 10).map((interval, idx) => (
                  <Line
                    key={`transformed-${idx}`}
                    dataKey={() => [interval.transformed_lower, interval.transformed_upper]}
                    name="Transformed CI"
                    stroke={interval.transformed_contains_true ? "#2196f3" : "#ff9800"}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    data={[{index: idx}]}
                    isAnimationActive={false}
                  />
                ))}
                
                {/* Reference line for true parameter value */}
                <ReferenceLine
                  y={result.true_parameter}
                  stroke="#000"
                  strokeDasharray="3 3"
                  label={{ value: 'True Value', position: 'right' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
        
        {/* Interpretation */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Interpretation
          </Typography>
          
          <Typography paragraph>
            This simulation demonstrates the effects of applying the <strong>{result.transformation_function}</strong> transformation 
            to confidence intervals for the {parameterOptions.find(p => p.value === parameterType)?.label.toLowerCase()}.
          </Typography>
          
          <Typography paragraph>
            <strong>Coverage Effects:</strong> The transformation
            {result.transformed_coverage > result.original_coverage ? ' improved' : ' reduced'} coverage from
            {(result.original_coverage * 100).toFixed(1)}% to {(result.transformed_coverage * 100).toFixed(1)}%.
            This is {Math.abs((result.transformed_coverage - confidenceLevel) * 100) < Math.abs((result.original_coverage - confidenceLevel) * 100) ? 'closer to' : 'further from'} the 
            nominal level of {(confidenceLevel * 100).toFixed(0)}%.
          </Typography>
          
          <Typography paragraph>
            <strong>Interval Shape:</strong> Original intervals were {result.original_interval_shape.toLowerCase()}, 
            while transformed intervals are {result.transformed_interval_shape.toLowerCase()} when back-transformed to the original scale.
            {result.symmetry_improvement > 0 ? ' The transformation improved the symmetry of the intervals.' : 
             result.symmetry_improvement < 0 ? ' The transformation made the intervals less symmetric.' : 
             ' The transformation had little effect on interval symmetry.'}
          </Typography>
          
          <Typography paragraph>
            <strong>Width Effects:</strong> Transformed intervals are
            {result.back_transformed_mean_width > result.original_mean_width ? ' wider' : ' narrower'} on average
            by {Math.abs((result.back_transformed_mean_width / result.original_mean_width - 1) * 100).toFixed(1)}% 
            when compared on the original scale.
            {result.back_transformed_mean_width > result.original_mean_width ? 
              ' This trade-off of wider intervals for better coverage may be worthwhile in some applications.' : 
              ' This combination of narrower intervals with better coverage makes the transformation beneficial.'}
          </Typography>
          
          {parameterType === 'VARIANCE' && transformationType === 'SQRT' && (
            <Typography paragraph>
              <strong>Variance to Std Dev:</strong> Converting from variance to standard deviation using the square root
              transformation tends to make the intervals more symmetric and can improve coverage, especially for
              small sample sizes. The standard deviation is often more interpretable in the original data units.
            </Typography>
          )}
          
          {parameterType === 'PROPORTION' && transformationType === 'LOGIT' && (
            <Typography paragraph>
              <strong>Logit Transformation:</strong> The logit transformation is especially beneficial for
              proportions near 0 or 1, where standard methods can produce intervals outside the [0,1] range.
              However, the interpretation becomes more complex on the log-odds scale.
            </Typography>
          )}
          
          {(transformationType === 'LOG' || transformationType === 'LOGIT') && (
            <Typography paragraph>
              <strong>Log-based Transformations:</strong> Log-based transformations are particularly useful for
              parameters with skewed sampling distributions. They tend to make the distributions more symmetric and
              can stabilize the variance across different parameter values.
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
          Transformations and Confidence Intervals
        </Typography>
        
        <Typography paragraph>
          This simulation demonstrates how transformations affect confidence interval properties.
          Transformations can improve coverage, symmetry, and interpretability of confidence intervals,
          especially when the sampling distribution is skewed or has non-constant variance.
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
            {/* Parameter selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="parameter-type-label">Parameter Type</InputLabel>
                <Select
                  labelId="parameter-type-label"
                  id="parameter-type-select"
                  value={parameterType}
                  label="Parameter Type"
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
            
            {/* Transformation selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="transformation-type-label">Transformation</InputLabel>
                <Select
                  labelId="transformation-type-label"
                  id="transformation-type-select"
                  value={transformationType}
                  label="Transformation"
                  onChange={handleTransformationTypeChange}
                  disabled={loading}
                >
                  {getTransformationOptions().map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
            
            {/* Sample size and number of simulations */}
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
            Transformations can be used to create confidence intervals for functions of parameters.
            If $[L, U]$ is a confidence interval for parameter $\theta$, and $g$ is a monotonic function,
            then $[g(L), g(U)]$ is a confidence interval for $g(\theta)$.
          </Typography>
          
          <MathJax>
            {"$$P(L \\leq \\theta \\leq U) = 1-\\alpha \\implies P(g(L) \\leq g(\\theta) \\leq g(U)) = 1-\\alpha$$"}
          </MathJax>
          
          <Typography paragraph sx={{ mt: 2 }}>
            For monotonically increasing functions $g$, the interval is $[g(L), g(U)]$.
            For monotonically decreasing functions, the interval becomes $[g(U), g(L)]$.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Common Transformations:
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Variance to Standard Deviation
                    </Typography>
                    <Typography variant="body2" paragraph>
                      The square root transformation:
                    </Typography>
                    <MathJax>
                      {"$$g(\\theta) = \\sqrt{\\theta}$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      CI for std dev: [√Lower, √Upper] where [Lower, Upper] is CI for variance
                    </Typography>
                    <Typography variant="body2">
                      Makes right-skewed intervals more symmetric
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Log Transformation
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Natural logarithm:
                    </Typography>
                    <MathJax>
                      {"$$g(\\theta) = \\ln(\\theta)$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      CI for $\ln(\theta)$: $[\ln(L), \ln(U)]$
                    </Typography>
                    <Typography variant="body2">
                      Useful for ratio parameters, makes multiplicative errors additive
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Logit Transformation
                    </Typography>
                    <Typography variant="body2" paragraph>
                      For proportions:
                    </Typography>
                    <MathJax>
                      {"$$g(p) = \\ln\\left(\\frac{p}{1-p}\\right)$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      Transforms proportion to log-odds, avoids boundary constraints
                    </Typography>
                    <Typography variant="body2">
                      Especially useful for proportions near 0 or 1
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Delta Method
                    </Typography>
                    <Typography variant="body2" paragraph>
                      For non-monotonic transformations:
                    </Typography>
                    <MathJax>
                      {"$$\\text{Var}(g(\\hat{\\theta})) \\approx [g'(\\theta)]^2 \\text{Var}(\\hat{\\theta})$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      Approximates the variance of a transformed estimator
                    </Typography>
                    <Typography variant="body2">
                      Based on first-order Taylor series expansion
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Divider />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Benefits of Transformations:
            </Typography>
            <Typography variant="body2" paragraph>
              1. Improve normality of sampling distributions
            </Typography>
            <Typography variant="body2" paragraph>
              2. Stabilize variance across different parameter values
            </Typography>
            <Typography variant="body2" paragraph>
              3. Transform parameters to more interpretable scales
            </Typography>
            <Typography variant="body2" paragraph>
              4. Avoid boundary constraints (e.g., positivity for variance)
            </Typography>
            <Typography variant="body2" paragraph>
              5. Make asymmetric intervals more symmetric
            </Typography>
          </Box>
        </Paper>
      </Box>
    </MathJaxContext>
  );
};

TransformationSimulation.propTypes = {
  projectId: PropTypes.string
};

export default TransformationSimulation;