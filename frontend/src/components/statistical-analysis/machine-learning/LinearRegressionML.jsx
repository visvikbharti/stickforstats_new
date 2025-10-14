/**
 * Linear Regression Component
 *
 * Build and evaluate linear regression models:
 * - Train/test split
 * - Model training
 * - Performance metrics (R², MSE, RMSE, MAE)
 * - Actual vs Predicted plot
 * - Residual analysis
 * - Feature importance
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  Button,
  Divider
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

/**
 * Main Linear Regression Component
 */
const LinearRegressionML = ({ data }) => {
  const [targetVariable, setTargetVariable] = useState('');
  const [features, setFeatures] = useState([]);
  const [testSize, setTestSize] = useState(0.2);
  const [modelTrained, setModelTrained] = useState(false);

  /**
   * Detect numeric columns
   */
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const numeric = [];
    Object.keys(data[0]).forEach(key => {
      const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== '');
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;

      if (numericCount / values.length > 0.8) {
        numeric.push(key);
      }
    });

    return numeric;
  }, [data]);

  /**
   * Prepare data for modeling
   */
  const preparedData = useMemo(() => {
    if (!targetVariable || features.length === 0 || !data) return null;

    // Filter and convert to numeric
    const cleanData = data
      .map(row => {
        const point = { target: parseFloat(row[targetVariable]) };
        features.forEach(feature => {
          point[feature] = parseFloat(row[feature]);
        });
        return point;
      })
      .filter(point => {
        // Remove rows with any NaN values
        return !isNaN(point.target) && features.every(f => !isNaN(point[f]));
      });

    if (cleanData.length === 0) return null;

    // Shuffle data
    const shuffled = cleanData.sort(() => Math.random() - 0.5);

    // Split into train/test
    const splitIndex = Math.floor(shuffled.length * (1 - testSize));
    const trainData = shuffled.slice(0, splitIndex);
    const testData = shuffled.slice(splitIndex);

    return {
      trainData,
      testData,
      totalSamples: cleanData.length,
      trainSamples: trainData.length,
      testSamples: testData.length
    };
  }, [data, targetVariable, features, testSize]);

  /**
   * Train linear regression model
   */
  const modelResults = useMemo(() => {
    if (!preparedData || !modelTrained) return null;

    const { trainData, testData } = preparedData;

    // Calculate means for normalization
    const means = {};
    const stds = {};

    features.forEach(feature => {
      const values = trainData.map(d => d[feature]);
      means[feature] = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - means[feature], 2), 0) / values.length;
      stds[feature] = Math.sqrt(variance);
    });

    const targetValues = trainData.map(d => d.target);
    means.target = targetValues.reduce((sum, v) => sum + v, 0) / targetValues.length;
    const targetVariance = targetValues.reduce((sum, v) => sum + Math.pow(v - means.target, 2), 0) / targetValues.length;
    stds.target = Math.sqrt(targetVariance);

    // Normalize data
    const normalizePoint = (point) => {
      const normalized = {};
      features.forEach(feature => {
        normalized[feature] = stds[feature] > 0 ? (point[feature] - means[feature]) / stds[feature] : 0;
      });
      return normalized;
    };

    // Build design matrix X and target vector y
    const X = trainData.map(normalizePoint);
    const y = trainData.map(d => (d.target - means.target) / stds.target);

    // Add intercept term
    X.forEach(row => { row.intercept = 1; });

    // Solve normal equations: β = (X'X)^(-1) X'y
    const featureNames = ['intercept', ...features];
    const n = X.length;
    const p = featureNames.length;

    // X'X
    const XtX = [];
    for (let i = 0; i < p; i++) {
      XtX[i] = [];
      for (let j = 0; j < p; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += X[k][featureNames[i]] * X[k][featureNames[j]];
        }
        XtX[i][j] = sum;
      }
    }

    // X'y
    const Xty = [];
    for (let i = 0; i < p; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += X[k][featureNames[i]] * y[k];
      }
      Xty[i] = sum;
    }

    // Solve using Gaussian elimination (simplified)
    const beta = gaussianElimination(XtX, Xty);

    if (!beta) {
      return { error: 'Matrix is singular. Try removing correlated features.' };
    }

    // Denormalize coefficients
    const coefficients = {};
    features.forEach((feature, idx) => {
      coefficients[feature] = beta[idx + 1] * (stds.target / stds[feature]);
    });
    const intercept = means.target - features.reduce((sum, feature, idx) => {
      return sum + coefficients[feature] * means[feature];
    }, 0);

    // Make predictions on train and test sets
    const predict = (point) => {
      let pred = intercept;
      features.forEach(feature => {
        pred += coefficients[feature] * point[feature];
      });
      return pred;
    };

    const trainPredictions = trainData.map(point => ({
      actual: point.target,
      predicted: predict(point)
    }));

    const testPredictions = testData.map(point => ({
      actual: point.target,
      predicted: predict(point)
    }));

    // Calculate metrics
    const calculateMetrics = (predictions) => {
      const n = predictions.length;
      const meanActual = predictions.reduce((sum, p) => sum + p.actual, 0) / n;

      const ssRes = predictions.reduce((sum, p) => sum + Math.pow(p.actual - p.predicted, 2), 0);
      const ssTot = predictions.reduce((sum, p) => sum + Math.pow(p.actual - meanActual, 2), 0);

      const r2 = 1 - (ssRes / ssTot);
      const mse = ssRes / n;
      const rmse = Math.sqrt(mse);
      const mae = predictions.reduce((sum, p) => sum + Math.abs(p.actual - p.predicted), 0) / n;

      return { r2, mse, rmse, mae };
    };

    const trainMetrics = calculateMetrics(trainPredictions);
    const testMetrics = calculateMetrics(testPredictions);

    // Calculate residuals
    const residuals = testPredictions.map(p => ({
      predicted: p.predicted,
      residual: p.actual - p.predicted
    }));

    return {
      coefficients,
      intercept,
      trainPredictions,
      testPredictions,
      trainMetrics,
      testMetrics,
      residuals
    };
  }, [preparedData, features, modelTrained]);

  /**
   * Gaussian elimination for solving linear system
   */
  const gaussianElimination = (A, b) => {
    const n = b.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Check for singular matrix
      if (Math.abs(augmented[i][i]) < 1e-10) {
        return null;
      }

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
    }

    return x;
  };

  /**
   * Handle train button
   */
  const handleTrain = () => {
    setModelTrained(true);
  };

  /**
   * Render data requirement message
   */
  if (!data || data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="info">
          <Typography variant="body1">
            Please upload a dataset in the <strong>Data Profiling</strong> module first.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  if (numericColumns.length < 2) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography variant="body1">
            Linear regression requires at least 2 numeric columns (1 target + 1+ features).
            Found: {numericColumns.length}
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Configuration Panel */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon /> Model Configuration
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Target Variable (y)</InputLabel>
              <Select
                value={targetVariable}
                label="Target Variable (y)"
                onChange={(e) => {
                  setTargetVariable(e.target.value);
                  setModelTrained(false);
                }}
              >
                <MenuItem value=""><em>Select target...</em></MenuItem>
                {numericColumns.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Features (X)</InputLabel>
              <Select
                multiple
                value={features}
                label="Features (X)"
                onChange={(e) => {
                  setFeatures(e.target.value);
                  setModelTrained(false);
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {numericColumns
                  .filter(col => col !== targetVariable)
                  .map((col) => (
                    <MenuItem key={col} value={col}>{col}</MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Test Set Size: {(testSize * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={testSize}
              onChange={(e, value) => {
                setTestSize(value);
                setModelTrained(false);
              }}
              min={0.1}
              max={0.4}
              step={0.05}
              marks
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
            />
          </Grid>
        </Grid>

        {preparedData && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Data Ready:</strong> {preparedData.totalSamples} samples
              ({preparedData.trainSamples} train, {preparedData.testSamples} test)
            </Typography>
          </Alert>
        )}

        {targetVariable && features.length > 0 && preparedData && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={handleTrain}
              disabled={modelTrained}
            >
              {modelTrained ? 'Model Trained' : 'Train Model'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Model Results */}
      {modelResults && !modelResults.error && (
        <>
          {/* Performance Metrics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                    Training Set Performance
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">R² Score</Typography>
                      <Typography variant="h6">{modelResults.trainMetrics.r2.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">RMSE</Typography>
                      <Typography variant="h6">{modelResults.trainMetrics.rmse.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">MSE</Typography>
                      <Typography variant="body2">{modelResults.trainMetrics.mse.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">MAE</Typography>
                      <Typography variant="body2">{modelResults.trainMetrics.mae.toFixed(4)}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                    Test Set Performance
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">R² Score</Typography>
                      <Typography variant="h6">{modelResults.testMetrics.r2.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">RMSE</Typography>
                      <Typography variant="h6">{modelResults.testMetrics.rmse.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">MSE</Typography>
                      <Typography variant="body2">{modelResults.testMetrics.mse.toFixed(4)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">MAE</Typography>
                      <Typography variant="body2">{modelResults.testMetrics.mae.toFixed(4)}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Model Coefficients */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Model Coefficients
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Feature</strong></TableCell>
                    <TableCell align="right"><strong>Coefficient</strong></TableCell>
                    <TableCell align="right"><strong>Importance</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Intercept</TableCell>
                    <TableCell align="right">{modelResults.intercept.toFixed(4)}</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                  {features.map((feature) => {
                    const coef = modelResults.coefficients[feature];
                    const absCoef = Math.abs(coef);
                    return (
                      <TableRow key={feature}>
                        <TableCell>{feature}</TableCell>
                        <TableCell align="right">{coef.toFixed(4)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={absCoef > 1 ? 'High' : absCoef > 0.5 ? 'Medium' : 'Low'}
                            size="small"
                            color={absCoef > 1 ? 'error' : absCoef > 0.5 ? 'warning' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Actual vs Predicted */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actual vs Predicted (Test Set)
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="actual"
                    name="Actual"
                    label={{ value: 'Actual Values', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    dataKey="predicted"
                    name="Predicted"
                    label={{ value: 'Predicted Values', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <ReferenceLine
                    segment={[
                      { x: Math.min(...modelResults.testPredictions.map(p => p.actual)), y: Math.min(...modelResults.testPredictions.map(p => p.actual)) },
                      { x: Math.max(...modelResults.testPredictions.map(p => p.actual)), y: Math.max(...modelResults.testPredictions.map(p => p.actual)) }
                    ]}
                    stroke="#ff7300"
                    strokeDasharray="3 3"
                    label="Perfect Fit"
                  />
                  <Scatter
                    data={modelResults.testPredictions}
                    fill="#8884d8"
                    name="Predictions"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              Points closer to the diagonal line indicate better predictions
            </Typography>
          </Paper>

          {/* Residual Plot */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Residual Plot
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="predicted"
                    name="Predicted"
                    label={{ value: 'Predicted Values', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    dataKey="residual"
                    name="Residual"
                    label={{ value: 'Residuals', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#ff7300" strokeDasharray="3 3" />
                  <Scatter
                    data={modelResults.residuals}
                    fill="#82ca9d"
                    name="Residuals"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              Residuals should be randomly scattered around zero for a good model
            </Typography>
          </Paper>
        </>
      )}

      {modelResults && modelResults.error && (
        <Alert severity="error">
          <Typography variant="body1">
            <strong>Error:</strong> {modelResults.error}
          </Typography>
        </Alert>
      )}

      {/* Selection prompts */}
      {(!targetVariable || features.length === 0) && (
        <Alert severity="info">
          <Typography variant="body2">
            Please select a <strong>target variable</strong> and at least one <strong>feature</strong> to train the model.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default LinearRegressionML;
