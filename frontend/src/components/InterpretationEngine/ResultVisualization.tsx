/**
 * ResultVisualization Component
 * 
 * Visualizes statistical test results with interactive charts.
 * 
 * @timestamp 2025-08-06 22:49:00 UTC
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Alert,
} from '@mui/material';
import {
  BarChart as BarIcon,
  ShowChart as LineIcon,
  ScatterPlot as ScatterIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

import { ResultVisualizationProps } from './InterpretationEngine.types';

const ResultVisualization: React.FC<ResultVisualizationProps> = ({
  result,
  type = 'bar',
  interactive = true,
  downloadable = true,
  onDownload,
}) => {
  const [chartType, setChartType] = useState(type);

  // Placeholder for actual chart implementation
  // In production, you would use a charting library like Chart.js or D3.js
  const renderChart = () => {
    return (
      <Box
        sx={{
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 1,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart Visualization
          <br />
          {result.testName} Results
          <br />
          p = {result.pValue.toFixed(4)}
        </Typography>
      </Box>
    );
  };

  const handleDownload = () => {
    // In production, generate actual chart image
    const imageData = 'data:image/png;base64,placeholder';
    if (onDownload) {
      onDownload(imageData);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Results Visualization
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {interactive && (
            <ButtonGroup size="small">
              <Button
                startIcon={<BarIcon />}
                variant={chartType === 'bar' ? 'contained' : 'outlined'}
                onClick={() => setChartType('bar')}
              >
                Bar
              </Button>
              <Button
                startIcon={<LineIcon />}
                variant={chartType === 'line' ? 'contained' : 'outlined'}
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
              <Button
                startIcon={<ScatterIcon />}
                variant={chartType === 'scatter' ? 'contained' : 'outlined'}
                onClick={() => setChartType('scatter')}
              >
                Scatter
              </Button>
            </ButtonGroup>
          )}
          
          {downloadable && (
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              variant="outlined"
              size="small"
            >
              Download
            </Button>
          )}
        </Box>
      </Box>

      {renderChart()}

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="caption">
          This visualization shows the main results of your {result.testName} analysis. 
          {result.effectSize && ` Effect size: ${result.effectSize.measure} = ${result.effectSize.value.toFixed(3)}.`}
        </Typography>
      </Alert>
    </Paper>
  );
};

export default ResultVisualization;