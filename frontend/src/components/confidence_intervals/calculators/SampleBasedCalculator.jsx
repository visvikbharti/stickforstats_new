import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Slider,
  Divider,
  Paper,
  FormHelperText,
  CircularProgress,
  Alert,
  AlertTitle,
  Tooltip,
  IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';
import CalculateIcon from '@mui/icons-material/Calculate';
import InfoIcon from '@mui/icons-material/Info';

import axios from 'axios';
import { useSnackbar } from 'notistack';
import Papa from 'papaparse'; // For CSV parsing
import * as StatCalc from '../../../utils/statisticalCalculations';

// Import visualization component
import IntervalVisualization from '../visualizations/IntervalVisualization';

/**
 * Get assumptions for each interval type
 * @param {string} intervalType - Type of confidence interval
 * @returns {Array<string>} List of assumptions
 */
const getAssumptions = (intervalType) => {
  switch (intervalType) {
    case 'MEAN_T':
      return [
        'Data is approximately normally distributed (or n > 30 by CLT)',
        'Sample is randomly selected',
        'Observations are independent',
        'Population standard deviation is unknown'
      ];
    case 'MEAN_Z':
      return [
        'Data is approximately normally distributed (or n > 30 by CLT)',
        'Sample is randomly selected',
        'Observations are independent',
        'Population standard deviation is known'
      ];
    case 'PROPORTION_WILSON':
      return [
        'Sample is randomly selected',
        'Observations are independent',
        'Binary outcome (success/failure)',
        'Wilson method provides better coverage for small samples'
      ];
    case 'PROPORTION_WALD':
      return [
        'Sample is randomly selected',
        'Observations are independent',
        'Binary outcome (success/failure)',
        'np ≥ 10 and n(1-p) ≥ 10 for good approximation'
      ];
    case 'PROPORTION_CLOPPER_PEARSON':
      return [
        'Sample is randomly selected',
        'Observations are independent',
        'Binary outcome (success/failure)',
        'Exact method - no distributional assumptions needed'
      ];
    case 'VARIANCE':
      return [
        'Data is normally distributed',
        'Sample is randomly selected',
        'Observations are independent',
        'Sensitive to departures from normality'
      ];
    default:
      return ['Sample is randomly selected', 'Observations are independent'];
  }
};

/**
 * Calculator for confidence intervals based on sample data
 */
const SampleBasedCalculator = ({ project, projectData, onSaveResult }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  // State for loading and calculation status
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  // State for interval parameters
  const [intervalType, setIntervalType] = useState('MEAN_T');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [dataSource, setDataSource] = useState('NEW');
  const [selectedDataId, setSelectedDataId] = useState('');
  
  // State for sample data
  const [dataName, setDataName] = useState('');
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [dataError, setDataError] = useState('');
  
  // State for calculation results
  const [result, setResult] = useState(null);
  const [savedResult, setSavedResult] = useState(null);

  // Define interval types
  const intervalTypes = [
    { value: 'MEAN_T', label: 'Mean (Unknown Variance)', dataType: 'numeric' },
    { value: 'MEAN_Z', label: 'Mean (Known Variance)', dataType: 'numeric' },
    { value: 'PROPORTION_WILSON', label: 'Proportion (Wilson)', dataType: 'binary' },
    { value: 'PROPORTION_WALD', label: 'Proportion (Wald)', dataType: 'binary' },
    { value: 'PROPORTION_CLOPPER_PEARSON', label: 'Proportion (Clopper-Pearson)', dataType: 'binary' },
    { value: 'VARIANCE', label: 'Variance/Std Deviation', dataType: 'numeric' }
  ];

  // Additional parameters for specific interval types
  const [populationStd, setPopulationStd] = useState('');

  // Parse raw data into numeric values
  useEffect(() => {
    if (!rawData.trim()) {
      setParsedData([]);
      return;
    }

    try {
      // Try to parse as CSV first
      Papa.parse(rawData, {
        complete: (results) => {
          // Flatten the array if it's 2D (from CSV)
          let flat = results.data.flat().filter(val => val !== '');
          
          // If the current interval type is for proportions, convert to binary
          if (intervalTypes.find(t => t.value === intervalType)?.dataType === 'binary') {
            // Try to convert to binary (0s and 1s)
            flat = flat.map(val => {
              const trimmed = String(val).trim().toLowerCase();
              if (['1', 'true', 'yes', 'success', 'positive'].includes(trimmed)) return 1;
              if (['0', 'false', 'no', 'failure', 'negative'].includes(trimmed)) return 0;
              
              // Try to convert to number
              const num = Number(val);
              if (!isNaN(num)) {
                if (num === 1) return 1;
                if (num === 0) return 0;
              }
              
              throw new Error(`Value "${val}" cannot be converted to binary (0 or 1)`);
            });
          } else {
            // Convert to numbers for other interval types
            flat = flat.map(val => {
              const num = Number(val);
              if (isNaN(num)) {
                throw new Error(`Value "${val}" is not a number`);
              }
              return num;
            });
          }
          
          setParsedData(flat);
          setDataError('');
        },
        error: (error) => {
          setDataError(`CSV parsing error: ${error.message}`);
        }
      });
    } catch (error) {
      // Try to parse each line as a separate value
      try {
        const values = rawData.split(/[\n,;\s]+/).filter(Boolean);
        
        if (intervalTypes.find(t => t.value === intervalType)?.dataType === 'binary') {
          // Convert to binary for proportion intervals
          const binary = values.map(val => {
            const trimmed = String(val).trim().toLowerCase();
            if (['1', 'true', 'yes', 'success', 'positive'].includes(trimmed)) return 1;
            if (['0', 'false', 'no', 'failure', 'negative'].includes(trimmed)) return 0;
            
            const num = Number(val);
            if (!isNaN(num)) {
              if (num === 1) return 1;
              if (num === 0) return 0;
            }
            
            throw new Error(`Value "${val}" cannot be converted to binary (0 or 1)`);
          });
          
          setParsedData(binary);
          setDataError('');
        } else {
          // Convert to numbers for other interval types
          const numbers = values.map(val => {
            const num = Number(val);
            if (isNaN(num)) {
              throw new Error(`Value "${val}" is not a number`);
            }
            return num;
          });
          
          setParsedData(numbers);
          setDataError('');
        }
      } catch (e) {
        setDataError(e.message);
        setParsedData([]);
      }
    }
  }, [rawData, intervalType, intervalTypes]);

  // Handle saved data selection
  const handleDataSelection = (event) => {
    const dataId = event.target.value;
    setSelectedDataId(dataId);
    
    if (dataId) {
      const selectedData = projectData.find(d => d.id === dataId);
      if (selectedData) {
        setDataName(selectedData.name);
      }
    }
  };

  // Handle interval type change
  const handleIntervalTypeChange = (event) => {
    setIntervalType(event.target.value);
    setResult(null);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setRawData(e.target.result);
      setDataName(file.name.replace(/\.[^/.]+$/, "")); // Set name to filename without extension
    };
    reader.readAsText(file);
  };

  // Save the current data to the project
  const handleSaveData = async () => {
    if (parsedData.length === 0 || dataError) {
      enqueueSnackbar('Please provide valid data before saving', { variant: 'error' });
      return;
    }
    
    if (!dataName) {
      enqueueSnackbar('Please provide a name for your data', { variant: 'error' });
      return;
    }
    
    setLoading(true);
    
    try {
      const dataType = intervalTypes.find(t => t.value === intervalType)?.dataType === 'binary'
        ? 'CATEGORICAL'
        : 'NUMERIC';
      
      const response = await axios.post('/api/confidence-intervals/data/', {
        project: project.id,
        name: dataName,
        data_type: dataType,
        numeric_data: parsedData,
        description: `Data for ${intervalTypes.find(t => t.value === intervalType)?.label} calculations`
      });
      
      enqueueSnackbar('Data saved successfully', { variant: 'success' });
      
      // Add the new data to the selected data
      setSelectedDataId(response.data.id);
      setDataSource('SAVED');
      
    } catch (error) {
      console.error('Error saving data:', error);
      enqueueSnackbar('Error saving data: ' + (error.response?.data?.detail || error.message), 
        { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate the confidence interval
  const handleCalculate = async () => {
    // Validation
    if (dataSource === 'NEW' && (parsedData.length === 0 || dataError)) {
      enqueueSnackbar('Please provide valid data for calculation', { variant: 'error' });
      return;
    }
    
    if (dataSource === 'SAVED' && !selectedDataId) {
      enqueueSnackbar('Please select a saved dataset', { variant: 'error' });
      return;
    }
    
    if (intervalType === 'MEAN_Z' && (!populationStd || isNaN(Number(populationStd)) || Number(populationStd) <= 0)) {
      enqueueSnackbar('Please provide a valid population standard deviation', { variant: 'error' });
      return;
    }
    
    setCalculating(true);

    // Calculate using real statistical methods
    try {
      let calcResult;
      const dataType = intervalTypes.find(t => t.value === intervalType)?.dataType;

      if (dataType === 'binary') {
        // Calculate proportion intervals
        const successes = parsedData.filter(val => val === 1).length;
        const n = parsedData.length;

        switch (intervalType) {
          case 'PROPORTION_WILSON':
            calcResult = StatCalc.calculateWilsonInterval(successes, n, confidenceLevel);
            break;
          case 'PROPORTION_WALD':
            calcResult = StatCalc.calculateWaldInterval(successes, n, confidenceLevel);
            break;
          case 'PROPORTION_CLOPPER_PEARSON':
            calcResult = StatCalc.calculateClopperPearsonInterval(successes, n, confidenceLevel);
            break;
          default:
            throw new Error('Unknown proportion interval type');
        }
      } else {
        // Calculate mean or variance intervals
        switch (intervalType) {
          case 'MEAN_T':
            calcResult = StatCalc.calculateMeanTInterval(parsedData, confidenceLevel);
            break;
          case 'MEAN_Z':
            calcResult = StatCalc.calculateMeanZInterval(parsedData, Number(populationStd), confidenceLevel);
            break;
          case 'VARIANCE':
            calcResult = StatCalc.calculateVarianceInterval(parsedData, confidenceLevel);
            break;
          default:
            throw new Error('Unknown interval type');
        }
      }

      // Format result for display
      const result = {
        interval_type: intervalType,
        confidence_level: confidenceLevel,
        sample_size: parsedData.length,
        result: calcResult,
        method_details: {
          method: intervalTypes.find(t => t.value === intervalType)?.label || intervalType,
          assumptions: getAssumptions(intervalType)
        }
      };

      setResult(result);
      setSavedResult(null);
      enqueueSnackbar('Calculation completed successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error in calculation: ' + error.message, { variant: 'error' });
    } finally {
      setCalculating(false);
    }
    return;
    
    try {
      const requestData = {
        interval_type: intervalType,
        project_id: project.id,
        confidence_level: confidenceLevel
      };
      
      // Add data source
      if (dataSource === 'SAVED') {
        requestData.data_id = selectedDataId;
      } else {
        requestData.numeric_data = parsedData;
      }
      
      // Add special parameters for specific interval types
      if (intervalType === 'MEAN_Z') {
        requestData.population_std = Number(populationStd);
      }
      
      const response = await axios.post('/api/confidence-intervals/calculate/calculate/', requestData);
      
      setResult(response.data);
      setSavedResult(null);
      
      enqueueSnackbar('Calculation completed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error calculating confidence interval:', error);
      enqueueSnackbar(
        'Error calculating confidence interval: ' + 
        (error.response?.data?.error || error.message), 
        { variant: 'error' }
      );
    } finally {
      setCalculating(false);
    }
  };

  // Save the calculation result
  const handleSaveResult = () => {
    if (!result) return;
    
    setSavedResult(result);
    onSaveResult(result);
  };

  // Render summary statistics for the data
  const renderDataSummary = () => {
    if (parsedData.length === 0) return null;
    
    const count = parsedData.length;
    const dataType = intervalTypes.find(t => t.value === intervalType)?.dataType;
    
    if (dataType === 'binary') {
      const successes = parsedData.filter(val => val === 1).length;
      const proportion = successes / count;
      
      return (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Data Summary:</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2">Count: {count}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2">Successes: {successes}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2">Proportion: {proportion.toFixed(4)}</Typography>
            </Grid>
          </Grid>
        </Box>
      );
    } else {
      const sum = parsedData.reduce((acc, val) => acc + val, 0);
      const mean = sum / count;
      const variance = parsedData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
      const std = Math.sqrt(variance);
      const sampStd = Math.sqrt(parsedData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count - 1));
      
      return (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Data Summary:</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2">Count: {count}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2">Mean: {mean.toFixed(4)}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2">Sample Std Dev: {sampStd.toFixed(4)}</Typography>
            </Grid>
          </Grid>
        </Box>
      );
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Sample-Based Confidence Interval Calculator
      </Typography>
      
      <Typography paragraph>
        Calculate confidence intervals using your sample data. You can enter new data or use previously saved datasets.
      </Typography>
      
      {/* Interval Configuration */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Interval Configuration
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="interval-type-label">Interval Type</InputLabel>
              <Select
                labelId="interval-type-label"
                value={intervalType}
                label="Interval Type"
                onChange={handleIntervalTypeChange}
              >
                {intervalTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Select the type of confidence interval to calculate
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ width: '100%' }}>
              <Typography id="confidence-level-slider" gutterBottom>
                Confidence Level: {(confidenceLevel * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={confidenceLevel}
                onChange={(e, newValue) => setConfidenceLevel(newValue)}
                step={0.01}
                marks={[
                  { value: 0.8, label: '80%' },
                  { value: 0.9, label: '90%' },
                  { value: 0.95, label: '95%' },
                  { value: 0.99, label: '99%' }
                ]}
                min={0.8}
                max={0.99}
                aria-labelledby="confidence-level-slider"
              />
              <FormHelperText>
                The confidence level determines the probability that the interval will contain the true parameter
              </FormHelperText>
            </Box>
          </Grid>
          
          {intervalType === 'MEAN_Z' && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Population Standard Deviation"
                type="number"
                value={populationStd}
                onChange={(e) => setPopulationStd(e.target.value)}
                InputProps={{
                  inputProps: { step: 0.1, min: 0 }
                }}
                helperText="Known population standard deviation"
                required
              />
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {/* Data Source Selection */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Data Source
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    variant={dataSource === 'NEW' ? 'contained' : 'outlined'}
                    onClick={() => setDataSource('NEW')}
                  >
                    Enter New Data
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant={dataSource === 'SAVED' ? 'contained' : 'outlined'}
                    onClick={() => setDataSource('SAVED')}
                    disabled={projectData.length === 0}
                  >
                    Use Saved Data
                  </Button>
                </Grid>
              </Grid>
            </FormControl>
          </Grid>
          
          {dataSource === 'SAVED' ? (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="data-select-label">Select Dataset</InputLabel>
                <Select
                  labelId="data-select-label"
                  value={selectedDataId}
                  label="Select Dataset"
                  onChange={handleDataSelection}
                >
                  {projectData.map((data) => (
                    <MenuItem key={data.id} value={data.id}>
                      {data.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Select a previously saved dataset
                </FormHelperText>
              </FormControl>
            </Grid>
          ) : (
            <>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Data Name"
                  value={dataName}
                  onChange={(e) => setDataName(e.target.value)}
                  helperText="Name for your dataset (required to save)"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  sx={{ height: '56px' }}
                  fullWidth
                >
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={`Enter ${intervalTypes.find(t => t.value === intervalType)?.dataType === 'binary' ? 'Binary' : 'Numeric'} Data`}
                  multiline
                  rows={4}
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  helperText={
                    intervalTypes.find(t => t.value === intervalType)?.dataType === 'binary'
                      ? "Enter binary data (0/1, true/false, yes/no, etc.) separated by commas, spaces, or new lines"
                      : "Enter numeric data separated by commas, spaces, or new lines"
                  }
                  error={!!dataError}
                />
                
                {dataError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {dataError}
                  </Alert>
                )}
                
                {renderDataSummary()}
                
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveData}
                    disabled={loading || parsedData.length === 0 || !!dataError || !dataName}
                  >
                    Save Data to Project
                    {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
                  </Button>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
      
      {/* Calculate Button */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<CalculateIcon />}
          onClick={handleCalculate}
          disabled={calculating || (dataSource === 'NEW' && (parsedData.length === 0 || !!dataError)) || 
            (dataSource === 'SAVED' && !selectedDataId)}
        >
          Calculate Confidence Interval
          {calculating && <CircularProgress size={20} sx={{ ml: 1 }} />}
        </Button>
      </Box>
      
      {/* Results */}
      {result && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Results
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveResult}
              disabled={!!savedResult}
            >
              {savedResult ? 'Result Saved' : 'Save Result'}
            </Button>
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            {intervalTypes.find(t => t.value === result.interval_type)?.label || result.interval_type} 
            {' '}({(result.result.confidence_level * 100).toFixed(0)}% Confidence)
          </Typography>
          
          <IntervalVisualization result={result} height={200} />
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {result.result.mean !== undefined && (
              <Grid item xs={12} sm={4}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">Point Estimate (Mean)</Typography>
                  <Typography variant="h6">{result.result.mean.toFixed(4)}</Typography>
                </Paper>
              </Grid>
            )}
            
            {result.result.proportion !== undefined && (
              <Grid item xs={12} sm={4}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">Point Estimate (Proportion)</Typography>
                  <Typography variant="h6">{result.result.proportion.toFixed(4)}</Typography>
                </Paper>
              </Grid>
            )}
            
            {result.result.variance !== undefined && (
              <Grid item xs={12} sm={4}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">Variance</Typography>
                  <Typography variant="h6">{result.result.variance.toFixed(4)}</Typography>
                </Paper>
              </Grid>
            )}
            
            <Grid item xs={12} sm={4}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Lower Bound</Typography>
                <Typography variant="h6">{result.result.lower.toFixed(4)}</Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Upper Bound</Typography>
                <Typography variant="h6">{result.result.upper.toFixed(4)}</Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Margin of Error</Typography>
                <Typography variant="h6">
                  {(result.result.upper - result.result.lower).toFixed(4) / 2}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Interpretation
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>What does this mean?</AlertTitle>
              
              {result.interval_type.startsWith('MEAN') && (
                <Typography variant="body2">
                  We are {(result.result.confidence_level * 100).toFixed(0)}% confident that the true population mean 
                  lies between {result.result.lower.toFixed(4)} and {result.result.upper.toFixed(4)}.
                </Typography>
              )}
              
              {result.interval_type.startsWith('PROPORTION') && (
                <Typography variant="body2">
                  We are {(result.result.confidence_level * 100).toFixed(0)}% confident that the true population proportion 
                  lies between {result.result.lower.toFixed(4)} and {result.result.upper.toFixed(4)}.
                </Typography>
              )}
              
              {result.interval_type === 'VARIANCE' && (
                <Typography variant="body2">
                  We are {(result.result.confidence_level * 100).toFixed(0)}% confident that the true population variance 
                  lies between {result.result.lower.toFixed(4)} and {result.result.upper.toFixed(4)}.
                </Typography>
              )}
            </Alert>
            
            <Typography variant="body2" color="textSecondary">
              Remember: A confidence interval is a range of values that is likely to contain the true population parameter. 
              The confidence level (e.g., 95%) indicates the probability that the procedure used to create the interval 
              will produce an interval containing the true parameter.
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default SampleBasedCalculator;