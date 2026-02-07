/**
 * Balance Plot Component
 * ======================
 * Visualizes covariate balance before and after propensity score matching.
 * Shows standardized mean differences (SMD) for treated vs control groups.
 *
 * Features:
 * - Before/after matching comparison
 * - Standardized mean difference display
 * - Balance threshold indicators (0.1, 0.25)
 * - Love plot style visualization
 * - Variance ratio display option
 * - Summary statistics
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  useTheme
} from '@mui/material';
import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';

// Custom tooltip
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <Paper sx={{ p: 1.5, minWidth: 240 }}>
      <Typography variant="subtitle2" gutterBottom>
        {data.variable}
      </Typography>

      <Stack spacing={0.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            SMD Before:
          </Typography>
          <Typography
            variant="body2"
            color={Math.abs(data.smdBefore) > 0.1 ? 'error.main' : 'success.main'}
            fontWeight="bold"
          >
            {data.smdBefore?.toFixed(3)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            SMD After:
          </Typography>
          <Typography
            variant="body2"
            color={Math.abs(data.smdAfter) > 0.1 ? 'error.main' : 'success.main'}
            fontWeight="bold"
          >
            {data.smdAfter?.toFixed(3)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Improvement:
          </Typography>
          <Typography
            variant="body2"
            color={data.improvement > 0 ? 'success.main' : 'error.main'}
          >
            {data.improvement > 0 ? '+' : ''}{data.improvement?.toFixed(1)}%
          </Typography>
        </Box>

        {data.varianceRatioBefore !== undefined && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Var Ratio Before:
              </Typography>
              <Typography variant="body2">
                {data.varianceRatioBefore?.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Var Ratio After:
              </Typography>
              <Typography variant="body2">
                {data.varianceRatioAfter?.toFixed(2)}
              </Typography>
            </Box>
          </>
        )}
      </Stack>

      <Box sx={{ mt: 1 }}>
        <Chip
          label={data.balanced ? 'Balanced' : 'Imbalanced'}
          size="small"
          color={data.balanced ? 'success' : 'warning'}
        />
      </Box>
    </Paper>
  );
};

// Custom dot component for scatter
const BalanceDot = ({ cx, cy, fill, payload, isBefore }) => {
  if (!cx || !cy) return null;

  const size = isBefore ? 8 : 10;
  const shape = isBefore ? 'circle' : 'diamond';

  if (shape === 'diamond') {
    return (
      <polygon
        points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
        fill={fill}
        stroke="#fff"
        strokeWidth={1}
      />
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={fill}
      stroke="#fff"
      strokeWidth={1}
    />
  );
};

const BalancePlot = ({
  data = [],
  title = 'Covariate Balance: Before vs After Matching',
  threshold = 0.1,
  showTable = true,
  showVarianceRatio = false,
  height = 400
}) => {
  const theme = useTheme();
  const [showLines, setShowLines] = useState(true);

  // Process data for visualization
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((d, index) => ({
      ...d,
      variable: d.variable || d.name || d.covariate || `Var ${index + 1}`,
      smdBefore: d.smdBefore ?? d.std_diff_before ?? d.smd_before ?? Math.abs(d.before),
      smdAfter: d.smdAfter ?? d.std_diff_after ?? d.smd_after ?? Math.abs(d.after),
      varianceRatioBefore: d.varianceRatioBefore ?? d.var_ratio_before,
      varianceRatioAfter: d.varianceRatioAfter ?? d.var_ratio_after,
      balanced: Math.abs(d.smdAfter ?? d.std_diff_after ?? d.smd_after ?? d.after) < threshold,
      improvement: d.improvement ??
        ((Math.abs(d.smdBefore ?? d.before) - Math.abs(d.smdAfter ?? d.after)) /
          Math.abs(d.smdBefore ?? d.before) * 100),
      index
    }));
  }, [data, threshold]);

  // Summary statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const balancedBefore = chartData.filter(d => Math.abs(d.smdBefore) < threshold).length;
    const balancedAfter = chartData.filter(d => Math.abs(d.smdAfter) < threshold).length;
    const avgSMDBefore = chartData.reduce((sum, d) => sum + Math.abs(d.smdBefore), 0) / chartData.length;
    const avgSMDAfter = chartData.reduce((sum, d) => sum + Math.abs(d.smdAfter), 0) / chartData.length;
    const maxSMDBefore = Math.max(...chartData.map(d => Math.abs(d.smdBefore)));
    const maxSMDAfter = Math.max(...chartData.map(d => Math.abs(d.smdAfter)));

    return {
      totalCovariates: chartData.length,
      balancedBefore,
      balancedAfter,
      avgSMDBefore,
      avgSMDAfter,
      maxSMDBefore,
      maxSMDAfter,
      improvementRate: ((avgSMDBefore - avgSMDAfter) / avgSMDBefore * 100).toFixed(1)
    };
  }, [chartData, threshold]);

  // Calculate domain
  const xDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 0.5];

    const allValues = chartData.flatMap(d => [
      Math.abs(d.smdBefore),
      Math.abs(d.smdAfter)
    ]);
    const maxVal = Math.max(...allValues, 0.25);
    return [0, Math.ceil(maxVal * 10) / 10 + 0.05];
  }, [chartData]);

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No balance data available. Perform propensity score matching first.
        </Typography>
      </Paper>
    );
  }

  // Dynamic height based on number of covariates
  const dynamicHeight = Math.max(height, chartData.length * 30 + 100);

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={showLines}
                onChange={(e) => setShowLines(e.target.checked)}
                size="small"
              />
            }
            label="Show connecting lines"
          />
        </Box>

        {/* Summary Alert */}
        {stats && (
          <Alert
            severity={stats.balancedAfter === stats.totalCovariates ? 'success' : 'info'}
            sx={{ mb: 2 }}
          >
            <strong>{stats.balancedAfter} of {stats.totalCovariates}</strong> covariates balanced
            after matching (SMD &lt; {threshold}).
            Average SMD reduced by <strong>{stats.improvementRate}%</strong>
            (from {stats.avgSMDBefore.toFixed(3)} to {stats.avgSMDAfter.toFixed(3)}).
          </Alert>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={dynamicHeight}>
          <ComposedChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 120, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />

            <XAxis
              type="number"
              domain={xDomain}
              tick={{ fill: theme.palette.text.secondary }}
              label={{
                value: 'Absolute Standardized Mean Difference',
                position: 'bottom',
                offset: 20,
                fill: theme.palette.text.primary
              }}
            />

            <YAxis
              type="category"
              dataKey="variable"
              width={110}
              tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
              tickFormatter={(value) =>
                value.length > 15 ? `${value.substring(0, 15)}...` : value
              }
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend verticalAlign="top" height={36} />

            {/* Reference area for "good" balance zone */}
            <ReferenceArea
              x1={0}
              x2={threshold}
              fill={theme.palette.success.main}
              fillOpacity={0.1}
            />

            {/* Reference line at threshold */}
            <ReferenceLine
              x={threshold}
              stroke={theme.palette.warning.main}
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `SMD = ${threshold}`,
                position: 'top',
                fill: theme.palette.warning.main,
                fontSize: 11
              }}
            />

            {/* Optional 0.25 line */}
            <ReferenceLine
              x={0.25}
              stroke={theme.palette.error.main}
              strokeWidth={1}
              strokeDasharray="3 3"
            />

            {/* Connecting lines (before matching) */}
            {showLines && chartData.map((entry, index) => (
              <ReferenceLine
                key={`line-${index}`}
                segment={[
                  { x: Math.abs(entry.smdBefore), y: entry.variable },
                  { x: Math.abs(entry.smdAfter), y: entry.variable }
                ]}
                stroke={theme.palette.grey[400]}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            ))}

            {/* Before matching points */}
            <Scatter
              name="Before Matching"
              data={chartData}
              dataKey="smdBefore"
              fill={theme.palette.grey[500]}
              shape={(props) => <BalanceDot {...props} isBefore={true} />}
            />

            {/* After matching points */}
            <Scatter
              name="After Matching"
              data={chartData}
              dataKey="smdAfter"
              fill={theme.palette.primary.main}
              shape={(props) => <BalanceDot {...props} isBefore={false} />}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary Chips */}
        {stats && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Before: ${stats.balancedBefore}/${stats.totalCovariates} balanced`}
              variant="outlined"
              color="default"
              size="small"
            />
            <Chip
              label={`After: ${stats.balancedAfter}/${stats.totalCovariates} balanced`}
              variant="outlined"
              color="primary"
              size="small"
            />
            <Chip
              label={`Max SMD: ${stats.maxSMDBefore.toFixed(2)} → ${stats.maxSMDAfter.toFixed(2)}`}
              variant="outlined"
              size="small"
            />
          </Stack>
        )}
      </Paper>

      {/* Detailed Table */}
      {showTable && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Balance Statistics Detail
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Covariate</TableCell>
                  <TableCell align="right">SMD Before</TableCell>
                  <TableCell align="right">SMD After</TableCell>
                  <TableCell align="right">Change</TableCell>
                  {showVarianceRatio && (
                    <>
                      <TableCell align="right">VR Before</TableCell>
                      <TableCell align="right">VR After</TableCell>
                    </>
                  )}
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chartData.map((row, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      bgcolor: row.balanced
                        ? 'rgba(76, 175, 80, 0.08)'
                        : 'rgba(255, 152, 0, 0.08)'
                    }}
                  >
                    <TableCell>{row.variable}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: Math.abs(row.smdBefore) > threshold
                          ? 'error.main'
                          : 'success.main'
                      }}
                    >
                      {row.smdBefore?.toFixed(3)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: Math.abs(row.smdAfter) > threshold
                          ? 'error.main'
                          : 'success.main',
                        fontWeight: 'bold'
                      }}
                    >
                      {row.smdAfter?.toFixed(3)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: row.improvement > 0 ? 'success.main' : 'error.main'
                      }}
                    >
                      {row.improvement > 0 ? '+' : ''}{row.improvement?.toFixed(1)}%
                    </TableCell>
                    {showVarianceRatio && (
                      <>
                        <TableCell align="right">
                          {row.varianceRatioBefore?.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {row.varianceRatioAfter?.toFixed(2)}
                        </TableCell>
                      </>
                    )}
                    <TableCell align="center">
                      <Chip
                        label={row.balanced ? 'Balanced' : 'Check'}
                        size="small"
                        color={row.balanced ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Interpretation Guide */}
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'action.hover' }}>
        <Typography variant="subtitle2" gutterBottom>
          Interpretation Guide
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>Standardized Mean Difference (SMD):</strong> Measures the difference
          in covariate means between treatment and control groups, standardized by the
          pooled standard deviation. Values closer to 0 indicate better balance.
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              width: 12, height: 12,
              bgcolor: theme.palette.success.main,
              opacity: 0.3,
              borderRadius: 0.5
            }} />
            <Typography variant="body2">SMD &lt; {threshold}: Good balance</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              width: 12, height: 12,
              bgcolor: theme.palette.warning.main,
              borderRadius: 0.5
            }} />
            <Typography variant="body2">{threshold} ≤ SMD &lt; 0.25: Moderate imbalance</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              width: 12, height: 12,
              bgcolor: theme.palette.error.main,
              borderRadius: 0.5
            }} />
            <Typography variant="body2">SMD ≥ 0.25: Serious imbalance</Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default BalancePlot;
