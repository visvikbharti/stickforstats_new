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
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
  Area,
  ComposedChart
} from 'recharts';
import { advancedProbabilityCalculations } from '../../utils/advancedStatistics';
import jStat from 'jstat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SchoolIcon from '@mui/icons-material/School';

const AdvancedProbabilityDistributions = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDistribution, setSelectedDistribution] = useState('normal');
  const [viewMode, setViewMode] = useState('pdf');
  
  // Distribution parameters
  const [normalParams, setNormalParams] = useState({ mean: 0, std: 1 });
  const [binomialParams, setBinomialParams] = useState({ n: 10, p: 0.5 });
  const [poissonParams, setPoissonParams] = useState({ lambda: 3 });
  const [exponentialParams, setExponentialParams] = useState({ rate: 1 });
  const [gammaParams, setGammaParams] = useState({ shape: 2, scale: 1 });
  const [betaParams, setBetaParams] = useState({ alpha: 2, beta: 2 });
  
  // Comparison settings
  const [compareDistributions, setCompareDistributions] = useState([]);
  const [approximationSettings, setApproximationSettings] = useState({
    showPoisson: false,
    showNormal: false,
    useContinuityCorrection: true
  });

  // Calculate distribution values
  const calculateDistributionData = (dist, params, xRange) => {
    const data = [];
    const [xMin, xMax, step] = xRange;
    
    for (let x = xMin; x <= xMax; x += step) {
      let y = 0;
      let cdf = 0;
      
      switch (dist) {
        case 'normal':
          y = jStat.normal.pdf(x, params.mean, params.std);
          cdf = jStat.normal.cdf(x, params.mean, params.std);
          break;
        case 'binomial':
          if (x >= 0 && x <= params.n && Number.isInteger(x)) {
            y = jStat.binomial.pdf(x, params.n, params.p);
            cdf = jStat.binomial.cdf(x, params.n, params.p);
          }
          break;
        case 'poisson':
          if (x >= 0 && Number.isInteger(x)) {
            y = jStat.poisson.pdf(x, params.lambda);
            cdf = jStat.poisson.cdf(x, params.lambda);
          }
          break;
        case 'exponential':
          if (x >= 0) {
            y = jStat.exponential.pdf(x, params.rate);
            cdf = jStat.exponential.cdf(x, params.rate);
          }
          break;
        case 'gamma':
          if (x >= 0) {
            y = jStat.gamma.pdf(x, params.shape, params.scale);
            cdf = jStat.gamma.cdf(x, params.shape, params.scale);
          }
          break;
        case 'beta':
          if (x >= 0 && x <= 1) {
            y = jStat.beta.pdf(x, params.alpha, params.beta);
            cdf = jStat.beta.cdf(x, params.alpha, params.beta);
          }
          break;
      }
      
      data.push({ x, pdf: y, cdf });
    }
    
    return data;
  };

  // Get appropriate x-range for distribution
  const getXRange = (dist, params) => {
    switch (dist) {
      case 'normal':
        return [params.mean - 4 * params.std, params.mean + 4 * params.std, params.std / 20];
      case 'binomial':
        return [0, params.n, 1];
      case 'poisson':
        return [0, Math.max(20, params.lambda * 3), 1];
      case 'exponential':
        return [0, Math.max(5, 5 / params.rate), 0.1];
      case 'gamma':
        return [0, Math.max(10, params.shape * params.scale * 3), 0.1];
      case 'beta':
        return [0, 1, 0.01];
      default:
        return [-5, 5, 0.1];
    }
  };

  // Get current parameters
  const getCurrentParams = () => {
    switch (selectedDistribution) {
      case 'normal': return normalParams;
      case 'binomial': return binomialParams;
      case 'poisson': return poissonParams;
      case 'exponential': return exponentialParams;
      case 'gamma': return gammaParams;
      case 'beta': return betaParams;
      default: return {};
    }
  };

  // Main distribution data
  const distributionData = useMemo(() => {
    const params = getCurrentParams();
    const xRange = getXRange(selectedDistribution, params);
    return calculateDistributionData(selectedDistribution, params, xRange);
  }, [selectedDistribution, normalParams, binomialParams, poissonParams, exponentialParams, gammaParams, betaParams]);

  // Calculate approximation data
  const approximationData = useMemo(() => {
    if (selectedDistribution !== 'binomial') return null;
    
    const data = {};
    const xRange = getXRange('binomial', binomialParams);
    
    // Poisson approximation
    if (approximationSettings.showPoisson) {
      const poissonApprox = advancedProbabilityCalculations.poissonApproximation(
        binomialParams.n, 
        binomialParams.p
      );
      
      if (poissonApprox.useApproximation) {
        data.poisson = calculateDistributionData(
          'poisson', 
          { lambda: poissonApprox.lambda }, 
          xRange
        );
      }
    }
    
    // Normal approximation
    if (approximationSettings.showNormal) {
      const normalApprox = advancedProbabilityCalculations.normalApproximation(
        binomialParams.n, 
        binomialParams.p
      );
      
      if (normalApprox.useApproximation) {
        data.normal = calculateDistributionData(
          'normal', 
          { mean: normalApprox.mean, std: normalApprox.std }, 
          xRange
        );
      }
    }
    
    return data;
  }, [selectedDistribution, binomialParams, approximationSettings]);

  // Calculate statistics
  const distributionStats = useMemo(() => {
    const params = getCurrentParams();
    let mean, variance, std, skewness, kurtosis;
    
    switch (selectedDistribution) {
      case 'normal':
        mean = params.mean;
        variance = params.std * params.std;
        std = params.std;
        skewness = 0;
        kurtosis = 3;
        break;
      case 'binomial':
        mean = params.n * params.p;
        variance = params.n * params.p * (1 - params.p);
        std = Math.sqrt(variance);
        skewness = (1 - 2 * params.p) / std;
        kurtosis = 3 + (1 - 6 * params.p * (1 - params.p)) / variance;
        break;
      case 'poisson':
        mean = params.lambda;
        variance = params.lambda;
        std = Math.sqrt(params.lambda);
        skewness = 1 / Math.sqrt(params.lambda);
        kurtosis = 3 + 1 / params.lambda;
        break;
      case 'exponential':
        mean = 1 / params.rate;
        variance = 1 / (params.rate * params.rate);
        std = 1 / params.rate;
        skewness = 2;
        kurtosis = 9;
        break;
      case 'gamma':
        mean = params.shape * params.scale;
        variance = params.shape * params.scale * params.scale;
        std = Math.sqrt(variance);
        skewness = 2 / Math.sqrt(params.shape);
        kurtosis = 3 + 6 / params.shape;
        break;
      case 'beta':
        mean = params.alpha / (params.alpha + params.beta);
        variance = (params.alpha * params.beta) / 
                  ((params.alpha + params.beta) * (params.alpha + params.beta) * 
                   (params.alpha + params.beta + 1));
        std = Math.sqrt(variance);
        // Beta distribution skewness and kurtosis formulas are complex
        skewness = 2 * (params.beta - params.alpha) * Math.sqrt(params.alpha + params.beta + 1) /
                  ((params.alpha + params.beta + 2) * Math.sqrt(params.alpha * params.beta));
        kurtosis = 3; // Simplified
        break;
    }
    
    return { mean, variance, std, skewness, kurtosis };
  }, [selectedDistribution, normalParams, binomialParams, poissonParams, exponentialParams, gammaParams, betaParams]);

  // Parameter controls for each distribution
  const ParameterControls = () => {
    switch (selectedDistribution) {
      case 'normal':
        return (
          <>
            <Typography gutterBottom>Mean (μ): {normalParams.mean}</Typography>
            <Slider
              value={normalParams.mean}
              onChange={(e, v) => setNormalParams({ ...normalParams, mean: v })}
              min={-10}
              max={10}
              step={0.1}
              marks
              sx={{ mb: 2 }}
            />
            <Typography gutterBottom>Standard Deviation (σ): {normalParams.std}</Typography>
            <Slider
              value={normalParams.std}
              onChange={(e, v) => setNormalParams({ ...normalParams, std: v })}
              min={0.1}
              max={5}
              step={0.1}
              marks
              sx={{ mb: 2 }}
            />
          </>
        );
      case 'binomial':
        return (
          <>
            <Typography gutterBottom>Number of Trials (n): {binomialParams.n}</Typography>
            <Slider
              value={binomialParams.n}
              onChange={(e, v) => setBinomialParams({ ...binomialParams, n: v })}
              min={1}
              max={100}
              step={1}
              marks
              sx={{ mb: 2 }}
            />
            <Typography gutterBottom>Success Probability (p): {binomialParams.p}</Typography>
            <Slider
              value={binomialParams.p}
              onChange={(e, v) => setBinomialParams({ ...binomialParams, p: v })}
              min={0.01}
              max={0.99}
              step={0.01}
              marks={[
                { value: 0.01, label: '0.01' },
                { value: 0.5, label: '0.5' },
                { value: 0.99, label: '0.99' }
              ]}
              sx={{ mb: 2 }}
            />
          </>
        );
      case 'poisson':
        return (
          <>
            <Typography gutterBottom>Rate Parameter (λ): {poissonParams.lambda}</Typography>
            <Slider
              value={poissonParams.lambda}
              onChange={(e, v) => setPoissonParams({ lambda: v })}
              min={0.1}
              max={20}
              step={0.1}
              marks
              sx={{ mb: 2 }}
            />
          </>
        );
      case 'exponential':
        return (
          <>
            <Typography gutterBottom>Rate (λ): {exponentialParams.rate}</Typography>
            <Slider
              value={exponentialParams.rate}
              onChange={(e, v) => setExponentialParams({ rate: v })}
              min={0.1}
              max={5}
              step={0.1}
              marks
              sx={{ mb: 2 }}
            />
          </>
        );
      case 'gamma':
        return (
          <>
            <Typography gutterBottom>Shape (α): {gammaParams.shape}</Typography>
            <Slider
              value={gammaParams.shape}
              onChange={(e, v) => setGammaParams({ ...gammaParams, shape: v })}
              min={0.1}
              max={10}
              step={0.1}
              marks
              sx={{ mb: 2 }}
            />
            <Typography gutterBottom>Scale (β): {gammaParams.scale}</Typography>
            <Slider
              value={gammaParams.scale}
              onChange={(e, v) => setGammaParams({ ...gammaParams, scale: v })}
              min={0.1}
              max={5}
              step={0.1}
              marks
              sx={{ mb: 2 }}
            />
          </>
        );
      case 'beta':
        return (
          <>
            <Typography gutterBottom>Alpha (α): {betaParams.alpha}</Typography>
            <Slider
              value={betaParams.alpha}
              onChange={(e, v) => setBetaParams({ ...betaParams, alpha: v })}
              min={0.1}
              max={10}
              step={0.1}
              marks
              sx={{ mb: 2 }}
            />
            <Typography gutterBottom>Beta (β): {betaParams.beta}</Typography>
            <Slider
              value={betaParams.beta}
              onChange={(e, v) => setBetaParams({ ...betaParams, beta: v })}
              min={0.1}
              max={10}
              step={0.1}
              marks
              sx={{ mb: 2 }}
            />
          </>
        );
      default:
        return null;
    }
  };

  // Real-world examples for each distribution
  const getRealWorldExamples = (dist) => {
    const examples = {
      normal: [
        { title: "Human Height", description: "Adult heights follow a normal distribution with mean ~170cm and std ~10cm" },
        { title: "Test Scores", description: "Standardized test scores often follow normal distribution" },
        { title: "Measurement Errors", description: "Random measurement errors typically follow normal distribution" }
      ],
      binomial: [
        { title: "Clinical Trials", description: "Number of patients responding to treatment out of n patients" },
        { title: "Quality Control", description: "Number of defective items in a batch" },
        { title: "A/B Testing", description: "Number of users clicking a button in website testing" }
      ],
      poisson: [
        { title: "Customer Arrivals", description: "Number of customers arriving at a store per hour" },
        { title: "Server Requests", description: "Number of requests to a web server per minute" },
        { title: "Radioactive Decay", description: "Number of decay events in a fixed time interval" }
      ],
      exponential: [
        { title: "Wait Times", description: "Time between customer arrivals at a service point" },
        { title: "Component Lifetime", description: "Time until failure of electronic components" },
        { title: "Download Time", description: "Time to download files from a server" }
      ],
      gamma: [
        { title: "Insurance Claims", description: "Total claim amount in insurance applications" },
        { title: "Rainfall", description: "Amount of rainfall in a given period" },
        { title: "Service Time", description: "Total time to serve multiple customers" }
      ],
      beta: [
        { title: "Project Completion", description: "Proportion of project completed by a deadline" },
        { title: "Conversion Rates", description: "Website conversion rate estimation" },
        { title: "Bayesian Priors", description: "Prior distributions for probabilities in Bayesian analysis" }
      ]
    };
    
    return examples[dist] || [];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Probability Distributions
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Explore probability distributions with interactive parameters, approximations, and real-world applications
      </Alert>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Interactive Explorer" />
          <Tab label="Distribution Comparison" />
          <Tab label="Approximations" />
          <Tab label="Applications & Theory" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Distribution Settings
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Distribution Type</InputLabel>
                  <Select
                    value={selectedDistribution}
                    onChange={(e) => setSelectedDistribution(e.target.value)}
                  >
                    <MenuItem value="normal">Normal (Gaussian)</MenuItem>
                    <MenuItem value="binomial">Binomial</MenuItem>
                    <MenuItem value="poisson">Poisson</MenuItem>
                    <MenuItem value="exponential">Exponential</MenuItem>
                    <MenuItem value="gamma">Gamma</MenuItem>
                    <MenuItem value="beta">Beta</MenuItem>
                  </Select>
                </FormControl>

                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, v) => v && setViewMode(v)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="pdf">PDF/PMF</ToggleButton>
                  <ToggleButton value="cdf">CDF</ToggleButton>
                  <ToggleButton value="both">Both</ToggleButton>
                </ToggleButtonGroup>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  Parameters
                </Typography>

                <ParameterControls />

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  Distribution Properties
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Mean</TableCell>
                        <TableCell align="right">{distributionStats.mean.toFixed(3)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Variance</TableCell>
                        <TableCell align="right">{distributionStats.variance.toFixed(3)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Std Dev</TableCell>
                        <TableCell align="right">{distributionStats.std.toFixed(3)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Skewness</TableCell>
                        <TableCell align="right">{distributionStats.skewness.toFixed(3)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Kurtosis</TableCell>
                        <TableCell align="right">{distributionStats.kurtosis.toFixed(3)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Distribution Visualization
                </Typography>

                <ResponsiveContainer width="100%" height={400}>
                  {selectedDistribution === 'binomial' || selectedDistribution === 'poisson' ? (
                    <BarChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toFixed(4)} />
                      <Legend />
                      {(viewMode === 'pdf' || viewMode === 'both') && (
                        <Bar dataKey="pdf" fill="#8884d8" name="PMF" />
                      )}
                      {(viewMode === 'cdf' || viewMode === 'both') && (
                        <Bar dataKey="cdf" fill="#82ca9d" name="CDF" />
                      )}
                    </BarChart>
                  ) : (
                    <LineChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toFixed(4)} />
                      <Legend />
                      {(viewMode === 'pdf' || viewMode === 'both') && (
                        <Line type="monotone" dataKey="pdf" stroke="#8884d8" name="PDF" strokeWidth={2} dot={false} />
                      )}
                      {(viewMode === 'cdf' || viewMode === 'both') && (
                        <Line type="monotone" dataKey="cdf" stroke="#82ca9d" name="CDF" strokeWidth={2} dot={false} />
                      )}
                      <ReferenceLine x={distributionStats.mean} stroke="red" strokeDasharray="5 5" label="Mean" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Grid container spacing={2}>
              {getRealWorldExamples(selectedDistribution).map((example, index) => (
                <Grid item xs={12} sm={4} key={index}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      {example.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {example.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compare Multiple Distributions
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Select Distributions to Compare</InputLabel>
                      <Select
                        multiple
                        value={compareDistributions}
                        onChange={(e) => setCompareDistributions(e.target.value)}
                        renderValue={(selected) => selected.join(', ')}
                      >
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="binomial">Binomial</MenuItem>
                        <MenuItem value="poisson">Poisson</MenuItem>
                        <MenuItem value="exponential">Exponential</MenuItem>
                        <MenuItem value="gamma">Gamma</MenuItem>
                        <MenuItem value="beta">Beta</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button
                      variant="contained"
                      startIcon={<CompareArrowsIcon />}
                      fullWidth
                      disabled={compareDistributions.length < 2}
                    >
                      Compare Selected
                    </Button>
                  </Grid>
                </Grid>

                {compareDistributions.length >= 2 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Visual Comparison
                    </Typography>
                    {/* Comparison chart would go here */}
                    <Alert severity="info">
                      Comparison visualization for {compareDistributions.join(' vs ')}
                    </Alert>
                  </Box>
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
                  Distribution Approximations
                </Typography>

                {selectedDistribution === 'binomial' ? (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      The Binomial distribution can be approximated by other distributions under certain conditions
                    </Alert>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Poisson Approximation
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            When n is large and p is small (n ≥ 20, p ≤ 0.05)
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setApproximationSettings({
                              ...approximationSettings,
                              showPoisson: !approximationSettings.showPoisson
                            })}
                          >
                            {approximationSettings.showPoisson ? 'Hide' : 'Show'} Approximation
                          </Button>
                          {approximationSettings.showPoisson && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2">
                                λ = np = {(binomialParams.n * binomialParams.p).toFixed(2)}
                              </Typography>
                              <Typography variant="body2" color={
                                binomialParams.n >= 20 && binomialParams.p <= 0.05 ? 'success.main' : 'error.main'
                              }>
                                Quality: {binomialParams.n >= 20 && binomialParams.p <= 0.05 ? 'Good' : 'Poor'}
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Normal Approximation
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            When np ≥ 5 and n(1-p) ≥ 5
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setApproximationSettings({
                              ...approximationSettings,
                              showNormal: !approximationSettings.showNormal
                            })}
                          >
                            {approximationSettings.showNormal ? 'Hide' : 'Show'} Approximation
                          </Button>
                          {approximationSettings.showNormal && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2">
                                μ = np = {(binomialParams.n * binomialParams.p).toFixed(2)}
                              </Typography>
                              <Typography variant="body2">
                                σ = √(np(1-p)) = {Math.sqrt(binomialParams.n * binomialParams.p * (1 - binomialParams.p)).toFixed(2)}
                              </Typography>
                              <Typography variant="body2" color={
                                binomialParams.n * binomialParams.p >= 5 && 
                                binomialParams.n * (1 - binomialParams.p) >= 5 ? 'success.main' : 'error.main'
                              }>
                                Quality: {
                                  binomialParams.n * binomialParams.p >= 5 && 
                                  binomialParams.n * (1 - binomialParams.p) >= 5 ? 'Good' : 'Poor'
                                }
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>

                    {(approximationSettings.showPoisson || approximationSettings.showNormal) && (
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={distributionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="pdf" fill="#8884d8" name="Binomial PMF" opacity={0.7} />
                          {approximationSettings.showPoisson && approximationData?.poisson && (
                            <Line
                              type="monotone"
                              data={approximationData.poisson}
                              dataKey="pdf"
                              stroke="#ff7300"
                              name="Poisson Approximation"
                              strokeWidth={2}
                              dot={false}
                            />
                          )}
                          {approximationSettings.showNormal && approximationData?.normal && (
                            <Line
                              type="monotone"
                              data={approximationData.normal}
                              dataKey="pdf"
                              stroke="#82ca9d"
                              name="Normal Approximation"
                              strokeWidth={2}
                              dot={false}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </>
                ) : (
                  <Alert severity="info">
                    Select the Binomial distribution to explore approximations
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Applications & Theory
            </Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Probability Theory Fundamentals</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" paragraph>
                      <strong>Probability Density Function (PDF):</strong> For continuous distributions, 
                      f(x) represents the density of probability at point x. The probability of X 
                      falling in interval [a,b] is ∫[a,b] f(x)dx.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" paragraph>
                      <strong>Probability Mass Function (PMF):</strong> For discrete distributions, 
                      P(X = x) gives the exact probability of X taking value x. The sum of all 
                      probabilities equals 1.
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Central Limit Theorem</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  The Central Limit Theorem states that the sampling distribution of the sample mean 
                  approaches a normal distribution as the sample size increases, regardless of the 
                  population's distribution shape.
                </Typography>
                <Typography variant="body2">
                  If X₁, X₂, ..., Xₙ are independent random variables with mean μ and variance σ², 
                  then as n → ∞, the distribution of (X̄ - μ)/(σ/√n) approaches N(0,1).
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Moment Generating Functions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  The moment generating function (MGF) M(t) = E[e^(tX)] uniquely determines the 
                  distribution and can be used to find moments: E[X^n] = M^(n)(0).
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Normal:</strong> M(t) = exp(μt + σ²t²/2)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Exponential:</strong> M(t) = λ/(λ - t) for t &lt; λ
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Real-World Case Studies</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Quality Control in Manufacturing
                      </Typography>
                      <Typography variant="body2" paragraph>
                        A factory produces electronic components with a defect rate of 2%. 
                        Using the Binomial distribution, we can calculate the probability of 
                        finding exactly k defective items in a batch of n components.
                      </Typography>
                      <Typography variant="body2">
                        For n=100: P(X ≤ 5) = 0.983 (98.3% chance of 5 or fewer defects)
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Network Traffic Analysis
                      </Typography>
                      <Typography variant="body2" paragraph>
                        Server requests often follow a Poisson distribution. If a server 
                        receives an average of 120 requests per minute, we can model the 
                        probability of receiving k requests in any given minute.
                      </Typography>
                      <Typography variant="body2">
                        λ = 2/second: P(X > 5 in 1 sec) = 0.017 (1.7% chance of overload)
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdvancedProbabilityDistributions;