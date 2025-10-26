/**
 * Transformation Wizard
 * ====================
 * Multi-step wizard for data transformation to fix assumption violations.
 * Provides intelligent suggestions, visualizations, and application.
 *
 * Author: StickForStats Development Team
 * Date: October 2025
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Box,
  Paper,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  ReferenceLine,
  Legend
} from 'recharts';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';

import TransformationService from '../../services/TransformationService';

/**
 * Transformation Wizard Component
 *
 * Props:
 * - open: boolean (dialog open state)
 * - onClose: function (close handler)
 * - data: Array<number> | Array<Array<number>> (data to transform)
 * - violations: Array (Guardian violations)
 * - onTransformComplete: function (callback with transformed data)
 */
const TransformationWizard = ({
  open,
  onClose,
  data,
  violations = [],
  onTransformComplete
}) => {
  // Wizard steps
  const steps = ['Analysis', 'Suggestion', 'Preview', 'Apply'];
  const [activeStep, setActiveStep] = useState(0);

  // State management
  const [flattenedData, setFlattenedData] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [selectedTransformation, setSelectedTransformation] = useState(null);
  const [transformedData, setTransformedData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportLanguage, setExportLanguage] = useState('python');

  // Flatten data on mount
  useEffect(() => {
    if (data) {
      const flattened = TransformationService.flattenData(data);
      setFlattenedData(flattened);
    }
  }, [data]);

  // Auto-fetch suggestion when data available
  useEffect(() => {
    if (flattenedData.length > 0 && activeStep === 1 && !suggestion) {
      fetchSuggestion();
    }
  }, [flattenedData, activeStep, suggestion]);

  /**
   * Fetch transformation suggestion from API
   */
  const fetchSuggestion = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await TransformationService.suggestTransformation(
        flattenedData,
        'normality'
      );

      if (result.success) {
        setSuggestion(result.data);
        setSelectedTransformation(result.data.recommended);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to get transformation suggestion');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Apply selected transformation
   */
  const applyTransformation = async () => {
    if (!selectedTransformation) return;

    setIsLoading(true);
    setError(null);

    try {
      // Apply transformation
      const result = await TransformationService.applyTransformation(
        flattenedData,
        selectedTransformation,
        {}
      );

      if (result.success && result.data.success) {
        setTransformedData(result.data);

        // Validate transformation
        const validationResult = await TransformationService.validateTransformation(
          flattenedData,
          result.data.transformed_data
        );

        if (validationResult.success) {
          setValidation(validationResult.data);
        }
      } else {
        setError(result.error || result.data.message);
      }
    } catch (err) {
      setError('Failed to apply transformation');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calculate Q-Q plot data for visualization
   */
  const calculateQQData = (dataArray) => {
    const sorted = [...dataArray].sort((a, b) => a - b);
    const n = sorted.length;

    return sorted.map((value, index) => {
      // Theoretical quantiles (z-scores)
      const p = (index + 0.5) / n;
      const z = calculateNormalQuantile(p);

      return {
        theoretical: z,
        sample: value
      };
    });
  };

  /**
   * Approximate normal quantile (inverse CDF)
   */
  const calculateNormalQuantile = (p) => {
    // Beasley-Springer-Moro approximation
    const a0 = 2.50662823884;
    const a1 = -18.61500062529;
    const a2 = 41.39119773534;
    const a3 = -25.44106049637;

    const b0 = -8.47351093090;
    const b1 = 23.08336743743;
    const b2 = -21.06224101826;
    const b3 = 3.13082909833;

    const c0 = 0.3374754822726147;
    const c1 = 0.9761690190917186;
    const c2 = 0.1607979714918209;
    const c3 = 0.0276438810333863;
    const c4 = 0.0038405729373609;
    const c5 = 0.0003951896511919;
    const c6 = 0.0000321767881768;
    const c7 = 0.0000002888167364;
    const c8 = 0.0000003960315187;

    let y = p - 0.5;
    let r, x;

    if (Math.abs(y) < 0.42) {
      r = y * y;
      x = y * (((a3 * r + a2) * r + a1) * r + a0) / ((((b3 * r + b2) * r + b1) * r + b0) * r + 1);
    } else {
      r = p;
      if (y > 0) r = 1 - p;
      r = Math.log(-Math.log(r));
      x = c0 + r * (c1 + r * (c2 + r * (c3 + r * (c4 + r * (c5 + r * (c6 + r * (c7 + r * c8)))))));
      if (y < 0) x = -x;
    }

    return x;
  };

  /**
   * Generate Q-Q plots for before and after
   */
  const qqPlotBefore = useMemo(() => {
    if (flattenedData.length === 0) return [];
    return calculateQQData(flattenedData);
  }, [flattenedData]);

  const qqPlotAfter = useMemo(() => {
    if (!transformedData || !transformedData.transformed_data) return [];
    return calculateQQData(transformedData.transformed_data);
  }, [transformedData]);

  /**
   * Export transformation code
   */
  const handleExportCode = async () => {
    if (!transformedData) return;

    const result = await TransformationService.exportCode(
      transformedData.transformation,
      transformedData.parameters,
      exportLanguage
    );

    if (result.success) {
      TransformationService.downloadCodeFile(result.code, exportLanguage);
    }
  };

  /**
   * Complete transformation and close
   */
  const handleComplete = () => {
    if (transformedData && onTransformComplete) {
      onTransformComplete(transformedData.transformed_data);
    }
    handleClose();
  };

  /**
   * Close and reset wizard
   */
  const handleClose = () => {
    setActiveStep(0);
    setSuggestion(null);
    setSelectedTransformation(null);
    setTransformedData(null);
    setValidation(null);
    setError(null);
    onClose();
  };

  /**
   * Navigation handlers
   */
  const handleNext = () => {
    if (activeStep === 2 && !transformedData) {
      // Apply transformation before moving to step 3
      applyTransformation();
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  /**
   * Render step content
   */
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderAnalysisStep();
      case 1:
        return renderSuggestionStep();
      case 2:
        return renderPreviewStep();
      case 3:
        return renderApplyStep();
      default:
        return null;
    }
  };

  /**
   * Step 1: Analysis
   */
  const renderAnalysisStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
        <InfoIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Current Data Analysis
      </Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Violations Detected:</strong> {violations.length} assumption violation(s)
        </Typography>
      </Alert>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Data Statistics
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Sample Size (n)</TableCell>
                    <TableCell align="right">{flattenedData.length}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Mean</TableCell>
                    <TableCell align="right">
                      {(flattenedData.reduce((a, b) => a + b, 0) / flattenedData.length).toFixed(3)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Min</TableCell>
                    <TableCell align="right">{Math.min(...flattenedData).toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Max</TableCell>
                    <TableCell align="right">{Math.max(...flattenedData).toFixed(3)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Violations
            </Typography>
            {violations.map((violation, index) => (
              <Chip
                key={index}
                label={violation.assumption || violation.test_name || 'Violation'}
                color="error"
                size="small"
                sx={{ m: 0.5 }}
              />
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Q-Q Plot: Current Data
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="theoretical"
                  name="Theoretical Quantiles"
                  label={{ value: 'Theoretical Quantiles', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  dataKey="sample"
                  name="Sample Quantiles"
                  label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft' }}
                />
                <RechartsTooltip />
                <Scatter data={qqPlotBefore} fill="#1976d2" />
                <Line
                  data={[
                    { theoretical: -3, sample: -3 },
                    { theoretical: 3, sample: 3 }
                  ]}
                  dataKey="sample"
                  stroke="red"
                  strokeWidth={2}
                  dot={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              Points should follow the red line for normal distribution
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  /**
   * Step 2: Suggestion
   */
  const renderSuggestionStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
        <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Transformation Recommendation
      </Typography>

      {isLoading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Analyzing data characteristics...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {suggestion && !isLoading && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2, bgcolor: '#e3f2fd' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Recommended: {TransformationService.getTransformationDisplayName(suggestion.recommended)}
              </Typography>
              <Typography variant="body2" paragraph>
                {suggestion.reason}
              </Typography>
              <Chip
                label={`Expected Improvement: ${suggestion.expected_improvement}%`}
                color="success"
                sx={{ mr: 1 }}
              />
              <Chip
                label={`Current p-value: ${suggestion.current_p_value}`}
                color="warning"
                sx={{ mr: 1 }}
              />
              <Chip
                label={`Estimated p-value: ${suggestion.estimated_p_value}`}
                color="info"
              />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Select Transformation</InputLabel>
              <Select
                value={selectedTransformation || suggestion.recommended}
                label="Select Transformation"
                onChange={(e) => setSelectedTransformation(e.target.value)}
              >
                <MenuItem value={suggestion.recommended}>
                  {TransformationService.getTransformationDisplayName(suggestion.recommended)} (Recommended)
                </MenuItem>
                {suggestion.alternatives && suggestion.alternatives.map((alt) => (
                  <MenuItem key={alt} value={alt}>
                    {TransformationService.getTransformationDisplayName(alt)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                About This Transformation:
              </Typography>
              <Typography variant="body2">
                {TransformationService.getTransformationDescription(selectedTransformation || suggestion.recommended)}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Statistic</strong></TableCell>
                    <TableCell align="right"><strong>Value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Current Skewness</TableCell>
                    <TableCell align="right">{suggestion.current_skewness}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Current Kurtosis</TableCell>
                    <TableCell align="right">{suggestion.current_kurtosis}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Data Range</TableCell>
                    <TableCell align="right">
                      [{suggestion.min_value}, {suggestion.max_value}]
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  /**
   * Step 3: Preview
   */
  const renderPreviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
        <CompareArrowsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Before & After Comparison
      </Typography>

      {isLoading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Applying transformation...
          </Typography>
        </Box>
      )}

      {transformedData && validation && !isLoading && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert
              severity={validation.improvement ? 'success' : 'warning'}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                <strong>
                  {validation.improvement
                    ? `✓ Transformation improved normality! (Score: ${validation.improvement_score}%)`
                    : '⚠ Transformation may not have improved normality significantly'
                  }
                </strong>
              </Typography>
            </Alert>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                Before Transformation
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="theoretical" name="Theoretical" />
                  <YAxis dataKey="sample" name="Sample" />
                  <RechartsTooltip />
                  <Scatter data={qqPlotBefore} fill="#d32f2f" />
                  <Line
                    data={[{ theoretical: -3, sample: -3 }, { theoretical: 3, sample: 3 }]}
                    dataKey="sample"
                    stroke="black"
                    strokeWidth={2}
                    dot={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Shapiro-Wilk p = {validation.original_p_value}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                After Transformation
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="theoretical" name="Theoretical" />
                  <YAxis dataKey="sample" name="Sample" />
                  <RechartsTooltip />
                  <Scatter data={qqPlotAfter} fill="#2e7d32" />
                  <Line
                    data={[{ theoretical: -3, sample: -3 }, { theoretical: 3, sample: 3 }]}
                    dataKey="sample"
                    stroke="black"
                    strokeWidth={2}
                    dot={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Shapiro-Wilk p = {validation.transformed_p_value}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Metric</strong></TableCell>
                    <TableCell align="right"><strong>Before</strong></TableCell>
                    <TableCell align="right"><strong>After</strong></TableCell>
                    <TableCell align="right"><strong>Change</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Shapiro-Wilk p-value</TableCell>
                    <TableCell align="right">{validation.original_p_value}</TableCell>
                    <TableCell align="right">{validation.transformed_p_value}</TableCell>
                    <TableCell align="right" sx={{ color: validation.improvement ? 'green' : 'orange' }}>
                      {validation.improvement ? '✓ Improved' : '⚠ Check'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Skewness</TableCell>
                    <TableCell align="right">{validation.skewness_before}</TableCell>
                    <TableCell align="right">{validation.skewness_after}</TableCell>
                    <TableCell align="right">
                      {(Math.abs(validation.skewness_before) - Math.abs(validation.skewness_after)).toFixed(3)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Kurtosis</TableCell>
                    <TableCell align="right">{validation.kurtosis_before}</TableCell>
                    <TableCell align="right">{validation.kurtosis_after}</TableCell>
                    <TableCell align="right">
                      {(Math.abs(validation.kurtosis_before) - Math.abs(validation.kurtosis_after)).toFixed(3)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {validation.still_violated && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Note:</strong> While the transformation improved normality, the Shapiro-Wilk test still indicates
                  some deviation (p &lt; 0.05). Consider using robust/non-parametric methods, or try a different transformation.
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );

  /**
   * Step 4: Apply
   */
  const renderApplyStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
        <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Ready to Apply
      </Typography>

      <Alert severity="success" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Transformation Complete!</strong> Your data has been transformed using{' '}
          {transformedData && TransformationService.getTransformationDisplayName(transformedData.transformation)}.
        </Typography>
      </Alert>

      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Transformation Details
        </Typography>
        {transformedData && (
          <Box>
            <Typography variant="body2" paragraph>
              <strong>Type:</strong> {TransformationService.getTransformationDisplayName(transformedData.transformation)}
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Formula:</strong> {transformedData.inverse_formula}
            </Typography>
            {transformedData.parameters && Object.keys(transformedData.parameters).length > 0 && (
              <Typography variant="body2">
                <strong>Parameters:</strong> {JSON.stringify(transformedData.parameters)}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          <CodeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Export Transformation Code
        </Typography>
        <Typography variant="body2" paragraph color="text.secondary">
          Generate reproducible code for your transformation to include in publications.
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select
                value={exportLanguage}
                label="Language"
                onChange={(e) => setExportLanguage(e.target.value)}
              >
                <MenuItem value="python">Python</MenuItem>
                <MenuItem value="r">R</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<CodeIcon />}
              onClick={handleExportCode}
            >
              Download Code
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="info">
        <Typography variant="body2">
          <strong>Next Steps:</strong>
        </Typography>
        <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
          <li>Click "Apply & Close" to use the transformed data</li>
          <li>Re-run Guardian validation to verify assumptions are met</li>
          <li>Proceed with your statistical test</li>
          <li>Document the transformation in your methods section</li>
        </Typography>
      </Alert>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AutoFixHighIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Data Transformation Wizard</Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Stepper activeStep={activeStep} sx={{ pt: 3, px: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <DialogContent sx={{ mt: 2 }}>
        {renderStepContent()}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          color="inherit"
        >
          Back
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isLoading || (activeStep === 1 && !selectedTransformation)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleComplete}
            startIcon={<CheckCircleIcon />}
          >
            Apply & Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransformationWizard;
