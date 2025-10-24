/**
 * Parametric Tests Component
 *
 * Classical hypothesis tests assuming normal distribution:
 * - One-Sample t-test (compare mean to population value)
 * - Independent Samples t-test (compare two groups)
 * - Paired Samples t-test (compare before/after measurements)
 * - One-way ANOVA (compare three or more groups)
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
  ReferenceLine
} from 'recharts';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import {
  oneSampleTTest,
  independentTTest,
  pairedTTest,
  oneWayANOVA,
  calculateDescriptiveStats
} from '../utils/statisticalUtils';
import guardianService from '../../../services/GuardianService';
import GuardianWarning from '../../Guardian/GuardianWarning';

/**
 * Main Parametric Tests Component
 */
const ParametricTests = ({ data }) => {
  const [testType, setTestType] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedColumn2, setSelectedColumn2] = useState('');
  const [groupColumn, setGroupColumn] = useState('');
  const [populationMean, setPopulationMean] = useState(0);
  const [alpha, setAlpha] = useState(0.05);

  // Guardian Integration State
  const [guardianReport, setGuardianReport] = useState(null);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianError, setGuardianError] = useState(null);
  const [isTestBlocked, setIsTestBlocked] = useState(false);

  /**
   * Detect column types
   */
  const columnInfo = useMemo(() => {
    if (!data || data.length === 0) return { numeric: [], categorical: [] };

    const numeric = [];
    const categorical = [];

    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueCount = new Set(values).size;
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      if (numericCount / values.length > 0.8) {
        numeric.push(key);
      } else if (uniqueCount < 20) {
        categorical.push(key);
      }
    });

    return { numeric, categorical };
  }, [data]);

  /**
   * Get column data
   */
  const columnData = useMemo(() => {
    if (!selectedColumn || !data) return [];
    return data
      .map(row => parseFloat(row[selectedColumn]))
      .filter(v => !isNaN(v));
  }, [data, selectedColumn]);

  /**
   * Get second column data (for paired t-test)
   */
  const columnData2 = useMemo(() => {
    if (!selectedColumn2 || !data) return [];
    return data
      .map(row => parseFloat(row[selectedColumn2]))
      .filter(v => !isNaN(v));
  }, [data, selectedColumn2]);

  /**
   * Get grouped data (for independent t-test or ANOVA)
   */
  const groupedData = useMemo(() => {
    if (!selectedColumn || !groupColumn || !data) return {};

    const groups = {};
    data.forEach(row => {
      const groupValue = String(row[groupColumn] || 'Unknown');
      const dataValue = parseFloat(row[selectedColumn]);

      if (isNaN(dataValue)) return;

      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(dataValue);
    });

    return groups;
  }, [data, selectedColumn, groupColumn]);

  /**
   * Perform one-sample t-test
   */
  const oneSampleResult = useMemo(() => {
    if (testType !== 'one-sample' || columnData.length < 2) return null;
    return oneSampleTTest(columnData, populationMean);
  }, [testType, columnData, populationMean]);

  /**
   * Perform independent t-test
   */
  const independentResult = useMemo(() => {
    if (testType !== 'independent' || Object.keys(groupedData).length !== 2) return null;

    const groups = Object.values(groupedData);
    if (groups[0].length < 2 || groups[1].length < 2) return null;

    return independentTTest(groups[0], groups[1]);
  }, [testType, groupedData]);

  /**
   * Perform paired t-test
   */
  const pairedResult = useMemo(() => {
    if (testType !== 'paired' || columnData.length < 2 || columnData2.length < 2) return null;
    if (columnData.length !== columnData2.length) return null;

    return pairedTTest(columnData, columnData2);
  }, [testType, columnData, columnData2]);

  /**
   * Perform one-way ANOVA
   */
  const anovaResult = useMemo(() => {
    if (testType !== 'anova' || Object.keys(groupedData).length < 2) return null;

    const groups = Object.values(groupedData);
    if (groups.some(g => g.length < 2)) return null;

    return oneWayANOVA(groups);
  }, [testType, groupedData]);

  /**
   * Prepare visualization data
   */
  const vizData = useMemo(() => {
    if (testType === 'one-sample' && columnData.length > 0) {
      const stats = calculateDescriptiveStats(columnData);
      const se = stats.std / Math.sqrt(stats.count);
      const margin = 1.96 * se; // 95% CI

      return [
        {
          name: 'Sample Mean',
          value: stats.mean,
          error: margin,
          lower: stats.mean - margin,
          upper: stats.mean + margin
        },
        {
          name: 'Population Mean',
          value: populationMean,
          error: 0
        }
      ];
    }

    if ((testType === 'independent' || testType === 'anova') && Object.keys(groupedData).length > 0) {
      return Object.entries(groupedData).map(([group, values]) => {
        const stats = calculateDescriptiveStats(values);
        const se = stats.std / Math.sqrt(stats.count);
        const margin = 1.96 * se;

        return {
          name: group,
          value: stats.mean,
          error: margin,
          lower: stats.mean - margin,
          upper: stats.mean + margin,
          n: stats.count
        };
      });
    }

    if (testType === 'paired' && columnData.length > 0 && columnData2.length > 0) {
      const stats1 = calculateDescriptiveStats(columnData);
      const stats2 = calculateDescriptiveStats(columnData2);
      const se1 = stats1.std / Math.sqrt(stats1.count);
      const se2 = stats2.std / Math.sqrt(stats2.count);
      const margin1 = 1.96 * se1;
      const margin2 = 1.96 * se2;

      return [
        {
          name: selectedColumn,
          value: stats1.mean,
          error: margin1,
          lower: stats1.mean - margin1,
          upper: stats1.mean + margin1
        },
        {
          name: selectedColumn2,
          value: stats2.mean,
          error: margin2,
          lower: stats2.mean - margin2,
          upper: stats2.mean + margin2
        }
      ];
    }

    return [];
  }, [testType, columnData, columnData2, groupedData, populationMean, selectedColumn, selectedColumn2]);

  /**
   * Guardian Integration: Check statistical assumptions
   */
  React.useEffect(() => {
    const checkGuardianAssumptions = async () => {
      // Reset previous Guardian state
      setGuardianReport(null);
      setGuardianError(null);
      setIsTestBlocked(false);

      // Only check if we have a test type and sufficient data
      if (!testType || !data || data.length === 0) {
        return;
      }

      // Prepare data based on test type
      let dataToCheck = null;
      let backendTestType = '';

      try {
        if (testType === 'one-sample') {
          if (columnData.length < 2) return;
          dataToCheck = columnData;
          backendTestType = 't_test';
        } else if (testType === 'independent') {
          if (Object.keys(groupedData).length !== 2) return;
          const groups = Object.values(groupedData);
          if (groups[0].length < 2 || groups[1].length < 2) return;
          dataToCheck = groupedData;
          backendTestType = 't_test';
        } else if (testType === 'paired') {
          if (columnData.length < 2 || columnData2.length < 2) return;
          if (columnData.length !== columnData2.length) return;
          dataToCheck = columnData; // Check first column for normality
          backendTestType = 't_test';
        } else if (testType === 'anova') {
          if (Object.keys(groupedData).length < 2) return;
          const groups = Object.values(groupedData);
          if (groups.some(g => g.length < 2)) return;
          dataToCheck = groupedData;
          backendTestType = 'anova';
        } else {
          return;
        }

        // Call Guardian service
        setGuardianLoading(true);
        const report = await guardianService.checkAssumptions(
          dataToCheck,
          backendTestType,
          alpha
        );

        setGuardianReport(report);
        setIsTestBlocked(!report.can_proceed);
        setGuardianLoading(false);

      } catch (error) {
        console.error('Guardian check failed:', error);
        setGuardianError(error.message || 'Failed to validate assumptions');
        setGuardianLoading(false);
        // Don't block test if Guardian service fails
        setIsTestBlocked(false);
      }
    };

    checkGuardianAssumptions();
  }, [testType, columnData, columnData2, groupedData, alpha, data]);

  /**
   * Render data requirement message
   */
  if (!data || data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="info">
          <Typography variant="body1">
            Please upload a dataset in the <strong>Data Profiling</strong> module first.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Configuration Panel */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon /> Parametric Tests Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Test Type */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={testType}
                label="Test Type"
                onChange={(e) => {
                  setTestType(e.target.value);
                  setSelectedColumn('');
                  setSelectedColumn2('');
                  setGroupColumn('');
                }}
              >
                <MenuItem value=""><em>Choose a test...</em></MenuItem>
                <MenuItem value="one-sample">One-Sample t-test</MenuItem>
                <MenuItem value="independent">Independent Samples t-test</MenuItem>
                <MenuItem value="paired">Paired Samples t-test</MenuItem>
                <MenuItem value="anova">One-way ANOVA</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Significance Level */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Significance Level (α)</InputLabel>
              <Select
                value={alpha}
                label="Significance Level (α)"
                onChange={(e) => setAlpha(e.target.value)}
              >
                <MenuItem value={0.01}>0.01 (99% confidence)</MenuItem>
                <MenuItem value={0.05}>0.05 (95% confidence)</MenuItem>
                <MenuItem value={0.10}>0.10 (90% confidence)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* One-Sample t-test fields */}
          {testType === 'one-sample' && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Data Column</InputLabel>
                  <Select
                    value={selectedColumn}
                    label="Data Column"
                    onChange={(e) => setSelectedColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select column...</em></MenuItem>
                    {columnInfo.numeric.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Population Mean (μ₀)"
                  type="number"
                  value={populationMean}
                  onChange={(e) => setPopulationMean(parseFloat(e.target.value) || 0)}
                  helperText="Hypothesized population mean to compare against"
                />
              </Grid>
            </>
          )}

          {/* Independent t-test fields */}
          {testType === 'independent' && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Data Column</InputLabel>
                  <Select
                    value={selectedColumn}
                    label="Data Column"
                    onChange={(e) => setSelectedColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select column...</em></MenuItem>
                    {columnInfo.numeric.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Group Column</InputLabel>
                  <Select
                    value={groupColumn}
                    label="Group Column"
                    onChange={(e) => setGroupColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select group column...</em></MenuItem>
                    {columnInfo.categorical.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Paired t-test fields */}
          {testType === 'paired' && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>First Column (Before)</InputLabel>
                  <Select
                    value={selectedColumn}
                    label="First Column (Before)"
                    onChange={(e) => setSelectedColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select column...</em></MenuItem>
                    {columnInfo.numeric.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Second Column (After)</InputLabel>
                  <Select
                    value={selectedColumn2}
                    label="Second Column (After)"
                    onChange={(e) => setSelectedColumn2(e.target.value)}
                  >
                    <MenuItem value=""><em>Select column...</em></MenuItem>
                    {columnInfo.numeric.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* ANOVA fields */}
          {testType === 'anova' && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Data Column</InputLabel>
                  <Select
                    value={selectedColumn}
                    label="Data Column"
                    onChange={(e) => setSelectedColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select column...</em></MenuItem>
                    {columnInfo.numeric.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Group Column</InputLabel>
                  <Select
                    value={groupColumn}
                    label="Group Column"
                    onChange={(e) => setGroupColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select group column...</em></MenuItem>
                    {columnInfo.categorical.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Guardian Loading State */}
      {guardianLoading && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="body1" component="span">
            Validating statistical assumptions...
          </Typography>
        </Paper>
      )}

      {/* Guardian Error State */}
      {guardianError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Guardian validation unavailable:</strong> {guardianError}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Proceeding without assumption validation. Results may be unreliable if assumptions are violated.
          </Typography>
        </Alert>
      )}

      {/* Guardian Warning Display */}
      {guardianReport && <GuardianWarning guardianReport={guardianReport} />}

      {/* Test Blocked Notice */}
      {isTestBlocked && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#e65100', display: 'flex', alignItems: 'center', gap: 1 }}>
            🚫 Test Execution Blocked
          </Typography>
          <Typography variant="body2" paragraph>
            This parametric test cannot proceed due to critical assumption violations detected by the Guardian system.
          </Typography>
          <Typography variant="body2">
            <strong>Recommendation:</strong> Review the violations above and use the suggested alternative tests or address the data issues.
          </Typography>
        </Paper>
      )}

      {/* Test Results */}
      {/* One-Sample t-test Results */}
      {oneSampleResult && !isTestBlocked && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              One-Sample t-test Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: μ = {populationMean} vs H₁: μ ≠ {populationMean}
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Statistic</strong></TableCell>
                    <TableCell align="right"><strong>Value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Sample Mean</TableCell>
                    <TableCell align="right">{oneSampleResult.sampleMean.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Standard Error</TableCell>
                    <TableCell align="right">{oneSampleResult.standardError.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>t-statistic</TableCell>
                    <TableCell align="right">{oneSampleResult.statistic.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Degrees of Freedom</TableCell>
                    <TableCell align="right">{oneSampleResult.df}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{oneSampleResult.pValue.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {oneSampleResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity={oneSampleResult.significant ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {oneSampleResult.significant
                  ? `The sample mean (${oneSampleResult.sampleMean.toFixed(2)}) is significantly different from ${populationMean} (p = ${oneSampleResult.pValue.toFixed(4)} < ${alpha}).`
                  : `The sample mean (${oneSampleResult.sampleMean.toFixed(2)}) is not significantly different from ${populationMean} (p = ${oneSampleResult.pValue.toFixed(4)} >= ${alpha}).`}
              </Typography>
            </Alert>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Mean Comparison
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={vizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Mean', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Mean Value">
                    <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#f44336" />
                  </Bar>
                  <ReferenceLine y={populationMean} stroke="#666" strokeDasharray="3 3" label="H₀" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {/* Independent t-test Results */}
      {independentResult && !isTestBlocked && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Independent Samples t-test Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: μ₁ = μ₂ vs H₁: μ₁ ≠ μ₂
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Statistic</strong></TableCell>
                    <TableCell align="right"><strong>Value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Mean Difference</TableCell>
                    <TableCell align="right">{independentResult.meanDifference.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Standard Error</TableCell>
                    <TableCell align="right">{independentResult.standardError.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>t-statistic</TableCell>
                    <TableCell align="right">{independentResult.statistic.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Degrees of Freedom</TableCell>
                    <TableCell align="right">{independentResult.df}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{independentResult.pValue.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {independentResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity={independentResult.significant ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {independentResult.significant
                  ? `The two groups have significantly different means (p = ${independentResult.pValue.toFixed(4)} < ${alpha}).`
                  : `The two groups do not have significantly different means (p = ${independentResult.pValue.toFixed(4)} >= ${alpha}).`}
              </Typography>
            </Alert>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Means with 95% Confidence Intervals
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={vizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Mean', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Mean">
                    <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#f44336" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {/* Paired t-test Results */}
      {pairedResult && !isTestBlocked && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Paired Samples t-test Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: μ_diff = 0 vs H₁: μ_diff ≠ 0
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Statistic</strong></TableCell>
                    <TableCell align="right"><strong>Value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Mean Difference</TableCell>
                    <TableCell align="right">{pairedResult.sampleMean.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Standard Error</TableCell>
                    <TableCell align="right">{pairedResult.standardError.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>t-statistic</TableCell>
                    <TableCell align="right">{pairedResult.statistic.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Degrees of Freedom</TableCell>
                    <TableCell align="right">{pairedResult.df}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{pairedResult.pValue.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {pairedResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity={pairedResult.significant ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {pairedResult.significant
                  ? `There is a significant difference between the paired measurements (p = ${pairedResult.pValue.toFixed(4)} < ${alpha}).`
                  : `There is no significant difference between the paired measurements (p = ${pairedResult.pValue.toFixed(4)} >= ${alpha}).`}
              </Typography>
            </Alert>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Paired Measurements Comparison
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={vizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Mean', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Mean">
                    <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#f44336" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {/* ANOVA Results */}
      {anovaResult && !isTestBlocked && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              One-way ANOVA Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: All group means are equal vs H₁: At least one group mean differs
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Source</strong></TableCell>
                    <TableCell align="right"><strong>SS</strong></TableCell>
                    <TableCell align="right"><strong>df</strong></TableCell>
                    <TableCell align="right"><strong>MS</strong></TableCell>
                    <TableCell align="right"><strong>F</strong></TableCell>
                    <TableCell align="right"><strong>p-value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Between Groups</TableCell>
                    <TableCell align="right">{anovaResult.ssb.toFixed(4)}</TableCell>
                    <TableCell align="right">{anovaResult.dfb}</TableCell>
                    <TableCell align="right">{anovaResult.msb.toFixed(4)}</TableCell>
                    <TableCell align="right">{anovaResult.fStatistic.toFixed(4)}</TableCell>
                    <TableCell align="right">{anovaResult.pValue.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Within Groups</TableCell>
                    <TableCell align="right">{anovaResult.ssw.toFixed(4)}</TableCell>
                    <TableCell align="right">{anovaResult.dfw}</TableCell>
                    <TableCell align="right">{anovaResult.msw.toFixed(4)}</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>{(anovaResult.ssb + anovaResult.ssw).toFixed(4)}</strong></TableCell>
                    <TableCell align="right"><strong>{anovaResult.dfb + anovaResult.dfw}</strong></TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Chip
                icon={anovaResult.significant ? <CancelOutlinedIcon /> : <CheckCircleOutlineIcon />}
                label={anovaResult.significant ? "Reject H₀" : "Fail to Reject H₀"}
                color={anovaResult.significant ? "error" : "success"}
                sx={{ mr: 1 }}
              />
              <Chip
                label={`η² = ${anovaResult.etaSquared.toFixed(4)}`}
                color="primary"
                variant="outlined"
              />
            </Box>

            <Alert severity={anovaResult.significant ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {anovaResult.significant
                  ? `At least one group mean differs significantly from the others (p = ${anovaResult.pValue.toFixed(4)} < ${alpha}). Effect size η² = ${anovaResult.etaSquared.toFixed(4)}.`
                  : `All group means appear to be equal (p = ${anovaResult.pValue.toFixed(4)} >= ${alpha}).`}
              </Typography>
            </Alert>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Means with 95% Confidence Intervals
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={vizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Mean', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Mean">
                    <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#f44336" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {anovaResult.significant && (
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Post-hoc Analysis Recommended:</strong> Since ANOVA is significant,
                perform post-hoc tests (e.g., Tukey HSD) to determine which specific group
                pairs differ from each other.
              </Typography>
            </Alert>
          )}
        </>
      )}

      {/* Selection prompts */}
      {!testType && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select a <strong>test type</strong> to begin.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ParametricTests;
