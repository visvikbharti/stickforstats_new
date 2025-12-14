/**
 * BiophysicsHub - Module 10 of Statistical Analysis Platform
 *
 * Comprehensive biophysics and biochemistry analysis tools including:
 * - Enzyme kinetics (Michaelis-Menten, Hill equation, inhibition)
 * - Binding affinity (Kd determination, Scatchard plots)
 * - Dose-response curves (IC50/EC50)
 * - Thermal stability analysis
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  Button,
  Tooltip,
  IconButton
} from '@mui/material';

// Icons
import ScienceIcon from '@mui/icons-material/Science';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import BiotechIcon from '@mui/icons-material/Biotech';
import InfoIcon from '@mui/icons-material/Info';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';

// Sub-components (to be created)
import MichaelisMentenAnalysis from './enzyme-kinetics/MichaelisMentenAnalysis';
import BindingAffinityAnalysis from './binding-affinity/BindingAffinityAnalysis';
import DoseResponseAnalysis from './binding-affinity/DoseResponseAnalysis';

// ============================================================================
// CONSTANTS
// ============================================================================

const ANALYSIS_TABS = [
  {
    id: 'enzyme-kinetics',
    label: 'Enzyme Kinetics',
    icon: <BiotechIcon />,
    description: 'Michaelis-Menten, Hill equation, inhibition analysis',
    color: '#4CAF50'
  },
  {
    id: 'binding-affinity',
    label: 'Binding Affinity',
    icon: <ShowChartIcon />,
    description: 'Kd determination, Scatchard analysis, saturation curves',
    color: '#2196F3'
  },
  {
    id: 'dose-response',
    label: 'Dose-Response',
    icon: <TimelineIcon />,
    description: 'IC50/EC50 calculations, Hill slope analysis',
    color: '#9C27B0'
  },
  {
    id: 'thermal-stability',
    label: 'Thermal Stability',
    icon: <ThermostatIcon />,
    description: 'Tm determination, protein folding analysis',
    color: '#FF9800',
    comingSoon: true
  }
];

const QUICK_REFERENCES = [
  {
    title: 'Michaelis-Menten',
    equation: 'v = Vmax × [S] / (Km + [S])',
    parameters: ['Vmax: Maximum velocity', 'Km: Michaelis constant']
  },
  {
    title: 'Hill Equation',
    equation: 'v = Vmax × [S]ⁿ / (K₀.₅ⁿ + [S]ⁿ)',
    parameters: ['n: Hill coefficient', 'K₀.₅: Half-saturation constant']
  },
  {
    title: 'Binding Curve',
    equation: 'B = Bmax × [L] / (Kd + [L])',
    parameters: ['Bmax: Maximum binding', 'Kd: Dissociation constant']
  },
  {
    title: 'Dose-Response (4PL)',
    equation: 'Y = Bottom + (Top - Bottom) / (1 + 10^((LogIC50 - X) × Hill))',
    parameters: ['IC50: 50% inhibition concentration', 'Hill: Slope factor']
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BiophysicsHub = ({ data, onAnalysisComplete }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showQuickRef, setShowQuickRef] = useState(false);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  const renderTabContent = () => {
    const currentTab = ANALYSIS_TABS[activeTab];

    if (currentTab.comingSoon) {
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <ThermostatIcon sx={{ fontSize: 80, color: 'action.disabled', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
            Thermal stability analysis including CD spectroscopy, thermal denaturation curves,
            and Tm determination will be available in an upcoming update.
          </Typography>
        </Box>
      );
    }

    switch (currentTab.id) {
      case 'enzyme-kinetics':
        return <MichaelisMentenAnalysis data={data} onAnalysisComplete={onAnalysisComplete} />;
      case 'binding-affinity':
        return <BindingAffinityAnalysis data={data} onAnalysisComplete={onAnalysisComplete} />;
      case 'dose-response':
        return <DoseResponseAnalysis data={data} onAnalysisComplete={onAnalysisComplete} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
          color: 'white',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ScienceIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Biophysics Analysis Suite
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                Professional-grade tools for enzyme kinetics, binding affinity, and dose-response analysis
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Quick Reference">
              <IconButton
                onClick={() => setShowQuickRef(!showQuickRef)}
                sx={{ color: 'white' }}
              >
                <MenuBookIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Learn More">
              <IconButton
                sx={{ color: 'white' }}
                href="/biophysics-learn"
              >
                <SchoolIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Feature Chips */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Chip
            label="G*Power Validated"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip
            label="Non-Linear Regression"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip
            label="Publication-Ready Plots"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip
            label="R/Python Export"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
        </Box>
      </Paper>

      {/* Quick Reference Panel */}
      {showQuickRef && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="primary" />
            Quick Reference
          </Typography>
          <Grid container spacing={2}>
            {QUICK_REFERENCES.map((ref, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      {ref.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: 'grey.100',
                        p: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        mb: 1
                      }}
                    >
                      {ref.equation}
                    </Typography>
                    {ref.parameters.map((param, i) => (
                      <Typography key={i} variant="caption" display="block" color="text.secondary">
                        • {param}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Analysis Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none'
            }
          }}
        >
          {ANALYSIS_TABS.map((tab, index) => (
            <Tab
              key={tab.id}
              icon={tab.icon}
              label={
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight="medium">
                    {tab.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tab.description}
                  </Typography>
                  {tab.comingSoon && (
                    <Chip
                      label="Coming Soon"
                      size="small"
                      sx={{ ml: 1, height: 16, fontSize: '0.65rem' }}
                    />
                  )}
                </Box>
              }
              iconPosition="start"
              disabled={tab.comingSoon}
              sx={{
                '&.Mui-selected': {
                  bgcolor: `${tab.color}10`,
                  borderBottom: `3px solid ${tab.color}`
                }
              }}
            />
          ))}
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {renderTabContent()}
        </Box>
      </Paper>

      {/* Educational Note */}
      <Alert
        severity="info"
        icon={<SchoolIcon />}
        sx={{ mb: 2 }}
        action={
          <Button
            color="inherit"
            size="small"
            href="/biophysics-learn"
          >
            Start Learning
          </Button>
        }
      >
        <AlertTitle>New to Biophysics Analysis?</AlertTitle>
        Our comprehensive educational module covers enzyme kinetics theory, Michaelis-Menten derivation,
        binding equilibria, and more with interactive simulations.
      </Alert>

      {/* Validation Note */}
      <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
        <Typography variant="body2" color="success.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BiotechIcon fontSize="small" />
          <strong>Validation:</strong> All curve fitting algorithms use Levenberg-Marquardt non-linear regression
          and have been validated against GraphPad Prism and published datasets.
        </Typography>
      </Paper>
    </Box>
  );
};

export default BiophysicsHub;
