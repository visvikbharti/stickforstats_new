import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Paper
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  AccountTree as AccountTreeIcon,
  Insights as InsightsIcon,
  Psychology as PsychologyIcon,
  BubbleChart as BubbleChartIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdvancedStatisticsPage = () => {
  const navigate = useNavigate();

  const advancedModules = [
    {
      id: 'time-series',
      title: 'Time Series Analysis',
      description: 'ARIMA, seasonal decomposition, forecasting, and trend analysis',
      icon: <TimelineIcon fontSize="large" />,
      topics: ['ARIMA Models', 'Seasonal Decomposition', 'Forecasting', 'Trend Analysis'],
      status: 'available',
      path: '/statistics/time-series'
    },
    {
      id: 'multivariate',
      title: 'Multivariate Analysis',
      description: 'MANOVA, canonical correlation, discriminant analysis',
      icon: <BubbleChartIcon fontSize="large" />,
      topics: ['MANOVA', 'Canonical Correlation', 'Discriminant Analysis', 'Factor Analysis'],
      status: 'available',
      path: '/statistics/multivariate'
    },
    {
      id: 'survival',
      title: 'Survival Analysis',
      description: 'Kaplan-Meier curves, Cox regression, hazard models',
      icon: <TrendingUpIcon fontSize="large" />,
      topics: ['Kaplan-Meier', 'Cox Regression', 'Hazard Models', 'Life Tables'],
      status: 'available',
      path: '/statistics/survival'
    },
    {
      id: 'bayesian',
      title: 'Bayesian Statistics',
      description: 'Bayesian inference, MCMC, prior/posterior distributions',
      icon: <AccountTreeIcon fontSize="large" />,
      topics: ['Bayesian Inference', 'MCMC', 'Prior Selection', 'Posterior Analysis'],
      status: 'coming-soon',
      path: '/statistics/bayesian'
    },
    {
      id: 'machine-learning',
      title: 'Statistical Machine Learning',
      description: 'Regularization, model selection, cross-validation',
      icon: <PsychologyIcon fontSize="large" />,
      topics: ['Regularization', 'Model Selection', 'Cross-Validation', 'Feature Selection'],
      status: 'available',
      path: '/statistics/machine-learning'
    },
    {
      id: 'spatial',
      title: 'Spatial Statistics',
      description: 'Geostatistics, spatial autocorrelation, kriging',
      icon: <InsightsIcon fontSize="large" />,
      topics: ['Geostatistics', 'Spatial Autocorrelation', 'Kriging', 'Point Patterns'],
      status: 'coming-soon',
      path: '/statistics/spatial'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Advanced Statistical Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Explore sophisticated statistical methods for complex data analysis, research, and advanced modeling.
          These modules are designed for researchers, data scientists, and advanced practitioners.
        </Typography>
      </Paper>

      <Grid container spacing={4}>
        {advancedModules.map((module) => (
          <Grid item xs={12} md={6} lg={4} key={module.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                opacity: module.status === 'coming-soon' ? 0.7 : 1
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box sx={{ color: 'primary.main', mr: 2 }}>
                    {module.icon}
                  </Box>
                  <Box>
                    <Typography variant="h5" component="h2">
                      {module.title}
                    </Typography>
                    {module.status === 'coming-soon' && (
                      <Chip label="Coming Soon" size="small" color="warning" />
                    )}
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {module.description}
                </Typography>
                
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Key Topics:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {module.topics.map((topic, index) => (
                      <Chip 
                        key={index} 
                        label={topic} 
                        size="small" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions>
                <Button 
                  fullWidth 
                  variant={module.status === 'available' ? 'contained' : 'outlined'}
                  disabled={module.status === 'coming-soon'}
                  onClick={() => navigate(module.path)}
                >
                  {module.status === 'available' ? 'Explore Module' : 'Coming Soon'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Looking for Something Specific?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Our advanced statistics modules are continuously expanding. If you need a specific statistical method 
          that's not listed here, please contact us or check our roadmap for upcoming features.
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/contact')}>
          Request a Feature
        </Button>
      </Paper>
    </Container>
  );
};

export default AdvancedStatisticsPage;