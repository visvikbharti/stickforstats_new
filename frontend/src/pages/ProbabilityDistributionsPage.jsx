import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Box, 
  Tabs, 
  Tab, 
  CircularProgress
} from '@mui/material';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';

// Import API and preload functions
import { getDistributionData, calculateProbability } from '../api/probabilityDistributionsApi';
import { preloadProbabilityCalculator, preloadPopularSimulations, preloadBasedOnRoute } from '../components/probability_distributions/preload';

// Import lightweight components directly
import DistributionSelector from '../components/probability_distributions/DistributionSelector';
import DistributionParameters from '../components/probability_distributions/DistributionParameters';
import DistributionPlot from '../components/probability_distributions/DistributionPlot';
import SaveDistributionDialog from '../components/probability_distributions/SaveDistributionDialog';
import EducationalBanner from '../components/education/EducationalBanner';

// Lazy load heavier components
const ProbabilityCalculator = lazy(() => import('../components/probability_distributions/ProbabilityCalculator'));
const RandomSampleGenerator = lazy(() => import('../components/probability_distributions/RandomSampleGenerator'));
const BinomialApproximation = lazy(() => import('../components/probability_distributions/BinomialApproximation'));
const DataFitting = lazy(() => import('../components/probability_distributions/DataFitting'));
const DistributionComparison = lazy(() => import('../components/probability_distributions/DistributionComparison'));
const LazyApplicationSimulations = lazy(() => import('../components/probability_distributions/LazyApplicationSimulations'));
const EducationalContent = lazy(() => import('../components/probability_distributions/EducationalContent'));
const ImageOptimizationDemo = lazy(() => import('../components/probability_distributions/ImageOptimizationDemo'));
const AdvancedProbabilityDistributions = lazy(() => import('../components/probability_distributions/AdvancedProbabilityDistributions'));

const tabsConfig = [
  { label: "Distribution Viewer", path: "" },
  { label: "Advanced Explorer", path: "advanced-explorer" },
  { label: "Probability Calculator", path: "calculator" },
  { label: "Random Samples", path: "random-samples" },
  { label: "Data Fitting", path: "data-fitting" },
  { label: "Distribution Comparison", path: "comparison" },
  { label: "Applications", path: "applications" },
  { label: "Learn", path: "learn" },
  { label: "Image Demo", path: "image-demo" },
];

function ProbabilityDistributionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDistribution, setSelectedDistribution] = useState('normal');
  const [parameters, setParameters] = useState({ mean: 0, std: 1 });
  const [plotData, setPlotData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Determine the active tab based on the current path and preload components
  useEffect(() => {
    const currentPath = location.pathname.split('/probability-distributions/')[1] || '';
    const tabIndex = tabsConfig.findIndex(tab => tab.path === currentPath);
    if (tabIndex >= 0) {
      setActiveTab(tabIndex);
    }
    
    // Preload components based on the current route
    preloadBasedOnRoute(location.pathname);
  }, [location.pathname]);
  
  // Preload important components after initial render
  useEffect(() => {
    // Preload frequently used components after the main page has loaded
    preloadProbabilityCalculator();
    preloadPopularSimulations();
  }, []);

  // Load distribution data
  useEffect(() => {
    const loadDistributionData = async () => {
      setIsLoading(true);
      try {
        const data = await getDistributionData(selectedDistribution, parameters);
        setPlotData(data);
      } catch (error) {
        console.error('Error loading distribution data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDistributionData();
  }, [selectedDistribution, parameters]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    navigate(`/probability-distributions/${tabsConfig[newValue].path}`);
  };

  // Handle distribution selection
  const handleDistributionChange = (newDistribution) => {
    // ROBUST: Handle both string values and event objects from different components
    const distribution = typeof newDistribution === 'string'
      ? newDistribution.toLowerCase()
      : newDistribution?.target?.value?.toLowerCase() || 'normal';

    setSelectedDistribution(distribution);

    // Set default parameters based on distribution type
    switch (distribution) {
      case 'normal':
        setParameters({ mean: 0, std: 1 });
        break;
      case 'uniform':
        setParameters({ a: 0, b: 1 });
        break;
      case 'binomial':
        setParameters({ n: 10, p: 0.5 });
        break;
      case 'poisson':
        setParameters({ lambda: 5 });
        break;
      case 'exponential':
        setParameters({ rate: 1 });
        break;
      case 'gamma':
        setParameters({ shape: 2, scale: 2 });
        break;
      case 'beta':
        setParameters({ alpha: 2, beta: 2 });
        break;
      case 'lognormal':
        setParameters({ mean: 0, sigma: 1 });
        break;
      case 'weibull':
        setParameters({ shape: 1.5, scale: 1 });
        break;
      case 'geometric':
        setParameters({ p: 0.5 });
        break;
      case 'negativebinomial':
        setParameters({ r: 5, p: 0.5 });
        break;
      case 'hypergeometric':
        setParameters({ N: 50, K: 20, n: 10 });
        break;
      default:
        setParameters({ mean: 0, std: 1 });
    }
  };

  // Handle parameter changes
  const handleParameterChange = (newParameters) => {
    setParameters({ ...parameters, ...newParameters });
  };

  // Calculate probability
  const handleCalculateProbability = async (lowerBound, upperBound, probabilityType) => {
    try {
      return await calculateProbability(
        selectedDistribution, 
        parameters, 
        lowerBound, 
        upperBound, 
        probabilityType
      );
    } catch (error) {
      console.error('Error calculating probability:', error);
      return null;
    }
  };

  // Save distribution configuration
  const handleSaveDistribution = () => {
    setSaveDialogOpen(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Probability Distributions Explorer
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Visualize, analyze, and understand probability distributions with interactive tools
        </Typography>
      </Box>

      {/* Educational Banner - Show on Distribution Viewer tab */}
      {activeTab === 0 && (
        <EducationalBanner module="probability" variant="default" dismissible={true} />
      )}

      <Paper sx={{ width: '100%', bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          aria-label="probability distributions tabs"
        >
          {tabsConfig.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Loading component for lazy-loaded components */}
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={50} />
            </Box>
          }>
            <Routes>
              <Route path="/" element={
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <DistributionSelector 
                      selected={selectedDistribution}
                      onChange={handleDistributionChange}
                    />
                    <Box sx={{ mt: 3 }}>
                      <DistributionParameters
                        distribution={selectedDistribution}
                        parameters={parameters}
                        onChange={handleParameterChange}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    {isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <DistributionPlot 
                        distribution={selectedDistribution}
                        parameters={parameters}
                        plotData={plotData}
                        onSave={handleSaveDistribution}
                      />
                    )}
                  </Grid>
                </Grid>
              } />
              
              {/* Lazy-loaded components */}
              <Route path="/advanced-explorer" element={
                <AdvancedProbabilityDistributions />
              } />
              
              <Route path="/calculator" element={
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    {/* SINGLE unified distribution selector with parameters */}
                    <DistributionParameters
                      distributionType={(selectedDistribution || 'normal').toUpperCase()}
                      parameters={parameters}
                      onParameterChange={handleParameterChange}
                      onChange={handleDistributionChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={9}>
                    <ProbabilityCalculator
                      distributionType={(selectedDistribution || 'normal').toUpperCase()}
                      parameters={parameters}
                      onCalculate={handleCalculateProbability}
                      plotData={plotData}
                    />
                  </Grid>
                </Grid>
              } />
              
              <Route path="/random-samples" element={
                <RandomSampleGenerator
                  distributionType={(selectedDistribution || 'normal').toUpperCase()}
                  parameters={parameters}
                />
              } />
              
              <Route path="/data-fitting" element={
                <DataFitting />
              } />
              
              <Route path="/comparison" element={
                <DistributionComparison />
              } />
              
              <Route path="/applications" element={
                <LazyApplicationSimulations />
              } />
              
              <Route path="/learn" element={
                <EducationalContent distribution={selectedDistribution} />
              } />
              
              <Route path="/image-demo" element={
                <ImageOptimizationDemo />
              } />
            </Routes>
          </Suspense>
        </Box>
      </Paper>

      {/* Save Dialog */}
      <SaveDistributionDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        distribution={selectedDistribution}
        parameters={parameters}
      />
    </Container>
  );
}

export default ProbabilityDistributionsPage;