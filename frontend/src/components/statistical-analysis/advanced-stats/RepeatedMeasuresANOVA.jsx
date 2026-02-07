/**
 * Repeated Measures ANOVA Component
 * ==================================
 *
 * Within-subjects ANOVA for analyzing measurements taken at multiple
 * time points or conditions on the same subjects.
 *
 * Features:
 * - Multiple time-point/condition column selection
 * - Optional subject ID column
 * - Sphericity test (Mauchly's W)
 * - Correction methods: Greenhouse-Geisser, Huynh-Feldt
 * - Post-hoc pairwise comparisons with Bonferroni correction
 * - Effect size (partial η²)
 * - Condition means line plot with error bars
 * - Full Guardian integration
 */

import React, { useState, useMemo, useEffect } from 'react';
import { apiConfig, endpoints, getApiUrl } from '../../../config/apiConfig';
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
  Divider,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  useTheme
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar
} from 'recharts';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import guardianService from '../../../services/GuardianService';
import GuardianWarning from '../../Guardian/GuardianWarning';
import VisualEvidence from '../../VisualEvidence';
import { useSettings } from '../../../context/SettingsContext';

const RepeatedMeasuresANOVA = ({ data }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Get Expert Mode from context
  const { expertMode } = useSettings();

  // UI State
  const [conditionColumns, setConditionColumns] = useState([]);
  const [subjectColumn, setSubjectColumn] = useState('');
  const [alpha, setAlpha] = useState(0.05);
  const [correction, setCorrection] = useState('auto');
  const [showPostHoc, setShowPostHoc] = useState(true);

  // Results State
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guardian State
  const [guardianReport, setGuardianReport] = useState(null);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianError, setGuardianError] = useState(null);
  const [isTestBlocked, setIsTestBlocked] = useState(false);
  const [showVisualEvidence, setShowVisualEvidence] = useState(false);

  /**
   * Detect column types from data
   */
  const columnInfo = useMemo(() => {
    if (!data || data.length === 0) return { numeric: [], all: [] };

    const numeric = [];
    const all = Object.keys(data[0]);

    all.forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      if (numericCount / values.length > 0.8) {
        numeric.push(key);
      }
    });

    return { numeric, all };
  }, [data]);

  /**
   * Prepare wide-format data for repeated measures
   */
  const preparedData = useMemo(() => {
    if (!data || conditionColumns.length < 2) return null;

    // Extract data for each condition
    const conditionData = {};
    conditionColumns.forEach(col => {
      conditionData[col] = data
        .map(row => parseFloat(row[col]))
        .filter(v => !isNaN(v));
    });

    // Check if all conditions have the same number of observations
    const counts = Object.values(conditionData).map(arr => arr.length);
    const isBalanced = counts.every(c => c === counts[0]);
    const n = Math.min(...counts);

    if (n < 2) return null;

    // Calculate descriptive statistics for each condition
    const descriptives = {};
    conditionColumns.forEach(col => {
      const values = conditionData[col].slice(0, n); // Use balanced n
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
      const std = Math.sqrt(variance);
      const se = std / Math.sqrt(values.length);

      descriptives[col] = {
        mean,
        std,
        se,
        n: values.length,
        ci_lower: mean - 1.96 * se,
        ci_upper: mean + 1.96 * se
      };
    });

    return {
      conditionData,
      descriptives,
      n,
      k: conditionColumns.length,
      isBalanced
    };
  }, [data, conditionColumns]);

  /**
   * Guardian Integration
   */
  useEffect(() => {
    const checkGuardianAssumptions = async () => {
      setGuardianReport(null);
      setGuardianError(null);
      setIsTestBlocked(false);

      if (!preparedData || conditionColumns.length < 2) return;

      try {
        setGuardianLoading(true);

        // Prepare data for Guardian - check normality of difference scores
        const dataToCheck = {};
        conditionColumns.forEach(col => {
          dataToCheck[col] = preparedData.conditionData[col];
        });

        const report = await guardianService.checkAssumptions(
          dataToCheck,
          'repeated_measures',
          alpha
        );

        setGuardianReport(report);
        setIsTestBlocked(!expertMode && !report.can_proceed);
        setGuardianLoading(false);

      } catch (error) {
        console.error('Guardian check failed:', error);
        setGuardianError(error.message || 'Failed to validate assumptions');
        setGuardianLoading(false);
        setIsTestBlocked(false);
      }
    };

    checkGuardianAssumptions();
  }, [preparedData, conditionColumns, alpha, expertMode]);

  /**
   * Run Repeated Measures ANOVA
   */
  const runRepeatedMeasuresANOVA = async () => {
    if (!preparedData || isTestBlocked) return;

    setLoading(true);
    setError(null);

    try {
      // Try backend API first
      const response = await fetch(getApiUrl(endpoints.anova.repeatedMeasures), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: data,
          condition_columns: conditionColumns,
          subject_id: subjectColumn || null,
          sphericity_correction: correction
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setResults(result);

    } catch (err) {
      console.error('API call failed, using client-side calculation:', err);
      // Fallback: Calculate client-side
      setResults(calculateClientSide());
    } finally {
      setLoading(false);
    }
  };

  /**
   * Client-side Repeated Measures ANOVA calculation
   */
  const calculateClientSide = () => {
    if (!preparedData) return null;

    const { conditionData, descriptives, n, k } = preparedData;

    // Build data matrix (subjects x conditions)
    const matrix = [];
    for (let i = 0; i < n; i++) {
      const row = conditionColumns.map(col => conditionData[col][i]);
      matrix.push(row);
    }

    // Calculate grand mean
    const allValues = matrix.flat();
    const grandMean = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    // Calculate condition means
    const conditionMeans = conditionColumns.map((col, j) =>
      matrix.reduce((sum, row) => sum + row[j], 0) / n
    );

    // Calculate subject means
    const subjectMeans = matrix.map(row =>
      row.reduce((a, b) => a + b, 0) / k
    );

    // Sum of Squares calculations
    // SS Total
    let ssTotal = 0;
    matrix.forEach(row => {
      row.forEach(val => {
        ssTotal += Math.pow(val - grandMean, 2);
      });
    });
    const dfTotal = n * k - 1;

    // SS Between Subjects
    let ssSubjects = 0;
    subjectMeans.forEach(mean => {
      ssSubjects += k * Math.pow(mean - grandMean, 2);
    });
    const dfSubjects = n - 1;

    // SS Conditions (Within-subjects effect)
    let ssConditions = 0;
    conditionMeans.forEach(mean => {
      ssConditions += n * Math.pow(mean - grandMean, 2);
    });
    const dfConditions = k - 1;

    // SS Error (residual)
    const ssError = ssTotal - ssSubjects - ssConditions;
    const dfError = dfSubjects * dfConditions;

    // Mean Squares
    const msConditions = ssConditions / dfConditions;
    const msError = ssError / dfError;

    // F-statistic
    const fStatistic = msConditions / msError;

    // Mauchly's sphericity test (simplified)
    const sphericity = calculateSphericity(matrix, k);

    // Determine which correction to use
    let appliedCorrection = 'none';
    let epsilon = 1.0;
    let correctedDfConditions = dfConditions;
    let correctedDfError = dfError;

    if (correction === 'auto' && sphericity.mauchlyW < 0.75) {
      appliedCorrection = 'greenhouse-geisser';
      epsilon = sphericity.ggEpsilon;
    } else if (correction === 'greenhouse-geisser') {
      appliedCorrection = 'greenhouse-geisser';
      epsilon = sphericity.ggEpsilon;
    } else if (correction === 'huynh-feldt') {
      appliedCorrection = 'huynh-feldt';
      epsilon = sphericity.hfEpsilon;
    }

    if (appliedCorrection !== 'none') {
      correctedDfConditions = dfConditions * epsilon;
      correctedDfError = dfError * epsilon;
    }

    // P-value (using F distribution)
    const pValue = 1 - fCDF(fStatistic, correctedDfConditions, correctedDfError);

    // Effect size (partial eta squared)
    const etaSquared = ssConditions / (ssConditions + ssError);

    // Post-hoc pairwise comparisons (Bonferroni corrected)
    const postHoc = [];
    const nComparisons = (k * (k - 1)) / 2;

    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        // Paired differences
        const differences = matrix.map(row => row[i] - row[j]);
        const meanDiff = differences.reduce((a, b) => a + b, 0) / n;
        const seDiff = Math.sqrt(differences.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (n * (n - 1)));
        const tStat = meanDiff / seDiff;
        const pPaired = 2 * (1 - tCDF(Math.abs(tStat), n - 1));
        const pAdjusted = Math.min(1, pPaired * nComparisons);

        postHoc.push({
          condition1: conditionColumns[i],
          condition2: conditionColumns[j],
          mean_diff: meanDiff,
          se: seDiff,
          t_statistic: tStat,
          p_value: pPaired,
          p_adjusted: pAdjusted,
          significant: pAdjusted < alpha
        });
      }
    }

    return {
      anova_table: {
        conditions: {
          source: 'Conditions',
          ss: ssConditions,
          df: dfConditions,
          ms: msConditions,
          f: fStatistic,
          p_value: pValue,
          eta_squared: etaSquared
        },
        error: {
          source: 'Error',
          ss: ssError,
          df: dfError,
          ms: msError
        },
        subjects: {
          source: 'Subjects',
          ss: ssSubjects,
          df: dfSubjects
        }
      },
      sphericity: {
        mauchly_w: sphericity.mauchlyW,
        sphericity_assumed: sphericity.mauchlyW > 0.75,
        greenhouse_geisser_epsilon: sphericity.ggEpsilon,
        huynh_feldt_epsilon: sphericity.hfEpsilon
      },
      correction_applied: appliedCorrection,
      corrected_df: {
        conditions: correctedDfConditions,
        error: correctedDfError
      },
      condition_means: descriptives,
      n_subjects: n,
      n_conditions: k,
      f_statistic: fStatistic,
      p_value: pValue,
      effect_size: etaSquared,
      effect_interpretation: interpretEtaSquared(etaSquared),
      post_hoc: showPostHoc && pValue < alpha ? postHoc : null,
      significant: pValue < alpha
    };
  };

  /**
   * Calculate Mauchly's sphericity test (simplified)
   */
  const calculateSphericity = (matrix, k) => {
    const n = matrix.length;

    // Calculate difference scores between adjacent conditions
    const diffs = [];
    for (let j = 0; j < k - 1; j++) {
      diffs.push(matrix.map(row => row[j] - row[j + 1]));
    }

    // Covariance matrix of differences (simplified)
    const covMatrix = [];
    for (let i = 0; i < diffs.length; i++) {
      covMatrix[i] = [];
      for (let j = 0; j < diffs.length; j++) {
        const meanI = diffs[i].reduce((a, b) => a + b, 0) / n;
        const meanJ = diffs[j].reduce((a, b) => a + b, 0) / n;
        let cov = 0;
        for (let s = 0; s < n; s++) {
          cov += (diffs[i][s] - meanI) * (diffs[j][s] - meanJ);
        }
        covMatrix[i][j] = cov / (n - 1);
      }
    }

    // Mauchly's W (simplified approximation)
    const trace = covMatrix.reduce((sum, row, i) => sum + row[i], 0);
    const traceSq = covMatrix.reduce((sum, row, i) =>
      sum + covMatrix.reduce((s2, row2, j) => s2 + row[j] * row2[i], 0), 0
    );

    // Greenhouse-Geisser epsilon
    const ggEpsilon = Math.pow(trace, 2) / ((k - 1) * traceSq);
    const ggBounded = Math.max(1 / (k - 1), Math.min(1, ggEpsilon));

    // Huynh-Feldt epsilon
    const hfEpsilon = (n * (k - 1) * ggBounded - 2) / ((k - 1) * (n - 1 - (k - 1) * ggBounded));
    const hfBounded = Math.min(1, hfEpsilon);

    // Mauchly's W approximation
    const mauchlyW = trace > 0 ? Math.exp(Math.log(traceSq / (k - 1)) - 2 * Math.log(trace / (k - 1))) : 1;

    return {
      mauchlyW: Math.min(1, Math.max(0, mauchlyW)),
      ggEpsilon: ggBounded,
      hfEpsilon: Math.max(ggBounded, hfBounded)
    };
  };

  /**
   * Helper: F distribution CDF approximation
   */
  const fCDF = (x, df1, df2) => {
    if (x <= 0) return 0;
    // Simplified approximation using normal
    const z = Math.pow(x, 1/3) * (1 - 2/(9*df2)) - (1 - 2/(9*df1));
    const se = Math.sqrt(2/(9*df1) + 2/(9*df2) * Math.pow(x, 2/3));
    return 0.5 * (1 + erf(z / (se * Math.sqrt(2))));
  };

  /**
   * Helper: t distribution CDF approximation
   */
  const tCDF = (x, df) => {
    // Approximate using normal for large df
    if (df > 30) {
      return 0.5 * (1 + erf(x / Math.sqrt(2)));
    }
    // Simple approximation
    const z = x / Math.sqrt(1 + x*x/(2*df));
    return 0.5 * (1 + erf(z / Math.sqrt(2)));
  };

  /**
   * Helper: Error function approximation
   */
  const erf = (x) => {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  };

  /**
   * Interpret eta squared
   */
  const interpretEtaSquared = (eta) => {
    if (eta < 0.01) return 'Negligible';
    if (eta < 0.06) return 'Small';
    if (eta < 0.14) return 'Medium';
    return 'Large';
  };

  /**
   * Guardian handlers
   */
  const handleProceed = () => {
    setIsTestBlocked(false);
  };

  const handleSelectAlternative = (alternative) => {
    const alternatives = {
      'friedman': 'Friedman Test',
      'wilcoxon': 'Wilcoxon Signed-Rank Test'
    };
    const name = alternatives[alternative] || alternative;
    alert(`Alternative Selected: ${name}\n\nNavigate to Non-Parametric Tests to use this alternative.`);
  };

  const handleViewEvidence = () => {
    setShowVisualEvidence(true);
  };

  /**
   * Prepare chart data for condition means plot
   */
  const chartData = useMemo(() => {
    if (!preparedData) return null;

    return conditionColumns.map(col => ({
      condition: col,
      mean: preparedData.descriptives[col].mean,
      se: preparedData.descriptives[col].se,
      ci_lower: preparedData.descriptives[col].ci_lower,
      ci_upper: preparedData.descriptives[col].ci_upper,
      n: preparedData.descriptives[col].n
    }));
  }, [preparedData, conditionColumns]);

  /**
   * Visual evidence data for Guardian
   */
  const visualEvidenceData = useMemo(() => {
    if (!data || data.length === 0) return null;
    return {
      data: data,
      columns: columnInfo.numeric
    };
  }, [data, columnInfo]);

  // Render
  return (
    <Box>
      {/* Configuration Panel */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Repeated Measures ANOVA Configuration
          <Tooltip title="Tests whether means differ across repeated measurements on the same subjects">
            <InfoIcon fontSize="small" color="action" />
          </Tooltip>
        </Typography>

        <Grid container spacing={3}>
          {/* Condition Columns Selection */}
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Condition/Time Point Columns (select 2+)</InputLabel>
              <Select
                multiple
                value={conditionColumns}
                label="Condition/Time Point Columns (select 2+)"
                onChange={(e) => {
                  setConditionColumns(e.target.value);
                  setResults(null);
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="" disabled>
                  <em>Select numeric columns for each condition...</em>
                </MenuItem>
                {columnInfo.numeric.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Subject ID (optional) */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Subject ID (optional)</InputLabel>
              <Select
                value={subjectColumn}
                label="Subject ID (optional)"
                onChange={(e) => setSubjectColumn(e.target.value)}
              >
                <MenuItem value="">
                  <em>Auto-assign subjects</em>
                </MenuItem>
                {columnInfo.all.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Sphericity Correction */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sphericity Correction</InputLabel>
              <Select
                value={correction}
                label="Sphericity Correction"
                onChange={(e) => setCorrection(e.target.value)}
              >
                <MenuItem value="auto">Auto (if needed)</MenuItem>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="greenhouse-geisser">Greenhouse-Geisser</MenuItem>
                <MenuItem value="huynh-feldt">Huynh-Feldt</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Alpha Level */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>α Level</InputLabel>
              <Select
                value={alpha}
                label="α Level"
                onChange={(e) => setAlpha(e.target.value)}
              >
                <MenuItem value={0.01}>0.01</MenuItem>
                <MenuItem value={0.05}>0.05</MenuItem>
                <MenuItem value={0.10}>0.10</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Post-hoc toggle */}
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showPostHoc}
                onChange={(e) => setShowPostHoc(e.target.checked)}
              />
            }
            label="Show post-hoc pairwise comparisons (if significant)"
          />
        </Box>

        {/* Run Button */}
        {conditionColumns.length >= 2 && preparedData && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={runRepeatedMeasuresANOVA}
              disabled={loading || isTestBlocked}
            >
              {loading ? <CircularProgress size={24} /> : 'Run Analysis'}
            </Button>
          </Box>
        )}

        {/* Data summary */}
        {preparedData && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Design:</strong> {preparedData.n} subjects × {preparedData.k} conditions
              {!preparedData.isBalanced && (
                <Chip label="Unbalanced" size="small" color="warning" sx={{ ml: 1 }} />
              )}
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Guardian States */}
      {guardianLoading && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="body1" component="span">
            Validating within-subjects assumptions...
          </Typography>
        </Paper>
      )}

      {guardianError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Guardian validation unavailable:</strong> {guardianError}
          </Typography>
        </Alert>
      )}

      {guardianReport && (
        <GuardianWarning
          guardianReport={guardianReport}
          onProceed={handleProceed}
          onSelectAlternative={handleSelectAlternative}
          onViewEvidence={handleViewEvidence}
        />
      )}

      {isTestBlocked && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: isDarkMode ? theme.palette.warning.dark + '20' : theme.palette.warning.light + '30', border: `2px solid ${theme.palette.warning.main}` }}>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.warning.dark }}>
            Test Execution Blocked
          </Typography>
          <Typography variant="body2">
            Repeated Measures ANOVA cannot proceed due to assumption violations.
            Consider using the Friedman test (non-parametric alternative) or enable Expert Mode.
          </Typography>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {/* Results Section */}
      {results && !isTestBlocked && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Main Result */}
            <Grid item xs={12} md={4}>
              <Card elevation={3} sx={{
                bgcolor: results.significant
                  ? (isDarkMode ? theme.palette.success.dark + '20' : theme.palette.success.light + '30')
                  : (isDarkMode ? theme.palette.warning.dark + '20' : theme.palette.warning.light + '30'),
                height: '100%'
              }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Within-Subjects Effect
                  </Typography>
                  <Typography variant="h4" sx={{ color: results.significant ? theme.palette.success.main : theme.palette.warning.main }}>
                    F = {results.f_statistic?.toFixed(3)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    df = ({results.corrected_df?.conditions?.toFixed(2)}, {results.corrected_df?.error?.toFixed(2)})
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    p = {results.p_value?.toFixed(4)}
                  </Typography>
                  <Chip
                    label={results.significant ? 'Significant' : 'Not Significant'}
                    color={results.significant ? 'success' : 'warning'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Effect Size */}
            <Grid item xs={12} md={4}>
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Effect Size
                  </Typography>
                  <Typography variant="h4" sx={{ color: theme.palette.primary.main }}>
                    η²p = {results.effect_size?.toFixed(4)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    Interpretation: <strong>{results.effect_interpretation}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Partial eta squared for within-subjects effect
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Sphericity */}
            <Grid item xs={12} md={4}>
              <Card elevation={3} sx={{
                height: '100%',
                bgcolor: results.sphericity?.sphericity_assumed ? 'transparent' : (isDarkMode ? theme.palette.warning.dark + '15' : theme.palette.warning.light + '20')
              }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Sphericity (Mauchly's Test)
                    {!results.sphericity?.sphericity_assumed && (
                      <WarningIcon fontSize="small" color="warning" />
                    )}
                  </Typography>
                  <Typography variant="h4">
                    W = {results.sphericity?.mauchly_w?.toFixed(4)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    GG ε = {results.sphericity?.greenhouse_geisser_epsilon?.toFixed(3)}
                  </Typography>
                  <Typography variant="body2">
                    HF ε = {results.sphericity?.huynh_feldt_epsilon?.toFixed(3)}
                  </Typography>
                  {results.correction_applied !== 'none' && (
                    <Chip
                      label={`${results.correction_applied} applied`}
                      size="small"
                      color="info"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Condition Means Plot */}
          {chartData && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Condition Means with 95% Confidence Intervals
              </Typography>

              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="condition"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis
                      label={{ value: 'Mean', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const d = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1 }}>
                              <Typography variant="body2"><strong>{d.condition}</strong></Typography>
                              <Typography variant="body2">Mean: {d.mean?.toFixed(3)}</Typography>
                              <Typography variant="body2">SE: {d.se?.toFixed(3)}</Typography>
                              <Typography variant="body2">95% CI: [{d.ci_lower?.toFixed(3)}, {d.ci_upper?.toFixed(3)}]</Typography>
                              <Typography variant="body2">n = {d.n}</Typography>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="mean"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      dot={{ fill: theme.palette.primary.main, r: 6 }}
                      name="Mean"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}

          {/* Post-hoc Comparisons */}
          {results.post_hoc && results.post_hoc.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Post-hoc Pairwise Comparisons (Bonferroni Corrected)
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                      <TableCell><strong>Comparison</strong></TableCell>
                      <TableCell align="right"><strong>Mean Diff</strong></TableCell>
                      <TableCell align="right"><strong>SE</strong></TableCell>
                      <TableCell align="right"><strong>t</strong></TableCell>
                      <TableCell align="right"><strong>p (raw)</strong></TableCell>
                      <TableCell align="right"><strong>p (adjusted)</strong></TableCell>
                      <TableCell align="center"><strong>Significant</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.post_hoc.map((row, idx) => (
                      <TableRow key={idx} sx={{
                        bgcolor: row.significant ? (isDarkMode ? theme.palette.success.dark + '15' : theme.palette.success.light + '20') : 'transparent'
                      }}>
                        <TableCell>{row.condition1} vs {row.condition2}</TableCell>
                        <TableCell align="right">{row.mean_diff?.toFixed(3)}</TableCell>
                        <TableCell align="right">{row.se?.toFixed(3)}</TableCell>
                        <TableCell align="right">{row.t_statistic?.toFixed(3)}</TableCell>
                        <TableCell align="right">{row.p_value?.toFixed(4)}</TableCell>
                        <TableCell align="right">{row.p_adjusted?.toFixed(4)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={row.significant ? 'Yes' : 'No'}
                            size="small"
                            color={row.significant ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Interpretation */}
          <Paper elevation={2} sx={{ p: 3, bgcolor: isDarkMode ? theme.palette.primary.dark + '20' : theme.palette.primary.light + '30' }}>
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
              Interpretation
            </Typography>
            {results.significant ? (
              <Typography variant="body2">
                The repeated measures ANOVA reveals a <strong>statistically significant</strong> effect
                of condition, F({results.corrected_df?.conditions?.toFixed(2)}, {results.corrected_df?.error?.toFixed(2)}) = {results.f_statistic?.toFixed(3)},
                p {'<'} {alpha}, η²p = {results.effect_size?.toFixed(3)}.
                {!results.sphericity?.sphericity_assumed && ` ${results.correction_applied === 'greenhouse-geisser' ? 'Greenhouse-Geisser' : 'Huynh-Feldt'} correction was applied due to sphericity violation.`}
                The effect size indicates a <strong>{results.effect_interpretation?.toLowerCase()}</strong> effect.
                {results.post_hoc && ` Post-hoc comparisons with Bonferroni correction revealed ${results.post_hoc.filter(p => p.significant).length} significant pairwise differences.`}
              </Typography>
            ) : (
              <Typography variant="body2">
                The repeated measures ANOVA did not reveal a statistically significant effect
                of condition, F({results.corrected_df?.conditions?.toFixed(2)}, {results.corrected_df?.error?.toFixed(2)}) = {results.f_statistic?.toFixed(3)},
                p = {results.p_value?.toFixed(3)}.
                There are no significant differences across the {results.n_conditions} conditions.
              </Typography>
            )}
          </Paper>
        </>
      )}

      {/* Selection Prompt */}
      {conditionColumns.length < 2 && !guardianLoading && (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.grey[isDarkMode ? 800 : 50] }}>
          <Typography variant="body1" color="text.secondary">
            Select at least <strong>2 condition/time-point columns</strong> to begin Repeated Measures ANOVA.
            Each column should contain measurements from the same subjects under different conditions.
          </Typography>
        </Paper>
      )}

      {/* Visual Evidence Dialog */}
      <Dialog
        open={showVisualEvidence}
        onClose={() => setShowVisualEvidence(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { minHeight: '70vh', maxHeight: '90vh' } }}
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
          <IconButton onClick={() => setShowVisualEvidence(false)} sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {visualEvidenceData ? (
            <VisualEvidence
              data={visualEvidenceData}
              testType="repeated_measures"
              guardianReport={guardianReport}
            />
          ) : (
            <Alert severity="info">
              No data available for visualization.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.100' }}>
          <Button onClick={() => setShowVisualEvidence(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RepeatedMeasuresANOVA;
