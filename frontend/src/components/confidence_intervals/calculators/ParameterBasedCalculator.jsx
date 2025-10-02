import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Divider,
  Grid,
  Slider,
  FormHelperText,
  Alert
} from '@mui/material';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import axios from 'axios';

/**
 * Parameter-Based Confidence Interval Calculator
 * 
 * This calculator computes confidence intervals based on known parameters
 * rather than sample data.
 */
const ParameterBasedCalculator = ({ project, onSaveResult }) => {
  // Default state
  const [parameterType, setParameterType] = useState('MEAN_Z');
  const [formData, setFormData] = useState({
    mean: '',
    std_dev: '',
    sample_size: '',
    proportion: '',
    confidence_level: 0.95,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Parameter type options
  const parameterTypes = [
    { value: 'MEAN_Z', label: 'Mean (Known Variance)' },
    { value: 'PROPORTION_WALD', label: 'Proportion (Normal Approximation)' },
    { value: 'PROPORTION_WILSON', label: 'Proportion (Wilson Score)' },
    { value: 'PROPORTION_CLOPPER_PEARSON', label: 'Proportion (Exact/Clopper-Pearson)' }
  ];

  // Handle parameter type change
  const handleParameterTypeChange = (event) => {
    setParameterType(event.target.value);
    setResult(null);
    setErrors({});
  };

  // Handle form input changes
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear errors when input changes
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  // Handle confidence level change
  const handleConfidenceLevelChange = (event, newValue) => {
    setFormData({
      ...formData,
      confidence_level: newValue
    });
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    
    if (parameterType === 'MEAN_Z') {
      if (!formData.mean) newErrors.mean = 'Mean is required';
      if (!formData.std_dev) newErrors.std_dev = 'Standard deviation is required';
      if (!formData.sample_size) newErrors.sample_size = 'Sample size is required';
      
      if (formData.std_dev && parseFloat(formData.std_dev) <= 0) {
        newErrors.std_dev = 'Standard deviation must be positive';
      }
      
      if (formData.sample_size && (parseInt(formData.sample_size) <= 0 || !Number.isInteger(parseFloat(formData.sample_size)))) {
        newErrors.sample_size = 'Sample size must be a positive integer';
      }
    } else if (parameterType.startsWith('PROPORTION_')) {
      if (formData.proportion === '') newErrors.proportion = 'Proportion is required';
      if (!formData.sample_size) newErrors.sample_size = 'Sample size is required';
      
      if (formData.proportion !== '' && (parseFloat(formData.proportion) < 0 || parseFloat(formData.proportion) > 1)) {
        newErrors.proportion = 'Proportion must be between 0 and 1';
      }
      
      if (formData.sample_size && (parseInt(formData.sample_size) <= 0 || !Number.isInteger(parseFloat(formData.sample_size)))) {
        newErrors.sample_size = 'Sample size must be a positive integer';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare request data based on parameter type
      const requestData = {
        project_id: project.id,
        interval_type: parameterType,
        confidence_level: formData.confidence_level,
        sample_size: parseInt(formData.sample_size)
      };
      
      if (parameterType === 'MEAN_Z') {
        requestData.mean = parseFloat(formData.mean);
        requestData.std_dev = parseFloat(formData.std_dev);
      } else if (parameterType.startsWith('PROPORTION_')) {
        requestData.proportion = parseFloat(formData.proportion);
      }
      
      // Send calculation request to API
      const response = await axios.post('/api/confidence-intervals/calculate-parameter/', requestData);
      
      setResult(response.data);
      
      // Call onSaveResult if provided
      if (onSaveResult) {
        onSaveResult(response.data);
      }
    } catch (error) {
      console.error('Error calculating confidence interval:', error);
      
      // Handle API validation errors
      if (error.response && error.response.data) {
        const apiErrors = {};
        
        Object.entries(error.response.data).forEach(([key, value]) => {
          apiErrors[key] = Array.isArray(value) ? value[0] : value;
        });
        
        setErrors(apiErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render appropriate form fields based on parameter type
  const renderFormFields = () => {
    switch (parameterType) {
      case 'MEAN_Z':
        return (
          <>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Population Mean"
                name="mean"
                value={formData.mean}
                onChange={handleInputChange}
                error={Boolean(errors.mean)}
                helperText={errors.mean || 'Known or assumed population mean'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Standard Deviation"
                name="std_dev"
                value={formData.std_dev}
                onChange={handleInputChange}
                error={Boolean(errors.std_dev)}
                helperText={errors.std_dev || 'Known population standard deviation'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Sample Size"
                name="sample_size"
                value={formData.sample_size}
                onChange={handleInputChange}
                error={Boolean(errors.sample_size)}
                helperText={errors.sample_size || 'Number of observations'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </>
        );
      
      case 'PROPORTION_WALD':
      case 'PROPORTION_WILSON':
      case 'PROPORTION_CLOPPER_PEARSON':
        return (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Proportion"
                name="proportion"
                value={formData.proportion}
                onChange={handleInputChange}
                error={Boolean(errors.proportion)}
                helperText={errors.proportion || 'Value between 0 and 1'}
                type="number"
                InputProps={{ inputProps: { min: 0, max: 1, step: 0.01 } }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sample Size"
                name="sample_size"
                value={formData.sample_size}
                onChange={handleInputChange}
                error={Boolean(errors.sample_size)}
                helperText={errors.sample_size || 'Number of observations'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </>
        );
      
      default:
        return null;
    }
  };

  // Get formula based on parameter type
  const getFormula = () => {
    switch (parameterType) {
      case 'MEAN_Z':
        return "\\bar{x} \\pm z_{\\alpha/2} \\frac{\\sigma}{\\sqrt{n}}";
      
      case 'PROPORTION_WALD':
        return "p \\pm z_{\\alpha/2} \\sqrt{\\frac{p(1-p)}{n}}";
      
      case 'PROPORTION_WILSON':
        return "\\frac{p + \\frac{z_{\\alpha/2}^2}{2n} \\pm z_{\\alpha/2}\\sqrt{\\frac{p(1-p)}{n} + \\frac{z_{\\alpha/2}^2}{4n^2}}}{1 + \\frac{z_{\\alpha/2}^2}{n}}";
      
      case 'PROPORTION_CLOPPER_PEARSON':
        return "\\text{Based on Beta distribution } B(\\alpha/2, x, n-x+1) \\text{ and } B(1-\\alpha/2, x+1, n-x)";
      
      default:
        return "";
    }
  };

  return (
    <MathJaxContext>
      <Paper component="form" onSubmit={handleSubmit} elevation={0}>
        <Typography variant="h6" gutterBottom>
          Parameter-Based Confidence Interval
        </Typography>
        
        <Typography variant="body2" paragraph>
          Calculate confidence intervals when parameters of the population are known
          or can be reasonably assumed.
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="parameter-type-label">Parameter Type</InputLabel>
          <Select
            labelId="parameter-type-label"
            value={parameterType}
            label="Parameter Type"
            onChange={handleParameterTypeChange}
          >
            {parameterTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Select the type of parameter for which you're calculating a confidence interval
          </FormHelperText>
        </FormControl>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {renderFormFields()}
        </Grid>
        
        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Confidence Level: {(formData.confidence_level * 100).toFixed(0)}%
          </Typography>
          <Slider
            value={formData.confidence_level}
            onChange={handleConfidenceLevelChange}
            step={0.01}
            min={0.8}
            max={0.99}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
          />
        </Box>
        
        <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Formula:
          </Typography>
          <MathJax inline={false}>{"\\displaystyle " + getFormula()}</MathJax>
        </Box>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ mb: 2 }}
        >
          {loading ? 'Calculating...' : 'Calculate Confidence Interval'}
        </Button>
        
        {result && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Results ({(result.result.confidence_level * 100).toFixed(0)}% Confidence Interval):
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {parameterType === 'MEAN_Z' ? 'Mean' : 'Proportion'}: {parameterType === 'MEAN_Z' ? result.result.mean.toFixed(4) : result.result.proportion.toFixed(4)}
              </Typography>
              <Typography variant="body2">
                Confidence Interval: [{result.result.lower.toFixed(4)}, {result.result.upper.toFixed(4)}]
              </Typography>
              <Typography variant="body2">
                Margin of Error: ±{result.result.margin_of_error.toFixed(4)}
              </Typography>
            </Alert>
            
            <Typography variant="body2" color="textSecondary">
              Interpretation: We are {(result.result.confidence_level * 100).toFixed(0)}% confident that 
              the true {parameterType === 'MEAN_Z' ? 'population mean' : 'population proportion'} is 
              between {result.result.lower.toFixed(4)} and {result.result.upper.toFixed(4)}.
            </Typography>
          </Box>
        )}
      </Paper>
    </MathJaxContext>
  );
};

export default ParameterBasedCalculator;