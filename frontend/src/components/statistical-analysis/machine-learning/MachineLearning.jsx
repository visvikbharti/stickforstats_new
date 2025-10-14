/**
 * Machine Learning Module
 *
 * Train, evaluate, and deploy ML models directly in the browser:
 * - Linear Regression (predict continuous outcomes)
 * - Logistic Regression & Classification (predict categories)
 * - Clustering (discover patterns)
 * - Model Evaluation (metrics, validation, feature importance)
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Button,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CategoryIcon from '@mui/icons-material/Category';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';

// Import ML components
import LinearRegressionML from './LinearRegressionML';
import Classification from './Classification';
// import Clustering from './Clustering';

/**
 * Main Machine Learning Component
 *
 * Hub for selecting and running machine learning models
 */
const MachineLearning = ({ data, setData, onComplete }) => {
  const [currentModel, setCurrentModel] = useState(null);

  /**
   * ML model definitions
   */
  const mlModels = [
    {
      id: 'linear-regression',
      name: 'Linear Regression',
      description: 'Predict continuous outcomes using linear relationships between features and target',
      icon: TrendingUpIcon,
      component: LinearRegressionML,
      available: true,
      difficulty: 'Beginner',
      concepts: ['Least Squares', 'R²', 'Residuals', 'Feature Importance', 'Train/Test Split']
    },
    {
      id: 'classification',
      name: 'Classification',
      description: 'Predict categorical outcomes: Logistic Regression, Decision Trees, Random Forest',
      icon: CategoryIcon,
      component: Classification,
      available: true,
      difficulty: 'Intermediate',
      concepts: ['Logistic Regression', 'Confusion Matrix', 'Accuracy', 'Precision/Recall', 'ROC Curve']
    },
    {
      id: 'clustering',
      name: 'Clustering',
      description: 'Discover natural groupings in data: K-means, Hierarchical, DBSCAN',
      icon: BubbleChartIcon,
      component: null, // Clustering,
      available: true,
      difficulty: 'Intermediate',
      concepts: ['K-means', 'Hierarchical', 'Silhouette Score', 'Elbow Method', 'Dendrogram']
    }
  ];

  /**
   * Handle model selection
   */
  const handleModelClick = (model) => {
    if (model.available && model.component) {
      setCurrentModel(model.id);
    }
  };

  /**
   * Return to model selection
   */
  const handleBackToSelection = () => {
    setCurrentModel(null);
  };

  /**
   * Render selected model component
   */
  if (currentModel) {
    const model = mlModels.find(m => m.id === currentModel);
    const ModelComponent = model.component;

    return (
      <Box>
        {/* Model Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToSelection}
            sx={{ mb: 2 }}
          >
            Back to Model Selection
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <model.icon sx={{ fontSize: 40, color: '#1976d2' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
                {model.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {model.description}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Model Component */}
        {ModelComponent ? (
          <ModelComponent data={data} />
        ) : (
          <Alert severity="info">
            <Typography variant="body1">
              This model is under development. Coming soon!
            </Typography>
          </Alert>
        )}
      </Box>
    );
  }

  /**
   * Render model selection interface
   */
  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <PsychologyIcon sx={{ fontSize: 40, color: '#1976d2' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
              Machine Learning
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Train predictive models and discover patterns in your data—all in your browser
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Getting Started:</strong> Machine learning models learn patterns from your data to make predictions.
            Start with data profiling and preprocessing to ensure your data is clean and ready for modeling.
          </Typography>
        </Alert>

        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Privacy First:</strong> All ML training happens in your browser using TensorFlow.js.
            Your data never leaves your computer, ensuring complete privacy and security.
          </Typography>
        </Alert>
      </Paper>

      {/* ML Models Grid */}
      <Grid container spacing={3}>
        {mlModels.map((model) => {
          const IconComponent = model.icon;
          const isUnderDevelopment = !model.component;

          return (
            <Grid item xs={12} md={4} key={model.id}>
              <Card
                elevation={isUnderDevelopment ? 1 : 3}
                sx={{
                  height: '100%',
                  opacity: isUnderDevelopment ? 0.6 : 1,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: isUnderDevelopment ? 'none' : 'translateY(-4px)',
                    boxShadow: isUnderDevelopment ? undefined : 6
                  }
                }}
              >
                <CardActionArea
                  onClick={() => handleModelClick(model)}
                  disabled={isUnderDevelopment}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    {/* Model Icon and Difficulty */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <IconComponent sx={{ fontSize: 36, color: '#1976d2' }} />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={model.difficulty}
                          size="small"
                          color={model.difficulty === 'Beginner' ? 'success' : 'warning'}
                        />
                        {isUnderDevelopment && (
                          <Chip label="Coming Soon" size="small" color="default" />
                        )}
                      </Box>
                    </Box>

                    {/* Model Name */}
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {model.name}
                    </Typography>

                    {/* Model Description */}
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {model.description}
                    </Typography>

                    {/* Key Concepts */}
                    {model.concepts && (
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                          Key Concepts:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {model.concepts.map((concept, idx) => (
                            <Chip
                              key={idx}
                              label={concept}
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Status Message */}
                    {isUnderDevelopment && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 2,
                          color: '#666',
                          fontStyle: 'italic'
                        }}
                      >
                        Under active development. Check back soon!
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Help Section */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: '#e3f2fd' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
          When to Use Machine Learning?
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Linear Regression:</strong> Predict continuous outcomes (e.g., sales, temperature, prices) from features
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Classification:</strong> Predict categories (e.g., spam/not spam, disease present/absent, customer segment)
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Clustering:</strong> Discover natural groups in data when you don't have labels (unsupervised learning)
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
          ML Best Practices:
        </Typography>
        <Typography variant="body2" paragraph>
          1. <strong>Clean Your Data:</strong> Use Data Preprocessing module to handle missing values and outliers
        </Typography>
        <Typography variant="body2" paragraph>
          2. <strong>Train/Test Split:</strong> Always evaluate models on held-out test data to avoid overfitting
        </Typography>
        <Typography variant="body2" paragraph>
          3. <strong>Feature Selection:</strong> Use correlation analysis to identify important predictors
        </Typography>
        <Typography variant="body2">
          4. <strong>Interpret Results:</strong> Don't just look at accuracy—understand what your model learned
        </Typography>
      </Paper>
    </Box>
  );
};

export default MachineLearning;
