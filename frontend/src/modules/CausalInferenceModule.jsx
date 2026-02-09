/**
 * Causal Inference Module
 * ========================
 * Comprehensive interface for causal analysis including:
 * - DAG-based causal reasoning
 * - Propensity score methods
 * - Treatment effect estimation
 * - Mediation analysis
 * - Difference-in-Differences
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  AlertTitle,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AccountTree as DAGIcon,
  Balance as BalanceIcon,
  TrendingUp as EffectIcon,
  CallSplit as MediationIcon,
  Timeline as DiDIcon,
  Help as HelpIcon,
  Upload as UploadIcon,
  Clear as ClearIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Construction as ConstructionIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Import components
import DAGBuilder from '../components/causal/DAGBuilder';
import MediationPathDiagram from '../components/causal/MediationPathDiagram';
import EventStudyPlot from '../components/causal/EventStudyPlot';
import BalancePlot from '../components/causal/BalancePlot';
import causalInferenceService from '../services/CausalInferenceService';

// Guardian Design Contract compliance
import useGuardianReport from '../hooks/useGuardianReport';
import { GuardianReportDisplay, GuardianBadge } from '../components/Guardian';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4]
  }
}));

const ResultCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(0,0,0,0.02)',
  borderLeft: `4px solid ${theme.palette.primary.main}`
}));

const StatBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`
}));

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CausalInferenceModule = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Data state
  const [dataInput, setDataInput] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);

  // DAG state
  const [dagNodes, setDagNodes] = useState([]);
  const [dagEdges, setDagEdges] = useState([]);
  const [dagTreatment, setDagTreatment] = useState(null);
  const [dagOutcome, setDagOutcome] = useState(null);
  const [dagAnalysis, setDagAnalysis] = useState(null);

  // Propensity/Matching state
  const [treatmentVar, setTreatmentVar] = useState('');
  const [outcomeVar, setOutcomeVar] = useState('');
  const [covariates, setCovariates] = useState([]);
  const [matchingMethod, setMatchingMethod] = useState('nearest');
  const [caliper, setCaliper] = useState(0.2);
  const [propensityResults, setPropensityResults] = useState(null);
  const [matchingResults, setMatchingResults] = useState(null);
  const [treatmentEffects, setTreatmentEffects] = useState(null);

  // Mediation state
  const [mediatorVar, setMediatorVar] = useState('');
  const [mediationResults, setMediationResults] = useState(null);

  // DiD state
  const [postVar, setPostVar] = useState('');
  const [timeVar, setTimeVar] = useState('');
  const [unitVar, setUnitVar] = useState('');
  const [didResults, setDidResults] = useState(null);
  const [eventStudyResults, setEventStudyResults] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  // Guardian context for Design Contract compliance
  // "No statistical result may exist without an explicit, traceable assumption context."
  const treatmentGuardian = useGuardianReport(treatmentEffects);
  const mediationGuardian = useGuardianReport(mediationResults);
  const didGuardian = useGuardianReport(didResults);

  // Parse input data
  const handleParseData = () => {
    try {
      const lines = dataInput.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('Data must have at least a header row and one data row');
      }

      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim());

      const data = {};
      headers.forEach(h => { data[h] = []; });

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        headers.forEach((h, j) => {
          const val = values[j]?.trim();
          data[h].push(isNaN(parseFloat(val)) ? val : parseFloat(val));
        });
      }

      setParsedData(data);
      setColumns(headers);
      setError(null);
    } catch (err) {
      setError(`Parse error: ${err.message}`);
    }
  };

  // Helper to format API errors (gracefully handles 404 when backend endpoint is missing)
  const formatApiError = (err) => {
    if (err.response?.status === 404) {
      return 'This feature requires a backend endpoint that is not available in v1.0.';
    }
    return err.response?.data?.error || err.message;
  };

  // DAG Analysis
  const handleDAGAnalysis = useCallback(async (edges, treatment, outcome) => {
    setLoading(true);
    setError(null);

    try {
      const result = await causalInferenceService.analyzeDAG(edges, treatment, outcome);
      setDagAnalysis(result);
      return result;
    } catch (err) {
      setError(formatApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle DAG changes
  const handleDAGChange = useCallback(({ nodes, edges, treatment, outcome }) => {
    setDagNodes(nodes);
    setDagEdges(edges);
    setDagTreatment(treatment);
    setDagOutcome(outcome);
  }, []);

  // Propensity Score Estimation
  const handlePropensityEstimation = async () => {
    if (!parsedData || !treatmentVar || covariates.length === 0) {
      setError('Please specify treatment variable and covariates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await causalInferenceService.estimatePropensityScores(
        parsedData,
        treatmentVar,
        covariates
      );
      setPropensityResults(result);
      setActiveStep(1);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Perform Matching
  const handleMatching = async () => {
    if (!parsedData || !treatmentVar || covariates.length === 0) {
      setError('Please estimate propensity scores first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await causalInferenceService.performMatching(
        parsedData,
        treatmentVar,
        covariates,
        { method: matchingMethod, caliper: caliper }
      );
      setMatchingResults(result);
      setActiveStep(2);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Estimate Treatment Effects
  const handleTreatmentEffects = async () => {
    if (!parsedData || !treatmentVar || !outcomeVar || covariates.length === 0) {
      setError('Please specify treatment, outcome, and covariates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await causalInferenceService.estimateTreatmentEffect(
        parsedData,
        treatmentVar,
        outcomeVar,
        covariates,
        'doubly_robust'
      );
      setTreatmentEffects(result);
      setActiveStep(3);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Mediation Analysis
  const handleMediation = async () => {
    if (!parsedData || !treatmentVar || !mediatorVar || !outcomeVar) {
      setError('Please specify treatment, mediator, and outcome');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await causalInferenceService.baronKennyMediation(
        parsedData,
        treatmentVar,
        mediatorVar,
        outcomeVar,
        covariates,
        1000
      );
      setMediationResults(result);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Difference-in-Differences
  const handleDiD = async () => {
    if (!parsedData || !outcomeVar || !treatmentVar || !postVar) {
      setError('Please specify outcome, treatment, and post-treatment indicator');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await causalInferenceService.differenceInDifferences(
        parsedData,
        outcomeVar,
        treatmentVar,
        postVar,
        covariates
      );
      setDidResults(result);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Event Study
  const handleEventStudy = async () => {
    if (!parsedData || !outcomeVar || !unitVar || !timeVar) {
      setError('Please specify outcome, unit, and time variables');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await causalInferenceService.eventStudy(
        parsedData,
        outcomeVar,
        unitVar,
        timeVar,
        'event_time',
        covariates
      );
      setEventStudyResults(causalInferenceService.processEventStudyData(result));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Clear all
  const handleClear = () => {
    setDataInput('');
    setParsedData(null);
    setColumns([]);
    setPropensityResults(null);
    setMatchingResults(null);
    setTreatmentEffects(null);
    setMediationResults(null);
    setDidResults(null);
    setEventStudyResults(null);
    setDagAnalysis(null);
    setActiveStep(0);
    setError(null);
  };

  // Process balance data
  const balanceData = useMemo(() => {
    if (!matchingResults?.balance) return null;
    return causalInferenceService.processBalanceData(matchingResults.balance);
  }, [matchingResults]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Preview Notice */}
      <Alert severity="info" icon={<ConstructionIcon />} sx={{ mb: 3 }}>
        <AlertTitle>Preview</AlertTitle>
        This module is under active development.
        The frontend interface is ready — backend integration is in progress.
      </Alert>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Causal Inference Toolkit
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Estimate causal effects using DAG-based reasoning, propensity score methods,
          mediation analysis, and difference-in-differences designs.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Input Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Data Input
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              component="label"
            >
              Upload CSV
              <input
                type="file"
                hidden
                accept=".csv,.tsv,.txt"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      setDataInput(evt.target.result);
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearIcon />}
              onClick={handleClear}
            >
              Clear
            </Button>
          </Stack>
        </Box>

        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder="Paste data here (CSV format)&#10;treatment,outcome,covariate1,covariate2&#10;1,15.2,0.5,1&#10;0,12.1,0.3,0"
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          sx={{ fontFamily: 'monospace', mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleParseData}
          disabled={!dataInput.trim()}
        >
          Parse Data
        </Button>

        {parsedData && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Data parsed: {columns.length} columns, {parsedData[columns[0]]?.length || 0} rows
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              {columns.map(col => (
                <Chip key={col} label={col} size="small" variant="outlined" />
              ))}
            </Stack>
          </Alert>
        )}
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="DAG Builder" icon={<DAGIcon />} iconPosition="start" />
          <Tab label="Matching & Effects" icon={<BalanceIcon />} iconPosition="start" />
          <Tab label="Mediation" icon={<MediationIcon />} iconPosition="start" />
          <Tab label="Diff-in-Diff" icon={<DiDIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* DAG Tab */}
      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Causal DAG Builder
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Build a Directed Acyclic Graph to identify confounders and determine adjustment sets.
        </Typography>

        <DAGBuilder
          initialNodes={dagNodes}
          initialEdges={dagEdges}
          onDAGChange={handleDAGChange}
          onAnalyze={handleDAGAnalysis}
          height={500}
        />

        {dagAnalysis && (
          <ResultCard sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              DAG Analysis Results
            </Typography>

            {dagAnalysis.confounders?.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Identified Confounders:</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  {dagAnalysis.confounders.map(c => (
                    <Chip key={c} label={c} color="warning" size="small" />
                  ))}
                </Stack>
              </Box>
            )}

            {dagAnalysis.adjustment_sets && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Minimal Adjustment Sets:</Typography>
                {dagAnalysis.adjustment_sets.map((set, i) => (
                  <Stack key={i} direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    {set.length > 0 ? set.map(v => (
                      <Chip key={v} label={v} variant="outlined" size="small" />
                    )) : <Chip label="Empty set (no adjustment needed)" size="small" />}
                  </Stack>
                ))}
              </Box>
            )}

            <Alert severity={dagAnalysis.identifiable ? 'success' : 'warning'}>
              {dagAnalysis.identifiable
                ? 'Causal effect is identifiable with the specified adjustment set(s)'
                : 'Causal effect may not be identifiable'
              }
            </Alert>
          </ResultCard>
        )}
      </TabPanel>

      {/* Matching & Effects Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Causal Analysis Pipeline
                </Typography>

                <Stepper activeStep={activeStep} orientation="vertical">
                  <Step>
                    <StepLabel>Estimate Propensity Scores</StepLabel>
                    <StepContent>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Treatment Variable</InputLabel>
                        <Select
                          value={treatmentVar}
                          label="Treatment Variable"
                          onChange={(e) => setTreatmentVar(e.target.value)}
                        >
                          {columns.map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Covariates</InputLabel>
                        <Select
                          multiple
                          value={covariates}
                          label="Covariates"
                          onChange={(e) => setCovariates(e.target.value)}
                          renderValue={(selected) => (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {selected.map(v => <Chip key={v} label={v} size="small" />)}
                            </Stack>
                          )}
                        >
                          {columns.filter(c => c !== treatmentVar && c !== outcomeVar).map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        variant="contained"
                        onClick={handlePropensityEstimation}
                        disabled={loading || !parsedData}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                      >
                        Estimate
                      </Button>
                    </StepContent>
                  </Step>

                  <Step>
                    <StepLabel>Perform Matching</StepLabel>
                    <StepContent>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Matching Method</InputLabel>
                        <Select
                          value={matchingMethod}
                          label="Matching Method"
                          onChange={(e) => setMatchingMethod(e.target.value)}
                        >
                          <MenuItem value="nearest">Nearest Neighbor</MenuItem>
                          <MenuItem value="optimal">Optimal</MenuItem>
                          <MenuItem value="caliper">Caliper</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        label="Caliper Width"
                        type="number"
                        value={caliper}
                        onChange={(e) => setCaliper(parseFloat(e.target.value))}
                        inputProps={{ step: 0.05, min: 0.05, max: 1 }}
                        fullWidth
                        sx={{ mb: 2 }}
                      />

                      <Button
                        variant="contained"
                        onClick={handleMatching}
                        disabled={loading || !propensityResults}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                      >
                        Match
                      </Button>
                    </StepContent>
                  </Step>

                  <Step>
                    <StepLabel>Estimate Treatment Effects</StepLabel>
                    <StepContent>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Outcome Variable</InputLabel>
                        <Select
                          value={outcomeVar}
                          label="Outcome Variable"
                          onChange={(e) => setOutcomeVar(e.target.value)}
                        >
                          {columns.filter(c => c !== treatmentVar).map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        variant="contained"
                        onClick={handleTreatmentEffects}
                        disabled={loading || !parsedData}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                      >
                        Estimate Effects
                      </Button>
                    </StepContent>
                  </Step>
                </Stepper>
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} md={8}>
            {/* Balance Plot */}
            {balanceData && balanceData.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <BalancePlot data={balanceData} />
              </Box>
            )}

            {/* Treatment Effects Results */}
            {treatmentEffects && (
              <Box>
                {/* Guardian Report - Design Contract Compliance */}
                {treatmentGuardian.hasGuardianContext && (
                  <GuardianReportDisplay {...treatmentGuardian.guardianProps} />
                )}

                <ResultCard>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Treatment Effect Estimates
                    </Typography>
                    {treatmentGuardian.hasGuardianContext && (
                      <GuardianBadge
                        confidenceScore={treatmentGuardian.confidenceScore}
                        violations={treatmentGuardian.violations}
                        canProceed={treatmentGuardian.canProceed}
                      />
                    )}
                  </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <StatBox>
                      <Typography variant="h4" color="primary">
                        {treatmentEffects.ate?.toFixed(3)}
                      </Typography>
                      <Typography variant="caption">ATE</Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <StatBox>
                      <Typography variant="h4">
                        {treatmentEffects.att?.toFixed(3)}
                      </Typography>
                      <Typography variant="caption">ATT</Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <StatBox>
                      <Typography variant="h4">
                        {treatmentEffects.se?.toFixed(3)}
                      </Typography>
                      <Typography variant="caption">Std. Error</Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <StatBox>
                      <Typography
                        variant="h4"
                        color={treatmentEffects.p_value < 0.05 ? 'success.main' : 'text.primary'}
                      >
                        {treatmentEffects.p_value?.toFixed(4)}
                      </Typography>
                      <Typography variant="caption">p-value</Typography>
                    </StatBox>
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 2 }}>
                  95% CI: [{treatmentEffects.ci_lower?.toFixed(3)}, {treatmentEffects.ci_upper?.toFixed(3)}]
                </Alert>
              </ResultCard>
              </Box>
            )}

            {!balanceData && !treatmentEffects && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Follow the pipeline steps to estimate treatment effects
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Mediation Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Mediation Analysis
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Treatment (X)</InputLabel>
                  <Select
                    value={treatmentVar}
                    label="Treatment (X)"
                    onChange={(e) => setTreatmentVar(e.target.value)}
                  >
                    {columns.map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Mediator (M)</InputLabel>
                  <Select
                    value={mediatorVar}
                    label="Mediator (M)"
                    onChange={(e) => setMediatorVar(e.target.value)}
                  >
                    {columns.filter(c => c !== treatmentVar && c !== outcomeVar).map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Outcome (Y)</InputLabel>
                  <Select
                    value={outcomeVar}
                    label="Outcome (Y)"
                    onChange={(e) => setOutcomeVar(e.target.value)}
                  >
                    {columns.filter(c => c !== treatmentVar && c !== mediatorVar).map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Covariates (optional)</InputLabel>
                  <Select
                    multiple
                    value={covariates}
                    label="Covariates (optional)"
                    onChange={(e) => setCovariates(e.target.value)}
                    renderValue={(selected) => (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {selected.map(v => <Chip key={v} label={v} size="small" />)}
                      </Stack>
                    )}
                  >
                    {columns.filter(c =>
                      c !== treatmentVar && c !== mediatorVar && c !== outcomeVar
                    ).map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleMediation}
                  disabled={loading || !parsedData || !treatmentVar || !mediatorVar || !outcomeVar}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  Run Mediation Analysis
                </Button>
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} md={8}>
            {mediationResults ? (
              <Box>
                {/* Guardian Report - Design Contract Compliance */}
                {mediationGuardian.hasGuardianContext && (
                  <GuardianReportDisplay {...mediationGuardian.guardianProps} />
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  {mediationGuardian.hasGuardianContext && (
                    <GuardianBadge
                      confidenceScore={mediationGuardian.confidenceScore}
                      violations={mediationGuardian.violations}
                      canProceed={mediationGuardian.canProceed}
                    />
                  )}
                </Box>

                <MediationPathDiagram
                  treatment={treatmentVar}
                  mediators={[{ name: mediatorVar }]}
                  outcome={outcomeVar}
                  results={mediationResults}
                />
              </Box>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Specify variables and run mediation analysis
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* DiD Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Difference-in-Differences
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Outcome Variable</InputLabel>
                  <Select
                    value={outcomeVar}
                    label="Outcome Variable"
                    onChange={(e) => setOutcomeVar(e.target.value)}
                  >
                    {columns.map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Treatment Group</InputLabel>
                  <Select
                    value={treatmentVar}
                    label="Treatment Group"
                    onChange={(e) => setTreatmentVar(e.target.value)}
                  >
                    {columns.filter(c => c !== outcomeVar).map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Post-Treatment Indicator</InputLabel>
                  <Select
                    value={postVar}
                    label="Post-Treatment Indicator"
                    onChange={(e) => setPostVar(e.target.value)}
                  >
                    {columns.filter(c => c !== outcomeVar && c !== treatmentVar).map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleDiD}
                  disabled={loading || !parsedData || !outcomeVar || !treatmentVar || !postVar}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  sx={{ mb: 2 }}
                >
                  Run DiD Analysis
                </Button>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Event Study (Panel Data)
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Unit ID</InputLabel>
                  <Select
                    value={unitVar}
                    label="Unit ID"
                    onChange={(e) => setUnitVar(e.target.value)}
                  >
                    {columns.map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Time Variable</InputLabel>
                  <Select
                    value={timeVar}
                    label="Time Variable"
                    onChange={(e) => setTimeVar(e.target.value)}
                  >
                    {columns.filter(c => c !== unitVar).map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleEventStudy}
                  disabled={loading || !parsedData || !unitVar || !timeVar}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  Run Event Study
                </Button>
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} md={8}>
            {/* DiD Results */}
            {didResults && (
              <Box sx={{ mb: 2 }}>
                {/* Guardian Report - Design Contract Compliance */}
                {didGuardian.hasGuardianContext && (
                  <GuardianReportDisplay {...didGuardian.guardianProps} />
                )}

                <ResultCard>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      DiD Estimate
                    </Typography>
                    {didGuardian.hasGuardianContext && (
                      <GuardianBadge
                        confidenceScore={didGuardian.confidenceScore}
                        violations={didGuardian.violations}
                        canProceed={didGuardian.canProceed}
                      />
                    )}
                  </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <StatBox>
                      <Typography variant="h4" color="primary">
                        {didResults.did_estimate?.toFixed(3)}
                      </Typography>
                      <Typography variant="caption">DiD Effect</Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <StatBox>
                      <Typography variant="h4">
                        {didResults.se?.toFixed(3)}
                      </Typography>
                      <Typography variant="caption">Std. Error</Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <StatBox>
                      <Typography variant="h4">
                        {didResults.t_stat?.toFixed(2)}
                      </Typography>
                      <Typography variant="caption">t-statistic</Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <StatBox>
                      <Typography
                        variant="h4"
                        color={didResults.p_value < 0.05 ? 'success.main' : 'text.primary'}
                      >
                        {didResults.p_value?.toFixed(4)}
                      </Typography>
                      <Typography variant="caption">p-value</Typography>
                    </StatBox>
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 2 }}>
                  95% CI: [{didResults.ci_lower?.toFixed(3)}, {didResults.ci_upper?.toFixed(3)}]
                </Alert>
              </ResultCard>
              </Box>
            )}

            {/* Event Study Plot */}
            {eventStudyResults && eventStudyResults.length > 0 && (
              <EventStudyPlot
                data={eventStudyResults}
                title="Event Study: Dynamic Treatment Effects"
              />
            )}

            {!didResults && !eventStudyResults && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Configure and run DiD or event study analysis
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Help Section */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <HelpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Causal Inference Guide
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            <strong>DAG (Directed Acyclic Graph):</strong> Visual representation of causal
            relationships. Helps identify confounders and determine which variables to
            control for.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>Propensity Score Matching:</strong> Balances treatment and control
            groups on observed covariates. Use when randomization isn't possible.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>Mediation Analysis:</strong> Decomposes the total effect into direct
            and indirect effects through a mediator. Baron-Kenny is the classic approach.
          </Typography>

          <Typography variant="body2">
            <strong>Difference-in-Differences:</strong> Compares changes over time between
            treatment and control groups. Requires parallel trends assumption.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default CausalInferenceModule;
