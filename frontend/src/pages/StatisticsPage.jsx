import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Container, Typography, Grid, Paper, Box } from '@mui/material';
import { PieChart, BarChart, AreaChart, LineChart } from 'recharts';

// Sample pages
import DataUploadPage from './statistics/DataUploadPage';
import DataExplorationPage from './statistics/DataExplorationPage';
import StatisticalTestsPage from './statistics/StatisticalTestsPage';
import AdvancedStatisticalTests from '../components/statistics/AdvancedStatisticalTests';

// Sample data for charts
const data = [
  { name: 'Group A', value: 400 },
  { name: 'Group B', value: 300 },
  { name: 'Group C', value: 300 },
  { name: 'Group D', value: 200 },
];

function StatisticsPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Statistical Analysis Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Left sidebar */}
        <Grid item xs={12} md={3}>
          <Paper 
            elevation={2}
            sx={{ p: 2, display: 'flex', flexDirection: 'column' }}
          >
            <Typography variant="h6" gutterBottom>
              Analysis Tools
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link to="/statistics/upload">Data Upload</Link>
              <Link to="/statistics/exploration">Data Exploration</Link>
              <Link to="/statistics/tests">Statistical Tests</Link>
              <Link to="/statistics/advanced-tests">Advanced Tests</Link>
              <Link to="/probability-distributions">Probability Distributions</Link>
              <Link to="/confidence-intervals">Confidence Intervals</Link>
              <Link to="/doe-analysis">DOE Analysis</Link>
              <Link to="/pca-analysis">PCA Analysis</Link>
              <Link to="/sqc-analysis">SQC Analysis</Link>
            </Box>
          </Paper>
        </Grid>
        
        {/* Main content */}
        <Grid item xs={12} md={9}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 'calc(100vh - 200px)'
            }}
          >
            <Routes>
              <Route path="/" element={<StatisticsDashboard />} />
              <Route path="/upload" element={<DataUploadPage />} />
              <Route path="/exploration" element={<DataExplorationPage />} />
              <Route path="/tests" element={<StatisticalTestsPage />} />
              <Route path="/advanced-tests" element={<AdvancedStatisticalTests />} />
            </Routes>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

function StatisticsDashboard() {
  return (
    <>
      <Typography variant="h5" gutterBottom>
        Welcome to Statistical Analysis
      </Typography>
      <Typography variant="body1" paragraph>
        Select a tool from the sidebar to begin your analysis. You can upload data,
        explore it with visualizations, or perform advanced statistical tests.
      </Typography>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Recent Analysis
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Paper 
            elevation={1}
            sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <Typography variant="subtitle1">Sample Distribution</Typography>
            <BarChart width={300} height={200} data={data}>
              {/* Chart components would be here in a real implementation */}
            </BarChart>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper 
            elevation={1}
            sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <Typography variant="subtitle1">Data Comparison</Typography>
            <PieChart width={300} height={200}>
              {/* Chart components would be here in a real implementation */}
            </PieChart>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}

export default StatisticsPage;