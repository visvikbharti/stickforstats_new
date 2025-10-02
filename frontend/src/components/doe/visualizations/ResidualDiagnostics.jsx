import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import TimelineIcon from '@mui/icons-material/Timeline';
import FunctionsIcon from '@mui/icons-material/Functions';

/**
 * ResidualDiagnostics component for visualizing model diagnostics in DOE analysis
 * 
 * @param {Object} props
 * @param {Object} props.data - Residual data for diagnostics
 * @param {Object} props.options - Visualization options
 */
function ResidualDiagnostics({ data, options = {} }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [plotType, setPlotType] = useState(0);
  
  // Default configuration with overrides from props
  const config = {
    pointColor: theme.palette.primary.main,
    pointSize: 100,
    histogramColor: theme.palette.secondary.main,
    ...options
  };
  
  const handlePlotTypeChange = (event, newValue) => {
    setPlotType(newValue);
  };
  
  // If no data is provided, show placeholder
  if (!data) {
    return (
      <Paper 
        elevation={0} 
        variant="outlined" 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          minHeight: 300
        }}
      >
        <Typography color="text.secondary">
          No residual data available. Select an experiment to analyze.
        </Typography>
      </Paper>
    );
  }
  
  // If loading, show loading indicator
  if (data.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If error, show error
  if (data.error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{data.error}</Alert>
      </Box>
    );
  }
  
  // Render residuals vs. fitted plot
  const renderResidualsFitted = () => {
    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{
              top: 20,
              right: 20,
              bottom: 40,
              left: 20,
            }}
          >
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey="fitted" 
              name="Fitted Value" 
              label={{ 
                value: 'Fitted Value', 
                position: 'bottom',
                offset: 0
              }}
            />
            <YAxis 
              type="number" 
              dataKey="residual" 
              name="Residual"
              label={{ 
                value: 'Residual', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }} 
            />
            <ZAxis type="number" range={[20, 200]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <ReferenceLine y={0} stroke="#000" />
            <Scatter 
              name="Residuals" 
              data={data.residualsFitted} 
              fill={config.pointColor} 
              line={{ stroke: '#eee', strokeWidth: 1 }}
              lineType="fitting"
            />
          </ScatterChart>
        </ResponsiveContainer>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          * Points should be randomly scattered around the zero line with no patterns.
        </Typography>
      </Box>
    );
  };
  
  // Render normal probability plot
  const renderNormalProbabilityPlot = () => {
    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{
              top: 20,
              right: 20,
              bottom: 40,
              left: 20,
            }}
          >
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey="theoretical" 
              name="Theoretical Quantiles" 
              label={{ 
                value: 'Theoretical Quantiles', 
                position: 'bottom',
                offset: 0
              }}
            />
            <YAxis 
              type="number" 
              dataKey="residual" 
              name="Residual"
              label={{ 
                value: 'Sample Quantiles', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <ZAxis type="number" range={[20, 200]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <ReferenceLine y={0} stroke="#000" />
            <Scatter 
              name="Normal Probability" 
              data={data.normalProbability} 
              fill={config.pointColor}
              line={{ stroke: '#555', strokeWidth: 1 }}
              lineType="fitting"
            />
          </ScatterChart>
        </ResponsiveContainer>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          * Points should follow the diagonal line if residuals are normally distributed.
        </Typography>
      </Box>
    );
  };
  
  // Render scale-location plot
  const renderScaleLocationPlot = () => {
    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{
              top: 20,
              right: 20,
              bottom: 40,
              left: 20,
            }}
          >
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey="fitted" 
              name="Fitted Value" 
              label={{ 
                value: 'Fitted Value', 
                position: 'bottom',
                offset: 0
              }}
            />
            <YAxis 
              type="number" 
              dataKey="sqrtAbsResidual" 
              name="√|Residual|"
              label={{ 
                value: '√|Residual|', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <ZAxis type="number" range={[20, 200]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter 
              name="Scale-Location" 
              data={data.scaleLocation} 
              fill={config.pointColor}
              line={{ stroke: '#eee', strokeWidth: 1 }}
              lineType="fitting"
            />
          </ScatterChart>
        </ResponsiveContainer>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          * Points should be randomly scattered with no clear pattern to confirm homoscedasticity.
        </Typography>
      </Box>
    );
  };
  
  // Render residuals vs. leverage plot
  const renderResidualsLeveragePlot = () => {
    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{
              top: 20,
              right: 20,
              bottom: 40,
              left: 20,
            }}
          >
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey="leverage" 
              name="Leverage" 
              label={{ 
                value: 'Leverage', 
                position: 'bottom',
                offset: 0
              }}
            />
            <YAxis 
              type="number" 
              dataKey="stdResidual" 
              name="Standardized Residuals"
              label={{ 
                value: 'Standardized Residuals', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <ZAxis type="number" range={[20, 200]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <ReferenceLine y={0} stroke="#000" />
            <ReferenceLine y={2} stroke="red" strokeDasharray="3 3" />
            <ReferenceLine y={-2} stroke="red" strokeDasharray="3 3" />
            <Scatter 
              name="Residuals vs. Leverage" 
              data={data.residualsLeverage} 
              fill={config.pointColor}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          * Points outside the red lines with high leverage may be influential outliers.
        </Typography>
      </Box>
    );
  };
  
  // Get current plot based on selection
  const getCurrentPlot = () => {
    switch (plotType) {
      case 0:
        return renderResidualsFitted();
      case 1:
        return renderNormalProbabilityPlot();
      case 2:
        return renderScaleLocationPlot();
      case 3:
        return renderResidualsLeveragePlot();
      default:
        return renderResidualsFitted();
    }
  };
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Typography variant="subtitle1" gutterBottom>
        Residual Diagnostics
      </Typography>
      
      <Tabs
        value={plotType}
        onChange={handlePlotTypeChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="residual diagnostic plot types"
        sx={{ mb: 2 }}
      >
        <Tab 
          icon={<ScatterPlotIcon />} 
          label={isMobile ? "" : "Residuals vs. Fitted"} 
          aria-label="Residuals vs. Fitted" 
        />
        <Tab 
          icon={<BarChartIcon />} 
          label={isMobile ? "" : "Normal Q-Q"} 
          aria-label="Normal Q-Q Plot" 
        />
        <Tab 
          icon={<TimelineIcon />} 
          label={isMobile ? "" : "Scale-Location"} 
          aria-label="Scale-Location Plot" 
        />
        <Tab 
          icon={<FunctionsIcon />} 
          label={isMobile ? "" : "Residuals vs. Leverage"} 
          aria-label="Residuals vs. Leverage" 
        />
      </Tabs>
      
      {getCurrentPlot()}
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
        * These plots help diagnose model quality, checking assumptions like normality,
        homoscedasticity, and identifying outliers or influential points.
      </Typography>
    </Box>
  );
}

export default ResidualDiagnostics;