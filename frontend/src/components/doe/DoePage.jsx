import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SchoolIcon from '@mui/icons-material/School';
import CategoryIcon from '@mui/icons-material/Category';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CasesIcon from '@mui/icons-material/Cases';
import BuildIcon from '@mui/icons-material/Build';

import Introduction from './Introduction';
import Fundamentals from './Fundamentals';
import DesignTypes from './DesignTypes';
import Analysis from './Analysis';
import CaseStudies from './CaseStudies';
import DesignBuilder from './DesignBuilder';
import ResponsiveDoePage from './utils/ResponsiveDoePage';
import { useIsMobile } from './utils/ResponsiveUtils';

import authService from '../../services/authService';
import contentService from '../../services/contentService';

/**
 * DoePage - Main component for the Design of Experiments module
 * 
 * This component serves as the container for the DOE module and handles tab navigation
 * and data loading. It preserves the educational structure of the original Streamlit app
 * while providing a responsive interface.
 */
function DoePage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = useIsMobile();

  // Load user and educational content on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const userData = await authService.getCurrentUser();
        const educationalContent = await contentService.getContent('doe');
        
        setUser(userData);
        setContent(educationalContent);
        setLoading(false);
      } catch (err) {
        console.error('Error loading DOE module data:', err);
        setError('Failed to load content. Please try again later.');
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // Define tabs with icons for navigation
  const tabs = [
    { label: "Introduction", icon: <InfoIcon /> },
    { label: "Fundamental Concepts", icon: <SchoolIcon /> },
    { label: "Design Types", icon: <CategoryIcon /> },
    { label: "Analysis & Interpretation", icon: <AssessmentIcon /> },
    { label: "Case Studies", icon: <CasesIcon /> },
    { label: "Design Builder", icon: <BuildIcon /> }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading DOE Module...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Get current tab content
  const getTabContent = () => {
    switch (tabIndex) {
      case 0:
        return <Introduction content={content?.introduction} />;
      case 1:
        return <Fundamentals content={content?.fundamentals} />;
      case 2:
        return <DesignTypes content={content?.designTypes} />;
      case 3:
        return <Analysis content={content?.analysis} />;
      case 4:
        return <CaseStudies content={content?.caseStudies} />;
      case 5:
        return <DesignBuilder />;
      default:
        return <Introduction content={content?.introduction} />;
    }
  };

  return (
    <ResponsiveDoePage
      tabs={tabs}
      activeTab={tabIndex}
      onTabChange={handleTabChange}
      title="Design of Experiments (DOE)"
    >
      {/* Mobile header is simplified for space */}
      {isMobile ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            {tabs[tabIndex].label}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Design of Experiments (DOE) in Biotechnology
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            A systematic approach for determining cause-and-effect relationships in complex biological systems
          </Typography>
        </Box>
      )}

      {/* Current Tab Content */}
      {getTabContent()}
      
      {/* Footer */}
      <Box sx={{ mt: 8, mb: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} StickForStats DOE Module
        </Typography>
      </Box>
    </ResponsiveDoePage>
  );
}

export default DoePage;