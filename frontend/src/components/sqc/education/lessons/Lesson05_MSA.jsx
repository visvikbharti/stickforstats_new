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
 * Lesson 5: Measurement System Analysis
 *
 * TO BE FULLY IMPLEMENTED
 * Topics: Gage R&R, Repeatability, Reproducibility, Bias, Linearity
 */

const Lesson05_MSA = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);
  const handleReset = () => setActiveStep(0);
  const handleComplete = () => {
    if (onComplete) onComplete();
  };

  const steps = [
    {
      label: 'Introduction: Measurement System Analysis',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f', fontWeight: 600 }}>
            Understanding Measurement Variation
          </Typography>
          <Typography paragraph>
            Before improving a process, ensure your measurements are reliable!
            Coming soon: Interactive Gage R&R studies and MSA analysis.
          </Typography>
        </Box>
      )
    },
    {
      label: 'Summary',
      content: (
        <Box>
          <Alert severity="success" sx={{ my: 2 }}>
            <strong>Lesson 5 - MSA will be fully implemented next.</strong>
          </Alert>
          <Button variant="contained" color="success" onClick={handleComplete} fullWidth>
            Complete Lesson 5
          </Button>
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#d32f2f', fontWeight: 700 }}>
          Lesson 5: Measurement System Analysis
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Master Gage R&R studies and measurement system validation
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
              Lesson 5 Complete! 🎉
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

export default Lesson05_MSA;
