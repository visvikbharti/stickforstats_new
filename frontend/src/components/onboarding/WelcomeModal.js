import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Science as ScienceIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useTour } from './TourProvider';

const WelcomeModal = () => {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const { startTour } = useTour();

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWelcome', 'true');
    }
    setOpen(false);
  };

  const handleStartTour = () => {
    handleClose();
    setTimeout(() => {
      startTour();
    }, 500);
  };

  const welcomeSteps = [
    {
      label: 'Comprehensive Statistical Analysis',
      description: 'Access powerful tools for confidence intervals, DOE, PCA, distributions, and quality control.',
      icon: <ScienceIcon color="primary" />,
    },
    {
      label: 'Built for Scientists & Industry',
      description: 'Whether you\'re a PhD student or enterprise user, StickForStats adapts to your needs.',
      icon: <TrendingUpIcon color="primary" />,
    },
    {
      label: 'Collaborative Features',
      description: 'Share analyses, collaborate with teams, and generate professional reports.',
      icon: <GroupIcon color="primary" />,
    },
    {
      label: 'Educational Resources',
      description: 'Learn statistics with interactive tutorials and comprehensive documentation.',
      icon: <SchoolIcon color="primary" />,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h4" component="div" gutterBottom>
          Welcome to StickForStats! 🎯
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          The world's most comprehensive statistical analysis platform
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" paragraph>
            Thank you for choosing StickForStats! We're excited to help you unlock the power of statistical analysis.
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          {welcomeSteps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: activeStep >= index ? 'primary.main' : 'grey.300',
                      color: 'white',
                    }}
                  >
                    {step.icon}
                  </Box>
                )}
                onClick={() => setActiveStep(index)}
                sx={{ cursor: 'pointer' }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
            }
            label="Don't show this again"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} color="inherit">
          Skip
        </Button>
        <Button 
          onClick={handleStartTour} 
          variant="contained" 
          color="primary"
          size="large"
        >
          Take a Tour
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WelcomeModal;