import React from 'react';
import { Box, Typography, Button, Paper, Grid } from '@mui/material';
import { Psychology, Sync, Assessment } from '@mui/icons-material';

function FactorIntroduction({ onContinue }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Welcome to Exploratory Factor Analysis (EFA)
      </Typography>

      <Typography variant="body1" paragraph>
        Factor analysis identifies underlying latent variables (factors) that explain patterns of correlations among observed variables.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Data Adequacy
            </Typography>
            <Typography variant="body2">
              Test your data with Bartlett's test and KMO measure to ensure factor analysis is appropriate.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
            <Psychology sx={{ fontSize: 50, color: 'secondary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Factor Extraction
            </Typography>
            <Typography variant="body2">
              Extract latent factors using methods like minimum residual, maximum likelihood, or principal factor.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
            <Sync sx={{ fontSize: 50, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Factor Rotation
            </Typography>
            <Typography variant="body2">
              Apply rotation methods (varimax, promax, oblimin, quartimax) for better interpretability.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, bgcolor: 'info.light', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📊 What You'll Need
        </Typography>
        <Typography variant="body2">
          • <strong>Continuous variables:</strong> Interval or ratio scale data
          <br />
          • <strong>Adequate sample size:</strong> At least 5-10 observations per variable
          <br />
          • <strong>Correlations:</strong> Variables should be reasonably correlated (|r| &gt; 0.3)
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button variant="contained" size="large" onClick={onContinue}>
          Get Started
        </Button>
      </Box>
    </Box>
  );
}

export default FactorIntroduction;
