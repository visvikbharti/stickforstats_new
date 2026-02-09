import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

function SurvivalVisualization({ results, configuration }) {
  if (!results) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Survival analysis visualization requires backend computation. Upload your data and run the analysis to see results.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Survival Analysis Results
      </Typography>

      <Grid container spacing={3}>
        {/* Summary Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary Statistics
            </Typography>
            {results.n_subjects && (
              <>
                <Typography variant="body2">
                  <strong>Subjects:</strong> {results.n_subjects}
                </Typography>
                <Typography variant="body2">
                  <strong>Events:</strong> {results.n_events}
                </Typography>
                <Typography variant="body2">
                  <strong>Censored:</strong> {results.n_censored}
                </Typography>
              </>
            )}
          </Paper>
        </Grid>

        {/* Median Survival */}
        {results.median_survival && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Median Survival Time
              </Typography>
              <Typography variant="h4" color="primary.main">
                {results.median_survival.time?.toFixed(2) || 'N/A'}
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Hazard Ratios (Cox regression) */}
        {results.hazard_ratios && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Hazard Ratios
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Concordance Index: {results.concordance_index?.toFixed(4) || 'N/A'}
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Visualization Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
            <Box textAlign="center">
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Survival Curve Visualization
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kaplan-Meier curve plotting is not yet implemented in this version.
                Numerical results are displayed above.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SurvivalVisualization;
