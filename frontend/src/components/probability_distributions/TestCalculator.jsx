import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FunctionsIcon from '@mui/icons-material/Functions';
import { motion } from 'framer-motion';

import theme from '../../theme';
import ProbabilityCalculator from './ProbabilityCalculator';
import DistributionParameters from './DistributionParameters';
import DistributionSelector from './DistributionSelector';

/**
 * Test component for the ProbabilityCalculator
 * This is a standalone page for testing the calculator functionality
 */
const TestCalculator = () => {
  const [distributionType, setDistributionType] = useState('NORMAL');
  const [parameters, setParameters] = useState({
    mean: 0,
    std: 1
  });
  const [showInitialTutorial, setShowInitialTutorial] = useState(true);

  // Define tutorial steps for first-time users
  const tutorialSteps = [
    {
      title: "Welcome to the Probability Calculator",
      content: (
        <Typography variant="body1" paragraph>
          This tool helps you calculate and visualize probabilities for various statistical distributions. 
          Follow this quick tutorial to learn how to use the calculator effectively.
        </Typography>
      )
    },
    {
      title: "Step 1: Select a Distribution",
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            Start by selecting a probability distribution (Normal, Binomial, Poisson, etc.). 
            Each distribution has different parameters you can adjust.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Chip label="Normal Distribution" color="primary" icon={<FunctionsIcon />} />
          </Box>
        </Box>
      )
    },
    {
      title: "Step 2: Adjust Parameters",
      content: (
        <Typography variant="body1" paragraph>
          Set the distribution parameters (like mean and standard deviation for Normal). 
          These define the shape and characteristics of your distribution.
        </Typography>
      )
    },
    {
      title: "Step 3: Calculate Probabilities",
      content: (
        <Typography variant="body1" paragraph>
          Choose a calculation type (Less Than, Greater Than, Between, or Exactly) and enter values. 
          The calculator will compute the probability and visualize it in the distribution.
        </Typography>
      )
    },
    {
      title: "Ready to Start!",
      content: (
        <Typography variant="body1" paragraph>
          You're all set! Explore different distributions and calculations. 
          The educational tooltips and overlays provide more information about probability concepts.
        </Typography>
      )
    }
  ];
  
  // Handle tutorial dialog
  const [activeStep, setActiveStep] = useState(0);
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  const handleCloseTutorial = () => {
    setShowInitialTutorial(false);
  };
  
  // Handle distribution type and parameters change
  const handleDistributionChange = (newParams, newType) => {
    if (newType) {
      setDistributionType(newType);
    }
    setParameters(newParams);
  };

  // Handle individual parameter changes
  const handleParameterChange = (paramName, value) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  // Handle distribution type selection from the selector component
  const handleTypeSelect = (newType) => {
    setDistributionType(newType);
    
    // Set default parameters based on distribution type
    switch (newType) {
      case 'NORMAL':
        setParameters({ mean: 0, std: 1 });
        break;
      case 'BINOMIAL':
        setParameters({ n: 10, p: 0.5 });
        break;
      case 'POISSON':
        setParameters({ lambda: 5 });
        break;
      case 'EXPONENTIAL':
        setParameters({ rate: 1 });
        break;
      case 'UNIFORM':
        setParameters({ a: 0, b: 1 });
        break;
      case 'GAMMA':
        setParameters({ shape: 2, scale: 1 });
        break;
      case 'BETA':
        setParameters({ alpha: 2, beta: 2 });
        break;
      case 'LOGNORMAL':
        setParameters({ mean: 0, sigma: 1 });
        break;
      case 'WEIBULL':
        setParameters({ shape: 1, scale: 1 });
        break;
      default:
        setParameters({});
    }
  };

  // Check if we should show tutorial on load
  useEffect(() => {
    // In a real application, you might want to store this in localStorage
    // to remember the user's preference across sessions
    const hasSeenTutorial = localStorage.getItem('hasSeenCalculatorTutorial');
    if (hasSeenTutorial === 'true') {
      setShowInitialTutorial(false);
    }
  }, []);

  const handleCompleteTutorial = () => {
    setShowInitialTutorial(false);
    localStorage.setItem('hasSeenCalculatorTutorial', 'true');
  };
  
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Probability Calculator
          </Typography>
          
          <Tooltip title="Show tutorial">
            <IconButton color="primary" onClick={() => setShowInitialTutorial(true)}>
              <SchoolIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Calculate and visualize probabilities for various statistical distributions.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <FunctionsIcon color="primary" sx={{ mr: 1 }} />
                  Distribution Settings
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <DistributionSelector 
                    selectedType={distributionType} 
                    onTypeChange={handleTypeSelect} 
                  />
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Parameters
                  </Typography>
                  
                  <DistributionParameters
                    distributionType={distributionType}
                    parameters={parameters}
                    onParameterChange={handleParameterChange}
                    onChange={handleDistributionChange}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent>
                <ProbabilityCalculator
                  distributionType={distributionType}
                  parameters={parameters}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      
      {/* Tutorial Dialog */}
      <Dialog 
        open={showInitialTutorial} 
        onClose={handleCloseTutorial}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2
        }}>
          <Typography variant="h6" color="primary.main">
            Probability Calculator Tutorial
          </Typography>
          
          <IconButton edge="end" color="inherit" onClick={handleCloseTutorial} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
        
        <DialogContent>
          <Stepper activeStep={activeStep} orientation={isMobile ? "vertical" : "horizontal"} sx={{ mb: 4, mt: 2 }}>
            {tutorialSteps.map((step, index) => (
              <Step key={index}>
                <StepLabel>{isMobile ? step.title : ``}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Box sx={{ mt: 2 }}>
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Typography variant="h6" gutterBottom color="primary.main">
                {tutorialSteps[activeStep].title}
              </Typography>
              
              {tutorialSteps[activeStep].content}
            </motion.div>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          
          <Box sx={{ flex: '1 1 auto' }} />
          
          {activeStep === tutorialSteps.length - 1 ? (
            <Button onClick={handleCompleteTutorial} variant="contained" endIcon={<ArrowForwardIcon />}>
              Start using calculator
            </Button>
          ) : (
            <Button onClick={handleNext} variant="contained" endIcon={<ArrowForwardIcon />}>
              Next
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Wrap with providers for testing
const TestCalculatorWithProviders = () => {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3}>
        <TestCalculator />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default TestCalculatorWithProviders;