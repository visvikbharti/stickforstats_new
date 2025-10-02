import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Slider,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ReplayIcon from '@mui/icons-material/Replay';
import { MathJax } from 'better-react-mathjax';
import { Line } from 'react-chartjs-2';
import { useSnackbar } from 'notistack';

import { compareBinomialApproximations } from '../../api/probabilityDistributionsApi';

// Preset demonstration scenarios
const PRESETS = [
  {
    name: "Normal approximation works well, Poisson does not",
    description: "Large n, moderate p - Normal approximation is suitable, Poisson is not",
    n: 100,
    p: 0.3,
    usePoisson: true,
    useNormal: true,
    explanation: "When n is large (100) and p is moderate (0.3), the Normal approximation works well because both np (30) and n(1-p) (70) are well above 5. However, the Poisson approximation performs poorly because p is not small enough."
  },
  {
    name: "Poisson approximation works well, Normal does not",
    description: "Large n, very small p - Poisson approximation is suitable, Normal may not be",
    n: 1000,
    p: 0.003,
    usePoisson: true,
    useNormal: true,
    explanation: "When n is very large (1000) and p is very small (0.003), the Poisson approximation is excellent because np (3) remains moderate. The Normal approximation is less accurate because np < 5, making the distribution more skewed than a Normal."
  },
  {
    name: "Both approximations work well",
    description: "Large n, small p - Both approximations are suitable",
    n: 200,
    p: 0.04,
    usePoisson: true,
    useNormal: true,
    explanation: "With n=200 and p=0.04, both approximations work well. The Poisson works well because p is small (< 0.05), and the Normal works well because both np (8) and n(1-p) (192) exceed 5."
  },
  {
    name: "Neither approximation works well",
    description: "Small n - Neither approximation is particularly suitable",
    n: 10,
    p: 0.3,
    usePoisson: true,
    useNormal: true,
    explanation: "With small n (10), neither approximation is ideal. The Poisson fails because p is not small, and the Normal fails because np (3) < 5. In this case, using the exact Binomial probabilities is recommended."
  }
];

const BinomialApproximation = ({ projectId }) => {
  const [n, setN] = useState(20);
  const [p, setP] = useState(0.3);
  const [usePoisson, setUsePoisson] = useState(true);
  const [useNormal, setUseNormal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approximationData, setApproximationData] = useState(null);
  const [showErrorTables, setShowErrorTables] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showPresetExplanation, setShowPresetExplanation] = useState(false);

  const chartRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();
  
  // Helper function to determine if Poisson approximation is valid
  const isPoissonValid = (n, p) => {
    return n >= 20 && p <= 0.05;
  };
  
  // Helper function to determine if Normal approximation is valid
  const isNormalValid = (n, p) => {
    return n * p >= 5 && n * (1 - p) >= 5;
  };
  
  // Handle preset selection
  const handlePresetChange = (presetIndex) => {
    if (presetIndex !== null) {
      const preset = PRESETS[presetIndex];
      setN(preset.n);
      setP(preset.p);
      setUsePoisson(preset.usePoisson);
      setUseNormal(preset.useNormal);
      setSelectedPreset(presetIndex);
      setShowPresetExplanation(true);

      // Calculate approximations with the new parameters
      calculateApproximations(preset.n, preset.p, preset.usePoisson, preset.useNormal);
    } else {
      setSelectedPreset(null);
      setShowPresetExplanation(false);
    }
  };

  // Reset to custom parameters
  const handleResetToCustom = () => {
    setSelectedPreset(null);
    setShowPresetExplanation(false);
  };

  // Calculate approximations when parameters change
  useEffect(() => {
    // Don't auto-calculate on first render
    if (approximationData === null) return;

    // Don't recalculate if we just loaded a preset (to avoid double calculation)
    if (selectedPreset !== null) return;

    calculateApproximations();
  }, [n, p, usePoisson, useNormal]);
  
  // Calculate approximations
  const calculateApproximations = async (nValue = n, pValue = p, usePoissonValue = usePoisson, useNormalValue = useNormal) => {
    if (!usePoissonValue && !useNormalValue) {
      setError('Please select at least one approximation method');
      return;
    }

    setLoading(true);
    setError(null);

    const approximationTypes = [];
    if (usePoissonValue) approximationTypes.push('POISSON');
    if (useNormalValue) approximationTypes.push('NORMAL');

    try {
      const result = await compareBinomialApproximations(nValue, pValue, approximationTypes);
      setApproximationData(result);
    } catch (err) {
      console.error('Error calculating approximations:', err);
      setError('Error calculating binomial approximations');
      enqueueSnackbar('Error calculating approximations', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Save results to project
  const saveToProject = async () => {
    if (!projectId || !approximationData) return;
    
    setLoading(true);
    
    try {
      const approximationTypes = [];
      if (usePoisson) approximationTypes.push('POISSON');
      if (useNormal) approximationTypes.push('NORMAL');
      
      await compareBinomialApproximations(
        n, p, approximationTypes, true, projectId
      );
      
      enqueueSnackbar('Approximation results saved to project', { variant: 'success' });
    } catch (err) {
      console.error('Error saving approximation results:', err);
      enqueueSnackbar('Error saving results', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare chart data
  const getChartData = () => {
    if (!approximationData) return null;
    
    const datasets = [
      {
        label: 'Binomial',
        data: approximationData.binomial_pmf.map((y, i) => ({
          x: i,
          y
        })),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }
    ];
    
    if (usePoisson && approximationData.poisson_pmf) {
      datasets.push({
        label: 'Poisson Approximation',
        data: approximationData.poisson_pmf.map((y, i) => ({
          x: i,
          y
        })),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        borderDash: [5, 5]
      });
    }
    
    if (useNormal && approximationData.normal_pmf) {
      datasets.push({
        label: 'Normal Approximation',
        data: approximationData.x_values.map((x, i) => ({
          x,
          y: approximationData.normal_pmf[i]
        })),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        borderDash: [10, 5]
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
        },
        beginAtZero: true,
        ticks: {
          // For discrete distributions, ensure only integers are shown
          callback: function(value) {
            if (value % 1 === 0) {
              return value;
            }
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Probability Mass Function'
        },
        min: 0
      }
    },
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            return `Value: ${context[0].parsed.x}`;
          },
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(6)}`;
          }
        }
      }
    }
  };
  
  // Get error metrics for approximations
  const getErrorMetrics = () => {
    if (!approximationData) return null;
    
    const metrics = {
      poisson: null,
      normal: null
    };
    
    if (usePoisson && approximationData.poisson_pmf) {
      const mse = approximationData.error_metrics.poisson.mse;
      const mae = approximationData.error_metrics.poisson.mae;
      const maxError = approximationData.error_metrics.poisson.max_error;
      const kl = approximationData.error_metrics.poisson.kl_divergence;
      
      metrics.poisson = { mse, mae, maxError, kl };
    }
    
    if (useNormal && approximationData.normal_pmf) {
      const mse = approximationData.error_metrics.normal.mse;
      const mae = approximationData.error_metrics.normal.mae;
      const maxError = approximationData.error_metrics.normal.max_error;
      const kl = approximationData.error_metrics.normal.kl_divergence;
      
      metrics.normal = { mse, mae, maxError, kl };
    }
    
    return metrics;
  };
  
  // Prepare approximation comparison table data
  const getApproximationTableData = () => {
    if (!approximationData) return [];
    
    // Determine range of values to show
    const mean = n * p;
    const stdDev = Math.sqrt(n * p * (1 - p));
    
    // Show values within 3 standard deviations of the mean
    let minValue = Math.max(0, Math.floor(mean - 3 * stdDev));
    let maxValue = Math.min(n, Math.ceil(mean + 3 * stdDev));
    
    // Ensure we don't show too many rows
    if (maxValue - minValue > 20) {
      minValue = Math.max(0, Math.floor(mean - 2 * stdDev));
      maxValue = Math.min(n, Math.ceil(mean + 2 * stdDev));
    }
    
    const rows = [];
    
    for (let k = minValue; k <= maxValue; k++) {
      const binomialValue = approximationData.binomial_pmf[k] || 0;
      const poissonValue = usePoisson && approximationData.poisson_pmf 
        ? approximationData.poisson_pmf[k] || 0 
        : null;
      const normalValue = useNormal && approximationData.normal_pmf
        ? approximationData.normal_pmf[approximationData.x_values.indexOf(k)] || 0
        : null;
      
      const poissonError = poissonValue !== null
        ? poissonValue - binomialValue
        : null;
      
      const normalError = normalValue !== null
        ? normalValue - binomialValue
        : null;
      
      rows.push({
        k,
        binomial: binomialValue,
        poisson: poissonValue,
        poissonError,
        normal: normalValue,
        normalError
      });
    }
    
    return rows;
  };
  
  const chartData = getChartData();
  const errorMetrics = getErrorMetrics();
  const tableData = getApproximationTableData();
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Binomial Approximations
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Compare the binomial distribution with its Poisson and Normal approximations.
        Learn when and how these approximations can be used.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Parameters
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                <InputLabel id="preset-demo-select-label">Demonstration Presets</InputLabel>
                <Select
                  labelId="preset-demo-select-label"
                  id="preset-demo-select"
                  value={selectedPreset !== null ? selectedPreset : ''}
                  onChange={(e) => handlePresetChange(e.target.value !== '' ? e.target.value : null)}
                  label="Demonstration Presets"
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>Custom Parameters</em>
                  </MenuItem>
                  {PRESETS.map((preset, index) => (
                    <MenuItem key={index} value={index}>
                      {preset.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedPreset !== null && showPresetExplanation && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'info.lightest' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {PRESETS[selectedPreset].description}
                  </Typography>
                  <Typography variant="body2">
                    {PRESETS[selectedPreset].explanation}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button
                      startIcon={<ReplayIcon />}
                      onClick={handleResetToCustom}
                      size="small"
                    >
                      Reset to Custom
                    </Button>
                  </Box>
                </Paper>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" gutterBottom>
                  Number of Trials (n): {n}
                </Typography>
                <Tooltip title="The number of independent trials in the binomial distribution">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Slider
                value={n}
                onChange={(e, newValue) => {
                  setN(newValue);
                  setSelectedPreset(null);
                }}
                min={5}
                max={1000}
                step={1}
                marks={[
                  { value: 5, label: '5' },
                  { value: 50, label: '50' },
                  { value: 500, label: '500' },
                  { value: 1000, label: '1000' }
                ]}
                disabled={loading || selectedPreset !== null}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" gutterBottom>
                  Probability of Success (p): {p.toFixed(3)}
                </Typography>
                <Tooltip title="The probability of success in each trial">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Slider
                value={p}
                onChange={(e, newValue) => {
                  setP(newValue);
                  setSelectedPreset(null);
                }}
                min={0.001}
                max={0.999}
                step={0.001}
                marks={[
                  { value: 0.01, label: '0.01' },
                  { value: 0.1, label: '0.1' },
                  { value: 0.5, label: '0.5' },
                  { value: 0.9, label: '0.9' }
                ]}
                disabled={loading || selectedPreset !== null}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Approximation Methods
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={usePoisson}
                    onChange={(e) => {
                      setUsePoisson(e.target.checked);
                      setSelectedPreset(null);
                    }}
                    disabled={loading || selectedPreset !== null}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Poisson Approximation
                    {!isPoissonValid(n, p) && (
                      <Chip
                        label="Not Recommended"
                        size="small"
                        color="warning"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={useNormal}
                    onChange={(e) => {
                      setUseNormal(e.target.checked);
                      setSelectedPreset(null);
                    }}
                    disabled={loading || selectedPreset !== null}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Normal Approximation
                    {!isNormalValid(n, p) && (
                      <Chip
                        label="Not Recommended"
                        size="small"
                        color="warning"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                }
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => calculateApproximations()}
                disabled={loading || (!usePoisson && !useNormal)}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Calculate
              </Button>

              {projectId && approximationData && (
                <Button
                  variant="outlined"
                  onClick={saveToProject}
                  disabled={loading}
                >
                  Save to Project
                </Button>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
          
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Conditions for Valid Approximations
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Poisson Approximation
                </Typography>
                <Typography variant="body2" paragraph>
                  Valid when:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2">• n is large (typically n ≥ 20)</Typography>
                  <Typography variant="body2">• p is small (typically p ≤ 0.05)</Typography>
                  <Typography variant="body2">• np is moderate (typically np ≤ 10)</Typography>
                </Box>
                
                <Box sx={{ mt: 2, p: 1, bgcolor: isPoissonValid(n, p) ? 'success.lightest' : 'warning.lightest', borderRadius: 1 }}>
                  <Typography variant="body2">
                    Current values: n = {n}, p = {p.toFixed(3)}, np = {(n * p).toFixed(3)}
                  </Typography>
                  <Typography variant="body2">
                    Status: {isPoissonValid(n, p) 
                      ? 'Poisson approximation is appropriate' 
                      : 'Poisson approximation is not recommended'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Normal Approximation
                </Typography>
                <Typography variant="body2" paragraph>
                  Valid when:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2">• np ≥ 5 (success count is large enough)</Typography>
                  <Typography variant="body2">• n(1-p) ≥ 5 (failure count is large enough)</Typography>
                </Box>
                
                <Box sx={{ mt: 2, p: 1, bgcolor: isNormalValid(n, p) ? 'success.lightest' : 'warning.lightest', borderRadius: 1 }}>
                  <Typography variant="body2">
                    Current values: n = {n}, p = {p.toFixed(3)}, np = {(n * p).toFixed(3)}, n(1-p) = {(n * (1-p)).toFixed(3)}
                  </Typography>
                  <Typography variant="body2">
                    Status: {isNormalValid(n, p) 
                      ? 'Normal approximation is appropriate' 
                      : 'Normal approximation is not recommended'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400, position: 'relative' }}>
            <Typography variant="subtitle1" gutterBottom>
              Distribution Comparison
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
              </Box>
            ) : !approximationData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Typography variant="body2" color="text.secondary">
                  Click "Calculate" to compare distributions
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
          
          {approximationData && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Approximation Accuracy
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    Binomial Distribution: B(n={n}, p={p.toFixed(3)})
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {usePoisson && errorMetrics?.poisson && (
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Poisson Approximation
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              Parameter: λ = np = {(n * p).toFixed(3)}
                            </Typography>
                            
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">Mean Absolute Error</Typography>
                              <Typography variant="body2">{errorMetrics.poisson.mae.toFixed(6)}</Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">Maximum Error</Typography>
                              <Typography variant="body2">{errorMetrics.poisson.maxError.toFixed(6)}</Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">KL Divergence</Typography>
                              <Typography variant="body2">{errorMetrics.poisson.kl.toFixed(6)}</Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                    
                    {useNormal && errorMetrics?.normal && (
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Normal Approximation
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              Parameters: μ = np = {(n * p).toFixed(3)}, σ = √(np(1-p)) = {Math.sqrt(n * p * (1-p)).toFixed(3)}
                            </Typography>
                            
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">Mean Absolute Error</Typography>
                              <Typography variant="body2">{errorMetrics.normal.mae.toFixed(6)}</Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">Maximum Error</Typography>
                              <Typography variant="body2">{errorMetrics.normal.maxError.toFixed(6)}</Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">KL Divergence</Typography>
                              <Typography variant="body2">{errorMetrics.normal.kl.toFixed(6)}</Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      {getApproximationInterpretation(n, p, usePoisson, useNormal, errorMetrics)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="text" 
                      onClick={() => setShowErrorTables(!showErrorTables)}
                      sx={{ textTransform: 'none' }}
                    >
                      {showErrorTables ? 'Hide Probability Table' : 'Show Probability Table'}
                    </Button>
                    
                    {showErrorTables && tableData.length > 0 && (
                      <TableContainer sx={{ mt: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>k</TableCell>
                              <TableCell align="right">Binomial PMF</TableCell>
                              {usePoisson && (
                                <>
                                  <TableCell align="right">Poisson PMF</TableCell>
                                  <TableCell align="right">Poisson Error</TableCell>
                                </>
                              )}
                              {useNormal && (
                                <>
                                  <TableCell align="right">Normal PMF</TableCell>
                                  <TableCell align="right">Normal Error</TableCell>
                                </>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {tableData.map((row) => (
                              <TableRow key={row.k}>
                                <TableCell>{row.k}</TableCell>
                                <TableCell align="right">{row.binomial.toFixed(6)}</TableCell>
                                {usePoisson && (
                                  <>
                                    <TableCell align="right">{row.poisson?.toFixed(6) || 'N/A'}</TableCell>
                                    <TableCell 
                                      align="right"
                                      sx={{ 
                                        color: row.poissonError > 0 ? 'success.main' : 'error.main',
                                        fontWeight: Math.abs(row.poissonError) > 0.01 ? 'bold' : 'normal'
                                      }}
                                    >
                                      {row.poissonError?.toFixed(6) || 'N/A'}
                                    </TableCell>
                                  </>
                                )}
                                {useNormal && (
                                  <>
                                    <TableCell align="right">{row.normal?.toFixed(6) || 'N/A'}</TableCell>
                                    <TableCell 
                                      align="right"
                                      sx={{ 
                                        color: row.normalError > 0 ? 'success.main' : 'error.main',
                                        fontWeight: Math.abs(row.normalError) > 0.01 ? 'bold' : 'normal'
                                      }}
                                    >
                                      {row.normalError?.toFixed(6) || 'N/A'}
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Mathematical Foundation
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom>
                        Binomial Distribution
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <MathJax>{"$$P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}$$"}</MathJax>
                      </Box>
                      <Typography variant="body2">
                        Mean: np = {(n * p).toFixed(3)}
                      </Typography>
                      <Typography variant="body2">
                        Variance: np(1-p) = {(n * p * (1-p)).toFixed(3)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom>
                        Poisson Approximation
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <MathJax>{"$$P(X = k) \\approx \\frac{e^{-\\lambda} \\lambda^k}{k!} \\quad \\text{where } \\lambda = np$$"}</MathJax>
                      </Box>
                      <Typography variant="body2">
                        Mean: λ = {(n * p).toFixed(3)}
                      </Typography>
                      <Typography variant="body2">
                        Variance: λ = {(n * p).toFixed(3)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom>
                        Normal Approximation
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <MathJax>{"$$P(X = k) \\approx \\Phi\\left(\\frac{k+0.5-np}{\\sqrt{np(1-p)}}\\right) - \\Phi\\left(\\frac{k-0.5-np}{\\sqrt{np(1-p)}}\\right)$$"}</MathJax>
                      </Box>
                      <Typography variant="body2">
                        Mean: μ = np = {(n * p).toFixed(3)}
                      </Typography>
                      <Typography variant="body2">
                        Std Dev: σ = √(np(1-p)) = {Math.sqrt(n * p * (1-p)).toFixed(3)}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Key Insights:
                  </Typography>
                  
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      • The Poisson approximation works well when n is large and p is small, because the 
                      Poisson distribution is the limit of the binomial distribution as n → ∞ and p → 0, 
                      with np remaining constant.
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>
                      • The Normal approximation works well when both np and n(1-p) are sufficiently large
                      (typically ≥ 5), due to the Central Limit Theorem. The continuity correction (±0.5) 
                      improves accuracy by accounting for the discrete nature of the binomial distribution.
                    </Typography>
                    
                    <Typography variant="body2">
                      • When p is close to 0.5, the binomial distribution becomes more symmetric, making 
                      the normal approximation more accurate. As p approaches 0 or 1, the distribution 
                      becomes more skewed, reducing the accuracy of the normal approximation.
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper function to generate interpretation text
const getApproximationInterpretation = (n, p, usePoisson, useNormal, errorMetrics) => {
  if (!errorMetrics) return '';
  
  let interpretation = `For a binomial distribution with n=${n} and p=${p.toFixed(3)}, `;
  
  // Add Poisson interpretation if used
  if (usePoisson && errorMetrics.poisson) {
    const poissonValid = isPoissonValid(n, p);
    const poissonError = errorMetrics.poisson.mae;
    
    if (poissonValid) {
      interpretation += `the Poisson approximation with λ=${(n*p).toFixed(3)} is appropriate and `;
      
      if (poissonError < 0.001) {
        interpretation += `provides excellent accuracy (mean absolute error: ${poissonError.toFixed(6)}). `;
      } else if (poissonError < 0.01) {
        interpretation += `provides good accuracy (mean absolute error: ${poissonError.toFixed(6)}). `;
      } else {
        interpretation += `provides reasonable accuracy (mean absolute error: ${poissonError.toFixed(6)}). `;
      }
    } else {
      interpretation += `the Poisson approximation is not ideal (since n=${n} and p=${p.toFixed(3)} don't meet the criteria of large n and small p), resulting in a mean absolute error of ${poissonError.toFixed(6)}. `;
    }
  }
  
  // Add Normal interpretation if used
  if (useNormal && errorMetrics.normal) {
    const normalValid = isNormalValid(n, p);
    const normalError = errorMetrics.normal.mae;
    
    if (normalValid) {
      interpretation += `the Normal approximation with μ=${(n*p).toFixed(3)} and σ=${Math.sqrt(n*p*(1-p)).toFixed(3)} is appropriate and `;
      
      if (normalError < 0.001) {
        interpretation += `provides excellent accuracy (mean absolute error: ${normalError.toFixed(6)}). `;
      } else if (normalError < 0.01) {
        interpretation += `provides good accuracy (mean absolute error: ${normalError.toFixed(6)}). `;
      } else {
        interpretation += `provides reasonable accuracy (mean absolute error: ${normalError.toFixed(6)}). `;
      }
    } else {
      interpretation += `the Normal approximation is not ideal (since np=${(n*p).toFixed(3)} or n(1-p)=${(n*(1-p)).toFixed(3)} may be too small), resulting in a mean absolute error of ${normalError.toFixed(6)}. `;
    }
  }
  
  // Compare approximations if both are used
  if (usePoisson && useNormal && errorMetrics.poisson && errorMetrics.normal) {
    const poissonError = errorMetrics.poisson.mae;
    const normalError = errorMetrics.normal.mae;
    
    if (poissonError < normalError) {
      interpretation += `In this case, the Poisson approximation (error: ${poissonError.toFixed(6)}) is more accurate than the Normal approximation (error: ${normalError.toFixed(6)}). `;
    } else if (normalError < poissonError) {
      interpretation += `In this case, the Normal approximation (error: ${normalError.toFixed(6)}) is more accurate than the Poisson approximation (error: ${poissonError.toFixed(6)}). `;
    } else {
      interpretation += `Both approximations provide similar levels of accuracy. `;
    }
  }
  
  // Add practical advice
  interpretation += `Approximations are useful for computational efficiency, especially for large values of n, where exact binomial calculations become challenging.`;
  
  return interpretation;
};

// Helper function to determine if Poisson approximation is valid
const isPoissonValid = (n, p) => {
  return n >= 20 && p <= 0.05;
};

// Helper function to determine if Normal approximation is valid
const isNormalValid = (n, p) => {
  return n * p >= 5 && n * (1 - p) >= 5;
};

export default BinomialApproximation;