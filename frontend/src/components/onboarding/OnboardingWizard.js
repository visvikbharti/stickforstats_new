import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useOnboarding } from '../../context/OnboardingContext';

const OnboardingWizard = () => {
  const {
    isOnboardingActive,
    currentStep,
    onboardingSteps,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    currentStepData
  } = useOnboarding();

  if (!isOnboardingActive) {
    return null;
  }

  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <Dialog
      open={isOnboardingActive}
      maxWidth="md"
      fullWidth
      onClose={skipOnboarding}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            Welcome to StickForStats
          </Typography>
          <IconButton onClick={skipOnboarding} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={currentStep} orientation="vertical">
          {onboardingSteps.map((step, index) => (
            <Step key={step.id}>
              <StepLabel
                optional={
                  index === onboardingSteps.length - 1 ? (
                    <Typography variant="caption">Last step</Typography>
                  ) : null
                }
              >
                {step.title}
              </StepLabel>
              <StepContent>
                <Card elevation={0} sx={{ bgcolor: 'background.default', mb: 2 }}>
                  <CardContent>
                    <Typography variant="body1" paragraph>
                      {step.description}
                    </Typography>
                    
                    {step.id === 'welcome' && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          StickForStats provides comprehensive statistical analysis tools for:
                        </Typography>
                        <ul>
                          <li>Statistical Quality Control (SQC)</li>
                          <li>Principal Component Analysis (PCA)</li>
                          <li>Design of Experiments (DOE)</li>
                          <li>Confidence Intervals</li>
                          <li>Probability Distributions</li>
                        </ul>
                      </Box>
                    )}
                    
                    {step.id === 'modules' && (
                      <Typography variant="body2" color="text.secondary">
                        Access all statistical modules from the navigation menu. Each module 
                        provides powerful analysis capabilities with interactive visualizations.
                      </Typography>
                    )}
                    
                    {step.id === 'data' && (
                      <Typography variant="body2" color="text.secondary">
                        Upload CSV, Excel, or other data formats. Your data is processed 
                        securely and can be reused across different analyses.
                      </Typography>
                    )}
                    
                    {step.id === 'analysis' && (
                      <Typography variant="body2" color="text.secondary">
                        Select your analysis type, configure parameters, and get instant 
                        results with publication-ready visualizations.
                      </Typography>
                    )}
                    
                    {step.id === 'reports' && (
                      <Typography variant="body2" color="text.secondary">
                        Generate comprehensive reports in PDF, Word, or HTML format. 
                        All reports include methodology, results, and interpretations.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={skipOnboarding}>
          Skip Tour
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          onClick={previousStep}
          disabled={currentStep === 0}
          startIcon={<ArrowBackIcon />}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={isLastStep ? completeOnboarding : nextStep}
          endIcon={isLastStep ? <CheckIcon /> : <ArrowForwardIcon />}
        >
          {isLastStep ? 'Get Started' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingWizard;