/**
 * Sensitivity Analysis Component
 *
 * Displays leave-one-out sensitivity analysis results.
 * Shows how pooled effect changes when excluding each study.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

const SensitivityAnalysis = ({ sensitivityResults, pooledEffect }) => {
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!sensitivityResults) return [];
    return sensitivityResults.map(r => ({
      name: r.excluded_study,
      effect: r.pooled_effect,
      difference: r.pooled_effect - pooledEffect,
      ci_lower: r.ci_lower,
      ci_upper: r.ci_upper,
      i_squared: r.i_squared
    }));
  }, [sensitivityResults, pooledEffect]);

  // Find most influential study
  const mostInfluential = useMemo(() => {
    if (!sensitivityResults || sensitivityResults.length === 0) return null;
    return sensitivityResults.reduce((max, curr) => {
      const maxDiff = Math.abs(max.pooled_effect - pooledEffect);
      const currDiff = Math.abs(curr.pooled_effect - pooledEffect);
      return currDiff > maxDiff ? curr : max;
    });
  }, [sensitivityResults, pooledEffect]);

  // Calculate stability
  const effectRange = useMemo(() => {
    if (!sensitivityResults || sensitivityResults.length === 0) return { min: 0, max: 0, stable: true };
    const effects = sensitivityResults.map(r => r.pooled_effect);
    const min = Math.min(...effects);
    const max = Math.max(...effects);
    // Consider stable if range is less than 20% of pooled effect
    const stable = (max - min) < Math.abs(pooledEffect * 0.2);
    return { min, max, stable };
  }, [sensitivityResults, pooledEffect]);

  // Early return if no data (after all hooks)
  if (!sensitivityResults || sensitivityResults.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No sensitivity analysis data available</Typography>
      </Box>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="subtitle2">Excluding: {data.name}</Typography>
          <Typography variant="body2">Effect: {data.effect.toFixed(3)}</Typography>
          <Typography variant="body2">Change: {data.difference >= 0 ? '+' : ''}{data.difference.toFixed(3)}</Typography>
          <Typography variant="body2">95% CI: [{data.ci_lower.toFixed(3)}, {data.ci_upper.toFixed(3)}]</Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Leave-One-Out Sensitivity Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Shows how the pooled effect changes when excluding each study one at a time.
        Identifies influential studies that may disproportionately affect results.
      </Typography>

      {/* Stability Alert */}
      <Alert
        severity={effectRange.stable ? 'success' : 'warning'}
        sx={{ mb: 3 }}
      >
        {effectRange.stable
          ? 'Results appear robust. Excluding any single study does not substantially change the pooled effect.'
          : `Results may be sensitive to individual studies. Effect range: [${effectRange.min.toFixed(3)}, ${effectRange.max.toFixed(3)}]`}
      </Alert>

      {/* Chart */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(v) => v.toFixed(2)}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={pooledEffect}
              stroke="#9c27b0"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: 'Overall', position: 'top', fill: '#9c27b0' }}
            />
            <Bar dataKey="effect" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={Math.abs(entry.difference) > Math.abs(pooledEffect * 0.1) ? '#ff9800' : '#1976d2'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Most Influential Study */}
      {mostInfluential && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : '#fff3e0' }}>
          <Typography variant="subtitle2" gutterBottom>
            Most Influential Study
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {mostInfluential.excluded_study}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Excluding this study changes the pooled effect from {pooledEffect.toFixed(3)} to {mostInfluential.pooled_effect.toFixed(3)}
            ({mostInfluential.pooled_effect - pooledEffect >= 0 ? '+' : ''}
            {(mostInfluential.pooled_effect - pooledEffect).toFixed(3)})
          </Typography>
        </Paper>
      )}

      {/* Detailed Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100] }}>
              <TableCell>Excluded Study</TableCell>
              <TableCell align="right">Pooled Effect</TableCell>
              <TableCell align="right">95% CI</TableCell>
              <TableCell align="right">Change</TableCell>
              <TableCell align="right">I²</TableCell>
              <TableCell align="center">Influence</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sensitivityResults.map((result, index) => {
              const change = result.pooled_effect - pooledEffect;
              const isInfluential = Math.abs(change) > Math.abs(pooledEffect * 0.1);
              return (
                <TableRow key={index} hover sx={{ bgcolor: isInfluential ? '#fff8e1' : 'inherit' }}>
                  <TableCell>{result.excluded_study}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    {result.pooled_effect.toFixed(3)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    [{result.ci_lower.toFixed(3)}, {result.ci_upper.toFixed(3)}]
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontFamily: 'monospace',
                      color: change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary'
                    }}
                  >
                    {change >= 0 ? '+' : ''}{change.toFixed(3)}
                  </TableCell>
                  <TableCell align="right">
                    {result.i_squared.toFixed(1)}%
                  </TableCell>
                  <TableCell align="center">
                    {isInfluential ? (
                      <Chip label="High" size="small" color="warning" />
                    ) : (
                      <Chip label="Low" size="small" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SensitivityAnalysis;
