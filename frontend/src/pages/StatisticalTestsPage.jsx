/**
 * Statistical Tests Page
 * ======================
 * Central hub for all statistical tests with 50 decimal precision
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Breadcrumbs,
  Link,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Alert
} from '@mui/material';

import {
  Functions as FunctionsIcon,
  Timeline as TimelineIcon,
  ScatterPlot as ScatterPlotIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  Assessment as AssessmentIcon,
  NavigateNext as NavigateNextIcon,
  Science as ScienceIcon
} from '@mui/icons-material';

// Import statistical components
import TTestCalculator from '../components/statistical/TTestCalculator';
import ANOVACalculator from '../components/statistical/ANOVACalculator';
import RegressionCalculator from '../components/statistical/RegressionCalculator';
import CorrelationCalculator from '../components/statistical/CorrelationCalculator';
import NonParametricTests from '../components/statistical/NonParametricTests';
import CategoricalTests from '../components/statistical/CategoricalTests';

const StatisticalTestsPage = () => {
  const [selectedTest, setSelectedTest] = useState('ttest');
  const [drawerOpen, setDrawerOpen] = useState(true);

  const testCategories = [
    {
      category: 'Parametric Tests',
      tests: [
        { id: 'ttest', name: 'T-Test', icon: <FunctionsIcon />, available: true },
        { id: 'anova', name: 'ANOVA', icon: <BarChartIcon />, available: true },
        { id: 'regression', name: 'Regression', icon: <TimelineIcon />, available: true },
        { id: 'correlation', name: 'Correlation', icon: <ScatterPlotIcon />, available: true }
      ]
    },
    {
      category: 'Non-Parametric Tests',
      tests: [
        { id: 'nonparametric', name: 'Non-Parametric Tests', icon: <ShowChartIcon />, available: true }
      ]
    },
    {
      category: 'Categorical Tests',
      tests: [
        { id: 'categorical', name: 'Categorical Tests', icon: <AssessmentIcon />, available: true }
      ]
    }
  ];

  const renderTestComponent = () => {
    switch (selectedTest) {
      case 'ttest':
        return <TTestCalculator />;
      case 'anova':
        return <ANOVACalculator />;
      case 'regression':
        return <RegressionCalculator />;
      case 'correlation':
        return <CorrelationCalculator />;
      case 'nonparametric':
        return <NonParametricTests />;
      case 'categorical':
        return <CategoricalTests />;
      default:
        return (
          <Alert severity="info">
            This statistical test is under development. Please check back soon!
          </Alert>
        );
    }
  };

  const drawerWidth = 280;

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar Navigation */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            position: 'relative',
            height: 'auto',
            minHeight: '100vh'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Statistical Tests
          </Typography>
          <Chip
            label="50 Decimal Precision"
            color="primary"
            size="small"
            sx={{ mb: 2 }}
          />
        </Box>

        <Divider />

        <List>
          {testCategories.map((category) => (
            <Box key={category.category}>
              <ListItem>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {category.category}
                </Typography>
              </ListItem>
              {category.tests.map((test) => (
                <ListItemButton
                  key={test.id}
                  selected={selectedTest === test.id}
                  onClick={() => test.available && setSelectedTest(test.id)}
                  disabled={!test.available}
                  sx={{ pl: 3 }}
                >
                  <ListItemIcon>{test.icon}</ListItemIcon>
                  <ListItemText
                    primary={test.name}
                    secondary={!test.available ? 'Coming soon' : null}
                  />
                  {test.available && selectedTest === test.id && (
                    <Chip label="Active" size="small" color="primary" />
                  )}
                </ListItemButton>
              ))}
              <Divider sx={{ my: 1 }} />
            </Box>
          ))}
        </List>

        <Box sx={{ p: 2, mt: 'auto' }}>
          <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
            <strong>Scientific Integrity</strong>
            <br />
            All calculations maintain 50 decimal precision for publication-ready results.
          </Alert>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)`,
          transition: 'width 0.3s'
        }}
      >
        <Container maxWidth="xl">
          {/* Breadcrumbs */}
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
            <Link underline="hover" color="inherit" href="/">
              Home
            </Link>
            <Link underline="hover" color="inherit" href="/statistical-analysis">
              Statistical Analysis
            </Link>
            <Typography color="text.primary">
              {testCategories
                .flatMap(c => c.tests)
                .find(t => t.id === selectedTest)?.name || 'Test'}
            </Typography>
          </Breadcrumbs>

          {/* Test Component */}
          {renderTestComponent()}

          {/* Info Cards */}
          <Grid container spacing={3} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Ultra-High Precision
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All calculations are performed with 50 decimal places of precision,
                    far exceeding the capabilities of traditional statistical software.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Automatic Guidance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Built-in assumption checking and intelligent test selection help
                    ensure you're using the right test for your data.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Publication Ready
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Export results in APA format with complete statistical reporting
                    suitable for academic publications and research papers.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Toggle Drawer Button */}
      <Button
        onClick={() => setDrawerOpen(!drawerOpen)}
        sx={{
          position: 'fixed',
          left: drawerOpen ? drawerWidth - 30 : -10,
          top: '50%',
          transform: 'translateY(-50%)',
          minWidth: '40px',
          width: '40px',
          height: '80px',
          borderRadius: '0 20px 20px 0',
          bgcolor: 'primary.main',
          color: 'white',
          '&:hover': {
            bgcolor: 'primary.dark'
          },
          transition: 'left 0.3s',
          zIndex: 1300
        }}
      >
        {drawerOpen ? '◀' : '▶'}
      </Button>
    </Box>
  );
};

export default StatisticalTestsPage;