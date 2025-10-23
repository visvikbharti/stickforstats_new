import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

function FactorVisualization({ results, configuration }) {
  if (!results) {
    return <Box sx={{ p: 3 }}><Typography>No results available.</Typography></Box>;
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

        {/* Visualization Placeholder */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
            <Typography variant="h6" color="text.secondary" textAlign="center">
              📊 Factor Loadings Heatmap
              <br />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Interactive visualization of factor loadings coming soon
              </Typography>
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default FactorVisualization;
