import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Divider,
  Card,
  CardContent,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Slider,
  RadioGroup,
  Radio,
  FormLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  BarChart, 
  ShowChart, 
  Timeline, 
  PieChart, 
  Analytics, 
  Help,
  Info
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Styled components
const ChartTypeCard = styled(Card)(({ theme, selected }) => ({
  height: '100%',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
  backgroundColor: selected ? theme.palette.primary.lightest || theme.palette.action.selected : theme.palette.background.paper,
  '&:hover': {
    transform: selected ? 'scale(1)' : 'translateY(-4px)',
    boxShadow: selected ? theme.shadows[4] : theme.shadows[8]
  }
}));

const FormPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  marginTop: theme.spacing(3)
}));

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

// Chart type definitions
const CHART_TYPES = [
  {
    id: 'xbar_r',
    name: 'X̄-R Chart',
    icon: <BarChart />,
    description: 'Monitor process mean and variability using subgroup means and ranges.',
    recommendedFor: 'Variables data with subgroups of 2-9 samples.',
    example: 'Manufacturing process measurements taken in batches.'
  },
  {
    id: 'xbar_s',
    name: 'X̄-S Chart',
    icon: <Analytics />,
    description: 'Monitor process mean and variability using subgroup means and standard deviations.',
    recommendedFor: 'Variables data with larger subgroups (n > 9).',
    example: 'High-precision processes with larger sample sizes.'
  },
  {
    id: 'i_mr',
    name: 'I-MR Chart',
    icon: <ShowChart />,
    description: 'Monitor individual measurements and moving ranges for processes with no natural subgroups.',
    recommendedFor: 'Individual measurements taken over time.',
    example: 'Continuous processes, limited sampling, or destructive testing.'
  },
  {
    id: 'p',
    name: 'p Chart',
    icon: <PieChart />,
    description: 'Monitor proportion of defective units with variable or constant sample sizes.',
    recommendedFor: 'Attribute data (pass/fail or conforming/nonconforming).',
    example: 'Fraction defective in quality inspection.'
  }
];

/**
 * Chart Configuration Step Component
 * 
 * Allows users to configure control chart parameters for SQC analysis
 * 
 * @param {Object} props Component props
 * @param {Object} props.dataset The uploaded dataset
 * @param {Object} props.configuration Current configuration
 * @param {Function} props.onChange Callback when configuration changes
 * @param {Function} props.onSubmit Callback when configuration is submitted
 * @param {boolean} props.isSubmitting Loading state for submission
 */
const ChartConfigurationStep = ({ 
  dataset, 
  configuration, 
  onChange, 
  onSubmit, 
  isSubmitting 
}) => {
  const theme = useTheme();
  
  // State for validation
  const [errors, setErrors] = useState({});
  
  // Numeric and categorical columns
  const [numericColumns, setNumericColumns] = useState([]);
  const [categoricalColumns, setCategoricalColumns] = useState([]);
  
  // Extract column information from dataset
  useEffect(() => {
    if (dataset && dataset.headers && dataset.columnTypes) {
      const numeric = [];
      const categorical = [];
      
      dataset.headers.forEach(header => {
        const columnType = dataset.columnTypes[header]?.type || 'unknown';
        
        if (columnType === 'numeric') {
          numeric.push(header);
        } else {
          categorical.push(header);
        }
      });
      
      setNumericColumns(numeric);
      setCategoricalColumns(categorical);
    }
  }, [dataset]);
  
  // Handle chart type selection
  const handleChartTypeSelect = (chartType) => {
    onChange({ chartType });
    
    // Reset form errors
    setErrors({});
  };
  
  // Handle form change
  const handleFormChange = (field, value) => {
    onChange({ [field]: value });
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields based on chart type
    if (configuration.chartType === 'xbar_r' || configuration.chartType === 'xbar_s') {
      if (!configuration.parameterColumn) {
        newErrors.parameterColumn = 'Please select a measurement column';
      }
      
      if (!configuration.groupingColumn) {
        newErrors.groupingColumn = 'Please select a subgroup column';
      }
      
      if (!configuration.sampleSize || configuration.sampleSize < 2) {
        newErrors.sampleSize = 'Sample size must be at least 2';
      }
      
      if (configuration.chartType === 'xbar_r' && configuration.sampleSize > 9) {
        newErrors.sampleSize = 'For sample sizes > 9, X̄-S chart is recommended';
      }
    } else if (configuration.chartType === 'i_mr') {
      if (!configuration.parameterColumn) {
        newErrors.parameterColumn = 'Please select a measurement column';
      }
    } else if (configuration.chartType === 'p') {
      if (!configuration.parameterColumn) {
        newErrors.parameterColumn = 'Please select a column with defective counts';
      }
      
      if (!configuration.groupingColumn && !configuration.sampleSize) {
        newErrors.groupingColumn = 'Please select a sample size column or enter a fixed sample size';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit();
    }
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <motion.div variants={itemVariants}>
            <Typography variant="h5" gutterBottom>
              Configure Control Chart
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Select the type of control chart and configure parameters for your SQC analysis.
            </Typography>
          </motion.div>
        </Grid>
        
        {/* Chart Type Selection */}
        <Grid item xs={12}>
          <motion.div variants={itemVariants}>
            <Typography variant="h6" gutterBottom>
              1. Select Chart Type
            </Typography>
            
            <Grid container spacing={2}>
              {CHART_TYPES.map((chartType) => (
                <Grid item xs={12} sm={6} md={3} key={chartType.id}>
                  <ChartTypeCard
                    selected={configuration.chartType === chartType.id}
                    onClick={() => handleChartTypeSelect(chartType.id)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box 
                          sx={{ 
                            color: 'primary.main', 
                            mr: 1,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {chartType.icon}
                        </Box>
                        <Typography variant="h6" component="div">
                          {chartType.name}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {chartType.description}
                      </Typography>
                      
                      <Typography variant="caption" color="text.primary" sx={{ display: 'block', fontWeight: 'medium' }}>
                        Recommended for:
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {chartType.recommendedFor}
                      </Typography>
                    </CardContent>
                  </ChartTypeCard>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Grid>
        
        {/* Chart Parameters */}
        <Grid item xs={12}>
          <motion.div variants={itemVariants}>
            <Typography variant="h6" gutterBottom>
              2. Configure Chart Parameters
            </Typography>
            
            <FormPaper>
              <Grid container spacing={3}>
                {/* X-bar R and X-bar S Charts */}
                {(configuration.chartType === 'xbar_r' || configuration.chartType === 'xbar_s') && (
                  <>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={!!errors.parameterColumn}>
                        <InputLabel>Measurement Column</InputLabel>
                        <Select
                          value={configuration.parameterColumn}
                          label="Measurement Column"
                          onChange={(e) => handleFormChange('parameterColumn', e.target.value)}
                        >
                          {numericColumns.map(column => (
                            <MenuItem key={column} value={column}>{column}</MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Select the column containing measurement values
                        </FormHelperText>
                        {errors.parameterColumn && (
                          <FormHelperText error>{errors.parameterColumn}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={!!errors.groupingColumn}>
                        <InputLabel>Subgroup Column</InputLabel>
                        <Select
                          value={configuration.groupingColumn}
                          label="Subgroup Column"
                          onChange={(e) => handleFormChange('groupingColumn', e.target.value)}
                        >
                          {categoricalColumns.map(column => (
                            <MenuItem key={column} value={column}>{column}</MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Select the column that defines subgroups (batches, lots, etc.)
                        </FormHelperText>
                        {errors.groupingColumn && (
                          <FormHelperText error>{errors.groupingColumn}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography id="sample-size-slider" gutterBottom>
                        Sample Size
                        <Tooltip title="Number of samples per subgroup. For X̄-R charts, sample sizes between 2-9 are recommended. For larger samples, use X̄-S charts.">
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <Info fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Typography>
                      <Slider
                        value={configuration.sampleSize}
                        onChange={(e, newValue) => handleFormChange('sampleSize', newValue)}
                        step={1}
                        marks
                        min={2}
                        max={15}
                        valueLabelDisplay="auto"
                        aria-labelledby="sample-size-slider"
                      />
                      {errors.sampleSize && (
                        <FormHelperText error>{errors.sampleSize}</FormHelperText>
                      )}
                      
                      {configuration.chartType === 'xbar_r' && configuration.sampleSize > 9 && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          For sample sizes larger than 9, X̄-S charts are generally more appropriate
                        </Alert>
                      )}
                    </Grid>
                  </>
                )}
                
                {/* I-MR Chart */}
                {configuration.chartType === 'i_mr' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={!!errors.parameterColumn}>
                        <InputLabel>Measurement Column</InputLabel>
                        <Select
                          value={configuration.parameterColumn}
                          label="Measurement Column"
                          onChange={(e) => handleFormChange('parameterColumn', e.target.value)}
                        >
                          {numericColumns.map(column => (
                            <MenuItem key={column} value={column}>{column}</MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Select the column containing individual measurement values
                        </FormHelperText>
                        {errors.parameterColumn && (
                          <FormHelperText error>{errors.parameterColumn}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Time/Sequence Column (Optional)</InputLabel>
                        <Select
                          value={configuration.timeColumn || ''}
                          label="Time/Sequence Column (Optional)"
                          onChange={(e) => handleFormChange('timeColumn', e.target.value)}
                        >
                          <MenuItem value="">
                            <em>None (use row order)</em>
                          </MenuItem>
                          {dataset.headers.map(column => (
                            <MenuItem key={column} value={column}>{column}</MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Optional: Select a column with time or sequence information
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mt: 1 }}>
                        I-MR charts are used for individual measurements when data is not naturally grouped. 
                        The data should be in time order for meaningful analysis.
                      </Alert>
                    </Grid>
                  </>
                )}
                
                {/* p Chart */}
                {configuration.chartType === 'p' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={!!errors.parameterColumn}>
                        <InputLabel>Defective Count Column</InputLabel>
                        <Select
                          value={configuration.parameterColumn}
                          label="Defective Count Column"
                          onChange={(e) => handleFormChange('parameterColumn', e.target.value)}
                        >
                          {numericColumns.map(column => (
                            <MenuItem key={column} value={column}>{column}</MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Select the column containing counts of defective items
                        </FormHelperText>
                        {errors.parameterColumn && (
                          <FormHelperText error>{errors.parameterColumn}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={!!errors.groupingColumn}>
                        <InputLabel>Sample Size Column</InputLabel>
                        <Select
                          value={configuration.groupingColumn || ''}
                          label="Sample Size Column"
                          onChange={(e) => handleFormChange('groupingColumn', e.target.value)}
                        >
                          <MenuItem value="">
                            <em>Use fixed sample size</em>
                          </MenuItem>
                          {numericColumns.map(column => (
                            <MenuItem key={column} value={column}>{column}</MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          Select column with sample sizes or use a fixed size below
                        </FormHelperText>
                        {errors.groupingColumn && (
                          <FormHelperText error>{errors.groupingColumn}</FormHelperText>
                        )}
                      </FormControl>
                      
                      {!configuration.groupingColumn && (
                        <TextField
                          label="Fixed Sample Size"
                          type="number"
                          value={configuration.sampleSize || ''}
                          onChange={(e) => handleFormChange('sampleSize', parseInt(e.target.value, 10))}
                          fullWidth
                          margin="normal"
                          error={!!errors.sampleSize}
                          helperText={errors.sampleSize || 'Enter the sample size if it is constant across all points'}
                          inputProps={{ min: 1 }}
                        />
                      )}
                    </Grid>
                  </>
                )}
                
                {/* Common Control Chart Options */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    3. Advanced Options
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Control Rule Detection</FormLabel>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={configuration.detectRules}
                          onChange={(e) => handleFormChange('detectRules', e.target.checked)}
                        />
                      }
                      label="Detect control rule violations"
                    />
                    
                    {configuration.detectRules && (
                      <RadioGroup
                        value={configuration.ruleSet}
                        onChange={(e) => handleFormChange('ruleSet', e.target.value)}
                      >
                        <FormControlLabel 
                          value="western_electric" 
                          control={<Radio size="small" />} 
                          label="Western Electric Rules" 
                        />
                        <FormControlLabel 
                          value="nelson" 
                          control={<Radio size="small" />} 
                          label="Nelson Rules" 
                        />
                      </RadioGroup>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Custom Control Limits (Optional)</FormLabel>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!configuration.useCustomLimits}
                          onChange={(e) => handleFormChange('useCustomLimits', e.target.checked)}
                        />
                      }
                      label="Specify custom control limits"
                    />
                    
                    {configuration.useCustomLimits && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Upper Control Limit"
                            type="number"
                            value={configuration.upperControlLimit || ''}
                            onChange={(e) => handleFormChange('upperControlLimit', parseFloat(e.target.value))}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Lower Control Limit"
                            type="number"
                            value={configuration.lowerControlLimit || ''}
                            onChange={(e) => handleFormChange('lowerControlLimit', parseFloat(e.target.value))}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Center Line"
                            type="number"
                            value={configuration.centerLine || ''}
                            onChange={(e) => handleFormChange('centerLine', parseFloat(e.target.value))}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
            </FormPaper>
          </motion.div>
        </Grid>
        
        {/* Submit Button */}
        <Grid item xs={12}>
          <motion.div variants={itemVariants}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleSubmit}
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <BarChart />}
              >
                {isSubmitting ? 'Processing...' : 'Generate Control Chart'}
              </Button>
            </Box>
          </motion.div>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default ChartConfigurationStep;