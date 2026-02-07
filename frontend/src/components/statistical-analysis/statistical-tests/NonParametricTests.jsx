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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton
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
import {
  mannWhitneyUTest,
  kruskalWallisTest,
  wilcoxonSignedRankTest,
  friedmanTest,
  calculateDescriptiveStats
} from '../utils/statisticalUtils';
import guardianService from '../../../services/GuardianService';
import GuardianWarning from '../../Guardian/GuardianWarning';
import VisualEvidence from '../../VisualEvidence';
import { CodeExportPanel } from '../../common';
import { DebuggerPanel } from '../../statistical-debugger';

/**
 * Main Non-Parametric Tests Component
 */
const NonParametricTests = ({ data }) => {
  const [testType, setTestType] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedColumn2, setSelectedColumn2] = useState(''); // For Wilcoxon paired test
  const [selectedColumns, setSelectedColumns] = useState([]); // For Friedman test (multiple columns)
  const [groupColumn, setGroupColumn] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [useBackend, setUseBackend] = useState(false);
  const [backendResult, setBackendResult] = useState(null);
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
    console.log('Guardian: User chose to proceed despite warnings');
    setIsTestBlocked(false);
  };

  const handleSelectAlternative = (alternativeTest) => {
    console.log('Guardian: User selected alternative test:', alternativeTest);
    // Could auto-switch to the alternative test here
    alert(`Alternative test suggested: ${alternativeTest}\n\nPlease select this test from the Test Type dropdown.`);
  };

  const handleViewEvidence = () => {
    console.log('[NonParametricTests] View evidence requested');
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

    return {
      data: data,
      columns: columnInfo.numeric
    };
  }, [data, columnInfo]);

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
  }, [testType, groupedData, alpha, data]);

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
   * Call backend API for high-precision Kruskal-Wallis test
   */
  const callBackendKruskalWallis = async (groups) => {
    try {
      setIsLoading(true);
      setBackendError(null);

      const response = await fetch('http://127.0.0.1:8000/api/v1/nonparametric/kruskal-wallis/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groups: Object.values(groups),
          group_names: Object.keys(groups)
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
   * Call backend API for high-precision Wilcoxon Signed-Rank test
   */
  const callBackendWilcoxon = async (sample1, sample2) => {
    try {
      setIsLoading(true);
      setBackendError(null);

      const response = await fetch('http://127.0.0.1:8000/api/v1/nonparametric/wilcoxon/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x: sample1,
          y: sample2,
          alternative: 'two-sided',
          zero_method: 'wilcox'
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
   * Call backend API for high-precision Friedman test
   */
  const callBackendFriedman = async (measurements, conditionNames) => {
    try {
      setIsLoading(true);
      setBackendError(null);

      const response = await fetch('http://127.0.0.1:8000/api/v1/nonparametric/friedman/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          measurements: measurements,
          condition_names: conditionNames
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
   * Perform Kruskal-Wallis H test (frontend calculation)
   */
  const kruskalWallisResult = useMemo(() => {
    if (testType !== 'kruskal-wallis' || Object.keys(groupedData).length < 3) return null;
    if (useBackend) return null;

    return kruskalWallisTest(groupedData);
  }, [testType, groupedData, useBackend]);

  /**
   * Perform Wilcoxon Signed-Rank test (frontend calculation)
   */
  const wilcoxonResult = useMemo(() => {
    if (testType !== 'wilcoxon' || !pairedData) return null;
    if (useBackend) return null;

    return wilcoxonSignedRankTest(pairedData.sample1, pairedData.sample2);
  }, [testType, pairedData, useBackend]);

  /**
   * Perform Friedman test (frontend calculation)
   */
  const friedmanResult = useMemo(() => {
    if (testType !== 'friedman' || !friedmanData) return null;
    if (useBackend) return null;

    return friedmanTest(friedmanData.measurements, friedmanData.conditionNames);
  }, [testType, friedmanData, useBackend]);

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
    if (!useBackend) return;

    if (testType === 'mann-whitney' && Object.keys(groupedData).length === 2) {
      const groups = Object.values(groupedData);
      if (groups[0].length >= 1 && groups[1].length >= 1) {
        callBackendMannWhitney(groups[0], groups[1]);
      }
    } else if (testType === 'kruskal-wallis' && Object.keys(groupedData).length >= 3) {
      callBackendKruskalWallis(groupedData);
    } else if (testType === 'wilcoxon' && pairedData) {
      callBackendWilcoxon(pairedData.sample1, pairedData.sample2);
    } else if (testType === 'friedman' && friedmanData) {
      callBackendFriedman(friedmanData.measurements, friedmanData.conditionNames);
    }
  }, [useBackend, testType, groupedData, pairedData, friedmanData]);

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
        <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#e65100', display: 'flex', alignItems: 'center', gap: 1 }}>
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

      {/* Mann-Whitney U Test Results (Backend) */}
      {backendResult && backendResult.test_statistic !== undefined && !isTestBlocked && (
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

          {/* R/Python Code Export */}
          <CodeExportPanel
            testType="mann_whitney_u"
            data={{
              groups: groupedData,
              columnName: selectedColumn,
              groupColumn: groupColumn
            }}
            results={{
              statistic: parseFloat(backendResult.test_statistic),
              pValue: parseFloat(backendResult.exact_p_value || backendResult.p_value),
              effectSize: backendResult.effect_size ? parseFloat(backendResult.effect_size) : null,
              isExact: !!backendResult.exact_p_value,
              significant: parseFloat(backendResult.exact_p_value || backendResult.p_value) < alpha
            }}
            assumptions={guardianReport || {}}
            options={{
              alpha,
              alternative: 'two-sided'
            }}
          />

          {/* Statistical Debugger */}
          <DebuggerPanel
            testType="mann_whitney_u"
            data={{
              groups: groupedData,
              columnName: selectedColumn,
              groupColumn: groupColumn,
              n1: sampleSizeInfo?.n1,
              n2: sampleSizeInfo?.n2
            }}
            results={{
              statistic: parseFloat(backendResult.test_statistic),
              pValue: parseFloat(backendResult.exact_p_value || backendResult.p_value),
              effectSize: backendResult.effect_size ? parseFloat(backendResult.effect_size) : null,
              isExact: !!backendResult.exact_p_value,
              significant: parseFloat(backendResult.exact_p_value || backendResult.p_value) < alpha
            }}
            assumptions={guardianReport || {}}
            options={{
              alpha,
              alternative: 'two-sided'
            }}
          />
        </>
      )}

      {/* Mann-Whitney U Test Results (Frontend) */}
      {mannWhitneyResult && !isTestBlocked && (
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

          {/* R/Python Code Export */}
          <CodeExportPanel
            testType="mann_whitney_u"
            data={{
              groups: groupedData,
              columnName: selectedColumn,
              groupColumn: groupColumn
            }}
            results={{
              statistic: mannWhitneyResult.statistic,
              pValue: mannWhitneyResult.pValue,
              significant: mannWhitneyResult.significant
            }}
            assumptions={guardianReport || {}}
            options={{
              alpha,
              alternative: 'two-sided'
            }}
          />

          {/* Statistical Debugger */}
          <DebuggerPanel
            testType="mann_whitney_u"
            data={{
              groups: groupedData,
              columnName: selectedColumn,
              groupColumn: groupColumn,
              n1: sampleSizeInfo?.n1,
              n2: sampleSizeInfo?.n2
            }}
            results={{
              statistic: mannWhitneyResult.statistic,
              pValue: mannWhitneyResult.pValue,
              significant: mannWhitneyResult.significant
            }}
            assumptions={guardianReport || {}}
            options={{
              alpha,
              alternative: 'two-sided'
            }}
          />
        </>
      )}

      {/* Kruskal-Wallis H Test Results (Frontend) */}
      {kruskalWallisResult && !isTestBlocked && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3, border: '2px solid #9c27b0' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0' }}>
              Kruskal-Wallis H Test Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: All groups have the same distribution (non-parametric ANOVA alternative)
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
                    <TableCell>H Statistic (Chi-Square)</TableCell>
                    <TableCell align="right">{kruskalWallisResult.statistic.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Degrees of Freedom</TableCell>
                    <TableCell align="right">{kruskalWallisResult.df}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{kruskalWallisResult.pValue.toFixed(6)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Effect Size (η²)</TableCell>
                    <TableCell align="right">{kruskalWallisResult.etaSquared.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {kruskalWallisResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Group Rank Sums */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Group Rank Sums:</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(kruskalWallisResult.groupRankSums).map(([group, sum]) => (
                  <Chip
                    key={group}
                    label={`${group}: R = ${sum.toFixed(1)} (n = ${kruskalWallisResult.groupSizes[group]})`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            <Alert severity={kruskalWallisResult.significant ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {kruskalWallisResult.significant
                  ? `At least one group differs significantly from the others (H = ${kruskalWallisResult.statistic.toFixed(4)}, p = ${kruskalWallisResult.pValue.toFixed(6)} < ${alpha}). Consider post-hoc pairwise comparisons (e.g., Dunn's test).`
                  : `All groups appear to have similar distributions (H = ${kruskalWallisResult.statistic.toFixed(4)}, p = ${kruskalWallisResult.pValue.toFixed(6)} >= ${alpha}).`}
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
                  <Bar dataKey="median" fill="#9c27b0" name="Median" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {/* Wilcoxon Signed-Rank Test Results (Frontend) */}
      {wilcoxonResult && !isTestBlocked && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3, border: '2px solid #ff9800' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#ff9800' }}>
              Wilcoxon Signed-Rank Test Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: The median difference between paired observations is zero (non-parametric paired t-test alternative)
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
                    <TableCell>W Statistic (smaller of W+ and W-)</TableCell>
                    <TableCell align="right">{wilcoxonResult.statistic.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>W+ (positive rank sum)</TableCell>
                    <TableCell align="right">{wilcoxonResult.wPlus.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>W- (negative rank sum)</TableCell>
                    <TableCell align="right">{wilcoxonResult.wMinus.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Z-score</TableCell>
                    <TableCell align="right">{wilcoxonResult.zScore.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{wilcoxonResult.pValue.toFixed(6)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Effect Size (r)</TableCell>
                    <TableCell align="right">{wilcoxonResult.effectSize.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pairs (total / non-zero)</TableCell>
                    <TableCell align="right">{wilcoxonResult.nPairs} / {wilcoxonResult.nNonZero}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {wilcoxonResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity={wilcoxonResult.significant ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {wilcoxonResult.significant
                  ? `There is a significant difference between the paired measurements (W = ${wilcoxonResult.statistic.toFixed(4)}, p = ${wilcoxonResult.pValue.toFixed(6)} < ${alpha}). Effect size r = ${wilcoxonResult.effectSize.toFixed(3)}.`
                  : `There is no significant difference between the paired measurements (W = ${wilcoxonResult.statistic.toFixed(4)}, p = ${wilcoxonResult.pValue.toFixed(6)} >= ${alpha}).`}
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
                <BarChart data={[
                  { name: selectedColumn, median: calculateDescriptiveStats(pairedData.sample1).median },
                  { name: selectedColumn2, median: calculateDescriptiveStats(pairedData.sample2).median }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Median', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="median" fill="#ff9800" name="Median" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {/* Friedman Test Results (Frontend) */}
      {friedmanResult && !isTestBlocked && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3, border: '2px solid #2196f3' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2196f3' }}>
              Friedman Test Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: All conditions have the same distribution (non-parametric repeated measures ANOVA alternative)
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
                    <TableCell>Chi-Square Statistic</TableCell>
                    <TableCell align="right">{friedmanResult.statistic.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Degrees of Freedom</TableCell>
                    <TableCell align="right">{friedmanResult.df}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{friedmanResult.pValue.toFixed(6)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Kendall's W (Effect Size)</TableCell>
                    <TableCell align="right">{friedmanResult.kendallW.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Subjects × Conditions</TableCell>
                    <TableCell align="right">{friedmanResult.nSubjects} × {friedmanResult.nConditions}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {friedmanResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Condition Mean Ranks */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Condition Mean Ranks:</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(friedmanResult.conditionMeanRanks).map(([condition, meanRank]) => (
                  <Chip
                    key={condition}
                    label={`${condition}: R̄ = ${meanRank.toFixed(2)}`}
                    size="small"
                    variant="outlined"
                    color={meanRank === Math.min(...Object.values(friedmanResult.conditionMeanRanks)) ? 'success' :
                           meanRank === Math.max(...Object.values(friedmanResult.conditionMeanRanks)) ? 'error' : 'default'}
                  />
                ))}
              </Box>
            </Box>

            <Alert severity={friedmanResult.significant ? "warning" : "info"} sx={{ mt: 2 }}>
              <Typography variant="body2">
                {friedmanResult.significant
                  ? `At least one condition differs significantly from the others (χ² = ${friedmanResult.statistic.toFixed(4)}, p = ${friedmanResult.pValue.toFixed(6)} < ${alpha}). Kendall's W = ${friedmanResult.kendallW.toFixed(3)} indicates ${friedmanResult.kendallW < 0.3 ? 'weak' : friedmanResult.kendallW < 0.6 ? 'moderate' : 'strong'} concordance. Consider post-hoc pairwise comparisons (e.g., Nemenyi test).`
                  : `All conditions appear to have similar distributions (χ² = ${friedmanResult.statistic.toFixed(4)}, p = ${friedmanResult.pValue.toFixed(6)} >= ${alpha}).`}
              </Typography>
            </Alert>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Condition Mean Ranks
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={Object.entries(friedmanResult.conditionMeanRanks).map(([name, meanRank]) => ({
                  name,
                  meanRank
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Mean Rank', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="meanRank" fill="#2196f3" name="Mean Rank" />
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
        <DialogActions sx={{ p: 2, bgcolor: 'grey.100' }}>
          <Button onClick={handleCloseVisualEvidence} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NonParametricTests;
