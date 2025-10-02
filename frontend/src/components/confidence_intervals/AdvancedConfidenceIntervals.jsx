import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Slider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Scatter,
  ScatterChart,
  ComposedChart,
  Area
} from 'recharts';
import { confidenceIntervalCalculations, coverageProbabilitySimulation } from '../../utils/advancedStatistics';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalculateIcon from '@mui/icons-material/Calculate';
import InfoIcon from '@mui/icons-material/Info';

const AdvancedConfidenceIntervals = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState([]);
  const [sampleSize, setSampleSize] = useState(30);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [populationMean, setPopulationMean] = useState(100);
  const [populationStd, setPopulationStd] = useState(15);
  const [selectedMethod, setSelectedMethod] = useState('t-distribution');
  const [simulationResults, setSimulationResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [comparisonResults, setComparisonResults] = useState([]);

  // Generate sample data
  const generateSampleData = () => {
    const newData = [];
    for (let i = 0; i < sampleSize; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      newData.push(populationMean + populationStd * z0);
    }
    setData(newData);
  };

  useEffect(() => {
    generateSampleData();
  }, []);

  // Calculate confidence intervals based on selected method
  const calculateCI = () => {
    if (data.length === 0) return null;

    switch (selectedMethod) {
      case 't-distribution':
        return confidenceIntervalCalculations.tDistributionCI(data, confidenceLevel);
      case 'z-distribution':
        return confidenceIntervalCalculations.zDistributionCI(data, populationStd, confidenceLevel);
      case 'bootstrap-percentile':
        return confidenceIntervalCalculations.bootstrapPercentileCI(data, confidenceLevel);
      case 'bootstrap-bca':
        return confidenceIntervalCalculations.bootstrapBCaCI(data, confidenceLevel);
      default:
        return null;
    }
  };

  const currentCI = useMemo(() => calculateCI(), [data, selectedMethod, confidenceLevel]);

  // Run coverage probability simulation
  const runSimulation = async () => {
    setIsCalculating(true);
    
    // Simulate in chunks to avoid blocking UI
    setTimeout(() => {
      const sampleGenerator = (size) => {
        const sample = [];
        for (let i = 0; i < size; i++) {
          const u1 = Math.random();
          const u2 = Math.random();
          const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          sample.push(populationMean + populationStd * z0);
        }
        return sample;
      };

      const ciMethod = (sample, confLevel) => {
        switch (selectedMethod) {
          case 't-distribution':
            return confidenceIntervalCalculations.tDistributionCI(sample, confLevel);
          case 'z-distribution':
            return confidenceIntervalCalculations.zDistributionCI(sample, populationStd, confLevel);
          case 'bootstrap-percentile':
            return confidenceIntervalCalculations.bootstrapPercentileCI(sample, confLevel, 200);
          case 'bootstrap-bca':
            return confidenceIntervalCalculations.bootstrapBCaCI(sample, confLevel, 200);
          default:
            return confidenceIntervalCalculations.tDistributionCI(sample, confLevel);
        }
      };

      const results = coverageProbabilitySimulation(
        populationMean,
        sampleGenerator,
        ciMethod,
        500,
        sampleSize,
        confidenceLevel
      );

      setSimulationResults(results);
      setIsCalculating(false);
    }, 100);
  };

  // Compare multiple CI methods
  const compareAllMethods = () => {
    if (data.length === 0) return;

    const methods = [
      { name: 't-distribution', calc: () => confidenceIntervalCalculations.tDistributionCI(data, confidenceLevel) },
      { name: 'z-distribution', calc: () => confidenceIntervalCalculations.zDistributionCI(data, populationStd, confidenceLevel) },
      { name: 'bootstrap-percentile', calc: () => confidenceIntervalCalculations.bootstrapPercentileCI(data, confidenceLevel, 500) },
      { name: 'bootstrap-bca', calc: () => confidenceIntervalCalculations.bootstrapBCaCI(data, confidenceLevel, 500) }
    ];

    const results = methods.map(method => {
      const ci = method.calc();
      return {
        method: method.name,
        ...ci
      };
    });

    setComparisonResults(results);
  };

  // Visualization data preparation
  const histogramData = useMemo(() => {
    if (data.length === 0) return [];
    
    const bins = 20;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;
    
    const histogram = Array(bins).fill(0).map((_, i) => ({
      bin: min + i * binWidth,
      count: 0,
      binRange: `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`
    }));
    
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex].count++;
    });
    
    return histogram;
  }, [data]);

  const simulationVisualizationData = useMemo(() => {
    if (!simulationResults || !simulationResults.intervals) return [];
    
    return simulationResults.intervals.slice(0, 50).map((interval, index) => ({
      simulation: index + 1,
      lower: interval.lowerBound,
      upper: interval.upperBound,
      mean: interval.mean,
      contains: interval.lowerBound <= populationMean && populationMean <= interval.upperBound
    }));
  }, [simulationResults, populationMean]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Confidence Intervals Analysis
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Explore various confidence interval methods with interactive simulations and comparisons
      </Alert>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Interactive Calculator" />
          <Tab label="Coverage Simulation" />
          <Tab label="Method Comparison" />
          <Tab label="Theory & Examples" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Parameters
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>CI Method</InputLabel>
                  <Select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                  >
                    <MenuItem value="t-distribution">T-Distribution</MenuItem>
                    <MenuItem value="z-distribution">Z-Distribution</MenuItem>
                    <MenuItem value="bootstrap-percentile">Bootstrap Percentile</MenuItem>
                    <MenuItem value="bootstrap-bca">Bootstrap BCa</MenuItem>
                  </Select>
                </FormControl>

                <Typography gutterBottom>Sample Size: {sampleSize}</Typography>
                <Slider
                  value={sampleSize}
                  onChange={(e, v) => setSampleSize(v)}
                  min={10}
                  max={200}
                  step={10}
                  marks
                  sx={{ mb: 2 }}
                />

                <Typography gutterBottom>Confidence Level: {(confidenceLevel * 100).toFixed(0)}%</Typography>
                <Slider
                  value={confidenceLevel}
                  onChange={(e, v) => setConfidenceLevel(v)}
                  min={0.8}
                  max={0.99}
                  step={0.01}
                  marks={[
                    { value: 0.8, label: '80%' },
                    { value: 0.9, label: '90%' },
                    { value: 0.95, label: '95%' },
                    { value: 0.99, label: '99%' }
                  ]}
                  sx={{ mb: 2 }}
                />

                <TextField
                  label="Population Mean"
                  type="number"
                  value={populationMean}
                  onChange={(e) => setPopulationMean(Number(e.target.value))}
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <TextField
                  label="Population Std Dev"
                  type="number"
                  value={populationStd}
                  onChange={(e) => setPopulationStd(Number(e.target.value))}
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<RefreshIcon />}
                  onClick={generateSampleData}
                >
                  Generate New Sample
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sample Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="binRange" angle={-45} textAnchor="end" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                    {currentCI && (
                      <>
                        <ReferenceLine x={currentCI.mean} stroke="red" strokeWidth={2} label="Sample Mean" />
                        <ReferenceArea x1={currentCI.lowerBound} x2={currentCI.upperBound} fill="green" fillOpacity={0.2} />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {currentCI && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Confidence Interval Results
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Method</TableCell>
                          <TableCell>{currentCI.method}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Sample Mean</TableCell>
                          <TableCell>{currentCI.mean.toFixed(3)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Lower Bound</TableCell>
                          <TableCell>{currentCI.lowerBound.toFixed(3)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Upper Bound</TableCell>
                          <TableCell>{currentCI.upperBound.toFixed(3)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Margin of Error</TableCell>
                          <TableCell>{currentCI.marginOfError ? currentCI.marginOfError.toFixed(3) : 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Interval Width</TableCell>
                          <TableCell>{(currentCI.upperBound - currentCI.lowerBound).toFixed(3)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Interpretation: We are {(confidenceLevel * 100).toFixed(0)}% confident that the true population mean lies between {currentCI.lowerBound.toFixed(2)} and {currentCI.upperBound.toFixed(2)}.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Coverage Probability Simulation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Simulate multiple samples to verify that the confidence interval contains the true parameter value at the specified confidence level
                </Typography>

                <Button
                  variant="contained"
                  startIcon={isCalculating ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                  onClick={runSimulation}
                  disabled={isCalculating}
                  sx={{ mb: 3 }}
                >
                  {isCalculating ? 'Running Simulation...' : 'Run Simulation'}
                </Button>

                {simulationResults && (
                  <>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {(simulationResults.empiricalCoverage * 100).toFixed(1)}%
                          </Typography>
                          <Typography variant="body2">Empirical Coverage</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="secondary">
                            {(simulationResults.theoreticalCoverage * 100).toFixed(0)}%
                          </Typography>
                          <Typography variant="body2">Theoretical Coverage</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4">
                            {simulationResults.averageWidth.toFixed(2)}
                          </Typography>
                          <Typography variant="body2">Average Width</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4">
                            {simulationResults.numSimulations}
                          </Typography>
                          <Typography variant="body2">Simulations Run</Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    <Typography variant="h6" gutterBottom>
                      First 50 Confidence Intervals
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart data={simulationVisualizationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="simulation" />
                        <YAxis />
                        <Tooltip />
                        <ReferenceLine y={populationMean} stroke="red" strokeWidth={2} label="True Mean" />
                        {simulationVisualizationData.map((item, index) => (
                          <ReferenceLine
                            key={index}
                            segment={[
                              { x: item.simulation, y: item.lower },
                              { x: item.simulation, y: item.upper }
                            ]}
                            stroke={item.contains ? 'green' : 'red'}
                            strokeWidth={1}
                          />
                        ))}
                        <Scatter dataKey="mean" fill="#8884d8" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Method Comparison
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<CalculateIcon />}
                  onClick={compareAllMethods}
                  sx={{ mb: 3 }}
                >
                  Compare All Methods
                </Button>

                {comparisonResults.length > 0 && (
                  <>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Method</TableCell>
                            <TableCell align="right">Lower Bound</TableCell>
                            <TableCell align="right">Upper Bound</TableCell>
                            <TableCell align="right">Width</TableCell>
                            <TableCell align="right">Center</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {comparisonResults.map((result, index) => (
                            <TableRow key={index}>
                              <TableCell>{result.method}</TableCell>
                              <TableCell align="right">{result.lowerBound.toFixed(3)}</TableCell>
                              <TableCell align="right">{result.upperBound.toFixed(3)}</TableCell>
                              <TableCell align="right">{(result.upperBound - result.lowerBound).toFixed(3)}</TableCell>
                              <TableCell align="right">{((result.upperBound + result.lowerBound) / 2).toFixed(3)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Visual Comparison
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonResults}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="method" angle={-45} textAnchor="end" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="lowerBound" fill="#8884d8" />
                          <Bar dataKey="upperBound" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Theory & Examples
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    T-Distribution Method
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Used when the population standard deviation is unknown and estimated from the sample. 
                    Formula: CI = x̄ ± t(α/2, n-1) × (s/√n)
                  </Typography>
                  <Typography variant="body2">
                    <strong>When to use:</strong> Small samples (n &lt; 30) or unknown population variance
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Bootstrap Methods
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Resampling-based methods that don't require distributional assumptions.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Percentile Method:</strong> Uses percentiles of bootstrap distribution
                  </Typography>
                  <Typography variant="body2">
                    <strong>BCa Method:</strong> Corrects for bias and skewness in the bootstrap distribution
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Real-World Examples
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Clinical Trial
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Measuring drug efficacy with 95% confidence interval for mean reduction in symptoms
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Quality Control
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Estimating product defect rate with confidence bounds for process improvement
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdvancedConfidenceIntervals;