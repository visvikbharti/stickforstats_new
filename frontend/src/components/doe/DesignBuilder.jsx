import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel, 
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  ReferenceLine,
  Label
} from 'recharts';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { generateDesign, uploadExperimentData, runModelAnalysis, optimizeResponse } from '../../services/doeService';

/**
 * DesignBuilder - Interactive tool for creating and analyzing experimental designs
 * 
 * This component provides a step-by-step wizard for:
 * 1. Defining factors and responses
 * 2. Generating an experimental design
 * 3. Entering or uploading experimental data
 * 4. Analyzing results
 * 5. Optimizing conditions
 * 
 * The component preserves all the functionality from the original Streamlit interactive builder.
 */
function DesignBuilder() {
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Define Study', 'Generate Design', 'Enter Data', 'Analyze Results', 'Optimize'];
  
  // Study definition state
  const [studyName, setStudyName] = useState('');
  const [studyDescription, setStudyDescription] = useState('');
  const [designType, setDesignType] = useState('FACTORIAL');
  const [factors, setFactors] = useState([
    { name: '', type: 'CONTINUOUS', low: '', high: '', center: '', units: '', isRequired: true }
  ]);
  const [responses, setResponses] = useState([
    { name: '', units: '', target: '', lowerBound: '', upperBound: '', weight: 1, isRequired: true }
  ]);
  
  // Design state
  const [designOptions, setDesignOptions] = useState({
    centerPoints: 3,
    replicates: 1,
    alpha: 'rotatable',
    fraction: 0.5,
    blockCount: 1
  });
  const [generatedDesign, setGeneratedDesign] = useState(null);
  const [experimentData, setExperimentData] = useState([]);
  
  // Analysis state
  const [analysisType, setAnalysisType] = useState('FACTORIAL');
  const [analysisOptions, setAnalysisOptions] = useState({
    includeInteractions: true,
    termSelectionMethod: 'manual',
    selectedResponses: [],
    selectedTerms: []
  });
  const [analysisResults, setAnalysisResults] = useState(null);
  
  // Optimization state
  const [optimizationOptions, setOptimizationOptions] = useState({
    method: 'DESIRABILITY',
    responseGoals: {},
    constraints: []
  });
  const [optimizationResults, setOptimizationResults] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form validation state
  const [formErrors, setFormErrors] = useState({
    experimentName: '',
    factors: [],
    responses: []
  });
  
  // Setup file dropzone
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    onDrop: handleFileDrop
  });
  
  function handleFileDrop(acceptedFiles) {
    const file = acceptedFiles[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let data;
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const csvText = event.target.result;
          // Simple CSV parsing (in production, use a proper CSV parser)
          const rows = csvText.split('\n');
          const headers = rows[0].split(',');
          
          data = rows.slice(1).map(row => {
            if (!row.trim()) return null;
            const values = row.split(',');
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header.trim()] = values[index]?.trim() || '';
            });
            return rowData;
          }).filter(Boolean);
        } else {
          // Parse Excel
          const workbook = XLSX.read(event.target.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(sheet);
        }
        
        setExperimentData(data);
        setSuccess('Data imported successfully!');
      } catch (error) {
        console.error('Error parsing file:', error);
        setError('Failed to parse file. Please check the format.');
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  // Navigation functions
  const handleNext = () => {
    if (activeStep === 1 && !generatedDesign) {
      handleGenerateDesign();
    } else if (activeStep === 3 && !analysisResults) {
      handleRunAnalysis();
    } else if (activeStep === 4 && !optimizationResults) {
      handleRunOptimization();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    if (window.confirm('This will reset all your work. Continue?')) {
      setActiveStep(0);
      setStudyName('');
      setStudyDescription('');
      setDesignType('FACTORIAL');
      setFactors([{ name: '', type: 'CONTINUOUS', low: '', high: '', center: '', units: '', isRequired: true }]);
      setResponses([{ name: '', units: '', target: '', lowerBound: '', upperBound: '', weight: 1, isRequired: true }]);
      setDesignOptions({
        centerPoints: 3,
        replicates: 1,
        alpha: 'rotatable',
        fraction: 0.5,
        blockCount: 1
      });
      setGeneratedDesign(null);
      setExperimentData([]);
      setAnalysisType('FACTORIAL');
      setAnalysisOptions({
        includeInteractions: true,
        termSelectionMethod: 'manual',
        selectedResponses: [],
        selectedTerms: []
      });
      setAnalysisResults(null);
      setOptimizationOptions({
        method: 'DESIRABILITY',
        responseGoals: {},
        constraints: []
      });
      setOptimizationResults(null);
    }
  };

  // Factor and response management
  const addFactor = () => {
    setFactors([...factors, { name: '', type: 'CONTINUOUS', low: '', high: '', center: '', units: '' }]);
  };

  const removeFactor = (index) => {
    if (factors.length > 1) {
      const newFactors = [...factors];
      newFactors.splice(index, 1);
      setFactors(newFactors);
    }
  };

  const updateFactor = (index, field, value) => {
    const newFactors = [...factors];
    newFactors[index] = { ...newFactors[index], [field]: value };
    setFactors(newFactors);
  };

  const addResponse = () => {
    setResponses([...responses, { name: '', units: '', target: '', lowerBound: '', upperBound: '', weight: 1 }]);
  };

  const removeResponse = (index) => {
    if (responses.length > 1) {
      const newResponses = [...responses];
      newResponses.splice(index, 1);
      setResponses(newResponses);
    }
  };

  const updateResponse = (index, field, value) => {
    const newResponses = [...responses];
    newResponses[index] = { ...newResponses[index], [field]: value };
    setResponses(newResponses);
  };

  // API functions
  // Validate the form
  const validateForm = () => {
    const errors = {
      experimentName: '',
      factors: [],
      responses: []
    };

    // Validate experiment name
    if (!studyName.trim()) {
      errors.experimentName = 'Experiment name is required';
    }

    // Validate factors
    if (factors.length === 0) {
      setError('At least one factor is required');
      return false;
    }

    // Validate each factor
    factors.forEach((factor, index) => {
      const factorErrors = {};
      if (!factor.name.trim()) {
        factorErrors.name = 'Factor name is required';
      }
      if (factor.type === 'NUMERIC') {
        if (isNaN(factor.low) || isNaN(factor.high)) {
          factorErrors.range = 'Low and high values must be numbers';
        } else if (parseFloat(factor.low) >= parseFloat(factor.high)) {
          factorErrors.range = 'High value must be greater than low value';
        }
      } else if (factor.type === 'CATEGORICAL' && (!factor.levels || factor.levels.length < 2)) {
        factorErrors.levels = 'Categorical factors must have at least 2 levels';
      }
      errors.factors[index] = factorErrors;
    });

    // Validate responses
    if (responses.length === 0) {
      setError('At least one response is required');
      return false;
    }

    // Validate each response
    responses.forEach((response, index) => {
      const responseErrors = {};
      if (!response.name.trim()) {
        responseErrors.name = 'Response name is required';
      }
      errors.responses[index] = responseErrors;
    });

    setFormErrors(errors);

    // Check if there are any errors
    const hasExperimentNameError = !!errors.experimentName;
    const hasFactorErrors = errors.factors.some(factor => Object.keys(factor).length > 0);
    const hasResponseErrors = errors.responses.some(response => Object.keys(response).length > 0);

    return !hasExperimentNameError && !hasFactorErrors && !hasResponseErrors;
  };

  async function handleGenerateDesign() {
    // Validate study information
    if (!studyName || !designType) {
      setError('Please provide a study name and select a design type.');
      return;
    }

    if (!validateForm()) {
      return;
    }
    
    // Validate factors
    const validFactors = factors.filter(f => f.name);
    if (validFactors.length < 2) {
      setError('Please define at least two factors.');
      return;
    }
    
    // Validate responses
    const validResponses = responses.filter(r => r.name);
    if (validResponses.length < 1) {
      setError('Please define at least one response.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare request payload
      const payload = {
        name: studyName,
        description: studyDescription,
        design_type: designType,
        factors: validFactors.map(f => ({
          name: f.name,
          data_type: f.type,
          low_level: f.type === 'CONTINUOUS' ? parseFloat(f.low) : null,
          high_level: f.type === 'CONTINUOUS' ? parseFloat(f.high) : null,
          center_point: f.type === 'CONTINUOUS' && f.center ? parseFloat(f.center) : null,
          unit: f.units,
          is_categorical: f.type === 'CATEGORICAL',
          categories: f.type === 'CATEGORICAL' && f.categories ? f.categories.split(',').map(c => c.trim()) : []
        })),
        responses: validResponses.map(r => ({
          name: r.name,
          unit: r.units,
          target_value: r.target ? parseFloat(r.target) : null,
          lower_bound: r.lowerBound ? parseFloat(r.lowerBound) : null,
          upper_bound: r.upperBound ? parseFloat(r.upperBound) : null,
          weight: r.weight ? parseFloat(r.weight) : 1.0
        })),
        design_params: {
          center_points: parseInt(designOptions.centerPoints),
          replicates: parseInt(designOptions.replicates),
          alpha: designType === 'CENTRAL_COMPOSITE' ? designOptions.alpha : null,
          fraction: designType === 'FRACTIONAL_FACTORIAL' ? parseFloat(designOptions.fraction) : null,
          block_count: parseInt(designOptions.blockCount)
        }
      };
      
      // Call API
      const result = await generateDesign(payload);
      
      setGeneratedDesign(result);
      setSuccess('Design generated successfully!');
      setActiveStep(2); // Move to next step
      
    } catch (err) {
      console.error('Error generating design:', err);
      setError('Failed to generate design: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveExperimentData() {
    if (!generatedDesign || !generatedDesign.id) {
      setError('No design available to save data for.');
      return;
    }
    
    if (!experimentData || experimentData.length === 0) {
      setError('No experimental data to save.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Convert experimentData to CSV format
      const headers = Object.keys(experimentData[0]).join(',');
      const rows = experimentData.map(row => 
        Object.values(row).join(',')
      ).join('\n');
      const csvData = headers + '\n' + rows;
      
      // Create file object
      const file = new File([csvData], 'experiment_data.csv', { type: 'text/csv' });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Call API
      await uploadExperimentData(generatedDesign.id, formData);
      
      setSuccess('Experiment data saved successfully!');
      setActiveStep(3); // Move to analysis step
      
    } catch (err) {
      console.error('Error saving experiment data:', err);
      setError('Failed to save experiment data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAnalysis() {
    if (!generatedDesign || !generatedDesign.id) {
      setError('No design available for analysis.');
      return;
    }
    
    if (analysisOptions.selectedResponses.length === 0) {
      setError('Please select at least one response to analyze.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare request payload
      const payload = {
        name: `${studyName} Analysis`,
        description: `Analysis of ${studyName} using ${analysisType} method`,
        experiment_design_id: generatedDesign.id,
        analysis_type: analysisType,
        responses: analysisOptions.selectedResponses,
        analysis_params: {
          include_interactions: analysisOptions.includeInteractions,
          term_selection_method: analysisOptions.termSelectionMethod,
          selected_terms: analysisOptions.selectedTerms
        }
      };
      
      // Call API
      const result = await runModelAnalysis(payload);
      
      setAnalysisResults(result);
      setSuccess('Analysis completed successfully!');
      
      // Initialize optimization goals based on responses
      const responseGoals = {};
      analysisOptions.selectedResponses.forEach(response => {
        const responseObj = responses.find(r => r.name === response);
        responseGoals[response] = {
          goal: 'TARGET',
          target: responseObj.target ? parseFloat(responseObj.target) : null,
          lower_bound: responseObj.lowerBound ? parseFloat(responseObj.lowerBound) : null,
          upper_bound: responseObj.upperBound ? parseFloat(responseObj.upperBound) : null,
          weight: responseObj.weight ? parseFloat(responseObj.weight) : 1.0
        };
      });
      
      setOptimizationOptions({
        ...optimizationOptions,
        responseGoals
      });
      
      setActiveStep(4); // Move to optimization step
      
    } catch (err) {
      console.error('Error running analysis:', err);
      setError('Failed to run analysis: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRunOptimization() {
    if (!analysisResults || !analysisResults.id) {
      setError('No analysis results available for optimization.');
      return;
    }
    
    if (Object.keys(optimizationOptions.responseGoals).length === 0) {
      setError('Please define at least one response goal for optimization.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare request payload
      const payload = {
        name: `${studyName} Optimization`,
        description: `Optimization of ${studyName} using ${optimizationOptions.method} method`,
        model_analysis_id: analysisResults.id,
        optimization_type: optimizationOptions.method,
        response_goals: optimizationOptions.responseGoals,
        constraints: optimizationOptions.constraints
      };
      
      // Call API
      const result = await optimizeResponse(payload);
      
      setOptimizationResults(result);
      setSuccess('Optimization completed successfully!');
      
    } catch (err) {
      console.error('Error running optimization:', err);
      setError('Failed to run optimization: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  // Helper functions for rendering
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderDefineStudyStep();
      case 1:
        return renderGenerateDesignStep();
      case 2:
        return renderEnterDataStep();
      case 3:
        return renderAnalysisStep();
      case 4:
        return renderOptimizationStep();
      default:
        return 'Unknown step';
    }
  };

  function renderDefineStudyStep() {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Step 1: Define Your Study
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              required
              label="Study Name"
              fullWidth
              value={studyName}
              onChange={(e) => setStudyName(e.target.value)}
              margin="normal"
              error={!!formErrors.experimentName}
              helperText={formErrors.experimentName}
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={studyDescription}
              onChange={(e) => setStudyDescription(e.target.value)}
              margin="normal"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Design Type</InputLabel>
              <Select
                value={designType}
                onChange={(e) => setDesignType(e.target.value)}
                label="Design Type"
              >
                <MenuItem value="FACTORIAL">Full Factorial Design</MenuItem>
                <MenuItem value="FRACTIONAL_FACTORIAL">Fractional Factorial Design</MenuItem>
                <MenuItem value="CENTRAL_COMPOSITE">Central Composite Design (RSM)</MenuItem>
                <MenuItem value="BOX_BEHNKEN">Box-Behnken Design (RSM)</MenuItem>
                <MenuItem value="PLACKETT_BURMAN">Plackett-Burman Design</MenuItem>
                <MenuItem value="DEFINITIVE_SCREENING">Definitive Screening Design</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom>
                Design Type Information
              </Typography>
              {designType === 'FACTORIAL' && (
                <Typography variant="body2">
                  A full factorial design explores all possible combinations of factor levels. 
                  Provides complete information about main effects and interactions, but requires 
                  more runs as the number of factors increases.
                </Typography>
              )}
              {designType === 'FRACTIONAL_FACTORIAL' && (
                <Typography variant="body2">
                  A fractional factorial design uses a subset of the full factorial, reducing the number 
                  of runs at the cost of some confounding between effects. Good for screening many factors.
                </Typography>
              )}
              {designType === 'CENTRAL_COMPOSITE' && (
                <Typography variant="body2">
                  A response surface design that augments a factorial design with center points and star points. 
                  Used for modeling curved responses and finding optimal operating conditions.
                </Typography>
              )}
              {/* Add descriptions for other design types */}
            </Paper>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 4 }} />
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Define Factors
          </Typography>
          
          {factors.map((factor, index) => (
            <Paper key={index} elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    required={factor.isRequired}
                    label="Factor Name"
                    fullWidth
                    value={factor.name}
                    onChange={(e) => updateFactor(index, 'name', e.target.value)}
                    error={formErrors.factors[index]?.name}
                    helperText={formErrors.factors[index]?.name}
                  />
                </Grid>
                
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={factor.type}
                      onChange={(e) => updateFactor(index, 'type', e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="CONTINUOUS">Continuous</MenuItem>
                      <MenuItem value="CATEGORICAL">Categorical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {factor.type === 'CONTINUOUS' ? (
                  <>
                    <Grid item xs={6} sm={2}>
                      <TextField
                        label="Low Level"
                        fullWidth
                        type="number"
                        value={factor.low}
                        onChange={(e) => updateFactor(index, 'low', e.target.value)}
                        error={formErrors.factors[index]?.range}
                        helperText={formErrors.factors[index]?.range}
                      />
                    </Grid>
                    
                    <Grid item xs={6} sm={2}>
                      <TextField
                        label="High Level"
                        fullWidth
                        type="number"
                        value={factor.high}
                        onChange={(e) => updateFactor(index, 'high', e.target.value)}
                        error={formErrors.factors[index]?.range}
                        helperText={formErrors.factors[index]?.range}
                      />
                    </Grid>
                  </>
                ) : (
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Categories (comma separated)"
                      fullWidth
                      value={factor.categories || ''}
                      onChange={(e) => updateFactor(index, 'categories', e.target.value)}
                      placeholder="Category1, Category2, ..."
                      error={formErrors.factors[index]?.levels}
                      helperText={formErrors.factors[index]?.levels}
                    />
                  </Grid>
                )}
                
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Units"
                    fullWidth
                    value={factor.units}
                    onChange={(e) => updateFactor(index, 'units', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={6} sm={1}>
                  <IconButton 
                    color="error" 
                    onClick={() => removeFactor(index)}
                    disabled={factors.length === 1 && factor.isRequired}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          ))}
          
          <Button
            startIcon={<AddIcon />}
            onClick={addFactor}
            variant="outlined"
            sx={{ mt: 1 }}
          >
            Add Factor
          </Button>
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Define Responses
          </Typography>
          
          {responses.map((response, index) => (
            <Paper key={index} elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    required={response.isRequired}
                    label="Response Name"
                    fullWidth
                    value={response.name}
                    onChange={(e) => updateResponse(index, 'name', e.target.value)}
                    error={formErrors.responses[index]?.name}
                    helperText={formErrors.responses[index]?.name}
                  />
                </Grid>
                
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Units"
                    fullWidth
                    value={response.units}
                    onChange={(e) => updateResponse(index, 'units', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Target Value"
                    fullWidth
                    type="number"
                    value={response.target}
                    onChange={(e) => updateResponse(index, 'target', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Lower Bound"
                    fullWidth
                    type="number"
                    value={response.lowerBound}
                    onChange={(e) => updateResponse(index, 'lowerBound', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Upper Bound"
                    fullWidth
                    type="number"
                    value={response.upperBound}
                    onChange={(e) => updateResponse(index, 'upperBound', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={6} sm={1}>
                  <IconButton 
                    color="error" 
                    onClick={() => removeResponse(index)}
                    disabled={responses.length === 1 && response.isRequired}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          ))}
          
          <Button
            startIcon={<AddIcon />}
            onClick={addResponse}
            variant="outlined"
            sx={{ mt: 1 }}
          >
            Add Response
          </Button>
        </Box>
      </Box>
    );
  }

  function renderGenerateDesignStep() {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Step 2: Generate Design
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Design Options
              </Typography>
              
              {(designType === 'FACTORIAL' || designType === 'FRACTIONAL_FACTORIAL' || designType === 'CENTRAL_COMPOSITE') && (
                <TextField
                  label="Center Points"
                  fullWidth
                  type="number"
                  value={designOptions.centerPoints}
                  onChange={(e) => setDesignOptions({...designOptions, centerPoints: e.target.value})}
                  margin="normal"
                  inputProps={{ min: 0 }}
                  helperText="Number of center point replicates"
                />
              )}
              
              <TextField
                label="Replicates"
                fullWidth
                type="number"
                value={designOptions.replicates}
                onChange={(e) => setDesignOptions({...designOptions, replicates: e.target.value})}
                margin="normal"
                inputProps={{ min: 1 }}
                helperText="Number of replicate runs of the entire design"
              />
              
              {designType === 'FRACTIONAL_FACTORIAL' && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Fraction</InputLabel>
                  <Select
                    value={designOptions.fraction}
                    onChange={(e) => setDesignOptions({...designOptions, fraction: e.target.value})}
                    label="Fraction"
                  >
                    <MenuItem value={0.5}>1/2 Fraction</MenuItem>
                    <MenuItem value={0.25}>1/4 Fraction</MenuItem>
                    <MenuItem value={0.125}>1/8 Fraction</MenuItem>
                    <MenuItem value={0.0625}>1/16 Fraction</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {designType === 'CENTRAL_COMPOSITE' && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Alpha Type</InputLabel>
                  <Select
                    value={designOptions.alpha}
                    onChange={(e) => setDesignOptions({...designOptions, alpha: e.target.value})}
                    label="Alpha Type"
                  >
                    <MenuItem value="rotatable">Rotatable (recommended)</MenuItem>
                    <MenuItem value="orthogonal">Orthogonal</MenuItem>
                    <MenuItem value="spherical">Spherical</MenuItem>
                    <MenuItem value="face_centered">Face-centered (α=1)</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              <TextField
                label="Number of Blocks"
                fullWidth
                type="number"
                value={designOptions.blockCount}
                onChange={(e) => setDesignOptions({...designOptions, blockCount: e.target.value})}
                margin="normal"
                inputProps={{ min: 1 }}
                helperText="Divide design into separate blocks (e.g., experiment days)"
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Design Summary
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Design Type:</Typography>
                <Typography fontWeight="bold">{designType.replace(/_/g, ' ')}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Number of Factors:</Typography>
                <Typography fontWeight="bold">{factors.filter(f => f.name).length}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Number of Responses:</Typography>
                <Typography fontWeight="bold">{responses.filter(r => r.name).length}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Estimated Run Count:</Typography>
                <Typography fontWeight="bold">
                  {/* This is a simplified estimate - would be more sophisticated in real implementation */}
                  {(() => {
                    const factorCount = factors.filter(f => f.name).length;
                    let baseRuns = 0;
                    
                    if (designType === 'FACTORIAL') {
                      baseRuns = Math.pow(2, factorCount);
                    } else if (designType === 'FRACTIONAL_FACTORIAL') {
                      baseRuns = Math.pow(2, factorCount) * designOptions.fraction;
                    } else if (designType === 'CENTRAL_COMPOSITE') {
                      baseRuns = Math.pow(2, factorCount) + 2 * factorCount + parseInt(designOptions.centerPoints);
                    } else if (designType === 'BOX_BEHNKEN') {
                      baseRuns = factorCount * (factorCount - 1) + parseInt(designOptions.centerPoints);
                    } else if (designType === 'PLACKETT_BURMAN') {
                      // Find next multiple of 4 that is >= factorCount+1
                      let n = 4;
                      while (n - 1 < factorCount) n *= 2;
                      baseRuns = n;
                    } else if (designType === 'DEFINITIVE_SCREENING') {
                      baseRuns = 2 * factorCount + 1;
                    }
                    
                    return Math.ceil(baseRuns * parseInt(designOptions.replicates || 1));
                  })()}
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleGenerateDesign}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Design'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
        
        {generatedDesign && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Generated Design
            </Typography>
            
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Run Order</TableCell>
                    {/* Display factor columns */}
                    {factors.filter(f => f.name).map((factor, idx) => (
                      <TableCell key={idx}>{factor.name}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generatedDesign.runs.map((run, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{run.run_order}</TableCell>
                      {factors.filter(f => f.name).map((factor, fidx) => (
                        <TableCell key={fidx}>{run.factor_values[factor.name]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => window.open(`/api/doe/experiment-designs/${generatedDesign.id}/export_design`, '_blank')}
              >
                Export Design
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  function renderEnterDataStep() {
    if (!generatedDesign) {
      return (
        <Alert severity="warning">
          Please generate a design first!
        </Alert>
      );
    }
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Step 3: Enter Experimental Results
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 3, 
                border: '2px dashed #ccc', 
                bgcolor: 'background.default',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              <Box sx={{ textAlign: 'center' }}>
                <UploadFileIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Drag & drop or click to upload
                </Typography>
                <Typography color="textSecondary">
                  Supported formats: CSV, XLSX, XLS
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={7}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Manual Data Entry
              </Typography>
              
              <TableContainer sx={{ maxHeight: 400, mt: 2 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Run</TableCell>
                      {/* Factor columns */}
                      {factors.filter(f => f.name).map((factor, idx) => (
                        <TableCell key={idx}>{factor.name}</TableCell>
                      ))}
                      {/* Response columns */}
                      {responses.filter(r => r.name).map((response, idx) => (
                        <TableCell key={idx}>
                          {response.name}
                          <IconButton size="small" color="primary">
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generatedDesign.runs.map((run, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{run.run_order}</TableCell>
                        {/* Display fixed factor values */}
                        {factors.filter(f => f.name).map((factor, fidx) => (
                          <TableCell key={fidx}>{run.factor_values[factor.name]}</TableCell>
                        ))}
                        {/* Response input fields */}
                        {responses.filter(r => r.name).map((response, ridx) => (
                          <TableCell key={ridx}>
                            <TextField
                              size="small"
                              type="number"
                              sx={{ width: 80 }}
                              value={experimentData[idx]?.[response.name] || ''}
                              onChange={(e) => {
                                const newData = [...experimentData];
                                if (!newData[idx]) {
                                  newData[idx] = {
                                    run_order: run.run_order,
                                    ...run.factor_values
                                  };
                                }
                                newData[idx][response.name] = e.target.value;
                                setExperimentData(newData);
                              }}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveExperimentData}
            disabled={loading || experimentData.length === 0}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Experiment Data'}
          </Button>
        </Box>
      </Box>
    );
  }

  function renderAnalysisStep() {
    if (!generatedDesign) {
      return (
        <Alert severity="warning">
          Please complete the previous steps first!
        </Alert>
      );
    }
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Step 4: Analyze Results
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Analysis Options
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Analysis Type</InputLabel>
                <Select
                  value={analysisType}
                  onChange={(e) => setAnalysisType(e.target.value)}
                  label="Analysis Type"
                >
                  <MenuItem value="FACTORIAL">Factorial Analysis</MenuItem>
                  <MenuItem value="RESPONSE_SURFACE">Response Surface Analysis</MenuItem>
                  <MenuItem value="SCREENING">Screening Analysis</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Responses to Analyze</InputLabel>
                <Select
                  multiple
                  value={analysisOptions.selectedResponses}
                  onChange={(e) => setAnalysisOptions({
                    ...analysisOptions, 
                    selectedResponses: e.target.value
                  })}
                  label="Responses to Analyze"
                >
                  {responses.filter(r => r.name).map((response, idx) => (
                    <MenuItem key={idx} value={response.name}>
                      {response.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={analysisOptions.includeInteractions}
                    onChange={(e) => setAnalysisOptions({
                      ...analysisOptions,
                      includeInteractions: e.target.checked
                    })}
                  />
                }
                label="Include Interactions"
                sx={{ mt: 2 }}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Term Selection Method</InputLabel>
                <Select
                  value={analysisOptions.termSelectionMethod}
                  onChange={(e) => setAnalysisOptions({
                    ...analysisOptions,
                    termSelectionMethod: e.target.value
                  })}
                  label="Term Selection Method"
                >
                  <MenuItem value="manual">Manual Selection</MenuItem>
                  <MenuItem value="forward">Forward Selection</MenuItem>
                  <MenuItem value="backward">Backward Elimination</MenuItem>
                  <MenuItem value="stepwise">Stepwise Selection</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleRunAnalysis}
                disabled={loading || analysisOptions.selectedResponses.length === 0}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Run Analysis'}
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={7}>
            {analysisResults ? (
              <Box>
                {analysisOptions.selectedResponses.map((response, idx) => (
                  <Paper key={idx} elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Analysis Results: {response}
                    </Typography>
                    
                    {analysisResults.results?.model_equations?.[response] && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Model Equation:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            bgcolor: 'background.paper', 
                            p: 2, 
                            borderRadius: 1,
                            fontFamily: 'monospace'
                          }}
                        >
                          {response} = {analysisResults.results.model_equations[response]}
                        </Typography>
                      </Box>
                    )}
                    
                    {analysisResults.results?.model_statistics?.[response] && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Model Statistics:
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption">R²</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {(analysisResults.results.model_statistics[response].r_squared || 0).toFixed(4)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption">Adjusted R²</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {(analysisResults.results.model_statistics[response].adj_r_squared || 0).toFixed(4)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption">RMSE</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {(analysisResults.results.model_statistics[response].rmse || 0).toFixed(4)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption">P-value</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {(analysisResults.results.model_statistics[response].p_value || 0).toFixed(4)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                    
                    {/* Effects chart for factorial analysis */}
                    {analysisType === 'FACTORIAL' && 
                     analysisResults.results?.model_coefficients?.[response] && (
                      <Box sx={{ mb: 3, height: 300 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Effect Estimates:
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.entries(analysisResults.results.model_coefficients[response])
                              .filter(([term]) => term !== 'Intercept')
                              .map(([term, coef]) => ({
                                term,
                                effect: coef.estimate * 2, // Convert coefficient to effect
                                p_value: coef.p_value
                              }))
                              .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))
                            }
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 120, bottom: 30 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="term" type="category" />
                            <Tooltip 
                              formatter={(value, name, props) => [
                                value.toFixed(4), 
                                name === 'effect' ? 'Effect' : 'p-value'
                              ]}
                            />
                            <Bar dataKey="effect" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                    
                    {/* Add more visualizations for different analysis types */}
                  </Paper>
                ))}
              </Box>
            ) : (
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 5, 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'background.default'
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    Select responses and run analysis to see results
                  </Typography>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
    );
  }

  function renderOptimizationStep() {
    if (!analysisResults) {
      return (
        <Alert severity="warning">
          Please complete the analysis step first!
        </Alert>
      );
    }
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Step 5: Optimize Responses
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Optimization Options
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Optimization Method</InputLabel>
                <Select
                  value={optimizationOptions.method}
                  onChange={(e) => setOptimizationOptions({
                    ...optimizationOptions,
                    method: e.target.value
                  })}
                  label="Optimization Method"
                >
                  <MenuItem value="DESIRABILITY">Desirability Function</MenuItem>
                  <MenuItem value="GRID_SEARCH">Grid Search</MenuItem>
                  <MenuItem value="DIRECT">Direct Search</MenuItem>
                </Select>
              </FormControl>
              
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                Response Goals
              </Typography>
              
              {Object.entries(optimizationOptions.responseGoals).map(([response, goal], idx) => (
                <Paper key={idx} elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {response}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Goal</InputLabel>
                        <Select
                          value={goal.goal}
                          onChange={(e) => {
                            const newGoals = {...optimizationOptions.responseGoals};
                            newGoals[response] = {...goal, goal: e.target.value};
                            setOptimizationOptions({
                              ...optimizationOptions,
                              responseGoals: newGoals
                            });
                          }}
                          label="Goal"
                        >
                          <MenuItem value="MAXIMIZE">Maximize</MenuItem>
                          <MenuItem value="MINIMIZE">Minimize</MenuItem>
                          <MenuItem value="TARGET">Target</MenuItem>
                          <MenuItem value="RANGE">In Range</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <TextField
                        label="Lower"
                        size="small"
                        fullWidth
                        type="number"
                        value={goal.lower_bound !== null ? goal.lower_bound : ''}
                        onChange={(e) => {
                          const newGoals = {...optimizationOptions.responseGoals};
                          newGoals[response] = {
                            ...goal, 
                            lower_bound: e.target.value ? parseFloat(e.target.value) : null
                          };
                          setOptimizationOptions({
                            ...optimizationOptions,
                            responseGoals: newGoals
                          });
                        }}
                      />
                    </Grid>
                    
                    {goal.goal === 'TARGET' && (
                      <Grid item xs={4}>
                        <TextField
                          label="Target"
                          size="small"
                          fullWidth
                          type="number"
                          value={goal.target !== null ? goal.target : ''}
                          onChange={(e) => {
                            const newGoals = {...optimizationOptions.responseGoals};
                            newGoals[response] = {
                              ...goal, 
                              target: e.target.value ? parseFloat(e.target.value) : null
                            };
                            setOptimizationOptions({
                              ...optimizationOptions,
                              responseGoals: newGoals
                            });
                          }}
                        />
                      </Grid>
                    )}
                    
                    <Grid item xs={goal.goal === 'TARGET' ? 4 : 8}>
                      <TextField
                        label="Upper"
                        size="small"
                        fullWidth
                        type="number"
                        value={goal.upper_bound !== null ? goal.upper_bound : ''}
                        onChange={(e) => {
                          const newGoals = {...optimizationOptions.responseGoals};
                          newGoals[response] = {
                            ...goal, 
                            upper_bound: e.target.value ? parseFloat(e.target.value) : null
                          };
                          setOptimizationOptions({
                            ...optimizationOptions,
                            responseGoals: newGoals
                          });
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleRunOptimization}
                disabled={loading || Object.keys(optimizationOptions.responseGoals).length === 0}
                sx={{ mt: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Run Optimization'}
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={7}>
            {optimizationResults ? (
              <Box>
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Optimal Solution
                  </Typography>
                  
                  {optimizationResults.optimal_solutions?.length > 0 ? (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Factor Settings:
                        </Typography>
                        <Grid container spacing={2}>
                          {Object.entries(optimizationResults.optimal_solutions[0].factor_settings).map(([factor, value], idx) => (
                            <Grid item xs={6} sm={4} key={idx}>
                              <Typography variant="caption">{factor}</Typography>
                              <Typography variant="body1" fontWeight="bold">
                                {parseFloat(value).toFixed(4)}
                              </Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                      
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Predicted Responses:
                        </Typography>
                        <Grid container spacing={2}>
                          {Object.entries(optimizationResults.optimal_solutions[0].predicted_responses).map(([response, value], idx) => (
                            <Grid item xs={6} sm={4} key={idx}>
                              <Typography variant="caption">{response}</Typography>
                              <Typography variant="body1" fontWeight="bold">
                                {parseFloat(value).toFixed(4)}
                              </Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ mr: 2 }}>
                          Overall Desirability:
                        </Typography>
                        <Typography variant="h4" color="primary" fontWeight="bold">
                          {(optimizationResults.optimal_solutions[0].desirability || 0).toFixed(3)}
                        </Typography>
                      </Box>
                      
                      {/* Add visualization for optimization results - contour plots, etc. */}
                    </>
                  ) : (
                    <Alert severity="warning">
                      No optimal solution found. Try adjusting your response goals.
                    </Alert>
                  )}
                </Paper>
                
                {/* Add contour plots for multiple factors */}
                {optimizationResults.plots && Object.keys(optimizationResults.plots).length > 0 && (
                  <Paper elevation={1} sx={{ p: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Response Surface Visualization:
                    </Typography>
                    
                    {/* This would be replaced with actual contour plots in production */}
                    <Typography color="text.secondary">
                      Response surface visualizations would be displayed here.
                    </Typography>
                  </Paper>
                )}
              </Box>
            ) : (
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 5, 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'background.default'
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom color="text.secondary">
                    Set response goals and run optimization to see results
                  </Typography>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ my: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        {getStepContent(activeStep)}
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="error"
          onClick={handleReset}
        >
          Reset
        </Button>
        
        <Box>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === steps.length - 1 && optimizationResults !== null}
          >
            {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default DesignBuilder;