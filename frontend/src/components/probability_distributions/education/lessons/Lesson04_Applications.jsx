import React, { useState, lazy, Suspense } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BiotechIcon from '@mui/icons-material/Biotech';
import FactoryIcon from '@mui/icons-material/Factory';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import EmailIcon from '@mui/icons-material/Email';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';

// Lazy load the D3 simulations
const ClinicalTrialD3 = lazy(() => import('../../simulations/ClinicalTrialD3'));
const QualityControlD3 = lazy(() => import('../../simulations/QualityControlD3'));
const NetworkTrafficD3 = lazy(() => import('../../simulations/NetworkTrafficD3'));
const EmailArrivalsD3 = lazy(() => import('../../simulations/EmailArrivalsD3'));
const ManufacturingDefectsD3 = lazy(() => import('../../simulations/ManufacturingDefectsD3'));

/**
 * Lesson 4: Real-World Applications
 *
 * See probability distributions in action across different industries
 * Uses existing D3 simulation components
 */

const Lesson04_Applications = ({ onComplete }) => {
  const [activeTab, setActiveTab] = useState(0);

  const applications = [
    {
      title: 'Clinical Trials',
      icon: <BiotechIcon />,
      description: 'Binomial distribution for success/failure outcomes',
      component: ClinicalTrialD3,
      distribution: 'Binomial',
      realWorld: 'Drug efficacy trials, patient response rates'
    },
    {
      title: 'Quality Control',
      icon: <FactoryIcon />,
      description: 'Normal distribution for process monitoring',
      component: QualityControlD3,
      distribution: 'Normal',
      realWorld: 'Manufacturing tolerances, defect rates'
    },
    {
      title: 'Network Traffic',
      icon: <NetworkCheckIcon />,
      description: 'Poisson distribution for event arrivals',
      component: NetworkTrafficD3,
      distribution: 'Poisson',
      realWorld: 'Server requests, packet arrivals'
    },
    {
      title: 'Email Arrivals',
      icon: <EmailIcon />,
      description: 'Exponential distribution for time between events',
      component: EmailArrivalsD3,
      distribution: 'Exponential',
      realWorld: 'Customer service, call centers'
    },
    {
      title: 'Manufacturing Defects',
      icon: <PrecisionManufacturingIcon />,
      description: 'Poisson/Binomial for rare events',
      component: ManufacturingDefectsD3,
      distribution: 'Poisson',
      realWorld: 'Defect tracking, failure analysis'
    }
  ];

  const CurrentSimulation = applications[activeTab].component;

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          Real-World Applications
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          Distributions in Action: From Healthcare to Tech
        </Typography>

        <Typography paragraph>
          You've learned the theory behind probability distributions. Now see them solve real problems
          across industries: clinical trials, manufacturing, network engineering, and more. Each application
          shows <strong>why the right distribution matters</strong>.
        </Typography>
      </Paper>

      {/* Application Selector */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {applications.map((app, idx) => (
            <Tab
              key={idx}
              label={app.title}
              icon={app.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* Application Description */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Distribution Used
                </Typography>
                <Typography variant="h6" color="primary">
                  {applications[activeTab].distribution}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ bgcolor: '#f5f5f5', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Real-World Context
                </Typography>
                <Typography variant="body1">
                  {applications[activeTab].realWorld}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Why This Distribution?</strong> {applications[activeTab].description}
          </Typography>
        </Alert>

        {/* Interactive Simulation */}
        <Box sx={{ mt: 3 }}>
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          }>
            <CurrentSimulation />
          </Suspense>
        </Box>
      </Paper>

      {/* Distribution-Application Matching Guide */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📋 Distribution Selection Guide
        </Typography>

        <Typography paragraph>
          Choosing the right distribution is critical for accurate modeling. Here's a quick reference:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Binomial
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Use when:</strong> Fixed number of independent trials, each success/failure
                </Typography>
                <Typography variant="body2">
                  <strong>Examples:</strong> Clinical trials (n patients, x respond), quality control
                  (n items, x defective), A/B testing
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Poisson
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Use when:</strong> Counting rare events in fixed time/space interval
                </Typography>
                <Typography variant="body2">
                  <strong>Examples:</strong> Network packets per second, defects per unit, customer
                  arrivals per hour
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Normal
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Use when:</strong> Continuous data, symmetric, many small independent effects
                </Typography>
                <Typography variant="body2">
                  <strong>Examples:</strong> Heights, weights, measurement errors, test scores,
                  process outputs
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Exponential
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Use when:</strong> Time between independent events (memoryless)
                </Typography>
                <Typography variant="body2">
                  <strong>Examples:</strong> Time between failures, customer service times, radioactive
                  decay
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: '#e8f5e9' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#388e3c' }}>
          ✅ Key Takeaways
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • <strong>Match distribution to data type</strong> — discrete vs continuous, bounded vs unbounded
          </Typography>
          <Typography paragraph>
            • <strong>Consider the generating process</strong> — fixed trials? Random arrivals? Measurements?
          </Typography>
          <Typography paragraph>
            • <strong>Binomial for trials, Poisson for counts</strong> — most common discrete distributions
          </Typography>
          <Typography paragraph>
            • <strong>Normal for measurements, Exponential for waiting times</strong> — most common continuous
          </Typography>
          <Typography paragraph>
            • <strong>Real applications use multiple distributions</strong> — choose based on context
          </Typography>
        </Box>

        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Congratulations!</strong> You've completed the Probability Distributions curriculum.
            You now understand discrete and continuous distributions, the Central Limit Theorem, and
            how to apply distributions to real-world problems!
          </Typography>
        </Alert>

        {onComplete && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={onComplete}
              startIcon={<CheckCircleIcon />}
            >
              Mark Lesson Complete
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Lesson04_Applications;
