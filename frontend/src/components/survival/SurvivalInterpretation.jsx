import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

function SurvivalInterpretation({ results, configuration, onContinue }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Interpretation Guide
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Key Findings
        </Typography>
        <Typography variant="body2" paragraph>
          {configuration.analysisType === 'kaplan-meier'
            ? 'Kaplan-Meier analysis provides non-parametric estimates of survival probabilities over time.'
            : 'Cox regression models the effect of covariates on hazard rates while leaving the baseline hazard unspecified.'}
        </Typography>
        <Typography variant="body2">
          Detailed statistical interpretation and recommendations will be available in the final report.
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          onClick={onContinue}
        >
          Continue to Report
        </Button>
      </Box>
    </Box>
  );
}

export default SurvivalInterpretation;
