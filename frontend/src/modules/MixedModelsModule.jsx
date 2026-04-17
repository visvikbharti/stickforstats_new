/**
 * Mixed Models Module
 * ====================
 * Comprehensive interface for multilevel/hierarchical modeling including:
 * - ICC calculation
 * - Linear Mixed Models (LMM)
 * - Random effects visualization
 * - Model diagnostics
 * - Model comparison
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import React, { useState, useMemo } from 'react';
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
  Switch
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Calculate as CalculateIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Help as HelpIcon,
  Upload as UploadIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Import components
import CaterpillarPlot from '../components/mixed_models/CaterpillarPlot';
import mixedModelsService from '../services/MixedModelsService';

// Guardian Design Contract compliance
import useGuardianReport from '../hooks/useGuardianReport';
import { GuardianReportDisplay, GuardianBadge } from '../components/Guardian';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'box-shadow 0.2s',
  '&:hover': {
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

// ICC type descriptions
const ICC_TYPES = {
  'ICC(1)': 'Single rater, absolute agreement',
  'ICC(2)': 'Single rater, consistency (two-way random)',
  'ICC(3)': 'Single rater, consistency (two-way mixed)',
  'ICC(1,k)': 'Average of k raters, absolute agreement',
  'ICC(2,k)': 'Average of k raters, consistency (two-way random)',
  'ICC(3,k)': 'Average of k raters, consistency (two-way mixed)'
};

const MixedModelsModule = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Data state
  const [dataInput, setDataInput] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);

  // ICC state
  const [iccType, setIccType] = useState('ICC(2,1)');
  const [iccResults, setIccResults] = useState(null);

  // LMM state
  const [outcomeVar, setOutcomeVar] = useState('');
  const [fixedEffects, setFixedEffects] = useState([]);
  const [groupingVar, setGroupingVar] = useState('');
  const [includeRandomSlope, setIncludeRandomSlope] = useState(false);
  const [randomSlopeVar, setRandomSlopeVar] = useState('');
  const [lmmResults, setLmmResults] = useState(null);
  const [randomEffects, setRandomEffects] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guardian context for Design Contract compliance
  // "No statistical result may exist without an explicit, traceable assumption context."
  const iccGuardian = useGuardianReport(iccResults);
  const lmmGuardian = useGuardianReport(lmmResults);

  // Parse input data
  const handleParseData = () => {
    try {
      // Try to parse as tab/comma separated
      const lines = dataInput.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('Data must have at least a header row and one data row');
      }

      // Detect delimiter
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
      return 'This endpoint is temporarily unavailable. Please try again later.';
    }
    return err.response?.data?.error || err.message;
  };

  // Calculate ICC
  const handleCalculateICC = async () => {
    if (!parsedData) {
      setError('Please enter and parse data first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await mixedModelsService.calculateICC(parsedData, iccType);
      setIccResults(result);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Fit LMM
  const handleFitLMM = async () => {
    if (!parsedData || !outcomeVar || !groupingVar || fixedEffects.length === 0) {
      setError('Please specify outcome, fixed effects, and grouping variable');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const randomEffectsSpec = {
        intercept: true,
        slopes: includeRandomSlope && randomSlopeVar ? [randomSlopeVar] : []
      };

      const result = await mixedModelsService.fitLMM(
        parsedData,
        outcomeVar,
        fixedEffects,
        randomEffectsSpec,
        groupingVar
      );

      setLmmResults(result);

      // Also get random effects for visualization
      const reResult = await mixedModelsService.extractRandomEffects(
        parsedData,
        outcomeVar,
        fixedEffects,
        randomEffectsSpec,
        groupingVar
      );

      setRandomEffects(mixedModelsService.processCaterpillarData(reResult));
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
    setIccResults(null);
    setLmmResults(null);
    setRandomEffects(null);
    setError(null);
  };

  // Format variance components
  const varianceComponents = useMemo(() => {
    if (!lmmResults) return [];
    return mixedModelsService.formatVarianceComponents(lmmResults);
  }, [lmmResults]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Mixed Effects Models
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analyze hierarchical and longitudinal data with random effects models.
          Calculate ICC for reliability, fit linear mixed models, and visualize random effects.
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
          rows={6}
          fullWidth
          placeholder="Paste data here (CSV or tab-separated with headers)&#10;Example:&#10;subject,time,score,group&#10;1,1,85,A&#10;1,2,88,A&#10;2,1,72,B"
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
            Data parsed successfully: {columns.length} columns,{' '}
            {parsedData[columns[0]]?.length || 0} rows
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {columns.map(col => (
                  <Chip key={col} label={col} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          </Alert>
        )}
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="fullWidth"
        >
          <Tab label="ICC Calculation" icon={<CalculateIcon />} iconPosition="start" />
          <Tab label="Linear Mixed Model" icon={<TimelineIcon />} iconPosition="start" />
          <Tab label="Random Effects" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ICC Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ICC Settings
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>ICC Type</InputLabel>
                  <Select
                    value={iccType}
                    label="ICC Type"
                    onChange={(e) => setIccType(e.target.value)}
                  >
                    {Object.entries(ICC_TYPES).map(([type, desc]) => (
                      <MenuItem key={type} value={type}>
                        {type} - {desc}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {ICC_TYPES[iccType]}
                </Typography>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCalculateICC}
                  disabled={loading || !parsedData}
                  startIcon={loading ? <CircularProgress size={20} /> : <CalculateIcon />}
                >
                  Calculate ICC
                </Button>
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} md={8}>
            {iccResults ? (
              <Box>
                {/* Guardian Report - Design Contract Compliance */}
                {iccGuardian.hasGuardianContext && (
                  <GuardianReportDisplay {...iccGuardian.guardianProps} />
                )}

                <ResultCard>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      ICC Results
                    </Typography>
                    {iccGuardian.hasGuardianContext && (
                      <GuardianBadge
                        confidenceScore={iccGuardian.confidenceScore}
                        violations={iccGuardian.violations}
                        canProceed={iccGuardian.canProceed}
                      />
                    )}
                  </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <StatBox>
                      <Typography variant="h4" color="primary">
                        {iccResults.icc_value?.toFixed(3) || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ICC Value
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatBox>
                      <Typography variant="h4" color="secondary">
                        [{iccResults.ci_lower?.toFixed(2)}, {iccResults.ci_upper?.toFixed(2)}]
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        95% CI
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatBox>
                      <Typography variant="h4">
                        {iccResults.f_value?.toFixed(2) || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        F-value
                      </Typography>
                    </StatBox>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatBox>
                      <Typography variant="h4" color={iccResults.p_value < 0.05 ? 'success.main' : 'text.primary'}>
                        {iccResults.p_value?.toFixed(4) || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        p-value
                      </Typography>
                    </StatBox>
                  </Grid>
                </Grid>

                <Alert
                  severity={
                    iccResults.icc_value >= 0.75 ? 'success' :
                    iccResults.icc_value >= 0.5 ? 'info' :
                    iccResults.icc_value >= 0.25 ? 'warning' : 'error'
                  }
                  sx={{ mt: 2 }}
                >
                  {iccResults.icc_value >= 0.75 ? 'Excellent reliability (ICC ≥ 0.75)' :
                   iccResults.icc_value >= 0.5 ? 'Moderate to good reliability (0.5 ≤ ICC < 0.75)' :
                   iccResults.icc_value >= 0.25 ? 'Poor to moderate reliability (0.25 ≤ ICC < 0.5)' :
                   'Poor reliability (ICC < 0.25)'}
                </Alert>
              </ResultCard>
              </Box>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Enter data and calculate ICC to see results
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* LMM Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Model Specification
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
                  <InputLabel>Fixed Effects</InputLabel>
                  <Select
                    multiple
                    value={fixedEffects}
                    label="Fixed Effects"
                    onChange={(e) => setFixedEffects(e.target.value)}
                    renderValue={(selected) => (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {selected.map(v => <Chip key={v} label={v} size="small" />)}
                      </Stack>
                    )}
                  >
                    {columns.filter(c => c !== outcomeVar && c !== groupingVar).map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Grouping Variable</InputLabel>
                  <Select
                    value={groupingVar}
                    label="Grouping Variable"
                    onChange={(e) => setGroupingVar(e.target.value)}
                  >
                    {columns.filter(c => c !== outcomeVar).map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={includeRandomSlope}
                      onChange={(e) => setIncludeRandomSlope(e.target.checked)}
                    />
                  }
                  label="Include Random Slope"
                />

                {includeRandomSlope && (
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Random Slope Variable</InputLabel>
                    <Select
                      value={randomSlopeVar}
                      label="Random Slope Variable"
                      onChange={(e) => setRandomSlopeVar(e.target.value)}
                    >
                      {fixedEffects.map(col => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={handleFitLMM}
                  disabled={loading || !parsedData || !outcomeVar || !groupingVar || fixedEffects.length === 0}
                  startIcon={loading ? <CircularProgress size={20} /> : <CalculateIcon />}
                >
                  Fit Model
                </Button>
              </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} md={8}>
            {lmmResults ? (
              <Box>
                {/* Guardian Report - Design Contract Compliance */}
                {lmmGuardian.hasGuardianContext && (
                  <GuardianReportDisplay {...lmmGuardian.guardianProps} />
                )}

                {/* Fixed Effects */}
                <ResultCard sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Fixed Effects
                    </Typography>
                    {lmmGuardian.hasGuardianContext && (
                      <GuardianBadge
                        confidenceScore={lmmGuardian.confidenceScore}
                        violations={lmmGuardian.violations}
                        canProceed={lmmGuardian.canProceed}
                      />
                    )}
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Parameter</TableCell>
                          <TableCell align="right">Estimate</TableCell>
                          <TableCell align="right">Std. Error</TableCell>
                          <TableCell align="right">t-value</TableCell>
                          <TableCell align="right">p-value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lmmResults.fixed_effects?.map((fe, i) => (
                          <TableRow key={i}>
                            <TableCell>{fe.parameter || fe.name}</TableCell>
                            <TableCell align="right">{fe.estimate?.toFixed(4)}</TableCell>
                            <TableCell align="right">{fe.std_error?.toFixed(4)}</TableCell>
                            <TableCell align="right">{fe.t_value?.toFixed(3)}</TableCell>
                            <TableCell
                              align="right"
                              sx={{ color: fe.p_value < 0.05 ? 'success.main' : 'inherit' }}
                            >
                              {fe.p_value?.toFixed(4)}
                              {fe.p_value < 0.001 ? '***' : fe.p_value < 0.01 ? '**' : fe.p_value < 0.05 ? '*' : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </ResultCard>

                {/* Variance Components */}
                <ResultCard sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Variance Components
                  </Typography>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Component</TableCell>
                          <TableCell align="right">Variance</TableCell>
                          <TableCell align="right">Std. Dev.</TableCell>
                          <TableCell align="right">% of Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {varianceComponents.map((vc, i) => (
                          <TableRow key={i}>
                            <TableCell>{vc.component}</TableCell>
                            <TableCell align="right">{vc.variance?.toFixed(4)}</TableCell>
                            <TableCell align="right">{vc.sd?.toFixed(4)}</TableCell>
                            <TableCell align="right">{vc.percentOfTotal}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {varianceComponents.length > 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      ICC = {(varianceComponents[0]?.variance /
                        varianceComponents.reduce((sum, vc) => sum + vc.variance, 0) * 100).toFixed(1)}%
                      of variance is between groups
                    </Alert>
                  )}
                </ResultCard>

                {/* Model Fit */}
                <ResultCard>
                  <Typography variant="h6" gutterBottom>
                    Model Fit Statistics
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <StatBox>
                        <Typography variant="h5">{lmmResults.aic?.toFixed(2)}</Typography>
                        <Typography variant="caption">AIC</Typography>
                      </StatBox>
                    </Grid>
                    <Grid item xs={4}>
                      <StatBox>
                        <Typography variant="h5">{lmmResults.bic?.toFixed(2)}</Typography>
                        <Typography variant="caption">BIC</Typography>
                      </StatBox>
                    </Grid>
                    <Grid item xs={4}>
                      <StatBox>
                        <Typography variant="h5">{lmmResults.log_likelihood?.toFixed(2)}</Typography>
                        <Typography variant="caption">Log-Likelihood</Typography>
                      </StatBox>
                    </Grid>
                  </Grid>

                  {lmmResults.converged !== undefined && (
                    <Alert
                      severity={lmmResults.converged ? 'success' : 'warning'}
                      sx={{ mt: 2 }}
                    >
                      {lmmResults.converged
                        ? 'Model converged successfully'
                        : 'Warning: Model may not have converged. Results should be interpreted with caution.'}
                    </Alert>
                  )}
                </ResultCard>
              </Box>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Specify model parameters and fit model to see results
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Random Effects Tab */}
      <TabPanel value={activeTab} index={2}>
        {randomEffects && randomEffects.length > 0 ? (
          <CaterpillarPlot
            data={randomEffects}
            title="Random Effects (BLUPs)"
            effectType="Intercept"
            showShrinkage={true}
          />
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Fit a mixed model first to visualize random effects
            </Typography>
          </Paper>
        )}
      </TabPanel>

      {/* Help Section */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <HelpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Understanding Mixed Models
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" paragraph>
            <strong>When to use mixed models:</strong>
          </Typography>
          <ul>
            <li>Data has a hierarchical/nested structure (e.g., students within schools)</li>
            <li>Repeated measures on the same subjects</li>
            <li>Observations are not independent</li>
            <li>You want to model between-group variability</li>
          </ul>

          <Typography variant="body2" paragraph>
            <strong>ICC Interpretation:</strong>
          </Typography>
          <ul>
            <li>&lt; 0.25: Poor reliability/agreement</li>
            <li>0.25-0.50: Moderate reliability</li>
            <li>0.50-0.75: Good reliability</li>
            <li>&gt; 0.75: Excellent reliability</li>
          </ul>

          <Typography variant="body2">
            <strong>Random Effects:</strong> Random intercepts allow each group to have its own
            baseline level. Random slopes allow the effect of a predictor to vary across groups.
            The caterpillar plot shows group-specific deviations from the overall mean (BLUPs).
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default MixedModelsModule;
