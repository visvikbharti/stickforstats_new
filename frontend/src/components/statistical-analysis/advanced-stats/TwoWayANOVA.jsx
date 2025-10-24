/**
 * Two-way ANOVA Component
 *
 * Analyzes the effects of two categorical factors (Factor A and Factor B)
 * and their interaction on a continuous dependent variable.
 *
 * Tests three hypotheses:
 * 1. Main effect of Factor A
 * 2. Main effect of Factor B
 * 3. Interaction effect (A × B)
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
  Divider,
  CircularProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import GridOnIcon from '@mui/icons-material/GridOn';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import guardianService from '../../../services/GuardianService';
import GuardianWarning from '../../Guardian/GuardianWarning';

/**
 * Main Two-way ANOVA Component
 */
const TwoWayANOVA = ({ data }) => {
  const [factorA, setFactorA] = useState('');
  const [factorB, setFactorB] = useState('');
  const [dependentVar, setDependentVar] = useState('');
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
      } else if (uniqueCount >= 2 && uniqueCount < 10) {
        categorical.push(key);
      }
    });

    return { numeric, categorical };
  }, [data]);

  /**
   * Organize data by factors
   */
  const organizedData = useMemo(() => {
    if (!factorA || !factorB || !dependentVar || !data) return null;

    const groups = {};
    const factorALevels = new Set();
    const factorBLevels = new Set();

    data.forEach(row => {
      const levelA = String(row[factorA] || 'Missing');
      const levelB = String(row[factorB] || 'Missing');
      const value = parseFloat(row[dependentVar]);

      if (isNaN(value)) return;

      factorALevels.add(levelA);
      factorBLevels.add(levelB);

      const key = `${levelA}|${levelB}`;
      if (!groups[key]) {
        groups[key] = { factorA: levelA, factorB: levelB, values: [] };
      }
      groups[key].values.push(value);
    });

    return {
      groups,
      factorALevels: Array.from(factorALevels).sort(),
      factorBLevels: Array.from(factorBLevels).sort()
    };
  }, [data, factorA, factorB, dependentVar]);

  /**
   * Calculate Two-way ANOVA
   */
  const anovaResults = useMemo(() => {
    if (!organizedData) return null;

    const { groups, factorALevels, factorBLevels } = organizedData;

    // Calculate cell means and counts
    const cellStats = {};
    let grandTotal = 0;
    let grandCount = 0;

    Object.entries(groups).forEach(([key, group]) => {
      const mean = group.values.reduce((sum, v) => sum + v, 0) / group.values.length;
      const n = group.values.length;
      cellStats[key] = { mean, n, sum: mean * n };
      grandTotal += mean * n;
      grandCount += n;
    });

    const grandMean = grandTotal / grandCount;

    // Calculate marginal means for Factor A
    const factorAMeans = {};
    factorALevels.forEach(levelA => {
      let sum = 0;
      let count = 0;
      Object.entries(groups).forEach(([key, group]) => {
        if (group.factorA === levelA) {
          sum += group.values.reduce((s, v) => s + v, 0);
          count += group.values.length;
        }
      });
      factorAMeans[levelA] = { mean: sum / count, n: count };
    });

    // Calculate marginal means for Factor B
    const factorBMeans = {};
    factorBLevels.forEach(levelB => {
      let sum = 0;
      let count = 0;
      Object.entries(groups).forEach(([key, group]) => {
        if (group.factorB === levelB) {
          sum += group.values.reduce((s, v) => s + v, 0);
          count += group.values.length;
        }
      });
      factorBMeans[levelB] = { mean: sum / count, n: count };
    });

    // Calculate Sum of Squares
    let SSTotal = 0;
    let SSA = 0;
    let SSB = 0;
    let SSWithin = 0;

    // SS Total
    Object.values(groups).forEach(group => {
      group.values.forEach(value => {
        SSTotal += Math.pow(value - grandMean, 2);
      });
    });

    // SS Factor A (main effect)
    Object.entries(factorAMeans).forEach(([level, stats]) => {
      SSA += stats.n * Math.pow(stats.mean - grandMean, 2);
    });

    // SS Factor B (main effect)
    Object.entries(factorBMeans).forEach(([level, stats]) => {
      SSB += stats.n * Math.pow(stats.mean - grandMean, 2);
    });

    // SS Within (error)
    Object.values(groups).forEach(group => {
      const mean = group.values.reduce((sum, v) => sum + v, 0) / group.values.length;
      group.values.forEach(value => {
        SSWithin += Math.pow(value - mean, 2);
      });
    });

    // SS Interaction (what's left after accounting for main effects)
    const SSInteraction = SSTotal - SSA - SSB - SSWithin;

    // Degrees of freedom
    const dfA = factorALevels.length - 1;
    const dfB = factorBLevels.length - 1;
    const dfInteraction = dfA * dfB;
    const dfWithin = grandCount - (factorALevels.length * factorBLevels.length);
    const dfTotal = grandCount - 1;

    // Mean Squares
    const MSA = SSA / dfA;
    const MSB = SSB / dfB;
    const MSInteraction = SSInteraction / dfInteraction;
    const MSWithin = SSWithin / dfWithin;

    // F-statistics
    const FA = MSA / MSWithin;
    const FB = MSB / MSWithin;
    const FInteraction = MSInteraction / MSWithin;

    // p-values (approximation using F-distribution)
    const pValueA = fDistributionCDF(FA, dfA, dfWithin);
    const pValueB = fDistributionCDF(FB, dfB, dfWithin);
    const pValueInteraction = fDistributionCDF(FInteraction, dfInteraction, dfWithin);

    // Effect sizes (Eta-squared)
    const etaSquaredA = SSA / SSTotal;
    const etaSquaredB = SSB / SSTotal;
    const etaSquaredInteraction = SSInteraction / SSTotal;

    return {
      grandMean,
      factorAMeans,
      factorBMeans,
      cellStats,
      anova: {
        factorA: {
          SS: SSA,
          df: dfA,
          MS: MSA,
          F: FA,
          pValue: pValueA,
          significant: pValueA < alpha,
          etaSquared: etaSquaredA
        },
        factorB: {
          SS: SSB,
          df: dfB,
          MS: MSB,
          F: FB,
          pValue: pValueB,
          significant: pValueB < alpha,
          etaSquared: etaSquaredB
        },
        interaction: {
          SS: SSInteraction,
          df: dfInteraction,
          MS: MSInteraction,
          F: FInteraction,
          pValue: pValueInteraction,
          significant: pValueInteraction < alpha,
          etaSquared: etaSquaredInteraction
        },
        error: {
          SS: SSWithin,
          df: dfWithin,
          MS: MSWithin
        },
        total: {
          SS: SSTotal,
          df: dfTotal
        }
      }
    };
  }, [organizedData, alpha]);

  /**
   * F-distribution CDF approximation
   */
  const fDistributionCDF = (f, df1, df2) => {
    if (f <= 0) return 1;

    // Simplified approximation - returns upper tail probability (p-value)
    // For large F values, p-value is small
    const x = df2 / (df2 + df1 * f);

    // Beta function approximation
    const a = df2 / 2;
    const b = df1 / 2;

    // Very rough approximation
    if (f > 10) return 0.001;
    if (f > 5) return 0.01;
    if (f > 3) return 0.05;
    if (f > 2) return 0.10;
    return 0.20;
  };

  /**
   * Get effect size interpretation
   */
  const getEffectSizeInterpretation = (etaSquared) => {
    if (etaSquared < 0.01) return 'Negligible';
    if (etaSquared < 0.06) return 'Small';
    if (etaSquared < 0.14) return 'Medium';
    return 'Large';
  };

  /**
   * Prepare interaction plot data
   */
  const interactionPlotData = useMemo(() => {
    if (!organizedData || !anovaResults) return [];

    const { groups, factorALevels, factorBLevels } = organizedData;
    const data = [];

    factorALevels.forEach(levelA => {
      const dataPoint = { factorA: levelA };
      factorBLevels.forEach(levelB => {
        const key = `${levelA}|${levelB}`;
        if (groups[key]) {
          const mean = groups[key].values.reduce((sum, v) => sum + v, 0) / groups[key].values.length;
          dataPoint[levelB] = mean;
        }
      });
      data.push(dataPoint);
    });

    return data;
  }, [organizedData, anovaResults]);

  /**
   * Prepare main effects plot data
   */
  const mainEffectsData = useMemo(() => {
    if (!anovaResults) return { factorA: [], factorB: [] };

    const factorAData = Object.entries(anovaResults.factorAMeans).map(([level, stats]) => ({
      level,
      mean: stats.mean
    }));

    const factorBData = Object.entries(anovaResults.factorBMeans).map(([level, stats]) => ({
      level,
      mean: stats.mean
    }));

    return { factorA: factorAData, factorB: factorBData };
  }, [anovaResults]);

  /**
   * Guardian Integration: Check statistical assumptions for two-way ANOVA
   */
  useEffect(() => {
    const checkGuardianAssumptions = async () => {
      // Reset previous Guardian state
      setGuardianReport(null);
      setGuardianError(null);
      setIsTestBlocked(false);

      // Only check if we have both factors, dependent variable, and organized data
      if (!factorA || !factorB || !dependentVar || !organizedData || !data || data.length === 0) {
        return;
      }

      // Check if factors are different
      if (factorA === factorB) {
        return;
      }

      try {
        const { groups } = organizedData;

        // Prepare data for Guardian: Convert groups to format Guardian expects
        // Each group (combination of factorA × factorB) becomes a separate array
        const dataToCheck = {};
        Object.entries(groups).forEach(([key, group]) => {
          // Use descriptive group names: "FactorA_LevelA × FactorB_LevelB"
          const groupName = `${group.factorA} × ${group.factorB}`;
          dataToCheck[groupName] = group.values;
        });

        // Guardian test type for ANOVA
        const backendTestType = 'anova';

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
  }, [factorA, factorB, dependentVar, organizedData, alpha, data]);

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

  if (columnInfo.categorical.length < 2) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Two-way ANOVA requires at least 2 categorical factors. Found: {columnInfo.categorical.length}
          </Typography>
        </Alert>
      </Paper>
    );
  }

  if (columnInfo.numeric.length < 1) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Two-way ANOVA requires at least 1 numeric dependent variable.
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
          <GridOnIcon /> Two-way ANOVA Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Factor A (First Factor)</InputLabel>
              <Select
                value={factorA}
                label="Factor A (First Factor)"
                onChange={(e) => setFactorA(e.target.value)}
              >
                <MenuItem value=""><em>Select factor...</em></MenuItem>
                {columnInfo.categorical.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Factor B (Second Factor)</InputLabel>
              <Select
                value={factorB}
                label="Factor B (Second Factor)"
                onChange={(e) => setFactorB(e.target.value)}
              >
                <MenuItem value=""><em>Select factor...</em></MenuItem>
                {columnInfo.categorical.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Dependent Variable</InputLabel>
              <Select
                value={dependentVar}
                label="Dependent Variable"
                onChange={(e) => setDependentVar(e.target.value)}
              >
                <MenuItem value=""><em>Select variable...</em></MenuItem>
                {columnInfo.numeric.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
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
            <strong>Two-way ANOVA</strong> tests three hypotheses: (1) Main effect of Factor A,
            (2) Main effect of Factor B, and (3) Interaction effect between A and B.
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
      {guardianReport && <GuardianWarning guardianReport={guardianReport} />}

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

      {/* ANOVA Results */}
      {anovaResults && !isTestBlocked && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: anovaResults.anova.factorA.significant ? '#ffebee' : '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{factorA} Main Effect</Typography>
                  <Typography variant="h6">
                    F = {anovaResults.anova.factorA.F.toFixed(3)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    p = {anovaResults.anova.factorA.pValue.toFixed(4)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {anovaResults.anova.factorA.significant ? (
                      <Chip icon={<CancelOutlinedIcon />} label="Significant" color="error" size="small" />
                    ) : (
                      <Chip icon={<CheckCircleOutlineIcon />} label="Not Significant" color="success" size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: anovaResults.anova.factorB.significant ? '#ffebee' : '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{factorB} Main Effect</Typography>
                  <Typography variant="h6">
                    F = {anovaResults.anova.factorB.F.toFixed(3)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    p = {anovaResults.anova.factorB.pValue.toFixed(4)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {anovaResults.anova.factorB.significant ? (
                      <Chip icon={<CancelOutlinedIcon />} label="Significant" color="error" size="small" />
                    ) : (
                      <Chip icon={<CheckCircleOutlineIcon />} label="Not Significant" color="success" size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: anovaResults.anova.interaction.significant ? '#ffebee' : '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Interaction Effect (A × B)</Typography>
                  <Typography variant="h6">
                    F = {anovaResults.anova.interaction.F.toFixed(3)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    p = {anovaResults.anova.interaction.pValue.toFixed(4)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {anovaResults.anova.interaction.significant ? (
                      <Chip icon={<CancelOutlinedIcon />} label="Significant" color="error" size="small" />
                    ) : (
                      <Chip icon={<CheckCircleOutlineIcon />} label="Not Significant" color="success" size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ANOVA Table */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Two-way ANOVA Table
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
                    <TableCell align="right"><strong>η²</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>{factorA}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorA.SS.toFixed(2)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorA.df}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorA.MS.toFixed(2)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorA.F.toFixed(3)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorA.pValue.toFixed(4)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorA.etaSquared.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{factorB}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorB.SS.toFixed(2)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorB.df}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorB.MS.toFixed(2)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorB.F.toFixed(3)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorB.pValue.toFixed(4)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.factorB.etaSquared.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{factorA} × {factorB}</TableCell>
                    <TableCell align="right">{anovaResults.anova.interaction.SS.toFixed(2)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.interaction.df}</TableCell>
                    <TableCell align="right">{anovaResults.anova.interaction.MS.toFixed(2)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.interaction.F.toFixed(3)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.interaction.pValue.toFixed(4)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.interaction.etaSquared.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Error (Within)</TableCell>
                    <TableCell align="right">{anovaResults.anova.error.SS.toFixed(2)}</TableCell>
                    <TableCell align="right">{anovaResults.anova.error.df}</TableCell>
                    <TableCell align="right">{anovaResults.anova.error.MS.toFixed(2)}</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#fafafa' }}>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>{anovaResults.anova.total.SS.toFixed(2)}</strong></TableCell>
                    <TableCell align="right"><strong>{anovaResults.anova.total.df}</strong></TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Interpretation:
              </Typography>
              <Alert severity={anovaResults.anova.factorA.significant || anovaResults.anova.factorB.significant || anovaResults.anova.interaction.significant ? "warning" : "info"}>
                <Typography variant="body2">
                  <strong>Main Effect of {factorA}:</strong> {anovaResults.anova.factorA.significant ? 'Significant' : 'Not significant'}
                  (F({anovaResults.anova.factorA.df}, {anovaResults.anova.error.df}) = {anovaResults.anova.factorA.F.toFixed(2)},
                  p = {anovaResults.anova.factorA.pValue.toFixed(4)}).
                  Effect size: {getEffectSizeInterpretation(anovaResults.anova.factorA.etaSquared)} (η² = {anovaResults.anova.factorA.etaSquared.toFixed(3)}).
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Main Effect of {factorB}:</strong> {anovaResults.anova.factorB.significant ? 'Significant' : 'Not significant'}
                  (F({anovaResults.anova.factorB.df}, {anovaResults.anova.error.df}) = {anovaResults.anova.factorB.F.toFixed(2)},
                  p = {anovaResults.anova.factorB.pValue.toFixed(4)}).
                  Effect size: {getEffectSizeInterpretation(anovaResults.anova.factorB.etaSquared)} (η² = {anovaResults.anova.factorB.etaSquared.toFixed(3)}).
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Interaction Effect ({factorA} × {factorB}):</strong> {anovaResults.anova.interaction.significant ? 'Significant' : 'Not significant'}
                  (F({anovaResults.anova.interaction.df}, {anovaResults.anova.error.df}) = {anovaResults.anova.interaction.F.toFixed(2)},
                  p = {anovaResults.anova.interaction.pValue.toFixed(4)}).
                  Effect size: {getEffectSizeInterpretation(anovaResults.anova.interaction.etaSquared)} (η² = {anovaResults.anova.interaction.etaSquared.toFixed(3)}).
                </Typography>
                {anovaResults.anova.interaction.significant && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    ⚠️ <strong>Important:</strong> The significant interaction means the effect of {factorA} depends on the level of {factorB}
                    (and vice versa). Interpret main effects with caution - focus on the interaction plot below.
                  </Typography>
                )}
              </Alert>
            </Box>
          </Paper>

          {/* Interaction Plot */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Interaction Plot
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              Non-parallel lines indicate an interaction effect between the two factors
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={interactionPlotData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="factorA"
                    label={{ value: factorA, position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis label={{ value: dependentVar, angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  {organizedData.factorBLevels.map((level, index) => {
                    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1'];
                    return (
                      <Line
                        key={level}
                        type="monotone"
                        dataKey={level}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        name={`${factorB}: ${level}`}
                        dot={{ r: 6 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Main Effects Plots */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Main Effect of {factorA}
                </Typography>
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={mainEffectsData.factorA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis label={{ value: dependentVar, angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="mean" fill="#8884d8" name="Mean" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Main Effect of {factorB}
                </Typography>
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={mainEffectsData.factorB}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis label={{ value: dependentVar, angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="mean" fill="#82ca9d" name="Mean" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* Selection prompts */}
      {(!factorA || !factorB || !dependentVar) && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select <strong>two categorical factors</strong> and <strong>one numeric dependent variable</strong> to perform two-way ANOVA.
          </Typography>
        </Alert>
      )}

      {factorA && factorB && factorA === factorB && (
        <Alert severity="warning">
          <Typography variant="body2">
            Please select <strong>two different factors</strong>. Factor A and Factor B must be distinct variables.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default TwoWayANOVA;
