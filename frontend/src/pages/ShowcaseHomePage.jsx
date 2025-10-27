import React from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Assessment as AssessmentIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  BubbleChart as BubbleChartIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';

import { Alert } from '@mui/material';

const ShowcaseHomePage = () => {
  const modules = [
    {
      id: 'statistical-analysis',
      title: 'Statistical Analysis Center',
      description: 'Statistical analysis tools for data exploration and hypothesis testing (in development).',
      icon: <AssessmentIcon fontSize="large" color="error" />,
      path: '/statistical-analysis-tools',
      features: ['Descriptive Statistics', 'Hypothesis Testing', 'Regression Analysis', 'ANOVA', 'Time Series'],
      status: 'Featured'
    },
    {
      id: 'confidence-intervals',
      title: 'Confidence Intervals',
      description: 'Calculate confidence intervals with multiple methods including bootstrap, Bayesian, and traditional approaches.',
      icon: <CalculateIcon fontSize="large" color="primary" />,
      path: '/confidence-intervals',
      features: ['Sample-based CI', 'Parameter-based CI', 'Bootstrap CI', 'Bayesian CI', 'Difference CI'],
      status: 'Ready'
    },
    {
      id: 'pca-analysis',
      title: 'PCA Analysis',
      description: 'Principal Component Analysis for dimensionality reduction with interactive 3D visualizations.',
      icon: <BubbleChartIcon fontSize="large" color="primary" />,
      path: '/pca-analysis',
      features: ['3D Visualization', 'Scree Plot', 'Loadings Plot', 'Biplot', 'Variance Explained'],
      status: 'Ready'
    },
    {
      id: 'doe-analysis',
      title: 'DOE Analysis',
      description: 'Design of Experiments with factorial designs, response surface methodology, and optimization.',
      icon: <ScienceIcon fontSize="large" color="primary" />,
      path: '/doe-analysis',
      features: ['Factorial Design', 'Response Surface', 'Optimization', 'ANOVA', 'Interaction Plots'],
      status: 'Ready'
    },
    {
      id: 'sqc-analysis',
      title: 'SQC Analysis',
      description: 'Statistical Quality Control with control charts, process capability, and real-time monitoring.',
      icon: <AssessmentIcon fontSize="large" color="primary" />,
      path: '/sqc-analysis',
      features: ['Control Charts', 'Process Capability', 'Out-of-Control Detection', 'Real-time Monitoring'],
      status: 'Ready'
    },
    {
      id: 'probability-distributions',
      title: 'Probability Distributions',
      description: 'Interactive probability distribution calculators with real-world simulations.',
      icon: <TimelineIcon fontSize="large" color="primary" />,
      path: '/probability-distributions',
      features: ['Distribution Calculator', 'Parameter Estimation', 'Simulations', 'Comparisons'],
      status: 'Ready'
    }
  ];

  const platformFeatures = [
    {
      title: 'No Installation Required',
      description: 'Web-based platform accessible from any device',
      icon: <CloudIcon />
    },
    {
      title: 'Open Source',
      description: 'Transparent, verifiable calculations with no hidden algorithms',
      icon: <SpeedIcon />
    },
    {
      title: 'Scientific Integrity',
      description: 'All calculations validated against established statistical methods',
      icon: <StorageIcon />
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          mb: 6
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom align="center">
            StickForStats
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom align="center">
            Professional Statistical Analysis Platform for Researchers
          </Typography>
          <Typography variant="body1" sx={{ mt: 3, mb: 4, maxWidth: 800, mx: 'auto' }} align="center">
            An open-source statistical platform focused on accuracy and transparency.
            Currently featuring confidence intervals with more modules in development.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              component={Link}
              to="/statistical-analysis-tools"
            >
              Start Statistical Analysis
            </Button>
            <Button 
              variant="outlined" 
              sx={{ color: 'white', borderColor: 'white' }}
              size="large"
              href="#modules"
            >
              Explore All Modules
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Platform Features */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Why StickForStats?
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {platformFeatures.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* Statistical Modules */}
      <Container maxWidth="lg" sx={{ mb: 8 }} id="modules">
        <Typography variant="h4" component="h2" align="center" gutterBottom>
          Statistical Analysis Modules
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Currently implementing statistical modules with focus on accuracy and transparency
        </Typography>
        
        <Grid container spacing={4}>
          {modules.map((module) => (
            <Grid item key={module.id} xs={12} md={6} lg={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: '0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {module.icon}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6" component="h3">
                        {module.title}
                      </Typography>
                      <Chip 
                        label={module.status} 
                        color="success" 
                        size="small"
                        icon={<CheckCircleIcon />}
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {module.description}
                  </Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    Key Features:
                  </Typography>
                  <List dense>
                    {module.features.slice(0, 3).map((feature, idx) => (
                      <ListItem key={idx} disableGutters>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckCircleIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    component={Link}
                    to={module.path}
                    fullWidth
                    variant="contained"
                  >
                    Open Module (No Login Required)
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Call to Action */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container maxWidth="md">
          <Typography variant="h4" align="center" gutterBottom>
            Development Status
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" paragraph>
            This platform is in active development. Confidence Intervals module is functional,
            other modules are being implemented. Your feedback is welcome.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/confidence-intervals"
            >
              Start Testing
            </Button>
            <Button
              variant="outlined"
              size="large"
              href="mailto:support@stickforstats.com"
            >
              Report Feedback
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Technical Info for Manuscript */}
      <Container maxWidth="md" sx={{ my: 8 }}>
        <Paper elevation={1} sx={{ p: 4, bgcolor: 'primary.light', color: 'white' }}>
          <Typography variant="h6" gutterBottom>
            For Manuscript Reviewers
          </Typography>
          <Typography variant="body2">
            StickForStats is an open-source statistical platform in early development.
            Currently, the Confidence Intervals module is functional with validated calculations.
            Additional statistical methods are being implemented with focus on scientific accuracy
            and transparent, verifiable computations.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default ShowcaseHomePage;