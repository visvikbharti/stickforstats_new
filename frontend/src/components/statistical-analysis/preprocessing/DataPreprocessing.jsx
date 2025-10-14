/**
 * Data Preprocessing Module
 *
 * Comprehensive data cleaning and preparation interface.
 * Features:
 * - Tab 1: Missing Values (Drop, Fill with Mean/Median/Mode)
 * - Tab 2: Feature Scaling (Standard, Min-Max)
 * - Tab 3: Categorical Encoding (One-Hot, Label)
 * - Before/After comparison view
 * - Export processed data as CSV
 *
 * Ported from: app/analysis/data_processing.py (lines 16-166)
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import {
  handleMissingValues,
  scaleFeatures,
  encodeCategorical,
  getPreprocessingSummary,
  exportToCSV,
  detectColumnTypes
} from '../utils/dataProcessingUtils';

/**
 * Main Data Preprocessing Component
 */
const DataPreprocessing = ({ data, setData, onComplete }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [missingValueStrategy, setMissingValueStrategy] = useState('none');
  const [scalingMethod, setScalingMethod] = useState('none');
  const [encodingMethod, setEncodingMethod] = useState('none');
  const [showComparison, setShowComparison] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /**
   * Apply all preprocessing steps
   */
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return null;

    let processed = [...data];

    // Step 1: Handle missing values
    processed = handleMissingValues(processed, missingValueStrategy);

    // Step 2: Scale features
    processed = scaleFeatures(processed, scalingMethod);

    // Step 3: Encode categorical variables
    processed = encodeCategorical(processed, encodingMethod);

    return processed;
  }, [data, missingValueStrategy, scalingMethod, encodingMethod]);

  /**
   * Get preprocessing summary
   */
  const summary = useMemo(() => {
    if (!data || !processedData) return null;
    return getPreprocessingSummary(data, processedData);
  }, [data, processedData]);

  /**
   * Detect column types
   */
  const columnTypes = useMemo(() => {
    if (!data) return {};
    return detectColumnTypes(data);
  }, [data]);

  /**
   * Count missing values in original data
   */
  const missingValueCounts = useMemo(() => {
    if (!data || data.length === 0) return {};

    const columns = Object.keys(data[0]);
    const counts = {};

    columns.forEach(col => {
      const missingCount = data.filter(row => {
        const val = row[col];
        return val === null || val === undefined || val === '';
      }).length;
      counts[col] = missingCount;
    });

    return counts;
  }, [data]);

  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  /**
   * Handle table page change
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Handle rows per page change
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Download processed data
   */
  const handleDownload = () => {
    if (!processedData) return;

    const csv = exportToCSV(processedData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  /**
   * Apply preprocessing
   */
  const handleApply = () => {
    if (processedData && setData) {
      setData(processedData);
      setMissingValueStrategy('none');
      setScalingMethod('none');
      setEncodingMethod('none');
      alert('Preprocessing applied! Data has been updated.');
    }
  };

  /**
   * Check if any preprocessing is active
   */
  const hasPreprocessing = missingValueStrategy !== 'none' || scalingMethod !== 'none' || encodingMethod !== 'none';

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

  /**
   * Render data table
   */
  const renderDataTable = (tableData, title) => {
    if (!tableData || tableData.length === 0) return null;

    const columns = Object.keys(tableData[0]);
    const displayData = tableData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map(col => (
                  <TableCell key={col} sx={{ fontWeight: 600 }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map(col => (
                    <TableCell key={col}>
                      {typeof row[col] === 'number' ? row[col].toFixed(3) : String(row[col])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={tableData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CleaningServicesIcon /> Data Preprocessing
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          Clean and prepare your data for analysis. Select preprocessing options in each tab,
          then preview the results before applying changes.
        </Typography>

        {/* Current dataset info */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">Rows</Typography>
                <Typography variant="h6">{data.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">Columns</Typography>
                <Typography variant="h6">{Object.keys(data[0]).length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">Numeric</Typography>
                <Typography variant="h6">
                  {Object.values(columnTypes).filter(t => t === 'numeric').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">Categorical</Typography>
                <Typography variant="h6">
                  {Object.values(columnTypes).filter(t => t === 'categorical').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Preprocessing Tabs */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Missing Values" />
          <Tab label="Feature Scaling" />
          <Tab label="Categorical Encoding" />
        </Tabs>

        {/* Tab 1: Missing Values */}
        {activeTab === 0 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              Handle Missing Values
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose how to handle missing (null, undefined, empty) values in your dataset.
            </Typography>

            {/* Missing values summary */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Found <strong>{Object.values(missingValueCounts).reduce((a, b) => a + b, 0)}</strong> missing values across{' '}
                <strong>{Object.values(missingValueCounts).filter(count => count > 0).length}</strong> columns
              </Typography>
            </Alert>

            {/* Missing values per column */}
            {Object.values(missingValueCounts).some(count => count > 0) && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Missing Values by Column:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.entries(missingValueCounts)
                    .filter(([, count]) => count > 0)
                    .map(([col, count]) => (
                      <Chip
                        key={col}
                        label={`${col}: ${count}`}
                        size="small"
                        color="warning"
                      />
                    ))}
                </Box>
              </Box>
            )}

            {/* Strategy selection */}
            <RadioGroup value={missingValueStrategy} onChange={(e) => setMissingValueStrategy(e.target.value)}>
              <FormControlLabel
                value="none"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">None (Keep as-is)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Do not modify missing values
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="drop"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Drop Rows</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Remove all rows containing any missing values
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="mean"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Fill with Mean</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Replace missing numeric values with column mean
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="median"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Fill with Median</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Replace missing numeric values with column median
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="mode"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Fill with Mode</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Replace missing categorical values with most frequent value
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>
        )}

        {/* Tab 2: Feature Scaling */}
        {activeTab === 1 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              Feature Scaling
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Scale numeric features to a common range. This is important for many machine learning algorithms.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Scaling will be applied to <strong>{Object.values(columnTypes).filter(t => t === 'numeric').length}</strong> numeric columns
              </Typography>
            </Alert>

            <RadioGroup value={scalingMethod} onChange={(e) => setScalingMethod(e.target.value)}>
              <FormControlLabel
                value="none"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">None</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Do not scale features
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="standard"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Standard Scaling (Z-score)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Transform to mean=0, std=1 using: (x - μ) / σ
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="minmax"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Min-Max Scaling</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Scale to range [0, 1] using: (x - min) / (max - min)
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>
        )}

        {/* Tab 3: Categorical Encoding */}
        {activeTab === 2 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              Categorical Encoding
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Convert categorical (text) variables into numeric format for machine learning algorithms.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Encoding will be applied to <strong>{Object.values(columnTypes).filter(t => t === 'categorical').length}</strong> categorical columns
              </Typography>
            </Alert>

            <RadioGroup value={encodingMethod} onChange={(e) => setEncodingMethod(e.target.value)}>
              <FormControlLabel
                value="none"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">None</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Do not encode categorical variables
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="onehot"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">One-Hot Encoding</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Create binary (0/1) columns for each category (increases column count)
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="label"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Label Encoding</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Assign numeric labels (0, 1, 2, ...) to each category
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>
        )}
      </Paper>

      {/* Preview & Actions */}
      {hasPreprocessing && processedData && (
        <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrowsIcon /> Preview Changes
          </Typography>

          {/* Summary */}
          {summary && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Summary of Changes:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Rows</Typography>
                  <Typography variant="body1">
                    {summary.originalRows} → {summary.processedRows}
                    {summary.rowsRemoved > 0 && (
                      <Chip label={`-${summary.rowsRemoved}`} size="small" color="warning" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">Columns</Typography>
                  <Typography variant="body1">
                    {summary.originalColumns} → {summary.processedColumns}
                    {summary.columnsAdded !== 0 && (
                      <Chip
                        label={summary.columnsAdded > 0 ? `+${summary.columnsAdded}` : summary.columnsAdded}
                        size="small"
                        color={summary.columnsAdded > 0 ? "success" : "warning"}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                </Grid>
              </Grid>

              {summary.columnChanges.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {summary.columnChanges.map((change, idx) => (
                    <Chip key={idx} label={change} size="small" sx={{ mr: 1, mb: 1 }} />
                  ))}
                </Box>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Toggle comparison view */}
          <Button
            variant="outlined"
            onClick={() => setShowComparison(!showComparison)}
            sx={{ mb: 2 }}
          >
            {showComparison ? 'Hide' : 'Show'} Data Comparison
          </Button>

          {/* Data comparison */}
          {showComparison && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {renderDataTable(data, 'Original Data (First 10 rows)')}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderDataTable(processedData, 'Processed Data (First 10 rows)')}
              </Grid>
            </Grid>
          )}

          {/* Action buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleApply}
              disabled={!hasPreprocessing}
            >
              Apply Preprocessing
            </Button>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download Processed Data
            </Button>

            {onComplete && (
              <Button
                variant="contained"
                color="success"
                onClick={onComplete}
              >
                Complete Module
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {/* Help text when no preprocessing selected */}
      {!hasPreprocessing && (
        <Alert severity="info">
          <Typography variant="body2">
            Select preprocessing options in the tabs above to see a preview of the changes.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default DataPreprocessing;
