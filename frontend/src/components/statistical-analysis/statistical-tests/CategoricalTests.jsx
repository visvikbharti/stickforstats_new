/**
 * Categorical Tests Component
 *
 * Test relationships between categorical variables:
 * - Chi-square Test of Independence
 * - Cramer's V (effect size)
 * - Contingency Table visualization
 * - Expected vs Observed frequencies
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
  TableRow
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import GridOnIcon from '@mui/icons-material/GridOn';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { chiSquareTest } from '../utils/statisticalUtils';

/**
 * Main Categorical Tests Component
 */
const CategoricalTests = ({ data }) => {
  const [variable1, setVariable1] = useState('');
  const [variable2, setVariable2] = useState('');
  const [alpha, setAlpha] = useState(0.05);

  /**
   * Detect categorical columns
   */
  const categoricalColumns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const columns = [];
    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueCount = new Set(values).size;

      // Consider categorical if unique values < 20
      if (uniqueCount > 1 && uniqueCount < 20) {
        columns.push(key);
      }
    });

    return columns;
  }, [data]);

  /**
   * Build contingency table
   */
  const contingencyTable = useMemo(() => {
    if (!variable1 || !variable2 || !data) return null;

    const table = {};
    const rowTotals = {};
    const colTotals = {};
    let grandTotal = 0;

    // Get unique categories
    const categories1 = [...new Set(data.map(row => String(row[variable1] || 'Missing')))].sort();
    const categories2 = [...new Set(data.map(row => String(row[variable2] || 'Missing')))].sort();

    // Initialize table
    categories1.forEach(cat1 => {
      table[cat1] = {};
      rowTotals[cat1] = 0;
      categories2.forEach(cat2 => {
        table[cat1][cat2] = 0;
        if (!colTotals[cat2]) colTotals[cat2] = 0;
      });
    });

    // Count observations
    data.forEach(row => {
      const val1 = String(row[variable1] || 'Missing');
      const val2 = String(row[variable2] || 'Missing');

      if (table[val1] && table[val1][val2] !== undefined) {
        table[val1][val2]++;
        rowTotals[val1]++;
        colTotals[val2]++;
        grandTotal++;
      }
    });

    return {
      table,
      rowTotals,
      colTotals,
      grandTotal,
      categories1,
      categories2
    };
  }, [data, variable1, variable2]);

  /**
   * Calculate expected frequencies and chi-square
   */
  const chiSquareResult = useMemo(() => {
    if (!contingencyTable) return null;

    const { table, rowTotals, colTotals, grandTotal, categories1, categories2 } = contingencyTable;

    // Calculate expected frequencies and chi-square
    let chiSquare = 0;
    const expected = {};
    const residuals = {};

    categories1.forEach(cat1 => {
      expected[cat1] = {};
      residuals[cat1] = {};

      categories2.forEach(cat2 => {
        const exp = (rowTotals[cat1] * colTotals[cat2]) / grandTotal;
        expected[cat1][cat2] = exp;

        const obs = table[cat1][cat2];
        const residual = (obs - exp) / Math.sqrt(exp);
        residuals[cat1][cat2] = residual;

        // Chi-square contribution
        chiSquare += Math.pow(obs - exp, 2) / exp;
      });
    });

    // Degrees of freedom
    const df = (categories1.length - 1) * (categories2.length - 1);

    // Approximate p-value using chi-square distribution
    // This is a simplified approximation
    const pValue = chiSquareCDF(chiSquare, df);

    // Cramer's V (effect size)
    const minDim = Math.min(categories1.length - 1, categories2.length - 1);
    const cramersV = Math.sqrt(chiSquare / (grandTotal * minDim));

    return {
      chiSquare,
      df,
      pValue,
      significant: pValue < alpha,
      expected,
      residuals,
      cramersV
    };
  }, [contingencyTable, alpha]);

  /**
   * Chi-square CDF approximation
   */
  const chiSquareCDF = (x, df) => {
    // Using Normal approximation for large df
    if (df > 30) {
      const z = (Math.sqrt(2 * x) - Math.sqrt(2 * df - 1));
      return 1 - normalCDF(z);
    }

    // Simplified approximation for smaller df
    const k = df / 2;
    const lambda = x / 2;

    let sum = 0;
    let term = Math.exp(-lambda);
    sum += term;

    for (let i = 1; i < 50; i++) {
      term *= lambda / i;
      if (i >= k) {
        sum += term;
      }
      if (term < 1e-10) break;
    }

    return 1 - sum;
  };

  /**
   * Normal CDF approximation
   */
  const normalCDF = (z) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };

  /**
   * Get effect size interpretation
   */
  const getEffectSize = (v) => {
    if (v < 0.1) return 'Negligible';
    if (v < 0.3) return 'Small';
    if (v < 0.5) return 'Medium';
    return 'Large';
  };

  /**
   * Get color for residual heatmap
   */
  const getResidualColor = (residual) => {
    // Residuals: positive = more than expected (blue), negative = less than expected (red)
    const abs = Math.abs(residual);
    if (residual > 0) {
      const intensity = Math.floor(255 - Math.min(abs * 50, 200));
      return `rgb(${intensity}, ${intensity}, 255)`;
    } else {
      const intensity = Math.floor(255 - Math.min(abs * 50, 200));
      return `rgb(255, ${intensity}, ${intensity})`;
    }
  };

  /**
   * Prepare visualization data
   */
  const vizData = useMemo(() => {
    if (!contingencyTable) return [];

    const { table, categories1, categories2 } = contingencyTable;
    const result = [];

    categories1.forEach(cat1 => {
      const dataPoint = { category: cat1 };
      categories2.forEach(cat2 => {
        dataPoint[cat2] = table[cat1][cat2];
      });
      result.push(dataPoint);
    });

    return result;
  }, [contingencyTable]);

  /**
   * Color palette for bars
   */
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#d084d0', '#a4de6c'];

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

  if (categoricalColumns.length < 2) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Categorical tests require at least 2 categorical columns. Found: {categoricalColumns.length}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Categorical columns are those with fewer than 20 unique values.
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
          <GridOnIcon /> Categorical Tests Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Variable 1 (Rows)</InputLabel>
              <Select
                value={variable1}
                label="Variable 1 (Rows)"
                onChange={(e) => setVariable1(e.target.value)}
              >
                <MenuItem value=""><em>Select variable...</em></MenuItem>
                {categoricalColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Variable 2 (Columns)</InputLabel>
              <Select
                value={variable2}
                label="Variable 2 (Columns)"
                onChange={(e) => setVariable2(e.target.value)}
              >
                <MenuItem value=""><em>Select variable...</em></MenuItem>
                {categoricalColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
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
            <strong>Chi-square Test:</strong> Tests whether two categorical variables are independent.
            H₀: Variables are independent vs H₁: Variables are associated.
          </Typography>
        </Alert>
      </Paper>

      {/* Results */}
      {contingencyTable && chiSquareResult && (
        <>
          {/* Test Statistics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">χ² Statistic</Typography>
                  <Typography variant="h6">{chiSquareResult.chiSquare.toFixed(4)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Degrees of Freedom</Typography>
                  <Typography variant="h6">{chiSquareResult.df}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">p-value</Typography>
                  <Typography variant="h6">{chiSquareResult.pValue.toFixed(4)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {chiSquareResult.significant ? 'Significant' : 'Not Significant'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Cramer's V</Typography>
                  <Typography variant="h6">{chiSquareResult.cramersV.toFixed(4)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getEffectSize(chiSquareResult.cramersV)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Chi-Square Test Results */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Chi-square Test of Independence
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              H₀: {variable1} and {variable2} are independent
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
                    <TableCell>Chi-square (χ²)</TableCell>
                    <TableCell align="right">{chiSquareResult.chiSquare.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Degrees of Freedom</TableCell>
                    <TableCell align="right">{chiSquareResult.df}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>p-value</TableCell>
                    <TableCell align="right">{chiSquareResult.pValue.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cramer's V (Effect Size)</TableCell>
                    <TableCell align="right">{chiSquareResult.cramersV.toFixed(4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Result (α = {alpha})</strong></TableCell>
                    <TableCell align="right">
                      {chiSquareResult.significant ? (
                        <Chip icon={<CancelOutlinedIcon />} label="Reject H₀" color="error" size="small" />
                      ) : (
                        <Chip icon={<CheckCircleOutlineIcon />} label="Fail to Reject H₀" color="success" size="small" />
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
              <Alert severity={chiSquareResult.significant ? "warning" : "info"}>
                <Typography variant="body2">
                  {chiSquareResult.significant ? (
                    <>
                      There is a <strong>significant association</strong> between {variable1} and {variable2}
                      (χ² = {chiSquareResult.chiSquare.toFixed(2)}, df = {chiSquareResult.df}, p = {chiSquareResult.pValue.toFixed(4)} {'<'} {alpha}).
                      Effect size is <strong>{getEffectSize(chiSquareResult.cramersV).toLowerCase()}</strong> (V = {chiSquareResult.cramersV.toFixed(3)}).
                    </>
                  ) : (
                    <>
                      There is <strong>no significant association</strong> between {variable1} and {variable2}
                      (χ² = {chiSquareResult.chiSquare.toFixed(2)}, df = {chiSquareResult.df}, p = {chiSquareResult.pValue.toFixed(4)} {'>='} {alpha}).
                      The variables appear to be independent.
                    </>
                  )}
                </Typography>
              </Alert>
            </Box>
          </Paper>

          {/* Contingency Table - Observed Frequencies */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contingency Table: Observed Frequencies
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>
                      {variable1} \ {variable2}
                    </th>
                    {contingencyTable.categories2.map((cat) => (
                      <th key={cat} style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                        {cat}
                      </th>
                    ))}
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contingencyTable.categories1.map((row, rowIndex) => (
                    <tr key={row}>
                      <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: rowIndex % 2 === 0 ? 'white' : '#fafafa' }}>
                        {row}
                      </td>
                      {contingencyTable.categories2.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            backgroundColor: rowIndex % 2 === 0 ? 'white' : '#fafafa'
                          }}
                        >
                          {contingencyTable.table[row][col]}
                        </td>
                      ))}
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: rowIndex % 2 === 0 ? '#f5f5f5' : '#e0e0e0' }}>
                        {contingencyTable.rowTotals[row]}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      Total
                    </td>
                    {contingencyTable.categories2.map((col) => (
                      <td key={col} style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>
                        {contingencyTable.colTotals[col]}
                      </td>
                    ))}
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#d0d0d0' }}>
                      {contingencyTable.grandTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>
          </Paper>

          {/* Expected Frequencies */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Expected Frequencies (Under Independence)
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>
                      {variable1} \ {variable2}
                    </th>
                    {contingencyTable.categories2.map((cat) => (
                      <th key={cat} style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contingencyTable.categories1.map((row, rowIndex) => (
                    <tr key={row}>
                      <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: rowIndex % 2 === 0 ? 'white' : '#fafafa' }}>
                        {row}
                      </td>
                      {contingencyTable.categories2.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            backgroundColor: rowIndex % 2 === 0 ? 'white' : '#fafafa'
                          }}
                        >
                          {chiSquareResult.expected[row][col].toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>

          {/* Standardized Residuals Heatmap */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Standardized Residuals
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              Blue = More than expected, Red = Less than expected, |residual| {'>'}  2 indicates significant deviation
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>
                      {variable1} \ {variable2}
                    </th>
                    {contingencyTable.categories2.map((cat) => (
                      <th key={cat} style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contingencyTable.categories1.map((row, rowIndex) => (
                    <tr key={row}>
                      <td style={{ padding: '8px', fontWeight: 'bold', backgroundColor: rowIndex % 2 === 0 ? 'white' : '#fafafa' }}>
                        {row}
                      </td>
                      {contingencyTable.categories2.map((col) => {
                        const residual = chiSquareResult.residuals[row][col];
                        const isSignificant = Math.abs(residual) > 2;
                        return (
                          <td
                            key={col}
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              border: '1px solid #ddd',
                              backgroundColor: getResidualColor(residual),
                              fontWeight: isSignificant ? 'bold' : 'normal'
                            }}
                          >
                            {residual.toFixed(2)}
                            {isSignificant && ' *'}
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
                  <Typography variant="caption">Much more than expected</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(240, 240, 240)', border: '1px solid #ccc' }} />
                  <Typography variant="caption">As expected</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 20, height: 20, bgcolor: 'rgb(255, 55, 55)', border: '1px solid #ccc' }} />
                  <Typography variant="caption">Much less than expected</Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  * = |residual| {'>'} 2 (significant cell)
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Visualization */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Grouped Bar Chart: {variable1} by {variable2}
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={vizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" label={{ value: variable1, position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  {contingencyTable.categories2.map((cat, index) => (
                    <Bar key={cat} dataKey={cat} fill={COLORS[index % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </>
      )}

      {/* Selection prompts */}
      {(!variable1 || !variable2) && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select <strong>two categorical variables</strong> to perform chi-square test.
          </Typography>
        </Alert>
      )}

      {variable1 && variable2 && variable1 === variable2 && (
        <Alert severity="warning">
          <Typography variant="body2">
            Please select <strong>two different variables</strong>. Chi-square test requires two distinct categorical variables.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default CategoricalTests;
