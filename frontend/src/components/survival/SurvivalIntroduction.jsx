import React from 'react';
import { Box, Typography, Button, Paper, Grid } from '@mui/material';
import { Timeline, TrendingUp, Assessment } from '@mui/icons-material';

function SurvivalIntroduction({ onContinue }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Welcome to Survival Analysis
      </Typography>

      <Typography variant="body1" paragraph>
        Survival analysis models time-to-event data, accounting for censored observations where the event has not yet occurred.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Timeline sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Kaplan-Meier Estimation
            </Typography>
            <Typography variant="body2">
              Non-parametric estimation of survival functions from time-to-event data with censoring.
              Compare survival curves between groups using log-rank tests.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <TrendingUp sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Cox Proportional Hazards
            </Typography>
            <Typography variant="body2">
              Semi-parametric regression to model the effect of covariates on hazard rates.
              Estimate hazard ratios and predict survival probabilities.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, bgcolor: 'info.light', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📊 What You'll Need
        </Typography>
        <Typography variant="body2">
          • <strong>Duration column:</strong> Time to event or censoring
          <br />
          • <strong>Event column:</strong> Event indicator (1 = event occurred, 0 = censored)
          <br />
          • <strong>Optional:</strong> Grouping variable (for Kaplan-Meier) or covariates (for Cox regression)
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onContinue}
        >
          Get Started
        </Button>
      </Box>
    </Box>
  );
}

export default SurvivalIntroduction;
