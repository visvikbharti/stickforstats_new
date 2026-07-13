/**
 * Normality Tests Component
 *
 * Tests if data follows a normal distribution:
 * - Shapiro-Wilk Test (most powerful for n < 2000)
 * - Anderson-Darling Test (good for detecting deviations in tails)
 * - D'Agostino K² Test (combines skewness and kurtosis)
 * - Visual diagnostics: Q-Q Plot, Histogram with KDE
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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { calculateDescriptiveStats } from '../utils/statisticalUtils';
import { runNormalityTests } from '../utils/hubTestService';
import guardianService from '../../../services/GuardianService';
import GuardianWarning from '../../Guardian/GuardianWarning';
import { CodeExportPanel } from '../../common';
import { DebuggerPanel } from '../../statistical-debugger';

/**
 * A statistic the backend reports as null does not exist -- the test was not applicable to
 * this sample. It renders as an em dash. It must never become 0, and `x.toFixed()` on it
 * would throw and blank the page.
 */
const fmtStat = (value) => (Number.isFinite(value) ? value.toFixed(4) : '\u2014');

/**
 * Very small p-values are real and are shown in scientific notation. The browser engine this
 * replaced printed them as "0.0000".
 */
const fmtP = (value) => {
  if (!Number.isFinite(value)) return '\u2014';
  if (value === 0) return '< 1e-300';
  if (value < 0.0001) return value.toExponential(2);
  return value.toFixed(4);
};


/**
 * Utility functions for statistical calculations
 * Defined outside component to avoid re-creation and initialization errors
 */

/**
 * Standard normal CDF (approximation)
 */

/**
 * Chi-square CDF (approximation for df=2)
 */

/**
 * Inverse normal CDF (approximation)
 */
const inverseNormalCDF = (p) => {
  // Approximation using rational function
  if (p < 0.5) {
    const t = Math.sqrt(-2 * Math.log(p));
    return -(t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
      (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t));
  } else {
    const t = Math.sqrt(-2 * Math.log(1 - p));
    return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
      (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  }
};

/**
 * Main Normality Tests Component
 */
const NormalityTests = ({ data }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [selectedColumn, setSelectedColumn] = useState('');
  const [alpha, setAlpha] = useState(0.05);

  // Guardian Integration State (informational only for normality tests)
  const [guardianReport, setGuardianReport] = useState(null);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianError, setGuardianError] = useState(null);
  const [isTestBlocked, setIsTestBlocked] = useState(false);

  /**
   * Handle proceeding despite Guardian warnings
   */
  const handleGuardianProceed = () => {
    setIsTestBlocked(false);
  };

  /**
   * Handle visual evidence viewing from Guardian
   */
  const handleViewEvidence = (evidence) => {
    // Evidence data available for diagnostic visualization
  };

  /**
   * Detect numeric columns
   */
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const columns = [];
    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      if (numericCount / values.length > 0.8) {
        columns.push(key);
      }
    });

    return columns;
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
   * Calculate descriptive statistics
   */
  const stats = useMemo(() => {
    if (columnData.length === 0) return null;
    return calculateDescriptiveStats(columnData);
  }, [columnData]);

  /**
   * Normality tests. These run on the BACKEND (scipy), not in the browser.
   *
   * The browser versions they replace were not usable:
   *   * shapiroWilkTest() used W coefficients that are not Royston's, a normalizing
   *     transform that ignored n entirely, and a hard floor -- Math.max(0.001, ...) -- so no
   *     sample, however non-normal, could ever report p < 0.001. It was not an approximate
   *     Shapiro-Wilk; it was not a Shapiro-Wilk.
   *   * D'Agostino's p came from `1 - chiSquareCDF(k2, 2)`, which cancels to exactly 0 for
   *     any decisively non-normal sample, printing "p = 0.0000".
   *   * All three then disagreed with the Guardian's real Shapiro-Wilk, running on the same
   *     data, on the same screen.
   */
  const [normality, setNormality] = useState(null);
  const [normalityError, setNormalityError] = useState(null);
  const [normalityLoading, setNormalityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (columnData.length < 3) {
      setNormality(null);
      setNormalityError(null);
      return undefined;
    }

    setNormalityLoading(true);
    setNormalityError(null);

    runNormalityTests(columnData, alpha)
      .then((response) => {
        if (!cancelled) setNormality(response);
      })
      .catch((err) => {
        if (!cancelled) {
          setNormality(null);
          setNormalityError(
            err.response?.data?.error || err.message || 'Could not run the normality tests.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setNormalityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [columnData, alpha]);

  // Adapt the backend's list of tests to the shape this component renders. A test the
  // backend declined to run (Shapiro-Wilk above n = 5000, D'Agostino below n = 20) comes
  // back with null statistic and null p-value, and renders as "not run" rather than as a
  // number someone made up.
  const byName = (name) => {
    const test = normality?.tests?.find((t) => t.name === name);
    if (!test) return null;
    return {
      statistic: test.statistic,
      pValue: test.pValue,
      isNormal: test.normal,
      note: test.note,
      ran: test.pValue !== null,
    };
  };

  const shapiroResult = byName('Shapiro-Wilk');
  const andersonResult = byName('Anderson-Darling');
  const dAgostinoResult = byName("D'Agostino-Pearson");

  /**
   * Prepare Q-Q Plot data
   */
  const qqPlotData = useMemo(() => {
    if (columnData.length === 0) return [];

    const sorted = [...columnData].sort((a, b) => a - b);
    const n = sorted.length;

    return sorted.map((value, i) => {
      // Theoretical quantile (standard normal)
      const p = (i + 0.5) / n;
      const theoreticalQuantile = inverseNormalCDF(p);

      // Sample quantile (standardized)
      const standardized = stats ? (value - stats.mean) / stats.std : value;

      return {
        theoretical: theoreticalQuantile,
        sample: standardized,
        original: value
      };
    });
  }, [columnData, stats]);

  /**
   * Prepare histogram data with normal overlay
   */
  const histogramData = useMemo(() => {
    if (columnData.length === 0 || !stats) return [];

    const numBins = Math.min(30, Math.ceil(Math.sqrt(columnData.length)));
    const binWidth = (stats.max - stats.min) / numBins;

    const bins = Array(numBins).fill(0);
    columnData.forEach(value => {
      const binIndex = Math.min(Math.floor((value - stats.min) / binWidth), numBins - 1);
      bins[binIndex]++;
    });

    // Calculate normal distribution overlay
    return bins.map((count, i) => {
      const binCenter = stats.min + (i + 0.5) * binWidth;
      const density = count / columnData.length;

      // Normal distribution PDF
      const z = (binCenter - stats.mean) / stats.std;
      const normalDensity = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * binWidth;

      return {
        binCenter: binCenter.toFixed(2),
        observed: density,
        expected: normalDensity,
        count: count
      };
    });
  }, [columnData, stats]);

  /**
   * Guardian Integration: Data quality checks for normality testing
   * Note: We don't block normality tests (the whole point is to TEST normality),
   * but Guardian can warn about data quality issues that affect test accuracy
   */
  useEffect(() => {
    const checkGuardianAssumptions = async () => {
      // Reset previous Guardian state
      setGuardianReport(null);
      setGuardianError(null);
      setIsTestBlocked(false); // Never block normality tests

      // Only check if we have selected column and data
      if (!selectedColumn || !columnData || columnData.length === 0) {
        return;
      }

      // Need minimum sample size for Guardian checks
      if (columnData.length < 3) {
        return;
      }

      try {
        // Prepare data for Guardian - simple array format
        const dataToCheck = {
          'data': columnData
        };

        // Use t_test type for Guardian (it checks normality assumptions)
        const backendTestType = 't_test';

        // Call Guardian service (informational only)
        setGuardianLoading(true);
        const report = await guardianService.checkAssumptions(
          dataToCheck,
          backendTestType,
          alpha
        );

        setGuardianReport(report);
        // IMPORTANT: Never block normality tests - this is informational only
        setIsTestBlocked(false);
        setGuardianLoading(false);

      } catch (error) {
        console.error('Guardian check failed:', error);
        setGuardianError(error.message || 'Failed to validate data quality');
        setGuardianLoading(false);
        setIsTestBlocked(false);
      }
    };

    checkGuardianAssumptions();
  }, [selectedColumn, columnData, alpha]);

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

  if (numericColumns.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            No numeric columns found in the dataset. Normality tests require numeric data.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Configuration Panel */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon /> Normality Tests Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Column</InputLabel>
              <Select
                value={selectedColumn}
                label="Select Column"
                onChange={(e) => setSelectedColumn(e.target.value)}
              >
                <MenuItem value="">
                  <em>Choose a column...</em>
                </MenuItem>
                {numericColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
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
        </Grid>
      </Paper>

      {/* Guardian Loading State */}
      {guardianLoading && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="body1" component="span">
            Checking data quality...
          </Typography>
        </Paper>
      )}

      {/* Guardian Error State */}
      {guardianError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Guardian data quality check unavailable:</strong> {guardianError}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Proceeding with normality tests. Results are still valid.
          </Typography>
        </Alert>
      )}

      {/* Guardian Warning Display (Informational Only) */}
      {guardianReport && (
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: theme.palette.grey[isDarkMode ? 800 : 100], borderLeft: `4px solid ${theme.palette.info.main}` }}>
          <Typography variant="subtitle2" gutterBottom sx={{ color: theme.palette.primary.main, display: 'flex', alignItems: 'center', gap: 1 }}>
            ℹ️ Data Quality Information
          </Typography>
          <GuardianWarning
            // This screen is a distributional check, not a group comparison, so
            // the backend's two-sample "alternative tests" (Mann-Whitney, etc.)
            // are semantically wrong here and used to dead-end in an alert.
            // Suppress them; the normality verdict itself is still shown.
            guardianReport={{ ...guardianReport, alternative_tests: [] }}
            data={columnData}
            alpha={alpha}
            onProceed={handleGuardianProceed}
            onViewEvidence={handleViewEvidence}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>Note:</strong> These are informational warnings about data quality.
              Normality tests will still run to help you assess your data distribution.
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Results */}
      {selectedColumn && columnData.length > 0 && !isTestBlocked && (
        <>
          {/* Descriptive Statistics */}
          {stats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Sample Size</Typography>
                    <Typography variant="h6">{stats.count}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Mean ± SD</Typography>
                    <Typography variant="h6">{stats.mean.toFixed(2)} ± {stats.std.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Skewness</Typography>
                    <Typography variant="h6">{stats.skewness.toFixed(3)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.abs(stats.skewness) < 0.5 ? 'Approximately symmetric' :
                       stats.skewness > 0 ? 'Right-skewed' : 'Left-skewed'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Kurtosis</Typography>
                    <Typography variant="h6">{stats.kurtosis.toFixed(3)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.abs(stats.kurtosis) < 0.5 ? 'Approximately normal' :
                       stats.kurtosis > 0 ? 'Heavy-tailed' : 'Light-tailed'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Test Results Table */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Normality Test Results (α = {alpha})
            </Typography>

            {normalityLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Running the tests on the server…
                </Typography>
              </Box>
            )}

            {/* If the backend call fails, say so. Falling back to a browser approximation --
                which is what this page used to do, permanently -- would put a number on the
                screen that the user has no way to distinguish from a real one. */}
            {normalityError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {normalityError} No result is shown rather than an approximate one.
              </Alert>
            )}

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                    <TableCell><strong>Test</strong></TableCell>
                    <TableCell align="right"><strong>Statistic</strong></TableCell>
                    <TableCell align="right"><strong>p-value</strong></TableCell>
                    <TableCell align="center"><strong>Result</strong></TableCell>
                    <TableCell><strong>Interpretation</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Shapiro-Wilk */}
                  {shapiroResult && (
                    <TableRow>
                      <TableCell>Shapiro-Wilk</TableCell>
                      <TableCell align="right">{fmtStat(shapiroResult.statistic)}</TableCell>
                      <TableCell align="right">{fmtP(shapiroResult.pValue)}</TableCell>
                      <TableCell align="center">
                        {shapiroResult.isNormal ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label="Normal"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<CancelOutlinedIcon />}
                            label="Not Normal"
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {shapiroResult.isNormal
                          ? `Data appears normally distributed (p > ${alpha})`
                          : `Data deviates from normal distribution (p < ${alpha})`}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Anderson-Darling */}
                  {andersonResult && (
                    <TableRow>
                      <TableCell>Anderson-Darling</TableCell>
                      <TableCell align="right">{fmtStat(andersonResult.statistic)}</TableCell>
                      <TableCell align="right">{fmtP(andersonResult.pValue)}</TableCell>
                      <TableCell align="center">
                        {andersonResult.isNormal ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label="Normal"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<CancelOutlinedIcon />}
                            label="Not Normal"
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {andersonResult.isNormal
                          ? 'Data fits normal distribution well'
                          : 'Data shows significant deviation from normality'}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* D'Agostino K² */}
                  {dAgostinoResult && (
                    <TableRow>
                      <TableCell>D'Agostino K²</TableCell>
                      <TableCell align="right">{fmtStat(dAgostinoResult.statistic)}</TableCell>
                      <TableCell align="right">{fmtP(dAgostinoResult.pValue)}</TableCell>
                      <TableCell align="center">
                        {dAgostinoResult.isNormal ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label="Normal"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<CancelOutlinedIcon />}
                            label="Not Normal"
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        Combined test of skewness and kurtosis
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Interpretation
                {normality?.primaryTest && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    (based on {normality.primaryTest}, the appropriate test at n = {normality.n})
                  </Typography>
                )}
              </Typography>
              {/* The verdict comes from the test that is APPROPRIATE for this sample size --
                  Shapiro-Wilk up to n = 5000, Anderson-Darling above it -- and the backend
                  says which one that was. It used to be a 2-of-3 majority vote across three
                  tests of different power and different validity ranges, which is not a
                  decision rule that exists in statistics: it let a weak test outvote the
                  right one. */}
              {normality && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {normality.isNormal ? (
                    <Alert severity="success" sx={{ width: '100%' }}>
                      <Typography variant="body2">
                        <strong>Consistent with a normal distribution.</strong> {normality.summary} You can
                        proceed with parametric tests (t-tests, ANOVA).
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ width: '100%' }}>
                      <Typography variant="body2">
                        <strong>Not consistent with a normal distribution.</strong> {normality.summary} Consider
                        non-parametric tests (Mann-Whitney U, Kruskal-Wallis) or a transformation.
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          </Paper>

          {/* Visual Diagnostics */}
          <Grid container spacing={2}>
            {/* Q-Q Plot */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Q-Q Plot (Quantile-Quantile)
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                  Points should follow the diagonal line for normal distribution
                </Typography>
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="theoretical"
                        name="Theoretical Quantiles"
                        label={{ value: 'Theoretical Quantiles', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="sample"
                        name="Sample Quantiles"
                        label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Paper sx={{ p: 1 }}>
                                <Typography variant="caption" display="block">
                                  Theoretical: {payload[0].value.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Sample: {payload[1].value.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Original: {payload[0].payload.original.toFixed(2)}
                                </Typography>
                              </Paper>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={qqPlotData} fill="#8884d8" />
                      {/* Reference line y = x */}
                      <ReferenceLine
                        segment={[
                          { x: -3, y: -3 },
                          { x: 3, y: 3 }
                        ]}
                        stroke="#f44336"
                        strokeWidth={2}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            {/* Histogram with Normal Overlay */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Histogram with Normal Distribution
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                  Blue bars = observed data, Red line = expected normal distribution
                </Typography>
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="binCenter" label={{ value: selectedColumn, position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Density', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="observed" fill="#8884d8" name="Observed" />
                      <Line type="monotone" dataKey="expected" stroke="#f44336" strokeWidth={2} name="Normal Distribution" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* R/Python Code Export */}
          {shapiroResult && (
            <CodeExportPanel
              testType="shapiro_wilk"
              data={{
                values: columnData,
                columnName: selectedColumn,
                n: columnData.length
              }}
              results={{
                shapiroStatistic: shapiroResult?.statistic,
                shapiroPValue: shapiroResult?.pValue,
                shapiroIsNormal: shapiroResult?.isNormal,
                andersonStatistic: andersonResult?.statistic,
                andersonPValue: andersonResult?.pValue,
                andersonIsNormal: andersonResult?.isNormal,
                skewness: stats?.skewness,
                kurtosis: stats?.kurtosis,
                mean: stats?.mean,
                std: stats?.std
              }}
              assumptions={guardianReport || {}}
              options={{
                alpha
              }}
            />
          )}

          {/* Statistical Debugger */}
          {shapiroResult && (
            <DebuggerPanel
              testType="shapiro_wilk"
              data={{
                values: columnData,
                columnName: selectedColumn,
                n: columnData.length
              }}
              results={{
                statistic: shapiroResult?.statistic,
                pValue: shapiroResult?.pValue,
                isNormal: shapiroResult?.isNormal,
                andersonStatistic: andersonResult?.statistic,
                andersonPValue: andersonResult?.pValue,
                andersonIsNormal: andersonResult?.isNormal,
                skewness: stats?.skewness,
                kurtosis: stats?.kurtosis,
                mean: stats?.mean,
                std: stats?.std,
                significant: !shapiroResult?.isNormal
              }}
              assumptions={guardianReport || {}}
              options={{
                alpha
              }}
            />
          )}

          {/* Sample Size Warnings */}
          {columnData.length < 20 && (
            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Small Sample Size (n = {columnData.length}):</strong> Normality tests have low power with small samples.
                Results should be interpreted cautiously. Consider using non-parametric tests.
              </Typography>
            </Alert>
          )}

          {columnData.length > 5000 && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Large Sample Size (n = {columnData.length}):</strong> With large samples, normality tests may detect
                trivial deviations from normality. Focus on visual diagnostics (Q-Q plot, histogram) and practical significance.
              </Typography>
            </Alert>
          )}
        </>
      )}

      {/* Column selection prompt */}
      {!selectedColumn && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select a <strong>numeric column</strong> to test for normality.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default NormalityTests;
