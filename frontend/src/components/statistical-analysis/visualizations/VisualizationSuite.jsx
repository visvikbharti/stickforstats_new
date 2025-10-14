/**
 * Visualization Suite Module
 *
 * Comprehensive data visualization tools with 5 analysis types:
 * 1. Distribution Analysis - Histogram, Box Plot, Violin Plot, KDE Plot, Q-Q Plot
 * 2. Relationship Analysis - Scatter Plot, Line Plot, Hex Plot, Regression Plot
 * 3. Comparative Analysis - Bar Plot, Box Plot, Violin Plot, Strip Plot
 * 4. Time Series Analysis - Line Plot, Area Plot, Rolling Statistics, Decomposition
 * 5. Composition Analysis - Pie Chart, Treemap, Sunburst, Funnel
 *
 * Ported from: app/utils/visualization.py (lines 251-1030)
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartIcon from '@mui/icons-material/PieChart';
import CompareIcon from '@mui/icons-material/Compare';

// Import visualization components
import DistributionAnalysis from './DistributionAnalysis';
import RelationshipAnalysis from './RelationshipAnalysis';
import ComparativeAnalysis from './ComparativeAnalysis';
import TimeSeriesAnalysis from './TimeSeriesAnalysis';
import CompositionAnalysis from './CompositionAnalysis';

/**
 * Main Visualization Suite Component
 */
const VisualizationSuite = ({ data, setData, onComplete }) => {
  const [analysisType, setAnalysisType] = useState('');

  /**
   * Analysis type definitions
   */
  const analysisTypes = [
    {
      id: 'distribution',
      name: 'Distribution Analysis',
      description: 'Analyze variable distributions with histograms, box plots, violin plots, KDE, and Q-Q plots',
      icon: BarChartIcon,
      component: DistributionAnalysis,
      available: true,
      plotTypes: ['Histogram', 'Box Plot', 'Violin Plot', 'KDE Plot', 'Q-Q Plot']
    },
    {
      id: 'relationship',
      name: 'Relationship Analysis',
      description: 'Explore relationships between variables with scatter, line, hex, and regression plots',
      icon: ScatterPlotIcon,
      component: RelationshipAnalysis,
      available: true,
      plotTypes: ['Scatter Plot', 'Line Plot', 'Hex Plot', 'Regression Plot']
    },
    {
      id: 'comparative',
      name: 'Comparative Analysis',
      description: 'Compare groups or categories with bar, box, violin, and strip plots',
      icon: CompareIcon,
      component: ComparativeAnalysis,
      available: true,
      plotTypes: ['Bar Plot', 'Box Plot', 'Violin Plot', 'Strip Plot']
    },
    {
      id: 'timeseries',
      name: 'Time Series Analysis',
      description: 'Analyze temporal patterns with line, area, rolling statistics, and decomposition',
      icon: TimelineIcon,
      component: TimeSeriesAnalysis,
      available: true,
      plotTypes: ['Line Plot', 'Area Plot', 'Rolling Statistics', 'Seasonal Decomposition']
    },
    {
      id: 'composition',
      name: 'Composition Analysis',
      description: 'Analyze part-to-whole relationships with pie, treemap, sunburst, and funnel charts',
      icon: PieChartIcon,
      component: CompositionAnalysis,
      available: true,
      plotTypes: ['Pie Chart', 'Donut Chart', 'Treemap', 'Funnel Chart']
    }
  ];

  /**
   * Get selected analysis type
   */
  const selectedAnalysis = analysisTypes.find(type => type.id === analysisType);

  /**
   * Handle analysis type change
   */
  const handleAnalysisTypeChange = (event) => {
    setAnalysisType(event.target.value);
  };

  /**
   * Render data requirement message
   */
  if (!data || data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 4 }}>
        <Alert severity="info">
          <Typography variant="body1">
            Please upload a dataset in the <strong>Data Profiling</strong> module first.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon /> Visualization Suite
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          Create interactive visualizations to explore your data. Choose an analysis type below
          to get started.
        </Typography>

        {/* Analysis Type Selector */}
        <FormControl fullWidth sx={{ mt: 3 }}>
          <InputLabel>Select Analysis Type</InputLabel>
          <Select
            value={analysisType}
            label="Select Analysis Type"
            onChange={handleAnalysisTypeChange}
          >
            <MenuItem value="">
              <em>Choose an analysis type...</em>
            </MenuItem>
            {analysisTypes.map((type) => (
              <MenuItem
                key={type.id}
                value={type.id}
                disabled={!type.available}
              >
                {type.name} {!type.available && '(Coming Soon)'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Analysis Type Cards (when no selection) */}
        {!analysisType && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {analysisTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={type.id}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: type.available ? 'pointer' : 'not-allowed',
                      opacity: type.available ? 1 : 0.5,
                      '&:hover': type.available ? {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s'
                      } : {}
                    }}
                    onClick={() => type.available && setAnalysisType(type.id)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <IconComponent sx={{ fontSize: 32, color: '#1976d2', mr: 1 }} />
                        <Typography variant="h6" component="div">
                          {type.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {type.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Includes:</strong> {type.plotTypes.slice(0, 3).join(', ')}
                        {type.plotTypes.length > 3 && '...'}
                      </Typography>
                      {!type.available && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
                          Coming soon!
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Render Selected Analysis Component */}
      {selectedAnalysis && selectedAnalysis.component && (
        <Box>
          {/* Analysis Type Info */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>{selectedAnalysis.name}:</strong> {selectedAnalysis.description}
            </Typography>
          </Alert>

          {/* Analysis Component */}
          {React.createElement(selectedAnalysis.component, {
            data,
            setData,
            onComplete
          })}
        </Box>
      )}

      {/* Coming Soon Message */}
      {selectedAnalysis && !selectedAnalysis.component && (
        <Alert severity="warning">
          <Typography variant="body1">
            <strong>{selectedAnalysis.name}</strong> is under development and will be available soon!
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Available plot types: {selectedAnalysis.plotTypes.join(', ')}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default VisualizationSuite;
