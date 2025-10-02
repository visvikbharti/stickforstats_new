import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  Button, 
  Divider,
  Alert,
  useTheme,
  useMediaQuery 
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import SaveIcon from '@mui/icons-material/Save';
import CalculateIcon from '@mui/icons-material/Calculate';
import SchoolIcon from '@mui/icons-material/School';
import FunctionsIcon from '@mui/icons-material/Functions';
import ChartIcon from '@mui/icons-material/ShowChart';
import CompareIcon from '@mui/icons-material/Compare';
import AppIcon from '@mui/icons-material/Apps';

import DistributionSelector from './DistributionSelector';
import DistributionParameters from './DistributionParameters';
import DistributionPlot from './DistributionPlot';
import ProbabilityCalculator from './ProbabilityCalculator';
import RandomSampleGenerator from './RandomSampleGenerator';
import BinomialApproximation from './BinomialApproximation';
import DataFitting from './DataFitting';
import ApplicationSimulations from './ApplicationSimulations';
import EducationalContent from './EducationalContent';
import SaveDistributionDialog from './SaveDistributionDialog';
import DistributionComparison from './DistributionComparison';
import AdvancedProbabilityDistributions from './AdvancedProbabilityDistributions';

import { fetchDistributionProject, fetchDistribution, createDistributionProject } from '../../api/probabilityDistributionsApi';
import { useErrorHandler } from '../../utils/errorHandlers';

/**
 * Main component for the Probability Distributions page
 * Integrates all distribution-related components and functionality
 */
const ProbabilityDistributionsPage = () => {
  const { projectId, distributionId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleError = useErrorHandler();
  
  // Tab configuration
  const tabs = useMemo(() => [
    { label: 'Introduction', icon: <SchoolIcon />, value: 0 },
    { label: 'Distributions', icon: <FunctionsIcon />, value: 1 },
    { label: 'Advanced Explorer', icon: <ChartIcon />, value: 2 },
    { label: 'Calculator', icon: <CalculateIcon />, value: 3 },
    { label: 'Approximations', icon: <CompareIcon />, value: 4 },
    { label: 'Applications', icon: <AppIcon />, value: 5 },
  ], []);
  
  // State
  const [activeTab, setActiveTab] = useState(1); // Default to Distributions tab
  const [project, setProject] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [distributionType, setDistributionType] = useState('NORMAL');
  const [parameters, setParameters] = useState({
    mean: 0,
    std: 1
  });
  const [plotConfig, setPlotConfig] = useState({
    width: isMobile ? 350 : 800,
    height: 400,
    showPdf: true,
    showCdf: false,
    fillArea: false,
    fillRange: [null, null],
    showGrid: true,
    margin: { top: 30, right: 30, bottom: 50, left: 60 }
  });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Handle window resize for plot width
  useEffect(() => {
    setPlotConfig(prev => ({
      ...prev,
      width: isMobile ? 350 : 800,
    }));
  }, [isMobile]);
  
  // Load project data if projectId is provided
  useEffect(() => {
    const loadProject = async () => {
      if (projectId) {
        setLoading(true);
        try {
          const data = await fetchDistributionProject(projectId);
          setProject(data);
        } catch (error) {
          handleError(error, {
            onServerError: () => setError('Server error loading project. Please try again later.'),
            onNetworkError: () => setError('Network error. Please check your connection.'),
            onOtherError: () => setError('Error loading project data')
          });
        } finally {
          setLoading(false);
        }
      } else {
        // Create a temporary session without server interaction for simplified use
        setProject({
          id: 'temp',
          name: 'Interactive Session',
          description: 'Temporary session for distribution analysis'
        });
        setLoading(false);
      }
    };
    
    loadProject();
  }, [projectId, handleError]);

  // Load distribution data if distributionId is provided
  useEffect(() => {
    const loadDistribution = async () => {
      if (distributionId) {
        setLoading(true);
        try {
          const data = await fetchDistribution(distributionId);
          setDistribution(data);
          setDistributionType(data.distribution_type || 'NORMAL');
          setParameters(data.parameters || { mean: 0, std: 1 });
        } catch (error) {
          handleError(error, {
            onServerError: () => setError('Server error loading distribution. Please try again later.'),
            onNetworkError: () => setError('Network error. Please check your connection.'),
            onOtherError: () => setError('Error loading distribution data')
          });
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadDistribution();
  }, [distributionId, handleError]);
  
  // Handle distribution type and parameters change
  const handleDistributionChange = (newParams, newType) => {
    setDistributionType(newType);
    setParameters(newParams);
    
    // Update plot configuration based on distribution type
    if (newType === 'NORMAL') {
      setPlotConfig(prev => ({
        ...prev,
        showPdf: true,
        fillArea: false
      }));
    } else {
      setPlotConfig(prev => ({
        ...prev,
        showPdf: true,
        fillArea: false
      }));
    }
  };
  
  // Handle individual parameter changes
  const handleParameterChange = (paramName, value) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  // Handle plot configuration changes
  const handlePlotConfigChange = (name, value) => {
    setPlotConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle save dialog
  const handleSaveClick = () => {
    setSaveDialogOpen(true);
  };
  
  const handleSaveDialogClose = () => {
    setSaveDialogOpen(false);
  };
  
  // Handle probability area selection
  const handleProbabilityAreaChange = (range) => {
    setPlotConfig(prev => ({
      ...prev,
      fillArea: true,
      fillRange: range
    }));
  };
  
  // Handle calculation complete callback from DistributionPlot
  const handleCalculationComplete = (data) => {
    // Can be used for additional callbacks/actions when calculation completes
    console.log('Distribution calculation complete:', data);
  };
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Introduction
        return (
          <EducationalContent 
            distributionType={distributionType}
          />
        );
        
      case 1: // Distributions (Main visualization)
        return (
          <Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              <Box sx={{ width: { xs: '100%', md: '30%' } }}>
                <DistributionParameters 
                  distributionType={distributionType}
                  parameters={parameters}
                  onParameterChange={handleParameterChange}
                  onChange={handleDistributionChange}
                />
              </Box>
              
              <Box sx={{ width: { xs: '100%', md: '70%' } }}>
                <DistributionPlot 
                  type={distributionType.toLowerCase()}
                  parameters={distributionType === 'NORMAL' 
                    ? { mean: parameters.mean, sd: parameters.std }
                    : parameters
                  }
                  plotConfig={plotConfig}
                  onCalculationComplete={handleCalculationComplete}
                />
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<SaveIcon />}
                    onClick={handleSaveClick}
                  >
                    Save Distribution
                  </Button>
                </Box>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box>
              <Typography variant="h6" gutterBottom>
                Compare with Other Distributions
              </Typography>
              <DistributionComparison 
                primaryDistribution={{
                  type: distributionType,
                  parameters
                }}
              />
            </Box>
          </Box>
        );
        
      case 2: // Advanced Explorer
        return (
          <AdvancedProbabilityDistributions />
        );
        
      case 3: // Calculator
        return (
          <ProbabilityCalculator 
            distributionType={distributionType}
            parameters={parameters}
            onAreaSelect={handleProbabilityAreaChange}
          />
        );
        
      case 4: // Approximations
        return (
          <BinomialApproximation 
            initialParameters={{
              n: 100,
              p: 0.3
            }}
          />
        );
        
      case 5: // Applications
        return (
          <ApplicationSimulations 
            distributionType={distributionType}
            parameters={parameters}
          />
        );
      
      default:
        return <Box>Select a tab to continue</Box>;
    }
  };
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Probability Distributions Explorer
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom align="center">
          Interactive visualization and exploration of key probability distributions
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {tabs.map(tab => (
              <Tab 
                key={tab.value}
                label={tab.label} 
                icon={tab.icon} 
                iconPosition="start"
                sx={{ 
                  minHeight: 64,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                }}
              />
            ))}
          </Tabs>
          
          <Box sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography>Loading...</Typography>
              </Box>
            ) : (
              renderTabContent()
            )}
          </Box>
        </Paper>
      </Box>
      
      <SaveDistributionDialog 
        open={saveDialogOpen}
        onClose={handleSaveDialogClose}
        projectId={projectId}
        distributionType={distributionType}
        parameters={parameters}
      />
    </Container>
  );
};

export default ProbabilityDistributionsPage;