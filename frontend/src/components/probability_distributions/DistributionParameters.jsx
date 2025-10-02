import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card,
  CardContent,
  Typography, 
  Slider, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  Tooltip,
  Stack,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

/**
 * Component for selecting and configuring distribution parameters
 * 
 * @param {Object} props
 * @param {string} props.distributionType - Type of distribution ('normal', 'poisson', 'binomial', etc.)
 * @param {Object} props.parameters - Current parameter values
 * @param {Function} props.onParameterChange - Callback when a single parameter changes
 * @param {Function} props.onChange - Callback when distribution type or multiple parameters change
 */
const DistributionParameters = ({ 
  distributionType = 'NORMAL', 
  parameters = {}, 
  onParameterChange,
  onChange 
}) => {
  // Default parameters for each distribution type
  const defaultParameters = {
    NORMAL: { mean: 0, std: 1 },
    POISSON: { lambda: 5 },
    BINOMIAL: { n: 10, p: 0.5 },
    EXPONENTIAL: { rate: 1 },
    UNIFORM: { a: 0, b: 1 },
    GAMMA: { shape: 1, scale: 1 },
    BETA: { alpha: 2, beta: 2 },
    LOGNORMAL: { mean: 0, sigma: 1 },
    WEIBULL: { shape: 1, scale: 1 }
  };

  // Current parameters state
  const [currentParameters, setCurrentParameters] = useState({
    ...defaultParameters[distributionType],
    ...parameters
  });

  // Update local state when props change
  useEffect(() => {
    setCurrentParameters({
      ...defaultParameters[distributionType],
      ...parameters
    });
  }, [distributionType, parameters]);

  // Calculate distribution properties
  const calculateProperties = () => {
    switch (distributionType) {
      case 'NORMAL': {
        const { mean = 0, std = 1 } = currentParameters;
        return {
          mean,
          median: mean,
          mode: mean,
          variance: std * std,
          skewness: 0,
          kurtosis: 0  // Excess kurtosis
        };
      }
      case 'POISSON': {
        const { lambda = 5 } = currentParameters;
        return {
          mean: lambda,
          median: Math.floor(lambda + 1/3 - 0.02/lambda),  // Approximation
          mode: Math.floor(lambda),
          variance: lambda,
          standardDeviation: Math.sqrt(lambda),
          skewness: 1 / Math.sqrt(lambda),
          kurtosis: 1 / lambda  // Excess kurtosis
        };
      }
      case 'BINOMIAL': {
        const { n = 10, p = 0.5 } = currentParameters;
        return {
          mean: n * p,
          median: Math.floor(n * p + 0.5),  // Approximation
          mode: Math.floor((n + 1) * p),
          variance: n * p * (1 - p),
          standardDeviation: Math.sqrt(n * p * (1 - p)),
          skewness: (1 - 2 * p) / Math.sqrt(n * p * (1 - p)),
          kurtosis: (1 - 6 * p * (1 - p)) / (n * p * (1 - p))  // Excess kurtosis
        };
      }
      case 'EXPONENTIAL': {
        const { rate = 1 } = currentParameters;
        return {
          mean: 1 / rate,
          median: Math.log(2) / rate,
          mode: 0,
          variance: 1 / (rate * rate),
          standardDeviation: 1 / rate,
          skewness: 2,
          kurtosis: 6
        };
      }
      case 'UNIFORM': {
        const { a = 0, b = 1 } = currentParameters;
        const range = b - a;
        return {
          mean: (a + b) / 2,
          median: (a + b) / 2,
          mode: "Any value in range",
          variance: range * range / 12,
          standardDeviation: range / Math.sqrt(12),
          skewness: 0,
          kurtosis: -6/5
        };
      }
      case 'GAMMA': {
        const { shape = 1, scale = 1 } = currentParameters;
        return {
          mean: shape * scale,
          mode: shape > 1 ? (shape - 1) * scale : "Undefined",
          variance: shape * scale * scale,
          standardDeviation: Math.sqrt(shape) * scale,
          skewness: 2 / Math.sqrt(shape),
          kurtosis: 6 / shape
        };
      }
      case 'BETA': {
        const { alpha = 2, beta = 2 } = currentParameters;
        const sum = alpha + beta;
        return {
          mean: alpha / sum,
          mode: alpha > 1 && beta > 1 ? (alpha - 1) / (sum - 2) : (alpha < 1 && beta < 1 ? "Undefined" : (alpha < 1 ? 0 : 1)),
          variance: (alpha * beta) / (sum * sum * (sum + 1)),
          standardDeviation: Math.sqrt((alpha * beta) / (sum * sum * (sum + 1))),
          skewness: 2 * (beta - alpha) * Math.sqrt(sum + 1) / ((sum + 2) * Math.sqrt(alpha * beta)),
          kurtosis: 6 * ((alpha - beta) * (alpha - beta) * (sum + 1) - alpha * beta * (sum + 2)) / (alpha * beta * (sum + 2) * (sum + 3))
        };
      }
      default:
        return {};
    }
  };

  // Handle distribution type change
  const handleDistributionTypeChange = (event) => {
    const newType = event.target.value;
    const newParams = defaultParameters[newType];
    
    if (onChange) {
      onChange(newParams, newType);
    } else if (onParameterChange) {
      // Fall back to individual parameter changes if onChange not provided
      Object.entries(newParams).forEach(([param, value]) => {
        onParameterChange(param, value);
      });
    }
  };

  // Handle parameter change
  const handleParamChange = (paramName, value) => {
    const newParameters = {
      ...currentParameters,
      [paramName]: value
    };
    
    setCurrentParameters(newParameters);
    
    if (onParameterChange) {
      onParameterChange(paramName, value);
    }
  };

  // Function to handle slider changes
  const handleSliderChange = (paramName) => (event, newValue) => {
    handleParamChange(paramName, newValue);
  };

  // Function to handle text input changes
  const handleInputChange = (paramName) => (event) => {
    const value = event.target.value === '' ? '' : Number(event.target.value);
    if (value !== '' && !isNaN(value)) {
      handleParamChange(paramName, value);
    }
  };

  // Calculate properties based on current parameters
  const properties = calculateProperties();

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="distribution-type-label">Distribution Type</InputLabel>
            <Select
              labelId="distribution-type-label"
              id="distribution-type-select"
              value={distributionType}
              label="Distribution Type"
              onChange={handleDistributionTypeChange}
            >
              <MenuItem value="NORMAL">Normal (Gaussian) Distribution</MenuItem>
              <MenuItem value="POISSON">Poisson Distribution</MenuItem>
              <MenuItem value="BINOMIAL">Binomial Distribution</MenuItem>
              <MenuItem value="EXPONENTIAL">Exponential Distribution</MenuItem>
              <MenuItem value="UNIFORM">Uniform Distribution</MenuItem>
              <MenuItem value="GAMMA">Gamma Distribution</MenuItem>
              <MenuItem value="BETA">Beta Distribution</MenuItem>
              <MenuItem value="LOGNORMAL">Log-Normal Distribution</MenuItem>
              <MenuItem value="WEIBULL">Weibull Distribution</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Parameters
          </Typography>
          
          {/* Reuse the existing ParameterControl rendering logic */}
          {(() => {
            // Function to render the appropriate parameter inputs based on distribution type
            switch (distributionType) {
              case 'NORMAL':
                return (
                  <>
                    <ParameterControl
                      label="Mean (μ)"
                      paramName="mean"
                      value={currentParameters.mean}
                      min={-10}
                      max={10}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The mean determines the center of the normal distribution"
                    />
                    <ParameterControl
                      label="Standard Deviation (σ)"
                      paramName="std"
                      value={currentParameters.std}
                      min={0.1}
                      max={5}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The standard deviation determines the spread of the normal distribution"
                      minValue={0.1} // Standard deviation can't be negative or zero
                    />
                  </>
                );
              
              case 'BINOMIAL':
                return (
                  <>
                    <ParameterControl
                      label="Number of Trials (n)"
                      paramName="n"
                      value={currentParameters.n}
                      min={1}
                      max={100}
                      step={1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The number of independent trials performed"
                      minValue={1} // n must be at least 1
                      isInteger={true}
                    />
                    <ParameterControl
                      label="Success Probability (p)"
                      paramName="p"
                      value={currentParameters.p}
                      min={0}
                      max={1}
                      step={0.01}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The probability of success in a single trial"
                      minValue={0}
                      maxValue={1}
                    />
                  </>
                );
              
              case 'POISSON':
                return (
                  <ParameterControl
                    label="Rate (λ)"
                    paramName="lambda"
                    value={currentParameters.lambda}
                    min={0.1}
                    max={20}
                    step={0.1}
                    onSliderChange={handleSliderChange}
                    onInputChange={handleInputChange}
                    tooltip="The average number of events in the given interval"
                    minValue={0.1} // Lambda should be positive
                  />
                );
              
              case 'EXPONENTIAL':
                return (
                  <ParameterControl
                    label="Rate (λ)"
                    paramName="rate"
                    value={currentParameters.rate}
                    min={0.1}
                    max={5}
                    step={0.1}
                    onSliderChange={handleSliderChange}
                    onInputChange={handleInputChange}
                    tooltip="The rate parameter of the exponential distribution"
                    minValue={0.1} // Rate should be positive
                  />
                );
              
              case 'UNIFORM':
                return (
                  <>
                    <ParameterControl
                      label="Minimum (a)"
                      paramName="a"
                      value={currentParameters.a}
                      min={-10}
                      max={currentParameters.b - 0.1}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The lower bound of the uniform distribution"
                      maxValue={currentParameters.b - 0.1} // a must be less than b
                    />
                    <ParameterControl
                      label="Maximum (b)"
                      paramName="b"
                      value={currentParameters.b}
                      min={currentParameters.a + 0.1}
                      max={10}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The upper bound of the uniform distribution"
                      minValue={currentParameters.a + 0.1} // b must be greater than a
                    />
                  </>
                );
              
              case 'GAMMA':
                return (
                  <>
                    <ParameterControl
                      label="Shape (k)"
                      paramName="shape"
                      value={currentParameters.shape}
                      min={0.1}
                      max={10}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The shape parameter of the gamma distribution"
                      minValue={0.1} // Shape should be positive
                    />
                    <ParameterControl
                      label="Scale (θ)"
                      paramName="scale"
                      value={currentParameters.scale}
                      min={0.1}
                      max={5}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The scale parameter of the gamma distribution"
                      minValue={0.1} // Scale should be positive
                    />
                  </>
                );
              
              case 'BETA':
                return (
                  <>
                    <ParameterControl
                      label="Alpha (α)"
                      paramName="alpha"
                      value={currentParameters.alpha}
                      min={0.1}
                      max={10}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The first shape parameter of the beta distribution"
                      minValue={0.1} // Alpha should be positive
                    />
                    <ParameterControl
                      label="Beta (β)"
                      paramName="beta"
                      value={currentParameters.beta}
                      min={0.1}
                      max={10}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The second shape parameter of the beta distribution"
                      minValue={0.1} // Beta should be positive
                    />
                  </>
                );
              
              case 'LOGNORMAL':
                return (
                  <>
                    <ParameterControl
                      label="Log Mean (μ)"
                      paramName="mean"
                      value={currentParameters.mean}
                      min={-2}
                      max={2}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The mean of the log of the random variable"
                    />
                    <ParameterControl
                      label="Log Standard Deviation (σ)"
                      paramName="sigma"
                      value={currentParameters.sigma}
                      min={0.1}
                      max={2}
                      step={0.05}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The standard deviation of the log of the random variable"
                      minValue={0.1} // Sigma should be positive
                    />
                  </>
                );
              
              case 'WEIBULL':
                return (
                  <>
                    <ParameterControl
                      label="Shape (k)"
                      paramName="shape"
                      value={currentParameters.shape}
                      min={0.1}
                      max={5}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The shape parameter of the Weibull distribution"
                      minValue={0.1} // Shape should be positive
                    />
                    <ParameterControl
                      label="Scale (λ)"
                      paramName="scale"
                      value={currentParameters.scale}
                      min={0.1}
                      max={10}
                      step={0.1}
                      onSliderChange={handleSliderChange}
                      onInputChange={handleInputChange}
                      tooltip="The scale parameter of the Weibull distribution"
                      minValue={0.1} // Scale should be positive
                    />
                  </>
                );
                
              // Add more cases for other distribution types as needed
              
              default:
                return (
                  <Typography variant="body2" color="text.secondary">
                    No parameters available for this distribution type.
                  </Typography>
                );
            }
          })()}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle1" gutterBottom>
            Properties
          </Typography>
          
          <Grid container spacing={2}>
            {Object.entries(properties).map(([key, value]) => (
              <Grid item xs={6} key={key}>
                <Typography variant="body2" color="text.secondary">
                  <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {
                    typeof value === 'number' 
                      ? (Math.abs(value) < 0.0001 ? '0' : value.toFixed(4)) 
                      : value
                  }
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

// Reusable parameter control component - reuse the existing implementation
const ParameterControl = ({ 
  label, 
  paramName, 
  value, 
  min, 
  max, 
  step, 
  onSliderChange, 
  onInputChange,
  tooltip,
  minValue,
  maxValue,
  isInteger = false
}) => {
  // Ensure the value is within constraints if provided
  const constrainedValue = React.useMemo(() => {
    let result = value;
    
    if (minValue !== undefined && result < minValue) {
      result = minValue;
    }
    
    if (maxValue !== undefined && result > maxValue) {
      result = maxValue;
    }
    
    if (isInteger) {
      result = Math.round(result);
    }
    
    return result;
  }, [value, minValue, maxValue, isInteger]);
  
  // Update the value if it's been constrained
  React.useEffect(() => {
    if (value !== constrainedValue) {
      onInputChange(paramName)({ target: { value: constrainedValue } });
    }
  }, [value, constrainedValue, paramName, onInputChange]);

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography id={`${paramName}-slider-label`} variant="body2">
          {label}
        </Typography>
        <Tooltip title={tooltip}>
          <IconButton size="small" sx={{ ml: 0.5 }}>
            <InfoIcon fontSize="small" color="action" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Slider
          value={constrainedValue}
          min={min}
          max={max}
          step={step}
          onChange={onSliderChange(paramName)}
          aria-labelledby={`${paramName}-slider-label`}
          sx={{ flexGrow: 1, mr: 2 }}
        />
        
        <TextField
          value={constrainedValue}
          onChange={onInputChange(paramName)}
          inputProps={{
            step,
            min: minValue !== undefined ? minValue : min,
            max: maxValue !== undefined ? maxValue : max,
            type: 'number',
            'aria-labelledby': `${paramName}-slider-label`,
          }}
          variant="outlined"
          size="small"
          sx={{ width: '90px' }}
        />
      </Box>
    </Box>
  );
};

export default DistributionParameters;