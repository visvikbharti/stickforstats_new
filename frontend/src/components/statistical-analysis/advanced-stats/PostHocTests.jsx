/**
 * Post-hoc Tests Component
 *
 * Multiple comparison procedures for identifying which groups differ
 * after finding a significant ANOVA result.
 *
 * Tests included:
 * - Tukey HSD (Honest Significant Difference)
 * - Bonferroni correction
 * - Scheffé test
 * - Fisher LSD (Least Significant Difference)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { tTestPValue, tCriticalValue, fCriticalValue, tukeyPValue, scheffePValue } from '../../../utils/statisticalDistributions';
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
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ErrorBar,
  Legend
} from 'recharts';
import CalculateIcon from '@mui/icons-material/Calculate';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import guardianService from '../../../services/GuardianService';
import GuardianWarning from '../../Guardian/GuardianWarning';
import { useSettings } from '../../../context/SettingsContext';

/**
 * Main Post-hoc Tests Component
 */
const PostHocTests = ({ data }) => {
  const { expertMode } = useSettings();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [groupVariable, setGroupVariable] = useState('');
  const [dependentVar, setDependentVar] = useState('');
  const [testMethod, setTestMethod] = useState('tukey');
  const [alpha, setAlpha] = useState(0.05);

  // Guardian Integration - Statistical Assumption Validation
  const [guardianReport, setGuardianReport] = useState(null);
  const [isCheckingAssumptions, setIsCheckingAssumptions] = useState(false);
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
   * Organize data by groups
   */
  const groupedData = useMemo(() => {
    if (!groupVariable || !dependentVar || !data) return null;

    const groups = {};

    data.forEach(row => {
      const group = String(row[groupVariable] || 'Missing');
      const value = parseFloat(row[dependentVar]);

      if (isNaN(value)) return;

      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(value);
    });

    // Calculate group statistics
    const groupStats = {};
    Object.entries(groups).forEach(([group, values]) => {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
      const std = Math.sqrt(variance);

      groupStats[group] = {
        values,
        n: values.length,
        mean,
        variance,
        std,
        se: std / Math.sqrt(values.length)
      };
    });

    return {
      groups: Object.keys(groups).sort(),
      stats: groupStats,
      totalN: data.length
    };
  }, [data, groupVariable, dependentVar]);

  /**
   * Guardian Validation - Check ANOVA assumptions for post-hoc tests
   * Post-hoc tests inherit ANOVA assumptions: normality, variance homogeneity, independence
   */
  useEffect(() => {
    const validateAssumptions = async () => {
      // Only validate if we have both variables selected and grouped data
      if (!groupVariable || !dependentVar || !groupedData) {
        setGuardianReport(null);
        setIsTestBlocked(false);
        return;
      }

      // Need at least 3 groups for post-hoc tests
      if (groupedData.groups.length < 3) {
        setGuardianReport(null);
        setIsTestBlocked(false);
        return;
      }

      setIsCheckingAssumptions(true);

      try {
        // Format data for Guardian: array of arrays (one per group)
        const formattedData = groupedData.groups.map(group =>
          groupedData.stats[group].values
        );

        // Call Guardian API with ANOVA test type (post-hoc inherits ANOVA assumptions)
        const result = await guardianService.checkAssumptions(formattedData, 'anova', alpha);

        setGuardianReport(result);

        // Block test if critical violations detected; Expert Mode bypasses blocking
        setIsTestBlocked(!expertMode && !result.can_proceed);
      } catch (error) {
        console.error('Guardian assumption check failed:', error);
        // Fail open - don't block on Guardian errors
        setGuardianReport(null);
        setIsTestBlocked(false);
      } finally {
        setIsCheckingAssumptions(false);
      }
    };

    validateAssumptions();
  }, [groupVariable, dependentVar, groupedData, alpha, expertMode]);

  /**
   * Calculate pooled error term (MSE from ANOVA)
   */
  const pooledError = useMemo(() => {
    if (!groupedData) return null;

    const { stats, totalN } = groupedData;
    const groups = Object.keys(stats);
    const k = groups.length;

    // Calculate grand mean
    let totalSum = 0;
    groups.forEach(group => {
      totalSum += stats[group].mean * stats[group].n;
    });
    const grandMean = totalSum / totalN;

    // Calculate SSWithin (pooled error)
    let ssWithin = 0;
    groups.forEach(group => {
      stats[group].values.forEach(value => {
        ssWithin += Math.pow(value - stats[group].mean, 2);
      });
    });

    const dfWithin = totalN - k;
    const mse = ssWithin / dfWithin;

    return {
      mse,
      dfWithin,
      grandMean
    };
  }, [groupedData]);

  /**
   * Perform pairwise comparisons
   */
  const pairwiseComparisons = useMemo(() => {
    if (!groupedData || !pooledError) return null;

    const { groups, stats } = groupedData;
    const { mse, dfWithin } = pooledError;
    const comparisons = [];

    // Generate all pairwise comparisons
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const group1 = groups[i];
        const group2 = groups[j];

        const mean1 = stats[group1].mean;
        const mean2 = stats[group2].mean;
        const n1 = stats[group1].n;
        const n2 = stats[group2].n;

        const meanDiff = Math.abs(mean1 - mean2);

        // Standard error for difference
        const seDiff = Math.sqrt(mse * (1/n1 + 1/n2));

        // t-statistic for pairwise comparison
        const tStat = meanDiff / seDiff;

        // Calculate critical values and p-values for different methods
        let criticalValue, pValue, significant;

        switch (testMethod) {
          case 'tukey': {
            // Tukey HSD uses Studentized range distribution
            const qStat = Math.abs(tStat) * Math.sqrt(2);
            // Critical value from t-distribution as approximation for threshold
            const tCritTukey = tCriticalValue(dfWithin, alpha / (2 * groups.length));
            criticalValue = tCritTukey * seDiff;
            significant = meanDiff > criticalValue;
            // Proper p-value from studentized range distribution
            pValue = tukeyPValue(qStat, groups.length, dfWithin);
            break;
          }

          case 'bonferroni': {
            // Bonferroni: adjust alpha by number of comparisons
            const numComparisons = (groups.length * (groups.length - 1)) / 2;
            const bonferroniAlpha = alpha / numComparisons;
            const tCriticalBonf = tCriticalValue(dfWithin, bonferroniAlpha / 2);
            criticalValue = tCriticalBonf * seDiff;
            significant = meanDiff > criticalValue;
            pValue = Math.min(1, tTestPValue(tStat, dfWithin) * numComparisons);
            break;
          }

          case 'scheffe': {
            // Scheffé: most conservative, controls for all contrasts
            const fCrit = fCriticalValue(groups.length - 1, dfWithin, alpha);
            criticalValue = Math.sqrt((groups.length - 1) * fCrit) * seDiff;
            significant = meanDiff > criticalValue;
            pValue = scheffePValue(tStat, groups.length, dfWithin);
            break;
          }

          case 'fisher': {
            // Fisher LSD: least conservative, no adjustment
            const tCriticalFisher = tCriticalValue(dfWithin, alpha / 2);
            criticalValue = tCriticalFisher * seDiff;
            significant = meanDiff > criticalValue;
            pValue = tTestPValue(tStat, dfWithin);
            break;
          }

          default:
            criticalValue = 0;
            pValue = 1;
            significant = false;
        }

        comparisons.push({
          group1,
          group2,
          mean1,
          mean2,
          meanDiff,
          seDiff,
          tStat,
          criticalValue,
          pValue: Math.min(pValue, 1), // Cap at 1
          significant
        });
      }
    }

    return comparisons;
  }, [groupedData, pooledError, testMethod, alpha]);

  // Distribution functions imported from statisticalDistributions:
  // tTestPValue, tCriticalValue, fCriticalValue, tukeyPValue, scheffePValue

  /**
   * Prepare visualization data
   */
  const vizData = useMemo(() => {
    if (!groupedData) return [];

    const { groups, stats } = groupedData;
    return groups.map(group => ({
      name: group,
      mean: stats[group].mean,
      se: stats[group].se,
      n: stats[group].n
    }));
  }, [groupedData]);

  /**
   * Get test method description
   */
  const getTestDescription = () => {
    switch (testMethod) {
      case 'tukey':
        return 'Tukey HSD controls family-wise error rate. Good balance of power and conservativeness. Best for equal sample sizes.';
      case 'bonferroni':
        return 'Bonferroni correction is simple but conservative. Divides alpha by number of comparisons. Best when few comparisons.';
      case 'scheffe':
        return 'Scheffé test is most conservative. Controls for ALL possible contrasts, not just pairwise. Use when many comparisons.';
      case 'fisher':
        return 'Fisher LSD is least conservative. No adjustment for multiple comparisons. Only use if ANOVA is significant.';
      default:
        return '';
    }
  };

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

  if (columnInfo.categorical.length < 1) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Post-hoc tests require at least 1 categorical grouping variable with 3+ levels.
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
          <CalculateIcon /> Post-hoc Test Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Group Variable</InputLabel>
              <Select
                value={groupVariable}
                label="Group Variable"
                onChange={(e) => setGroupVariable(e.target.value)}
              >
                <MenuItem value=""><em>Select variable...</em></MenuItem>
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
              <InputLabel>Test Method</InputLabel>
              <Select
                value={testMethod}
                label="Test Method"
                onChange={(e) => setTestMethod(e.target.value)}
              >
                <MenuItem value="tukey">Tukey HSD</MenuItem>
                <MenuItem value="bonferroni">Bonferroni</MenuItem>
                <MenuItem value="scheffe">Scheffé</MenuItem>
                <MenuItem value="fisher">Fisher LSD</MenuItem>
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
            <strong>Post-hoc tests</strong> identify which specific groups differ after a significant ANOVA.
            {' '}{getTestDescription()}
          </Typography>
        </Alert>
      </Paper>

      {/* Guardian Assumption Validation */}
      {isCheckingAssumptions && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <CircularProgress size={30} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Validating statistical assumptions...
          </Typography>
        </Paper>
      )}

      {guardianReport && (
        <Box sx={{ mb: 3 }}>
          <GuardianWarning
            guardianReport={guardianReport}
            onProceed={() => {
              setIsTestBlocked(false);
            }}
            onSelectAlternative={(alt) => {
              alert(`Alternative Test Selected: ${alt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\nPlease navigate to the appropriate test module to use this alternative.`);
            }}
            onViewEvidence={() => {}}
          />
        </Box>
      )}

      {/* Results - Only show if test is not blocked */}
      {pairwiseComparisons && groupedData && !isTestBlocked && (
        <>
          {/* Summary Statistics */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Summary Statistics
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                    <TableCell><strong>Group</strong></TableCell>
                    <TableCell align="right"><strong>n</strong></TableCell>
                    <TableCell align="right"><strong>Mean</strong></TableCell>
                    <TableCell align="right"><strong>SD</strong></TableCell>
                    <TableCell align="right"><strong>SE</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedData.groups.map((group) => {
                    const stats = groupedData.stats[group];
                    return (
                      <TableRow key={group}>
                        <TableCell>{group}</TableCell>
                        <TableCell align="right">{stats.n}</TableCell>
                        <TableCell align="right">{stats.mean.toFixed(3)}</TableCell>
                        <TableCell align="right">{stats.std.toFixed(3)}</TableCell>
                        <TableCell align="right">{stats.se.toFixed(3)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Pairwise Comparisons Table */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pairwise Comparisons ({testMethod.charAt(0).toUpperCase() + testMethod.slice(1)})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[isDarkMode ? 800 : 100] }}>
                    <TableCell><strong>Comparison</strong></TableCell>
                    <TableCell align="right"><strong>Mean Difference</strong></TableCell>
                    <TableCell align="right"><strong>SE</strong></TableCell>
                    <TableCell align="right"><strong>t-statistic</strong></TableCell>
                    <TableCell align="right"><strong>p-value</strong></TableCell>
                    <TableCell align="center"><strong>Significant (α = {alpha})</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pairwiseComparisons.map((comp, index) => (
                    <TableRow key={index} sx={{ bgcolor: comp.significant ? (isDarkMode ? theme.palette.error.dark + '15' : theme.palette.error.light + '20') : 'transparent' }}>
                      <TableCell>{comp.group1} vs {comp.group2}</TableCell>
                      <TableCell align="right">{comp.meanDiff.toFixed(3)}</TableCell>
                      <TableCell align="right">{comp.seDiff.toFixed(3)}</TableCell>
                      <TableCell align="right">{comp.tStat.toFixed(3)}</TableCell>
                      <TableCell align="right">{comp.pValue.toFixed(4)}</TableCell>
                      <TableCell align="center">
                        {comp.significant ? (
                          <Chip icon={<CancelOutlinedIcon />} label="Yes" color="error" size="small" />
                        ) : (
                          <Chip icon={<CheckCircleOutlineIcon />} label="No" color="success" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Interpretation:
              </Typography>
              <Alert severity="info">
                <Typography variant="body2">
                  {pairwiseComparisons.filter(c => c.significant).length} of {pairwiseComparisons.length} pairwise comparisons are significant at α = {alpha}.
                </Typography>
                {pairwiseComparisons.filter(c => c.significant).length > 0 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Significant differences detected between:</strong>
                    {pairwiseComparisons.filter(c => c.significant).map((comp, idx) => (
                      <span key={idx}>
                        {idx > 0 && ', '}
                        {comp.group1} vs {comp.group2}
                      </span>
                    ))}
                  </Typography>
                )}
              </Alert>
            </Box>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Means with Standard Error
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={vizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: dependentVar, angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mean" fill={theme.palette.primary.main} name="Mean">
                    <ErrorBar dataKey="se" width={4} strokeWidth={2} stroke={theme.palette.text.primary} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              Error bars represent ± 1 standard error
            </Typography>
          </Paper>
        </>
      )}

      {/* Selection prompts */}
      {(!groupVariable || !dependentVar) && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select a <strong>grouping variable</strong> and a <strong>numeric dependent variable</strong> to perform post-hoc tests.
          </Typography>
        </Alert>
      )}

      {groupedData && groupedData.groups.length < 3 && (
        <Alert severity="warning">
          <Typography variant="body2">
            Post-hoc tests require at least <strong>3 groups</strong>. Found: {groupedData.groups.length}.
            Use a t-test for comparing just 2 groups.
          </Typography>
        </Alert>
      )}

      {/* Guardian Blocking Message */}
      {isTestBlocked && groupVariable && dependentVar && groupedData && (
        <Paper elevation={2} sx={{ p: 3, bgcolor: isDarkMode ? theme.palette.warning.dark + '20' : theme.palette.warning.light + '30', border: `2px solid ${theme.palette.warning.main}` }}>
          <Alert severity="error">
            <Typography variant="body1" gutterBottom>
              <strong>Post-hoc Test Blocked Due to Assumption Violations</strong>
            </Typography>
            <Typography variant="body2">
              The Guardian system has detected critical violations of statistical assumptions required for post-hoc tests.
              Please review the violations above and consider the recommended alternatives.
            </Typography>
          </Alert>
        </Paper>
      )}
    </Box>
  );
};

export default PostHocTests;
