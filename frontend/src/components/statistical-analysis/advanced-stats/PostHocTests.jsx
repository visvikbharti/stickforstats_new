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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  ToggleButton,
  ToggleButtonGroup
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

/**
 * Main Post-hoc Tests Component
 */
const PostHocTests = ({ data }) => {
  const [groupVariable, setGroupVariable] = useState('');
  const [dependentVar, setDependentVar] = useState('');
  const [testMethod, setTestMethod] = useState('tukey');
  const [alpha, setAlpha] = useState(0.05);

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
          case 'tukey':
            // Tukey HSD uses Studentized range distribution
            // Approximation: q-critical ≈ √2 * t-critical for k groups
            const qCritical = getStudentizedRangeCritical(groups.length, dfWithin, alpha);
            criticalValue = qCritical * Math.sqrt(mse * (1/n1 + 1/n2) / 2);
            significant = meanDiff > criticalValue;
            pValue = getTukeyPValue(tStat * Math.sqrt(2), groups.length, dfWithin);
            break;

          case 'bonferroni':
            // Bonferroni: adjust alpha by number of comparisons
            const numComparisons = (groups.length * (groups.length - 1)) / 2;
            const bonferroniAlpha = alpha / numComparisons;
            const tCriticalBonf = getTCritical(dfWithin, bonferroniAlpha / 2);
            criticalValue = tCriticalBonf * seDiff;
            significant = meanDiff > criticalValue;
            pValue = getTDistributionPValue(tStat, dfWithin) * numComparisons;
            if (pValue > 1) pValue = 1; // Cap at 1
            break;

          case 'scheffe':
            // Scheffé: most conservative, controls for all contrasts
            const fCritical = getFCritical(groups.length - 1, dfWithin, alpha);
            criticalValue = Math.sqrt((groups.length - 1) * fCritical) * seDiff;
            significant = meanDiff > criticalValue;
            pValue = getScheffePValue(tStat, groups.length, dfWithin);
            break;

          case 'fisher':
            // Fisher LSD: least conservative, no adjustment
            const tCriticalFisher = getTCritical(dfWithin, alpha / 2);
            criticalValue = tCriticalFisher * seDiff;
            significant = meanDiff > criticalValue;
            pValue = getTDistributionPValue(tStat, dfWithin);
            break;

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

  /**
   * Statistical distribution functions (approximations)
   */
  const getStudentizedRangeCritical = (k, df, alpha) => {
    // Approximation for Studentized range critical value
    // More accurate values would come from tables or libraries
    if (alpha === 0.05) {
      if (k === 3) return df > 60 ? 3.31 : 3.77;
      if (k === 4) return df > 60 ? 3.63 : 4.20;
      if (k === 5) return df > 60 ? 3.86 : 4.51;
      return 3.5 + 0.3 * k; // Rough approximation
    }
    return 3.0 + 0.3 * k;
  };

  const getTCritical = (df, alpha) => {
    // Approximation for t-critical value
    if (df > 30) {
      if (alpha <= 0.001) return 3.291;
      if (alpha <= 0.01) return 2.576;
      if (alpha <= 0.025) return 2.326;
      if (alpha <= 0.05) return 1.960;
      return 1.645;
    }
    // Simplified for small df
    if (alpha <= 0.025) return 2.5 + 10/df;
    return 2.0 + 5/df;
  };

  const getFCritical = (df1, df2, alpha) => {
    // Approximation for F-critical value
    if (alpha === 0.05) {
      if (df1 <= 5 && df2 > 30) return 2.4 + df1 * 0.2;
      return 3.0;
    }
    return 4.0;
  };

  const getTDistributionPValue = (t, df) => {
    // Rough approximation of t-distribution p-value (two-tailed)
    const absT = Math.abs(t);
    if (absT > 5) return 0.0001;
    if (absT > 3.5) return 0.001;
    if (absT > 2.8) return 0.01;
    if (absT > 2.0) return 0.05;
    if (absT > 1.7) return 0.10;
    return 0.20;
  };

  const getTukeyPValue = (q, k, df) => {
    // Approximation for Tukey HSD p-value
    if (q > 5) return 0.001;
    if (q > 4) return 0.01;
    if (q > 3.5) return 0.05;
    return 0.10;
  };

  const getScheffePValue = (t, k, df) => {
    // Scheffé p-value approximation
    const f = t * t / (k - 1);
    if (f > 5) return 0.01;
    if (f > 3) return 0.05;
    return 0.10;
  };

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
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
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

      {/* Results */}
      {pairwiseComparisons && groupedData && (
        <>
          {/* Summary Statistics */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Summary Statistics
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
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
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
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
                    <TableRow key={index} sx={{ bgcolor: comp.significant ? '#ffebee' : 'white' }}>
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
                  <Bar dataKey="mean" fill="#8884d8" name="Mean">
                    <ErrorBar dataKey="se" width={4} strokeWidth={2} stroke="#000" />
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
    </Box>
  );
};

export default PostHocTests;
