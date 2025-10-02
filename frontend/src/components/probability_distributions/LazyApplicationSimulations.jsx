import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  CircularProgress, 
  Alert,
  Card,
  CardContent,
  CardActionArea,
  CardActions,
  Chip
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import FactoryIcon from '@mui/icons-material/Factory';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import RouterIcon from '@mui/icons-material/Router';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useSnackbar } from 'notistack';

// Import lazy simulation components
import { getLazySimulationComponent } from './simulations/LazySimulations';

// Application types configuration
const APPLICATION_TYPES = [
  {
    name: "Email Arrivals (Poisson)",
    icon: <EmailIcon />,
    description: "Simulate email arrivals at a server using a Poisson process",
    distribution: "POISSON",
    image: "/static/images/applications/email_arrivals.png",
    color: "#3f51b5"
  },
  {
    name: "Quality Control (Normal)",
    icon: <FactoryIcon />,
    description: "Manufacturing process quality control using the Normal distribution",
    distribution: "NORMAL",
    image: "/static/images/applications/quality_control.png",
    color: "#4caf50"
  },
  {
    name: "Clinical Trials (Binomial/Normal)",
    icon: <MedicalServicesIcon />,
    description: "Analyze clinical trial results using the Binomial distribution and Normal approximation",
    distribution: "BINOMIAL",
    image: "/static/images/applications/clinical_trials.png",
    color: "#f44336"
  },
  {
    name: "Network Traffic (Poisson)",
    icon: <RouterIcon />,
    description: "Model network packet arrivals and queuing using the Poisson distribution",
    distribution: "POISSON",
    image: "/static/images/applications/network_traffic.png",
    color: "#ff9800"
  },
  {
    name: "Manufacturing Defects (Binomial/Poisson)",
    icon: <AssessmentIcon />,
    description: "Analyze manufacturing defects using the Binomial distribution and Poisson approximation",
    distribution: "BINOMIAL",
    image: "/static/images/applications/manufacturing_defects.png",
    color: "#9c27b0"
  }
];

// Loading component for simulation loading
const SimulationLoadingFallback = () => (
  <Paper sx={{ p: 4, textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
    <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
    <Typography variant="h6" gutterBottom>
      Loading Simulation...
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '80%' }}>
      This interactive simulation demonstrates probability distributions in real-world applications.
    </Typography>
  </Paper>
);

/**
 * LazyApplicationSimulations component
 * 
 * A lazy-loaded version of the ApplicationSimulations component that loads
 * simulation components on-demand to reduce initial load time.
 */
const LazyApplicationSimulations = ({ projectId }) => {
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // Reset simulation results when selected application changes
  useEffect(() => {
    setSimulationResult(null);
  }, [selectedApplication]);

  // Handle application selection
  const handleApplicationSelect = (index) => {
    setSelectedApplication(index);
    setSimulationResult(null);
    setError(null);
  };

  // Render specific application component based on selection
  const renderApplicationComponent = () => {
    if (selectedApplication === null) return null;

    // Get component name from application type
    const applicationNames = [
      'EmailArrivals',
      'QualityControl',
      'ClinicalTrial',
      'NetworkTraffic',
      'ManufacturingDefects'
    ];

    const componentName = applicationNames[selectedApplication];
    const SimulationComponent = getLazySimulationComponent(componentName);

    if (!SimulationComponent) {
      return (
        <Alert severity="error">
          Simulation component not found: {componentName}
        </Alert>
      );
    }

    return (
      <Suspense fallback={<SimulationLoadingFallback />}>
        <SimulationComponent
          projectId={projectId}
          setLoading={setLoading}
          setError={setError}
          setSimulationResult={setSimulationResult}
          result={simulationResult}
        />
      </Suspense>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Real-world Applications
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Explore real-world applications of probability distributions through interactive simulations.
        These examples demonstrate how statistical concepts apply to practical problems in various fields.
      </Typography>

      {selectedApplication === null ? (
        <Grid container spacing={3}>
          {APPLICATION_TYPES.map((app, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  boxShadow: 3,
                  '&:hover': {
                    boxShadow: 6
                  },
                  transition: 'box-shadow 0.3s ease-in-out'
                }}
              >
                <CardActionArea onClick={() => handleApplicationSelect(index)}>
                  <Box sx={{ 
                    height: 140, 
                    bgcolor: app.color, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'background-color 0.3s ease',
                    '&:hover': {
                      bgcolor: `${app.color}CC`, // Add transparency on hover
                    }
                  }}>
                    <Box sx={{ fontSize: 80, color: 'white' }}>
                      {app.icon}
                    </Box>
                  </Box>
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      {app.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {app.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary" 
                    onClick={() => handleApplicationSelect(index)}
                  >
                    Explore
                  </Button>
                  <Chip 
                    label={app.distribution} 
                    size="small" 
                    color={app.distribution === "POISSON" ? "info" : 
                           app.distribution === "NORMAL" ? "success" : "warning"}
                    sx={{ ml: 'auto' }}
                  />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={() => setSelectedApplication(null)}
              sx={{ mr: 2 }}
            >
              ← Back to Applications
            </Button>
            <Typography variant="h6" color="primary">
              {APPLICATION_TYPES[selectedApplication].name}
            </Typography>
            {loading && (
              <CircularProgress size={24} sx={{ ml: 2 }} />
            )}
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {renderApplicationComponent()}
        </Box>
      )}
    </Box>
  );
};

export default LazyApplicationSimulations;