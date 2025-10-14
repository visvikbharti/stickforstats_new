/**
 * Statistical Tests Module
 *
 * Comprehensive hypothesis testing tools with 5 categories:
 * 1. Normality Tests - Shapiro-Wilk, Anderson-Darling, D'Agostino K², Q-Q Plot
 * 2. Parametric Tests - t-tests (one-sample, independent, paired), ANOVA
 * 3. Non-parametric Tests - Mann-Whitney U, Kruskal-Wallis, Wilcoxon, Friedman
 * 4. Correlation Tests - Pearson, Spearman, Kendall's tau, correlation matrix
 * 5. Categorical Tests - Chi-square, Fisher's exact, Cramer's V
 *
 * Ported from: app/utils/statistical_tests.py
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import GridOnIcon from '@mui/icons-material/GridOn';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Import test components
import NormalityTests from './NormalityTests';
import ParametricTests from './ParametricTests';
import NonParametricTests from './NonParametricTests';
import CorrelationTests from './CorrelationTests';
import CategoricalTests from './CategoricalTests';

/**
 * Main Statistical Tests Component
 */
const StatisticalTests = ({ data, setData, onComplete }) => {
  const [testCategory, setTestCategory] = useState('');

  /**
   * Test category definitions
   */
  const testCategories = [
    {
      id: 'normality',
      name: 'Normality Tests',
      description: 'Test if data follows a normal distribution with Shapiro-Wilk, Anderson-Darling, and visual diagnostics',
      icon: CheckCircleOutlineIcon,
      component: NormalityTests,
      available: true,
      tests: ['Shapiro-Wilk', 'Anderson-Darling', "D'Agostino K²", 'Q-Q Plot', 'Histogram with KDE']
    },
    {
      id: 'parametric',
      name: 'Parametric Tests',
      description: 'Classical hypothesis tests assuming normal distribution: t-tests and ANOVA',
      icon: TimelineIcon,
      component: ParametricTests,
      available: true,
      tests: ['One-Sample t-test', 'Independent t-test', 'Paired t-test', 'One-way ANOVA', 'Tukey HSD']
    },
    {
      id: 'nonparametric',
      name: 'Non-parametric Tests',
      description: 'Distribution-free tests for non-normal data or ordinal scales',
      icon: CompareArrowsIcon,
      component: NonParametricTests,
      available: true,
      tests: ['Mann-Whitney U', 'Kruskal-Wallis', 'Wilcoxon Signed-Rank', 'Friedman Test']
    },
    {
      id: 'correlation',
      name: 'Correlation Tests',
      description: 'Measure relationships between variables with correlation coefficients and significance tests',
      icon: ScatterPlotIcon,
      component: CorrelationTests,
      available: true,
      tests: ['Pearson r', 'Spearman ρ', "Kendall's τ", 'Correlation Matrix', 'Significance Testing']
    },
    {
      id: 'categorical',
      name: 'Categorical Tests',
      description: 'Test relationships between categorical variables with contingency tables',
      icon: GridOnIcon,
      component: CategoricalTests,
      available: true,
      tests: ['Chi-square Test', "Fisher's Exact", "Cramer's V", 'Contingency Table']
    }
  ];

  /**
   * Get selected test category
   */
  const selectedCategory = testCategories.find(cat => cat.id === testCategory);

  /**
   * Handle test category change
   */
  const handleCategoryChange = (event) => {
    setTestCategory(event.target.value);
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

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon /> Statistical Tests
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          Perform comprehensive hypothesis testing and statistical inference on your data.
          Choose a test category below to get started.
        </Typography>

        {/* Test Category Selector */}
        <FormControl fullWidth sx={{ mt: 3 }}>
          <InputLabel>Select Test Category</InputLabel>
          <Select
            value={testCategory}
            label="Select Test Category"
            onChange={handleCategoryChange}
          >
            <MenuItem value="">
              <em>Choose a test category...</em>
            </MenuItem>
            {testCategories.map((category) => (
              <MenuItem
                key={category.id}
                value={category.id}
                disabled={!category.available}
              >
                {category.name} {!category.available && '(Coming Soon)'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Test Category Cards (when no selection) */}
        {!testCategory && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {testCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={category.id}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: category.available ? 'pointer' : 'not-allowed',
                      opacity: category.available ? 1 : 0.5,
                      '&:hover': category.available ? {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s'
                      } : {}
                    }}
                    onClick={() => category.available && setTestCategory(category.id)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <IconComponent sx={{ fontSize: 32, color: '#1976d2', mr: 1 }} />
                        <Typography variant="h6" component="div">
                          {category.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {category.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Includes:</strong> {category.tests.slice(0, 3).join(', ')}
                        {category.tests.length > 3 && '...'}
                      </Typography>
                      {!category.available && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
                          Coming soon!
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Render Selected Test Component */}
      {selectedCategory && selectedCategory.component && (
        <Box>
          {/* Test Category Info */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>{selectedCategory.name}:</strong> {selectedCategory.description}
            </Typography>
          </Alert>

          {/* Test Component */}
          {React.createElement(selectedCategory.component, {
            data,
            setData,
            onComplete
          })}
        </Box>
      )}

      {/* Coming Soon Message */}
      {selectedCategory && !selectedCategory.component && (
        <Alert severity="warning">
          <Typography variant="body1">
            <strong>{selectedCategory.name}</strong> is under development and will be available soon!
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Available tests: {selectedCategory.tests.join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Statistical Testing Guidelines */}
      {!testCategory && (
        <Paper elevation={2} sx={{ p: 3, mt: 3, bgcolor: '#e3f2fd' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
            Guidelines for Statistical Testing
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Check Assumptions First:</strong> Use normality tests before parametric tests
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Choose Appropriate Tests:</strong> Parametric tests for normal data, non-parametric for others
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Interpret p-values Carefully:</strong> p &lt; 0.05 suggests statistical significance, but consider effect sizes
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Multiple Comparisons:</strong> Apply corrections (Bonferroni, Holm) when testing multiple hypotheses
          </Typography>
          <Typography variant="body2">
            • <strong>Report Effect Sizes:</strong> Statistical significance doesn't equal practical importance
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default StatisticalTests;
