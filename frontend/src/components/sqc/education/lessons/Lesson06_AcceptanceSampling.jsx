import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Paper,
  Alert
} from '@mui/material';

/**
 * Lesson 6: Acceptance Sampling
 *
 * TO BE FULLY IMPLEMENTED
 * Topics: Sampling plans, OC curves, AQL, LTPD, producer/consumer risk
 */

const Lesson06_AcceptanceSampling = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);
  const handleReset = () => setActiveStep(0);
  const handleComplete = () => {
    if (onComplete) onComplete();
  };

  const steps = [
    {
      label: 'Introduction: Acceptance Sampling',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Making Accept/Reject Decisions
          </Typography>
          <Typography paragraph>
            Acceptance sampling helps you decide whether to accept or reject a lot based on a sample.
            Coming soon: Interactive OC curves and sampling plan design.
          </Typography>
        </Box>
      )
    },
    {
      label: 'Summary',
      content: (
        <Box>
          <Alert severity="success" sx={{ my: 2 }}>
            <strong>Lesson 6 - Acceptance Sampling will be fully implemented next.</strong>
          </Alert>
          <Button variant="contained" color="success" onClick={handleComplete} fullWidth>
            Complete Lesson 6
          </Button>
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#d32f2f', fontWeight: 700 }}>
          Lesson 6: Acceptance Sampling
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Learn sampling plans, OC curves, and producer/consumer risk
        </Typography>

        <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 3 }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>{step.content}</Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={index === steps.length - 1}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button disabled={index === 0} onClick={handleBack}>
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3, mt: 3, bgcolor: '#e8f5e9' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
              Lesson 6 Complete! 🎉
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={handleReset} variant="outlined">
                Review Lesson
              </Button>
              <Button onClick={handleComplete} variant="contained" color="success">
                Mark as Complete & Continue
              </Button>
            </Box>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default Lesson06_AcceptanceSampling;
