/**
 * Non-Parametric Tests Component
 *
 * Distribution-free tests for non-normal data or ordinal scales:
 * - Mann-Whitney U Test (independent samples)
 * - Kruskal-Wallis H Test (3+ independent groups)
 * - Wilcoxon Signed-Rank Test (paired samples)
 * - Friedman Test (repeated measures)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { endpoints, getApiUrl } from '../../../config/apiConfig';
import { useSettings } from '../../../context/SettingsContext';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Checkbox,
  CircularProgress,
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
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { calculateDescriptiveStats } from '../utils/statisticalUtils';
import guardianService from '../../../services/GuardianService';
import { formatPValue, formatNumber } from '../../../utils/formatStats';
import GuardianWarning from '../../Guardian/GuardianWarning';
import VisualEvidence from '../../VisualEvidence';
import { CodeExportPanel } from '../../common';
import { DebuggerPanel } from '../../statistical-debugger';

/**
 * What each test reports, so the results panel names the right statistic and the right null
 * hypothesis. The panel used to be hard-coded to Mann-Whitney: run Kruskal-Wallis with the
 * backend on and it still said "the two groups have significantly different distributions",
 * for three or more groups.
 */
const TEST_SPECS = {
  'mann-whitney': {
    title: 'Mann-Whitney U Test',
    nullHypothesis: 'the two groups have the same distribution',
    statisticLabel: 'U statistic',
    statisticKeys: ['u_statistic', 'test_statistic'],
    effectSizeLabel: 'Rank-biserial r',
    exportKey: 'mann_whitney_u'
  },
  'kruskal-wallis': {
    title: 'Kruskal-Wallis H Test',
    nullHypothesis: 'all groups have the same distribution',
    statisticLabel: 'H statistic',
    statisticKeys: ['h_statistic', 'test_statistic'],
    effectSizeLabel: 'Epsilon-squared',
    exportKey: 'kruskal_wallis'
  },
  wilcoxon: {
    title: 'Wilcoxon Signed-Rank Test',
    nullHypothesis: 'the paired differences are symmetric about zero',
    statisticLabel: 'W statistic',
    statisticKeys: ['w_statistic', 'test_statistic'],
    effectSizeLabel: 'Effect size r',
    exportKey: 'wilcoxon_signed_rank'
  },
  friedman: {
    title: 'Friedman Test',
    nullHypothesis: 'all conditions have the same distribution',
    statisticLabel: 'Chi-square statistic',
    statisticKeys: ['chi_squared', 'test_statistic'],
    effectSizeLabel: "Kendall's W",
    exportKey: 'friedman'
  }
};

/**
 * The backend sends every number as a decimal STRING (it carries 50 digits; a JS number cannot).
 * Parse for display only, and return null -- never 0 -- when the value is absent. `parseFloat(null)`
 * is NaN and `Number(null)` is 0, and a 0 here would render as a real statistic.
 */
const num = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Main Non-Parametric Tests Component
 */
const NonParametricTests = ({ data }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { expertMode } = useSettings();

  const [testType, setTestType] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedColumn2, setSelectedColumn2] = useState(''); // For Wilcoxon paired test
  const [selectedColumns, setSelectedColumns] = useState([]); // For Friedman test (multiple columns)
  const [groupColumn, setGroupColumn] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  // There is no "use the backend?" checkbox any more. There used to be one, defaulting to OFF,
  // so the number on screen was by default the browser's own float64 re-implementation of the
  // test, and the backend -- the tested, 50-digit, exact-p-value one -- was the opt-in. Two
  // implementations of one test is two answers to one question; the honest count is one.
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);

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

  // Guardian names an alternative test; switch to it, rather than popping an alert that tells
  // the user to go and do it themselves.
  const handleSelectAlternative = (alternativeTest) => {
    const key = String(alternativeTest || '').toLowerCase().replace(/[\s_]+/g, '-');
    const known = ['mann-whitney', 'kruskal-wallis', 'wilcoxon', 'friedman'];
    const match = known.find((t) => key.includes(t));
    if (match) {
      setTestType(match);
      setResult(null);
      setBackendError(null);
    }
  };

  const handleViewEvidence = () => {
    setShowVisualEvidence(true);
  };

  const handleCloseVisualEvidence = () => {
    setShowVisualEvidence(false);
  };

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
   * Prepare data for VisualEvidence component
   */
  const visualEvidenceData = useMemo(() => {
    if (!data || data.length === 0) return null;

    return {
      data: data,
      columns: columnInfo.numeric
    };
  }, [data, columnInfo]);

  /**
   * Extract column data for Guardian and export
   */
  const columnData = useMemo(() => {
    if (!selectedColumn || !data || data.length === 0) return [];

    return data
      .map(row => parseFloat(row[selectedColumn]))
      .filter(val => !isNaN(val));
  }, [data, selectedColumn]);

  /**
   * Get grouped data (for Mann-Whitney and Kruskal-Wallis)
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
   * Get paired data for Wilcoxon Signed-Rank test
   */
  const pairedData = useMemo(() => {
    if (!selectedColumn || !selectedColumn2 || !data) return null;

    const sample1 = [];
    const sample2 = [];

    data.forEach(row => {
      const val1 = parseFloat(row[selectedColumn]);
      const val2 = parseFloat(row[selectedColumn2]);

      if (!isNaN(val1) && !isNaN(val2)) {
        sample1.push(val1);
        sample2.push(val2);
      }
    });

    if (sample1.length < 2) return null;

    return { sample1, sample2 };
  }, [data, selectedColumn, selectedColumn2]);

  /**
   * Get repeated measures data for Friedman test
   */
  const friedmanData = useMemo(() => {
    if (!selectedColumns || selectedColumns.length < 3 || !data) return null;

    const measurements = selectedColumns.map(col => {
      return data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
    });

    // Check all columns have same length
    const n = measurements[0]?.length;
    if (!n || n < 2 || measurements.some(m => m.length !== n)) return null;

    return {
      measurements,
      conditionNames: selectedColumns
    };
  }, [data, selectedColumns]);

  /**
   * Guardian Integration: Check statistical assumptions
   * Note: Non-parametric tests have fewer assumptions, but Guardian still checks:
   * - Independence of observations
   * - Outliers that might skew ranks
   * - Sample size adequacy
   */
  useEffect(() => {
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
        if (testType === 'mann-whitney') {
          if (Object.keys(groupedData).length !== 2) return;
          const groups = Object.values(groupedData);
          if (groups[0].length < 2 || groups[1].length < 2) return;
          dataToCheck = groupedData;
          backendTestType = 'mann_whitney';
        } else {
          // For other non-parametric tests, we'll add support later
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
  }, [testType, groupedData, alpha, data, expertMode]);

  /**
   * Every non-parametric test on this screen is computed by the backend.
   *
   * The response envelope is {success, high_precision_result, results, ...}. The component used
   * to store that WHOLE envelope and then render on `backendResult.test_statistic` -- a key that
   * only exists one level down, inside `high_precision_result`. It was therefore always
   * undefined, and the results panel never rendered at all: ticking the "High-Precision Backend
   * API" box made the results disappear. Unwrap it once, here.
   */
  const runBackendTest = useCallback(async (endpoint, body) => {
    setIsLoading(true);
    setBackendError(null);
    setResult(null);

    try {
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || payload?.detail || `Backend returned ${response.status} ${response.statusText}`
        );
      }

      const inner = payload?.high_precision_result || payload?.results;
      if (!inner) throw new Error('The backend returned no result for this test.');

      setResult(inner);
      return inner;
    } catch (error) {
      console.error('Non-parametric backend call failed:', error);
      setBackendError(error.message || 'The test could not be computed.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
   * Run the test as soon as the selection is complete.
   */
  useEffect(() => {
    if (!testType) {
      setResult(null);
      setBackendError(null);
      return;
    }

    if (testType === 'mann-whitney' && Object.keys(groupedData).length === 2) {
      const groups = Object.values(groupedData);
      if (groups[0].length >= 1 && groups[1].length >= 1) {
        runBackendTest(endpoints.nonparametric.mannWhitney, {
          group1: groups[0],
          group2: groups[1],
          alternative: 'two-sided',
          use_continuity: true,
          calculate_effect_size: true
        });
      }
    } else if (testType === 'kruskal-wallis' && Object.keys(groupedData).length >= 3) {
      runBackendTest(endpoints.nonparametric.kruskalWallis, {
        groups: Object.values(groupedData),
        group_names: Object.keys(groupedData)
      });
    } else if (testType === 'wilcoxon' && pairedData) {
      runBackendTest(endpoints.nonparametric.wilcoxon, {
        x: pairedData.sample1,
        y: pairedData.sample2,
        alternative: 'two-sided'
      });
    } else if (testType === 'friedman' && friedmanData) {
      // friedmanData.measurements is one array PER CONDITION. The backend reads a 2-D array as
      // rows = subjects, columns = conditions, and Friedman ranks WITHIN each row -- so sending
      // it condition-major ranked subjects against each other instead of conditions within a
      // subject. That is a different test, and it changed verdicts: on a 4-subject x
      // 3-condition example it turned chi2 = 8.00, p = 0.018 (significant) into chi2 = 7.11,
      // p = 0.068 (not significant). Transpose to subject-major before sending.
      const conditionMajor = friedmanData.measurements;
      const nSubjects = conditionMajor[0]?.length || 0;
      const subjectMajor = Array.from({ length: nSubjects }, (_, subject) =>
        conditionMajor.map((condition) => condition[subject])
      );

      runBackendTest(endpoints.nonparametric.friedman, {
        measurements: subjectMajor,
        condition_names: friedmanData.conditionNames
      });
    }
  }, [testType, groupedData, pairedData, friedmanData, runBackendTest]);

  /**
   * The numbers the results panel renders, derived from the backend result only.
   */
  const spec = TEST_SPECS[testType] || TEST_SPECS['mann-whitney'];

  const statistic = useMemo(() => {
    if (!result) return null;
    for (const key of spec.statisticKeys) {
      const value = num(result[key]);
      if (value !== null) return value;
    }
    return null;
  }, [result, spec]);

  const pValue = useMemo(() => {
    if (!result) return null;
    return num(result.exact_p_value) ?? num(result.p_value);
  }, [result]);

  const zScore = useMemo(() => (result ? num(result.z_score) : null), [result]);
  const effectSize = useMemo(() => (result ? num(result.effect_size) : null), [result]);

  // `null < alpha` is TRUE in JavaScript (null coerces to 0), so a missing p-value would render
  // as the most significant result possible. Undefined stays undefined.
  const significant = pValue === null ? null : pValue < alpha;

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
        <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                <MenuItem value="mann-whitney">Mann-Whitney U Test (2 independent groups)</MenuItem>
                <MenuItem value="kruskal-wallis">Kruskal-Wallis H Test (3+ independent groups)</MenuItem>
                <MenuItem value="wilcoxon">Wilcoxon Signed-Rank Test (paired samples)</MenuItem>
                <MenuItem value="friedman">Friedman Test (repeated measures)</MenuItem>
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
            <Paper sx={{ p: 2, bgcolor: theme.palette.grey[isDarkMode ? 900 : 50], border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="body2" color="text.secondary">
                Computed on the server. Exact p-values are used for small samples (n&#8321;, n&#8322; &lt; 20 per
                group) via dynamic programming; larger samples use a normal approximation with a
                continuity correction. Which one was used is stated on the result.
              </Typography>

              {/* Sample Size Information */}
              {sampleSizeInfo && testType === 'mann-whitney' && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="caption">
                      {sampleSizeInfo.groupNames[0]}: <strong>n&#8321; = {sampleSizeInfo.n1}</strong>
                    </Typography>
                    <Typography variant="caption">
                      {sampleSizeInfo.groupNames[1]}: <strong>n&#8322; = {sampleSizeInfo.n2}</strong>
                    </Typography>
                    <Typography variant="caption">
                      Total: <strong>N = {sampleSizeInfo.totalN}</strong>
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Mann-Whitney U Test: 2 groups */}
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
                  <InputLabel>Group Column (must have exactly 2 groups)</InputLabel>
                  <Select
                    value={groupColumn}
                    label="Group Column (must have exactly 2 groups)"
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

          {/* Kruskal-Wallis H Test: 3+ groups */}
          {testType === 'kruskal-wallis' && (
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
                  <InputLabel>Group Column (3+ groups)</InputLabel>
                  <Select
                    value={groupColumn}
                    label="Group Column (3+ groups)"
                    onChange={(e) => setGroupColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select group column...</em></MenuItem>
                    {columnInfo.categorical.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {groupColumn && Object.keys(groupedData).length > 0 && (
                <Grid item xs={12}>
                  <Alert severity={Object.keys(groupedData).length >= 3 ? "success" : "warning"}>
                    <Typography variant="body2">
                      Found <strong>{Object.keys(groupedData).length} groups</strong>: {Object.keys(groupedData).join(', ')}
                      {Object.keys(groupedData).length < 3 && " (need at least 3 groups for Kruskal-Wallis)"}
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </>
          )}

          {/* Wilcoxon Signed-Rank Test: paired samples */}
          {testType === 'wilcoxon' && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>First Measurement (Before/Pre)</InputLabel>
                  <Select
                    value={selectedColumn}
                    label="First Measurement (Before/Pre)"
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
                  <InputLabel>Second Measurement (After/Post)</InputLabel>
                  <Select
                    value={selectedColumn2}
                    label="Second Measurement (After/Post)"
                    onChange={(e) => setSelectedColumn2(e.target.value)}
                  >
                    <MenuItem value=""><em>Select column...</em></MenuItem>
                    {columnInfo.numeric.filter(col => col !== selectedColumn).map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {pairedData && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>{pairedData.sample1.length} paired observations</strong> found.
                      Testing if the median difference is significantly different from zero.
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </>
          )}

          {/* Friedman Test: repeated measures */}
          {testType === 'friedman' && (
            <>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select 3+ Measurement Columns (Repeated Conditions)</InputLabel>
                  <Select
                    multiple
                    value={selectedColumns}
                    label="Select 3+ Measurement Columns (Repeated Conditions)"
                    onChange={(e) => setSelectedColumns(e.target.value)}
                    renderValue={(selected) => selected.join(', ')}
                  >
                    {columnInfo.numeric.map((col) => (
                      <MenuItem key={col} value={col}>
                        <Checkbox checked={selectedColumns.indexOf(col) > -1} />
                        {col}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {selectedColumns.length > 0 && (
                <Grid item xs={12}>
                  <Alert severity={selectedColumns.length >= 3 ? "success" : "warning"}>
                    <Typography variant="body2">
                      Selected <strong>{selectedColumns.length} conditions</strong>: {selectedColumns.join(', ')}
                      {selectedColumns.length < 3 && " (need at least 3 conditions for Friedman test)"}
                    </Typography>
                  </Alert>
                </Grid>
              )}
              {friedmanData && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>{friedmanData.measurements[0].length} subjects</strong> × <strong>{friedmanData.conditionNames.length} conditions</strong>.
                      Testing if there are differences among the repeated measurements.
                    </Typography>
                  </Alert>
                </Grid>
              )}
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
          data={columnData}
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
            This test cannot proceed due to critical assumption violations detected by the Guardian system.
          </Typography>
          <Typography variant="body2">
            <strong>Recommendation:</strong> Review the violations above and use the suggested alternative tests or address the data issues.
          </Typography>
        </Paper>
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

      {/* Backend error -- shown, never silently swallowed */}
      {backendError && !isLoading && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            The test could not be computed.
          </Typography>
          <Typography variant="body2">{backendError}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            No result is shown, because there is no result. Nothing on this screen is calculated
            in the browser as a stand-in.
          </Typography>
        </Alert>
      )}

      {/* Results */}
      {result && !isTestBlocked && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3, border: `2px solid ${theme.palette.primary.main}` }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{result.test_name || spec.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={result.exact_p_value ? 'Exact p-value' : 'Normal approximation'}
                  color={result.exact_p_value ? 'success' : 'default'}
                  size="small"
                  variant={result.exact_p_value ? 'filled' : 'outlined'}
                  icon={result.exact_p_value ? <CheckCircleIcon /> : undefined}
                />
                {result.ties_present && (
                  <Chip
                    label={result.ties_correction_applied ? 'Ties: correction applied' : 'Ties present'}
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" paragraph>
              H&#8320;: {spec.nullHypothesis}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell><strong>{spec.statisticLabel}</strong></TableCell>
                    <TableCell align="right">{formatNumber(statistic, 4)}</TableCell>
                  </TableRow>
                  {zScore !== null && (
                    <TableRow>
                      <TableCell><strong>z</strong></TableCell>
                      <TableCell align="right">{formatNumber(zScore, 4)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell>
                      <strong>p-value {result.exact_p_value ? '(exact)' : '(normal approximation)'}</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatPValue(pValue)}</strong>
                    </TableCell>
                  </TableRow>
                  {effectSize !== null && (
                    <TableRow>
                      <TableCell><strong>{spec.effectSizeLabel}</strong></TableCell>
                      <TableCell align="right">{formatNumber(effectSize, 4)}</TableCell>
                    </TableRow>
                  )}
                  {Array.isArray(result.sample_sizes) && result.sample_sizes.length > 0 && (
                    <TableRow>
                      <TableCell><strong>Sample sizes</strong></TableCell>
                      <TableCell align="right">{result.sample_sizes.join(' , ')}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell><strong>Decision at &alpha; = {alpha}</strong></TableCell>
                    <TableCell align="right">
                      {significant === null ? (
                        <Chip label="No p-value" size="small" variant="outlined" />
                      ) : significant ? (
                        <Chip label="Reject H&#8320;" color="warning" size="small" icon={<CheckCircleOutlineIcon />} />
                      ) : (
                        <Chip label="Do not reject H&#8320;" color="default" size="small" icon={<CancelOutlinedIcon />} />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Rank detail, where the test provides it */}
            {result.mean_ranks && Object.keys(result.mean_ranks).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Mean ranks</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.entries(result.mean_ranks).map(([group, meanRank]) => (
                    <Chip
                      key={group}
                      label={`${group}: ${formatNumber(parseFloat(meanRank), 2)}${
                        result.sum_ranks?.[group] ? ` (R = ${formatNumber(parseFloat(result.sum_ranks[group]), 1)})` : ''
                      }`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {result.interpretation && (
              <Alert severity={significant ? 'warning' : 'info'} sx={{ mt: 2 }}>
                <Typography variant="body2">{result.interpretation}</Typography>
              </Alert>
            )}

            {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {result.recommendations.map((rec, i) => (
                  <Typography variant="body2" key={i}>{rec}</Typography>
                ))}
              </Alert>
            )}
          </Paper>

          {/* Group medians */}
          {vizData.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Group Medians</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vizData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="median" fill="#2196f3" name="Median" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}

          <CodeExportPanel
            testType={spec.exportKey}
            data={{ groups: groupedData, columnName: selectedColumn, groupColumn }}
            results={{
              statistic,
              pValue,
              effectSize,
              isExact: !!result.exact_p_value,
              significant
            }}
            assumptions={guardianReport || {}}
            options={{ alpha, alternative: 'two-sided' }}
          />

          <DebuggerPanel
            testType={spec.exportKey}
            data={{
              groups: groupedData,
              columnName: selectedColumn,
              groupColumn,
              n1: sampleSizeInfo?.n1,
              n2: sampleSizeInfo?.n2
            }}
            results={{
              statistic,
              pValue,
              effectSize,
              isExact: !!result.exact_p_value,
              significant
            }}
            assumptions={guardianReport || {}}
            options={{ alpha, alternative: 'two-sided' }}
          />
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

      {/* Data requirement prompts */}
      {testType === 'mann-whitney' && Object.keys(groupedData).length !== 2 && selectedColumn && groupColumn && (
        <Alert severity="warning">
          <Typography variant="body2">
            Mann-Whitney U test requires exactly <strong>2 groups</strong>.
            Found {Object.keys(groupedData).length} groups. Please select a different group column.
          </Typography>
        </Alert>
      )}

      {testType === 'kruskal-wallis' && Object.keys(groupedData).length < 3 && selectedColumn && groupColumn && (
        <Alert severity="warning">
          <Typography variant="body2">
            Kruskal-Wallis test requires at least <strong>3 groups</strong>.
            Found {Object.keys(groupedData).length} groups. Please select a different group column or use Mann-Whitney for 2 groups.
          </Typography>
        </Alert>
      )}

      {testType === 'wilcoxon' && selectedColumn && selectedColumn2 && !pairedData && (
        <Alert severity="warning">
          <Typography variant="body2">
            Not enough valid paired observations found. Please ensure both columns contain numeric values.
          </Typography>
        </Alert>
      )}

      {testType === 'friedman' && selectedColumns.length < 3 && (
        <Alert severity="warning">
          <Typography variant="body2">
            Friedman test requires at least <strong>3 conditions</strong>.
            Please select at least 3 measurement columns.
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
              testType={testType || 'nonparametric'}
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
        <DialogActions sx={{ p: 2, bgcolor: (t) => t.palette.mode === 'dark' ? t.palette.grey[800] : t.palette.grey[100] }}>
          <Button onClick={handleCloseVisualEvidence} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NonParametricTests;
