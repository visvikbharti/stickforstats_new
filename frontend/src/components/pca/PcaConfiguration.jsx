import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Divider,
  CircularProgress,
  Slider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Switch,
  Card,
  CardContent,
  CardHeader,
  Grid,
  LinearProgress,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  Tooltip,
  IconButton,
  Collapse,
  Fade
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import BarChartIcon from '@mui/icons-material/BarChart';

import { runPcaAnalysis } from '../../api/pcaApi';
import PcaProgressTracker from './PcaProgressTracker';

const PcaConfiguration = ({
  projectId,
  project,
  isRunningAnalysis,
  analysisProgress,
  onAnalysisStarted,
  onAnalysisCompleted,
  onNext
}) => {
  const theme = useTheme();
  
  const [numComponents, setNumComponents] = useState(5);
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [loadingPlotEnabled, setLoadingPlotEnabled] = useState(true);
  const [topGenesCount, setTopGenesCount] = useState(10);
  const [visualizationType, setVisualizationType] = useState('2D');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);

  const handleRunAnalysis = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (onAnalysisStarted) {
        onAnalysisStarted();
      }

      const response = await runPcaAnalysis(projectId, {
        n_components: numComponents,
        scaling_method: project?.scaling_method || 'STANDARD',
        visualization_type: visualizationType,
        load_gene_loadings: loadingPlotEnabled,
        top_genes_count: topGenesCount
      });

      setSuccess('PCA analysis started successfully');
      setCurrentAnalysisId(response.id);

      // The actual completion will be handled by the PcaProgressTracker
      // through WebSocket updates
    } catch (err) {
      setError(`Failed to start PCA analysis: ${err.message}`);
      if (onAnalysisCompleted) {
        onAnalysisCompleted();
      }
    }
  };

  // Handle analysis completion
  const handleAnalysisComplete = (result) => {
    setSuccess('PCA analysis completed successfully');
    setCurrentAnalysisId(null);

    if (onAnalysisCompleted) {
      onAnalysisCompleted(result);
    }
  };

  // Handle analysis error
  const handleAnalysisError = (errorMessage) => {
    setError(`PCA analysis failed: ${errorMessage}`);
    setCurrentAnalysisId(null);

    if (onAnalysisCompleted) {
      onAnalysisCompleted();
    }
  };

  // Handle analysis cancellation
  const handleAnalysisCancel = () => {
    setCurrentAnalysisId(null);

    if (onAnalysisCompleted) {
      onAnalysisCompleted();
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Configure PCA Analysis
      </Typography>
      
      <Typography paragraph>
        Configure your PCA analysis parameters. Principal Component Analysis will identify the directions 
        of maximum variance in your gene expression data, allowing you to visualize patterns and relationships.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader 
              title="PCA Parameters" 
              subheader="Configure the core PCA settings"
              avatar={<SettingsIcon color="primary" />}
            />
            <CardContent>
              <Box sx={{ mb: 4 }}>
                <Typography id="pca-components-slider" gutterBottom>
                  Number of Principal Components
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs>
                    <Slider
                      value={numComponents}
                      onChange={(e, newValue) => setNumComponents(newValue)}
                      aria-labelledby="pca-components-slider"
                      valueLabelDisplay="auto"
                      step={1}
                      marks
                      min={2}
                      max={20}
                      disabled={isRunningAnalysis}
                    />
                  </Grid>
                  <Grid item>
                    <TextField
                      value={numComponents}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 2 && value <= 20) {
                          setNumComponents(value);
                        }
                      }}
                      inputProps={{
                        step: 1,
                        min: 2,
                        max: 20,
                        type: 'number',
                      }}
                      size="small"
                      sx={{ width: 60 }}
                      disabled={isRunningAnalysis}
                    />
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary">
                  The number of principal components to calculate. Higher values capture more variance 
                  but increase computation time.
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Data Scaling Method
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current method: <strong>{project?.scaling_method === 'STANDARD' 
                    ? 'Standard (Z-score)' 
                    : project?.scaling_method === 'MINMAX' 
                      ? 'Min-Max (0-1)' 
                      : 'None'}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  The scaling method was chosen during data upload and affects how the gene expression values
                  are normalized before PCA.
                </Typography>
              </Box>
              
              <FormGroup>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={advancedOptions} 
                      onChange={(e) => setAdvancedOptions(e.target.checked)}
                      disabled={isRunningAnalysis}
                    />
                  } 
                  label="Show advanced options" 
                />
              </FormGroup>
              
              {advancedOptions && (
                <Box sx={{ mt: 3, pl: 2, borderLeft: `2px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Advanced Options
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small" margin="normal">
                        <InputLabel id="visualization-type-label">Visualization Type</InputLabel>
                        <Select
                          labelId="visualization-type-label"
                          value={visualizationType}
                          label="Visualization Type"
                          onChange={(e) => setVisualizationType(e.target.value)}
                          disabled={isRunningAnalysis}
                        >
                          <MenuItem value="2D">2D Plot</MenuItem>
                          <MenuItem value="3D">3D Plot</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormGroup>
                        <FormControlLabel 
                          control={
                            <Switch 
                              checked={loadingPlotEnabled} 
                              onChange={(e) => setLoadingPlotEnabled(e.target.checked)}
                              disabled={isRunningAnalysis}
                            />
                          } 
                          label="Include gene loading plot" 
                        />
                      </FormGroup>
                    </Grid>
                    
                    {loadingPlotEnabled && (
                      <Grid item xs={12}>
                        <Typography id="top-genes-slider" gutterBottom variant="body2">
                          Number of top genes to highlight
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs>
                            <Slider
                              value={topGenesCount}
                              onChange={(e, newValue) => setTopGenesCount(newValue)}
                              aria-labelledby="top-genes-slider"
                              valueLabelDisplay="auto"
                              step={1}
                              marks
                              min={5}
                              max={30}
                              disabled={isRunningAnalysis}
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              value={topGenesCount}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value) && value >= 5 && value <= 30) {
                                  setTopGenesCount(value);
                                }
                              }}
                              inputProps={{
                                step: 1,
                                min: 5,
                                max: 30,
                                type: 'number',
                              }}
                              size="small"
                              sx={{ width: 60 }}
                              disabled={isRunningAnalysis}
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader 
              title="Analysis Information" 
              subheader="Overview of your PCA analysis"
              avatar={<BarChartIcon color="primary" />}
            />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Project Summary
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1
                }}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}>
                      <Typography variant="body2" color="text.secondary">
                        Project Name:
                      </Typography>
                    </Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2">
                        {project?.name || 'N/A'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={5}>
                      <Typography variant="body2" color="text.secondary">
                        Samples:
                      </Typography>
                    </Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2">
                        {project?.sample_count || 0}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={5}>
                      <Typography variant="body2" color="text.secondary">
                        Groups:
                      </Typography>
                    </Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2">
                        {project?.group_count || 0}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={5}>
                      <Typography variant="body2" color="text.secondary">
                        Genes:
                      </Typography>
                    </Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2">
                        {project?.gene_count || 0}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={5}>
                      <Typography variant="body2" color="text.secondary">
                        Scaling Method:
                      </Typography>
                    </Grid>
                    <Grid item xs={7}>
                      <Typography variant="body2">
                        {project?.scaling_method === 'STANDARD' 
                          ? 'Standard (Z-score)' 
                          : project?.scaling_method === 'MINMAX' 
                            ? 'Min-Max (0-1)' 
                            : 'None'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  PCA Analysis
                </Typography>
                <Typography variant="body2" paragraph>
                  Principal Component Analysis will:
                </Typography>
                <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                  <li>
                    <Typography variant="body2">
                      Calculate {numComponents} principal components
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      Transform gene expression data to the new PC space
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      Calculate variance explained by each component
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      Identify genes contributing most to each component
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      Generate {visualizationType} visualizations of sample patterns
                    </Typography>
                  </li>
                </ul>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={isRunningAnalysis ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                  onClick={handleRunAnalysis}
                  disabled={isRunningAnalysis}
                  sx={{ px: 4, py: 1 }}
                >
                  {isRunningAnalysis ? 'Running Analysis...' : 'Run PCA Analysis'}
                </Button>
              </Box>
              
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* PCA Progress Tracker */}
      <Fade in={!!currentAnalysisId || isRunningAnalysis} timeout={500}>
        <Box sx={{ mt: 4 }}>
          <PcaProgressTracker
            projectId={projectId}
            analysisId={currentAnalysisId}
            onComplete={handleAnalysisComplete}
            onError={handleAnalysisError}
            onCancel={handleAnalysisCancel}
            enabled={!!currentAnalysisId || isRunningAnalysis}
          />
        </Box>
      </Fade>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={onNext}
          disabled={isRunningAnalysis || !!currentAnalysisId}
        >
          {project?.results_count > 0
            ? 'View PCA Results'
            : 'Continue to Visualization'}
        </Button>
      </Box>
    </Box>
  );
};

export default PcaConfiguration;