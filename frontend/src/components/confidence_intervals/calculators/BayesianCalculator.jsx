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
  Tooltip,
  IconButton
} from '@mui/material';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import axios from 'axios';

/**
 * Bayesian Confidence Interval Calculator Component
 * 
 * This calculator computes Bayesian credible intervals for means and proportions
 * using various prior distributions.
 */
const BayesianCalculator = ({ project, onSaveResult }) => {
  // Default state
  const [parameterType, setParameterType] = useState('BAYESIAN_MEAN');
  const [formData, setFormData] = useState({
    sample_mean: '',
    sample_std_dev: '',
    sample_size: '',
    successes: '',
    failures: '',
    prior_type: 'NORMAL',
    prior_mean: '',
    prior_std_dev: '',
    prior_alpha: '1',
    prior_beta: '1',
    credible_level: 0.95
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Parameter type options
  const parameterTypes = [
    { value: 'BAYESIAN_MEAN', label: 'Mean (Bayesian)' },
    { value: 'BAYESIAN_PROPORTION', label: 'Proportion (Bayesian)' }
  ];

  // Prior distributions for mean
  const meanPriorTypes = [
    { value: 'NORMAL', label: 'Normal Prior' },
    { value: 'UNIFORM', label: 'Uniform Prior' },
    { value: 'JEFFREYS', label: "Jeffreys' Prior (Uninformative)" }
  ];

  // Prior distributions for proportion
  const proportionPriorTypes = [
    { value: 'BETA', label: 'Beta Prior' },
    { value: 'UNIFORM', label: 'Uniform Prior (Beta(1,1))' },
    { value: 'JEFFREYS', label: "Jeffreys' Prior (Beta(0.5,0.5))" }
  ];

  // Handle parameter type change
  const handleParameterTypeChange = (event) => {
    setParameterType(event.target.value);
    
    // Reset prior type based on parameter type
    if (event.target.value === 'BAYESIAN_MEAN') {
      setFormData({
        ...formData,
        prior_type: 'NORMAL'
      });
    } else {
      setFormData({
        ...formData,
        prior_type: 'BETA'
      });
    }
    
    setResult(null);
    setErrors({});
  };

  // Handle prior type change
  const handlePriorTypeChange = (event) => {
    setFormData({
      ...formData,
      prior_type: event.target.value
    });
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

  // Handle credible level change
  const handleCredibleLevelChange = (event, newValue) => {
    setFormData({
      ...formData,
      credible_level: newValue
    });
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    
    if (parameterType === 'BAYESIAN_MEAN') {
      if (!formData.sample_mean) newErrors.sample_mean = 'Sample mean is required';
      if (!formData.sample_std_dev) newErrors.sample_std_dev = 'Sample standard deviation is required';
      if (!formData.sample_size) newErrors.sample_size = 'Sample size is required';
      
      if (formData.sample_std_dev && parseFloat(formData.sample_std_dev) <= 0) {
        newErrors.sample_std_dev = 'Standard deviation must be positive';
      }
      
      if (formData.sample_size && (parseInt(formData.sample_size) <= 0 || !Number.isInteger(parseFloat(formData.sample_size)))) {
        newErrors.sample_size = 'Sample size must be a positive integer';
      }
      
      // Validate prior parameters
      if (formData.prior_type === 'NORMAL') {
        if (!formData.prior_mean) newErrors.prior_mean = 'Prior mean is required';
        if (!formData.prior_std_dev) newErrors.prior_std_dev = 'Prior standard deviation is required';
        
        if (formData.prior_std_dev && parseFloat(formData.prior_std_dev) <= 0) {
          newErrors.prior_std_dev = 'Prior standard deviation must be positive';
        }
      }
    } else if (parameterType === 'BAYESIAN_PROPORTION') {
      if (!formData.successes) newErrors.successes = 'Number of successes is required';
      if (!formData.failures) newErrors.failures = 'Number of failures is required';
      
      if (formData.successes && (parseInt(formData.successes) < 0 || !Number.isInteger(parseFloat(formData.successes)))) {
        newErrors.successes = 'Successes must be a non-negative integer';
      }
      
      if (formData.failures && (parseInt(formData.failures) < 0 || !Number.isInteger(parseFloat(formData.failures)))) {
        newErrors.failures = 'Failures must be a non-negative integer';
      }
      
      // Validate prior parameters
      if (formData.prior_type === 'BETA') {
        if (!formData.prior_alpha) newErrors.prior_alpha = 'Prior alpha is required';
        if (!formData.prior_beta) newErrors.prior_beta = 'Prior beta is required';
        
        if (formData.prior_alpha && parseFloat(formData.prior_alpha) <= 0) {
          newErrors.prior_alpha = 'Alpha must be positive';
        }
        
        if (formData.prior_beta && parseFloat(formData.prior_beta) <= 0) {
          newErrors.prior_beta = 'Beta must be positive';
        }
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
        credible_level: formData.credible_level,
        prior_type: formData.prior_type
      };
      
      if (parameterType === 'BAYESIAN_MEAN') {
        requestData.sample_mean = parseFloat(formData.sample_mean);
        requestData.sample_std_dev = parseFloat(formData.sample_std_dev);
        requestData.sample_size = parseInt(formData.sample_size);
        
        if (formData.prior_type === 'NORMAL') {
          requestData.prior_mean = parseFloat(formData.prior_mean);
          requestData.prior_std_dev = parseFloat(formData.prior_std_dev);
        }
      } else if (parameterType === 'BAYESIAN_PROPORTION') {
        requestData.successes = parseInt(formData.successes);
        requestData.failures = parseInt(formData.failures);
        
        if (formData.prior_type === 'BETA') {
          requestData.prior_alpha = parseFloat(formData.prior_alpha);
          requestData.prior_beta = parseFloat(formData.prior_beta);
        }
      }
      
      // Send calculation request to API
      const response = await axios.post('/api/confidence-intervals/calculate-bayesian/', requestData);
      
      setResult(response.data);
      
      // Call onSaveResult if provided
      if (onSaveResult) {
        onSaveResult(response.data);
      }
    } catch (error) {
      console.error('Error calculating Bayesian credible interval:', error);
      
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

  // Render prior distribution fields
  const renderPriorFields = () => {
    if (parameterType === 'BAYESIAN_MEAN') {
      if (formData.prior_type === 'NORMAL') {
        return (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prior Mean"
                name="prior_mean"
                value={formData.prior_mean}
                onChange={handleInputChange}
                error={Boolean(errors.prior_mean)}
                helperText={errors.prior_mean || 'Prior belief about the mean'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prior Standard Deviation"
                name="prior_std_dev"
                value={formData.prior_std_dev}
                onChange={handleInputChange}
                error={Boolean(errors.prior_std_dev)}
                helperText={errors.prior_std_dev || 'Prior uncertainty about the mean'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </>
        );
      } else {
        return (
          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary">
              No additional parameters needed for this prior distribution.
            </Typography>
          </Grid>
        );
      }
    } else if (parameterType === 'BAYESIAN_PROPORTION') {
      if (formData.prior_type === 'BETA') {
        return (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prior Alpha"
                name="prior_alpha"
                value={formData.prior_alpha}
                onChange={handleInputChange}
                error={Boolean(errors.prior_alpha)}
                helperText={errors.prior_alpha || 'Prior successes + 1'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Prior Beta"
                name="prior_beta"
                value={formData.prior_beta}
                onChange={handleInputChange}
                error={Boolean(errors.prior_beta)}
                helperText={errors.prior_beta || 'Prior failures + 1'}
                type="number"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </>
        );
      } else {
        return (
          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary">
              No additional parameters needed for this prior distribution.
            </Typography>
          </Grid>
        );
      }
    }
  };

  // Render appropriate form fields based on parameter type
  const renderFormFields = () => {
    if (parameterType === 'BAYESIAN_MEAN') {
      return (
        <>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Sample Mean"
              name="sample_mean"
              value={formData.sample_mean}
              onChange={handleInputChange}
              error={Boolean(errors.sample_mean)}
              helperText={errors.sample_mean || 'Mean of the observed sample'}
              type="number"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Sample Standard Deviation"
              name="sample_std_dev"
              value={formData.sample_std_dev}
              onChange={handleInputChange}
              error={Boolean(errors.sample_std_dev)}
              helperText={errors.sample_std_dev || 'Standard deviation of the sample'}
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
    } else if (parameterType === 'BAYESIAN_PROPORTION') {
      return (
        <>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Number of Successes"
              name="successes"
              value={formData.successes}
              onChange={handleInputChange}
              error={Boolean(errors.successes)}
              helperText={errors.successes || 'Count of successful outcomes'}
              type="number"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Number of Failures"
              name="failures"
              onChange={handleInputChange}
              value={formData.failures}
              error={Boolean(errors.failures)}
              helperText={errors.failures || 'Count of failed outcomes'}
              type="number"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </>
      );
    }
  };

  // Get formula based on parameter type and prior
  const getFormula = () => {
    if (parameterType === 'BAYESIAN_MEAN') {
      if (formData.prior_type === 'NORMAL') {
        return "p(\\mu|x) \\propto N\\left(\\frac{\\sigma_0^2 \\bar{x} + \\sigma^2 \\mu_0}{\\sigma_0^2 + \\sigma^2/n}, \\frac{\\sigma_0^2 \\sigma^2/n}{\\sigma_0^2 + \\sigma^2/n}\\right)";
      } else if (formData.prior_type === 'UNIFORM') {
        return "p(\\mu|x) \\propto N\\left(\\bar{x}, \\frac{\\sigma^2}{n}\\right)";
      } else if (formData.prior_type === 'JEFFREYS') {
        return "p(\\mu|x) \\propto N\\left(\\bar{x}, \\frac{\\sigma^2}{n}\\right)";
      }
    } else if (parameterType === 'BAYESIAN_PROPORTION') {
      if (formData.prior_type === 'BETA') {
        return "p(p|x) \\propto \\text{Beta}(\\alpha + s, \\beta + f)";
      } else if (formData.prior_type === 'UNIFORM') {
        return "p(p|x) \\propto \\text{Beta}(1 + s, 1 + f)";
      } else if (formData.prior_type === 'JEFFREYS') {
        return "p(p|x) \\propto \\text{Beta}(0.5 + s, 0.5 + f)";
      }
    }
    return "";
  };

  // Get help text for the current prior
  const getPriorHelp = () => {
    if (parameterType === 'BAYESIAN_MEAN') {
      if (formData.prior_type === 'NORMAL') {
        return "The normal prior is suitable when you have a best guess for the mean (prior mean) and a measure of your uncertainty (prior standard deviation).";
      } else if (formData.prior_type === 'UNIFORM') {
        return "The uniform (flat) prior assumes no prior knowledge about the parameter, giving equal weight to all possible values.";
      } else if (formData.prior_type === 'JEFFREYS') {
        return "Jeffreys' prior is an uninformative prior that is invariant to parameter transformations.";
      }
    } else if (parameterType === 'BAYESIAN_PROPORTION') {
      if (formData.prior_type === 'BETA') {
        return "The Beta prior is the conjugate prior for the binomial likelihood. Alpha can be interpreted as 'prior successes + 1' and Beta as 'prior failures + 1'.";
      } else if (formData.prior_type === 'UNIFORM') {
        return "The uniform prior (Beta(1,1)) gives equal probability to all proportion values between 0 and 1.";
      } else if (formData.prior_type === 'JEFFREYS') {
        return "Jeffreys' prior (Beta(0.5,0.5)) is an uninformative prior that is invariant to parameter transformations.";
      }
    }
    return "";
  };

  return (
    <MathJaxContext>
      <Paper component="form" onSubmit={handleSubmit} elevation={0}>
        <Typography variant="h6" gutterBottom>
          Bayesian Credible Interval
        </Typography>
        
        <Typography variant="body2" paragraph>
          Calculate Bayesian credible intervals that incorporate prior beliefs with observed data.
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
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
                Type of parameter to estimate
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="prior-type-label">Prior Distribution</InputLabel>
              <Select
                labelId="prior-type-label"
                value={formData.prior_type}
                label="Prior Distribution"
                onChange={handlePriorTypeChange}
              >
                {(parameterType === 'BAYESIAN_MEAN' ? meanPriorTypes : proportionPriorTypes).map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText sx={{ display: 'flex', alignItems: 'center' }}>
                Prior distribution for Bayesian analysis
                <Tooltip title={getPriorHelp()} placement="top">
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
        
        <Typography variant="subtitle1" gutterBottom>
          Data
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {renderFormFields()}
        </Grid>
        
        <Typography variant="subtitle1" gutterBottom>
          Prior Parameters
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {renderPriorFields()}
        </Grid>
        
        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Credible Level: {(formData.credible_level * 100).toFixed(0)}%
          </Typography>
          <Slider
            value={formData.credible_level}
            onChange={handleCredibleLevelChange}
            step={0.01}
            min={0.8}
            max={0.99}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
          />
        </Box>
        
        <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Posterior Distribution:
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
          {loading ? 'Calculating...' : 'Calculate Credible Interval'}
        </Button>
        
        {result && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Results ({(result.result.credible_level * 100).toFixed(0)}% Credible Interval):
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Posterior {parameterType === 'BAYESIAN_MEAN' ? 'Mean' : 'Proportion'}: {
                  parameterType === 'BAYESIAN_MEAN' 
                    ? result.result.posterior_mean.toFixed(4) 
                    : result.result.posterior_proportion.toFixed(4)
                }
              </Typography>
              <Typography variant="body2">
                Credible Interval: [{result.result.lower.toFixed(4)}, {result.result.upper.toFixed(4)}]
              </Typography>
              <Typography variant="body2">
                Posterior Standard Deviation: {result.result.posterior_std_dev.toFixed(4)}
              </Typography>
            </Alert>
            
            <Typography variant="body2" color="textSecondary">
              Interpretation: Based on the observed data and our prior beliefs, there is a {(result.result.credible_level * 100).toFixed(0)}% probability that 
              the true {parameterType === 'BAYESIAN_MEAN' ? 'mean' : 'proportion'} is 
              between {result.result.lower.toFixed(4)} and {result.result.upper.toFixed(4)}.
            </Typography>
          </Box>
        )}
      </Paper>
    </MathJaxContext>
  );
};

export default BayesianCalculator;