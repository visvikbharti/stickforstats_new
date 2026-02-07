/**
 * Study Design Wizard
 *
 * Interactive wizard that guides researchers through study design with integrated
 * power analysis, statistical test selection, and protocol generation.
 *
 * Steps:
 * 1. Study Type Selection - Choose research design
 * 2. Variables & Hypotheses - Define IVs, DVs, and hypotheses
 * 3. Statistical Test Selection - AI-guided test recommendation
 * 4. Power Analysis - Sample size calculation with visualization
 * 5. Feasibility & Constraints - Practical considerations
 * 6. Summary & Protocol - Generate exportable study protocol
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  Chip,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Check as CheckIcon,
  Science as ScienceIcon,
  Psychology as PsychologyIcon,
  Assessment as AssessmentIcon,
  BoltOutlined as PowerIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
  Description as ProtocolIcon,
  Refresh as ResetIcon,
  Help as HelpIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

// Import step components
import StudyTypeStep from './steps/StudyTypeStep';
import VariablesStep from './steps/VariablesStep';
import TestSelectionStep from './steps/TestSelectionStep';
import PowerAnalysisStep from './steps/PowerAnalysisStep';
import FeasibilityStep from './steps/FeasibilityStep';
import ProtocolSummaryStep from './steps/ProtocolSummaryStep';

/**
 * Step definitions with metadata
 */
const WIZARD_STEPS = [
  {
    id: 'study-type',
    label: 'Study Type',
    description: 'Choose your research design',
    icon: <ScienceIcon />,
    component: StudyTypeStep,
  },
  {
    id: 'variables',
    label: 'Variables & Hypotheses',
    description: 'Define your variables and hypotheses',
    icon: <PsychologyIcon />,
    component: VariablesStep,
  },
  {
    id: 'test-selection',
    label: 'Statistical Test',
    description: 'Select appropriate statistical test',
    icon: <AssessmentIcon />,
    component: TestSelectionStep,
  },
  {
    id: 'power-analysis',
    label: 'Power Analysis',
    description: 'Calculate required sample size',
    icon: <PowerIcon />,
    component: PowerAnalysisStep,
  },
  {
    id: 'feasibility',
    label: 'Feasibility',
    description: 'Check practical constraints',
    icon: <ValidIcon />,
    component: FeasibilityStep,
  },
  {
    id: 'protocol',
    label: 'Study Protocol',
    description: 'Generate your study protocol',
    icon: <ProtocolIcon />,
    component: ProtocolSummaryStep,
  },
];

/**
 * Initial wizard state
 */
const getInitialState = () => ({
  // Step 1: Study Type
  studyType: {
    design: '', // 'between', 'within', 'mixed', 'correlational', 'regression'
    purpose: '', // 'exploratory', 'confirmatory', 'replication'
    setting: '', // 'laboratory', 'field', 'online', 'clinical'
    participants: '', // 'humans', 'animals', 'archival'
  },

  // Step 2: Variables & Hypotheses
  variables: {
    independentVariables: [],
    dependentVariables: [],
    covariates: [],
    hypothesis: '',
    hypothesisType: 'two-tailed', // 'one-tailed-greater', 'one-tailed-less', 'two-tailed'
    expectedDirection: '',
  },

  // Step 3: Test Selection
  testSelection: {
    recommendedTest: '',
    selectedTest: '',
    testFamily: '', // 'parametric', 'non-parametric'
    assumptions: [],
    alternativeTests: [],
    rationale: '',
  },

  // Step 4: Power Analysis
  powerAnalysis: {
    effectSize: 0.5,
    effectSizeType: 'd', // 'd', 'f', 'r', 'w', 'odds_ratio'
    alpha: 0.05,
    power: 0.80,
    calculatedSampleSize: null,
    sampleSizePerGroup: null,
    totalSampleSize: null,
    numberOfGroups: 2,
    allocation: 'equal', // 'equal', 'unequal'
    allocationRatio: 1,
  },

  // Step 5: Feasibility
  feasibility: {
    availableParticipants: null,
    budget: null,
    timeConstraint: null,
    attritionRate: 0.10, // 10% default
    adjustedSampleSize: null,
    constraints: [],
    feasibilityStatus: 'unknown', // 'feasible', 'marginal', 'infeasible'
    recommendations: [],
  },

  // Step 6: Protocol
  protocol: {
    title: '',
    authors: '',
    institution: '',
    dateCreated: new Date().toISOString(),
    preregistration: false,
    preregistrationPlatform: '',
    notes: '',
  },

  // Metadata
  completedSteps: [],
  validationErrors: {},
});

/**
 * Main Study Design Wizard Component
 */
const StudyDesignWizard = ({ onComplete, onCancel }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [wizardData, setWizardData] = useState(getInitialState());
  const [showHelp, setShowHelp] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Update wizard data for a specific section
   */
  const updateWizardData = useCallback((section, data) => {
    setWizardData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...data,
      },
    }));
  }, []);

  /**
   * Validate current step
   */
  const validateStep = useCallback((stepIndex) => {
    const errors = {};

    switch (stepIndex) {
      case 0: // Study Type
        if (!wizardData.studyType.design) {
          errors.design = 'Please select a study design';
        }
        if (!wizardData.studyType.purpose) {
          errors.purpose = 'Please select a study purpose';
        }
        break;

      case 1: // Variables
        if (wizardData.variables.independentVariables.length === 0 &&
            wizardData.studyType.design !== 'correlational') {
          errors.independentVariables = 'Please define at least one independent variable';
        }
        if (wizardData.variables.dependentVariables.length === 0) {
          errors.dependentVariables = 'Please define at least one dependent variable';
        }
        break;

      case 2: // Test Selection
        if (!wizardData.testSelection.selectedTest) {
          errors.selectedTest = 'Please select a statistical test';
        }
        break;

      case 3: // Power Analysis
        if (!wizardData.powerAnalysis.calculatedSampleSize) {
          errors.sampleSize = 'Please calculate the required sample size';
        }
        break;

      case 4: // Feasibility
        // Feasibility is optional but we track status
        break;

      case 5: // Protocol
        if (!wizardData.protocol.title) {
          errors.title = 'Please provide a study title';
        }
        break;

      default:
        break;
    }

    setWizardData(prev => ({
      ...prev,
      validationErrors: errors,
    }));

    return Object.keys(errors).length === 0;
  }, [wizardData]);

  /**
   * Check if step is complete
   */
  const isStepComplete = useCallback((stepIndex) => {
    return wizardData.completedSteps.includes(stepIndex);
  }, [wizardData.completedSteps]);

  /**
   * Mark step as complete
   */
  const markStepComplete = useCallback((stepIndex) => {
    setWizardData(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, stepIndex])],
    }));
  }, []);

  /**
   * Handle next step
   */
  const handleNext = useCallback(() => {
    if (validateStep(activeStep)) {
      markStepComplete(activeStep);
      setActiveStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  }, [activeStep, validateStep, markStepComplete]);

  /**
   * Handle previous step
   */
  const handleBack = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  }, []);

  /**
   * Handle step click (for non-linear navigation)
   */
  const handleStepClick = useCallback((stepIndex) => {
    // Allow going back to any step, or forward only to completed steps
    if (stepIndex < activeStep || isStepComplete(stepIndex)) {
      setActiveStep(stepIndex);
    }
  }, [activeStep, isStepComplete]);

  /**
   * Reset wizard
   */
  const handleReset = useCallback(() => {
    setWizardData(getInitialState());
    setActiveStep(0);
  }, []);

  /**
   * Complete wizard and generate protocol
   */
  const handleComplete = useCallback(async () => {
    if (validateStep(activeStep)) {
      markStepComplete(activeStep);
      setIsGenerating(true);

      // Simulate protocol generation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsGenerating(false);

      if (onComplete) {
        onComplete(wizardData);
      }
    }
  }, [activeStep, validateStep, markStepComplete, wizardData, onComplete]);

  /**
   * Calculate progress percentage
   */
  const progressPercentage = useMemo(() => {
    return ((wizardData.completedSteps.length) / WIZARD_STEPS.length) * 100;
  }, [wizardData.completedSteps.length]);

  /**
   * Get step status for stepper
   */
  const getStepStatus = useCallback((stepIndex) => {
    if (isStepComplete(stepIndex)) return 'complete';
    if (stepIndex === activeStep) return 'active';
    return 'pending';
  }, [activeStep, isStepComplete]);

  /**
   * Render current step content
   */
  const renderStepContent = () => {
    const currentStep = WIZARD_STEPS[activeStep];
    const StepComponent = currentStep.component;

    return (
      <StepComponent
        data={wizardData}
        updateData={updateWizardData}
        errors={wizardData.validationErrors}
        onNext={handleNext}
        onBack={handleBack}
        isFirstStep={activeStep === 0}
        isLastStep={activeStep === WIZARD_STEPS.length - 1}
      />
    );
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ScienceIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Study Design Wizard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Plan your research study with integrated power analysis
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Help">
                <IconButton onClick={() => setShowHelp(!showHelp)}>
                  <HelpIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset Wizard">
                <IconButton onClick={handleReset} color="warning">
                  <ResetIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                Progress: {wizardData.completedSteps.length} / {WIZARD_STEPS.length} steps
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {progressPercentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Help Section */}
          <Collapse in={showHelp}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                How to use the Study Design Wizard:
              </Typography>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li>Select your study type and research design</li>
                <li>Define your independent and dependent variables</li>
                <li>Get AI-powered test recommendations based on your design</li>
                <li>Calculate required sample size with power analysis</li>
                <li>Check feasibility against practical constraints</li>
                <li>Generate a complete study protocol for pre-registration</li>
              </ol>
            </Alert>
          </Collapse>
        </Paper>

        {/* Main Content */}
        <Paper elevation={3} sx={{ p: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Stepper Sidebar */}
            <Box
              sx={{
                width: isMobile ? '100%' : 280,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                borderRight: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
                borderBottom: isMobile ? `1px solid ${theme.palette.divider}` : 'none',
                p: 2,
              }}
            >
              <Stepper
                activeStep={activeStep}
                orientation={isMobile ? 'horizontal' : 'vertical'}
                sx={{
                  '& .MuiStepLabel-root': {
                    cursor: 'pointer',
                  },
                }}
              >
                {WIZARD_STEPS.map((step, index) => {
                  const status = getStepStatus(index);

                  return (
                    <Step key={step.id} completed={status === 'complete'}>
                      <StepLabel
                        onClick={() => handleStepClick(index)}
                        StepIconComponent={() => (
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: status === 'complete'
                                ? 'success.main'
                                : status === 'active'
                                  ? 'primary.main'
                                  : (t) => t.palette.mode === 'dark' ? t.palette.grey[700] : t.palette.grey[300],
                              color: status === 'pending' ? 'text.secondary' : 'white',
                              transition: 'all 0.3s',
                            }}
                          >
                            {status === 'complete' ? (
                              <CheckIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <Typography variant="body2" fontWeight={600}>
                                {index + 1}
                              </Typography>
                            )}
                          </Box>
                        )}
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontWeight: status === 'active' ? 600 : 400,
                            color: status === 'active' ? 'primary.main' : 'inherit',
                          },
                        }}
                      >
                        {!isMobile && (
                          <Box>
                            <Typography variant="body2" fontWeight={status === 'active' ? 600 : 400}>
                              {step.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {step.description}
                            </Typography>
                          </Box>
                        )}
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>

            {/* Step Content */}
            <Box sx={{ flex: 1, p: 3 }}>
              {/* Step Header */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box
                    sx={{
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {WIZARD_STEPS[activeStep].icon}
                  </Box>
                  <Typography variant="h5" fontWeight={600}>
                    Step {activeStep + 1}: {WIZARD_STEPS[activeStep].label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {WIZARD_STEPS[activeStep].description}
                </Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Dynamic Step Content */}
              {renderStepContent()}

              {/* Navigation Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mt: 4,
                  pt: 3,
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<BackIcon />}
                  onClick={handleBack}
                  disabled={activeStep === 0}
                >
                  Back
                </Button>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {onCancel && (
                    <Button variant="text" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}

                  {activeStep === WIZARD_STEPS.length - 1 ? (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={isGenerating ? null : <DownloadIcon />}
                      onClick={handleComplete}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating...' : 'Generate Protocol'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      endIcon={<NextIcon />}
                      onClick={handleNext}
                    >
                      Next Step
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Footer Info */}
        <Paper sx={{ p: 2, mt: 3, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.08) }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Tip:</strong> The Study Design Wizard uses validated power analysis calculations
            based on Cohen (1988) and G*Power methodology. All sample size estimates follow
            established statistical conventions to ensure adequate power for detecting meaningful effects.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default StudyDesignWizard;
