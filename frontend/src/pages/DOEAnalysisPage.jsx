import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Box, 
  Tabs, 
  Tab, 
  Stepper, 
  Step, 
  StepLabel, 
  CircularProgress
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';

// Import components
import Introduction from '../components/doe/Introduction';
import Fundamentals from '../components/doe/Fundamentals';
import DesignTypes from '../components/doe/DesignTypes';
import DesignBuilder from '../components/doe/DesignBuilder';
import Analysis from '../components/doe/Analysis';
import EducationalBanner from '../components/education/EducationalBanner';

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`doe-tabpanel-${index}`}
      aria-labelledby={`doe-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function DOEAnalysisPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [experimentConfig, setExperimentConfig] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDesignCreation = (config) => {
    setExperimentConfig(config);
    // In a real implementation, this would call an API to create the design
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Move to Analysis tab after design creation
      setActiveTab(4);
    }, 1500);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Design of Experiments (DOE) Analysis
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Efficiently design and analyze experiments to optimize processes and products
        </Typography>
      </Box>

      {/* Educational Banner - Show on Introduction tab */}
      {activeTab === 0 && (
        <EducationalBanner module="doe" variant="default" dismissible={true} />
      )}

      <Paper sx={{ width: '100%', bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          aria-label="DOE analysis tabs"
        >
          <Tab label="Introduction" icon={<ScienceIcon />} iconPosition="start" />
          <Tab label="Fundamentals" />
          <Tab label="Design Types" />
          <Tab label="Design Builder" />
          <Tab label="Analysis" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Introduction />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Fundamentals />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <DesignTypes onSelectDesign={() => setActiveTab(3)} />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <DesignBuilder 
            onCreateDesign={handleDesignCreation} 
          />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Analysis 
              experimentConfig={experimentConfig}
              analysisResults={analysisResults}
              content={{
                introduction: "Design of Experiments (DOE) is a systematic approach for determining the relationship between factors affecting a process and the output of that process. This analysis helps identify which process variables have the greatest impact on performance, and optimize these variables to achieve the best results."
              }}
            />
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
}

export default DOEAnalysisPage;