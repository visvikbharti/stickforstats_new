import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

function FactorVisualization({ results, configuration }) {
  if (!results) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Factor analysis visualization requires backend computation. Upload your data and run the analysis to see results.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Factor Analysis Results
      </Typography>

      <Grid container spacing={3}>
        {/* Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Analysis Summary
            </Typography>
            <Typography variant="body2">
              <strong>Factors Extracted:</strong> {results.n_factors}
            </Typography>
            <Typography variant="body2">
              <strong>Rotation:</strong> {configuration.rotation}
            </Typography>
            <Typography variant="body2">
              <strong>Variance Explained:</strong> {(results.variance_explained?.total_variance_explained * 100)?.toFixed(2)}%
            </Typography>
          </Paper>
        </Grid>

        {/* Model Fit */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Model Fit
            </Typography>
            <Typography variant="h4" color="primary.main">
              {(results.variance_explained?.total_variance_explained * 100)?.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Variance Explained
            </Typography>
          </Paper>
        </Grid>

        {/* Visualization Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
            <Box textAlign="center">
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Factor Loadings Heatmap
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Factor loadings heatmap is not yet implemented in this version.
                Numerical results are displayed above.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default FactorVisualization;
