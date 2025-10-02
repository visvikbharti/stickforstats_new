import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box, Typography, Container, Paper, Button } from '@mui/material';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import apiConfig from '../../config/apiConfig';

// Import sub-components
import TheoryFoundations from './education/TheoryFoundations';
import InteractiveSimulations from './simulations/InteractiveSimulations';
import AdvancedMethods from './education/AdvancedMethods';
import RealWorldApplications from './education/RealWorldApplications';
// import MathematicalProofs from './education/MathematicalProofs';
import References from './education/References';
import CalculatorDashboard from './calculators/CalculatorDashboard';
import AdvancedConfidenceIntervals from './AdvancedConfidenceIntervals';
import EducationalBanner from '../education/EducationalBanner';

// Import styles and utility components
import { styled } from '@mui/material/styles';
import { useSnackbar } from 'notistack';

const StyledContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

/**
 * Main component for the Confidence Intervals module
 */
const ConfidenceIntervalsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Define the tabs for the module
  const tabs = React.useMemo(() => [
    { label: 'Overview', path: '' },
    { label: 'Calculators', path: 'calculators' },
    { label: 'Advanced Analysis', path: 'advanced-analysis' },
    { label: 'Theory & Foundations', path: 'theory' },
    { label: 'Interactive Simulations', path: 'simulations' },
    { label: 'Advanced Methods', path: 'advanced' },
    { label: 'Real-World Applications', path: 'applications' },
    { label: 'Mathematical Proofs', path: 'proofs' },
    { label: 'References', path: 'references' },
  ], []);

  // Set active tab based on current path
  useEffect(() => {
    const currentPath = location.pathname.split('/').pop();
    const tabIndex = tabs.findIndex(tab => 
      tab.path === currentPath || 
      (currentPath === 'confidence-intervals' && tab.path === '')
    );
    setActiveTab(tabIndex !== -1 ? tabIndex : 0);
  }, [location.pathname, tabs]);

  // Removed project fetching - backend endpoint doesn't exist
  // Users can directly use calculators without creating projects

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    navigate(`/confidence-intervals/${tabs[newValue].path}`);
  };

  // Navigate to calculators (removed project creation - backend endpoint doesn't exist)
  const handleCreateProject = () => {
    navigate('/confidence-intervals/calculators');
    enqueueSnackbar('Opening Confidence Interval Calculators', { variant: 'info' });
  };

  return (
    <StyledContainer maxWidth="lg">
      <StyledPaper elevation={3}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Confidence Intervals
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom align="center">
          Explore the theory, calculation, and application of confidence intervals in statistics
        </Typography>
      </StyledPaper>

      {/* Educational Banner - Show on Overview tab */}
      {activeTab === 0 && (
        <EducationalBanner module="ci" variant="default" dismissible={true} />
      )}

      <StyledPaper elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="confidence intervals navigation tabs"
          >
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab.label} />
            ))}
          </Tabs>
        </Box>
        
        <Box sx={{ p: 3 }}>
          <Routes>
            <Route path="" element={<Overview onCreateProject={handleCreateProject} />} />
            <Route path="calculators" element={<CalculatorDashboard projects={projects} />} />
            <Route path="advanced-analysis" element={<AdvancedConfidenceIntervals />} />
            <Route path="theory" element={<TheoryFoundations />} />
            <Route path="simulations" element={<InteractiveSimulations projects={projects} />} />
            <Route path="advanced" element={<AdvancedMethods />} />
            <Route path="applications" element={<RealWorldApplications />} />
            {/* <Route path="proofs" element={<MathematicalProofs />} /> */}
            <Route path="references" element={<References />} />
          </Routes>
        </Box>
      </StyledPaper>
    </StyledContainer>
  );
};

// Overview component shown on the main tab
const Overview = ({ onCreateProject }) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Welcome to the Confidence Intervals Module
      </Typography>
      
      <Typography paragraph>
        Confidence intervals are a fundamental concept in statistical inference that provide a range of 
        plausible values for an unknown population parameter. This module provides a comprehensive 
        exploration of confidence intervals, from basic theory to advanced applications.
      </Typography>
      
      <Typography paragraph>
        You can explore theoretical foundations, try out interactive simulations, perform calculations 
        for various types of confidence intervals, and see real-world applications.
      </Typography>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        What You'll Learn:
      </Typography>
      
      <ul>
        <li>
          <Typography>The conceptual meaning and interpretation of confidence intervals</Typography>
        </li>
        <li>
          <Typography>How to calculate confidence intervals for means, proportions, and variances</Typography>
        </li>
        <li>
          <Typography>Bootstrap and other resampling methods for constructing intervals</Typography>
        </li>
        <li>
          <Typography>The relationship between confidence intervals and hypothesis testing</Typography>
        </li>
        <li>
          <Typography>Applications of confidence intervals in real-world data analysis</Typography>
        </li>
      </ul>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={onCreateProject}
          size="large"
        >
          Start Calculating
        </Button>

        <Typography variant="body2" sx={{ mt: 1 }}>
          Begin calculating confidence intervals with our professional calculators
        </Typography>
      </Box>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          How to Use This Module:
        </Typography>
        
        <ol>
          <li>
            <Typography>
              <strong>Theory & Foundations</strong>: Start here to understand the basic concepts
            </Typography>
          </li>
          <li>
            <Typography>
              <strong>Calculators</strong>: Perform confidence interval calculations on your data
            </Typography>
          </li>
          <li>
            <Typography>
              <strong>Interactive Simulations</strong>: Visualize how confidence intervals work
            </Typography>
          </li>
          <li>
            <Typography>
              <strong>Advanced Methods</strong>: Explore bootstrap and Bayesian methods
            </Typography>
          </li>
          <li>
            <Typography>
              <strong>Real-World Applications</strong>: See how confidence intervals are used in practice
            </Typography>
          </li>
        </ol>
      </Box>
    </Box>
  );
};

export default ConfidenceIntervalsPage;