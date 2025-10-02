import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Paper,
  FormHelperText,
  CircularProgress,
  Alert,
  AlertTitle,
  IconButton,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';
import CalculateIcon from '@mui/icons-material/Calculate';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import Papa from 'papaparse';

// Import visualization components
import IntervalVisualization from '../visualizations/IntervalVisualization';
import BootstrapSimulationVisualization from '../visualizations/BootstrapSimulationVisualization';

// ------------------------------------------------------
// SUB-COMPONENTS
// ------------------------------------------------------

// Bootstrap Methods Information
const BootstrapMethodsInfo = React.memo(() => (
  <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography>About Bootstrap Methods</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography variant="body2" paragraph>
        <strong>Bootstrap methods</strong> are resampling techniques that allow estimation 
        of sampling distributions without assuming a specific parametric form.
      </Typography>
      
      <Typography variant="subtitle2" gutterBottom>Available Methods:</Typography>
      
      <ul>
        <li>
          <Typography variant="body2">
            <strong>Percentile Method:</strong> The simplest approach. Uses the percentiles 
            of the bootstrap distribution directly.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            <strong>Basic Method:</strong> Uses the bootstrap distribution to estimate the bias 
            and variability of the estimate.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            <strong>BCa Method:</strong> Bias-Corrected and accelerated bootstrap. Adjusts for 
            both bias and skewness in the bootstrap distribution.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            <strong>Studentized Method:</strong> Uses pivotal quantities based on the bootstrap 
            standard error, similar to the t-distribution approach.
          </Typography>
        </li>
      </ul>
      
      <Typography variant="body2" paragraph>
        For robustness, we recommend the BCa method when possible, though it requires more 
        computational resources. The percentile method is simplest and works well in many cases.
      </Typography>
    </AccordionDetails>
  </Accordion>
));

// Data Summary component
const DataSummary = React.memo(({ data, label = 'Data Summary' }) => {
  if (!data || data.length === 0) return null;
  
  const stats = useMemo(() => {
    const count = data.length;
    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const std = Math.sqrt(variance);
    const sampStd = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count - 1));
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    return { count, mean, sampStd, min, max };
  }, [data]);
  
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>{label}:</Typography>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Typography variant="body2">Count: {stats.count}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="body2">Mean: {stats.mean.toFixed(4)}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="body2">Sample Std Dev: {stats.sampStd.toFixed(4)}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="body2">Min: {stats.min.toFixed(4)}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="body2">Max: {stats.max.toFixed(4)}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
});

// Configuration Panel component
const ConfigurationPanel = React.memo(({ 
  intervalType, setIntervalType,
  bootstrapMethod, setBootstrapMethod,
  confidenceLevel, setConfidenceLevel,
  nResamples, setNResamples,
  bootstrapMethods
}) => (
  <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
    <Typography variant="subtitle1" gutterBottom>
      Bootstrap Configuration
    </Typography>
    
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="bootstrap-type-label">Bootstrap Type</InputLabel>
          <Select
            labelId="bootstrap-type-label"
            value={intervalType}
            label="Bootstrap Type"
            onChange={(e) => setIntervalType(e.target.value)}
          >
            <MenuItem value="BOOTSTRAP_SINGLE">Single Sample Bootstrap</MenuItem>
            <MenuItem value="BOOTSTRAP_DIFFERENCE">Bootstrap for Difference</MenuItem>
          </Select>
          <FormHelperText>
            Select the type of bootstrap interval to calculate
          </FormHelperText>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="bootstrap-method-label">Bootstrap Method</InputLabel>
          <Select
            labelId="bootstrap-method-label"
            value={bootstrapMethod}
            label="Bootstrap Method"
            onChange={(e) => setBootstrapMethod(e.target.value)}
          >
            {bootstrapMethods.map(method => (
              <MenuItem key={method.value} value={method.value}>
                {method.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Select the bootstrap method for interval construction
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
      
      <Grid item xs={12} md={6}>
        <Box sx={{ width: '100%' }}>
          <Typography id="resamples-slider" gutterBottom>
            Number of Resamples: {nResamples}
          </Typography>
          <Slider
            value={nResamples}
            onChange={(e, newValue) => setNResamples(newValue)}
            step={100}
            marks={[
              { value: 500, label: '500' },
              { value: 1000, label: '1000' },
              { value: 2000, label: '2000' },
              { value: 5000, label: '5000' }
            ]}
            min={100}
            max={5000}
            aria-labelledby="resamples-slider"
          />
          <FormHelperText>
            More resamples provide more stable results but take longer to compute
          </FormHelperText>
        </Box>
      </Grid>
    </Grid>
    
    <Box sx={{ mt: 2 }}>
      <BootstrapMethodsInfo />
    </Box>
  </Paper>
));

// Saved Data Selection Panel
const SavedDataSelection = React.memo(({ 
  intervalType,
  selectedDataId, setSelectedDataId,
  selectedDataId2, setSelectedDataId2,
  projectData
}) => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={intervalType === 'BOOTSTRAP_DIFFERENCE' ? 6 : 12}>
      <FormControl fullWidth>
        <InputLabel id="data-select-label">Select Dataset</InputLabel>
        <Select
          labelId="data-select-label"
          value={selectedDataId}
          label="Select Dataset"
          onChange={(e) => setSelectedDataId(e.target.value)}
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
    
    {intervalType === 'BOOTSTRAP_DIFFERENCE' && (
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="data-select-label-2">Select Second Dataset</InputLabel>
          <Select
            labelId="data-select-label-2"
            value={selectedDataId2}
            label="Select Second Dataset"
            onChange={(e) => setSelectedDataId2(e.target.value)}
          >
            {projectData.map((data) => (
              <MenuItem key={data.id} value={data.id}>
                {data.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Select second dataset for difference
          </FormHelperText>
        </FormControl>
      </Grid>
    )}
  </Grid>
));

// New Data Input Panel
const NewDataInput = React.memo(({
  intervalType,
  dataName, setDataName,
  rawData, setRawData,
  rawData2, setRawData2,
  dataError, dataError2,
  parsedData, parsedData2,
  handleFileUpload,
  handleSaveData,
  loading
}) => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={intervalType === 'BOOTSTRAP_DIFFERENCE' ? 6 : 8}>
      <TextField
        fullWidth
        label="Data Name"
        value={dataName}
        onChange={(e) => setDataName(e.target.value)}
        helperText="Name for your dataset (required to save)"
      />
    </Grid>
    
    <Grid item xs={12} md={intervalType === 'BOOTSTRAP_DIFFERENCE' ? 6 : 4}>
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
          onChange={(e) => handleFileUpload(e, false)}
        />
      </Button>
    </Grid>
    
    <Grid item xs={12} md={intervalType === 'BOOTSTRAP_DIFFERENCE' ? 6 : 12}>
      <TextField
        fullWidth
        label="Enter Numeric Data"
        multiline
        rows={4}
        value={rawData}
        onChange={(e) => setRawData(e.target.value)}
        helperText="Enter numeric data separated by commas, spaces, or new lines"
        error={!!dataError}
      />
      
      {dataError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {dataError}
        </Alert>
      )}
      
      <DataSummary data={parsedData} label="First Sample Summary" />
    </Grid>
    
    {intervalType === 'BOOTSTRAP_DIFFERENCE' && (
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Enter Second Sample Data"
          multiline
          rows={4}
          value={rawData2}
          onChange={(e) => setRawData2(e.target.value)}
          helperText="Enter numeric data for second sample"
          error={!!dataError2}
        />
        
        <Button
          component="label"
          variant="outlined"
          startIcon={<FileUploadIcon />}
          sx={{ mt: 1 }}
          size="small"
        >
          Upload Second CSV
          <input
            type="file"
            accept=".csv,.txt"
            hidden
            onChange={(e) => handleFileUpload(e, true)}
          />
        </Button>
        
        {dataError2 && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {dataError2}
          </Alert>
        )}
        
        <DataSummary data={parsedData2} label="Second Sample Summary" />
      </Grid>
    )}
    
    <Grid item xs={12}>
      <Box sx={{ textAlign: 'right' }}>
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
  </Grid>
));

// Result Display Panel
const ResultDisplay = React.memo(({ 
  result, 
  intervalType, 
  bootstrapMethod,
  savedResult,
  handleSaveResult 
}) => {
  if (!result) return null;
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Bootstrap Results
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
        {intervalType === 'BOOTSTRAP_SINGLE' ? 'Bootstrap Confidence Interval' : 'Bootstrap Difference Interval'} 
        {' '}({(result.result.confidence_level * 100).toFixed(0)}% Confidence)
      </Typography>
      
      <IntervalVisualization result={result} height={200} />
      
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">Point Estimate</Typography>
            <Typography variant="h6">{result.result.statistic.toFixed(4)}</Typography>
          </Paper>
        </Grid>
        
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
      </Grid>
      
      {result.result.bootstrap_replicates && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>View Bootstrap Distribution</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" gutterBottom>
              The histogram below shows the distribution of bootstrap replicates. The calculated
              confidence interval is based on this distribution.
            </Typography>
            
            <Box sx={{ height: 200, mt: 2 }}>
              {/* Here we would render a histogram of bootstrap replicates */}
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
                Bootstrap distribution with {result.result.bootstrap_replicates.length} replicates
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Interpretation
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>What does this mean?</AlertTitle>
          
          {intervalType === 'BOOTSTRAP_SINGLE' ? (
            <Typography variant="body2">
              We are {(result.result.confidence_level * 100).toFixed(0)}% confident that the true parameter 
              lies between {result.result.lower.toFixed(4)} and {result.result.upper.toFixed(4)}.
              This interval was constructed using the {bootstrapMethod} bootstrap method with 
              {' '}{result.result.n_resamples} resamples.
            </Typography>
          ) : (
            <Typography variant="body2">
              We are {(result.result.confidence_level * 100).toFixed(0)}% confident that the true difference 
              between the parameters lies between {result.result.lower.toFixed(4)} and {result.result.upper.toFixed(4)}.
              This interval was constructed using the {bootstrapMethod} bootstrap method with
              {' '}{result.result.n_resamples} resamples.
            </Typography>
          )}
        </Alert>
        
        <Typography variant="body2" color="textSecondary">
          Bootstrap confidence intervals make minimal assumptions about the underlying distribution of the data.
          They are particularly useful when the sampling distribution is unknown or difficult to derive theoretically.
        </Typography>
      </Box>
    </Paper>
  );
});

// Simulation Tool Panel
const SimulationPanel = React.memo(({
  project,
  simulationParams,
  handleSimParamChange,
  handleSimParamSliderChange,
  handleRunSimulation,
  simulating,
  simulationResult,
  bootstrapMethods
}) => (
  <Paper elevation={3} sx={{ p: 3 }}>
    <Typography variant="h6" gutterBottom>
      Bootstrap Simulation Tool
    </Typography>
    
    <Typography paragraph>
      This tool allows you to simulate the performance of bootstrap confidence intervals under known conditions.
      You can specify the true parameter value and observe how often the bootstrap interval captures it.
    </Typography>
    
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="True Parameter Value"
          type="number"
          value={simulationParams.true_param}
          onChange={handleSimParamChange('true_param')}
          InputProps={{
            inputProps: { step: 0.1 }
          }}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Sample Size"
          type="number"
          value={simulationParams.sample_size}
          onChange={handleSimParamChange('sample_size')}
          InputProps={{
            inputProps: { min: 5, step: 1 }
          }}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="sim-distribution-label">Distribution</InputLabel>
          <Select
            labelId="sim-distribution-label"
            value={simulationParams.distribution}
            label="Distribution"
            onChange={handleSimParamChange('distribution')}
          >
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="exponential">Exponential</MenuItem>
            <MenuItem value="bernoulli">Bernoulli</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="sim-method-label">Bootstrap Method</InputLabel>
          <Select
            labelId="sim-method-label"
            value={simulationParams.method}
            label="Bootstrap Method"
            onChange={handleSimParamChange('method')}
          >
            {bootstrapMethods.map(method => (
              <MenuItem key={method.value} value={method.value}>
                {method.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Box sx={{ width: '100%' }}>
          <Typography gutterBottom>
            Number of Simulations: {simulationParams.n_simulations}
          </Typography>
          <Slider
            value={simulationParams.n_simulations}
            onChange={handleSimParamSliderChange('n_simulations')}
            step={100}
            marks={[
              { value: 100, label: '100' },
              { value: 500, label: '500' },
              { value: 1000, label: '1000' }
            ]}
            min={100}
            max={1000}
          />
        </Box>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Box sx={{ width: '100%' }}>
          <Typography gutterBottom>
            Confidence Level: {(simulationParams.confidence_level * 100).toFixed(0)}%
          </Typography>
          <Slider
            value={simulationParams.confidence_level}
            onChange={handleSimParamSliderChange('confidence_level')}
            step={0.01}
            marks={[
              { value: 0.8, label: '80%' },
              { value: 0.9, label: '90%' },
              { value: 0.95, label: '95%' }
            ]}
            min={0.8}
            max={0.99}
          />
        </Box>
      </Grid>
    </Grid>
    
    <Box sx={{ mt: 3, textAlign: 'center' }}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleRunSimulation}
        disabled={simulating || !project}
      >
        Run Simulation
        {simulating && <CircularProgress size={20} sx={{ ml: 1 }} />}
      </Button>
    </Box>
    
    {simulationResult && (
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Simulation Results
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">Coverage Rate</Typography>
              <Typography variant="h6">
                {(simulationResult.result.coverage_rate * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption">
                Target: {(simulationParams.confidence_level * 100).toFixed(0)}%
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">Mean Interval Width</Typography>
              <Typography variant="h6">
                {simulationResult.result.mean_interval_width.toFixed(4)}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">Number of Simulations</Typography>
              <Typography variant="h6">
                {simulationResult.result.n_simulations}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Coverage Visualization
          </Typography>
          
          <Typography variant="body2" paragraph>
            The visualization below shows how often the bootstrap confidence intervals contained the true
            parameter value ({simulationParams.true_param}). The coverage rate should be close to the 
            nominal confidence level ({(simulationParams.confidence_level * 100).toFixed(0)}%).
          </Typography>
          
          {/* Replace with actual simulation visualization */}
          <Box sx={{ height: 300, bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              Simulation visualization would appear here
            </Typography>
          </Box>
        </Box>
        
        <Alert severity="info">
          <AlertTitle>Interpretation</AlertTitle>
          
          <Typography variant="body2">
            The simulation shows that the {simulationParams.method} bootstrap method with a 
            {(simulationParams.confidence_level * 100).toFixed(0)}% confidence level has an actual coverage rate of 
            {(simulationResult.result.coverage_rate * 100).toFixed(1)}%. This means the intervals contained 
            the true parameter in {(simulationResult.result.coverage_rate * 100).toFixed(1)}% of the simulations.
            
            {Math.abs(simulationResult.result.coverage_rate - simulationParams.confidence_level) > 0.05 && (
              <>
                {' '}This differs from the nominal confidence level, which might indicate the bootstrap method
                is not perfectly calibrated for this type of data or sample size.
              </>
            )}
          </Typography>
        </Alert>
      </Box>
    )}
  </Paper>
));

// ------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------

/**
 * Calculator for bootstrap confidence intervals
 */
const BootstrapCalculator = ({ project, projectData, onSaveResult }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  // State for loading and calculation status
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  
  // State for bootstrap parameters
  const [intervalType, setIntervalType] = useState('BOOTSTRAP_SINGLE');
  const [bootstrapMethod, setBootstrapMethod] = useState('percentile');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [nResamples, setNResamples] = useState(1000);
  const [dataSource, setDataSource] = useState('NEW');
  const [selectedDataId, setSelectedDataId] = useState('');
  const [selectedDataId2, setSelectedDataId2] = useState('');
  
  // State for sample data
  const [dataName, setDataName] = useState('');
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [dataError, setDataError] = useState('');
  
  // State for second sample (for difference intervals)
  const [rawData2, setRawData2] = useState('');
  const [parsedData2, setParsedData2] = useState([]);
  const [dataError2, setDataError2] = useState('');
  
  // State for calculation results
  const [result, setResult] = useState(null);
  const [savedResult, setSavedResult] = useState(null);
  
  // State for simulation
  const [simulationParams, setSimulationParams] = useState({
    true_param: 0.5,
    sample_size: 30,
    n_simulations: 1000,
    n_bootstrap: 500,
    distribution: 'normal',
    method: 'percentile',
    confidence_level: 0.95,
    dist_params: { mean: 0.5, std: 1 }
  });
  const [simulationResult, setSimulationResult] = useState(null);
  
  // Define bootstrap methods
  const bootstrapMethods = useMemo(() => [
    { value: 'percentile', label: 'Percentile Method' },
    { value: 'basic', label: 'Basic Method' },
    { value: 'bca', label: 'BCa Method (Bias-Corrected and Accelerated)' },
    { value: 't', label: 'Studentized Method' }
  ], []);
  
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
          
          // Convert to numbers
          flat = flat.map(val => {
            const num = Number(val);
            if (isNaN(num)) {
              throw new Error(`Value "${val}" is not a number`);
            }
            return num;
          });
          
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
        
        // Convert to numbers
        const numbers = values.map(val => {
          const num = Number(val);
          if (isNaN(num)) {
            throw new Error(`Value "${val}" is not a number`);
          }
          return num;
        });
        
        setParsedData(numbers);
        setDataError('');
      } catch (e) {
        setDataError(e.message);
        setParsedData([]);
      }
    }
  }, [rawData]);
  
  // Parse raw data for second sample
  useEffect(() => {
    if (!rawData2.trim()) {
      setParsedData2([]);
      return;
    }

    try {
      Papa.parse(rawData2, {
        complete: (results) => {
          let flat = results.data.flat().filter(val => val !== '');
          
          flat = flat.map(val => {
            const num = Number(val);
            if (isNaN(num)) {
              throw new Error(`Value "${val}" is not a number`);
            }
            return num;
          });
          
          setParsedData2(flat);
          setDataError2('');
        },
        error: (error) => {
          setDataError2(`CSV parsing error: ${error.message}`);
        }
      });
    } catch (error) {
      try {
        const values = rawData2.split(/[\n,;\s]+/).filter(Boolean);
        
        const numbers = values.map(val => {
          const num = Number(val);
          if (isNaN(num)) {
            throw new Error(`Value "${val}" is not a number`);
          }
          return num;
        });
        
        setParsedData2(numbers);
        setDataError2('');
      } catch (e) {
        setDataError2(e.message);
        setParsedData2([]);
      }
    }
  }, [rawData2]);

  // Handle saved data selection
  const handleDataSelection = useCallback((event) => {
    const dataId = event.target.value;
    setSelectedDataId(dataId);
    
    if (dataId) {
      const selectedData = projectData.find(d => d.id === dataId);
      if (selectedData) {
        setDataName(selectedData.name);
      }
    }
  }, [projectData]);
  
  // Handle second data selection
  const handleDataSelection2 = useCallback((event) => {
    const dataId = event.target.value;
    setSelectedDataId2(dataId);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((event, isSecondSample = false) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (isSecondSample) {
        setRawData2(e.target.result);
      } else {
        setRawData(e.target.result);
        setDataName(file.name.replace(/\.[^/.]+$/, "")); // Set name to filename without extension
      }
    };
    reader.readAsText(file);
  }, []);

  // Save the current data to the project
  const handleSaveData = useCallback(async () => {
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
      const response = await axios.post('/api/confidence-intervals/data/', {
        project: project.id,
        name: dataName,
        data_type: 'NUMERIC',
        numeric_data: parsedData,
        description: 'Data for bootstrap calculations'
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
  }, [project, dataName, parsedData, dataError, enqueueSnackbar]);

  // Calculate the bootstrap confidence interval
  const handleCalculate = useCallback(async () => {
    // Validation
    if (dataSource === 'NEW') {
      if (parsedData.length === 0 || dataError) {
        enqueueSnackbar('Please provide valid data for calculation', { variant: 'error' });
        return;
      }
      
      if (intervalType === 'BOOTSTRAP_DIFFERENCE' && (parsedData2.length === 0 || dataError2)) {
        enqueueSnackbar('Please provide valid data for the second sample', { variant: 'error' });
        return;
      }
    } else if (dataSource === 'SAVED') {
      if (!selectedDataId) {
        enqueueSnackbar('Please select a saved dataset', { variant: 'error' });
        return;
      }
      
      if (intervalType === 'BOOTSTRAP_DIFFERENCE' && !selectedDataId2) {
        enqueueSnackbar('Please select a second saved dataset', { variant: 'error' });
        return;
      }
    }
    
    setCalculating(true);
    
    try {
      const requestData = {
        interval_type: intervalType,
        project_id: project.id,
        confidence_level: confidenceLevel,
        n_resamples: nResamples,
        bootstrap_method: bootstrapMethod
      };
      
      // Add data source
      if (dataSource === 'SAVED') {
        requestData.data_id = selectedDataId;
        if (intervalType === 'BOOTSTRAP_DIFFERENCE') {
          requestData.data_id_2 = selectedDataId2;
        }
      } else {
        requestData.numeric_data = parsedData;
        if (intervalType === 'BOOTSTRAP_DIFFERENCE') {
          requestData.numeric_data_2 = parsedData2;
        }
      }
      
      const response = await axios.post('/api/confidence-intervals/calculate/calculate/', requestData);
      
      setResult(response.data);
      setSavedResult(null);
      
      enqueueSnackbar('Bootstrap calculation completed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error calculating bootstrap interval:', error);
      enqueueSnackbar(
        'Error calculating bootstrap interval: ' + 
        (error.response?.data?.error || error.message), 
        { variant: 'error' }
      );
    } finally {
      setCalculating(false);
    }
  }, [
    project, intervalType, confidenceLevel, nResamples, bootstrapMethod,
    dataSource, selectedDataId, selectedDataId2, parsedData, parsedData2, 
    dataError, dataError2, enqueueSnackbar
  ]);

  // Run bootstrap simulation
  const handleRunSimulation = useCallback(async () => {
    setSimulating(true);
    
    try {
      const requestData = {
        project_id: project.id,
        ...simulationParams
      };
      
      const response = await axios.post('/api/confidence-intervals/calculate/bootstrap_simulation/', requestData);
      
      setSimulationResult(response.data);
      
      enqueueSnackbar('Simulation completed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error running bootstrap simulation:', error);
      enqueueSnackbar(
        'Error running simulation: ' + 
        (error.response?.data?.error || error.message), 
        { variant: 'error' }
      );
    } finally {
      setSimulating(false);
    }
  }, [project, simulationParams, enqueueSnackbar]);

  // Save the calculation result
  const handleSaveResult = useCallback(() => {
    if (!result) return;
    
    setSavedResult(result);
    onSaveResult(result);
  }, [result, onSaveResult]);

  // Handle changes to simulation parameters
  const handleSimParamChange = useCallback((param) => (event) => {
    const value = event.target.value;
    setSimulationParams(prev => ({
      ...prev,
      [param]: value
    }));
  }, []);
  
  const handleSimParamSliderChange = useCallback((param) => (event, newValue) => {
    setSimulationParams(prev => ({
      ...prev,
      [param]: newValue
    }));
  }, []);
  
  // Calculate button disabled state
  const calculateDisabled = useMemo(() => {
    return calculating || 
      (dataSource === 'NEW' && (
        parsedData.length === 0 || 
        !!dataError || 
        (intervalType === 'BOOTSTRAP_DIFFERENCE' && (parsedData2.length === 0 || !!dataError2))
      )) || 
      (dataSource === 'SAVED' && (
        !selectedDataId || 
        (intervalType === 'BOOTSTRAP_DIFFERENCE' && !selectedDataId2)
      ));
  }, [
    calculating, dataSource, parsedData, dataError, parsedData2, dataError2,
    intervalType, selectedDataId, selectedDataId2
  ]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Bootstrap Confidence Interval Calculator
      </Typography>
      
      <Typography paragraph>
        Calculate confidence intervals using bootstrap resampling methods. Bootstrap is a powerful 
        non-parametric approach that makes minimal assumptions about the underlying distribution.
      </Typography>
      
      {/* Bootstrap Configuration */}
      <ConfigurationPanel 
        intervalType={intervalType}
        setIntervalType={setIntervalType}
        bootstrapMethod={bootstrapMethod}
        setBootstrapMethod={setBootstrapMethod}
        confidenceLevel={confidenceLevel}
        setConfidenceLevel={setConfidenceLevel}
        nResamples={nResamples}
        setNResamples={setNResamples}
        bootstrapMethods={bootstrapMethods}
      />
      
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
            <SavedDataSelection 
              intervalType={intervalType}
              selectedDataId={selectedDataId}
              setSelectedDataId={handleDataSelection}
              selectedDataId2={selectedDataId2}
              setSelectedDataId2={handleDataSelection2}
              projectData={projectData}
            />
          ) : (
            <NewDataInput 
              intervalType={intervalType}
              dataName={dataName}
              setDataName={setDataName}
              rawData={rawData}
              setRawData={setRawData}
              rawData2={rawData2}
              setRawData2={setRawData2}
              dataError={dataError}
              dataError2={dataError2}
              parsedData={parsedData}
              parsedData2={parsedData2}
              handleFileUpload={handleFileUpload}
              handleSaveData={handleSaveData}
              loading={loading}
            />
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
          disabled={calculateDisabled}
        >
          Calculate Bootstrap Interval
          {calculating && <CircularProgress size={20} sx={{ ml: 1 }} />}
        </Button>
      </Box>
      
      {/* Results */}
      <ResultDisplay 
        result={result}
        intervalType={intervalType}
        bootstrapMethod={bootstrapMethod}
        savedResult={savedResult}
        handleSaveResult={handleSaveResult}
      />
      
      {/* Bootstrap Simulation Section */}
      <SimulationPanel 
        project={project}
        simulationParams={simulationParams}
        handleSimParamChange={handleSimParamChange}
        handleSimParamSliderChange={handleSimParamSliderChange}
        handleRunSimulation={handleRunSimulation}
        simulating={simulating}
        simulationResult={simulationResult}
        bootstrapMethods={bootstrapMethods}
      />
    </Box>
  );
};

export default React.memo(BootstrapCalculator);