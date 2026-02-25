/**
 * Meta-Analysis Hub
 *
 * Main container for the meta-analysis module.
 * Allows users to input study data, run meta-analysis,
 * and visualize results with forest plots and funnel plots.
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
  Grid,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  AccountTree as MetaIcon,
  Add as AddIcon,
  PlayArrow as RunIcon,
  Assessment as ResultsIcon,
  BubbleChart as FunnelIcon,
  Timeline as ForestIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import StudyDataInput from './StudyDataInput';
import ForestPlot from './ForestPlot';
import FunnelPlot from './FunnelPlot';
import HeterogeneityPanel from './HeterogeneityPanel';
import SensitivityAnalysis from './SensitivityAnalysis';

const steps = ['Enter Study Data', 'Configure Analysis', 'View Results'];

const MetaAnalysisHub = () => {
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  // Study data
  const [studies, setStudies] = useState([
    { study_name: '', effect_size: '', standard_error: '', sample_size: '', subgroup: '' }
  ]);

  // Analysis configuration
  const [config, setConfig] = useState({
    model: 'random',
    method: 'DL',
    alpha: 0.05,
    effectType: 'd', // 'd', 'r', 'or', 'log_or'
  });

  // Results
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Results tab
  const [resultsTab, setResultsTab] = useState(0);

  // Validate studies - MUST be defined before handleExportResults which uses it
  const validStudies = useMemo(() => {
    return studies.filter(s =>
      s.study_name &&
      s.effect_size !== '' && !isNaN(parseFloat(s.effect_size)) &&
      s.standard_error !== '' && !isNaN(parseFloat(s.standard_error)) &&
      parseFloat(s.standard_error) > 0
    );
  }, [studies]);

  const canRunAnalysis = validStudies.length >= 2;

  // Export results
  const handleExportResults = useCallback(() => {
    if (!results) return;

    const exportData = {
      meta_analysis_results: {
        summary: {
          overall_effect: results.summary?.overall_effect,
          confidence_interval: results.summary?.ci,
          p_value: results.summary?.p_value,
          model: config.model,
          method: config.method
        },
        heterogeneity: results.heterogeneity || {},
        publication_bias: results.publication_bias || {},
        individual_studies: validStudies.map(s => ({
          study_name: s.study_name,
          effect_size: parseFloat(s.effect_size),
          standard_error: parseFloat(s.standard_error),
          sample_size: s.sample_size ? parseInt(s.sample_size) : null
        })),
        export_timestamp: new Date().toISOString(),
        generated_by: 'StickForStats Meta-Analysis Module'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meta_analysis_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results, config, validStudies]);

  // Add new study row
  const handleAddStudy = useCallback(() => {
    setStudies(prev => [
      ...prev,
      { study_name: '', effect_size: '', standard_error: '', sample_size: '', subgroup: '' }
    ]);
  }, []);

  // Remove study row
  const handleRemoveStudy = useCallback((index) => {
    setStudies(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update study data
  const handleUpdateStudy = useCallback((index, field, value) => {
    setStudies(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  // Run meta-analysis
  const handleRunAnalysis = useCallback(async () => {
    if (!canRunAnalysis) {
      setError('At least 2 valid studies are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const studyData = validStudies.map(s => ({
        study_name: s.study_name,
        effect_size: parseFloat(s.effect_size),
        standard_error: parseFloat(s.standard_error),
        sample_size: s.sample_size ? parseInt(s.sample_size) : null,
        subgroup: s.subgroup || null
      }));

      const response = await fetch('/api/v1/meta-analysis/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studies: studyData,
          model: config.model,
          method: config.method,
          alpha: config.alpha
        })
      });

      // Check HTTP status before parsing response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data);
        setActiveStep(2);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError(`Failed to run analysis: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [validStudies, config, canRunAnalysis]);

  // Load example data
  const handleLoadExample = useCallback(() => {
    setStudies([
      { study_name: 'Smith 2018', effect_size: '0.45', standard_error: '0.15', sample_size: '48', subgroup: 'RCT' },
      { study_name: 'Johnson 2019', effect_size: '0.52', standard_error: '0.12', sample_size: '72', subgroup: 'RCT' },
      { study_name: 'Williams 2019', effect_size: '0.38', standard_error: '0.18', sample_size: '36', subgroup: 'Observational' },
      { study_name: 'Brown 2020', effect_size: '0.61', standard_error: '0.14', sample_size: '56', subgroup: 'RCT' },
      { study_name: 'Davis 2020', effect_size: '0.29', standard_error: '0.20', sample_size: '30', subgroup: 'Observational' },
      { study_name: 'Miller 2021', effect_size: '0.55', standard_error: '0.11', sample_size: '84', subgroup: 'RCT' },
      { study_name: 'Wilson 2021', effect_size: '0.42', standard_error: '0.16', sample_size: '42', subgroup: 'Observational' },
      { study_name: 'Moore 2022', effect_size: '0.48', standard_error: '0.13', sample_size: '64', subgroup: 'RCT' },
    ]);
  }, []);

  // Render header
  const renderHeader = () => (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #7b1fa2 0%, #9c27b0 50%, #ba68c8 100%)',
        color: 'white',
        py: 4,
        px: 3,
        borderRadius: 2,
        mb: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <MetaIcon sx={{ fontSize: 48 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Meta-Analysis
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Synthesize effect sizes across multiple studies
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label="Forest Plots" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
        <Chip label="Heterogeneity (I², Q)" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
        <Chip label="Publication Bias" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
        <Chip label="Subgroup Analysis" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
      </Box>
    </Box>
  );

  // Render stepper
  const renderStepper = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => (
          <Step key={label} completed={index < activeStep}>
            <StepLabel
              onClick={() => index <= Math.max(activeStep, results ? 2 : 1) && setActiveStep(index)}
              sx={{ cursor: index <= Math.max(activeStep, results ? 2 : 1) ? 'pointer' : 'default' }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );

  // Render data input step
  const renderDataInput = () => (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Study Data
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleLoadExample}
          >
            Load Example
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddStudy}
          >
            Add Study
          </Button>
        </Box>
      </Box>

      <StudyDataInput
        studies={studies}
        onUpdateStudy={handleUpdateStudy}
        onRemoveStudy={handleRemoveStudy}
      />

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {validStudies.length} of {studies.length} studies valid
          {validStudies.length < 2 && (
            <Typography component="span" color="error" sx={{ ml: 1 }}>
              (minimum 2 required)
            </Typography>
          )}
        </Typography>
        <Button
          variant="contained"
          onClick={() => setActiveStep(1)}
          disabled={!canRunAnalysis}
        >
          Next: Configure Analysis
        </Button>
      </Box>
    </Paper>
  );

  // Render configuration step
  const renderConfiguration = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Analysis Configuration
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Model Type
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={config.model === 'fixed' ? 'contained' : 'outlined'}
                  onClick={() => setConfig(c => ({ ...c, model: 'fixed' }))}
                  fullWidth
                >
                  Fixed Effects
                </Button>
                <Button
                  variant={config.model === 'random' ? 'contained' : 'outlined'}
                  onClick={() => setConfig(c => ({ ...c, model: 'random' }))}
                  fullWidth
                >
                  Random Effects
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {config.model === 'fixed'
                  ? 'Assumes all studies share a common true effect size'
                  : 'Assumes true effects vary between studies (recommended for most cases)'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Heterogeneity Estimator
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={config.method === 'DL' ? 'contained' : 'outlined'}
                  onClick={() => setConfig(c => ({ ...c, method: 'DL' }))}
                  fullWidth
                  disabled={config.model === 'fixed'}
                >
                  DerSimonian-Laird
                </Button>
                <Button
                  variant={config.method === 'PM' ? 'contained' : 'outlined'}
                  onClick={() => setConfig(c => ({ ...c, method: 'PM' }))}
                  fullWidth
                  disabled={config.model === 'fixed'}
                >
                  Paule-Mandel
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {config.method === 'DL'
                  ? 'Most commonly used method (default)'
                  : 'More robust for small number of studies'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined" sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100] }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Studies</Typography>
                  <Typography variant="h6">{validStudies.length}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Model</Typography>
                  <Typography variant="h6">{config.model === 'random' ? 'Random Effects' : 'Fixed Effects'}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Method</Typography>
                  <Typography variant="h6">{config.method}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Alpha</Typography>
                  <Typography variant="h6">{config.alpha}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={() => setActiveStep(0)}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <RunIcon />}
          onClick={handleRunAnalysis}
          disabled={isLoading || !canRunAnalysis}
        >
          {isLoading ? 'Running...' : 'Run Meta-Analysis'}
        </Button>
      </Box>
    </Paper>
  );

  // Render results step
  const renderResults = () => {
    if (!results) return null;

    return (
      <Box>
        {/* Summary Card */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e9' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Pooled Effect Size</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {results.pooled_effect.toFixed(3)}
              </Typography>
              <Typography variant="body2">
                95% CI: [{results.pooled_ci[0].toFixed(3)}, {results.pooled_ci[1].toFixed(3)}]
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">p-value</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: results.pooled_p < 0.05 ? 'success.main' : 'text.secondary' }}>
                {results.pooled_p < 0.001 ? '< 0.001' : results.pooled_p.toFixed(4)}
              </Typography>
              <Typography variant="body2">
                z = {results.pooled_z.toFixed(3)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Heterogeneity (I²)</Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: results.heterogeneity.i_squared > 75 ? 'error.main' :
                         results.heterogeneity.i_squared > 50 ? 'warning.main' : 'success.main'
                }}
              >
                {results.heterogeneity.i_squared.toFixed(1)}%
              </Typography>
              <Typography variant="body2">
                {results.heterogeneity.i_squared < 25 ? 'Low' :
                 results.heterogeneity.i_squared < 50 ? 'Moderate' :
                 results.heterogeneity.i_squared < 75 ? 'Substantial' : 'Considerable'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Results Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={resultsTab}
            onChange={(e, v) => setResultsTab(v)}
            variant="fullWidth"
          >
            <Tab icon={<ForestIcon />} label="Forest Plot" />
            <Tab icon={<FunnelIcon />} label="Funnel Plot" />
            <Tab icon={<ResultsIcon />} label="Heterogeneity" />
            <Tab icon={<WarningIcon />} label="Sensitivity" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Paper sx={{ p: 3, minHeight: 400 }}>
          {resultsTab === 0 && (
            <ForestPlot
              studies={results.studies}
              pooledEffect={results.pooled_effect}
              pooledCI={results.pooled_ci}
              model={results.model}
            />
          )}
          {resultsTab === 1 && (
            <FunnelPlot
              data={results.funnel_plot_data}
              publicationBias={results.publication_bias}
            />
          )}
          {resultsTab === 2 && (
            <HeterogeneityPanel
              heterogeneity={results.heterogeneity}
              subgroupAnalysis={results.subgroup_analysis}
            />
          )}
          {resultsTab === 3 && (
            <SensitivityAnalysis
              sensitivityResults={results.sensitivity_analysis}
              pooledEffect={results.pooled_effect}
            />
          )}
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button onClick={() => setActiveStep(0)}>
            Modify Data
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRunAnalysis}
            >
              Re-run Analysis
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportResults}
              disabled={!results}
            >
              Export Results
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {renderHeader()}
      {renderStepper()}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {activeStep === 0 && renderDataInput()}
      {activeStep === 1 && renderConfiguration()}
      {activeStep === 2 && renderResults()}
    </Container>
  );
};

export default MetaAnalysisHub;
