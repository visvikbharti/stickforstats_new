/**
 * Categorical Tests Component
 *
 * Test relationships between categorical variables:
 * - Chi-square Test of Independence
 * - Cramer's V (effect size)
 * - Contingency Table visualization
 * - Expected vs Observed frequencies
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import GridOnIcon from '@mui/icons-material/GridOn';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import guardianService from '../../../services/GuardianService';
import GuardianWarning from '../../Guardian/GuardianWarning';
import VisualEvidence from '../../VisualEvidence';
import { CodeExportPanel } from '../../common';
import { DebuggerPanel } from '../../statistical-debugger';
import { useSettings } from '../../../context/SettingsContext';
import { runChiSquareIndependence } from '../utils/hubTestService';
import { formatPValue, formatNumber } from '../../../utils/formatStats';

// The chi-square upper tail used to be implemented right here, in the browser: a Lanczos
// log-gamma plus a continued-fraction incomplete gamma, about 70 lines of it, carrying its own
// comment about the p = 0.0000 bug it had once had. It is gone. The test is computed by the
// backend now, so there is one tested implementation of this rather than a second copy that has
// to be kept correct by hand.

/**
 * Main Categorical Tests Component
 */
const CategoricalTests = ({ data }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { expertMode } = useSettings();

  const [variable1, setVariable1] = useState('');
  const [variable2, setVariable2] = useState('');
  const [alpha, setAlpha] = useState(0.05);

  // Guardian Integration State
  const [guardianReport, setGuardianReport] = useState(null);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianError, setGuardianError] = useState(null);
  const [isTestBlocked, setIsTestBlocked] = useState(false);
  const [showVisualEvidence, setShowVisualEvidence] = useState(false);

  /**
   * Guardian Action Handlers
   */
  const handleGuardianProceed = () => {
    setIsTestBlocked(false);
  };

  // Guardian's alternative for a sparse contingency table is Fisher's exact test, which the
  // backend runs automatically when the expected counts are too small. There is nothing for the
  // user to go and select, so there is nothing to pop an alert about.
  const handleSelectAlternative = () => {};

  const handleViewEvidence = () => {
    setShowVisualEvidence(true);
  };

  const handleCloseVisualEvidence = () => {
    setShowVisualEvidence(false);
  };

  /**
   * Prepare data for VisualEvidence component
   */
  const visualEvidenceData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);
    const numericColumns = columns.filter(col => {
      const values = data.map(row => parseFloat(row[col]));
      return values.some(v => !isNaN(v));
    });

    return {
      data: data,
      columns: numericColumns.length > 0 ? numericColumns : columns
    };
  }, [data]);

  /**
   * Detect categorical columns
   */
  const categoricalColumns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const columns = [];
    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueCount = new Set(values).size;

      // Consider categorical if unique values < 20
      if (uniqueCount > 1 && uniqueCount < 20) {
        columns.push(key);
      }
    });

    return columns;
  }, [data]);

  /**
   * Extract categorical data for Guardian export
   * For categorical tests, we encode categories as numeric indices for statistical validation
   */
  const categoryData = useMemo(() => {
    if (!variable1 || !variable2 || !data || data.length === 0) return [];

    // Extract both categorical variables and encode them as numeric indices
    const var1Values = data.map(row => String(row[variable1] || 'Missing'));
    const var2Values = data.map(row => String(row[variable2] || 'Missing'));

    // Create category-to-index mapping
    const uniqueVar1 = [...new Set(var1Values)];
    const uniqueVar2 = [...new Set(var2Values)];

    const var1Map = Object.fromEntries(uniqueVar1.map((cat, idx) => [cat, idx]));
    const var2Map = Object.fromEntries(uniqueVar2.map((cat, idx) => [cat, idx]));

    // Encode categories as numbers for export
    const encoded1 = var1Values.map(v => var1Map[v]);
    const encoded2 = var2Values.map(v => var2Map[v]);

    return [...encoded1, ...encoded2];
  }, [data, variable1, variable2]);

  /**
   * Build contingency table
   */
  const contingencyTable = useMemo(() => {
    if (!variable1 || !variable2 || !data) return null;

    const table = {};
    const rowTotals = {};
    const colTotals = {};
    let grandTotal = 0;

    // Get unique categories
    const categories1 = [...new Set(data.map(row => String(row[variable1] || 'Missing')))].sort();
    const categories2 = [...new Set(data.map(row => String(row[variable2] || 'Missing')))].sort();

    // Initialize table
    categories1.forEach(cat1 => {
      table[cat1] = {};
      rowTotals[cat1] = 0;
      categories2.forEach(cat2 => {
        table[cat1][cat2] = 0;
        if (!colTotals[cat2]) colTotals[cat2] = 0;
      });
    });

    // Count observations
    data.forEach(row => {
      const val1 = String(row[variable1] || 'Missing');
      const val2 = String(row[variable2] || 'Missing');

      if (table[val1] && table[val1][val2] !== undefined) {
        table[val1][val2]++;
        rowTotals[val1]++;
        colTotals[val2]++;
        grandTotal++;
      }
    });

    return {
      table,
      rowTotals,
      colTotals,
      grandTotal,
      categories1,
      categories2
    };
  }, [data, variable1, variable2]);

  /**
   * The chi-square test is run by the backend.
   *
   * The cross-tabulation above is just counting, and stays here. The TEST does not: the browser
   * copy had no check that the expected frequencies are large enough for the chi-square
   * approximation to hold, and no Fisher's exact fallback for when they are not -- so on a
   * sparse table it reported a chi-square p-value that the chi-square distribution does not
   * license. The backend checks `expected_frequencies_ge_5` and says so.
   */
  const [chiSquareResult, setChiSquareResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!contingencyTable) {
      setChiSquareResult(null);
      setTestError(null);
      return undefined;
    }

    const { table, categories1, categories2 } = contingencyTable;

    const run = async () => {
      setTestLoading(true);
      setTestError(null);

      try {
        const matrix = categories1.map((cat1) => categories2.map((cat2) => table[cat1][cat2]));
        const result = await runChiSquareIndependence(matrix, alpha);
        if (cancelled) return;

        // Re-key the backend's row-major arrays onto the category names the table renders with.
        const byCategory = (grid) => {
          if (!Array.isArray(grid)) return null;
          const out = {};
          categories1.forEach((cat1, i) => {
            out[cat1] = {};
            categories2.forEach((cat2, j) => {
              out[cat1][cat2] = grid[i]?.[j] ?? null;
            });
          });
          return out;
        };

        setChiSquareResult({
          chiSquare: result.statistic,
          df: result.df,
          pValue: result.pValue,
          // `null < alpha` is true in JavaScript. A missing p-value is not a significant one.
          significant: result.pValue === null ? null : result.pValue < alpha,
          cramersV: result.cramersV,
          expected: byCategory(result.expected),
          residuals: byCategory(result.raw?.results?.standardized_residuals),
          expectedFrequenciesOk: result.assumptionsMet?.expected_frequencies_ge_5 ?? null,
          recommendations: result.recommendations || [],
          interpretation: result.interpretation
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Chi-square backend call failed:', error);
        setTestError(error.message || 'The chi-square test could not be computed.');
        setChiSquareResult(null);
      } finally {
        if (!cancelled) setTestLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [contingencyTable, alpha]);

  /**
   * Get effect size interpretation
   */
  const getEffectSize = (v) => {
    if (v < 0.1) return 'Negligible';
    if (v < 0.3) return 'Small';
    if (v < 0.5) return 'Medium';
    return 'Large';
  };

  /**
   * Get color for residual heatmap
   */
  const getResidualColor = (residual) => {
    // Residuals: positive = more than expected (blue), negative = less than expected (red)
    const abs = Math.abs(residual);
    if (residual > 0) {
      const intensity = Math.floor(255 - Math.min(abs * 50, 200));
      return `rgb(${intensity}, ${intensity}, 255)`;
    } else {
      const intensity = Math.floor(255 - Math.min(abs * 50, 200));
      return `rgb(255, ${intensity}, ${intensity})`;
    }
  };

  /**
   * Guardian Integration: Check statistical assumptions for chi-square test
   * Note: Chi-square test assumes sufficient expected frequencies (usually >= 5)
   */
  useEffect(() => {
    const checkGuardianAssumptions = async () => {
      // Reset previous Guardian state
      setGuardianReport(null);
      setGuardianError(null);
      setIsTestBlocked(false);

      // Only check if we have both variables and contingency table
      if (!variable1 || !variable2 || !contingencyTable || !data || data.length === 0) {
        return;
      }

      try {
        // Prepare observed frequencies matrix for Guardian
        const { table, categories1, categories2 } = contingencyTable;

        // Convert contingency table to 2D array format for Guardian
        const observed = categories1.map(cat1 =>
          categories2.map(cat2 => table[cat1][cat2])
        );

        const dataToCheck = {
          observed: observed,
          categories1: categories1,
          categories2: categories2
        };

        const backendTestType = 'chi_square'; // Guardian test type for categorical tests

        // Call Guardian service
        setGuardianLoading(true);
        const report = await guardianService.checkAssumptions(
          dataToCheck,
          backendTestType,
          alpha
        );

        setGuardianReport(report);
        setIsTestBlocked(!expertMode && !report.can_proceed);
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
  }, [variable1, variable2, contingencyTable, alpha, data, expertMode]);

  /**
   * Prepare visualization data
   */
  const vizData = useMemo(() => {
    if (!contingencyTable) return [];

    const { table, categories1, categories2 } = contingencyTable;
    const result = [];

    categories1.forEach(cat1 => {
      const dataPoint = { category: cat1 };
      categories2.forEach(cat2 => {
        dataPoint[cat2] = table[cat1][cat2];
      });
      result.push(dataPoint);
    });

    return result;
  }, [contingencyTable]);

  /**
   * Color palette for bars
   */
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#d084d0', '#a4de6c'];

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

  if (categoricalColumns.length < 2) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Categorical tests require at least 2 categorical columns. Found: {categoricalColumns.length}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Categorical columns are those with fewer than 20 unique values.
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
          <GridOnIcon /> Categorical Tests Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Variable 1 (Rows)</InputLabel>
              <Select
                value={variable1}
                label="Variable 1 (Rows)"
                onChange={(e) => setVariable1(e.target.value)}
              >
                <MenuItem value=""><em>Select variable...</em></MenuItem>
                {categoricalColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Variable 2 (Columns)</InputLabel>
              <Select
                value={variable2}
                label="Variable 2 (Columns)"
                onChange={(e) => setVariable2(e.target.value)}
              >
                <MenuItem value=""><em>Select variable...</em></MenuItem>
                {categoricalColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
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

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Chi-square Test:</strong> Tests whether two categorical variables are independent.
            H₀: Variables are independent vs H₁: Variables are associated.
          </Typography>
        </Alert>
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
      {guardianReport && (
        <GuardianWarning
          guardianReport={guardianReport}
          data={categoryData}
          alpha={alpha}
          onProceed={handleGuardianProceed}
          onSelectAlternative={handleSelectAlternative}
          onViewEvidence={handleViewEvidence}
        />
      )}

      {/* Test Blocked Notice */}
      {isTestBlocked && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: isDarkMode ? theme.palette.warning.dark + '20' : theme.palette.warning.light + '30', border: `2px solid ${theme.palette.warning.main}` }}>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.warning.dark, display: 'flex', alignItems: 'center', gap: 1 }}>
            🚫 Test Execution Blocked
          </Typography>
          <Typography variant="body2" paragraph>
            This chi-square test cannot proceed due to critical assumption violations detected by the Guardian system.
          </Typography>
          <Typography variant="body2">
            <strong>Recommendation:</strong> Review the violations above and use the suggested alternative tests or address the data issues.
          </Typography>
        </Paper>
      )}

      {/* Results */}
      {testLoading && (
        <Paper elevation={2} sx={{ p: 4, mb: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>Running the chi-square test...</Typography>
        </Paper>
      )}

      {testError && !testLoading && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            The chi-square test could not be computed.
          </Typography>
          <Typography variant="body2">{testError}</Typography>
        </Alert>
      )}

      {/* The chi-square approximation needs expected counts of about 5. Say so when it fails. */}
      {chiSquareResult && chiSquareResult.expectedFrequenciesOk === false && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Some expected cell counts are below 5, so the chi-square approximation is unreliable
            on this table. Fisher's exact test is the appropriate test here.
          </Typography>
        </Alert>
      )}

      {contingencyTable && chiSquareResult && !isTestBlocked && (
        <>
          {/* Test Statistics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">χ² Statistic</Typography>
                  <Typography variant="h6">{formatNumber(chiSquareResult.chiSquare, 4)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Degrees of Freedom</Typography>
                  <Typography variant="h6">{chiSquareResult.df}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">p-value</Typography>
                  <Typography variant="h6">{formatPValue(chiSquareResult.pValue)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {chiSquareResult.significant === null
                      ? 'Undefined'
                      : chiSquareResult.significant ? 'Significant' : 'Not Significant'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Cramer's V</Typography>
                  <Typography variant="h6">{formatNumber(chiSquareResult.cramersV, 4)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getEffectSize(chiSquareResult.cramersV)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Chi-Square Test Results */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Chi-square Test of Independence
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: {variable1} and {variable2} are independent
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                    <TableCell><strong>Statistic</strong></TableCell>
                    <TableCell align="right"><strong>Value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Chi-square (χ²)</TableCell>
                    <TableCell align="right">{formatNumber(chiSquareResult.chiSquare, 4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Degrees of Freedom</TableCell>
                    <TableCell align="right">{chiSquareResult.df}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{formatPValue(chiSquareResult.pValue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cramer's V (Effect Size)</TableCell>
                    <TableCell align="right">{formatNumber(chiSquareResult.cramersV, 4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {chiSquareResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Interpretation:
              </Typography>
              <Alert severity={chiSquareResult.significant ? "warning" : "info"}>
                <Typography variant="body2">
                  {chiSquareResult.significant ? (
                    <>
                      There is a <strong>significant association</strong> between {variable1} and {variable2}
                      (χ² = {formatNumber(chiSquareResult.chiSquare, 2)}, df = {chiSquareResult.df}, p = {formatPValue(chiSquareResult.pValue)} {'<'} {alpha}).
                      Effect size is <strong>{getEffectSize(chiSquareResult.cramersV).toLowerCase()}</strong> (V = {formatNumber(chiSquareResult.cramersV, 3)}).
                    </>
                  ) : (
                    <>
                      There is <strong>no significant association</strong> between {variable1} and {variable2}
                      (χ² = {formatNumber(chiSquareResult.chiSquare, 2)}, df = {chiSquareResult.df}, p = {formatPValue(chiSquareResult.pValue)} {'>='} {alpha}).
                      The variables appear to be independent.
                    </>
                  )}
                </Typography>
              </Alert>
            </Box>
          </Paper>

          {/* Contingency Table - Observed Frequencies */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contingency Table: Observed Frequencies
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: `2px solid ${theme.palette.divider}`, fontWeight: 'bold', color: theme.palette.text.primary }}>
                      {variable1} \ {variable2}
                    </th>
                    {contingencyTable.categories2.map((cat) => (
                      <th key={cat} style={{ padding: '8px', textAlign: 'center', borderBottom: `2px solid ${theme.palette.divider}`, color: theme.palette.text.primary }}>
                        {cat}
                      </th>
                    ))}
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: `2px solid ${theme.palette.divider}`, fontWeight: 'bold', color: theme.palette.text.primary }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contingencyTable.categories1.map((row, rowIndex) => (
                    <tr key={row}>
                      <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: rowIndex % 2 === 0 ? theme.palette.background.paper : (isDarkMode ? theme.palette.grey[900] : theme.palette.grey[50]), color: theme.palette.text.primary }}>
                        {row}
                      </td>
                      {contingencyTable.categories2.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            border: `1px solid ${theme.palette.divider}`,
                            backgroundColor: rowIndex % 2 === 0 ? theme.palette.background.paper : (isDarkMode ? theme.palette.grey[900] : theme.palette.grey[50]),
                            color: theme.palette.text.primary
                          }}
                        >
                          {contingencyTable.table[row][col]}
                        </td>
                      ))}
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: isDarkMode ? theme.palette.grey[800] : theme.palette.grey[100], color: theme.palette.text.primary }}>
                        {contingencyTable.rowTotals[row]}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: isDarkMode ? theme.palette.grey[800] : theme.palette.grey[100], color: theme.palette.text.primary }}>
                      Total
                    </td>
                    {contingencyTable.categories2.map((col) => (
                      <td key={col} style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: isDarkMode ? theme.palette.grey[700] : theme.palette.grey[200], color: theme.palette.text.primary }}>
                        {contingencyTable.colTotals[col]}
                      </td>
                    ))}
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: isDarkMode ? theme.palette.grey[600] : theme.palette.grey[300], color: theme.palette.text.primary }}>
                      {contingencyTable.grandTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>
          </Paper>

          {/* Expected Frequencies */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Expected Frequencies (Under Independence)
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: `2px solid ${theme.palette.divider}`, fontWeight: 'bold', color: theme.palette.text.primary }}>
                      {variable1} \ {variable2}
                    </th>
                    {contingencyTable.categories2.map((cat) => (
                      <th key={cat} style={{ padding: '8px', textAlign: 'center', borderBottom: `2px solid ${theme.palette.divider}`, color: theme.palette.text.primary }}>
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contingencyTable.categories1.map((row, rowIndex) => (
                    <tr key={row}>
                      <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: rowIndex % 2 === 0 ? theme.palette.background.paper : (isDarkMode ? theme.palette.grey[900] : theme.palette.grey[50]), color: theme.palette.text.primary }}>
                        {row}
                      </td>
                      {contingencyTable.categories2.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            border: `1px solid ${theme.palette.divider}`,
                            backgroundColor: rowIndex % 2 === 0 ? theme.palette.background.paper : (isDarkMode ? theme.palette.grey[900] : theme.palette.grey[50]),
                            color: theme.palette.text.primary
                          }}
                        >
                          {formatNumber(chiSquareResult.expected?.[row]?.[col], 2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>

          {/* Standardized Residuals Heatmap */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Standardized Residuals
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              Blue = More than expected, Red = Less than expected, |residual| {'>'}  2 indicates significant deviation
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: `2px solid ${theme.palette.divider}`, fontWeight: 'bold', color: theme.palette.text.primary }}>
                      {variable1} \ {variable2}
                    </th>
                    {contingencyTable.categories2.map((cat) => (
                      <th key={cat} style={{ padding: '8px', textAlign: 'center', borderBottom: `2px solid ${theme.palette.divider}`, color: theme.palette.text.primary }}>
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contingencyTable.categories1.map((row, rowIndex) => (
                    <tr key={row}>
                      <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: rowIndex % 2 === 0 ? theme.palette.background.paper : (isDarkMode ? theme.palette.grey[900] : theme.palette.grey[50]), color: theme.palette.text.primary }}>
                        {row}
                      </td>
                      {contingencyTable.categories2.map((col) => {
                        const residual = chiSquareResult.residuals?.[row]?.[col] ?? null;
                        const isSignificant = Math.abs(residual) > 2;
                        return (
                          <td
                            key={col}
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              border: `1px solid ${theme.palette.divider}`,
                              backgroundColor: getResidualColor(residual),
                              fontWeight: isSignificant ? 'bold' : 'normal'
                            }}
                          >
                            {residual.toFixed(2)}
                            {isSignificant && ' *'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Legend:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(55, 55, 255)', border: `1px solid ${theme.palette.divider}` }} />
                  <Typography variant="caption">Much more than expected</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(240, 240, 240)', border: `1px solid ${theme.palette.divider}` }} />
                  <Typography variant="caption">As expected</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(255, 55, 55)', border: `1px solid ${theme.palette.divider}` }} />
                  <Typography variant="caption">Much less than expected</Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  * = |residual| {'>'} 2 (significant cell)
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Grouped Bar Chart: {variable1} by {variable2}
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={vizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" label={{ value: variable1, position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  {contingencyTable.categories2.map((cat, index) => (
                    <Bar key={cat} dataKey={cat} fill={COLORS[index % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* R/Python Code Export */}
          <CodeExportPanel
            testType="chi_square"
            data={{
              contingencyTable: contingencyTable.table,
              variable1,
              variable2,
              categories1: contingencyTable.categories1,
              categories2: contingencyTable.categories2,
              n: contingencyTable.grandTotal
            }}
            results={{
              chiSquare: chiSquareResult.chiSquare,
              df: chiSquareResult.df,
              pValue: chiSquareResult.pValue,
              cramersV: chiSquareResult.cramersV,
              significant: chiSquareResult.significant
            }}
            assumptions={guardianReport || {}}
            options={{
              alpha
            }}
          />

          {/* Statistical Debugger */}
          <DebuggerPanel
            testType="chi_square"
            data={{
              contingencyTable: contingencyTable.table,
              variable1,
              variable2,
              categories1: contingencyTable.categories1,
              categories2: contingencyTable.categories2,
              n: contingencyTable.grandTotal,
              expected: chiSquareResult.expected
            }}
            results={{
              statistic: chiSquareResult.chiSquare,
              df: chiSquareResult.df,
              pValue: chiSquareResult.pValue,
              cramersV: chiSquareResult.cramersV,
              effectSize: chiSquareResult.cramersV,
              significant: chiSquareResult.significant
            }}
            assumptions={guardianReport || {}}
            options={{
              alpha
            }}
          />
        </>
      )}

      {/* Selection prompts */}
      {(!variable1 || !variable2) && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select <strong>two categorical variables</strong> to perform chi-square test.
          </Typography>
        </Alert>
      )}

      {variable1 && variable2 && variable1 === variable2 && (
        <Alert severity="warning">
          <Typography variant="body2">
            Please select <strong>two different variables</strong>. Chi-square test requires two distinct categorical variables.
          </Typography>
        </Alert>
      )}

      {/* Visual Evidence Dialog */}
      <Dialog
        open={showVisualEvidence}
        onClose={handleCloseVisualEvidence}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '70vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Typography variant="h6">
            📊 Visual Evidence - Assumption Diagnostics
          </Typography>
          <IconButton
            onClick={handleCloseVisualEvidence}
            sx={{ color: 'inherit' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {visualEvidenceData ? (
            <VisualEvidence
              data={visualEvidenceData}
              testType="chi_square"
              guardianReport={guardianReport}
            />
          ) : (
            <Alert severity="info">
              <Typography variant="body2">
                No data available for visualization. Please select variables first.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.100' }}>
          <Button onClick={handleCloseVisualEvidence} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoricalTests;
