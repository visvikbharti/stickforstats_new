import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  IconButton, 
  Grid, 
  Divider,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import SchoolIcon from '@mui/icons-material/School';
import FunctionsIcon from '@mui/icons-material/Functions';
import { motion } from 'framer-motion';

/**
 * EducationalOverlay component for providing detailed educational content
 * about probability distributions and statistical concepts
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the overlay is open
 * @param {Function} props.onClose - Function to call when the overlay is closed
 * @param {string} props.title - Title of the overlay
 * @param {Array} props.content - Array of content sections
 * @param {Object} props.distribution - Distribution information (type, parameters)
 */
const EducationalOverlay = ({ open, onClose, title, content, distribution }) => {
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleStepClick = (step) => {
    setActiveStep(step);
  };
  
  const isLastStep = activeStep === content.length - 1;
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: '#fbfbff',
          backgroundImage: 'radial-gradient(circle at top right, rgba(25, 118, 210, 0.03), transparent 70%)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        px: 3, 
        py: 2,
        backgroundColor: theme.palette.primary.main,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SchoolIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Box sx={{ px: 3, py: 2, backgroundColor: 'rgba(245, 247, 250, 0.7)' }}>
        <Stepper activeStep={activeStep} alternativeLabel={!isMobile}>
          {content.map((section, index) => (
            <Step key={index} completed={index < activeStep}>
              <StepLabel 
                optional={isMobile ? null : <Typography variant="caption">{section.label}</Typography>}
                onClick={() => handleStepClick(index)}
                sx={{ cursor: 'pointer' }}
              >
                {!isMobile && section.title}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
      
      <DialogContent sx={{ px: 3, py: 3 }}>
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {distribution && (
            <Paper 
              elevation={0} 
              sx={{ 
                mb: 3, 
                p: 2, 
                backgroundColor: 'rgba(236, 239, 255, 0.3)',
                borderRadius: 2,
                borderLeft: '4px solid',
                borderColor: 'primary.main'
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" color="primary.dark" fontWeight="medium">
                    {distribution.type} Distribution
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {distribution.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <FunctionsIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} />
                    <Typography variant="body2" fontWeight="medium">
                      {distribution.notation}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}
          
          <Typography variant="h5" gutterBottom color="primary.dark">
            {content[activeStep].title}
          </Typography>
          
          {content[activeStep].subtitle && (
            <Typography variant="subtitle1" paragraph color="text.secondary">
              {content[activeStep].subtitle}
            </Typography>
          )}
          
          <Box sx={{ mb: 3 }}>
            {content[activeStep].content}
          </Box>
          
          {content[activeStep].formula && (
            <Paper 
              elevation={1}
              sx={{ 
                p: 2, 
                mb: 3, 
                backgroundColor: 'rgba(251, 251, 255, 0.9)',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FunctionsIcon color="primary" sx={{ mr: 1, fontSize: 18 }} />
                <Typography variant="subtitle2" color="primary.dark">
                  Mathematical Formula
                </Typography>
              </Box>
              <Box sx={{ p: 1, textAlign: 'center' }}>
                {content[activeStep].formula}
              </Box>
            </Paper>
          )}
          
          {content[activeStep].example && (
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                mb: 2, 
                backgroundColor: 'rgba(236, 239, 255, 0.4)',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <InfoIcon color="primary" sx={{ mr: 1, fontSize: 18 }} />
                <Typography variant="subtitle2" color="primary.dark">
                  Example
                </Typography>
              </Box>
              <Box sx={{ p: 1 }}>
                {content[activeStep].example}
              </Box>
            </Paper>
          )}
          
          {content[activeStep].visualization && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              {content[activeStep].visualization}
            </Box>
          )}
        </motion.div>
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button 
          onClick={handleBack} 
          disabled={activeStep === 0}
          sx={{ 
            visibility: activeStep === 0 ? 'hidden' : 'visible',
            opacity: activeStep === 0 ? 0 : 1 
          }}
        >
          Back
        </Button>
        <Box>
          <Button onClick={onClose} color="secondary" sx={{ mr: 1 }}>
            Close
          </Button>
          {activeStep < content.length - 1 && (
            <Button onClick={handleNext} variant="contained" color="primary">
              Next
            </Button>
          )}
          {isLastStep && (
            <Button onClick={onClose} variant="contained" color="primary">
              Got it
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EducationalOverlay;