/**
 * Regression Calculator Component
 * ================================
 * Complete UI for performing various types of regression analysis with 50 decimal precision
 * Supports linear, multiple, polynomial, logistic, and robust regression
 *
 * Features:
 * - Multiple regression types (linear, multiple, polynomial, logistic, ridge, lasso, robust)
 * - Interactive data input with validation
 * - Model diagnostics and assumption checking
 * - Residual analysis and visualization
 * - 50 decimal precision display
 * - Model comparison and selection
 * - Prediction interface
 * - Export to publication-ready formats
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Tooltip,
  IconButton,
  Divider,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';

import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  GetApp as GetAppIcon,
  Help as HelpIcon,
  ShowChart as ShowChartIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Functions as FunctionsIcon,
  ScatterPlot as ScatterPlotIcon,
  TableChart as TableChartIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Calculate as CalculateIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';

// Import utilities
import Decimal from 'decimal.js';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Import service
import { RegressionAnalysisService } from '../../services/RegressionAnalysisService';
import GuardianService from '../../services/GuardianService';
import GuardianWarning from '../Guardian/GuardianWarning';

// Configure Decimal precision
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

const RegressionCalculator = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [regressionType, setRegressionType] = useState('linear');
  const [dataInput, setDataInput] = useState({
    dependentVariable: '',
    independentVariables: [''],
    dataFormat: 'manual', // manual, paste, file
    rawData: ''
  });

  const [dataPoints, setDataPoints] = useState({
    y: [], // dependent variable values
    X: [[]], // independent variable values (matrix for multiple regression)
    variableNames: {
      dependent: 'Y',
      independent: ['X1']
    }
  });

  const [modelOptions, setModelOptions] = useState({
    includeIntercept: true,
    confidenceLevel: 0.95,
    polynomialDegree: 2,
    regularizationParam: 0.01,
    crossValidation: false,
    kFolds: 5,
    testSize: 0.2,
    randomState: 42,
    robustMethod: 'huber',
    logisticSolver: 'newton-cg',
    maxIterations: 1000,
    tolerance: 0.0001,
    elasticNetRatio: 0.5
  });

  const [predictionInput, setPredictionInput] = useState({
    values: {},
    includePredictionInterval: true,
    predictionLevel: 0.95
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFullPrecision, setShowFullPrecision] = useState(false);
  const [displayPrecision, setDisplayPrecision] = useState(6);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [modelComparison, setModelComparison] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  // Guardian Integration State
  const [guardianResult, setGuardianResult] = useState(null);
  const [isCheckingAssumptions, setIsCheckingAssumptions] = useState(false);
  const [isTestBlocked, setIsTestBlocked] = useState(false);

  // Regression types configuration
  const regressionTypes = {
    linear: {
      name: 'Simple Linear Regression',
      description: 'Models linear relationship between one independent and one dependent variable',
      minVariables: 1,
      maxVariables: 1,
      icon: <TimelineIcon />
    },
    multiple: {
      name: 'Multiple Linear Regression',
      description: 'Models linear relationship between multiple independent variables and one dependent variable',
      minVariables: 2,
      maxVariables: null,
      icon: <ShowChartIcon />
    },
    polynomial: {
      name: 'Polynomial Regression',
      description: 'Models non-linear relationships using polynomial terms',
      minVariables: 1,
      maxVariables: 1,
      icon: <FunctionsIcon />
    },
    logistic: {
      name: 'Logistic Regression',
      description: 'Models binary outcomes using logistic function',
      minVariables: 1,
      maxVariables: null,
      icon: <TrendingUpIcon />
    },
    ridge: {
      name: 'Ridge Regression (L2)',
      description: 'Linear regression with L2 regularization to prevent overfitting',
      minVariables: 1,
      maxVariables: null,
      icon: <AssessmentIcon />
    },
    lasso: {
      name: 'Lasso Regression (L1)',
      description: 'Linear regression with L1 regularization for feature selection',
      minVariables: 1,
      maxVariables: null,
      icon: <AssessmentIcon />
    },
    elasticnet: {
      name: 'Elastic Net Regression',
      description: 'Combines L1 and L2 regularization',
      minVariables: 1,
      maxVariables: null,
      icon: <AssessmentIcon />
    },
    robust: {
      name: 'Robust Regression',
      description: 'Resistant to outliers using robust estimators',
      minVariables: 1,
      maxVariables: null,
      icon: <ScatterPlotIcon />
    }
  };

  // Service instance
  const regressionService = useMemo(() => new RegressionAnalysisService(), []);

  // Guardian: Validate linear regression assumptions
  useEffect(() => {
    const validateAssumptions = async () => {
      // Only validate linear and multiple linear regression (parametric with strict assumptions)
      // Skip polynomial, logistic, ridge, lasso, elasticnet, robust (different assumptions or robust to violations)
      if (!['linear', 'multiple'].includes(regressionType)) {
        setGuardianResult(null);
        setIsTestBlocked(false);
        return;
      }

      // Check if we have sufficient data
      if (!dataPoints.y || dataPoints.y.length < 3 ||
          !dataPoints.X || dataPoints.X.length < 3) {
        setGuardianResult(null);
        setIsTestBlocked(false);
        return;
      }

      try {
        setIsCheckingAssumptions(true);

        // For Guardian API, we need to format the data appropriately
        // Linear regression: single X variable
        // Multiple regression: multiple X variables
        let formattedData;
        if (regressionType === 'linear') {
          // Simple linear: extract first X variable
          formattedData = [
            dataPoints.X.map(row => row[0]), // X values (first column)
            dataPoints.y  // Y values
          ];
        } else {
          // Multiple regression: all X variables + Y
          const xTransposed = dataPoints.X[0].map((_, colIndex) =>
            dataPoints.X.map(row => row[colIndex])
          );
          formattedData = [...xTransposed, dataPoints.y];
        }

        // Call Guardian API for linear regression validation
        const result = await GuardianService.checkAssumptions(
          formattedData,
          'linear_regression',  // Test type for linear regression
          1 - modelOptions.confidenceLevel // alpha
        );

        setGuardianResult(result);

        // Block test if critical violations detected
        setIsTestBlocked(
          result.hasViolations && result.criticalViolations && result.criticalViolations.length > 0
        );

        console.log('[RegressionCalculator] Guardian validation result:', result);

      } catch (error) {
        console.error('[RegressionCalculator] Guardian validation error:', error);
        // Don't block on Guardian errors - allow test to proceed
        setGuardianResult(null);
        setIsTestBlocked(false);
      } finally {
        setIsCheckingAssumptions(false);
      }
    };

    validateAssumptions();
  }, [dataPoints.y, dataPoints.X, regressionType, modelOptions.confidenceLevel]);

  // Helper functions
  const formatNumber = useCallback((value, precision = displayPrecision) => {
    if (value === null || value === undefined) return 'N/A';
    try {
      const decimal = new Decimal(value.toString());
      if (showFullPrecision) {
        return decimal.toString();
      }
      return decimal.toFixed(precision);
    } catch (e) {
      return value.toString();
    }
  }, [displayPrecision, showFullPrecision]);

  const parseDataInput = useCallback(() => {
    try {
      if (dataInput.dataFormat === 'manual') {
        // Manual entry format: each row is "y, x1, x2, ..."
        const rows = dataInput.rawData.trim().split('\n').filter(row => row.trim());
        const parsedY = [];
        const parsedX = [];

        rows.forEach(row => {
          const values = row.split(',').map(v => parseFloat(v.trim()));
          if (values.length >= 2) {
            parsedY.push(values[0]);
            parsedX.push(values.slice(1));
          }
        });

        if (parsedY.length > 0) {
          const numVars = parsedX[0].length;
          setDataPoints({
            y: parsedY,
            X: parsedX,
            variableNames: {
              dependent: 'Y',
              independent: Array.from({ length: numVars }, (_, i) => `X${i + 1}`)
            }
          });
          setError(null);
        } else {
          throw new Error('No valid data points found');
        }
      }
    } catch (err) {
      setError(`Error parsing data: ${err.message}`);
    }
  }, [dataInput]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 1) {
            const headers = results.data[0];
            const data = results.data.slice(1).filter(row => row.some(cell => cell !== ''));

            const parsedY = [];
            const parsedX = [];

            data.forEach(row => {
              const values = row.map(v => parseFloat(v));
              if (!values.some(isNaN)) {
                parsedY.push(values[0]);
                parsedX.push(values.slice(1));
              }
            });

            if (parsedY.length > 0) {
              setDataPoints({
                y: parsedY,
                X: parsedX,
                variableNames: {
                  dependent: headers[0] || 'Y',
                  independent: headers.slice(1).length > 0 ?
                    headers.slice(1) :
                    Array.from({ length: parsedX[0].length }, (_, i) => `X${i + 1}`)
                }
              });
              setError(null);
            }
          }
        },
        error: (err) => {
          setError(`Error reading file: ${err.message}`);
        }
      });
    }
  }, []);

  const performRegression = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate data
      if (dataPoints.y.length < 3) {
        throw new Error('At least 3 data points are required');
      }

      // Prepare request based on regression type
      let response;
      const baseRequest = {
        x_values: dataPoints.X,
        y_values: dataPoints.y,
        confidence_level: modelOptions.confidenceLevel,
        include_diagnostics: true,
        include_assumptions: true
      };

      switch (regressionType) {
        case 'linear':
        case 'multiple':
          response = await regressionService.performLinearRegression({
            ...baseRequest,
            include_intercept: modelOptions.includeIntercept
          });
          break;

        case 'polynomial':
          response = await regressionService.performPolynomialRegression({
            ...baseRequest,
            degree: modelOptions.polynomialDegree
          });
          break;

        case 'logistic':
          response = await regressionService.performLogisticRegression({
            ...baseRequest,
            solver: modelOptions.logisticSolver,
            max_iter: modelOptions.maxIterations
          });
          break;

        case 'ridge':
          response = await regressionService.performRidgeRegression({
            ...baseRequest,
            alpha: modelOptions.regularizationParam
          });
          break;

        case 'lasso':
          response = await regressionService.performLassoRegression({
            ...baseRequest,
            alpha: modelOptions.regularizationParam
          });
          break;

        case 'elasticnet':
          response = await regressionService.performElasticNetRegression({
            ...baseRequest,
            alpha: modelOptions.regularizationParam,
            l1_ratio: modelOptions.elasticNetRatio
          });
          break;

        case 'robust':
          response = await regressionService.performRobustRegression({
            ...baseRequest,
            method: modelOptions.robustMethod
          });
          break;

        default:
          throw new Error(`Unsupported regression type: ${regressionType}`);
      }

      setResults(response);

      // Add to model comparison if enabled
      if (modelComparison.length > 0 || modelOptions.crossValidation) {
        setModelComparison(prev => [...prev, {
          type: regressionType,
          name: regressionTypes[regressionType].name,
          r_squared: response.r_squared,
          adjusted_r_squared: response.adjusted_r_squared,
          aic: response.aic,
          bic: response.bic,
          mse: response.mse,
          rmse: response.rmse
        }]);
      }

    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [dataPoints, regressionType, modelOptions, regressionService, regressionTypes]);

  const makePrediction = useCallback(async () => {
    if (!results || !results.coefficients) return;

    try {
      const xValues = dataPoints.variableNames.independent.map(
        name => parseFloat(predictionInput.values[name] || 0)
      );

      const prediction = await regressionService.makePrediction({
        model: results,
        x_values: xValues,
        include_interval: predictionInput.includePredictionInterval,
        confidence_level: predictionInput.predictionLevel
      });

      setResults(prev => ({
        ...prev,
        prediction: prediction
      }));
    } catch (err) {
      setError(`Prediction error: ${err.message}`);
    }
  }, [results, predictionInput, dataPoints.variableNames.independent, regressionService]);

  const exportResults = useCallback((format) => {
    if (!results) return;

    if (format === 'pdf') {
      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(16);
      doc.text('Regression Analysis Results', 20, yPosition);
      yPosition += 15;

      // Regression type
      doc.setFontSize(12);
      doc.text(`Type: ${regressionTypes[regressionType].name}`, 20, yPosition);
      yPosition += 10;

      // Model equation
      if (results.equation) {
        doc.setFontSize(11);
        doc.text('Model Equation:', 20, yPosition);
        yPosition += 7;
        doc.setFontSize(10);
        doc.text(results.equation, 25, yPosition);
        yPosition += 10;
      }

      // Coefficients table
      if (results.coefficients) {
        doc.setFontSize(11);
        doc.text('Coefficients:', 20, yPosition);
        yPosition += 5;

        const coeffData = results.coefficients.map(coef => [
          coef.name,
          formatNumber(coef.value, 6),
          formatNumber(coef.std_error, 6),
          formatNumber(coef.t_statistic, 4),
          formatNumber(coef.p_value, 6)
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Variable', 'Coefficient', 'Std Error', 't-value', 'p-value']],
          body: coeffData,
          theme: 'striped',
          styles: { fontSize: 9 }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // Model statistics
      doc.setFontSize(11);
      doc.text('Model Statistics:', 20, yPosition);
      yPosition += 7;
      doc.setFontSize(10);
      doc.text(`R-squared: ${formatNumber(results.r_squared, 6)}`, 25, yPosition);
      yPosition += 5;
      doc.text(`Adjusted R-squared: ${formatNumber(results.adjusted_r_squared, 6)}`, 25, yPosition);
      yPosition += 5;
      doc.text(`F-statistic: ${formatNumber(results.f_statistic, 4)}`, 25, yPosition);
      yPosition += 5;
      doc.text(`p-value: ${formatNumber(results.f_p_value, 6)}`, 25, yPosition);
      yPosition += 5;
      doc.text(`RMSE: ${formatNumber(results.rmse, 6)}`, 25, yPosition);

      // ANOVA table if available
      if (results.anova_table) {
        yPosition += 10;
        doc.setFontSize(11);
        doc.text('ANOVA Table:', 20, yPosition);
        yPosition += 5;

        const anovaData = [
          ['Regression', formatNumber(results.anova_table.ss_regression, 4),
           results.anova_table.df_regression, formatNumber(results.anova_table.ms_regression, 4),
           formatNumber(results.anova_table.f_statistic, 4), formatNumber(results.anova_table.p_value, 6)],
          ['Residual', formatNumber(results.anova_table.ss_residual, 4),
           results.anova_table.df_residual, formatNumber(results.anova_table.ms_residual, 4), '', ''],
          ['Total', formatNumber(results.anova_table.ss_total, 4),
           results.anova_table.df_total, '', '', '']
        ];

        doc.autoTable({
          startY: yPosition,
          head: [['Source', 'SS', 'df', 'MS', 'F', 'p-value']],
          body: anovaData,
          theme: 'striped',
          styles: { fontSize: 9 }
        });
      }

      // Save PDF
      doc.save('regression_analysis_results.pdf');
    } else if (format === 'csv') {
      let csvContent = 'Regression Analysis Results\n\n';
      csvContent += `Type,${regressionTypes[regressionType].name}\n\n`;

      // Coefficients
      csvContent += 'Coefficients\n';
      csvContent += 'Variable,Coefficient,Std Error,t-value,p-value,CI Lower,CI Upper\n';
      results.coefficients.forEach(coef => {
        csvContent += `${coef.name},${coef.value},${coef.std_error},`;
        csvContent += `${coef.t_statistic},${coef.p_value},`;
        csvContent += `${coef.confidence_interval[0]},${coef.confidence_interval[1]}\n`;
      });

      csvContent += '\nModel Statistics\n';
      csvContent += `R-squared,${results.r_squared}\n`;
      csvContent += `Adjusted R-squared,${results.adjusted_r_squared}\n`;
      csvContent += `F-statistic,${results.f_statistic}\n`;
      csvContent += `p-value,${results.f_p_value}\n`;
      csvContent += `RMSE,${results.rmse}\n`;
      csvContent += `MAE,${results.mae}\n`;
      csvContent += `AIC,${results.aic}\n`;
      csvContent += `BIC,${results.bic}\n`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      saveAs(blob, 'regression_analysis_results.csv');
    }

    setExportDialogOpen(false);
  }, [results, regressionType, regressionTypes, formatNumber]);

  const resetCalculator = useCallback(() => {
    setDataPoints({ y: [], X: [[]], variableNames: { dependent: 'Y', independent: ['X1'] } });
    setResults(null);
    setError(null);
    setModelComparison([]);
    setPredictionInput({ values: {}, includePredictionInterval: true, predictionLevel: 0.95 });
  }, []);

  // Render functions
  const renderDataInput = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <TableChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Data Input
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Data Entry Method</InputLabel>
          <Select
            value={dataInput.dataFormat}
            onChange={(e) => setDataInput({ ...dataInput, dataFormat: e.target.value })}
            label="Data Entry Method"
          >
            <MenuItem value="manual">Manual Entry</MenuItem>
            <MenuItem value="paste">Paste from Clipboard</MenuItem>
            <MenuItem value="file">Upload CSV File</MenuItem>
          </Select>
        </FormControl>

        {dataInput.dataFormat === 'manual' || dataInput.dataFormat === 'paste' ? (
          <>
            <TextField
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              label="Enter Data (Y, X1, X2, ... per row)"
              value={dataInput.rawData}
              onChange={(e) => setDataInput({ ...dataInput, rawData: e.target.value })}
              placeholder="10.5, 2.3, 4.1\n12.3, 3.1, 5.2\n8.7, 1.9, 3.8"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={parseDataInput}
              startIcon={<CalculateIcon />}
            >
              Parse Data
            </Button>
          </>
        ) : (
          <Box>
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUploadIcon />}
              >
                Upload CSV File
              </Button>
            </label>
          </Box>
        )}

        {dataPoints.y.length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <AlertTitle>Data Loaded</AlertTitle>
            {dataPoints.y.length} observations with {dataPoints.X[0].length} independent variable(s)
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderRegressionOptions = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Regression Options
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Regression Type</InputLabel>
              <Select
                value={regressionType}
                onChange={(e) => setRegressionType(e.target.value)}
                label="Regression Type"
              >
                {Object.entries(regressionTypes).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {config.icon}
                      <Box sx={{ ml: 1 }}>
                        <Typography>{config.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {config.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Confidence Level"
              value={modelOptions.confidenceLevel}
              onChange={(e) => setModelOptions({
                ...modelOptions,
                confidenceLevel: parseFloat(e.target.value)
              })}
              inputProps={{ min: 0.5, max: 0.999, step: 0.01 }}
            />
          </Grid>

          {regressionType === 'polynomial' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Polynomial Degree"
                value={modelOptions.polynomialDegree}
                onChange={(e) => setModelOptions({
                  ...modelOptions,
                  polynomialDegree: parseInt(e.target.value)
                })}
                inputProps={{ min: 2, max: 10 }}
              />
            </Grid>
          )}

          {['ridge', 'lasso', 'elasticnet'].includes(regressionType) && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Regularization Parameter (α)"
                value={modelOptions.regularizationParam}
                onChange={(e) => setModelOptions({
                  ...modelOptions,
                  regularizationParam: parseFloat(e.target.value)
                })}
                inputProps={{ min: 0.0001, step: 0.01 }}
              />
            </Grid>
          )}

          {regressionType === 'elasticnet' && (
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography gutterBottom>L1 Ratio: {modelOptions.elasticNetRatio}</Typography>
                <Slider
                  value={modelOptions.elasticNetRatio}
                  onChange={(e, value) => setModelOptions({
                    ...modelOptions,
                    elasticNetRatio: value
                  })}
                  min={0}
                  max={1}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
          )}

          {regressionType === 'robust' && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Robust Method</InputLabel>
                <Select
                  value={modelOptions.robustMethod}
                  onChange={(e) => setModelOptions({
                    ...modelOptions,
                    robustMethod: e.target.value
                  })}
                  label="Robust Method"
                >
                  <MenuItem value="huber">Huber</MenuItem>
                  <MenuItem value="ransac">RANSAC</MenuItem>
                  <MenuItem value="theil_sen">Theil-Sen</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={modelOptions.includeIntercept}
                  onChange={(e) => setModelOptions({
                    ...modelOptions,
                    includeIntercept: e.target.checked
                  })}
                />
              }
              label="Include Intercept"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={modelOptions.crossValidation}
                  onChange={(e) => setModelOptions({
                    ...modelOptions,
                    crossValidation: e.target.checked
                  })}
                />
              }
              label="Enable Cross-Validation"
            />
          </Grid>

          {modelOptions.crossValidation && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Number of Folds"
                value={modelOptions.kFolds}
                onChange={(e) => setModelOptions({
                  ...modelOptions,
                  kFolds: parseInt(e.target.value)
                })}
                inputProps={{ min: 2, max: 20 }}
              />
            </Grid>
          )}
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={performRegression}
              disabled={loading || isCheckingAssumptions || isTestBlocked || dataPoints.y.length < 3}
              startIcon={
                loading || isCheckingAssumptions ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CalculateIcon />
                )
              }
            >
              {isCheckingAssumptions
                ? 'Validating Assumptions...'
                : loading
                ? 'Calculating...'
                : isTestBlocked
                ? '⛔ Test Blocked - Fix Violations'
                : 'Perform Regression'}
            </Button>
            <Button
              variant="outlined"
              onClick={resetCalculator}
              startIcon={<RefreshIcon />}
            >
              Reset
            </Button>
          </Box>

          {isTestBlocked && (
            <Alert severity="error">
              <AlertTitle>⛔ Test Execution Blocked</AlertTitle>
              Critical assumption violations detected for linear regression. Please address the
              violations above using the "Fix Data" button, or switch to a robust regression method
              (Ridge, Lasso, or Robust Regression).
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderResults = () => {
    if (!results) return null;

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Regression Results
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small">
                <Select
                  value={displayPrecision}
                  onChange={(e) => setDisplayPrecision(e.target.value)}
                >
                  <MenuItem value={6}>6 decimals</MenuItem>
                  <MenuItem value={10}>10 decimals</MenuItem>
                  <MenuItem value={20}>20 decimals</MenuItem>
                  <MenuItem value={30}>30 decimals</MenuItem>
                  <MenuItem value={50}>50 decimals</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                onClick={() => setShowFullPrecision(!showFullPrecision)}
                color={showFullPrecision ? 'primary' : 'default'}
              >
                {showFullPrecision ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Box>
          </Box>

          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="Model Summary" />
            <Tab label="Coefficients" />
            <Tab label="ANOVA" />
            <Tab label="Diagnostics" />
            <Tab label="Prediction" />
            <Tab label="Visualization" />
          </Tabs>

          {/* Model Summary Tab */}
          {activeTab === 0 && (
            <Box>
              {results.equation && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Model Equation</AlertTitle>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {results.equation}
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Goodness of Fit</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="R-squared"
                          secondary={formatNumber(results.r_squared)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Adjusted R-squared"
                          secondary={formatNumber(results.adjusted_r_squared)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="F-statistic"
                          secondary={`${formatNumber(results.f_statistic)} (p = ${formatNumber(results.f_p_value)})`}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Error Metrics</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="RMSE"
                          secondary={formatNumber(results.rmse)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="MAE"
                          secondary={formatNumber(results.mae)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="MAPE"
                          secondary={`${formatNumber(results.mape)}%`}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Information Criteria</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="AIC"
                          secondary={formatNumber(results.aic)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="BIC"
                          secondary={formatNumber(results.bic)}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Degrees of Freedom</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Regression df"
                          secondary={results.df_regression}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Residual df"
                          secondary={results.df_residual}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Total df"
                          secondary={results.df_total}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Coefficients Tab */}
          {activeTab === 1 && results.coefficients && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Variable</TableCell>
                    <TableCell align="right">Coefficient</TableCell>
                    <TableCell align="right">Std Error</TableCell>
                    <TableCell align="right">t-statistic</TableCell>
                    <TableCell align="right">p-value</TableCell>
                    <TableCell align="right">95% CI Lower</TableCell>
                    <TableCell align="right">95% CI Upper</TableCell>
                    <TableCell align="center">Significance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.coefficients.map((coef, index) => (
                    <TableRow key={index}>
                      <TableCell>{coef.name}</TableCell>
                      <TableCell align="right">{formatNumber(coef.value)}</TableCell>
                      <TableCell align="right">{formatNumber(coef.std_error)}</TableCell>
                      <TableCell align="right">{formatNumber(coef.t_statistic)}</TableCell>
                      <TableCell align="right">{formatNumber(coef.p_value)}</TableCell>
                      <TableCell align="right">{formatNumber(coef.confidence_interval[0])}</TableCell>
                      <TableCell align="right">{formatNumber(coef.confidence_interval[1])}</TableCell>
                      <TableCell align="center">
                        {coef.p_value < 0.001 && '***'}
                        {coef.p_value >= 0.001 && coef.p_value < 0.01 && '**'}
                        {coef.p_value >= 0.01 && coef.p_value < 0.05 && '*'}
                        {coef.p_value >= 0.05 && coef.p_value < 0.1 && '.'}
                        {coef.p_value >= 0.1 && 'ns'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Significance codes: 0 '***' 0.001 '**' 0.01 '*' 0.05 '.' 0.1 'ns' 1
                </Typography>
              </Box>
            </TableContainer>
          )}

          {/* ANOVA Tab */}
          {activeTab === 2 && results.anova_table && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Sum of Squares</TableCell>
                    <TableCell align="right">df</TableCell>
                    <TableCell align="right">Mean Square</TableCell>
                    <TableCell align="right">F-statistic</TableCell>
                    <TableCell align="right">p-value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Regression</TableCell>
                    <TableCell align="right">{formatNumber(results.anova_table.ss_regression)}</TableCell>
                    <TableCell align="right">{results.anova_table.df_regression}</TableCell>
                    <TableCell align="right">{formatNumber(results.anova_table.ms_regression)}</TableCell>
                    <TableCell align="right">{formatNumber(results.anova_table.f_statistic)}</TableCell>
                    <TableCell align="right">{formatNumber(results.anova_table.p_value)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Residual</TableCell>
                    <TableCell align="right">{formatNumber(results.anova_table.ss_residual)}</TableCell>
                    <TableCell align="right">{results.anova_table.df_residual}</TableCell>
                    <TableCell align="right">{formatNumber(results.anova_table.ms_residual)}</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>{formatNumber(results.anova_table.ss_total)}</strong></TableCell>
                    <TableCell align="right"><strong>{results.anova_table.df_total}</strong></TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Diagnostics Tab */}
          {activeTab === 3 && (
            <Box>
              <Grid container spacing={2}>
                {results.assumptions && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Assumption Checks
                      </Typography>
                    </Grid>

                    {results.assumptions.normality && (
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Normality of Residuals
                          </Typography>
                          <Alert
                            severity={results.assumptions.normality.p_value > 0.05 ? 'success' : 'warning'}
                            sx={{ mt: 1 }}
                          >
                            <Typography variant="body2">
                              Shapiro-Wilk Test: W = {formatNumber(results.assumptions.normality.statistic, 4)}
                            </Typography>
                            <Typography variant="body2">
                              p-value = {formatNumber(results.assumptions.normality.p_value, 6)}
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              {results.assumptions.normality.p_value > 0.05
                                ? 'Residuals appear normally distributed'
                                : 'Residuals may not be normally distributed'}
                            </Typography>
                          </Alert>
                        </Paper>
                      </Grid>
                    )}

                    {results.assumptions.homoscedasticity && (
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Homoscedasticity
                          </Typography>
                          <Alert
                            severity={results.assumptions.homoscedasticity.p_value > 0.05 ? 'success' : 'warning'}
                            sx={{ mt: 1 }}
                          >
                            <Typography variant="body2">
                              Breusch-Pagan Test: χ² = {formatNumber(results.assumptions.homoscedasticity.statistic, 4)}
                            </Typography>
                            <Typography variant="body2">
                              p-value = {formatNumber(results.assumptions.homoscedasticity.p_value, 6)}
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              {results.assumptions.homoscedasticity.p_value > 0.05
                                ? 'Constant variance assumption appears satisfied'
                                : 'Heteroscedasticity may be present'}
                            </Typography>
                          </Alert>
                        </Paper>
                      </Grid>
                    )}

                    {results.assumptions.independence && (
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Independence of Residuals
                          </Typography>
                          <Alert
                            severity={results.assumptions.independence.statistic >= 1.5 &&
                                   results.assumptions.independence.statistic <= 2.5 ? 'success' : 'warning'}
                            sx={{ mt: 1 }}
                          >
                            <Typography variant="body2">
                              Durbin-Watson: {formatNumber(results.assumptions.independence.statistic, 4)}
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              {results.assumptions.independence.statistic >= 1.5 &&
                               results.assumptions.independence.statistic <= 2.5
                                ? 'No significant autocorrelation detected'
                                : 'Possible autocorrelation in residuals'}
                            </Typography>
                          </Alert>
                        </Paper>
                      </Grid>
                    )}

                    {results.assumptions.multicollinearity && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Multicollinearity (VIF)
                          </Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Variable</TableCell>
                                  <TableCell align="right">VIF</TableCell>
                                  <TableCell align="center">Status</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(results.assumptions.multicollinearity.vif_values).map(([variable, vif]) => (
                                  <TableRow key={variable}>
                                    <TableCell>{variable}</TableCell>
                                    <TableCell align="right">{formatNumber(vif, 3)}</TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        size="small"
                                        label={vif < 5 ? 'Good' : vif < 10 ? 'Moderate' : 'High'}
                                        color={vif < 5 ? 'success' : vif < 10 ? 'warning' : 'error'}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Paper>
                      </Grid>
                    )}
                  </>
                )}

                {results.outliers && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Outlier Detection
                      </Typography>
                      <Alert severity={results.outliers.count > 0 ? 'warning' : 'info'}>
                        {results.outliers.count} potential outlier(s) detected
                        {results.outliers.count > 0 && (
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Indices: {results.outliers.indices.join(', ')}
                          </Typography>
                        )}
                      </Alert>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Prediction Tab */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Make Predictions
              </Typography>

              <Grid container spacing={2}>
                {dataPoints.variableNames.independent.map((varName, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <TextField
                      fullWidth
                      type="number"
                      label={varName}
                      value={predictionInput.values[varName] || ''}
                      onChange={(e) => setPredictionInput({
                        ...predictionInput,
                        values: {
                          ...predictionInput.values,
                          [varName]: e.target.value
                        }
                      })}
                    />
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={predictionInput.includePredictionInterval}
                        onChange={(e) => setPredictionInput({
                          ...predictionInput,
                          includePredictionInterval: e.target.checked
                        })}
                      />
                    }
                    label="Include Prediction Interval"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={makePrediction}
                    startIcon={<TrendingUpIcon />}
                  >
                    Calculate Prediction
                  </Button>
                </Grid>

                {results.prediction && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      <AlertTitle>Prediction Result</AlertTitle>
                      <Typography variant="body1">
                        Predicted Value: <strong>{formatNumber(results.prediction.value)}</strong>
                      </Typography>
                      {results.prediction.confidence_interval && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          95% Confidence Interval: [{formatNumber(results.prediction.confidence_interval[0])},
                          {formatNumber(results.prediction.confidence_interval[1])}]
                        </Typography>
                      )}
                      {results.prediction.prediction_interval && (
                        <Typography variant="body2">
                          95% Prediction Interval: [{formatNumber(results.prediction.prediction_interval[0])},
                          {formatNumber(results.prediction.prediction_interval[1])}]
                        </Typography>
                      )}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Visualization Tab */}
          {activeTab === 5 && (
            <Box>
              <Alert severity="info">
                <AlertTitle>Visualization Options</AlertTitle>
                <Typography variant="body2">
                  Advanced visualizations including residual plots, Q-Q plots, scatter plots with regression line,
                  and diagnostic plots are available in the full application version.
                </Typography>
              </Alert>

              {results.plot_data && (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Fitted vs Actual</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Plot showing fitted values against actual values
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Residual Plot</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Residuals vs fitted values for homoscedasticity check
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Q-Q Plot</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Normal Q-Q plot for normality assessment
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2">Scale-Location</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Square root of standardized residuals vs fitted values
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => setExportDialogOpen(true)}
            >
              Export Results
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                const resultsText = JSON.stringify(results, null, 2);
                navigator.clipboard.writeText(resultsText);
              }}
            >
              Copy to Clipboard
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderModelComparison = () => {
    if (modelComparison.length === 0) return null;

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Model Comparison
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell align="right">R²</TableCell>
                  <TableCell align="right">Adj. R²</TableCell>
                  <TableCell align="right">RMSE</TableCell>
                  <TableCell align="right">AIC</TableCell>
                  <TableCell align="right">BIC</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modelComparison.map((model, index) => (
                  <TableRow key={index}>
                    <TableCell>{model.name}</TableCell>
                    <TableCell align="right">{formatNumber(model.r_squared, 4)}</TableCell>
                    <TableCell align="right">{formatNumber(model.adjusted_r_squared, 4)}</TableCell>
                    <TableCell align="right">{formatNumber(model.rmse, 4)}</TableCell>
                    <TableCell align="right">{formatNumber(model.aic, 2)}</TableCell>
                    <TableCell align="right">{formatNumber(model.bic, 2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Regression Analysis Calculator
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Perform comprehensive regression analysis with 50 decimal precision. Supports multiple regression types
        including linear, polynomial, logistic, and regularized methods.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Guardian Warning Section */}
      {guardianResult && (
        <Box sx={{ mb: 2 }}>
          <GuardianWarning
            guardianReport={guardianResult}
            onProceed={() => setIsTestBlocked(false)}
            onSelectAlternative={(test) => {
              // Suggest robust regression or regularized methods for violated assumptions
              if (test.toLowerCase().includes('robust')) {
                setRegressionType('robust');
              } else if (test.toLowerCase().includes('ridge')) {
                setRegressionType('ridge');
              }
            }}
            onViewEvidence={() => {
              console.log('[RegressionCalculator] Visual evidence requested');
            }}
            data={regressionType === 'linear'
              ? [dataPoints.X.map(row => row[0]), dataPoints.y]
              : [...(dataPoints.X[0]?.map((_, colIndex) =>
                  dataPoints.X.map(row => row[colIndex])
                ) || []), dataPoints.y]}
            alpha={1 - modelOptions.confidenceLevel}
            onTransformComplete={(transformedData, transformationType, parameters) => {
              console.log('[RegressionCalculator] Transformation applied:', transformationType, parameters);

              // Handle transformation completion
              if (Array.isArray(transformedData) && transformedData.length >= 2) {
                // Extract transformed Y (last array) and X variables (all but last)
                const transformedY = transformedData[transformedData.length - 1];
                const transformedX = transformedData.slice(0, -1);

                if (regressionType === 'linear') {
                  // Simple linear: single X variable
                  const newX = dataPoints.X.map((_, i) => [transformedX[0][i]]);
                  setDataPoints({
                    ...dataPoints,
                    y: transformedY,
                    X: newX
                  });
                } else {
                  // Multiple regression: multiple X variables
                  const newX = transformedY.map((_, i) =>
                    transformedX.map(xVar => xVar[i])
                  );
                  setDataPoints({
                    ...dataPoints,
                    y: transformedY,
                    X: newX
                  });
                }

                setError(null);
                console.log(`Data transformed using ${transformationType}. Re-validating assumptions...`);
              }
            }}
          />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          {renderDataInput()}
        </Grid>
        <Grid item xs={12} lg={6}>
          {renderRegressionOptions()}
        </Grid>
      </Grid>

      {renderResults()}
      {renderModelComparison()}

      {/* Help Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <HelpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Regression Analysis Help
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>Overview</Typography>
          <Typography paragraph>
            Regression analysis is a statistical method for modeling the relationship between a dependent
            variable and one or more independent variables. This calculator supports various regression
            techniques with 50 decimal precision.
          </Typography>

          <Typography variant="h6" gutterBottom>Regression Types</Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Simple/Multiple Linear Regression"
                secondary="Models linear relationships between variables using least squares estimation"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Polynomial Regression"
                secondary="Fits non-linear relationships using polynomial terms of specified degree"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Logistic Regression"
                secondary="Models binary outcomes using the logistic function"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Ridge Regression (L2)"
                secondary="Adds L2 penalty to prevent overfitting, useful with multicollinearity"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Lasso Regression (L1)"
                secondary="Adds L1 penalty for feature selection and regularization"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Elastic Net"
                secondary="Combines L1 and L2 penalties, balancing feature selection and regularization"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Robust Regression"
                secondary="Resistant to outliers using methods like Huber, RANSAC, or Theil-Sen"
              />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom>Assumptions</Typography>
          <Typography paragraph>
            Linear regression assumes:
          </Typography>
          <List>
            <ListItem>• Linearity: Linear relationship between variables</ListItem>
            <ListItem>• Independence: Observations are independent</ListItem>
            <ListItem>• Homoscedasticity: Constant variance of residuals</ListItem>
            <ListItem>• Normality: Residuals are normally distributed</ListItem>
            <ListItem>• No multicollinearity: Independent variables are not highly correlated</ListItem>
          </List>

          <Typography variant="h6" gutterBottom>Interpretation</Typography>
          <Typography paragraph>
            • R-squared: Proportion of variance explained (0-1, higher is better)
          </Typography>
          <Typography paragraph>
            • Coefficients: Change in Y for one unit change in X
          </Typography>
          <Typography paragraph>
            • p-values: Significance of predictors ({"<"}0.05 typically significant)
          </Typography>
          <Typography paragraph>
            • RMSE: Average prediction error in original units
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      >
        <DialogTitle>Export Results</DialogTitle>
        <DialogContent>
          <List>
            <ListItemButton onClick={() => exportResults('pdf')}>
              <ListItemIcon>
                <PictureAsPdfIcon />
              </ListItemIcon>
              <ListItemText
                primary="Export as PDF"
                secondary="Publication-ready PDF with all results"
              />
            </ListItemButton>
            <ListItemButton onClick={() => exportResults('csv')}>
              <ListItemIcon>
                <TableChartIcon />
              </ListItemIcon>
              <ListItemText
                primary="Export as CSV"
                secondary="Spreadsheet-compatible format"
              />
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Help Button */}
      <Tooltip title="Help">
        <IconButton
          onClick={() => setHelpDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            }
          }}
        >
          <HelpIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default RegressionCalculator;