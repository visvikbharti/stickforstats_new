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
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import axios from 'axios';

/**
 * Difference Calculator Component
 * 
 * This calculator computes confidence intervals for differences between two means
 * or two proportions.
 */
const DifferenceCalculator = ({ project, onSaveResult }) => {
  // Default state
  const [formData, setFormData] = useState({
    difference_type: 'DIFFERENCE_MEANS',
    mean1: '',
    std_dev1: '',
    sample_size1: '',
    mean2: '',
    std_dev2: '',
    sample_size2: '',
    successes1: '',
    trials1: '',
    successes2: '',
    trials2: '',
    equal_variances: true,
    confidence_level: 0.95,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Difference type options
  const differenceTypes = [
    { value: 'DIFFERENCE_MEANS', label: 'Difference in Means' },
    { value: 'DIFFERENCE_PROPORTIONS', label: 'Difference in Proportions' }
  ];

  // Handle difference type change
  const handleDifferenceTypeChange = (event) => {
    setFormData({
      ...formData,
      difference_type: event.target.value
    });
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

  // Handle switch change
  const handleSwitchChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.checked
    });
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
    
    if (formData.difference_type === 'DIFFERENCE_MEANS') {
      // Group 1 validation
      if (!formData.mean1) newErrors.mean1 = 'First sample mean is required';
      if (!formData.std_dev1) newErrors.std_dev1 = 'First sample standard deviation is required';
      if (!formData.sample_size1) newErrors.sample_size1 = 'First sample size is required';
      
      if (formData.std_dev1 && parseFloat(formData.std_dev1) <= 0) {
        newErrors.std_dev1 = 'Standard deviation must be positive';
      }
      
      if (formData.sample_size1 && (parseInt(formData.sample_size1) <= 0 || !Number.isInteger(parseFloat(formData.sample_size1)))) {
        newErrors.sample_size1 = 'Sample size must be a positive integer';
      }
      
      // Group 2 validation
      if (!formData.mean2) newErrors.mean2 = 'Second sample mean is required';
      if (!formData.std_dev2) newErrors.std_dev2 = 'Second sample standard deviation is required';
      if (!formData.sample_size2) newErrors.sample_size2 = 'Second sample size is required';
      
      if (formData.std_dev2 && parseFloat(formData.std_dev2) <= 0) {
        newErrors.std_dev2 = 'Standard deviation must be positive';
      }
      
      if (formData.sample_size2 && (parseInt(formData.sample_size2) <= 0 || !Number.isInteger(parseFloat(formData.sample_size2)))) {
        newErrors.sample_size2 = 'Sample size must be a positive integer';
      }
    } else if (formData.difference_type === 'DIFFERENCE_PROPORTIONS') {
      // Group 1 validation
      if (!formData.successes1) newErrors.successes1 = 'First sample successes is required';
      if (!formData.trials1) newErrors.trials1 = 'First sample trials is required';
      
      if (formData.successes1 && (parseInt(formData.successes1) < 0 || !Number.isInteger(parseFloat(formData.successes1)))) {
        newErrors.successes1 = 'Successes must be a non-negative integer';
      }
      
      if (formData.trials1 && (parseInt(formData.trials1) <= 0 || !Number.isInteger(parseFloat(formData.trials1)))) {
        newErrors.trials1 = 'Trials must be a positive integer';
      }
      
      if (formData.successes1 && formData.trials1 && parseInt(formData.successes1) > parseInt(formData.trials1)) {
        newErrors.successes1 = 'Successes cannot exceed trials';
      }
      
      // Group 2 validation
      if (!formData.successes2) newErrors.successes2 = 'Second sample successes is required';
      if (!formData.trials2) newErrors.trials2 = 'Second sample trials is required';
      
      if (formData.successes2 && (parseInt(formData.successes2) < 0 || !Number.isInteger(parseFloat(formData.successes2)))) {
        newErrors.successes2 = 'Successes must be a non-negative integer';
      }
      
      if (formData.trials2 && (parseInt(formData.trials2) <= 0 || !Number.isInteger(parseFloat(formData.trials2)))) {
        newErrors.trials2 = 'Trials must be a positive integer';
      }
      
      if (formData.successes2 && formData.trials2 && parseInt(formData.successes2) > parseInt(formData.trials2)) {
        newErrors.successes2 = 'Successes cannot exceed trials';
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
      // Prepare request data based on difference type
      const requestData = {
        project_id: project.id,
        interval_type: formData.difference_type,
        confidence_level: formData.confidence_level
      };
      
      if (formData.difference_type === 'DIFFERENCE_MEANS') {
        requestData.mean1 = parseFloat(formData.mean1);
        requestData.std_dev1 = parseFloat(formData.std_dev1);
        requestData.sample_size1 = parseInt(formData.sample_size1);
        requestData.mean2 = parseFloat(formData.mean2);
        requestData.std_dev2 = parseFloat(formData.std_dev2);
        requestData.sample_size2 = parseInt(formData.sample_size2);
        requestData.equal_variances = formData.equal_variances;
      } else if (formData.difference_type === 'DIFFERENCE_PROPORTIONS') {
        requestData.successes1 = parseInt(formData.successes1);
        requestData.trials1 = parseInt(formData.trials1);
        requestData.successes2 = parseInt(formData.successes2);
        requestData.trials2 = parseInt(formData.trials2);
      }
      
      // Send calculation request to API
      const response = await axios.post('/api/confidence-intervals/calculate-difference/', requestData);
      
      setResult(response.data);
      
      // Call onSaveResult if provided
      if (onSaveResult) {
        onSaveResult(response.data);
      }
    } catch (error) {
      console.error('Error calculating confidence interval for difference:', error);
      
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

  // Render appropriate form fields based on difference type
  const renderFormFields = () => {
    if (formData.difference_type === 'DIFFERENCE_MEANS') {
      return (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">Group 1</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Mean"
                name="mean1"
                value={formData.mean1}
                onChange={handleInputChange}
                error={Boolean(errors.mean1)}
                helperText={errors.mean1 || 'Sample mean of group 1'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Standard Deviation"
                name="std_dev1"
                value={formData.std_dev1}
                onChange={handleInputChange}
                error={Boolean(errors.std_dev1)}
                helperText={errors.std_dev1 || 'Sample standard deviation of group 1'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Sample Size"
                name="sample_size1"
                value={formData.sample_size1}
                onChange={handleInputChange}
                error={Boolean(errors.sample_size1)}
                helperText={errors.sample_size1 || 'Number of observations in group 1'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">Group 2</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Mean"
                name="mean2"
                value={formData.mean2}
                onChange={handleInputChange}
                error={Boolean(errors.mean2)}
                helperText={errors.mean2 || 'Sample mean of group 2'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Standard Deviation"
                name="std_dev2"
                value={formData.std_dev2}
                onChange={handleInputChange}
                error={Boolean(errors.std_dev2)}
                helperText={errors.std_dev2 || 'Sample standard deviation of group 2'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Sample Size"
                name="sample_size2"
                value={formData.sample_size2}
                onChange={handleInputChange}
                error={Boolean(errors.sample_size2)}
                helperText={errors.sample_size2 || 'Number of observations in group 2'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.equal_variances}
                  onChange={handleSwitchChange}
                  name="equal_variances"
                  color="primary"
                />
              }
              label="Assume equal variances"
            />
            <Typography variant="caption" color="textSecondary">
              Use pooled variance estimate (Student's t-test) if checked, or Welch's t-test if unchecked
            </Typography>
          </Box>
        </>
      );
    } else if (formData.difference_type === 'DIFFERENCE_PROPORTIONS') {
      return (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">Group 1</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Successes"
                name="successes1"
                value={formData.successes1}
                onChange={handleInputChange}
                error={Boolean(errors.successes1)}
                helperText={errors.successes1 || 'Number of successes in group 1'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Trials"
                name="trials1"
                value={formData.trials1}
                onChange={handleInputChange}
                error={Boolean(errors.trials1)}
                helperText={errors.trials1 || 'Total number of trials in group 1'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">Group 2</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Successes"
                name="successes2"
                value={formData.successes2}
                onChange={handleInputChange}
                error={Boolean(errors.successes2)}
                helperText={errors.successes2 || 'Number of successes in group 2'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Trials"
                name="trials2"
                value={formData.trials2}
                onChange={handleInputChange}
                error={Boolean(errors.trials2)}
                helperText={errors.trials2 || 'Total number of trials in group 2'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </>
      );
    }
  };

  // Get formula based on difference type
  const getFormula = () => {
    if (formData.difference_type === 'DIFFERENCE_MEANS') {
      if (formData.equal_variances) {
        return "\\bar{X}_1 - \\bar{X}_2 \\pm t_{\\alpha/2, n_1+n_2-2} \\cdot s_p \\sqrt{\\frac{1}{n_1} + \\frac{1}{n_2}}";
      } else {
        return "\\bar{X}_1 - \\bar{X}_2 \\pm t_{\\alpha/2, df'} \\cdot \\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}}";
      }
    } else if (formData.difference_type === 'DIFFERENCE_PROPORTIONS') {
      return "\\hat{p}_1 - \\hat{p}_2 \\pm z_{\\alpha/2} \\cdot \\sqrt{\\frac{\\hat{p}_1(1-\\hat{p}_1)}{n_1} + \\frac{\\hat{p}_2(1-\\hat{p}_2)}{n_2}}";
    }
    return "";
  };

  return (
    <MathJaxContext>
      <Paper component="form" onSubmit={handleSubmit} elevation={0}>
        <Typography variant="h6" gutterBottom>
          Difference Calculator
        </Typography>
        
        <Typography variant="body2" paragraph>
          Calculate confidence intervals for the difference between two parameters (means or proportions).
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="difference-type-label">Difference Type</InputLabel>
          <Select
            labelId="difference-type-label"
            value={formData.difference_type}
            label="Difference Type"
            onChange={handleDifferenceTypeChange}
          >
            {differenceTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Type of difference to analyze
          </FormHelperText>
        </FormControl>
        
        {renderFormFields()}
        
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
              {formData.difference_type === 'DIFFERENCE_MEANS' ? (
                <>
                  <Typography variant="body2">
                    Mean 1: {result.result.mean1.toFixed(4)}
                  </Typography>
                  <Typography variant="body2">
                    Mean 2: {result.result.mean2.toFixed(4)}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2">
                    Proportion 1: {result.result.proportion1.toFixed(4)} ({result.result.successes1} / {result.result.trials1})
                  </Typography>
                  <Typography variant="body2">
                    Proportion 2: {result.result.proportion2.toFixed(4)} ({result.result.successes2} / {result.result.trials2})
                  </Typography>
                </>
              )}
              <Typography variant="body2">
                Difference: {result.result.difference.toFixed(4)}
              </Typography>
              <Typography variant="body2">
                Confidence Interval: [{result.result.lower.toFixed(4)}, {result.result.upper.toFixed(4)}]
              </Typography>
              <Typography variant="body2">
                Standard Error: {result.result.std_error.toFixed(4)}
              </Typography>
              {formData.difference_type === 'DIFFERENCE_MEANS' && !formData.equal_variances && (
                <Typography variant="body2">
                  Degrees of Freedom: {result.result.degrees_of_freedom.toFixed(2)}
                </Typography>
              )}
            </Alert>
            
            <Typography variant="body2" color="textSecondary">
              Interpretation: We are {(result.result.confidence_level * 100).toFixed(0)}% confident that 
              the true difference in {formData.difference_type === 'DIFFERENCE_MEANS' ? 'means' : 'proportions'} is 
              between {result.result.lower.toFixed(4)} and {result.result.upper.toFixed(4)}.
              {result.result.lower * result.result.upper <= 0 && (
                <strong> Since this interval includes 0, we cannot reject the null hypothesis that there is no difference between the groups at the {(1 - result.result.confidence_level) * 100}% significance level.</strong>
              )}
              {result.result.lower * result.result.upper > 0 && (
                <strong> Since this interval does not include 0, we can reject the null hypothesis that there is no difference between the groups at the {(1 - result.result.confidence_level) * 100}% significance level.</strong>
              )}
            </Typography>
          </Box>
        )}
      </Paper>
    </MathJaxContext>
  );
};

export default DifferenceCalculator;