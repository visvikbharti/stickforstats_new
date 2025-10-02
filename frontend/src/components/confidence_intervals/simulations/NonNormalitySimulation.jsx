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
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  AreaChart,
  Area
} from 'recharts';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { runNonNormalitySimulation } from '../../../utils/simulationUtils';

/**
 * Non-normality Impact Simulation component
 * This component demonstrates how departures from normality affect confidence interval performance
 */
const NonNormalitySimulation = ({ projectId }) => {
  // States for simulation parameters
  const [intervalType, setIntervalType] = useState('MEAN_T');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [sampleSize, setSampleSize] = useState(30);
  const [numSimulations, setNumSimulations] = useState(1000);
  const [distributionType, setDistributionType] = useState('SKEWED');
  const [distributionParams, setDistributionParams] = useState({
    skewness: 1.5,
    kurtosis: 5,
    heaviness: 3,
    contamination: 0.1,
    outlierMean: 5,
    outlierStd: 2,
    bimodalSeparation: 4,
    bimodalRatio: 0.3
  });

  // States for simulation status and results
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('idle');

  // Parameter options
  const intervalOptions = [
    { value: 'MEAN_T', label: 'Mean (t-interval)' },
    { value: 'MEAN_Z', label: 'Mean (z-interval)' },
    { value: 'TRIMMED_MEAN', label: 'Trimmed Mean (10%)' },
    { value: 'MEDIAN', label: 'Median' },
    { value: 'HODGES_LEHMANN', label: 'Hodges-Lehmann Estimator' }
  ];

  const distributionOptions = [
    { value: 'SKEWED', label: 'Skewed' },
    { value: 'HEAVY_TAILED', label: 'Heavy-tailed' },
    { value: 'CONTAMINATED', label: 'Contaminated (Outliers)' },
    { value: 'BIMODAL', label: 'Bimodal' },
    { value: 'DISCRETE', label: 'Discrete' }
  ];


  // Handle parameter changes
  const handleIntervalTypeChange = (event) => {
    setIntervalType(event.target.value);
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

  // Run the simulation (client-side, no WebSocket required)
  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setSimulationStatus('starting');

    try {
      // Prepare distribution parameters based on distribution type
      let distParams = {};
      let distribution = 'NORMAL';

      switch (distributionType) {
        case 'SKEWED':
          distribution = 'GAMMA';
          distParams = { shape: Math.max(1, 5 / distributionParams.skewness), scale: 1 };
          break;
        case 'HEAVY_TAILED':
          distribution = 'T';
          distParams = { df: distributionParams.heaviness, mean: 0, std: 1 };
          break;
        case 'CONTAMINATED':
          distribution = 'MIXTURE';
          distParams = {
            means: [0, distributionParams.outlierMean],
            stds: [1, distributionParams.outlierStd],
            weights: [1 - distributionParams.contamination, distributionParams.contamination]
          };
          break;
        case 'BIMODAL':
          distribution = 'MIXTURE';
          const sep = distributionParams.bimodalSeparation / 2;
          distParams = {
            means: [-sep, sep],
            stds: [1, 1],
            weights: [distributionParams.bimodalRatio, 1 - distributionParams.bimodalRatio]
          };
          break;
        case 'DISCRETE':
          distribution = 'BINOMIAL';
          distParams = { p: 0.5, n: 1 };
          break;
        default:
          distribution = 'NORMAL';
          distParams = { mean: 0, std: 1 };
      }

      // Run the simulation client-side using non-normality simulation
      setSimulationStatus('running');
      const simulationResults = await runNonNormalitySimulation(
        {
          sampleSize,
          numSimulations,
          confidenceLevel,
          distribution,
          distParams
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

  // Determine which distribution parameters to show based on distribution type
  const renderDistributionParams = () => {
    switch (distributionType) {
      case 'SKEWED':
        return (
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Skewness</Typography>
            <Slider
              value={distributionParams.skewness}
              onChange={(e, value) => handleDistributionParamChange('skewness', value)}
              min={0}
              max={5}
              step={0.1}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: 'None' },
                { value: 1, label: 'Mild' },
                { value: 3, label: 'Strong' },
                { value: 5, label: 'Extreme' }
              ]}
              disabled={loading}
            />
            <Typography variant="caption" color="text.secondary">
              Controls the asymmetry of the distribution
            </Typography>
          </Grid>
        );
      case 'HEAVY_TAILED':
        return (
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>Degrees of Freedom (Tail Heaviness)</Typography>
            <Slider
              value={distributionParams.heaviness}
              onChange={(e, value) => handleDistributionParamChange('heaviness', value)}
              min={1}
              max={30}
              step={1}
              valueLabelDisplay="auto"
              marks={[
                { value: 1, label: 'Cauchy' },
                { value: 3, label: 'Heavy' },
                { value: 10, label: 'Moderate' },
                { value: 30, label: 'Light' }
              ]}
              disabled={loading}
            />
            <Typography variant="caption" color="text.secondary">
              Lower values = heavier tails (more extreme values)
            </Typography>
          </Grid>
        );
      case 'CONTAMINATED':
        return (
          <>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Contamination Rate</Typography>
              <Slider
                value={distributionParams.contamination}
                onChange={(e, value) => handleDistributionParamChange('contamination', value)}
                min={0}
                max={0.3}
                step={0.01}
                valueLabelDisplay="auto"
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.1, label: '10%' },
                  { value: 0.2, label: '20%' },
                  { value: 0.3, label: '30%' }
                ]}
                disabled={loading}
              />
              <Typography variant="caption" color="text.secondary">
                Proportion of observations from outlier distribution
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Outlier Mean Shift</Typography>
              <Slider
                value={distributionParams.outlierMean}
                onChange={(e, value) => handleDistributionParamChange('outlierMean', value)}
                min={0}
                max={10}
                step={0.5}
                valueLabelDisplay="auto"
                disabled={loading}
              />
              <Typography variant="caption" color="text.secondary">
                How far outliers are from the main distribution
              </Typography>
            </Grid>
          </>
        );
      case 'BIMODAL':
        return (
          <>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Mode Separation</Typography>
              <Slider
                value={distributionParams.bimodalSeparation}
                onChange={(e, value) => handleDistributionParamChange('bimodalSeparation', value)}
                min={1}
                max={10}
                step={0.5}
                valueLabelDisplay="auto"
                disabled={loading}
              />
              <Typography variant="caption" color="text.secondary">
                Distance between the two modes
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Mode Ratio</Typography>
              <Slider
                value={distributionParams.bimodalRatio}
                onChange={(e, value) => handleDistributionParamChange('bimodalRatio', value)}
                min={0.1}
                max={0.5}
                step={0.05}
                valueLabelDisplay="auto"
                marks={[
                  { value: 0.1, label: '10/90' },
                  { value: 0.3, label: '30/70' },
                  { value: 0.5, label: '50/50' }
                ]}
                disabled={loading}
              />
              <Typography variant="caption" color="text.secondary">
                Relative size of smaller mode (0.5 = equal modes)
              </Typography>
            </Grid>
          </>
        );
      case 'DISCRETE':
        return (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Discrete distribution with fixed parameter settings.
              The simulation will use a mixture of discrete points with varying probabilities.
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

    // Prepare data for coverage comparison chart
    const coverageData = result.interval_types.map(type => ({
      name: type.label,
      actual: type.coverage * 100,
      nominal: confidenceLevel * 100
    }));

    // Prepare data for width comparison chart
    const widthData = result.interval_types.map(type => ({
      name: type.label,
      width: type.mean_width
    }));

    // Prepare data for distribution visualization
    const distributionData = result.distribution_histogram.map(point => ({
      x: point.x,
      density: point.density
    }));

    // Get robust factor
    const robustFactor = result.robust_factor || 1;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Simulation Results
        </Typography>
        
        {/* Distribution visualization */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Simulated Distribution
          </Typography>
          
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={distributionData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                label={{ value: 'Value', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Density', angle: -90, position: 'insideLeft' }} 
              />
              <RechartsTooltip />
              <Area type="monotone" dataKey="density" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              <ReferenceLine 
                x={result.true_parameter} 
                stroke="red" 
                label={{ value: 'True Value', position: 'top' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Distribution Type:</strong> {result.distribution_name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>True Parameter:</strong> {result.true_parameter.toFixed(4)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Observed Skewness:</strong> {result.observed_skewness?.toFixed(4) || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Observed Kurtosis:</strong> {result.observed_kurtosis?.toFixed(4) || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={8}>
                <Typography variant="body2">
                  <strong>Normality Test:</strong> {result.normality_test?.passed ? 'Passed' : 'Failed'} 
                  (p-value: {result.normality_test?.p_value.toFixed(4) || 'N/A'})
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Paper>
        
        {/* Coverage comparison */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Coverage Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={coverageData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    domain={[
                      Math.min(
                        confidenceLevel * 100 * 0.9,
                        Math.min(...coverageData.map(d => d.actual)) * 0.9
                      ),
                      Math.max(
                        confidenceLevel * 100 * 1.05,
                        Math.max(...coverageData.map(d => d.actual)) * 1.05
                      )
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
                  <Bar dataKey="actual" name="Actual Coverage" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Interval Width Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={widthData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Average Width', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="width" name="Average Width" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Detailed results */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Detailed Results
          </Typography>
          
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Interval Type</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Coverage (%)</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Avg Width</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Relative Efficiency</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Robustness Score</th>
                </tr>
              </thead>
              <tbody>
                {result.interval_types.map(type => (
                  <tr key={type.id}>
                    <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{type.label}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>{(type.coverage * 100).toFixed(1)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>{type.mean_width.toFixed(4)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>{type.relative_efficiency.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>{type.robustness_score.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Relative Efficiency: Width compared to standard method (smaller is better)<br />
            Robustness Score: Combined metric of coverage accuracy and efficiency (higher is better)
          </Typography>
        </Paper>
        
        {/* Interpretation */}
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Interpretation
          </Typography>
          
          <Typography paragraph>
            This simulation explores how different confidence interval methods perform when data comes from 
            a {result.distribution_name} distribution, which {result.normality_test?.passed ? 'passes' : 'fails'} 
            a test of normality.
          </Typography>
          
          {/* Find the best method */}
          {(() => {
            const bestCoverageMethod = [...result.interval_types].sort((a, b) => 
              Math.abs(a.coverage - confidenceLevel) - Math.abs(b.coverage - confidenceLevel)
            )[0];
            
            const bestRobustnessMethod = [...result.interval_types].sort((a, b) => 
              b.robustness_score - a.robustness_score
            )[0];
            
            return (
              <Typography paragraph>
                <strong>Best Coverage:</strong> The {bestCoverageMethod.label} method achieved the coverage 
                ({(bestCoverageMethod.coverage * 100).toFixed(1)}%) closest to the nominal 
                {(confidenceLevel * 100).toFixed(0)}% level.
                <br />
                <strong>Most Robust:</strong> The {bestRobustnessMethod.label} method had the highest 
                robustness score ({bestRobustnessMethod.robustness_score.toFixed(2)}), balancing coverage 
                accuracy with interval width.
              </Typography>
            );
          })()}
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Standard Method Performance
                  </Typography>
                  {(() => {
                    const standardMethod = result.interval_types.find(type => type.id === 'MEAN_T');
                    if (!standardMethod) return null;
                    
                    const coverageDiff = Math.abs(standardMethod.coverage - confidenceLevel) * 100;
                    const coverageQuality = 
                      coverageDiff < 2 ? 'excellent' :
                      coverageDiff < 5 ? 'good' :
                      'poor';
                    
                    return (
                      <>
                        <Typography variant="body2" paragraph>
                          The standard t-interval for the mean shows {coverageQuality} coverage 
                          ({(standardMethod.coverage * 100).toFixed(1)}% vs nominal {(confidenceLevel * 100).toFixed(0)}%)
                          under these non-normal conditions.
                        </Typography>
                        <Typography variant="body2">
                          {coverageQuality === 'excellent' ? 
                            'This suggests the t-interval is robust to this level of non-normality.' :
                            coverageQuality === 'good' ?
                            'The t-interval is moderately affected by this non-normality, but still usable.' :
                            'This suggests the t-interval is significantly affected by this type of non-normality.'
                          }
                        </Typography>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Robust Methods Comparison
                  </Typography>
                  {(() => {
                    // Find robust methods
                    const trimmedMethod = result.interval_types.find(type => type.id === 'TRIMMED_MEAN');
                    const medianMethod = result.interval_types.find(type => type.id === 'MEDIAN');
                    
                    if (!trimmedMethod && !medianMethod) return null;
                    
                    // Determine if robust methods are better
                    const standardMethod = result.interval_types.find(type => type.id === 'MEAN_T');
                    if (!standardMethod) return null;
                    
                    const standardCoverageDiff = Math.abs(standardMethod.coverage - confidenceLevel);
                    const trimmedCoverageDiff = trimmedMethod ? 
                      Math.abs(trimmedMethod.coverage - confidenceLevel) : 1;
                    const medianCoverageDiff = medianMethod ? 
                      Math.abs(medianMethod.coverage - confidenceLevel) : 1;
                    
                    const robustIsBetter = 
                      Math.min(trimmedCoverageDiff, medianCoverageDiff) < standardCoverageDiff;
                    
                    return (
                      <Typography variant="body2" paragraph>
                        {robustIsBetter ? 
                          `Robust methods (${trimmedMethod ? 'trimmed mean, ' : ''}${medianMethod ? 'median' : ''}) provide better coverage than the standard t-interval for this distribution. This is common with ${result.distribution_name.toLowerCase()} data, where outliers or asymmetry can affect the standard methods.` :
                          `Despite the non-normality, the standard t-interval performs as well as or better than robust alternatives for this particular distribution and sample size. This demonstrates the general robustness of the t-interval to moderate violations of normality.`
                        }
                      </Typography>
                    );
                  })()}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Distribution-Specific Insights:
            </Typography>
            
            {distributionType === 'SKEWED' && (
              <Typography paragraph>
                <strong>Skewed distributions</strong> tend to affect confidence intervals asymmetrically,
                making one-sided coverage probabilities unequal. As skewness increases, intervals based on
                the assumption of normality become less reliable. Transformations (like logarithmic) may
                help for positively skewed data.
              </Typography>
            )}
            
            {distributionType === 'HEAVY_TAILED' && (
              <Typography paragraph>
                <strong>Heavy-tailed distributions</strong> often lead to wider intervals when using
                robust methods, but these wider intervals are necessary to achieve proper coverage.
                Standard methods may have good average coverage but poor reliability from sample to sample
                due to occasional extreme observations.
              </Typography>
            )}
            
            {distributionType === 'CONTAMINATED' && (
              <Typography paragraph>
                <strong>Contaminated distributions</strong> (with outliers) particularly affect the
                standard mean-based intervals. Trimmed means and median-based methods are specifically
                designed to handle such data by reducing the influence of extreme values.
              </Typography>
            )}
            
            {distributionType === 'BIMODAL' && (
              <Typography paragraph>
                <strong>Bimodal distributions</strong> represent a fundamental challenge to standard
                intervals because the mean may fall in a low-density region between modes. The sample mean
                can be a valid measure of central tendency, but intervals around it may not represent the
                distribution structure well.
              </Typography>
            )}
            
            {distributionType === 'DISCRETE' && (
              <Typography paragraph>
                <strong>Discrete distributions</strong> violate the continuity assumption underlying many
                interval methods. For small sample sizes, this discreteness can affect coverage. Methods
                based on ranks or sign tests may be more appropriate than those assuming continuous data.
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
          Non-normality Impact on Confidence Intervals
        </Typography>
        
        <Typography paragraph>
          This simulation explores how departures from normality affect the performance of 
          different confidence interval methods. While many standard methods are designed under
          normality assumptions, they often show varying degrees of robustness when these
          assumptions are violated.
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
                <InputLabel id="distribution-type-label">Non-normal Distribution</InputLabel>
                <Select
                  labelId="distribution-type-label"
                  id="distribution-type-select"
                  value={distributionType}
                  label="Non-normal Distribution"
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
            Many statistical methods, including the standard t-interval, are based on asymptotic theory 
            and require certain assumptions, primarily that the data are normally distributed. 
            When these assumptions are violated, the performance of these methods can deteriorate.
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Types of Non-normality:
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Skewness
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Asymmetry of the probability distribution:
                    </Typography>
                    <MathJax>
                      {"$$\\gamma_1 = E\\left[\\left(\\frac{X-\\mu}{\\sigma}\\right)^3\\right]$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      Positive values indicate right skew (tail to the right)
                    </Typography>
                    <Typography variant="body2">
                      Normal distribution has skewness = 0
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      Kurtosis
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Measure of "tailedness" of the distribution:
                    </Typography>
                    <MathJax>
                      {"$$\\gamma_2 = E\\left[\\left(\\frac{X-\\mu}{\\sigma}\\right)^4\\right] - 3$$"}
                    </MathJax>
                    <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                      Positive values indicate heavier tails than normal
                    </Typography>
                    <Typography variant="body2">
                      Normal distribution has excess kurtosis = 0
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Central Limit Theorem and Robustness:
            </Typography>
            
            <Typography paragraph>
              The Central Limit Theorem (CLT) states that the sampling distribution of the mean 
              approaches a normal distribution as sample size increases, regardless of the 
              original distribution's shape. This provides some inherent robustness to t-intervals
              for larger sample sizes.
            </Typography>
            
            <MathJax>
              {"$$\\sqrt{n}\\frac{\\bar{X}-\\mu}{\\sigma} \\xrightarrow{d} N(0,1) \\quad \\text{as } n \\to \\infty$$"}
            </MathJax>
            
            <Typography paragraph sx={{ mt: 2 }}>
              However, the convergence rate depends on the type and degree of non-normality:
            </Typography>
            <Typography variant="body2">
              • For skewed distributions: convergence rate ≈ O(1/√n)
            </Typography>
            <Typography variant="body2">
              • For heavy-tailed distributions: convergence can be much slower
            </Typography>
            <Typography variant="body2">
              • For bimodal distributions: may require very large n for good approximation
            </Typography>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Divider />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Robust Alternatives:
            </Typography>
            <Typography variant="body2" paragraph>
              1. Trimmed Mean: Removes a percentage of extreme values before calculating mean
            </Typography>
            <Typography variant="body2" paragraph>
              2. Median: Uses the middle value, insensitive to outliers and skewness
            </Typography>
            <Typography variant="body2" paragraph>
              3. Hodges-Lehmann: Median of all pairwise averages, combines robustness with efficiency
            </Typography>
            <Typography variant="body2" paragraph>
              4. Bootstrap Methods: Uses resampling to avoid distributional assumptions
            </Typography>
            <Typography variant="body2" paragraph>
              5. Transformation: Convert data to more normal-like distribution before analysis
            </Typography>
          </Box>
        </Paper>
      </Box>
    </MathJaxContext>
  );
};

NonNormalitySimulation.propTypes = {
  projectId: PropTypes.string
};

export default NonNormalitySimulation;