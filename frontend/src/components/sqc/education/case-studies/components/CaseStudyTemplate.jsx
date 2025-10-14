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
  Alert,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import {
  ScienceOutlined,
  BusinessOutlined,
  AnalyticsOutlined,
  LightbulbOutlined,
  CheckCircleOutline
} from '@mui/icons-material';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

/**
 * CaseStudyTemplate - Reusable template for all SQC case studies
 *
 * Provides consistent structure for:
 * - Problem Statement (industry context)
 * - Mathematical Foundations (derivations & proofs)
 * - Data & Methodology (step-by-step approach)
 * - Interactive Simulation (with backend integration)
 * - Professional Interpretation (statistical & business)
 * - Recommendations & Takeaways
 *
 * @param {Object} props
 * @param {string} props.title - Case study title
 * @param {string} props.industry - Industry context
 * @param {Object} props.metadata - Case study metadata (difficulty, time, topics)
 * @param {ReactNode} props.problemStatement - Problem statement component
 * @param {ReactNode} props.mathematicalFoundations - Math derivations component
 * @param {ReactNode} props.dataMethodology - Methodology steps component
 * @param {ReactNode} props.interactiveSimulation - Simulation component
 * @param {ReactNode} props.interpretation - Interpretation component
 * @param {ReactNode} props.recommendations - Recommendations component
 * @param {ReactNode} props.keyTakeaways - Key takeaways component
 */
const CaseStudyTemplate = ({
  title,
  industry,
  metadata = {},
  problemStatement,
  mathematicalFoundations,
  dataMethodology,
  interactiveSimulation,
  interpretation,
  recommendations,
  keyTakeaways,
  onComplete
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      label: 'Problem Statement',
      icon: <BusinessOutlined />,
      description: 'Industry context and business challenge',
      content: problemStatement
    },
    {
      label: 'Mathematical Foundations',
      icon: <ScienceOutlined />,
      description: 'Derivations, proofs, and theoretical basis',
      content: mathematicalFoundations
    },
    {
      label: 'Data & Methodology',
      icon: <AnalyticsOutlined />,
      description: 'Step-by-step analytical approach',
      content: dataMethodology
    },
    {
      label: 'Interactive Simulation',
      icon: <AnalyticsOutlined />,
      description: 'Real-time analysis with backend integration',
      content: interactiveSimulation
    },
    {
      label: 'Interpretation',
      icon: <LightbulbOutlined />,
      description: 'Statistical and business insights',
      content: interpretation
    },
    {
      label: 'Recommendations',
      icon: <CheckCircleOutline />,
      description: 'Actionable recommendations and takeaways',
      content: (
        <>
          {recommendations}
          <Box sx={{ mt: 3 }}>
            {keyTakeaways}
          </Box>
        </>
      )
    }
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <MathJaxContext>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <ScienceOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                {title}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                Real-World Case Study: {industry}
              </Typography>
            </Box>
          </Stack>

          {/* Metadata */}
          {metadata && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
              {metadata.difficulty && (
                <Chip
                  label={`Difficulty: ${metadata.difficulty}`}
                  size="small"
                  color={
                    metadata.difficulty === 'Beginner' ? 'success' :
                    metadata.difficulty === 'Intermediate' ? 'primary' : 'warning'
                  }
                />
              )}
              {metadata.timeToComplete && (
                <Chip
                  label={`Time: ${metadata.timeToComplete}`}
                  size="small"
                  color="info"
                />
              )}
              {metadata.topics && metadata.topics.map((topic, idx) => (
                <Chip
                  key={idx}
                  label={topic}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          )}
        </Paper>

        {/* Case Study Content - Stepper */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  optional={
                    <Typography variant="caption" color="text.secondary">
                      {step.description}
                    </Typography>
                  }
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
                        color: 'white'
                      }}
                    >
                      {step.icon}
                    </Box>
                  )}
                >
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    <MathJax>{step.content}</MathJax>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      {index === steps.length - 1 ? 'Finish' : 'Continue'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {/* Completion Message */}
          {activeStep === steps.length && (
            <Paper square elevation={0} sx={{ p: 3, bgcolor: 'success.light' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'success.dark', fontWeight: 600 }}>
                🎉 Case Study Complete!
              </Typography>
              <Typography sx={{ mb: 2, color: 'text.primary' }}>
                You've completed this comprehensive real-world case study. You now understand how to apply
                this statistical methodology to solve practical business problems with scientific rigor.
              </Typography>
              <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                Review Case Study
              </Button>
              <Button variant="contained" onClick={handleComplete} sx={{ mt: 1 }}>
                Mark Complete
              </Button>
            </Paper>
          )}
        </Paper>

        {/* Scientific Integrity Notice */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Scientific Integrity:</strong> This case study uses real statistical methodologies,
            authentic datasets (or realistic simulations based on published data), and peer-reviewable
            mathematical derivations. All calculations are performed using SciPy/NumPy backend for accuracy.
          </Typography>
        </Alert>
      </Container>
    </MathJaxContext>
  );
};

export default CaseStudyTemplate;
