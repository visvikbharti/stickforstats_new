/**
 * Correlation Tests Component
 *
 * Measure relationships between variables:
 * - Pearson r (linear correlation)
 * - Spearman ρ (rank correlation)
 * - Correlation Matrix with significance testing
 * - Scatter plot visualizations
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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { pearsonCorrelation, spearmanCorrelation } from '../utils/statisticalUtils';

/**
 * Main Correlation Tests Component
 */
const CorrelationTests = ({ data }) => {
  const [analysisMode, setAnalysisMode] = useState('pairwise');
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [correlationType, setCorrelationType] = useState('pearson');
  const [alpha, setAlpha] = useState(0.05);

  /**
   * Detect numeric columns
   */
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const columns = [];
    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      if (numericCount / values.length > 0.8) {
        columns.push(key);
      }
    });

    return columns;
  }, [data]);

  /**
   * Get pairwise data
   */
  const pairwiseData = useMemo(() => {
    if (!xColumn || !yColumn || !data) return [];

    return data
      .map(row => ({
        x: parseFloat(row[xColumn]),
        y: parseFloat(row[yColumn])
      }))
      .filter(point => !isNaN(point.x) && !isNaN(point.y));
  }, [data, xColumn, yColumn]);

  /**
   * Calculate pairwise correlation
   */
  const pairwiseCorrelation = useMemo(() => {
    if (pairwiseData.length < 3) return null;

    const xValues = pairwiseData.map(d => d.x);
    const yValues = pairwiseData.map(d => d.y);

    if (correlationType === 'pearson') {
      return pearsonCorrelation(xValues, yValues);
    } else {
      return spearmanCorrelation(xValues, yValues);
    }
  }, [pairwiseData, correlationType]);

  /**
   * Calculate correlation matrix
   */
  const correlationMatrix = useMemo(() => {
    if (analysisMode !== 'matrix' || numericColumns.length < 2) return null;

    const matrix = {};
    const pValues = {};

    numericColumns.forEach(col1 => {
      matrix[col1] = {};
      pValues[col1] = {};

      const values1 = data
        .map(row => parseFloat(row[col1]))
        .filter(v => !isNaN(v));

      numericColumns.forEach(col2 => {
        const values2 = data
          .map(row => parseFloat(row[col2]))
          .filter(v => !isNaN(v));

        // Ensure same length for comparison
        const minLength = Math.min(values1.length, values2.length);
        const v1 = values1.slice(0, minLength);
        const v2 = values2.slice(0, minLength);

        if (v1.length < 3) {
          matrix[col1][col2] = null;
          pValues[col1][col2] = null;
          return;
        }

        if (col1 === col2) {
          matrix[col1][col2] = 1.0;
          pValues[col1][col2] = 0;
        } else {
          const result = correlationType === 'pearson'
            ? pearsonCorrelation(v1, v2)
            : spearmanCorrelation(v1, v2);

          matrix[col1][col2] = result.coefficient;
          pValues[col1][col2] = result.pValue;
        }
      });
    });

    return { matrix, pValues };
  }, [data, numericColumns, analysisMode, correlationType]);

  /**
   * Get correlation strength label
   */
  const getCorrelationStrength = (r) => {
    const absR = Math.abs(r);
    if (absR >= 0.7) return 'Strong';
    if (absR >= 0.4) return 'Moderate';
    if (absR >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  /**
   * Get correlation direction
   */
  const getCorrelationDirection = (r) => {
    if (r > 0) return 'Positive';
    if (r < 0) return 'Negative';
    return 'None';
  };

  /**
   * Get color for correlation heatmap
   */
  const getCorrelationColor = (r) => {
    if (r === null || isNaN(r)) return '#f0f0f0';

    const absR = Math.abs(r);
    if (r > 0) {
      // Positive correlation: white to blue
      const intensity = Math.floor(255 - absR * 200);
      return `rgb(${intensity}, ${intensity}, 255)`;
    } else {
      // Negative correlation: white to red
      const intensity = Math.floor(255 - absR * 200);
      return `rgb(255, ${intensity}, ${intensity})`;
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

  if (numericColumns.length < 2) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Correlation analysis requires at least 2 numeric columns. Found: {numericColumns.length}
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
          <ScatterPlotIcon /> Correlation Tests Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Analysis Mode */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Analysis Mode:
            </Typography>
            <ToggleButtonGroup
              value={analysisMode}
              exclusive
              onChange={(e, newValue) => newValue && setAnalysisMode(newValue)}
              fullWidth
            >
              <ToggleButton value="pairwise">Pairwise Correlation</ToggleButton>
              <ToggleButton value="matrix">Correlation Matrix</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Correlation Type */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Correlation Type</InputLabel>
              <Select
                value={correlationType}
                label="Correlation Type"
                onChange={(e) => setCorrelationType(e.target.value)}
              >
                <MenuItem value="pearson">Pearson r (Linear)</MenuItem>
                <MenuItem value="spearman">Spearman ρ (Rank/Monotonic)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Significance Level */}
          <Grid item xs={12} md={6}>
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

          {/* Pairwise Mode: X and Y columns */}
          {analysisMode === 'pairwise' && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>X Variable</InputLabel>
                  <Select
                    value={xColumn}
                    label="X Variable"
                    onChange={(e) => setXColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select column...</em></MenuItem>
                    {numericColumns.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Y Variable</InputLabel>
                  <Select
                    value={yColumn}
                    label="Y Variable"
                    onChange={(e) => setYColumn(e.target.value)}
                  >
                    <MenuItem value=""><em>Select column...</em></MenuItem>
                    {numericColumns.map((col) => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>

        {/* Correlation Type Info */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {correlationType === 'pearson' ? (
              <>
                <strong>Pearson r:</strong> Measures linear correlation between -1 and +1.
                Assumes both variables are normally distributed. Use for linear relationships.
              </>
            ) : (
              <>
                <strong>Spearman ρ:</strong> Measures monotonic correlation using ranks.
                Does not assume normality. Use for non-linear but monotonic relationships.
              </>
            )}
          </Typography>
        </Alert>
      </Paper>

      {/* Pairwise Correlation Results */}
      {analysisMode === 'pairwise' && pairwiseCorrelation && xColumn && yColumn && (
        <>
          {/* Correlation Statistics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {correlationType === 'pearson' ? 'Pearson r' : 'Spearman ρ'}
                  </Typography>
                  <Typography variant="h6">{pairwiseCorrelation.coefficient.toFixed(4)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getCorrelationDirection(pairwiseCorrelation.coefficient)} {getCorrelationStrength(pairwiseCorrelation.coefficient)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">p-value</Typography>
                  <Typography variant="h6">{pairwiseCorrelation.pValue.toFixed(4)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pairwiseCorrelation.significant ? 'Significant' : 'Not Significant'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Sample Size</Typography>
                  <Typography variant="h6">{pairwiseCorrelation.n}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">R² (Explained Variance)</Typography>
                  <Typography variant="h6">{(pairwiseCorrelation.coefficient ** 2).toFixed(4)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {((pairwiseCorrelation.coefficient ** 2) * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Results */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Correlation Test Results
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: No correlation (ρ = 0) vs H₁: Correlation exists (ρ ≠ 0)
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Statistic</strong></TableCell>
                    <TableCell align="right"><strong>Value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Correlation Coefficient ({correlationType === 'pearson' ? 'r' : 'ρ'})</TableCell>
                    <TableCell align="right">{pairwiseCorrelation.coefficient.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Sample Size (n)</TableCell>
                    <TableCell align="right">{pairwiseCorrelation.n}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{pairwiseCorrelation.pValue.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Coefficient of Determination (R²)</TableCell>
                    <TableCell align="right">{(pairwiseCorrelation.coefficient ** 2).toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {pairwiseCorrelation.significant ? (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Significant" color="success" size="small" />
                      ) : (
                        <Chip icon={<CancelOutlinedIcon />} label="Not Significant" color="error" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Interpretation:
              </Typography>
              <Alert severity={pairwiseCorrelation.significant ? "success" : "info"}>
                <Typography variant="body2">
                  {pairwiseCorrelation.significant ? (
                    <>
                      There is a <strong>{getCorrelationStrength(pairwiseCorrelation.coefficient).toLowerCase()}</strong>{' '}
                      <strong>{getCorrelationDirection(pairwiseCorrelation.coefficient).toLowerCase()}</strong> correlation
                      between {xColumn} and {yColumn} (r = {pairwiseCorrelation.coefficient.toFixed(3)}, p = {pairwiseCorrelation.pValue.toFixed(4)} {'<'} {alpha}).
                      The correlation explains {((pairwiseCorrelation.coefficient ** 2) * 100).toFixed(1)}% of the variance (R²).
                    </>
                  ) : (
                    <>
                      There is no significant correlation between {xColumn} and {yColumn} (r = {pairwiseCorrelation.coefficient.toFixed(3)}, p = {pairwiseCorrelation.pValue.toFixed(4)} {'>='} {alpha}).
                    </>
                  )}
                </Typography>
              </Alert>
            </Box>
          </Paper>

          {/* Scatter Plot */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Scatter Plot: {xColumn} vs {yColumn}
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              r = {pairwiseCorrelation.coefficient.toFixed(3)}, R² = {(pairwiseCorrelation.coefficient ** 2).toFixed(3)}
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={xColumn}
                    label={{ value: xColumn, position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={yColumn}
                    label={{ value: yColumn, angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={pairwiseData} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {/* Correlation Matrix Results */}
      {analysisMode === 'matrix' && correlationMatrix && (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Correlation Matrix ({correlationType === 'pearson' ? 'Pearson r' : 'Spearman ρ'})
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              Blue = Positive correlation, Red = Negative correlation, * = p {'<'} {alpha}
            </Typography>

            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd', position: 'sticky', left: 0, backgroundColor: '#f5f5f5' }}>
                      Variable
                    </th>
                    {numericColumns.map((col) => (
                      <th key={col} style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd', minWidth: '80px' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {numericColumns.map((row, rowIndex) => (
                    <tr key={row}>
                      <td style={{
                        padding: '8px',
                        fontWeight: 'bold',
                        borderRight: '2px solid #ddd',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: rowIndex % 2 === 0 ? 'white' : '#fafafa',
                        zIndex: 1
                      }}>
                        {row}
                      </td>
                      {numericColumns.map((col) => {
                        const r = correlationMatrix.matrix[row][col];
                        const p = correlationMatrix.pValues[row][col];
                        const isSignificant = p !== null && p < alpha;

                        return (
                          <td
                            key={col}
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              backgroundColor: getCorrelationColor(r),
                              border: '1px solid #ddd',
                              fontWeight: row === col ? 'bold' : 'normal'
                            }}
                          >
                            {r !== null ? (
                              <>
                                {r.toFixed(3)}
                                {isSignificant && ' *'}
                              </>
                            ) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Legend:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(55, 55, 255)', border: '1px solid #ccc' }} />
                  <Typography variant="caption">Strong Positive</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(155, 155, 255)', border: '1px solid #ccc' }} />
                  <Typography variant="caption">Weak Positive</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(240, 240, 240)', border: '1px solid #ccc' }} />
                  <Typography variant="caption">No Correlation</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(255, 155, 155)', border: '1px solid #ccc' }} />
                  <Typography variant="caption">Weak Negative</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(255, 55, 55)', border: '1px solid #ccc' }} />
                  <Typography variant="caption">Strong Negative</Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  * = Significant at α = {alpha}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Top Correlations */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Strongest Correlations
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              Top 10 strongest correlations (excluding diagonal)
            </Typography>

            {(() => {
              const correlations = [];
              numericColumns.forEach((row, i) => {
                numericColumns.forEach((col, j) => {
                  if (i < j) { // Only upper triangle to avoid duplicates
                    const r = correlationMatrix.matrix[row][col];
                    const p = correlationMatrix.pValues[row][col];
                    if (r !== null) {
                      correlations.push({
                        var1: row,
                        var2: col,
                        r: r,
                        pValue: p,
                        significant: p < alpha
                      });
                    }
                  }
                });
              });

              correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
              const top10 = correlations.slice(0, 10);

              return (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Variable 1</strong></TableCell>
                        <TableCell><strong>Variable 2</strong></TableCell>
                        <TableCell align="right"><strong>Correlation</strong></TableCell>
                        <TableCell align="right"><strong>p-value</strong></TableCell>
                        <TableCell align="center"><strong>Significant</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {top10.map((corr, index) => (
                        <TableRow key={index}>
                          <TableCell>{corr.var1}</TableCell>
                          <TableCell>{corr.var2}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={corr.r.toFixed(3)}
                              size="small"
                              sx={{
                                bgcolor: corr.r > 0 ? '#e3f2fd' : '#ffebee',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">{corr.pValue.toFixed(4)}</TableCell>
                          <TableCell align="center">
                            {corr.significant ? (
                              <Chip icon={<CheckCircleOutlineIcon />} label="Yes" color="success" size="small" />
                            ) : (
                              <Chip label="No" size="small" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              );
            })()}
          </Paper>
        </>
      )}

      {/* Selection prompts */}
      {analysisMode === 'pairwise' && (!xColumn || !yColumn) && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select <strong>X and Y variables</strong> to calculate correlation.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default CorrelationTests;
