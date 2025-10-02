import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../context/AuthContext';

// Import calculator components
import SampleBasedCalculator from './SampleBasedCalculator';
import ParameterBasedCalculator from './ParameterBasedCalculator';
import BootstrapCalculator from './BootstrapCalculator';
import BayesianCalculator from './BayesianCalculator';
import DifferenceCalculator from './DifferenceCalculator';

// Import visualization components
import IntervalVisualization from '../visualizations/IntervalVisualization';

/**
 * Dashboard component for confidence interval calculators
 */
const CalculatorDashboard = ({ projects = [] }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { isDemoMode } = useAuth();
  
  // State variables
  const [activeTab, setActiveTab] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectData, setProjectData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  // Calculator types
  const calculatorTypes = [
    { label: 'Sample-Based', component: SampleBasedCalculator },
    { label: 'Parameter-Based', component: ParameterBasedCalculator },
    { label: 'Bootstrap', component: BootstrapCalculator },
    { label: 'Bayesian', component: BayesianCalculator },
    { label: 'Differences', component: DifferenceCalculator }
  ];
  
  // Effect to set initial project from URL params
  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId && Array.isArray(projects) && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
      }
    } else if (Array.isArray(projects) && projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects, searchParams, selectedProject]);

  // Fetch project data when project changes
  useEffect(() => {
    if (!selectedProject) return;
    
    const fetchProjectData = async () => {
      setLoading(true);
      
      // In demo mode, use mock data
      if (isDemoMode) {
        const mockData = [
          {
            id: 'demo-data-1',
            name: 'Sample Dataset 1',
            values: [23.5, 24.1, 22.8, 25.2, 23.9, 24.6, 23.3, 24.8, 25.1, 23.7],
            type: 'continuous',
            project: selectedProject.id
          },
          {
            id: 'demo-data-2',
            name: 'Sample Proportions',
            successes: 45,
            trials: 100,
            type: 'proportion',
            project: selectedProject.id
          }
        ];
        
        const mockResults = [
          {
            id: 'demo-result-1',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            method: 'Sample Mean',
            confidence_level: 0.95,
            lower_bound: 23.2,
            upper_bound: 24.8,
            point_estimate: 24.0,
            data_name: 'Sample Dataset 1'
          },
          {
            id: 'demo-result-2',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            method: 'Proportion',
            confidence_level: 0.95,
            lower_bound: 0.35,
            upper_bound: 0.55,
            point_estimate: 0.45,
            data_name: 'Sample Proportions'
          }
        ];
        
        setProjectData(mockData);
        setResults(mockResults);
        setLoading(false);
        return;
      }
      
      try {
        // Fetch the project's saved data
        const response = await axios.get(`/api/v1/confidence-intervals/data/?project=${selectedProject.id}`);
        setProjectData(Array.isArray(response.data) ? response.data : []);
        
        // Fetch the project's calculation results
        const resultsResponse = await axios.get(`/api/v1/confidence-intervals/results/?project=${selectedProject.id}`);
        setResults(Array.isArray(resultsResponse.data) ? resultsResponse.data : []);
      } catch (error) {
        console.error('Error fetching project data:', error);
        enqueueSnackbar('Failed to load project data', { variant: 'error' });
        setProjectData([]);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [selectedProject, enqueueSnackbar, isDemoMode]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle project change
  const handleProjectChange = (event) => {
    const project = Array.isArray(projects) ? projects.find(p => p.id === event.target.value) : null;
    if (project) {
      setSelectedProject(project);
      setSearchParams({ project: project.id });
    }
  };

  // Handle saving a new calculation result
  const handleSaveResult = (newResult) => {
    setResults([newResult, ...results]);
    enqueueSnackbar('Calculation saved successfully', { variant: 'success' });
  };

  // Remove a result
  const handleRemoveResult = async (resultId) => {
    // In demo mode, just remove from state
    if (isDemoMode) {
      setResults(results.filter(r => r.id !== resultId));
      enqueueSnackbar('Result removed successfully', { variant: 'success' });
      return;
    }
    
    try {
      await axios.delete(`/api/confidence-intervals/results/${resultId}/`);
      setResults(results.filter(r => r.id !== resultId));
      enqueueSnackbar('Result removed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error removing result:', error);
      enqueueSnackbar('Failed to remove result', { variant: 'error' });
    }
  };

  // Render the current calculator component
  const renderCalculator = () => {
    if (!selectedProject) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          Please select or create a project to start calculations.
        </Alert>
      );
    }

    const CalculatorComponent = calculatorTypes[activeTab].component;
    
    return (
      <CalculatorComponent 
        project={selectedProject}
        projectData={projectData}
        onSaveResult={handleSaveResult}
      />
    );
  };

  // Display recent results
  const renderRecentResults = () => {
    if (results.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
          No calculations performed yet.
        </Typography>
      );
    }

    // Only show the 5 most recent results
    const recentResults = results.slice(0, 5);
    
    return (
      <Box>
        {recentResults.map((result) => {
          // Handle different result structures (API vs demo)
          const confidenceLevel = result.confidence_level || result.result?.confidence_level || 0.95;
          const lowerBound = result.lower_bound ?? result.result?.lower ?? result.lower;
          const upperBound = result.upper_bound ?? result.result?.upper ?? result.upper;
          const pointEstimate = result.point_estimate ?? result.result?.mean ?? result.result?.proportion ?? result.result?.statistic;
          const method = result.method || result.interval_type || 'Unknown';
          
          return (
            <Paper 
              key={result.id} 
              elevation={2} 
              sx={{ p: 2, mb: 2, position: 'relative' }}
            >
              <Typography variant="subtitle2" gutterBottom>
                {method} - {result.data_name || 'Unnamed Data'}
              </Typography>
              
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={12}>
                  <Chip 
                    size="small" 
                    label={`${(confidenceLevel * 100)}% CI`} 
                    color="primary" 
                    variant="outlined" 
                  />
                </Grid>
                <Grid item xs={12}>
                  {pointEstimate !== undefined && (
                    <Typography variant="body2">
                      Point Estimate: {typeof pointEstimate === 'number' ? pointEstimate.toFixed(4) : pointEstimate}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    CI: [{typeof lowerBound === 'number' ? lowerBound.toFixed(4) : lowerBound}, {typeof upperBound === 'number' ? upperBound.toFixed(4) : upperBound}]
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(result.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    size="small" 
                    color="error" 
                    variant="text" 
                    onClick={() => handleRemoveResult(result.id)}
                    fullWidth
                  >
                    Remove
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          );
        })}
      </Box>
    );
  };

  // Helper function to get a readable label for interval types
  const getIntervalTypeLabel = (type) => {
    const labels = {
      'MEAN_Z': 'Mean (Known Variance)',
      'MEAN_T': 'Mean (Unknown Variance)',
      'PROPORTION_WALD': 'Proportion (Wald)',
      'PROPORTION_WILSON': 'Proportion (Wilson)',
      'PROPORTION_CLOPPER_PEARSON': 'Proportion (Clopper-Pearson)',
      'VARIANCE': 'Variance/Std Deviation',
      'DIFFERENCE_MEANS': 'Difference in Means',
      'DIFFERENCE_PROPORTIONS': 'Difference in Proportions',
      'BOOTSTRAP_SINGLE': 'Bootstrap',
      'BOOTSTRAP_DIFFERENCE': 'Bootstrap Difference',
      'BAYESIAN_MEAN': 'Bayesian Mean',
      'BAYESIAN_PROPORTION': 'Bayesian Proportion'
    };
    
    return labels[type] || type;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Confidence Interval Calculators
      </Typography>
      
      <Typography paragraph>
        Use these calculators to compute confidence intervals for various parameters
        using different statistical methods. Choose the calculator type that best suits
        your data and analysis requirements.
      </Typography>
      
      {/* Project Selection */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="project-select-label">Project</InputLabel>
              <Select
                labelId="project-select-label"
                value={selectedProject?.id || ''}
                label="Project"
                onChange={handleProjectChange}
                disabled={!Array.isArray(projects) || projects.length === 0}
              >
                {Array.isArray(projects) && projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            {selectedProject && (
              <Typography variant="body2" color="textSecondary">
                {selectedProject.description || 'No description'}
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Calculator Section */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 0 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="calculator type tabs"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              {calculatorTypes.map((type, index) => (
                <Tab key={index} label={type.label} />
              ))}
            </Tabs>
            
            <Box sx={{ p: 3 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                renderCalculator()
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Results Section */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Calculations
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={30} />
              </Box>
            ) : (
              renderRecentResults()
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CalculatorDashboard;