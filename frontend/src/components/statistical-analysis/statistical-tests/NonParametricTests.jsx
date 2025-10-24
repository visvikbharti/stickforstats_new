/**
 * Non-Parametric Tests Component
 *
 * Distribution-free tests for non-normal data or ordinal scales:
 * - Mann-Whitney U Test (independent samples)
 * - Kruskal-Wallis H Test (3+ independent groups)
 * - Wilcoxon Signed-Rank Test (paired samples)
 * - Friedman Test (repeated measures)
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { mannWhitneyUTest, calculateDescriptiveStats } from '../utils/statisticalUtils';

/**
 * Main Non-Parametric Tests Component
 */
const NonParametricTests = ({ data }) => {
  const [testType, setTestType] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [groupColumn, setGroupColumn] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [useBackend, setUseBackend] = useState(false);
  const [backendResult, setBackendResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);

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
   * Get grouped data
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
   * Call backend API for high-precision Mann-Whitney U test with exact p-values
   */
  const callBackendMannWhitney = async (group1, group2) => {
    try {
      setIsLoading(true);
      setBackendError(null);

      const response = await fetch('http://127.0.0.1:8000/api/v1/nonparametric/mann-whitney/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group1: group1,
          group2: group2,
          alternative: 'two-sided',
          use_continuity: true,
          calculate_effect_size: true
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }

      const result = await response.json();
      setBackendResult(result);
      return result;
    } catch (error) {
      console.error('Backend API error:', error);
      setBackendError(error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Perform Mann-Whitney U test (frontend calculation)
   */
  const mannWhitneyResult = useMemo(() => {
    if (testType !== 'mann-whitney' || Object.keys(groupedData).length !== 2) return null;
    if (useBackend) return null; // Backend results handled separately

    const groups = Object.values(groupedData);
    if (groups[0].length < 1 || groups[1].length < 1) return null;

    return mannWhitneyUTest(groups[0], groups[1]);
  }, [testType, groupedData, useBackend]);

  /**
   * Prepare visualization data
   */
  const vizData = useMemo(() => {
    if (Object.keys(groupedData).length === 0) return [];

    return Object.entries(groupedData).map(([group, values]) => {
      const stats = calculateDescriptiveStats(values);
      return {
        name: group,
        median: stats.median,
        mean: stats.mean,
        n: stats.count
      };
    });
  }, [groupedData]);

  /**
   * Check if sample sizes qualify for exact p-values
   */
  const sampleSizeInfo = useMemo(() => {
    if (Object.keys(groupedData).length !== 2) return null;

    const groups = Object.values(groupedData);
    const n1 = groups[0]?.length || 0;
    const n2 = groups[1]?.length || 0;
    const qualifiesForExact = n1 > 0 && n2 > 0 && n1 < 20 && n2 < 20;

    return {
      n1,
      n2,
      totalN: n1 + n2,
      qualifiesForExact,
      groupNames: Object.keys(groupedData)
    };
  }, [groupedData]);

  /**
   * Automatically call backend when useBackend is enabled and data is ready
   */
  useEffect(() => {
    if (useBackend && testType === 'mann-whitney' && Object.keys(groupedData).length === 2) {
      const groups = Object.values(groupedData);
      if (groups[0].length >= 1 && groups[1].length >= 1) {
        callBackendMannWhitney(groups[0], groups[1]);
      }
    }
  }, [useBackend, testType, groupedData]);

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
          <CompareArrowsIcon /> Non-Parametric Tests Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={testType}
                label="Test Type"
                onChange={(e) => {
                  setTestType(e.target.value);
                  setSelectedColumn('');
                  setGroupColumn('');
                }}
              >
                <MenuItem value=""><em>Choose a test...</em></MenuItem>
                <MenuItem value="mann-whitney">Mann-Whitney U Test</MenuItem>
                <MenuItem value="kruskal-wallis">Kruskal-Wallis H Test (Coming Soon)</MenuItem>
                <MenuItem value="wilcoxon">Wilcoxon Signed-Rank Test (Coming Soon)</MenuItem>
                <MenuItem value="friedman">Friedman Test (Coming Soon)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

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

          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useBackend}
                    onChange={(e) => {
                      setUseBackend(e.target.checked);
                      setBackendResult(null);
                      setBackendError(null);
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight={500}>High-Precision Backend API</Typography>
                    <Chip
                      label="50-decimal precision"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                }
              />

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: 0.5 }}>
                Calculates exact p-values for small samples (n₁, n₂ &lt; 20 per group) using dynamic programming.
                For larger samples, uses high-precision normal approximation with continuity correction.
              </Typography>

              {/* Sample Size Information */}
              {sampleSizeInfo && testType === 'mann-whitney' && (
                <Box sx={{ ml: 4, mt: 1.5, p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Current Sample Sizes:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="caption">
                      {sampleSizeInfo.groupNames[0]}: <strong>n₁ = {sampleSizeInfo.n1}</strong>
                    </Typography>
                    <Typography variant="caption">
                      {sampleSizeInfo.groupNames[1]}: <strong>n₂ = {sampleSizeInfo.n2}</strong>
                    </Typography>
                    <Typography variant="caption">
                      Total: <strong>N = {sampleSizeInfo.totalN}</strong>
                    </Typography>
                  </Box>

                  {sampleSizeInfo.qualifiesForExact ? (
                    <Alert severity="success" sx={{ mt: 1, py: 0.5 }}>
                      <Typography variant="caption">
                        ✓ Small sample detected - Exact p-values will be calculated
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                      <Typography variant="caption">
                        ⓘ Large sample detected - High-precision normal approximation will be used (exact p-values only available when both n₁, n₂ &lt; 20)
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>

          {testType === 'mann-whitney' && (
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

      {/* Backend Error Display */}
      {backendError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setBackendError(null)}>
          <Typography variant="body2">
            <strong>Backend API Error:</strong> {backendError}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Falling back to frontend calculation. Check that the backend server is running on port 8000.
          </Typography>
        </Alert>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Paper elevation={2} sx={{ p: 4, mb: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Calculating high-precision exact p-values...
          </Typography>
        </Paper>
      )}

      {/* Mann-Whitney U Test Results (Backend) */}
      {backendResult && backendResult.test_statistic !== undefined && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3, border: '2px solid #1976d2' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">
                  Mann-Whitney U Test Results
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip
                    label="Backend API"
                    color="primary"
                    size="small"
                    icon={<CheckCircleIcon />}
                  />
                  <Chip
                    label="50-decimal precision"
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                  {backendResult.exact_p_value && (
                    <Chip
                      label="Exact calculation"
                      color="warning"
                      size="small"
                    />
                  )}
                  {!backendResult.exact_p_value && (
                    <Chip
                      label="Normal approximation"
                      color="default"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: The two groups have the same distribution
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
                    <TableCell>U Statistic</TableCell>
                    <TableCell align="right">{backendResult.test_statistic}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell>
                      <strong>p-value {backendResult.exact_p_value ? '(Exact)' : '(Normal Approximation)'}</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{backendResult.exact_p_value || backendResult.p_value}</strong>
                    </TableCell>
                  </TableRow>
                  {backendResult.exact_p_value && (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Alert severity="success" icon={false}>
                          <Typography variant="caption">
                            ✨ <strong>Exact p-value</strong> calculated using the exact distribution of U (n₁, n₂ &lt; 20). This is more accurate than normal approximation for small samples.
                          </Typography>
                        </Alert>
                      </TableCell>
                    </TableRow>
                  )}
                  {backendResult.effect_size && (
                    <TableRow>
                      <TableCell>Effect Size (r)</TableCell>
                      <TableCell align="right">{backendResult.effect_size}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {parseFloat(backendResult.exact_p_value || backendResult.p_value) < alpha ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity={parseFloat(backendResult.exact_p_value || backendResult.p_value) < alpha ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {parseFloat(backendResult.exact_p_value || backendResult.p_value) < alpha
                  ? `The two groups have significantly different distributions (p = ${backendResult.exact_p_value || backendResult.p_value} < ${alpha}).`
                  : `The two groups do not have significantly different distributions (p = ${backendResult.exact_p_value || backendResult.p_value} >= ${alpha}).`}
              </Typography>
            </Alert>
          </Paper>
        </>
      )}

      {/* Mann-Whitney U Test Results (Frontend) */}
      {mannWhitneyResult && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Mann-Whitney U Test Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: The two groups have the same distribution
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
                    <TableCell>U Statistic</TableCell>
                    <TableCell align="right">{mannWhitneyResult.statistic.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{mannWhitneyResult.pValue.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {mannWhitneyResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity={mannWhitneyResult.significant ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {mannWhitneyResult.significant
                  ? `The two groups have significantly different distributions (p = ${mannWhitneyResult.pValue.toFixed(4)} < ${alpha}).`
                  : `The two groups do not have significantly different distributions (p = ${mannWhitneyResult.pValue.toFixed(4)} >= ${alpha}).`}
              </Typography>
            </Alert>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Medians Comparison
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={vizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Median', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="median" fill="#82ca9d" name="Median" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {/* Selection prompts */}
      {!testType && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select a <strong>test type</strong> to begin. Non-parametric tests are recommended for
            non-normal data or ordinal measurements.
          </Typography>
        </Alert>
      )}

      {testType && testType !== 'mann-whitney' && (
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>{testType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong> is under development
            and will be available soon!
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default NonParametricTests;
