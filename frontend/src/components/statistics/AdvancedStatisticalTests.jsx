import React, { useState, useMemo } from 'react';
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
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  Switch
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
  ScatterChart,
  Scatter
} from 'recharts';
import { multipleTestingAdjustments } from '../../utils/advancedStatistics';
import jStat from 'jstat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SchoolIcon from '@mui/icons-material/School';
import ScienceIcon from '@mui/icons-material/Science';

const AdvancedStatisticalTests = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [testType, setTestType] = useState('t-test');
  const [data1, setData1] = useState('5.1, 5.5, 4.9, 5.0, 5.2, 5.3, 4.8, 5.4, 5.1, 5.2');
  const [data2, setData2] = useState('5.7, 5.9, 6.1, 5.8, 6.0, 5.9, 6.2, 5.8, 6.1, 5.9');
  const [hypothesisType, setHypothesisType] = useState('two-sided');
  const [alpha, setAlpha] = useState(0.05);
  const [testResults, setTestResults] = useState(null);
  
  // Multiple testing state
  const [multipleTests, setMultipleTests] = useState([
    { name: 'Test 1', pValue: 0.012 },
    { name: 'Test 2', pValue: 0.045 },
    { name: 'Test 3', pValue: 0.089 },
    { name: 'Test 4', pValue: 0.003 },
    { name: 'Test 5', pValue: 0.023 }
  ]);
  const [correctionMethod, setCorrectionMethod] = useState('bonferroni');
  const [adjustedResults, setAdjustedResults] = useState(null);

  // Power analysis state
  const [powerSettings, setPowerSettings] = useState({
    effectSize: 0.5,
    sampleSize: 30,
    alpha: 0.05,
    power: null
  });

  // Parse data string to array
  const parseData = (dataString) => {
    return dataString.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
  };

  // Perform statistical test
  const performTest = () => {
    const arr1 = parseData(data1);
    const arr2 = parseData(data2);
    
    if (arr1.length === 0 || arr2.length === 0) {
      alert('Please enter valid data');
      return;
    }

    let results = {};
    
    switch (testType) {
      case 't-test':
        results = performTTest(arr1, arr2);
        break;
      case 'mann-whitney':
        results = performMannWhitney(arr1, arr2);
        break;
      case 'anova':
        results = performANOVA([arr1, arr2]);
        break;
      case 'chi-square':
        results = performChiSquare(arr1, arr2);
        break;
      default:
        break;
    }
    
    setTestResults(results);
  };

  // T-test implementation
  const performTTest = (data1, data2) => {
    const n1 = data1.length;
    const n2 = data2.length;
    const mean1 = jStat.mean(data1);
    const mean2 = jStat.mean(data2);
    const var1 = jStat.variance(data1, true);
    const var2 = jStat.variance(data2, true);
    
    // Pooled variance
    const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const se = Math.sqrt(pooledVar * (1/n1 + 1/n2));
    const t = (mean1 - mean2) / se;
    const df = n1 + n2 - 2;
    
    let pValue;
    if (hypothesisType === 'two-sided') {
      pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
    } else if (hypothesisType === 'greater') {
      pValue = 1 - jStat.studentt.cdf(t, df);
    } else {
      pValue = jStat.studentt.cdf(t, df);
    }
    
    // Effect size (Cohen's d)
    const cohensD = (mean1 - mean2) / Math.sqrt(pooledVar);
    
    return {
      testStatistic: t,
      pValue,
      degreesOfFreedom: df,
      mean1,
      mean2,
      difference: mean1 - mean2,
      standardError: se,
      confidenceInterval: [
        (mean1 - mean2) - jStat.studentt.inv(1 - alpha/2, df) * se,
        (mean1 - mean2) + jStat.studentt.inv(1 - alpha/2, df) * se
      ],
      effectSize: cohensD,
      sampleSize1: n1,
      sampleSize2: n2
    };
  };

  // Mann-Whitney U test
  const performMannWhitney = (data1, data2) => {
    // Combine and rank data
    const combined = [...data1.map(x => ({value: x, group: 1})), 
                     ...data2.map(x => ({value: x, group: 2}))];
    combined.sort((a, b) => a.value - b.value);
    
    // Assign ranks
    for (let i = 0; i < combined.length; i++) {
      combined[i].rank = i + 1;
    }
    
    // Handle ties
    let i = 0;
    while (i < combined.length) {
      let j = i;
      while (j < combined.length - 1 && combined[j].value === combined[j + 1].value) {
        j++;
      }
      if (j > i) {
        const avgRank = (combined[i].rank + combined[j].rank) / 2;
        for (let k = i; k <= j; k++) {
          combined[k].rank = avgRank;
        }
      }
      i = j + 1;
    }
    
    // Calculate U statistics
    const R1 = combined.filter(x => x.group === 1).reduce((sum, x) => sum + x.rank, 0);
    const R2 = combined.filter(x => x.group === 2).reduce((sum, x) => sum + x.rank, 0);
    
    const n1 = data1.length;
    const n2 = data2.length;
    const U1 = R1 - n1 * (n1 + 1) / 2;
    const U2 = R2 - n2 * (n2 + 1) / 2;
    const U = Math.min(U1, U2);
    
    // Normal approximation for large samples
    const mU = n1 * n2 / 2;
    const sU = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
    const z = (U - mU) / sU;
    const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));
    
    return {
      testStatistic: U,
      zScore: z,
      pValue,
      rankSum1: R1,
      rankSum2: R2,
      sampleSize1: n1,
      sampleSize2: n2
    };
  };

  // One-way ANOVA
  const performANOVA = (groups) => {
    const k = groups.length;
    const N = groups.reduce((sum, group) => sum + group.length, 0);
    const grandMean = groups.flat().reduce((sum, x) => sum + x, 0) / N;
    
    // Between-group sum of squares
    const SSB = groups.reduce((sum, group) => {
      const groupMean = jStat.mean(group);
      return sum + group.length * Math.pow(groupMean - grandMean, 2);
    }, 0);
    
    // Within-group sum of squares
    const SSW = groups.reduce((sum, group) => {
      const groupMean = jStat.mean(group);
      return sum + group.reduce((groupSum, x) => groupSum + Math.pow(x - groupMean, 2), 0);
    }, 0);
    
    const dfBetween = k - 1;
    const dfWithin = N - k;
    const MSB = SSB / dfBetween;
    const MSW = SSW / dfWithin;
    const F = MSB / MSW;
    const pValue = 1 - jStat.centralF.cdf(F, dfBetween, dfWithin);
    
    return {
      testStatistic: F,
      pValue,
      dfBetween,
      dfWithin,
      meanSquareBetween: MSB,
      meanSquareWithin: MSW,
      groupMeans: groups.map(g => jStat.mean(g)),
      grandMean
    };
  };

  // Chi-square test (for demonstration, treating as frequency data)
  const performChiSquare = (observed, expected) => {
    // For demonstration, we'll create a simple contingency table
    const chiSquare = observed.reduce((sum, obs, i) => {
      const exp = expected[i] || jStat.mean(expected);
      return sum + Math.pow(obs - exp, 2) / exp;
    }, 0);
    
    const df = Math.min(observed.length, expected.length) - 1;
    const pValue = 1 - jStat.chisquare.cdf(chiSquare, df);
    
    return {
      testStatistic: chiSquare,
      pValue,
      degreesOfFreedom: df
    };
  };

  // Apply multiple testing corrections
  const applyMultipleTestingCorrection = () => {
    const pValues = multipleTests.map(t => t.pValue);
    let results;
    
    switch (correctionMethod) {
      case 'bonferroni':
        results = multipleTestingAdjustments.bonferroni(pValues, alpha);
        break;
      case 'holm':
        results = multipleTestingAdjustments.holmBonferroni(pValues, alpha);
        break;
      case 'fdr':
        results = multipleTestingAdjustments.benjaminiHochberg(pValues, alpha);
        break;
      default:
        results = { adjustedPValues: pValues, rejected: pValues.map(p => p < alpha) };
    }
    
    setAdjustedResults(results);
  };

  // Calculate statistical power
  const calculatePower = () => {
    const { effectSize, sampleSize, alpha: powerAlpha } = powerSettings;
    
    // For two-sample t-test
    const ncp = effectSize * Math.sqrt(sampleSize / 2); // Non-centrality parameter
    const criticalValue = jStat.studentt.inv(1 - powerAlpha / 2, 2 * sampleSize - 2);
    
    // Power calculation (simplified)
    const power = 1 - jStat.normal.cdf(criticalValue - ncp, 0, 1) + 
                  jStat.normal.cdf(-criticalValue - ncp, 0, 1);
    
    setPowerSettings({ ...powerSettings, power });
  };

  // Sample size calculation
  const calculateSampleSize = (targetPower = 0.8) => {
    const { effectSize, alpha: powerAlpha } = powerSettings;
    
    const za = jStat.normal.inv(1 - powerAlpha / 2, 0, 1);
    const zb = jStat.normal.inv(targetPower, 0, 1);
    
    const n = 2 * Math.pow((za + zb) / effectSize, 2);
    
    return Math.ceil(n);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Statistical Tests
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Perform comprehensive statistical analyses with multiple testing corrections, power analysis, and effect size calculations
      </Alert>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Hypothesis Testing" />
          <Tab label="Multiple Testing" />
          <Tab label="Power Analysis" />
          <Tab label="Effect Sizes" />
          <Tab label="Test Selection Guide" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Configuration
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Test Type</InputLabel>
                  <Select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                  >
                    <MenuItem value="t-test">Two-Sample T-Test</MenuItem>
                    <MenuItem value="mann-whitney">Mann-Whitney U Test</MenuItem>
                    <MenuItem value="anova">One-Way ANOVA</MenuItem>
                    <MenuItem value="chi-square">Chi-Square Test</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Group 1 Data"
                  multiline
                  rows={3}
                  value={data1}
                  onChange={(e) => setData1(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                  helperText="Enter comma-separated values"
                />

                <TextField
                  label="Group 2 Data"
                  multiline
                  rows={3}
                  value={data2}
                  onChange={(e) => setData2(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                  helperText="Enter comma-separated values"
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Alternative Hypothesis</InputLabel>
                  <Select
                    value={hypothesisType}
                    onChange={(e) => setHypothesisType(e.target.value)}
                  >
                    <MenuItem value="two-sided">Two-sided</MenuItem>
                    <MenuItem value="greater">Greater</MenuItem>
                    <MenuItem value="less">Less</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Significance Level (α)"
                  type="number"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  fullWidth
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0.001, max: 0.5, step: 0.01 }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<PlayArrowIcon />}
                  onClick={performTest}
                >
                  Perform Test
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            {testResults && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Test Results
                  </Typography>

                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Test Statistic</TableCell>
                          <TableCell align="right">{testResults.testStatistic?.toFixed(4)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>p-value</TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={testResults.pValue?.toFixed(4)} 
                              color={testResults.pValue < alpha ? 'error' : 'success'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                        {testResults.degreesOfFreedom && (
                          <TableRow>
                            <TableCell>Degrees of Freedom</TableCell>
                            <TableCell align="right">{testResults.degreesOfFreedom}</TableCell>
                          </TableRow>
                        )}
                        {testResults.effectSize && (
                          <TableRow>
                            <TableCell>Effect Size (Cohen's d)</TableCell>
                            <TableCell align="right">{testResults.effectSize.toFixed(3)}</TableCell>
                          </TableRow>
                        )}
                        {testResults.confidenceInterval && (
                          <TableRow>
                            <TableCell>95% CI</TableCell>
                            <TableCell align="right">
                              [{testResults.confidenceInterval[0].toFixed(3)}, {testResults.confidenceInterval[1].toFixed(3)}]
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Alert 
                    severity={testResults.pValue < alpha ? 'warning' : 'info'} 
                    sx={{ mt: 2 }}
                  >
                    {testResults.pValue < alpha 
                      ? `Reject null hypothesis at α = ${alpha}` 
                      : `Fail to reject null hypothesis at α = ${alpha}`}
                  </Alert>

                  {testResults.mean1 && testResults.mean2 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Group Statistics
                      </Typography>
                      <Typography variant="body2">
                        Group 1 Mean: {testResults.mean1.toFixed(3)} (n = {testResults.sampleSize1})
                      </Typography>
                      <Typography variant="body2">
                        Group 2 Mean: {testResults.mean2.toFixed(3)} (n = {testResults.sampleSize2})
                      </Typography>
                      <Typography variant="body2">
                        Difference: {testResults.difference.toFixed(3)} ± {testResults.standardError.toFixed(3)}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Multiple Testing Correction
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Correction Method</InputLabel>
                  <Select
                    value={correctionMethod}
                    onChange={(e) => setCorrectionMethod(e.target.value)}
                  >
                    <MenuItem value="bonferroni">Bonferroni</MenuItem>
                    <MenuItem value="holm">Holm-Bonferroni</MenuItem>
                    <MenuItem value="fdr">Benjamini-Hochberg (FDR)</MenuItem>
                  </Select>
                </FormControl>

                <Typography variant="subtitle2" gutterBottom>
                  P-values to Adjust
                </Typography>

                {multipleTests.map((test, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TextField
                      label={test.name}
                      value={test.pValue}
                      onChange={(e) => {
                        const newTests = [...multipleTests];
                        newTests[index].pValue = parseFloat(e.target.value) || 0;
                        setMultipleTests(newTests);
                      }}
                      type="number"
                      size="small"
                      sx={{ mr: 1 }}
                      inputProps={{ min: 0, max: 1, step: 0.001 }}
                    />
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setMultipleTests(multipleTests.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}

                <Button
                  size="small"
                  onClick={() => {
                    setMultipleTests([...multipleTests, { 
                      name: `Test ${multipleTests.length + 1}`, 
                      pValue: 0.05 
                    }]);
                  }}
                  sx={{ mb: 2 }}
                >
                  Add Test
                </Button>

                <TextField
                  label="Family-wise Error Rate (α)"
                  type="number"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  fullWidth
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0.001, max: 0.5, step: 0.01 }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  onClick={applyMultipleTestingCorrection}
                >
                  Apply Correction
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            {adjustedResults && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Adjusted Results
                  </Typography>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Test</TableCell>
                          <TableCell>Original p</TableCell>
                          <TableCell>Adjusted p</TableCell>
                          <TableCell>Reject H₀</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {multipleTests.map((test, index) => (
                          <TableRow key={index}>
                            <TableCell>{test.name}</TableCell>
                            <TableCell>{test.pValue.toFixed(4)}</TableCell>
                            <TableCell>{adjustedResults.adjustedPValues[index].toFixed(4)}</TableCell>
                            <TableCell>
                              <Chip
                                label={adjustedResults.rejected[index] ? 'Yes' : 'No'}
                                color={adjustedResults.rejected[index] ? 'error' : 'default'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    {correctionMethod === 'bonferroni' && (
                      <span>Bonferroni: Adjusted α = {(alpha / multipleTests.length).toFixed(4)}</span>
                    )}
                    {correctionMethod === 'fdr' && (
                      <span>FDR control at {alpha * 100}%</span>
                    )}
                  </Alert>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Power Analysis
                </Typography>

                <TextField
                  label="Effect Size (Cohen's d)"
                  type="number"
                  value={powerSettings.effectSize}
                  onChange={(e) => setPowerSettings({
                    ...powerSettings,
                    effectSize: parseFloat(e.target.value)
                  })}
                  fullWidth
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0, max: 3, step: 0.1 }}
                  helperText="Small: 0.2, Medium: 0.5, Large: 0.8"
                />

                <TextField
                  label="Sample Size (per group)"
                  type="number"
                  value={powerSettings.sampleSize}
                  onChange={(e) => setPowerSettings({
                    ...powerSettings,
                    sampleSize: parseInt(e.target.value)
                  })}
                  fullWidth
                  sx={{ mb: 2 }}
                  inputProps={{ min: 5, max: 1000, step: 5 }}
                />

                <TextField
                  label="Significance Level (α)"
                  type="number"
                  value={powerSettings.alpha}
                  onChange={(e) => setPowerSettings({
                    ...powerSettings,
                    alpha: parseFloat(e.target.value)
                  })}
                  fullWidth
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0.001, max: 0.1, step: 0.01 }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  onClick={calculatePower}
                  sx={{ mb: 2 }}
                >
                  Calculate Power
                </Button>

                {powerSettings.power && (
                  <Alert severity="info">
                    Statistical Power: {(powerSettings.power * 100).toFixed(1)}%
                  </Alert>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Sample Size Calculator
                </Typography>

                <Typography variant="body2" sx={{ mb: 2 }}>
                  Required sample size for 80% power: {calculateSampleSize(0.8)} per group
                </Typography>
                <Typography variant="body2">
                  Required sample size for 90% power: {calculateSampleSize(0.9)} per group
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Power Curve
                </Typography>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={Array.from({ length: 50 }, (_, i) => {
                      const n = (i + 1) * 4;
                      const ncp = powerSettings.effectSize * Math.sqrt(n / 2);
                      const criticalValue = jStat.studentt.inv(1 - powerSettings.alpha / 2, 2 * n - 2);
                      const power = 1 - jStat.normal.cdf(criticalValue - ncp, 0, 1) + 
                                   jStat.normal.cdf(-criticalValue - ncp, 0, 1);
                      return { sampleSize: n, power: power * 100 };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sampleSize" label={{ value: 'Sample Size', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Power (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Line type="monotone" dataKey="power" stroke="#8884d8" strokeWidth={2} dot={false} />
                    <ReferenceLine y={80} stroke="red" strokeDasharray="5 5" label="80% Power" />
                    <ReferenceLine y={90} stroke="green" strokeDasharray="5 5" label="90% Power" />
                  </LineChart>
                </ResponsiveContainer>
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
                  Effect Size Guide
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom color="primary">
                        Cohen's d (Mean Differences)
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>Small</TableCell>
                            <TableCell>0.2</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Medium</TableCell>
                            <TableCell>0.5</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Large</TableCell>
                            <TableCell>0.8</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        d = (μ₁ - μ₂) / σ_pooled
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom color="primary">
                        Pearson's r (Correlation)
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>Small</TableCell>
                            <TableCell>0.1</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Medium</TableCell>
                            <TableCell>0.3</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Large</TableCell>
                            <TableCell>0.5</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        r = Cov(X,Y) / (σ_X × σ_Y)
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom color="primary">
                        Cohen's f² (ANOVA)
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>Small</TableCell>
                            <TableCell>0.02</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Medium</TableCell>
                            <TableCell>0.15</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Large</TableCell>
                            <TableCell>0.35</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        f² = R² / (1 - R²)
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Effect Size Calculator
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Mean 1"
                        type="number"
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Mean 2"
                        type="number"
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Pooled SD"
                        type="number"
                        size="small"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Button variant="outlined" fullWidth>
                        Calculate d
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Statistical Test Selection Guide
            </Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Comparing Two Groups</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Parametric Tests
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Independent Samples T-Test:</strong> Compare means of two independent groups
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Paired T-Test:</strong> Compare means of matched pairs or repeated measures
                    </Typography>
                    <Typography variant="body2">
                      <strong>Assumptions:</strong> Normal distribution, equal variances (for independent t-test)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Non-Parametric Tests
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Mann-Whitney U Test:</strong> Compare distributions of two independent groups
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Wilcoxon Signed-Rank Test:</strong> Compare matched pairs or repeated measures
                    </Typography>
                    <Typography variant="body2">
                      <strong>Use when:</strong> Data is ordinal or violates normality assumption
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Comparing Multiple Groups</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        One-Way ANOVA
                      </Typography>
                      <Typography variant="body2">
                        Compare means across 3+ independent groups
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Post-hoc tests:</strong> Tukey HSD, Bonferroni, Scheffé
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Kruskal-Wallis Test
                      </Typography>
                      <Typography variant="body2">
                        Non-parametric alternative to ANOVA
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Post-hoc:</strong> Dunn's test with corrections
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Relationships Between Variables</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Variable Types</TableCell>
                        <TableCell>Test</TableCell>
                        <TableCell>Purpose</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Continuous vs Continuous</TableCell>
                        <TableCell>Pearson Correlation</TableCell>
                        <TableCell>Linear relationship</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Ordinal vs Ordinal</TableCell>
                        <TableCell>Spearman Correlation</TableCell>
                        <TableCell>Monotonic relationship</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Categorical vs Categorical</TableCell>
                        <TableCell>Chi-Square Test</TableCell>
                        <TableCell>Independence test</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Continuous vs Categorical</TableCell>
                        <TableCell>Logistic Regression</TableCell>
                        <TableCell>Predict categories</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdvancedStatisticalTests;