/**
 * GuidedWizard Component
 *
 * Step-by-step analysis wizard for the Autonomous Intelligence Layer.
 * Guides users through template selection, data upload, variable
 * configuration, analysis execution, results, and report generation.
 *
 * @author Vishal Bharti
 * @version 2.0.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Alert,
  AlertTitle,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import {
  CompareArrows as CompareArrowsIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  SwapVert as SwapVertIcon,
  Groups as GroupsIcon,
  Category as CategoryIcon,
  Science as ScienceIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  PlayArrow as RunIcon,
  Article as ApaIcon,
  TableChart as TableIcon,
  Code as CodeIcon
} from '@mui/icons-material';

// ---------------------------------------------------------------------------
// Workflow Templates
// ---------------------------------------------------------------------------

const WORKFLOW_TEMPLATES = [
  {
    id: 'two_group',
    title: 'Two-Group Comparison',
    description: 'Compare two groups on a measure',
    Icon: CompareArrowsIcon,
    suggestedTest: 'Independent Samples t-test',
    queryTemplate: 'Compare {outcome} between {group} groups'
  },
  {
    id: 'correlation',
    title: 'Find Relationships',
    description: 'Explore correlations between variables',
    Icon: TimelineIcon,
    suggestedTest: 'Pearson / Spearman Correlation',
    queryTemplate: 'Correlate {outcome} with {group}'
  },
  {
    id: 'prediction',
    title: 'Predict Outcomes',
    description: 'Build a prediction model',
    Icon: TrendingUpIcon,
    suggestedTest: 'Linear Regression',
    queryTemplate: 'Predict {outcome} from {group}'
  },
  {
    id: 'paired',
    title: 'Before/After',
    description: 'Compare paired measurements',
    Icon: SwapVertIcon,
    suggestedTest: 'Paired Samples t-test',
    queryTemplate: 'Compare paired {outcome} across {group}'
  },
  {
    id: 'multi_group',
    title: 'Multi-Group',
    description: 'Compare three or more groups',
    Icon: GroupsIcon,
    suggestedTest: 'One-Way ANOVA',
    queryTemplate: 'Compare {outcome} across {group} groups'
  },
  {
    id: 'categorical',
    title: 'Category Associations',
    description: 'Test associations between categories',
    Icon: CategoryIcon,
    suggestedTest: 'Chi-Square Test',
    queryTemplate: 'Test association between {outcome} and {group}'
  },
  {
    id: 'full_study',
    title: 'Full Study',
    description: 'Complete guided analysis',
    Icon: ScienceIcon,
    suggestedTest: 'Auto-detect',
    queryTemplate: 'Analyze {outcome} by {group}'
  }
];

// ---------------------------------------------------------------------------
// Step labels for the Stepper
// ---------------------------------------------------------------------------

const STEP_LABELS = [
  'Goal',
  'Upload',
  'Variables',
  'Analysis',
  'Results',
  'Report'
];

// ---------------------------------------------------------------------------
// Helper: build the query string that gets passed to onRunAnalysis
// ---------------------------------------------------------------------------

function buildQuery(template, groupVar, outcomeVar) {
  if (!template) return '';
  return template.queryTemplate
    .replace('{outcome}', outcomeVar || '?')
    .replace('{group}', groupVar || '?');
}

// ---------------------------------------------------------------------------
// GuidedWizard Component
// ---------------------------------------------------------------------------

const GuidedWizard = ({ dataFile, profileResult, onComplete, onProfileData, onRunAnalysis }) => {
  // ---- State ---------------------------------------------------------------
  const [activeStep, setActiveStep] = useState(-1); // -1 = template picker
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedGroupVar, setSelectedGroupVar] = useState('');
  const [selectedOutcomeVar, setSelectedOutcomeVar] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [guardianProgress, setGuardianProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  const fileInputRef = useRef(null);

  // ---- Derived values ------------------------------------------------------
  const variables = profileResult?.variables || profileResult?.columns || [];
  const numericVars = variables.filter(
    (v) => v.type === 'numeric' || v.dtype === 'float64' || v.dtype === 'int64'
  );
  const categoricalVars = variables.filter(
    (v) => v.type === 'categorical' || v.dtype === 'object' || v.dtype === 'category'
  );

  // Flat list of variable names for the Select dropdowns
  const allVarNames = variables.map((v) => v.name || v);
  const numericVarNames = numericVars.map((v) => v.name || v);
  const categoricalVarNames = categoricalVars.map((v) => v.name || v);

  // ---- Auto-select variables when profile arrives --------------------------
  useEffect(() => {
    if (profileResult && variables.length > 0) {
      // Only auto-select if the user hasn't already chosen
      if (!selectedGroupVar && categoricalVarNames.length > 0) {
        setSelectedGroupVar(categoricalVarNames[0]);
      }
      if (!selectedOutcomeVar && numericVarNames.length > 0) {
        setSelectedOutcomeVar(numericVarNames[0]);
      }
    }
  }, [profileResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Template selection --------------------------------------------------
  const handleSelectTemplate = useCallback((template) => {
    setSelectedTemplate(template);
    setActiveStep(0);
  }, []);

  // ---- Navigation ----------------------------------------------------------
  const canAdvance = useCallback(() => {
    switch (activeStep) {
      case 0: // Goal
        return selectedTemplate !== null;
      case 1: // Upload
        return dataFile !== null && dataFile !== undefined;
      case 2: // Variables
        return selectedGroupVar !== '' && selectedOutcomeVar !== '';
      case 3: // Analysis
        return true; // user just needs to click Run
      case 4: // Results
        return analysisResult !== null;
      case 5: // Report
        return true;
      default:
        return false;
    }
  }, [activeStep, selectedTemplate, dataFile, selectedGroupVar, selectedOutcomeVar, analysisResult]);

  const handleNext = useCallback(() => {
    if (activeStep < STEP_LABELS.length - 1) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);

      // Side-effects on entering a step
      if (nextStep === 1 && dataFile && !profileResult) {
        // Trigger profiling automatically when entering Upload with an existing file
        onProfileData(dataFile);
      }
    }
  }, [activeStep, dataFile, profileResult, onProfileData]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    } else if (activeStep === 0) {
      // Go back to template selection
      setActiveStep(-1);
    }
  }, [activeStep]);

  // ---- File handling -------------------------------------------------------
  const handleFileSelect = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file && onProfileData) {
        onProfileData(file);
      }
    },
    [onProfileData]
  );

  // ---- Run analysis --------------------------------------------------------
  const handleRunAnalysis = useCallback(async () => {
    if (!selectedTemplate || !dataFile) return;

    setIsRunning(true);
    setAnalysisError(null);
    setGuardianProgress(0);

    // Simulate Guardian pre-check progress
    const progressInterval = setInterval(() => {
      setGuardianProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const query = buildQuery(selectedTemplate, selectedGroupVar, selectedOutcomeVar);
      const result = await onRunAnalysis(query, dataFile);
      clearInterval(progressInterval);
      setGuardianProgress(100);
      setAnalysisResult(result);
      // Automatically advance to the Results step
      setActiveStep(4);
    } catch (err) {
      clearInterval(progressInterval);
      setGuardianProgress(0);
      setAnalysisError(err?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsRunning(false);
    }
  }, [selectedTemplate, dataFile, selectedGroupVar, selectedOutcomeVar, onRunAnalysis]);

  // ---- Report helpers ------------------------------------------------------
  const handleGenerateReport = useCallback(
    (format) => {
      if (onComplete && analysisResult) {
        onComplete({ ...analysisResult, reportFormat: format });
      }
    },
    [onComplete, analysisResult]
  );

  // =========================================================================
  // RENDER: Template Selection (activeStep === -1)
  // =========================================================================

  if (activeStep === -1) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Choose Your Analysis Goal
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select a workflow template to get started. Each template will guide you
          through the appropriate statistical analysis.
        </Typography>

        <Grid container spacing={2}>
          {WORKFLOW_TEMPLATES.map((tpl) => {
            const { Icon } = tpl;
            return (
              <Grid item xs={12} sm={6} md={4} key={tpl.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => handleSelectTemplate(tpl)}
                    sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Icon color="primary" fontSize="large" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {tpl.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {tpl.description}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  }

  // =========================================================================
  // RENDER: Step content factory
  // =========================================================================

  const renderStepContent = () => {
    switch (activeStep) {
      // -------------------------------------------------------------------
      // Step 0: Goal
      // -------------------------------------------------------------------
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Selected Goal
            </Typography>
            {selectedTemplate && (
              <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  {React.createElement(selectedTemplate.Icon, {
                    color: 'primary',
                    fontSize: 'large'
                  })}
                  <Box>
                    <Typography variant="h6">{selectedTemplate.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTemplate.description}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2">
                  <strong>Suggested test:</strong> {selectedTemplate.suggestedTest}
                </Typography>
              </Paper>
            )}
            <Button
              variant="text"
              size="small"
              onClick={() => setActiveStep(-1)}
            >
              Change template
            </Button>
          </Box>
        );

      // -------------------------------------------------------------------
      // Step 1: Upload
      // -------------------------------------------------------------------
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Data Upload
            </Typography>

            {dataFile ? (
              <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
                <AlertTitle>File Ready</AlertTitle>
                <strong>{dataFile.name}</strong> ({(dataFile.size / 1024).toFixed(1)} KB)
                {profileResult && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Profiling complete — {variables.length} variable
                    {variables.length !== 1 ? 's' : ''} detected.
                  </Typography>
                )}
              </Alert>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px dashed',
                  borderColor: 'divider',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" gutterBottom>
                  Click to upload a data file
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported formats: CSV, Excel, JSON
                </Typography>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </Paper>
            )}

            {dataFile && !profileResult && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Profiling data...
                </Typography>
                <LinearProgress />
              </Box>
            )}
          </Box>
        );

      // -------------------------------------------------------------------
      // Step 2: Variables
      // -------------------------------------------------------------------
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Variable Selection
            </Typography>

            {variables.length === 0 ? (
              <Alert severity="warning">
                No variables detected. Please go back and upload a valid data file.
              </Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Detected {variables.length} variable{variables.length !== 1 ? 's' : ''}
                  {numericVarNames.length > 0 &&
                    ` (${numericVarNames.length} numeric, ${categoricalVarNames.length} categorical)`}
                  . Confirm or override the selections below.
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="group-var-label">Grouping Variable</InputLabel>
                      <Select
                        labelId="group-var-label"
                        value={selectedGroupVar}
                        label="Grouping Variable"
                        onChange={(e) => setSelectedGroupVar(e.target.value)}
                      >
                        {allVarNames.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="outcome-var-label">Outcome Variable</InputLabel>
                      <Select
                        labelId="outcome-var-label"
                        value={selectedOutcomeVar}
                        label="Outcome Variable"
                        onChange={(e) => setSelectedOutcomeVar(e.target.value)}
                      >
                        {allVarNames.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {variables.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Detected Variables
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {variables.map((v) => {
                        const name = v.name || v;
                        const type = v.type || v.dtype || 'unknown';
                        return (
                          <Chip
                            key={name}
                            label={`${name} (${type})`}
                            size="small"
                            variant="outlined"
                            color={
                              type === 'numeric' || type === 'float64' || type === 'int64'
                                ? 'primary'
                                : 'default'
                            }
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        );

      // -------------------------------------------------------------------
      // Step 3: Analysis
      // -------------------------------------------------------------------
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Analysis Configuration
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Test to Run
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {selectedTemplate?.suggestedTest || 'Auto-detect'}
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Guardian Pre-Check
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                The Guardian system will validate statistical assumptions before
                running the analysis.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip label={`Grouping: ${selectedGroupVar || 'none'}`} size="small" />
                <Chip label={`Outcome: ${selectedOutcomeVar || 'none'}`} size="small" />
                <Chip
                  label={selectedTemplate?.title || 'N/A'}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>

              {isRunning && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Running Guardian checks and analysis...
                  </Typography>
                  <LinearProgress variant="determinate" value={guardianProgress} />
                </Box>
              )}

              {analysisError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {analysisError}
                </Alert>
              )}
            </Paper>

            <Button
              variant="contained"
              startIcon={<RunIcon />}
              onClick={handleRunAnalysis}
              disabled={isRunning || !selectedGroupVar || !selectedOutcomeVar}
            >
              {isRunning ? 'Running...' : 'Run Analysis'}
            </Button>
          </Box>
        );

      // -------------------------------------------------------------------
      // Step 4: Results
      // -------------------------------------------------------------------
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Results
            </Typography>

            {analysisResult ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Analysis Complete</AlertTitle>
                The analysis has finished. Review the results below or proceed to
                generate a report.
              </Alert>
            ) : (
              <Alert severity="info">
                No results yet. Go back to the Analysis step and click
                "Run Analysis".
              </Alert>
            )}

            {analysisResult && (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Summary
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Test: {selectedTemplate?.suggestedTest || 'Auto-detect'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Grouping variable: {selectedGroupVar}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Outcome variable: {selectedOutcomeVar}
                </Typography>
              </Paper>
            )}
          </Box>
        );

      // -------------------------------------------------------------------
      // Step 5: Report
      // -------------------------------------------------------------------
      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Generate Report
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose a format to generate your analysis report.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <ApaIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      APA Report
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Publication-ready APA format
                    </Typography>
                  </CardContent>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => handleGenerateReport('apa')}
                      disabled={!analysisResult}
                    >
                      Generate
                    </Button>
                  </Box>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TableIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Table View
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Structured data tables
                    </Typography>
                  </CardContent>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => handleGenerateReport('table')}
                      disabled={!analysisResult}
                    >
                      Generate
                    </Button>
                  </Box>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <CodeIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Raw Output
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      JSON / technical output
                    </Typography>
                  </CardContent>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => handleGenerateReport('raw')}
                      disabled={!analysisResult}
                    >
                      Generate
                    </Button>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  // =========================================================================
  // RENDER: Main wizard layout
  // =========================================================================

  return (
    <Box>
      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {STEP_LABELS.map((label, index) => (
          <Step key={label} completed={index < activeStep}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        {renderStepContent()}
      </Paper>

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBack}
          disabled={isRunning}
        >
          Back
        </Button>

        <Button
          variant="contained"
          endIcon={<NextIcon />}
          onClick={handleNext}
          disabled={!canAdvance() || isRunning || activeStep >= STEP_LABELS.length - 1}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default GuidedWizard;
