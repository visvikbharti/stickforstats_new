/**
 * Caterpillar Plot Component
 * ==========================
 * Visualizes random effects from mixed models (LMM, GLMM) with confidence intervals.
 * Named for its appearance when sorted by effect size.
 *
 * Features:
 * - Random effects sorted by magnitude
 * - 95% confidence intervals
 * - Shrinkage visualization
 * - Group labeling
 * - Reference line at zero
 * - Interactive tooltips with BLUP details
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Tooltip as MuiTooltip,
  useTheme
} from '@mui/material';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ErrorBar,
  Cell
} from 'recharts';

// Custom tooltip component
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <Paper sx={{ p: 1.5, minWidth: 220 }}>
      <Typography variant="subtitle2" gutterBottom>
        {data.group}
      </Typography>

      <Stack spacing={0.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {data.effect} Effect:
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {data.estimate?.toFixed(4)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Std. Error:</Typography>
          <Typography variant="body2">{data.se?.toFixed(4)}</Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">95% CI:</Typography>
          <Typography variant="body2">
            [{data.ciLower?.toFixed(3)}, {data.ciUpper?.toFixed(3)}]
          </Typography>
        </Box>

        {data.shrinkage !== undefined && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Shrinkage:</Typography>
            <Typography variant="body2">
              {(data.shrinkage * 100).toFixed(1)}%
            </Typography>
          </Box>
        )}

        {data.nObs !== undefined && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">N obs:</Typography>
            <Typography variant="body2">{data.nObs}</Typography>
          </Box>
        )}
      </Stack>

      {Math.abs(data.estimate) > 1.96 * data.se && (
        <Chip
          label="Significantly different from 0"
          size="small"
          color="primary"
          sx={{ mt: 1 }}
        />
      )}
    </Paper>
  );
};

const CaterpillarPlot = ({
  data = [],
  title = 'Random Effects (Caterpillar Plot)',
  effectType = 'Intercept',
  sortBy = 'estimate',
  ascending = true,
  height = 400,
  showShrinkage = false,
  shrinkageData = null,
  maxGroups = 50
}) => {
  const theme = useTheme();
  const [sortOrder, setSortOrder] = useState(ascending ? 'asc' : 'desc');
  const [selectedEffect, setSelectedEffect] = useState(effectType);

  // Get unique effect types from data
  const effectTypes = useMemo(() => {
    const types = new Set(data.map(d => d.effect || 'Intercept'));
    return Array.from(types);
  }, [data]);

  // Process and sort data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Filter by selected effect type
    let filtered = data.filter(d =>
      (d.effect || 'Intercept') === selectedEffect
    );

    // Add computed fields
    filtered = filtered.map(d => ({
      ...d,
      group: d.group || d.id || d.name,
      estimate: d.estimate ?? d.value ?? d.effect_value,
      se: d.se ?? d.std_error ?? d.stderr ?? 0,
      ciLower: d.ciLower ?? d.ci_lower ?? (d.estimate - 1.96 * (d.se || 0)),
      ciUpper: d.ciUpper ?? d.ci_upper ?? (d.estimate + 1.96 * (d.se || 0)),
      effect: d.effect || 'Intercept',
      shrinkage: d.shrinkage,
      nObs: d.n_obs ?? d.nObs ?? d.n
    }));

    // Sort data
    filtered.sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      return multiplier * (a.estimate - b.estimate);
    });

    // Limit number of groups if too many
    if (filtered.length > maxGroups) {
      filtered = filtered.slice(0, maxGroups);
    }

    return filtered;
  }, [data, selectedEffect, sortOrder, maxGroups]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const estimates = chartData.map(d => d.estimate);
    const significantCount = chartData.filter(d =>
      Math.abs(d.estimate) > 1.96 * d.se
    ).length;

    return {
      min: Math.min(...estimates),
      max: Math.max(...estimates),
      range: Math.max(...estimates) - Math.min(...estimates),
      significantCount,
      totalCount: chartData.length
    };
  }, [chartData]);

  // Calculate y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-1, 1];

    const allValues = chartData.flatMap(d => [d.ciLower, d.ciUpper]);
    const min = Math.min(...allValues.filter(v => v !== undefined));
    const max = Math.max(...allValues.filter(v => v !== undefined));
    const padding = (max - min) * 0.1;

    return [min - padding, max + padding];
  }, [chartData]);

  // Get bar color based on significance
  const getBarColor = (entry) => {
    const significant = Math.abs(entry.estimate) > 1.96 * entry.se;

    if (significant) {
      return entry.estimate > 0
        ? theme.palette.success.main
        : theme.palette.error.main;
    }
    return theme.palette.grey[400];
  };

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No random effects data available. Fit a mixed model first.
        </Typography>
      </Paper>
    );
  }

  // Dynamic height based on number of groups
  const dynamicHeight = Math.max(height, chartData.length * 25 + 100);

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            {effectTypes.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Effect</InputLabel>
                <Select
                  value={selectedEffect}
                  label="Effect"
                  onChange={(e) => setSelectedEffect(e.target.value)}
                >
                  {effectTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort</InputLabel>
              <Select
                value={sortOrder}
                label="Sort"
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {/* Summary Statistics */}
        {stats && (
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Chip
              label={`${stats.totalCount} groups`}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${stats.significantCount} significant`}
              color="primary"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Range: ${stats.range.toFixed(3)}`}
              variant="outlined"
              size="small"
            />
          </Stack>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={dynamicHeight}>
          <ComposedChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={true}
              vertical={true}
              stroke={theme.palette.divider}
            />

            <XAxis
              type="number"
              domain={yDomain}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              tickFormatter={(value) => value.toFixed(2)}
              label={{
                value: `${selectedEffect} Random Effect`,
                position: 'bottom',
                offset: 0,
                fill: theme.palette.text.primary
              }}
            />

            <YAxis
              type="category"
              dataKey="group"
              width={90}
              tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
              tickFormatter={(value) =>
                value.length > 12 ? `${value.substring(0, 12)}...` : value
              }
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Reference line at zero */}
            <ReferenceLine
              x={0}
              stroke={theme.palette.text.primary}
              strokeWidth={2}
              strokeDasharray="3 3"
            />

            {/* Bars with error bars */}
            <Bar
              dataKey="estimate"
              barSize={15}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry)}
                />
              ))}
              <ErrorBar
                dataKey={(entry) => [
                  entry.estimate - entry.ciLower,
                  entry.ciUpper - entry.estimate
                ]}
                stroke={theme.palette.text.secondary}
                strokeWidth={1}
                width={4}
                direction="x"
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>

        {/* Shrinkage Information */}
        {showShrinkage && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Shrinkage Explanation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Random effects are "shrunk" toward zero compared to raw group means.
              Groups with fewer observations or more variable data are shrunk more
              toward the overall mean. This is a feature of Best Linear Unbiased
              Prediction (BLUP).
            </Typography>
          </Box>
        )}

        {/* Note about truncation */}
        {data.length > maxGroups && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Note: Showing top {maxGroups} of {data.length} groups.
            Adjust maxGroups prop to show more.
          </Typography>
        )}
      </Paper>

      {/* Interpretation Guide */}
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
        <Typography variant="subtitle2" gutterBottom>
          Interpretation Guide
        </Typography>

        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.success.main, borderRadius: 0.5 }} />
            <Typography variant="body2">
              Green bars: Significantly positive random effects (above average)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.error.main, borderRadius: 0.5 }} />
            <Typography variant="body2">
              Red bars: Significantly negative random effects (below average)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.grey[400], borderRadius: 0.5 }} />
            <Typography variant="body2">
              Gray bars: Non-significant random effects (not different from average)
            </Typography>
          </Box>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Error bars show 95% confidence intervals. Effects are considered significant
          when the CI excludes zero.
        </Typography>
      </Paper>
    </Box>
  );
};

export default CaterpillarPlot;
