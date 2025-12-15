/**
 * Funnel Plot Component
 *
 * Visualizes publication bias using a funnel plot.
 * Shows effect sizes vs standard errors with pseudo-CI lines.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const FunnelPlot = ({ data, publicationBias }) => {
  // Prepare scatter data for studies
  const scatterData = useMemo(() => {
    if (!data || !data.points) return [];
    return data.points.map(p => ({
      study_name: p.study_name,
      x: p.effect,  // Effect size on x-axis
      y: p.se,      // SE on y-axis (will be reversed)
    }));
  }, [data]);

  // Calculate domain for x-axis
  const xDomain = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) return [-1, 1];
    // Filter out invalid effect values
    const effects = data.points
      .map(p => p.effect)
      .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    if (effects.length === 0) return [-1, 1];
    const min = Math.min(...effects);
    const max = Math.max(...effects);
    const padding = (max - min) * 0.3 || 0.5;
    return [min - padding, max + padding];
  }, [data]);

  // Calculate domain for y-axis
  const yDomain = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) return [0, 0.5];
    // Filter out invalid SE values
    const ses = data.points
      .map(p => p.se)
      .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v) && v > 0);
    if (ses.length === 0) return [0, 0.5];
    const maxSe = Math.max(...ses);
    return [0, maxSe * 1.2];
  }, [data]);

  // Prepare funnel CI lines data
  const funnelLines = useMemo(() => {
    if (!data || !data.pooled_effect) return { leftLine: [], rightLine: [] };

    const pooled = data.pooled_effect;
    const maxSe = yDomain[1];
    const z95 = 1.96;

    // Create points for left and right CI lines
    const leftLine = [];
    const rightLine = [];

    for (let se = 0; se <= maxSe; se += maxSe / 50) {
      leftLine.push({ x: pooled - z95 * se, y: se });
      rightLine.push({ x: pooled + z95 * se, y: se });
    }

    return { leftLine, rightLine };
  }, [data, yDomain]);

  // Check for valid data after hooks
  const hasValidData = data && data.points && data.points.length > 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0) {
      const point = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="subtitle2">{point.study_name}</Typography>
          <Typography variant="body2">Effect: {point.x?.toFixed(3)}</Typography>
          <Typography variant="body2">SE: {point.y?.toFixed(3)}</Typography>
        </Paper>
      );
    }
    return null;
  };

  // Interpret bias tests
  const getBiasInterpretation = () => {
    if (!publicationBias) return null;

    const eggers = publicationBias.eggers_test;
    const beggs = publicationBias.beggs_test;

    if (!eggers && !beggs) return null;

    const eggersSignificant = eggers?.significant;
    const beggsSignificant = beggs?.significant;

    if (eggersSignificant && beggsSignificant) {
      return {
        severity: 'error',
        message: 'Both tests suggest publication bias may be present'
      };
    } else if (eggersSignificant || beggsSignificant) {
      return {
        severity: 'warning',
        message: 'One test suggests possible publication bias'
      };
    } else {
      return {
        severity: 'success',
        message: 'No significant evidence of publication bias detected'
      };
    }
  };

  const biasInterpretation = getBiasInterpretation();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Funnel Plot
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Studies should cluster symmetrically around the pooled effect (vertical line).
        Asymmetry may indicate publication bias.
      </Typography>

      {biasInterpretation && (
        <Alert severity={biasInterpretation.severity} sx={{ mb: 2 }}>
          {biasInterpretation.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 30, bottom: 40, left: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={xDomain}
                    name="Effect Size"
                    label={{ value: 'Effect Size', position: 'bottom', offset: 20 }}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v.toFixed(2)}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={yDomain}
                    reversed
                    name="Standard Error"
                    label={{ value: 'Standard Error', angle: -90, position: 'insideLeft', offset: 0 }}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v.toFixed(2)}
                  />

                  {/* Pooled effect vertical line */}
                  {data && data.pooled_effect && (
                    <ReferenceLine
                      x={data.pooled_effect}
                      stroke="#9c27b0"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{ value: 'Pooled', position: 'top', fill: '#9c27b0', fontSize: 11 }}
                    />
                  )}

                  {/* Zero reference line */}
                  <ReferenceLine x={0} stroke="#999" strokeDasharray="3 3" />

                  {/* Left 95% CI boundary */}
                  <Scatter
                    data={funnelLines.leftLine}
                    line={{ stroke: '#2196f3', strokeWidth: 1.5, strokeDasharray: '5 5' }}
                    shape={() => null}
                    legendType="none"
                  />

                  {/* Right 95% CI boundary */}
                  <Scatter
                    data={funnelLines.rightLine}
                    line={{ stroke: '#2196f3', strokeWidth: 1.5, strokeDasharray: '5 5' }}
                    shape={() => null}
                    legendType="none"
                  />

                  {/* Study points */}
                  <Scatter
                    data={scatterData}
                    fill="#1976d2"
                    name="Studies"
                  />

                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">No data available for funnel plot</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Egger's Test */}
          {publicationBias?.eggers_test && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Egger's Regression Test
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Intercept:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {publicationBias.eggers_test.intercept?.toFixed(3)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">t-statistic:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {publicationBias.eggers_test.t_statistic?.toFixed(3)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">p-value:</Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        color: publicationBias.eggers_test.p_value < 0.05 ? 'error.main' : 'inherit'
                      }}
                    >
                      {publicationBias.eggers_test.p_value?.toFixed(4)}
                    </Typography>
                  </Box>
                  <Chip
                    label={publicationBias.eggers_test.significant ? 'Significant' : 'Not Significant'}
                    color={publicationBias.eggers_test.significant ? 'error' : 'success'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Begg's Test */}
          {publicationBias?.beggs_test && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Begg's Rank Correlation
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Kendall's τ:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {publicationBias.beggs_test.tau?.toFixed(3)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">z-statistic:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {publicationBias.beggs_test.z_statistic?.toFixed(3)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">p-value:</Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        color: publicationBias.beggs_test.p_value < 0.05 ? 'error.main' : 'inherit'
                      }}
                    >
                      {publicationBias.beggs_test.p_value?.toFixed(4)}
                    </Typography>
                  </Box>
                  <Chip
                    label={publicationBias.beggs_test.significant ? 'Significant' : 'Not Significant'}
                    color={publicationBias.beggs_test.significant ? 'error' : 'success'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Interpretation */}
          <Card variant="outlined" sx={{ mt: 2, bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Interpretation Guide
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Symmetric funnel → no bias evidence<br />
                • Asymmetric funnel → possible bias<br />
                • Missing lower-left studies → small studies with null results may be unpublished
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FunnelPlot;
