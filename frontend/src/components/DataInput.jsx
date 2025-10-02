import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Fade,
  Zoom,
  alpha,
  useTheme
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Science as ScienceIcon,
  Visibility as VisibilityIcon,
  Clear as ClearIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ContentPaste as PasteIcon,
  TableChart as TableIcon,
  Assessment as AssessmentIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import Papa from 'papaparse';
import { useDarkMode } from '../context/DarkModeContext';

const DataInput = ({ onDataLoaded }) => {
  const { darkMode } = useDarkMode();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef();

  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [dataTypes, setDataTypes] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [inputMethod, setInputMethod] = useState('upload');
  const [manualRows, setManualRows] = useState(5);
  const [manualCols, setManualCols] = useState(2);
  const [manualData, setManualData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [guardianWarnings, setGuardianWarnings] = useState([]);

  const detectDataType = (values) => {
    if (!values || values.length === 0) return 'unknown';

    const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonEmpty.length === 0) return 'unknown';

    const numericCount = nonEmpty.filter(v => !isNaN(parseFloat(v))).length;
    const dateCount = nonEmpty.filter(v => !isNaN(Date.parse(v))).length;
    const booleanCount = nonEmpty.filter(v =>
      ['true', 'false', '0', '1', 'yes', 'no'].includes(String(v).toLowerCase())
    ).length;

    const threshold = nonEmpty.length * 0.8;

    if (numericCount >= threshold) return 'numeric';
    if (dateCount >= threshold && dateCount > numericCount) return 'datetime';
    if (booleanCount >= threshold) return 'boolean';
    return 'categorical';
  };

  const calculateStatistics = (data, columns) => {
    const stats = {};

    columns.forEach(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== '');
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));

      if (numericValues.length > 0) {
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        const sorted = [...numericValues].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        const variance = numericValues.reduce((sum, val) =>
          sum + Math.pow(val - mean, 2), 0) / (numericValues.length - 1 || 1);
        const stdDev = Math.sqrt(variance);

        stats[col] = {
          count: values.length,
          missing: data.length - values.length,
          mean: mean.toFixed(6),
          median: median.toFixed(6),
          stdDev: stdDev.toFixed(6),
          min: Math.min(...numericValues).toFixed(6),
          max: Math.max(...numericValues).toFixed(6),
          q1: sorted[Math.floor(sorted.length * 0.25)]?.toFixed(6),
          q3: sorted[Math.floor(sorted.length * 0.75)]?.toFixed(6),
          type: 'numeric'
        };
      } else {
        const uniqueValues = [...new Set(values)];
        stats[col] = {
          count: values.length,
          missing: data.length - values.length,
          unique: uniqueValues.length,
          mostFrequent: uniqueValues[0],
          type: 'categorical'
        };
      }
    });

    return stats;
  };

  const validateData = async (data, columns) => {
    setIsProcessing(true);
    try {
      const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        suggestions: []
      };

      if (!data || data.length === 0) {
        validation.isValid = false;
        validation.errors.push('No data provided');
        return validation;
      }

      if (data.length < 3) {
        validation.warnings.push('Sample size is very small (n < 3). Statistical power will be limited.');
      }

      if (data.length < 30) {
        validation.warnings.push('Sample size is small (n < 30). Consider assumptions for small sample analysis.');
      }

      columns.forEach(col => {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== '');
        const missingPercent = ((data.length - values.length) / data.length) * 100;

        if (missingPercent > 20) {
          validation.warnings.push(`Column "${col}" has ${missingPercent.toFixed(1)}% missing values`);
        }

        const uniqueRatio = [...new Set(values)].length / values.length;
        if (uniqueRatio === 1 && values.length > 1) {
          validation.warnings.push(`Column "${col}" contains all unique values - might be an identifier`);
        }

        if (uniqueRatio < 0.05 && values.length > 10) {
          validation.warnings.push(`Column "${col}" has very low variability`);
        }
      });

      try {
        const response = await axios.post('http://localhost:8000/api/guardian/preflight/', {
          data: data.slice(0, 100),
          columns: columns,
          dataTypes: dataTypes
        });

        if (response.data.warnings) {
          validation.warnings.push(...response.data.warnings);
        }
        if (response.data.suggestions) {
          validation.suggestions.push(...response.data.suggestions);
        }
      } catch (error) {
        console.warn('Guardian preflight check unavailable:', error);
      }

      return validation;
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: ['Failed to validate data'],
        warnings: [],
        suggestions: []
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setUploadProgress(10);

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      setUploadProgress(0);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit');
      setUploadProgress(0);
      return;
    }

    setIsProcessing(true);
    setUploadProgress(20);

    Papa.parse(file, {
      complete: async (results) => {
        setUploadProgress(50);

        if (results.errors.length > 0) {
          setError(`Parse error: ${results.errors[0].message}`);
          setIsProcessing(false);
          setUploadProgress(0);
          return;
        }

        const parsedData = results.data.filter(row =>
          Object.values(row).some(val => val !== null && val !== '')
        );

        if (parsedData.length === 0) {
          setError('No valid data found in file');
          setIsProcessing(false);
          setUploadProgress(0);
          return;
        }

        const cols = Object.keys(parsedData[0]);
        setColumns(cols);
        setData(parsedData);

        setUploadProgress(70);

        const types = {};
        cols.forEach(col => {
          types[col] = detectDataType(parsedData.map(row => row[col]));
        });
        setDataTypes(types);

        setUploadProgress(85);

        const stats = calculateStatistics(parsedData, cols);
        setStatistics(stats);

        const validation = await validateData(parsedData, cols);
        setValidationResults(validation);
        setGuardianWarnings(validation.warnings);

        setUploadProgress(100);

        enqueueSnackbar(`Successfully loaded ${parsedData.length} rows with ${cols.length} columns`, {
          variant: 'success'
        });

        if (onDataLoaded) {
          onDataLoaded({
            data: parsedData,
            columns: cols,
            dataTypes: types,
            statistics: stats,
            validation: validation
          });
        }

        setIsProcessing(false);
        setTimeout(() => setUploadProgress(0), 1000);
      },
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      encoding: 'UTF-8'
    });
  };

  const initializeManualData = () => {
    const newData = [];
    const colNames = [];

    for (let i = 0; i < manualCols; i++) {
      colNames.push(`Variable_${i + 1}`);
    }

    for (let i = 0; i < manualRows; i++) {
      const row = {};
      colNames.forEach(col => {
        row[col] = '';
      });
      newData.push(row);
    }

    setColumns(colNames);
    setManualData(newData);
  };

  const handleManualDataChange = (rowIndex, colName, value) => {
    const newData = [...manualData];
    newData[rowIndex][colName] = value;
    setManualData(newData);

    if (rowIndex === manualData.length - 1) {
      const allFilled = columns.every(col => newData[rowIndex][col] !== '');
      if (allFilled) {
        const newRow = {};
        columns.forEach(col => {
          newRow[col] = '';
        });
        newData.push(newRow);
        setManualData(newData);
      }
    }
  };

  const handleColumnRename = (oldName, newName) => {
    if (!newName || columns.includes(newName)) return;

    const newColumns = columns.map(col => col === oldName ? newName : col);
    setColumns(newColumns);

    const newData = manualData.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        const newKey = key === oldName ? newName : key;
        newRow[newKey] = row[key];
      });
      return newRow;
    });
    setManualData(newData);
  };

  const processManualData = async () => {
    const validData = manualData.filter(row =>
      columns.some(col => row[col] !== '' && row[col] !== null)
    );

    if (validData.length === 0) {
      setError('Please enter some data');
      return;
    }

    setIsProcessing(true);
    setData(validData);

    const types = {};
    columns.forEach(col => {
      types[col] = detectDataType(validData.map(row => row[col]));
    });
    setDataTypes(types);

    const stats = calculateStatistics(validData, columns);
    setStatistics(stats);

    const validation = await validateData(validData, columns);
    setValidationResults(validation);
    setGuardianWarnings(validation.warnings);

    enqueueSnackbar(`Processed ${validData.length} rows of manual data`, {
      variant: 'success'
    });

    if (onDataLoaded) {
      onDataLoaded({
        data: validData,
        columns: columns,
        dataTypes: types,
        statistics: stats,
        validation: validation
      });
    }

    setIsProcessing(false);
  };

  const handlePasteData = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.trim().split('\n');

      if (lines.length === 0) {
        setError('No data found in clipboard');
        return;
      }

      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim());

      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        parsedData.push(row);
      }

      setColumns(headers);
      setManualData(parsedData);
      enqueueSnackbar('Data pasted from clipboard', { variant: 'info' });
    } catch (error) {
      setError('Failed to paste data. Please check clipboard permissions.');
    }
  };

  const clearData = () => {
    setData([]);
    setColumns([]);
    setDataTypes({});
    setStatistics(null);
    setValidationResults(null);
    setGuardianWarnings([]);
    setManualData([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    enqueueSnackbar('Data cleared', { variant: 'info' });
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        background: darkMode
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ScienceIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
        <Typography variant="h5" fontWeight="bold">
          Scientific Data Input
        </Typography>
        {data.length > 0 && (
          <Chip
            icon={<CheckIcon />}
            label={`${data.length} rows loaded`}
            color="success"
            sx={{ ml: 'auto' }}
          />
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant={inputMethod === 'upload' ? 'contained' : 'outlined'}
              startIcon={<UploadIcon />}
              onClick={() => setInputMethod('upload')}
            >
              Upload CSV
            </Button>
            <Button
              variant={inputMethod === 'manual' ? 'contained' : 'outlined'}
              startIcon={<TableIcon />}
              onClick={() => {
                setInputMethod('manual');
                initializeManualData();
              }}
            >
              Manual Entry
            </Button>
            <Button
              variant="outlined"
              startIcon={<PasteIcon />}
              onClick={handlePasteData}
            >
              Paste Data
            </Button>
            {data.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={clearData}
                sx={{ ml: 'auto' }}
              >
                Clear All
              </Button>
            )}
          </Box>
        </Grid>

        {inputMethod === 'upload' && (
          <Grid item xs={12}>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: theme.palette.primary.main,
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05)
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileUpload}
              />
              <UploadIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Click or drag CSV file here
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Maximum file size: 50MB
              </Typography>
            </Box>
          </Grid>
        )}

        {inputMethod === 'manual' && manualData.length > 0 && (
          <Grid item xs={12}>
            <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={50}>#</TableCell>
                    {columns.map(col => (
                      <TableCell key={col}>
                        <TextField
                          value={col}
                          size="small"
                          variant="standard"
                          onChange={(e) => handleColumnRename(col, e.target.value)}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                    ))}
                    <TableCell width={50}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newCol = `Variable_${columns.length + 1}`;
                          setColumns([...columns, newCol]);
                          const newData = manualData.map(row => ({
                            ...row,
                            [newCol]: ''
                          }));
                          setManualData(newData);
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {manualData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell>{rowIndex + 1}</TableCell>
                      {columns.map(col => (
                        <TableCell key={col}>
                          <TextField
                            value={row[col] || ''}
                            size="small"
                            variant="standard"
                            onChange={(e) => handleManualDataChange(rowIndex, col, e.target.value)}
                            sx={{ width: 120 }}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        {rowIndex > 0 && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              const newData = manualData.filter((_, i) => i !== rowIndex);
                              setManualData(newData);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<AssessmentIcon />}
                onClick={processManualData}
                disabled={isProcessing}
              >
                Process Manual Data
              </Button>
            </Box>
          </Grid>
        )}

        {uploadProgress > 0 && (
          <Grid item xs={12}>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Grid>
        )}

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Grid>
        )}

        {guardianWarnings.length > 0 && (
          <Grid item xs={12}>
            <Alert
              severity="warning"
              icon={<ShieldIcon />}
              sx={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                color: '#000'
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Guardian System Warnings:
              </Typography>
              {guardianWarnings.map((warning, index) => (
                <Typography key={index} variant="body2">
                  • {warning}
                </Typography>
              ))}
            </Alert>
          </Grid>
        )}

        {statistics && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Data Summary
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(statistics).map(([col, stats]) => (
                    <Grid item xs={12} md={6} key={col}>
                      <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          {col} ({stats.type})
                        </Typography>
                        {stats.type === 'numeric' ? (
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            <Typography variant="body2">Mean: {stats.mean}</Typography>
                            <Typography variant="body2">Std Dev: {stats.stdDev}</Typography>
                            <Typography variant="body2">Min: {stats.min}</Typography>
                            <Typography variant="body2">Max: {stats.max}</Typography>
                            <Typography variant="body2">Missing: {stats.missing}</Typography>
                            <Typography variant="body2">Count: {stats.count}</Typography>
                          </Box>
                        ) : (
                          <Box>
                            <Typography variant="body2">Unique: {stats.unique}</Typography>
                            <Typography variant="body2">Missing: {stats.missing}</Typography>
                            <Typography variant="body2">Count: {stats.count}</Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {data.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Data Preview
                  </Typography>
                  <Chip
                    size="small"
                    label={`Showing first ${Math.min(5, data.length)} rows`}
                    sx={{ ml: 2 }}
                  />
                </Box>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {columns.map(col => (
                          <TableCell key={col}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {col}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {dataTypes[col]}
                              </Typography>
                            </Box>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          {columns.map(col => (
                            <TableCell key={col}>
                              {row[col] !== null && row[col] !== '' ? row[col] : '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default DataInput;