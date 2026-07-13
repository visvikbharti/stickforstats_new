/**
 * Heterogeneity Panel Component
 *
 * Displays heterogeneity statistics and subgroup analysis results.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import { formatPValue, formatNumber } from '../../utils/formatStats';

/**
 * `null < 0.05` is true in JavaScript -- null coerces to 0. So a subgroup whose p-value the
 * backend reported as null was rendered as "< 0.001" in green: the most significant thing on
 * the page, from a number that does not exist.
 */
const isSignificant = (p) => Number.isFinite(p) && p < 0.05;

const HeterogeneityPanel = ({ heterogeneity, subgroupAnalysis }) => {
  // Get I² interpretation
  const getI2Interpretation = (i2) => {
    if (i2 < 25) return { label: 'Low', color: 'success' };
    if (i2 < 50) return { label: 'Moderate', color: 'info' };
    if (i2 < 75) return { label: 'Substantial', color: 'warning' };
    return { label: 'Considerable', color: 'error' };
  };

  const i2Interp = heterogeneity ? getI2Interpretation(heterogeneity.i_squared) : { label: 'N/A', color: 'default' };

  // Early return if no data (after any potential hooks)
  if (!heterogeneity) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No heterogeneity data available</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Heterogeneity Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Measures of variability between study effects
      </Typography>

      <Grid container spacing={3}>
        {/* Main Heterogeneity Stats */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                I² (Inconsistency Index)
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {formatNumber(heterogeneity.i_squared, 1)}%
                </Typography>
                <Chip
                  label={i2Interp.label}
                  color={i2Interp.color}
                  size="small"
                />
              </Box>

              <LinearProgress
                variant="determinate"
                value={Math.min(heterogeneity.i_squared, 100)}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  mb: 2,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
                  '& .MuiLinearProgress-bar': {
                    bgcolor: i2Interp.color === 'success' ? '#4caf50' :
                             i2Interp.color === 'info' ? '#2196f3' :
                             i2Interp.color === 'warning' ? '#ff9800' : '#f44336'
                  }
                }}
              />

              <Typography variant="body2" color="text.secondary">
                Percentage of variability due to heterogeneity rather than sampling error.
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Chip label="0-25% Low" size="small" variant="outlined" color="success" />
                <Chip label="25-50% Moderate" size="small" variant="outlined" color="info" />
                <Chip label="50-75% Substantial" size="small" variant="outlined" color="warning" />
                <Chip label=">75% Considerable" size="small" variant="outlined" color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Other Stats */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Additional Statistics
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Q Statistic</Typography>
                  <Typography variant="h6">{formatNumber(heterogeneity.q, 2)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    df = {heterogeneity.q_df}, p = {formatPValue(heterogeneity.q_p)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">τ² (Tau-squared)</Typography>
                  <Typography variant="h6">{formatNumber(heterogeneity.tau_squared, 4)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Between-study variance
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">τ (Tau)</Typography>
                  <Typography variant="h6">{formatNumber(heterogeneity.tau, 4)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Standard deviation
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">H² (H-squared)</Typography>
                  <Typography variant="h6">{formatNumber(heterogeneity.h_squared, 2)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Relative excess variability
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Q-test Interpretation */}
        <Grid item xs={12}>
          <Alert
            severity={isSignificant(heterogeneity.q_p) ? 'warning' : 'success'}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              <strong>Cochran's Q Test:</strong>{' '}
              {isSignificant(heterogeneity.q_p)
                ? 'Significant heterogeneity detected (p < 0.05). Studies may not share a common effect size.'
                : 'No significant heterogeneity detected (p ≥ 0.05). However, Q test has low power with few studies.'}
            </Typography>
          </Alert>
        </Grid>

        {/* Subgroup Analysis */}
        {subgroupAnalysis && subgroupAnalysis.subgroups && Object.keys(subgroupAnalysis.subgroups).length > 1 && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Subgroup Analysis
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100] }}>
                        <TableCell>Subgroup</TableCell>
                        <TableCell align="right">k</TableCell>
                        <TableCell align="right">Effect</TableCell>
                        <TableCell align="right">95% CI</TableCell>
                        <TableCell align="right">p</TableCell>
                        <TableCell align="right">I²</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(subgroupAnalysis.subgroups).map(([name, data]) => (
                        <TableRow key={name} hover>
                          <TableCell>{name}</TableCell>
                          <TableCell align="right">{data.k}</TableCell>
                          <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                            {formatNumber(data.pooled_effect, 3)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                            [{formatNumber(data.ci_lower, 3)}, {formatNumber(data.ci_upper, 3)}]
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontFamily: 'monospace',
                              color: isSignificant(data.p_value) ? 'success.main' : 'text.secondary'
                            }}
                          >
                            {formatPValue(data.p_value)}
                          </TableCell>
                          <TableCell align="right">
                            {formatNumber(data.i_squared, 1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Between-group heterogeneity (Q<sub>between</sub>)
                    </Typography>
                    <Typography variant="body1">
                      Q = {formatNumber(subgroupAnalysis.q_between, 2)}, df = {subgroupAnalysis.df_between},
                      p = {formatPValue(subgroupAnalysis.p_between)}
                    </Typography>
                  </Box>
                  <Chip
                    label={subgroupAnalysis.significant_difference
                      ? 'Subgroups differ significantly'
                      : 'No significant difference'}
                    color={subgroupAnalysis.significant_difference ? 'warning' : 'default'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default HeterogeneityPanel;
