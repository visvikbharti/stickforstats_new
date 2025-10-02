import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import CoverageSimulation from './CoverageSimulation';
import SampleSizeSimulation from './SampleSizeSimulation';
import BootstrapSimulation from './BootstrapSimulation';
import TransformationSimulation from './TransformationSimulation';
import NonNormalitySimulation from './NonNormalitySimulation';

/**
 * Interactive Simulations component for the Confidence Intervals module
 * This component provides a tabbed interface to different simulation types
 */
const InteractiveSimulations = ({ projects = [] }) => {
  const [activeTab, setActiveTab] = useState(0);
  // Removed project-related state - simulations work without projects

  // Define the simulation tabs
  const simulationTabs = [
    { label: 'Coverage Properties', component: CoverageSimulation },
    { label: 'Sample Size Effects', component: SampleSizeSimulation },
    { label: 'Bootstrap Methods', component: BootstrapSimulation },
    { label: 'Transformations', component: TransformationSimulation },
    { label: 'Non-normality Impact', component: NonNormalitySimulation }
  ];

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Get the current simulation component
  const CurrentSimulation = simulationTabs[activeTab].component;
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Interactive Simulations
      </Typography>
      
      <Typography paragraph>
        These simulations allow you to explore and visualize key properties of confidence intervals
        through interactive experiments. Each simulation focuses on a different aspect of confidence
        intervals to enhance your understanding of statistical inference.
      </Typography>
      
      {/* Project selection removed - simulations work directly without projects */}

      {/* Simulation tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="simulation tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {simulationTabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          <CurrentSimulation />
        </Box>
      </Paper>
      
      {/* Educational context for the current simulation */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          About {simulationTabs[activeTab].label}
        </Typography>
        
        {activeTab === 0 && (
          <Box>
            <Typography paragraph>
              <strong>Coverage Properties</strong> is one of the most important characteristics 
              of confidence intervals. The coverage probability is the proportion of times that 
              the confidence interval contains the true parameter value when the procedure is 
              repeated on multiple samples.
            </Typography>
            <Typography paragraph>
              This simulation allows you to verify whether different confidence interval methods 
              achieve their nominal coverage level (e.g., 95%) under various conditions. For some 
              methods and scenarios, the actual coverage may differ from the nominal level due to 
              approximations or violated assumptions.
            </Typography>
          </Box>
        )}
        
        {activeTab === 1 && (
          <Box>
            <Typography paragraph>
              <strong>Sample Size Effects</strong> demonstrate how the width and coverage of 
              confidence intervals change as the sample size increases. In general, larger samples 
              provide more precise estimates, resulting in narrower confidence intervals.
            </Typography>
            <Typography paragraph>
              This simulation shows that confidence interval width decreases at a rate proportional 
              to 1/√n, where n is the sample size. This means that to halve the width of a confidence 
              interval, you need to quadruple the sample size.
            </Typography>
          </Box>
        )}
        
        {activeTab === 2 && (
          <Box>
            <Typography paragraph>
              <strong>Bootstrap Methods</strong> allow you to construct confidence intervals without 
              making parametric assumptions about the distribution of the data. These methods involve 
              resampling with replacement from the observed data to estimate the sampling distribution 
              of a statistic.
            </Typography>
            <Typography paragraph>
              This simulation lets you compare different bootstrap techniques (percentile, basic, BCa) 
              and see how they perform for various statistics and underlying distributions.
            </Typography>
          </Box>
        )}
        
        {activeTab === 3 && (
          <Box>
            <Typography paragraph>
              <strong>Transformations</strong> can be used to construct confidence intervals for 
              functions of parameters. For example, if you have a confidence interval for a variance 
              σ², you can obtain a confidence interval for the standard deviation σ by taking the 
              square root of each endpoint.
            </Typography>
            <Typography paragraph>
              This simulation explores how transformations affect confidence intervals and demonstrates 
              the relationship between confidence intervals and statistical power for hypothesis tests.
            </Typography>
          </Box>
        )}
        
        {activeTab === 4 && (
          <Box>
            <Typography paragraph>
              <strong>Non-normality Impact</strong> explores how departures from normality affect 
              the performance of confidence intervals. Many standard confidence interval methods assume 
              that the data come from a normal distribution.
            </Typography>
            <Typography paragraph>
              This simulation lets you generate data from various non-normal distributions (skewed, 
              heavy-tailed, etc.) and observe how different interval methods perform in terms of 
              coverage and width.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

InteractiveSimulations.propTypes = {
  projects: PropTypes.array
};

export default InteractiveSimulations;