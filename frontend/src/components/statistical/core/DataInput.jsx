import React, { useState, useEffect } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Upload as UploadIcon,
  ContentPaste as PasteIcon,
  Clear as ClearIcon,
  InsertChart as ChartIcon,
  Functions as FunctionsIcon,
  DataArray as DataArrayIcon,
  Help as HelpIcon
} from '@mui/icons-material';

const DataInput = ({
  onDataSubmit,
  multiSample = false,
  maxSamples = 2,
  labels = ['Sample 1', 'Sample 2'],
  placeholder = "Enter comma-separated values (e.g., 1, 2, 3, 4, 5)",
  validation = null,
  showStatistics = true,
  allowFileUpload = true
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [samples, setSamples] = useState(
    Array(multiSample ? maxSamples : 1).fill('')
  );
  const [errors, setErrors] = useState(
    Array(multiSample ? maxSamples : 1).fill(null)
  );
  const [statistics, setStatistics] = useState(
    Array(multiSample ? maxSamples : 1).fill(null)
  );
  const [loading, setLoading] = useState(false);

  const calculateStatistics = (values) => {
    if (!values || values.length === 0) return null;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2
      : sorted[Math.floor(n/2)];
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      count: n,
      mean: mean.toFixed(4),
      median: median.toFixed(4),
      stdDev: stdDev.toFixed(4),
      min: Math.min(...values).toFixed(4),
      max: Math.max(...values).toFixed(4)
    };
  };

  const parseData = (dataString, sampleIndex = 0) => {
    try {
      const values = dataString
        .split(',')
        .map(val => val.trim())
        .filter(val => val !== '')
        .map(val => {
          const num = parseFloat(val);
          if (isNaN(num)) {
            throw new Error(`Invalid value: "${val}"`);
          }
          return num;
        });

      if (values.length === 0) {
        throw new Error('No valid values found');
      }

      if (validation) {
        const validationResult = validation(values, sampleIndex);
        if (validationResult !== true) {
          throw new Error(validationResult);
        }
      }

      return { values, error: null };
    } catch (error) {
      return { values: null, error: error.message };
    }
  };

  const handleInputChange = (value, index) => {
    const newSamples = [...samples];
    newSamples[index] = value;
    setSamples(newSamples);

    if (value.trim() === '') {
      const newErrors = [...errors];
      newErrors[index] = null;
      setErrors(newErrors);

      const newStats = [...statistics];
      newStats[index] = null;
      setStatistics(newStats);
      return;
    }

    const { values, error } = parseData(value, index);

    const newErrors = [...errors];
    newErrors[index] = error;
    setErrors(newErrors);

    const newStats = [...statistics];
    newStats[index] = error ? null : calculateStatistics(values);
    setStatistics(newStats);
  };

  const handleFileUpload = async (event, index) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const values = text.match(/[\d.-]+/g);
      if (values) {
        handleInputChange(values.join(', '), index);
      }
    } catch (error) {
      const newErrors = [...errors];
      newErrors[index] = 'Error reading file';
      setErrors(newErrors);
    }
    setLoading(false);
  };

  const handlePaste = async (index) => {
    try {
      const text = await navigator.clipboard.readText();
      handleInputChange(text, index);
    } catch (error) {
      console.error('Failed to read clipboard');
    }
  };

  const handleClear = (index) => {
    handleInputChange('', index);
  };

  const handleSubmit = () => {
    const parsedData = samples.map((sample, index) => {
      if (sample.trim() === '') return null;
      const { values, error } = parseData(sample, index);
      return error ? null : values;
    });

    if (multiSample) {
      const validSamples = parsedData.filter(data => data !== null);
      if (validSamples.length < 2) {
        setErrors(['Please enter valid data for at least 2 samples']);
        return;
      }
      onDataSubmit(parsedData.filter(data => data !== null));
    } else {
      if (!parsedData[0]) {
        setErrors(['Please enter valid data']);
        return;
      }
      onDataSubmit(parsedData[0]);
    }
  };

  const isValid = multiSample
    ? samples.filter(s => s.trim() !== '').length >= 2 &&
      errors.every(e => e === null)
    : samples[0].trim() !== '' && errors[0] === null;

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <DataArrayIcon color="primary" />
        <Typography variant="h6">
          Data Input
        </Typography>
        <Tooltip title="Enter numerical data separated by commas. You can paste data from spreadsheets or upload CSV files.">
          <IconButton size="small">
            <HelpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {multiSample && (
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          {labels.slice(0, maxSamples).map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>
      )}

      <Grid container spacing={2}>
        {(multiSample ? [activeTab] : [0]).map((sampleIndex) => (
          <React.Fragment key={sampleIndex}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                {allowFileUpload && (
                  <>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      style={{ display: 'none' }}
                      id={`file-upload-${sampleIndex}`}
                      onChange={(e) => handleFileUpload(e, sampleIndex)}
                    />
                    <label htmlFor={`file-upload-${sampleIndex}`}>
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<UploadIcon />}
                        size="small"
                        disabled={loading}
                      >
                        Upload
                      </Button>
                    </label>
                  </>
                )}
                <Button
                  variant="outlined"
                  startIcon={<PasteIcon />}
                  onClick={() => handlePaste(sampleIndex)}
                  size="small"
                >
                  Paste
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={() => handleClear(sampleIndex)}
                  size="small"
                  disabled={!samples[sampleIndex]}
                >
                  Clear
                </Button>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={4}
                value={samples[sampleIndex]}
                onChange={(e) => handleInputChange(e.target.value, sampleIndex)}
                placeholder={placeholder}
                error={!!errors[sampleIndex]}
                helperText={errors[sampleIndex]}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'monospace'
                  }
                }}
              />
            </Grid>

            {showStatistics && statistics[sampleIndex] && (
              <Grid item xs={12}>
                <Box sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle2" gutterBottom>
                    <FunctionsIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Quick Statistics
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary">Count</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {statistics[sampleIndex].count}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary">Mean</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {statistics[sampleIndex].mean}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary">Median</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {statistics[sampleIndex].median}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary">Std Dev</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {statistics[sampleIndex].stdDev}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary">Min</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {statistics[sampleIndex].min}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="caption" color="text.secondary">Max</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {statistics[sampleIndex].max}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            )}
          </React.Fragment>
        ))}

        <Grid item xs={12}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <ChartIcon />}
            size="large"
          >
            {loading ? 'Processing...' : 'Analyze Data'}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DataInput;