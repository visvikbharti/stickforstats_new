/**
 * Event Study Plot Component
 * ==========================
 * Visualizes dynamic treatment effects over time for Difference-in-Differences
 * analysis with event study design.
 *
 * Features:
 * - Time-varying treatment effect coefficients
 * - Confidence intervals as error bars
 * - Pre-treatment parallel trends visualization
 * - Treatment timing indicator
 * - Significance highlighting
 * - Interactive tooltips
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Alert,
  useTheme
} from '@mui/material';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ErrorBar,
  Scatter
} from 'recharts';

// Custom error bar component for confidence intervals
const CustomErrorBar = ({ x, y, width, height, ciLower, ciUpper, stroke }) => {
  if (!ciLower || !ciUpper) return null;

  const barWidth = 6;

  return (
    <g>
      {/* Vertical line */}
      <line
        x1={x}
        y1={ciLower}
        x2={x}
        y2={ciUpper}
        stroke={stroke}
        strokeWidth={1.5}
      />
      {/* Top cap */}
      <line
        x1={x - barWidth}
        y1={ciUpper}
        x2={x + barWidth}
        y2={ciUpper}
        stroke={stroke}
        strokeWidth={1.5}
      />
      {/* Bottom cap */}
      <line
        x1={x - barWidth}
        y1={ciLower}
        x2={x + barWidth}
        y2={ciLower}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </g>
  );
};

// Custom dot for significant effects
const SignificantDot = ({ cx, cy, significant, fill }) => {
  if (!cx || !cy) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={significant ? 8 : 6}
      fill={fill}
      stroke={significant ? '#000' : fill}
      strokeWidth={significant ? 2 : 1}
    />
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <Paper sx={{ p: 1.5, minWidth: 200 }}>
      <Typography variant="subtitle2" gutterBottom>
        Period: {label >= 0 ? `+${label}` : label}
        {label === 0 && ' (Reference)'}
        {label === -1 && ' (Pre-treatment)'}
      </Typography>

      <Stack spacing={0.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Estimate:</Typography>
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">p-value:</Typography>
          <Typography
            variant="body2"
            color={data.significant ? 'success.main' : 'text.secondary'}
          >
            {data.pValue?.toFixed(4)}
            {data.significant && ' *'}
          </Typography>
        </Box>
      </Stack>

      {data.significant && (
        <Chip
          label="Significant at p < 0.05"
          size="small"
          color="success"
          sx={{ mt: 1 }}
        />
      )}
    </Paper>
  );
};

const EventStudyPlot = ({
  data = [],
  treatmentTime = 0,
  title = 'Event Study: Dynamic Treatment Effects',
  xLabel = 'Periods Relative to Treatment',
  yLabel = 'Treatment Effect Estimate',
  height = 400,
  showParallelTrendsTest = true,
  parallelTrendsResult = null
}) => {
  const theme = useTheme();

  // Process data for visualization
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map(d => {
      const estimate = d.estimate ?? d.coefficient ?? d.effect ?? null;
      const se = d.se ?? d.std_error ?? d.stderr ?? null;
      const pValue = d.pValue ?? d.p_value ?? d.p ?? null;

      // `d.se || 0` turned a MISSING standard error into 0, collapsing the interval to
      // [estimate, estimate] -- a point with no whiskers, which the plot renders as an
      // estimate of perfect precision. Without a standard error there is no interval.
      const hasInterval = Number.isFinite(estimate) && Number.isFinite(se);

      return {
        period: d.period ?? d.event_time ?? d.time,
        estimate,
        se,
        ciLower: d.ciLower ?? d.ci_lower ?? (hasInterval ? estimate - 1.96 * se : null),
        ciUpper: d.ciUpper ?? d.ci_upper ?? (hasInterval ? estimate + 1.96 * se : null),
        pValue,
        // `null < 0.05` is true in JavaScript. A missing p-value was being marked significant.
        significant: Number.isFinite(pValue) && pValue < 0.05,
      };
    }).sort((a, b) => a.period - b.period);
  }, [data]);

  // Separate pre and post treatment periods
  const preTreatmentData = useMemo(() =>
    chartData.filter(d => d.period < treatmentTime),
    [chartData, treatmentTime]
  );

  const postTreatmentData = useMemo(() =>
    chartData.filter(d => d.period >= treatmentTime),
    [chartData, treatmentTime]
  );

  // Check if pre-treatment effects are consistent with parallel trends
  const parallelTrendsPassed = useMemo(() => {
    if (parallelTrendsResult !== null) return parallelTrendsResult;

    // Simple check: are all pre-treatment coefficients non-significant?
    return preTreatmentData.every(d => !d.significant);
  }, [preTreatmentData, parallelTrendsResult]);

  // Calculate y-axis domain with padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-1, 1];

    const allValues = chartData.flatMap(d => [d.ciLower, d.ciUpper, d.estimate]);
    const min = Math.min(...allValues.filter(v => v !== undefined));
    const max = Math.max(...allValues.filter(v => v !== undefined));
    const padding = (max - min) * 0.1;

    return [min - padding, max + padding];
  }, [chartData]);

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No event study data available. Run an event study analysis first.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>

        {/* Parallel Trends Alert */}
        {showParallelTrendsTest && (
          <Alert
            severity={parallelTrendsPassed ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            {parallelTrendsPassed
              ? 'Pre-treatment coefficients are not significantly different from zero, supporting the parallel trends assumption.'
              : 'Some pre-treatment coefficients are significant, which may indicate violation of the parallel trends assumption.'
            }
          </Alert>
        )}

        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.divider}
            />

            <XAxis
              dataKey="period"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: theme.palette.text.secondary }}
              tickFormatter={(value) => value >= 0 ? `+${value}` : value}
              label={{
                value: xLabel,
                position: 'bottom',
                offset: 40,
                fill: theme.palette.text.primary
              }}
            />

            <YAxis
              domain={yDomain}
              tick={{ fill: theme.palette.text.secondary }}
              tickFormatter={(value) => value.toFixed(2)}
              label={{
                value: yLabel,
                angle: -90,
                position: 'insideLeft',
                fill: theme.palette.text.primary,
                style: { textAnchor: 'middle' }
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              height={36}
            />

            {/* Reference line at y=0 */}
            <ReferenceLine
              y={0}
              stroke={theme.palette.text.secondary}
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            {/* Reference line at treatment time */}
            <ReferenceLine
              x={treatmentTime}
              stroke={theme.palette.error.main}
              strokeWidth={2}
              label={{
                value: 'Treatment',
                position: 'top',
                fill: theme.palette.error.main,
                fontSize: 12
              }}
            />

            {/* Confidence interval area - Pre-treatment (lighter) */}
            <Bar
              dataKey="estimate"
              fill="transparent"
              isAnimationActive={false}
            >
              <ErrorBar
                dataKey={(entry) => [
                  entry.estimate - entry.ciLower,
                  entry.ciUpper - entry.estimate
                ]}
                stroke={theme.palette.grey[500]}
                strokeWidth={1.5}
                width={4}
              />
            </Bar>

            {/* Point estimates with different colors for pre/post */}
            <Scatter
              name="Pre-treatment"
              data={preTreatmentData}
              dataKey="estimate"
              fill={theme.palette.grey[500]}
              shape={(props) => (
                <SignificantDot
                  {...props}
                  significant={props.payload.significant}
                  fill={theme.palette.grey[500]}
                />
              )}
            />

            <Scatter
              name="Post-treatment"
              data={postTreatmentData}
              dataKey="estimate"
              fill={theme.palette.primary.main}
              shape={(props) => (
                <SignificantDot
                  {...props}
                  significant={props.payload.significant}
                  fill={theme.palette.primary.main}
                />
              )}
            />

            {/* Line connecting points */}
            <Line
              type="monotone"
              dataKey="estimate"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary Statistics */}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`${preTreatmentData.length} pre-treatment periods`}
            variant="outlined"
            color="default"
          />
          <Chip
            label={`${postTreatmentData.length} post-treatment periods`}
            variant="outlined"
            color="primary"
          />
          <Chip
            label={`${chartData.filter(d => d.significant).length} significant effects`}
            variant="filled"
            color="success"
          />
        </Box>

        {/* Effect Trajectory */}
        {postTreatmentData.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Post-Treatment Effect Trajectory
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {postTreatmentData.map((d, i) => (
                <Chip
                  key={i}
                  label={`t+${d.period}: ${d.estimate.toFixed(3)}${d.significant ? '*' : ''}`}
                  size="small"
                  color={d.significant ? 'primary' : 'default'}
                  variant={d.significant ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Interpretation Guide */}
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
        <Typography variant="subtitle2" gutterBottom>
          Interpretation Guide
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>Pre-treatment periods (gray):</strong> These coefficients test the parallel
          trends assumption. They should be close to zero and not statistically significant
          if the assumption holds.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>Post-treatment periods (blue):</strong> These show the dynamic treatment
          effect at each period after treatment. Significant effects indicate the treatment
          had a detectable impact.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Confidence intervals:</strong> The error bars show 95% confidence intervals.
          Effects are significant at p &lt; 0.05 when the CI excludes zero.
        </Typography>
      </Paper>
    </Box>
  );
};

export default EventStudyPlot;
