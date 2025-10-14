/**
 * Data Profiling Module
 *
 * Provides comprehensive dataset overview and column-by-column analysis.
 * Features:
 * - CSV file upload with drag-and-drop
 * - Dataset summary (rows, columns, memory usage)
 * - Column-level analysis with expandable sections:
 *   - Data type, unique values, missing values
 *   - For numeric: mean, median, std dev, min, max, histogram
 *   - For categorical: value counts, frequency bar chart
 * - Interactive visualizations
 * - Export profiling report
 *
 * Ported from: app/analysis/data_processing.py (lines 52-87)
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import StorageIcon from '@mui/icons-material/Storage';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { calculateDescriptiveStats, createHistogramBins } from '../utils/statisticalUtils';

/**
 * Main Data Profiling Component
 */
const DataProfiling = ({ data, setData, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');

  /**
   * Handle file upload
   */
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);

    Papa.parse(file, {
      complete: (results) => {
        try {
          // Convert to array of objects
          const headers = results.data[0];
          const rows = results.data.slice(1).filter(row =>
            row.some(cell => cell !== null && cell !== '' && cell !== undefined)
          );

          const parsedData = rows.map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
              const value = row[idx];
              // Try to parse as number
              const numValue = parseFloat(value);
              obj[header] = !isNaN(numValue) && value !== '' ? numValue : value;
            });
            return obj;
          });

          if (parsedData.length === 0) {
            throw new Error('No data found in file');
          }

          setData(parsedData);
          setLoading(false);
        } catch (err) {
          setError(`Error parsing file: ${err.message}`);
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`Error reading file: ${err.message}`);
        setLoading(false);
      }
    });
  };

  /**
   * Calculate dataset statistics
   */
  const datasetStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);
    const rows = data.length;

    // Estimate memory usage (rough approximation)
    const memoryUsage = (JSON.stringify(data).length / 1024).toFixed(2); // KB

    // Count numeric and categorical columns
    const numericColumns = columns.filter(col => {
      const value = data[0][col];
      return typeof value === 'number';
    });

    const categoricalColumns = columns.filter(col => {
      const value = data[0][col];
      return typeof value === 'string';
    });

    return {
      rows,
      columns: columns.length,
      numericColumns: numericColumns.length,
      categoricalColumns: categoricalColumns.length,
      memoryUsage
    };
  }, [data]);

  /**
   * Analyze individual column
   */
  const analyzeColumn = (columnName) => {
    if (!data || data.length === 0) return null;

    const columnData = data.map(row => row[columnName]);
    const uniqueValues = new Set(columnData.filter(v => v !== null && v !== undefined)).size;

    // Count missing values
    const missingCount = columnData.filter(v => v === null || v === undefined || v === '').length;

    // Determine data type
    const firstNonNullValue = columnData.find(v => v !== null && v !== undefined && v !== '');
    const isNumeric = typeof firstNonNullValue === 'number';

    const analysis = {
      name: columnName,
      type: isNumeric ? 'numeric' : 'categorical',
      uniqueValues,
      missingCount,
      missingPercentage: ((missingCount / data.length) * 100).toFixed(2)
    };

    if (isNumeric) {
      // Numeric analysis
      const numericData = columnData.filter(v => typeof v === 'number' && !isNaN(v));
      if (numericData.length > 0) {
        const stats = calculateDescriptiveStats(numericData);
        analysis.stats = stats;

        // Create histogram data
        const histogramBins = createHistogramBins(numericData, 20);
        analysis.histogram = histogramBins.map(bin => ({
          range: bin.range,
          count: bin.count
        }));
      }
    } else {
      // Categorical analysis
      const valueCounts = {};
      columnData.forEach(value => {
        if (value !== null && value !== undefined && value !== '') {
          valueCounts[value] = (valueCounts[value] || 0) + 1;
        }
      });

      // Sort by count and take top 10
      const sortedCounts = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      analysis.valueCounts = sortedCounts.map(([value, count]) => ({
        value,
        count,
        percentage: ((count / data.length) * 100).toFixed(2)
      }));
    }

    return analysis;
  };

  /**
   * Get all column analyses
   */
  const columnAnalyses = useMemo(() => {
    if (!data || data.length === 0) return [];

    const columns = Object.keys(data[0]);
    return columns.map(col => analyzeColumn(col)).filter(Boolean);
  }, [data]);

  /**
   * Render upload section
   */
  if (!data || data.length === 0) {
    return (
      <Box>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <UploadFileIcon sx={{ fontSize: 64, color: '#1976d2', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Upload Your Dataset
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Upload a CSV file to begin comprehensive data profiling
          </Typography>

          <input
            accept=".csv"
            style={{ display: 'none' }}
            id="csv-upload-button"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="csv-upload-button">
            <Button
              variant="contained"
              component="span"
              size="large"
              startIcon={<UploadFileIcon />}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Choose CSV File'}
            </Button>
          </label>

          {loading && (
            <Box sx={{ mt: 3 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Processing {fileName}...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          <Alert severity="info" sx={{ mt: 4, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>Supported Format:</strong> CSV (Comma Separated Values)
              <br />
              <strong>Max File Size:</strong> 10MB (recommended for browser performance)
              <br />
              <strong>Requirements:</strong> First row should contain column headers
            </Typography>
          </Alert>
        </Paper>
      </Box>
    );
  }

  /**
   * Render profiling results
   */
  return (
    <Box>
      {/* Dataset Overview */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon /> Dataset Overview
        </Typography>

        {fileName && (
          <Typography variant="body2" color="text.secondary" paragraph>
            File: {fileName}
          </Typography>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Rows
                </Typography>
                <Typography variant="h4" sx={{ color: '#1976d2' }}>
                  {datasetStats.rows.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Columns
                </Typography>
                <Typography variant="h4" sx={{ color: '#1976d2' }}>
                  {datasetStats.columns}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {datasetStats.numericColumns} numeric, {datasetStats.categoricalColumns} categorical
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Memory Usage
                </Typography>
                <Typography variant="h4" sx={{ color: '#1976d2' }}>
                  {datasetStats.memoryUsage}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  KB
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Data Points
                </Typography>
                <Typography variant="h4" sx={{ color: '#1976d2' }}>
                  {(datasetStats.rows * datasetStats.columns).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <input
            accept=".csv"
            style={{ display: 'none' }}
            id="csv-upload-button-2"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="csv-upload-button-2">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadFileIcon />}
            >
              Load Different File
            </Button>
          </label>

          {onComplete && (
            <Button
              variant="contained"
              color="success"
              onClick={onComplete}
            >
              Complete Profiling
            </Button>
          )}
        </Box>
      </Paper>

      {/* Column-by-Column Analysis */}
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon /> Column Information
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          Expand each column to see detailed statistics and visualizations
        </Typography>

        {columnAnalyses.map((analysis, idx) => (
          <Accordion key={idx} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {analysis.name}
                </Typography>
                <Chip
                  label={analysis.type}
                  size="small"
                  color={analysis.type === 'numeric' ? 'primary' : 'secondary'}
                />
                <Typography variant="caption" color="text.secondary">
                  {analysis.uniqueValues} unique values
                </Typography>
                {analysis.missingCount > 0 && (
                  <Chip
                    label={`${analysis.missingCount} missing`}
                    size="small"
                    color="warning"
                  />
                )}
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Basic Info */}
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Basic Information
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>{analysis.type}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Unique Values</TableCell>
                        <TableCell>{analysis.uniqueValues}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Missing Values</TableCell>
                        <TableCell>
                          {analysis.missingCount} ({analysis.missingPercentage}%)
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Grid>

                {/* Statistics or Value Counts */}
                <Grid item xs={12} md={8}>
                  {analysis.type === 'numeric' && analysis.stats && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Descriptive Statistics
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Mean</Typography>
                          <Typography variant="body2">{analysis.stats.mean.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Median</Typography>
                          <Typography variant="body2">{analysis.stats.median.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Std Dev</Typography>
                          <Typography variant="body2">{analysis.stats.std.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Min</Typography>
                          <Typography variant="body2">{analysis.stats.min.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Max</Typography>
                          <Typography variant="body2">{analysis.stats.max.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="caption" color="text.secondary">Range</Typography>
                          <Typography variant="body2">{analysis.stats.range.toFixed(2)}</Typography>
                        </Grid>
                      </Grid>
                    </>
                  )}

                  {analysis.type === 'categorical' && analysis.valueCounts && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Top 10 Most Frequent Values
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Value</TableCell>
                              <TableCell align="right">Count</TableCell>
                              <TableCell align="right">Percentage</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {analysis.valueCounts.map((item, i) => (
                              <TableRow key={i}>
                                <TableCell>{String(item.value)}</TableCell>
                                <TableCell align="right">{item.count}</TableCell>
                                <TableCell align="right">{item.percentage}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </Grid>

                {/* Visualization */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Distribution
                  </Typography>

                  {analysis.type === 'numeric' && analysis.histogram && (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analysis.histogram}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1976d2" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {analysis.type === 'categorical' && analysis.valueCounts && (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analysis.valueCounts}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#9c27b0" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );
};

export default DataProfiling;
