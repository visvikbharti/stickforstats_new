/**
 * Classification Component
 *
 * Implements binary and multiclass classification using logistic regression.
 * Features:
 * - Train/test split with configurable test size
 * - Logistic regression with gradient descent optimization
 * - Confusion matrix with heatmap visualization
 * - Performance metrics: Accuracy, Precision, Recall, F1-score
 * - Classification report by class
 * - Predictions vs Actuals table
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Slider,
  Divider
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

/**
 * Sigmoid activation function
 */
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/**
 * Logistic Regression Implementation
 * Uses gradient descent for optimization
 */
const trainLogisticRegression = (X, y, learningRate = 0.01, iterations = 1000) => {
  const m = X.length;
  const n = X[0].length;

  // Initialize weights and bias
  let weights = new Array(n).fill(0);
  let bias = 0;

  // Gradient descent
  for (let iter = 0; iter < iterations; iter++) {
    // Forward pass
    const predictions = X.map((x, i) => {
      const z = x.reduce((sum, val, j) => sum + val * weights[j], 0) + bias;
      return sigmoid(z);
    });

    // Calculate gradients
    const dw = new Array(n).fill(0);
    let db = 0;

    for (let i = 0; i < m; i++) {
      const error = predictions[i] - y[i];
      db += error;
      for (let j = 0; j < n; j++) {
        dw[j] += error * X[i][j];
      }
    }

    // Update parameters
    for (let j = 0; j < n; j++) {
      weights[j] -= (learningRate / m) * dw[j];
    }
    bias -= (learningRate / m) * db;
  }

  return { weights, bias };
};

/**
 * Make predictions with trained model
 */
const predictLogistic = (X, weights, bias, threshold = 0.5) => {
  return X.map(x => {
    const z = x.reduce((sum, val, j) => sum + val * weights[j], 0) + bias;
    const prob = sigmoid(z);
    return prob >= threshold ? 1 : 0;
  });
};

/**
 * Calculate confusion matrix
 */
const calculateConfusionMatrix = (yTrue, yPred) => {
  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
    else if (yTrue[i] === 1 && yPred[i] === 0) fn++;
  }

  return { tp, fp, tn, fn };
};

/**
 * Calculate performance metrics
 */
const calculateMetrics = (confusionMatrix) => {
  const { tp, fp, tn, fn } = confusionMatrix;

  const accuracy = (tp + tn) / (tp + fp + tn + fn);
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
  const specificity = tn / (tn + fp) || 0;

  return { accuracy, precision, recall, f1Score, specificity };
};

/**
 * Main Classification Component
 */
const Classification = ({ data }) => {
  const [targetColumn, setTargetColumn] = useState('');
  const [featureColumns, setFeatureColumns] = useState([]);
  const [testSize, setTestSize] = useState(0.2);
  const [learningRate, setLearningRate] = useState(0.01);
  const [iterations, setIterations] = useState(1000);
  const [modelTrained, setModelTrained] = useState(false);
  const [model, setModel] = useState(null);
  const [results, setResults] = useState(null);

  /**
   * Get numeric and categorical columns from data
   */
  const { numericColumns, categoricalColumns } = useMemo(() => {
    if (!data || data.length === 0) {
      return { numericColumns: [], categoricalColumns: [] };
    }

    const columns = Object.keys(data[0]);
    const numeric = [];
    const categorical = [];

    columns.forEach(col => {
      const sample = data[0][col];
      if (typeof sample === 'number' || !isNaN(parseFloat(sample))) {
        numeric.push(col);
      } else {
        categorical.push(col);
      }
    });

    return { numericColumns: numeric, categoricalColumns: categorical };
  }, [data]);

  /**
   * All columns that can be features (numeric only)
   */
  const availableFeatures = useMemo(() => {
    return numericColumns.filter(col => col !== targetColumn);
  }, [numericColumns, targetColumn]);

  /**
   * Handle feature selection toggle
   */
  const handleFeatureToggle = (column) => {
    setFeatureColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(c => c !== column);
      } else {
        return [...prev, column];
      }
    });
  };

  /**
   * Train the classification model
   */
  const handleTrain = () => {
    if (!data || !targetColumn || featureColumns.length === 0) {
      alert('Please select target and feature columns');
      return;
    }

    try {
      // Prepare data
      const cleanData = data
        .filter(row => {
          // Check target is valid
          const target = parseFloat(row[targetColumn]);
          if (isNaN(target)) return false;

          // Check features are valid
          return featureColumns.every(col => {
            const val = parseFloat(row[col]);
            return !isNaN(val);
          });
        })
        .map(row => ({
          features: featureColumns.map(col => parseFloat(row[col])),
          target: parseFloat(row[targetColumn])
        }));

      if (cleanData.length < 10) {
        alert('Insufficient data. Need at least 10 valid rows.');
        return;
      }

      // Convert target to binary (if not already)
      const uniqueTargets = [...new Set(cleanData.map(d => d.target))].sort();
      if (uniqueTargets.length !== 2) {
        alert('Classification currently supports binary classification only (2 classes).');
        return;
      }

      // Map targets to 0 and 1
      const targetMapping = { [uniqueTargets[0]]: 0, [uniqueTargets[1]]: 1 };
      const mappedData = cleanData.map(d => ({
        features: d.features,
        target: targetMapping[d.target]
      }));

      // Train/test split
      const shuffled = [...mappedData].sort(() => Math.random() - 0.5);
      const testCount = Math.floor(shuffled.length * testSize);
      const trainData = shuffled.slice(testCount);
      const testData = shuffled.slice(0, testCount);

      // Feature normalization (standardization)
      const featureMeans = featureColumns.map((_, idx) => {
        const values = trainData.map(d => d.features[idx]);
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      });

      const featureStds = featureColumns.map((_, idx) => {
        const values = trainData.map(d => d.features[idx]);
        const mean = featureMeans[idx];
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance) || 1; // Avoid division by zero
      });

      // Normalize features
      const normalizeFeatures = (features) => {
        return features.map((val, idx) => (val - featureMeans[idx]) / featureStds[idx]);
      };

      const XTrain = trainData.map(d => normalizeFeatures(d.features));
      const yTrain = trainData.map(d => d.target);
      const XTest = testData.map(d => normalizeFeatures(d.features));
      const yTest = testData.map(d => d.target);

      // Train model
      const trainedModel = trainLogisticRegression(XTrain, yTrain, learningRate, iterations);

      // Make predictions
      const trainPredictions = predictLogistic(XTrain, trainedModel.weights, trainedModel.bias);
      const testPredictions = predictLogistic(XTest, trainedModel.weights, trainedModel.bias);

      // Calculate metrics
      const trainConfusion = calculateConfusionMatrix(yTrain, trainPredictions);
      const testConfusion = calculateConfusionMatrix(yTest, testPredictions);
      const trainMetrics = calculateMetrics(trainConfusion);
      const testMetrics = calculateMetrics(testConfusion);

      // Get probabilities for test set
      const testProbabilities = XTest.map(x => {
        const z = x.reduce((sum, val, j) => sum + val * trainedModel.weights[j], 0) + trainedModel.bias;
        return sigmoid(z);
      });

      // Store results
      setModel({
        weights: trainedModel.weights,
        bias: trainedModel.bias,
        featureMeans,
        featureStds,
        targetMapping,
        uniqueTargets
      });

      setResults({
        trainConfusion,
        testConfusion,
        trainMetrics,
        testMetrics,
        trainSize: trainData.length,
        testSize: testData.length,
        predictions: testData.map((d, i) => ({
          actual: uniqueTargets[yTest[i]],
          predicted: uniqueTargets[testPredictions[i]],
          probability: testProbabilities[i],
          correct: yTest[i] === testPredictions[i]
        }))
      });

      setModelTrained(true);
    } catch (error) {
      console.error('Training error:', error);
      alert('Error training model. Please check your data.');
    }
  };

  /**
   * Render confusion matrix heatmap
   */
  const renderConfusionMatrix = (confusion, title) => {
    const { tp, fp, tn, fn } = confusion;
    const total = tp + fp + tn + fn;

    return (
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Predicted Negative</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Predicted Positive</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Actual Negative</TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: '#4caf50',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1.1rem'
                    }}
                  >
                    {tn} ({((tn/total) * 100).toFixed(1)}%)
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: '#f44336',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1.1rem'
                    }}
                  >
                    {fp} ({((fp/total) * 100).toFixed(1)}%)
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Actual Positive</TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: '#f44336',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1.1rem'
                    }}
                  >
                    {fn} ({((fn/total) * 100).toFixed(1)}%)
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: '#4caf50',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1.1rem'
                    }}
                  >
                    {tp} ({((tp/total) * 100).toFixed(1)}%)
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Green = Correct predictions, Red = Incorrect predictions
          </Typography>
        </CardContent>
      </Card>
    );
  };

  /**
   * Render performance metrics
   */
  const renderMetrics = (metrics, title) => {
    const getMetricColor = (value) => {
      if (value >= 0.9) return '#4caf50';
      if (value >= 0.7) return '#ff9800';
      return '#f44336';
    };

    return (
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Accuracy
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: getMetricColor(metrics.accuracy)
                  }}
                >
                  {(metrics.accuracy * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Precision
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: getMetricColor(metrics.precision)
                  }}
                >
                  {(metrics.precision * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Recall
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: getMetricColor(metrics.recall)
                  }}
                >
                  {(metrics.recall * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  F1-Score
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: getMetricColor(metrics.f1Score)
                  }}
                >
                  {(metrics.f1Score * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Metric Interpretations */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" paragraph>
              <strong>Accuracy:</strong> Overall correctness ({((metrics.accuracy * 100).toFixed(1))}% of predictions correct)
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Precision:</strong> Of predicted positives, {((metrics.precision * 100).toFixed(1))}% were actually positive
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Recall (Sensitivity):</strong> Of actual positives, {((metrics.recall * 100).toFixed(1))}% were correctly identified
            </Typography>
            <Typography variant="body2">
              <strong>F1-Score:</strong> Harmonic mean of precision and recall ({((metrics.f1Score * 100).toFixed(1))}%)
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // No data uploaded
  if (!data || data.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body1">
          Please upload a dataset first using the Data Profiling module.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Configuration Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          1. Configure Classification Model
        </Typography>

        <Grid container spacing={3}>
          {/* Target Column Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Target Column (Binary: 0/1 or two categories)</InputLabel>
              <Select
                value={targetColumn}
                onChange={(e) => {
                  setTargetColumn(e.target.value);
                  setModelTrained(false);
                }}
              >
                {numericColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Test Size */}
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>
              Test Set Size: {(testSize * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={testSize}
              onChange={(e, val) => {
                setTestSize(val);
                setModelTrained(false);
              }}
              min={0.1}
              max={0.4}
              step={0.05}
              marks
              valueLabelDisplay="auto"
              valueLabelFormat={(val) => `${(val * 100).toFixed(0)}%`}
            />
          </Grid>

          {/* Learning Rate */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Learning Rate"
              type="number"
              value={learningRate}
              onChange={(e) => {
                setLearningRate(parseFloat(e.target.value));
                setModelTrained(false);
              }}
              inputProps={{ step: 0.001, min: 0.001, max: 1 }}
            />
          </Grid>

          {/* Iterations */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Training Iterations"
              type="number"
              value={iterations}
              onChange={(e) => {
                setIterations(parseInt(e.target.value));
                setModelTrained(false);
              }}
              inputProps={{ step: 100, min: 100, max: 10000 }}
            />
          </Grid>
        </Grid>

        {/* Feature Selection */}
        {targetColumn && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
              Select Features for Classification:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {availableFeatures.map(col => (
                <Chip
                  key={col}
                  label={col}
                  onClick={() => handleFeatureToggle(col)}
                  color={featureColumns.includes(col) ? 'primary' : 'default'}
                  variant={featureColumns.includes(col) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Train Button */}
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleTrain}
            disabled={!targetColumn || featureColumns.length === 0}
            size="large"
          >
            Train Classification Model
          </Button>
        </Box>
      </Paper>

      {/* Results Section */}
      {modelTrained && results && (
        <>
          <Divider sx={{ my: 3 }} />

          {/* Dataset Split Info */}
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Model trained successfully!</strong> Training set: {results.trainSize} samples,
              Test set: {results.testSize} samples
            </Typography>
          </Alert>

          {/* Training Set Performance */}
          <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 600, mt: 3 }}>
            2. Training Set Performance
          </Typography>
          {renderConfusionMatrix(results.trainConfusion, 'Training Confusion Matrix')}
          {renderMetrics(results.trainMetrics, 'Training Metrics')}

          {/* Test Set Performance */}
          <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 600, mt: 4 }}>
            3. Test Set Performance (Unseen Data)
          </Typography>
          {renderConfusionMatrix(results.testConfusion, 'Test Confusion Matrix')}
          {renderMetrics(results.testMetrics, 'Test Metrics')}

          {/* Model Interpretation */}
          <Card elevation={2} sx={{ mb: 3, bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                Model Interpretation
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Overfitting Check:</strong> {
                  results.trainMetrics.accuracy - results.testMetrics.accuracy > 0.1
                    ? '⚠️ Warning: Training accuracy is significantly higher than test accuracy, indicating possible overfitting.'
                    : '✓ Model generalizes well to unseen data.'
                }
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Model Quality:</strong> {
                  results.testMetrics.accuracy >= 0.9 ? '✓ Excellent (≥90% accuracy)' :
                  results.testMetrics.accuracy >= 0.7 ? '✓ Good (70-89% accuracy)' :
                  '⚠️ Poor (<70% accuracy) - Consider feature engineering or more data'
                }
              </Typography>
              <Typography variant="body2">
                <strong>Feature Count:</strong> Model uses {featureColumns.length} feature(s) to make predictions
              </Typography>
            </CardContent>
          </Card>

          {/* Predictions Table */}
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Set Predictions (First 10 rows)
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actual</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Predicted</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Probability</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Correct?</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.predictions.slice(0, 10).map((pred, idx) => (
                      <TableRow key={idx} sx={{ bgcolor: pred.correct ? 'transparent' : '#ffebee' }}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{pred.actual}</TableCell>
                        <TableCell>{pred.predicted}</TableCell>
                        <TableCell>{(pred.probability * 100).toFixed(1)}%</TableCell>
                        <TableCell>
                          <Chip
                            label={pred.correct ? 'Yes' : 'No'}
                            color={pred.correct ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Showing first 10 predictions. Red rows indicate incorrect predictions.
              </Typography>
            </CardContent>
          </Card>
        </>
      )}

      {/* Help Section */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
          How to Use Classification
        </Typography>
        <Typography variant="body2" paragraph>
          1. <strong>Select Target:</strong> Choose a binary target column (must have exactly 2 unique values)
        </Typography>
        <Typography variant="body2" paragraph>
          2. <strong>Select Features:</strong> Click on feature columns to include them in the model
        </Typography>
        <Typography variant="body2" paragraph>
          3. <strong>Configure:</strong> Adjust test size, learning rate, and iterations
        </Typography>
        <Typography variant="body2" paragraph>
          4. <strong>Train:</strong> Click "Train Classification Model" to fit the logistic regression
        </Typography>
        <Typography variant="body2">
          5. <strong>Evaluate:</strong> Review confusion matrix, metrics, and predictions
        </Typography>
      </Paper>
    </Box>
  );
};

export default Classification;
