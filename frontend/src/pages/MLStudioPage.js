import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Upload as UploadIcon,
  Engineering as EngineeringIcon,
  Psychology as ModelTrainingIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  DataUsage as DataUsageIcon,
  Tune as TuneIcon,
  SaveAlt as SaveAltIcon
} from '@mui/icons-material';

const MLStudioPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState('');
  const [trainingStatus, setTrainingStatus] = useState('idle');

  const mlModels = [
    {
      category: 'Classification',
      models: [
        { id: 'logistic', name: 'Logistic Regression', description: 'Binary and multiclass classification' },
        { id: 'svm', name: 'Support Vector Machine', description: 'Non-linear classification' },
        { id: 'rf_class', name: 'Random Forest', description: 'Ensemble classification' },
        { id: 'nn_class', name: 'Neural Network', description: 'Deep learning classification' }
      ]
    },
    {
      category: 'Regression',
      models: [
        { id: 'linear', name: 'Linear Regression', description: 'Simple linear relationships' },
        { id: 'ridge', name: 'Ridge Regression', description: 'L2 regularized regression' },
        { id: 'lasso', name: 'Lasso Regression', description: 'L1 regularized regression' },
        { id: 'rf_reg', name: 'Random Forest', description: 'Ensemble regression' }
      ]
    },
    {
      category: 'Clustering',
      models: [
        { id: 'kmeans', name: 'K-Means', description: 'Partition-based clustering' },
        { id: 'dbscan', name: 'DBSCAN', description: 'Density-based clustering' },
        { id: 'hierarchical', name: 'Hierarchical', description: 'Tree-based clustering' },
        { id: 'gmm', name: 'Gaussian Mixture', description: 'Probabilistic clustering' }
      ]
    }
  ];

  const steps = [
    {
      label: 'Upload Dataset',
      description: 'Select and prepare your data'
    },
    {
      label: 'Choose Model',
      description: 'Select appropriate ML algorithm'
    },
    {
      label: 'Configure Parameters',
      description: 'Fine-tune model settings'
    },
    {
      label: 'Train & Evaluate',
      description: 'Train model and view results'
    }
  ];

  const sampleMetrics = {
    accuracy: 0.94,
    precision: 0.92,
    recall: 0.96,
    f1Score: 0.94,
    auc: 0.97
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Machine Learning Studio
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Build, train, and deploy machine learning models with an intuitive interface. 
          Perfect for both beginners and advanced practitioners.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Panel - Workflow Steps */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ML Workflow
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel>{step.label}</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                    <Box sx={{ mb: 2, mt: 2 }}>
                      {index === 0 && (
                        <Button
                          variant="outlined"
                          startIcon={<UploadIcon />}
                          fullWidth
                        >
                          Upload Dataset
                        </Button>
                      )}
                      {index === 1 && (
                        <FormControl fullWidth>
                          <InputLabel>Select Model</InputLabel>
                          <Select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            label="Select Model"
                          >
                            {mlModels.map((category) => [
                              <MenuItem key={`header-${category.category}`} disabled>
                                <Typography variant="subtitle2">{category.category}</Typography>
                              </MenuItem>,
                              ...category.models.map((model) => (
                                <MenuItem key={model.id} value={model.id}>
                                  {model.name}
                                </MenuItem>
                              ))
                            ])}
                          </Select>
                        </FormControl>
                      )}
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Continue
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Back
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
            {activeStep === steps.length && (
              <Paper square elevation={0} sx={{ p: 3 }}>
                <Typography>All steps completed - you're ready to deploy!</Typography>
                <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                  Reset
                </Button>
              </Paper>
            )}
          </Paper>
        </Grid>

        {/* Center Panel - Model Gallery */}
        <Grid item xs={12} md={5}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Available Models
            </Typography>
            {mlModels.map((category) => (
              <Box key={category.category} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  {category.category}
                </Typography>
                <Grid container spacing={2}>
                  {category.models.map((model) => (
                    <Grid item xs={12} sm={6} key={model.id}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          cursor: 'pointer',
                          border: selectedModel === model.id ? 2 : 1,
                          borderColor: selectedModel === model.id ? 'primary.main' : 'divider'
                        }}
                        onClick={() => setSelectedModel(model.id)}
                      >
                        <CardContent>
                          <Typography variant="subtitle2">
                            {model.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {model.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Paper>

          {/* Training Progress */}
          {trainingStatus !== 'idle' && (
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Training Progress
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Epoch 15 of 100</Typography>
                  <Typography variant="body2">15%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={15} />
              </Box>
              <Box display="flex" gap={1}>
                <Chip label="Loss: 0.342" size="small" />
                <Chip label="Val Loss: 0.358" size="small" />
                <Chip label="ETA: 5 min" size="small" />
              </Box>
            </Paper>
          )}
        </Grid>

        {/* Right Panel - Results */}
        <Grid item xs={12} md={3}>
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Model Performance
            </Typography>
            {Object.entries(sampleMetrics).map(([metric, value]) => (
              <Box key={metric} sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {metric.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {(value * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={value * 100}
                  color={value > 0.9 ? 'success' : 'primary'}
                />
              </Box>
            ))}
          </Paper>

          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Button fullWidth variant="outlined" sx={{ mb: 1 }} startIcon={<TuneIcon />}>
              Hyperparameter Tuning
            </Button>
            <Button fullWidth variant="outlined" sx={{ mb: 1 }} startIcon={<AssessmentIcon />}>
              Cross-Validation
            </Button>
            <Button fullWidth variant="outlined" sx={{ mb: 1 }} startIcon={<SaveAltIcon />}>
              Export Model
            </Button>
            <Button fullWidth variant="outlined" startIcon={<SpeedIcon />}>
              Deploy Model
            </Button>
          </Paper>
        </Grid>

        {/* Bottom Section - Feature Importance */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Feature Importance
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell align="right">Importance</TableCell>
                    <TableCell>Impact</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Feature A</TableCell>
                    <TableCell align="right">0.342</TableCell>
                    <TableCell>
                      <LinearProgress variant="determinate" value={34.2} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Feature B</TableCell>
                    <TableCell align="right">0.285</TableCell>
                    <TableCell>
                      <LinearProgress variant="determinate" value={28.5} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Feature C</TableCell>
                    <TableCell align="right">0.196</TableCell>
                    <TableCell>
                      <LinearProgress variant="determinate" value={19.6} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MLStudioPage;