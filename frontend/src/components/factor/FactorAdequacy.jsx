import React from 'react';
import { Box, Typography, Paper, Button, Grid, Chip, Alert } from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';

function FactorAdequacy({ adequacyResults, onContinue, onBack }) {
  if (!adequacyResults) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading adequacy results...</Typography>
      </Box>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle color="success" />;
      case 'acceptable':
        return <Warning color="warning" />;
      default:
        return <Error color="error" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent':
        return 'success';
      case 'acceptable':
        return 'warning';
      default:
        return 'error';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Data Adequacy Assessment
      </Typography>

      <Alert
        severity={getStatusColor(adequacyResults.adequacy_status)}
        icon={getStatusIcon(adequacyResults.adequacy_status)}
        sx={{ mb: 3 }}
      >
        Data adequacy status: <strong>{adequacyResults.adequacy_status.toUpperCase()}</strong>
      </Alert>

      <Grid container spacing={3}>
        {/* Bartlett's Test */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bartlett's Test of Sphericity
            </Typography>
            <Typography variant="body2" paragraph>
              Tests if the correlation matrix is significantly different from an identity matrix.
            </Typography>
            <Typography variant="body2">
              <strong>Chi-square:</strong> {adequacyResults.bartlett_test?.chi_square?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>p-value:</strong> {adequacyResults.bartlett_test?.p_value?.toFixed(6) || 'N/A'}
            </Typography>
            <Chip
              label={adequacyResults.bartlett_test?.p_value < 0.05 ? 'Significant (Good)' : 'Not Significant (Poor)'}
              color={adequacyResults.bartlett_test?.p_value < 0.05 ? 'success' : 'error'}
              sx={{ mt: 2 }}
            />
          </Paper>
        </Grid>

        {/* KMO Measure */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Kaiser-Meyer-Olkin (KMO) Measure
            </Typography>
            <Typography variant="body2" paragraph>
              Assesses sampling adequacy for factor analysis.
            </Typography>
            <Typography variant="h4" color="primary.main" sx={{ my: 2 }}>
              {adequacyResults.kmo_test?.kmo_overall?.toFixed(3) || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Interpretation:</strong> {adequacyResults.kmo_test?.interpretation || 'N/A'}
            </Typography>
          </Paper>
        </Grid>

        {/* Recommendation */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'grey.100' }}>
            <Typography variant="h6" gutterBottom>
              Recommendation
            </Typography>
            <Typography variant="body1">
              {adequacyResults.adequacy_status === 'excellent' &&
                'Your data is well-suited for factor analysis. Proceed with confidence!'}
              {adequacyResults.adequacy_status === 'acceptable' &&
                'Your data meets minimum requirements for factor analysis. Interpret results with caution.'}
              {adequacyResults.adequacy_status === 'poor' &&
                'Your data may not be suitable for factor analysis. Consider alternative methods or data transformation.'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="outlined" onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" onClick={onContinue}>
          Continue to Configuration
        </Button>
      </Box>
    </Box>
  );
}

export default FactorAdequacy;
